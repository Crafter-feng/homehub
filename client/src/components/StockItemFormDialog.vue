<template>
  <n-modal :show="visible" @update:show="val => emit('update:visible', val)" :title="isEdit ? (t('stock.editItem') || '编辑物品') : (t('stock.addItem') || '添加物品')" preset="card" style="max-width: 520px" :mask-closable="false" :segmented="{ footer: true }">
    <n-spin :show="loading">
      <div class="sif-form">
        <!-- 创建模式：选择关联产品 -->
        <template v-if="!isEdit">
          <div class="sif-row">
            <label class="sif-label">关联产品</label>
            <n-select
              v-model:value="form.productId"
              :options="productOptions"
              clearable
              filterable
              placeholder="选择已有产品（可选）"
              @update:value="onProductSelect"
            />
          </div>
        </template>

        <!-- 基本信息 -->
        <div class="sif-row">
          <label class="sif-label">{{ t('stock.name') }} <span class="sif-required">*</span></label>
          <n-input v-model:value="form.name" :placeholder="t('stock.name')" />
        </div>

        <div class="sif-grid">
          <div class="sif-row">
            <label class="sif-label">{{ t('stock.category') }}</label>
            <n-select v-model:value="form.categoryId" :options="categoryOptions" clearable :placeholder="t('stock.category')" />
          </div>
          <div class="sif-row">
            <label class="sif-label">{{ t('stock.unit') }}</label>
            <n-select v-model:value="form.unit" :options="unitOptions" :placeholder="t('stock.unit')" />
          </div>
        </div>

        <div class="sif-grid">
          <div class="sif-row">
            <label class="sif-label">{{ t('stock.brand') }}</label>
            <n-input v-model:value="form.brand" :placeholder="t('stock.brand')" />
          </div>
          <div class="sif-row">
            <label class="sif-label">{{ t('stock.barcode') }}</label>
            <n-input v-model:value="form.barcode" :placeholder="t('stock.barcode')" />
          </div>
        </div>

        <div class="sif-grid">
          <div class="sif-row">
            <label class="sif-label">规格</label>
            <n-input v-model:value="form.spec" placeholder="如: 330ml, 10kg" />
          </div>
          <div class="sif-row">
            <label class="sif-label">{{ t('stock.minStock') }}</label>
            <n-input-number v-model:value="form.minStock" :min="0" style="width: 100%" />
          </div>
        </div>

        <!-- 库存信息 -->
        <div class="sif-section-title">{{ t('stock.stockIn') || '入库' }}信息</div>

        <div class="sif-grid">
          <div class="sif-row">
            <label class="sif-label">{{ t('stock.location') }}</label>
            <n-select v-model:value="form.locationId" :options="locationOptions" clearable :placeholder="t('stock.location')" />
          </div>
          <div class="sif-row">
            <label class="sif-label">{{ t('stock.shop') }}</label>
            <n-input v-model:value="form.shop" :placeholder="t('stock.shop')" />
          </div>
        </div>

        <!-- 创建模式：初始数量 -->
        <template v-if="!isEdit">
          <div class="sif-grid">
            <div class="sif-row">
              <label class="sif-label">{{ t('stock.quantityLabel') }}</label>
              <n-input-number v-model:value="form.quantity" :min="0" style="width: 100%" />
            </div>
            <div class="sif-row">
              <label class="sif-label">{{ t('stock.purchasePrice') }}</label>
              <n-input-number v-model:value="form.purchasePrice" :min="0" :precision="2" style="width: 100%">
                <template #prefix>¥</template>
              </n-input-number>
            </div>
          </div>
        </template>

        <!-- 编辑模式：当前数量（只读） -->
        <template v-if="isEdit">
          <div class="sif-grid">
            <div class="sif-row">
              <label class="sif-label">{{ t('stock.quantityLabel') }}</label>
              <n-input-number :value="item?.quantity ?? 0" disabled style="width: 100%">
                <template #suffix>{{ form.unit }}</template>
              </n-input-number>
            </div>
            <div class="sif-row">
              <label class="sif-label">{{ t('stock.purchasePrice') }}</label>
              <n-input-number v-model:value="form.purchasePrice" :min="0" :precision="2" style="width: 100%">
                <template #prefix>¥</template>
              </n-input-number>
            </div>
          </div>
        </template>

        <div class="sif-grid">
          <div class="sif-row">
            <label class="sif-label">{{ t('stock.purchaseDate') }}</label>
            <n-date-picker v-model:value="form.purchaseDate" type="date" style="width: 100%" clearable />
          </div>
          <div class="sif-row">
            <label class="sif-label">{{ t('stock.expiryDate') }}</label>
            <n-date-picker v-model:value="form.expiryDate" type="date" style="width: 100%" clearable />
          </div>
        </div>

        <div class="sif-row">
          <label class="sif-label">{{ t('stock.notes') }}</label>
          <n-input v-model:value="form.notes" type="textarea" :rows="2" :placeholder="t('stock.notes')" />
        </div>
      </div>
    </n-spin>
    <template #footer>
      <div class="sif-actions">
        <n-button @click="close">{{ t('common.cancel') }}</n-button>
        <n-button type="primary" @click="save" :loading="saving" :disabled="!form.name">
          {{ isEdit ? t('common.confirm') : t('stock.stockIn') || '入库' }}
        </n-button>
      </div>
    </template>
  </n-modal>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch } from 'vue';
import { NModal, NInput, NInputNumber, NSelect, NDatePicker, NButton, NSpin, useMessage } from 'naive-ui';
import { useI18n } from '@/locales';
import { stockApi, locationsApi } from '@/api/client';
import api from '@/api/client';

const props = defineProps<{
  visible: boolean;
  item?: any | null;
}>();

const emit = defineEmits<{
  'update:visible': [val: boolean];
  'saved': [];
}>();

const message = useMessage();
const { t } = useI18n();
const saving = ref(false);
const loading = ref(false);

const isEdit = computed(() => !!props.item);

const form = reactive({
  productId: null as number | null,
  name: '',
  categoryId: null as number | null,
  locationId: null as number | null,
  unit: '个',
  quantity: 1,
  minStock: 0,
  brand: '',
  shop: '',
  barcode: '',
  spec: '',
  purchasePrice: null as number | null,
  purchaseDate: null as number | null,
  expiryDate: null as number | null,
  notes: '',
});

const categoryOptions = ref<{ label: string; value: number }[]>([]);
const locationOptions = ref<{ label: string; value: number }[]>([]);
const unitOptions = ref<{ label: string; value: string }[]>([]);
const productOptions = ref<{ label: string; value: number }[]>([]);

const units = ['个', '瓶', '袋', '盒', '箱', '包', '千克', '克', '升', '毫升', '件', '条', '块', '片', '打', '组'];

// 选择产品时自动填充字段
function onProductSelect(productId: number | null) {
  if (!productId) return;
  // 找到选中的产品，用它的默认值填充表单
  const product = productOptions.value.find(p => p.value === productId);
  if (!product) return;
  // 产品数据在 productOptions 中只有 label/value，需要从 API 获取完整数据
  // 这里先保持手动填写，后续可以优化
}

watch(() => props.visible, async (val) => {
  if (!val) return;
  loading.value = true;
  try {
    if (isEdit.value && props.item) {
      // 编辑模式：回填现有数据
      form.productId = props.item.productId ?? null;
      form.name = props.item.name || '';
      form.categoryId = props.item.categoryId ?? null;
      form.locationId = props.item.locationId ?? null;
      form.unit = props.item.unit || '个';
      form.quantity = props.item.quantity ?? 1;
      form.minStock = props.item.minStock ?? 0;
      form.brand = props.item.brand || '';
      form.shop = props.item.shop || '';
      form.barcode = props.item.barcode || '';
      form.spec = props.item.spec || '';
      form.purchasePrice = props.item.purchasePrice ?? null;
      form.purchaseDate = props.item.purchaseDate ? new Date(props.item.purchaseDate).getTime() : null;
      form.expiryDate = props.item.expiryDate ? new Date(props.item.expiryDate).getTime() : null;
      form.notes = props.item.notes || '';
    } else {
      // 创建模式：清空表单
      Object.assign(form, {
        productId: null, name: '', categoryId: null, locationId: null,
        unit: '个', quantity: 1, minStock: 0, brand: '', shop: '',
        barcode: '', spec: '', purchasePrice: null, purchaseDate: null,
        expiryDate: null, notes: '',
      });
    }

    // 加载下拉选项
    const [catRes, locRes, prodRes] = await Promise.all([
      api.get('/categories').then(r => r.data || []).catch(() => []),
      locationsApi.list().then(r => (r as any)?.data || []).catch(() => []),
      stockApi.list?.({ limit: 200 }).then(r => (r as any)?.data?.data || []).catch(() => []),
    ]);
    categoryOptions.value = (catRes as any[]).map((c: any) => ({ label: c.name, value: c.id }));
    locationOptions.value = (locRes as any[]).map((l: any) => ({ label: l.name, value: l.id }));
    unitOptions.value = units.map(u => ({ label: u, value: u }));
    productOptions.value = (prodRes as any[]).map((p: any) => ({ label: p.name, value: p.id }));
  } finally {
    loading.value = false;
  }
});

function close() {
  emit('update:visible', false);
}

async function save() {
  if (!form.name) return;
  saving.value = true;
  try {
    if (isEdit.value && props.item) {
      // 编辑：调用 PUT /stock/items/:id
      await stockApi.update(props.item.id, {
        name: form.name,
        categoryId: form.categoryId || undefined,
        locationId: form.locationId || undefined,
        unit: form.unit,
        minStock: form.minStock || undefined,
        brand: form.brand || undefined,
        shop: form.shop || undefined,
        barcode: form.barcode || undefined,
        spec: form.spec || undefined,
        purchasePrice: form.purchasePrice || undefined,
        purchaseDate: form.purchaseDate || undefined,
        expiryDate: form.expiryDate || undefined,
        notes: form.notes || undefined,
      });
      message.success(t('stock.addSuccess').replace('添加', '更新'));
    } else {
      // 创建：调用 POST /stock/items
      await stockApi.create({
        name: form.name,
        type: 'generic',
        categoryId: form.categoryId || undefined,
        locationId: form.locationId || undefined,
        unit: form.unit,
        quantity: form.quantity,
        minStock: form.minStock || undefined,
        brand: form.brand || undefined,
        shop: form.shop || undefined,
        barcode: form.barcode || undefined,
        purchasePrice: form.purchasePrice || undefined,
        purchaseDate: form.purchaseDate || undefined,
        expiryDate: form.expiryDate || undefined,
        notes: form.notes || undefined,
        productId: form.productId || undefined,
      } as any);
      message.success(t('stock.addSuccess') || '已创建');
    }
    emit('saved');
    close();
  } catch {
    message.error(t('stock.loadFailed'));
  } finally {
    saving.value = false;
  }
}
</script>

<style scoped>
.sif-form { display: flex; flex-direction: column; gap: 12px; }
.sif-row { display: flex; flex-direction: column; gap: 4px; }
.sif-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.sif-label { font-size: 13px; font-weight: 500; color: var(--hh-text-secondary); }
.sif-required { color: #e74c3c; }
.sif-actions { display: flex; justify-content: flex-end; gap: 8px; }
.sif-section-title { font-size: 13px; font-weight: 600; color: var(--hh-text-secondary); margin-top: 8px; padding-top: 8px; border-top: 1px solid var(--hh-border-light); }
</style>
