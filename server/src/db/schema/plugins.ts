import { sqliteTable, text, integer, unique } from 'drizzle-orm/sqlite-core';

/**
 * Plugin data table — persistent storage for plugin key-value pairs.
 * Each plugin can store arbitrary JSON data keyed by string keys.
 * Data is isolated by pluginId via unique constraint on (pluginId, key).
 */
export const pluginData = sqliteTable('plugin_data', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  pluginId: text('plugin_id').notNull(),
  key: text('key').notNull(),
  value: text('value', { mode: 'json' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
}, (table) => ({
  /** Ensures each plugin can only have one entry per key. */
  pluginKeyUnique: unique().on(table.pluginId, table.key),
}));
