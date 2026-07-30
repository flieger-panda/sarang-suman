# CLAUDE.md

Guidance for Claude Code when working in this repository.

## Project

Sarang Suman's personal website — a static site built with React, TypeScript, Vite, and Tailwind CSS. There is no backend; everything ships as static HTML/CSS/JS.

## Commands

- `npm run dev` — start the Vite dev server with HMR
- `npm run build` — type-check (`tsc -b`) then produce a production build in `dist/`
- `npm run preview` — serve the production build locally
- `npm run lint` — run oxlint

There is no test suite configured yet.

## Structure

- `src/App.tsx` — root component; routes between pages via `react-router-dom`
- `src/main.tsx` — React entry point
- `src/index.css` — global styles; contains only `@import "tailwindcss";` plus theme overrides
- `src/pages/` — routed pages (Skills, Projects, ProjectDetail, AboutMe, Music)
- `src/components/` — shared components (HomeMenu, MarkdownContent, PageTransition, WaveHero, etc.)
- `src/hooks/` — shared hooks (`useArrowKeyList`, `useCharReveal`)
- `src/lib/` — content/data and small utilities (`content.ts`, `revealChars.tsx`)
- `public/` — static files served as-is (favicon, etc.)
- `assets/` — images referenced from `README.md` (not part of the built site)

## Conventions

- Style with Tailwind utility classes directly in JSX. Avoid adding separate `.css` files or CSS-in-JS unless a case genuinely can't be expressed with utilities.
- Tailwind CSS v4 is configured via the `@tailwindcss/vite` plugin in `vite.config.ts` — there is no `tailwind.config.js`; theme customization belongs in `src/index.css` using `@theme`.
- Keep components function components with TypeScript; no class components.
- This is a static site with no server/API layer — don't introduce backend code, databases, or server frameworks without checking with the user first.
- **Any `>`-cursor selectable list (arrow keys + hover + Enter) must use `src/hooks/useArrowKeyList.ts`**, not a hand-rolled `useState`/`keydown` effect. Site-wide UI behaviors like this were previously reimplemented per-page and drifted (e.g. one page's list let arrow keys reach its back button and another's didn't; a keyboard-move/mouse-hover race was fixed on one page but not on others that had the identical pattern). Before shipping a new page-specific interaction, check whether it's really page-specific or whether it's a generalizable site behavior that belongs in a shared hook/component instead — see "Cursor-based navigation" in `website_design.md` for the full rationale.
- **Every cursor list lands on its first real entry on load** — via `initialIndex` — never on `-1` (nothing selected) and never on a leading "< back". Don't add a new list that starts unselected; that convention was deliberately reversed once already (see `website_design.md`).
