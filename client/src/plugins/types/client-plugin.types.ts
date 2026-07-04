import type { Component } from 'vue';

// === 前端插件导出接口 ===

/** Frontend plugin exports — combines scanner adapters, Vue component mappings, and slot declarations */
export interface ClientPluginExports {
  /** Scanner adapter exports (NFC, barcode, etc.) */
  scanner?: ScannerAdapterExports;
  /** Vue component mapping: renderComponent name → actual Vue component */
  components?: Record<string, Component>;
  /** Slot position declarations — components registered to named plugin slots */
  slots?: PluginSlotDeclaration[];
}

// === Scanner 适配器接口 ===

/** Scanner adapter interface for frontend scanning (NFC, barcode, QR, RFID) */
export interface ScannerAdapterExports {
  /** Scanner type identifier */
  type: 'nfc' | 'barcode' | 'qr' | 'rfid';
  /** Human-readable scanner name */
  name: string;
  /** Whether this scanner type is supported on the current device/browser */
  isSupported: boolean;
  /** Perform a single scan and return the result */
  scan(): Promise<ScanResult>;
  /** Listen for continuous scan events; returns an unsubscribe function */
  listen?(callback: (result: ScanResult) => void): () => void;
  /** Manual input helper — creates a ScanResult from manually entered code (barcode fallback) */
  manualScan?(code: string): ScanResult;
}

// === 插槽声明 ===

/** Declaration of a component to be rendered in a named plugin slot */
export interface PluginSlotDeclaration {
  /** Slot name, e.g. 'stock:item-detail-extra', 'stock:item-actions' */
  name: string;
  /** Vue component to render in this slot */
  component: Component;
  /** Default props to pass to the component */
  props?: Record<string, unknown>;
  /** Rendering order (lower = rendered first) */
  order?: number;
}

// === 扫描结果 (与后端 ScanResult 一致) ===

/** Scan result from a frontend scanner adapter */
export interface ScanResult {
  /** Type of the scanned code */
  type: 'nfc' | 'qr' | 'barcode' | 'rfid';
  /** Raw scanned content (NFC UID, barcode number, QR URL, etc.) */
  raw: string;
  /** Timestamp of the scan event */
  timestamp: number;
  /** Additional metadata (NDEF records, barcode format, etc.) */
  metadata?: Record<string, unknown>;
}

// === 后端插件元数据 ===

/** Server plugin info — lightweight metadata synced from /api/v1/plugins */
export interface ServerPluginInfo {
  /** Plugin ID, e.g. 'builtin.item-types.rechargeable_battery' */
  id: string;
  /** Human-readable plugin name */
  name: string;
  /** Plugin version */
  version: string;
  /** Plugin status: active or inactive */
  status: 'active' | 'inactive' | 'error';
  /** Extension points this plugin registers to */
  extensionPoints: string[];
  /** Plugin exports data (ItemTypePluginExports, etc.) — may not be present in list API */
  exports?: Record<string, unknown>;
  /** Error message if status is 'error' */
  error?: string;
}

// === ItemType 前端配置 (从后端 ItemTypePluginExports.config 提取) ===

/** ItemType configuration relevant to frontend rendering */
export interface ItemTypeFrontendConfig {
  /** Human-readable name for this item type */
  name?: string;
  /** Whether this item type has a state machine */
  hasStateMachine: boolean;
  /** State machine definition (if hasStateMachine is true) */
  stateMachine?: StateMachineFrontendDef;
  /** Name of the Vue component to render for this type */
  renderComponent?: string;
  /** Feature flags for this item type */
  features: string[];
  /** Default unit for quantities */
  defaultUnit?: string;
  /** Custom fields definition */
  fields: FieldFrontendDef[];
}

export interface StateMachineFrontendDef {
  /** All possible states */
  states: string[];
  /** Transition definitions */
  transitions: StateTransitionDef[];
}

export interface StateTransitionDef {
  /** Source state */
  from: string;
  /** Action trigger name */
  action: string;
  /** Human-readable label for the transition button */
  label: string;
  /** Target state after transition */
  to: string;
  /** Whether this transition increments the cycle count */
  incrementCycle?: boolean;
}

export interface FieldFrontendDef {
  /** Field key */
  key: string;
  /** Human-readable label */
  label: string;
  /** Field type */
  type: 'string' | 'number' | 'date' | 'select' | 'boolean' | 'image';
  /** Whether the field is required */
  required?: boolean;
  /** Default value */
  defaultValue?: unknown;
  /** Options for select fields */
  options?: { label: string; value: string }[];
}
