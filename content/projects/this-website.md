---
date: present
---
# This Website

**Personal Project**
2025 – Present

**Stack:** React, TypeScript, Vite, Tailwind CSS v4, React Router, react-markdown, Motion, anime.js

I designed and built this site as a single-page React application with no backend: every project write-up lives as a Markdown file with frontmatter, which Vite inlines at build time via `import.meta.glob` and React Router renders client-side, so the whole thing ships as static HTML/CSS/JS with no runtime fetch.

I styled the interface entirely in Tailwind utility classes, using Tailwind v4's Vite plugin and `@theme` customization instead of a separate config file, and layered in interaction details like arrow-key project navigation, a wave effect that lingers at the screen edge, and load-in animations built with Motion and anime.js. Content authoring is decoupled from the component code: each project entry is a Markdown file sorted by a `date` field in its frontmatter, so adding or reordering projects never touches TypeScript.

It make the site easy to keep evolving since every project on it, including this one, is documented the same way.