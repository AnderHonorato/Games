import * as THREE from 'three';
import { describe, expect, it, vi } from 'vitest';
import { criarAleatorio } from '../../src/nucleo/aleatorio';
import { Jogador } from '../../src/roguelike/jogo/jogador';
import { Conta } from '../../src/roguelike/nucleo/conta';
import { Partida } from '../../src/roguelike/jogo/partida';

// A lógica de reinício não precisa construir os modelos visuais nem abrir WebGL.
vi.mock('../../src/render/modelo-claude', () => ({
  ModeloClaude: class {
    mao = new THREE.Group();
    emote = { mostrar() {} };
    definirPoder() {}
    falar() {}
  },
}));

function partidaParaReinicio(): Partida {
  const local = new Jogador(0, 'claude', true);
  const remoto = new Jogador(1, 'gpt', false);
  return Object.assign(Object.create(Partida.prototype) as Partida, {
    jogadores: [local, remoto],
    conta: new Conta(null),
    mapaId: 'jardim',
    fx: { limpar() {} },
    entrada: { soltarTudo() {} },
    local,
    j: local,
    papel: 'anfitriao',
    inimigos: [],
    zonas: [],
    ondas: [],
    avisos: [],
    efeitos: [],
    itens: [],
    pocasInimigas: [],
    tiposVistos: new Set(),
    cena: { remove() {} },
    halos: { iniciar() {}, marcar() {} },
    loteOrbita: { iniciar() {} },
    lotesProj: new Map(),
    rnd: criarAleatorio(42),
    audio: { musica() {} },
    vozes: { falar() {} },
    aoMudar() {},
  });
}

describe('reinício da Sobrevivência', () => {
  it('libera as habilidades bloqueadas na partida anterior para todos os jogadores', () => {
    const p = partidaParaReinicio();
    p.iniciar();
    p.tempo = 500;
    for (const jg of p.jogadores) jg.bloqueios.set(jg.habs[0].idx, p.tempo + 8);
    expect(p.travada(p.local.habs[0].idx)).toBe(true);

    p.iniciar();

    expect(p.tempo).toBe(0);
    expect(p.travada(p.local.habs[0].idx)).toBe(false);
    for (const jg of p.jogadores) expect(jg.bloqueios.size).toBe(0);
  });

  it('começa a nova partida sem esquiva ou recarga herdada da anterior', () => {
    const p = partidaParaReinicio();
    p.iniciar();
    for (const jg of p.jogadores) {
      jg.dash = 0.2;
      jg.recargaDash = 1.4;
      jg.dashX = 1;
      jg.dashZ = -1;
    }

    p.iniciar();

    for (const jg of p.jogadores) {
      expect(jg.dash).toBe(0);
      expect(jg.recargaDash).toBe(0);
      expect(jg.dashX).toBe(0);
      expect(jg.dashZ).toBe(0);
    }
  });
});
