import { parseApiResponse } from '@/lib/api-client';
import type { MessageHistoryPage } from '@/app/chat/types/message-history';

const PAGE_SIZE = 10;

interface DefaultSession {
  id: string;
}

export async function fetchDefaultSession(): Promise<DefaultSession> {
  const res = await fetch('/api/sessions/default');
  return parseApiResponse<DefaultSession>(res);
}

export async function fetchHistoryPage(
  sessionId: string,
  before?: string,
): Promise<MessageHistoryPage> {
  const params = new URLSearchParams({ limit: String(PAGE_SIZE) });
  if (before) {
    params.set('before', before);
  }

  const res = await fetch(`/api/sessions/${sessionId}?${params.toString()}`);
  try {
    return await parseApiResponse<MessageHistoryPage>(res);
  } catch {
    return { messages: [], hasMore: false };
  }
}
