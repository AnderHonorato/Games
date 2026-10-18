import { describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { InteracoesMapa, pontosInteracoesMapa } from '../../src/roguelike/jogo/interacoes-mapa';
import { criarArena } from '../../src/roguelike/render/arena';
import { gradienteToon } from '../../src/render/materiais';
import {
  geometriaCristalXp,
  materialCristalXp,
  visualCristalXp,
} from '../../src/roguelike/render/cristais-xp';

describe('vantagens interativas da arena', () => {
  it.each(['jardim', 'forja', 'abismo'] as const)(
    '%s distribui dois de cada tipo em áreas livres',
    (mapa) => {
      const arena = criarArena('baixa', mapa);
      const pontos = pontosInteracoesMapa(mapa, arena.obstaculos);
      expect(pontos).toEqual(pontosInteracoesMapa(mapa, arena.obstaculos));
      expect(new Set(pontos.map((p) => p.id)).size).toBe(6);
      for (const tipo of ['fonte', 'totem', 'cofre'])
        expect(pontos.filter((p) => p.tipo === tipo)).toHaveLength(2);
      for (const p of pontos) {
        expect(Math.hypot(p.x, p.z)).toBeLessThan(84);
        expect(arena.obstaculos.every((o) => Math.hypot(o.x - p.x, o.z - p.z) >= o.r + 3.2)).toBe(
          true
        );
      }
      arena.descartar();
    }
  );

  it('só oferece itens próximos e cada benefício é consumido uma vez até resetar', () => {
    const interacoes = new InteracoesMapa(new THREE.Scene(), 'jardim');
    const fonte = interacoes.listar().find((o) => o.tipo === 'fonte')!;
    expect(interacoes.proxima(0, 0)).toBeNull();
    expect(interacoes.proxima(NaN, 0)).toBeNull();
    expect(interacoes.proxima(fonte.x, fonte.z)?.id).toBe(fonte.id);
    expect(interacoes.usar('id-inexistente')).toBe(false);
    expect(interacoes.usar(fonte.id)).toBe(true);
    expect(interacoes.usar(fonte.id)).toBe(false);
    expect(interacoes.proxima(fonte.x, fonte.z)).toBeNull();
    expect(interacoes.snapshot()).toEqual({ consumidas: [fonte.id] });
    interacoes.reset();
    expect(interacoes.usar(fonte.id)).toBe(true);
    interacoes.descartar();
  });

  it('restaura o uso remoto, ignora IDs desconhecidos e abre o baú consumido', () => {
    const interacoes = new InteracoesMapa(new THREE.Scene(), 'forja');
    const cofre = interacoes.listar().find((o) => o.tipo === 'cofre')!;
    interacoes.importar({ consumidas: [cofre.id, 'desconhecido'] });
    expect(interacoes.snapshot()).toEqual({ consumidas: [cofre.id] });
    expect(interacoes.usar(cofre.id)).toBe(false);
    interacoes.atualizar(0.1);
    const grupo = interacoes.grupo.getObjectByName(cofre.id)!;
    expect(grupo.children.some((c) => c.rotation.x < -1)).toBe(true);
    interacoes.reset();
    expect(interacoes.proxima(cofre.x, cofre.z)?.tipo).toBe('cofre');
    interacoes.descartar();
  });

  it('descarta todos os recursos próprios uma vez, preservando a rampa global', () => {
    const cena = new THREE.Scene(),
      interacoes = new InteracoesMapa(cena, 'abismo');
    const rampa = vi.spyOn(gradienteToon(), 'dispose');
    const recursos = new Set<THREE.Material | THREE.BufferGeometry>();
    interacoes.grupo.traverse((o) => {
      if (o instanceof THREE.Mesh) {
        recursos.add(o.geometry);
        for (const mat of Array.isArray(o.material) ? o.material : [o.material]) recursos.add(mat);
      }
    });
    const spies = [...recursos].map((r) => vi.spyOn(r, 'dispose'));
    interacoes.descartar();
    interacoes.descartar();
    expect(cena.children).not.toContain(interacoes.grupo);
    expect(interacoes.proxima(0, 0)).toBeNull();
    expect(interacoes.usar('abismo:fonte:0')).toBe(false);
    spies.forEach((spy) => expect(spy).toHaveBeenCalledTimes(1));
    expect(rampa).not.toHaveBeenCalled();
    rampa.mockRestore();
  });
});

describe('energia de experiência mágica', () => {
  it('possui quatro silhuetas luminosas próprias, com vértices e cores finitos', () => {
    const contagens: number[] = [];
    for (let tipo = 0; tipo < 4; tipo++) {
      const geo = geometriaCristalXp(tipo),
        mat = materialCristalXp(tipo);
      contagens.push(geo.attributes.position.count);
      expect([...geo.attributes.position.array].every(Number.isFinite)).toBe(true);
      expect([...geo.attributes.color.array].every((v) => v >= 0 && v <= 1)).toBe(true);
      expect(mat.isMeshBasicMaterial).toBe(true);
      expect(mat.vertexColors).toBe(true);
      expect(mat.blending).toBe(THREE.NormalBlending);
      expect(mat.transparent).toBe(true);
      expect(mat.depthWrite).toBe(false);
      expect(mat.toneMapped).toBe(false);
      geo.dispose();
      mat.dispose();
    }
    expect(new Set(contagens).size).toBe(4);
  });

  it('anima energia legível e halos luminosos controlados, mesmo com entradas inválidas', () => {
    let anterior = 0;
    for (let tipo = 0; tipo < 4; tipo++) {
      const v = visualCristalXp(tipo, 20, 0.2);
      expect(v.escalaX).toBeGreaterThan(anterior);
      anterior = v.escalaX;
      for (const tempo of [0, 20, 1e8, Number.MAX_VALUE, NaN, Infinity]) {
        const visual = visualCristalXp(tipo, tempo, NaN);
        expect(
          Object.values(visual)
            .filter((v) => typeof v === 'number')
            .every(Number.isFinite)
        ).toBe(true);
        expect(visual.y).toBeGreaterThan(0.5);
        expect(visual.y).toBeLessThan(1.7);
        expect(visual.haloIntensidade).toBeGreaterThan(0.12);
        expect(visual.haloIntensidade).toBeLessThan(0.35);
        expect(visual.escalaY).toBeLessThan(0.8);
      }
    }
  });
});
