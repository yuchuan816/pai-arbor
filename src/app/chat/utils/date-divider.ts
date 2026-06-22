import { format, isToday, isYesterday, isSameYear } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import type { HistoryMessage } from '../types/message-history';

export function getMessageDate(message: HistoryMessage): Date {
  if (message.createdAt) {
    return new Date(message.createdAt);
  }
  return new Date();
}

export function formatDayKey(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

export function formatDateDivider(date: Date, now = new Date()): string {
  if (isToday(date)) {
    return '今天';
  }

  if (isYesterday(date)) {
    return '昨天';
  }

  if (isSameYear(date, now)) {
    return format(date, 'M月d日', { locale: zhCN });
  }

  return format(date, 'yyyy年M月d日', { locale: zhCN });
}
