import { type NextRequest } from 'next/server';
import { getSessions, createSession } from '@/services/sessions.service';
import { withApiHandler, successResponse } from '@/lib/api-handler';

// 获取所有会话
export const GET = withApiHandler(async () => {
  const sessions = await getSessions();
  return successResponse(sessions);
});

// 新建会话
export const POST = withApiHandler(async (req: NextRequest) => {
  let title: string | undefined;
  try {
    const body = await req.json();
    title = body.title;
  } catch {}

  const newSession = await createSession(title);
  return successResponse(newSession);
});
