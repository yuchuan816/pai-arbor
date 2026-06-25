'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { fetchHistoryPage } from '@/app/chat/request';
import { queryKeys } from '@/lib/client/query-keys';
import type { HistoryMessage } from '../types/message-history';

interface UseMessageHistoryOptions {
  activeSessionId: string;
  messages: HistoryMessage[];
  setMessages: (
    messages: HistoryMessage[] | ((prev: HistoryMessage[]) => HistoryMessage[]),
  ) => void;
  bumpScroll: () => void;
}

export function useMessageHistory({
  activeSessionId,
  messages,
  setMessages,
  bumpScroll,
}: UseMessageHistoryOptions) {
  const [hasMore, setHasMore] = useState(false);
  const loadingMoreRef = useRef(false);
  const initialSyncRef = useRef<string | null>(null);

  const { data, isLoading: isInitialLoading } = useQuery({
    queryKey: queryKeys.messageHistory(activeSessionId),
    queryFn: () => fetchHistoryPage(activeSessionId),
    enabled: !!activeSessionId,
  });

  useEffect(() => {
    initialSyncRef.current = null;
  }, [activeSessionId]);

  useEffect(() => {
    if (!data || !activeSessionId) return;
    if (initialSyncRef.current === activeSessionId) return;

    initialSyncRef.current = activeSessionId;
    setMessages(data.messages);
    setHasMore(data.hasMore);
    bumpScroll();
  }, [data, activeSessionId, setMessages, bumpScroll]);

  const { mutateAsync, isPending } = useMutation({
    mutationFn: (before: string) => fetchHistoryPage(activeSessionId, before),
    onSuccess: (page) => {
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
    },
    onError: (error) => {
      console.error('加载更多历史消息失败:', error);
    },
    onSettled: () => {
      loadingMoreRef.current = false;
    },
  });

  const loadMore = useCallback(async () => {
    if (!activeSessionId || !hasMore || loadingMoreRef.current) return;

    const oldestId = messages[0]?.id;
    if (!oldestId) return;

    loadingMoreRef.current = true;
    await mutateAsync(oldestId);
  }, [activeSessionId, hasMore, messages, mutateAsync]);

  return {
    hasMore,
    isLoadingMore: isPending,
    isInitialLoading,
    loadMore,
  };
}
