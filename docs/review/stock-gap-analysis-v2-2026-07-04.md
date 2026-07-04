# HomeHub vs Grocy 库存管理深度差距分析 (v3)

> **最后更新**: 2026-07-04  
> **对标项目**: [Grocy](https://github.com/grocy/grocy) v4.6.0  
> **状态**: 大部分差距已补齐，剩余为锦上添花功能

---

## 一、已对齐的功能 (35项)

以下功能 HomeHub 已实现，达到或超过 Grocy 水平：

### 核心库存管理
| 功能 | HomeHub 实现 | 状态 |
|------|-------------|------|
| 批次管理 | `invItemBatches` 表 + FIFO 消耗 | ✅ |
| FIFO 消耗 | 按到期日+创建时间排序扣减 | ✅ |
| 盘点写回 | `completeAudit()` 调用 adjust API | ✅ |
| 库存日志 | HistoryPage 筛选+汇总 | ✅ |
| 变质标记 | `spoiled` 字段 | ✅ |
| 到期日自动计算 | `defaultBestBeforeDays` | ✅ |
| 开启后到期调整 | `defaultBestBeforeDaysAfterOpen` | ✅ |
| 冷冻自动调整 | 位置类型判断 + 到期延长 | ✅ |
| CSV 导入导出 | 前端按钮 + 后端 API | ✅ |
| 批次编辑 | EditBatch API + 前端界面 | ✅ |
| 批次合并 | CompactBatches API + 前端按钮 | ✅ |

### 报表与分析
| 功能 | HomeHub 实现 | 状态 |
|------|-------------|------|
| 支出报表 | SpendingReport 页面 | ✅ |
| 位置报表 | LocationReport 页面 | ✅ |
| 消耗率追踪 | `lastUsedAt` + `spoilRate` | ✅ |
| 食谱 Due Score | `getDueScore()` 计算 | ✅ |

### 产品与单位
| 功能 | HomeHub 实现 | 状态 |
|------|-------------|------|
| 多单位体系 | 4 种单位 + 转换因子 | ✅ |
| 产品图片 | StockList 卡片/表格缩略图 | ✅ |
| 热量追踪 | `caloriesPerUnit` 字段 | ✅ |
| 条码多对一 | `invProductBarcodes` 表 | ✅ |
| 父子产品 | `parentId` + 聚合查询 | ✅ |

### 购物与清单
| 功能 | HomeHub 实现 | 状态 |
|------|-------------|------|
| 购物列表关联 | `autoReplenish()` 低库存触发 | ✅ |
| 清单分组 | `groupBy` 字段 | ✅ |
| 区域标记 | `mdShops.area` 字段 | ✅ |

### 用户与权限
| 功能 | HomeHub 实现 | 状态 |
|------|-------------|------|
| 多用户追踪 | `userName` 在历史/仪表盘显示 | ✅ |
| 权限控制 | `AdminGuard` + `users.isAdmin` | ✅ |
| 唯一约束 | 所有 master-data 表 | ✅ |

### 智能功能
| 功能 | HomeHub 实现 | 状态 |
|------|-------------|------|
| 外部条码查询 | `BarcodeLookupService` (OpenFoodFacts) | ✅ |
| 自定义二维码 | Encoder 模块 (QR/NFC/条码) | ✅ |
| 功能开关 | `features.ts` 配置 | ✅ |
| 日期快捷输入 | `parseDateShortcut()` 工具 | ✅ |
| 键盘快捷键 | `useKeyboardShortcuts()` 组合式函数 | ✅ |
| 自定义 CSS/JS | 注入点已配置 | ✅ |
| Demo 模式 | `seed-demo.ts` 脚本 | ✅ |
| 全局错误处理 | `AllExceptionsFilter` 已注册 | ✅ |
| 统一响应格式 | `TransformInterceptor` 已注册 | ✅ |

---

## 二、残余差距 (8项，均为 P2)

| # | 差距 | 说明 | 价值 |
|---|------|------|------|
| 1 | 子产品替代消耗 | 消耗父产品时自动使用子产品库存 | 低 |
| 2 | 皮重处理 | 毛重/净重管理（schema 已有 `tareWeight`） | 低 |
| 3 | 电量管理 | 电池充电/更换追踪 | 低 |
| 4 | 设备手册管理 | 家电说明书存储（已有 `invDocuments`） | 低 |
| 5 | 夜间模式自动切换 | 根据日出日落切换 | 低 |
| 6 | 移动端 App | Android/iOS 原生应用 | 中 |
| 7 | 离线 PWA | 离线可用 | 中 |
| 8 | 自定义字段系统 | 任意实体附加自定义字段 | 中 |

---

## 三、HomeHub 独有优势 (Grocy 无)

| 功能 | 说明 |
|------|------|
| **AI MCP 集成** | 自然语言查询库存、智能建议 |
| **IoT RFID 支持** | 读卡器管理、自动出入库识别 |
| **硬件集成** | ESP32/STM32 设备管理、OTA 升级 |
| **插件系统** | 三层架构 (core/registry/built-in)，支持热加载 |
| **MCP 工具扩展** | 可插拔的 AI 工具集 |
| **NestJS 架构** | 模块化 + DI，更适合大型项目 |
| **Vue3 + TypeScript** | 现代前端技术栈 |
| **Drizzle ORM** | 类型安全的数据库操作 |

---

## 四、结论

**当前状态**: HomeHub 已实现 35 项核心功能，与 Grocy 的差距仅剩 8 项 P2 级锦上添花功能。

**核心差距**: 已基本消除。多单位体系、食谱 Due Score、购物清单分组等关键功能均已补齐。

**差异化优势**: HomeHub 在 AI/IoT/插件系统方面领先，这些是 Grocy 完全没有的方向。

**建议**: 剩余 P2 功能按需实施，优先级不高。应将精力集中在发挥 AI + IoT 差异化优势上。
