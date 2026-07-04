<template>
  <div class="report-page">
    <n-page-header title="支出报表" subtitle="统计消费支出与趋势" />

    <!-- Date Range Filter -->
    <div class="filter-bar page-section">
      <n-date-picker
        v-model:value="dateRange"
        type="daterange"
        clearable
        size="small"
        style="width: 300px"
      />
      <n-button size="small" @click="loadData">刷新</n-button>
    </div>

    <!-- Summary Cards -->
    <div class="stats-grid page-section">
      <div class="stat-card">
        <div class="stat-label">总支出</div>
        <div class="stat-value">¥{{ report?.totalSpending?.toFixed(2) || '0.00' }}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">消耗次数</div>
        <div class="stat-value">{{ report?.transactionCount || 0 }}</div>
      </div>
    </div>

    <!-- Spending by Category -->
    <div class="report-section page-section">
      <h3 class="section-title">按分类支出</h3>
      <div v-if="report?.spendingByCategory?.length" class="bar-chart">
        <div
          v-for="item in report.spendingByCategory"
          :key="item.category"
          class="bar-row"
        >
          <span class="bar-label">{{ item.category }}</span>
          <div class="bar-track">
            <div
              class="bar-fill"
              :style="{ width: getCategoryPercent(item.amount) + '%' }"
            />
          </div>
          <span class="bar-value">¥{{ item.amount.toFixed(2) }}</span>
        </div>
      </div>
      <n-empty v-else description="暂无数据" />
    </div>

    <!-- Top Items -->
    <div class="report-section page-section">
      <h3 class="section-title">支出 Top 10</h3>
      <n-data-table
        v-if="report?.topItems?.length"
        :columns="topItemColumns"
        :data="report.topItems"
        :bordered="false"
        size="small"
      />
      <n-empty v-else description="暂无数据" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { NPageHeader, NDataTable, NEmpty, NDatePicker, NButton } from 'naive-ui';
import type { DataTableColumns } from 'naive-ui';
import { h } from 'vue';
import { dashboardApi } from '@/api/client';

const dateRange = ref<[number, number] | null>(null);
const report = ref<any>(null);

const topItemColumns: DataTableColumns<any> = [
  { title: '物品', key: 'name', ellipsis: { tooltip: true } },
  { title: '消耗量', key: 'quantity', width: 80 },
  { title: '支出', key: 'amount', width: 100, render: (row) => h('span', { style: 'color: var(--hh-error); font-weight: 500' }, `¥${row.amount.toFixed(2)}`) },
];

function getCategoryPercent(amount: number): number {
  if (!report.value?.spendingByCategory?.length) return 0;
  const max = Math.max(...report.value.spendingByCategory.map((i: any) => i.amount));
  return max > 0 ? (amount / max) * 100 : 0;
}

async function loadData() {
  try {
    const startDate = dateRange.value ? new Date(dateRange.value[0]).toISOString() : undefined;
    const endDate = dateRange.value ? new Date(dateRange.value[1]).toISOString() : undefined;
    const { data } = await dashboardApi.getSpendingReport(startDate, endDate);
    report.value = data;
  } catch {
    report.value = null;
  }
}

onMounted(loadData);
</script>

<style scoped>
.report-page { max-width: 1000px; margin: 0 auto; }
.filter-bar { display: flex; align-items: center; gap: var(--hh-space-3); }
.stats-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: var(--hh-space-4); }
.stat-card { background: var(--hh-bg-card); border: 1px solid var(--hh-border-light); border-radius: var(--hh-radius); padding: var(--hh-space-4); }
.stat-label { font-size: var(--hh-text-sm); color: var(--hh-text-secondary); margin-bottom: 4px; }
.stat-value { font-size: var(--hh-text-2xl); font-weight: var(--hh-weight-bold); color: var(--hh-text); }
.report-section { background: var(--hh-bg-card); border: 1px solid var(--hh-border-light); border-radius: var(--hh-radius); padding: var(--hh-space-4); }
.section-title { font-size: var(--hh-text-base); font-weight: var(--hh-weight-semibold); margin: 0 0 var(--hh-space-3) 0; }
.bar-chart { display: flex; flex-direction: column; gap: var(--hh-space-2); }
.bar-row { display: flex; align-items: center; gap: var(--hh-space-3); }
.bar-label { font-size: var(--hh-text-sm); min-width: 80px; color: var(--hh-text-secondary); }
.bar-track { flex: 1; height: 20px; background: var(--hh-bg-secondary); border-radius: 4px; overflow: hidden; }
.bar-fill { height: 100%; background: var(--hh-gradient-primary); border-radius: 4px; transition: width 0.3s; }
.bar-value { font-size: var(--hh-text-sm); font-weight: 500; min-width: 80px; text-align: right; }
</style>
