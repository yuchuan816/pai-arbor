import fs from 'node:fs';
import path from 'node:path';

const envPath = path.resolve(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
  process.loadEnvFile(envPath);
}

function readEnv(key: string): string | undefined {
  const value = process.env[key]?.trim();
  return value || undefined;
}

function envError(key: string, detail: string): never {
  throw new Error(`❌ [Env Error]: 环境变量 ${key} ${detail}`);
}

function requireStringEnv(key: string): string {
  const value = readEnv(key);
  if (value === undefined) {
    envError(key, '未设置或为空。请检查 .env 或系统环境变量。');
  }
  return value;
}

function requireNumberEnv(key: string): number {
  const raw = requireStringEnv(key);
  const n = Number(raw);
  if (!Number.isFinite(n)) {
    envError(key, `必须是有效数字，当前值为 "${raw}"。`);
  }
  return n;
}

function requireBooleanEnv(key: string): boolean {
  const raw = requireStringEnv(key);
  if (raw !== 'true' && raw !== 'false') {
    envError(key, `必须是 "true" 或 "false"，当前值为 "${raw}"。`);
  }
  return raw === 'true';
}

function buildOllamaBaseURL(): string {
  const host = process.env.OLLAMA_HOST?.trim();
  if (!host) return 'http://127.0.0.1:11434/api';
  return host.endsWith('/api') ? host : `http://${host}/api`;
}

const DATABASE_HOST = requireStringEnv('DATABASE_HOST');
const DATABASE_PORT = requireNumberEnv('DATABASE_PORT');
const DATABASE_USER = requireStringEnv('DATABASE_USER');
const DATABASE_PASSWORD = requireStringEnv('DATABASE_PASSWORD');
const DATABASE_NAME = requireStringEnv('DATABASE_NAME');

export const env = {
  NODE_ENV: requireStringEnv('NODE_ENV'),
  DATABASE_HOST,
  DATABASE_PORT,
  DATABASE_USER,
  DATABASE_PASSWORD,
  DATABASE_NAME,
  DATABASE_URL: `mysql://${DATABASE_USER}:${DATABASE_PASSWORD}@${DATABASE_HOST}:${DATABASE_PORT}/${DATABASE_NAME}`,

  CHROMA_HOST: requireStringEnv('CHROMA_HOST'),
  CHROMA_PORT: requireNumberEnv('CHROMA_PORT'),

  MINIO_ACCESS_KEY: requireStringEnv('MINIO_ACCESS_KEY'),
  MINIO_SECRET_KEY: requireStringEnv('MINIO_SECRET_KEY'),
  MINIO_ENDPOINT: requireStringEnv('MINIO_ENDPOINT'),
  MINIO_BUCKET_NAME: requireStringEnv('MINIO_BUCKET_NAME'),

  LOG_LEVEL: requireStringEnv('LOG_LEVEL'),
  LOKI_URL: requireStringEnv('LOKI_URL'),
  LOG_TO_LOKI: requireBooleanEnv('LOG_TO_LOKI'),

  OLLAMA_MODEL: requireStringEnv('OLLAMA_MODEL'),
  OLLAMA_EMBED_MODEL: requireStringEnv('OLLAMA_EMBED_MODEL'),
  OLLAMA_BASE_URL: buildOllamaBaseURL(),
} as const;
