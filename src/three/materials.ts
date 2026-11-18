import * as THREE from 'three';
import type { FabricTex } from './textures';

/** Shared uniforms: every cloth piece reacts to the same turn of the garment. */
export const sway = { uTwist: { value: 0 }, uFlare: { value: 0 } };

export interface FabricPreset { rough?: number; sheen?: number; sheenColor?: string; sheenRough?: number; normal?: number; opacity?: number; inner?: number; env?: number; aniso?: number }

export const FABRICS: Record<string, FabricPreset> = {
  rawSilk: { sheen: 0.38, sheenRough: 0.38, normal: 1.0, env: 0.95 },
  satin: { sheen: 0.4, sheenRough: 0.3, normal: 0.8, env: 1.25 },
  velvet: { sheen: 1.0, sheenRough: 0.75, normal: 0.9, env: 0.6 },
  georgette: { sheen: 0.28, sheenRough: 0.5, normal: 0.9, opacity: 0.9, env: 0.9 },
  cotton: { sheen: 0.15, sheenRough: 0.9, normal: 0.9, env: 0.6 },
  organza: { sheen: 0.6, sheenRough: 0.35, normal: 0.8, opacity: 0.62, env: 1.2 },
};

export function fabricMaterial(tex: FabricTex, cloth: string, preset: FabricPreset, physical = true): THREE.Material {
  const base = {
    map: tex.map, normalMap: tex.normalMap, roughnessMap: tex.ormMap, metalnessMap: tex.ormMap,
    roughness: 1, metalness: 1, side: THREE.DoubleSide, envMapIntensity: preset.env ?? 1,
    normalScale: new THREE.Vector2(preset.normal ?? 1, preset.normal ?? 1),
    transparent: (preset.opacity ?? 1) < 1, opacity: preset.opacity ?? 1,
  };
  let m: THREE.MeshStandardMaterial;
  if (physical) {
    const sc = new THREE.Color(preset.sheenColor ?? cloth).lerp(new THREE.Color('#ffe9d0'), 0.18);
    m = new THREE.MeshPhysicalMaterial({ ...base, sheen: preset.sheen ?? 0.5, sheenColor: sc, sheenRoughness: preset.sheenRough ?? 0.5 });
  } else m = new THREE.MeshStandardMaterial(base);
  const inner = preset.inner ?? 0.42;
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uTwist = sway.uTwist; sh.uniforms.uFlare = sway.uFlare; sh.uniforms.uInner = { value: inner };
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nattribute float aSway;\nuniform float uTwist;\nuniform float uFlare;')
      .replace('#include <beginnormal_vertex>', `#include <beginnormal_vertex>
        float swK = aSway * aSway; float swA = uTwist * swK; float swC = cos(swA), swS = sin(swA);
        objectNormal.xz = vec2(swC * objectNormal.x - swS * objectNormal.z, swS * objectNormal.x + swC * objectNormal.z);`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        transformed.xz = vec2(swC * transformed.x - swS * transformed.z, swS * transformed.x + swC * transformed.z);
        transformed.xz *= 1.0 + uFlare * swK; transformed.y += uFlare * swK * 0.12;`);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform float uInner;')
      .replace('#include <map_fragment>', '#include <map_fragment>\nif (!gl_FrontFacing) diffuseColor.rgb *= uInner;');
  };
  m.customProgramCacheKey = () => 'fabric' + (physical ? 'P' : 'S') + inner;
  return m;
}
