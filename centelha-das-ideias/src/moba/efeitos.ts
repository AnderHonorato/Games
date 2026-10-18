import * as T from 'three';
import type { EfeitoMoba, ProjetilMoba } from './tipos';
import { heroiMoba } from './dados';

export type FormaFxMoba =
  'disco' | 'anel' | 'bola' | 'caixa' | 'cristal' | 'cone' | 'estrela' | 'arco';
interface Lote {
  mesh: T.InstancedMesh;
  usados: number;
}
/** Cada forma ocupa uma chamada de desenho, mesmo com centenas de partículas e barras. */
export class EfeitosMoba {
  readonly grupo = new T.Group();
  private lotes = new Map<FormaFxMoba, Lote>();
  private descartado = false;
  private matriz = new T.Matrix4();
  private posicao = new T.Vector3();
  private escala = new T.Vector3();
  private quaternion = new T.Quaternion();
  private euler = new T.Euler();
  private cor = new T.Color();
  private material = new T.MeshBasicMaterial({ vertexColors: false, toneMapped: false });
  readonly capacidade = 1024;
  constructor() {
    const anel = new T.TorusGeometry(1, 0.07, 4, 32);
    anel.rotateX(Math.PI / 2);
    const arco = new T.TorusGeometry(1, 0.1, 4, 20, Math.PI * 1.3);
    arco.rotateX(Math.PI / 2);
    const estrela = new T.ConeGeometry(1, 1, 4);
    estrela.rotateX(Math.PI / 2);
    const geometrias: Record<FormaFxMoba, T.BufferGeometry> = {
      disco: new T.CylinderGeometry(1, 1, 0.06, 24),
      anel,
      arco,
      estrela,
      bola: new T.IcosahedronGeometry(1, 1),
      caixa: new T.BoxGeometry(1, 1, 1),
      cristal: new T.OctahedronGeometry(1),
      cone: new T.ConeGeometry(1, 1, 8),
    };
    for (const [forma, g] of Object.entries(geometrias)) {
      const mesh = new T.InstancedMesh(g, this.material, this.capacidade);
      mesh.frustumCulled = false;
      mesh.instanceMatrix.setUsage(T.DynamicDrawUsage);
      mesh.count = 0;
      this.lotes.set(forma as FormaFxMoba, { mesh, usados: 0 });
      this.grupo.add(mesh);
    }
  }
  iniciar() {
    for (const l of this.lotes.values()) l.usados = 0;
  }
  emitir(
    forma: FormaFxMoba,
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
  ) {
    const l = this.lotes.get(forma)!;
    if (l.usados >= this.capacidade) return;
    this.posicao.set(x, y, z);
    this.escala.set(Math.max(0.001, sx), Math.max(0.001, sy), Math.max(0.001, sz));
    this.quaternion.setFromEuler(this.euler.set(rx, ry, rz));
    this.matriz.compose(this.posicao, this.quaternion, this.escala);
    l.mesh.setMatrixAt(l.usados, this.matriz);
    l.mesh.setColorAt(l.usados, this.cor.set(cor));
    l.usados++;
  }
  linha(cor: string, x: number, z: number, x2: number, z2: number, y: number, espessura: number) {
    const dx = x2 - x,
      dz = z2 - z;
    this.emitir(
      'caixa',
      cor,
      (x + x2) / 2,
      y,
      (z + z2) / 2,
      espessura,
      espessura,
      Math.hypot(dx, dz),
      0,
      Math.atan2(dx, dz)
    );
  }
  projetil(p: ProjetilMoba, tempo: number, heroiId?: string) {
    const r = Math.max(0.22, p.raio),
      ang = Math.atan2(p.vx, p.vz),
      d = Math.hypot(p.vx, p.vz) || 1;
    const classe = heroiId ? heroiMoba(heroiId).classe : undefined;
    if (classe === 'atirador') {
      this.emitir('caixa', '#fff0bd', p.x, 1.6, p.z, 0.1, 0.1, r * 3, 0, ang);
      this.emitir(
        'cone',
        p.cor,
        p.x + (p.vx / d) * r,
        1.6,
        p.z + (p.vz / d) * r,
        r * 0.4,
        r * 1.1,
        r * 0.4,
        Math.PI / 2,
        ang
      );
      this.emitir(
        'arco',
        p.cor,
        p.x - (p.vx / d) * r,
        1.6,
        p.z - (p.vz / d) * r,
        r * 0.45,
        1,
        r * 0.45,
        0,
        ang
      );
    } else if (classe === 'mago') {
      this.emitir('bola', '#fff2c9', p.x, 1.6, p.z, r * 0.45, r * 0.45, r * 0.45);
      this.emitir('arco', p.cor, p.x, 1.6, p.z, r * 0.85, 1, r * 0.85, tempo * 3, ang);
      this.emitir(
        'cristal',
        p.cor,
        p.x,
        1.6,
        p.z,
        r * 0.5,
        r * 0.6,
        r * 1.4,
        Math.PI / 2,
        ang,
        tempo * 4
      );
    } else if (classe === 'suporte') {
      for (const lado of [-1, 1])
        this.emitir(
          'cristal',
          lado > 0 ? '#fff6ce' : p.cor,
          p.x + Math.cos(ang) * lado * r * 0.35,
          1.6,
          p.z - Math.sin(ang) * lado * r * 0.35,
          r * 0.4,
          r * 0.5,
          r * 0.35,
          0,
          ang + lado * 0.6,
          tempo * 0.6
        );
      this.emitir('bola', p.cor, p.x, 1.65, p.z, r * 0.3, r * 0.3, r * 0.3);
    } else if (classe === 'assassino') {
      for (let i = 0; i < 3; i++)
        this.emitir(
          'estrela',
          i === 1 ? '#fff6ce' : p.cor,
          p.x,
          1.6,
          p.z,
          r * 0.75,
          r * 0.4,
          r * 0.75,
          0,
          tempo * 9 + (i * Math.PI) / 3
        );
    } else if (classe === 'tanque') {
      this.emitir('bola', p.cor, p.x, 1.6, p.z, r * 0.8, r * 0.8, r * 0.8, tempo * 3, ang);
      this.emitir('cristal', '#e4e4bb', p.x, 1.6, p.z, r * 0.5, r, r * 0.5, tempo * 3, ang);
    } else {
      this.emitir(
        'cristal',
        '#fff5cc',
        p.x,
        1.6,
        p.z,
        r * 0.5,
        r * 0.5,
        r * 1.4,
        Math.PI / 2,
        ang,
        tempo * 4
      );
      this.emitir('estrela', p.cor, p.x, 1.6, p.z, r * 0.85, r * 0.85, r * 1.8, 0, ang);
    }
    for (let i = 1; i < 4; i++)
      this.emitir(
        'bola',
        p.cor,
        p.x - (p.vx / d) * i * 0.6,
        1.6,
        p.z - (p.vz / d) * i * 0.6,
        r * (0.55 - i * 0.11),
        r * (0.55 - i * 0.11),
        r * (0.55 - i * 0.11)
      );
  }
  efeito(e: EfeitoMoba, tempo: number) {
    const p = Math.max(0, Math.min(1, 1 - e.vida / e.total)),
      r = e.raio,
      onda = 0.35 + p * 0.9,
      a = tempo * 3 + e.id * 0.4,
      branco = '#fff6d4',
      x = e.x,
      z = e.z;
    switch (e.tipo) {
      case 'linha':
      case 'cone': {
        const ox = e.x2 ?? x - r,
          oz = e.z2 ?? z,
          dx = x - ox,
          dz = z - oz,
          ang = Math.atan2(dx, dz);
        this.linha(e.cor, ox, oz, x, z, 0.85, 0.45 * (1 - p) + 0.1);
        if (e.tipo === 'cone') {
          const len = Math.hypot(dx, dz),
            ang2 = Math.atan2(dz, dx);
          for (const lado of [-1, 1])
            this.linha(
              e.cor,
              ox,
              oz,
              ox + Math.cos(ang2 + lado * 0.48) * len,
              oz + Math.sin(ang2 + lado * 0.48) * len,
              0.45,
              0.14
            );
          for (let i = 0; i < 6; i++) {
            const t = (i + 1) / 6;
            this.emitir(
              'arco',
              e.cor,
              ox + dx * t,
              0.6,
              oz + dz * t,
              r * t * (1 - p * 0.35),
              1,
              r * t * (1 - p * 0.35),
              0,
              ang
            );
          }
        } else
          for (let i = 0; i < 4; i++)
            this.emitir(
              'cristal',
              branco,
              ox + (dx * (i + 0.5)) / 4,
              1.1 + Math.sin(p * Math.PI) * 0.8,
              oz + (dz * (i + 0.5)) / 4,
              0.25,
              0.55,
              0.25,
              0,
              a
            );
        break;
      }
      case 'projetil':
        this.emitir('estrela', e.cor, x, 1.1, z, r * (1 - p), 1, r * (1 - p), 0, a);
        break;
      case 'area':
        this.emitir('anel', e.cor, x, 0.6, z, r * onda, 1, r * onda);
        for (let i = 0; i < 8; i++) {
          const t = (i * Math.PI) / 4;
          this.emitir(
            'cristal',
            i % 2 ? e.cor : branco,
            x + Math.cos(t) * r * p,
            1.1 + Math.sin(p * Math.PI) * 2,
            z + Math.sin(t) * r * p,
            0.28,
            1.2 * (1 - p) + 0.1,
            0.28,
            p * 2,
            t
          );
        }
        this.emitir('arco', branco, x, 0.75, z, r * onda * 0.7, 1, r * onda * 0.7, 0, a);
        break;
      case 'cura':
        this.emitir('anel', e.cor, x, 0.6, z, r, 1, r);
        for (let i = 0; i < 5; i++) {
          const t = a + i * 1.256,
            xx = x + Math.cos(t) * r * 0.65,
            zz = z + Math.sin(t) * r * 0.65,
            y = 1 + p * 4 + i * 0.15;
          this.emitir('caixa', e.cor, xx, y, zz, 0.24, 1.05, 0.25);
          this.emitir('caixa', branco, xx, y, zz, 0.9, 0.23, 0.25);
        }
        break;
      case 'escudo':
        for (let i = 0; i < 6; i++) {
          const t = a + (i * Math.PI) / 3;
          this.emitir(
            'cristal',
            e.cor,
            x + Math.cos(t) * r * 0.8,
            1.5 + Math.sin(p * Math.PI),
            z + Math.sin(t) * r * 0.8,
            0.6,
            1.3,
            0.18,
            0,
            -t
          );
        }
        this.emitir('anel', branco, x, 0.45, z, r * 0.85, 1, r * 0.85);
        break;
      case 'salto':
        for (let i = 0; i < 3; i++)
          this.emitir(
            'anel',
            i % 2 ? branco : e.cor,
            x,
            0.4 + (1 - p) * i * 1.5,
            z,
            r * (0.3 + p * 0.7) * (1 - i * 0.18),
            1,
            r * (0.3 + p * 0.7) * (1 - i * 0.18)
          );
        break;
      case 'puxao': {
        const ox = e.x2 ?? x - 5,
          oz = e.z2 ?? z;
        this.linha('#d0ccaf', ox, oz, x, z, 1.25, 0.12);
        for (let i = 0; i < 8; i++) {
          const f = ((i + p * 2) % 8) / 8;
          this.emitir(
            'anel',
            e.cor,
            ox + (x - ox) * f,
            1.25,
            z + (oz - z) * (1 - f),
            0.3,
            1,
            0.3,
            Math.PI / 2,
            Math.atan2(x - ox, z - oz)
          );
        }
        this.emitir('arco', branco, x, 1.2, z, 1, 1, 1, 0, -a);
        break;
      }
      case 'invocar':
        this.emitir('anel', e.cor, x, 0.5, z, r, 1, r);
        this.emitir('arco', branco, x, 0.65, z, r * 0.7, 1, r * 0.7, 0, -a);
        for (let i = 0; i < 4; i++) {
          const t = (i * Math.PI) / 2 + a;
          this.emitir(
            'cone',
            e.cor,
            x + Math.cos(t) * r * 0.7,
            1 + p * 3,
            z + Math.sin(t) * r * 0.7,
            0.4,
            1.1,
            0.4
          );
        }
        break;
      case 'raiz':
        for (let i = 0; i < 7; i++) {
          const t = i * 0.9;
          this.emitir(
            'cone',
            i % 2 ? e.cor : '#bfdb95',
            x + Math.cos(t) * r * 0.65,
            1.1 * (1 - p * 0.5),
            z + Math.sin(t) * r * 0.65,
            0.45,
            2.3 * (0.5 + p * 0.5),
            0.45,
            Math.sin(t) * 0.45,
            0,
            Math.cos(t) * 0.45
          );
        }
        this.emitir('anel', e.cor, x, 0.45, z, r, 1, r);
        break;
      case 'orbita':
        this.emitir('arco', e.cor, x, 0.65, z, r, 1, r, 0, a);
        for (let i = 0; i < 4; i++) {
          const t = a + (i * Math.PI) / 2;
          this.emitir(
            'estrela',
            branco,
            x + Math.cos(t) * r,
            1.4,
            z + Math.sin(t) * r,
            0.55,
            0.5,
            0.9,
            0,
            -t
          );
        }
        break;
      case 'canal':
        this.emitir('anel', e.cor, x, 0.4, z, r, 1, r);
        for (let i = 0; i < 6; i++) {
          const t = a + (i * Math.PI) / 3;
          this.emitir(
            'bola',
            e.cor,
            x + Math.cos(t) * r * (1 - p),
            0.6 + p * 5,
            z + Math.sin(t) * r * (1 - p),
            0.22,
            0.4,
            0.22
          );
        }
        this.emitir('cristal', branco, x, 1.5 + p * 3, z, 0.4, 1.4, 0.4, 0, -a);
        break;
      case 'veneno':
        this.emitir('arco', e.cor, x, 0.45, z, r, 1, r, 0, -a);
        for (let i = 0; i < 7; i++) {
          const t = i * 2.4;
          this.emitir(
            'bola',
            i % 2 ? e.cor : '#c7e58b',
            x + (Math.cos(t) * r * ((i % 3) + 1)) / 4,
            0.5 + p * ((i % 3) + 1),
            z + (Math.sin(t) * r * ((i % 3) + 1)) / 4,
            0.3 * (1 - p * 0.7),
            0.42 * (1 - p * 0.7),
            0.3 * (1 - p * 0.7)
          );
        }
        break;
      case 'troca':
        for (let i = 0; i < 3; i++)
          this.emitir(
            'anel',
            i % 2 ? branco : e.cor,
            x,
            0.5 + i * 1.4,
            z,
            r * (1 - p) * (1 - i * 0.2),
            1,
            r * (1 - p) * (1 - i * 0.2)
          );
        this.emitir('cristal', e.cor, x, 2 + p * 3, z, 0.45, 2 * (1 - p), 0.45, 0, a);
        break;
      case 'raio':
        if (e.x2 !== undefined && e.z2 !== undefined) {
          const dx = e.x2 - x,
            dz = e.z2 - z;
          for (let i = 0; i < 4; i++) {
            const f = i / 4,
              ff = (i + 1) / 4,
              j = i % 2 ? 0.35 : -0.35;
            this.linha(
              i % 2 ? e.cor : branco,
              x + dx * f + j,
              z + dz * f - j,
              x + dx * ff - j,
              z + dz * ff + j,
              1.7,
              0.2 * (1 - p) + 0.08
            );
          }
        }
        break;
      case 'recall':
        this.emitir('anel', e.cor, x, 0.5, z, r, 1, r);
        for (let i = 0; i < 3; i++)
          this.emitir(
            'arco',
            branco,
            x,
            0.7 + i * 1.8,
            z,
            r * (1 - i * 0.2),
            1,
            r * (1 - i * 0.2),
            0,
            a + i
          );
        break;
      case 'nivel':
        for (let i = 0; i < 7; i++) {
          const t = i * 0.9;
          this.emitir(
            'estrela',
            e.cor,
            x + Math.cos(t) * r * 0.8,
            1 + p * 5,
            z + Math.sin(t) * r * 0.8,
            0.4,
            0.6,
            0.4,
            0,
            a
          );
        }
        this.emitir('anel', branco, x, 0.6, z, r * onda, 1, r * onda);
        break;
      case 'ward':
      case 'ping':
        this.emitir('anel', e.cor, x, 0.5, z, r * (0.4 + p * 0.7), 1, r * (0.4 + p * 0.7));
        this.emitir('cone', branco, x, 2 + Math.sin(p * Math.PI), z, 0.65, 1.6, 0.65, Math.PI);
        break;
      case 'queda':
      case 'impacto':
      default:
        this.emitir('anel', e.cor, x, 0.5, z, r * onda, 1, r * onda);
        for (let i = 0; i < 5; i++) {
          const t = i * 1.26;
          this.emitir(
            'estrela',
            i % 2 ? branco : e.cor,
            x + Math.cos(t) * r * p,
            1 + Math.sin(p * Math.PI) * 1.3,
            z + Math.sin(t) * r * p,
            0.35 * (1 - p),
            0.35,
            0.5 * (1 - p),
            0,
            t
          );
        }
    }
  }
  finalizar() {
    for (const l of this.lotes.values()) {
      l.mesh.count = l.usados;
      l.mesh.instanceMatrix.needsUpdate = true;
      if (l.mesh.instanceColor) l.mesh.instanceColor.needsUpdate = true;
    }
  }
  estatisticas() {
    return [...this.lotes.values()].map((l) => ({ usados: l.usados, capacidade: this.capacidade }));
  }
  descartar() {
    if (this.descartado) return;
    this.descartado = true;
    for (const l of this.lotes.values()) l.mesh.geometry.dispose();
    this.material.dispose();
    this.grupo.clear();
    this.lotes.clear();
  }
}
