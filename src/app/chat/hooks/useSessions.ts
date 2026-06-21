'use client';

import { useCallback, useEffect, useState } from 'react';
import type { Session } from '../types/session';

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export function useSessions() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadSessions() {
      try {
        const res = await fetch('/api/sessions');
        const json = (await res.json()) as ApiResponse<Session[]>;
        if (!cancelled && json.success && Array.isArray(json.data)) {
          setSessions(json.data);
        }
      } catch (error) {
        console.error('获取会话列表失败:', error);
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadSessions();

    return () => {
      cancelled = true;
    };
  }, []);

  const createSession = useCallback(async (title?: string) => {
    try {
      const res = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title ?? `新对话 ${sessions.length + 1}` }),
      });
      const json = (await res.json()) as ApiResponse<Session>;
      if (json.success && json.data) {
        setSessions((prev) => [json.data as Session, ...prev]);
        return json.data;
      }
      return null;
    } catch (error) {
      console.error('创建会话失败:', error);
      return null;
    }
  }, [sessions.length]);

  const deleteSession = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/sessions/${id}`, { method: 'DELETE' });
      const json = (await res.json()) as ApiResponse<unknown>;
      if (json.success) {
        setSessions((prev) => prev.filter((s) => s.id !== id));
        return true;
      }
      return false;
    } catch (error) {
      console.error('删除会话失败:', error);
      return false;
    }
  }, []);

  const renameSession = useCallback(async (id: string, title: string) => {
    try {
      const res = await fetch(`/api/sessions/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title }),
      });
      const json = (await res.json()) as ApiResponse<Session>;
      if (json.success && json.data) {
        setSessions((prev) =>
          prev.map((s) => (s.id === id ? (json.data as Session) : s)),
        );
        return true;
      }
      return false;
    } catch (error) {
      console.error('重命名会话失败:', error);
      return false;
    }
  }, []);

  return {
    sessions,
    isLoading,
    createSession,
    deleteSession,
    renameSession,
  };
}
