import { describe, expect, it } from 'vitest';
import { SimulacaoMoba } from '../../src/moba/simulacao';
import { HEROIS_MOBA, ITENS_MOBA } from '../../src/moba/dados';
import { BASES_MOBA, comprimentoRota, pontoRota, progressoRota } from '../../src/moba/rotas';
import type { EstruturaMoba, HeroiMoba, UnidadeMoba } from '../../src/moba/tipos';

/** Fixtures only expose the pure engine's internal damage and XP boundaries. */
type Internos = {
  proximaIA: number;
  proximaOnda: number;
  buffAte: [number, number];
  zonas: unknown[];
  aggro: Map<number, unknown>;
  contribuicoes: Map<number, unknown>;
  vulneravel(e: EstruturaMoba): boolean;
  ferir(a: UnidadeMoba | EstruturaMoba, dano: number, dono: number, magia: boolean): void;
  ganharXp(h: HeroiMoba, xp: number): void;
};
const interno = (sim: SimulacaoMoba) => sim as unknown as Internos;
function partida(id = 'brasa', time: 0 | 1 = 0) {
  const sim = new SimulacaoMoba();
  sim.iniciar(id, time);
  return sim;
}
function arena(id = 'brasa') {
  const sim = partida(id);
  interno(sim).proximaIA = Infinity;
  interno(sim).proximaOnda = Infinity;
  sim.unidades = [];
  sim.herois.forEach((h, i) => {
    h.x = 75;
    h.z = 75;
    h.controle = 100;
    if (i > 1) {
      h.vivo = false;
      h.renasceEm = 1e6;
    }
  });
  const local = sim.local;
  const inimigo = sim.herois.find((h) => h.time !== local.time)!;
  inimigo.vivo = true;
  inimigo.defId = 'brasa';
  inimigo.x = 1;
  inimigo.z = 0;
  inimigo.vidaMax = 100000;
  inimigo.vida = 100000;
  inimigo.armadura = 0;
  local.x = 0;
  local.z = 0;
  local.controle = 0;
  local.nivel = 18;
  local.niveis = [5, 5, 5, 3];
  local.mana = 9999;
  local.manaMax = 9999;
  return { sim, local, inimigo };
}
function avancar(sim: SimulacaoMoba, segundos: number) {
  for (let restante = segundos; restante > 0; restante -= 1) sim.atualizar(Math.min(1, restante));
}

describe('partida MOBA local e limites de entrada', () => {
  it('inicia 5 contra 5 com dez heróis únicos, seis campos e três rotas protegidas', () => {
    const sim = partida('prisma', 1);
    expect(sim.local.defId).toBe('prisma');
    expect(sim.local.time).toBe(1);
    expect(new Set(sim.herois.map((h) => h.defId)).size).toBe(10);
    expect(sim.herois.filter((h) => h.time === 0)).toHaveLength(5);
    expect(sim.herois.filter((h) => h.time === 1)).toHaveLength(5);
    expect(sim.unidades.filter((u) => u.tipo === 'neutro')).toHaveLength(6);
    expect(sim.estruturas.filter((e) => e.tipo === 'torre')).toHaveLength(12);
    expect(sim.estruturas.filter((e) => e.tipo === 'inibidor')).toHaveLength(6);
    expect(sim.estruturas.filter((e) => e.tipo === 'nucleo')).toHaveLength(2);
  });
  it.each([0, 1, 2] as const)('interpola ida e volta da rota %i por distância', (rota) => {
    expect(comprimentoRota(rota)).toBeGreaterThan(200);
    for (const p of [0, 0.1, 0.4, 0.6, 0.9, 1]) {
      const pos = pontoRota(rota, p);
      expect(progressoRota(rota, pos.x, pos.z)).toBeCloseTo(p, 6);
    }
  });
  it('mantém a partida congelada no menu e na pausa, inclusive loja e evolução', () => {
    const sim = new SimulacaoMoba();
    expect(sim.comprar(ITENS_MOBA[0].id)).toBe(false);
    expect(sim.habilidade(0)).toBe(false);
    sim.atualizar(2);
    expect(sim.tempo).toBe(0);
    sim.iniciar('brasa');
    sim.pausar(true);
    sim.local.pontos = 2;
    expect(sim.evoluir(1)).toBe(false);
    expect(sim.comprar(ITENS_MOBA[0].id)).toBe(false);
    sim.atualizar(2);
    expect(sim.tempo).toBe(0);
    sim.pausar(false);
    sim.atualizar(1);
    expect(sim.tempo).toBeCloseTo(1);
  });
  it('ignora comandos não finitos sem corromper coordenadas, mana ou tempo', () => {
    const sim = partida();
    const { x, z, mana } = sim.local;
    sim.mover(NaN, 0);
    sim.moverPara(Infinity, 0);
    sim.atualizar(Infinity);
    expect(sim.habilidade(0, NaN, 0)).toBe(false);
    expect(sim.ward(NaN, 0)).toBe(false);
    sim.ping(Infinity, NaN);
    expect(sim.local.x).toBe(x);
    expect(sim.local.z).toBe(z);
    expect(sim.local.mana).toBe(mana);
    expect(sim.tempo).toBe(0);
    expect(sim.efeitos).toHaveLength(0);
  });
  it('gera ondas a cada 30s e inclui cerco na terceira onda', () => {
    const sim = partida();
    interno(sim).proximaIA = Infinity;
    sim.herois.forEach((h) => (h.controle = 1000));
    sim.atualizar(2);
    expect(sim.unidades.filter((u) => u.time !== 2)).toHaveLength(0);
    avancar(sim, 4);
    expect(sim.unidades.filter((u) => u.time !== 2)).toHaveLength(24);
    avancar(sim, 60);
    expect(sim.unidades.some((u) => u.tipo === 'cerco')).toBe(true);
    expect(sim.unidades.length).toBeLessThanOrEqual(90);
  });
});

describe('combate, objetivos, loja e progressão', () => {
  it('permite ataque básico manual e concede ouro, CS e XP pelo último golpe', () => {
    const { sim, local } = arena('mimi');
    const { defId: _defId, ...baseUnidade } = local;
    const neutro: UnidadeMoba = {
      ...baseUnidade,
      id: 9000,
      tipo: 'neutro',
      time: 2,
      vida: 1,
      vidaMax: 1,
      x: 1,
      z: 0,
      controle: 100,
      progresso: 0,
    };
    sim.unidades.push(neutro);
    local.nivel = 1;
    const ouro = local.ouro;
    sim.atacar(neutro.id);
    sim.atualizar(0.05);
    expect(neutro.vivo).toBe(false);
    expect(local.cs).toBe(1);
    expect(local.ouro).toBeGreaterThan(ouro + 80);
    expect(local.xp).toBeGreaterThan(0);
  });
  it('protege torres internas, inibidor e núcleo até cair sua cadeia', () => {
    const sim = partida();
    const inimigas = sim.estruturas.filter((e) => e.time !== sim.local.time);
    const externa = inimigas.find((e) => e.rota === 1 && e.ordem === 0)!;
    const interna = inimigas.find((e) => e.rota === 1 && e.ordem === 1)!;
    const inibidor = inimigas.find((e) => e.rota === 1 && e.tipo === 'inibidor')!;
    const nucleo = inimigas.find((e) => e.tipo === 'nucleo')!;
    expect(interno(sim).vulneravel(externa)).toBe(true);
    for (const protegida of [interna, inibidor, nucleo]) {
      const vida = protegida.vida;
      interno(sim).ferir(protegida, 1e6, sim.local.id, false);
      expect(protegida.vida).toBe(vida);
    }
    interno(sim).ferir(externa, 1e6, sim.local.id, false);
    expect(interno(sim).vulneravel(interna)).toBe(true);
    interno(sim).ferir(interna, 1e6, sim.local.id, false);
    expect(interno(sim).vulneravel(inibidor)).toBe(true);
    interno(sim).ferir(inibidor, 1e6, sim.local.id, false);
    expect(interno(sim).vulneravel(nucleo)).toBe(true);
  });
  it('reduz dano a estruturas sem uma onda aliada próxima', () => {
    const sim = partida();
    const torre = sim.estruturas.find((e) => e.time === 1 && e.ordem === 0)!;
    const vida = torre.vida;
    interno(sim).ferir(torre, 100, sim.local.id, false);
    expect(vida - torre.vida).toBeCloseTo(20);
    sim.unidades.push({ ...sim.local, id: 999, tipo: 'tropa', x: torre.x, z: torre.z });
    interno(sim).ferir(torre, 100, sim.local.id, false);
    expect(vida - torre.vida).toBeCloseTo(120);
  });
  it('compra itens somente vivo na base com ouro e até seis espaços', () => {
    const sim = partida();
    const item = ITENS_MOBA.find((i) => i.dano)!;
    const dano = sim.local.dano;
    expect(sim.comprar('inexistente')).toBe(false);
    expect(sim.comprar(item.id)).toBe(false);
    sim.local.ouro = 100000;
    sim.local.x = 0;
    sim.local.z = 0;
    expect(sim.comprar(item.id)).toBe(false);
    Object.assign(sim.local, BASES_MOBA[0]);
    for (let i = 0; i < 6; i++) expect(sim.comprar(item.id)).toBe(true);
    expect(sim.local.dano).toBe(dano + item.dano! * 6);
    expect(sim.comprar(item.id)).toBe(false);
  });
  it('vende apenas índices válidos na base com reembolso de 70% e sem curar', () => {
    const sim = partida();
    sim.local.ouro = 100000;
    const item = ITENS_MOBA.find((i) => i.vida && i.mana)!;
    const vidaBase = sim.local.vidaMax,
      manaBase = sim.local.manaMax;
    sim.comprar(item.id);
    const ouro = sim.local.ouro;
    sim.local.x = 0;
    sim.local.z = 0;
    expect(sim.vender(0)).toBe(false);
    Object.assign(sim.local, BASES_MOBA[sim.local.time]);
    for (const i of [-1, 1, NaN, 0.5]) expect(sim.vender(i)).toBe(false);
    sim.local.vida = 100;
    sim.local.mana = 70;
    expect(sim.vender(0)).toBe(true);
    expect(sim.local.ouro).toBe(ouro + Math.floor(item.custo * 0.7));
    expect(sim.local.vida).toBe(100);
    expect(sim.local.mana).toBe(70);
    expect(sim.local.vidaMax).toBe(vidaBase);
    expect(sim.local.manaMax).toBe(manaBase);
    sim.comprar(item.id);
    sim.local.vida = sim.local.vidaMax;
    sim.local.mana = sim.local.manaMax;
    expect(sim.vender(0)).toBe(true);
    expect(sim.local.vida).toBe(vidaBase);
    expect(sim.local.mana).toBe(manaBase);
    sim.comprar(item.id);
    sim.local.vivo = false;
    expect(sim.vender(0)).toBe(false);
    sim.local.vivo = true;
    sim.pausar(true);
    expect(sim.vender(0)).toBe(false);
  });
  it('impõe mana, recarga, aprendizado, controle e limite de slots às habilidades', () => {
    const { sim, local } = arena();
    local.niveis = [1, 0, 0, 0];
    for (const slot of [-1, 1, 2, 3, 4, 1.2, NaN]) expect(sim.habilidade(slot)).toBe(false);
    local.mana = 0;
    expect(sim.habilidade(0)).toBe(false);
    local.mana = 500;
    local.controle = 2;
    expect(sim.habilidade(0)).toBe(false);
    local.controle = 0;
    expect(sim.habilidade(0, 2, 0)).toBe(true);
    expect(local.mana).toBe(500 - HEROIS_MOBA[0].habilidades[0].custo);
    expect(sim.habilidade(0)).toBe(false);
    expect(local.recargas[0]).toBeGreaterThan(0);
  });
  it('desbloqueia ultimate no nível 6 e respeita ranks e nível máximo 18', () => {
    const sim = partida();
    sim.local.pontos = 30;
    expect(sim.evoluir(3)).toBe(false);
    expect(sim.evoluir(0)).toBe(false);
    sim.local.nivel = 6;
    expect(sim.evoluir(3)).toBe(true);
    expect(sim.evoluir(3)).toBe(false);
    interno(sim).ganharXp(sim.local, 1e6);
    expect(sim.local.nivel).toBe(18);
    for (let i = 0; i < 10; i++) sim.evoluir(0);
    expect(sim.local.niveis[0]).toBe(5);
    expect(sim.evoluir(3)).toBe(true);
    expect(sim.evoluir(3)).toBe(true);
    expect(sim.evoluir(3)).toBe(false);
  });
  it('registra abate e assistência, e renasce com vida e mana completas', () => {
    const { sim, local, inimigo } = arena('mimi');
    const aliado = sim.herois.find((h) => h.time === local.time && h.id !== local.id)!;
    aliado.vivo = true;
    aliado.x = 0;
    aliado.z = 0;
    interno(sim).ferir(inimigo, 10, aliado.id, false);
    interno(sim).ferir(inimigo, 1e6, local.id, false);
    expect(local.abates).toBe(1);
    expect(aliado.assistencias).toBe(1);
    expect(inimigo.mortes).toBe(1);
    expect(inimigo.vivo).toBe(false);
    avancar(sim, inimigo.renasceEm + 1);
    expect(inimigo.vivo).toBe(true);
    expect(inimigo.vida).toBe(inimigo.vidaMax);
    expect(inimigo.mana).toBe(inimigo.manaMax);
  });
  it('recall dura oito segundos e cancela ao mover ou receber dano', () => {
    const { sim, local, inimigo } = arena();
    expect(sim.retornarBase()).toBe(true);
    avancar(sim, 7);
    expect(local.x).toBe(0);
    sim.mover(1, 0);
    expect(local.recall).toBe(0);
    sim.mover(0, 0);
    expect(sim.retornarBase()).toBe(true);
    interno(sim).ferir(local, 20, inimigo.id, true);
    expect(local.recall).toBe(0);
    expect(sim.retornarBase()).toBe(true);
    avancar(sim, 8.1);
    expect(local.x).toBeCloseTo(BASES_MOBA[0].x);
    expect(local.z).toBeCloseTo(BASES_MOBA[0].z);
  });
  it('cura na fonte recupera vida e mana após o retorno', () => {
    const sim = partida();
    sim.local.vida = 100;
    sim.local.mana = 0;
    avancar(sim, 2);
    expect(sim.local.vida).toBeGreaterThan(280);
    expect(sim.local.mana).toBeGreaterThan(100);
  });
  it.each(['vitoria', 'derrota'] as const)(
    'encerra em %s e reiniciar limpa todos os subsistemas',
    (estado) => {
      const sim = partida();
      const time = estado === 'vitoria' ? 1 : 0;
      const dono = sim.herois.find((h) => h.time !== time)!;
      const inibidor = sim.estruturas.find((e) => e.time === time && e.tipo === 'inibidor')!;
      inibidor.vida = 0;
      const nucleo = sim.estruturas.find((e) => e.time === time && e.tipo === 'nucleo')!;
      interno(sim).ferir(nucleo, 1e6, dono.id, true);
      expect(sim.estado).toBe(estado);
      const tempo = sim.tempo;
      sim.atualizar(1);
      expect(sim.tempo).toBe(tempo);
      sim.iniciar('mimi', 1);
      expect(sim.estado).toBe('jogando');
      expect(sim.tempo).toBe(0);
      expect(sim.vencedor).toBe(null);
      expect(sim.local.defId).toBe('mimi');
      expect(sim.efeitos).toHaveLength(0);
      expect(sim.sentinelas).toHaveLength(0);
    }
  );
});

describe('os cem comandos dos 25 kits produzem efeitos reais', () => {
  for (const heroi of HEROIS_MOBA)
    for (const [slot, skill] of heroi.habilidades.entries()) {
      it(`${heroi.nome} ${'QWER'[slot]}: ${skill.nome} (${skill.tipo})`, () => {
        const { sim, local, inimigo } = arena(heroi.id);
        local.vida = local.vidaMax / 2;
        const vida = local.vida;
        const mana = local.mana;
        expect(sim.habilidade(slot, 1, 0)).toBe(true);
        expect(local.mana).toBe(mana - skill.custo);
        expect(local.recargas[slot]).toBeGreaterThan(0);
        expect(sim.efeitos.some((e) => e.tipo === skill.tipo)).toBe(true);
        if (skill.tipo === 'cura') expect(local.vida).toBeGreaterThan(vida);
        else if (skill.tipo === 'escudo') expect(local.escudo).toBeGreaterThan(0);
        else if (skill.tipo === 'invocar')
          expect(sim.unidades.some((u) => u.tipo === 'invocacao')).toBe(true);
        else {
          sim.atualizar(0.65);
          expect(inimigo.vida).toBeLessThan(100000);
        }
        if (skill.tipo === 'raiz' || skill.tipo === 'puxao')
          expect(inimigo.controle).toBeGreaterThan(0);
        if (skill.tipo === 'salto' || skill.tipo === 'troca') expect(local.x).toBeGreaterThan(0);
      });
    }
});

describe('passivas, visão, selva e duração', () => {
  it('aplica a passiva de armadura já no nível 1', () => {
    const def = HEROIS_MOBA.find((h) => h.passiva.tipo === 'armadura')!;
    const sim = partida(def.id);
    expect(sim.local.armadura).toBe(def.armadura + 9);
  });
  it('vampirismo recupera vida apenas com dano básico', () => {
    const { sim, local, inimigo } = arena('mimi');
    local.vida = 100;
    interno(sim).ferir(inimigo, 100, local.id, true);
    expect(local.vida).toBe(100);
    interno(sim).ferir(inimigo, 100, local.id, false);
    expect(local.vida).toBeCloseTo(113);
  });
  it('conjurar uma linha sobre si não atinge inimigos distantes em qualquer direção', () => {
    const { sim, local, inimigo } = arena('brasa');
    inimigo.x = -18;
    inimigo.z = 8;
    expect(sim.habilidade(1, local.x, local.z)).toBe(true);
    expect(inimigo.vida).toBe(100000);
  });
  it('passivas de regeneração e mana aumentam a recuperação fora da fonte', () => {
    const regen = HEROIS_MOBA.find((h) => h.passiva.tipo === 'regeneracao')!;
    const mana = HEROIS_MOBA.find((h) => h.passiva.tipo === 'mana')!;
    const normal = arena('mimi');
    const comRegen = arena(regen.id);
    const comMana = arena(mana.id);
    for (const a of [normal, comRegen, comMana]) {
      a.local.vida = 100;
      a.local.mana = 0;
      a.local.controle = 100;
      a.sim.atualizar(1);
    }
    expect(comRegen.local.vida - 100).toBeGreaterThan(normal.local.vida - 100);
    expect(comMana.local.mana).toBeGreaterThan(normal.local.mana);
  });
  it('crítico ocorre no quinto ataque, e celeridade reduz o intervalo básico', () => {
    const crit = HEROIS_MOBA.find((h) => h.passiva.tipo === 'critico')!;
    const rapido = HEROIS_MOBA.find((h) => h.passiva.tipo === 'celeridade')!;
    const { sim, local, inimigo } = arena(crit.id);
    const danos: number[] = [];
    local.alcance = 2;
    for (let i = 0; i < 5; i++) {
      local.recargaAtaque = 0;
      const antes = inimigo.vida;
      sim.atacar(inimigo.id);
      sim.atualizar(0.05);
      danos.push(antes - inimigo.vida);
    }
    expect(danos[4]).toBeGreaterThan(danos[0] * 1.5);
    const a = arena(rapido.id);
    a.local.alcance = 2;
    a.sim.atacar(a.inimigo.id);
    a.sim.atualizar(0.05);
    expect(a.local.recargaAtaque).toBeCloseTo(0.67);
  });
  it('escudo absorve dano e expira na duração da habilidade', () => {
    const def = HEROIS_MOBA.find((h) => h.habilidades.some((s) => s.tipo === 'escudo'))!;
    const { sim, local, inimigo } = arena(def.id);
    const slot = def.habilidades.findIndex((s) => s.tipo === 'escudo');
    sim.habilidade(slot);
    const escudo = local.escudo;
    const vida = local.vida;
    interno(sim).ferir(local, 10, inimigo.id, true);
    expect(local.vida).toBe(vida);
    expect(local.escudo).toBeLessThan(escudo);
    avancar(sim, def.habilidades[slot].duracao + 0.1);
    expect(local.escudo).toBe(0);
  });
  it('fog revela com sentinela, limita alcance, quatro por time e recarga de 90s', () => {
    const { sim, local } = arena();
    expect(sim.visivel(0, -86, -86)).toBe(false);
    expect(sim.ward(50, 50)).toBe(false);
    expect(sim.ward(15, 0)).toBe(true);
    expect(sim.visivel(0, 35, 0)).toBe(true);
    expect(sim.ward(16, 0)).toBe(false);
    expect(sim.recargaWard).toBe(90);
    avancar(sim, 90.1);
    expect(sim.recargaWard).toBe(0);
    for (let i = 0; i < 7; i++) {
      (sim as unknown as { wardRecarga: number }).wardRecarga = 0;
      sim.ward(local.x, local.z);
    }
    expect(sim.sentinelas.filter((w) => w.time === local.time)).toHaveLength(4);
    for (let i = 0; i < 300; i++) sim.ping(0, 0);
    expect(sim.efeitos.length).toBeLessThanOrEqual(128);
    expect(sim.eventos.length).toBeLessThanOrEqual(12);
  });
  it('renasce os campos e concede buff real contra estruturas ao derrotar o chefe', () => {
    const sim = partida();
    interno(sim).proximaIA = Infinity;
    interno(sim).proximaOnda = Infinity;
    sim.herois.forEach((h) => (h.controle = 1000));
    const campo = sim.unidades[0];
    interno(sim).ferir(campo, 1e6, sim.local.id, false);
    expect(campo.vivo).toBe(false);
    avancar(sim, 86);
    expect(campo.vivo).toBe(true);
    expect(campo.vida).toBe(campo.vidaMax);
    avancar(sim, 95);
    const chefe = sim.unidades.find((u) => u.tipo === 'chefe')!;
    expect(chefe).toBeDefined();
    interno(sim).ferir(chefe, 1e6, sim.local.id, false);
    expect(interno(sim).buffAte[0]).toBeGreaterThan(sim.tempo);
    const torre = sim.estruturas.find((e) => e.time === 1 && e.ordem === 0)!;
    const vida = torre.vida;
    interno(sim).ferir(torre, 100, sim.local.id, false);
    expect(vida - torre.vida).toBeCloseTo(26);
  });
  it('simula uma partida longa sem vitória precoce ou coleções crescentes', () => {
    const sim = partida();
    let maxUnidades = 0;
    let maxObjetos = 0;
    for (let segundo = 0; segundo < 1500 && sim.estado === 'jogando'; segundo += 2) {
      sim.atualizar(2);
      maxUnidades = Math.max(maxUnidades, sim.unidades.length);
      maxObjetos = Math.max(
        maxObjetos,
        sim.unidades.length +
          sim.herois.length +
          sim.estruturas.length +
          sim.projeteis.length +
          sim.sentinelas.length
      );
      expect(sim.efeitos.length).toBeLessThanOrEqual(128);
      expect(sim.herois.every((h) => Number.isFinite(h.x + h.z + h.vida + h.mana))).toBe(true);
      if (segundo < 120) expect(sim.estado).toBe('jogando');
    }
    console.info('MOBA longa', {
      tempo: sim.tempo,
      estado: sim.estado,
      maxUnidades,
      maxObjetos,
      niveis: sim.herois.map((h) => h.nivel),
      torres: sim.estruturas.filter((e) => e.vida <= 0).length,
    });
    expect(sim.estado).not.toBe('jogando');
    expect(sim.tempo).toBeGreaterThanOrEqual(900);
    expect(sim.tempo).toBeLessThanOrEqual(1500);
    expect(maxUnidades).toBeLessThanOrEqual(90);
    expect(maxObjetos).toBeLessThanOrEqual(160);
    expect(interno(sim).aggro.size).toBeLessThan(120);
    expect(interno(sim).contribuicoes.size).toBeLessThanOrEqual(10);
    expect(interno(sim).zonas.length).toBeLessThanOrEqual(32);
    expect(sim.herois.some((h) => h.nivel >= 6 && h.niveis[3] > 0)).toBe(true);
    expect(sim.herois.some((h) => h.abates > 0)).toBe(true);
  }, 120000);
});
