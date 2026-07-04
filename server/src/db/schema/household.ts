// ═══════════════════════════════════════════════════════
// 家庭生活 — 列表/待办、食谱、餐计划、日历、预算
// ═══════════════════════════════════════════════════════

import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';
import { families, users } from './auth';
import { invItems } from './inventory';

// ── 列表 ──
export const hhLists = sqliteTable('hh_lists', {
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

// ── 列表条目 ──
export const hhListItems = sqliteTable('hh_list_items', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  listId: integer('list_id').notNull().references(() => hhLists.id, { onDelete: 'cascade' }),
  content: text('content').notNull(),
  notes: text('notes'),
  status: text('status', { enum: ['pending', 'completed', 'cancelled'] }).notNull().default('pending'),
  completedBy: integer('completed_by').references(() => users.id),
  completedAt: integer('completed_at', { mode: 'timestamp' }),
  assigneeId: integer('assignee_id').references(() => users.id),
  quantity: real('quantity'),
  unit: text('unit'),
  linkedItemId: integer('linked_item_id').references(() => invItems.id),
  linkedRecipeId: integer('linked_recipe_id'),
  dueAt: integer('due_at', { mode: 'timestamp' }),
  lastResetAt: integer('last_reset_at', { mode: 'timestamp' }),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

// ── 列表条目评论 ──
export const hhListItemComments = sqliteTable('hh_list_item_comments', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  listItemId: integer('list_item_id').notNull().references(() => hhListItems.id, { onDelete: 'cascade' }),
  userId: integer('user_id').notNull().references(() => users.id),
  content: text('content').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

// ── 节假日模板 ──
export const hhHolidayTemplates = sqliteTable('hh_holiday_templates', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  type: text('type', {
    enum: ['spring_festival', 'mid_autumn', 'dragon_boat', 'custom'],
  }).notNull(),
  invItems: text('invItems', { mode: 'json' }).$type<Array<{
    name: string; quantity: number; unit: string; note?: string
  }>>(),
  isPreset: integer('is_preset', { mode: 'boolean' }).notNull().default(false),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

// ── 食谱 ──
export const hhRecipes = sqliteTable('hh_recipes', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  familyId: integer('family_id').notNull().references(() => families.id),
  name: text('name').notNull(),
  description: text('description'),
  notes: text('notes'),
  ingredients: text('ingredients', { mode: 'json' }).$type<Array<{
    itemName: string; quantity: number; unit: string; optional?: boolean
  }>>().notNull(),
  steps: text('steps', { mode: 'json' }).$type<Array<{
    stepNumber: number; instruction: string; duration?: string
  }>>().notNull(),
  prepTime: integer('prep_time'),
  cookTime: integer('cook_time'),
  servings: integer('servings'),
  image: text('image'),
  source: text('source'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

// ── 餐计划 ──
export const hhMealPlans = sqliteTable('hh_meal_plans', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  familyId: integer('family_id').notNull().references(() => families.id),
  weekStart: integer('week_start', { mode: 'timestamp' }).notNull(),
  weekEnd: integer('week_end', { mode: 'timestamp' }).notNull(),
  createdBy: integer('created_by').references(() => users.id),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

// ── 餐计划条目 ──
export const hhMealPlanItems = sqliteTable('hh_meal_plan_items', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  planId: integer('plan_id').notNull().references(() => hhMealPlans.id, { onDelete: 'cascade' }),
  dayOfWeek: integer('day_of_week').notNull(), // 0=Monday ... 6=Sunday
  mealType: text('meal_type', { enum: ['breakfast', 'lunch', 'dinner', 'snack'] }).notNull(),
  recipeId: integer('recipe_id').notNull().references(() => hhRecipes.id),
  note: text('note'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

// ── 日历事件 ──
export const hhCalendarEvents = sqliteTable('hh_calendar_events', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  familyId: integer('family_id').notNull().references(() => families.id),
  title: text('title').notNull(),
  description: text('description'),
  date: text('date').notNull(),
  endDate: text('end_date'),
  allDay: integer('all_day', { mode: 'boolean' }).notNull().default(true),
  category: text('category', { enum: ['reminder', 'birthday', 'appointment', 'chore', 'custom'] }).notNull().default('custom'),
  color: text('color'),
  recurrence: text('recurrence', { enum: ['none', 'daily', 'weekly', 'monthly', 'yearly'] }).notNull().default('none'),
  reminderMinutes: integer('reminder_minutes'),
  relatedType: text('related_type'),
  relatedId: integer('related_id'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

// ── 预算记录 ──
export const hhBudgetEntries = sqliteTable('hh_budget_entries', {
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
  mdTags: text('mdTags', { mode: 'json' }),
  relatedItemId: integer('related_item_id'),
  notes: text('notes'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

// ── 预算分类 ──
export const hhBudgetCategories = sqliteTable('hh_budget_categories', {
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

// ── 订阅服务 ──
export const hhBudgetSubscriptions = sqliteTable('hh_budget_subscriptions', {
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