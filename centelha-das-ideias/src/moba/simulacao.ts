import { custoCompra, recomendadosPorClasse, type TipoEfeitoItemMoba } from './itens';
import { ajustarDestino, moitaEm, moverNoTerreno } from './terreno';
import { HEROIS_MOBA, ITENS_MOBA, heroiMoba, itemMoba } from './dados';
import {
  BASES_MOBA,
  CAMPOS_MOBA,
  CHEFE_MOBA,
  comprimentoRota,
  pontoRota,
  progressoRota,
} from './rotas';
import type {
  DefSkillMoba,
  DificuldadeMoba,
  FeiticoMoba,
  OpcoesMoba,
  ObjetivosMoba,
  EfeitoMoba,
  EstruturaMoba,
  EventoMoba,
  HeroiMoba,
  ProjetilMoba,
  RotaMoba,
  SentinelaMoba,
  TimeMoba,
  UnidadeMoba,
} from './tipos';
export { ROTAS_MOBA, BASES_MOBA, CAMPOS_MOBA, CHEFE_MOBA } from './rotas';
type Alvo = UnidadeMoba | EstruturaMoba;
type Ponto = { x: number; z: number };
type Zona = {
  dono: number;
  x: number;
  z: number;
  raio: number;
  dano: number;
  tempo: number;
  tick: number;
  segue: boolean;
  tipo: 'canal' | 'orbita' | 'veneno';
  veneno: boolean;
};
const dist = (a: Ponto, b: Ponto) => Math.hypot(a.x - b.x, a.z - b.z);
const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));
const vivo = (a: Alvo) => a.vida > 0 && (!('vivo' in a) || a.vivo);
const ehHeroi = (a: Alvo): a is HeroiMoba => 'defId' in a;
const ehEstrutura = (a: Alvo): a is EstruturaMoba => 'ordem' in a;
/** Estado puro da partida. Não depende de relógio, DOM, rede, Three ou timers. */
export class SimulacaoMoba {
  estado: 'menu' | 'jogando' | 'pausa' | 'vitoria' | 'derrota' = 'menu';
  tempo = 0;
  herois: HeroiMoba[] = [];
  unidades: UnidadeMoba[] = [];
  estruturas: EstruturaMoba[] = [];
  projeteis: ProjetilMoba[] = [];
  efeitos: EfeitoMoba[] = [];
  sentinelas: SentinelaMoba[] = [];
  eventos: EventoMoba[] = [];
  vencedor: TimeMoba | null = null;
  dificuldade: DificuldadeMoba = 'normal';
  private feiticos: Record<FeiticoMoba, number> = { lampejo: 0, cura: 0 };
  private revelados = new Map<number, number>();
  private selecaoRota: RotaMoba = 0;
  private estadosItens = new Map<
    number,
    {
      furiaAte: number;
      stacks: number;
      escudoProximo: number;
      ecoProximo: number;
      feridaAte: number;
      ferida: number;
    }
  >();
  private lentidaoItens = new Map<number, { ate: number; valor: number }>();
  private sequencia = 1;
  private localId = 0;
  private onda = 0;
  private proximaOnda = 0;
  private direcao: Ponto = { x: 0, z: 0 };
  private destino: Ponto | null = null;
  private destinos = new Map<number, Ponto>();
  private aggro = new Map<number, { alvo: number; ate: number }>();
  private contribuicoes = new Map<number, Map<number, number>>();
  private zonas: Zona[] = [];
  private wardRecarga = 0;
  private buffAte: [number, number] = [0, 0];
  private bossNasceu = false;
  private proximaIA = 0;
  private atacando = true;
  private retirando = new Set<number>();
  private escudoAte = new Map<number, number>();
  private golpes = new Map<number, number>();
  constructor() {
    this.preparar(HEROIS_MOBA[0].id, 0);
    this.estado = 'menu';
  }
  get local(): HeroiMoba {
    return this.herois.find((h) => h.id === this.localId)!;
  }
  iniciar(idHeroi: string, time: TimeMoba = 0, opcoes: OpcoesMoba = {}): void {
    this.dificuldade = ['iniciante', 'normal', 'desafio'].includes(opcoes.dificuldade ?? '')
      ? opcoes.dificuldade!
      : 'normal';
    this.selecaoRota = [0, 1, 2].includes(opcoes.rota ?? -1) ? opcoes.rota! : 0;
    this.preparar(idHeroi, time);
    this.estado = 'jogando';
    this.evento('A batalha começou. Ondas a cada 30 segundos.');
  }
  private preparar(idHeroi: string, time: TimeMoba): void {
    this.sequencia = 1;
    this.tempo = 0;
    this.vencedor = null;
    this.herois = [];
    this.unidades = [];
    this.estruturas = [];
    this.projeteis = [];
    this.efeitos = [];
    this.sentinelas = [];
    this.eventos = [];
    this.onda = 0;
    this.proximaOnda = 5;
    this.proximaIA = 0;
    this.wardRecarga = 0;
    this.feiticos = { lampejo: 0, cura: 0 };
    this.revelados.clear();
    this.estadosItens.clear();
    this.lentidaoItens.clear();
    this.buffAte = [0, 0];
    this.bossNasceu = false;
    this.zonas = [];
    this.aggro.clear();
    this.contribuicoes.clear();
    this.destinos.clear();
    this.destino = null;
    this.direcao = { x: 0, z: 0 };
    this.atacando = true;
    this.retirando.clear();
    this.escudoAte.clear();
    this.golpes.clear();
    const escolhido = heroiMoba(idHeroi);
    const usados = new Set([escolhido.id]);
    const formacao = [escolhido];
    const inicio = HEROIS_MOBA.indexOf(escolhido);
    const catalogo = [...HEROIS_MOBA.slice(inicio + 1), ...HEROIS_MOBA.slice(0, inicio + 1)];
    for (const equipe of [0, 1]) {
      const classes = equipe === 0 ? [escolhido.classe] : [];
      for (let i = equipe === 0 ? 1 : 0; i < 5; i++) {
        const d =
          catalogo.find((d) => !usados.has(d.id) && !classes.includes(d.classe)) ??
          catalogo.find((d) => !usados.has(d.id))!;
        formacao.push(d);
        usados.add(d.id);
        classes.push(d.classe);
      }
    }
    const vagas: RotaMoba[] = [0, 0, 1, 2, 2];
    vagas.splice(vagas.indexOf(this.selecaoRota), 1);
    for (let i = 0; i < 10; i++) {
      const equipe = (i < 5 ? time : 1 - time) as TimeMoba;
      const rota =
        i === 0 ? this.selecaoRota : i < 5 ? vagas[i - 1] : ([0, 0, 1, 2, 2] as RotaMoba[])[i % 5];
      const h = this.criarHeroi(formacao[i].id, equipe, rota, i % 5);
      this.atualizarAtributos(h, false);
      this.herois.push(h);
      if (i === 0) this.localId = h.id;
    }
    for (const equipe of [0, 1] as TimeMoba[]) {
      for (const rota of [0, 1, 2] as RotaMoba[]) {
        for (const [tipo, p, ordem] of [
          ['torre', 0.31, 0],
          ['torre', 0.17, 1],
          ['inibidor', 0.065, 2],
        ] as const) {
          const pos = pontoRota(rota, equipe === 0 ? p : 1 - p);
          this.estruturas.push({
            id: this.id(),
            time: equipe,
            tipo,
            ...pos,
            vida: tipo === 'torre' ? 4700 : 3600,
            vidaMax: tipo === 'torre' ? 4700 : 3600,
            rota,
            ordem,
            raio: tipo === 'torre' ? 2 : 2.5,
            recarga: 0,
          });
        }
      }
      const base = BASES_MOBA[equipe];
      this.estruturas.push({
        id: this.id(),
        time: equipe,
        tipo: 'nucleo',
        ...base,
        vida: 7200,
        vidaMax: 7200,
        rota: 1,
        ordem: 3,
        raio: 3,
        recarga: 0,
      });
    }
    CAMPOS_MOBA.forEach((p, i) => this.criarNeutro(p, i));
  }
  private id(): number {
    return this.sequencia++;
  }
  /** Cinco posições em leque, dentro da fonte e fora do cristal do núcleo. */
  private pontoFonte(time: TimeMoba, indice: number): Ponto {
    const base = BASES_MOBA[time],
      angulo = (time === 0 ? -Math.PI / 4 : (3 * Math.PI) / 4) + (indice - 2) * 0.38;
    return { x: base.x + Math.cos(angulo) * 6.8, z: base.z + Math.sin(angulo) * 6.8 };
  }
  private voltarFonte(h: HeroiMoba): void {
    const indice = this.herois.filter((a) => a.time === h.time).indexOf(h);
    Object.assign(h, this.pontoFonte(h.time, Math.max(0, indice)));
  }
  private criarHeroi(defId: string, time: TimeMoba, rota: RotaMoba, indice: number): HeroiMoba {
    const d = heroiMoba(defId),
      b = this.pontoFonte(time, indice);
    return {
      id: this.id(),
      tipo: 'heroi',
      time,
      x: b.x,
      z: b.z,
      vida: d.vida,
      vidaMax: d.vida,
      mana: d.mana,
      manaMax: d.mana,
      dano: d.dano,
      alcance: d.alcance,
      velocidade: d.velocidade,
      armadura: d.armadura,
      raio: 1.1,
      recargaAtaque: 0,
      alvo: null,
      rota,
      progresso: time === 0 ? 0 : 1,
      vivo: true,
      respawnEm: 0,
      controle: 0,
      lento: 0,
      queimadura: 0,
      cor: d.cor,
      defId,
      nome: d.nome,
      escudo: 0,
      nivel: 1,
      xp: 0,
      ouro: 550,
      abates: 0,
      mortes: 0,
      assistencias: 0,
      cs: 0,
      recargas: [0, 0, 0, 0],
      niveis: [1, 0, 0, 0],
      pontos: 0,
      inventario: [],
      renasceEm: 0,
      recall: 0,
    };
  }
  mover(dx: number, dz: number): void {
    if (
      this.estado !== 'jogando' ||
      !this.local.vivo ||
      !Number.isFinite(dx) ||
      !Number.isFinite(dz)
    )
      return;
    const n = Math.hypot(dx, dz);
    this.direcao = { x: n ? dx / Math.max(1, n) : 0, z: n ? dz / Math.max(1, n) : 0 };
    if (n) {
      this.destino = null;
      this.local.recall = 0;
      this.atacando = false;
    } else this.atacando = true;
  }
  moverPara(x: number, z: number): void {
    if (this.estado !== 'jogando' || !this.local.vivo || !Number.isFinite(x) || !Number.isFinite(z))
      return;
    this.destino = ajustarDestino(x, z, this.local.raio);
    this.direcao = { x: 0, z: 0 };
    this.local.recall = 0;
    this.local.alvo = null;
    this.atacando = true;
  }
  atacar(alvoId?: number): void {
    if (this.estado !== 'jogando' || !this.local.vivo) return;
    this.atacando = true;
    this.direcao = { x: 0, z: 0 };
    this.destino = null;
    const a = alvoId ? this.buscar(alvoId) : this.alvoPerto(this.local, 20);
    this.local.alvo =
      a && a.time !== this.local.time && vivo(a) && this.visivel(this.local.time, a.x, a.z)
        ? a.id
        : null;
    this.local.recall = 0;
  }
  habilidade(slot: number, x?: number, z?: number): boolean {
    return this.lancar(this.local, slot, x, z);
  }
  evoluir(slot: number): boolean {
    return this.estado === 'jogando' && this.aprender(this.local, slot);
  }
  private aprender(h: HeroiMoba, slot: number): boolean {
    if (!Number.isInteger(slot) || slot < 0 || slot > 3 || h.pontos <= 0) return false;
    const n = h.niveis[slot];
    if (slot === 3 ? n >= 3 || h.nivel < 6 + n * 5 : n >= 5 || h.nivel < n * 2 + 1) return false;
    h.niveis[slot]++;
    h.pontos--;
    return true;
  }
  comprar(id: string): boolean {
    return this.comprarPara(this.local, id);
  }
  vender(indiceItem: number): boolean {
    const h = this.local;
    if (
      this.estado !== 'jogando' ||
      !h.vivo ||
      dist(h, BASES_MOBA[h.time]) > 13 ||
      !Number.isInteger(indiceItem) ||
      indiceItem < 0 ||
      indiceItem >= h.inventario.length
    )
      return false;
    const item = itemMoba(h.inventario[indiceItem]);
    if (!item) return false;
    h.inventario.splice(indiceItem, 1);
    h.ouro += Math.floor(item.custo * 0.7);
    this.atualizarAtributos(h, false);
    h.vida = Math.min(h.vida, h.vidaMax);
    h.mana = Math.min(h.mana, h.manaMax);
    return true;
  }
  private comprarPara(h: HeroiMoba, id: string): boolean {
    const compra = custoCompra(h.inventario, id);
    if (
      this.estado !== 'jogando' ||
      !compra ||
      compra.inventarioRestante.length >= 6 ||
      h.ouro < compra.custo ||
      dist(h, BASES_MOBA[h.time]) > 13 ||
      !h.vivo
    )
      return false;
    h.ouro -= compra.custo;
    h.inventario = [...compra.inventarioRestante, id];
    const vida = h.vida,
      mana = h.mana;
    this.atualizarAtributos(h, true);
    h.vida = Math.min(h.vidaMax, Math.max(vida, h.vida));
    h.mana = Math.min(h.manaMax, Math.max(mana, h.mana));
    return true;
  }
  retornarBase(): boolean {
    const h = this.local;
    if (this.estado !== 'jogando' || !h.vivo || h.controle > 0 || h.recall > 0) return false;
    this.direcao = { x: 0, z: 0 };
    this.destino = null;
    h.alvo = null;
    h.recall = 8;
    return true;
  }
  ward(x: number, z: number): boolean {
    const h = this.local;
    if (
      this.estado !== 'jogando' ||
      !Number.isFinite(x) ||
      !Number.isFinite(z) ||
      !h.vivo ||
      this.wardRecarga > 0 ||
      dist(h, { x, z }) > 18 ||
      Math.abs(x) > 86 ||
      Math.abs(z) > 86
    )
      return false;
    const equipe = this.sentinelas.filter((w) => w.time === h.time);
    if (equipe.length >= 4) {
      const primeiro = equipe[0];
      this.sentinelas = this.sentinelas.filter((w) => w.id !== primeiro.id);
    }
    this.sentinelas.push({ id: this.id(), time: h.time, x, z, vida: 150 });
    this.wardRecarga = 90;
    this.fx('ward', x, z, 3, '#e8d777', 1);
    return true;
  }
  get recargaWard(): number {
    return this.wardRecarga;
  }
  ping(x: number, z: number): void {
    if (this.estado !== 'jogando' || !Number.isFinite(x) || !Number.isFinite(z)) return;
    this.fx('ping', clamp(x, -86, 86), clamp(z, -86, 86), 6, '#ffd56c', 2.5);
    this.evento('Sinal de atenção no mapa.', this.local.time);
  }
  pausar(on: boolean): void {
    if (on && this.estado === 'jogando') this.estado = 'pausa';
    else if (!on && this.estado === 'pausa') this.estado = 'jogando';
  }
  visivel(time: TimeMoba, x: number, z: number): boolean {
    const p = { x, z },
      moita = moitaEm(x, z);
    const sentinela = this.sentinelas.some((w) => w.time === time && dist(w, p) < 26);
    if (moita && !sentinela) {
      const dentro = [...this.herois, ...this.unidades].some(
        (u) => u.time === time && u.vivo && moitaEm(u.x, u.z)?.id === moita.id
      );
      const revelado = [...this.herois, ...this.unidades].some(
        (u) =>
          u.time !== time &&
          u.vivo &&
          dist(u, p) < 0.2 &&
          (this.revelados.get(u.id) ?? 0) > this.tempo
      );
      if (!dentro && !revelado) return false;
    }
    return (
      dist(p, BASES_MOBA[time]) < 20 ||
      sentinela ||
      this.herois.some((h) => h.time === time && h.vivo && dist(h, p) < 24) ||
      this.unidades.some((u) => u.time === time && u.vivo && dist(u, p) < 13) ||
      this.estruturas.some((e) => e.time === time && e.vida > 0 && dist(e, p) < 18)
    );
  }
  recargaFeitico(tipo: FeiticoMoba): number {
    return this.feiticos[tipo] ?? 0;
  }
  usarFeitico(tipo: FeiticoMoba, x?: number, z?: number): boolean {
    const h = this.local;
    if (
      this.estado !== 'jogando' ||
      !h.vivo ||
      h.controle > 0 ||
      (tipo !== 'cura' && tipo !== 'lampejo') ||
      this.feiticos[tipo] > 0 ||
      (x !== undefined && !Number.isFinite(x)) ||
      (z !== undefined && !Number.isFinite(z))
    )
      return false;
    if (tipo === 'cura') {
      if (h.vida >= h.vidaMax) return false;
      this.curar(h, h.vidaMax * 0.28);
      h.lento = 0;
      this.lentidaoItens.delete(h.id);
      this.feiticos.cura = 90;
      this.fx('cura', h.x, h.z, 6, '#78ffbc', 1);
    } else {
      const alvo = { x: x ?? h.x + 10, z: z ?? h.z - 10 },
        inicio = { x: h.x, z: h.z };
      if (dist(h, alvo) < 0.1) return false;
      const p = moverNoTerreno(h, alvo, h.raio, 12, false);
      Object.assign(h, p);
      this.feiticos.lampejo = 110;
      this.fx('salto', h.x, h.z, 3, '#b9ecff', 0.65, inicio.x, inicio.z);
      this.destino = null;
      this.direcao = { x: 0, z: 0 };
    }
    h.recall = 0;
    this.revelados.set(h.id, this.tempo + 3);
    return true;
  }
  objetivos(): ObjetivosMoba {
    const chefe = this.unidades.find((u) => u.tipo === 'chefe');
    return {
      guardiao: {
        vivo: !!chefe?.vivo,
        vida: chefe?.vida ?? 0,
        vidaMax: chefe?.vidaMax ?? 7500,
        nasceEm: chefe ? Math.max(0, chefe.respawnEm) : Math.max(0, 180 - this.tempo),
      },
      buffs: [Math.max(0, this.buffAte[0] - this.tempo), Math.max(0, this.buffAte[1] - this.tempo)],
      torres: [0, 1].map(
        (t) =>
          this.estruturas.filter((e) => e.time === t && e.tipo === 'torre' && e.vida > 0).length
      ) as [number, number],
      inibidores: [0, 1].map(
        (t) =>
          this.estruturas.filter((e) => e.time === t && e.tipo === 'inibidor' && e.vida > 0).length
      ) as [number, number],
      proximaOnda: Math.max(0, this.proximaOnda - this.tempo),
    };
  }
  atualizar(dt: number): void {
    if (this.estado !== 'jogando' || !Number.isFinite(dt) || dt <= 0) return;
    let restante = Math.min(dt, 2);
    while (restante > 0 && this.estado === 'jogando') {
      const passo = Math.min(restante, 0.05);
      this.passo(passo);
      restante -= passo;
    }
  }
  private passo(dt: number): void {
    this.tempo += dt;
    this.wardRecarga = Math.max(0, this.wardRecarga - dt);
    for (const tipo of ['lampejo', 'cura'] as const)
      this.feiticos[tipo] = Math.max(0, this.feiticos[tipo] - dt);
    for (const [id, ate] of this.revelados) if (ate <= this.tempo) this.revelados.delete(id);
    for (const [id, e] of this.lentidaoItens)
      if (e.ate <= this.tempo) this.lentidaoItens.delete(id);
    if (this.tempo >= this.proximaOnda) {
      this.gerarOnda();
      this.proximaOnda += 30;
    }
    if (this.tempo >= 180 && !this.bossNasceu && this.unidades.length < 90) {
      this.criarNeutro(CHEFE_MOBA, 6, true);
      this.bossNasceu = true;
      this.evento('O Guardião do Rio despertou.');
    }
    this.sentinelas = this.sentinelas.filter((w) => (w.vida -= dt) > 0);
    this.efeitos = this.efeitos.filter((e) => (e.vida -= dt) > 0);
    for (const h of this.herois) this.tickHeroi(h, dt);
    if (this.tempo >= this.proximaIA) {
      for (const h of this.herois) if (h.id !== this.localId && h.vivo) this.pensar(h);
      this.proximaIA = this.tempo + 0.3;
    }
    for (const h of this.herois) {
      if (this.estado !== 'jogando') return;
      if (h.vivo) this.agirHeroi(h, dt);
    }
    for (const u of this.unidades) {
      if (this.estado !== 'jogando') return;
      this.tickUnidade(u, dt);
    }
    for (const e of this.estruturas) if (e.vida > 0) this.tickEstrutura(e, dt);
    this.tickProjeteis(dt);
    if (this.estado !== 'jogando') return;
    this.tickZonas(dt);
    this.unidades = this.unidades.filter((u) => u.vivo || u.time === 2);
    this.eventos = this.eventos.filter((e) => this.tempo - e.tempo < 22).slice(-12);
    // Expired aggro must not retain the IDs of every minion ever spawned.
    for (const [id, entrada] of this.aggro) if (entrada.ate <= this.tempo) this.aggro.delete(id);
    for (const [vitima, entradas] of this.contribuicoes) {
      for (const [id, quando] of entradas) if (this.tempo - quando > 10) entradas.delete(id);
      if (!entradas.size) this.contribuicoes.delete(vitima);
    }
  }
  private tickHeroi(h: HeroiMoba, dt: number): void {
    h.recargaAtaque = Math.max(0, h.recargaAtaque - dt);
    h.controle = Math.max(0, h.controle - dt);
    h.lento = Math.max(0, h.lento - dt);
    h.queimadura = Math.max(0, h.queimadura - dt);
    h.ouro += dt * 2.1;
    for (let i = 0; i < 4; i++) h.recargas[i] = Math.max(0, h.recargas[i] - dt);
    if (!h.vivo) {
      h.renasceEm = Math.max(0, h.renasceEm - dt);
      h.respawnEm = h.renasceEm;
      if (h.renasceEm <= 0) {
        this.voltarFonte(h);
        h.vivo = true;
        h.vida = h.vidaMax;
        h.mana = h.manaMax;
        h.escudo = 0;
        h.alvo = null;
        this.contribuicoes.delete(h.id);
      }
      return;
    }
    const d = heroiMoba(h.defId);
    const regen =
      2 +
      (d.passiva.tipo === 'regeneracao' ? h.vidaMax * 0.005 : 0) +
      h.inventario.reduce((s, id) => s + (itemMoba(id)?.regeneracao ?? 0), 0);
    this.curar(h, regen * dt);
    h.mana = Math.min(h.manaMax, h.mana + dt * (3 + (d.passiva.tipo === 'mana' ? 4 : 0)));
    if ((this.escudoAte.get(h.id) ?? 0) <= this.tempo) {
      h.escudo = 0;
      this.escudoAte.delete(h.id);
    }
    if (dist(h, BASES_MOBA[h.time]) < 12) {
      this.curar(h, dt * h.vidaMax * 0.12);
      h.mana = Math.min(h.manaMax, h.mana + dt * h.manaMax * 0.15);
    }
    if (h.recall > 0) {
      h.recall -= dt;
      if (h.recall <= 0) {
        h.recall = 0;
        this.voltarFonte(h);
        this.fx('recall', h.x, h.z, 4, h.cor, 1);
        this.destinos.delete(h.id);
        if (h.id === this.localId) {
          this.destino = null;
          this.direcao = { x: 0, z: 0 };
        }
      }
    }
  }
  private pensar(h: HeroiMoba): void {
    this.aprenderAutomatico(h);
    if (dist(h, BASES_MOBA[h.time]) < 12) {
      const opcoes = recomendadosPorClasse(heroiMoba(h.defId).classe)
        .filter(
          (i) =>
            !h.inventario.includes(i.id) &&
            (custoCompra(h.inventario, i.id)?.custo ?? Infinity) <= h.ouro
        )
        .sort((a, b) => b.custo - a.custo);
      if (opcoes[0]) this.comprarPara(h, opcoes[0].id);
    }
    if (h.recall > 0) return;
    const inimigos = this.todosInimigos(h).filter((a) => dist(h, a) < 19),
      ameaca = inimigos.find((e) => ehHeroi(e));
    if (h.vida >= h.vidaMax * 0.85) this.retirando.delete(h.id);
    if (
      this.retirando.has(h.id) ||
      h.vida / h.vidaMax < 0.26 ||
      (h.vida / h.vidaMax < 0.48 && !!ameaca && inimigos.length > 2)
    ) {
      h.alvo = null;
      this.retirando.add(h.id);
      this.destinos.set(h.id, BASES_MOBA[h.time]);
      if (!ameaca && dist(h, BASES_MOBA[h.time]) > 30) h.recall = 8;
      return;
    }
    if (dist(h, BASES_MOBA[h.time]) < 12 && h.vida < h.vidaMax * 0.82) {
      this.destinos.set(h.id, BASES_MOBA[h.time]);
      return;
    }
    const torreHostil = this.estruturas.find(
      (e) => e.tipo === 'torre' && e.time !== h.time && e.vida > 0 && dist(e, h) < 17
    );
    if (
      torreHostil &&
      !this.unidades.some((u) => u.time === h.time && u.vivo && dist(u, torreHostil) < 16) &&
      !inimigos.some((u) => ehHeroi(u) && u.vida < u.vidaMax * 0.18)
    ) {
      h.alvo = null;
      const sentido = h.time === 0 ? -1 : 1;
      this.destinos.set(
        h.id,
        pontoRota(h.rota, clamp(progressoRota(h.rota, h.x, h.z) + sentido * 0.07, 0, 1))
      );
      return;
    }
    const alvo = this.alvoPerto(h, 22);
    h.alvo = alvo?.id ?? null;
    if (alvo) {
      const d = heroiMoba(h.defId);
      for (let i = 0; i < 4; i++) {
        const s = d.habilidades[i];
        if (
          h.recargas[i] <= 0 &&
          h.niveis[i] > 0 &&
          dist(h, alvo) <= s.alcance + (s.tipo === 'cura' || s.tipo === 'escudo' ? 8 : 0)
        ) {
          this.lancar(h, i, alvo.x, alvo.z);
          break;
        }
      }
      this.destinos.set(h.id, { x: alvo.x, z: alvo.z });
      return;
    }
    // Três companheiros agrupam para o Guardião; depois voltam às rotas.
    const guardiao = this.unidades.find((u) => u.tipo === 'chefe' && u.vivo);
    const aliadosProntos = this.herois.filter(
      (a) => a.time === h.time && a.vivo && a.nivel >= 6 && a.vida > a.vidaMax * 0.65
    );
    const indiceEquipe = this.herois.filter((a) => a.time === h.time).indexOf(h);
    if (
      guardiao &&
      indiceEquipe >= 2 &&
      aliadosProntos.length >= 3 &&
      Math.floor(this.tempo % 150) < 38
    ) {
      if (dist(h, guardiao) < 18) h.alvo = guardiao.id;
      this.destinos.set(h.id, guardiao);
      return;
    }
    // Após abrir uma rota, o grupo converge ao núcleo com as supertropas.
    const rotaAberta = this.estruturas.find(
      (e) => e.time !== h.time && e.tipo === 'inibidor' && e.vida <= 0
    );
    if (rotaAberta && this.tempo > 600) h.rota = rotaAberta.rota;
    // Cada dupla acompanha sua rota; o quinto herói alterna selva e avanço.
    const indice = this.herois.filter((a) => a.time === h.time).indexOf(h);
    if (indice === 4 && Math.floor(this.tempo / 80) % 3 === 1) {
      const campo = this.unidades
        .filter((u) => u.time === 2 && u.vivo && u.tipo !== 'chefe')
        .sort((a, b) => dist(h, a) - dist(h, b))[0];
      if (campo && dist(h, campo) < 65) {
        h.alvo = campo.id;
        this.destinos.set(h.id, campo);
        return;
      }
    }
    const rota = h.rota,
      inimiga = this.estruturas
        .filter(
          (e) =>
            e.time !== h.time &&
            e.vida > 0 &&
            (e.rota === rota || e.tipo === 'nucleo') &&
            this.vulneravel(e)
        )
        .sort((a, b) => dist(h, a) - dist(h, b))[0];
    if (!inimiga) return;
    let p = progressoRota(rota, h.x, h.z),
      alvoP = progressoRota(rota, inimiga.x, inimiga.z);
    const sentido = h.time === 0 ? 1 : -1;
    const tropas = this.unidades.filter((u) => u.time === h.time && u.rota === rota && u.vivo);
    const frente = tropas.sort((a, b) => sentido * (b.progresso - a.progresso))[0];
    if (frente && dist(h, inimiga) < 25 && dist(frente, inimiga) > 14)
      alvoP = frente.progresso - sentido * 0.025;
    else alvoP = clamp(p + sentido * 0.06, Math.min(p, alvoP), Math.max(p, alvoP));
    this.destinos.set(h.id, pontoRota(rota, alvoP));
  }
  private aprenderAutomatico(h: HeroiMoba): void {
    for (let t = 0; t < 12 && h.pontos > 0; t++) {
      if (this.aprender(h, 3)) continue;
      if (
        !this.aprender(h, t % 3) &&
        !this.aprender(h, (t + 1) % 3) &&
        !this.aprender(h, (t + 2) % 3)
      )
        break;
    }
  }
  private agirHeroi(h: HeroiMoba, dt: number): void {
    if (h.controle > 0 || h.recall > 0) return;
    const local = h.id === this.localId;
    if (local && (this.direcao.x || this.direcao.z)) {
      this.andar(h, { x: h.x + this.direcao.x * 20, z: h.z + this.direcao.z * 20 }, dt);
      return;
    }
    let alvo = h.alvo ? this.buscar(h.alvo) : undefined;
    if (
      alvo &&
      (!vivo(alvo) ||
        alvo.time === h.time ||
        (!this.visivel(h.time, alvo.x, alvo.z) && alvo.time !== 2))
    )
      alvo = undefined;
    const destin = local ? this.destino : this.destinos.get(h.id);
    if (!alvo && (!local || this.atacando) && (!destin || dist(h, destin) < 2))
      alvo = this.alvoPerto(h, h.alcance + 3);
    if (alvo) {
      h.alvo = alvo.id;
      const d = dist(h, alvo);
      if (d <= h.alcance + alvo.raio) {
        this.ataqueBasico(h, alvo);
        return;
      }
      if (!local || h.alvo) {
        this.andar(h, alvo, dt);
        return;
      }
    }
    if (destin) {
      this.andar(h, destin, dt);
      if (local && dist(h, destin) < 0.5) this.destino = null;
    }
  }
  private andar(u: UnidadeMoba, p: Ponto, dt: number): void {
    if (u.controle > 0) return;
    const dx = p.x - u.x,
      dz = p.z - u.z,
      d = Math.hypot(dx, dz);
    if (d < 0.05) return;
    const lentidao = this.lentidaoItens.get(u.id);
    const fator = Math.min(
      u.lento > 0 ? 0.58 : 1,
      lentidao && lentidao.ate > this.tempo ? 1 - lentidao.valor : 1
    );
    const passo = Math.min(d, u.velocidade * fator * dt);
    Object.assign(u, moverNoTerreno(u, p, u.raio, passo));
    u.progresso = progressoRota(u.rota, u.x, u.z);
  }
  private todosInimigos(u: UnidadeMoba): UnidadeMoba[] {
    return [...this.herois, ...this.unidades].filter(
      (a) =>
        a.time !== u.time &&
        a.vivo &&
        (a.time === 2 ? !!u.alvo || dist(a, u) < 8 : this.visivel(u.time as TimeMoba, a.x, a.z))
    );
  }
  private alvoPerto(u: UnidadeMoba, raio: number): Alvo | undefined {
    const unidades = this.todosInimigos(u)
      .filter((a) => dist(u, a) <= raio + a.raio)
      .sort((a, b) => {
        const ag = this.aggro.get(u.id);
        if (ag && ag.ate > this.tempo) {
          if (a.id === ag.alvo) return -1;
          if (b.id === ag.alvo) return 1;
        }
        return dist(u, a) - dist(u, b);
      });
    if (unidades[0]) return unidades[0];
    return this.estruturas
      .filter(
        (e) => e.time !== u.time && e.vida > 0 && this.vulneravel(e) && dist(u, e) <= raio + e.raio
      )
      .sort((a, b) => dist(u, a) - dist(u, b))[0];
  }
  private buscar(id: number): Alvo | undefined {
    return (
      this.herois.find((h) => h.id === id) ??
      this.unidades.find((u) => u.id === id) ??
      this.estruturas.find((e) => e.id === id)
    );
  }
  private vulneravel(e: EstruturaMoba): boolean {
    if (e.tipo === 'nucleo')
      return this.estruturas.some((a) => a.time === e.time && a.tipo === 'inibidor' && a.vida <= 0);
    return !this.estruturas.some(
      (a) => a.time === e.time && a.rota === e.rota && a.ordem < e.ordem && a.vida > 0
    );
  }
  private ataqueBasico(u: UnidadeMoba, a: Alvo): void {
    if (u.recargaAtaque > 0 || !vivo(a) || (ehEstrutura(a) && !this.vulneravel(a))) return;
    let dano = u.dano;
    this.revelados.set(u.id, this.tempo + 3);
    if (ehHeroi(u)) {
      const p = heroiMoba(u.defId).passiva.tipo;
      const golpes = (this.golpes.get(u.id) ?? 0) + 1;
      this.golpes.set(u.id, golpes);
      if (p === 'critico' && golpes % 5 === 0) dano *= 1.65;
      const furia = this.efeitoItem(u, 'furia'),
        estado = this.estadoItem(u);
      if (furia) {
        estado.stacks = estado.furiaAte > this.tempo ? Math.min(4, estado.stacks + 1) : 1;
        estado.furiaAte = this.tempo + (furia.duracao ?? 3);
      }
      u.recargaAtaque =
        (p === 'celeridade' ? 0.67 : 0.92) / (1 + (furia ? estado.stacks * furia.valor : 0));
    } else u.recargaAtaque = u.tipo === 'cerco' ? 1.8 : 1.25;
    if (u.alcance > 5 && this.projeteis.length < 24) {
      const dx = a.x - u.x,
        dz = a.z - u.z,
        d = Math.hypot(dx, dz) || 1;
      this.projeteis.push({
        id: this.id(),
        x: u.x,
        z: u.z,
        vx: (dx / d) * 36,
        vz: (dz / d) * 36,
        raio: 0.45,
        vida: 2.5,
        cor: u.cor,
        time: u.time,
        dono: u.id,
        dano,
        alvo: a.id,
      });
    } else this.ferir(a, dano, u.id, false);
  }
  private gerarOnda(): void {
    this.onda++;
    for (const time of [0, 1] as TimeMoba[])
      for (const rota of [0, 1, 2] as RotaMoba[])
        for (let i = 0; i < 4; i++) {
          if (this.unidades.length >= 90) break;
          const cerco = i === 3 && this.onda % 3 === 0,
            pos = pontoRota(rota, time === 0 ? 0.025 : 0.975),
            crescimento = 1 + this.tempo / 650,
            superTropa = this.estruturas.some(
              (e) => e.time !== time && e.rota === rota && e.tipo === 'inibidor' && e.vida <= 0
            );
          const vida = (cerco ? 620 : 340) * crescimento * (superTropa ? 1.45 : 1);
          this.unidades.push({
            id: this.id(),
            tipo: cerco ? 'cerco' : 'tropa',
            time,
            x: pos.x + ((i % 2) - 0.5) * 1.4,
            z: pos.z + ((i % 2) - 0.5) * 1.4,
            vida,
            vidaMax: vida,
            dano: (cerco ? 44 : 23) * crescimento * (superTropa ? 1.35 : 1),
            alcance: cerco ? 11 : i === 2 ? 8 : 2,
            velocidade: 5.8,
            armadura: cerco ? 18 : 5,
            raio: cerco ? 1.1 : 0.65,
            recargaAtaque: 0,
            alvo: null,
            rota,
            progresso: time === 0 ? 0.025 : 0.975,
            vivo: true,
            respawnEm: 0,
            controle: 0,
            lento: 0,
            queimadura: 0,
            cor: time === 0 ? '#62d9ff' : '#ff7f9f',
          });
        }
  }
  private criarNeutro(p: Ponto, indice: number, chefe = false): void {
    const vida = chefe ? 7500 : 1100;
    this.unidades.push({
      id: this.id(),
      tipo: chefe ? 'chefe' : 'neutro',
      time: 2,
      ...p,
      vida,
      vidaMax: vida,
      dano: chefe ? 140 : 58,
      alcance: chefe ? 6 : 3,
      velocidade: chefe ? 3 : 4,
      armadura: chefe ? 55 : 15,
      raio: chefe ? 3 : 1.5,
      recargaAtaque: 0,
      alvo: null,
      rota: 1,
      progresso: indice,
      vivo: true,
      respawnEm: 0,
      controle: 0,
      lento: 0,
      queimadura: 0,
      cor: chefe ? '#eab95f' : '#96ca7a',
    });
  }
  private tickUnidade(u: UnidadeMoba, dt: number): void {
    if (!u.vivo) {
      if (u.time === 2) {
        u.respawnEm -= dt;
        if (u.respawnEm <= 0) {
          u.vivo = true;
          u.vida = u.vidaMax;
          u.alvo = null;
          const p = u.tipo === 'chefe' ? CHEFE_MOBA : CAMPOS_MOBA[Math.round(u.progresso)];
          Object.assign(u, p);
        }
      }
      return;
    }
    u.recargaAtaque = Math.max(0, u.recargaAtaque - dt);
    u.controle = Math.max(0, u.controle - dt);
    u.lento = Math.max(0, u.lento - dt);
    u.queimadura = Math.max(0, u.queimadura - dt);
    if (u.controle > 0) return;
    if (u.tipo === 'invocacao') {
      u.respawnEm -= dt;
      if (u.respawnEm <= 0) {
        u.vivo = false;
        return;
      }
    }
    let a = u.alvo ? this.buscar(u.alvo) : undefined;
    if (a && (!vivo(a) || dist(u, a) > 22 || (u.time !== 2 && !this.visivel(u.time, a.x, a.z))))
      a = undefined;
    if (u.time === 2) {
      const casa = u.tipo === 'chefe' ? CHEFE_MOBA : CAMPOS_MOBA[Math.round(u.progresso)];
      if (dist(u, casa) > 17) {
        this.andarNeutro(u, casa, dt);
        u.vida = Math.min(u.vidaMax, u.vida + dt * 200);
        u.alvo = null;
        return;
      }
      if (!a) return;
    } else if (!a) {
      const alvos = [...this.unidades, ...this.herois]
        .filter(
          (v) =>
            v.vivo &&
            v.time !== u.time &&
            v.time !== 2 &&
            dist(u, v) < 12 &&
            this.visivel(u.time as TimeMoba, v.x, v.z)
        )
        .sort((v, w) => {
          const ag = this.aggro.get(u.id);
          if (ag && ag.ate > this.tempo) {
            if (v.id === ag.alvo) return -1;
            if (w.id === ag.alvo) return 1;
          }
          return (ehHeroi(v) ? 4 : 0) + dist(u, v) - (ehHeroi(w) ? 4 : 0) - dist(u, w);
        });
      a =
        alvos[0] ??
        this.estruturas
          .filter((e) => e.time !== u.time && e.vida > 0 && this.vulneravel(e) && dist(u, e) < 14)
          .sort((v, w) => dist(u, v) - dist(u, w))[0];
    }
    if (a) {
      u.alvo = a.id;
      if (dist(u, a) <= u.alcance + a.raio) this.ataqueBasico(u, a);
      else if (u.time === 2) this.andarNeutro(u, a, dt);
      else this.andar(u, a, dt);
      return;
    }
    u.alvo = null;
    if (u.time !== 2) {
      const sentido = u.time === 0 ? 1 : -1;
      const p = clamp(u.progresso + (sentido * u.velocidade * dt) / comprimentoRota(u.rota), 0, 1);
      this.andar(u, pontoRota(u.rota, p + sentido * 0.025), dt);
    }
  }
  private andarNeutro(u: UnidadeMoba, p: Ponto, dt: number): void {
    const indice = u.progresso;
    this.andar(u, p, dt);
    u.progresso = indice;
  }
  private tickEstrutura(e: EstruturaMoba, dt: number): void {
    if (e.tipo !== 'torre') return;
    e.recarga = Math.max(0, e.recarga - dt);
    if (e.recarga > 0) return;
    const ag = this.aggro.get(e.id);
    let a =
      ag && ag.ate > this.tempo
        ? this.herois.find(
            (h) => h.id === ag.alvo && h.vivo && dist(e, h) < 18 && this.visivel(e.time, h.x, h.z)
          )
        : undefined;
    const candidatos = [...this.unidades, ...this.herois]
      .filter(
        (u) =>
          u.vivo &&
          u.time !== e.time &&
          u.time !== 2 &&
          dist(e, u) < 18 &&
          this.visivel(e.time, u.x, u.z)
      )
      .sort((u, v) => (ehHeroi(u) ? 100 : 0) + dist(e, u) - (ehHeroi(v) ? 100 : 0) - dist(e, v));
    const alvo = a ?? candidatos[0];
    if (!alvo) return;
    e.recarga = 1.15;
    const dano = ehHeroi(alvo) ? 180 + alvo.vidaMax * 0.025 : 155;
    this.ferir(alvo, dano, e.id, false);
    this.fx('raio', e.x, e.z, 0.6, e.time === 0 ? '#68ddff' : '#ff8baa', 0.2, alvo.x, alvo.z);
  }
  private lancar(h: HeroiMoba, slot: number, x?: number, z?: number): boolean {
    if (
      this.estado !== 'jogando' ||
      !h.vivo ||
      h.controle > 0 ||
      !Number.isInteger(slot) ||
      slot < 0 ||
      slot > 3 ||
      h.niveis[slot] <= 0 ||
      h.recargas[slot] > 0
    )
      return false;
    if ((x !== undefined && !Number.isFinite(x)) || (z !== undefined && !Number.isFinite(z)))
      return false;
    const s = heroiMoba(h.defId).habilidades[slot];
    if (h.mana < s.custo) return false;
    const perto = this.alvoPerto(h, s.alcance);
    const alvo = { x: x ?? perto?.x ?? h.x + 8, z: z ?? perto?.z ?? h.z - 8 };
    const distancia = Math.hypot(alvo.x - h.x, alvo.z - h.z);
    // A cast on the hero still has a direction for line/cone collision tests.
    const dx = distancia > 0 ? alvo.x - h.x : 1;
    const dz = distancia > 0 ? alvo.z - h.z : 0;
    const d = distancia || 1;
    const p = {
      x: h.x + (dx / d) * Math.min(distancia, s.alcance),
      z: h.z + (dz / d) * Math.min(distancia, s.alcance),
    };
    h.mana -= s.custo;
    const reducao = Math.min(
      0.4,
      h.inventario.reduce((t, id) => t + (itemMoba(id)?.recarga ?? 0), 0)
    );
    h.recargas[slot] = s.recarga * (1 - reducao);
    h.recall = 0;
    const dano =
        Math.abs(s.dano) * (1 + (h.niveis[slot] - 1) * 0.24) + h.dano * (slot === 3 ? 0.6 : 0.25),
      raio = Math.max(1.2, s.raio);
    this.revelados.set(h.id, this.tempo + 3);
    if (s.tipo !== 'salto' && s.tipo !== 'troca')
      this.fx(s.tipo, p.x, p.z, raio, s.cor, Math.min(1.5, s.duracao || 0.5), h.x, h.z);
    switch (s.tipo) {
      case 'cura':
        for (const a of this.herois.filter(
          (a) => a.time === h.time && a.vivo && dist(a, h) <= Math.max(raio, 9)
        )) {
          this.curar(a, dano);
          a.lento = 0;
        }
        break;
      case 'escudo':
        for (const a of this.herois.filter(
          (a) => a.time === h.time && a.vivo && dist(a, h) <= Math.max(raio, 8)
        )) {
          a.escudo = Math.min(a.vidaMax * 0.6, a.escudo + dano);
          this.escudoAte.set(a.id, this.tempo + Math.max(0.1, s.duracao));
        }
        break;
      case 'salto': {
        const inicio = { x: h.x, z: h.z };
        Object.assign(h, moverNoTerreno(h, p, h.raio, s.alcance, false));
        this.fx('raio', inicio.x, inicio.z, 1, s.cor, 0.35, h.x, h.z);
        this.fx(s.tipo, h.x, h.z, raio, s.cor, Math.min(1.5, s.duracao || 0.5), inicio.x, inicio.z);
        this.area(h, h, raio, dano, s);
        break;
      }
      case 'troca': {
        const a = this.todosInimigos(h).find((a) => dist(a, p) < raio + 2);
        if (a && ehHeroi(a)) {
          const inicio = { x: h.x, z: h.z };
          h.x = a.x;
          h.z = a.z;
          a.x = inicio.x;
          a.z = inicio.z;
          this.ferir(a, dano, h.id, true);
          a.lento = Math.max(a.lento, 2);
        } else {
          Object.assign(h, moverNoTerreno(h, p, h.raio, s.alcance, false));
          this.area(h, h, raio, dano, s);
        }
        this.fx(s.tipo, h.x, h.z, raio, s.cor, Math.min(1.5, s.duracao || 0.5));
        break;
      }
      case 'projetil': {
        const n = Math.max(1, Math.min(5, s.quantidade ?? 1));
        for (let i = 0; i < n; i++) {
          if (this.projeteis.length >= 24) break;
          const ang = Math.atan2(dz, dx) + (i - (n - 1) / 2) * 0.15;
          this.projeteis.push({
            id: this.id(),
            x: h.x,
            z: h.z,
            vx: Math.cos(ang) * 30,
            vz: Math.sin(ang) * 30,
            raio: Math.min(raio, 1.8),
            vida: s.alcance / 30 + 0.15,
            cor: s.cor,
            time: h.time,
            dono: h.id,
            dano,
            tipo: s.tipo,
            atingidos: [],
          });
        }
        break;
      }
      case 'linha':
      case 'cone': {
        for (const a of this.todosInimigos(h)) {
          const ax = a.x - h.x,
            az = a.z - h.z,
            t = (ax * dx + az * dz) / d,
            lateral = Math.abs(ax * dz - az * dx) / d;
          if (
            t >= 0 &&
            t <= s.alcance + a.raio &&
            lateral <= (s.tipo === 'cone' ? t * 0.52 : 0) + raio + a.raio
          ) {
            this.ferir(a, dano, h.id, true);
            this.controleHabilidade(a, s);
          }
        }
        this.fx('raio', h.x, h.z, raio, s.cor, 0.4, p.x, p.z);
        break;
      }
      case 'puxao': {
        const a = this.todosInimigos(h)
          .filter((a) => dist(a, p) <= raio + 3)
          .sort((a, b) => dist(a, p) - dist(b, p))[0];
        if (a) {
          this.ferir(a, dano, h.id, true);
          const ad = dist(a, h) || 1;
          const destinoPuxao = {
            x: h.x + ((a.x - h.x) / ad) * 2.5,
            z: h.z + ((a.z - h.z) / ad) * 2.5,
          };
          Object.assign(a, moverNoTerreno(a, destinoPuxao, a.raio, ad, false));
          a.controle = Math.max(a.controle, s.duracao || 1);
        }
        break;
      }
      case 'invocar': {
        const n = Math.min(4, s.quantidade ?? 2);
        for (let i = 0; i < n && this.unidades.length < 90; i++) {
          const vida = 200 + h.nivel * 45;
          this.unidades.push({
            id: this.id(),
            tipo: 'invocacao',
            time: h.time,
            ...ajustarDestino(p.x + Math.cos(i * 2) * 2, p.z + Math.sin(i * 2) * 2, 0.7),
            vida,
            vidaMax: vida,
            dano: dano * 0.35,
            alcance: 5,
            velocidade: 7,
            armadura: 15,
            raio: 0.7,
            recargaAtaque: 0,
            alvo: null,
            rota: h.rota,
            progresso: progressoRota(h.rota, p.x, p.z),
            vivo: true,
            respawnEm: s.duracao || 12,
            controle: 0,
            lento: 0,
            queimadura: 0,
            cor: s.cor,
          });
        }
        break;
      }
      case 'canal':
      case 'orbita':
      case 'veneno': {
        if (this.zonas.length < 32)
          this.zonas.push({
            dono: h.id,
            x: p.x,
            z: p.z,
            raio,
            dano: dano / (s.tipo === 'veneno' ? 2 : 3),
            tempo: Math.max(1, s.duracao),
            tick: 0,
            segue: s.tipo === 'orbita',
            tipo: s.tipo,
            veneno: s.tipo === 'veneno',
          });
        break;
      }
      case 'area':
      case 'raiz':
        this.area(h, p, raio, dano, s);
        break;
    }
    return true;
  }
  private area(h: HeroiMoba, p: Ponto, raio: number, dano: number, s: DefSkillMoba): void {
    for (const a of this.todosInimigos(h))
      if (dist(a, p) < raio + a.raio) {
        this.ferir(a, dano, h.id, true);
        this.controleHabilidade(a, s);
      }
  }
  private controleHabilidade(a: UnidadeMoba, s: DefSkillMoba): void {
    if (s.tipo === 'raiz') a.controle = Math.max(a.controle, Math.min(3.5, s.duracao));
    else if (s.tipo === 'veneno') {
      a.queimadura = Math.max(a.queimadura, s.duracao);
      a.lento = Math.max(a.lento, 2);
    } else if (s.tipo === 'cone' || s.tipo === 'area')
      a.lento = Math.max(a.lento, Math.min(2, s.duracao));
  }
  private tickZonas(dt: number): void {
    for (const z of this.zonas) {
      z.tempo -= dt;
      z.tick -= dt;
      const h = this.herois.find((a) => a.id === z.dono);
      if (!h || !h.vivo || (z.tipo === 'canal' && (h.controle > 0 || h.recall > 0))) {
        z.tempo = 0;
        continue;
      }
      if (z.segue) {
        z.x = h.x;
        z.z = h.z;
      }
      if (z.tick <= 0) {
        z.tick = 0.5;
        for (const a of this.todosInimigos(h))
          if (dist(a, z) < z.raio + a.raio) {
            this.ferir(a, z.dano, h.id, true);
            if (z.veneno) {
              a.lento = 1;
              a.queimadura = 1;
            }
          }
        this.fx(z.tipo, z.x, z.z, z.raio, h.cor, 0.55);
      }
    }
    this.zonas = this.zonas.filter((z) => z.tempo > 0);
  }
  private tickProjeteis(dt: number): void {
    for (const p of this.projeteis) {
      if (this.estado !== 'jogando') break;
      p.vida -= dt;
      if (p.alvo) {
        const a = this.buscar(p.alvo);
        if (!a || !vivo(a)) {
          p.vida = 0;
          continue;
        }
        const dx = a.x - p.x,
          dz = a.z - p.z,
          d = Math.hypot(dx, dz) || 1;
        if (d < 36 * dt + a.raio) {
          this.ferir(a, p.dano, p.dono, false);
          p.vida = 0;
          continue;
        }
        p.vx = (dx / d) * 36;
        p.vz = (dz / d) * 36;
      }
      const anterior = { x: p.x, z: p.z };
      p.x += p.vx * dt;
      p.z += p.vz * dt;
      if (!p.alvo) {
        const d2 = (p.x - anterior.x) ** 2 + (p.z - anterior.z) ** 2;
        for (const a of [...this.herois, ...this.unidades]) {
          if (!a.vivo || a.time === p.time || p.atingidos?.includes(a.id)) continue;
          const t = d2
            ? clamp(
                ((a.x - anterior.x) * (p.x - anterior.x) +
                  (a.z - anterior.z) * (p.z - anterior.z)) /
                  d2,
                0,
                1
              )
            : 0;
          if (
            dist(a, {
              x: anterior.x + (p.x - anterior.x) * t,
              z: anterior.z + (p.z - anterior.z) * t,
            }) <=
            p.raio + a.raio
          ) {
            this.ferir(a, p.dano, p.dono, true);
            p.atingidos?.push(a.id);
            p.vida = 0;
            this.fx('impacto', a.x, a.z, 2, p.cor, 0.35);
            break;
          }
        }
      }
    }
    this.projeteis = this.projeteis.filter(
      (p) => p.vida > 0 && Math.abs(p.x) < 90 && Math.abs(p.z) < 90
    );
  }
  private ferir(a: Alvo, bruto: number, donoId: number, magico: boolean): void {
    if (!vivo(a) || (ehEstrutura(a) && !this.vulneravel(a))) return;
    const dono = this.buscar(donoId);
    if (!dono || dono.time === a.time) return;
    let dano = bruto;
    if (ehHeroi(dono)) {
      this.revelados.set(dono.id, this.tempo + 3);
      if (dono.time !== this.local.time)
        dano *= this.dificuldade === 'iniciante' ? 0.84 : this.dificuldade === 'desafio' ? 1.12 : 1;
    }
    if (ehEstrutura(a)) {
      const aliados = this.unidades.some((u) => u.time === dono.time && u.vivo && dist(u, a) < 17);
      if (!aliados) dano *= 0.2;
      dano *= 1 + Math.max(0, this.tempo - 720) / 600;
      if (dono.time !== 2 && this.buffAte[dono.time] > this.tempo) dano *= 1.3;
    } else dano *= 100 / (100 + Math.max(0, a.armadura) * (magico ? 0.65 : 1));
    if (ehHeroi(a)) {
      const efeito = this.efeitoItem(a, 'escudo'),
        estado = this.estadoItem(a);
      if (
        efeito &&
        a.vida - dano <= a.vidaMax * 0.35 &&
        estado.escudoProximo <= this.tempo + 1e-6
      ) {
        a.escudo += efeito.valor;
        estado.escudoProximo = this.tempo + (efeito.recarga ?? 22);
        this.escudoAte.set(
          a.id,
          Math.max(this.escudoAte.get(a.id) ?? 0, this.tempo + (efeito.duracao ?? 4))
        );
        this.fx('escudo', a.x, a.z, 3, '#bc9cff', 0.8);
      }
      const abs = Math.min(a.escudo, dano);
      a.escudo -= abs;
      dano -= abs;
      a.recall = 0;
      if (ehHeroi(dono)) {
        let contrib = this.contribuicoes.get(a.id);
        if (!contrib) {
          contrib = new Map();
          this.contribuicoes.set(a.id, contrib);
        }
        contrib.set(dono.id, this.tempo);
        for (const e of this.estruturas)
          if (e.time === a.time && e.tipo === 'torre' && e.vida > 0 && dist(e, a) < 18)
            this.aggro.set(e.id, { alvo: dono.id, ate: this.tempo + 3 });
        for (const u of this.unidades)
          if (u.time === a.time && dist(u, a) < 11)
            this.aggro.set(u.id, { alvo: dono.id, ate: this.tempo + 2 });
      }
    }
    if ('time' in a && a.time === 2 && 'alvo' in a) a.alvo = donoId;
    const vidaAntes = a.vida;
    a.vida = Math.max(0, a.vida - dano);
    const danoEfetivo = vidaAntes - a.vida;
    if (ehHeroi(dono) && !magico && heroiMoba(dono.defId).passiva.tipo === 'vampirismo')
      this.curar(dono, danoEfetivo * 0.13);
    if (a.vida <= 0) this.morrer(a, dono);
    if (ehHeroi(dono) && !magico && !ehEstrutura(a)) {
      const vamp = this.efeitoItem(dono, 'vampirismo');
      if (vamp) this.curar(dono, danoEfetivo * vamp.valor);
      const gelido = this.efeitoItem(dono, 'gelido');
      if (gelido && a.vivo)
        this.lentidaoItens.set(a.id, {
          ate: this.tempo + (gelido.duracao ?? 1.3),
          valor: gelido.valor,
        });
      const ferida = this.efeitoItem(dono, 'ferida');
      if (ferida && ehHeroi(a) && a.vivo) {
        const e = this.estadoItem(a);
        e.feridaAte = this.tempo + (ferida.duracao ?? 3);
        e.ferida = ferida.valor;
      }
      const eco = this.efeitoItem(dono, 'eco'),
        estado = this.estadoItem(dono);
      if (eco && estado.ecoProximo <= this.tempo + 1e-6 && a.vivo) {
        estado.ecoProximo = this.tempo + (eco.recarga ?? 8);
        this.ferir(a, eco.valor, dono.id, true);
        this.fx('impacto', a.x, a.z, 3, '#f2d4ff', 0.5);
      }
    }
  }
  private estadoItem(h: HeroiMoba) {
    let estado = this.estadosItens.get(h.id);
    if (!estado) {
      estado = { furiaAte: 0, stacks: 0, escudoProximo: 0, ecoProximo: 0, feridaAte: 0, ferida: 0 };
      this.estadosItens.set(h.id, estado);
    }
    return estado;
  }
  private efeitoItem(h: HeroiMoba, tipo: TipoEfeitoItemMoba) {
    return h.inventario
      .map((id) => itemMoba(id)?.efeito)
      .filter((e) => e?.tipo === tipo)
      .sort((a, b) => b!.valor - a!.valor)[0];
  }
  private curar(h: HeroiMoba, valor: number): void {
    const estado = this.estadosItens.get(h.id),
      fator = estado && estado.feridaAte > this.tempo ? 1 - estado.ferida : 1;
    h.vida = Math.min(h.vidaMax, h.vida + Math.max(0, valor) * fator);
  }
  private morrer(a: Alvo, dono: Alvo): void {
    if (ehEstrutura(a)) {
      this.evento(
        a.tipo === 'nucleo'
          ? 'O núcleo caiu!'
          : `${a.tipo === 'torre' ? 'Torre' : 'Inibidor'} ${a.time === 0 ? 'da Aurora' : 'do Eclipse'} destruído.`,
        dono.time as TimeMoba
      );
      for (const h of this.herois)
        if (h.time === dono.time) h.ouro += a.tipo === 'torre' ? 125 : 175;
      if (a.tipo === 'nucleo') {
        this.vencedor = dono.time as TimeMoba;
        this.estado = this.vencedor === this.local.time ? 'vitoria' : 'derrota';
      }
      return;
    }
    a.vivo = false;
    a.alvo = null;
    this.fx('queda', a.x, a.z, a.tipo === 'chefe' ? 6 : 2.5, a.cor, 1);
    if (ehHeroi(a)) {
      a.mortes++;
      a.escudo = 0;
      a.recall = 0;
      this.escudoAte.delete(a.id);
      this.destinos.delete(a.id);
      this.retirando.delete(a.id);
      const estadoItem = this.estadosItens.get(a.id);
      if (estadoItem) {
        estadoItem.furiaAte = 0;
        estadoItem.stacks = 0;
        estadoItem.feridaAte = 0;
      }
      this.lentidaoItens.delete(a.id);
      if (a.id === this.localId) {
        this.direcao = { x: 0, z: 0 };
        this.destino = null;
      }
      a.renasceEm = 8 + a.nivel * 2.2 + Math.min(18, this.tempo / 90);
      a.respawnEm = a.renasceEm;
      if (ehHeroi(dono)) {
        dono.abates++;
        dono.ouro += 280;
        this.ganharXp(dono, 190 + a.nivel * 22);
      }
      const contrib = this.contribuicoes.get(a.id);
      if (contrib)
        for (const [id, quando] of contrib) {
          const h = this.herois.find((h) => h.id === id);
          if (h && id !== dono.id && this.tempo - quando < 10) {
            h.assistencias++;
            h.ouro += 110;
            this.ganharXp(h, 100);
          }
        }
      this.contribuicoes.delete(a.id);
      this.evento(
        `${ehHeroi(dono) ? dono.nome : 'As defesas'} eliminou ${a.nome}.`,
        dono.time as TimeMoba
      );
      return;
    }
    const proximos = this.herois.filter((h) => h.time === dono.time && h.vivo && dist(h, a) < 24);
    const xp = a.tipo === 'chefe' ? 650 : a.tipo === 'neutro' ? 145 : a.tipo === 'cerco' ? 95 : 65;
    for (const h of proximos) this.ganharXp(h, xp / Math.max(1, Math.sqrt(proximos.length)));
    if (ehHeroi(dono)) {
      dono.ouro +=
        a.tipo === 'chefe' ? 350 : a.tipo === 'neutro' ? 85 : a.tipo === 'cerco' ? 65 : 27;
      dono.cs++;
    }
    if (a.time === 2) {
      a.respawnEm = a.tipo === 'chefe' ? 240 : 85;
      if (a.tipo === 'chefe' && dono.time !== 2) {
        this.buffAte[dono.time] = this.tempo + 150;
        for (const h of this.herois) if (h.time === dono.time) h.ouro += 200;
        this.evento(
          'Guardião derrotado! Equipe fortalecida contra estruturas por 150s.',
          dono.time
        );
      }
    }
  }
  private ganharXp(h: HeroiMoba, xp: number): void {
    if (h.nivel >= 18) return;
    h.xp += xp;
    while (h.nivel < 18 && h.xp >= this.xpProximoNivel(h.nivel)) {
      h.xp -= this.xpProximoNivel(h.nivel);
      h.nivel++;
      h.pontos++;
      this.atualizarAtributos(h, true);
      this.fx('nivel', h.x, h.z, 3, '#ffe7a3', 1);
    }
  }
  xpProximoNivel(nivel: number): number {
    return 100 + nivel * 65;
  }
  private atualizarAtributos(h: HeroiMoba, curarBonus: boolean): void {
    const d = heroiMoba(h.defId),
      itens = h.inventario
        .map((id) => itemMoba(id))
        .filter((item): item is NonNullable<typeof item> => !!item),
      vidaAntes = h.vidaMax,
      manaAntes = h.manaMax;
    h.vidaMax = d.vida + (h.nivel - 1) * 92 + itens.reduce((s, i) => s + (i.vida ?? 0), 0);
    h.manaMax = d.mana + (h.nivel - 1) * 29 + itens.reduce((s, i) => s + (i.mana ?? 0), 0);
    h.dano = d.dano + (h.nivel - 1) * 4.5 + itens.reduce((s, i) => s + (i.dano ?? 0), 0);
    h.armadura =
      d.armadura +
      (h.nivel - 1) * 2.2 +
      itens.reduce((s, i) => s + (i.armadura ?? 0), 0) +
      (d.passiva.tipo === 'armadura' ? 8 + h.nivel : 0);
    h.velocidade = Math.min(15, d.velocidade + itens.reduce((s, i) => s + (i.velocidade ?? 0), 0));
    if (curarBonus) {
      h.vida += Math.max(0, h.vidaMax - vidaAntes);
      h.mana += Math.max(0, h.manaMax - manaAntes);
    }
  }
  private fx(
    tipo: string,
    x: number,
    z: number,
    raio: number,
    cor: string,
    vida: number,
    x2?: number,
    z2?: number
  ): void {
    if (this.efeitos.length >= 128) this.efeitos.shift();
    this.efeitos.push({ id: this.id(), tipo, x, z, raio, cor, vida, total: vida, x2, z2 });
  }
  private evento(texto: string, time?: TimeMoba): void {
    this.eventos.push({ texto, tempo: this.tempo, time });
    if (this.eventos.length > 12) this.eventos.shift();
  }
}
