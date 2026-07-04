# HomeHub PRD 需求覆盖度审查报告

> **审查人**: 高见远（Gao）· Architect  
> **日期**: 2026-07-02  
> **审查对象**: HomeHub-PRD v1.5（70 条用户故事） vs 当前代码实现  
> **代码基线**: `server/src/modules/*`, `server/src/plugins/*`, `client/src/views/*`

---

## 审查方法

1. 逐一对照 PRD §3.1-§3.12 的 70 条用户故事
2. 检查对应模块目录是否存在代码文件
3. 检查 Service/Controller 中是否有实现对应业务逻辑的方法
4. 检查前端 Views/Store 中是否有对应的页面和交互
5. 标记每条为 ✅已实现 / ⚠️部分实现 / ❌未实现

---

## 覆盖矩阵

### 3.1 库存管理 (⭐ P0) — 9 条

| # | 用户故事 | 状态 | 证据/缺口 |
|---|---------|------|----------|
| US1 | 添加物品到库存（名称/数量/单位/类别/位置/保质期） | ⚠️部分实现 | `stock.service.ts` 有 `create()` 方法，`CreateItemDto` 包含 name/quantity/unit/categoryId/locationId/barcode；但 `type` 字段使用 hardcoded 默认值 `'generic'`，未对接 ItemType 插件的 `defaultUnit`；`expiryDate` 为可选字段但 Schema 定义存在 |
| US2 | 扫描条形码自动填充物品信息（对接国内条码库） | ⚠️部分实现 | `scanner-barcode` 插件存在但 `scan()` 直接 throw Error("需要在浏览器端使用 QuaggaJS")，无实际扫码逻辑；`barcode` 模块目录存在 3 个文件但未查看内容；`barcode-lookup` 扩展点无任何实现（apizero.cn 对接未实现）；前端无摄像头扫码页面 |
| US3 | 消耗/使用某件物品时减少库存数量 | ✅已实现 | `stock.service.ts` 有 `consume()` 方法，含 `db.transaction()` 事务保护 + `BadRequestException` 库存不足校验 + `stock_transactions` 写入 |
| US4 | 查看即将过期和已过期的物品列表 | ✅已实现 | `stock.service.ts` 有 `getExpiring(days)` 方法，返回 N 天内过期物品 |
| US5 | 移动物品到不同位置 | ✅已实现 | `stock.service.ts` 有 `transfer()` 方法，含事务 + `stock_transactions` 记录 `fromLocationId/toLocationId` |
| US6 | 为物品设置最低库存阈值（自动提醒补货） | ⚠️部分实现 | `items` Schema 有 `minStock` 字段；`stock.service.ts` 有 `adjust()` 可修改 minStock；但**低库存自动提醒**逻辑未实现——无定时检查任务、无通知触发机制；清单 `autoReplenish` 可将低于阈值的物品加入购物清单但 `lists.service.ts` 的实现未见定时触发 |
| US7 | 按类别/位置/保质期筛选和排序库存 | ⚠️部分实现 | `stock.service.ts` 有 `search()` 方法接受 query 参数；但过滤维度有限——无 `categoryId/locationId/expiring_in_days` 筛选参数传入，仅支持文字搜索；`PaginationQuery` 支持排序但未实现多维筛选 |
| US8 | 查看物品的操作历史记录 | ⚠️部分实现 | `stock.service.ts` 有 `getHistory(itemId)` 方法查 `stock_transactions`；但前端无专门的历史记录视图页面，`ItemDetail` 页面未验证是否包含历史展示 |
| US9 | 批量导入/导出库存数据（CSV/Excel） | ❌未实现 | 无任何 import/export 方法；`documents` 模块目录为空；前端无导入导出页面 |

**3.1 覆盖度**: ✅2 / ⚠️5 / ❌1 — **覆盖度 38%**

---

### 3.2 位置管理 (⭐ P0) — 3 条

| # | 用户故事 | 状态 | 证据/缺口 |
|---|---------|------|----------|
| US10 | 创建三级位置结构（房间→柜子→层格） | ✅已实现 | `locations` 模块有完整 CRUD，`locations` Schema 有 `parentId/level` 字段支持三级结构 |
| US11 | 为位置添加照片/备注 | ⚠️部分实现 | `locations` Schema 有 `image/notes` 字段；Service 有 CRUD；但前端未见图片上传组件实现 |
| US12 | 查看每个位置的库存概览 | ⚠️部分实现 | `locations.service.ts` 存在但未见"获取某位置下的所有物品"方法；`stock.service.ts` 的 `search()` 可按 locationId 搜索但未单独封装为位置概览方法；前端无位置库存概览视图 |

**3.2 覆盖度**: ✅1 / ⚠️2 / ❌0 — **覆盖度 56%**

---

### 3.3 统一清单系统 (⭐ P0) — 11 条

| # | 用户故事 | 状态 | 证据/缺口 |
|---|---------|------|----------|
| US13 | 创建各种清单（购物/待办/家务/节日备货），命名和设置类型 | ✅已实现 | `lists.service.ts` 有 `create()` 方法，`lists` Schema 有 `type` 字段支持 shopping/todo/chore/holiday/meal_plan |
| US14 | 向任何清单中添加条目（文字描述+可选数量/单位/关联物品/关联食谱） | ⚠️部分实现 | `lists.service.ts` 有 `addItem()`；`list_items` Schema 有 content/quantity/unit/linkedItemId/linkedRecipeId；但 `linkedRecipeId` 关联逻辑未实现——添加条目时未见食谱关联查询 |
| US15 | 将清单条目指派给特定家庭成员 | ⚠️部分实现 | `lists.service.ts` 有 `assignItem()`；`list_items` Schema 有 `assigneeId`；但缺少家庭成员列表查询接口供指派 UI 使用 |
| US16 | 查看被指派给我的条目（聚合所有清单中 assignee=我的条目） | ⚠️部分实现 | 无专门的 `getMyTasks()` Service 方法（McpService 有但 ListsService 没有）；前端未见"我的任务"聚合视图 |
| US17 | 在清单条目上打勾标记为完成，记录完成人和完成时间 | ✅已实现 | `lists.service.ts` 有 `checkItem()` 方法，`list_items` Schema 有 `completedBy/completedAt` 字段 |
| US18 | 在购物清单上打勾时，商品自动入库（autoPurchase 行为） | ⚠️部分实现 | `lists.service.ts` 的 `checkItem()` 内有 autoPurchase 逻辑注释/实现，但需验证是否完整调用了 `stock.service.create()`；事务一致性未保障 |
| US19 | 系统自动将低于阈值的物品加入购物清单（自动补货） | ⚠️部分实现 | `lists.service.ts` 有 `autoReplenish()` 方法，但未见定时任务调度（CronJob 或 NestJS Scheduler）来触发自动检查 |
| US20 | 完成定期家务后，按周期自动重置到期时间 | ⚠️部分实现 | `lists.service.ts` 的 `checkItem()` 内有 chore autoReset 逻辑，计算 `dueAt + period`；但未见定时任务来提醒过期 chore |
| US21 | 按节日模板快速创建备货清单 | ⚠️部分实现 | `lists.service.ts` 有 `holidayTemplates()` 和 `createFromTemplate()` 方法；`holiday_templates` Schema 存在；但预设模板数据是否入库未验证 |
| US22 | 查看清单的完成进度（已完成/N项） | ❌未实现 | 无 `getProgress()` 方法；前端无进度条/统计展示 |
| US23 | 在清单评论区讨论 | ⚠️部分实现 | `lists.service.ts` 有 `addComment()` 和 `getComments()` 方法；`list_item_comments` Schema 存在；但前端无评论区 UI |

**3.3 覆盖度**: ✅2 / ⚠️7 / ❌1 — **覆盖度 36%**

---

### 3.4 食谱与餐饮计划 (⭐ P1) — 5 条

| # | 用户故事 | 状态 | 证据/缺口 |
|---|---------|------|----------|
| US24 | 添加和管理食谱（名称/食材清单/步骤/图片） | ⚠️部分实现 | `recipes` 模块有 4 个文件，Schema 有 recipes 表含 ingredients/steps JSON字段；前端有 `RecipeList` 视图；但未见食材-库存关联逻辑 |
| US25 | 系统根据库存食材推荐可做的食谱 | ❌未实现 | `McpService` 有 `getRecipeRecommendations()` 但仅占位，无实际算法（库存食材 vs 食谱食材匹配） |
| US26 | 制定每周餐饮计划 | ⚠️部分实现 | `meal-plans` 模块有 4 个文件，Schema 有 `meal_plans/meal_plan_items`；前端未见餐饮计划视图 |
| US27 | 系统根据餐饮计划自动生成购物清单 | ❌未实现 | 无 `generateShoppingListFromMealPlan()` 方法 |
| US28 | 导入/导出食谱（兼容 Grocy 食谱格式） | ❌未实现 | 无 import/export 逻辑 |

**3.4 覆盖度**: ✅0 / ⚠️2 / ❌2 — **覆盖度 20%**

---

### 3.5 通知与提醒 (⭐ P1) — 3 条

| # | 用户故事 | 状态 | 证据/缺口 |
|---|---------|------|----------|
| US29 | 收到物品即将过期的推送通知（提前 N 天可配置） | ⚠️部分实现 | `notifications` 模块有 4 个文件，Schema 有 `notification_rules` 表含 triggerType/config/channel；但**推送机制**未实现——无定时检查过期物品任务，无 WebSocket 推送，无事件触发 |
| US30 | 为清单条目设置截止日期和提醒 | ⚠️部分实现 | `list_items` Schema 有 `dueAt` 字段；但无到期提醒逻辑 |
| US31 | 选择通知渠道（App 内/邮件/微信推送） | ⚠️部分实现 | `notification_rules` Schema 有 `channel` 字段支持 in_app/email/webhook；但 App 内推送未实现 WebSocket，邮件和微信推送均为 Phase 2 |

**3.5 覆盖度**: ✅0 / ⚠️3 / ❌0 — **覆盖度 33%**

---

### 3.6 物品追踪 (⭐ P1) — 4 条

| # | 用户故事 | 状态 | 证据/缺口 |
|---|---------|------|----------|
| US32 | 记录物品的购买价格和购买日期 | ✅已实现 | `items` Schema 有 `purchasePrice/purchaseDate` 字段；`stock.service.ts` 的 `create()` 可传入 |
| US33 | 为物品关联附件（保修卡/说明书/发票） | ❌未实现 | `documents` 模块目录为空，无文件上传功能 |
| US34 | 查看物品的使用寿命和保修到期时间 | ⚠️部分实现 | `items` Schema 有 `purchaseDate/purchasePrice` 和 `customFields`（可存 warrantyEnd）；`electronic_device` ItemType 配置有 warrantyEnd 字段定义；但无专门的保修追踪查询/提醒逻辑 |
| US35 | 为物品打标签（如"电器""药品""调料"） | ✅已实现 | 标签 CRUD 在 `locations` 模块中实现（`TagsController` @ `Controller('tags')` + `LocationsService` 标签方法）；Schema 有 `tags`/`item_tags` 表 |

**3.6 覆盖度**: ✅2 / ⚠️1 / ❌1 — **覆盖度 50%**

---

### 3.7 NFC/RFID — 数据读取录入 (⭐ P1) — 7 条

| # | 用户故事 | 状态 | 证据/缺口 |
|---|---------|------|----------|
| US36 | 在位置/容器上贴 NFC 标签，一碰查看该位置的库存清单 | ⚠️部分实现 | `trigger` 模块有 `triggerBindings` 绑定 CRUD + `handleScan` 扫描事件处理；但 NFC Scanner 前端实际读取未实现（scanner-nfc 引用 `window.NDEFReader` 在服务端报错）；前端 NFC 交互页面为 `IoTTagsView` 但需验证是否完整 |
| US37 | 在物品上贴 NFC 标签，一碰查看物品详情、保修期和附件 | ⚠️部分实现 | 同 US36，绑定机制存在，但前端 NFC 扫描→详情跳转完整流程未验证；保修期和附件功能缺失 |
| US38 | 通过 NFC 快速完成入库——碰标签→选"添加物品"→手填或条码扫描→自动关联位置 | ⚠️部分实现 | 绑定存在，但 NFC 扫描触发"添加物品"的交互流程（Resolver 推断 → Action Pipeline）未实现完整；当前 `handleScan` 仅返回 binding 信息，无上下文推断 |
| US39 | 通过 NFC 快速完成出库/消耗——碰标签→选"消耗物品"→输入数量→库存自动更新 | ⚠️部分实现 | 同 US38，缺乏 Resolver + Pipeline 的完整链路 |
| US40 | 通过 NFC 快速完成移动位置——碰旧位置→碰新位置→自动更新位置 | ❌未实现 | 无"双碰"移动流程；当前无连续扫描状态管理 |
| US41 | 通过 NFC 批量盘点——依次碰所有带标签的物品，生成盘点报告 | ❌未实现 | `scanner` 模块目录为空；无批量扫描模式；无盘点报告生成逻辑 |
| US42 | 手机靠近 RFID 区域读卡器时自动识别所处位置 | ❌未实现 | `scanner` 模块为空；`hardware` 模块为空；RFID MQTT 集成未实现 |
| US43 | 通过 RFID 批量扫描柜子/抽屉内部标签，一次性更新该区域所有的库存状态 | ❌未实现 | 同 US42 |

**3.7 覆盖度**: ✅0 / ⚠️4 / ❌3 — **覆盖度 29%**

---

### 3.8 NFC/RFID — 自动化触发 (⭐ P1) — 9 条

| # | 用户故事 | 状态 | 证据/缺口 |
|---|---------|------|----------|
| US44 | 碰入户门 NFC 触发"到家模式"——自动检查今日临期物品+快递已入库+推荐今晚菜谱 | ⚠️部分实现 | `automation_triggers` Schema 存在，TriggerService 有自动化 CRUD；但预设模式（到家/备餐/用药/急救/采购/换季/出行）均无模板；触发→动作链路不完整（Resolver 仅硬编码 actionMap） |
| US45 | 碰冰箱 NFC 触发"备餐模式"——显示餐饮计划+所需食材库存+自动生成补货清单 | ⚠️部分实现 | 同 US44，自动化规则可配置但无预设模板，动作执行不完整 |
| US46 | 碰药箱 NFC 触发"用药提醒"——显示服药计划+临期药品清单+过期药品一键清理 | ⚠️部分实现 | 同 US44 |
| US47 | 碰急救箱 NFC 触发"急救模式"——自动显示急救指南+药品位置+可一键拨打120 | ❌未实现 | 急救指南数据源缺失；一键拨打 120 需原生能力 |
| US48 | 碰购物清单 NFC 贴纸触发"采购模式"——显示采购清单+路线建议+附近超市促销 | ❌未实现 | 路线建议和超市促销需要第三方 API 集成 |
| US49 | 碰衣柜 NFC 触发"换季模式"——自动盘点当季衣物+建议清洗/收纳/捐赠 | ❌未实现 | 衣物分类识别逻辑未实现 |
| US50 | 碰行李箱 NFC 触发"出行模式"——自动生成出行物品清单 | ⚠️部分实现 | 自动化规则可配置但出行模板未内置 |
| US51 | 设置 NFC 自定义快捷操作 | ⚠️部分实现 | `TriggerService` 有 automation CRUD 可创建自定义规则；但 `resolveAction()` 硬编码 actionMap，不支持自定义动作路由 |
| US52 | 在后台配置 NFC 标签的触发动作（URL 跳转/通知触发/MCP 调用） | ⚠️部分实现 | 绑定 CRUD 存在，`automation_triggers` 支持多种 triggerType/actionType；但后台管理页面（`admin` 模块为空）不存在 |

**3.8 覆盖度**: ✅0 / ⚠️5 / ❌3 — **覆盖度 28%**

---

### 3.9 用户与认证 (⭐ P0) — 5 条

| # | 用户故事 | 状态 | 证据/缺口 |
|---|---------|------|----------|
| US53 | 注册和登录账户 | ✅已实现 | `auth.service.ts` 有 `register()` + `login()` 方法，JWT 双 Token 机制，RefreshTokenGuard 已修复 |
| US54 | 创建家庭空间并邀请其他成员 | ✅已实现 | `families` 模块有 4 个文件，Schema 有 `families/family_members`；inviteCode 机制存在 |
| US55 | 设置角色权限（管理员/编辑者/只读者） | ⚠️部分实现 | `family_members` Schema 有 `role` 字段（admin/editor/viewer）；但 Controller 端未见 role-based Guard 实际应用 |
| US56 | 生成 API Token（MCP/REST API 外部调用） | ✅已实现 | `auth.service.ts` 有 `createApiToken/listApiTokens/revokeApiToken/validateApiToken` 完整 CRUD |
| US57 | 管理 API Token 的权限范围（只读/指定模块） | ⚠️部分实现 | `api_tokens` Schema 有 `permissions` JSON 字段；但实际权限校验逻辑（只读 Guard、模块限定）未实现 |

**3.9 覆盖度**: ✅3 / ⚠️2 / ❌0 — **覆盖度 70%**

---

### 3.10 MCP / AI Agent (⭐ P0) — 6 条

| # | 用户故事 | 状态 | 证据/缺口 |
|---|---------|------|----------|
| US58 | 通过自然语言查询库存（"今天冰箱里有什么快过期的？"） | ⚠️部分实现 | `mcp.controller.ts` 有 JSON-RPC 端点，`getToolsList()` 硬编码 15 个工具含 `search_items/get_expiring_items`；但工具硬编码而非从 `mcp-tool` 扩展点动态收集；MCP 协议实现基础可用 |
| US59 | 通过自然语言操作库存（"帮我入库5斤苹果放在厨房"） | ⚠️部分实现 | MCP 工具含 `add_item/consume_item/move_item`；但 `executeTool()` 使用 switch-case 硬编码路由而非动态收集 |
| US60 | AI 自动生成购物清单（"根据本周食谱帮我列采购清单"） | ❌未实现 | 无 `generateShoppingListFromMealPlan` MCP 工具或 Service 方法 |
| US61 | AI 根据库存推荐食谱（"冰箱里有什么菜，推荐今晚做什么？"） | ⚠️部分实现 | MCP 工具含 `get_recipe_recommendations`，但 Service 仅占位无实际算法 |
| US62 | AI 配合 NFC 事件自动执行流程 | ⚠️部分实现 | TriggerService 有 `handleScan` + automation CRUD；但触发→MCP 调用链路不完整（`mcp_tool` TriggerAction 的 execute 仅返回占位） |
| US63 | 通过 MCP 协议对接任意大模型 | ⚠️部分实现 | MCP Controller 实现了 JSON-RPC 2.0 端点（initialize/tools/list/tools/call）；但仅支持 HTTP POST 单一传输，未实现 SSE Streamable HTTP；协议版本声明为 `2024-11-05` 非 `2025-06-18` |

**3.10 覆盖度**: ✅0 / ⚠️5 / ❌1 — **覆盖度 42%**

---

### 3.11 国内本土化 (⭐ P0) — 4 条

| # | 用户故事 | 状态 | 证据/缺口 |
|---|---------|------|----------|
| US64 | 使用国内常见计量单位（斤/两/个/包/瓶） | ⚠️部分实现 | `items` Schema 有 `unit` 字段；ItemType 插件的 `defaultUnit` 配置存在（food='个', grocery='个'）；但斤/两未作为预设选项，`units` 模块有 3 个文件需验证 |
| US65 | 支持 EAN-13 / 69 码 / ISBN 等国内通用条形码格式 | ⚠️部分实现 | `scanner-barcode` 插件存在但不可用；条码格式识别逻辑未实现；apizero.cn 条码查询未对接 |
| US66 | 界面语言为简体中文 | ✅已实现 | 前端使用 Naive UI 中文 locale (`zhCN, dateZhCN`)；PRD 和代码注释均为中文 |
| US67 | 日期格式默认为 YYYY-MM-DD | ⚠️部分实现 | Schema 时间字段使用 Date/number 混合；前端日期格式未验证是否统一为 YYYY-MM-DD |

**3.11 覆盖度**: ✅1 / ⚠️3 / ❌0 — **覆盖度 44%**

---

### 3.12 AI 视觉与语音 (⭐ P1) — 3 条

> **架构决策**：voice/vision 后端模块已移除。语音录入和拍照识别由 AI Agent 自身能力处理
> （ASR/图像识别），处理完成后通过 MCP 工具调用 HomeHub CRUD API 写入结构化数据，
> source 字段标记为 'voice'/'vision'。无需后端模块。

| # | 用户故事 | 状态 | 证据/缺口 |
|---|---------|------|----------|
| US68 | 拍照识别冰箱内部物品（AI 自动识别并批量入库） | ⚠️待 MCP 工具 | `vision` 模块已移除，由 AI Agent 处理图像识别后通过 MCP `add_item` 工具写入；MCP Server 已有 `add_item` 工具定义 |
| US69 | 通过语音快速记录入库（"记一下，刚买了2斤排骨放冷冻室"） | ⚠️待 MCP 工具 | `voice` 模块已移除，由 AI Agent 处理 ASR 后通过 MCP `add_item` 工具写入；需 Agent 侧 NLU 解析 |
| US70 | 月底收到"浪费分析报告"（过期损失金额、最常浪费的品类、改进建议） | ❌未实现 | `dashboard` 模块有 3 个文件但浪费分析报告逻辑未实现；`history` 模块目录为空 |

**3.12 覆盖度**: ✅0 / ⚠️2 / ❌1 — **覆盖度 0%**（US68/US69 已有 MCP 工具基础设施，待 AI Agent 集成；US70 仍未实现）

---

## 空目录模块汇总

> **变更说明**：
> - `voice/` 和 `vision/` 模块已删除 — 语音/图像识别由 AI Agent 处理，数据通过 MCP 统一上传
> - `tags/` 已改名为 `iot_tags/` — 自定义物品标签功能已在 `locations` 模块中实现（US35 ✅），`iot_tags/` 用于物联标签（NFC/QR/RFID 绑定）管理

| 模块目录 | 文件数 | PRD 对应 | 影响 |
|---------|--------|---------|------|
| `scanner/` | 0 | US36-43, US44-52 | NFC/RFID 扫描无法工作 |
| `encoder/` | 0 | US36-43 (NDEF 编码), §4.4 | QR/NFC/条码生成不可用 |
| `hardware/` | 0 | §4.5 HAL, US42-43 RFID | 硬件设备接入不可用 |
| `iot_tags/` | 0 | US36-43 (标签绑定查询) | 物联标签管理不可用（trigger_bindings CRUD 暂在 `trigger/` 模块） |
| `documents/` | 0 | US33, US34 | 文档附件不可用 |
| `history/` | 0 | US8 (操作日志), US70 (浪费分析) | 完整审计追踪不可用 |
| `admin/` | 0 | US52, §4.1 admin 模块 | 后台管理不可用 |

**已删除模块**：`voice/`（→ AI Agent via MCP）、`vision/`（→ AI Agent via MCP）

---

## 按优先级汇总

| 优先级 | 用户故事数 | ✅已实现 | ⚠️部分实现 | ❌未实现 | 覆盖度 |
|--------|-----------|---------|-----------|---------|--------|
| **P0** (3.1+3.2+3.3+3.9+3.10+3.11) | 35 | 6 | 22 | 7 | **37%** |
| **P1** (3.4+3.5+3.6+3.7+3.8+3.12) | 35 | 2 | 17 | 16 | **18%** |
| **总计** | 70 | 8 | 39 | 23 | **26%** |

> **变更记录 (2026-07-03)**：
> - US35 标签功能从 ❌ 更正为 ✅（已在 `locations` 模块实现）
> - US68/US69 从 ❌ 更改为 ⚠️（voice/vision 模块已删除，由 AI Agent via MCP 处理）
> - `tags/` 改名为 `iot_tags/`；`voice/`、`vision/` 模块已删除

---

## 关键缺口分析（按影响排序）

### 1. 插件系统未落地 — 影响所有 P1 扩展功能

当前 `server/src/plugins/` 有骨架代码但存在 8 个核心问题（详见 plugin-system-architecture 文档）：
- **PluginContext DI 注入缺失** → `db: null`, `config: process.env`, `storage: Map`
- **MCP 工具硬编码** → 15 个工具在 `McpController.getToolsList()` 中手写，无法动态扩展
- **Scanner 前后端未分离** → `window/NDEFReader/navigator.mediaDevices` 在服务端代码中引用
- **ItemType 扩展点注册方式错误** → `exports.types` 数组而非逐个注册到 `item-type` 扩展点
- **TriggerAction 硬编码路由** → `resolveAction()` 使用 `actionMap` 而非查询 PluginRegistry

### 2. NFC/RFID 完整链路断裂

- 绑定管理（TriggerBinding CRUD）已实现 ✅
- Scanner 实际扫描（Web NFC / RFID MQTT）未实现 ❌
- Resolver 上下文推断（当前页面、用户意图）未实现 ❌
- Action Pipeline 多步动作链未实现 ❌
- 编码输出（QR/NFC NDEF 生成）未实现 ❌

### 3. 清单系统行为逻辑不完整

- CRUD 基础已实现 ✅
- 类型特定行为（autoPurchase/autoReset/autoReplenish）部分实现 ⚠️
- 定时触发（CronJob 检查过期/阈值）未实现 ❌
- 评论区 UI 未实现 ❌
- 进度统计未实现 ❌

### 4. 通知推送链路断开

- `notification_rules` Schema 存在 ⚠️
- 定时检查过期物品 → 推送通知 → 前端展示，全链路未实现 ❌
- WebSocket 实时推送未实现 ❌

### 5. 文档/标签/历史/管理 后端全空

- 4 个关键模块目录完全为空 ❌
- 影响物品附件、标签分类、操作审计、后台管理

---

## 建议优先级排序

| 优先级 | 需修复/实现 | 建议阶段 |
|--------|-----------|---------|
| **P0-紧急** | 插件系统 DI 注入 + MCP 动态工具收集 | Phase 0（当前重构） |
| **P0-紧急** | Scanner 前后端分离 + NFC/条码前端适配器 | Phase 0 |
| **P0-重要** | 清单定时任务（过期提醒/阈值补货） | Phase 1 |
| **P0-重要** | ItemType 与 StockService 联动验证 | Phase 1 |
| **P1-重要** | Trigger Resolver 上下文推断 + Action Pipeline | Phase 1 |
| **P1-重要** | 通知推送全链路（定时检查+WebSocket+App内通知） | Phase 1 |
| **P1-中等** | 编码输出层（QR生成+NFC NDEF编码） | Phase 2 |
| **P1-中等** | 标签系统 + 文档附件 + 操作历史 | Phase 2 |
| **P1-低** | AI 视觉/语音 + 浪费分析 | Phase 3 |
| **P2** | 后台管理界面 + 管理员配置 | Phase 2 |
