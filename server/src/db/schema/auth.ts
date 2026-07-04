// ═══════════════════════════════════════════════════════
// 认证 & 家庭 — 用户、家庭、成员、令牌
// ═══════════════════════════════════════════════════════

import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

// ── 用户 ──
export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
  passwordHash: text('password_hash').notNull(),
  avatar: text('avatar'),
  role: text('role').default('editor'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

// ── 家庭 ──
export const families = sqliteTable('families', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  inviteCode: text('invite_code').notNull().unique(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

// ── 家庭成员 ──
export const familyMembers = sqliteTable('family_members', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  familyId: integer('family_id').notNull().references(() => families.id, { onDelete: 'cascade' }),
  role: text('role', { enum: ['admin', 'editor', 'viewer'] }).notNull().default('editor'),
  joinedAt: integer('joined_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

// ── API 令牌 ──
export const apiTokens = sqliteTable('api_tokens', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').notNull().references(() => users.id),
  familyId: integer('family_id').notNull().references(() => families.id),
  name: text('name').notNull(),
  tokenHash: text('token_hash').notNull().unique(),
  tokenPrefix: text('token_prefix').notNull(),
  permissions: text('permissions', { mode: 'json' }).notNull().$type<string[]>(),
  expiresAt: integer('expires_at', { mode: 'timestamp' }),
  lastUsedAt: integer('last_used_at', { mode: 'timestamp' }),
  isRevoked: integer('is_revoked', { mode: 'boolean' }).notNull().default(false),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

// ── 刷新令牌 ──
export const refreshTokens = sqliteTable('refresh_tokens', {
  id: text('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id),
  expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
  isRevoked: integer('is_revoked', { mode: 'boolean' }).notNull().default(false),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});