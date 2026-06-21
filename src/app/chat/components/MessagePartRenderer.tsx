import type { UIMessage } from 'ai';
import { MarkdownContent } from '@/components/MarkdownContent';

type MessagePart = UIMessage['parts'][number];

interface MessagePartRendererProps {
  part: MessagePart;
  index: number;
  isUser: boolean;
}

export function MessagePartRenderer({ part, index, isUser }: MessagePartRendererProps) {
  if (part.type === 'reasoning') {
    return (
      <div
        key={index}
        className={`mb-2 text-xs italic border-l-2 pl-2 p-2 rounded ${
          isUser
            ? 'text-blue-100 border-blue-300 bg-blue-500/30'
            : 'text-zinc-500 border-zinc-400 bg-zinc-300/30'
        }`}
      >
        <div
          className={`font-semibold text-[10px] uppercase tracking-wider not-italic mb-1 ${
            isUser ? 'text-blue-200' : 'text-zinc-400'
          }`}
        >
          Thinking Process:
        </div>
        <span className="whitespace-pre-wrap">{part.text}</span>
      </div>
    );
  }

  if (part.type === 'text') {
    if (isUser) {
      return (
        <span key={index} className="whitespace-pre-wrap">
          {part.text}
        </span>
      );
    }

    return <MarkdownContent key={index} content={part.text} />;
  }

  return null;
}
