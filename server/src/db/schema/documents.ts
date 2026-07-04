import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { families } from './users';
import { items } from './stock';

export const documents = sqliteTable('documents', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  familyId: integer('family_id').notNull().references(() => families.id),
  itemId: integer('item_id').references(() => items.id, { onDelete: 'set null' }),
  name: text('name').notNull(),
  filePath: text('file_path').notNull(),
  mimeType: text('mime_type').notNull(),
  fileSize: integer('file_size').notNull(),
  category: text('category', {
    enum: ['warranty', 'manual', 'invoice', 'receipt', 'other'],
  }).notNull().default('other'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});
