import * as THREE from 'three';

export type SurfFn = (u: number, v: number, out: THREE.Vector3) => void;

export interface SurfOpts {
  closedU?: boolean;
  /** 0 = pinned, 1 = free hem. Drives the fabric sway shader. */
  sway?: (u: number, v: number) => number;
  /** custom texture coordinates (default u,v) */
  uv?: (u: number, v: number) => [number, number];
  flip?: boolean;
}

const A = new THREE.Vector3(), B = new THREE.Vector3(), C = new THREE.Vector3(), D = new THREE.Vector3();
const DU = new THREE.Vector3(), DV = new THREE.Vector3(), N = new THREE.Vector3(), P = new THREE.Vector3();

/** Parametric surface with normals taken from the function itself (no seams). */
export function buildSurface(fn: SurfFn, uSeg: number, vSeg: number, o: SurfOpts = {}): THREE.BufferGeometry {
  const nu = uSeg + 1, nv = vSeg + 1;
  const pos = new Float32Array(nu * nv * 3), nor = new Float32Array(nu * nv * 3);
  const uvs = new Float32Array(nu * nv * 2), sway = new Float32Array(nu * nv);
  const e = 0.0015;
  let k = 0;
  for (let j = 0; j < nv; j++) {
    const v = j / vSeg;
    for (let i = 0; i < nu; i++, k++) {
      const u = i / uSeg;
      fn(u, v, P);
      const u0 = o.closedU ? u - e : Math.max(0, u - e), u1 = o.closedU ? u + e : Math.min(1, u + e);
      const v0 = Math.max(0, v - e), v1 = Math.min(1, v + e);
      fn(u1, v, A); fn(u0, v, B); fn(u, v1, C); fn(u, v0, D);
      DU.subVectors(A, B); DV.subVectors(C, D);
      N.crossVectors(DU, DV);
      if (N.lengthSq() < 1e-16) N.set(0, 1, 0); else N.normalize();
      if (o.flip) N.negate();
      pos[k * 3] = P.x; pos[k * 3 + 1] = P.y; pos[k * 3 + 2] = P.z;
      nor[k * 3] = N.x; nor[k * 3 + 1] = N.y; nor[k * 3 + 2] = N.z;
      const t = o.uv ? o.uv(u, v) : [u, v];
      uvs[k * 2] = t[0]; uvs[k * 2 + 1] = 1 - t[1];
      sway[k] = o.sway ? o.sway(u, v) : 0;
    }
  }
  const idx = new (nu * nv > 65535 ? Uint32Array : Uint16Array)(uSeg * vSeg * 6);
  let q = 0;
  for (let j = 0; j < vSeg; j++) for (let i = 0; i < uSeg; i++) {
    const a = j * nu + i, b = a + 1, c = a + nu, d = c + 1;
    if (o.flip) { idx[q++] = a; idx[q++] = c; idx[q++] = b; idx[q++] = b; idx[q++] = c; idx[q++] = d; }
    else { idx[q++] = a; idx[q++] = b; idx[q++] = c; idx[q++] = b; idx[q++] = d; idx[q++] = c; }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  g.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  g.setAttribute('aSway', new THREE.BufferAttribute(sway, 1));
  g.setIndex(new THREE.BufferAttribute(idx, 1));
  g.computeBoundingSphere();
  return g;
}

/** Smooth curve through (x,y) knots sorted by x. */
export function curve(pts: [number, number][]): (x: number) => number {
  const p = pts.slice().sort((a, b) => a[0] - b[0]);
  const n = p.length;
  const m = p.map((_, i) => {
    if (i === 0) return (p[1][1] - p[0][1]) / (p[1][0] - p[0][0]);
    if (i === n - 1) return (p[n - 1][1] - p[n - 2][1]) / (p[n - 1][0] - p[n - 2][0]);
    return (p[i + 1][1] - p[i - 1][1]) / (p[i + 1][0] - p[i - 1][0]);
  });
  return (x: number) => {
    if (x <= p[0][0]) return p[0][1];
    if (x >= p[n - 1][0]) return p[n - 1][1];
    let i = 0; while (x > p[i + 1][0]) i++;
    const h = p[i + 1][0] - p[i][0], t = (x - p[i][0]) / h, t2 = t * t, t3 = t2 * t;
    return (2 * t3 - 3 * t2 + 1) * p[i][1] + (t3 - 2 * t2 + t) * h * m[i] + (-2 * t3 + 3 * t2) * p[i + 1][1] + (t3 - t2) * h * m[i + 1];
  };
}

export const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);
export const smooth = (a: number, b: number, x: number) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** Deterministic random so every visitor sees the same garment. */
export function rng(seed: number) {
  let s = seed >>> 0;
  return () => { s = (s + 0x6d2b79f5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
