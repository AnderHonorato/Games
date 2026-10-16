import { describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { selecionarAlvoManual, avancoPersonagem } from '../../src/roguelike/nucleo/combate-manual';
import {
  marcoCampanha,
  novoCiclo,
  bonusMega,
  DURACAO_TRANSICAO,
} from '../../src/roguelike/nucleo/campanha';
import { multVelocidade } from '../../src/roguelike/dados/inimigos';
import { ARMAS_INICIAIS } from '../../src/roguelike/dados/armas-iniciais';
import { Partida } from '../../src/roguelike/jogo/partida';
import { Jogador } from '../../src/roguelike/jogo/jogador';
import { Conta } from '../../src/roguelike/nucleo/conta';
vi.mock('../../src/render/modelo-claude', () => ({
  ModeloClaude: class {
    raiz = new THREE.Group();
    sombraContato = new THREE.Group();
    mao = new THREE.Group();
    descartar() {}
    definirPoder = vi.fn();
    falar() {}
    personalizar() {}
    emote = { mostrar() {} };
  },
}));
vi.mock('../../src/roguelike/fx/assinaturas', () => ({ manifestarPoder() {} }));
vi.mock('../../src/audio/poderes', () => ({ tocarSomPoder() {}, DEFINICOES_SONS_PODERES: {} }));

function fixture(): Partida {
  const local = new Jogador(0, 'claude', true),
    remoto = new Jogador(1, 'llama', false);
  const p = Object.assign(Object.create(Partida.prototype) as Partida, {
    conta: new Conta(null),
    jogadores: [local, remoto],
    local,
    j: local,
    papel: 'solo',
    estado: 'jogando',
    mapaId: 'jardim',
    tempo: 12,
    nivel: 1,
    xp: 0,
    xpProximo: 50,
    niveisPendentes: 0,
    campanhaId: 'campanha-teste',
    alvoCam: new THREE.Vector3(),
    ciclo: novoCiclo(),
    cinematica: null,
    xpCampanha: 0,
    xpRecebido: 0,
    eventos: [],
    grade: new Map(),
    aurasJogador: new Map(),
    inimigos: [],
    zonas: [],
    ondas: [],
    avisos: [],
    efeitos: [],
    itens: [],
    pocasInimigas: [],
    projeteis: [],
    numeros: [],
    tiposVistos: new Set(),
    cena: new THREE.Scene(),
    arena: { obstaculosPerto: () => [] },
    entrada: { iniciarPasso() {}, finalizarPasso() {}, apertou: () => false, soltarTudo: vi.fn() },
    audio: { musica() {}, tocar() {} },
    vozes: { falar() {} },
    fx: { subirNivel() {}, impacto() {}, erupcaoTerra() {}, chuvaCodigo() {}, limpar() {} },
    brilhos: { explosao() {} },
    halos: { iniciar() {}, marcar() {} },
    loteOrbita: { iniciar() {} },
    lotesProj: new Map(),
    rnd: () => 0.5,
    aoMudar() {},
    tremer() {},
    som() {},
    cortarVisual() {},
  });
  return p;
}
// Internos são exercitados sem construir WebGL.
const interno = (p: Partida) => p as unknown as Record<string, any>;

describe('combate manual', () => {
  it('prioriza chefes e elites dentro do alcance, depois vida e distância', () => {
    const comum = { x: 1, z: 0, vivo: true, vidaMax: 9999 };
    const elite = { x: 2, z: 0, vivo: true, vidaMax: 20, elite: true };
    const chefe = { x: 3, z: 0, vivo: true, vidaMax: 10, def: { comportamento: 'chefe' } };
    expect(selecionarAlvoManual([comum, elite, chefe], 0, 0, 4)).toBe(chefe);
    expect(selecionarAlvoManual([comum, elite, { ...chefe, x: 10 }], 0, 0, 4)).toBe(elite);
    const perto = { ...comum, x: 0.5 };
    expect(selecionarAlvoManual([comum, perto], 0, 0, 4)).toBe(perto);
    expect(selecionarAlvoManual([{ ...comum, vivo: false }], 0, 0, 4)).toBeNull();
  });
  it('oferece três relações distintas entre força, alcance e recarga', () => {
    const [lamina, cajado, martelo] = ARMAS_INICIAIS;
    expect(cajado.alcance).toBeGreaterThan(lamina.alcance);
    expect(martelo.dano).toBeGreaterThan(cajado.dano);
    expect(lamina.recarga).toBeLessThan(cajado.recarga);
  });
  it('host rejeita índice inválido, caído, tipo inválido e repetição sem cooldown', () => {
    const p = fixture();
    p.papel = 'anfitriao';
    expect(p.executarAcaoRemota(99, 'ataque')).toBe(false);
    expect(p.executarAcaoRemota(0, 'ataque')).toBe(false);
    expect(p.executarAcaoRemota(1, 'ataque')).toBe(true);
    expect(p.executarAcaoRemota(1, 'ataque')).toBe(false);
    p.jogadores[1].caido = true;
    expect(p.executarAcaoRemota(1, 'avanco')).toBe(false);
    expect(p.executarAcaoRemota(1, 'invalido' as 'ataque')).toBe(false);
  });
  it('guest envia ação sem aplicar dano autoritário', () => {
    const p = fixture();
    p.papel = 'convidado';
    const acao = vi.fn();
    p.rede = { acao } as never;
    const dano = vi.fn();
    interno(p).causarDano = dano;
    interno(p).inimigos = [{ x: 1, z: 0, vidaMax: 50, vivo: true }];
    expect(p.atacarManual()).toBe(true);
    expect(acao).toHaveBeenCalledWith('ataque');
    expect(dano).not.toHaveBeenCalled();
  });
});

describe('avanços de personalidade', () => {
  it('Claude teleporta e Gemini dá o segundo blink uma única vez', () => {
    const p = fixture();
    p.local.dirX = 1;
    p.local.dirZ = 0;
    expect(p.avancarEspecial()).toBe(true);
    expect(p.local.x).toBeCloseTo(avancoPersonagem('claude').distancia);
    expect(p.avancarEspecial()).toBe(false);
    p.local.personagemId = 'gemini';
    p.local.x = 0;
    p.local.recargaDash = 0;
    p.avancarEspecial();
    const primeiro = p.local.x;
    interno(p).atualizarAvanco(p.local, 0.3);
    expect(p.local.x).toBeCloseTo(primeiro * 2);
    interno(p).atualizarAvanco(p.local, 0.1);
    expect(p.local.x).toBeCloseTo(primeiro * 2);
  });
  it('Llama permite segundo toque durante o salto e aplica super soco uma vez', () => {
    const p = fixture();
    p.local.personagemId = 'llama';
    const dano = vi.fn();
    interno(p).causarDano = dano;
    interno(p).inimigos = [{ x: 1, z: 0, vivo: true, raio: 1 }];
    expect(p.avancarEspecial()).toBe(true);
    expect(p.avancarEspecial()).toBe(true);
    expect(p.avancarEspecial()).toBe(false);
    expect(dano).toHaveBeenCalledTimes(1);
    expect(dano.mock.calls[0][1]).toBe(165);
  });
  it('distingue salto digital, corrida vento e surf em duração/velocidade/altura', () => {
    expect(avancoPersonagem('gpt').salto).toBeGreaterThan(1);
    expect(avancoPersonagem('mistral').velocidade).toBeGreaterThan(
      avancoPersonagem('deepseek').velocidade
    );
    expect(avancoPersonagem('deepseek').duracao).toBeGreaterThan(
      avancoPersonagem('mistral').duracao
    );
  });
});

describe('campanha e pausa de apresentação', () => {
  it('agenda mini aos 75s e mega aos 180s uma vez por mapa', () => {
    const ciclo = novoCiclo();
    expect(marcoCampanha(74.99, ciclo)).toBeNull();
    expect(marcoCampanha(75, ciclo)).toBe('mini');
    ciclo.mini = true;
    expect(marcoCampanha(179.99, ciclo)).toBeNull();
    expect(marcoCampanha(180, ciclo)).toBe('mega');
    ciclo.mega = true;
    expect(marcoCampanha(999, ciclo)).toBeNull();
    expect([bonusMega('jardim'), bonusMega('forja'), bonusMega('abismo')]).toEqual([200, 400, 600]);
  });
  it.each(['cinematica', 'transicao'] as const)(
    'pausa %s e restaura sem avançar tempo ou causar dano',
    (estado) => {
      const p = fixture();
      p.estado = estado;
      p.cinematica = {
        tipo: estado === 'transicao' ? 'transicao' : 'mega',
        tempo: 0,
        duracao: DURACAO_TRANSICAO,
        nome: 'Chefe',
        fala: 'Oi',
      };
      const vida = p.local.vida;
      p.pausar(true);
      p.passo(10);
      expect(p.estado).toBe('pausa');
      expect(p.cinematica.tempo).toBe(0);
      expect(p.tempo).toBe(12);
      interno(p).danoJogador(500, 0, 0);
      expect(p.local.vida).toBe(vida);
      p.pausar(false);
      expect(p.estado).toBe(estado);
      p.passo(0.5);
      expect(p.cinematica.tempo).toBe(0.5);
      expect(p.tempo).toBe(12);
    }
  );
  it('transição reseta build e nível e preserva XP permanente', () => {
    const p = fixture();
    p.conta.ganharXp(220);
    p.nivel = 18;
    p.local.build = { ativas: [{ id: 'centelhaOrbital', nivel: 10 }], passivas: [] };
    p.estado = 'transicao';
    p.cinematica = { tipo: 'transicao', tempo: 4.4, duracao: 4.5, nome: 'Forja', fala: 'Oi' };
    interno(p).aplicarMapaRemoto = (id: string) => {
      p.mapaId = id as 'forja';
    };
    interno(p).atualizarCinematica(0.2);
    expect(p.mapaId).toBe('forja');
    expect(p.nivel).toBe(1);
    expect(p.local.build.ativas[0].nivel).toBe(1);
    expect(p.conta.dados.xp).toBe(220);
    expect(p.local.humor).toBe('surpreso');
  });
  it('XP de conta só recompensa abates reais, não os cristais semeados', () => {
    const p = fixture();
    interno(p).ganharXp(60);
    expect(p.conta.dados.xp).toBe(0);
    interno(p).recompensarConta(12);
    expect(p.conta.dados.xp).toBe(12);
  });
  it('velocidade inicial é reduzida e cresce suavemente', () => {
    expect(multVelocidade(0)).toBe(0.5);
    expect(multVelocidade(90)).toBeLessThan(multVelocidade(180));
    expect(multVelocidade(0.01) - multVelocidade(0)).toBeLessThan(0.001);
    expect(multVelocidade(100000)).toBeLessThanOrEqual(1.2);
  });
});

describe('estado de campanha pela rede', () => {
  it('deduplica XP cumulativo e mantém a cinematica no convidado', () => {
    const host = fixture(),
      guest = fixture();
    host.papel = 'anfitriao';
    guest.papel = 'convidado';
    interno(host).campanhaId = 'partida-a';
    interno(guest).campanhaId = 'convidado';
    host.estado = 'cinematica';
    host.cinematica = { tipo: 'mega', tempo: 1, duracao: 4, nome: 'Guardião', fala: 'Oi' };
    interno(host).recompensarConta(42);
    const estado = host.exportarEstado();
    guest.importarEstado(estado);
    guest.importarEstado(estado);
    expect(guest.conta.dados.xp).toBe(42);
    expect(guest.estado).toBe('cinematica');
    expect(guest.cinematica?.tempo).toBe(1);
    interno(host).recompensarConta(8);
    guest.importarEstado(host.exportarEstado());
    expect(guest.conta.dados.xp).toBe(50);
    guest.importarEstado(estado);
    expect(guest.conta.dados.xp).toBe(50);
  });
  it('transporta builds e perfis quando a fase seguinte começa', () => {
    const host = fixture(),
      guest = fixture();
    host.papel = 'anfitriao';
    guest.papel = 'convidado';
    host.mapaId = 'forja';
    host.local.nome = 'Ana';
    host.local.arma = 'martelo';
    host.local.build = { ativas: [{ id: 'centelhaOrbital', nivel: 1 }], passivas: [] };
    guest.local.build = { ativas: [{ id: 'centelhaOrbital', nivel: 10 }], passivas: [] };
    guest.estado = 'transicao';
    guest.cinematica = { tipo: 'transicao', tempo: 4, duracao: 4.5, nome: 'Forja', fala: 'Oi' };
    interno(guest).aplicarMapaRemoto = (id: string) => {
      guest.mapaId = id as 'forja';
    };
    guest.importarEstado(host.exportarEstado());
    expect(guest.mapaId).toBe('forja');
    expect(guest.estado).toBe('jogando');
    expect(guest.cinematica).toBeNull();
    expect(guest.local.nome).toBe('Ana');
    expect(guest.local.arma).toBe('martelo');
    expect(guest.local.build.ativas[0].nivel).toBe(1);
  });
});

describe('regressões da passagem de fase', () => {
  function prepararConvidado(): { host: Partida; guest: Partida } {
    const host = fixture(),
      guest = fixture();
    host.papel = 'anfitriao';
    guest.papel = 'convidado';
    interno(guest).aplicarMapaRemoto = (id: string) => {
      guest.mapaId = id as 'forja';
    };
    return { host, guest };
  }

  it.each(['mapa', 'campanha'] as const)(
    'usa spawn autoritativo e limpa estado transitório ao mudar %s',
    (mudanca) => {
      const { host, guest } = prepararConvidado();
      guest.local.x = 80;
      guest.local.z = 20;
      guest.local.vx = 15;
      guest.local.avancoTempo = 2;
      guest.local.segundoBlink = true;
      guest.local.ofertas = [
        { tipo: 'cura', id: 'cura', nivelAtual: 0, novo: false, evolucao: false },
      ];
      guest.local.build = { ativas: [{ id: 'centelhaOrbital', nivel: 10 }], passivas: [] };
      guest.nivel = 20;
      guest.niveisPendentes = 5;
      guest.estado = mudanca === 'campanha' ? 'fim' : 'transicao';
      interno(guest).eventos = [{ tempo: 99, dono: guest.local, acao: vi.fn() }];
      if (mudanca === 'mapa') host.mapaId = 'forja';
      else interno(host).campanhaId = 'nova-campanha';
      host.local.x = -2.5;
      host.local.z = 0;
      host.local.build = { ativas: [{ id: 'centelhaOrbital', nivel: 1 }], passivas: [] };
      guest.importarEstado(host.exportarEstado());
      expect([guest.local.x, guest.local.z]).toEqual([-2.5, 0]);
      expect(guest.local.rede.x).toBe(-2.5);
      expect(guest.local.modelo.raiz.position.x).toBe(-2.5);
      expect(interno(guest).alvoCam.toArray()).toEqual([-2.5, 0, 0]);
      expect(guest.local.vx).toBe(0);
      expect(guest.local.avancoTempo).toBe(0);
      expect(guest.local.segundoBlink).toBe(false);
      expect(guest.local.ofertas).toEqual([]);
      expect(guest.local.build.ativas[0].nivel).toBe(1);
      expect(guest.nivel).toBe(1);
      expect(guest.estado).toBe('jogando');
      expect(guest.niveisPendentes).toBe(0);
      expect(interno(guest).eventos).toEqual([]);
      expect(guest.entrada.soltarTudo).toHaveBeenCalledOnce();
      expect(guest.local.modelo.definirPoder).toHaveBeenLastCalledWith(1);
      expect(guest.identificadorFase).toBe(host.identificadorFase);
    }
  );

  it('preserva a previsão local nos snapshots normais', () => {
    const { host, guest } = prepararConvidado();
    guest.local.x = 80;
    guest.local.z = 20;
    guest.local.vx = 4;
    guest.importarEstado(host.exportarEstado());
    expect([guest.local.x, guest.local.z, guest.local.vx]).toEqual([80, 20, 4]);
    expect(guest.entrada.soltarTudo).not.toHaveBeenCalled();
  });

  it('restaura mapa pessoal desbloqueado ao sair do lobby e valida ao iniciar solo', () => {
    const p = fixture();
    interno(p).aplicarMapaRemoto = (id: string) => {
      p.mapaId = id as 'forja';
    };
    p.papel = 'convidado';
    p.mapaId = 'forja'; // prévia da sala de um anfitrião avançado
    p.modoSolo();
    expect(p.mapaId).toBe('jardim');
    expect(p.conta.dados.mapa).toBe('jardim');
    p.mapaId = 'forja';
    p.iniciar();
    expect(p.mapaId).toBe('jardim');
    p.conta.ganharXp(600);
    p.conta.selecionarMapa('abismo');
    p.mapaId = 'forja';
    p.modoSolo();
    expect(p.mapaId).toBe('abismo');
  });

  it('credita bônus antes de persistir a fase desbloqueada do convidado', () => {
    const { host, guest } = prepararConvidado();
    guest.conta.ganharXp(200);
    guest.conta.selecionarMapa('forja');
    host.mapaId = 'abismo';
    interno(host).recompensarConta(400);
    const snapshot = host.exportarEstado();
    guest.importarEstado(snapshot);
    guest.importarEstado(snapshot);
    expect(guest.conta.dados.xp).toBe(600);
    expect(guest.conta.dados.mapa).toBe('abismo');
    expect(guest.local.xpConta).toBe(600);
    guest.papel = 'solo';
    guest.iniciar();
    expect(guest.mapaId).toBe('abismo');
  });

  it('não persiste a prévia de mapa no menu', () => {
    const { host, guest } = prepararConvidado();
    guest.conta.ganharXp(600);
    host.mapaId = 'abismo';
    host.estado = 'menu';
    guest.importarEstado(host.exportarEstado());
    expect(guest.conta.dados.mapa).toBe('jardim');
  });

  it('usa nível da run no poder visual do host e dos dois tipos de snapshot e volta a 1 ao reiniciar', () => {
    const { host, guest } = prepararConvidado();
    host.local.build = { ativas: [{ id: 'centelhaOrbital', nivel: 10 }], passivas: [] };
    interno(host).atualizarBuild();
    host.nivel = 20;
    interno(host).abrirNivel();
    expect(host.local.modelo.definirPoder).toHaveBeenLastCalledWith(20);
    guest.importarNivel(host.exportarNivel());
    expect(guest.local.modelo.definirPoder).toHaveBeenLastCalledWith(20);
    guest.importarEstado(host.exportarEstado());
    expect(guest.local.modelo.definirPoder).toHaveBeenLastCalledWith(20);
    host.iniciar();
    expect(host.nivel).toBe(1);
    expect(host.local.modelo.definirPoder).toHaveBeenLastCalledWith(1);
  });
});
