import { useEffect, useRef } from "react";
import { animate, cubicBezier, scroll } from "motion";

/**
 * Warps scroll progress so the middle of the scroll drags: fast away from
 * 0, slow through 0.5, fast into 1. `strength` 1 = no warp (linear passthrough);
 * higher = the plateau in the middle gets flatter and wider. This is what
 * makes "the middle of the animation" the slow part, not any single knob
 * on the animations themselves — they still just run 0 -> 1 like normal,
 * they're simply fed a warped time.
 */
function slowMiddle(t: number, strength: number) {
  if (strength <= 1) return t;
  return t < 0.5
    ? 0.5 * (1 - (1 - t * 2) ** strength)
    : 0.5 + 0.5 * ((t - 0.5) * 2) ** strength;
}

/* ------------------------------------------------------------------ *
 * Knobs. Everything tweakable lives here.
 *
 * Timing is expressed as a fraction of the animation (0 = nothing has
 * happened, 1 = fully settled), not of the page. `scroll.animateOver`
 * below decides how much actual scrolling that maps onto. Every
 * animation is built with a total duration of 1 so they all stretch
 * across that range identically and keep their relative timing.
 * ------------------------------------------------------------------ */
const CONFIG = {
  scroll: {
    /** Height of the pinned section, in viewport heights. */
    sectionHeight: 3,
    /** Viewport-heights of scrolling the whole animation plays out over. */
    animateOver: 1,
    /**
     * How much the middle of that scroll drags relative to the edges. 1 =
     * even pace throughout. Try 3-6 for "wayyy slower" — higher gets more
     * extreme (and the plateau at the midpoint gets flatter/wider).
     */
    middleSlowdown: 4,
  },

  text: {
    char: ">",
    name: "sarang suman",
    cellW: 24,
    cellH: 32,
    fontSize: 18,
    waveColor: "rgba(163,163,163,0.55)",
    /** Same colour at zero alpha — what cleared characters fade to. */
    waveColorClear: "rgba(163,163,163,0)",
    nameColor: "#fafafa",
    nameGlow: "0 0 10px rgba(255,255,255,0.35)",
  },

  /** Shape of the single path every character rides in on. */
  path: {
    /** How far a character travels to reach its cell, in px. */
    runway: 380,
    /**
     * Peak vertical swing of the wave, in px. 0 = dead straight, pure
     * x-axis travel. Bump this back up for a bobbing/undulating flight —
     * periods/phase/damping below only do anything once this is nonzero.
     */
    amplitude: 0,
    /** Sine periods across the runway. */
    periods: 1.5,
    /** Where in the sine a character enters. Radians. */
    phase: Math.PI * 0.5,
    /** How fast the swing flattens toward the cell. Higher = settles sooner. */
    damping: 2.2,
    /** Points used to draw the path. Only affects its smoothness. */
    resolution: 240,
  },

  motion: {
    /** Keyframes sampled along the path. More = smoother curve. */
    waypoints: 28,
    /** Easing along the path. Baked into the sampling, not applied per-segment. */
    ease: [0.65, 0, 0.35, 1] as const,
    /** Fraction of the animation a single character spends in flight. */
    flight: 0.45,
    /** Portion of that flight spent fading in. Also what keeps frame 1 black. */
    fadeIn: 0.5,
    /**
     * Characters are animated in groups rather than one by one — every one of
     * them rides the same path, so only their start time differs. Each column
     * is split into this many interleaved groups (rows 0,3,6… / 1,4,7… / …),
     * each with its own jitter. Higher = more organic, but more layers to
     * composite: this is the dial to turn if the scroll ever feels heavy.
     */
    rowBands: 3,
    /**
     * How far a group's start can drift, earlier or later, from where the
     * sweep would otherwise place it — this is what breaks up the "line of
     * >'s" so rows don't all arrive in lockstep. 0 = perfectly even sweep;
     * this is the dial to turn for more or less variance.
     */
    jitter: 0.22,
    /** Change for a different random field; same value = same field. */
    seed: 20260727,
  },

  gap: {
    /** Columns of clearance either side of the name. */
    padding: 4,
    /** Rows cleared around the name (odd numbers stay centred). */
    rows: 3,
    /** How long the clearing takes. */
    fadeSpan: 0.16,
    /** Beat between the wave arriving and the clearing starting. */
    fadeDelay: 0.04,
  },

  hint: {
    /** Point at which the "scroll" label has fully faded out. */
    fadeOutBy: 0.06,
  },

  /** Draws the path so its shape can be eyeballed while tweaking. */
  debugPath: false,
};

const SVG_NS = "http://www.w3.org/2000/svg";

/** Deterministic RNG so a rebuild (e.g. resize) doesn't reshuffle the field. */
function makeRandom(seed: number) {
  let s = seed;
  return () => {
    s |= 0;
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * The runway every character flies in along, in cell-local coordinates: it
 * starts off to the left and ends at (0, 0), which is the character's own
 * grid cell. One path, reused by all of them — the vertical swing damps to
 * nothing by the end, so the field settles perfectly flat.
 */
function buildPathD(runway: number) {
  const { amplitude, periods, phase, damping, resolution } = CONFIG.path;
  const points: string[] = [];

  for (let i = 0; i <= resolution; i++) {
    const t = i / resolution;
    const x = -runway * (1 - t);
    const settle = Math.pow(1 - t, damping);
    const y = Math.sin(phase + t * periods * Math.PI * 2) * amplitude * settle;
    points.push(`${x.toFixed(2)},${y.toFixed(2)}`);
  }

  return `M ${points[0]} L ${points.slice(1).join(" L ")}`;
}

/**
 * Walks the path at eased arc-length intervals into x/y keyframe arrays.
 * Sampling by arc length keeps the character's speed even around the
 * curves; folding the easing in here means the animation itself can run
 * linear, so there's no easing re-applied on every little segment.
 */
function samplePath(path: SVGPathElement) {
  const { waypoints, ease, fadeIn } = CONFIG.motion;
  const easing = cubicBezier(...ease);
  const length = path.getTotalLength();
  const x: number[] = [];
  const y: number[] = [];
  const opacity: number[] = [];

  for (let i = 0; i <= waypoints; i++) {
    const t = i / waypoints;
    const point = path.getPointAtLength(easing(t) * length);
    x.push(point.x);
    y.push(point.y);
    // Shares the waypoints' timeline, so the fade needs no separate tween.
    opacity.push(fadeIn > 0 ? Math.min(1, t / fadeIn) : 1);
  }

  return { x, y, opacity };
}

function buildScene(
  section: HTMLElement,
  stage: HTMLElement,
  hint: HTMLElement,
) {
  const { text, motion, gap } = CONFIG;
  stage.replaceChildren();

  const cols = Math.ceil(window.innerWidth / text.cellW) + 1;
  const rows = Math.ceil(window.innerHeight / text.cellH) + 1;

  const centerRow = Math.floor(rows / 2);
  const nameStartCol = Math.floor(cols / 2) - Math.floor(text.name.length / 2);
  const gapFirstCol = nameStartCol - gap.padding;
  const gapLastCol = nameStartCol + text.name.length + gap.padding;
  const gapHalfHeight = Math.floor(gap.rows / 2);

  const runway = CONFIG.path.runway;

  const svg = document.createElementNS(SVG_NS, "svg");
  const path = document.createElementNS(SVG_NS, "path");
  path.setAttribute("d", buildPathD(runway));
  svg.appendChild(path);
  if (CONFIG.debugPath) {
    svg.setAttribute("viewBox", `${-runway} -120 ${runway} 240`);
    svg.style.cssText =
      "position:absolute;left:0;top:50%;width:100%;height:240px;overflow:visible;pointer-events:none";
    path.setAttribute("fill", "none");
    path.setAttribute("stroke", "#22d3ee");
  } else {
    svg.setAttribute("aria-hidden", "true");
    svg.style.cssText = "position:absolute;width:0;height:0;overflow:hidden";
  }
  stage.appendChild(svg);

  const keyframes = samplePath(path);

  const random = makeRandom(motion.seed);
  const bands = Math.max(1, motion.rowBands);
  const groups: HTMLDivElement[] = [];
  const delays: number[] = [];
  const gapCharacters: HTMLSpanElement[] = [];

  // The wave front gets whatever the flight leaves us, so the last column
  // touches down exactly as the animation ends.
  const sweep = 1 - motion.flight;
  const columnDelay = (col: number) =>
    cols > 1 ? (col / (cols - 1)) * sweep : 0;

  const fragment = document.createDocumentFragment();

  // One transform group per column per band. Everything inside a group shares
  // a start time, so the browser can raster it once and just move it.
  for (let col = 0; col < cols; col++) {
    for (let band = 0; band < bands; band++) {
      const group = document.createElement("div");
      group.style.cssText =
        `position:absolute;left:${col * text.cellW}px;top:0;` +
        `width:${text.cellW}px;height:100%`;
      group.style.opacity = "0";
      group.style.transform = `translate(${keyframes.x[0]}px, ${keyframes.y[0]}px)`;
      fragment.appendChild(group);
      groups.push(group);
      // Symmetric so a group can land early or late, not just late — a
      // one-sided jitter would just clamp flat against `sweep` for every
      // column near the right edge, quietly erasing the variance there.
      const wobble = (random() * 2 - 1) * motion.jitter;
      delays.push(Math.min(sweep, Math.max(0, columnDelay(col) + wobble)));
    }
  }

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const nameIndex = row === centerRow ? col - nameStartCol : -1;
      const nameChar =
        nameIndex >= 0 && nameIndex < text.name.length
          ? text.name[nameIndex]
          : null;
      const isName = !!nameChar && nameChar !== " ";

      const span = document.createElement("span");
      span.textContent = isName ? nameChar : text.char;
      span.style.cssText =
        `position:absolute;left:0;top:${row * text.cellH}px;` +
        `font:${text.fontSize}px/1 ui-monospace,SFMono-Regular,Menlo,monospace;` +
        `color:${isName ? text.nameColor : text.waveColor}` +
        (isName ? `;text-shadow:${text.nameGlow}` : "");

      // Interleaved so neighbouring rows land in different groups — the
      // variation reads as organic rather than as horizontal banding.
      groups[col * bands + (row % bands)].appendChild(span);

      const inGapRows = Math.abs(row - centerRow) <= gapHalfHeight;
      const inGapCols = col >= gapFirstCol && col <= gapLastCol;
      if (inGapRows && inGapCols && !isName) gapCharacters.push(span);
    }
  }

  stage.appendChild(fragment);

  // Clear around the name only once the wave has actually reached it.
  const gapArrival = columnDelay(gapLastCol) + motion.flight;
  const fadeStart = Math.min(gapArrival + gap.fadeDelay, 1 - gap.fadeSpan);
  const fadeEnd = fadeStart + gap.fadeSpan;

  // Each animation spans the full 0 -> 1 so `scroll()` stretches them alike.
  // `times` holds a value either side of the window each one cares about.
  const flow = animate(
    groups,
    { x: keyframes.x, y: keyframes.y, opacity: keyframes.opacity },
    {
      duration: motion.flight,
      delay: (i) => delays[i],
      ease: "linear", // the easing is already baked into the path sampling
    },
  );

  // Fades via colour rather than opacity: `flow` already owns opacity on these
  // same elements, and two animations on one property fight over it.
  const clear = animate(
    gapCharacters,
    {
      color: [
        text.waveColor,
        text.waveColor,
        text.waveColorClear,
        text.waveColorClear,
      ],
    },
    { duration: 1, ease: "linear", times: [0, fadeStart, fadeEnd, 1] },
  );

  const fadeHint = animate(
    hint,
    { opacity: [1, 0, 0] },
    { duration: 1, ease: "linear", times: [0, CONFIG.hint.fadeOutBy, 1] },
  );

  const running = [flow, clear, fadeHint];
  running.forEach((animation) => animation.pause());

  // Every animation was built with a total duration of 1, in seconds, purely
  // so that "seconds" and "fraction of the animation" are the same number —
  // `.time` can be set directly from a 0->1 progress value.
  //
  // Offsets are [target progress, container progress] pairs: scroll starts
  // driving this once the section's top meets the viewport top, and finishes
  // once `animateOver` screens of it have passed that same line.
  //
  // This binds via a callback rather than handing `scroll()` the animations
  // directly, specifically so `slowMiddle` gets a chance to warp progress
  // first — a direct binding is marginally cheaper (native ScrollTimeline,
  // no per-frame JS) but can only ever move at scroll's own pace.
  const endsAt = CONFIG.scroll.animateOver / CONFIG.scroll.sectionHeight;
  const detach = scroll(
    (progress: number) => {
      const t = slowMiddle(progress, CONFIG.scroll.middleSlowdown);
      running.forEach((animation) => {
        animation.time = t;
      });
    },
    {
      target: section,
      offset: [
        [0, 0],
        [endsAt, 0],
      ],
    },
  );

  return () => {
    detach();
    running.forEach((animation) => animation.stop());
    stage.replaceChildren();
  };
}

export default function WaveHero() {
  const sectionRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const hintRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const section = sectionRef.current;
    const stage = stageRef.current;
    const hint = hintRef.current;
    if (!section || !stage || !hint) return;

    let teardown = buildScene(section, stage, hint);

    // Cell counts come from the viewport, so a resize needs a rebuild.
    // Debounced, and ignores the scroll-driven toolbar resizes on mobile.
    let pending = 0;
    let lastWidth = window.innerWidth;
    let lastHeight = window.innerHeight;

    const onResize = () => {
      if (window.innerWidth === lastWidth && window.innerHeight === lastHeight)
        return;
      lastWidth = window.innerWidth;
      lastHeight = window.innerHeight;
      window.clearTimeout(pending);
      pending = window.setTimeout(() => {
        teardown();
        teardown = buildScene(section, stage, hint);
      }, 200);
    };

    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      window.clearTimeout(pending);
      teardown();
    };
  }, []);

  return (
    <section
      ref={sectionRef}
      className="relative bg-black"
      style={{ height: `${CONFIG.scroll.sectionHeight * 100}vh` }}
    >
      <div className="sticky top-0 h-svh w-full overflow-hidden bg-black">
        <div ref={stageRef} className="absolute inset-0" />
        <div
          ref={hintRef}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 font-mono text-xs tracking-widest text-neutral-500"
        >
          scroll
        </div>
      </div>
    </section>
  );
}
