import { prisma } from '@/lib/server/prisma';

/**
 * 创建新的聊天会话
 * @param title 可选，默认"新对话"
 */
export async function createSession(title?: string) {
  return await prisma.chatSession.create({
    data: {
      title: title?.trim() ?? '新对话',
    },
  });
}

/**
 * 获取或创建唯一的默认会话（单一信息流）
 */
export async function getOrCreateDefaultSession() {
  const existing = await prisma.chatSession.findFirst({
    orderBy: { createdAt: 'asc' },
  });

  if (existing) return existing;

  return createSession('pai-arbor');
}
