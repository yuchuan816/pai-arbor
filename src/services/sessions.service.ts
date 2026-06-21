import { prisma } from '@/lib/prisma';

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
 * 删除聊天会话（由于 Prisma 中配置了 onDelete: Cascade，删除 Session 会自动级联删除关联的 Messages）
 * @param sessionId 会话 ID
 */
export async function deleteSession(sessionId: string) {
  // 先确认会话是否存在，防止盲目删除返回错误
  const exists = await prisma.chatSession.findUnique({
    where: { id: sessionId },
  });

  if (!exists) {
    throw new Error('未找到该聊天会话，无法删除');
  }

  return await prisma.chatSession.delete({
    where: { id: sessionId },
  });
}

/**
 * 获取所有会话列表（按更新时间倒序排列，方便前端侧边栏展示）
 */
export async function getSessions() {
  return await prisma.chatSession.findMany({
    orderBy: {
      updatedAt: 'desc',
    },
  });
}
