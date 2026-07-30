import {
  useLayoutEffect,
  useMemo,
  useRef,
  type CSSProperties,
} from "react";
import { createWaveRows, idleFraction } from "./waveMotion";

// The near layer of the site's two-layer ambient wave (see "Ambient wave
// layering" in website_design.md). WaveHero never unmounts across routes
// (PageTransition, which renders it, lives above <Routes> in App.tsx), so
// its own idle sliver is already showing, bright and thin, at the edge of
// every page — this is the deliberate far layer paired with it: dimmer,
// narrower, reaching further in, confined to a gutter so it can sit
// permanently beside a page's content instead of sweeping over it.

const ROW_COUNT = 48; // enough rows to overfill any viewport height at text-sm; the column centers them and clips the excess
const CHARS_PER_ROW = 28; // wider than the gutter on purpose — each row is clipped to the gutter, so the overflow is what's left to slide into view
const INTERCEPT_CYCLES = 2.5; // more cycles than the hero's 1.5: a tall narrow column needs more than one crest in view to read as a travelling front rather than a single bulge

// Unlike the hero, the drift here isn't background texture behind a menu —
// it's the only thing in its column, so it reaches considerably further in
// before receding.
const IDLE_REACH = { hidden: -1, peek: -0.28 };

const NOISE_CHARS = ["_", "."];
const NOISE_CHANCE = 0.18;

// Fixed at module load (not per mount) so the texture stays put for the
// lifetime of the app rather than reshuffling on every visit. Stored as
// quoted CSS <string>s and rendered through `::before` rather than as text
// nodes, for the same reason as WaveHero's ROW_CSS_STRINGS (see the long
// note there): as text, this gutter contributed ~1,344 junk glyphs to the
// crawlable text of every content page.
const ROW_CSS_STRINGS = Array.from({ length: ROW_COUNT }, () =>
  JSON.stringify(
    Array.from({ length: CHARS_PER_ROW }, () =>
      Math.random() < NOISE_CHANCE
        ? NOISE_CHARS[Math.floor(Math.random() * NOISE_CHARS.length)]
        : ">",
    ).join(" "),
  ),
);

export default function SideWave({ className = "" }: { className?: string }) {
  const rowRefs = useRef<(HTMLDivElement | null)[]>([]);

  const rows = useMemo(
    () =>
      createWaveRows(ROW_COUNT, {
        cycles: INTERCEPT_CYCLES,
        crestRow: ROW_COUNT / 2,
      }),
    [],
  );

  useLayoutEffect(() => {
    let frame: number;
    const tick = () => {
      const t = performance.now();
      rows.forEach((row, i) => {
        const el = rowRefs.current[i];
        if (!el) return;
        el.style.transform = `translateX(${idleFraction(t, row, IDLE_REACH) * 100}%)`;
      });
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [rows]);

  return (
    <div
      aria-hidden
      className={
        // No display utility here on purpose — the caller supplies it
        // (`hidden md:flex`), and having one here too would leave which
        // of the two wins down to Tailwind's CSS output order.
        "pointer-events-none fixed inset-y-0 left-0 flex-col justify-center overflow-hidden font-mono text-sm text-white/25 " +
        // Fades the rows out toward the content side, so the wave's leading
        // edge dissolves into the page instead of stopping on a hard line
        // wherever the gutter happens to end.
        "[mask-image:linear-gradient(to_right,black_35%,transparent)] " +
        className
      }
    >
      {ROW_CSS_STRINGS.map((row, i) => (
        <div
          key={i}
          ref={(el) => {
            rowRefs.current[i] = el;
          }}
          // Each row is its own clipping window: translating it left leaves
          // empty space at its right edge, and the varying width of that
          // gap row-to-row is what draws the wave front. The glyphs come
          // from `::before` (see ROW_CSS_STRINGS); the row element keeps the
          // box, the clipping, and the animated transform.
          style={{ "--wave-row": row } as CSSProperties}
          className="w-full overflow-hidden whitespace-pre before:content-[var(--wave-row)]"
        />
      ))}
    </div>
  );
}
