import { defineStore } from 'pinia';
import { ref } from 'vue';
import { notificationsApi } from '@/api/client';

export const useNotificationStore = defineStore('notifications', () => {
  const notifications = ref<any[]>([]);
  const unreadCount = ref(0);
  const loading = ref(false);

  async function fetchNotifications(unreadOnly?: boolean) {
    loading.value = true;
    try {
      const { data } = await notificationsApi.list(unreadOnly);
      notifications.value = data;
    } finally {
      loading.value = false;
    }
  }

  async function fetchUnreadCount() {
    const { data } = await notificationsApi.getUnreadCount();
    unreadCount.value = data.count;
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
    fetchNotifications,
    fetchUnreadCount,
    markAsRead,
    markAllAsRead,
  };
});
