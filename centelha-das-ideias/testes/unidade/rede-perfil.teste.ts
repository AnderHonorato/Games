import { describe, expect, it, vi } from 'vitest';
import { Sessao, validarPerfil } from '../../src/roguelike/rede/sessao';
import { parDeCanais } from '../../src/roguelike/rede/canal';
import { Conta } from '../../src/roguelike/nucleo/conta';
import type { Partida } from '../../src/roguelike/jogo/partida';

function partida(nome: string, xp = 0) {
  const conta = new Conta(null);
  conta.definirNome(nome);
  conta.ganharXp(xp);
  const p = {
    conta,
    personagemId: 'claude',
    local: { personagemId: 'claude' },
    mapaId: 'jardim',
    get identificadorFase() {
      return `campanha-teste:${this.mapaId}`;
    },
    estado: 'menu',
    rede: null,
    audio: { tocar: vi.fn() },
    voltarMenu: vi.fn(),
    configurarJogadores: vi.fn(),
    iniciar: vi.fn(),
    importarPosicoes: vi.fn(),
    exportarPosicoes: () => [[1, 4, 5, 0, 0, 0, 0, 0]],
    executarAcaoRemota: vi.fn(),
    removerJogador: vi.fn(),
    exportarNivel: () => ({ t: 'nivel' }),
    exportarEstado: () => ({ t: 'estado' }),
    exportarCristais: () => ({ t: 'cristais' }),
    importarEstado: vi.fn(),
    importarCristais: vi.fn(),
    importarNivel: vi.fn(),
    selecionarMapa(id: string) {
      const ok = conta.selecionarMapa(id);
      if (ok) this.mapaId = id;
      return ok;
    },
    aplicarMapaRemoto(id: string) {
      this.mapaId = id;
    },
  };
  return p as unknown as Partida;
}
const drenar = async () => {
  for (let k = 0; k < 6; k++) await Promise.resolve();
};

function conectar(host: Sessao, guest: Sessao) {
  const [a, b] = parDeCanais();
  guest.conectar(b);
  host.adicionarConvidado(a);
  return b;
}

describe('perfis e comandos da sala', () => {
  it('normaliza nomes e aplica allowlist em todos os dados cosméticos', () => {
    const m = validarPerfil(
      {
        personagem: '__proto__',
        nome: '<b>Ander</b>\u0000  Exemplo muito longo demais',
        arma: 'bomba',
        xpConta: Infinity,
        visual: {
          roupa: 'admin',
          cabeca: 'coroa',
          acessorio: 'asas',
          corCorpo: 'url(javascript:1)',
          corOlhos: '#abc',
        },
      },
      2
    );
    expect(m.indice).toBe(2);
    expect(m.personagem).toBe('claude');
    expect(m.nome).toBe('Ander Exemplo muito '.trim());
    expect(m.arma).toBe('lamina');
    expect(m.xpConta).toBe(0);
    expect(m.visual?.roupa).toBe('aventureiro');
    expect(m.visual?.corOlhos).toBe('#aabbcc');
    expect(m.visual?.corCorpo).toMatch(/^#[0-9a-f]{6}$/);
  });

  it('sincroniza nome, roupa e arma; exige o XP de todos para escolher e iniciar mapa', async () => {
    const ph = partida('Host', 600),
      pg = partida('Amigo');
    pg.conta.definirArma('cajado');
    pg.conta.definirVisual('claude', { roupa: 'mago', acessorio: 'asas' });
    const host = new Sessao(ph, 'anfitriao'),
      guest = new Sessao(pg, 'convidado');
    conectar(host, guest);
    await drenar();
    expect(host.membros[1]).toMatchObject({
      nome: 'Amigo',
      arma: 'cajado',
      visual: { roupa: 'mago', acessorio: 'asas' },
    });
    expect(host.selecionarMapa('forja')).toBe(false);
    expect(host.motivoBloqueioMapa('forja')).toContain('Amigo');
    pg.conta.ganharXp(200);
    guest.atualizarPerfil();
    await drenar();
    expect(host.selecionarMapa('forja')).toBe(true);
    await drenar();
    expect(pg.mapaId).toBe('forja');
    expect(guest.selecionarMapa('jardim')).toBe(false);
    host.iniciarPartida();
    await drenar();
    expect(ph.configurarJogadores).toHaveBeenCalledWith(
      expect.arrayContaining([expect.objectContaining({ nome: 'Amigo', arma: 'cajado' })]),
      0,
      'anfitriao'
    );
    expect(pg.configurarJogadores).toHaveBeenCalledWith(expect.any(Array), 1, 'convidado');
    expect(ph.iniciar).toHaveBeenCalledOnce();
    expect(pg.iniciar).toHaveBeenCalledOnce();
  });

  it('atualiza XP de ambos os perfis ao voltar da campanha para a sala', async () => {
    const ph = partida('Host', 200),
      pg = partida('Amigo');
    const host = new Sessao(ph, 'anfitriao'),
      guest = new Sessao(pg, 'convidado');
    conectar(host, guest);
    await drenar();
    host.iniciarPartida();
    await drenar();
    expect(host.motivoBloqueioMapa('forja')).toContain('Amigo');
    pg.conta.ganharXp(200);
    ph.conta.ganharXp(400);
    host.voltarParaSala();
    await drenar();
    expect(host.membros[1].xpConta).toBe(200);
    expect(guest.membros[0].xpConta).toBe(600);
    expect(host.motivoBloqueioMapa('forja')).toBe('');
    expect(host.selecionarMapa('forja')).toBe(true);
  });

  it('associa ação ao canal e rejeita posições de outro membro', async () => {
    const ph = partida('Host'),
      pg = partida('Amigo');
    const host = new Sessao(ph, 'anfitriao'),
      guest = new Sessao(pg, 'convidado');
    const canalGuest = conectar(host, guest);
    await drenar();
    host.iniciarPartida();
    await drenar();
    canalGuest.enviar({ t: 'acao', tipo: 'ataque', indice: 0 });
    canalGuest.enviar({ t: 'acao', tipo: 'destruir' });
    canalGuest.enviar({ t: 'eu', fase: pg.identificadorFase, j: [[0, 9, 9, 0, 0, 0, 0, 0]] });
    canalGuest.enviar({ t: 'eu', fase: pg.identificadorFase, j: [[1, 4, 5, 0, 0, 0, 0, 0]] });
    await drenar();
    expect(ph.executarAcaoRemota).toHaveBeenCalledExactlyOnceWith(1, 'ataque');
    expect(ph.importarPosicoes).toHaveBeenCalledExactlyOnceWith([[1, 4, 5, 0, 0, 0, 0, 0]]);
  });

  it('rejeita eu e pos antigos durante a troca de fase até o convidado receber o estado novo', async () => {
    const ph = partida('Host'),
      pg = partida('Amigo');
    const host = new Sessao(ph, 'anfitriao'),
      guest = new Sessao(pg, 'convidado');
    conectar(host, guest);
    await drenar();
    host.iniciarPartida();
    await drenar();

    // O anfitrião atravessou o portal, mas o snapshot ainda não chegou ao convidado.
    ph.aplicarMapaRemoto('forja');
    host.ganchos.aposPasso(0.05);
    guest.ganchos.aposPasso(0.05);
    await drenar();
    expect(ph.importarPosicoes).not.toHaveBeenCalled();
    expect(pg.importarPosicoes).not.toHaveBeenCalled();

    pg.aplicarMapaRemoto('forja');
    host.ganchos.aposPasso(0.05);
    guest.ganchos.aposPasso(0.05);
    await drenar();
    expect(ph.importarPosicoes).toHaveBeenCalledExactlyOnceWith([[1, 4, 5, 0, 0, 0, 0, 0]]);
    expect(pg.importarPosicoes).toHaveBeenCalledExactlyOnceWith([[1, 4, 5, 0, 0, 0, 0, 0]]);
  });

  it('descarta posições sem fase ou de outra campanha, mesmo no mesmo mapa', async () => {
    const ph = partida('Host'),
      pg = partida('Amigo');
    const host = new Sessao(ph, 'anfitriao'),
      guest = new Sessao(pg, 'convidado');
    const [a, b] = parDeCanais();
    guest.conectar(b);
    host.adicionarConvidado(a);
    await drenar();
    host.iniciarPartida();
    await drenar();
    for (const fase of [undefined, 'campanha-anterior:jardim']) {
      b.enviar({ t: 'eu', fase, j: [[1, 99, 99, 0, 0, 0, 0, 0]] });
      a.enviar({ t: 'pos', fase, j: [[0, 99, 99, 0, 0, 0, 0, 0]] });
    }
    await drenar();
    expect(ph.importarPosicoes).not.toHaveBeenCalled();
    expect(pg.importarPosicoes).not.toHaveBeenCalled();
  });

  it('não aplica mensagens atrasadas de um canal cujo índice foi reutilizado', async () => {
    const ph = partida('Host');
    const host = new Sessao(ph, 'anfitriao');
    const [antigo] = parDeCanais();
    host.adicionarConvidado(antigo);
    const mensagemAntiga = antigo.aoMensagem;
    const fechamentoAntigo = antigo.aoFechar;
    antigo.fechar();
    const guest = new Sessao(partida('Novo amigo'), 'convidado');
    conectar(host, guest);
    await drenar();
    host.iniciarPartida();
    await drenar();
    mensagemAntiga({
      t: 'eu',
      fase: ph.identificadorFase,
      j: [[1, 99, 99, 0, 0, 0, 0, 0]],
    });
    fechamentoAntigo();
    expect(ph.importarPosicoes).not.toHaveBeenCalled();
    expect(host.membros).toHaveLength(2);
    expect(host.membros[1].nome).toBe('Novo amigo');
  });
});
