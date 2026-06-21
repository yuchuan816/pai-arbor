'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { UIMessage } from 'ai';
import type { MessageHistoryPage } from '../types/message-history';

const PAGE_SIZE = 10;

interface ApiResponse<T> {
  success: boolean;
  data?: T;
}

interface UseMessageHistoryOptions {
  activeSessionId: string;
  messages: UIMessage[];
  setMessages: (
    messages: UIMessage[] | ((prev: UIMessage[]) => UIMessage[]),
  ) => void;
  bumpScroll: () => void;
}

async function fetchHistoryPage(
  sessionId: string,
  before?: string,
): Promise<MessageHistoryPage> {
  const params = new URLSearchParams({ limit: String(PAGE_SIZE) });
  if (before) {
    params.set('before', before);
  }

  const res = await fetch(`/api/sessions/${sessionId}?${params.toString()}`);
  const json = (await res.json()) as ApiResponse<MessageHistoryPage>;

  if (json.success && json.data) {
    return json.data;
  }

  return { messages: [], hasMore: false };
}

export function useMessageHistory({
  activeSessionId,
  messages,
  setMessages,
  bumpScroll,
}: UseMessageHistoryOptions) {
  const [hasMore, setHasMore] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(false);
  const loadingMoreRef = useRef(false);

  const loadMore = useCallback(async () => {
    if (!activeSessionId || !hasMore || loadingMoreRef.current) return;

    const oldestId = messages[0]?.id;
    if (!oldestId) return;

    loadingMoreRef.current = true;
    setIsLoadingMore(true);

    try {
      const page = await fetchHistoryPage(activeSessionId, oldestId);
      if (page.messages.length === 0) {
        setHasMore(false);
        return;
      }

      setMessages((prev) => {
        const existingIds = new Set(prev.map((m) => m.id));
        const older = page.messages.filter((m) => !existingIds.has(m.id));
        return [...older, ...prev];
      });
      setHasMore(page.hasMore);
    } catch (error) {
      console.error('加载更多历史消息失败:', error);
    } finally {
      loadingMoreRef.current = false;
      setIsLoadingMore(false);
    }
  }, [activeSessionId, hasMore, messages, setMessages]);

  useEffect(() => {
    if (!activeSessionId) return;

    let cancelled = false;

    async function loadInitial() {
      setIsInitialLoading(true);
      try {
        const page = await fetchHistoryPage(activeSessionId);
        if (cancelled) return;
        setMessages(page.messages);
        setHasMore(page.hasMore);
        bumpScroll();
      } catch (error) {
        console.error('获取历史消息失败:', error);
        if (!cancelled) {
          setMessages([]);
          setHasMore(false);
        }
      } finally {
        if (!cancelled) {
          setIsInitialLoading(false);
        }
      }
    }

    void loadInitial();

    return () => {
      cancelled = true;
    };
  }, [activeSessionId, setMessages, bumpScroll]);

  return {
    hasMore,
    isLoadingMore,
    isInitialLoading,
    loadMore,
  };
}
