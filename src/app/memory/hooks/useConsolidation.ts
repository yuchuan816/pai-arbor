'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchJobStatus, startConsolidation } from '@/app/memory/request';
import { queryKeys } from '@/lib/client/query-keys';
import { formatClientError, showErrorToast } from '@/lib/client/show-error-toast';

export function useConsolidation() {
  const queryClient = useQueryClient();
  const [jobId, setJobId] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const failedToastJobIdRef = useRef<string | null>(null);

  const { data: job, isFetching } = useQuery({
    queryKey: jobId ? queryKeys.memoryJob(jobId) : ['memory', 'job', 'idle'],
    queryFn: () => {
      if (!jobId) throw new Error('jobId is required');
      return fetchJobStatus(jobId);
    },
    enabled: Boolean(jobId),
    meta: { showErrorToast: false },
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

  useEffect(() => {
    if (job?.status === 'failed' && job.error && job.id !== failedToastJobIdRef.current) {
      failedToastJobIdRef.current = job.id;
      showErrorToast(job.error, 'consolidation-job-failed');
    }
  }, [job?.status, job?.error, job?.id]);

  const start = useCallback(async () => {
    setIsStarting(true);
    try {
      const { jobId: newJobId } = await startConsolidation();
      setJobId(newJobId);
      failedToastJobIdRef.current = null;
    } catch (err) {
      showErrorToast(formatClientError(err), 'consolidation-start');
    } finally {
      setIsStarting(false);
    }
  }, []);

  const reset = useCallback(() => {
    setJobId(null);
    failedToastJobIdRef.current = null;
  }, []);

  const isRunning = job?.status === 'pending' || job?.status === 'running';

  return {
    job,
    jobId,
    start,
    reset,
    isStarting,
    isRunning,
    isPolling: Boolean(jobId) && isFetching,
  };
}
