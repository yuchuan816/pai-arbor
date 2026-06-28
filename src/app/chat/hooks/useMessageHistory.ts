'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { clearSessionMessages, fetchHistoryPage } from '@/app/chat/request';
import { queryKeys } from '@/lib/client/query-keys';
import type { HistoryMessage } from '../request';

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
  const queryClient = useQueryClient();
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

  const { mutateAsync: clearHistoryAsync, isPending: isClearing } = useMutation({
    mutationFn: () => clearSessionMessages(activeSessionId),
    onSuccess: () => {
      setMessages([]);
      setHasMore(false);
      queryClient.setQueryData(queryKeys.messageHistory(activeSessionId), {
        messages: [],
        hasMore: false,
      });
    },
  });

  const clearHistory = useCallback(async () => {
    if (!activeSessionId) return;
    await clearHistoryAsync();
  }, [activeSessionId, clearHistoryAsync]);

  return {
    hasMore,
    isLoadingMore: isPending,
    isInitialLoading,
    isClearing,
    loadMore,
    clearHistory,
  };
}
