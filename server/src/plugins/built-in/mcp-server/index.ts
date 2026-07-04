import { HomeHubPlugin, HomeHubPluginMeta, McpToolExports } from '../../types/plugin.types';

const meta: HomeHubPluginMeta = {
  id: 'builtin.mcp-server',
  name: 'MCP Server',
  version: '1.0.0',
  description: '内置 MCP Server 插件，将 REST API 映射为 MCP Tools',
  author: 'HomeHub Team',
  extensionPoints: ['mcp-tool'],
};

// 内置 MCP 工具定义
const builtinTools: McpToolExports[] = [
  // ═══════════════════════════════════════════
  // 库存工具 (Stock)
  // ═══════════════════════════════════════════
  {
    name: 'search_items',
    description: '搜索库存物品',
    method: 'GET',
    apiPath: '/v1/stock/invItems',
    parameters: {
      query: { type: 'string', optional: true, description: '搜索关键词' },
      category: { type: 'string', optional: true, description: '物品类别' },
      location: { type: 'string', optional: true, description: '位置ID' },
      expiring_in_days: { type: 'number', optional: true, description: 'N天内过期' },
      limit: { type: 'number', optional: true, description: '返回数量限制' },
    },
  },
  {
    name: 'get_item',
    description: '获取单个库存物品详情',
    method: 'GET',
    apiPath: '/v1/stock/invItems/{item_id}',
    parameters: {
      item_id: { type: 'string', description: '物品ID' },
    },
  },
  {
    name: 'add_item',
    description: '添加物品到库存',
    method: 'POST',
    apiPath: '/v1/stock/invItems',
    parameters: {
      name: { type: 'string', description: '物品名称' },
      quantity: { type: 'number', optional: true, default: 1, description: '数量' },
      unit: { type: 'string', optional: true, default: '个', description: '单位' },
      location_id: { type: 'string', optional: true, description: '位置ID' },
      expiry_date: { type: 'number', optional: true, description: '过期日期时间戳' },
      type: { type: 'string', optional: true, default: 'generic', description: '物品类型' },
      barcode: { type: 'string', optional: true, description: '条码' },
      notes: { type: 'string', optional: true, description: '备注' },
    },
  },
  {
    name: 'consume_item',
    description: '消耗/使用物品',
    method: 'POST',
    apiPath: '/v1/stock/invItems/{item_id}/consume',
    parameters: {
      item_id: { type: 'string', description: '物品ID' },
      quantity: { type: 'number', description: '消耗数量' },
      note: { type: 'string', optional: true, description: '备注' },
    },
  },
  {
    name: 'adjust_item',
    description: '调整库存数量（盘点/纠错）',
    method: 'POST',
    apiPath: '/v1/stock/invItems/{item_id}/adjust',
    parameters: {
      item_id: { type: 'string', description: '物品ID' },
      quantity: { type: 'number', description: '调整后数量' },
      note: { type: 'string', optional: true, description: '备注' },
    },
  },
  {
    name: 'move_item',
    description: '移动物品位置',
    method: 'POST',
    apiPath: '/v1/stock/invItems/{item_id}/transfer',
    parameters: {
      item_id: { type: 'string', description: '物品ID' },
      to_location_id: { type: 'string', description: '目标位置ID' },
    },
  },
  {
    name: 'update_item',
    description: '更新物品信息',
    method: 'PUT',
    apiPath: '/v1/stock/invItems/{item_id}',
    parameters: {
      item_id: { type: 'string', description: '物品ID' },
      name: { type: 'string', optional: true, description: '物品名称' },
      quantity: { type: 'number', optional: true, description: '数量' },
      expiry_date: { type: 'number', optional: true, description: '过期日期时间戳' },
      notes: { type: 'string', optional: true, description: '备注' },
    },
  },
  {
    name: 'delete_item',
    description: '删除物品',
    method: 'DELETE',
    apiPath: '/v1/stock/invItems/{item_id}',
    parameters: {
      item_id: { type: 'string', description: '物品ID' },
    },
  },
  {
    name: 'get_stock_summary',
    description: '库存概况',
    method: 'GET',
    apiPath: '/v1/stock/summary',
    parameters: {},
  },
  {
    name: 'get_expiring_items',
    description: '即将过期物品',
    method: 'GET',
    apiPath: '/v1/stock/expiring',
    parameters: {
      days: { type: 'number', optional: true, default: 7, description: '天数' },
    },
  },
  {
    name: 'get_item_history',
    description: '查看物品操作历史',
    method: 'GET',
    apiPath: '/v1/stock/invItems/{item_id}/history',
    parameters: {
      item_id: { type: 'string', description: '物品ID' },
    },
  },

  // ═══════════════════════════════════════════
  // 清单工具 (Lists)
  // ═══════════════════════════════════════════
  {
    name: 'get_lists',
    description: '查看所有清单',
    method: 'GET',
    apiPath: '/v1/hhLists',
    parameters: {
      type: { type: 'string', optional: true, description: '清单类型' },
    },
  },
  {
    name: 'get_list',
    description: '查看单个清单详情（含条目）',
    method: 'GET',
    apiPath: '/v1/hhLists/{list_id}',
    parameters: {
      list_id: { type: 'string', description: '清单ID' },
    },
  },
  {
    name: 'create_list',
    description: '创建清单',
    method: 'POST',
    apiPath: '/v1/hhLists',
    parameters: {
      name: { type: 'string', description: '清单名称' },
      type: { type: 'string', description: '清单类型', enum: ['shopping', 'todo', 'chore', 'holiday', 'meal_plan'] },
      notes: { type: 'string', optional: true, description: '备注' },
    },
  },
  {
    name: 'update_list',
    description: '更新清单信息',
    method: 'PUT',
    apiPath: '/v1/hhLists/{list_id}',
    parameters: {
      list_id: { type: 'string', description: '清单ID' },
      name: { type: 'string', optional: true, description: '清单名称' },
      notes: { type: 'string', optional: true, description: '备注' },
    },
  },
  {
    name: 'delete_list',
    description: '删除清单',
    method: 'DELETE',
    apiPath: '/v1/hhLists/{list_id}',
    parameters: {
      list_id: { type: 'string', description: '清单ID' },
    },
  },
  {
    name: 'add_to_list',
    description: '添加到清单',
    method: 'POST',
    apiPath: '/v1/hhLists/{list_id}/invItems',
    parameters: {
      list_id: { type: 'string', description: '清单ID' },
      content: { type: 'string', description: '条目内容' },
      quantity: { type: 'number', optional: true, description: '数量' },
      assignee_id: { type: 'string', optional: true, description: '指派人ID' },
      notes: { type: 'string', optional: true, description: '备注' },
    },
  },
  {
    name: 'update_list_item',
    description: '更新清单条目',
    method: 'PUT',
    apiPath: '/v1/hhLists/invItems/{item_id}',
    parameters: {
      item_id: { type: 'string', description: '条目ID' },
      content: { type: 'string', optional: true, description: '条目内容' },
      quantity: { type: 'number', optional: true, description: '数量' },
      notes: { type: 'string', optional: true, description: '备注' },
    },
  },
  {
    name: 'delete_list_item',
    description: '删除清单条目',
    method: 'DELETE',
    apiPath: '/v1/hhLists/invItems/{item_id}',
    parameters: {
      item_id: { type: 'string', description: '条目ID' },
    },
  },
  {
    name: 'check_list_item',
    description: '打勾完成清单条目',
    method: 'POST',
    apiPath: '/v1/hhLists/invItems/{item_id}/check',
    parameters: {
      item_id: { type: 'string', description: '条目ID' },
    },
  },
  {
    name: 'uncheck_list_item',
    description: '取消完成清单条目',
    method: 'POST',
    apiPath: '/v1/hhLists/invItems/{item_id}/uncheck',
    parameters: {
      item_id: { type: 'string', description: '条目ID' },
    },
  },
  {
    name: 'assign_list_item',
    description: '指派清单条目给成员',
    method: 'POST',
    apiPath: '/v1/hhLists/invItems/{item_id}/assign',
    parameters: {
      item_id: { type: 'string', description: '条目ID' },
      assignee_id: { type: 'string', description: '指派人ID' },
    },
  },
  {
    name: 'get_my_tasks',
    description: '查看我被指派的任务',
    method: 'GET',
    apiPath: '/v1/hhLists/my-tasks',
    parameters: {},
  },
  {
    name: 'auto_replenish',
    description: '自动生成补货清单',
    method: 'POST',
    apiPath: '/v1/hhLists/auto-replenish',
    parameters: {},
  },

  // ═══════════════════════════════════════════
  // 食谱工具 (Recipes)
  // ═══════════════════════════════════════════
  {
    name: 'search_recipes',
    description: '搜索食谱',
    method: 'GET',
    apiPath: '/v1/hhRecipes',
    parameters: {
      query: { type: 'string', optional: true, description: '搜索关键词' },
    },
  },
  {
    name: 'get_recipe',
    description: '获取食谱详情',
    method: 'GET',
    apiPath: '/v1/hhRecipes/{recipe_id}',
    parameters: {
      recipe_id: { type: 'string', description: '食谱ID' },
    },
  },
  {
    name: 'create_recipe',
    description: '创建食谱',
    method: 'POST',
    apiPath: '/v1/hhRecipes',
    parameters: {
      name: { type: 'string', description: '食谱名称' },
      description: { type: 'string', optional: true, description: '描述' },
      ingredients: { type: 'array', description: '食材列表 [{name, quantity, unit}]' },
      steps: { type: 'array', description: '步骤列表' },
      prepTime: { type: 'number', optional: true, description: '准备时间(分钟)' },
      cookTime: { type: 'number', optional: true, description: '烹饪时间(分钟)' },
      servings: { type: 'number', optional: true, description: '份数' },
    },
  },
  {
    name: 'update_recipe',
    description: '更新食谱',
    method: 'PUT',
    apiPath: '/v1/hhRecipes/{recipe_id}',
    parameters: {
      recipe_id: { type: 'string', description: '食谱ID' },
      name: { type: 'string', optional: true, description: '食谱名称' },
      description: { type: 'string', optional: true, description: '描述' },
      ingredients: { type: 'array', optional: true, description: '食材列表' },
      steps: { type: 'array', optional: true, description: '步骤列表' },
    },
  },
  {
    name: 'delete_recipe',
    description: '删除食谱',
    method: 'DELETE',
    apiPath: '/v1/hhRecipes/{recipe_id}',
    parameters: {
      recipe_id: { type: 'string', description: '食谱ID' },
    },
  },
  {
    name: 'get_recipe_recommendations',
    description: '根据库存推荐食谱',
    method: 'GET',
    apiPath: '/v1/hhRecipes/recommendations',
    parameters: {
      recipe_count: { type: 'number', optional: true, description: '返回数量' },
    },
  },

  // ═══════════════════════════════════════════
  // 餐计划工具 (Meal Plans)
  // ═══════════════════════════════════════════
  {
    name: 'get_meal_plans',
    description: '查看餐计划列表',
    method: 'GET',
    apiPath: '/v1/meal-plans',
    parameters: {},
  },
  {
    name: 'get_meal_plan',
    description: '获取餐计划详情',
    method: 'GET',
    apiPath: '/v1/meal-plans/{plan_id}',
    parameters: {
      plan_id: { type: 'string', description: '餐计划ID' },
    },
  },
  {
    name: 'create_meal_plan',
    description: '创建周餐计划',
    method: 'POST',
    apiPath: '/v1/meal-plans',
    parameters: {
      weekStart: { type: 'number', description: '周开始日期时间戳' },
      weekEnd: { type: 'number', description: '周结束日期时间戳' },
    },
  },
  {
    name: 'add_meal_plan_item',
    description: '添加餐计划条目',
    method: 'POST',
    apiPath: '/v1/meal-plans/{plan_id}/invItems',
    parameters: {
      plan_id: { type: 'string', description: '餐计划ID' },
      dayOfWeek: { type: 'number', description: '星期几(0-6)' },
      mealType: { type: 'string', description: '餐次', enum: ['breakfast', 'lunch', 'dinner', 'snack'] },
      recipeId: { type: 'number', description: '食谱ID' },
      note: { type: 'string', optional: true, description: '备注' },
    },
  },
  {
    name: 'generate_shopping_from_meal_plan',
    description: '根据餐计划生成购物清单',
    method: 'POST',
    apiPath: '/v1/meal-plans/{plan_id}/generate-shopping',
    parameters: {
      plan_id: { type: 'string', description: '餐计划ID' },
    },
  },
  {
    name: 'delete_meal_plan',
    description: '删除餐计划',
    method: 'DELETE',
    apiPath: '/v1/meal-plans/{plan_id}',
    parameters: {
      plan_id: { type: 'string', description: '餐计划ID' },
    },
  },

  // ═══════════════════════════════════════════
  // 触发器/自动化工具 (Triggers & Automations)
  // ═══════════════════════════════════════════
  {
    name: 'get_bindings',
    description: '查看所有绑定',
    method: 'GET',
    apiPath: '/v1/bindings',
    parameters: {
      location_id: { type: 'string', optional: true, description: '位置ID' },
    },
  },
  {
    name: 'create_binding',
    description: '创建代码绑定',
    method: 'POST',
    apiPath: '/v1/bindings',
    parameters: {
      code: { type: 'string', description: '代码值' },
      codeType: { type: 'string', description: '代码类型', enum: ['nfc', 'qr', 'barcode', 'rfid'] },
      targetType: { type: 'string', description: '目标类型', enum: ['item', 'location', 'recipe', 'action'] },
      targetId: { type: 'number', description: '目标ID' },
      label: { type: 'string', optional: true, description: '标签' },
    },
  },
  {
    name: 'lookup_binding',
    description: '查询代码绑定',
    method: 'GET',
    apiPath: '/v1/bindings/lookup',
    parameters: {
      code: { type: 'string', description: '代码值' },
      codeType: { type: 'string', description: '代码类型' },
    },
  },
  {
    name: 'update_binding',
    description: '更新绑定',
    method: 'PUT',
    apiPath: '/v1/bindings/{binding_id}',
    parameters: {
      binding_id: { type: 'string', description: '绑定ID' },
      targetId: { type: 'number', optional: true, description: '目标ID' },
      targetType: { type: 'string', optional: true, description: '目标类型' },
      label: { type: 'string', optional: true, description: '标签' },
    },
  },
  {
    name: 'delete_binding',
    description: '删除绑定',
    method: 'DELETE',
    apiPath: '/v1/bindings/{binding_id}',
    parameters: {
      binding_id: { type: 'string', description: '绑定ID' },
    },
  },
  {
    name: 'list_automations',
    description: '查看所有自动化规则',
    method: 'GET',
    apiPath: '/v1/automations',
    parameters: {},
  },
  {
    name: 'create_automation',
    description: '创建自动化规则',
    method: 'POST',
    apiPath: '/v1/automations',
    parameters: {
      trigger_type: { type: 'string', description: '触发类型', enum: ['nfc_tap', 'qr_scan', 'barcode_scan', 'rfid_enter', 'rfid_exit', 'scheduled', 'custom'] },
      action_type: { type: 'string', description: '动作类型', enum: ['open_page', 'run_notification', 'call_mcp_tool', 'run_workflow'] },
      action_config: { type: 'object', description: '动作配置' },
      notes: { type: 'string', optional: true, description: '备注' },
    },
  },
  {
    name: 'update_automation',
    description: '更新自动化规则',
    method: 'PUT',
    apiPath: '/v1/automations/{automation_id}',
    parameters: {
      automation_id: { type: 'string', description: '自动化规则ID' },
      name: { type: 'string', optional: true, description: '规则名称' },
      triggerType: { type: 'string', optional: true, description: '触发类型' },
      actionType: { type: 'string', optional: true, description: '动作类型' },
      actionConfig: { type: 'object', optional: true, description: '动作配置' },
      enabled: { type: 'boolean', optional: true, description: '是否启用' },
    },
  },
  {
    name: 'delete_automation',
    description: '删除自动化规则',
    method: 'DELETE',
    apiPath: '/v1/automations/{automation_id}',
    parameters: {
      automation_id: { type: 'string', description: '自动化规则ID' },
    },
  },
  {
    name: 'toggle_automation',
    description: '启用/禁用自动化规则',
    method: 'POST',
    apiPath: '/v1/automations/{automation_id}/toggle',
    parameters: {
      automation_id: { type: 'string', description: '自动化规则ID' },
    },
  },

  // ═══════════════════════════════════════════
  // 扫描工具 (Scanner)
  // ═══════════════════════════════════════════
  {
    name: 'lookup_barcode',
    description: '查询条码信息（先本地后外部）',
    method: 'GET',
    apiPath: '/v1/scanner/lookup',
    parameters: {
      code: { type: 'string', description: '条码值' },
    },
  },

  // ═══════════════════════════════════════════
  // 系统数据工具 (Master Data)
  // ═══════════════════════════════════════════
  {
    name: 'get_locations',
    description: '查看所有存储位置',
    method: 'GET',
    apiPath: '/v1/mdLocations',
    parameters: {},
  },
  {
    name: 'create_location',
    description: '创建存储位置',
    method: 'POST',
    apiPath: '/v1/mdLocations',
    parameters: {
      name: { type: 'string', description: '位置名称' },
      parentId: { type: 'number', optional: true, description: '父位置ID' },
      notes: { type: 'string', optional: true, description: '备注' },
    },
  },
  {
    name: 'get_categories',
    description: '查看所有物品分类',
    method: 'GET',
    apiPath: '/v1/mdCategories',
    parameters: {},
  },
  {
    name: 'create_category',
    description: '创建物品分类',
    method: 'POST',
    apiPath: '/v1/mdCategories',
    parameters: {
      name: { type: 'string', description: '分类名称' },
    },
  },
  {
    name: 'get_tags',
    description: '查看所有标签',
    method: 'GET',
    apiPath: '/v1/mdTags',
    parameters: {},
  },
  {
    name: 'get_brands',
    description: '查看所有品牌',
    method: 'GET',
    apiPath: '/v1/mdBrands',
    parameters: {},
  },
  {
    name: 'get_units',
    description: '查看所有单位',
    method: 'GET',
    apiPath: '/v1/mdUnits',
    parameters: {},
  },

  // ═══════════════════════════════════════════
  // 仪表盘/统计工具 (Dashboard)
  // ═══════════════════════════════════════════
  {
    name: 'get_dashboard_summary',
    description: '获取家庭库存/消耗/过期全局概览',
    method: 'GET',
    apiPath: '/v1/dashboard/summary',
    parameters: {},
  },
  {
    name: 'get_waste_analysis',
    description: '获取浪费分析',
    method: 'GET',
    apiPath: '/v1/dashboard/waste-analysis',
    parameters: {},
  },
  {
    name: 'get_recent_activities',
    description: '获取最近活动记录',
    method: 'GET',
    apiPath: '/v1/dashboard/activities',
    parameters: {
      limit: { type: 'number', optional: true, description: '返回数量' },
    },
  },

  // ═══════════════════════════════════════════
  // 通知工具 (Notifications)
  // ═══════════════════════════════════════════
  {
    name: 'get_notifications',
    description: '查看通知列表',
    method: 'GET',
    apiPath: '/v1/sysNotifications',
    parameters: {
      unread: { type: 'string', optional: true, description: '只看未读: true/false' },
    },
  },
  {
    name: 'get_unread_notification_count',
    description: '获取未读通知数量',
    method: 'GET',
    apiPath: '/v1/sysNotifications/unread-count',
    parameters: {},
  },
  {
    name: 'mark_notification_read',
    description: '标记通知为已读',
    method: 'POST',
    apiPath: '/v1/sysNotifications/{notification_id}/read',
    parameters: {
      notification_id: { type: 'string', description: '通知ID' },
    },
  },
  {
    name: 'mark_all_notifications_read',
    description: '标记所有通知为已读',
    method: 'POST',
    apiPath: '/v1/sysNotifications/read-all',
    parameters: {},
  },

  // ═══════════════════════════════════════════
  // 历史记录工具 (History)
  // ═══════════════════════════════════════════
  {
    name: 'get_timeline',
    description: '查看家庭操作时间线',
    method: 'GET',
    apiPath: '/v1/history/timeline',
    parameters: {
      type: { type: 'string', optional: true, description: '操作类型: add/consume/transfer/adjust' },
      source: { type: 'string', optional: true, description: '来源: manual/barcode/nfc/rfid/voice/vision/mcp' },
      startDate: { type: 'string', optional: true, description: '开始日期' },
      endDate: { type: 'string', optional: true, description: '结束日期' },
      page: { type: 'number', optional: true, description: '页码' },
      limit: { type: 'number', optional: true, description: '每页数量' },
    },
  },
];

// 注册为扩展点
const mcpToolExports = builtinTools.map(tool => ({
  name: tool.name,
  description: tool.description,
  method: tool.method,
  apiPath: tool.apiPath,
  parameters: tool.parameters,
}));

export const McpServerPlugin: HomeHubPlugin = {
  meta,
  exports: {
    tools: mcpToolExports,
  },
  async onLoad(ctx) {
    ctx.logger.info(`MCP Server 插件加载完成，注册了 ${mcpToolExports.length} 个工具`);
  },
  async onUnload(ctx) {
    ctx.logger.info('MCP Server 插件已卸载');
  },
};
