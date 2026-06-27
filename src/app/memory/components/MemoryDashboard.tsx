'use client';

import Link from 'next/link';
import { cn } from '@/lib/client/cn';
import { useConsolidation } from '@/app/memory/hooks/useConsolidation';
import { useCompleteSession } from '@/app/memory/hooks/useCompleteSession';
import { useMemoryList } from '@/app/memory/hooks/useMemoryList';
import type { JobStatus } from '@/types/consolidation-job';

const STATUS_LABELS: Record<JobStatus, string> = {
  pending: '等待中',
  running: '运行中',
  completed: '已完成',
  failed: '失败',
};

const STATUS_STYLES: Record<JobStatus, string> = {
  pending: 'bg-amber-100 text-amber-800',
  running: 'bg-blue-100 text-blue-800',
  completed: 'bg-emerald-100 text-emerald-800',
  failed: 'bg-red-100 text-red-800',
};

const TYPE_LABELS = {
  preference: '偏好',
  event: '事件',
  fact: '事实',
} as const;

export function MemoryDashboard() {
  const { job, start, reset, isStarting, isRunning } = useConsolidation();
  const { complete, isCompleting, result: completeResult } = useCompleteSession();
  const { memories, isLoading, refetch } = useMemoryList();

  const handleStart = async () => {
    await start();
  };

  const handleComplete = async () => {
    await complete();
  };

  return (
    <div className={cn('flex h-full flex-col bg-zinc-50')}>
      <header
        className={cn(
          'flex shrink-0 items-center justify-between border-b border-zinc-200 bg-white px-4 py-3',
        )}
      >
        <h1 className={cn('text-base font-medium text-zinc-900')}>记忆整理</h1>
        <Link href="/chat" className={cn('text-sm text-zinc-500 hover:text-zinc-900')}>
          返回聊天
        </Link>
      </header>

      <main className={cn('flex-1 overflow-y-auto p-4')}>
        <div className={cn('mx-auto flex max-w-2xl flex-col gap-4')}>
          <section className={cn('rounded-xl border border-zinc-200 bg-white p-4 shadow-sm')}>
            <h2 className={cn('mb-3 text-sm font-medium text-zinc-900')}>话题完结</h2>
            <p className={cn('mb-4 text-sm text-zinc-500')}>
              将当前聊天会话标记为已完结，之后才能被记忆整理扫描。建议操作顺序：先完结话题，再开始记忆整理。
            </p>

            <div className={cn('mb-4 flex flex-wrap items-end gap-3')}>
              <button
                type="button"
                onClick={handleComplete}
                disabled={isCompleting}
                className={cn(
                  'rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50',
                )}
              >
                {isCompleting ? '处理中...' : '完结当前话题'}
              </button>
            </div>

            {completeResult && (
              <p className={cn('text-sm text-emerald-700')}>
                {completeResult.alreadyCompleted
                  ? '当前话题已是完结状态'
                  : `已完结话题（会话 ID: ${completeResult.sessionId}）`}
              </p>
            )}
          </section>

          <section className={cn('rounded-xl border border-zinc-200 bg-white p-4 shadow-sm')}>
            <h2 className={cn('mb-3 text-sm font-medium text-zinc-900')}>启动整理</h2>
            <p className={cn('mb-4 text-sm text-zinc-500')}>
              扫描所有已完结（status=completed）且未整理（isConsolidated=false）的话题消息，提取用户记忆并写入
              user_memory_base 向量库。整理过程为异步任务，可在下方查看进度。
            </p>

            <div className={cn('mb-4 flex flex-wrap items-end gap-3')}>
              <button
                type="button"
                onClick={handleStart}
                disabled={isStarting || isRunning}
                className={cn(
                  'rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50',
                )}
              >
                {isStarting ? '启动中...' : isRunning ? '整理中...' : '开始记忆整理'}
              </button>

              {job && !isRunning && (
                <button
                  type="button"
                  onClick={reset}
                  className={cn(
                    'rounded-lg border border-zinc-200 px-4 py-2 text-sm text-zinc-600 transition hover:bg-zinc-50',
                  )}
                >
                  清除任务状态
                </button>
              )}
            </div>
          </section>

          {job && (
            <section className={cn('rounded-xl border border-zinc-200 bg-white p-4 shadow-sm')}>
              <div className={cn('mb-3 flex items-center justify-between gap-3')}>
                <h2 className={cn('text-sm font-medium text-zinc-900')}>任务状态</h2>
                <span
                  className={cn(
                    'rounded-full px-2.5 py-0.5 text-xs font-medium',
                    STATUS_STYLES[job.status],
                  )}
                >
                  {STATUS_LABELS[job.status]}
                </span>
              </div>

              <p className={cn('mb-2 text-sm text-zinc-600')}>{job.progress}</p>
              <p className={cn('mb-4 text-xs text-zinc-400')}>任务 ID: {job.id}</p>

              {job.result && (
                <p className={cn('mb-4 text-sm text-zinc-500')}>
                  已整理消息 {job.result.consolidatedMessageCount} 条，留待下次{' '}
                  {job.result.unfinishedMessageCount} 条
                </p>
              )}

              {job.result && job.result.memories.length > 0 && (
                <div className={cn('space-y-2')}>
                  <p className={cn('text-sm font-medium text-zinc-700')}>
                    本次提取 {job.result.memoriesExtracted} 条记忆
                  </p>
                  <ul className={cn('space-y-2')}>
                    {job.result.memories.map((memory, index) => (
                      <li
                        key={`${memory.text}-${index}`}
                        className={cn('rounded-lg bg-zinc-50 px-3 py-2 text-sm text-zinc-700')}
                      >
                        <span
                          className={cn(
                            'mr-2 inline-block rounded bg-zinc-200 px-1.5 py-0.5 text-xs text-zinc-600',
                          )}
                        >
                          {TYPE_LABELS[memory.type]}
                        </span>
                        {memory.text}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </section>
          )}

          <section className={cn('rounded-xl border border-zinc-200 bg-white p-4 shadow-sm')}>
            <div className={cn('mb-3 flex items-center justify-between gap-3')}>
              <h2 className={cn('text-sm font-medium text-zinc-900')}>已存储记忆</h2>
              <button
                type="button"
                onClick={() => void refetch()}
                className={cn('text-sm text-zinc-500 hover:text-zinc-900')}
              >
                刷新
              </button>
            </div>

            {isLoading && <p className={cn('text-sm text-zinc-500')}>加载中...</p>}
            {!isLoading && memories.length === 0 && (
              <p className={cn('text-sm text-zinc-500')}>暂无记忆记录。</p>
            )}

            {!isLoading && memories.length > 0 && (
              <ul className={cn('space-y-2')}>
                {memories.map((memory, index) => (
                  <li
                    key={`${memory}-${index}`}
                    className={cn('rounded-lg bg-zinc-50 px-3 py-2 text-sm text-zinc-700')}
                  >
                    {memory}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
