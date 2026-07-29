import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import WaveHero, { type WaveHeroHandle } from "./WaveHero";
import { useSetRevealed } from "./RevealContext";

// How long the fully-surged wave holds over the screen before it starts
// receding, and how long the curtain takes to fade out once it does.
const HOLD_MS = 100;
const CURTAIN_FADE_MS = 200;

function delay(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

export default function PageTransition() {
  const location = useLocation();
  const waveRef = useRef<WaveHeroHandle>(null);
  const [curtainOpacity, setCurtainOpacity] = useState(0);
  const [curtainTransitionMs, setCurtainTransitionMs] = useState(0);
  const setRevealed = useSetRevealed();

  // Deliberately has no dedupe against a "previously shown" pathname:
  // the dependency array below already scopes this to mount + genuine
  // pathname changes, and an extra guard here fights React StrictMode's
  // dev-only mount→cleanup→mount cycle (the guard would silently no-op
  // the second mount, while the first mount's cleanup still marks the
  // one real in-flight sequence as cancelled, so it would surge and then
  // never recede).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      // Cover instantly — the new route is already mounted underneath by
      // the time this effect runs, so there's no fade to cover here.
      setCurtainTransitionMs(0);
      setCurtainOpacity(1);

      await waveRef.current?.surge();
      if (cancelled) return;

      await delay(HOLD_MS);
      if (cancelled) return;

      // The curtain must not start fading until AFTER the wave has fully
      // finished receding, not concurrently with it and not on a fixed
      // guessed delay. The wave stays dense enough through most of its
      // recede that fading the curtain at the same time lets page
      // content bleed through underneath the still-retreating wave —
      // this was the actual bug: on every non-Home route, whose content
      // was never gated behind anything, that bleed-through was directly
      // visible for a big chunk of the recede animation. Awaiting this
      // promise (not a guessed delay, not a proportional blend of
      // opacity to coverage) means the fade only ever starts once every
      // row has verifiably reached its idle, non-overlapping position —
      // guaranteed regardless of the wave's randomized per-row timing.
      await waveRef.current?.recede();
      if (cancelled) return;

      setCurtainTransitionMs(CURTAIN_FADE_MS);
      setCurtainOpacity(0);
      setRevealed(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [location.pathname, setRevealed]);

  return (
    <>
      <div
        className="fixed inset-0 z-30 bg-black"
        style={{
          opacity: curtainOpacity,
          pointerEvents: curtainOpacity > 0 ? "auto" : "none",
          transition: `opacity ${curtainTransitionMs}ms`,
        }}
      />
      <WaveHero ref={waveRef} />
    </>
  );
}
