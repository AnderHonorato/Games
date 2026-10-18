import type { RotaMoba } from './tipos';
export interface PontoMoba {
  x: number;
  z: number;
}
export const BASES_MOBA: [PontoMoba, PontoMoba] = [
  { x: -72, z: 72 },
  { x: 72, z: -72 },
];
/** Rotas orientadas da Aurora (0) ao Eclipse (1). A interpolação é por distância. */
export const ROTAS_MOBA: PontoMoba[][] = [
  [
    { x: -72, z: 72 },
    { x: -73, z: 42 },
    { x: -73, z: -37 },
    { x: -61, z: -64 },
    { x: -37, z: -73 },
    { x: 42, z: -73 },
    { x: 72, z: -72 },
  ],
  [
    { x: -72, z: 72 },
    { x: -47, z: 47 },
    { x: -22, z: 22 },
    { x: 0, z: 0 },
    { x: 22, z: -22 },
    { x: 47, z: -47 },
    { x: 72, z: -72 },
  ],
  [
    { x: -72, z: 72 },
    { x: -42, z: 73 },
    { x: 37, z: 73 },
    { x: 64, z: 61 },
    { x: 73, z: 37 },
    { x: 73, z: -42 },
    { x: 72, z: -72 },
  ],
];
export const CAMPOS_MOBA: PontoMoba[] = [
  { x: -43, z: 15 },
  { x: -19, z: 48 },
  { x: -47, z: -24 },
  { x: 43, z: -15 },
  { x: 19, z: -48 },
  { x: 47, z: 24 },
];
export const CHEFE_MOBA: PontoMoba = { x: 18, z: 18 };
export function comprimentoRota(rota: RotaMoba): number {
  const p = ROTAS_MOBA[rota];
  return p.slice(1).reduce((s, v, i) => s + Math.hypot(v.x - p[i].x, v.z - p[i].z), 0);
}
export function pontoRota(rota: RotaMoba, progresso: number): PontoMoba {
  const p = ROTAS_MOBA[rota];
  let restante = Math.max(0, Math.min(1, progresso)) * comprimentoRota(rota);
  for (let i = 1; i < p.length; i++) {
    const a = p[i - 1],
      b = p[i],
      d = Math.hypot(b.x - a.x, b.z - a.z);
    if (restante <= d)
      return { x: a.x + ((b.x - a.x) * restante) / d, z: a.z + ((b.z - a.z) * restante) / d };
    restante -= d;
  }
  return { ...p[p.length - 1] };
}
export function progressoRota(rota: RotaMoba, x: number, z: number): number {
  const p = ROTAS_MOBA[rota],
    total = comprimentoRota(rota);
  let feito = 0,
    melhor = Infinity,
    resultado = 0;
  for (let i = 1; i < p.length; i++) {
    const a = p[i - 1],
      b = p[i],
      dx = b.x - a.x,
      dz = b.z - a.z,
      l = Math.hypot(dx, dz),
      t = Math.max(0, Math.min(1, ((x - a.x) * dx + (z - a.z) * dz) / (l * l))),
      dist = Math.hypot(x - a.x - dx * t, z - a.z - dz * t);
    if (dist < melhor) {
      melhor = dist;
      resultado = (feito + l * t) / total;
    }
    feito += l;
  }
  return resultado;
}
