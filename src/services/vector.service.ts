import { chromaClient, getOllamaEmbeddingFunction } from '@/lib/server/chroma';

interface AddChunksInput {
  fileId: string;
  chunks: { id: string; chunkIndex: number; text: string }[];
}

// 记忆的输入结构
interface AddMemoryInput {
  id: string; // 记忆的唯一ID
  text: string; // 记忆的具体内容（如："用户对花生过敏"）
  timestamp: number; // 记录时间
  type: 'preference' | 'event' | 'fact'; 
}

export class VectorService {
  private docCollectionName = 'doc_knowledge_base';
  private memoryCollectionName = 'user_memory_base';

  /**
   * 内部通用 Collection 获取方法
   */
  private async getCollection(name: string) {
    return await chromaClient.getOrCreateCollection({
      name: name,
      embeddingFunction: getOllamaEmbeddingFunction(),
    });
  }
  
  // ==================== 个人记忆库 业务逻辑 ====================
  /**
   * 存储定期提取的记忆
   */
  async addMemories(memories: AddMemoryInput[]): Promise<void> {
    if (memories.length === 0) return;
    
    const collection = await this.getCollection(this.memoryCollectionName);
    
    await collection.add({
      ids: memories.map(m => m.id),
      documents: memories.map(m => m.text),
      metadatas: memories.map(m => ({
        timestamp: m.timestamp,
        type: m.type
      }))
    });
  }

  /**
   * 检索记忆：支持引入时间范围过滤（可选）
   */
  async queryMemory(queryText: string, limit = 5, startTime?: number): Promise<string[]> {
    const collection = await this.getCollection(this.memoryCollectionName);
    
    // 如果传入了开始时间，则利用 Chroma 的 where 过滤器过滤时间戳
    const whereClause = startTime ? { timestamp: { $gte: startTime } } : undefined;

    const response = await collection.query({
      queryTexts: [queryText],
      nResults: limit,
      where: whereClause
    });

    return (response.documents[0] as string[]) ?? [];
  }

  // ==================== 文档知识库 业务逻辑 ====================
  /**
   * 从向量知识库中依据语义检索 Top-K 切片
   */
  async queryKnowledge(queryText: string, limit = 3): Promise<string[]> {
    const collection = await this.getCollection(this.docCollectionName);

    const response = await collection.query({
      queryTexts: [queryText],
      nResults: limit,
    });

    return (response.documents[0] as string[]) ?? [];
  }

  /**
   * 将切片同步向量化并推送到 ChromaDB
   * @param input.fileId 主文件 UUID
   * @param input.chunks 包含与 MySQL 严格对齐的真实主键与全文的切片数组
   */
  async addFileChunks(input: AddChunksInput): Promise<void> {
    const { fileId, chunks } = input;

    if (chunks.length === 0) return;

    const collection = await this.getCollection(this.docCollectionName);

    // 严丝合缝地对齐 Chroma 规范的数据集结构
    const ids = chunks.map((c) => c.id); // 映射自 MySQL 生成的唯一 UUID 骨架
    const documents = chunks.map((c) => c.text); // 喂给向量库进行嵌入转换的切片全文
    const metadatas = chunks.map((c) => ({
      file_id: fileId,
      index: c.chunkIndex,
    }));

    // 执行批量插入，此处会自动调用内部声明的 this.qwenEf 驱动本地/远程 Ollama 生成 Embedding 向量
    await collection.add({
      ids,
      documents,
      metadatas,
    });
  }

  /**
   * 依据主文件 ID，抹除对应的所有子向量切片
   * @param fileId 主文件 UUID
   */
  async deleteFileChunks(fileId: string): Promise<void> {
    const collection = await this.getCollection(this.docCollectionName);

    // 利用 metadata 过滤器，实现对单个文档衍生出所有切片的物理清空
    await collection.delete({
      where: { file_id: fileId },
    });
  }
}
