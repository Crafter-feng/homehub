<template>
  <div class="todo-widget">
    <div class="widget-header">
      <h3 class="widget-title">{{ t('dashboard.todoWidget.title') }}</h3>
      <n-button text size="small" @click="$router.push('/lists')">{{ t('dashboard.todoWidget.viewAll') }}</n-button>
    </div>

    <div v-if="loading" class="widget-loading">
      <n-spin size="small" />
    </div>

    <div v-else-if="data?.total === 0" class="widget-empty">
      <n-icon :size="28" color="var(--hh-success)"><CheckmarkCircleOutline /></n-icon>
      <span>{{ t('dashboard.todoWidget.allDone') }}</span>
    </div>

    <template v-else>
      <!-- 逾期 -->
      <div v-if="data?.overdue?.length" class="todo-section">
        <div class="section-label overdue">
          <n-icon :size="14"><WarningOutline /></n-icon>
          {{ t('dashboard.todoWidget.overdue') }} ({{ data.overdue.length }})
        </div>
        <div class="todo-item" v-for="item in data.overdue" :key="item.id">
          <n-checkbox :checked="false" @update:checked="completeItem(item)" />
          <div class="todo-content">
            <span class="todo-text">{{ item.content }}</span>
            <span class="todo-meta">
              <n-tag size="tiny" type="warning">{{ item.listName }}</n-tag>
              <span class="todo-due overdue">{{ formatDate(item.dueAt) }}</span>
            </span>
          </div>
        </div>
      </div>

      <!-- 今日 -->
      <div v-if="data?.today?.length" class="todo-section">
        <div class="section-label today">
          <n-icon :size="14"><TimeOutline /></n-icon>
          {{ t('dashboard.todoWidget.today') }} ({{ data.today.length }})
        </div>
        <div class="todo-item" v-for="item in data.today" :key="item.id">
          <n-checkbox :checked="false" @update:checked="completeItem(item)" />
          <div class="todo-content">
            <span class="todo-text">{{ item.content }}</span>
            <span class="todo-meta">
              <n-tag size="tiny" type="info">{{ item.listName }}</n-tag>
            </span>
          </div>
        </div>
      </div>

      <!-- 即将到来 (最多5条) -->
      <div v-if="data?.upcoming?.length" class="todo-section">
        <div class="section-label upcoming">
          <n-icon :size="14"><CalendarOutline /></n-icon>
          {{ t('dashboard.todoWidget.upcoming') }} ({{ data.upcoming.length }})
        </div>
        <div class="todo-item" v-for="item in data.upcoming.slice(0, 5)" :key="item.id">
          <n-checkbox :checked="false" @update:checked="completeItem(item)" />
          <div class="todo-content">
            <span class="todo-text">{{ item.content }}</span>
            <span class="todo-meta">
              <n-tag size="tiny">{{ item.listName }}</n-tag>
              <span v-if="item.dueAt" class="todo-due">{{ formatDate(item.dueAt) }}</span>
            </span>
          </div>
        </div>
        <div v-if="data.upcoming.length > 5" class="todo-more">
          +{{ data.upcoming.length - 5 }} {{ t('dashboard.todoWidget.more') }}
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { NButton, NCheckbox, NTag, NIcon, NSpin, useMessage } from 'naive-ui';
import { useI18n } from '@/locales';
import { listsApi } from '@/api/client';
import {
  CheckmarkCircleOutline,
  WarningOutline,
  TimeOutline,
  CalendarOutline,
} from '@vicons/ionicons5';

const { t } = useI18n();
const message = useMessage();
const loading = ref(true);
const data = ref<any>(null);

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  const now = new Date();
  const diff = d.getTime() - now.getTime();
  const days = Math.ceil(diff / 86400000);
  if (days < 0) return `${Math.abs(days)}d ago`;
  if (days === 0) return 'Today';
  if (days === 1) return 'Tomorrow';
  return d.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
}

async function completeItem(item: any) {
  try {
    await listsApi.checkItem(item.id);
    await loadData();
  } catch {
    message.error(t('common.error'));
  }
}

async function loadData() {
  loading.value = true;
  try {
    const { data: result } = await listsApi.getPendingTodos();
    data.value = result;
  } catch {
    // silent
  } finally {
    loading.value = false;
  }
}

onMounted(loadData);

defineExpose({ loadData });
</script>

<style scoped>
.todo-widget {
  background: var(--hh-card-bg);
  border-radius: var(--hh-radius-lg);
  border: 1px solid var(--hh-border-light);
  padding: var(--hh-space-5);
}
.widget-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--hh-space-4);
}
.widget-title {
  font-size: var(--hh-text-base);
  font-weight: var(--hh-weight-semibold);
  margin: 0;
}
.widget-loading {
  display: flex;
  justify-content: center;
  padding: var(--hh-space-8);
}
.widget-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--hh-space-2);
  padding: var(--hh-space-8);
  color: var(--hh-text-secondary);
  font-size: var(--hh-text-sm);
}
.todo-section {
  margin-bottom: var(--hh-space-4);
}
.section-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: var(--hh-text-xs);
  font-weight: var(--hh-weight-semibold);
  text-transform: uppercase;
  letter-spacing: 0.03em;
  margin-bottom: var(--hh-space-2);
  padding-bottom: var(--hh-space-2);
  border-bottom: 1px solid var(--hh-border-light);
}
.section-label.overdue { color: var(--hh-error); }
.section-label.today { color: var(--hh-info); }
.section-label.upcoming { color: var(--hh-text-tertiary); }
.todo-item {
  display: flex;
  align-items: flex-start;
  gap: var(--hh-space-3);
  padding: var(--hh-space-2) 0;
}
.todo-content {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1;
  min-width: 0;
}
.todo-text {
  font-size: var(--hh-text-sm);
  font-weight: var(--hh-weight-medium);
  line-height: 1.4;
}
.todo-meta {
  display: flex;
  align-items: center;
  gap: var(--hh-space-2);
}
.todo-due {
  font-size: var(--hh-text-xs);
  color: var(--hh-text-tertiary);
}
.todo-due.overdue {
  color: var(--hh-error);
  font-weight: var(--hh-weight-semibold);
}
.todo-more {
  text-align: center;
  font-size: var(--hh-text-xs);
  color: var(--hh-text-tertiary);
  padding: var(--hh-space-2) 0;
}
</style>
