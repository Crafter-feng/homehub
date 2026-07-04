<template>
  <div class="admin-page">
    <n-page-header :title="t('admin.title')" :subtitle="t('admin.subtitle')" />

    <n-card class="page-section">
      <n-tabs v-model:value="activeTab" type="line" animated>

        <!-- 系统概览 -->
        <n-tab-pane name="overview" :tab="t('admin.systemOverview')">
          <div class="stats-grid">
            <n-card class="stat-card" size="small">
              <n-statistic :value="stats.totalUsers" :label="t('admin.totalUsers')">
                <template #suffix> 人</template>
              </n-statistic>
            </n-card>
            <n-card class="stat-card" size="small">
              <n-statistic :value="stats.totalFamilies" :label="t('admin.totalFamilies')">
                <template #suffix> 个</template>
              </n-statistic>
            </n-card>
            <n-card class="stat-card" size="small">
              <n-statistic :value="stats.totalItems" :label="t('admin.totalItems')">
                <template #suffix> 件</template>
              </n-statistic>
            </n-card>
          </div>
        </n-tab-pane>

        <!-- 用户管理 -->
        <n-tab-pane name="users" :tab="t('admin.userManagement')">
          <n-data-table
            :columns="userColumns"
            :data="users"
            :pagination="{ pageSize: 20 }"
            :bordered="false"
          />
        </n-tab-pane>

        <!-- 家庭管理 -->
        <n-tab-pane name="families" :tab="t('admin.familyManagement')">
          <n-data-table
            :columns="familyColumns"
            :data="families"
            :pagination="{ pageSize: 20 }"
            :bordered="false"
          />
        </n-tab-pane>

        <!-- 插件管理 -->
        <n-tab-pane name="plugins" :tab="t('admin.pluginManagement')">
          <n-data-table
            :columns="pluginColumns"
            :data="plugins"
            :pagination="{ pageSize: 20 }"
            :bordered="false"
          />
        </n-tab-pane>

      </n-tabs>
    </n-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, h } from 'vue';
import { NPageHeader, NCard, NTabs, NTabPane, NDataTable, NStatistic, NTag } from 'naive-ui';
import type { DataTableColumns } from 'naive-ui';
import { useI18n } from '@/locales';

const { t } = useI18n();
const activeTab = ref('overview');

const stats = ref({ totalUsers: 0, totalFamilies: 0, totalItems: 0 });
const users = ref<any[]>([]);
const families = ref<any[]>([]);
const plugins = ref<any[]>([]);

const userColumns: DataTableColumns<any> = [
  { title: t('admin.userName'), key: 'name' },
  { title: t('admin.userEmail'), key: 'email' },
  { title: t('admin.createdAt'), key: 'createdAt', render: (row) => row.createdAt ? new Date(row.createdAt).toLocaleDateString('zh-CN') : '-' },
];

const familyColumns: DataTableColumns<any> = [
  { title: t('admin.familyName'), key: 'name' },
  { title: t('admin.memberCount'), key: 'memberCount', width: 100, render: (row) => h(NTag, { size: 'small' }, { default: () => row.memberCount || 0 }) },
  { title: t('admin.inviteCode'), key: 'inviteCode', render: (row) => h('span', { style: 'font-family:monospace;font-size:12px' }, row.inviteCode) },
];

const pluginColumns: DataTableColumns<any> = [
  { title: t('admin.pluginName'), key: 'name' },
  { title: t('admin.pluginVersion'), key: 'version', width: 100 },
  { title: t('admin.pluginStatus'), key: 'status', width: 100, render: (row) => h(NTag, { type: row.status === 'loaded' ? 'success' : 'warning', size: 'small' }, { default: () => row.status }) },
];

onMounted(async () => {
  try {
    const res = await fetch('/api/v1/admin/stats', { credentials: 'include' });
    if (res.ok) stats.value = await res.json();
  } catch { /* ignore */ }

  try {
    const res = await fetch('/api/v1/admin/users', { credentials: 'include' });
    if (res.ok) users.value = await res.json();
  } catch { /* ignore */ }

  try {
    const res = await fetch('/api/v1/admin/families', { credentials: 'include' });
    if (res.ok) families.value = await res.json();
  } catch { /* ignore */ }

  try {
    const res = await fetch('/api/v1/admin/plugins', { credentials: 'include' });
    if (res.ok) plugins.value = await res.json();
  } catch { /* ignore */ }
});
</script>

<style scoped>
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 16px;
}
.stat-card {
  text-align: center;
}
</style>