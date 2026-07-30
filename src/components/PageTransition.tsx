import {
  forwardRef,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { useLocation } from "react-router-dom";
import WaveHero, { type WaveHeroHandle } from "./WaveHero";
import { useSetRevealed } from "./RevealContext";
import type { PageTransitionHandle } from "./TransitionContext";

// How long the fully-surged wave holds over the screen before it starts
// receding, and how long the curtain takes to fade out once it does.
const HOLD_MS = 100;
const CURTAIN_FADE_MS = 200;

function delay(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

const PageTransition = forwardRef<PageTransitionHandle>(
  function PageTransition(_props, ref) {
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
    //
    // useLayoutEffect, not useEffect: the new route is already mounted
    // underneath by the time this runs, but a plain useEffect fires after
    // the browser paints — so anything in the new route not already
    // hidden (e.g. an <img>, which isn't gated behind the opacity-0
    // char-reveal the way text is) would flash visible for one frame
    // before the curtain caught up. Setting opacity here synchronously,
    // pre-paint, closes that gap.
    useLayoutEffect(() => {
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

    useImperativeHandle(
      ref,
      () => ({
        runExternal: async (action: () => void) => {
          // Same shape as the route-change effect above (cover, surge,
          // hold, recede, fade), except there's no new route content to
          // wait on underneath — `action` runs once the wave has fully
          // covered the screen, then the curtain lifts back onto the
          // still-mounted current page.
          setCurtainTransitionMs(0);
          setCurtainOpacity(1);

          await waveRef.current?.surge();
          action();
          await delay(HOLD_MS);
          await waveRef.current?.recede();

          setCurtainTransitionMs(CURTAIN_FADE_MS);
          setCurtainOpacity(0);
        },
      }),
      [],
    );

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
  },
);

export default PageTransition;
