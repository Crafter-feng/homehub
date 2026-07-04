import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { families } from './users';

export const recipes = sqliteTable('recipes', {
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
