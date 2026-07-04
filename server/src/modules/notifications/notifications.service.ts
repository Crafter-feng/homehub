import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { DATABASE_TOKEN } from '../../db/database.module';
import { eq, and, sql, desc } from 'drizzle-orm';
import { sysNotificationRules, sysNotifications, invItems } from '../../db/schema';
import { CreateNotificationRuleDto, UpdateNotificationRuleDto } from './dto/notification.dto';
import * as http from 'http';
import * as https from 'https';

@Injectable()
export class NotificationsService {
  constructor(
    @Inject(DATABASE_TOKEN) private readonly db: any,
  ) {}

  // === 通知规则管理 ===
  async listRules(familyId: number) {
    return this.db.select().from(sysNotificationRules)
      .where(eq(sysNotificationRules.familyId, familyId))
      .all();
  }

  async createRule(familyId: number, dto: CreateNotificationRuleDto) {
    return this.db.insert(sysNotificationRules).values({
      familyId,
      name: dto.name,
      triggerType: dto.triggerType,
      config: dto.config,
      channel: dto.channel,
      channelConfig: dto.channelConfig,
      enabled: dto.enabled ?? true,
    }).returning().get();
  }

  async updateRule(ruleId: number, familyId: number, dto: UpdateNotificationRuleDto) {
    const rule = await this.db.select().from(sysNotificationRules)
      .where(and(eq(sysNotificationRules.id, ruleId), eq(sysNotificationRules.familyId, familyId)))
      .get();
    if (!rule) throw new NotFoundException('通知规则不存在');

    const updates: Record<string, any> = {};
    if (dto.name) updates.name = dto.name;
    if (dto.config) updates.config = dto.config;
    if (dto.enabled !== undefined) updates.enabled = dto.enabled;

    await this.db.update(sysNotificationRules).set(updates)
      .where(eq(sysNotificationRules.id, ruleId))
      .run();

    return this.db.select().from(sysNotificationRules)
      .where(eq(sysNotificationRules.id, ruleId))
      .get();
  }

  async deleteRule(ruleId: number, familyId: number) {
    await this.db.delete(sysNotificationRules)
      .where(and(eq(sysNotificationRules.id, ruleId), eq(sysNotificationRules.familyId, familyId)))
      .run();
    return { success: true };
  }

  async toggleRule(ruleId: number, familyId: number) {
    const rule = await this.db.select().from(sysNotificationRules)
      .where(and(eq(sysNotificationRules.id, ruleId), eq(sysNotificationRules.familyId, familyId)))
      .get();
    if (!rule) throw new NotFoundException('通知规则不存在');

    await this.db.update(sysNotificationRules)
      .set({ enabled: !rule.enabled })
      .where(eq(sysNotificationRules.id, ruleId))
      .run();

    return { ...rule, enabled: !rule.enabled };
  }

  // === 通知管理 ===
  async listNotifications(userId: number, familyId: number, unreadOnly: boolean = false) {
    let condition = and(
      eq(sysNotifications.familyId, familyId),
      eq(sysNotifications.userId, userId),
    );
    if (unreadOnly) {
      condition = and(condition, eq(sysNotifications.isRead, false))!;
    }

    return this.db.select().from(sysNotifications)
      .where(condition)
      .orderBy(desc(sysNotifications.createdAt))
      .all();
  }

  async getUnreadCount(userId: number, familyId: number) {
    const result = await this.db.select({ count: sql<number>`count(*)` })
      .from(sysNotifications)
      .where(and(
        eq(sysNotifications.familyId, familyId),
        eq(sysNotifications.userId, userId),
        eq(sysNotifications.isRead, false),
      ))
      .get();

    return { count: result?.count || 0 };
  }

  async markAsRead(notificationId: number, userId: number) {
    await this.db.update(sysNotifications)
      .set({ isRead: true })
      .where(and(
        eq(sysNotifications.id, notificationId),
        eq(sysNotifications.userId, userId),
      ))
      .run();
    return { success: true };
  }

  async markAllAsRead(userId: number, familyId: number) {
    await this.db.update(sysNotifications)
      .set({ isRead: true })
      .where(and(
        eq(sysNotifications.familyId, familyId),
        eq(sysNotifications.userId, userId),
        eq(sysNotifications.isRead, false),
      ))
      .run();
    return { success: true };
  }

  async createNotification(data: {
    familyId: number;
    userId?: number;
    title: string;
    message: string;
    type: string;
    relatedType?: string;
    relatedId?: number;
  }) {
    return this.db.insert(sysNotifications).values({
      familyId: data.familyId,
      userId: data.userId,
      title: data.title,
      message: data.message,
      type: data.type as any,
      relatedType: data.relatedType,
      relatedId: data.relatedId,
    }).returning().get();
  }

  // === 检查过期物品并生成通知 ===
  async checkExpiringItems(familyId: number) {
    const rules = await this.db.select().from(sysNotificationRules)
      .where(and(
        eq(sysNotificationRules.familyId, familyId),
        eq(sysNotificationRules.triggerType, 'expiry'),
        eq(sysNotificationRules.enabled, true),
      ))
      .all();

    // Query expiring invItems
    const expiringItems = await this.db.select().from(invItems)
      .where(and(
        eq(invItems.familyId, familyId),
        sql`${invItems.expiryDate} > ${Date.now()}`,
        sql`${invItems.expiryDate} <= ${Date.now() + 7 * 86400000}`,
      ))
      .all();

    const expiredItems = await this.db.select().from(invItems)
      .where(and(
        eq(invItems.familyId, familyId),
        sql`${invItems.expiryDate} <= ${Date.now()}`,
      ))
      .all();

    for (const rule of rules) {
      const config = rule.config as any;
      const days = config?.daysBeforeExpiry || 7;

      if (expiringItems.length > 0) {
        const title = `📅 ${expiringItems.length} 件物品即将过期`;
        const message = expiringItems.slice(0, 10).map((i: any) =>
          `• ${i.name}（${i.quantity}${i.unit}）过期: ${i.expiryDate ? new Date(i.expiryDate).toLocaleDateString('zh-CN') : '未知'}`
        ).join('\n');

        // Create in-app notification
        await this.createNotification({
          familyId,
          title,
          message,
          type: 'expiry',
          relatedType: 'expiry_check',
        });

        // Send webhook if configured
        if (rule.channel === 'webhook' && config?.webhookUrl) {
          await this.sendWebhook(config.webhookUrl, {
            title,
            message,
            type: 'expiry',
            timestamp: new Date().toISOString(),
            stats: { expiring: expiringItems.length, expired: expiredItems.length },
          });
        }
      }
    }

    return {
      checked: rules.length,
      expiring: expiringItems.length,
      expired: expiredItems.length,
    };
  }

  /**
   * Send a webhook POST request to an external URL.
   * Supports Server酱 (sctapi.ftqq.com) and standard webhook endpoints.
   */
  async sendWebhook(webhookUrl: string, payload: Record<string, any>): Promise<boolean> {
    try {
      const url = new URL(webhookUrl);
      const isHttps = url.protocol === 'https:';
      const postData = JSON.stringify(payload);
      const lib = isHttps ? https : http;

      return new Promise((resolve) => {
        const options = {
          hostname: url.hostname,
          port: url.port || (isHttps ? 443 : 80),
          path: url.pathname + url.search,
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(postData),
            'User-Agent': 'HomeHub/1.0',
          },
          timeout: 10000,
        };

        const req = lib.request(options, (res) => {
          let body = '';
          res.on('data', (chunk) => { body += chunk; });
          res.on('end', () => {
            if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
              resolve(true);
            } else {
              console.warn(`Webhook ${webhookUrl} returned ${res.statusCode}: ${body.substring(0, 200)}`);
              resolve(false);
            }
          });
        });

        req.on('error', (err) => {
          console.warn(`Webhook ${webhookUrl} error: ${err.message}`);
          resolve(false);
        });

        req.on('timeout', () => {
          req.destroy();
          console.warn(`Webhook ${webhookUrl} timeout`);
          resolve(false);
        });

        req.write(postData);
        req.end();
      });
    } catch (err: any) {
      console.warn(`Webhook ${webhookUrl} parse error: ${err.message}`);
      return false;
    }
  }
}
