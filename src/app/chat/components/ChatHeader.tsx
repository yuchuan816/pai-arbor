import { Eraser } from 'lucide-react';
import { cn } from '@/lib/client/cn';

interface ChatHeaderProps {
  onClear: () => void;
  disabled?: boolean;
}

export function ChatHeader({ onClear, disabled }: ChatHeaderProps) {
  return (
    <header
      className={cn(
        'flex shrink-0 items-center justify-between border-b border-zinc-200 bg-white px-3 py-3',
      )}
    >
      <div className={cn('min-w-10')} aria-hidden />
      <h1 className={cn('text-base font-medium text-zinc-900')}>pai-arbor</h1>
      <button
        type="button"
        onClick={onClear}
        disabled={disabled}
        className={cn(
          'flex min-h-10 min-w-10 items-center justify-center rounded-md text-zinc-500 transition-colors',
          'hover:bg-zinc-100 hover:text-zinc-700 disabled:pointer-events-none disabled:opacity-40',
        )}
        aria-label="清空聊天记录"
      >
        <Eraser className={cn('h-5 w-5')} aria-hidden />
      </button>
    </header>
  );
}
