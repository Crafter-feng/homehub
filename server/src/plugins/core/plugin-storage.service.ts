import { Injectable, Inject } from '@nestjs/common';
import { eq, and } from 'drizzle-orm';
import { DATABASE_TOKEN } from '../../db/database.module';
import { sysPluginData } from '../../db/schema';
import { PluginStorage } from '../types/plugin.types';

/**
 * DB-backed persistent storage service for plugins.
 *
 * Replaces the previous in-memory Map storage with a Drizzle ORM
 * plugin_data table. Each plugin's data is isolated by pluginId prefix.
 * Supports get/set/delete/clear/listKeys operations and scoped instances
 * via forPlugin().
 *
 * Note: db instance typed as `any` to avoid Drizzle ORM union-type method call
 * incompatibility (BetterSQLite3Database | NodePgDatabase). At runtime,
 * only one driver is active and all method calls work correctly.
 */
@Injectable()
export class PluginStorageService {
  constructor(
    @Inject(DATABASE_TOKEN) private readonly db: any,
  ) {}

  /**
   * Retrieve a value stored by a plugin.
   *
   * @param pluginId - The plugin identifier
   * @param key - The storage key
   * @returns The stored value (auto-deserialized from JSON), or null if not found
   */
  async get(pluginId: string, key: string): Promise<any> {
    const rows = await this.db.select({ value: sysPluginData.value })
      .from(sysPluginData)
      .where(and(eq(sysPluginData.pluginId, pluginId), eq(sysPluginData.key, key)));
    return rows.length > 0 ? rows[0].value : null;
  }

  /**
   * Store a value for a plugin (insert or update via upsert).
   *
   * @param pluginId - The plugin identifier
   * @param key - The storage key
   * @param value - The value to store (auto-serialized to JSON)
   */
  async set(pluginId: string, key: string, value: any): Promise<void> {
    await this.db.insert(sysPluginData)
      .values({ pluginId, key, value })
      .onConflictDoUpdate({
        target: [sysPluginData.pluginId, sysPluginData.key],
        set: { value, updatedAt: new Date() },
      })
      .run();
  }

  /**
   * Delete a specific key for a plugin.
   *
   * @param pluginId - The plugin identifier
   * @param key - The storage key to delete
   */
  async delete(pluginId: string, key: string): Promise<void> {
    await this.db.delete(sysPluginData)
      .where(and(eq(sysPluginData.pluginId, pluginId), eq(sysPluginData.key, key)))
      .run();
  }

  /**
   * Delete all stored data for a plugin.
   *
   * @param pluginId - The plugin identifier
   */
  async clear(pluginId: string): Promise<void> {
    await this.db.delete(sysPluginData)
      .where(eq(sysPluginData.pluginId, pluginId))
      .run();
  }

  /**
   * List all keys stored by a plugin.
   *
   * @param pluginId - The plugin identifier
   * @returns Array of key strings
   */
  async listKeys(pluginId: string): Promise<string[]> {
    const rows = await this.db.select({ key: sysPluginData.key })
      .from(sysPluginData)
      .where(eq(sysPluginData.pluginId, pluginId));
    return rows.map((r: { key: string }) => r.key);
  }

  /**
   * Create a scoped PluginStorage instance bound to a specific pluginId.
   * The returned object implements the PluginStorage interface and automatically
   * prefixes all operations with the given pluginId.
   *
   * @param pluginId - The plugin identifier to bind
   * @returns A scoped PluginStorage instance
   */
  forPlugin(pluginId: string): PluginStorage {
    return new ScopedPluginStorage(pluginId, this.db);
  }
}

/**
 * Scoped storage instance bound to a single pluginId.
 * Implements the PluginStorage interface with async DB-backed operations.
 */
class ScopedPluginStorage implements PluginStorage {
  constructor(
    private readonly pluginId: string,
    private readonly db: any,
  ) {}

  async get(key: string): Promise<any> {
    const rows = await this.db.select({ value: sysPluginData.value })
      .from(sysPluginData)
      .where(and(eq(sysPluginData.pluginId, this.pluginId), eq(sysPluginData.key, key)));
    return rows.length > 0 ? rows[0].value : null;
  }

  async set(key: string, value: any): Promise<void> {
    await this.db.insert(sysPluginData)
      .values({ pluginId: this.pluginId, key, value })
      .onConflictDoUpdate({
        target: [sysPluginData.pluginId, sysPluginData.key],
        set: { value, updatedAt: new Date() },
      })
      .run();
  }

  async delete(key: string): Promise<void> {
    await this.db.delete(sysPluginData)
      .where(and(eq(sysPluginData.pluginId, this.pluginId), eq(sysPluginData.key, key)))
      .run();
  }

  async clear(): Promise<void> {
    await this.db.delete(sysPluginData)
      .where(eq(sysPluginData.pluginId, this.pluginId))
      .run();
  }

  async listKeys(): Promise<string[]> {
    const rows = await this.db.select({ key: sysPluginData.key })
      .from(sysPluginData)
      .where(eq(sysPluginData.pluginId, this.pluginId));
    return rows.map((r: { key: string }) => r.key);
  }
}
