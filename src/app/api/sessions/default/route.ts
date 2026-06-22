import { getOrCreateDefaultSession } from '@/services/sessions.service';
import { withApiHandler, successResponse } from '@/lib/api-handler';

export const GET = withApiHandler(async () => {
  const session = await getOrCreateDefaultSession();
  return successResponse(session);
});
