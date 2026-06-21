import { type UIDataTypes, type UIMessage, streamText, convertToModelMessages } from 'ai';
import type { InputJsonValue } from '@prisma/client/runtime/client';
import { ollamaProvider } from '@/lib/ollama.provider';
import { prisma } from '@/lib/prisma';
import { VectorService } from '@/services/vector.service';
import { saveAssistantResponse } from './message.service';

const vectorService = new VectorService();
const ollamaModel = process.env.OLLAMA_MODEL ?? '';

if (typeof ollamaModel !== 'string' || ollamaModel.trim() === '') {
  throw new Error(
    '❌ [Env Error]: 请检查环境变量 ollamaModel 是否正确注入。',
  );
}

/**
 * 核心业务：控制并编排整个 RAG（检索增强生成）聊天流（适配 AI SDK 5.0 Parts 架构）
 * @param sessionId 聊天会话 ID
 * @param messages 前端传过来的完整历史对白（数组元素符合 5.0 的 UIMessage 规范）
 */
export async function streamChatFlow(sessionId: string, messages: UIMessage[]) {
  const lastMessage = messages[messages.length - 1];
  if (!lastMessage) {
    throw new Error('消息列表不能为空');
  }

  // 持久化用户消息：直接将前端完整的 parts 数组写入数据库 Json 字段
  await prisma.message.create({
    data: {
      sessionId,
      role: lastMessage.role,
      parts: lastMessage.parts as InputJsonValue,
    },
  });

  // 从最新的 UIMessage 结构的 parts 中提取纯文本，用于向量检索
  const lastUserContent = lastMessage.parts?.find((p) => p.type === 'text')?.text ?? '';

  //【知识检索】去本地 Chroma 寻找与用户提问语义相近的本地文档
  let contextDocs: string[] = [];
  if (lastUserContent) {
    try {
      contextDocs = await vectorService.queryKnowledge(lastUserContent);
    } catch (err) {
      console.error('[Chroma_Error] 知识库检索失败，系统自动降级运行:', err);
    }
  }

  // 组装符合 RAG 规范的 System Prompt
  const systemPrompt = `你是一个基于本地知识库构建的 AI 助手。
  请结合以下参考资料回答用户的问题。如果资料中没有相关信息，请拒绝回答，不要胡乱编造。
  
  <context>
  ${contextDocs
    .map(
      (doc, index) => `<document id="${index + 1}">
  ${doc}
  </document>`,
    )
    .join('\n')}
  </context>
  `;

  //【调用大模型】启动流式渲染并返回 result 对象
  return streamText({
    model: ollamaProvider(ollamaModel),
    system: systemPrompt,
    messages: await convertToModelMessages(messages),

    // 流结束后的生命周期钩子：当大模型吐完最后一个字时，组装标准的 parts 写入数据库
    onFinish: async ({ text, reasoningText}) => {
      try {
        // 构造符合 AI SDK 5.0 规范的 Assistant Parts 数组
        const assistantParts: UIDataTypes[] = [];

        // 若存在 DeepSeek 的思考内容，以标准 reasoning 类型节点推入数组
        if (reasoningText) {
          assistantParts.push({
            type: 'reasoning',
            reasoning: reasoningText,
          });
        }

        // 推入标准的 text 类型节点
        assistantParts.push({
          type: 'text',
          text: text,
        });

        // 保存 AI 消息并更新 Session 的最后活跃时间
        saveAssistantResponse(sessionId, assistantParts);
      } catch (dbErr) {
        console.error('[MySQL_Error] 写入 AI 历史对白或更新会话失败:', dbErr);
      }
    },
  });
}
