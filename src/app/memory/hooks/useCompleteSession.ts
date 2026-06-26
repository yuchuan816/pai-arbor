'use client';

import { useCallback, useState } from 'react';
import {
  completeDefaultSession,
  type CompleteSessionResult,
} from '@/app/memory/request';

export function useCompleteSession() {
  const [isCompleting, setIsCompleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CompleteSessionResult | null>(null);

  const complete = useCallback(async () => {
    setError(null);
    setIsCompleting(true);
    try {
      const data = await completeDefaultSession();
      setResult(data);
      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : '完结失败';
      setError(message);
      return null;
    } finally {
      setIsCompleting(false);
    }
  }, []);

  const reset = useCallback(() => {
    setError(null);
    setResult(null);
  }, []);

  return {
    complete,
    reset,
    isCompleting,
    error,
    result,
  };
}
