import { describe, expect, it, vi } from 'vitest';
import { habilidade } from '../../src/roguelike/dados/habilidades';
import { valoresHabilidade } from '../../src/roguelike/nucleo/progresso';
import {
  distanciaSegmento,
  faceDoDado,
  lancarPoderEspecial,
  type AlvoEspecial,
  type ContextoPoderEspecial,
} from '../../src/roguelike/jogo/poderes-especiais';
import type { SistemaFx } from '../../src/roguelike/fx/indice';

function cenario(
  id: string,
  nivel = 1,
  inimigos: AlvoEspecial[] = [{ x: 4, z: 0, vida: 1e6, vivo: true, raio: 0.4 }],
  sorte = 0.4
) {
  const filas: { t: number; fn: () => void }[] = [];
  let agora = 0;
  const atingir = vi.fn();
  const chicote = vi.fn(),
    criar = vi.fn(),
    emitir = vi.fn();
  const fx = { raios: { chicote }, planos: { criar }, p: { emitir } } as unknown as SistemaFx;
  const ctx: ContextoPoderEspecial<AlvoEspecial> = {
    id,
    nivel,
    valores: valoresHabilidade(habilidade(id)!, nivel),
    x: 0,
    z: 0,
    angulo: 0,
    inimigos,
    rnd: () => sorte,
    agendar: (fn, t) => filas.push({ fn, t: agora + t }),
    atingir,
    fx,
  };
  const drenar = () => {
    let limite = 0;
    while (filas.length) {
      expect(++limite).toBeLessThan(100);
      filas.sort((a, b) => a.t - b.t);
      const evento = filas.shift()!;
      agora = evento.t;
      evento.fn();
    }
  };
  return { ctx, filas, atingir, chicote, criar, emitir, drenar };
}
describe('novas habilidades têm mecânicas próprias no relógio da partida', () => {
  it('mantém as seis faces reais e garante o seis absoluto', () => {
    expect(Array.from({ length: 6 }, (_, i) => faceDoDado(() => i / 6))).toEqual([
      1, 2, 3, 4, 5, 6,
    ]);
    expect(faceDoDado(() => 1)).toBe(6);
    expect(faceDoDado(() => NaN)).toBe(1);
    expect(faceDoDado(() => 0, true)).toBe(6);
    expect(distanciaSegmento(3, 2, 0, 0, 5, 0)).toBe(2);
    expect(distanciaSegmento(8, 4, 0, 0, 5, 0)).toBe(5);
  });
  it('cada poder agenda dano e produz efeitos nativos finitos sem relógio externo', () => {
    for (const id of ['tremFantasma', 'dadosCaoticos', 'espelhoPrismatico', 'orquestraOrbital'])
      for (const nivel of [1, 5, 10]) {
        const s = cenario(id, nivel);
        expect(lancarPoderEspecial(s.ctx)).toBe(true);
        expect(s.atingir).not.toHaveBeenCalled();
        expect(s.filas.length).toBeGreaterThan(0);
        s.drenar();
        expect(s.atingir.mock.calls.length, id + ':' + nivel).toBeGreaterThan(0);
        for (const [alvo, dano] of s.atingir.mock.calls) {
          expect(alvo.vida).toBeGreaterThan(0);
          expect(Number.isFinite(dano) && dano > 0).toBe(true);
        }
        for (const [pontos] of s.chicote.mock.calls) {
          expect(pontos.length / 3).toBeLessThanOrEqual(60);
          expect(pontos.every(Number.isFinite)).toBe(true);
        }
        expect(s.emitir.mock.calls.length).toBeLessThanOrEqual(9);
      }
  });
  it('revalida vida e posição a cada evento agendado', () => {
    for (const id of ['tremFantasma', 'dadosCaoticos', 'espelhoPrismatico', 'orquestraOrbital']) {
      const alvo = { x: 4, z: 0, vida: 100, vivo: true };
      const s = cenario(id, 10, [alvo]);
      lancarPoderEspecial(s.ctx);
      alvo.vivo = false;
      s.drenar();
      expect(s.atingir).not.toHaveBeenCalled();
      const t = cenario(id, 10, [{ x: 4, z: 0, vida: 100, vivo: true }]);
      lancarPoderEspecial(t.ctx);
      t.ctx.inimigos[0].x = 1000;
      t.drenar();
      expect(t.atingir).not.toHaveBeenCalled();
    }
  });
  it('trem final abre vias paralelas e a evolução cria o engate posterior', () => {
    const alvos = [
      { x: 8, z: 0, vida: 100 },
      { x: 8, z: 1.8, vida: 100 },
      { x: 8, z: -1.8, vida: 100 },
    ];
    const base = cenario('tremFantasma', 1, alvos);
    lancarPoderEspecial(base.ctx);
    base.drenar();
    expect(new Set(base.atingir.mock.calls.map((c) => c[0])).size).toBe(1);
    const final = cenario('tremFantasma', 10, alvos);
    lancarPoderEspecial(final.ctx);
    final.drenar();
    expect(new Set(final.atingir.mock.calls.map((c) => c[0])).size).toBe(3);
    expect(final.atingir.mock.calls.some((c) => c[5] < 0)).toBe(true);
  });
  it('faces não são só cores diferentes: foco, par e cruz têm danos e geometrias diferentes', () => {
    const formas: string[] = [];
    const danos: number[] = [];
    for (let face = 1; face <= 6; face++) {
      const s = cenario('dadosCaoticos', 1, [{ x: 4, z: 0, vida: 100 }], (face - 0.5) / 6);
      lancarPoderEspecial(s.ctx);
      s.drenar();
      formas.push(JSON.stringify(s.chicote.mock.calls.map((c) => c[0])));
      danos.push(s.atingir.mock.calls.reduce((n, c) => n + c[1], 0));
    }
    expect(new Set(formas).size).toBe(6);
    expect(new Set(danos).size).toBeGreaterThan(3);
  });
  it('contratempo duplica eventos musicais e o finale acrescenta a onda de encerramento', () => {
    const n = (nivel: number) => {
      const s = cenario('orquestraOrbital', nivel);
      lancarPoderEspecial(s.ctx);
      return s.filas.length;
    };
    expect([n(1), n(5), n(10)]).toEqual([4, 8, 9]);
  });
  it('refração e catedral acrescentam feixes e pontos de emissão', () => {
    const quantidades = [1, 5, 10].map((nivel) => {
      const s = cenario('espelhoPrismatico', nivel);
      lancarPoderEspecial(s.ctx);
      s.drenar();
      return s.chicote.mock.calls.length;
    });
    expect(quantidades[1]).toBeGreaterThan(quantidades[0]);
    expect(quantidades[2]).toBeGreaterThan(quantidades[1]);
  });
  it('ids alheios não consomem o ataque', () => {
    const s = cenario('tremFantasma');
    s.ctx.id = 'centelhaOrbital';
    expect(lancarPoderEspecial(s.ctx)).toBe(false);
    expect(s.filas).toHaveLength(0);
  });
});
