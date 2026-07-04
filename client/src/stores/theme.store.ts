import { defineStore } from 'pinia';
import { ref } from 'vue';

export type ThemeMode = 'light' | 'dark' | 'auto';

export const useThemeStore = defineStore('theme', () => {
  const mode = ref<ThemeMode>((localStorage.getItem('theme') as ThemeMode) || 'auto');
  const isDark = ref(false);

  // 检测系统主题
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)');

  function updateTheme() {
    if (mode.value === 'auto') {
      isDark.value = prefersDark.matches;
    } else {
      isDark.value = mode.value === 'dark';
    }

    // 更新 DOM
    document.documentElement.classList.toggle('dark', isDark.value);
    document.documentElement.setAttribute('data-theme', isDark.value ? 'dark' : 'light');

    // 更新 meta theme-color
    const metaTheme = document.querySelector('meta[name="theme-color"]');
    if (metaTheme) {
      metaTheme.setAttribute('content', isDark.value ? '#1a1a2e' : '#6366f1');
    }
  }

  function setMode(newMode: ThemeMode) {
    mode.value = newMode;
    localStorage.setItem('theme', newMode);
    updateTheme();
  }

  function toggleTheme() {
    if (mode.value === 'auto') {
      setMode(isDark.value ? 'light' : 'dark');
    } else {
      setMode(mode.value === 'dark' ? 'light' : 'dark');
    }
  }

  // 监听系统主题变化
  prefersDark.addEventListener('change', () => {
    if (mode.value === 'auto') {
      updateTheme();
    }
  });

  // 初始化
  updateTheme();

  return {
    mode,
    isDark,
    setMode,
    toggleTheme,
  };
});
