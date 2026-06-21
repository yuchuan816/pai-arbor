// src/lib/ollama.provider.ts
import { createOllama } from 'ollama-ai-provider-v2';

const getBaseURL = () => {
  const host = process.env.OLLAMA_HOST; 
  if (!host) return 'http://127.0.0.1:11434/api';
  return host.endsWith('/api') ? host : `http://${host}/api`;
};

export const ollamaProvider = createOllama({
  baseURL: getBaseURL(),
});