<template>
  <n-modal :show="visible" @update:show="val => emit('update:visible', val)" :title="isEdit ? '编辑产品' : '添加产品'" preset="card" style="max-width: 500px" :mask-closable="false" :segmented="{ footer: true }">
    <div class="pfd-form">
      <div class="pfd-row">
        <label class="pfd-label">产品名称 <span class="pfd-required">*</span></label>
        <n-input v-model:value="form.name" placeholder="输入产品名称" size="large" />
      </div>
      <div class="pfd-row">
        <label class="pfd-label">条形码</label>
        <div class="pfd-input-row">
          <n-input v-model:value="form.barcode" placeholder="扫码或手动输入" size="large" clearable style="flex: 1" />
          <n-button size="large" @click="handleScan" :disabled="!barcodeAdapter?.isSupported">
            <template #icon><n-icon :size="20"><ScanOutline /></n-icon></template>
          </n-button>
        </div>
      </div>
      <div class="pfd-grid">
        <div class="pfd-row">
          <label class="pfd-label">类别</label>
          <n-select v-model:value="form.categoryId" :options="categoryOptions" clearable placeholder="选择类别" size="large" />
        </div>
        <div class="pfd-row">
          <label class="pfd-label">单位</label>
          <n-select v-model:value="form.unit" :options="unitOptions" placeholder="选择单位" size="large" />
        </div>
      </div>
      <div class="pfd-row">
        <label class="pfd-label">品牌</label>
        <n-select v-model:value="form.brand" :options="brandOptions" clearable filterable placeholder="选择或输入品牌" size="large" />
      </div>
      <div class="pfd-row">
        <label class="pfd-label">默认单价 (¥)</label>
        <n-input-number v-model:value="form.defaultPrice" :min="0" :precision="2" placeholder="0.00" size="large" style="width: 100%">
          <template #prefix>¥</template>
        </n-input-number>
      </div>
      <div class="pfd-row">
        <label class="pfd-label">产品图片</label>
        <div class="pfd-image-row">
          <n-input v-model:value="form.image" placeholder="图片URL" size="large" clearable style="flex: 1" />
          <n-button size="large" @click="handleImageUpload">
            <template #icon><n-icon :size="18"><CloudUploadOutline /></n-icon></template>
          </n-button>
        </div>
        <img v-if="form.image" :src="form.image" class="pfd-image-preview" />
      </div>
      <div class="pfd-grid">
        <div class="pfd-row">
          <label class="pfd-label">默认保质期 (天)</label>
          <n-input-number v-model:value="form.defaultBestBeforeDays" :min="0" placeholder="可选" size="large" style="width: 100%">
            <template #suffix>天</template>
          </n-input-number>
        </div>
        <div class="pfd-row">
          <label class="pfd-label">开封后保质期 (天)</label>
          <n-input-number v-model:value="form.defaultBestBeforeDaysAfterOpen" :min="0" placeholder="可选" size="large" style="width: 100%">
            <template #suffix>天</template>
          </n-input-number>
        </div>
      </div>
      <div class="pfd-section-title">多单位设置 (可选)</div>
      <div class="pfd-grid">
        <div class="pfd-row">
          <label class="pfd-label">采购单位</label>
          <n-select v-model:value="form.purchaseUnit" :options="unitOptions" clearable placeholder="如: 箱/袋" size="large" />
        </div>
        <div class="pfd-row">
          <label class="pfd-label">库存单位</label>
          <n-select v-model:value="form.stockUnit" :options="unitOptions" clearable placeholder="如: 个/瓶" size="large" />
        </div>
      </div>
      <div class="pfd-grid">
        <div class="pfd-row">
          <label class="pfd-label">消耗单位</label>
          <n-select v-model:value="form.consumeUnit" :options="unitOptions" clearable placeholder="如: 克/毫升" size="large" />
        </div>
        <div class="pfd-row">
          <label class="pfd-label">价格单位</label>
          <n-select v-model:value="form.priceUnit" :options="unitOptions" clearable placeholder="如: 千克" size="large" />
        </div>
      </div>
      <div class="pfd-grid">
        <div class="pfd-row">
          <label class="pfd-label">采购→库存 转换因子</label>
          <n-input-number v-model:value="form.purchaseToStockFactor" :min="0.01" :step="0.1" size="large" style="width: 100%" />
        </div>
        <div class="pfd-row">
          <label class="pfd-label">库存→消耗 转换因子</label>
          <n-input-number v-model:value="form.stockToConsumeFactor" :min="0.01" :step="0.1" size="large" style="width: 100%" />
        </div>
      </div>
      <div class="pfd-row">
        <label class="pfd-label">备注</label>
        <n-input v-model:value="form.notes" type="textarea" placeholder="可选" :rows="2" />
      </div>
    </div>
    <template #footer>
      <div class="pfd-actions">
        <n-button @click="close">{{ t('common.cancel') }}</n-button>
        <n-button type="primary" @click="save" :loading="saving" :disabled="!form.name">
          {{ isEdit ? '保存' : '创建' }}
        </n-button>
      </div>
    </template>
  </n-modal>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch } from 'vue';
import { NModal, NInput, NInputNumber, NSelect, NButton, NIcon, useMessage } from 'naive-ui';
import { CloudUploadOutline, ScanOutline } from '@vicons/ionicons5';
import { productsApi, unitsApi, brandsApi } from '@/api/client';
import api from '@/api/client';
import { clientRegistry } from '@/plugins/client-registry';
import type { ScanResult } from '@/plugins/types/client-plugin.types';
import { useI18n } from '@/locales';

interface Category { id: number; name: string; icon: string | null }
interface Brand { id: number; name: string }
interface Unit { id: number; name: string }

const props = defineProps<{
  visible: boolean;
  product?: any | null;
  categoryOptions?: { label: string; value: number }[];
  unitOptions?: { label: string; value: string }[];
  brandOptions?: { label: string; value: string }[];
}>();

const emit = defineEmits<{
  (e: 'update:visible', val: boolean): void;
  (e: 'saved', product: any): void;
}>();

const message = useMessage();
const { t } = useI18n();

const isEdit = computed(() => !!props.product);
const saving = ref(false);

const form = reactive({
  name: '',
  barcode: '',
  categoryId: null as number | null,
  unit: '个',
  brand: '',
  image: '',
  defaultPrice: null as number | null,
  defaultBestBeforeDays: null as number | null,
  defaultBestBeforeDaysAfterOpen: null as number | null,
  purchaseUnit: '',
  stockUnit: '',
  consumeUnit: '',
  priceUnit: '',
  purchaseToStockFactor: 1,
  stockToConsumeFactor: 1,
  notes: '',
});

const categories = ref<Category[]>([]);
const units = ref<Unit[]>([]);
const brands = ref<Brand[]>([]);

const categoryOptions = computed(() =>
  categories.value.map(c => ({ label: `${c.icon || ''} ${c.name}`.trim(), value: c.id }))
);

const unitOptions = computed(() =>
  units.value.map(u => ({ label: u.name, value: u.name }))
);

const brandOptions = computed(() =>
  brands.value.map(b => ({ label: b.name, value: b.name }))
);

const barcodeAdapter = computed(() => {
  void clientRegistry.getRevision();
  return clientRegistry.getScannerAdapter('barcode');
});

watch(() => props.visible, async (val) => {
  if (val) {
    form.name = props.product?.name || '';
    form.barcode = props.product?.barcode || '';
    form.categoryId = props.product?.categoryId || null;
    form.unit = props.product?.unit || '个';
    form.brand = props.product?.brand || '';
    form.image = props.product?.image || '';
    form.defaultPrice = props.product?.defaultPrice || null;
    form.defaultBestBeforeDays = props.product?.defaultBestBeforeDays || null;
    form.defaultBestBeforeDaysAfterOpen = props.product?.defaultBestBeforeDaysAfterOpen || null;
    form.purchaseUnit = props.product?.purchaseUnit || '';
    form.stockUnit = props.product?.stockUnit || '';
    form.consumeUnit = props.product?.consumeUnit || '';
    form.priceUnit = props.product?.priceUnit || '';
    form.purchaseToStockFactor = props.product?.purchaseToStockFactor || 1;
    form.stockToConsumeFactor = props.product?.stockToConsumeFactor || 1;
    form.notes = props.product?.notes || '';
    try {
      const [catRes, unitRes, brandRes] = await Promise.all([
        api.get('/categories').then(r => r.data || []),
        unitsApi.list().then(r => r.data || []),
        brandsApi.list().then(r => r.data || []),
      ]);
      categories.value = catRes as Category[];
      units.value = unitRes as Unit[];
      brands.value = brandRes as Brand[];
    } catch { /* ignore */ }
  }
});

function close() {
  emit('update:visible', false);
}

async function save() {
  if (!form.name) return;
  saving.value = true;
  try {
    const payload: Record<string, unknown> = {
      name: form.name,
      barcode: form.barcode || undefined,
      categoryId: form.categoryId || undefined,
      unit: form.unit,
      brand: form.brand || undefined,
      image: form.image || undefined,
      defaultPrice: form.defaultPrice || undefined,
      defaultBestBeforeDays: form.defaultBestBeforeDays || undefined,
      defaultBestBeforeDaysAfterOpen: form.defaultBestBeforeDaysAfterOpen || undefined,
      purchaseUnit: form.purchaseUnit || undefined,
      stockUnit: form.stockUnit || undefined,
      consumeUnit: form.consumeUnit || undefined,
      priceUnit: form.priceUnit || undefined,
      purchaseToStockFactor: form.purchaseToStockFactor || undefined,
      stockToConsumeFactor: form.stockToConsumeFactor || undefined,
      notes: form.notes || undefined,
    };
    let res;
    if (isEdit.value && props.product) {
      res = await productsApi.update(props.product.id, payload);
    } else {
      res = await productsApi.create(payload);
    }
    message.success(isEdit.value ? '产品已更新' : '产品已创建');
    emit('saved', res.data);
    close();
  } catch {
    message.error('操作失败');
  } finally {
    saving.value = false;
  }
}

async function handleScan() {
  const adapter = barcodeAdapter.value;
  if (!adapter?.isSupported) { message.warning('当前浏览器不支持扫码'); return; }
  try {
    const result: ScanResult = await adapter.scan();
    form.barcode = result.raw;
    message.success(`扫码成功: ${result.raw}`);
  } catch { message.info('扫码已取消'); }
}

function handleImageUpload() {
  message.info('图片上传功能待实现');
}
</script>

<style scoped>
.pfd-form { display: flex; flex-direction: column; gap: 14px; }
.pfd-row { display: flex; flex-direction: column; gap: 4px; }
.pfd-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
.pfd-label { font-size: 13px; font-weight: 500; color: var(--hh-text-secondary); }
.pfd-required { color: #e74c3c; }
.pfd-input-row { display: flex; gap: 6px; }
.pfd-image-row { display: flex; gap: 6px; }
.pfd-image-preview { width: 80px; height: 80px; object-fit: cover; border-radius: 8px; border: 1px solid var(--hh-border-light); margin-top: 4px; }
.pfd-actions { display: flex; justify-content: flex-end; gap: 8px; }
.pfd-section-title { font-size: 13px; font-weight: 600; color: var(--hh-text-secondary); margin-top: 8px; padding-top: 8px; border-top: 1px solid var(--hh-border-light); }
</style>