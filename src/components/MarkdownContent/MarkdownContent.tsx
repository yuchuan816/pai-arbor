import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSanitize from 'rehype-sanitize';
import { cn } from '@/lib/cn';

interface MarkdownContentProps {
  content: string;
}

const markdownComponents: Components = {
  p: ({ children }) => <p className={cn('mb-2 last:mb-0')}>{children}</p>,
  ul: ({ children }) => <ul className={cn('mb-2 list-disc pl-4')}>{children}</ul>,
  ol: ({ children }) => <ol className={cn('mb-2 list-decimal pl-4')}>{children}</ol>,
  li: ({ children }) => <li className={cn('mb-1')}>{children}</li>,
  h1: ({ children }) => <h1 className={cn('mb-2 text-xl font-semibold')}>{children}</h1>,
  h2: ({ children }) => <h2 className={cn('mb-2 text-lg font-semibold')}>{children}</h2>,
  h3: ({ children }) => <h3 className={cn('mb-2 text-base font-semibold')}>{children}</h3>,
  blockquote: ({ children }) => (
    <blockquote className={cn('mb-2 border-l-2 border-zinc-400 pl-3 italic text-zinc-600')}>
      {children}
    </blockquote>
  ),
  a: ({ href, children }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={cn('text-blue-600 underline break-all')}
    >
      {children}
    </a>
  ),
  code: ({ className, children }) => {
    const isBlock = className?.includes('language-');
    if (isBlock) {
      return <code className={cn(className, 'font-mono text-sm')}>{children}</code>;
    }
    return (
      <code className={cn('rounded bg-zinc-300/60 px-1 font-mono text-sm')}>{children}</code>
    );
  },
  pre: ({ children }) => (
    <pre className={cn('my-2 overflow-x-auto rounded bg-zinc-800 p-3 text-sm text-zinc-100')}>
      {children}
    </pre>
  ),
  table: ({ children }) => (
    <div className={cn('my-2 overflow-x-auto')}>
      <table className={cn('w-full border-collapse text-sm')}>{children}</table>
    </div>
  ),
  th: ({ children }) => (
    <th className={cn('border border-zinc-300 bg-zinc-300/50 px-2 py-1 text-left font-semibold')}>
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className={cn('border border-zinc-300 px-2 py-1')}>{children}</td>
  ),
  hr: () => <hr className={cn('my-3 border-zinc-300')} />,
};

export function MarkdownContent({ content }: MarkdownContentProps) {
  return (
    <div className={cn('break-words-word')}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeSanitize]}
        components={markdownComponents}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
