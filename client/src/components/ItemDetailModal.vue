<template>
  <n-modal
    :show="show"
    @update:show="$emit('update:show', $event)"
    preset="card"
    :title="item?.name || ''"
    style="width: 95vw; max-width: 600px; height: 520px"
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
          <n-tag v-if="item.spec" size="small" round :bordered="false" type="info">{{ item.spec }}</n-tag>
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
            <PriceHistoryChart v-if="item" :item-id="item.id" />
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
        <n-button size="small" type="error" ghost @click="handleDelete(item.id, item.name)">删除</n-button>
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
        <n-form-item label="本次价格">
          <n-input-number v-model:value="stockInPrice" :min="0" :precision="2" placeholder="可选" style="width: 100%">
            <template #prefix>¥</template>
          </n-input-number>
        </n-form-item>
        <n-form-item label="商店">
          <n-input v-model:value="stockInShop" placeholder="可选" />
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
import { ref, watch } from 'vue';
import {
  NModal, NSpin, NButton, NSpace, NFormItem, NEmpty,
  NInputNumber, NInput, NSelect, NTag, NTabs, NTabPane, useMessage, useDialog,
} from 'naive-ui';
import { stockApi, locationsApi } from '@/api/client';
import PriceHistoryChart from './PriceHistoryChart.vue';
import { getCategoryColor, getHistoryColor } from '@/utils/format';
import { useStockItem } from '@/composables/useStockItem';

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

const {
  item, history, locations, loading,
  showConsumeModal, showTransferModal, showStockInModal,
  consumeQuantity, consumeNote,
  stockInQuantity, stockInPrice, stockInShop, stockInNote,
  transferLocation, locationSelectOptions,
  isExpired, isExpiringSoon, isLowStock,
  getLocationName, formatDate, formatDateTime,
  loadData, openStockIn, handleStockIn, handleConsume, handleTransfer, handleDelete,
} = useStockItem({
  onUpdated: () => emit('updated'),
  onDeleted: () => { emit('update:show', false); emit('deleted'); },
});

// Batch state
const batches = ref<any[]>([]);
const compacting = ref(false);

const typeTranslationMap: Record<string, string> = {
  'add': '入库',
  'stock-in': '入库',
  'consume': '消耗',
  'transfer': '转移',
  'adjust': '调整',
};

const translateType = (type: string): string => typeTranslationMap[type] || type;

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
