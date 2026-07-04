import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';
import { families } from './users';
import { locations } from './locations';
import { categories } from './locations';
import { products } from './products';

export const items = sqliteTable('items', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  familyId: integer('family_id').notNull().references(() => families.id),
  productId: integer('product_id').references(() => products.id),
  name: text('name').notNull(),
  type: text('type').notNull().default('generic'),
  barcode: text('barcode'),
  categoryId: integer('category_id').references(() => categories.id),
  locationId: integer('location_id').references(() => locations.id),
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

export const itemBatches = sqliteTable('item_batches', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  itemId: integer('item_id').notNull().references(() => items.id, { onDelete: 'cascade' }),
  batchNumber: text('batch_number'),
  quantity: real('quantity').notNull(),
  unit: text('unit').notNull(),
  purchaseDate: integer('purchase_date', { mode: 'timestamp' }),
  expiryDate: integer('expiry_date', { mode: 'timestamp' }),
  locationId: integer('location_id').references(() => locations.id),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

export const stockTransactions = sqliteTable('stock_transactions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  itemId: integer('item_id').notNull().references(() => items.id),
  batchId: integer('batch_id').references(() => itemBatches.id),
  type: text('type', { enum: ['add', 'consume', 'transfer', 'adjust'] }).notNull(),
  quantity: real('quantity').notNull(),
  unit: text('unit').notNull(),
  fromLocationId: integer('from_location_id').references(() => locations.id),
  toLocationId: integer('to_location_id').references(() => locations.id),
  userId: integer('user_id').notNull(),
  source: text('source', {
    enum: ['manual', 'barcode', 'nfc', 'rfid', 'voice', 'vision', 'mcp'],
  }).notNull().default('manual'),
  note: text('note'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});
