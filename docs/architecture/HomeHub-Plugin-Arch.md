# HomeHub — 可插拔架构设计 (Plugin Architecture)

> 版本：v1.3 | 日期：2026-06-29
> 本文档是 HomeHub 文档体系的组成部分。详见 [HomeHub-PRD.md](./HomeHub-PRD.md) → 4.1 模块划分 `plugins/`。

---

## 一、设计哲学

把功能边界从核心剥离，让 HomeHub 成为平台而非功能堆砌。

```
┌──────────────────────────────────────────────────────────────┐
│                     HomeHub Core                             │
│  (用户/家庭/认证/数据库/配置/生命周期/Plugin Registry)       │
├──────────────────────────────────────────────────────────────┤
│         ▲ 插件注册  ▲ 插件发现  ▲ 插件生命周期              │
│         │           │           │                            │
│  ┌──────┴──┐  ┌────┴────┐  ┌───┴────────┐                  │
│  │ Scanner │  │ ItemType│  │  Output     │  ... 更多        │
│  │ Plugins │  │ Plugins │  │  Plugins    │      扩展点      │
│  └─────────┘  └─────────┘  └─────────────┘                  │
└──────────────────────────────────────────────────────────────┘
```

### 五条铁律

| # | 原则 | 含义 |
|---|------|------|
| 1 | **Core 只做编排，不做实现** | Core 定义接口契约，插件提供实现。没有"内置功能 vs 插件"的区别，内置也是插件 |
| 2 | **发现即注册** | 插件放在约定目录或 npm 安装后自动发现，无需手动修改配置文件 |
| 3 | **版本化与隔离** | 每个插件独立 semver；插件之间不能直接引用，只能通过 EventBus + 暴露的服务通信 |
| 4 | **运行时热插** | 安装/卸载/升级插件不重启 Core；onLoad 失败自动回滚 |
| 5 | **即用即跑（npx/uvx 模式）** | 插件注册时不安装依赖，首次调用时自动下载缓存。零安装等待、无冲突、自动回收 |

---

## 二、插件元系统（Plugin Meta-System）

### 2.1 插件元数据

所有插件必须提供一份元数据声明，Core 据此决定如何加载和路由：

```typescript
// plugin.yaml（推荐）或 package.json 的 homehub 字段
id: scanner-nfc-web                    # 全局唯一，格式: {扩展点名}-{具体实现}
name: Web NFC Scanner
version: 1.0.0
description: 通过浏览器 Web NFC API 读取 NFC 标签
author: HomeHub Team
homepage: https://homehub.app/plugins/scanner-nfc-web

# 扩展点注册
extensionPoints:
  - scanner

# 依赖声明
requires:
  homehub-core: ">=1.0.0"
optionalDependencies: []

# 运行时声明（不写 = 同进程 JS）
runtime:
  type: python                    # native(JS) | python | go | rust
  entry: src/main.py              # 入口文件
  env: uvx                        # 执行器: npx | uvx | direct
  ipc: stdio                      # 通信方式: stdio | socket | unix_socket
  healthCheck:
    interval: 30
    command: health

# 配置表单（JSON Schema → UI 自动生成配置页）
configSchema:
  type: object
  properties:
    autoReconnect:
      type: boolean
      default: true
      description: 扫描断开后自动重试
    pollingInterval:
      type: number
      default: 3000
      minimum: 1000
      description: 轮询间隔（毫秒）

# 权限声明（沙箱用）
permissions:
  - web-nfc                   # 浏览器 NFC API
  - storage:plugin-data       # 插件私有存储
```

### 2.2 插件运行时接口

```typescript
interface HomeHubPlugin {
  meta: HomeHubPluginMeta
  
  // === 生命周期 ===
  onLoad?(ctx: PluginContext): Promise<void>
  onUnload?(ctx: PluginContext): Promise<void>
  onConfigChange?(config: Record<string, any>): Promise<void>
  
  // === 暴露给 Core 和其他插件的功能 ===
  exports?: Record<string, any>
}

// 每个插件收到的上下文
interface PluginContext {
  registry: PluginRegistry      // 插件注册中心
  db: DrizzleDB                 // 数据库（仅允许操作自己前缀的表和 trigger_bindings / nfc_tag_state 表）
  config: ConfigService         // 全局配置
  logger: Logger                // 带插件前缀的日志
  eventBus: EventBus            // 插件间事件总线
  storage: PluginStorage        // 隔离的 key-value 存储（插件私有）
}
```

### 2.3 Plugin Registry（Core 的核心）

```typescript
class PluginRegistry {
  private plugins: Map<string, HomeHubPlugin> = new Map()
  private extensionPoints: Map<ExtensionPointType, HomeHubPlugin[]> = new Map()
  
  // ─── 发现 ───
  
  async discoverFromDir(dir: string): Promise<DiscoveredPlugin[]>
  // 扫描目录下所有 plugin.yaml / package.json
  // 读取 meta → 验证完整性 → 检查依赖 → 返回待加载列表
  
  async discoverFromNpm(packageName: string): Promise<DiscoveredPlugin>
  // npm install → 读取 meta → 验证 → 复制到 plugins/community/
  
  // ─── 生命周期 ───
  
  async load(pluginId: string): Promise<void>
  // 1. 解析 class/object → 实例化
  // 2. 验证依赖是否已加载
  // 3. 创建 PluginContext（注入 db/config/logger/eventBus）
  // 4. 调用 plugin.onLoad(ctx)
  // 5. 注册到 extensionPoints 映射表
  // 6. 标记为 active
  // 失败 → 自动回滚卸载

  async unload(pluginId: string): Promise<void>
  // 1. 检查是否有其他插件依赖本插件
  // 2. 调用 plugin.onUnload()
  // 3. 从 extensionPoints 注销
  // 4. 标记为 inactive

  async reload(pluginId: string): Promise<void>
  // 开发模式热重载
  // unload → clear cache → load

  // ─── 查询 ───
  
  getPlugins<T>(point: ExtensionPointType): T[]
  // 返回该扩展点上所有已加载插件的 exports
  
  getFirstPlugin<T>(point: ExtensionPointType): T | null
  // 按优先级取第一个

  getPluginService(pluginId: string, serviceName: string): any
  // 获取其他插件暴露的服务
}
```

### 2.4 扩展点（Extension Points）

Core 定义以下扩展点，**每个扩展点都有一个明确的 TypeScript 接口契约**：

| 扩展点 | 契约 | 用途 | 插件数量预期 |
|--------|------|------|------------|
| `scanner` | `ScannerPluginExports` | 物理世界输入 | 多个共存，按优先级选 |
| `item-type` | `ItemTypePluginExports` | 物品类型定义 | 多个共存，按 type 匹配 |
| `output-device` | `OutputDevicePluginExports` | 物理世界输出 | 多个共存 |
| `trigger-action` | `TriggerActionPluginExports` | 动作执行器 | 多个共存 |
| `mcp-tool` | `McpToolExports` | MCP 工具扩展（由内置 MCP Server 插件自动收集） | 多个共存 |
| `notification` | — | 通知渠道 | 多个共存 |
| `barcode-lookup` | — | 条码查询服务 | 多个共存，按结果置信度选 |

> **条码数据源策略：** MVP 内置 `barcode-lookup-apizero` 插件（apizero.cn，200次/日），备选 `barcode-lookup-off` (Open Food Facts)。第三方插件可实现更多数据源。详见 PRD v1.5 §4.8。

| `ui-page` | — | 前端页面扩展 | 多个共存 |
| `ui-component` | — | 前端插槽填充 | 多个共存 |
| `hook` | — | 核心流程注入 | 多个共存，按优先级执行 |

---

## 三、四大核心扩展点详解

### 3.1 Scanner 插件：输入即插

**解决的问题：** NFC、QR、条码、RFID、UWB、蓝牙信标……输入方式会越来越多，每种都需要不同的硬件交互代码。

**设计：** Core 不知道"怎么扫"，只定义"扫到什么"。

```typescript
// === 契约（由 Core 定义，插件实现） ===
interface ScannerPluginExports {
  type: string                              // 'nfc' | 'qr' | 'barcode' | 'rfid' | 'uwb'
  name: string
  priority: number                          // 同类型多个 scanner 时选高优先级
  supported: boolean                        // 当前设备/环境是否支持
  
  scan(options?: ScanOptions): Promise<ScanResult>
  listen(callback: ScanCallback): () => void  // 持续监听模式，返回取消函数
}

interface ScanResult {
  type: 'nfc' | 'qr' | 'barcode' | 'rfid'
  raw: string
  timestamp: number
  metadata?: Record<string, any>
}

// === 内置插件示例：scanner-nfc-web ===
// 文件: plugins/built-in/scanner-nfc-web/plugin.ts
const WebNfcScanner: HomeHubPlugin = {
  meta: { /* yaml 字段同上 */ },
  
  async onLoad(ctx) {
    // 初始化 Web NFC API
    if ('NDEFReader' in window) {
      this.reader = new NDEFReader()
      ctx.logger.info('Web NFC available')
    }
  },
  
  exports: {
    type: 'nfc',
    priority: 100,
    get supported() { return 'NDEFReader' in window },
    
    scan: async () => {
      await this.reader.scan()
      return new Promise(resolve => {
        this.reader.onreading = ({ message }) => {
          resolve({
            type: 'nfc',
            raw: message.records[0].id,
            metadata: { records: message.records }
          })
        }
      })
    },
    
    listen: (cb) => {
      const handler = (e) => cb(e.detail)
      window.addEventListener('nfc-tag', handler)
      return () => window.removeEventListener('nfc-tag', handler)
    }
  }
}

// === 社区插件列表（未来可能） ===
// scanner-barcode-quagga     — 相机扫码
// scanner-rfid-esp32         — ESP32 MQTT RFID
// scanner-rfid-uhf           — 超高频 RFID（工业级批量盘点）
// scanner-uwb-apple          — Apple Nearby Interaction
// scanner-ble-beacon         — 蓝牙信标区域检测
// scanner-voice-agent        — AI Agent 语音指令（Agent 自身处理 ASR，通过 MCP 调用 HomeHub API）
// scanner-wifi-rtt           — Wi-Fi RTT 室内定位
//
// 注: iOS 不支持 Web NFC API，因此 scanner-nfc-web 仅在 Android 可用。
// iOS 用户的 NFC 读取由系统级 NDEF URL 跳转处理（无需 Scanner 插件）。
// NFC 写入在 iOS 上不可用，需借用 Android 设备或 USB 写卡器。详见 PRD v1.5 §4.3.6。
```

### 3.2 ItemType 插件：物品类型即插

**解决的问题：** 不同物品需要不同字段。食品要保质期，电池要充放电状态，葡萄酒要年份产地品鉴记录，宠物食品要适用体重——不能写死在代码里。

**设计：** 每种物品类型是一个插件。Core 查询 Item 表时，`type` 字段匹配对应的 ItemType 插件来渲染、验证、驱动状态机。

```typescript
// === 契约 ===
interface ItemTypePluginExports {
  type: string                              // 'food' | 'battery' | 'wine' | ...
  name: string
  icon: string
  
  // 类型配置
  config: {
    fields: FieldDef[]                      // 自定义字段（名称/类型/必填/默认值）
    hasStateMachine: boolean
    stateMachine?: StateMachineDef          // 状态转换定义
    features: string[]                      // 特性标记
    defaultUnit?: string
    renderComponent?: string                // 前端 Vue 组件（详情的扩展区域）
  }
  
  // 可选：校验逻辑
  validate?(data: Partial<Item>): { valid: boolean; errors: string[] }
}

interface FieldDef {
  key: string
  label: string
  type: 'string' | 'number' | 'date' | 'select' | 'boolean' | 'image'
  required?: boolean
  defaultValue?: any
  options?: { label: string; value: string }[]   // select 类型用
}

interface StateMachineDef {
  states: string[]
  transitions: {
    from: string
    action: string
    label: string                               // 显示名："充电"
    to: string
    incrementCycle?: boolean
  }[]
}

// === 内置插件示例: batteries ===
const BatteryItemType: HomeHubPlugin = {
  meta: {
    id: 'item-type-rechargeable-battery',
    name: '充电电池',
    version: '1.0.0',
    extensionPoints: ['item-type']
  },
  
  exports: {
    type: 'rechargeable_battery',
    name: '充电电池',
    icon: 'battery-charging',
    
    config: {
      fields: [
        { key: 'capacity', label: '容量(mAh)', type: 'number', required: true },
        { key: 'cycleCount', label: '循环次数', type: 'number', defaultValue: 0 },
      ],
      hasStateMachine: true,
      stateMachine: {
        states: ['charged', 'depleted'],
        transitions: [
          { from: 'charged', action: 'use', label: '使用/放电', to: 'depleted' },
          { from: 'depleted', action: 'charge', label: '充电', to: 'charged', incrementCycle: true },
        ]
      },
      features: ['cycle_count_tracking'],
      renderComponent: 'BatteryStateIndicator'
    },
    
    validate: (data) => {
      const errors = []
      if (data.cycleCount > 1000) errors.push('电池循环次数异常，建议更换')
      return { valid: errors.length === 0, errors }
    }
  }
}

// === 社区插件列表（未来可能） ===
// item-type-wine              — 葡萄酒（年份/产地/品种/评分/适饮期）
// item-type-pet-supply        — 宠物用品（适用宠物/体重/有效期）
// item-type-cosmetics         — 化妆品（开封日期/PAO/批次号）
// item-type-plant             — 植物（学名/浇水周期/施肥/光照）
// item-type-book              — 书籍（ISBN/作者/出版社/借出状态）
// item-type-medicine          — 药品（成分/用法/禁忌/处方信息）
// item-type-fishing-tackle    — 渔具（类型/长度/线号）
```

### 3.3 Output Device 插件：输出即插

**解决的问题：** 打印机、NFC 写卡器、标签机……每种硬件驱动不同。不能预知用户会买什么牌子的设备。

**设计：** Core 抽象 `OutputDevice` 接口，每种设备一个插件。用户连接的设备由插件自动检测。

```typescript
// === 契约 ===
interface OutputDevicePluginExports {
  type: string                              // 'thermal_printer' | 'label_printer' | 'nfc_writer'
  name: string
  
  detect(): Promise<DeviceInfo[]>           // 自动发现可用设备
  print(job: PrintJob): Promise<PrintResult>
  write?(data: NdefData): Promise<WriteResult>
  getStatus(deviceId: string): DeviceStatus
}

interface PrintJob {
  format: 'qr_label' | 'nfc_sticker' | 'shopping_list' | 'stocktake_sheet'
  content: { type: string; ids: string[]; labelSize?: string; copies?: number }
}

// === 内置插件示例: PDF 导出 ===
const PdfExporter: HomeHubPlugin = {
  meta: { id: 'output-pdf', name: 'PDF导出', version: '1.0.0', extensionPoints: ['output-device'] },
  
  exports: {
    type: 'generic_printer',
    name: 'PDF 导出',
    
    detect: async () => [{ id: 'pdf', name: 'PDF 文件', status: 'online' }],
    
    print: async (job) => {
      // 生成 PDF → 浏览器下载
      const pdf = await generateLabelPdf(job)
      downloadBlob(pdf, 'homehub-labels.pdf')
      return { success: true, outputPath: 'download' }
    },
    
    getStatus: () => ({ online: true })
  }
}

// === 社区插件 ===
// output-thermal-58mm         — 58mm 热敏小票机（USB/蓝牙）
// output-label-brother        — Brother 标签打印机
// output-label-dymo           — Dymo 标签打印机
// output-nfc-acr122u          — ACR122U NFC 写卡器（WebUSB）
// output-nfc-android          — Android NFC 写入（手机App Shell）
// output-zebra                — Zebra 工业条码打印机
```

### 3.4 Trigger Action 插件：动作即插

**解决的问题：** 用户说"快过期时通知我"——通知方式可能是 App 推送、微信、邮件、短信。每种方式实现不同，且取决于用户偏好。

```typescript
// === 契约 ===
interface TriggerActionPluginExports {
  type: string
  name: string
  execute(config: Record<string, any>, context: ActionContext): Promise<ActionResult>
}

// === 内置插件示例 ===
// action-notification-inapp  — App 内推送
// action-mcp-tool            — 调用 MCP 工具

// === 社区插件 ===
// action-webhook             — 任意 Webhook（IFTTT / HomeAssistant / 自建服务器）
// action-wechat-push         — 微信推送（Server酱/PushPlus）
// action-email-smtp          — 邮件通知
// action-smart-home          — 米家/HomeKit 联动
// action-sms                 — 短信通知
// action-dingtalk            — 钉钉机器人
```

---


### 3.5 `mcp-tool` 扩展点：MCP 工具注册

`mcp-tool` 是 MCP Server 插件的工具来源。Core 不关心 MCP 协议细节，只定义注册契约。内置插件 `builtin.mcp-server` 自动收集所有 `mcp-tool` 扩展点并暴露给 AI Agent。

```typescript
// === 契约 ===
interface McpToolExports {
  name: string;              // 工具名（AI Agent 调用时的标识）
  description: string;       // 工具功能描述
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  apiPath: string;           // 后端 API 路径（参数占位符: {paramName}）
  parameters?: Record<string, {
    type: 'string' | 'number' | 'object' | 'boolean';
    optional?: boolean;
    default?: any;
    enum?: string[];
    description?: string;
  }>;
  mapParams?: string;        // 可选：MCP params → API body 的映射表达式
}
```

**注册方式（plugin.yaml）：**

```yaml
# plugins/my-recipes/plugin.yaml
name: my-recipes
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

**第三方插件无需知道 MCP 协议内部实现。** 注册 → MCP Server 自动收集 → AI Agent 自动发现可用工具。

**内置工具的注册方式完全一致：** `builtin.mcp-server` 插件也通过同样的 `mcp-tool` 扩展点注册所有内置工具。没有特殊入口。

---

## 四、插件生命周期

### 4.1 安装流程

```
用户操作                                 Core 内部
───────────────────────────────────────────────────────
用户点击"安装插件" 
  └─ 选择: npm 包名 / URL / 本地 zip
      │
      ▼
      ├─ Step 1: 下载并解压到临时目录
      ├─ Step 2: 读取 plugin.yaml → 验证 meta 完整性
      ├─ Step 3: 检查依赖兼容性（Core 版本、其他插件版本）
      ├─ Step 4: 运行安全审计（静态分析 + 沙箱试跑）
      │          └─ 发现高危行为 → 拒绝安装 + 报告用户
      ├─ Step 5: 检查权限声明 vs 用户授权
      │          └─ 首次申请敏感权限 → 弹窗请求用户确认
      ├─ Step 6: 复制到 plugins/community/{pluginId}/
      │
      ▼
插件状态: installed（未激活）
      │
      ▼
自动加载
  ├─ Step 7: 调用 onLoad(ctx)
  │          ├─ 成功 → 注册到 extensionPoints → 状态 active ✅
  │          └─ 失败 → 自动卸载 → 状态 error，记录错误日志
  └─ Step 8: 通知前端刷新插件 UI 插槽
```

### 4.2 卸载流程

```
用户点击"卸载插件"
  └─ Step 1: 检查是否有其他插件依赖本插件
  │          └─ 有 → 列出依赖方，提示用户"先卸载 X, Y, Z"
  ├─ Step 2: 检查是否有用户数据依赖
  │          ├─ 物品使用了该 ItemType → 询问"改为通用类型？"
  │          └─ Scanner 绑定记录 → 询问"删除关联？"
  ├─ Step 3: 调用 onUnload(ctx)
  ├─ Step 4: 从 extensionPoints 注销
  ├─ Step 5: 删除 plugins/community/{pluginId}/
  └─ Step 6: 删除插件私有存储数据
```

### 4.3 升级流程

```
用户看到插件可升级（v1.0 → v2.0）
  └─ 自动执行: install v2.0 → load → 替换 v1.0
  └─ 如果 onLoad 失败 → 回滚到 v1.0，保留数据和配置
```

### 4.4 启用/禁用（不卸载）

```typescript
// 禁用：卸载但不删除文件和数据
await registry.disable('item-type-wine')
// → 现有葡萄酒物品仍存在，但不再加载该类型的特殊逻辑

// 启用：重新调用 onLoad
await registry.enable('item-type-wine')
// → 插件恢复
```

---

## 五、插件间通信

### 5.1 EventBus（解耦的主要方式）

插件之间不直接引用。所有跨插件的交互走 EventBus：

```typescript
interface EventBus {
  emit(event: string, data: any): void
  on(event: string, handler: EventHandler): void
  off(event: string, handler: EventHandler): void
}

// 核心内置事件
┌─────────────────────┬────────────────────────────────┬──────────┐
│ 事件                 │ payload                        │ 触发者    │
├─────────────────────┼────────────────────────────────┼──────────┤
│ scan:received       │ ScanResult                     │ Core     │
│ barcode:resolved    │ { raw, product }               │ 条码插件  │
│ trigger:resolved    │ ResolvedAction                 │ Core     │
│ action:executed     │ { actionType, result }         │ 动作插件  │
│ item:created        │ { itemId, type, ... }          │ Core     │
│ item:consumed       │ { itemId, quantity, ... }      │ Core     │
│ item:expired        │ { itemId, name, ... }          │ Core     │
│ print:completed     │ { jobId, deviceId, result }    │ 输出插件  │
│ plugin:loaded       │ { pluginId, extensionPoints }  │ Registry │
│ plugin:unloaded     │ { pluginId }                   │ Registry │
└─────────────────────┴────────────────────────────────┴──────────┘
```

**完整流程示例：扫葡萄酒条码**

```
scanner-barcode-zxing          EventBus                    Core
      │                          │                          │
      │── scan:received ────────→│                          │
      │                          │── 接收事件，查绑定字典 ──→│
      │                          │                          │── 未知条码 → 请求查询
      │                          │                          │
barcode-lookup-off              │                          │
      │                          │←── 调用 lookup ──────────│
      │── barcode:resolved ─────→│                          │
      │                          │── 识别为 wine ──────────→│
      │                          │                          │── 匹配 item-type-wine 插件
      │                          │                          │── 获取定制表单 → 返回前端
      │                          │                          │
用户填写信息 → 提交              │                          │
      │                          │── item:created ─────────│
      │                          │                          │
action-webhook                  │                          │
      │←── 监听 item:created ────│                          │
      │── 发送 Webhook → Notion │                          │
```

**全程没有硬编码的引用。** 每个插件只关心自己监听什么事件、发出什么事件。

### 5.2 服务暴露（有明确依赖关系时）

```typescript
// plugin A: item-type-wine
exports: {
  services: {
    'wine-aging-calculator': {
      estimateBestDrinkDate(wine: { vintage: number; type: string }): Date {
        // 红葡萄酒: vintage + 5-10年
        // 白葡萄酒: vintage + 2-5年
      }
    }
  }
}

// plugin B: 某个插件想用 wine 的计算器
const calc = ctx.registry.getPluginService('item-type-wine', 'wine-aging-calculator')
if (calc) {
  const date = calc.estimateBestDrinkDate({ vintage: 2015, type: 'red' })
}
```

---

## 六、目录结构与文件规范

### 6.1 目录

```
homehub/
├── core/                           # 核心系统（不可插拔）
│   ├── src/
│   │   ├── plugin/                 # 插件系统的 Core 部分
│   │   │   ├── registry.service.ts # Plugin Registry
│   │   │   ├── context.ts          # PluginContext 工厂
│   │   │   ├── event-bus.ts        # EventBus
│   │   │   ├── sandbox.ts          # 安全沙箱
│   │   │   └── auditor.ts          # 安全审计
│   │   ├── scanner/                # Core：只保留 Scanner Registry
│   │   ├── trigger/                # Core：Resolver + Pipeline
│   │   └── encoder/                # Core：编码格式定义
│   └── plugins/                    # 插件安装目录（运行时生成）
│       ├── built-in/               # 内置插件（随 Core 发布，不可删除）
│       └── community/              # 用户安装的插件（可增删）
│           └── item-type-wine/
│               ├── plugin.yaml
│               ├── src/
│               │   ├── index.ts
│               │   └── wine-form.vue    # 前端组件
│               ├── package.json
│               └── README.md
│
├── client/                         # 前端项目
│   ├── src/
│   │   ├── plugin/                 # 前端插件系统
│   │   │   ├── client-registry.ts  # 前端 Plugin Registry
│   │   │   ├── slot-manager.ts     # 插槽管理器
│   │   │   └── plugin-loader.ts    # 前端插件加载
│   │   ├── components/
│   │   │   ├── PluginSlot.vue      # 通用插槽容器
│   │   │   └── PluginSettings.vue  # 插件配置页
│   │   └── views/
│   │       └── plugins/            # 插件管理页面
```

### 6.2 插件文件规范

每个插件目录必须包含：

```
plugin.yaml              # 插件元数据（必选）
src/index.ts             # 插件逻辑（必选）
package.json             # 依赖声明（可能有 npm 依赖时）
README.md                # 文档（推荐）
preview.png              # 插件截图（推荐）
```

---

## 七、多语言运行时与依赖管理

### 7.1 设计目标

> **参考 npx（JS）和 uvx（Python）的核心哲学：用即跑，不显式安装。**
> 依赖下载延迟到首次调用，插件注册本身是纯元数据操作。

```
传统插件安装：                             新方式（npx/uvx 模式）：
用户点击"安装"                             用户点击"安装"
  ├─ npm install / pip install               ├─ 记录插件元数据
  ├─ 依赖冲突检查                            ├─ 注册入口点
  ├─ 写入 node_modules / venv                └─ 完事（毫秒级）
  └─ 配置环境变量               ┌──────────┴──────────┐
                               │ JS  → npx homehub-xxx │
                               │ Py  → uvx homehub-xxx │
                               │ Go  → 直接运行缓存     │
                               └─────────────────────┘
                               （首次调用自动下载缓存）
```

**好处：**
- 零安装等待 — 注册插件纯粹是写一条数据库记录
- 无依赖冲突 — 每次跑都是隔离环境（npx 临时 node_modules / uvx 自动 venv）
- 自动垃圾回收 — 长时间不用的插件自动清理缓存
- 版本共存 — 不同插件依赖同一库的不同版本同时工作

---

### 7.2 插件执行器（Executor）

Core 不直接 spawn 子进程，而是通过 **Executor 抽象层** 统一管理：

```typescript
interface PluginExecutor {
  type: 'npx' | 'uvx' | 'direct' | 'binary'
  
  // 启动入口点 → 返回 IPC 连接
  spawn(meta: PluginMeta, config: any): Promise<IPCConnection>
  
  // 清理缓存
  cleanup(pluginId: string): Promise<void>
  
  // 查询缓存状态
  cacheInfo(pluginId: string): CacheInfo
}
```

| 执行器 | 适用语言 | 工作原理 | 首次调用延迟 |
|--------|---------|---------|------------|
| `npx` | JS/TS | `npx --package=homehub-scanner-rfid -- call scan {}` | ~2-5 秒（npm 下载） |
| `uvx` | Python | `uvx --with-requirements=reqs.txt homehub-scanner-rfid call scan {}` | ~3-6 秒（PyPI 下载 + venv 创建） |
| `direct` | 任意 | `python3 /path/to/plugin/main.py`（本地已安装环境） | 0（依赖已就绪） |
| `binary` | Rust/Go | 直接运行预编译二进制 | 0 |

**典型插件声明：**

```yaml
# Python 插件（推荐用 uvx，零环境残留）
id: scanner-rfid-esp32
name: ESP32 RFID Scanner
runtime:
  type: python
  entry: src/main.py
  env: uvx                     # ← 核心：用 uvx 而非 pip install
  requirements:
    - pyserial>=3.5
    - bleak>=0.20

# Go 插件（预编译二进制，最快）
id: scanner-rfid-uhf
runtime:
  type: go
  env: binary
  binary: bin/scanner-uhf-linux-amd64    # 预编译

# JS 插件（无需声明 runtime，默认同进程 native）
id: scanner-nfc-web
# ... 无 runtime 字段 = 同进程 JS
```

---

### 7.3 IPC 通信协议（语言无关层）

所有外进程插件（Python/Go/Rust）通过统一的 **Line-Delimited JSON（LDJSON）** 协议与 Core 通信：

```
→ Core 发给插件
  {"type":"call","id":"req-001","method":"scan","params":{"timeout":5000}}
  {"type":"call","id":"req-002","method":"getStatus","params":{}}
  {"type":"configure","config":{"port":"/dev/ttyUSB0"}}
  {"type":"shutdown","reason":"plugin_upgrade"}

← 插件回复 Core
  {"type":"result","id":"req-001","success":true,"data":{"uid":"04:12:34:56:78:9A"}}
  {"type":"result","id":"req-002","success":false,"error":"Device not connected"}

← 插件主动推事件
  {"type":"event","event":"tag:detected","data":{"uid":"..."}}
  {"type":"event","event":"device:disconnected","data":{}}
  {"type":"log","level":"info","message":"Scanner initialized on /dev/ttyUSB0"}
```

**任何语言只要实现 stdin/stdout 的 LDJSON 解析，就是 HomeHub 插件。**

---

### 7.4 Plugin Registry 的 IPC 处理

```typescript
class PluginRegistry {
  // ... 原有 JS 插件同进程加载逻辑不变
  
  private executors: Map<string, PluginExecutor> = new Map()
  private ipcPlugins: Map<string, IPCPluginProcess> = new Map()

  async loadExternalPlugin(pluginId: string): Promise<void> {
    const meta = this.getMeta(pluginId)
    const executor = this.selectExecutor(meta.runtime)
    
    // 1. spawn 子进程（npx / uvx / direct / binary）
    const conn = await executor.spawn(meta, this.getPluginConfig(pluginId))
    
    // 2. 建立 LDJSON 解析管道
    const parser = new LDParser()
    conn.stdout.pipe(parser)
    parser.on('message', (msg) => this.handleIPCMessage(pluginId, msg))
    
    // 3. 发送初始化配置
    conn.stdin.write(JSON.stringify({
      type: 'configure',
      config: this.getPluginConfig(pluginId)
    }) + '\n')
    
    this.ipcPlugins.set(pluginId, { conn, parser, pending: new Map() })
  }

  async callPlugin(pluginId: string, method: string, params: any): Promise<any> {
    const plugin = this.ipcPlugins.get(pluginId)
    if (!plugin) throw new Error(`Plugin ${pluginId} not loaded`)
    
    const id = `req-${nanoid()}`
    plugin.conn.stdin.write(JSON.stringify({
      type: 'call', id, method, params
    }) + '\n')

    return new Promise((resolve, reject) => {
      plugin.pending.set(id, { resolve, reject })
      setTimeout(() => reject(new Error('IPC timeout')), 30000)
    })
  }

  // 崩溃自动重启
  private handleIPCCrash(pluginId: string) {
    logger.warn(`Plugin ${pluginId} crashed, restarting...`)
    this.loadExternalPlugin(pluginId)
  }
  
  private selectExecutor(runtime: RuntimeConfig): PluginExecutor {
    switch (runtime.env || 'npx') {
      case 'npx':  return new NpxExecutor()
      case 'uvx':  return new UvxExecutor()
      case 'direct': return new DirectExecutor()
      case 'binary': return new BinaryExecutor()
    }
  }
}
```

---

### 7.5 缓存管理策略

| 缓存类型 | 存储位置 | 保留策略 | 清理时机 |
|---------|---------|---------|---------|
| npx 缓存 | `~/.npm/_npx/` | 自动 LRU | npm 自身管理 |
| uvx 缓存 | `~/.cache/uv/` | 自动 LRU | uv 自身管理 |
| binary 缓存 | `plugins/.cache/{id}/` | 按插件版本 | 升级时替换 |
| pip venv（direct 模式） | `plugins/.venvs/{id}/` | 保留 | 卸载时删除 |

**用户视角：** 零管理。用得多的插件跑得快，用得少的插件自动消失。

---

### 7.6 各插件类型的推荐运行时

| 插件类型 | 推荐 | 原因 |
|---------|------|------|
| Scanner（浏览器端：Web NFC / 摄像头） | JS（同进程） | 浏览器 API 只能从 JS 调用，无需跨进程 |
| Scanner（硬件类：USB NFC / RFID / BLE） | Python（uvx） | pyserial / bleak / pcsc 等硬件库仅 Python 生态丰富 |
| ItemType | JS（同进程） | 纯数据结构，无 I/O，JS 足够 |
| Output Device（USB 打印机） | Python（uvx） | 需要串口 / USB 驱动 |
| Output Device（NFC 写卡器） | Python（uvx） | 需要 ISO 14443 协议栈 |
| Trigger Action（Webhook / 推送） | JS（同进程） | 纯网络请求，JS 足够 |
| Barcode Lookup | JS / Python | 按数据源：国内条码库可用 JS，OCR 增强用 Python |
| AI 视觉处理 | Python（uvx） | OpenCV / PyTorch 无可替代 |
| 高性能批处理（RFID 批量盘点去重） | Go / Rust（binary） | 大量原始数据处理 |

---

## 八、安全设计

### 分层防护

| 层级 | 措施 | 针对 |
|------|------|------|
| **安装前** | 静态代码审计（扫描危险 API 调用：exec、eval、文件写入等） | 恶意插件 |
| **安装时** | 权限声明 + 用户确认（如"请求访问摄像头"） | 权限滥用 |
| **运行时** | 沙箱隔离（VM2 / isolated-vm）：限制文件系统、网络、进程 | 运行时攻击 |
| **数据层** | 插件只能通过 Context.db 操作数据库；只能读写自己前缀的 key | 数据污染 |
| **通信层** | EventBus 消息有 type 白名单，不允许任意事件广播 | 事件污染 |

### 权限分级

```
🔴 高危（必须用户手动确认）
  ├─ filesystem:write           # 写入文件系统
  ├─ network:outbound           # 发起网络请求
  ├─ camera                     # 摄像头访问
  ├─ bluetooth                  # 蓝牙
  └─ process:spawn              # 创建子进程

🟡 中危（安装时一次性确认）
  ├─ filesystem:read            # 读取文件系统
  ├─ storage:plugin-data        # 插件私有存储
  └─ usb                        # USB 设备

🟢 低危（自动授权）
  ├─ eventbus:listen            # 监听事件
  ├─ eventbus:emit              # 发出事件
  └─ db:read                    # 数据库只读查询
```

---

## 九、与现有 HomeHub 架构的整合

### 迁移路径

```
Phase 0 (MVP, 当前)                 Phase 1 (插件化)                 Phase 2 (社区生态)
────────────────────────────────────────────────────────────────────────────────
┌──────────────────┐               ┌────────────────────┐          ┌────────────────────────┐
│                  │               │                    │          │                        │
│  所有功能硬编码     │               │  Core (瘦身)         │          │  Core (极简)             │
│  scanner/        │  ──────────→  │  + Plugin Registry │  ──────→ │  + Plugin Registry      │
│  encoder/        │               │  + EventBus        │          │  + Plugin Store API     │
│  hardware/       │               │  + 内置插件包       │          │  + 第三方贡献            │
│  item types      │               │                    │          │  + npm 分发              │
│  硬编码 JSON     │               │  scanner/          │          │                        │
│                  │               │  → 抽取为内置插件   │          │  community/             │
└──────────────────┘               │  encoder/          │          │  ├─ item-type-wine      │
                                   │  → 抽取为内置插件   │          │  ├─ scanner-uwb        │
                                   │  hardware/         │          │  └─ action-webhook     │
                                   │  → 变成 HAL 插件   │          │                        │
                                   │  item types        │          └────────────────────────┘
                                   │  → 改为插件注册     │
                                   └────────────────────┘
```

### Phase 0 → 1 的具体代码改动量

| 模块 | 当前 | 改动后 | 改动量 | 风险 |
|------|------|--------|--------|------|
| `modules/scanner/` | 3 个 service 文件 | 拆成 Core 接口 + 3 个内置插件 | 中 | 需保证现有行为不变 |
| `modules/trigger/` | 5 个 service 文件 | Core 只留 Resolver + Pipeline，action 拆插件 | 低 | 接口清晰，改动可控 |
| `modules/encoder/` | 4 个 service 文件 | Core 只留编码格式定义，具体生成放插件 | 中 |  |
| `modules/hardware/` | 5 个 service 文件 | 整体变成 HAL 插件系统 | 中 | 需要统一 OutputDevice 接口 |
| stock 物品类型 | 硬编码 `itemTypeConfigs` JSON | 改为 `ItemTypePlugin` 动态注册 | 低 | 配置 → 接口，数据不变 |
| Plugins 管理 | 不存在 | 新增 PluginRegistry + EventBus | 大 | 核心新模块，但不影响现有业务 |

### 建议的执行策略

```
第一刀：不改变现有代码行为，先加插件系统骨架
  ├─ Week 1: PluginRegistry + EventBus → 核心可用
  ├─ Week 2: 把 itemTypeConfigs 改成动态注册（低风险）
  ├─ Week 3-4: scanner/encoder/hardware 逐个抽取
  └─ Week 5: 暴露 plugins API + 插件管理 UI
```

---

## 十、前端插件系统

### 10.1 前端插件契约

```typescript
interface ClientPluginExports {
  // 注册页面路由
  routes?: RouteRecordRaw[]
  
  // 注册组件到核心预留插槽
  slots?: {
    [slotName: string]: Component
  }
  
  // 注册自定义字段渲染器
  customFieldRenderers?: Record<string, Component>
  
  // 注册 Scanner（前端侧，如 Web NFC / 摄像头）
  scanner?: ScannerPluginExports
}
```

### 10.2 前端插槽位置

```
┌────────────────────────────────────────────────────┐
│                首页看板 Dashboard                   │
│  ┌──────────────────────────────────────────────┐  │
│  │  PluginSlot: dashboard:widget               │  │
│  │  （看板小部件插件）                           │  │
│  └──────────────────────────────────────────────┘  │
│                                                     │
│                物品详情页                            │
│  ┌──────────────────────────────────────────────┐  │
│  │  通用字段（名称/数量/位置...）                │  │
│  ├──────────────────────────────────────────────┤  │
│  │  PluginSlot: stock:item-detail-extra         │  │
│  │  （红酒插件展示年份/品种/评分；宠物用品展示   │  │
│  │   适用体重/疫苗状态）                         │  │
│  └──────────────────────────────────────────────┘  │
│                                                     │
│                物品操作菜单                          │
│  ┌──────────────────────────────────────────────┐  │
│  │  PluginSlot: stock:item-actions              │  │
│  │  （电池插件添加"充电"/"放电"按钮）            │  │
│  └──────────────────────────────────────────────┘  │
│                                                     │
│                触发规则配置页                        │
│  ┌──────────────────────────────────────────────┐  │
│  │  PluginSlot: trigger:action-config           │  │
│  │  （Webhook 插件展示 URL 表单；邮件插件展示    │  │
│  │   收件人+模板配置）                           │  │
│  └──────────────────────────────────────────────┘  │
│                                                     │
│                设置页                                │
│  ┌──────────────────────────────────────────────┐  │
│  │  PluginSlot: settings:plugin-config          │  │
│  │  （自动生成每个插件的配置表单）                │  │
│  └──────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────┘
```

### 10.3 前端插件加载

```typescript
// 前端 PluginSlot 组件
<template>
  <PluginSlot name="stock:item-detail-extra" :props="{ itemId }" />
</template>

// 后端渲染插槽内容时：
// 1. 查询 item.type → 匹配 item-type 插件
// 2. 插件声明的 renderComponent 被注册到 slot
// 3. PluginSlot 动态渲染该组件
```

---

## 十一、API 设计

### Core API（操作插件系统）

```
GET    /api/v1/plugins                      # 已安装插件列表（含状态）
GET    /api/v1/plugins/:id                  # 插件详情
GET    /api/v1/plugins/:id/config           # 获取插件配置
PUT    /api/v1/plugins/:id/config           # 更新插件配置
POST   /api/v1/plugins/:id/enable           # 启用插件
POST   /api/v1/plugins/:id/disable          # 禁用插件
POST   /api/v1/plugins/install              # 安装插件 → { source: 'npm:xxx' | 'url:...' | 'file:...' }
POST   /api/v1/plugins/:id/uninstall        # 卸载插件
GET    /api/v1/plugins/discover             # 扫描 plugins/ 目录发现新插件
GET    /api/v1/plugins/market               # 插件市场列表（Phase 2）
```

### 插件内 API（插件可声明自己的 API 端点）

```typescript
// plugin.yaml 中声明
apiEndpoints:
  - method: GET
    path: /api/v1/plugins/wine/recommend
    handler: recommendWine

// Core 自动合并到主路由，带 /api/v1/plugins/{pluginId}/ 前缀
```

---

## 十二、边界条件与设计决策

### 12.1 插件间冲突

| 冲突场景 | 解决方案 |
|---------|---------|
| 两个 Scanner 插件声称 type='nfc' | 按 priority 选，高优先级的胜出；用户可在 UI 手动切换 |
| 两个 ItemType 插件注册同一个 type | 后加载的覆盖，发出警告 |
| 两个插件依赖同一个旧版本库 | npm 正常处理（嵌套依赖），插件独立打包 |
| 插件不响应 onUnload（死循环/崩溃） | Core 强制卸载 + 记录异常，下次启动不再自动加载该插件 |

### 12.2 数据隔离

```
数据库表         插件能访问？
─────────────────────────────
users            ❌ 否（Core 独占）
families         ❌ 否
items            ✅ 只读，如需写入需声明写权限
trigger_bindings ✅ 可读写（Scanner 插件注册绑定关系）
plugin_data      ✅ 按 pluginId 前缀隔离
```

### 12.3 性能

- 插件模块懒加载：只在被调用时 `import()`，不拖启动速度
- 禁用的插件不加载，内存零占用
- EventBus 监听者数量过多时（>50），Core 发出警告
- Scanner 的 `listen` 模式只在用户进入相关页面时激活，离开时取消

---

## 十三、开放问题

| 问题 | 可选方案 | 建议 |
|------|---------|------|
| 插件发布渠道 | npm vs 自建市场 vs ClawHub | 先用 npm，Phase 2 考虑自建市场 |
| 前端插件来源 | 与后端插件一起打包 vs 单独 CDN 分发 | 一起打包，统一管理 |
| 付费插件 | 支持 vs 不支持 | Phase 2 再讨论，Phase 1 只开源免费 |
| 类型安全 | 插件间用 JSON 传值 vs tRPC/GraphQL | JSON 最灵活，tRPC 留作选项 |
| 插件示例模板 | 提供 CLI 脚手架（`create-homehub-plugin`） | 考虑 Phase 1 后期做 |
