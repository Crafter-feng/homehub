import { clientRegistry } from './client-registry';
import { pluginsApi } from '@/api/client';
import type { ServerPluginInfo, ClientPluginExports } from './types/client-plugin.types';
import BatteryStateIndicator from './built-in/components/BatteryStateIndicator.vue';
import GasTankStateIndicator from './built-in/components/GasTankStateIndicator.vue';
import { nfcScannerAdapter } from './scanner/nfc-scanner';
import { barcodeScannerAdapter } from './scanner/barcode-scanner';
import { qrScannerAdapter } from './scanner/qr-scanner';

/**
 * PluginLoader — Initializes the frontend plugin system.
 *
 * Responsibilities:
 * 1. Fetch server plugin list from /api/v1/plugins
 * 2. Register ServerPluginInfo in ClientRegistry
 * 3. Register built-in frontend adapters (scanner, component mappings)
 *
 * Called after app.mount('#app') — needs DOM for Web NFC checks.
 */

let initialized = false;

/** Initialize the frontend plugin system */
export async function initializePlugins(): Promise<void> {
  if (initialized) return;

  try {
    // 1. Fetch server plugin metadata
    const serverPlugins = await fetchServerPlugins();

    // 2. Register server plugin info in ClientRegistry
    for (const info of serverPlugins) {
      clientRegistry.registerServerPlugin(info);
    }

    // 3. Register built-in frontend adapters
    registerBuiltInAdapters();

    initialized = true;
    console.info('[PluginLoader] Frontend plugin system initialized');
  } catch (error) {
    console.error('[PluginLoader] Failed to initialize:', error);
    // Still register built-in adapters even if server fetch fails
    registerBuiltInAdapters();
    initialized = true;
  }
}

/** Re-sync server plugin state (e.g. after enable/disable) */
export async function refreshPlugins(): Promise<void> {
  try {
    const serverPlugins = await fetchServerPlugins();

    // Re-register all server plugin info
    for (const info of serverPlugins) {
      clientRegistry.registerServerPlugin(info);
    }
  } catch (error) {
    console.error('[PluginLoader] Failed to refresh:', error);
  }
}

/** Fetch server plugin list from /api/v1/plugins */
async function fetchServerPlugins(): Promise<ServerPluginInfo[]> {
  try {
    const { data } = await pluginsApi.list();
    const rawList: Array<Record<string, unknown>> = Array.isArray(data) ? data : [];

    return rawList.map((raw) => ({
      id: raw.id as string,
      name: raw.name as string,
      version: raw.version as string,
      status: (raw.status as ServerPluginInfo['status']) ?? 'inactive',
      extensionPoints: (raw.extensionPoints as string[]) ?? [],
      exports: raw.exports as Record<string, unknown> | undefined,
      error: raw.error as string | undefined,
    }));
  } catch (error) {
    const err = error as { response?: { status?: number } };
    if (err.response?.status === 401) {
      console.warn('[PluginLoader] Not authenticated, skipping server plugin fetch');
      return [];
    }
    throw error;
  }
}

/** Register all built-in frontend adapters and component mappings */
function registerBuiltInAdapters(): void {
  // --- Scanner adapters ---
  const scannerPluginExports: ClientPluginExports = {
    scanner: nfcScannerAdapter,
  };
  clientRegistry.registerClientPlugin('builtin.scanner.nfc', scannerPluginExports);

  const barcodePluginExports: ClientPluginExports = {
    scanner: barcodeScannerAdapter,
  };
  clientRegistry.registerClientPlugin('builtin.scanner.barcode', barcodePluginExports);

  const qrPluginExports: ClientPluginExports = {
    scanner: qrScannerAdapter,
  };
  clientRegistry.registerClientPlugin('builtin.scanner.qr', qrPluginExports);

  // --- ItemType component mappings (Phase 0: build-time bundling) ---
  const componentPluginExports: ClientPluginExports = {
    components: {
      BatteryStateIndicator,
      GasTankStateIndicator,
    },
  };
  clientRegistry.registerClientPlugin('builtin.item-type-components', componentPluginExports);
}
