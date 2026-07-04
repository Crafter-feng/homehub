import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';
import { families } from './users';

export const units = sqliteTable('units', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  familyId: integer('family_id').notNull().references(() => families.id),
  name: text('name').notNull(),
  parentId: integer('parent_id'),
  conversionFactor: real('conversion_factor').notNull().default(1),
  notes: text('notes'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});
