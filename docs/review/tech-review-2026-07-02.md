# HomeHub 技术评审报告 & 团队技术提升指导手册

> **评审日期**: 2026-07-02  
> **评审人**: 寇豆码（Kou）· 资深工程师  
> **项目**: HomeHub — 现代化家庭库存管理系统  
> **技术栈**: NestJS + Drizzle ORM + Vue 3 + Naive UI + Pinia

---

## 一、整体代码质量评分

| 维度 | 评分 (满分100) | 评价 |
|------|:---:|------|
| **类型安全性** | 40 | 大量 `any` 类型滥用，Drizzle 推断类型未利用，前端类型覆盖极差 |
| **代码复用性** | 55 | update 方法 15 个 if 语句暴露缺乏抽象能力，前端直接 fetch 绕过封装层 |
| **错误处理** | 35 | consume 静默截断、前端 console.error 无用户提示、缺少统一异常层 |
| **安全性** | 45 | Token 存储 localStorage、refresh 用 accessToken Guard、LIKE 拼接争议 |
| **性能** | 50 | 无分页机制、无加载状态、列表全量返回，大数据量下必然崩溃 |
| **架构合理性** | 60 | 模块划分尚可，但事务缺失、跨层调用混乱、职责边界不清 |
| **综合评分** | **47** | ⚠️ 低于生产可交付标准，需系统性重构后方可上线 |

---

## 二、关键问题清单

### P0 — 必须修复（数据安全风险或严重 Bug）

#### P0-1: 数据操作缺少事务保护 — 非原子写入导致数据不一致

**问题描述**: `StockService.create` 和 `StockService.consume` 中，主表写入（items）与日志表写入（stockTransactions）分两步执行，不在同一事务中。若第二条语句失败，将出现"物品已入库但没有交易记录"或"数量已扣减但没有消费日志"的数据不一致。

**错误代码**:
```typescript
async create(familyId: number, dto: CreateItemDto, userId: number) {
  const result = await this.db.insert(items).values({ ... }).returning().get();
  // ⚠️ 如果下面这条 insert 失败，上面的 items 记录已经入库了，但交易记录丢失
  await this.db.insert(stockTransactions).values({ ... });
  return result;
}

async consume(itemId: number, familyId: number, userId: number, dto: ConsumeItemDto) {
  const newQty = Math.max(0, item.quantity - dto.quantity);
  await this.db.update(items).set({ quantity: newQty, updatedAt: new Date() })
    .where(eq(items.id, itemId)).run();
  // ⚠️ 同理：数量已扣，但交易记录可能丢失
  await this.db.insert(stockTransactions).values({ ... });
}
```

**正确代码**（Drizzle ORM Transaction 写法）:
```typescript
import { eq, and } from 'drizzle-orm';

async create(familyId: number, dto: CreateItemDto, userId: number) {
  return await this.db.transaction(async (tx) => {
    // Step 1: 插入物品
    const [result] = await tx.insert(items).values({
      familyId,
      name: dto.name,
      type: dto.type,
      quantity: dto.quantity,
      unitId: dto.unitId,
      locationId: dto.locationId,
      expiryDate: dto.expiryDate ? new Date(dto.expiryDate) : null,
      purchaseDate: dto.purchaseDate ? new Date(dto.purchaseDate) : null,
      price: dto.price ?? null,
      createdBy: userId,
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning();

    // Step 2: 写入交易记录 — 在同一事务中，任何一步失败都会整体回滚
    await tx.insert(stockTransactions).values({
      itemId: result.id,
      familyId,
      userId,
      type: 'IN',
      quantity: dto.quantity,
      note: dto.note ?? '初始入库',
      createdAt: new Date(),
    });

    return result;
  });
}

async consume(itemId: number, familyId: number, userId: number, dto: ConsumeItemDto) {
  return await this.db.transaction(async (tx) => {
    // Step 1: 查询当前库存（事务内读取，防止并发竞态）
    const item = await tx.select().from(items)
      .where(and(eq(items.id, itemId), eq(items.familyId, familyId)))
      .get();

    if (!item) {
      throw new NotFoundException('物品不存在');
    }

    if (item.quantity < dto.quantity) {
      throw new BadRequestException(
        `库存不足：当前 ${item.quantity}，请求消费 ${dto.quantity}`
      );
    }

    const newQty = item.quantity - dto.quantity;

    // Step 2: 更新库存
    await tx.update(items).set({
      quantity: newQty,
      updatedAt: new Date(),
    }).where(eq(items.id, itemId));

    // Step 3: 写入消费记录
    await tx.insert(stockTransactions).values({
      itemId,
      familyId,
      userId,
      type: 'OUT',
      quantity: dto.quantity,
      note: dto.note ?? `消费 ${dto.quantity}`,
      createdAt: new Date(),
    });

    return { ...item, quantity: newQty };
  });
}
```

**关键知识点**: `db.transaction()` 会自动处理 commit/rollback — 回调函数正常返回时 commit，抛出异常时 rollback。这是保障数据一致性的核心机制。

---

#### P0-2: consume 静默截断库存至 0 — 应抛出 BadRequestException

**问题描述**: 当请求消费数量超过实际库存时，`Math.max(0, item.quantity - dto.quantity)` 会静默将库存截断为 0，而非提示"库存不足"。这导致用户以为消费了 5 件，实际只有 3 件，但系统没告诉他。

**错误代码**:
```typescript
const newQty = Math.max(0, item.quantity - dto.quantity);
```

**正确代码**:
```typescript
if (item.quantity < dto.quantity) {
  throw new BadRequestException(
    `库存不足：当前库存 ${item.quantity}${item.unit ?? '件'}，无法消费 ${dto.quantity}${item.unit ?? '件'}`
  );
}
const newQty = item.quantity - dto.quantity;
```

---

#### P0-3: Auth refresh 使用 AccessTokenGuard — 导致 15 分钟后无法刷新

**问题描述**: `/auth/refresh` 端点使用了 `AuthGuard('jwt')`（即 AccessToken Guard），但 accessToken 有效期仅 15 分钟。过期后用户拿着过期 accessToken 来刷新，会被 Guard 拒绝，陷入死循环 — 永远无法刷新。

**错误代码**:
```typescript
@Post('refresh')
@UseGuards(AuthGuard('jwt'))  // ⚠️ 这是 accessToken 的 Guard
refresh(@Request() req: any) {
  return this.authService.refreshTokens(req.user.id, req.user.email, req.user.familyId);
}
```

**正确代码**:
```typescript
@Post('refresh')
@UseGuards(AuthGuard('jwt-refresh'))  // ✅ 使用 refreshToken 专用 Guard
refresh(@Request() req: any) {
  return this.authService.refreshTokens(req.user.sub, req.user.email, req.user.familyId);
}
```

需要在 NestJS 中配置 `jwt-refresh` Strategy:

```typescript
// server/src/modules/auth/strategies/jwt-refresh.strategy.ts
import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Request } from 'express';

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(Strategy, 'jwt-refresh') {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromBodyField('refreshToken'),
      passReqToCallback: true,
      secretOrKey: process.env.JWT_REFRESH_SECRET!,
    });
  }

  validate(req: Request, payload: any) {
    // refreshToken 从 request body 中提取，而非 header
    // payload 包含 sub (userId), email, familyId
    return {
      sub: payload.sub,
      email: payload.email,
      familyId: payload.familyId,
      refreshToken: req.body?.refreshToken,
    };
  }
}
```

---

#### P0-4: 前端 401 直接跳转登录页 — 未尝试 Token 静默刷新

**问题描述**: 当 API 返回 401 时，前端拦截器直接清除所有 token 并跳转登录页。但 401 可能是因为 accessToken 过期（正常现象），而 refreshToken 仍然有效。应该先尝试用 refreshToken 获取新的 accessToken，只有刷新也失败才跳转登录页。

**错误代码**:
```typescript
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);
```

**正确代码** — 完整的 Token 静默刷新机制:
```typescript
// client/src/api/client.ts

import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

const api = axios.create({
  baseURL: '/api/v1',
  timeout: 10000,
});

// 是否正在刷新 token 的标志，防止多个请求并发刷新
let isRefreshing = false;
// 等待刷新完成的请求队列
let pendingRequests: Array<{
  resolve: (token: string) => void;
  reject: (error: any) => void;
}> = [];

function onRefreshed(newToken: string) {
  pendingRequests.forEach(({ resolve }) => resolve(newToken));
  pendingRequests = [];
}

function onRefreshFailed(error: any) {
  pendingRequests.forEach(({ reject }) => reject(error));
  pendingRequests = [];
}

// 请求拦截器：自动附加 accessToken
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = localStorage.getItem('accessToken');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 响应拦截器：401 时静默刷新
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // 非 401 错误直接抛出
    if (error.response?.status !== 401) {
      return Promise.reject(error);
    }

    // 已经重试过一次，说明 refreshToken 也过期了，跳转登录
    if (originalRequest._retry) {
      clearAuthAndRedirect();
      return Promise.reject(error);
    }

    // 没有 refreshToken，直接跳转
    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) {
      clearAuthAndRedirect();
      return Promise.reject(error);
    }

    // 标记已重试
    originalRequest._retry = true;

    // 如果已经在刷新中，排队等待
    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        pendingRequests.push({
          resolve: (token: string) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            resolve(api(originalRequest));
          },
          reject,
        });
      });
    }

    // 开始刷新
    isRefreshing = true;

    try {
      const { data } = await axios.post('/api/v1/auth/refresh', { refreshToken });
      const newAccessToken = data.accessToken;
      const newRefreshToken = data.refreshToken;

      localStorage.setItem('accessToken', newAccessToken);
      localStorage.setItem('refreshToken', newRefreshToken);

      // 通知所有排队请求用新 token 重试
      onRefreshed(newAccessToken);

      // 用新 token 重试原始请求
      originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
      return api(originalRequest);
    } catch (refreshError) {
      // 刷新失败，清除认证并跳转
      onRefreshFailed(refreshError);
      clearAuthAndRedirect();
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  }
);

function clearAuthAndRedirect() {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  window.location.href = '/login';
}

export default api;
```

---

### P1 — 应该修复（影响可维护性和代码质量）

#### P1-1: update 方法 15 个 if 语句 — 缺乏抽象能力

**问题描述**: `StockService.update` 用 15 个 `if (dto.xxx) updates.xxx = dto.xxx` 逐字段赋值，代码冗余且难以维护。新增字段时必须手动添加 if 语句，违反开闭原则。

**错误代码**:
```typescript
async update(itemId: number, familyId: number, dto: UpdateItemDto) {
  const updates: Record<string, any> = { updatedAt: new Date() };
  if (dto.name) updates.name = dto.name;
  if (dto.type) updates.type = dto.type;
  if (dto.quantity) updates.quantity = dto.quantity;
  if (dto.unitId) updates.unitId = dto.unitId;
  if (dto.locationId) updates.locationId = dto.locationId;
  if (dto.expiryDate) updates.expiryDate = new Date(dto.expiryDate);
  if (dto.purchaseDate) updates.purchaseDate = new Date(dto.purchaseDate);
  if (dto.price) updates.price = dto.price;
  // ... 还有 7 个字段
  await this.db.update(items).set(updates).where(eq(items.id, itemId)).run();
}
```

**正确代码** — 使用对象展开 + 类型工具:
```typescript
import { NewItem } from '../schema';  // Drizzle 推断的插入类型

async update(itemId: number, familyId: number, dto: UpdateItemDto) {
  // 过滤掉 undefined 值，只保留用户实际提交的字段
  const filteredDto = Object.fromEntries(
    Object.entries(dto).filter(([_, value]) => value !== undefined)
  );

  // 处理日期字段：字符串 → Date 对象
  const dateFields = ['expiryDate', 'purchaseDate'] as const;
  const processedUpdates = { ...filteredDto };
  for (const field of dateFields) {
    if (field in processedUpdates && processedUpdates[field]) {
      processedUpdates[field] = new Date(processedUpdates[field] as string);
    }
  }

  // 合并 updatedAt，最终生成更新对象
  const updates = {
    ...processedUpdates,
    updatedAt: new Date(),
  };

  const result = await this.db.update(items)
    .set(updates)
    .where(and(eq(items.id, itemId), eq(items.familyId, familyId)))
    .returning()
    .get();

  if (!result) {
    throw new NotFoundException('物品不存在');
  }

  return result;
}
```

**关键知识点**: `Object.fromEntries(Object.entries(obj).filter(...))` 是 TypeScript 中过滤 undefined 值的标准模式。配合 Drizzle 的类型推断，更新对象会自动获得正确的类型约束。

---

#### P1-2: 前端绕过封装层直接 fetch — 破坏统一 API 调用模式

**问题描述**: `StockList.vue` 中直接用 `fetch('/api/v1/categories', ...)` 调用 API，绕过了项目封装的 `api` 客户端（axios instance），导致：
1. Token 注入逻辑被绕过
2. 401 静默刷新机制失效
3. 错误处理不统一

**错误代码**:
```typescript
const catRes = await fetch('/api/v1/categories', {
  headers: { 'Authorization': `Bearer ${localStorage.getItem('accessToken')}` }
}).then(r => r.json());
```

**正确代码**:
```typescript
// client/src/api/stock.ts — 统一的 API 调用层
import api from './client';

export const stockApi = {
  getCategories: (familyId: number) =>
    api.get<Category[]>('/categories', { params: { familyId } }),
  getLocations: (familyId: number) =>
    api.get<Location[]>('/locations', { params: { familyId } }),
  getUnits: () =>
    api.get<Unit[]>('/units'),
};

// client/src/views/stock/StockList.vue
import { stockApi } from '@/api/stock';

const categories = ref<Category[]>([]);
const locations = ref<Location[]>([]);
const loading = ref(true);
const error = ref<string | null>(null);

onMounted(async () => {
  loading.value = true;
  try {
    const [catRes, locRes, unitRes] = await Promise.all([
      stockApi.getCategories(currentFamilyId.value),
      stockApi.getLocations(currentFamilyId.value),
      stockApi.getUnits(),
    ]);
    categories.value = catRes.data;
    locations.value = locRes.data;
    units.value = unitRes.data;
  } catch (e) {
    error.value = '加载分类/位置数据失败，请稍后重试';
    // 使用 Naive UI 的 message 组件提示用户
    message.error(error.value);
  } finally {
    loading.value = false;
  }
});
```

---

#### P1-3: trigger.service.ts handleScan 无错误边界 — 未处理无绑定场景

**问题描述**: `handleScan` 在 `binding` 为 null 时仍写入 scanLogs 并返回 `action: 'unknown'`，但整个方法没有对"无绑定 + 无默认动作"的情况做显式处理，也没有考虑数据库写入失败的情况。

**错误代码**:
```typescript
async handleScan(familyId: number, userId: number, dto: ScanEventDto) {
  const binding = await this.lookupBinding(dto.code, dto.codeType);
  let action = 'unknown';
  if (binding) {
    await this.db.update(triggerBindings).set({ ... });
    action = this.resolveAction(binding.targetType, dto.codeType);
    result = binding;
  }
  await this.db.insert(scanLogs).values({ ... });
  return { binding, action, result, page: this.getTargetPage(binding) };
}
```

**正确代码**:
```typescript
type ScanAction = 'add_item' | 'consume' | 'view_detail' | 'unknown';

interface ScanResult {
  binding: TriggerBinding | null;
  action: ScanAction;
  result: TriggerBinding | null;
  page: string | null;
  message?: string;
}

async handleScan(familyId: number, userId: number, dto: ScanEventDto): Promise<ScanResult> {
  const binding = await this.lookupBinding(dto.code, dto.codeType);

  // 无绑定的场景 — 返回明确的状态和建议
  if (!binding) {
    // 写入扫描日志（记录未绑定事件有助于后续分析）
    await this.db.insert(scanLogs).values({
      familyId,
      userId,
      code: dto.code,
      codeType: dto.codeType,
      action: 'unknown',
      bindingId: null,
      createdAt: new Date(),
    });

    return {
      binding: null,
      action: 'unknown',
      result: null,
      page: `/stock/add?code=${dto.code}&codeType=${dto.codeType}`,
      message: `标签 ${dto.code} 尚未绑定物品，您可以前往添加新物品`,
    };
  }

  // 有绑定 — 正常处理
  return await this.db.transaction(async (tx) => {
    await tx.update(triggerBindings).set({
      lastScanAt: new Date(),
      scanCount: binding.scanCount + 1,
    }).where(eq(triggerBindings.id, binding.id));

    const action = this.resolveAction(binding.targetType, dto.codeType);

    await tx.insert(scanLogs).values({
      familyId,
      userId,
      code: dto.code,
      codeType: dto.codeType,
      action,
      bindingId: binding.id,
      createdAt: new Date(),
    });

    return {
      binding,
      action,
      result: binding,
      page: this.getTargetPage(binding),
    };
  });
}
```

---

#### P1-4: 前端缺少 loading/error 状态处理 — 用户体验极差

**问题描述**: `StockList.vue` 中没有 loading 状态，用户在数据加载期间看到空白页面；错误只 `console.error` 而不提示用户，用户完全不知道发生了什么。

**正确模式** — Vue 3 组合式 API 数据加载最佳实践:
```typescript
// client/src/composables/useAsyncData.ts — 可复用的异步数据加载 Hook
import { ref, type Ref } from 'vue';
import { useMessage } from 'naive-ui';

interface AsyncDataState<T> {
  data: Ref<T>;
  loading: Ref<boolean>;
  error: Ref<string | null>;
  refresh: () => Promise<void>;
}

export function useAsyncData<T>(
  fetcher: () => Promise<T>,
  initialValue: T,
  options?: { immediate?: boolean; errorMessage?: string }
): AsyncDataState<T> {
  const data = ref<T>(initialValue) as Ref<T>;
  const loading = ref(false);
  const error = ref<string | null>(null);
  const message = useMessage();

  const refresh = async () => {
    loading.value = true;
    error.value = null;
    try {
      data.value = await fetcher();
    } catch (e) {
      error.value = options?.errorMessage ?? '数据加载失败，请稍后重试';
      message.error(error.value);
    } finally {
      loading.value = false;
    }
  };

  if (options?.immediate) {
    refresh();
  }

  return { data, loading, error, refresh };
}

// 使用示例
const { data: categories, loading: catLoading, refresh: refreshCategories } = useAsyncData(
  () => stockApi.getCategories(currentFamilyId.value).then(r => r.data),
  [],
  { immediate: true, errorMessage: '加载分类数据失败' }
);
```

---

### P2 — 建议优化（最佳实践和性能提升）

#### P2-1: list/search 方法缺少分页 — 大数据量性能隐患

**优化方向**: 所有列表查询应支持 `cursor-based` 或 `offset-based` 分页。推荐 cursor-based（基于 ID 的游标分页），因为 SQLite/PostgreSQL 在 offset 较大时性能急剧下降。

```typescript
interface PaginationQuery {
  limit?: number;   // 默认 20
  cursor?: number;  // 上次返回的最后一个 item.id
}

async list(familyId: number, query?: ListQuery & PaginationQuery) {
  const limit = query?.limit ?? 20;
  const conditions = [eq(items.familyId, familyId)];

  if (query?.category) conditions.push(eq(items.type, query.category));
  if (query?.location) conditions.push(eq(items.locationId, parseInt(query.location)));
  if (query?.expiring) {
    const deadline = Date.now() + query.expiring * 86400000;
    conditions.push(sql`${items.expiryDate} <= ${deadline}`);
  }
  if (query?.cursor) {
    conditions.push(sql`${items.id} > ${query.cursor}`);
  }

  const results = await this.db.select().from(items)
    .where(and(...conditions))
    .orderBy(items.id)
    .limit(limit + 1)  // 多取一条判断是否有下一页
    .all();

  const hasNextPage = results.length > limit;
  const data = hasNextPage ? results.slice(0, limit) : results;
  const nextCursor = hasNextPage ? data[data.length - 1].id : null;

  return { data, nextCursor, hasNextPage };
}
```

#### P2-2: Token 存储方式 — localStorage vs httpOnly Cookie

**优化方向**: 当前 Token 存在 `localStorage`，容易被 XSS 攻击窃取。生产环境应使用 `httpOnly Cookie` 存储 refreshToken（前端 JS 无法读取），accessToken 可以继续用 localStorage（因为需要前端主动注入 header）或也用 Cookie。

**渐进式改进方案**（不要求一步到位，但需要规划）:
1. **短期**: 在 localStorage 的基础上，对 token 值做加密存储（至少不是明文）
2. **中期**: refreshToken 改为后端设置 httpOnly Cookie，accessToken 仍用 localStorage
3. **长期**: 全面迁移到 Cookie-based auth，前端无需手动处理 token

#### P2-3: LIKE 搜索参数化 — 确保无注入风险

**优化方向**: Drizzle ORM 的 `sql` 标签模板字面量会自动参数化，但写法 `sql\`${items.name} LIKE ${'%' + query + '%'}\`` 虽然参数化安全，仍不够清晰。推荐使用 Drizzle 的 `like` 操作符:

```typescript
import { like } from 'drizzle-orm';

async search(familyId: number, query: string) {
  // ✅ 使用 drizzle 内置 like 操作符，语义更清晰且自动参数化
  return this.db.select().from(items)
    .where(and(
      eq(items.familyId, familyId),
      like(items.name, `%${query}%`)
    ))
    .limit(50)  // 搜索结果必须限制上限
    .all();
}
```

---

## 三、技术知识点深度讲解

### 知识点 1: 数据库事务（Transaction）

#### 为什么需要事务？

事务是数据库操作的"保险机制"。想象你在银行转账：

```
Step 1: 从 A 账户扣减 100 元    → 成功 ✓
Step 2: 给 B 账户增加 100 元    → 失败 ✗（网络抖动）
```

如果没有事务：A 少了 100，B 没收到，100 元凭空消失了。  
如果有事务：Step 2 失败 → 自动回滚 Step 1 → A 和 B 都回到原始状态。

**HomeHub 的场景同理**: 创建物品（Step 1）+ 写交易日志（Step 2）— 必须保证要么都成功，要么都不发生。

#### 事务的 ACID 四性

| 性质 | 含义 | HomeHub 中的体现 |
|------|------|------|
| **Atomicity**（原子性） | 全成功或全失败 | 创建物品 + 日志必须同时成功 |
| **Consistency**（一致性） | 数据始终合法 | 库存数量 ≥ 0，不能出现负数 |
| **Isolation**（隔离性） | 并发操作互不干扰 | 两人同时消费同一物品，数量正确扣减 |
| **Durability**（持久性） | 成功后数据不丢 | 事务 commit 后即使断电也不丢数据 |

#### Drizzle ORM 中的事务写法

```typescript
// Drizzle 的事务 API
await db.transaction(async (tx) => {
  // 所有操作使用 tx 而不是 db
  const [item] = await tx.insert(items).values({ ... }).returning();
  await tx.insert(stockTransactions).values({ itemId: item.id, ... });
  await tx.update(locations).set({ itemCount: sql`${locations.itemCount} + 1` })
    .where(eq(locations.id, item.locationId));
  
  // 函数正常返回 → 自动 commit
  // 函数抛出异常 → 自动 rollback
});
```

**关键细节**:
1. **事务内必须用 `tx`** — 用 `db` 会脱离事务范围
2. **自动回滚** — 抛出任何异常（包括 NestJS 的 `NotFoundException`、`BadRequestException`）都会触发回滚
3. **SQLite 的限制** — SQLite 事务中不能有嵌套的写事务（但可以有读操作）
4. **PostgreSQL 无此限制** — 支持嵌套事务（savepoint）

#### 常见反模式

| 反模式 | 问题描述 | 正确做法 |
|--------|---------|---------|
| 分步写入 | `await db.insert(); await db.insert();` | 包在 `db.transaction()` 中 |
| 事务内用 db | `db.transaction(async (tx) => { await db.insert(); })` | 事务内用 `tx` |
| 忽略并发读 | 读取 → 计算 → 写入，中间可能被别人改了 | 事务内读取 + 写入，利用行级锁 |
| 事务过长 | 一个事务包含 10 个操作 | 拆分事务，每个只包含逻辑上不可分割的操作 |

---

### 知识点 2: JWT 双 Token 机制

#### 为什么需要双 Token？

| Token 类型 | 有效期 | 存储位置 | 用途 |
|-----------|--------|---------|------|
| **accessToken** | 15 分钟 | localStorage 或内存 | 每次请求的身份凭证 |
| **refreshToken** | 7 天 | httpOnly Cookie 或 localStorage | 获取新 accessToken |

**核心思想**: accessToken 短期有效（安全），refreshToken 长期有效（便利）。accessToken 过期后用 refreshToken 静默获取新的 accessToken，用户无感知。

#### 完整流程图

```
┌─────────────────────────────────────────────────────┐
│                    正常请求流程                        │
│                                                       │
│  1. 用户请求 API → Header: Authorization: Bearer AT  │
│  2. accessToken 有效 → 正常返回数据                    │
│  3. accessToken 过期 → 401 响应                        │
│  4. 前端拦截器捕获 401 → 用 refreshToken 调 /refresh  │
│  5. refreshToken 有效 → 返回新 accessToken + 新 RT    │
│  6. 前端用新 accessToken 重试原请求                    │
│  7. refreshToken 也过期 → 清除认证 → 跳转登录页       │
└─────────────────────────────────────────────────────┘
```

#### 常见错误和纠正

| 错误做法 | 问题 | 正确做法 |
|---------|------|---------|
| `/refresh` 用 AccessTokenGuard | accessToken 15分钟过期后无法刷新 | 用 RefreshTokenGuard |
| 401 直接跳登录页 | refreshToken 可能还有效 | 先尝试刷新，失败才跳转 |
| 多请求并发刷新 | 发出 5 个刷新请求，可能拿到不同 token | 用队列锁，只刷新一次 |
| refreshToken 不会轮换 | 被窃取的 RT 永久有效 | 每次刷新时返回新 RT，旧 RT 失效 |

---

### 知识点 3: TypeScript 类型安全 — 消灭 `any`

#### `any` 是 TypeScript 的"逃生舱"，不是日常工具

```typescript
// ❌ any — 关掉了 TypeScript 的所有保护
const db: any = ...;  // 调任何方法都不会报错，运行时才知道炸了

// ✅ 使用 Drizzle 的推断类型
import { items, stockTransactions } from '../schema';
type Item = typeof items.$inferSelect;      // 查询返回的行类型
type NewItem = typeof items.$inferInsert;   // 插入所需的值类型
type ItemUpdate = Partial<NewItem>;         // 更新字段（部分可选）

// ✅ 在 Service 中使用
@Injectable()
export class StockService {
  constructor(
    @Inject('DATABASE_CONNECTION')
    private readonly db: BetterSQLite3Database<typeof schema>,  // ✅ 明确类型
  ) {}

  async list(familyId: number, query?: ListQuery): Promise<Item[]> {
    // ✅ 返回类型明确，调用方知道拿到的是 Item[] 而不是 any[]
  }
}
```

#### Drizzle 推断类型的完整用法

```typescript
// schema.ts — 定义表结构
import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';

export const items = sqliteTable('items', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  familyId: integer('family_id').notNull(),
  name: text('name').notNull(),
  type: text('type').notNull(),
  quantity: integer('quantity').notNull().default(0),
  locationId: integer('location_id').references(() => locations.id),
  expiryDate: integer('expiry_date', { mode: 'timestamp' }),
  purchaseDate: integer('purchase_date', { mode: 'timestamp' }),
  price: real('price'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
});

// 推断类型
export type Item = typeof items.$inferSelect;
export type NewItem = typeof items.$inferInsert;

// 在 Service 中
import type { Item, NewItem } from '../schema';

async create(familyId: number, dto: CreateItemDto, userId: number): Promise<Item> {
  // ✅ 返回值类型是 Item，不是 any
}

async list(familyId: number, query?: ListQuery): Promise<Item[]> {
  // ✅ 返回值类型是 Item[]，不是 any[]
}
```

#### 前端类型定义

```typescript
// client/src/types/stock.ts
// 后端和前端共享的类型定义（或从 API 响应推断）

export interface Item {
  id: number;
  familyId: number;
  name: string;
  type: string;
  quantity: number;
  locationId: number | null;
  expiryDate: string | null;   // JSON 传输时日期是字符串
  purchaseDate: string | null;
  price: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  id: number;
  familyId: number;
  name: string;
  icon: string | null;
}

export interface Location {
  id: number;
  familyId: number;
  name: string;
  icon: string | null;
}

// ❌ 前端当前写法
const categories = ref<any[]>([]);       // any[] — 完全没有类型约束

// ✅ 正确写法
const categories = ref<Category[]>([]);  // 明确类型，IDE 能提示字段名
```

---

### 知识点 4: Vue 3 组合式 API 最佳实践

#### 数据加载模式 — 永远要有 loading/error/data 三态

```vue
<template>
  <!-- ✅ 正确的三态处理 -->
  <n-spin v-if="loading" description="加载中..." />
  <n-result v-else-if="error" status="error" :title="error" description="请稍后重试">
    <template #footer>
      <n-button @click="refresh">重新加载</n-button>
    </template>
  </n-result>
  <div v-else>
    <!-- 正常数据展示 -->
    <n-data-table :data="items" :columns="columns" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useMessage } from 'naive-ui';
import { stockApi } from '@/api/stock';
import type { Item, Category, Location } from '@/types/stock';

const items = ref<Item[]>([]);
const categories = ref<Category[]>([]);
const locations = ref<Location[]>([]);
const loading = ref(true);
const error = ref<string | null>(null);
const message = useMessage();

async function refresh() {
  loading.value = true;
  error.value = null;
  try {
    const [itemsRes, catRes, locRes] = await Promise.all([
      stockStore.fetchItems(),
      stockApi.getCategories(currentFamilyId.value),
      stockApi.getLocations(currentFamilyId.value),
    ]);
    categories.value = catRes.data;
    locations.value = locRes.data;
  } catch (e) {
    error.value = '加载失败，请稍后重试';
    message.error(error.value);
  } finally {
    loading.value = false;
  }
}

onMounted(() => refresh());
</script>
```

#### 不要在 onMounted 中忽略 await

```typescript
// ❌ 错误 — 没有 await，错误被静默吞噬
onMounted(async () => {
  stockStore.fetchItems();  // Promise 未 await！
});

// ✅ 正确 — await + try/catch
onMounted(async () => {
  try {
    await stockStore.fetchItems();
  } catch (e) {
    message.error('加载物品列表失败');
  }
});
```

#### Pinia Store 的正确写法

```typescript
// client/src/stores/stock.store.ts
import { defineStore } from 'pinia';
import { stockApi } from '@/api/stock';
import type { Item } from '@/types/stock';

export const useStockStore = defineStore('stock', () => {
  const items = ref<Item[]>([]);        // ✅ 明确类型，不是 any[]
  const loading = ref(false);
  const error = ref<string | null>(null);

  async function fetchItems(familyId: number) {
    loading.value = true;
    error.value = null;
    try {
      const { data } = await stockApi.list(familyId);
      items.value = data;
    } catch (e) {
      error.value = '加载物品列表失败';
      throw e;  // ✅ 抛出错误，让调用方也能处理
    } finally {
      loading.value = false;
    }
  }

  return { items, loading, error, fetchItems };
});
```

---

### 知识点 5: NestJS 最佳实践 — Service 层设计

#### 用 Partial + 对象展开代替手动 if 语句

**核心原则**: 更新操作的本质是"把 DTO 中有值的字段覆盖到目标记录上"。不需要逐字段检查。

```typescript
// ❌ 手动模式 — 15 个 if 语句，新增字段必须加新 if
if (dto.name) updates.name = dto.name;
if (dto.type) updates.type = dto.type;
// ... 还要写 13 个

// ✅ 自动模式 — 利用 TypeScript 类型系统
type UpdateFields = Partial<Omit<NewItem, 'id' | 'familyId' | 'createdAt'>>;

function buildUpdatePayload(dto: UpdateItemDto): UpdateFields {
  // 过滤 undefined（DTO 中未提交的字段）
  const entries = Object.entries(dto).filter(([_, v]) => v !== undefined);

  // 处理特殊类型转换（日期字符串 → Date）
  const payload: UpdateFields = {};
  for (const [key, value] of entries) {
    if (key === 'expiryDate' || key === 'purchaseDate') {
      payload[key] = value ? new Date(value as string) : null;
    } else {
      payload[key] = value as any;  // 这里 any 是安全的，因为 key 来自 DTO 类型
    }
  }

  return { ...payload, updatedAt: new Date() };
}
```

#### NestJS Controller 的正确 DTO 验证

```typescript
// ❌ 当前 — dto 可能包含任意字段，没有验证
@Post()
async create(@Body() dto: any) { ... }

// ✅ 正确 — 使用 class-validator + class-transformer
import { IsString, IsNumber, IsOptional, IsDateString, Min } from 'class-validator';

export class CreateItemDto {
  @IsString()
  name!: string;

  @IsString()
  type!: string;

  @IsNumber()
  @Min(0)
  quantity!: number;

  @IsOptional()
  @IsNumber()
  locationId?: number;

  @IsOptional()
  @IsDateString()
  expiryDate?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number;
}

// Controller
@Post()
async create(
  @Body() dto: CreateItemDto,  // ✅ 类型明确 + 自动验证
  @Request() req: any,
) {
  return this.stockService.create(req.user.familyId, dto, req.user.id);
}
```

#### 统一异常过滤器

```typescript
// server/src/common/filters/all-exceptions.filter.ts
import { Catch, ExceptionFilter, ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const message =
      exception instanceof HttpException
        ? exception.getResponse()
        : '内部服务器错误';

    response.status(status).json({
      statusCode: status,
      message: typeof message === 'string' ? message : (message as any).message ?? message,
      timestamp: new Date().toISOString(),
    });
  }
}

// 在 main.ts 中全局注册
app.useGlobalFilters(new AllExceptionsFilter());
```

---

## 四、具体代码改进示例（完整可运行版本）

### 4.1 StockService — 事务版本 + 类型安全 + 分页

```typescript
// server/src/modules/stock/stock.service.ts

import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { eq, and, like, sql } from 'drizzle-orm';
import { BetterSQLite3Database } from 'drizzle-orm/sqlite-core';
import * as schema from '../../schema';
import { items, stockTransactions } from '../../schema';

type Item = typeof items.$inferSelect;
type NewItem = typeof items.$inferInsert;

interface ListQuery {
  category?: string;
  location?: string;
  expiring?: number;
  limit?: number;
  cursor?: number;
}

interface PaginatedResult<T> {
  data: T[];
  nextCursor: number | null;
  hasNextPage: boolean;
}

@Injectable()
export class StockService {
  constructor(
    @Inject('DATABASE_CONNECTION')
    private readonly db: BetterSQLite3Database<typeof schema>,
  ) {}

  async list(familyId: number, query?: ListQuery): Promise<PaginatedResult<Item>> {
    const limit = Math.min(query?.limit ?? 20, 100);  // 上限 100
    const conditions = [eq(items.familyId, familyId)];

    if (query?.category) conditions.push(eq(items.type, query.category));
    if (query?.location) conditions.push(eq(items.locationId, parseInt(query.location)));
    if (query?.expiring) {
      const deadline = Date.now() + query.expiring * 86400000;
      conditions.push(sql`${items.expiryDate} <= ${deadline}`);
    }
    if (query?.cursor) {
      conditions.push(sql`${items.id} > ${query.cursor}`);
    }

    const results = await this.db.select().from(items)
      .where(and(...conditions))
      .orderBy(items.id)
      .limit(limit + 1)
      .all();

    const hasNextPage = results.length > limit;
    const data = hasNextPage ? results.slice(0, limit) : results;
    const nextCursor = hasNextPage ? data[data.length - 1].id : null;

    return { data, nextCursor, hasNextPage };
  }

  async getById(itemId: number, familyId: number): Promise<Item> {
    const item = await this.db.select().from(items)
      .where(and(eq(items.id, itemId), eq(items.familyId, familyId)))
      .get();

    if (!item) throw new NotFoundException('物品不存在');
    return item;
  }

  async create(familyId: number, dto: CreateItemDto, userId: number): Promise<Item> {
    return await this.db.transaction(async (tx) => {
      const [result] = await tx.insert(items).values({
        familyId,
        name: dto.name,
        type: dto.type,
        quantity: dto.quantity ?? 0,
        unitId: dto.unitId ?? null,
        locationId: dto.locationId ?? null,
        expiryDate: dto.expiryDate ? new Date(dto.expiryDate) : null,
        purchaseDate: dto.purchaseDate ? new Date(dto.purchaseDate) : null,
        price: dto.price ?? null,
        createdBy: userId,
        createdAt: new Date(),
        updatedAt: new Date(),
      }).returning();

      await tx.insert(stockTransactions).values({
        itemId: result.id,
        familyId,
        userId,
        type: 'IN',
        quantity: result.quantity,
        note: dto.note ?? '初始入库',
        createdAt: new Date(),
      });

      return result;
    });
  }

  async update(itemId: number, familyId: number, dto: UpdateItemDto): Promise<Item> {
    // 过滤 undefined，自动构建更新字段
    const filteredEntries = Object.entries(dto).filter(([_, v]) => v !== undefined);
    const processedUpdates: Record<string, unknown> = {};

    for (const [key, value] of filteredEntries) {
      if (key === 'expiryDate' || key === 'purchaseDate') {
        processedUpdates[key] = value ? new Date(value as string) : null;
      } else {
        processedUpdates[key] = value;
      }
    }

    const updates = { ...processedUpdates, updatedAt: new Date() };

    const result = await this.db.update(items)
      .set(updates as Partial<NewItem>)
      .where(and(eq(items.id, itemId), eq(items.familyId, familyId)))
      .returning()
      .get();

    if (!result) throw new NotFoundException('物品不存在');
    return result;
  }

  async consume(
    itemId: number,
    familyId: number,
    userId: number,
    dto: ConsumeItemDto,
  ): Promise<Item> {
    return await this.db.transaction(async (tx) => {
      const item = await tx.select().from(items)
        .where(and(eq(items.id, itemId), eq(items.familyId, familyId)))
        .get();

      if (!item) throw new NotFoundException('物品不存在');
      if (item.quantity < dto.quantity) {
        throw new BadRequestException(
          `库存不足：当前 ${item.quantity}，无法消费 ${dto.quantity}`
        );
      }

      const newQty = item.quantity - dto.quantity;

      await tx.update(items).set({
        quantity: newQty,
        updatedAt: new Date(),
      }).where(eq(items.id, itemId));

      await tx.insert(stockTransactions).values({
        itemId,
        familyId,
        userId,
        type: 'OUT',
        quantity: dto.quantity,
        note: dto.note ?? `消费 ${dto.quantity}`,
        createdAt: new Date(),
      });

      return { ...item, quantity: newQty };
    });
  }

  async search(familyId: number, query: string): Promise<Item[]> {
    return this.db.select().from(items)
      .where(and(eq(items.familyId, familyId), like(items.name, `%${query}%`)))
      .limit(50)
      .all();
  }
}
```

### 4.2 Auth Module — 完整双 Token 实现

```typescript
// server/src/modules/auth/auth.service.ts

import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

interface JwtPayload {
  sub: number;      // userId
  email: string;
  familyId: number;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly usersService: UsersService,
  ) {}

  async login(email: string, password: string): Promise<TokenPair & { user: User }> {
    const user = await this.usersService.findByEmail(email);
    if (!user) throw new UnauthorizedException('用户不存在');

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) throw new UnauthorizedException('密码错误');

    const tokens = await this.generateTokenPair({
      sub: user.id,
      email: user.email,
      familyId: user.familyId,
    });

    // 存储 refreshToken 的哈希值（用于验证和轮换）
    await this.usersService.saveRefreshToken(user.id, tokens.refreshToken);

    return { ...tokens, user };
  }

  async refreshTokens(userId: number, email: string, familyId: number, oldRefreshToken: string): Promise<TokenPair> {
    // 验证 refreshToken 是否有效（且属于该用户）
    const isValid = await this.usersService.verifyRefreshToken(userId, oldRefreshToken);
    if (!isValid) throw new UnauthorizedException('Refresh token 无效或已过期');

    // ✅ Token 轮换：每次刷新都生成全新的 refreshToken，旧的立即失效
    const tokens = await this.generateTokenPair({
      sub: userId,
      email,
      familyId,
    });

    // 更新存储的 refreshToken（旧的被替换）
    await this.usersService.saveRefreshToken(userId, tokens.refreshToken);

    return tokens;
  }

  private async generateTokenPair(payload: JwtPayload): Promise<TokenPair> {
    const accessToken = await this.jwtService.signAsync(payload, {
      expiresIn: '15m',
      secret: process.env.JWT_ACCESS_SECRET,
    });

    const refreshToken = await this.jwtService.signAsync(payload, {
      expiresIn: '7d',
      secret: process.env.JWT_REFRESH_SECRET,
    });

    return { accessToken, refreshToken };
  }
}

// server/src/modules/auth/auth.controller.ts

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  async login(@Body() dto: LoginDto): Promise<TokenPair & { user: User }> {
    return this.authService.login(dto.email, dto.password);
  }

  @Post('refresh')
  @UseGuards(AuthGuard('jwt-refresh'))  // ✅ 使用 refreshToken 专用 Guard
  async refresh(@Request() req: any): Promise<TokenPair> {
    return this.authService.refreshTokens(
      req.user.sub,         // ✅ jwt-refresh Strategy 从 refreshToken 中提取
      req.user.email,
      req.user.familyId,
      req.user.refreshToken, // ✅ 原 refreshToken 用于验证和轮换
    );
  }

  @Post('logout')
  @UseGuards(AuthGuard('jwt'))
  async logout(@Request() req: any): Promise<{ message: string }> {
    await this.authService.logout(req.user.sub);
    return { message: '已成功退出登录' };
  }
}
```

### 4.3 前端 API Client — Token 静默刷新完整版

（见 P0-4 中的完整代码示例）

### 4.4 前端类型定义 + Store 重写

```typescript
// client/src/types/stock.ts

export interface Item {
  id: number;
  familyId: number;
  name: string;
  type: string;
  quantity: number;
  unitId: number | null;
  locationId: number | null;
  expiryDate: string | null;
  purchaseDate: string | null;
  price: number | null;
  createdBy: number;
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  id: number;
  familyId: number;
  name: string;
  icon: string | null;
  type: string;
}

export interface Location {
  id: number;
  familyId: number;
  name: string;
  icon: string | null;
}

export interface Unit {
  id: number;
  name: string;
  symbol: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  nextCursor: number | null;
  hasNextPage: boolean;
}

// client/src/stores/stock.store.ts

import { defineStore } from 'pinia';
import { ref } from 'vue';
import { stockApi } from '@/api/stock';
import type { Item, PaginatedResponse } from '@/types/stock';

export const useStockStore = defineStore('stock', () => {
  const items = ref<Item[]>([]);          // ✅ 明确类型
  const loading = ref(false);
  const error = ref<string | null>(null);
  const nextCursor = ref<number | null>(null);

  async function fetchItems(familyId: number, query?: Record<string, string>) {
    loading.value = true;
    error.value = null;
    try {
      const { data } = await stockApi.list(familyId, query);
      items.value = data.data;
      nextCursor.value = data.nextCursor;
    } catch (e) {
      error.value = '加载物品列表失败';
      throw e;
    } finally {
      loading.value = false;
    }
  }

  async function loadMore(familyId: number, query?: Record<string, string>) {
    if (!nextCursor.value) return;
    try {
      const { data } = await stockApi.list(familyId, { ...query, cursor: nextCursor.value });
      items.value.push(...data.data);
      nextCursor.value = data.nextCursor;
    } catch (e) {
      error.value = '加载更多物品失败';
    }
  }

  function $reset() {
    items.value = [];
    loading.value = false;
    error.value = null;
    nextCursor.value = null;
  }

  return { items, loading, error, nextCursor, fetchItems, loadMore, $reset };
});

// client/src/stores/auth.store.ts — 改进版

import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { authApi } from '@/api/auth';
import type { User } from '@/types/auth';

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null);
  const accessToken = ref<string | null>(localStorage.getItem('accessToken'));
  const refreshToken = ref<string | null>(localStorage.getItem('refreshToken'));

  const isAuthenticated = computed(() => !!accessToken.value && !!user.value);

  async function login(email: string, password: string) {
    const { data } = await authApi.login({ email, password });
    user.value = data.user;
    accessToken.value = data.accessToken;
    refreshToken.value = data.refreshToken;

    localStorage.setItem('accessToken', data.accessToken);
    localStorage.setItem('refreshToken', data.refreshToken);
  }

  async function logout() {
    try {
      await authApi.logout();
    } catch {
      // logout API 失败不影响前端清除状态
    }
    user.value = null;
    accessToken.value = null;
    refreshToken.value = null;
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
  }

  function $reset() {
    user.value = null;
    accessToken.value = null;
    refreshToken.value = null;
  }

  return { user, accessToken, refreshToken, isAuthenticated, login, logout, $reset };
});
```

### 4.5 Vue 3 StockList 页面重写

```vue
<!-- client/src/views/stock/StockList.vue -->
<template>
  <div class="stock-list-page">
    <!-- 加载状态 -->
    <n-spin v-if="loading" description="加载物品列表..." />

    <!-- 错误状态 -->
    <n-result v-else-if="error" status="error" title="加载失败" :description="error">
      <template #footer>
        <n-button type="primary" @click="refresh">重新加载</n-button>
      </template>
    </n-result>

    <!-- 正常数据 -->
    <div v-else>
      <!-- 搜索 + 筛选栏 -->
      <n-space justify="space-between" align="center" class="mb-4">
        <n-h2>物品列表</n-h2>
        <n-space>
          <n-input v-model:value="searchQuery" placeholder="搜索物品..." clearable
            @update:value="handleSearch" />
          <n-select v-model:value="selectedCategory" :options="categoryOptions"
            placeholder="分类筛选" clearable @update:value="handleFilter" />
          <n-button type="primary" @click="showAddModal = true">添加物品</n-button>
        </n-space>
      </n-space>

      <!-- 数据表格 -->
      <n-data-table :columns="columns" :data="stockStore.items" :bordered="false" />

      <!-- 加载更多 -->
      <n-space justify="center" class="mt-4" v-if="stockStore.nextCursor">
        <n-button @click="loadMore" :loading="loadingMore">加载更多</n-button>
      </n-space>

      <!-- 空状态 -->
      <n-empty v-if="stockStore.items.length === 0 && !loading" description="暂无物品">
        <template #extra>
          <n-button type="primary" @click="showAddModal = true">添加第一个物品</n-button>
        </template>
      </n-empty>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useMessage } from 'naive-ui';
import { useStockStore } from '@/stores/stock.store';
import { stockApi } from '@/api/stock';
import type { Category, Location } from '@/types/stock';

const stockStore = useStockStore();
const message = useMessage();

const loading = ref(true);
const loadingMore = ref(false);
const error = ref<string | null>(null);
const searchQuery = ref('');
const selectedCategory = ref<string | null>(null);

const categories = ref<Category[]>([]);
const locations = ref<Location[]>([]);

const categoryOptions = computed(() =>
  categories.value.map(c => ({ label: c.name, value: c.type }))
);

async function refresh() {
  loading.value = true;
  error.value = null;
  try {
    await Promise.all([
      stockStore.fetchItems(currentFamilyId.value, {
        category: selectedCategory.value ?? undefined,
      }),
      loadMetadata(),
    ]);
  } catch (e) {
    error.value = '加载失败，请稍后重试';
    message.error(error.value);
  } finally {
    loading.value = false;
  }
}

async function loadMetadata() {
  const [catRes, locRes] = await Promise.all([
    stockApi.getCategories(currentFamilyId.value),
    stockApi.getLocations(currentFamilyId.value),
  ]);
  categories.value = catRes.data;
  locations.value = locRes.data;
}

async function loadMore() {
  loadingMore.value = true;
  try {
    await stockStore.loadMore(currentFamilyId.value, {
      category: selectedCategory.value ?? undefined,
    });
  } catch (e) {
    message.error('加载更多物品失败');
  } finally {
    loadingMore.value = false;
  }
}

function handleSearch(value: string) {
  stockStore.fetchItems(currentFamilyId.value, {
    category: selectedCategory.value ?? undefined,
  });
}

function handleFilter(value: string | null) {
  stockStore.fetchItems(currentFamilyId.value, {
    category: value ?? undefined,
  });
}

onMounted(() => refresh());
</script>
```

---

## 五、团队成长路径建议

### 本周重点攻克（Week 1）

| 优先级 | 技术点 | 预期成果 | 验收标准 |
|:---:|------|---------|---------|
| 🔴 1 | **数据库事务** | StockService 的 create/consume/update 全部改为事务版本 | 并发消费 + 中途异常不会出现数据不一致 |
| 🔴 2 | **JWT 双 Token + 前端静默刷新** | refresh 接口用 RefreshTokenGuard + 前端 401 拦截器自动刷新 | accessToken 过期后用户不会突然跳转登录页 |

### 下个月掌握的进阶技能（Month 1）

| 周次 | 技术点 | 预期成果 |
|------|------|---------|
| Week 2 | **TypeScript 类型安全** | 消灭所有 `any`，全面使用 Drizzle 推断类型 + 前端类型定义文件 |
| Week 3 | **Vue 3 数据加载模式** | 封装 `useAsyncData` composable，所有列表页实现 loading/error/data 三态 |
| Week 4 | **NestJS 架构优化** | 统一异常过滤器 + DTO class-validator + Service 层用 Partial 代替 if 语句 |

### 推荐学习资源

| 资源 | 主题 | 链接 |
|------|------|------|
| Drizzle ORM 官方文档 — Transactions | 数据库事务 | https://orm.drizzle.team/docs/transactions |
| Drizzle ORM — Type inference | 类型推断 | https://orm.drizzle.team/docs/goodies#type-api |
| NestJS — Authentication | JWT + Guards | https://docs.nestjs.com/security/authentication |
| Vue 3 — Composables | 组合式 API | https://vuejs.org/guide/reusability/composables.html |
| `class-validator` | DTO 验证 | https://github.com/typestack/class-validator |
| 「TypeScript 类型体操」入门 | 类型安全 | https://www.typescriptlang.org/docs/handbook/2/types-from-types.html |
| Axel Rauschmayer — «JavaScript for Impatient Programmers» | ES6+ 基础 | https://exploringjs.com/impatient-js/ |

---

## 附录：问题汇总速查表

| 编号 | 级别 | 问题 | 影响范围 | 修复难度 |
|------|:---:|------|---------|:---:|
| P0-1 | 🔴 | 数据操作缺少事务保护 | StockService 全部写操作 | 中 |
| P0-2 | 🔴 | consume 静默截断库存至 0 | 消费逻辑 | 低 |
| P0-3 | 🔴 | refresh 使用 AccessTokenGuard | 认证系统 | 中 |
| P0-4 | 🔴 | 前端 401 直接跳转不尝试刷新 | 全前端 | 中 |
| P1-1 | 🟡 | update 15 个 if 语句 | StockService.update | 低 |
| P1-2 | 🟡 | 前端绕过封装层直接 fetch | StockList.vue | 低 |
| P1-3 | 🟡 | trigger handleScan 无错误边界 | TriggerService | 中 |
| P1-4 | 🟡 | 前端缺少 loading/error 状态 | 全前端列表页 | 低 |
| P2-1 | 🟢 | list/search 无分页 | 所有列表 API | 中 |
| P2-2 | 🟢 | Token 存储 localStorage | 认证安全 | 高 |
| P2-3 | 🟢 | LIKE 拼接写法不够清晰 | StockService.search | 低 |

---

> **总结**: HomeHub 当前代码综合评分 **47/100**，低于生产可交付标准。核心问题集中在 **事务缺失**（数据一致性风险）和 **认证机制错误**（用户体验崩溃），建议本周优先修复 P0 级问题，下月系统性推进类型安全和架构优化。本报告中的所有代码示例均可直接参考实施，无需猜测写法。
