import { useRef } from "react";
import MarkdownContent from "../components/MarkdownContent";
import SideWave from "../components/SideWave";
import { aboutMeContent } from "../lib/content";
import { useCharReveal } from "../hooks/useCharReveal";

export default function AboutMe() {
  const containerRef = useRef<HTMLDivElement>(null);
  useCharReveal(containerRef);

  return (
    <div ref={containerRef} className="relative min-h-svh bg-black">
      <SideWave className="hidden md:flex md:w-40 lg:w-64" />
      <div className="relative z-10 mx-auto max-w-2xl px-6 py-16">
        <MarkdownContent navigableHeadings backHref="/">
          {aboutMeContent}
        </MarkdownContent>
      </div>
    </div>
  );
}
