import type { HistoryMessage } from '../types/message-history';
import { formatDateDivider, formatDayKey, getMessageDate } from './date-divider';

export type MessageListItem =
  | { type: 'divider'; key: string; label: string }
  | { type: 'message'; message: HistoryMessage };

export function buildMessageItems(messages: HistoryMessage[]): MessageListItem[] {
  const items: MessageListItem[] = [];
  let lastDayKey: string | null = null;

  for (const message of messages) {
    const date = getMessageDate(message);
    const dayKey = formatDayKey(date);

    if (dayKey !== lastDayKey) {
      items.push({
        type: 'divider',
        key: `divider-${dayKey}`,
        label: formatDateDivider(date),
      });
      lastDayKey = dayKey;
    }

    items.push({ type: 'message', message });
  }

  return items;
}
