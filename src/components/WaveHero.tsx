import { useLayoutEffect, useRef } from "react";
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

const ROW_CHARS = Array.from({ length: LINE_COUNT }, (_, row) =>
  Array.from({ length: CHARS_PER_LINE }, (_, col) => {
    const dist = centerDistance(row, col);
    if (Math.random() < noiseChance(dist)) {
      return NOISE_CHARS[Math.floor(Math.random() * NOISE_CHARS.length)];
    }
    return ">";
  }),
);

export default function WaveHero() {
  const stageRef = useRef<HTMLDivElement>(null);

  // A one-time intro that autoplays on mount — not tied to scroll (there
  // is none) so it can't desync or re-trigger from reload timing or
  // browser zoom. Once it settles the noise fades to fully transparent,
  // letting HomeMenu (layered above, fading in on its own timer) take
  // over the screen.
  useLayoutEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;

    const lines = stage.querySelectorAll("[data-line]");
    const noise = stage.querySelectorAll("[data-noise]");

    const entrance = animate(lines, {
      translateX: [-2000, 0],
      delay: stagger(15, { jitter: 30 }),
      ease: "outExpo",
    });

    const fadeNoise = animate(noise, {
      opacity: [{ to: 1, duration: 1000 }, { to: 0, duration: 550 }],
    });

    return () => {
      entrance.revert();
      fadeNoise.revert();
    };
  }, []);

  return (
    <div
      ref={stageRef}
      className="fixed inset-0 flex h-svh flex-col items-center justify-center overflow-hidden"
    >
      {ROW_CHARS.map((chars, i) => (
        <div
          key={i}
          data-line
          data-noise
          // Matches the entrance animation's `translateX: [-2000, 0]`
          // starting value inline, on the same `transform` property
          // animejs writes to, so the row is off-screen from the very
          // first paint even before the entrance effect runs. A
          // Tailwind `-translate-x-*` class won't do here: in
          // Tailwind v4 it sets the standalone `translate` property,
          // which composes with (rather than being overwritten by)
          // animejs's `transform`, permanently doubling the offset.
          style={{ transform: "translateX(-2000px)" }}
          className="whitespace-pre font-mono text-lg text-white"
        >
          {chars.join(" ")}
        </div>
      ))}
    </div>
  );
}
