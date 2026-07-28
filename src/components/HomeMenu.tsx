import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from "react";
import { animate, stagger, onScroll } from "animejs";
import {
  LINE_COUNT,
  CHARS_PER_LINE,
  CENTER_ROW_INDEX,
  NAME_START,
} from "./waveHeroLayout";

const MENU_ITEMS = ["about me", "projects", "socials"];
const MENU_ROW_GAP = 2;
const MENU_ROW_INDICES = MENU_ITEMS.map(
  (_, i) => CENTER_ROW_INDEX + MENU_ROW_GAP * (i + 1),
);

// The cursor row is built as a full CHARS_PER_LINE-column row (same as every
// grid row) with everything blanked except the cursor, so its total width —
// and therefore its centered position — exactly matches the noise grid's
// center row, putting the cursor directly before where the name renders.
const CURSOR_COL = NAME_START - 1;
const CURSOR_ROW_BEFORE = Array.from({ length: CURSOR_COL }, () => " ").join(
  " ",
);
const CURSOR_ROW_AFTER = Array.from(
  { length: CHARS_PER_LINE - CURSOR_COL - 1 },
  () => " ",
).join(" ");

type Props = {
  sectionRef: RefObject<HTMLElement | null>;
};

export default function HomeMenu({ sectionRef }: Props) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [selectedIndex, setSelectedIndex] = useState(-1);

  // useLayoutEffect so the reveal animation's initial opacity-0 state is
  // set before the browser's first paint, avoiding a flash of fully
  // visible menu text.
  useLayoutEffect(() => {
    const section = sectionRef.current;
    const menu = menuRef.current;
    if (!section || !menu) return;

    const chars = menu.querySelectorAll("[data-char]");

    const reveal = animate(chars, {
      opacity: [0, 1],
      delay: stagger(18),
      duration: 1,
      autoplay: onScroll({
        target: section,
        sync: "play play pause reverse",
        enter: "end end-=10%",
        leave: "end end-=1%",
      }),
    });

    return () => {
      reveal.revert();
    };
  }, [sectionRef]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((i) => Math.min(i + 1, MENU_ITEMS.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, -1));
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <div
      ref={menuRef}
      className="pointer-events-none fixed inset-0 z-[5] flex h-svh flex-col items-center justify-center overflow-hidden font-mono text-lg text-white"
    >
      {Array.from({ length: LINE_COUNT }, (_, row) => {
        if (row === CENTER_ROW_INDEX) {
          return (
            <div key={row} className="whitespace-pre">
              <span className="invisible">{CURSOR_ROW_BEFORE}</span>{" "}
              <span data-char className="inline-block opacity-0">
                <span
                  className={
                    selectedIndex === -1
                      ? "animate-blink [text-shadow:0_0_14px_rgba(255,255,255,1)]"
                      : "invisible"
                  }
                >
                  &gt;
                </span>
              </span>{" "}
              <span className="invisible">{CURSOR_ROW_AFTER}</span>
            </div>
          );
        }

        const menuIndex = MENU_ROW_INDICES.indexOf(row);
        if (menuIndex !== -1) {
          const isSelected = selectedIndex === menuIndex;
          return (
            <div
              key={row}
              className="pointer-events-auto cursor-pointer whitespace-pre"
              onMouseEnter={() => setSelectedIndex(menuIndex)}
              onClick={() => setSelectedIndex(menuIndex)}
            >
              <span data-char className="inline-block opacity-0">
                <span
                  className={
                    isSelected
                      ? "animate-blink [text-shadow:0_0_14px_rgba(255,255,255,1)]"
                      : "invisible"
                  }
                >
                  &gt;
                </span>
              </span>{" "}
              <span
                className={
                  isSelected
                    ? "font-bold [text-shadow:0_0_14px_rgba(255,255,255,1)]"
                    : ""
                }
              >
                {MENU_ITEMS[menuIndex].split("").map((ch, i) => (
                  <span key={i} data-char className="inline-block opacity-0">
                    {ch}
                  </span>
                ))}
              </span>
            </div>
          );
        }

        return (
          <div key={row} className="whitespace-pre">
            &nbsp;
          </div>
        );
      })}
    </div>
  );
}
