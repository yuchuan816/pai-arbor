// app/api/debug-chroma/service.ts
import { chromaClient } from '@/lib/chroma';
import { OllamaEmbeddingFunction } from '@/lib/embeddings';

const defaultCollectionName = 'doc_knowledge_base';

export async function listAllCollections() {
  const collections = await chromaClient.listCollections();
  return {
    count: collections.length,
    collections: collections.map((c) => ({
      name: c.name,
      metadata: c.metadata,
      id: c.id,
    })),
  };
}

export async function getCollectionInfo(name: string, limit: number) {
  const collection = await chromaClient.getCollection({ name });
  const count = await collection.count();
  const preview = await collection.get({
    limit,
    include: ['documents', 'metadatas'],
  });

  return {
    collection: {
      name: collection.name,
      metadata: collection.metadata,
      count,
      preview,
    },
  };
}

export async function initTestCollection() {
  const qwenEf = new OllamaEmbeddingFunction({ model: 'nomic-embed-text' });

  const collection = await chromaClient.getOrCreateCollection({
    name: defaultCollectionName,
    embeddingFunction: qwenEf,
  });

  await collection.upsert({
    ids: ['test_id_1', 'test_id_2'],
    documents: ['这是一条测试用的知识库文档数据。', 'Ollama 联动 Chroma 部署成功。'],
    metadatas: [{ source: 'debug' }, { source: 'debug' }],
  });

  return {
    message: `集合 ${defaultCollectionName} 初始化成功，已写入两条测试数据。`,
  };
}

export async function deleteCollection(name: string) {
  await chromaClient.deleteCollection({ name });
  return { message: `集合 ${name} 已彻底删除` };
}
