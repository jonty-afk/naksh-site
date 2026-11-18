// SAMPLE products (made up, as the owner asked). Real pieces replace these later.
// `outfit.kind` picks the 3D builder; `glb` (optional, later) can point at a real scanned model instead.
import type { OutfitSpec } from '../three/garments';
export interface Colourway { name: string; cloth: string; thread: string; accent: string; accent2: string; dupatta: string; glow: string; bottom?: string }
export interface Hotspot { title: string; text: string; angle: number; zoom: number; focusY: number }
export interface Product {
  slug: string; name: string; kind: string; occasion: string[]; price: number; blurb: string;
  fabric: string; work: string; includes: string; care: string;
  outfit: Omit<OutfitSpec, 'cloth' | 'thread' | 'accent' | 'accent2' | 'dupatta' | 'bottom'>;
  colourways: Colourway[]; hotspots: Hotspot[]; sizes: string[]; glb?: string;
}
const SIZES = ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL'];
const anarkaliSpots = (border: string, bodice: string): Hotspot[] => [
  { title: 'The border', text: border, angle: 22, zoom: 2.5, focusY: 0.2 },
  { title: 'The bodice', text: bodice, angle: -14, zoom: 2.7, focusY: 1.27 },
  { title: 'The sleeve', text: 'Full-length sleeve, shaped at the elbow, with a paisley cuff that echoes the hem.', angle: 62, zoom: 2.6, focusY: 1.0 },
  { title: 'The dupatta', text: 'Pleated and set at the shoulder, then left to fall free front and back.', angle: 158, zoom: 1.5, focusY: 0.95 },
];

export const PRODUCTS: Product[] = [
  {
    slug: 'dusk-anarkali', name: 'Dusk Anarkali', kind: 'Anarkali suit', occasion: ['Wedding guest', 'Sangeet'], price: 489,
    blurb: 'A floor-length anarkali in plum raw silk. The skirt falls in deep folds and opens into a wide gold border when you turn.',
    fabric: 'Raw silk with a soft georgette dupatta', work: 'Zari paisley border, vine and scallop rows, sequin trellis on the bodice',
    includes: 'Anarkali, churidar, dupatta', care: 'Dry clean only. Store folded in muslin, away from light.',
    outfit: { kind: 'anarkali', fabric: 'rawSilk', neck: 'round', hemRadius: 0.5, seed: 3 },
    colourways: [
      { name: 'Plum dusk', cloth: '#4d1439', thread: '#c9a45c', accent: '#efe2c2', accent2: '#c4566e', dupatta: '#8f2f4f', glow: '#4b2146' },
      { name: 'Peacock', cloth: '#0d4a4f', thread: '#cfae68', accent: '#f0e6c8', accent2: '#d98a3d', dupatta: '#12666a', glow: '#12474a' },
      { name: 'Sindoor', cloth: '#7d1420', thread: '#d2aa5e', accent: '#f3e3c0', accent2: '#1f5d4a', dupatta: '#a3222b', glow: '#5a1620' },
      { name: 'Ink', cloth: '#16193f', thread: '#d6c08a', accent: '#e9e3d0', accent2: '#a84a6a', dupatta: '#232a63', glow: '#1c2150' },
    ],
    hotspots: anarkaliSpots('Three rows worked in zari: a paisley band, a running vine and a scalloped edge, finished with a twisted gold cord at the hem.', 'A diamond trellis of thread with a sequin set at every crossing, under a vine-work neckline.'),
    sizes: SIZES,
  },
  {
    slug: 'midnight-sequin-anarkali', name: 'Midnight Anarkali', kind: 'Anarkali suit', occasion: ['Reception', 'Diwali'], price: 629,
    blurb: 'Ink-blue silk scattered with sequins like the first stars. A deeper V neck and a fuller skirt for evenings that run late.',
    fabric: 'Satin silk with a georgette dupatta', work: 'Scattered sequin work, pale-gold zari border',
    includes: 'Anarkali, churidar, dupatta', care: 'Dry clean only. Hang by the shoulders, never by the waist.',
    outfit: { kind: 'anarkali', fabric: 'satin', neck: 'v', hemRadius: 0.56, seed: 8 },
    colourways: [
      { name: 'Midnight', cloth: '#12163d', thread: '#d9c796', accent: '#eef0f6', accent2: '#7c8fd6', dupatta: '#1b2258', glow: '#1a2052' },
      { name: 'Wine', cloth: '#4a0f24', thread: '#d9c796', accent: '#f1e6d2', accent2: '#c98a4a', dupatta: '#641830', glow: '#4a1428' },
      { name: 'Forest', cloth: '#0f3b2a', thread: '#d9c796', accent: '#efe9d2', accent2: '#c0a04a', dupatta: '#15503a', glow: '#143a2c' },
    ],
    hotspots: anarkaliSpots('A pale-gold border that reads silver in daylight and warm under lamps.', 'A V neckline edged in vine work, with a sequin trellis that catches every light in the room.'),
    sizes: SIZES,
  },
  {
    slug: 'rose-garden-anarkali', name: 'Rose Garden Anarkali', kind: 'Anarkali suit', occasion: ['Mehndi', 'Eid', 'Wedding guest'], price: 459,
    blurb: 'Dusty rose with antique gold. Soft enough for a daytime mehndi, with enough thread work to carry into the evening.',
    fabric: 'Raw silk with a georgette dupatta', work: 'Antique-gold zari, ivory silk-thread flowers',
    includes: 'Anarkali, churidar, dupatta', care: 'Dry clean only.',
    outfit: { kind: 'anarkali', fabric: 'rawSilk', neck: 'round', hemRadius: 0.47, seed: 14 },
    colourways: [
      { name: 'Dusty rose', cloth: '#a04a5f', thread: '#c8a35a', accent: '#f6ead2', accent2: '#5d2440', dupatta: '#c9a07c', glow: '#6a2c40' },
      { name: 'Marigold', cloth: '#c97a16', thread: '#e3c478', accent: '#fbf0d4', accent2: '#8c1f3a', dupatta: '#8c1f3a', glow: '#6e4212' },
      { name: 'Sage', cloth: '#5d7257', thread: '#cdb06c', accent: '#f3ecd6', accent2: '#8a4a54', dupatta: '#c7b98f', glow: '#39483a' },
    ],
    hotspots: anarkaliSpots('Antique-gold paisleys with ivory thread flowers between them.', 'Fine trellis work under a rounded neckline.'),
    sizes: SIZES,
  },
];

const suitSpots = (hemY: number, top: string, hem: string, legs: string): Hotspot[] => [
  { title: 'The neckline', text: top, angle: -10, zoom: 2.6, focusY: 1.25 },
  { title: 'The hem', text: hem, angle: 24, zoom: 2.5, focusY: hemY + 0.1 },
  { title: 'The trousers', text: legs, angle: 38, zoom: 2.2, focusY: 0.3 },
  { title: 'The dupatta', text: 'Pleated and set at the shoulder, then left to fall free front and back.', angle: 158, zoom: 1.5, focusY: 0.95 },
];
PRODUCTS.push(
  {
    slug: 'emerald-velvet-suit', name: 'Emerald Velvet Suit', kind: 'Straight suit', occasion: ['Winter wedding', 'Reception'], price: 549,
    blurb: 'A straight, knee-length kameez in deep velvet with side slits and a worked panel down the front. Made for cold evenings.',
    fabric: 'Velvet kameez and churidar, georgette dupatta', work: 'Antique-gold front panel, paisley hem, vine neckline',
    includes: 'Kameez, churidar, dupatta', care: 'Dry clean only. Brush velvet lightly in one direction.',
    outfit: { kind: 'suit', fabric: 'velvet', neck: 'round', kameezHem: 0.58, slits: true, flare: 0.1, legs: 'churidar', design: 'placket', sleeve: 'full', seed: 21 },
    colourways: [
      { name: 'Emerald', cloth: '#0c3b2c', thread: '#b8975a', accent: '#efe4c8', accent2: '#8c1f3a', dupatta: '#b08a4e', glow: '#103a2d' },
      { name: 'Garnet', cloth: '#5a0f1f', thread: '#c2a05e', accent: '#f1e6cc', accent2: '#1f5d4a', dupatta: '#7a1a2c', glow: '#4a1220' },
      { name: 'Midnight', cloth: '#141a3c', thread: '#cdb98a', accent: '#eceaf2', accent2: '#a84a6a', dupatta: '#232a63', glow: '#1a2050' },
    ],
    hotspots: suitSpots(0.58, 'A vine-work neckline that runs into a flowered panel down the centre front.', 'Paisleys and a scalloped row above a twisted cord. Side slits open as you walk.', 'A churidar that gathers in rings at the ankle.'),
    sizes: SIZES,
  },
  {
    slug: 'marigold-sharara-set', name: 'Marigold Sharara Set', kind: 'Sharara set', occasion: ['Mehndi', 'Sangeet', 'Diwali'], price: 429,
    blurb: 'A short kurti over a sharara that flares from the knee. Mirror work across the front throws light around the room.',
    fabric: 'Raw silk with a georgette dupatta', work: 'Mirror work kurti, zari border on the sharara',
    includes: 'Kurti, sharara, dupatta', care: 'Dry clean only.',
    outfit: { kind: 'suit', fabric: 'rawSilk', neck: 'v', kameezHem: 0.8, slits: false, flare: 0.3, legs: 'sharara', design: 'mirror', sleeve: 'three', seed: 31 },
    colourways: [
      { name: 'Marigold', cloth: '#c9820f', thread: '#f0dba0', accent: '#fff3d6', accent2: '#a31f3c', dupatta: '#a31f3c', glow: '#6a4410' },
      { name: 'Rani pink', cloth: '#a81a58', thread: '#ecd596', accent: '#fff0dc', accent2: '#e0a030', dupatta: '#d9941f', glow: '#5c1438' },
      { name: 'Mint', cloth: '#5e9e88', thread: '#f0e2b4', accent: '#fbf6e6', accent2: '#b0506a', dupatta: '#e6d7b0', glow: '#2f5246' },
    ],
    hotspots: suitSpots(0.8, 'A V neckline with a mirror-work panel below it.', 'A flared kurti hem that sits at the hip.', 'Fitted to the knee, then a full flare finished with a zari border.'),
    sizes: SIZES,
  },
  {
    slug: 'rose-lehenga', name: 'Gulab Lehenga', kind: 'Lehenga choli', occasion: ['Wedding', 'Reception'], price: 890,
    blurb: 'The fullest skirt in the collection, densely worked from waist to hem, with a cropped blouse and a pleated dupatta.',
    fabric: 'Raw silk with a georgette dupatta', work: 'Dense buti and sequin work, wide zari border',
    includes: 'Blouse, lehenga skirt, dupatta', care: 'Dry clean only. Store flat, never on a hanger.',
    outfit: { kind: 'lehenga', fabric: 'rawSilk', neck: 'round', hemRadius: 0.62, sleeve: 'short', seed: 41 },
    colourways: [
      { name: 'Gulab', cloth: '#a8475c', thread: '#dcc081', accent: '#fbefd8', accent2: '#5d2440', dupatta: '#d9b79c', glow: '#63283a' },
      { name: 'Bridal red', cloth: '#8f1326', thread: '#dcbf78', accent: '#f7e9c8', accent2: '#1f5d4a', dupatta: '#a81c30', glow: '#571420' },
      { name: 'Teal', cloth: '#0f5560', thread: '#dcc081', accent: '#f1ead0', accent2: '#c9762c', dupatta: '#c9762c', glow: '#11444c' },
    ],
    hotspots: anarkaliSpots('A wide zari border under rows of butis that thin out towards the waist.', 'A cropped blouse with a sequin trellis and a vine-work neckline.'),
    sizes: SIZES,
  },
  {
    slug: 'indigo-block-print-suit', name: 'Indigo Print Suit', kind: 'Everyday suit', occasion: ['Everyday', 'Work', 'Pooja'], price: 189,
    blurb: 'A cotton suit for ordinary days: straight kameez, straight trousers, a printed dupatta. Light, washable, easy.',
    fabric: 'Cotton lawn', work: 'Block-print style sprigs and vine borders (no metal thread)',
    includes: 'Kameez, trousers, dupatta', care: 'Cold hand wash separately. Dry in shade.',
    outfit: { kind: 'suit', fabric: 'cotton', neck: 'round', kameezHem: 0.62, slits: true, flare: 0.1, legs: 'straight', design: 'print', sleeve: 'three', metal: false, seed: 51 },
    colourways: [
      { name: 'Indigo', cloth: '#1f2f5c', thread: '#e9e2cf', accent: '#d98a3d', accent2: '#c2553f', dupatta: '#a3402f', glow: '#1e2a50' },
      { name: 'Madder', cloth: '#8c2f25', thread: '#f0e6d0', accent: '#e0b050', accent2: '#1f2f5c', dupatta: '#1f2f5c', glow: '#51201a' },
      { name: 'Olive', cloth: '#555c2c', thread: '#efe8cf', accent: '#d9a03d', accent2: '#8c2f25', dupatta: '#b8842a', glow: '#383c20' },
    ],
    hotspots: suitSpots(0.62, 'A printed vine around a simple round neck.', 'A printed border and side slits for easy movement.', 'Straight trousers with a printed vine at the hem.'),
    sizes: SIZES,
  },
  {
    slug: 'ivory-chikankari-set', name: 'Ivory Chikankari Set', kind: 'Kurta set', occasion: ['Eid', 'Daytime', 'Summer'], price: 319,
    blurb: 'White thread on ivory cloth. From a distance it is plain; up close the whole surface is worked. Zoom in on this one.',
    fabric: 'Cotton lawn', work: 'White-on-white raised thread work in the chikankari style',
    includes: 'Long kurta, palazzo, dupatta', care: 'Gentle hand wash. Iron on the reverse.',
    outfit: { kind: 'suit', fabric: 'cotton', neck: 'v', kameezHem: 0.5, slits: true, flare: 0.14, legs: 'palazzo', design: 'chikan', sleeve: 'three', metal: false, seed: 61 },
    colourways: [
      { name: 'Ivory', cloth: '#e4dccb', thread: '#fbf8f0', accent: '#fbf8f0', accent2: '#d8cdb6', dupatta: '#eae3d3', glow: '#4a4238' },
      { name: 'Powder blue', cloth: '#aebfd0', thread: '#f3f7fb', accent: '#f3f7fb', accent2: '#96a9bd', dupatta: '#bccbd9', glow: '#33404e' },
      { name: 'Blush', cloth: '#dcb8b4', thread: '#fbf2f0', accent: '#fbf2f0', accent2: '#c9a09b', dupatta: '#e5c8c4', glow: '#4e3838' },
    ],
    hotspots: suitSpots(0.5, 'Raised white vine work around a V neck.', 'A long hem with a worked border and side slits.', 'Wide palazzo trousers with a vine at the hem.'),
    sizes: SIZES,
  },
);
export const bySlug = (s: string) => PRODUCTS.find((p) => p.slug === s);
