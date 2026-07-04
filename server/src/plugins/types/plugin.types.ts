// === Type-only imports: real NestJS service types for PluginContext ===
import type { Database } from '../../db/types';
import type { ConfigService } from '../../config/config.service';
import type { PluginRegistryService } from '../registry/plugin-registry.service';
import type { EventBusService } from '../core/event-bus.service';

// === 插件元数据 ===
export interface HomeHubPluginMeta {
  id: string;
  name: string;
  version: string;
  description?: string;
  author?: string;
  homepage?: string;
  extensionPoints: string[];
  requires?: Record<string, string>;
  optionalDependencies?: string[];
  runtime?: PluginRuntime;
  configSchema?: Record<string, any>;
  permissions?: string[];
}

export interface PluginRuntime {
  type: 'native' | 'python' | 'go' | 'rust';
  entry?: string;
  env?: 'npx' | 'uvx' | 'direct' | 'binary' | 'frontend';
  ipc?: 'stdio' | 'socket' | 'unix_socket';
  healthCheck?: {
    interval: number;
    command: string;
  };
}

// === 插件接口 ===
export interface HomeHubPlugin {
  meta: HomeHubPluginMeta;
  onLoad?(ctx: PluginContext): Promise<void>;
  onUnload?(ctx: PluginContext): Promise<void>;
  onConfigChange?(config: Record<string, any>): Promise<void>;
  exports?: Record<string, any>;
}

// === 插件上下文 (DI-injected, no mocks) ===
export interface PluginContext {
  /** Real PluginRegistryService — plugins can query other plugins and extension points */
  registry: PluginRegistryService;
  /** Real Database connection (via DATABASE_TOKEN DI injection) */
  db: Database;
  /** Real ConfigService — reads from env/config, not inline process.env mock */
  config: ConfigService;
  /** Logger with [Plugin:id] prefix; info() maps to NestJS log() for backward compat */
  logger: Logger;
  /** Real EventBusService — supports emit/on/off/once/removeAllListeners */
  eventBus: EventBusService;
  /** DB-persisted scoped storage — auto-isolated by pluginId, survives restarts */
  storage: PluginStorage;
}

// === 扩展点类型 ===
export type ExtensionPointType =
  | 'scanner'
  | 'item-type'
  | 'output-device'
  | 'trigger-action'
  | 'mcp-tool'
  | 'notification'
  | 'barcode-lookup'
  | 'ui-page'
  | 'ui-component'
  | 'hook';

// === Scanner 扩展点契约 ===
export interface ScannerPluginExports {
  type: string;
  name: string;
  priority: number;
  supported: boolean;
  scan(options?: any): Promise<ScanResult>;
  listen(callback: ScanCallback): () => void;
}

export interface ScanResult {
  type: 'nfc' | 'qr' | 'barcode' | 'rfid';
  raw: string;
  timestamp: number;
  metadata?: Record<string, any>;
}

export type ScanCallback = (result: ScanResult) => void;

// === ItemType 扩展点契约 ===
export interface ItemTypePluginExports {
  type: string;
  name: string;
  icon: string;
  config: {
    fields: FieldDef[];
    hasStateMachine: boolean;
    stateMachine?: StateMachineDef;
    features: string[];
    defaultUnit?: string;
    renderComponent?: string;
  };
  validate?(data: any): { valid: boolean; errors: string[] };
}

export interface FieldDef {
  key: string;
  label: string;
  type: 'string' | 'number' | 'date' | 'select' | 'boolean' | 'image';
  required?: boolean;
  defaultValue?: any;
  options?: { label: string; value: string }[];
}

export interface StateMachineDef {
  states: string[];
  transitions: {
    from: string;
    action: string;
    label: string;
    to: string;
    incrementCycle?: boolean;
  }[];
}

// === MCP Tool 扩展点契约 ===
export interface McpToolExports {
  name: string;
  description: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  apiPath: string;
  parameters?: Record<string, {
    type: string;
    optional?: boolean;
    default?: any;
    enum?: string[];
    description?: string;
  }>;
  mapParams?: string;
}

// === OutputDevice 扩展点契约 ===
export interface OutputDevicePluginExports {
  type: string;
  name: string;
  detect(): Promise<any[]>;
  print(job: any): Promise<any>;
  write?(data: any): Promise<any>;
  getStatus(deviceId: string): any;
}

// === TriggerAction 扩展点契约 ===
export interface TriggerActionPluginExports {
  type: string;
  name: string;
  execute(config: Record<string, any>, context: any): Promise<any>;
}

// === TriggerResolver 契约 ===

/** Contextual signals for action resolution, typically provided by the frontend */
export interface ResolveContext {
  /** Current page path of the user (e.g. "/stock/invItems", "/shopping") */
  pagePath?: string;
  /** Known location ID of the user/device */
  locationId?: number;
  /** Recent action types performed by the user (for pattern inference) */
  recentActions?: string[];
  /** User role for permission-aware action resolution */
  userRole?: string;
}

/** A resolved action ready for execution by TriggerActionPluginExports */
export interface ResolvedAction {
  /** Primary action type — matches a TriggerActionPluginExports.type (e.g. "notification", "open_page") */
  primary: string;
  /** Parameters passed to the TriggerAction execute() method */
  params: Record<string, any>;
  /** Optional hints for the frontend (binding suggestions, contextual info) */
  hints?: ActionHint[];
}

/** A hint attached to a resolved action (UI guidance, binding suggestions) */
export interface ActionHint {
  type: 'binding' | 'override' | 'create-binding' | 'context' | string;
  message: string;
  data?: Record<string, any>;
}

// === Logger 接口 (backward-compatible: info() maps to NestJS log()) ===
export interface Logger {
  info(message: string): void;
  warn(message: string): void;
  error(message: string): void;
  debug(message: string): void;
}

// === PluginStorage 接口 (async, DB-backed) ===
export interface PluginStorage {
  get(key: string): Promise<any>;
  set(key: string, value: any): Promise<void>;
  delete(key: string): Promise<void>;
  clear(): Promise<void>;
  listKeys(): Promise<string[]>;
}
