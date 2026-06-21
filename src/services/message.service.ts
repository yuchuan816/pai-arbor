// 基于 Prisma 的 MySQL 存储服务
import { prisma } from '@/lib/prisma';
import type { InputJsonValue } from '@prisma/client/runtime/client';
import type { UIDataTypes, UIMessage } from 'ai';

export const PAGE_SIZE = 10;
export const CONTEXT_MESSAGE_LIMIT = 5;

export async function getContextMessages(
  sessionId: string,
  limit = CONTEXT_MESSAGE_LIMIT,
): Promise<UIMessage[]> {
  const items = await prisma.message.findMany({
    where: { sessionId },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });

  return items.reverse().map((row) => ({
    id: row.id,
    role: row.role as UIMessage['role'],
    parts: row.parts as UIMessage['parts'],
  }));
}

export async function getHistoryPage(
  sessionId: string,
  options: { limit?: number; before?: string } = {},
) {
  const limit = options.limit ?? PAGE_SIZE;

  async function hasOlderMessages(oldestCreatedAt: Date) {
    const count = await prisma.message.count({
      where: {
        sessionId,
        createdAt: { lt: oldestCreatedAt },
      },
    });
    return count > 0;
  }

  if (options.before) {
    const cursor = await prisma.message.findFirst({
      where: { id: options.before, sessionId },
    });

    if (!cursor) {
      return { messages: [], hasMore: false };
    }

    const items = await prisma.message.findMany({
      where: {
        sessionId,
        createdAt: { lt: cursor.createdAt },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    const messages = items.reverse();
    const hasMore =
      messages.length === limit &&
      messages.length > 0 &&
      (await hasOlderMessages(messages[0].createdAt));

    return { messages, hasMore };
  }

  const items = await prisma.message.findMany({
    where: { sessionId },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });

  const messages = items.reverse();
  const hasMore =
    messages.length > 0 &&
    messages.length === limit &&
    (await hasOlderMessages(messages[0].createdAt));

  return { messages, hasMore };
}

/**
 * 保存助手回复并更新会话时间（内部事务控制）
 */
export async function saveAssistantResponse(sessionId: string, parts: UIDataTypes[]) {
  return await prisma.$transaction([
    prisma.message.create({
      data: {
        sessionId,
        role: 'assistant',
        parts: parts as InputJsonValue,
      },
    }),
    prisma.chatSession.update({
      where: { id: sessionId },
      data: { updatedAt: new Date() },
    }),
  ]);
}
