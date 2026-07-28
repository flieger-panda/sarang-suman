import ReactMarkdown from "react-markdown";
import remarkBreaks from "remark-breaks";

const HEADING_CLASS = "font-heading font-bold text-white";

export default function MarkdownContent({ children }: { children: string }) {
  return (
    <div className="font-mono text-white [&_p]:mb-4 [&_ul]:mb-4 [&_ul]:list-disc [&_ul]:pl-6 [&_a]:underline [&_a]:decoration-dotted [&_a:hover]:text-white/70">
      <ReactMarkdown
        remarkPlugins={[remarkBreaks]}
        components={{
          h1: (props) => (
            <h1 className={`${HEADING_CLASS} mb-4 text-2xl`} {...props} />
          ),
          h2: (props) => (
            <h2 className={`${HEADING_CLASS} mt-6 mb-3 text-xl`} {...props} />
          ),
          h3: (props) => (
            <h3
              className={`${HEADING_CLASS} mt-6 mb-3 text-lg`}
              {...props}
            />
          ),
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
