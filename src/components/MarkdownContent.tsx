import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSanitize from 'rehype-sanitize';

interface MarkdownContentProps {
  content: string;
}

const markdownComponents: Components = {
  p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
  ul: ({ children }) => <ul className="mb-2 list-disc pl-4">{children}</ul>,
  ol: ({ children }) => <ol className="mb-2 list-decimal pl-4">{children}</ol>,
  li: ({ children }) => <li className="mb-1">{children}</li>,
  h1: ({ children }) => <h1 className="mb-2 text-xl font-semibold">{children}</h1>,
  h2: ({ children }) => <h2 className="mb-2 text-lg font-semibold">{children}</h2>,
  h3: ({ children }) => <h3 className="mb-2 text-base font-semibold">{children}</h3>,
  blockquote: ({ children }) => (
    <blockquote className="mb-2 border-l-2 border-zinc-400 pl-3 italic text-zinc-600">
      {children}
    </blockquote>
  ),
  a: ({ href, children }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-blue-600 underline break-all"
    >
      {children}
    </a>
  ),
  code: ({ className, children }) => {
    const isBlock = className?.includes('language-');
    if (isBlock) {
      return <code className={`${className ?? ''} font-mono text-sm`}>{children}</code>;
    }
    return (
      <code className="rounded bg-zinc-300/60 px-1 font-mono text-sm">{children}</code>
    );
  },
  pre: ({ children }) => (
    <pre className="my-2 overflow-x-auto rounded bg-zinc-800 p-3 text-sm text-zinc-100">
      {children}
    </pre>
  ),
  table: ({ children }) => (
    <div className="my-2 overflow-x-auto">
      <table className="w-full border-collapse text-sm">{children}</table>
    </div>
  ),
  th: ({ children }) => (
    <th className="border border-zinc-300 bg-zinc-300/50 px-2 py-1 text-left font-semibold">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="border border-zinc-300 px-2 py-1">{children}</td>
  ),
  hr: () => <hr className="my-3 border-zinc-300" />,
};

export function MarkdownContent({ content }: MarkdownContentProps) {
  return (
    <div className="break-words">
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
