import { InferSelectModel, InferInsertModel } from 'drizzle-orm';
import * as schema from './schema';

/**
 * Database type — intentionally `any` to avoid dual-driver union issues.
 *
 * Drizzle's SQLite and Postgres drivers share the same query-builder API at
 * runtime, but their TypeScript signatures are incompatible overload unions.
 * Using the concrete union `BetterSQLite3Database | NodePgDatabase` causes
 * every chained call (select/insert/update/delete/transaction) to fail
 * type-checking because TS cannot narrow the union across method chains.
 *
 * All entity types below are properly inferred from the schema.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Database = any;

/**
 * Transaction context type for type-safe transaction callbacks.
 * Provides the same query-builder methods as Database but represents
 * a transactional context with automatic rollback on error.
 */
export interface TransactionContext {
  select: Database['select'];
  insert: Database['insert'];
  update: Database['update'];
  delete: Database['delete'];
}

// Entity inference types — auto-derived from Drizzle schema
export type ItemSelect = InferSelectModel<typeof schema.items>;
export type ItemInsert = InferInsertModel<typeof schema.items>;
export type ItemBatchSelect = InferSelectModel<typeof schema.itemBatches>;
export type ItemBatchInsert = InferInsertModel<typeof schema.itemBatches>;
export type StockTransactionSelect = InferSelectModel<typeof schema.stockTransactions>;
export type StockTransactionInsert = InferInsertModel<typeof schema.stockTransactions>;
export type UserSelect = InferSelectModel<typeof schema.users>;
export type UserInsert = InferInsertModel<typeof schema.users>;
export type FamilySelect = InferSelectModel<typeof schema.families>;
export type FamilyMemberSelect = InferSelectModel<typeof schema.familyMembers>;
export type LocationSelect = InferSelectModel<typeof schema.locations>;
export type LocationInsert = InferInsertModel<typeof schema.locations>;
export type CategorySelect = InferSelectModel<typeof schema.categories>;
export type TagSelect = InferSelectModel<typeof schema.tags>;
export type ListSelect = InferSelectModel<typeof schema.lists>;
export type ListItemSelect = InferSelectModel<typeof schema.listItems>;
export type ListItemCommentSelect = InferSelectModel<typeof schema.listItemComments>;
export type RecipeSelect = InferSelectModel<typeof schema.recipes>;
export type TriggerBindingSelect = InferSelectModel<typeof schema.triggerBindings>;
export type NfcTagStateSelect = InferSelectModel<typeof schema.nfcTagState>;
export type ScanLogSelect = InferSelectModel<typeof schema.scanLogs>;
export type AutomationTriggerSelect = InferSelectModel<typeof schema.automationTriggers>;
export type NotificationRuleSelect = InferSelectModel<typeof schema.notificationRules>;
export type NotificationSelect = InferSelectModel<typeof schema.notifications>;
export type UnitSelect = InferSelectModel<typeof schema.units>;
export type BrandSelect = InferSelectModel<typeof schema.brands>;
export type RefreshTokenSelect = InferSelectModel<typeof schema.refreshTokens>;
export type ApiTokenSelect = InferSelectModel<typeof schema.apiTokens>;
export type DocumentSelect = InferSelectModel<typeof schema.documents>;
export type DocumentInsert = InferInsertModel<typeof schema.documents>;
