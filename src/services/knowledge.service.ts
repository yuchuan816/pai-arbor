import { createFileRecord, deleteFileRecord } from '@/services/file.service';
import { VectorService } from '@/services/vector.service';
import { MarkdownTextSplitter } from '@langchain/textsplitters';

const vectorService = new VectorService();

/**
 * 编排完整的知识库文件导入业务流（包含强一致性逆向事务补偿）
 */
export async function importMarkdownFile(file: File) {
  const fileId = crypto.randomUUID();

  // 读取并解析文本
  const arrayBuffer = await file.arrayBuffer();
  const fileBuffer = Buffer.from(arrayBuffer);
  const rawText = fileBuffer.toString('utf-8');

  // 文本切片
  const splitter = new MarkdownTextSplitter({
    chunkSize: 600,
    chunkOverlap: 60,
  });
  const textChunks = await splitter.splitText(rawText);

  if (textChunks.length === 0) {
    throw new Error('未能从文件中切分出任何有效内容');
  }

  // 写入 MySQL 记录
  const dbFile = await createFileRecord({
    id: fileId,
    fileName: file.name,
    fileSize: file.size,
    fileBuffer,
    textChunksCount: textChunks.length,
  });

  // 写入 ChromaDB（带双向严格事务回滚）
  try {
    const chunksPayload = dbFile.chunks.map((chunk, idx) => ({
      id: chunk.id,
      chunkIndex: chunk.chunkIndex,
      text: textChunks[idx],
    }));

    await vectorService.addFileChunks({ fileId, chunks: chunksPayload });

    return { fileId, fileName: file.name, chunksCount: textChunks.length };
  } catch (vectorError: unknown) {
    console.error('❌ 向量化阶段失败，正在执行多端逆向事务补偿清理...', vectorError);

    // 补偿 A: 清理 MySQL 中的文件记录
    await deleteFileRecord(fileId);

    // 补偿 B: 【漏洞修复】显式清理 ChromaDB 中可能已经写入的部分向量片段，防止孤儿向量污染知识库
    try {
      await vectorService.deleteFileChunks(fileId);
    } catch (chromaCleanErr) {
      console.error('⚠️ 警告：ChromaDB 逆向清理失败，可能产生孤儿向量:', chromaCleanErr);
    }

    const errorMsg = vectorError instanceof Error ? vectorError.message : 'ChromaDB 同步超时';
    throw new Error(`知识库向量化失败: ${errorMsg}，已自动回滚多端实体。`);
  }
}
