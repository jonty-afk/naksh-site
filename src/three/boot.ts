// Loaded lazily (dynamic import) so the page paints before any 3D code arrives.
import { Stage } from './stage';
import { buildOutfit, TIERS } from './garments';
import type { Product } from '../data/products';
import type { TierName } from './quality';

export interface Studio { stage: Stage; tier: TierName; show(p: Product, colourway?: number): Promise<void>; current: string }

export function createStudio(canvas: HTMLCanvasElement, tierName: Exclude<TierName, 'none'>): Studio {
  const tier = TIERS[tierName];
  const dpr = Math.min(devicePixelRatio || 1, tierName === 'high' ? 2 : tierName === 'mid' ? 1.5 : 1);
  const stage = new Stage(canvas, { dpr, shadows: tierName === 'high' });
  const studio: Studio = {
    stage, tier: tierName, current: '',
    async show(p, cw = 0) {
      const key = p.slug + ':' + cw; if (studio.current === key) return; studio.current = key;
      await new Promise((r) => setTimeout(r, 0));                       // let the page paint first
      const c = p.colourways[cw] ?? p.colourways[0];
      const o = buildOutfit({ ...p.outfit, cloth: c.cloth, thread: c.thread, accent: c.accent, accent2: c.accent2, dupatta: c.dupatta, bottom: c.bottom }, tier);
      if (studio.current !== key) { o.dispose(); return; }
      stage.setOutfit(o);
    },
  };
  // if the first seconds are choppy, drop the resolution rather than the experience
  setTimeout(() => { if (stage.frames > 20 && stage.slowFrames / stage.frames > 0.35) { stage.renderer.setPixelRatio(1); stage.renderer.shadowMap.enabled = false; stage.renderer.setSize(canvas.clientWidth, canvas.clientHeight, false); stage.invalidate(); } }, 5000);
  (window as unknown as { __stage?: Stage }).__stage = stage;   // for testing from the console
  return studio;
}
