import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { families } from './users';
import { locations } from './locations';

export const triggerBindings = sqliteTable('trigger_bindings', {
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

export const nfcTagState = sqliteTable('nfc_tag_state', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  familyId: integer('family_id').notNull().references(() => families.id),
  tagUid: text('tag_uid').notNull().unique(),
  ndefWritten: integer('ndef_written', { mode: 'boolean' }).notNull().default(false),
  ndefWrittenAt: integer('ndef_written_at', { mode: 'timestamp' }),
  lastReadAt: integer('last_read_at', { mode: 'timestamp' }),
  readCount: integer('read_count').notNull().default(0),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

export const rfidReaders = sqliteTable('rfid_readers', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  familyId: integer('family_id').notNull().references(() => families.id),
  name: text('name').notNull(),
  locationId: integer('location_id').references(() => locations.id),
  readerType: text('reader_type', { enum: ['hf', 'uhf'] }).notNull().default('hf'),
  deviceId: text('device_id').notNull().unique(),
  config: text('config', { mode: 'json' }).$type<{ mqttTopic: string; power: number }>(),
  hardwareDeviceId: integer('hardware_device_id'),  // FK to hardware device registry (nullable)
  lastOnlineAt: integer('last_online_at', { mode: 'timestamp' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

export const rfidZones = sqliteTable('rfid_zones', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  readerId: integer('reader_id').notNull().references(() => rfidReaders.id),
  tagPattern: text('tag_pattern'),
  locationId: integer('location_id').references(() => locations.id),
  notes: text('notes'),
});

export const automationTriggers = sqliteTable('automation_triggers', {
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

export const scanLogs = sqliteTable('scan_logs', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  familyId: integer('family_id').notNull().references(() => families.id),
  userId: integer('user_id'),
  scanType: text('scan_type', { enum: ['nfc', 'qr', 'barcode', 'rfid'] }).notNull(),
  code: text('code').notNull(),
  action: text('action').notNull(),
  context: text('context', { mode: 'json' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

export const encoderJobs = sqliteTable('encoder_jobs', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  familyId: integer('family_id').notNull().references(() => families.id),
  outputType: text('output_type', { enum: ['qr', 'nfc_ndef', 'barcode'] }).notNull(),
  targetType: text('target_type', { enum: ['item', 'location', 'multi'] }).notNull(),
  targetIds: text('target_ids', { mode: 'json' }).$type<number[]>(),
  generatedAt: integer('generated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});
