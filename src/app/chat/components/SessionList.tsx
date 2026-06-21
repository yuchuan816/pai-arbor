import { Plus } from 'lucide-react';
import type { Session } from '../types/session';
import { SessionListItem } from './SessionListItem';

interface SessionListProps {
  sessions: Session[];
  currentSessionId: string;
  onSelect: (id: string) => void;
  onRequestDelete: (session: Session, e: React.MouseEvent) => void;
  onRename: (id: string, title: string) => void;
  onCreate: () => void;
}

export function SessionList({
  sessions,
  currentSessionId,
  onSelect,
  onRequestDelete,
  onRename,
  onCreate,
}: SessionListProps) {
  return (
    <div className="flex flex-col gap-4 h-full">
      <button
        type="button"
        onClick={onCreate}
        className="flex w-full min-h-11 items-center justify-center gap-2 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-medium text-sm transition-colors"
      >
        <Plus className="h-4 w-4" aria-hidden />
        新建会话
      </button>
      <div className="flex-1 overflow-y-auto flex flex-col gap-1">
        {sessions.map((session) => (
          <SessionListItem
            key={session.id}
            session={session}
            isActive={currentSessionId === session.id}
            onSelect={onSelect}
            onRequestDelete={onRequestDelete}
            onRename={onRename}
          />
        ))}
      </div>
    </div>
  );
}
