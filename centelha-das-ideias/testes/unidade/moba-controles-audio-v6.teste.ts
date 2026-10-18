import { describe, expect, it, vi } from 'vitest';
import { limitarMira } from '../../src/moba/mira';
import { AudioMoba, SOM_EFEITO_MOBA } from '../../src/moba/audio';
import { SimulacaoMoba } from '../../src/moba/simulacao';
import type { ApiAudio } from '../../src/audio/contrato';

function fixture() {
  const api: ApiAudio & { destruir: () => void } = {
    desbloquear: vi.fn(),
    tocar: vi.fn(),
    musica: vi.fn(),
    definirIntensidade: vi.fn(),
    definirVolume: vi.fn(),
    volume: () => 1,
    suspender: vi.fn(),
    definirOuvinte: vi.fn(),
    destruir: vi.fn(),
  };
  const audio = new AudioMoba(api),
    sim = new SimulacaoMoba();
  sim.iniciar('brasa');
  audio.atualizar(sim, true);
  return { api, audio, sim };
}

describe('mira de habilidade', () => {
  it('preserva direção e limita o gesto ao alcance em qualquer quadrante', () => {
    for (const [x, z] of [
      [30, 40],
      [-30, 40],
      [30, -40],
      [-30, -40],
    ]) {
      const p = limitarMira({ x: 0, z: 0 }, { x, z }, 10);
      expect(Math.hypot(p.x, p.z)).toBeCloseTo(10);
      expect(p.x / p.z).toBeCloseTo(x / z);
    }
  });
  it('não estende alvos próximos nem ultrapassa a arena na borda', () => {
    expect(limitarMira({ x: 0, z: 0 }, { x: 2, z: 3 }, 10)).toEqual({ x: 2, z: 3 });
    const p = limitarMira({ x: 85, z: 85 }, { x: 100, z: 100 }, 8);
    expect(p.x).toBeLessThanOrEqual(88);
    expect(p.z).toBeLessThanOrEqual(88);
    expect(Math.hypot(p.x - 85, p.z - 85)).toBeLessThanOrEqual(8);
    expect(limitarMira({ x: 5, z: 5 }, { x: 20, z: 20 }, 0)).toEqual({ x: 5, z: 5 });
  });
  it('neutraliza coordenadas e alcance inválidos', () => {
    expect(limitarMira({ x: 4, z: 8 }, { x: NaN, z: Infinity }, 10)).toEqual({ x: 4, z: 8 });
    expect(limitarMira({ x: NaN, z: 8 }, { x: 1, z: 1 }, 10)).toEqual({ x: 0, z: 8 });
  });
});

describe('áudio do MOBA', () => {
  it('distingue as 14 famílias de habilidades por timbre', () => {
    const familias = [
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
    expect(new Set(familias.map((t) => SOM_EFEITO_MOBA[t])).size).toBe(14);
  });
  it('limita a emissão e não repete sons do mesmo efeito por quadro', () => {
    const { api, audio, sim } = fixture();
    sim.efeitos = Array.from({ length: 25 }, (_, i) => ({
      id: 1000 + i,
      tipo: 'area',
      x: sim.local.x,
      z: sim.local.z,
      raio: 2,
      cor: '#ffffff',
      vida: 1,
      total: 1,
    }));
    audio.atualizar(sim, true);
    audio.atualizar(sim, true);
    expect(api.tocar).toHaveBeenCalledTimes(5);
  });
  it('oculta eventos sem visão e não reproduz sons antigos ao desmutar', () => {
    const { api, audio, sim } = fixture();
    sim.efeitos = [
      {
        id: 1000,
        tipo: 'raio',
        x: -sim.local.x,
        z: -sim.local.z,
        raio: 2,
        cor: '#fff',
        vida: 1,
        total: 1,
      },
    ];
    audio.atualizar(sim, true);
    expect(api.tocar).not.toHaveBeenCalled();
    sim.efeitos = [{ ...sim.efeitos[0], id: 1001, x: sim.local.x, z: sim.local.z }];
    audio.atualizar(sim, false);
    audio.atualizar(sim, true);
    expect(api.tocar).not.toHaveBeenCalled();
    expect(api.suspender).toHaveBeenLastCalledWith(false);
  });
  it('pausa o áudio, libera recursos e aceita reinício dos IDs de efeito', () => {
    const { api, audio, sim } = fixture();
    sim.tempo = 10;
    sim.efeitos = [
      {
        id: 1000,
        tipo: 'cura',
        x: sim.local.x,
        z: sim.local.z,
        raio: 2,
        cor: '#fff',
        vida: 1,
        total: 1,
      },
    ];
    audio.atualizar(sim, true);
    sim.pausar(true);
    audio.atualizar(sim, true);
    expect(api.suspender).toHaveBeenLastCalledWith(true);
    sim.iniciar('mimi');
    sim.efeitos = [
      {
        id: 500,
        tipo: 'escudo',
        x: sim.local.x,
        z: sim.local.z,
        raio: 2,
        cor: '#fff',
        vida: 1,
        total: 1,
      },
    ];
    audio.atualizar(sim, true);
    expect(api.tocar).toHaveBeenLastCalledWith('criarEscudo', expect.any(Object));
    audio.descartar();
    expect(api.destruir).toHaveBeenCalledOnce();
  });
});
