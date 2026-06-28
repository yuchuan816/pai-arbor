import { type UIDataTypes, type UIMessage, streamText, convertToModelMessages } from 'ai';
import type { InputJsonValue } from '@prisma/client/runtime/client';
import { ollamaProvider } from '@/lib/server/ollama';
import { prisma } from '@/lib/server/prisma';
import { logger } from '@/lib/server/logger';
import { buildSystemPrompt } from '@/services/prompt-builder.service';
import { saveAssistantResponse, getContextMessages } from './message.service';

const ollamaModel = process.env.OLLAMA_MODEL ?? '';

if (typeof ollamaModel !== 'string' || ollamaModel.trim() === '') {
  throw new Error('❌ [Env Error]: 请检查环境变量 ollamaModel 是否正确注入。');
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

  const userMessage = await prisma.message.create({
    data: {
      sessionId,
      role: lastMessage.role,
      parts: lastMessage.parts as InputJsonValue,
    },
  });
  const userMessageId = userMessage.id;

  const contextMessages = await getContextMessages(sessionId);

  const lastUserContent = lastMessage.parts?.find((p) => p.type === 'text')?.text ?? '';
  const { systemPrompt, meta } = await buildSystemPrompt(sessionId, lastUserContent);

  logger.info({
    event: 'llm.chat.request',
    sessionId,
    model: ollamaModel,
    userMessageId,
    userContent: lastUserContent,
    contextMessageCount: contextMessages.length,
    activeSkill: meta.activeSkill,
    memoryFragments: meta.memoryFragments,
    userProfile: meta.userProfile,
  });

  const startedAt = Date.now();

  return streamText({
    model: ollamaProvider(ollamaModel),
    system: systemPrompt,
    messages: await convertToModelMessages(contextMessages),

    onFinish: async ({ text, reasoningText, usage }) => {
      try {
        const assistantParts: UIDataTypes[] = [];

        if (reasoningText) {
          assistantParts.push({
            type: 'reasoning',
            reasoning: reasoningText,
          });
        }

        assistantParts.push({
          type: 'text',
          text: text,
        });

        const { messageId: assistantMessageId } = await saveAssistantResponse(
          sessionId,
          assistantParts,
        );

        logger.info({
          event: 'llm.chat.response',
          sessionId,
          model: ollamaModel,
          userMessageId,
          assistantMessageId,
          text,
          ...(reasoningText ? { reasoningText } : {}),
          durationMs: Date.now() - startedAt,
          ...(usage ? { usage } : {}),
        });
      } catch (dbErr) {
        logger.error(
          { event: 'llm.chat.response', sessionId, userMessageId, err: dbErr },
          '写入 AI 历史对白失败',
        );
      }
    },
  });
}
