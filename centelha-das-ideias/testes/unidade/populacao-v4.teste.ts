import { describe, expect, it, vi } from 'vitest';
import { INIMIGOS, type DefInimigo } from '../../src/roguelike/dados/inimigos';
import { Partida } from '../../src/roguelike/jogo/partida';
import {
  creditoSurgimento,
  limitePopulacao,
  MAX_POPULACAO,
  podeSurgir,
} from '../../src/roguelike/nucleo/limites-populacao';

type InimigoTeste = {
  id: number;
  vivo: boolean;
  def: DefInimigo;
  recarga: number;
  geracao?: number;
  x: number;
  z: number;
};
type CoreTeste = {
  inimigos: InimigoTeste[];
  hordasPendentes: { k: number }[];
  creditoHorda: number;
  criarInimigo(
    def: DefInimigo,
    x: number,
    z: number,
    elite?: boolean,
    reserva?: boolean
  ): InimigoTeste | null;
  horda(): void;
  emitirHordaPendente(dt: number): void;
  abrirTrojan(i: InimigoTeste): void;
};
function partida(jogadores = 1): { p: Partida; core: CoreTeste } {
  const local = { x: 0, z: 0, caido: false, ausente: false };
  const p = Object.assign(Object.create(Partida.prototype) as Partida, {
    papel: 'solo',
    local,
    j: local,
    jogadores: Array.from({ length: jogadores }, (_, indice) => ({ ...local, indice })),
    inimigos: [],
    tempo: 1,
    proximoId: 1,
    chefesDerrotados: 0,
    rnd: () => 0.5,
    tiposVistos: new Set(),
    hordasPendentes: [],
    creditoHorda: 0,
    mostrarBanner: vi.fn(),
    som: vi.fn(),
    sentir: vi.fn(),
    vozes: { resmungar: vi.fn() },
    audio: { tocar: vi.fn() },
    fx: { explosao: vi.fn(), chuvaCodigo: vi.fn() },
  });
  return { p, core: p as unknown as CoreTeste };
}

describe('orçamento simultâneo de inimigos', () => {
  it('cresce de 100 solo a 160 para quatro jogadores', () => {
    expect([1, 2, 3, 4, 100].map(limitePopulacao)).toEqual([100, 120, 140, 160, 160]);
    expect(limitePopulacao(NaN)).toBe(100);
    expect(podeSurgir(100, 1, true)).toBe(false);
    expect(MAX_POPULACAO).toBe(160);
  });

  it.each([1, 2, 3, 4])(
    'todos os tipos e a depuração respeitam o orçamento (%i jogadores)',
    (jogadores) => {
      const { p, core } = partida(jogadores);
      for (const def of Object.values(INIMIGOS)) p.depurarInimigo(def.id, 200);
      expect(core.inimigos.length).toBeLessThanOrEqual(limitePopulacao(jogadores));
      expect(core.inimigos.length).toBe(limitePopulacao(jogadores));
    }
  );

  it('reserva duas vagas para chefes e sentinelas, sem ultrapassar o teto', () => {
    const { core } = partida();
    for (let n = 0; n < 150; n++) core.criarInimigo(INIMIGOS.virus, 0, 0);
    expect(core.inimigos.length).toBe(98);
    expect(core.criarInimigo(INIMIGOS.trollBug, 0, 0, false, true)).not.toBeNull();
    expect(core.criarInimigo(INIMIGOS.chefe, 0, 0)).not.toBeNull();
    expect(core.criarInimigo(INIMIGOS.ransomware, 0, 0)).toBeNull();
    expect(core.inimigos.length).toBe(100);
  });

  it('entidades mortas liberam vaga imediatamente, inclusive ao abrir o Trojan', () => {
    const { core } = partida();
    const trojan = core.criarInimigo(INIMIGOS.trojan, 0, 0)!;
    for (let n = 0; n < 97; n++) core.criarInimigo(INIMIGOS.chiado, 0, 0);
    core.abrirTrojan(trojan);
    expect(core.inimigos.filter((i) => i.vivo).length).toBe(98);
    expect(core.inimigos.filter((i) => i.vivo && i.def.id === 'virus').length).toBe(1);
  });

  it('adia a horda mantendo seu tipo, sem despejar a dívida quando surgem vagas', () => {
    const { core } = partida();
    for (let n = 0; n < 98; n++) core.criarInimigo(INIMIGOS.chiado, 0, 0);
    core.horda();
    const pendente = core.hordasPendentes[0];
    for (let n = 0; n < 600; n++) core.emitirHordaPendente(1 / 60);
    expect(pendente.k).toBe(0);
    for (const i of core.inimigos) i.vivo = false;
    core.emitirHordaPendente(1 / 60);
    expect(core.inimigos.filter((i) => i.vivo).length).toBe(1);
    expect(pendente.k).toBe(1);
    expect(creditoSurgimento(1, 100, 60)).toBe(1);
  });
});
