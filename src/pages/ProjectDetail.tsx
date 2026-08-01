import { useRef } from "react";
import { Navigate, useParams } from "react-router-dom";
import MarkdownContent from "../components/MarkdownContent";
import SideWave from "../components/SideWave";
import { getProject } from "../lib/content";
import { useCharReveal } from "../hooks/useCharReveal";

export default function ProjectDetail() {
  const { slug } = useParams<{ slug: string }>();
  const project = getProject(slug);
  const containerRef = useRef<HTMLDivElement>(null);
  useCharReveal(containerRef);

  if (!project) {
    return <Navigate to="/projects" replace />;
  }

  return (
    <div ref={containerRef} className="relative min-h-svh bg-black">
      <SideWave className="hidden md:flex md:w-40 lg:w-64" />
      {/* <main> landmark: the page's content column. `main` and `div`
          are both display:block, so this is a pure tag swap. */}
      <main className="relative z-10 mx-auto max-w-4xl px-6 py-16">
        <MarkdownContent navigableHeadings backHref="/projects">
          {project.content}
        </MarkdownContent>
      </main>
    </div>
  );
}
