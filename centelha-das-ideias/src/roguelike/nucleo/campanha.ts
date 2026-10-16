export const TEMPO_MINICHEFE = 75;
export const TEMPO_MEGACHEFE = 180;
export const DURACAO_TRANSICAO = 4.5;
export interface Cinematica {
  tipo: 'mini' | 'mega' | 'transicao';
  nome: string;
  fala: string;
  tempo: number;
  duracao: number;
}
export interface CicloCampanha {
  mini: boolean;
  mega: boolean;
  concluido: boolean;
}
export function novoCiclo(): CicloCampanha {
  return { mini: false, mega: false, concluido: false };
}
export function marcoCampanha(tempo: number, ciclo: CicloCampanha): 'mini' | 'mega' | null {
  if (ciclo.concluido) return null;
  if (!ciclo.mini && tempo >= TEMPO_MINICHEFE) return 'mini';
  if (!ciclo.mega && tempo >= TEMPO_MEGACHEFE) return 'mega';
  return null;
}
export function bonusMega(id: string): number {
  return id === 'abismo' ? 600 : id === 'forja' ? 400 : 200;
}
