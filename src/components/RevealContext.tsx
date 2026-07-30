import { createContext, useContext } from "react";

type RevealContextValue = {
  revealed: boolean;
  setRevealed: (value: boolean) => void;
};

// Lets page content (e.g. HomeMenu) wait for PageTransition's curtain to
// actually finish fading before revealing itself, instead of guessing a
// fixed delay that can drift out of sync with the wave's timing. Owned
// by App (see its render body) so the reset on route change happens
// before any descendant — including PageTransition itself — renders
// with the new location.
const RevealContext = createContext<RevealContextValue>({
  revealed: false,
  setRevealed: () => {},
});

export const RevealProvider = RevealContext.Provider;

export function useRevealed() {
  return useContext(RevealContext).revealed;
}

export function useSetRevealed() {
  return useContext(RevealContext).setRevealed;
}
