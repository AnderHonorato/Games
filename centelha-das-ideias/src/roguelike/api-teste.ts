/**
 * API de teste do modo Sobrevivência (window.__sobrevivencia), usada pelas sondas
 * automatizadas com navegador. Não altera o jogo se ninguém chamar.
 */
import { pontosInteracoesMapa } from './jogo/interacoes-mapa';
import { ataqueBasico } from './dados/ataques-basicos';
import type { Personalizacao } from '../render/personalizacao';
import type { IdMapa } from './dados/mapas';
import type { ArmaInicial } from './nucleo/conta';
import { parDeCanais, type Canal } from './rede/canal';
import type { IdPersonagem } from './dados/personagens';
import type { Partida, Cristal } from './jogo/partida';
import type { InterfaceSobrevivencia } from './ui';

export function instalarApiSobrevivencia(p: Partida, ui?: InterfaceSobrevivencia): void {
  let convite: { codigo: string; aceitar: (r: string) => Promise<void> } | null = null;
  const api = {
    estado: () => ({
      estado: p.estado,
      pausaLocal: p.pausaLocal,
      movimento: p.entrada.movimento(),
      ataqueBasico: { ...ataqueBasico(p.personagemId) },
      interacaoAtual: p.interacaoAtual,
      invencivel: p.local.invencivel,
      rerrolagens: p.local.rerrolagens,
      personagem: p.personagemId,
      nome: p.conta.dados.nome,
      xpConta: p.conta.dados.xp,
      mapa: p.mapaId,
      arma: p.local.arma,
      visual: { ...p.local.visual },
      recargaAtaque: p.local.recargaAtaque,
      cinematica: p.cinematica ? { ...p.cinematica } : null,
      vida: p.vida,
      vidaMax: p.atributos.vidaMaxima,
      nivel: p.nivel,
      xp: p.xp,
      xpProximo: p.xpProximo,
      tempo: p.tempo,
      abates: p.abates,
      x: p.x,
      y: p.local.y,
      z: p.z,
      voo: p.local.def.voo ?? 0,
      build: JSON.parse(JSON.stringify(p.build)),
      ofertas: p.ofertas.map((o) => ({ ...o })),
      chefe: p.chefeAtual ? { vida: p.chefeAtual.vida, vidaMax: p.chefeAtual.vidaMax } : null,
      mundo: p.arena.estadoMundo(),
      recursos: {
        geometrias: p.renderizador.info.memory.geometries,
        texturas: p.renderizador.info.memory.textures,
        drawCalls: p.renderizador.info.render.calls,
      },
      ...p.contagem(),
    }),
    personagem: (id: IdPersonagem) => {
      p.escolherPersonagem(id);
      ui?.sala.sessao?.atualizarPerfil();
    },
    nome: (nome: string) => {
      p.definirNome(nome);
      ui?.sala.sessao?.atualizarPerfil();
    },
    visual: (v: Partial<Personalizacao>) => {
      p.personalizar(v);
      ui?.sala.sessao?.atualizarPerfil();
    },
    arma: (id: ArmaInicial) => {
      p.escolherArma(id);
      ui?.sala.sessao?.atualizarPerfil();
    },
    mapa: (id: IdMapa) =>
      ui?.sala.sessao ? ui.sala.sessao.selecionarMapa(id) : p.selecionarMapa(id),
    contaXp: (valor: number) => {
      p.conta.ganharXp(valor);
      ui?.sala.sessao?.atualizarPerfil();
      ui?.atualizar();
    },
    atacar: () => p.atacarManual(),
    interagir: () => p.interagirMapa(),
    cristaisTeste: () => {
      const internos = p as unknown as { cristais: Cristal[] };
      internos.cristais = [0, 1, 2, 3].map((t) => ({
        x: p.local.x - 4 + t * 2.7,
        z: p.local.z - 5,
        t,
        atraido: false,
        fase: t,
      }));
    },
    pontosInteracoes: () => pontosInteracoesMapa(p.mapaId, p.arena.obstaculos),
    vidaTeste: (vida: number) => {
      p.vida = Math.max(1, Math.min(p.atributos.vidaMaxima, vida));
    },
    cinematicaTeste: () => {
      p.cinematica = {
        tipo: 'mini',
        nome: 'Sentinela de teste',
        fala: 'Sua centelha chegou longe.',
        tempo: 0,
        duracao: 3,
      };
      p.estado = 'cinematica';
      p.aoMudar();
      ui?.atualizar();
    },
    avanco: () => p.avancarEspecial(),
    avancar: (segundos: number) => {
      const total = Math.min(1200, Math.max(0, Number.isFinite(segundos) ? segundos : 0));
      for (let t = 0; t < total; t += 1 / 60) p.passo(Math.min(1 / 60, total - t));
      ui?.atualizar();
    },
    derrotarChefes: () => {
      const internos = p as unknown as {
        inimigos: { vivo: boolean; vida: number; def: { comportamento: string } }[];
      };
      for (const i of internos.inimigos)
        if (i.vivo && (i.def.comportamento === 'chefe' || i === p.chefeAtual)) i.vida = 0;
      p.passo(1 / 60);
      ui?.atualizar();
    },
    iniciar: (id?: IdPersonagem) => {
      if (id) p.escolherPersonagem(id);
      p.iniciar();
    },
    escolher: (i: number) => p.escolherOferta(i),
    rerrolar: () => p.rerrolar(),
    xp: (v: number) => p.depurarXp(v),
    habilidade: (id: string, nivel = 1) => p.depurarHabilidade(id, nivel),
    tempo: (t: number) => p.depurarTempo(t),
    inimigo: (id: string, n = 1, dist = 7) => p.depurarInimigo(id as never, n, dist),
    ataqueChefe: (tipo: string) => p.depurarAtaqueChefe(tipo as never),
    invencivel: (s = 9999) => {
      p.invencivel = s;
    },
    curar: () => {
      p.vida = p.atributos.vidaMaxima;
    },
    joystick: (x: number, y: number) => p.entrada.definirJoystick(x, y),
    posicionar: (x: number, z: number) => {
      p.local.x = x;
      p.local.z = z;
      p.local.vx = p.local.vz = 0;
      Object.assign(p.local.rede, { x, z, vx: 0, vz: 0 });
    },
    pausar: (v: boolean) => p.pausar(v),
    menu: () => p.voltarMenu(),
    relatorio: () => p.relatorio(),
    direcaoRobo: () => p.depurarDirecao(),
    // multijogador
    mpReceberMemoria: (canal: Canal) => ui?.sala.conectarEmMemoria(canal, false),
    mpMemoriaComOutraJanela: (outra: { mpReceberMemoria: (canal: Canal) => void }) => {
      const [host, guest] = parDeCanais();
      outra.mpReceberMemoria(guest);
      ui?.sala.conectarEmMemoria(host, true);
    },
    mpCriarSala: async () => {
      await ui?.sala.hospedar();
    },
    mpConvite: async () => {
      convite = (await ui?.sala.gerarConvite()) ?? null;
      return convite?.codigo ?? '';
    },
    mpAceitar: async (resposta: string) => {
      await convite?.aceitar(resposta);
    },
    mpEntrar: async (codigo: string) => (await ui?.sala.entrarComConvite(codigo)) ?? '',
    mpEntrarLan: async () => {
      await ui?.sala.entrarRedeLocal();
    },
    mpIniciar: () => ui?.sala.sessao?.iniciarPartida(),
    mpSala: () => {
      const s = ui?.sala.sessao;
      return s ? { papel: s.papel, membros: s.membros, meuIndice: s.meuIndice } : null;
    },
    mpJogadores: () =>
      p.jogadores.map((jg) => ({
        indice: jg.indice,
        local: jg.local,
        personagem: jg.personagemId,
        nome: jg.nome,
        visual: { ...jg.visual },
        arma: jg.arma,
        x: Math.round(jg.x * 10) / 10,
        z: Math.round(jg.z * 10) / 10,
        vida: Math.round(jg.vida),
        caido: jg.caido,
        escolheu: jg.escolheu,
        ativas: jg.build.ativas.map((a) => `${a.id}:${a.nivel}`),
        passivas: jg.build.passivas.map((a) => `${a.id}:${a.nivel}`),
      })),
    mpEscolher: (i: number) => p.escolherOferta(i),
  };
  (window as unknown as { __sobrevivencia: typeof api }).__sobrevivencia = api;
}
