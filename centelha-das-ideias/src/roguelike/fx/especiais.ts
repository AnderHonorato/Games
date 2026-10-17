/** Modelos de fita 3D em lotes nativos; nenhuma malha ou material por ativação. */
import type { SistemaFx } from './indice';
import { ESTILO_PLANO } from './ondas';
type Ponto = readonly [number, number, number];
function trilha(fx: SistemaFx, pontos: Ponto[], cor: string, vida = 0.38, largura = 0.13): void {
  fx.raios.chicote(pontos.flat(), cor, { vida, largura, brilho: 1.05 });
}
export function desenharTrem(
  fx: SistemaFx,
  x: number,
  z: number,
  ang: number,
  vagoes = 2,
  apito = false
): void {
  const c = Math.cos(ang),
    s = Math.sin(ang);
  const p = (a: number, y: number, b: number): Ponto => [x + a * c - b * s, y, z + a * s + b * c];
  // Locomotiva + vagões encaixados: silhueta de caixas, rodas e chaminé.
  for (let k = 0; k < Math.min(4, vagoes); k++) {
    const a = -k * 1.5;
    trilha(
      fx,
      [
        p(a - 0.6, 0.35, -0.5),
        p(a + 0.6, 0.35, -0.5),
        p(a + 0.6, 1.35, -0.5),
        p(a - 0.6, 1.35, -0.5),
        p(a - 0.6, 0.35, -0.5),
        p(a - 0.6, 0.35, 0.5),
        p(a + 0.6, 0.35, 0.5),
        p(a + 0.6, 1.35, 0.5),
        p(a - 0.6, 1.35, 0.5),
        p(a - 0.6, 1.35, -0.5),
      ],
      '#9bd9db',
      0.27,
      0.18
    );
    trilha(
      fx,
      [
        p(a - 0.4, 0.3, -0.58),
        p(a - 0.4, 0.15, 0),
        p(a - 0.4, 0.3, 0.58),
        p(a + 0.4, 0.3, 0.58),
        p(a + 0.4, 0.15, 0),
        p(a + 0.4, 0.3, -0.58),
      ],
      '#c4a2ff',
      0.3
    );
  }
  trilha(fx, [p(0.2, 1, 0), p(0.2, 2, 0), p(0.6, 2, 0), p(0.6, 1, 0)], '#e2fff0', 0.32, 0.2);
  if (apito)
    for (let k = 0; k < 3; k++)
      fx.p.emitir({
        x: x + c * k * 0.3,
        y: 2 + k * 0.2,
        z: z + s * k * 0.3,
        vida: 0.5,
        tam: 0.35,
        tamFim: 0.7,
        vy: 1,
        cor: '#b1d7cf',
        alfa: 0.3,
        aditivo: 0.3,
      });
}
const PIPS: Record<number, readonly (readonly [number, number])[]> = {
  1: [[0, 0]],
  2: [
    [-0.3, -0.3],
    [0.3, 0.3],
  ],
  3: [
    [-0.3, -0.3],
    [0, 0],
    [0.3, 0.3],
  ],
  4: [
    [-0.3, -0.3],
    [0.3, -0.3],
    [-0.3, 0.3],
    [0.3, 0.3],
  ],
  5: [
    [-0.3, -0.3],
    [0.3, -0.3],
    [0, 0],
    [-0.3, 0.3],
    [0.3, 0.3],
  ],
  6: [
    [-0.3, -0.3],
    [0.3, -0.3],
    [-0.3, 0],
    [0.3, 0],
    [-0.3, 0.3],
    [0.3, 0.3],
  ],
};
export function desenharDado(
  fx: SistemaFx,
  x: number,
  z: number,
  face: number,
  supremo = false
): void {
  const a = 0.62,
    y = 1.25;
  trilha(
    fx,
    [
      [x - a, y - a, z - a],
      [x + a, y - a, z - a],
      [x + a, y + a, z - a],
      [x - a, y + a, z - a],
      [x - a, y - a, z - a],
      [x - a, y - a, z + a],
      [x + a, y - a, z + a],
      [x + a, y + a, z + a],
      [x - a, y + a, z + a],
      [x - a, y - a, z + a],
    ],
    supremo ? '#ffe6a4' : '#c49bff',
    0.68,
    0.19
  );
  trilha(
    fx,
    [
      [x - a, y + a, z - a],
      [x - a, y + a, z + a],
      [x + a, y + a, z + a],
      [x + a, y + a, z - a],
    ],
    '#fff3ff',
    0.68
  );
  // Faces legíveis no plano superior em marcas de cruz, sem fontes/texturas novas.
  for (const [u, v] of PIPS[Math.max(1, Math.min(6, face))])
    trilha(
      fx,
      [
        [x + u - 0.065, y + a + 0.02, z + v],
        [x + u + 0.065, y + a + 0.02, z + v],
      ],
      '#ffffff',
      0.68,
      0.16
    );
}
export function desenharPrisma(
  fx: SistemaFx,
  x: number,
  z: number,
  bx: number,
  bz: number,
  cor: string,
  catedral: boolean
): void {
  const h = catedral ? 3 : 1.8;
  trilha(
    fx,
    [
      [x - 0.5, 0.3, z],
      [x, h, z - 0.45],
      [x + 0.5, 0.3, z],
      [x, h, z + 0.45],
      [x - 0.5, 0.3, z],
      [x + 0.5, 0.3, z],
    ],
    cor,
    0.62,
    0.17
  );
  trilha(
    fx,
    [
      [x, 1.2, z],
      [(x + bx) / 2, 1.6, (z + bz) / 2],
      [bx, 0.65, bz],
    ],
    cor,
    0.46,
    catedral ? 0.22 : 0.14
  );
}
export function desenharNota(
  fx: SistemaFx,
  x: number,
  z: number,
  ang: number,
  dupla: boolean
): void {
  const p = (a: number, y: number, b: number): Ponto => [
    x + a * Math.cos(ang) - b * Math.sin(ang),
    y,
    z + a * Math.sin(ang) + b * Math.cos(ang),
  ];
  trilha(
    fx,
    [
      p(-0.22, 0.7, 0),
      p(0.12, 0.7, 0),
      p(0.22, 0.9, 0),
      p(-0.12, 0.95, 0),
      p(-0.22, 0.7, 0),
      p(0.18, 0.9, 0),
      p(0.18, 2, 0),
      p(0.78, 1.8, 0),
    ],
    '#ffb4e3',
    0.4,
    0.16
  );
  if (dupla)
    trilha(
      fx,
      [p(0.78, 1.8, 0), p(0.78, 0.65, 0), p(0.46, 0.5, 0), p(0.45, 0.7, 0), p(0.78, 0.65, 0)],
      '#ffe9a8',
      0.4,
      0.14
    );
}
export function ondaMusical(fx: SistemaFx, x: number, z: number, raio: number, cor: string): void {
  fx.planos.criar({
    estilo: ESTILO_PLANO.ANEL_SOM,
    x,
    z,
    raio: Math.max(0.1, raio * 0.65),
    raioFim: raio,
    vida: 0.28,
    cor,
    alfa: 0.42,
    brilho: 0.8,
    entrada: 0.1,
  });
}

/** Formas de objetos reconhecíveis; compartilham lotes de fitas, nunca meshes individuais. */
export function trilhasArtefato(id: string, nivel = 1): number[][] | null {
  const linhas: number[][] = [];
  const linha = (...p: Ponto[]) => linhas.push(p.flat());
  const curva = (n: number, fn: (u: number) => Ponto) => {
    const p: number[] = [];
    for (let i = 0; i < n; i++) p.push(...fn(i / (n - 1)));
    linhas.push(p);
  };
  const anel = (r: number, y: number, ox = 0, oz = 0) =>
    curva(25, (u) => [ox + Math.cos(u * Math.PI * 2) * r, y, oz + Math.sin(u * Math.PI * 2) * r]);
  const final = nivel >= 10,
    evo = nivel >= 5;
  switch (id) {
    case 'serpenteEletrica':
      curva(33, (u) => [
        -2 + u * 4,
        0.45 + Math.sin(u * Math.PI) * 0.45,
        Math.sin(u * Math.PI * 4) * 0.6,
      ]);
      linha([1.5, 0.75, -0.35], [2.3, 0.7, 0], [1.5, 0.75, 0.35]);
      linha([2.3, 0.7, 0], [2.7, 0.65, 0], [2.9, 0.8, -0.25]);
      if (evo) linha([2.7, 0.65, 0], [2.9, 0.8, 0.25]);
      if (final)
        curva(41, (u) => [Math.cos(u * Math.PI * 2) * 2, 0.15, Math.sin(u * Math.PI * 2) * 2]);
      break;
    case 'portalBumerangue':
      for (const lado of [-1, 1]) {
        curva(33, (u) => [
          lado * 1.8,
          1.2 + Math.sin(u * Math.PI * 2),
          Math.cos(u * Math.PI * 2) * 0.7,
        ]);
        linha([lado * 1.8, 1.2, -0.7], [lado * 0.7, 1.3, -0.4], [lado * 1.1, 1.3, 0.35]);
      }
      if (evo) curva(25, (u) => [u * 2 - 1, 2.7, Math.sin(u * Math.PI * 2) * 0.7]);
      if (final) linha([-1.8, 0.2, -1], [1.8, 2.6, 1], [-1.8, 2.6, 1], [1.8, 0.2, -1]);
      break;
    case 'constelacao': {
      const n = final ? 7 : evo ? 5 : 3;
      const p = (i: number): Ponto => [
        Math.cos((i * Math.PI * 2) / n) * 2,
        0.6 + (i % 2) * 0.6,
        Math.sin((i * Math.PI * 2) / n) * 2,
      ];
      for (let i = 0; i < n; i++) {
        const [a, y, b] = p(i);
        linha(p(i + 1), p(i), [a - 0.15, y, b], [a, y + 0.35, b], [a + 0.15, y, b]);
      }
      if (evo) linha(p(0), p(2), p(4), p(1), p(3));
      if (final) linha([0, 0.2, 0], [0, 3, 0], [0.5, 2.2, 0], [-0.5, 2.2, 0]);
      break;
    }
    case 'sinoGravitacional':
      curva(33, (u) => [(u - 0.5) * 2.8, 0.7 + Math.sin(u * Math.PI) * 1.7, 0]);
      linha([-1.4, 0.7, 0], [1.4, 0.7, 0], [0, 0.7, 0], [0, 1.8, 0]);
      anel(0.25, 0.5);
      linha([0, 2.4, 0], [0, 3.3, 0], [-0.6, 3.3, 0], [0.6, 3.3, 0]);
      if (evo)
        for (const lado of [-1, 1])
          curva(17, (u) => [lado * (1.8 + Math.sin(u * Math.PI) * 0.5), 0.6 + u * 1.6, 0]);
      if (final) {
        anel(2.2, 0.15);
        anel(2.8, 0.1);
      }
      break;
    case 'jardimEspinhos':
      for (let i = 0; i < (evo ? 5 : 3); i++) {
        const a = (i * Math.PI * 2) / (evo ? 5 : 3),
          ox = Math.cos(a),
          oz = Math.sin(a);
        linha(
          [ox, 0.1, oz],
          [ox, 1.6, oz],
          [ox + 0.5, 1.9, oz],
          [ox, 2.2, oz],
          [ox - 0.5, 1.9, oz],
          [ox, 1.6, oz]
        );
        linha([ox, 0.4, oz], [ox + 0.6, 0.75, oz], [ox + 0.25, 0.85, oz], [ox, 0.6, oz]);
      }
      if (final)
        curva(49, (u) => [
          Math.cos(u * Math.PI * 2) * (1.7 + Math.sin(u * Math.PI * 12) * 0.4),
          0.15,
          Math.sin(u * Math.PI * 2) * (1.7 + Math.sin(u * Math.PI * 12) * 0.4),
        ]);
      break;
    case 'furacaoLaminas':
      curva(49, (u) => [
        Math.cos(u * Math.PI * 6) * (0.5 + u * 1.7),
        0.2 + u * 2.8,
        Math.sin(u * Math.PI * 6) * (0.5 + u * 1.7),
      ]);
      for (let i = 0; i < 3; i++) {
        const a = (i * Math.PI * 2) / 3;
        linha(
          [Math.cos(a) * 1.8, 1, Math.sin(a) * 1.8],
          [Math.cos(a + 0.8) * 2.4, 1.2, Math.sin(a + 0.8) * 2.4],
          [Math.cos(a + 0.35) * 1.4, 1, Math.sin(a + 0.35) * 1.4]
        );
      }
      if (evo)
        curva(37, (u) => [
          Math.cos(-u * Math.PI * 4) * 1.6,
          0.2 + u * 2.8,
          Math.sin(-u * Math.PI * 4) * 1.6,
        ]);
      if (final) linha([-2.5, 0.3, 0], [0, 1.3, 0], [2.5, 0.3, 0], [0, 1.3, -2.5], [0, 1.3, 2.5]);
      break;
    case 'marioneteAstral':
      linha([-1.7, 3.2, 0], [1.7, 3.2, 0]);
      linha([0, 3.2, -0.8], [0, 3.2, 0.8]);
      for (const lado of [-1, 1]) {
        linha(
          [lado * 1.3, 3.2, 0],
          [lado * 0.65, 1.9, 0],
          [lado * 1.2, 1.1, 0],
          [lado * 0.4, 0.3, 0]
        );
        anel(0.22, 1.9, lado * 0.65);
      }
      if (evo) {
        linha([-1.3, 3.2, 0], [1.2, 1.1, 0]);
        linha([1.3, 3.2, 0], [-1.2, 1.1, 0]);
      }
      if (final)
        for (const lado of [-1, 1])
          linha([lado * 1.2, 1.1, 0], [lado * 2.2, 1.6, 0], [lado * 1.7, 2.1, 0]);
      break;
    case 'mandalaMeteoro': {
      const n = final ? 7 : evo ? 5 : 3;
      curva(n * 2 + 1, (u) => [
        Math.cos(u * Math.PI * 4) * 2.1,
        0.12,
        Math.sin(u * Math.PI * 4) * 2.1,
      ]);
      anel(2.3, 0.1);
      for (let i = 0; i < 3; i++)
        linha([i - 2, 3.5 + i * 0.3, -1], [i - 1, 1.2, 0], [i - 0.7, 0.15, 0.2]);
      if (evo) anel(1.1, 0.2);
      if (final) linha([-0.8, 5, -0.8], [0, 0.15, 0], [0.8, 5, 0.8]);
      break;
    }
    case 'ancoraCeleste':
      linha(
        [0, 2.8, 0],
        [0, 0.5, 0],
        [-1.3, 1.5, 0],
        [-1.6, 1.2, 0],
        [-1, 0.35, 0],
        [0, 0.1, 0],
        [1, 0.35, 0],
        [1.6, 1.2, 0],
        [1.3, 1.5, 0],
        [0, 0.5, 0]
      );
      linha([-0.9, 2, 0], [0.9, 2, 0]);
      curva(25, (u) => [
        Math.sin(u * Math.PI * 2) * 0.28,
        2.8 + Math.cos(u * Math.PI * 2) * 0.28,
        0,
      ]);
      curva(33, (u) => [-3 + u * 3, 0.8 + Math.sin(u * Math.PI * 8) * 0.15, 0]);
      if (evo) linha([-1.6, 1.2, -0.5], [0, 0.5, -0.8], [1.6, 1.2, -0.5]);
      if (final) {
        linha([-3, 0.3, -0.5], [0, 2.8, 0], [-3, 0.3, 0.5]);
        anel(2, 0.1);
      }
      break;
    case 'bolhasEstase':
      for (let i = 0; i < (evo ? 3 : 2); i++) {
        const ox = (i - 0.5) * 1.6,
          r = i === 1 ? 1 : 0.65;
        curva(33, (u) => [
          ox + Math.cos(u * Math.PI * 2) * r,
          1.2 + Math.sin(u * Math.PI * 2) * r,
          0,
        ]);
        anel(r, 1.2, ox);
        linha(
          [ox - r * 0.4, 1.5, 0],
          [ox + r * 0.4, 1.5, 0],
          [ox - r * 0.4, 0.9, 0],
          [ox + r * 0.4, 0.9, 0]
        );
      }
      if (final) {
        anel(2.8, 0.15);
        linha([-2.8, 0.15, 0], [-2.4, 1.5, 0], [-1.8, 0.15, 0]);
      }
      break;
    case 'enxameVespas':
      for (let i = 0; i < 3; i++) {
        const ox = i * 1.1 - 1;
        linha([ox - 0.45, 0.8, 0], [ox + 0.5, 1, 0], [ox + 0.8, 0.8, 0], [ox - 0.45, 0.8, 0]);
        linha(
          [ox, 0.9, 0],
          [ox - 0.5, 1.8, -0.5],
          [ox + 0.5, 1.4, 0],
          [ox - 0.5, 1.8, 0.5],
          [ox, 0.9, 0]
        );
      }
      if (evo) linha([-1.5, 0.5, 0], [-0.5, 1.5, 0], [0.5, 0.5, 0], [1.5, 1.5, 0]);
      if (final)
        curva(7, (u) => [Math.cos(u * Math.PI * 2) * 2.3, 2.3, Math.sin(u * Math.PI * 2) * 2.3]);
      break;
    case 'tempestadeEspadas':
      for (const j of [-1, 0, 1]) {
        const x = j * 1.1;
        linha([x - 0.2, 2.7, 0], [x - 0.2, 1, 0], [x, 0.2, 0], [x + 0.2, 1, 0], [x + 0.2, 2.7, 0]);
        linha([x - 0.55, 2.1, 0], [x + 0.55, 2.1, 0]);
      }
      if (evo) linha([-2, 1.5, -1], [2, 1.5, 1], [2, 1.5, -1], [-2, 1.5, 1]);
      if (final) {
        linha([-2.5, 2.8, 0], [0, 0.2, 0], [2.5, 2.8, 0]);
        anel(2.1, 0.1);
      }
      break;
    default:
      return null;
  }
  return linhas.slice(0, 12);
}

export function desenharArtefato(
  fx: SistemaFx,
  id: string,
  x: number,
  z: number,
  ang: number,
  escala: number,
  cor: string,
  nivel = 1,
  vida = 0.35
): void {
  const forma = trilhasArtefato(id, nivel);
  if (!forma || ![x, z, ang, escala].every(Number.isFinite)) return;
  const c = Math.cos(ang),
    s = Math.sin(ang);
  for (const local of forma) {
    const mundo: number[] = [];
    for (let i = 0; i < local.length; i += 3)
      mundo.push(
        x + escala * (local[i] * c - local[i + 2] * s),
        local[i + 1] * escala,
        z + escala * (local[i] * s + local[i + 2] * c)
      );
    fx.raios.chicote(mundo, cor, { vida, largura: nivel >= 10 ? 0.15 : 0.1, brilho: 0.95 });
  }
}

/** Segmento de dano visível, reutiliza o lote de raios e não cria timers. */
export function fioEspecial(
  fx: SistemaFx,
  ax: number,
  az: number,
  bx: number,
  bz: number,
  cor: string,
  largura = 0.15,
  altura = 0.55
): void {
  fx.raios.chicote(
    [ax, altura, az, (ax + bx) / 2, altura + 0.25, (az + bz) / 2, bx, altura, bz],
    cor,
    { vida: 0.27, largura, brilho: 0.95 }
  );
}
