import { HomeHubPlugin, HomeHubPluginMeta, ScannerPluginExports, ScanResult, ScanCallback } from '../../types/plugin.types';

/**
 * NFC Scanner — metadata registration mode.
 *
 * This plugin references browser APIs (window, NDEFReader) that cannot run in Node.js.
 * After P-T02 refactoring, the backend only stores metadata (type, name, priority, supported)
 * so the Registry can discover NFC scanner capabilities. The actual scan/listen implementation
 * lives in the frontend adapter (client/src/plugins/scanner/nfc-scanner.ts).
 *
 * meta.runtime.env = 'frontend' signals that this plugin should only execute in the browser.
 * The scan/listen methods throw errors to prevent accidental backend execution.
 */
const meta: HomeHubPluginMeta = {
  id: 'builtin.scanner-nfc',
  name: 'Web NFC Scanner',
  version: '1.0.0',
  description: '通过浏览器 Web NFC API 读取 NFC 标签（仅 Android）— 后端仅注册元数据',
  author: 'HomeHub Team',
  extensionPoints: ['scanner'],
  permissions: ['web-nfc'],
  runtime: { type: 'native', env: 'frontend' },
};

const scannerExports: ScannerPluginExports = {
  type: 'nfc',
  name: 'Web NFC Scanner',
  priority: 100,
  /** supported is always false on backend (no window/NDEFReader).
   *  Frontend ClientRegistry will override this with real browser capability detection. */
  supported: false,

  async scan(options?: any): Promise<ScanResult> {
    throw new Error('此 Scanner 仅在前端运行，请在浏览器端使用 Web NFC API');
  },

  listen(callback: ScanCallback): () => void {
    throw new Error('此 Scanner 仅在前端运行，请在浏览器端使用 Web NFC API');
  },
};

export const ScannerNfcPlugin: HomeHubPlugin = {
  meta,
  exports: scannerExports,
  async onLoad(ctx) {
    ctx.logger.info(`NFC Scanner 元数据注册完成 (type: nfc, runtime: frontend)`);
  },
  async onUnload(ctx) {
    ctx.logger.info('NFC Scanner 元数据注销');
  },
};
