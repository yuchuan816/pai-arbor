import type { UIMessage } from 'ai';

export function messageHasVisibleContent(message: UIMessage): boolean {
  return (
    message.parts?.some((part) => {
      if (part.type === 'text' || part.type === 'reasoning') {
        return part.text.trim().length > 0;
      }
      return false;
    }) ?? false
  );
}

type ChatStatus = 'ready' | 'submitted' | 'streaming' | 'error';

export function isAwaitingAssistantResponse(
  status: ChatStatus,
  messages: UIMessage[],
): boolean {
  const lastMessage = messages.at(-1);
  if (status !== 'submitted' && status !== 'streaming') {
    return false;
  }

  if (lastMessage?.role === 'user') {
    return true;
  }

  return lastMessage?.role === 'assistant' && !messageHasVisibleContent(lastMessage);
}

export function shouldReplaceWithLoadingBubble(
  message: UIMessage,
  lastMessage: UIMessage | undefined,
  awaitingAssistant: boolean,
): boolean {
  return (
    awaitingAssistant &&
    message.id === lastMessage?.id &&
    message.role === 'assistant' &&
    !messageHasVisibleContent(message)
  );
}
