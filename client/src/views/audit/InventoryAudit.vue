<template>
  <div class="audit-page">
    <n-page-header :title="t('inventoryAudit.title')" :subtitle="t('inventoryAudit.subtitle')">
      <template #extra>
        <n-space>
          <n-button v-if="!auditActive" type="primary" size="small" @click="startAudit">
            <template #icon><n-icon :size="16"><PlayOutline /></n-icon></template>
            {{ t('inventoryAudit.startAudit') }}
          </n-button>
          <n-button v-else type="success" size="small" @click="confirmComplete">
            <template #icon><n-icon :size="16"><CheckmarkCircleOutline /></n-icon></template>
            {{ t('inventoryAudit.completeAudit') }}
          </n-button>
        </n-space>
      </template>
    </n-page-header>

    <!-- Stats Cards -->
    <div class="audit-stats page-section">
      <div class="audit-stat-card" :class="{ active: auditActive }">
        <div class="stat-icon-wrap stat-icon--primary">
          <n-icon :size="20"><CubeOutline /></n-icon>
        </div>
        <div class="stat-body">
          <span class="stat-label">{{ t('inventoryAudit.totalItems') }}</span>
          <span class="stat-value">{{ auditItems.length }}</span>
        </div>
      </div>
      <div class="audit-stat-card">
        <div class="stat-icon-wrap stat-icon--info">
          <n-icon :size="20"><CheckmarkDoneOutline /></n-icon>
        </div>
        <div class="stat-body">
          <span class="stat-label">{{ t('inventoryAudit.countedItems') }}</span>
          <span class="stat-value">{{ countedCount }}</span>
        </div>
      </div>
      <div class="audit-stat-card">
        <div class="stat-icon-wrap stat-icon--success">
          <n-icon :size="20"><CheckmarkCircleOutline /></n-icon>
        </div>
        <div class="stat-body">
          <span class="stat-label">{{ t('inventoryAudit.matchedItems') }}</span>
          <span class="stat-value">{{ matchedCount }}</span>
        </div>
      </div>
      <div class="audit-stat-card">
        <div class="stat-icon-wrap stat-icon--warning">
          <n-icon :size="20"><AlertCircleOutline /></n-icon>
        </div>
        <div class="stat-body">
          <span class="stat-label">{{ t('inventoryAudit.discrepancyItems') }}</span>
          <span class="stat-value">{{ discrepancyCount }}</span>
        </div>
      </div>
    </div>

    <!-- Progress Bar -->
    <div v-if="auditActive" class="progress-section page-section">
      <div class="progress-header">
        <span class="progress-label">{{ t('inventoryAudit.auditProgress') }}</span>
        <span class="progress-percent">{{ progressPercent }}%</span>
      </div>
      <div class="progress-bar">
        <div class="progress-bar-fill" :style="{ width: progressPercent + '%' }"></div>
      </div>
    </div>

    <!-- Filters -->
    <div class="filter-bar page-section">
      <n-input
        v-model:value="searchQuery"
        :placeholder="t('common.search')"
        clearable
        size="small"
        class="search-input"
      >
        <template #prefix><n-icon :size="16"><SearchOutline /></n-icon></template>
      </n-input>
      <n-select
        v-model:value="filterCategory"
        :placeholder="t('inventoryAudit.filterByCategory')"
        :options="categoryOptions"
        clearable
        size="small"
        class="filter-select"
      />
      <n-select
        v-model:value="filterLocation"
        :placeholder="t('inventoryAudit.filterByLocation')"
        :options="locationOptions"
        clearable
        size="small"
        class="filter-select"
      />
      <n-select
        v-model:value="filterStatus"
        :placeholder="t('inventoryAudit.filterByStatus')"
        :options="statusOptions"
        clearable
        size="small"
        class="filter-select"
      />
    </div>

    <!-- Audit Table -->
    <div class="table-section page-section">
      <n-spin :show="loading">
        <n-data-table
          :columns="tableColumns"
          :data="filteredItems"
          :pagination="{ pageSize: 20 }"
          size="small"
        />
      </n-spin>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, h } from 'vue';
import {
  NPageHeader, NSpace, NButton, NIcon, NInput, NSelect, NDataTable,
  NSpin, NInputNumber, NTag, useMessage, useDialog,
} from 'naive-ui';
import type { DataTableColumns } from 'naive-ui';
import {
  PlayOutline, CheckmarkCircleOutline, CheckmarkDoneOutline,
  CubeOutline, AlertCircleOutline, SearchOutline,
} from '@vicons/ionicons5';
import { useI18n } from '@/locales';
import { stockApi, locationsApi } from '@/api/client';
import { getCategoryColor } from '@/utils/format';

interface AuditItem {
  id: number;
  name: string;
  type: string;
  unit: string;
  locationId: number | null;
  locationName: string;
  expectedQty: number;
  actualQty: number | null;
  status: 'pending' | 'matched' | 'surplus' | 'shortage';
}

const { t } = useI18n();
const message = useMessage();
const dialog = useDialog();

const loading = ref(false);
const auditActive = ref(false);
const searchQuery = ref('');
const filterCategory = ref<string | null>(null);
const filterLocation = ref<number | null>(null);
const filterStatus = ref<string | null>(null);

const auditItems = ref<AuditItem[]>([]);
const categories = ref<any[]>([]);
const locations = ref<any[]>([]);

const categoryOptions = computed(() =>
  categories.value.map(c => ({ label: `${c.icon || ''} ${c.name}`, value: c.name }))
);

const locationOptions = computed(() =>
  locations.value.map(l => ({ label: l.name, value: l.id }))
);

const statusOptions = computed(() => [
  { label: t('inventoryAudit.pending'), value: 'pending' },
  { label: t('inventoryAudit.matched'), value: 'matched' },
  { label: t('inventoryAudit.surplus'), value: 'surplus' },
  { label: t('inventoryAudit.shortage'), value: 'shortage' },
]);

const countedCount = computed(() => auditItems.value.filter(i => i.status !== 'pending').length);
const matchedCount = computed(() => auditItems.value.filter(i => i.status === 'matched').length);
const discrepancyCount = computed(() => auditItems.value.filter(i => i.status === 'surplus' || i.status === 'shortage').length);
const progressPercent = computed(() => {
  if (auditItems.value.length === 0) return 0;
  return Math.round((countedCount.value / auditItems.value.length) * 100);
});

const filteredItems = computed(() => {
  let items = auditItems.value;
  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase();
    items = items.filter(i => i.name.toLowerCase().includes(q));
  }
  if (filterCategory.value) {
    items = items.filter(i => i.type === filterCategory.value);
  }
  if (filterLocation.value !== null) {
    items = items.filter(i => i.locationId === filterLocation.value);
  }
  if (filterStatus.value) {
    items = items.filter(i => i.status === filterStatus.value);
  }
  return items;
});

function getStatusTag(status: string) {
  const config: Record<string, { type: 'default' | 'success' | 'warning' | 'error'; label: string }> = {
    pending: { type: 'default', label: t('inventoryAudit.pending') },
    matched: { type: 'success', label: t('inventoryAudit.matched') },
    surplus: { type: 'warning', label: t('inventoryAudit.surplus') },
    shortage: { type: 'error', label: t('inventoryAudit.shortage') },
  };
  const cfg = config[status] || config.pending;
  return h(NTag, { size: 'small', round: true, bordered: false, type: cfg.type }, { default: () => cfg.label });
}

function getDifferenceText(row: AuditItem): string {
  if (row.actualQty === null) return '-';
  const diff = row.actualQty - row.expectedQty;
  if (diff === 0) return '0';
  return diff > 0 ? `+${diff}` : `${diff}`;
}

function getDifferenceColor(row: AuditItem): string {
  if (row.actualQty === null) return 'var(--hh-text-tertiary)';
  const diff = row.actualQty - row.expectedQty;
  if (diff === 0) return 'var(--hh-success)';
  if (diff > 0) return 'var(--hh-warning)';
  return 'var(--hh-error)';
}

const tableColumns: DataTableColumns<AuditItem> = [
  {
    title: t('inventoryAudit.itemName'),
    key: 'name',
    width: 200,
    render: (row) => h('span', { style: 'font-weight: 500' }, row.name),
  },
  {
    title: t('inventoryAudit.category'),
    key: 'type',
    width: 100,
    render: (row) => h(NTag, {
      size: 'small', round: true, bordered: false, type: getCategoryColor(row.type),
    }, { default: () => row.type }),
  },
  {
    title: t('inventoryAudit.location'),
    key: 'locationName',
    width: 120,
    render: (row) => row.locationName || '-',
  },
  {
    title: t('inventoryAudit.expectedQty'),
    key: 'expectedQty',
    width: 100,
    align: 'center',
    render: (row) => h('span', { style: 'font-weight: 500' }, `${row.expectedQty} ${row.unit}`),
  },
  {
    title: t('inventoryAudit.actualQty'),
    key: 'actualQty',
    width: 140,
    align: 'center',
    render: (row) => {
      if (!auditActive.value) {
        return h('span', { style: 'color: var(--hh-text-tertiary)' }, '-');
      }
      return h(NInputNumber, {
        value: row.actualQty,
        size: 'small',
        min: 0,
        placeholder: t('inventoryAudit.enterActualQty'),
        style: 'width: 100px',
        onUpdateValue: (val: number | null) => {
          row.actualQty = val;
          updateStatus(row);
        },
      });
    },
  },
  {
    title: t('inventoryAudit.difference'),
    key: 'difference',
    width: 80,
    align: 'center',
    render: (row) => h('span', {
      style: { fontWeight: '600', color: getDifferenceColor(row) },
    }, getDifferenceText(row)),
  },
  {
    title: t('inventoryAudit.status'),
    key: 'status',
    width: 90,
    align: 'center',
    render: (row) => getStatusTag(row.status),
  },
];

function updateStatus(row: AuditItem) {
  if (row.actualQty === null) {
    row.status = 'pending';
  } else if (row.actualQty === row.expectedQty) {
    row.status = 'matched';
  } else if (row.actualQty > row.expectedQty) {
    row.status = 'surplus';
  } else {
    row.status = 'shortage';
  }
}

async function startAudit() {
  auditActive.value = true;
  auditItems.value.forEach(item => {
    item.actualQty = null;
    item.status = 'pending';
  });
  message.info(t('inventoryAudit.startAudit'));
}

function confirmComplete() {
  const uncounted = auditItems.value.filter(i => i.status === 'pending').length;
  dialog.warning({
    title: t('inventoryAudit.confirmComplete'),
    content: uncounted > 0
      ? `${t('inventoryAudit.confirmCompleteMsg')} (${uncounted} ${t('inventoryAudit.pending')})`
      : t('inventoryAudit.confirmCompleteMsg'),
    positiveText: t('inventoryAudit.completeAudit'),
    negativeText: t('common.cancel'),
    onPositiveClick: () => {
      completeAudit();
    },
  });
}

function completeAudit() {
  const total = auditItems.value.length;
  const diff = discrepancyCount.value;
  message.success(t('inventoryAudit.auditCompleteDesc', { total, diff }));
  auditActive.value = false;
  auditItems.value.forEach(item => {
    item.actualQty = null;
    item.status = 'pending';
  });
}

async function loadData() {
  loading.value = true;
  try {
    const [stockRes, locRes] = await Promise.all([
      stockApi.list().catch(() => ({ data: [] })),
      locationsApi.list().catch(() => ({ data: [] })),
    ]);

    const items = stockRes.data || [];
    const locs = locRes.data || [];

    locations.value = locs;

    const catMap = new Map<string, any>();
    for (const item of items) {
      if (item.type && !catMap.has(item.type)) {
        catMap.set(item.type, { name: item.type, icon: '' });
      }
    }
    categories.value = Array.from(catMap.values());

    auditItems.value = items.map((item: any) => ({
      id: item.id,
      name: item.name,
      type: item.type || 'generic',
      unit: item.unit || '',
      locationId: item.locationId,
      locationName: locs.find((l: any) => l.id === item.locationId)?.name || '',
      expectedQty: item.quantity || 0,
      actualQty: null,
      status: 'pending' as const,
    }));
  } catch (e) {
    console.error('Failed to load audit data');
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  loadData();
});
</script>

<style scoped>
.audit-page {
  max-width: 1200px;
  margin: 0 auto;
}

.audit-stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--hh-space-4);
}

.audit-stat-card {
  display: flex;
  align-items: center;
  gap: var(--hh-space-3);
  padding: var(--hh-space-4);
  background: var(--hh-bg-card);
  border-radius: var(--hh-radius);
  border: 1px solid var(--hh-border-light);
  box-shadow: var(--hh-shadow-sm);
  transition: all var(--hh-transition-normal) var(--hh-easing-default);
}

.audit-stat-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--hh-shadow-md);
}

.stat-icon-wrap {
  width: 40px;
  height: 40px;
  border-radius: var(--hh-radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.stat-icon--primary { background: var(--hh-primary-light); color: var(--hh-primary); }
.stat-icon--info { background: var(--hh-bg-secondary); color: var(--hh-info); }
.stat-icon--success { background: var(--hh-success-light); color: var(--hh-success); }
.stat-icon--warning { background: var(--hh-warning-light); color: var(--hh-warning); }

.stat-body {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.stat-label {
  font-size: var(--hh-text-xs);
  color: var(--hh-text-secondary);
  font-weight: var(--hh-weight-medium);
}

.stat-value {
  font-size: var(--hh-text-xl);
  font-weight: var(--hh-weight-bold);
  color: var(--hh-text);
  line-height: 1;
}

/* Progress */
.progress-section {
  background: var(--hh-bg-card);
  border-radius: var(--hh-radius);
  border: 1px solid var(--hh-border-light);
  padding: var(--hh-space-4);
}

.progress-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--hh-space-2);
}

.progress-label {
  font-size: var(--hh-text-sm);
  font-weight: var(--hh-weight-semibold);
  color: var(--hh-text);
}

.progress-percent {
  font-size: var(--hh-text-lg);
  font-weight: var(--hh-weight-bold);
  color: var(--hh-primary);
}

.progress-bar {
  height: 8px;
  background: var(--hh-bg-secondary);
  border-radius: 4px;
  overflow: hidden;
}

.progress-bar-fill {
  height: 100%;
  background: var(--hh-gradient-primary);
  border-radius: 4px;
  transition: width var(--hh-transition-slow) var(--hh-easing-default);
}

/* Filters */
.filter-bar {
  display: flex;
  align-items: center;
  gap: var(--hh-space-3);
  padding: var(--hh-space-3) var(--hh-space-4);
  background: var(--hh-bg-card);
  border-radius: var(--hh-radius);
  border: 1px solid var(--hh-border-light);
  box-shadow: var(--hh-shadow-sm);
}

.search-input {
  flex: 1;
  min-width: 200px;
}

.filter-select {
  width: 150px;
}

/* Table */
.table-section {
  background: var(--hh-bg-card);
  border-radius: var(--hh-radius);
  border: 1px solid var(--hh-border-light);
  box-shadow: var(--hh-shadow-sm);
  padding: var(--hh-space-3);
}

/* Responsive */
@media (max-width: 768px) {
  .audit-stats {
    grid-template-columns: repeat(2, 1fr);
  }

  .filter-bar {
    flex-wrap: wrap;
  }

  .search-input {
    min-width: 100%;
  }

  .filter-select {
    width: 120px;
  }
}
</style>
