<template>
  <div class="tags-page">
    <n-page-header :title="t('iotTags.title')" :subtitle="t('iotTags.subtitle')">
      <template #extra>
        <n-space>
          <!-- NFC 扫描按钮 -->
          <n-button
            v-if="nfcAdapter?.isSupported"
            :loading="scanningNfc"
            @click="handleNfcScan"
          >
            {{ t('iotTags.nfcScan') }}
          </n-button>
          <n-button type="primary" @click="showBindModal = true">
            <template #icon><n-icon><AddOutline /></n-icon></template>
            {{ t('iotTags.newBinding') }}
          </n-button>
          <n-button @click="showEncoderModal = true">
            <template #icon><n-icon :size="16"><QrCodeOutline /></n-icon></template>
            编码生成
          </n-button>
        </n-space>
      </template>
    </n-page-header>

    <!-- Scan result display -->
    <n-card v-if="lastScanResult" class="page-section" :title="t('iotTags.scanResult')">
      <n-descriptions bordered :column="2">
        <n-descriptions-item :label="t('iotTags.resultType')">
          <n-tag :type="typeColorMap[lastScanResult.type] || 'default'" size="small">
            {{ lastScanResult.type.toUpperCase() }}
          </n-tag>
        </n-descriptions-item>
        <n-descriptions-item :label="t('iotTags.resultCode')">{{ lastScanResult.raw }}</n-descriptions-item>
        <n-descriptions-item :label="t('iotTags.resultTime')">
          {{ new Date(lastScanResult.timestamp).toLocaleString('zh-CN') }}
        </n-descriptions-item>
        <n-descriptions-item :label="t('iotTags.resultMeta')">
          {{ lastScanResult.metadata ? JSON.stringify(lastScanResult.metadata) : '-' }}
        </n-descriptions-item>
      </n-descriptions>
      <n-space style="margin-top: 12px">
        <n-button type="primary" @click="handleReportScan">上报并触发动作</n-button>
        <n-button @click="handleBindScanResult">绑定此编码</n-button>
        <n-button @click="lastScanResult = null">清除</n-button>
      </n-space>
    </n-card>

    <!-- 绑定列表 -->
    <n-card class="page-section">
      <n-space justify="space-between" style="margin-bottom: 16px">
        <n-input v-model:value="searchQuery" placeholder="搜索标签..." style="width: 240px" clearable />
        <n-space>
          <n-select v-model:value="filterType" placeholder="类型" :options="codeTypeOptions" clearable style="width: 120px" />
          <n-select v-model:value="filterTarget" placeholder="绑定目标" :options="targetTypeOptions" clearable style="width: 120px" />
        </n-space>
      </n-space>
      <n-data-table :columns="columns" :data="filteredBindings" :pagination="{ pageSize: 20 }" />
    </n-card>

    <!-- 绑定弹窗 -->
    <n-modal v-model:show="showBindModal" :title="t('iotTags.newBinding')" preset="card" style="max-width: 500px">
      <n-form :model="bindForm">
        <n-form-item :label="t('iotTags.codeType')" required>
          <n-select v-model:value="bindForm.codeType" :options="codeTypeOptions" />
        </n-form-item>
        <n-form-item :label="t('iotTags.codeValue')" required>
          <n-input v-model:value="bindForm.code" placeholder="NFC UID / QR 内容 / 条码号">
            <template #suffix>
              <n-button text type="primary" size="small" @click="handleBindScan" :loading="bindScanning" :disabled="!bindForm.codeType">
                <template #icon><n-icon :size="16"><QrCodeOutline /></n-icon></template>
              </n-button>
            </template>
          </n-input>
        </n-form-item>
        <n-form-item :label="t('iotTags.targetTypeLabel')" required>
          <n-select v-model:value="bindForm.targetType" :options="targetTypeOptions" />
        </n-form-item>
        <n-form-item :label="t('iotTags.targetId')" required>
          <n-input-number v-model:value="bindForm.targetId" :min="1" style="width: 100%" />
        </n-form-item>
        <n-form-item :label="t('iotTags.label')">
          <n-input v-model:value="bindForm.label" placeholder="如：冰箱 NFC" />
        </n-form-item>
        <n-form-item label="备注">
          <n-input v-model:value="bindForm.notes" type="textarea" placeholder="可选备注" />
        </n-form-item>
      </n-form>
      <template #footer>
        <n-space justify="end">
          <n-button @click="showBindModal = false">取消</n-button>
          <n-button type="primary" @click="handleBind">绑定</n-button>
        </n-space>
      </template>
    </n-modal>

    <!-- 编码生成弹窗 -->
    <n-modal v-model:show="showEncoderModal" title="编码生成" preset="card" style="max-width: 520px">
      <n-form :model="encForm" label-placement="left" label-width="80">
        <n-form-item label="目标类型">
          <n-select v-model:value="encForm.targetType" :options="encTargetTypeOptions" placeholder="选择目标类型" @update:value="onEncTargetTypeChange" />
        </n-form-item>
        <n-form-item label="目标">
          <n-select v-model:value="encForm.targetId" :options="encTargetOptions" placeholder="选择目标" :loading="encLoadingTargets" filterable :disabled="!encForm.targetType" />
        </n-form-item>
        <n-form-item label="输出类型">
          <n-select v-model:value="encForm.outputType" :options="encOutputTypeOptions" placeholder="选择编码类型" />
        </n-form-item>
        <n-form-item>
          <n-button type="primary" @click="handleEncGenerate" :loading="encGenerating" block>生成编码</n-button>
        </n-form-item>
      </n-form>
      <n-card v-if="encResult" title="预览" size="small" style="margin-top: 12px">
        <n-space vertical>
          <div v-if="encSvg" v-html="encSvg" class="svg-preview"></div>
          <n-input v-else :value="encCode" type="textarea" :autosize="{ minRows: 3, maxRows: 8 }" readonly />
          <n-space justify="end">
            <n-button size="small" @click="handleEncCopy" :disabled="!encCode">复制</n-button>
            <n-button size="small" v-if="encSvg" @click="handleEncDownload">下载 SVG</n-button>
          </n-space>
        </n-space>
      </n-card>
    </n-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, h } from 'vue';
import { NPageHeader, NCard, NButton, NSpace, NInput, NSelect, NDataTable, NModal, NForm, NFormItem, NInputNumber, NIcon, NTag, NDescriptions, NDescriptionsItem, useMessage } from 'naive-ui';
import type { DataTableColumns } from 'naive-ui';
import { AddOutline, TrashOutline, QrCodeOutline } from '@vicons/ionicons5';
import { triggerApi } from '@/api/client';
import api from '@/api/client';
import { clientRegistry } from '@/plugins/client-registry';
import type { ScanResult } from '@/plugins/types/client-plugin.types';
import { useI18n } from '@/locales';

const { t } = useI18n();
const message = useMessage();

// === Scanner adapter references ===
const nfcAdapter = computed(() => {
  // Read revision first to trigger Vue reactivity tracking
  void clientRegistry.getRevision();
  return clientRegistry.getScannerAdapter('nfc');
});

// === Scanning state ===
const scanningNfc = ref(false);
const lastScanResult = ref<ScanResult | null>(null);

// === Encoder state ===
const showEncoderModal = ref(false);
const encForm = reactive({ targetType: null as string | null, targetId: null as number | null, outputType: 'qr' as string });
const encTargetTypeOptions = [
  { label: '物品', value: 'item' },
  { label: '位置', value: 'location' },
];
const encOutputTypeOptions = [
  { label: 'QR 码', value: 'qr' },
  { label: '条形码', value: 'barcode' },
  { label: 'NFC NDEF 记录', value: 'nfc_ndef' },
];
const encLoadingTargets = ref(false);
const encItems = ref<{ id: number; name: string }[]>([]);
const encLocations = ref<{ id: number; name: string }[]>([]);
const encTargetOptions = computed(() => {
  if (encForm.targetType === 'item') return encItems.value.map((i) => ({ label: `${i.name} (#${i.id})`, value: i.id }));
  if (encForm.targetType === 'location') return encLocations.value.map((l) => ({ label: `${l.name} (#${l.id})`, value: l.id }));
  return [];
});
const encGenerating = ref(false);
const encSvg = ref('');
const encCode = ref('');
const encResult = computed(() => !!encSvg.value || !!encCode.value);

// === Binding management state ===
const showBindModal = ref(false);
const bindScanning = ref(false);
const searchQuery = ref('');
const filterType = ref<string | null>(null);
const filterTarget = ref<string | null>(null);
const bindings = ref<Array<Record<string, unknown>>>([]);

const bindForm = reactive<{
  codeType: 'nfc' | 'qr' | 'barcode' | 'rfid';
  code: string;
  targetType: 'item' | 'location' | 'recipe' | 'action';
  targetId: number;
  label: string;
  notes: string;
}>({
  codeType: 'nfc',
  code: '',
  targetType: 'location',
  targetId: 1,
  label: '',
  notes: '',
});

const codeTypeOptions = [
  { label: 'NFC', value: 'nfc' },
  { label: '二维码', value: 'qr' },
  { label: '条形码', value: 'barcode' },
  { label: 'RFID', value: 'rfid' },
];

const targetTypeOptions = [
  { label: '位置', value: 'location' },
  { label: '物品', value: 'item' },
  { label: '食谱', value: 'recipe' },
  { label: '自定义动作', value: 'action' },
];

const typeColorMap: Record<string, 'default' | 'info' | 'warning' | 'error' | 'success' | 'primary'> = {
  nfc: 'info',
  qr: 'success',
  barcode: 'warning',
  rfid: 'error',
};

const columns: DataTableColumns<Record<string, unknown>> = [
  {
    title: t('iotTags.resultType'),
    key: 'codeType',
    width: 100,
    render: (row) => h(NTag, { type: (typeColorMap[row.codeType as string] || 'default') as 'default' | 'info' | 'warning' | 'error' | 'success' | 'primary', size: 'small' }, { default: () => (row.codeType as string).toUpperCase() }),
  },
  { title: t('iotTags.resultCode'), key: 'code', width: 200, ellipsis: { tooltip: true } },
  {
    title: t('iotTags.bindingTarget'),
    key: 'targetType',
    width: 100,
    render: (row) => {
      const map: Record<string, string> = { location: t('iotTags.location'), item: t('iotTags.item'), recipe: t('iotTags.recipe'), action: t('iotTags.action') };
      return map[row.targetType as string] || row.targetType as string;
    },
  },
  { title: t('iotTags.label'), key: 'label', width: 150 },
  { title: t('iotTags.readCount'), key: 'readCount', width: 100 },
  {
    title: '操作',
    key: 'actions',
    width: 80,
    render: (row) => h(NButton, { size: 'small', type: 'error', text: true, onClick: () => handleDelete(row.id as number) }, {
      icon: () => h(NIcon, null, { default: () => h(TrashOutline) }),
    }),
  },
];

const filteredBindings = computed(() => {
  return bindings.value.filter((b) => {
    if (searchQuery.value && !(b.label as string)?.includes(searchQuery.value) && !(b.code as string).includes(searchQuery.value)) {
      return false;
    }
    if (filterType.value && (b.codeType as string) !== filterType.value) {
      return false;
    }
    if (filterTarget.value && (b.targetType as string) !== filterTarget.value) {
      return false;
    }
    return true;
  });
});

// === Scanner actions ===

/** Handle NFC scan button click */
async function handleNfcScan(): Promise<void> {
  if (!nfcAdapter.value) {
    message.warning('NFC 扫描器未加载');
    return;
  }

  scanningNfc.value = true;
  try {
    const result = await nfcAdapter.value.scan();
    lastScanResult.value = result;
    message.success(`NFC 扫描成功: ${result.raw}`);
  } catch (error) {
    const err = error as Error;
    message.error(err.message ?? 'NFC 扫描失败');
  } finally {
    scanningNfc.value = false;
  }
}

/** Scan button in bind modal — auto-detect scanner by codeType */
async function handleBindScan(): Promise<void> {
  if (!bindForm.codeType) { message.warning('请先选择编码类型'); return; }
  bindScanning.value = true;
  try {
    let result: ScanResult;
    if (bindForm.codeType === 'nfc' && nfcAdapter.value) {
      result = await nfcAdapter.value.scan();
    } else if (bindForm.codeType === 'qr') {
      const adapter = clientRegistry.getScannerAdapter('qr');
      if (!adapter) { message.warning('QR 扫描器未加载'); bindScanning.value = false; return; }
      result = await adapter.scan();
    } else if (bindForm.codeType === 'barcode') {
      const adapter = clientRegistry.getScannerAdapter('barcode');
      if (!adapter) { message.warning('条码扫描器未加载'); bindScanning.value = false; return; }
      result = await adapter.scan();
    } else {
      message.warning('当前编码类型不支持自动扫描');
      bindScanning.value = false;
      return;
    }
    bindForm.code = result.raw;
    message.success(`扫描成功: ${result.raw}`);
  } catch (error) {
    const err = error as Error;
    if (err.message === '用户取消扫描') message.info('已取消扫描');
    else message.error(err.message ?? '扫描失败');
  } finally { bindScanning.value = false; }
}

/** Report scan result to backend via triggerApi.scan() */
async function handleReportScan(): Promise<void> {
  if (!lastScanResult.value) return;

  try {
    await triggerApi.scan({
      code: lastScanResult.value.raw,
      codeType: lastScanResult.value.type,
      pagePath: window.location.pathname,
      metadata: lastScanResult.value.metadata ?? undefined,
    });
    message.success('扫描结果已上报');
  } catch (error) {
    const err = error as { response?: { data?: { message?: string } } };
    message.error(err.response?.data?.message ?? '上报失败');
  }
}

/** Bind the last scan result to a target */
function handleBindScanResult(): void {
  if (!lastScanResult.value) return;

  bindForm.code = lastScanResult.value.raw;
  bindForm.codeType = lastScanResult.value.type;
  showBindModal.value = true;
}

// === Binding CRUD ===

const handleBind = async () => {
  if (!bindForm.code || !bindForm.targetId) {
    message.warning('请填写完整信息');
    return;
  }
  try {
    await triggerApi.createBinding(bindForm);
    message.success('绑定成功');
    showBindModal.value = false;
    Object.assign(bindForm, { code: '', label: '', notes: '' });
    loadBindings();
  } catch (e) {
    const err = e as { response?: { data?: { message?: string } } };
    message.error(err.response?.data?.message ?? '绑定失败');
  }
};

const handleDelete = async (id: number) => {
  try {
    await triggerApi.deleteBinding(id);
    message.success('删除成功');
    loadBindings();
  } catch (e) {
    const err = e as { response?: { data?: { message?: string } } };
    message.error(err.response?.data?.message ?? '删除失败');
  }
};

const loadBindings = async () => {
  try {
    const { data } = await triggerApi.listBindings();
    bindings.value = data || [];
  } catch (e) {
    // Silently fail — bindings list is not critical
    void e;
  }
};

onMounted(() => {
  loadBindings();
});

// ── Encoder functions ──
async function loadEncTargets() {
  if (!encForm.targetType) return;
  encLoadingTargets.value = true;
  try {
    if (encForm.targetType === 'item') {
      const { data } = await api.get('/stock/items', { params: { limit: 200 } });
      encItems.value = ((data as any)?.data || data || []).map((i: any) => ({ id: i.id, name: i.name }));
    } else {
      const { data } = await api.get('/locations');
      encLocations.value = (data || []).map((l: any) => ({ id: l.id, name: l.name }));
    }
  } catch { message.error('加载目标列表失败'); }
  finally { encLoadingTargets.value = false; }
}
function onEncTargetTypeChange() { encForm.targetId = null; loadEncTargets(); }
async function handleEncGenerate() {
  if (!encForm.targetType || !encForm.targetId || !encForm.outputType) { message.warning('请完整填写表单'); return; }
  encGenerating.value = true; encSvg.value = ''; encCode.value = '';
  try {
    const { data } = await api.post('/encoder/generate', { targetType: encForm.targetType, targetId: encForm.targetId, outputType: encForm.outputType });
    const d = data as any;
    if (d.svg) encSvg.value = d.svg;
    if (d.code || d.data?.code) encCode.value = d.code || d.data?.code;
    if (d.data?.svg) encSvg.value = d.data.svg;
    if (!encResult.value) message.success('编码已生成');
  } catch (e: any) { message.error(e?.response?.data?.message || '生成失败'); }
  finally { encGenerating.value = false; }
}
function handleEncCopy() { if (encCode.value) navigator.clipboard.writeText(encCode.value).then(() => message.success('已复制')); }
function handleEncDownload() {
  if (encSvg.value) {
    const blob = new Blob([encSvg.value], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `code-${encForm.targetType}-${encForm.targetId}.svg`; a.click();
    URL.revokeObjectURL(url);
  }
}
</script>

<style scoped>
.tags-page {
  max-width: 1200px;
  margin: 0 auto;
}

.svg-preview {
  display: flex;
  justify-content: center;
  padding: 12px;
  background: var(--hh-bg-secondary);
  border-radius: 6px;
}
.svg-preview svg {
  max-width: 100%;
  height: auto;
}
</style>
