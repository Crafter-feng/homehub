import { Injectable, Inject } from '@nestjs/common';
import { eq, and } from 'drizzle-orm';
import { DATABASE_TOKEN } from '../db/database.module';
import { sysPluginData } from '../db/schema';
import { PluginStorage } from '../plugins/types/plugin.types';

@Injectable()
export class PluginStorageService {
  constructor(
    @Inject(DATABASE_TOKEN) private readonly db: any,
  ) {}

  async get(pluginId: string, key: string): Promise<any> {
    const row = this.db.select()
      .from(sysPluginData)
      .where(and(eq(sysPluginData.pluginId, pluginId), eq(sysPluginData.key, key)))
      .get();
    return row?.value ?? null;
  }

  async set(pluginId: string, key: string, value: any): Promise<void> {
    const existing = this.db.select()
      .from(sysPluginData)
      .where(and(eq(sysPluginData.pluginId, pluginId), eq(sysPluginData.key, key)))
      .get();
    if (existing) {
      this.db.update(sysPluginData)
        .set({ value, updatedAt: new Date() })
        .where(eq(sysPluginData.id, existing.id))
        .run();
    } else {
      this.db.insert(sysPluginData).values({ pluginId, key, value, createdAt: new Date(), updatedAt: new Date() }).run();
    }
  }

  async delete(pluginId: string, key: string): Promise<void> {
    this.db.delete(sysPluginData)
      .where(and(eq(sysPluginData.pluginId, pluginId), eq(sysPluginData.key, key)))
      .run();
  }

  forPlugin(pluginId: string): PluginStorage {
    return {
      get: (key: string) => this.get(pluginId, key),
      set: (key: string, value: any) => this.set(pluginId, key, value),
      delete: (key: string) => this.delete(pluginId, key),
      clear: async () => {
        this.db.delete(sysPluginData)
          .where(eq(sysPluginData.pluginId, pluginId))
          .run();
      },
      listKeys: async () => {
        const rows = this.db.select({ key: sysPluginData.key })
          .from(sysPluginData)
          .where(eq(sysPluginData.pluginId, pluginId))
          .all();
        return rows.map((r: any) => r.key);
      },
    };
  }
}
