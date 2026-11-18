// A "living picture": a silent, looping, see-through video of the figure turning, played over its still.
// It is an ADD-ON. The still stays exactly as it is until the video is really playing AND a pixel test shows
// its background is see-through in this browser; only then does the video fade in over the still. If
// anything is not right (no support, a slow or metered connection, reduced motion, a stall, an error),
// the video is removed and the visitor keeps the still. It can never show a box or a blank figure.
//
// Two files, because browsers disagree on see-through video:
//   turn.webm  VP9 with alpha  → Chrome, Edge, Firefox, Android
//   turn.mov   HEVC with alpha → Safari on iPhone, iPad and Mac
// Made by ai-model/make_turn_video.sh.
export interface LoopSource { dir: string }   // folder ending in '/', holding turn.webm and turn.mov

export function mountLoop(host: HTMLElement, still: HTMLImageElement, S: LoopSource): () => void {
  const nav = navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } };
  if (matchMedia('(prefers-reduced-motion: reduce)').matches || nav.connection?.saveData || /(^|-)2g$/.test(nav.connection?.effectiveType ?? '')) return () => {};
  if (!('IntersectionObserver' in window)) return () => {};

  let dead = false, seen = false, live = false, asked = false, v: HTMLVideoElement | null = null;
  const ac = new AbortController();

  const bail = () => {
    if (dead) return; dead = true; ac.abort(); io.disconnect();
    still.style.opacity = '';
    if (v) { v.pause(); v.removeAttribute('src'); v.load(); v.remove(); v = null; }
  };
  const sync = () => { if (!v || !live) return; if (seen && !document.hidden) v.play().catch(() => {}); else v.pause(); };

  /** Is the video's corner see-through and its middle solid? (Proves alpha really works in this browser.) */
  const seeThrough = (el: HTMLVideoElement) => {
    try {
      const c = document.createElement('canvas'); c.width = 64; c.height = 64;
      const g = c.getContext('2d', { willReadFrequently: true }); if (!g) return false;
      g.clearRect(0, 0, 64, 64); g.drawImage(el, 0, 0, 64, 64);
      const corner = g.getImageData(1, 1, 1, 1).data[3], mid = g.getImageData(32, 34, 1, 1).data[3];
      return corner < 8 && mid > 200;
    } catch { return false; }
  };

  const tryOne = (srcs: [string, string][]) => {
    const pick = srcs.shift(); if (!pick || dead) { bail(); return; }
    const [file, type] = pick;
    if (!document.createElement('video').canPlayType(type)) { tryOne(srcs); return; }
    const el = document.createElement('video');
    el.className = 'lu__loop'; el.setAttribute('aria-hidden', 'true');
    el.muted = true; el.defaultMuted = true; el.loop = true; el.playsInline = true; el.preload = 'auto';
    el.setAttribute('muted', ''); el.setAttribute('playsinline', ''); el.disablePictureInPicture = true;
    const o = { signal: ac.signal };
    let checked = false;
    const fail = () => { if (checked && live) { bail(); return; } el.remove(); if (v === el) v = null; tryOne(srcs); };
    el.addEventListener('error', fail, o);
    el.addEventListener('playing', () => {
      if (checked || dead) return;
      // wait for a painted frame, then test it
      const test = () => {
        if (dead) return; checked = true;
        if (!seeThrough(el)) { el.pause(); fail(); return; }
        live = true; el.classList.add('on');
        setTimeout(() => { if (!dead && live) still.style.opacity = '0'; }, 650);
        sync();
      };
      const rv = (el as HTMLVideoElement & { requestVideoFrameCallback?: (cb: () => void) => void }).requestVideoFrameCallback;
      rv ? rv.call(el, test) : setTimeout(test, 120);
    }, o);
    // a video that stops for good while showing: put the still back
    el.addEventListener('stalled', () => { if (live) setTimeout(() => { if (!dead && el.readyState < 3) bail(); }, 4000); }, o);
    v = el; host.append(el); el.src = S.dir + file;
    el.play().catch(() => fail());
    // nothing playing after 25 s (slow line): give up quietly
    setTimeout(() => { if (!dead && !live && v === el) bail(); }, 25000);
  };

  const io = new IntersectionObserver((es) => {
    seen = es.some((e) => e.isIntersecting);
    if (seen && !asked) {
      asked = true;
      // wait for the page itself first, so the video never slows the first view down
      const go = () => setTimeout(() => tryOne([['turn.webm', 'video/webm; codecs="vp9"'], ['turn.mov', 'video/mp4; codecs="hvc1"']]), 600);
      document.readyState === 'complete' ? go() : addEventListener('load', go, { once: true, signal: ac.signal });
    }
    sync();
  }, { threshold: 0.15 });
  io.observe(host);
  document.addEventListener('visibilitychange', sync, { signal: ac.signal });
  return bail;
}
