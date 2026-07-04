// ═══════════════════════════════════════════════════════
// 系统 — 扫码/触发器、通知、插件数据、自定义字段
// ═══════════════════════════════════════════════════════

import { sqliteTable, text, integer, real, unique, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { families, users } from './auth';
import { mdLocations } from './master-data';

// ── 扫码绑定 ──
export const sysTriggerBindings = sqliteTable('sys_trigger_bindings', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  familyId: integer('family_id').notNull().references(() => families.id),
  code: text('code').notNull(),
  codeType: text('code_type', { enum: ['nfc', 'qr', 'barcode', 'rfid'] }).notNull(),
  targetType: text('target_type', { enum: ['item', 'location', 'recipe', 'action'] }).notNull(),
  targetId: integer('target_id').notNull(),
  actionOverride: text('action_override'),
  label: text('label'),
  notes: text('notes'),
  lastReadAt: integer('last_read_at', { mode: 'timestamp' }),
  readCount: integer('read_count').notNull().default(0),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

// ── NFC 标签状态 ──
export const sysNfcTagState = sqliteTable('sys_nfc_tag_state', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  familyId: integer('family_id').notNull().references(() => families.id),
  tagUid: text('tag_uid').notNull().unique(),
  ndefWritten: integer('ndef_written', { mode: 'boolean' }).notNull().default(false),
  ndefWrittenAt: integer('ndef_written_at', { mode: 'timestamp' }),
  lastReadAt: integer('last_read_at', { mode: 'timestamp' }),
  readCount: integer('read_count').notNull().default(0),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

// ── RFID 读取器 ──
export const sysRfidReaders = sqliteTable('sys_rfid_readers', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  familyId: integer('family_id').notNull().references(() => families.id),
  name: text('name').notNull(),
  locationId: integer('location_id').references(() => mdLocations.id),
  readerType: text('reader_type', { enum: ['hf', 'uhf'] }).notNull().default('hf'),
  deviceId: text('device_id').notNull().unique(),
  config: text('config', { mode: 'json' }).$type<{ mqttTopic: string; power: number }>(),
  hardwareDeviceId: integer('hardware_device_id'),
  lastOnlineAt: integer('last_online_at', { mode: 'timestamp' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

// ── RFID 区域 ──
export const sysRfidZones = sqliteTable('sys_rfid_zones', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  readerId: integer('reader_id').notNull().references(() => sysRfidReaders.id),
  tagPattern: text('tag_pattern'),
  locationId: integer('location_id').references(() => mdLocations.id),
  notes: text('notes'),
});

// ── 自动化触发器 ──
export const sysAutomationTriggers = sqliteTable('sys_automation_triggers', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  familyId: integer('family_id').notNull().references(() => families.id),
  name: text('name').notNull(),
  notes: text('notes'),
  triggerType: text('trigger_type', {
    enum: ['nfc_tap', 'qr_scan', 'barcode_scan', 'rfid_enter', 'rfid_exit', 'scheduled', 'custom'],
  }).notNull(),
  triggerConfig: text('trigger_config', { mode: 'json' }),
  actionType: text('action_type', {
    enum: ['open_page', 'run_notification', 'call_mcp_tool', 'run_workflow'],
  }).notNull(),
  actionConfig: text('action_config', { mode: 'json' }),
  enabled: integer('enabled', { mode: 'boolean' }).notNull().default(true),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

// ── 编码任务 ──
export const sysEncoderJobs = sqliteTable('sys_encoder_jobs', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  familyId: integer('family_id').notNull().references(() => families.id),
  outputType: text('output_type', { enum: ['qr', 'nfc_ndef', 'barcode'] }).notNull(),
  targetType: text('target_type', { enum: ['item', 'location', 'multi'] }).notNull(),
  targetIds: text('target_ids', { mode: 'json' }).$type<number[]>(),
  generatedAt: integer('generated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

// ── 通知规则 ──
export const sysNotificationRules = sqliteTable('sys_notification_rules', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  familyId: integer('family_id').notNull().references(() => families.id),
  name: text('name').notNull(),
  notes: text('notes'),
  triggerType: text('trigger_type', {
    enum: ['expiry', 'low_stock', 'chore_due', 'custom'],
  }).notNull(),
  config: text('config', { mode: 'json' }).$type<{
    daysBeforeExpiry?: number;
    minStockLevel?: number;
    choreId?: number;
    customCondition?: string;
  }>(),
  channel: text('channel', { enum: ['in_app', 'email', 'webhook'] }).notNull().default('in_app'),
  channelConfig: text('channel_config', { mode: 'json' }).$type<{
    email?: string;
    webhookUrl?: string;
  }>(),
  enabled: integer('enabled', { mode: 'boolean' }).notNull().default(true),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

// ── 通知消息 ──
export const sysNotifications = sqliteTable('sys_notifications', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  familyId: integer('family_id').notNull().references(() => families.id),
  userId: integer('user_id').references(() => users.id),
  title: text('title').notNull(),
  message: text('message').notNull(),
  type: text('type', {
    enum: ['expiry', 'low_stock', 'chore_due', 'system', 'custom'],
  }).notNull(),
  isRead: integer('is_read', { mode: 'boolean' }).notNull().default(false),
  relatedType: text('related_type'),
  relatedId: integer('related_id'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

// ── 插件数据 ──
export const sysPluginData = sqliteTable('sys_plugin_data', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  pluginId: text('plugin_id').notNull(),
  key: text('key').notNull(),
  value: text('value', { mode: 'json' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
}, (table) => ({
  pluginKeyUnique: unique().on(table.pluginId, table.key),
}));

// ── 自定义字段定义 ──
export const sysCustomFields = sqliteTable('sys_custom_fields', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  familyId: integer('family_id').notNull().references(() => families.id),
  entityType: text('entity_type').notNull(),
  fieldName: text('field_name').notNull(),
  fieldLabel: text('field_label').notNull(),
  fieldType: text('field_type', {
    enum: ['text', 'number', 'boolean', 'date', 'select', 'multiselect'],
  }).notNull(),
  fieldConfig: text('field_config', { mode: 'json' }).$type<{
    options?: { label: string; value: string }[];
    min?: number;
    max?: number;
    pattern?: string;
    placeholder?: string;
    defaultValue?: any;
  }>(),
  isRequired: integer('is_required', { mode: 'boolean' }).default(false),
  sortOrder: integer('sort_order').default(0),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
}, (table) => ({
  familyEntityUnique: uniqueIndex('sys_custom_fields_family_entity_unique')
    .on(table.familyId, table.entityType, table.fieldName),
}));

// ── 自定义字段值 ──
export const sysCustomValues = sqliteTable('sys_custom_values', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  entityType: text('entity_type').notNull(),
  entityId: integer('entity_id').notNull(),
  fieldId: integer('field_id').notNull().references(() => sysCustomFields.id, { onDelete: 'cascade' }),
  value: text('value'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
}, (table) => ({
  entityFieldUnique: uniqueIndex('sys_custom_values_entity_field_unique')
    .on(table.entityType, table.entityId, table.fieldId),
}));