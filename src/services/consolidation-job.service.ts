import type { InputJsonValue } from '@prisma/client/runtime/client';
import { prisma } from '@/lib/server/prisma';
import type {
  ConsolidationJob,
  ConsolidationJobSnapshot,
  JobStatus,
} from '@/types/consolidation-job';

const MAX_JOBS = 20;

function toInputJsonValue(value: unknown): InputJsonValue {
  return value as InputJsonValue;
}

function toConsolidationJob(row: {
  id: string;
  status: string;
  progress: string;
  error: string | null;
  result: unknown;
  snapshot: unknown;
  startedAt: Date;
  completedAt: Date | null;
}): ConsolidationJob {
  return {
    id: row.id,
    status: row.status as JobStatus,
    startedAt: row.startedAt.getTime(),
    completedAt: row.completedAt?.getTime(),
    progress: row.progress,
    error: row.error ?? undefined,
    result: (row.result as ConsolidationJob['result']) ?? undefined,
    snapshot: (row.snapshot as ConsolidationJobSnapshot) ?? undefined,
  };
}

export async function createConsolidationJob(id: string): Promise<ConsolidationJob> {
  const row = await prisma.consolidationJob.create({
    data: {
      id,
      status: 'pending',
      progress: '等待开始...',
    },
  });

  return toConsolidationJob(row);
}

export async function getConsolidationJob(id: string): Promise<ConsolidationJob | undefined> {
  const row = await prisma.consolidationJob.findUnique({ where: { id } });
  return row ? toConsolidationJob(row) : undefined;
}

export async function updateConsolidationJob(
  id: string,
  patch: Partial<ConsolidationJob>,
): Promise<void> {
  const existing = await prisma.consolidationJob.findUnique({ where: { id } });
  if (!existing) return;

  const data: {
    status?: string;
    progress?: string;
    error?: string | null;
    result?: InputJsonValue;
    snapshot?: InputJsonValue;
    completedAt?: Date | null;
  } = {};

  if (patch.status !== undefined) data.status = patch.status;
  if (patch.progress !== undefined) data.progress = patch.progress;
  if (patch.error !== undefined) data.error = patch.error;
  if (patch.result !== undefined) {
    data.result = toInputJsonValue(patch.result);
  }
  if (patch.completedAt !== undefined) {
    data.completedAt = patch.completedAt ? new Date(patch.completedAt) : null;
  }
  if (patch.snapshot !== undefined) {
    const previous = (existing.snapshot ?? {}) as ConsolidationJobSnapshot;
    data.snapshot = toInputJsonValue({ ...previous, ...patch.snapshot });
  }

  await prisma.consolidationJob.update({ where: { id }, data });
}

/** 保留最近 MAX_JOBS 条记录，防止无限增长 */
export async function pruneConsolidationJobs(): Promise<void> {
  const staleJobs = await prisma.consolidationJob.findMany({
    orderBy: { startedAt: 'desc' },
    select: { id: true },
    skip: MAX_JOBS,
  });

  if (staleJobs.length === 0) return;

  await prisma.consolidationJob.deleteMany({
    where: { id: { in: staleJobs.map((job) => job.id) } },
  });
}

/** 创建整理任务并清理过期记录 */
export async function prepareConsolidationJob(id: string): Promise<ConsolidationJob> {
  const job = await createConsolidationJob(id);
  await pruneConsolidationJobs();
  return job;
}
