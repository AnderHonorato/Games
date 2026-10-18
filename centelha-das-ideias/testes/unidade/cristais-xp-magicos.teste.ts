import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import {
  CORES_CRISTAIS_XP,
  geometriaCristalXp,
  geometriaFaiscaXp,
  materialCristalXp,
  materialFaiscaXp,
  visualCristalXp,
} from '../../src/roguelike/render/cristais-xp';

describe('motes mágicos de experiência', () => {
  it('oferece quatro silhuetas finitas e limitadas para lotes de milhares de motes', () => {
    const silhuetas = new Set<string>();
    for (let tipo = 0; tipo < 4; tipo++) {
      const geo = geometriaCristalXp(tipo);
      const pos = geo.getAttribute('position');
      const cor = geo.getAttribute('color');
      expect(pos.count % 3).toBe(0);
      expect(pos.count).toBeGreaterThan(30);
      expect(pos.count).toBeLessThanOrEqual(1200);
      expect(cor.count).toBe(pos.count);
      for (const valor of pos.array) expect(Number.isFinite(valor)).toBe(true);
      for (const valor of cor.array) {
        expect(Number.isFinite(valor)).toBe(true);
        expect(valor).toBeGreaterThan(0);
        expect(valor).toBeLessThan(1);
      }
      expect(geo.boundingSphere!.radius).toBeLessThan(1.6);
      expect(Math.min(...Array.from(cor.array))).toBeLessThan(0.03);
      expect(Math.max(...Array.from(cor.array))).toBeGreaterThan(0.9);
      expect(geo.boundingBox!.max.y).toBeGreaterThan(0.5);
      expect(geo.boundingBox!.min.y).toBeLessThan(-0.5);
      silhuetas.add(JSON.stringify(Array.from(pos.array)));
      geo.dispose();
    }
    expect(silhuetas.size).toBe(4);
  });

  it('mantém luz própria colorida independente da iluminação da cena, sem escrita de profundidade', () => {
    for (let tipo = 0; tipo < 4; tipo++) {
      const material = materialCristalXp(tipo);
      expect(material.isMeshBasicMaterial).toBe(true);
      expect(material.vertexColors).toBe(true);
      expect(material.toneMapped).toBe(false);
      expect(material.transparent).toBe(true);
      expect(material.depthWrite).toBe(false);
      expect(material.blending).toBe(THREE.NormalBlending);
      expect(material.opacity).toBeGreaterThan(0.5);
      expect(material.opacity).toBeLessThan(1);
      const core = new THREE.Color(CORES_CRISTAIS_XP[tipo]);
      expect(Math.max(core.r, core.b)).toBeGreaterThan(core.g);
      expect(visualCristalXp(tipo, 0, 0).cor).toBe(CORES_CRISTAIS_XP[tipo]);
      material.dispose();
    }
  });

  it('flutua com brilho pulsante e órbita finita, mantendo o desenho acima do chão', () => {
    for (let tipo = 0; tipo < 4; tipo++) {
      const geo = geometriaCristalXp(tipo);
      const alturas = new Set<number>();
      const intensidades = new Set<number>();
      const scratch = visualCristalXp(tipo, 0, 0);
      for (const tempo of [0, 0.2, 1, 2, 100000, NaN, Infinity, -Infinity]) {
        for (const fase of [0, 0.7, 999999, NaN, Infinity]) {
          const v = visualCristalXp(tipo, tempo, fase, scratch);
          expect(v).toBe(scratch);
          for (const valor of Object.values(v)) {
            if (typeof valor === 'number') expect(Number.isFinite(valor)).toBe(true);
          }
          expect(v.y + geo.boundingBox!.min.y * v.escalaY).toBeGreaterThan(0.25);
          expect(v.halo).toBeGreaterThan(0.8);
          expect(v.halo).toBeLessThan(2.4);
          expect(v.haloIntensidade).toBeGreaterThan(0.1);
          expect(v.haloIntensidade).toBeLessThan(0.35);
          expect(v.faiscaEscala).toBeGreaterThan(0);
          expect(v.faiscaEscala).toBeLessThan(0.1);
          expect(Math.hypot(v.faiscaX, v.faiscaZ)).toBeLessThan(1);
          alturas.add(v.y);
          intensidades.add(v.haloIntensidade);
        }
      }
      expect(alturas.size).toBeGreaterThan(3);
      expect(intensidades.size).toBeGreaterThan(3);
      geo.dispose();
    }
  });

  it('trata tipos inválidos e fornece faíscas baratas sem materiais ou geometria compartilhados', () => {
    const fallback = geometriaCristalXp(0);
    for (const tipo of [NaN, Infinity, -1]) {
      const geo = geometriaCristalXp(tipo);
      expect(Array.from(geo.getAttribute('position').array)).toEqual(
        Array.from(fallback.getAttribute('position').array)
      );
      expect(geo).not.toBe(fallback);
      geo.dispose();
    }
    const estrela = geometriaFaiscaXp();
    expect(estrela.getAttribute('position').count).toBeLessThan(60);
    for (const valor of estrela.getAttribute('position').array)
      expect(Number.isFinite(valor)).toBe(true);
    const material = materialFaiscaXp();
    expect(material.isMeshBasicMaterial).toBe(true);
    expect(material.depthWrite).toBe(false);
    expect(material.vertexColors).toBe(true);
    material.dispose();
    estrela.dispose();
    fallback.dispose();
  });
});
