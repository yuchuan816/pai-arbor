'use client';

import { useCallback, useState } from 'react';
import { useChat } from '@ai-sdk/react';
import { useSessions } from '../hooks/useSessions';
import { useMessageHistory } from '../hooks/useMessageHistory';
import type { Session } from '../types/session';
import { ChatHeader } from './ChatHeader';
import { SessionSidebar } from './SessionSidebar';
import { SessionDrawer } from './SessionDrawer';
import { MessageList } from './MessageList';
import { ChatInput } from './ChatInput';
import { EmptyChatState } from './EmptyChatState';
import { ConfirmDialog } from '@/components/ConfirmDialog';

export function ChatScreen() {
  const { sessions, createSession, deleteSession, renameSession } = useSessions();
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Session | null>(null);
  const [input, setInput] = useState('');
  const [scrollToBottomKey, setScrollToBottomKey] = useState(0);

  const bumpScroll = useCallback(() => {
    setScrollToBottomKey((k) => k + 1);
  }, []);

  const { messages, status, sendMessage, setMessages } = useChat({
    experimental_throttle: 50,
  });

  const activeSessionId =
    selectedSessionId === null ? (sessions[0]?.id ?? '') : selectedSessionId;

  const { hasMore, isLoadingMore, loadMore } = useMessageHistory({
    activeSessionId,
    messages,
    setMessages,
    bumpScroll,
  });

  const currentSession = sessions.find((s) => s.id === activeSessionId);
  const isStreaming = status === 'submitted' || status === 'streaming';

  const handleCreateSession = useCallback(async () => {
    const session = await createSession();
    if (session) {
      setSelectedSessionId(session.id);
    }
  }, [createSession]);

  const handleRequestDelete = useCallback((session: Session, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleteTarget(session);
  }, []);

  const handleConfirmDelete = useCallback(async () => {
    if (!deleteTarget) return;

    const id = deleteTarget.id;
    setDeleteTarget(null);

    const ok = await deleteSession(id);
    if (ok && activeSessionId === id) {
      setSelectedSessionId('');
      setMessages([]);
    }
  }, [deleteTarget, deleteSession, activeSessionId, setMessages]);

  const handleRenameSession = useCallback(
    async (id: string, title: string) => {
      const ok = await renameSession(id, title);
      if (!ok) {
        console.error('重命名会话失败');
      }
    },
    [renameSession],
  );

  const handleSelectSession = useCallback((id: string) => {
    setSelectedSessionId(id);
  }, []);

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isStreaming || !activeSessionId) return;

    const currentInput = input;
    setInput('');

    try {
      await sendMessage(
        { text: currentInput },
        {
          body: { sessionId: activeSessionId },
        },
      );
    } catch (error) {
      console.error('消息发送失败:', error);
      setInput(currentInput);
    }
  };

  return (
    <div className="flex h-[100dvh] bg-zinc-50 text-zinc-900">
      <SessionSidebar
        sessions={sessions}
        currentSessionId={activeSessionId}
        onSelect={handleSelectSession}
        onRequestDelete={handleRequestDelete}
        onRename={handleRenameSession}
        onCreate={() => void handleCreateSession()}
      />

      <div className="flex flex-1 flex-col min-w-0">
        <ChatHeader
          title={currentSession?.title ?? 'pai-arbor'}
          onOpenDrawer={() => setDrawerOpen(true)}
        />

        {activeSessionId ? (
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
        ) : (
          <EmptyChatState onCreate={() => void handleCreateSession()} />
        )}
      </div>

      <SessionDrawer
        open={drawerOpen}
        sessions={sessions}
        currentSessionId={activeSessionId}
        onClose={() => setDrawerOpen(false)}
        onSelect={handleSelectSession}
        onRequestDelete={handleRequestDelete}
        onRename={handleRenameSession}
        onCreate={() => void handleCreateSession()}
      />

      <ConfirmDialog
        open={deleteTarget !== null}
        title="删除会话"
        description={
          deleteTarget
            ? `确定删除「${deleteTarget.title}」？此操作不可恢复，会话内所有消息将被删除。`
            : ''
        }
        confirmLabel="删除"
        cancelLabel="取消"
        variant="danger"
        onConfirm={() => void handleConfirmDelete()}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
