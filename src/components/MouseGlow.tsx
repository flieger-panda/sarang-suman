import { useEffect, useRef } from "react";

// A soft light that trails the real pointer, matching the neon glow used on
// the `>` cursors elsewhere on the site. Mutates the dot's position directly
// instead of going through React state — this fires on every mousemove, far
// more often than a component this trivial should ever re-render.
//
// Stays mounted and keeps tracking the pointer even while `enabled` is
// false, so switching it on lights up at the pointer's current position on
// the same frame. Mounting only when enabled would discard the position and
// leave the glow invisible until the next mousemove — i.e. no feedback at
// all for a toggle that's reached by keyboard (see HomeMenu). Nothing can
// be done about that from JS: no API reports where the pointer is, and the
// browser won't let a page move it, so the position has to be remembered
// from the last real event.
export default function MouseGlow({ enabled }: { enabled: boolean }) {
  const dotRef = useRef<HTMLDivElement>(null);
  const enabledRef = useRef(enabled);
  // Until the pointer has moved at least once there's genuinely nowhere to
  // draw, so the glow stays hidden rather than guessing a position.
  const hasPositionRef = useRef(false);

  useEffect(() => {
    const dot = dotRef.current;
    if (!dot) return;

    const onMove = (e: MouseEvent) => {
      dot.style.left = `${e.clientX}px`;
      dot.style.top = `${e.clientY}px`;
      hasPositionRef.current = true;
      if (enabledRef.current) dot.style.opacity = "1";
    };
    const onLeave = () => {
      dot.style.opacity = "0";
    };

    window.addEventListener("mousemove", onMove);
    document.addEventListener("mouseleave", onLeave);
    return () => {
      window.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseleave", onLeave);
    };
  }, []);

  useEffect(() => {
    enabledRef.current = enabled;
    const dot = dotRef.current;
    if (!dot) return;
    dot.style.opacity = enabled && hasPositionRef.current ? "1" : "0";
  }, [enabled]);

  return (
    <div
      ref={dotRef}
      className="pointer-events-none fixed top-0 left-0 z-[100] h-8 w-8 -translate-x-1/2 -translate-y-1/2 rounded-full opacity-0 bg-[radial-gradient(circle,rgba(255,255,255,0.8)_0%,rgba(255,255,255,0.2)_40%,transparent_70%)] blur-xs transition-opacity duration-50"
    />
  );
}
