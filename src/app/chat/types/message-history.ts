import type { UIMessage } from 'ai';

export interface HistoryMessage extends UIMessage {
  createdAt?: string;
}

export interface MessageHistoryPage {
  messages: HistoryMessage[];
  hasMore: boolean;
}
