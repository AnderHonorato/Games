/** Benefícios finitos da arena. A partida aplica o efeito após autorizar o uso. */
import * as THREE from 'three';
import type { IdMapa } from '../dados/mapas';
import type { Obstaculo } from '../render/arena';
import { gradienteToon } from '../../render/materiais';

export type TipoInteracaoMapa = 'fonte' | 'totem' | 'cofre';
export interface InteracaoMapa {
  id: string;
  tipo: TipoInteracaoMapa;
  nome: string;
  descricao: string;
  x: number;
  z: number;
}
export interface EstadoInteracoesMapa {
  consumidas: string[];
  dinamica?: boolean;
}

const TIPOS: TipoInteracaoMapa[] = ['fonte', 'totem', 'cofre'];
const DEFINICOES = {
  fonte: { nome: 'Fonte da vitalidade', descricao: 'Recupera 35% da vida máxima', cor: '#60debd' },
  totem: { nome: 'Totem de proteção', descricao: 'Escudo por 6 segundos', cor: '#6bbff4' },
  cofre: {
    nome: 'Baú das possibilidades',
    descricao: '+1 rolagem e chance de poder ou bênção em um espaço livre',
    cor: '#f0bf67',
  },
};
export const DISTANCIA_INTERACAO_MAPA = 3.4;

/** Busca determinística, usando os obstáculos reais da arena em qualquer qualidade. */
export function pontosInteracoesMapa(
  mapa: IdMapa,
  obstaculos: readonly Obstaculo[] = []
): InteracaoMapa[] {
  const fase = mapa === 'forja' ? 0.48 : mapa === 'abismo' ? 0.95 : 0;
  const pontos: InteracaoMapa[] = [];
  for (let i = 0; i < 6; i++) {
    const angulo = fase + (i * Math.PI) / 3;
    const distancia = i < 3 ? 15 + i * 4 : 37 + (i - 3) * 5;
    let x = Math.cos(angulo) * distancia,
      z = Math.sin(angulo) * distancia;
    // Espiral local com folga para o objeto, o jogador e a aproximação.
    for (let tentativa = 0; tentativa < 600; tentativa++) {
      const raio = tentativa === 0 ? 0 : 0.48 * Math.sqrt(tentativa);
      const a = tentativa * 2.399963229728653;
      const cx = Math.cos(angulo) * distancia + Math.cos(a) * raio;
      const cz = Math.sin(angulo) * distancia + Math.sin(a) * raio;
      if (Math.hypot(cx, cz) > 83) continue;
      if (obstaculos.some((o) => Math.hypot(o.x - cx, o.z - cz) < o.r + 3.2)) continue;
      if (pontos.some((p) => Math.hypot(p.x - cx, p.z - cz) < 8)) continue;
      x = cx;
      z = cz;
      break;
    }
    const tipo = TIPOS[i % 3];
    pontos.push({ id: `${mapa}:${tipo}:${Math.floor(i / 3)}`, tipo, ...DEFINICOES[tipo], x, z });
  }
  return pontos;
}

interface ObjetoInterativo {
  info: InteracaoMapa;
  grupo: THREE.Group;
  simbolo: THREE.Group;
  anel: THREE.Mesh<THREE.RingGeometry, THREE.MeshBasicMaterial>;
  tampa?: THREE.Group;
  agua?: THREE.Mesh;
  consumida: boolean;
  uso: number;
}

export class InteracoesMapa {
  readonly grupo = new THREE.Group();
  private objetos: ObjetoInterativo[] = [];
  private tempo = 0;
  private descartada = false;
  private dinamica = false;
  /** Histórico exato limitado: após 32768 usos, os recursos mais remotos podem renovar. */
  private consumidas = new Set<string>();
  private foiUsada(id: string): boolean {
    return this.consumidas.has(id);
  }
  private memorizar(id: string): void {
    this.consumidas.add(id);
    if (this.consumidas.size > 32768)
      this.consumidas.delete(this.consumidas.values().next().value!);
  }
  sincronizar(pontos: readonly { id: string; tipo: string; x: number; z: number }[]): void {
    if (this.descartada) return;
    this.dinamica = true;
    const validos = pontos
      .filter((p) => p.tipo === 'fonte' || p.tipo === 'totem' || p.tipo === 'cofre')
      .slice(0, 196);
    const ids = new Set(validos.map((p) => p.id));
    for (const o of this.objetos) if (!ids.has(o.info.id)) this.removerObjeto(o);
    this.objetos = this.objetos.filter((o) => ids.has(o.info.id));
    const existentes = new Set(this.objetos.map((o) => o.info.id));
    for (const p of validos)
      if (!existentes.has(p.id)) {
        const tipo = p.tipo as TipoInteracaoMapa;
        const o = this.criar({ ...p, tipo, ...DEFINICOES[tipo] });
        o.consumida = this.foiUsada(p.id);
        this.objetos.push(o);
      }
  }
  private removerObjeto(o: ObjetoInterativo): void {
    const materiais = new Set<THREE.Material>();
    o.grupo.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry.dispose();
        for (const m of Array.isArray(obj.material) ? obj.material : [obj.material])
          materiais.add(m);
      }
    });
    for (const m of materiais) m.dispose();
    o.grupo.removeFromParent();
  }

  constructor(cena: THREE.Scene, mapa: IdMapa, obstaculos: readonly Obstaculo[] = []) {
    this.grupo.name = 'interacoes-mapa';
    for (const info of pontosInteracoesMapa(mapa, obstaculos)) this.objetos.push(this.criar(info));
    cena.add(this.grupo);
  }

  private criar(info: InteracaoMapa): ObjetoInterativo {
    const grupo = new THREE.Group();
    grupo.name = info.id;
    grupo.position.set(info.x, 0, info.z);
    this.grupo.add(grupo);
    const toon = (cor: string) =>
      new THREE.MeshToonMaterial({ color: cor, gradientMap: gradienteToon() });
    const escuro = toon('#314b61');
    const pedra = info.tipo === 'cofre' ? escuro : toon('#73878b');
    const destaque = toon(DEFINICOES[info.tipo].cor);
    destaque.emissive.set(DEFINICOES[info.tipo].cor);
    destaque.emissiveIntensity = 0.12;
    const por = (
      geo: THREE.BufferGeometry,
      mat: THREE.Material,
      x: number,
      y: number,
      z: number,
      pai: THREE.Object3D = grupo
    ) => {
      const m = new THREE.Mesh(geo, mat);
      m.position.set(x, y, z);
      m.castShadow = true;
      pai.add(m);
      return m;
    };
    por(new THREE.CylinderGeometry(1.28, 1.48, 0.22, 8), escuro, 0, 0.13, 0);
    const anel = new THREE.Mesh(
      new THREE.RingGeometry(1.55, 1.76, 48),
      new THREE.MeshBasicMaterial({
        color: DEFINICOES[info.tipo].cor,
        transparent: true,
        opacity: 0.25,
        depthWrite: false,
        side: THREE.DoubleSide,
      })
    );
    anel.rotation.x = -Math.PI / 2;
    anel.position.y = 0.035;
    grupo.add(anel);
    const simbolo = new THREE.Group();
    simbolo.position.y = 2.35;
    grupo.add(simbolo);
    const objeto: ObjetoInterativo = { info, grupo, simbolo, anel, consumida: false, uso: 0 };
    if (info.tipo === 'fonte') {
      for (let k = 0; k < 9; k++) {
        const a = (k * Math.PI * 2) / 9;
        const rocha = por(
          new THREE.DodecahedronGeometry(0.43),
          pedra,
          Math.cos(a) * 1.04,
          0.48,
          Math.sin(a) * 1.04
        );
        rocha.scale.y = 0.72;
      }
      const agua = por(
        new THREE.CircleGeometry(0.97, 32),
        new THREE.MeshBasicMaterial({ color: '#3bbfc6' }),
        0,
        0.36,
        0
      );
      agua.rotation.x = -Math.PI / 2;
      objeto.agua = agua;
      const onda = por(new THREE.TorusGeometry(0.58, 0.035, 5, 32), destaque, 0, 0.39, 0);
      onda.rotation.x = Math.PI / 2;
      por(new THREE.BoxGeometry(0.36, 0.16, 1.05), destaque, 0, 0, 0, simbolo);
      por(new THREE.BoxGeometry(1.05, 0.16, 0.36), destaque, 0, 0, 0, simbolo);
    } else if (info.tipo === 'totem') {
      por(new THREE.CylinderGeometry(0.48, 0.7, 1.32, 6), pedra, 0, 0.92, 0);
      por(new THREE.CylinderGeometry(0.82, 0.82, 0.2, 6), destaque, 0, 1.58, 0);
      const forma = new THREE.Shape();
      forma.moveTo(-0.65, 0.55);
      forma.lineTo(0.65, 0.55);
      forma.lineTo(0.55, -0.25);
      forma.lineTo(0, -0.85);
      forma.lineTo(-0.55, -0.25);
      forma.closePath();
      const escudo = por(
        new THREE.ExtrudeGeometry(forma, {
          depth: 0.15,
          bevelEnabled: true,
          bevelThickness: 0.06,
          bevelSize: 0.06,
          bevelSegments: 1,
          steps: 1,
        }),
        destaque,
        0,
        0,
        0,
        simbolo
      );
      escudo.rotation.x = -Math.PI / 2;
      por(new THREE.BoxGeometry(0.12, 0.12, 0.74), escuro, 0, 0.2, 0, simbolo);
    } else {
      const madeira = toon('#975b38'),
        ouro = toon('#efbc61');
      por(new THREE.BoxGeometry(1.8, 0.85, 1.3), madeira, 0, 0.73, 0);
      for (const x of [-0.62, 0.62]) por(new THREE.BoxGeometry(0.15, 0.93, 1.37), ouro, x, 0.73, 0);
      const tampa = new THREE.Group();
      tampa.position.set(0, 1.12, -0.65);
      grupo.add(tampa);
      por(new THREE.BoxGeometry(1.88, 0.3, 1.35), madeira, 0, 0.12, 0.65, tampa);
      for (const x of [-0.62, 0.62])
        por(new THREE.BoxGeometry(0.16, 0.33, 1.4), ouro, x, 0.12, 0.65, tampa);
      por(new THREE.BoxGeometry(0.3, 0.36, 0.13), ouro, 0, 1.03, 0.72);
      objeto.tampa = tampa;
      const estrela = por(new THREE.OctahedronGeometry(0.48), destaque, 0, 0, 0, simbolo);
      estrela.scale.y = 0.45;
    }
    return objeto;
  }

  listar(): InteracaoMapa[] {
    return this.objetos.map((o) => ({ ...o.info }));
  }

  proxima(x: number, z: number): InteracaoMapa | null {
    if (this.descartada || !Number.isFinite(x) || !Number.isFinite(z)) return null;
    let melhor: ObjetoInterativo | undefined,
      distancia = DISTANCIA_INTERACAO_MAPA;
    for (const objeto of this.objetos) {
      if (objeto.consumida) continue;
      const d = Math.hypot(objeto.info.x - x, objeto.info.z - z);
      if (d <= distancia) {
        distancia = d;
        melhor = objeto;
      }
    }
    return melhor ? { ...melhor.info } : null;
  }

  usar(id: string): boolean {
    if (this.descartada) return false;
    const objeto = this.objetos.find((o) => o.info.id === id);
    if (!objeto || objeto.consumida) return false;
    objeto.consumida = true;
    this.memorizar(id);
    objeto.uso = 1;
    this.atualizar(0);
    return true;
  }

  atualizar(dt: number): void {
    if (this.descartada) return;
    const passo = Number.isFinite(dt) ? Math.max(0, Math.min(dt, 0.2)) : 0;
    this.tempo += passo;
    for (let i = 0; i < this.objetos.length; i++) {
      const o = this.objetos[i];
      o.uso = Math.max(0, o.uso - passo * 1.3);
      o.simbolo.visible = !o.consumida;
      o.simbolo.position.y = 2.35 + Math.sin(this.tempo * 2 + i) * 0.13;
      o.simbolo.rotation.y = this.tempo * 0.45 + i;
      o.anel.material.opacity = o.consumida
        ? 0.07 + o.uso * 0.23
        : 0.22 + Math.sin(this.tempo * 2 + i) * 0.04;
      o.anel.scale.setScalar(o.consumida ? 1 + (1 - o.uso) * 0.5 : 1);
      if (o.tampa) o.tampa.rotation.x = o.consumida ? -1.14 * (1 - o.uso * o.uso) : 0;
      if (o.agua) o.agua.visible = !o.consumida;
    }
  }

  snapshot(): EstadoInteracoesMapa {
    return {
      consumidas: [...this.consumidas],
      ...(this.dinamica ? { dinamica: true } : {}),
    };
  }

  importar(estado: EstadoInteracoesMapa): void {
    if (this.descartada) return;
    if (estado.dinamica === true) this.dinamica = true;
    const ids = new Set(
      (Array.isArray(estado?.consumidas) ? estado.consumidas : [])
        .filter(
          (id) =>
            typeof id === 'string' &&
            id.length <= 160 &&
            (this.dinamica || this.objetos.some((o) => o.info.id === id))
        )
        .slice(-32768)
    );
    this.consumidas = ids;
    for (const o of this.objetos) {
      o.consumida = this.foiUsada(o.info.id);
      o.uso = 0;
    }
    this.atualizar(0);
  }

  reset(): void {
    this.importar({ consumidas: [] });
  }

  descartar(): void {
    if (this.descartada) return;
    this.descartada = true;
    this.grupo.removeFromParent();
    const geometrias = new Set<THREE.BufferGeometry>(),
      materiais = new Set<THREE.Material>();
    this.grupo.traverse((o) => {
      if (!(o instanceof THREE.Mesh)) return;
      geometrias.add(o.geometry);
      for (const m of Array.isArray(o.material) ? o.material : [o.material]) materiais.add(m);
    });
    for (const geo of geometrias) geo.dispose();
    for (const mat of materiais) mat.dispose();
    this.grupo.clear();
    this.objetos = [];
  }
}
