/** Contratos compartilhados do modo MOBA; simulação independente do renderizador. */
export type TimeMoba = 0 | 1;
export type RotaMoba = 0 | 1 | 2;
export type ClasseMoba = 'tanque' | 'lutador' | 'assassino' | 'mago' | 'atirador' | 'suporte';
export type TipoHabilidadeMoba =
  | 'projetil'
  | 'linha'
  | 'cone'
  | 'area'
  | 'cura'
  | 'escudo'
  | 'salto'
  | 'puxao'
  | 'invocar'
  | 'raiz'
  | 'orbita'
  | 'canal'
  | 'veneno'
  | 'troca';
export interface DefSkillMoba {
  id: string;
  nome: string;
  descricao: string;
  tipo: TipoHabilidadeMoba;
  dano: number;
  custo: number;
  recarga: number;
  alcance: number;
  raio: number;
  duracao: number;
  cor: string;
  quantidade?: number;
}
export interface DefHeroiMoba {
  id: string;
  nome: string;
  titulo: string;
  classe: ClasseMoba;
  descricao: string;
  cor: string;
  cor2: string;
  forma: string;
  vida: number;
  mana: number;
  dano: number;
  alcance: number;
  velocidade: number;
  armadura: number;
  habilidades: [DefSkillMoba, DefSkillMoba, DefSkillMoba, DefSkillMoba];
  passiva: {
    nome: string;
    descricao: string;
    tipo: 'vampirismo' | 'regeneracao' | 'critico' | 'mana' | 'armadura' | 'celeridade';
  };
}
export interface ItemMoba {
  id: string;
  nome: string;
  descricao: string;
  custo: number;
  dano?: number;
  vida?: number;
  mana?: number;
  armadura?: number;
  velocidade?: number;
  recarga?: number;
  regeneracao?: number;
}
export interface UnidadeMoba {
  id: number;
  tipo: 'heroi' | 'tropa' | 'cerco' | 'neutro' | 'chefe' | 'invocacao';
  time: TimeMoba | 2;
  x: number;
  z: number;
  vida: number;
  vidaMax: number;
  dano: number;
  alcance: number;
  velocidade: number;
  armadura: number;
  raio: number;
  recargaAtaque: number;
  alvo: number | null;
  rota: RotaMoba;
  progresso: number;
  vivo: boolean;
  respawnEm: number;
  controle: number;
  lento: number;
  queimadura: number;
  cor: string;
}
export interface HeroiMoba extends UnidadeMoba {
  tipo: 'heroi';
  time: TimeMoba;
  defId: string;
  nome: string;
  mana: number;
  manaMax: number;
  escudo: number;
  nivel: number;
  xp: number;
  ouro: number;
  abates: number;
  mortes: number;
  assistencias: number;
  cs: number;
  recargas: [number, number, number, number];
  niveis: [number, number, number, number];
  pontos: number;
  inventario: string[];
  renasceEm: number;
  recall: number;
}
export interface EstruturaMoba {
  id: number;
  time: TimeMoba;
  tipo: 'torre' | 'inibidor' | 'nucleo';
  x: number;
  z: number;
  vida: number;
  vidaMax: number;
  rota: RotaMoba;
  ordem: number;
  raio: number;
  recarga: number;
}
export interface ProjetilMoba {
  id: number;
  x: number;
  z: number;
  vx: number;
  vz: number;
  raio: number;
  vida: number;
  cor: string;
  time: TimeMoba | 2;
  dono: number;
  dano: number;
  alvo?: number;
  tipo?: TipoHabilidadeMoba;
  perfura?: number;
  atingidos?: number[];
}
export interface EfeitoMoba {
  id: number;
  tipo: string;
  x: number;
  z: number;
  raio: number;
  cor: string;
  vida: number;
  total: number;
  x2?: number;
  z2?: number;
}
export interface SentinelaMoba {
  id: number;
  time: TimeMoba;
  x: number;
  z: number;
  vida: number;
}
export interface EventoMoba {
  texto: string;
  tempo: number;
  time?: TimeMoba;
}
