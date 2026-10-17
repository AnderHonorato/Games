import { describe, expect, it } from 'vitest';
import { HABILIDADES } from '../../src/roguelike/dados/habilidades';
import { ATRIBUTOS_BASE, valoresHabilidade } from '../../src/roguelike/nucleo/progresso';
import {
  MAX_ORBES_POR_ANEL,
  perfilOrbita,
  posicaoOrbital,
} from '../../src/roguelike/nucleo/orbitas';

const orbitais = HABILIDADES.filter((h) => h.comportamento === 'orbita');

describe('órbitas cumulativas', () => {
  it.each(orbitais)('$id cresce em raio, giro e número em todos os níveis 1..10', (def) => {
    for (let nivel = 1; nivel < 10; nivel++) {
      const a = perfilOrbita(def, nivel);
      const b = perfilOrbita(def, nivel + 1);
      expect(b.raio).toBeGreaterThan(a.raio);
      expect(Math.abs(b.velocidade)).toBeGreaterThan(Math.abs(a.velocidade));
      expect(b.quantidade).toBeGreaterThan(a.quantidade);
      expect(Math.sign(b.velocidade)).toBe(Math.sign(def.base.velocidade));
    }
  });

  it.each(orbitais)('$id compartilha exatamente os valores de prévia e combate', (def) => {
    for (let nivel = 1; nivel <= 10; nivel++) {
      const atributos = { ...ATRIBUTOS_BASE, area: 1.7, quantidade: 3 };
      const perfil = perfilOrbita(def, nivel, atributos.area, atributos.quantidade);
      const efetivo = valoresHabilidade(def, nivel, atributos);
      expect(efetivo.area).toBe(perfil.raio);
      expect(efetivo.velocidade).toBe(perfil.velocidade);
      expect(efetivo.quantidade).toBe(perfil.quantidade);
    }
  });

  it('limita níveis excedentes e builds com quantidade muito alta', () => {
    for (const def of orbitais) {
      expect(perfilOrbita(def, 100)).toEqual(perfilOrbita(def, 10));
      expect(perfilOrbita(def, 10, 1, 1e6).quantidade).toBe(MAX_ORBES_POR_ANEL);
      expect(perfilOrbita(def, NaN)).toEqual(perfilOrbita(def, 1));
    }
  });

  it('as posições de colisão têm o raio visual e espaçamento angular uniforme', () => {
    const posicao = { x: 0, z: 0 };
    const oposto = { x: 0, z: 0 };
    posicaoOrbital(1.3, -5, 0, 8, 4.2, 10, -7, posicao);
    posicaoOrbital(1.3, -5, 4, 8, 4.2, 10, -7, oposto);
    expect(Math.hypot(posicao.x - 10, posicao.z + 7)).toBeCloseTo(4.2);
    expect(Math.hypot(posicao.x - oposto.x, posicao.z - oposto.z)).toBeCloseTo(8.4);
    expect((posicao.x + oposto.x) / 2).toBeCloseTo(10);
    expect((posicao.z + oposto.z) / 2).toBeCloseTo(-7);
  });
});
