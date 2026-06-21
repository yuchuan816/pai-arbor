'use client';

import { Modal } from '@/components/Modal';
import type { Session } from '../types/session';
import { SessionList } from './SessionList';

interface SessionDrawerProps {
  open: boolean;
  sessions: Session[];
  currentSessionId: string;
  onClose: () => void;
  onSelect: (id: string) => void;
  onRequestDelete: (session: Session, e: React.MouseEvent) => void;
  onRename: (id: string, title: string) => void;
  onCreate: () => void;
}

export function SessionDrawer({
  open,
  sessions,
  currentSessionId,
  onClose,
  onSelect,
  onRequestDelete,
  onRename,
  onCreate,
}: SessionDrawerProps) {
  const handleSelect = (id: string) => {
    onSelect(id);
    onClose();
  };

  const handleCreate = () => {
    onCreate();
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      backdropLabel="关闭会话列表"
      className="z-50 md:hidden"
      panelClassName="absolute inset-y-0 left-0 flex w-[min(100%,20rem)] flex-col bg-zinc-100 p-4 shadow-xl animate-slide-in-left"
      aria-label="会话列表"
    >
      <SessionList
        sessions={sessions}
        currentSessionId={currentSessionId}
        onSelect={handleSelect}
        onRequestDelete={onRequestDelete}
        onRename={onRename}
        onCreate={handleCreate}
      />
    </Modal>
  );
}
