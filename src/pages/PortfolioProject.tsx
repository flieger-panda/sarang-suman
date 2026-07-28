import { Link, Navigate, useParams } from "react-router-dom";
import MarkdownContent from "../components/MarkdownContent";
import { getPortfolioProject } from "../lib/content";

export default function PortfolioProject() {
  const { slug } = useParams<{ slug: string }>();
  const project = getPortfolioProject(slug);

  if (!project) {
    return <Navigate to="/portfolio" replace />;
  }

  return (
    <div className="min-h-svh bg-black px-6 py-16">
      <div className="mx-auto max-w-2xl">
        <Link
          to="/portfolio"
          className="mb-8 inline-block font-mono text-white hover:[text-shadow:0_0_14px_rgba(255,255,255,1)]"
        >
          &lt; back
        </Link>
        <MarkdownContent>{project.content}</MarkdownContent>
      </div>
    </div>
  );
}
