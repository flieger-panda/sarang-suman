// Types for seo.mjs — see the note at the top of that file for why the
// implementation is plain ESM rather than TypeScript.

import type { Project } from "./content";

export type RouteKind =
  | "profile"
  | "about"
  | "page"
  | "collection"
  | "resume"
  | "project";

export type SeoRoute = {
  path: string;
  title: string;
  description: string;
  ogType: string;
  kind: RouteKind;
  /** Present only on `kind: "project"` routes. */
  project?: Project;
};

export declare const SITE: {
  origin: string;
  name: string;
  jobTitle: string;
  email: string;
  locality: string;
  region: string;
  country: string;
  image: string;
  ogImage: string;
  ogImageAlt: string;
  resumePdf: string;
  school: { name: string; sameAs: string };
  sameAs: string[];
  knowsAbout: string[];
};

export declare function absolute(path: string): string;
export declare function projectRoutes(projects: Project[]): SeoRoute[];
export declare function allRoutes(projects: Project[]): SeoRoute[];
export declare function metaForPath(
  routes: SeoRoute[],
  pathname: string,
): SeoRoute | undefined;
export declare function jsonLdForRoute(route: SeoRoute): Record<string, unknown>;
