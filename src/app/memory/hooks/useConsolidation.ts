'use client';

import { useCallback, useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchJobStatus, startConsolidation } from '@/app/memory/request';
import { queryKeys } from '@/lib/client/query-keys';

export function useConsolidation() {
  const queryClient = useQueryClient();
  const [jobId, setJobId] = useState<string | null>(null);
  const [startError, setStartError] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(false);

  const { data: job, isFetching } = useQuery({
    queryKey: jobId ? queryKeys.memoryJob(jobId) : ['memory', 'job', 'idle'],
    queryFn: () => fetchJobStatus(jobId!),
    enabled: Boolean(jobId),
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === 'running' || status === 'pending' ? 2000 : false;
    },
  });

  useEffect(() => {
    if (job?.status === 'completed') {
      void queryClient.invalidateQueries({ queryKey: queryKeys.memoryList });
    }
  }, [job?.status, queryClient]);

  const start = useCallback(async () => {
    setStartError(null);
    setIsStarting(true);
    try {
      const { jobId: newJobId } = await startConsolidation();
      setJobId(newJobId);
    } catch (err) {
      setStartError(err instanceof Error ? err.message : '启动失败');
    } finally {
      setIsStarting(false);
    }
  }, []);

  const reset = useCallback(() => {
    setJobId(null);
    setStartError(null);
  }, []);

  const isRunning = job?.status === 'pending' || job?.status === 'running';

  return {
    job,
    jobId,
    start,
    reset,
    startError,
    isStarting,
    isRunning,
    isPolling: Boolean(jobId) && isFetching,
  };
}
