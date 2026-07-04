# HomeHub

现代化、中文化、AI 驱动的家庭库存管理系统。

## 功能特性

### 核心功能
- **库存管理** — 物品入库/出库/盘点，支持批次追踪、保质期管理、条码扫描
- **主数据管理** — 分类、位置、单位、品牌、店铺、标签的统一维护
- **购物清单** — 多清单管理，支持从库存不足自动生成采购建议
- **日历视图** — 月历+列表双模式，过期/采购/盘点事件可视化
- **库存盘点** — 行内编辑实际数量，自动计算差异和盈亏状态
- **菜谱管理** — 关联库存食材，支持用量计算
- **膳食计划** — 按周规划餐食，关联菜谱和购物清单
- **预算管理** — 按分类设定月度预算，追踪支出与结余

### 智能功能
- **AI MCP 工具** — 集成 Model Context Protocol，支持自然语言查询库存
- **条码扫描** — 摄像头实时识别 + 手动输入，自动匹配商品信息
- **IoT RFID** — 读卡器管理、区域划分，支持自动出入库识别
- **硬件集成** — ESP32/STM32 设备管理，支持固件 OTA 升级
- **通知系统** — 保质期预警、库存不足提醒
- **数据备份** — 一键导出/导入，支持定时自动备份

### 系统功能
- **多用户/多家庭** — 家庭成员管理，JWT 认证，Token 刷新
- **操作历史** — 完整审计日志，按时间线/物品维度查看
- **文档管理** — 保修卡、说明书、发票等附件上传与关联
- **管理后台** — 系统统计、用户管理、插件概览
- **插件系统** — 可扩展的功能模块架构

## 技术栈

| 层级 | 技术 |
|------|------|
| **前端** | Vue 3 + TypeScript + Vite + Naive UI + Pinia |
| **后端** | NestJS + TypeScript + Drizzle ORM |
| **数据库** | SQLite (开发) / PostgreSQL (生产) |
| **认证** | JWT (Access + Refresh Token) |
| **构建** | npm workspaces monorepo |
| **部署** | Docker Compose (Nginx + NestJS + PostgreSQL + Redis) |

## 项目结构

```
homehub/
├── client/                 # Vue 3 前端
│   ├── src/
│   │   ├── api/            # API 请求封装
│   │   ├── components/     # 通用组件
│   │   ├── composables/    # 组合式函数
│   │   ├── layouts/        # 布局组件
│   │   ├── locales/        # 国际化 (zh-CN / en)
│   │   ├── router/         # 路由配置
│   │   ├── stores/         # Pinia 状态管理
│   │   ├── styles/         # 全局样式
│   │   ├── utils/          # 工具函数
│   │   └── views/          # 页面视图
│   │       ├── admin/      # 管理后台
│   │       ├── audit/      # 库存盘点
│   │       ├── auth/       # 登录注册
│   │       ├── backup/     # 数据备份
│   │       ├── budget/     # 预算管理
│   │       ├── calendar/   # 日历视图
│   │       ├── dashboard/  # 仪表盘
│   │       ├── hardware/   # 硬件管理
│   │       ├── history/    # 操作历史
│   │       ├── iot-tags/   # RFID 标签
│   │       ├── master-data/# 主数据
│   │       ├── mcp/        # AI 工具
│   │       ├── recipes/    # 菜谱
│   │       ├── settings/   # 设置
│   │       ├── shopping-list/# 购物清单
│   │       └── stock/      # 库存管理
│   └── vite.config.ts
├── server/                 # NestJS 后端
│   ├── src/
│   │   ├── common/         # 公共模块 (DTO, 守卫, 装饰器)
│   │   ├── config/         # 环境变量校验
│   │   ├── db/             # 数据库 schema + 迁移
│   │   ├── migration/      # Grocy 数据迁移
│   │   ├── modules/        # 业务模块
│   │   │   ├── admin/      # 管理后台
│   │   │   ├── auth/       # 认证
│   │   │   ├── backup/     # 备份
│   │   │   ├── budget/     # 预算
│   │   │   ├── calendar/   # 日历
│   │   │   ├── dashboard/  # 仪表盘
│   │   │   ├── documents/  # 文档管理
│   │   │   ├── families/   # 家庭管理
│   │   │   ├── hardware/   # 硬件
│   │   │   ├── history/    # 操作历史
│   │   │   ├── iot-tags/   # RFID
│   │   │   ├── lists/      # 购物清单
│   │   │   ├── master-data/# 主数据
│   │   │   ├── mcp/        # AI 工具
│   │   │   ├── meal-plans/ # 膳食计划
│   │   │   ├── notifications/# 通知
│   │   │   ├── products/   # 产品
│   │   │   ├── recipes/    # 菜谱
│   │   │   ├── scanner/    # 条码扫描
│   │   │   ├── stock/      # 库存
│   │   │   ├── trigger/    # 触发器
│   │   │   └── users/      # 用户
│   │   ├── plugins/        # 插件系统
│   │   └── test/           # 测试
│   └── nest-cli.json
├── docker/                 # Docker 部署配置
│   ├── docker-compose.yml
│   ├── .env.example
│   ├── server/Dockerfile
│   └── client/Dockerfile
├── docs/                   # 项目文档
├── scripts/                # 工具脚本
├── package.json            # monorepo 根配置
└── overview.md
```

## 快速开始

### 环境要求

- Node.js >= 18
- npm >= 9
- Docker & Docker Compose (可选，用于数据库)

### 本地开发

**1. 克隆项目**

```bash
git clone <repo-url>
cd homehub
```

**2. 安装依赖**

```bash
npm install
```

**3. 配置环境变量**

```bash
cp docker/.env.example .env
# 编辑 .env 配置数据库连接等
```

**4. 启动数据库 (Docker)**

```bash
npm run docker:up
```

**5. 初始化数据库**

```bash
npm run db:generate    # 生成迁移文件
npm run db:migrate     # 执行迁移
npm run db:seed        # 初始化种子数据 (可选)
```

**6. 启动开发服务器**

```bash
npm run dev
```

启动后访问：
- 前端: http://localhost:5173
- 后端 API: http://localhost:3000/api/v1
- Swagger 文档: http://localhost:3000/api/docs

### 从 Grocy 迁移

如果你之前使用 Grocy，可以一键迁移数据：

```bash
npm run migrate:grocy -- -i ./grocy.db -f 1
```

支持 `--dry-run` 预览、`--skip-users` 跳过用户迁移。

## Docker 部署

### 快速部署

```bash
# 复制并编辑环境变量
cp docker/.env.example docker/.env
vim docker/.env

# 启动所有服务
cd docker && docker compose up -d

# 查看日志
docker compose logs -f
```

### 服务组件

| 服务 | 端口 | 说明 |
|------|------|------|
| `homehub-client` | 80 | Nginx 静态前端 |
| `homehub-server` | 3000 | NestJS 后端 API |
| `homehub-db` | 5432 | PostgreSQL 数据库 |
| `homehub-redis` | 6379 | Redis 缓存 |

### 环境变量

| 变量 | 必填 | 默认值 | 说明 |
|------|------|--------|------|
| `DB_TYPE` | 否 | `sqlite` | 数据库类型 (`sqlite` / `postgres`) |
| `DATABASE_URL` | 生产必填 | - | PostgreSQL 连接字符串 |
| `JWT_SECRET` | 生产必填 | - | JWT 签名密钥 |
| `JWT_REFRESH_SECRET` | 生产必填 | - | JWT 刷新密钥 |
| `PORT` | 否 | `3000` | 后端服务端口 |
| `CORS_ORIGIN` | 否 | `http://localhost:5173` | 跨域白名单 |
| `SQLITE_DB_PATH` | 否 | `./data/homehub.db` | SQLite 数据库路径 |

### 数据持久化

Docker 部署使用命名卷持久化数据：

- `postgres_data` — PostgreSQL 数据
- `redis_data` — Redis 缓存
- `./data` — SQLite 数据库 (本地挂载)

## API 接口

所有接口统一前缀 `/api/v1`，需 JWT 认证（除登录注册外）。

### 认证

| Method | Path | 说明 |
|--------|------|------|
| POST | `/auth/register` | 注册 |
| POST | `/auth/login` | 登录 |
| POST | `/auth/refresh` | 刷新 Token |
| POST | `/auth/logout` | 登出 |

### 库存

| Method | Path | 说明 |
|--------|------|------|
| GET | `/stock/items` | 物品列表 |
| POST | `/stock/items` | 创建物品 |
| PUT | `/stock/items/:id` | 更新物品 |
| DELETE | `/stock/items/:id` | 删除物品 |
| POST | `/stock/items/:id/checkin` | 入库 |
| POST | `/stock/items/:id/checkout` | 出库 |
| GET | `/stock/items/:id/history` | 变更历史 |

### 主数据

| Method | Path | 说明 |
|--------|------|------|
| GET/POST | `/master-data/categories` | 分类 |
| GET/POST | `/master-data/locations` | 位置 |
| GET/POST | `/master-data/units` | 单位 |
| GET/POST | `/master-data/brands` | 品牌 |
| GET/POST | `/master-data/shops` | 店铺 |
| GET/POST | `/master-data/tags` | 标签 |

### 其他

详见 Swagger 文档 (`/api/docs`) 或 `docs/` 目录。

## 开发指南

### 代码规范

```bash
npm run lint        # 检查并修复
npm run typecheck   # TypeScript 类型检查
npm run test        # 运行测试
```

### 数据库变更

1. 修改 `server/src/db/schema/` 下的 schema 文件
2. 运行 `npm run db:generate` 生成迁移
3. 运行 `npm run db:apply` 执行迁移

### 新增模块

1. 在 `server/src/modules/` 创建模块目录
2. 实现 Service / Controller / Module
3. 在 `app.module.ts` 注册
4. 在 `client/src/views/` 创建对应页面
5. 在 `client/src/router/index.ts` 添加路由

## 参考项目

- [Grocy](https://github.com/grocy/grocy) — PHP 家庭库存管理
- [HomeBox](https://github.com/hay-kot/homebox) — Go + Vue3 资产管理
- [Yuvomi](https://github.com/yuvomi/yuvomi) — Web Components + Liquid Glass UI

## License

MIT
