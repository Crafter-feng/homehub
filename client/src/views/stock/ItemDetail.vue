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
        <!-- 名称 + 标签行 + 条码 -->
        <div class="detail-title-row">
          <h1 class="detail-name">{{ item.name }}</h1>
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

        <!-- 关键信息 stat 卡片 -->
        <div class="stat-row">
          <div class="detail-stat hover-lift">
            <span class="detail-stat-label">{{ t('stock.quantityLabel') }}</span>
            <span class="detail-stat-value">{{ item.quantity }} {{ item.unit }}</span>
            <span class="detail-stat-sub" v-if="item.minStock">最低 {{ item.minStock }}</span>
          </div>
          <div class="detail-stat hover-lift">
            <span class="detail-stat-label">{{ t('stock.location') }}</span>
            <span class="detail-stat-value">{{ getLocationName(item.locationId) }}</span>
          </div>
          <div class="detail-stat hover-lift">
            <span class="detail-stat-label">{{ t('stock.expiryDate') }}</span>
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
            <div class="detail-notes">
              {{ item.notes || '-' }}
            </div>
          </div>
        </div>

        <!-- 操作按钮 -->
        <div class="detail-actions">
          <n-button type="success" size="small" @click="openStockIn">{{ t('stock.stockIn') }}</n-button>
          <n-button type="primary" size="small" @click="showConsumeModal = true">{{ t('stock.consume') }}</n-button>
          <n-button size="small" @click="showTransferModal = true">{{ t('stock.transfer') }}</n-button>
          <n-button type="error" size="small" ghost @click="handleDelete(item.id, item.name)">{{ t('common.delete') }}</n-button>

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

        <!-- 价格历史 -->
        <PriceHistoryChart v-if="item" :item-id="item.id" class="section-card" />

        <!-- 操作历史 — 时间轴 -->
        <div class="history-section" v-if="history.length > 0">
          <h3 class="detail-section-title">{{ t('history.title') }}</h3>
          <div class="timeline">
            <div class="timeline-item" v-for="(record, index) in history" :key="record.id">
              <div class="timeline-line" v-if="index < history.length - 1"></div>
              <div class="timeline-dot" :style="{ background: getHistoryColor(record.type) }"></div>
              <div class="timeline-content">
                <div class="timeline-text">
                  <span class="history-type-label">{{ translateType(record.type) }}</span>
                  <span class="history-quantity">× {{ record.quantity }}</span>
                  <span v-if="record.spec" class="history-spec">{{ record.spec }}</span>
                  <span v-if="record.shop" class="history-shop">@ {{ record.shop }}</span>
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
        <div class="stock-in-current">{{ t('stock.currentStock') }}: {{ item.quantity }} {{ item.unit }}</div>
        <n-form-item :label="t('stock.stockInQuantity')">
          <n-input-number v-model:value="stockInQuantity" :min="0.01" :max="9999" style="width: 100%" />
        </n-form-item>
        <n-form-item :label="t('stock.purchasePrice')">
          <n-input-number v-model:value="stockInPrice" :min="0" :placeholder="t('stock.stockInNotePlaceholder')" style="width: 100%" />
        </n-form-item>
        <n-form-item :label="t('stock.shop')">
          <n-select
            v-model:value="stockInShop"
            :options="shopOptions"
            filterable
            tag
            clearable
            :placeholder="t('stock.stockInNotePlaceholder')"
          />
        </n-form-item>
        <n-form-item :label="t('stock.noteLabel')">
          <n-input v-model:value="stockInNote" :placeholder="t('stock.stockInNotePlaceholder')" />
        </n-form-item>
        <div class="stock-in-preview" v-if="stockInQuantity > 0 && item">
          {{ t('stock.stockAfterIn') }}: <strong>{{ item.quantity + stockInQuantity }} {{ item.unit }}</strong>
        </div>
      </div>
      <template #footer>
        <n-space justify="end">
          <n-button @click="showStockInModal = false">{{ t('common.cancel') }}</n-button>
          <n-button type="success" @click="handleStockIn">{{ t('stock.confirmStockIn') }}</n-button>
        </n-space>
      </template>
    </n-modal>

    <!-- QR Code Modal -->
    <n-modal v-model:show="showQRCode" preset="card" :title="`QR Code - ${item?.name || ''}`" style="max-width: 360px">
      <div class="qrcode-display" v-if="item">
        <img :src="stockApi.getQRCodeUrl(item.id)" :alt="item.name" class="qrcode-image" />
        <div class="qrcode-info">
          <span class="qrcode-label">{{ item.barcode || `#${item.id}` }}</span>
        </div>
        <n-button type="primary" block @click="downloadQRCode">
          <template #icon><n-icon><DownloadOutline /></n-icon></template>
          下载二维码
        </n-button>
      </div>
    </n-modal>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import {
  NButton, NSpace, NSpin, NModal, NFormItem, NIcon,
  NInputNumber, NInput, NSelect, NTag,
} from 'naive-ui';
import { stockApi, locationsApi } from '@/api/client';
import PluginSlot from '@/components/PluginSlot.vue';
import PriceHistoryChart from '@/components/PriceHistoryChart.vue';
import { ArrowBackOutline, BarcodeOutline, QRCodeOutline, DownloadOutline } from '@vicons/ionicons5';
import { useI18n } from '@/locales';
import { useStockItem } from '@/composables/useStockItem';
import { getCategoryColor, getHistoryColor } from '@/utils/format';

const { t } = useI18n();
const route = useRoute();
const router = useRouter();

const {
  item, history, loading,
  showConsumeModal, showTransferModal, showStockInModal,
  consumeQuantity, consumeNote,
  stockInQuantity, stockInPrice, stockInShop, stockInNote,
  transferLocation, locationSelectOptions,
  isExpired, isExpiringSoon, isLowStock,
  getLocationName, formatDate, formatDateTime,
  loadData, openStockIn, handleStockIn, handleConsume, handleTransfer, handleDelete,
} = useStockItem({
  onDeleted: () => router.back(),
});

const translateType = (type: string): string => t(`history.${type}`) || type;
const translateSource = (source: string): string => t(`history.${source}`) || source;
const translateNote = (note: string): string => {
  const knownTypes = ['purchase', 'consume', 'product-opened', 'stock-edit-old', 'stock-edit-new'];
  if (knownTypes.includes(note)) return t(`history.${note}`);
  return note;
};

// Shop autocomplete from price history (loaded via ItemDetailModal's pattern)
const shopOptions = computed(() => {
  if (!item.value?.shop) return [];
  return [{ label: item.value.shop, value: item.value.shop }];
});

// QR Code
const showQRCode = ref(false);

function downloadQRCode() {
  if (!item.value) return;
  const link = document.createElement('a');
  link.href = stockApi.getQRCodeUrl(item.value.id);
  link.download = `item-${item.value.id}-qr.png`;
  link.click();
}

onMounted(() => {
  const id = Number(route.params.id);
  loadData(id);
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

/* === Section Card === */
.section-card {
  background: var(--hh-bg-card);
  border-radius: var(--hh-radius);
  padding: var(--hh-space-4);
  border: 1px solid var(--hh-border-light);
  box-shadow: var(--hh-shadow-sm);
  margin-bottom: var(--hh-space-5);
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

.history-spec {
  font-size: var(--hh-text-xs);
  color: var(--hh-text-tertiary);
  background: var(--hh-bg-secondary);
  padding: 0 var(--hh-space-2);
  border-radius: var(--hh-radius-sm);
}

.history-shop {
  font-size: var(--hh-text-xs);
  color: var(--hh-text-tertiary);
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
