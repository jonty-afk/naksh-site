// Everything the owner will change later lives here. `null` = not known yet: the site hides it.
export const BRAND = {
  name: 'Naksh by Mili',           // chosen by the owner 17 Nov 2026 ("naksh" = an embroidered motif; Mili = owner's wife). Not yet checked for trademarks.
  /** the two parts of the name, for the logo: the word, and the line after it */
  word: 'Naksh', by: 'by Mili',
  isPlaceholderName: false,
  tagline: 'Festive Indian suits',
  country: 'New Zealand',
  currency: 'NZD',
  /** The live address of the site, e.g. 'https://www.example.co.nz' (no slash at the end). Search engines, the
   *  sitemap and share previews need it. null = not online yet (the build then leaves those parts out). */
  siteUrl: 'https://naksh.co.nz' as string | null,
  email: null as string | null,
  phone: null as string | null,
  whatsapp: null as string | null,
  instagram: null as string | null,
  address: null as string | null,
  sampleNote: 'Prices are on request while the online shop is being set up.',
  /** A server that answers chat questions with a real AI model (see src/chat.ts). null = the built-in answers only. */
  chatEndpoint: null as string | null,
};

// ───────── where we deliver, and the currency prices are shown in ─────────
// Prices are set in NZD. Other currencies are a guide only (orders are charged in NZD), worked out with the
// `rate` below: ROUGH FIGURES, set them to the real rates before the shop opens and refresh them now and then.
export interface Region { id: string; name: string; cur: string; sym: string; rate: number; deliver: string }
export const REGIONS: Region[] = [
  { id: 'nz', name: 'New Zealand', cur: 'NZD', sym: 'NZ$', rate: 1, deliver: 'across New Zealand' },
  { id: 'au', name: 'Australia', cur: 'AUD', sym: 'A$', rate: 0.81, deliver: 'across Australia' },   // NZ$1 = A$0.8076 on 6 Nov 2026
  { id: 'us', name: 'United States', cur: 'USD', sym: 'US$', rate: 0.6, deliver: 'to the United States' },
  { id: 'ca', name: 'Canada', cur: 'CAD', sym: 'C$', rate: 0.83, deliver: 'to Canada' },
  { id: 'uk', name: 'United Kingdom', cur: 'GBP', sym: '£', rate: 0.46, deliver: 'to the United Kingdom' },
  { id: 'row', name: 'Rest of the world', cur: 'USD', sym: 'US$', rate: 0.6, deliver: 'worldwide' },
];
let current = REGIONS[0];
export const region = () => current;
export const isHome = () => current.id === 'nz';
export function setRegion(id: string) { current = REGIONS.find((r) => r.id === id) ?? REGIONS[0]; return current; }
/** A first guess from the visitor's clock and language (nothing is looked up online). They can change it any time. */
export function guessRegion(): string {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '', lang = (navigator.language || '').toLowerCase();
    if (tz === 'Pacific/Auckland' || tz === 'Pacific/Chatham') return 'nz';
    if (tz.startsWith('Australia/')) return 'au';
    if (tz === 'Europe/London' || tz === 'Europe/Belfast') return 'uk';
    if (tz.startsWith('America/')) return lang.endsWith('-ca') || /Toronto|Vancouver|Edmonton|Winnipeg|Halifax|Regina|St_Johns|Moncton/.test(tz) ? 'ca' : /New_York|Chicago|Denver|Los_Angeles|Phoenix|Detroit|Anchorage|Boise|Indiana|Kentucky/.test(tz) ? 'us' : 'row';
    if (tz === 'Pacific/Honolulu') return 'us';
    return tz ? 'row' : 'nz';
  } catch { return 'nz'; }
}
const fmt = (n: number) => n.toLocaleString('en-NZ');
/** A price (kept in NZD) in the visitor's currency. Outside NZ it is rounded to the nearest 10 and is a guide. */
/** Prices are not set yet: a null price reads "Price on request" everywhere. */
export const ON_REQUEST = 'Price on request';
export const money = (n: number | null | undefined) => (n == null ? ON_REQUEST : current.rate === 1 ? 'NZ$' + fmt(n) : current.sym + fmt(Math.round((n * current.rate) / 10) * 10));
export const moneyNZ = (n: number | null | undefined) => (n == null ? ON_REQUEST : 'NZ$' + fmt(n));
