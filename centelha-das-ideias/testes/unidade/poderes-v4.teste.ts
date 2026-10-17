import { describe, expect, it, vi } from 'vitest';
import { HABILIDADES, NOVOS_PODERES_IDS, habilidade } from '../../src/roguelike/dados/habilidades';
import { valoresHabilidade } from '../../src/roguelike/nucleo/progresso';
import {
  lancarPoderEspecial,
  LIMITE_TAREFAS_PODER,
  LIMITE_ACERTOS_PODER,
  LIMITE_FITAS_PODER,
  LIMITE_PLANOS_PODER,
  type AlvoEspecial,
  type ContextoPoderEspecial,
} from '../../src/roguelike/jogo/poderes-especiais';
import type { SistemaFx } from '../../src/roguelike/fx/indice';

function cenario(
  id: string,
  nivel = 1,
  inimigos: AlvoEspecial[] = [{ x: 4, z: 0, vida: 1e8, raio: 0.1 }]
) {
  let tempo = 0,
    totalTarefas = 0;
  const fila: { t: number; fn: () => void }[] = [];
  const atingir = vi.fn(),
    chicote = vi.fn(),
    criar = vi.fn();
  const ctx: ContextoPoderEspecial<AlvoEspecial> = {
    id,
    nivel,
    valores: valoresHabilidade(habilidade(id), nivel),
    x: 0,
    z: 0,
    angulo: 0,
    inimigos,
    rnd: () => 0.25,
    agendar: (fn, segundos) => {
      totalTarefas++;
      fila.push({ fn, t: tempo + segundos });
    },
    atingir,
    fx: { raios: { chicote }, planos: { criar }, p: { emitir: vi.fn() } } as unknown as SistemaFx,
  };
  const drenar = () => {
    let n = 0;
    while (fila.length) {
      expect(++n).toBeLessThanOrEqual(LIMITE_TAREFAS_PODER);
      fila.sort((a, b) => a.t - b.t);
      const p = fila.shift()!;
      tempo = p.t;
      p.fn();
    }
  };
  return { ctx, fila, atingir, chicote, criar, drenar, tarefas: () => totalTarefas };
}
const grade = (): AlvoEspecial[] =>
  Array.from({ length: 625 }, (_, i) => ({
    x: (i % 25) - 12,
    z: Math.floor(i / 25) - 12,
    vida: 1e8,
    raio: 0.15,
  }));

describe('expansão de 12 armas automáticas com evoluções reais', () => {
  it('acrescenta 12 às 32 existentes, com IDs e marcos próprios', () => {
    expect(NOVOS_PODERES_IDS).toHaveLength(12);
    expect(HABILIDADES).toHaveLength(44);
    expect(new Set(HABILIDADES.map((h) => h.id)).size).toBe(44);
    expect(HABILIDADES.slice(0, 32).some((h) => NOVOS_PODERES_IDS.some((id) => id === h.id))).toBe(
      false
    );
    for (const id of NOVOS_PODERES_IDS) {
      const h = habilidade(id);
      expect(h.comportamento).toBe('especial');
      expect(h.evolucao5).not.toBe(h.evolucao10);
      expect(h.evolucao5.length).toBeGreaterThan(12);
      expect(h.evolucao10.length).toBeGreaterThan(12);
    }
  });

  it.each(NOVOS_PODERES_IDS)(
    '%s agenda dano espacial válido em 1/5/10 sem timers externos',
    (id) => {
      const timer = vi.spyOn(globalThis, 'setTimeout');
      const formas = new Set<string>();
      for (const nivel of [1, 5, 10]) {
        const s = cenario(id, nivel, grade());
        expect(lancarPoderEspecial(s.ctx)).toBe(true);
        expect(s.atingir).not.toHaveBeenCalled();
        expect(s.fila.length).toBeGreaterThan(0);
        s.drenar();
        expect(s.atingir.mock.calls.length).toBeGreaterThan(0);
        expect(s.atingir.mock.calls.length).toBeLessThanOrEqual(LIMITE_ACERTOS_PODER);
        for (const [a, dano, , dx, dz, forca] of s.atingir.mock.calls) {
          expect(a.vida).toBeGreaterThan(0);
          expect(Number.isFinite(dano) && dano > 0).toBe(true);
          expect([dx, dz, forca].every(Number.isFinite)).toBe(true);
        }
        for (const [p] of s.chicote.mock.calls) {
          expect(p.length / 3).toBeLessThanOrEqual(60);
          expect(p.every(Number.isFinite)).toBe(true);
        }
        expect(s.chicote.mock.calls.length).toBeLessThanOrEqual(LIMITE_FITAS_PODER);
        expect(s.criar.mock.calls.length).toBeLessThanOrEqual(LIMITE_PLANOS_PODER);
        formas.add(JSON.stringify(s.chicote.mock.calls));
      }
      expect(formas.size).toBe(3);
      expect(timer).not.toHaveBeenCalled();
      timer.mockRestore();
    }
  );

  it.each(NOVOS_PODERES_IDS)('%s revalida mortes e deslocamentos antes de cada acerto', (id) => {
    for (const mudar of [
      (a: AlvoEspecial) => {
        a.vida = 0;
      },
      (a: AlvoEspecial) => {
        a.vivo = false;
      },
      (a: AlvoEspecial) => {
        a.x = 1000;
        a.z = 1000;
      },
    ]) {
      const s = cenario(id, 10);
      lancarPoderEspecial(s.ctx);
      mudar(s.ctx.inimigos[0]);
      s.drenar();
      expect(s.atingir).not.toHaveBeenCalled();
    }
  });

  it.each(NOVOS_PODERES_IDS)(
    '%s contém quantidade, tarefas, fitas e acertos com passivas extremas',
    (id) => {
      const s = cenario(id, 10, grade());
      s.ctx.valores.quantidade = 100000;
      s.ctx.valores.area = 100000;
      s.ctx.valores.alcance = 100000;
      s.ctx.valores.duracao = 100000;
      lancarPoderEspecial(s.ctx);
      s.drenar();
      expect(s.tarefas()).toBeLessThanOrEqual(LIMITE_TAREFAS_PODER);
      expect(s.atingir.mock.calls.length).toBeLessThanOrEqual(LIMITE_ACERTOS_PODER);
      expect(s.chicote.mock.calls.length).toBeLessThanOrEqual(LIMITE_FITAS_PODER);
      expect(s.criar.mock.calls.length).toBeLessThanOrEqual(LIMITE_PLANOS_PODER);
    }
  );

  it('portais não causam dano no espaço vazio da travessia entre saída e entrada', () => {
    const entrada = { x: 4, z: 0, vida: 1e8, raio: 0.01 };
    const vao = { x: 4, z: 1.25, vida: 1e8, raio: 0.01 };
    const saida = { x: 4, z: 2.5, vida: 1e8, raio: 0.01 };
    const s = cenario('portalBumerangue', 1, [entrada, vao, saida]);
    lancarPoderEspecial(s.ctx);
    s.drenar();
    const atingidos = s.atingir.mock.calls.map((c) => c[0]);
    expect(atingidos).toContain(entrada);
    expect(atingidos).toContain(saida);
    expect(atingidos).not.toContain(vao);
  });

  it('a serpente corta pelo corpo sinuoso e ignora alvos fora do corredor', () => {
    const frente = { x: 6, z: 0, vida: 1e8, raio: 0.05 };
    const fora = { x: 6, z: 5, vida: 1e8, raio: 0.05 };
    const s = cenario('serpenteEletrica', 1, [frente, fora]);
    lancarPoderEspecial(s.ctx);
    s.drenar();
    const atingidos = s.atingir.mock.calls.map((c) => c[0]);
    expect(atingidos).toContain(frente);
    expect(atingidos).not.toContain(fora);
  });

  it('o olho do furacão fica vazio até a evolução final fechar suas lâminas', () => {
    const s = cenario('furacaoLaminas');
    s.ctx.valores.area = 4;
    // Sem deslocamento do centro: o alvo está exatamente na origem, protegido pelo olho.
    s.ctx.inimigos[0].x = 0;
    lancarPoderEspecial(s.ctx);
    s.drenar();
    expect(s.atingir).not.toHaveBeenCalled();
    const f = cenario('furacaoLaminas', 10);
    f.ctx.valores.area = 4;
    f.ctx.inimigos[0].x = 0;
    lancarPoderEspecial(f.ctx);
    f.drenar();
    expect(f.atingir).toHaveBeenCalled();
  });

  it('a constelação base corta arestas e a evolução 5 também corta o interior', () => {
    const base = cenario('constelacao', 1);
    base.ctx.valores.quantidade = 5;
    lancarPoderEspecial(base.ctx);
    base.drenar();
    expect(base.atingir).not.toHaveBeenCalled();
    const evo = cenario('constelacao', 5);
    evo.ctx.valores.quantidade = 5;
    lancarPoderEspecial(evo.ctx);
    evo.drenar();
    expect(evo.chicote.mock.calls.length).toBeGreaterThan(base.chicote.mock.calls.length);
  });

  it('marionete puxa e sua evolução final rompe os nós com dano de área', () => {
    const s = cenario('marioneteAstral', 10);
    lancarPoderEspecial(s.ctx);
    s.drenar();
    expect(s.atingir.mock.calls.some((c) => c[5] < 0)).toBe(true);
    expect(s.atingir.mock.calls.some((c) => c[5] > 0)).toBe(true);
  });

  it.each(['tremFantasma', 'dadosCaoticos', 'espelhoPrismatico', 'orquestraOrbital'])(
    '%s transforma quantidade extra em mais emissores e colisões reais',
    (id) => {
      const medir = (extra: number) => {
        const s = cenario(id, 1, grade());
        s.ctx.valores.quantidade += extra;
        lancarPoderEspecial(s.ctx);
        s.drenar();
        return {
          fitas: s.chicote.mock.calls.length,
          dano: s.atingir.mock.calls.reduce((n, c) => n + c[1], 0),
        };
      };
      const base = medir(0),
        mais = medir(2);
      expect(mais.fitas).toBeGreaterThan(base.fitas);
      expect(mais.dano).toBeGreaterThan(base.dano);
    }
  );

  it.each(NOVOS_PODERES_IDS)('%s responde à velocidade e acelera sua sequência', (id) => {
    const base = cenario(id),
      rapido = cenario(id);
    base.ctx.valores.velocidade = 10;
    rapido.ctx.valores.velocidade = 20;
    lancarPoderEspecial(base.ctx);
    lancarPoderEspecial(rapido.ctx);
    const ultimo = (s: ReturnType<typeof cenario>) => Math.max(...s.fila.map((f) => f.t));
    expect(ultimo(rapido)).toBeCloseTo(ultimo(base) / 2);
  });

  it('rejeita coordenadas e quantidades inválidas antes de criar tarefas', () => {
    for (const id of NOVOS_PODERES_IDS) {
      const s = cenario(id);
      s.ctx.valores.quantidade = NaN;
      expect(lancarPoderEspecial(s.ctx)).toBe(true);
      expect(s.fila).toHaveLength(0);
      expect(s.chicote).not.toHaveBeenCalled();
    }
  });
});
