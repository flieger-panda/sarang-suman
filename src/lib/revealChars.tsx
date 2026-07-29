import { cloneElement, isValidElement, type ReactNode } from "react";

function splitTextChars(text: string, keyPrefix: string): ReactNode {
  // Whitespace is left as plain text rather than wrapped in its own
  // inline-block span: a lone space as the sole content of an
  // inline-block is both the first and last character of that box's
  // own line, so browsers trim it as leading/trailing whitespace and it
  // collapses to zero width, gluing adjacent words together. Whitespace
  // has no glyph to fade in anyway, so it doesn't need a data-char span.
  return Array.from(text).map((ch, i) =>
    /\s/.test(ch) ? (
      ch
    ) : (
      <span
        key={`${keyPrefix}-${i}`}
        data-char
        className="inline-block opacity-0"
      >
        {ch}
      </span>
    ),
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
