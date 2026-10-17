import type { DefHabilidade } from '../dados/habilidades';

export const MAX_ORBES_POR_ANEL = 24;

/** Perfil único para a prévia, a animação e os centros usados na colisão. */
export function perfilOrbita(
  def: Pick<DefHabilidade, 'base'>,
  nivel: number,
  multiplicadorArea = 1,
  quantidadeExtra = 0
): { raio: number; velocidade: number; quantidade: number } {
  const n = Math.max(1, Math.min(10, Math.floor(Number.isNaN(nivel) ? 1 : nivel)));
  return {
    raio: def.base.area * (1 + 0.1 * (n - 1)) * (n === 10 ? 1.5 : 1) * multiplicadorArea,
    velocidade: def.base.velocidade * (1 + 0.1 * (n - 1)),
    quantidade: Math.min(
      MAX_ORBES_POR_ANEL,
      Math.max(1, def.base.quantidade + n - 1 + Math.floor(quantidadeExtra) + (n === 10 ? 2 : 0))
    ),
  };
}

/** Uma única posição alimenta a malha, o rastro e o teste de acerto. */
export function posicaoOrbital(
  fase: number,
  velocidade: number,
  indice: number,
  quantidade: number,
  raio: number,
  origemX: number,
  origemZ: number,
  saida: { x: number; z: number }
): void {
  const angulo = fase * velocidade + (indice / quantidade) * Math.PI * 2;
  saida.x = origemX + Math.cos(angulo) * raio;
  saida.z = origemZ + Math.sin(angulo) * raio;
}
