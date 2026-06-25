import { type NextRequest } from 'next/server';
import { importMarkdownFile } from '@/services/knowledge.service';
import { badRequest, successResponse, withApiHandler } from '@/lib/server/api-handler';

export const POST = withApiHandler(async (req: NextRequest) => {
  const formData = await req.formData();
  const file = formData.get('file') as File | null;

  if (!file || !file.name?.endsWith('.md')) {
    return badRequest('请上传有效的 Markdown 文件');
  }

  const result = await importMarkdownFile(file);

  return successResponse(result);
});
