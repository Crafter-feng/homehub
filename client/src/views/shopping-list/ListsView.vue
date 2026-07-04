<template>
  <div class="lists-page">
    <n-page-header :title="t('lists.title')" :subtitle="t('lists.subtitle')">
      <template #extra>
        <n-space>
          <n-button @click="handleAutoReplenish" :loading="replenishing" size="small">
            <template #icon><n-icon><RefreshOutline /></n-icon></template>
            {{ t('lists.autoReplenish') }}
          </n-button>
          <n-button type="primary" @click="showCreateModal = true">
            <template #icon><n-icon><AddOutline /></n-icon></template>
            {{ t('lists.createList') }}
          </n-button>
        </n-space>
      </template>
    </n-page-header>

    <!-- Stats Bar -->
    <div class="stats-bar page-section">
      <div class="stat-card">
        <div class="stat-icon stat-icon--total">
          <n-icon :size="20"><ListOutline /></n-icon>
        </div>
        <div class="stat-info">
          <span class="stat-value">{{ stats.totalLists }}</span>
          <span class="stat-label">清单总数</span>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon stat-icon--items">
          <n-icon :size="20"><ClipboardOutline /></n-icon>
        </div>
        <div class="stat-info">
          <span class="stat-value">{{ stats.totalItems }}</span>
          <span class="stat-label">条目总数</span>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon stat-icon--done">
          <n-icon :size="20"><CheckmarkCircleOutline /></n-icon>
        </div>
        <div class="stat-info">
          <span class="stat-value">{{ stats.completedItems }}</span>
          <span class="stat-label">已完成</span>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon stat-icon--overdue">
          <n-icon :size="20"><WarningOutline /></n-icon>
        </div>
        <div class="stat-info">
          <span class="stat-value">{{ stats.overdueItems }}</span>
          <span class="stat-label">已逾期</span>
        </div>
      </div>
    </div>

    <!-- Type Filter -->
    <div class="type-filter page-section">
      <div
        v-for="type in listTypes"
        :key="type.value"
        class="type-chip"
        :class="{ 'type-chip--active': activeType === type.value }"
        @click="activeType = activeType === type.value ? null : type.value"
      >
        <n-icon :size="16" :color="activeType === type.value ? type.color : undefined">
          <component :is="type.icon" />
        </n-icon>
        <span class="type-chip-label">{{ type.label }}</span>
        <span class="type-chip-count">{{ getTypeCount(type.value) }}</span>
      </div>
    </div>

    <!-- List Grid -->
    <n-grid :cols="3" :x-gap="16" :y-gap="16" class="page-section" responsive="screen" item-responsive>
      <n-gi v-for="list in filteredLists" :key="list.id" span="3 m:1">
        <div class="list-card" :class="`list-card--${list.type}`" @click="openList(list)">
          <!-- Card Header -->
          <div class="list-card-header">
            <div class="list-type-icon" :style="{ background: getTypeBg(list.type), color: getTypeColor(list.type) }">
              <n-icon :size="20">
                <component :is="getTypeIcon(list.type)" />
              </n-icon>
            </div>
            <div class="list-card-actions" @click.stop>
              <n-dropdown :options="getListActions(list) as any" @select="(key: string) => handleListAction(key, list)">
                <n-button text size="small" circle>
                  <template #icon><n-icon><EllipsisVerticalOutline /></n-icon></template>
                </n-button>
              </n-dropdown>
            </div>
          </div>

          <!-- Card Body -->
          <div class="list-card-body">
            <h3 class="list-card-name">{{ list.name }}</h3>
            <p class="list-card-notes" v-if="list.notes">{{ list.notes }}</p>
          </div>

          <!-- Progress -->
          <div class="list-card-progress">
            <div class="progress-info">
              <span class="progress-text">{{ list.completedCount || 0 }} / {{ list.itemCount || 0 }}</span>
              <span class="progress-percent">{{ getProgressPercent(list) }}%</span>
            </div>
            <n-progress
              type="line"
              :percentage="getProgressPercent(list)"
              :color="getTypeColor(list.type)"
              :rail-color="getTypeBg(list.type)"
              :show-indicator="false"
              :height="6"
            />
          </div>

          <!-- Card Footer -->
          <div class="list-card-footer">
            <div class="footer-meta">
              <n-tag :type="getTypeTagType(list.type)" size="tiny" round>{{ getTypeLabel(list.type) }}</n-tag>
              <span v-if="list.overdueCount > 0" class="overdue-badge">
                {{ list.overdueCount }} 逾期
              </span>
            </div>
            <span class="footer-date" v-if="list.updatedAt">
              {{ formatRelativeTime(list.updatedAt) }}
            </span>
          </div>
        </div>
      </n-gi>
    </n-grid>

    <n-empty v-if="filteredLists.length === 0 && !loading" description="暂无清单" style="margin-top: 40px" />

    <!-- Create List Modal -->
    <n-modal v-model:show="showCreateModal" preset="card" :title="t('lists.createList')" style="max-width: 520px">
      <n-form ref="createFormRef" :model="createForm" :rules="createRules" label-placement="left" label-width="auto">
        <n-form-item :label="t('lists.listName')" path="name">
          <n-input v-model:value="createForm.name" placeholder="如：本周采购" />
        </n-form-item>
        <n-form-item :label="t('lists.listType')" path="type">
          <n-radio-group v-model:value="createForm.type">
            <n-space>
              <n-radio-button v-for="type in listTypes" :key="type.value" :value="type.value">
                <n-icon :size="14" style="margin-right: 4px"><component :is="type.icon" /></n-icon>
                {{ type.label }}
              </n-radio-button>
            </n-space>
          </n-radio-group>
        </n-form-item>
        <n-form-item label="备注">
          <n-input v-model:value="createForm.notes" type="textarea" :rows="2" placeholder="可选备注" />
        </n-form-item>

        <!-- Chore Config -->
        <n-form-item v-if="createForm.type === 'chore'" label="自动重置">
          <n-select
            v-model:value="createForm.config.autoReset"
            :options="autoResetOptions"
            placeholder="完成后自动重置"
            clearable
          />
        </n-form-item>

        <!-- Holiday Template -->
        <n-form-item v-if="createForm.type === 'holiday'" label="节日模板">
          <n-select
            v-model:value="createForm.config.templateId"
            :options="templateOptions"
            placeholder="选择节日模板"
            clearable
          />
        </n-form-item>
      </n-form>
      <template #footer>
        <n-space justify="end">
          <n-button @click="showCreateModal = false">取消</n-button>
          <n-button type="primary" :loading="creating" @click="handleCreate">创建</n-button>
        </n-space>
      </template>
    </n-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import {
  NPageHeader, NButton, NSpace, NTag, NGrid, NGi, NEmpty, NModal, NForm, NFormItem,
  NInput, NRadioGroup, NRadioButton, NSelect, NIcon, NDropdown, NProgress,
  useMessage, useDialog,
} from 'naive-ui';
import type { Component } from 'vue';
import { useRouter } from 'vue-router';
import {
  AddOutline, RefreshOutline, ListOutline, ClipboardOutline,
  CheckmarkCircleOutline, WarningOutline, CartOutline, CheckboxOutline,
  FlameOutline, GiftOutline, EllipsisVerticalOutline, CreateOutline,
  ArchiveOutline, TrashOutline,
} from '@vicons/ionicons5';
import { useI18n } from '@/locales';
import { listsApi } from '@/api/client';

const router = useRouter();
const { t } = useI18n();
const message = useMessage();
const dialog = useDialog();

const loading = ref(false);
const creating = ref(false);
const replenishing = ref(false);
const showCreateModal = ref(false);
const activeType = ref<string | null>(null);
const lists = ref<any[]>([]);

const createFormRef = ref();
const createForm = ref({
  name: '',
  type: 'shopping' as string,
  notes: '',
  config: { autoReset: '', templateId: '' },
});

const createRules = {
  name: { required: true, message: '请输入清单名称', trigger: 'blur' },
};

const autoResetOptions = [
  { label: '每天重置', value: 'daily' },
  { label: '每周重置', value: 'weekly' },
  { label: '每月重置', value: 'monthly' },
];

const templateOptions = [
  { label: '春节备货', value: 'spring_festival' },
  { label: '中秋节备货', value: 'mid_autumn' },
  { label: '端午节备货', value: 'dragon_boat' },
  { label: '自定义', value: 'custom' },
];

interface ListTypeConfig {
  value: string;
  label: string;
  color: string;
  icon: Component;
}

const listTypes = computed<ListTypeConfig[]>(() => [
  { value: 'shopping', label: t('lists.shopping'), color: '#10b981', icon: CartOutline },
  { value: 'todo', label: t('lists.todo'), color: '#3b82f6', icon: CheckboxOutline },
  { value: 'chore', label: t('lists.chore'), color: '#f59e0b', icon: FlameOutline },
  { value: 'holiday', label: t('lists.holiday'), color: '#ef4444', icon: GiftOutline },
]);

const stats = computed(() => {
  let totalItems = 0;
  let completedItems = 0;
  let overdueItems = 0;
  for (const list of lists.value) {
    totalItems += list.itemCount || 0;
    completedItems += list.completedCount || 0;
    if (list.overdueCount) overdueItems += list.overdueCount;
  }
  return { totalLists: lists.value.length, totalItems, completedItems, overdueItems };
});

const filteredLists = computed(() => {
  if (!activeType.value) return lists.value;
  return lists.value.filter(l => l.type === activeType.value);
});

function getTypeCount(type: string): number {
  return lists.value.filter(l => l.type === type).length;
}

function getTypeColor(type: string): string {
  const map: Record<string, string> = { shopping: '#10b981', todo: '#3b82f6', chore: '#f59e0b', holiday: '#ef4444' };
  return map[type] || '#6b7280';
}

function getTypeBg(type: string): string {
  const map: Record<string, string> = { shopping: '#ecfdf5', todo: '#eff6ff', chore: '#fffbeb', holiday: '#fef2f2' };
  return map[type] || '#f3f4f6';
}

function getTypeIcon(type: string): Component {
  const map: Record<string, Component> = { shopping: CartOutline, todo: CheckboxOutline, chore: FlameOutline, holiday: GiftOutline };
  return map[type] || ListOutline;
}

function getTypeLabel(type: string): string {
  const map: Record<string, string> = { shopping: t('lists.shopping'), todo: t('lists.todo'), chore: t('lists.chore'), holiday: t('lists.holiday') };
  return map[type] || type;
}

function getTypeTagType(type: string): 'success' | 'info' | 'warning' | 'error' {
  const map: Record<string, 'success' | 'info' | 'warning' | 'error'> = { shopping: 'success', todo: 'info', chore: 'warning', holiday: 'error' };
  return map[type] || 'default' as any;
}

function getProgressPercent(list: any): number {
  const total = list.itemCount || 0;
  if (total === 0) return 0;
  return Math.round(((list.completedCount || 0) / total) * 100);
}

function formatRelativeTime(date: any): string {
  if (!date) return '';
  const d = new Date(date);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return '刚刚';
  if (mins < 60) return `${mins} 分钟前`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} 小时前`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} 天前`;
  return d.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
}

function getListActions(list: any) {
  return [
    { label: '编辑', key: 'edit', icon: CreateOutline },
    { label: list.isArchived ? '取消归档' : '归档', key: 'archive', icon: ArchiveOutline },
    { type: 'divider', key: 'd1' },
    { label: '删除', key: 'delete', icon: TrashOutline },
  ];
}

async function handleListAction(key: string, list: any) {
  if (key === 'edit') {
    openList(list);
  } else if (key === 'archive') {
    try {
      await listsApi.update(list.id, { isArchived: !list.isArchived });
      message.success(list.isArchived ? '已取消归档' : '已归档');
      loadLists();
    } catch {
      message.error('操作失败');
    }
  } else if (key === 'delete') {
    dialog.warning({
      title: '删除清单',
      content: `确定删除「${list.name}」？所有条目将被删除。`,
      positiveText: '删除',
      negativeText: '取消',
      onPositiveClick: async () => {
        try {
          await listsApi.delete(list.id);
          message.success(t('lists.deleteSuccess'));
          loadLists();
        } catch {
          message.error('删除失败');
        }
      },
    });
  }
}

const openList = (list: any) => {
  router.push(`/lists/${list.id}`);
};

const handleCreate = async () => {
  if (!createForm.value.name) {
    message.warning('请输入清单名称');
    return;
  }
  creating.value = true;
  try {
    const payload: any = {
      name: createForm.value.name,
      type: createForm.value.type,
      notes: createForm.value.notes || undefined,
    };
    if (createForm.value.type === 'chore' && createForm.value.config.autoReset) {
      payload.config = { autoReset: createForm.value.config.autoReset };
    }
    if (createForm.value.type === 'holiday' && createForm.value.config.templateId) {
      await listsApi.createFromTemplate(parseInt(createForm.value.config.templateId));
    } else {
      await listsApi.create(payload);
    }
    message.success(t('lists.createSuccess'));
    showCreateModal.value = false;
    createForm.value = { name: '', type: 'shopping', notes: '', config: { autoReset: '', templateId: '' } };
    loadLists();
  } catch (e: any) {
    message.error(e.response?.data?.message || '创建失败');
  } finally {
    creating.value = false;
  }
};

const handleAutoReplenish = async () => {
  replenishing.value = true;
  try {
    const { data } = await listsApi.autoReplenish();
    message.success(data.message || '补货完成');
    loadLists();
  } catch {
    message.error('补货失败');
  } finally {
    replenishing.value = false;
  }
};

async function loadLists() {
  loading.value = true;
  try {
    const { data } = await listsApi.list();
    lists.value = data || [];
  } catch {
    // ignore
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  loadLists();
});
</script>

<style scoped>
.lists-page {
  max-width: 1200px;
  margin: 0 auto;
}

/* Stats Bar */
.stats-bar {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--hh-space-4);
}

.stat-card {
  display: flex;
  align-items: center;
  gap: var(--hh-space-3);
  padding: var(--hh-space-4);
  background: var(--hh-bg-card);
  border-radius: var(--hh-radius);
  border: 1px solid var(--hh-border-light);
  box-shadow: var(--hh-shadow-sm);
}

.stat-icon {
  width: 44px;
  height: 44px;
  border-radius: var(--hh-radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.stat-icon--total { background: #eff6ff; color: #3b82f6; }
.stat-icon--items { background: #f0fdf4; color: #10b981; }
.stat-icon--done { background: #ecfdf5; color: #059669; }
.stat-icon--overdue { background: #fef2f2; color: #ef4444; }

.stat-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.stat-value {
  font-size: var(--hh-text-2xl);
  font-weight: var(--hh-weight-bold);
  color: var(--hh-text);
  line-height: 1;
}

.stat-label {
  font-size: var(--hh-text-xs);
  color: var(--hh-text-tertiary);
}

/* Type Filter */
.type-filter {
  display: flex;
  gap: var(--hh-space-2);
  flex-wrap: wrap;
}

.type-chip {
  display: flex;
  align-items: center;
  gap: var(--hh-space-2);
  padding: var(--hh-space-2) var(--hh-space-3);
  border-radius: var(--hh-radius-lg);
  border: 1px solid var(--hh-border-light);
  background: var(--hh-bg-card);
  cursor: pointer;
  transition: all var(--hh-transition-fast) var(--hh-easing-default);
  user-select: none;
}

.type-chip:hover {
  border-color: var(--hh-primary);
  box-shadow: var(--hh-shadow-sm);
}

.type-chip--active {
  background: var(--hh-primary);
  border-color: var(--hh-primary);
  color: white;
}

.type-chip--active .type-chip-label,
.type-chip--active .type-chip-count {
  color: white;
}

.type-chip-label {
  font-size: var(--hh-text-sm);
  font-weight: var(--hh-weight-medium);
}

.type-chip-count {
  font-size: var(--hh-text-xs);
  color: var(--hh-text-tertiary);
  background: var(--hh-bg-secondary);
  padding: 1px 6px;
  border-radius: var(--hh-radius-xs);
  min-width: 20px;
  text-align: center;
}

.type-chip--active .type-chip-count {
  background: rgba(255, 255, 255, 0.2);
  color: white;
}

/* List Card */
.list-card {
  background: var(--hh-bg-card);
  border-radius: var(--hh-radius);
  border: 1px solid var(--hh-border-light);
  box-shadow: var(--hh-shadow-sm);
  padding: var(--hh-space-4);
  cursor: pointer;
  transition: all var(--hh-transition-fast) var(--hh-easing-default);
  display: flex;
  flex-direction: column;
  gap: var(--hh-space-3);
  min-height: 180px;
}

.list-card:hover {
  border-color: var(--hh-primary);
  box-shadow: var(--hh-shadow-md);
  transform: translateY(-2px);
}

.list-card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.list-type-icon {
  width: 40px;
  height: 40px;
  border-radius: var(--hh-radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
}

.list-card-actions {
  opacity: 0;
  transition: opacity var(--hh-transition-fast);
}

.list-card:hover .list-card-actions {
  opacity: 1;
}

.list-card-body {
  flex: 1;
}

.list-card-name {
  font-size: var(--hh-text-base);
  font-weight: var(--hh-weight-semibold);
  color: var(--hh-text);
  margin: 0 0 var(--hh-space-1) 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.list-card-notes {
  font-size: var(--hh-text-xs);
  color: var(--hh-text-tertiary);
  margin: 0;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* Progress */
.list-card-progress {
  display: flex;
  flex-direction: column;
  gap: var(--hh-space-1);
}

.progress-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.progress-text {
  font-size: var(--hh-text-xs);
  color: var(--hh-text-secondary);
}

.progress-percent {
  font-size: var(--hh-text-xs);
  font-weight: var(--hh-weight-semibold);
  color: var(--hh-text);
}

/* Footer */
.list-card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: var(--hh-space-2);
  border-top: 1px solid var(--hh-border-light);
}

.footer-meta {
  display: flex;
  align-items: center;
  gap: var(--hh-space-2);
}

.overdue-badge {
  font-size: var(--hh-text-xs);
  font-weight: var(--hh-weight-medium);
  color: var(--hh-error);
  background: #fef2f2;
  padding: 1px 6px;
  border-radius: var(--hh-radius-xs);
}

.footer-date {
  font-size: var(--hh-text-xs);
  color: var(--hh-text-tertiary);
}

/* Responsive */
@media (max-width: 768px) {
  .stats-bar {
    grid-template-columns: repeat(2, 1fr);
  }

  .type-filter {
    overflow-x: auto;
    flex-wrap: nowrap;
    padding-bottom: var(--hh-space-2);
  }

  .type-chip {
    flex-shrink: 0;
  }
}

@media (max-width: 480px) {
  .stats-bar {
    grid-template-columns: 1fr;
  }
}
</style>
