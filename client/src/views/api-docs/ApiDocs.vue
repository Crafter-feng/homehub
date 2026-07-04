<template>
  <div class="api-page">
    <n-page-header title="API 文档" subtitle="REST API 接口参考">
      <template #extra>
        <n-space>
          <n-tag type="success">v1</n-tag>
          <n-tag>Base URL: /api/v1</n-tag>
        </n-space>
      </template>
    </n-page-header>

    <!-- 认证说明 -->
    <n-card title="认证" class="page-section">
      <n-alert type="info">
        <p>所有 API 请求需要在 Header 中携带 JWT Token：</p>
        <n-code language="http" code="Authorization: Bearer &lt;access_token&gt;" />
      </n-alert>
    </n-card>

    <!-- API 模块 -->
    <n-card class="page-section">
      <n-tabs type="line" animated>
        <n-tab-pane v-for="group in apiGroups" :key="group.name" :name="group.name" :tab="group.label">
          <div v-for="api in group.apis" :key="api.path" class="api-item">
            <div class="api-header" @click="api.expanded = !api.expanded">
              <n-tag :type="getMethodColor(api.method)" size="small">{{ api.method }}</n-tag>
              <span class="api-path">{{ api.path }}</span>
              <span class="api-desc">{{ api.description }}</span>
              <n-icon :size="16" class="expand-icon" :class="{ expanded: api.expanded }">
                <ChevronForward />
              </n-icon>
            </div>
            <div v-if="api.expanded" class="api-detail">
              <p v-if="api.params"><strong>参数：</strong>{{ api.params }}</p>
              <p v-if="api.body"><strong>请求体：</strong></p>
              <n-code v-if="api.body" language="json" :code="api.body" />
            </div>
          </div>
        </n-tab-pane>
      </n-tabs>
    </n-card>
  </div>
</template>

<script setup lang="ts">
import { reactive } from 'vue';
import { NPageHeader, NCard, NTabs, NTabPane, NTag, NAlert, NCode, NSpace, NIcon } from 'naive-ui';
import { ChevronForward } from '@vicons/ionicons5';

const apiGroups = reactive([
  {
    name: 'auth',
    label: '认证',
    apis: [
      { method: 'POST', path: '/auth/register', description: '用户注册', expanded: false, body: '{\n  "name": "张三",\n  "email": "test@example.com",\n  "password": "123456"\n}' },
      { method: 'POST', path: '/auth/login', description: '用户登录', expanded: false, body: '{\n  "account": "邮箱或用户名",\n  "password": "123456"\n}' },
      { method: 'GET', path: '/auth/me', description: '获取当前用户信息' },
      { method: 'POST', path: '/auth/refresh', description: '刷新 Token' },
      { method: 'GET', path: '/auth/tokens', description: '列出 API Token' },
      { method: 'POST', path: '/auth/tokens', description: '创建 API Token' },
      { method: 'DELETE', path: '/auth/tokens/:id', description: '删除 API Token' },
    ],
  },
  {
    name: 'stock',
    label: '库存',
    apis: [
      { method: 'GET', path: '/stock/items', description: '物品列表', expanded: false, params: 'category, location, expiring' },
      { method: 'POST', path: '/stock/items', description: '创建物品', expanded: false, body: '{\n  "name": "牛奶",\n  "type": "food",\n  "quantity": 1,\n  "unit": "盒"\n}' },
      { method: 'GET', path: '/stock/items/:id', description: '物品详情' },
      { method: 'PUT', path: '/stock/items/:id', description: '更新物品' },
      { method: 'DELETE', path: '/stock/items/:id', description: '删除物品' },
      { method: 'POST', path: '/stock/items/:id/consume', description: '消耗物品', expanded: false, body: '{\n  "quantity": 1,\n  "note": "早餐喝了"\n}' },
      { method: 'POST', path: '/stock/items/:id/transfer', description: '转移位置' },
      { method: 'POST', path: '/stock/items/:id/adjust', description: '调整数量' },
      { method: 'GET', path: '/stock/expiring', description: '即将过期物品' },
      { method: 'GET', path: '/stock/summary', description: '库存概况' },
      { method: 'GET', path: '/stock/export', description: '导出 CSV' },
      { method: 'POST', path: '/stock/import', description: '导入 CSV' },
    ],
  },
  {
    name: 'locations',
    label: '位置',
    apis: [
      { method: 'GET', path: '/locations', description: '位置树' },
      { method: 'POST', path: '/locations', description: '创建位置' },
      { method: 'GET', path: '/locations/:id', description: '位置详情' },
      { method: 'PUT', path: '/locations/:id', description: '更新位置' },
      { method: 'DELETE', path: '/locations/:id', description: '删除位置' },
    ],
  },
  {
    name: 'lists',
    label: '清单',
    apis: [
      { method: 'GET', path: '/lists', description: '清单列表', expanded: false, params: 'type: shopping/todo/chore/holiday' },
      { method: 'POST', path: '/lists', description: '创建清单' },
      { method: 'GET', path: '/lists/:id', description: '清单详情' },
      { method: 'PUT', path: '/lists/:id', description: '更新清单' },
      { method: 'DELETE', path: '/lists/:id', description: '删除清单' },
      { method: 'POST', path: '/lists/:id/items', description: '添加条目' },
      { method: 'POST', path: '/lists/items/:id/check', description: '打勾完成' },
      { method: 'POST', path: '/lists/auto-replenish', description: '自动补货' },
      { method: 'GET', path: '/lists/my-tasks', description: '我的任务' },
    ],
  },
  {
    name: 'recipes',
    label: '食谱',
    apis: [
      { method: 'GET', path: '/recipes', description: '食谱列表' },
      { method: 'POST', path: '/recipes', description: '创建食谱' },
      { method: 'GET', path: '/recipes/:id', description: '食谱详情' },
      { method: 'PUT', path: '/recipes/:id', description: '更新食谱' },
      { method: 'DELETE', path: '/recipes/:id', description: '删除食谱' },
      { method: 'GET', path: '/recipes/recommendations', description: '推荐食谱' },
    ],
  },
  {
    name: 'trigger',
    label: '触发器',
    apis: [
      { method: 'GET', path: '/bindings', description: '绑定列表' },
      { method: 'POST', path: '/bindings', description: '创建绑定' },
      { method: 'POST', path: '/scanner/scan', description: '扫描事件' },
      { method: 'GET', path: '/automations', description: '自动化规则' },
      { method: 'POST', path: '/automations', description: '创建自动化' },
    ],
  },
  {
    name: 'notifications',
    label: '通知',
    apis: [
      { method: 'GET', path: '/notifications', description: '通知列表' },
      { method: 'GET', path: '/notifications/unread-count', description: '未读数量' },
      { method: 'POST', path: '/notifications/:id/read', description: '标记已读' },
      { method: 'GET', path: '/notifications/rules', description: '通知规则' },
      { method: 'POST', path: '/notifications/rules', description: '创建规则' },
    ],
  },
  {
    name: 'mcp',
    label: 'MCP',
    apis: [
      { method: 'POST', path: '/mcp/tools/list', description: '列出 MCP 工具' },
      { method: 'POST', path: '/mcp/tools/call', description: '调用 MCP 工具', expanded: false, body: '{\n  "name": "search_items",\n  "arguments": {\n    "query": "牛奶"\n  }\n}' },
    ],
  },
  {
    name: 'users',
    label: '用户',
    apis: [
      { method: 'GET', path: '/users/me', description: '获取用户资料' },
      { method: 'PUT', path: '/users/me', description: '更新用户资料' },
      { method: 'POST', path: '/users/me/password', description: '修改密码' },
      { method: 'POST', path: '/users/me/avatar', description: '上传头像' },
    ],
  },
]);

type TagType = 'default' | 'info' | 'warning' | 'error' | 'success' | 'primary';

const getMethodColor = (method: string): TagType => {
  const map: Record<string, TagType> = {
    GET: 'success',
    POST: 'warning',
    PUT: 'info',
    DELETE: 'error',
    PATCH: 'default',
  };
  return map[method] || 'default';
};
</script>

<style scoped>
.api-page {
  max-width: 1200px;
  margin: 0 auto;
}

.api-item {
  border-bottom: 1px solid var(--hh-border-light);
}

.api-item:last-child {
  border-bottom: none;
}

.api-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 0;
  cursor: pointer;
}

.api-header:hover {
  background: var(--hh-bg-secondary);
  margin: 0 -12px;
  padding: 12px;
  border-radius: 8px;
}

.api-path {
  font-family: monospace;
  font-weight: 500;
  color: var(--hh-text);
}

.api-desc {
  color: var(--hh-text-secondary);
  font-size: 13px;
  flex: 1;
}

.expand-icon {
  color: var(--hh-text-tertiary);
  transition: transform 0.2s ease;
}

.expand-icon.expanded {
  transform: rotate(90deg);
}

.api-detail {
  padding: 12px;
  background: var(--hh-bg-secondary);
  border-radius: 8px;
  margin-bottom: 8px;
}

.api-detail p {
  font-size: 13px;
  margin-bottom: 8px;
}
</style>
