# CLAUDE.md

Guidance for Claude Code when working in this repository.

## Project

Sarang Suman's personal website — a static site built with React, TypeScript, Vite, and Tailwind CSS. There is no backend; everything ships as static HTML/CSS/JS.

## Commands

- `npm run dev` — start the Vite dev server with HMR
- `npm run build` — type-check (`tsc -b`), produce a production build in `dist/`, then run
  `scripts/build-seo.mjs` (per-route `<head>`, `sitemap.xml`, `404.html`, résumé PDF — see SEO below)
- `npm run preview` — serve the production build locally
- `npm run lint` — run oxlint

There is no test suite configured yet.

## Deployment

- Deploys to GitHub Pages via `.github/workflows/deploy.yml`. The workflow builds (and lints) on every PR to `main`, but the `deploy` job is gated with `if: github.event_name != 'pull_request'` — only a `push` to `main` actually publishes. A green PR check means the build succeeds, not that anything went live.
- Node version is pinned once, in `.nvmrc` — `package.json`'s `engines` field and the workflow's `actions/setup-node` step (`node-version-file: .nvmrc`) both read from it. Keep it as the single source of truth rather than hardcoding a version anywhere else; `pdfjs-dist` requires `>=22.13.0`. `.npmrc` sets `engine-strict=true` so that constraint is enforced rather than advisory: on a wrong Node version `npm ci` now fails immediately with `EBADENGINE ... Required: {"node":">=22.13.0"}` instead of warning and installing anyway, which previously let a bad version surface much later as an unrelated-looking lockfile error.
- Dependency bumps come from `.github/dependabot.yml` (npm + github-actions, weekly). Minor/patch npm updates are grouped into a single PR so routine noise doesn't bury majors. Because the workflow builds on PRs, Dependabot's PRs get validated automatically — review the check before merging rather than trusting the bump.
- Custom domain is `sarangsuman.me`, set via `public/CNAME` — Vite copies everything in `public/` verbatim into `dist/`, which is where GitHub Pages expects the `CNAME` file to live.
- The app uses `BrowserRouter` (real paths like `/projects/:slug`, not hash routes), but GitHub Pages has no server-side rewrite rules. `scripts/build-seo.mjs` now writes a real HTML file per route (`dist/skills.html`, `dist/projects/nila.html`, …) so Pages serves each URL directly, and still writes `dist/404.html` as the fallback for anything without a generated file — Pages serves it for unmatched paths, and React Router picks up the real route client-side once it loads. Don't remove that fallback; any route missing from the table in `src/lib/seo.mjs` depends on it to survive a refresh or direct link.
  - Flat `skills.html` rather than `skills/index.html` is deliberate: Pages resolves `/skills` to it directly, whereas a directory 301s to `/skills/` and leaves the canonical URL disagreeing with the linked one.
- `index.html`'s Open Graph / Twitter meta tags (`og:image`, `og:url`, etc.) must stay **absolute** URLs (`https://sarangsuman.me/...`), not relative paths — link scrapers (LinkedIn, iMessage, Slack, X) don't resolve relative URLs against the page, so a relative path silently produces no preview at all rather than an error.
- Brand assets in `public/` are all generated from the same source — the `> s` wordmark in Space Mono with the menu cursor's glow — rather than hand-drawn, so they stay in sync if the treatment changes:
  - `favicon.svg` — vector paths extracted from the bundled `@fontsource/space-mono` woff2 via `fontTools`, so it doesn't depend on the font being available at render time. The glow is an SVG filter (`feGaussianBlur` + `feFlood`/`feComposite` + `feMerge`) reproducing the menu's three-layer `text-shadow`, clipped to the tile so it can't spill past the rounded corners. Verify any change at 16px, not just at full size.
  - `apple-touch-icon.png` — 180×180 raster of the same mark, **square with no corner rounding** (iOS applies its own mask; a pre-rounded source double-rounds into black corner wedges). iOS ignores SVG favicons for "Add to Home Screen", which is why a raster copy exists at all.
  - `og.png` — 1200×630 capture of the real home page cropped to the menu. When re-capturing, note the menu is gated behind `PageTransition`'s curtain, so a naive headless screenshot yields an empty page: wait for every `[data-char]` to reach opacity 1 rather than guessing a delay, freeze the `animate-blink` cursor so it isn't caught mid-blink, and exclude the absolutely-positioned `>` cursor spans when measuring the crop centre or the text lands off-centre.

## SEO

See `seo_plan.md` for the full rationale and `seo_manual_steps.md` for the off-page work that
isn't in the repo. The invariants that are easy to break by accident:

- **`src/lib/seo.mjs` is the single source of truth for per-route metadata.** Titles,
  descriptions, canonical URLs, and the JSON-LD graph all come from its route table. `index.html`'s
  head tags are only the placeholders `scripts/build-seo.mjs` substitutes into — editing them
  instead of the route table makes the two disagree. A new route needs an entry there or it gets
  no metadata and no sitemap entry.
- **`src/lib/seo.mjs` and `src/lib/frontmatter.mjs` are plain ESM (`.mjs` + a hand-written
  `.d.mts`), not TypeScript, on purpose.** `scripts/build-seo.mjs` runs under bare `node` after
  `vite build` with no transpile step, and both the browser and the build script import them. Don't
  "clean this up" into `.ts` — that forces a second copy of the parser and route composition, and
  the generated `<head>` starts disagreeing with the page the app renders.
- **`scripts/build-seo.mjs` rewrites the head by text substitution, so don't write literal tag
  syntax in `index.html`'s head comments.** Spelling out a title tag in a comment there once
  caused the pattern to match *inside the comment* and run to the real closing tag, eating the
  comment's terminator and commenting out the entire head. Every `grep` of the raw HTML still
  reported the right values because the bytes were present, and a browser looked fine because
  assigning `document.title` creates a title element when the document has none. `assertHead()` in
  that script now re-reads its own output with comments stripped and throws; keep it.
- **Per-route metadata is applied imperatively (`src/hooks/useRouteMeta.ts`), not via React 19's
  built-in `<title>`/`<meta>` hoisting.** React *appends* hoisted tags rather than replacing what
  the document already has, and `document.title` is defined as the **first** title element — so a
  React-rendered one is a second element the browser ignores, and you get two meta descriptions.
  The hook is called once in `App.tsx` so no page can ship without metadata.
- **The ambient wave's glyphs must stay in CSS generated content, never text nodes.** `WaveHero`
  and `SideWave` render each row through `::before` fed by a `--wave-row` custom property. As text
  they were 80–98% of every page's crawlable text (2,560 glyphs per route from `WaveHero` alone,
  against 7 real words on the home page) sitting ahead of the real copy in DOM order. See the long
  note in `WaveHero.tsx`.
- **Menu rows that lead somewhere must be real `<a href>` elements.** `HomeMenu` used `<div
  onClick={navigate}>`, so the rendered home page contained zero links and Googlebot had no path
  from `/` to any other page. Preflight resets anchor colour/decoration and flex children are
  blockified, so anchors are visually identical here — there's no styling reason to go back.
- **Project frontmatter `description`/`keywords` never render.** They exist purely to feed
  metadata, which is how a project gets described for search without adding to the visible copy.
  New project files should have both.

## Structure

- `src/App.tsx` — root component; routes between pages via `react-router-dom`
- `src/main.tsx` — React entry point
- `src/index.css` — global styles; contains only `@import "tailwindcss";` plus theme overrides
- `src/pages/` — routed pages (Skills, Projects, ProjectDetail, AboutMe, Music)
- `src/components/` — shared components (HomeMenu, MarkdownContent, PageTransition, WaveHero, etc.)
- `src/hooks/` — shared hooks (`useArrowKeyList`, `useCharReveal`, `useRouteMeta`)
- `src/lib/` — content/data and small utilities (`content.ts`, `revealChars.tsx`, plus the plain-ESM
  `seo.mjs` / `frontmatter.mjs` shared with the build script)
- `scripts/` — build-time Node scripts, run after `vite build` (`build-seo.mjs`, `pdf-metadata.mjs`)
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
