# HomeHub — 家庭智能管家 PRD

> 版本：v1.5 | 状态：草稿 | 日期：2026-06-29

---

## 一、Problem Statement

### 1.1 现状痛点

现有家庭库存管理软件以国外项目为主，国内产品功能零散：

**国外开源项目：**

| 项目 | 优点 | 缺点 |
|------|------|------|
| **Grocy** (v4.6.0, 9.2k⭐) | 库存管理（批次/保质期/消耗追踪）、购物清单自动补货、食谱&餐饮计划、家务任务、已有 Android/iOS 原生客户端、支持 35 种语言（含中文社区翻译）、ZXing 扫码引擎 | PHP + Blade 技术栈过时、UI 陈旧、中文翻译不完整、不支持国内计量单位（斤/两）和 69 码、无 NFC/RFID 支持、中文条码库不可用 |
| **HomeBox** (v0.26.2, 6.5k⭐) | 物品位置追踪（三级定位）、保修/价值追踪、文档附件管理、多用户/组协作、Collections 多空间、生命周期管理 | Go+Vue 但无购物清单/食谱/提醒、无 NFC/RFID 支持、偏物品资产管理而非日常消耗品管理 |

**国内商业产品：**

| 产品 | 优点 | 缺点 |
|------|------|------|
| **收起来** | 最接近完整方案：AI 识图、扫码录入、电商订单导入（淘宝/拼多多等 10+ 平台）、保质期提醒、家庭共享 | 闭源、无 NFC 支持、无保修/文档/维护追踪、无食谱/餐饮计划、无 MCP/AI Agent 集成 |
| **食光冰箱/冰箱控** | 食品保质期管理+食谱推荐、AI 拍照识别 | 仅聚焦冰箱食品、不支持日用品/药品/电器、无位置追踪、同质化严重 |
| **保质期管家** | 本地优先、隐私友好、条码复用 | 功能极简、无家庭共享、无 NFC |

**智能家居平台（米家/海尔智家/美的美居/华为智慧生活）：** 仅追踪自家设备耗材和维保，不提供通用物品库存管理。

**核心问题：** 没有一个现代化、中文化、支持 AI 交互 + 物理标签（NFC/RFID）的**全品类**家庭库存管理系统。现有方案要么只管食品不管电器（国内 App），要么技术栈过时/不符合国内习惯（国外开源），要么只管设备不管日用品（智能家居平台）。

### 1.2 目标用户

| 阶段 | 用户画像 | 核心诉求 |
|------|---------|---------|
| **MVP** | 家庭用户（2-6 人） | 管理冰箱/药箱/日用品库存，过期提醒，购物清单，一碰即查 |
| **未来** | SaaS 多家庭/小团队 | 多空间管理、权限控制、数据看板+NFC 批量盘库 |

---

## 二、Solution

### 2.1 产品定位

> **HomeHub** — 一个现代化、中文化、AI 驱动的家庭库存管理系统。融合 Grocy 的库存管理与 HomeBox 的物品追踪能力，以 Vue 3 + NestJS 全 TypeScript 技术栈重写，原生支持 NFC/RFID 物理标签交互。

### 2.2 技术架构

```
┌────────────────────────────────────────────────┐
│              AI Agent 层 (MCP 协议)              │
│  可接入 Claude/GPT/DeepSeek/通义千问/OpenClaw   │
├────────────────────────────────────────────────┤
│           Vue 3 + Vite + Naive UI              │
│   (PWA 支持，桌面 + 移动端一套代码)              │
├────────────────────────────────────────────────┤
│             NestJS 后端 (TypeScript)            │
│         REST API / WebSocket / Plugin           │
├────────────────────────────────────────────────┤
│           MCP Server 插件 (内置 Plugin)          │
│    将 REST API 映射为 MCP Tools + 插件扩展工具   │
├────────────────────────────────────────────────┤
│           Drizzle ORM (适配器模式 — 主推 PostgreSQL)              │
│   PostgreSQL (默认部署: JSONB/全文索引/pgvector)                 │
│   SQLite (单用户备选: 改一行配置)                               │
└────────────────────────────────────────────────┘
```

### 2.3 NFC/RFID 硬件架构

```
┌──────────────────────────────────────────┐
│       移动端 (PWA + Web NFC API)          │
│  ┌─ Android: Chrome/Edge Web NFC 89+    │
│  └─ iOS: NDEF URL 跳转（触碰自动打开Safari）│
│     注: iOS 不支持 Web NFC API 读写，     │
│     但系统级 NDEF 读取可触发 URL 跳转      │
├──────────────────────────────────────────┤
│           NFC 标签 (NTAG213/215)           │
│  贴于位置（冰箱门/药箱/衣柜/入户门）         │
│  贴于物品（电器/工具/重要文件）              │
│  内容: NDEF URL (在线回退) + HH:01 自定义编码 (离线解析) │
├──────────────────────────────────────────┤
│        RFID (可选进阶方案)                 │
│  ┌─ HF RFID (13.56MHz) → 柜级区域感知    │
│  └─ UHF RFID (未来) → 全屋批量盘点       │
└──────────────────────────────────────────┘
```

> **iOS 策略说明：** iOS Safari 不支持 Web NFC API，无法在 PWA 内程序化读写 NFC 标签。但 iOS 系统原生支持 NDEF 标签读取——用户触碰 NFC 标签后，系统自动弹出通知并跳转到标签中写入的 URL。因此 iOS 用户的 NFC 交互路径为：**触碰标签 → 系统通知 → 打开 HomeHub URL → 自动执行对应动作**。详见 4.3.6 节。

### 2.4 技术选型决策

| 层面 | 选择 | 理由 |
|------|------|------|
| 前端框架 | **Vue 3 + Vite** | 国内生态最成熟，Composition API 优秀 |
| UI 组件库 | **Naive UI** | 类型系统最严谨、AI 生成代码质量高、移动端响应式内置、CSS-in-JS 零侵入定制 |
| 后端框架 | **NestJS** | 模块化/DI/Guard 天然适合复杂业务，官方支持 MCP |
| ORM | **Drizzle ORM** | 类型安全第一，同一 Schema 适配 SQLite + PostgreSQL |
| 数据库 | PostgreSQL (默认部署) / SQLite (单用户备选) | JSONB 原生 JSON 查询/全文索引/pgvector 扩展/Drizzle 一行配置切换 |
| AI 集成 | **MCP 插件** (内置 Plugin) | MCP Server 作为插件运行，不绑定模型；插件扩展 `mcp-tool` 点可注册自定义工具 |
| 移动端 | **PWA** | 一套代码覆盖 Web + 手机，vite-plugin-pwa 一行配置。注意：国内浏览器 PWA 支持碎片化（华为浏览器不支持安装，需引导安装 Chrome），详见 4.11 节 |
| 认证 | JWT (Access + Refresh Token) + API Token | 双 Token 安全，API Token 支持 MCP 无状态调用 |
| **物联交互** | **Web NFC API + NDEF URL 跳转 + 自定义 RFID 网关** | Android 零硬件成本（Web NFC）；iOS 通过 NDEF URL 跳转实现只读交互；RFID 通过 MQTT 网关扩展 |

---

## 三、User Stories

### 3.1 库存管理 (⭐ P0)

1. 作为家庭用户，我想**添加物品到库存**（名称/数量/单位/类别/位置/保质期），以便掌握家中物资情况
2. 作为家庭用户，我想**扫描条形码自动填充物品信息**（对接国内条码库），以便快速录入
3. 作为家庭用户，我想**消耗/使用某件物品时减少库存数量**，以便库存保持准确
4. 作为家庭用户，我想查看**即将过期和已过期的物品列表**，以便及时处理
5. 作为家庭用户，我想**移动物品到不同位置**，以便追踪物品流转
6. 作为家庭用户，我想**为物品设置最低库存阈值**，以便系统自动提醒补货
7. 作为家庭用户，我想**按类别/位置/保质期筛选和排序库存**，以便快速找到需要的物品
8. 作为家庭用户，我想**查看物品的操作历史记录**，以便追溯
9. 作为家庭用户，我想**批量导入/导出库存数据**（CSV/Excel），以便从旧系统迁移

### 3.2 位置管理 (⭐ P0)

10. 作为家庭用户，我想**创建三级位置结构**（房间→柜子→层格），以便精确定位物品
11. 作为家庭用户，我想**为位置添加照片/备注**，以便快速识别
12. 作为家庭用户，我想**查看每个位置的库存概览**，以便知道某个区域放了多少东西

### 3.3 统一清单系统 (⭐ P0)

取代 Grocy 的购物清单 + chores + 任务三套独立模块。所有清单共用同一数据模型，通过 type 区分行为。

**清单类型：**
| 类型 | 标识 | 特殊行为 |
|------|------|---------|
| 购物清单 | `shopping` | 打勾可选 → 自动入库；库存低于阈值自动加入 |
| 待办清单 | `todo` | 简单的完成/未完成，可指派成员 |
| 定期家务 | `chore` | 完成 → 按周期自动重置 dueAt（如"每周拖地"） |
| 节日备货 | `holiday` | 按节日模板预填 + 到期提醒 |
| 餐饮采购 | `meal_plan` | 由餐饮计划自动生成 |

13. 作为家庭用户，我想**创建各种清单（购物/待办/家务/节日备货）**，并为清单命名和设置类型
14. 作为家庭用户，我想**向任何清单中添加条目**（文字描述 + 可选数量/单位/关联物品/关联食谱）
15. 作为家庭用户，我想**将清单条目指派给特定家庭成员**，以便分工协作
16. 作为家庭用户，我想**查看被指派给我的条目**（聚合所有清单中 assignee=我的条目），以便知道自己要做什么
17. 作为家庭用户，我想**在清单条目上打勾标记为完成**，并记录完成人和完成时间
18. 作为家庭用户，我想**在购物清单上打勾时，商品自动入库到库存**（autoPurchase 行为）
19. 作为家庭用户，我想**系统自动将低于阈值的物品加入购物清单**，以便自动补货
20. 作为家庭用户，我想**完成定期家务后，系统按周期自动重置到期时间**（如每周拖地→完成后下周到期）
21. 作为家庭用户，我想**按节日模板快速创建备货清单**（春节/中秋/端午），系统预填常见物资
22. 作为家庭用户，我想**查看清单的完成进度**（已完成/N 项），以便掌握整体进展
23. 作为家庭用户，我想**在清单评论区讨论**（"酱油买生抽还是老抽？"），以便家庭成员沟通

### 3.4 食谱与餐饮计划 (⭐ P1)

24. 作为家庭用户，我想**添加和管理食谱**（名称/食材清单/步骤/图片），以便日常参考
25. 作为家庭用户，我想**系统根据库存食材推荐可做的食谱**，以便减少浪费
26. 作为家庭用户，我想**制定每周餐饮计划**，以便提前准备食材
27. 作为家庭用户，我想**系统根据餐饮计划自动生成购物清单**，以便一站式采购
28. 作为家庭用户，我想**导入/导出食谱**（兼容 Grocy 食谱格式），以便数据迁移

### 3.5 通知与提醒 (⭐ P1)

29. 作为家庭用户，我想**收到物品即将过期的推送通知**（提前 N 天可配置），以便及时使用
30. 作为家庭用户，我想**为清单条目设置截止日期和提醒**，以便及时完成任务
31. 作为家庭用户，我想**选择通知渠道**（App 内/邮件/微信推送），以便不错过重要提醒

### 3.6 物品追踪 (⭐ P1 — HomeBox 核心能力)

32. 作为家庭用户，我想**记录物品的购买价格和购买日期**，以便追踪家庭开支
33. 作为家庭用户，我想**为物品关联附件**（保修卡/说明书/发票），以便集中管理
34. 作为家庭用户，我想**查看物品的使用寿命和保修到期时间**，以便及时处理
35. 作为家庭用户，我想**为物品打标签**（如"电器""药品""调料"），以便灵活分类

### 3.7 NFC/RFID — 数据读取录入 (⭐ P1 — 新增)

36. 作为家庭用户，我想**在位置/容器上贴 NFC 标签**（如冰箱门、药箱、衣柜），一碰手机即可查看该位置的库存清单
37. 作为家庭用户，我想**在物品上贴 NFC 标签**（如电饭煲、工具箱），一碰手机即可查看物品详情、保修期和附件
38. 作为家庭用户，我想**通过 NFC 快速完成入库**——碰标签 → 选"添加物品" → 手填或条码扫描 → 自动关联位置
39. 作为家庭用户，我想**通过 NFC 快速完成出库/消耗**——碰标签 → 选"消耗物品" → 输入数量 → 库存自动更新
40. 作为家庭用户，我想**通过 NFC 快速完成移动位置**——碰旧位置 NFC（标记来源）→ 碰新位置 NFC（确认目标）→ 自动更新位置
41. 作为家庭用户，我想**通过 NFC 批量盘点**——在某个区域（如客厅）依次碰所有带标签的物品，一次性生成盘点报告
42. 作为家庭用户,我想**手机靠近 RFID 区域读卡器时自动识别所处位置**，以便在 App 中定位和浏览附近物品
43. 作为家庭用户，我想**通过 RFID 批量扫描柜子/抽屉内部标签**，一次性更新该区域所有的库存状态

### 3.8 NFC/RFID — 自动化触发 (⭐ P1 — 新增)

44. 作为家庭用户，我想**碰入户门 NFC 触发"到家模式"**——自动检查今日临期物品 + 快递已入库 + 推荐今晚菜谱
45. 作为家庭用户，我想**碰冰箱 NFC 触发"备餐模式"**——显示餐饮计划 + 所需食材库存 + 自动生成补货清单
46. 作为家庭用户，我想**碰药箱 NFC 触发"用药提醒"**——显示当前服药计划 + 临期药品清单 + 过期药品一键清理
47. 作为家庭用户，我想**碰急救箱 NFC 触发"急救模式"**——自动显示急救指南 + 药品位置 + 可一键拨打 120
48. 作为家庭用户，我想**碰购物清单 NFC 贴纸触发"采购模式"**——显示采购清单 + 路线建议 + 附近超市促销
49. 作为家庭用户，我想**碰衣柜 NFC 触发"换季模式"**——自动盘点当季衣物 + 建议需要清洗/收纳/捐赠的衣物
50. 作为家庭用户，我想**碰行李箱 NFC 触发"出行模式"**——自动生成出行物品清单（洗漱包/证件/药品），打勾即装箱
51. 作为家庭用户，我想**设置 NFC 自定义快捷操作**（如"碰厨房秤→打开烹饪计时器"），以便个性化使用
52. 作为系统管理员，我想**在后台配置 NFC 标签的触发动作**（URL 跳转/通知触发/MCP 调用），以便灵活扩展

### 3.9 用户与认证 (⭐ P0)

53. 作为家庭用户，我想**注册和登录账户**，以便使用所有功能
54. 作为家庭用户，我想**创建家庭空间并邀请其他成员**，以便全家共用库存
55. 作为家庭成员，我想**设置角色权限**（管理员/编辑者/只读者），以便控制访问范围
56. 作为开发者/高级用户，我想**生成 API Token** 以便通过 MCP/REST API 外部调用
57. 作为系统管理员，我想**管理 API Token 的权限范围**（如只读/指定模块），以便安全控制

### 3.10 MCP / AI Agent (⭐ P0)

58. 作为 AI Agent 用户，我想**通过自然语言查询库存**（"今天冰箱里有什么快过期的？"），以便快速获取信息
59. 作为 AI Agent 用户，我想**通过自然语言操作库存**（"帮我入库5斤苹果放在厨房"），以便语音操作
60. 作为 AI Agent 用户，我想**AI 自动生成购物清单**（"根据本周食谱帮我列采购清单"），以便节省时间
61. 作为 AI Agent 用户，我想**AI 根据库存推荐食谱**（"冰箱里有什么菜，推荐今晚做什么？"），以便利用现有食材
62. 作为 AI Agent 用户，我想**AI 配合 NFC 事件自动执行流程**（如碰冰箱 NFC → AI 自动检查过期食品并生成报告），以便无感操作
63. 作为 AI Agent 用户，我想**通过 MCP 协议对接任意大模型**（Claude/GPT/DeepSeek/通义千问），以便选择自己偏好的 AI

### 3.11 国内本土化 (⭐ P0)

64. 作为国内用户，我想使用**国内常见计量单位**（斤/两/个/包/瓶），以便符合日常习惯
65. 作为国内用户，我想系统**支持 EAN-13 / 69 码 / ISBN 等国内通用条形码格式**，以便扫码入库
66. 作为国内用户，我想**界面语言为简体中文**，以便理解
67. 作为国内用户，我想**日期格式默认为 YYYY-MM-DD**，以便符合国内习惯

### 3.12 AI 视觉与语音 (⭐ P1 — 新增)

68. 作为家庭用户，我想**拍照识别冰箱内部物品**（拍一张冰箱照片，AI 自动识别并批量入库），以便省去手动录入
69. 作为家庭用户，我想**通过语音快速记录入库**（"记一下，刚买了2斤排骨放冷冻室"），以便说话即入库
70. 作为家庭用户，我想**月底收到"浪费分析报告"**（过期损失金额、最常浪费的品类、改进建议），以便减少浪费

---

## 四、Implementation Decisions

### 4.1 模块划分

```
server/src/modules/
├── auth/              # 认证模块（注册/登录/JWT/API Token/OAuth）
├── users/             # 用户管理（个人资料/密码/偏好设置）
├── families/          # 家庭空间（创建/邀请成员/角色管理）
├── stock/             # 库存核心（物品 CRUD/批次/数量/消耗）
├── locations/         # 位置管理（房间→柜子→层格三级）
├── lists/             # 统一清单系统（购物/待办/家务/节日备货/餐饮计划生成的采购清单）
│   ├── list.service           # 清单 CRUD
│   ├── list-item.service      # 列表项 CRUD（共用一张 list_items 表）
│   ├── assignment.service     # 指派成员 + 进度追踪
│   └── behavior.service       # 类型特定行为（autoPurchase/autoReset/autoGenerate）
├── recipes/           # 食谱管理（食材/步骤/导入导出）
├── meal-plans/        # 餐饮计划（周计划/自动生成清单）
├── documents/         # 文档附件（保修卡/说明书/发票）
├── notifications/     # 通知推送（过期预警/任务提醒/多渠道）
├── barcode/           # 条码服务（扫码识别/条码库对接）
├── tags/              # 标签系统（自定义标签/分类）
├── history/           # 操作日志（物品变更记录/审计）
├── dashboard/         # 数据看板（统计/趋势/浪费分析）
├── admin/             # 管理后台（系统配置/用户管理）
├── plugins/           # 插件系统（含内置 MCP Server 插件）（详见 HomeHub-Plugin-Arch.md）
│   ├── registry.service      # Plugin Registry（发现/注册/生命周期）
│   ├── context.service       # PluginContext 工厂
│   ├── event-bus.service     # 插件间事件总线
│   ├── sandbox.service       # 插件安全沙箱
│   └── store.service         # 插件市场接口（Phase 2）
│
├── scanner/           # 统一 Scanner 抽象层（NFC/QR/条码/RFID 统一输入接口）
│   ├── scanner.service       # Scanner 抽象 + 路由
│   ├── nfc-scanner.service   # Web NFC 实现
│   ├── qr-scanner.service    # QR/条码扫码实现
│   └── rfid-scanner.service  # RFID 区域感知实现
├── trigger/            # 触发→动作引擎（上下文感知 Resolver + Action Pipeline）
│   ├── resolver.service      # 上下文融合 + 意图推断
│   ├── pipeline.service      # 标准化动作执行链
│   ├── binding.service       # 触发码→目标绑定数据字典
│   └── automation.service    # 自定义自动化规则
├── encoder/            # 编码与输出层（QR/NFC/条码生成）
│   ├── qr-generator.service   # QR 码生成
│   ├── nfc-encoder.service    # NFC NDEF 编码
│   ├── barcode-generator.service # 条码生成（Code128/39）
│   └── label-engine.service   # 标签排版引擎
├── hardware/           # 硬件抽象层 HAL（输出设备管理）
│   ├── hal.service            # 统一输出设备接口
│   ├── thermal-printer.service   # 热敏小票机（USB/蓝牙）
│   ├── label-printer.service     # 标签打印机（Brother/Dymo）
│   ├── nfc-writer.service        # NFC 写入器
│   └── pdf-export.service        # PDF 导出（零硬件方案）
├── iot_tags/          # 物联标签管理（NFC/QR/条码/RFID 标签绑定与查询）
│   └── iot-tags.service      # 标签绑定 CRUD + 扫描日志查询
├── documents/         # 文档附件管理（保修卡/说明书/发票）
│   └── documents.service     # 文件上传/下载/关联物品
├── history/           # 操作日志/审计追踪
│   └── history.service       # 聚合查询 stock_transactions + scan_logs
└── admin/             # 管理后台
    └── admin.service         # 系统配置/用户管理/家庭审计
│
│   ※ voice（语音录入）和 vision（拍照识别）不由后端模块实现，
│   而是由 AI Agent 处理（ASR/图像识别），处理完成后通过 MCP 工具
│   调用 HomeHub CRUD API 写入结构化数据，source 字段标记为 'voice'/'vision'。
```

### 4.2 数据库 Schema 核心设计 (Drizzle ORM)

```typescript
// === 核心实体 ===

// 用户
users: { id, email, name, passwordHash, avatar, createdAt }

// 家庭空间
families: { id, name, inviteCode, createdAt }

// 家庭成员关联
family_members: { id, userId, familyId, role: 'admin'|'editor'|'viewer', joinedAt }

// API Token（MCP 认证用）
api_tokens: { id, userId, familyId, name, token(哈希), permissions:json, expiresAt, lastUsedAt, createdAt }

// === 物理触发相关（新增） ===

// 统一触发绑定字典（NFC/QR/条码/RFID 共用 — 唯一绑定表）
trigger_bindings: { id, familyId, code, codeType: 'nfc'|'qr'|'barcode'|'rfid',
                    targetType: 'item'|'location'|'recipe'|'action',
                    targetId, actionOverride, 
                    label,             // 人可读标签（"冰箱 NFC"、"酱油标签"）
                    lastReadAt, readCount, createdAt }

// NFC 标签写入状态（仅跟踪物理标签的写入/读取状态，不存绑定关系）
nfc_tag_state: { id, familyId, tagUid, 
                 ndefWritten:bool, ndefWrittenAt,
                 lastReadAt, readCount, createdAt }

// RFID 读卡器
rfid_readers: { id, familyId, name, locationId, readerType: 'hf'|'uhf', 
                deviceId, config:json, lastOnlineAt, createdAt }

// RFID 区域映射
rfid_zones: { id, readerId, tagPattern, locationId, notes }

// 自动化触发规则
automation_triggers: { id, familyId, name, triggerType: 'nfc_tap'|'qr_scan'|'barcode_scan'|'rfid_enter'|'rfid_exit'|'scheduled'|'custom',
                       triggerConfig:json, actionType: 'open_page'|'run_notification'|'call_mcp_tool'|'run_workflow',
                       actionConfig:json, enabled, sortOrder, createdAt }

// === 库存相关 ===

// 物品（通用模型 — 所有类型通过 type + customFields 统一管理，详细字段定义见 4.6 节）
items: { id, familyId, name, type, barcode, categoryId, locationId, 
          quantity, unit, minStock, 
          brand, notes, image, 
          customFields:json,                // 类型特定字段（如 warrantyEnd, sn, cycleCount）
          currentState,                     // 状态机当前状态（charged/depleted/full/empty/valid/expired）
          stateChangedAt,                   // 状态变更时间
          cycleCount,                       // 循环次数（充电电池等）
          purchasePrice, purchaseDate, 
          expiryDate, 
          createdAt, updatedAt }

// 物品批次（支持同一种物品多批次）
item_batches: { id, itemId, batchNumber, quantity, unit, 
                purchaseDate, expiryDate, locationId, createdAt }

// 物品变动记录
// 注：source 中的 'voice'/'vision' 由 AI Agent 处理语音/图像后通过 MCP 写入时标记
stock_transactions: { id, itemId, batchId, type:'add'|'consume'|'transfer'|'adjust', 
                      quantity, unit, fromLocationId, toLocationId, 
                      userId, note, source:'manual'|'barcode'|'nfc'|'rfid'|'voice'|'vision'|'mcp',
                      createdAt }

// 位置（三级）
locations: { id, familyId, name, parentId, level:1|2|3, image, notes, sortOrder }

// 类别
categories: { id, familyId, name, icon, parentId, sortOrder }

// 标签
tags: { id, familyId, name, color }
item_tags: { itemId, tagId }

// === 统一清单系统（购物/待办/家务/节日备货 共用同一模型） ===

// 清单
lists: { id, familyId, name, 
         type: 'shopping'|'todo'|'chore'|'holiday'|'meal_plan',
         config: json,           // { autoReset, autoResetDays, template, autoPurchase }
         createdBy, createdAt, updatedAt }

// 清单条目（所有类型共用）
list_items: { id, listId, content, note,
              status: 'pending'|'completed'|'cancelled',
              completedBy, completedAt,
              assigneeId,              // 指派给谁
              quantity, unit,
              linkedItemId,            // 关联库存物品
              linkedRecipeId,          // 关联食谱
              dueAt,                   // 截止日期
              lastResetAt,             // 上次重置（chore 用）
              sortOrder, createdAt }

// 清单条目评论
list_item_comments: { id, listItemId, userId, content, createdAt }

// 节日模板（预设物资列表）
holiday_templates: { id, name, type: 'spring_festival'|'mid_autumn'|'dragon_boat'|'custom',
                     items: json,           // [{ name, quantity, unit, note }]
                     isPreset, createdAt }

// === 食谱相关 ===

// 食谱
recipes: { id, familyId, name, description, ingredients:json, steps:json, 
           prepTime, cookTime, servings, image, source, createdAt }

// 餐饮计划
meal_plans: { id, familyId, weekStart, weekEnd, createdBy }
meal_plan_items: { id, planId, dayOfWeek, mealType:'breakfast'|'lunch'|'dinner'|'snack', 
                   recipeId, note }

// 通知配置
notification_rules: { id, familyId, name, 
                       triggerType:'expiry'|'low_stock'|'chore_due'|'custom', 
                       config:json, channel:'in_app'|'email'|'webhook',
                       enabled, createdAt }
// 注: 微信推送不在 MVP 范围，见下方说明
```

**微信推送策略（Phase 2）：**

微信推送需要公众号模板消息或企业微信 API，实现复杂度较高，MVP 不纳入。替代方案：

| 阶段 | 方案 | 复杂度 |
|------|------|--------|
| MVP | App 内推送 + 邮件 + Webhook | 低 |
| Phase 2 | 企业微信群机器人 Webhook | 中（用户自行配置 Webhook URL） |
| Phase 3 | 微信服务号模板消息 | 高（需认证服务号 + 用户关注） |

> MVP 的 Webhook 渠道可间接实现微信通知：用户配置"Server酱"或"WxPusher"等第三方推送服务的 Webhook URL，HomeHub 发 Webhook → 第三方转发到微信。零开发成本。

### 4.3 统一物理触发层设计 (Unified Trigger Layer)

> **设计原则：** NFC、QR 码、条形码、RFID 都是物理世界的触发入口，不应各建一套逻辑。统一抽象为 **Scanner → Resolver → Pipeline** 三层架构，新增触发方式只需写一个新的 Scanner 适配器。

#### 4.3.1 三层架构概览

```
┌──────────────────────────────────────────────────────┐
│                    业务领域层                          │
│  库存 · 位置 · 清单 · 食谱 · 统计 · 设备(通用物品)   │
├──────────────────────────────────────────────────────┤
│                 ⚙️ 触发→动作引擎                       │
│              (Trigger → Resolution → Action)          │
├──────────────────────┬───────────────────────────────┤
│   📟 统一 Scanner    │   🔍 上下文融合                 │
│                      │                               │
│  ┌────┬────┬────┬──┐│  物品ID + 位置ID + 用户ID      │
│  │NFC │ QR │BR  │RF││  + 当前页面上下文              │
│  │    │ 码 │码  │ID││  + 时间/频率/状态               │
│  └─┬──┴─┬──┴──┬─┴─┤│                               │
│    │    │     │   ││  → 智能推断用户意图              │
│    └────┴─────┴───┘│                               │
│      统一 ScanResult │                               │
│  { type, data, time }│                               │
├──────────────────────┴───────────────────────────────┤
│                 编码输出层（反向路径）                   │
│    QR 生成 · NFC NDEF 编码 · 条码生成 · 标签排版       │
├──────────────────────────────────────────────────────┤
│             硬件抽象层 HAL（输出设备）                  │
│   热敏打印机 · 标签打印机 · NFC 写卡器 · PDF 导出      │
└──────────────────────────────────────────────────────┘
```

#### 4.3.2 统一 Scanner 接口

所有物理触发生成同一个结果类型：

```typescript
interface ScanResult {
  // 'voice'/'photo' 类型由 AI Agent 产生（非后端 Scanner 模块），Agent 处理后通过 MCP 写入
  type: 'nfc' | 'qr' | 'barcode' | 'rfid' | 'manual' | 'voice' | 'photo'
  raw: string               // 原始扫描数据
  timestamp: number
  metadata?: {
    nfc?: { tagType: string; ndefUri?: string }
    barcode?: { format: 'ean13' | 'ean8' | 'code128' | 'upc' | 'datamatrix' }
    qr?: { content: string }
    rfid?: { antennaId: string; signalStrength: number }
  }
}

interface Scanner {
  type: string
  scan(): Promise<ScanResult>          // 主动扫描
  listen(callback: ScanCallback): void  // 持续监听（RFID/后台NFC）
  isAvailable(): boolean               // 当前设备是否支持
}
```

#### 4.3.3 Trigger Resolver（上下文感知 — 核心智能层）

不绑定"扫到A就做B"，而是根据上下文动态推断意图：

```typescript
class TriggerResolver {
  async resolve(scan: ScanResult, context: ResolveContext): Promise<ResolvedAction> {
    // 1. 查数据字典 → 找到绑定目标
    const binding = await this.lookupBinding(scan)
    if (!binding) return this.handleUnknownCode(scan)
    
    // 2. 融合上下文
    const state = {
      currentPage: context.pagePath,            // 用户当前在哪个页面
      currentLocation: context.locationId,      // 用户物理位置
      recentActions: context.recentActions,      // 最近操作序列
      userRole: context.role,                   // 家庭成员角色
      timeOfDay: getTimeSlot(),                 // 早/中/晚
    }
    
    // 3. 匹配动作
    return this.matchAction(binding, state)
  }
  
  private matchAction(binding: TriggerBinding, state: ScanContext): ResolvedAction {
    // 规则表：同一二维码在不同页面的行为不同
    if (binding.targetType === 'location') return this.handleLocationTap(binding, state)
    if (binding.targetType === 'item') return this.handleItemTap(binding, state)
    if (binding.targetType === 'recipe') return { primary: 'showDetail', params: { entityId: binding.targetId } }
    // ...
  }
}
```

**上下文决定动作的示例：**

| 扫描对象 | 当前页面 | 推断意图 | 触发动作 |
|---------|---------|---------|---------|
| NFC 物品标签 | 库存总览 | 查看详情 | → 打开物品详情页 |
| NFC 物品标签 | 购物清单 | 已购买，入库 | → 直接入库 |
| NFC 位置标签 | 任意页面 | 查看该位置 | → 跳转位置库存 |
| 冰箱上的 QR 码 | — | 查看冰箱库存 | → 打开「冰箱」位置 |
| 条形码(食品) | 库存页 | 添加物品 | → 从数据库预填信息后入库 |
| 条形码(食品) | 厨房用着用着 | 消耗 | → 数量减1 |
| RFID 标签（冰箱关门） | — | 自动盘点 | → 触发后台对比+提醒 |

#### 4.3.4 Action Pipeline（标准化动作执行链）

```typescript
interface ResolvedAction {
  primary: 'navigate' | 'quickAdd' | 'quickConsume' | 'move' 
         | 'showDetail' | 'batchScan' | 'autoStocktake' | 'triggerAlert'
  params: {
    entityId?: string
    locationId?: string
    quantity?: number
    page?: string
  }
  hints?: ActionHint[]  // 界面的"下一步建议"
}

// Pipeline 负责任务链编排 — 扫描过期食品 → 标记消耗 + 加入购物清单 + 弹窗提示
class ActionPipeline {
  async execute(action: ResolvedAction): Promise<void> {
    // 1. 主动作
    // 2. 关联动作链
    // 3. 日志记录
    // 4. 界面反馈
  }
}
```

#### 4.3.5 数据字典（TriggerBinding 注册表）

触发码的统一数据库，所有触发方式指向同一张表：

```typescript
interface TriggerBinding {
  id: string
  code: string              // 原始编码（NFC UID / QR 值 / 条码号）
  codeType: 'nfc' | 'qr' | 'barcode' | 'rfid'
  
  // 绑定目标 — 多态关联
  targetType: 'item' | 'location' | 'recipe' | 'action'
  targetId: string
  
  // 可选：覆盖默认推断的固定动作（少用，仅特例场景）
  actionOverride?: string
  
  label?: string             // 人可读标签（"冰箱 NFC"、"酱油标签"）
  lastReadAt?: number        // 最后读取时间
  readCount: number          // 读取次数统计
  
  familyId: string       // 家庭隔离
  createdAt: number
}

// 一个物品可以同时绑定 NFC + QR 码 + 条形码，扫哪个都能定位到它
// 设备类物品通过 type='electronic_device' 走通用物品模型，无需单独 targetType
```

RFID 区域感知方案：

```
硬件: HF RFID 读卡器模块 (RC522/PN532) + 树莓派/ESP32
协议: MQTT → NestJS WebSocket → 前端
架构:
  ┌──────────┐    MQTT    ┌──────────┐   WebSocket   ┌─────────┐
  │ RFID Read│──────────→│ MQTT Broker│────────────→│ NestJS  │
  │ (ESP32)  │           │ (Mosquitto)│              │ Backend │
  └──────────┘           └──────────┘              └─────────┘
  
场景:
  - 进入区域 → 自动切换 App 到该位置视图
  - 移出区域 → 记录物品移出时间
  - 定时扫描 → 生成区域盘点报告
```

#### 4.3.6 iOS NFC 策略与写入方案

iOS Safari 不支持 Web NFC API，无法在 PWA 内程序化读写 NFC 标签。但 iOS 系统原生支持 NDEF 标签读取，因此分两条路径处理：

**读取（iOS 可用）：** 碰触标签 → iOS 系统读取 NDEF URI → 打开 Safari → HomeHub URL 路由到 PWA → 自动执行绑定动作

**写入（iOS 不可用，需替代方案）：**

| 方案 | 可行性 | MVP | 说明 |
|------|--------|:---:|------|
| 借用 Android 设备写入 | ✅ 最简单 | ✅ | iOS 用户借用家人/朋友的 Android 手机写入标签，一次写入永久使用 |
| 桌面端 + USB NFC 写卡器 | ✅ | | PC/Mac + ACR122U (¥30-100) + Web Serial API |
| NFC 写入助手网页（Android 专用） | ✅ | ✅ | 提供一个专用的 `homehub.app/write` 页面，Android 用户打开后可连续写入多张标签 |
| iOS 原生 App（Phase 3+） | ⚠️ 复杂 | | CoreNFC 框架可读写，但需开发原生 App，违背"PWA 优先"策略 |

> **MVP 策略：** iOS 用户读取 NFC 完全可用（系统级能力），写入通过"借用 Android 设备"或"桌面端 USB 写卡器"解决。在 NFC 写入页面显示"需要 Android 设备或 USB 写卡器"提示。

#### 4.3.7 NFC 标签首次绑定流程

新用户从拆封 NFC 标签到完成绑定的完整操作链：

```
1. 用户在 HomeHub 中创建/选择目标（物品/位置/自动化动作）
2. 点击"绑定 NFC 标签"按钮
3. 系统生成 NDEF 数据（Text + URI + JSON）
4. 提示"请将手机靠近 NFC 标签"
   ├─ Android: PWA 通过 Web NFC API 写入 → 写入成功 → 自动创建 trigger_binding
   └─ iOS: 显示"请在 Android 设备上打开 homehub.app/write，或使用 USB 写卡器"
5. 绑定成功后 → 弹出测试提示"碰一下标签验证绑定"
6. 用户碰标签 → 验证成功 → 显示"✅ 绑定完成"
7. 如果绑定失败 → 提示重试或换标签
```

**批量绑定模式（10+ 标签场景）：**

```
1. 进入"批量绑定"模式
2. 选择位置组（如"厨房的所有柜子"）
3. 系统按位置顺序生成标签队列
4. Android: 连续碰标签 → 自动写入 + 创建 binding → 下一个
5. 进度条显示"3/10 已绑定"
6. 完成后 → 生成绑定清单 PDF（标签编号 + 位置 + 物品）
```

#### 4.3.8 nfc_tag_state 与 trigger_bindings 的关联

`nfc_tag_state` 和 `trigger_bindings` 是**松耦合关联**——通过 `nfc_tag_state.tagUid` = `trigger_bindings.code`（当 `codeType='nfc'` 时）隐式关联，不使用外键。

- `nfc_tag_state`：记录标签的**物理状态**（是否已写入 NDEF、最后读取时间、读取次数），由硬件/Scanner 层维护
- `trigger_bindings`：记录标签的**业务绑定**（这个码绑定了什么物品/位置/动作），由业务层维护

两表分离的理由：一个标签可能先物理写入 NDEF（`nfc_tag_state` 有记录），但尚未绑定业务目标（`trigger_bindings` 无记录）；或者绑定被解绑后，物理状态仍然保留。

### 4.4 编码输出层 (Encoder Layer)

#### 编码格式设计

采用**双编码策略**：结构化离线编码 + URL 在线回退，兼顾离线可用性和 iOS 兼容性。

```
QR / 条码编码（紧凑，纯离线解析）:
  格式: HH:[版本]:[类型]:[ID]
  示例: HH:01:ITEM:a1b2c3d4
        HH:01:LOC:kf-kitchen
        HH:01:RECIPE:liangban-huanggua
        HH:01:ACTION:stocktake/fridge    ← 盘点冰箱

NFC NDEF 编码（504 字节，多 Record 组合 — 离线+在线双通道）:
  NDEF Record 1 (Text, zh): "酱油"              ← 离线可读（任何手机碰标签即可看到名称）
  NDEF Record 2 (Text, en): "Soy Sauce"
  NDEF Record 3 (URI):                           ← 在线回退 + iOS 兼容
    https://homehub.app/nfc/{familyCode}/{tagUid}
  NDEF Record 4 (JSON/Custom MIME, 可选):         ← 结构化数据（Android Web NFC 读取）
    { v: 1, id: "a1b2c3d4", type: "item", 
      location: "kf-shelf-3", expire: "20261201" }
```

**双编码决策依据：**

| 场景 | 使用格式 | 原因 |
|------|---------|------|
| QR 码打印 | HH:01:TYPE:ID | 紧凑、离线可解析、PWA 可直接处理 |
| 条码标签 | HH:01:TYPE:ID | 条码容量有限，URL 太长 |
| NFC 标签写入 | NDEF URI + Text + JSON | iOS 通过 URI 跳转触发；Android 通过 Web NFC 读 JSON |
| NFC 标签碰触（离线） | NDEF Text Record | 无网络时仍可显示物品/位置名称 |

> **iOS NFC 交互路径：** 碰触标签 → iOS 系统读取 NDEF URI → 打开 Safari → HomeHub URL 路由到 PWA → 自动执行绑定动作（查看物品/打开位置/触发自动化）。此路径不需要 Web NFC API，利用的是 iOS 原生 NDEF 读取能力。
>
> **Android NFC 交互路径：** 碰触标签 → HomeHub PWA 通过 Web NFC API 读取 NDEF JSON → 本地解析 → 执行动作。更丰富、更快速、可离线。

#### 生成触发时机

| 时机 | 生成什么 | 触发方式 |
|------|---------|---------|
| 物品创建时 | QR + NFC 准备 | 自动生成编码，等待用户选择打印/写入 |
| 创建位置时 | 位置 QR | 自动生成，批量打印场景（贴柜门/抽屉） |
| 批量打印 | 导出 PDF 页（一页 N 个 QR） | 打印预览 → 普通打印机 |
| 按需生成 | 单张 QR/标签 | 物品详情页 → 打印/导出 |
| 批量配置 NFC | 批量写入标签 | 连接 NFC 写卡器 → 自动填入递增位置 |

### 4.5 硬件抽象层 (HAL)

不直接耦合打印机驱动，定义统一输出设备接口：

```typescript
interface OutputDevice {
  id: string
  name: string
  type: 'thermal_printer' | 'label_printer' | 'nfc_writer' | 'generic_printer'
  connection: 'usb' | 'bluetooth' | 'network' | 'webusb' | 'serial' | 'file_export'
  status: 'online' | 'offline' | 'busy'
  
  print(job: PrintJob): Promise<PrintResult>
}

interface PrintJob {
  format: 'qr_label' | 'nfc_sticker' | 'item_detail' | 'barcode_label' | 'stocktake_sheet'
  content: {
    type: 'item' | 'location' | 'multi'
    ids: string[]
    labelSize?: '25x15' | '40x30' | '58x40'  // mm
    copies?: number
    includeName?: boolean
  }
}
```

**支持的设备策略（按成本递进）：**

| 设备 | 成本 | 适用场景 | 接入方式 | MVP |
|------|------|---------|---------|:---:|
| 普通打印机 | 已有 | A4 二维码页 → 剪刀裁 | 浏览器打印 | ✅ |
| 58mm 热敏小票机 | ¥80-150 | 物品小标签、购物清单 | WebSerial/WebBluetooth | |
| 标签打印机(Brother/Dymo) | ¥200-600 | 专业自粘标签 | 厂家 SDK / 通用驱动 | |
| NFC 写卡器(ACR122U) | ¥30-100 | 批量写入 NFC 标签 | WebUSB / 后台服务 | |
| 手机 NFC 写入 | ¥0 | 单张写入 | Web NFC + App Shell | |
| 热转印标签机 | ¥500+ | 大批量、耐久需求 | 网络 API | |

> **MVP 策略：零硬件起步。** 只生成 QR PDF → 用户用普通打印机打印裁切。所有硬件接口预留，Phase 2 再启用。

### 4.6 通用物品模型设计

> **设计原则：** 不因特殊类型物品而单独建模块。电池、煤气罐、灭火器、电子设备都通过 **通用物品 + 可选状态机 + 类型配置** 统一管理。

```typescript
// 物品类别配置 — 决定每种类型需要什么字段和状态机
const itemTypeConfigs = {
  food: {
    name: '食品',
    icon: 'nutrition',
    fields: ['bestBefore', 'batchNo'],
    hasStateMachine: false,
    features: ['expiry_warning', 'auto_stocktake']
  },
  grocery: {
    name: '日用品',
    icon: 'basket',
    fields: [],
    hasStateMachine: false,
    features: ['low_stock_alert']
  },
  rechargeable_battery: {
    name: '充电电池',
    icon: 'battery-charging',
    fields: ['cycleCount', 'capacity'],
    hasStateMachine: true,
    states: ['charged', 'depleted'],
    transitions: [
      { from: 'charged', action: 'use', to: 'depleted' },
      { from: 'depleted', action: 'charge', to: 'charged', incrementCycle: true }
    ],
    features: ['cycle_count_tracking']
  },
  gas_tank: {
    name: '煤气罐',
    icon: 'flame',
    fields: ['capacity'],
    hasStateMachine: true,
    states: ['full', 'partial', 'empty'],
    transitions: [
      { from: 'full', action: 'use', to: 'partial' },
      { from: 'partial', action: 'use', to: 'empty' },
      { from: 'empty', action: 'refill', to: 'full' }
    ]
  },
  electronic_device: {
    name: '电子设备',
    icon: 'tv',
    fields: ['brand', 'model', 'sn', 'warrantyEnd', 'purchasePrice', 'purchaseDate'],
    hasStateMachine: false,
    features: ['warranty_tracking', 'repair_history', 'document_attach']
  },
  fire_extinguisher: {
    name: '灭火器',
    icon: 'flask',
    fields: ['expiryDate', 'lastInspection'],
    hasStateMachine: true,
    states: ['valid', 'expired', 'used'],
    transitions: [
      { from: 'valid', action: 'expire', to: 'expired' },
      { from: 'valid', action: 'discharge', to: 'used' }
    ]
  }
  // 新增类型 → 加一行配置，不改表结构
}

// 物品表 — 核心字段 + 通用扩展
interface Item {
  id: string
  familyId: string
  name: string
  type: string                          // 引用 itemTypeConfigs 的 key
  categoryId: string
  locationId: string
  
  // 数量相关
  quantity: number
  unit: string
  minStock: number
  
  // 通用字段
  barcode: string | null
  brand: string | null
  notes: string | null
  image: string | null
  
  // 类型特定字段（JSON 存储）
  customFields: Record<string, any> | null
  
  // 可选状态机
  currentState?: string                // 当前状态
  stateChangedAt?: number              // 状态变更时间
  cycleCount?: number                  // 循环次数（电池等）
  
  // 时间戳
  expiryDate?: number
  purchaseDate?: number
  purchasePrice?: number
  createdAt: number
  updatedAt: number
}
```

**这样设计的收益：**

- 电池 → 直接当物品管，通过 `type: 'rechargeable_battery'` + 状态机实现「有电/没电」切换和循环计数
- 电子设备 → 通过 `type: 'electronic_device'` + customFields 存储 SN/保修/品牌
- 煤气罐 → 通过状态机实现「满/空/用了一半」的流转
- 灭火器 → 通过状态机实现「有效/过期/已使用」
- 所有特殊逻辑在业务 Service 层处理，数据库只用一张 `items` 表

> **与 Grocy 的对比：** Grocy 把电池、家务、任务各建一套表，因为它的物品模型太弱无法表达状态转换。HomeHub 用通用模型 + 类型配置表，一张表管所有。

### 4.7 MCP 接口设计（插件化）

MCP Server 以**内置 Plugin** 形式运行（遵循 HomeHub 插件生命周期）。它不直接暴露业务逻辑，而是将 REST API 映射为 MCP Tools，同时收集所有注册到 `mcp-tool` 扩展点的第三方插件工具。

```
┌──────────────────────────────────────────┐
│  Plugin Registry                         │
│  ┌──────────────────────────────────┐    │
│  │  MCP Server Plugin (built-in)    │    │
│  │  扫描 mcp-tool 扩展点 → 注册工具   │    │
│  │  调用 REST API / Service 执行     │    │
│  └──────────────────────────────────┘    │
│  ┌──────────────────────────────────┐    │
│  │  语音搜食谱插件 (第三方)           │    │
│  │  → 注册 mcp-tool: photo_search   │    │
│  └──────────────────────────────────┘    │
│  ┌──────────────────────────────────┐    │
│  │  打印机插件 (第三方)              │    │
│  │  → 注册 mcp-tool: print_label    │    │
│  └──────────────────────────────────┘    │
└──────────────────────────────────────────┘
```

> **设计原则：** MCP 插件只暴露**纯净的领域操作**。语音/图片等多模态输入由 AI Agent 自行处理（ASR、图像识别），处理完成后调用 HomeHub 的 CRUD 工具写入结构化数据。第三方插件通过 `mcp-tool` 扩展点注册自定义工具，无需了解 MCP 协议内部实现。

#### 库存操作

| 工具名称 | 描述 | 主要参数 | 场景示例 |
|---------|------|---------|--------|
| `search_items` | 搜索库存物品 | query, category, location, expiring_in_days, type, limit | "冰箱里有什么快过期了？" |
| `add_item` | 添加物品到库存 | name, quantity, unit, location_id, expiry_date, type, barcode | "刚买了5斤排骨放冷冻室" |
| `consume_item` | 消耗/使用物品 | item_id, quantity, note | "用掉了一瓶酱油" |
| `move_item` | 移动物品位置 | item_id, to_location_id | "把牛奶从冰箱拿到餐桌" |
| `update_item` | 更新物品信息 | item_id, 可选字段 | "修改面包保质期到明天" |
| `delete_item` | 删除物品 | item_id | 清理已彻底用完的物品 |

#### 清单操作

| 工具名称 | 描述 | 主要参数 | 场景示例 |
|---------|------|---------|--------|
| `get_lists` | 查看所有清单 | type (可选) | "看看购物清单" |
| `create_list` | 创建清单 | name, type | "建一个年夜饭备货清单" |
| `add_to_list` | 添加到清单 | list_id, content, quantity, assignee_id | "把牛奶加进购物清单" |
| `check_list_item` | 打勾完成 | item_id | "牛奶买到了" |
| `uncheck_list_item` | 取消完成 | item_id | |
| `assign_list_item` | 指派成员 | item_id, assignee_id | "让老公去买酱油" |
| `get_my_tasks` | 查看我被指派的任务 | 无 | "我今天要做什么？" |

#### 食谱与推荐

| 工具名称 | 描述 | 主要参数 | 场景示例 |
|---------|------|---------|--------|
| `get_recipe_recommendations` | 根据库存推荐食谱 | recipe_count | "冰箱里有什么菜能做什么？" |
| `search_recipes` | 搜索食谱 | query | "怎么做红烧肉？" |
| `get_meal_plan` | 查看当前餐饮计划 | week | "这周吃什么？" |

#### 分析与统计

| 工具名称 | 描述 | 主要参数 | 场景示例 |
|---------|------|---------|--------|
| `get_stock_summary` | 库存概况 | 无 | "家里还有多少吃的？" |
| `get_expiring_items` | 即将过期物品 | days(默认7) | "有什么快要过期了？" |
| `get_waste_report` | 浪费分析报告 | period, family_id | "上个月浪费了多少钱？" |
| `get_statistics` | 消耗趋势 | period | "我家一个月用多少油？" |

#### 触发器与配置

| 工具名称 | 描述 | 主要参数 | 场景示例 |
|---------|------|---------|--------|
| `bind_trigger` | 绑定扫码到目标 | code, code_type, target_type, target_id | "帮我把这张NFC标签绑定到药箱" |
| `get_bindings` | 查看所有绑定 | location_id | "看看冰箱上绑了什么" |
| `create_automation` | 创建自动化规则 | trigger_type, action_type, action_config | "设置碰冰箱自动检查过期食品" |

认证方式：MCP 请求头携带 `Authorization: Bearer <api_token>`

### 4.8 条码数据源策略

> **核心问题：** 国内没有完整的、开源的条码数据库。中国物品编码中心 (ANCC) 数据仅对注册企业开放，个人开发者只能通过网页查询或第三方 API。

**MVP 策略：分级回退**

| 优先级 | 数据源 | 覆盖范围 | 免费额度 | 说明 |
|--------|--------|---------|---------|------|
| 1 | 本地缓存 | 用户已录入的条码 | 无限 | 同一条码二次扫码直接命中 |
| 2 | 极数本源 (apizero.cn) | 千万级国内商品 | 注册 200 次/日 | EAN-13/8, UPC-A/E，MVP 首选 |
| 3 | Open Food Facts | 国际食品 | 无限 API | 覆盖部分进口食品，中文名可能缺失 |
| 4 | 手动填写 | — | — | 以上均无结果时的兜底 |

**Phase 2 扩展：**

- 对接阿里云万维易源 API（付费，覆盖国内药品/图书等更多品类）
- ISBN 查询：Open Library API（国际）+ 中国国家图书馆网页查询
- 用户贡献：扫码时如本地无记录且 API 无结果，用户手动填写后自动入库到本地缓存，形成社区共享数据库

> **条码类型覆盖：** EAN-13（含 69 码前缀）、EAN-8、UPC-A、Code128、ISBN-13。中国商品条码前缀为 690-699，EAN-13 解析时需识别此前缀并优先查国内数据源。

**降级体验与额度管理：**

- apizero.cn 200 次/日对个人用户通常足够（日均录入 5-10 件 → 可支撑 20-40 天）
- 当日额度用完时：扫码后显示"今日免费查询已用完，可直接手动填写或明天再试"，不阻断用户操作
- 本地缓存命中不计入 API 调用（同一条码二次扫码免费）
- Phase 2 可选：付费 API 额度包（apizero.cn ¥99/年 5000 次/日），用户自行选择

### 4.9 认证流程

```
注册 → 创建家庭空间 → 邀请成员 (admin/editor/viewer)
                    ↓
登录 (email + password) → JWT Access Token (15m) + Refresh Token (7d)
                    ↓
API Token 管理页面 → 生成长期 Token（用于 MCP 无状态调用）
```

### 4.10 数据库多架构策略

**主推 PostgreSQL**（JSONB 原生索引查询、全文搜索、pgvector 未来扩展）。SQLite 作为单用户/开发备选。

#### 部署矩阵

| 场景 | 推荐数据库 | 说明 |
|------|-----------|------|
| Docker 部署（推荐） | PostgreSQL 16 | `docker-compose.yml` 默认包含 postgres service |
| 单用户自托管 | SQLite | 改 `DB_TYPE=sqlite`，移除 postgres service |
| 开发/测试 | SQLite | 零依赖，`npx drizzle-kit push` 即用 |
| SaaS 云端 | PostgreSQL + pgBouncer | 连接池 + 多租户 schema 隔离 |

#### JSON 字段跨数据库兼容

```typescript
// Drizzle Schema — 唯一写法，两种数据库自动适配
const items = sqliteTable('items', {
  name: text('name').notNull(),
  quantity: real('quantity').notNull().default(0),
  customFields: text('custom_fields', { mode: 'json' }),
  // SQLite: 存为 TEXT 列，JSON 字符串
  // PostgreSQL: 自动变为 JSONB 列，支持原生索引
})

// PostgreSQL JSONB 查询示例（Service 层无需改代码）
await db
  .select()
  .from(items)
  .where(
    sql`items.custom_fields->>'warrantyEnd' < NOW() + INTERVAL '30 days'`
  )
```

#### 切换方法

```bash
# drizzle.config.ts 改两行：
#   dialect: 'postgresql',          # 原来是 'sqlite'
#   dbCredentials: { url: env.DB_URL }  # 原来是 { url: './data/homehub.db' }

# .env 改一行：
DB_TYPE=postgres                    # 原来是 sqlite
DB_URL=postgres://homehub:password@localhost:5432/homehub

# 一行命令更新：
npx drizzle-kit push
```

**代价：改 2 行配置 + 1 行环境变量。Drizzle Schema、NestJS Service 代码全部不变。**

### 4.11 PWA 国内适配策略

> **核心挑战：** 国内手机浏览器碎片化严重，PWA 安装和推送通知体验不一致。

**浏览器适配矩阵：**

| 浏览器 | PWA 安装 | 推送通知 | 策略 |
|--------|---------|---------|------|
| Chrome Android | ✅ 自动弹窗 | ✅ | 最佳体验，优先引导 |
| 小米/MIUI 浏览器 | ✅ 自动弹窗 | ⚠️ 部分受限 | 支持，提示安装 |
| OPPO/一加浏览器 | ⚠️ 需手动触发 | ⚠️ 部分受限 | 提示"菜单→安装应用" |
| Edge Android | ✅ 自动弹窗 | ✅ | 同 Chrome 内核 |
| 华为浏览器 | ❌ 不支持安装 | ❌ | **引导安装 Chrome** |
| QQ 浏览器 | ⚠️ 有限 | ❌ | 基础可用，提示换 Chrome |
| UC 浏览器 | ⚠️ 部分 | ❌ | 基础可用 |
| Safari iOS | ✅ 手动添加 | ⚠️ iOS 16.4+ 限主屏幕 | 引导"分享→添加到主屏幕" |

**MVP 适配措施：**

1. **检测并引导**：首页检测浏览器类型，对华为/QQ/UC 等浏览器显示"获得最佳体验，请使用 Chrome 打开"引导条
2. **安装引导组件**：统一的 `<InstallPrompt>` 组件，根据浏览器类型显示不同的安装步骤（含截图指引）
3. **iOS 专项**：检测 iOS Safari，显示"添加到主屏幕"的分步引导弹窗（首次访问自动弹出）
4. **降级策略**：不支持 PWA 安装的浏览器，仍可正常使用网页版，只是无法离线和推送

### 4.12 MCP 生态参考与协议版本

**MCP 协议现状（2026 年 6 月）：**

- 协议规范版本 `2025-06-18`（最新稳定版），下一候选版 `2026-07-28` 已锁定（核心变更：无状态化）
- 2025 年 12 月 Anthropic 将 MCP 捐赠给 **Linux 基金会** 旗下 Agentic AI Foundation，OpenAI/Google/Microsoft/AWS 作为白金会员
- 公共 MCP Server 数量已超 9000+，SDK 月下载量 9700 万次
- 主流支持：Claude Desktop、ChatGPT、Gemini、Cursor、VS Code Copilot、阿里云百炼、Windows 11 26H2

**家庭/IoT 领域 MCP 参考实现：**

| 项目 | 说明 | 对 HomeHub 的参考价值 |
|------|------|---------------------|
| **Home Assistant MCP Server** | 75 个工具功能，自然语言控制 HA 设备 | MCP Tool 设计模式、工具粒度划分 |
| **Xiaomi Miloco** | 小米 2025 年 11 月发布，MCP 协议封装米家生态 | 国内 IoT+MCP 先例、端侧大模型集成 |
| **杜克大学 IoT-MCP** | MCP 作为 AI 与 IoT 的"通用语言" | 学术验证了 MCP 在 IoT 场景的可行性 |

> **HomeHub MCP 策略：** 基于 MCP 规范 `2025-06-18` 实现，使用官方 TypeScript SDK。内置 22 个核心工具通过 `mcp-tool` 扩展点注册，第三方插件可注册自定义工具。Transport 层使用 Streamable HTTP（HTTP + SSE），适配未来无状态化规范。

---

## 五、Implementation Plan

### Phase 1: 核心骨架 (2-3 周)

```
Week 1: 项目初始化 + 认证系统 + 本土基础
├── NestJS 项目脚手架 + Drizzle ORM 配置
├── Vue 3 + Vite + Naive UI 前端框架搭建
├── 用户注册/登录 (JWT 双 Token)
├── 家庭空间创建 + 成员邀请
├── API Token 管理
└── 国内计量单位预设 (斤/两/个/包/瓶) + 中文日期格式 (YYYY-MM-DD)

Week 2: 库存核心
├── 物品 CRUD (增删改查)
├── 位置三级管理
├── 类别 + 标签系统
├── 库存消耗/移动操作
└── 扫码入库 (EAN-13 兼容 + apizero.cn 条码查询 + 本地缓存)

Week 3: 界面打磨
├── Naive UI 主题定制
├── 移动端响应式适配（Naive UI 桌面端 + 条件渲染移动端组件）
├── PWA 配置 (vite-plugin-pwa) + 浏览器检测引导组件
└── 基础仪表盘
```

### Phase 2: 功能深化 (2-3 周)

```
Week 4: 统一清单系统 + 通知
├── 清单 CRUD（按 type 区分：购物/待办/家务/节日）
├── 清单条目管理 + 指派成员 + 评论区
├── 购物清单：自动补货（低于阈值自动加入）
├── 购物清单：勾选自动入库
├── 待办清单：指派成员 + 完成追踪
├── 家务清单：完成→自动重置 dueAt
├── 节日备货模板（春节/中秋/端午预设）
├── 通知推送 + 提醒

Week 5: 食谱 + 餐饮计划
├── 食谱管理
├── 食材关联库存
├── 根据库存推荐食谱
├── 周餐饮计划
└── 餐饮计划自动生成购物清单

Week 6: 统一触发层 + 编码输出层
├── Scanner 抽象接口（Unified ScanResult + Scanner 注册表）
│   ├── Web NFC Scanner 实现
│   ├── QR/条码 Scanner 实现
│   └── RFID 区域感知 Scanner 实现（ESP32 + MQTT）
├── Trigger Resolver（上下文感知 + 意图推断引擎）
├── Action Pipeline（标准化动作执行链）
├── TriggerBinding 数据字典（一处注册，多点触发）
├── 编码生成引擎（QR + NFC NDEF + 条码生成）
├── 标签排版引擎（批量导出 PDF）
├── 自动化触发引擎 + 预设模式
└── 硬件抽象层 HAL 接口定义（预留）
```

### Phase 3: 上线打磨 (1-2 周)

```
Week 7: AI 视觉/语音 + 数据迁移 【扩展】
├── AI 拍照识别入库 (MCP Tool)
├── 语音快速录入 (MCP Tool)
├── 从 Grocy 导入（Grocy CSV 导出格式：stock/chores/shopping_lists/recipes 表）
├── 从 HomeBox 导入（HomeBox JSON 导出：items/locations/labels 表）
├── 通用 CSV 导入（模板下载 + 字段映射配置）
├── 数据导出 (CSV/JSON)
└── 多语言支持架构

Week 8: 性能 + 安全 + 浪费分析 【扩展】
├── 数据库查询优化 (PostgreSQL 索引/查询计划/连接池；SQLite 备选索引)
├── API 速率限制
├── 安全审计
├── 隐私合规
├── 浪费分析报告
├── Beta 测试 + Bug 修复
├── NFC 标签批量打印工具
├── 电子设备物品类型深化（保修提醒/维修记录/文档关联）
└── 物品 NFC 标签绑定流程优化
```

### Phase 4: SaaS 扩展 (未来)

```
├── PostgreSQL 迁移工具
├── Docker Compose 一键部署
├── 多家庭管理后台
├── 数据统计看板 (Vue-ECharts)
├── UHF RFID 批量盘点
├── 智能冰箱/硬件集成
└── 主动 AI Agent (自动化管家)
```

---

## 六、UI 设计指引

### 6.1 Naive UI 主题定制

```typescript
import { createTheme, zhCN, dateZhCN } from 'naive-ui'

const homehubTheme = createTheme({
  common: {
    primaryColor: '#409EFF',       // 主色：清爽蓝
    successColor: '#67C23A',        // 新鲜/安全
    warningColor: '#E6A23C',        // 即将过期
    errorColor: '#F56C6C',          // 过期/异常
    borderRadius: '8px',
    fontSize: '14px',
  }
})
```

### 6.2 核心页面布局

```
桌面端 (宽屏 > 768px):
┌──────┬────────────────────────────────────┐
│ 侧边栏 │        主内容区                     │
│       │  ┌──────────────────────────────┐ │
│ 📦 库存 │  │  物品列表 (排序/筛选/分页)    │ │
│ 🛒 清单 │  └──────────────────────────────┘ │
│ 🍳 食谱 │                                    │
│ 🏷 NFC  │                                    │  ← 【新增】
│ 📊 统计 │                                    │
│ ⚙ 设置 │                                    │
└──────┴────────────────────────────────────┘

移动端 (< 768px):
┌────────────────────┐
│ 顶部导航 + 搜索     │
├────────────────────┤
│   卡片列表 (n-card) │
│   滑动操作          │
│   NFC 扫描入口      │  ← 【新增】
├────────────────────┤
│ 📦 🛒 🍳 🏷 📊    │  ← 底部 Tab 导航（增加 NFC 页）
└────────────────────┘
```

### 6.3 NFC 交互流程

```
Android 路径 (Web NFC API):
  扫描前:  首页显示 NFC 扫描按钮/区域
              │
          手机靠近 NFC 标签
              │
          Web NFC API 读取 NDEF → 解析 JSON/Text → 本地处理
              │
          ┌────┴────┐
          │ 识别成功  │  识别失败
          └────┬────┘  → "未识别的标签，是否绑定？" → 进入绑定流程
               │
          ┌────┴────┐
          │ 匹配位置  │ → 跳转位置页面 + 显示动画效果
          │ 匹配物品  │ → 跳转物品详情页 + 显示操作菜单
          │ 匹配动作  │ → 执行自动化触发流程
          └─────────┘

iOS 路径 (NDEF URL 跳转 — 系统级，无需 App 内操作):
          手机靠近 NFC 标签
              │
          iOS 系统读取 NDEF URI → 弹出通知 "打开 HomeHub?"
              │
          用户点击 → Safari 打开 https://homehub.app/nfc/{code}
              │
          HomeHub PWA 接收 URL → 路由到 /nfc/:code → 自动执行绑定动作
              │
          ┌────┴────┐
          │ 匹配位置  │ → 跳转位置页面
          │ 匹配物品  │ → 跳转物品详情页 + 操作菜单
          │ 匹配动作  │ → 执行自动化触发
          └─────────┘

扫描后:  状态栏提示 "已识别: 冰箱冷冻室" + 快捷操作按钮
          (消耗/添加/移动/盘点了这个位置的物品)
```

### 6.4 关键交互模式

| 场景 | 移动端交互 | 桌面端交互 |
|------|-----------|-----------|
| 消耗物品 | 长按→数字键盘输入数量 | 右键菜单/双击编辑 |
| 添加物品 | 底部弹出式表单 (n-drawer) | 右侧滑出抽屉 |
| 扫码入库 | 调用摄像头扫码 | 输入框手动输入条码 |
| NFC 扫描 | 触碰即识别（自动唤醒 App） | 点击 NFC 虚拟按钮模拟 |
| 批量操作 | 多选→底部操作栏 | 勾选→顶部批量操作 |

---

## 七、Testing Decisions

### 7.1 测试策略

- **原则：只测试外部行为，不测试实现细节**
- **后端：** 单元测试 (Service) + E2E (Controller API)
- **前端：** Vitest 组件测试 + Playwright E2E
- **MCP：** 模拟 MCP 客户端调用测试
- **NFC/RFID：** 模拟 Web NFC API + MQTT 事件测试

### 7.2 关键测试场景

```
后端:
├── 认证流程 (注册→登录→刷新→注销)
├── API Token 鉴权 (有效/过期/无权限)
├── 库存 CRUD 边界条件 (负数/零值/重复条码)
├── 过期物品查询准确性
├── 自动补货逻辑 (阈值触发)
├── NFC 标签绑定/解绑/重复绑定
├── 自动化触发引擎 (条件匹配→动作执行)
├── RFID 区域事件 (进入/移出/超时)
└── MCP Tool 参数校验

前端:
├── 库存列表渲染 (空/满/筛选状态)
├── 表单验证 (必填/格式/联动)
├── 响应式布局 (3种断点)
├── PWA 离线缓存
├── NFC 扫描交互流程
├── 扫码摄像头交互
└── 语音输入/拍照识别交互

硬件:
├── NFC 标签读写一致性
├── Web NFC API 兼容性 (Android Chrome)
├── RFID 读卡器 MQTT 连接稳定性
└── 触发事件延迟 (目标 < 500ms)
```

---

## 八、Out of Scope (MVP)

1. **智能硬件/IoT 集成** — 不支持自动冰箱、智能秤等硬件（NFC 标签本身不依赖额外硬件，不在此列）
2. **跨家庭空间共享物品** — 仅支持同一家庭空间内共享
3. **原生移动 App** — PWA 覆盖，不单独开发 iOS/Android App
4. **语音唤醒/语音助手** — 仅通过 MCP 对接已有语音 Agent + 语音输入功能（此功能是用 Mic 录一段话转文字，不是语音助手）
5. **电商自动下单** — 购物清单不自动下单购买
6. **食谱 AI 自动生成** — 用户手动添加食谱，AI 仅做匹配推荐
7. **多语言** — MVP 仅支持简体中文
8. **UHF RFID 批量盘点** — 仅支持 HF RFID + NFC，UHF 作为未来扩展

---

## 九、Further Notes

1. **开源策略：** 考虑开源（MIT 协议），吸引社区贡献插件/主题
2. **MCP 作为首要用户界面：** REST API 是唯一业务接口和数据管道，MCP 是面向 AI Agent 的映射层。所有核心操作同时暴露 REST API + MCP Tool，用户通过 PWA 走 REST，AI Agent 走 MCP，两条路径等价
3. **数据所有权：** 用户数据默认存储在本地，SaaS 版本需明确数据归属和导出
4. **隐私：** 家庭地址、购物习惯等敏感数据不上传云端（除非 SaaS 签约）
5. **NFC 成本控制：** NFC 标签贴纸成本约 ¥0.3-0.8/张，一个三口之家约需 30-50 张，总成本 < ¥40
6. **RFID 硬件成本：** ESP32 + RC522 模块约 ¥40/套，适合对自动化有需求的高级用户
7. **Web NFC 限制：** 仅 Chrome Android 89+ 和 Edge Android 支持 Web NFC API；iOS 不支持但可通过 NDEF URL 跳转实现只读交互（详见 4.4 节双编码策略）；桌面端可通过 Web Serial API + USB NFC 读卡器
8. **NFC 市场现状：** 2024 年中国智能手机 NFC 渗透率约 70%，中高端机型（2000 元以上）搭载率超 85%，预计 2026 年全市场渗透率将突破 85%。支付宝"碰一下"支付 2024 年推出后加速了 NFC 普及
9. **PWA 国内限制：** 华为浏览器不支持 PWA 安装，需引导用户安装 Chrome；iOS Safari 推送通知需 iOS 16.4+ 且仅限主屏幕 Web App。详见 4.11 节
10. **项目名称暂定 HomeHub**（家庭智能管家），正式发布时确定品牌名
11. **iOS Native App 预留：** MVP 采用 PWA 优先策略，但 iOS 在 NFC 写入和后台推送方面存在硬限制。如果 iOS 用户占比超过 30% 且反馈强烈，Phase 3+ 可考虑开发轻量原生壳（WebView + CoreNFC + APNs），复用 PWA 的 Web 层代码，仅补齐原生能力。预计工作量 2-3 周

---

## AIGC 合规处理

> 本文档由 AI 辅助生成，后续生成正式文件（.md/.docx/.pdf）时需添加 AIGC 标识。

**合规检查清单：**
- [ ] 文档内容已审阅
- [ ] AIGC 标识已添加
- [ ] 技术决策已确认
