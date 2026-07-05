<template>
  <n-modal :show="visible" @update:show="val => emit('update:visible', val)" preset="card" :title="`${t('common.edit')} ${t('stock.batchInfo')}`" style="max-width: 420px" :mask-closable="false">
    <div class="batch-edit-form" v-if="batch">
      <div class="form-row">
        <label class="form-label">批次号</label>
        <n-input v-model:value="form.batchNumber" placeholder="可选" />
      </div>
      <div class="form-grid">
        <div class="form-row">
          <label class="form-label">{{ t('stock.quantityLabel') }}</label>
          <n-input-number v-model:value="form.quantity" :min="0" style="width: 100%" />
        </div>
        <div class="form-row">
          <label class="form-label">{{ t('stock.location') }}</label>
          <n-select v-model:value="form.locationId" :options="locationOptions" clearable :placeholder="t('stock.location')" />
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
    </div>
    <template #footer>
      <div class="form-actions">
        <n-button @click="close">{{ t('common.cancel') }}</n-button>
        <n-button type="primary" @click="save" :loading="saving">
          {{ t('common.confirm') }}
        </n-button>
      </div>
    </template>
  </n-modal>
</template>

<script setup lang="ts">
import { ref, reactive, watch } from 'vue';
import { NModal, NInput, NInputNumber, NSelect, NDatePicker, NButton, useMessage } from 'naive-ui';
import { useI18n } from '@/locales';
import { stockApi, locationsApi } from '@/api/client';

const props = defineProps<{
  visible: boolean;
  batch: any | null;
}>();

const emit = defineEmits<{
  'update:visible': [val: boolean];
  'saved': [];
}>();

const message = useMessage();
const { t } = useI18n();
const saving = ref(false);

const form = reactive({
  batchNumber: '',
  quantity: 0,
  locationId: null as number | null,
  purchaseDate: null as number | null,
  expiryDate: null as number | null,
});

const locationOptions = ref<{ label: string; value: number }[]>([]);

watch(() => props.visible, async (val) => {
  if (val && props.batch) {
    form.batchNumber = props.batch.batchNumber || '';
    form.quantity = props.batch.quantity || 0;
    form.locationId = props.batch.locationId || null;
    form.purchaseDate = props.batch.purchaseDate ? new Date(props.batch.purchaseDate).getTime() : null;
    form.expiryDate = props.batch.expiryDate ? new Date(props.batch.expiryDate).getTime() : null;

    try {
      const locRes = await locationsApi.list();
      locationOptions.value = ((locRes as any)?.data || []).map((l: any) => ({ label: l.name, value: l.id }));
    } catch { /* ignore */ }
  }
});

function close() {
  emit('update:visible', false);
}

async function save() {
  if (!props.batch) return;
  saving.value = true;
  try {
    await stockApi.updateBatch(props.batch.id, {
      batchNumber: form.batchNumber || undefined,
      quantity: form.quantity,
      locationId: form.locationId || undefined,
      purchaseDate: form.purchaseDate || undefined,
      expiryDate: form.expiryDate || undefined,
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
.batch-edit-form { display: flex; flex-direction: column; gap: 12px; }
.form-row { display: flex; flex-direction: column; gap: 4px; }
.form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.form-label { font-size: 13px; font-weight: 500; color: var(--hh-text-secondary); }
.form-actions { display: flex; justify-content: flex-end; gap: 8px; }
</style>
