/** Regiões regeneráveis: não existe histórico crescente dos lugares visitados. */
import { criarAleatorio, hash2 } from '../../nucleo/aleatorio';
import type { IdMapa } from '../dados/mapas';

export const TAMANHO_REGIAO = 32;
export const LIMITE_REGIOES = 49;
export type QualidadeMundo = 'alta' | 'media' | 'baixa';
export interface PosicaoMundo {
  x: number;
  z: number;
}
export interface ObstaculoMundo extends PosicaoMundo {
  r: number;
  altura: number;
  tipo: 'arvore' | 'rocha' | 'cristal';
  giro: number;
}
export interface PontoExploracao extends PosicaoMundo {
  id: string;
  tipo: 'fonte' | 'totem' | 'cofre' | 'viajante';
  regiao: string;
}
export interface RegiaoMundo {
  chave: string;
  cx: number;
  cz: number;
  x: number;
  z: number;
  bioma: IdMapa;
  obstaculos: ObstaculoMundo[];
  pontos: PontoExploracao[];
}
const SEMENTES: Record<IdMapa, number> = {
  jardim: 2026,
  forja: 731,
  abismo: 1903,
  aurora: 4027,
  coral: 5903,
};
export function coordenadaRegiao(valor: number): number {
  return Math.floor((Number.isFinite(valor) ? valor : 0) / TAMANHO_REGIAO);
}
export function chaveRegiao(cx: number, cz: number): string {
  return `${cx},${cz}`;
}

export function gerarRegiao(cx: number, cz: number, bioma: IdMapa): RegiaoMundo {
  const chave = chaveRegiao(cx, cz);
  const rnd = criarAleatorio(Math.floor(hash2(cx, cz, SEMENTES[bioma]) * 4294967296));
  const x = cx * TAMANHO_REGIAO,
    z = cz * TAMANHO_REGIAO;
  const pontos: PontoExploracao[] = [];
  // Uma clareira reservada torna todos os marcos alcançáveis sem colisão decorativa.
  if (hash2(cx, cz, SEMENTES[bioma] + 1) > 0.48) {
    const tipos = ['fonte', 'totem', 'cofre', 'viajante'] as const;
    const tipo = tipos[Math.floor(rnd() * tipos.length)];
    pontos.push({
      id: `${bioma}:${chave}:${tipo}`,
      tipo,
      regiao: chave,
      x: x + 8 + rnd() * 16,
      z: z + 8 + rnd() * 16,
    });
  }
  const obstaculos: ObstaculoMundo[] = [];
  for (let i = 0; i < 9; i++) {
    const ox = x + 3 + rnd() * 26,
      oz = z + 3 + rnd() * 26;
    const t = rnd();
    const tipo = t < 0.47 ? 'arvore' : t < 0.82 ? 'rocha' : 'cristal';
    const r = tipo === 'arvore' ? 0.65 : tipo === 'rocha' ? 0.7 + rnd() * 0.8 : 0.8;
    const altura =
      tipo === 'arvore' ? 4 + rnd() * 2.5 : tipo === 'rocha' ? r * 1.3 : 1.8 + rnd() * 2;
    const giro = rnd() * Math.PI * 2;
    if (Math.hypot(ox, oz) < 11) continue;
    if (pontos.some((p) => Math.hypot(p.x - ox, p.z - oz) < r + 4)) continue;
    if (obstaculos.some((o) => Math.hypot(o.x - ox, o.z - oz) < o.r + r + 2.5)) continue;
    obstaculos.push({ x: ox, z: oz, tipo, r, altura, giro });
  }
  return { chave, cx, cz, x, z, bioma, obstaculos, pontos };
}

/** União dos arredores de todos os jogadores, com prioridade equilibrada por distância. */
export class MundoContinuo {
  readonly regioes = new Map<string, RegiaoMundo>();
  private assinatura = '';
  private pendentes: { cx: number; cz: number; distancia: number }[] = [];
  constructor(
    readonly qualidade: QualidadeMundo,
    readonly bioma: IdMapa
  ) {}

  atualizar(jogadores: readonly PosicaoMundo[], orcamento = 3): boolean {
    const centros = jogadores
      .filter((p) => Number.isFinite(p.x) && Number.isFinite(p.z))
      .slice(0, 8)
      .map((p) => ({ cx: coordenadaRegiao(p.x), cz: coordenadaRegiao(p.z) }));
    if (!centros.length) centros.push({ cx: 0, cz: 0 });
    const assinatura = centros
      .map((p) => chaveRegiao(p.cx, p.cz))
      .sort()
      .join(';');
    let mudou = false;
    if (assinatura !== this.assinatura) {
      this.assinatura = assinatura;
      const raio = this.qualidade === 'alta' ? 2 : 1;
      const candidatos = new Map<string, { cx: number; cz: number; distancia: number }>();
      for (const c of centros)
        for (let dx = -raio; dx <= raio; dx++)
          for (let dz = -raio; dz <= raio; dz++) {
            const cx = c.cx + dx,
              cz = c.cz + dz,
              chave = chaveRegiao(cx, cz);
            const distancia = dx * dx + dz * dz;
            const existente = candidatos.get(chave);
            if (!existente || distancia < existente.distancia)
              candidatos.set(chave, { cx, cz, distancia });
          }
      const ordenados = [...candidatos.values()]
        .sort((a, b) => a.distancia - b.distancia || a.cx - b.cx || a.cz - b.cz)
        .slice(0, LIMITE_REGIOES);
      const desejados = new Set(ordenados.map((c) => chaveRegiao(c.cx, c.cz)));
      for (const chave of this.regioes.keys())
        if (!desejados.has(chave)) {
          this.regioes.delete(chave);
          mudou = true;
        }
      this.pendentes = ordenados.filter((c) => !this.regioes.has(chaveRegiao(c.cx, c.cz)));
      // O piso e as colisões do lugar ocupado sempre ficam prontos no mesmo quadro.
      for (const c of centros) {
        const chave = chaveRegiao(c.cx, c.cz);
        if (!this.regioes.has(chave) && desejados.has(chave)) {
          this.regioes.set(chave, gerarRegiao(c.cx, c.cz, this.bioma));
          mudou = true;
        }
      }
    }
    let geradas = 0;
    while (this.pendentes.length && geradas < orcamento) {
      const c = this.pendentes.shift()!,
        chave = chaveRegiao(c.cx, c.cz);
      if (this.regioes.has(chave)) continue;
      this.regioes.set(chave, gerarRegiao(c.cx, c.cz, this.bioma));
      mudou = true;
      geradas++;
    }
    return mudou;
  }
  limpar(): void {
    this.regioes.clear();
    this.pendentes.length = 0;
    this.assinatura = '';
  }
}
