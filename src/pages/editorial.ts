import { $, $$, CATALOGUE, pieceBySlug, card, footer, money, bag, wish, thumb, BRAND, region, isHome, type Page } from '../app';
import { REGIONS } from '../config/brand';

/** Page head: breadcrumb, eyebrow, title, intro; optionally a full-bleed close-up photo (img) or a cut-out figure (fig). */
const head = (crumb: string, kicker: string, title: string, intro = '', img = '', fig = '') => `
  <header class="phead${img ? ' phead--img' : ''}${fig ? ' phead--fig' : ''}">${img ? `<img class="phead__bg" src="${img}" alt="">` : ''}
    <div class="phead__txt">
      <nav class="crumbs" aria-label="Breadcrumb"><a href="/">Home</a><span aria-hidden="true">/</span><span>${crumb}</span></nav>
      ${kicker && kicker !== crumb ? `<span class="eyebrow rv">${kicker}</span>` : ''}
      <h1 class="display h1"><span class="mask"><span>${title}</span></span></h1>
      ${intro ? `<p class="lede rv" style="--i:2">${intro}</p>` : ''}
    </div>
    ${fig ? (() => { const p = pieceBySlug(fig)!; return `<div class="phead__fig" style="--g:${p.glow}" aria-hidden="true"><img src="${p.images.frontCut}" alt=""></div>`; })() : ''}
  </header>`;
const wrap = (inner: string) => `<section class="page" style="padding-top:0">${inner}</section>`;

export function appointment(_a: string, q: URLSearchParams): Page {
  const piece = pieceBySlug(q.get('piece') || '');
  const size = q.get('size') || '';
  const fromBag = q.get('from') === 'bag';
  return {
    title: 'Ask about a suit', glow: '#3a1d36',
    desc: 'Ask us about any suit in the collection: price, sizes, fabric, a video of the suit, or delivery to your country.',
    html: head('Ask about a suit', 'We reply personally', piece ? `Ask about the ${piece.name.toLowerCase()}` : 'Ask about a suit', 'Prices are on request while the online shop is being set up. Tell us which suit you like and we reply with the price, sizes, a video of the suit if you want one, and delivery to your country.', '', piece?.slug ?? 'wine-velvet-zardozi')
      + wrap(`<div class="page__cols">
        <div class="rv" style="display:grid;gap:18px">
          <h2 class="h3" style="color:var(--ivory)">What we send you</h2>
          <dl class="facts"><dt>Price</dt><dd>For the suit, in your currency</dd><dt>Size</dt><dd>What fits you, from your usual size or your measurements</dd><dt>Video</dt><dd>A short video of the actual suit, if you would like one</dd><dt>Delivery</dt><dd>How long it takes to reach you ${region().deliver}</dd></dl>
          <p class="note">Messages are kept on this device until the shop opens — nobody will reply yet.</p>
        </div>
        <form class="form rv" style="--i:1" data-appt>
          <label>Suit you are interested in<select><option value="">Not sure yet</option>${CATALOGUE.map((p) => `<option ${piece === p ? 'selected' : ''}>${p.name}</option>`).join('')}</select></label>
          ${fromBag && bag.lines.length ? `<p class="note">Your list: ${bag.lines.map((l) => pieceBySlug(l.slug)?.name).filter(Boolean).join(', ')}</p>` : ''}
          <div class="row2"><label>Name<input required autocomplete="name"></label><label>Email<input type="email" required autocomplete="email"></label></div>
          <div class="row2"><label>Your usual size<select><option value="">Not sure</option>${['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL'].map((x) => `<option${x === size ? ' selected' : ''}>${x}</option>`).join('')}</select></label><label>Where are you?<select autocomplete="country-name">${REGIONS.map((r) => `<option${r === region() ? ' selected' : ''}>${r.name}</option>`).join('')}</select></label></div>
          <label>Event date (if any)<input type="date"></label>
          <label>Anything else<textarea rows="4" placeholder="Colour, fabric, a video of the suit…"></textarea></label>
          <button class="btn">Send</button>
          <p class="note" data-done hidden>Thank you — your message is saved. When the shop opens, we will reply by email.</p>
        </form></div>`) + footer(),
    mount(root) { $('[data-appt]', root)!.addEventListener('submit', (e) => { e.preventDefault(); $('[data-done]', root)!.hidden = false; ($('[data-appt] button', root) as HTMLButtonElement).disabled = true; }); },
  };
}

export function sizeGuide(): Page {
  const rows = [['XS', 81, 66, 89, 4], ['S', 86, 71, 94, 6], ['M', 91, 76, 99, 8], ['L', 97, 82, 105, 10], ['XL', 104, 89, 112, 12], ['2XL', 112, 97, 120, 14], ['3XL', 120, 105, 128, 16]];
  return {
    title: 'Size guide', glow: '#2c2440',
    desc: 'Sizes XS to 3XL in centimetres, and help with fit before you order.',
    html: head('Size guide', 'Size & fit', 'Size guide', 'A guide to our sizes. If you are between sizes, send us your measurements and we will check the fit with you before you order.')
      + wrap(`<div class="page__cols"><div class="rv"><table class="sz"><thead><tr><th>Size</th><th>NZ / AU</th><th>Bust (cm)</th><th>Waist (cm)</th><th>Hip (cm)</th></tr></thead><tbody>${rows.map((r) => `<tr><td>${r[0]}</td><td>${r[4]}</td><td>${r[1]}</td><td>${r[2]}</td><td>${r[3]}</td></tr>`).join('')}</tbody></table><p class="note" style="margin-top:20px">Draft chart; the final chart will be confirmed with the owner.</p></div>
        <div class="rv" style="--i:1;display:grid;gap:14px"><h2 class="h3" style="color:var(--ivory)">Between sizes?</h2><p>Measure your bust, waist and hip with a soft tape and send them to us with the suit you like. We will tell you which size to choose.</p><p><a class="btn btn--ghost" href="/appointment">Ask about fit</a></p></div></div>`) + footer(),
  };
}

export function shipping(): Page {
  return {
    title: 'Shipping & returns', glow: '#2c2440',
    desc: 'Tracked delivery across New Zealand, Australia and worldwide. Ask us for the delivery time for any suit.',
    html: head('Shipping & returns', 'Client care', 'Shipping &amp; returns') + `<article class="article">
      <p class="note">Draft policy — the owner will confirm final terms before the shop opens.</p>
      <h2>Delivery</h2><p>We send every order by tracked courier across New Zealand, Australia and to most other countries. Delivery time depends on the suit and where you are; ask us and we will tell you before you order.</p>
      <h2>Returns</h2><p>If something is wrong with your suit, contact us and we will make it right. In New Zealand, your rights under the Consumer Guarantees Act 1993 are not affected; elsewhere, your local consumer rights apply.</p>
      <h2>Outside New Zealand</h2><p>Your country may charge import duty or tax when the parcel arrives. That charge is set by your customs office, not by us, and we will tell you what to expect before you order.</p></article>` + footer(),
  };
}

export function faq(): Page {
  const Q: [string, string][] = [
    ['How much are the suits?', 'Prices are on request while the online shop is being set up. Send us a message about any suit and we reply with the price.'],
    ['Are these real suits?', 'Yes. Every suit on the site is a real suit from our collection, shown on our house model so the whole collection looks consistent. Ask us and we will send photos or a video of the actual suit.'],
    ['Which size should I choose?', 'Your usual size from XS to 3XL. If you are between sizes, send us your bust, waist and hip and we will tell you which to choose.'],
    ['Where do you deliver?', 'Across New Zealand and Australia, and to most other countries, by tracked courier. Outside New Zealand, your country may charge import duty or tax when the parcel arrives.'],
    ['How long does delivery take?', 'It depends on the suit and where you are. Ask us before you order and we will tell you honestly whether it can reach you in time for your event.'],
    ['Can I see a suit in person?', 'Not yet. We can send you a video of any suit.'],
    ['How do I pay?', 'Online payment isn’t open yet. Send us a message about the suits you like and we will reply with prices and how to order.'],
  ];
  return { title: 'Questions, answered', glow: '#2c2440', desc: 'Prices, sizes, delivery and how to order: the questions we are asked most.',
    ld: { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: Q.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) }, html: head('FAQ', 'Client care', 'Questions, answered') + wrap(`<div class="faq rv">${Q.map(([q, a]) => `<details><summary>${q}</summary><p>${a}</p></details>`).join('')}</div>`) + footer() };
}

export function contact(): Page {
  return {
    title: 'Contact', glow: '#2c2440',
    desc: 'Ask about a suit or leave a message. Based in New Zealand, delivering worldwide.',
    html: head('Contact', 'Client care', 'Get in touch', 'Ask about any suit, or leave a message.')
      + wrap(`<div class="page__cols"><div class="rv" style="display:grid;gap:12px"><dl class="facts"><dt>Based in</dt><dd>${BRAND.address ?? 'New Zealand'}</dd><dt>Email</dt><dd>${BRAND.email ?? 'Coming soon'}</dd></dl><p><a class="btn" href="/appointment">Ask about a suit</a></p></div>
      <form class="form rv" style="--i:1" data-contact><div class="row2"><label>Name<input required></label><label>Email<input type="email" required></label></div><label>Message<textarea rows="5" required></textarea></label><button class="btn">Send message</button><p class="note" data-done hidden>Thank you — messages are saved on this device until the shop opens; nobody will reply yet.</p></form></div>`) + footer(),
    mount(root) { $('[data-contact]', root)!.addEventListener('submit', (e) => { e.preventDefault(); $('[data-done]', root)!.hidden = false; }); },
  };
}

export function wishlist(): Page {
  const list = CATALOGUE.filter((p) => wish.has(p.slug));
  return { title: 'Wishlist', glow: '#2e1730', noindex: true, html: head('Wishlist', 'Saved for later', 'Your wishlist') + wrap(list.length ? `<div class="pgrid">${list.map((p, i) => card(p, i)).join('')}</div>` : `<p class="lede">Nothing saved yet. Tap the heart on any piece to keep it here.</p><p><a class="btn" href="/shop">Explore the collection</a></p>`) + footer() };
}

export function checkout(): Page {
  const lines = bag.lines;
  return {
    title: 'Your list', glow: '#2c2440', noindex: true,
    html: head('Your list', 'Saved suits', 'Your list') + wrap(`<div class="page__cols"><div class="rv">${lines.length ? lines.map((l) => { const p = pieceBySlug(l.slug)!; return `<div class="bag__item">${thumb(p)}<div><div class="bag__name">${p.name}</div><div class="bag__kind">${p.category} · Size ${l.size} · Qty ${l.qty}</div></div><div class="bag__price">${money(p.price == null ? null : p.price * l.qty)}</div></div>`; }).join('') : '<p>Your bag is empty.</p>'}</div>
      <div class="rv" style="--i:1"><p class="note">Online payment isn’t switched on yet and prices are on request. Send us your list and we reply with prices, sizes and delivery.</p><p style="margin-top:22px"><a class="btn" href="/appointment?from=bag">Send my list</a> <a class="btn btn--ghost" href="/shop">Keep looking</a></p></div></div>`) + footer(),
  };
}

export function notFound(): Page {
  return { title: 'Not found', noindex: true, html: `<section class="phead"><h1 class="display h2"><span class="mask"><span>Nothing on this hanger</span></span></h1><p><a class="btn" href="/">Back home</a></p></section>` + footer() };
}

export { $$ };
