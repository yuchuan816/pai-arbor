// src/lib/ollama-provider.ts
import { extractJsonMiddleware, wrapLanguageModel } from 'ai';
import { createOllama } from 'ollama-ai-provider-v2';

const getBaseURL = () => {
  const host = process.env.OLLAMA_HOST;
  if (!host) return 'http://127.0.0.1:11434/api';
  return host.endsWith('/api') ? host : `http://${host}/api`;
};

export const ollamaProvider = createOllama({
  baseURL: getBaseURL(),
});

/** 包一层 extractJsonMiddleware，用于需要结构化 JSON 输出的场景（如记忆整理）。 */
export function getStructuredOllamaModel(modelId: string) {
  return wrapLanguageModel({
    model: ollamaProvider(modelId),
    middleware: extractJsonMiddleware(),
  });
}