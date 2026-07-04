/**
 * 日期计算工具函数
 * 用于统一管理过期日期、时间范围等计算逻辑
 */

const MILLISECONDS_PER_DAY = 86400000;

/**
 * 计算从现在开始 N 天后的时间戳
 * @param days - 天数
 * @returns 时间戳 (毫秒)
 */
export function daysFromNow(days: number): number {
  return Date.now() + days * MILLISECONDS_PER_DAY;
}

/**
 * 计算从现在开始 N 天前的时间戳
 * @param days - 天数
 * @returns 时间戳 (毫秒)
 */
export function daysAgo(days: number): number {
  return Date.now() - days * MILLISECONDS_PER_DAY;
}

/**
 * 判断给定日期是否已过期
 * @param expiryDate - 过期日期 (Date 对象或时间戳)
 * @returns 是否已过期
 */
export function isExpired(expiryDate: Date | number | null): boolean {
  if (!expiryDate) return false;
  const timestamp = expiryDate instanceof Date ? expiryDate.getTime() : expiryDate;
  return timestamp < Date.now();
}

/**
 * 判断给定日期是否即将过期（在指定天数内）
 * @param expiryDate - 过期日期 (Date 对象或时间戳)
 * @param withinDays - 在多少天内算即将过期，默认 7 天
 * @returns 是否即将过期
 */
export function isExpiringSoon(expiryDate: Date | number | null, withinDays: number = 7): boolean {
  if (!expiryDate) return false;
  const timestamp = expiryDate instanceof Date ? expiryDate.getTime() : expiryDate;
  const deadline = daysFromNow(withinDays);
  return timestamp > Date.now() && timestamp <= deadline;
}

/**
 * 计算两个日期之间的天数差
 * @param date1 - 日期1
 * @param date2 - 日期2
 * @returns 天数差（正数表示 date1 在 date2 之后）
 */
export function daysBetween(date1: Date | number, date2: Date | number): number {
  const ts1 = date1 instanceof Date ? date1.getTime() : date1;
  const ts2 = date2 instanceof Date ? date2.getTime() : date2;
  return Math.round((ts1 - ts2) / MILLISECONDS_PER_DAY);
}

/**
 * 格式化日期为本地字符串
 * @param date - 日期
 * @param locale - 地区设置，默认 'zh-CN'
 * @returns 格式化后的日期字符串
 */
export function formatDate(date: Date | number | null, locale: string = 'zh-CN'): string {
  if (!date) return '-';
  const d = date instanceof Date ? date : new Date(date);
  return d.toLocaleDateString(locale);
}
