import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentPropsWithoutRef,
  type ElementType,
  type ReactNode,
} from "react";
import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";
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

// These are plain functions of their (static) arguments, so they're built
// once at module scope rather than inside the component. react-markdown
// treats each `components` entry as an element type: a new function
// reference on every render reads as "a different component" to React and
// forces the whole markdown subtree to unmount/remount instead of just
// re-rendering, which is disastrous once MarkdownContent has its own state
// (see NavigableHeading below).
const H1 = revealTag("h1", `${HEADING_CLASS} mb-4 text-2xl`);
const H3 = revealTag("h3", `${HEADING_CLASS} mt-6 mb-3 text-lg`);
const P = revealTag("p");
const Li = revealTag("li");
const Strong = revealTag("strong");
const Em = revealTag("em");
const A = revealTag("a");

// Plain-text ## headings, in document order, parsed straight from the
// markdown source. Used to give each rendered h2 a stable index (see
// NavigableHeading) without a mutable counter — see the note below on why
// a counter breaks under StrictMode.
function extractH2Titles(markdown: string): string[] {
  return Array.from(markdown.matchAll(/^##\s+(.+)$/gm)).map((m) =>
    m[1].trim(),
  );
}

function flattenText(node: ReactNode): string {
  if (typeof node === "string") return node;
  if (typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(flattenText).join("");
  if (
    typeof node === "object" &&
    node !== null &&
    "props" in node &&
    typeof (node as { props?: { children?: ReactNode } }).props === "object"
  ) {
    return flattenText(
      (node as { props: { children?: ReactNode } }).props.children,
    );
  }
  return "";
}

export default function MarkdownContent({
  children,
  navigableHeadings = false,
}: {
  children: string;
  // Lets a page opt into arrow-key navigation over its h2 sections: a
  // blinking `>` cursor (same look as CursorLink/HomeMenu) that moves
  // between headings and scrolls each into view, for pages like Skills
  // that are effectively a list of sections rather than prose.
  navigableHeadings?: boolean;
}) {
  const headingTitles = useMemo(() => extractH2Titles(children), [children]);
  const headingRefs = useRef<HTMLHeadingElement[]>([]);
  const [selectedHeading, setSelectedHeading] = useState(
    navigableHeadings ? 0 : -1,
  );

  // NavigableHeading is read live inside itself via these refs rather than
  // closing over props/state directly, so the component function below can
  // be created exactly once (see navigableHeadingComponent) and keep a
  // stable identity across re-renders while still reflecting current state.
  const selectedHeadingRef = useRef(selectedHeading);
  selectedHeadingRef.current = selectedHeading;
  const navigableHeadingsRef = useRef(navigableHeadings);
  navigableHeadingsRef.current = navigableHeadings;
  const headingTitlesRef = useRef(headingTitles);
  headingTitlesRef.current = headingTitles;

  useEffect(() => {
    if (!navigableHeadings) return;

    // Reads/updates via selectedHeadingRef rather than a setState updater
    // function, since the updater form is invoked twice under StrictMode
    // in dev to catch impurity — and scrollIntoView here is a side effect,
    // so a double-invoked updater would scroll twice and (worse) let the
    // second call race the first with a stale index.
    const move = (delta: number) => {
      const next = Math.max(
        -1,
        Math.min(
          selectedHeadingRef.current + delta,
          headingTitlesRef.current.length - 1,
        ),
      );
      headingRefs.current[next]?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
      setSelectedHeading(next);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        move(1);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        move(-1);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [navigableHeadings]);

  const navigableHeadingComponent = useRef<ElementType | null>(null);
  if (!navigableHeadingComponent.current) {
    navigableHeadingComponent.current = function NavigableHeading({
      children,
      className,
      ...rest
    }: ComponentPropsWithoutRef<"h2"> & { children?: ReactNode }) {
      // Derived from the heading's own text rather than an incrementing
      // ref counter: React 18 StrictMode renders each component twice (to
      // catch impure renders), so a `ref.current++` counter advances twice
      // per heading and desyncs from the once-per-heading DOM commit —
      // this stays correct because it's a pure function of `children`.
      const index = headingTitlesRef.current.indexOf(flattenText(children));
      const isSelected =
        navigableHeadingsRef.current && selectedHeadingRef.current === index;
      return (
        <h2
          ref={(el) => {
            if (el && index !== -1) headingRefs.current[index] = el;
          }}
          className={[HEADING_CLASS, "relative mt-6 mb-3 text-xl", className]
            .filter(Boolean)
            .join(" ")}
          onMouseEnter={
            navigableHeadingsRef.current
              ? () => setSelectedHeading(index)
              : undefined
          }
          {...rest}
        >
          {navigableHeadingsRef.current && (
            <span
              className={
                "absolute right-full mr-2 " +
                (isSelected
                  ? "animate-blink [text-shadow:0_0_14px_rgba(255,255,255,1)]"
                  : "invisible")
              }
            >
              &gt;
            </span>
          )}
          {revealChars(children)}
        </h2>
      );
    };
  }

  return (
    <div className="font-mono text-white [&_p]:mb-4 [&_ul]:mb-4 [&_ul]:list-disc [&_ul]:pl-6 [&_a]:underline [&_a]:decoration-dotted [&_a:hover]:text-white/70">
      <ReactMarkdown
        remarkPlugins={[remarkBreaks]}
        remarkRehypeOptions={{ allowDangerousHtml: true }}
        rehypePlugins={[rehypeRaw]}
        components={{
          h1: H1,
          h2: navigableHeadingComponent.current,
          h3: H3,
          p: P,
          li: Li,
          strong: Strong,
          em: Em,
          a: A,
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
