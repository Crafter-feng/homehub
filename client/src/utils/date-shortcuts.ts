/**
 * Date input shortcuts for rapid date entry
 * Supports: MMDD, YYYYMMDD, +/-Nd/m/y, x (never expire)
 */

export function parseDateShortcut(input: string): Date | null {
  if (!input || input.trim() === '') return null;

  const trimmed = input.trim().toLowerCase();
  const now = new Date();

  // 'x' = never expire (2999-12-31)
  if (trimmed === 'x') {
    return new Date(2999, 11, 31);
  }

  // MMDD format (e.g., "0517")
  if (/^\d{4}$/.test(trimmed)) {
    const month = parseInt(trimmed.substring(0, 2)) - 1;
    const day = parseInt(trimmed.substring(2, 4));
    if (month >= 0 && month <= 11 && day >= 1 && day <= 31) {
      const date = new Date(now.getFullYear(), month, day);
      // If date is past, assume next year
      if (date < now) {
        date.setFullYear(date.getFullYear() + 1);
      }
      return date;
    }
  }

  // YYYYMMDD format (e.g., "20260517")
  if (/^\d{8}$/.test(trimmed)) {
    const year = parseInt(trimmed.substring(0, 4));
    const month = parseInt(trimmed.substring(4, 6)) - 1;
    const day = parseInt(trimmed.substring(6, 8));
    if (year >= 2000 && year <= 2999 && month >= 0 && month <= 11 && day >= 1 && day <= 31) {
      return new Date(year, month, day);
    }
  }

  // Relative date: +/-Nd/m/y (e.g., "+1m", "-3d", "+1y")
  const relativeMatch = trimmed.match(/^([+-])(\d+)([dmy])$/);
  if (relativeMatch) {
    const sign = relativeMatch[1] === '+' ? 1 : -1;
    const amount = parseInt(relativeMatch[2]);
    const unit = relativeMatch[3];

    const date = new Date(now);
    switch (unit) {
      case 'd':
        date.setDate(date.getDate() + sign * amount);
        break;
      case 'm':
        date.setMonth(date.getMonth() + sign * amount);
        break;
      case 'y':
        date.setFullYear(date.getFullYear() + sign * amount);
        break;
    }
    return date;
  }

  // YYYYMMe or YYYYMM+ format (end of month)
  const endOfMonthMatch = trimmed.match(/^(\d{4})(\d{2})[e+]$/);
  if (endOfMonthMatch) {
    const year = parseInt(endOfMonthMatch[1]);
    const month = parseInt(endOfMonthMatch[2]) - 1;
    if (year >= 2000 && year <= 2999 && month >= 0 && month <= 11) {
      // Last day of month
      return new Date(year, month + 1, 0);
    }
  }

  // Try parsing as regular date string
  const parsed = new Date(input);
  if (!isNaN(parsed.getTime())) {
    return parsed;
  }

  return null;
}

export function formatDateShortcutHint(): string {
  return '快捷输入: MMDD (如 0517), +1m, -3d, x (永不过期)';
}
