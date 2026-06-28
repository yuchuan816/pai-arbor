import { useCallback, useLayoutEffect, useMemo, useRef } from 'react';
import type { UIMessage } from 'ai';
import { MessageBubble } from './MessageBubble';
import { AssistantLoadingBubble } from './AssistantLoadingBubble';
import { Divider } from '@/components/Divider';
import { ScrollToBottomButton } from '@/components/ScrollToBottomButton';
import { isAtBottom, TOP_THRESHOLD } from '@/utils/scroll';
import { isAwaitingAssistantResponse, shouldReplaceWithLoadingBubble } from '../utils/message-content';
import { buildMessageItems } from '../utils/build-message-items';
import type { HistoryMessage } from '../request';
import { cn } from '@/lib/client/cn';

interface MessageListProps {
  messages: HistoryMessage[];
  status: 'ready' | 'submitted' | 'streaming' | 'error';
  scrollToBottomKey: number;
  hasMore?: boolean;
  isLoadingMore?: boolean;
  onLoadMore?: () => void;
}

export function MessageList({
  messages,
  status,
  scrollToBottomKey,
  hasMore = false,
  isLoadingMore = false,
  onLoadMore,
}: MessageListProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const isPinnedRef = useRef(true);
  const pendingScrollHeightRef = useRef<number | null>(null);
  const loadMoreTriggeredRef = useRef(false);

  const lastMessage = messages.at(-1);
  const awaitingAssistant = isAwaitingAssistantResponse(status, messages as UIMessage[]);
  const messageItems = useMemo(() => buildMessageItems(messages), [messages]);

  const scrollToBottom = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, []);

  const handleScrollToBottom = useCallback(() => {
    scrollToBottom();
    isPinnedRef.current = true;
  }, [scrollToBottom]);

  const tryLoadMore = useCallback(() => {
    const el = scrollRef.current;
    if (!el || !hasMore || isLoadingMore || !onLoadMore || loadMoreTriggeredRef.current) {
      return;
    }

    if (el.scrollTop >= TOP_THRESHOLD) {
      loadMoreTriggeredRef.current = false;
      return;
    }

    loadMoreTriggeredRef.current = true;
    pendingScrollHeightRef.current = el.scrollHeight;
    onLoadMore();
  }, [hasMore, isLoadingMore, onLoadMore]);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    isPinnedRef.current = isAtBottom(el);
    tryLoadMore();
  }, [tryLoadMore]);

  useLayoutEffect(() => {
    scrollToBottom();
    isPinnedRef.current = true;
  }, [scrollToBottomKey, scrollToBottom]);

  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    if (pendingScrollHeightRef.current !== null) {
      el.scrollTop = el.scrollHeight - pendingScrollHeightRef.current;
      pendingScrollHeightRef.current = null;
      return;
    }

    const last = messages.at(-1);
    if (last?.role === 'user' || awaitingAssistant) {
      scrollToBottom();
      isPinnedRef.current = true;
      return;
    }

    if (isPinnedRef.current) {
      scrollToBottom();
    }
  }, [messages, status, awaitingAssistant, scrollToBottom]);

  useLayoutEffect(() => {
    if (!isLoadingMore) {
      loadMoreTriggeredRef.current = false;
      pendingScrollHeightRef.current = null;
    }
  }, [isLoadingMore]);

  return (
    <div className={cn('relative flex flex-1 min-h-0')}>
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className={cn('flex-1 overflow-y-auto p-4 md:p-6 space-y-3 md:space-y-4')}
      >
        {isLoadingMore && (
          <div className={cn('py-2 text-center text-sm text-zinc-400')}>加载中...</div>
        )}
        {messageItems.map((item) => {
          if (item.type === 'divider') {
            return <Divider key={item.key} label={item.label} />;
          }

          const message = item.message;
          if (
            shouldReplaceWithLoadingBubble(
              message as UIMessage,
              lastMessage as UIMessage | undefined,
              awaitingAssistant,
            )
          ) {
            return <AssistantLoadingBubble key={message.id} />;
          }

          return <MessageBubble key={message.id} message={message} />;
        })}
        {awaitingAssistant && lastMessage?.role === 'user' && <AssistantLoadingBubble />}
      </div>
      <ScrollToBottomButton scrollRef={scrollRef} onScrollToBottom={handleScrollToBottom} />
    </div>
  );
}
