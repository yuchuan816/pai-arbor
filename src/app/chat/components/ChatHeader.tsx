import { cn } from '@/lib/cn';

export function ChatHeader() {
  return (
    <header
      className={cn(
        'flex shrink-0 items-center justify-center border-b border-zinc-200 bg-white px-3 py-3',
      )}
    >
      <h1 className={cn('text-base font-medium text-zinc-900')}>pai-arbor</h1>
    </header>
  );
}
