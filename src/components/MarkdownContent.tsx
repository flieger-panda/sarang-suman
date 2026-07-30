import {
  useMemo,
  useRef,
  type ComponentPropsWithoutRef,
  type ElementType,
  type ReactNode,
} from "react";
import { Link, useNavigate } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import remarkBreaks from "remark-breaks";
import { revealChars } from "../lib/revealChars";
import { useArrowKeyList } from "../hooks/useArrowKeyList";

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
  backHref,
  backLabel = "< back",
  headingLinks,
}: {
  children: string;
  // Lets a page opt into arrow-key navigation over its h2 sections: a
  // blinking `>` cursor (same look as CursorLink/HomeMenu) that moves
  // between headings and scrolls each into view, for pages like Skills
  // that are effectively a list of sections rather than prose. The h1
  // stays a plain, non-interactive page title regardless — only h2s are
  // ever part of the cursor list.
  navigableHeadings?: boolean;
  // Renders the page's "< back" link as part of the same cursor list
  // instead of the page rendering its own plain <Link>, so it picks up
  // the same '>' selector as everything else. Only wired into the
  // arrow-key list when navigableHeadings is also set (ArrowUp out of the
  // first heading reaches it) — with it unset, there's nothing else on
  // the page to arrow-navigate between, and capturing ArrowUp/Down would
  // just cost the browser's native page-scroll on those keys for no
  // benefit. Hover selection still works either way, so the link still
  // gets consistent '>' styling regardless.
  backHref?: string;
  backLabel?: string;
  // Maps an h2's exact text to a URL: pressing Enter while that heading
  // is selected opens it (new tab), on top of the default scroll-into-view.
  // For sections that are themselves just a link out (e.g. Music's "my
  // spotify"), so keyboard activation does what Enter on a link elsewhere
  // on the site would do.
  headingLinks?: Record<string, string>;
}) {
  const navigate = useNavigate();
  const headingTitles = useMemo(() => extractH2Titles(children), [children]);
  const headingRefs = useRef<HTMLHeadingElement[]>([]);

  // When a back link is present it occupies index 0, pushing headings
  // down by one — keeps "nothing selected" as the same -1 sentinel
  // useArrowKeyList already uses everywhere else on the site.
  const headingOffset = backHref ? 1 : 0;
  const entryCount = headingTitles.length + headingOffset;

  const { selectedIndex, hoverSelect } = useArrowKeyList({
    length: entryCount,
    enabled: navigableHeadings,
    // Site convention: land on the first real entry (skipping both
    // "nothing" and any leading back link) rather than starting
    // unselected — see website_design.md. Clamped in case a page ever
    // has nothing beyond "back" to select.
    initialIndex: Math.min(headingOffset, entryCount - 1),
    onMove: (index) => {
      if (backHref && index === 0) {
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }
      headingRefs.current[index - headingOffset]?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    },
    onActivate: (index) => {
      if (backHref && index === 0) {
        navigate(backHref);
        return;
      }
      const href = headingLinks?.[headingTitles[index - headingOffset]];
      if (href) window.open(href, "_blank", "noopener,noreferrer");
    },
  });

  // NavigableHeading is read live inside itself via these refs rather than
  // closing over props/state directly, so the component function below can
  // be created exactly once (see navigableHeadingComponent) and keep a
  // stable identity across re-renders while still reflecting current state.
  const selectedIndexRef = useRef(selectedIndex);
  selectedIndexRef.current = selectedIndex;
  const navigableHeadingsRef = useRef(navigableHeadings);
  navigableHeadingsRef.current = navigableHeadings;
  const headingTitlesRef = useRef(headingTitles);
  headingTitlesRef.current = headingTitles;
  const headingOffsetRef = useRef(headingOffset);
  headingOffsetRef.current = headingOffset;

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
      const headingPos = headingTitlesRef.current.indexOf(
        flattenText(children),
      );
      const index = headingPos + headingOffsetRef.current;
      const isSelected =
        navigableHeadingsRef.current &&
        headingPos !== -1 &&
        selectedIndexRef.current === index;
      return (
        <h2
          ref={(el) => {
            if (el && headingPos !== -1) headingRefs.current[headingPos] = el;
          }}
          className={[HEADING_CLASS, "relative mt-6 mb-3 text-xl", className]
            .filter(Boolean)
            .join(" ")}
          onMouseEnter={
            navigableHeadingsRef.current
              ? () => hoverSelect(index)
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

  const isBackSelected = Boolean(backHref) && selectedIndex === 0;

  return (
    <>
      {backHref && (
        <Link
          to={backHref}
          className="relative mb-8 inline-block font-mono text-white"
          onMouseEnter={() => hoverSelect(0)}
        >
          <span
            className={
              "absolute right-full mr-2 " +
              (isBackSelected
                ? "animate-blink [text-shadow:0_0_14px_rgba(255,255,255,1)]"
                : "invisible")
            }
          >
            &gt;
          </span>
          <span
            className={
              isBackSelected
                ? "font-bold [text-shadow:0_0_14px_rgba(255,255,255,1)]"
                : ""
            }
          >
            {revealChars(backLabel)}
          </span>
        </Link>
      )}
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
    </>
  );
}
