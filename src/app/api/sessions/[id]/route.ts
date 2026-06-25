import { type NextRequest } from 'next/server';
import { withApiHandler, successResponse, badRequest } from '@/lib/server/api-handler';
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
