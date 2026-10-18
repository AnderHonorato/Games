import { describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { Conta, CONTA_CHAVE, normalizarNome } from '../../src/roguelike/nucleo/conta';
import { MAPAS, mapa, mapaDesbloqueado } from '../../src/roguelike/dados/mapas';
import { PERSONAGENS } from '../../src/roguelike/dados/personagens';
import { criarArena, RAIO_ARENA } from '../../src/roguelike/render/arena';
import { gradienteToon } from '../../src/render/materiais';

function memoria(inicial?: string) {
  const dados = new Map<string, string>(inicial ? [[CONTA_CHAVE, inicial]] : []);
  return {
    getItem: (chave: string) => dados.get(chave) ?? null,
    setItem: (chave: string, valor: string) => {
      dados.set(chave, valor);
    },
  };
}

describe('conta permanente e arenas', () => {
  it('mantém XP, nome, arma, mapa e visual após recarregar o perfil', () => {
    const storage = memoria();
    const c = new Conta(storage);
    c.definirNome('  <b>Ana</b> 🌟  ');
    c.ganharXp(200);
    expect(c.selecionarMapa('forja')).toBe(true);
    c.definirArma('martelo');
    c.definirVisual('gpt', { roupa: 'mago', corOlhos: '#f50' });
    const recarregada = new Conta(storage);
    expect(recarregada.dados).toEqual(c.dados);
    expect(recarregada.dados.nome).toBe('Ana 🌟');
    expect(recarregada.visual('gpt').corCorpo).toBe('#19c39c');
    expect(recarregada.visual('gpt').corOlhos).toBe('#ff5500');
  });
  it('desbloqueia exatamente em 200 e 600 sem consumir XP', () => {
    const c = new Conta(null);
    expect(c.selecionarMapa('forja')).toBe(false);
    c.ganharXp(199);
    expect(c.selecionarMapa('forja')).toBe(false);
    c.ganharXp(1);
    expect(c.selecionarMapa('forja')).toBe(true);
    expect(c.selecionarMapa('abismo')).toBe(false);
    c.ganharXp(400);
    expect(c.selecionarMapa('abismo')).toBe(true);
    expect(c.dados.xp).toBe(600);
    expect(c.selecionarMapa('__proto__')).toBe(false);
    expect(MAPAS.map((m) => m.xpNecessario)).toEqual([0, 200, 600, 1200, 2000]);
    expect(mapa('invalido').id).toBe('jardim');
    expect(mapaDesbloqueado('abismo', Infinity)).toBe(false);
  });
  it('tolera saves corrompidos, versões inválidas, XP inválido e storage bloqueado', () => {
    for (const inicial of [
      '{',
      'null',
      '[]',
      '{"versao":2,"xp":9999}',
      '{"versao":1,"xp":1e999,"mapa":"abismo"}',
      '{"versao":1,"xp":-50,"mapa":"forja"}',
    ]) {
      const c = new Conta(memoria(inicial));
      expect(c.dados.xp).toBe(0);
      expect(c.dados.mapa).toBe('jardim');
    }
    const c = new Conta({
      getItem() {
        throw Error('bloqueado');
      },
      setItem() {
        throw Error('bloqueado');
      },
    });
    expect(() => {
      c.ganharXp(20);
      c.definirNome('Ana');
    }).not.toThrow();
    expect(c.dados.xp).toBe(20);
    for (const xp of [NaN, Infinity, -20]) c.ganharXp(xp);
    expect(c.dados.xp).toBe(20);
    c.ganharXp(Number.MAX_VALUE);
    expect(c.dados.xp).toBe(Number.MAX_SAFE_INTEGER);
  });
  it('reconstrói campos permitidos sem copiar propriedades de protótipo', () => {
    const c = new Conta(
      memoria(
        '{"versao":1,"xp":1,"__proto__":{"poluido":true},"visuais":{"__proto__":{"corCorpo":"#000000"},"gpt":{"cabeca":"coroa","corCorpo":"javascript:evil"}}}'
      )
    );
    expect(({} as Record<string, unknown>).poluido).toBeUndefined();
    expect(Object.keys(c.dados.visuais)).toEqual(['gpt']);
    expect(c.visual('gpt').corCorpo).toBe('#19c39c');
    for (const p of PERSONAGENS) expect(c.visual(p.id).corCorpo).toBe(p.cor.toLowerCase());
    const visual = c.visual('claude');
    visual.corCorpo = '#000000';
    expect(c.visual('claude').corCorpo).not.toBe('#000000');
  });
  it('limita nomes por caracteres Unicode, remove HTML e controles', () => {
    expect(normalizarNome('😀'.repeat(24))).toBe('😀'.repeat(20));
    expect(normalizarNome('<img src=x> Olá\u0000   mundo')).toBe('Olá mundo');
    expect(normalizarNome('   ')).toBe('Aventureiro');
    expect(
      normalizarNome({
        toString() {
          throw Error('não chamar');
        },
      })
    ).toBe('Aventureiro');
  });
});

describe.each(MAPAS)('arena $id', ({ id }) => {
  it('tem piso contínuo, obstáculos indexados e recursos liberados uma única vez', () => {
    const a = criarArena('baixa', id);
    a.grupo.updateMatrixWorld(true);
    expect(a.obstaculos.length).toBeGreaterThan(15);
    for (const o of a.obstaculos) {
      expect(a.obstaculosPerto(o.x, o.z)).toContain(o);
      expect(a.obstaculosPerto(o.x + o.r - 0.001, o.z)).toContain(o);
      expect(o.altura).toBeGreaterThan(0);
    }
    const raio = new THREE.Raycaster();
    for (const [x, z] of [
      [0, 0],
      [10, 10],
      [34, -24],
      [-80, 10],
      [0, RAIO_ARENA - 1],
    ]) {
      a.atualizar(0.016, 10, x, z, 0.5);
      raio.set(new THREE.Vector3(x, 0.1, z), new THREE.Vector3(0, -1, 0));
      expect(raio.intersectObject(a.grupo, true).length).toBeGreaterThan(0);
    }
    const geo = new Set<THREE.BufferGeometry>(),
      mat = new Set<THREE.Material>();
    const spyInst: ReturnType<typeof vi.spyOn>[] = [];
    a.grupo.traverse((o) => {
      if (!(o instanceof THREE.Mesh)) return;
      geo.add(o.geometry);
      for (const m of Array.isArray(o.material) ? o.material : [o.material]) mat.add(m);
      if (o.customDepthMaterial) mat.add(o.customDepthMaterial);
      if (o instanceof THREE.InstancedMesh) spyInst.push(vi.spyOn(o, 'dispose'));
    });
    const spies = [...geo]
      .map((g) => vi.spyOn(g, 'dispose'))
      .concat([...mat].map((m) => vi.spyOn(m, 'dispose')));
    const gradiente = vi.spyOn(gradienteToon(), 'dispose');
    a.atualizar(0.016, 10, 0, 0, 0.5);
    a.descartar();
    a.descartar();
    for (const spy of [...spies, ...spyInst]) expect(spy).toHaveBeenCalledTimes(1);
    expect(gradiente).not.toHaveBeenCalled();
    expect(a.grupo.children).toHaveLength(0);
    vi.restoreAllMocks();
  });
  it('usa instâncias e mantém o número de malhas pequeno no celular', () => {
    const a = criarArena('baixa', id);
    let malhas = 0,
      instancias = 0;
    a.grupo.traverse((o) => {
      if (o instanceof THREE.Mesh) malhas++;
      if (o instanceof THREE.InstancedMesh) instancias++;
    });
    expect(a.infinito).toBe(true);
    expect(a.regioesAtivas()).toHaveLength(9);
    expect(instancias).toBeGreaterThan(4);
    expect(malhas).toBeLessThan(20);
    a.descartar();
  });
});
