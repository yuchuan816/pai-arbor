'use client';

import { useCallback, useState } from 'react';
import {
  completeDefaultSession,
  type CompleteSessionResult,
} from '@/app/memory/request';
import { formatClientError, showErrorToast } from '@/lib/client/show-error-toast';

export function useCompleteSession() {
  const [isCompleting, setIsCompleting] = useState(false);
  const [result, setResult] = useState<CompleteSessionResult | null>(null);

  const complete = useCallback(async () => {
    setIsCompleting(true);
    try {
      const data = await completeDefaultSession();
      setResult(data);
      return data;
    } catch (err) {
      showErrorToast(formatClientError(err), 'complete-session');
      return null;
    } finally {
      setIsCompleting(false);
    }
  }, []);

  const reset = useCallback(() => {
    setResult(null);
  }, []);

  return {
    complete,
    reset,
    isCompleting,
    result,
  };
}
