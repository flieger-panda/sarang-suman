import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { LINE_COUNT, CENTER_ROW_INDEX, NAME } from "./waveHeroLayout";
import PixelIcon, { type PixelBitmap } from "./PixelIcon";
import { PIXEL_ICONS } from "./pixelIcons";
import { useCharReveal } from "../hooks/useCharReveal";
import { usePageTransition } from "./TransitionContext";

// TODO: replace with real profile URLs.
const LINKEDIN_URL = "https://www.linkedin.com/in/sarangsuman";
const INSTAGRAM_URL = "https://www.instagram.com/sarangrsuman/";
const GITHUB_URL = "https://github.com/flieger-panda";

type SubItem = {
  label: string;
  href: string;
  external?: boolean;
  icon?: PixelBitmap;
};
type MenuNode =
  | { label: string; kind: "link"; href: string }
  | { label: string; kind: "submenu"; items: SubItem[] };

const MENU: MenuNode[] = [
  { label: "about me", kind: "link", href: "/about-me" },
  {
    label: "portfolio",
    kind: "submenu",
    items: [
      { label: "skills", href: "/skills" },
      { label: "projects", href: "/projects" },
    ],
  },
  {
    label: "socials",
    kind: "submenu",
    items: [
      {
        label: "linkedin",
        href: LINKEDIN_URL,
        external: true,
        icon: PIXEL_ICONS.linkedin,
      },
      {
        label: "github",
        href: GITHUB_URL,
        external: true,
        icon: PIXEL_ICONS.github,
      },
      { label: "music", href: "/music", icon: PIXEL_ICONS.music },
      {
        label: "instagram",
        href: INSTAGRAM_URL,
        external: true,
        icon: PIXEL_ICONS.instagram,
      },
    ],
  },
];

type FlatEntry =
  | { type: "top"; topIndex: number; label: string }
  | {
      type: "sub";
      topIndex: number;
      subIndex: number;
      label: string;
      icon?: PixelBitmap;
    };

const TOP_ROW_GAP = 2;
const SUB_ROW_GAP = 1;

export default function HomeMenu() {
  const menuRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const transitionRef = usePageTransition();
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  const flat = useMemo<FlatEntry[]>(() => {
    const entries: FlatEntry[] = [];
    MENU.forEach((node, topIndex) => {
      entries.push({ type: "top", topIndex, label: node.label });
      if (node.kind === "submenu" && expanded.has(topIndex)) {
        node.items.forEach((item, subIndex) => {
          entries.push({
            type: "sub",
            topIndex,
            subIndex,
            label: item.label,
            icon: item.icon,
          });
        });
      }
    });
    return entries;
  }, [expanded]);

  const menuRowIndices = useMemo(() => {
    let row = CENTER_ROW_INDEX;
    return flat.map((entry) => {
      row += entry.type === "sub" ? SUB_ROW_GAP : TOP_ROW_GAP;
      return row;
    });
  }, [flat]);

  useCharReveal(menuRef);

  const activate = useCallback(
    (entry: FlatEntry) => {
      const node = MENU[entry.topIndex];
      if (entry.type === "top") {
        if (node.kind === "link") {
          navigate(node.href);
          return;
        }
        setExpanded((prev) => {
          const next = new Set(prev);
          if (next.has(entry.topIndex)) {
            next.delete(entry.topIndex);
          } else {
            next.add(entry.topIndex);
          }
          return next;
        });
        return;
      }

      if (node.kind !== "submenu") return;
      const item = node.items[entry.subIndex];
      if (item.external) {
        // External links open in a new tab, so there's no route change for
        // PageTransition to react to — run the same curtain+wave sequence
        // by hand so the menu is fully covered (not just the wave's sparse
        // text) before we hand off, then it lifts back since the user is
        // left on this tab.
        transitionRef?.current?.runExternal(() => {
          window.open(item.href, "_blank", "noopener,noreferrer");
        });
      } else {
        navigate(item.href);
      }
    },
    [navigate, transitionRef],
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((i) => Math.min(i + 1, flat.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, -1));
      } else if (e.key === "Enter") {
        if (selectedIndex === -1) return;
        e.preventDefault();
        activate(flat[selectedIndex]);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [flat, selectedIndex, activate]);

  return (
    <div
      ref={menuRef}
      className="pointer-events-none fixed inset-0 z-[5] flex h-svh flex-col items-center justify-center overflow-hidden font-mono text-lg text-white"
    >
      {Array.from({ length: LINE_COUNT }, (_, row) => {
        if (row === CENTER_ROW_INDEX) {
          return (
            <div key={row} className="relative whitespace-pre">
              <span
                data-char
                className="absolute right-full mr-2 inline-block opacity-0"
              >
                <span
                  className={
                    selectedIndex === -1
                      ? "animate-blink [text-shadow:0_0_14px_rgba(255,255,255,1)]"
                      : "invisible"
                  }
                >
                  &gt;
                </span>
              </span>
              <span className="[text-shadow:0_0_14px_rgba(255,255,255,1)]">
                {NAME.split("").map((ch, i) => (
                  <span key={i} data-char className="inline-block opacity-0">
                    {ch}
                  </span>
                ))}
              </span>
            </div>
          );
        }

        const flatIndex = menuRowIndices.indexOf(row);
        if (flatIndex !== -1) {
          const entry = flat[flatIndex];
          const isSelected = selectedIndex === flatIndex;
          const isSub = entry.type === "sub";

          // Keyed by logical entry (not the transient grid row) so React
          // keeps the same DOM node as expand/collapse shifts rows around
          // — otherwise a remount would drop the anime.js-driven opacity
          // set directly on the data-char spans, leaving the row invisible.
          const entryKey = isSub
            ? `sub-${entry.topIndex}-${entry.subIndex}`
            : `top-${entry.topIndex}`;

          if (!isSub) {
            return (
              <div
                key={entryKey}
                className="relative pointer-events-auto cursor-pointer whitespace-pre"
                onMouseEnter={() => setSelectedIndex(flatIndex)}
                onClick={() => {
                  setSelectedIndex(flatIndex);
                  activate(entry);
                }}
              >
                <span
                  data-char
                  className="absolute right-full mr-2 inline-block opacity-0"
                >
                  <span
                    className={
                      isSelected
                        ? "animate-blink [text-shadow:0_0_14px_rgba(255,255,255,1)]"
                        : "invisible"
                    }
                  >
                    &gt;
                  </span>
                </span>
                <span
                  className={
                    isSelected
                      ? "font-bold [text-shadow:0_0_14px_rgba(255,255,255,1)]"
                      : ""
                  }
                >
                  {entry.label.split("").map((ch, i) => (
                    <span
                      key={i}
                      data-char
                      className="inline-block opacity-0"
                    >
                      {ch}
                    </span>
                  ))}
                </span>
              </div>
            );
          }

          // Submenu items are revealed by user interaction rather than the
          // scroll-triggered entrance animation, so they render at full
          // opacity immediately instead of using the data-char reveal.
          // Smaller and tighter than top-level items, but centered the
          // same way (no leading indent) so the column stays aligned.
          return (
            <div
              key={entryKey}
              className="relative pointer-events-auto cursor-pointer whitespace-pre text-sm"
              onMouseEnter={() => setSelectedIndex(flatIndex)}
              onClick={() => {
                setSelectedIndex(flatIndex);
                activate(entry);
              }}
            >
              <span
                className={
                  "absolute right-full mr-2 " +
                  (isSelected
                    ? "animate-blink [text-shadow:0_0_14px_rgba(255,255,255,1)]"
                    : "invisible")
                }
              >
                &gt;
              </span>
              {entry.icon && (
                <PixelIcon
                  bitmap={entry.icon}
                  className="mr-1 inline-block h-5 w-5 align-middle"
                />
              )}
              <span
                className={
                  isSelected
                    ? "font-bold [text-shadow:0_0_14px_rgba(255,255,255,1)]"
                    : ""
                }
              >
                {entry.label}
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
