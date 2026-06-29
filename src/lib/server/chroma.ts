import { ChromaClient } from 'chromadb';
import { OllamaEmbeddingFunction } from '@/lib/server/embeddings';
import { env } from '@/lib/server/env';

let sharedEmbed: OllamaEmbeddingFunction | undefined;

export function getOllamaEmbeddingFunction(): OllamaEmbeddingFunction {
  sharedEmbed ??= new OllamaEmbeddingFunction({ model: env.OLLAMA_EMBED_MODEL });
  return sharedEmbed;
}

const chromaClientSingleton = () => {
  return new ChromaClient({
    host: env.CHROMA_HOST,
    port: env.CHROMA_PORT,
  });
};

declare const globalThis: {
  chromaGlobal?: ReturnType<typeof chromaClientSingleton>;
} & typeof global;

export const chromaClient = globalThis.chromaGlobal ?? chromaClientSingleton();

if (env.NODE_ENV !== 'production') {
  globalThis.chromaGlobal = chromaClient;
}
