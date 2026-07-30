import { useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import SideWave from "../components/SideWave";
import { projects } from "../lib/content";
import { useCharReveal } from "../hooks/useCharReveal";
import { useArrowKeyList } from "../hooks/useArrowKeyList";
import { revealChars } from "../lib/revealChars";

type Entry = { label: string; href: string };

const BACK_ENTRY: Entry = { label: "< back", href: "/" };
const ENTRIES: Entry[] = [
  BACK_ENTRY,
  ...projects.map((project) => ({
    label: project.title,
    href: `/projects/${project.slug}`,
  })),
];

function CursorLink({
  entry,
  isSelected,
  onSelect,
}: {
  entry: Entry;
  isSelected: boolean;
  onSelect: () => void;
}) {
  return (
    <Link
      to={entry.href}
      className="relative font-mono text-white"
      onMouseEnter={onSelect}
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
      <span
        className={
          isSelected
            ? "font-bold [text-shadow:0_0_14px_rgba(255,255,255,1)]"
            : ""
        }
      >
        {revealChars(entry.label)}
      </span>
    </Link>
  );
}

export default function Projects() {
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);
  useCharReveal(containerRef);
  const { selectedIndex, hoverSelect } = useArrowKeyList({
    length: ENTRIES.length,
    onActivate: (index) => navigate(ENTRIES[index].href),
    // Land on the most recent project (index 1, right after back) rather
    // than nothing — see website_design.md.
    initialIndex: Math.min(1, ENTRIES.length - 1),
  });

  return (
    <div ref={containerRef} className="relative min-h-svh bg-black">
      <SideWave className="hidden md:flex md:w-40 lg:w-64" />
      <div className="relative z-10 mx-auto max-w-2xl px-6 py-16">
        <div className="mb-8">
          <CursorLink
            entry={BACK_ENTRY}
            isSelected={selectedIndex === 0}
            onSelect={() => hoverSelect(0)}
          />
        </div>
        <h1 className="font-heading mb-8 text-2xl font-bold text-white">
          {revealChars("projects")}
        </h1>
        <ul className="space-y-3">
          {projects.map((project, i) => {
            const index = i + 1;
            return (
              <li key={project.slug}>
                <CursorLink
                  entry={ENTRIES[index]}
                  isSelected={selectedIndex === index}
                  onSelect={() => hoverSelect(index)}
                />
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
