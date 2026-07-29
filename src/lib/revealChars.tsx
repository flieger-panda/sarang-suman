import { cloneElement, isValidElement, type ReactNode } from "react";

function splitWordChars(word: string, keyPrefix: string): ReactNode {
  return (
    <span key={keyPrefix} className="inline-block">
      {Array.from(word).map((ch, i) => (
        <span key={`${keyPrefix}-${i}`} data-char className="opacity-0">
          {ch}
        </span>
      ))}
    </span>
  );
}

function splitTextChars(text: string, keyPrefix: string): ReactNode {
  // Each word (not each character) gets its own inline-block wrapper.
  // Adjacent atomic inline-block boxes are independently breakable by
  // browsers even with no whitespace between them, so per-char
  // inline-block spans let lines wrap mid-word; grouping by word keeps
  // the only break opportunities at the real word boundaries, same as
  // plain text. Whitespace is left as plain text between the word spans
  // rather than wrapped itself: a lone space as the sole content of an
  // inline-block is both the first and last character of that box's
  // own line, so browsers trim it as leading/trailing whitespace and it
  // collapses to zero width, gluing adjacent words together.
  return text
    .split(/(\s+)/)
    .map((part, i) =>
      part === "" || /^\s+$/.test(part)
        ? part
        : splitWordChars(part, `${keyPrefix}-${i}`),
    );
}

// Recursively wraps every character of every text node in a data-char
// span (paired with useCharReveal) so arbitrary content — not just flat
// labels — gets the same stagger-fade typed-in effect, while preserving
// whatever markup (links, bold, headings, etc.) surrounds that text.
export function revealChars(node: ReactNode, keyPrefix = "c"): ReactNode {
  if (typeof node === "string") {
    return splitTextChars(node, keyPrefix);
  }
  if (typeof node === "number") {
    return splitTextChars(String(node), keyPrefix);
  }
  if (Array.isArray(node)) {
    return node.map((child, i) => revealChars(child, `${keyPrefix}-${i}`));
  }
  if (isValidElement<{ children?: ReactNode }>(node)) {
    if (node.props.children === undefined) return node;
    return cloneElement(
      node,
      undefined,
      revealChars(node.props.children, keyPrefix),
    );
  }
  return node;
}
