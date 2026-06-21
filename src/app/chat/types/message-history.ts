import type { UIMessage } from 'ai';

export interface MessageHistoryPage {
  messages: UIMessage[];
  hasMore: boolean;
}
