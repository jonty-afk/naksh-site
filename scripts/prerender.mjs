// After `vite build`: write a ready-made HTML file for every address of the site (dist/p/rani/index.html …),
// each with its own title, description, share-preview tags and schema.org data, plus sitemap.xml and robots.txt.
// Search engines, WhatsApp, Pinterest and Facebook read these files without running any JavaScript.
// The same page modules that run in the browser produce the HTML here, so the two never drift apart.
import { createServer } from 'vite';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');
globalThis.matchMedia ??= () => ({ matches: false, addEventListener() {}, removeEventListener() {} });   // the only browser call made while loading

const vite = await createServer({ root, server: { middlewareMode: true }, appType: 'custom', logLevel: 'error' });
try {
  const { allPaths, pageFor } = await vite.ssrLoadModule('/src/routes.ts');
  const { BRAND } = await vite.ssrLoadModule('/src/config/brand.ts');
  const { DEFAULT_DESC } = await vite.ssrLoadModule('/src/app.ts');
  const site = BRAND.siteUrl ? BRAND.siteUrl.replace(/\/+$/, '') : '';
  const abs = (u) => (site && typeof u === 'string' && u.startsWith('/') ? site + u : u);
  const deep = (v) => (Array.isArray(v) ? v.map(deep) : v && typeof v === 'object' ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, deep(x)])) : abs(v));
  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
  const template = fs.readFileSync(path.join(dist, 'index.html'), 'utf8');

  const render = (p, file) => {
    const page = pageFor(p);
    const title = page.title ? `${page.title} — ${BRAND.name}` : `${BRAND.name} — ${BRAND.tagline}`;
    const desc = (page.desc ?? DEFAULT_DESC).replace(/\s+/g, ' ').trim();
    const image = abs(page.image ?? '/og/home.jpg');
    const head = [
      site ? `<link rel="canonical" href="${site}${p === '/' ? '/' : p}">` : '',
      page.noindex ? '<meta name="robots" content="noindex">' : '',
      `<meta property="og:site_name" content="${esc(BRAND.name)}">`,
      `<meta property="og:type" content="${p.startsWith('/p/') ? 'product' : p.startsWith('/journal/') ? 'article' : 'website'}">`,
      `<meta property="og:title" content="${esc(title)}">`,
      `<meta property="og:description" content="${esc(desc)}">`,
      `<meta property="og:image" content="${esc(image)}">`,
      site ? `<meta property="og:url" content="${site}${p}">` : '',
      '<meta name="twitter:card" content="summary_large_image">',
      ...[page.ld ?? []].flat().map((d) => `<script type="application/ld+json">${JSON.stringify(deep(d)).replace(/</g, '\\u003c')}</script>`),
    ].filter(Boolean).join('\n  ');
    const html = template
      .replace(/<title>[\s\S]*?<\/title>/, `<title>${esc(title)}</title>`)
      .replace(/<meta name="description"[^>]*>/, `<meta name="description" content="${esc(desc)}">`)
      .replace('</head>', `  ${head}\n</head>`)
      .replace('<div id="app"></div>', `<div id="app">${page.html}</div>`);
    const out = path.join(dist, file);
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, html);
    return page;
  };

  const paths = allPaths(); const listed = [];
  for (const p of paths) { const page = render(p, p === '/' ? 'index.html' : `${p.slice(1)}/index.html`); if (!page.noindex) listed.push(p); }
  render('/page-not-found', '404.html');

  if (site) {
    fs.writeFileSync(path.join(dist, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${listed.map((p) => `  <url><loc>${site}${p}</loc></url>`).join('\n')}\n</urlset>\n`);
    fs.writeFileSync(path.join(dist, 'robots.txt'), `User-agent: *\nAllow: /\nDisallow: /checkout\nDisallow: /wishlist\n\nSitemap: ${site}/sitemap.xml\n`);
  } else {
    fs.writeFileSync(path.join(dist, 'robots.txt'), 'User-agent: *\nAllow: /\nDisallow: /checkout\nDisallow: /wishlist\n');
  }
  console.log(`prerendered ${paths.length} pages${site ? ` + sitemap (${listed.length} addresses) for ${site}` : ' (no sitemap or canonical links yet: set BRAND.siteUrl in src/config/brand.ts once the site has an address)'}`);
} finally {
  await vite.close();
}
