import { Injectable, Inject, Logger } from '@nestjs/common';
import { PluginRegistryService } from '../registry/plugin-registry.service';
import { EventBusService } from './event-bus.service';
import {
  ScanResult,
  TriggerActionPluginExports,
  ResolveContext,
  ResolvedAction,
  ActionHint,
} from '../types/plugin.types';

/**
 * TriggerResolverService — resolves scan events into concrete actions
 * by fusing trigger bindings with contextual hints.
 *
 * Design constraints:
 * - Does NOT directly inject TriggerService (avoids circular dependency).
 *   Binding data is passed as a parameter to resolve() instead.
 * - Queries PluginRegistryService for TriggerAction executors.
 * - Emits events via EventBusService for observability.
 */
@Injectable()
export class TriggerResolverService {
  private readonly logger = new Logger('TriggerResolver');

  constructor(
    private readonly registry: PluginRegistryService,
    private readonly eventBus: EventBusService,
  ) {}

  /**
   * Resolve a scan result into a concrete action.
   *
   * @param scan - The raw scan result from frontend scanner adapter
   * @param context - ResolveContext with page path, location, recent actions, user role
   * @param binding - TriggerBinding data (passed in from TriggerService to avoid circular deps)
   *                  If null, the resolver falls back to default behavior with binding hints.
   * @returns ResolvedAction with primary action type, params, and optional hints
   */
  async resolve(
    scan: ScanResult,
    context: ResolveContext,
    binding: any | null,
  ): Promise<ResolvedAction> {
    this.logger.log(`解析扫描事件: type=${scan.type}, raw=${scan.raw}`);

    // 1. If no binding found, handle as unknown code
    if (!binding) {
      return this.handleUnknownCode(scan, context);
    }

    // 2. Fuse binding + context to infer intended action
    const resolved = this.matchAction(binding, context, scan.type);

    // 3. Emit resolution event for observability
    this.eventBus.emit('trigger:resolved', {
      scanType: scan.type,
      raw: scan.raw,
      bindingId: binding.id,
      resolvedAction: resolved.primary,
      context,
    });

    return resolved;
  }

  /**
   * Execute a resolved action by finding the appropriate TriggerAction executor
   * in the PluginRegistry and calling its execute() method.
   *
   * @param action - The resolved action to execute
   * @param context - Execution context (userId, familyId, etc.)
   * @returns Execution result from the TriggerAction plugin
   */
  async executeAction(action: ResolvedAction, context: any): Promise<any> {
    this.logger.log(`执行动作: ${action.primary}`);

    // Find the TriggerAction executor for this action type
    const executor = this.registry.getPluginByType<TriggerActionPluginExports>(
      'trigger-action',
      action.primary,
    );

    if (!executor) {
      this.logger.warn(`未找到 TriggerAction 执行器: ${action.primary}`);
      this.eventBus.emit('trigger:action-not-found', {
        actionType: action.primary,
        availableActions: this.registry.getPlugins<TriggerActionPluginExports>('trigger-action')
          .map(a => a.type),
      });
      return {
        success: false,
        error: `未找到动作执行器: ${action.primary}`,
        hints: action.hints || [],
      };
    }

    // Execute the action via the plugin's execute() method
    try {
      const result = await executor.execute(action.params, context);
      this.eventBus.emit('trigger:action-executed', {
        actionType: action.primary,
        result,
      });
      return result;
    } catch (error: any) {
      this.logger.error(`动作执行失败: ${action.primary}`, error);
      this.eventBus.emit('trigger:action-error', {
        actionType: action.primary,
        error: error.message,
      });
      return { success: false, error: error.message };
    }
  }

  // === Private Helpers ===

  /**
   * Infer the intended action by fusing binding data with contextual signals.
   *
   * Decision logic:
   * - targetType determines the base action (item→showDetail, location→viewLocation, etc.)
   * - Context overrides: same item on shopping page → quickAdd; barcode on stock page → quickAdd
   * - codeType refinement: NFC generally → showDetail; barcode → quickAdd
   */
  private matchAction(
    binding: any,
    context: ResolveContext,
    codeType: string,
  ): ResolvedAction {
    // Base action mapping by targetType
    const primaryActions: Record<string, string> = {
      item: 'showDetail',
      location: 'viewLocation',
      recipe: 'showDetail',
      action: 'triggerAction',
    };

    const baseAction = primaryActions[binding.targetType] || 'showDetail';

    // Context override: item on shopping page → quickAdd (add to shopping list)
    if (context.pagePath?.includes('shopping') && binding.targetType === 'item') {
      return {
        primary: 'open_page',
        params: {
          pageUrl: `/stock/invItems/${binding.targetId}`,
          itemId: binding.targetId,
          quickAdd: true,
        },
        hints: [
          { type: 'binding', message: `在购物页面扫描物品 ${binding.label || binding.targetId}，建议入库` },
        ],
      };
    }

    // Context override: barcode on stock page → quickAdd (add new item by barcode)
    if (codeType === 'barcode' && context.pagePath?.includes('stock')) {
      return {
        primary: 'open_page',
        params: {
          pageUrl: `/stock/add?barcode=${binding.code}`,
          barcode: binding.code,
        },
        hints: [
          { type: 'binding', message: `在库存页面扫描条码，建议添加新物品` },
        ],
      };
    }

    // Default resolution based on targetType
    return {
      primary: baseAction,
      params: {
        entityId: binding.targetId,
        targetType: binding.targetType,
        label: binding.label,
      },
      hints: binding.actionOverride
        ? [{ type: 'override', message: `绑定指定动作: ${binding.actionOverride}` }]
        : [],
    };
  }

  /**
   * Handle scan results that have no matching binding.
   * Returns a default action with hints suggesting the user to create a binding.
   */
  private handleUnknownCode(scan: ScanResult, context: ResolveContext): ResolvedAction {
    this.logger.warn(`未找到绑定: codeType=${scan.type}, raw=${scan.raw}`);

    this.eventBus.emit('trigger:unknown-code', {
      scanType: scan.type,
      raw: scan.raw,
      context,
    });

    // Default behavior: suggest creating a new binding
    return {
      primary: 'notification',
      params: {
        title: '未识别的标签',
        message: `扫描到未绑定的 ${scan.type} 标签: ${scan.raw}`,
        type: 'warning',
      },
      hints: [
        {
          type: 'create-binding',
          message: `建议为此标签创建绑定 (codeType: ${scan.type}, code: ${scan.raw})`,
          data: { codeType: scan.type, code: scan.raw },
        },
      ],
    };
  }

  /** Determine time-of-day slot for context-aware inference */
  private getTimeSlot(): string {
    const hour = new Date().getHours();
    if (hour < 6) return 'night';
    if (hour < 12) return 'morning';
    if (hour < 18) return 'afternoon';
    return 'evening';
  }
}
