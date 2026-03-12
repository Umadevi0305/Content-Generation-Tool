import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';

export default function MarkdownPreview({ content }) {
  return (
    <div className="markdown-preview prose prose-invert max-w-none text-sm text-gray-300">
      <ReactMarkdown rehypePlugins={[rehypeRaw]}>
        {content}
      </ReactMarkdown>
    </div>
  );
}
