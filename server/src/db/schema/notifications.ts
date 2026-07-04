import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { families } from './users';
import { users } from './users';

export const notificationRules = sqliteTable('notification_rules', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  familyId: integer('family_id').notNull().references(() => families.id),
  name: text('name').notNull(),
  notes: text('notes'),
  triggerType: text('trigger_type', {
    enum: ['expiry', 'low_stock', 'chore_due', 'custom'],
  }).notNull(),
  config: text('config', { mode: 'json' }).$type<{
    daysBeforeExpiry?: number;
    minStockLevel?: number;
    choreId?: number;
    customCondition?: string;
  }>(),
  channel: text('channel', { enum: ['in_app', 'email', 'webhook'] }).notNull().default('in_app'),
  channelConfig: text('channel_config', { mode: 'json' }).$type<{
    email?: string;
    webhookUrl?: string;
  }>(),
  enabled: integer('enabled', { mode: 'boolean' }).notNull().default(true),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

export const notifications = sqliteTable('notifications', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  familyId: integer('family_id').notNull().references(() => families.id),
  userId: integer('user_id').references(() => users.id),
  title: text('title').notNull(),
  message: text('message').notNull(),
  type: text('type', {
    enum: ['expiry', 'low_stock', 'chore_due', 'system', 'custom'],
  }).notNull(),
  isRead: integer('is_read', { mode: 'boolean' }).notNull().default(false),
  relatedType: text('related_type'),
  relatedId: integer('related_id'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});
