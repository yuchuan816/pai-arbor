export function AssistantLoadingBubble() {
  return (
    <div className="flex justify-start">
      <div
        className="max-w-[85%] rounded-lg bg-zinc-200 px-4 py-3 text-zinc-900"
        role="status"
        aria-label="正在生成回复"
      >
        <div className="flex items-center gap-1">
          <span className="h-2 w-2 animate-bounce rounded-full bg-zinc-400 [animation-delay:-0.3s]" />
          <span className="h-2 w-2 animate-bounce rounded-full bg-zinc-400 [animation-delay:-0.15s]" />
          <span className="h-2 w-2 animate-bounce rounded-full bg-zinc-400" />
        </div>
      </div>
    </div>
  );
}
