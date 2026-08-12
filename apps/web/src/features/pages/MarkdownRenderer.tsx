import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

type MarkdownRendererProps = {
  content: string;
};

export function MarkdownRenderer({ content }: MarkdownRendererProps) {
  return (
    <div className="prose prose-slate dark:prose-invert max-w-none prose-a:text-indigo-600 dark:prose-a:text-indigo-400">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{content || '*Sin contenido.*'}</ReactMarkdown>
    </div>
  );
}
