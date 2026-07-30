import { useCallback, useEffect, useRef, useState } from "react";

// Shared keyboard+mouse selection for the `>`-prefixed cursor lists used
// across the site (HomeMenu, Projects, MarkdownContent's
// navigableHeadings): arrow keys move a selectedIndex, Enter activates it,
// and hovering an item selects it too.
//
// Those two input methods share one piece of state, so without a guard, a
// keyboard move — or any layout shift it triggers, e.g. a scrollIntoView
// or an accordion expand/collapse — can leave a stale mouse position
// sitting over a different item than the one just selected. Browsers
// re-run hit-testing after scrolling/layout changes and fire mouseenter on
// whatever now sits under a *stationary* cursor, which silently steals
// the selection back from the keyboard. `ignoreHoverRef` mutes
// hover-driven selection between a keyboard-triggered change and the next
// real `mousemove`, so only one input method "owns" selectedIndex at a
// time. See website_design.md for the fuller writeup — this was
// originally fixed only in MarkdownContent and is generalized here so
// every selectable list on the site gets it for free.
export function useArrowKeyList({
  length,
  onMove,
  onActivate,
  enabled = true,
  initialIndex = -1,
}: {
  length: number;
  // Side effect for a keyboard-driven move (e.g. scrollIntoView), called
  // with the new index (including -1 for "nothing selected").
  onMove?: (index: number) => void;
  // Called on Enter, only when something is selected.
  onActivate?: (index: number) => void;
  // Set false to drop the arrow-key/Enter capture entirely (hover-driven
  // selection still works) — for pages where the selectable list is a
  // single item with nothing to arrow-navigate between, capturing
  // ArrowUp/Down would only cost the browser's native page-scroll on
  // those keys for no navigational benefit. See MarkdownContent's
  // `backHref` on non-`navigableHeadings` pages for the concrete case.
  enabled?: boolean;
  // What's selected before any input: -1 (nothing) by default. Site
  // convention is to skip straight past "nothing" and past any leading
  // "< back" entry, landing on the first real piece of content — see
  // "Cursor-based navigation" in website_design.md.
  initialIndex?: number;
}) {
  const [selectedIndex, setSelectedIndex] = useState(initialIndex);

  // Read/write live values via refs rather than closing over props/state,
  // so the effect below can attach its listeners exactly once instead of
  // re-subscribing on every render.
  const selectedIndexRef = useRef(selectedIndex);
  selectedIndexRef.current = selectedIndex;
  const lengthRef = useRef(length);
  lengthRef.current = length;
  const onMoveRef = useRef(onMove);
  onMoveRef.current = onMove;
  const onActivateRef = useRef(onActivate);
  onActivateRef.current = onActivate;
  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;

  const ignoreHoverRef = useRef(false);

  useEffect(() => {
    const move = (delta: number) => {
      const next = Math.max(
        -1,
        Math.min(selectedIndexRef.current + delta, lengthRef.current - 1),
      );
      ignoreHoverRef.current = true;
      setSelectedIndex(next);
      onMoveRef.current?.(next);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (!enabledRef.current) return;
      if (e.key === "ArrowDown") {
        e.preventDefault();
        move(1);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        move(-1);
      } else if (e.key === "Enter") {
        if (selectedIndexRef.current === -1) return;
        e.preventDefault();
        // An Enter-triggered activation can reflow the page just like a
        // keyboard move can (HomeMenu's submenu expand is the concrete
        // case), so it gets the same hover guard.
        ignoreHoverRef.current = true;
        onActivateRef.current?.(selectedIndexRef.current);
      }
    };

    // Real pointer movement hands control back to hover. Listening for
    // mousemove rather than mouseenter matters: a keyboard-triggered
    // scroll or layout shift can fire mouseenter on whatever ends up
    // under the (stationary) cursor without the mouse itself moving.
    const handleMouseMove = () => {
      ignoreHoverRef.current = false;
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("mousemove", handleMouseMove);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, []);

  const hoverSelect = useCallback((index: number) => {
    if (ignoreHoverRef.current) return;
    setSelectedIndex(index);
  }, []);

  return { selectedIndex, setSelectedIndex, hoverSelect } as const;
}
