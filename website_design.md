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
