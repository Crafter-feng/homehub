import { createRouter, createWebHistory } from 'vue-router';
import { TokenStorage } from '@/utils/token-storage';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/login', name: 'login', component: () => import('@/views/auth/Login.vue') },
    { path: '/register', name: 'register', component: () => import('@/views/auth/Register.vue') },
    {
      path: '/',
      component: () => import('@/layouts/MainLayout.vue'),
      children: [
        { path: '', redirect: '/dashboard' },
        { path: 'dashboard', name: 'dashboard', component: () => import('@/views/dashboard/Dashboard.vue') },
        { path: 'waste-analysis', name: 'waste-analysis', component: () => import('@/views/dashboard/WasteAnalysis.vue') },
        { path: 'stock', name: 'stock', component: () => import('@/views/stock/StockList.vue') },
        { path: 'stock/:id', name: 'stock-detail', component: () => import('@/views/stock/ItemDetail.vue') },
        { path: 'lists', name: 'lists', component: () => import('@/views/shopping-list/ListsView.vue') },
        { path: 'lists/:id', name: 'list-detail', component: () => import('@/views/shopping-list/ListView.vue') },
        { path: 'recipes', name: 'recipes', component: () => import('@/views/recipes/RecipeList.vue') },
        { path: 'calendar', name: 'calendar', component: () => import('@/views/calendar/CalendarView.vue') },
        { path: 'inventory-audit', name: 'inventory-audit', component: () => import('@/views/audit/InventoryAudit.vue') },
        { path: 'iot-tags', name: 'iot-tags', component: () => import('@/views/iot-tags/IoTTagsView.vue') },
        { path: 'hardware', name: 'hardware', component: () => import('@/views/hardware/HardwarePage.vue') },
        { path: 'master-data', name: 'master-data', component: () => import('@/views/master-data/MasterData.vue') },
        { path: 'history', name: 'history', component: () => import('@/views/history/HistoryPage.vue') },
        { path: 'budget', name: 'budget', component: () => import('@/views/budget/BudgetPage.vue') },
        { path: 'backup', name: 'backup', component: () => import('@/views/backup/BackupPage.vue') },
        { path: 'settings', name: 'settings', component: () => import('@/views/settings/Settings.vue') },
        { path: 'mcp-tools', name: 'mcp-tools', component: () => import('@/views/mcp/McpTools.vue') },
        { path: 'api-docs', name: 'api-docs', component: () => import('@/views/api-docs/ApiDocs.vue') },
        { path: 'admin', name: 'admin', component: () => import('@/views/admin/AdminPanel.vue') },
      ],
    },
  ],
});

// 路由守卫 — 检查认证状态
router.beforeEach((to, _from, next) => {
  // 登录/注册页不需要认证检查
  if (to.name === 'login' || to.name === 'register') {
    // 如果已登录，跳转到首页
    if (TokenStorage.getAccessToken()) {
      next({ name: 'dashboard' });
    } else {
      next();
    }
    return;
  }

  // 其他页面需要认证
  if (!TokenStorage.getAccessToken() && !TokenStorage.getRefreshToken()) {
    next({ name: 'login' });
    return;
  }

  // 有 token（accessToken 或 refreshToken），放行
  // 如果 accessToken 过期，axios 拦截器会自动静默刷新
  next();
});

export default router;
