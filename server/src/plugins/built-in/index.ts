import { HomeHubPlugin } from '../types/plugin.types';
import { McpServerPlugin } from './mcp-server';
import { ScannerNfcPlugin } from './scanner-nfc';
import { ScannerBarcodePlugin } from './scanner-barcode';
import { allItemTypePlugins } from './item-types';
import { allTriggerActionPlugins } from './trigger-actions';

/**
 * All built-in plugins — flat array of individually-registered plugins.
 *
 * After P-T02 refactoring:
 * - 6 ItemType plugins (each with meta.id = builtin.item-types.{type})
 * - 4 TriggerAction plugins (each with meta.id = builtin.trigger-actions.{type})
 * - 2 Scanner plugins (metadata-only, runtime.env = 'frontend')
 * - 1 McpServer plugin (unchanged, exports.tools array)
 *
 * Total: 13 plugins
 */
export const builtinPlugins: HomeHubPlugin[] = [
  // 6 ItemType plugins — individually registered to 'item-type' extension point
  ...allItemTypePlugins,

  // 4 TriggerAction plugins — individually registered to 'trigger-action' extension point
  ...allTriggerActionPlugins,

  // 2 Scanner plugins — metadata registration only (runtime: frontend)
  ScannerNfcPlugin,
  ScannerBarcodePlugin,

  // 1 McpServer plugin — keeps legacy exports.tools array format
  McpServerPlugin,
];

// Named exports for direct access
export { McpServerPlugin } from './mcp-server';
export { ScannerNfcPlugin } from './scanner-nfc';
export { ScannerBarcodePlugin } from './scanner-barcode';
export {
  FoodItemPlugin,
  GroceryItemPlugin,
  BatteryItemPlugin,
  GasTankItemPlugin,
  ElectronicDeviceItemPlugin,
  FireExtinguisherItemPlugin,
  allItemTypePlugins,
} from './item-types';
export {
  NotificationTriggerPlugin,
  WebhookTriggerPlugin,
  OpenPageTriggerPlugin,
  McpToolTriggerPlugin,
  allTriggerActionPlugins,
} from './trigger-actions';
