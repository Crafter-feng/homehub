import { Injectable, Logger, forwardRef, Inject } from '@nestjs/common';
import { EventBusService } from '../core/event-bus.service';
import { PluginContextFactory } from '../core/plugin-context.factory';
import {
  HomeHubPlugin,
  HomeHubPluginMeta,
  ExtensionPointType,
  ItemTypePluginExports,
  TriggerActionPluginExports,
  McpToolExports,
  ScannerPluginExports,
} from '../types/plugin.types';
import * as fs from 'fs';
import * as path from 'path';

interface PluginInstance {
  plugin: HomeHubPlugin;
  status: 'active' | 'inactive' | 'error';
  loadedAt?: Date;
  error?: string;
}

@Injectable()
export class PluginRegistryService {
  private readonly logger = new Logger('PluginRegistry');
  private plugins: Map<string, PluginInstance> = new Map();
  /** Double-layered Map: ExtensionPointType → typeKey → HomeHubPlugin
   *  typeKey is determined by the extension point contract:
   *    'item-type'     → exports.type (e.g. "food", "rechargeable_battery")
   *    'trigger-action' → exports.type (e.g. "notification", "webhook")
   *    'mcp-tool'       → exports.name (e.g. "search_items", "add_item")
   *    'scanner'        → exports.type (e.g. "nfc", "barcode")
   *    other            → plugin.meta.id
   */
  private extensionPoints: Map<ExtensionPointType, Map<string, HomeHubPlugin>> = new Map();

  constructor(
    @Inject(forwardRef(() => PluginContextFactory))
    private readonly contextFactory: PluginContextFactory,
    private readonly eventBus: EventBusService,
  ) {}

  // === Discovery ===

  async discoverFromDir(dir: string): Promise<HomeHubPluginMeta[]> {
    const discovered: HomeHubPluginMeta[] = [];

    try {
      if (!fs.existsSync(dir)) {
        this.logger.warn(`插件目录不存在: ${dir}`);
        return discovered;
      }

      const entries = fs.readdirSync(dir, { withFileTypes: true });

      for (const entry of entries) {
        if (!entry.isDirectory()) continue;

        const pluginDir = path.join(dir, entry.name);
        const metaPath = path.join(pluginDir, 'plugin.json');

        if (fs.existsSync(metaPath)) {
          try {
            const metaContent = fs.readFileSync(metaPath, 'utf-8');
            const meta: HomeHubPluginMeta = JSON.parse(metaContent);
            discovered.push(meta);
            this.logger.log(`发现插件: ${meta.id}@${meta.version}`);
          } catch (error) {
            this.logger.error(`解析插件元数据失败: ${pluginDir}`, error);
          }
        }
      }
    } catch (error) {
      this.logger.error(`扫描插件目录失败: ${dir}`, error);
    }

    return discovered;
  }

  // === Lifecycle ===

  async load(plugin: HomeHubPlugin): Promise<void> {
    const { id } = plugin.meta;

    if (this.plugins.has(id)) {
      this.logger.warn(`插件 ${id} 已加载，跳过`);
      return;
    }

    try {
      // Call onLoad — using PluginContextFactory to inject real DI providers
      if (plugin.onLoad) {
        await plugin.onLoad(this.contextFactory.create(id));
      }

      // Register to extension points (per-point, type-key indexed)
      for (const point of plugin.meta.extensionPoints) {
        this.registerToExtensionPoint(point as ExtensionPointType, plugin);
      }

      this.plugins.set(id, {
        plugin,
        status: 'active',
        loadedAt: new Date(),
      });

      this.logger.log(`插件加载成功: ${id}`);
      this.eventBus.emit('plugin:loaded', { pluginId: id, extensionPoints: plugin.meta.extensionPoints });
    } catch (error: any) {
      this.plugins.set(id, {
        plugin,
        status: 'error',
        error: error.message,
      });
      this.logger.error(`插件加载失败: ${id}`, error);
      this.eventBus.emit('plugin:error', { pluginId: id, error: error.message });
    }
  }

  async unload(pluginId: string): Promise<void> {
    const instance = this.plugins.get(pluginId);
    if (!instance) {
      this.logger.warn(`插件 ${pluginId} 未加载`);
      return;
    }

    try {
      // Call onUnload — using PluginContextFactory
      if (instance.plugin.onUnload) {
        await instance.plugin.onUnload(this.contextFactory.create(pluginId));
      }

      // Unregister from extension points
      for (const point of instance.plugin.meta.extensionPoints) {
        this.unregisterFromExtensionPoint(point as ExtensionPointType, instance.plugin);
      }

      this.plugins.delete(pluginId);
      this.logger.log(`插件卸载成功: ${pluginId}`);
      this.eventBus.emit('plugin:unloaded', { pluginId });
    } catch (error: any) {
      this.logger.error(`插件卸载失败: ${pluginId}`, error);
    }
  }

  async reload(pluginId: string): Promise<void> {
    const instance = this.plugins.get(pluginId);
    if (!instance) {
      this.logger.warn(`插件 ${pluginId} 未加载，无法重新加载`);
      return;
    }
    const plugin = instance.plugin;
    await this.unload(pluginId);
    await this.load(plugin);
  }

  // === Extension Point Management (type-key indexed) ===

  private registerToExtensionPoint(point: ExtensionPointType, plugin: HomeHubPlugin): void {
    if (!this.extensionPoints.has(point)) {
      this.extensionPoints.set(point, new Map());
    }

    const pointMap = this.extensionPoints.get(point)!;

    // Extract type keys from the plugin's exports based on extension point contract
    switch (point) {
      case 'item-type': {
        const itemTypes = this.extractItemTypes(plugin);
        for (const it of itemTypes) {
          pointMap.set(it.type, plugin);
          this.logger.log(`扩展点注册: item-type → ${it.type} (${plugin.meta.id})`);
        }
        break;
      }
      case 'trigger-action': {
        const actions = this.extractTriggerActions(plugin);
        for (const act of actions) {
          pointMap.set(act.type, plugin);
          this.logger.log(`扩展点注册: trigger-action → ${act.type} (${plugin.meta.id})`);
        }
        break;
      }
      case 'mcp-tool': {
        const tools = this.extractMcpTools(plugin);
        for (const tool of tools) {
          pointMap.set(tool.name, plugin);
          this.logger.log(`扩展点注册: mcp-tool → ${tool.name} (${plugin.meta.id})`);
        }
        break;
      }
      case 'scanner': {
        const scanner = this.extractScanner(plugin);
        if (scanner) {
          pointMap.set(scanner.type, plugin);
          this.logger.log(`扩展点注册: scanner → ${scanner.type} (${plugin.meta.id})`);
        }
        break;
      }
      default: {
        // Other extension points indexed by plugin meta.id
        pointMap.set(plugin.meta.id, plugin);
        this.logger.log(`扩展点注册: ${point} → ${plugin.meta.id}`);
        break;
      }
    }
  }

  private unregisterFromExtensionPoint(point: ExtensionPointType, plugin: HomeHubPlugin): void {
    const pointMap = this.extensionPoints.get(point);
    if (!pointMap) return;

    // Remove all entries where the value equals this plugin
    const keysToRemove: string[] = [];
    for (const [key, registeredPlugin] of pointMap) {
      if (registeredPlugin.meta.id === plugin.meta.id) {
        keysToRemove.push(key);
      }
    }
    for (const key of keysToRemove) {
      pointMap.delete(key);
    }
  }

  // === Extraction Helpers ===

  /** Extract ItemTypePluginExports from a plugin — supports both individual and array formats */
  private extractItemTypes(plugin: HomeHubPlugin): ItemTypePluginExports[] {
    const exports = plugin.exports;
    if (!exports) return [];

    // Individual registration: exports IS the ItemTypePluginExports
    if (exports.type && exports.config && typeof exports.type === 'string') {
      return [exports as ItemTypePluginExports];
    }

    // Legacy array format: exports.types = [...]
    if (Array.isArray(exports.types)) {
      return exports.types as ItemTypePluginExports[];
    }

    return [];
  }

  /** Extract TriggerActionPluginExports from a plugin — supports both individual and array formats */
  private extractTriggerActions(plugin: HomeHubPlugin): TriggerActionPluginExports[] {
    const exports = plugin.exports;
    if (!exports) return [];

    // Individual registration: exports IS the TriggerActionPluginExports
    if (exports.type && exports.execute && typeof exports.type === 'string') {
      return [exports as TriggerActionPluginExports];
    }

    // Legacy array format: exports.actions = [...]
    if (Array.isArray(exports.actions)) {
      return exports.actions as TriggerActionPluginExports[];
    }

    return [];
  }

  /** Extract McpToolExports from a plugin — supports both individual and array formats */
  private extractMcpTools(plugin: HomeHubPlugin): McpToolExports[] {
    const exports = plugin.exports;
    if (!exports) return [];

    // Individual registration: exports IS the McpToolExports
    if (exports.name && exports.apiPath && typeof exports.name === 'string') {
      return [exports as McpToolExports];
    }

    // Legacy array format: exports.tools = [...]
    if (Array.isArray(exports.tools)) {
      return exports.tools as McpToolExports[];
    }

    return [];
  }

  /** Extract ScannerPluginExports from a plugin */
  private extractScanner(plugin: HomeHubPlugin): ScannerPluginExports | null {
    const exports = plugin.exports;
    if (!exports) return null;

    // Individual registration: exports IS the ScannerPluginExports
    if (exports.type && typeof exports.type === 'string') {
      return exports as ScannerPluginExports;
    }

    return null;
  }

  /** Extract the specific export matching a typeKey from a plugin's exports */
  private extractExportsByPoint<T>(point: ExtensionPointType, plugin: HomeHubPlugin, typeKey: string): T | null {
    const exports = plugin.exports;
    if (!exports) return null;

    switch (point) {
      case 'item-type': {
        // Individual: exports itself IS the ItemType
        if (exports.type === typeKey && exports.config) {
          return exports as T;
        }
        // Legacy: find in exports.types array
        if (Array.isArray(exports.types)) {
          const found = (exports.types as ItemTypePluginExports[]).find(it => it.type === typeKey);
          return found ? found as T : null;
        }
        return null;
      }
      case 'trigger-action': {
        // Individual: exports itself IS the TriggerAction
        if (exports.type === typeKey && exports.execute) {
          return exports as T;
        }
        // Legacy: find in exports.actions array
        if (Array.isArray(exports.actions)) {
          const found = (exports.actions as TriggerActionPluginExports[]).find(act => act.type === typeKey);
          return found ? found as T : null;
        }
        return null;
      }
      case 'mcp-tool': {
        // Individual: exports itself IS the McpTool
        if (exports.name === typeKey && exports.apiPath) {
          return exports as T;
        }
        // Legacy: find in exports.tools array
        if (Array.isArray(exports.tools)) {
          const found = (exports.tools as McpToolExports[]).find(tool => tool.name === typeKey);
          return found ? found as T : null;
        }
        return null;
      }
      case 'scanner': {
        // Scanner exports are always the full ScannerPluginExports object
        return exports as T;
      }
      default: {
        // Other extension points return full exports
        return exports as T;
      }
    }
  }

  // === Query Methods ===

  /** Get all exports registered to an extension point */
  getPlugins<T>(point: ExtensionPointType): T[] {
    const pointMap = this.extensionPoints.get(point);
    if (!pointMap) return [];

    const result: T[] = [];
    for (const [typeKey, plugin] of pointMap) {
      if (this.plugins.get(plugin.meta.id)?.status === 'active') {
        const exportData = this.extractExportsByPoint<T>(point, plugin, typeKey);
        if (exportData) result.push(exportData);
      }
    }
    return result;
  }

  /** Get a single export by type key from an extension point.
   *  For 'item-type': typeKey = ItemType type (e.g. "food", "rechargeable_battery")
   *  For 'trigger-action': typeKey = TriggerAction type (e.g. "notification", "webhook")
   *  For 'mcp-tool': typeKey = tool name (e.g. "search_items")
   *  For 'scanner': typeKey = scanner type (e.g. "nfc", "barcode")
   */
  getPluginByType<T>(point: ExtensionPointType, typeKey: string): T | null {
    const pointMap = this.extensionPoints.get(point);
    if (!pointMap) return null;

    const plugin = pointMap.get(typeKey);
    if (!plugin || this.plugins.get(plugin.meta.id)?.status !== 'active') return null;

    return this.extractExportsByPoint<T>(point, plugin, typeKey);
  }

  /** Get all exports matching a type key from an extension point.
   *  In practice there is usually one plugin per typeKey, but this returns
   *  an array for consistency and future multi-plugin support.
   */
  getPluginsByType<T>(point: ExtensionPointType, typeKey: string): T[] {
    const result = this.getPluginByType<T>(point, typeKey);
    return result ? [result] : [];
  }

  /** Get the first (highest-priority) export from an extension point */
  getFirstPlugin<T>(point: ExtensionPointType): T | null {
    const all = this.getPlugins<T>(point);
    return all.length > 0 ? all[0] : null;
  }

  getPluginService(pluginId: string, serviceName: string): any {
    const instance = this.plugins.get(pluginId);
    if (instance?.plugin.exports?.services?.[serviceName]) {
      return instance.plugin.exports.services[serviceName];
    }
    return null;
  }

  // === Plugin Info ===

  listPlugins(): any[] {
    return Array.from(this.plugins.entries()).map(([id, instance]) => ({
      id,
      name: instance.plugin.meta.name,
      version: instance.plugin.meta.version,
      status: instance.status,
      extensionPoints: instance.plugin.meta.extensionPoints,
      runtime: instance.plugin.meta.runtime,
      loadedAt: instance.loadedAt,
      error: instance.error,
    }));
  }

  getPlugin(pluginId: string): HomeHubPlugin | undefined {
    return this.plugins.get(pluginId)?.plugin;
  }

  isLoaded(pluginId: string): boolean {
    return this.plugins.has(pluginId) && this.plugins.get(pluginId)!.status === 'active';
  }
}
