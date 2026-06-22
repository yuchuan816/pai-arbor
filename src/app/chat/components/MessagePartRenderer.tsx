import type { UIMessage } from 'ai';
import { MarkdownContent } from '@/components/MarkdownContent';
import { cn } from '@/lib/cn';

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
        className={cn(
          'mb-2 rounded border-l-2 p-2 pl-2 text-xs italic',
          isUser
            ? 'border-blue-300 bg-blue-500/30 text-blue-100'
            : 'border-zinc-400 bg-zinc-300/30 text-zinc-500',
        )}
      >
        <div
          className={cn(
            'mb-1 text-[10px] font-semibold uppercase tracking-wider not-italic',
            isUser ? 'text-blue-200' : 'text-zinc-400',
          )}
        >
          Thinking Process:
        </div>
        <span className={cn('whitespace-pre-wrap')}>{part.text}</span>
      </div>
    );
  }

  if (part.type === 'text') {
    if (isUser) {
      return (
        <span key={index} className={cn('whitespace-pre-wrap')}>
          {part.text}
        </span>
      );
    }

    return <MarkdownContent key={index} content={part.text} />;
  }

  return null;
}
