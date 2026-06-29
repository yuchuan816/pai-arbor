// services/file.service.ts
import { prisma } from '@/lib/server/prisma';
import { s3Client } from '@/lib/server/s3';
import { env } from '@/lib/server/env';
import { PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';

/**
 * 在 MySQL 记录元数据并嵌套创建切片占位符，同时上传至 MinIO
 */
export async function createFileRecord(params: {
  id: string;
  fileName: string;
  fileSize: number;
  fileBuffer: Buffer;
  textChunksCount: number;
}) {
  const ossKey = `markdowns/${params.id}-${params.fileName}`;

  // 上传至 OSS
  await s3Client.send(
    new PutObjectCommand({
      Bucket: env.MINIO_BUCKET_NAME,
      Key: ossKey,
      Body: params.fileBuffer,
      ContentType: 'text/markdown',
    }),
  );

  // 写入 MySQL (此时仅生成带有 UUID 的 Chunk 骨架，内容 preview 选填)
  return await prisma.file.create({
    data: {
      id: params.id,
      fileName: params.fileName,
      ossKey: ossKey,
      fileSize: params.fileSize,
      chunks: {
        create: Array.from({ length: params.textChunksCount }).map((_, index) => ({
          chunkIndex: index,
          contentPreview: `Chunk ${index} pending vectorization`,
        })),
      },
    },
    include: { chunks: true },
  });
}

export async function deleteFileRecord(fileId: string) {
  const file = await prisma.file.findUnique({ where: { id: fileId } });
  if (!file) return;

  // 清理 OSS
  await s3Client.send(
    new DeleteObjectCommand({
      Bucket: env.MINIO_BUCKET_NAME,
      Key: file.ossKey,
    }),
  );
  // 清理 MySQL (依靠 onDelete: Cascade 联动清理 chunks)
  await prisma.file.delete({ where: { id: fileId } });
}
