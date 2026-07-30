// Types for frontmatter.mjs — see the note at the top of that file for why
// the implementation is plain ESM rather than TypeScript.

export type Frontmatter = Record<string, string | undefined>;

export declare function parseFrontmatter(markdown: string): {
  data: Frontmatter;
  content: string;
};

export declare function splitList(value: string | undefined): string[];

export declare function titleFromMarkdown(
  markdown: string,
  fallback: string,
): string;

export declare function cleanTitle(title: string): string;
