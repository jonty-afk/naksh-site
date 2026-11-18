// Decides how heavy the 3D may be on this device. No three.js import here on purpose.
export type TierName = 'high' | 'mid' | 'low' | 'none';

export function pickTier(): TierName {
  const q = new URLSearchParams(location.search.slice(1) || location.hash.split('?')[1] || '');
  const forced = q.get('tier') as TierName | null;
  if (q.get('gl') === 'off' || forced === 'none') return 'none';
  let renderer = '';
  try {
    const c = document.createElement('canvas');
    const gl = (c.getContext('webgl2') || c.getContext('webgl')) as WebGLRenderingContext | null;
    if (!gl) return 'none';
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    renderer = String(ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER) || '');
    gl.getExtension('WEBGL_lose_context')?.loseContext();
  } catch { return 'none'; }
  if (forced) return forced;
  const nav = navigator as Navigator & { deviceMemory?: number };
  const mem = nav.deviceMemory ?? 8, cores = navigator.hardwareConcurrency ?? 4;
  const mobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) || (navigator.maxTouchPoints > 1 && Math.min(screen.width, screen.height) < 820);
  const weakGpu = /SwiftShader|llvmpipe|Software|Microsoft Basic|Mali-4|Mali-T|Adreno \(TM\) [345]\d\d|PowerVR SGX|Intel.*HD Graphics [2345]\d{3}|GMA|Iris.*5[01]00/i.test(renderer);
  if (weakGpu || mem <= 2 || cores <= 2) return 'low';
  if (mobile || mem <= 4 || cores <= 4) return 'mid';
  return 'high';
}
