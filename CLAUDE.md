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

- `src/App.tsx` — root component; the site is currently a single page
- `src/main.tsx` — React entry point
- `src/index.css` — global styles; contains only `@import "tailwindcss";`
- `public/` — static files served as-is (favicon, etc.)
- `assets/` — images referenced from `README.md` (not part of the built site)

## Conventions

- Style with Tailwind utility classes directly in JSX. Avoid adding separate `.css` files or CSS-in-JS unless a case genuinely can't be expressed with utilities.
- Tailwind CSS v4 is configured via the `@tailwindcss/vite` plugin in `vite.config.ts` — there is no `tailwind.config.js`; theme customization belongs in `src/index.css` using `@theme`.
- Keep components function components with TypeScript; no class components.
- This is a static site with no server/API layer — don't introduce backend code, databases, or server frameworks without checking with the user first.
