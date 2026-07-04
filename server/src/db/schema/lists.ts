import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';
import { families } from './users';
import { users } from './users';
import { items } from './stock';
import { recipes } from './recipes';

export const lists = sqliteTable('lists', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  familyId: integer('family_id').notNull().references(() => families.id),
  name: text('name').notNull(),
  type: text('type', {
    enum: ['shopping', 'todo', 'chore', 'holiday', 'meal_plan'],
  }).notNull().default('shopping'),
  notes: text('notes'),
  config: text('config', { mode: 'json' }).$type<{
    autoReset?: string;
    autoResetDays?: number;
    template?: string;
    autoPurchase?: boolean;
    autoConsume?: boolean;
  }>(),
  createdBy: integer('created_by').references(() => users.id),
  isArchived: integer('is_archived', { mode: 'boolean' }).notNull().default(false),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

export const listItems = sqliteTable('list_items', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  listId: integer('list_id').notNull().references(() => lists.id, { onDelete: 'cascade' }),
  content: text('content').notNull(),
  notes: text('notes'),
  status: text('status', { enum: ['pending', 'completed', 'cancelled'] }).notNull().default('pending'),
  completedBy: integer('completed_by').references(() => users.id),
  completedAt: integer('completed_at', { mode: 'timestamp' }),
  assigneeId: integer('assignee_id').references(() => users.id),
  quantity: real('quantity'),
  unit: text('unit'),
  linkedItemId: integer('linked_item_id').references(() => items.id),
  linkedRecipeId: integer('linked_recipe_id').references(() => recipes.id),
  dueAt: integer('due_at', { mode: 'timestamp' }),
  lastResetAt: integer('last_reset_at', { mode: 'timestamp' }),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

export const listItemComments = sqliteTable('list_item_comments', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  listItemId: integer('list_item_id').notNull().references(() => listItems.id, { onDelete: 'cascade' }),
  userId: integer('user_id').notNull().references(() => users.id),
  content: text('content').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

export const holidayTemplates = sqliteTable('holiday_templates', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  type: text('type', {
    enum: ['spring_festival', 'mid_autumn', 'dragon_boat', 'custom'],
  }).notNull(),
  items: text('items', { mode: 'json' }).$type<Array<{
    name: string; quantity: number; unit: string; note?: string
  }>>(),
  isPreset: integer('is_preset', { mode: 'boolean' }).notNull().default(false),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});
