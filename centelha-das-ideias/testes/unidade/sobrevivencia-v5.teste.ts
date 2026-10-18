import { describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import {
  INIMIGOS,
  taxaSurgimento,
  multVida,
  multDano,
  multVelocidade,
  tempoBase,
  INTERVALO_HORDA,
} from '../../src/roguelike/dados/inimigos';
import {
  TEMPO_MINICHEFE,
  TEMPO_MEGACHEFE,
  marcoCampanha,
  novoCiclo,
} from '../../src/roguelike/nucleo/campanha';
import { xpParaNivel } from '../../src/roguelike/nucleo/progresso';
import {
  formarBando,
  passoAve,
  avePodeSair,
  intervaloBando,
  PRIMEIRO_BANDO,
  AVISO_BANDO,
} from '../../src/roguelike/jogo/bando-aves';
import { Partida } from '../../src/roguelike/jogo/partida';
import { InteracoesMapa } from '../../src/roguelike/jogo/interacoes-mapa';

describe('ritmo prolongado da sobrevivência', () => {
  it('reserva cinco minutos ao mini e doze ao mega em cada mapa', () => {
    expect([TEMPO_MINICHEFE, TEMPO_MEGACHEFE, INTERVALO_HORDA]).toEqual([300, 720, 120]);
    const ciclo = novoCiclo();
    expect(marcoCampanha(299.9, ciclo)).toBeNull();
    expect(marcoCampanha(300, ciclo)).toBe('mini');
    ciclo.mini = true;
    expect(marcoCampanha(719.9, ciclo)).toBeNull();
    expect(marcoCampanha(720, ciclo)).toBe('mega');
  });
  it('cresce em tempo dilatado sem apagar a pressão de uma partida longa', () => {
    expect(tempoBase(720)).toBe(320);
    expect(taxaSurgimento(720)).toBeCloseTo(0.75 + 320 / 42 + (320 / 150) ** 2 * 2.4);
    expect(multVida(720)).toBeCloseTo(1 + 320 / 160 + (320 / 360) ** 2);
    expect(multDano(720)).toBeCloseTo(1 + 320 / 360);
    expect(multVelocidade(0)).toBe(0.5);
    expect(multVida(1500)).toBeGreaterThan(multVida(720));
    expect(xpParaNivel(1)).toBe(5);
    expect(xpParaNivel(3)).toBe(Math.round(5 + 2 * 6 + 2 ** 1.8 * 1.3));
    expect(xpParaNivel(12)).toBe(Math.round((5 + 11 * 6 + 11 ** 1.8 * 1.3) * 1.7));
  });
  it('cada mapa possui um guardião e uma mecânica própria', () => {
    const chefes = [
      'arvoreAncia',
      'golemForja',
      'polvoAbissal',
      'corujaAurora',
      'caranguejoCoral',
    ] as const;
    expect(new Set(chefes.map((id) => INIMIGOS[id].arquetipoChefe)).size).toBe(5);
    for (const id of chefes) expect(INIMIGOS[id].comportamento).toBe('chefe');
  });
});
describe('bandos que cruzam o mundo', () => {
  it('avisa por dois segundos e varia o intervalo em torno de150 segundos', () => {
    expect(PRIMEIRO_BANDO).toBe(65);
    expect(AVISO_BANDO).toBe(2);
    expect([intervaloBando(0), intervaloBando(0.5), intervaloBando(1)]).toEqual([135, 150, 165]);
  });
  it('mantém formação em V e a mesma rota em coordenadas distantes', () => {
    const aves = formarBando(10000, -17000, 0, 18);
    expect(aves.length).toBe(18);
    expect(aves[1].x).toBe(aves[2].x);
    expect(aves[1].z + aves[2].z).toBe(-34000);
    const diferencas = aves.map((a) => [a.x - aves[0].x, a.z - aves[0].z]);
    for (const a of aves) passoAve(a, 80);
    aves.forEach((a, k) => {
      expect(a.x - aves[0].x).toBeCloseTo(diferencas[k][0]);
      expect(a.z - aves[0].z).toBeCloseTo(diferencas[k][1]);
      expect(a.dx).toBe(1);
      expect(a.dz).toBe(0);
    });
    expect(avePodeSair(aves[0], [{ x: 10000, z: -17000 }])).toBe(false);
    passoAve(aves[0], 25);
    expect(avePodeSair(aves[0], [{ x: aves[0].x, z: aves[0].z }])).toBe(false);
    expect(avePodeSair(aves[0], [{ x: 10000, z: -17000 }])).toBe(true);
  });
});
describe('recursos renovados pela exploração, consumo permanente', () => {
  it('descarrega objetos, preserva o consumo ao voltar e sincroniza em outro aparelho', () => {
    const cena = new THREE.Scene(),
      a = new InteracoesMapa(cena, 'jardim');
    const origem = { id: 'jardim:900,-700:cofre', tipo: 'cofre', x: 28800, z: -22400 };
    a.sincronizar([origem]);
    expect(a.usar(origem.id)).toBe(true);
    a.sincronizar([{ id: 'jardim:901,-700:fonte', tipo: 'fonte', x: 28832, z: -22400 }]);
    expect(a.listar()).toHaveLength(1);
    a.sincronizar([origem]);
    expect(a.usar(origem.id)).toBe(false);
    const estado = a.snapshot();
    expect(estado.consumidas).toContain(origem.id);
    const b = new InteracoesMapa(cena, 'jardim');
    b.sincronizar([origem]);
    b.importar(estado);
    expect(b.usar(origem.id)).toBe(false);
    expect(b.proxima(origem.x, origem.z)).toBeNull();
    a.reset();
    expect(a.usar(origem.id)).toBe(true);
    a.descartar();
    b.descartar();
  });
});

describe('guardiões com ataques distintos e leitura antes do dano', () => {
  it.each([
    'arvoreAncia',
    'golemForja',
    'polvoAbissal',
    'corujaAurora',
    'caranguejoCoral',
  ] as const)('%s agenda perigos e respeita a autoridade do anfitrião', (id) => {
    const jogador = { x: 10, z: 0 };
    const avisos: { x: number; z: number; r: number; tempo: number; acao: () => void }[] = [];
    const p: any = Object.assign(Object.create(Partida.prototype), {
      local: jogador,
      j: jogador,
      jogadores: [jogador],
      papel: 'anfitriao',
      ativos: () => [jogador],
      aviso: (x: number, z: number, r: number, tempo: number, _cor: string, acao: () => void) =>
        avisos.push({ x, z, r, tempo, acao }),
      danoJogador: vi.fn(),
      criarPocaInimiga: vi.fn(),
      criarInimigo: vi.fn(),
      fx: { impacto: vi.fn() },
      mostrarBanner: vi.fn(),
      tremer: vi.fn(),
      som: vi.fn(),
    });
    const inimigo = {
      def: INIMIGOS[id],
      x: 0,
      z: 0,
      dano: 23,
      recarga: 0,
      congelado: 0,
      atordoado: 0,
    };
    p.ataqueChefe(inimigo, 0.1, 10, 10, 0);
    expect(avisos.length).toBeGreaterThan(1);
    expect(avisos.every((a) => a.tempo >= 0.8 && Number.isFinite(a.x + a.z + a.r))).toBe(true);
    expect(p.danoJogador).not.toHaveBeenCalled();
    if (id === 'arvoreAncia') expect(avisos.map((a) => a.x)).toEqual([2, 4, 6, 8, 10]);
    if (id === 'golemForja') expect(avisos).toHaveLength(9);
    if (id === 'polvoAbissal') {
      p.ataqueChefe(inimigo, 0.2, 10, 10, 0);
      expect(jogador.x).toBeLessThan(10);
    }
    if (id === 'corujaAurora') expect(avisos).toHaveLength(10);
    if (id === 'caranguejoCoral') expect(p.criarInimigo).toHaveBeenCalledTimes(2);
    p.papel = 'convidado';
    for (const a of avisos) a.acao();
    expect(p.danoJogador).not.toHaveBeenCalled();
  });
});

describe('regressões da revisão do mundo infinito', () => {
  it('recursos de IDs anteriormente colidentes continuam independentes', () => {
    const a = new InteracoesMapa(new THREE.Scene(), 'jardim');
    const fonte = { id: 'jardim:4,31:fonte', tipo: 'fonte', x: 128, z: 992 };
    const cofre = { id: 'jardim:5,44:cofre', tipo: 'cofre', x: 160, z: 1408 };
    a.sincronizar([fonte]);
    expect(a.usar(fonte.id)).toBe(true);
    a.sincronizar([cofre]);
    expect(a.usar(cofre.id)).toBe(true);
    expect(a.snapshot().consumidas).toEqual([fonte.id, cofre.id]);
    a.descartar();
  });
  it('limita cristais a2200 e conserva todo o XP de drops mesmo com tiers enormes', () => {
    const p: any = Object.assign(Object.create(Partida.prototype), {
      cristais: Array.from({ length: 2200 }, (_, k) => ({
        x: k * 4,
        z: 0,
        t: 3,
        atraido: false,
        fase: 0,
      })),
      rnd: () => 0.5,
    });
    for (let k = 0; k < 100; k++) p.soltarCristal(20000 + k, 30000, 3);
    expect(p.cristais).toHaveLength(2200);
    expect(p.cristais.reduce((total: number, c: any) => total + (c.valor ?? 60), 0)).toBe(
      2300 * 60
    );
    const convidado: any = Object.create(Partida.prototype);
    convidado.importarCristais(p.exportarCristais());
    expect(convidado.cristais.reduce((total: number, c: any) => total + (c.valor ?? 60), 0)).toBe(
      2300 * 60
    );
  });
  it('libera geometrias e materiais próprios dos itens sem liberar textura compartilhada', () => {
    const cena = new THREE.Scene(),
      grupo = new THREE.Group(),
      geo = new THREE.BoxGeometry(),
      mat = new THREE.MeshBasicMaterial();
    const textura = new THREE.Texture();
    mat.map = textura;
    grupo.add(new THREE.Mesh(geo, mat));
    cena.add(grupo);
    const gd = vi.spyOn(geo, 'dispose'),
      md = vi.spyOn(mat, 'dispose'),
      td = vi.spyOn(textura, 'dispose');
    const p: any = Object.create(Partida.prototype);
    p.liberarItem({ malha: grupo });
    expect(gd).toHaveBeenCalledOnce();
    expect(md).toHaveBeenCalledOnce();
    expect(td).not.toHaveBeenCalled();
    expect(cena.children).toHaveLength(0);
    expect(grupo.children).toHaveLength(0);
  });
});

it('limita snapshots de consumo a32768 IDs exatos preservando os mais recentes', () => {
  const a = new InteracoesMapa(new THREE.Scene(), 'jardim');
  a.importar({
    dinamica: true,
    consumidas: Array.from({ length: 32770 }, (_, k) => `jardim:${k},0:cofre`),
  });
  const estado = a.snapshot();
  expect(estado.consumidas).toHaveLength(32768);
  expect(estado.consumidas[0]).toBe('jardim:2,0:cofre');
  expect(estado.consumidas.at(-1)).toBe('jardim:32769,0:cofre');
  a.descartar();
});
