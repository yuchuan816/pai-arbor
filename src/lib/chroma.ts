import { ChromaClient } from 'chromadb';

const chromaHost = process.env.CHROMA_HOST;
const chromaPort = Number(process.env.CHROMA_PORT);
if (!chromaHost || !chromaPort) {
  throw new Error(
    '❌ [Env Error]: 缺少必要的 Chroma 凭证配置。请检查环境变量 CHROMA_HOST 和 CHROMA_PORT 是否正确注入。',
  );
}

const chromaClientSingleton = () => {
  return new ChromaClient({
    host: chromaHost,
    port: chromaPort,
  });
};

declare const globalThis: {
  chromaGlobal?: ReturnType<typeof chromaClientSingleton>;
} & typeof global;

// 如果全局存在就用全局的，否则新建
export const chromaClient = globalThis.chromaGlobal ?? chromaClientSingleton();

// prod 环境没有热更新，只会创建一遍，所以不需要
if (process.env.NODE_ENV !== 'production') {
  globalThis.chromaGlobal = chromaClient;
}
