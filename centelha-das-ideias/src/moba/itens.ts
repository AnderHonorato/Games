import type { ClasseMoba, ItemMoba } from './tipos';

export type CategoriaItemMoba =
  'componente' | 'ataque' | 'magia' | 'defesa' | 'mobilidade' | 'suporte';
export type TipoEfeitoItemMoba = 'vampirismo' | 'escudo' | 'furia' | 'gelido' | 'ferida' | 'eco';
export interface EfeitoItemMoba {
  tipo: TipoEfeitoItemMoba;
  nome: string;
  descricao: string;
  /** Fração para vampirismo/fúria/gélido/ferida; vida para escudo; dano para eco. */
  valor: number;
  duracao?: number;
  recarga?: number;
}
export interface ItemMobaDetalhado extends ItemMoba {
  categoria: CategoriaItemMoba;
  classes: readonly ClasseMoba[];
  /** Componentes diretos; custo é sempre o preço total incluindo todos eles. */
  receita: readonly string[];
  efeito?: EfeitoItemMoba;
  passiva?: { nome: string; descricao: string };
}
const TODAS: readonly ClasseMoba[] = [
  'tanque',
  'lutador',
  'assassino',
  'mago',
  'atirador',
  'suporte',
];
const FISICAS: readonly ClasseMoba[] = ['lutador', 'assassino', 'atirador'];
const MAGICAS: readonly ClasseMoba[] = ['mago', 'suporte'];
const RESISTENTES: readonly ClasseMoba[] = ['tanque', 'lutador'];

const ITENS_ORIGINAIS: ItemMoba[] = [
  {
    id: 'botas-brisa',
    nome: 'Botas da Brisa',
    descricao: 'Passos leves para atravessar o bosque.',
    custo: 350,
    velocidade: 0.65,
  },
  {
    id: 'lamina-sol',
    nome: 'Lâmina do Sol',
    descricao: 'Uma espada leve de luz dourada.',
    custo: 900,
    dano: 27,
  },
  {
    id: 'cajado-lua',
    nome: 'Cajado da Lua',
    descricao: 'Magia e energia em uma ponta estrelada.',
    custo: 950,
    dano: 18,
    mana: 180,
  },
  {
    id: 'colete-musgo',
    nome: 'Colete de Musgo',
    descricao: 'Proteção macia para a linha de frente.',
    custo: 850,
    vida: 220,
    armadura: 13,
  },
  {
    id: 'coracao-carvalho',
    nome: 'Coração de Carvalho',
    descricao: 'Vida e recuperação de uma árvore antiga.',
    custo: 1350,
    vida: 380,
    regeneracao: 6,
  },
  {
    id: 'ampulheta-mel',
    nome: 'Ampulheta de Mel',
    descricao: 'A magia flui em intervalos menores.',
    custo: 1050,
    mana: 140,
    recarga: 0.12,
  },
  {
    id: 'arco-vagalume',
    nome: 'Arco de Vagalume',
    descricao: 'Golpes fortes com um toque de agilidade.',
    custo: 1250,
    dano: 31,
    velocidade: 0.2,
  },
  {
    id: 'escudo-concha',
    nome: 'Escudo de Concha',
    descricao: 'Uma carapaça reluzente contra os ataques.',
    custo: 1000,
    armadura: 27,
    vida: 120,
  },
  {
    id: 'chaleira-viva',
    nome: 'Chaleira Viva',
    descricao: 'Chá encantado para uma luta longa.',
    custo: 800,
    vida: 140,
    mana: 120,
    regeneracao: 4,
  },
  {
    id: 'coroa-aurora',
    nome: 'Coroa da Aurora',
    descricao: 'Poder e reservas para grandes feitiços.',
    custo: 1700,
    dano: 40,
    mana: 280,
    recarga: 0.08,
  },
  {
    id: 'martelo-cometa',
    nome: 'Martelo Cometa',
    descricao: 'Impacto pesado sem abrir mão da resistência.',
    custo: 1600,
    dano: 35,
    vida: 230,
  },
  {
    id: 'manto-neblina',
    nome: 'Manto de Neblina',
    descricao: 'Proteção ágil tecida com nuvens.',
    custo: 1150,
    armadura: 18,
    velocidade: 0.35,
    recarga: 0.06,
  },
  {
    id: 'semente-eterna',
    nome: 'Semente Eterna',
    descricao: 'Vitalidade que floresce ao longo da batalha.',
    custo: 1800,
    vida: 480,
    regeneracao: 9,
  },
  {
    id: 'relogio-estelar',
    nome: 'Relógio Estelar',
    descricao: 'Tempo precioso para um kit de habilidades.',
    custo: 1500,
    mana: 250,
    recarga: 0.18,
    dano: 15,
  },
];

type Complemento = Pick<ItemMobaDetalhado, 'categoria' | 'classes' | 'receita'>;
const COMPLEMENTOS: Record<string, Complemento> = {
  'botas-brisa': { categoria: 'mobilidade', classes: TODAS, receita: ['fio-vento'] },
  'lamina-sol': { categoria: 'ataque', classes: FISICAS, receita: ['lasca-sol', 'lasca-sol'] },
  'cajado-lua': { categoria: 'magia', classes: MAGICAS, receita: ['lasca-sol', 'gota-lua'] },
  'colete-musgo': {
    categoria: 'defesa',
    classes: RESISTENTES,
    receita: ['folha-viva', 'casca-ferro'],
  },
  'coracao-carvalho': {
    categoria: 'defesa',
    classes: RESISTENTES,
    receita: ['folha-viva', 'folha-viva', 'broto-calmo'],
  },
  'ampulheta-mel': { categoria: 'magia', classes: MAGICAS, receita: ['gota-lua', 'conta-tempo'] },
  'arco-vagalume': {
    categoria: 'ataque',
    classes: ['atirador', 'assassino'],
    receita: ['lamina-sol', 'fio-vento'],
  },
  'escudo-concha': {
    categoria: 'defesa',
    classes: RESISTENTES,
    receita: ['casca-ferro', 'casca-ferro', 'folha-viva'],
  },
  'chaleira-viva': {
    categoria: 'suporte',
    classes: ['suporte', 'tanque'],
    receita: ['folha-viva', 'gota-lua', 'broto-calmo'],
  },
  'coroa-aurora': { categoria: 'magia', classes: MAGICAS, receita: ['cajado-lua', 'conta-tempo'] },
  'martelo-cometa': {
    categoria: 'ataque',
    classes: ['lutador', 'tanque'],
    receita: ['lamina-sol', 'folha-viva', 'folha-viva'],
  },
  'manto-neblina': {
    categoria: 'mobilidade',
    classes: ['assassino', 'suporte'],
    receita: ['casca-ferro', 'fio-vento', 'conta-tempo'],
  },
  'semente-eterna': { categoria: 'defesa', classes: ['tanque'], receita: ['coracao-carvalho'] },
  'relogio-estelar': {
    categoria: 'magia',
    classes: MAGICAS,
    receita: ['ampulheta-mel', 'gota-lua'],
  },
};
const COMPONENTES: ItemMobaDetalhado[] = [
  {
    id: 'lasca-sol',
    nome: 'Lasca de Sol',
    descricao: 'Um primeiro fio de luz para seus ataques.',
    custo: 250,
    dano: 7,
    categoria: 'componente',
    classes: FISICAS,
    receita: [],
  },
  {
    id: 'gota-lua',
    nome: 'Gota de Lua',
    descricao: 'Uma reserva de energia para lançar mais magia.',
    custo: 200,
    mana: 60,
    categoria: 'componente',
    classes: MAGICAS,
    receita: [],
  },
  {
    id: 'folha-viva',
    nome: 'Folha Viva',
    descricao: 'Um pouco de vida para resistir na rota.',
    custo: 200,
    vida: 75,
    categoria: 'componente',
    classes: RESISTENTES,
    receita: [],
  },
  {
    id: 'casca-ferro',
    nome: 'Casca de Ferro',
    descricao: 'Defesa simples contra golpes.',
    custo: 250,
    armadura: 7,
    categoria: 'componente',
    classes: RESISTENTES,
    receita: [],
  },
  {
    id: 'fio-vento',
    nome: 'Fio de Vento',
    descricao: 'Agilidade para escapar e alcançar.',
    custo: 250,
    velocidade: 0.25,
    categoria: 'componente',
    classes: TODAS,
    receita: [],
  },
  {
    id: 'broto-calmo',
    nome: 'Broto Calmo',
    descricao: 'Recupere vida lentamente entre confrontos.',
    custo: 250,
    regeneracao: 2,
    categoria: 'componente',
    classes: ['tanque', 'suporte'],
    receita: [],
  },
  {
    id: 'conta-tempo',
    nome: 'Conta do Tempo',
    descricao: 'Uma pequena redução na espera por habilidades.',
    custo: 350,
    recarga: 0.04,
    categoria: 'componente',
    classes: MAGICAS,
    receita: [],
  },
  {
    id: 'dente-rubro',
    nome: 'Dente Rubro',
    descricao: 'Ataques mais fortes; componente da Presa de Veludo.',
    custo: 400,
    dano: 10,
    categoria: 'componente',
    classes: FISICAS,
    receita: [],
  },
];
const ESPECIAIS: ItemMobaDetalhado[] = [
  {
    id: 'presa-veludo',
    nome: 'Presa de Veludo',
    descricao: 'Sustente duelos recuperando vida com ataques básicos.',
    custo: 2400,
    dano: 38,
    vida: 120,
    categoria: 'ataque',
    classes: ['lutador', 'atirador'],
    receita: ['lamina-sol', 'dente-rubro'],
    efeito: {
      tipo: 'vampirismo',
      nome: 'Mordida Vital',
      descricao: 'Ataques básicos curam 18% do dano causado a unidades.',
      valor: 0.18,
    },
  },
  {
    id: 'aegis-crepusculo',
    nome: 'Égide do Crepúsculo',
    descricao: 'Uma última proteção antes de recuar.',
    custo: 2450,
    vida: 380,
    armadura: 18,
    categoria: 'defesa',
    classes: RESISTENTES,
    receita: ['colete-musgo', 'folha-viva'],
    efeito: {
      tipo: 'escudo',
      nome: 'Último Abraço',
      descricao: 'Abaixo de 35% da vida, recebe 100 de escudo por 4s. Recarga: 22s.',
      valor: 100,
      duracao: 4,
      recarga: 22,
    },
  },
  {
    id: 'garras-tempestade',
    nome: 'Garras da Tempestade',
    descricao: 'Combates prolongados aceleram seus ataques.',
    custo: 2500,
    dano: 35,
    velocidade: 0.25,
    categoria: 'ataque',
    classes: ['atirador', 'lutador'],
    receita: ['arco-vagalume', 'lasca-sol'],
    efeito: {
      tipo: 'furia',
      nome: 'Ritmo Selvagem',
      descricao: 'Cada ataque básico dá 8% de velocidade de ataque por 3s; acumula até 4 vezes.',
      valor: 0.08,
      duracao: 3,
    },
  },
  {
    id: 'cetro-geada',
    nome: 'Cetro de Geada',
    descricao: 'Controle a distância entre você e o adversário.',
    custo: 2300,
    dano: 30,
    mana: 220,
    categoria: 'magia',
    classes: ['mago', 'suporte'],
    receita: ['cajado-lua', 'gota-lua'],
    efeito: {
      tipo: 'gelido',
      nome: 'Frio Gentil',
      descricao: 'Ataques básicos reduzem a velocidade do alvo em 25% por 1,3s.',
      valor: 0.25,
      duracao: 1.3,
    },
  },
  {
    id: 'espinho-seco',
    nome: 'Espinho Seco',
    descricao: 'Uma resposta à cura de inimigos resistentes.',
    custo: 2250,
    dano: 30,
    armadura: 16,
    categoria: 'ataque',
    classes: ['lutador', 'assassino', 'atirador'],
    receita: ['lamina-sol', 'casca-ferro'],
    efeito: {
      tipo: 'ferida',
      nome: 'Ferida do Bosque',
      descricao:
        'Ataques básicos reduzem em 40% as curas e a regeneração recebidas pelo alvo por 3s.',
      valor: 0.4,
      duracao: 3,
    },
  },
  {
    id: 'sino-eco',
    nome: 'Sino do Eco',
    descricao: 'Um sino encantado pontua o início de cada duelo.',
    custo: 2500,
    dano: 34,
    mana: 240,
    recarga: 0.1,
    categoria: 'magia',
    classes: MAGICAS,
    receita: ['cajado-lua', 'conta-tempo'],
    efeito: {
      tipo: 'eco',
      nome: 'Nota Ressonante',
      descricao: 'Um ataque básico causa 45 de dano extra. Recarga: 8s.',
      valor: 45,
      recarga: 8,
    },
  },
];

/** Os 14 itens anteriores preservam seus preços, atributos e identificadores. */
export const ITENS_MOBA: ItemMobaDetalhado[] = [
  ...ITENS_ORIGINAIS.map((item) => ({ ...item, ...COMPLEMENTOS[item.id] })),
  ...COMPONENTES,
  ...ESPECIAIS.map((item) => ({
    ...item,
    passiva: item.efeito && { nome: item.efeito.nome, descricao: item.efeito.descricao },
  })),
];
const itensPorId = new Map(ITENS_MOBA.map((item) => [item.id, item]));
export function itemMoba(id: string): ItemMobaDetalhado | undefined {
  return itensPorId.get(id);
}

export function recomendadosPorClasse(classe: ClasseMoba | string): ItemMobaDetalhado[] {
  if (!TODAS.includes(classe as ClasseMoba)) return [];
  return ITENS_MOBA.filter(
    (item) => item.categoria !== 'componente' && item.classes.includes(classe as ClasseMoba)
  );
}
export interface CompraItemMoba {
  item: ItemMobaDetalhado;
  custo: number;
  /** Índices únicos do inventário original, em ordem crescente. */
  consumidos: number[];
  inventarioRestante: string[];
}
/** Prévia sem mutação. A simulação deve validar ouro, base, estado e os seis espaços antes de aplicar. */
export function custoCompra(inventario: readonly string[], id: string): CompraItemMoba | undefined {
  const item = itemMoba(id);
  if (!item) return undefined;
  const usados = new Set<number>();
  let credito = 0;
  const consumir = (componenteId: string, caminho: ReadonlySet<string>): void => {
    // Uma ocorrência só pode financiar um ramo, mesmo se a receita repetir a peça.
    const indice = inventario.findIndex((possui, i) => possui === componenteId && !usados.has(i));
    const componente = itemMoba(componenteId);
    if (!componente || caminho.has(componenteId)) return;
    if (indice !== -1) {
      usados.add(indice);
      credito += componente.custo;
      return;
    }
    const proximo = new Set(caminho).add(componenteId);
    for (const ingrediente of componente.receita) consumir(ingrediente, proximo);
  };
  for (const componente of item.receita) consumir(componente, new Set([item.id]));
  return {
    item,
    custo: Math.max(0, item.custo - credito),
    consumidos: [...usados].sort((a, b) => a - b),
    inventarioRestante: inventario.filter((_, i) => !usados.has(i)),
  };
}
