import { generateText } from 'ai';
import { randomUUID } from 'crypto';
import { prisma } from '@/lib/server/prisma';
import { ollamaProvider } from '@/lib/server/ollama';
import { VectorService } from '@/services/vector.service';
import { jobStore, type ConsolidationJob, type ExtractedMemory } from '@/lib/server/job-store';

const vectorService = new VectorService();
const ollamaModel = process.env.OLLAMA_MODEL ?? '';
const SESSION_STATUS_COMPLETED = 'completed';
const DEFAULT_USER_ID = 'default';

const MEMORY_EXTRACTION_PROMPT = `你是一个高度专业、冷酷理性的记忆提炼专家。你的唯一任务是分析用户与 AI 助理（名叫阿尔博）之间的对话，将已聊完的话题提炼为长期记忆，并精准标注每条消息的处理状态。

【输入格式】
对话由若干 <message id="消息UUID">角色: 内容</message> 标签组成。你必须严格使用标签上的 id 属性，不得编造或修改任何 id。

【核心提取准则】
1. 提取有持久价值的信息，放入 finished_memories：
   - preference（偏好）：用户的兴趣、喜好、厌恶。
   - event（事件）：已经发生或计划发生的重大日程、关键生活动态。
   - fact（事实）：用户的硬性基本资料、职业、长期状态。

2. 严格过滤垃圾信息：
   - 必须过滤日常寒暄、无意义口水话或纯知识问答。
   - 提取的 text 必须是语义完整的、以"用户"为主语的简短陈述句，严禁使用"我"、"你"等代词。

3. 【话题完整性控制 — 最重要】
   - 只有已经交待完整、用户已转移话题的内容，才能提炼为 finished_memories。
   - 每条 finished_memory 必须通过 source_message_ids 列出支撑该事实的原始消息 id（可多条）。
   - 如果对话末尾有话题聊到一半信息不全（例如用户说"我下周要去北京，但是..."后对话结束），严禁提炼该话题，必须将这些聊到一半的消息 id 放入 unfinished_message_ids。
   - unfinished_message_ids 中的消息不得出现在任何 finished_memory 的 source_message_ids 中。

【输出格式控制】
- 必须且只能输出一个合法的 JSON 对象（不是数组），严格包含 finished_memories 和 unfinished_message_ids 两个字段。
- 拒绝任何 Markdown 代码块包裹，拒绝任何多余的开头语或结束语。
- 如果没有任何已完结话题可提炼，finished_memories 为空数组 []，未完结的消息 id 放入 unfinished_message_ids。

【示例输出】
{"finished_memories":[{"text":"用户对花生过敏","type":"fact","source_message_ids":["msg-uuid-1","msg-uuid-2"]}],"unfinished_message_ids":["msg-uuid-5","msg-uuid-6"]}

现在，请开始分析以下被 <conversation> 标签包裹的对话内容：`;

type MemoryType = ExtractedMemory['type'];

const VALID_MEMORY_TYPES = new Set<MemoryType>(['preference', 'event', 'fact']);

interface FinishedMemory {
  text: string;
  type: MemoryType;
  sourceMessageIds: string[];
}

interface ConsolidationParseResult {
  finishedMemories: FinishedMemory[];
  unfinishedMessageIds: string[];
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
  unfinishedIds: string[];
}

function stripMarkdownFences(text: string): string {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  return fenced ? fenced[1].trim() : text.trim();
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

function parseConsolidationOutput(output: string): ConsolidationParseResult | null {
  const normalized = stripMarkdownFences(output);
  const jsonStart = normalized.indexOf('{');
  const jsonEnd = normalized.lastIndexOf('}');
  if (jsonStart === -1 || jsonEnd === -1 || jsonEnd < jsonStart) return null;

  let raw: unknown;
  try {
    raw = JSON.parse(normalized.slice(jsonStart, jsonEnd + 1));
  } catch (err) {
    console.warn('[MemoryConsolidation] 模型输出 JSON 解析失败:', err);
    return null;
  }

  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return null;

  const record = raw as Record<string, unknown>;
  const rawFinished = Array.isArray(record.finished_memories) ? record.finished_memories : [];
  const finishedMemories = rawFinished
    .map(parseFinishedMemoryItem)
    .filter((item): item is FinishedMemory => item !== null);
  const unfinishedMessageIds = parseStringArray(record.unfinished_message_ids);

  return { finishedMemories, unfinishedMessageIds };
}

function validateAndMergeIds(
  parsed: ConsolidationParseResult,
  allowedIds: Set<string>,
): ValidatedConsolidation {
  const unfinishedIds = parsed.unfinishedMessageIds.filter((id) => allowedIds.has(id));
  const unfinishedSet = new Set(unfinishedIds);

  const finishedMemories: FinishedMemory[] = [];

  for (const memory of parsed.finishedMemories) {
    const validSourceIds = memory.sourceMessageIds.filter((id) => allowedIds.has(id));
    const hasInvalidId = validSourceIds.length !== memory.sourceMessageIds.length;

    if (hasInvalidId) {
      console.warn('[MemoryConsolidation] 丢弃含非法 source_message_ids 的记忆:', memory.text);
      continue;
    }

    if (validSourceIds.length === 0) continue;

    finishedMemories.push({ ...memory, sourceMessageIds: validSourceIds });
  }

  const consolidatedIdSet = new Set<string>();
  for (const memory of finishedMemories) {
    for (const id of memory.sourceMessageIds) {
      if (unfinishedSet.has(id)) {
        console.warn(
          '[MemoryConsolidation] 消息 id 同时出现在 finished 与 unfinished，保留 unfinished:',
          id,
        );
        continue;
      }
      consolidatedIdSet.add(id);
    }
  }

  return {
    finishedMemories,
    consolidatedIds: [...consolidatedIdSet],
    unfinishedIds,
  };
}

function formatMessageXml(id: string, role: string, parts: unknown): string | null {
  const messageParts = parts as { type: string; text?: string }[];
  const text = messageParts
    .filter((part) => part.type === 'text' && part.text)
    .map((part) => part.text)
    .join(' ')
    .trim();

  if (!text) return null;

  const label = role === 'user' ? '用户' : '阿尔博';
  return `<message id="${id}">${label}: ${text}</message>`;
}

/**
 * 捞取所有未整理、且所属会话已完结的消息，按时间正序构建带 id 的 XML transcript。
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

  const lines = messages
    .map((message) => formatMessageXml(message.id, message.role, message.parts))
    .filter(Boolean);

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

function failJob(job: ConsolidationJob, errorMessage: string): Promise<void> {
  return jobStore.update(job.id, {
    status: 'failed',
    completedAt: Date.now(),
    progress: '记忆整理失败，可稍后重试。',
    error: errorMessage,
  });
}

/**
 * Main consolidation runner — called fire-and-forget from the API route.
 */
export async function runConsolidation(job: ConsolidationJob): Promise<void> {
  await jobStore.update(job.id, { status: 'running', progress: '正在读取未整理的已完结话题...' });

  try {
    const transcriptResult = await buildTranscript();

    if (!transcriptResult) {
      await jobStore.update(job.id, {
        status: 'completed',
        completedAt: Date.now(),
        progress: '没有可整理的已完结话题消息。',
        result: {
          memoriesExtracted: 0,
          memories: [],
          consolidatedMessageCount: 0,
          unfinishedMessageCount: 0,
        },
      });
      return;
    }

    const { transcript, messageIds, userId } = transcriptResult;

    if (!transcript) {
      await jobStore.update(job.id, {
        status: 'completed',
        completedAt: Date.now(),
        progress: `${messageIds.length} 条消息无有效文本，未做任何标记。`,
        snapshot: { messageIds, userId },
        result: {
          memoriesExtracted: 0,
          memories: [],
          consolidatedMessageCount: 0,
          unfinishedMessageCount: 0,
        },
      });
      return;
    }

    await jobStore.update(job.id, {
      progress: `正在调用模型提取记忆（${messageIds.length} 条消息）...`,
      snapshot: { messageIds, userId },
    });

    const userPrompt = `<conversation>\n${transcript}\n</conversation>`;

    const { text } = await generateText({
      model: ollamaProvider(ollamaModel),
      system: MEMORY_EXTRACTION_PROMPT,
      prompt: userPrompt,
    });

    await jobStore.update(job.id, {
      progress: '正在解析模型输出...',
      snapshot: {
        messageIds,
        userId,
        rawPayload: {
          model: ollamaModel,
          system: MEMORY_EXTRACTION_PROMPT,
          prompt: userPrompt,
          response: text,
        },
      },
    });

    const parsed = parseConsolidationOutput(text);
    if (!parsed) {
      await failJob(job, '模型输出格式无效，无法解析');
      return;
    }

    const allowedIds = new Set(messageIds);
    const { finishedMemories, consolidatedIds, unfinishedIds } = validateAndMergeIds(
      parsed,
      allowedIds,
    );

    if (finishedMemories.length === 0) {
      await jobStore.update(job.id, {
        status: 'completed',
        completedAt: Date.now(),
        progress: `未提取到已完结记忆，${unfinishedIds.length} 条消息留待下次。`,
        result: {
          memoriesExtracted: 0,
          memories: [],
          consolidatedMessageCount: 0,
          unfinishedMessageCount: unfinishedIds.length,
        },
      });
      return;
    }

    if (consolidatedIds.length === 0) {
      await jobStore.update(job.id, {
        status: 'completed',
        completedAt: Date.now(),
        progress: `提取到 ${finishedMemories.length} 条记忆但无有效消息可标记，${unfinishedIds.length} 条留待下次。`,
        result: {
          memoriesExtracted: finishedMemories.length,
          memories: toJobMemories(finishedMemories),
          consolidatedMessageCount: 0,
          unfinishedMessageCount: unfinishedIds.length,
        },
      });
      return;
    }

    const memoryRecords = buildMemoryRecords(finishedMemories, userId);
    const timestamp = Date.now();

    await jobStore.update(job.id, { progress: `正在存储 ${memoryRecords.length} 条记忆...` });

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

    await jobStore.update(job.id, {
      status: 'completed',
      completedAt: Date.now(),
      progress: `完成！提取 ${finishedMemories.length} 条记忆，标记 ${consolidatedIds.length} 条消息已整理，${unfinishedIds.length} 条消息留待下次。`,
      result: {
        memoriesExtracted: finishedMemories.length,
        memories: toJobMemories(finishedMemories),
        consolidatedMessageCount: consolidatedIds.length,
        unfinishedMessageCount: unfinishedIds.length,
      },
    });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : '未知错误';
    console.error('[MemoryConsolidation] 记忆整理失败:', err);
    await failJob(job, errorMessage);
  }
}
