import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PluginRegistryService } from './registry/plugin-registry.service';
import { PluginStorageService } from './core/plugin-storage.service';
import { EventBusService } from './core/event-bus.service';
import { HomeHubPlugin, ItemTypePluginExports } from './types/plugin.types';

/**
 * PluginsService — business logic layer for plugin management.
 *
 * P-T05: Separated from PluginsController to follow NestJS best practices.
 * Handles:
 * 1. Plugin listing with enriched exports.config data
 * 2. ItemType configs aggregation
 * 3. Plugin configuration updates (stored via PluginStorageService)
 * 4. Plugin runtime state summary
 */
@Injectable()
export class PluginsService {
  private readonly logger = new Logger('PluginsService');

  constructor(
    private readonly registry: PluginRegistryService,
    private readonly storage: PluginStorageService,
    private readonly eventBus: EventBusService,
  ) {}

  /**
   * List all plugins with enriched data, including exports.config for ItemType plugins.
   * Returns the full plugin list with exports.config attached for each ItemType plugin.
   */
  listPluginsWithExports(): Array<Record<string, unknown>> {
    const plugins = this.registry.listPlugins();
    return plugins.map((plugin: Record<string, unknown>) => {
      const pluginId = plugin.id as string;
      const pluginInstance = this.registry.getPlugin(pluginId);

      // Attach exports.config if this is an ItemType plugin
      if (pluginInstance?.exports && pluginInstance.meta.extensionPoints.includes('item-type')) {
        const itemTypeExports = this.extractItemTypeExports(pluginInstance);
        if (itemTypeExports) {
          plugin.exports = itemTypeExports;
        }
      }

      return plugin;
    });
  }

  /**
   * Get all ItemType configs aggregated from registered plugins.
   * Returns a map of itemType → config object.
   */
  getItemTypeConfigs(): Record<string, Record<string, unknown>> {
    const configs: Record<string, Record<string, unknown>> = {};

    const itemTypeExports = this.registry.getPlugins<ItemTypePluginExports>('item-type');
    for (const itemExport of itemTypeExports) {
      if (itemExport.type && itemExport.config) {
        configs[itemExport.type] = {
          hasStateMachine: itemExport.config.hasStateMachine,
          stateMachine: itemExport.config.stateMachine,
          features: itemExport.config.features,
          defaultUnit: itemExport.config.defaultUnit,
          renderComponent: itemExport.config.renderComponent,
          fields: itemExport.config.fields,
        };
      }
    }

    this.logger.log(`聚合 ItemType 配置: ${Object.keys(configs).length} 种类型`);
    return configs;
  }

  /**
   * Update a plugin's configuration.
   * Stores the new config to PluginStorageService under the key 'config'.
   * If the plugin has an onConfigChange handler, calls it with the new config.
   */
  async updatePluginConfig(pluginId: string, config: Record<string, unknown>): Promise<Record<string, unknown>> {
    const plugin = this.registry.getPlugin(pluginId);
    if (!plugin) {
      throw new NotFoundException(`插件 ${pluginId} 不存在`);
    }

    // Persist config via PluginStorageService
    await this.storage.set(pluginId, 'config', config);

    // Call plugin's onConfigChange handler if available
    if (plugin.onConfigChange) {
      try {
        await plugin.onConfigChange(config);
      } catch (error: unknown) {
        const errMsg = error instanceof Error ? error.message : String(error);
        this.logger.error(`插件 ${pluginId} 配置变更回调失败: ${errMsg}`);
      }
    }

    // Emit config change event
    this.eventBus.emit('plugin:config-changed', { pluginId, config });

    this.logger.log(`插件配置更新: ${pluginId}`);
    return { pluginId, config, updatedAt: new Date().toISOString() };
  }

  /**
   * Get a summary of all plugins' runtime state.
   * Returns an array of { id, name, status, extensionPoints, loadedAt } for each plugin.
   */
  getPluginsState(): Array<Record<string, unknown>> {
    const plugins = this.registry.listPlugins();
    return plugins.map((plugin: Record<string, unknown>) => ({
      id: plugin.id,
      name: plugin.name,
      version: plugin.version,
      status: plugin.status,
      extensionPoints: plugin.extensionPoints,
      loadedAt: plugin.loadedAt,
      error: plugin.error,
    }));
  }

  // === Private Helpers ===

  /** Extract ItemTypePluginExports from a plugin's exports object */
  private extractItemTypeExports(plugin: HomeHubPlugin): Record<string, unknown> | null {
    const exports = plugin.exports as Record<string, unknown> | undefined;
    if (!exports) return null;

    // Individual registration: exports IS the ItemTypePluginExports
    if (exports.type && exports.config && typeof exports.type === 'string') {
      return { type: exports.type, config: exports.config };
    }

    // Legacy array format: exports.types = [...]
    if (Array.isArray(exports.types)) {
      const types = exports.types as Array<Record<string, unknown>>;
      const result: Record<string, Record<string, unknown>> = {};
      for (const it of types) {
        if (it.type && it.config) {
          result[it.type as string] = it.config as Record<string, unknown>;
        }
      }
      return result;
    }

    return null;
  }
}
