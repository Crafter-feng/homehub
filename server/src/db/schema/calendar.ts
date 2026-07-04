import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { families } from './users';

export const calendarEvents = sqliteTable('calendar_events', {
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
