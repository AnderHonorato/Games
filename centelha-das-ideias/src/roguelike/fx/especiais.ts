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
  for (let k = 0; k < Math.min(3, vagoes); k++) {
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
