/** Ataque pessoal permanente: nunca ocupa cartas, slots ou sorteios de habilidades. */
import type { IdPersonagem } from './personagens';
export type MecanicaBasica =
  'corte' | 'cadeia' | 'cruz' | 'impacto' | 'leque' | 'onda' | 'notas' | 'convergencia' | 'fork';
export interface DefAtaqueBasico {
  nome: string;
  descricao: string;
  icone: string;
  cor: string;
  mecanica: MecanicaBasica;
  dano: number;
  alcance: number;
  recarga: number;
  forca: number;
}
export const ATAQUES_BASICOS: Record<IdPersonagem, DefAtaqueBasico> = {
  claude: {
    nome: 'Corte Astral',
    descricao: 'Um corte largo atravessa os inimigos à frente.',
    icone: '⚔',
    cor: '#ffbd82',
    mecanica: 'corte',
    dano: 28,
    alcance: 5,
    recarga: 0.46,
    forca: 5,
  },
  gpt: {
    nome: 'Cadeia de Ideias',
    descricao: 'A centelha salta entre até quatro inimigos próximos.',
    icone: 'ϟ',
    cor: '#73f7cd',
    mecanica: 'cadeia',
    dano: 23,
    alcance: 8,
    recarga: 0.68,
    forca: 2,
  },
  gemini: {
    nome: 'Cruz Dupla',
    descricao: 'Duas linhas de luz se cruzam sobre o alvo.',
    icone: '✧',
    cor: '#9dbbff',
    mecanica: 'cruz',
    dano: 20,
    alcance: 7,
    recarga: 0.65,
    forca: 3,
  },
  llama: {
    nome: 'Impacto da Forja',
    descricao: 'Esmaga o chão ao redor do alvo com força bruta.',
    icone: '✹',
    cor: '#ffae69',
    mecanica: 'impacto',
    dano: 44,
    alcance: 4.8,
    recarga: 0.95,
    forca: 14,
  },
  mistral: {
    nome: 'Leque do Vento',
    descricao: 'Três lâminas de ar cobrem um leque à frente.',
    icone: '≋',
    cor: '#b8f8df',
    mecanica: 'leque',
    dano: 22,
    alcance: 7.5,
    recarga: 0.5,
    forca: 8,
  },
  deepseek: {
    nome: 'Onda Abissal',
    descricao: 'Uma frente de água empurra e desacelera os inimigos.',
    icone: '≈',
    cor: '#67cfff',
    mecanica: 'onda',
    dano: 29,
    alcance: 6.5,
    recarga: 0.8,
    forca: 20,
  },
  aurora: {
    nome: 'Pulso de Notas',
    descricao: 'Três notas expandem anéis sonoros ao redor da cantora.',
    icone: '♫',
    cor: '#ff9ce3',
    mecanica: 'notas',
    dano: 13,
    alcance: 6,
    recarga: 0.88,
    forca: 3,
  },
  nox: {
    nome: 'Convergência Sombria',
    descricao: 'A sombra converge no alvo e puxa inimigos para o centro.',
    icone: '◈',
    cor: '#bb99ff',
    mecanica: 'convergencia',
    dano: 31,
    alcance: 7,
    recarga: 0.85,
    forca: -12,
  },
  byte: {
    nome: 'Rajada Fork',
    descricao: 'O disparo principal se divide em três ramos no impacto.',
    icone: '⌘',
    cor: '#82ff9e',
    mecanica: 'fork',
    dano: 27,
    alcance: 8.5,
    recarga: 0.62,
    forca: 4,
  },
};
export function ataqueBasico(id: IdPersonagem): DefAtaqueBasico {
  return ATAQUES_BASICOS[id] ?? ATAQUES_BASICOS.claude;
}
