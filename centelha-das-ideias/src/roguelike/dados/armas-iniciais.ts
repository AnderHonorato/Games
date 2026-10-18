/** Armas manuais: dano e alcance próprios, independentes das habilidades automáticas. */
export type IdArmaInicial =
  'lamina' | 'cajado' | 'martelo' | 'arco' | 'foice' | 'lanca' | 'grimorio';
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
  {
    id: 'arco',
    nome: 'Arco do Orvalho',
    descricao: 'Flechas velozes para alvos distantes.',
    icone: '➹',
    cor: '#8ce5be',
    dano: 26,
    alcance: 15,
    recarga: 0.58,
    raio: 0.48,
    forca: 2,
  },
  {
    id: 'foice',
    nome: 'Foice da Lua',
    descricao: 'Uma varredura larga e pesada.',
    icone: '☾',
    cor: '#c3a1ff',
    dano: 48,
    alcance: 5.2,
    recarga: 0.98,
    raio: 2.1,
    forca: 9,
  },
  {
    id: 'lanca',
    nome: 'Lança Estelar',
    descricao: 'Estocadas longas com bastante empurrão.',
    icone: '♠',
    cor: '#a7e8ff',
    dano: 36,
    alcance: 7.4,
    recarga: 0.7,
    raio: 0.72,
    forca: 12,
  },
  {
    id: 'grimorio',
    nome: 'Grimório dos Sonhos',
    descricao: 'Selo arcano que envolve o alvo.',
    icone: '▣',
    cor: '#ffb9db',
    dano: 43,
    alcance: 10,
    recarga: 1.05,
    raio: 1.8,
    forca: 4,
  },
];
export function armaInicial(id: string): DefArmaInicial {
  return ARMAS_INICIAIS.find((a) => a.id === id) ?? ARMAS_INICIAIS[0];
}

export function armaInicialValida(id: unknown): id is IdArmaInicial {
  return typeof id === 'string' && ARMAS_INICIAIS.some((arma) => arma.id === id);
}
