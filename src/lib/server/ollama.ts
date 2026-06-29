// src/lib/ollama-provider.ts
import { extractJsonMiddleware, wrapLanguageModel } from 'ai';
import { createOllama } from 'ollama-ai-provider-v2';
import { env } from '@/lib/server/env';

export const ollamaProvider = createOllama({
  baseURL: env.OLLAMA_BASE_URL,
});

/** 包一层 extractJsonMiddleware，用于需要结构化 JSON 输出的场景（如记忆整理）。 */
export function getStructuredOllamaModel(modelId: string) {
  return wrapLanguageModel({
    model: ollamaProvider(modelId),
    middleware: extractJsonMiddleware(),
  });
}
