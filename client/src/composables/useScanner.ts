import { ref } from 'vue';
import { triggerApi } from '@/api/client';

export function useScanner() {
  const isScanning = ref(false);
  const lastResult = ref<any>(null);
  const error = ref<string | null>(null);

  // Web NFC (Android only)
  const isNfcSupported = ref('NDEFReader' in window);

  async function startNfcScan() {
    if (!isNfcSupported.value) {
      error.value = '您的设备不支持 NFC';
      return;
    }

    isScanning.value = true;
    error.value = null;

    try {
      const ndef = new (window as any).NDEFReader();
      await ndef.scan();

      ndef.addEventListener('reading', async (event: any) => {
        const tagUid = event.serialNumber;
        const records = event.message?.records || [];

        // 解析 NDEF 记录
        let content = '';
        for (const record of records) {
          if (record.recordType === 'text') {
            const decoder = new TextDecoder(record.encoding);
            content = decoder.decode(record.data);
          }
        }

        // 调用后端扫描接口
        const { data } = await triggerApi.scan({
          code: tagUid,
          codeType: 'nfc',
        });

        lastResult.value = {
          tagUid,
          content,
          binding: data.binding,
          action: data.action,
          page: data.page,
        };

        return data;
      });

      ndef.addEventListener('readingerror', () => {
        error.value = 'NFC 读取失败';
      });
    } catch (e: any) {
      error.value = e.message || 'NFC 扫描失败';
    } finally {
      isScanning.value = false;
    }
  }

  function stopScan() {
    isScanning.value = false;
  }

  // 手动输入条码
  async function scanBarcode(code: string) {
    isScanning.value = true;
    error.value = null;

    try {
      const { data } = await triggerApi.scan({
        code,
        codeType: 'barcode',
      });

      lastResult.value = {
        code,
        binding: data.binding,
        action: data.action,
        page: data.page,
      };

      return data;
    } catch (e: any) {
      error.value = e.message || '条码扫描失败';
    } finally {
      isScanning.value = false;
    }
  }

  return {
    isScanning,
    lastResult,
    error,
    isNfcSupported,
    startNfcScan,
    stopScan,
    scanBarcode,
  };
}
