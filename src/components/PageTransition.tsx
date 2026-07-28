import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { animate } from "animejs";
import WaveHero from "./WaveHero";

// WaveHero's own intro (rows sliding in + noise fading back to
// transparent) settles ~1550ms after it mounts. The curtain waits for
// that, holds briefly on the resulting black screen, then fades itself
// away to reveal whatever page is underneath.
const WAVE_SETTLE_MS = 1550;
const HOLD_MS = 150;
const CURTAIN_FADE_MS = 500;

export default function PageTransition() {
  const location = useLocation();
  const [runId, setRunId] = useState(0);
  const [active, setActive] = useState(true);
  const shownPathname = useRef(location.pathname);
  const curtainRef = useRef<HTMLDivElement>(null);

  // Every time the route actually changes (including the first load),
  // replay the curtain from scratch.
  useEffect(() => {
    if (shownPathname.current === location.pathname) return;
    shownPathname.current = location.pathname;
    setRunId((id) => id + 1);
    setActive(true);
  }, [location.pathname]);

  useEffect(() => {
    if (!active) return;
    const curtain = curtainRef.current;
    if (!curtain) return;

    let fade: ReturnType<typeof animate> | undefined;
    const timeout = window.setTimeout(() => {
      fade = animate(curtain, {
        opacity: [1, 0],
        duration: CURTAIN_FADE_MS,
        ease: "inOut(2)",
        onComplete: () => setActive(false),
      });
    }, WAVE_SETTLE_MS + HOLD_MS);

    return () => {
      window.clearTimeout(timeout);
      fade?.revert();
    };
  }, [active, runId]);

  if (!active) return null;

  return (
    <div
      key={runId}
      ref={curtainRef}
      className="fixed inset-0 z-50 bg-black"
    >
      <WaveHero />
    </div>
  );
}
