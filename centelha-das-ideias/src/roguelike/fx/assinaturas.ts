/** Assinaturas tridimensionais por habilidade, emitidas uma vez por ativação. */
import { HABILIDADES } from '../dados/habilidades';
import type { SistemaFx } from './indice';
import { ESTILO_PLANO } from './ondas';

export interface AssinaturaPoder {
  /** Pontos locais intercalados x,y,z; no máximo 12 trilhas de 60 pontos. */
  trilhas: number[][];
  escala: number;
  espessura: number;
  duracao: number;
}

type Ponto = readonly [number, number, number];
const TAU = Math.PI * 2;
const caminho = (n: number, fn: (u: number) => Ponto): number[] => {
  const pontos: number[] = [];
  for (let i = 0; i < n; i++) pontos.push(...fn(i / (n - 1)));
  return pontos;
};
const linha = (...pontos: Ponto[]): number[] => pontos.flat();
const anel = (r: number, y = 0.6, n = 41, fase = 0): number[] =>
  caminho(n, (u) => [Math.cos(u * TAU + fase) * r, y, Math.sin(u * TAU + fase) * r]);
const estrela = (r: number, pontas: number, y: number, fase = 0): number[] =>
  caminho(pontas * 2 + 1, (u) => {
    const i = Math.round(u * pontas * 2);
    const rr = i % 2 ? r * 0.43 : r;
    return [Math.cos(u * TAU + fase) * rr, y, Math.sin(u * TAU + fase) * rr];
  });

/** Geometria determinística que também permite testar cobertura e custo sem WebGL. */
export function desenharAssinatura(id: string, nivel = 1): AssinaturaPoder | null {
  const n = Number.isFinite(nivel) ? Math.max(1, Math.min(10, Math.floor(nivel))) : 1;
  const trilhas: number[][] = [];
  switch (id) {
    case 'centelhaOrbital':
      trilhas.push(anel(1.65), estrela(1.2, 5, 0.9, Math.PI / 2));
      break;
    case 'raioCadeia':
      // Corrente angular com três bifurcações, diferente da queda celeste.
      trilhas.push(
        linha([0, 0.5, 0], [0.8, 1.3, 0.2], [1.1, 0.4, -0.5], [2, 1.1, -0.1], [2.7, 0.5, 0.7])
      );
      for (let j = 0; j < 3; j++)
        trilhas.push(
          linha([0.8 + j * 0.6, 0.9, 0], [1 + j * 0.6, 1.6, -0.9], [1.5 + j * 0.6, 0.7, -1.2])
        );
      break;
    case 'bolaFogo':
      // Fênix: corpo ascendente e duas asas com penas curvas.
      trilhas.push(caminho(25, (u) => [u * 2.6, 0.55 + Math.sin(u * Math.PI) * 0.7, 0]));
      for (const lado of [-1, 1]) {
        trilhas.push(
          caminho(33, (u) => [
            0.3 + u * 2.1,
            0.7 + Math.sin(u * Math.PI) * 1.1,
            lado * Math.sin(u * Math.PI) * 1.8,
          ])
        );
        for (let j = 0; j < 3; j++)
          trilhas.push(
            caminho(15, (u) => [
              0.6 + j * 0.48 - u * 0.6,
              0.8 + Math.sin(u * Math.PI) * 0.4,
              lado * (0.6 + j * 0.25 + u * 0.75),
            ])
          );
      }
      break;
    case 'lancaGelo':
      // Lança facetada, ponta e duas cristas longitudinais.
      trilhas.push(
        linha([0, 0.55, 0], [2.8, 0.8, 0], [1.9, 1.3, -0.45], [2.8, 0.8, 0], [1.9, 0.35, 0.45])
      );
      for (const lado of [-1, 1])
        trilhas.push(linha([0.1, 0.55, lado * 0.2], [1.7, 0.8, lado * 0.28], [2.8, 0.8, 0]));
      break;
    case 'novaGlacial':
      // Floco de seis braços com ramificações, jamais um simples círculo azul.
      for (let j = 0; j < 6; j++) {
        const a = (j * TAU) / 6;
        const p = (r: number, off = 0): Ponto => [
          Math.cos(a + off) * r,
          0.3,
          Math.sin(a + off) * r,
        ];
        trilhas.push(linha(p(0), p(2.1)));
        trilhas.push(linha(p(1.6, -0.28), p(1.15), p(1.6, 0.28)));
      }
      break;
    case 'chuvaMeteoros':
      for (let j = 0; j < 3; j++) {
        trilhas.push(
          caminho(27, (u) => [
            j * 0.85 - 1 + u * 1.4,
            3.5 * (1 - u) + 0.25,
            (j - 1) * 0.75 + u * 0.7,
          ])
        );
        trilhas.push(
          estrela(0.55, 4 + j, 0.2 + j * 0.06).map((v, i) =>
            i % 3 === 0 ? v + j * 0.85 - 0.1 : i % 3 === 2 ? v + (j - 1) * 0.75 + 0.7 : v
          )
        );
      }
      break;
    case 'laminaVento':
      for (let j = 0; j < 3; j++)
        trilhas.push(
          caminho(29, (u) => [
            Math.cos((u - 0.5) * 2.5) * (1.2 + j * 0.42),
            0.4 + u * 0.7,
            Math.sin((u - 0.5) * 2.5) * (1.2 + j * 0.42),
          ])
        );
      break;
    case 'chicoteLuz':
      // Duas cordas trançadas e a ponta em estrela.
      for (const fase of [0, Math.PI])
        trilhas.push(
          caminho(47, (u) => [
            u * 3.5,
            0.8 + Math.sin(u * TAU * 3 + fase) * 0.22,
            Math.sin(u * TAU * 3 + fase) * 0.25 + Math.sin(u * Math.PI) * 0.6,
          ])
        );
      trilhas.push(estrela(0.35, 4, 0.8).map((v, i) => (i % 3 === 0 ? v + 3.5 : v)));
      break;
    case 'auraSagrada':
      // Rosácea e halo elevado.
      trilhas.push(
        caminho(57, (u) => {
          const r = 1.4 + 0.45 * Math.cos(u * TAU * 6);
          return [Math.cos(u * TAU) * r, 0.2, Math.sin(u * TAU) * r];
        })
      );
      trilhas.push(anel(0.75, 2));
      for (let j = 0; j < 4; j++)
        trilhas.push(
          linha(
            [Math.cos((j * Math.PI) / 2) * 0.75, 0.2, Math.sin((j * Math.PI) / 2) * 0.75],
            [0, 1.6, 0]
          )
        );
      break;
    case 'tornado':
      for (let j = 0; j < 3; j++)
        trilhas.push(
          caminho(57, (u) => {
            const a = u * TAU * 2.5 + (j * TAU) / 3;
            const r = 0.25 + u * 1.35;
            return [Math.cos(a) * r, 0.2 + u * 3.1, Math.sin(a) * r];
          })
        );
      break;
    case 'misseis':
      for (let j = 0; j < 4; j++)
        trilhas.push(
          caminho(33, (u) => [
            u * 3,
            0.8 + Math.sin(u * Math.PI) * (0.35 + j * 0.2),
            Math.sin(u * Math.PI) * (j - 1.5) * 0.65,
          ])
        );
      trilhas.push(linha([2.6, 1.25, -0.35], [3.1, 0.8, 0], [2.6, 0.35, 0.35]));
      break;
    case 'espinhosTerra':
      for (let j = 0; j < 5; j++) {
        const x = (j - 2) * 0.65;
        const h = 1.2 + (2 - Math.abs(j - 2)) * 0.45;
        trilhas.push(
          linha([x - 0.25, 0.1, -0.35], [x, h, 0], [x + 0.25, 0.1, 0.35], [x - 0.25, 0.1, -0.35])
        );
      }
      break;
    case 'laserGiratorio':
      for (let j = 0; j < 4; j++) {
        const a = (j * Math.PI) / 2;
        trilhas.push(
          caminho(17, (u) => [
            Math.cos(a) * (0.4 + u * 2.7),
            0.9 + Math.sin(u * Math.PI) * 0.08,
            Math.sin(a) * (0.4 + u * 2.7),
          ])
        );
      }
      trilhas.push(anel(0.4, 0.9, 17));
      break;
    case 'discoDados':
      // Disco quadrado girado, trilha em ziguezague de ricochete.
      trilhas.push(
        linha([-0.7, 0.7, 0], [0, 0.7, -0.7], [0.7, 0.7, 0], [0, 0.7, 0.7], [-0.7, 0.7, 0])
      );
      trilhas.push(linha([0, 0.7, 0], [1.7, 0.7, -1.1], [2.3, 0.7, 0.8], [3.2, 0.7, -0.4]));
      break;
    case 'nuvemToxica':
      for (let j = 0; j < 4; j++)
        trilhas.push(
          caminho(41, (u) => {
            const a = u * TAU;
            const r = 0.6 + 0.14 * Math.sin(a * 5 + j);
            return [
              Math.cos(a) * r + Math.cos((j * Math.PI) / 2),
              0.5 + Math.sin(a * 2) * 0.25 + j * 0.16,
              Math.sin(a) * r + Math.sin((j * Math.PI) / 2),
            ];
          })
        );
      break;
    case 'relampagoCeleste':
      trilhas.push(
        linha(
          [-0.9, 4, 0],
          [-0.2, 2.7, 0.1],
          [-0.65, 2.5, 0.1],
          [0.3, 1.4, 0],
          [0, 1.4, 0],
          [0.2, 0.2, 0]
        )
      );
      trilhas.push(estrela(1.2, 7, 0.2));
      break;
    case 'escudoCristal':
      for (let j = 0; j < 6; j++) {
        const a = (j * TAU) / 6;
        const x = Math.cos(a) * 1.4;
        const z = Math.sin(a) * 1.4;
        trilhas.push(
          linha(
            [x * 0.7, 0.35, z * 0.7],
            [x, 1.15, z],
            [x * 0.7, 2, z * 0.7],
            [x * 0.7, 0.35, z * 0.7]
          )
        );
      }
      trilhas.push(anel(1.4, 1.15, 7));
      break;
    case 'buracoNegro':
      // Espirais da borda para o centro: leitura explícita de sucção.
      for (let j = 0; j < 3; j++)
        trilhas.push(
          caminho(57, (u) => {
            const a = u * TAU * 2 + (j * TAU) / 3;
            const r = 2.3 * (1 - u) + 0.12;
            return [Math.cos(a) * r, 0.2 + u * 0.45, Math.sin(a) * r];
          })
        );
      break;
    case 'serraCircular':
      trilhas.push(
        caminho(49, (u) => {
          const i = Math.round(u * 48);
          const r = i % 2 ? 1.2 : 1.65;
          return [Math.cos(u * TAU) * r, 0.75, Math.sin(u * TAU) * r];
        })
      );
      trilhas.push(anel(0.45, 0.75, 21));
      break;
    case 'pulsoSonico':
      for (let j = 0; j < 3; j++)
        trilhas.push(
          caminho(49, (u) => {
            const a = u * TAU;
            const r = 0.65 + j * 0.6 + Math.sin(a * (8 + j * 2)) * 0.1;
            return [Math.cos(a) * r, 0.4 + Math.sin(a * 4) * 0.18, Math.sin(a) * r];
          })
        );
      break;
    case 'droneDados':
      trilhas.push(
        linha(
          [-0.55, 1.2, -0.45],
          [0.55, 1.2, -0.45],
          [0.55, 1.2, 0.45],
          [-0.55, 1.2, 0.45],
          [-0.55, 1.2, -0.45]
        )
      );
      for (const x of [-0.85, 0.85])
        for (const z of [-0.7, 0.7])
          trilhas.push(
            anel(0.35, 1.2, 17).map((v, i) => (i % 3 === 0 ? v + x : i % 3 === 2 ? v + z : v))
          );
      trilhas.push(linha([0, 1.2, 0], [1.9, 0.7, 0]));
      break;
    case 'estrelasGemeas':
      for (const lado of [-1, 1]) {
        trilhas.push(estrela(0.8, 5, 0.7).map((v, i) => (i % 3 === 2 ? v + lado * 1.15 : v)));
        trilhas.push(
          caminho(25, (u) => [
            Math.sin(u * Math.PI) * 1.5,
            0.7 + Math.sin(u * Math.PI) * 0.2,
            lado * Math.cos(u * Math.PI) * 1.15,
          ])
        );
      }
      break;
    case 'cuspeToxico':
      trilhas.push(caminho(31, (u) => [u * 2.8, 0.25 + Math.sin(u * Math.PI) * 1.5, 0]));
      for (let j = 0; j < 3; j++)
        trilhas.push(
          caminho(25, (u) => {
            const a = u * TAU;
            const r = 0.3 + 0.08 * Math.sin(a * 3);
            return [Math.cos(a) * r + 2.5, 0.15 + j * 0.16, Math.sin(a) * r + (j - 1) * 0.45];
          })
        );
      break;
    case 'ondaProfunda':
      for (let j = 0; j < 3; j++)
        trilhas.push(
          caminho(43, (u) => [
            j * 0.6 + Math.sin(u * Math.PI) * 0.3,
            0.35 + Math.pow(Math.sin(u * Math.PI), 2) * (1.5 - j * 0.3),
            (u - 0.5) * 4,
          ])
        );
      break;
    case 'firewall':
      // Três células hexagonais verticais compondo uma muralha.
      for (let j = 0; j < 3; j++)
        trilhas.push(
          caminho(7, (u) => [
            0.6,
            1.1 + Math.sin(u * TAU) * 0.85,
            (j - 1) * 1.5 + Math.cos(u * TAU) * 0.85,
          ])
        );
      trilhas.push(linha([0.6, 0.2, -2.3], [0.6, 2.1, -2.3], [0.6, 2.1, 2.3], [0.6, 0.2, 2.3]));
      break;
    case 'coletorLixo':
      // Funil em grade convergente, com terminal cúbico central.
      for (let j = 0; j < 6; j++) {
        const a = (j * TAU) / 6;
        trilhas.push(
          linha(
            [Math.cos(a) * 2.1, 1.4, Math.sin(a) * 2.1],
            [Math.cos(a) * 0.45, 0.25, Math.sin(a) * 0.45],
            [0, 0.5, 0]
          )
        );
      }
      trilhas.push(
        linha(
          [-0.3, 0.2, -0.3],
          [0.3, 0.2, -0.3],
          [0.3, 0.8, 0.3],
          [-0.3, 0.8, 0.3],
          [-0.3, 0.2, -0.3]
        )
      );
      break;
    case 'breakpoint':
      for (const lado of [-1, 1])
        trilhas.push(
          linha(
            [lado * 0.9, 0.2, -0.45],
            [lado * 1.4, 0.2, -0.45],
            [lado * 1.4, 2, -0.45],
            [lado * 0.9, 2, -0.45]
          )
        );
      trilhas.push(linha([-0.25, 0.55, 0], [-0.25, 1.6, 0]));
      trilhas.push(linha([0.25, 0.55, 0], [0.25, 1.6, 0]));
      break;
    case 'recursao': {
      // Árvore binária de três gerações com sete trilhas, sem recursão ilimitada.
      trilhas.push(linha([0, 0.25, 0], [0.8, 0.9, 0]));
      for (const lado of [-1, 1]) {
        trilhas.push(linha([0.8, 0.9, 0], [1.6, 1.35, lado * 0.7]));
        for (const ramo of [-1, 1])
          trilhas.push(
            linha([1.6, 1.35, lado * 0.7], [2.4, 1.7 + ramo * 0.3, lado * 0.7 + ramo * 0.45])
          );
      }
      break;
    }
    default:
      return null;
  }
  const escala = n === 10 ? 1.8 : 1 + (n - 1) * 0.025;
  return {
    trilhas: trilhas.map((pontos) => pontos.map((v) => v * escala)),
    escala,
    espessura: n === 10 ? 0.26 : 0.13,
    duracao: n === 10 ? 1.15 : n >= 5 ? 0.72 : 0.58,
  };
}

/** Não guarda timers: a vida de cada trilha pertence ao relógio pausável do SistemaFx. */
export function manifestarPoder(
  fx: SistemaFx,
  id: string,
  x: number,
  z: number,
  nivel = 1,
  angulo = 0
): void {
  if (![x, z, angulo].every(Number.isFinite)) return;
  const forma = desenharAssinatura(id, nivel);
  const def = HABILIDADES.find((h) => h.id === id);
  if (!forma || !def) return;
  const c = Math.cos(angulo);
  const s = Math.sin(angulo);
  for (const local of forma.trilhas) {
    const mundo: number[] = [];
    for (let i = 0; i < local.length; i += 3)
      mundo.push(
        x + local[i] * c - local[i + 2] * s,
        local[i + 1],
        z + local[i] * s + local[i + 2] * c
      );
    fx.raios.chicote(mundo, def.cor, {
      largura: forma.espessura,
      vida: forma.duracao,
      brilho: 1.15,
    });
  }
  if (nivel >= 10) {
    // Crescimento lento e opacidade baixa: sensação suprema sem clarão de tela.
    fx.planos.criar({
      estilo: ESTILO_PLANO.AURA,
      x,
      z,
      raio: 0.6,
      raioFim: 3.2,
      vida: 1.3,
      cor: def.cor,
      cor2: def.cor2,
      alfa: 0.22,
      brilho: 0.7,
      entrada: 0.35,
      curva: 1.8,
      expansao: 1.2,
    });
  }
}
