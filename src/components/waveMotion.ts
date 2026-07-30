// The wave's idle drift, shared by the full-screen transition wave
// (WaveHero) and the ambient side panel (SideWave) so there's exactly one
// implementation of "what does the wave do when nothing is driving it."
// Only the idle motion lives here — WaveHero's surge/recede is its own
// thing, layered on top of whatever position this produces.
//
// Positions are expressed as a fraction of each row's own width, so they're
// resolution-independent and work the same for an 80-column full-viewport
// row as for a narrow side strip: -1 is fully offscreen to the left, 0 is
// fully in view.

// Idle drift has two independent things going on, like a real wave: the
// x-intercept — the point the row oscillates around — itself eases onto
// and off screen (that IS the wave arriving/receding), phase-shifted row
// to row so it reads as a single front travelling down the screen. Riding
// on top of wherever that intercept currently sits, a swell ripple
// oscillates at fixed amplitude — a constant height that does NOT change
// just because the intercept has swept further in or out — with a
// smaller, per-row-randomized chop sine layered on for texture.
const INTERCEPT_PERIOD_MS = 5200;

const SWELL_PERIOD_MS = 1800;
const SWELL_AMPLITUDE = 0.03; // ripple's height, as a fraction of the row's own width — fixed, independent of the intercept's position, and kept subordinate to the intercept's own span so it reads as texture on the curve, not noise erasing it
const CHOP_PERIOD_MS = 12000;
const CHOP_AMPLITUDE = 0; // chop's weight relative to a full-strength ripple, 0..1

export type WaveRow = {
  interceptPhase: number;
  swellPhase: number;
  chopPhase: number;
  chopRate: number;
};

// interceptPhase is a coherent gradient across rows (row order, not
// randomness, decides it) so the shared intercept sweep reads as one front
// travelling down the stack. The rest are randomized per row — the ripple
// texture riding on top of that sweep.
//
// `cycles` is how many intercept cycles span the full row stack; it needs
// to be enough of a cycle to read as a crest rather than a near-flat ramp.
// `crestRow` gets the + PI/2 offset that puts the crest (interceptWave ===
// 1) there at t=0, so the wave starts bulged out around whatever row
// matters most and tapers toward the ends instead of an arbitrary phase.
export function createWaveRows(
  count: number,
  { cycles, crestRow }: { cycles: number; crestRow: number },
): WaveRow[] {
  return Array.from({ length: count }, (_, row) => ({
    interceptPhase:
      ((row - crestRow) / count) * Math.PI * 2 * cycles + Math.PI / 2,
    swellPhase: Math.random() * Math.PI * 2,
    chopPhase: Math.random() * Math.PI * 2,
    chopRate: 0.6 + Math.random() * 0.8,
  }));
}

// `hidden`/`peek` are the two ends of the intercept's sweep: how far out
// the row sits at the trough vs. at the crest. The gap between them is the
// wave's visible reach — a sliver for the hero (it's a background texture
// behind the menu), considerably more for the side panel (it's the only
// thing in its column).
export function idleFraction(
  t: number,
  row: WaveRow,
  { hidden, peek }: { hidden: number; peek: number },
) {
  const interceptWave =
    (Math.sin((t / INTERCEPT_PERIOD_MS) * Math.PI * 2 + row.interceptPhase) +
      1) /
    2; // 0..1
  const intercept = hidden + (peek - hidden) * interceptWave;

  const swell = Math.sin((t / SWELL_PERIOD_MS) * Math.PI * 2 + row.swellPhase);
  const chop = Math.sin(
    (t / (CHOP_PERIOD_MS * row.chopRate)) * Math.PI * 2 + row.chopPhase,
  );
  const ripple = (swell + chop * CHOP_AMPLITUDE) / (1 + CHOP_AMPLITUDE); // -1..1, fixed height

  return intercept + ripple * SWELL_AMPLITUDE;
}
