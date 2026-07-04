import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { families } from './users';

export const locations = sqliteTable('locations', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  familyId: integer('family_id').notNull().references(() => families.id),
  name: text('name').notNull(),
  parentId: integer('parent_id'),
  level: integer('level').notNull().default(1),
  image: text('image'),
  notes: text('notes'),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

export const categories = sqliteTable('categories', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  familyId: integer('family_id').notNull().references(() => families.id),
  name: text('name').notNull(),
  icon: text('icon'),
  notes: text('notes'),
  parentId: integer('parent_id'),
  sortOrder: integer('sort_order').notNull().default(0),
});

export const tags = sqliteTable('tags', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  familyId: integer('family_id').notNull().references(() => families.id),
  name: text('name').notNull(),
  icon: text('icon'),
  color: text('color').default('#409EFF'),
  notes: text('notes'),
  sortOrder: integer('sort_order').notNull().default(0),
});

export const itemTags = sqliteTable('item_tags', {
  itemId: integer('item_id').notNull(),
  tagId: integer('tag_id').notNull().references(() => tags.id, { onDelete: 'cascade' }),
});
