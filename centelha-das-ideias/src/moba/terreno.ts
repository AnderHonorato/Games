/** Terreno tático partilhado pela simulação e pela arena. Rotas permanecem desobstruídas. */
export interface ObstaculoMoba {
  id: string;
  x: number;
  z: number;
  raio: number;
  altura: number;
}
export interface MoitaMoba {
  id: string;
  x: number;
  z: number;
  raio: number;
}
export const OBSTACULOS_MOBA: readonly ObstaculoMoba[] = [
  { id: 'ruina-oeste', x: -51, z: 29, raio: 4.5, altura: 5 },
  { id: 'ruina-leste', x: 51, z: -29, raio: 4.5, altura: 5 },
  { id: 'pedra-norte', x: -35, z: -42, raio: 5, altura: 4 },
  { id: 'pedra-sul', x: 35, z: 42, raio: 5, altura: 4 },
  { id: 'arco-oeste', x: -29, z: 5, raio: 3.5, altura: 4.6 },
  { id: 'arco-leste', x: 29, z: -5, raio: 3.5, altura: 4.6 },
  { id: 'rocha-aurora', x: -6, z: 39, raio: 4, altura: 3.5 },
  { id: 'rocha-eclipse', x: 6, z: -39, raio: 4, altura: 3.5 },
  { id: 'ruina-rio-norte', x: -31, z: -20, raio: 3.5, altura: 4 },
  { id: 'ruina-rio-sul', x: 31, z: 20, raio: 3.5, altura: 4 },
];
export const MOITAS_MOBA: readonly MoitaMoba[] = [
  { id: 'rio-oeste', x: -15, z: -1, raio: 5 },
  { id: 'rio-leste', x: 15, z: 1, raio: 5 },
  { id: 'selva-oeste', x: -48, z: 7, raio: 5 },
  { id: 'selva-leste', x: 48, z: -7, raio: 5 },
  { id: 'alto-oeste', x: -61, z: -26, raio: 4.5 },
  { id: 'baixo-leste', x: 61, z: 26, raio: 4.5 },
  { id: 'jardim-aurora', x: -27, z: 54, raio: 4.5 },
  { id: 'jardim-eclipse', x: 27, z: -54, raio: 4.5 },
];
export function moitaEm(x: number, z: number): MoitaMoba | undefined {
  return MOITAS_MOBA.find((m) => Math.hypot(x - m.x, z - m.z) < m.raio);
}
export function posicaoLivre(x: number, z: number, raio = 0): boolean {
  return (
    Math.abs(x) <= 86 &&
    Math.abs(z) <= 86 &&
    OBSTACULOS_MOBA.every((o) => Math.hypot(x - o.x, z - o.z) >= o.raio + raio)
  );
}
/** Projeta um clique ou invocação para a borda caminhável mais próxima. */
export function ajustarDestino(x: number, z: number, raio = 1.1): { x: number; z: number } {
  let p = { x: Math.max(-86, Math.min(86, x)), z: Math.max(-86, Math.min(86, z)) };
  for (let repeticao = 0; repeticao < 3; repeticao++)
    for (const o of OBSTACULOS_MOBA) {
      const dx = p.x - o.x,
        dz = p.z - o.z,
        d = Math.hypot(dx, dz),
        r = o.raio + raio + 0.05;
      if (d < r) {
        p.x = o.x + (d ? dx / d : 1) * r;
        p.z = o.z + (d ? dz / d : 0) * r;
      }
    }
  return p;
}
type Ponto = { x: number; z: number };
function distanciaSegmento(a: Ponto, b: Ponto, o: Ponto): number {
  const dx = b.x - a.x,
    dz = b.z - a.z,
    d = dx * dx + dz * dz;
  const t = d ? Math.max(0, Math.min(1, ((o.x - a.x) * dx + (o.z - a.z) * dz) / d)) : 0;
  return Math.hypot(o.x - a.x - dx * t, o.z - a.z - dz * t);
}
/** Um desvio local por círculos; sem grade, busca global ou alocações crescentes. */
export function moverNoTerreno(
  a: Ponto,
  destino: Ponto,
  raio: number,
  passo: number,
  desviar = true
): Ponto {
  let alvo = destino;
  if (desviar) {
    const bloqueio = OBSTACULOS_MOBA.filter(
      (o) => distanciaSegmento(a, destino, o) < o.raio + raio + 0.1
    ).sort((o, p) => Math.hypot(a.x - o.x, a.z - o.z) - Math.hypot(a.x - p.x, a.z - p.z))[0];
    if (bloqueio) {
      const rx = a.x - bloqueio.x,
        rz = a.z - bloqueio.z,
        rd = Math.hypot(rx, rz) || 1;
      const lado = rx * (destino.z - bloqueio.z) - rz * (destino.x - bloqueio.x) >= 0 ? 1 : -1;
      // Tangente com pequena repulsão: contorna sem alternar de lado a cada frame.
      alvo = {
        x: a.x + ((-rz / rd) * lado + (rx / rd) * 0.25) * 10,
        z: a.z + ((rx / rd) * lado + (rz / rd) * 0.25) * 10,
      };
    }
  }
  const dx = alvo.x - a.x,
    dz = alvo.z - a.z,
    d = Math.hypot(dx, dz) || 1,
    n = Math.min(d, passo);
  let resultado = { x: a.x, z: a.z };
  // Sweep limite de 0,4 m impede cruzar uma ruína com lampejo ou dt grande.
  for (let s = Math.min(0.4, n); s <= n + 0.00001; s = Math.min(n, s + 0.4)) {
    const x = Math.max(-86, Math.min(86, a.x + (dx / d) * s)),
      z = Math.max(-86, Math.min(86, a.z + (dz / d) * s));
    if (!posicaoLivre(x, z, raio)) break;
    resultado = { x, z };
    if (s === n) break;
  }
  return resultado;
}
