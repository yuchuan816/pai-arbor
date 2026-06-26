import { type NextRequest } from 'next/server';
import { successResponse, withApiHandler } from '@/lib/server/api-handler';
import { VectorService } from '@/services/vector.service';

const vectorService = new VectorService();
const DEFAULT_QUERY = '用户信息';
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

export const GET = withApiHandler(async (req: NextRequest) => {
  const query = req.nextUrl.searchParams.get('query')?.trim() || DEFAULT_QUERY;
  const rawLimit = Number(req.nextUrl.searchParams.get('limit') ?? DEFAULT_LIMIT);
  const limit = Math.min(Math.max(1, rawLimit), MAX_LIMIT);

  const memories = await vectorService.queryMemory(query, limit);

  return successResponse({ memories });
});
