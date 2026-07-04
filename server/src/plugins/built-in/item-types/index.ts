import { HomeHubPlugin, HomeHubPluginMeta, ItemTypePluginExports } from '../../types/plugin.types';

// === Food (食品) ===
const foodExports: ItemTypePluginExports = {
  type: 'food',
  name: '食品',
  icon: '🍖',
  config: {
    fields: [
      { key: 'bestBefore', label: '最佳食用日期', type: 'date' },
      { key: 'batchNo', label: '批次号', type: 'string' },
    ],
    hasStateMachine: false,
    features: ['expiry_warning', 'auto_stocktake'],
    defaultUnit: '个',
  },
};

const foodMeta: HomeHubPluginMeta = {
  id: 'builtin.item-types.food',
  name: 'Item Type: 食品',
  version: '1.0.0',
  description: '食品物品类型定义',
  author: 'HomeHub Team',
  extensionPoints: ['item-type'],
};

export const FoodItemPlugin: HomeHubPlugin = {
  meta: foodMeta,
  exports: foodExports,
  async onLoad(ctx) {
    ctx.logger.info(`食品 ItemType 插件加载完成 (type: food)`);
  },
  async onUnload(ctx) {
    ctx.logger.info('食品 ItemType 插件已卸载');
  },
};

// === Grocery (日用品) ===
const groceryExports: ItemTypePluginExports = {
  type: 'grocery',
  name: '日用品',
  icon: '🧺',
  config: {
    fields: [],
    hasStateMachine: false,
    features: ['low_stock_alert'],
    defaultUnit: '个',
  },
};

const groceryMeta: HomeHubPluginMeta = {
  id: 'builtin.item-types.grocery',
  name: 'Item Type: 日用品',
  version: '1.0.0',
  description: '日用品物品类型定义',
  author: 'HomeHub Team',
  extensionPoints: ['item-type'],
};

export const GroceryItemPlugin: HomeHubPlugin = {
  meta: groceryMeta,
  exports: groceryExports,
  async onLoad(ctx) {
    ctx.logger.info(`日用品 ItemType 插件加载完成 (type: grocery)`);
  },
  async onUnload(ctx) {
    ctx.logger.info('日用品 ItemType 插件已卸载');
  },
};

// === Battery (充电电池) ===
const batteryExports: ItemTypePluginExports = {
  type: 'rechargeable_battery',
  name: '充电电池',
  icon: '🔋',
  config: {
    fields: [
      { key: 'capacity', label: '容量(mAh)', type: 'number', required: true },
      { key: 'cycleCount', label: '循环次数', type: 'number', defaultValue: 0 },
    ],
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
  },
};

const batteryMeta: HomeHubPluginMeta = {
  id: 'builtin.item-types.rechargeable_battery',
  name: 'Item Type: 充电电池',
  version: '1.0.0',
  description: '充电电池物品类型定义（含状态机）',
  author: 'HomeHub Team',
  extensionPoints: ['item-type'],
};

export const BatteryItemPlugin: HomeHubPlugin = {
  meta: batteryMeta,
  exports: batteryExports,
  async onLoad(ctx) {
    ctx.logger.info(`充电电池 ItemType 插件加载完成 (type: rechargeable_battery)`);
  },
  async onUnload(ctx) {
    ctx.logger.info('充电电池 ItemType 插件已卸载');
  },
};

// === Gas Tank (煤气罐) ===
const gasTankExports: ItemTypePluginExports = {
  type: 'gas_tank',
  name: '煤气罐',
  icon: '🔥',
  config: {
    fields: [
      { key: 'capacity', label: '容量(kg)', type: 'number' },
    ],
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
  },
};

const gasTankMeta: HomeHubPluginMeta = {
  id: 'builtin.item-types.gas_tank',
  name: 'Item Type: 煤气罐',
  version: '1.0.0',
  description: '煤气罐物品类型定义（含状态机）',
  author: 'HomeHub Team',
  extensionPoints: ['item-type'],
};

export const GasTankItemPlugin: HomeHubPlugin = {
  meta: gasTankMeta,
  exports: gasTankExports,
  async onLoad(ctx) {
    ctx.logger.info(`煤气罐 ItemType 插件加载完成 (type: gas_tank)`);
  },
  async onUnload(ctx) {
    ctx.logger.info('煤气罐 ItemType 插件已卸载');
  },
};

// === Electronic Device (电子设备) ===
const electronicExports: ItemTypePluginExports = {
  type: 'electronic_device',
  name: '电子设备',
  icon: '📱',
  config: {
    fields: [
      { key: 'brand', label: '品牌', type: 'string' },
      { key: 'model', label: '型号', type: 'string' },
      { key: 'serialNumber', label: '序列号', type: 'string' },
      { key: 'warrantyEnd', label: '保修到期', type: 'date' },
    ],
    hasStateMachine: false,
    features: ['warranty_tracking', 'repair_history', 'document_attach'],
  },
};

const electronicMeta: HomeHubPluginMeta = {
  id: 'builtin.item-types.electronic_device',
  name: 'Item Type: 电子设备',
  version: '1.0.0',
  description: '电子设备物品类型定义',
  author: 'HomeHub Team',
  extensionPoints: ['item-type'],
};

export const ElectronicDeviceItemPlugin: HomeHubPlugin = {
  meta: electronicMeta,
  exports: electronicExports,
  async onLoad(ctx) {
    ctx.logger.info(`电子设备 ItemType 插件加载完成 (type: electronic_device)`);
  },
  async onUnload(ctx) {
    ctx.logger.info('电子设备 ItemType 插件已卸载');
  },
};

// === Fire Extinguisher (灭火器) ===
const fireExtinguisherExports: ItemTypePluginExports = {
  type: 'fire_extinguisher',
  name: '灭火器',
  icon: '🧯',
  config: {
    fields: [
      { key: 'expiryDate', label: '有效期', type: 'date' },
      { key: 'lastInspection', label: '上次检查', type: 'date' },
    ],
    hasStateMachine: true,
    stateMachine: {
      states: ['valid', 'expired', 'used'],
      transitions: [
        { from: 'valid', action: 'expire', label: '过期', to: 'expired' },
        { from: 'valid', action: 'discharge', label: '使用', to: 'used' },
      ],
    },
    features: [],
  },
};

const fireExtinguisherMeta: HomeHubPluginMeta = {
  id: 'builtin.item-types.fire_extinguisher',
  name: 'Item Type: 灭火器',
  version: '1.0.0',
  description: '灭火器物品类型定义（含状态机）',
  author: 'HomeHub Team',
  extensionPoints: ['item-type'],
};

export const FireExtinguisherItemPlugin: HomeHubPlugin = {
  meta: fireExtinguisherMeta,
  exports: fireExtinguisherExports,
  async onLoad(ctx) {
    ctx.logger.info(`灭火器 ItemType 插件加载完成 (type: fire_extinguisher)`);
  },
  async onUnload(ctx) {
    ctx.logger.info('灭火器 ItemType 插件已卸载');
  },
};

// === All ItemType plugins (for bulk import) ===
export const allItemTypePlugins: HomeHubPlugin[] = [
  FoodItemPlugin,
  GroceryItemPlugin,
  BatteryItemPlugin,
  GasTankItemPlugin,
  ElectronicDeviceItemPlugin,
  FireExtinguisherItemPlugin,
];
