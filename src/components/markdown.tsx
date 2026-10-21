import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

/** Renders trusted-ish markdown with GFM support (tables, strikethrough…). */
export default function Markdown({ content, inline }: { content: string; inline?: boolean }) {
  return (
    <div className={inline ? "inline" : "markdown"} data-testid="markdown">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ node, ...props }) => {
            void node;
            return <a {...props} target="_blank" rel="noreferrer noopener" />;
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
