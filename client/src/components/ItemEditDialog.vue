<template>
  <n-modal :show="visible" @update:show="val => emit('update:visible', val)" :title="t('stock.editItem') || '编辑物品'" preset="card" style="max-width: 500px" :mask-closable="false" :segmented="{ footer: true }">
    <n-spin :show="loading">
      <div class="edit-form">
        <div class="form-row">
          <label class="form-label">{{ t('stock.name') }} <span class="required">*</span></label>
          <n-input v-model:value="form.name" :placeholder="t('stock.name')" />
        </div>
        <div class="form-grid">
          <div class="form-row">
            <label class="form-label">{{ t('stock.category') }}</label>
            <n-select v-model:value="form.categoryId" :options="categoryOptions" clearable :placeholder="t('stock.category')" />
          </div>
          <div class="form-row">
            <label class="form-label">{{ t('stock.location') }}</label>
            <n-select v-model:value="form.locationId" :options="locationOptions" clearable :placeholder="t('stock.location')" />
          </div>
        </div>
        <div class="form-grid">
          <div class="form-row">
            <label class="form-label">{{ t('stock.unit') }}</label>
            <n-select v-model:value="form.unit" :options="unitOptions" :placeholder="t('stock.unit')" />
          </div>
          <div class="form-row">
            <label class="form-label">{{ t('stock.minStock') }}</label>
            <n-input-number v-model:value="form.minStock" :min="0" style="width: 100%" />
          </div>
        </div>
        <div class="form-grid">
          <div class="form-row">
            <label class="form-label">{{ t('stock.brand') }}</label>
            <n-input v-model:value="form.brand" :placeholder="t('stock.brand')" />
          </div>
          <div class="form-row">
            <label class="form-label">{{ t('stock.shop') }}</label>
            <n-input v-model:value="form.shop" :placeholder="t('stock.shop')" />
          </div>
        </div>
        <div class="form-row">
          <label class="form-label">{{ t('stock.barcode') }}</label>
          <n-input v-model:value="form.barcode" :placeholder="t('stock.barcode')" />
        </div>
        <div class="form-grid">
          <div class="form-row">
            <label class="form-label">{{ t('stock.purchasePrice') }}</label>
            <n-input-number v-model:value="form.purchasePrice" :min="0" :precision="2" style="width: 100%">
              <template #prefix>¥</template>
            </n-input-number>
          </div>
          <div class="form-row">
            <label class="form-label">规格</label>
            <n-input v-model:value="form.spec" placeholder="如: 330ml, 10kg" />
          </div>
        </div>
        <div class="form-grid">
          <div class="form-row">
            <label class="form-label">{{ t('stock.purchaseDate') }}</label>
            <n-date-picker v-model:value="form.purchaseDate" type="date" style="width: 100%" clearable />
          </div>
          <div class="form-row">
            <label class="form-label">{{ t('stock.expiryDate') }}</label>
            <n-date-picker v-model:value="form.expiryDate" type="date" style="width: 100%" clearable />
          </div>
        </div>
        <div class="form-row">
          <label class="form-label">{{ t('stock.notes') }}</label>
          <n-input v-model:value="form.notes" type="textarea" :rows="2" :placeholder="t('stock.notes')" />
        </div>
      </div>
    </n-spin>
    <template #footer>
      <div class="form-actions">
        <n-button @click="close">{{ t('common.cancel') }}</n-button>
        <n-button type="primary" @click="save" :loading="saving" :disabled="!form.name">
          {{ t('common.confirm') }}
        </n-button>
      </div>
    </template>
  </n-modal>
</template>

<script setup lang="ts">
import { ref, reactive, watch } from 'vue';
import { NModal, NInput, NInputNumber, NSelect, NDatePicker, NButton, NSpin, useMessage } from 'naive-ui';
import { useI18n } from '@/locales';
import { stockApi, locationsApi } from '@/api/client';
import api from '@/api/client';

const props = defineProps<{
  visible: boolean;
  item: any | null;
}>();

const emit = defineEmits<{
  'update:visible': [val: boolean];
  'saved': [];
}>();

const message = useMessage();
const { t } = useI18n();
const saving = ref(false);
const loading = ref(false);

const form = reactive({
  name: '',
  categoryId: null as number | null,
  locationId: null as number | null,
  unit: '个',
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

const units = ['个', '瓶', '袋', '盒', '箱', '包', '千克', '克', '升', '毫升', '件', '条', '块', '片', '打', '组'];

watch(() => props.visible, async (val) => {
  if (!val || !props.item) return;
  loading.value = true;
  try {
    // 回填表单
    form.name = props.item.name || '';
    form.categoryId = props.item.categoryId ?? null;
    form.locationId = props.item.locationId ?? null;
    form.unit = props.item.unit || '个';
    form.minStock = props.item.minStock ?? 0;
    form.brand = props.item.brand || '';
    form.shop = props.item.shop || '';
    form.barcode = props.item.barcode || '';
    form.spec = props.item.spec || '';
    form.purchasePrice = props.item.purchasePrice ?? null;
    form.purchaseDate = props.item.purchaseDate ? new Date(props.item.purchaseDate).getTime() : null;
    form.expiryDate = props.item.expiryDate ? new Date(props.item.expiryDate).getTime() : null;
    form.notes = props.item.notes || '';

    // 加载下拉选项
    const [catRes, locRes] = await Promise.all([
      api.get('/categories').then(r => r.data || []).catch(() => []),
      locationsApi.list().then(r => (r as any)?.data || []).catch(() => []),
    ]);
    categoryOptions.value = (catRes as any[]).map((c: any) => ({ label: c.name, value: c.id }));
    locationOptions.value = (locRes as any[]).map((l: any) => ({ label: l.name, value: l.id }));
    unitOptions.value = units.map(u => ({ label: u, value: u }));
  } finally {
    loading.value = false;
  }
});

function close() {
  emit('update:visible', false);
}

async function save() {
  if (!form.name || !props.item) return;
  saving.value = true;
  try {
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
.edit-form { display: flex; flex-direction: column; gap: 12px; }
.form-row { display: flex; flex-direction: column; gap: 4px; }
.form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.form-label { font-size: 13px; font-weight: 500; color: var(--hh-text-secondary); }
.required { color: #e74c3c; }
.form-actions { display: flex; justify-content: flex-end; gap: 8px; }
</style>
