import { Link } from "react-router-dom";
import { portfolioProjects } from "../lib/content";

export default function Portfolio() {
  return (
    <div className="min-h-svh bg-black px-6 py-16">
      <div className="mx-auto max-w-2xl">
        <Link
          to="/"
          className="mb-8 inline-block font-mono text-white hover:[text-shadow:0_0_14px_rgba(255,255,255,1)]"
        >
          &lt; back
        </Link>
        <h1 className="font-heading mb-8 text-2xl font-bold text-white">
          portfolio
        </h1>
        <ul className="space-y-3">
          {portfolioProjects.map((project) => (
            <li key={project.slug}>
              <Link
                to={`/portfolio/${project.slug}`}
                className="group font-mono text-white"
              >
                <span className="mr-2 opacity-0 group-hover:opacity-100">
                  &gt;
                </span>
                <span className="group-hover:[text-shadow:0_0_14px_rgba(255,255,255,1)]">
                  {project.title}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
