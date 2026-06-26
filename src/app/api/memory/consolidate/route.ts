import { randomUUID } from 'crypto';
import { type NextRequest } from 'next/server';
import { badRequest, successResponse, withApiHandler } from '@/lib/server/api-handler';
import { jobStore } from '@/lib/server/job-store';
import { runConsolidation } from '@/services/memory-consolidation.service';

export const POST = withApiHandler(async () => {
  const jobId = randomUUID();
  const job = await jobStore.create(jobId);
  await jobStore.prune();

  runConsolidation(job).catch((err) => {
    console.error('[API] runConsolidation uncaught error:', err);
  });

  return successResponse({ jobId });
});

export const GET = withApiHandler(async (req: NextRequest) => {
  const jobId = req.nextUrl.searchParams.get('jobId');
  if (!jobId) return badRequest('缺少 jobId 参数');

  const job = await jobStore.get(jobId);
  if (!job) return badRequest('找不到对应的任务，可能已过期');

  return successResponse(job);
});
