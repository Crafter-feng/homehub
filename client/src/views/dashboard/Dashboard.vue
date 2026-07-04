<template>
  <div class="dashboard">
    <!-- 欢迎区 (紧凑) -->
    <div class="welcome-section">
      <div class="welcome-bg"></div>
      <div class="welcome-content">
        <h1 class="welcome-title">{{ greeting }}，{{ user?.name || '用户' }}</h1>
        <p class="welcome-subtitle">{{ t('dashboard.welcomeGreeting') }}</p>
      </div>
    </div>

    <!-- 统计迷你卡片 — 单行4个 -->
    <div class="mini-stats" v-if="!loading && !error">
      <div class="mini-stat hover-lift" @click="$router.push('/stock')">
        <div class="mini-stat-icon" style="background: var(--hh-primary-light); color: var(--hh-primary)">
          <n-icon :size="18"><CubeOutline /></n-icon>
        </div>
        <div class="mini-stat-info">
          <span class="mini-stat-value">{{ summary.totalItems }}</span>
          <span class="mini-stat-label">{{ t('dashboard.totalItems') }}</span>
        </div>
      </div>
      <div class="mini-stat hover-lift" @click="$router.push('/stock')">
        <div class="mini-stat-icon" style="background: var(--hh-warning-light); color: var(--hh-warning)">
          <n-icon :size="18"><TimeOutline /></n-icon>
        </div>
        <div class="mini-stat-info">
          <span class="mini-stat-value">{{ summary.expiringCount }}</span>
          <span class="mini-stat-label">{{ t('dashboard.expiringSoon') }}</span>
        </div>
      </div>
      <div class="mini-stat hover-lift" @click="$router.push('/lists')">
        <div class="mini-stat-icon" style="background: var(--hh-success-light); color: var(--hh-success)">
          <n-icon :size="18"><CheckmarkCircleOutline /></n-icon>
        </div>
        <div class="mini-stat-info">
          <span class="mini-stat-value">{{ summary.pendingTasks }}</span>
          <span class="mini-stat-label">{{ t('dashboard.pendingTasks') }}</span>
        </div>
      </div>
      <div class="mini-stat hover-lift">
        <div class="mini-stat-icon" style="background: var(--hh-bg-secondary); color: var(--hh-text-secondary)">
          <n-icon :size="18"><SwapVerticalOutline /></n-icon>
        </div>
        <div class="mini-stat-info">
          <span class="mini-stat-value">{{ summary.monthConsumption }}</span>
          <span class="mini-stat-label">{{ t('dashboard.monthlyConsumption') }}</span>
        </div>
      </div>
    </div>

    <!-- Loading -->
    <div class="mini-stats" v-else-if="loading">
      <div class="mini-stat skeleton" v-for="i in 4" :key="i">
        <n-skeleton circle :width="36" :height="36" />
        <div class="mini-stat-info">
          <n-skeleton text style="width: 30px" />
          <n-skeleton text style="width: 50px" />
        </div>
      </div>
    </div>

    <!-- Error -->
    <div class="error-state" v-else-if="error">
      <n-empty :description="t('common.error')">
        <template #extra>
          <n-button size="small" @click="loadData">{{ t('common.retry') }}</n-button>
        </template>
      </n-empty>
    </div>

    <!-- 快捷操作 — 单行4个 -->
    <div class="quick-actions" v-if="!loading && !error">
      <div class="action-btn hover-lift" @click="$router.push('/stock')">
        <div class="action-icon" style="background: var(--hh-primary-light); color: var(--hh-primary)">
          <n-icon :size="20"><AddOutline /></n-icon>
        </div>
        <span class="action-text">{{ t('dashboard.addItem') }}</span>
      </div>
      <div class="action-btn hover-lift" @click="$router.push('/lists')">
        <div class="action-icon" style="background: var(--hh-success-light); color: var(--hh-success)">
          <n-icon :size="20"><CartOutline /></n-icon>
        </div>
        <span class="action-text">{{ t('dashboard.shoppingList') }}</span>
      </div>
      <div class="action-btn hover-lift" @click="$router.push('/recipes')">
        <div class="action-icon" style="background: var(--hh-warning-light); color: var(--hh-warning)">
          <n-icon :size="20"><RestaurantOutline /></n-icon>
        </div>
        <span class="action-text">{{ t('dashboard.recipeRec') }}</span>
      </div>
      <div class="action-btn hover-lift" @click="$router.push('/iot-tags')">
        <div class="action-icon" style="background: var(--hh-error-light); color: var(--hh-error)">
          <n-icon :size="20"><PhonePortraitOutline /></n-icon>
        </div>
        <span class="action-text">{{ t('dashboard.tagScan') }}</span>
      </div>
    </div>

    <!-- 主内容区: 待办 + 活动 双列 -->
    <div class="main-grid" v-if="!loading && !error">
      <!-- 今日待办 -->
      <div class="panel panel-todo">
        <TodoWidget ref="todoWidgetRef" />
      </div>

      <!-- 最近活动 (固定高度可展开) -->
      <div class="panel panel-activity">
        <div class="panel-header">
          <h3 class="panel-title">{{ t('dashboard.recentActivity') }}</h3>
          <n-button text type="primary" size="small" @click="$router.push('/history')">
            {{ t('dashboard.viewAll') }}
          </n-button>
        </div>

        <div class="timeline-wrap" :class="{ expanded: activityExpanded }">
          <div class="timeline" v-if="activities.length > 0">
            <div class="timeline-item" v-for="(activity, index) in displayActivities" :key="activity.id">
              <div class="timeline-line" v-if="index < displayActivities.length - 1"></div>
              <div class="timeline-dot" :style="{ background: getActivityColor(activity.type) }"></div>
              <div class="timeline-content">
                <div class="timeline-text">{{ activity.detail }}</div>
                <div class="timeline-meta">
                  <span class="timeline-action">{{ activity.action }}</span>
                  <span class="timeline-time">{{ formatRelativeTime(activity.createdAt) }}</span>
                </div>
              </div>
            </div>
          </div>
          <n-empty v-else :description="t('dashboard.noActivity')" size="small" />
        </div>

        <div class="expand-btn" v-if="activities.length > 5">
          <n-button text size="small" @click="activityExpanded = !activityExpanded">
            {{ activityExpanded ? t('common.close') : `+${activities.length - 5} ${t('dashboard.viewAll')}` }}
          </n-button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { NIcon, NButton, NEmpty, NSkeleton, useMessage } from 'naive-ui';
import {
  AddOutline, CartOutline,
  RestaurantOutline, PhonePortraitOutline,
  CubeOutline, TimeOutline,
  CheckmarkCircleOutline, SwapVerticalOutline,
} from '@vicons/ionicons5';
import { useI18n } from '@/locales';
import { useAuthStore } from '@/stores/auth.store';
import { dashboardApi } from '@/api/client';
import { formatRelativeTime } from '@/utils/format';
import TodoWidget from '@/components/dashboard/TodoWidget.vue';

interface ActivityItem {
  id: string;
  type: string;
  action: string;
  detail: string;
  createdAt: string;
}

interface DashboardSummary {
  totalItems: number;
  expiringCount: number;
  expiredCount: number;
  monthConsumption: number;
  pendingTasks: number;
}

const { t } = useI18n();
const authStore = useAuthStore();
const message = useMessage();

const user = computed(() => authStore.user);
const summary = ref<DashboardSummary>({ totalItems: 0, expiringCount: 0, expiredCount: 0, monthConsumption: 0, pendingTasks: 0 });
const activities = ref<ActivityItem[]>([]);
const loading = ref(true);
const error = ref(false);
const activityExpanded = ref(false);
const todoWidgetRef = ref<InstanceType<typeof TodoWidget> | null>(null);

const greeting = computed(() => {
  const hour = new Date().getHours();
  if (hour < 6) return t('dashboard.greetingNight') || '夜深了';
  if (hour < 12) return t('dashboard.greetingMorning') || '早上好';
  if (hour < 18) return t('dashboard.greetingAfternoon') || '下午好';
  return t('dashboard.greetingEvening') || '晚上好';
});

const displayActivities = computed(() => {
  return activityExpanded.value ? activities.value : activities.value.slice(0, 5);
});

const getActivityColor = (type: string): string => {
  const colors: Record<string, string> = {
    stock: '#6366f1',
    list: '#10b981',
    scan: '#f59e0b',
    recipe: '#ef4444',
  };
  return colors[type] || '#6b7280';
};

const loadData = async () => {
  loading.value = true;
  error.value = false;
  try {
    const [summaryRes, activitiesRes] = await Promise.all([
      dashboardApi.getSummary(),
      dashboardApi.getActivities(20),
    ]);
    summary.value = summaryRes.data || { totalItems: 0, expiringCount: 0, expiredCount: 0, monthConsumption: 0, pendingTasks: 0 };
    activities.value = (activitiesRes.data || []).map((a: any) => ({
      ...a,
      id: String(a.id),
    }));
  } catch (e: unknown) {
    error.value = true;
    const err = e as any;
    if (err?.response?.status !== 401) {
      message.error(t('common.error'));
    }
  } finally {
    loading.value = false;
  }
};

onMounted(loadData);
</script>

<style scoped>
.dashboard {
  max-width: 1100px;
  margin: 0 auto;
}

/* === Welcome (紧凑) === */
.welcome-section {
  position: relative;
  border-radius: var(--hh-radius-lg);
  padding: var(--hh-space-5) var(--hh-space-5);
  margin-bottom: var(--hh-space-4);
  background: var(--hh-gradient-welcome);
  overflow: hidden;
}

.welcome-bg {
  position: absolute;
  inset: 0;
  opacity: 0.12;
  background:
    radial-gradient(circle at 85% 30%, rgba(255,255,255,0.3) 0%, transparent 50%),
    radial-gradient(circle at 20% 80%, rgba(255,255,255,0.15) 0%, transparent 40%);
}

.welcome-content { position: relative; z-index: 1; }

.welcome-title {
  font-size: var(--hh-text-2xl);
  font-weight: var(--hh-weight-bold);
  color: #fff;
  margin: 0 0 var(--hh-space-1);
  letter-spacing: -0.02em;
  line-height: 1.2;
}

.welcome-subtitle {
  font-size: var(--hh-text-sm);
  color: rgba(255,255,255,0.75);
  margin: 0;
}

/* === Mini Stats — 单行紧凑 === */
.mini-stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--hh-space-3);
  margin-bottom: var(--hh-space-4);
}

.mini-stat {
  display: flex;
  align-items: center;
  gap: var(--hh-space-3);
  padding: var(--hh-space-3) var(--hh-space-4);
  background: var(--hh-bg-card);
  border-radius: var(--hh-radius);
  border: 1px solid var(--hh-border-light);
  cursor: pointer;
  transition: box-shadow 0.2s;
}

.mini-stat:hover {
  box-shadow: var(--hh-shadow-md);
}

.mini-stat-icon {
  width: 36px;
  height: 36px;
  border-radius: var(--hh-radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.mini-stat-info {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.mini-stat-value {
  font-size: var(--hh-text-lg);
  font-weight: var(--hh-weight-bold);
  line-height: 1.2;
  letter-spacing: -0.02em;
}

.mini-stat-label {
  font-size: var(--hh-text-xs);
  color: var(--hh-text-tertiary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* === Quick Actions — 单行按钮 === */
.quick-actions {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--hh-space-3);
  margin-bottom: var(--hh-space-4);
}

.action-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--hh-space-2);
  padding: var(--hh-space-4) var(--hh-space-2);
  border-radius: var(--hh-radius);
  background: var(--hh-bg-card);
  border: 1px solid var(--hh-border-light);
  cursor: pointer;
  transition: box-shadow 0.2s, border-color 0.2s;
}

.action-btn:hover {
  box-shadow: var(--hh-shadow-md);
  border-color: var(--hh-primary);
}

.action-icon {
  width: 40px;
  height: 40px;
  border-radius: var(--hh-radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
}

.action-text {
  font-size: var(--hh-text-xs);
  font-weight: var(--hh-weight-medium);
  color: var(--hh-text);
  text-align: center;
}

/* === Main Grid — 待办 + 活动双列 === */
.main-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--hh-space-4);
}

.panel {
  background: var(--hh-bg-card);
  border-radius: var(--hh-radius-lg);
  border: 1px solid var(--hh-border-light);
  padding: var(--hh-space-5);
  display: flex;
  flex-direction: column;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--hh-space-4);
}

.panel-title {
  font-size: var(--hh-text-base);
  font-weight: var(--hh-weight-semibold);
  margin: 0;
}

/* === Activity Timeline (固定高度可展开) === */
.timeline-wrap {
  flex: 1;
  max-height: 320px;
  overflow-y: auto;
  transition: max-height 0.3s ease;
}

.timeline-wrap.expanded {
  max-height: 2000px;
}

.timeline {
  display: flex;
  flex-direction: column;
}

.timeline-item {
  display: flex;
  gap: var(--hh-space-3);
  padding: var(--hh-space-2) 0;
  position: relative;
}

.timeline-line {
  position: absolute;
  left: 5px;
  top: 20px;
  bottom: -4px;
  width: 2px;
  background: var(--hh-border);
  border-radius: 1px;
}

.timeline-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
  margin-top: 5px;
  position: relative;
  z-index: 1;
}

.timeline-content {
  flex: 1;
  min-width: 0;
  padding-bottom: var(--hh-space-1);
}

.timeline-text {
  font-size: var(--hh-text-sm);
  color: var(--hh-text);
  line-height: 1.4;
}

.timeline-meta {
  display: flex;
  gap: var(--hh-space-2);
  margin-top: 2px;
}

.timeline-action {
  font-size: var(--hh-text-xs);
  color: var(--hh-text-secondary);
}

.timeline-time {
  font-size: var(--hh-text-xs);
  color: var(--hh-text-tertiary);
}

.expand-btn {
  text-align: center;
  padding-top: var(--hh-space-2);
  border-top: 1px solid var(--hh-border-light);
  margin-top: var(--hh-space-2);
}

/* === Skeleton === */
.mini-stat.skeleton {
  cursor: default;
}

/* === Error === */
.error-state {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 120px;
  margin-bottom: var(--hh-space-4);
}

/* === Responsive === */
@media (max-width: 900px) {
  .main-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .mini-stats {
    grid-template-columns: repeat(2, 1fr);
  }

  .quick-actions {
    grid-template-columns: repeat(4, 1fr);
    gap: var(--hh-space-2);
  }

  .action-btn {
    padding: var(--hh-space-3) var(--hh-space-1);
  }

  .action-icon {
    width: 36px;
    height: 36px;
  }

  .welcome-title {
    font-size: var(--hh-text-xl);
  }
}

@media (max-width: 480px) {
  .mini-stats {
    grid-template-columns: repeat(2, 1fr);
    gap: var(--hh-space-2);
  }

  .quick-actions {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
