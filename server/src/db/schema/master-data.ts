// ═══════════════════════════════════════════════════════
// 主数据 — 位置、分类、标签、单位、品牌、商店
// ═══════════════════════════════════════════════════════

import { sqliteTable, text, integer, real, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { families } from './auth';

// ── 位置 ──
export const mdLocations = sqliteTable('md_locations', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  familyId: integer('family_id').notNull().references(() => families.id),
  name: text('name').notNull(),
  parentId: integer('parent_id'),
  level: integer('level').notNull().default(1),
  type: text('type').default('normal'),
  image: text('image'),
  notes: text('notes'),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
}, (table) => ({
  familyNameUnique: uniqueIndex('md_locations_family_name_unique').on(table.familyId, table.name),
}));

// ── 分类 ──
export const mdCategories = sqliteTable('md_categories', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  familyId: integer('family_id').notNull().references(() => families.id),
  name: text('name').notNull(),
  icon: text('icon'),
  notes: text('notes'),
  parentId: integer('parent_id'),
  sortOrder: integer('sort_order').notNull().default(0),
}, (table) => ({
  familyNameUnique: uniqueIndex('md_categories_family_name_unique').on(table.familyId, table.name),
}));

// ── 标签 ──
export const mdTags = sqliteTable('md_tags', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  familyId: integer('family_id').notNull().references(() => families.id),
  name: text('name').notNull(),
  icon: text('icon'),
  color: text('color').default('#409EFF'),
  notes: text('notes'),
  sortOrder: integer('sort_order').notNull().default(0),
}, (table) => ({
  familyNameUnique: uniqueIndex('md_tags_family_name_unique').on(table.familyId, table.name),
}));

// ── 物品标签关联 ──
export const mdItemTags = sqliteTable('md_item_tags', {
  itemId: integer('item_id').notNull(),
  tagId: integer('tag_id').notNull().references(() => mdTags.id, { onDelete: 'cascade' }),
}, (table) => ({
  itemTagUnique: uniqueIndex('md_item_tags_item_tag_unique').on(table.itemId, table.tagId),
}));

// ── 计量单位 ──
export const mdUnits = sqliteTable('md_units', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  familyId: integer('family_id').notNull().references(() => families.id),
  name: text('name').notNull(),
  parentId: integer('parent_id'),
  conversionFactor: real('conversion_factor').notNull().default(1),
  notes: text('notes'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
}, (table) => ({
  familyNameUnique: uniqueIndex('md_units_family_name_unique').on(table.familyId, table.name),
}));

// ── 品牌 ──
export const mdBrands = sqliteTable('md_brands', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  familyId: integer('family_id').notNull().references(() => families.id),
  name: text('name').notNull(),
  notes: text('notes'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
}, (table) => ({
  familyNameUnique: uniqueIndex('md_brands_family_name_unique').on(table.familyId, table.name),
}));

// ── 商店 ──
export const mdShops = sqliteTable('md_shops', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  familyId: integer('family_id').notNull().references(() => families.id),
  name: text('name').notNull(),
  icon: text('icon'),
  address: text('address'),
  area: text('area'),
  notes: text('notes'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
}, (table) => ({
  familyNameUnique: uniqueIndex('md_shops_family_name_unique').on(table.familyId, table.name),
}));