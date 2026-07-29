import type { ComponentPropsWithoutRef, ElementType, ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import remarkBreaks from "remark-breaks";
import { revealChars } from "../lib/revealChars";

const HEADING_CLASS = "font-heading font-bold text-white";

// Builds a react-markdown component override that splits its own text
// into data-char spans (see revealChars/useCharReveal) so every markdown
// element gets the same typed-in reveal as the rest of the site, while
// still forwarding whatever tag-specific props react-markdown passes
// (href/target/rel on <a>, etc.).
function revealTag(tag: ElementType, extraClassName?: string) {
  return function RevealedTag({
    children,
    className,
    ...rest
  }: ComponentPropsWithoutRef<typeof tag> & { children?: ReactNode }) {
    const Tag = tag;
    return (
      <Tag
        className={[extraClassName, className].filter(Boolean).join(" ")}
        {...rest}
      >
        {revealChars(children)}
      </Tag>
    );
  };
}

export default function MarkdownContent({ children }: { children: string }) {
  return (
    <div className="font-mono text-white [&_p]:mb-4 [&_ul]:mb-4 [&_ul]:list-disc [&_ul]:pl-6 [&_a]:underline [&_a]:decoration-dotted [&_a:hover]:text-white/70">
      <ReactMarkdown
        remarkPlugins={[remarkBreaks]}
        components={{
          h1: revealTag("h1", `${HEADING_CLASS} mb-4 text-2xl`),
          h2: revealTag("h2", `${HEADING_CLASS} mt-6 mb-3 text-xl`),
          h3: revealTag("h3", `${HEADING_CLASS} mt-6 mb-3 text-lg`),
          p: revealTag("p"),
          li: revealTag("li"),
          strong: revealTag("strong"),
          em: revealTag("em"),
          a: revealTag("a"),
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
