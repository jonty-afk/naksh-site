// App shell: announcement line, header with mega-menu, router, bag, wishlist, search, concierge chat,
// scroll reveals and the shared product card / footer markup.
import { BRAND, REGIONS, money, region, setRegion, guessRegion, isHome } from './config/brand';
import { CATALOGUE, pieceBySlug, CATEGORIES, OCCASIONS, type Piece } from './data/catalogue';
import { mountChat, searchPieces } from './chat';

export const $ = <T extends HTMLElement = HTMLElement>(s: string, r: ParentNode = document) => r.querySelector(s) as T | null;
export const $$ = <T extends HTMLElement = HTMLElement>(s: string, r: ParentNode = document) => Array.from(r.querySelectorAll(s)) as T[];
export const h = (html: string) => { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild as HTMLElement; };
export const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
export const setGlow = (c: string) => document.documentElement.style.setProperty('--glow', c);
export const slugify = (s: string) => s.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

// ───────── storage that never throws (private mode, blocked storage) ─────────
const store = {
  get<T>(k: string, d: T): T { try { const v = localStorage.getItem(k); return v ? (JSON.parse(v) as T) : d; } catch { return d; } },
  set(k: string, v: unknown) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* memory only */ } },
};

// ───────── bag (demo: stored on this device only) ─────────
export interface Line { slug: string; size: string; qty: number }
export const bag = {
  lines: store.get<Line[]>('bag.v2', []).filter((l) => pieceBySlug(l.slug)),
  add(l: Line) { const f = this.lines.find((x) => x.slug === l.slug && x.size === l.size); f ? f.qty++ : this.lines.push(l); this.save(); },
  remove(i: number) { this.lines.splice(i, 1); this.save(); },
  count() { return this.lines.reduce((n, l) => n + l.qty, 0); },
  total() { return this.lines.reduce((n, l) => n + l.qty * (pieceBySlug(l.slug)?.price ?? 0), 0); },
  save() { store.set('bag.v2', this.lines); renderBag(); },
};
export const wish = {
  list: store.get<string[]>('wish.v1', []).filter((s) => pieceBySlug(s)),
  has(s: string) { return this.list.includes(s); },
  toggle(s: string) { this.list = this.has(s) ? this.list.filter((x) => x !== s) : [...this.list, s]; store.set('wish.v1', this.list); renderCounts(); $$(`[data-wish="${s}"]`).forEach((b) => { b.classList.toggle('on', this.has(s)); b.setAttribute('aria-pressed', String(this.has(s))); }); return this.has(s); },
};
function renderCounts() {
  const n = (v: number) => (v ? String(v) : '');   // an empty badge is hidden by CSS
  $$('[data-count="bag"]').forEach((b) => (b.textContent = n(bag.count())));
  $$('[data-count="wish"]').forEach((b) => (b.textContent = n(wish.list.length)));
}
/** Small figures use the lighter card-size picture; the browser takes the full one only where the figure is shown large. */
export const small = (p: Piece) => p.images.frontCutS ?? p.images.frontCut;
const cardSrc = (p: Piece) => p.images.frontCutS ? `src="${p.images.frontCutS}" srcset="${p.images.frontCutS} 750w, ${p.images.frontCut} 1200w" sizes="(max-width: 760px) 50vw, 320px"` : `src="${p.images.frontCut}"`;
export const thumb = (p: Piece) => `<span class="thumb" style="--g:${p.glow}"><img src="${small(p)}" alt="" loading="lazy"></span>`;
function renderBag() {
  renderCounts();
  const list = $('.bag__list'); if (!list) return;
  list.innerHTML = bag.lines.length ? bag.lines.map((l, i) => {
    const p = pieceBySlug(l.slug); if (!p) return '';
    return `<div class="bag__item"><a href="/p/${p.slug}">${thumb(p)}</a>
      <div><a class="bag__name" href="/p/${p.slug}">${p.name}</a><div class="bag__kind">${p.category} · ${p.colour}<br>Size: ${l.size} · Qty ${l.qty}</div><button class="link" data-rm="${i}">Remove</button></div>
      <div class="bag__price">${money(p.price == null ? null : p.price * l.qty)}</div></div>`;
  }).join('') : `<div class="bag__empty"><p class="h3">Your bag is empty</p><a class="btn btn--ghost" href="/shop">Shop the collection</a></div>`;
  $('.bag__total span:last-child')!.textContent = bag.lines.some((l) => pieceBySlug(l.slug)?.price == null) ? 'On request' : money(bag.total());
  $('.bag__foot')!.hidden = !bag.lines.length;
}
export const openBag = (on = true) => document.documentElement.classList.toggle('bag-open', on);
let toastT = 0;
export function toast(msg: string) { const t = $('.toast')!; t.textContent = msg; t.classList.add('on'); clearTimeout(toastT); toastT = window.setTimeout(() => t.classList.remove('on'), 2400); }

// ───────── icons ─────────
const svg = (d: string, w = 1.4) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
export const ICON = {
  heart: svg('<path d="M12 20.5s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.6a4.3 4.3 0 0 1 7.5 2.7c0 5.6-7.5 10.2-7.5 10.2z"/>'),
  search: svg('<circle cx="10.5" cy="10.5" r="6.5"/><path d="M15.5 15.5 21 21"/>'),
  bag: svg('<path d="M5 8h14l-1.2 12.5H6.2z"/><path d="M9 8V6.5a3 3 0 0 1 6 0V8"/>'),
  tape: svg('<circle cx="9" cy="11" r="6"/><circle cx="9" cy="11" r="1.6"/><path d="M9 17h12v-3.6h-6.4M17 17v-1.8M19.5 17v-1.8"/>'),
  needle: svg('<path d="M4.5 19.5 18 6"/><path d="M17 5.2c.9-.9 2.1-.9 2.6-.4s.5 1.7-.4 2.6"/><path d="M18.6 6.6c-3.4 1.2-6.3.4-8.1 2.6-1.9 2.3.6 4.6-1.5 6.5-1.3 1.2-3.1.6-3.9-.2"/>'),
  box: svg('<path d="M3.5 7.5 12 3l8.5 4.5v9L12 21l-8.5-4.5z"/><path d="M3.5 7.5 12 12l8.5-4.5M12 12v9"/>'),
  video: svg('<rect x="3" y="6" width="13" height="12" rx="2.5"/><path d="m16 10.2 5-3v9.6l-5-3"/>'),
  chev: svg('<path d="m9 5 7 7-7 7"/>', 1.6),
  close: svg('<path d="M6 6l12 12M18 6 6 18"/>'),
};
/** The emblem: a gold buta (paisley) curling over lotus leaves — one naksh, as if stitched in zari. (public/emblem.webp, from ai-model/logo/) */
const mark = `<img class="emb" src="/emblem.webp" alt="" width="177" height="240" aria-hidden="true">`;
/** The name as a logo: NAKSH in light, widely spaced capitals; BY MILI small in gold between two fine gold rules. */
const wordmark = `<span class="wm"><span class="wm__word">${BRAND.word}</span><span class="wm__by"><i></i><span>${BRAND.by}</span><i></i></span></span>`;

// accepted cards (shown as standard white payment badges)
const badge = (label: string, inner: string) => `<svg class="paybadge" viewBox="0 0 38 24" role="img" aria-label="${label}"><rect width="38" height="24" rx="3.5" fill="#fff"/>${inner}</svg>`;
const PAY = [
  badge('Visa', '<path transform="translate(4.6 -2.4) scale(1.2)" fill="#1A1F71" d="M9.112 8.262L5.97 15.758H3.92L2.374 9.775c-.094-.368-.175-.503-.461-.658C1.447 8.864.677 8.627 0 8.479l.046-.217h3.3a.904.904 0 01.894.764l.817 4.338 2.018-5.102zm8.033 5.049c.008-1.979-2.736-2.088-2.717-2.972.006-.269.262-.555.822-.628a3.66 3.66 0 011.913.336l.34-1.59a5.207 5.207 0 00-1.814-.333c-1.917 0-3.266 1.02-3.278 2.479-.012 1.079.963 1.68 1.698 2.04.756.367 1.01.603 1.006.931-.005.504-.602.725-1.16.734-.975.015-1.54-.263-1.992-.473l-.351 1.642c.453.208 1.289.39 2.156.398 2.037 0 3.37-1.006 3.377-2.564m5.061 2.447H24l-1.565-7.496h-1.656a.883.883 0 00-.826.55l-2.909 6.946h2.036l.405-1.12h2.488zm-2.163-2.656l1.02-2.815.588 2.815zm-8.16-4.84l-1.603 7.496H8.34l1.605-7.496z"/>'),
  badge('Mastercard', '<defs><clipPath id="mcL"><circle cx="15.2" cy="12" r="7"/></clipPath></defs><circle cx="15.2" cy="12" r="7" fill="#EB001B"/><circle cx="22.8" cy="12" r="7" fill="#F79E1B"/><circle cx="22.8" cy="12" r="7" fill="#FF5F00" clip-path="url(#mcL)"/>'),
  badge('American Express', '<rect width="38" height="24" rx="3.5" fill="#006FCF"/><path transform="translate(9 2) scale(.8333)" fill="#fff" d="M16.015 14.378c0-.32-.135-.496-.344-.622-.21-.12-.464-.135-.81-.135h-1.543v2.82h.675v-1.027h.72c.24 0 .39.024.478.125.12.13.104.38.104.55v.35h.66v-.555c-.002-.25-.017-.376-.108-.516-.06-.08-.18-.18-.33-.234l.02-.008c.18-.072.48-.297.48-.747zm-.87.407l-.028-.002c-.09.053-.195.058-.33.058h-.81v-.63h.824c.12 0 .24 0 .33.05.098.048.156.147.15.255 0 .12-.045.215-.134.27zM20.297 15.837H19v.6h1.304c.676 0 1.05-.278 1.05-.884 0-.28-.066-.448-.187-.582-.153-.133-.392-.193-.73-.207l-.376-.015c-.104 0-.18 0-.255-.03-.09-.03-.15-.105-.15-.21 0-.09.017-.166.09-.21.083-.046.177-.066.272-.06h1.23v-.602h-1.35c-.704 0-.958.437-.958.84 0 .9.776.855 1.407.87.104 0 .18.015.225.06.046.03.082.106.082.18 0 .077-.035.15-.08.18-.06.053-.15.07-.277.07zM0 0v10.096L.81 8.22h1.75l.225.464V8.22h2.043l.45 1.02.437-1.013h6.502c.295 0 .56.057.756.236v-.23h1.787v.23c.307-.17.686-.23 1.12-.23h2.606l.24.466v-.466h1.918l.254.465v-.466h1.858v3.948H20.87l-.36-.6v.585h-2.353l-.256-.63h-.583l-.27.614h-1.213c-.48 0-.84-.104-1.08-.24v.24h-2.89v-.884c0-.12-.03-.12-.105-.135h-.105v1.036H6.067v-.48l-.21.48H4.69l-.202-.48v.465H2.235l-.256-.624H1.4l-.256.624H0V24h23.786v-7.108c-.27.135-.613.18-.973.18H21.09v-.255c-.21.165-.57.255-.914.255H14.71v-.9c0-.12-.018-.12-.12-.12h-.075v1.022h-1.8v-1.066c-.298.136-.643.15-.928.136h-.214v.915h-2.18l-.54-.617-.57.6H4.742v-3.93h3.61l.518.602.554-.6h2.412c.28 0 .74.03.942.225v-.24h2.177c.202 0 .644.045.903.225v-.24h3.265v.24c.163-.164.508-.24.803-.24h1.89v.24c.194-.15.464-.24.84-.24h1.176V0H0zM21.156 14.955c.004.005.006.012.01.016.01.01.024.01.032.02l-.042-.035zM23.828 13.082h.065v.555h-.065zM23.865 15.03v-.005c-.03-.025-.046-.048-.075-.07-.15-.153-.39-.215-.764-.225l-.36-.012c-.12 0-.194-.007-.27-.03-.09-.03-.15-.105-.15-.21 0-.09.03-.16.09-.204.076-.045.15-.05.27-.05h1.223v-.588h-1.283c-.69 0-.96.437-.96.84 0 .9.78.855 1.41.87.104 0 .18.015.224.06.046.03.076.106.076.18 0 .07-.034.138-.09.18-.045.056-.136.07-.27.07h-1.288v.605h1.287c.42 0 .734-.118.9-.36h.03c.09-.134.135-.3.135-.523 0-.24-.045-.39-.135-.526zM18.597 14.208v-.583h-2.235V16.458h2.235v-.585h-1.57v-.57h1.533v-.584h-1.532v-.51M13.51 8.787h.685V11.6h-.684zM13.126 9.543l-.007.006c0-.314-.13-.5-.34-.624-.217-.125-.47-.135-.81-.135H10.43v2.82h.674v-1.034h.72c.24 0 .39.03.487.12.122.136.107.378.107.548v.354h.677v-.553c0-.25-.016-.375-.11-.516-.09-.107-.202-.19-.33-.237.172-.07.472-.3.472-.75zm-.855.396h-.015c-.09.054-.195.056-.33.056H11.1v-.623h.825c.12 0 .24.004.33.05.09.04.15.128.15.25s-.047.22-.134.266zM15.92 9.373h.632v-.6h-.644c-.464 0-.804.105-1.02.33-.286.3-.362.69-.362 1.11 0 .512.123.833.36 1.074.232.238.645.31.97.31h.78l.255-.627h1.39l.262.627h1.36v-2.11l1.272 2.11h.95l.002.002V8.786h-.684v1.963l-1.18-1.96h-1.02V11.4L18.11 8.744h-1.004l-.943 2.22h-.3c-.177 0-.362-.03-.468-.134-.125-.15-.186-.36-.186-.662 0-.285.08-.51.194-.63.133-.135.272-.165.516-.165zm1.668-.108l.464 1.118v.002h-.93l.466-1.12zM2.38 10.97l.254.628H4V9.393l.972 2.205h.584l.973-2.202.015 2.202h.69v-2.81H6.118l-.807 1.904-.876-1.905H3.343v2.663L2.205 8.787h-.997L.01 11.597h.72l.26-.626h1.39zm-.688-1.705l.46 1.118-.003.002h-.915l.457-1.12zM11.856 13.62H9.714l-.85.923-.825-.922H5.346v2.82H8l.855-.932.824.93h1.302v-.94h.838c.6 0 1.17-.164 1.17-.945l-.006-.003c0-.78-.598-.93-1.128-.93zM7.67 15.853l-.014-.002H6.02v-.557h1.47v-.574H6.02v-.51H7.7l.733.82-.764.824zm2.642.33l-1.03-1.147 1.03-1.108v2.253zm1.553-1.258h-.885v-.717h.885c.24 0 .42.098.42.344 0 .243-.15.372-.42.372zM9.967 9.373v-.586H7.73V11.6h2.237v-.58H8.4v-.564h1.527V9.88H8.4v-.507"/>'),
  badge('Apple Pay', '<path transform="translate(2.2 -4.8) scale(1.4)" fill="#000" d="M2.15 4.318a42.16 42.16 0 0 0-.454.003c-.15.005-.303.013-.452.04a1.44 1.44 0 0 0-1.06.772c-.07.138-.114.278-.14.43-.028.148-.037.3-.04.45A10.2 10.2 0 0 0 0 6.222v11.557c0 .07.002.138.003.207.004.15.013.303.04.452.027.15.072.291.142.429a1.436 1.436 0 0 0 .63.63c.138.07.278.115.43.142.148.027.3.036.45.04l.208.003h20.194l.207-.003c.15-.004.303-.013.452-.04.15-.027.291-.071.428-.141a1.432 1.432 0 0 0 .631-.631c.07-.138.115-.278.141-.43.027-.148.036-.3.04-.45.002-.07.003-.138.003-.208l.001-.246V6.221c0-.07-.002-.138-.004-.207a2.995 2.995 0 0 0-.04-.452 1.446 1.446 0 0 0-1.2-1.201 3.022 3.022 0 0 0-.452-.04 10.448 10.448 0 0 0-.453-.003zm0 .512h19.942c.066 0 .131.002.197.003.115.004.25.01.375.032.109.02.2.05.287.094a.927.927 0 0 1 .407.407.997.997 0 0 1 .094.288c.022.123.028.258.031.374.002.065.003.13.003.197v11.552c0 .065 0 .13-.003.196-.003.115-.009.25-.032.375a.927.927 0 0 1-.5.693 1.002 1.002 0 0 1-.286.094 2.598 2.598 0 0 1-.373.032l-.2.003H1.906c-.066 0-.133-.002-.196-.003a2.61 2.61 0 0 1-.375-.032c-.109-.02-.2-.05-.288-.094a.918.918 0 0 1-.406-.407 1.006 1.006 0 0 1-.094-.288 2.531 2.531 0 0 1-.032-.373 9.588 9.588 0 0 1-.002-.197V6.224c0-.065 0-.131.002-.197.004-.114.01-.248.032-.375.02-.108.05-.199.094-.287a.925.925 0 0 1 .407-.406 1.03 1.03 0 0 1 .287-.094c.125-.022.26-.029.375-.032.065-.002.131-.002.196-.003zm4.71 3.7c-.3.016-.668.199-.88.456-.191.22-.36.58-.316.918.338.03.675-.169.888-.418.205-.258.345-.603.308-.955zm2.207.42v5.493h.852v-1.877h1.18c1.078 0 1.835-.739 1.835-1.812 0-1.07-.742-1.805-1.808-1.805zm.852.719h.982c.739 0 1.161.396 1.161 1.089 0 .692-.422 1.092-1.164 1.092h-.979zm-3.154.3c-.45.01-.83.28-1.05.28-.235 0-.593-.264-.981-.257a1.446 1.446 0 0 0-1.23.747c-.527.908-.139 2.255.374 2.995.249.366.549.769.944.754.373-.014.52-.242.973-.242.454 0 .586.242.98.235.41-.007.667-.366.915-.733.286-.417.403-.82.41-.841-.007-.008-.79-.308-.797-1.209-.008-.754.615-1.113.644-1.135-.352-.52-.9-.578-1.09-.593a1.123 1.123 0 0 0-.092-.002zm8.204.397c-.99 0-1.606.533-1.652 1.256h.777c.072-.358.369-.586.845-.586.502 0 .803.266.803.711v.309l-1.097.064c-.951.054-1.488.484-1.488 1.184 0 .72.548 1.207 1.332 1.207.526 0 1.032-.281 1.264-.727h.019v.659h.788v-2.76c0-.803-.62-1.317-1.591-1.317zm1.94.072l1.446 4.009c0 .003-.073.24-.073.247-.125.41-.33.571-.711.571-.069 0-.206 0-.267-.015v.666c.06.011.267.019.335.019.83 0 1.226-.312 1.568-1.283l1.5-4.214h-.868l-1.012 3.259h-.015l-1.013-3.26zm-1.167 2.189v.316c0 .521-.45.917-1.024.917-.442 0-.731-.228-.731-.579 0-.342.278-.56.769-.593z"/>'),
].join('');

// ───────── shared markup ─────────
/** Product card: the piece cut out on a soft spotlight in its own colour; the back view on hover. */
export const card = (p: Piece, i = 0) => `
  <article class="pcard rv" style="--i:${i % 4};--g:${p.glow}" data-slug="${p.slug}">
    <a class="pcard__img" href="/p/${p.slug}" aria-label="${p.name}, ${p.category.toLowerCase()} in ${p.colour.toLowerCase()}, ${money(p.price)}">
      <img class="pcard__a" ${cardSrc(p)} alt="" loading="lazy" draggable="false">
      ${p.images.backCut ? `<img class="pcard__b" src="${p.images.backCut}" alt="" loading="lazy" draggable="false">` : ''}
      ${p.spin ? '<span class="pcard__360">Rotate ↻</span>' : ''}
    </a>
    <button class="pcard__wish${wish.has(p.slug) ? ' on' : ''}" data-wish="${p.slug}" aria-pressed="${wish.has(p.slug)}" aria-label="Save ${p.name} to wishlist">${ICON.heart}</button>
    <div class="pcard__meta"><a class="pcard__name" href="/p/${p.slug}" tabindex="-1">${p.name}</a><span class="pcard__kind">${p.category} · ${p.colour}</span><span class="pcard__price">${money(p.price)}</span></div>
  </article>`;

/** Four short promises, with icons — used once per page at most. */
export const benefits = () => `
  <section class="perks" aria-label="Why ${BRAND.name}">
    ${[[ICON.needle, 'Rich festive work', 'Zardozi, gota, mirror and sequin work on every piece.'], [ICON.tape, 'Help with sizing', 'Send us your measurements and we check the fit before you order.'], [ICON.box, isHome() ? 'Delivered across NZ' : 'Delivered worldwide', `Tracked delivery ${region().deliver}.`], [ICON.video, 'See it on video', 'Ask for a video of any suit before you decide.']].map(([ic, a, b], i) =>
      `<div class="rv" style="--i:${i}"><span class="perks__i">${ic}</span><b>${a}</b><span>${b}</span></div>`).join('')}
  </section>`;

/** Country and currency: a plain <select>, so it works on every phone and screen reader. */
export const regionSelect = (cls = '') => `<label class="region ${cls}"><span class="sr-only">Deliver to</span><select data-region aria-label="Country and currency">${REGIONS.map((r) => `<option value="${r.id}"${r === region() ? ' selected' : ''}>${r.name} · ${r.cur}</option>`).join('')}</select></label>`;

export const footer = () => `
  <footer class="foot">
    <div class="foot__news">
      <div><b class="h3">The ${BRAND.name} letter</b><p>New collections and trunk-show dates, a few times a year.</p></div>
      <div><form class="news__form" data-news><input type="email" required placeholder="Email address" aria-label="Email address" autocomplete="email"><button class="btn">Subscribe</button></form>
        <p class="note" data-news-note hidden>Thank you. Until the shop opens, sign-ups are kept on this device only.</p></div>
    </div>
    <div class="foot__cols">
      <div class="foot__brand"><a class="nav__mark" href="/" aria-label="${BRAND.name} home">${mark}${wordmark}</a><p>Festive Indian suits, sharara sets and anarkalis with zardozi, gota and mirror work. From New Zealand, delivered worldwide.</p></div>
      <nav aria-label="Shop"><b>Shop</b>${CATEGORIES.map((c) => `<a href="/shop/${slugify(c)}">${c}s</a>`).join('')}<a href="/shop">Shop all</a></nav>
      <nav aria-label="Occasions"><b>Occasions</b>${OCCASIONS.map((o) => `<a href="/occasion/${slugify(o)}">${o}</a>`).join('')}</nav>
      <nav aria-label="Client care"><b>Client care</b><a href="/appointment">Ask about a suit</a><a href="/size-guide">Size guide</a><a href="/shipping">Shipping &amp; returns</a><a href="/faq">FAQ</a><a href="/contact">Contact</a><a href="/wishlist">Wishlist</a></nav>
    </div>
    <div class="foot__base">
      <span>© ${new Date().getFullYear()} ${BRAND.name} · ${BRAND.country}</span>
      ${regionSelect('foot__region')}
      <span class="foot__pay" title="Payment opens with the first collection">${PAY}</span>
    </div>
    <p class="foot__fine">${BRAND.sampleNote}</p>
  </footer>`;

/** Fade/slide things in as they enter the viewport. */
export function wireReveals(root: ParentNode) {
  const els = $$('.rv', root);
  // what is already on screen shows straight away (never wait on an observer for the first view)
  setTimeout(() => els.forEach((el) => { if (el.getBoundingClientRect().top < innerHeight) el.classList.add('in'); }), 40);
  if (!('IntersectionObserver' in window)) { els.forEach((el) => el.classList.add('in')); return; }
  const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -5% 0px' });
  els.forEach((el) => io.observe(el));
}

/** Horizontal rails: arrow buttons; native swipe on touch. */
export function wireRails(root: ParentNode) {
  $$('[data-rail]', root).forEach((wrap) => {
    const track = $('.rail__track', wrap)!; const step = () => track.clientWidth * 0.8;
    const prev = $<HTMLButtonElement>('[data-prev]', wrap), next = $<HTMLButtonElement>('[data-next]', wrap);
    prev?.addEventListener('click', () => track.scrollBy({ left: -step(), behavior: 'smooth' }));
    next?.addEventListener('click', () => track.scrollBy({ left: step(), behavior: 'smooth' }));
    const ends = () => { if (prev) prev.disabled = track.scrollLeft < 4; if (next) next.disabled = track.scrollLeft + track.clientWidth > track.scrollWidth - 4; };
    track.addEventListener('scroll', ends, { passive: true }); ends();
  });
}

// ───────── router (real page addresses: /shop, /p/rani …, so every page can be shared and found) ─────────
export interface Page {
  html: string; title?: string; glow?: string;
  /** one or two sentences for search results and share previews */
  desc?: string;
  /** picture for share previews (site-relative) */
  image?: string;
  /** schema.org data for search engines */
  ld?: object | object[];
  /** keep out of search engines (bag, wishlist) */
  noindex?: boolean;
  mount?(root: HTMLElement): void | (() => void);
}
type Route = (arg: string, query: URLSearchParams) => Page | Promise<Page>;
const routes: [RegExp, Route][] = [];
export const route = (re: RegExp, r: Route) => routes.push([re, r]);
let cleanup: void | (() => void); let first = true;
const here = () => location.pathname.replace(/\/+$/, '') || '/';
export const DEFAULT_DESC = 'Festive Indian suits: farshi and sharara sets, anarkalis and straight suits with zardozi, gota and mirror work. Delivered across New Zealand, Australia and worldwide.';

/** Show the page for the current address. `keep` = stay at this scroll position (used when only the currency changes). */
async function go(keep?: number) {
  const path = here();
  const hit = routes.find(([re]) => re.test(path)) ?? routes[routes.length - 1];
  const page = await hit[1](path.match(hit[0])?.[1] ?? '', new URLSearchParams(location.search));
  const app = $('#app')!;
  const swap = () => {
    cleanup?.(); app.innerHTML = page.html; scrollTo(0, keep ?? 0);
    document.title = page.title ? `${page.title} — ${BRAND.name}` : `${BRAND.name} — ${BRAND.tagline}`;
    $('meta[name="description"]')?.setAttribute('content', page.desc ?? DEFAULT_DESC);
    document.documentElement.classList.remove('menu-open', 'bag-open', 'search-open');
    setGlow(page.glow ?? '#2a1730');
    $$('.nav a[href], .menu a[href]').forEach((a) => { const on = a.getAttribute('href') === path || (path.startsWith('/occasion') && a.getAttribute('href') === '/occasions') || (path.startsWith('/shop/') && a.getAttribute('href') === '/shop'); on ? a.setAttribute('aria-current', 'page') : a.removeAttribute('aria-current'); });
    cleanup = page.mount?.(app); wireReveals(app); wireRails(app);
    document.documentElement.classList.toggle('has-hero', !!$('.hero', app));   // phones: keep the chat button off the hero figure
    if (keep) scrollTo(0, keep);
    setTimeout(() => app.classList.add('ready'), 30);   // not rAF: it can stall in a background tab
  };
  if (first || reduced || keep !== undefined) { first = false; swap(); return; }
  app.classList.remove('ready'); setTimeout(swap, 200);
}
/** Go to another page of the site without reloading it. */
export function navigate(href: string) {
  if (href === location.pathname + location.search) { scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' }); return; }
  try { history.replaceState({ y: scrollY }, ''); } catch { /* state is a nicety */ }
  history.pushState(null, '', href); go();
}

// ───────── header ─────────
const mega = () => `
  <div class="mega">
    <div class="mega__in">
      <div><b>Shop by category</b>${CATEGORIES.map((c) => `<a href="/shop/${slugify(c)}">${c}s</a>`).join('')}<a href="/shop">Shop all</a></div>
      <div><b>Shop by occasion</b>${OCCASIONS.map((o) => `<a href="/occasion/${slugify(o)}">${o}</a>`).join('')}</div>
      <div><b>Edits</b><a href="/shop?edit=heavy">Heavy work</a><a href="/shop?edit=gota">Gota and mirror work</a><a href="/shop?edit=jewel">Jewel tones</a></div>
      ${['wine-velvet-zardozi', 'red-zardozi-anarkali'].map((s) => { const p = pieceBySlug(s)!; return `<a class="mega__feat" href="/p/${p.slug}">${thumb(p)}<span><b>${p.name}</b><em>${p.category}</em></span></a>`; }).join('')}
    </div>
  </div>`;

export function boot() {
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';   // a new page always opens at the top
  try { setRegion(store.get<string>('region.v1', '') || guessRegion()); } catch { /* stays on New Zealand */ }
  // The top line drifts slowly sideways in a seamless loop (two copies side by side; the second is hidden from
  // screen readers and keyboards). It pauses under the pointer, and stands still for reduced motion.
  const annItems = (copy: boolean) => [
    'Festive suits with zardozi, gota and mirror work',
    `Delivered ${region().deliver}`,
    `<a href="/appointment"${copy ? ' tabindex="-1"' : ''}>Ask us about any suit ›</a>`,
    'A video of any suit before you decide',
    'Help with sizing from your measurements',
  ].map((x) => `<span class="announce__item">${x}</span>`).join('');
  const announce = () => `<div class="announce__track"><div class="announce__run">${annItems(false)}</div><div class="announce__run" aria-hidden="true">${annItems(true)}</div></div>${regionSelect('announce__region')}`;
  document.body.prepend(h(`<div class="announce">${announce()}</div>`));
  document.body.append(
    h(`<header class="nav">
      <nav class="nav__left" aria-label="Main">
        <div class="nav__has"><a href="/shop">Shop</a>${mega()}</div>
        <a href="/shop?edit=heavy">Heavy work</a>
        <a href="/occasions">Occasions</a>
        <a class="nav__wide" href="/size-guide">Help with fit</a>
      </nav>
      <a class="nav__mark" href="/" aria-label="${BRAND.name} home">${mark}${wordmark}</a>
      <div class="nav__right">
        <a class="nav__appt" href="/appointment">Ask about a suit</a>
        <button class="nav__icon" data-search aria-label="Search">${ICON.search}</button>
        <a class="nav__icon nav__wish" href="/wishlist" aria-label="Wishlist">${ICON.heart}<b data-count="wish"></b></a>
        <button class="nav__icon nav__bag" aria-label="Bag">${ICON.bag}<b data-count="bag"></b></button>
        <button class="nav__menu" aria-label="Menu" aria-expanded="false"><span></span><span></span></button>
      </div></header>`),
    h(`<div class="menu" aria-label="Menu">
      <nav class="menu__big">${([
        ['/shop', 'Shop all', `${CATALOGUE.length} real suits, ready to ask about`],
        ['/shop?edit=heavy', 'Heavy work', 'Our richest zardozi pieces'],
        ['/occasions', 'Wedding season', 'Looks for the mehndi, sangeet, wedding and reception'],
        ['/appointment', 'Price & video', 'Pick a suit: we reply with the price and a video of it'],
        ['/size-guide', 'Help with fit', 'Send your measurements, we check the size for you'],
        ['/shipping', 'Delivery', `Tracked delivery ${region().deliver}`],
        ['/wishlist', 'Wishlist', 'Save suits, then ask about them together'],
      ] as const).map(([href, a, b]) => `<a href="${href}">${a}<small>${b}</small></a>`).join('')}</nav>
      <div class="menu__small"><b>Shop by category</b>${CATEGORIES.map((c) => `<a href="/shop/${slugify(c)}">${c}s</a>`).join('')}</div>
      <div class="menu__small"><b>Client care</b><a href="/faq">FAQ</a><a href="/contact">Contact</a></div>
      <a class="btn btn--wide" href="/appointment">Ask about a suit</a>
      <div class="menu__region"><span>Deliver to</span>${regionSelect()}</div></div>`),
    h(`<div class="search" role="dialog" aria-label="Search"><div class="search__in">${ICON.search}<input type="search" placeholder="Search sharara, anarkali, colours…" aria-label="Search"><button class="search__x" data-search-close aria-label="Close search">${ICON.close}</button></div><div class="search__res"></div></div>`),
    h(`<div class="scrim"></div>`),
    h(`<aside class="bag" aria-label="Your bag"><div class="bag__head"><span class="h3">Your bag</span><button class="search__x" data-close aria-label="Close bag">${ICON.close}</button></div><div class="bag__list"></div>
      <div class="bag__foot"><div class="bag__total"><span>Subtotal</span><span></span></div><p class="note">Prices are on request for now. Send us your list and we reply with prices, sizes and delivery.</p><a class="btn btn--wide" href="/appointment?from=bag">Send my list</a></div></aside>`),
    h(`<div class="toast" role="status" aria-live="polite"></div>`),
  );
  renderBag(); renderCounts();
  const root = document.documentElement;
  const menuBtn = $('.nav__menu')!;
  const setMenu = (on: boolean) => { root.classList.toggle('menu-open', on); menuBtn.setAttribute('aria-expanded', String(on)); };
  $('.nav__bag')!.addEventListener('click', () => { setMenu(false); openBag(); });
  $('.scrim')!.addEventListener('click', () => { openBag(false); root.classList.remove('search-open'); });
  $('.bag')!.addEventListener('click', (e) => { const t = e.target as HTMLElement; if (t.closest('[data-close]') || t.closest('a')) openBag(false); const rm = t.closest<HTMLElement>('[data-rm]'); if (rm) bag.remove(Number(rm.dataset.rm)); });
  menuBtn.addEventListener('click', () => setMenu(!root.classList.contains('menu-open')));
  $('.menu')!.addEventListener('click', (e) => { if ((e.target as HTMLElement).closest('a')) setMenu(false); });
  addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { root.classList.remove('bag-open', 'search-open'); setMenu(false); }
    if (e.key === '/' && !(e.target as HTMLElement).closest('input,textarea,select')) { e.preventDefault(); openSearch(); }
  });
  // wishlist hearts and newsletter forms anywhere on the page
  document.addEventListener('click', (e) => { const b = (e.target as HTMLElement).closest<HTMLElement>('[data-wish]'); if (b) { e.preventDefault(); toast(wish.toggle(b.dataset.wish!) ? 'Saved to your wishlist' : 'Removed from your wishlist'); } });
  document.addEventListener('submit', (e) => {
    const f = e.target as HTMLFormElement; if (!f.matches('[data-news]')) return; e.preventDefault();
    const v = (f.querySelector('input') as HTMLInputElement).value; store.set('news.v1', [...store.get<string[]>('news.v1', []), v]);
    f.hidden = true; (f.parentElement!.querySelector('[data-news-note]') as HTMLElement).hidden = false;
  });
  // search
  const sIn = $('.search input') as HTMLInputElement, sRes = $('.search__res')!;
  const openSearch = () => { setMenu(false); root.classList.add('search-open'); setTimeout(() => sIn.focus(), 60); runSearch(); };
  const runSearch = () => {
    const hits = sIn.value.trim() ? searchPieces(sIn.value) : CATALOGUE;
    sRes.innerHTML = hits.length ? hits.slice(0, 8).map((p) => `<a class="search__hit" href="/p/${p.slug}">${thumb(p)}<span><b>${p.name}</b><em>${p.category} · ${p.colour}</em><i>${money(p.price)}</i></span></a>`).join('') : `<p class="lede">Nothing for “${sIn.value.replace(/[<>&"]/g, '')}”. Try “velvet”, “red” or “sharara”.</p>`;
  };
  $('[data-search]')!.addEventListener('click', openSearch);
  $('[data-search-close]')!.addEventListener('click', () => root.classList.remove('search-open'));
  sIn.addEventListener('input', runSearch);
  sRes.addEventListener('click', (e) => { if ((e.target as HTMLElement).closest('a')) root.classList.remove('search-open'); });

  // header: always there (like apple.com); turns solid once the page scrolls
  const onScroll = () => { root.classList.toggle('past-top', scrollY > 10); root.classList.toggle('at-top', scrollY < 80); };
  addEventListener('scroll', onScroll, { passive: true }); onScroll();

  // links inside the site change the page without reloading it
  document.addEventListener('click', (e) => {
    const a = (e.target as HTMLElement).closest<HTMLAnchorElement>('a[href]');
    if (!a || e.defaultPrevented || e.button || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || a.target || a.hasAttribute('download')) return;
    const href = a.getAttribute('href')!; if (!href.startsWith('/') || href.startsWith('//')) return;
    e.preventDefault(); navigate(href);
  });
  // Back and Forward return to where you were on the page
  addEventListener('popstate', (e) => go((e.state as { y?: number } | null)?.y || undefined));
  // country and currency: remember it, then redraw prices and delivery wording in place
  document.addEventListener('change', (e) => {
    const sel = e.target as HTMLSelectElement; if (!sel.matches?.('[data-region]')) return;
    setRegion(sel.value); store.set('region.v1', region().id);
    $('.announce')!.innerHTML = announce(); $('.mega')!.outerHTML = mega(); $$<HTMLSelectElement>('[data-region]').forEach((x) => (x.value = region().id));
    renderBag(); go(scrollY);
    toast(isHome() ? 'Prices in New Zealand dollars' : `Prices shown in ${region().cur} as a guide`);
  });

  mountChat();
  return go();
}

export { CATALOGUE, pieceBySlug, money, BRAND, CATEGORIES, OCCASIONS, region, isHome };
