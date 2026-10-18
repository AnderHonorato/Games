import { describe, it, expect } from 'vitest';
import { SimulacaoMoba } from '../../src/moba/simulacao';
import { MOITAS_MOBA, OBSTACULOS_MOBA, moverNoTerreno, posicaoLivre } from '../../src/moba/terreno';
import { HEROIS_MOBA } from '../../src/moba/dados';
import { BASES_MOBA, CAMPOS_MOBA, CHEFE_MOBA, pontoRota } from '../../src/moba/rotas';
function isolada() {
  const sim = new SimulacaoMoba();
  sim.iniciar('brasa');
  Object.assign(sim, { proximaIA: Infinity, proximaOnda: Infinity });
  sim.unidades = [];
  for (const h of sim.herois) {
    h.vivo = false;
    h.renasceEm = 99999;
  }
  sim.local.vivo = true;
  Object.assign(sim.local, { x: 0, z: 0, controle: 0 });
  return sim;
}
describe('profundidade tática MOBA v6', () => {
  it('respeita rota e dificuldade escolhidas; composição tem cinco classes e varia pelo catálogo', () => {
    const escalados = new Set<string>();
    for (const heroi of HEROIS_MOBA) {
      const sim = new SimulacaoMoba();
      sim.iniciar(heroi.id, 1, { rota: 2, dificuldade: 'desafio' });
      expect(sim.local.rota).toBe(2);
      expect(sim.dificuldade).toBe('desafio');
      expect(new Set(sim.herois.map((h) => h.defId)).size).toBe(10);
      expect(
        new Set(
          sim.herois
            .filter((h) => h.time === 1)
            .map((h) => HEROIS_MOBA.find((d) => d.id === h.defId)!.classe)
        ).size
      ).toBeGreaterThanOrEqual(4);
      sim.herois.filter((h) => h.id !== sim.local.id).forEach((h) => escalados.add(h.defId));
    }
    expect(escalados.size).toBe(25);
  });
  it('selva e Guardião nascem fora de todas as colisões', () => {
    for (const p of CAMPOS_MOBA) expect(posicaoLivre(p.x, p.z, 1.5)).toBe(true);
    expect(posicaoLivre(CHEFE_MOBA.x, CHEFE_MOBA.z, 3)).toBe(true);
  });
  it('nenhuma ruína bloqueia os caminhos das três rotas', () => {
    for (const rota of [0, 1, 2] as const)
      for (let i = 0; i <= 200; i++) {
        const p = pontoRota(rota, i / 200);
        expect(posicaoLivre(p.x, p.z, 1.2)).toBe(true);
      }
  });
  it('movimento e lampejo não atravessam a ruína e navegação a contorna', () => {
    const o = OBSTACULOS_MOBA[0],
      inicio = { x: o.x - o.raio - 3, z: o.z },
      destino = { x: o.x + o.raio + 4, z: o.z };
    let p = { ...inicio };
    for (let i = 0; i < 250; i++) {
      p = moverNoTerreno(p, destino, 1.1, 0.2);
      expect(posicaoLivre(p.x, p.z, 1.1)).toBe(true);
    }
    expect(Math.hypot(p.x - destino.x, p.z - destino.z)).toBeLessThan(1);
    const sim = isolada();
    Object.assign(sim.local, inicio);
    expect(sim.usarFeitico('lampejo', destino.x, destino.z)).toBe(true);
    expect(sim.local.x).toBeLessThan(o.x - o.raio);
    expect(sim.recargaFeitico('lampejo')).toBe(110);
  });
  it('moita esconde inimigo de quem está fora; mesma moita, sentinela e ataque revelam', () => {
    const sim = isolada(),
      m = MOITAS_MOBA[0],
      h = sim.herois.find((h) => h.time === 1)!;
    Object.assign(h, { vivo: true, x: m.x, z: m.z });
    Object.assign(sim.local, { x: m.x - 8, z: m.z });
    expect(sim.visivel(0, h.x, h.z)).toBe(false);
    Object.assign(sim.local, { x: m.x + 1, z: m.z });
    expect(sim.visivel(0, h.x, h.z)).toBe(true);
    sim.local.x = m.x - 8;
    expect(sim.ward(m.x, m.z)).toBe(true);
    expect(sim.visivel(0, h.x, h.z)).toBe(true);
    sim.sentinelas = [];
    (sim as any).ferir(sim.local, 10, h.id, false);
    expect(sim.visivel(0, h.x, h.z)).toBe(true);
    sim.local.controle = 100;
    h.controle = 100;
    sim.atualizar(2);
    sim.atualizar(2);
    expect(sim.visivel(0, h.x, h.z)).toBe(false);
  });
  it('cura tem recarga real, pausa congela e morte/menu impedem ambos os feitiços', () => {
    const sim = isolada();
    sim.local.vida = 100;
    expect(sim.usarFeitico('cura')).toBe(true);
    expect(sim.local.vida).toBeCloseTo(100 + sim.local.vidaMax * 0.28);
    expect(sim.usarFeitico('cura')).toBe(false);
    sim.pausar(true);
    sim.atualizar(1);
    expect(sim.recargaFeitico('cura')).toBe(90);
    sim.pausar(false);
    sim.local.controle = 100;
    sim.atualizar(1);
    expect(sim.recargaFeitico('cura')).toBeCloseTo(89);
    sim.local.vivo = false;
    expect(sim.usarFeitico('lampejo')).toBe(false);
    sim.iniciar('mimi');
    expect(sim.recargaFeitico('cura')).toBe(0);
    expect(sim.usarFeitico('lampejo', NaN, 0)).toBe(false);
    expect(new SimulacaoMoba().usarFeitico('cura')).toBe(false);
  });
  it('telemetria acompanha nascimento, derrota, renascimento e buff de objetivo', () => {
    const sim = isolada();
    expect(sim.objetivos().guardiao.nasceEm).toBe(180);
    for (let i = 0; i < 91; i++) sim.atualizar(2);
    const chefe = sim.unidades.find((u) => u.tipo === 'chefe')!;
    expect(chefe).toBeDefined();
    expect(sim.objetivos().guardiao.vivo).toBe(true);
    (sim as any).ferir(chefe, 1e6, sim.local.id, false);
    expect(sim.objetivos().guardiao.nasceEm).toBe(240);
    expect(sim.objetivos().buffs[0]).toBe(150);
    expect(sim.objetivos().torres).toEqual([6, 6]);
  });
});

describe('itens têm consequências no combate', () => {
  function duelo() {
    const sim = isolada();
    const local = sim.local;
    local.defId = 'brasa';
    local.nivel = 18;
    local.alcance = 2;
    local.vidaMax = 1000;
    local.vida = 100;
    local.armadura = 0;
    const alvo = sim.herois.find((h) => h.time !== local.time)!;
    Object.assign(alvo, {
      vivo: true,
      x: 1,
      z: 0,
      vida: 100000,
      vidaMax: 100000,
      armadura: 0,
      controle: 100,
      defId: 'brasa',
    });
    return { sim, local, alvo, api: sim as any };
  }
  it('upgrade consome componentes e libera espaço mesmo com seis itens', () => {
    const sim = new SimulacaoMoba();
    sim.iniciar('brasa');
    sim.local.inventario = [
      'lamina-sol',
      'dente-rubro',
      'botas-brisa',
      'botas-brisa',
      'botas-brisa',
      'botas-brisa',
    ];
    sim.local.ouro = 5000;
    expect(sim.comprar('presa-veludo')).toBe(true);
    expect(sim.local.inventario).toHaveLength(5);
    expect(sim.local.inventario).not.toContain('lamina-sol');
    expect(sim.local.inventario).not.toContain('dente-rubro');
    expect(sim.local.inventario).toContain('presa-veludo');
  });
  it('vampirismo é único e não cura por excesso de dano além da vida restante', () => {
    const { sim, local, alvo, api } = duelo();
    local.inventario = ['presa-veludo', 'presa-veludo'];
    api.ferir(alvo, 100, local.id, false);
    expect(local.vida).toBeCloseTo(118);
    alvo.vida = 10;
    api.ferir(alvo, 10000, local.id, false);
    expect(local.vida).toBeCloseTo(119.8);
    expect(alvo.vivo).toBe(false);
  });
  it('escudo de emergência absorve dano e respeita recarga de 22 segundos', () => {
    const { local, alvo, api } = duelo();
    local.vida = 340;
    local.inventario = ['aegis-crepusculo'];
    api.ferir(local, 20, alvo.id, false);
    expect(local.escudo).toBe(80);
    expect(local.vida).toBe(340);
    api.ferir(local, 100, alvo.id, false);
    expect(local.escudo).toBe(0);
    expect(local.vida).toBe(320);
    api.ferir(local, 20, alvo.id, false);
    expect(local.vida).toBe(300);
  });
  it('fúria acelera progressivamente quatro ataques, sem acumular por duplicatas', () => {
    const { local, alvo, api } = duelo();
    local.inventario = ['garras-tempestade', 'garras-tempestade'];
    const cds = [];
    for (let i = 0; i < 6; i++) {
      local.recargaAtaque = 0;
      api.ataqueBasico(local, alvo);
      cds.push(local.recargaAtaque);
    }
    expect(cds[0]).toBeCloseTo(0.92 / 1.08);
    expect(cds[3]).toBeCloseTo(0.92 / 1.32);
    expect(cds[5]).toBe(cds[3]);
  });
  it('gélido reduz deslocamento em 25% e ferida reduz cura/regen por três segundos', () => {
    const { sim, local, alvo, api } = duelo();
    local.inventario = ['cetro-geada', 'espinho-seco'];
    api.ferir(alvo, 100, local.id, false);
    alvo.controle = 0;
    alvo.velocidade = 10;
    const inicio = alvo.x;
    api.andar(alvo, { x: alvo.x + 20, z: alvo.z }, 1);
    expect(alvo.x - inicio).toBeCloseTo(7.5);
    alvo.vida = 100;
    api.curar(alvo, 100);
    expect(alvo.vida).toBe(160);
    local.controle = 100;
    alvo.controle = 100;
    sim.atualizar(2);
    sim.atualizar(2);
    const antes = alvo.vida;
    api.curar(alvo, 100);
    expect(alvo.vida - antes).toBe(100);
  });
  it('eco aplica 45 de dano adicional e aguarda oito segundos para repetir', () => {
    const { sim, local, alvo, api } = duelo();
    local.inventario = ['sino-eco'];
    api.ferir(alvo, 100, local.id, false);
    expect(alvo.vida).toBe(99855);
    api.ferir(alvo, 100, local.id, false);
    expect(alvo.vida).toBe(99755);
    local.controle = 100;
    for (let i = 0; i < 4; i++) sim.atualizar(2);
    const antes = alvo.vida;
    api.ferir(alvo, 100, local.id, false);
    expect(antes - alvo.vida).toBe(145);
  });
});

describe('bots e defesas disputam objetivos', () => {
  it('três bots agrupados derrotam o Guardião e recebem o buff da equipe', () => {
    const sim = isolada(),
      api = sim as any;
    sim.tempo = 300;
    api.proximaIA = 0;
    api.criarNeutro(CHEFE_MOBA, 6, true);
    api.bossNasceu = true;
    const equipe = sim.herois.filter((h) => h.time === sim.local.time).slice(2);
    equipe.forEach((h, i) => {
      Object.assign(h, {
        vivo: true,
        nivel: 12,
        pontos: 20,
        x: CHEFE_MOBA.x - 3 + i * 2,
        z: CHEFE_MOBA.z - 3,
        controle: 0,
      });
      api.atualizarAtributos(h, true);
      h.vida = h.vidaMax;
      h.mana = h.manaMax;
    });
    for (let i = 0; i < 90 && sim.objetivos().guardiao.vivo; i++) sim.atualizar(1);
    expect(sim.objetivos().guardiao.vivo).toBe(false);
    expect(sim.objetivos().buffs[sim.local.time]).toBeGreaterThan(0);
    expect(equipe.some((h) => h.cs > 0)).toBe(true);
  });
  it('atingir herói protegido faz a torre retaliar contra o agressor', () => {
    const sim = isolada(),
      api = sim as any;
    const torre = sim.estruturas.find((e) => e.time === 1 && e.tipo === 'torre')!;
    const inimigo = sim.herois.find((h) => h.time === 1)!;
    Object.assign(inimigo, {
      vivo: true,
      x: torre.x,
      z: torre.z,
      controle: 100,
      vida: 10000,
      vidaMax: 10000,
    });
    Object.assign(sim.local, { x: torre.x + 4, z: torre.z, controle: 100, armadura: 0 });
    api.ferir(inimigo, 10, sim.local.id, false);
    const antes = sim.local.vida;
    sim.atualizar(0.05);
    expect(sim.local.vida).toBeLessThan(antes - 100);
    expect(api.aggro.get(torre.id).alvo).toBe(sim.local.id);
  });
});

describe('regressões de visão, deslocamento e nascimento', () => {
  it.each([false, true])(
    'tropa não adquire nem mantém alvo oculto na moita (alvo anterior: %s)',
    (retido) => {
      const sim = isolada(),
        api = sim as any,
        m = MOITAS_MOBA[0];
      const inimigo = sim.herois.find((h) => h.time === 1)!;
      Object.assign(inimigo, { vivo: true, x: m.x, z: m.z, controle: 100 });
      Object.assign(sim.local, { x: m.x - 8, z: m.z, controle: 100 });
      const tropa = {
        ...sim.local,
        id: 9999,
        tipo: 'tropa' as const,
        x: m.x - 6,
        z: m.z,
        alcance: 10,
        controle: 0,
        alvo: retido ? inimigo.id : null,
      };
      sim.unidades.push(tropa);
      expect(sim.visivel(0, inimigo.x, inimigo.z)).toBe(false);
      api.tickUnidade(tropa, 0.05);
      expect(tropa.alvo).not.toBe(inimigo.id);
      expect(sim.projeteis).toHaveLength(0);
    }
  );
  it.each(['salto', 'troca'] as const)(
    '%s bloqueado por ruína aplica dano e efeito apenas onde pousou',
    (tipo) => {
      const sim = isolada(),
        h = sim.local;
      const def = HEROIS_MOBA.find((d) => d.id === (tipo === 'salto' ? 'bambu' : 'mimi'))!;
      h.defId = def.id;
      h.niveis = [5, 5, 5, 3];
      h.mana = 9999;
      Object.assign(h, { x: 24.3, z: -5 });
      const alvo = {
        ...h,
        id: 9998,
        tipo: 'tropa' as const,
        time: 1 as const,
        x: 33.7,
        z: -5,
        vida: 10000,
        vidaMax: 10000,
      };
      delete (alvo as any).defId;
      sim.unidades.push(alvo);
      const slot = def.habilidades.findIndex((s) => s.tipo === tipo);
      expect(sim.habilidade(slot, alvo.x, alvo.z)).toBe(true);
      expect(h.x).toBeCloseTo(24.3);
      expect(alvo.vida).toBe(10000);
      const efeito = sim.efeitos.find((e) => e.tipo === tipo)!;
      expect(efeito.x).toBe(h.x);
      expect(efeito.z).toBe(h.z);
    }
  );
  it('nascer, renascer e retornar deixa os heróis fora do cristal central e dentro da fonte', () => {
    const sim = new SimulacaoMoba();
    sim.iniciar('brasa');
    const fonte = (h: typeof sim.local) => {
      const b = BASES_MOBA[h.time],
        d = Math.hypot(h.x - b.x, h.z - b.z);
      expect(d).toBeGreaterThanOrEqual(5.5);
      expect(d).toBeLessThanOrEqual(7);
    };
    sim.herois.forEach(fonte);
    sim.herois.forEach((h) => (h.controle = 100));
    sim.local.vivo = false;
    sim.local.renasceEm = 0.01;
    sim.atualizar(0.05);
    fonte(sim.local);
    Object.assign(sim.local, { x: 0, z: 0, controle: 0 });
    expect(sim.retornarBase()).toBe(true);
    for (let i = 0; i < 9; i++) sim.atualizar(1);
    fonte(sim.local);
  });
});
