/** Travessia imutável em V: o destino é fixado no aviso, sem perseguir heróis. */
export interface RotaAve {
  x: number;
  z: number;
  dx: number;
  dz: number;
  distancia: number;
}
export const PRIMEIRO_BANDO = 65;
export const AVISO_BANDO = 2;
export function intervaloBando(aleatorio: number): number {
  return 135 + Math.max(0, Math.min(1, aleatorio)) * 30;
}
export function formarBando(x: number, z: number, angulo: number, quantidade: number): RotaAve[] {
  const dx = Math.cos(angulo),
    dz = Math.sin(angulo);
  const n = Math.max(12, Math.min(24, Math.floor(quantidade)));
  return Array.from({ length: n }, (_, k) => {
    const fila = Math.ceil(k / 2),
      lado = k % 2 ? -1 : 1;
    return {
      x: x - dx * (36 + fila * 1.35) - dz * fila * lado * 1.15,
      z: z - dz * (36 + fila * 1.35) + dx * fila * lado * 1.15,
      dx,
      dz,
      distancia: 96 + fila * 1.35,
    };
  });
}
export function passoAve(rota: RotaAve, distancia: number): void {
  rota.x += rota.dx * distancia;
  rota.z += rota.dz * distancia;
  rota.distancia -= distancia;
}
export function avePodeSair(
  rota: RotaAve,
  jogadores: readonly { x: number; z: number }[]
): boolean {
  return rota.distancia <= 0 && jogadores.every((j) => Math.hypot(j.x - rota.x, j.z - rota.z) > 32);
}
