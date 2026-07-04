<template>
  <n-modal
    :show="show"
    @update:show="$emit('update:show', $event)"
    preset="card"
    :title="item?.name || ''"
    style="width: 95vw; max-width: 600px"
    :segmented="{ content: true, footer: true }"
    :mask-closable="true"
    :close-on-esc="true"
  >
    <n-spin :show="loading">
      <div v-if="item" class="item-detail-content">
        <!-- 标签行 -->
        <div class="detail-tags">
          <n-tag size="small" round :bordered="false" :type="getCategoryColor(item.type)">
            {{ item.type }}
          </n-tag>
          <n-tag v-if="isExpired" size="small" round :bordered="false" type="error">已过期</n-tag>
          <n-tag v-else-if="isExpiringSoon" size="small" round :bordered="false" type="warning">即将过期</n-tag>
          <n-tag v-if="isLowStock" size="small" round :bordered="false" type="warning">低库存</n-tag>
        </div>

        <!-- Tabs -->
        <n-tabs type="line" animated default-value="info" style="margin-top: 12px">
          <n-tab-pane name="info" tab="物品信息">
            <div class="stat-row">
          <div class="detail-stat">
            <span class="detail-stat-label">数量</span>
            <span class="detail-stat-value">{{ item.quantity }} {{ item.unit }}</span>
            <span class="detail-stat-sub" v-if="item.minStock">最低 {{ item.minStock }}</span>
          </div>
          <div class="detail-stat">
            <span class="detail-stat-label">位置</span>
            <span class="detail-stat-value">{{ getLocationName(item.locationId) }}</span>
          </div>
          <div class="detail-stat">
            <span class="detail-stat-label">保质期</span>
            <span class="detail-stat-value" :class="{ 'text-danger': isExpired }">
              {{ item.expiryDate ? formatDate(item.expiryDate) : '无' }}
            </span>
          </div>
        </div>

        <div class="detail-grid">
          <div class="detail-section">
            <h3 class="detail-section-title">购买信息</h3>
            <div class="detail-field">
              <span class="detail-field-label">购买价格</span>
              <span class="detail-field-value">{{ item.purchasePrice ? `¥${item.purchasePrice}` : '-' }}</span>
            </div>
            <div class="detail-field">
              <span class="detail-field-label">购买日期</span>
              <span class="detail-field-value">{{ item.purchaseDate ? formatDate(item.purchaseDate) : '-' }}</span>
            </div>
            <div class="detail-field">
              <span class="detail-field-label">品牌</span>
              <span class="detail-field-value">{{ item.brand || '-' }}</span>
            </div>
            <div class="detail-field" v-if="item.shop">
              <span class="detail-field-label">商店</span>
              <span class="detail-field-value">{{ item.shop }}</span>
            </div>
          </div>
          <div class="detail-section">
            <h3 class="detail-section-title">备注</h3>
            <div class="detail-notes">{{ item.notes || '暂无备注' }}</div>
            <div class="detail-field">
              <span class="detail-field-label">条码</span>
              <span class="detail-field-value">{{ item.barcode || '-' }}</span>
            </div>
          </div>
        </div>
          </n-tab-pane>

          <!-- 价格追踪 Tab -->
          <n-tab-pane name="price" tab="价格追踪">
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
                <div class="chart-legend">
                  <span v-for="store in storeColors" :key="store.name" class="legend-item">
                    <span class="legend-dot" :style="{ background: store.color }"></span>
                    {{ store.name }}
                  </span>
                </div>
                <div class="chart-container">
                  <svg :viewBox="`0 0 ${chartWidth} ${chartHeight}`" class="line-chart">
                    <!-- Y轴标签 -->
                    <text v-for="(tick, idx) in yTicks" :key="'y'+idx"
                      :x="chartPadding.left - 8" :y="tick.y + 4"
                      text-anchor="end" class="axis-label">¥{{ tick.value }}</text>
                    <!-- X轴标签 -->
                    <text v-for="(tick, idx) in xTicks" :key="'x'+idx"
                      :x="tick.x" :y="chartHeight - 5"
                      text-anchor="middle" class="axis-label">{{ tick.label }}</text>
                    <!-- 网格线 -->
                    <line v-for="(tick, idx) in yTicks" :key="'gy'+idx"
                      :x1="chartPadding.left" :y1="tick.y" :x2="chartWidth - chartPadding.right" :y2="tick.y"
                      stroke="#e0e0e6" stroke-width="1" stroke-dasharray="4,4" />
                    <!-- 折线 -->
                    <polyline v-for="(line, idx) in chartLines" :key="'line'+idx"
                      :points="line.points"
                      fill="none" :stroke="line.color" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
                    <!-- 数据点 -->
                    <circle v-for="(point, idx) in chartPoints" :key="'pt'+idx"
                      :cx="point.x" :cy="point.y" r="4" :fill="point.color" stroke="white" stroke-width="2" />
                  </svg>
                </div>
              </div>

              <n-empty v-else description="暂无价格记录" />
            </div>
            <n-empty v-else description="加载中..." />
          </n-tab-pane>

          <!-- 批次 Tab -->
          <n-tab-pane name="batches" tab="批次信息">
            <div class="batch-section">
              <div class="batch-header">
                <span class="batch-count">共 {{ batches.length }} 个批次</span>
                <n-button size="small" @click="handleCompactBatches" :loading="compacting">
                  合并批次
                </n-button>
              </div>
              <div v-if="batches.length === 0" class="batch-empty">暂无批次数据</div>
              <div v-else class="batch-list">
                <div v-for="batch in batches" :key="batch.id" class="batch-item">
                  <div class="batch-info">
                    <span class="batch-number">{{ batch.batchNumber || `批次#${batch.id}` }}</span>
                    <span class="batch-qty">{{ batch.quantity }} {{ batch.unit }}</span>
                  </div>
                  <div class="batch-meta">
                    <span v-if="batch.expiryDate" :class="{ 'text-danger': isBatchExpired(batch) }">
                      到期: {{ formatDate(batch.expiryDate) }}
                    </span>
                    <span v-if="batch.locationId">位置: {{ getLocationName(batch.locationId) }}</span>
                  </div>
                  <div class="batch-actions">
                    <n-button size="tiny" quaternary @click="editBatch(batch)">编辑</n-button>
                    <n-button size="tiny" quaternary type="error" @click="deleteBatch(batch)">删除</n-button>
                  </div>
                </div>
              </div>
            </div>
          </n-tab-pane>

          <n-tab-pane name="history" tab="操作记录">
            <div class="history-section" v-if="history.length > 0">
              <div class="timeline">
                <div class="timeline-item" v-for="(record, index) in history" :key="record.id">
                  <div class="timeline-line" v-if="index < history.length - 1"></div>
                  <div class="timeline-dot" :style="{ background: getHistoryColor(record.type) }"></div>
                  <div class="timeline-content">
                    <div class="timeline-text">
                      <span class="history-type-label">{{ translateType(record.type) }}</span>
                      <span class="history-quantity">× {{ record.quantity }}</span>
                    </div>
                    <div class="timeline-meta">
                      <span v-if="record.source">{{ record.source }}</span>
                      <span v-if="record.note">{{ record.note }}</span>
                      <span>{{ formatDateTime(record.createdAt) }}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <n-empty v-else description="暂无操作记录" />
          </n-tab-pane>
        </n-tabs>
      </div>
    </n-spin>

    <template #footer>
      <n-space justify="end" :wrap="false">
        <n-button size="small" @click="openStockIn">入库</n-button>
        <n-button size="small" @click="showConsumeModal = true">消耗</n-button>
        <n-button size="small" @click="showTransferModal = true">转移</n-button>
        <n-button size="small" type="error" ghost @click="handleDelete">删除</n-button>
      </n-space>
    </template>

    <!-- 消耗 Modal -->
    <n-modal v-model:show="showConsumeModal" title="消耗物品" preset="card" style="max-width: 400px">
      <n-form-item label="数量">
        <n-input-number v-model:value="consumeQuantity" :min="0.01" :max="item?.quantity" style="width: 100%" />
      </n-form-item>
      <n-form-item label="备注">
        <n-input v-model:value="consumeNote" placeholder="可选" />
      </n-form-item>
      <template #footer>
        <n-space justify="end">
          <n-button @click="showConsumeModal = false">取消</n-button>
          <n-button type="primary" @click="handleConsume">确认</n-button>
        </n-space>
      </template>
    </n-modal>

    <!-- 转移 Modal -->
    <n-modal v-model:show="showTransferModal" title="转移物品" preset="card" style="max-width: 400px">
      <n-form-item label="目标位置">
        <n-select v-model:value="transferLocation" :options="locationSelectOptions" />
      </n-form-item>
      <template #footer>
        <n-space justify="end">
          <n-button @click="showTransferModal = false">取消</n-button>
          <n-button type="primary" @click="handleTransfer">确认</n-button>
        </n-space>
      </template>
    </n-modal>

    <!-- 入库 Modal -->
    <n-modal v-model:show="showStockInModal" title="入库" preset="card" style="max-width: 400px">
      <div v-if="item">
        <div style="margin-bottom: 12px; color: var(--hh-text-secondary)">当前库存: {{ item.quantity }} {{ item.unit }}</div>
        <n-form-item label="入库数量">
          <n-input-number v-model:value="stockInQuantity" :min="0.01" :max="9999" style="width: 100%" />
        </n-form-item>
        <n-form-item label="备注">
          <n-input v-model:value="stockInNote" placeholder="备注（可选）" />
        </n-form-item>
        <div v-if="stockInQuantity > 0" style="color: var(--hh-success); font-weight: 500">
          入库后库存: {{ item.quantity + stockInQuantity }} {{ item.unit }}
        </div>
      </div>
      <template #footer>
        <n-space justify="end">
          <n-button @click="showStockInModal = false">取消</n-button>
          <n-button type="success" @click="handleStockIn">确认入库</n-button>
        </n-space>
      </template>
    </n-modal>
  </n-modal>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import {
  NModal, NSpin, NButton, NSpace, NFormItem, NEmpty,
  NInputNumber, NInput, NSelect, NTag, NTabs, NTabPane, useMessage, useDialog,
} from 'naive-ui';
import { stockApi, locationsApi } from '@/api/client';
import type { Item, StockTransaction, Location } from '@/shared/types';
import { getCategoryColor, getHistoryColor } from '@/utils/format';

const props = defineProps<{
  show: boolean;
  itemId: number | null;
}>();

const emit = defineEmits<{
  'update:show': [value: boolean];
  'deleted': [];
  'updated': [];
}>();

const message = useMessage();
const dialog = useDialog();

const item = ref<Item | null>(null);
const history = ref<StockTransaction[]>([]);
const locations = ref<Location[]>([]);
const loading = ref(false);

const showConsumeModal = ref(false);
const showTransferModal = ref(false);
const showStockInModal = ref(false);
const consumeQuantity = ref(1);
const consumeNote = ref('');
const stockInQuantity = ref(1);
const stockInNote = ref('');
const transferLocation = ref<number | null>(null);

// Batch state
const batches = ref<any[]>([]);
const compacting = ref(false);

// Price history state
const priceHistory = ref<any>(null);

const locationSelectOptions = computed(() =>
  locations.value.map(l => ({ label: l.name, value: l.id }))
);

const isExpired = computed(() => {
  if (!item.value?.expiryDate) return false;
  return new Date(item.value.expiryDate) < new Date();
});

const isExpiringSoon = computed(() => {
  if (!item.value?.expiryDate) return false;
  const diff = new Date(item.value.expiryDate).getTime() - Date.now();
  return diff > 0 && diff < 7 * 24 * 60 * 60 * 1000;
});

const isLowStock = computed(() => {
  if (!item.value) return false;
  return item.value.minStock !== null && item.value.quantity <= item.value.minStock;
});

const getLocationName = (locationId: number | null): string => {
  if (!locationId) return '未指定';
  const loc = locations.value.find(l => l.id === locationId);
  return loc ? loc.name : String(locationId);
};

const formatDate = (dateStr: string | Date): string => {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('zh-CN');
};

const formatDateTime = (dateStr: string | Date): string => {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleString('zh-CN');
};

const loadData = async () => {
  if (!props.itemId) return;
  loading.value = true;
  try {
    const [itemRes, historyRes, locRes] = await Promise.all([
      stockApi.getById(props.itemId),
      stockApi.getHistory(props.itemId),
      locationsApi.list(),
    ]);
    item.value = itemRes.data;
    history.value = historyRes.data || [];
    locations.value = (locRes.data || []) as Location[];
    loadBatches();
    loadPriceHistory();
  } catch {
    message.error('加载失败');
  } finally {
    loading.value = false;
  }
};

watch(() => props.show, (val) => {
  if (val && props.itemId) loadData();
  if (!val) {
    item.value = null;
    history.value = [];
  }
});

const handleConsume = async () => {
  if (!item.value) return;
  try {
    await stockApi.consume(item.value.id, { quantity: consumeQuantity.value, note: consumeNote.value });
    message.success('消耗成功');
    showConsumeModal.value = false;
    loadData();
    emit('updated');
  } catch (e: unknown) {
    const err = e as { response?: { data?: { message?: string } } };
    message.error(err.response?.data?.message || '操作失败');
  }
};

const openStockIn = () => {
  stockInQuantity.value = 1;
  stockInNote.value = '';
  showStockInModal.value = true;
};

const handleStockIn = async () => {
  if (!item.value) return;
  try {
    await stockApi.stockIn(item.value.id, { quantity: stockInQuantity.value, note: stockInNote.value });
    message.success('入库成功');
    showStockInModal.value = false;
    loadData();
    emit('updated');
  } catch (e: unknown) {
    const err = e as { response?: { data?: { message?: string } } };
    message.error(err.response?.data?.message || '操作失败');
  }
};

const handleTransfer = async () => {
  if (!item.value) return;
  if (!transferLocation.value) {
    message.warning('请选择目标位置');
    return;
  }
  try {
    await stockApi.transfer(item.value.id, { toLocationId: transferLocation.value });
    message.success('转移成功');
    showTransferModal.value = false;
    loadData();
    emit('updated');
  } catch (e: unknown) {
    const err = e as { response?: { data?: { message?: string } } };
    message.error(err.response?.data?.message || '操作失败');
  }
};

// Batch methods
const loadBatches = async () => {
  if (!item.value) return;
  try {
    const res = await stockApi.getBatchSummary(item.value.id);
    batches.value = res.data || [];
  } catch {
    batches.value = [];
  }
};

// Price history methods
const loadPriceHistory = async () => {
  if (!item.value) return;
  try {
    const res = await stockApi.getPriceHistory(item.value.id);
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

// Chart constants
const chartWidth = 400;
const chartHeight = 200;
const chartPadding = { top: 20, right: 20, bottom: 30, left: 50 };

// Store colors (similar to Grocy's color scheme)
const storeColorPalette = [
  '#409EFF', // blue
  '#67C23A', // green
  '#E6A23C', // yellow
  '#F56C6C', // red
  '#909399', // gray
  '#00CED1', // teal
  '#FF69B4', // pink
  '#8B4513', // brown
];

const storeColors = computed(() => {
  if (!priceHistory.value?.history) return [];
  const stores = new Set<string>();
  priceHistory.value.history.forEach((r: any) => stores.add(r.store));
  return Array.from(stores).map((name, idx) => ({
    name,
    color: storeColorPalette[idx % storeColorPalette.length],
  }));
});

// Type translation map
const typeTranslationMap: Record<string, string> = {
  'add': '入库',
  'stock-in': '入库',
  'consume': '消耗',
  'transfer': '转移',
  'adjust': '调整',
  'inventory-correction': '库存调整',
};

const translateType = (type: string): string => {
  return typeTranslationMap[type] || type;
};

const priceRange = computed(() => {
  if (!priceHistory.value?.history?.length) return { min: 0, max: 100 };
  const prices = priceHistory.value.history.map((r: any) => r.quantity);
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
    ticks.push({ value: Math.round(value), y });
  }
  return ticks;
});

const xTicks = computed(() => {
  if (!priceHistory.value?.history?.length) return [];
  const history = priceHistory.value.history;
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
  const history = [...priceHistory.value.history].reverse(); // chronological order
  const { min, max } = priceRange.value;

  // Group by store
  const storeData = new Map<string, Array<any>>();
  history.forEach((r: any) => {
    if (!storeData.has(r.store)) storeData.set(r.store, []);
    storeData.get(r.store)!.push(r);
  });

  const lines: Array<{ points: string; color: string }> = [];
  storeColors.value.forEach(({ name, color }) => {
    const data = storeData.get(name) || [];
    if (data.length < 2) return; // Need at least 2 points for a line

    const points = data.map((r: any, idx: number) => {
      const x = chartPadding.left + (chartWidth - chartPadding.left - chartPadding.right) * idx / Math.max(history.length - 1, 1);
      const y = chartPadding.top + (chartHeight - chartPadding.top - chartPadding.bottom) * (1 - (r.quantity - min) / (max - min));
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

  const storeColorMap = new Map(storeColors.value.map(s => [s.name, s.color]));
  const points: Array<{ x: number; y: number; color: string }> = [];

  history.forEach((r: any, idx: number) => {
    const x = chartPadding.left + (chartWidth - chartPadding.left - chartPadding.right) * idx / Math.max(history.length - 1, 1);
    const y = chartPadding.top + (chartHeight - chartPadding.top - chartPadding.bottom) * (1 - (r.quantity - min) / (max - min));
    points.push({ x, y, color: storeColorMap.get(r.store) || '#909399' });
  });

  return points;
});

const isBatchExpired = (batch: any) => {
  return batch.expiryDate && new Date(batch.expiryDate) < new Date();
};

const handleCompactBatches = async () => {
  if (!item.value) return;
  compacting.value = true;
  try {
    const res = await stockApi.compactBatches(item.value.id);
    message.success(res.data?.message || '合并完成');
    loadBatches();
    loadData();
  } catch {
    message.error('合并失败');
  } finally {
    compacting.value = false;
  }
};

const editBatch = (_batch: any) => {
  message.info('批次编辑功能开发中');
};

const deleteBatch = async (batch: any) => {
  dialog.warning({
    title: '删除批次',
    content: `确定要删除批次 ${batch.batchNumber || batch.id} 吗？`,
    positiveText: '删除',
    negativeText: '取消',
    onPositiveClick: async () => {
      try {
        await stockApi.deleteBatch(batch.id);
        message.success('删除成功');
        loadBatches();
        loadData();
      } catch {
        message.error('删除失败');
      }
    },
  });
};

const handleDelete = () => {
  if (!item.value) return;
  dialog.warning({
    title: '确认删除',
    content: `确定要删除「${item.value.name}」吗？此操作不可撤销。`,
    positiveText: '删除',
    negativeText: '取消',
    onPositiveClick: async () => {
      try {
        await stockApi.delete(item.value!.id);
        message.success('删除成功');
        emit('update:show', false);
        emit('deleted');
      } catch (e: unknown) {
        const err = e as { response?: { data?: { message?: string } } };
        message.error(err.response?.data?.message || '删除失败');
      }
    },
  });
};
</script>

<style scoped>
.item-detail-content {
  max-height: 60vh;
  overflow-y: auto;
}

.detail-tags {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 16px;
}

.stat-row {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  margin-bottom: 16px;
}

.detail-stat {
  background: var(--hh-bg-card, #f8f8fa);
  border-radius: 8px;
  padding: 12px;
  border: 1px solid var(--hh-border-light, #e0e0e6);
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.detail-stat-label {
  font-size: 12px;
  color: var(--hh-text-tertiary, #999);
  text-transform: uppercase;
}

.detail-stat-value {
  font-size: 18px;
  font-weight: 700;
  color: var(--hh-text, #333);
}

.detail-stat-value.text-danger {
  color: var(--hh-error, #d03050);
}

.detail-stat-sub {
  font-size: 12px;
  color: var(--hh-text-tertiary, #999);
}

.detail-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-bottom: 16px;
}

.detail-section {
  background: var(--hh-bg-card, #f8f8fa);
  border-radius: 8px;
  padding: 12px;
  border: 1px solid var(--hh-border-light, #e0e0e6);
}

.detail-section-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--hh-text-secondary, #666);
  text-transform: uppercase;
  margin-bottom: 8px;
}

.detail-field {
  display: flex;
  justify-content: space-between;
  padding: 6px 0;
  border-bottom: 1px solid var(--hh-border-light, #f0f0f0);
}

.detail-field:last-child {
  border-bottom: none;
}

.detail-field-label {
  font-size: 13px;
  color: var(--hh-text-tertiary, #999);
}

.detail-field-value {
  font-size: 13px;
  font-weight: 500;
  color: var(--hh-text, #333);
}

.detail-notes {
  font-size: 13px;
  color: var(--hh-text-secondary, #666);
  margin-bottom: 8px;
  min-height: 20px;
}

.history-section {
  margin-top: 8px;
}

.detail-section-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--hh-text-secondary, #666);
  text-transform: uppercase;
  margin-bottom: 8px;
}

.timeline {
  position: relative;
  padding-left: 24px;
}

.timeline-item {
  position: relative;
  padding-bottom: 16px;
}

.timeline-item:last-child {
  padding-bottom: 0;
}

.timeline-line {
  position: absolute;
  left: 5px;
  top: 14px;
  bottom: 0;
  width: 2px;
  background: var(--hh-border-light, #e0e0e6);
}

.timeline-dot {
  position: absolute;
  left: 0;
  top: 4px;
  width: 12px;
  height: 12px;
  border-radius: 50%;
}

.timeline-content {
  padding-left: 12px;
}

.timeline-text {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
}

.history-type-label {
  font-weight: 500;
  color: var(--hh-text, #333);
}

.history-quantity {
  color: var(--hh-text-secondary, #666);
}

.timeline-meta {
  font-size: 12px;
  color: var(--hh-text-tertiary, #999);
  display: flex;
  gap: 8px;
  margin-top: 2px;
}

/* Batch section */
.batch-section {
  padding: 8px 0;
}

.batch-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.batch-count {
  font-size: 13px;
  color: var(--hh-text-secondary);
}

.batch-empty {
  text-align: center;
  padding: 24px;
  color: var(--hh-text-tertiary);
}

.batch-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.batch-item {
  padding: 10px 12px;
  border: 1px solid var(--hh-border-light, #e0e0e6);
  border-radius: 8px;
  background: var(--hh-bg-secondary, #f5f5f5);
}

.batch-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}

.batch-number {
  font-weight: 500;
  font-size: 13px;
}

.batch-qty {
  font-weight: 600;
  color: var(--hh-primary);
}

.batch-meta {
  display: flex;
  gap: 12px;
  font-size: 12px;
  color: var(--hh-text-secondary);
  margin-bottom: 8px;
}

.batch-actions {
  display: flex;
  gap: 8px;
}

.text-danger {
  color: var(--hh-error, #e53e3e);
}

/* Price section */
.price-section {
  padding: 8px 0;
}

.price-overview {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  margin-bottom: 16px;
}

.price-stat {
  padding: 10px 12px;
  border: 1px solid var(--hh-border-light, #e0e0e6);
  border-radius: 8px;
  background: var(--hh-bg-secondary, #f5f5f5);
}

.price-stat-label {
  display: block;
  font-size: 12px;
  color: var(--hh-text-secondary);
  margin-bottom: 4px;
}

.price-stat-value {
  font-size: 16px;
  font-weight: 600;
  color: var(--hh-text);
}

.price-primary {
  color: var(--hh-primary, #409eff);
}

.price-success {
  color: var(--hh-success, #67c23a);
}

.price-danger {
  color: var(--hh-error, #e53e3e);
}

.price-chart {
  margin-bottom: 16px;
}

.chart-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--hh-text);
  margin-bottom: 8px;
}

.chart-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 8px;
  font-size: 12px;
  color: var(--hh-text-secondary);
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 4px;
}

.legend-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
}

.chart-container {
  padding: 8px;
  background: var(--hh-bg-secondary, #f5f5f5);
  border-radius: 8px;
  overflow: hidden;
}

.line-chart {
  width: 100%;
  height: auto;
}

.axis-label {
  font-size: 10px;
  fill: var(--hh-text-tertiary, #999);
}

.price-list {
  margin-top: 8px;
}

.list-items {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.list-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  border: 1px solid var(--hh-border-light, #e0e0e6);
  border-radius: 6px;
  background: var(--hh-bg-secondary, #f5f5f5);
}

.list-item-left {
  display: flex;
  gap: 12px;
  align-items: center;
}

.list-item-date {
  font-size: 13px;
  color: var(--hh-text-secondary);
}

.list-item-qty {
  font-size: 13px;
  font-weight: 500;
  color: var(--hh-text);
}

.list-item-note {
  font-size: 12px;
  color: var(--hh-text-tertiary);
}
</style>
