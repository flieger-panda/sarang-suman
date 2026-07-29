import { useRef } from "react";
import { Link } from "react-router-dom";
import MarkdownContent from "../components/MarkdownContent";
import { aboutMeContent } from "../lib/content";
import { useCharReveal } from "../hooks/useCharReveal";
import { revealChars } from "../lib/revealChars";

export default function AboutMe() {
  const containerRef = useRef<HTMLDivElement>(null);
  useCharReveal(containerRef);

  return (
    <div ref={containerRef} className="min-h-svh bg-black px-6 py-16">
      <div className="mx-auto max-w-2xl">
        <Link
          to="/"
          className="mb-8 inline-block font-mono text-white hover:[text-shadow:0_0_14px_rgba(255,255,255,1)]"
        >
          {revealChars("< back")}
        </Link>
        <MarkdownContent>{aboutMeContent}</MarkdownContent>
      </div>
    </div>
  );
}
