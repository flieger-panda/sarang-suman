// Projects and about-me copy lives in content/*.md so it can be edited
// without touching component code. Vite inlines these as raw strings at
// build time (import.meta.glob), so this stays a fully static site — no
// runtime fetch, no backend.

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

const projectModules = import.meta.glob("../../content/projects/*.md", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

export const aboutMeContent = Object.values(aboutModules)[0] ?? "";

export const skillsContent = Object.values(skillsModules)[0] ?? "";

function titleFromMarkdown(markdown: string, fallback: string): string {
  const heading = markdown.match(/^#\s+(.+)$/m);
  return heading ? heading[1].trim() : fallback;
}

function slugFromPath(path: string): string {
  return path.split("/").pop()!.replace(/\.md$/, "");
}

// Frontmatter carries a `date` field (YYYY-MM, or "present" for ongoing
// work) used to sort entries; it's stripped before the markdown is rendered.
function parseFrontmatter(markdown: string): {
  date: string;
  content: string;
} {
  const match = markdown.match(/^---\n([\s\S]*?)\n---\n?/);
  if (!match) return { date: "", content: markdown };
  const date = match[1].match(/^date:\s*(.+)$/m)?.[1].trim() ?? "";
  return { date, content: markdown.slice(match[0].length) };
}

// "present" sorts after any YYYY-MM date since "9999" > any real year.
function dateSortKey(date: string): string {
  return date.toLowerCase() === "present" ? "9999-99" : date;
}

export type Project = {
  slug: string;
  title: string;
  date: string;
  content: string;
};

export const projects: Project[] = Object.entries(projectModules)
  .map(([path, raw]) => {
    const slug = slugFromPath(path);
    const { date, content } = parseFrontmatter(raw);
    return { slug, title: titleFromMarkdown(content, slug), date, content };
  })
  .sort((a, b) => dateSortKey(b.date).localeCompare(dateSortKey(a.date)));

export function getProject(slug: string | undefined): Project | undefined {
  return projects.find((project) => project.slug === slug);
}
