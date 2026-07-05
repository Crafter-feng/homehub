import { InferSelectModel, InferInsertModel } from 'drizzle-orm';
import * as schema from './schema';

/**
 * Database type — intentionally `any` to avoid dual-driver union issues.
 *
 * TODO: Fix this by:
 * 1. Using SQLite-only type when PG support is not needed
 * 2. OR creating a wrapper interface that both drivers implement
 * 3. AND fixing all .get() calls to handle undefined returns
 *
 * This is the largest technical debt item in the project.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Database = any;

/**
 * Transaction context type for type-safe transaction callbacks.
 */
export interface TransactionContext {
  select: Database['select'];
  insert: Database['insert'];
  update: Database['update'];
  delete: Database['delete'];
}

// ── auth ──
export type UserSelect = InferSelectModel<typeof schema.users>;
export type UserInsert = InferInsertModel<typeof schema.users>;
export type FamilySelect = InferSelectModel<typeof schema.families>;
export type FamilyMemberSelect = InferSelectModel<typeof schema.familyMembers>;
export type RefreshTokenSelect = InferSelectModel<typeof schema.refreshTokens>;
export type ApiTokenSelect = InferSelectModel<typeof schema.apiTokens>;

// ── master-data ──
export type LocationSelect = InferSelectModel<typeof schema.mdLocations>;
export type LocationInsert = InferInsertModel<typeof schema.mdLocations>;
export type CategorySelect = InferSelectModel<typeof schema.mdCategories>;
export type TagSelect = InferSelectModel<typeof schema.mdTags>;
export type UnitSelect = InferSelectModel<typeof schema.mdUnits>;
export type BrandSelect = InferSelectModel<typeof schema.mdBrands>;

// ── inventory ──
export type ProductSelect = InferSelectModel<typeof schema.invProducts>;
export type ProductInsert = InferInsertModel<typeof schema.invProducts>;
export type BatchSelect = InferSelectModel<typeof schema.invBatches>;
export type BatchInsert = InferInsertModel<typeof schema.invBatches>;
export type StockLogSelect = InferSelectModel<typeof schema.invStockLog>;
export type StockLogInsert = InferInsertModel<typeof schema.invStockLog>;
export type DocumentSelect = InferSelectModel<typeof schema.invDocuments>;
export type DocumentInsert = InferInsertModel<typeof schema.invDocuments>;

// 兼容别名（旧代码过渡用）
export type ItemSelect = ProductSelect;
export type ItemInsert = ProductInsert;
export type ItemBatchSelect = BatchSelect;
export type ItemBatchInsert = BatchInsert;
export type StockTransactionSelect = StockLogSelect;
export type StockTransactionInsert = StockLogInsert;

// ── household ──
export type ListSelect = InferSelectModel<typeof schema.hhLists>;
export type ListItemSelect = InferSelectModel<typeof schema.hhListItems>;
export type ListItemCommentSelect = InferSelectModel<typeof schema.hhListItemComments>;
export type RecipeSelect = InferSelectModel<typeof schema.hhRecipes>;

// ── system ──
export type TriggerBindingSelect = InferSelectModel<typeof schema.sysTriggerBindings>;
export type NfcTagStateSelect = InferSelectModel<typeof schema.sysNfcTagState>;
export type AutomationTriggerSelect = InferSelectModel<typeof schema.sysAutomationTriggers>;
export type NotificationRuleSelect = InferSelectModel<typeof schema.sysNotificationRules>;
export type NotificationSelect = InferSelectModel<typeof schema.sysNotifications>;