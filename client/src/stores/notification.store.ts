import { defineStore } from 'pinia';
import { ref } from 'vue';
import { notificationsApi } from '@/api/client';

export const useNotificationStore = defineStore('notifications', () => {
  const notifications = ref<any[]>([]);
  const unreadCount = ref(0);
  const loading = ref(false);
  const error = ref<string | null>(null);

  async function fetchNotifications(unreadOnly?: boolean) {
    loading.value = true;
    try {
      const { data } = await notificationsApi.list(unreadOnly);
      notifications.value = data;
    } catch {
      error.value = 'Failed to load notifications';
    } finally {
      loading.value = false;
    }
  }

  async function fetchUnreadCount() {
    try {
      const { data } = await notificationsApi.getUnreadCount();
      unreadCount.value = data.count || 0;
    } catch {
      // Silently ignore — unread count is non-critical
    }
  }

  async function markAsRead(id: number) {
    await notificationsApi.markAsRead(id);
    const notification = notifications.value.find(n => n.id === id);
    if (notification) {
      notification.isRead = true;
      unreadCount.value = Math.max(0, unreadCount.value - 1);
    }
  }

  async function markAllAsRead() {
    await notificationsApi.markAllAsRead();
    notifications.value.forEach(n => n.isRead = true);
    unreadCount.value = 0;
  }

  return {
    notifications,
    unreadCount,
    loading,
    error,
    fetchNotifications,
    fetchUnreadCount,
    markAsRead,
    markAllAsRead,
  };
});
