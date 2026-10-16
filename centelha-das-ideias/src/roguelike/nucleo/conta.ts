/** Perfil local: XP de conta é separado do nível temporário da partida. */
import { PERSONAGENS, type IdPersonagem } from '../dados/personagens';
import { MAPAS, mapaDesbloqueado, type IdMapa } from '../dados/mapas';
import {
  normalizarPersonalizacao,
  personalizacaoPadrao,
  type Personalizacao,
} from '../../render/personalizacao';

export const CONTA_CHAVE = 'centelha-conta-v1';
export type ArmaInicial = 'lamina' | 'cajado' | 'martelo';
export interface DadosConta {
  versao: 1;
  nome: string;
  xp: number;
  mapa: IdMapa;
  armaInicial: ArmaInicial;
  visuais: Partial<Record<IdPersonagem, Personalizacao>>;
}
type Armazenamento = Pick<Storage, 'getItem' | 'setItem'>;

export function normalizarNome(value: unknown): string {
  if (typeof value !== 'string') return 'Aventureiro';
  const limpo = value
    .normalize('NFC')
    .replace(/<[^>]*>/g, '')
    .replace(/[<>\u0000-\u001f\u007f-\u009f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return Array.from(limpo).slice(0, 20).join('').trim() || 'Aventureiro';
}

function objeto(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
function proprio(value: Record<string, unknown>, chave: string): unknown {
  return Object.prototype.hasOwnProperty.call(value, chave) ? value[chave] : undefined;
}
function xpSeguro(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0
    ? Math.min(Number.MAX_SAFE_INTEGER, Math.floor(value))
    : 0;
}
function armazenamentoPadrao(): Armazenamento | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}

export class Conta {
  readonly dados: DadosConta;
  private readonly storage: Armazenamento | null;

  constructor(storage?: Armazenamento | null) {
    this.storage = storage === undefined ? armazenamentoPadrao() : storage;
    this.dados = {
      versao: 1,
      nome: 'Aventureiro',
      xp: 0,
      mapa: 'jardim',
      armaInicial: 'lamina',
      visuais: {},
    };
    try {
      const json = this.storage?.getItem(CONTA_CHAVE);
      if (!json) return;
      const salva: unknown = JSON.parse(json);
      if (!objeto(salva) || proprio(salva, 'versao') !== 1) return;
      this.dados.nome = normalizarNome(proprio(salva, 'nome'));
      this.dados.xp = xpSeguro(proprio(salva, 'xp'));
      const mapa = proprio(salva, 'mapa');
      if (typeof mapa === 'string' && mapaDesbloqueado(mapa, this.dados.xp))
        this.dados.mapa = mapa as IdMapa;
      const arma = proprio(salva, 'armaInicial');
      if (arma === 'lamina' || arma === 'cajado' || arma === 'martelo')
        this.dados.armaInicial = arma;
      const visuais = proprio(salva, 'visuais');
      if (objeto(visuais))
        for (const p of PERSONAGENS) {
          const visual = proprio(visuais, p.id);
          if (objeto(visual)) this.dados.visuais[p.id] = normalizarPersonalizacao(visual, p.cor);
        }
    } catch {
      /* Armazenamento bloqueado ou JSON corrompido: perfil padrão continua utilizável. */
    }
  }

  private salvar(): void {
    try {
      this.storage?.setItem(CONTA_CHAVE, JSON.stringify(this.dados));
    } catch {
      /* quota/modo privado */
    }
  }
  definirNome(nome: unknown): void {
    this.dados.nome = normalizarNome(nome);
    this.salvar();
  }
  ganharXp(quantidade: number): void {
    if (!Number.isFinite(quantidade) || quantidade <= 0) return;
    this.dados.xp = Math.min(
      Number.MAX_SAFE_INTEGER,
      xpSeguro(this.dados.xp) + Math.floor(quantidade)
    );
    this.salvar();
  }
  selecionarMapa(id: string): boolean {
    if (!MAPAS.some((m) => m.id === id) || !mapaDesbloqueado(id, this.dados.xp)) return false;
    this.dados.mapa = id as IdMapa;
    this.salvar();
    return true;
  }
  definirArma(arma: ArmaInicial): void {
    if (arma !== 'lamina' && arma !== 'cajado' && arma !== 'martelo') return;
    this.dados.armaInicial = arma;
    this.salvar();
  }
  definirVisual(id: IdPersonagem, visual: unknown): void {
    const p = PERSONAGENS.find((p) => p.id === id);
    if (!p) return;
    this.dados.visuais[id] = normalizarPersonalizacao(visual, p.cor);
    this.salvar();
  }
  visual(id: IdPersonagem): Personalizacao {
    const p = PERSONAGENS.find((p) => p.id === id) ?? PERSONAGENS[0];
    const salva = this.dados.visuais[p.id];
    return salva ? normalizarPersonalizacao(salva, p.cor) : personalizacaoPadrao(p.cor);
  }
}
