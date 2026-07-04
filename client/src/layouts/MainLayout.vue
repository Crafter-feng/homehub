<template>
  <n-layout has-sider style="height: 100vh">
    <n-layout-sider
      :width="240"
      :collapsed-width="72"
      collapse-mode="width"
      :collapsed="collapsed"
      show-trigger
      class="sidebar"
      @collapse="collapsed = true"
      @expand="collapsed = false"
    >
      <!-- Logo 区域 -->
      <div class="sidebar-logo" :class="{ 'sidebar-logo--collapsed': collapsed }">
        <div class="logo-mark">
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
            <rect x="2" y="2" width="24" height="24" rx="6" fill="url(#logo-gradient)" />
            <text x="14" y="19" text-anchor="middle" fill="white" font-size="13" font-weight="600" font-family="Inter, sans-serif">HH</text>
            <defs>
              <linearGradient id="logo-gradient" x1="2" y2="26" x2="26" y1="2" gradientUnits="userSpaceOnUse">
                <stop stop-color="#6366f1" />
                <stop offset="1" stop-color="#8b5cf6" />
              </linearGradient>
            </defs>
          </svg>
        </div>
        <transition name="fade">
          <span v-if="!collapsed" class="logo-text">HomeHub</span>
        </transition>
      </div>

      <!-- 菜单分组 -->
      <nav class="sidebar-nav">
        <div class="menu-group" v-if="!collapsed">
          <span class="menu-group-label">{{ t('nav.coreFunctions') }}</span>
        </div>
        <n-menu
          :collapsed="collapsed"
          :collapsed-width="72"
          :collapsed-icon-size="20"
          :options="coreMenuOptions"
          :value="activeMenu"
          class="sidebar-menu"
          @update:value="handleMenuClick"
        />

        <div class="menu-group" v-if="!collapsed">
          <span class="menu-group-label">{{ t('nav.dataManagement') }}</span>
        </div>
        <n-menu
          :collapsed="collapsed"
          :collapsed-width="72"
          :collapsed-icon-size="20"
          :options="dataMenuOptions"
          :value="activeMenu"
          class="sidebar-menu"
          @update:value="handleMenuClick"
        />

        <div class="menu-group" v-if="!collapsed">
          <span class="menu-group-label">{{ t('nav.systemSettings') }}</span>
        </div>
        <n-menu
          :collapsed="collapsed"
          :collapsed-width="72"
          :collapsed-icon-size="20"
          :options="systemMenuOptions"
          :value="activeMenu"
          class="sidebar-menu"
          @update:value="handleMenuClick"
        />
      </nav>
    </n-layout-sider>

    <n-layout>
      <!-- 精简 Header -->
      <n-layout-header class="header">
        <div class="header-left">
          <span class="header-page-title">{{ pageTitle }}</span>
        </div>
        <div class="header-right">
          <HeaderToolbar />
        </div>
      </n-layout-header>

      <!-- Content -->
      <n-layout-content class="content">
        <router-view v-slot="{ Component }">
          <transition name="slide-fade" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
      </n-layout-content>
    </n-layout>

    <!-- Mobile Bottom Navigation -->
    <nav class="mobile-bottom-nav">
      <router-link v-for="item in bottomNavItems" :key="item.key" :to="item.to" class="bottom-nav-item" :class="{ active: activeMenu === item.key }">
        <n-icon :size="22"><component :is="item.icon" /></n-icon>
        <span class="bottom-nav-label">{{ item.label }}</span>
      </router-link>
    </nav>
  </n-layout>
</template>

<script setup lang="ts">
import { ref, computed, h } from 'vue';
import type { Component } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { RouterLink } from 'vue-router';
import { NLayout, NLayoutSider, NLayoutHeader, NLayoutContent, NMenu, NIcon } from 'naive-ui';
import type { MenuOption } from 'naive-ui';
import { useI18n } from '@/locales';
import HeaderToolbar from '@/components/HeaderToolbar.vue';
import {
  GridOutline,
  CubeOutline,
  ListOutline,
  RestaurantOutline,
  PricetagOutline,
  ServerOutline,
  TimeOutline,
  FlameOutline,
  CalendarOutline,
  WalletOutline,
} from '@vicons/ionicons5';

const router = useRouter();
const route = useRoute();
const collapsed = ref(false);
const { t } = useI18n();

const activeMenu = computed(() => route.name as string);

const pageTitle = computed(() => {
  const titles: Record<string, string> = {
    dashboard: t('nav.dashboard'),
    stock: t('nav.stock'),
    lists: t('nav.lists'),
    recipes: t('nav.recipes'),
    calendar: t('nav.calendar'),
    'inventory-audit': t('nav.inventoryAudit'),
    nfc: t('nav.nfc'),
    settings: t('nav.settings'),
    'iot-tags': t('nav.iotTags'),
    'master-data': t('nav.masterData'),
    history: t('nav.history'),
    hardware: t('nav.hardware'),
    admin: t('nav.admin'),
    'waste-analysis': t('nav.wasteAnalysis'),
    budget: t('nav.budget'),
    backup: t('nav.backup'),
  };
  return titles[activeMenu.value] || '';
});

const renderMenuLabel = (label: string, to: string) => {
  return () => h(RouterLink, { to }, { default: () => label });
};

const renderMenuIcon = (icon: Component) => {
  return () => h(NIcon, { size: 20 }, { default: () => h(icon) });
};

const coreMenuOptions = computed<MenuOption[]>(() => [
  {
    label: renderMenuLabel(t('nav.dashboard'), '/dashboard'),
    key: 'dashboard',
    icon: renderMenuIcon(GridOutline),
  },
  {
    label: renderMenuLabel(t('nav.stock'), '/stock'),
    key: 'stock',
    icon: renderMenuIcon(CubeOutline),
  },
  {
    label: renderMenuLabel(t('nav.calendar'), '/calendar'),
    key: 'calendar',
    icon: renderMenuIcon(CalendarOutline),
  },
  {
    label: renderMenuLabel(t('nav.lists'), '/lists'),
    key: 'lists',
    icon: renderMenuIcon(ListOutline),
  },
  {
    label: renderMenuLabel(t('nav.recipes'), '/recipes'),
    key: 'recipes',
    icon: renderMenuIcon(RestaurantOutline),
  },
  {
    label: renderMenuLabel(t('nav.budget'), '/budget'),
    key: 'budget',
    icon: renderMenuIcon(WalletOutline),
  },
]);

const dataMenuOptions = computed<MenuOption[]>(() => [
    {
      label: renderMenuLabel(t('nav.wasteAnalysis'), '/waste-analysis'),
      key: 'waste-analysis',
      icon: renderMenuIcon(FlameOutline),
    },
    {
      label: renderMenuLabel(t('nav.history'), '/history'),
      key: 'history',
      icon: renderMenuIcon(TimeOutline),
    },
    {
      label: renderMenuLabel(t('nav.iotTags'), '/iot-tags'),
      key: 'iot-tags',
      icon: renderMenuIcon(PricetagOutline),
    },
    {
      label: renderMenuLabel(t('nav.hardware'), '/hardware'),
      key: 'hardware',
      icon: renderMenuIcon(ServerOutline),
    },
  ]);

const systemMenuOptions = computed<MenuOption[]>(() => [
    {
      label: renderMenuLabel(t('nav.masterData'), '/master-data'),
      key: 'master-data',
      icon: renderMenuIcon(ServerOutline),
    },
    {
      label: renderMenuLabel(t('nav.backup'), '/backup'),
      key: 'backup',
      icon: renderMenuIcon(ServerOutline),
    },
  ]);

const handleMenuClick = (key: string) => {
  router.push({ name: key });
};

const bottomNavItems = computed(() => [
  { key: 'dashboard', to: '/dashboard', icon: GridOutline, label: t('nav.dashboard') },
  { key: 'stock', to: '/stock', icon: CubeOutline, label: t('nav.stock') },
  { key: 'calendar', to: '/calendar', icon: CalendarOutline, label: t('nav.calendar') },
  { key: 'lists', to: '/lists', icon: ListOutline, label: t('nav.lists') },
  { key: 'recipes', to: '/recipes', icon: RestaurantOutline, label: t('nav.recipes') },
]);
</script>

<style scoped>
.sidebar {
  background: var(--hh-sidebar-bg);
  border-right: 1px solid var(--hh-sidebar-border);
  display: flex;
  flex-direction: column;
}

.sidebar-logo {
  display: flex;
  align-items: center;
  gap: var(--hh-space-3);
  padding: var(--hh-space-5) var(--hh-space-4);
  border-bottom: 1px solid var(--hh-border-light);
  min-height: 56px;
  transition: padding var(--hh-transition-normal) var(--hh-easing-default);
}

.sidebar-logo--collapsed {
  justify-content: center;
  padding: var(--hh-space-5) var(--hh-space-2);
}

.logo-mark {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.logo-text {
  font-size: var(--hh-text-xl);
  font-weight: var(--hh-weight-bold);
  background: var(--hh-gradient-primary);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  letter-spacing: -0.02em;
}

.sidebar-nav {
  flex: 1;
  overflow-y: auto;
  padding: var(--hh-space-2) var(--hh-space-2);
}

.menu-group {
  padding: var(--hh-space-4) var(--hh-space-4) var(--hh-space-2);
  margin-top: var(--hh-space-1);
}

.menu-group:first-child {
  margin-top: 0;
}

.menu-group-label {
  font-size: var(--hh-text-xs);
  font-weight: var(--hh-weight-semibold);
  color: var(--hh-sidebar-group-label-color);
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.sidebar-menu {
  --n-item-height: 40px;
}

/* Active state indicator: left bar + gradient bg */
.sidebar-menu :deep(.n-menu-item-content--selected) {
  position: relative;
}

.sidebar-menu :deep(.n-menu-item-content--selected)::before {
  content: '';
  position: absolute;
  left: 0;
  top: 8px;
  bottom: 8px;
  width: 3px;
  border-radius: 2px;
  background: var(--hh-sidebar-menu-active-indicator);
}

/* Header */
.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: var(--hh-header-height);
  padding: 0 var(--hh-space-5);
  background: var(--hh-header-bg);
  border-bottom: 1px solid var(--hh-header-border);
}

.header-left {
  flex: 1;
  display: flex;
  align-items: center;
}

.header-page-title {
  font-size: var(--hh-text-lg);
  font-weight: var(--hh-weight-semibold);
  color: var(--hh-text);
  letter-spacing: -0.01em;
}

.header-right {
  display: flex;
  align-items: center;
}

/* Content */
.content {
  padding: var(--hh-space-5);
  background: var(--hh-bg);
  overflow-y: auto;
}

/* Fade transition for collapsed text */
.fade-enter-active,
.fade-leave-active {
  transition: opacity var(--hh-transition-fast) var(--hh-easing-default);
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* Slide-fade for page transitions */
.slide-fade-enter-active {
  transition: all var(--hh-transition-normal) var(--hh-easing-default);
}

.slide-fade-leave-active {
  transition: all var(--hh-transition-fast) var(--hh-easing-default);
}

.slide-fade-enter-from {
  transform: translateY(8px);
  opacity: 0;
}

.slide-fade-leave-to {
  transform: translateY(-4px);
  opacity: 0;
}

@media (max-width: 768px) {
  .content {
    padding: var(--hh-space-4);
    padding-bottom: 72px;
  }
}

/* === Mobile Bottom Navigation === */
.mobile-bottom-nav {
  display: none;
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: 64px;
  background: var(--hh-bg-card);
  border-top: 1px solid var(--hh-border-light);
  z-index: 100;
  align-items: center;
  justify-content: space-around;
  padding: 0 var(--hh-space-1);
  box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.04);
}

.bottom-nav-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  flex: 1;
  height: 100%;
  color: var(--hh-text-tertiary);
  text-decoration: none;
  transition: color var(--hh-transition-fast) var(--hh-easing-default);
  border-radius: var(--hh-radius-sm);
}

.bottom-nav-item.active {
  color: var(--hh-primary);
}

.bottom-nav-item:hover {
  color: var(--hh-primary-hover);
}

.bottom-nav-label {
  font-size: 10px;
  font-weight: var(--hh-weight-medium);
  line-height: 1;
}

@media (max-width: 768px) {
  .mobile-bottom-nav {
    display: flex;
  }
}
</style>
