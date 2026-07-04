<template>
  <n-config-provider :theme="naiveTheme" :theme-overrides="themeOverrides" :locale="naiveLocale" :date-locale="naiveDateLocale">
    <n-message-provider>
      <n-notification-provider>
        <n-dialog-provider>
          <router-view />
        </n-dialog-provider>
      </n-notification-provider>
    </n-message-provider>
  </n-config-provider>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { NConfigProvider, NMessageProvider, NNotificationProvider, NDialogProvider, zhCN as naiveZhCN, enUS as naiveEnUS, dateZhCN, dateEnUS, darkTheme, lightTheme } from 'naive-ui';
import { lightThemeOverrides, darkThemeOverrides } from './styles/theme';
import { useI18n } from './locales';
import { useThemeStore } from './stores/theme.store';
import { initializePlugins } from '@/plugins/plugin-loader';

const { locale } = useI18n();
const themeStore = useThemeStore();

const naiveTheme = computed(() => themeStore.isDark ? darkTheme : lightTheme);
const themeOverrides = computed(() => themeStore.isDark ? darkThemeOverrides : lightThemeOverrides);

const naiveLocale = computed(() => locale.value === 'zh-CN' ? naiveZhCN : naiveEnUS);
const naiveDateLocale = computed(() => locale.value === 'zh-CN' ? dateZhCN : dateEnUS);

// Initialize the frontend plugin system after mount
// (needs DOM for Web NFC isSupported checks)
onMounted(() => {
  initializePlugins();
});
</script>
