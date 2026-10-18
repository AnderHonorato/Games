/** Ataques especiais: toda a sequência pertence ao relógio pausável da partida. */
import {
  NOVOS_PODERES_IDS,
  PODERES_FOFOS_IDS,
  type Elemento,
  type Valores,
} from '../dados/habilidades';
import { manifestarPoder } from '../fx/assinaturas';
import type { SistemaFx } from '../fx/indice';
import {
  desenharArtefato,
  fioEspecial,
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
  if (
    NOVOS_PODERES_IDS.some((id) => id === ctx.id) ||
    PODERES_FOFOS_IDS.some((id) => id === ctx.id)
  )
    return lancarNovoPoder(ctx);
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
    const composicao = Math.max(2, Math.min(6, Math.floor(v.quantidade)));
    const totalVias = v.evo10
      ? Math.max(3, Math.min(5, composicao - 1))
      : Math.max(1, composicao - 1);
    const vias = Array.from({ length: totalVias }, (_, i) => (i - (totalVias - 1) / 2) * 1.7);
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
          if (k % 2 === 0)
            desenharTrem(
              fx,
              ox + dx * fim,
              oz + dz * fim,
              direcao,
              Math.min(4, composicao),
              k === 0 && lateral === vias[Math.floor(vias.length / 2)]
            );
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
    const lancamentos = Math.min(4, Math.max(v.evo5 ? 2 : 1, Math.floor(v.quantidade)));
    for (let i = 0; i < lancamentos; i++)
      ctx.agendar(
        () => {
          if (i) desenharDado(fx, px, pz, face, v.evo10);
          executar((i * Math.PI) / face, i ? 0.45 : 1);
        },
        0.24 + i * 0.3
      );
    return true;
  }
  if (id === 'espelhoPrismatico') {
    const px = alvo?.x ?? x + Math.cos(ang) * 6,
      pz = alvo?.z ?? z + Math.sin(ang) * 6;
    const cores = ['#7eeeff', '#ff8adf', '#ffe79a', '#bba0ff', '#92ffbd', '#ffffff'];
    const n = Math.min(8, Math.max(v.evo10 ? 6 : 2, Math.floor(v.quantidade)));
    for (let k = 0; k < n; k++) {
      const a = n > 2 ? direcao + (k * TAU) / n : direcao + Math.PI / 2 + (k ? Math.PI : 0);
      const ox = x + Math.cos(a) * 2.4,
        oz = z + Math.sin(a) * 2.4;
      desenharPrisma(fx, ox, oz, px, pz, cores[k % cores.length], v.evo10);
      ctx.agendar(
        () => {
          feixe(ox, oz, px, pz, 0.48, 1, 'cristal');
          if (v.evo5)
            for (const lado of [-1, 1]) {
              const angRef = direcao + lado * (v.evo10 ? 0.8 : 0.5),
                bx = px + Math.cos(angRef) * v.area * 2,
                bz = pz + Math.sin(angRef) * v.area * 2;
              desenharPrisma(fx, px, pz, bx, bz, cores[k % cores.length], false);
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
  const notas = Math.max(4, Math.min(12, Math.floor(v.quantidade)));
  for (let batida = 0; batida < 4; batida++) {
    const raio = v.area * (0.35 + batida * 0.2);
    ctx.agendar(() => {
      ondaMusical(fx, x, z, raio, '#ff9fd8');
      for (let k = 0; k < notas; k++) {
        const a = (batida * Math.PI) / 4 + (k * TAU) / notas;
        const nx = x + Math.cos(a) * raio,
          nz = z + Math.sin(a) * raio;
        desenharNota(fx, nx, nz, a, k % 2 === 0);
        // As notas adicionais têm corpos sonoros reais, além da frente de onda.
        if (k >= 4) disco(nx, nz, 0.7, 0.35, 'som', 3);
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

export const IDS_PODERES_ESPECIAIS: readonly string[] = [
  'tremFantasma',
  'dadosCaoticos',
  'espelhoPrismatico',
  'orquestraOrbital',
  ...NOVOS_PODERES_IDS,
  ...PODERES_FOFOS_IDS,
];
/** Tetos por ativação, inclusive com passivas extremas e inimigos sobrepostos. */
export const LIMITE_TAREFAS_PODER = 48;
export const LIMITE_ACERTOS_PODER = 160;
export const LIMITE_FITAS_PODER = 192;
export const LIMITE_PLANOS_PODER = 36;

function lancarNovoPoder<T extends AlvoEspecial>(ctx: ContextoPoderEspecial<T>): true {
  const { id, valores: v, x, z, angulo: ang } = ctx;
  let fitas = 0,
    planos = 0;
  // Estas receitas só usam fitas e planos; o orçamento local se soma aos pools globais.
  const fx = {
    raios: {
      chicote: (...args: Parameters<SistemaFx['raios']['chicote']>) => {
        if (fitas++ < LIMITE_FITAS_PODER) ctx.fx.raios.chicote(...args);
      },
    },
    planos: {
      criar: (...args: Parameters<SistemaFx['planos']['criar']>) => {
        if (planos++ < LIMITE_PLANOS_PODER) ctx.fx.planos.criar(...args);
      },
    },
  } as unknown as SistemaFx;
  if (![x, z, ang, v.dano, v.area, v.alcance, v.quantidade, v.duracao].every(Number.isFinite))
    return true;
  const area = Math.max(0.2, Math.min(12, v.area));
  const alcance = Math.max(1, Math.min(24, v.alcance));
  const qtd = Math.max(1, Math.min(12, Math.floor(v.quantidade)));
  const dur = Math.max(0.6, Math.min(2.6, v.duracao));
  const ritmo = Math.max(0.5, Math.min(3, v.velocidade / 10 || 1));
  let tarefas = 0,
    acertos = 0;
  const depois = (t: number, fn: () => void) => {
    if (tarefas++ < LIMITE_TAREFAS_PODER) ctx.agendar(fn, Math.max(0, t) / ritmo);
  };
  const vivos = () =>
    ctx.inimigos.filter((a) => vivo(a) && Number.isFinite(a.x) && Number.isFinite(a.z));
  const proximos = () =>
    vivos()
      .filter((a) => Math.hypot(a.x - x, a.z - z) <= alcance + (a.raio || 0))
      .sort((a, b) => Math.hypot(a.x - x, a.z - z) - Math.hypot(b.x - x, b.z - z));
  const alvo = proximos()[0];
  const dir = alvo ? Math.atan2(alvo.z - z, alvo.x - x) : ang;
  const cx = alvo?.x ?? x + Math.cos(dir) * alcance * 0.55;
  const cz = alvo?.z ?? z + Math.sin(dir) * alcance * 0.55;
  const acertar = (a: T, fator: number, el: Elemento, ox: number, oz: number, forca = 2) => {
    if (vivo(a) && acertos < LIMITE_ACERTOS_PODER && v.dano > 0) {
      acertos++;
      ctx.atingir(a, v.dano * fator, el, a.x - ox, a.z - oz, forca);
    }
  };
  const disco = (px: number, pz: number, r: number, f: number, el: Elemento, forca = 2) => {
    for (const a of vivos())
      if (Math.hypot(a.x - px, a.z - pz) <= r + (a.raio || 0)) acertar(a, f, el, px, pz, forca);
  };
  const segmento = (
    ax: number,
    az: number,
    bx: number,
    bz: number,
    r: number,
    f: number,
    el: Elemento,
    cor: string,
    forca = 2,
    atingidos?: Set<T>
  ) => {
    fioEspecial(fx, ax, az, bx, bz, cor, Math.max(0.1, Math.min(0.3, r * 0.4)));
    for (const a of vivos())
      if (!atingidos?.has(a) && distanciaSegmento(a.x, a.z, ax, az, bx, bz) <= r + (a.raio || 0)) {
        atingidos?.add(a);
        acertar(a, f, el, ax, az, forca);
      }
  };
  const coroa = (
    px: number,
    pz: number,
    r: number,
    f: number,
    el: Elemento,
    cor: string,
    forca: number
  ) => {
    ondaMusical(fx, px, pz, r, cor);
    for (const a of vivos())
      if (Math.abs(Math.hypot(a.x - px, a.z - pz) - r) <= 0.5 + (a.raio || 0))
        acertar(a, f, el, px, pz, forca);
  };
  const objeto = (px: number, pz: number, cor: string, escala = 0.65, a = dir, tempo = 0.35) => {
    if (PODERES_FOFOS_IDS.some((novo) => novo === id))
      manifestarPoder(fx, id, px, pz, Math.min(5, ctx.nivel), a);
    else desenharArtefato(fx, id, px, pz, a, escala, cor, ctx.nivel, tempo);
  };
  const ponto = (px: number, pz: number, a: number, r: number): [number, number] => [
    px + Math.cos(a) * r,
    pz + Math.sin(a) * r,
  ];

  if (id === 'fitaAurora') {
    const lacos = Math.min(6, qtd + (v.evo10 ? 3 : v.evo5 ? 1 : 0));
    for (let laco = 0; laco < lacos; laco++) {
      const vistos = new Set<T>();
      for (let passo = 0; passo < 6; passo++)
        depois(0.08 + passo * 0.07, () => {
          const a = dir + (laco * TAU) / lacos - 0.65 + passo * 0.26;
          const [px, pz] = ponto(x, z, a, area);
          segmento(x, z, px, pz, 0.65, 1, 'luz', '#ffb8ed', 3, vistos);
        });
    }
    return true;
  }
  if (id === 'cometaCaramelo') {
    for (let i = 0; i < Math.min(4, qtd); i++) {
      let px = x,
        pz = z;
      const visitados = new Set<T>();
      const saltos = v.evo10 ? 8 : v.evo5 ? 5 : 3;
      for (let salto = 0; salto < saltos; salto++)
        depois(0.12 + i * 0.055 + salto * 0.15, () => {
          const presa = vivos()
            .filter((a) => !visitados.has(a) && Math.hypot(a.x - px, a.z - pz) <= alcance)
            .sort((a, b) => Math.hypot(a.x - px, a.z - pz) - Math.hypot(b.x - px, b.z - pz))[0];
          if (!presa) return;
          const tx = presa.x,
            tz = presa.z;
          segmento(px, pz, tx, tz, Math.min(0.9, area), 1, 'arcano', '#ffc985', 2);
          visitados.add(presa);
          px = tx;
          pz = tz;
          if (v.evo5) disco(px, pz, Math.min(2, area * 1.5), 0.35, 'arcano', 3);
          if (salto === 0) objeto(px, pz, '#ff91c7', 0.3);
        });
    }
    return true;
  }
  if (id === 'chuvaPetalas') {
    const candidatos = proximos();
    for (let i = 0; i < Math.min(8, qtd); i++) {
      const alvoFlor = candidatos[i % Math.max(1, candidatos.length)];
      const a = ctx.rnd() * TAU,
        r = ctx.rnd() * Math.min(2, area);
      const px = (alvoFlor?.x ?? cx) + Math.cos(a) * r;
      const pz = (alvoFlor?.z ?? cz) + Math.sin(a) * r;
      ondaMusical(fx, px, pz, area, '#b2f7a5');
      depois(0.4 + i * 0.06, () => {
        objeto(px, pz, '#ff9ac6', 0.4);
        disco(px, pz, area, 1, 'veneno', 2);
      });
      if (v.evo5)
        for (let pulso = 0; pulso < 2; pulso++)
          depois(0.9 + i * 0.06 + pulso * 0.4, () => {
            ondaMusical(fx, px, pz, area * 0.8, '#b2f7a5');
            disco(px, pz, area * 0.8, 0.3, 'veneno', 0);
          });
      if (v.evo10)
        depois(1.8 + i * 0.06, () => {
          coroa(px, pz, area * 1.5, 0.7, 'veneno', '#ff9ac6', 4);
          disco(px, pz, area, 0.8, 'veneno', 4);
        });
    }
    return true;
  }
  if (id === 'coelhoLunar') {
    for (let i = 0; i < Math.min(5, qtd); i++) {
      const a = dir + (i - (Math.min(5, qtd) - 1) / 2) * 0.22;
      const vistos = new Set<T>();
      for (let passo = 0; passo < 6; passo++)
        depois(0.1 + passo * 0.1, () => {
          const [ax, az] = ponto(x, z, a, (passo * alcance) / 6);
          const [bx, bz] = ponto(x, z, a, ((passo + 1) * alcance) / 6);
          segmento(ax, az, bx, bz, Math.min(1.2, area), 1, 'luz', '#f3e8ff', 3, vistos);
          if (passo === 1 || passo === 4) objeto(bx, bz, '#a8d4ff', 0.25, a);
          if (v.evo5 && passo === 3)
            for (const lado of [-1, 1]) {
              const [ex, ez] = ponto(bx, bz, a + lado * 0.8, Math.max(2, area * 2));
              segmento(bx, bz, ex, ez, 0.45, 0.45, 'luz', '#a8d4ff');
            }
          if (v.evo10 && passo === 5) disco(bx, bz, area * 2.5, 1.1, 'luz', 6);
        });
    }
    return true;
  }
  if (id === 'jardimLunar') {
    const tempoJardim = Math.max(0.6, Math.min(8, v.duracao));
    for (let i = 0; i < Math.min(3, qtd); i++) {
      const [px, pz] = i ? ponto(cx, cz, dir + (i * TAU) / 3, area * 1.5) : [cx, cz];
      objeto(px, pz, '#c6a6ff', 0.65, dir, tempoJardim);
      for (let pulso = 0; pulso < 5; pulso++)
        depois(0.2 + (pulso * tempoJardim) / 5, () => {
          ondaMusical(fx, px, pz, area, '#c6a6ff');
          disco(px, pz, area, 0.55, 'gravidade', -5);
          if (v.evo5 && pulso % 2 === 1) disco(px, pz, area * 0.75, 0.25, 'codigo', -2);
        });
      if (v.evo10)
        depois(tempoJardim + 0.2, () => {
          objeto(px, pz, '#eaffb5', 0.85);
          disco(px, pz, area * 1.5, 1.5, 'gravidade', 9);
        });
    }
    return true;
  }
  if (id === 'abracoEstelar') {
    const ondas = Math.min(5, qtd + (v.evo10 ? 2 : v.evo5 ? 1 : 0));
    for (let onda = 0; onda < ondas; onda++) {
      const vistos = new Set<T>();
      for (let passo = 1; passo <= 6; passo++)
        depois(onda * 0.38 + passo * 0.07, () => {
          const r = (area * passo) / 6;
          ondaMusical(fx, x, z, r, onda % 2 ? '#fff0ad' : '#ffb4ce');
          for (const a of vivos())
            if (
              !vistos.has(a) &&
              Math.abs(Math.hypot(a.x - x, a.z - z) - r) <= area / 6 + (a.raio || 0)
            ) {
              vistos.add(a);
              acertar(a, 1, 'som', x, z, v.evo10 ? 12 : 6);
            }
        });
    }
    return true;
  }

  if (id === 'serpenteEletrica') {
    const n = Math.min(10, 6 + qtd),
      vistos = new Set<T>();
    const p = (i: number): [number, number] => {
      const u = i / n,
        lateral = Math.sin(u * Math.PI * 4) * Math.min(1.3, area);
      return [
        x + Math.cos(dir) * alcance * u - Math.sin(dir) * lateral,
        z + Math.sin(dir) * alcance * u + Math.cos(dir) * lateral,
      ];
    };
    for (let i = 0; i < n; i++)
      depois((i * dur) / n, () => {
        const [ax, az] = p(i),
          [bx, bz] = p(i + 1);
        segmento(ax, az, bx, bz, area * 0.65, 1, 'raio', '#dcff58', 2, vistos);
        if (i % 3 === 0) objeto(bx, bz, '#dcff58', 0.38, Math.atan2(bz - az, bx - ax));
        if (v.evo5 && i === n - 1)
          for (const lado of [-1, 1]) {
            const [ex, ez] = ponto(bx, bz, dir + lado * 0.8, area * 3);
            segmento(bx, bz, ex, ez, area * 0.55, 0.7, 'raio', '#7cffe9');
          }
      });
    if (v.evo10) {
      const retorno = new Set<T>();
      for (let i = n; i > 0; i--)
        depois(dur + (n - i) * 0.055, () => {
          const [ax, az] = p(i),
            [bx, bz] = p(i - 1);
          segmento(ax, az, bx, bz, area * 0.65, 0.7, 'raio', '#7cffe9', 2, retorno);
          if (i === 1) {
            objeto(x, z, '#dcff58', 0.9);
            disco(x, z, area * 2, 1.1, 'raio');
          }
        });
    }
    return true;
  }
  if (id === 'portalBumerangue') {
    const lateral = Math.min(4, Math.max(2.5, area * 2));
    const ox = cx - Math.sin(dir) * lateral,
      oz = cz + Math.cos(dir) * lateral;
    const rotas = [
      { ax: x, az: z, bx: cx, bz: cz },
      {
        ax: ox,
        az: oz,
        bx: ox - Math.cos(dir) * alcance * 0.55,
        bz: oz - Math.sin(dir) * alcance * 0.55,
      },
    ];
    if (v.evo5)
      rotas.push({
        ax: cx + Math.sin(dir) * lateral,
        az: cz - Math.cos(dir) * lateral,
        bx: x + Math.sin(dir) * lateral,
        bz: z - Math.cos(dir) * lateral,
      });
    objeto(cx, cz, '#bc7bff', 0.6, dir, dur);
    objeto(ox, oz, '#54edff', 0.6, dir, dur);
    // Não existe colisão entre entrada e saída: a distância do teleporte é vazia.
    rotas.forEach((r, i) =>
      depois(0.12 + i * 0.22, () => {
        segmento(r.ax, r.az, r.bx, r.bz, area * 0.6, 1, 'arcano', i ? '#54edff' : '#bc7bff');
      })
    );
    if (v.evo10)
      depois(0.92, () => {
        for (const r of rotas) segmento(r.bx, r.bz, r.ax, r.az, area, 0.65, 'arcano', '#f1ccff');
        segmento(ox, oz, cx, cz, area * 0.6, 0.8, 'arcano', '#f1ccff');
      });
    return true;
  }
  if (id === 'constelacao') {
    const n = Math.min(7, Math.max(3, qtd));
    const estrelas = Array.from({ length: n }, (_, i) => ponto(cx, cz, dir + (i * TAU) / n, area));
    estrelas.forEach(([px, pz]) => objeto(px, pz, '#a6cfff', 0.19));
    for (let i = 0; i < n; i++)
      depois(0.22 + i * 0.08, () => {
        const [ax, az] = estrelas[i],
          [bx, bz] = estrelas[(i + 1) % n];
        segmento(ax, az, bx, bz, 0.45, 1, 'luz', '#a6cfff');
        if (v.evo5) {
          const [dx, dz] = estrelas[(i + 2) % n];
          segmento(ax, az, dx, dz, 0.38, 0.5, 'luz', '#fff4ae');
        }
      });
    if (v.evo10)
      depois(1.1, () => {
        for (const [ax, az] of estrelas) segmento(ax, az, cx, cz, 0.4, 0.55, 'luz', '#fff4ae');
        objeto(cx, cz, '#fff4ae', 0.8);
        disco(cx, cz, area * 0.5, 1.3, 'luz', 6);
      });
    return true;
  }
  if (id === 'sinoGravitacional') {
    objeto(x, z, '#c4a0ff', 0.9, dir, dur);
    for (let i = 1; i <= 4; i++)
      depois((i * dur) / 5, () => {
        coroa(x, z, (area * i) / 4, 0.75, 'gravidade', '#c4a0ff', -5);
        if (v.evo5)
          depois(0.11, () => coroa(x, z, (area * (5 - i)) / 4, 0.35, 'gravidade', '#f5dc90', -3));
      });
    if (v.evo10)
      depois(dur + 0.24, () => {
        objeto(x, z, '#f5dc90', 1.1);
        disco(x, z, area * 1.25, 1.2, 'som', 10);
      });
    return true;
  }
  if (id === 'jardimEspinhos') {
    const n = Math.min(9, Math.max(3, qtd));
    const sementes: [number, number][] = [[cx, cz]];
    for (let i = 1; i < n; i++)
      sementes.push(ponto(cx, cz, dir + ((i - 1) * TAU) / (n - 1), area * 2));
    for (let i = 0; i < n; i++) {
      const [px, pz] = sementes[i];
      objeto(px, pz, '#91f097', 0.22, dir, 0.55);
      depois(0.4 + i * 0.09, () => {
        objeto(px, pz, '#ff91bb', 0.45);
        disco(px, pz, area, 1, 'veneno', 2);
        if (v.evo5 && i) segmento(cx, cz, px, pz, 0.35, 0.45, 'terra', '#91f097', -2);
      });
      if (v.evo10)
        depois(1.15 + i * 0.045, () => {
          coroa(px, pz, area * 1.5, 0.75, 'veneno', '#ff91bb', 5);
          objeto(px, pz, '#ff91bb', 0.6);
        });
    }
    return true;
  }
  if (id === 'furacaoLaminas') {
    const passos = 8,
      bracos = Math.min(4, qtd);
    for (let i = 0; i < passos; i++)
      depois((i * dur) / passos, () => {
        const u = i / passos,
          px = x + (cx - x) * u,
          pz = z + (cz - z) * u;
        const sinais = v.evo5 ? [-1, 1] : [1];
        for (const sinal of sinais)
          for (let j = 0; j < bracos; j++) {
            const a = dir + (j * TAU) / bracos + sinal * u * TAU;
            const [ax, az] = ponto(px, pz, a, area * 0.75);
            const [bx, bz] = ponto(px, pz, a + sinal * 0.7, area * 1.15);
            segmento(ax, az, bx, bz, 0.45, sinal === -1 ? 0.35 : 0.6, 'vento', '#83ffdb', 4);
          }
        if (i % 3 === 0) objeto(px, pz, '#83ffdb', 0.55);
      });
    if (v.evo10)
      depois(dur + 0.1, () => {
        for (let j = 0; j < 4; j++) {
          const [ax, az] = ponto(cx, cz, (j * Math.PI) / 2, area);
          segmento(ax, az, cx, cz, 0.65, 0.7, 'vento', '#e0fff3', -5);
        }
      });
    return true;
  }
  if (id === 'marioneteAstral') {
    const presas = proximos().slice(0, Math.min(8, qtd));
    objeto(x, z, '#f4b3ff', 0.8, dir, dur);
    for (let pulso = 0; pulso < 3; pulso++)
      depois(0.18 + (pulso * dur) / 3, () => {
        const ativas = presas.filter((a) => vivo(a) && Math.hypot(a.x - x, a.z - z) <= alcance);
        for (const a of ativas) {
          fioEspecial(fx, x, z, a.x, a.z, '#f4b3ff', 0.13, 2.3);
          // Vetor a.x-x com força negativa puxa a presa para a barra de controle.
          acertar(a, 0.55, 'gravidade', x, z, -5);
        }
        if (v.evo5 && ativas.length > 1)
          for (let i = 0; i < ativas.length - 1; i++) {
            const a = ativas[i],
              b = ativas[i + 1];
            segmento(a.x, a.z, b.x, b.z, 0.32, 0.3, 'arcano', '#c3a2ff', -1);
          }
      });
    if (v.evo10)
      depois(dur + 0.25, () => {
        for (const a of presas)
          if (vivo(a) && Math.hypot(a.x - x, a.z - z) <= alcance) {
            objeto(a.x, a.z, '#f4b3ff', 0.36);
            disco(a.x, a.z, area, 1.2, 'arcano', 6);
          }
      });
    return true;
  }
  if (id === 'mandalaMeteoro') {
    const n = Math.min(7, Math.max(3, qtd));
    const vertices = Array.from({ length: n }, (_, i) =>
      ponto(cx, cz, dir + (i * TAU) / n, area * 1.4)
    );
    objeto(cx, cz, '#ffe8b1', 0.75, dir, 0.8);
    vertices.forEach(([px, pz], i) =>
      depois(0.45 + i * 0.1, () => {
        // Rastro vertical de queda e impacto correspondem à posição marcada do vértice.
        fx.raios.chicote([px - 0.7, 5, pz - 0.5, px, 0.1, pz], '#ffa86c', {
          vida: 0.28,
          largura: 0.22,
        });
        disco(px, pz, area, 1, 'fogo', 5);
        if (v.evo5) {
          const [bx, bz] = vertices[(i + 1) % n];
          segmento(px, pz, bx, bz, 0.4, 0.45, 'fogo', '#ffa86c');
        }
      })
    );
    if (v.evo10)
      depois(1.45, () => {
        for (const [px, pz] of vertices) segmento(px, pz, cx, cz, 0.35, 0.4, 'fogo', '#ffe8b1');
        objeto(cx, cz, '#ffe8b1', 0.9);
        disco(cx, cz, area * 1.25, 1.5, 'fogo', 8);
      });
    return true;
  }
  if (id === 'ancoraCeleste') {
    depois(0.15, () => {
      segmento(x, z, cx, cz, 0.65, 1, 'terra', '#8fe0ff', 4);
      objeto(cx, cz, '#8fe0ff', 0.75, dir, dur);
    });
    for (let i = 0; i < 3; i++)
      depois(0.4 + i * 0.26, () => {
        fioEspecial(fx, x, z, cx, cz, '#ffe4ab', 0.16);
        disco(cx, cz, area, 0.35, 'gravidade', -7);
        if (v.evo5) {
          const [ax, az] = ponto(cx, cz, dir + Math.PI / 2, area);
          const [bx, bz] = ponto(cx, cz, dir - Math.PI / 2, area);
          segmento(ax, az, bx, bz, 0.45, 0.4, 'terra', '#ffe4ab', -3);
        }
      });
    if (v.evo10)
      depois(1.3, () => {
        segmento(cx, cz, x, z, 1, 1.3, 'terra', '#8fe0ff', -6);
        objeto(x, z, '#ffe4ab', 0.85);
      });
    return true;
  }
  if (id === 'bolhasEstase') {
    const candidatos = proximos(),
      n = Math.min(6, qtd);
    const bolhas = Array.from({ length: n }, (_, i): [number, number] => {
      const a = candidatos[i];
      return a ? [a.x, a.z] : ponto(cx, cz, (i * TAU) / n, area * 1.5);
    });
    for (let i = 0; i < n; i++) {
      const [px, pz] = bolhas[i];
      objeto(px, pz, '#9bf5ff', 0.5, 0, dur);
      for (let pulso = 0; pulso < 3; pulso++)
        depois(0.18 + pulso * 0.3 + i * 0.035, () => {
          disco(px, pz, area, 0.4, 'gelo', 0);
          ondaMusical(fx, px, pz, area, '#9bf5ff');
        });
      depois(1.05 + i * 0.055, () => {
        objeto(px, pz, '#e9bdff', 0.65);
        disco(px, pz, area * 1.15, 1, 'gelo', 5);
        if (v.evo5 && n > 1) {
          const [bx, bz] = bolhas[(i + 1) % n];
          fioEspecial(fx, px, pz, bx, bz, '#e9bdff');
          disco(bx, bz, area * 0.7, 0.4, 'gelo', 2);
        }
      });
      if (v.evo10)
        depois(1.4 + i * 0.055, () => coroa(px, pz, area * 1.9, 0.8, 'gelo', '#e9bdff', 4));
    }
    return true;
  }
  if (id === 'enxameVespas') {
    const n = Math.min(8, qtd),
      marcados = new Set<T>();
    const vespas = Array.from({ length: n }, (_, i) => ({
      x: x + Math.cos((i * TAU) / n),
      z: z + Math.sin((i * TAU) / n),
    }));
    for (let passo = 0; passo < 3; passo++)
      depois(0.12 + passo * 0.32, () => {
        for (const vespa of vespas) {
          const opcoes = proximos().sort(
            (a, b) =>
              (v.evo5 ? Number(marcados.has(a)) - Number(marcados.has(b)) : 0) ||
              Math.hypot(a.x - vespa.x, a.z - vespa.z) - Math.hypot(b.x - vespa.x, b.z - vespa.z)
          );
          const presa = opcoes[0];
          const ax = vespa.x,
            az = vespa.z;
          const tx = presa?.x ?? ax + Math.cos(dir) * 2,
            tz = presa?.z ?? az + Math.sin(dir) * 2;
          const d = Math.hypot(tx - ax, tz - az),
            passoMax = alcance * 0.6;
          vespa.x += (tx - ax) * Math.min(1, passoMax / (d || 1));
          vespa.z += (tz - az) * Math.min(1, passoMax / (d || 1));
          objeto(vespa.x, vespa.z, '#ffe079', 0.22, Math.atan2(tz - az, tx - ax));
          // Colisão só no voo visível, nunca dano remoto ao alvo escolhido.
          segmento(ax, az, vespa.x, vespa.z, area, 0.55, 'veneno', '#a8ffbd');
          if (presa && Math.hypot(presa.x - vespa.x, presa.z - vespa.z) <= area + (presa.raio || 0))
            marcados.add(presa);
        }
        if (v.evo10 && passo === 2)
          for (let i = 0; i < n; i++) {
            const a = vespas[i],
              b = vespas[(i + 1) % n];
            segmento(a.x, a.z, b.x, b.z, 0.3, 0.45, 'veneno', '#ffe079');
          }
      });
    return true;
  }
  if (id === 'tempestadeEspadas') {
    const n = Math.min(9, Math.max(3, qtd));
    const comprimento = Math.max(3, Math.min(7, area * 3));
    for (let i = 0; i < n; i++) {
      const lateral = (i - (n - 1) / 2) * Math.max(1, area);
      const px = cx - Math.sin(dir) * lateral,
        pz = cz + Math.cos(dir) * lateral;
      objeto(px, pz, '#d2e5ff', 0.3, dir, 0.5);
      depois(0.4 + i * 0.07, () => {
        const [ax, az] = ponto(px, pz, dir + Math.PI, comprimento);
        const [bx, bz] = ponto(px, pz, dir, comprimento);
        segmento(ax, az, bx, bz, 0.45, 1, 'cristal', '#d2e5ff');
        if (v.evo5) {
          const [dx, dz] = ponto(px, pz, dir + Math.PI / 2, comprimento * 0.6);
          const [ex, ez] = ponto(px, pz, dir - Math.PI / 2, comprimento * 0.6);
          segmento(dx, dz, ex, ez, 0.35, 0.45, 'cristal', '#ffc4dc');
        }
      });
      if (v.evo10)
        depois(1.2 + i * 0.035, () => {
          segmento(px, pz, cx, cz, 0.5, 0.8, 'cristal', '#ffc4dc', -4);
          objeto(cx, cz, '#ffc4dc', 0.22, Math.atan2(cz - pz, cx - px));
        });
    }
  }
  return true;
}
