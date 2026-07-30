import { createContext, useContext, type RefObject } from "react";

export type PageTransitionHandle = {
  /**
   * Runs the same curtain+wave sequence PageTransition uses for route
   * changes, but for an action that isn't a route change — e.g. HomeMenu
   * following an external link in a new tab. Covers the screen, surges
   * the wave, invokes `action`, then recedes and uncovers, so nothing
   * underneath (like the menu itself) is visible mid-animation.
   */
  runExternal: (action: () => void) => Promise<void>;
};

// Owned by App and rendered by PageTransition (see its forwardRef) so any
// descendant can trigger the full transition sequence for non-route
// actions without reaching into PageTransition's internals.
const TransitionContext = createContext<RefObject<PageTransitionHandle | null> | null>(
  null,
);

export const TransitionProvider = TransitionContext.Provider;

export function usePageTransition() {
  return useContext(TransitionContext);
}
