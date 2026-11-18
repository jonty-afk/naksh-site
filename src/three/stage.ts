import * as THREE from 'three';
import { sway } from './materials';
import type { Outfit } from './garments';

const clamp = THREE.MathUtils.clamp;

/**
 * The one WebGL view on the site. The canvas is fixed behind the page; the garment is
 * drawn wherever `frameEl` sits on screen, so page layout (and CSS sticky) places the 3D.
 * Drag on `bindTo(el)` turns the garment; cloth lags and flares with the turn.
 */
export class Stage {
  renderer: THREE.WebGLRenderer; scene = new THREE.Scene(); camera: THREE.PerspectiveCamera;
  table = new THREE.Group(); outfit: Outfit | null = null; shadow: THREE.Mesh;
  angle = -0.45; vel = 0; tilt = 0.04; autoSpin = 0.22; dragging = false; touched = false;
  /** where the camera wants to be (eased) */
  want = { zoom: 1, focusY: 0.76 }; cur = { zoom: 1, focusY: 0.76 };
  /** scroll-driven direction: when weight > 0 the angle eases to `angle` */
  script: { angle: number; weight: number } | null = null;
  frameEl: HTMLElement | null = null;
  onFrame?: (dt: number) => void; frames = 0; slowFrames = 0;
  private twist = 0; private twistV = 0; private flare = 0; private last = 0; private raf = 0; private unbind?: AbortController;
  private keyLight: THREE.DirectionalLight; private w = 0; private h = 0;

  constructor(public canvas: HTMLCanvasElement, opts: { dpr: number; shadows: boolean }) {
    const r = this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
    r.setPixelRatio(opts.dpr); r.toneMapping = THREE.ACESFilmicToneMapping; r.toneMappingExposure = 1.05;
    r.outputColorSpace = THREE.SRGBColorSpace; r.setClearColor(0x000000, 0);
    r.shadowMap.enabled = opts.shadows; r.shadowMap.type = THREE.PCFShadowMap;
    this.camera = new THREE.PerspectiveCamera(26, 1, 0.1, 40);
    this.scene.environment = makeStudioEnv(r);
    const key = this.keyLight = new THREE.DirectionalLight(0xfff0dc, 1.5); key.position.set(-2.6, 3.6, 3.2);
    if (opts.shadows) { key.castShadow = true; key.shadow.mapSize.set(2048, 2048); const c = key.shadow.camera; c.left = -1.2; c.right = 1.2; c.top = 1.9; c.bottom = -0.4; c.near = 1; c.far = 9; key.shadow.bias = -0.0004; key.shadow.normalBias = 0.012; key.shadow.radius = 4; }
    const rim = new THREE.DirectionalLight(0xbfd4ff, 1.1); rim.position.set(3, 2.4, -3.4);
    const kick = new THREE.DirectionalLight(0xffd9a8, 0.55); kick.position.set(3.2, 1.2, 2.6);
    this.scene.add(key, rim, kick, this.table);
    this.shadow = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: blobTexture(), transparent: true, depthWrite: false, opacity: 0.8 }));
    this.shadow.rotation.x = -Math.PI / 2; this.shadow.position.y = 0.002; this.scene.add(this.shadow);
    this.resize();
    new ResizeObserver(() => this.resize()).observe(canvas);
    addEventListener('scroll', () => this.invalidate(), { passive: true });
    document.addEventListener('visibilitychange', () => { if (!document.hidden) this.invalidate(); });
    canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); document.documentElement.classList.add('gl-lost'); });
    this.invalidate();
  }

  setOutfit(o: Outfit) {
    if (this.outfit) { this.table.remove(this.outfit.group); this.outfit.dispose(); }
    this.outfit = o; this.table.add(o.group);
    const s = o.hemRadius * 3.1; this.shadow.scale.set(s, s, 1); this.invalidate();
  }

  /** Evening / daylight / festive: same garment, different light. */
  setLight(mode: 'evening' | 'day' | 'festive') {
    const r = this.renderer;
    if (mode === 'day') { r.toneMappingExposure = 1.3; this.keyLight.color.set(0xf4f6ff); this.keyLight.intensity = 1.9; }
    else if (mode === 'festive') { r.toneMappingExposure = 0.92; this.keyLight.color.set(0xffc27a); this.keyLight.intensity = 2.3; }
    else { r.toneMappingExposure = 1.05; this.keyLight.color.set(0xfff0dc); this.keyLight.intensity = 1.5; }
    this.invalidate();
  }

  invalidate() { if (!this.raf) { this.last = performance.now(); this.raf = requestAnimationFrame(this.tick); } }

  resize() {
    const w = this.canvas.clientWidth || innerWidth, h = this.canvas.clientHeight || innerHeight;
    if (w === this.w && h === this.h) return;                 // phone toolbars fire resize constantly
    this.w = w; this.h = h;
    this.renderer.setSize(w, h, false); this.camera.aspect = w / h; this.camera.updateProjectionMatrix(); this.invalidate();
  }

  /** Drag on this element turns the garment. Vertical touch drags still scroll the page. */
  bindTo(el: HTMLElement | null) {
    this.unbind?.abort(); if (!el) return;
    const ac = this.unbind = new AbortController(); const o = { signal: ac.signal };
    let px = 0, py = 0, id = -1, decided = false, lastT = 0, lastTap = 0;
    el.style.touchAction = 'pan-y';
    el.addEventListener('pointerdown', (e) => {
      id = e.pointerId; px = e.clientX; py = e.clientY; decided = e.pointerType === 'mouse'; this.dragging = decided; lastT = performance.now();
      if (decided) { try { el.setPointerCapture(id); } catch { /* pointer already gone */ } el.classList.add('is-dragging'); }
    }, o);
    el.addEventListener('pointermove', (e) => {
      if (e.pointerId !== id) return;
      const dx = e.clientX - px, dy = e.clientY - py;
      if (!decided) {
        if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
        if (Math.abs(dy) > Math.abs(dx)) { id = -1; return; }      // a vertical swipe: let the page scroll
        decided = true; this.dragging = true; try { el.setPointerCapture(id); } catch { /* pointer already gone */ } el.classList.add('is-dragging');
      }
      px = e.clientX; py = e.clientY; const now = performance.now(), dt = Math.max(8, now - lastT) / 1000; lastT = now;
      const da = (dx / Math.max(320, el.clientWidth)) * 4.6;
      this.angle += da; this.vel = clamp(da / dt, -14, 14); this.touched = true;
      if (e.pointerType === 'mouse') this.tilt = clamp(this.tilt + dy * 0.0014, -0.08, 0.32);
      el.dispatchEvent(new CustomEvent('stage:turned')); this.invalidate();
    }, o);
    const end = (e: PointerEvent) => {
      if (e.pointerId !== id) return; id = -1; el.classList.remove('is-dragging');
      const now = performance.now();
      if (!this.dragging || (Math.abs(e.clientX - px) < 4 && now - lastT < 250 && !this.vel)) { if (now - lastTap < 320) this.want.zoom = this.want.zoom > 1.2 ? 1 : 2; lastTap = now; }
      this.dragging = false; if (now - lastT > 90) this.vel = 0; this.invalidate();
    };
    el.addEventListener('pointerup', end, o); el.addEventListener('pointercancel', end, o);
    el.addEventListener('wheel', (e) => { if (!e.ctrlKey) return; e.preventDefault(); this.want.zoom = clamp(this.want.zoom * Math.exp(-e.deltaY * 0.01), 1, 2.8); this.invalidate(); }, { passive: false, signal: ac.signal });
    el.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft') this.vel = -3; else if (e.key === 'ArrowRight') this.vel = 3; else if (e.key === '+' || e.key === '=') this.want.zoom = clamp(this.want.zoom * 1.25, 1, 2.8); else if (e.key === '-') this.want.zoom = clamp(this.want.zoom / 1.25, 1, 2.8); else return;
      this.touched = true; e.preventDefault(); this.invalidate();
    }, o);
  }

  /** Render one still at a fixed size and angle (used to export turntable frames). */
  async snapshot(w: number, h: number, angle: number, type = 'image/webp', quality = 0.86): Promise<Blob> {
    const r = this.renderer, pr = r.getPixelRatio(), cam = this.camera;
    r.setPixelRatio(1); r.setSize(w, h, false); cam.clearViewOffset(); cam.aspect = w / h; cam.updateProjectionMatrix();
    const half = Math.tan(THREE.MathUtils.degToRad(cam.fov) / 2), d = Math.max(1.66 / (2 * half), 1.3 / (2 * half * cam.aspect));
    cam.position.set(0, 0.76 + Math.sin(0.05) * d, Math.cos(0.05) * d); cam.lookAt(0, 0.76, 0);
    sway.uTwist.value = 0; sway.uFlare.value = 0; this.table.rotation.y = angle; this.canvas.style.visibility = 'visible';
    r.render(this.scene, cam);
    const blob = await new Promise<Blob>((res) => this.canvas.toBlob((b) => res(b!), type, quality));
    r.setPixelRatio(pr); this.w = 0; this.resize(); return blob;
  }

  /** Spin with a flourish (the Twirl button). */
  twirl() { this.vel = 10; this.touched = true; this.invalidate(); }

  private tick = (now: number) => {
    this.raf = 0; const dt = Math.min(0.05, (now - this.last) / 1000); this.last = now;
    const vw = this.w || innerWidth, vh = this.h || innerHeight;
    const rect = this.frameEl?.isConnected ? this.frameEl.getBoundingClientRect() : null;
    const visible = !!rect && rect.bottom > -40 && rect.top < vh + 40 && rect.width > 4;
    this.canvas.style.visibility = visible ? 'visible' : 'hidden';

    const sw = this.script?.weight ?? 0;
    if (!this.dragging) {
      if (sw > 0.001 && this.script) {
        const target = this.script.angle + Math.PI * 2 * Math.round((this.angle - this.script.angle) / (Math.PI * 2));
        const k = Math.min(1, dt * 4.5 * sw); const before = this.angle;
        this.angle += (target - this.angle) * k; this.vel = dt > 0 ? (this.angle - before) / dt : 0;
      } else {
        const idle = this.touched ? 0 : this.autoSpin;
        this.vel += (idle - this.vel) * Math.min(1, dt * (this.touched ? 1.4 : 3));
        this.angle += this.vel * dt;
      }
    }
    // cloth lags behind the turn and settles with a soft overshoot
    const target = clamp(-this.vel * 0.055, -0.55, 0.55);
    this.twistV += ((target - this.twist) * 46 - this.twistV * 7.5) * dt; this.twist += this.twistV * dt;
    this.flare += (Math.min(0.16, Math.abs(this.vel) * 0.016) - this.flare) * Math.min(1, dt * 5);
    sway.uTwist.value = this.twist; sway.uFlare.value = this.flare;
    this.table.rotation.y = this.angle;
    const ez = Math.min(1, dt * 3.2);
    this.cur.zoom += (this.want.zoom - this.cur.zoom) * ez; this.cur.focusY += (this.want.focusY - this.cur.focusY) * ez;

    let moving = Math.abs(this.vel) > 0.003 || Math.abs(this.twistV) > 0.003 || Math.abs(this.twist - target) > 0.001 || this.dragging
      || Math.abs(this.want.zoom - this.cur.zoom) > 0.002 || Math.abs(this.want.focusY - this.cur.focusY) > 0.002;
    if (visible && rect) {
      const half = Math.tan(THREE.MathUtils.degToRad(this.camera.fov) / 2);
      const hf = Math.min(rect.height, vh) / vh, wf = Math.min(rect.width, vw) / vw;
      const d = Math.max(1.74 / (2 * half * hf), 1.42 / (2 * half * this.camera.aspect * wf)) / this.cur.zoom;
      const cx = rect.left + rect.width / 2, cy = rect.top + rect.height / 2;
      this.camera.setViewOffset(vw, vh, -(cx - vw / 2), -(cy - vh / 2), vw, vh);
      const y = this.cur.focusY;
      this.camera.position.set(0, y + Math.sin(this.tilt) * d, Math.cos(this.tilt) * d); this.camera.lookAt(0, y, 0);
      this.onFrame?.(dt);
      this.renderer.render(this.scene, this.camera);
      this.frames++; if (dt > 0.034) this.slowFrames++;
    } else moving = false;
    if (moving && !document.hidden) this.invalidate();
  };
}

function makeStudioEnv(r: THREE.WebGLRenderer): THREE.Texture {
  const s = new THREE.Scene(); s.background = new THREE.Color(0x07050a);
  const panel = (w: number, h: number, col: number, k: number, p: [number, number, number]) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(col).multiplyScalar(k), side: THREE.DoubleSide, toneMapped: false }));
    m.position.set(...p); m.lookAt(0, 0.9, 0); s.add(m);
  };
  panel(3.2, 3.6, 0xfff0dc, 10, [-3.4, 3.2, 3.6]);   // warm key softbox
  panel(4, 3, 0xffe6cc, 2.2, [4.2, 1.4, 3.2]);        // fill
  panel(1.6, 4.4, 0xc4d6ff, 9, [3.6, 2.6, -4]);       // cool rim
  panel(1.4, 4, 0xffdcb0, 5, [-4.2, 2, -3]);          // warm rim
  panel(5, 5, 0xfff6ea, 1.6, [0, 6.5, 0.2]);          // top
  panel(9, 9, 0x5a4034, 0.5, [0, -2.2, 0]);           // floor bounce
  for (let i = 0; i < 7; i++) panel(0.22, 0.22, 0xfff3d6, 26, [Math.sin(i * 2.4) * 4.5, 2.6 + (i % 3) * 0.9, Math.cos(i * 2.4) * 4.5]); // small lamps make sequins flash
  const pm = new THREE.PMREMGenerator(r); const t = pm.fromScene(s, 0.035).texture; pm.dispose();
  s.traverse((o) => { const m = o as THREE.Mesh; if (m.isMesh) { m.geometry.dispose(); (m.material as THREE.Material).dispose(); } });
  return t;
}

function blobTexture(): THREE.Texture {
  const c = document.createElement('canvas'); c.width = c.height = 256; const x = c.getContext('2d')!;
  const g = x.createRadialGradient(128, 128, 0, 128, 128, 128);
  g.addColorStop(0, 'rgba(0,0,0,0.9)'); g.addColorStop(0.45, 'rgba(0,0,0,0.55)'); g.addColorStop(0.75, 'rgba(0,0,0,0.16)'); g.addColorStop(1, 'rgba(0,0,0,0)');
  x.fillStyle = g; x.fillRect(0, 0, 256, 256); return new THREE.CanvasTexture(c);
}
