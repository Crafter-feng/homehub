import type { ScannerAdapterExports, ScanResult } from '../types/client-plugin.types';

/**
 * Barcode Scanner Frontend Adapter — QuaggaJS (quagga2) camera scanning.
 *
 * Uses the QuaggaJS library to scan barcodes via device camera.
 * Requires navigator.mediaDevices support (most modern browsers).
 * Provides manual input fallback for devices without camera access.
 */

/** Check if camera scanning is supported */
function checkBarcodeSupport(): boolean {
  return typeof navigator !== 'undefined' && !!navigator.mediaDevices && !!navigator.mediaDevices.getUserMedia;
}

/**
 * Quagga2 module type declaration.
 * The quagga2 package doesn't ship TypeScript definitions,
 * so we declare the minimal interface we need.
 */
interface QuaggaStatic {
  init(config: QuaggaConfig, callback: (err: Error | null) => void): void;
  start(): void;
  stop(): void;
  onDetected(callback: (result: QuaggaResult) => void): void;
  offDetected(callback?: (result: QuaggaResult) => void): void;
}

interface QuaggaConfig {
  inputStream: {
    name: string;
    type: 'liveStream' | 'file';
    target?: HTMLElement | string;
    constraints?: MediaTrackConstraints;
    area?: { top: string; right: string; left: string; bottom: string };
  };
  locator: {
    patchSize: 'x-small' | 'small' | 'medium' | 'large' | 'x-large';
    halfSample: boolean;
  };
  decoder: {
    readers: string[];
    multiple: boolean;
  };
  locate: boolean;
}

interface QuaggaResult {
  codeResult: {
    code: string;
    format: string;
    start: number;
    end: number;
  };
  box?: Array<[number, number]>;
  line?: Array<[number, number]>;
}

/**
 * Dynamically import Quagga2 to avoid bundling it when not needed
 * and to handle the module properly.
 */
let quaggaModule: QuaggaStatic | null = null;

async function loadQuagga(): Promise<QuaggaStatic> {
  if (quaggaModule) return quaggaModule;

  try {
    const mod = await import('quagga2');
    // quagga2 exports Quagga as default or as named export
    quaggaModule = (mod.default ?? mod) as unknown as QuaggaStatic;
    return quaggaModule;
  } catch (error) {
    throw new Error('条码扫描库加载失败，请使用手动输入');
  }
}

/**
 * Perform a barcode scan using Quagga2 camera scanning.
 *
 * Creates a temporary overlay with the camera feed,
 * waits for barcode detection, then cleans up.
 */
async function performCameraScan(): Promise<ScanResult> {
  const Quagga = await loadQuagga();

  // Create overlay container for camera feed
  const overlay = document.createElement('div');
  overlay.id = 'homehub-barcode-overlay';
  overlay.style.cssText = [
    'position:fixed',
    'top:0',
    'left:0',
    'width:100vw',
    'height:100vh',
    'z-index:10000',
    'background:rgba(0,0,0,0.85)',
    'display:flex',
    'flex-direction:column',
    'align-items:center',
    'justify-content:center',
  ].join(';');

  // Scanner container (camera feed target)
  const scannerContainer = document.createElement('div');
  scannerContainer.id = 'homehub-barcode-container';
  scannerContainer.style.cssText = 'width:100%;max-width:640px;height:60vh;position:relative;';
  overlay.appendChild(scannerContainer);

  // Status text
  const statusText = document.createElement('div');
  statusText.style.cssText = 'color:#fff;font-size:18px;margin-top:16px;text-align:center;';
  statusText.textContent = '正在扫描条码...请将条码对准摄像头';
  overlay.appendChild(statusText);

  // Cancel button
  const cancelButton = document.createElement('button');
  cancelButton.style.cssText = [
    'margin-top:24px',
    'padding:12px 32px',
    'background:#e74c3c',
    'color:#fff',
    'border:none',
    'border-radius:8px',
    'font-size:16px',
    'cursor:pointer',
  ].join(';');
  cancelButton.textContent = '取消扫描';
  overlay.appendChild(cancelButton);

  document.body.appendChild(overlay);

  return new Promise<ScanResult>((resolve, reject) => {
    let settled = false;

    const cleanup = () => {
      try {
        Quagga.stop();
        Quagga.offDetected();
      } catch {
        // Quagga stop may throw if not initialized
      }
      if (overlay.parentNode) {
        document.body.removeChild(overlay);
      }
    };

    // Cancel button handler
    cancelButton.addEventListener('click', () => {
      if (!settled) {
        settled = true;
        cleanup();
        reject(new Error('用户取消扫描'));
      }
    });

    // Quagga config
    const config: QuaggaConfig = {
      inputStream: {
        name: 'Live',
        type: 'liveStream',
        target: scannerContainer,
        constraints: {
          facingMode: 'environment', // Use rear camera
        },
        area: {
          top: '0%',
          right: '0%',
          left: '0%',
          bottom: '0%',
        },
      },
      locator: {
        patchSize: 'medium',
        halfSample: true,
      },
      decoder: {
        readers: [
          'ean_reader',       // EAN-13
          'ean_8_reader',     // EAN-8
          'code_128_reader',  // Code 128
          'upc_reader',       // UPC-A
          'upc_e_reader',     // UPC-E
          'i2of5_reader',     // ITF
        ],
        multiple: false,
      },
      locate: true,
    };

    // Initialize Quagga2
    Quagga.init(config, (err: Error | null) => {
      if (err) {
        if (!settled) {
          settled = true;
          cleanup();
          reject(new Error(`摄像头扫描初始化失败: ${err.message}`));
        }
        return;
      }

      Quagga.start();

      // Listen for barcode detection
      Quagga.onDetected((result: QuaggaResult) => {
        if (settled) return;

        const code = result.codeResult.code;
        if (!code) return;

        // Validate — require at least 4 characters for a valid barcode
        if (code.length < 4) return;

        settled = true;
        cleanup();

        resolve({
          type: 'barcode',
          raw: code,
          timestamp: Date.now(),
          metadata: {
            format: result.codeResult.format,
            start: result.codeResult.start,
            end: result.codeResult.end,
          },
        });
      });
    });
  });
}

/**
 * Manual barcode input — fallback when camera is not available.
 * Returns a ScanResult from user-entered barcode text.
 *
 * This does NOT create UI — the calling component should provide
 * an input field and call this function with the entered code.
 */
function createManualScanResult(code: string): ScanResult {
  return {
    type: 'barcode',
    raw: code,
    timestamp: Date.now(),
    metadata: {
      source: 'manual_input',
    },
  };
}

/** Barcode Scanner Adapter exports object */
export const barcodeScannerAdapter: ScannerAdapterExports = {
  type: 'barcode',
  name: '条码扫描器',
  get isSupported() { return checkBarcodeSupport(); },

  async scan(): Promise<ScanResult> {
    if (!this.isSupported) {
      throw new Error('您的设备不支持摄像头扫描，请使用手动输入条码');
    }
    return performCameraScan();
  },

  /** Manual input helper — creates a ScanResult from manually entered code */
  manualScan(code: string): ScanResult {
    return createManualScanResult(code);
  },
};

/**
 * Export the manual scan helper as a standalone function
 * for components that need manual input fallback.
 */
export function createBarcodeManualResult(code: string): ScanResult {
  return createManualScanResult(code);
}
