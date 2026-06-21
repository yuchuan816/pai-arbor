interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  disabled: boolean;
  isStreaming: boolean;
}

export function ChatInput({ value, onChange, onSubmit, disabled, isStreaming }: ChatInputProps) {
  return (
    <form
      onSubmit={onSubmit}
      className="border-t border-zinc-200 bg-white p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
    >
      <div className="flex gap-2">
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={isStreaming ? '正在生成中...' : '输入消息...'}
          disabled={disabled}
          className="flex-1 min-h-11 px-3 py-2 border border-zinc-300 rounded-md text-base focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-zinc-100"
        />
        <button
          type="submit"
          disabled={disabled || !value.trim()}
          className="min-h-11 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-400 text-white rounded-md text-base font-medium transition-colors"
        >
          发送
        </button>
      </div>
    </form>
  );
}
