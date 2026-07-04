<template>
  <div class="mcp-page">
    <n-page-header :title="t('mcp.title')" :subtitle="t('mcp.subtitle')">
      <template #extra>
        <n-space>
          <n-tag type="info">{{ tools.length }} {{ t('mcp.toolCount') }}</n-tag>
          <n-tag type="success">{{ t('mcp.streamableHttp') }}</n-tag>
        </n-space>
      </template>
    </n-page-header>

    <!-- 认证说明 -->
    <n-card :title="t('mcp.mcpEndpoint')" class="page-section">
      <n-alert type="info">
        <p><strong>{{ t('mcp.endpointUrl') }}</strong><n-tag type="success">POST /api/v1/mcp</n-tag></p>
        <p><strong>{{ t('mcp.protocol') }}</strong>{{ t('mcp.protocolDesc') }}</p>
        <p><strong>{{ t('mcp.auth') }}</strong>{{ t('mcp.authDesc') }}</p>
        <n-code language="http" code="Authorization: Bearer &lt;your_api_token&gt;" />
      </n-alert>
    </n-card>

    <!-- 工具列表 -->
    <n-card :title="t('mcp.toolList')" class="page-section">
      <n-data-table :columns="columns" :data="tools" :pagination="{ pageSize: 20 }" :row-key="(row: any) => row.name" />
    </n-card>

    <!-- 工具详情弹窗 -->
    <n-modal v-model:show="showDetail" preset="card" style="max-width: 600px" :title="selectedTool?.name || t('mcp.toolDetail')">
      <div v-if="selectedTool">
        <n-descriptions bordered :column="2">
          <n-descriptions-item :label="t('mcp.name')">
            <n-tag>{{ selectedTool.name }}</n-tag>
          </n-descriptions-item>
          <n-descriptions-item :label="t('mcp.toolDesc')">{{ selectedTool.description }}</n-descriptions-item>
        </n-descriptions>

        <h4 style="margin: 16px 0 8px">{{ t('mcp.paramList') }}</h4>
        <n-data-table :columns="paramColumns" :data="paramList" size="small" />
      </div>
    </n-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, h } from 'vue';
import { NPageHeader, NCard, NTag, NAlert, NCode, NDataTable, NDescriptions, NDescriptionsItem, NSpace, NModal } from 'naive-ui';
import type { DataTableColumns } from 'naive-ui';
import { useI18n } from '@/locales';

const { t } = useI18n();

const tools = ref<any[]>([]);
const showDetail = ref(false);
const selectedTool = ref<any>(null);

const columns: DataTableColumns<any> = [
  {
    title: t('mcp.toolName'),
    key: 'name',
    width: 200,
    render: (row) => h('span', {
      style: 'font-family: monospace; font-weight: 500; cursor: pointer; color: var(--hh-primary)',
      onClick: () => { selectedTool.value = row; showDetail.value = true; },
    }, row.name),
  },
  { title: t('mcp.toolDesc'), key: 'description' },
];

const paramList = computed(() => {
  const params = selectedTool.value?.inputSchema?.properties || {};
  const required = selectedTool.value?.inputSchema?.required || [];
  return Object.entries(params).map(([key, val]: [string, any]) => ({
    name: key,
    type: val.type,
    optional: required.includes(key) ? t('mcp.required') : t('mcp.optional'),
    description: val.description || '-',
  }));
});

const paramColumns: DataTableColumns<any> = [
  { title: t('mcp.paramName'), key: 'name', width: 150 },
  { title: t('mcp.paramType'), key: 'type', width: 100 },
  { title: t('mcp.paramRequired'), key: 'optional', width: 100 },
  { title: t('mcp.toolDesc'), key: 'description' },
];

const loadTools = async () => {
  try {
    const { default: apiClient } = await import('@/api/client');
    const resp = await apiClient.post('/mcp/tools/list');
    tools.value = resp.data?.tools || [];
  } catch (e) {
    console.error('加载工具列表失败');
  }
};

onMounted(() => {
  loadTools();
});
</script>

<style scoped>
.mcp-page {
  max-width: 1200px;
  margin: 0 auto;
}
</style>
