import { defineStore } from 'pinia';
import { ref } from 'vue';
import { pluginsApi } from '@/api/client';
import type { ServerPluginInfo } from '@/plugins/types/client-plugin.types';

/**
 * Plugin Store — Pinia store for plugin management UI.
 *
 * Manages the list of plugins, loading/error states,
 * and enable/disable actions.
 */
export const usePluginStore = defineStore('plugin', () => {
  /** List of server plugins */
  const plugins = ref<ServerPluginInfo[]>([]);

  /** Loading state */
  const loading = ref(false);

  /** Error message */
  const error = ref<string | null>(null);

  /** Fetch the plugin list from /api/v1/plugins */
  async function fetchPlugins(): Promise<void> {
    loading.value = true;
    error.value = null;

    try {
      const { data } = await pluginsApi.list();
      const rawList: Array<Record<string, unknown>> = Array.isArray(data) ? data : [];

      plugins.value = rawList.map((raw) => ({
        id: raw.id as string,
        name: raw.name as string,
        version: raw.version as string,
        status: (raw.status as ServerPluginInfo['status']) ?? 'inactive',
        extensionPoints: (raw.extensionPoints as string[]) ?? [],
        exports: raw.exports as Record<string, unknown> | undefined,
        error: raw.error as string | undefined,
      }));
    } catch (e) {
      const err = e as Error;
      error.value = err.message ?? '获取插件列表失败';
    } finally {
      loading.value = false;
    }
  }

  /** Enable a plugin by ID */
  async function enablePlugin(id: string): Promise<void> {
    try {
      await pluginsApi.enable(id);

      // Update local state
      const plugin = plugins.value.find((p) => p.id === id);
      if (plugin) {
        plugin.status = 'active';
        plugin.error = undefined;
      }
    } catch (e) {
      const err = e as Error;
      error.value = err.message ?? '启用插件失败';
      throw e;
    }
  }

  /** Disable a plugin by ID */
  async function disablePlugin(id: string): Promise<void> {
    try {
      await pluginsApi.disable(id);

      // Update local state
      const plugin = plugins.value.find((p) => p.id === id);
      if (plugin) {
        plugin.status = 'inactive';
      }
    } catch (e) {
      const err = e as Error;
      error.value = err.message ?? '禁用插件失败';
      throw e;
    }
  }

  /** Get a specific plugin by ID */
  function getPluginById(id: string): ServerPluginInfo | undefined {
    return plugins.value.find((p) => p.id === id);
  }

  return {
    plugins,
    loading,
    error,
    fetchPlugins,
    enablePlugin,
    disablePlugin,
    getPluginById,
  };
});
