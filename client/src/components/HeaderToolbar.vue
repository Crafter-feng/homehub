<template>
  <div class="header-toolbar">
    <n-space :size="8" align="center">
      <!-- 通知按钮（仅登录后显示） -->
      <n-popover v-if="isLoggedIn" trigger="click" placement="bottom-end" :width="360">
        <template #trigger>
          <n-button quaternary circle size="small" class="toolbar-btn">
            <template #icon>
              <n-badge :value="unreadCount" :max="99">
                <n-icon :size="18"><NotificationsOutline /></n-icon>
              </n-badge>
            </template>
          </n-button>
        </template>
        <div class="notification-panel">
          <div class="notification-header">
            <span class="notification-title">{{ t('notification.title') }}</span>
            <n-button text size="small" @click="markAllRead">{{ t('notification.markAllRead') }}</n-button>
          </div>
          <n-divider style="margin: 8px 0" />
          <div class="notification-list">
            <div v-if="notifications.length === 0" class="notification-empty">
              <n-empty description="暂无通知" size="small" />
            </div>
            <div v-else v-for="item in notifications" :key="item.id" class="notification-item" :class="{ unread: !item.isRead }" @click="readNotification(item)">
              <div class="notification-dot" v-if="!item.isRead"></div>
              <div class="notification-content">
                <div class="notification-text">{{ item.title }}</div>
                <div class="notification-desc">{{ item.message }}</div>
                <div class="notification-time">{{ formatTime(item.createdAt) }}</div>
              </div>
            </div>
          </div>
        </div>
      </n-popover>

      <!-- 主题下拉 -->
      <n-dropdown :options="themeOptions" @select="handleThemeChange" trigger="click">
        <n-button quaternary circle size="small" class="toolbar-btn">
          <template #icon>
            <n-icon :size="18">
              <Sunny v-if="themeStore.isDark" />
              <Moon v-else />
            </n-icon>
          </template>
        </n-button>
      </n-dropdown>

      <!-- 语言下拉 -->
      <n-dropdown :options="langOptions" @select="handleLangChange" trigger="click">
        <n-button quaternary circle size="small" class="toolbar-btn">
          <template #icon>
            <n-icon :size="18"><Language /></n-icon>
          </template>
        </n-button>
      </n-dropdown>

      <n-divider vertical />

      <!-- 编码生成 → 放到物联标签页 header，这里去掉 -->

      <!-- 用户头像和菜单 -->
      <UserAvatar />
    </n-space>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { NButton, NIcon, NSpace, NDropdown, NBadge, NDivider, NPopover, NEmpty, useMessage } from 'naive-ui';
import { Sunny, Moon, Language, NotificationsOutline } from '@vicons/ionicons5';
import { useThemeStore } from '@/stores/theme.store';
import { useAuthStore } from '@/stores/auth.store';
import { useI18n } from '@/locales';
import { notificationsApi } from '@/api/client';
import UserAvatar from './UserAvatar.vue';

const themeStore = useThemeStore();
const authStore = useAuthStore();
const { t } = useI18n();
const message = useMessage();

const isLoggedIn = computed(() => authStore.user !== null);
const notifications = ref<any[]>([]);
const unreadCount = ref(0);

const themeOptions = [
  { label: '☀️ 浅色模式', key: 'light' },
  { label: '🌙 深色模式', key: 'dark' },
  { label: '💻 跟随系统', key: 'auto' },
];

const langOptions = [
  { label: '🇨🇳 中文', key: 'zh-CN' },
  { label: '🇺🇸 English', key: 'en' },
];

const handleThemeChange = (key: string) => {
  themeStore.setMode(key as any);
};

const handleLangChange = (key: string) => {
  const { setLocale } = useI18n();
  setLocale(key as any);
};

const formatTime = (dateStr: string) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  if (diff < 60000) return '刚刚';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`;
  return d.toLocaleDateString('zh-CN');
};

const loadNotifications = async () => {
  try {
    const [listRes, countRes] = await Promise.all([
      notificationsApi.list(),
      notificationsApi.getUnreadCount(),
    ]);
    notifications.value = (listRes.data || []).slice(0, 10);
    unreadCount.value = countRes.data?.count || 0;
  } catch (e) {
    // 忽略
  }
};

const readNotification = async (item: any) => {
  if (!item.isRead) {
    try {
      await notificationsApi.markAsRead(item.id);
      item.isRead = true;
      unreadCount.value = Math.max(0, unreadCount.value - 1);
    } catch (e) {
      // 忽略
    }
  }
};

const markAllRead = async () => {
  try {
    await notificationsApi.markAllAsRead();
    notifications.value.forEach(n => n.isRead = true);
    unreadCount.value = 0;
    message.success('已全部标记为已读');
  } catch (e) {
    // 忽略
  }
};

onMounted(() => {
  if (authStore.user !== null) {
    loadNotifications();
  }
});
</script>

<style scoped>
.header-toolbar {
  display: flex;
  align-items: center;
}

.toolbar-btn {
  transition: background-color 0.2s ease, color 0.2s ease;
}

.toolbar-btn:hover {
  background: var(--hh-primary-light);
  color: var(--hh-primary);
}

.notification-panel {
  max-height: 400px;
  display: flex;
  flex-direction: column;
}

.notification-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.notification-title {
  font-weight: 600;
  font-size: 14px;
}

.notification-list {
  overflow-y: auto;
  max-height: 320px;
}

.notification-empty {
  padding: 20px 0;
}

.notification-item {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 10px 8px;
  border-radius: 8px;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.notification-item:hover {
  background: var(--hh-bg-secondary);
}

.notification-item.unread {
  background: var(--hh-primary-light);
}

.notification-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--hh-primary);
  margin-top: 6px;
  flex-shrink: 0;
}

.notification-content {
  flex: 1;
  min-width: 0;
}

.notification-text {
  font-size: 13px;
  font-weight: 500;
  color: var(--hh-text);
}

.notification-desc {
  font-size: 12px;
  color: var(--hh-text-secondary);
  margin-top: 2px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.notification-time {
  font-size: 11px;
  color: var(--hh-text-tertiary);
  margin-top: 4px;
}
</style>
