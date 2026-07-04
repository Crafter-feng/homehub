import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { families } from './users';
import { users } from './users';
import { recipes } from './recipes';

export const mealPlans = sqliteTable('meal_plans', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  familyId: integer('family_id').notNull().references(() => families.id),
  weekStart: integer('week_start', { mode: 'timestamp' }).notNull(),
  weekEnd: integer('week_end', { mode: 'timestamp' }).notNull(),
  createdBy: integer('created_by').references(() => users.id),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

export const mealPlanItems = sqliteTable('meal_plan_items', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  planId: integer('plan_id').notNull().references(() => mealPlans.id, { onDelete: 'cascade' }),
  dayOfWeek: integer('day_of_week').notNull(), // 0=Monday ... 6=Sunday
  mealType: text('meal_type', { enum: ['breakfast', 'lunch', 'dinner', 'snack'] }).notNull(),
  recipeId: integer('recipe_id').notNull().references(() => recipes.id),
  note: text('note'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});