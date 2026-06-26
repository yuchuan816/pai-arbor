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

/**
 * 将默认会话标记为已完结，供记忆整理 Worker 扫描。
 * 幂等：已是 completed 时直接返回，不报错。
 */
export async function completeDefaultSession() {
  const session = await getOrCreateDefaultSession();

  if (session.status === 'completed') {
    return { session, alreadyCompleted: true };
  }

  const updated = await prisma.chatSession.update({
    where: { id: session.id },
    data: { status: 'completed' },
  });

  return { session: updated, alreadyCompleted: false };
}
