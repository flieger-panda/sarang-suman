// Portfolio and about-me copy lives in content/*.md so it can be edited
// without touching component code. Vite inlines these as raw strings at
// build time (import.meta.glob), so this stays a fully static site — no
// runtime fetch, no backend.

const aboutModules = import.meta.glob("../../content/about.md", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

const portfolioModules = import.meta.glob("../../content/portfolio/*.md", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

export const aboutMeContent = Object.values(aboutModules)[0] ?? "";

function titleFromMarkdown(markdown: string, fallback: string): string {
  const heading = markdown.match(/^#\s+(.+)$/m);
  return heading ? heading[1].trim() : fallback;
}

function slugFromPath(path: string): string {
  return path.split("/").pop()!.replace(/\.md$/, "");
}

export type PortfolioProject = {
  slug: string;
  title: string;
  content: string;
};

export const portfolioProjects: PortfolioProject[] = Object.entries(
  portfolioModules,
)
  .map(([path, content]) => {
    const slug = slugFromPath(path);
    return { slug, title: titleFromMarkdown(content, slug), content };
  })
  .sort((a, b) => a.title.localeCompare(b.title));

export function getPortfolioProject(
  slug: string | undefined,
): PortfolioProject | undefined {
  return portfolioProjects.find((project) => project.slug === slug);
}
