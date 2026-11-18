// Image turntable: drag to turn through photographed/cut-out frames. No 3D work, so it runs on anything.
// Frames are decoded up front and painted onto a canvas, so the picture never goes blank between frames.
// At rest it always settles on a real frame (never a blend of two), so the face is never doubled.
export interface Spin { set(angleDeg: number | null, zoom: number, focusY: number): void; twirl(): void; destroy(): void }

export interface SpinSource {
  dir: string;            // folder, ending in '/'
  n: number;              // frames in a full turn
  firstDeg: number;       // garment angle of frame 0
  pad: number;            // digits in the file name
  /** height (m) at the top of the image, and the height the image spans (for zoom focus) */
  top: number; span: number;
  /** optional: the real angle of each frame (degrees, ascending) when they are not evenly spaced */
  angles?: number[];
  /** crossfade neighbouring frames while turning (only for dense sets; sparse sets ghost) */
  blend?: boolean;
  /** -1 flips which way a drag turns her */
  turn?: 1 | -1;
  /** degrees the frames cover when they are NOT a full circle (e.g. 180: front → side → back). Dragging
   *  either way turns her towards the back and stops there; nothing is mirrored or invented. */
  sweep?: number;
}

export function mountSpin(host: HTMLElement, S: SpinSource): Spin {
  const cv = document.createElement('canvas'); const g = cv.getContext('2d')!;
  Object.assign(cv.style, { position: 'absolute', inset: '0', width: '100%', height: '100%', userSelect: 'none', pointerEvents: 'none', transition: 'transform 1s cubic-bezier(.16,1,.3,1)', willChange: 'transform' });
  cv.setAttribute('aria-hidden', 'true'); host.append(cv); host.style.touchAction = 'pan-y';
  let angle = S.firstDeg, vel = 0, scripted: number | null = null, raf = 0, last = 0, loaded = false, shown = '', dragging = false;
  const frames: (HTMLImageElement | null)[] = [];
  const src = (i: number) => S.dir + String(i).padStart(S.pad, '0') + '.webp';
  const sweep = S.sweep ?? 0;                     // 0 = the frames go all the way round
  const stepDeg = sweep ? sweep / Math.max(1, S.n - 1) : 360 / S.n;
  const frameRel = (i: number) => (S.angles ? S.angles[i] : i * stepDeg);   // frame i's angle from frame 0
  const frameDeg = (i: number) => S.firstDeg + frameRel(i);
  /** how far round she is from frame 0 (a sweep counts either drag direction as turning towards the back) */
  const rel = (deg: number) => (sweep ? Math.min(sweep, Math.abs(deg - S.firstDeg)) : ((((deg - S.firstDeg) % 360) + 360) % 360));
  const clampA = (deg: number) => (sweep ? Math.max(S.firstDeg - sweep, Math.min(S.firstDeg + sweep, deg)) : deg);
  /** continuous frame position for an angle: integer part = frame, fraction = how far to the next one */
  const pos = (deg: number) => {
    const d = rel(deg), A = S.angles;
    if (!A) return d / stepDeg;
    let i = A.length - 1; while (i > 0 && A[i] > d) i--;
    const a0 = A[i], a1 = i + 1 < A.length ? A[i + 1] : sweep ? a0 : A[0] + 360;
    return a1 === a0 ? i : i + (d - a0) / Math.max(1e-6, a1 - a0);
  };
  const nearest = (deg: number) => { const n = S.n, r = Math.round(pos(deg)); return sweep ? Math.min(n - 1, r) : ((r % n) + n) % n; };
  /** the angle of the nearest real frame, next to `deg` */
  const settleTo = (deg: number) => {
    const a = frameRel(nearest(deg));
    if (sweep) return S.firstDeg + (deg < S.firstDeg ? -a : a);
    const abs = S.firstDeg + a; return abs + 360 * Math.round((deg - abs) / 360);
  };
  const load = (i: number) => new Promise<void>((res) => {
    const im = new Image(); im.decoding = 'async'; im.src = src(i);
    const ok = () => { frames[i] = im; if (!shown || i === nearest(angle)) paint(true); res(); };
    (im.decode ? im.decode().then(ok, () => res()) : (im.onload = ok, im.onerror = () => res()));
  });
  const preload = () => {
    if (loaded) return; loaded = true;
    // fill the circle evenly, so turning looks right even before every frame has arrived
    const order: number[] = []; for (let step = Math.max(1, S.n >> 2); step >= 1; step >>= 1) for (let i = 0; i < S.n; i += step) if (!order.includes(i)) order.push(i);
    order.forEach((i) => { if (!frames[i]) load(i); });
  };
  const size = () => {
    const dpr = Math.min(2, devicePixelRatio || 1), w = Math.round(host.clientWidth * dpr), h = Math.round(host.clientHeight * dpr);
    if (w && h && (cv.width !== w || cv.height !== h)) { cv.width = w; cv.height = h; paint(true); }
  };
  const draw = (im: HTMLImageElement, alpha: number) => {
    const s = Math.min(cv.width / im.naturalWidth, cv.height / im.naturalHeight), w = im.naturalWidth * s, h = im.naturalHeight * s;
    g.globalAlpha = alpha; g.drawImage(im, (cv.width - w) / 2, (cv.height - h) / 2, w, h); g.globalAlpha = 1;
  };
  const paint = (force = false) => {
    const moving = dragging || Math.abs(vel) > 2;
    if (S.blend && moving) {                          // dense sets only: crossfade while turning
      const p = pos(angle), n = S.n, i0 = sweep ? Math.floor(p) : ((Math.floor(p) % n) + n) % n, i1 = sweep ? Math.min(n - 1, i0 + 1) : (i0 + 1) % n, t = p - Math.floor(p);
      const a = frames[i0], b = frames[i1];
      if (a && b && t > 0.06 && t < 0.94) {
        const key = i0 + ':' + Math.round(t * 16); if (key === shown && !force) return; shown = key;
        g.clearRect(0, 0, cv.width, cv.height); draw(a, 1 - t); draw(b, t); return;
      }
    }
    const f = nearest(angle); let pick = -1;
    for (let k = 0; k <= S.n / 2 && pick < 0; k++) { if (frames[(f + k) % S.n]) pick = (f + k) % S.n; else if (frames[(f - k + S.n) % S.n]) pick = (f - k + S.n) % S.n; }
    if (pick < 0 || (String(pick) === shown && !force)) return;   // keep the last good frame on screen
    shown = String(pick); g.clearRect(0, 0, cv.width, cv.height); draw(frames[pick]!, 1);
  };
  const kick = () => { if (!raf) { last = performance.now(); raf = requestAnimationFrame(tick); } };
  const tick = (now: number) => {
    raf = 0; const dt = Math.min(0.05, (now - last) / 1000); last = now; let busy = dragging;
    if (!dragging) {
      if (scripted !== null) { const t = sweep ? clampA(scripted) : scripted + 360 * Math.round((angle - scripted) / 360); const d = t - angle; angle += d * Math.min(1, dt * 5); busy = Math.abs(d) > 0.3; }
      else {
        vel *= Math.exp(-dt * 3.2); const was = angle; angle = clampA(angle + vel * dt); if (sweep && angle === was) vel = 0;
        if (Math.abs(vel) < 30) {                       // slow enough: glide onto the nearest real frame
          vel = Math.abs(vel) < 3 ? 0 : vel;
          const d = settleTo(angle) - angle; angle += d * Math.min(1, dt * 9); busy = Math.abs(d) > 0.2 || vel !== 0;
          if (!busy) angle = settleTo(angle);
        } else busy = true;
      }
    }
    paint(); if (busy && !document.hidden) kick();
  };
  const ac = new AbortController(), o = { signal: ac.signal }; let px = 0, py = 0, id = -1, decided = false, lt = 0;
  host.addEventListener('pointerdown', (e) => { id = e.pointerId; px = e.clientX; py = e.clientY; decided = e.pointerType === 'mouse'; dragging = decided; lt = performance.now(); preload(); if (decided) { host.classList.add('is-dragging'); try { host.setPointerCapture(id); } catch { /* pointer already gone */ } } }, o);
  host.addEventListener('pointermove', (e) => {
    if (e.pointerId !== id) return; const dx = e.clientX - px, dy = e.clientY - py;
    if (!decided) { if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return; if (Math.abs(dy) > Math.abs(dx)) { id = -1; return; } decided = true; dragging = true; try { host.setPointerCapture(id); } catch { /* pointer already gone */ } }
    px = e.clientX; py = e.clientY; const now = performance.now(), dt = Math.max(8, now - lt) / 1000; lt = now;
    const da = (S.turn ?? 1) * (dx / Math.max(320, host.clientWidth)) * (sweep ? 240 : 300); angle = clampA(angle + da); vel = Math.max(-700, Math.min(700, da / dt)); scripted = null;
    host.dispatchEvent(new CustomEvent('stage:turned')); paint(); kick();
  }, o);
  const end = (e: PointerEvent) => { if (e.pointerId === id) { id = -1; dragging = false; host.classList.remove('is-dragging'); if (performance.now() - lt > 90) vel = 0; kick(); } };
  host.addEventListener('pointerup', end, o); host.addEventListener('pointercancel', end, o);
  host.addEventListener('keydown', (e) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    const i = nearest(angle), step = (e.key === 'ArrowRight' ? 1 : -1) * (sweep ? 1 : S.turn ?? 1); scripted = null; vel = 0; preload();
    angle = sweep ? frameDeg(Math.max(0, Math.min(S.n - 1, i + step))) : settleTo(frameDeg((i + step + S.n) % S.n) + (step > 0 && i === S.n - 1 ? 360 : 0)); e.preventDefault(); paint(true);
  }, o);
  document.addEventListener('visibilitychange', kick, o);
  const ro = new ResizeObserver(size); ro.observe(host); size();
  load(nearest(angle)).then(preload);
  return {
    set(a, zoom, focusY) {
      if (a !== null) { scripted = a; preload(); } else scripted = null;
      const oo = Math.max(0, Math.min(1, (S.top - focusY) / S.span)), H = host.clientHeight, lim = 0.5 * H * (zoom - 1);
      const ty = Math.max(-lim, Math.min(lim, -(oo - 0.5) * H * zoom));
      cv.style.transformOrigin = '50% 50%'; cv.style.transform = `translateY(${ty.toFixed(1)}px) scale(${zoom})`; kick();
    },
    /** a nudge, to show that she turns */
    twirl() { preload(); scripted = null; vel = 420; kick(); },
    destroy() { ac.abort(); ro.disconnect(); cancelAnimationFrame(raf); cv.remove(); },
  };
}
