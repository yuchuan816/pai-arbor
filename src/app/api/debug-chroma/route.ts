import { type NextRequest } from 'next/server';
import {
  getCollectionInfo,
  listAllCollections,
  insertTestData,
  deleteCollection,
  resetCollection,
} from '@/services/debug-chroma.service';
import { badRequest, successResponse, withApiHandler } from '@/lib/server/api-handler';

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
export const POST = withApiHandler(async (req: NextRequest) => {
  const { name, dataArray } = await req.json();

  if (!name) badRequest('缺少 name 参数');
  if (!(dataArray?.length > 0)) badRequest('数据数组不能为空');

  const result = await insertTestData(name, dataArray);
  return successResponse(result);
});

/**
 * 【DELETE】删除指定集合
 * - /api/debug-chroma?name=xxx
 */
export const DELETE = withApiHandler(async (req: NextRequest) => {
  const name = req.nextUrl.searchParams.get('name');
  const action = req.nextUrl.searchParams.get('action');
  if (!name) badRequest('缺少 name 参数');

  if (action === 'reset') {
    const result = await resetCollection(name);
    return successResponse({
      message: `集合 ${name} 中的数据已成功清空（集合本身已保留）。`,
      result,
    });
  }

  const result = await deleteCollection(name);
  return successResponse(result);
});
