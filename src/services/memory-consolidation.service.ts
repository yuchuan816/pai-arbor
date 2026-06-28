import { generateText, Output } from 'ai';
import { randomUUID } from 'crypto';
import { z } from 'zod';
import { prisma } from '@/lib/server/prisma';
import { getStructuredOllamaModel } from '@/lib/server/ollama';
import { logger } from '@/lib/server/logger';
import { VectorService } from '@/services/vector.service';
import { updateConsolidationJob } from '@/services/consolidation-job.service';
import type { ConsolidationJob, ExtractedMemory } from '@/types/consolidation-job';

const vectorService = new VectorService();
const ollamaModel = process.env.OLLAMA_MODEL ?? '';
const SESSION_STATUS_COMPLETED = 'completed';
const DEFAULT_USER_ID = 'default';

/** 长期保留：输入格式、类型定义、分段与完整性等核心规则 */
const MEMORY_EXTRACTION_PROMPT_CORE = `
你是一个高度专业、冷酷理性的记忆提炼专家。你的唯一任务是分析用户与 AI 助理（名叫阿尔博）之间的对话，将已聊完的话题提炼为长期记忆，并精准标注每条消息的处理状态。

【输入格式】
对话由若干 <message id="消息UUID" seq="序号">角色: 内容</message> 标签组成。
- id：消息的唯一标识，回填时必须原样使用，不得编造。
- seq：从 0 开始的顺序序号，与对话时间顺序一致；仅作阅读辅助，回填仍以 id 为准。

【核心提取准则】
1. 提取有持久价值的信息，放入 finished_memories：
  - preference（偏好）：用户的兴趣、喜好、厌恶。
  - event（事件）：已经发生或计划发生的重大日程、关键生活动态。
  - fact（事实）：用户的硬性基本资料、职业、长期状态。

2. 记忆 text 规范：
  - 不得把日常寒暄、口水话、纯应答（如「好的」「嗯嗯」）单独写成记忆；这类消息的 id 可列入所属话题块的 source_message_ids，但不得单独占一条 finished_memory。
  - text 必须是语义完整的、以"用户"为主语的简短陈述句，严禁使用"我"、"你"等代词。
  - text 提炼用户侧持久事实；阿尔博的收尾回复不必写进 text，但必须写进 source_message_ids。
  - 同一话题块内多轮来回的信息，应合并提炼为一条 text（必要时可用分号连接多个要点），禁止拆成多条。

3. 【按时间顺序与 A-B-A 分段】
  - finished_memories 必须严格按照对话时间顺序排列（先发生的条目在前）。
  - 同一话题若在对话中先聊完、中间聊了别的话题、之后又回到该话题（话题 A → 话题 B → 话题 A），才拆成多条 finished_memory 分别总结；允许对同一主题重复总结，禁止把 B 的 id 混入 A。
  - 每条 finished_memory 只对应一个连续、未跨话题的消息片段；source_message_ids 应覆盖该片段内全部相关消息（含片段内寒暄），不得包含其他话题块的消息 id。
  - 每个话题块的 source_message_ids 必须包含该块内每一轮消息的 id（用户与阿尔博），从该块第一条到最后一条，不得跳过中间任意一条。
  - 必须包含该话题块最后一条阿尔博的回复（收尾、确认、告别等），即使该内容不写进 text。
  - 回填自检：该话题块内所有消息的 seq 应落在该条 source_message_ids 对应 seq 的 min–max 闭区间内。

4. 【话题完整性控制】
  - 只有已经交待完整、用户已转移话题的内容，才能进入 finished_memories。
  - 对话末尾话题聊到一半、信息不全时，严禁提炼，不得将其 id 放入任何 finished_memory 的 source_message_ids。
  - 若无任何已完结、有持久价值的话题，finished_memories 应为 []。

现在，请开始分析以下被 <conversation> 标签包裹的对话内容：
`;

/**
 * 弱本地模型专用约束。升级云端模型后删除本常量，并改为：
 * const MEMORY_EXTRACTION_PROMPT = MEMORY_EXTRACTION_PROMPT_CORE;
 */
const MEMORY_EXTRACTION_PROMPT_LOCAL_MODEL_GUARDRAILS = `
【弱模型额外约束】
- 禁止将话题切换、结束、无实质信息的元描述（如「用户结束了一个话题」）单独写成 finished_memory；若无 preference/event/fact 级持久价值，不要为该块产出记忆。
- 同一会话内连续、同类的轻松话题（如连续讲笑话）应合并为一条 finished_memory，禁止每个小片段各写一条。
- text 必须以「用户」为主语；阿尔博的行为仅作背景，用分号附在用户陈述之后，不得让 text 以阿尔博为主语。
- 若整段对话仅有寒暄、笑话等且无持久价值，finished_memories 应为 []。
`;

const MEMORY_EXTRACTION_PROMPT = [
  MEMORY_EXTRACTION_PROMPT_CORE,
  MEMORY_EXTRACTION_PROMPT_LOCAL_MODEL_GUARDRAILS,
].join('\n');

const consolidationOutputSchema = z.object({
  finished_memories: z.array(
    z.object({
      text: z.string(),
      type: z.enum(['preference', 'event', 'fact']),
      source_message_ids: z.array(z.string()),
    }),
  ),
});

type ConsolidationOutput = z.infer<typeof consolidationOutputSchema>;

type MemoryType = ExtractedMemory['type'];

const VALID_MEMORY_TYPES = new Set<MemoryType>(['preference', 'event', 'fact']);

interface FinishedMemory {
  text: string;
  type: MemoryType;
  sourceMessageIds: string[];
}

interface ConsolidationParseResult {
  finishedMemories: FinishedMemory[];
}

interface TranscriptResult {
  transcript: string;
  messageIds: string[];
  userId: string;
}

interface MemoryRecord {
  id: string;
  userId: string;
  text: string;
  type: MemoryType;
}

interface ValidatedConsolidation {
  finishedMemories: FinishedMemory[];
  consolidatedIds: string[];
  deferredIds: string[];
}

function isMemoryType(value: string): value is MemoryType {
  return VALID_MEMORY_TYPES.has(value as MemoryType);
}

function parseStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === 'string' && item.length > 0);
}

function parseFinishedMemoryItem(item: unknown): FinishedMemory | null {
  if (typeof item !== 'object' || item === null) return null;

  const record = item as Record<string, unknown>;
  const text = typeof record.text === 'string' ? record.text.trim() : '';
  const type = record.type;
  const sourceMessageIds = parseStringArray(record.source_message_ids);

  if (!text || typeof type !== 'string' || !isMemoryType(type) || sourceMessageIds.length === 0) {
    return null;
  }

  return { text, type, sourceMessageIds };
}

function mapConsolidationOutput(raw: ConsolidationOutput): ConsolidationParseResult {
  const finishedMemories = raw.finished_memories
    .map(parseFinishedMemoryItem)
    .filter((item): item is FinishedMemory => item !== null);

  return { finishedMemories };
}

/**
 * 校验模型输出，并按 globalMax 前缀标记 consolidated：
 * globalMax = 时间顺序最后一条 finished_memory 的 source 最大下标；
 * consolidatedIds = messageIds[0..globalMax]。
 */
function validateAndMergeIds(
  parsed: ConsolidationParseResult,
  messageIds: string[],
): ValidatedConsolidation {
  const allowedIds = new Set(messageIds);
  const idToIndex = new Map(messageIds.map((id, index) => [id, index]));

  const finishedMemories: FinishedMemory[] = [];

  for (const memory of parsed.finishedMemories) {
    const validSourceIds = memory.sourceMessageIds.filter((id) => allowedIds.has(id));
    const hasInvalidId = validSourceIds.length !== memory.sourceMessageIds.length;

    if (hasInvalidId) {
      logger.warn(
        { memoryText: memory.text },
        '[MemoryConsolidation] 丢弃含非法 source_message_ids 的记忆',
      );
      continue;
    }

    if (validSourceIds.length === 0) continue;

    finishedMemories.push({ ...memory, sourceMessageIds: validSourceIds });
  }

  if (finishedMemories.length === 0) {
    return {
      finishedMemories,
      consolidatedIds: [],
      deferredIds: [...messageIds],
    };
  }

  const lastMemory = finishedMemories[finishedMemories.length - 1];
  const indices = lastMemory.sourceMessageIds
    .map((id) => idToIndex.get(id))
    .filter((index): index is number => index !== undefined);

  if (indices.length === 0) {
    return {
      finishedMemories,
      consolidatedIds: [],
      deferredIds: [...messageIds],
    };
  }

  const globalMax = Math.max(...indices);
  const consolidatedIds = messageIds.slice(0, globalMax + 1);
  const deferredIds = messageIds.slice(globalMax + 1);

  logger.info(
    {
      event: 'llm.consolidation.mark',
      globalMax,
      consolidatedCount: consolidatedIds.length,
      deferredCount: deferredIds.length,
    },
    '[MemoryConsolidation] globalMax 前缀标记',
  );

  return {
    finishedMemories,
    consolidatedIds,
    deferredIds,
  };
}

function formatMessageXml(id: string, seq: number, role: string, parts: unknown): string | null {
  const messageParts = parts as { type: string; text?: string }[];
  const text = messageParts
    .filter((part) => part.type === 'text' && part.text)
    .map((part) => part.text)
    .join(' ')
    .trim();

  if (!text) return null;

  const label = role === 'user' ? '用户' : '阿尔博';
  return `<message id="${id}" seq="${seq}">${label}: ${text}</message>`;
}

/**
 * 捞取所有未整理、且所属会话已完结的消息，按时间正序构建带 id + seq 的 XML transcript。
 */
async function buildTranscript(): Promise<TranscriptResult | null> {
  const messages = await prisma.message.findMany({
    where: {
      isConsolidated: false,
      session: { status: SESSION_STATUS_COMPLETED },
    },
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      role: true,
      parts: true,
      session: { select: { userId: true } },
    },
  });

  if (messages.length === 0) return null;

  const messageIds = messages.map((message) => message.id);
  const userId = messages[0]?.session.userId ?? DEFAULT_USER_ID;

  const lines: string[] = [];
  for (let seq = 0; seq < messages.length; seq++) {
    const message = messages[seq];
    const line = formatMessageXml(message.id, seq, message.role, message.parts);
    if (line) lines.push(line);
  }

  return {
    transcript: lines.join('\n'),
    messageIds,
    userId,
  };
}

function buildMemoryRecords(memories: FinishedMemory[], userId: string): MemoryRecord[] {
  return memories.map((memory) => ({
    id: randomUUID(),
    userId,
    text: memory.text,
    type: memory.type,
  }));
}

function toJobMemories(memories: FinishedMemory[]): ExtractedMemory[] {
  return memories.map(({ text, type }) => ({ text, type }));
}

type ConsolidationResult = NonNullable<ConsolidationJob['result']>;

/** 构造空的整理结果（无可提取记忆、无已标记消息）。 */
function emptyResult(deferredMessageCount = 0): ConsolidationResult {
  return {
    memoriesExtracted: 0,
    memories: [],
    consolidatedMessageCount: 0,
    unfinishedMessageCount: deferredMessageCount,
  };
}

/** 将 job 标记为已完成并写入进度与结果。 */
function completeJob(
  job: ConsolidationJob,
  progress: string,
  result: ConsolidationResult,
  snapshot?: ConsolidationJob['snapshot'],
): Promise<void> {
  return updateConsolidationJob(job.id, {
    status: 'completed',
    completedAt: Date.now(),
    progress,
    result,
    ...(snapshot !== undefined ? { snapshot } : {}),
  });
}

/** 将 job 标记为失败并记录错误信息。 */
function failJob(job: ConsolidationJob, errorMessage: string): Promise<void> {
  return updateConsolidationJob(job.id, {
    status: 'failed',
    completedAt: Date.now(),
    progress: '记忆整理失败，可稍后重试。',
    error: errorMessage,
  });
}

/** 调用模型从 transcript 提取记忆，LLM 上下文写入 Loki，job snapshot 仅保留 messageIds/userId。 */
async function extractMemoriesFromTranscript(
  job: ConsolidationJob,
  transcript: string,
  messageIds: string[],
  userId: string,
): Promise<{ parsed: ConsolidationParseResult } | { error: string }> {
  await updateConsolidationJob(job.id, {
    progress: `正在调用模型提取记忆（${messageIds.length} 条消息）...`,
    snapshot: { messageIds, userId },
  });

  const userPrompt = `<conversation>\n${transcript}\n</conversation>`;

  logger.info({
    event: 'llm.consolidation.request',
    jobId: job.id,
    model: ollamaModel,
    messageIds,
    messageCount: messageIds.length,
    transcript,
    promptId: 'memory-extraction',
  });

  try {
    const { output, text } = await generateText({
      model: getStructuredOllamaModel(ollamaModel),
      output: Output.object({ schema: consolidationOutputSchema }),
      system: MEMORY_EXTRACTION_PROMPT,
      prompt: userPrompt,
      maxRetries: 2,
    });

    await updateConsolidationJob(job.id, {
      progress: '正在解析模型输出...',
    });

    logger.info({
      event: 'llm.consolidation.response',
      jobId: job.id,
      model: ollamaModel,
      messageIds,
      response: text,
      output,
    });

    if (!output) {
      return { error: '模型输出格式无效，无法解析' };
    }

    return { parsed: mapConsolidationOutput(output) };
  } catch (err) {
    logger.warn({ event: 'llm.consolidation.failed', jobId: job.id, err }, '结构化输出生成失败');
    return { error: '模型输出格式无效，无法解析' };
  }
}

/** 将记忆写入 MySQL 与向量库，并标记对应消息为已整理。 */
async function persistConsolidation(
  job: ConsolidationJob,
  finishedMemories: FinishedMemory[],
  consolidatedIds: string[],
  userId: string,
): Promise<void> {
  const memoryRecords = buildMemoryRecords(finishedMemories, userId);
  const timestamp = Date.now();

  await updateConsolidationJob(job.id, { progress: `正在存储 ${memoryRecords.length} 条记忆...` });

  await prisma.$transaction([
    prisma.message.updateMany({
      where: { id: { in: consolidatedIds } },
      data: {
        isConsolidated: true,
        consolidationJobId: job.id,
      },
    }),
    prisma.userMemory.createMany({
      data: memoryRecords.map((record) => ({
        id: record.id,
        userId: record.userId,
        text: record.text,
        type: record.type,
      })),
    }),
  ]);

  await vectorService.addMemories(
    memoryRecords.map((record) => ({
      id: record.id,
      text: record.text,
      timestamp,
      type: record.type,
    })),
  );
}

/**
 * 记忆整理主流程，由 API 路由以 fire-and-forget 方式调用。
 */
export async function runConsolidation(job: ConsolidationJob): Promise<void> {
  await updateConsolidationJob(job.id, {
    status: 'running',
    progress: '正在读取未整理的已完结话题...',
  });

  try {
    const transcriptResult = await buildTranscript();

    if (!transcriptResult) {
      await completeJob(job, '没有可整理的已完结话题消息。', emptyResult());
      return;
    }

    const { transcript, messageIds, userId } = transcriptResult;

    if (!transcript) {
      await completeJob(
        job,
        `${messageIds.length} 条消息无有效文本，未做任何标记。`,
        emptyResult(),
        { messageIds, userId },
      );
      return;
    }

    const extracted = await extractMemoriesFromTranscript(job, transcript, messageIds, userId);
    if ('error' in extracted) {
      await failJob(job, extracted.error);
      return;
    }

    const { finishedMemories, consolidatedIds, deferredIds } = validateAndMergeIds(
      extracted.parsed,
      messageIds,
    );

    if (finishedMemories.length === 0) {
      await completeJob(
        job,
        `未提取到已完结记忆，${deferredIds.length} 条消息留待下次。`,
        emptyResult(deferredIds.length),
      );
      return;
    }

    if (consolidatedIds.length === 0) {
      await completeJob(
        job,
        `提取到 ${finishedMemories.length} 条记忆但无有效消息可标记，${deferredIds.length} 条留待下次。`,
        {
          memoriesExtracted: finishedMemories.length,
          memories: toJobMemories(finishedMemories),
          consolidatedMessageCount: 0,
          unfinishedMessageCount: deferredIds.length,
        },
      );
      return;
    }

    await persistConsolidation(job, finishedMemories, consolidatedIds, userId);

    const result = {
      memoriesExtracted: finishedMemories.length,
      memories: toJobMemories(finishedMemories),
      consolidatedMessageCount: consolidatedIds.length,
      unfinishedMessageCount: deferredIds.length,
    };

    logger.info({
      event: 'llm.consolidation.complete',
      jobId: job.id,
      memoriesExtracted: result.memoriesExtracted,
      consolidatedMessageCount: result.consolidatedMessageCount,
      unfinishedMessageCount: result.unfinishedMessageCount,
      memories: result.memories,
    });

    await completeJob(
      job,
      `完成！提取 ${finishedMemories.length} 条记忆，标记 ${consolidatedIds.length} 条消息已整理，${deferredIds.length} 条消息留待下次。`,
      result,
    );
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : '未知错误';
    logger.error({ err }, '[MemoryConsolidation] 记忆整理失败');
    await failJob(job, errorMessage);
  }
}
