/**
 * Sessão multijogador: o anfitrião roda a partida "de verdade" (inimigos, cristais,
 * experiência, vida) e manda o estado para os convidados; cada aparelho manda a
 * posição do seu próprio jogador. Todos simulam as habilidades localmente, então os
 * efeitos aparecem completos em todas as telas.
 */
import { PERSONAGENS, type IdPersonagem } from '../dados/personagens';
import { MAX_JOGADORES } from '../jogo/jogador';
import type { GanchosRede, Partida } from '../jogo/partida';
import { normalizarNome, type ArmaInicial } from '../nucleo/conta';
import { MAPAS, mapa, mapaDesbloqueado, type IdMapa } from '../dados/mapas';
import { normalizarPersonalizacao, type Personalizacao } from '../../render/personalizacao';
import type { Canal, Mensagem } from './canal';

export interface MembroSala {
  indice: number;
  personagem: IdPersonagem;
  nome?: string;
  visual?: Personalizacao;
  arma?: ArmaInicial;
  xpConta?: number;
}

/** Perfil de rede tratado como entrada externa, inclusive em salas locais. */
export function validarPerfil(value: unknown, indice: number): MembroSala {
  const v =
    value && typeof value === 'object' && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};
  const def = PERSONAGENS.find((d) => d.id === v.personagem) ?? PERSONAGENS[0];
  return {
    indice,
    personagem: def.id,
    nome: normalizarNome(v.nome),
    visual: normalizarPersonalizacao(v.visual, def.cor),
    arma: v.arma === 'cajado' || v.arma === 'martelo' ? v.arma : 'lamina',
    xpConta:
      typeof v.xpConta === 'number' && Number.isFinite(v.xpConta)
        ? Math.max(0, Math.min(Number.MAX_SAFE_INTEGER, Math.floor(v.xpConta)))
        : 0,
  };
}

function validarMembros(value: unknown): MembroSala[] {
  if (!Array.isArray(value)) return [];
  const indices = new Set<number>();
  return value.slice(0, MAX_JOGADORES).flatMap((v: unknown) => {
    const indice = v && typeof v === 'object' ? (v as Record<string, unknown>).indice : undefined;
    if (
      typeof indice !== 'number' ||
      !Number.isInteger(indice) ||
      indice < 0 ||
      indice >= MAX_JOGADORES ||
      indices.has(indice)
    )
      return [];
    indices.add(indice);
    return [validarPerfil(v, indice)];
  });
}

export class Sessao {
  /** Anfitrião: canal de cada convidado. Convidado: canal 0 = anfitrião. */
  private canais = new Map<number, Canal>();
  membros: MembroSala[] = [];
  meuIndice = 0;
  /** Alguma mudança na sala (para a interface redesenhar). */
  aoMudar: () => void = () => {};
  /** O anfitrião saiu ou a conexão caiu (convidado). */
  aoEncerrar: (motivo: string) => void = () => {};
  private tPos = 0;
  private tEstado = 0;
  private tCristais = 0;
  private encerrada = false;

  constructor(
    private partida: Partida,
    readonly papel: 'anfitriao' | 'convidado'
  ) {
    if (papel === 'anfitriao') this.membros = [this.perfilLocal()];
  }

  get emPartida(): boolean {
    return this.partida.rede === this.ganchos;
  }

  numeroConectados(): number {
    return this.membros.length;
  }

  // ------------------------------------------------------------------ anfitrião

  /** Um novo convidado conectou (WebRTC ou servidor local). */
  adicionarConvidado(canal: Canal): void {
    if (this.papel !== 'anfitriao') return;
    let indice = -1;
    for (let k = 1; k < MAX_JOGADORES; k++)
      if (!this.membros.some((m) => m.indice === k)) {
        indice = k;
        break;
      }
    if (indice < 0 || this.emPartida) {
      canal.enviar({
        t: 'recusado',
        motivo: indice < 0 ? 'A sala está cheia (4 jogadores).' : 'A partida já começou.',
      });
      setTimeout(() => canal.fechar(), 300);
      return;
    }
    this.canais.set(indice, canal);
    this.membros.push({ indice, personagem: 'claude' });
    canal.aoMensagem = (m) => {
      if (this.canais.get(indice) === canal) this.doConvidado(indice, m);
    };
    canal.aoFechar = () => {
      if (this.canais.get(indice) === canal) this.convidadoSaiu(indice);
    };
    canal.enviar({ t: 'boasvindas', indice });
    this.mandarSala();
    this.partida.audio.tocar('uiConfirmar');
    this.aoMudar();
  }

  private convidadoSaiu(indice: number): void {
    if (!this.canais.has(indice)) return;
    this.canais.delete(indice);
    this.membros = this.membros.filter((m) => m.indice !== indice);
    if (this.emPartida) this.partida.removerJogador(indice);
    this.mandarSala();
    this.aoMudar();
  }

  private doConvidado(indice: number, m: Mensagem): void {
    if (!this.canais.has(indice)) return;
    const p = this.partida;
    switch (m.t) {
      case 'perfil': {
        const membro = this.membros.find((x) => x.indice === indice);
        if (membro && !this.emPartida) Object.assign(membro, validarPerfil(m, indice));
        this.mandarSala();
        this.aoMudar();
        break;
      }
      case 'eu':
        if (this.emPartida && m.fase === p.identificadorFase && Array.isArray(m.j)) {
          const pos = m.j.find((v: unknown) => Array.isArray(v) && v[0] === indice);
          if (
            Array.isArray(pos) &&
            pos.length >= 8 &&
            pos.slice(0, 8).every((v: unknown) => typeof v === 'number' && Number.isFinite(v))
          )
            p.importarPosicoes([pos.slice(0, 8)]);
        }
        break;
      case 'acao':
        if (this.emPartida && (m.tipo === 'ataque' || m.tipo === 'avanco'))
          p.executarAcaoRemota(indice, m.tipo);
        break;
      case 'escolha':
        if (this.emPartida) p.escolhaRemota(indice, Number(m.i));
        break;
      case 'rerrolar':
        if (this.emPartida) p.rerrolarRemoto(indice);
        break;
    }
  }

  private mandarSala(): void {
    this.transmitir({ t: 'sala', membros: this.membros, mapaId: this.partida.mapaId });
  }

  private perfilLocal(): MembroSala {
    const p = this.partida;
    return validarPerfil(
      {
        personagem: p.personagemId,
        nome: p.conta.dados.nome,
        visual: p.conta.visual(p.personagemId),
        arma: p.conta.dados.armaInicial,
        xpConta: p.conta.dados.xp,
      },
      this.meuIndice
    );
  }

  atualizarPerfil(): void {
    const perfil = this.perfilLocal();
    const eu = this.membros.find((m) => m.indice === this.meuIndice);
    if (eu) Object.assign(eu, perfil);
    if (this.papel === 'anfitriao') this.mandarSala();
    else this.canais.get(0)?.enviar({ ...perfil, t: 'perfil' });
    this.aoMudar();
  }

  trocarPersonagem(_id: IdPersonagem): void {
    this.atualizarPerfil();
  }

  motivoBloqueioMapa(id: IdMapa): string {
    if (!MAPAS.some((m) => m.id === id)) return 'Mundo desconhecido';
    const faltam = this.membros.filter((m) => !mapaDesbloqueado(id, m.xpConta ?? 0));
    return faltam.length
      ? `${faltam.map((m) => m.nome ?? `J${m.indice + 1}`).join(', ')} precisa de ${mapa(id).xpNecessario} XP de conta`
      : '';
  }

  selecionarMapa(id: IdMapa): boolean {
    if (this.papel !== 'anfitriao' || this.emPartida || this.motivoBloqueioMapa(id)) return false;
    if (!this.partida.selecionarMapa(id)) return false;
    this.mandarSala();
    this.aoMudar();
    return true;
  }

  /** Anfitrião: começa (ou recomeça) a partida com quem está na sala. */
  iniciarPartida(): void {
    if (this.papel !== 'anfitriao') return;
    const p = this.partida;
    this.atualizarPerfil();
    if (this.motivoBloqueioMapa(p.mapaId)) return;
    p.configurarJogadores(this.membros, 0, 'anfitriao');
    p.rede = this.ganchos;
    p.iniciar();
    this.transmitir({ t: 'iniciar', membros: this.membros, mapaId: p.mapaId });
    this.transmitir(p.exportarNivel());
    this.transmitir(p.exportarCristais());
    this.transmitir(p.exportarEstado());
  }

  private transmitir(m: Mensagem, rapido = false): void {
    for (const c of this.canais.values()) c.enviar(m, rapido);
  }

  // ------------------------------------------------------------------ convidado

  /** Convidado: conectou ao anfitrião. */
  conectar(canal: Canal): void {
    this.canais.set(0, canal);
    canal.aoMensagem = (m) => this.doAnfitriao(m);
    canal.aoFechar = () => this.encerrar('A conexão com o anfitrião caiu.');
  }

  private doAnfitriao(m: Mensagem): void {
    const p = this.partida;
    switch (m.t) {
      case 'boasvindas':
        if (
          typeof m.indice !== 'number' ||
          !Number.isInteger(m.indice) ||
          m.indice < 1 ||
          m.indice >= MAX_JOGADORES
        )
          return;
        this.meuIndice = m.indice;
        this.atualizarPerfil();
        this.aoMudar();
        break;
      case 'recusado':
        this.encerrar(String(m.motivo ?? 'O anfitrião recusou a entrada.'));
        break;
      case 'sala':
        this.membros = validarMembros(m.membros);
        if (MAPAS.some((mapa) => mapa.id === m.mapaId)) p.aplicarMapaRemoto(m.mapaId as IdMapa);
        this.aoMudar();
        break;
      case 'iniciar':
        this.membros = validarMembros(m.membros);
        if (MAPAS.some((mapa) => mapa.id === m.mapaId)) p.aplicarMapaRemoto(m.mapaId as IdMapa);
        p.configurarJogadores(this.membros, this.meuIndice, 'convidado');
        p.rede = this.ganchos;
        p.iniciar();
        break;
      case 'estado':
        if (this.emPartida) p.importarEstado(m);
        break;
      case 'cristais':
        if (this.emPartida) p.importarCristais(m);
        break;
      case 'pos':
        if (this.emPartida && m.fase === p.identificadorFase && Array.isArray(m.j))
          p.importarPosicoes(m.j as number[][]);
        break;
      case 'nivel':
        if (this.emPartida) p.importarNivel(m);
        break;
      case 'menu':
        if (this.emPartida) {
          p.rede = null;
          p.voltarMenu();
        }
        this.atualizarPerfil();
        this.aoMudar();
        break;
      case 'fechar':
        this.encerrar('O anfitrião fechou a sala.');
        break;
    }
  }

  // ------------------------------------------------------------------ comum

  /** Ganchos chamados pela partida durante o jogo. */
  readonly ganchos: GanchosRede = {
    aposPasso: (dt) => {
      const p = this.partida;
      this.tPos += dt;
      this.tEstado += dt;
      this.tCristais += dt;
      if (this.tPos >= 1 / 20) {
        this.tPos = 0;
        if (this.papel === 'anfitriao')
          this.transmitir(
            { t: 'pos', fase: p.identificadorFase, j: p.exportarPosicoes(false) },
            true
          );
        else
          this.canais
            .get(0)
            ?.enviar({ t: 'eu', fase: p.identificadorFase, j: p.exportarPosicoes(true) }, true);
      }
      if (this.papel !== 'anfitriao') return;
      if (this.tEstado >= 0.2) {
        this.tEstado = 0;
        this.transmitir(p.exportarEstado());
      }
      if (this.tCristais >= 1) {
        this.tCristais = 0;
        this.transmitir(p.exportarCristais());
      }
    },
    nivelAberto: () => {
      if (this.papel === 'anfitriao') this.transmitir(this.partida.exportarNivel());
    },
    escolha: (i) => this.canais.get(0)?.enviar({ t: 'escolha', i }),
    acao: (tipo) => this.canais.get(0)?.enviar({ t: 'acao', tipo }),
    rerrolar: () => this.canais.get(0)?.enviar({ t: 'rerrolar' }),
    fim: () => {
      if (this.papel === 'anfitriao') this.transmitir(this.partida.exportarEstado());
    },
  };

  /** Anfitrião voltou ao menu da sala (todos voltam para o lobby). */
  voltarParaSala(): void {
    if (this.papel === 'anfitriao') this.transmitir({ t: 'menu' });
    this.partida.rede = null;
    this.partida.voltarMenu();
    this.atualizarPerfil();
    this.aoMudar();
  }

  private encerrar(motivo: string): void {
    if (this.encerrada) return;
    this.encerrada = true;
    for (const c of this.canais.values()) c.fechar();
    this.canais.clear();
    this.partida.rede = null;
    if (this.partida.estado !== 'menu') this.partida.voltarMenu();
    this.partida.modoSolo();
    this.aoEncerrar(motivo);
  }

  /** Sai da sala (anfitrião fecha para todos). */
  sair(): void {
    if (this.papel === 'anfitriao') this.transmitir({ t: 'fechar' });
    setTimeout(() => this.encerrar('Você saiu da sala.'), 100);
  }
}
