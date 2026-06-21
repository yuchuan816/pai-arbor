'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import type { Session } from '../types/session';

interface SessionListItemProps {
  session: Session;
  isActive: boolean;
  onSelect: (id: string) => void;
  onRequestDelete: (session: Session, e: React.MouseEvent) => void;
  onRename: (id: string, title: string) => void;
}

export function SessionListItem({
  session,
  isActive,
  onSelect,
  onRequestDelete,
  onRename,
}: SessionListItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [draftTitle, setDraftTitle] = useState(session.title);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const startEdit = () => {
    setDraftTitle(session.title);
    setIsEditing(true);
  };

  const cancelEdit = useCallback(() => {
    setDraftTitle(session.title);
    setIsEditing(false);
  }, [session.title]);

  const commitEdit = useCallback(() => {
    const trimmed = draftTitle.trim();
    if (!trimmed) {
      cancelEdit();
      return;
    }

    setIsEditing(false);
    if (trimmed !== session.title) {
      onRename(session.id, trimmed);
    }
  }, [draftTitle, session.id, session.title, onRename, cancelEdit]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    e.stopPropagation();
    if (e.key === 'Enter') {
      e.preventDefault();
      commitEdit();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      cancelEdit();
    }
  };

  return (
    <div
      onClick={() => {
        if (!isEditing) onSelect(session.id);
      }}
      className={`flex items-center justify-between py-3 px-3 rounded-md cursor-pointer text-sm transition-colors ${
        isActive ? 'bg-zinc-200 font-medium' : 'hover:bg-zinc-200/50'
      }`}
    >
      {isEditing ? (
        <input
          ref={inputRef}
          type="text"
          value={draftTitle}
          onChange={(e) => setDraftTitle(e.target.value)}
          onBlur={commitEdit}
          onKeyDown={handleKeyDown}
          onClick={(e) => e.stopPropagation()}
          className="flex-1 min-w-0 mr-2 rounded border border-zinc-300 bg-white px-2 py-1 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          aria-label="编辑会话标题"
        />
      ) : (
        <span className="truncate mr-2 flex-1 min-w-0">{session.title}</span>
      )}
      <div className="flex shrink-0 items-center">
        {!isEditing && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              startEdit();
            }}
            className="flex items-center justify-center min-h-11 min-w-11 text-zinc-400 hover:text-zinc-700 text-xs"
            aria-label={`重命名会话 ${session.title}`}
          >
            <Pencil className="h-4 w-4" aria-hidden />
          </button>
        )}
        <button
          type="button"
          onClick={(e) => onRequestDelete(session, e)}
          className="flex items-center justify-center min-h-11 min-w-11 text-zinc-400 hover:text-red-500 text-xs"
          aria-label={`删除会话 ${session.title}`}
        >
          <Trash2 className="h-4 w-4" aria-hidden />
        </button>
      </div>
    </div>
  );
}
