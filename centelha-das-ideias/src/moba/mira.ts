import type { TipoHabilidadeMoba } from './tipos';

export interface MiraMoba {
  x: number;
  z: number;
  alcance: number;
  raio: number;
  tipo: TipoHabilidadeMoba;
  cor: string;
}

/** Mantém a previsão e o comando no mesmo alcance, inclusive na borda do mapa. */
export function limitarMira(
  origem: { x: number; z: number },
  alvo: { x: number; z: number },
  alcance: number
): { x: number; z: number } {
  if (![origem.x, origem.z, alvo.x, alvo.z, alcance].every(Number.isFinite))
    return {
      x: Number.isFinite(origem.x) ? origem.x : 0,
      z: Number.isFinite(origem.z) ? origem.z : 0,
    };
  const dx = alvo.x - origem.x,
    dz = alvo.z - origem.z;
  const distancia = Math.hypot(dx, dz);
  const fator = distancia ? Math.min(1, Math.max(0, alcance) / distancia) : 0;
  return {
    x: Math.max(-88, Math.min(88, origem.x + dx * fator)),
    z: Math.max(-88, Math.min(88, origem.z + dz * fator)),
  };
}
