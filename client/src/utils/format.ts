/**
 * 相对时间格式化
 */
export function formatRelativeTime(dateStr: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  if (diff < 60000) return '刚刚';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`;
  return d.toLocaleDateString('zh-CN');
}

/**
 * 物品类型 → Naive UI Tag 颜色映射
 */
export function getCategoryColor(type: string): 'default' | 'primary' | 'success' | 'warning' | 'error' | 'info' {
  const colorMap: Record<string, 'default' | 'primary' | 'success' | 'warning' | 'error' | 'info'> = {
    food: 'warning',
    grocery: 'info',
    medicine: 'error',
    daily: 'success',
    electronic_device: 'primary',
    rechargeable_battery: 'primary',
    fire_extinguisher: 'error',
    gas_tank: 'warning',
    generic: 'default',
  };
  return colorMap[type] || 'default';
}

/**
 * 库存操作类型 → 颜色
 */
export function getHistoryColor(type: string): string {
  const colors: Record<string, string> = {
    add: '#6366f1',
    consume: '#10b981',
    transfer: '#f59e0b',
    adjust: '#6b7280',
  };
  return colors[type] || '#6b7280';
}
