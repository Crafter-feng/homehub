<template>
  <div class="budget-page">
    <n-page-header :title="t('budget.title')" :subtitle="t('budget.subtitle')">
      <template #extra>
        <n-space>
          <n-button size="small" @click="loadData" :loading="loading">
            <template #icon><n-icon><RefreshOutline /></n-icon></template>
            {{ t('common.refresh') }}
          </n-button>
          <n-button type="primary" size="small" @click="showCreateModal = true">
            <template #icon><n-icon><AddOutline /></n-icon></template>
            {{ t('budget.addEntry') }}
          </n-button>
        </n-space>
      </template>
    </n-page-header>

    <!-- 统计卡片 -->
    <div class="stats-grid" v-if="summary">
      <div class="stat-card stat-success hover-lift">
        <div class="stat-icon-wrap" style="background: var(--hh-success-light); color: var(--hh-success)">
          <n-icon :size="22"><TrendingUpOutline /></n-icon>
        </div>
        <div class="stat-body">
          <span class="stat-label">{{ t('budget.totalIncome') }}</span>
          <span class="stat-value">¥{{ summary.totalIncome.toFixed(2) }}</span>
        </div>
      </div>
      <div class="stat-card stat-danger hover-lift">
        <div class="stat-icon-wrap" style="background: var(--hh-error-light); color: var(--hh-error)">
          <n-icon :size="22"><TrendingDownOutline /></n-icon>
        </div>
        <div class="stat-body">
          <span class="stat-label">{{ t('budget.totalExpense') }}</span>
          <span class="stat-value">¥{{ summary.totalExpense.toFixed(2) }}</span>
        </div>
      </div>
      <div class="stat-card hover-lift" :class="summary.balance >= 0 ? 'stat-success' : 'stat-danger'">
        <div class="stat-icon-wrap" :style="{ background: summary.balance >= 0 ? 'var(--hh-success-light)' : 'var(--hh-error-light)', color: summary.balance >= 0 ? 'var(--hh-success)' : 'var(--hh-error)' }">
          <n-icon :size="22"><CashOutline /></n-icon>
        </div>
        <div class="stat-body">
          <span class="stat-label">{{ t('budget.balance') }}</span>
          <span class="stat-value">¥{{ summary.balance.toFixed(2) }}</span>
        </div>
      </div>
      <div class="stat-card stat-info hover-lift">
        <div class="stat-icon-wrap" style="background: var(--hh-info-light); color: var(--hh-info)">
          <n-icon :size="22"><RepeatOutline /></n-icon>
        </div>
        <div class="stat-body">
          <span class="stat-label">{{ t('budget.monthlySubscriptions') }}</span>
          <span class="stat-value">¥{{ (subscriptionCost?.monthlyTotal || 0).toFixed(0) }}</span>
        </div>
      </div>
    </div>

    <!-- 月度趋势 -->
    <div class="chart-section" v-if="summary?.monthlyTrend?.length">
      <h2 class="section-title">{{ t('budget.monthlyTrend') }}</h2>
      <div class="bar-chart dual-bar">
        <div class="bar-column" v-for="bar in summary.monthlyTrend" :key="bar.month">
          <div class="bar-wrap">
            <div class="bar-fill income" :style="{ height: getBarHeight(bar.income) + '%' }" :title="`${bar.month} 收入: ¥${bar.income}`"></div>
            <div class="bar-fill expense" :style="{ height: getBarHeight(bar.expense) + '%' }" :title="`${bar.month} 支出: ¥${bar.expense}`"></div>
          </div>
          <span class="bar-label">{{ bar.month.slice(5) }}</span>
        </div>
      </div>
      <div class="chart-legend">
        <span class="legend-item"><span class="legend-dot income"></span>{{ t('budget.income') }}</span>
        <span class="legend-item"><span class="legend-dot expense"></span>{{ t('budget.expense') }}</span>
      </div>
    </div>

    <!-- 分类统计 -->
    <div class="category-section" v-if="summary?.byCategory?.length">
      <h2 class="section-title">{{ t('budget.byCategory') }}</h2>
      <div class="category-grid">
        <div class="category-item" v-for="cat in summary.byCategory" :key="cat.category + cat.type">
          <span class="category-name">{{ cat.category }}</span>
          <n-tag :type="cat.type === 'income' ? 'success' : 'error'" size="small">
            {{ cat.type === 'income' ? t('budget.income') : t('budget.expense') }}
          </n-tag>
          <span class="category-total">¥{{ cat.total.toFixed(2) }}</span>
          <span class="category-count">{{ cat.count }}{{ t('budget.transactions') }}</span>
        </div>
      </div>
    </div>

    <!-- 最近条目 -->
    <div class="table-section">
      <div class="table-header">
        <h2 class="section-title">{{ t('budget.recentEntries') }}</h2>
        <n-space size="small">
          <n-select v-model:value="filterType" :options="typeOptions" :placeholder="t('common.all')" clearable size="small" style="width: 100px" />
        </n-space>
      </div>
      <n-data-table
        :columns="tableColumns"
        :data="filteredEntries"
        :bordered="false"
        :single-line="false"
        size="small"
        :loading="loading"
      />
      <n-empty v-if="!entries.length && !loading" :description="t('common.noData')" class="empty-state" />
    </div>

    <!-- 创建/编辑弹窗 -->
    <n-modal v-model:show="showCreateModal" preset="card" :title="editingId ? t('budget.editEntry') : t('budget.addEntry')" style="max-width: 500px">
      <n-form label-placement="left" label-width="80">
        <n-form-item :label="t('budget.type')">
          <n-radio-group v-model:value="form.type">
            <n-radio-button value="expense">{{ t('budget.expense') }}</n-radio-button>
            <n-radio-button value="income">{{ t('budget.income') }}</n-radio-button>
          </n-radio-group>
        </n-form-item>
        <n-form-item :label="t('budget.amount')">
          <n-input-number v-model:value="form.amount" :min="0" :precision="2" style="width: 100%">
            <template #prefix>¥</template>
          </n-input-number>
        </n-form-item>
        <n-form-item :label="t('budget.category')">
          <n-select v-model:value="form.category" :options="categoryOptions" />
        </n-form-item>
        <n-form-item :label="t('budget.description')">
          <n-input v-model:value="form.description" :placeholder="t('budget.descriptionPlaceholder')" />
        </n-form-item>
        <n-form-item :label="t('budget.date')">
          <n-date-picker v-model:value="form.date" type="date" style="width: 100%" />
        </n-form-item>
        <n-form-item :label="t('budget.notes')">
          <n-input v-model:value="form.notes" type="textarea" :rows="2" />
        </n-form-item>
      </n-form>
      <template #footer>
        <n-space justify="end">
          <n-button @click="closeModal">{{ t('common.cancel') }}</n-button>
          <n-button type="primary" @click="handleSubmit" :loading="submitting">
            {{ editingId ? t('common.update') : t('common.create') }}
          </n-button>
        </n-space>
      </template>
    </n-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, h } from 'vue';
import { NButton, NPopconfirm, useMessage } from 'naive-ui';
import { useI18n } from '@/locales';
import api from '@/api/client';
import {
  RefreshOutline,
  AddOutline,
  TrendingUpOutline,
  TrendingDownOutline,
  CashOutline,
  RepeatOutline,
  TrashOutline,
  CreateOutline,
} from '@vicons/ionicons5';

const { t } = useI18n();
const message = useMessage();

const loading = ref(false);
const submitting = ref(false);
const entries = ref<any[]>([]);
const summary = ref<any>(null);
const subscriptionCost = ref<any>(null);
const showCreateModal = ref(false);
const editingId = ref<number | null>(null);
const filterType = ref<string | null>(null);

const form = ref({
  type: 'expense' as 'income' | 'expense',
  amount: 0,
  category: '日常开支',
  description: '',
  date: Date.now(),
  notes: '',
});

const typeOptions = [
  { label: t('budget.income'), value: 'income' },
  { label: t('budget.expense'), value: 'expense' },
];

const categoryOptions = [
  { label: '餐饮', value: '餐饮' },
  { label: '交通', value: '交通' },
  { label: '购物', value: '购物' },
  { label: '居住', value: '居住' },
  { label: '娱乐', value: '娱乐' },
  { label: '医疗', value: '医疗' },
  { label: '教育', value: '教育' },
  { label: '日常开支', value: '日常开支' },
  { label: '工资', value: '工资' },
  { label: '奖金', value: '奖金' },
  { label: '投资', value: '投资' },
  { label: '其他', value: '其他' },
];

const tableColumns = [
  { title: t('budget.date'), key: 'date', width: 120, render: (row: any) => new Date(row.date).toLocaleDateString('zh-CN') },
  { title: t('budget.category'), key: 'category', width: 100 },
  { title: t('budget.description'), key: 'description', ellipsis: { tooltip: true } },
  {
    title: t('budget.amount'),
    key: 'amount',
    width: 120,
    render: (row: any) => h('span', {
      style: { color: row.type === 'income' ? 'var(--hh-success)' : 'var(--hh-error)', fontWeight: '600' },
    }, `${row.type === 'income' ? '+' : '-'}¥${row.amount.toFixed(2)}`),
  },
  {
    title: t('common.actions'),
    key: 'actions',
    width: 100,
    render: (row: any) => h('div', { style: 'display: flex; gap: 8px;' }, [
      h(NButton, { size: 'small', quaternary: true, onClick: () => editEntry(row) }, { icon: () => h(CreateOutline) }),
      h(NPopconfirm, { onPositiveClick: () => deleteEntry(row.id) }, {
        trigger: () => h(NButton, { size: 'small', quaternary: true, type: 'error' }, { icon: () => h(TrashOutline) }),
        default: () => t('common.confirmDelete'),
      }),
    ]),
  },
];

const filteredEntries = computed(() => {
  if (!filterType.value) return entries.value;
  return entries.value.filter(e => e.type === filterType.value);
});

function getBarHeight(value: number) {
  if (!summary.value) return 0;
  const max = Math.max(
    ...summary.value.monthlyTrend.map((m: any) => Math.max(m.income, m.expense)),
    1,
  );
  return (value / max) * 100;
}

function editEntry(entry: any) {
  editingId.value = entry.id;
  form.value = {
    type: entry.type,
    amount: entry.amount,
    category: entry.category,
    description: entry.description || '',
    date: new Date(entry.date).getTime(),
    notes: entry.notes || '',
  };
  showCreateModal.value = true;
}

function closeModal() {
  showCreateModal.value = false;
  editingId.value = null;
  form.value = { type: 'expense', amount: 0, category: '日常开支', description: '', date: Date.now(), notes: '' };
}

async function handleSubmit() {
  submitting.value = true;
  try {
    const payload = {
      ...form.value,
      date: form.value.date,
    };
    if (editingId.value) {
      await api.put(`/budget/entries/${editingId.value}`, payload);
      message.success(t('common.success'));
    } else {
      await api.post('/budget/entries', payload);
      message.success(t('common.success'));
    }
    closeModal();
    await loadData();
  } catch (e: any) {
    message.error(e.message || t('common.error'));
  } finally {
    submitting.value = false;
  }
}

async function deleteEntry(id: number) {
  try {
    await api.delete(`/budget/entries/${id}`);
    message.success(t('common.success'));
    await loadData();
  } catch {
    message.error(t('common.deleteFailed'));
  }
}

async function loadData() {
  loading.value = true;
  try {
    const [entriesRes, summaryRes, subCostRes] = await Promise.all([
      api.get('/budget/entries', { params: { limit: 100 } }),
      api.get('/budget/summary'),
      api.get('/budget/subscriptions/monthly-cost'),
    ]);
    entries.value = entriesRes.data.entries || [];
    summary.value = summaryRes.data;
    subscriptionCost.value = subCostRes.data;
  } catch {
    message.error(t('common.error'));
  } finally {
    loading.value = false;
  }
}

onMounted(loadData);
</script>

<style scoped>
.budget-page { padding: var(--hh-space-6); max-width: 1200px; margin: 0 auto; }
.stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: var(--hh-space-4); margin: var(--hh-space-6) 0; }
.stat-card { background: var(--hh-card-bg); border-radius: var(--hh-radius-lg); padding: var(--hh-space-5); display: flex; align-items: center; gap: var(--hh-space-4); border: 1px solid var(--hh-border-light); }
.stat-icon-wrap { width: 44px; height: 44px; border-radius: var(--hh-radius-md); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.stat-body { display: flex; flex-direction: column; gap: 2px; }
.stat-label { font-size: var(--hh-text-sm); color: var(--hh-text-secondary); }
.stat-value { font-size: var(--hh-text-xl); font-weight: var(--hh-weight-bold); }
.section-title { font-size: var(--hh-text-lg); font-weight: var(--hh-weight-semibold); margin-bottom: var(--hh-space-4); color: var(--hh-text-primary); }
.chart-section, .category-section, .table-section { background: var(--hh-card-bg); border-radius: var(--hh-radius-lg); padding: var(--hh-space-6); margin: var(--hh-space-4) 0; border: 1px solid var(--hh-border-light); }
.bar-chart { display: flex; gap: var(--hh-space-2); height: 180px; align-items: flex-end; }
.dual-bar .bar-column { flex: 1; display: flex; flex-direction: column; align-items: center; height: 100%; }
.dual-bar .bar-wrap { flex: 1; display: flex; gap: 2px; align-items: flex-end; width: 100%; }
.bar-fill { width: 48%; min-height: 2px; border-radius: 2px 2px 0 0; transition: height 0.3s ease; }
.bar-fill.income { background: var(--hh-success); }
.bar-fill.expense { background: var(--hh-error); }
.bar-label { font-size: 11px; color: var(--hh-text-tertiary); margin-top: var(--hh-space-1); }
.chart-legend { display: flex; gap: var(--hh-space-4); justify-content: center; margin-top: var(--hh-space-3); }
.legend-item { display: flex; align-items: center; gap: 6px; font-size: var(--hh-text-sm); color: var(--hh-text-secondary); }
.legend-dot { width: 10px; height: 10px; border-radius: 50%; }
.legend-dot.income { background: var(--hh-success); }
.legend-dot.expense { background: var(--hh-error); }
.category-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: var(--hh-space-3); }
.category-item { display: flex; align-items: center; gap: var(--hh-space-3); padding: var(--hh-space-3); background: var(--hh-bg-tertiary); border-radius: var(--hh-radius-md); }
.category-name { font-weight: var(--hh-weight-medium); flex: 1; }
.category-total { font-weight: var(--hh-weight-bold); font-size: var(--hh-text-sm); }
.category-count { font-size: var(--hh-text-xs); color: var(--hh-text-tertiary); }
.table-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--hh-space-4); }
.empty-state { padding: var(--hh-space-10) 0; }
@media (max-width: 768px) { .stats-grid { grid-template-columns: repeat(2, 1fr); } }
</style>
