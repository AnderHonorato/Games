import { describe, expect, it, vi } from 'vitest';
import { habilidade } from '../../src/roguelike/dados/habilidades';
import { personagem } from '../../src/roguelike/dados/personagens';
import { valoresHabilidade } from '../../src/roguelike/nucleo/progresso';
import { Partida } from '../../src/roguelike/jogo/partida';
import { type HabAtiva } from '../../src/roguelike/jogo/jogador';
import { RAIO_ARENA } from '../../src/roguelike/render/arena';
vi.mock('../../src/roguelike/fx/assinaturas', () => ({ manifestarPoder: vi.fn() }));
vi.mock('../../src/audio/poderes', () => ({ tocarSomPoder: vi.fn(), DEFINICOES_SONS_PODERES: {} }));

interface ProjetilTeste {
  escala: number;
  raio: number;
  perfura: number;
  y: number;
}
interface Core {
  projeteis: ProjetilTeste[];
  eventos: { tempo: number; acao: () => void }[];
  atualizarHabilidade(h: HabAtiva, dt: number): void;
  dispararProjetil(h: HabAtiva, v: ReturnType<typeof valoresHabilidade>): void;
  novoProjetil(
    h: HabAtiva,
    v: ReturnType<typeof valoresHabilidade>,
    x: number,
    y: number,
    z: number,
    dx: number,
    dz: number,
    o: Partial<ProjetilTeste>
  ): ProjetilTeste;
  nova(h: HabAtiva, v: ReturnType<typeof valoresHabilidade>): void;
  colidirObstaculos(e: { x: number; z: number }, raio: number, altura?: number): void;
  deslocarBlink(
    jg: { x: number; z: number; dashX: number; dashZ: number; def: ReturnType<typeof personagem> },
    distancia: number
  ): void;
}
function fixture(personagemId: Parameters<typeof personagem>[0] = 'claude') {
  const j = { x: 0, z: 0, def: personagem(personagemId), dirX: 1, dirZ: 0, bloqueios: new Map() };
  const p = Object.assign(Object.create(Partida.prototype) as Partida, {
    j,
    local: j,
    jogadores: [j],
    papel: 'solo',
    estado: 'jogando',
    tempo: 1,
    proximoId: 1,
    projeteis: [],
    eventos: [],
    grade: new Map(),
    tmpLista: [],
    som: vi.fn(),
    orbita: vi.fn(),
    fx: { projetilRastro: vi.fn() },
    arena: { obstaculosPerto: () => [{ x: 0, z: 0, r: 1, altura: 0.8 }] },
  });
  const h = (id: string, nivel: number): HabAtiva => ({
    def: habilidade(id),
    idx: 0,
    nivel,
    timer: 0,
    ativaAte: 0,
    fase: 0,
    danoTotal: 0,
    disparos: 0,
  });
  return { p, core: p as unknown as Core, h };
}

describe('progressão aplicada ao combate', () => {
  it.each(['lancaGelo', 'recursao', 'bolaFogo', 'misseis'])(
    '%s aumenta corpo e raio de acerto junto com a área',
    (id) => {
      const { core, h } = fixture();
      const def = habilidade(id);
      const a = core.novoProjetil(h(id, 1), valoresHabilidade(def, 1), 0, 1, 0, 1, 0, {
        escala: 0.7,
        raio: 0.5,
      });
      const b = core.novoProjetil(h(id, 9), valoresHabilidade(def, 9), 0, 1, 0, 1, 0, {
        escala: 0.7,
        raio: 0.5,
      });
      expect(b.escala).toBeGreaterThan(a.escala);
      expect(b.raio / a.raio).toBeCloseTo(b.escala / a.escala);
    }
  );

  it('a perfuração conquistada chega aos projéteis de Recursão', () => {
    const { core, h } = fixture();
    const hab = h('recursao', 9),
      v = valoresHabilidade(hab.def, 9);
    core.dispararProjetil(hab, v);
    expect(core.projeteis.length).toBe(v.quantidade);
    expect(core.projeteis.every((p) => p.perfura === v.perfura)).toBe(true);
  });

  it('evita aplicar a área duas vezes em lâminas que já calculam seu tamanho', () => {
    const { core, h } = fixture();
    const hab = h('laminaVento', 9),
      v = valoresHabilidade(hab.def, 9);
    const p = core.novoProjetil(hab, v, 0, 1, 0, 1, 0, { escala: v.area, raio: v.area * 0.45 });
    expect(p.escala).toBe(v.area);
    expect(p.raio).toBe(v.area * 0.45);
  });

  it('os disparos saem da altura do personagem voador', () => {
    const { core, h } = fixture('fenix');
    const hab = h('bolaFogo', 1);
    const p = core.novoProjetil(hab, valoresHabilidade(hab.def, 1), 0, 1, 0, 1, 0, {});
    expect(p.y).toBeCloseTo(1 + personagem('fenix').voo!);
  });

  it('o voo passa acima de obstáculos baixos e respeita a borda durante o avanço', () => {
    const { core } = fixture('aeria');
    const solo = { x: 0.4, z: 0 },
      voo = { ...solo };
    core.colidirObstaculos(solo, 0.42);
    core.colidirObstaculos(voo, 0.42, personagem('aeria').voo);
    expect(solo.x).toBeGreaterThan(voo.x);
    expect(voo.x).toBe(0.4);
    const jogador = { x: RAIO_ARENA - 1, z: 0, dashX: 1, dashZ: 0, def: personagem('aeria') };
    core.deslocarBlink(jogador, 20);
    expect(Math.hypot(jogador.x, jogador.z)).toBeLessThanOrEqual(RAIO_ARENA);
  });

  it.each(['novaGlacial', 'pulsoSonico', 'ondaProfunda'])(
    '%s agenda ondas adicionais da quantidade efetiva',
    (id) => {
      const { core, h } = fixture();
      const hab = h(id, 8),
        v = valoresHabilidade(hab.def, 8);
      core.nova(hab, v);
      expect(core.eventos.length).toBe(v.quantidade);
      expect(core.eventos.at(-1)!.tempo - core.eventos[0].tempo).toBeLessThan(0.8);
    }
  );

  it('a evolução final de uma órbita já ativa manifesta uma vez', () => {
    const { p, core, h } = fixture();
    Object.assign(p, { atributos: valoresBase(), finaisManifestadas: new Set() });
    const hab = h('centelhaOrbital', 10);
    hab.disparos = 9;
    core.atualizarHabilidade(hab, 1 / 60);
    expect(hab.disparos).toBe(10);
    core.atualizarHabilidade(hab, 1 / 60);
    expect(hab.disparos).toBe(10);
  });
});

function valoresBase() {
  return { dano: 1, area: 1, recarga: 1, quantidade: 0, velocidadeProjetil: 1, duracao: 1 };
}
