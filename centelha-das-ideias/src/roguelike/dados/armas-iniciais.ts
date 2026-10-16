/** Armas manuais: dano e alcance próprios, independentes das habilidades automáticas. */
export type IdArmaInicial = 'lamina' | 'cajado' | 'martelo';
export interface DefArmaInicial {
  id: IdArmaInicial;
  nome: string;
  descricao: string;
  icone: string;
  cor: string;
  dano: number;
  alcance: number;
  recarga: number;
  raio: number;
  forca: number;
}
export const ARMAS_INICIAIS: DefArmaInicial[] = [
  {
    id: 'lamina',
    nome: 'Lâmina da Centelha',
    descricao: 'Cortes rápidos e precisos.',
    icone: '⚔',
    cor: '#ffe28b',
    dano: 23,
    alcance: 3.6,
    recarga: 0.42,
    raio: 1.15,
    forca: 5,
  },
  {
    id: 'cajado',
    nome: 'Cajado de Ideias',
    descricao: 'Alcança o inimigo mais forte à distância.',
    icone: '✦',
    cor: '#9bdeff',
    dano: 32,
    alcance: 11,
    recarga: 0.8,
    raio: 0.65,
    forca: 3,
  },
  {
    id: 'martelo',
    nome: 'Martelo da Forja',
    descricao: 'Impacto pesado que abre espaço.',
    icone: '🔨',
    cor: '#ffae74',
    dano: 62,
    alcance: 4.2,
    recarga: 1.15,
    raio: 2.8,
    forca: 17,
  },
];
export function armaInicial(id: string): DefArmaInicial {
  return ARMAS_INICIAIS.find((a) => a.id === id) ?? ARMAS_INICIAIS[0];
}
