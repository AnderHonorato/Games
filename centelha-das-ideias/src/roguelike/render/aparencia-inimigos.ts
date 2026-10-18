/** Criaturas de baixo custo: todas as partes e suas cores viram um único draw por tipo. */
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { IdInimigo } from '../dados/inimigos';

/** Tetos incluem os detalhes do rosto; nenhum tipo precisa de materiais adicionais. */
export const ORCAMENTO_VERTICES_INIMIGO = 6000;

class Criatura {
  private partes: THREE.BufferGeometry[] = [];

  parte(
    g: THREE.BufferGeometry,
    cor: string,
    x: number,
    y: number,
    z: number,
    sx = 1,
    sy = 1,
    sz = 1,
    rx = 0,
    ry = 0,
    rz = 0
  ): void {
    g.scale(sx, sy, sz).rotateX(rx).rotateY(ry).rotateZ(rz).translate(x, y, z);
    const limpa = g.index ? g.toNonIndexed() : g;
    if (limpa !== g) g.dispose();
    for (const atributo of Object.keys(limpa.attributes))
      if (atributo !== 'position' && atributo !== 'normal') limpa.deleteAttribute(atributo);
    const rgb = new THREE.Color(cor);
    const cores = new Float32Array(limpa.getAttribute('position').count * 3);
    for (let i = 0; i < cores.length; i += 3) {
      cores[i] = rgb.r;
      cores[i + 1] = rgb.g;
      cores[i + 2] = rgb.b;
    }
    limpa.setAttribute('color', new THREE.BufferAttribute(cores, 3));
    this.partes.push(limpa);
  }

  corpo(cor: string, x: number, y: number, z: number, sx: number, sy: number, sz: number): void {
    this.parte(new THREE.IcosahedronGeometry(1, 1), cor, x, y, z, sx, sy, sz);
  }

  placa(
    cor: string,
    x: number,
    y: number,
    z: number,
    sx: number,
    sy: number,
    sz: number,
    rz = 0
  ): void {
    this.parte(new THREE.DodecahedronGeometry(1, 0), cor, x, y, z, sx, sy, sz, 0, 0, rz);
  }

  chifre(
    cor: string,
    x: number,
    y: number,
    z: number,
    raio: number,
    altura: number,
    rx = 0,
    rz = 0
  ): void {
    this.parte(new THREE.ConeGeometry(raio, altura, 5), cor, x, y, z, 1, 1, 1, rx, 0, rz);
  }

  haste(
    cor: string,
    x: number,
    y: number,
    z: number,
    raio: number,
    altura: number,
    rx = 0,
    rz = 0
  ): void {
    this.parte(
      new THREE.CylinderGeometry(raio * 0.65, raio, altura, 5),
      cor,
      x,
      y,
      z,
      1,
      1,
      1,
      rx,
      0,
      rz
    );
  }

  anel(
    cor: string,
    x: number,
    y: number,
    z: number,
    raio: number,
    tubo: number,
    rx = 0,
    ry = 0
  ): void {
    this.parte(new THREE.TorusGeometry(raio, tubo, 4, 14), cor, x, y, z, 1, 1, 1, rx, ry);
  }

  /** Membrana com espessura e tampa: visível dos dois lados sem material DoubleSide. */
  asa(
    cor: string,
    lado: number,
    y: number,
    largura: number,
    profundidade: number,
    morcego = false
  ): void {
    const pontos = morcego
      ? [
          [0.15, 0.24],
          [0.58, 0.68],
          [1.3, 0.1],
          [0.86, 0.03],
          [0.7, -0.4],
          [0.44, -0.15],
          [0.18, -0.48],
        ]
      : [
          [0.1, 0.28],
          [0.5, 0.65],
          [1.2, 0.16],
          [0.88, -0.28],
          [0.25, -0.38],
        ];
    const forma = new THREE.Shape(
      pontos.map(([x, z]) => new THREE.Vector2(x * lado * largura, z * profundidade))
    );
    this.parte(
      new THREE.ExtrudeGeometry(forma, {
        depth: 0.055,
        bevelEnabled: false,
        steps: 1,
        curveSegments: 1,
      }),
      cor,
      0,
      y,
      0,
      1,
      1,
      1,
      Math.PI / 2
    );
  }

  boca(y: number, z: number, largura = 0.2): void {
    this.corpo('#352b4d', 0, y, z, largura, 0.055, 0.045);
    for (const lado of [-1, 1])
      this.chifre('#fff1cc', lado * largura * 0.55, y + 0.01, z + 0.035, 0.035, 0.1, Math.PI);
  }

  terminar(): THREE.BufferGeometry {
    const geometria = mergeGeometries(this.partes, false)!;
    for (const parte of this.partes) parte.dispose();
    geometria.computeBoundingBox();
    geometria.computeBoundingSphere();
    return geometria;
  }
}

/** Frente = +z, base = chão. O voo é incorporado à forma e animado pelo lote. */
export function criarAparenciaInimigo(id: IdInimigo): THREE.BufferGeometry {
  const c = new Criatura();
  const lados = [-1, 1];
  switch (id) {
    case 'aveMigratoria':
      c.corpo('#f5d9aa', 0, 1.45, 0, 0.27, 0.23, 0.48);
      c.corpo('#fff0d1', 0, 1.53, 0.36, 0.23, 0.21, 0.22);
      for (const l of lados) c.asa('#b687c9', l, 1.48, 0.85, 0.8);
      c.chifre('#eea65b', 0, 1.5, 0.67, 0.12, 0.3, Math.PI / 2);
      c.placa('#d2a5dd', 0, 1.4, -0.58, 0.22, 0.08, 0.4);
      break;
    case 'arvoreAncia':
      c.haste('#a48063', 0, 1.55, 0, 0.75, 2.9);
      c.placa('#d7bb8c', 0, 2, 0.54, 0.52, 0.56, 0.2);
      for (const l of lados) {
        c.haste('#b79570', l * 1.03, 2.05, 0, 0.2, 1.9, 0, -l * 0.85);
        c.corpo('#a4d58c', l * 0.85, 3.05, 0, 0.88, 0.76, 0.8);
        c.haste('#b79570', l * 0.72, 0.25, 0.55, 0.2, 1.5, 0.9, l * 0.7);
      }
      c.corpo('#c3e89c', 0, 3.5, 0, 1.08, 0.78, 0.85);
      c.chifre('#ffe2a5', 0, 4.02, 0, 0.16, 0.55);
      c.boca(1.83, 0.79, 0.25);
      break;
    case 'golemForja':
      c.placa('#c48e77', 0, 1.46, 0, 0.95, 1.03, 0.68);
      c.placa('#ffcb8d', 0, 1.56, 0.59, 0.58, 0.57, 0.14);
      c.corpo('#ffe7b6', 0, 2.55, 0, 0.57, 0.53, 0.58);
      for (const l of lados) {
        c.placa('#eba481', l * 1.03, 2.05, 0, 0.5, 0.46, 0.53);
        c.placa('#a57978', l * 1.08, 1.2, 0, 0.35, 0.61, 0.37);
        c.placa('#b28b87', l * 0.5, 0.3, 0, 0.4, 0.34, 0.5);
        c.chifre('#ffe8ae', l * 0.4, 3.12, 0, 0.18, 0.78);
      }
      c.boca(2.35, 0.61, 0.25);
      break;
    case 'polvoAbissal':
      c.corpo('#a68bce', 0, 2.25, 0, 0.9, 1.02, 0.77);
      c.corpo('#ead4f0', 0, 2.2, 0.58, 0.67, 0.53, 0.2);
      for (let k = 0; k < 8; k++) {
        const a = (k * Math.PI) / 4;
        c.haste(
          k % 2 ? '#a7cde2' : '#c8a9e7',
          Math.cos(a) * 0.92,
          0.8,
          Math.sin(a) * 0.92,
          0.19,
          1.75,
          0,
          Math.cos(a) * 0.65
        );
        c.corpo('#f3d1e4', Math.cos(a) * 1.4, 0.17, Math.sin(a) * 1.4, 0.28, 0.16, 0.28);
      }
      c.anel('#ffdfad', 0, 3.06, 0, 0.68, 0.09, Math.PI / 2);
      c.boca(2.03, 0.82, 0.24);
      break;
    case 'corujaAurora':
      c.corpo('#bad8e7', 0, 1.75, 0, 0.8, 1.04, 0.7);
      c.corpo('#edf5e9', 0, 1.61, 0.5, 0.61, 0.7, 0.25);
      c.corpo('#d9e7ee', 0, 2.65, 0, 0.75, 0.64, 0.62);
      for (const l of lados) {
        c.asa('#99bedb', l, 2, 1.8, 1.6);
        c.corpo('#fff3d8', l * 0.32, 2.65, 0.52, 0.3, 0.35, 0.12);
        c.chifre('#c5a8e3', l * 0.47, 3.18, 0, 0.24, 0.68, 0, -l * 0.3);
        c.corpo('#dfb47f', l * 0.35, 0.32, 0.22, 0.24, 0.17, 0.4);
      }
      c.chifre('#e4b273', 0, 2.38, 0.75, 0.18, 0.4, Math.PI / 2);
      break;
    case 'caranguejoCoral':
      c.corpo('#efaaa7', 0, 1.15, 0, 1.2, 0.65, 0.88);
      c.placa('#ffd4b3', 0, 1.52, 0, 1.08, 0.35, 0.78);
      for (const l of lados) {
        for (let k = 0; k < 3; k++)
          c.haste('#cc8faa', l * 1.2, 0.44, -0.5 + k * 0.5, 0.12, 1.5, 0, l * 0.9);
        c.haste('#e7adba', l * 0.48, 1.6, 0.5, 0.1, 0.58);
        c.corpo('#ffe8c5', l * 0.48, 1.84, 0.55, 0.2, 0.22, 0.19);
        c.placa('#e6979b', l * 1.58, 1.25, 0.65, 0.59, 0.53, 0.56);
        c.chifre('#ffe1b9', l * 1.7, 1.7, 0.85, 0.22, 0.75, 0, l * 0.35);
        c.haste('#db8ca8', l * 0.55, 2.07, -0.25, 0.13, 0.95, 0, l * 0.35);
        c.chifre('#ffe4c4', l * 0.55, 2.61, -0.25, 0.17, 0.38);
      }
      c.boca(1.08, 0.84, 0.24);
      break;
    case 'chiado':
      c.corpo('#b797e5', 0, 0.5, 0, 0.45, 0.43, 0.39);
      c.corpo('#f4c3d6', 0, 0.35, 0.31, 0.3, 0.22, 0.13);
      for (const l of lados) {
        c.chifre('#d9c8ff', l * 0.31, 0.92, -0.02, 0.14, 0.4, 0, -l * 0.28);
        c.corpo('#7560a8', l * 0.31, 0.12, 0.06, 0.18, 0.11, 0.25);
      }
      c.boca(0.42, 0.44, 0.15);
      break;
    case 'spam':
      c.corpo('#ff8cab', 0, 0.37, 0, 0.39, 0.3, 0.36);
      c.placa('#ffe0b6', 0, 0.47, 0.28, 0.26, 0.2, 0.1);
      for (const l of lados) {
        c.chifre('#f6c04f', l * 0.3, 0.69, 0, 0.12, 0.35, 0, -l * 0.8);
        c.corpo('#be528c', l * 0.26, 0.08, 0, 0.14, 0.08, 0.22);
      }
      c.boca(0.32, 0.375, 0.12);
      break;
    case 'zumbido':
      c.corpo('#61c9cf', 0, 1.2, 0, 0.32, 0.28, 0.48);
      c.corpo('#ffe18c', 0, 1.19, 0.36, 0.29, 0.25, 0.22);
      c.anel('#376a91', 0, 1.2, -0.16, 0.29, 0.055);
      for (const l of lados) {
        c.asa('#c9eff5', l, 1.43, 0.8, 0.7);
        c.haste('#6b83a9', l * 0.18, 1.55, 0.36, 0.025, 0.35, -0.3, l * 0.25);
        c.corpo('#ffcf77', l * 0.22, 1.72, 0.42, 0.07, 0.07, 0.07);
      }
      c.boca(1.12, 0.56, 0.1);
      break;
    case 'estatica':
      c.corpo('#ac9bc8', 0, 0.8, 0, 0.64, 0.66, 0.44);
      c.placa('#748eb4', 0, 0.76, 0.37, 0.55, 0.45, 0.17);
      c.corpo('#ceb5da', 0, 1.35, 0.06, 0.4, 0.34, 0.35);
      for (const l of lados) {
        c.placa('#a7d5e5', l * 0.66, 1.12, 0, 0.32, 0.28, 0.32);
        c.corpo('#8572a5', l * 0.69, 0.62, 0.1, 0.24, 0.37, 0.24);
        c.placa('#6b688e', l * 0.3, 0.16, 0.1, 0.27, 0.18, 0.34);
        c.chifre('#f6dfaf', l * 0.28, 1.75, 0.02, 0.13, 0.45, 0, -l * 0.3);
      }
      c.boca(1.17, 0.4, 0.18);
      break;
    case 'alucinacao':
      c.parte(new THREE.ConeGeometry(0.48, 1.2, 9), '#b582d4', 0, 0.63, 0, 1, 1, 0.85);
      c.corpo('#ffc4e7', 0, 1.1, 0.06, 0.3, 0.33, 0.28);
      c.placa('#814d9f', 0, 1.25, -0.06, 0.39, 0.36, 0.31);
      c.placa('#ffe0ed', 0, 1.08, 0.25, 0.25, 0.24, 0.1);
      for (const l of lados) {
        c.corpo('#e3b2ed', l * 0.43, 0.77, 0.07, 0.16, 0.28, 0.18);
        c.chifre('#d8c5ff', l * 0.33, 0.24, 0.12, 0.14, 0.45, Math.PI, l * 0.3);
      }
      c.boca(0.94, 0.35, 0.12);
      break;
    case 'glitch':
      c.corpo('#74e8c3', 0, 0.59, 0, 0.37, 0.52, 0.3);
      c.placa('#577c9d', 0.08, 0.75, -0.02, 0.4, 0.21, 0.32, -0.16);
      c.placa('#cefcec', -0.09, 0.42, 0.04, 0.4, 0.16, 0.32, 0.18);
      c.corpo('#c5ffdf', 0.06, 1.03, 0.06, 0.3, 0.25, 0.27);
      for (const l of lados) {
        c.chifre('#a5fcdd', l * 0.43, 0.75, 0, 0.13, 0.5, 0, -l * 1.0);
        c.corpo('#457d98', l * 0.25, 0.12, 0.07, 0.16, 0.13, 0.23);
      }
      c.boca(0.91, 0.32, 0.12);
      break;
    case 'trollBug':
      c.corpo('#aa526b', 0, 0.8, -0.2, 0.78, 0.56, 1.03);
      c.placa('#e78675', 0, 1.05, -0.23, 0.74, 0.38, 0.95);
      c.corpo('#f5b597', 0, 0.78, 0.76, 0.43, 0.36, 0.42);
      for (const l of lados) {
        for (let n = 0; n < 3; n++) {
          c.haste('#b58aa1', l * 0.87, 0.48, -0.65 + n * 0.58, 0.085, 0.88, 0, l * 1.02);
          c.chifre('#f6d69d', l * 1.2, 0.2, -0.65 + n * 0.58, 0.12, 0.4, Math.PI, -l * 0.3);
        }
        c.chifre('#ffe4a6', l * 0.25, 1.3, 0.88, 0.14, 0.78, 0.6, -l * 0.3);
      }
      for (let n = 0; n < 3; n++) c.chifre('#f4c287', 0, 1.5, -0.7 + n * 0.5, 0.17, 0.4);
      c.boca(0.66, 1.14, 0.23);
      break;
    case 'chefe':
      c.corpo('#ad8dce', 0, 1.51, 0, 0.97, 1.11, 0.77);
      c.parte(new THREE.ConeGeometry(1.02, 1.5, 9), '#9978bb', 0, 0.82, -0.13, 1, 1, 0.7);
      c.placa('#c58bce', 0, 1.59, 0.65, 0.7, 0.7, 0.18);
      c.corpo('#e5b7d6', 0, 2.31, 0.1, 0.53, 0.49, 0.47);
      c.placa('#f7dfad', 0, 2.32, 0.47, 0.44, 0.31, 0.12);
      for (const l of lados) {
        c.placa('#aa79c7', l * 1.0, 1.9, 0, 0.45, 0.38, 0.49);
        c.corpo('#b18ac9', l * 1.06, 1.14, 0.1, 0.29, 0.58, 0.29);
        c.chifre('#ffd69a', l * 0.72, 2.61, -0.06, 0.2, 1.18, 0, -l * 0.42);
        c.chifre('#efb2d8', l * 1.2, 2.3, -0.12, 0.18, 0.7, 0, -l * 0.6);
      }
      c.anel('#f5cc7c', 0, 2.71, 0.08, 0.48, 0.08, Math.PI / 2);
      for (let n = -1; n <= 1; n++) c.chifre('#ffe6a6', n * 0.28, 2.99, 0.21, 0.1, 0.48);
      c.corpo('#b5f3f0', 0, 1.68, 0.88, 0.2, 0.29, 0.1);
      c.boca(2.14, 0.61, 0.26);
      break;
    case 'virus':
      c.corpo('#70d799', 0, 0.57, 0, 0.39, 0.41, 0.37);
      for (let n = 0; n < 7; n++) {
        const a = (n * Math.PI * 2) / 7;
        c.haste(
          '#a8edaa',
          Math.cos(a) * 0.43,
          0.57 + Math.sin(a) * 0.43,
          -0.03,
          0.035,
          0.3,
          0,
          a - Math.PI / 2
        );
        c.corpo('#e1ffc5', Math.cos(a) * 0.59, 0.57 + Math.sin(a) * 0.59, -0.03, 0.08, 0.08, 0.08);
      }
      c.corpo('#b2f1aa', 0, 0.49, 0.3, 0.27, 0.2, 0.14);
      c.boca(0.44, 0.43, 0.14);
      break;
    case 'verme':
      for (let n = 0; n < 4; n++) {
        c.corpo(
          n % 2 ? '#f1a65c' : '#ffd48a',
          Math.sin(n * 1.4) * 0.09,
          0.32 - n * 0.035,
          0.32 - n * 0.29,
          0.34 - n * 0.045,
          0.3 - n * 0.035,
          0.33
        );
      }
      for (const l of lados) {
        c.haste('#c88461', l * 0.18, 0.73, 0.43, 0.028, 0.35, -0.3, -l * 0.25);
        c.corpo('#ffe7a8', l * 0.21, 0.9, 0.48, 0.065, 0.07, 0.065);
        c.chifre('#fff0c6', l * 0.2, 0.27, 0.65, 0.08, 0.28, Math.PI / 2.3, -l * 0.3);
      }
      c.boca(0.32, 0.64, 0.14);
      break;
    case 'trojan':
      c.placa('#e9a96c', 0, 0.42, 0, 0.61, 0.42, 0.6);
      c.placa('#ffdc91', 0, 0.79, 0, 0.65, 0.15, 0.64);
      c.parte(new THREE.BoxGeometry(0.16, 0.72, 1.03), '#ae7389', 0, 0.4, 0);
      c.parte(new THREE.BoxGeometry(1.03, 0.72, 0.16), '#ae7389', 0, 0.4, 0);
      for (const l of lados) {
        c.anel('#f6e4b5', l * 0.18, 1, 0, 0.17, 0.055, 0, Math.PI / 2);
        c.corpo('#ad7c7f', l * 0.39, 0.09, 0.2, 0.18, 0.09, 0.22);
      }
      c.boca(0.57, 0.52, 0.2);
      break;
    case 'loopInfinito':
      c.anel('#74c8ec', -0.22, 0.9, 0, 0.34, 0.1, 0, -0.35);
      c.anel('#c2edf8', 0.22, 0.9, 0, 0.34, 0.1, 0, 0.35);
      c.corpo('#a4dfeb', 0, 0.98, 0.1, 0.24, 0.28, 0.23);
      for (const l of lados) c.chifre('#e2f4ff', l * 0.14, 1.4, 0, 0.08, 0.4, 0, -l * 0.35);
      c.boca(0.87, 0.32, 0.1);
      break;
    case 'vazamento':
      c.corpo('#aa87e3', 0, 0.5, 0, 0.58, 0.47, 0.5);
      c.corpo('#d0a7ee', 0, 0.52, 0.35, 0.37, 0.29, 0.23);
      for (let n = 0; n < 5; n++) {
        const a = (n * Math.PI * 2) / 5;
        c.corpo(
          n % 2 ? '#8267bf' : '#bda1eb',
          Math.cos(a) * 0.46,
          0.15,
          Math.sin(a) * 0.42,
          0.23,
          0.16,
          0.23
        );
      }
      c.chifre('#d9cbff', 0.1, 1.04, -0.07, 0.18, 0.45, 0, -0.3);
      c.boca(0.38, 0.56, 0.2);
      break;
    case 'ponteiroNulo':
      c.parte(new THREE.ConeGeometry(0.43, 1.07, 5), '#ce688c', 0, 0.65, 0, 1, 1, 0.72);
      c.corpo('#ffc2bf', 0, 1.16, 0.08, 0.26, 0.27, 0.23);
      c.placa('#794d88', 0, 1.31, -0.04, 0.32, 0.27, 0.25);
      c.placa('#f8ccda', 0, 1.14, 0.27, 0.22, 0.17, 0.07);
      c.haste('#f7d297', 0.43, 0.88, 0.02, 0.045, 1.17, 0, -0.15);
      c.chifre('#fff0bf', 0.52, 1.61, 0.02, 0.18, 0.46);
      c.boca(1.04, 0.34, 0.1);
      break;
    case 'pilha':
      for (let n = 0; n < 4; n++) {
        const x = Math.sin(n * 1.8) * 0.1;
        c.placa(
          n % 2 ? '#df8e64' : '#f6bd7e',
          x,
          0.28 + n * 0.43,
          0,
          0.57 - n * 0.05,
          0.25,
          0.5 - n * 0.04,
          Math.sin(n) * 0.1
        );
        c.placa('#fce0a1', x, 0.28 + n * 0.43, 0.42 - n * 0.04, 0.26, 0.1, 0.07);
      }
      for (const l of lados) {
        c.corpo('#ae735e', l * 0.38, 0.12, 0.09, 0.2, 0.13, 0.27);
        c.chifre('#fff0c2', l * 0.22, 1.91, 0, 0.1, 0.36, 0, -l * 0.4);
      }
      c.boca(1.47, 0.36, 0.14);
      break;
    case 'bloco':
      c.placa('#f0ba7a', 0, 0.35, 0, 0.4, 0.33, 0.38);
      c.corpo('#ffe3ae', 0, 0.38, 0.28, 0.26, 0.2, 0.11);
      for (const l of lados) {
        c.corpo('#bd876a', l * 0.27, 0.11, 0.04, 0.14, 0.11, 0.19);
        c.chifre('#e1a56b', l * 0.36, 0.4, 0, 0.08, 0.3, 0, -l * 1.2);
      }
      c.boca(0.28, 0.39, 0.12);
      break;
    case 'ransomware':
      c.corpo('#82bda5', 0, 1.12, -0.08, 0.85, 0.9, 0.66);
      c.placa('#8fcbb0', 0, 1.14, 0.39, 0.84, 0.71, 0.31);
      c.placa('#e5cd8b', 0, 1.26, 0.65, 0.47, 0.46, 0.12);
      c.corpo('#97c3bb', 0, 1.98, 0.03, 0.47, 0.37, 0.4);
      for (const l of lados) {
        c.placa('#b6ddc5', l * 0.89, 1.61, -0.02, 0.36, 0.36, 0.46);
        c.corpo('#4d8582', l * 0.91, 0.95, 0.1, 0.25, 0.49, 0.27);
        c.placa('#527c7d', l * 0.44, 0.2, 0.1, 0.32, 0.21, 0.42);
        c.chifre('#f5d799', l * 0.4, 2.38, -0.03, 0.18, 0.84, 0, -l * 0.32);
        c.chifre('#e5dbaa', l * 0.83, 2.05, -0.05, 0.16, 0.66, 0, -l * 0.7);
      }
      c.anel('#e4bc78', 0, 2.06, -0.14, 0.67, 0.12);
      c.corpo('#405565', 0, 1.33, 0.77, 0.13, 0.14, 0.045);
      c.parte(new THREE.BoxGeometry(0.1, 0.25, 0.05), '#405565', 0, 1.13, 0.77);
      c.boca(1.85, 0.42, 0.22);
      break;
    case 'morcegoRunico':
      c.corpo('#a091d4', 0, 1.48, 0.02, 0.25, 0.39, 0.3);
      c.corpo('#ead4ed', 0, 1.57, 0.24, 0.25, 0.23, 0.17);
      for (const l of lados) {
        c.asa('#8062b6', l, 1.62, 0.95, 1, true);
        c.asa('#c29bdc', l, 1.66, 0.72, 0.56, true);
        c.chifre('#d4b9ef', l * 0.18, 1.99, 0.13, 0.14, 0.55, 0, -l * 0.22);
        c.haste('#e1c1ee', l * 0.58, 1.68, 0, 0.028, 0.83, 0, l * 1.3);
      }
      c.corpo('#ffe4ac', 0, 1.33, 0.31, 0.07, 0.12, 0.06);
      c.boca(1.48, 0.4, 0.12);
      break;
    case 'arraiaCeleste':
      c.corpo('#6fc9d8', 0, 1.87, 0, 0.37, 0.22, 0.59);
      c.corpo('#d5f5e7', 0, 1.8, 0.25, 0.3, 0.13, 0.36);
      for (const l of lados) {
        c.asa('#78b9da', l, 1.88, 1.04, 1.2);
        c.asa('#b6e7e3', l, 1.92, 0.72, 0.82);
        c.chifre('#e6f8d4', l * 0.27, 1.91, 0.6, 0.08, 0.38, Math.PI / 2);
      }
      c.haste('#9bc5e7', 0, 1.82, -0.91, 0.065, 0.96, Math.PI / 2);
      c.chifre('#fbe4ab', 0, 1.84, -1.44, 0.1, 0.4, -Math.PI / 2);
      c.placa('#ffe0a8', 0, 2.06, 0, 0.12, 0.1, 0.28);
      c.boca(1.8, 0.59, 0.13);
      break;
  }
  return c.terminar();
}
