'use client';

import { useCallback, useEffect, useState, type RefObject } from 'react';
import { ChevronDown } from 'lucide-react';
import { isAtBottom } from '@/utils/scroll';
import { cn } from '@/lib/client/cn';

interface ScrollToBottomButtonProps {
  scrollRef: RefObject<HTMLDivElement | null>;
  onScrollToBottom: () => void;
}

export function ScrollToBottomButton({
  scrollRef,
  onScrollToBottom,
}: ScrollToBottomButtonProps) {
  const [showButton, setShowButton] = useState(false);

  const updateButtonVisibility = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setShowButton(!isAtBottom(el));
  }, [scrollRef]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    updateButtonVisibility();
    el.addEventListener('scroll', updateButtonVisibility, { passive: true });

    const resizeObserver = new ResizeObserver(() => {
      updateButtonVisibility();
    });
    resizeObserver.observe(el);

    return () => {
      el.removeEventListener('scroll', updateButtonVisibility);
      resizeObserver.disconnect();
    };
  }, [scrollRef, updateButtonVisibility]);

  const handleClick = () => {
    onScrollToBottom();
    setShowButton(false);
  };

  if (!showButton) return null;

  return (
    <button
      type="button"
      onClick={handleClick}
      className={cn(
        'absolute bottom-3 right-3 z-10 flex min-h-11 min-w-11 items-center justify-center rounded-full bg-white border border-zinc-200 shadow-md text-zinc-700 hover:bg-zinc-50',
      )}
      aria-label="滚动到底部"
    >
      <ChevronDown className={cn('h-5 w-5')} aria-hidden />
    </button>
  );
}
