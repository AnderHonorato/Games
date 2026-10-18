import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { ModeloClaude, type EstadoAnimacao } from '../../src/render/modelo-claude';
import { normalizarPersonalizacao } from '../../src/render/personalizacao';
import { PERSONAGENS } from '../../src/roguelike/dados/personagens';
import { ARMAS_INICIAIS, armaInicialValida } from '../../src/roguelike/dados/armas-iniciais';
import { criarArmaInicial, descartarArmaInicial } from '../../src/roguelike/render/arma-inicial';
import { ARMAS_INICIAIS as ARMAS_ATELIE, criarAtelie } from '../../src/roguelike/ui-personalizacao';
import { Conta } from '../../src/roguelike/nucleo/conta';
import { HABILIDADES, PODERES_FOFOS_IDS, habilidade } from '../../src/roguelike/dados/habilidades';
import { valoresHabilidade } from '../../src/roguelike/nucleo/progresso';
import {
  lancarPoderEspecial,
  LIMITE_ACERTOS_PODER,
  LIMITE_TAREFAS_PODER,
  LIMITE_FITAS_PODER,
  LIMITE_PLANOS_PODER,
  type AlvoEspecial,
  type ContextoPoderEspecial,
} from '../../src/roguelike/jogo/poderes-especiais';
import type { Partida } from '../../src/roguelike/jogo/partida';
import type { SistemaFx } from '../../src/roguelike/fx/indice';

const parado: EstadoAnimacao = {
  velocidade: 0,
  noChao: true,
  vy: 0,
  angulo: 0,
  golpe: -1,
  anguloGolpe: 0,
  esquiva: -1,
  ferido: 0,
  humor: 'neutro',
  escondido: false,
  defendendo: false,
  falando: false,
  conjurando: 0,
};

class ElementoFake {
  children: ElementoFake[] = [];
  value = '';
  textContent = '';
  atributos: Record<string, string> = {};
  eventos: Record<string, () => void> = {};
  constructor(readonly tag: string) {}
  append(...filhos: ElementoFake[]) {
    this.children.push(...filhos);
  }
  setAttribute(nome: string, valor: string) {
    this.atributos[nome] = valor;
  }
  addEventListener(nome: string, fn: () => void) {
    this.eventos[nome] = fn;
  }
  getContext() {
    return new Proxy(
      {},
      {
        get: (_, chave) =>
          chave === 'createRadialGradient' ? () => ({ addColorStop() {} }) : () => {},
        set: () => true,
      }
    );
  }
}
beforeEach(() =>
  vi.stubGlobal('document', {
    createElement: (tag: string) => new ElementoFake(tag),
    createTextNode: (texto: string) =>
      Object.assign(new ElementoFake('text'), { textContent: texto }),
  })
);
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('ateliê com modelos e escolhas persistentes', () => {
  it('normaliza e persiste seis roupas, seis cabeças, seis acessórios e sete armas', () => {
    const roupas = ['aventureiro', 'mago', 'guardiao', 'pirata', 'astronauta', 'floral'] as const;
    const cabecas = ['nenhum', 'bone', 'capuz', 'coroa', 'orelhas', 'chapeu'] as const;
    const acessorios = ['nenhum', 'oculos', 'cachecol', 'asas', 'mochila', 'laco'] as const;
    let json: string | null = null;
    const storage = {
      getItem: () => json,
      setItem: (_: string, valor: string) => {
        json = valor;
      },
    };
    for (let i = 0; i < roupas.length; i++) {
      const p = { roupa: roupas[i], cabeca: cabecas[i], acessorio: acessorios[i] };
      expect(normalizarPersonalizacao(JSON.parse(JSON.stringify(p)))).toMatchObject(p);
      const conta = new Conta(storage);
      conta.definirVisual('claude', p);
      expect(new Conta(storage).visual('claude')).toMatchObject(p);
    }
    for (const arma of ARMAS_INICIAIS) {
      const conta = new Conta(storage);
      conta.definirArma(arma.id);
      expect(new Conta(storage).dados.armaInicial).toBe(arma.id);
    }
    expect(armaInicialValida('__proto__')).toBe(false);
    expect(armaInicialValida('machado')).toBe(false);
    expect(armaInicialValida(null)).toBe(false);
  });

  it('conecta todas as opções novas do ateliê a uma atualização real e usa o catálogo único de armas', () => {
    const personalizar = vi.fn(),
      mudou = vi.fn();
    const conta = new Conta(null);
    const raiz = criarAtelie(
      { conta, personagemId: 'claude', personalizar } as unknown as Partida,
      mudou
    ) as unknown as ElementoFake;
    const selects = raiz.children[0].children.map((label) => label.children[0]);
    for (const [i, chave, escolhas] of [
      [0, 'roupa', ['pirata', 'astronauta', 'floral']],
      [1, 'cabeca', ['orelhas', 'chapeu']],
      [2, 'acessorio', ['mochila', 'laco']],
    ] as const) {
      for (const escolha of escolhas) {
        const select = selects[i];
        expect(select.children.some((option) => option.value === escolha)).toBe(true);
        select.value = escolha;
        select.eventos.change();
        expect(personalizar).toHaveBeenLastCalledWith({ [chave]: escolha });
      }
    }
    expect(mudou).toHaveBeenCalledTimes(7);
    expect(ARMAS_ATELIE).toBe(ARMAS_INICIAIS);
  });

  it('dá volume próprio aos novos trajes e peças sem crescer a cada troca', () => {
    const modelo = new ModeloClaude(PERSONAGENS[0].aparencia);
    for (const [roupa, parte] of [
      ['pirata', 'lapela-pirata'],
      ['astronauta', 'painel-astronauta'],
      ['floral', 'saia-floral'],
    ] as const) {
      modelo.personalizar({ roupa });
      expect(modelo.raiz.getObjectByName(parte)).toBeDefined();
    }
    for (const [chave, valor, parte] of [
      ['cabeca', 'orelhas', 'orelha-de-coelho'],
      ['cabeca', 'chapeu', 'aba-chapeu-sol'],
      ['acessorio', 'mochila', 'mochila'],
      ['acessorio', 'laco', 'laco-de-fita'],
    ] as const) {
      modelo.personalizar({ [chave]: valor });
      expect(modelo.raiz.getObjectByName(parte)).toBeDefined();
    }
    const contagem = () => {
      let n = 0;
      modelo.raiz.traverse(() => n++);
      return n;
    };
    modelo.personalizar({ roupa: 'astronauta', cabeca: 'orelhas', acessorio: 'mochila' });
    const antes = contagem();
    for (let i = 0; i < 12; i++) modelo.personalizar({ corRoupa: i % 2 ? '#abcdef' : '#123456' });
    expect(contagem()).toBe(antes);
    modelo.descartar();
  });

  it('reforça o rosto das onze identidades com uma única instância de bochechas e libera seus buffers', () => {
    expect(PERSONAGENS).toHaveLength(11);
    for (const p of PERSONAGENS) {
      const modelo = new ModeloClaude(p.aparencia);
      const bochechas = modelo.raiz.getObjectByName('bochechas-fofas') as THREE.InstancedMesh;
      expect(bochechas).toBeInstanceOf(THREE.InstancedMesh);
      expect(bochechas.count).toBe(2);
      const liberar = vi.spyOn(bochechas, 'dispose');
      const material = bochechas.material as THREE.MeshBasicMaterial;
      modelo.atualizar(0.2, { ...parado, humor: 'carinho' });
      expect(material.opacity).toBeGreaterThan(0.42);
      modelo.descartar();
      modelo.descartar();
      expect(liberar).toHaveBeenCalledOnce();
    }
    const aventura = new ModeloClaude();
    expect(aventura.raiz.getObjectByName('bochechas-fofas')).toBeUndefined();
    aventura.descartar();
  });
});

describe('sete armas equipadas', () => {
  it('possui silhuetas e relações de estatísticas diferentes, com descarte idempotente', () => {
    expect(ARMAS_INICIAIS).toHaveLength(7);
    const formas = new Set<string>(),
      atributos = new Set<string>();
    for (const arma of ARMAS_INICIAIS) {
      atributos.add(JSON.stringify([arma.dano, arma.alcance, arma.recarga, arma.raio, arma.forca]));
      const modelo = criarArmaInicial(arma.id);
      expect(modelo.name).toBe(`arma-${arma.id}`);
      const geos = new Set<THREE.BufferGeometry>(),
        mats = new Set<THREE.Material>();
      const partes: string[] = [];
      modelo.traverse((o) => {
        if (o instanceof THREE.Mesh) {
          geos.add(o.geometry);
          for (const mat of Array.isArray(o.material) ? o.material : [o.material]) mats.add(mat);
          partes.push(JSON.stringify([o.geometry.type, o.geometry.toJSON(), o.position.toArray()]));
        }
      });
      formas.add(JSON.stringify(partes));
      expect(geos.size).toBeGreaterThanOrEqual(4);
      expect(geos.size).toBeLessThanOrEqual(10);
      const descartar = [...geos, ...mats].map((r) => vi.spyOn(r, 'dispose'));
      descartarArmaInicial(modelo);
      descartarArmaInicial(modelo);
      for (const spy of descartar) expect(spy).toHaveBeenCalledOnce();
      expect(modelo.children).toHaveLength(0);
    }
    expect(formas.size).toBe(7);
    expect(atributos.size).toBe(7);
  });
});

const grade = (): AlvoEspecial[] =>
  Array.from({ length: 625 }, (_, i) => ({
    x: (i % 25) - 12,
    z: Math.floor(i / 25) - 12,
    vida: 1e8,
    raio: 0.1,
  }));
function cenario(id: string, nivel: number, inimigos = grade()) {
  const fila: { t: number; fn: () => void }[] = [];
  const atingir = vi.fn(),
    chicote = vi.fn(),
    criar = vi.fn();
  let tarefas = 0,
    tempo = 0;
  const ctx: ContextoPoderEspecial<AlvoEspecial> = {
    id,
    nivel,
    valores: valoresHabilidade(habilidade(id), nivel),
    x: 0,
    z: 0,
    angulo: 0,
    inimigos,
    rnd: () => 0.25,
    agendar: (fn, t) => {
      tarefas++;
      fila.push({ fn, t: tempo + t });
    },
    atingir,
    fx: { raios: { chicote }, planos: { criar } } as unknown as SistemaFx,
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
  return { ctx, fila, atingir, chicote, criar, drenar, tarefas: () => tarefas };
}

describe('seis poderes delicados com mecânicas próprias', () => {
  it('completa cinquenta habilidades preservando os 44 IDs anteriores', () => {
    expect(PODERES_FOFOS_IDS).toHaveLength(6);
    expect(HABILIDADES).toHaveLength(50);
    expect(HABILIDADES.slice(0, 44).some((h) => PODERES_FOFOS_IDS.some((id) => id === h.id))).toBe(
      false
    );
    expect(new Set(PODERES_FOFOS_IDS.map((id) => habilidade(id).comportamento)).size).toBe(6);
  });
  it.each(PODERES_FOFOS_IDS)(
    '%s evolui a sequência real em 5/10, limita custos e não usa temporizadores externos',
    (id) => {
      const timer = vi.spyOn(globalThis, 'setTimeout');
      const desenhos = new Set<string>();
      for (const nivel of [1, 5, 10]) {
        const s = cenario(id, nivel);
        expect(lancarPoderEspecial(s.ctx)).toBe(true);
        expect(s.atingir).not.toHaveBeenCalled();
        s.drenar();
        expect(s.atingir).toHaveBeenCalled();
        expect(s.atingir.mock.calls.length).toBeLessThanOrEqual(LIMITE_ACERTOS_PODER);
        expect(s.tarefas()).toBeLessThanOrEqual(LIMITE_TAREFAS_PODER);
        expect(s.chicote.mock.calls.length).toBeLessThanOrEqual(LIMITE_FITAS_PODER);
        expect(s.criar.mock.calls.length).toBeLessThanOrEqual(LIMITE_PLANOS_PODER);
        for (const [, dano, , dx, dz, forca] of s.atingir.mock.calls)
          expect(dano > 0 && [dano, dx, dz, forca].every(Number.isFinite)).toBe(true);
        desenhos.add(JSON.stringify({ fitas: s.chicote.mock.calls, planos: s.criar.mock.calls }));
      }
      expect(desenhos.size).toBe(3);
      expect(timer).not.toHaveBeenCalled();
    }
  );
  it.each(PODERES_FOFOS_IDS)(
    '%s ignora mortes e alvos que saíram do alcance antes do efeito',
    (id) => {
      for (const morto of [true, false]) {
        const s = cenario(id, 10, [{ x: 3, z: 0, vida: 1000, raio: 0.1 }]);
        lancarPoderEspecial(s.ctx);
        if (morto) s.ctx.inimigos[0].vida = 0;
        else {
          s.ctx.inimigos[0].x = 1000;
          s.ctx.inimigos[0].z = 1000;
        }
        s.drenar();
        expect(s.atingir).not.toHaveBeenCalled();
      }
    }
  );
  it.each(PODERES_FOFOS_IDS)('%s contém passivas extremas', (id) => {
    const s = cenario(id, 10);
    Object.assign(s.ctx.valores, { quantidade: 1e6, area: 1e6, alcance: 1e6, duracao: 1e6 });
    lancarPoderEspecial(s.ctx);
    s.drenar();
    expect(s.tarefas()).toBeLessThanOrEqual(LIMITE_TAREFAS_PODER);
    expect(s.atingir.mock.calls.length).toBeLessThanOrEqual(LIMITE_ACERTOS_PODER);
    expect(s.chicote.mock.calls.length).toBeLessThanOrEqual(LIMITE_FITAS_PODER);
    expect(s.criar.mock.calls.length).toBeLessThanOrEqual(LIMITE_PLANOS_PODER);
  });
});
