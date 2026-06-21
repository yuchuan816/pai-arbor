import type { Session } from '../types/session';
import { SessionList } from './SessionList';

interface SessionSidebarProps {
  sessions: Session[];
  currentSessionId: string;
  onSelect: (id: string) => void;
  onRequestDelete: (session: Session, e: React.MouseEvent) => void;
  onRename: (id: string, title: string) => void;
  onCreate: () => void;
}

export function SessionSidebar({
  sessions,
  currentSessionId,
  onSelect,
  onRequestDelete,
  onRename,
  onCreate,
}: SessionSidebarProps) {
  return (
    <aside className="hidden md:flex md:w-64 md:shrink-0 border-r border-zinc-200 bg-zinc-100 flex-col p-4">
      <SessionList
        sessions={sessions}
        currentSessionId={currentSessionId}
        onSelect={onSelect}
        onRequestDelete={onRequestDelete}
        onRename={onRename}
        onCreate={onCreate}
      />
    </aside>
  );
}
