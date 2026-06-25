import { type UIDataTypes, type UIMessage, streamText, convertToModelMessages } from 'ai';
import type { InputJsonValue } from '@prisma/client/runtime/client';
import { ollamaProvider } from '@/lib/server/ollama';
import { prisma } from '@/lib/server/prisma';
import { buildSystemPrompt } from '@/services/prompt-builder.service';
import { saveAssistantResponse, getContextMessages } from './message.service';

const ollamaModel = process.env.OLLAMA_MODEL ?? '';

if (typeof ollamaModel !== 'string' || ollamaModel.trim() === '') {
  throw new Error(
    '❌ [Env Error]: 请检查环境变量 ollamaModel 是否正确注入。',
  );
}

/**
 * 核心业务：控制并编排整个 RAG（检索增强生成）聊天流（适配 AI SDK 5.0 Parts 架构）
 * @param sessionId 聊天会话 ID
 * @param messages 前端传过来的消息（用于校验与 UI 流式协议；模型上下文以 DB 为准）
 */
export async function streamChatFlow(sessionId: string, messages: UIMessage[]) {
  const lastMessage = messages[messages.length - 1];
  if (!lastMessage) {
    throw new Error('消息列表不能为空');
  }

  if (lastMessage.role !== 'user') {
    throw new Error('最后一条消息必须是用户消息');
  }

  // 持久化用户消息：直接将前端完整的 parts 数组写入数据库 Json 字段
  await prisma.message.create({
    data: {
      sessionId,
      role: lastMessage.role,
      parts: lastMessage.parts as InputJsonValue,
    },
  });

  const contextMessages = await getContextMessages(sessionId);

  // 从最新的 UIMessage 结构的 parts 中提取纯文本
  const lastUserContent = lastMessage.parts?.find((p) => p.type === 'text')?.text ?? '';
  const systemPrompt = await buildSystemPrompt(sessionId, lastUserContent);

  //【调用大模型】启动流式渲染并返回 result 对象
  return streamText({
    model: ollamaProvider(ollamaModel),
    system: systemPrompt,
    messages: await convertToModelMessages(contextMessages),

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
