// ═══════════════════════════════════════════════════════
// 库存 — 产品、批次、流水、文档
// ═══════════════════════════════════════════════════════

import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';
import { families } from './auth';
import { mdLocations } from './master-data';
import { mdCategories } from './master-data';

// ── 产品（具体 SKU） ──
export const invProducts = sqliteTable('inv_products', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  familyId: integer('family_id').notNull().references(() => families.id),
  name: text('name').notNull(),
  barcode: text('barcode'),
  categoryId: integer('category_id').references(() => mdCategories.id),
  unit: text('unit').notNull().default('个'),
  brand: text('brand'),
  image: text('image'),
  // 库存属性
  locationId: integer('location_id').references(() => mdLocations.id),
  minStock: real('min_stock').default(0),
  shop: text('shop'),
  // 价格/保质期
  defaultPrice: real('default_price'),
  defaultBestBeforeDays: integer('default_best_before_days'),
  defaultBestBeforeDaysAfterOpen: integer('default_best_before_days_after_open'),
  moveOnOpenLocationId: integer('move_on_open_location_id'),
  // 多单位
  purchaseUnit: text('purchase_unit'),
  stockUnit: text('stock_unit'),
  consumeUnit: text('consume_unit'),
  priceUnit: text('price_unit'),
  purchaseToStockFactor: real('purchase_to_stock_factor').default(1),
  stockToConsumeFactor: real('stock_to_consume_factor').default(1),
  // 其他
  parentId: integer('parent_id'),
  caloriesPerUnit: real('calories_per_unit'),
  tareWeight: real('tare_weight'),
  spec: text('spec'),
  notes: text('notes'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

// ── 批次（每次入库记录） ──
export const invBatches = sqliteTable('inv_batches', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  productId: integer('product_id').notNull().references(() => invProducts.id, { onDelete: 'cascade' }),
  batchNumber: text('batch_number'),
  quantity: real('quantity').notNull(),
  unit: text('unit').notNull(),
  purchaseDate: integer('purchase_date', { mode: 'timestamp' }),
  expiryDate: integer('expiry_date', { mode: 'timestamp' }),
  locationId: integer('location_id').references(() => mdLocations.id),
  shop: text('shop'),
  price: real('price'),
  open: integer('open').default(0),
  openedDate: integer('opened_date', { mode: 'timestamp' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

// ── 库存流水 ──
export const invStockLog = sqliteTable('inv_stock_log', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  productId: integer('product_id').notNull().references(() => invProducts.id),
  batchId: integer('batch_id').references(() => invBatches.id),
  recipeId: integer('recipe_id'),
  type: text('type', { enum: ['purchase', 'consume', 'transfer', 'adjust', 'open', 'close'] }).notNull(),
  quantity: real('quantity').notNull(),
  unit: text('unit').notNull(),
  spoiled: real('spoiled').default(0),
  fromLocationId: integer('from_location_id').references(() => mdLocations.id),
  toLocationId: integer('to_location_id').references(() => mdLocations.id),
  userId: integer('user_id').notNull(),
  source: text('source', {
    enum: ['manual', 'barcode', 'nfc', 'rfid', 'voice', 'vision', 'mcp'],
  }).notNull().default('manual'),
  note: text('note'),
  price: real('price'),
  shop: text('shop'),
  spec: text('spec'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

// ── 产品条码（多对一） ──
export const invProductBarcodes = sqliteTable('inv_product_barcodes', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  productId: integer('product_id').notNull().references(() => invProducts.id, { onDelete: 'cascade' }),
  barcode: text('barcode').notNull(),
  isPrimary: integer('is_primary').default(0),
  notes: text('notes'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

// ── 产品文档 ──
export const invDocuments = sqliteTable('inv_documents', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  familyId: integer('family_id').notNull().references(() => families.id),
  productId: integer('product_id').references(() => invProducts.id, { onDelete: 'set null' }),
  name: text('name').notNull(),
  filePath: text('file_path').notNull(),
  mimeType: text('mime_type').notNull(),
  fileSize: integer('file_size').notNull(),
  category: text('category', {
    enum: ['warranty', 'manual', 'invoice', 'receipt', 'other'],
  }).notNull().default('other'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});
