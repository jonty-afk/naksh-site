import { $, $$, CATALOGUE, pieceBySlug, card, footer, money, slugify, bag, wish, openBag, toast, navigate, CATEGORIES, OCCASIONS, ICON, BRAND, region, isHome, type Page } from '../app';
import { moneyNZ } from '../config/brand';
import type { Piece } from '../data/catalogue';
import { mountSpin, type Spin } from '../fallback/spin';

const EDITS: Record<string, { title: string; intro: string; test: (p: Piece) => boolean }> = {
  heavy: { title: 'Heavy work', intro: 'Our most worked pieces: zardozi, heavy borders and rich festive fabrics.', test: (p) => p.badge === 'Heavy work' || p.craft.includes('Zardozi') },
  gota: { title: 'Gota and mirror work', intro: 'Gota patti, gota lace and mirror work that catch the light.', test: (p) => p.craft.some((c) => /gota|mirror/i.test(c)) },
  jewel: { title: 'Jewel tones', intro: 'Wine, royal blue, emerald, teal and red: colours that glow under evening light.', test: (p) => /wine|royal|emerald|teal|red|navy|maroon/i.test(p.colour) },
};

export const OCC: Record<string, { line: string; face: string }> = {
  'wedding-guest': { line: 'Rich and festive without upstaging the bride: zardozi, velvet and jewel tones.', face: 'maroon-gold-print-suit' },
  reception: { line: 'After-dark glamour: deep colours, heavy work and floor-length silhouettes.', face: 'red-zardozi-anarkali' },
  sangeet: { line: 'The night everyone dances: shararas that swing and sequins that sparkle.', face: 'teal-embroidered-sharara' },
  mehndi: { line: 'Colour, gota patti and mirror work for an afternoon of henna and music.', face: 'rust-gota-patti-suit' },
  'diwali-and-eid': { line: 'Festive colour and rich embroidery for the year’s brightest celebrations.', face: 'royal-blue-gota-sharara' },
  festive: { line: 'For every celebration in between: bright, joyful and easy to wear.', face: 'rani-mirror-yoke-suit' },
};
const CAT_LINE: Record<string, string> = {
  'sharara-set': 'Short kurtas over shararas that flare from the knee, made for sangeets and festivals.',
  'straight-suit': 'Straight kurtas with pants and dupatta, finished with gota, mirror and embroidered borders.',
  'patiala-suit': 'Kurtas with full patiala salwars: sequins, prints and bright Punjabi colour.',
  anarkali: 'Floor-length anarkalis with heavy work at the yoke.',
  lehenga: 'Lehengas with a flared skirt, blouse and dupatta, embroidered in gold.',
  'drape-set': 'Pre-draped saree sets: a blouse and a ready-draped skirt, nothing to pleat or pin.',
  'long-kurta-set': 'Long kurtas and phirans in velvet, silk and tissue with rich embroidery.',
  'co-ord-set': 'Co-ord sets for the evening: beadwork, sequins and fluid pants.',
};
const everywhere = 'Festive Indian suits, delivered across New Zealand, Australia and worldwide. Prices on request.';

const head = (crumbs: [string, string][], title: string, intro: string) => `
  <header class="phead">
    <nav class="crumbs" aria-label="Breadcrumb">${crumbs.map(([l, h]) => h ? `<a href="${h}">${l}</a>` : `<span>${l}</span>`).join('<span aria-hidden="true">/</span>')}</nav>
    <h1 class="display h1"><span class="mask"><span>${title}</span></span></h1>
    ${intro ? `<p class="lede rv" style="--i:2">${intro}</p>` : ''}
  </header>`;

/** The shop: filters (category, occasion, colour, price, craft), sort, and the product grid. */
export function shop(catSlug: string, q: URLSearchParams, occasion?: string): Page {
  const edit = EDITS[q.get('edit') || ''];
  const occ = occasion ? OCCASIONS.find((o) => slugify(o) === occasion) : undefined;
  const cat = CATEGORIES.find((c) => slugify(c) === (catSlug || q.get('cat')));
  const title = occ ?? edit?.title ?? (cat ? cat + 's' : 'The collection');
  const intro = occ ? OCC[occasion!]?.line ?? '' : edit?.intro ?? (cat ? CAT_LINE[slugify(cat)] : 'Sharara sets, straight and patiala suits, anarkalis and long kurtas, rich in zardozi, gota and mirror work.');
  const crumbs: [string, string][] = occ ? [['Home', '/'], ['Occasions', '/occasions'], [occ, '']] : [['Home', '/'], ['Shop', cat || edit ? '/shop' : ''], ...(cat || edit ? [[title, '']] as [string, string][] : [])];
  const pick = (cats: string[], occs: string[], cols: string[], crafts: string[], sort: string) => {
    let list = CATALOGUE.filter((p) => (!edit || edit.test(p)) && (!cats.length || cats.includes(slugify(p.category))) && (!occs.length || p.occasions.some((o) => occs.includes(slugify(o))))
      && (!cols.length || cols.includes(slugify(p.colour.split(' &')[0]))) && (!crafts.length || crafts.some((c) => p.craft.includes(c))));
    if (sort === 'az') list = [...list].sort((a, b) => a.name.localeCompare(b.name));
    return list;
  };
  const grid = (list: Piece[]) => list.length ? list.map((p, i) => card(p, i)).join('') : `<div class="empty"><p class="lede">No pieces match those filters yet.</p><button class="btn btn--ghost btn--sm" data-clear>Clear filters</button></div>`;
  const first = pick(cat ? [slugify(cat)] : [], occasion ? [occasion] : [], [], [], 'feat');   // also what search engines read
  return {
    title: occ ? `${occ} outfits` : title, glow: '#24142a',
    desc: `${intro} ${everywhere}`,
    html: `${head(crumbs, title, intro)}
    <section class="shop">
      <aside class="filters" aria-label="Filters">
        <fieldset><legend>Category</legend>${CATEGORIES.map((c) => `<label><input type="checkbox" name="cat" value="${slugify(c)}">${c}s <small>${CATALOGUE.filter((p) => p.category === c).length}</small></label>`).join('')}</fieldset>
        <fieldset><legend>Occasion</legend>${OCCASIONS.map((o) => `<label><input type="checkbox" name="occ" value="${slugify(o)}">${o}</label>`).join('')}</fieldset>
        <fieldset><legend>Colour</legend>${[...new Map(CATALOGUE.map((p) => [p.colour.split(' &')[0], p.swatch])).entries()].map(([c, sw]) => `<label><input type="checkbox" name="col" value="${slugify(c)}"><span class="sw" style="background:${sw}"></span>${c}</label>`).join('')}</fieldset>
        <fieldset><legend>Work</legend>${[...new Set(CATALOGUE.flatMap((p) => p.craft))].sort().map((c) => `<label><input type="checkbox" name="craft" value="${c}">${c} <small>${CATALOGUE.filter((p) => p.craft.includes(c)).length}</small></label>`).join('')}</fieldset>
        <button class="link" data-clear>Clear all</button>
      </aside>
      <div>
        <div class="shopbar"><span><b data-n>${first.length}</b> pieces · prices on request</span><span class="shopbar__r"><button class="chip filt-toggle" data-ft aria-expanded="false">Filters</button><select data-sort aria-label="Sort by"><option value="feat">Featured</option><option value="az">Name A–Z</option></select></span></div>
        <div class="pgrid" data-grid>${grid(first)}</div>
      </div>
    </section>
    ${footer()}`,
    mount(root) {
      const gridEl = $('[data-grid]', root)!, n = $('[data-n]', root)!, form = $('.filters', root)!;
      const pre = (name: string, v: string | null | undefined) => { if (v) $$<HTMLInputElement>(`input[name="${name}"]`, form).forEach((i) => { if (i.value === v) i.checked = true; }); };
      pre('cat', cat ? slugify(cat) : null); pre('occ', occasion ?? null);
      const vals = (name: string) => $$<HTMLInputElement>(`input[name="${name}"]:checked`, form).map((i) => i.value);
      const draw = () => {
        const list = pick(vals('cat'), vals('occ'), vals('col'), vals('craft'), ($('[data-sort]', root) as HTMLSelectElement).value);
        n.textContent = String(list.length); gridEl.innerHTML = grid(list);
        $$('.rv', gridEl).forEach((el) => setTimeout(() => el.classList.add('in'), 20));
      };
      form.addEventListener('change', draw); $('[data-sort]', root)!.addEventListener('change', draw);
      root.addEventListener('click', (e) => {
        const t = e.target as HTMLElement;
        if (t.closest('[data-clear]')) { $$<HTMLInputElement>('input', form).forEach((x) => { x.checked = false; }); draw(); }
        const ft = t.closest<HTMLElement>('[data-ft]'); if (ft) { const on = $('.shop', root)!.classList.toggle('filters-open'); ft.setAttribute('aria-expanded', String(on)); }
      });
    },
  };
}

export const occasion = (slug: string, q: URLSearchParams) => shop('', q, slug);

/** All occasions on one page. */
export function occasions(): Page {
  return {
    title: 'Occasions', glow: '#24142a',
    desc: `What to wear to every ceremony, from the mehndi to the reception, and the pieces we make for each. ${everywhere}`,
    html: `${head([['Home', '/'], ['Occasions', '']], 'Dress for the occasion', 'From the mehndi to the reception: what to wear to every ceremony, and the pieces we make for each.')}
    <section class="occ">${OCCASIONS.map((o, i) => { const s = slugify(o), p = pieceBySlug(OCC[s].face)!, nPieces = CATALOGUE.filter((x) => x.occasions.includes(o)).length; return `
      <a class="occ__i rv" style="--i:${i % 3};--g:${p.glow}" href="/occasion/${s}"><span class="occ__fig">${`<img src="${p.images.frontCut}" alt="" loading="lazy">`}</span><span class="occ__txt"><b class="h3">${o}</b><span>${OCC[s].line}</span><em>${nPieces} piece${nPieces === 1 ? '' : 's'} ›</em></span></a>`; }).join('')}
    </section>
    ${footer()}`,
  };
}

const SIZES = ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL'];
/** Product page: gallery (front, back, close-up, rotate view when we have it), details, size, add to bag. */
export function product(slug: string, q: URLSearchParams): Page {
  const p = pieceBySlug(slug);
  if (!p) return { title: 'Not found', noindex: true, html: `<section class="phead"><h1 class="display h1">That piece isn’t here.</h1><p><a class="btn" href="/shop">Back to the collection</a></p></section>${footer()}` };
  const views: [string, string, boolean][] = [[p.images.frontCut, 'Front', true], [p.images.front, 'In the studio', false], ...(p.images.backCut ? [[p.images.backCut, 'Back', true]] as [string, string, boolean][] : []), ...(p.images.detail ? [[p.images.detail, 'Close-up', false]] as [string, string, boolean][] : [])];
  const related = CATALOGUE.filter((x) => x !== p && (x.category === p.category || x.occasions.some((o) => p.occasions.includes(o)))).slice(0, 4);
  let size = '';
  return {
    title: `${p.name} ${p.category.toLowerCase()} in ${p.colour.toLowerCase()}`, glow: p.glow,
    desc: `${p.name}: ${p.category.toLowerCase()} in ${p.colour.toLowerCase()}. ${p.story} ${p.price == null ? 'Price on request.' : moneyNZ(p.price) + '.'}`,
    image: `/og/${p.slug}.jpg`,
    ld: {
      '@context': 'https://schema.org', '@type': 'Product', name: p.name, description: p.story, sku: p.slug, category: p.category, color: p.colour, ...(p.fabric ? { material: p.fabric } : {}),
      image: [p.images.front, p.images.frontCut], brand: { '@type': 'Brand', name: BRAND.name },
      ...(p.price == null ? {} : { offers: { '@type': 'Offer', url: `/p/${p.slug}`, priceCurrency: 'NZD', price: p.price, availability: 'https://schema.org/InStock' } }),
    },
    html: `
    <section class="pd" style="--g:${p.glow}">
      <div class="pd__thumbs" role="tablist" aria-label="Views">${views.map(([s, l, cut], i) => `<button class="${i ? '' : 'on'}${cut ? ' is-cut' : ''}" data-view="${i}" role="tab" aria-selected="${!i}" aria-label="${l}"><img src="${s}" alt=""></button>`).join('')}${p.spin ? `<button data-view="spin" role="tab" aria-selected="false" aria-label="Rotate view"><span class="t360">Rotate<br>↻</span></button>` : ''}</div>
      <div class="pd__main is-cut" data-main tabindex="0" aria-label="${p.name}: click to zoom"><img src="${p.images.frontCut}" alt="${p.name}, ${p.category.toLowerCase()} in ${p.colour.toLowerCase()}, on the house model"><span class="pd__hint chip" hidden>Drag to rotate</span></div>
      <div class="pd__info">
        <nav class="crumbs" aria-label="Breadcrumb"><a href="/shop">Shop</a><span aria-hidden="true">/</span><a href="/shop/${slugify(p.category)}">${p.category}s</a></nav>
        <div class="pd__top">
          ${p.badge ? `<span class="eyebrow">${p.badge}</span>` : ''}
          <h1 class="display pd__title"><span class="mask"><span>${p.name}</span></span></h1>
          <p class="pd__kind">${p.category} in ${p.colour.toLowerCase()}</p>
          ${p.price == null ? `<p class="pd__price">Price on request</p>` : `<p class="pd__price">${money(p.price)} <small>${region().cur}${isHome() ? '' : ', a guide'}</small></p>
          ${isHome() ? '' : `<p class="pd__nzd">Charged in New Zealand dollars: ${moneyNZ(p.price)}</p>`}`}
        </div>
        <p class="lede">${p.story}</p>
        <div class="field"><div class="field__top"><span class="field__l">Size</span><a class="link" href="/size-guide">Size guide</a></div>
          <div class="sizes">${SIZES.map((s) => `<button class="size${s.length > 4 ? ' size--wide' : ''}" data-size="${s}" aria-pressed="false">${s}</button>`).join('')}</div></div>
        <div class="pd__row2" data-buyrow><button class="btn btn--wide" data-add>${p.price == null ? 'Enquire about this suit' : 'Add to bag'}</button><button class="pd__wish${wish.has(p.slug) ? ' on' : ''}" data-wish="${p.slug}" aria-pressed="${wish.has(p.slug)}" aria-label="Save to wishlist">${ICON.heart}</button></div>
        <ul class="pd__perks"><li>${ICON.tape}Help with sizing before you order</li><li>${ICON.video}Ask for a video of this suit</li><li>${ICON.box}Tracked delivery ${region().deliver}</li></ul>
        <p class="pd__ask">Questions about size, fabric or colour? <button class="link" data-chat>Ask our concierge</button> or <a class="link" href="/appointment?piece=${p.slug}">send us a message</a>.</p>
        <div class="pd__acc">
          <details open><summary>Details</summary><div><dl class="facts"><dt>Includes</dt><dd>${p.includes}</dd><dt>Fabric</dt><dd>${p.fabric ?? 'Ask us'}</dd>${p.craft.length ? `<dt>Work</dt><dd>${p.craft.join(', ')}</dd>` : ''}<dt>Colour</dt><dd>${p.colour}</dd></dl></div></details>
          <details><summary>Size &amp; fit</summary><div><p>Choose your usual size, or send us your measurements and we will check the fit with you before you order. <a class="link" href="/size-guide">Size guide</a></p></div></details>
          <details><summary>Delivery</summary><div><p>Tracked delivery ${region().deliver}. Ask us for the delivery time for this suit.</p>${isHome() ? '' : '<p>Outside New Zealand, your country may charge import duty or tax when the parcel arrives. We will tell you what to expect before you order.</p>'}</div></details>
          <details><summary>Care</summary><div><p>${p.care}</p></div></details>
          <details><summary>Returns</summary><div><p>${isHome() ? 'Your rights under the Consumer Guarantees Act are never affected.' : 'Your rights under consumer law are never affected.'} <a class="link" href="/shipping">Shipping &amp; returns</a></p></div></details>
        </div>
        <p class="share"><span class="field__l">Share</span><a data-share="wa" target="_blank" rel="noopener">WhatsApp</a><a data-share="pin" target="_blank" rel="noopener">Pinterest</a><button data-share="copy">Copy link</button></p>
      </div>
    </section>
    <section class="sec"><div class="sec__head"><h2 class="display h2">You may also like</h2></div><div class="pgrid pgrid--4">${related.map((x, i) => card(x, i)).join('')}</div></section>
    <div class="buybar" data-buybar aria-hidden="true"><span class="buybar__txt"><b>${p.name}</b><span>${money(p.price)}</span></span><button class="btn btn--sm" data-add tabindex="-1">${p.price == null ? 'Enquire' : 'Add to bag'}</button></div>
    ${footer()}`,
    mount(root) {
      const main = $('[data-main]', root)!, img = $('img', main) as HTMLImageElement, hint = $('.pd__hint', main)!; let sp: Spin | null = null;
      const show = (b: HTMLElement) => {
        $$('[data-view]', root).forEach((x) => { x.classList.toggle('on', x === b); x.setAttribute('aria-selected', String(x === b)); }); main.classList.remove('zoom');
        if (b.dataset.view === 'spin') { img.style.opacity = '0'; main.classList.add('is-spin', 'is-cut'); hint.hidden = false; sp ??= mountSpin(main, p.spin!); main.addEventListener('stage:turned', () => (hint.hidden = true), { once: true }); }
        else { const [src, , cut] = views[Number(b.dataset.view)]; sp?.destroy(); sp = null; hint.hidden = true; main.classList.remove('is-spin'); main.classList.toggle('is-cut', cut); img.style.opacity = '1'; img.src = src; }
      };
      const add = () => {
        if (p.price == null) { navigate(`/appointment?piece=${p.slug}${size ? `&size=${encodeURIComponent(size)}` : ''}`); return; }
        if (!size) { toast('Choose a size first'); const s = $('.sizes', root)!; s.scrollIntoView({ block: 'center', behavior: 'smooth' }); s.classList.add('shake'); setTimeout(() => s.classList.remove('shake'), 600); return; }
        bag.add({ slug: p.slug, size, qty: 1 }); toast('Added to your bag'); setTimeout(() => openBag(), 450);
      };
      root.addEventListener('click', (e) => {
        const t = e.target as HTMLElement; let b: HTMLElement | null;
        if ((b = t.closest('[data-view]'))) show(b);
        else if ((b = t.closest('[data-size]'))) { size = b.dataset.size!; $$('.size', root).forEach((x) => { x.classList.toggle('on', x === b); x.setAttribute('aria-pressed', String(x === b)); }); }
        else if (t.closest('[data-add]')) add();
        else if (t.closest('[data-share="copy"]')) { const done = () => toast('Link copied'); navigator.clipboard?.writeText(location.href).then(done, done); }
        else if (t.closest('[data-main]') && !sp) main.classList.toggle('zoom');
      });
      main.addEventListener('pointermove', (e) => { if (!main.classList.contains('zoom')) return; const r = main.getBoundingClientRect(); img.style.transformOrigin = `${((e.clientX - r.left) / r.width) * 100}% ${((e.clientY - r.top) / r.height) * 100}%`; });
      main.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !sp) main.classList.toggle('zoom'); });
      if ((q.get('view') === 'turn' || q.get('view') === 'rotate' || q.get('view') === '360') && p.spin) show($('[data-view="spin"]', root)!);

      // sharing: WhatsApp is how families choose together; Pinterest is where outfits get saved
      const url = location.origin + location.pathname, text = `${p.name} ${p.category.toLowerCase()} by ${BRAND.name}`;
      ($('[data-share="wa"]', root) as HTMLAnchorElement).href = `https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`;
      ($('[data-share="pin"]', root) as HTMLAnchorElement).href = `https://www.pinterest.com/pin/create/button/?url=${encodeURIComponent(url)}&media=${encodeURIComponent(location.origin + p.images.front)}&description=${encodeURIComponent(text)}`;

      // phones: a buy bar appears once the main button has scrolled away
      const bar = $('[data-buybar]', root)!, row = $('[data-buyrow]', root)!, rootEl = document.documentElement;
      const io = 'IntersectionObserver' in window ? new IntersectionObserver(([en]) => { const on = !en.isIntersecting && en.boundingClientRect.top < 0; bar.classList.toggle('on', on); bar.setAttribute('aria-hidden', String(!on)); rootEl.classList.toggle('has-buybar', on); }) : null;
      io?.observe(row);
      return () => { sp?.destroy(); io?.disconnect(); rootEl.classList.remove('has-buybar'); };
    },
  };
}

