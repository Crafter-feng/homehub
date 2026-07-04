<template>
  <div class="auth-toolbar">
    <n-space :size="8" align="center">
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
    </n-space>
  </div>
</template>

<script setup lang="ts">
import { NButton, NIcon, NSpace, NDropdown } from 'naive-ui';
import { Sunny, Moon, Language } from '@vicons/ionicons5';
import { useThemeStore } from '@/stores/theme.store';
import { useI18n } from '@/locales';

const themeStore = useThemeStore();
const { setLocale } = useI18n();

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
  setLocale(key as any);
};
</script>

<style scoped>
.auth-toolbar {
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
</style>
