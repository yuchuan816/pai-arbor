import { type NextRequest } from 'next/server';
import { deleteSession, updateSessionTitle } from '@/services/sessions.service';
import { withApiHandler, successResponse, badRequest } from '@/lib/api-handler';
import { getHistoryPage, PAGE_SIZE } from '@/services/message.service';

interface SessionParams {
  id: string;
}

// 获取指定会话的历史消息列表
export const GET = withApiHandler(
  async (req: NextRequest, context: { params: Promise<SessionParams> }) => {
    const { id: sessionId } = await context.params;

    if (!sessionId) return badRequest('缺少会话 ID');

    const limitParam = req.nextUrl.searchParams.get('limit');
    const before = req.nextUrl.searchParams.get('before') ?? undefined;
    const limit = limitParam ? Number(limitParam) : PAGE_SIZE;

    const page = await getHistoryPage(sessionId, {
      limit: Number.isFinite(limit) && limit > 0 ? limit : PAGE_SIZE,
      before,
    });

    return successResponse(page);
  },
);

// 更新指定会话标题
export const PATCH = withApiHandler(
  async (req: NextRequest, context: { params: Promise<SessionParams> }) => {
    const { id: sessionId } = await context.params;

    if (!sessionId) return badRequest('缺少会话 ID');

    let title: string | undefined;
    try {
      const body = await req.json();
      title = body.title;
    } catch {
      return badRequest('请求体格式无效');
    }

    if (typeof title !== 'string' || !title.trim()) {
      return badRequest('标题不能为空');
    }

    const updated = await updateSessionTitle(sessionId, title);

    return successResponse(updated);
  },
);

// 删除指定会话
export const DELETE = withApiHandler(
  async (req: NextRequest, context: { params: Promise<SessionParams> }) => {
    const { id: sessionId } = await context.params;

    if (!sessionId) return badRequest('缺少会话 ID');

    await deleteSession(sessionId);

    return successResponse({ message: '会话删除成功' });
  },
);
