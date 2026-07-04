<template>
  <div class="waste-analysis">
    <n-page-header :title="t('wasteAnalysis.title')" :subtitle="t('wasteAnalysis.subtitle')">
      <template #extra>
        <n-button size="small" @click="loadData" :loading="loading">
          <template #icon><n-icon><RefreshOutline /></n-icon></template>
          {{ t('common.refresh') }}
        </n-button>
      </template>
    </n-page-header>

    <!-- Stats Cards -->
    <div class="stats-grid" v-if="data">
      <div class="stat-card stat-danger hover-lift">
        <div class="stat-icon-wrap" style="background: var(--hh-error-light); color: var(--hh-error)">
          <n-icon :size="22"><FlameOutline /></n-icon>
        </div>
        <div class="stat-body">
          <span class="stat-label">{{ t('wasteAnalysis.totalWasted') }}</span>
          <span class="stat-value">{{ data.totalWasted }}</span>
        </div>
      </div>

      <div class="stat-card stat-warning hover-lift">
        <div class="stat-icon-wrap" style="background: var(--hh-warning-light); color: var(--hh-warning)">
          <n-icon :size="22"><CashOutline /></n-icon>
        </div>
        <div class="stat-body">
          <span class="stat-label">{{ t('wasteAnalysis.estimatedLoss') }}</span>
          <span class="stat-value">¥{{ data.estimatedLoss.toFixed(2) }}</span>
        </div>
      </div>

      <div class="stat-card stat-info hover-lift" style="grid-column: span 2;">
        <div class="stat-header">
          <span class="stat-label">{{ t('wasteAnalysis.topWastedItems') }}</span>
        </div>
        <div class="top-items-list">
          <div class="top-item" v-for="item in data.topWastedItems" :key="item.itemId">
            <span class="top-item-name">{{ item.name }}</span>
            <span class="top-item-qty">{{ item.quantity }}{{ item.unit }}</span>
          </div>
          <n-empty v-if="data.topWastedItems.length === 0" :description="t('wasteAnalysis.noWasteData')" size="small" />
        </div>
      </div>
    </div>

    <!-- Monthly Trend Chart (simple div bars) -->
    <div class="chart-section" v-if="data?.monthlyTrend?.length">
      <h2 class="section-title">{{ t('wasteAnalysis.monthlyTrend') }}</h2>
      <div class="bar-chart">
        <div class="bar-column" v-for="bar in data.monthlyTrend" :key="bar.month">
          <div class="bar-wrap">
            <div
              class="bar-fill"
              :style="{ height: getBarHeight(bar.quantity) + '%' }"
              :title="`${bar.month}: ${bar.quantity}`"
            ></div>
          </div>
          <span class="bar-label">{{ bar.month.slice(5) }}</span>
          <span class="bar-value">{{ bar.quantity }}</span>
        </div>
      </div>
    </div>

    <!-- Wasted Items Table -->
    <div class="table-section" v-if="data">
      <h2 class="section-title">{{ t('wasteAnalysis.wastedItemsTable') }}</h2>
      <n-data-table
        :columns="tableColumns"
        :data="tableData"
        :bordered="false"
        :single-line="false"
        size="small"
        :loading="loading"
      />
      <n-empty v-if="tableData.length === 0 && !loading" :description="t('wasteAnalysis.noWasteData')" class="empty-state" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { NPageHeader, NButton, NIcon, NDataTable, NEmpty } from 'naive-ui';
import type { DataTableColumn } from 'naive-ui';
import { RefreshOutline, FlameOutline, CashOutline } from '@vicons/ionicons5';
import { useI18n } from '@/locales';
import { dashboardApi } from '@/api/client';

interface WasteItem {
  itemId: number;
  name: string;
  quantity: number;
  unit: string;
}

interface TrendPoint {
  month: string;
  quantity: number;
}

interface WasteCategory {
  category: string;
  quantity: number;
}

interface WasteAnalysisData {
  totalWasted: number;
  estimatedLoss: number;
  topWastedItems: WasteItem[];
  monthlyTrend: TrendPoint[];
  wastedByCategory: WasteCategory[];
}

const { t } = useI18n();
const loading = ref(false);
const data = ref<WasteAnalysisData | null>(null);

const tableData = computed(() => {
  if (!data.value) return [];
  // Flatten wasted records into table rows from category breakdown
  return data.value.wastedByCategory.map((cat, index) => ({
    id: index,
    category: cat.category,
    quantity: cat.quantity,
  }));
});

const maxTrendQuantity = computed(() => {
  if (!data.value?.monthlyTrend?.length) return 1;
  return Math.max(...data.value.monthlyTrend.map(b => b.quantity), 1);
});

const getBarHeight = (qty: number): number => {
  return (qty / maxTrendQuantity.value) * 100;
};

const tableColumns = computed<DataTableColumn[]>(() => [
  {
    title: t('wasteAnalysis.wastedByCategory'),
    key: 'category',
    width: 180,
  },
  {
    title: t('wasteAnalysis.wastedAmount'),
    key: 'quantity',
    width: 120,
    sorter: (a: any, b: any) => a.quantity - b.quantity,
    defaultSortOrder: 'descend' as const,
  },
]);

const loadData = async () => {
  loading.value = true;
  try {
    const res = await dashboardApi.getWasteAnalysis();
    data.value = res.data as WasteAnalysisData;
  } catch (_e: unknown) {
    console.error('Failed to load waste analysis data');
  } finally {
    loading.value = false;
  }
};

onMounted(() => {
  loadData();
});
</script>

<style scoped>
.waste-analysis {
  max-width: 960px;
  margin: 0 auto;
}

/* Stats Grid */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--hh-space-4);
  margin-top: var(--hh-space-5);
  margin-bottom: var(--hh-space-5);
}

.stat-card {
  background: var(--hh-bg-card);
  border-radius: var(--hh-radius);
  padding: var(--hh-space-5);
  border: 1px solid var(--hh-border-light);
  box-shadow: var(--hh-shadow-sm);
  display: flex;
  align-items: center;
  gap: var(--hh-space-4);
}

.stat-card .stat-header {
  display: flex;
  flex-direction: column;
  gap: var(--hh-space-2);
  width: 100%;
}

.stat-icon-wrap {
  width: 44px;
  height: 44px;
  border-radius: var(--hh-radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.stat-body {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.stat-label {
  font-size: var(--hh-text-sm);
  font-weight: var(--hh-weight-medium);
  color: var(--hh-text-secondary);
}

.stat-value {
  font-size: var(--hh-text-2xl);
  font-weight: var(--hh-weight-bold);
  color: var(--hh-text);
  letter-spacing: -0.03em;
  line-height: 1;
}

/* Top Items List */
.top-items-list {
  display: flex;
  flex-direction: column;
  gap: var(--hh-space-2);
  width: 100%;
}

.top-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--hh-space-1) 0;
  border-bottom: 1px solid var(--hh-border-light);
}

.top-item:last-child {
  border-bottom: none;
}

.top-item-name {
  font-size: var(--hh-text-sm);
  font-weight: var(--hh-weight-medium);
  color: var(--hh-text);
}

.top-item-qty {
  font-size: var(--hh-text-sm);
  font-weight: var(--hh-weight-semibold);
  color: var(--hh-error);
}

/* Bar Chart */
.chart-section {
  background: var(--hh-bg-card);
  border-radius: var(--hh-radius);
  padding: var(--hh-space-5);
  border: 1px solid var(--hh-border-light);
  box-shadow: var(--hh-shadow-sm);
  margin-bottom: var(--hh-space-5);
}

.section-title {
  font-size: var(--hh-text-lg);
  font-weight: var(--hh-weight-semibold);
  color: var(--hh-text);
  margin-bottom: var(--hh-space-4);
  letter-spacing: -0.01em;
}

.bar-chart {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: var(--hh-space-2);
  height: 200px;
  padding: var(--hh-space-4) 0 0;
}

.bar-column {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  height: 100%;
  justify-content: flex-end;
}

.bar-wrap {
  width: 100%;
  max-width: 32px;
  height: 100%;
  display: flex;
  align-items: flex-end;
  justify-content: center;
}

.bar-fill {
  width: 100%;
  min-height: 2px;
  background: linear-gradient(180deg, #ef4444, #dc2626);
  border-radius: 4px 4px 0 0;
  transition: height var(--hh-transition-slow) var(--hh-easing-default);
}

.bar-label {
  font-size: var(--hh-text-xs);
  color: var(--hh-text-tertiary);
  margin-top: var(--hh-space-1);
}

.bar-value {
  font-size: var(--hh-text-xs);
  font-weight: var(--hh-weight-semibold);
  color: var(--hh-text-secondary);
}

/* Table */
.table-section {
  background: var(--hh-bg-card);
  border-radius: var(--hh-radius);
  padding: var(--hh-space-5);
  border: 1px solid var(--hh-border-light);
  box-shadow: var(--hh-shadow-sm);
  margin-bottom: var(--hh-space-5);
}

.empty-state {
  padding: var(--hh-space-8) 0;
}

.hover-lift {
  transition: transform var(--hh-transition-fast) var(--hh-easing-default),
              box-shadow var(--hh-transition-fast) var(--hh-easing-default);
}

.hover-lift:hover {
  transform: translateY(-2px);
  box-shadow: var(--hh-shadow-md);
}

@media (max-width: 768px) {
  .stats-grid {
    grid-template-columns: 1fr;
  }

  .stat-card[style*="span 2"] {
    grid-column: span 1 !important;
  }

  .bar-chart {
    height: 150px;
  }
}
</style>