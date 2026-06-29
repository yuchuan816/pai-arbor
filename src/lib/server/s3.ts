// lib/s3.ts
import { S3Client } from '@aws-sdk/client-s3';
import { env } from '@/lib/server/env';

export const s3Client = new S3Client({
  endpoint: env.MINIO_ENDPOINT,
  region: 'us-east-1',
  credentials: {
    accessKeyId: env.MINIO_ACCESS_KEY,
    secretAccessKey: env.MINIO_SECRET_KEY,
  },
  forcePathStyle: true,
});
