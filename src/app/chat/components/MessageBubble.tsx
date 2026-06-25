import type { UIMessage } from 'ai';
import { cn } from '@/lib/client/cn';
import { MessagePartRenderer } from './MessagePartRenderer';

interface MessageBubbleProps {
  message: UIMessage;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === 'user';

  return (
    <div className={cn('flex', isUser ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'max-w-[85%] min-w-0 rounded-lg px-4 py-2 text-base',
          isUser
            ? 'bg-blue-600 text-white'
            : 'overflow-hidden bg-zinc-200 text-zinc-900',
        )}
      >
        {message.parts?.map((part, idx) => (
          <MessagePartRenderer key={idx} part={part} index={idx} isUser={isUser} />
        ))}
      </div>
    </div>
  );
}
