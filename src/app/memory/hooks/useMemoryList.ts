'use client';

import { useQuery } from '@tanstack/react-query';
import { fetchMemoryList } from '@/app/memory/request';
import { queryKeys } from '@/lib/client/query-keys';

export function useMemoryList() {
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: queryKeys.memoryList,
    queryFn: () => fetchMemoryList(),
  });

  return {
    memories: data?.memories ?? [],
    isLoading,
    error: isError ? (error?.message ?? '加载记忆失败') : null,
    refetch,
  };
}
