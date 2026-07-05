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
        <!-- 标签行 + 条码 -->
        <div class="detail-header">
          <div class="detail-tags">
            <n-tag size="small" round :bordered="false" :type="getCategoryColor(item.type)">
              {{ item.type }}
            </n-tag>
            <n-tag v-if="item.spec" size="small" round :bordered="false" type="info">{{ item.spec }}</n-tag>
            <n-tag v-if="isExpired" size="small" round :bordered="false" type="error">{{ t('stock.expired') }}</n-tag>
            <n-tag v-else-if="isExpiringSoon" size="small" round :bordered="false" type="warning">{{ t('stock.expiringSoon') }}</n-tag>
            <n-tag v-if="isLowStock" size="small" round :bordered="false" type="warning">{{ t('stock.lowStockLabel') }}</n-tag>
          </div>
          <div class="detail-barcode-area" v-if="item.barcode">
            <n-tag size="small" round :bordered="false" type="default" class="barcode-tag">
              <template #icon><n-icon :size="12"><BarcodeOutline /></n-icon></template>
              {{ item.barcode }}
            </n-tag>
            <n-button size="tiny" quaternary @click="showQRCode = true">
              <template #icon><n-icon :size="14"><QRCodeOutline /></n-icon></template>
            </n-button>
          </div>
        </div>

        <!-- Tabs — 固定高度，内部滚动 -->
        <n-tabs type="line" animated default-value="info" class="detail-tabs">
          <n-tab-pane name="info" :tab="t('stock.itemInfo')" class="tab-scroll">
            <div class="stat-row">
          <div class="detail-stat">
            <span class="detail-stat-label">{{ t('stock.quantityLabel') }}</span>
            <span class="detail-stat-value">{{ item.quantity }} {{ item.unit }}</span>
            <span class="detail-stat-sub" v-if="item.minStock">{{ t('stock.minStock') }} {{ item.minStock }}</span>
          </div>
          <div class="detail-stat">
            <span class="detail-stat-label">{{ t('stock.location') }}</span>
            <span class="detail-stat-value">{{ getLocationName(item.locationId) }}</span>
          </div>
          <div class="detail-stat">
            <span class="detail-stat-label">{{ t('stock.expiryDate') }}</span>
                <span class="detail-stat-value" :class="{ 'text-danger': isExpired }">
                  {{ item.expiryDate ? formatDate(item.expiryDate) : '无' }}
                </span>
              </div>
            </div>

        <div class="detail-grid">
          <div class="detail-section">
            <h3 class="detail-section-title">{{ t('stock.purchaseInfo') }}</h3>
            <div class="detail-field">
              <span class="detail-field-label">{{ t('stock.purchasePrice') }}</span>
                  <span class="detail-field-value">{{ item.purchasePrice ? `¥${item.purchasePrice}` : '-' }}</span>
                </div>
            <div class="detail-field">
              <span class="detail-field-label">{{ t('stock.purchaseDate') }}</span>
                  <span class="detail-field-value">{{ item.purchaseDate ? formatDate(item.purchaseDate) : '-' }}</span>
                </div>
            <div class="detail-field">
              <span class="detail-field-label">{{ t('stock.brand') }}</span>
                  <span class="detail-field-value">{{ item.brand || '-' }}</span>
                </div>
            <div class="detail-field" v-if="item.shop">
              <span class="detail-field-label">{{ t('stock.shop') }}</span>
                  <span class="detail-field-value">{{ item.shop }}</span>
                </div>
              </div>
          <div class="detail-section">
            <h3 class="detail-section-title">{{ t('stock.notes') }}</h3>
            <div class="detail-notes">{{ item.notes || '-' }}</div>
          </div>
            </div>
          </n-tab-pane>

          <!-- 价格追踪 Tab -->
          <n-tab-pane name="price" :tab="t('stock.priceTrack')" class="tab-scroll">
            <PriceHistoryChart v-if="item" :item-id="item.id" />
          </n-tab-pane>

          <!-- 批次 Tab -->
          <n-tab-pane name="batches" :tab="t('stock.batchInfo')" class="tab-scroll">
            <div class="batch-section">
              <div class="batch-header">
                <span class="batch-count">{{ t('stock.batchesCount', { count: batches.length }) }}</span>
                <n-button size="small" @click="handleCompactBatches" :loading="compacting">
                  {{ t('stock.compactBatches') }}
                </n-button>
              </div>
              <div v-if="batches.length === 0" class="batch-empty">{{ t('stock.noBatches') }}</div>
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
                    <n-button size="tiny" quaternary @click="editBatch(batch)">{{ t('common.edit') }}</n-button>
                    <n-button size="tiny" quaternary type="error" @click="deleteBatch(batch)">{{ t('common.delete') }}</n-button>
                  </div>
                </div>
              </div>
            </div>
          </n-tab-pane>

          <n-tab-pane name="history" :tab="t('history.title')" class="tab-scroll">
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
                      <span v-if="record.source" class="meta-source">{{ translateSource(record.source) }}</span>
                      <span v-if="record.note" class="meta-note">{{ translateNote(record.note) }}</span>
                      <span>{{ formatDateTime(record.createdAt) }}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <n-empty v-else :description="t('history.noData')" />
          </n-tab-pane>
        </n-tabs>
      </div>
    </n-spin>

    <template #footer>
      <n-space justify="end" :wrap="false">
        <n-button size="small" @click="openStockIn">{{ t('stock.stockIn') }}</n-button>
        <n-button size="small" @click="openConsume">{{ t('stock.consume') }}</n-button>
        <n-button size="small" @click="openTransfer">{{ t('stock.transfer') }}</n-button>
        <n-button size="small" type="error" ghost @click="handleDelete(item.id, item.name)">{{ t('common.delete') }}</n-button>
      </n-space>
    </template>

    <!-- 消耗 Modal -->
    <n-modal v-model:show="showConsumeModal" :title="t('stock.consumeItem')" preset="card" style="max-width: 400px">
      <n-form-item :label="t('stock.quantityLabel')">
        <n-input-number v-model:value="consumeQuantity" :min="0.01" :max="item?.quantity" style="width: 100%" />
      </n-form-item>
      <n-form-item label="已变质">
        <n-checkbox v-model:checked="consumeSpoiled">此物品已变质/损坏</n-checkbox>
      </n-form-item>
      <n-form-item :label="t('stock.noteLabel')">
        <n-input v-model:value="consumeNote" :placeholder="t('stock.stockInNotePlaceholder')" />
      </n-form-item>
      <template #footer>
        <n-space justify="end">
          <n-button @click="showConsumeModal = false">{{ t('common.cancel') }}</n-button>
          <n-button type="primary" @click="handleConsume">{{ t('common.confirm') }}</n-button>
        </n-space>
      </template>
    </n-modal>

    <!-- Transfer Modal -->
    <n-modal v-model:show="showTransferModal" :title="t('stock.transferItem')" preset="card" style="max-width: 400px">
      <n-form-item :label="t('stock.toLocation')">
        <n-select v-model:value="transferLocation" :options="locationSelectOptions" />
      </n-form-item>
      <n-form-item :label="t('stock.quantityLabel')">
        <n-input-number v-model:value="transferQuantity" :min="0.01" :max="item?.quantity" style="width: 100%">
          <template #suffix>{{ item?.unit }}</template>
        </n-input-number>
      </n-form-item>
      <template #footer>
        <n-space justify="end">
          <n-button @click="showTransferModal = false">{{ t('common.cancel') }}</n-button>
          <n-button type="primary" @click="handleTransfer">{{ t('common.confirm') }}</n-button>
        </n-space>
      </template>
    </n-modal>

    <!-- 入库 Modal -->
    <n-modal v-model:show="showStockInModal" :title="t('stock.stockIn')" preset="card" style="max-width: 400px">
      <div v-if="item">
        <div style="margin-bottom: 12px; color: var(--hh-text-secondary)">{{ t('stock.currentStock') }}: {{ item.quantity }} {{ item.unit }}</div>
        <n-form-item :label="t('stock.stockInQuantity')">
          <n-input-number v-model:value="stockInQuantity" :min="0.01" :max="9999" style="width: 100%" />
        </n-form-item>
        <n-form-item :label="t('stock.purchasePrice')">
          <n-input-number v-model:value="stockInPrice" :min="0" :precision="2" :placeholder="t('stock.stockInNotePlaceholder')" style="width: 100%">
            <template #prefix>¥</template>
          </n-input-number>
        </n-form-item>
        <n-form-item :label="t('stock.shop')">
          <n-input v-model:value="stockInShop" :placeholder="t('stock.stockInNotePlaceholder')" />
        </n-form-item>
        <n-form-item :label="t('stock.noteLabel')">
          <n-input v-model:value="stockInNote" :placeholder="t('stock.stockInNotePlaceholder')" />
        </n-form-item>
        <div v-if="stockInQuantity > 0" style="color: var(--hh-success); font-weight: 500">
          {{ t('stock.stockAfterIn') }}: {{ item.quantity + stockInQuantity }} {{ item.unit }}
        </div>
      </div>
      <template #footer>
        <n-space justify="end">
          <n-button @click="showStockInModal = false">{{ t('common.cancel') }}</n-button>
          <n-button type="success" @click="handleStockIn">{{ t('stock.confirmStockIn') }}</n-button>
        </n-space>
      </template>
    </n-modal>

    <!-- Batch Edit Dialog -->
    <BatchEditDialog
      v-model:show="showBatchEditDialog"
      :batch="editingBatch"
      @saved="onBatchSaved"
    />

    <!-- QR Code Modal -->
    <n-modal v-model:show="showQRCode" preset="card" :title="`QR Code - ${item?.name || ''}`" style="max-width: 360px">
      <div class="qrcode-display" v-if="item">
        <img :src="stockApi.getQRCodeUrl(item.id)" :alt="item.name" class="qrcode-image" />
        <div class="qrcode-info">
          <span class="qrcode-label">{{ item.barcode || `#${item.id}` }}</span>
        </div>
        <n-button type="primary" block @click="downloadQRCode">
          <template #icon><n-icon><DownloadOutline /></n-icon></template>
          {{ t('common.download') || '下载' }}
        </n-button>
      </div>
    </n-modal>
  </n-modal>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import {
  NModal, NSpin, NButton, NSpace, NFormItem, NEmpty, NIcon, NCheckbox,
  NInputNumber, NInput, NSelect, NTag, NTabs, NTabPane, useMessage, useDialog,
} from 'naive-ui';
import { BarcodeOutline, QRCodeOutline, DownloadOutline } from '@vicons/ionicons5';
import { stockApi, locationsApi } from '@/api/client';
import PriceHistoryChart from './PriceHistoryChart.vue';
import BatchEditDialog from './BatchEditDialog.vue';
import { getCategoryColor, getHistoryColor } from '@/utils/format';
import { useStockItem } from '@/composables/useStockItem';
import { useI18n } from '@/locales';

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
const { t } = useI18n();

const {
  item, history, locations, loading,
  showConsumeModal, showTransferModal, showStockInModal,
  consumeQuantity, consumeNote, consumeSpoiled,
  stockInQuantity, stockInPrice, stockInShop, stockInNote,
  transferLocation, transferQuantity, locationSelectOptions,
  isExpired, isExpiringSoon, isLowStock,
  getLocationName, formatDate, formatDateTime,
  loadData, openStockIn, openTransfer, openConsume, handleStockIn, handleConsume, handleTransfer, handleDelete,
} = useStockItem({
  onUpdated: () => emit('updated'),
  onDeleted: () => { emit('update:show', false); emit('deleted'); },
});

// Batch state
const batches = ref<any[]>([]);
const compacting = ref(false);
const showBatchEditDialog = ref(false);
const editingBatch = ref<any>(null);

// QR Code state
const showQRCode = ref(false);

function downloadQRCode() {
  if (!item.value) return;
  const link = document.createElement('a');
  link.href = stockApi.getQRCodeUrl(item.value.id);
  link.download = `item-${item.value.id}-qr.png`;
  link.click();
}

const translateType = (type: string): string => t(`history.${type}`) || type;
const translateSource = (source: string): string => t(`history.${source}`) || source;
const translateNote = (note: string): string => {
  const knownTypes = ['purchase', 'consume', 'product-opened', 'stock-edit-old', 'stock-edit-new'];
  if (knownTypes.includes(note)) return t(`history.${note}`);
  return note;
};

const loadBatches = async () => {
  if (!item.value) return;
  try {
    const res = await stockApi.getBatchSummary(item.value.id);
    batches.value = res.data || [];
  } catch {
    batches.value = [];
  }
};

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
    loadData(item.value.id);
  } catch {
    message.error('合并失败');
  } finally {
    compacting.value = false;
  }
};

const editBatch = (batch: any) => {
  editingBatch.value = batch;
  showBatchEditDialog.value = true;
};

const onBatchSaved = () => {
  loadBatches();
  if (item.value) loadData(item.value.id);
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
        if (item.value) loadData(item.value.id);
      } catch {
        message.error('删除失败');
      }
    },
  });
};

watch(() => props.show, (val) => {
  if (val && props.itemId) {
    loadData(props.itemId);
    loadBatches();
  }
  if (!val) {
    batches.value = [];
  }
});
</script>

<style scoped>
.item-detail-content {
  display: flex;
  flex-direction: column;
  height: 420px;
}

.detail-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 12px;
  flex-shrink: 0;
}

.detail-tags {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  flex: 1;
}

.detail-barcode-area {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
}

.barcode-tag {
  font-family: monospace;
  font-size: 11px;
}

.qrcode-display {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 16px 0;
}

.qrcode-image {
  width: 200px;
  height: 200px;
  border: 1px solid var(--hh-border-light);
  border-radius: 8px;
}

.qrcode-info {
  text-align: center;
}

.qrcode-label {
  font-family: monospace;
  font-size: 14px;
  color: var(--hh-text-secondary);
}

.detail-tabs {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.detail-tabs :deep(.n-tabs-content) {
  flex: 1;
  min-height: 0;
}

.detail-tabs :deep(.n-tab-pane) {
  height: 100%;
}

.tab-scroll {
  overflow-y: auto;
  max-height: 340px;
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
</style>
