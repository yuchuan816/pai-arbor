// 基于 Prisma 的 MySQL 存储服务
import { prisma } from '@/lib/prisma';
import type { InputJsonValue } from '@prisma/client/runtime/client';
import type { UIDataTypes } from 'ai';

// 获取最近的对话上下文
export async function getHistory(sessionId: string, limit = 6) {
  return await prisma.message.findMany({
    where: { sessionId },
    orderBy: { createdAt: 'asc' },
    take: -limit,
  });
}

// 原子化持久化 AI 的最终回答与深度思考链
export async function saveAssistantMessage(sessionId: string, parts: string, reasoning: string) {
  return await prisma.message.create({
    data: {
      sessionId,
      role: 'assistant',
      parts,
      reasoning: reasoning,
    },
  });
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
