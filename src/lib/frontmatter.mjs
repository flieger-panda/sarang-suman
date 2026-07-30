// Frontmatter parsing for content/*.md, shared by the app
// (src/lib/content.ts) and the build-time SEO generator
// (scripts/build-seo.mjs).
//
// Plain ESM rather than TypeScript on purpose: build-seo.mjs runs under bare
// `node` after `vite build`, with no transpile step, so anything it shares
// with the app has to be directly runnable. Types live alongside in
// frontmatter.d.mts. The alternative was letting the two sides keep their own
// copy of the parser, which is exactly the kind of drift CLAUDE.md warns
// about — the head tags and the rendered page would disagree about a
// project's title the moment one copy changed.
//
// Deliberately not a YAML parser. The grammar is `key: value` plus indented
// continuation lines (so a long `description` can wrap in the source), which
// is all this content needs and avoids a dependency for a handful of fields.

const FRONTMATTER_RE = /^---\n([\s\S]*?)\n---\n?/;
const FIELD_RE = /^([A-Za-z][\w-]*):\s*(.*)$/;

/**
 * Splits a markdown source into its frontmatter fields and the body below.
 * Returns empty `data` (and the body unchanged) when there's no frontmatter.
 */
export function parseFrontmatter(markdown) {
  const match = markdown.match(FRONTMATTER_RE);
  if (!match) return { data: {}, content: markdown };

  const data = {};
  let key = null;
  for (const line of match[1].split("\n")) {
    if (!line.trim()) continue;

    const field = line.match(FIELD_RE);
    if (field) {
      key = field[1];
      data[key] = field[2].trim();
      continue;
    }

    // An indented line continues the previous value, so a long description
    // can wrap in the source without turning into a separate field.
    if (key && /^\s+\S/.test(line)) {
      data[key] = `${data[key]} ${line.trim()}`.trim();
    }
  }

  return { data, content: markdown.slice(match[0].length) };
}

/** Splits a comma-separated frontmatter value (e.g. `keywords`) into a list. */
export function splitList(value) {
  if (!value) return [];
  return value
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
}

/** The first `# ` heading in a markdown body, used as the page title. */
export function titleFromMarkdown(markdown, fallback) {
  const heading = markdown.match(/^#\s+(.+)$/m);
  return heading ? heading[1].trim() : fallback;
}

/**
 * A heading cleaned up for use in a <title> tag or JSON-LD `name`: strips
 * leading decoration (the projects list uses a leading emoji on one entry)
 * so the SERP title starts on a word. The on-page heading keeps the emoji —
 * only the metadata copy is normalized.
 */
export function cleanTitle(title) {
  return title.replace(/^[^\p{L}\p{N}]+/u, "").trim();
}
