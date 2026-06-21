import { Menu } from 'lucide-react';

interface ChatHeaderProps {
  title: string;
  onOpenDrawer: () => void;
}

export function ChatHeader({ title, onOpenDrawer }: ChatHeaderProps) {
  return (
    <header className="flex md:hidden items-center gap-3 border-b border-zinc-200 bg-white px-3 py-2 shrink-0">
      <button
        type="button"
        onClick={onOpenDrawer}
        className="flex min-h-11 min-w-11 items-center justify-center rounded-md text-zinc-700 hover:bg-zinc-100"
        aria-label="打开会话列表"
      >
        <Menu className="h-5 w-5" aria-hidden />
      </button>
      <h1 className="flex-1 truncate text-base font-medium text-zinc-900">{title}</h1>
    </header>
  );
}
