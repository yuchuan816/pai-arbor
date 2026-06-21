import { Plus } from 'lucide-react';

interface EmptyChatStateProps {
  onCreate: () => void;
}

export function EmptyChatState({ onCreate }: EmptyChatStateProps) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-zinc-400">
      <p className="text-sm text-center">请选择或新建一个会话开始聊天</p>
      <button
        type="button"
        onClick={onCreate}
        className="inline-flex min-h-11 items-center justify-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-base font-medium transition-colors"
      >
        <Plus className="h-4 w-4" aria-hidden />
        新建会话
      </button>
    </div>
  );
}
