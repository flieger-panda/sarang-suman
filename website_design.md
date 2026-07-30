# Website Design

Reference doc for design decisions made on this site. Update it as decisions change — this
describes intent/rationale, not implementation detail (read the code for that).

## Typography

- **Font: [Space Mono](https://fonts.google.com/specimen/Space+Mono)**, self-hosted via
  `@fontsource/space-mono` (no external CDN request). Loaded in `src/index.css` and wired up by
  overriding Tailwind's `--font-mono` theme variable, so every existing `font-mono` utility class
  picks it up automatically — no per-element changes needed.
- Monospace throughout the hero, in keeping with the terminal/ASCII aesthetic.

## Color

- Black background, white text, `color-scheme: dark` — no light theme.

## Cursor-based navigation (`useArrowKeyList`)

Every selectable list on the site — HomeMenu, Projects, and MarkdownContent's
`navigableHeadings` (Skills, About Me, ProjectDetail) plus its `backHref` link — uses the same
`>`-prefixed cursor convention: arrow keys move a `selectedIndex`, Enter activates it, and
hovering an item selects it too. This used to be three independent, drifting implementations;
it's now one shared hook, `src/hooks/useArrowKeyList.ts`, specifically so a fix made in one place
doesn't have to be rediscovered and re-applied everywhere else. If you add a new selectable list,
use this hook rather than hand-rolling the keydown/hover wiring again.

- **`navigableHeadings` is `##` (h2) only — the page's `<h1>` is always a plain, non-interactive
  title, never part of the cursor list.** `MarkdownContent` extracts `##` headings from the
  markdown source (`extractH2Titles`) and gives each one the same `>`-cursor treatment Skills
  always had. About Me and ProjectDetail's markdown content was restructured (see `content/`) to
  add real `##` sections specifically so they'd have something to land the cursor on — About Me
  uses `## what i do` / `## sportsball`; every `content/projects/*.md` file uses a consistent
  `## Overview` / `## What I Did` split. An earlier version of this made the `<h1>` itself
  selectable (a `navigableTitle` prop) for pages with no `##` sections — that was reverted in favor
  of giving those pages real `##` sections instead, so there's exactly one mechanism
  (`navigableHeadings`) for "does this page have a cursor list," not two. If a future prose page
  needs cursor navigation, give its content real `##` sections rather than resurrecting
  `navigableTitle`.
- **Convention: land on the first real entry on load, never on "back" and never on nothing.**
  Every list's `selectedIndex` starts on whatever is the first genuinely useful thing on that
  page, via `useArrowKeyList`'s `initialIndex` — not `-1` (nothing highlighted) and not on a
  leading "< back" entry. Concretely: HomeMenu lands on "about me" (its first top-level entry);
  Projects lands on the most recent project (`ENTRIES[1]`, `projects` is already sorted
  newest-first — see `src/lib/content.ts`); Skills lands on "Languages"; About Me lands on "what i
  do"; ProjectDetail lands on "Overview" — all first `##` headings. Where a list has a "< back"
  entry (Projects, and MarkdownContent's `backHref`), back is always index 0 and is reachable by
  ArrowUp out of the first real item, but is deliberately *not* the initial selection — a page
  should open with the cursor on its content, with back one ArrowUp away, not on an exit hatch. If
  you add a new selectable list, give it an `initialIndex` that points at its first real item;
  don't leave it defaulted to `-1`.
  - This was previously the reverse (every list started unselected, requiring an ArrowDown before
    anything highlighted) and got flipped specifically for this convention — don't revert it back
    to "start unselected" as a simplification; that was tried and explicitly rejected.
- **Input-mode filtering (the hover/keyboard race).** The two input methods share one piece of
  state, so without a guard, a keyboard move — or any layout shift it triggers (a
  `scrollIntoView`, an accordion expand/collapse) — can leave a stale mouse position sitting over
  a *different* item than the one just selected. Browsers re-run hit-testing after
  scrolling/layout changes and fire `mouseenter` on whatever now sits under a *stationary* cursor,
  which silently steals the selection back from the keyboard. `useArrowKeyList` guards against
  this with an `ignoreHoverRef` that mutes hover-driven selection between any keyboard-triggered
  change (arrow move **or** Enter activate — HomeMenu's submenu expand is the concrete case for
  the latter) and the next real `mousemove`. This was originally fixed only inside
  `MarkdownContent` (for Skills' heading list, which scrolls on every move) and is now applied
  everywhere, including places that don't scroll (HomeMenu, Projects), since an Enter-triggered
  layout shift needs the exact same guard.
  - **Known rough edge, not a bug to "fix":** because browsers dispatch `mouseenter` before
    `mousemove` for the same physical pointer movement, the *very first* mouse movement after a
    keyboard action can still have its `mouseenter` swallowed by the guard if it lands directly on
    a new target — the accompanying `mousemove` only clears the guard for the *next* movement. The
    user has to nudge the mouse again for hover to "wake up." This was already true of the
    original Skills-only fix; it's an accepted characteristic of listening on `mousemove` (the
    only event that reliably distinguishes "the user moved the mouse" from "the layout moved under
    it"), not a regression.
- **`enabled` flag — don't attach arrow-key capture where there's nothing to navigate.**
  `useArrowKeyList` takes an `enabled` option (default `true`) that drops the ArrowUp/ArrowDown/Enter
  listener entirely while leaving hover selection working, for lists with nothing to arrow-navigate
  between — capturing ArrowUp/Down there would only cost the browser's native page-scroll on those
  keys for no benefit. MarkdownContent passes `enabled: navigableHeadings`, so a page only loses
  native arrow-key page-scroll when it actually has `##` sections to navigate between.
- **MarkdownContent's slot layout: `[back?] [heading0, heading1, ...]`.** `backHref` (index 0) and
  `navigableHeadings`'s `##` headings share one `useArrowKeyList` instance and index space, in
  that fixed order — see `extractH2Titles`/`NavigableHeading` in `MarkdownContent.tsx`.

## Wave motion (`waveMotion.ts`)

The wave's *idle drift* — the intercept that eases on and off screen phase-shifted row to row,
plus the fixed-amplitude swell/chop riding on top of it — lives in `src/components/waveMotion.ts`
and is shared by both things that draw a wave: `WaveHero` (the full-screen page transition) and
`SideWave` (the ambient gutter wave — see "Ambient wave layering" below). Same reasoning as
`useArrowKeyList`: one implementation so a tuning fix doesn't have to be rediscovered in the other
copy. Positions are a fraction of each row's *own* width, which is what lets the same math drive
an 80-column full-viewport row and a narrow side strip.

Callers supply the two things that legitimately differ: `{ hidden, peek }` (how far the drift
reaches) and `cycles`/`crestRow`. Surge/recede is *not* here — that's WaveHero's alone, layered on
top of whatever position the idle drift produces.

### Ambient wave layering

The site shows two wave layers at once on every content page, by design:

- **Near layer — `WaveHero`.** `PageTransition` (which renders it) is mounted once in `App.tsx`,
  above `<Routes>`, so it never unmounts on navigation — it's running its idle drift on *every*
  route, Home included, whether or not a transition is in progress. At rest that drift only peeks
  in to `-0.89` (see `IDLE_REACH` in `WaveHero.tsx`), so on content pages it shows up as a thin,
  bright (`text-lg text-white`), full-viewport sliver at the very edge — easy to miss on its own.
- **Far layer — `SideWave`.** A dimmer (`text-white/25`), smaller (`text-sm`), narrower column
  confined to the page's own left gutter, reaching much further in (`peek: -0.28`) since here it's
  the only wave doing work in that column rather than texture behind a menu.

This pairing was discovered by accident — `SideWave` was built for the resume viewer alone, not
realizing `WaveHero`'s sliver was already showing through underneath it there, because nothing
unmounts `WaveHero` on that route either. Once seen, the combination read as a deliberate
foreground/background depth effect rather than a bug, so it was formalized: `SideWave` is now
mounted on every page built from a centered content column — `Skills`, `AboutMe`, `Projects`,
`ProjectDetail`, and `Resume` — each wrapped the same way (see any of those files):

```
<div className="relative min-h-svh bg-black">
  <SideWave className="hidden md:flex md:w-40 lg:w-64" />
  <div className="relative z-10 mx-auto max-w-{2xl,4xl} px-6 py-16">…</div>
</div>
```

**Home is deliberately excluded.** It already *is* `WaveHero` at full scale and full attention —
adding a second, smaller wave next to it would compete with the site's one big entrance rather
than read as an accent. The layering is a trait of the quieter content pages, not the hero itself.

## Resume viewer (`pages/Resume.tsx`)

The resume is a PDF, and it's rendered by the site rather than handed to the browser's built-in
viewer — an `<iframe>`/`<embed>` brings its own toolbar and chrome that can't be restyled or
driven from our own buttons. `pdf.js` rasterizes each page to a canvas instead, which is what
makes a genuinely minimal chrome possible: filename on the left, three buttons on the right
(zoom out, zoom in, download — `PIXEL_ICONS.zoomOut`/`zoomIn`/`download`), nothing else.

- **The PDF is fetched by us and handed to pdf.js as bytes — never `getDocument({ url })`.**
  This is load-bearing, not a style preference. pdf.js's own network layer runs every response
  through `ensureResponseStatus`, which accepts **only 200 and 206** and throws
  `Unexpected server response (<status>)` on anything else — including **304 Not Modified**. So
  the moment a visitor has the PDF in their HTTP cache, pdf.js's request revalidates, comes back
  304, and the viewer dies; a first-time visitor never sees it. That asymmetry makes it a
  genuinely nasty bug: it reproduces only on a *second* visit, and never in a fresh browser
  profile, which is what automated checks tend to use. A plain `fetch()` handles revalidation at
  the HTTP layer and yields the bytes either way, so pdf.js only ever sees data it can't reject.
  It also sidesteps pdf.js's range-request/streaming path entirely — this resume is a *linearized*
  PDF, which is exactly what triggers it — and there is nothing to gain from progressive loading
  on a 100 KB file. **Don't "simplify" this back to passing a URL.**
- **Any failure falls back to the browser's own PDF renderer, not to an error message.** An
  `<object data=…>` fills the pane if pdf.js can't produce pages for any reason. The custom zoom
  buttons can't drive that renderer, so they go visibly inert and the title bar states the reason
  rather than swallowing it. The point is that the resume is always readable, even in a browser or
  behind a policy that breaks the nice path.
- **A load deadline backs that fallback up.** When a module worker fails to *load* (a host serving
  `.mjs` as `text/plain`, a CSP `worker-src` rule, an extension blocking the script), the failure
  is asynchronous: `new Worker()` has already returned, so pdf.js's own fallback-to-main-thread
  path never fires and nothing ever rejects. Without a timeout that case is an infinite spinner.
- **Lazy-loaded route.** `pdf.js` roughly doubles the main bundle, and every page but this one
  would load it for nothing, so `/resume` is a `React.lazy` chunk. The transition curtain is
  already covering the screen while the chunk arrives, so the `null` Suspense fallback never
  shows.
- **Zoom is a multiplier on fit-to-width, not an absolute pdf.js scale.** The document opens
  correctly sized on any viewport and a zoom step means the same thing on a phone as on a wide
  monitor. Pages re-render at the new scale rather than CSS-scaling an existing bitmap, so text
  stays crisp; canvases are backed at `devicePixelRatio`. `+`/`-` work as shortcuts.
- **The scroll container's page stack is `w-max mx-auto`, deliberately not `items-center`.** A
  centered flex child that outgrows its scroll container overflows in *both* directions, and the
  part past the start edge can't be scrolled to — zooming in permanently clipped the left of the
  page. Sizing the stack to its content centers it while it fits and collapses to zero margin
  once it doesn't.
- **Cursor list with `enabled: false`.** Back plus the three controls share one `useArrowKeyList`
  so selection styling matches the rest of the site, but arrow-key capture is off: inside a
  document viewer the arrow keys should scroll the document. The controls are also the one place
  that drops the leading `>` — they sit in a horizontal row, where a chevron in front of each
  would read as wave texture rather than as a cursor, so selection shows as the same glow applied
  to the icon itself.
- **`SideWave` sits in the centered column's left margin**, not in a column of its own, so the
  viewer stays optically centered. It's hidden below `md`, where there's no margin left to
  occupy. It supplies no `display` utility of its own — the caller passes `hidden md:flex` — since
  having one in both places would leave the winner down to Tailwind's CSS output order.

## Hero (`WaveHero.tsx`)

### Concept

A full-viewport grid of `>` characters (32 rows × 80 columns) that slides in horizontally as the
user scrolls, revealing the name "sarang suman" embedded at its center. Terminal/ASCII aesthetic:
monospace grid, chevrons standing in for a prompt cursor.

### Scroll mechanics

- Driven by `animejs`'s `onScroll({ sync: true, ... })` — animation progress is tied directly to
  scroll position, not played on a timer.
- **Thresholds matter**: `enter: "start start"` / `leave: "end end"` are required to make progress
  0 → 1 map to "top of page" → "bottom of page." The animejs defaults instead trigger over a full
  extra viewport-height before/after the section, which (for a hero section spanning the whole
  page) compresses the usable progress range to roughly 25%–75% and never reaches either end.
- The hero section is `h-[300vh]` with a `sticky top-0 h-svh` inner wrapper, so it stays pinned
  for the full scrollable range and only releases once scroll progress hits 1.

### Row entrance

- Each row starts at `translateX: -2000` (well past any reasonable viewport width) and animates to
  `0`, so rows arrive from off-screen left.
- `stagger(15, { jitter: 30 })` staggers row start times, with random jitter layered on top so the
  cascade reads as organic/wave-like rather than a perfectly linear sweep.
- `ease: "outExpo"` — fast start, gentle settle. This matters more than it looks: since `sync: true`
  scrubs by local-time fraction of each row's own tween, an ease with a slow *start* (e.g. the
  symmetric `"inOut(3)"` used earlier) keeps a row essentially motionless for the first chunk of
  scroll after its delay expires — combined across all rows, that pushed visible movement back to
  roughly 15-20% down the page before anything looked like it was happening. `outExpo` front-loads
  the motion instead, so rows start visibly sliding in almost as soon as the user starts
  scrolling. Don't "fix" a sluggish-feeling entrance by shrinking the stagger — that only changes
  spacing *between* rows, not each row's own slow start; the ease curve is the actual lever.

### Name embed + noise field

- "sarang suman" is spelled out character-by-character in the center row (row 16 of 32), one
  character per grid slot — same cell width as the `>` characters, so it stays aligned to the grid.
- A forced-space "clear zone" surrounds the name: the row above, the row below, and the immediate
  left/right neighbors in the name's own row always render as spaces, regardless of the noise
  roll below, so the name stays legible.
- The rest of the grid is randomized per-character: `>` by default, with a chance of swapping in
  `_` or `.` (and, close to the name, a literal space). That chance follows a cubic falloff
  (`NOISE_FALLOFF = 3`) based on distance from the name's position — `NOISE_MAX = 0.85` right at
  the name, `NOISE_MIN = 0.02` far away — so noise/static concentrates tightly around the name and
  the rest of the field stays mostly clean chevrons.
- Spaces specifically are capped to `SPACE_RADIUS = 0.3`: they only ever appear near the name,
  never out in the open field, so gaps don't visually clutter the rest of the grid.
- Rows use `whitespace-pre`, not `whitespace-nowrap` — this matters because noise-generated space
  characters sit next to the row's own `" "` join separator; `nowrap` alone still lets consecutive
  whitespace collapse, which shrinks the row's rendered width unevenly and (since each row is
  independently centered) visibly shifts characters out of grid alignment. `pre` preserves every
  space exactly.
- The name has a subtle glow: `text-shadow: 0 0 14px rgba(255,255,255,1)`.

### Waving hand

- `👋🏾` fixed at bottom-center (`bottom-4`), rocking side to side continuously
  (`rotate: [-6, 6]`, 900ms alternating loop, `inOutSine`) — independent of scroll.
- Slides down out of view (`translateY: 0 → 400`) tied to the same scroll-sync thresholds as the
  main animation, so it's only visible at the very top of the page and retreats as soon as
  scrolling starts.
- Clicking it triggers a custom scroll-to-end: a hand-rolled `animate()` tween of
  `document.documentElement.scrollTop` (4000ms, `inOut(2)`) rather than native
  `scrollIntoView({ behavior: "smooth" })`, because the native API exposes no duration to control
  — this is deliberately slow/gentle rather than the browser's default smooth-scroll speed.

> An earlier version had the name drift up into a fixed header at the end of the scroll, with the
> rest of the grid fading out. That was reverted — the hero currently just ends with the grid
> fully revealed, no header handoff.

### Implementation gotcha worth remembering

- `onScroll(params)` eagerly constructs a `ScrollObserver` instance immediately (it's not a lazy
  factory) — each one links to exactly one animation. Reusing the same `onScroll(...)` return
  value as `autoplay` for two different `animate()` calls lets the second call's linkage clobber
  the first's. Always call `onScroll({...})` fresh per animation, even with identical params.
