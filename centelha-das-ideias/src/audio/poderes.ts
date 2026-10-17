/** Timbres e ritmos próprios das 32 habilidades. Toda automação usa o relógio WebAudio. */
import { SOM_POR_PODER, somDoPoder, type IdPoderSonoro, type IdSomPoder } from './catalogo-poderes';
import type { ApiAudio } from './contrato';
import type { DefinicaoSom, Receita } from './sons';
import type { CorRuido, Kit, TipoOnda } from './sintese';

type Emissao = (k: Kit, s: AudioNode, t: number, tom: number) => void;
const nota = (
  k: Kit,
  s: AudioNode,
  t: number,
  f: number,
  dur: number,
  p = 0.15,
  tipo: TipoOnda = 'triangle'
): void => {
  k.osc(s, t, { tipo, f, env: { a: 0.008, d: dur, p }, filtro: { tipo: 'lowpass', f: 3800 } });
};
const curva = (
  k: Kit,
  s: AudioNode,
  t: number,
  f0: number,
  f1: number,
  dur: number,
  p = 0.2,
  tipo: TipoOnda = 'sine'
): void => {
  k.osc(s, t, {
    tipo,
    f: [
      [0, f0],
      [dur, f1],
    ],
    env: { a: 0.012, d: dur, p },
    filtro: { tipo: 'lowpass', f: 3300 },
  });
};
const ar = (
  k: Kit,
  s: AudioNode,
  t: number,
  dur: number,
  f0: number,
  f1: number,
  p = 0.15,
  cor: CorRuido = 'rosa'
): void => {
  k.ruido(s, t, {
    cor,
    env: { a: Math.min(0.08, dur * 0.25), d: dur, p },
    filtro: {
      tipo: 'bandpass',
      f: [
        [0, f0],
        [dur, f1],
      ],
      q: 1.8,
    },
  });
};
const metal = (
  k: Kit,
  s: AudioNode,
  t: number,
  f: number,
  razao: number,
  dur: number,
  p = 0.15
): void => {
  k.fm(s, t, {
    f,
    razao,
    dev: [
      [0, f * 2],
      [dur, 8],
    ],
    env: { a: 0.006, d: dur, p },
  });
};
const sino = (k: Kit, s: AudioNode, t: number, f: number, dur: number, p = 0.13): void => {
  k.sino(
    s,
    t,
    f,
    [
      [1, 1, dur],
      [2.03, 0.28, dur * 0.6],
      [3.7, 0.09, dur * 0.4],
    ],
    p
  );
};

const RECEITAS: Record<IdPoderSonoro, Emissao> = {
  centelhaOrbital(k, s, t, q) {
    [0, 7, 12, 7].forEach((n, i) => sino(k, s, t + i * 0.065, 520 * 2 ** (n / 12) * q, 0.2, 0.1));
    nota(k, s, t, 260 * q, 0.35, 0.12, 'suave');
  },
  raioCadeia(k, s, t, q) {
    [0, 0.055, 0.14, 0.25].forEach((d, i) => {
      ar(k, s, t + d, 0.035, 2400 + i * 600, 6000, 0.12, 'branco');
      metal(k, s, t + d, (490 + i * 270) * q, 1.41, 0.08, 0.12);
    });
  },
  bolaFogo(k, s, t, q) {
    ar(k, s, t, 0.46, 350, 2200, 0.24, 'marrom');
    curva(k, s, t + 0.02, 160 * q, 75 * q, 0.3, 0.28);
    [0.05, 0.12, 0.21].forEach((d, i) =>
      curva(k, s, t + d, (600 + i * 100) * q, 1400 * q, 0.12, 0.07, 'suave')
    );
  },
  lancaGelo(k, s, t, q) {
    ar(k, s, t, 0.14, 4500, 1700, 0.13, 'branco');
    metal(k, s, t + 0.015, 1250 * q, 2.71, 0.34, 0.18);
    sino(k, s, t + 0.08, 2500 * q, 0.19, 0.06);
  },
  novaGlacial(k, s, t, q) {
    [1, 1.25, 1.5, 2, 2.5, 3].forEach((r, i) =>
      sino(k, s, t + Math.abs(i - 2.5) * 0.035, 660 * r * q, 0.4, 0.055)
    );
    ar(k, s, t, 0.5, 6500, 1200, 0.16, 'branco');
  },
  chuvaMeteoros(k, s, t, q) {
    for (let i = 0; i < 3; i++) {
      const d = i * 0.14;
      ar(k, s, t + d, 0.22, 1800, 250, 0.13, 'marrom');
      curva(k, s, t + d + 0.17, (130 - i * 15) * q, 42 * q, 0.25, 0.22);
    }
  },
  laminaVento(k, s, t, q) {
    for (let i = 0; i < 3; i++)
      ar(k, s, t + i * 0.06, 0.18 - i * 0.025, 700 + i * 600, 4800 - i * 500, 0.13, 'branco');
    curva(k, s, t + 0.02, 720 * q, 1800 * q, 0.18, 0.07);
  },
  chicoteLuz(k, s, t, q) {
    ar(k, s, t, 0.17, 500, 5400, 0.16, 'branco');
    metal(k, s, t + 0.16, 1800 * q, 3.16, 0.08, 0.2);
    sino(k, s, t + 0.19, 2200 * q, 0.3, 0.1);
  },
  auraSagrada(k, s, t, q) {
    for (const f of [330, 415.3, 495])
      k.osc(s, t, {
        tipo: 'suave',
        f: f * q,
        env: { a: 0.1, d: 0.12, s: 0.55, h: 0.24, r: 0.32, p: 0.09 },
      });
    sino(k, s, t + 0.18, 1320 * q, 0.55, 0.09);
  },
  tornado(k, s, t, q) {
    ar(k, s, t, 0.6, 220, 1500, 0.24, 'rosa');
    k.osc(s, t, {
      tipo: 'oco',
      f: [
        [0, 160 * q],
        [0.3, 240 * q],
        [0.6, 180 * q],
      ],
      env: { a: 0.08, d: 0.5, p: 0.12 },
      vib: { f: 12, c: 70 },
    });
  },
  misseis(k, s, t, q) {
    [0, 0.035, 0.11, 0.16].forEach((d, i) => {
      curva(k, s, t + d, (400 + i * 80) * q, 1400 * q, 0.22, 0.1, 'pulso');
      ar(k, s, t + d, 0.06, 1700, 3800, 0.07);
    });
  },
  espinhosTerra(k, s, t, q) {
    for (let i = 0; i < 5; i++) {
      curva(k, s, t + i * 0.055, (160 + i * 25) * q, 65 * q, 0.13, 0.15);
      ar(k, s, t + i * 0.055, 0.045, 600 + i * 300, 300, 0.1, 'marrom');
    }
  },
  laserGiratorio(k, s, t, q) {
    k.fm(s, t, {
      f: [
        [0, 440 * q],
        [0.17, 880 * q],
        [0.38, 660 * q],
      ],
      razao: 2,
      dev: [
        [0, 80],
        [0.17, 900],
        [0.38, 30],
      ],
      env: { a: 0.02, d: 0.1, s: 0.5, h: 0.18, r: 0.12, p: 0.18 },
    });
    for (let i = 0; i < 4; i++) nota(k, s, t + i * 0.06, 1760 * q, 0.035, 0.055, 'square');
  },
  discoDados(k, s, t, q) {
    [0, 0.12, 0.21].forEach((d, i) => {
      metal(k, s, t + d, (870 - i * 150) * q, 2.43 + i * 0.2, 0.15, 0.16 - i * 0.035);
      nota(k, s, t + d, 320 * q, 0.045, 0.08, 'square');
    });
  },
  nuvemToxica(k, s, t, q) {
    ar(k, s, t, 0.6, 900, 420, 0.2, 'rosa');
    for (let i = 0; i < 5; i++)
      curva(k, s, t + i * i * 0.018, (140 + i * 30) * q, (350 + i * 45) * q, 0.08, 0.1, 'oco');
  },
  relampagoCeleste(k, s, t, q) {
    ar(k, s, t, 0.05, 6500, 2300, 0.25, 'branco');
    curva(k, s, t + 0.035, 115 * q, 38 * q, 0.6, 0.28);
    ar(k, s, t + 0.06, 0.48, 700, 180, 0.2, 'marrom');
    metal(k, s, t, 950 * q, 1.73, 0.12, 0.11);
  },
  escudoCristal(k, s, t, q) {
    [784, 1176, 1568].forEach((f, i) => {
      metal(k, s, t + i * 0.07, f * q, 2.09, 0.45, 0.1);
      sino(k, s, t + i * 0.07 + 0.035, f * 2 * q, 0.2, 0.035);
    });
  },
  buracoNegro(k, s, t, q) {
    k.osc(s, t, {
      tipo: 'suave',
      f: [
        [0, 180 * q],
        [0.7, 45 * q],
      ],
      env: { a: 0.12, d: 0.65, p: 0.25 },
      vib: { f: 6, c: 55 },
    });
    ar(k, s, t, 0.65, 2500, 130, 0.18, 'marrom');
    metal(k, s, t + 0.12, 220 * q, 0.51, 0.55, 0.08);
  },
  serraCircular(k, s, t, q) {
    for (let i = 0; i < 7; i++) {
      nota(k, s, t + i * 0.035, (180 + (i % 2) * 45) * q, 0.045, 0.1, 'sawtooth');
      ar(k, s, t + i * 0.035, 0.028, 2200, 3800, 0.065, 'branco');
    }
  },
  pulsoSonico(k, s, t, q) {
    for (let i = 0; i < 3; i++) {
      curva(k, s, t + i * 0.12, (320 - i * 55) * q, (120 - i * 20) * q, 0.22, 0.22 / (i + 1));
      nota(k, s, t + i * 0.12, 640 * q, 0.11, 0.045, 'sine');
    }
  },
  droneDados(k, s, t, q) {
    nota(k, s, t, 165 * q, 0.36, 0.13, 'pulso');
    [660, 990, 825].forEach((f, i) => nota(k, s, t + 0.08 + i * 0.09, f * q, 0.065, 0.1, 'square'));
    ar(k, s, t, 0.15, 300, 1800, 0.07);
  },
  estrelasGemeas(k, s, t, q) {
    [0, 0.11].forEach((d, i) => {
      sino(k, s, t + d, (i ? 1320 : 880) * q, 0.35, 0.14);
      curva(k, s, t + d, (i ? 660 : 440) * q, (i ? 1320 : 880) * q, 0.14, 0.07);
    });
  },
  cuspeToxico(k, s, t, q) {
    curva(k, s, t, 190 * q, 620 * q, 0.09, 0.18, 'oco');
    ar(k, s, t + 0.06, 0.13, 1400, 360, 0.17, 'rosa');
    [0.14, 0.22, 0.28].forEach((d, i) =>
      curva(k, s, t + d, (500 - i * 80) * q, 180 * q, 0.065, 0.09)
    );
  },
  ondaProfunda(k, s, t, q) {
    ar(k, s, t, 0.55, 250, 1800, 0.21, 'marrom');
    k.osc(s, t, {
      f: [
        [0, 80 * q],
        [0.22, 160 * q],
        [0.55, 65 * q],
      ],
      env: { a: 0.07, d: 0.48, p: 0.23 },
    });
    for (let i = 0; i < 3; i++)
      curva(k, s, t + 0.2 + i * 0.07, 600 * q, (1000 + i * 300) * q, 0.075, 0.05);
  },
  firewall(k, s, t, q) {
    for (let i = 0; i < 3; i++) {
      metal(k, s, t + i * 0.055, (220 + i * 110) * q, 1, 0.15, 0.13);
      nota(k, s, t + 0.02 + i * 0.055, 880 * q, 0.045, 0.045, 'square');
    }
    ar(k, s, t + 0.08, 0.36, 900, 2600, 0.18, 'marrom');
  },
  coletorLixo(k, s, t, q) {
    for (let i = 0; i < 6; i++)
      nota(k, s, t + i * 0.04, 1320 * 2 ** ((-i * 3) / 12) * q, 0.055, 0.09, 'pulso');
    ar(k, s, t, 0.32, 3600, 250, 0.17);
    curva(k, s, t + 0.27, 100 * q, 55 * q, 0.13, 0.2);
  },
  breakpoint(k, s, t, q) {
    // Dois colchetes audíveis, pausa curta, confirmação grave. Sem timers JS.
    [0, 0.065].forEach((d) => {
      nota(k, s, t + d, 960 * q, 0.025, 0.15, 'square');
      metal(k, s, t + d, 480 * q, 4, 0.035, 0.07);
    });
    nota(k, s, t + 0.26, 120 * q, 0.24, 0.22, 'suave');
  },
  recursao(k, s, t, q) {
    for (let geracao = 0; geracao < 3; geracao++)
      for (let ramo = 0; ramo < 2 ** geracao; ramo++) {
        const d = geracao * 0.11 + ramo * 0.025;
        nota(
          k,
          s,
          t + d,
          440 * 2 ** ((geracao * 5 + ramo * 2) / 12) * q,
          0.12 - geracao * 0.025,
          0.15 / (geracao + 1),
          geracao % 2 ? 'triangle' : 'pulso'
        );
      }
    sino(k, s, t + 0.35, 1760 * q, 0.18, 0.06);
  },
  tremFantasma(k, s, t, q) {
    // Apito espectral e rodados com aceleração: ritmo ferroviário reconhecível.
    curva(k, s, t, 370 * q, 520 * q, 0.55, 0.13, 'oco');
    nota(k, s, t + 0.04, 740 * q, 0.48, 0.07, 'suave');
    for (let j = 0; j < 5; j++) {
      const d = 0.08 + j * 0.075;
      ar(k, s, t + d, 0.04, 260, 950, 0.09, 'marrom');
      metal(k, s, t + d, 110 * q, 1.21, 0.055, 0.1);
    }
  },
  dadosCaoticos(k, s, t, q) {
    // Seis colisões secas de dado, espaçamento crescente, uma resolução brilhante.
    for (let j = 0; j < 6; j++) {
      const d = j * j * 0.013;
      metal(k, s, t + d, (390 + j * 93) * q, 3.31, 0.035 + j * 0.008, 0.1 - j * 0.008);
    }
    sino(k, s, t + 0.42, 1560 * q, 0.24, 0.14);
  },
  espelhoPrismatico(k, s, t, q) {
    // Duas entradas laterais que se fundem num acorde cristalino.
    [0, 0.085].forEach((d, j) => {
      metal(k, s, t + d, (j ? 1174 : 830) * q, 2.83, 0.36, 0.1);
      curva(k, s, t + d, 1660 * q, 2489 * q, 0.17, 0.045, 'triangle');
    });
    [1244, 1568, 1865].forEach((f, j) => sino(k, s, t + 0.2 + j * 0.022, f * q, 0.5, 0.065));
  },
  orquestraOrbital(k, s, t, q) {
    // Compasso 4/4, notas nos contratempos, acorde de encerramento.
    [0, 4, 7, 12].forEach((n, j) => {
      const d = j * 0.12;
      nota(k, s, t + d, 220 * q, 0.075, 0.1, 'suave');
      sino(k, s, t + d + 0.06, 440 * 2 ** (n / 12) * q, 0.16, 0.09);
    });
    [440, 554.37, 659.25].forEach((f) => nota(k, s, t + 0.52, f * q, 0.28, 0.065, 'triangle'));
  },
};

/** Limites complementam o limite global de vozes do motor, inclusive builds de dez poderes. */
export const DEFINICOES_SONS_PODERES: Record<IdSomPoder, DefinicaoSom> = Object.fromEntries(
  Object.entries(SOM_POR_PODER).map(([id, som]) => [
    som,
    {
      meta: { g: 0.62, v: 0.018, i: 0.12, p: 2, n: 2, rev: 0.1, eco: 0.025 },
      tocar: RECEITAS[id as IdPoderSonoro] as Receita,
    },
  ])
) as Record<IdSomPoder, DefinicaoSom>;

/** Chamar apenas ao disparar; o motor controla cooldown, vozes, pausa e posição. */
export function tocarSomPoder(audio: ApiAudio, id: string, x: number, z: number, nivel = 1): void {
  const som = somDoPoder(id);
  if (!som || ![x, z].every(Number.isFinite)) return;
  const supremo = Number.isFinite(nivel) && nivel >= 10;
  audio.tocar(som, { x, y: z, volume: supremo ? 0.95 : 0.76, tom: supremo ? 0.78 : 1 });
  if (supremo) audio.tocar('energizar', { x, y: z, volume: 0.22, tom: 0.65 });
}
