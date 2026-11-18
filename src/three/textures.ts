import * as THREE from 'three';
import { rng } from './surface';

/** One "ink" paints colour, height (relief) and metal/roughness at the same time. */
export interface Ink { color: string; h: number; metal: number; rough: number; hatch?: boolean }

export interface Palette { cloth: string; clothRough: number; thread: Ink; threadHi: Ink; sequin: Ink; accent: Ink; accent2: Ink }

export function makePalette(cloth: string, thread = '#c9a45c', accent = '#e9d9b0', accent2 = '#b5483a', clothRough = 0.7): Palette {
  return {
    cloth, clothRough,
    thread: { color: thread, h: 0.74, metal: 0.88, rough: 0.48, hatch: true },
    threadHi: { color: lighten(thread, 0.14), h: 0.8, metal: 0.9, rough: 0.4, hatch: true },
    sequin: { color: lighten(thread, 0.26), h: 0.92, metal: 1, rough: 0.14 },
    accent: { color: accent, h: 0.7, metal: 0, rough: 0.55, hatch: true },
    accent2: { color: accent2, h: 0.7, metal: 0, rough: 0.55, hatch: true },
  };
}

export function lighten(hex: string, amt: number): string {
  const c = new THREE.Color(hex); const w = new THREE.Color(amt >= 0 ? '#ffffff' : '#000000');
  return '#' + c.lerp(w, Math.abs(amt)).getHexString();
}

export class Painter {
  W: number; H: number; cmW: number; cmH: number; sx: number; sy: number;
  c: CanvasRenderingContext2D; h: CanvasRenderingContext2D; m: CanvasRenderingContext2D;
  cv: HTMLCanvasElement[]; rand: () => number;

  constructor(W: number, H: number, cmW: number, cmH: number, pal: Palette, seed = 7) {
    this.W = W; this.H = H; this.cmW = cmW; this.cmH = cmH; this.sx = W / cmW; this.sy = H / cmH;
    this.rand = rng(seed);
    this.cv = [0, 1, 2].map(() => { const c = document.createElement('canvas'); c.width = W; c.height = H; return c; });
    [this.c, this.h, this.m] = this.cv.map((c) => c.getContext('2d', { willReadFrequently: true })!) as CanvasRenderingContext2D[];
    this.c.fillStyle = pal.cloth; this.c.fillRect(0, 0, W, H);
    this.h.fillStyle = gray(0.5); this.h.fillRect(0, 0, W, H);
    this.m.fillStyle = orm(pal.clothRough, 0); this.m.fillRect(0, 0, W, H);
    // soft mottling so the cloth is never a flat colour
    for (let i = 0; i < 26; i++) {
      const x = this.rand() * W, y = this.rand() * H, r = (0.15 + this.rand() * 0.35) * W;
      const g = this.c.createRadialGradient(x, y, 0, x, y, r);
      const dark = this.rand() > 0.5;
      g.addColorStop(0, dark ? 'rgba(0,0,0,0.07)' : 'rgba(255,255,255,0.05)'); g.addColorStop(1, 'rgba(0,0,0,0)');
      this.c.fillStyle = g; this.c.fillRect(0, 0, W, H);
    }
    this.all((x) => x.setTransform(this.sx, 0, 0, this.sy, 0, 0));
  }

  all(f: (x: CanvasRenderingContext2D) => void) { f(this.c); f(this.h); f(this.m); }

  /** Run drawing inside a local frame (cm units, origin tx,ty, rotation, scale). */
  at(tx: number, ty: number, rot: number, sx: number, sy: number, f: () => void) {
    this.all((x) => { x.save(); x.translate(tx, ty); if (rot) x.rotate(rot); x.scale(sx, sy); });
    f();
    this.all((x) => x.restore());
  }

  fill(p: Path2D, ink: Ink) {
    this.c.fillStyle = ink.color; this.c.fill(p);
    this.h.fillStyle = gray(ink.h); this.h.fill(p);
    this.m.fillStyle = orm(ink.rough, ink.metal); this.m.fill(p);
    if (ink.hatch) this.hatch(p, ink);
  }

  stroke(p: Path2D, ink: Ink, w: number) {
    this.all((x) => { x.lineWidth = w; x.lineCap = 'round'; x.lineJoin = 'round'; });
    this.c.strokeStyle = ink.color; this.c.stroke(p);
    this.h.strokeStyle = gray(ink.h); this.h.stroke(p);
    this.m.strokeStyle = orm(ink.rough, ink.metal); this.m.stroke(p);
  }

  /** Thread direction lines inside a filled shape: reads as stitching up close. */
  private hatch(p: Path2D, ink: Ink) {
    const t = this.c.getTransform();
    const s = Math.sqrt(Math.abs(t.a * t.d - t.b * t.c)) || 1; // px per local unit
    const step = 2.6 / s, lw = 1.1 / s, R = 3;
    for (const [ctx, style] of [[this.h, gray(ink.h - 0.2)], [this.c, 'rgba(0,0,0,0.22)']] as [CanvasRenderingContext2D, string][]) {
      ctx.save(); ctx.clip(p); ctx.strokeStyle = style; ctx.lineWidth = lw; ctx.beginPath();
      for (let d = -R; d < R; d += step) { ctx.moveTo(d - R, -R); ctx.lineTo(d + R, R); }
      ctx.stroke(); ctx.restore();
    }
  }

  dot(x: number, y: number, r: number, ink: Ink) { const p = new Path2D(); p.ellipse(x, y, r, r, 0, 0, 6.2832); this.fill(p, { ...ink, hatch: false }); }

  /** A sequin: bright disc with a tilted face so it flashes at its own angle. */
  sequin(x: number, y: number, r: number, ink: Ink) {
    const ry = r;
    const p = new Path2D(); p.ellipse(x, y, r, ry, 0, 0, 6.2832);
    this.c.fillStyle = ink.color; this.c.fill(p);
    this.m.fillStyle = orm(ink.rough, ink.metal); this.m.fill(p);
    const a = this.rand() * 6.2832, k = 0.5 + this.rand() * 0.5;
    const g = this.h.createLinearGradient(x - Math.cos(a) * r, y - Math.sin(a) * ry, x + Math.cos(a) * r, y + Math.sin(a) * ry);
    g.addColorStop(0, gray(0.72 - 0.22 * k)); g.addColorStop(1, gray(0.72 + 0.26 * k));
    this.h.fillStyle = g; this.h.fill(p);
    const q = new Path2D(); q.ellipse(x, y, r * 0.22, ry * 0.22, 0, 0, 6.2832);
    this.c.fillStyle = 'rgba(0,0,0,0.45)'; this.c.fill(q); this.h.fillStyle = gray(0.45); this.h.fill(q);
  }

  band(y0: number, y1: number, ink: Ink) { const p = new Path2D(); p.rect(-1, y0, this.cmW + 2, y1 - y0); this.fill(p, { ...ink, hatch: false }); }

  /** Finish: weave grain + slubs into the height map, then build the three textures. */
  finish(o: { grain?: number; slub?: number; normal?: number; repeatX?: number; aniso?: number } = {}): FabricTex {
    this.all((x) => x.setTransform(1, 0, 0, 1, 0, 0));
    const { W, H } = this;
    const hd = this.h.getImageData(0, 0, W, H); const d = hd.data;
    const grain = (o.grain ?? 0.05) * 255, slub = (o.slub ?? 0) * 255;
    const r = this.rand;
    const rowN = new Float32Array(H); let run = 0;
    for (let y = 0; y < H; y++) { if (r() < 0.06) run = (r() - 0.5) * 2; else run *= 0.7; rowN[y] = run; }
    const hf = new Float32Array(W * H);
    for (let y = 0, i = 0; y < H; y++) for (let x = 0; x < W; x++, i++) {
      const weave = (((x + y) & 1) ? 1 : -1) * 0.35 + (r() - 0.5);
      hf[i] = d[i * 4] + weave * grain + rowN[y] * slub;
    }
    // Sobel -> normal map (wraps in x so the tile repeats cleanly)
    const nd = new ImageData(W, H); const n = nd.data; const k = (o.normal ?? 2.2) / 255;
    for (let y = 0, i = 0; y < H; y++) {
      const ym = y > 0 ? y - 1 : y, yp = y < H - 1 ? y + 1 : y;
      for (let x = 0; x < W; x++, i++) {
        const xm = x > 0 ? x - 1 : W - 1, xp = x < W - 1 ? x + 1 : 0;
        const dx = (hf[y * W + xp] - hf[y * W + xm]) * k, dy = (hf[yp * W + x] - hf[ym * W + x]) * k;
        const l = 1 / Math.sqrt(dx * dx + dy * dy + 1);
        n[i * 4] = (-dx * l * 0.5 + 0.5) * 255; n[i * 4 + 1] = (dy * l * 0.5 + 0.5) * 255; n[i * 4 + 2] = (l * 0.5 + 0.5) * 255; n[i * 4 + 3] = 255;
      }
    }
    this.h.putImageData(nd, 0, 0);
    const mk = (cv: HTMLCanvasElement, srgb: boolean) => {
      const t = new THREE.CanvasTexture(cv);
      t.wrapS = THREE.RepeatWrapping; t.wrapT = THREE.ClampToEdgeWrapping;
      t.repeat.set(o.repeatX ?? 1, 1); t.anisotropy = o.aniso ?? 4;
      t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
      t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter;
      return t;
    };
    return { map: mk(this.cv[0], true), normalMap: mk(this.cv[1], false), ormMap: mk(this.cv[2], false) };
  }
}

export interface FabricTex { map: THREE.Texture; normalMap: THREE.Texture; ormMap: THREE.Texture }

const gray = (v: number) => { const g = Math.round(Math.max(0, Math.min(1, v)) * 255); return `rgb(${g},${g},${g})`; };
const orm = (rough: number, metal: number) => `rgb(0,${Math.round(rough * 255)},${Math.round(metal * 255)})`;

// ───────────────────────── motif shapes (unit size, centred) ─────────────────────────

export const shapes = {
  paisley(): Path2D { return new Path2D('M-0.45,-1 C0.1,-0.95 0.72,-0.4 0.62,0.3 C0.55,0.85 -0.1,1.05 -0.5,0.6 C-0.85,0.2 -0.5,-0.35 -0.15,-0.5 C-0.35,-0.6 -0.55,-0.75 -0.45,-1 Z'); },
  leaf(): Path2D { return new Path2D('M0,-1 C0.55,-0.4 0.55,0.4 0,1 C-0.55,0.4 -0.55,-0.4 0,-1 Z'); },
  petal(): Path2D { return new Path2D('M0,0 C0.42,-0.3 0.4,-0.85 0,-1 C-0.4,-0.85 -0.42,-0.3 0,0 Z'); },
  diamond(): Path2D { return new Path2D('M0,-1 L0.62,0 L0,1 L-0.62,0 Z'); },
  circle(r = 1): Path2D { const p = new Path2D(); p.arc(0, 0, r, 0, 6.2832); return p; },
};

/** n-petal flower with a sequin heart. size = radius in cm. */
export function flower(P: Painter, x: number, y: number, size: number, petals: number, ink: Ink, heart: Ink, rot = 0) {
  const ar = 1;
  P.at(x, y, 0, size, size * ar, () => {
    for (let i = 0; i < petals; i++) P.at(0, 0, rot + (i / petals) * 6.2832, 1, 1, () => P.fill(shapes.petal(), ink));
  });
  P.sequin(x, y, size * 0.2, heart);
}

/** Paisley (buta) with an inner outline, a small flower and a beaded edge. */
export function paisley(P: Painter, x: number, y: number, size: number, rot: number, flip: boolean, pal: Palette, fillInk?: Ink) {
  const ar = 1;
  P.at(x, y, 0, 1, ar, () => P.at(0, 0, rot, flip ? -size : size, size, () => {
    P.fill(shapes.paisley(), fillInk ?? pal.thread);
    P.at(0.02, 0.12, 0, 0.74, 0.74, () => { P.c.fillStyle = pal.cloth; P.c.fill(shapes.paisley()); P.h.fillStyle = gray(0.52); P.h.fill(shapes.paisley()); P.m.fillStyle = orm(pal.clothRough, 0); P.m.fill(shapes.paisley()); });
    P.at(0.02, 0.2, 0, 0.5, 0.5, () => P.fill(shapes.paisley(), pal.threadHi));
    P.at(0.02, 0.3, 0, 0.26, 0.26, () => P.fill(shapes.paisley(), pal.accent2));
  }));
}

/** Small scattered motif. */
export function buti(P: Painter, x: number, y: number, size: number, pal: Palette, kind: number, sxComp = 1) {
  const ar = 1;
  P.at(x, y, 0, sxComp, 1, () => {
    if (kind === 0) {
      P.at(0, 0, 0, size, size * ar, () => {
        for (let i = 0; i < 6; i++) P.at(0, 0, (i / 6) * 6.2832, 1, 1, () => P.fill(shapes.petal(), pal.thread));
        P.at(0, 1.25, 0, 0.3, 0.6, () => P.fill(shapes.leaf(), pal.threadHi));
      });
    } else if (kind === 1) {
      P.at(0, 0, 0, size * 0.6, size * ar, () => P.fill(shapes.diamond(), pal.thread));
      P.at(0, 0, 0, size * 0.28, size * ar * 0.46, () => P.fill(shapes.diamond(), pal.accent));
    } else {
      P.at(0, 0, 0, size, size * ar, () => { for (let i = 0; i < 4; i++) P.at(0, 0, (i / 4) * 6.2832 + 0.785, 0.8, 1, () => P.fill(shapes.leaf(), pal.thread)); });
    }
  });
  P.at(x, y, 0, sxComp, 1, () => P.sequin(0, 0, size * 0.2, pal.sequin));
}

/** Row of scallops (pointing up when dir = -1) with a sequin at each tip. */
export function scallops(P: Painter, y: number, count: number, height: number, dir: number, ink: Ink, tip?: Ink) {
  const w = P.cmW / count;
  for (let i = 0; i < count; i++) {
    const p = new Path2D(); const x0 = i * w;
    p.moveTo(x0, y); p.bezierCurveTo(x0 + w * 0.1, y + dir * height * 1.3, x0 + w * 0.9, y + dir * height * 1.3, x0 + w, y); p.closePath();
    P.fill(p, { ...ink, hatch: false });
    const q = new Path2D(); q.moveTo(x0 + w * 0.14, y); q.bezierCurveTo(x0 + w * 0.22, y + dir * height * 0.95, x0 + w * 0.78, y + dir * height * 0.95, x0 + w * 0.86, y); q.closePath();
    P.c.save(); P.c.globalAlpha = 0.55; P.c.fillStyle = 'rgba(0,0,0,0.5)'; P.c.fill(q); P.c.restore();
    P.h.fillStyle = gray(0.56); P.h.fill(q);
    if (tip) P.sequin(x0 + w / 2, y + dir * height * 1.25, Math.min(w, height) * 0.16, tip);
  }
}

/** Rope-twist line (gota / zari cord). */
export function cord(P: Painter, y: number, thick: number, ink: Ink) {
  P.band(y - thick / 2, y + thick / 2, ink);
  const n = Math.round(P.cmW / (thick * 0.9));
  P.h.save(); P.h.strokeStyle = gray(ink.h - 0.25); P.h.lineWidth = thick * 0.28; P.h.beginPath();
  for (let i = -1; i <= n; i++) { const x = (i / n) * P.cmW; P.h.moveTo(x, y + thick / 2); P.h.lineTo(x + thick * 0.8, y - thick / 2); }
  P.h.stroke(); P.h.restore();
}

/** Flowing vine with leaves and flowers; `count` waves per tile so it repeats. */
export function vine(P: Painter, y: number, amp: number, count: number, pal: Palette) {
  const w = P.cmW / count; const p = new Path2D(); const N = 40 * count;
  for (let i = 0; i <= N; i++) { const x = (i / N) * P.cmW; const yy = y + Math.sin((x / w) * 6.2832) * amp; i ? p.lineTo(x, yy) : p.moveTo(x, yy); }
  P.stroke(p, pal.thread, amp * 0.16);
  const ar = 1;
  for (let i = 0; i < count * 8; i++) {
    const x = ((i + 0.5) / (count * 8)) * P.cmW, ph = (x / w) * 6.2832;
    const yy = y + Math.sin(ph) * amp, slope = Math.cos(ph) * amp * 6.2832 / w, side = i % 2 ? 1 : -1;
    const ang = Math.atan2(slope, 1) + side * 1.05;
    P.at(x, yy, 0, 1, ar, () => P.at(0, 0, ang, amp * 0.2, amp * 0.42, () => P.at(0, -1, 0, 1, 1, () => P.fill(shapes.leaf(), i % 4 < 2 ? pal.thread : pal.threadHi))));
  }
  for (let i = 0; i < count * 2; i++) {
    const x = ((i + 0.5) / (count * 2)) * P.cmW; const up = i % 2 === 0;
    flower(P, x, y + (up ? -1 : 1) * amp * 0.25, amp * 0.5, 8, up ? pal.threadHi : pal.accent, pal.sequin, i);
  }
}

/** Diamond trellis (jaal) with a sequin on every crossing. */
export function jaal(P: Painter, y0: number, y1: number, cols: number, pal: Palette, cell?: number) {
  const w = P.cmW / cols, hgt = cell ?? w * 1.25; const rows = Math.ceil((y1 - y0) / hgt);
  const p = new Path2D();
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const x = c * w, y = y0 + r * hgt;
    p.moveTo(x, y + hgt / 2); p.lineTo(x + w / 2, y); p.lineTo(x + w, y + hgt / 2); p.lineTo(x + w / 2, y + hgt); p.lineTo(x, y + hgt / 2);
  }
  P.all((x) => { x.save(); x.beginPath(); x.rect(-1, y0, P.cmW + 2, y1 - y0); x.clip(); });
  P.stroke(p, pal.thread, w * 0.035);
  for (let r = 0; r <= rows; r++) for (let c = 0; c <= cols; c++) {
    const x = c * w, y = y0 + r * hgt;
    P.sequin(x, y + hgt / 2, w * 0.05, pal.sequin); P.sequin(x + w / 2, y, w * 0.05, pal.sequin);
    if (c < cols && r < rows) buti(P, x + w / 2, y + hgt / 2, w * 0.14, pal, (r + c) % 3 === 0 ? 0 : 2);
  }
  P.all((x) => x.restore());
}
