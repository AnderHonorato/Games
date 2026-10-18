import { describe, it, expect, vi } from 'vitest';
import * as T from 'three';
import { EsculturaMoba } from '../../src/moba/geometria';
import { CenarioMoba } from '../../src/moba/cenario';
import { EfeitosMoba } from '../../src/moba/efeitos';
import type { TipoHabilidadeMoba } from '../../src/moba/tipos';

describe('arena MOBA de fantasia', () => {
  it('associa cores e normais a peças indexadas e não indexadas em uma única geometria', () => {
    const caixa = new T.BoxGeometry(),
      bola = new T.IcosahedronGeometry(1, 0),
      e = new EsculturaMoba();
    e.adicionar(caixa, '#ff0000', -2, 0, 0).adicionar(bola, '#00ff00', 2, 0, 0);
    const g = e.finalizar();
    expect(g.index).toBeNull();
    expect(g.getAttribute('color').count).toBe(g.getAttribute('position').count);
    expect(g.getAttribute('normal').count).toBe(g.getAttribute('position').count);
    g.computeBoundingBox();
    expect(g.boundingBox!.min.x).toBeLessThan(-2);
    expect(g.boundingBox!.max.x).toBeGreaterThan(2);
    g.dispose();
    caixa.dispose();
    bola.dispose();
  });
  it('mantém o cenário em poucos lotes e não aloca geometrias ao animar vento e água', () => {
    const c = new CenarioMoba(),
      geometrias = new Set<T.BufferGeometry>(),
      materiais = new Set<T.Material>();
    let meshes = 0;
    c.grupo.traverse((o) => {
      if (o instanceof T.Mesh) {
        meshes++;
        geometrias.add(o.geometry);
        for (const m of Array.isArray(o.material) ? o.material : [o.material]) materiais.add(m);
      }
    });
    expect(meshes).toBeLessThanOrEqual(6);
    const antes = [...geometrias].map((g) => g.uuid);
    for (let i = 0; i < 120; i++) c.atualizar(i / 60);
    const depois = new Set<T.BufferGeometry>();
    c.grupo.traverse((o) => {
      if (o instanceof T.Mesh) depois.add(o.geometry);
    });
    expect([...depois].map((g) => g.uuid)).toEqual(antes);
    const spies = [
      ...[...geometrias].map((g) => vi.spyOn(g, 'dispose')),
      ...[...materiais].map((m) => vi.spyOn(m, 'dispose')),
    ];
    c.descartar();
    c.descartar();
    for (const s of spies) expect(s).toHaveBeenCalledTimes(1);
  });
  it('limita partículas sem crescimento de recursos e representa os 14 comportamentos com formas distintas', () => {
    const fx = new EfeitosMoba(),
      tipos: TipoHabilidadeMoba[] = [
        'projetil',
        'linha',
        'cone',
        'area',
        'cura',
        'escudo',
        'salto',
        'puxao',
        'invocar',
        'raiz',
        'orbita',
        'canal',
        'veneno',
        'troca',
      ];
    const formas = new Set<string>();
    for (const tipo of tipos) {
      fx.iniciar();
      fx.efeito(
        { id: 1, tipo, x: 4, z: 3, x2: 0, z2: 0, raio: 3, cor: '#ff99dd', vida: 0.6, total: 1 },
        2
      );
      fx.finalizar();
      formas.add(
        fx.grupo.children
          .filter((o) => (o as T.InstancedMesh).count > 0)
          .map((o) => (o as T.InstancedMesh).geometry.type)
          .sort()
          .join(',')
      );
    }
    expect(formas.size).toBeGreaterThanOrEqual(9);
    expect(fx.grupo.children).toHaveLength(8);
    fx.iniciar();
    for (let i = 0; i < 2000; i++) fx.emitir('bola', '#ffffff', 0, 0, 0);
    fx.finalizar();
    expect(fx.estatisticas().every((l) => l.usados <= l.capacidade)).toBe(true);
    expect(fx.estatisticas().some((l) => l.usados === 1024)).toBe(true);
    fx.descartar();
    expect(fx.grupo.children).toHaveLength(0);
  });
});
