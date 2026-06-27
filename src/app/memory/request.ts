import { parseApiResponse } from '@/lib/client/api-client';
import type { ConsolidationJob } from '@/types/consolidation-job';

export interface CompleteSessionResult {
  sessionId: string;
  status: string;
  alreadyCompleted: boolean;
}

export async function completeDefaultSession(): Promise<CompleteSessionResult> {
  const res = await fetch('/api/sessions/complete', { method: 'POST' });
  return parseApiResponse<CompleteSessionResult>(res);
}

export async function startConsolidation(): Promise<{ jobId: string }> {
  const res = await fetch('/api/memory/consolidate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  return parseApiResponse<{ jobId: string }>(res);
}

export async function fetchJobStatus(jobId: string): Promise<ConsolidationJob> {
  const res = await fetch(`/api/memory/consolidate?jobId=${encodeURIComponent(jobId)}`);
  return parseApiResponse<ConsolidationJob>(res);
}

export async function fetchMemoryList(query?: string, limit = 20): Promise<{ memories: string[] }> {
  const params = new URLSearchParams({ limit: String(limit) });
  if (query) {
    params.set('query', query);
  }

  const res = await fetch(`/api/memory/list?${params.toString()}`);
  return parseApiResponse<{ memories: string[] }>(res);
}
