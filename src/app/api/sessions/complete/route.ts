import { completeDefaultSession } from '@/services/sessions.service';
import { withApiHandler, successResponse } from '@/lib/server/api-handler';

export const POST = withApiHandler(async () => {
  const { session, alreadyCompleted } = await completeDefaultSession();

  return successResponse({
    sessionId: session.id,
    status: session.status,
    alreadyCompleted,
  });
});
