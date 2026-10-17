/** Cristais sólidos e facetados: o valor muda a silhueta, além da cor. */
import * as THREE from 'three';
import { gradienteToon } from '../../render/materiais';

export const CORES_CRISTAIS_XP = ['#61d6bb', '#59bdf1', '#b38af5', '#f4cc68'] as const;
const TAMANHOS = [0.34, 0.43, 0.53, 0.66];

function indice(tipo: number): number {
  return Number.isFinite(tipo) ? Math.max(0, Math.min(3, Math.floor(tipo))) : 0;
}

/** Cada chamada possui sua geometria; descarte junto ao lote, sem cache global. */
export function geometriaCristalXp(tipo: number): THREE.BufferGeometry {
  const t = indice(tipo);
  const pos: number[] = [],
    cores: number[] = [];
  const cor = new THREE.Color();
  const triangulo = (a: number[], b: number[], c: number[], luz: number) => {
    pos.push(...a, ...b, ...c);
    cor.setRGB(luz * 0.9, luz * 0.96, luz);
    for (let k = 0; k < 3; k++) cores.push(cor.r, cor.g, cor.b);
  };
  const cristal = (x: number, z: number, r: number, h: number, lados: number, giro = 0) => {
    const inferior = [x, -h * 0.56, z],
      superior = [x, h * 0.86, z];
    for (let k = 0; k < lados; k++) {
      const a = giro + (k / lados) * Math.PI * 2;
      const b = giro + ((k + 1) / lados) * Math.PI * 2;
      const p = [x + Math.cos(a) * r, -h * 0.08, z + Math.sin(a) * r];
      const q = [x + Math.cos(b) * r, -h * 0.08, z + Math.sin(b) * r];
      const p2 = [x + Math.cos(a) * r * 0.73, h * 0.37, z + Math.sin(a) * r * 0.73];
      const q2 = [x + Math.cos(b) * r * 0.73, h * 0.37, z + Math.sin(b) * r * 0.73];
      const luz = 0.62 + (k % 3) * 0.13;
      triangulo(inferior, q, p, luz * 0.72);
      triangulo(p, q, q2, luz);
      triangulo(p, q2, p2, luz);
      triangulo(p2, q2, superior, Math.min(1, luz + 0.14));
    }
  };
  if (t === 0) cristal(0, 0, 0.76, 0.95, 4, Math.PI / 4);
  if (t === 1) cristal(0, 0, 0.67, 1.16, 6);
  if (t === 2) {
    cristal(0, 0, 0.56, 1.13, 5);
    cristal(-0.53, 0.12, 0.3, 0.7, 4, 0.3);
    cristal(0.47, -0.12, 0.27, 0.57, 4, 0.7);
  }
  if (t === 3) {
    cristal(0, 0, 0.49, 1.2, 6);
    for (let k = 0; k < 4; k++) {
      const a = (k * Math.PI) / 2 + Math.PI / 4;
      cristal(Math.cos(a) * 0.57, Math.sin(a) * 0.57, 0.27, 0.72, 4, a);
    }
  }
  // Aro de assentamento fino: legível sem luz aditiva ou branco estourado.
  for (let k = 0; k < 32; k++) {
    const a = (k * Math.PI) / 16,
      b = ((k + 1) * Math.PI) / 16;
    const p = (ang: number, r: number) => [Math.cos(ang) * r, -0.73, Math.sin(ang) * r];
    triangulo(p(a, 1.04), p(b, 1.04), p(b, 0.96), 0.48);
    triangulo(p(a, 1.04), p(b, 0.96), p(a, 0.96), 0.48);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(cores, 3));
  geo.computeVertexNormals();
  geo.computeBoundingSphere();
  return geo;
}

/** A rampa toon é global; descarte o material, nunca sua gradientMap. */
export function materialCristalXp(tipo: number): THREE.MeshToonMaterial {
  return new THREE.MeshToonMaterial({
    color: '#ffffff',
    vertexColors: true,
    gradientMap: gradienteToon(),
    emissive: CORES_CRISTAIS_XP[indice(tipo)],
    emissiveIntensity: 0.12,
    side: THREE.DoubleSide,
    toneMapped: true,
  });
}

export function visualCristalXp(tipo: number, tempo: number, fase: number) {
  const t = indice(tipo);
  const agora = Number.isFinite(tempo) ? tempo % (Math.PI * 200) : 0;
  const deslocamento = Number.isFinite(fase) ? fase % (Math.PI * 2) : 0;
  const onda = Math.sin(agora * 2.2 + deslocamento);
  const tamanho = TAMANHOS[t];
  return {
    escalaX: tamanho,
    escalaY: tamanho * (1 + onda * 0.035),
    escalaZ: tamanho,
    y: 0.69 + t * 0.07 + onda * 0.075,
    rotacao: (agora * (0.72 - t * 0.07) + deslocamento) % (Math.PI * 2),
    cor: CORES_CRISTAIS_XP[t],
    halo: tamanho * 2.6,
    haloIntensidade: 0.045 + t * 0.012,
    alfa: 0.15 + (onda + 1) * 0.025,
  };
}
