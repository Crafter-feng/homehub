<template>
  <div class="master-data-page">
    <n-page-header :title="t('masterData.title')" :subtitle="t('masterData.subtitle')" />

    <n-card class="page-section">
      <n-tabs v-model:value="activeTab" type="line" animated>
        <!-- 产品 -->
        <n-tab-pane name="products" :tab="t('masterData.products')">
          <div class="tab-toolbar">
            <n-button type="primary" @click="showProductFormDialog = true">{{ t('masterData.addProduct') }}</n-button>
          </div>
          <n-data-table :columns="productColumns" :data="products" :pagination="{ pageSize: 20 }" />
        </n-tab-pane>

        <!-- 位置 -->
        <n-tab-pane name="locations" :tab="t('masterData.locations')">
          <div class="tab-toolbar">
            <n-button type="primary" @click="showLocationModal = true">{{ t('masterData.addLocation') }}</n-button>
          </div>
          <n-data-table :columns="locationColumns" :data="locations" :pagination="{ pageSize: 20 }" />
        </n-tab-pane>

        <!-- 商店 -->
        <n-tab-pane name="shops" :tab="t('masterData.shops')">
          <div class="tab-toolbar">
            <n-button type="primary" @click="showShopModal = true">{{ t('masterData.addShop') }}</n-button>
          </div>
          <n-data-table :columns="shopColumns" :data="shops" :pagination="{ pageSize: 20 }" />
        </n-tab-pane>

        <!-- 品牌 -->
        <n-tab-pane name="brands" :tab="t('masterData.brands')">
          <div class="tab-toolbar">
            <n-button type="primary" @click="showBrandModal = true">{{ t('masterData.addBrand') }}</n-button>
          </div>
          <n-data-table :columns="brandColumns" :data="brands" :pagination="{ pageSize: 20 }" />
        </n-tab-pane>

        <!-- 标签 -->
        <n-tab-pane name="tags" :tab="t('masterData.tags')">
          <div class="tab-toolbar">
            <n-button type="primary" @click="showTagModal = true">{{ t('masterData.addTag') }}</n-button>
          </div>
          <n-data-table :columns="tagColumns" :data="tags" :pagination="{ pageSize: 20 }" />
        </n-tab-pane>

        <!-- 数量单位 -->
        <n-tab-pane name="units" :tab="t('masterData.units')">
          <div class="tab-toolbar">
            <n-button type="primary" @click="showUnitModal = true">{{ t('masterData.addUnit') }}</n-button>
          </div>
          <n-data-table :columns="unitColumns" :data="units" :pagination="{ pageSize: 20 }" />
        </n-tab-pane>

        <!-- 类别 -->
        <n-tab-pane name="types" :tab="t('masterData.categories')">
          <div class="tab-toolbar">
            <n-button type="primary" @click="showTypeModal = true">{{ t('masterData.addCategory') }}</n-button>
          </div>
          <n-data-table :columns="typeColumns" :data="types" :pagination="{ pageSize: 20 }" />
        </n-tab-pane>
      </n-tabs>
    </n-card>

    <ProductFormDialog
      v-model:visible="showProductFormDialog"
      :product="editingProduct"
      @saved="onProductSaved"
    />

    <!-- 位置弹窗 -->
    <n-modal v-model:show="showLocationModal" :title="editingLocation ? t('masterData.editLocation') : t('masterData.addLocation')" preset="card" style="max-width: 500px">
      <n-form :model="locationForm">
        <n-form-item :label="t('masterData.locationName')" required>
          <n-input v-model:value="locationForm.name" :placeholder="t('masterData.locationNamePlaceholder')" />
        </n-form-item>
        <n-form-item :label="t('masterData.parentLocation')">
          <n-select v-model:value="locationForm.parentId" :options="parentOptions" clearable :placeholder="t('masterData.noParent')" />
        </n-form-item>
        <n-form-item :label="t('common.notes')">
          <n-input v-model:value="locationForm.notes" type="textarea" />
        </n-form-item>
      </n-form>
      <template #footer>
        <n-space justify="end">
          <n-button @click="showLocationModal = false">{{ t('common.cancel') }}</n-button>
          <n-button type="primary" @click="saveLocation">{{ t('common.save') }}</n-button>
        </n-space>
      </template>
    </n-modal>

    <!-- 商店弹窗 -->
    <n-modal v-model:show="showShopModal" :title="editingShop ? t('masterData.editShop') : t('masterData.addShop')" preset="card" style="max-width: 500px">
      <n-form :model="shopForm">
        <n-form-item :label="t('masterData.shopName')" required>
          <n-input v-model:value="shopForm.name" :placeholder="t('masterData.shopNamePlaceholder')" />
        </n-form-item>
        <n-form-item :label="t('masterData.icon')">
          <IconPicker v-model="shopForm.icon" />
        </n-form-item>
        <n-form-item :label="t('masterData.shopAddress')">
          <n-input v-model:value="shopForm.address" :placeholder="t('masterData.addressPlaceholder')" />
        </n-form-item>
        <n-form-item :label="t('common.notes')">
          <n-input v-model:value="shopForm.notes" type="textarea" />
        </n-form-item>
      </n-form>
      <template #footer>
        <n-space justify="end">
          <n-button @click="showShopModal = false">{{ t('common.cancel') }}</n-button>
          <n-button type="primary" @click="saveShop">{{ t('common.save') }}</n-button>
        </n-space>
      </template>
    </n-modal>

    <!-- 品牌弹窗 -->
    <n-modal v-model:show="showBrandModal" :title="editingBrand ? t('masterData.editBrand') : t('masterData.addBrand')" preset="card" style="max-width: 400px">
      <n-form :model="brandForm">
        <n-form-item :label="t('masterData.brandName')" required>
          <n-input v-model:value="brandForm.name" :placeholder="t('masterData.brandNamePlaceholder')" />
        </n-form-item>
        <n-form-item :label="t('common.notes')">
          <n-input v-model:value="brandForm.notes" type="textarea" />
        </n-form-item>
      </n-form>
      <template #footer>
        <n-space justify="end">
          <n-button @click="showBrandModal = false">{{ t('common.cancel') }}</n-button>
          <n-button type="primary" @click="saveBrand">{{ t('common.save') }}</n-button>
        </n-space>
      </template>
    </n-modal>

    <!-- 标签弹窗 -->
    <n-modal v-model:show="showTagModal" :title="editingTag ? t('masterData.editTag') : t('masterData.addTag')" preset="card" style="max-width: 450px">
      <n-form :model="tagForm">
        <n-form-item :label="t('masterData.tagName')" required>
          <n-input v-model:value="tagForm.name" :placeholder="t('masterData.tagNamePlaceholder')" />
        </n-form-item>
        <n-form-item :label="t('masterData.icon')">
          <IconPicker v-model="tagForm.icon" />
        </n-form-item>
        <n-form-item :label="t('masterData.tagColor')">
          <n-color-picker v-model:value="tagForm.color" :swatches="['#409EFF','#67C23A','#E6A23C','#F56C6C','#909399','#000000']" />
        </n-form-item>
        <n-form-item :label="t('common.notes')">
          <n-input v-model:value="tagForm.notes" type="textarea" :rows="2" />
        </n-form-item>
      </n-form>
      <template #footer>
        <n-space justify="end">
          <n-button @click="showTagModal = false">{{ t('common.cancel') }}</n-button>
          <n-button type="primary" @click="saveTag">{{ t('common.save') }}</n-button>
        </n-space>
      </template>
    </n-modal>

    <!-- 单位弹窗 -->
    <n-modal v-model:show="showUnitModal" :title="editingUnit ? t('masterData.editUnit') : t('masterData.addUnit')" preset="card" style="max-width: 400px">
      <n-form :model="unitForm" label-placement="left" label-width="80">
        <n-form-item :label="t('masterData.unitName')" required>
          <n-input v-model:value="unitForm.name" :placeholder="t('masterData.unitNamePlaceholder')" />
        </n-form-item>
        <n-form-item :label="t('masterData.parentUnit')">
          <n-select v-model:value="unitForm.parentId" :options="unitParentOptions" clearable :placeholder="t('masterData.baseUnit')" />
        </n-form-item>
        <n-form-item :label="t('masterData.conversionFactor')">
          <n-input-number v-model:value="unitForm.conversionFactor" :min="0" :step="0.1" style="width: 100%" />
        </n-form-item>
        <n-form-item :label="t('common.notes')">
          <n-input v-model:value="unitForm.notes" type="textarea" :rows="2" />
        </n-form-item>
      </n-form>
      <template #footer>
        <n-space justify="end">
          <n-button @click="showUnitModal = false">{{ t('common.cancel') }}</n-button>
          <n-button type="primary" @click="saveUnit">{{ t('common.save') }}</n-button>
        </n-space>
      </template>
    </n-modal>

    <!-- 类别弹窗 -->
    <n-modal v-model:show="showTypeModal" :title="editingType ? t('masterData.editCategory') : t('masterData.addCategory')" preset="card" style="max-width: 500px">
      <n-form :model="typeForm">
        <n-form-item :label="t('masterData.categoryName')" required>
          <n-input v-model:value="typeForm.name" :placeholder="t('masterData.categoryNamePlaceholder')" />
        </n-form-item>
        <n-form-item :label="t('masterData.icon')">
          <IconPicker v-model="typeForm.icon" />
        </n-form-item>
        <n-form-item :label="t('common.notes')">
          <n-input v-model:value="typeForm.notes" type="textarea" />
        </n-form-item>
      </n-form>
      <template #footer>
        <n-space justify="end">
          <n-button @click="showTypeModal = false">{{ t('common.cancel') }}</n-button>
          <n-button type="primary" @click="saveType">{{ t('common.save') }}</n-button>
        </n-space>
      </template>
    </n-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, h } from 'vue';
import { NPageHeader, NCard, NTabs, NTabPane, NModal, NForm, NFormItem, NInput, NInputNumber, NSelect, NButton, NSpace, NIcon, NDataTable, NColorPicker, useMessage, useDialog } from 'naive-ui';
import type { DataTableColumns } from 'naive-ui';
import { CreateOutline, TrashOutline } from '@vicons/ionicons5';
import { productsApi, locationsApi, unitsApi, brandsApi, categoriesApi, shopsApi, tagsApi } from '@/api/client';
import { useI18n } from '@/locales';
import IconPicker from '@/components/IconPicker.vue';
import ProductFormDialog from '@/components/ProductFormDialog.vue';
import { resolveIconComponent, isEmojiIcon } from '@/utils/icon-helper';

const { t } = useI18n();
const message = useMessage();
const dialog = useDialog();
const activeTab = ref('products');

// 弹窗控制
const showProductFormDialog = ref(false);
const showLocationModal = ref(false);
const showShopModal = ref(false);
const showBrandModal = ref(false);
const showTagModal = ref(false);
const showUnitModal = ref(false);
const showTypeModal = ref(false);

const editingProduct = ref<any>(null);
const editingLocation = ref<any>(null);
const editingShop = ref<any>(null);
const editingBrand = ref<any>(null);
const editingTag = ref<any>(null);
const editingUnit = ref<any>(null);
const editingType = ref<any>(null);

// 数据
const products = ref<any[]>([]);
const locations = ref<any[]>([]);
const shops = ref<any[]>([]);
const brands = ref<any[]>([]);
const tags = ref<any[]>([]);
const units = ref<any[]>([]);
const types = ref<any[]>([]);

// 表单
const locationForm = reactive({ name: '', parentId: null as number | null, notes: '' });
const shopForm = reactive({ name: '', icon: '', address: '', notes: '' });
const brandForm = reactive({ name: '', notes: '' });
const tagForm = reactive({ name: '', icon: '', color: '#409EFF', notes: '' });
const unitForm = reactive({ name: '', parentId: null as number | null, conversionFactor: 1, notes: '' });
const typeForm = reactive({ name: '', icon: '', notes: '' });

const parentOptions = computed(() =>
  locations.value.filter(l => !l.parentId).map(l => ({ label: l.name, value: l.id }))
);

const unitParentOptions = computed(() =>
  units.value.filter(u => !u.parentId).map(u => ({ label: u.name, value: u.id }))
);

// === 表格列定义 ===
const renderActions = (editFn: Function, deleteFn: Function, label?: string) => {
  return (row: any) => h(NSpace, { size: 4 }, { default: () => [
    h(NButton, { size: 'small', type: 'primary', text: true, onClick: () => editFn(row) }, { default: () => t('common.edit'), icon: () => h(NIcon, null, { default: () => h(CreateOutline) }) }),
    h(NButton, { size: 'small', type: 'error', text: true, onClick: () => {
      dialog.warning({
        title: t('common.confirmDelete'),
        content: t('common.confirmDeleteContent', { name: row.name || label || t('common.item') }),
        positiveText: t('common.delete'),
        negativeText: t('common.cancel'),
        onPositiveClick: () => deleteFn(row.id),
      });
    }}, { default: () => t('common.delete'), icon: () => h(NIcon, null, { default: () => h(TrashOutline) }) }),
  ]});
};

const productColumns: DataTableColumns<any> = [
  { title: t('location.image'), key: 'image', width: 60, render: (row) => row.image ? h('img', { src: row.image, style: 'width:32px;height:32px;border-radius:4px;object-fit:cover' }) : h('span', { style: 'width:32px;height:32px;display:inline-block;background:#f0f0f0;border-radius:4px;text-align:center;line-height:32px;font-size:12px' }, '📷') },
  { title: t('masterData.productName'), key: 'name', width: 150 },
  { title: t('masterData.productBarcode'), key: 'barcode', width: 130, render: (row) => row.barcode ? h('span', { style: 'font-family:monospace;font-size:12px' }, row.barcode) : '-' },
  { title: t('masterData.categoryName'), key: 'categoryId', width: 80, render: (row) => {
    const cat = types.value.find((c: any) => c.id === row.categoryId);
    if (!cat) return row.categoryId ? `#${row.categoryId}` : '-';
    if (cat.icon && isEmojiIcon(cat.icon)) {
      return `${cat.icon} ${cat.name}`;
    }
    return h('span', { style: 'display: inline-flex; align-items: center; gap: 4px' }, [
      cat.icon ? h(NIcon, { size: 14, color: 'var(--hh-primary)' }, { default: () => h(resolveIconComponent(cat.icon)) }) : null,
      cat.name,
    ]);
  }},
  { title: t('masterData.brandName'), key: 'brand', width: 80, render: (row) => row.brand || '-' },
  { title: t('masterData.unitName'), key: 'unit', width: 50 },
  { title: t('masterData.defaultPrice'), key: 'defaultPrice', width: 80, render: (row) => row.defaultPrice != null ? `¥${Number(row.defaultPrice).toFixed(2)}` : '-' },
  { title: t('common.notes'), key: 'notes', ellipsis: { tooltip: true } },
  { title: t('common.actions'), key: 'actions', width: 150, render: renderActions(editProduct, deleteProduct) },
];

const locationColumns: DataTableColumns<any> = [
  { title: t('masterData.locationName'), key: 'name', width: 180 },
  { title: t('masterData.level'), key: 'level', width: 80, render: (row) => t('masterData.levelN', { level: row.level }) },
  { title: t('masterData.parentLocation'), key: 'parentId', width: 120, render: (row) => {
    const parent = locations.value.find(l => l.id === row.parentId);
    return parent ? parent.name : '-';
  }},
  { title: t('common.notes'), key: 'notes', ellipsis: { tooltip: true } },
  { title: t('common.actions'), key: 'actions', width: 150, render: renderActions(editLocation, deleteLocation) },
];

const shopColumns: DataTableColumns<any> = [
  { title: t('masterData.icon'), key: 'icon', width: 60, render: (row) => {
    if (!row.icon) return h('span', { style: 'color: var(--hh-text-tertiary)' }, '-');
    if (isEmojiIcon(row.icon)) {
      return h('span', { style: 'font-size: 20px' }, row.icon);
    }
    return h(NIcon, { size: 20, color: 'var(--hh-primary)' }, { default: () => h(resolveIconComponent(row.icon)) });
  }},
  { title: t('masterData.shopName'), key: 'name', width: 150 },
  { title: t('masterData.shopAddress'), key: 'address', ellipsis: { tooltip: true } },
  { title: t('common.notes'), key: 'notes', ellipsis: { tooltip: true } },
  { title: t('common.actions'), key: 'actions', width: 150, render: renderActions(editShop, deleteShop) },
];

const brandColumns: DataTableColumns<any> = [
  { title: t('masterData.brandName'), key: 'name', width: 180 },
  { title: t('common.notes'), key: 'notes', ellipsis: { tooltip: true } },
  { title: t('common.actions'), key: 'actions', width: 150, render: renderActions(editBrand, deleteBrand) },
];

const tagColumns: DataTableColumns<any> = [
  { title: t('masterData.icon'), key: 'icon', width: 60, render: (row) => {
    if (!row.icon) return h('span', { style: 'color: var(--hh-text-tertiary)' }, '-');
    if (isEmojiIcon(row.icon)) {
      return h('span', { style: 'font-size: 20px' }, row.icon);
    }
    return h(NIcon, { size: 20, color: 'var(--hh-primary)' }, { default: () => h(resolveIconComponent(row.icon)) });
  }},
  { title: t('masterData.tagName'), key: 'name', width: 120, render: (row) => {
    const color = row.color || '#409EFF';
    return h('span', { style: `display: inline-flex; align-items: center; gap: 6px; color: ${color}; font-weight: 500` }, [
      h('span', { style: `width: 8px; height: 8px; border-radius: 50%; background: ${color}; display: inline-block` }),
      row.name,
    ]);
  }},
  { title: t('masterData.tagColor'), key: 'color', width: 80, render: (row) => {
    const color = row.color || '#409EFF';
    return h('span', { style: `display: inline-block; width: 24px; height: 24px; border-radius: 4px; background: ${color}; border: 1px solid #ddd` });
  }},
  { title: t('common.notes'), key: 'notes', ellipsis: { tooltip: true } },
  { title: t('common.actions'), key: 'actions', width: 150, render: renderActions(editTag, deleteTag) },
];

const unitColumns: DataTableColumns<any> = [
  { title: t('masterData.unitName'), key: 'name', width: 180, render: (row) => {
    const indent = row.parentId ? '    └ ' : '';
    return h('span', { style: 'font-weight: 500' }, indent + row.name);
  }},
  { title: t('masterData.parentUnit'), key: 'parentId', width: 120, render: (row) => {
    const parent = units.value.find((u: any) => u.id === row.parentId);
    return parent ? parent.name : '-';
  }},
  { title: t('masterData.conversionFactor'), key: 'conversionFactor', width: 100, render: (row) => row.conversionFactor || 1 },
  { title: t('common.notes'), key: 'notes', ellipsis: { tooltip: true } },
  { title: t('common.actions'), key: 'actions', width: 150, render: renderActions(editUnit, deleteUnit) },
];

const typeColumns: DataTableColumns<any> = [
  { title: t('masterData.icon'), key: 'icon', width: 60, render: (row) => {
    if (!row.icon) return h('span', { style: 'color: var(--hh-text-tertiary)' }, '-');
    if (isEmojiIcon(row.icon)) {
      return h('span', { style: 'font-size: 20px' }, row.icon);
    }
    return h(NIcon, { size: 20, color: 'var(--hh-primary)' }, { default: () => h(resolveIconComponent(row.icon)) });
  }},
  { title: t('masterData.categoryName'), key: 'name' },
  { title: t('common.notes'), key: 'notes', ellipsis: { tooltip: true } },
  { title: t('common.actions'), key: 'actions', width: 150, render: renderActions(editType, deleteType) },
];

// === 产品操作 ===
function editProduct(item: any) {
  editingProduct.value = item;
  showProductFormDialog.value = true;
}

function onProductSaved() {
  editingProduct.value = null;
  loadData();
}

async function deleteProduct(id: number) {
  try { await productsApi.delete(id); message.success(t('masterData.deleteSuccess')); loadData(); }
  catch (e: any) { message.error(t('common.deleteFailed')); }
}

// === 位置操作 ===
function editLocation(loc: any) {
  editingLocation.value = loc;
  Object.assign(locationForm, { name: loc.name, parentId: loc.parentId, notes: loc.notes || '' });
  showLocationModal.value = true;
}

async function saveLocation() {
  if (!locationForm.name) { message.warning(t('masterData.enterLocationName')); return; }
  try {
    if (editingLocation.value) {
      await locationsApi.update(editingLocation.value.id, locationForm);
    } else {
      await locationsApi.create(locationForm);
    }
    message.success(editingLocation.value ? t('masterData.editSuccess') : t('masterData.createSuccess'));
    showLocationModal.value = false;
    loadData();
  } catch (e: any) { message.error(t('common.operationFailed')); }
}

async function deleteLocation(id: number) {
  try { await locationsApi.delete(id); message.success(t('masterData.deleteSuccess')); loadData(); }
  catch (e: any) { message.error(t('common.deleteFailed')); }
}

// === 商店操作 ===
function editShop(shop: any) {
  editingShop.value = shop;
  Object.assign(shopForm, { name: shop.name, icon: shop.icon || '', address: shop.address || '', notes: shop.notes || '' });
  showShopModal.value = true;
}

async function saveShop() {
  if (!shopForm.name) { message.warning(t('masterData.enterShopName')); return; }
  try {
    if (editingShop.value) {
      await shopsApi.update(editingShop.value.id, shopForm);
    } else {
      await shopsApi.create(shopForm);
    }
    message.success(editingShop.value ? t('masterData.editSuccess') : t('masterData.createSuccess'));
    showShopModal.value = false;
    loadData();
  } catch (e: any) { message.error(t('common.operationFailed')); }
}

async function deleteShop(id: number) {
  try { await shopsApi.delete(id); message.success(t('masterData.deleteSuccess')); loadData(); }
  catch (e: any) { message.error(t('common.deleteFailed')); }
}

// === 品牌操作 ===
function editBrand(brand: any) {
  editingBrand.value = brand;
  Object.assign(brandForm, { name: brand.name, notes: brand.notes || '' });
  showBrandModal.value = true;
}

async function saveBrand() {
  if (!brandForm.name) { message.warning(t('masterData.enterBrandName')); return; }
  try {
    if (editingBrand.value) {
      await brandsApi.update(editingBrand.value.id, brandForm);
    } else {
      await brandsApi.create(brandForm);
    }
    message.success(editingBrand.value ? t('masterData.editSuccess') : t('masterData.createSuccess'));
    showBrandModal.value = false;
    loadData();
  } catch (e: any) { message.error(t('common.operationFailed')); }
}

async function deleteBrand(id: number) {
  try { await brandsApi.delete(id); message.success(t('masterData.deleteSuccess')); loadData(); }
  catch (e: any) { message.error(t('common.deleteFailed')); }
}

// === 单位操作 ===
function editUnit(unit: any) {
  editingUnit.value = unit;
  Object.assign(unitForm, { name: unit.name, parentId: unit.parentId, conversionFactor: unit.conversionFactor || 1, notes: unit.notes || '' });
  showUnitModal.value = true;
}

async function saveUnit() {
  if (!unitForm.name) { message.warning(t('masterData.enterUnitName')); return; }
  try {
    if (editingUnit.value) {
      await unitsApi.update(editingUnit.value.id, unitForm);
    } else {
      await unitsApi.create(unitForm);
    }
    message.success(editingUnit.value ? t('masterData.editSuccess') : t('masterData.createSuccess'));
    showUnitModal.value = false;
    loadData();
  } catch (e: any) { message.error(t('common.operationFailed')); }
}

async function deleteUnit(id: number) {
  try { await unitsApi.delete(id); message.success(t('masterData.deleteSuccess')); loadData(); }
  catch (e: any) { message.error(t('common.deleteFailed')); }
}

// === 类型操作 ===
function editType(type: any) {
  editingType.value = type;
  Object.assign(typeForm, { name: type.name, icon: type.icon || '', notes: type.notes || '' });
  showTypeModal.value = true;
}

async function saveType() {
  if (!typeForm.name) { message.warning(t('masterData.enterCategoryName')); return; }
  try {
    if (editingType.value) {
      await categoriesApi.update(editingType.value.id, { name: typeForm.name, icon: typeForm.icon, notes: typeForm.notes });
    } else {
      await categoriesApi.create({ name: typeForm.name, icon: typeForm.icon, notes: typeForm.notes });
    }
    message.success(editingType.value ? t('masterData.editSuccess') : t('masterData.createSuccess'));
    showTypeModal.value = false;
    loadData();
  } catch (e: any) { message.error(t('common.operationFailed')); }
}

async function deleteType(id: number) {
  try {
    await categoriesApi.delete(id);
    message.success(t('masterData.deleteSuccess')); loadData();
  } catch (e: any) { message.error(t('common.deleteFailed')); }
}

// === 标签操作 ===
function editTag(tag: any) {
  editingTag.value = tag;
  Object.assign(tagForm, { name: tag.name, icon: tag.icon || '', color: tag.color || '#409EFF', notes: tag.notes || '' });
  showTagModal.value = true;
}

async function saveTag() {
  if (!tagForm.name) { message.warning(t('masterData.enterTagName')); return; }
  try {
    if (editingTag.value) {
      await tagsApi.update(editingTag.value.id, tagForm);
    } else {
      await tagsApi.create(tagForm);
    }
    message.success(editingTag.value ? t('masterData.editSuccess') : t('masterData.createSuccess'));
    showTagModal.value = false;
    loadData();
  } catch (e: any) { message.error(t('common.operationFailed')); }
}

async function deleteTag(id: number) {
  try { await tagsApi.delete(id); message.success(t('masterData.deleteSuccess')); loadData(); }
  catch (e: any) { message.error(t('common.deleteFailed')); }
}

// === 加载数据 ===
async function loadData() {
  try {
    const [prodRes, locRes, typeRes, unitRes, brandRes, shopRes, tagRes] = await Promise.all([
      productsApi.list().then(r => r.data || []),
      locationsApi.list(),
      categoriesApi.list().then(r => r.data || []),
      unitsApi.list().then(r => r.data || []),
      brandsApi.list().then(r => r.data || []),
      shopsApi.list().then(r => r.data || []),
      tagsApi.list().then(r => r.data || []),
    ]);
    products.value = prodRes.data || [];
    locations.value = locRes.data || [];
    types.value = typeRes;
    units.value = unitRes || [];
    brands.value = brandRes || [];
    shops.value = shopRes || [];
    tags.value = tagRes || [];
  } catch (e) { console.error(e); }
}

onMounted(() => { loadData(); });
</script>

<style scoped>
.master-data-page { max-width: 1200px; margin: 0 auto; }
.tab-toolbar { margin-bottom: 16px; }
</style>
