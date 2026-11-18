import * as THREE from 'three';
import { buildSurface, curve, lerp, smooth, clamp01 } from './surface';
import { Painter, makePalette, paisley, buti, scallops, cord, vine, jaal, flower, lighten, type Palette, type FabricTex } from './textures';
import { fabricMaterial, FABRICS, type FabricPreset } from './materials';

export interface Tier { name: 'high' | 'mid' | 'low'; seg: number; tex: number; physical: boolean; aniso: number }
export const TIERS: Record<string, Tier> = {
  high: { name: 'high', seg: 1, tex: 2048, physical: true, aniso: 8 },
  mid: { name: 'mid', seg: 0.62, tex: 1024, physical: true, aniso: 4 },
  low: { name: 'low', seg: 0.4, tex: 512, physical: false, aniso: 1 },
};

/** Everything a sample outfit needs. `kind` picks the cut; the rest is colour and detail. */
export interface OutfitSpec {
  kind: 'anarkali' | 'suit' | 'lehenga';
  cloth: string; thread: string; accent: string; accent2: string; dupatta: string; bottom?: string;
  fabric: string; neck?: 'round' | 'v'; seed?: number;
  hemRadius?: number;                    // anarkali / lehenga skirt
  kameezHem?: number;                    // suit: height of the kameez hem above the floor (m)
  slits?: boolean; flare?: number;       // suit
  legs?: 'churidar' | 'straight' | 'palazzo' | 'sharara';
  sleeve?: 'full' | 'three' | 'short';
  design?: 'zari' | 'placket' | 'print' | 'chikan' | 'mirror';
  metal?: boolean;                       // false = printed / thread-only work (no gold)
  forSim?: boolean;                      // export for the Blender cloth sim: unfolded skirt, softer dupatta
}
export interface Outfit { group: THREE.Group; hemRadius: number; height: number; dispose(): void }

// ───────── invisible body the clothes sit on (metres, Y up, front = +Z) ─────────
const bodyA = curve([[0.80, 0.170], [0.90, 0.175], [1.00, 0.150], [1.08, 0.125], [1.18, 0.135], [1.26, 0.150], [1.34, 0.158], [1.38, 0.172], [1.405, 0.180], [1.42, 0.176], [1.435, 0.150], [1.45, 0.110], [1.462, 0.078], [1.47, 0.062]]);
const bodyB = curve([[0.80, 0.110], [0.90, 0.118], [1.00, 0.104], [1.08, 0.092], [1.18, 0.100], [1.26, 0.122], [1.34, 0.100], [1.40, 0.082], [1.44, 0.068], [1.47, 0.058]]);
const bodyCz = curve([[0.80, -0.008], [0.90, -0.012], [1.08, 0], [1.18, 0.008], [1.26, 0.02], [1.34, 0.01], [1.42, 0]]);
const sp = (c: number, e: number) => Math.sign(c) * Math.pow(Math.abs(c), e);
const TAU = Math.PI * 2;
/** u = 0 is the centre back, u = 0.5 the centre front. */
const ang = (u: number) => TAU * u - Math.PI / 2;
function torsoPoint(th: number, y: number, ease: number, out: THREE.Vector3) {
  out.set((bodyA(y) + ease) * sp(Math.cos(th), 0.82), y, (bodyB(y) + ease) * sp(Math.sin(th), 0.82) + bodyCz(y));
}
/** Fold pattern around a flared hem: round lobes out, sharp creases in. */
function makeFolds(k1: number, k2: number, seed: number) {
  const p1 = seed * 1.7, p2 = seed * 2.9 + 1, p3 = seed * 0.6;
  return (th: number) => {
    const w = th + 0.11 * Math.sin(3 * th + p1) + 0.05 * Math.sin(7 * th + p2);
    return 0.72 * (2 * Math.pow(Math.abs(Math.sin((k1 * w) / 2 + p3)), 0.62) - 1) + 0.28 * (2 * Math.pow(Math.abs(Math.sin((k2 * w) / 2 + p1)), 0.7) - 1);
  };
}

// ───────── shared build context ─────────
interface Ctx {
  g: THREE.Group; spec: OutfitSpec; tier: Tier; pal: Palette; preset: FabricPreset; seed: number; T: number;
  S(n: number): number; add(geo: THREE.BufferGeometry, mat: THREE.Material, order?: number, name?: string): THREE.Mesh;
  mat(P: Painter, o?: { repeatX?: number; grain?: number; slub?: number; normal?: number; cloth?: string; preset?: FabricPreset }): THREE.Material;
  bin: { dispose(): void }[];
}
function palFor(spec: OutfitSpec, cloth: string): Palette {
  const p = makePalette(cloth, spec.thread, spec.accent, spec.accent2, spec.fabric === 'velvet' ? 0.9 : spec.fabric === 'satin' ? 0.5 : 0.7);
  if (spec.metal === false) {          // print / thread work: flat, matt, no sparkle
    const flat = (c: string, h: number) => ({ color: c, h, metal: 0, rough: 0.78, hatch: h > 0.6 });
    const raised = spec.design === 'chikan' ? 0.72 : 0.54;
    p.thread = flat(spec.thread, raised); p.threadHi = flat(lighten(spec.thread, 0.2), raised + 0.04); p.sequin = flat(lighten(spec.thread, 0.3), raised + 0.06);
    p.accent = flat(spec.accent, raised); p.accent2 = flat(spec.accent2, raised);
  }
  return p;
}
function makeCtx(spec: OutfitSpec, tier: Tier): Ctx {
  const g = new THREE.Group(); const bin: { dispose(): void }[] = [];
  const preset = FABRICS[spec.fabric] ?? FABRICS.rawSilk;
  const c: Ctx = {
    g, spec, tier, bin, preset, pal: palFor(spec, spec.cloth), seed: spec.seed ?? 3, T: tier.tex,
    S: (n) => Math.max(8, Math.round(n * tier.seg)),
    add(geo, mat, order = 0, name = '') { const m = new THREE.Mesh(geo, mat); m.name = name; m.castShadow = true; m.receiveShadow = true; m.renderOrder = order; g.add(m); bin.push(geo); return m; },
    mat(P, o = {}) {
      const t: FabricTex = P.finish({ grain: o.grain ?? 0.045, slub: o.slub ?? (spec.fabric === 'rawSilk' ? 0.07 : 0.02), normal: o.normal, repeatX: o.repeatX, aniso: tier.aniso });
      const m = fabricMaterial(t, o.cloth ?? spec.cloth, o.preset ?? preset, tier.physical); bin.push(t.map, t.normalMap, t.ormMap, m); return m;
    },
  };
  return c;
}

// ───────── parts ─────────
const Y_SIDE = 1.456;
function neckFn(spec: OutfitSpec) {
  const yFront = spec.neck === 'v' ? 1.3 : 1.335, pF = spec.neck === 'v' ? 1.15 : 2.2, yBack = 1.40;
  return (th: number) => { const f = Math.sin(th); return Y_SIDE - (Y_SIDE - yFront) * Math.pow(Math.max(f, 0), pF) - (Y_SIDE - yBack) * Math.pow(Math.max(-f, 0), 2); };
}

/** Neckline rows shared by every top: cord, vine, scallops. Returns the y (cm) where they end. */
function yoke(P: Painter, pal: Palette, cmW: number, rich: boolean) {
  cord(P, 0.45, 0.8, pal.threadHi);
  vine(P, 3.1, 1.25, Math.max(2, Math.round(cmW / 12)), pal);
  cord(P, 5.5, 0.45, pal.thread);
  if (rich) scallops(P, 5.9, Math.max(4, Math.round(cmW / 3)), 1.5, 1, pal.thread, pal.sequin);
  return rich ? 8.6 : 6.4;
}

/** Fitted bodice (anarkali top / lehenga blouse) from the neckline down to yBottom. */
function partBodice(c: Ctx, yBottom: number) {
  const neckY = neckFn(c.spec), H = Y_SIDE - yBottom;
  const geo = buildSurface((u, v, o) => { const th = ang(u), yn = neckY(th); torsoPoint(th, yn - (yn - yBottom) * Math.pow(v, 1.25), 0.008, o); },
    c.S(160), c.S(56), { closedU: true, uv: (u, v) => { const yn = neckY(ang(u)); return [u, ((yn - yBottom) * Math.pow(v, 1.25)) / H]; } });
  const P = new Painter(c.T, c.T / 2, 96, H * 100, c.pal, c.seed + 1);
  const y0 = yoke(P, c.pal, 96, true);
  jaal(P, y0, H * 100, 16, c.pal, 6.6);
  c.add(geo, c.mat(P, { grain: 0.04 }), 0, 'bodice');
}

function partBand(c: Ctx, y: number, half = 0.023) {
  const geo = buildSurface((u, v, o) => torsoPoint(ang(u), lerp(y + half, y - half, v), 0.0125 + 0.002 * Math.sin(v * Math.PI), o), c.S(140), 4, { closedU: true });
  const P = new Painter(c.T, Math.max(64, c.T / 16), 80, 4.6, c.pal, c.seed + 2);
  P.band(0, 4.6, { ...c.pal.thread, hatch: false }); cord(P, 0.45, 0.7, c.pal.threadHi); cord(P, 4.15, 0.7, c.pal.threadHi);
  for (let i = 0; i < 40; i++) { const x = (i + 0.5) * 2; if (i % 2) P.sequin(x, 2.3, 0.42, c.pal.sequin); else P.at(x, 2.3, 0, 0.55, 0.9, () => P.fill(new Path2D('M0,-1 L0.62,0 L0,1 L-0.62,0 Z'), c.pal.accent2)); }
  c.add(geo, c.mat(P, { grain: 0.03, normal: 3, slub: 0 }), 0, 'band');
}

/** Hem border rows for skirts, kameez hems and wide trouser hems. B = bottom edge (cm). */
function hemBorder(P: Painter, pal: Palette, B: number, cmW: number, scale = 1) {
  const s = scale;
  cord(P, B - 0.85 * s, 1.5 * s, pal.threadHi);
  const nS = Math.max(6, Math.round(cmW / 2)); for (let i = 0; i < nS; i++) P.sequin(((i + 0.5) / nS) * cmW, B - 2.7 * s, 0.3 * s, pal.sequin);
  cord(P, B - 3.9 * s, 0.5 * s, pal.thread);
  const nP = Math.max(2, Math.round(cmW / (11.5 * s))), wP = cmW / nP;
  for (let i = 0; i <= nP; i++) {
    if (i < nP) paisley(P, (i + 0.5) * wP, B - 9.6 * s, 4.5 * s, 0, i % 2 === 1, pal);
    flower(P, i * wP, B - 6.6 * s, 1.25 * s, 8, pal.accent, pal.sequin); flower(P, i * wP, B - 12.4 * s, 1.25 * s, 8, pal.threadHi, pal.sequin, 0.4);
  }
  cord(P, B - 15.2 * s, 0.5 * s, pal.thread);
  vine(P, B - 18.3 * s, 1.5 * s, Math.max(2, Math.round(cmW / (12 * s))), pal);
  cord(P, B - 21.4 * s, 0.45 * s, pal.thread);
  scallops(P, B - 21.8 * s, Math.max(4, Math.round(cmW / (4.6 * s))), 2.1 * s, -1, pal.thread, pal.sequin);
  return B - 24.5 * s;
}

/** Flared, folded skirt. Returns the radius it reaches at a given height (the dupatta rests on it). */
function partSkirt(c: Ctx, yTop: number, Rhem: number, o: { k1: number; k2: number; amp: number; dense?: boolean }) {
  const yHem = 0.022, ax = bodyA(yTop) + 0.011, bz = bodyB(yTop) + 0.011, cz0 = bodyCz(Math.max(0.8, yTop));
  const restHem = Rhem, restAmp = o.amp;                         // where the finished (folded) skirt sits
  if (c.spec.forSim) { o = { ...o, amp: 0 }; Rhem = 0.78; }   // Blender's cloth sim makes the folds
  const folds = makeFolds(o.k1, o.k2, c.seed), flare = (t: number) => 0.8 * t + 0.2 * t * t;
  const baseR = (th: number, t: number) => { const cs = Math.cos(th), sn = Math.sin(th); return lerp((ax * bz) / Math.sqrt(bz * bz * cs * cs + ax * ax * sn * sn), Rhem, flare(t)); };
  const point = (u: number, t: number, out: THREE.Vector3) => {
    const th = ang(u), F = folds(th);
    const r = baseR(th, t) + o.amp * Math.pow(t, 1.25) * F + 0.0035 * Math.sin(58 * th) * (1 - smooth(0, 0.22, t));
    out.set(r * Math.cos(th), lerp(yTop, yHem, t) - 0.014 * t * t * F, r * Math.sin(th) + cz0 * (1 - t));
  };
  // texture follows the real cloth length at the hem, so embroidery is not stretched on fold walls
  const NS = 2048, cum = new Float32Array(NS + 1), a = new THREE.Vector3(), b = new THREE.Vector3();
  point(0, 1, a); for (let i = 1; i <= NS; i++) { point(i / NS, 1, b); cum[i] = cum[i - 1] + a.distanceTo(b); a.copy(b); }
  const hemLen = cum[NS];
  const sHem = (u: number) => { const x = clamp01(u) * NS, i = Math.min(NS - 1, Math.floor(x)); return lerp(cum[i], cum[i + 1], x - i) / hemLen; };
  const geo = buildSurface(point, c.spec.forSim ? 220 : c.S(360), c.spec.forSim ? 72 : c.S(110), { closedU: true, sway: (_u, v) => v, uv: (u, v) => [lerp(u, sHem(u), smooth(0, 0.55, v)), v] });
  const rep = Math.max(6, Math.round((hemLen * 100) / 47)), cmW = (hemLen * 100) / rep, cmH = (yTop - yHem) * 100;
  const P = new Painter(c.T / 2, c.T, cmW, cmH, c.pal, c.seed + 3), pal = c.pal;
  const top = hemBorder(P, pal, cmH, cmW);
  const comp = (y: number) => Rhem / lerp(ax, Rhem, flare(y / cmH));
  let row = 0;
  // small, close-set butis that thin out towards the waist: reads as real hand work, not stickers
  for (let y = top - 4.2; y > cmH * 0.16; y -= (o.dense ? 4.6 : 5.6) * (1 + row * 0.05), row++) {
    const k = comp(y), cols = Math.max(1, Math.round(cmW / ((o.dense ? 5 : 6.4) * k)));
    if (cmW / cols < 2.4 * k) break;
    const sz = lerp(0.82, 0.55, Math.min(1, row / 10));
    for (let i = 0; i < cols; i++) buti(P, ((i + (row % 2 ? 0.5 : 0)) / cols) * cmW + (row % 2 ? 0 : cmW / cols / 2) + (P.rand() - 0.5) * 0.3, y + (P.rand() - 0.5) * 0.3, sz, pal, row % 3, k);
  }
  for (let i = 0; i < (o.dense ? 900 : 600); i++) { const y = cmH * (0.06 + 0.7 * P.rand()), k = comp(y); P.at(P.rand() * cmW, y, 0, k, 1, () => P.sequin(0, 0, 0.1 + 0.05 * P.rand(), pal.sequin)); }
  c.add(geo, c.mat(P, { repeatX: rep }), 0, 'skirt');
  const restBase = (t: number) => lerp(bz, restHem, flare(t));
  return (y: number) => { const t = clamp01((yTop - y) / (yTop - yHem)); return restBase(t) + restAmp * 0.8 * Math.pow(t, 1.25); };
}

function partSleeves(c: Ctx, length: number) {
  const full = length > 0.9, cmH = 58 * length;
  const P = new Painter(c.T / 2, full ? c.T : c.T / 2, 30, cmH, c.pal, c.seed + 4), pal = c.pal, B = cmH;
  cord(P, B - 0.6, 1.0, pal.threadHi);
  for (let i = 0; i < 4; i++) { paisley(P, (i + 0.5) * 7.5, B - 5.3, 2.4, 0, i % 2 === 1, pal); P.sequin(i * 7.5, B - 5.3, 0.3, pal.sequin); }
  cord(P, B - 9.3, 0.4, pal.thread); scallops(P, B - 9.6, 8, 1.5, -1, pal.thread, pal.sequin);
  for (let r = 0, y = B - 17; y > 3; y -= 6.5, r++) for (let i = 0; i < 4; i++) buti(P, (i + (r % 2 ? 0.5 : 0)) * 7.5 + 1.5, y, 0.95, pal, r % 3);
  const mat = c.mat(P);
  for (const side of [1, -1]) {
    const p0 = new THREE.Vector3(side * 0.150, 1.392, 0.002), p1 = new THREE.Vector3(side * 0.252, 1.13, -0.012), p2 = new THREE.Vector3(side * 0.262, 0.875, 0.058);
    const Pq = new THREE.Vector3(), Tq = new THREE.Vector3(), X1 = new THREE.Vector3(), X2 = new THREE.Vector3(), Fw = new THREE.Vector3(0, 0, 1);
    const rad = curve([[0, 0.066], [0.12, 0.058], [0.5, 0.046], [0.85, 0.037], [1, 0.035]]);
    const geo = buildSurface((u, vv, o) => {
      const v = vv * length, w = 1 - v;
      Pq.set(0, 0, 0).addScaledVector(p0, w * w).addScaledVector(p1, 2 * w * v).addScaledVector(p2, v * v);
      Tq.set(0, 0, 0).addScaledVector(p0, -2 * w).addScaledVector(p1, 2 * w - 2 * v).addScaledVector(p2, 2 * v).normalize();
      X1.copy(Fw).addScaledVector(Tq, -Tq.dot(Fw)).normalize(); X2.crossVectors(Tq, X1);
      const ph = TAU * u * side;
      const wr = 0.0021 * Math.sin(v * 88 + 1.6 * Math.sin(ph + 0.7) + 0.9 * Math.sin(2 * ph)) * Math.exp(-Math.pow((v - 0.52) / 0.075, 2)) * (0.55 + 0.45 * Math.cos(ph - 0.4))
        + 0.0011 * Math.sin(v * 170 + 2 * Math.sin(ph)) * smooth(0.84, 0.96, v) + 0.0025 * Math.sin(3 * ph + v * 7) * smooth(0.1, 0.5, v);
      const r = rad(v) + wr + (full ? 0 : 0.006 * smooth(0.6, 1, vv));
      o.copy(Pq).addScaledVector(X1, r * Math.cos(ph)).addScaledVector(X2, r * 1.06 * Math.sin(ph));
    }, c.S(56), c.S(72 * Math.max(0.4, length)), { closedU: true, flip: side < 0, sway: (_u, v) => v * 0.25 * length });
    c.add(geo, mat, 0, side > 0 ? 'sleeve_l' : 'sleeve_r');
  }
}

/** Dupatta pleated at one shoulder, falling front and back. restR(y) = how far out the garment under it sits. */
function partDupatta(c: Ctx, restR: (y: number) => number, yRestTop: number) {
  const spec = c.spec, dpal = palFor(spec, spec.dupatta), sx = 0.118;
  const yF = curve([[0, 0.40], [0.14, 0.78], [0.30, 1.19], [0.40, 1.375], [0.46, 1.452], [0.5, 1.472], [0.54, 1.452], [0.60, 1.38], [0.70, 1.19], [0.86, 0.74], [1, 0.34]]);
  const zOf = (s: number, y: number) => {
    const front = s < 0.5, yc = Math.min(1.42, Math.max(0.8, y));
    const onBody = bodyB(Math.min(1.47, Math.max(0.8, y))) + 0.022 + (front ? bodyCz(yc) : -bodyCz(yc));
    return (front ? 1 : -1) * Math.max(onBody, y < yRestTop ? restR(y) + 0.02 : 0) * (1 - smooth(1.40, 1.472, y));
  };
  const width = curve([[0, 0.36], [0.3, 0.2], [0.46, 0.105], [0.5, 0.095], [0.54, 0.105], [0.7, 0.2], [1, 0.38]]);
  const C = new THREE.Vector3(), C2 = new THREE.Vector3(), Tn = new THREE.Vector3(), Nn = new THREE.Vector3(), Xn = new THREE.Vector3(1, 0, 0);
  const centre = (s: number, o: THREE.Vector3) => { const y = yF(s); o.set(sx, y, zOf(s, y)); };
  const geo = buildSurface((u, v, o) => {
    centre(v, C); centre(Math.min(1, v + 0.004), C2); centre(Math.max(0, v - 0.004), Tn); Tn.subVectors(C2, Tn).normalize();
    Nn.crossVectors(Xn, Tn).normalize(); if (Nn.z * (v < 0.5 ? 1 : -1) < 0 && Math.abs(Nn.y) < 0.9) Nn.negate();
    if (v >= 0.46 && v <= 0.54) Nn.set(0, 1, 0).addScaledVector(Tn, -Tn.y).normalize();
    const cc = u - 0.5, w = width(v), free = Math.abs(v - 0.5) * 2;
    const cw = cc + 0.035 * Math.sin(v * 11 + cc * 5) * free;
    const pk = spec.forSim ? 0.45 : 1;
    const pleat = pk * Math.cos(cw * TAU * lerp(5.5, 4.6, free) + 0.6 + 0.5 * Math.sin(v * 6)) * lerp(0.007, 0.024, free) + Math.sin(cc * TAU * 1.5 + v * 7) * 0.016 * free + Math.sin(v * 23 + cc * 9) * 0.004 * free;
    o.copy(C).addScaledVector(Xn, cc * w + 0.012 * Math.sin(v * 9) * free).addScaledVector(Nn, 0.016 + pleat + 0.02 * free * cc * cc * 4);
    o.y -= 0.03 * free * Math.abs(cc);
  }, c.S(72), c.S(200), { uv: (u, v) => [v, u], sway: (_u, v) => Math.pow(Math.abs(v - 0.5) * 2, 1.5) * 0.9 });
  const P = new Painter(c.T, c.T / 4, 230, 70, dpal, c.seed + 5);
  for (const [y0, d] of [[0, 1], [70, -1]] as [number, number][]) {
    cord(P, y0 + d * 0.7, 1.2, dpal.threadHi); vine(P, y0 + d * 4.4, 1.4, 16, dpal); cord(P, y0 + d * 7.6, 0.4, dpal.thread);
    scallops(P, y0 + d * 7.9, 46, 1.5, d, dpal.thread, dpal.sequin);
  }
  for (const x0 of [0, 221]) { const p = new Path2D(); p.rect(x0, 0, 9, 70); P.fill(p, { ...dpal.thread, hatch: false }); for (let i = 0; i < 14; i++) for (let j = 0; j < 2; j++) P.sequin(x0 + 2.5 + j * 4, 2.5 + i * 5, 0.9, dpal.sequin); }
  for (let r = 0; r < 5; r++) for (let i = 0; i < 20; i++) buti(P, 14 + i * 10.5 + (r % 2) * 5, 15 + r * 10, 1.25, dpal, (r + i) % 3);
  c.add(geo, c.mat(P, { grain: 0.06, slub: 0, cloth: spec.dupatta, preset: { ...FABRICS.georgette, inner: 0.7 } }), 2, 'dupatta');
}

/** Kameez / kurta: front and back panels joined at the sides, opening into slits below the hip. */
function partKameez(c: Ctx, yHem: number) {
  const spec = c.spec, neckY = neckFn(spec), ySlit = spec.slits === false ? -1 : Math.min(0.9, yHem + 0.34), flareK = spec.flare ?? 0.12;
  const aOf = (y: number) => (y >= 0.9 ? bodyA(y) + 0.012 : bodyA(0.9) + 0.012 + flareK * (0.9 - y));
  const bOf = (y: number) => (y >= 0.9 ? bodyB(y) + 0.012 : bodyB(0.9) + 0.012 + flareK * 0.75 * (0.9 - y));
  const czOf = (y: number) => bodyCz(Math.max(0.8, Math.min(1.42, y)));
  const reach = (y: number) => bOf(y);
  for (const front of [true, false]) {
    const P = new Painter(c.T / 2, c.T, 52, (Y_SIDE - yHem) * 100, c.pal, c.seed + (front ? 6 : 7)), pal = c.pal, B = (Y_SIDE - yHem) * 100;
    const y0 = yoke(P, pal, 52, front && spec.design !== 'print');
    const hemTop = spec.design === 'print' || spec.design === 'chikan' ? (cord(P, B - 0.7, 1, pal.threadHi), vine(P, B - 4.6, 1.5, 4, pal), cord(P, B - 8, 0.4, pal.thread), B - 10) : hemBorder(P, pal, B, 52, 0.62);
    if (front && (spec.design === 'placket' || spec.design === 'mirror')) {     // embroidered panel down the centre front
      const p = new Path2D(); p.rect(22.4, y0 - 2, 7.2, 34); P.fill(p, { ...pal.thread, hatch: false });
      const q = new Path2D(); q.rect(23.3, y0 - 2, 5.4, 33.2); P.c.fillStyle = pal.cloth; P.c.fill(q); P.h.fillStyle = 'rgb(134,134,134)'; P.h.fill(q); P.m.fillStyle = `rgb(0,${Math.round(pal.clothRough * 255)},0)`; P.m.fill(q);
      for (let i = 0; i < 9; i++) { flower(P, 26, y0 + 0.5 + i * 3.6, 1.15, 8, i % 2 ? pal.threadHi : pal.accent, pal.sequin, i); }
      for (let i = 0; i < 12; i++) for (const x of [20.6, 31.4]) P.sequin(x, y0 + i * 2.7, 0.36, pal.sequin);
    }
    const dense = spec.design === 'print' || spec.design === 'chikan' || spec.design === 'mirror';
    for (let r = 0, y = y0 + 5; y < hemTop - 4; y += dense ? 5.2 : 8.4, r++) for (let i = 0; i < (dense ? 7 : 5); i++) {
      const x = ((i + (r % 2 ? 0.5 : 0)) / (dense ? 7 : 5)) * 52 + 2; if (front && spec.design !== 'print' && spec.design !== 'chikan' && Math.abs(x - 26) < 6.5 && y < y0 + 34) continue;
      if (spec.design === 'mirror') P.sequin(x, y, 0.62, pal.sequin); else buti(P, x, y, dense ? 0.9 : 1.15, pal, (r + i) % 3);
    }
    const geo = buildSurface((u, v, o) => {
      const th = front ? Math.PI * u : Math.PI + Math.PI * u, yn = neckY(th), y = yn - (yn - yHem) * Math.pow(v, 1.12);
      const cs = Math.cos(th), sn = Math.sin(th), edge = Math.pow(Math.abs(cs), 3), below = Math.max(0, 0.9 - y);
      const fold = 0.006 * Math.sin(9 * th + c.seed) * smooth(0, 0.25, below) + 0.004 * Math.sin(17 * th + 2) * smooth(0.1, 0.4, below);
      let x = (aOf(y) + fold) * sp(cs, 0.82), z = (bOf(y) + fold) * sp(sn, 0.82) + czOf(y);
      if (ySlit > 0 && y < ySlit) { const d = ySlit - y, k = Math.min(1, d * 3.2); x *= 1 - 0.07 * edge * k; z += (front ? 1 : -1) * edge * (0.008 * k + 0.055 * d); }
      o.set(x, y + 0.012 * Math.cos(2 * th) * smooth(0.5, 1, v), z);
    }, c.S(120), c.S(120), { uv: (u, v) => [front ? 1 - u : u, Math.pow(v, 1.12)], sway: (_u, v) => 0.55 * smooth(0.45, 1, v) });
    c.add(geo, c.mat(P));
  }
  return reach;
}

/** Trousers under the kameez. */
function partLegs(c: Ctx, kind: NonNullable<OutfitSpec['legs']>) {
  const spec = c.spec, cloth = spec.bottom ?? spec.cloth, pal = palFor(spec, cloth), yTop = 0.93, yHem = kind === 'churidar' ? 0.05 : 0.035;
  const R = { churidar: curve([[0, 0.1], [0.3, 0.078], [0.52, 0.058], [0.75, 0.05], [1, 0.041]]), straight: curve([[0, 0.105], [0.35, 0.09], [1, 0.082]]), palazzo: curve([[0, 0.108], [0.4, 0.125], [1, 0.168]]), sharara: curve([[0, 0.102], [0.3, 0.08], [0.5, 0.07], [0.62, 0.1], [1, 0.265]]) }[kind];
  const folds = makeFolds(9, 15, c.seed + 4);
  const flareT = (v: number) => (kind === 'sharara' ? smooth(0.5, 1, v) : kind === 'palazzo' ? smooth(0.15, 1, v) * 0.45 : 0);
  const cmW = kind === 'sharara' ? 42 : 36, cmH = (yTop - yHem) * 100, rep = kind === 'sharara' ? 4 : 1;
  const P = new Painter(c.T / 2, c.T, cmW, cmH, pal, c.seed + 8);
  if (kind === 'sharara') { const top = hemBorder(P, pal, cmH, cmW, 0.8); for (let r = 0, y = top - 5; y > cmH * 0.5; y -= 7, r++) for (let i = 0; i < 4; i++) buti(P, ((i + (r % 2 ? 0.5 : 0)) / 4) * cmW + 3, y, 1.1, pal, r % 3, 1 + r * 0.25); }
  else if (kind !== 'churidar') { cord(P, cmH - 0.7, 1.1, pal.threadHi); vine(P, cmH - 4.4, 1.4, 3, pal); cord(P, cmH - 7.6, 0.4, pal.thread); }
  else { cord(P, cmH - 0.5, 0.7, pal.thread); }
  const mat = c.mat(P, { repeatX: rep, cloth });
  for (const side of [1, -1]) {
    const geo = buildSurface((u, v, o) => {
      const th = TAU * u * side, t = flareT(v), F = folds(th + side);
      let r = R(v) + (kind === 'sharara' ? 0.045 : 0.014) * t * F;
      if (kind === 'churidar') r += 0.0045 * Math.sin(v * 250 + 1.5 * Math.sin(th)) * smooth(0.74, 0.86, v) * (1 - smooth(0.985, 1, v));
      if (kind === 'straight') r += 0.003 * Math.sin(3 * th + v * 6);
      const cx = side * lerp(0.085, kind === 'sharara' ? 0.13 : kind === 'palazzo' ? 0.105 : 0.09, v);
      o.set(cx + r * Math.cos(th), lerp(yTop, yHem, v) - (kind === 'sharara' ? 0.012 * t * F : 0), r * 0.96 * Math.sin(th) - 0.004);
    }, c.S(kind === 'sharara' ? 150 : 64), c.S(110), { closedU: true, flip: side < 0, sway: (_u, v) => (kind === 'sharara' ? smooth(0.5, 1, v) * 0.6 : v * 0.15) });
    c.add(geo, mat);
  }
  return kind === 'sharara' ? 0.42 : kind === 'palazzo' ? 0.3 : 0.24;
}

// ───────── outfits ─────────
export function buildOutfit(spec: OutfitSpec, tier: Tier): Outfit {
  const c = makeCtx(spec, tier); let hem = 0.4;
  const sleeve = spec.sleeve === 'short' ? 0.3 : spec.sleeve === 'three' ? 0.72 : 1;
  if (spec.kind === 'anarkali') {
    partBodice(c, 1.165); partBand(c, 1.169);
    const R = spec.hemRadius ?? 0.5; const rest = partSkirt(c, 1.158, R, { k1: 13, k2: 21, amp: 0.078 });
    partSleeves(c, sleeve); partDupatta(c, rest, 1.158); hem = R + 0.08;
  } else if (spec.kind === 'lehenga') {
    partBodice(c, 1.2);
    const R = spec.hemRadius ?? 0.62; partBand(c, 1.03, 0.028);
    const rest = partSkirt(c, 1.012, R, { k1: 17, k2: 27, amp: 0.085, dense: true });
    partSleeves(c, sleeve); partDupatta(c, rest, 1.012); hem = R + 0.09;
  } else {
    const yHem = spec.kameezHem ?? 0.6; const legR = partLegs(c, spec.legs ?? 'churidar');
    const reach = partKameez(c, yHem); partSleeves(c, sleeve);
    partDupatta(c, (y) => reach(Math.max(y, yHem)), 1.2); hem = Math.max(legR, 0.26);
  }
  return { group: c.g, hemRadius: hem, height: 1.48, dispose() { c.bin.forEach((d) => d.dispose()); } };
}
