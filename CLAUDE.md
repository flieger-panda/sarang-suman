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

## Deployment

- Deploys to GitHub Pages via `.github/workflows/deploy.yml`. The workflow builds (and lints) on every PR to `main`, but the `deploy` job is gated with `if: github.event_name != 'pull_request'` — only a `push` to `main` actually publishes. A green PR check means the build succeeds, not that anything went live.
- Node version is pinned once, in `.nvmrc` — `package.json`'s `engines` field and the workflow's `actions/setup-node` step (`node-version-file: .nvmrc`) both read from it. Keep it as the single source of truth rather than hardcoding a version anywhere else; `pdfjs-dist` requires `>=22.13.0`. `.npmrc` sets `engine-strict=true` so that constraint is enforced rather than advisory: on a wrong Node version `npm ci` now fails immediately with `EBADENGINE ... Required: {"node":">=22.13.0"}` instead of warning and installing anyway, which previously let a bad version surface much later as an unrelated-looking lockfile error.
- Dependency bumps come from `.github/dependabot.yml` (npm + github-actions, weekly). Minor/patch npm updates are grouped into a single PR so routine noise doesn't bury majors. Because the workflow builds on PRs, Dependabot's PRs get validated automatically — review the check before merging rather than trusting the bump.
- Custom domain is `sarangsuman.me`, set via `public/CNAME` — Vite copies everything in `public/` verbatim into `dist/`, which is where GitHub Pages expects the `CNAME` file to live.
- The app uses `BrowserRouter` (real paths like `/projects/:slug`, not hash routes), but GitHub Pages has no server-side rewrite rules. That's why `npm run build` ends with `cp dist/index.html dist/404.html` — Pages serves `404.html` for any unmatched path, and since it's byte-identical to `index.html`, React Router picks up the real route client-side once it loads. Don't remove that build step, and remember any new top-level route depends on it to survive a refresh or direct link.
- `index.html`'s Open Graph / Twitter meta tags (`og:image`, `og:url`, etc.) must stay **absolute** URLs (`https://sarangsuman.me/...`), not relative paths — link scrapers (LinkedIn, iMessage, Slack, X) don't resolve relative URLs against the page, so a relative path silently produces no preview at all rather than an error.
- Brand assets in `public/` are all generated from the same source — the `> s` wordmark in Space Mono with the menu cursor's glow — rather than hand-drawn, so they stay in sync if the treatment changes:
  - `favicon.svg` — vector paths extracted from the bundled `@fontsource/space-mono` woff2 via `fontTools`, so it doesn't depend on the font being available at render time. The glow is an SVG filter (`feGaussianBlur` + `feFlood`/`feComposite` + `feMerge`) reproducing the menu's three-layer `text-shadow`, clipped to the tile so it can't spill past the rounded corners. Verify any change at 16px, not just at full size.
  - `apple-touch-icon.png` — 180×180 raster of the same mark, **square with no corner rounding** (iOS applies its own mask; a pre-rounded source double-rounds into black corner wedges). iOS ignores SVG favicons for "Add to Home Screen", which is why a raster copy exists at all.
  - `og.png` — 1200×630 capture of the real home page cropped to the menu. When re-capturing, note the menu is gated behind `PageTransition`'s curtain, so a naive headless screenshot yields an empty page: wait for every `[data-char]` to reach opacity 1 rather than guessing a delay, freeze the `animate-blink` cursor so it isn't caught mid-blink, and exclude the absolutely-positioned `>` cursor spans when measuring the crop centre or the text lands off-centre.

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
- **After `npm install`-ing a new dependency, don't assume `package-lock.json` is complete.** npm generates the lockfile based on the platform it runs on, so a lockfile produced on macOS can silently omit Linux-only transitive deps (seen with `pdfjs-dist`'s `@napi-rs/canvas-linux-*` bindings, which pulled in `@emnapi/core`/`@emnapi/runtime` that never appeared in the macOS-generated lockfile). CI runs `npm ci` on `ubuntu-latest` and fails with `Missing: <pkg> from lock file` when this happens — this is why the deploy workflow builds on PRs before it builds on `main`, so it's caught before it reaches the deployed branch. Fix by regenerating the lockfile under Linux, e.g. `docker run --rm --platform linux/amd64 -v "$PWD":/app -w /app node:22 npm install --package-lock-only`, then verify `npm ci` still succeeds locally afterward.
