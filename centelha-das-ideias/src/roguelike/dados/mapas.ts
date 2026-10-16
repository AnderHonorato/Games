/** Arenas e os marcos permanentes da conta. */
export type IdMapa = 'jardim' | 'forja' | 'abismo';

export interface DefMapa {
  id: IdMapa;
  nome: string;
  descricao: string;
  xpNecessario: number;
  cor: string;
  proximo: IdMapa | null;
  chefeNome: string;
  chefeFala: string;
  entradaFala: string;
}

export const MAPAS: DefMapa[] = [
  {
    id: 'jardim',
    nome: 'Jardim das Ideias',
    descricao: 'Uma clareira viva entre árvores, grama e cristais.',
    xpNecessario: 0,
    cor: '#86d77b',
    proximo: 'forja',
    chefeNome: 'Guardião do Jardim',
    chefeFala: 'Nenhuma ideia passa sem criar raízes!',
    entradaFala: 'Cada nova ideia começa com uma pequena semente.',
  },
  {
    id: 'forja',
    nome: 'Forja das Centelhas',
    descricao: 'Plataformas de aço, pontes mecânicas e canais de lava selados.',
    xpNecessario: 200,
    cor: '#ffad59',
    proximo: 'abismo',
    chefeNome: 'Mestre da Forja',
    chefeFala: 'Vamos ver se sua centelha aguenta o calor!',
    entradaFala: 'É hora de transformar suas ideias em algo resistente.',
  },
  {
    id: 'abismo',
    nome: 'Abismo dos Ecos',
    descricao: 'Ilhas de basalto, passarelas e monólitos envoltos em névoa.',
    xpNecessario: 600,
    cor: '#b39aff',
    proximo: null,
    chefeNome: 'Soberano dos Ecos',
    chefeFala: 'Até a luz mais forte encontra sua sombra.',
    entradaFala: 'Nas profundezas, uma centelha pode iluminar novos caminhos.',
  },
];

export function mapa(id: string): DefMapa {
  return MAPAS.find((m) => m.id === id) ?? MAPAS[0];
}

export function mapaDesbloqueado(id: string, xp: number): boolean {
  const def = MAPAS.find((m) => m.id === id);
  return !!def && Number.isFinite(xp) && xp >= def.xpNecessario;
}
