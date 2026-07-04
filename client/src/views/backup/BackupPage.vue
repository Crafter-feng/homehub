<template>
  <div class="backup-page">
    <n-page-header :title="t('backup.title')" :subtitle="t('backup.subtitle')">
      <template #extra>
        <n-button type="primary" size="small" @click="createBackup" :loading="creating">
          <template #icon><n-icon><AddOutline /></n-icon></template>
          {{ t('backup.createBackup') }}
        </n-button>
      </template>
    </n-page-header>

    <!-- 存储信息 -->
    <div class="stats-grid" v-if="storageInfo">
      <div class="stat-card hover-lift">
        <div class="stat-body">
          <span class="stat-label">{{ t('backup.totalBackups') }}</span>
          <span class="stat-value">{{ storageInfo.totalBackups }}</span>
        </div>
      </div>
      <div class="stat-card hover-lift">
        <div class="stat-body">
          <span class="stat-label">{{ t('backup.dbSize') }}</span>
          <span class="stat-value">{{ formatSize(storageInfo.dbSize) }}</span>
        </div>
      </div>
      <div class="stat-card hover-lift">
        <div class="stat-body">
          <span class="stat-label">{{ t('backup.totalSize') }}</span>
          <span class="stat-value">{{ formatSize(storageInfo.totalSize) }}</span>
        </div>
      </div>
      <div class="stat-card hover-lift">
        <div class="stat-body">
          <span class="stat-label">{{ t('backup.latestBackup') }}</span>
          <span class="stat-value">{{ storageInfo.latestBackup ? formatDate(storageInfo.latestBackup) : '-' }}</span>
        </div>
      </div>
    </div>

    <!-- 备份列表 -->
    <div class="table-section">
      <h2 class="section-title">{{ t('backup.title') }}</h2>
      <n-data-table
        :columns="tableColumns"
        :data="backups"
        :bordered="false"
        :single-line="false"
        size="small"
        :loading="loading"
      />
      <n-empty v-if="!backups.length && !loading" :description="t('common.noData')" class="empty-state" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, h } from 'vue';
import { NButton, NPopconfirm, useMessage } from 'naive-ui';
import { useI18n } from '@/locales';
import { backupApi } from '@/api/client';
import { AddOutline, DownloadOutline, TrashOutline } from '@vicons/ionicons5';

const { t } = useI18n();
const message = useMessage();

const loading = ref(false);
const creating = ref(false);
const backups = ref<any[]>([]);
const storageInfo = ref<any>(null);

const tableColumns = [
  { title: t('backup.backupName'), key: 'name', ellipsis: { tooltip: true } },
  {
    title: t('backup.totalSize'),
    key: 'size',
    width: 100,
    render: (row: any) => formatSize(row.size),
  },
  { title: '类型', key: 'type', width: 80 },
  {
    title: '创建时间',
    key: 'createdAt',
    width: 160,
    render: (row: any) => new Date(row.createdAt).toLocaleString('zh-CN'),
  },
  {
    title: t('common.actions'),
    key: 'actions',
    width: 140,
    render: (row: any) => h('div', { style: 'display: flex; gap: 8px;' }, [
      h(NButton, {
        size: 'small',
        quaternary: true,
        type: 'warning',
        onClick: () => restoreBackup(row.filename, row.name),
      }, {
        icon: () => h(DownloadOutline),
        default: () => '恢复',
      }),
      h(NPopconfirm, {
        onPositiveClick: () => deleteBackup(row.filename),
      }, {
        trigger: () => h(NButton, { size: 'small', quaternary: true, type: 'error' }, { icon: () => h(TrashOutline) }),
        default: () => t('backup.confirmDelete'),
      }),
    ]),
  },
];

function formatSize(bytes: number) {
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  let i = 0;
  let size = bytes;
  while (size >= 1024 && i < units.length - 1) { size /= 1024; i++; }
  return `${size.toFixed(1)} ${units[i]}`;
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

async function createBackup() {
  creating.value = true;
  try {
    await backupApi.create(`手动备份 ${new Date().toLocaleDateString('zh-CN')}`);
    message.success(t('common.success'));
    await loadData();
  } catch {
    message.error(t('common.error'));
  } finally {
    creating.value = false;
  }
}

async function restoreBackup(filename: string, _name: string) {
  try {
    await backupApi.restore(filename, true);
    message.success('恢复成功');
  } catch {
    message.error(t('common.error'));
  }
}

async function deleteBackup(filename: string) {
  try {
    await backupApi.delete(filename);
    message.success(t('common.success'));
    await loadData();
  } catch {
    message.error(t('common.deleteFailed'));
  }
}

async function loadData() {
  loading.value = true;
  try {
    const [listRes, storageRes] = await Promise.all([
      backupApi.list(),
      backupApi.getStorage(),
    ]);
    backups.value = listRes.data || [];
    storageInfo.value = storageRes.data;
  } catch {
    message.error(t('common.error'));
  } finally {
    loading.value = false;
  }
}

onMounted(loadData);
</script>

<style scoped>
.backup-page { padding: var(--hh-space-6); max-width: 1200px; margin: 0 auto; }
.stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: var(--hh-space-4); margin: var(--hh-space-6) 0; }
.stat-card { background: var(--hh-card-bg); border-radius: var(--hh-radius-lg); padding: var(--hh-space-5); border: 1px solid var(--hh-border-light); }
.stat-body { display: flex; flex-direction: column; gap: 4px; }
.stat-label { font-size: var(--hh-text-sm); color: var(--hh-text-secondary); }
.stat-value { font-size: var(--hh-text-xl); font-weight: var(--hh-weight-bold); }
.section-title { font-size: var(--hh-text-lg); font-weight: var(--hh-weight-semibold); margin-bottom: var(--hh-space-4); color: var(--hh-text-primary); }
.table-section { background: var(--hh-card-bg); border-radius: var(--hh-radius-lg); padding: var(--hh-space-6); margin: var(--hh-space-4) 0; border: 1px solid var(--hh-border-light); }
.empty-state { padding: var(--hh-space-10) 0; }
@media (max-width: 768px) { .stats-grid { grid-template-columns: repeat(2, 1fr); } }
</style>
