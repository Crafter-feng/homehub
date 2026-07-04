// ═══════════════════════════════════════════════════════
// 统一 schema 导出 — 按领域分组
// ═══════════════════════════════════════════════════════

// ── 认证 & 家庭 ──
export { users, families, familyMembers, apiTokens, refreshTokens } from './auth';

// ── 主数据 ──
export { mdLocations, mdCategories, mdTags, mdItemTags, mdUnits, mdBrands, mdShops } from './master-data';

// ── 库存（产品 + 物品 + 流水 + 文档） ──
export { invProducts, invItems, invItemBatches, invStockTransactions, invDocuments } from './inventory';

// ── 家庭生活（列表/食谱/餐计划/日历/预算） ──
export {
  hhLists, hhListItems, hhListItemComments, hhHolidayTemplates,
  hhRecipes, hhMealPlans, hhMealPlanItems,
  hhCalendarEvents,
  hhBudgetEntries, hhBudgetCategories, hhBudgetSubscriptions,
} from './household';

// ── 系统（扫码/触发器/通知/插件/自定义字段） ──
export {
  sysTriggerBindings, sysNfcTagState, sysRfidReaders, sysRfidZones,
  sysAutomationTriggers, sysEncoderJobs,
  sysNotificationRules, sysNotifications,
  sysPluginData,
  sysCustomFields, sysCustomValues,
} from './system';