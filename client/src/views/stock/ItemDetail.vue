<template>
  <div class="item-detail">
    <n-page-header :title="item?.name || ''" :subtitle="t('stock.title')" @back="router.back()">
      <template #back>
        <n-button quaternary size="small">
          <template #icon><n-icon :size="18"><ArrowBackOutline /></n-icon></template>
          {{ t('common.back') }}
        </n-button>
      </template>
    </n-page-header>

    <n-spin :show="loading">
      <div v-if="item" class="detail-body">
        <!-- 名称 + 标签行 -->
        <div class="detail-title-row">
          <h1 class="detail-name">{{ item.name }}</h1>
          <div class="detail-tags">
            <n-tag size="small" round :bordered="false" :type="getCategoryColor(item.type)">
              {{ item.type }}
            </n-tag>
            <n-tag v-if="isExpired" size="small" round :bordered="false" type="error">已过期</n-tag>
            <n-tag v-else-if="isExpiringSoon" size="small" round :bordered="false" type="warning">即将过期</n-tag>
            <n-tag v-if="isLowStock" size="small" round :bordered="false" type="warning">低库存</n-tag>
          </div>
        </div>

        <!-- 关键信息 stat 卡片 -->
        <div class="stat-row">
          <div class="detail-stat hover-lift">
            <span class="detail-stat-label">{{ t('stock.quantityLabel') }}</span>
            <span class="detail-stat-value">{{ item.quantity }} {{ item.unit }}</span>
            <span class="detail-stat-sub" v-if="item.minStock">最低 {{ item.minStock }}</span>
          </div>
          <div class="detail-stat hover-lift">
            <span class="detail-stat-label">位置</span>
            <span class="detail-stat-value">{{ getLocationName(item.locationId) }}</span>
          </div>
          <div class="detail-stat hover-lift">
            <span class="detail-stat-label">保质期</span>
            <span class="detail-stat-value" :class="{ 'text-danger': isExpired }">
              {{ item.expiryDate ? formatDate(item.expiryDate) : '无' }}
            </span>
          </div>
        </div>

        <!-- Plugin slot: ItemType-specific detail extensions -->
        <PluginSlot
          name="stock:item-detail-extra"
          :props="{
            itemId: item.id,
            itemType: item.type,
            currentState: item.currentState,
            customFields: item.customFields,
          }"
        />

        <!-- 详情 2列网格 -->
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
          </div>
          <div class="detail-section">
            <h3 class="detail-section-title">{{ t('common.notes') }}</h3>
            <div class="detail-notes">
              {{ item.notes || '暂无备注' }}
            </div>
            <div class="detail-field">
              <span class="detail-field-label">条码</span>
              <span class="detail-field-value">{{ item.barcode || '-' }}</span>
            </div>
          </div>
        </div>

        <!-- 操作按钮 -->
        <div class="detail-actions">
          <n-button type="success" size="small" @click="openStockIn">{{ t('stock.stockIn') }}</n-button>
          <n-button type="primary" size="small" @click="showConsumeModal = true">{{ t('stock.consume') }}</n-button>
          <n-button size="small" @click="showTransferModal = true">{{ t('stock.transfer') }}</n-button>
          <n-button type="error" size="small" ghost @click="handleDelete">{{ t('common.delete') }}</n-button>

          <!-- Plugin slot: ItemType-specific action buttons -->
          <PluginSlot
            name="stock:item-actions"
            :props="{
              itemId: item.id,
              itemType: item.type,
              currentState: item.currentState,
            }"
          />
        </div>

        <!-- 操作历史 — 时间轴 -->
        <div class="history-section" v-if="history.length > 0">
          <h3 class="detail-section-title">操作历史</h3>
          <div class="timeline">
            <div class="timeline-item" v-for="(record, index) in history" :key="record.id">
              <div class="timeline-line" v-if="index < history.length - 1"></div>
              <div class="timeline-dot" :style="{ background: getHistoryColor(record.type) }"></div>
              <div class="timeline-content">
                <div class="timeline-text">
                  <span class="history-type-label">{{ record.type }}</span>
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
      </div>
    </n-spin>

    <!-- 消耗 Modal -->
    <n-modal v-model:show="showConsumeModal" :title="t('stock.consumeItem')" preset="card" style="max-width: 400px">
      <n-form-item :label="t('stock.quantityLabel')">
        <n-input-number v-model:value="consumeQuantity" :min="0.01" :max="item?.quantity" style="width: 100%" />
      </n-form-item>
      <n-form-item :label="t('common.notes')">
        <n-input v-model:value="consumeNote" placeholder="可选" />
      </n-form-item>
      <template #footer>
        <n-space justify="end">
          <n-button @click="showConsumeModal = false">{{ t('common.cancel') }}</n-button>
          <n-button type="primary" @click="handleConsume">{{ t('common.confirm') }}</n-button>
        </n-space>
      </template>
    </n-modal>

    <!-- 转移 Modal -->
    <n-modal v-model:show="showTransferModal" :title="t('stock.transferItem')" preset="card" style="max-width: 400px">
      <n-form-item :label="t('stock.toLocation')">
        <n-select v-model:value="transferLocation" :options="locationSelectOptions" />
      </n-form-item>
      <template #footer>
        <n-space justify="end">
          <n-button @click="showTransferModal = false">{{ t('common.cancel') }}</n-button>
          <n-button type="primary" @click="handleTransfer">{{ t('common.confirm') }}</n-button>
        </n-space>
      </template>
    </n-modal>

    <!-- 入库 Modal -->
    <n-modal v-model:show="showStockInModal" :title="t('stock.stockIn')" preset="card" style="max-width: 420px">
      <div v-if="item" class="stock-in-detail-modal">
        <div class="stock-in-current">当前库存: {{ item.quantity }} {{ item.unit }}</div>
        <n-form-item :label="t('stock.stockInQuantity')">
          <n-input-number v-model:value="stockInQuantity" :min="0.01" :max="9999" style="width: 100%" />
        </n-form-item>
        <n-form-item :label="t('common.notes')">
          <n-input v-model:value="stockInNote" :placeholder="t('stock.stockInNotePlaceholder')" />
        </n-form-item>
        <div class="stock-in-preview" v-if="stockInQuantity > 0 && item">
          入库后库存: <strong>{{ item.quantity + stockInQuantity }} {{ item.unit }}</strong>
        </div>
      </div>
      <template #footer>
        <n-space justify="end">
          <n-button @click="showStockInModal = false">{{ t('common.cancel') }}</n-button>
          <n-button type="success" @click="handleStockIn">{{ t('stock.confirmStockIn') }}</n-button>
        </n-space>
      </template>
    </n-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import {
  NButton, NSpace, NSpin, NModal, NFormItem,
  NInputNumber, NInput, NSelect, NTag, NIcon, useMessage, useDialog
} from 'naive-ui';
import { stockApi, locationsApi } from '@/api/client';
import PluginSlot from '@/components/PluginSlot.vue';
import { ArrowBackOutline } from '@vicons/ionicons5';
import { useI18n } from '@/locales';
import type { Item, StockTransaction, Location } from '@/shared/types';
import { getCategoryColor, getHistoryColor } from '@/utils/format';

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const message = useMessage();
const dialog = useDialog();

const item = ref<Item | null>(null);
const history = ref<StockTransaction[]>([]);
const locations = ref<Location[]>([]);
const loading = ref(true);

const showConsumeModal = ref(false);
const showTransferModal = ref(false);
const showStockInModal = ref(false);
const consumeQuantity = ref(1);
const consumeNote = ref('');
const stockInQuantity = ref(1);
const stockInNote = ref('');
const transferLocation = ref<number | null>(null);

const locationSelectOptions = computed(() =>
  locations.value.map(l => ({ label: l.name, value: l.id }))
);

const isExpired = computed(() => {
  if (!item.value?.expiryDate) return false;
  return new Date(item.value.expiryDate) < new Date();
});

const isExpiringSoon = computed(() => {
  if (!item.value?.expiryDate) return false;
  const expiry = new Date(item.value.expiryDate);
  const now = new Date();
  const diff = expiry.getTime() - now.getTime();
  return diff > 0 && diff < 7 * 24 * 60 * 60 * 1000; // 7天内
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
  const id = Number(route.params.id);
  loading.value = true;
  try {
    const [itemRes, historyRes, locRes] = await Promise.all([
      stockApi.getById(id),
      stockApi.getHistory(id),
      locationsApi.list(),
    ]);
    item.value = itemRes.data;
    history.value = historyRes.data || [];
    locations.value = (locRes.data || []) as Location[];
  } catch (_e: unknown) {
    message.error('加载失败');
  } finally {
    loading.value = false;
  }
};

const handleConsume = async () => {
  if (!item.value) return;
  try {
    await stockApi.consume(item.value.id, { quantity: consumeQuantity.value, note: consumeNote.value });
    message.success('消耗成功');
    showConsumeModal.value = false;
    loadData();
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
  } catch (e: unknown) {
    const err = e as { response?: { data?: { message?: string } } };
    message.error(err.response?.data?.message || '操作失败');
  }
};

const handleDelete = () => {
  if (!item.value) return;
  dialog.warning({
    title: t('stock.confirmDelete'),
    content: t('stock.confirmDeleteMsg', { name: item.value.name }),
    positiveText: t('common.delete'),
    negativeText: t('common.cancel'),
    onPositiveClick: async () => {
      try {
        await stockApi.delete(item.value!.id);
        message.success('删除成功');
        router.back();
      } catch (e: unknown) {
        const err = e as { response?: { data?: { message?: string } } };
        message.error(err.response?.data?.message || '删除失败');
      }
    },
  });
};

onMounted(() => {
  loadData();
});
</script>

<style scoped>
.item-detail {
  max-width: 800px;
}

/* === Title Row === */
.detail-title-row {
  display: flex;
  align-items: center;
  gap: var(--hh-space-3);
  margin-bottom: var(--hh-space-5);
  flex-wrap: wrap;
}

.detail-name {
  font-size: var(--hh-text-2xl);
  font-weight: var(--hh-weight-bold);
  color: var(--hh-text);
  letter-spacing: -0.02em;
  line-height: 1.2;
}

.detail-tags {
  display: flex;
  gap: var(--hh-space-2);
  flex-wrap: wrap;
}

/* === Stat Row (3 cards) === */
.stat-row {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--hh-space-4);
  margin-bottom: var(--hh-space-5);
}

.detail-stat {
  background: var(--hh-bg-card);
  border-radius: var(--hh-radius);
  padding: var(--hh-space-4);
  border: 1px solid var(--hh-border-light);
  box-shadow: var(--hh-shadow-sm);
  display: flex;
  flex-direction: column;
  gap: var(--hh-space-2);
}

.detail-stat-label {
  font-size: var(--hh-text-xs);
  font-weight: var(--hh-weight-medium);
  color: var(--hh-text-tertiary);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.detail-stat-value {
  font-size: var(--hh-text-xl);
  font-weight: var(--hh-weight-bold);
  color: var(--hh-text);
  letter-spacing: -0.02em;
}

.detail-stat-value.text-danger {
  color: var(--hh-error);
}

.detail-stat-sub {
  font-size: var(--hh-text-xs);
  color: var(--hh-text-tertiary);
}

/* === Detail Grid (2 columns) === */
.detail-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--hh-space-5);
  margin-bottom: var(--hh-space-5);
}

.detail-section {
  background: var(--hh-bg-card);
  border-radius: var(--hh-radius);
  padding: var(--hh-space-4);
  border: 1px solid var(--hh-border-light);
  box-shadow: var(--hh-shadow-sm);
}

.detail-section-title {
  font-size: var(--hh-text-sm);
  font-weight: var(--hh-weight-semibold);
  color: var(--hh-text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  margin-bottom: var(--hh-space-3);
}

.detail-field {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--hh-space-2) 0;
  border-bottom: 1px solid var(--hh-border-light);
}

.detail-field:last-child {
  border-bottom: none;
}

.detail-field-label {
  font-size: var(--hh-text-sm);
  color: var(--hh-text-secondary);
}

.detail-field-value {
  font-size: var(--hh-text-sm);
  font-weight: var(--hh-weight-medium);
  color: var(--hh-text);
}

.detail-notes {
  font-size: var(--hh-text-sm);
  color: var(--hh-text);
  line-height: 1.6;
  padding: var(--hh-space-2) 0;
  border-bottom: 1px solid var(--hh-border-light);
  margin-bottom: var(--hh-space-2);
  white-space: pre-wrap;
}

/* === Actions === */
.detail-actions {
  display: flex;
  gap: var(--hh-space-2);
  margin-bottom: var(--hh-space-5);
  padding: var(--hh-space-3) var(--hh-space-4);
  background: var(--hh-bg-card);
  border-radius: var(--hh-radius);
  border: 1px solid var(--hh-border-light);
  box-shadow: var(--hh-shadow-sm);
}

/* === History Timeline === */
.history-section {
  background: var(--hh-bg-card);
  border-radius: var(--hh-radius);
  padding: var(--hh-space-4);
  border: 1px solid var(--hh-border-light);
  box-shadow: var(--hh-shadow-sm);
}

.timeline {
  display: flex;
  flex-direction: column;
  position: relative;
}

.timeline-item {
  display: flex;
  gap: var(--hh-space-3);
  padding: var(--hh-space-2) 0;
  position: relative;
}

.timeline-line {
  position: absolute;
  left: 5px;
  top: 20px;
  bottom: -4px;
  width: 2px;
  background: var(--hh-border);
  border-radius: 1px;
}

.timeline-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  flex-shrink: 0;
  margin-top: 4px;
  position: relative;
  z-index: 1;
}

.timeline-content {
  flex: 1;
  min-width: 0;
}

.timeline-text {
  display: flex;
  align-items: center;
  gap: var(--hh-space-2);
  font-size: var(--hh-text-sm);
  color: var(--hh-text);
}

.history-type-label {
  font-weight: var(--hh-weight-medium);
}

.history-quantity {
  color: var(--hh-text-secondary);
}

.timeline-meta {
  display: flex;
  gap: var(--hh-space-2);
  margin-top: 2px;
  font-size: var(--hh-text-xs);
  color: var(--hh-text-tertiary);
}

/* === Stock-In Modal === */
.stock-in-detail-modal {
  display: flex;
  flex-direction: column;
  gap: var(--hh-space-3);
}

.stock-in-current {
  font-size: var(--hh-text-sm);
  color: var(--hh-text-secondary);
  padding: var(--hh-space-2) var(--hh-space-3);
  background: var(--hh-bg-secondary);
  border-radius: var(--hh-radius-sm);
}

.stock-in-preview {
  font-size: var(--hh-text-sm);
  color: var(--hh-text-secondary);
  padding: var(--hh-space-2) 0;
}

.stock-in-preview strong {
  color: var(--hh-success);
  font-weight: var(--hh-weight-semibold);
}

/* === Responsive === */
@media (max-width: 768px) {
  .stat-row {
    grid-template-columns: 1fr;
  }

  .detail-grid {
    grid-template-columns: 1fr;
  }

  .detail-title-row {
    flex-direction: column;
    align-items: flex-start;
  }

  .detail-name {
    font-size: var(--hh-text-xl);
  }
}
</style>
