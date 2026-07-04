import { defineStore } from 'pinia';
import { ref } from 'vue';
import { stockApi } from '@/api/client';
import type { Item, PaginatedResponse, PaginationQuery } from '@/shared/types';

interface PaginationState {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export const useStockStore = defineStore('stock', () => {
  const items = ref<Item[]>([]);
  const summary = ref({ totalItems: 0, expiringCount: 0, expiredCount: 0 });
  const loading = ref(false);
  const error = ref<string | null>(null);
  const pagination = ref<PaginationState>({
    total: 0,
    page: 1,
    limit: 20,
    totalPages: 0,
  });

  async function fetchItems(params?: PaginationQuery & { category?: string; location?: string }) {
    loading.value = true;
    error.value = null;
    try {
      const { data: response } = await stockApi.list(params);
      // Backend now returns PaginationResponse format: { data, total, page, limit, totalPages }
      if (response && typeof response === 'object' && 'data' in response) {
        items.value = (response as PaginatedResponse<Item>).data;
        pagination.value = {
          total: (response as PaginatedResponse<Item>).total,
          page: (response as PaginatedResponse<Item>).page,
          limit: (response as PaginatedResponse<Item>).limit,
          totalPages: (response as PaginatedResponse<Item>).totalPages,
        };
      } else if (Array.isArray(response)) {
        // Legacy compatibility: direct array response
        items.value = response as Item[];
      }
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      error.value = err.response?.data?.message || '加载库存失败';
    } finally {
      loading.value = false;
    }
  }

  async function fetchSummary() {
    try {
      const { data } = await stockApi.getSummary();
      summary.value = data;
    } catch (_e: unknown) {
      // Summary load failure does not affect main UI
    }
  }

  async function addItem(item: Partial<Item>) {
    try {
      const { data } = await stockApi.create(item);
      items.value.push(data as Item);
      return data as Item;
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      error.value = err.response?.data?.message || '添加物品失败';
      throw e;
    }
  }

  async function updateItem(id: number, updates: Partial<Item>) {
    try {
      const { data } = await stockApi.update(id, updates);
      const index = items.value.findIndex(i => i.id === id);
      if (index !== -1) items.value[index] = data as Item;
      return data as Item;
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      error.value = err.response?.data?.message || '更新物品失败';
      throw e;
    }
  }

  async function deleteItem(id: number) {
    try {
      await stockApi.delete(id);
      items.value = items.value.filter(i => i.id !== id);
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      error.value = err.response?.data?.message || '删除物品失败';
      throw e;
    }
  }

  async function consumeItem(id: number, quantity: number, note?: string) {
    try {
      const { data } = await stockApi.consume(id, { quantity, note });
      const index = items.value.findIndex(i => i.id === id);
      if (index !== -1) items.value[index] = data as Item;
      return data as Item;
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      error.value = err.response?.data?.message || '消费物品失败';
      throw e;
    }
  }

  function clearError() {
    error.value = null;
  }

  return {
    items,
    summary,
    loading,
    error,
    pagination,
    fetchItems,
    fetchSummary,
    addItem,
    updateItem,
    deleteItem,
    consumeItem,
    clearError,
  };
});
