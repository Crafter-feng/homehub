<template>
  <div class="list-detail-page" v-if="list">
    <!-- Header -->
    <n-page-header @back="router.push('/lists')">
      <template #title>
        <div class="detail-title">
          <div class="detail-type-icon" :style="{ background: getTypeBg(list.type), color: getTypeColor(list.type) }">
            <n-icon :size="20"><component :is="getTypeIcon(list.type)" /></n-icon>
          </div>
          <div>
            <h2 class="detail-name">{{ list.name }}</h2>
            <p class="detail-sub" v-if="list.notes">{{ list.notes }}</p>
          </div>
        </div>
      </template>
      <template #extra>
        <n-space>
          <n-tag :type="getTypeTagType(list.type)" round>{{ getTypeLabel(list.type) }}</n-tag>
          <n-button-group size="small">
            <n-button @click="showSettings = true">
              <template #icon><n-icon><SettingsOutline /></n-icon></template>
            </n-button>
            <n-dropdown :options="headerActions as any" @select="handleHeaderAction">
              <n-button>
                <template #icon><n-icon><EllipsisVerticalOutline /></n-icon></template>
              </n-button>
            </n-dropdown>
          </n-button-group>
        </n-space>
      </template>
    </n-page-header>

    <!-- Stats Row -->
    <div class="detail-stats page-section">
      <div class="detail-stat">
        <span class="detail-stat-value">{{ pendingItems.length }}</span>
        <span class="detail-stat-label">待完成</span>
      </div>
      <div class="detail-stat detail-stat--done">
        <span class="detail-stat-value">{{ completedItems.length }}</span>
        <span class="detail-stat-label">已完成</span>
      </div>
      <div class="detail-stat" v-if="overdueCount > 0">
        <span class="detail-stat-value detail-stat-value--error">{{ overdueCount }}</span>
        <span class="detail-stat-label">已逾期</span>
      </div>
      <div class="detail-stat">
        <span class="detail-stat-value">{{ progressPercent }}%</span>
        <span class="detail-stat-label">完成率</span>
      </div>
    </div>

    <!-- Progress Bar -->
    <div class="detail-progress page-section">
      <n-progress
        type="line"
        :percentage="progressPercent"
        :color="getTypeColor(list.type)"
        :rail-color="getTypeBg(list.type)"
        :show-indicator="false"
        :height="8"
        :border-radius="4"
      />
    </div>

    <!-- Add Item Form -->
    <div class="add-item-form page-section">
      <n-input
        v-model:value="newItemContent"
        :placeholder="t('lists.itemPlaceholder')"
        @keyup.enter="addItem"
        clearable
        size="large"
      >
        <template #prefix>
          <n-icon :size="18"><AddOutline /></n-icon>
        </template>
      </n-input>
      <n-collapse-transition :show="!!newItemContent">
        <div class="add-item-extra">
          <n-space :size="12" align="center" wrap>
            <n-input v-model:value="newItemNotes" placeholder="备注" size="small" style="width: 160px" />
            <n-input-number v-model:value="newItemQuantity" :min="0" :step="1" placeholder="数量" size="small" style="width: 100px" />
            <n-input v-model:value="newItemUnit" placeholder="单位" size="small" style="width: 80px" />
            <n-date-picker v-if="list.type === 'todo'" v-model:value="newItemDueDate" type="date" clearable placeholder="截止日期" size="small" style="width: 150px" />
            <n-button type="primary" @click="addItem" :loading="addingItem" :disabled="!newItemContent.trim()">
              添加
            </n-button>
          </n-space>
        </div>
      </n-collapse-transition>
    </div>

    <!-- Filter Tabs -->
    <div class="filter-tabs page-section" v-if="pendingItems.length > 0 && completedItems.length > 0">
      <n-button-group size="small">
        <n-button :type="itemFilter === 'all' ? 'primary' : 'default'" @click="itemFilter = 'all'">
          全部 ({{ list.items?.length || 0 }})
        </n-button>
        <n-button :type="itemFilter === 'pending' ? 'primary' : 'default'" @click="itemFilter = 'pending'">
          待完成 ({{ pendingItems.length }})
        </n-button>
        <n-button :type="itemFilter === 'completed' ? 'primary' : 'default'" @click="itemFilter = 'completed'">
          已完成 ({{ completedItems.length }})
        </n-button>
      </n-button-group>
    </div>

    <!-- Pending Items -->
    <div class="items-section page-section" v-if="displayPendingItems.length > 0">
      <h3 class="section-title">
        <n-icon :size="16" color="var(--hh-warning)"><TimeOutline /></n-icon>
        待完成
      </h3>
      <div class="items-list">
        <div
          v-for="item in displayPendingItems"
          :key="item.id"
          class="item-row"
          :class="{ 'item-row--overdue': isOverdue(item.dueAt) }"
        >
          <n-checkbox :checked="false" @update:checked="toggleItem(item)" class="item-check" />
          <div class="item-content">
            <div class="item-main">
              <span class="item-text">{{ item.content }}</span>
              <div class="item-tags">
                <n-tag size="tiny" v-if="item.quantity">{{ item.quantity }} {{ item.unit || '' }}</n-tag>
                <n-tag size="tiny" type="info" v-if="item.notes">{{ item.notes }}</n-tag>
                <n-tag
                  size="tiny"
                  :type="isOverdue(item.dueAt) ? 'error' : 'warning'"
                  v-if="item.dueAt && list.type === 'todo'"
                >
                  {{ formatDueDate(item.dueAt) }}
                </n-tag>
              </div>
            </div>
          </div>
          <div class="item-actions" @click.stop>
            <n-dropdown :options="getItemActions(item) as any" @select="(key: string) => handleItemAction(key, item)">
              <n-button text size="tiny" circle>
                <template #icon><n-icon><EllipsisVerticalOutline /></n-icon></template>
              </n-button>
            </n-dropdown>
          </div>
        </div>
      </div>
    </div>

    <!-- Completed Items -->
    <div class="items-section page-section" v-if="displayCompletedItems.length > 0">
      <h3 class="section-title section-title--done">
        <n-icon :size="16" color="var(--hh-success)"><CheckmarkCircleOutline /></n-icon>
        已完成
        <n-button text size="tiny" @click="showCompleted = !showCompleted">
          {{ showCompleted ? '收起' : `展开 (${completedItems.length})` }}
        </n-button>
      </h3>
      <n-collapse-transition :show="showCompleted">
        <div class="items-list items-list--done">
          <div
            v-for="item in displayCompletedItems"
            :key="item.id"
            class="item-row item-row--done"
          >
            <n-checkbox :checked="true" @update:checked="toggleItem(item)" class="item-check" />
            <div class="item-content">
              <span class="item-text item-text--done">{{ item.content }}</span>
              <span class="item-done-info" v-if="item.completedAt">
                {{ formatCompletedTime(item.completedAt) }}
              </span>
            </div>
            <div class="item-actions" @click.stop>
              <n-dropdown :options="getItemActions(item) as any" @select="(key: string) => handleItemAction(key, item)">
                <n-button text size="tiny" circle>
                  <template #icon><n-icon><EllipsisVerticalOutline /></n-icon></template>
                </n-button>
              </n-dropdown>
            </div>
          </div>
        </div>
      </n-collapse-transition>
    </div>

    <!-- Empty State -->
    <n-empty v-if="!list.items || list.items.length === 0" description="暂无条目，添加第一个条目吧" style="margin-top: 40px" />

    <!-- Settings Modal -->
    <n-modal v-model:show="showSettings" preset="card" title="清单设置" style="max-width: 480px">
      <n-form label-placement="left" label-width="auto">
        <n-form-item label="清单名称">
          <n-input v-model:value="editForm.name" />
        </n-form-item>
        <n-form-item label="备注">
          <n-input v-model:value="editForm.notes" type="textarea" :rows="2" />
        </n-form-item>
        <n-form-item v-if="list.type === 'chore'" label="自动重置">
          <n-select
            v-model:value="editForm.autoReset"
            :options="autoResetOptions"
            placeholder="完成后自动重置"
            clearable
          />
        </n-form-item>
      </n-form>
      <template #footer>
        <n-space justify="end">
          <n-button @click="showSettings = false">取消</n-button>
          <n-button type="primary" @click="saveSettings">保存</n-button>
        </n-space>
      </template>
    </n-modal>
  </div>

  <!-- Loading -->
  <div v-else-if="loading" class="loading-state">
    <n-spin size="large" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import {
  NPageHeader, NButton, NButtonGroup, NIcon, NSpace, NTag, NEmpty, NModal, NForm,
  NFormItem, NInput, NInputNumber, NDatePicker, NSelect, NCheckbox, NDropdown,
  NProgress, NCollapseTransition, NSpin, useMessage, useDialog,
} from 'naive-ui';
import type { Component } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import {
  AddOutline, SettingsOutline, EllipsisVerticalOutline, TimeOutline,
  CheckmarkCircleOutline, CartOutline, CheckboxOutline, FlameOutline,
  GiftOutline, CreateOutline, TrashOutline, ListOutline,
} from '@vicons/ionicons5';
import { useI18n } from '@/locales';
import { listsApi } from '@/api/client';

const router = useRouter();
const route = useRoute();
const { t } = useI18n();
const message = useMessage();
const dialog = useDialog();

const loading = ref(true);
const addingItem = ref(false);
const list = ref<any>(null);
const showSettings = ref(false);
const showCompleted = ref(false);
const itemFilter = ref<'all' | 'pending' | 'completed'>('all');

// Add item form
const newItemContent = ref('');
const newItemNotes = ref('');
const newItemQuantity = ref<number | null>(null);
const newItemUnit = ref('');
const newItemDueDate = ref<number | null>(null);

// Edit settings form
const editForm = ref({ name: '', notes: '', autoReset: '' });

const autoResetOptions = [
  { label: '每天重置', value: 'daily' },
  { label: '每周重置', value: 'weekly' },
  { label: '每月重置', value: 'monthly' },
];

const headerActions = [
  { label: '编辑设置', key: 'settings', icon: CreateOutline },
  { type: 'divider', key: 'd1' },
  { label: '删除清单', key: 'delete', icon: TrashOutline },
];

const pendingItems = computed(() =>
  (list.value?.items || []).filter((i: any) => i.status === 'pending')
);

const completedItems = computed(() =>
  (list.value?.items || []).filter((i: any) => i.status === 'completed')
);

const overdueCount = computed(() => {
  const now = new Date();
  return pendingItems.value.filter((i: any) => i.dueAt && new Date(i.dueAt) < now).length;
});

const progressPercent = computed(() => {
  const total = list.value?.items?.length || 0;
  if (total === 0) return 0;
  return Math.round((completedItems.value.length / total) * 100);
});

const displayPendingItems = computed(() => {
  if (itemFilter.value === 'completed') return [];
  return pendingItems.value;
});

const displayCompletedItems = computed(() => {
  if (itemFilter.value === 'pending') return [];
  return completedItems.value;
});

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

function isOverdue(dueAt: any): boolean {
  if (!dueAt) return false;
  return new Date(dueAt) < new Date();
}

function formatDueDate(dueAt: any): string {
  if (!dueAt) return '';
  const d = new Date(dueAt);
  const now = new Date();
  const diff = d.getTime() - now.getTime();
  const days = Math.ceil(diff / 86400000);
  if (days < 0) return `逾期 ${Math.abs(days)} 天`;
  if (days === 0) return '今天';
  if (days === 1) return '明天';
  return d.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
}

function formatCompletedTime(date: any): string {
  if (!date) return '';
  const d = new Date(date);
  return d.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function getItemActions(_item: any) {
  return [
    { label: '编辑', key: 'edit', icon: CreateOutline },
    { label: '删除', key: 'delete', icon: TrashOutline },
  ];
}

async function handleItemAction(key: string, item: any) {
  if (key === 'edit') {
    // TODO: inline edit
    message.info('编辑功能开发中');
  } else if (key === 'delete') {
    dialog.warning({
      title: '删除条目',
      content: `确定删除「${item.content}」？`,
      positiveText: '删除',
      negativeText: '取消',
      onPositiveClick: async () => {
        try {
          await listsApi.deleteItem(item.id);
          message.success(t('lists.deleteSuccess'));
          loadList();
        } catch {
          message.error('删除失败');
        }
      },
    });
  }
}

async function toggleItem(item: any) {
  try {
    if (item.status === 'completed') {
      await listsApi.uncheckItem(item.id);
    } else {
      await listsApi.checkItem(item.id);
    }
    loadList();
  } catch {
    message.error('操作失败');
  }
}

async function addItem() {
  if (!newItemContent.value.trim()) return;
  addingItem.value = true;
  try {
    const payload: any = { content: newItemContent.value.trim() };
    if (newItemNotes.value) payload.notes = newItemNotes.value;
    if (newItemQuantity.value) payload.quantity = newItemQuantity.value;
    if (newItemUnit.value) payload.unit = newItemUnit.value;
    if (newItemDueDate.value) payload.dueAt = newItemDueDate.value;

    await listsApi.addItem(list.value.id, payload);
    newItemContent.value = '';
    newItemNotes.value = '';
    newItemQuantity.value = null;
    newItemUnit.value = '';
    newItemDueDate.value = null;
    loadList();
  } catch {
    message.error('添加失败');
  } finally {
    addingItem.value = false;
  }
}

async function saveSettings() {
  try {
    await listsApi.update(list.value.id, {
      name: editForm.value.name,
      notes: editForm.value.notes,
    });
    message.success('保存成功');
    showSettings.value = false;
    loadList();
  } catch {
    message.error('保存失败');
  }
}

function handleHeaderAction(key: string) {
  if (key === 'settings') {
    editForm.value = {
      name: list.value.name || '',
      notes: list.value.notes || '',
      autoReset: list.value.config?.autoReset || '',
    };
    showSettings.value = true;
  } else if (key === 'delete') {
    dialog.warning({
      title: '删除清单',
      content: `确定删除「${list.value.name}」？所有条目将被删除。`,
      positiveText: '删除',
      negativeText: '取消',
      onPositiveClick: async () => {
        try {
          await listsApi.delete(list.value.id);
          message.success(t('lists.deleteSuccess'));
          router.push('/lists');
        } catch {
          message.error('删除失败');
        }
      },
    });
  }
}

async function loadList() {
  const id = parseInt(route.params.id as string);
  if (isNaN(id)) {
    router.push('/lists');
    return;
  }
  loading.value = true;
  try {
    const { data } = await listsApi.getById(id);
    list.value = data;
  } catch {
    message.error('加载失败');
    router.push('/lists');
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  loadList();
});

// Watch for route changes
watch(() => route.params.id, () => {
  if (route.params.id) loadList();
});
</script>

<style scoped>
.list-detail-page {
  max-width: 800px;
  margin: 0 auto;
}

/* Title */
.detail-title {
  display: flex;
  align-items: center;
  gap: var(--hh-space-3);
}

.detail-type-icon {
  width: 44px;
  height: 44px;
  border-radius: var(--hh-radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.detail-name {
  font-size: var(--hh-text-xl);
  font-weight: var(--hh-weight-bold);
  color: var(--hh-text);
  margin: 0;
}

.detail-sub {
  font-size: var(--hh-text-sm);
  color: var(--hh-text-tertiary);
  margin: 2px 0 0;
}

/* Stats */
.detail-stats {
  display: flex;
  gap: var(--hh-space-6);
}

.detail-stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}

.detail-stat-value {
  font-size: var(--hh-text-2xl);
  font-weight: var(--hh-weight-bold);
  color: var(--hh-text);
}

.detail-stat-value--error {
  color: var(--hh-error);
}

.detail-stat-label {
  font-size: var(--hh-text-xs);
  color: var(--hh-text-tertiary);
}

/* Progress */
.detail-progress {
  padding: 0 var(--hh-space-4);
}

/* Add Item Form */
.add-item-form {
  display: flex;
  flex-direction: column;
  gap: var(--hh-space-2);
}

.add-item-extra {
  padding-top: var(--hh-space-2);
}

/* Filter Tabs */
.filter-tabs {
  display: flex;
  justify-content: center;
}

/* Items Section */
.items-section {
  display: flex;
  flex-direction: column;
  gap: var(--hh-space-3);
}

.section-title {
  display: flex;
  align-items: center;
  gap: var(--hh-space-2);
  font-size: var(--hh-text-sm);
  font-weight: var(--hh-weight-semibold);
  color: var(--hh-text);
  margin: 0;
}

.section-title--done {
  color: var(--hh-text-secondary);
}

.items-list {
  display: flex;
  flex-direction: column;
  gap: var(--hh-space-2);
}

.items-list--done {
  opacity: 0.7;
}

/* Item Row */
.item-row {
  display: flex;
  align-items: center;
  gap: var(--hh-space-3);
  padding: var(--hh-space-3);
  background: var(--hh-bg-card);
  border-radius: var(--hh-radius-md);
  border: 1px solid var(--hh-border-light);
  transition: all var(--hh-transition-fast) var(--hh-easing-default);
}

.item-row:hover {
  border-color: var(--hh-primary);
  box-shadow: var(--hh-shadow-sm);
}

.item-row--overdue {
  border-left: 3px solid var(--hh-error);
  background: #fef2f2;
}

.item-row--done {
  opacity: 0.6;
  background: var(--hh-bg-secondary);
}

.item-check {
  flex-shrink: 0;
}

.item-content {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.item-main {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.item-text {
  font-size: var(--hh-text-sm);
  font-weight: var(--hh-weight-medium);
  color: var(--hh-text);
}

.item-text--done {
  text-decoration: line-through;
  color: var(--hh-text-tertiary);
}

.item-tags {
  display: flex;
  gap: var(--hh-space-1);
  flex-wrap: wrap;
}

.item-done-info {
  font-size: var(--hh-text-xs);
  color: var(--hh-text-tertiary);
}

.item-actions {
  flex-shrink: 0;
  opacity: 0;
  transition: opacity var(--hh-transition-fast);
}

.item-row:hover .item-actions {
  opacity: 1;
}

/* Loading */
.loading-state {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 400px;
}

/* Responsive */
@media (max-width: 768px) {
  .detail-stats {
    gap: var(--hh-space-4);
  }

  .detail-stat-value {
    font-size: var(--hh-text-lg);
  }

  .item-row {
    padding: var(--hh-space-2);
  }
}
</style>
