import { type NextRequest } from 'next/server';
import {
  getCollectionInfo,
  listAllCollections,
  initTestCollection,
  deleteCollection,
} from '@/services/debug-chroma.service';
import { badRequest, successResponse, withApiHandler } from '@/lib/api-handler';

/**
 * 【GET】获取数据
 * - /api/debug-chroma            -> 查看所有集合
 * - /api/debug-chroma?name=xxx   -> 查看特定集合详情
 */
export const GET = withApiHandler(async (req: NextRequest) => {
  const name = req.nextUrl.searchParams.get('name');
  const pageSize = Number(req.nextUrl.searchParams.get('pageSize')) ?? 10;
  const result = name ? await getCollectionInfo(name, pageSize) : await listAllCollections();
  return successResponse(result);
});

/**
 * 【POST】初始化/添加测试集合与数据
 * - /api/debug-chroma
 */
export const POST = withApiHandler(async () => {
  const result = await initTestCollection();
  return successResponse(result);
});

/**
 * 【DELETE】删除指定集合
 * - /api/debug-chroma?name=xxx
 */
export const DELETE = withApiHandler(async (req: NextRequest) => {
  const name = req.nextUrl.searchParams.get('name');
  if (!name) return badRequest('缺少 name 参数');

  const result = await deleteCollection(name);
  return successResponse(result);
});
