import { describe, expect, it, vi } from 'vitest';
import { HABILIDADES } from '../../src/roguelike/dados/habilidades';
import { desenharAssinatura, manifestarPoder } from '../../src/roguelike/fx/assinaturas';
import type { SistemaFx } from '../../src/roguelike/fx/indice';
import { SOM_POR_PODER, SONS_PODERES } from '../../src/audio/catalogo-poderes';
import { SONS, type ApiAudio } from '../../src/audio/contrato';
import { DEFINICOES_SONS } from '../../src/audio/sons';
import { DEFINICOES_SONS_PODERES, tocarSomPoder } from '../../src/audio/poderes';
import type { Kit } from '../../src/audio/sintese';
import { valoresHabilidade, ATRIBUTOS_BASE } from '../../src/roguelike/nucleo/progresso';

interface Emissao {
  tipo: string;
  tempo: number;
  opcoes: Record<string, unknown>;
}
function capturar(id: keyof typeof DEFINICOES_SONS_PODERES): Emissao[] {
  const emissoes: Emissao[] = [];
  const adicionar =
    (tipo: string) => (_dest: unknown, tempo: number, opcoes: Record<string, unknown>) => {
      emissoes.push({ tipo, tempo, opcoes });
      return tempo;
    };
  const k = {
    osc: adicionar('osc'),
    fm: adicionar('fm'),
    ruido: adicionar('ruido'),
    sino: (_dest: unknown, tempo: number, f: number, parciais: unknown, pico: number) => {
      emissoes.push({ tipo: 'sino', tempo, opcoes: { f, parciais, pico } });
      return tempo;
    },
  } as unknown as Kit;
  DEFINICOES_SONS_PODERES[id].tocar(k, {} as AudioNode, 0, 1, {}, { falas: new Map() });
  return emissoes;
}
function numerosFinitos(valor: unknown): void {
  if (typeof valor === 'number') expect(Number.isFinite(valor)).toBe(true);
  else if (Array.isArray(valor)) valor.forEach(numerosFinitos);
  else if (valor && typeof valor === 'object') Object.values(valor).forEach(numerosFinitos);
}

describe('assinaturas próprias das 28 habilidades', () => {
  it('cobre exatamente o catálogo e produz geometrias distintas, finitas e limitadas', () => {
    expect(HABILIDADES).toHaveLength(28);
    const identidades = new Set<string>();
    for (const h of HABILIDADES) {
      for (const nivel of [1, 5, 9, 10]) {
        const a = desenharAssinatura(h.id, nivel)!;
        expect(a, h.id).not.toBeNull();
        expect(a.trilhas.length).toBeGreaterThan(0);
        expect(a.trilhas.length).toBeLessThanOrEqual(12);
        for (const p of a.trilhas) {
          expect(p.length % 3).toBe(0);
          expect(p.length / 3).toBeGreaterThanOrEqual(2);
          expect(p.length / 3).toBeLessThanOrEqual(60);
        }
        numerosFinitos(a);
        if (nivel === 1) identidades.add(JSON.stringify(a.trilhas));
      }
    }
    expect(identidades.size).toBe(28);
    expect(desenharAssinatura('desconhecido')).toBeNull();
  });

  it('a evolução final amplia a silhueta e espessura e prolonga sua leitura', () => {
    for (const h of HABILIDADES) {
      const normal = desenharAssinatura(h.id, 1)!;
      const suprema = desenharAssinatura(h.id, 10)!;
      expect(suprema.escala).toBe(1.8);
      expect(suprema.espessura).toBe(normal.espessura * 2);
      expect(suprema.duracao).toBeGreaterThan(normal.duracao);
      suprema.trilhas.forEach((p, i) =>
        p.forEach((v, j) => expect(v).toBeCloseTo(normal.trilhas[i][j] * 1.8))
      );
    }
  });

  it('transforma as trilhas para o mundo sem emissões por quadro ou clarão global', () => {
    const chicote = vi.fn();
    const criar = vi.fn();
    const pulso = vi.fn();
    const fx = { raios: { chicote }, planos: { criar }, pulso } as unknown as SistemaFx;
    manifestarPoder(fx, 'breakpoint', 5, 7, 10, Math.PI / 2);
    const local = desenharAssinatura('breakpoint', 10)!;
    expect(chicote).toHaveBeenCalledTimes(local.trilhas.length);
    const mundo = chicote.mock.calls[0][0] as number[];
    expect(mundo[0]).toBeCloseTo(5 - local.trilhas[0][2]);
    expect(mundo[2]).toBeCloseTo(7 + local.trilhas[0][0]);
    expect(criar).toHaveBeenCalledWith(expect.objectContaining({ entrada: 0.35, alfa: 0.22 }));
    expect(pulso).not.toHaveBeenCalled();
    chicote.mockClear();
    manifestarPoder(fx, 'bolaFogo', NaN, 7);
    expect(chicote).not.toHaveBeenCalled();
  });
});

describe('catálogo sonoro de poderes', () => {
  it('registra 28 receitas alcançáveis sem colisão no contrato de áudio', () => {
    expect(Object.keys(SOM_POR_PODER).sort()).toEqual(HABILIDADES.map((h) => h.id).sort());
    expect(new Set(SONS_PODERES).size).toBe(28);
    expect(new Set(SONS).size).toBe(SONS.length);
    for (const id of SONS_PODERES) expect(DEFINICOES_SONS[id]).toBe(DEFINICOES_SONS_PODERES[id]);
  });

  it('emite receitas válidas e únicas mesmo desconsiderando alturas de notas', () => {
    const estruturas = new Set<string>();
    for (const id of SONS_PODERES) {
      const lista = capturar(id);
      expect(lista.length, id).toBeGreaterThan(1);
      expect(lista.length, id).toBeLessThanOrEqual(20);
      numerosFinitos(lista);
      for (const e of lista) {
        expect(e.tempo).toBeGreaterThanOrEqual(0);
        const env = e.opcoes.env as { a: number; d: number; p: number } | undefined;
        if (env) {
          expect(env.a).toBeGreaterThan(0);
          expect(env.d).toBeGreaterThan(0);
          expect(env.p).toBeGreaterThan(0);
          expect(env.p).toBeLessThanOrEqual(1);
        }
      }
      // Mantém ritmo, envelopes, formas de onda e quantidade de emissores; exclui f/dev.
      estruturas.add(
        JSON.stringify(
          lista.map((e) => ({
            tipo: e.tipo,
            tempo: e.tempo,
            env: e.opcoes.env,
            onda: e.opcoes.tipo,
            cor: e.opcoes.cor,
            parciais: e.opcoes.parciais,
          }))
        )
      );
      const meta = DEFINICOES_SONS_PODERES[id].meta;
      expect(meta.n).toBeLessThanOrEqual(2);
      expect(meta.i).toBeGreaterThanOrEqual(0.12);
    }
    expect(estruturas.size).toBe(28);
  });

  it('toca no disparo, usa posição, reforça o nível 10 e ignora ids desconhecidos', () => {
    const tocar = vi.fn();
    const audio = { tocar } as unknown as ApiAudio;
    tocarSomPoder(audio, 'bolaFogo', 2, 3, 1);
    expect(tocar).toHaveBeenLastCalledWith(
      'poderBolaFogo',
      expect.objectContaining({ x: 2, y: 3, tom: 1 })
    );
    tocarSomPoder(audio, 'bolaFogo', 2, 3, 10);
    expect(tocar).toHaveBeenCalledWith('energizar', expect.objectContaining({ tom: 0.65 }));
    expect(tocar).toHaveBeenCalledTimes(3);
    tocarSomPoder(audio, 'inexistente', 0, 0);
    tocarSomPoder(audio, 'bolaFogo', Infinity, 0);
    expect(tocar).toHaveBeenCalledTimes(3);
  });
});

describe('ruptura suprema na progressão', () => {
  it('preserva níveis 1 a 9, incluindo as evoluções elementais existentes', () => {
    for (const h of HABILIDADES)
      for (let n = 1; n <= 9; n++) {
        const v = valoresHabilidade(h, n);
        expect(v.dano).toBeCloseTo(h.base.dano * (1 + 0.16 * (n - 1)) * (n >= 5 ? 1.15 : 1));
        expect(v.area).toBeCloseTo(h.base.area * (1 + 0.05 * (n - 1)));
        expect(v.recarga).toBeCloseTo(h.base.recarga * 0.955 ** (n - 1));
        expect(v.quantidade).toBe(
          h.base.quantidade + h.maisQuantidade.filter((l) => l <= n).length
        );
        expect(v.evo5).toBe(n >= 5);
        expect(v.evo10).toBe(false);
      }
  });
  it('nível 10 tem dano 2.5x, área 1.5x, recarga menor e duas unidades extras', () => {
    for (const h of HABILIDADES) {
      const a = valoresHabilidade(h, 9);
      const b = valoresHabilidade(h, 10);
      expect(b.dano).toBeCloseTo(a.dano * 2.5);
      expect(b.area).toBeCloseTo(a.area * 1.5);
      expect(b.recarga).toBeCloseTo(a.recarga * 0.65);
      expect(b.quantidade - a.quantidade).toBeGreaterThanOrEqual(2);
      expect(b.duracao).toBeGreaterThan(a.duracao);
      expect(b.evo5 && b.evo10).toBe(true);
      numerosFinitos(b);
    }
  });
  it('clampa entradas de nível inválidas e respeita multiplicadores de atributos', () => {
    for (const h of HABILIDADES) {
      expect(valoresHabilidade(h, NaN)).toEqual(valoresHabilidade(h, 1));
      expect(valoresHabilidade(h, -Infinity)).toEqual(valoresHabilidade(h, 1));
      expect(valoresHabilidade(h, Infinity)).toEqual(valoresHabilidade(h, 10));
      expect(valoresHabilidade(h, 99)).toEqual(valoresHabilidade(h, 10));
      expect(valoresHabilidade(h, 4.9)).toEqual(valoresHabilidade(h, 4));
      const normal = valoresHabilidade(h, 10);
      const forte = valoresHabilidade(h, 10, { ...ATRIBUTOS_BASE, dano: 2, area: 2, recarga: 0.5 });
      expect(forte.dano).toBeCloseTo(normal.dano * 2);
      expect(forte.area).toBeCloseTo(normal.area * 2);
      expect(forte.recarga).toBeCloseTo(normal.recarga * 0.5);
    }
  });
});
