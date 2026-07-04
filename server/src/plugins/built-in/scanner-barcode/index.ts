import { HomeHubPlugin, HomeHubPluginMeta, ScannerPluginExports, ScanResult, ScanCallback } from '../../types/plugin.types';

/**
 * Barcode Scanner — metadata registration mode.
 *
 * This plugin references browser APIs (navigator.mediaDevices, QuaggaJS) that cannot run in Node.js.
 * After P-T02 refactoring, the backend only stores metadata (type, name, priority, supported)
 * so the Registry can discover barcode scanner capabilities. The actual scan/listen implementation
 * lives in the frontend adapter (client/src/plugins/scanner/barcode-scanner.ts).
 *
 * meta.runtime.env = 'frontend' signals that this plugin should only execute in the browser.
 * The scan/listen methods throw errors to prevent accidental backend execution.
 */
const meta: HomeHubPluginMeta = {
  id: 'builtin.scanner-barcode',
  name: 'Quagga Barcode Scanner',
  version: '1.0.0',
  description: '通过摄像头扫描条形码（支持 EAN-13, EAN-8, UPC-A, Code128 等）— 后端仅注册元数据',
  author: 'HomeHub Team',
  extensionPoints: ['scanner'],
  permissions: ['camera'],
  runtime: { type: 'native', env: 'frontend' },
};

const scannerExports: ScannerPluginExports = {
  type: 'barcode',
  name: 'Quagga Barcode Scanner',
  priority: 100,
  /** supported is always false on backend (no navigator.mediaDevices).
   *  Frontend ClientRegistry will override this with real browser capability detection. */
  supported: false,

  async scan(options?: any): Promise<ScanResult> {
    throw new Error('此 Scanner 仅在前端运行，请在浏览器端使用 QuaggaJS');
  },

  listen(callback: ScanCallback): () => void {
    throw new Error('此 Scanner 仅在前端运行，请在浏览器端使用 QuaggaJS');
  },
};

export const ScannerBarcodePlugin: HomeHubPlugin = {
  meta,
  exports: scannerExports,
  async onLoad(ctx) {
    ctx.logger.info(`Barcode Scanner 元数据注册完成 (type: barcode, runtime: frontend)`);
  },
  async onUnload(ctx) {
    ctx.logger.info('Barcode Scanner 元数据注销');
  },
};
