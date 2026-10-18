import { describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { selecionarAlvoManual, avancoPersonagem } from '../../src/roguelike/nucleo/combate-manual';
import {
  marcoCampanha,
  novoCiclo,
  bonusMega,
  DURACAO_TRANSICAO,
  TEMPO_MINICHEFE,
  TEMPO_MEGACHEFE,
} from '../../src/roguelike/nucleo/campanha';
import { multVelocidade } from '../../src/roguelike/dados/inimigos';
import { ATAQUES_BASICOS, ataqueBasico } from '../../src/roguelike/dados/ataques-basicos';
import { PERSONAGENS } from '../../src/roguelike/dados/personagens';
import { InteracoesMapa } from '../../src/roguelike/jogo/interacoes-mapa';
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
    fx: {
      subirNivel() {},
      impacto() {},
      erupcaoTerra() {},
      chuvaCodigo() {},
      limpar() {},
      nova() {},
      explosao() {},
      raio() {},
    },
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
  it.each(PERSONAGENS.map((p) => p.id))(
    'ataque pessoal de %s existe no primeiro instante sem carta ou slot',
    (id) => {
      const p = fixture();
      p.tempo = 0;
      p.local.personagemId = id;
      p.local.habs = [];
      p.local.build = { ativas: [], passivas: [] };
      const dano = vi.fn();
      interno(p).causarDano = dano;
      interno(p).inimigos = [{ x: 1, z: 0, vida: 100, vidaMax: 100, raio: 0.4, vivo: true }];
      expect(p.atacarManual()).toBe(true);
      expect(dano).toHaveBeenCalled();
      expect(p.local.recargaAtaque).toBeGreaterThan(0);
      expect(p.local.habs).toEqual([]);
      expect(p.local.build).toEqual({ ativas: [], passivas: [] });
      expect(ataqueBasico(id).nome).toBeTruthy();
      expect(p.atacarManual()).toBe(false);
    }
  );
  it('onze heróis preservam as nove mecânicas e escolhas de arma preservam seu ataque pessoal', () => {
    expect(new Set(Object.values(ATAQUES_BASICOS).map((a) => a.mecanica)).size).toBe(9);
    const p = fixture();
    for (const arma of ARMAS_INICIAIS) {
      p.local.arma = arma.id;
      p.local.recargaAtaque = 0;
      expect(p.atacarManual()).toBe(true);
      expect(ataqueBasico(p.local.personagemId).mecanica).toBe('corte');
    }
  });
  it.each([
    ['perseguir', false, 1],
    ['perseguir', true, 0.35],
    ['chefe', false, 0.08],
  ] as const)(
    'força negativa puxa com resistência de %s (elite=%s)',
    (comportamento, elite, resistencia) => {
      const p = fixture();
      const inimigo = {
        x: 3,
        z: 0,
        vivo: true,
        vida: 1000,
        vidaMax: 1000,
        vx: 0,
        vz: 0,
        raio: 1,
        elite,
        def: { id: 'spam', comportamento, altura: 1, raio: 1 },
      };
      interno(p).causarDano(inimigo, 1, -1, 'gravidade', 1, 0, -12);
      expect(inimigo.vx).toBeCloseTo(-12 * resistencia);
      expect(inimigo.vz).toBe(0);
    }
  );
  it('Nox puxa inimigos vizinhos para o alvo principal durante seu ataque real', () => {
    const p = fixture();
    p.local.personagemId = 'nox';
    const principal = {
      x: 3,
      z: 0,
      vivo: true,
      vida: 1000,
      vidaMax: 1000,
      vx: 0,
      vz: 0,
      raio: 0.3,
      def: { id: 'spam', comportamento: 'perseguir', altura: 1, raio: 0.3 },
    };
    const vizinho = { ...principal, x: 4, vidaMax: 500 };
    interno(p).inimigos = [principal, vizinho];
    expect(p.atacarManual()).toBe(true);
    expect(vizinho.vx).toBeLessThan(0);
    expect(principal.vx).toBe(0);
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
  it('agenda mini aos cinco minutos e mega aos doze minutos uma vez por mapa', () => {
    const ciclo = novoCiclo();
    expect(marcoCampanha(TEMPO_MINICHEFE - 0.01, ciclo)).toBeNull();
    expect(marcoCampanha(TEMPO_MINICHEFE, ciclo)).toBe('mini');
    ciclo.mini = true;
    expect(marcoCampanha(TEMPO_MEGACHEFE - 0.01, ciclo)).toBeNull();
    expect(marcoCampanha(TEMPO_MEGACHEFE, ciclo)).toBe('mega');
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
  it('pausa as cartas, limpa entrada e restaura as ofertas exatas', () => {
    const p = fixture();
    p.estado = 'nivel';
    p.local.ofertas = [{ tipo: 'cura', id: 'cura', nivelAtual: 0, novo: false, evolucao: false }];
    p.banner = { texto: 'Cartas', sub: 'Escolha', cor: '#fff', vida: 4 };
    const ofertas = p.local.ofertas;
    p.pausar(true);
    expect(p.estado).toBe('pausa');
    expect(p.entrada.soltarTudo).toHaveBeenCalledOnce();
    p.passo(20);
    expect(p.tempo).toBe(12);
    expect(p.banner?.vida).toBe(4);
    expect(p.atacarManual()).toBe(false);
    p.pausar(false);
    expect(p.estado).toBe('nivel');
    expect(p.local.ofertas).toBe(ofertas);
    expect(p.entrada.soltarTudo).toHaveBeenCalledTimes(2);
  });
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

describe('interações da arena com autoridade', () => {
  function preparar() {
    const p = fixture();
    const interacoes = new InteracoesMapa(p.cena, 'jardim');
    interno(p).interacoesMapa = interacoes;
    return { p, interacoes };
  }
  it.each(['fonte', 'totem', 'cofre'] as const)(
    '%s concede benefício uma vez e exige proximidade',
    (tipo) => {
      const { p, interacoes } = preparar();
      const ponto = interacoes.listar().find((i) => i.tipo === tipo)!;
      p.local.vida = 10;
      const vidaMax = p.local.atributos.vidaMaxima;
      expect(p.interagirMapa()).toBe(false);
      p.local.x = ponto.x;
      p.local.z = ponto.z;
      expect(p.interacaoAtual?.id).toBe(ponto.id);
      expect(p.interagirMapa()).toBe(true);
      if (tipo === 'fonte') expect(p.local.vida).toBeCloseTo(10 + vidaMax * 0.35);
      if (tipo === 'totem') expect(p.local.invencivel).toBe(6);
      if (tipo === 'cofre') expect(p.local.rerrolagens).toBe(3);
      expect(p.interagirMapa()).toBe(false);
      expect(interacoes.snapshot().consumidas).toEqual([ponto.id]);
      p.estado = 'pausa';
      expect(p.interagirMapa()).toBe(false);
      interacoes.descartar();
    }
  );
  it('convidado pede interação sem consumir nem conceder benefícios', () => {
    const { p, interacoes } = preparar();
    const fonte = interacoes.listar().find((i) => i.tipo === 'fonte')!;
    p.local.x = fonte.x;
    p.local.z = fonte.z;
    p.local.vida = 10;
    p.papel = 'convidado';
    const acao = vi.fn();
    p.rede = { acao } as never;
    expect(p.interagirMapa()).toBe(true);
    expect(acao).toHaveBeenCalledWith('interagir');
    expect(p.local.vida).toBe(10);
    expect(interacoes.snapshot().consumidas).toEqual([]);
    expect(p.interagirMapa(1)).toBe(false);
    interacoes.descartar();
  });
  it('host valida distância remota e replica consumo e rerrolagem sem esperar o próximo nível', () => {
    const { p: host, interacoes } = preparar();
    const { p: guest, interacoes: interacoesGuest } = preparar();
    host.papel = 'anfitriao';
    guest.papel = 'convidado';
    const cofre = interacoes.listar().find((i) => i.tipo === 'cofre')!;
    expect(host.executarAcaoRemota(1, 'interagir')).toBe(false);
    host.jogadores[1].x = cofre.x;
    host.jogadores[1].z = cofre.z;
    expect(host.executarAcaoRemota(1, 'interagir')).toBe(true);
    expect(host.executarAcaoRemota(1, 'interagir')).toBe(false);
    guest.importarEstado(host.exportarEstado());
    expect(guest.jogadores[1].rerrolagens).toBe(3);
    expect(interacoesGuest.snapshot()).toEqual(interacoes.snapshot());
    interacoes.descartar();
    interacoesGuest.descartar();
  });
});
