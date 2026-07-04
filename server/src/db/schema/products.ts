import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';
import { families } from './users';
import { categories } from './locations';

export const products = sqliteTable('products', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  familyId: integer('family_id').notNull().references(() => families.id),
  name: text('name').notNull(),
  barcode: text('barcode'),
  categoryId: integer('category_id').references(() => categories.id),
  unit: text('unit').notNull().default('个'),
  brand: text('brand'),
  image: text('image'),
  defaultPrice: real('default_price'),
  notes: text('notes'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});