import { useLayoutEffect, type RefObject } from "react";
import { animate, stagger } from "animejs";
import { useRevealed } from "../components/RevealContext";

// The menu's per-character stagger delay — feels right for short labels
// (a couple dozen characters), so it's kept as the ceiling below.
const MAX_CHAR_DELAY_MS = 18;

// Roughly how long the menu itself (NAME + top-level labels) takes to
// finish revealing at MAX_CHAR_DELAY_MS. Used as a target ceiling on
// *total* reveal time so a long markdown page doesn't take literal
// seconds to finish fading in: the per-char delay shrinks as character
// count grows, capped at MAX_CHAR_DELAY_MS for short content so it still
// matches the menu's feel exactly there.
const TARGET_TOTAL_MS = 900;

// Waits for PageTransition's curtain to actually finish fading (see
// RevealContext) instead of guessing a fixed delay, so content never
// starts appearing while the wave still covers the screen.
// useLayoutEffect so the opacity-0 starting state set on [data-char]
// spans is in place before the browser's first paint, avoiding a flash
// of fully visible content.
export function useCharReveal(containerRef: RefObject<HTMLElement | null>) {
  const revealed = useRevealed();

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container || !revealed) return;

    const chars = container.querySelectorAll("[data-char]");
    const charDelay = Math.min(
      MAX_CHAR_DELAY_MS,
      TARGET_TOTAL_MS / Math.max(chars.length, 1),
    );
    const reveal = animate(chars, {
      opacity: [0, 1],
      delay: stagger(charDelay),
      duration: 1,
    });

    return () => {
      reveal.revert();
    };
  }, [revealed, containerRef]);
}
