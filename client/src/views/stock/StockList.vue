<template>
  <div class="stock-page">
    <!-- Page Header -->
    <div class="stock-page-header">
      <div class="stock-page-header-left">
        <h2 class="stock-page-title">{{ t('stock.title') }}</h2>
        <span class="stock-page-subtitle">{{ t('stock.subtitle') }}</span>
      </div>
      <div class="stock-page-header-right">
        <n-button v-if="!auditActive" size="small" @click="startAudit">
          <template #icon><n-icon :size="16"><ClipboardOutline /></n-icon></template>
          {{ t('stock.startInventory') }}
        </n-button>
        <n-button v-else type="warning" size="small" @click="cancelAudit">
          <template #icon><n-icon :size="16"><CloseOutline /></n-icon></template>
          {{ t('stock.cancelInventory') }}
        </n-button>
        <n-button v-if="auditActive" type="success" size="small" @click="confirmCompleteAudit">
          <template #icon><n-icon :size="16"><CheckmarkCircleOutline /></n-icon></template>
          {{ t('stock.completeInventory') }}
        </n-button>
        <n-button type="primary" size="small" @click="openQuickStockIn">
          <template #icon><n-icon :size="16"><AddOutline /></n-icon></template>
          快速入库
        </n-button>
      </div>
    </div>

    <!-- Stats Overview (always visible, clickable for filtering) -->
    <div class="stats-overview">
      <div
        class="stat-card"
        :class="['stat-card--primary', { 'stat-card--active': filterStatus === null }]"
        @click="filterStatus = null"
      >
        <div class="stat-icon-wrap"><n-icon :size="20"><CubeOutline /></n-icon></div>
        <div class="stat-body">
          <span class="stat-label">全部</span>
          <span class="stat-value">{{ stockStore.items.length }}</span>
        </div>
      </div>
      <div
        class="stat-card"
        :class="['stat-card--warning', { 'stat-card--active': filterStatus === 'expiring' }]"
        @click="filterStatus = filterStatus === 'expiring' ? null : 'expiring'"
      >
        <div class="stat-icon-wrap"><n-icon :size="20"><WarningOutline /></n-icon></div>
        <div class="stat-body">
          <span class="stat-label">即将过期</span>
          <span class="stat-value">{{ expiringCount }}</span>
        </div>
      </div>
      <div
        class="stat-card"
        :class="['stat-card--error', { 'stat-card--active': filterStatus === 'expired' }]"
        @click="filterStatus = filterStatus === 'expired' ? null : 'expired'"
      >
        <div class="stat-icon-wrap"><n-icon :size="20"><AlertCircleOutline /></n-icon></div>
        <div class="stat-body">
          <span class="stat-label">已过期</span>
          <span class="stat-value">{{ expiredCount }}</span>
        </div>
      </div>
      <div
        class="stat-card"
        :class="['stat-card--danger', { 'stat-card--active': filterStatus === 'lowStock' }]"
        @click="filterStatus = filterStatus === 'lowStock' ? null : 'lowStock'"
      >
        <div class="stat-icon-wrap"><n-icon :size="20"><ArrowDownOutline /></n-icon></div>
        <div class="stat-body">
          <span class="stat-label">低库存</span>
          <span class="stat-value">{{ lowStockCount }}</span>
        </div>
      </div>
      <div
        class="stat-card"
        :class="['stat-card--info', { 'stat-card--active': filterStatus === 'normal' }]"
        @click="filterStatus = filterStatus === 'normal' ? null : 'normal'"
      >
        <div class="stat-icon-wrap"><n-icon :size="20"><CheckmarkCircleOutline /></n-icon></div>
        <div class="stat-body">
          <span class="stat-label">正常</span>
          <span class="stat-value">{{ normalCount }}</span>
        </div>
      </div>
    </div>

    <!-- Audit Panel (collapsible) -->
    <n-collapse-transition :show="auditActive">
      <div class="audit-panel">
        <div class="audit-panel-header">
          <div class="audit-panel-title">
            <n-icon :size="18" color="var(--hh-primary)"><ClipboardOutline /></n-icon>
            <span>{{ t('stock.inventoryCount') }}</span>
          </div>
          <div class="audit-panel-stats">
            <n-tag type="info" size="small" round>{{ countedCount }} / {{ stockStore.items.length }} {{ t('stock.counted') }}</n-tag>
            <n-tag :type="discrepancyCount > 0 ? 'error' : 'success'" size="small" round>
              {{ discrepancyCount }} {{ t('stock.discrepancies') }}
            </n-tag>
          </div>
        </div>
        <div class="audit-progress">
          <div class="audit-progress-info">
            <span>{{ t('stock.auditProgress') }}</span>
            <span class="audit-progress-percent">{{ progressPercent }}%</span>
          </div>
          <n-progress
            type="line"
            :percentage="progressPercent"
            :color="'var(--hh-primary)'"
            :rail-color="'var(--hh-primary-light)'"
            :show-indicator="false"
            :height="8"
            :border-radius="4"
          />
        </div>
        <div class="audit-filter">
          <n-input
            v-model:value="auditSearchQuery"
            :placeholder="t('common.search')"
            clearable
            size="small"
            style="max-width: 200px"
          >
            <template #prefix><n-icon :size="14"><SearchOutline /></n-icon></template>
          </n-input>
          <n-select
            v-model:value="auditFilterStatus"
            :placeholder="t('stock.filterStatus')"
            :options="auditStatusOptions"
            clearable
            size="small"
            style="width: 140px"
          />
        </div>
      </div>
    </n-collapse-transition>

    <!-- Search + Filter Bar -->
    <div class="filter-bar">
      <n-input
        v-model:value="searchQuery"
        :placeholder="t('common.search')"
        clearable
        size="small"
        class="search-input"
      >
        <template #prefix>
          <n-icon :size="16"><SearchOutline /></n-icon>
        </template>
      </n-input>
      <n-select
        v-model:value="filterCategory"
        :placeholder="t('stock.category')"
        :options="categoryOptions"
        clearable
        size="small"
        class="filter-select"
      />
      <n-select
        v-model:value="filterLocation"
        :placeholder="t('stock.location')"
        :options="locationOptions"
        clearable
        size="small"
        class="filter-select"
      />
      <n-select
        v-model:value="filterStatus"
        :placeholder="t('stock.status')"
        :options="statusFilterOptions"
        clearable
        size="small"
        class="filter-select"
      />
      <div class="view-toggle">
        <n-button-group size="small">
          <n-button :type="viewMode === 'table' ? 'primary' : 'default'" @click="viewMode = 'table'">
            <template #icon><n-icon :size="16"><ListOutline /></n-icon></template>
          </n-button>
          <n-button :type="viewMode === 'card' ? 'primary' : 'default'" @click="viewMode = 'card'">
            <template #icon><n-icon :size="16"><GridOutline /></n-icon></template>
          </n-button>
        </n-button-group>
      </div>
    </div>

    <!-- Alert -->
    <n-alert v-if="stockStore.error" type="error" :title="stockStore.error" style="margin-bottom: var(--hh-space-4)" closable @close="stockStore.clearError()" />

    <!-- Card View -->
    <div v-if="viewMode === 'card'" class="card-grid">
      <n-spin :show="stockStore.loading">
        <n-grid :cols="3" :x-gap="16" :y-gap="16">
          <n-gi v-for="item in filteredItems" :key="item.id">
            <n-card class="stock-card hover-card" @click="auditActive ? null : $router.push(`/stock/${item.id}`)">
              <template #header>
                <div class="stock-card-header">
                  <span class="stock-card-name">{{ item.name }}</span>
                  <n-tag v-if="isExpired(item)" size="small" type="error" :bordered="false">{{ t('stock.expired') }}</n-tag>
                  <n-tag v-else-if="isLowStock(item)" size="small" type="warning" :bordered="false">{{ t('stock.lowStock') }}</n-tag>
                </div>
              </template>
              <div class="stock-card-meta">
                <span class="stock-card-quantity">{{ item.quantity }} {{ item.unit }}</span>
                <n-tag size="small" round :bordered="false" :type="getCategoryColor(item.type)">
                  {{ item.type }}
                </n-tag>
              </div>
              <div class="stock-card-price" v-if="item.purchasePrice">
                <span class="price-label">单价</span>
                <span class="price-value">¥{{ item.purchasePrice }}</span>
                <span class="price-total" v-if="item.quantity > 1">小计 ¥{{ (item.quantity * item.purchasePrice).toFixed(2) }}</span>
              </div>
              <div class="stock-card-meta" v-if="item.brand || item.shop">
                <span v-if="item.brand" class="stock-card-brand">{{ item.brand }}</span>
                <span v-if="item.shop" class="stock-card-shop">{{ item.shop }}</span>
              </div>
              <div class="stock-card-footer" v-if="item.locationId">
                <n-icon :size="14"><LocationOutline /></n-icon>
                <span>{{ getLocationName(item.locationId) }}</span>
              </div>
              <!-- Audit Input (card mode) -->
              <div v-if="auditActive" class="stock-card-audit" @click.stop>
                <div class="audit-input-row">
                  <span class="audit-label">{{ t('stock.systemQty') }}</span>
                  <span class="audit-system-qty">{{ item.quantity }}</span>
                </div>
                <div class="audit-input-row">
                  <span class="audit-label">{{ t('stock.actualQty') }}</span>
                  <n-input-number
                    :value="getAuditActualQty(item.id)"
                    size="small"
                    :min="0"
                    :placeholder="t('stock.enterQty')"
                    style="width: 100px"
                    @update:value="(val: number | null) => setAuditActualQty(item.id, val)"
                  />
                </div>
                <div class="audit-input-row" v-if="getAuditActualQty(item.id) !== null">
                  <span class="audit-label">{{ t('stock.difference') }}</span>
                  <span class="audit-diff" :class="getAuditDiffClass(item)">
                    {{ getAuditDiffText(item) }}
                  </span>
                </div>
              </div>
            </n-card>
          </n-gi>
        </n-grid>
        <div v-if="filteredItems.length === 0 && !stockStore.loading" class="empty-stock-state">
          <div class="empty-stock-icon">
            <n-icon :size="48" color="var(--hh-text-tertiary)"><CubeOutline /></n-icon>
          </div>
          <h3 class="empty-stock-title">{{ t('stock.emptyTitle') }}</h3>
          <p class="empty-stock-desc">{{ t('stock.emptyDesc') }}</p>
          <div class="empty-stock-actions">
            <n-button type="primary" size="large" @click="openQuickStockIn">
              <template #icon><n-icon :size="20"><AddOutline /></n-icon></template>
              {{ t('stock.addFirstItem') }}
            </n-button>
          </div>
        </div>
      </n-spin>
    </div>

    <!-- Table View -->
    <div v-else class="table-view">
      <n-spin :show="stockStore.loading">
        <n-data-table
          v-if="filteredItems.length > 0"
          :columns="auditActive ? auditTableColumns : normalTableColumns"
          :data="auditActive ? auditFilteredItems : filteredItems"
          :pagination="{ pageSize: 20 }"
          size="small"
          :row-props="rowProps"
        />
        <div v-else class="empty-stock-state">
          <div class="empty-stock-icon">
            <n-icon :size="48" color="var(--hh-text-tertiary)"><CubeOutline /></n-icon>
          </div>
          <h3 class="empty-stock-title">{{ t('stock.emptyTitle') }}</h3>
          <p class="empty-stock-desc">{{ t('stock.emptyDesc') }}</p>
          <div class="empty-stock-actions">
            <n-button type="primary" size="large" @click="openQuickStockIn">
              <template #icon><n-icon :size="20"><AddOutline /></n-icon></template>
              {{ t('stock.addFirstItem') }}
            </n-button>
          </div>
        </div>
      </n-spin>
    </div>

    <!-- 快速入库 Modal -->
    <n-modal v-model:show="showQuickStockInModal" title="快速入库" preset="card" style="max-width: 520px" :mask-closable="false" :segmented="{ footer: true }">
      <!-- Step 1: 搜索产品 -->
      <div v-if="quickStockInStep === 1" class="qs-step">
        <div class="qs-search-row">
          <n-input
            v-model:value="quickStockInSearch"
            placeholder="扫码或输入产品名称..."
            size="large"
            clearable
            @keyup.enter="handleQuickStockInSearch"
            :disabled="quickStockInSearching"
          >
            <template #prefix><n-icon :size="18"><SearchOutline /></n-icon></template>
          </n-input>
          <n-button type="primary" size="large" @click="handleQuickStockInSearch" :loading="quickStockInSearching" style="flex-shrink: 0">
            搜索
          </n-button>
          <n-button size="large" @click="handleBarcodeScan('search')" :disabled="!barcodeAdapter?.isSupported" style="flex-shrink: 0">
            <template #icon><n-icon :size="20"><ScanOutline /></n-icon></template>
          </n-button>
        </div>

        <div v-if="quickStockInSearchResults.length > 0" class="qs-results">
          <div class="qs-results-count">找到 {{ quickStockInSearchResults.length }} 个产品</div>
          <div class="qs-result-list">
            <div
              v-for="item in quickStockInSearchResults"
              :key="item.id"
              class="qs-result-item"
              @click="selectQuickStockInProduct(item)"
            >
              <div class="qs-result-left">
                <span class="qs-result-name">{{ item.name }}</span>
                <div class="qs-result-tags">
                  <n-tag v-if="item.type" size="tiny" round :bordered="false">{{ item.type }}</n-tag>
                  <n-tag v-if="item.barcode" size="tiny" round :bordered="false">{{ item.barcode }}</n-tag>
                </div>
              </div>
              <div class="qs-result-right">
                <span class="qs-result-qty">{{ item.quantity }} {{ item.unit }}</span>
                <n-icon :size="16"><ChevronForwardOutline /></n-icon>
              </div>
            </div>
          </div>
        </div>

        <div v-if="quickStockInSearch && quickStockInSearchResults.length === 0 && !quickStockInSearching" class="qs-empty">
          <n-icon :size="40" color="var(--hh-text-tertiary)"><CubeOutline /></n-icon>
          <span class="qs-empty-text">未找到「{{ quickStockInSearch }}」</span>
          <n-button type="primary" @click="openProductFormDialog">
            <template #icon><n-icon :size="16"><AddOutline /></n-icon></template>
            快速添加
          </n-button>
        </div>
      </div>

      <!-- Step 2: 已移除，使用 ProductFormDialog 替代 -->

      <!-- Step 3: 入库确认 -->
      <div v-if="quickStockInStep === 3" class="qs-step">
        <div class="qs-product-card">
          <div class="qs-product-name">{{ quickStockInSelectedProduct!.name }}</div>
          <div class="qs-product-meta">
            <span>当前库存: <strong>{{ quickStockInSelectedProduct!.quantity }} {{ quickStockInSelectedProduct!.unit }}</strong></span>
            <span v-if="quickStockInSelectedProduct!.type">类别: {{ quickStockInSelectedProduct!.type }}</span>
            <span v-if="quickStockInSelectedProduct!.barcode">条码: {{ quickStockInSelectedProduct!.barcode }}</span>
          </div>
        </div>
        <div class="qs-form-section">
          <div class="qs-form-grid">
            <div class="qs-form-row">
              <label class="qs-label">入库数量</label>
              <n-input-number v-model:value="quickStockInQuantity" :min="0.01" :max="99999" size="large" style="width: 100%" />
            </div>
            <div class="qs-form-row">
              <label class="qs-label">单价 (¥)</label>
              <n-input-number v-model:value="quickStockInPrice" :min="0" :precision="2" placeholder="0.00" size="large" style="width: 100%">
                <template #prefix>¥</template>
              </n-input-number>
            </div>
          </div>
          <div class="qs-form-row">
            <label class="qs-label">存放位置</label>
            <n-select v-model:value="quickStockInLocationId" :options="locationOptions" clearable placeholder="选择位置" />
          </div>
          <div class="qs-form-row">
            <label class="qs-label">备注</label>
            <n-input v-model:value="quickStockInNote" placeholder="可选" />
          </div>
        </div>
        <div v-if="quickStockInQuantity > 0" class="qs-preview">
          入库后库存: <strong class="qs-preview-val">{{ (quickStockInSelectedProduct!.quantity || 0) + quickStockInQuantity }} {{ quickStockInSelectedProduct!.unit }}</strong>
        </div>
        <div class="qs-footer-actions">
          <n-button @click="quickStockInStep = 1">重新选择</n-button>
          <n-button type="success" @click="handleQuickStockInConfirm" :loading="quickStockInConfirming" :disabled="!quickStockInQuantity">
            <template #icon><n-icon :size="16"><CheckmarkOutline /></n-icon></template>
            确认入库
          </n-button>
        </div>
      </div>
    </n-modal>

    <ProductFormDialog
      v-model:visible="showProductFormDialog"
      @saved="onProductCreated"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, h } from 'vue';
import {
  NButton, NButtonGroup, NSpace, NInput, NSelect, NDataTable,
  NModal, NForm, NFormItem, NInputNumber, NSpin, NAlert, NCollapseTransition,
  NTag, NIcon, NProgress, NCard, NGrid, NGi, useMessage, useDialog,
} from 'naive-ui';
import type { DataTableColumns } from 'naive-ui';
import { useRouter } from 'vue-router';
import { useStockStore } from '@/stores/stock.store';
import { useI18n } from '@/locales';
import { stockApi, locationsApi, unitsApi, productsApi } from '@/api/client';
import api from '@/api/client';
import type { Category, Location, Item } from '@/shared/types';
import {
  AddOutline, SearchOutline, ListOutline, GridOutline, LocationOutline,
  CreateOutline, TrashOutline, CheckmarkOutline,
  CubeOutline, WarningOutline, AlertCircleOutline,
  ClipboardOutline, CloseOutline, CheckmarkCircleOutline,
  WalletOutline, ArrowDownOutline, ScanOutline,
  ChevronForwardOutline, ArrowBackOutline,
} from '@vicons/ionicons5';
import { getCategoryColor } from '@/utils/format';
import ProductFormDialog from '@/components/ProductFormDialog.vue';
import { clientRegistry } from '@/plugins/client-registry';
import type { ScanResult } from '@/plugins/types/client-plugin.types';

interface UnitOption { id: number; name: string; ratio?: number; notes?: string }
type ViewMode = 'table' | 'card';

const message = useMessage();
const dialog = useDialog();
const router = useRouter();
const stockStore = useStockStore();
const { t } = useI18n();

// ── Page State ──
const searchQuery = ref('');
const filterCategory = ref<string | null>(null);
const filterLocation = ref<string | null>(null);
const filterStatus = ref<string | null>(null);
const viewMode = ref<ViewMode>('table');

// ── Audit State ──
const auditActive = ref(false);
const auditSearchQuery = ref('');
const auditFilterStatus = ref<string | null>(null);
const auditActualQtyMap = ref<Map<number, number | null>>(new Map());

const auditStatusOptions = computed(() => [
  { label: t('stock.all'), value: 'all' },
  { label: t('stock.pending'), value: 'pending' },
  { label: t('stock.matched'), value: 'matched' },
  { label: t('stock.discrepancy'), value: 'discrepancy' },
]);

// ── Quick Stock In State ──
const showQuickStockInModal = ref(false);
const showProductFormDialog = ref(false);
const quickStockInStep = ref(1);
const quickStockInSearch = ref('');
const quickStockInSearching = ref(false);
const quickStockInSearchResults = ref<any[]>([]);
const quickStockInSelectedProduct = ref<any | null>(null);
const quickStockInQuantity = ref(1);
const quickStockInPrice = ref(0);
const quickStockInLocationId = ref<number | null>(null);
const quickStockInNote = ref('');
const quickStockInConfirming = ref(false);
const locations = ref<Location[]>([]);

// ── Data ──
const categories = ref<Category[]>([]);
const units = ref<UnitOption[]>([]);

// ── Computed ──
const expiringCount = computed(() =>
  stockStore.items.filter(i => isExpiring(i)).length
);

const lowStockCount = computed(() =>
  stockStore.items.filter(i => isLowStock(i)).length
);

const expiredCount = computed(() =>
  stockStore.items.filter(i => isExpired(i)).length
);

const totalValue = computed(() =>
  stockStore.items.reduce((sum, i) => {
    const price = i.purchasePrice || i.lastPrice || 0;
    return sum + (i.quantity || 0) * price;
  }, 0)
);

const categoryOptions = computed(() =>
  categories.value.map(c => ({ label: `${c.icon || ''} ${c.name}`, value: c.name }))
);

const locationOptions = computed(() =>
  locations.value.map(l => ({ label: l.name, value: l.id }))
);

const statusFilterOptions = computed(() => [
  { label: '全部', value: 'all' },
  { label: '即将过期', value: 'expiring' },
  { label: '已过期', value: 'expired' },
  { label: '低库存', value: 'lowStock' },
  { label: '正常', value: 'normal' },
]);

const normalCount = computed(() =>
  stockStore.items.filter(i => !isExpired(i) && !isExpiring(i) && !isLowStock(i)).length
);

const unitOptions = computed(() =>
  units.value.map(u => ({ label: u.name, value: u.name }))
);

const filteredItems = computed(() => {
  let items = stockStore.items;
  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase();
    items = items.filter(i => i.name.toLowerCase().includes(q));
  }
  if (filterCategory.value) items = items.filter(i => i.type === filterCategory.value);
  if (filterLocation.value) items = items.filter(i => i.locationId === Number(filterLocation.value));
  if (filterStatus.value && filterStatus.value !== 'all') {
    items = items.filter(i => {
      if (filterStatus.value === 'expired') return isExpired(i);
      if (filterStatus.value === 'expiring') return isExpiring(i) && !isExpired(i);
      if (filterStatus.value === 'lowStock') return isLowStock(i) && !isExpired(i);
      if (filterStatus.value === 'normal') return !isExpired(i) && !isExpiring(i) && !isLowStock(i);
      return true;
    });
  }
  return items;
});

const auditFilteredItems = computed(() => {
  let items = filteredItems.value;
  if (auditSearchQuery.value) {
    const q = auditSearchQuery.value.toLowerCase();
    items = items.filter(i => i.name.toLowerCase().includes(q));
  }
  if (auditFilterStatus.value && auditFilterStatus.value !== 'all') {
    items = items.filter(i => {
      const actual = auditActualQtyMap.value.get(i.id);
      if (auditFilterStatus.value === 'pending') return actual === null || actual === undefined;
      if (auditFilterStatus.value === 'matched') return actual !== null && actual === i.quantity;
      if (auditFilterStatus.value === 'discrepancy') return actual !== null && actual !== i.quantity;
      return true;
    });
  }
  return items;
});

const countedCount = computed(() => {
  let count = 0;
  for (const item of stockStore.items) {
    const actual = auditActualQtyMap.value.get(item.id);
    if (actual !== null && actual !== undefined) count++;
  }
  return count;
});

const discrepancyCount = computed(() => {
  let count = 0;
  for (const item of stockStore.items) {
    const actual = auditActualQtyMap.value.get(item.id);
    if (actual !== null && actual !== undefined && actual !== item.quantity) count++;
  }
  return count;
});

const progressPercent = computed(() => {
  if (stockStore.items.length === 0) return 0;
  return Math.round((countedCount.value / stockStore.items.length) * 100);
});

// ── Quick Stock In Methods ──
function openQuickStockIn() {
  quickStockInStep.value = 1;
  quickStockInSearch.value = '';
  quickStockInSearchResults.value = [];
  quickStockInSelectedProduct.value = null;
  quickStockInQuantity.value = 1;
  quickStockInPrice.value = 0;
  quickStockInLocationId.value = null;
  quickStockInNote.value = '';
  quickStockInNewProduct.name = '';
  quickStockInNewProduct.barcode = '';
  quickStockInNewProduct.type = null;
  quickStockInNewProduct.unit = '';
  quickStockInNewProduct.brand = '';
  showQuickStockInModal.value = true;
}

async function handleQuickStockInSearch() {
  if (!quickStockInSearch.value.trim()) return;
  quickStockInSearching.value = true;
  try {
    const res = await productsApi.search(quickStockInSearch.value.trim());
    quickStockInSearchResults.value = res.data || [];
  } catch {
    message.error('搜索失败');
  } finally {
    quickStockInSearching.value = false;
  }
}

function selectQuickStockInProduct(product: any) {
  quickStockInSelectedProduct.value = product;
  quickStockInQuantity.value = 1;
  quickStockInPrice.value = product.defaultPrice || 0;
  quickStockInStep.value = 3;
}

function openProductFormDialog() {
  showProductFormDialog.value = true;
}

function onProductCreated(product: any) {
  quickStockInSelectedProduct.value = product;
  quickStockInQuantity.value = 1;
  quickStockInPrice.value = product.defaultPrice || 0;
  quickStockInStep.value = 3;
}

async function handleQuickStockInConfirm() {
  if (!quickStockInSelectedProduct.value || !quickStockInQuantity.value) return;
  quickStockInConfirming.value = true;
  try {
    const payload: Record<string, unknown> = {
      name: quickStockInSelectedProduct.value.name,
      productId: quickStockInSelectedProduct.value.id,
      unit: quickStockInSelectedProduct.value.unit || '个',
      type: 'generic',
      quantity: quickStockInQuantity.value,
      purchasePrice: quickStockInPrice.value || undefined,
      locationId: quickStockInLocationId.value || undefined,
      notes: quickStockInNote.value || undefined,
    };
    await stockApi.create(payload);
    message.success('入库成功');
    showQuickStockInModal.value = false;
    await stockStore.fetchItems();
  } catch {
    message.error('入库失败');
  } finally {
    quickStockInConfirming.value = false;
  }
}

// ── Barcode Scanner ──
const barcodeAdapter = computed(() => {
  void clientRegistry.getRevision();
  return clientRegistry.getScannerAdapter('barcode');
});

async function handleBarcodeScan(target: 'search' | 'barcode') {
  const adapter = barcodeAdapter.value;
  if (!adapter?.isSupported) {
    message.warning('当前浏览器不支持摄像头扫码');
    return;
  }
  try {
    const result: ScanResult = await adapter.scan();
    if (target === 'search') {
      quickStockInSearch.value = result.raw;
      await handleQuickStockInSearch();
    } else {
      quickStockInNewProduct.barcode = result.raw;
    }
    message.success(`扫码成功: ${result.raw}`);
  } catch {
    message.info('扫码已取消');
  }
}

// ── Audit Methods ──
function getAuditActualQty(itemId: number): number | null {
  const val = auditActualQtyMap.value.get(itemId);
  return val !== undefined ? val : null;
}

function setAuditActualQty(itemId: number, val: number | null) {
  const newMap = new Map(auditActualQtyMap.value);
  newMap.set(itemId, val);
  auditActualQtyMap.value = newMap;
}

function getAuditDiffText(item: Item): string {
  const actual = getAuditActualQty(item.id);
  if (actual === null) return '-';
  const diff = actual - item.quantity;
  if (diff === 0) return '0';
  return diff > 0 ? `+${diff}` : `${diff}`;
}

function getAuditDiffClass(item: Item): string {
  const actual = getAuditActualQty(item.id);
  if (actual === null) return '';
  const diff = actual - item.quantity;
  if (diff === 0) return 'diff-match';
  if (diff > 0) return 'diff-surplus';
  return 'diff-shortage';
}

function startAudit() {
  auditActive.value = true;
  auditActualQtyMap.value = new Map();
  message.info(t('stock.inventoryStarted'));
}

function cancelAudit() {
  dialog.warning({
    title: t('stock.cancelInventory'),
    content: t('stock.cancelInventoryConfirm'),
    positiveText: t('common.confirm'),
    negativeText: t('common.cancel'),
    onPositiveClick: () => {
      auditActive.value = false;
      auditActualQtyMap.value = new Map();
    },
  });
}

function confirmCompleteAudit() {
  const uncounted = stockStore.items.length - countedCount.value;
  const disc = discrepancyCount.value;
  dialog.warning({
    title: t('stock.completeInventory'),
    content: uncounted > 0
      ? `${t('stock.completeInventoryMsg')} (${uncounted} ${t('stock.pending')})`
      : t('stock.completeInventoryMsg'),
    positiveText: t('stock.completeInventory'),
    negativeText: t('common.cancel'),
    onPositiveClick: () => {
      message.success(t('stock.inventoryComplete', { total: stockStore.items.length, diff: disc }));
      auditActive.value = false;
      auditActualQtyMap.value = new Map();
    },
  });
}

// ── Table Columns ──
const normalTableColumns: DataTableColumns<Item> = [
  { title: t('stock.name'), key: 'name', render: (row) => h('span', { style: 'font-weight: 500' }, row.name) },
  { title: t('stock.quantity'), key: 'quantity', width: 90, render: (row) => h('span', {}, `${row.quantity} ${row.unit}`) },
  { title: '单价', key: 'purchasePrice', width: 100, align: 'right', render: (row) => {
    if (!row.purchasePrice) return h('span', { style: 'color: var(--hh-text-tertiary)' }, '-');
    return h('span', { style: 'font-weight: 500; color: var(--hh-success)' }, `¥${row.purchasePrice}`);
  }},
  { title: '小计', key: 'subtotal', width: 100, align: 'right', render: (row) => {
    if (!row.purchasePrice) return '-';
    const subtotal = (row.quantity || 0) * row.purchasePrice;
    return h('span', { style: 'font-weight: 600' }, `¥${subtotal.toFixed(2)}`);
  }},
  { title: '品牌', key: 'brand', width: 90, render: (row) => {
    if (!row.brand) return h('span', { style: 'color: var(--hh-text-tertiary)' }, '-');
    return h('span', {}, row.brand);
  }},
  { title: '商店', key: 'shop', width: 90, render: (row) => {
    if (!row.shop) return h('span', { style: 'color: var(--hh-text-tertiary)' }, '-');
    return h('span', {}, row.shop);
  }},
  { title: t('stock.category'), key: 'type', width: 100, render: (row) => h(NTag as any, { size: 'small', round: true, bordered: false, type: getCategoryColor(row.type) }, { default: () => row.type }) },
  { title: t('stock.expiryDate'), key: 'expiryDate', width: 110, render: (row) => {
    if (!row.expiryDate) return '-';
    const isExp = new Date(row.expiryDate) < new Date();
    return h('span', { style: isExp ? { color: 'var(--hh-error)' } : {} }, new Date(row.expiryDate).toLocaleDateString());
  }},
  { title: t('common.edit'), key: 'actions', width: 80, align: 'center', render: (row) => h(NSpace as any, { size: 4, align: 'center' }, {
    default: () => [
      h(NButton as any, { size: 'tiny', quaternary: true, type: 'primary', onClick: () => handleConsume(row) }, { icon: () => h(NIcon as any, { size: 16 }, { default: () => h(CreateOutline) }) }),
      h(NButton as any, { size: 'tiny', quaternary: true, type: 'error', onClick: () => handleDeleteItem(row) }, { icon: () => h(NIcon as any, { size: 16 }, { default: () => h(TrashOutline) }) }),
    ],
  })},
];

const auditTableColumns: DataTableColumns<Item> = [
  { title: t('stock.name'), key: 'name', width: 160, render: (row) => h('span', { style: 'font-weight: 500' }, row.name) },
  { title: t('stock.systemQty'), key: 'quantity', width: 100, align: 'center', render: (row) => h('span', { style: 'font-weight: 500' }, `${row.quantity} ${row.unit}`) },
  { title: t('stock.actualQty'), key: 'actualQty', width: 130, align: 'center', render: (row) => h(NInputNumber, {
    value: getAuditActualQty(row.id),
    size: 'small',
    min: 0,
    placeholder: t('stock.enterQty'),
    style: 'width: 100px',
    onUpdateValue: (val: number | null) => setAuditActualQty(row.id, val),
  })},
  { title: t('stock.difference'), key: 'diff', width: 80, align: 'center', render: (row) => {
    const actual = getAuditActualQty(row.id);
    if (actual === null) return h('span', { style: 'color: var(--hh-text-tertiary)' }, '-');
    const diff = actual - row.quantity;
    const cls = diff === 0 ? 'diff-match' : diff > 0 ? 'diff-surplus' : 'diff-shortage';
    return h('span', { class: cls, style: 'font-weight: 600' }, getAuditDiffText(row));
  }},
  { title: t('stock.status'), key: 'status', width: 90, align: 'center', render: (row) => {
    const actual = getAuditActualQty(row.id);
    if (actual === null) return h(NTag, { size: 'small', round: true, type: 'default' }, { default: () => t('stock.pending') });
    if (actual === row.quantity) return h(NTag, { size: 'small', round: true, type: 'success' }, { default: () => t('stock.matched') });
    return h(NTag, { size: 'small', round: true, type: 'error' }, { default: () => t('stock.discrepancy') });
  }},
];

// ── Existing Methods ──
const isExpired = (item: Item): boolean => item.expiryDate ? new Date(item.expiryDate) < new Date() : false;
const isExpiring = (item: Item): boolean => {
  if (!item.expiryDate) return false;
  const d = new Date(item.expiryDate);
  const now = new Date();
  const in30Days = new Date(now.getTime() + 30 * 86400000);
  return d >= now && d <= in30Days;
};
const isLowStock = (item: Item): boolean => item.minStock !== null && item.quantity <= item.minStock;
const getLocationName = (locationId: number | null): string => {
  if (!locationId) return '-';
  const loc = locations.value.find(l => l.id === locationId);
  return loc ? loc.name : String(locationId);
};

const rowProps = (row: Item) => auditActive.value ? {} : { style: 'cursor: pointer;', onClick: () => router.push({ name: 'stock-detail', params: { id: row.id } }) };

const handleConsume = async (item: Item) => {
  try { await stockStore.consumeItem(item.id, 1); message.success(t('stock.consumeSuccess')); }
  catch (e: unknown) { const err = e as { response?: { data?: { message?: string } } }; message.error(err.response?.data?.message || t('common.error')); }
};

const handleDeleteItem = (item: Item) => {
  dialog.warning({
    title: '确认删除', content: `确定要删除「${item.name}」吗？此操作不可撤销。`,
    positiveText: '删除', negativeText: '取消',
    onPositiveClick: async () => {
      try { await stockStore.deleteItem(item.id); message.success('删除成功'); }
      catch (e: unknown) { const err = e as { response?: { data?: { message?: string } } }; message.error(err.response?.data?.message || '删除失败'); }
    },
  });
};

onMounted(async () => {
  try { await stockStore.fetchItems(); } catch (_e: unknown) {}
  try {
    const [catRes, locRes, unitRes] = await Promise.all([
      api.get('/categories').then(r => r.data || []),
      locationsApi.list().then(r => r.data || []),
      unitsApi.list().then(r => r.data || []),
    ]);
    categories.value = catRes as Category[];
    locations.value = locRes as Location[];
    units.value = unitRes as UnitOption[];
  } catch (e: unknown) {
    const err = e as { response?: { data?: { message?: string } } };
    message.error(err.response?.data?.message || '加载选项失败');
  }
});
</script>

<style scoped>
.stock-page { max-width: 1200px; margin: 0 auto; }

.stock-page-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: var(--hh-space-4); gap: var(--hh-space-3); }
.stock-page-header-left { display: flex; align-items: baseline; gap: var(--hh-space-3); min-width: 0; }
.stock-page-title { font-size: var(--hh-text-xl); font-weight: var(--hh-weight-bold); color: var(--hh-text); margin: 0; white-space: nowrap; }
.stock-page-subtitle { font-size: var(--hh-text-sm); color: var(--hh-text-tertiary); white-space: nowrap; }
.stock-page-header-right { display: flex; align-items: center; gap: var(--hh-space-2); flex-shrink: 0; }

/* Stats Overview */
.stats-overview { display: grid; grid-template-columns: repeat(5, 1fr); gap: var(--hh-space-3); margin-bottom: var(--hh-space-4); }
.stat-card { display: flex; align-items: center; gap: var(--hh-space-3); padding: var(--hh-space-3); background: var(--hh-bg-card); border-radius: var(--hh-radius); border: 1px solid var(--hh-border-light); box-shadow: var(--hh-shadow-sm); cursor: pointer; transition: all 0.2s; }
.stat-card:hover { border-color: var(--hh-primary); }
.stat-card--active { border-color: var(--hh-primary); background: var(--hh-primary-lighter); }
.stat-icon-wrap { width: 36px; height: 36px; border-radius: var(--hh-radius-md); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.stat-card--primary .stat-icon-wrap { background: #eff6ff; color: #3b82f6; }
.stat-card--info .stat-icon-wrap { background: #f0f9ff; color: #0ea5e9; }
.stat-card--warning .stat-icon-wrap { background: #fffbeb; color: #f59e0b; }
.stat-card--error .stat-icon-wrap { background: #fef2f2; color: #ef4444; }
.stat-card--danger .stat-icon-wrap { background: #fff1f2; color: #f43f5e; }
.stat-body { display: flex; flex-direction: column; gap: 2px; }
.stat-label { font-size: var(--hh-text-xs); color: var(--hh-text-tertiary); }
.stat-value { font-size: var(--hh-text-xl); font-weight: var(--hh-weight-bold); color: var(--hh-text); line-height: 1; }

/* Audit Panel */
.audit-panel { background: var(--hh-bg-card); border-radius: var(--hh-radius); border: 1px solid var(--hh-primary); box-shadow: var(--hh-shadow-sm); padding: var(--hh-space-4); margin-bottom: var(--hh-space-4); }
.audit-panel-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: var(--hh-space-3); }
.audit-panel-title { display: flex; align-items: center; gap: var(--hh-space-2); font-size: var(--hh-text-base); font-weight: var(--hh-weight-semibold); color: var(--hh-text); }
.audit-panel-stats { display: flex; gap: var(--hh-space-2); }
.audit-progress { margin-bottom: var(--hh-space-3); }
.audit-progress-info { display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--hh-space-2); font-size: var(--hh-text-sm); color: var(--hh-text-secondary); }
.audit-progress-percent { font-weight: var(--hh-weight-bold); color: var(--hh-primary); }
.audit-filter { display: flex; gap: var(--hh-space-2); align-items: center; }

/* Audit Diff */
.diff-match { color: var(--hh-success); }
.diff-surplus { color: var(--hh-warning); }
.diff-shortage { color: var(--hh-error); }

/* Card Audit */
.stock-card-audit { margin-top: var(--hh-space-3); padding-top: var(--hh-space-3); border-top: 1px solid var(--hh-border-light); display: flex; flex-direction: column; gap: var(--hh-space-2); }
.audit-input-row { display: flex; align-items: center; gap: var(--hh-space-2); }
.audit-label { font-size: var(--hh-text-xs); color: var(--hh-text-tertiary); min-width: 50px; }
.audit-system-qty { font-size: var(--hh-text-sm); font-weight: var(--hh-weight-medium); }
.audit-diff { font-size: var(--hh-text-sm); font-weight: var(--hh-weight-bold); }

/* Filter Bar */
.filter-bar { display: flex; align-items: center; gap: var(--hh-space-3); margin-bottom: var(--hh-space-4); padding: var(--hh-space-3) var(--hh-space-4); background: var(--hh-bg-card); border-radius: var(--hh-radius); border: 1px solid var(--hh-border-light); box-shadow: var(--hh-shadow-sm); }
.search-input { flex: 1; min-width: 200px; }
.filter-select { width: 140px; }
.view-toggle { margin-left: auto; }

/* Card Grid */
.stock-card { cursor: pointer; }
.stock-card-header { display: flex; justify-content: space-between; align-items: center; gap: var(--hh-space-2); }
.stock-card-name { font-weight: 600; font-size: 15px; }
.stock-card-meta { display: flex; align-items: center; justify-content: space-between; gap: var(--hh-space-2); margin-top: var(--hh-space-2); }
.stock-card-quantity { font-size: var(--hh-text-sm); color: var(--hh-text-secondary); font-weight: var(--hh-weight-medium); }
.stock-card-price { display: flex; align-items: baseline; gap: var(--hh-space-2); margin-top: var(--hh-space-2); padding-top: var(--hh-space-2); border-top: 1px solid var(--hh-border-light); }
.price-label { font-size: var(--hh-text-xs); color: var(--hh-text-tertiary); }
.price-value { font-size: var(--hh-text-sm); font-weight: var(--hh-weight-semibold); color: var(--hh-success); }
.price-total { font-size: var(--hh-text-xs); color: var(--hh-text-secondary); }
.stock-card-meta { display: flex; align-items: center; gap: var(--hh-space-2); margin-top: var(--hh-space-2); }
.stock-card-brand, .stock-card-shop { font-size: var(--hh-text-xs); color: var(--hh-text-secondary); background: var(--hh-bg-secondary); padding: 2px 6px; border-radius: var(--hh-radius-sm); }
.stock-card-footer { display: flex; align-items: center; gap: var(--hh-space-1); font-size: var(--hh-text-xs); color: var(--hh-text-tertiary); margin-top: var(--hh-space-2); }

/* Table View */
.table-view { background: var(--hh-bg-card); border-radius: var(--hh-radius); border: 1px solid var(--hh-border-light); box-shadow: var(--hh-shadow-sm); padding: var(--hh-space-3); }

/* Empty Stock */
.empty-stock-state { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: var(--hh-space-8) var(--hh-space-4); text-align: center; gap: var(--hh-space-4); }
.empty-stock-icon { opacity: 0.5; margin-bottom: var(--hh-space-2); }
.empty-stock-title { font-size: var(--hh-text-xl); font-weight: var(--hh-weight-semibold); color: var(--hh-text); margin: 0; }
.empty-stock-desc { font-size: var(--hh-text-sm); color: var(--hh-text-secondary); max-width: 360px; line-height: 1.5; margin: 0; }
.empty-stock-actions { display: flex; gap: var(--hh-space-3); margin-top: var(--hh-space-2); }

/* Quick Stock In Modal */
.qs-step { display: flex; flex-direction: column; gap: 16px; min-height: 200px; }
.qs-search-row { display: flex; gap: 8px; }
.qs-search-row .n-input { flex: 1; }

.qs-results-count { font-size: 12px; color: var(--hh-text-tertiary); }
.qs-result-list { display: flex; flex-direction: column; gap: 6px; max-height: 300px; overflow-y: auto; }
.qs-result-item { display: flex; align-items: center; justify-content: space-between; padding: 10px 12px; background: var(--hh-bg-secondary); border-radius: 8px; cursor: pointer; transition: all 0.15s; }
.qs-result-item:hover { background: var(--hh-primary-lighter); border-color: var(--hh-primary); }
.qs-result-left { display: flex; flex-direction: column; gap: 4px; }
.qs-result-name { font-size: 14px; font-weight: 500; color: var(--hh-text); }
.qs-result-tags { display: flex; gap: 4px; flex-wrap: wrap; }
.qs-result-right { display: flex; align-items: center; gap: 6px; color: var(--hh-text-secondary); }
.qs-result-qty { font-size: 13px; font-weight: 500; }

.qs-empty { display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 40px 0; }
.qs-empty-text { font-size: 14px; color: var(--hh-text-tertiary); }

.qs-back-row { margin-bottom: -8px; }
.qs-form-section { display: flex; flex-direction: column; gap: 12px; }
.qs-form-row { display: flex; flex-direction: column; gap: 4px; }
.qs-form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.qs-label { font-size: 13px; font-weight: 500; color: var(--hh-text-secondary); }
.qs-input-with-scan { display: flex; gap: 6px; }
.qs-input-with-scan .n-input { flex: 1; }

.qs-product-card { background: linear-gradient(135deg, var(--hh-primary-lighter), #f0f9ff); border-radius: 10px; padding: 14px 16px; display: flex; flex-direction: column; gap: 8px; }
.qs-product-name { font-size: 16px; font-weight: 600; color: var(--hh-primary); }
.qs-product-meta { display: flex; flex-wrap: wrap; gap: 8px; font-size: 13px; color: var(--hh-text-secondary); }
.qs-product-meta strong { color: var(--hh-text); }

.qs-preview { background: #f0fdf4; border-radius: 8px; padding: 10px 14px; font-size: 14px; color: var(--hh-text-secondary); text-align: center; }
.qs-preview-val { color: var(--hh-success); font-weight: 600; }

.qs-footer-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 4px; }

/* Responsive */
@media (max-width: 768px) {
  .stats-overview { grid-template-columns: repeat(2, 1fr); }
  .filter-bar { flex-wrap: wrap; }
  .search-input { min-width: 100%; }
  .filter-select { width: 120px; }
  .qs-form-grid { grid-template-columns: 1fr; }
}
</style>
