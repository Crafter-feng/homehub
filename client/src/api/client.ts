import axios from 'axios';
import { TokenStorage } from '@/utils/token-storage';
import type {
  Item,
  Product,
  Location,
  PaginationQuery,
} from '@/shared/types';

const api = axios.create({
  baseURL: '/api/v1',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ── 请求拦截器：添加 Token（加密读取） ──
api.interceptors.request.use((config) => {
  const token = TokenStorage.getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

function redirectToLogin(): void {
  if (window.location.pathname !== '/login') {
    TokenStorage.clearAll();
    window.location.href = '/login';
  }
}

// ── 响应拦截器：401 静默刷新（并发安全） ──
let isRefreshing = false;
let pendingRequests: Array<{
  resolve: (token: string) => void;
  reject: (error: unknown) => void;
}> = [];

function onRefreshed(newToken: string) {
  pendingRequests.forEach(({ resolve }) => resolve(newToken));
  pendingRequests = [];
}

function onRefreshFailed(error: unknown) {
  pendingRequests.forEach(({ reject }) => reject(error));
  pendingRequests = [];
}

api.interceptors.response.use(
  (response) => {
    // Unwrap TransformInterceptor response: {code, data, message} → data
    const responseData = response.data;
    if (responseData && typeof responseData === 'object' && 'code' in responseData && 'data' in responseData) {
      response.data = responseData.data;
    }
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // 非 401 错误或已经重试过，直接抛出
    if (error.response?.status !== 401 || originalRequest._retry) {
      return Promise.reject(error);
    }

    // 检查是否有 refreshToken
    const refreshToken = TokenStorage.getRefreshToken();
    if (!refreshToken) {
      redirectToLogin();
      return Promise.reject(error);
    }

    // 如果已经在刷新中，排队等待
    if (isRefreshing) {
      return new Promise<string>((resolve, reject) => {
        pendingRequests.push({ resolve, reject });
      }).then((newToken: string) => {
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return api(originalRequest);
      }).catch((err: unknown) => {
        return Promise.reject(err);
      });
    }

    // 开始刷新
    isRefreshing = true;
    originalRequest._retry = true;

    try {
      const { data: rawRefreshData } = await axios.post('/api/v1/auth/refresh', { refreshToken });

      // Unwrap TransformInterceptor response if wrapped
      const refreshData = rawRefreshData?.data || rawRefreshData;
      const newAccessToken: string = refreshData.accessToken;
      const newRefreshToken: string = refreshData.refreshToken;

      TokenStorage.setAccessToken(newAccessToken);
      if (newRefreshToken) {
        TokenStorage.setRefreshToken(newRefreshToken);
      }

      onRefreshed(newAccessToken);

      originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
      return api(originalRequest);
    } catch (refreshError) {
      onRefreshFailed(refreshError);
      redirectToLogin();
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  }
);

export default api;

// === Auth API ===
export const authApi = {
  register: (data: { name: string; email: string; password: string }) =>
    api.post('/auth/register', data),
  login: (data: { account: string; password: string }) =>
    api.post('/auth/login', data),
  me: () => api.get('/auth/me'),
  refresh: (refreshToken: string) => api.post('/auth/refresh', { refreshToken }),
  listTokens: () => api.get('/auth/tokens'),
  createToken: (data: { name: string; permissions?: string[]; expiresInDays?: number }) =>
    api.post('/auth/tokens', data),
  revokeToken: (id: number) => api.delete(`/auth/tokens/${id}`),
};

// === Products API ===
export const productsApi = {
  list: () => api.get('/products'),
  search: (q: string) => api.get('/products/search', { params: { q } }),
  getById: (id: number) => api.get(`/products/${id}`),
  create: (data: Partial<Product>) => api.post('/products', data),
  update: (id: number, data: Partial<Product>) => api.put(`/products/${id}`, data),
  delete: (id: number) => api.delete(`/products/${id}`),
};

// === Stock API ===
export const stockApi = {
  list: (params?: PaginationQuery & { category?: string; location?: string; expiring?: number }) =>
    api.get('/stock/items', { params }),
  getById: (id: number) => api.get(`/stock/items/${id}`),
  search: (query: string) => api.get('/stock/items/search', { params: { q: query } }),
  create: (data: Partial<Item>) => api.post('/stock/items', data),
  update: (id: number, data: Partial<Item>) => api.put(`/stock/items/${id}`, data),
  delete: (id: number) => api.delete(`/stock/items/${id}`),
  consume: (id: number, data: { quantity: number; note?: string; batchId?: number; spoiled?: number }) =>
    api.post(`/stock/items/${id}/consume`, data),
  stockIn: (id: number, data: { quantity: number; note?: string; price?: number; batchNumber?: string; expiryDate?: number; purchaseDate?: number; locationId?: number }) =>
    api.post(`/stock/items/${id}/stock-in`, data),
  transfer: (id: number, data: { toLocationId: number; quantity?: number }) =>
    api.post(`/stock/items/${id}/transfer`, data),
  adjust: (id: number, data: { quantity: number; note?: string }) =>
    api.post(`/stock/items/${id}/adjust`, data),
  getHistory: (id: number) => api.get(`/stock/items/${id}/history`),
  getExpiring: (days?: number) => api.get('/stock/expiring', { params: { days } }),
  getSummary: () => api.get('/stock/summary'),
  // Batch API
  listBatches: (itemId: number) => api.get(`/stock/items/${itemId}/batches`),
  getBatchSummary: (itemId: number) => api.get(`/stock/items/${itemId}/batches/summary`),
  updateBatch: (batchId: number, data: { batchNumber?: string; quantity?: number; expiryDate?: number; purchaseDate?: number; locationId?: number }) =>
    api.put(`/stock/items/batches/${batchId}`, data),
  deleteBatch: (batchId: number) => api.delete(`/stock/items/batches/${batchId}`),
  compactBatches: (itemId: number) => api.post(`/stock/items/${itemId}/batches/compact`),
  // CSV
  exportCsv: () => api.get('/stock/export', { responseType: 'blob' }),
  importCsv: (data: { invItems: Array<Partial<Item>> }) => api.post('/stock/import', data),
};

// === Locations API ===
export const locationsApi = {
  list: () => api.get('/locations'),
  getById: (id: number) => api.get(`/locations/${id}`),
  create: (data: Partial<Location>) => api.post('/locations', data),
  update: (id: number, data: Partial<Location>) => api.put(`/locations/${id}`, data),
  delete: (id: number) => api.delete(`/locations/${id}`),
};

// === Lists API ===
interface ListCreateData {
  name: string;
  type?: string;
  notes?: string;
}

interface ListUpdateData {
  name?: string;
  type?: string;
  notes?: string;
  isArchived?: boolean;
  config?: Record<string, any>;
}

interface ListItemCreateData {
  content: string;
  quantity?: number;
  unit?: string;
  notes?: string;
  assigneeId?: number;
  dueAt?: number;
  linkedItemId?: number;
  linkedRecipeId?: number;
}

export const listsApi = {
  list: (type?: string) => api.get('/lists', { params: { type } }),
  getById: (id: number) => api.get(`/lists/${id}`),
  create: (data: ListCreateData) => api.post('/lists', data),
  update: (id: number, data: ListUpdateData) => api.put(`/lists/${id}`, data),
  delete: (id: number) => api.delete(`/lists/${id}`),
  addItem: (listId: number, data: ListItemCreateData) => api.post(`/lists/${listId}/items`, data),
  deleteItem: (itemId: number) => api.delete(`/lists/items/${itemId}`),
  checkItem: (itemId: number) => api.post(`/lists/items/${itemId}/check`),
  uncheckItem: (itemId: number) => api.post(`/lists/items/${itemId}/uncheck`),
  assignItem: (itemId: number, data: { assigneeId: number }) =>
    api.post(`/lists/items/${itemId}/assign`, data),
  getMyTasks: () => api.get('/lists/my-tasks'),
  getPendingTodos: () => api.get('/lists/pending-todos'),
  getComments: (itemId: number) => api.get(`/lists/items/${itemId}/comments`),
  addComment: (itemId: number, data: { content: string }) =>
    api.post(`/lists/items/${itemId}/comments`, data),
  createFromTemplate: (templateId: number) =>
    api.post('/lists/from-template', { templateId }),
  autoReplenish: () => api.post('/lists/auto-replenish'),
  getHolidayTemplates: () => api.get('/lists/holiday-templates'),
};

// === Recipes API ===
interface RecipeCreateData {
  name: string;
  description?: string;
  servings?: number;
  prepTime?: number;
  cookTime?: number;
  ingredients?: Array<{ itemId?: number; name: string; quantity: number; unit: string }>;
  steps?: string[];
  notes?: string;
}

interface RecipeUpdateData {
  name?: string;
  description?: string;
  servings?: number;
  prepTime?: number;
  cookTime?: number;
  ingredients?: Array<{ itemId?: number; name: string; quantity: number; unit: string }>;
  steps?: string[];
  notes?: string;
}

export const recipesApi = {
  list: (query?: string) => api.get('/recipes', { params: { q: query } }),
  getById: (id: number) => api.get(`/recipes/${id}`),
  create: (data: RecipeCreateData) => api.post('/recipes', data),
  update: (id: number, data: RecipeUpdateData) => api.put(`/recipes/${id}`, data),
  delete: (id: number) => api.delete(`/recipes/${id}`),
  getRecommendations: (limit?: number) =>
    api.get('/recipes/recommendations', { params: { limit } }),
  getDueScore: (id: number) => api.get(`/recipes/${id}/due-score`),
};

// === Trigger API ===
interface BindingCreateData {
  code: string;
  codeType: 'nfc' | 'qr' | 'barcode' | 'rfid';
  targetType: 'item' | 'location' | 'recipe' | 'action';
  targetId: number;
  actionOverride?: string;
  label?: string;
  notes?: string;
}

interface BindingUpdateData {
  code?: string;
  codeType?: 'nfc' | 'qr' | 'barcode' | 'rfid';
  targetType?: 'item' | 'location' | 'recipe' | 'action';
  targetId?: number;
  actionOverride?: string;
  label?: string;
  notes?: string;
}

interface AutomationCreateData {
  name: string;
  triggerType: string;
  triggerConfig: Record<string, unknown>;
  actionType: string;
  actionConfig: Record<string, unknown>;
  notes?: string;
}

export const triggerApi = {
  listBindings: (codeType?: string) =>
    api.get('/bindings', { params: { codeType } }),
  createBinding: (data: BindingCreateData) => api.post('/bindings', data),
  updateBinding: (id: number, data: BindingUpdateData) => api.put(`/bindings/${id}`, data),
  deleteBinding: (id: number) => api.delete(`/bindings/${id}`),
  scan: (data: { code: string; codeType: string; metadata?: Record<string, unknown>; pagePath?: string }) =>
    api.post('/scanner/scan', data),
  listAutomations: () => api.get('/automations'),
  createAutomation: (data: AutomationCreateData) => api.post('/automations', data),
};

// === Notifications API ===
interface NotificationRuleCreateData {
  name: string;
  type: 'expiry' | 'low_stock' | 'chore_due' | 'system' | 'custom';
  condition: Record<string, unknown>;
  channelId?: string;
  notes?: string;
}

export const notificationsApi = {
  list: (unreadOnly?: boolean) =>
    api.get('/notifications', { params: { unread: unreadOnly } }),
  getUnreadCount: () => api.get('/notifications/unread-count'),
  markAsRead: (id: number) => api.post(`/notifications/${id}/read`),
  markAllAsRead: () => api.post('/notifications/read-all'),
  listRules: () => api.get('/notifications/rules'),
  createRule: (data: NotificationRuleCreateData) => api.post('/notifications/rules', data),
};

// === Brands API ===
export const brandsApi = {
  list: () => api.get('/brands'),
  create: (data: { name: string; notes?: string }) => api.post('/brands', data),
  update: (id: number, data: { name?: string; notes?: string }) => api.put(`/brands/${id}`, data),
  delete: (id: number) => api.delete(`/brands/${id}`),
};

// === Shops API ===
export const shopsApi = {
  list: () => api.get('/shops'),
  create: (data: { name: string; icon?: string; address?: string; notes?: string }) => api.post('/shops', data),
  update: (id: number, data: { name?: string; icon?: string; address?: string; notes?: string }) => api.put(`/shops/${id}`, data),
  delete: (id: number) => api.delete(`/shops/${id}`),
};

// === Categories API ===
export const categoriesApi = {
  list: () => api.get('/categories'),
  create: (data: { name: string; icon?: string; notes?: string }) => api.post('/categories', data),
  update: (id: number, data: { name?: string; icon?: string; notes?: string }) => api.put(`/categories/${id}`, data),
  delete: (id: number) => api.delete(`/categories/${id}`),
};

// === Tags API ===
export const tagsApi = {
  list: () => api.get('/tags'),
  create: (data: { name: string; icon?: string; color?: string; notes?: string }) => api.post('/tags', data),
  update: (id: number, data: { name?: string; icon?: string; color?: string; notes?: string }) => api.put(`/tags/${id}`, data),
  delete: (id: number) => api.delete(`/tags/${id}`),
};

// === Units API ===
export const unitsApi = {
  list: () => api.get('/units'),
  create: (data: { name: string; ratio?: number; notes?: string }) => api.post('/units', data),
  update: (id: number, data: { name?: string; ratio?: number; notes?: string }) => api.put(`/units/${id}`, data),
  delete: (id: number) => api.delete(`/units/${id}`),
};

// === Families API ===
export const familiesApi = {
  getCurrent: () => api.get('/families/current'),
  create: (data: { name: string }) => api.post('/families', data),
  join: (data: { inviteCode: string }) => api.post('/families/join', data),
  getMembers: (id: number) => api.get(`/families/${id}/members`),
};

// === Users API ===
export const usersApi = {
  updateProfile: (data: { name?: string; email?: string; avatar?: string }) =>
    api.put('/users/me', data),
  changePassword: (data: { oldPassword: string; newPassword: string }) =>
    api.post('/users/me/password', data),
  uploadAvatar: (formData: FormData) =>
    api.post('/users/me/avatar', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
};

// === Hardware API ===
export const hardwareApi = {
  listDevices: () => api.get('/hardware/devices'),
  listPrintJobs: () => api.get('/hardware/print/jobs'),
  print: (data: { content: string; outputType: string }) =>
    api.post('/hardware/print', data),
  nfcWrite: (data: { text: string; format: string }) =>
    api.post('/hardware/nfc/write', data),
};

// === Dashboard API ===
export const dashboardApi = {
  getActivities: (limit?: number) => api.get('/dashboard/activities', { params: { limit } }),
  getSummary: () => api.get('/dashboard/summary'),
  getWasteAnalysis: () => api.get('/dashboard/waste-analysis'),
  getSpendingReport: (startDate?: string, endDate?: string) =>
    api.get('/dashboard/spending-report', { params: { startDate, endDate } }),
  getLocationReport: () => api.get('/dashboard/location-report'),
};

// === Budget API ===
export const budgetApi = {
  listEntries: (params?: { type?: string; category?: string; startDate?: number; endDate?: number; page?: number; limit?: number }) =>
    api.get('/budget/entries', { params }),
  getEntry: (id: number) => api.get(`/budget/entries/${id}`),
  createEntry: (data: any) => api.post('/budget/entries', data),
  updateEntry: (id: number, data: any) => api.put(`/budget/entries/${id}`, data),
  deleteEntry: (id: number) => api.delete(`/budget/entries/${id}`),
  getSummary: (startDate?: number, endDate?: number) =>
    api.get('/budget/summary', { params: { startDate, endDate } }),
  listCategories: (type?: string) => api.get('/budget/categories', { params: { type } }),
  createCategory: (data: any) => api.post('/budget/categories', data),
  deleteCategory: (id: number) => api.delete(`/budget/categories/${id}`),
  listSubscriptions: () => api.get('/budget/subscriptions'),
  createSubscription: (data: any) => api.post('/budget/subscriptions', data),
  updateSubscription: (id: number, data: any) => api.put(`/budget/subscriptions/${id}`, data),
  deleteSubscription: (id: number) => api.delete(`/budget/subscriptions/${id}`),
  getMonthlyCost: () => api.get('/budget/subscriptions/monthly-cost'),
};

// === Documents API ===
export const documentsApi = {
  list: (itemId?: number) => api.get('/documents', { params: { itemId } }),
  getById: (id: number) => api.get(`/documents/${id}`),
  upload: (formData: FormData) => api.post('/documents/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  download: (id: number) => api.get(`/documents/${id}/download`, { responseType: 'blob' }),
  delete: (id: number) => api.delete(`/documents/${id}`),
};

// === Backup API ===
export const backupApi = {
  list: () => api.get('/backup'),
  getStorage: () => api.get('/backup/storage'),
  create: (name?: string) => api.post('/backup', { name }),
  restore: (filename: string, createPreRestore = true) =>
    api.post('/backup/restore', { filename, createPreRestoreBackup: createPreRestore }),
  delete: (filename: string) => api.delete(`/backup/${filename}`),
  cleanup: (retentionDays: number) => api.post('/backup/cleanup', { retentionDays }),
};

// === Custom Fields API ===
export const customFieldsApi = {
  listDefs: (entityType: string) => api.get(`/custom-fields/${entityType}`),
  createDef: (entityType: string, data: any) => api.post(`/custom-fields/${entityType}`, data),
  updateDef: (fieldId: number, data: any) => api.put(`/custom-fields/field/${fieldId}`, data),
  deleteDef: (fieldId: number) => api.delete(`/custom-fields/field/${fieldId}`),
  getValues: (entityType: string, entityId: number) => api.get(`/custom-fields/${entityType}/${entityId}/values`),
  setValues: (entityType: string, entityId: number, values: any[]) =>
    api.put(`/custom-fields/${entityType}/${entityId}/values`, { values }),
  search: (entityType: string, fieldName: string, value: string) =>
    api.get(`/custom-fields/${entityType}/search`, { params: { fieldName, value } }),
};

// === History API ===
export const historyApi = {
  getTimeline: (params?: { page?: number; limit?: number; type?: string; source?: string; itemId?: number; userId?: number }) =>
    api.get('/history/timeline', { params }),
  getScanLogs: (limit?: number) =>
    api.get('/history/scan-logs', { params: { limit } }),
  getJournalSummary: () =>
    api.get('/history/journal-summary'),
};

// === Calendar Events API ===
export interface CalendarEventData {
  title: string;
  description?: string;
  date: string;
  endDate?: string;
  allDay?: boolean;
  category?: 'reminder' | 'birthday' | 'appointment' | 'chore' | 'custom';
  color?: string;
  recurrence?: 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly';
  reminderMinutes?: number;
  relatedType?: string;
  relatedId?: number;
}
export const calendarEventsApi = {
  list: (startDate?: string, endDate?: string) =>
    api.get('/calendar/events', { params: { startDate, endDate } }),
  getById: (id: number) => api.get(`/calendar/events/${id}`),
  create: (data: CalendarEventData) => api.post('/calendar/events', data),
  update: (id: number, data: Partial<CalendarEventData>) =>
    api.put(`/calendar/events/${id}`, data),
  delete: (id: number) => api.delete(`/calendar/events/${id}`),
};

// === Meal Plans API ===
export interface MealPlanItemData {
  dayOfWeek: number;
  mealType: string;
  recipeId: number;
  note?: string;
}
export const mealPlansApi = {
  list: () => api.get('/meal-plans'),
  getById: (id: number) => api.get(`/meal-plans/${id}`),
  create: (data: { weekStart: number; weekEnd: number }) =>
    api.post('/meal-plans', data),
  addItem: (planId: number, data: MealPlanItemData) =>
    api.post(`/meal-plans/${planId}/items`, data),
  updateItem: (planId: number, itemId: number, data: Partial<MealPlanItemData>) =>
    api.put(`/meal-plans/${planId}/items/${itemId}`, data),
  removeItem: (planId: number, itemId: number) =>
    api.delete(`/meal-plans/${planId}/items/${itemId}`),
  delete: (id: number) => api.delete(`/meal-plans/${id}`),
  generateShopping: (planId: number) =>
    api.post(`/meal-plans/${planId}/generate-shopping`),
};

// === Encoder API ===
export const encoderApi = {
  generate: (data: { targetType: string; targetId: number; outputType: string }) =>
    api.post('/encoder/generate', data),
};

// === Plugins API ===
export const pluginsApi = {
  /** List all installed plugins */
  list: () => api.get('/plugins'),
  /** Get a specific plugin by ID */
  getById: (id: string) => api.get(`/plugins/${id}`),
  /** Enable a plugin */
  enable: (id: string) => api.post(`/plugins/${id}/enable`),
  /** Disable a plugin */
  disable: (id: string) => api.post(`/plugins/${id}/disable`),
  /** Update plugin configuration */
  updateConfig: (id: string, config: Record<string, unknown>) =>
    api.put(`/plugins/${id}/config`, config),
  /** Get all ItemType configs aggregated from registered plugins */
  getItemTypeConfigs: () => api.get('/plugins/item-type-configs/all'),
  /** Get runtime state summary for all plugins */
  getStateSummary: () => api.get('/plugins/state/summary'),
};
