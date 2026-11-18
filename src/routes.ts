// Every page of the site, by address. Used by the app (src/main.ts) and by the build step that writes a
// ready-made HTML file for each address (scripts/prerender.mjs), so search engines and share previews can read them.
// 17 Nov 2026: trimmed to the real range (no bridal, craft, journal, story, made-to-measure or care pages).
import type { Page } from './app';
import { CATALOGUE, CATEGORIES, OCCASIONS } from './data/catalogue';
import home from './pages/home';
import { shop, occasion, occasions, product } from './pages/shop';
import { appointment, sizeGuide, shipping, faq, contact, wishlist, checkout, notFound } from './pages/editorial';

export type Route = (arg: string, query: URLSearchParams) => Page;
const slugify = (s: string) => s.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

export const ROUTES: [RegExp, Route][] = [
  [/^\/$/, home],
  [/^\/shop(?:\/([a-z0-9-]+))?$/, shop],
  [/^\/occasions$/, occasions],
  [/^\/occasion\/([a-z0-9-]+)$/, occasion],
  [/^\/p\/([a-z0-9-]+)$/, product],
  [/^\/appointment$/, appointment],
  [/^\/(?:size-guide|fit)$/, sizeGuide],
  [/^\/shipping$/, shipping],
  [/^\/faq$/, faq],
  [/^\/contact$/, contact],
  [/^\/wishlist$/, wishlist],
  [/^\/checkout$/, checkout],
  [/.*/, notFound],
];

/** The page for an address. */
export function pageFor(path: string, query = new URLSearchParams()): Page {
  const hit = ROUTES.find(([re]) => re.test(path)) ?? ROUTES[ROUTES.length - 1];
  return hit[1](path.match(hit[0])?.[1] ?? '', query);
}

/** Every address worth a file of its own (the wishlist and checkout are personal, so they are left out of search). */
export const allPaths = (): string[] => [
  '/', '/shop', ...CATEGORIES.map((c) => `/shop/${slugify(c)}`), '/occasions', ...OCCASIONS.map((o) => `/occasion/${slugify(o)}`),
  ...CATALOGUE.map((p) => `/p/${p.slug}`),
  '/appointment', '/size-guide', '/shipping', '/faq', '/contact', '/wishlist', '/checkout',
];
