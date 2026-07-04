<template>
  <div class="report-page">
    <n-page-header title="位置报表" subtitle="按存放位置统计库存" />

    <!-- Summary -->
    <div class="stats-grid page-section">
      <div class="stat-card">
        <div class="stat-label">总物品数</div>
        <div class="stat-value">{{ report?.totalItems || 0 }}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">总库存价值</div>
        <div class="stat-value">¥{{ report?.totalValue?.toFixed(2) || '0.00' }}</div>
      </div>
    </div>

    <!-- Location List -->
    <div class="report-section page-section">
      <h3 class="section-title">各位置库存</h3>
      <div v-if="report?.locations?.length" class="location-list">
        <div
          v-for="loc in report.locations"
          :key="loc.locationId"
          class="location-card"
        >
          <div class="location-header">
            <span class="location-name">{{ loc.name }}</span>
            <span class="location-value">¥{{ loc.totalValue.toFixed(2) }}</span>
          </div>
          <div class="location-stats">
            <span class="location-stat">{{ loc.itemCount }} 个物品</span>
            <span class="location-stat">总量: {{ loc.totalQuantity }}</span>
          </div>
          <div class="location-bar">
            <div
              class="location-bar-fill"
              :style="{ width: getLocPercent(loc.totalValue) + '%' }"
            />
          </div>
        </div>
      </div>
      <n-empty v-else description="暂无数据" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { NPageHeader, NEmpty } from 'naive-ui';
import { dashboardApi } from '@/api/client';

const report = ref<any>(null);

function getLocPercent(value: number): number {
  if (!report.value?.locations?.length) return 0;
  const max = Math.max(...report.value.locations.map((l: any) => l.totalValue));
  return max > 0 ? (value / max) * 100 : 0;
}

async function loadData() {
  try {
    const { data } = await dashboardApi.getLocationReport();
    report.value = data;
  } catch {
    report.value = null;
  }
}

onMounted(loadData);
</script>

<style scoped>
.report-page { max-width: 1000px; margin: 0 auto; }
.stats-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: var(--hh-space-4); }
.stat-card { background: var(--hh-bg-card); border: 1px solid var(--hh-border-light); border-radius: var(--hh-radius); padding: var(--hh-space-4); }
.stat-label { font-size: var(--hh-text-sm); color: var(--hh-text-secondary); margin-bottom: 4px; }
.stat-value { font-size: var(--hh-text-2xl); font-weight: var(--hh-weight-bold); color: var(--hh-text); }
.report-section { background: var(--hh-bg-card); border: 1px solid var(--hh-border-light); border-radius: var(--hh-radius); padding: var(--hh-space-4); }
.section-title { font-size: var(--hh-text-base); font-weight: var(--hh-weight-semibold); margin: 0 0 var(--hh-space-3) 0; }
.location-list { display: flex; flex-direction: column; gap: var(--hh-space-3); }
.location-card { padding: var(--hh-space-3); border: 1px solid var(--hh-border-light); border-radius: var(--hh-radius); }
.location-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; }
.location-name { font-weight: 600; color: var(--hh-text); }
.location-value { font-weight: 600; color: var(--hh-success); }
.location-stats { display: flex; gap: var(--hh-space-3); margin-bottom: 8px; }
.location-stat { font-size: var(--hh-text-xs); color: var(--hh-text-secondary); }
.location-bar { height: 6px; background: var(--hh-bg-secondary); border-radius: 3px; overflow: hidden; }
.location-bar-fill { height: 100%; background: var(--hh-gradient-primary); border-radius: 3px; transition: width 0.3s; }
</style>
