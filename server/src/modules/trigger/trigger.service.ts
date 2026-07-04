import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { DATABASE_TOKEN } from '../../db/database.module';
import { eq, and, sql, desc } from 'drizzle-orm';
import { triggerBindings, scanLogs, automationTriggers } from '../../db/schema';
import { CreateBindingDto, UpdateBindingDto, ScanEventDto, CreateAutomationDto } from './dto/trigger.dto';
import { TriggerResolverService } from '../../plugins/core/trigger-resolver.service';
import { ScanResult, ResolveContext, ResolvedAction } from '../../plugins/types/plugin.types';

@Injectable()
export class TriggerService {
  constructor(
    @Inject(DATABASE_TOKEN) private readonly db: any,
    private readonly resolver: TriggerResolverService,
  ) {}

  // === 绑定管理 ===
  async listBindings(familyId: number, codeType?: string) {
    let condition = eq(triggerBindings.familyId, familyId);
    if (codeType) {
      condition = and(condition, eq(triggerBindings.codeType, codeType as any))!;
    }
    return this.db.select().from(triggerBindings).where(condition).all();
  }

  async getBindingById(bindingId: number) {
    const binding = await this.db.select().from(triggerBindings)
      .where(eq(triggerBindings.id, bindingId))
      .get();
    if (!binding) throw new NotFoundException('绑定不存在');
    return binding;
  }

  async lookupBinding(code: string, codeType: string) {
    return this.db.select().from(triggerBindings)
      .where(and(
        eq(triggerBindings.code, code),
        eq(triggerBindings.codeType, codeType as any),
      ))
      .get();
  }

  async createBinding(familyId: number, dto: CreateBindingDto) {
    // 检查是否已存在
    const existing = await this.lookupBinding(dto.code, dto.codeType);
    if (existing) {
      // 更新现有绑定
      return this.updateBinding(existing.id, dto);
    }

    return this.db.insert(triggerBindings).values({
      familyId,
      code: dto.code,
      codeType: dto.codeType,
      targetType: dto.targetType,
      targetId: dto.targetId,
      actionOverride: dto.actionOverride,
      label: dto.label,
    }).returning().get();
  }

  async updateBinding(bindingId: number, dto: UpdateBindingDto) {
    const binding = await this.getBindingById(bindingId);

    const updates: Record<string, any> = {};
    if (dto.targetId !== undefined) updates.targetId = dto.targetId;
    if (dto.targetType) updates.targetType = dto.targetType;
    if (dto.actionOverride !== undefined) updates.actionOverride = dto.actionOverride;
    if (dto.label !== undefined) updates.label = dto.label;

    await this.db.update(triggerBindings)
      .set(updates)
      .where(eq(triggerBindings.id, bindingId))
      .run();

    return this.getBindingById(bindingId);
  }

  async deleteBinding(bindingId: number) {
    await this.db.delete(triggerBindings)
      .where(eq(triggerBindings.id, bindingId))
      .run();
    return { success: true };
  }

  // === 扫描事件处理 ===

  /**
   * Handle a scan event from the frontend scanner adapter.
   *
   * P-T03 refactoring:
   * - Uses TriggerResolverService.resolve() for context-aware action inference
   *   instead of the previous hardcoded resolveAction() map.
   * - Constructs ScanResult and ResolveContext from the incoming ScanEventDto.
   * - Returns ResolvedAction alongside backward-compat fields.
   * - The hardcoded resolveAction() and getTargetPage() methods are removed;
   *   their logic now lives in TriggerResolverService.matchAction().
   */
  async handleScan(familyId: number, userId: number, dto: ScanEventDto) {
    // 1. Lookup binding for the scanned code
    const binding = await this.lookupBinding(dto.code, dto.codeType);

    // 2. Update read count if binding exists
    if (binding) {
      await this.db.update(triggerBindings)
        .set({
          lastReadAt: new Date(),
          readCount: sql`${triggerBindings.readCount} + 1`,
        })
        .where(eq(triggerBindings.id, binding.id))
        .run();
    }

    // 3. Construct ScanResult from DTO
    const scan: ScanResult = {
      type: dto.codeType,
      raw: dto.code,
      timestamp: Date.now(),
      metadata: dto.metadata,
    };

    // 4. Construct ResolveContext from DTO's optional context fields
    const context: ResolveContext = {
      pagePath: dto.pagePath,
      locationId: dto.locationId,
      recentActions: dto.recentActions,
    };

    // 5. Resolve action using TriggerResolverService
    const resolvedAction = await this.resolver.resolve(scan, context, binding);

    // 6. Record scan log
    await this.db.insert(scanLogs).values({
      familyId,
      userId,
      scanType: dto.codeType as any,
      code: dto.code,
      action: resolvedAction.primary,
      context: dto.metadata,
    });

    // 7. Return result — includes ResolvedAction for enriched frontend usage
    //    plus backward-compat 'action' string field
    return {
      binding,
      action: resolvedAction.primary,
      resolvedAction,
      page: binding ? this.inferTargetPage(binding) : null,
    };
  }

  /**
   * Infer the target page URL from a binding.
   * This is a lightweight helper for backward compatibility;
   * the full context-aware page inference now lives in
   * TriggerResolverService.matchAction().
   */
  private inferTargetPage(binding: any): string | null {
    if (!binding) return null;
    switch (binding.targetType) {
      case 'item': return `/stock/${binding.targetId}`;
      case 'location': return `/locations/${binding.targetId}`;
      case 'recipe': return `/recipes/${binding.targetId}`;
      case 'action': return `/actions/${binding.targetId}`;
      default: return null;
    }
  }

  // === 自动化规则 ===
  async listAutomations(familyId: number) {
    return this.db.select().from(automationTriggers)
      .where(eq(automationTriggers.familyId, familyId))
      .orderBy(automationTriggers.sortOrder)
      .all();
  }

  async createAutomation(familyId: number, dto: CreateAutomationDto) {
    return this.db.insert(automationTriggers).values({
      familyId,
      name: dto.name,
      triggerType: dto.triggerType as any,
      triggerConfig: dto.triggerConfig,
      actionType: dto.actionType as any,
      actionConfig: dto.actionConfig,
      enabled: dto.enabled ?? true,
    }).returning().get();
  }

  async updateAutomation(automationId: number, familyId: number, updates: Record<string, any>) {
    await this.db.update(automationTriggers)
      .set(updates)
      .where(and(
        eq(automationTriggers.id, automationId),
        eq(automationTriggers.familyId, familyId),
      ))
      .run();

    return this.db.select().from(automationTriggers)
      .where(eq(automationTriggers.id, automationId))
      .get();
  }

  async deleteAutomation(automationId: number, familyId: number) {
    await this.db.delete(automationTriggers)
      .where(and(
        eq(automationTriggers.id, automationId),
        eq(automationTriggers.familyId, familyId),
      ))
      .run();
    return { success: true };
  }

  async toggleAutomation(automationId: number, familyId: number) {
    const automation = await this.db.select().from(automationTriggers)
      .where(and(
        eq(automationTriggers.id, automationId),
        eq(automationTriggers.familyId, familyId),
      ))
      .get();

    if (!automation) throw new NotFoundException('自动化规则不存在');

    await this.db.update(automationTriggers)
      .set({ enabled: !automation.enabled })
      .where(eq(automationTriggers.id, automationId))
      .run();

    return { ...automation, enabled: !automation.enabled };
  }

  // === NFC 预设场景安装 ===
  /**
   * Install preset NFC automation scenes for a family.
   * These are the predefined trigger modes from PRD §3.8 (US44-US52).
   */
  async installPresetScenes(familyId: number) {
    const presets = [
      {
        name: '🏠 到家模式',
        notes: '碰入户门 NFC → 检查今日临期物品 + 推荐菜谱',
        triggerType: 'nfc_tap' as const,
        triggerConfig: { code: 'homehub://scene/arrive-home' },
        actionType: 'open_page' as const,
        actionConfig: { page: '/dashboard', showExpiring: true, showRecipes: true },
        sortOrder: 1,
      },
      {
        name: '🧊 备餐模式',
        notes: '碰冰箱 NFC → 显示餐饮计划 + 所需食材库存 + 自动生成补货清单',
        triggerType: 'nfc_tap' as const,
        triggerConfig: { code: 'homehub://scene/fridge' },
        actionType: 'run_workflow' as const,
        actionConfig: { workflow: 'meal_prep' },
        sortOrder: 2,
      },
      {
        name: '💊 用药提醒',
        notes: '碰药箱 NFC → 显示临期药品清单',
        triggerType: 'nfc_tap' as const,
        triggerConfig: { code: 'homehub://scene/medicine' },
        actionType: 'open_page' as const,
        actionConfig: { page: '/stock?category=药品', filter: 'expiring' },
        sortOrder: 3,
      },
      {
        name: '🆘 急救模式',
        notes: '碰急救箱 NFC → 显示急救指南 + 一键拨打 120',
        triggerType: 'nfc_tap' as const,
        triggerConfig: { code: 'homehub://scene/emergency' },
        actionType: 'open_page' as const,
        actionConfig: { page: '/emergency' },
        sortOrder: 4,
      },
      {
        name: '🛒 采购模式',
        notes: '碰购物清单 NFC → 显示采购清单',
        triggerType: 'nfc_tap' as const,
        triggerConfig: { code: 'homehub://scene/shopping' },
        actionType: 'open_page' as const,
        actionConfig: { page: '/lists?type=shopping' },
        sortOrder: 5,
      },
      {
        name: '👕 换季模式',
        notes: '碰衣柜 NFC → 盘点当季衣物',
        triggerType: 'nfc_tap' as const,
        triggerConfig: { code: 'homehub://scene/wardrobe' },
        actionType: 'open_page' as const,
        actionConfig: { page: '/stock?type=clothing' },
        sortOrder: 6,
      },
      {
        name: '🧳 出行模式',
        notes: '碰行李箱 NFC → 生成出行物品清单',
        triggerType: 'nfc_tap' as const,
        triggerConfig: { code: 'homehub://scene/travel' },
        actionType: 'run_workflow' as const,
        actionConfig: { workflow: 'travel_pack' },
        sortOrder: 7,
      },
      {
        name: '🔧 自定义快捷操作',
        notes: '可自定义 NFC 触发动作',
        triggerType: 'custom' as const,
        triggerConfig: {},
        actionType: 'call_mcp_tool' as const,
        actionConfig: {},
        sortOrder: 99,
      },
    ];

    const results: any[] = [];
    for (const preset of presets) {
      // Check if already exists by name
      const existing = await this.db.select().from(automationTriggers)
        .where(and(
          eq(automationTriggers.familyId, familyId),
          eq(automationTriggers.name, preset.name),
        ))
        .get();

      if (!existing) {
        const created = await this.db.insert(automationTriggers).values({
          familyId,
          ...preset,
          enabled: true,
        }).returning().get();
        results.push({ name: preset.name, action: 'created', id: created.id });
      } else {
        results.push({ name: preset.name, action: 'already_exists' });
      }
    }

    return { installed: results.filter((r: any) => r.action === 'created').length, results };
  }

  // === 扫描日志 ===
  async getScanLogs(familyId: number, limit: number = 50) {
    return this.db.select().from(scanLogs)
      .where(eq(scanLogs.familyId, familyId))
      .orderBy(desc(scanLogs.createdAt))
      .limit(limit)
      .all();
  }
}
