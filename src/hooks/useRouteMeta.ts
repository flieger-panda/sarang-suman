import { useLayoutEffect } from "react";
import { projects } from "../lib/content";
import {
  absolute,
  allRoutes,
  jsonLdForRoute,
  metaForPath,
} from "../lib/seo.mjs";

// Built once at module load: the route table is a pure function of the
// content files, which Vite has already inlined by this point.
const ROUTES = allRoutes(projects);

// Deliberately imperative rather than React 19's built-in <title>/<meta>
// hoisting, which looks like the obvious tool here and isn't. React appends
// its hoisted tags to <head> rather than replacing what the server sent, and
// `document.title` is defined as the *first* <title> in <head> — so with
// index.html already carrying one (it has to, for the pre-JS and no-JS case),
// a React-rendered <title> would be a second element the browser ignores.
// Same duplication problem for <meta name="description">. Updating the
// existing elements in place sidesteps all of it, needs no dependency, and
// keeps the static build (scripts/build-seo.mjs) as the single source of
// truth for what a crawler sees.

function setMeta(selector: string, attr: string, value: string) {
  const el = document.head.querySelector(selector);
  if (el) el.setAttribute(attr, value);
}

/**
 * Keeps the document's title, description, canonical URL, social tags, and
 * JSON-LD in step with the current route.
 *
 * On a cold load these already match — scripts/build-seo.mjs wrote them into
 * the static HTML for this exact URL — so this is a no-op that becomes load-
 * bearing the moment the user navigates in-app, since BrowserRouter never
 * fetches a new document. It also covers any route the build script didn't
 * emit a file for, which would otherwise be served the generic 404.html head.
 */
export function useRouteMeta(pathname: string) {
  useLayoutEffect(() => {
    const route = metaForPath(ROUTES, pathname);
    if (!route) return;

    const url = absolute(route.path);

    document.title = route.title;
    setMeta('meta[name="description"]', "content", route.description);
    setMeta('link[rel="canonical"]', "href", url);

    setMeta('meta[property="og:title"]', "content", route.title);
    setMeta('meta[property="og:description"]', "content", route.description);
    setMeta('meta[property="og:url"]', "content", url);
    setMeta('meta[property="og:type"]', "content", route.ogType);
    setMeta('meta[name="twitter:title"]', "content", route.title);
    setMeta('meta[name="twitter:description"]', "content", route.description);

    // Replaced wholesale rather than patched: the graph's shape differs by
    // route kind (a project is a CreativeWork, the home page a ProfilePage).
    const script = document.head.querySelector<HTMLScriptElement>(
      'script[type="application/ld+json"]',
    );
    if (script) {
      script.textContent = JSON.stringify(jsonLdForRoute(route), null, 2);
    }
  }, [pathname]);
}
