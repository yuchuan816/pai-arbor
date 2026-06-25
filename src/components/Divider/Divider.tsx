import { cn } from '@/lib/client/cn';

interface DividerProps {
  label: string;
}

export function Divider({ label }: DividerProps) {
  return (
    <div className={cn('flex justify-center py-2')}>
      <span className={cn('rounded-full bg-zinc-200/80 px-3 py-0.5 text-xs text-zinc-500')}>
        {label}
      </span>
    </div>
  );
}
