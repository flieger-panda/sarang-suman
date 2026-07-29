import {
  forwardRef,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
} from "react";
import { animate, stagger } from "animejs";
import { LINE_COUNT, CHARS_PER_LINE, CENTER_ROW_INDEX } from "./waveHeroLayout";

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

// Idle drift, expressed as a fraction of each row's own width so it's
// resolution-independent: -1 is fully offscreen to the left, -0.82 is a
// small peek. "Surging" is not a different animation — it's the same
// per-frame position blended toward 0 (fully in view) by `surge.value`,
// so the transition is always a continuation of whatever the idle drift
// was already doing, never a handoff to a separate effect.
const IDLE_HIDDEN = -1;
const IDLE_PEEK = -0.89;

// Idle drift has two independent things going on, like a real wave: the
// x-intercept — the point the row oscillates around — itself eases onto
// and off screen (that IS the wave arriving/receding), phase-shifted row
// to row so it reads as a single front travelling down the screen. Riding
// on top of wherever that intercept currently sits, a swell ripple
// oscillates at fixed amplitude — a constant height that does NOT change
// just because the intercept has swept further in or out — with a
// smaller, per-row-randomized chop sine layered on for texture.
const INTERCEPT_PERIOD_MS = 5200;
const INTERCEPT_CYCLES = 1.5; // how many intercept cycles span the full row stack — needs to be enough of a cycle to read as a crest, not a near-flat ramp

const SWELL_PERIOD_MS = 1800;
const SWELL_AMPLITUDE = 0.03; // ripple's height, as a fraction of the row's own width — fixed, independent of the intercept's position, and kept subordinate to the intercept's own ~0.18 span so it reads as texture on the curve, not noise erasing it
const CHOP_PERIOD_MS = 12000;
const CHOP_AMPLITUDE = 0; // chop's weight relative to a full-strength ripple, 0..1

function idleFraction(t: number, row: RowState) {
  const interceptWave =
    (Math.sin((t / INTERCEPT_PERIOD_MS) * Math.PI * 2 + row.interceptPhase) + 1) / 2; // 0..1
  const intercept = IDLE_HIDDEN + (IDLE_PEEK - IDLE_HIDDEN) * interceptWave;

  const swell = Math.sin((t / SWELL_PERIOD_MS) * Math.PI * 2 + row.swellPhase);
  const chop = Math.sin(
    (t / (CHOP_PERIOD_MS * row.chopRate)) * Math.PI * 2 + row.chopPhase,
  );
  const ripple = (swell + chop * CHOP_AMPLITUDE) / (1 + CHOP_AMPLITUDE); // -1..1, fixed height

  return intercept + ripple * SWELL_AMPLITUDE;
}

const SURGE_DURATION = 550;
const RECEDE_DURATION = 550;
// Kept small deliberately: with LINE_COUNT rows, the per-row stagger adds
// up (rows * STAGGER_MS + jitter) on top of the duration above before the
// *last* row — and therefore the whole surge/recede promise — resolves.
// A generous per-row stagger here is what made the full transition feel
// sluggish even after the reveal-ordering fix.
const STAGGER_MS = 6;
const STAGGER_JITTER = 12;

type RowState = {
  interceptPhase: number;
  swellPhase: number;
  chopPhase: number;
  chopRate: number;
  surge: { value: number };
};

export type WaveHeroHandle = {
  /** Extends the current drift into a full sweep that covers the screen. */
  surge: () => Promise<void>;
  /** Eases the sweep back out, blending back into the idle drift. */
  recede: () => Promise<void>;
};

const WaveHero = forwardRef<WaveHeroHandle>(function WaveHero(_props, ref) {
  const lineRefs = useRef<(HTMLDivElement | null)[]>([]);

  // interceptPhase is a coherent gradient across rows (row order, not
  // randomness, decides it) so the shared intercept sweep reads as one
  // front travelling down the stack. swellPhase/chopPhase/chopRate are
  // randomized per row — the ripple texture riding on top of that sweep —
  // plus a live `surge` value read every frame: 0 is pure idle drift, 1 is
  // fully swept into view. Randomized once and never touched again —
  // WaveHero itself never remounts — so a transition's surge is always
  // layered on top of whichever phase each row already happens to be in.
  const rows = useMemo(
    () =>
      Array.from({ length: LINE_COUNT }, (_, row) => ({
        // + PI/2 puts the crest (interceptWave === 1) at CENTER_ROW_INDEX at
        // t=0, so the wave starts bulged out around the name and tapers
        // toward the top/bottom rows instead of an arbitrary phase.
        interceptPhase:
          ((row - CENTER_ROW_INDEX) / LINE_COUNT) * Math.PI * 2 * INTERCEPT_CYCLES +
          Math.PI / 2,
        swellPhase: Math.random() * Math.PI * 2,
        chopPhase: Math.random() * Math.PI * 2,
        chopRate: 0.6 + Math.random() * 0.8,
        surge: { value: 0 },
      })),
    [],
  );

  useLayoutEffect(() => {
    let frame: number;
    const tick = () => {
      const t = performance.now();
      rows.forEach((row, i) => {
        const el = lineRefs.current[i];
        if (!el) return;
        const idle = idleFraction(t, row);
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
