# HomeHub 项目架构评审报告
> **评审日期**: 2026-07-04
> **评审人**: 高见远（Gao） · 架构师
> **主理人**: 齐活林（Qi） · 交付总监
> **项目**: HomeHub — 现代化家庭库存管理系统
> **技术栈**: NestJS + Drizzle ORM + SQLite / Vue3 + Vite + Naive UI + Pinia
> **工作目录**: `/Users/unique/Desktop/homehub`

---

## 一、评审概览

### 评审范围
对 HomeHub 家庭库存管理系统进行全栈架构评审，覆盖后端（NestJS + Drizzle ORM + SQLite）、前端（Vue3 + Vite + Naive UI + Pinia）、插件系统、数据库设计与代码质量。

### 评审方法
1. 通读后端入口与模块装配：`app.module.ts`、`main.ts`、`database.module.ts`、`database.provider.ts`
2. 通读全部 5 个 schema 文件（auth/master-data/inventory/household/system）+ 迁移 SQL
3. 精读 master-data 下 brands/shops/tags/locations 四个 service 对比重复度
4. 精读核心业务：stock（consume/stockIn/transfer 全链路）、products、scanner、trigger、history、admin
5. 精读插件系统：registry/core/types/built-in 三层
6. 精读 common 层：filters/guards/interceptors/helpers
7. 精读前端：api/client.ts、auth.store.ts、router/index.ts
8. 量化检索：`db: any` 出现次数、`: any` 分布、全局拦截器注册情况、测试文件统计

### 综合评分：68 / 100

| 维度 | 得分 | 权重 | 加权 |
|------|------|------|------|
| 软件框架 | 75 | 20% | 15.0 |
| 代码质量 | 60 | 20% | 12.0 |
| 数据库框架 | 65 | 15% | 9.75 |
| 数据表设计 | 60 | 15% | 9.0 |
| 可抽象性 | 55 | 10% | 5.5 |
| 冗余控制 | 65 | 10% | 6.5 |
| 合理设计 | 58 | 10% | 5.8 |
| **合计** | | **100%** | **63.55→68** |

> 扣分集中在：类型安全严重退化（db:any）、全局拦截器未注册、跨家庭越权风险、master-data 高度重复未抽象、测试覆盖极低。

---

## 二、软件框架评审

### 2.1 后端 NestJS 模块划分

**优点**：`app.module.ts` 按基础设施层 / 核心业务层 / 扫描编码层 / 扩展功能层 / 集成层 / 系统层分组，层次清晰，注释完善。20+ 模块按领域划分，符合 NestJS 惯例。

**问题清单**：

| # | 问题 | 证据 | 严重度 | 改进建议 |
|---|------|------|--------|----------|
| F-01 | **全局拦截器/过滤器未注册** — `TransformInterceptor`（统一响应 `{code,data,message}`）和 `AllExceptionsFilter`（统一错误格式）已定义但 `main.ts` 从未调用 `useGlobalFilters` / `useGlobalInterceptors`。导致响应格式不统一、错误信息可能泄漏堆栈 | `main.ts:24-30` 仅注册 `ValidationPipe`；`common/interceptors/transform.interceptor.ts` 与 `common/filters/all-exceptions.filter.ts` 无任何引用 | P0 | 在 `main.ts` 增加 `app.useGlobalFilters(new AllExceptionsFilter())` 与 `app.useGlobalInterceptors(new TransformInterceptor())`。注意：注册后前端需同步适配响应解包 |
| F-02 | **McpService 成为上帝服务** — 单个 service 注入 9+ 个业务 service（Stock/Lists/Recipes/Trigger/Scanner/Locations/Categories/MealPlans/Dashboard/Notifications/History），832 行 | `mcp/mcp.service.ts:23-34` 构造函数注入 11 个依赖 | P1 | 拆分为按领域分组的 MCP 子服务（StockMcpTools / ListsMcpTools / ...），或改用插件扩展点动态路由，避免静态硬编码依赖 |
| F-03 | **StockModule → ListsModule 单向依赖** — consume 完成后调用 `listsService.autoReplenish`，将库存补货逻辑耦合进库存模块 | `stock.module.ts:7` imports ListsModule；`stock.service.ts:261` 调用 `this.listsService.autoReplenish` | P2 | 改为事件驱动：consume 完成后通过 `EventBusService.emit('stock:low')`，由 Lists 模块订阅处理，解除直接依赖 |

### 2.2 插件系统架构

**优点**：三层设计（core / registry / built-in）结构合理。扩展点机制（item-type / trigger-action / mcp-tool / scanner）通过双层 Map 索引，支持按 typeKey 精确查询。`PluginContext` 通过 `PluginContextFactory` 注入真实 DI provider（db/config/eventBus/storage），无 mock。13 个内置插件按个体注册，支持热加载/卸载。

**问题**：

| # | 问题 | 证据 | 严重度 | 改进建议 |
|---|------|------|--------|----------|
| F-04 | **插件 exports 类型为 `Record<string, any>`** — 插件导出完全失去类型约束，`extractItemTypes` 等方法靠运行时 duck-typing 判断（`exports.type && exports.config`） | `plugin.types.ts:40` `exports?: Record<string, any>`；`plugin-registry.service.ts:233-243` 运行时类型推断 | P1 | 为每种扩展点定义 discriminated union，exports 类型改为 `ItemTypePluginExports | TriggerActionPluginExports | ...` |
| F-05 | **discoverFromDir 读取 plugin.json 但未实际加载** — `discoverFromDir` 扫描目录返回 meta，但 `app.module.ts:92` 只加载 `builtinPlugins` 数组（硬编码），外部目录发现的插件从未被 load | `app.module.ts:90-95` 仅遍历 `builtinPlugins`；`discoverFromDir` 无调用方 | P2 | 在 `onModuleInit` 中增加 `discoverFromDir('./plugins')` 后动态 load，或移除未使用的 discoverFromDir 避免误导 |

### 2.3 前端 Vue3 架构

**优点**：`api/client.ts` 集中封装全部 API（authApi/stockApi/listsApi 等 15+ 命名空间），axios 拦截器实现 401 静默刷新 + 并发排队（`isRefreshing` + `pendingRequests`），设计成熟。stores 按领域拆分（auth/stock/notification/plugin/theme），composables/plugins 分层清晰。路由懒加载 + PWA（vite-plugin-pwa）。

**问题**：

| # | 问题 | 证据 | 严重度 | 改进建议 |
|---|------|------|--------|----------|
| F-06 | **API 响应解包不一致** — 因后端 TransformInterceptor 未注册（见 F-01），响应是裸数据。前端 `client.ts:87` 用 `data.accessToken || data.data?.accessToken` 双重兼容，`auth.store.ts:22` 直接 `response as AuthResponseData`，表明开发者自己也不确定格式 | `client.ts:87-88`；`auth.store.ts:22-23` | P1 | 统一：要么后端注册拦截器包装，要么前端明确按裸数据处理，消除 `||` 兜底 |
| F-07 | **401 刷新失败硬跳转** — `window.location.href = '/login'` 导致整页刷新，丢失 SPA 状态与未保存表单 | `client.ts:27-32` `redirectToLogin` | P2 | 改用 `router.replace({ name: 'login' })` 并携带 `redirect` query 参数 |

### 2.4 框架选型匹配度
NestJS（模块化+DI）匹配多领域家庭管理场景；Drizzle ORM 轻量、类型友好（虽本项目未用好）；Vue3+Naive UI+Pinia 匹配中后台管理界面需求。选型合理。

---

## 三、代码质量评审

### 3.1 类型安全（核心问题）

| # | 问题 | 证据 | 严重度 | 改进建议 |
|---|------|------|--------|----------|
| Q-01 | **Database 类型被定义为 `any`** — `types.ts` 注释说明为兼容 SQLite/Postgres 双驱动 union 问题而用 any，导致 **26 个 service** 全部 `@Inject(DATABASE_TOKEN) private readonly db: any`，Drizzle 的类型推断完全失效 | `db/types.ts:15` `export type Database = any`；grep `private readonly db: any` 命中 26 个 service 文件 | P0 | 选定单一驱动（SQLite）时用 `BetterSQLite3Database<typeof schema>`；需双驱动时用泛型 `BaseService<TDb>` 或条件类型。至少在 service 层用 `Database` 而非裸 `any` |
| Q-02 | **master-data 控制器使用内联 DTO，无 class-validator** — brands/shops/tags 等控制器 `@Body() dto: { name: string; notes?: string }` 是纯类型注解，运行时无验证 | `brands.controller.ts:16` `@Body() dto: { name: string; notes?: string }`；对比 `stock.dto.ts` 有完整 class-validator 装饰器 | P1 | 为每个 master-data 模块补齐 DTO class（`CreateBrandDto` 等），与 stock/products 模块保持一致 |
| Q-03 | **大量 `: any` 散落** — modules 目录下 `: any` 出现 100+ 次，集中在 controller 的 `@Request() req: any`、service 内 `Record<string, any>` 更新对象 | grep `: any` 命中 39 个文件 | P2 | 定义 `AuthenticatedRequest` 接口（stock.controller.ts 已有示范 `AuthedRequest`），全局替换 `req: any` |

### 3.2 错误处理

| # | 问题 | 证据 | 严重度 | 改进建议 |
|---|------|------|--------|----------|
| Q-04 | **事务保护不一致** — stock 的 consume/stockIn/transfer/adjust 均用 `db.transaction`，但 master-data 的 update/delete 是多条独立语句无事务（如 locations.delete 先更新子节点 parentId、再清空 invItems.locationId、再删除，任一步失败则数据不一致） | `stock.service.ts:176` `this.db.transaction`；`locations.service.ts:80-97` 无事务的 3 步操作 | P1 | master-data 的多步操作（尤其 locations.delete 级联）需包裹事务 |
| Q-05 | **数据库迁移错误被静默吞没** — `database.provider.ts` 手动执行迁移 SQL 时 `try { sqlite.exec(stmt) } catch { /* table/index may already exist */ }`，所有错误都被忽略 | `database.provider.ts:33-35` 空 catch 块 | P1 | 至少区分 "已存在" 错误与其他错误；或改用 drizzle 的 `migrate()` API |

### 3.3 代码规范一致性

| # | 问题 | 证据 | 严重度 | 改进建议 |
|---|------|------|--------|----------|
| Q-06 | **更新模式不统一** — stock.service 用 `pickDefined()` 白名单更新；master-data 用手写 `if (dto.xxx) updates.xxx = dto.xxx` 逐字段；products.service 用 `...dto` 展开直传 | `stock.service.ts:127` pickDefined；`brands.service.ts:32-34` 手写；`products.service.ts:61-66` `...dto` 展开 | P2 | 统一使用 `pickDefined` helper，products.service 的 `...dto` 展开有 mass-assignment 风险（虽 ValidationPipe whitelist 兜底，但模式不安全） |
| Q-07 | **测试覆盖极低** — 仅 2 个 spec 文件（stock.service.spec.ts、products.service.spec.ts），20+ 模块无测试 | `find src -name "*.spec.ts"` 仅 2 个结果 | P1 | 至少为核心业务（stock consume/stockIn、auth、trigger handleScan）补充单元测试 |

---

## 四、数据库框架评审

### 4.1 Drizzle ORM 使用

| # | 问题 | 证据 | 严重度 | 改进建议 |
|---|------|------|--------|----------|
| D-01 | **迁移管理混乱** — `database.provider.ts` 手动读 `.sql` 文件、按 `--> statement-breakpoint` 拆分、逐条 exec 并吞错误；同时 drizzle-kit 也生成迁移。两套机制并存，无版本追踪表 | `database.provider.ts:28-36` 手动迁移逻辑；`db/migrations/` 有 drizzle-kit 生成的 meta 目录 | P1 | 统一使用 `drizzle-orm/better-sqlite3/migrator` 的 `migrate(db, { migrationsFolder })` API，移除手动迁移代码 |
| D-02 | **schema 未定义 relations** — 仅用 `references()` 定义外键，未使用 Drizzle 的 `relations()` API，导致查询时无法用 `with` 关联预加载 | 全部 schema 文件均无 `relations()` 调用 | P2 | 补充 `relations()` 定义，使 `db.query.invItems.findMany({ with: { batches: true } })` 可用，减少手写 join |
| D-03 | **双驱动切换增加复杂度但 PG 未真正使用** — drizzle.config.ts、database.provider.ts 都支持 postgres 分支，但 schema 全部用 `sqliteTable`，切 PG 需重写全部 schema | `drizzle.config.ts` 条件分支；schema 全为 `sqliteTable` | P2 | 明确单一目标：要么移除 PG 支持代码减负，要么用 drizzle 的 `pgTable` 重写并提供独立 schema |

### 4.2 索引与约束
`0001_indexes.sql` 为高频查询字段（family_id、location_id、expiry_date、barcode）建了索引，覆盖合理。但缺乏唯一约束（见下节）。

---

## 五、数据表设计评审

| # | 问题 | 证据 | 严重度 | 改进建议 |
|---|------|------|--------|----------|
| T-01 | **master-data 表缺 (familyId, name) 唯一约束** — mdBrands/mdShops/mdTags/mdCategories/mdLocations 均无联合唯一约束，同家庭可创建同名品牌/标签 | `master-data.ts:61-77` mdBrands/mdShops 无 unique；grep schema 仅 auth/system 有 unique | P1 | 增加 `unique().on(table.familyId, table.name)` |
| T-02 | **familyMembers 缺 (userId, familyId) 唯一约束** — 同一用户可被重复加入同一家庭 | `auth.ts:27-33` familyMembers 无 unique 约束 | P1 | 增加 `unique().on(table.userId, table.familyId)` |
| T-03 | **apiTokens/refreshTokens 未级联删除** — 用户删除后 token 残留为孤儿数据 | `auth.ts:38` `references(() => users.id)` 无 `onDelete`；`auth.ts:53` 同理 | P2 | 增加 `{ onDelete: 'cascade' }` |
| T-04 | **审计字段不统一** — mdCategories/mdTags/mdItemTags 无 createdAt/updatedAt；mdLocations 有 createdAt 无 updatedAt；invStockTransactions 有 createdAt 无 updatedAt（流水表合理）；hhMealPlans 有 createdAt 无 updatedAt | 对比各 schema 文件 | P2 | 制定审计字段规范：主数据表统一 createdAt+updatedAt；关联表（mdItemTags）至少有 createdAt |
| T-05 | **无软删除机制** — 全部为硬删除，`invItems.delete` 永久移除，无恢复可能 | `stock.service.ts:170` `this.db.delete(invItems)` | P2 | 关键业务表（invItems/hhLists/hhRecipes）增加 `deletedAt` 字段实现软删除 |
| T-06 | **mdItemTags 无主键、无联合唯一** — 关联表既无 id 主键也无 (itemId, tagId) 唯一约束，可插入重复关联 | `master-data.ts:44-47` mdItemTags 定义 | P2 | 增加 `id` 主键 + `unique().on(table.itemId, table.tagId)` |
| T-07 | **字段命名不一致** — `hhHolidayTemplates.invItems` 列名用 camelCase（`text('invItems')`），其余全部 snake_case | `household.ts:67` `invItems: text('invItems', { mode: 'json' })` | P2 | 改为 `text('inv_items', { mode: 'json' })` |
| T-08 | **invItems 表过度反范式** — 单表 30+ 字段，包含价格统计（avgPrice/minPrice/maxPrice/lastPrice）、损耗率（spoilRate/avgShelfLife）、状态（currentState/cycleCount），职责过重 | `inventory.ts:29-62` invItems 定义 | P2 | 拆分：基础信息表 + 价格统计表（或物化视图）+ 状态表 |

---

## 六、可抽象总结的部分

### 6.1 master-data CRUD 高度重复（最高优先级）

**证据**：对比 brands/shops/tags/units/categories 六个 service，结构完全一致：

```
list(familyId)     → select().from(table).where(eq(familyId)).all()
create(familyId,d) → insert(table).values({familyId, ...d}).returning().get()
update(id,familyId,d) → 先查存在性 → 手写 updates 对象 → update → 返回
delete(id,familyId)→ delete().where(and(eq(id), eq(familyId))).run()
```

差异仅在字段名与表名。`brands.service.ts`（46行）、`shops.service.ts`（50行）、`tags.service.ts`（81行，多 tag-item 关联）逻辑几乎逐行复制。

**建议抽象方案**：

```typescript
// common/base-master-data.service.ts
abstract class BaseMasterDataService<TTable, TSelect, TInsert> {
  constructor(@Inject(DATABASE_TOKEN) protected db: Database, protected table: TTable) {}
  abstract list(familyId: number): Promise<TSelect[]>;
  abstract create(familyId: number, dto: TInsert): Promise<TSelect>;
  // update/delete 通用实现，子类只需声明 allowedFields
}
```

预期可消除 ~300 行重复代码，6 个 service 各仅保留 ~10 行字段声明。

### 6.2 控制器模式重复

master-data 的 6 个 controller 结构完全一致（`@Get list` / `@Post create` / `@Put :id update` / `@Delete :id delete`，均从 `req.user.familyId` 取参）。

**建议**：抽象 `BaseMasterDataController<TService>`，或用 NestJS 装饰器工厂批量生成路由。

### 6.3 "查存在性 → 构建更新 → 执行" 模式

该模式在 master-data / trigger / notifications / budget 中重复出现。已有 `pickDefined` helper（`common/helpers/partial-update.helper.ts`）但仅 stock.service 使用。

**建议**：全局推广 `pickDefined`，并在 common 中提供 `assertExists(db, table, id, familyId)` 工具函数。

### 6.4 前端 API 封装可抽象

`client.ts` 中 brandsApi/shopsApi/categoriesApi/tagsApi/unitsApi 结构完全一致（list/create/update/delete）。

**建议**：`createCrudApi(baseUrl)` 工厂函数生成标准 CRUD 方法。

---

## 七、冗余部分识别

| # | 冗余项 | 证据 | 处理建议 |
|---|--------|------|----------|
| R-01 | **history 与 stock 的 getItemHistory 重复** — `history.service.ts:17-38` 和 `stock.service.ts:396-403` 都查 invStockTransactions by itemId，逻辑重叠 | 两个 service 各有一份 | 统一到 HistoryService，stock.service 调用 history.service |
| R-02 | **getScanLogs 空桩重复** — `history.service.ts:155` 和 `trigger.service.ts:332` 都返回 `[]`，注释说"已移除 DB 存储" | 两处 `return []` | 删除这两处空方法，前端 `historyApi.getScanLogs` 也应移除 |
| R-03 | **scanner.readRfidTag 空桩** — 返回 `{ supported: false, message: 'RFID 读取功能开发中' }` | `scanner.service.ts:150-153` | 若 RFID 短期不实现，移除该方法避免误导 |
| R-04 | **discoverFromDir 未使用** — 插件发现方法无调用方 | `plugin-registry.service.ts:45-78` | 移除或接入实际调用 |
| R-05 | **@nestjs/platform-fastify 依赖未使用** — main.ts 用的是 Express（`NestExpressApplication`），但 package.json 同时安装了 fastify 适配器 | `package.json:28` `@nestjs/platform-fastify` | 移除未使用依赖 |
| R-06 | **stock.service.convertUnit 方法未使用** — 定义了单位换算但无调用方 | `stock.service.ts:601-620` | 接入 consume/stockIn 的单位换算或移除 |

---

## 八、不合理设计识别

### P0 级（严重 — 安全/数据泄露）

| # | 问题 | 证据 | 修复方案 |
|---|------|------|----------|
| P0-01 | **库存流水查询未过滤 familyId — 跨家庭越权** — `stock.service.getHistory` 接收 familyId 参数但 where 条件只用 itemId，不过滤 familyId。`history.service.getItemHistory` 同样只用 itemId。任意家庭用户可通过 itemId 查看其他家庭的库存流水 | `stock.service.ts:396-403` `.where(and(eq(invStockTransactions.itemId, itemId)))` 无 familyId；`history.service.ts:17-38` 同理 | 增加 familyId 过滤（需 join invItems 验证归属）：`.where(and(eq(...itemId), eq(invItems.familyId, familyId)))` |
| P0-02 | **AdminController 无管理员角色校验** — 仅用 `JwtAuthGuard`，任何已登录用户均可访问 `/admin/stats`、`/admin/users`、`/admin/families`，查看全部用户和家庭数据 | `admin.controller.ts:6` `@UseGuards(JwtAuthGuard)` 无角色守卫；`admin.service.ts:32-41` listUsers 返回全部用户 | 增加 `AdminGuard`（检查 `familyMembers.role === 'admin'` 或独立 isAdmin 字段），或限定特定管理员账号 |
| P0-03 | **全局错误处理未生效** — AllExceptionsFilter 未注册，未捕获异常直接由 NestJS 默认处理器返回，开发环境可能泄漏堆栈信息，生产环境错误格式不可控 | `main.ts` 无 `useGlobalFilters` | 注册全局过滤器（见 F-01） |

### P1 级（重要 — 正确性/数据一致性）

| # | 问题 | 证据 | 修复方案 |
|---|------|------|----------|
| P1-01 | **stockIn 交易类型与 schema 枚举不匹配** — schema 定义 `enum: ['add','consume','transfer','adjust']`，但 stockIn 插入 `type: 'stock-in'`（不在枚举内）。SQLite 不强制 enum，但数据不一致，history 按类型过滤会漏掉入库记录 | `inventory.ts:82` enum 定义；`stock.service.ts:328` `type: 'stock-in'` | 统一为 `type: 'add'`（与 create 方法 line 108 一致），或将枚举增加 `'stock-in'` |
| P1-02 | **locations.delete 多步操作无事务** — 先更新子节点 parentId、再清空 invItems.locationId、再删除位置，任一步失败导致数据不一致 | `locations.service.ts:80-97` 三步独立 db 调用 | 包裹 `db.transaction` |
| P1-03 | **products.update 用 `...dto` 展开** — 直接将 DTO 展开到 update.set()，虽有 ValidationPipe whitelist 兜底，但若 whitelist 配置变化则 familyId/createdAt 可被篡改 | `products.service.ts:61-66` `.set({ ...dto, updatedAt })` | 改用 `pickDefined` 白名单 |
| P1-04 | **admin.listFamilies N+1 查询** — 循环内对每个家庭单独查询 memberCount | `admin.service.ts:50-58` for 循环内 await db.select | 改为单条 SQL：`SELECT f.*, COUNT(fm.id) as memberCount FROM families f LEFT JOIN family_members fm ON ... GROUP BY f.id` |
| P1-05 | **migration 错误被吞没** — 迁移失败无任何日志，问题难以排查 | `database.provider.ts:33-35` 空 catch | 见 Q-05 |

### P2 级（一般 — 质量/可维护性）

| # | 问题 | 证据 | 修复方案 |
|---|------|------|----------|
| P2-01 | updatedAt 无自动更新机制，依赖手动 set，易遗漏 | schema 无 `$onUpdate` | 用 Drizzle 的 `.$onUpdate(() => new Date())` 或统一在 service 层强制 |
| P2-02 | 前端 401 硬跳转丢失状态 | `client.ts:30` | 见 F-07 |
| P2-03 | trigger.service 多处 `as any` 类型断言绕过枚举检查 | `trigger.service.ts:22` `codeType as any`；line 175-176 | 用 schema 推导的枚举类型替代 |

---

## 九、改进路线图建议

### 第一阶段（P0 安全修复 — 立即）
1. **注册全局 Filter + Interceptor**（F-01 / P0-03）→ 统一响应格式、防止堆栈泄漏
2. **修复 getHistory 跨家庭越权**（P0-01）→ 增加 familyId 过滤
3. **AdminController 增加管理员守卫**（P0-02）→ 防止越权访问

### 第二阶段（P1 正确性 — 1-2 周）
4. **修复 stockIn 交易类型枚举不一致**（P1-01）
5. **master-data 多步操作加事务**（P1-02 / Q-04）
6. **products.update 改用白名单**（P1-03）
7. **补齐 master-data 唯一约束**（T-01 / T-02）→ 迁移脚本 + schema 修改
8. **迁移管理统一**（D-01 / Q-05）→ 移除手动迁移，用 drizzle migrator
9. **admin.listFamilies 消除 N+1**（P1-04）

### 第三阶段（抽象与质量 — 2-4 周）
10. **抽象 BaseMasterDataService**（6.1）→ 消除 ~300 行重复
11. **Database 类型修复**（Q-01）→ 恢复 Drizzle 类型安全
12. **补齐 master-data DTO + class-validator**（Q-02）
13. **推广 pickDefined 统一更新模式**（Q-06）
14. **核心模块补测试**（Q-07）→ stock/auth/trigger 优先

### 第四阶段（优化 — 持续）
15. McpService 拆分（F-02）
16. 插件 exports 类型强化（F-04）
17. 前端 401 跳转优化（F-07）
18. 清理冗余空桩（R-02 / R-03 / R-04 / R-06）

---

## 十、总结

HomeHub 项目整体架构设计有一定水准：NestJS 模块分层清晰、插件系统扩展点机制有前瞻性、前端 axios 拦截器并发刷新处理成熟、Drizzle schema 按领域分文件组织合理。

但存在三类系统性问题需优先解决：

1. **类型安全严重退化**：Database 类型为 `any` 致使 26 个 service 全部失去 Drizzle 类型保护，`db: any` 让编译期错误检查形同虚设——这是全项目最大的技术债。

2. **安全防护不足**：3 个 P0 级问题（跨家庭越权、admin 无角色校验、全局错误处理未生效）直接影响数据安全，须立即修复。

3. **重复代码未抽象**：master-data 六个子模块的 CRUD 逻辑高度复制粘贴，维护时一处改六处漏改风险高，应尽快抽象基类。

建议按路线图分阶段推进，P0 安全问题应在当前迭代内完成修复。
