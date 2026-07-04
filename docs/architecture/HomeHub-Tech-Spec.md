# HomeHub — 技术规格书 (Technical Specification)

> 版本：v1.4 | 基于 PRD v1.5 | 日期：2026-06-29

---

## 一、系统架构

### 1.1 架构总览

```
┌─────────────────────────────────────────────────────────────┐
│                      前端层 (Vue 3 + Naive UI)               │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐      │
│  │  库存页   │ │  位置页   │ │编码打印页 │ │  设置页  │      │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘      │
│       │            │            │            │             │
│  ┌────▼────────────▼────────────▼────────────▼─────┐      │
│  │      统一 Scanner composable                    │      │
│  │   (NFC / QR / 条码 / RFID → 同输出)             │      │
│  └──────────────────────┬──────────────────────────┘      │
│                     Pinia Store (状态管理)                  │
│              Axios → REST API / WebSocket                  │
├─────────────────────────────────────────────────────────────┤
│                   网关层 (Nginx / Caddy)                     │
├─────────────────────────────────────────────────────────────┤
│                      后端层 (NestJS)                        │
│  ┌──────────────┐ ┌──────────┐ ┌──────────┐              │
│  │ PostgreSQL   │ │ SQLite   │ │  Redis   │  (Session/Cache)│
│  │ (主推/所有部署)│ │(单用户   │ │  (可选)  │                 │
│  └──────────────┘ └──────────┘ └──────────┘                 │
│  │          触发与输出核心引擎                          │   │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐          │   │
│  │  │ Trigger  │ │ Encoder │ │   HAL    │          │   │
│  │  │ Resolver │ │ QR/NFC  │ │打印机/   │          │   │
│  │  │ Pipeline │ │ 条码生成 │ │写卡器    │          │   │
│  │  │ 数据字典  │ │ 标签排版 │ │设备管理  │          │   │
│  │  └──────────┘ └──────────┘ └──────────┘          │   │
│  └────────────────────────────────────────────────────┘   │
│         ┌──────────────────────────────────────┐           │
│         │      Module Layer (业务模块 22个)      │           │
│         └──────────────────────────────────────┘           │
│         ┌──────────────────────────────────────┐           │
│         │  Drizzle ORM (通用物品+状态机+绑定字典)│           │
│         └──────────────────────────────────────┘           │
├─────────────────────────────────────────────────────────────┤
│                      数据层                                 │
│  ┌──────────────┐ ┌──────────┐ ┌──────────┐                 │
│  │ PostgreSQL   │ │ SQLite   │ │  Redis   │  (Session/Cache)│
│  │ (主推/默认部署)│ │(单用户   │ │  (可选)  │                │
│  │ JSONB全文索引 │ │ 自部署)  │ │          │                │
│  └──────────────┘ └──────────┘ └──────────┘                 │
```


### 1.2 技术栈明细

| 层面 | 技术 | 版本要求 | 说明 |
|------|------|---------|------|
| 前端框架 | Vue 3 | >= 3.5 | Composition API + `<script setup>` |
| 构建工具 | Vite | >= 6.0 | HMR + Tree-shaking |
| UI 组件库 | Naive UI | >= 2.40 | CSS-in-JS 主题系统 |
| 状态管理 | Pinia | >= 2.2 | TypeScript 一等公民 |
| 路由 | Vue Router | >= 4.5 | 懒加载路由 |
| HTTP 客户端 | Axios | >= 1.7 | 拦截器/Token 刷新 |
| PWA | vite-plugin-pwa | >= 0.21 | 离线缓存/Install Prompt |
| 后端框架 | NestJS | >= 11.0 | Fastify 适配器 |
| ORM | Drizzle ORM | >= 0.40 | Query Builder + Migrations |
| 数据库 | PostgreSQL (主推) / SQLite (单用户自部署备选) | — | JSONB 原生支持 JSON 查询、全文索引、pgvector 未来扩展；Drizzle ORM 一行配置切换 |
| MCP | 内置 Plugin (builtin.mcp-server) | — | 基于 mcp-tool 扩展点自动收集，可搭配任何 MCP 兼容 Agent |
| 认证 | @nestjs/jwt + @nestjs/passport | — | JWT 双 Token |
| 验证 | class-validator + class-transformer | — | DTO 校验 |
| WebSocket | @nestjs/websockets | — | 实时通知 |
| 条码 | quagga2 + zxing/browser | — | 浏览器端扫码 |
| NFC | Web NFC API (浏览器原生) + NDEF URL 跳转 (iOS) | Chrome Android >= 89 | NDEF 读写(Android) / URL 跳转(iOS) |
| 语音 | Web Speech API / MediaRecorder | — | 语音转文字 |
| 测试 | Vitest + Playwright | — | UT + E2E |

### 1.3 项目目录结构

> **插件系统参考：** [HomeHub-Plugin-Arch.md](./HomeHub-Plugin-Arch.md) — 扩展点、插件生命周期、多语言运行时、安全设计

```
homehub/
├── client/                          # 前端项目
│   ├── public/
│   │   ├── manifest.json            # PWA 配置
│   │   ├── sw.js                    # Service Worker
│   │   └── nfc/                     # NFC NDEF 处理（Web Worker）
│   ├── src/
│   │   ├── App.vue
│   │   ├── main.ts
│   │   ├── router/
│   │   │   └── index.ts             # 路由定义
│   │   ├── stores/                  # Pinia Stores
│   │   │   ├── auth.store.ts
│   │   │   ├── stock.store.ts
│   │   │   ├── scanner.store.ts       # 统一扫描器状态
│   │   │   ├── trigger.store.ts       # 触发动作配置
│   │   │   └── notification.store.ts
│   │   ├── api/                     # API 封装
│   │   │   ├── client.ts            # Axios 实例 + 拦截器
│   │   │   ├── auth.api.ts
│   │   │   ├── stock.api.ts
│   │   │   └── nfc.api.ts
│   │   ├── composables/             # 组合式函数
│   │   │   ├── useScanner.ts        # 统一 Scanner composable（聚合NFC/QR/条码）
│   │   │   ├── useNfc.ts            # Web NFC 封装（Android）
│   │   │   ├── useBarcode.ts        # 扫码封装
│   │   │   ├── useVoice.ts          # 语音输入封装
│   │   │   ├── usePwa.ts            # PWA/Install 逻辑
│   │   │   └── useBrowserDetect.ts  # 浏览器检测+引导
│   │   ├── components/              # 通用组件
│   │   │   ├── ScannerButton.vue    # 统一扫描按钮（NFC + QR + 条码）
│   │   │   ├── VoiceInput.vue       # 语音输入组件
│   │   │   ├── ItemCard.vue         # 物品卡片
│   │   │   ├── LocationTree.vue     # 位置树
│   │   │   └── ExpiryBadge.vue      # 保质期标签
│   │   ├── views/                   # 页面
│   │   │   ├── auth/
│   │   │   ├── stock/
│   │   │   ├── locations/
│   │   │   ├── shopping-list/
│   │   │   ├── recipes/
│   │   │   ├── encoder/           # 编码生成/标签打印/硬件管理
│   │   │   ├── dashboard/
│   │   │   └── settings/
│   │   ├── layouts/
│   │   │   ├── DesktopLayout.vue
│   │   │   └── MobileLayout.vue
│   │   ├── utils/
│   │   │   ├── units.ts             # 单位转换（斤/两/克）
│   │   │   ├── date.ts              # 日期格式化
│   │   │   └── barcode.ts           # 条码解析
│   │   └── styles/
│   │       ├── vars.css             # CSS 变量
│   │       └── theme.ts             # Naive UI 主题
│   ├── vite.config.ts
│   ├── tsconfig.json
│   └── package.json
│
├── server/                          # 后端项目
│   ├── src/
│   │   ├── main.ts                  # 入口 + Fastify
│   │   ├── app.module.ts
│   │   ├── common/                  # 公共模块
│   │   │   ├── guards/
│   │   │   ├── decorators/
│   │   │   ├── filters/
│   │   │   └── pipes/
│   │   ├── config/                  # 配置
│   │   │   ├── database.config.ts   # 数据库适配器配置
│   │   │   ├── auth.config.ts
│   │   │   └── mcp.config.ts
│   │   ├── db/                      # 数据库
│   │   │   ├── schema/              # Drizzle Schema
│   │   │   ├── migrations/
│   │   │   └── drizzle.config.ts
│   │   ├── modules/                 # 业务模块（22个）
│   │   │   ├── auth/
│   │   │   ├── users/
│   │   │   ├── families/
│   │   │   ├── stock/
│   │   │   ├── locations/
│   │   │   ├── lists/               # 统一清单系统（购物/待办/家务/节日备货）
│   │   │   ├── recipes/
│   │   │   ├── meal-plans/
│   │   │   ├── documents/
│   │   │   ├── notifications/
│   │   │   ├── barcode/
│   │   │   ├── iot_tags/           # 物联标签管理（NFC/QR/条码/RFID 标签绑定）
│   │   │   ├── history/
│   │   │   ├── dashboard/
│   │   │   ├── scanner/           # 统一 Scanner（NFC/QR/条码/RFID 输入抽象）
│   │   │   ├── trigger/           # 触发→动作引擎（Resolver + Pipeline + Binding）
│   │   │   ├── encoder/           # 编码输出层（QR/NFC/K条码生成 + 标签排版）
│   │   │   ├── hardware/          # 硬件抽象层 HAL（打印机/NFC写卡器）
│   │   │   ├── mcp/
│   │   │   └── admin/
│   │   └── mcp/                    # MCP Server
│   │       ├── mcp.module.ts
│   │       └── tools/
│   └── package.json
│
├── hardware/                        # 硬件相关
│   ├── rfid-gateway/                # ESP32 RFID 网关
│   │   ├── firmware/
│   │   └── schema.yaml
│   └── nfc-tag-generator/           # NFC 标签批量写入工具
│
├── docker/                          # Docker 配置
│   ├── Dockerfile
│   └── docker-compose.yml
│
├── docs/
│   ├── PRD.md
│   ├── TECH-SPEC.md                 # 本文档
│   └── API.md
│
├── scripts/
│   ├── seed.ts                      # 种子数据
│   └── migrate.ts                   # 数据迁移（Grocy/HomeBox）
│
└── package.json
```

---

## 二、API 设计

### 2.1 API 规范

- **基础路径：** `/api/v1`
- **协议：** HTTP/2 (MVP) / HTTPS (生产)
- **数据格式：** JSON (Content-Type: `application/json`)
- **认证：** `Authorization: Bearer <token>`
- **分页：** `?page=1&limit=20` → `{ data: [], total: number, page: number, limit: number }`
- **错误格式：** `{ statusCode: number, message: string, error?: string }`
- **日期格式：** ISO 8601 (`2026-06-28T09:00:00.000Z`)

### 2.2 认证 API

```
POST   /api/v1/auth/register          # 注册
POST   /api/v1/auth/login             # 登录 → { accessToken, refreshToken, user }
POST   /api/v1/auth/refresh           # 刷新 Token → { accessToken, refreshToken }
POST   /api/v1/auth/logout            # 注销（使 refreshToken 失效）
GET    /api/v1/auth/me                # 获取当前用户信息
PUT    /api/v1/auth/password          # 修改密码

# API Token 管理
GET    /api/v1/auth/tokens            # 列出 API Token
POST   /api/v1/auth/tokens            # 创建 API Token
DELETE /api/v1/auth/tokens/:id        # 删除/吊销 API Token
```

### 2.3 家庭空间 API

```
POST   /api/v1/families               # 创建家庭空间
GET    /api/v1/families/:id            # 获取家庭信息
PUT    /api/v1/families/:id            # 更新家庭信息
POST   /api/v1/families/:id/invite    # 生成邀请码
POST   /api/v1/families/join          # 通过邀请码加入
GET    /api/v1/families/:id/members   # 成员列表
PUT    /api/v1/families/members/:id   # 修改成员角色
DELETE /api/v1/families/members/:id   # 移除成员
```

### 2.4 库存 API

```
GET    /api/v1/stock/items                  # 物品列表 (支持 query/category/location/expiring 筛选)
POST   /api/v1/stock/items                  # 创建物品
GET    /api/v1/stock/items/:id              # 物品详情 (含批次历史)
PUT    /api/v1/stock/items/:id              # 更新物品
DELETE /api/v1/stock/items/:id              # 删除物品

POST   /api/v1/stock/items/:id/consume      # 消耗 → { quantity, note? }
POST   /api/v1/stock/items/:id/transfer     # 转移 → { toLocationId, quantity }
POST   /api/v1/stock/items/:id/adjust       # 调整数量 → { quantity }

GET    /api/v1/stock/items/:id/history      # 操作历史
GET    /api/v1/stock/expiring               # 即将过期列表 ?days=7
GET    /api/v1/stock/summary                # 库存概况（总数/品类分布/临期数量）
GET    /api/v1/stock/statistics             # 消耗统计 ?period=month

# 批次
GET    /api/v1/stock/batches                # 批次列表 ?itemId
POST   /api/v1/stock/batches                # 创建批次
```

### 2.5 位置 API

```
GET    /api/v1/locations                    # 位置树（三级结构）
POST   /api/v1/locations                    # 创建位置
GET    /api/v1/locations/:id                # 位置详情（含该位置的物品列表）
PUT    /api/v1/locations/:id                # 更新位置
DELETE /api/v1/locations/:id                # 删除位置（子位置可选上移，?cascade=true）
```

### 2.6 统一清单 API

统一管理购物清单、待办清单、定期家务、节日备货。

#### 清单管理

```
GET    /api/v1/lists                       # 清单列表（可筛选 type）
POST   /api/v1/lists                       # 创建清单 → { name, type, config? }
GET    /api/v1/lists/:id                   # 清单详情
PUT    /api/v1/lists/:id                   # 更新清单
DELETE /api/v1/lists/:id                   # 删除清单
GET    /api/v1/lists/my-tasks              # 我被指派的条目（跨所有清单聚合）
```

#### 清单条目

```
POST   /api/v1/lists/:id/items             # 添加条目
PUT    /api/v1/lists/items/:id             # 更新条目
DELETE /api/v1/lists/items/:id             # 删除条目
POST   /api/v1/lists/items/:id/check       # 打勾完成 → 按类型触发对应行为
                                          #   shopping → 自动入库
                                          #   chore → 自动重置 dueAt
                                          #   todo → 标记完成
POST   /api/v1/lists/items/:id/uncheck     # 取消完成
POST   /api/v1/lists/items/:id/assign      # 指派成员 → { assigneeId }
```

#### 清单评论

```
GET    /api/v1/lists/items/:id/comments    # 条目评论列表
POST   /api/v1/lists/items/:id/comments    # 添加评论
```

#### 特殊行为

```
POST   /api/v1/lists/auto-replenish        # 自动补货（低于阈值→加入 type=shopping 的清单）
GET    /api/v1/lists/holiday-templates     # 节日模板列表
POST   /api/v1/lists/from-template         # 从节日模板创建清单
```

### 2.7 食谱 & 餐饮计划 API

```
GET    /api/v1/recipes                      # 食谱列表
POST   /api/v1/recipes                      # 创建食谱
GET    /api/v1/recipes/:id                  # 食谱详情
PUT    /api/v1/recipes/:id                  # 更新食谱
DELETE /api/v1/recipes/:id                  # 删除食谱
GET    /api/v1/recipes/recommendations      # 库存推荐食谱

GET    /api/v1/meal-plans                   # 餐饮计划列表
POST   /api/v1/meal-plans                   # 创建周计划
GET    /api/v1/meal-plans/:id               # 计划详情
PUT    /api/v1/meal-plans/:id               # 更新计划
DELETE /api/v1/meal-plans/:id               # 删除计划
POST   /api/v1/meal-plans/:id/generate-shopping  # 根据餐饮计划生成购物清单
```

### 2.8 统一触发层 API (Scanner + Trigger + Binding)

#### Scanner API（统一扫描入口）

```
POST   /api/v1/scanner/scan                # 统一扫描事件 → { codeType, code, metadata? }
# 内部流程：lookup trigger_bindings → resolve → execute pipeline
# 返回: { binding, action, page?, hints? }

GET    /api/v1/scanner/logs                 # 扫描操作日志
GET    /api/v1/scanner/status               # 各种 Scanner 可用状态
```

#### Trigger Binding API（数据字典）

```
GET    /api/v1/bindings                     # 触发绑定列表
POST   /api/v1/bindings                     # 创建绑定 (code, codeType, targetType, targetId)
GET    /api/v1/bindings/:id                 # 查询绑定详情
PUT    /api/v1/bindings/:id                 # 更新绑定
DELETE /api/v1/bindings/:id                 # 删除绑定
GET    /api/v1/bindings/lookup              # 通过 code+codeType 查找绑定
```

#### Automation Trigger API（自动化规则）

```
GET    /api/v1/automations                  # 触发规则列表
POST   /api/v1/automations                  # 创建触发规则
PUT    /api/v1/automations/:id              # 更新触发规则
DELETE /api/v1/automations/:id              # 删除触发规则
POST   /api/v1/automations/test             # 手动测试触发规则
```

#### RFID Reader API（仅 RFID 特需）

```
POST   /api/v1/rfid/readers/register        # 注册读卡器
POST   /api/v1/rfid/readers/heartbeat       # 读卡器心跳
GET    /api/v1/rfid/zones                   # 区域映射列表
POST   /api/v1/rfid/zones                   # 创建区域映射
PUT    /api/v1/rfid/zones/:id               # 更新区域映射
DELETE /api/v1/rfid/zones/:id               # 删除区域映射
WS     /api/v1/rfid/events                  # 实时 RFID 事件
```

### 2.9 编码输出层 API (Encoder + HAL)

#### Encoder API（编码生成）

```
POST   /api/v1/encoder/generate             # 生成编码 → { type, targetType, targetIds }
# 返回 QR 图片 / NFC NDEF 数据 / 条码图片

POST   /api/v1/encoder/generate-batch       # 批量生成 → { type, targets: [{targetType, targetId}] }
# 返回 PDF（多码一页）或 ZIP（单码文件打包）

GET    /api/v1/encoder/jobs                 # 生成历史记录
```

#### HAL API（硬件管理）

```
GET    /api/v1/hardware/devices             # 已注册设备列表
POST   /api/v1/hardware/devices             # 注册新设备
PUT    /api/v1/hardware/devices/:id         # 更新设备配置
DELETE /api/v1/hardware/devices/:id         # 移除设备
POST   /api/v1/hardware/print               # 发送打印任务 → PrintJob
GET    /api/v1/hardware/print/jobs          # 打印任务队列
GET    /api/v1/hardware/print/jobs/:id      # 打印状态
POST   /api/v1/hardware/nfc/write           # 写入 NFC 标签
```

### 2.10 通知 API

```
GET    /api/v1/notifications                # 通知列表
PUT    /api/v1/notifications/:id/read       # 标记已读
POST   /api/v1/notifications/settings       # 通知偏好设置
```

### 2.11 设备管理（通过通用物品模型）

> **设计决策：** 设备不再使用独立的 `devices` 表，而是通过通用物品模型 `items` 表 + `type='electronic_device'` + `customFields` JSON 字段统一管理。详见 PRD v1.5 §4.6 通用物品模型设计。

设备类物品的 `customFields` 存储以下字段：

```json
{
  "brand": "海尔",
  "model": "BCD-470WDPG",
  "serialNumber": "HR202501001",
  "warrantyEnd": "2028-01-15",
  "warrantyProvider": "海尔官方",
  "purchaseChannel": "京东自营",
  "status": "in_use"          // in_use / stored / broken / disposed / sold
}
```

设备相关的 API 路径通过物品 API（§2.4）+ 类型筛选实现：

```
GET    /api/v1/stock/items?type=electronic_device    # 设备列表

# 维修记录 → 使用通用 stock_transactions (type='adjust', note 含维修信息)
#           + 通用附件系统 (documents 模块) 存储保修卡/说明书/发票
# 维护提醒 → 使用 notification_rules (triggerType='custom', 条件为 customFields.warrantyEnd)
```

> **与旧设计的差异：** 旧版 Tech-Spec 使用独立的 `devices` 表 + `repair_records` 表 + `device_documents` 表。v1.4 起统一为通用物品模型，减少表数量和 API 复杂度，所有设备操作走标准物品 CRUD。

---

## 三、数据库 Schema（完整 Drizzle ORM）

### 3.1 用户与认证

```typescript
import { sqliteTable, text, integer, real, blob } from 'drizzle-orm/sqlite-core';
import { relations } from 'drizzle-orm';

// === 用户 ===
export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
  passwordHash: text('password_hash').notNull(),
  avatar: text('avatar'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

// === 家庭空间 ===
export const families = sqliteTable('families', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  inviteCode: text('invite_code').notNull().unique(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

// === 家庭成员 ===
export const familyMembers = sqliteTable('family_members', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  familyId: integer('family_id').notNull().references(() => families.id, { onDelete: 'cascade' }),
  role: text('role', { enum: ['admin', 'editor', 'viewer'] }).notNull().default('editor'),
  joinedAt: integer('joined_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

// === API Token ===
export const apiTokens = sqliteTable('api_tokens', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').notNull().references(() => users.id),
  familyId: integer('family_id').notNull().references(() => families.id),
  name: text('name').notNull(),
  tokenHash: text('token_hash').notNull().unique(),      // SHA-256 哈希存储
  tokenPrefix: text('token_prefix').notNull(),            // hb_xxxxxxxx 前8位
  permissions: text('permissions', { mode: 'json' }).notNull().$type<string[]>(),
  expiresAt: integer('expires_at', { mode: 'timestamp' }),
  lastUsedAt: integer('last_used_at', { mode: 'timestamp' }),
  isRevoked: integer('is_revoked', { mode: 'boolean' }).notNull().default(false),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

// === Refresh Token（黑名单） ===
export const refreshTokens = sqliteTable('refresh_tokens', {
  id: text('id').primaryKey(),                              // JTI
  userId: integer('user_id').notNull().references(() => users.id),
  expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
  isRevoked: integer('is_revoked', { mode: 'boolean' }).notNull().default(false),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});
```

### 3.2 库存核心

```typescript
// === 物品 ===
export const items = sqliteTable('items', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  familyId: integer('family_id').notNull().references(() => families.id),
  name: text('name').notNull(),
  type: text('type').notNull().default('generic'),                   // 物品类型（引用 itemTypeConfigs）
  barcode: text('barcode'),                                          // 条码（EAN-13 等）
  categoryId: integer('category_id').references(() => categories.id),
  locationId: integer('location_id').references(() => locations.id),
  quantity: real('quantity').notNull().default(1),
  unit: text('unit').notNull().default('个'),                        // 单位（斤/个/包/瓶/克）
  minStock: real('min_stock').default(0),                            // 最低库存阈值
  brand: text('brand'),
  notes: text('notes'),
  image: text('image'),
  customFields: text('custom_fields', { mode: 'json' }),              // 类型特定字段（品牌/SN/保修期等）
  // 状态机（充电电池/煤气罐/灭火器等有状态转换的物品）
  currentState: text('current_state'),                                // 当前状态：charged/depleted/full/empty
  stateChangedAt: integer('state_changed_at', { mode: 'timestamp' }),
  cycleCount: integer('cycle_count').default(0),                     // 循环次数（充电电池）
  // 时间与经济
  purchasePrice: real('purchase_price'),
  purchaseDate: integer('purchase_date', { mode: 'timestamp' }),
  expiryDate: integer('expiry_date', { mode: 'timestamp' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

// 物品 NFC/QR/条码绑定已统一移至 trigger_bindings 表
// 不再在 items 表上直接存 nfcTagId/rfidTagId

// === 批次 ===
export const itemBatches = sqliteTable('item_batches', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  itemId: integer('item_id').notNull().references(() => items.id, { onDelete: 'cascade' }),
  batchNumber: text('batch_number'),
  quantity: real('quantity').notNull(),
  unit: text('unit').notNull(),
  purchaseDate: integer('purchase_date', { mode: 'timestamp' }),
  expiryDate: integer('expiry_date', { mode: 'timestamp' }),
  locationId: integer('location_id').references(() => locations.id),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

// === 库存变动记录 ===
export const stockTransactions = sqliteTable('stock_transactions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  itemId: integer('item_id').notNull().references(() => items.id),
  batchId: integer('batch_id').references(() => itemBatches.id),
  type: text('type', {
    enum: ['add', 'consume', 'transfer', 'adjust']
  }).notNull(),
  quantity: real('quantity').notNull(),
  unit: text('unit').notNull(),
  fromLocationId: integer('from_location_id').references(() => locations.id),
  toLocationId: integer('to_location_id').references(() => locations.id),
  userId: integer('user_id').notNull().references(() => users.id),
  // 'voice'/'vision' 由 AI Agent 处理语音/图像后通过 MCP 写入时标记（无对应后端模块）
  source: text('source', {
    enum: ['manual', 'barcode', 'nfc', 'rfid', 'voice', 'vision', 'mcp']
  }).notNull().default('manual'),
  note: text('note'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});
```

### 3.3 统一触发层 (Unified Trigger Layer)

> NFC、QR、条码、RFID 共用同一触发体系：Scanner → Resolver → Pipeline。

```typescript
// === 统一触发绑定字典（所有物理码的注册中心） ===
export const triggerBindings = sqliteTable('trigger_bindings', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  familyId: integer('family_id').notNull().references(() => families.id),
  code: text('code').notNull(),                                         // 原始编码（NFC UID / QR 值 / 条码号 / RFID UID）
  codeType: text('code_type', {
    enum: ['nfc', 'qr', 'barcode', 'rfid']
  }).notNull(),
  // 绑定目标（多态关联）
  targetType: text('target_type', {
    enum: ['item', 'location', 'recipe', 'action']
  }).notNull(),
  targetId: integer('target_id').notNull(),                             // 对应目标实体的 ID
  actionOverride: text('action_override'),                              // 可选：覆盖默认推断的固定动作
  label: text('label'),                                                 // 人可读标签（"冰箱 NFC"、"酱油标签"）
  lastReadAt: integer('last_read_at', { mode: 'timestamp' }),
  readCount: integer('read_count').notNull().default(0),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

// 联合唯一索引：同一家庭内，code + codeType 唯一

// === NFC 标签写入状态（仅跟踪物理状态，不存绑定关系） ===
export const nfcTagState = sqliteTable('nfc_tag_state', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  familyId: integer('family_id').notNull().references(() => families.id),
  tagUid: text('tag_uid').notNull().unique(),
  ndefWritten: integer('ndef_written', { mode: 'boolean' }).notNull().default(false),
  ndefWrittenAt: integer('ndef_written_at', { mode: 'timestamp' }),
  lastReadAt: integer('last_read_at', { mode: 'timestamp' }),
  readCount: integer('read_count').notNull().default(0),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

// 注: nfc_tag_state 与 trigger_bindings 通过 tagUid = code(codeType='nfc') 松耦合关联
// nfc_tag_state 记录物理状态（是否已写入 NDEF），trigger_bindings 记录业务绑定（绑了什么）

// === RFID 读卡器 ===
export const rfidReaders = sqliteTable('rfid_readers', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  familyId: integer('family_id').notNull().references(() => families.id),
  name: text('name').notNull(),
  locationId: integer('location_id').references(() => locations.id),
  readerType: text('reader_type', { enum: ['hf', 'uhf'] }).notNull().default('hf'),
  deviceId: text('device_id').notNull().unique(),
  config: text('config', { mode: 'json' }).$type<{ mqttTopic: string; power: number }>(),
  lastOnlineAt: integer('last_online_at', { mode: 'timestamp' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

// === RFID 区域映射 ===
export const rfidZones = sqliteTable('rfid_zones', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  readerId: integer('reader_id').notNull().references(() => rfidReaders.id),
  tagPattern: text('tag_pattern'),                                      // 标签 UID 匹配模式
  locationId: integer('location_id').references(() => locations.id),
  notes: text('notes'),
});

// === 自动化触发规则 ===
export const automationTriggers = sqliteTable('automation_triggers', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  familyId: integer('family_id').notNull().references(() => families.id),
  name: text('name').notNull(),
  triggerType: text('trigger_type', {
    enum: ['nfc_tap', 'qr_scan', 'barcode_scan', 'rfid_enter', 'rfid_exit', 'scheduled', 'custom']
  }).notNull(),
  triggerConfig: text('trigger_config', { mode: 'json' }).$type<{
    bindingId?: number;
    rfidZoneId?: number;
    cronExpr?: string;
    conditions?: Record<string, unknown>;
  }>(),
  actionType: text('action_type', {
    enum: ['open_page', 'run_notification', 'call_mcp_tool', 'run_workflow']
  }).notNull(),
  actionConfig: text('action_config', { mode: 'json' }).$type<{
    pageUrl?: string;
    notificationId?: number;
    mcpToolName?: string;
    mcpToolArgs?: Record<string, unknown>;
    workflowId?: number;
  }>(),
  enabled: integer('enabled', { mode: 'boolean' }).notNull().default(true),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

// === 扫描操作日志 ===
export const scanLogs = sqliteTable('scan_logs', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  familyId: integer('family_id').notNull().references(() => families.id),
  userId: integer('user_id').references(() => users.id),
  scanType: text('scan_type', { enum: ['nfc', 'qr', 'barcode', 'rfid'] }).notNull(),
  code: text('code').notNull(),
  action: text('action').notNull(),                                     // Resolver 推断出的动作
  context: text('context', { mode: 'json' }).$type<{
    page?: string;
    locationId?: number;
  }>(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

// === 编码输出记录 ===
export const encoderJobs = sqliteTable('encoder_jobs', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  familyId: integer('family_id').notNull().references(() => families.id),
  outputType: text('output_type', { enum: ['qr', 'nfc_ndef', 'barcode'] }).notNull(),
  targetType: text('target_type', { enum: ['item', 'location', 'multi'] }).notNull(),
  targetIds: text('target_ids', { mode: 'json' }).$type<number[]>(),
  generatedAt: integer('generated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});
```

### 3.4 位置 / 类别 / 标签

```typescript
// === 位置（三级） ===
export const locations = sqliteTable('locations', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  familyId: integer('family_id').notNull().references(() => families.id),
  name: text('name').notNull(),
  parentId: integer('parent_id').references((): typeof locations => locations.id),
  level: integer('level').notNull().default(1),                         // 1=房间 2=柜子 3=层格
  image: text('image'),
  notes: text('notes'),
  // NFC 绑定已统一移至 trigger_bindings 表，不再在 locations 上直接存 nfcTagId
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

// === 类别 ===
export const categories = sqliteTable('categories', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  familyId: integer('family_id').notNull().references(() => families.id),
  name: text('name').notNull(),
  icon: text('icon'),                                                    // emoji 图标
  parentId: integer('parent_id').references((): typeof categories => categories.id),
  sortOrder: integer('sort_order').notNull().default(0),
});

// === 标签 ===
export const tags = sqliteTable('tags', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  familyId: integer('family_id').notNull().references(() => families.id),
  name: text('name').notNull(),
  color: text('color').default('#409EFF'),
});

export const itemTags = sqliteTable('item_tags', {
  itemId: integer('item_id').notNull().references(() => items.id, { onDelete: 'cascade' }),
  tagId: integer('tag_id').notNull().references(() => tags.id, { onDelete: 'cascade' }),
});
```

### 3.5 购物清单 / 食谱 / 任务

```typescript
// === 购物清单 ===
export const lists = sqliteTable('lists', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  familyId: integer('family_id').notNull().references(() => families.id),
  name: text('name').notNull(),
  type: text('type', {
    enum: ['shopping', 'todo', 'chore', 'holiday', 'meal_plan']
  }).notNull().default('shopping'),
  config: text('config', { mode: 'json' }).$type<{
    autoReset?: string;              // 'daily'|'weekly'|'monthly'|'custom:N'
    autoResetDays?: number;
    template?: string;               // 节日模板名称
    autoPurchase?: boolean;           // 打勾是否自动入库
    autoConsume?: boolean;            // 打勾是否自动消耗库存
  }>(),
  createdBy: integer('created_by').references(() => users.id),
  isArchived: integer('is_archived', { mode: 'boolean' }).notNull().default(false),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

export const listItems = sqliteTable('list_items', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  listId: integer('list_id').notNull().references(() => lists.id, { onDelete: 'cascade' }),
  content: text('content').notNull(),                                    // 条目描述
  note: text('note'),                                                     // 备注
  status: text('status', {
    enum: ['pending', 'completed', 'cancelled']
  }).notNull().default('pending'),
  completedBy: integer('completed_by').references(() => users.id),
  completedAt: integer('completed_at', { mode: 'timestamp' }),
  assigneeId: integer('assignee_id').references(() => users.id),          // 指派给谁
  quantity: real('quantity'),
  unit: text('unit'),
  linkedItemId: integer('linked_item_id').references(() => items.id),     // 关联库存物品
  linkedRecipeId: integer('linked_recipe_id').references(() => recipes.id), // 关联食谱
  dueAt: integer('due_at', { mode: 'timestamp' }),                        // 截止日期/到期时间
  lastResetAt: integer('last_reset_at', { mode: 'timestamp' }),           // 上次重置（chore 用）
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

export const listItemComments = sqliteTable('list_item_comments', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  listItemId: integer('list_item_id').notNull().references(() => listItems.id, { onDelete: 'cascade' }),
  userId: integer('user_id').notNull().references(() => users.id),
  content: text('content').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

export const holidayTemplates = sqliteTable('holiday_templates', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  type: text('type', {
    enum: ['spring_festival', 'mid_autumn', 'dragon_boat', 'custom']
  }).notNull(),
  items: text('items', { mode: 'json' }).$type<Array<{
    name: string; quantity: number; unit: string; note?: string
  }>>(),
  isPreset: integer('is_preset', { mode: 'boolean' }).notNull().default(false),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

// === 食谱 ===
export const recipes = sqliteTable('recipes', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  familyId: integer('family_id').notNull().references(() => families.id),
  name: text('name').notNull(),
  description: text('description'),
  ingredients: text('ingredients', { mode: 'json' }).$type<Array<{
    itemName: string; quantity: number; unit: string; optional?: boolean
  }>>().notNull(),
  steps: text('steps', { mode: 'json' }).$type<Array<{
    stepNumber: number; instruction: string; duration?: string
  }>>().notNull(),
  prepTime: integer('prep_time'),                                        // 分钟
  cookTime: integer('cook_time'),                                        // 分钟
  servings: integer('servings'),
  image: text('image'),
  source: text('source'),                                                // 'manual' | 'grocy_import' | 'url'
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

// （chores 已合并到统一 list_items 表 → type='chore' + config.autoReset + lastResetAt 字段）

// notification_rules 中的 chore_due trigger type 不变
// 但触发条件改为查 list_items 的 dueAt
```

### 3.6 设备管理（通用物品模型替代）

> **重要变更：** v1.4 起不再使用独立的 `devices` 表。电子设备通过通用物品模型管理：
> - `items` 表 + `type='electronic_device'`
> - 品牌型号/序列号/保修信息存储在 `customFields` JSON 字段
> - 维修记录使用 `stock_transactions`（type='adjust', note 含维修信息）+ 通用 `documents` 附件系统
> - 维护提醒使用 `notification_rules`（triggerType='custom'）
>
> 详见 PRD v1.5 §4.6 通用物品模型设计。

// devices / repair_records / device_documents 表已移除
// 设备类物品的 customFields 结构见 §2.11

---

## 四、NFC 前端交互规范

### 4.1 Web NFC API 封装

```typescript
// composables/useNfc.ts
interface NfcScanResult {
  tagUid: string;
  codeType: 'nfc';
  boundTo: { targetType: 'item' | 'location' | 'recipe' | 'action'; targetId: number; name: string } | null;
  action?: {
    type: 'open_page' | 'run_notification' | 'call_mcp_tool' | 'run_workflow';
    config: Record<string, unknown>;
  };
  // iOS 兼容：从 NDEF URI 解析
  iosFallback?: {
    url: string;           // NDEF URI Record 的值
    familyCode: string;    // 从 URI 解析
  };
}

interface UseNfcReturn {
  isSupported: Ref<boolean>;          // 浏览器是否支持 Web NFC（仅 Android Chrome/Edge）
  isScanning: Ref<boolean>;           // 是否正在扫描
  lastResult: Ref<NfcScanResult | null>;
  startScan: () => Promise<void>;     // 开始监听 NFC
  stopScan: () => void;               // 停止监听
  writeTag: (data: NdefWriteData) => Promise<void>;  // 写入标签（Android Only）
  error: Ref<string | null>;
}
```

### 4.2 NFC 扫描流程

```
Android 路径 (Web NFC API):
[用户点击"扫描"按钮或靠近标签]
       │
       ▼
[请求 NFC 权限] ← 浏览器弹窗
       │
  ┌────┴────┐
  │  允许？  │──否──→ 显示"请在浏览器设置中开启 NFC 权限"
  └────┬────┘
       │ 是
       ▼
[监听 NDEF 消息] ← reader.addEventListener('reading', ...)
       │
       ▼
[解析 NDEF: Text(名称) + URI(在线回退) + JSON(结构化数据)]
       │
       ▼
[POST /api/v1/scanner/scan { code: tagUid, codeType: 'nfc' }]
       │
  ┌────┴────┐
  │ 匹配成功？│──否──→ [显示"未识别的标签"] + [绑定弹窗]
  └────┬────┘                        │
       │ 是                          ▼
       ▼                    [选择绑定类型: 位置/物品/动作/食谱]
[根据 targetType 执行响应]        │
  ├─ location → router.push      ▼
  ├─ item → router.push     [POST /api/v1/bindings 创建绑定]
  ├─ recipe → router.push
  └─ action → 执行触发规则

iOS 路径 (NDEF URL 跳转 — 系统级):
[手机靠近 NFC 标签]
       │
       ▼
[iOS 系统读取 NDEF URI → 弹出通知]
       │
       ▼
[Safari 打开 https://homehub.app/nfc/{familyCode}/{tagUid}]
       │
       ▼
[HomeHub PWA 接收 URL → 路由到 /nfc/:code]
       │
       ▼
[POST /api/v1/bindings/lookup { code: tagUid, codeType: 'nfc' }]
       │
       ▼
[匹配成功 → 根据 targetType 跳转/执行]
```

### 4.3 NFC 标签初始化工具

用于批量写入空白 NFC 标签：

```bash
# CLI 工具 (Node.js + pcsc)
npx homehub-nfc write --uid "ABC123" --family "home-xxxx" --type location --bind-to 5

# 输出标签贴纸（含 QR 码备用）
npx homehub-nfc print --output ./labels.pdf
```

---

## 五、RFID 网关协议

### 5.1 硬件配置

| 组件 | 型号 | 数量 | 成本估算 |
|------|------|------|---------|
| MCU | ESP32-WROOM-32 | 1 | ¥25-35 |
| RFID 模块 | RC522 (HF 13.56MHz) | 1-3 | ¥8-15/个 |
| 天线 | 板载天线 | 即含 | — |
| 电源 | Micro USB 5V | 1 | — |
| **总计** | | | **¥40-80/套** |

### 5.2 MQTT Topic 定义

```
# 读数器 → 服务器
homehub/{familyCode}/rfid/{deviceId}/tag_seen    # 检测到标签
  Payload: { "tagUid": "ABC123", "rssi": -65, "timestamp": 1712345678 }

homehub/{familyCode}/rfid/{deviceId}/tag_lost    # 标签离开
  Payload: { "tagUid": "ABC123", "rssi": -95, "timestamp": 1712345678 }

homehub/{familyCode}/rfid/{deviceId}/heartbeat   # 心跳
  Payload: { "uptime": 3600, "freeHeap": 120000, "tagsInRange": 3 }

# 服务器 → 读数器
homehub/{familyCode}/rfid/{deviceId}/config      # 配置更新
  Payload: { "scanInterval": 1000, "power": 20 }
```

### 5.3 ESP32 固件要点

- 使用 Arduino framework + ESP-MQTT 库
- 上电自动连接 WiFi + MQTT Broker
- RC522 每 500ms 轮询一次，防碰撞算法处理多标签
- RSSI 变化超过阈值时发送 tag_seen/tag_lost
- WiFi 断连自动重连 + 缓存未发送事件（最多 100 条）
- OTA 远程固件升级

---

## 六、前端组件规范

### 6.1 Naive UI 主题设计令牌

```typescript
// styles/theme.ts
import { type GlobalThemeOverrides } from 'naive-ui'

export const homehubThemeOverrides: GlobalThemeOverrides = {
  common: {
    primaryColor: '#409EFF',
    primaryColorHover: '#66B1FF',
    primaryColorPressed: '#3A8EE6',
    primaryColorSuppl: '#409EFF',
    
    successColor: '#67C23A',
    warningColor: '#E6A23C',
    errorColor: '#F56C6C',
    infoColor: '#909399',
    
    borderRadius: '8px',
    borderRadiusSmall: '4px',
    
    fontSize: '14px',
    fontSizeSmall: '12px',
    fontSizeMedium: '14px',
    fontSizeLarge: '16px',
    fontSizeHuge: '18px',
  },
}
```

### 6.2 关键组件接口定义

```typescript
// components/ItemCard.vue
interface ItemCardProps {
  item: {
    id: number;
    name: string;
    quantity: number;
    unit: string;
    location?: { id: number; name: string };
    category?: { id: number; name: string; icon?: string };
    expiryDate?: Date;
    image?: string;
    tags?: Array<{ id: number; name: string; color: string }>;
  };
  size?: 'small' | 'default' | 'large';
}
// Events: @consume, @transfer, @delete

// components/NFCScanButton.vue
interface NFCScanButtonProps {
  variant?: 'fab' | 'button' | 'icon';  // 浮动按钮/常规按钮/图标
  autoRedirect?: boolean;                 // 扫描后自动跳转
}
// Events: @scan(result: NfcScanResult), @error(msg: string)

// components/LocationTree.vue
interface LocationTreeProps {
  familyId?: number;
  showItemCount?: boolean;    // 显示每个位置的物品数量
  draggable?: boolean;        // 拖拽移动位置
  selectedId?: number;        // 当前选中
}
// Events: @select(location), @move(itemId, fromLocId, toLocId)

// components/ExpiryBadge.vue
interface ExpiryBadgeProps {
  expiryDate?: Date;
  thresholdDays?: number;     // 提前 N 天预警（默认7）
}
// 渲染: 新鲜(绿) / 即将过期(橙) / 已过期(红)
```

### 6.3 路由设计

```typescript
// router/index.ts
const routes = [
  // 认证
  { path: '/login', component: () => import('@/views/auth/Login.vue') },
  { path: '/register', component: () => import('@/views/auth/Register.vue') },
  
  // 主应用（需要认证）
  { path: '/', component: () => import('@/layouts/MainLayout.vue'), children: [
    { path: '', redirect: '/stock' },
    { path: 'stock', component: () => import('@/views/stock/StockList.vue'), meta: { title: '库存' } },
    { path: 'stock/:id', component: () => import('@/views/stock/ItemDetail.vue') },
    { path: 'locations', component: () => import('@/views/locations/LocationTree.vue') },
    { path: 'locations/:id', component: () => import('@/views/locations/LocationDetail.vue') },
    { path: 'lists', component: () => import('@/views/lists/ListView.vue') },
    { path: 'lists/:type', component: () => import('@/views/lists/ListByType.vue') },
    { path: 'lists/:type/:id', component: () => import('@/views/lists/ListDetail.vue') },
    { path: 'my-tasks', component: () => import('@/views/lists/MyTasks.vue') },     // 我指派的条目
    { path: 'recipes', component: () => import('@/views/recipes/RecipeList.vue') },
    { path: 'recipes/:id', component: () => import('@/views/recipes/RecipeDetail.vue') },
    { path: 'meal-plans', component: () => import('@/views/recipes/MealPlans.vue') },
    { path: 'nfc', component: () => import('@/views/nfc/NfcManagement.vue') },
    { path: 'dashboard', component: () => import('@/views/dashboard/Dashboard.vue') },
    { path: 'settings', component: () => import('@/views/settings/Settings.vue') },
    { path: 'settings/family', component: () => import('@/views/settings/FamilySettings.vue') },
    { path: 'settings/api-tokens', component: () => import('@/views/settings/ApiTokens.vue') },
  ]},
  
  // NFC 深度链接 (外部扫描跳转)
  { path: '/nfc/:familyCode/:tagUid', component: () => import('@/views/nfc/NfcHandler.vue') },
]
```

---

## 七、MCP Server — 插件化设计

MCP Server 以**内置 Plugin** 形式运行，不硬编码在 NestJS 模块中。它通过 Plugin Registry 的 `mcp-tool` 扩展点自动发现工具，将其映射为 MCP Tool。

### 7.1 架构

```typescript
// plugins/builtin.mcp-server/index.ts — 内置插件，遵循 Plugin 生命周期
class McpServerPlugin implements HomeHubPlugin {
  id = 'builtin.mcp-server';
  runtime = 'native';

  async onLoad(ctx: PluginContext) {
    // 1. 注册 MCP 传输层（HTTP + SSE）
    this.transport = new StreamableHttpTransport({
      path: '/mcp',
      auth: 'bearer-token',
    });

    // 2. 扫描所有 mcp-tool 扩展点并注册
    const tools = ctx.registry.getExtensions('mcp-tool');
    for (const tool of tools) {
      this.server.registerTool({
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters,
        handler: (params) => this.executeTool(tool, params),
      });
    }
  }

  private async executeTool(tool: ToolDef, params: any) {
    // 调用对应的 REST API（或直接调 Service）
    return httpClient.request({
      method: tool.method,
      url: `/api${tool.apiPath.replace(/{(\w+)}/g, (_, k) => params[k])}`,
      data: tool.method === 'POST' || tool.method === 'PUT' ? params : undefined,
      headers: { Authorization: `Bearer ${ctx.authToken}` },
    });
  }
}
```

### 7.2 工具注册（插件化）

> **设计原则：** 语音/图片识别由 AI Agent 自行处理（ASR、图像识别），处理完成后调用 HomeHub 的 CRUD 工具写入结构化数据。REST API 是唯一业务接口，MCP 只是 REST 的映射层 + 插件扩展收集器。

内置工具在 `builtin.mcp-server` 插件中通过 `mcp-tool` 扩展点注册：

```yaml
# plugins/builtin.mcp-server/plugin.yaml
extensionPoints:
  mcp-tool:
    # ———— 库存操作 ————
    - name: search_items
      description: 搜索家庭库存中的物品。支持按名称、类别、位置、过期状态筛选。
      method: GET
      apiPath: /v1/stock/items
      parameters:
        query:           { type: string, optional: true }
        category:        { type: string, optional: true }
        location:        { type: string, optional: true }
        expiringInDays:  { type: number, optional: true }
        type:            { type: string, optional: true }
        limit:           { type: number, optional: true, default: 20 }

    - name: add_item
      description: 添加物品到库存
      method: POST
      apiPath: /v1/stock/items
      parameters:
        name:       { type: string }
        quantity:   { type: number }
        unit:       { type: string }
        locationId: { type: number, optional: true }
        expiryDate: { type: string, optional: true }
        type:       { type: string, optional: true }
        barcode:    { type: string, optional: true }

    - name: consume_item
      description: 消耗/使用物品
      method: POST
      apiPath: /v1/stock/items/{itemId}/consume
      parameters:
        itemId:   { type: number }
        quantity: { type: number, optional: true }
        note:     { type: string, optional: true }

    - name: move_item
      description: 移动物品位置
      method: POST
      apiPath: /v1/stock/items/{itemId}/move
      parameters:
        itemId:       { type: number }
        toLocationId: { type: number }

    - name: update_item
      description: 更新物品信息
      method: PUT
      apiPath: /v1/stock/items/{itemId}
      parameters:
        itemId: { type: number }

    - name: delete_item
      description: 删除物品
      method: DELETE
      apiPath: /v1/stock/items/{itemId}
      parameters:
        itemId: { type: number }

    # ———— 清单操作 ————
    - name: get_lists
      description: 查看所有清单
      method: GET
      apiPath: /v1/lists
      parameters:
        type: { type: string, optional: true, enum: [shopping, todo, chore, holiday, meal_plan] }

    - name: create_list
      description: 创建清单
      method: POST
      apiPath: /v1/lists
      parameters:
        name: { type: string }
        type: { type: string, enum: [shopping, todo, chore, holiday, meal_plan] }

    - name: add_to_list
      description: 添加到清单
      method: POST
      apiPath: /v1/lists/{listId}/items
      parameters:
        listId:     { type: number }
        content:    { type: string }
        quantity:   { type: number, optional: true }
        assigneeId: { type: number, optional: true }

    - name: check_list_item
      description: 打勾完成清单项
      method: POST
      apiPath: /v1/lists/items/{itemId}/check
      parameters:
        itemId: { type: number }

    - name: uncheck_list_item
      description: 取消完成
      method: POST
      apiPath: /v1/lists/items/{itemId}/uncheck
      parameters:
        itemId: { type: number }

    - name: assign_list_item
      description: 指派任务给家庭成员
      method: POST
      apiPath: /v1/lists/items/{itemId}/assign
      parameters:
        itemId:     { type: number }
        assigneeId: { type: number }

    - name: get_my_tasks
      description: 查看我被指派的任务
      method: GET
      apiPath: /v1/lists/my-tasks

    # ———— 食谱与推荐 ————
    - name: get_recipe_recommendations
      description: 根据库存推荐食谱
      method: GET
      apiPath: /v1/recipes/recommendations
      parameters:
        recipeCount: { type: number, optional: true }

    - name: search_recipes
      description: 搜索食谱
      method: GET
      apiPath: /v1/recipes/search
      parameters:
        query: { type: string }

    - name: get_meal_plan
      description: 查看当前餐饮计划
      method: GET
      apiPath: /v1/meal-plans
      parameters:
        week: { type: string, optional: true }

    # ———— 分析与统计 ————
    - name: get_stock_summary
      description: 库存概况
      method: GET
      apiPath: /v1/stock/summary

    - name: get_expiring_items
      description: 获取即将过期物品
      method: GET
      apiPath: /v1/stock/expiring
      parameters:
        days: { type: number, optional: true, default: 7 }

    - name: get_waste_report
      description: 浪费分析报告
      method: GET
      apiPath: /v1/reports/waste
      parameters:
        period:   { type: string, enum: [week, month, year] }
        familyId: { type: number, optional: true }

    - name: get_statistics
      description: 消耗统计
      method: GET
      apiPath: /v1/statistics
      parameters:
        period: { type: string, enum: [week, month, year] }

    # ———— 触发器与配置 ————
    - name: bind_trigger
      description: 绑定扫码到目标
      method: POST
      apiPath: /v1/triggers/bind
      parameters:
        code:          { type: string }
        codeType:      { type: string, enum: [nfc, qr, barcode, rfid] }
        targetType:    { type: string, enum: [item, location, recipe, action] }
        targetId:      { type: number }
        actionOverride: { type: string, optional: true }

    - name: get_bindings
      description: 查看所有绑定
      method: GET
      apiPath: /v1/triggers/bindings
      parameters:
        locationId: { type: number, optional: true }

    - name: create_automation
      description: 创建自动化规则
      method: POST
      apiPath: /v1/triggers/automations
      parameters:
        triggerType: { type: string }
        actionType:  { type: string }
        actionConfig: { type: object }
```

### 7.3 第三方工具扩展

第三方插件通过 `mcp-tool` 扩展点注册自定义工具，MCP Server 自动收集并暴露。

```yaml
# plugins/ai-recipe-search/plugin.yaml
# 示例：AI Agent 通过 MCP 工具拍照识别食材并推荐食谱
# 注：语音/图像识别由 AI Agent 自身能力处理，不依赖 HomeHub 后端模块
name: ai-recipe-search
version: 1.0.0
extensionPoints:
  mcp-tool:
    - name: search_recipes_by_photo
      description: 拍照识别食材并推荐食谱
      method: POST
      apiPath: /v1/recipes/photo-search
      parameters:
        imageBase64: { type: string, description: "食材照片的 Base64" }
```

```yaml
# plugins/label-printer/plugin.yaml
name: label-printer
version: 1.0.0
extensionPoints:
  mcp-tool:
    - name: print_item_label
      description: 打印物品标签（含名称、保质期、二维码）
      method: POST
      apiPath: /v1/print/label
      parameters:
        itemId:    { type: number }
        printerId: { type: string, optional: true }
```

**第三方插件自动生效流程：** 安装 → Registry 扫描 `extensionPoints.mcp-tool` → 注册到 MCP Server → 下次 AI Agent 请求即可调用。无需改动 Core 代码。

### 7.4 传统 NestJS MCP 模块 vs 插件化方案对比

| 对比项 | NestJS @McpTool 装饰器（旧） | 插件化 MCP Server（新） |
|--------|------------------------------|------------------------|
| 注册方式 | TypeScript 装饰器，绑死在 Module 中 | YAML 扩展点声明，运行时自动收集 |
| 可拆卸性 | 不可拆卸 | `MCP_ENABLED=false` 直接移除 |
| 第三方扩展 | 需要改 Core 代码 | 安装插件即可，零侵入 |
| 协议升级 | 改 Core 依赖版本 | 升级 `builtin.mcp-server` 插件版本 |
| 测试 | 需要启动 NestJS 完整模块 | 可以单独起 Mock Plugin Registry 测试 |
| 核心职责 | MCP 是 Core 的一部分 | Core 只有 REST API，MCP 是映射层 |

## 八、安全性设计

### 8.1 认证安全

```typescript
// JWT 配置
{
  accessToken:  { expiresIn: '15m', secret: process.env.JWT_SECRET },
  refreshToken: { expiresIn: '7d', secret: process.env.JWT_REFRESH_SECRET },
  apiToken:     { prefix: 'hb_', hashAlgo: 'sha256' },
}

// API Token 生成流程
1. 用户输入名称 + 选择权限范围
2. 后端生成随机 48 字节 Token: hb_{randomHex}(40 位)
3. 存储 SHA-256(token) 到数据库，仅返回明文一次
4. 请求时: Authorization: Bearer hb_xxxx
5. 验证: SHA-256(headerToken) === db.tokenHash
```

### 8.2 数据安全

- 密码：bcrypt (cost=12)
- 所有 API 支持 rate limiting（@nestjs/throttler）
- NFC 标签仅存储 URL，不存储敏感数据
- SQLite 数据库文件支持加密（sqlcipher 可选）
- XSS 防护：Naive UI 默认转义 + Content-Security-Policy
- CSRF 防护：SameSite=Strict Cookie + 自定义 Header

### 8.3 隐私

- 本地 SQLite：数据完全在用户设备上
- 云端 PostgreSQL：仅存储必要的库存数据
- 不收集用户行为数据
- 用户可随时导出/删除全部数据

---

## 九、性能要求

| 指标 | 目标 |
|------|------|
| 页面首屏加载 | < 2s (PWA + 懒加载) |
| API 响应 (列表) | < 200ms (分页20条) |
| API 响应 (单条) | < 100ms |
| NFC 扫描识别 | < 500ms (含网络请求) |
| RFID 事件推送 | < 200ms (MQTT → WS) |
| SQLite 并发 | 10+ 同时查询 |
| PWA 离线缓存 | 主要页面 + 最近 50 条库存 |
| 首次打包体积 | < 200KB (gzip) |

---

## 十、部署方案

### 10.1 MVP 部署（本地 Docker）

```yaml
# docker-compose.yml（推荐：PostgreSQL + HomeHub）
version: '3.8'
services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: homehub
      POSTGRES_PASSWORD: ${DB_PASSWORD:-homehub}
      POSTGRES_DB: homehub
    volumes:
      - homehub-pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U homehub"]
      interval: 5s
      timeout: 5s
      retries: 5

  homehub:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DB_TYPE=postgres
      - DB_URL=postgres://homehub:${DB_PASSWORD:-homehub}@postgres:5432/homehub
      - JWT_SECRET=${JWT_SECRET}
      - JWT_REFRESH_SECRET=${JWT_REFRESH_SECRET}
    depends_on:
      postgres:
        condition: service_healthy
    restart: unless-stopped

volumes:
  homehub-pgdata:
```

> **单用户轻量部署（备选）：** 如果只想本地跑单机，将 `DB_TYPE` 改为 `sqlite`，移除 postgres service，即可用 SQLite 文件数据库。Drizzle ORM 不改一行代码。

### 10.2 SaaS 部署（未来）

```
Nginx (SSL) → NestJS (PM2/Cluster) → PostgreSQL + Redis
                  │
            Docker Compose
```

---

## 十一、数据迁移工具

### 11.1 Grocy 导入

```bash
# 从 Grocy SQLite 文件直接导入
npx homehub migrate grocy --input ./grocy.db --output ./homehub.db

# 映射表
Grocy.users           → HomeHub.users
Grocy.products        → HomeHub.items
Grocy.quantity_units  → HomeHub 单位映射（需手动确认）
Grocy.locations       → HomeHub.locations
Grocy.shopping_list   → HomeHub.list_items (type=shopping)
Grocy.recipes         → HomeHub.recipes
Grocy.chores          → HomeHub.list_items (type=chore + config.autoReset)
Grocy.stock_log       → HomeHub.stock_transactions
```

### 11.2 HomeBox 导入

```bash
npx homehub migrate homebox --input ./homebox.db --output ./homehub.db
```

---

## 附录

### A. 环境变量清单

| 变量 | 说明 | 默认值 |
|------|------|-------|
| `DB_TYPE` | 数据库类型 | `postgres`（单用户可用 `sqlite`） |
| `DB_URL` | PostgreSQL 连接串 | `postgres://homehub:homehub@localhost:5432/homehub` |
| `DB_PATH` | SQLite 文件路径（仅 sqlite 模式） | `./data/homehub.db` |
| `JWT_SECRET` | Access Token 密钥 | (自动生成) |
| `JWT_REFRESH_SECRET` | Refresh Token 密钥 | (自动生成) |
| `PORT` | 服务端口 | `3000` |
| `CORS_ORIGIN` | 允许的跨域源 | `*` (开发) |
| `MCP_ENABLED` | 是否启用 MCP | `true` |
| `RFID_MQTT_URL` | MQTT Broker 地址 | (可选) |

### B. 错误码定义

| Code | 说明 |
|------|------|
| `AUTH_001` | Token 过期 |
| `AUTH_002` | Token 无效 |
| `AUTH_003` | 无权限 |
| `STOCK_001` | 物品不存在 |
| `STOCK_002` | 库存不足 |
| `NFC_001` | 标签未注册 |
| `NFC_002` | 标签已被绑定 |
| `FAMILY_001` | 邀请码无效 |
| `FAMILY_002` | 非家庭成员 |
| `VALIDATION_001` | 参数校验失败 |

### C. 参考链接

- [Naive UI 组件文档](https://www.naiveui.com)
- [NestJS 官方文档](https://docs.nestjs.com)
- [Drizzle ORM 文档](https://orm.drizzle.team)
- [Web NFC API (MDN)](https://developer.mozilla.org/en-US/docs/Web/API/Web_NFC_API)
- [MCP 协议规范](https://modelcontextprotocol.io)
