'use client';

import { useQuery } from '@tanstack/react-query';
import { fetchDefaultSession } from '@/app/chat/request';
import { queryKeys } from '@/lib/client/query-keys';

export function useDefaultSession() {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: queryKeys.defaultSession,
    queryFn: fetchDefaultSession,
  });

  return {
    sessionId: data?.id ?? '',
    isLoading,
    error: isError ? (error?.message ?? '无法加载会话') : null,
  };
}
