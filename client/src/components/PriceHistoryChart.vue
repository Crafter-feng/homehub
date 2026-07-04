<template>
  <div class="price-history-chart">
    <div class="price-section" v-if="priceHistory">
      <!-- 价格概览卡片 -->
      <div class="price-overview">
        <div class="price-stat">
          <span class="price-stat-label">当前价格</span>
          <span class="price-stat-value price-primary">¥{{ priceHistory.currentPrice || '-' }}</span>
        </div>
        <div class="price-stat">
          <span class="price-stat-label">平均价格</span>
          <span class="price-stat-value">¥{{ priceHistory.avgPrice ? priceHistory.avgPrice.toFixed(2) : '-' }}</span>
        </div>
        <div class="price-stat">
          <span class="price-stat-label">最低价格</span>
          <span class="price-stat-value price-success">¥{{ priceHistory.minPrice || '-' }}</span>
        </div>
        <div class="price-stat">
          <span class="price-stat-label">最高价格</span>
          <span class="price-stat-value price-danger">¥{{ priceHistory.maxPrice || '-' }}</span>
        </div>
      </div>

      <!-- 价格趋势折线图 -->
      <div class="price-chart" v-if="priceHistory.history && priceHistory.history.length > 0">
        <h4 class="chart-title">价格趋势</h4>
        <div class="chart-legend" v-if="storeColors.length > 0">
          <span v-for="store in storeColors" :key="store.name" class="legend-item">
            <span class="legend-dot" :style="{ background: store.color }"></span>
            {{ store.name || '未指定' }}
          </span>
        </div>
        <div class="chart-container">
          <svg :viewBox="`0 0 ${chartWidth} ${chartHeight}`" class="line-chart">
            <text v-for="(tick, idx) in yTicks" :key="'y'+idx"
              :x="chartPadding.left - 6" :y="tick.y + 3"
              text-anchor="end" class="axis-label">¥{{ tick.value }}</text>
            <text v-for="(tick, idx) in xTicks" :key="'x'+idx"
              :x="tick.x" :y="chartHeight - 4"
              text-anchor="middle" class="axis-label">{{ tick.label }}</text>
            <line v-for="(tick, idx) in yTicks" :key="'gy'+idx"
              :x1="chartPadding.left" :y1="tick.y" :x2="chartWidth - chartPadding.right" :y2="tick.y"
              stroke="#e0e0e6" stroke-width="0.5" stroke-dasharray="3,3" />
            <polyline v-for="(line, idx) in chartLines" :key="'line'+idx"
              :points="line.points"
              fill="none" :stroke="line.color" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
            <circle v-for="(point, idx) in chartPoints" :key="'pt'+idx"
              :cx="point.x" :cy="point.y" r="3" :fill="point.color" stroke="white" stroke-width="1.5" />
          </svg>
        </div>
      </div>

      <n-empty v-else description="暂无价格记录" />
    </div>
    <n-empty v-else description="加载中..." />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { NEmpty } from 'naive-ui';
import { stockApi } from '@/api/client';

const props = defineProps<{
  itemId: number;
}>();

const priceHistory = ref<any>(null);

// Chart constants
const chartWidth = 320;
const chartHeight = 150;
const chartPadding = { top: 12, right: 12, bottom: 24, left: 40 };

const storeColorPalette = [
  '#409EFF', '#67C23A', '#E6A23C', '#F56C6C',
  '#909399', '#00CED1', '#FF69B4', '#8B4513',
];

const loadPriceHistory = async () => {
  if (!props.itemId) return;
  try {
    const res = await stockApi.getPriceHistory(props.itemId);
    priceHistory.value = res.data;
  } catch {
    priceHistory.value = null;
  }
};

const formatDateShort = (dateStr: string | Date): string => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return `${d.getMonth() + 1}/${d.getDate()}`;
};

const storeColors = computed(() => {
  if (!priceHistory.value?.history) return [];
  const stores = new Set<string>();
  priceHistory.value.history.forEach((r: any) => stores.add(r.store ?? ''));
  return Array.from(stores).map((name, idx) => ({
    name,
    color: storeColorPalette[idx % storeColorPalette.length],
  }));
});

const priceRange = computed(() => {
  if (!priceHistory.value?.history?.length) return { min: 0, max: 100 };
  const prices = priceHistory.value.history.map((r: any) => r.price).filter((p: any) => p != null);
  if (prices.length === 0) return { min: 0, max: 100 };
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const padding = (max - min) * 0.1 || 10;
  return { min: Math.max(0, min - padding), max: max + padding };
});

const yTicks = computed(() => {
  const { min, max } = priceRange.value;
  const ticks = [];
  const steps = 4;
  for (let i = 0; i <= steps; i++) {
    const value = min + (max - min) * (i / steps);
    const y = chartPadding.top + (chartHeight - chartPadding.top - chartPadding.bottom) * (1 - i / steps);
    ticks.push({ value: value.toFixed(value >= 10 ? 0 : 1), y });
  }
  return ticks;
});

const xTicks = computed(() => {
  if (!priceHistory.value?.history?.length) return [];
  const history = [...priceHistory.value.history].reverse().filter((r: any) => r.price != null);
  if (history.length === 0) return [];
  const ticks = [];
  const maxTicks = Math.min(history.length, 5);
  for (let i = 0; i < maxTicks; i++) {
    const idx = Math.floor(i * (history.length - 1) / Math.max(maxTicks - 1, 1));
    const x = chartPadding.left + (chartWidth - chartPadding.left - chartPadding.right) * idx / Math.max(history.length - 1, 1);
    ticks.push({ label: formatDateShort(history[idx].date), x });
  }
  return ticks;
});

const chartLines = computed(() => {
  if (!priceHistory.value?.history?.length) return [];
  const history = [...priceHistory.value.history].reverse();
  const { min, max } = priceRange.value;

  const storeData = new Map<string, Array<any>>();
  history.forEach((r: any) => {
    if (r.price == null) return;
    const storeKey = r.store ?? '';
    if (!storeData.has(storeKey)) storeData.set(storeKey, []);
    storeData.get(storeKey)!.push(r);
  });

  const lines: Array<{ points: string; color: string }> = [];
  storeColors.value.forEach(({ name, color }) => {
    const data = storeData.get(name) || [];
    if (data.length < 2) return;

    const allWithPrice = history.filter((r: any) => r.price != null);
    const points = data.map((r: any) => {
      const idx = allWithPrice.indexOf(r);
      const x = chartPadding.left + (chartWidth - chartPadding.left - chartPadding.right) * idx / Math.max(allWithPrice.length - 1, 1);
      const y = chartPadding.top + (chartHeight - chartPadding.top - chartPadding.bottom) * (1 - (r.price - min) / (max - min));
      return `${x},${y}`;
    }).join(' ');

    lines.push({ points, color });
  });

  return lines;
});

const chartPoints = computed(() => {
  if (!priceHistory.value?.history?.length) return [];
  const history = [...priceHistory.value.history].reverse();
  const { min, max } = priceRange.value;
  const allWithPrice = history.filter((r: any) => r.price != null);

  const storeColorMap = new Map(storeColors.value.map(s => [s.name, s.color]));
  const points: Array<{ x: number; y: number; color: string }> = [];

  allWithPrice.forEach((r: any, idx: number) => {
    const x = chartPadding.left + (chartWidth - chartPadding.left - chartPadding.right) * idx / Math.max(allWithPrice.length - 1, 1);
    const y = chartPadding.top + (chartHeight - chartPadding.top - chartPadding.bottom) * (1 - (r.price - min) / (max - min));
    points.push({ x, y, color: storeColorMap.get(r.store ?? '') || '#909399' });
  });

  return points;
});

watch(() => props.itemId, () => loadPriceHistory(), { immediate: true });
</script>

<style scoped>
.price-history-chart {
  width: 100%;
}

.price-section {
  display: flex;
  flex-direction: column;
  gap: var(--hh-space-4);
}

.price-overview {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--hh-space-3);
}

.price-stat {
  text-align: center;
}

.price-stat-label {
  font-size: var(--hh-text-xs);
  color: var(--hh-text-tertiary);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.price-stat-value {
  display: block;
  font-size: var(--hh-text-lg);
  font-weight: var(--hh-weight-bold);
  color: var(--hh-text);
  margin-top: var(--hh-space-1);
}

.price-primary { color: var(--hh-primary); }
.price-success { color: var(--hh-success); }
.price-danger { color: var(--hh-error); }

.price-chart {
  border-top: 1px solid var(--hh-border-light);
  padding-top: var(--hh-space-4);
}

.chart-title {
  font-size: var(--hh-text-sm);
  font-weight: var(--hh-weight-semibold);
  color: var(--hh-text-secondary);
  margin-bottom: var(--hh-space-3);
}

.chart-legend {
  display: flex;
  gap: var(--hh-space-4);
  margin-bottom: var(--hh-space-3);
  flex-wrap: wrap;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: var(--hh-space-1);
  font-size: var(--hh-text-xs);
  color: var(--hh-text-secondary);
}

.legend-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.chart-container {
  width: 100%;
}

.line-chart {
  width: 100%;
  height: auto;
}

.axis-label {
  font-size: 9px;
  fill: var(--hh-text-tertiary);
  font-family: inherit;
}

@media (max-width: 480px) {
  .price-overview {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
