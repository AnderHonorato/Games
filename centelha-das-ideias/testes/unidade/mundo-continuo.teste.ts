import { describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import {
  coordenadaRegiao,
  gerarRegiao,
  LIMITE_REGIOES,
  MundoContinuo,
} from '../../src/roguelike/mundo-continuo/geracao-mundo';
import { MAPAS } from '../../src/roguelike/dados/mapas';
import { criarArena } from '../../src/roguelike/render/arena';

describe('mundo contínuo determinístico', () => {
  it('endereça corretamente as bordas de regiões e coordenadas negativas', () => {
    expect([-64.1, -64, -32.01, -32, -0.01, 0, 31.99, 32].map(coordenadaRegiao)).toEqual([
      -3, -2, -2, -1, -1, 0, 0, 1,
    ]);
    expect(coordenadaRegiao(NaN)).toBe(0);
    expect(coordenadaRegiao(Infinity)).toBe(0);
  });
  it('regenera exatamente obstáculos, alturas e interações ao revisitar', () => {
    const m = new MundoContinuo('alta', 'jardim');
    m.atualizar([{ x: -9, z: -7 }], 49);
    const inicial = JSON.stringify(m.regioes.get('-1,-1'));
    m.atualizar([{ x: 10000, z: -10000 }], 49);
    expect(m.regioes.has('-1,-1')).toBe(false);
    m.atualizar([{ x: -9, z: -7 }], 49);
    expect(JSON.stringify(m.regioes.get('-1,-1'))).toBe(inicial);
    expect(gerarRegiao(-1, -1, 'jardim')).not.toEqual(gerarRegiao(-1, -1, 'aurora'));
  });
  it('mantém memória limitada durante 10km de viagem e co-op distante', () => {
    const m = new MundoContinuo('alta', 'coral');
    for (let x = 0; x <= 10000; x += 32) {
      m.atualizar(
        [
          { x, z: -x },
          { x: -x, z: x },
          { x: x + 800, z: x },
        ],
        49
      );
      expect(m.regioes.size).toBeLessThanOrEqual(LIMITE_REGIOES);
      for (const r of m.regioes.values())
        for (const o of r.obstaculos) {
          expect([o.x, o.z, o.r, o.altura].every(Number.isFinite)).toBe(true);
        }
    }
    expect(m.regioes.size).toBe(49);
    expect(m.regioes.has('312,-313')).toBe(true);
    m.limpar();
    expect(m.regioes.size).toBe(0);
  });
  it('carrega poucos detalhes por quadro e mantém todos os centros prontos', () => {
    const m = new MundoContinuo('alta', 'abismo');
    m.atualizar([
      { x: 0, z: 0 },
      { x: 3200, z: -3200 },
    ]);
    expect(m.regioes.has('0,0')).toBe(true);
    expect(m.regioes.has('100,-100')).toBe(true);
    expect(m.regioes.size).toBeLessThanOrEqual(5);
    for (let i = 0; i < 20; i++)
      m.atualizar([
        { x: 0, z: 0 },
        { x: 3200, z: -3200 },
      ]);
    expect(m.regioes.size).toBe(49);
  });
  it('fornece marcos únicos alcançáveis e estáveis em cada bioma', () => {
    expect(MAPAS.map((m) => m.id)).toEqual(['jardim', 'forja', 'abismo', 'aurora', 'coral']);
    expect(MAPAS.map((m) => m.proximo)).toEqual(['forja', 'abismo', 'aurora', 'coral', null]);
    for (const { id } of MAPAS)
      for (let x = -3; x <= 3; x++) {
        const r = gerarRegiao(x, -2, id);
        expect(r.bioma).toBe(id);
        for (const p of r.pontos) {
          expect(p.id).toContain(r.chave);
          for (const o of r.obstaculos)
            expect(Math.hypot(p.x - o.x, p.z - o.z)).toBeGreaterThan(o.r + 3.9);
        }
      }
  });
  it.each(MAPAS)('reutiliza recursos em $id e libera apenas no descarte final', ({ id }) => {
    const a = criarArena('alta', id);
    const recursos = a.estadoMundo().recursos;
    const geos = new Set<THREE.BufferGeometry>(),
      mats = new Set<THREE.Material>();
    a.grupo.traverse((o) => {
      if (!(o instanceof THREE.Mesh)) return;
      geos.add(o.geometry);
      for (const m of Array.isArray(o.material) ? o.material : [o.material]) mats.add(m);
    });
    const spies = [...geos]
      .map((g) => vi.spyOn(g, 'dispose'))
      .concat([...mats].map((m) => vi.spyOn(m, 'dispose')));
    for (let x = 0; x <= 10000; x += 320) {
      a.atualizar(0.016, x, x, -x, 0.5, [{ x: -x, z: x }]);
      expect(a.estadoMundo().recursos).toBe(recursos);
      expect(a.estadoMundo().regioes).toBeLessThanOrEqual(49);
      for (const o of a.obstaculos) expect(a.obstaculosPerto(o.x + o.r - 0.001, o.z)).toContain(o);
    }
    for (const spy of spies) expect(spy).not.toHaveBeenCalled();
    a.descartar();
    a.descartar();
    for (const spy of spies) expect(spy).toHaveBeenCalledTimes(1);
    expect(a.estadoMundo()).toMatchObject({ regioes: 0, obstaculos: 0, recursos: 0 });
  });
});
