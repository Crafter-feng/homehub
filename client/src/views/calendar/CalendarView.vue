<template>
  <div class="calendar-page">
    <n-page-header :title="t('calendar.title')" :subtitle="t('calendar.subtitle')">
      <template #extra>
        <n-space align="center">
          <n-space :size="4">
            <n-tag
              v-for="filter in eventFilters"
              :key="filter.key"
              :type="filter.active ? filter.tagType : 'default'"
              size="small"
              round
              checkable
              :checked="filter.active"
              @update:checked="filter.active = !filter.active"
            >
              <template #icon>
                <n-icon :size="12"><component :is="filter.icon" /></n-icon>
              </template>
              {{ filter.label }}
            </n-tag>
          </n-space>
          <n-button size="small" type="primary" @click="openCreateModal">
            <template #icon><n-icon><AddOutline /></n-icon></template>
            {{ t('calendar.newEvent') }}
          </n-button>
        </n-space>
      </template>
    </n-page-header>

    <!-- Toolbar -->
    <div class="calendar-toolbar page-section">
      <div class="toolbar-left">
        <n-button-group size="small">
          <n-button :type="viewMode === 'month' ? 'primary' : 'default'" @click="viewMode = 'month'">
            {{ t('calendar.month') }}
          </n-button>
          <n-button :type="viewMode === 'week' ? 'primary' : 'default'" @click="viewMode = 'week'">
            {{ t('calendar.week') }}
          </n-button>
          <n-button :type="viewMode === 'list' ? 'primary' : 'default'" @click="viewMode = 'list'">
            {{ t('common.list') }}
          </n-button>
        </n-button-group>
        <n-button quaternary circle size="small" @click="changePeriod(-1)">
          <template #icon><n-icon><ChevronBackOutline /></n-icon></template>
        </n-button>
        <span class="current-period-label">{{ currentPeriodLabel }}</span>
        <n-button quaternary circle size="small" @click="changePeriod(1)">
          <template #icon><n-icon><ChevronForwardOutline /></n-icon></template>
        </n-button>
      </div>
      <n-button size="small" quaternary @click="goToToday">{{ t('calendar.today') }}</n-button>
    </div>

    <!-- Month View -->
    <div v-if="viewMode === 'month'" class="calendar-content page-section">
      <div class="calendar-grid">
        <div class="weekday-row">
          <div class="weekday-cell" v-for="day in weekdays" :key="day">{{ day }}</div>
        </div>
        <div class="date-row" v-for="(week, wi) in calendarWeeks" :key="wi">
          <div
            v-for="date in week"
            :key="date.key"
            class="date-cell"
            :class="{
              'date-cell--other-month': !date.isCurrentMonth,
              'date-cell--today': date.isToday,
              'date-cell--selected': date.isSelected,
              'date-cell--has-events': date.events.length > 0,
            }"
            @click="selectDate(date)"
          >
            <span class="date-number">{{ date.day }}</span>
            <div class="event-dots" v-if="date.events.length > 0">
              <span
                v-for="evt in date.events.slice(0, 4)"
                :key="evt.id"
                class="event-dot"
                :style="{ background: getEventColor(evt.source) }"
              ></span>
              <span v-if="date.events.length > 4" class="event-more">+{{ date.events.length - 4 }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Selected Date Events -->
      <div class="selected-date-panel">
        <div class="panel-header">
          <h3 class="panel-title">{{ selectedDateLabel }}</h3>
          <span class="panel-count">{{ selectedDateEvents.length }} {{ t('common.item') }}</span>
        </div>
        <n-spin :show="loading">
          <div v-if="selectedDateEvents.length > 0" class="event-list">
            <div
              v-for="evt in selectedDateEvents"
              :key="evt.id"
              class="event-card"
              :class="`event-card--${evt.source}`"
              @click="openEventDetail(evt)"
            >
              <div class="event-icon-wrap" :style="{ background: getEventBg(evt.source), color: getEventColor(evt.source) }">
                <n-icon :size="18">
                  <component :is="getEventIcon(evt.source)" />
                </n-icon>
              </div>
              <div class="event-body">
                <span class="event-name">{{ evt.name }}</span>
                <div class="event-meta">
                  <span class="event-type-badge" :style="{ color: getEventColor(evt.source) }">
                    {{ getEventLabel(evt.source) }}
                  </span>
                  <span v-if="evt.time" class="event-time">{{ evt.time }}</span>
                  <span v-if="evt.quantity" class="event-quantity">{{ evt.quantity }} {{ evt.unit || '' }}</span>
                  <span v-if="evt.location" class="event-location">{{ evt.location }}</span>
                </div>
                <span v-if="evt.source === 'expiry'" class="event-status" :class="evt.isExpired ? 'status-expired' : 'status-warning'">
                  {{ evt.isExpired ? t('calendar.expired') : t('calendar.upcomingExpiry') }}
                </span>
                <span v-if="evt.source === 'todo'" class="event-status" :class="getTodoStatusClass(evt)">
                  {{ getTodoLabel(evt) }}
                </span>
              </div>
              <n-icon v-if="evt.source === 'custom'" :size="16" class="event-arrow"><ChevronForwardOutline /></n-icon>
            </div>
          </div>
          <n-empty v-else :description="t('calendar.noEvents')" size="small" />
        </n-spin>
      </div>
    </div>

    <!-- Week View -->
    <div v-if="viewMode === 'week'" class="week-view page-section">
      <div class="week-header">
        <div class="week-day-header" v-for="day in weekDays" :key="day.key"
          :class="{ 'week-day--today': day.isToday, 'week-day--selected': day.key === formatDate(selectedDate) }"
          @click="selectedDate = new Date(day.date)"
        >
          <span class="week-day-name">{{ day.name }}</span>
          <span class="week-day-num" :class="{ 'today-num': day.isToday }">{{ day.day }}</span>
        </div>
      </div>
      <div class="week-body">
        <div class="week-day-col" v-for="day in weekDays" :key="day.key">
          <div
            v-for="evt in day.events"
            :key="evt.id"
            class="week-event-chip"
            :style="{ borderLeftColor: getEventColor(evt.source) }"
            @click="openEventDetail(evt)"
          >
            <span class="week-event-name">{{ evt.name }}</span>
            <span v-if="evt.time" class="week-event-time">{{ evt.time }}</span>
          </div>
          <div v-if="day.events.length === 0" class="week-empty-day"></div>
        </div>
      </div>
    </div>

    <!-- List View -->
    <div v-if="viewMode === 'list'" class="list-view-content page-section">
      <div class="event-timeline">
        <div v-for="group in groupedEvents" :key="group.dateKey" class="timeline-group">
          <div class="timeline-group-header">
            <span class="timeline-date-label">{{ group.dateLabel }}</span>
            <span class="timeline-date-count">{{ group.events.length }}</span>
          </div>
          <div class="event-list">
            <div
              v-for="evt in group.events"
              :key="evt.id"
              class="event-card"
              :class="`event-card--${evt.source}`"
              @click="openEventDetail(evt)"
            >
              <div class="event-icon-wrap" :style="{ background: getEventBg(evt.source), color: getEventColor(evt.source) }">
                <n-icon :size="18">
                  <component :is="getEventIcon(evt.source)" />
                </n-icon>
              </div>
              <div class="event-body">
                <span class="event-name">{{ evt.name }}</span>
                <div class="event-meta">
                  <span class="event-type-badge" :style="{ color: getEventColor(evt.source) }">
                    {{ getEventLabel(evt.source) }}
                  </span>
                  <span v-if="evt.time" class="event-time">{{ evt.time }}</span>
                </div>
              </div>
              <n-icon :size="16" class="event-arrow"><ChevronForwardOutline /></n-icon>
            </div>
          </div>
        </div>
        <n-empty v-if="filteredEvents.length === 0 && !loading" :description="t('calendar.noEvents')" />
      </div>
    </div>

    <!-- Event Detail Modal -->
    <n-modal v-model:show="showDetailModal" preset="card" :title="detailEvent?.name" style="max-width: 480px">
      <template v-if="detailEvent">
        <n-space vertical :size="16">
          <div class="detail-row">
            <span class="detail-label">{{ t('calendar.eventType') }}</span>
            <n-tag :type="getEventTagType(detailEvent.source)" size="small">
              {{ getEventLabel(detailEvent.source) }}
            </n-tag>
          </div>
          <div class="detail-row">
            <span class="detail-label">{{ t('calendar.expiryDate') }}</span>
            <span>{{ detailEvent.date }}</span>
          </div>
          <div v-if="detailEvent.time" class="detail-row">
            <span class="detail-label">{{ t('calendar.time') }}</span>
            <span>{{ detailEvent.time }}</span>
          </div>
          <div v-if="detailEvent.quantity" class="detail-row">
            <span class="detail-label">{{ t('calendar.quantity') }}</span>
            <span>{{ detailEvent.quantity }} {{ detailEvent.unit || '' }}</span>
          </div>
          <div v-if="detailEvent.location" class="detail-row">
            <span class="detail-label">{{ t('calendar.location') }}</span>
            <span>{{ detailEvent.location }}</span>
          </div>
          <n-space v-if="detailEvent.source === 'custom'" justify="end">
            <n-button size="small" @click="openEditModal(detailEvent)">
              {{ t('common.edit') }}
            </n-button>
            <n-popconfirm @positive-click="deleteEvent(detailEvent)">
              <template #trigger>
                <n-button size="small" type="error" ghost>{{ t('common.delete') }}</n-button>
              </template>
              确定删除此事件？
            </n-popconfirm>
          </n-space>
          <n-space v-if="detailEvent.itemId" justify="end">
            <n-button size="small" type="primary" @click="goToItem(detailEvent)">
              {{ t('calendar.viewItem') }}
            </n-button>
          </n-space>
        </n-space>
      </template>
    </n-modal>

    <!-- Create/Edit Event Modal -->
    <n-modal v-model:show="showEventModal" preset="card" :title="editingEvent ? '编辑事件' : t('calendar.newEvent')" style="max-width: 520px">
      <n-form ref="eventFormRef" :model="eventForm" :rules="eventFormRules" label-placement="left" label-width="auto">
        <n-form-item :label="t('calendar.eventName')" path="title">
          <n-input v-model:value="eventForm.title" :placeholder="t('calendar.eventName')" />
        </n-form-item>
        <n-form-item label="日期" path="date">
          <n-input v-model:value="eventForm.date" placeholder="YYYY-MM-DD" />
        </n-form-item>
        <n-form-item label="时间">
          <n-space>
            <n-checkbox v-model:checked="eventForm.allDay">全天</n-checkbox>
            <n-time-picker v-if="!eventForm.allDay" v-model:value="eventForm.timeValue" format="HH:mm" style="width: 120px" />
          </n-space>
        </n-form-item>
        <n-form-item label="类型">
          <n-select v-model:value="eventForm.category" :options="categoryOptions" />
        </n-form-item>
        <n-form-item label="颜色">
          <n-space>
            <div
              v-for="color in colorOptions"
              :key="color"
              class="color-dot"
              :class="{ 'color-dot--active': eventForm.color === color }"
              :style="{ background: color }"
              @click="eventForm.color = color"
            ></div>
          </n-space>
        </n-form-item>
        <n-form-item label="备注">
          <n-input v-model:value="eventForm.description" type="textarea" :rows="2" placeholder="可选备注" />
        </n-form-item>
      </n-form>
      <template #footer>
        <n-space justify="end">
          <n-button @click="showEventModal = false">取消</n-button>
          <n-button type="primary" :loading="saving" @click="saveEvent">
            {{ editingEvent ? '保存' : '创建' }}
          </n-button>
        </n-space>
      </template>
    </n-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import {
  NPageHeader, NSpace, NButton, NButtonGroup, NIcon, NSpin, NEmpty,
  NTag, NModal, NForm, NFormItem, NInput, NSelect, NCheckbox, NTimePicker,
  NPopconfirm, useMessage,
} from 'naive-ui';
import type { Component } from 'vue';
import { useRouter } from 'vue-router';
import {
  ChevronBackOutline, ChevronForwardOutline, AddOutline,
  AlertCircleOutline, CartOutline, ListOutline,
  CalendarOutline, TimeOutline,
} from '@vicons/ionicons5';
import { useI18n } from '@/locales';
import { stockApi, listsApi, mealPlansApi, calendarEventsApi, type CalendarEventData } from '@/api/client';

const router = useRouter();
const { t } = useI18n();
const message = useMessage();

interface CalendarEvent {
  id: string;
  source: 'expiry' | 'purchase' | 'todo' | 'meal' | 'custom';
  name: string;
  date: string;
  time?: string;
  quantity?: number;
  unit?: string;
  location?: string;
  isExpired?: boolean;
  itemId?: number;
  listId?: number;
  recipeId?: number;
  category?: string;
  color?: string;
  description?: string;
  rawId?: number;
}

interface DateCell {
  key: string;
  day: number;
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  isSelected: boolean;
  events: CalendarEvent[];
}

const loading = ref(false);
const saving = ref(false);
const viewMode = ref<'month' | 'week' | 'list'>('month');
const currentMonth = ref(new Date());
const selectedDate = ref(new Date());
const allEvents = ref<CalendarEvent[]>([]);
const showDetailModal = ref(false);
const detailEvent = ref<CalendarEvent | null>(null);
const showEventModal = ref(false);
const editingEvent = ref<CalendarEvent | null>(null);
const eventFormRef = ref();

const eventForm = ref({
  title: '',
  date: '',
  timeValue: 0,
  allDay: true,
  category: 'custom' as string,
  color: '#3b82f6',
  description: '',
});

const eventFormRules = {
  title: { required: true, message: '请输入事件名称', trigger: 'blur' },
  date: { required: true, message: '请输入日期', trigger: 'blur' },
};

const categoryOptions = [
  { label: '自定义', value: 'custom' },
  { label: '提醒', value: 'reminder' },
  { label: '生日', value: 'birthday' },
  { label: '预约', value: 'appointment' },
  { label: '家务', value: 'chore' },
];

const colorOptions = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];

const eventFilters = ref([
  { key: 'expiry', label: '过期', active: true, tagType: 'error' as const, icon: AlertCircleOutline },
  { key: 'purchase', label: '采购', active: true, tagType: 'success' as const, icon: CartOutline },
  { key: 'todo', label: '待办', active: true, tagType: 'warning' as const, icon: ListOutline },
  { key: 'meal', label: '餐食', active: true, tagType: 'info' as const, icon: CalendarOutline },
  { key: 'custom', label: '自定义', active: true, tagType: 'default' as const, icon: TimeOutline },
]);

const weekdays = computed(() => [
  t('common.days.mon'), t('common.days.tue'), t('common.days.wed'),
  t('common.days.thu'), t('common.days.fri'), t('common.days.sat'), t('common.days.sun'),
]);

const currentPeriodLabel = computed(() => {
  const y = currentMonth.value.getFullYear();
  const m = currentMonth.value.getMonth() + 1;
  if (viewMode.value === 'week') {
    const start = getWeekStart(currentMonth.value);
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    return `${formatDate(start)} ~ ${formatDate(end)}`;
  }
  return `${y} ${t('calendar.month')} ${m}`;
});

const selectedDateLabel = computed(() => {
  const d = selectedDate.value;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
});

const filteredEvents = computed(() => {
  const activeFilters = new Set(eventFilters.value.filter(f => f.active).map(f => f.key));
  return allEvents.value.filter(e => activeFilters.has(e.source));
});

const selectedDateEvents = computed(() => {
  const dateStr = formatDate(selectedDate.value);
  return filteredEvents.value.filter(e => e.date === dateStr);
});

const weekDays = computed(() => {
  const start = getWeekStart(currentMonth.value);
  const today = formatDate(new Date());
  const result = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    const dateStr = formatDate(d);
    result.push({
      key: dateStr,
      name: weekdays.value[i],
      day: d.getDate(),
      date: d,
      isToday: dateStr === today,
      events: filteredEvents.value.filter(e => e.date === dateStr),
    });
  }
  return result;
});

const calendarWeeks = computed((): DateCell[][] => {
  const year = currentMonth.value.getFullYear();
  const month = currentMonth.value.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startDayOfWeek = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1;
  const daysInMonth = lastDay.getDate();
  const prevMonthLastDay = new Date(year, month, 0).getDate();

  const cells: DateCell[] = [];
  const today = new Date();
  const todayStr = formatDate(today);

  for (let i = startDayOfWeek - 1; i >= 0; i--) {
    const date = new Date(year, month - 1, prevMonthLastDay - i);
    cells.push(makeDateCell(date, false, todayStr));
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, month, d);
    cells.push(makeDateCell(date, true, todayStr));
  }
  const remaining = 42 - cells.length;
  for (let d = 1; d <= remaining; d++) {
    const date = new Date(year, month + 1, d);
    cells.push(makeDateCell(date, false, todayStr));
  }

  const weeks: DateCell[][] = [];
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7));
  }
  return weeks;
});

const groupedEvents = computed(() => {
  const sorted = [...filteredEvents.value].sort((a, b) => a.date.localeCompare(b.date));
  const groups: { dateKey: string; dateLabel: string; events: CalendarEvent[] }[] = [];
  for (const evt of sorted) {
    let group = groups.find(g => g.dateKey === evt.date);
    if (!group) {
      group = { dateKey: evt.date, dateLabel: evt.date, events: [] };
      groups.push(group);
    }
    group.events.push(evt);
  }
  return groups;
});

function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  return d;
}

function makeDateCell(date: Date, isCurrentMonth: boolean, todayStr: string): DateCell {
  const dateStr = formatDate(date);
  return {
    key: dateStr,
    day: date.getDate(),
    date: new Date(date),
    isCurrentMonth,
    isToday: dateStr === todayStr,
    isSelected: dateStr === formatDate(selectedDate.value),
    events: filteredEvents.value.filter(e => e.date === dateStr),
  };
}

function formatDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function changePeriod(delta: number) {
  if (viewMode.value === 'week') {
    const newDate = new Date(currentMonth.value);
    newDate.setDate(newDate.getDate() + delta * 7);
    currentMonth.value = newDate;
  } else {
    currentMonth.value = new Date(
      currentMonth.value.getFullYear(),
      currentMonth.value.getMonth() + delta,
      1,
    );
  }
}

function goToToday() {
  const today = new Date();
  selectedDate.value = today;
  currentMonth.value = new Date(today.getFullYear(), today.getMonth(), 1);
}

function selectDate(cell: DateCell) {
  selectedDate.value = new Date(cell.date);
}

function openEventDetail(evt: CalendarEvent) {
  detailEvent.value = evt;
  showDetailModal.value = true;
}

function goToItem(evt: CalendarEvent) {
  if (evt.itemId) router.push(`/stock/${evt.itemId}`);
  else if (evt.listId) router.push(`/lists/${evt.listId}`);
  else if (evt.recipeId) router.push(`/recipes/${evt.recipeId}`);
  showDetailModal.value = false;
}

function openCreateModal() {
  editingEvent.value = null;
  eventForm.value = {
    title: '',
    date: formatDate(selectedDate.value),
    timeValue: 0,
    allDay: true,
    category: 'custom',
    color: '#3b82f6',
    description: '',
  };
  showEventModal.value = true;
}

function openEditModal(evt: CalendarEvent) {
  if (evt.source !== 'custom' || !evt.rawId) return;
  editingEvent.value = evt;
  eventForm.value = {
    title: evt.name,
    date: evt.date,
    timeValue: 0,
    allDay: !evt.time,
    category: evt.category || 'custom',
    color: evt.color || '#3b82f6',
    description: evt.description || '',
  };
  showDetailModal.value = false;
  showEventModal.value = true;
}

async function saveEvent() {
  saving.value = true;
  try {
    const data: CalendarEventData = {
      title: eventForm.value.title,
      date: eventForm.value.date,
      allDay: eventForm.value.allDay,
      category: eventForm.value.category as any,
      color: eventForm.value.color,
      description: eventForm.value.description || undefined,
    };
    if (editingEvent.value?.rawId) {
      await calendarEventsApi.update(editingEvent.value.rawId, data);
      message.success('事件已更新');
    } else {
      await calendarEventsApi.create(data);
      message.success('事件已创建');
    }
    showEventModal.value = false;
    await loadEvents();
  } catch {
    message.error('操作失败');
  } finally {
    saving.value = false;
  }
}

async function deleteEvent(evt: CalendarEvent) {
  if (!evt.rawId) return;
  try {
    await calendarEventsApi.delete(evt.rawId);
    message.success('事件已删除');
    showDetailModal.value = false;
    await loadEvents();
  } catch {
    message.error('删除失败');
  }
}

function getEventColor(source: string): string {
  const colors: Record<string, string> = {
    expiry: 'var(--hh-error)',
    purchase: 'var(--hh-primary)',
    todo: 'var(--hh-warning)',
    meal: 'var(--hh-info)',
    custom: '#3b82f6',
  };
  return colors[source] || 'var(--hh-info)';
}

function getEventBg(source: string): string {
  const bgs: Record<string, string> = {
    expiry: 'var(--hh-error-light)',
    purchase: 'var(--hh-primary-light)',
    todo: 'var(--hh-warning-light)',
    meal: 'var(--hh-info-light)',
    custom: '#eff6ff',
  };
  return bgs[source] || 'var(--hh-bg-secondary)';
}

function getEventIcon(source: string): Component {
  const icons: Record<string, Component> = {
    expiry: AlertCircleOutline,
    purchase: CartOutline,
    todo: ListOutline,
    meal: CalendarOutline,
    custom: TimeOutline,
  };
  return icons[source] || AlertCircleOutline;
}

function getEventLabel(source: string): string {
  const labels: Record<string, string> = {
    expiry: '过期',
    purchase: '采购',
    todo: '待办',
    meal: '餐食',
    custom: '自定义',
  };
  return labels[source] || source;
}

function getEventTagType(source: string): 'error' | 'success' | 'warning' | 'info' | 'default' {
  const types: Record<string, 'error' | 'success' | 'warning' | 'info' | 'default'> = {
    expiry: 'error',
    purchase: 'success',
    todo: 'warning',
    meal: 'info',
    custom: 'default',
  };
  return types[source] || 'default';
}

function getTodoStatusClass(evt: CalendarEvent): string {
  if (evt.isExpired) return 'status-expired';
  return 'status-warning';
}

function getTodoLabel(evt: CalendarEvent): string {
  if (evt.isExpired) return '已逾期';
  return '待完成';
}

async function loadEvents() {
  loading.value = true;
  try {
    const year = currentMonth.value.getFullYear();
    const month = currentMonth.value.getMonth();
    const startDate = `${year}-${String(month + 1).padStart(2, '0')}-01`;
    const endDate = `${year}-${String(month + 2).padStart(2, '0')}-01`;

    const [stockRes, expiringRes, todosRes, mealRes, customRes] = await Promise.all([
      stockApi.list().catch(() => ({ data: [] })),
      stockApi.getExpiring(90).catch(() => ({ data: [] })),
      listsApi.getPendingTodos().catch(() => ({ data: { overdue: [], today: [], upcoming: [] } })),
      mealPlansApi.list().catch(() => ({ data: [] })),
      calendarEventsApi.list(startDate, endDate).catch(() => ({ data: [] })),
    ]);

    const items = stockRes.data || [];
    const expiring = expiringRes.data || [];
    const todos = todosRes.data || { overdue: [], today: [], upcoming: [] };
    const meals = mealRes.data || [];
    const customEvents = customRes.data || [];

    const events: CalendarEvent[] = [];

    // Expiry events
    const seenExpiry = new Set<string>();
    for (const item of [...items, ...expiring]) {
      if (item.expiryDate) {
        const dateStr = formatDate(new Date(item.expiryDate));
        const key = `expiry-${item.id}-${dateStr}`;
        if (seenExpiry.has(key)) continue;
        seenExpiry.add(key);
        events.push({
          id: key,
          source: 'expiry',
          name: item.name,
          date: dateStr,
          quantity: item.quantity,
          unit: item.unit,
          location: item.locationName || '',
          isExpired: new Date(item.expiryDate) < new Date(),
          itemId: item.id,
        });
      }
      if (item.purchaseDate) {
        events.push({
          id: `purchase-${item.id}`,
          source: 'purchase',
          name: item.name,
          date: formatDate(new Date(item.purchaseDate)),
          quantity: item.quantity,
          unit: item.unit,
          itemId: item.id,
        });
      }
    }

    // Todo events
    const allTodos = [...(todos.overdue || []), ...(todos.today || []), ...(todos.upcoming || [])];
    for (const todo of allTodos) {
      if (todo.dueAt) {
        const dueDate = new Date(todo.dueAt);
        events.push({
          id: `todo-${todo.id}`,
          source: 'todo',
          name: todo.content,
          date: formatDate(dueDate),
          time: `${String(dueDate.getHours()).padStart(2, '0')}:${String(dueDate.getMinutes()).padStart(2, '0')}`,
          listId: todo.listId,
          isExpired: dueDate < new Date(),
        });
      }
    }

    // Meal plan events
    for (const plan of meals) {
      if (!plan.items) continue;
      const weekStart = new Date(plan.weekStart);
      for (const item of plan.items) {
        const eventDate = new Date(weekStart);
        eventDate.setDate(eventDate.getDate() + (item.dayOfWeek || 0));
        const dateStr = formatDate(eventDate);
        const mealLabels: Record<string, string> = { breakfast: '早餐', lunch: '午餐', dinner: '晚餐', snack: '加餐' };
        events.push({
          id: `meal-${plan.id}-${item.id}`,
          source: 'meal',
          name: `${mealLabels[item.mealType] || item.mealType} - ${item.recipe?.name || '未命名'}`,
          date: dateStr,
          recipeId: item.recipeId,
        });
      }
    }

    // Custom events
    for (const evt of customEvents) {
      events.push({
        id: `custom-${evt.id}`,
        source: 'custom',
        name: evt.title,
        date: evt.date,
        time: evt.allDay ? undefined : '全天',
        category: evt.category,
        color: evt.color,
        description: evt.description,
        rawId: evt.id,
      });
    }

    allEvents.value = events;
  } catch (e) {
    console.error('Failed to load calendar events');
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  loadEvents();
});

watch(currentMonth, () => {
  loadEvents();
});
</script>

<style scoped>
.calendar-page {
  max-width: 1400px;
  margin: 0 auto;
}

.calendar-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.toolbar-left {
  display: flex;
  align-items: center;
  gap: var(--hh-space-3);
}

.current-period-label {
  font-size: var(--hh-text-lg);
  font-weight: var(--hh-weight-semibold);
  color: var(--hh-text);
  min-width: 180px;
  text-align: center;
}

.calendar-content {
  display: grid;
  grid-template-columns: 1fr 360px;
  gap: var(--hh-space-4);
}

.calendar-grid {
  grid-column: 1;
  background: var(--hh-bg-card);
  border-radius: var(--hh-radius);
  border: 1px solid var(--hh-border-light);
  box-shadow: var(--hh-shadow-sm);
  overflow: hidden;
}

.weekday-row {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  border-bottom: 1px solid var(--hh-border-light);
}

.weekday-cell {
  padding: var(--hh-space-2) var(--hh-space-1);
  text-align: center;
  font-size: var(--hh-text-xs);
  font-weight: var(--hh-weight-semibold);
  color: var(--hh-text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.date-row {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  border-bottom: 1px solid var(--hh-border-light);
}

.date-row:last-child {
  border-bottom: none;
}

.date-cell {
  min-height: 80px;
  padding: var(--hh-space-2);
  display: flex;
  flex-direction: column;
  gap: var(--hh-space-1);
  cursor: pointer;
  transition: background var(--hh-transition-fast) var(--hh-easing-default);
  border-right: 1px solid var(--hh-border-light);
}

.date-cell:last-child {
  border-right: none;
}

.date-cell:hover {
  background: var(--hh-bg-secondary);
}

.date-cell--other-month {
  opacity: 0.4;
}

.date-cell--today .date-number {
  background: var(--hh-primary);
  color: white;
  border-radius: 50%;
  width: 26px;
  height: 26px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: var(--hh-weight-bold);
}

.date-cell--selected {
  background: var(--hh-primary-light);
}

.date-number {
  font-size: var(--hh-text-sm);
  font-weight: var(--hh-weight-medium);
  color: var(--hh-text);
  line-height: 1;
}

.event-dots {
  display: flex;
  align-items: center;
  gap: 3px;
  flex-wrap: wrap;
}

.event-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  flex-shrink: 0;
}

.event-more {
  font-size: 10px;
  color: var(--hh-text-tertiary);
  font-weight: var(--hh-weight-medium);
}

.selected-date-panel {
  grid-column: 2;
  background: var(--hh-bg-card);
  border-radius: var(--hh-radius);
  border: 1px solid var(--hh-border-light);
  box-shadow: var(--hh-shadow-sm);
  padding: var(--hh-space-4);
  max-height: calc(100vh - 200px);
  overflow-y: auto;
  position: sticky;
  top: var(--hh-space-4);
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--hh-space-4);
}

.panel-title {
  font-size: var(--hh-text-lg);
  font-weight: var(--hh-weight-semibold);
  color: var(--hh-text);
}

.panel-count {
  font-size: var(--hh-text-sm);
  color: var(--hh-text-tertiary);
  background: var(--hh-bg-secondary);
  padding: 2px 8px;
  border-radius: var(--hh-radius-xs);
}

.event-list {
  display: flex;
  flex-direction: column;
  gap: var(--hh-space-2);
}

.event-card {
  display: flex;
  align-items: center;
  gap: var(--hh-space-3);
  padding: var(--hh-space-3);
  border-radius: var(--hh-radius-md);
  border: 1px solid var(--hh-border-light);
  cursor: pointer;
  transition: all var(--hh-transition-fast) var(--hh-easing-default);
}

.event-card:hover {
  border-color: var(--hh-primary);
  box-shadow: var(--hh-shadow-sm);
}

.event-icon-wrap {
  width: 36px;
  height: 36px;
  border-radius: var(--hh-radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.event-body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.event-name {
  font-size: var(--hh-text-sm);
  font-weight: var(--hh-weight-medium);
  color: var(--hh-text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.event-meta {
  display: flex;
  align-items: center;
  gap: var(--hh-space-2);
  flex-wrap: wrap;
}

.event-type-badge {
  font-size: var(--hh-text-xs);
  font-weight: var(--hh-weight-medium);
}

.event-time,
.event-quantity,
.event-location {
  font-size: var(--hh-text-xs);
  color: var(--hh-text-tertiary);
}

.event-status {
  font-size: var(--hh-text-xs);
  font-weight: var(--hh-weight-medium);
}

.status-expired {
  color: var(--hh-error);
}

.status-warning {
  color: var(--hh-warning);
}

.event-arrow {
  color: var(--hh-text-tertiary);
  flex-shrink: 0;
}

/* Week View */
.week-view {
  background: var(--hh-bg-card);
  border-radius: var(--hh-radius);
  border: 1px solid var(--hh-border-light);
  box-shadow: var(--hh-shadow-sm);
}

.week-header {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  border-bottom: 1px solid var(--hh-border-light);
}

.week-day-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: var(--hh-space-3) var(--hh-space-2);
  cursor: pointer;
  transition: background var(--hh-transition-fast);
}

.week-day-header:hover {
  background: var(--hh-bg-secondary);
}

.week-day--selected {
  background: var(--hh-primary-light);
}

.week-day-name {
  font-size: var(--hh-text-xs);
  color: var(--hh-text-secondary);
  font-weight: var(--hh-weight-medium);
}

.week-day-num {
  font-size: var(--hh-text-xl);
  font-weight: var(--hh-weight-semibold);
  color: var(--hh-text);
}

.today-num {
  background: var(--hh-primary);
  color: white;
  border-radius: 50%;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.week-body {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  min-height: 300px;
}

.week-day-col {
  padding: var(--hh-space-2);
  border-right: 1px solid var(--hh-border-light);
  display: flex;
  flex-direction: column;
  gap: var(--hh-space-2);
}

.week-day-col:last-child {
  border-right: none;
}

.week-event-chip {
  padding: var(--hh-space-1) var(--hh-space-2);
  border-left: 3px solid var(--hh-primary);
  border-radius: var(--hh-radius-sm);
  background: var(--hh-bg-secondary);
  cursor: pointer;
  transition: background var(--hh-transition-fast);
}

.week-event-chip:hover {
  background: var(--hh-bg-tertiary);
}

.week-event-name {
  font-size: var(--hh-text-xs);
  font-weight: var(--hh-weight-medium);
  color: var(--hh-text);
  display: block;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.week-event-time {
  font-size: 10px;
  color: var(--hh-text-tertiary);
}

.week-empty-day {
  flex: 1;
}

/* List View */
.list-view-content {
  display: flex;
  flex-direction: column;
  gap: var(--hh-space-4);
}

.event-timeline {
  display: flex;
  flex-direction: column;
  gap: var(--hh-space-4);
}

.timeline-group {
  display: flex;
  flex-direction: column;
  gap: var(--hh-space-2);
}

.timeline-group-header {
  display: flex;
  align-items: center;
  gap: var(--hh-space-3);
  padding-bottom: var(--hh-space-2);
  border-bottom: 1px solid var(--hh-border-light);
}

.timeline-date-label {
  font-size: var(--hh-text-sm);
  font-weight: var(--hh-weight-semibold);
  color: var(--hh-text);
}

.timeline-date-count {
  font-size: var(--hh-text-xs);
  color: var(--hh-text-tertiary);
  background: var(--hh-bg-secondary);
  padding: 1px 6px;
  border-radius: var(--hh-radius-xs);
}

/* Detail Modal */
.detail-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.detail-label {
  font-size: var(--hh-text-sm);
  color: var(--hh-text-secondary);
}

/* Color Picker */
.color-dot {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  cursor: pointer;
  transition: transform var(--hh-transition-fast);
  border: 2px solid transparent;
}

.color-dot:hover {
  transform: scale(1.15);
}

.color-dot--active {
  border-color: var(--hh-text);
  transform: scale(1.15);
}

/* Responsive */
@media (max-width: 768px) {
  .calendar-content {
    grid-template-columns: 1fr;
  }

  .selected-date-panel {
    grid-column: 1;
    position: static;
    max-height: none;
  }

  .date-cell {
    min-height: 56px;
    padding: var(--hh-space-1);
  }

  .weekday-cell {
    font-size: 10px;
  }

  .week-body {
    min-height: 200px;
  }

  .week-day-num {
    font-size: var(--hh-text-base);
  }

  .today-num {
    width: 28px;
    height: 28px;
  }
}
</style>
