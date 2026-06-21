import { chromaClient } from '@/lib/chroma';
import { OllamaEmbeddingFunction } from '@/lib/embeddings';

interface AddChunksInput {
  fileId: string;
  chunks: { id: string; chunkIndex: number; text: string }[];
}

export class VectorService {
  private collectionName = 'doc_knowledge_base';
  // 初始化时传入对应的参数
  private embed = new OllamaEmbeddingFunction({ model: 'nomic-embed-text' });

  /**
   * 获取或初始化绑定的 Chroma 集合 (内部重用)
   */
  private async getCollection() {
    return await chromaClient.getOrCreateCollection({
      name: this.collectionName,
      embeddingFunction: this.embed,
    });
  }

  /**
   * 从向量知识库中依据语义检索 Top-K 切片
   */
  async queryKnowledge(queryText: string, limit = 3): Promise<string[]> {
    const collection = await this.getCollection();

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

    const collection = await this.getCollection();

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
   * 依据主文件 ID，一击必杀抹除对应的所有子向量切片
   * @param fileId 主文件 UUID
   */
  async deleteFileChunks(fileId: string): Promise<void> {
    const collection = await this.getCollection();

    // 利用 metadata 过滤器，实现对单个文档衍生出所有切片的物理清空
    await collection.delete({
      where: { file_id: fileId },
    });
  }
}
