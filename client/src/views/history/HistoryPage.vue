<template>
  <div class="history-page">
    <n-page-header :title="t('history.title')" :subtitle="t('history.subtitle')" />

    <n-tabs
      type="line"
      animated
      default-value="timeline"
      class="page-section"
      @update:value="onTabChange"
    >
      <n-tab-pane name="timeline" :tab="t('history.stockTransactions')">
        <n-data-table
          :columns="timelineColumns"
          :data="timelineData"
          :loading="timelineLoading"
          :pagination="timelinePagination"
          :bordered="false"
          :single-line="false"
          size="small"
        />
        <n-empty v-if="!timelineLoading && timelineData.length === 0" :description="t('history.noData')" style="margin-top: 24px" />
      </n-tab-pane>

      <n-tab-pane name="scan-logs" :tab="t('history.scanLogs')">
        <n-data-table
          :columns="scanLogColumns"
          :data="scanLogData"
          :loading="scanLogLoading"
          :bordered="false"
          :single-line="false"
          size="small"
        />
        <n-empty v-if="!scanLogLoading && scanLogData.length === 0" :description="t('history.noData')" style="margin-top: 24px" />
      </n-tab-pane>
    </n-tabs>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, h } from 'vue';
import { NPageHeader, NTabs, NTabPane, NDataTable, NTag, NEmpty } from 'naive-ui';
import type { DataTableColumns } from 'naive-ui';
import { useI18n } from '@/locales';
import { historyApi } from '@/api/client';

const { t } = useI18n();

// ── Timeline State ──
const timelineLoading = ref(false);
const timelineData = ref<any[]>([]);
const timelineTotal = ref(0);
const timelinePage = ref(1);
const timelineLimit = 20;

const timelinePagination = reactive({
  page: 1,
  pageSize: timelineLimit,
  showSizePicker: false,
  onChange: (page: number) => loadTimeline(page),
});

// ── Scan Logs State ──
const scanLogLoading = ref(false);
const scanLogData = ref<any[]>([]);

// ── Type → i18n key mapping ──
const typeLabelMap: Record<string, string> = {
  add: 'history.add',
  consume: 'history.consume',
  transfer: 'history.transfer',
  adjust: 'history.adjust',
};

const sourceLabelMap: Record<string, string> = {
  manual: 'history.manual',
  barcode: 'history.barcode',
  nfc: 'history.nfc',
  rfid: 'history.rfid',
  voice: 'history.voice',
  vision: 'history.vision',
  mcp: 'history.mcp',
};

const typeTagTypeMap: Record<string, string> = {
  add: 'success',
  consume: 'warning',
  transfer: 'info',
  adjust: 'primary',
};

// ── Format timestamp ──
function formatTs(ts: string | number | Date): string {
  if (!ts) return '-';
  const d = new Date(ts);
  return d.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

// ── Timeline Columns ──
const timelineColumns: DataTableColumns<any> = [
  {
    title: () => t('history.time'),
    key: 'createdAt',
    width: 160,
    render: (row) => formatTs(row.createdAt),
  },
  {
    title: () => t('history.type'),
    key: 'type',
    width: 80,
    render: (row) => {
      const label = typeLabelMap[row.type] ? t(typeLabelMap[row.type]) : row.type;
      const tagType = (typeTagTypeMap[row.type] as 'success' | 'warning' | 'info' | 'primary') || 'default';
      return h(NTag, { type: tagType, size: 'small' }, { default: () => label });
    },
  },
  {
    title: () => t('history.itemName'),
    key: 'itemName',
    ellipsis: { tooltip: true },
  },
  {
    title: () => t('history.source'),
    key: 'source',
    width: 90,
    render: (row) => sourceLabelMap[row.source] ? t(sourceLabelMap[row.source]) : (row.source || '-'),
  },
  {
    title: () => t('history.user'),
    key: 'userId',
    width: 80,
    render: (row) => row.userId ?? '-',
  },
  {
    title: () => t('common.notes'),
    key: 'note',
    ellipsis: { tooltip: true },
    render: (row) => row.note || '-',
  },
];

// ── Scan Log Columns ──
const scanLogColumns: DataTableColumns<any> = [
  {
    title: () => t('history.time'),
    key: 'createdAt',
    width: 160,
    render: (row) => formatTs(row.createdAt),
  },
  {
    title: () => t('history.scanType'),
    key: 'scanType',
    width: 90,
    render: (row) => {
      const label = sourceLabelMap[row.scanType] ? t(sourceLabelMap[row.scanType]) : (row.scanType || '-');
      return h(NTag, { size: 'small' }, { default: () => label });
    },
  },
  {
    title: () => t('history.code'),
    key: 'code',
    ellipsis: { tooltip: true },
  },
  {
    title: () => t('history.action'),
    key: 'action',
    width: 120,
    ellipsis: { tooltip: true },
  },
  {
    title: () => t('history.user'),
    key: 'userId',
    width: 80,
    render: (row) => row.userId ?? '-',
  },
];

// ── Load Timeline ──
async function loadTimeline(page = 1) {
  timelineLoading.value = true;
  timelinePage.value = page;
  try {
    const { data } = await historyApi.getTimeline({ page, limit: timelineLimit });
    // data is PaginatedResponse — may be nested under data.data or flat
    const responseData = data.data ?? data;
    if (Array.isArray(responseData)) {
      timelineData.value = responseData;
      timelineTotal.value = data.total ?? responseData.length;
    } else if (Array.isArray(data)) {
      timelineData.value = data;
      timelineTotal.value = data.length;
    }
  } catch {
    timelineData.value = [];
  } finally {
    timelineLoading.value = false;
  }
}

// ── Load Scan Logs ──
async function loadScanLogs() {
  scanLogLoading.value = true;
  try {
    const { data } = await historyApi.getScanLogs(50);
    scanLogData.value = Array.isArray(data) ? data : (data.data ?? []);
  } catch {
    scanLogData.value = [];
  } finally {
    scanLogLoading.value = false;
  }
}

// ── Tab Change ──
function onTabChange(name: string) {
  if (name === 'scan-logs' && scanLogData.value.length === 0 && !scanLogLoading.value) {
    loadScanLogs();
  }
}

onMounted(() => {
  loadTimeline();
  loadScanLogs();
});
</script>

<style scoped>
.history-page {
  max-width: 1000px;
  margin: 0 auto;
}
</style>