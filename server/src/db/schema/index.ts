// ═══════════════════════════════════════════════════════
// 统一 schema 导出 — 按领域分组
// ═══════════════════════════════════════════════════════

// ── 认证 & 家庭 ──
export { users, families, familyMembers, apiTokens, refreshTokens } from './auth';

// ── 主数据 ──
export { mdLocations, mdCategories, mdTags, mdItemTags, mdUnits, mdBrands, mdShops } from './master-data';

// ── 库存（产品 + 批次 + 流水 + 文档） ──
export { invProducts, invBatches, invStockLog, invProductBarcodes, invDocuments } from './inventory';

// 兼容别名（旧代码过渡用，后续删除）
export { invProducts as invItems } from './inventory';
export { invBatches as invItemBatches } from './inventory';
export { invStockLog as invStockTransactions } from './inventory';

// ── 家庭生活（列表/食谱/餐计划/日历/预算） ──
export {
  hhLists, hhListItems, hhListItemComments, hhHolidayTemplates,
  hhRecipes, hhMealPlans, hhMealPlanItems,
  hhCalendarEvents,
  hhBudgetEntries, hhBudgetCategories, hhBudgetSubscriptions,
} from './household';

// ── 系统（扫码/触发器/通知/插件/自定义字段/硬件） ──
export {
  sysTriggerBindings, sysNfcTagState, sysRfidReaders, sysRfidZones,
  sysAutomationTriggers, sysEncoderJobs,
  sysNotificationRules, sysNotifications,
  sysPluginData,
  sysCustomFields, sysCustomValues,
  sysHardwareDevices, sysPrintJobs,
} from './system';