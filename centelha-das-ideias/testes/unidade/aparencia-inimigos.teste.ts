import { describe, expect, it } from 'vitest';
import { INIMIGOS, type IdInimigo } from '../../src/roguelike/dados/inimigos';
import { geometriaInimigo, OLHOS } from '../../src/roguelike/render/formas';
import { ORCAMENTO_VERTICES_INIMIGO } from '../../src/roguelike/render/aparencia-inimigos';

describe('silhuetas e cores dos inimigos instanciados', () => {
  it('preserva os 17 tipos e acrescenta dois voadores identificáveis', () => {
    const antigos = [
      'chiado',
      'spam',
      'zumbido',
      'estatica',
      'alucinacao',
      'glitch',
      'trollBug',
      'chefe',
      'virus',
      'verme',
      'trojan',
      'loopInfinito',
      'vazamento',
      'ponteiroNulo',
      'pilha',
      'bloco',
      'ransomware',
    ];
    expect(Object.keys(INIMIGOS)).toEqual(expect.arrayContaining(antigos));
    for (const id of ['morcegoRunico', 'arraiaCeleste'] as const) {
      expect(INIMIGOS[id].comportamento).toBe('voador');
      expect(INIMIGOS[id].peso).toBeGreaterThan(0);
      expect(INIMIGOS[id].altura).toBeGreaterThan(INIMIGOS.zumbido.altura);
    }
  });

  for (const id of Object.keys(INIMIGOS) as IdInimigo[]) {
    it(`${id}: malha única, atributos finitos, paleta e custo limitado`, () => {
      const g = geometriaInimigo(id);
      const pos = g.getAttribute('position');
      const cores = g.getAttribute('color');
      expect(g.groups).toHaveLength(0);
      expect(pos.count).toBeLessThanOrEqual(ORCAMENTO_VERTICES_INIMIGO);
      expect(cores.count).toBe(pos.count);
      for (const atributo of ['position', 'normal', 'color'])
        expect(Array.from(g.getAttribute(atributo).array).every(Number.isFinite)).toBe(true);
      const paleta = new Set<string>();
      for (let n = 0; n < cores.count; n++) {
        const rgb = [cores.getX(n), cores.getY(n), cores.getZ(n)];
        expect(rgb.every((v) => v >= 0 && v <= 1)).toBe(true);
        paleta.add(rgb.map((v) => v.toFixed(3)).join(','));
      }
      expect(paleta.size).toBeGreaterThanOrEqual(3);
      expect(OLHOS[id].tam).toBeGreaterThan(0.04);
      // As peças precisam de tampas: nenhuma borda aberta exige DoubleSide.
      const p = g.getAttribute('position');
      const arestas = new Map<string, number>();
      const vertice = (i: number) =>
        [p.getX(i), p.getY(i), p.getZ(i)].map((v) => Math.round(v * 100000).toString()).join(',');
      for (let i = 0; i < p.count; i += 3) {
        const v = [vertice(i), vertice(i + 1), vertice(i + 2)];
        for (let j = 0; j < 3; j++) {
          const chave = [v[j], v[(j + 1) % 3]].sort().join('|');
          arestas.set(chave, (arestas.get(chave) ?? 0) + 1);
        }
      }
      expect([...arestas.values()].every((n) => n % 2 === 0)).toBe(true);
      const b = g.boundingBox!;
      expect(OLHOS[id].y).toBeGreaterThan(b.min.y);
      expect(OLHOS[id].y).toBeLessThan(b.max.y);
      g.dispose();
    });
  }

  it('asas fechadas têm envergadura larga e permanecem acima do solo', () => {
    for (const id of ['zumbido', 'morcegoRunico', 'arraiaCeleste'] as const) {
      const g = geometriaInimigo(id);
      const b = g.boundingBox!;
      expect(b.max.x - b.min.x).toBeGreaterThan(1.8);
      expect(b.min.y).toBeGreaterThan(0.65);
      g.dispose();
    }
  });

  it('chefes têm coroas e carapaças claras em vez de corpos quase pretos', () => {
    for (const id of ['chefe', 'ransomware'] as const) {
      const g = geometriaInimigo(id);
      const p = g.getAttribute('position');
      const cor = g.getAttribute('color');
      let claros = 0;
      let dourados = 0;
      for (let n = 0; n < cor.count; n++) {
        if (Math.max(cor.getX(n), cor.getY(n), cor.getZ(n)) > 0.5) claros++;
        if (cor.getX(n) > 0.7 && cor.getY(n) > 0.4 && cor.getZ(n) < 0.65) dourados++;
      }
      expect(claros / p.count).toBeGreaterThan(0.45);
      expect(dourados).toBeGreaterThan(100);
      expect(g.boundingBox!.max.y).toBeGreaterThan(2.7);
      g.dispose();
    }
  });
});
