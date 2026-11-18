// The concierge chat. It answers on its own, straight away, from what the site knows: the suits in the
// collection (names, colours, occasions, work) and the client-care policies. Prices are on request for now. Questions it
// can't answer go to a stylist (appointment / contact). Nothing leaves the visitor's device.
//
// To let a real AI model answer anything at all, set BRAND.chatEndpoint to a small server that holds
// the API key (never put a key in this website) and replies { reply: string } to
// POST { messages: [{ role: 'user' | 'assistant', content: string }] }. The built-in answers stay as
// the fallback if that server is slow or down.
import { BRAND, money, region, isHome } from './config/brand';
import { CATALOGUE, type Piece, type Occasion, type Category } from './data/catalogue';

interface Reply { text: string; cards?: Piece[]; links?: [string, string][]; chips?: string[] }
type Msg = { role: 'user' | 'assistant'; content: string };

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
const norm = (s: string) => ' ' + s.toLowerCase().replace(/(\d),(\d)/g, '$1$2').replace(/[’']/g, '').replace(/[^a-z0-9$.\s]/g, ' ').replace(/\s+/g, ' ').trim() + ' ';
const has = (t: string, w: string) => t.includes(' ' + w + ' ') || (w.includes(' ') && t.includes(w));
const anyOf = (t: string, ws: string[]) => ws.filter((w) => has(t, w)).length;
const slug = (s: string) => s.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const list = (xs: string[]) => xs.length < 2 ? xs.join('') : xs.slice(0, -1).join(', ') + ' and ' + xs[xs.length - 1];
const priced = () => CATALOGUE.filter((p) => p.price != null) as (Piece & { price: number })[];
const range = () => { const ps = priced().map((p) => p.price); return ps.length ? [Math.min(...ps), Math.max(...ps)] : [0, 0]; };

// ───────── what people ask about ─────────
const TOPICS: Record<string, string[]> = {
  greet: ['hi', 'hello', 'hey', 'hiya', 'kia ora', 'namaste', 'sat sri akal', 'good morning', 'good afternoon', 'good evening'],
  thanks: ['thanks', 'thank you', 'thankyou', 'cheers', 'ty', 'awesome', 'perfect', 'great thanks', 'bye', 'goodbye'],
  delivery: ['deliver', 'delivery', 'delivered', 'shipping', 'ship', 'ships', 'courier', 'post', 'postage', 'dispatch', 'arrive', 'track', 'tracking', 'freight'],
  time: ['how long', 'lead time', 'when will', 'how soon', 'soon', 'weeks', 'ready by', 'in time', 'timeline', 'urgent', 'rush', 'quickly', 'fast', 'turnaround', 'days', 'deadline'],
  abroad: ['australia', 'overseas', 'international', 'internationally', 'abroad', 'uk', 'usa', 'canada', 'fiji', 'outside nz', 'outside new zealand', 'worldwide', 'sydney', 'melbourne', 'brisbane', 'perth', 'adelaide', 'london', 'england', 'america', 'united states', 'toronto', 'vancouver', 'singapore', 'dubai', 'india', 'currency', 'aud', 'usd', 'gbp', 'cad', 'duty', 'duties', 'customs', 'import tax'],
  returns: ['return', 'returns', 'refund', 'refunds', 'exchange', 'cancel', 'cancellation', 'money back', 'doesnt fit', 'does not fit', 'alteration', 'alterations', 'alter', 'too big', 'too small', 'faulty', 'damaged'],
  size: ['size', 'sizes', 'sizing', 'fit', 'fitting', 'measure', 'measurement', 'measurements', 'plus size', 'petite', 'tall', 'chart', 'xs', 'xl', '2xl', '3xl', 'bust', 'waist', 'hip'],
  appt: ['appointment', 'book', 'booking', 'consult', 'consultation', 'stylist', 'styling', 'video call', 'zoom', 'facetime', 'try on', 'trial', 'in person', 'showroom', 'your store', 'a store', 'physical store', 'shop near', 'boutique', 'visit', 'see it', 'see them'],
  custom: ['custom', 'customise', 'customize', 'customised', 'customized', 'personalise', 'personalize', 'bespoke', 'neckline', 'sleeve', 'sleeves', 'sleeveless', 'different colour', 'different color', 'another colour', 'another color', 'change the colour', 'change the color', 'own design', 'my design', 'modify', 'adjust', 'longer', 'shorter'],
  care: ['care', 'wash', 'washing', 'clean', 'cleaning', 'dry clean', 'dryclean', 'iron', 'ironing', 'steam', 'store', 'storage', 'stain', 'look after'],
  pay: ['pay', 'payment', 'payments', 'card', 'credit card', 'debit', 'visa', 'mastercard', 'amex', 'american express', 'apple pay', 'afterpay', 'laybuy', 'layby', 'instalment', 'instalments', 'installment', 'installments', 'deposit', 'bank transfer', 'cash', 'checkout', 'order'],
  craft: ['zardozi', 'gota', 'gota patti', 'mirror', 'mirror work', 'kundan', 'dabka', 'aari', 'tilla', 'phulkari', 'sequin', 'sequins', 'cutdana', 'embroidery', 'embroidered', 'handmade', 'hand made', 'handwork', 'hand work', 'craft', 'handcrafted'],
  fabric: ['fabric', 'material', 'velvet', 'silk', 'raw silk', 'georgette', 'organza', 'net', 'tulle', 'tissue', 'cotton', 'chiffon', 'heavy', 'weight', 'breathable', 'comfortable', 'warm', 'itchy'],
  contact: ['contact', 'email', 'phone', 'number', 'whatsapp', 'instagram', 'insta', 'address', 'where are you', 'located', 'location', 'based', 'where is your'],
  photos: ['real photo', 'real photos', 'actual photo', 'actual photos', 'photos real', 'photo real', 'pictures real', 'images real', 'real pictures', 'real images', 'photoshop', 'photoshopped', 'ai', 'is the model real', 'model real', 'is she real', 'real model', 'generated', 'look like in real'],
  human: ['human', 'real person', 'someone', 'talk to', 'speak to', 'agent', 'owner', 'staff', 'call me', 'ring me'],
  price: ['price', 'prices', 'cost', 'costs', 'how much', 'expensive', 'cheap', 'cheapest', 'affordable', 'budget', 'range', 'priced', 'dollars', 'nzd', '$'],
  recommend: ['recommend', 'suggest', 'suggestion', 'what should i wear', 'what to wear', 'looking for', 'need', 'want', 'show me', 'ideas', 'options', 'something for', 'best', 'choose', 'help me choose', 'help us choose', 'decide', 'which one', 'confused'],
};

const CAT_WORDS: [Category, string[]][] = [
  ['Anarkali', ['anarkali', 'anarkalis', 'gown', 'gowns', 'frock']],
  ['Lehenga', ['lehenga', 'lehengas', 'lengha', 'lehnga', 'lahenga', 'ghagra', 'skirt']],
  ['Drape set', ['saree', 'sari', 'sarees', 'saris', 'drape', 'pre draped', 'predraped', 'drape saree']],
  ['Sharara set', ['sharara', 'shararas', 'gharara', 'ghararas']],
  ['Farshi suit', ['farshi', 'farshis', 'patiala', 'patialas', 'salwar', 'shalwar', 'punjabi suit']],
  ['Straight suit', ['suit', 'suits', 'salwar kameez', 'straight suit', 'pant suit']],
  ['Long kurta set', ['kurta', 'kurtas', 'kurti', 'kurtis', 'phiran', 'phirans', 'long kurta']],
  ['Co-ord set', ['co ord', 'coord', 'co-ord', 'indo western', 'crop top', 'palazzo']],
];
const OCC_WORDS: [Occasion, string[]][] = [
  ['Reception', ['reception', 'cocktail', 'engagement', 'roka', 'ring ceremony', 'evening party']],
  ['Sangeet', ['sangeet', 'sangit', 'dance', 'dancing', 'ladies sangeet', 'jaago']],
  ['Mehndi', ['mehndi', 'mehendi', 'henna', 'haldi', 'maiyan']],
  ['Wedding guest', ['guest', 'wedding guest', 'attending a wedding', 'friends wedding', 'cousins wedding', 'sisters wedding', 'brothers wedding', 'wedding', 'shaadi', 'anand karaj']],
  ['Diwali & Eid', ['diwali', 'eid', 'deepavali', 'karva chauth', 'karwa chauth', 'teej', 'navratri', 'garba', 'gurpurab']],
  ['Festive', ['festive', 'festival', 'party', 'celebration', 'puja', 'pooja', 'function', 'birthday', 'lohri']],
];
const COLOURS: [string, RegExp, string[]][] = [
  ['red', /red|wine|maroon/i, ['red', 'reds', 'crimson', 'scarlet', 'maroon', 'burgundy', 'bordeaux', 'wine', 'ruby']],
  ['pink', /pink|magenta|blush/i, ['pink', 'fuchsia', 'magenta', 'rani pink', 'hot pink', 'blush', 'rose']],
  ['blue', /blue|navy|lavender/i, ['blue', 'navy', 'sapphire', 'royal blue', 'cobalt']],
  ['green', /green|emerald|olive|teal|lime/i, ['green', 'emerald', 'bottle green', 'olive', 'mint']],
  ['teal', /teal/i, ['teal', 'turquoise', 'peacock', 'aqua', 'firozi']],
  ['gold', /gold/i, ['gold', 'golden', 'champagne', 'beige', 'cream', 'ivory', 'off white', 'white']],
  ['yellow', /mustard|orange|rust/i, ['yellow', 'orange', 'marigold', 'saffron', 'mustard', 'haldi yellow', 'kesari']],
  ['black', /black/i, ['black', 'charcoal', 'midnight']],
  ['purple', /purple|lavender|wine/i, ['purple', 'plum', 'violet', 'lavender', 'mauve', 'aubergine']],
];

function entities(t: string) {
  const names = CATALOGUE.filter((p) => has(t, p.name.toLowerCase()));
  const cats = CAT_WORDS.filter(([, ws]) => anyOf(t, ws)).map(([c]) => c);
  const occs = OCC_WORDS.filter(([, ws]) => anyOf(t, ws)).map(([o]) => o);
  const cols = COLOURS.filter(([, , ws]) => anyOf(t, ws));
  const m = t.match(/(?:under|below|less than|max|maximum|up to|upto|within|budget(?: is| of)?|around|about|spend)\s*(?:nz)?\$?\s*(\d[\d,.]*)\s*(k)?\b/) ?? t.match(/\$\s*(\d[\d,.]*)\s*(k)?\b/);
  let budget = m ? parseFloat(m[1].replace(/,/g, '')) * (m[2] ? 1000 : 1) : 0;
  if (budget < 100) budget = 0;
  budget = Math.round(budget / region().rate);   // typed in the visitor's currency; prices are kept in NZD
  return { names, cats, occs, cols, budget };
}

/** Site search: understands colours, categories, occasions, budgets and names the same way the concierge does. */
export function searchPieces(q: string): Piece[] {
  const t = norm(q); const e = entities(t);
  let list = e.names.length ? e.names : CATALOGUE.filter((p) => (!e.cats.length || e.cats.includes(p.category)) && (!e.occs.length || p.occasions.some((o) => e.occs.includes(o)))
    && (!e.cols.length || e.cols.some(([, re]) => re.test(p.colour))));
  const known = new Set([...CAT_WORDS.flatMap(([, ws]) => ws), ...OCC_WORDS.flatMap(([, ws]) => ws), ...COLOURS.flatMap(([, , ws]) => ws), ...CATALOGUE.map((p) => p.name.toLowerCase()),
    'under', 'below', 'less', 'than', 'for', 'the', 'a', 'an', 'and', 'or', 'in', 'with', 'my', 'nz', 'dress', 'dresses', 'outfit', 'outfits', 'piece', 'pieces', 'set', 'sets']);
  const rest = t.trim().split(' ').filter((w) => w && !known.has(w) && !/^\$?\d/.test(w));
  list = list.filter((p) => { const hay = [p.name, p.category, p.colour, p.fabric ?? '', ...p.craft, ...p.occasions, p.story].join(' ').toLowerCase(); return rest.every((w) => hay.includes(w.replace(/s$/, ''))); });
  return list;
}

const pieceLine = (p: Piece) => `<b>${p.name}</b> — ${p.category.toLowerCase()} in ${p.colour.toLowerCase()}${p.price == null ? '' : `, ${money(p.price)}`}`;
const shopLink = (e: ReturnType<typeof entities>): [string, string] => {
  if (e.occs.length === 1 && !e.cats.length) return [`All ${e.occs[0].toLowerCase()} pieces`, `/occasion/${slug(e.occs[0])}`];
  if (e.cats.length === 1) return [`All ${e.cats[0].toLowerCase()}s`, `/shop/${slug(e.cats[0])}`];
  return ['Browse the collection', '/shop'];
};
const STYLIST: [string, string] = ['Send us a message', '/appointment'];

function recommend(e: ReturnType<typeof entities>): Reply {
  const fits = (p: Piece, useCol: boolean, useOcc: boolean, useCat: boolean) =>
    (!useCat || !e.cats.length || e.cats.includes(p.category)) && (!useOcc || !e.occs.length || p.occasions.some((o) => e.occs.includes(o)))
    && (!useCol || !e.cols.length || e.cols.some(([, re]) => re.test(p.colour)));
  let picks = CATALOGUE.filter((p) => fits(p, true, true, true)), close = false;
  for (const [c, o, k] of [[false, true, true], [false, false, true], [false, false, false]] as const) { if (picks.length) break; picks = CATALOGUE.filter((p) => fits(p, c, o, k)); close = true; }
  const what = [e.cols.map(([n]) => n).join(' or '), e.cats.length ? list(e.cats.map((c) => c.toLowerCase() + 's')) : 'pieces', e.occs.length ? 'for ' + list(e.occs.map((o) => ({ 'Wedding guest': 'a wedding guest', 'Diwali & Eid': 'Diwali or Eid', Festive: 'festivals' } as Record<string, string>)[o] ?? 'the ' + o.toLowerCase())) : ''].filter(Boolean).join(' ');
  if (!picks.length) return { text: 'Nothing in the collection is quite like that yet. Send us a message and we will suggest the closest match.', links: [STYLIST, ['Browse the collection', '/shop']] };
  picks = [...picks].sort((a, b) => Number(!!b.badge) - Number(!!a.badge));
  return {
    text: close ? `Nothing matches all of that exactly yet${what ? ` (${what})` : ''}. These are the closest:` : `Here’s what I’d suggest${what ? ` — ${what}` : ''}:`,
    cards: picks.slice(0, 4), links: [shopLink(e)], chips: ['How does sizing work?', 'How much is it?', 'Do you deliver overseas?'],
  };
}

function aboutPiece(p: Piece, topic: string): Reply {
  const link: [string, string] = [`See the ${p.name.toLowerCase()}`, `/p/${p.slug}`];
  const ask: [string, string] = [`Ask about this suit`, `/appointment?piece=${p.slug}`];
  switch (topic) {
    case 'time': case 'delivery': return { text: `We send it by tracked courier ${region().deliver}. Ask us for the delivery time for the ${p.name.toLowerCase()} and we will check it for you.`, links: [ask, link] };
    case 'price': return { text: p.price == null ? `Prices are on request while the online shop is being set up. Send us a message about the ${p.name.toLowerCase()} and we will reply with the price, sizes and delivery.` : `The ${p.name.toLowerCase()} is ${money(p.price)}. It includes: ${p.includes.toLowerCase()}.`, links: [ask], cards: [p] };
    case 'fabric': case 'craft': return { text: `${p.name}: ${p.fabric ? p.fabric.toLowerCase() + ', ' : ''}${p.craft.length ? `with ${list(p.craft.map((c) => c.toLowerCase()))}. ` : ''}${p.story}`, links: [link, ask] };
    case 'care': return { text: `${p.name}: ${p.care}`, links: [link] };
    case 'custom': return { text: `Tell us what you have in mind for the ${p.name.toLowerCase()} and we will tell you what is possible.`, links: [ask, link] };
    case 'size': return { text: `Choose your usual size from XS to 3XL, or send us your measurements and we will check the fit with you before you order.`, links: [ask, ['Size guide', '/size-guide']] };
    default: return { text: `${pieceLine(p)}. ${p.story} Includes ${p.includes.toLowerCase()}.`, cards: [p], chips: ['How much is it?', 'How does sizing work?', 'Do you deliver overseas?'] };
  }
}

const ANSWERS: Record<string, () => Reply> = {
  greet: () => ({ text: `Kia ora! I’m the ${BRAND.name} concierge. Ask me about our suits, sizes, delivery or prices — I’ll answer straight away.`, chips: ['Something for a sangeet', 'Wedding guest outfits', 'How does sizing work?', 'Do you deliver overseas?'] }),
  thanks: () => ({ text: 'My pleasure. If you’d like a second opinion on colour or fit, send us a message.', links: [STYLIST] }),
  delivery: () => ({ text: `We send every order by tracked courier ${region().deliver}. Delivery time depends on the suit, so ask us and we will check it for you.`, links: [['Shipping & returns', '/shipping'], STYLIST], chips: ['I need it for a wedding soon', 'Do you deliver overseas?'] }),
  time: () => ({ text: 'It depends on the suit. Tell us the suit and your date and we will tell you honestly whether it can reach you in time.', links: [STYLIST, ['Shipping & returns', '/shipping']] }),
  abroad: () => ({ text: 'Yes. We deliver across New Zealand and Australia, and to most other countries, by tracked courier. Your country may charge import duty or tax on arrival, and we’ll tell you what to expect before you order.', links: [['Shipping & returns', '/shipping'], STYLIST] }),
  returns: () => ({ text: 'Your consumer rights always apply. Our full returns policy is on the shipping & returns page (it is still a draft while the shop is being set up).', links: [['Shipping & returns', '/shipping']] }),
  size: () => ({ text: 'Choose your usual size from XS to 3XL, or send us your measurements and we will check the fit with you before you order.', links: [['Size guide', '/size-guide'], STYLIST] }),
  appt: () => ({ text: 'Send us a message about any suit and we will reply with photos or a video, sizes and delivery. We don’t have a showroom yet.', links: [STYLIST] }),
  custom: () => ({ text: 'Tell us what you have in mind and we will tell you what is possible for that suit.', links: [STYLIST] }),
  care: () => ({ text: 'Dry clean embroidered suits. Store them folded in a cotton or muslin bag (never plastic), away from damp, and steam rather than iron, never pressing directly on the embroidery.', links: [['Browse the collection', '/shop']] }),
  pay: () => ({ text: `${/afterpay|laybuy|layby|instal|install/.test(lastQ) ? 'We don’t offer Afterpay or other pay-later plans. ' : ''}Online payment isn’t open yet. For now, send us a message about the suits you like and we will reply with prices and how to order.`, links: [STYLIST, ['Browse the collection', '/shop']] }),
  craft: () => ({ text: 'Our suits use zardozi (raised metal thread), gota and gota patti (gold ribbon work), mirror work, sequins and printed borders. Each suit lists its work.', links: [['Heavy work', '/shop?edit=heavy'], ['Gota and mirror work', '/shop?edit=gota']] }),
  fabric: () => ({ text: 'The collection includes velvet, tissue, satin and silk-finish suits. Each suit lists its fabric where we know it; for the rest, ask us and we will check.', links: [['Browse the collection', '/shop'], STYLIST] }),
  contact: () => ({ text: `We’re based in New Zealand. The quickest way to reach us is the message form.${BRAND.email ? ` Or email ${BRAND.email}.` : ''}`, links: [STYLIST, ['Contact', '/contact']] }),
  photos: () => ({ text: 'Every suit on the site is a real suit from our collection, shown on our house model so the whole collection looks consistent. Ask us and we will send you photos or a video of the actual suit.', links: [STYLIST] }),
  human: () => ({ text: 'Of course. Leave a message and we’ll come back to you.', links: [STYLIST, ['Contact', '/contact']] }),
  price: () => { const [lo, hi] = range(); return lo ? { text: `Suits run from ${money(lo)} to ${money(hi)}.`, links: [['Browse the collection', '/shop']] } : { text: 'Prices are on request while the online shop is being set up. Send us a message with the suits you like and we will reply with prices, sizes and delivery.', links: [STYLIST, ['Browse the collection', '/shop']] }; },
};

const FALLBACK = (): Reply => ({ text: 'I’m not sure about that one, and I’d rather not guess. Send us a message and we will answer it properly.', links: [STYLIST, ['Contact', '/contact']], chips: ['Something for a sangeet', 'How does sizing work?', 'Do you deliver overseas?'] });

/** The built-in concierge: pick the strongest topic, then use any pieces, categories, occasions, colours or budget mentioned. */
let lastQ = '';
export function answer(q: string): Reply {
  const t = norm(q); lastQ = t; if (t.trim().length === 0) return ANSWERS.greet();
  const e = entities(t);
  const WEIGHT: Record<string, number> = { abroad: 3, returns: 1.5, photos: 2, human: 1.5, recommend: 0.5 };   // specific beats general
  const score: [string, number][] = Object.entries(TOPICS).map(([k, ws]) => [k, anyOf(t, ws) * (WEIGHT[k] ?? 1)] as [string, number]).filter(([, n]) => n > 0).sort((a, b) => b[1] - a[1]);
  const top = score[0]?.[0] ?? '';
  const topics = new Set(score.map(([k]) => k));
  const filtered = e.cats.length || e.occs.length || e.cols.length || e.budget;
  if (e.names.length === 1) { const k = ['time', 'delivery', 'price', 'fabric', 'craft', 'care', 'custom', 'size'].find((x) => topics.has(x)) ?? ''; return aboutPiece(e.names[0], k); }
  if (e.names.length > 1) return { text: `Here they are side by side: ${e.names.map(pieceLine).join('; ')}.`, cards: e.names.slice(0, 4) };
  if (filtered && !['returns', 'care', 'pay', 'contact', 'photos', 'abroad'].includes(top)) {
    const r = recommend(e);
    return r;
  }
  if (top === 'greet' && score.length > 1) return ANSWERS[score[1][0]]?.() ?? ANSWERS.greet();
  if (top === 'recommend') return { text: 'Happy to help you choose. What’s the occasion, and do you have a colour or budget in mind? For example: “a red sharara for my sangeet”.', chips: ['Something for a sangeet', 'Wedding guest outfits', 'Heavy work', 'Something in blue'] };
  return top && ANSWERS[top] ? ANSWERS[top]() : FALLBACK();
}

// ───────── the chat window ─────────
const icon = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 5.5h16v10.5H9.5L5.2 19.6V16H4z"/><path d="M8 9.5h8M8 12.5h5"/></svg>`;
const x = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>`;
const send = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>`;

export function mountChat() {
  const wrap = document.createElement('div'); wrap.className = 'chatbox';
  wrap.innerHTML = `
    <button class="chat__fab" aria-label="Ask us a question" aria-expanded="false" aria-controls="chat">${icon}<span>Ask us</span></button>
    <section class="chat" id="chat" role="dialog" aria-label="${BRAND.name} concierge" hidden>
      <header class="chat__head"><span class="chat__av">${BRAND.name[0]}</span><div><b>${BRAND.name} concierge</b><small>Instant answers, any time</small></div><button class="chat__x" aria-label="Close chat">${x}</button></header>
      <div class="chat__log" aria-live="polite"></div>
      <div class="chat__chips"></div>
      <form class="chat__form"><input type="text" placeholder="Ask about sizes, delivery, colours…" aria-label="Your question" maxlength="300" autocomplete="off" enterkeyhint="send"><button aria-label="Send">${send}</button></form>
    </section>`;
  document.body.append(wrap);
  const fab = wrap.querySelector<HTMLButtonElement>('.chat__fab')!, box = wrap.querySelector<HTMLElement>('.chat')!, log = wrap.querySelector<HTMLElement>('.chat__log')!;
  const chips = wrap.querySelector<HTMLElement>('.chat__chips')!, form = wrap.querySelector<HTMLFormElement>('.chat__form')!, input = form.querySelector('input')!;
  const history: Msg[] = []; let started = false, busy = false;

  const scroll = () => { log.scrollTop = log.scrollHeight; };
  const say = (who: 'me' | 'bot', html: string) => { const el = document.createElement('div'); el.className = `msg msg--${who}`; el.innerHTML = html; log.append(el); scroll(); return el; };
  const render = (r: Reply) => {
    const cards = r.cards?.length ? `<div class="msg__cards">${r.cards.map((p) => `<a class="mcard" href="/p/${p.slug}"><span class="thumb" style="--g:${p.glow}"><img src="${p.images.frontCut}" alt="" loading="lazy"></span><span><b>${p.name}</b><em>${p.category} · ${p.colour}</em><i>${money(p.price)}</i></span></a>`).join('')}</div>` : '';
    const links = r.links?.length ? `<div class="msg__links">${r.links.map(([l, href]) => `<a href="${href}">${esc(l)} ›</a>`).join('')}</div>` : '';
    say('bot', `<p>${r.text}</p>${cards}${links}`);
    chips.innerHTML = (r.chips ?? []).map((c) => `<button type="button">${esc(c)}</button>`).join('');
  };
  const typing = () => say('bot', '<span class="dots" aria-label="Typing"><i></i><i></i><i></i></span>');

  async function ask(q: string) {
    if (busy) return; busy = true; chips.innerHTML = '';
    say('me', esc(q)); history.push({ role: 'user', content: q });
    const dots = typing(); const t0 = performance.now();
    let r: Reply | null = null;
    if (BRAND.chatEndpoint) {
      try {
        const ctl = new AbortController(); const tm = setTimeout(() => ctl.abort(), 12000);
        const res = await fetch(BRAND.chatEndpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages: history.slice(-12) }), signal: ctl.signal });
        clearTimeout(tm); const data = await res.json(); if (res.ok && typeof data.reply === 'string') r = { text: esc(data.reply).replace(/\n/g, '<br>') };
      } catch { /* fall back to the built-in answers */ }
    }
    r ??= answer(q);
    await new Promise((res) => setTimeout(res, Math.max(0, 450 + Math.min(500, r!.text.length * 2) - (performance.now() - t0))));
    dots.remove(); render(r); history.push({ role: 'assistant', content: r.text.replace(/<[^>]+>/g, '') }); busy = false;
  }

  const open = (on: boolean) => {
    box.hidden = !on; fab.setAttribute('aria-expanded', String(on)); document.documentElement.classList.toggle('chat-open', on);
    if (on) { if (!started) { started = true; render(ANSWERS.greet()); } setTimeout(() => input.focus({ preventScroll: true }), 60); } else fab.focus({ preventScroll: true });
  };
  fab.addEventListener('click', () => open(fab.getAttribute('aria-expanded') !== 'true'));
  wrap.querySelector('.chat__x')!.addEventListener('click', () => open(false));
  form.addEventListener('submit', (e) => { e.preventDefault(); const q = input.value.trim(); if (!q) return; input.value = ''; ask(q); });
  chips.addEventListener('click', (e) => { const b = (e.target as HTMLElement).closest('button'); if (b) ask(b.textContent!); });
  log.addEventListener('click', (e) => { if ((e.target as HTMLElement).closest('a') && matchMedia('(max-width: 640px)').matches) open(false); });
  addEventListener('keydown', (e) => { if (e.key === 'Escape' && fab.getAttribute('aria-expanded') === 'true') open(false); });
  // anything on the site can open the chat: <button data-chat>
  document.addEventListener('click', (e) => { if ((e.target as HTMLElement).closest('[data-chat]')) { e.preventDefault(); open(true); } });
}

