import { type NextRequest } from 'next/server';
import { withApiHandler, successResponse, badRequest } from '@/lib/server/api-handler';
import { softDeleteSessionMessages } from '@/services/message.service';

interface SessionParams {
  id: string;
}

export const DELETE = withApiHandler(
  async (_req: NextRequest, context: { params: Promise<SessionParams> }) => {
    const { id: sessionId } = await context.params;

    if (!sessionId) return badRequest('缺少会话 ID');

    const result = await softDeleteSessionMessages(sessionId);

    return successResponse({ count: result.count });
  },
);
