import { ref, computed } from 'vue';
import { useMessage, useDialog } from 'naive-ui';
import { stockApi, locationsApi } from '@/api/client';
import type { Item, StockTransaction, Location } from '@/shared/types';

export function useStockItem(options?: { onUpdated?: () => void; onDeleted?: () => void }) {
  const message = useMessage();
  const dialog = useDialog();

  const item = ref<Item | null>(null);
  const history = ref<StockTransaction[]>([]);
  const locations = ref<Location[]>([]);
  const loading = ref(false);

  // Modal visibility
  const showConsumeModal = ref(false);
  const showTransferModal = ref(false);
  const showStockInModal = ref(false);

  // Form state
  const consumeQuantity = ref(1);
  const consumeNote = ref('');
  const stockInQuantity = ref(1);
  const stockInPrice = ref<number | null>(null);
  const stockInShop = ref('');
  const stockInNote = ref('');
  const transferLocation = ref<number | null>(null);

  // Computed
  const locationSelectOptions = computed(() =>
    locations.value.map(l => ({ label: l.name, value: l.id }))
  );

  const isExpired = computed(() => {
    if (!item.value?.expiryDate) return false;
    return new Date(item.value.expiryDate) < new Date();
  });

  const isExpiringSoon = computed(() => {
    if (!item.value?.expiryDate) return false;
    const diff = new Date(item.value.expiryDate).getTime() - Date.now();
    return diff > 0 && diff < 7 * 24 * 60 * 60 * 1000;
  });

  const isLowStock = computed(() => {
    if (!item.value) return false;
    return item.value.minStock !== null && item.value.quantity <= item.value.minStock;
  });

  // Helpers
  const getLocationName = (locationId: number | null): string => {
    if (!locationId) return '未指定';
    const loc = locations.value.find(l => l.id === locationId);
    return loc ? loc.name : String(locationId);
  };

  const formatDate = (dateStr: string | Date): string => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('zh-CN');
  };

  const formatDateTime = (dateStr: string | Date): string => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleString('zh-CN');
  };

  // Data loading
  const loadData = async (itemId: number) => {
    loading.value = true;
    try {
      const [itemRes, historyRes, locRes] = await Promise.all([
        stockApi.getById(itemId),
        stockApi.getHistory(itemId),
        locationsApi.list(),
      ]);
      item.value = itemRes.data;
      history.value = historyRes.data || [];
      locations.value = (locRes.data || []) as Location[];
    } catch {
      message.error('加载失败');
    } finally {
      loading.value = false;
    }
  };

  // Actions
  const openStockIn = () => {
    stockInQuantity.value = 1;
    stockInPrice.value = null;
    stockInShop.value = '';
    stockInNote.value = '';
    showStockInModal.value = true;
  };

  const handleStockIn = async () => {
    if (!item.value) return;
    try {
      await stockApi.stockIn(item.value.id, {
        quantity: stockInQuantity.value,
        note: stockInNote.value || undefined,
        price: stockInPrice.value ?? undefined,
        shop: stockInShop.value || undefined,
      });
      message.success('入库成功');
      showStockInModal.value = false;
      loadData(item.value.id);
      options?.onUpdated?.();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      message.error(err.response?.data?.message || '操作失败');
    }
  };

  const handleConsume = async () => {
    if (!item.value) return;
    try {
      await stockApi.consume(item.value.id, { quantity: consumeQuantity.value, note: consumeNote.value });
      message.success('消耗成功');
      showConsumeModal.value = false;
      loadData(item.value.id);
      options?.onUpdated?.();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      message.error(err.response?.data?.message || '操作失败');
    }
  };

  const handleTransfer = async () => {
    if (!item.value) return;
    if (!transferLocation.value) {
      message.warning('请选择目标位置');
      return;
    }
    try {
      await stockApi.transfer(item.value.id, { toLocationId: transferLocation.value });
      message.success('转移成功');
      showTransferModal.value = false;
      loadData(item.value.id);
      options?.onUpdated?.();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      message.error(err.response?.data?.message || '操作失败');
    }
  };

  const handleDelete = (itemId: number, itemName: string) => {
    dialog.warning({
      title: '确认删除',
      content: `确定要删除 "${itemName}" 吗？`,
      positiveText: '删除',
      negativeText: '取消',
      onPositiveClick: async () => {
        try {
          await stockApi.delete(itemId);
          message.success('删除成功');
          options?.onDeleted?.();
        } catch (e: unknown) {
          const err = e as { response?: { data?: { message?: string } } };
          message.error(err.response?.data?.message || '删除失败');
        }
      },
    });
  };

  return {
    item,
    history,
    locations,
    loading,
    showConsumeModal,
    showTransferModal,
    showStockInModal,
    consumeQuantity,
    consumeNote,
    stockInQuantity,
    stockInPrice,
    stockInShop,
    stockInNote,
    transferLocation,
    locationSelectOptions,
    isExpired,
    isExpiringSoon,
    isLowStock,
    getLocationName,
    formatDate,
    formatDateTime,
    loadData,
    openStockIn,
    handleStockIn,
    handleConsume,
    handleTransfer,
    handleDelete,
  };
}
