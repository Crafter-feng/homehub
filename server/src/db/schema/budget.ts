import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';
import { families } from './users';

export const budgetEntries = sqliteTable('budget_entries', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  familyId: integer('family_id').notNull().references(() => families.id),
  type: text('type', { enum: ['income', 'expense'] }).notNull(),
  amount: real('amount').notNull(),
  currency: text('currency').notNull().default('CNY'),
  category: text('category').notNull(),
  description: text('description'),
  date: integer('date', { mode: 'timestamp' }).notNull(),
  isRecurring: integer('is_recurring', { mode: 'boolean' }).notNull().default(false),
  recurringConfig: text('recurring_config', { mode: 'json' }),
  tags: text('tags', { mode: 'json' }),
  relatedItemId: integer('related_item_id'),
  notes: text('notes'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

export const budgetCategories = sqliteTable('budget_categories', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  familyId: integer('family_id').notNull().references(() => families.id),
  name: text('name').notNull(),
  type: text('type', { enum: ['income', 'expense'] }).notNull(),
  icon: text('icon'),
  color: text('color'),
  parentId: integer('parent_id'),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

export const budgetSubscriptions = sqliteTable('budget_subscriptions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  familyId: integer('family_id').notNull().references(() => families.id),
  name: text('name').notNull(),
  amount: real('amount').notNull(),
  currency: text('currency').notNull().default('CNY'),
  category: text('category').notNull(),
  billingCycle: text('billing_cycle', { enum: ['monthly', 'yearly', 'weekly', 'quarterly'] }).notNull(),
  nextBillingDate: integer('next_billing_date', { mode: 'timestamp' }).notNull(),
  startDate: integer('start_date', { mode: 'timestamp' }).notNull(),
  endDate: integer('end_date', { mode: 'timestamp' }),
  notes: text('notes'),
  isEnabled: integer('is_enabled', { mode: 'boolean' }).notNull().default(true),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});
