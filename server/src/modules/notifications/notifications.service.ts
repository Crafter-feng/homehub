import { Injectable, Inject, NotFoundException, Logger } from '@nestjs/common';
import { DATABASE_TOKEN } from '../../db/database.module';
import { eq, and, sql, desc } from 'drizzle-orm';
import { sysNotificationRules, sysNotifications, invItems } from '../../db/schema';
import { CreateNotificationRuleDto, UpdateNotificationRuleDto } from './dto/notification.dto';
import * as http from 'http';
import * as https from 'https';
import * as net from 'net';
import * as dns from 'dns';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
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

    const nowSeconds = Math.floor(Date.now() / 1000);

    // Query expiring invItems
    const expiringItems = await this.db.select().from(invItems)
      .where(and(
        eq(invItems.familyId, familyId),
        sql`${invItems.expiryDate} > ${nowSeconds}`,
        sql`${invItems.expiryDate} <= ${nowSeconds + 7 * 86400}`,
      ))
      .all();

    const expiredItems = await this.db.select().from(invItems)
      .where(and(
        eq(invItems.familyId, familyId),
        sql`${invItems.expiryDate} <= ${nowSeconds}`,
      ))
      .all();

    // Get family members to notify
    const { familyMembers } = await import('../../db/schema');
    const members = await this.db.select({ userId: familyMembers.userId })
      .from(familyMembers)
      .where(eq(familyMembers.familyId, familyId))
      .all();

    for (const rule of rules) {
      const config = rule.config as any;
      const days = config?.daysBeforeExpiry || 7;

      if (expiringItems.length > 0) {
        const title = `📅 ${expiringItems.length} 件物品即将过期`;
        const message = expiringItems.slice(0, 10).map((i: any) =>
          `• ${i.name}（${i.quantity}${i.unit}）过期: ${i.expiryDate ? new Date(i.expiryDate).toLocaleDateString('zh-CN') : '未知'}`
        ).join('\n');

        // Create in-app notification for each family member
        for (const member of members) {
          await this.createNotification({
            familyId,
            userId: member.userId,
            title,
            message,
            type: 'expiry',
            relatedType: 'expiry_check',
          });
        }

        // Send webhook if configured (once, not per member)
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

      // SSRF protection: only http/https protocols
      if (url.protocol !== 'http:' && url.protocol !== 'https:') {
        this.logger.warn(`Webhook URL 协议不允许: ${url.protocol}`);
        return false;
      }

      // SSRF protection: block private/reserved IPs
      const hostname = url.hostname.toLowerCase();
      const isPrivate =
        hostname === 'localhost' ||
        hostname === '127.0.0.1' ||
        hostname === '::1' ||
        hostname.endsWith('.local') ||
        hostname.endsWith('.internal') ||
        /^10\./.test(hostname) ||
        /^172\.(1[6-9]|2\d|3[01])\./.test(hostname) ||
        /^192\.168\./.test(hostname) ||
        /^169\.254\./.test(hostname) ||
        /^0\./.test(hostname) ||
        /^127\./.test(hostname);

      if (isPrivate) {
        this.logger.warn(`Webhook URL 指向内网地址: ${hostname}`);
        return false;
      }

      // DNS-based SSRF protection: resolve and check
      try {
        const addresses = await this.resolveHostname(hostname);
        for (const addr of addresses) {
          if (net.isIPv4(addr)) {
            if (
              addr === '127.0.0.1' ||
              /^10\./.test(addr) ||
              /^172\.(1[6-9]|2\d|3[01])\./.test(addr) ||
              /^192\.168\./.test(addr) ||
              /^169\.254\./.test(addr) ||
              /^0\./.test(addr) ||
              /^127\./.test(addr)
            ) {
              this.logger.warn(`Webhook URL 解析到内网地址: ${addr}`);
              return false;
            }
          }
        }
      } catch {
        // DNS resolution failed — reject to be safe
        this.logger.warn(`Webhook URL DNS 解析失败: ${hostname}`);
        return false;
      }

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
              this.logger.warn(`Webhook ${webhookUrl} returned ${res.statusCode}: ${body.substring(0, 200)}`);
              resolve(false);
            }
          });
        });

        req.on('error', (err) => {
          this.logger.warn(`Webhook ${webhookUrl} error: ${err.message}`);
          resolve(false);
        });

        req.on('timeout', () => {
          req.destroy();
          this.logger.warn(`Webhook ${webhookUrl} timeout`);
          resolve(false);
        });

        req.write(postData);
        req.end();
      });
    } catch (err: any) {
      this.logger.warn(`Webhook ${webhookUrl} parse error: ${err.message}`);
      return false;
    }
  }

  private resolveHostname(hostname: string): Promise<string[]> {
    return new Promise((resolve, reject) => {
      if (net.isIPv4(hostname) || net.isIPv6(hostname)) {
        resolve([hostname]);
        return;
      }
      dns.resolve4(hostname, (err: any, addresses: string[]) => {
        if (err) reject(err);
        else resolve(addresses);
      });
    });
  }
}
