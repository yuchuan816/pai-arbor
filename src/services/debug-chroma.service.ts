// app/api/debug-chroma/service.ts
import { randomUUID } from 'crypto';
import { chromaClient, getOllamaEmbeddingFunction } from '@/lib/server/chroma';

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

export async function getCollectionInfo(collectionName: string, limit: number) {
  const collection = await chromaClient.getCollection({
    name: collectionName,
    embeddingFunction: getOllamaEmbeddingFunction(),
  });
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

export async function insertTestData(collectionName: string, dataArray: string[]) {
  const collection = await chromaClient.getOrCreateCollection({
    name: collectionName,
    embeddingFunction: getOllamaEmbeddingFunction(),
  });

  const ids: string[] = [];
  const documents: string[] = [];
  const metadatas: Record<string, string>[] = [];

  dataArray.forEach((item) => {
    ids.push(randomUUID());
    documents.push(item);
    metadatas.push({ source: 'debug' }); // 默认 metadata
  });

  await collection.add({
    ids,
    documents,
    metadatas,
  });

  return {
    message: `成功向集合 ${collectionName} 插入了 ${ids.length} 条数据。`,
    insertedIds: ids,
  };
}
export async function deleteCollection(collectionName: string) {
  await chromaClient.deleteCollection({ name: collectionName });
  return { message: `集合 ${collectionName} 已彻底删除` };
}

export async function resetCollection(collectionName: string) {
  await chromaClient.deleteCollection({ name: collectionName });
  await chromaClient.createCollection({
    name: collectionName,
    embeddingFunction: getOllamaEmbeddingFunction(),
  });
  return { message: `集合 ${collectionName} 已清空` };
}
