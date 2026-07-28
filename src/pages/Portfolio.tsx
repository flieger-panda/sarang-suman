import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { portfolioProjects } from "../lib/content";

type Entry = { label: string; href: string };

const BACK_ENTRY: Entry = { label: "< back", href: "/" };
const ENTRIES: Entry[] = [
  BACK_ENTRY,
  ...portfolioProjects.map((project) => ({
    label: project.title,
    href: `/portfolio/${project.slug}`,
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
        {entry.label}
      </span>
    </Link>
  );
}

export default function Portfolio() {
  const navigate = useNavigate();
  const [selectedIndex, setSelectedIndex] = useState(-1);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((i) => Math.min(i + 1, ENTRIES.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, -1));
      } else if (e.key === "Enter") {
        if (selectedIndex === -1) return;
        e.preventDefault();
        navigate(ENTRIES[selectedIndex].href);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedIndex, navigate]);

  return (
    <div className="min-h-svh bg-black px-6 py-16">
      <div className="mx-auto max-w-2xl">
        <div className="mb-8">
          <CursorLink
            entry={BACK_ENTRY}
            isSelected={selectedIndex === 0}
            onSelect={() => setSelectedIndex(0)}
          />
        </div>
        <h1 className="font-heading mb-8 text-2xl font-bold text-white">
          portfolio
        </h1>
        <ul className="space-y-3">
          {portfolioProjects.map((project, i) => {
            const index = i + 1;
            return (
              <li key={project.slug}>
                <CursorLink
                  entry={ENTRIES[index]}
                  isSelected={selectedIndex === index}
                  onSelect={() => setSelectedIndex(index)}
                />
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
