<template>
  <div class="custom-fields-page">
    <n-page-header title="自定义字段管理" subtitle="为任意实体附加自定义字段">
      <template #extra>
        <n-button type="primary" @click="showCreateModal = true">
          <template #icon><n-icon :size="16"><AddOutline /></n-icon></template>
          新建字段
        </n-button>
      </template>
    </n-page-header>

    <!-- 实体类型选择 -->
    <div class="entity-tabs page-section">
      <n-tabs v-model:value="currentEntityType" type="line" animated @update:value="loadFields">
        <n-tab-pane name="product" tab="产品" />
        <n-tab-pane name="item" tab="物品" />
        <n-tab-pane name="recipe" tab="食谱" />
        <n-tab-pane name="list" tab="清单" />
        <n-tab-pane name="location" tab="位置" />
        <n-tab-pane name="brand" tab="品牌" />
        <n-tab-pane name="shop" tab="商店" />
      </n-tabs>
    </div>

    <!-- 字段列表 -->
    <div class="fields-section page-section">
      <n-spin :show="loading">
        <n-data-table
          v-if="fields.length > 0"
          :columns="columns"
          :data="fields"
          :bordered="false"
          size="small"
        />
        <n-empty v-else description="暂无自定义字段" />
      </n-spin>
    </div>

    <!-- 创建字段 Modal -->
    <n-modal v-model:show="showCreateModal" title="新建自定义字段" preset="card" style="max-width: 500px">
      <n-form label-placement="left" label-width="80">
        <n-form-item label="字段标识">
          <n-input v-model:value="createForm.fieldName" placeholder="英文标识，如 color" />
        </n-form-item>
        <n-form-item label="显示名称">
          <n-input v-model:value="createForm.fieldLabel" placeholder="中文名称，如 颜色" />
        </n-form-item>
        <n-form-item label="字段类型">
          <n-select v-model:value="createForm.fieldType" :options="fieldTypeOptions" />
        </n-form-item>
        <n-form-item label="是否必填">
          <n-switch v-model:value="createForm.isRequired" />
        </n-form-item>
        <n-form-item v-if="createForm.fieldType === 'select' || createForm.fieldType === 'multiselect'" label="选项">
          <div class="options-editor">
            <div v-for="(opt, idx) in createForm.options" :key="idx" class="option-row">
              <n-input v-model:value="opt.label" placeholder="显示名" size="small" style="flex: 1" />
              <n-input v-model:value="opt.value" placeholder="值" size="small" style="flex: 1" />
              <n-button size="tiny" quaternary type="error" @click="createForm.options.splice(idx, 1)">删</n-button>
            </div>
            <n-button size="small" quaternary @click="createForm.options.push({ label: '', value: '' })">
              + 添加选项
            </n-button>
          </div>
        </n-form-item>
        <n-form-item v-if="createForm.fieldType === 'number'" label="最小值">
          <n-input-number v-model:value="createForm.min" placeholder="可选" />
        </n-form-item>
        <n-form-item v-if="createForm.fieldType === 'number'" label="最大值">
          <n-input-number v-model:value="createForm.max" placeholder="可选" />
        </n-form-item>
      </n-form>
      <template #footer>
        <n-space justify="end">
          <n-button @click="showCreateModal = false">取消</n-button>
          <n-button type="primary" @click="handleCreate" :loading="creating">创建</n-button>
        </n-space>
      </template>
    </n-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, h, onMounted } from 'vue';
import {
  NPageHeader, NButton, NIcon, NSpace, NModal, NForm, NFormItem,
  NInput, NInputNumber, NSelect, NSwitch, NDataTable, NTabs, NTabPane,
  NSpin, NEmpty, NPopconfirm, useMessage,
} from 'naive-ui';
import type { DataTableColumns } from 'naive-ui';
import { AddOutline } from '@vicons/ionicons5';
import { customFieldsApi } from '@/api/client';

const message = useMessage();

const currentEntityType = ref('product');
const fields = ref<any[]>([]);
const loading = ref(false);
const showCreateModal = ref(false);
const creating = ref(false);

const fieldTypeOptions = [
  { label: '文本', value: 'text' },
  { label: '数字', value: 'number' },
  { label: '布尔', value: 'boolean' },
  { label: '日期', value: 'date' },
  { label: '单选', value: 'select' },
  { label: '多选', value: 'multiselect' },
];

const createForm = ref({
  fieldName: '',
  fieldLabel: '',
  fieldType: 'text',
  isRequired: false,
  options: [] as { label: string; value: string }[],
  min: null as number | null,
  max: null as number | null,
});

const columns: DataTableColumns<any> = [
  { title: '字段标识', key: 'fieldName', width: 120 },
  { title: '显示名称', key: 'fieldLabel', width: 120 },
  { title: '类型', key: 'fieldType', width: 80 },
  { title: '必填', key: 'isRequired', width: 60, render: (row) => row.isRequired ? '是' : '否' },
  {
    title: '操作',
    key: 'actions',
    width: 120,
    render: (row) => h(NSpace, { size: 'small' }, () => [
      h(NPopconfirm, { onPositiveClick: () => handleDelete(row.id) }, {
        trigger: () => h(NButton, { size: 'tiny', type: 'error', quaternary: true }, { default: () => '删除' }),
        default: () => `确定删除字段 "${row.fieldLabel}" 吗？`,
      }),
    ]),
  },
];

const loadFields = async () => {
  loading.value = true;
  try {
    const { data } = await customFieldsApi.listDefs(currentEntityType.value);
    fields.value = data || [];
  } catch {
    fields.value = [];
  } finally {
    loading.value = false;
  }
};

const handleCreate = async () => {
  if (!createForm.value.fieldName || !createForm.value.fieldLabel) {
    message.warning('请填写字段标识和显示名称');
    return;
  }
  creating.value = true;
  try {
    const config: any = {};
    if (createForm.value.options.length > 0) {
      config.options = createForm.value.options.filter(o => o.label && o.value);
    }
    if (createForm.value.min !== null) config.min = createForm.value.min;
    if (createForm.value.max !== null) config.max = createForm.value.max;

    await customFieldsApi.createDef(currentEntityType.value, {
      fieldName: createForm.value.fieldName,
      fieldLabel: createForm.value.fieldLabel,
      fieldType: createForm.value.fieldType,
      isRequired: createForm.value.isRequired,
      fieldConfig: Object.keys(config).length > 0 ? config : undefined,
    });
    message.success('创建成功');
    showCreateModal.value = false;
    createForm.value = { fieldName: '', fieldLabel: '', fieldType: 'text', isRequired: false, options: [], min: null, max: null };
    loadFields();
  } catch (e: any) {
    message.error(e.response?.data?.message || '创建失败');
  } finally {
    creating.value = false;
  }
};

const handleDelete = async (fieldId: number) => {
  try {
    await customFieldsApi.deleteDef(fieldId);
    message.success('删除成功');
    loadFields();
  } catch {
    message.error('删除失败');
  }
};

onMounted(loadFields);
</script>

<style scoped>
.custom-fields-page {
  max-width: 1000px;
  margin: 0 auto;
}

.entity-tabs {
  margin-bottom: var(--hh-space-4);
}

.fields-section {
  min-height: 200px;
}

.options-editor {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
}

.option-row {
  display: flex;
  gap: 8px;
  align-items: center;
}
</style>
