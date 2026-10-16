import type { IdPersonagem } from '../dados/personagens';
export interface AlvoManual {
  x: number;
  z: number;
  vidaMax: number;
  vivo: boolean;
  raio?: number;
  elite?: boolean;
  def?: { comportamento: string };
}
/** Categorias são dominantes; vida máxima ordena dentro da categoria e distância desempata. */
export function selecionarAlvoManual<T extends AlvoManual>(
  alvos: readonly T[],
  x: number,
  z: number,
  alcance: number
): T | null {
  let melhor: T | null = null,
    peso = -Infinity,
    distancia = Infinity;
  for (const alvo of alvos) {
    const d = Math.hypot(alvo.x - x, alvo.z - z);
    if (!alvo.vivo || d > alcance + (alvo.raio ?? 0)) continue;
    const p =
      (alvo.def?.comportamento === 'chefe'
        ? 1e12
        : alvo.elite || alvo.def?.comportamento === 'elite'
          ? 1e9
          : 0) + alvo.vidaMax;
    if (p > peso || (p === peso && d < distancia)) {
      melhor = alvo;
      peso = p;
      distancia = d;
    }
  }
  return melhor;
}
export interface DefAvanco {
  duracao: number;
  recarga: number;
  velocidade: number;
  distancia: number;
  salto: number;
}
export function avancoPersonagem(id: IdPersonagem): DefAvanco {
  const defs: Record<IdPersonagem, DefAvanco> = {
    claude: { duracao: 0.16, recarga: 1.65, velocidade: 0, distancia: 6.2, salto: 0 },
    gpt: { duracao: 0.32, recarga: 1.7, velocidade: 12, distancia: 2.8, salto: 1.7 },
    gemini: { duracao: 0.48, recarga: 1.9, velocidade: 0, distancia: 3.4, salto: 0 },
    mistral: { duracao: 0.55, recarga: 1.8, velocidade: 19, distancia: 0, salto: 0.15 },
    llama: { duracao: 0.8, recarga: 2.3, velocidade: 9, distancia: 0, salto: 3.4 },
    deepseek: { duracao: 0.65, recarga: 2, velocidade: 15, distancia: 0, salto: 0.5 },
  };
  return defs[id];
}
