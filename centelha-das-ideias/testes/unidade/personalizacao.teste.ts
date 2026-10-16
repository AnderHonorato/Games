import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { normalizarPersonalizacao, personalizacaoPadrao } from '../../src/render/personalizacao';
import { ModeloClaude, type EstadoAnimacao } from '../../src/render/modelo-claude';
import { PERSONAGENS } from '../../src/roguelike/dados/personagens';
import { gradienteToon } from '../../src/render/materiais';

function instalarCanvas() {
  const contexto = new Proxy(
    {},
    {
      get: (_alvo, chave) =>
        chave === 'createRadialGradient' ? () => ({ addColorStop() {} }) : () => {},
      set: () => true,
    }
  );
  vi.stubGlobal('document', {
    createElement: () => ({ width: 0, height: 0, getContext: () => contexto }),
  });
}

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

beforeEach(instalarCanvas);
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('dados cosméticos persistidos', () => {
  it('recupera defaults para saves antigos, malformados e cores inválidas', () => {
    for (const valor of [
      undefined,
      null,
      false,
      3,
      'mago',
      [],
      { roupa: 'inventada', corRoupa: 'url(x)' },
    ]) {
      expect(normalizarPersonalizacao(valor)).toEqual(personalizacaoPadrao());
    }
    expect(personalizacaoPadrao('não é cor').corCorpo).toBe('#d97757');
  });

  it('preserva escolhas válidas, completa partes ausentes e converte hex curtos', () => {
    const p = normalizarPersonalizacao(
      {
        roupa: 'mago',
        cabeca: 'coroa',
        acessorio: 'asas',
        corOlhos: ' #AbC ',
        corRoupa: '#12AB34',
        corPernas: 4,
      },
      '#19c39c'
    );
    expect(p).toEqual({
      ...personalizacaoPadrao('#19c39c'),
      roupa: 'mago',
      cabeca: 'coroa',
      acessorio: 'asas',
      corOlhos: '#aabbcc',
      corRoupa: '#12ab34',
    });
    expect(personalizacaoPadrao('#456').corBracos).toBe('#445566');
  });

  it('não aceita propriedades herdadas e retorna cópias independentes', () => {
    expect(normalizarPersonalizacao(Object.create({ roupa: 'mago', corCorpo: '#000000' }))).toEqual(
      personalizacaoPadrao()
    );
    const p = personalizacaoPadrao();
    p.corRoupa = '#ffffff';
    expect(personalizacaoPadrao().corRoupa).toBe('#285b69');
  });
});

describe('personagem em volume', () => {
  it('veste cada roupa com costura e acessórios e mantém raiz e mão', () => {
    const modelo = new ModeloClaude();
    modelo.raiz.position.set(3, 4, 5);
    const mao = modelo.mao;
    for (const roupa of ['aventureiro', 'mago', 'guardiao'] as const) {
      modelo.personalizar({
        roupa,
        cabeca: 'bone',
        acessorio: 'asas',
        corBracos: '#abcdef',
        corPernas: '#123456',
      });
      expect(modelo.raiz.getObjectByName(`roupa-${roupa}`)).toBeDefined();
      expect(modelo.raiz.getObjectsByProperty('name', 'costura')).toHaveLength(8);
      expect(modelo.raiz.getObjectsByProperty('name', 'mao')).toHaveLength(2);
      expect(modelo.raiz.getObjectsByProperty('name', 'sola')).toHaveLength(2);
      expect(modelo.raiz.getObjectsByProperty('name', 'pena')).toHaveLength(6);
      expect(modelo.raiz.position.toArray()).toEqual([3, 4, 5]);
      expect(modelo.raiz.scale.toArray()).toEqual([1, 1, 1]);
      expect(modelo.mao).toBe(mao);
      expect(mao.parent).not.toBeNull();
    }
  });

  it('troca os recursos removidos sem descartar a rampa toon compartilhada', () => {
    const modelo = new ModeloClaude();
    const antigo = modelo.raiz.getObjectByName('roupa-aventureiro')!;
    const geometria = (antigo.getObjectByName('tunica') as THREE.Mesh).geometry;
    const material = (antigo.getObjectByName('tunica') as THREE.Mesh)
      .material as THREE.MeshToonMaterial;
    const descartarGeo = vi.spyOn(geometria, 'dispose');
    const descartarMaterial = vi.spyOn(material, 'dispose');
    const descartarGradiente = vi.spyOn(gradienteToon(), 'dispose');
    modelo.personalizar({ roupa: 'mago', cabeca: 'capuz', acessorio: 'cachecol' });
    expect(antigo.parent).toBeNull();
    expect(descartarGeo).toHaveBeenCalledOnce();
    expect(descartarMaterial).toHaveBeenCalledOnce();
    expect(descartarGradiente).not.toHaveBeenCalled();
    expect(modelo.raiz.getObjectByName('capuz')).toBeDefined();
    expect(modelo.raiz.getObjectByName('cachecol')).toBeDefined();
    modelo.personalizar({ acessorio: 'oculos' });
    expect(modelo.raiz.getObjectsByProperty('name', 'aro-oculos')).toHaveLength(2);
    expect(modelo.raiz.getObjectByName('cachecol')).toBeUndefined();
  });

  it('descarta uma só vez as instâncias próprias e preserva texturas globais', () => {
    const modelo = new ModeloClaude();
    const cena = new THREE.Scene();
    cena.add(modelo.raiz, modelo.sombraContato);
    const tunica = modelo.raiz.getObjectByName('tunica') as THREE.Mesh;
    const geo = vi.spyOn(tunica.geometry, 'dispose');
    const mat = vi.spyOn(tunica.material as THREE.Material, 'dispose');
    const texturaEmote = vi.spyOn(
      (modelo.emote.sprite.material as THREE.SpriteMaterial).map!,
      'dispose'
    );
    const gradiente = vi.spyOn(gradienteToon(), 'dispose');
    modelo.descartar();
    modelo.descartar();
    modelo.personalizar({ roupa: 'mago' });
    modelo.definirPoder(20);
    modelo.atualizar(1 / 60, parado);
    expect(geo).toHaveBeenCalledOnce();
    expect(mat).toHaveBeenCalledOnce();
    expect(gradiente).not.toHaveBeenCalled();
    expect(texturaEmote).not.toHaveBeenCalled();
    expect(cena.children).toHaveLength(0);
    expect(modelo.raiz.children).toHaveLength(0);
  });

  it('evolui nos níveis 10 e 20, não reconstrói dentro do estágio e permite reinício', () => {
    const modelo = new ModeloClaude();
    modelo.definirPoder(9);
    expect(modelo.raiz.getObjectByName('coroa-evolucao')).toBeUndefined();
    modelo.definirPoder(10);
    const coroa = modelo.raiz.getObjectByName('coroa-evolucao');
    expect(coroa).toBeDefined();
    modelo.definirPoder(19);
    expect(modelo.raiz.getObjectByName('coroa-evolucao')).toBe(coroa);
    expect(modelo.raiz.getObjectByName('aura-evolucao')).toBeUndefined();
    modelo.definirPoder(20);
    expect(modelo.raiz.getObjectByName('aura-evolucao')).toBeDefined();
    modelo.definirPoder(Number.NaN);
    expect(modelo.raiz.getObjectByName('aura-evolucao')).toBeUndefined();
    expect(modelo.raiz.getObjectByName('coroa-evolucao')).toBeUndefined();
  });

  it('anima sílabas e gestos pelo temporizador ou estado externo e volta à emoção', () => {
    const modelo = new ModeloClaude();
    const boca = modelo.rosto.grupo.getObjectByName('boca-falando')!;
    modelo.falar(0.4);
    modelo.atualizar(0.05, parado);
    expect(boca.visible).toBe(true);
    const altura = boca.scale.y;
    modelo.atualizar(0.05, parado);
    expect(boca.scale.y).not.toBe(altura);
    modelo.atualizar(0.5, parado);
    expect(boca.visible).toBe(false);
    modelo.atualizar(0.05, { ...parado, falando: true, humor: 'feliz' });
    expect(boca.visible).toBe(true);
    modelo.atualizar(0.05, parado);
    expect(boca.visible).toBe(false);
  });

  it('conserva as seis identidades e mantém transformações finitas durante emoções e combate', () => {
    const humores = [
      'neutro',
      'feliz',
      'triste',
      'raiva',
      'surpreso',
      'medo',
      'curioso',
      'determinado',
      'envergonhado',
      'sonolento',
      'carinho',
      'dor',
    ] as const;
    for (const personagem of PERSONAGENS) {
      const modelo = new ModeloClaude(personagem.aparencia);
      expect(modelo.rosto.grupo.getObjectsByProperty('name', 'iris')).toHaveLength(2);
      expect(modelo.rosto.grupo.getObjectsByProperty('name', 'pupila')).toHaveLength(2);
      modelo.definirPoder(20);
      let quantidadeAntes = 0;
      modelo.raiz.traverse(() => quantidadeAntes++);
      for (const humor of humores) {
        modelo.atualizar(1 / 60, { ...parado, humor, velocidade: 4, golpe: 0.3, falando: true });
        modelo.raiz.traverse((obj) => {
          expect(
            [
              ...obj.position.toArray(),
              ...obj.scale.toArray(),
              obj.rotation.x,
              obj.rotation.y,
              obj.rotation.z,
            ].every(Number.isFinite)
          ).toBe(true);
        });
      }
      let quantidadeDepois = 0;
      modelo.raiz.traverse(() => quantidadeDepois++);
      expect(quantidadeDepois).toBe(quantidadeAntes);
    }
  });
});
