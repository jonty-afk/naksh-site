import { $, $$, CATALOGUE, pieceBySlug, card, small, footer, benefits, money, reduced, BRAND, type Page } from '../app';
import type { Piece } from '../data/catalogue';
import { mountLoop, type LoopSource } from '../fallback/loop';

// Home, laid out like apple.com: one idea per block, a title, one line, at most two links.
// Every figure is a cut-out (no backdrop), so nothing ever sits in a box.
/** The hero line-up: five showpiece looks (public/hero/*.webp, made by ai-model/make_hero.sh), the richest in the middle.
 *  They set the mood only: no links, names or prices. */
const LINEUP: [string, 'far-l' | 'far-r' | 'near-l' | 'near-r' | 'mid'][] = [
  ['hero-royal-blue-velvet-sharara', 'far-l'], ['hero-rani-pink-silk-anarkali', 'far-r'], ['hero-gold-tissue-anarkali', 'near-l'], ['hero-emerald-velvet-sharara', 'near-r'], ['hero-red-bridal-anarkali', 'mid'],
];

/** Living pictures for the line-up (see-through turning videos made by ai-model/make_turn_video.sh into public/loop/).
 *  OFF: on 17 Nov the owner said the stills look better, because one figure turning beside four still ones looks odd.
 *  To try again, add e.g. 'hero-red-bridal-anarkali': { dir: '/loop/red-bridal/' } — ideally for all five at once. */
const LOOPS: Record<string, LoopSource> = {};

/** The ceremonies walk: one look per occasion. The headline says what it is for; the suit's name is in the line. */
const WALK: { slug: string; when: string; title: string; line: string; more: [string, string] }[] = [
  { slug: 'rust-zardozi-sharara', when: 'The mehndi', title: 'Burnt orange for the mehndi', line: 'A heavy gold zardozi yoke, tall zardozi panels on the sharara and a scalloped organza dupatta.', more: ['All mehndi looks', '/occasion/mehndi'] },
  { slug: 'teal-embroidered-sharara', when: 'The sangeet', title: 'A sharara for the dance floor', line: 'Teal and coral embroidery over a sharara that swings when you do.', more: ['All sangeet looks', '/occasion/sangeet'] },
  { slug: 'maroon-zardozi-sharara', when: 'The wedding', title: 'Maroon and gold for the day', line: 'A deep zardozi panel across the hem and a copper tissue dupatta.', more: ['Wedding guest looks', '/occasion/wedding-guest'] },
  { slug: 'red-zardozi-anarkali', when: 'The reception', title: 'Red and gold, after dark', line: 'A floor-length anarkali with heavy zardozi at the yoke.', more: ['All reception looks', '/occasion/reception'] },
  { slug: 'royal-blue-gota-sharara', when: 'Diwali & Eid', title: 'Royal blue for the festivals', line: 'A gota hem with tassels and a sharara scattered with gold flowers.', more: ['All festive looks', '/occasion/diwali-and-eid'] },
];

const fig = (p: Piece, eager = false) => `<img src="${p.images.frontCut}" alt="" ${eager ? '' : 'loading="lazy"'} draggable="false">`;

export default function home(): Page {
  const newIn = CATALOGUE.slice(0, 10);
  const cats: [string, string, string][] = [['Farshi suits', '/shop/farshi-suit', 'purple-sequin-suit'], ['Sharara sets', '/shop/sharara-set', 'navy-gold-print-sharara'], ['Straight suits', '/shop/straight-suit', 'rani-green-gota-suit'], ['Anarkalis', '/shop/anarkali', 'red-zardozi-anarkali'], ['Long kurta sets', '/shop/long-kurta-set', 'royal-blue-phiran'], ['Co-ord sets', '/shop/co-ord-set', 'emerald-beaded-coord']];
  return {
    glow: '#521222', image: '/og/home.jpg',
    ld: [
      { '@context': 'https://schema.org', '@type': 'Organization', name: BRAND.name, url: '/', logo: '/og/home.jpg', description: 'Festive Indian suits: farshi and sharara sets, anarkalis and straight suits with zardozi, gota and mirror work. Based in New Zealand, delivering worldwide.' },
      { '@context': 'https://schema.org', '@type': 'WebSite', name: BRAND.name, url: '/' },
    ],
    html: `
    <section class="hero home-hero">
      <div class="hero__txt">
        <h1 class="display hero__title"><span class="mask"><span>Couture for every celebration</span></span></h1>
        <p class="hero__sub rv" style="--i:2">Festive suits, shararas and anarkalis, rich in zardozi, gota and mirror work.</p>
        <div class="cta rv" style="--i:3"><a class="btn" href="/shop">Shop the collection</a><a class="btn btn--ghost" href="/appointment"><span class="only-lg">Ask us about a suit</span><span class="only-sm">Ask about a suit</span></a></div>
      </div>
      <div class="lineup" data-lineup>
        ${LINEUP.map(([name, pos]) => { const mid = pos === 'mid'; return `
        <div class="lu lu--${pos}" data-look="${name}" aria-hidden="true">
          <img src="/hero/${name}.webp" alt="" draggable="false" ${mid ? 'fetchpriority="high"' : 'decoding="async"'}>
        </div>`; }).join('')}
      </div>
    </section>

    <nav class="cats" aria-label="Shop by category">
      ${cats.map(([label, href, s], i) => { const p = pieceBySlug(s)!; return `<a class="cats__i rv" style="--i:${i};--g:${p.glow}" href="${href}"><span class="cats__fig"><img src="${small(p)}" alt="" loading="lazy" draggable="false"></span><span>${label}</span></a>`; }).join('')}
    </nav>

    <section class="walk" data-walk style="--n:${WALK.length}" aria-label="A look for every ceremony">
      <div class="walk__pin">
        <div class="walk__glows" aria-hidden="true">${WALK.map((w) => { const p = pieceBySlug(w.slug)!; return `<i style="--g:${p.glow};--sw:${p.swatch}"></i>`; }).join('')}</div>
        <div class="walk__figs">${WALK.map((w) => { const p = pieceBySlug(w.slug)!; return `<a class="walk__fig" href="/p/${p.slug}" tabindex="-1" aria-hidden="true">${fig(p)}</a>`; }).join('')}</div>
        <div class="walk__txts">${WALK.map((w) => { const p = pieceBySlug(w.slug)!; return `
          <div class="walk__txt">
            <span class="eyebrow">${w.when}</span>
            <h2 class="display walk__title">${w.title}</h2>
            <p>${w.line}</p>
            <p class="walk__piece">${p.name} · ${money(p.price)}</p>
            <div class="cta"><a class="btn btn--sm" href="/p/${p.slug}">Shop this look</a><a class="more" href="${w.more[1]}">${w.more[0]} ›</a></div>
          </div>`; }).join('')}</div>
        <div class="walk__nav" role="tablist" aria-label="Ceremonies">${WALK.map((w, i) => `<button role="tab" data-stop="${i}" aria-label="${w.when}"><span>${w.when.replace(/^The /, '')}</span></button>`).join('')}</div>
      </div>
    </section>

    <section class="sec" data-rail>
      <div class="sec__head"><h2 class="display h2">The collection</h2>
        <div class="sec__tools"><a class="more" href="/shop">Shop all ›</a><div class="rail__nav"><button data-prev aria-label="Previous pieces">‹</button><button data-next aria-label="More pieces">›</button></div></div></div>
      <div class="rail"><div class="rail__track">${newIn.map((p, i) => card(p, i)).join('')}</div></div>
    </section>

    ${benefits()}
    ${footer()}`,
    mount(root) {
      const hero = $('.hero', root)!, line = $('[data-lineup]', root)!, txt = $('.hero__txt', root)!;
      // each figure steps into the light as soon as its own picture has arrived (the bride first; nothing waits on the rest)
      const stopLoops: (() => void)[] = [];
      $$('.lu', line).forEach((a) => {
        const im = $('img', a) as HTMLImageElement, wait = a.classList.contains('lu--mid') ? 0 : a.className.includes('near') ? 160 : 320;
        const done = () => setTimeout(() => a.classList.add('in'), reduced ? 0 : wait);
        // decode first, so she fades in as a finished picture rather than popping in afterwards
        const ready = () => (im.decode ? im.decode().then(done, done) : done());
        im.complete && im.naturalWidth ? ready() : im.addEventListener('load', ready, { once: true });
        const loop = LOOPS[a.dataset.look ?? '']; if (loop) stopLoops.push(mountLoop(a, im, loop));
      });

      // the ceremonies walk: the page scrolls as usual; while this block is pinned, the looks glide past.
      // Figures only ever slide (never cross-fade), and the words and colour switch at the half-way point,
      // so wherever the scroll stops there is one look, one colour, one set of words.
      const walk = $('[data-walk]', root)!, pin = $('.walk__pin', walk)!;
      const figs = $$('.walk__fig', walk), txts = $$('.walk__txt', walk), glows = $$('.walk__glows i', walk), stops = $$('.walk__nav button', walk);
      const N = figs.length; let active = -1;
      const setActive = (i: number) => {
        if (i === active) return; active = i;
        txts.forEach((t, k) => { t.classList.toggle('on', k === i); (t as HTMLElement & { inert: boolean }).inert = k !== i; });
        glows.forEach((g, k) => g.classList.toggle('on', k === i));
        stops.forEach((b, k) => { b.classList.toggle('on', k === i); b.setAttribute('aria-selected', String(k === i)); });
      };
      const stepLen = () => Math.max(1, (walk.offsetHeight - pin.offsetHeight) / (N - 1));
      const placeWalk = () => {
        const raw = Math.min(N - 1, Math.max(0, -walk.getBoundingClientRect().top / stepLen()));
        // each look rests in the middle for a while, then hands over: ease only through the middle of each step
        const i = Math.floor(raw), f = raw - i, e = f < 0.2 ? 0 : f > 0.8 ? 1 : (f - 0.2) / 0.6, p = i + e * e * (3 - 2 * e);
        figs.forEach((el, k) => { const d = k - p; el.style.setProperty('--d', d.toFixed(4)); el.style.setProperty('--ad', Math.min(1, Math.abs(d)).toFixed(4)); el.style.visibility = Math.abs(d) > 2.4 ? 'hidden' : ''; });
        setActive(Math.round(p));
      };
      const onStop = (e: Event) => { const b = (e.target as HTMLElement).closest<HTMLElement>('[data-stop]'); if (b) scrollTo({ top: walk.getBoundingClientRect().top + scrollY + Number(b.dataset.stop) * stepLen() + 2, behavior: reduced ? 'auto' : 'smooth' }); };
      walk.addEventListener('click', onStop);
      // the walk's pictures load a little before it scrolls into view
      const io = 'IntersectionObserver' in window ? new IntersectionObserver((es) => { if (es.some((x) => x.isIntersecting)) { $$<HTMLImageElement>('img', walk).forEach((im) => (im.loading = 'eager')); io!.disconnect(); } }, { rootMargin: '150% 0px' }) : null;
      io ? io.observe(walk) : $$<HTMLImageElement>('img', walk).forEach((im) => (im.loading = 'eager'));

      let raf = 0;
      const frame = () => {
        raf = 0; placeWalk();
        if (reduced) return;
        // Apple-style hero scroll: the line-up eases up and grows a little, the words fade
        const p = Math.min(1, Math.max(0, scrollY / Math.max(1, hero.offsetHeight)));
        if (p < 1 || line.style.transform) { line.style.transform = `translateY(${(-p * 5).toFixed(2)}%) scale(${(1 + p * 0.06).toFixed(4)})`; txt.style.opacity = String(Math.max(0, 1 - p * 2.2)); txt.style.transform = `translateY(${(-p * 40).toFixed(1)}px)`; }
      };
      const on = () => { if (!raf) raf = requestAnimationFrame(frame); };
      addEventListener('scroll', on, { passive: true }); addEventListener('resize', on); frame();
      return () => { removeEventListener('scroll', on); removeEventListener('resize', on); cancelAnimationFrame(raf); io?.disconnect(); stopLoops.forEach((f) => f()); };
    },
  };
}
