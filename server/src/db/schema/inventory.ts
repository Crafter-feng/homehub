// ═══════════════════════════════════════════════════════
// 库存 — 产品、库存条目、批次、流水、文档
// ═══════════════════════════════════════════════════════

import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';
import { families } from './auth';
import { mdLocations } from './master-data';
import { mdCategories } from './master-data';

// ── 产品（主数据） ──
export const invProducts = sqliteTable('inv_products', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  familyId: integer('family_id').notNull().references(() => families.id),
  name: text('name').notNull(),
  barcode: text('barcode'),
  categoryId: integer('category_id').references(() => mdCategories.id),
  unit: text('unit').notNull().default('个'),
  brand: text('brand'),
  image: text('image'),
  defaultPrice: real('default_price'),
  notes: text('notes'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

// ── 库存条目 ──
export const invItems = sqliteTable('inv_items', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  familyId: integer('family_id').notNull().references(() => families.id),
  productId: integer('product_id').references(() => invProducts.id),
  name: text('name').notNull(),
  type: text('type').notNull().default('generic'),
  barcode: text('barcode'),
  categoryId: integer('category_id').references(() => mdCategories.id),
  locationId: integer('location_id').references(() => mdLocations.id),
  quantity: real('quantity').notNull().default(1),
  unit: text('unit').notNull().default('个'),
  minStock: real('min_stock').default(0),
  brand: text('brand'),
  shop: text('shop'),
  notes: text('notes'),
  image: text('image'),
  customFields: text('custom_fields', { mode: 'json' }),
  currentState: text('current_state'),
  stateChangedAt: integer('state_changed_at', { mode: 'timestamp' }),
  cycleCount: integer('cycle_count').default(0),
  purchasePrice: real('purchase_price'),
  currency: text('currency').default('CNY'),
  lastPrice: real('last_price'),
  avgPrice: real('avg_price'),
  minPrice: real('min_price'),
  maxPrice: real('max_price'),
  purchaseDate: integer('purchase_date', { mode: 'timestamp' }),
  expiryDate: integer('expiry_date', { mode: 'timestamp' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

// ── 物品批次 ──
export const invItemBatches = sqliteTable('inv_item_batches', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  itemId: integer('item_id').notNull().references(() => invItems.id, { onDelete: 'cascade' }),
  batchNumber: text('batch_number'),
  quantity: real('quantity').notNull(),
  unit: text('unit').notNull(),
  purchaseDate: integer('purchase_date', { mode: 'timestamp' }),
  expiryDate: integer('expiry_date', { mode: 'timestamp' }),
  locationId: integer('location_id').references(() => mdLocations.id),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

// ── 库存流水 ──
export const invStockTransactions = sqliteTable('inv_stock_transactions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  itemId: integer('item_id').notNull().references(() => invItems.id),
  batchId: integer('batch_id').references(() => invItemBatches.id),
  type: text('type', { enum: ['add', 'consume', 'transfer', 'adjust'] }).notNull(),
  quantity: real('quantity').notNull(),
  unit: text('unit').notNull(),
  fromLocationId: integer('from_location_id').references(() => mdLocations.id),
  toLocationId: integer('to_location_id').references(() => mdLocations.id),
  userId: integer('user_id').notNull(),
  source: text('source', {
    enum: ['manual', 'barcode', 'nfc', 'rfid', 'voice', 'vision', 'mcp'],
  }).notNull().default('manual'),
  note: text('note'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

// ── 物品文档 ──
export const invDocuments = sqliteTable('inv_documents', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  familyId: integer('family_id').notNull().references(() => families.id),
  itemId: integer('item_id').references(() => invItems.id, { onDelete: 'set null' }),
  name: text('name').notNull(),
  filePath: text('file_path').notNull(),
  mimeType: text('mime_type').notNull(),
  fileSize: integer('file_size').notNull(),
  category: text('category', {
    enum: ['warranty', 'manual', 'invoice', 'receipt', 'other'],
  }).notNull().default('other'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});