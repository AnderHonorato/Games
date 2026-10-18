import { describe, expect, it } from 'vitest';
import * as T from 'three';
import { HEROIS_MOBA, ITENS_MOBA, heroiMoba, itemMoba } from '../../src/moba/dados';
import {
  criarModeloHeroiMoba,
  animarModeloHeroiMoba,
  descartarModeloHeroiMoba,
} from '../../src/moba/modelos';

function malhas(grupo: T.Group): T.Mesh[] {
  const resultado: T.Mesh[] = [];
  grupo.traverse((obj) => {
    if (obj instanceof T.Mesh) resultado.push(obj);
  });
  return resultado;
}
function assinatura(grupo: T.Group): string {
  // Ignora cor/nome: formas diferentes precisam ter geometria efetivamente diferente.
  let hash = 2166136261;
  for (const mesh of malhas(grupo))
    for (const v of mesh.geometry.getAttribute('position').array) {
      hash = Math.imul(hash ^ Math.round(v * 10000), 16777619);
    }
  return `${malhas(grupo)
    .map((m) => m.geometry.getAttribute('position').count)
    .join(',')}:${hash >>> 0}`;
}

describe('catálogo e modelos dos 25 guardiões MOBA', () => {
  it('oferece 25 identidades, 100 habilidades nomeadas e as seis classes', () => {
    expect(HEROIS_MOBA).toHaveLength(25);
    expect(new Set(HEROIS_MOBA.map((h) => h.id)).size).toBe(25);
    expect(new Set(HEROIS_MOBA.map((h) => h.forma)).size).toBe(25);
    expect(new Set(HEROIS_MOBA.map((h) => h.classe)).size).toBe(6);
    const skills = HEROIS_MOBA.flatMap((h) => h.habilidades);
    expect(skills).toHaveLength(100);
    expect(new Set(skills.map((s) => s.id)).size).toBe(100);
    expect(new Set(skills.map((s) => s.nome)).size).toBe(100);
    expect(new Set(skills.map((s) => s.tipo)).size).toBe(14);
    expect(new Set(HEROIS_MOBA.map((h) => h.habilidades.map((s) => s.tipo).join(','))).size).toBe(
      25
    );
    for (const h of HEROIS_MOBA) {
      expect(heroiMoba(h.id)).toBe(h);
      expect(h.habilidades).toHaveLength(4);
      expect(h.vida).toBeGreaterThan(0);
      expect(h.mana).toBeGreaterThan(0);
      expect(h.passiva.descricao.length).toBeGreaterThan(12);
      for (const s of h.habilidades) {
        expect(s.descricao).toContain(s.nome);
        for (const v of [s.dano, s.custo, s.recarga, s.alcance, s.raio, s.duracao]) {
          expect(Number.isFinite(v)).toBe(true);
          expect(v).toBeGreaterThanOrEqual(0);
        }
        expect(s.recarga).toBeGreaterThan(0);
      }
    }
    expect(heroiMoba('id-inexistente')).toBe(HEROIS_MOBA[0]);
  });

  it('expõe 14 itens compráveis com atributos positivos', () => {
    expect(ITENS_MOBA).toHaveLength(14);
    expect(new Set(ITENS_MOBA.map((i) => i.id)).size).toBe(14);
    for (const item of ITENS_MOBA) {
      expect(itemMoba(item.id)).toBe(item);
      expect(item.custo).toBeGreaterThan(0);
      const atributos = Object.entries(item).filter(
        ([k, v]) => typeof v === 'number' && k !== 'custo'
      );
      expect(atributos.length).toBeGreaterThan(0);
      for (const [, v] of atributos) expect(v).toBeGreaterThan(0);
    }
    expect(itemMoba('id-inexistente')).toBeUndefined();
  });

  const assinaturas = new Set<string>();
  for (const def of HEROIS_MOBA)
    it(`${def.nome}: geometria finita, olhos e cores sem texturas, até 10 draws`, () => {
      const grupo = criarModeloHeroiMoba(def);
      expect(grupo).toBeInstanceOf(T.Group);
      expect(grupo.userData.forma).toBe(def.forma);
      const meshes = malhas(grupo);
      expect(meshes.length).toBeGreaterThanOrEqual(4);
      expect(meshes.length).toBeLessThanOrEqual(10);
      expect(new Set(meshes.map((m) => m.material)).size).toBe(1);
      let vertices = 0;
      const cores = new Set<string>();
      for (const mesh of meshes) {
        const g = mesh.geometry;
        expect(g.groups).toHaveLength(0);
        for (const atributo of ['position', 'normal', 'color'])
          expect(Array.from(g.getAttribute(atributo).array).every(Number.isFinite)).toBe(true);
        expect(g.getAttribute('color').count).toBe(g.getAttribute('position').count);
        const cor = g.getAttribute('color');
        for (let i = 0; i < cor.count; i++)
          cores.add([cor.getX(i), cor.getY(i), cor.getZ(i)].map((v) => v.toFixed(3)).join(','));
        vertices += g.getAttribute('position').count;
        expect((mesh.material as T.MeshStandardMaterial).map).toBeNull();
      }
      expect(cores.size).toBeGreaterThanOrEqual(7);
      expect(vertices).toBeLessThan(60000);
      const bounds = new T.Box3().setFromObject(grupo);
      expect(bounds.max.y - bounds.min.y).toBeGreaterThan(3);
      expect(bounds.max.y - bounds.min.y).toBeLessThan(5.5);
      expect(bounds.min.y).toBeGreaterThan(-0.1);
      const id = assinatura(grupo);
      expect(assinaturas.has(id)).toBe(false);
      assinaturas.add(id);
      descartarModeloHeroiMoba(grupo);
    });

  it('anima membros, asas e cauda sem alterar posição/rotação do mundo ou acumular drift', () => {
    const grupo = criarModeloHeroiMoba(heroiMoba('eco'));
    grupo.position.set(12, 2, -8);
    grupo.rotation.y = 1.2;
    const antes = grupo.getObjectByName('asaE')!.rotation.y;
    animarModeloHeroiMoba(grupo, 2, true, true);
    const asa = grupo.getObjectByName('asaE')!,
      braco = grupo.getObjectByName('bracoD')!;
    expect(asa.rotation.y).not.toBe(antes);
    expect(braco.rotation.x).not.toBe(0);
    expect(grupo.position.toArray()).toEqual([12, 2, -8]);
    expect(grupo.rotation.y).toBe(1.2);
    const pose = asa.rotation.y;
    for (let i = 0; i < 100; i++) animarModeloHeroiMoba(grupo, 2, true, true);
    expect(asa.rotation.y).toBe(pose);
    animarModeloHeroiMoba(grupo, NaN, false);
    grupo.traverse((obj) =>
      expect(
        [...obj.position.toArray(), obj.rotation.x, obj.rotation.y, obj.rotation.z].every(
          Number.isFinite
        )
      ).toBe(true)
    );
    descartarModeloHeroiMoba(grupo);
  });

  it('descarte libera cada recurso uma vez e preserva as demais instâncias', () => {
    const a = criarModeloHeroiMoba(HEROIS_MOBA[0]),
      b = criarModeloHeroiMoba(HEROIS_MOBA[0]);
    const meshes = malhas(a),
      outro = malhas(b);
    const geometrias = [...new Set(meshes.map((m) => m.geometry))];
    const materiais = [...new Set(meshes.map((m) => m.material as T.Material))];
    let descartadas = 0,
      descartados = 0,
      outraInstancia = 0;
    for (const g of geometrias) {
      expect(outro.some((m) => m.geometry === g)).toBe(false);
      g.addEventListener('dispose', () => descartadas++);
    }
    for (const m of materiais) {
      expect(outro.some((mesh) => mesh.material === m)).toBe(false);
      m.addEventListener('dispose', () => descartados++);
    }
    for (const mesh of outro) mesh.geometry.addEventListener('dispose', () => outraInstancia++);
    const cena = new T.Scene();
    cena.add(a, b);
    descartarModeloHeroiMoba(a);
    descartarModeloHeroiMoba(a);
    expect(descartadas).toBe(geometrias.length);
    expect(descartados).toBe(materiais.length);
    expect(a.children).toHaveLength(0);
    expect(a.parent).toBeNull();
    expect(outraInstancia).toBe(0);
    expect(b.parent).toBe(cena);
    animarModeloHeroiMoba(a, 10, true, true);
    descartarModeloHeroiMoba(b);
    expect(outraInstancia).toBe(outro.length);
  });
});
