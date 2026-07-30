import {
  forwardRef,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
} from "react";
import { animate, stagger } from "animejs";
import { LINE_COUNT, CHARS_PER_LINE, CENTER_ROW_INDEX } from "./waveHeroLayout";
import { createWaveRows, idleFraction, type WaveRow } from "./waveMotion";

const GRID_CENTER_COL = CHARS_PER_LINE / 2;

const NOISE_CHARS = ["_", "."];
const NOISE_MIN = 0.02;
const NOISE_MAX = 0.85;
const NOISE_FALLOFF = 3;

function centerDistance(row: number, col: number) {
  const rowDist = Math.abs(row - CENTER_ROW_INDEX) / (LINE_COUNT / 2);
  const colDist = Math.abs(col - GRID_CENTER_COL) / (CHARS_PER_LINE / 2);
  return Math.min(1, Math.hypot(rowDist, colDist));
}

function noiseChance(dist: number) {
  const falloff = Math.pow(1 - dist, NOISE_FALLOFF);
  return NOISE_MIN + (NOISE_MAX - NOISE_MIN) * falloff;
}

// Computed once at module load (not per mount) so the noise texture
// stays fixed for the lifetime of the app instead of reshuffling.
const ROW_CHARS = Array.from({ length: LINE_COUNT }, (_, row) =>
  Array.from({ length: CHARS_PER_LINE }, (_, col) => {
    const dist = centerDistance(row, col);
    if (Math.random() < noiseChance(dist)) {
      return NOISE_CHARS[Math.floor(Math.random() * NOISE_CHARS.length)];
    }
    return ">";
  }),
);

// How far the idle drift reaches (see waveMotion): a small peek at the
// left edge. "Surging" is not a different animation — it's the same
// per-frame position blended toward 0 (fully in view) by `surge.value`,
// so the transition is always a continuation of whatever the idle drift
// was already doing, never a handoff to a separate effect.
const IDLE_REACH = { hidden: -1, peek: -0.89 };
const INTERCEPT_CYCLES = 1.5;

const SURGE_DURATION = 550;
const RECEDE_DURATION = 550;
// Kept small deliberately: with LINE_COUNT rows, the per-row stagger adds
// up (rows * STAGGER_MS + jitter) on top of the duration above before the
// *last* row — and therefore the whole surge/recede promise — resolves.
// A generous per-row stagger here is what made the full transition feel
// sluggish even after the reveal-ordering fix.
const STAGGER_MS = 6;
const STAGGER_JITTER = 12;

type RowState = WaveRow & { surge: { value: number } };

export type WaveHeroHandle = {
  /** Extends the current drift into a full sweep that covers the screen. */
  surge: () => Promise<void>;
  /** Eases the sweep back out, blending back into the idle drift. */
  recede: () => Promise<void>;
};

const WaveHero = forwardRef<WaveHeroHandle>(function WaveHero(_props, ref) {
  const lineRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Each row's fixed drift phases (see createWaveRows), plus a live
  // `surge` value read every frame: 0 is pure idle drift, 1 is fully swept
  // into view. Randomized once and never touched again — WaveHero itself
  // never remounts — so a transition's surge is always layered on top of
  // whichever phase each row already happens to be in.
  const rows = useMemo<RowState[]>(
    () =>
      createWaveRows(LINE_COUNT, {
        cycles: INTERCEPT_CYCLES,
        crestRow: CENTER_ROW_INDEX,
      }).map((row) => ({ ...row, surge: { value: 0 } })),
    [],
  );

  useLayoutEffect(() => {
    let frame: number;
    const tick = () => {
      const t = performance.now();
      rows.forEach((row, i) => {
        const el = lineRefs.current[i];
        if (!el) return;
        const idle = idleFraction(t, row, IDLE_REACH);
        const fraction = idle + (0 - idle) * row.surge.value;
        el.style.transform = `translateX(${fraction * 100}%)`;
      });
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [rows]);

  useImperativeHandle(ref, () => ({
    surge: () =>
      new Promise<void>((resolve) => {
        animate(rows.map((r) => r.surge), {
          value: 1,
          delay: stagger(STAGGER_MS, { jitter: STAGGER_JITTER }),
          duration: SURGE_DURATION,
          ease: "outExpo",
          onComplete: () => resolve(),
        });
      }),

    recede: () =>
      new Promise<void>((resolve) => {
        animate(rows.map((r) => r.surge), {
          value: 0,
          delay: stagger(STAGGER_MS, { jitter: STAGGER_JITTER }),
          duration: RECEDE_DURATION,
          ease: "inOut(2)",
          onComplete: () => resolve(),
        });
      }),
  }), [rows]);

  return (
    <div className="pointer-events-none fixed inset-0 z-40 flex h-svh flex-col items-center justify-center overflow-hidden">
      {ROW_CHARS.map((chars, i) => (
        <div
          key={i}
          ref={(el) => {
            lineRefs.current[i] = el;
          }}
          className="whitespace-pre font-mono text-lg text-white"
        >
          {chars.join(" ")}
        </div>
      ))}
    </div>
  );
});

export default WaveHero;
