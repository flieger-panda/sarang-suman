import { useRef } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import MarkdownContent from "../components/MarkdownContent";
import { getPortfolioProject } from "../lib/content";
import { useCharReveal } from "../hooks/useCharReveal";
import { revealChars } from "../lib/revealChars";

export default function PortfolioProject() {
  const { slug } = useParams<{ slug: string }>();
  const project = getPortfolioProject(slug);
  const containerRef = useRef<HTMLDivElement>(null);
  useCharReveal(containerRef);

  if (!project) {
    return <Navigate to="/portfolio" replace />;
  }

  return (
    <div ref={containerRef} className="min-h-svh bg-black px-6 py-16">
      <div className="mx-auto max-w-4xl">
        <Link
          to="/portfolio"
          className="mb-8 inline-block font-mono text-white hover:[text-shadow:0_0_14px_rgba(255,255,255,1)]"
        >
          {revealChars("< back")}
        </Link>
        <MarkdownContent>{project.content}</MarkdownContent>
      </div>
    </div>
  );
}
