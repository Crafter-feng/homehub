import { ref } from 'vue';
import type { Component } from 'vue';
import type {
  ClientPluginExports,
  ScannerAdapterExports,
  ServerPluginInfo,
  ItemTypeFrontendConfig,
  PluginSlotDeclaration,
} from './types/client-plugin.types';

// === Built-in ItemType configs (Phase 0 fallback until backend API exposes exports) ===

const builtInItemTypeConfigs: Record<string, ItemTypeFrontendConfig> = {
  food: {
    hasStateMachine: false,
    features: ['expiry_warning', 'auto_stocktake'],
    defaultUnit: '个',
    fields: [
      { key: 'bestBefore', label: '最佳食用日期', type: 'date' },
      { key: 'batchNo', label: '批次号', type: 'string' },
    ],
  },
  grocery: {
    hasStateMachine: false,
    features: ['low_stock_alert'],
    defaultUnit: '个',
    fields: [],
  },
  rechargeable_battery: {
    hasStateMachine: true,
    stateMachine: {
      states: ['charged', 'depleted', 'charging'],
      transitions: [
        { from: 'charged', action: 'use', label: '使用/放电', to: 'depleted' },
        { from: 'depleted', action: 'charge', label: '开始充电', to: 'charging' },
        { from: 'charging', action: 'complete', label: '充电完成', to: 'charged', incrementCycle: true },
      ],
    },
    features: ['cycle_count_tracking'],
    renderComponent: 'BatteryStateIndicator',
    defaultUnit: '个',
    fields: [
      { key: 'capacity', label: '容量(mAh)', type: 'number', required: true },
      { key: 'cycleCount', label: '循环次数', type: 'number', defaultValue: 0 },
    ],
  },
  gas_tank: {
    hasStateMachine: true,
    stateMachine: {
      states: ['full', 'partial', 'empty'],
      transitions: [
        { from: 'full', action: 'use', label: '使用', to: 'partial' },
        { from: 'partial', action: 'use', label: '使用', to: 'empty' },
        { from: 'empty', action: 'refill', label: '充装', to: 'full' },
      ],
    },
    features: [],
    renderComponent: 'GasTankStateIndicator',
    defaultUnit: 'kg',
    fields: [
      { key: 'capacity', label: '容量(kg)', type: 'number' },
    ],
  },
  electronic_device: {
    hasStateMachine: false,
    features: ['warranty_tracking', 'repair_history', 'document_attach'],
    fields: [
      { key: 'brand', label: '品牌', type: 'string' },
      { key: 'model', label: '型号', type: 'string' },
      { key: 'serialNumber', label: '序列号', type: 'string' },
      { key: 'warrantyEnd', label: '保修到期', type: 'date' },
    ],
  },
  fire_extinguisher: {
    hasStateMachine: true,
    stateMachine: {
      states: ['valid', 'expired', 'used'],
      transitions: [
        { from: 'valid', action: 'expire', label: '过期', to: 'expired' },
        { from: 'valid', action: 'discharge', label: '使用', to: 'used' },
      ],
    },
    features: [],
    fields: [
      { key: 'expiryDate', label: '有效期', type: 'date' },
      { key: 'lastInspection', label: '上次检查', type: 'date' },
    ],
  },
};

/**
 * ClientRegistry — Frontend plugin registration center.
 *
 * Manages:
 * 1. Server-side plugin metadata (synced from /api/v1/plugins)
 * 2. Frontend plugin exports (scanner adapters, component mappings, slot declarations)
 * 3. Built-in ItemType configs (Phase 0 fallback)
 */
class ClientRegistryImpl {
  /** Frontend plugin exports — keyed by pluginId */
  private clientPlugins: Map<string, ClientPluginExports> = new Map();

  /** Server plugin metadata — keyed by pluginId */
  private serverPlugins: Map<string, ServerPluginInfo> = new Map();

  /** Component map: renderComponent name → Vue Component */
  private componentMap: Map<string, Component> = new Map();

  /** Revision counter — incremented on every register/unregister to enable Vue reactivity tracking */
  private _revision = ref(0);

  /** Get the current revision value — used by computed properties to trigger dependency tracking */
  getRevision(): number {
    return this._revision.value;
  }

  // === Server Plugin Metadata ===

  /** Register server-side plugin info (from /api/v1/plugins) */
  registerServerPlugin(info: ServerPluginInfo): void {
    this.serverPlugins.set(info.id, info);

    // If server exports include ItemType data, extract it for the component map
    if (info.exports && info.extensionPoints.includes('item-type')) {
      this.extractItemTypeFromServerExports(info.id, info.exports);
    }
    this._revision.value++;
  }

  /** Remove server plugin metadata */
  unregisterServerPlugin(pluginId: string): void {
    this.serverPlugins.delete(pluginId);
    this._revision.value++;
  }

  /** Get all registered server plugin info */
  getServerPlugins(): ServerPluginInfo[] {
    void this._revision.value;
    return Array.from(this.serverPlugins.values());
  }

  /** Get a specific server plugin by ID */
  getServerPlugin(pluginId: string): ServerPluginInfo | undefined {
    void this._revision.value;
    return this.serverPlugins.get(pluginId);
  }

  // === Client Plugin Registration ===

  /** Register a frontend plugin with its exports */
  registerClientPlugin(pluginId: string, exports: ClientPluginExports): void {
    this.clientPlugins.set(pluginId, exports);

    // Register component mapping
    if (exports.components) {
      for (const [name, component] of Object.entries(exports.components)) {
        this.componentMap.set(name, component);
      }
    }
    this._revision.value++;
  }

  /** Remove a frontend plugin registration */
  unregisterClientPlugin(pluginId: string): void {
    const exports = this.clientPlugins.get(pluginId);
    if (exports?.components) {
      for (const name of Object.keys(exports.components)) {
        this.componentMap.delete(name);
      }
    }
    this.clientPlugins.delete(pluginId);
    this._revision.value++;
  }

  // === Slot Queries ===

  /** Get all slot declarations registered to a named slot position */
  getSlotDeclarations(slotName: string): PluginSlotDeclaration[] {
    void this._revision.value;
    const declarations: PluginSlotDeclaration[] = [];

    for (const exports of this.clientPlugins.values()) {
      if (exports.slots) {
        for (const slot of exports.slots) {
          if (slot.name === slotName) {
            declarations.push(slot);
          }
        }
      }
    }

    declarations.sort((a, b) => (a.order ?? 100) - (b.order ?? 100));
    return declarations;
  }

  // === Scanner Adapter ===

  /** Get a frontend scanner adapter by type (nfc, barcode, qr, rfid) */
  getScannerAdapter(scannerType: string): ScannerAdapterExports | null {
    void this._revision.value;
    for (const exports of this.clientPlugins.values()) {
      if (exports.scanner && exports.scanner.type === scannerType) {
        return exports.scanner;
      }
    }
    return null;
  }

  /** Get all registered scanner adapters */
  getScannerAdapters(): ScannerAdapterExports[] {
    void this._revision.value;
    const adapters: ScannerAdapterExports[] = [];
    for (const exports of this.clientPlugins.values()) {
      if (exports.scanner) {
        adapters.push(exports.scanner);
      }
    }
    return adapters;
  }

  // === ItemType Config ===

  /** Get ItemType frontend config by type key (e.g. 'rechargeable_battery', 'gas_tank').
   *  Checks server exports first, then falls back to built-in config map. */
  getItemTypeConfig(itemType: string): ItemTypeFrontendConfig | null {
    void this._revision.value;
    for (const info of this.serverPlugins.values()) {
      if (info.extensionPoints.includes('item-type') && info.exports) {
        const config = this.extractItemTypeConfigFromExports(itemType, info.exports);
        if (config) return config;
      }
    }

    return builtInItemTypeConfigs[itemType] ?? null;
  }

  // === Component Map ===

  /** Get the renderComponent → Vue component mapping */
  getComponentMap(): Record<string, Component> {
    void this._revision.value;
    const map: Record<string, Component> = {};
    for (const [name, component] of this.componentMap.entries()) {
      map[name] = component;
    }
    return map;
  }

  /** Resolve a renderComponent name to its Vue component */
  resolveComponent(renderComponentName: string): Component | null {
    void this._revision.value;
    return this.componentMap.get(renderComponentName) ?? null;
  }

  // === Private Helpers ===

  /** Extract ItemType config from server plugin exports (various formats) */
  private extractItemTypeConfigFromExports(
    itemType: string,
    exports: Record<string, unknown>,
  ): ItemTypeFrontendConfig | null {
    // Format 1: exports IS the ItemTypePluginExports (exports.type === itemType)
    if (exports.type === itemType && exports.config) {
      const cfg = exports.config as Record<string, unknown>;
      return this.mapItemTypeConfig(cfg);
    }

    // Format 2: exports contains keyed entries (exports[itemType] = { config: ... })
    const keyedEntry = exports[itemType];
    if (keyedEntry && typeof keyedEntry === 'object') {
      const entry = keyedEntry as Record<string, unknown>;
      if (entry.config) {
        return this.mapItemTypeConfig(entry.config as Record<string, unknown>);
      }
    }

    // Format 3: exports.types is an array of ItemTypePluginExports
    if (Array.isArray(exports.types)) {
      const found = (exports.types as Array<Record<string, unknown>>).find(
        (it) => it.type === itemType,
      );
      if (found && found.config) {
        return this.mapItemTypeConfig(found.config as Record<string, unknown>);
      }
    }

    return null;
  }

  /** Map a raw ItemType config (from server) to ItemTypeFrontendConfig */
  private mapItemTypeConfig(cfg: Record<string, unknown>): ItemTypeFrontendConfig {
    return {
      hasStateMachine: (cfg.hasStateMachine as boolean) ?? false,
      stateMachine: cfg.stateMachine as ItemTypeFrontendConfig['stateMachine'],
      renderComponent: cfg.renderComponent as string | undefined,
      features: (cfg.features as string[]) ?? [],
      defaultUnit: cfg.defaultUnit as string | undefined,
      fields: (cfg.fields as ItemTypeFrontendConfig['fields']) ?? [],
    };
  }

  /** Extract ItemType data from server exports and register renderComponent mapping.
   *  Currently a placeholder — actual Vue components come from client plugin registration.
   *  Will be used when P-T05 enhances the backend API to include full exports. */
  private extractItemTypeFromServerExports(
    _pluginId: string,
    _exports: Record<string, unknown>,
  ): void {
    // Placeholder for P-T05: when backend API includes full ItemTypePluginExports,
    // this method will extract renderComponent names and prepare for component mapping.
    // Phase 0: component mapping is handled by built-in adapters registration.
  }
}

// Singleton instance
export const clientRegistry = new ClientRegistryImpl();
