'use client';

import { useQuery } from '@tanstack/react-query';
import { fetchDefaultSession } from '@/app/chat/request';
import { queryKeys } from '@/lib/client/query-keys';

export function useDefaultSession() {
  const { data, isLoading, isError } = useQuery({
    queryKey: queryKeys.defaultSession,
    queryFn: fetchDefaultSession,
  });

  return {
    sessionId: data?.id ?? '',
    isLoading,
    isError,
  };
}
