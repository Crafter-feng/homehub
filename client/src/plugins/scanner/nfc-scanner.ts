import type { ScannerAdapterExports, ScanResult } from '../types/client-plugin.types';

/**
 * NFC Scanner Frontend Adapter — Web NFC API (Android Chrome only).
 *
 * Uses the NDEFReader browser API to scan NFC tags.
 * Requires Android Chrome with NFC hardware.
 */

/** Check if Web NFC is supported on this device */
function checkNfcSupport(): boolean {
  return typeof window !== 'undefined' && 'NDEFReader' in window;
}

/** NDEFReader type declaration (browser API, not in standard TypeScript lib) */
interface NDEFReadingEvent {
  serialNumber: string;
  message: {
    records: Array<{
      recordType: string;
      mediaType?: string;
      data: ArrayBuffer;
      encoding?: string;
      lang?: string;
    }>;
  };
}

interface NDEFReaderConstructor {
  new (): NDEFReaderInstance;
}

interface NDEFReaderInstance {
  scan(options?: Record<string, unknown>): Promise<void>;
  onreading: ((event: NDEFReadingEvent) => void) | null;
  onreadingerror: ((event: Event) => void) | null;
  addEventListener(type: string, callback: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions): void;
  removeEventListener(type: string, callback: EventListenerOrEventListenerObject, options?: boolean | EventListenerOptions): void;
}

/** Get the NDEFReader constructor if available */
function getNDEFReader(): NDEFReaderConstructor | null {
  if (typeof window === 'undefined') return null;
  return (window as unknown as Record<string, unknown>).NDEFReader as NDEFReaderConstructor | null;
}

/**
 * Perform a single NFC scan.
 *
 * Opens the NFC reader, waits for a tag read event, and returns the result.
 * If NFC is not supported, throws an error.
 */
async function performNfcScan(): Promise<ScanResult> {
  const NDEFReader = getNDEFReader();
  if (!NDEFReader) {
    throw new Error('您的设备不支持 NFC 扫描（仅 Android Chrome 可用）');
  }

  const ndef = new NDEFReader();

  return new Promise<ScanResult>((resolve, reject) => {
    let settled = false;

    const onReading = (event: Event) => {
      if (settled) return;
      settled = true;

      const readingEvent = event as unknown as NDEFReadingEvent;
      const tagUid = readingEvent.serialNumber;
      const records = readingEvent.message?.records ?? [];

      // Parse NDEF records — extract text content if available
      const metadata: Record<string, unknown> = {};
      let textContent = '';

      for (const record of records) {
        if (record.recordType === 'text') {
          try {
            const decoder = new TextDecoder(record.encoding ?? 'utf-8');
            textContent = decoder.decode(record.data);
            metadata.textContent = textContent;
          } catch {
            metadata.textContent = '[无法解码]';
          }
        }
        metadata.recordCount = records.length;
      }

      resolve({
        type: 'nfc',
        raw: tagUid,
        timestamp: Date.now(),
        metadata,
      });

      cleanup();
    };

    const onReadingError = (_event: Event) => {
      if (settled) return;
      settled = true;
      reject(new Error('NFC 读取失败，请重试'));
      cleanup();
    };

    const cleanup = () => {
      ndef.removeEventListener('reading', onReading);
      ndef.removeEventListener('readingerror', onReadingError);
    };

    ndef.addEventListener('reading', onReading);
    ndef.addEventListener('readingerror', onReadingError);

    ndef.scan().catch((scanError: Error) => {
      if (!settled) {
        settled = true;
        cleanup();
        reject(new Error(`NFC 扫描启动失败: ${scanError.message}`));
      }
    });
  });
}

/** NFC Scanner Adapter exports object */
export const nfcScannerAdapter: ScannerAdapterExports = {
  type: 'nfc',
  name: 'NFC 扫描器',
  get isSupported() { return checkNfcSupport(); },

  async scan(): Promise<ScanResult> {
    if (!this.isSupported) {
      throw new Error('您的设备不支持 NFC 扫描（仅 Android Chrome 可用）');
    }
    return performNfcScan();
  },

  listen(callback: (result: ScanResult) => void): () => void {
    const NDEFReader = getNDEFReader();
    if (!NDEFReader) {
      // Not supported — return a no-op unsubscribe
      return () => {};
    }

    const ndef = new NDEFReader();

    const onReading = (event: Event) => {
      const readingEvent = event as unknown as NDEFReadingEvent;
      const tagUid = readingEvent.serialNumber;
      const records = readingEvent.message?.records ?? [];

      const metadata: Record<string, unknown> = {};
      for (const record of records) {
        if (record.recordType === 'text') {
          try {
            const decoder = new TextDecoder(record.encoding ?? 'utf-8');
            metadata.textContent = decoder.decode(record.data);
          } catch {
            metadata.textContent = '[无法解码]';
          }
        }
        metadata.recordCount = records.length;
      }

      callback({
        type: 'nfc',
        raw: tagUid,
        timestamp: Date.now(),
        metadata,
      });
    };

    ndef.addEventListener('reading', onReading);
    ndef.scan().catch(() => {
      // Silently fail — listen mode doesn't throw
    });

    // Return unsubscribe function
    return () => {
      ndef.removeEventListener('reading', onReading);
    };
  },
};
