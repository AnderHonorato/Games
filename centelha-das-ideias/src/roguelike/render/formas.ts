/**
 * Geometrias dos inimigos e projéteis (fundidas em uma malha por tipo, para instanciar).
 */
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { IdInimigo } from '../dados/inimigos';
import { criarAparenciaInimigo } from './aparencia-inimigos';

function juntar(partes: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const limpas = partes.map((g) => {
    const n = g.index ? g.toNonIndexed() : g;
    for (const nome of Object.keys(n.attributes))
      if (nome !== 'position' && nome !== 'normal') n.deleteAttribute(nome);
    return n;
  });
  const r = mergeGeometries(limpas, false)!;
  r.computeVertexNormals();
  return r;
}

function em(
  g: THREE.BufferGeometry,
  x: number,
  y: number,
  z: number,
  sx = 1,
  sy = 1,
  sz = 1,
  rx = 0,
  ry = 0,
  rz = 0
): THREE.BufferGeometry {
  g.scale(sx, sy, sz);
  g.rotateX(rx);
  g.rotateY(ry);
  g.rotateZ(rz);
  g.translate(x, y, z);
  return g;
}

/** Corpo fechado e colorido, fundido por tipo para continuar usando instancing. */
export function geometriaInimigo(id: IdInimigo): THREE.BufferGeometry {
  return criarAparenciaInimigo(id);
}

/** Altura dos olhos de cada inimigo (unidade). */
export const OLHOS: Record<IdInimigo, { y: number; z: number; sep: number; tam: number }> = {
  chiado: { y: 0.61, z: 0.37, sep: 0.16, tam: 0.075 },
  spam: { y: 0.48, z: 0.37, sep: 0.13, tam: 0.065 },
  zumbido: { y: 1.29, z: 0.54, sep: 0.13, tam: 0.075 },
  estatica: { y: 1.4, z: 0.37, sep: 0.18, tam: 0.09 },
  alucinacao: { y: 1.13, z: 0.35, sep: 0.12, tam: 0.075 },
  glitch: { y: 1.08, z: 0.29, sep: 0.12, tam: 0.07 },
  trollBug: { y: 0.92, z: 1.12, sep: 0.18, tam: 0.1 },
  chefe: { y: 2.4, z: 0.58, sep: 0.25, tam: 0.135 },
  virus: { y: 0.64, z: 0.35, sep: 0.14, tam: 0.075 },
  verme: { y: 0.48, z: 0.56, sep: 0.13, tam: 0.07 },
  trojan: { y: 0.66, z: 0.5, sep: 0.2, tam: 0.06 },
  loopInfinito: { y: 1.05, z: 0.3, sep: 0.1, tam: 0.065 },
  vazamento: { y: 0.62, z: 0.54, sep: 0.17, tam: 0.085 },
  ponteiroNulo: { y: 1.2, z: 0.34, sep: 0.11, tam: 0.065 },
  pilha: { y: 1.63, z: 0.36, sep: 0.15, tam: 0.075 },
  bloco: { y: 0.42, z: 0.37, sep: 0.12, tam: 0.065 },
  ransomware: { y: 2.06, z: 0.39, sep: 0.22, tam: 0.12 },
  morcegoRunico: { y: 1.65, z: 0.39, sep: 0.12, tam: 0.08 },
  arraiaCeleste: { y: 1.93, z: 0.52, sep: 0.19, tam: 0.07 },
};

/** Formas dos projéteis. */
export type FormaProjetil =
  'orbe' | 'lanca' | 'lamina' | 'disco' | 'serra' | 'cristal' | 'estrela' | 'gota';

export function geometriaProjetil(f: FormaProjetil): THREE.BufferGeometry {
  switch (f) {
    case 'orbe':
      return new THREE.IcosahedronGeometry(0.5, 1);
    case 'lanca': {
      const g = new THREE.ConeGeometry(0.18, 1.6, 6);
      g.rotateX(Math.PI / 2);
      return g;
    }
    case 'lamina': {
      const g = new THREE.TorusGeometry(0.5, 0.08, 4, 16, Math.PI * 1.3);
      g.rotateX(Math.PI / 2);
      return g;
    }
    case 'disco': {
      const g = new THREE.CylinderGeometry(0.5, 0.5, 0.12, 20);
      return g;
    }
    case 'serra': {
      const partes: THREE.BufferGeometry[] = [new THREE.CylinderGeometry(0.5, 0.5, 0.08, 18)];
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * Math.PI * 2;
        partes.push(
          em(
            new THREE.ConeGeometry(0.1, 0.25, 3),
            Math.cos(a) * 0.58,
            0,
            Math.sin(a) * 0.58,
            1,
            1,
            1,
            0,
            -a,
            -Math.PI / 2
          )
        );
      }
      return juntar(partes);
    }
    case 'cristal':
      return new THREE.OctahedronGeometry(0.5, 0);
    case 'estrela': {
      const g = new THREE.OctahedronGeometry(0.5, 0);
      g.scale(1, 0.4, 1);
      return g;
    }
    case 'gota':
      return new THREE.SphereGeometry(0.5, 10, 8);
  }
}
