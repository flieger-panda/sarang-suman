// Projects and about-me copy lives in content/*.md so it can be edited
// without touching component code. Vite inlines these as raw strings at
// build time (import.meta.glob), so this stays a fully static site — no
// runtime fetch, no backend.

import {
  parseFrontmatter,
  splitList,
  titleFromMarkdown,
} from "./frontmatter.mjs";

const aboutModules = import.meta.glob("../../content/about.md", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

const skillsModules = import.meta.glob("../../content/skills.md", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

const musicModules = import.meta.glob("../../content/music.md", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

const projectModules = import.meta.glob("../../content/projects/*.md", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

export const aboutMeContent = Object.values(aboutModules)[0] ?? "";

export const skillsContent = Object.values(skillsModules)[0] ?? "";

export const musicContent = Object.values(musicModules)[0] ?? "";

function slugFromPath(path: string): string {
  return path.split("/").pop()!.replace(/\.md$/, "");
}

// "present" sorts after any YYYY-MM date since "9999" > any real year.
function dateSortKey(date: string): string {
  return date.toLowerCase() === "present" ? "9999-99" : date;
}

export type Project = {
  slug: string;
  title: string;
  /** YYYY-MM, or "present" for ongoing work. Sorts the projects list. */
  date: string;
  /**
   * Metadata-only fields: these never render on the page. They feed the
   * per-route <title>, <meta description>, and JSON-LD `keywords` (see
   * src/lib/seo.mjs), which is why a project can be described for search
   * without adding anything to the visible, deliberately minimal copy.
   */
  description: string;
  keywords: string[];
  content: string;
};

export const projects: Project[] = Object.entries(projectModules)
  .map(([path, raw]) => {
    const slug = slugFromPath(path);
    const { data, content } = parseFrontmatter(raw);
    return {
      slug,
      title: titleFromMarkdown(content, slug),
      date: data.date ?? "",
      description: data.description ?? "",
      keywords: splitList(data.keywords),
      content,
    };
  })
  .sort((a, b) => dateSortKey(b.date).localeCompare(dateSortKey(a.date)));

export function getProject(slug: string | undefined): Project | undefined {
  return projects.find((project) => project.slug === slug);
}
