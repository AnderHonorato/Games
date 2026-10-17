/** Ataques especiais: toda a sequência pertence ao relógio pausável da partida. */
import type { Elemento, Valores } from '../dados/habilidades';
import type { SistemaFx } from '../fx/indice';
import {
  desenharDado,
  desenharNota,
  desenharPrisma,
  desenharTrem,
  ondaMusical,
} from '../fx/especiais';

export interface AlvoEspecial {
  x: number;
  z: number;
  vida: number;
  vivo?: boolean;
  raio?: number;
}
export interface ContextoPoderEspecial<T extends AlvoEspecial> {
  id: string;
  nivel: number;
  valores: Valores & { evo5: boolean; evo10: boolean };
  x: number;
  z: number;
  angulo: number;
  inimigos: readonly T[];
  rnd: () => number;
  agendar: (fn: () => void, segundos: number) => void;
  atingir: (
    alvo: T,
    dano: number,
    elemento: Elemento,
    dx: number,
    dz: number,
    forca: number
  ) => void;
  fx: SistemaFx;
}
const TAU = Math.PI * 2;
const vivo = (a: AlvoEspecial): boolean => a.vida > 0 && a.vivo !== false;
export function faceDoDado(rnd: () => number, supremo = false): number {
  return supremo ? 6 : 1 + Math.min(5, Math.max(0, Math.floor((rnd() || 0) * 6)));
}
/** Distância de um ponto ao segmento, com extremos incluídos. */
export function distanciaSegmento(
  px: number,
  pz: number,
  ax: number,
  az: number,
  bx: number,
  bz: number
): number {
  const dx = bx - ax,
    dz = bz - az;
  const t = Math.min(1, Math.max(0, ((px - ax) * dx + (pz - az) * dz) / (dx * dx + dz * dz || 1)));
  return Math.hypot(px - ax - dx * t, pz - az - dz * t);
}

export function lancarPoderEspecial<T extends AlvoEspecial>(
  ctx: ContextoPoderEspecial<T>
): boolean {
  const { id, valores: v, x, z, angulo: ang, fx } = ctx;
  if (!['tremFantasma', 'dadosCaoticos', 'espelhoPrismatico', 'orquestraOrbital'].includes(id))
    return false;
  if (![x, z, ang, v.dano, v.area, v.alcance].every(Number.isFinite)) return true;
  const vivos = () => ctx.inimigos.filter(vivo);
  const perto = () =>
    vivos()
      .filter((a) => Math.hypot(a.x - x, a.z - z) <= v.alcance + (a.raio || 0))
      .sort((a, b) => Math.hypot(a.x - x, a.z - z) - Math.hypot(b.x - x, b.z - z))[0];
  const alvo = perto();
  const direcao = alvo ? Math.atan2(alvo.z - z, alvo.x - x) : ang;
  const acertar = (a: T, fator: number, el: Elemento, ox: number, oz: number, forca = 2) => {
    if (vivo(a)) ctx.atingir(a, v.dano * fator, el, a.x - ox, a.z - oz, forca);
  };
  const disco = (px: number, pz: number, r: number, fator: number, el: Elemento, forca = 2) => {
    for (const a of vivos())
      if (Math.hypot(a.x - px, a.z - pz) <= r + (a.raio || 0)) acertar(a, fator, el, px, pz, forca);
  };
  const feixe = (
    ax: number,
    az: number,
    bx: number,
    bz: number,
    r: number,
    fator: number,
    el: Elemento,
    forca = 2
  ) => {
    for (const a of vivos())
      if (distanciaSegmento(a.x, a.z, ax, az, bx, bz) <= r + (a.raio || 0))
        acertar(a, fator, el, ax, az, forca);
  };
  if (id === 'tremFantasma') {
    // Cada vagão percorre um trecho diferente da via: colisão acompanha a locomotiva.
    const vias = v.evo10 ? [-1.7, 0, 1.7] : [0];
    const trechos = v.evo5 ? 7 : 5;
    const largura = Math.max(0.65, Math.min(1.3, v.area * 0.45));
    for (const lateral of vias) {
      const dx = Math.cos(direcao),
        dz = Math.sin(direcao),
        ox = x - dz * lateral,
        oz = z + dx * lateral;
      const atingidos = new Set<T>();
      for (let k = 0; k < trechos; k++)
        ctx.agendar(() => {
          const inicio = (k * v.alcance) / trechos,
            fim = ((k + 1) * v.alcance) / trechos;
          desenharTrem(fx, ox + dx * fim, oz + dz * fim, direcao, v.evo5 ? 3 : 2, k === 0);
          for (const a of vivos())
            if (
              !atingidos.has(a) &&
              distanciaSegmento(
                a.x,
                a.z,
                ox + dx * inicio,
                oz + dz * inicio,
                ox + dx * fim,
                oz + dz * fim
              ) <=
                largura + (a.raio || 0)
            ) {
              atingidos.add(a);
              acertar(a, 1, 'gravidade', ox, oz, 6);
            }
          // Engate assombrado da evolução: vagões deixam uma segunda onda na via.
          if (v.evo5)
            ctx.agendar(
              () =>
                feixe(
                  ox + dx * inicio,
                  oz + dz * inicio,
                  ox + dx * fim,
                  oz + dz * fim,
                  largura * 0.65,
                  0.28,
                  'gravidade',
                  -2
                ),
              0.18
            );
        }, k * 0.095);
    }
    return true;
  }
  if (id === 'dadosCaoticos') {
    const face = faceDoDado(ctx.rnd, v.evo10);
    const px = alvo?.x ?? x + Math.cos(ang) * 4,
      pz = alvo?.z ?? z + Math.sin(ang) * 4;
    desenharDado(fx, px, pz, face, v.evo10);
    const executar = (rot: number, fator: number) => {
      // Faces mudam a topologia do ataque: foco, par, triângulo, cruz, espiral e estrela.
      if (face === 1) {
        disco(px, pz, v.area * 0.8, 3 * fator, 'arcano', 7);
        return;
      }
      if (face === 3) disco(px, pz, v.area * 0.5, 0.55 * fator, 'arcano');
      for (let k = 0; k < face; k++) {
        const a = direcao + rot + (k * TAU) / face,
          dx = Math.cos(a),
          dz = Math.sin(a);
        if (face === 3 || face === 5) {
          const r = v.area * (face === 3 ? 1.1 : 0.65 + k * 0.3),
            bx = px + dx * r,
            bz = pz + dz * r;
          ctx.agendar(
            () => {
              desenharDado(fx, bx, bz, 1, false);
              disco(bx, bz, v.area * 0.7, (face === 3 ? 1.1 : 0.85) * fator, 'arcano');
            },
            k * (face === 5 ? 0.085 : 0.03)
          );
        } else {
          const alcance = v.area * (face === 6 ? 2.8 : 2.1);
          desenharPrisma(fx, px, pz, px + dx * alcance, pz + dz * alcance, '#cf9aff', false);
          feixe(
            px,
            pz,
            px + dx * alcance,
            pz + dz * alcance,
            0.6,
            (face === 2 ? 1.5 : face === 4 ? 1.05 : 1.2) * fator,
            'arcano'
          );
        }
      }
    };
    ctx.agendar(() => executar(0, 1), 0.24);
    if (v.evo5) ctx.agendar(() => executar(Math.PI / face, 0.45), 0.54);
    return true;
  }
  if (id === 'espelhoPrismatico') {
    const px = alvo?.x ?? x + Math.cos(ang) * 6,
      pz = alvo?.z ?? z + Math.sin(ang) * 6;
    const cores = ['#7eeeff', '#ff8adf', '#ffe79a', '#bba0ff', '#92ffbd', '#ffffff'];
    const n = v.evo10 ? 6 : 2;
    for (let k = 0; k < n; k++) {
      const a = v.evo10 ? (k * TAU) / n : direcao + Math.PI / 2 + (k ? Math.PI : 0);
      const ox = x + Math.cos(a) * 2.4,
        oz = z + Math.sin(a) * 2.4;
      desenharPrisma(fx, ox, oz, px, pz, cores[k], v.evo10);
      ctx.agendar(
        () => {
          feixe(ox, oz, px, pz, 0.48, 1, 'cristal');
          if (v.evo5)
            for (const lado of [-1, 1]) {
              const angRef = direcao + lado * (v.evo10 ? 0.8 : 0.5),
                bx = px + Math.cos(angRef) * v.area * 2,
                bz = pz + Math.sin(angRef) * v.area * 2;
              desenharPrisma(fx, px, pz, bx, bz, cores[k], false);
              feixe(px, pz, bx, bz, 0.34, 0.38, 'cristal');
            }
        },
        0.16 + k * 0.035
      );
    }
    if (v.evo10)
      ctx.agendar(() => {
        ondaMusical(fx, px, pz, v.area * 1.6, '#c9f9ff');
        disco(px, pz, v.area * 1.6, 1.5, 'cristal', 5);
      }, 0.65);
    return true;
  }
  // Quatro tempos com notas orbitais e ondas reais; contratempo entre batidas.
  for (let batida = 0; batida < 4; batida++) {
    const raio = v.area * (0.35 + batida * 0.2);
    ctx.agendar(() => {
      ondaMusical(fx, x, z, raio, '#ff9fd8');
      for (let k = 0; k < 4; k++) {
        const a = (batida * Math.PI) / 4 + (k * TAU) / 4;
        desenharNota(fx, x + Math.cos(a) * raio, z + Math.sin(a) * raio, a, k % 2 === 0);
      }
      // A coroa sonora só atinge inimigos na frente de onda atual.
      for (const a of vivos())
        if (Math.abs(Math.hypot(a.x - x, a.z - z) - raio) < 1 + (a.raio || 0))
          acertar(a, 0.65, 'som', x, z, 4);
    }, batida * 0.24);
    if (v.evo5)
      ctx.agendar(
        () => {
          const a = direcao + (batida * Math.PI) / 2;
          const bx = x + Math.cos(a) * v.area,
            bz = z + Math.sin(a) * v.area;
          desenharNota(fx, bx, bz, a, true);
          feixe(x, z, bx, bz, 0.65, 0.45, 'som', -2);
        },
        batida * 0.24 + 0.12
      );
  }
  if (v.evo10)
    ctx.agendar(() => {
      ondaMusical(fx, x, z, v.area * 1.5, '#ffe5ab');
      disco(x, z, v.area * 1.5, 2, 'som', 9);
    }, 1.04);
  return true;
}
