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
        <!-- Filter Bar -->
        <div class="filter-bar">
          <n-select
            v-model:value="filterType"
            :options="typeOptions"
            clearable
            size="small"
            placeholder="操作类型"
            style="width: 120px"
          />
          <n-select
            v-model:value="filterSource"
            :options="sourceOptions"
            clearable
            size="small"
            placeholder="来源"
            style="width: 120px"
          />
          <n-select
            v-model:value="filterItemId"
            :options="itemOptions"
            clearable
            filterable
            size="small"
            placeholder="物品"
            style="width: 180px"
          />
          <n-button v-if="hasFilters" size="small" quaternary @click="clearFilters">
            清除
          </n-button>
        </div>

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

      <n-tab-pane name="summary" :tab="'汇总'">
        <div v-if="summaryLoading" style="padding: 24px; text-align: center;">
          <n-spin size="small" />
        </div>
        <div v-else class="summary-grid">
          <!-- By Type -->
          <div class="summary-card">
            <h4 class="summary-card-title">按操作类型</h4>
            <div class="summary-list">
              <div v-for="item in summaryData?.byType" :key="item.type" class="summary-row">
                <n-tag :type="getTypeTag(item.type)" size="small">{{ getTypeLabel(item.type) }}</n-tag>
                <span class="summary-count">{{ item.count }} 次</span>
                <span class="summary-qty">{{ item.totalQuantity }} 总量</span>
              </div>
              <div v-if="!summaryData?.byType?.length" class="summary-empty">暂无数据</div>
            </div>
          </div>

          <!-- By User -->
          <div class="summary-card">
            <h4 class="summary-card-title">按操作用户</h4>
            <div class="summary-list">
              <div v-for="item in summaryData?.byUser" :key="item.userId" class="summary-row">
                <span class="summary-user">{{ item.userName || '用户#' + item.userId }}</span>
                <span class="summary-count">{{ item.count }} 次</span>
              </div>
              <div v-if="!summaryData?.byUser?.length" class="summary-empty">暂无数据</div>
            </div>
          </div>

          <!-- By Item (Top 10) -->
          <div class="summary-card summary-card--wide">
            <h4 class="summary-card-title">按物品 (Top 10)</h4>
            <div class="summary-list">
              <div v-for="item in summaryData?.byItem" :key="item.itemId" class="summary-row">
                <span class="summary-item-name">{{ item.itemName }}</span>
                <span class="summary-count">{{ item.count }} 次</span>
                <span class="summary-qty">{{ item.totalQuantity }} 总量</span>
              </div>
              <div v-if="!summaryData?.byItem?.length" class="summary-empty">暂无数据</div>
            </div>
          </div>
        </div>
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
import { ref, computed, reactive, onMounted, h, watch } from 'vue';
import {
  NPageHeader, NTabs, NTabPane, NDataTable, NTag, NEmpty,
  NSelect, NButton, NSpin,
} from 'naive-ui';
import type { DataTableColumns } from 'naive-ui';
import { useI18n } from '@/locales';
import { historyApi, stockApi } from '@/api/client';

const { t } = useI18n();

// ── Filter State ──
const filterType = ref<string | null>(null);
const filterSource = ref<string | null>(null);
const filterItemId = ref<number | null>(null);

const hasFilters = computed(() => filterType.value || filterSource.value || filterItemId.value);

const typeOptions = [
  { label: '入库', value: 'add' },
  { label: '消耗', value: 'consume' },
  { label: '转移', value: 'transfer' },
  { label: '调整', value: 'adjust' },
];

const sourceOptions = [
  { label: '手动', value: 'manual' },
  { label: '条码', value: 'barcode' },
  { label: 'NFC', value: 'nfc' },
  { label: 'RFID', value: 'rfid' },
  { label: '语音', value: 'voice' },
  { label: '视觉', value: 'vision' },
  { label: 'AI', value: 'mcp' },
];

const itemOptions = ref<Array<{ label: string; value: number }>>([]);

function clearFilters() {
  filterType.value = null;
  filterSource.value = null;
  filterItemId.value = null;
}

function getTypeLabel(type: string): string {
  const map: Record<string, string> = { add: '入库', consume: '消耗', transfer: '转移', adjust: '调整' };
  return map[type] || type;
}

function getTypeTag(type: string): 'success' | 'warning' | 'info' | 'primary' {
  const map: Record<string, 'success' | 'warning' | 'info' | 'primary'> = {
    add: 'success', consume: 'warning', transfer: 'info', adjust: 'primary',
  };
  return map[type] || 'default';
}

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

// ── Summary State ──
const summaryLoading = ref(false);
const summaryData = ref<any>(null);

// ── Scan Logs State ──
const scanLogLoading = ref(false);
const scanLogData = ref<any[]>([]);

// ── Type/Source label maps ──
const typeLabelMap: Record<string, string> = {
  add: 'history.add', consume: 'history.consume', transfer: 'history.transfer', adjust: 'history.adjust',
};
const sourceLabelMap: Record<string, string> = {
  manual: 'history.manual', barcode: 'history.barcode', nfc: 'history.nfc', rfid: 'history.rfid',
  voice: 'history.voice', vision: 'history.vision', mcp: 'history.mcp',
};
const typeTagTypeMap: Record<string, string> = {
  add: 'success', consume: 'warning', transfer: 'info', adjust: 'primary',
};

function formatTs(ts: string | number | Date): string {
  if (!ts) return '-';
  const d = new Date(ts);
  return d.toLocaleString('zh-CN', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
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
    title: '数量',
    key: 'quantity',
    width: 80,
    render: (row) => `${row.quantity} ${row.unit || ''}`,
  },
  {
    title: () => t('history.source'),
    key: 'source',
    width: 80,
    render: (row) => sourceLabelMap[row.source] ? t(sourceLabelMap[row.source]) : (row.source || '-'),
  },
  {
    title: '操作人',
    key: 'userName',
    width: 90,
    render: (row) => row.userName || row.userId || '-',
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
    title: '操作人',
    key: 'userName',
    width: 80,
    render: (row) => row.userName || row.userId || '-',
  },
];

// ── Load Timeline with filters ──
async function loadTimeline(page = 1) {
  timelineLoading.value = true;
  timelinePage.value = page;
  try {
    const params: Record<string, any> = { page, limit: timelineLimit };
    if (filterType.value) params.type = filterType.value;
    if (filterSource.value) params.source = filterSource.value;
    if (filterItemId.value) params.itemId = filterItemId.value;

    const { data } = await historyApi.getTimeline(params);
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

// ── Load Summary ──
async function loadSummary() {
  summaryLoading.value = true;
  try {
    const { data } = await historyApi.getJournalSummary();
    summaryData.value = data;
  } catch {
    summaryData.value = null;
  } finally {
    summaryLoading.value = false;
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
  if (name === 'summary' && !summaryData.value && !summaryLoading.value) {
    loadSummary();
  }
  if (name === 'scan-logs' && scanLogData.value.length === 0 && !scanLogLoading.value) {
    loadScanLogs();
  }
}

// Watch filters to reload
watch([filterType, filterSource, filterItemId], () => {
  loadTimeline(1);
});

onMounted(async () => {
  loadTimeline();
  // Load items for filter dropdown
  try {
    const { data } = await stockApi.list({ limit: 200 });
    const items = data.data ?? data ?? [];
    itemOptions.value = items.map((i: any) => ({ label: i.name, value: i.id }));
  } catch { /* ignore */ }
});
</script>

<style scoped>
.history-page {
  max-width: 1000px;
  margin: 0 auto;
}

.filter-bar {
  display: flex;
  align-items: center;
  gap: var(--hh-space-3);
  margin-bottom: var(--hh-space-4);
  padding: var(--hh-space-3) var(--hh-space-4);
  background: var(--hh-bg-card);
  border-radius: var(--hh-radius);
  border: 1px solid var(--hh-border-light);
}

.summary-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--hh-space-4);
}

.summary-card {
  background: var(--hh-bg-card);
  border-radius: var(--hh-radius);
  border: 1px solid var(--hh-border-light);
  padding: var(--hh-space-4);
}

.summary-card--wide {
  grid-column: 1 / -1;
}

.summary-card-title {
  font-size: var(--hh-text-sm);
  font-weight: var(--hh-weight-semibold);
  color: var(--hh-text);
  margin: 0 0 var(--hh-space-3) 0;
}

.summary-list {
  display: flex;
  flex-direction: column;
  gap: var(--hh-space-2);
}

.summary-row {
  display: flex;
  align-items: center;
  gap: var(--hh-space-3);
  padding: var(--hh-space-2) 0;
  border-bottom: 1px solid var(--hh-border-light);
}

.summary-row:last-child {
  border-bottom: none;
}

.summary-count {
  font-size: var(--hh-text-sm);
  color: var(--hh-text-secondary);
  margin-left: auto;
}

.summary-qty {
  font-size: var(--hh-text-xs);
  color: var(--hh-text-tertiary);
  min-width: 60px;
  text-align: right;
}

.summary-user {
  font-size: var(--hh-text-sm);
  font-weight: 500;
  color: var(--hh-text);
}

.summary-item-name {
  font-size: var(--hh-text-sm);
  font-weight: 500;
  color: var(--hh-text);
}

.summary-empty {
  font-size: var(--hh-text-sm);
  color: var(--hh-text-tertiary);
  text-align: center;
  padding: var(--hh-space-4);
}

@media (max-width: 768px) {
  .summary-grid {
    grid-template-columns: 1fr;
  }
}
</style>
