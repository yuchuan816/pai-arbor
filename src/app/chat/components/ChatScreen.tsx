'use client';

import { useCallback, useState } from 'react';
import { useChat } from '@ai-sdk/react';
import { useDefaultSession } from '../hooks/useDefaultSession';
import { useMessageHistory } from '../hooks/useMessageHistory';
import { ChatHeader } from './ChatHeader';
import { MessageList } from './MessageList';
import { ChatInput } from './ChatInput';
import { cn } from '@/lib/cn';

export function ChatScreen() {
  const { sessionId, isLoading, error } = useDefaultSession();
  const [input, setInput] = useState('');
  const [scrollToBottomKey, setScrollToBottomKey] = useState(0);

  const bumpScroll = useCallback(() => {
    setScrollToBottomKey((k) => k + 1);
  }, []);

  const { messages, status, sendMessage, setMessages } = useChat({
    experimental_throttle: 50,
  });

  const { hasMore, isLoadingMore, loadMore } = useMessageHistory({
    activeSessionId: sessionId,
    messages,
    setMessages,
    bumpScroll,
  });

  const isStreaming = status === 'submitted' || status === 'streaming';

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isStreaming || !sessionId) return;

    const currentInput = input;
    setInput('');

    try {
      await sendMessage(
        { text: currentInput },
        {
          body: { sessionId },
        },
      );
    } catch (err) {
      console.error('消息发送失败:', err);
      setInput(currentInput);
    }
  };

  return (
    <div className={cn('flex h-dvh flex-col bg-zinc-50 text-zinc-900')}>
      <ChatHeader />

      {isLoading ? (
        <div className={cn('flex flex-1 items-center justify-center text-sm text-zinc-400')}>
          加载中...
        </div>
      ) : error || !sessionId ? (
        <div className={cn('flex flex-1 items-center justify-center text-sm text-zinc-400')}>
          {error ?? '无法加载会话'}
        </div>
      ) : (
        <>
          <MessageList
            messages={messages}
            status={status}
            scrollToBottomKey={scrollToBottomKey}
            hasMore={hasMore}
            isLoadingMore={isLoadingMore}
            onLoadMore={() => void loadMore()}
          />
          <ChatInput
            value={input}
            onChange={setInput}
            onSubmit={handleFormSubmit}
            disabled={isStreaming}
            isStreaming={isStreaming}
          />
        </>
      )}
    </div>
  );
}
