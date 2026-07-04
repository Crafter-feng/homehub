<template>
  <n-dropdown :options="menuOptions" @select="handleMenuSelect" trigger="click" v-if="isLoggedIn">
    <div class="user-avatar-wrapper">
      <n-avatar
        round
        :size="36"
        :src="user?.avatar ?? undefined"
        class="user-avatar"
      >
        {{ user?.name?.charAt(0) || 'U' }}
      </n-avatar>
      <div class="user-info">
        <span class="user-name">{{ user?.name || '用户' }}</span>
        <span class="user-role">{{ user?.role === 'admin' ? '管理员' : '成员' }}</span>
      </div>
      <n-icon :size="14" class="dropdown-icon">
        <ChevronDown />
      </n-icon>
    </div>
  </n-dropdown>
</template>

<script setup lang="ts">
import { computed, h } from 'vue';
import { useRouter } from 'vue-router';
import { NAvatar, NDropdown, NIcon } from 'naive-ui';
import { ChevronDown, SettingsOutline, LogOutOutline, CodeSlashOutline, HardwareChipOutline, ShieldCheckmarkOutline } from '@vicons/ionicons5';
import { useAuthStore } from '@/stores/auth.store';
import { useI18n } from '@/locales';

const router = useRouter();
const authStore = useAuthStore();
const { t } = useI18n();

const isLoggedIn = computed(() => authStore.isLoggedIn);
const user = computed(() => authStore.user);

const menuOptions = computed(() => {
  const items = [
    {
      label: '账户设置',
      key: 'settings',
      icon: () => h(NIcon, null, { default: () => h(SettingsOutline) }),
    },
    {
      type: 'divider',
      key: 'd0',
    },
    {
      label: 'MCP 接口',
      key: 'mcp',
      icon: () => h(NIcon, null, { default: () => h(HardwareChipOutline) }),
    },
    {
      label: 'API 文档',
      key: 'api',
      icon: () => h(NIcon, null, { default: () => h(CodeSlashOutline) }),
    },
  ];

  // Admin management entry for admin users
  if (user.value?.role === 'admin') {
    items.push(
      { type: 'divider', key: 'd-admin' },
      {
        label: '管理后台',
        key: 'admin',
        icon: () => h(NIcon, null, { default: () => h(ShieldCheckmarkOutline) }),
      }
    );
  }

  items.push(
    { type: 'divider', key: 'd2' },
    {
      label: t('common.logout'),
      key: 'logout',
      icon: () => h(NIcon, null, { default: () => h(LogOutOutline) }),
    }
  );

  return items;
});

const handleMenuSelect = (key: string) => {
  switch (key) {
    case 'settings':
      router.push('/settings');
      break;
    case 'admin':
      router.push('/admin');
      break;
    case 'mcp':
      router.push('/mcp-tools');
      break;
    case 'api':
      router.push('/api-docs');
      break;
    case 'logout':
      authStore.logout();
      router.push('/login');
      break;
  }
};
</script>

<style scoped>
.user-avatar-wrapper {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 12px;
  border-radius: 12px;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.user-avatar-wrapper:hover {
  background: var(--hh-bg-secondary);
}

.user-avatar {
  background: var(--hh-gradient-primary);
  color: white;
  font-weight: 600;
}

.user-info {
  display: flex;
  flex-direction: column;
  line-height: 1.2;
}

.user-name {
  font-size: 14px;
  font-weight: 500;
  color: var(--hh-text);
}

.user-role {
  font-size: 11px;
  color: var(--hh-text-tertiary);
}

.dropdown-icon {
  color: var(--hh-text-tertiary);
  transition: transform 0.2s ease;
}
</style>
