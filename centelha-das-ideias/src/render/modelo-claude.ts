/**
 * O Claude em 3D: corpo terracota arredondado, olhos escuros, bracinhos e pezinhos,
 * e a centelha que flutua sobre a cabeça. Toda a animação é procedural: andar,
 * correr, pular (antecipação, estica, encolhe), rolar, golpear, apanhar, dormir,
 * e linguagem corporal para cada emoção.
 */
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import type { Humor } from '../nucleo/tipos';
import { aproximar, aproximarAngulo, limitar } from '../nucleo/matematica';
import { Emote } from './emotes';
import { gradienteToon } from './materiais';
import { Rosto } from './rosto';
import {
  normalizarPersonalizacao,
  personalizacaoPadrao,
  type Personalizacao,
} from './personalizacao';

export interface EstadoAnimacao {
  /** Velocidade horizontal (m/s) e a máxima de corrida. */
  velocidade: number;
  noChao: boolean;
  vy: number;
  /** Ângulo para onde o corpo olha (rad, 0 = +z). */
  angulo: number;
  /** 0..1 durante o golpe; -1 = sem golpe. */
  golpe: number;
  /** Ângulo do golpe atual (para torcer o corpo). */
  anguloGolpe: number;
  /** 0..1 durante a esquiva; -1 = sem esquiva. */
  esquiva: number;
  ferido: number;
  humor: Humor;
  escondido: boolean;
  defendendo: boolean;
  falando: boolean;
  /** 0..1 enquanto a habilidade é lançada. */
  conjurando: number;
}

const COR_CORPO = '#D97757';
const COR_ESCURA = '#B65A3E';

export type IdentidadeVisual =
  'claude' | 'gpt' | 'gemini' | 'llama' | 'mistral' | 'deepseek' | 'aurora' | 'nox' | 'byte';

// Cadências próprias do roguelike; o modelo sem identidade conserva a aventura.
const CADENCIAS: Record<
  IdentidadeVisual,
  { passo: number; salto: number; balanco: number; pulso: number; amplitude: number }
> = {
  claude: { passo: 1, salto: 1, balanco: 0.035, pulso: 2.4, amplitude: 0.88 },
  gpt: { passo: 1.16, salto: 0.52, balanco: 0.018, pulso: 3.7, amplitude: 0.72 },
  gemini: { passo: 1.06, salto: 1.3, balanco: 0.08, pulso: 3.1, amplitude: 1.05 },
  llama: { passo: 0.78, salto: 0.8, balanco: 0.06, pulso: 1.7, amplitude: 0.64 },
  mistral: { passo: 1.36, salto: 0.65, balanco: 0.045, pulso: 4.8, amplitude: 1.25 },
  deepseek: { passo: 0.66, salto: 0.4, balanco: 0.1, pulso: 1.25, amplitude: 0.55 },
  aurora: { passo: 0.94, salto: 1.15, balanco: 0.09, pulso: 3.8, amplitude: 1.12 },
  nox: { passo: 1.22, salto: 0.35, balanco: 0.025, pulso: 2.8, amplitude: 0.78 },
  byte: { passo: 1.08, salto: 1.45, balanco: 0.055, pulso: 5.2, amplitude: 0.98 },
};

/** Aparência do personagem (o mesmo esqueleto animado serve para todos). */
export interface Aparencia {
  /** Ausente no modo aventura, que conserva a animação clássica. */
  identidade?: IdentidadeVisual;
  corCorpo: string;
  corEscura: string;
  corCentelha?: string;
  /** Geometria do corpo (centrada no núcleo, ~0,9 m). */
  corpo?: () => THREE.BufferGeometry;
  /** Posição do rosto (frente do corpo). */
  rostoZ?: number;
  rostoY?: number;
  /** Enfeites extras presos ao núcleo (orelhas, anel, cauda...). */
  enfeite?: (nucleo: THREE.Object3D, mat: (cor: string) => THREE.Material) => void;
}

export class ModeloClaude {
  readonly raiz = new THREE.Group();
  /** Pivô de giro (olha para a direção do movimento). */
  private giro = new THREE.Group();
  /** Pivô de achatamento/estiramento (na base). */
  private mola = new THREE.Group();
  private corpo = new THREE.Group();
  /** Pivô central (para a cambalhota da esquiva). */
  private nucleo = new THREE.Group();
  private bracoE = new THREE.Group();
  private bracoD = new THREE.Group();
  private peE = new THREE.Group();
  private peD = new THREE.Group();
  private centelha: THREE.Mesh;
  private brilhoCentelha: THREE.Sprite;
  readonly rosto: Rosto;
  readonly emote = new Emote(2.0);
  private materiais: THREE.MeshToonMaterial[] = [];
  private matCentelha: THREE.MeshBasicMaterial;
  private sombra: THREE.Mesh;
  /** Mão direita em coordenadas do mundo (de onde sai a magia que guia a arma). */
  readonly mao = new THREE.Object3D();

  private fase = 0;
  private esticar = 0;
  private esticarV = 0;
  private tempo = 0;
  private noChaoAntes = true;
  private anguloVisual = 0;
  private inclinacao = 0;
  private girar = 0;
  private flash = 0;
  private corBaseCentelha = '#ffd27a';
  private corAlvoCentelha = new THREE.Color();
  private corpoMat: THREE.MeshToonMaterial;
  private bracosMat: THREE.MeshToonMaterial;
  private pernasMat: THREE.MeshToonMaterial;
  private personalizacao: Personalizacao;
  private nivelPoder = 1;
  private descartado = false;
  private falaRestante = 0;
  private cosmeticos: THREE.Group[] = [];
  private materiaisCosmeticos: THREE.MeshToonMaterial[] = [];
  private capa: THREE.Object3D | null = null;
  private asas: THREE.Object3D[] = [];
  private aura: THREE.Group | null = null;
  private readonly identidade?: IdentidadeVisual;
  private aderecoIdentidade: THREE.Group | null = null;

  constructor(aparencia?: Aparencia) {
    const ap: Aparencia = aparencia ?? { corCorpo: COR_CORPO, corEscura: COR_ESCURA };
    this.identidade = ap.identidade;
    this.nucleo.name = 'pivo-nucleo';
    this.corpo.name = 'pivo-corpo';
    this.bracoE.name = 'pivo-braco-esquerdo';
    this.bracoD.name = 'pivo-braco-direito';
    this.peE.name = 'pivo-pe-esquerdo';
    this.peD.name = 'pivo-pe-direito';
    const mat = (cor: string) => {
      const m = new THREE.MeshToonMaterial({
        color: cor,
        gradientMap: gradienteToon(),
        transparent: true,
      });
      this.materiais.push(m);
      return m;
    };
    this.personalizacao = personalizacaoPadrao(ap.corCorpo);
    const corpoMat = (this.corpoMat = mat(ap.corCorpo));
    const escuroMat = (this.bracosMat = mat(ap.corEscura));
    this.pernasMat = mat(ap.corEscura);

    // corpo: bloco arredondado, levemente mais largo embaixo
    const geoCorpo = ap.corpo ? ap.corpo() : new RoundedBoxGeometry(0.92, 0.82, 0.72, 5, 0.24);
    const tronco = new THREE.Mesh(geoCorpo, corpoMat);
    tronco.castShadow = true;
    this.nucleo.position.y = 0.62;
    this.corpo.add(this.nucleo);
    this.nucleo.add(tronco);
    // contorno cartoon (casca invertida)
    const contorno = new THREE.Mesh(
      geoCorpo,
      new THREE.MeshBasicMaterial({ color: '#3a2228', side: THREE.BackSide })
    );
    contorno.position.copy(tronco.position);
    contorno.scale.setScalar(1.06);
    this.nucleo.add(contorno);

    // rosto na frente (+z)
    this.rosto = new Rosto({
      separacao: this.identidade === 'byte' ? 0.19 : this.identidade === 'nox' ? 0.155 : 0.17,
      tamanho:
        this.identidade === 'aurora' ? 0.095 : this.identidade === 'deepseek' ? 0.075 : 0.085,
    });
    this.rosto.grupo.position.set(0, ap.rostoY ?? 0.08, ap.rostoZ ?? 0.365);
    this.nucleo.add(this.rosto.grupo);
    ap.enfeite?.(this.nucleo, mat);

    // bracinhos
    for (const [g, lado] of [
      [this.bracoE, -1],
      [this.bracoD, 1],
    ] as const) {
      g.position.set(lado * 0.47, 0.04, 0);
      const braco = new THREE.Mesh(new THREE.CapsuleGeometry(0.075, 0.2, 4, 8), escuroMat);
      braco.position.y = -0.14;
      braco.castShadow = true;
      g.add(braco);
      this.nucleo.add(g);
    }
    const ponta = new THREE.Object3D();
    ponta.position.y = -0.3;
    this.bracoD.add(ponta);
    ponta.add(this.mao);

    // pezinhos
    for (const [g, lado] of [
      [this.peE, -1],
      [this.peD, 1],
    ] as const) {
      g.position.set(lado * 0.2, 0.2, 0);
      const pe = new THREE.Mesh(new THREE.CapsuleGeometry(0.09, 0.12, 4, 8), this.pernasMat);
      pe.rotation.x = Math.PI / 2;
      pe.position.set(0, -0.11, 0.04);
      pe.castShadow = true;
      g.add(pe);
      this.mola.add(g);
    }

    // a centelha sobre a cabeça
    this.matCentelha = new THREE.MeshBasicMaterial({ color: ap.corCentelha ?? '#ffd27a' });
    this.corBaseCentelha = ap.corCentelha ?? '#ffd27a';
    this.centelha = new THREE.Mesh(new THREE.OctahedronGeometry(0.11, 0), this.matCentelha);
    this.centelha.position.set(0, 0.7, 0);
    this.nucleo.add(this.centelha);
    const texBrilho = (() => {
      const c = document.createElement('canvas');
      c.width = c.height = 64;
      const g = c.getContext('2d')!;
      const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
      gr.addColorStop(0, 'rgba(255,240,200,1)');
      gr.addColorStop(1, 'rgba(255,200,120,0)');
      g.fillStyle = gr;
      g.fillRect(0, 0, 64, 64);
      const t = new THREE.CanvasTexture(c);
      t.colorSpace = THREE.SRGBColorSpace;
      return t;
    })();
    this.brilhoCentelha = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: texBrilho,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        transparent: true,
      })
    );
    this.brilhoCentelha.scale.setScalar(0.7);
    this.brilhoCentelha.position.copy(this.centelha.position);
    this.nucleo.add(this.brilhoCentelha);

    this.mola.add(this.corpo);
    this.giro.add(this.mola);
    this.raiz.add(this.giro);
    this.raiz.add(this.emote.sprite);

    // sombra de contato (ajuda a ler a altura do pulo)
    this.sombra = new THREE.Mesh(
      new THREE.CircleGeometry(0.42, 20),
      new THREE.MeshBasicMaterial({
        color: '#1d1720',
        transparent: true,
        opacity: 0.35,
        depthWrite: false,
      })
    );
    this.sombra.rotation.x = -Math.PI / 2;
    this.sombra.renderOrder = 2;
    this.personalizar({});
  }

  /** Atualiza apenas o visual; pivôs de movimento e a posição física permanecem intactos. */
  personalizar(valor: Partial<Personalizacao>): void {
    if (this.descartado) return;
    this.personalizacao = normalizarPersonalizacao(
      { ...this.personalizacao, ...valor },
      this.personalizacao.corCorpo
    );
    const p = this.personalizacao;
    this.corpoMat.color.set(p.corCorpo);
    this.bracosMat.color.set(p.corBracos);
    this.pernasMat.color.set(p.corPernas);
    this.rosto.definirCorOlhos(p.corOlhos);
    this.reconstruirCosmeticos();
  }

  definirPoder(nivel: number): void {
    if (this.descartado) return;
    const novo = Number.isFinite(nivel) ? Math.max(1, Math.floor(nivel)) : 1;
    const estagioAntes =
      this.nivelPoder >= 20
        ? 3
        : this.nivelPoder >= 10
          ? 2
          : this.identidade && this.nivelPoder >= 5
            ? 1
            : 0;
    const estagioDepois = novo >= 20 ? 3 : novo >= 10 ? 2 : this.identidade && novo >= 5 ? 1 : 0;
    this.nivelPoder = novo;
    if (estagioAntes !== estagioDepois) this.reconstruirCosmeticos();
  }

  /** A fala externa e o EstadoAnimacao.falando podem acionar o mesmo gesto. */
  falar(duracao = 2.2): void {
    if (this.descartado) return;
    if (Number.isFinite(duracao))
      this.falaRestante = Math.max(this.falaRestante, Math.max(0, duracao));
  }

  /** Libera somente recursos deste modelo; o atlas de emotes e a rampa toon são globais. */
  descartar(): void {
    if (this.descartado) return;
    this.descartado = true;
    this.raiz.removeFromParent();
    this.sombra.removeFromParent();
    const geometrias = new Set<THREE.BufferGeometry>();
    const materiais = new Set<THREE.Material>();
    const coletar = (obj: THREE.Object3D) => {
      if (obj instanceof THREE.Mesh) geometrias.add(obj.geometry);
      if (obj instanceof THREE.Mesh || obj instanceof THREE.Sprite) {
        if (Array.isArray(obj.material)) for (const m of obj.material) materiais.add(m);
        else materiais.add(obj.material);
      }
    };
    this.raiz.traverse(coletar);
    coletar(this.sombra);
    for (const geo of geometrias) geo.dispose();
    for (const mat of materiais) mat.dispose();
    // Criada no construtor, exclusiva do brilho deste personagem.
    (this.brilhoCentelha.material as THREE.SpriteMaterial).map?.dispose();
    this.raiz.clear();
    this.materiais.length = 0;
    this.materiaisCosmeticos.length = 0;
    this.cosmeticos.length = 0;
    this.asas.length = 0;
    this.capa = null;
    this.aura = null;
    this.aderecoIdentidade = null;
  }

  private reconstruirCosmeticos(): void {
    // Geometrias e materiais são exclusivos destes grupos. A rampa toon é compartilhada.
    const geometrias = new Set<THREE.BufferGeometry>();
    for (const grupo of this.cosmeticos) {
      grupo.removeFromParent();
      grupo.traverse((obj) => {
        if (obj instanceof THREE.Mesh) geometrias.add(obj.geometry);
      });
    }
    for (const geo of geometrias) geo.dispose();
    for (const material of this.materiaisCosmeticos) {
      const indice = this.materiais.indexOf(material);
      if (indice >= 0) this.materiais.splice(indice, 1);
      material.dispose();
    }
    this.cosmeticos.length = 0;
    this.materiaisCosmeticos.length = 0;
    this.asas.length = 0;
    this.capa = null;
    this.aura = null;
    this.aderecoIdentidade = null;
    const p = this.personalizacao;
    const grupo = (pai: THREE.Object3D, nome: string) => {
      const g = new THREE.Group();
      g.name = nome;
      pai.add(g);
      this.cosmeticos.push(g);
      return g;
    };
    const material = (cor: string) => {
      const m = new THREE.MeshToonMaterial({
        color: cor,
        gradientMap: gradienteToon(),
        transparent: true,
      });
      this.materiaisCosmeticos.push(m);
      this.materiais.push(m);
      return m;
    };
    const tecido = material(p.corRoupa);
    const detalhe = material(p.corDetalhe);
    const pele = material(p.corBracos);
    const botas = material(p.corPernas);
    const couro = material('#382c39');
    const metal = material(p.roupa === 'guardiao' ? '#c6dae4' : '#fff1cb');
    const malha = (
      pai: THREE.Object3D,
      geo: THREE.BufferGeometry,
      mat: THREE.MeshToonMaterial,
      x: number,
      y: number,
      z: number,
      nome?: string
    ) => {
      const m = new THREE.Mesh(geo, mat);
      m.position.set(x, y, z);
      m.castShadow = true;
      if (nome) m.name = nome;
      pai.add(m);
      return m;
    };
    const caixa = (
      pai: THREE.Object3D,
      x: number,
      y: number,
      z: number,
      largura: number,
      altura: number,
      fundo: number,
      mat: THREE.MeshToonMaterial,
      nome?: string
    ) =>
      malha(
        pai,
        new RoundedBoxGeometry(largura, altura, fundo, 2, Math.min(largura, altura, fundo) * 0.22),
        mat,
        x,
        y,
        z,
        nome
      );
    const roupa = grupo(this.nucleo, `roupa-${p.roupa}`);
    // Bainha em volume e dois painéis laterais preservam a leitura do rosto.
    caixa(roupa, 0, -0.3, 0, 0.98, 0.27, 0.77, tecido, 'tunica');
    for (const lado of [-1, 1]) {
      caixa(roupa, lado * 0.375, -0.1, 0.29, 0.16, 0.4, 0.22, tecido, 'painel-do-colete');
      const gola = caixa(roupa, lado * 0.32, 0.1, 0.3, 0.12, 0.23, 0.16, detalhe, 'gola');
      gola.rotation.z = lado * 0.4;
      // Pontos de costura realmente elevados na superfície da roupa.
      for (let i = 0; i < 4; i++) {
        caixa(roupa, lado * 0.4, -0.34 + i * 0.075, 0.416, 0.035, 0.018, 0.016, detalhe, 'costura');
      }
    }
    caixa(roupa, 0, -0.3, 0.012, 1.015, 0.075, 0.79, couro, 'cinto');
    caixa(roupa, 0, -0.3, 0.423, 0.16, 0.105, 0.045, detalhe, 'fivela');
    caixa(roupa, 0, -0.3, 0.45, 0.085, 0.052, 0.014, couro);
    caixa(roupa, -0.38, -0.37, 0.34, 0.18, 0.2, 0.16, couro, 'bolsa');
    if (p.roupa === 'mago') {
      const saia = malha(
        roupa,
        new THREE.CylinderGeometry(0.45, 0.59, 0.35, 12),
        tecido,
        0,
        -0.43,
        0,
        'saia-de-mago'
      );
      saia.scale.z = 0.82;
      for (const lado of [-1, 1])
        caixa(roupa, lado * 0.23, -0.45, 0.48, 0.035, 0.3, 0.025, detalhe, 'bordado');
    }
    if (p.roupa === 'guardiao') {
      caixa(roupa, 0, -0.2, 0.405, 0.65, 0.18, 0.1, metal, 'peitoral');
      const selo = malha(
        roupa,
        new THREE.OctahedronGeometry(0.085),
        detalhe,
        0,
        -0.2,
        0.49,
        'brasao'
      );
      selo.scale.z = 0.3;
      for (const lado of [-1, 1])
        caixa(roupa, lado * 0.47, 0.05, 0, 0.26, 0.19, 0.42, metal, 'ombreira');
    }
    if (p.roupa !== 'aventureiro') {
      const capa = new THREE.Group();
      capa.position.set(0, 0.22, -0.37);
      roupa.add(capa);
      const pano = caixa(capa, 0, -0.35, -0.05, 0.8, 0.78, 0.07, tecido, 'capa');
      pano.rotation.z = 0.04;
      for (const lado of [-1, 1])
        caixa(capa, lado * 0.34, -0.35, -0.095, 0.035, 0.72, 0.02, detalhe);
      this.capa = capa;
    }
    for (const lado of [-1, 1]) {
      const braco = grupo(lado < 0 ? this.bracoE : this.bracoD, `manga-${lado}`);
      malha(braco, new THREE.CapsuleGeometry(0.09, 0.1, 4, 8), tecido, 0, -0.055, 0, 'manga');
      malha(braco, new THREE.TorusGeometry(0.08, 0.019, 5, 10), detalhe, 0, -0.15, 0).rotation.x =
        Math.PI / 2;
      const mao = malha(braco, new THREE.SphereGeometry(0.092, 10, 8), pele, 0, -0.3, 0, 'mao');
      mao.scale.set(1, 1.05, 0.8);
      malha(
        braco,
        new THREE.SphereGeometry(0.04, 8, 6),
        pele,
        -lado * 0.065,
        -0.28,
        0.035,
        'polegar'
      );
      const pe = grupo(lado < 0 ? this.peE : this.peD, `bota-${lado}`);
      caixa(pe, 0, -0.09, 0.04, 0.23, 0.18, 0.34, botas, 'bota');
      caixa(pe, 0, -0.17, 0.07, 0.25, 0.045, 0.36, couro, 'sola');
      caixa(pe, 0, -0.05, 0.19, 0.13, 0.035, 0.025, detalhe, 'fivela-bota');
    }
    const cabeca = grupo(this.nucleo, `cabeca-${p.cabeca}`);
    if (p.cabeca === 'bone') {
      const topo = malha(
        cabeca,
        new THREE.SphereGeometry(0.43, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2),
        tecido,
        0,
        0.34,
        0
      );
      topo.scale.set(1.1, 0.6, 0.9);
      caixa(cabeca, 0, 0.36, 0.33, 0.64, 0.055, 0.42, detalhe, 'aba-do-bone');
      malha(cabeca, new THREE.SphereGeometry(0.045, 8, 6), detalhe, 0, 0.61, 0);
    } else if (p.cabeca === 'capuz') {
      const capuz = malha(
        cabeca,
        new THREE.TorusGeometry(0.4, 0.11, 6, 18, Math.PI * 1.25),
        tecido,
        0,
        0.1,
        -0.02,
        'capuz'
      );
      capuz.rotation.z = -Math.PI * 0.125;
      caixa(cabeca, 0, 0.26, -0.29, 0.66, 0.43, 0.26, tecido);
      for (const lado of [-1, 1])
        caixa(cabeca, lado * 0.31, -0.06, 0.3, 0.025, 0.22, 0.025, detalhe, 'cordao');
    }
    if (p.cabeca === 'coroa' || this.nivelPoder >= 10) {
      const altura = p.cabeca === 'bone' || p.cabeca === 'capuz' ? 0.67 : 0.49;
      malha(
        cabeca,
        new THREE.CylinderGeometry(0.3, 0.32, 0.09, 10, 1, true),
        detalhe,
        0,
        altura,
        0,
        'coroa-evolucao'
      );
      for (let i = 0; i < 5; i++) {
        const a = (i * Math.PI * 2) / 5;
        malha(
          cabeca,
          new THREE.ConeGeometry(0.065, 0.19, 4),
          detalhe,
          Math.sin(a) * 0.28,
          altura + 0.12,
          Math.cos(a) * 0.28
        );
      }
      malha(cabeca, new THREE.OctahedronGeometry(0.075), metal, 0, altura + 0.01, 0.32, 'joia');
    }
    const acessorio = grupo(this.nucleo, `acessorio-${p.acessorio}`);
    if (p.acessorio === 'oculos') {
      const y = this.rosto.grupo.position.y;
      const z = this.rosto.grupo.position.z + 0.065;
      for (const lado of [-1, 1])
        malha(
          acessorio,
          new THREE.TorusGeometry(0.122, 0.018, 5, 16),
          detalhe,
          lado * 0.17,
          y,
          z,
          'aro-oculos'
        );
      caixa(acessorio, 0, y + 0.01, z, 0.1, 0.023, 0.025, detalhe, 'ponte-oculos');
    } else if (p.acessorio === 'cachecol') {
      const volta = malha(
        acessorio,
        new THREE.TorusGeometry(0.39, 0.072, 6, 20),
        detalhe,
        0,
        -0.19,
        0,
        'cachecol'
      );
      volta.rotation.x = Math.PI / 2;
      volta.scale.y = 0.85;
      const ponta = caixa(
        acessorio,
        0.26,
        -0.37,
        0.43,
        0.14,
        0.33,
        0.07,
        detalhe,
        'ponta-cachecol'
      );
      ponta.rotation.z = -0.2;
    } else if (p.acessorio === 'asas') {
      for (const lado of [-1, 1]) {
        const asa = new THREE.Group();
        asa.position.set(lado * 0.29, 0.04, -0.37);
        acessorio.add(asa);
        for (let i = 0; i < 3; i++) {
          const pena = malha(
            asa,
            new THREE.CapsuleGeometry(0.1 - i * 0.016, 0.3 - i * 0.04, 3, 7),
            i === 1 ? detalhe : metal,
            lado * (0.18 + i * 0.1),
            0.12 - i * 0.12,
            -0.08,
            'pena'
          );
          pena.rotation.z = -lado * (0.8 + i * 0.15);
          pena.scale.z = 0.35;
        }
        this.asas.push(asa);
      }
    }
    if (this.identidade) {
      const identidade = grupo(this.nucleo, `identidade-${this.identidade}`);
      const adereco = new THREE.Group();
      adereco.name = 'adereco-animado';
      identidade.add(adereco);
      this.aderecoIdentidade = adereco;
      switch (this.identidade) {
        case 'claude': {
          for (const lado of [-1, 1]) {
            const laco = malha(
              identidade,
              new THREE.ConeGeometry(0.1, 0.22, 3),
              detalhe,
              lado * 0.1,
              -0.15,
              0.43,
              'laco-curioso'
            );
            laco.rotation.z = (lado * Math.PI) / 2;
            laco.scale.z = 0.35;
          }
          const livro = caixa(
            identidade,
            -0.54,
            -0.24,
            -0.05,
            0.15,
            0.36,
            0.28,
            tecido,
            'caderno-de-ideias'
          );
          livro.rotation.z = -0.15;
          caixa(identidade, -0.54, -0.24, 0.1, 0.1, 0.29, 0.025, metal, 'paginas');
          malha(
            adereco,
            new THREE.OctahedronGeometry(0.055),
            detalhe,
            0.2,
            0.66,
            0,
            'ideia-curiosa'
          );
          break;
        }
        case 'gpt': {
          for (const lado of [-1, 1]) {
            const orbita = malha(
              adereco,
              new THREE.TorusGeometry(0.23, 0.04, 6, 20),
              detalhe,
              lado * 0.48,
              0.17,
              -0.05,
              'orbita-preditiva'
            );
            orbita.rotation.y = lado * 0.5;
            caixa(
              identidade,
              lado * 0.37,
              -0.08,
              0.42,
              0.11,
              0.23,
              0.055,
              metal,
              'terminal-preditivo'
            );
          }
          break;
        }
        case 'gemini': {
          for (const lado of [-1, 1]) {
            for (let i = 0; i < 3; i++) {
              const raio = malha(
                adereco,
                new THREE.ConeGeometry(0.09, 0.42 - i * 0.06, 4),
                i === 1 ? metal : detalhe,
                lado * (0.37 + i * 0.1),
                0.35 - i * 0.11,
                -0.25,
                'raio-estelar'
              );
              raio.rotation.z = -lado * (0.55 + i * 0.25);
            }
          }
          break;
        }
        case 'llama': {
          const focinho = malha(
            identidade,
            new THREE.SphereGeometry(0.18, 12, 8),
            metal,
            0,
            -0.15,
            0.39,
            'focinho-felpudo'
          );
          focinho.scale.set(1.15, 0.55, 0.6);
          malha(
            identidade,
            new THREE.SphereGeometry(0.035, 8, 6),
            couro,
            0,
            -0.12,
            0.5,
            'nariz-llama'
          );
          malha(
            adereco,
            new THREE.SphereGeometry(0.09, 10, 8),
            detalhe,
            0,
            -0.39,
            0.47,
            'sino-do-pastor'
          );
          for (const lado of [-1, 1])
            malha(
              identidade,
              new THREE.SphereGeometry(0.16, 8, 6),
              tecido,
              lado * 0.48,
              0.03,
              -0.02,
              'la-de-ombro'
            );
          break;
        }
        case 'mistral': {
          for (let i = 0; i < 3; i++) {
            const pena = malha(
              adereco,
              new THREE.ConeGeometry(0.11, 0.46 - i * 0.06, 5),
              i === 1 ? metal : detalhe,
              -0.15 + i * 0.13,
              0.51 + i * 0.025,
              -0.13,
              'crista-de-vento'
            );
            pena.rotation.z = -0.75;
            pena.rotation.x = -0.35;
          }
          const faixa = caixa(
            identidade,
            -0.58,
            -0.08,
            -0.33,
            0.72,
            0.15,
            0.07,
            detalhe,
            'faixa-ao-vento'
          );
          faixa.rotation.z = -0.25;
          break;
        }
        case 'deepseek': {
          for (const lado of [-1, 1]) {
            const nadadeira = malha(
              adereco,
              new THREE.ConeGeometry(0.19, 0.48, 3),
              tecido,
              lado * 0.57,
              -0.05,
              -0.11,
              'nadadeira-profunda'
            );
            nadadeira.rotation.z = -lado * 1.05;
            nadadeira.scale.z = 0.35;
          }
          const dorsal = malha(
            identidade,
            new THREE.ConeGeometry(0.16, 0.27, 3),
            detalhe,
            0,
            0.48,
            -0.29,
            'barbatana-dorsal'
          );
          dorsal.scale.z = 0.6;
          break;
        }
        case 'aurora': {
          const vestido = malha(
            identidade,
            new THREE.CylinderGeometry(0.36, 0.64, 0.46, 12),
            tecido,
            0,
            -0.4,
            0,
            'vestido-musical'
          );
          vestido.scale.z = 0.83;
          const barra = malha(
            identidade,
            new THREE.TorusGeometry(0.62, 0.035, 5, 24),
            detalhe,
            0,
            -0.62,
            0,
            'barra-do-vestido'
          );
          barra.rotation.x = Math.PI / 2;
          barra.scale.y = 0.83;
          const arco = malha(
            identidade,
            new THREE.TorusGeometry(0.46, 0.045, 6, 24, Math.PI),
            detalhe,
            0,
            0.12,
            0,
            'arco-dos-fones'
          );
          arco.rotation.z = 0;
          for (const lado of [-1, 1]) {
            const fone = malha(
              identidade,
              new THREE.CylinderGeometry(0.14, 0.14, 0.13, 12),
              tecido,
              lado * 0.46,
              0.12,
              0,
              'fone-musical'
            );
            fone.rotation.z = Math.PI / 2;
            malha(
              identidade,
              new THREE.SphereGeometry(0.075, 10, 8),
              detalhe,
              lado * 0.54,
              0.12,
              0,
              'luz-do-fone'
            );
          }
          const halo = malha(
            adereco,
            new THREE.TorusGeometry(0.34, 0.026, 6, 28),
            metal,
            0,
            0.85,
            0,
            'halo-musical'
          );
          halo.rotation.x = Math.PI / 2.4;
          break;
        }
        case 'nox': {
          for (const lado of [-1, 1]) {
            const orelha = malha(
              identidade,
              new THREE.ConeGeometry(0.18, 0.4, 3),
              tecido,
              lado * 0.3,
              0.56,
              0,
              'orelha-sombria'
            );
            orelha.rotation.z = -lado * 0.15;
            orelha.scale.z = 0.5;
            const interior = malha(
              identidade,
              new THREE.ConeGeometry(0.09, 0.24, 3),
              detalhe,
              lado * 0.3,
              0.57,
              0.085,
              'interior-orelha'
            );
            interior.scale.z = 0.2;
          }
          const capa = new THREE.Group();
          capa.position.set(0, 0.2, -0.31);
          identidade.add(capa);
          const pano = malha(
            capa,
            new THREE.CylinderGeometry(0.27, 0.64, 0.88, 8, 1, true, Math.PI / 2, Math.PI),
            tecido,
            0,
            -0.32,
            0,
            'capa-do-crepusculo'
          );
          pano.scale.z = 0.65;
          this.capa = capa;
          malha(
            adereco,
            new THREE.OctahedronGeometry(0.075),
            detalhe,
            0,
            -0.14,
            0.44,
            'broche-prismatico'
          );
          break;
        }
        case 'byte': {
          caixa(identidade, 0.17, 0.58, -0.02, 0.055, 0.3, 0.055, metal, 'antena-digital');
          malha(
            adereco,
            new THREE.SphereGeometry(0.095, 8, 6),
            detalhe,
            0.17,
            0.76,
            -0.02,
            'sinal-digital'
          );
          for (const lado of [-1, 1]) {
            caixa(identidade, lado * 0.49, 0.13, 0, 0.16, 0.34, 0.44, tecido, 'painel-lateral');
            for (let i = 0; i < 3; i++)
              caixa(
                identidade,
                lado * 0.49,
                0.03 + i * 0.095,
                0.235,
                0.09,
                0.04,
                0.02,
                detalhe,
                'pixel-painel'
              );
            const luva = grupo(lado < 0 ? this.bracoE : this.bracoD, `luva-byte-${lado}`);
            caixa(luva, 0, -0.27, 0.01, 0.25, 0.23, 0.24, tecido, 'luva-digital');
            caixa(luva, 0, -0.25, 0.145, 0.12, 0.07, 0.025, detalhe, 'visor-da-luva');
          }
          break;
        }
      }
      if (this.nivelPoder >= 5) {
        const selo = malha(
          identidade,
          new THREE.OctahedronGeometry(0.085),
          metal,
          0.26,
          -0.2,
          0.45,
          'insignia-evolucao'
        );
        selo.scale.z = 0.3;
      }
    }
    if (this.nivelPoder >= 20) {
      this.aura = grupo(this.nucleo, 'aura-evolucao');
      const anel = malha(
        this.aura,
        new THREE.TorusGeometry(0.7, 0.023, 5, 36),
        detalhe,
        0,
        -0.1,
        0,
        'anel-aura'
      );
      anel.rotation.x = Math.PI / 2;
      for (let i = 0; i < 7; i++) {
        const a = (i * Math.PI * 2) / 7;
        malha(
          this.aura,
          new THREE.OctahedronGeometry(0.045),
          detalhe,
          Math.cos(a) * 0.7,
          0.05 + Math.sin(i * 2) * 0.25,
          Math.sin(a) * 0.7,
          'faisca-aura'
        );
      }
    }
  }

  /** Sombra de contato: adicionada à cena separadamente (fica no chão). */
  get sombraContato(): THREE.Mesh {
    return this.sombra;
  }

  /** Impulso de mola: positivo estica, negativo achata. */
  impulso(v: number): void {
    this.esticarV += v;
  }

  piscarBranco(): void {
    this.flash = 0.18;
  }

  posicionarSombra(x: number, chao: number, z: number, altura: number): void {
    this.sombra.position.set(x, chao + 0.03, z);
    const s = limitar(1 - altura * 0.12, 0.35, 1);
    this.sombra.scale.setScalar(s);
    (this.sombra.material as THREE.MeshBasicMaterial).opacity = 0.35 * s;
    this.sombra.visible = chao > -50;
  }

  atualizar(dt: number, e: EstadoAnimacao): void {
    if (this.descartado) return;
    this.tempo += dt;
    this.falaRestante = Math.max(0, this.falaRestante - dt);
    const falando = e.falando || this.falaRestante > 0;
    const t = this.tempo;
    const vel = e.velocidade;
    const andando = e.noChao && vel > 0.4;
    const cadencia = this.identidade ? CADENCIAS[this.identidade] : undefined;

    // giro suave com inclinação nas curvas
    const antes = this.anguloVisual;
    const alvoGiro = e.golpe >= 0 ? e.anguloGolpe : e.angulo;
    this.anguloVisual = aproximarAngulo(this.anguloVisual, alvoGiro, e.golpe >= 0 ? 30 : 14, dt);
    const taxaGiro = (this.anguloVisual - antes) / Math.max(dt, 1e-4);
    this.giro.rotation.y = this.anguloVisual;

    // mola de achatar/esticar
    if (e.noChao && !this.noChaoAntes) this.esticarV -= 2.6 + Math.min(4, Math.abs(e.vy) * 0.18);
    if (!e.noChao && this.noChaoAntes && e.vy > 0) this.esticarV += 3.2;
    this.noChaoAntes = e.noChao;
    const k = 220;
    const c = 13;
    this.esticarV += (-k * this.esticar - c * this.esticarV) * dt;
    this.esticar += this.esticarV * dt;
    const alvoAr = e.noChao ? 0 : limitar(e.vy * 0.012, -0.08, 0.14);
    const s = limitar(this.esticar + alvoAr, -0.35, 0.35);
    let respira = Math.sin(t * (cadencia?.pulso ?? 2.2)) * 0.018;
    if (e.humor === 'sonolento') respira = Math.sin(t * 1.3) * 0.04;
    this.mola.scale.set(1 - s * 0.5 - respira * 0.5, 1 + s + respira, 1 - s * 0.5 - respira * 0.5);

    // ciclo de passos
    const ritmo = andando ? (7 + vel * 1.6) * (cadencia?.passo ?? 1) : 0;
    this.fase += ritmo * dt;
    const passo = Math.sin(this.fase);
    const quique = andando
      ? Math.abs(Math.sin(this.fase)) * 0.07 * Math.min(1, vel / 4) * (cadencia?.salto ?? 1)
      : 0;
    let corpoY = quique;
    let inclinaAlvo = limitar(vel * 0.035, 0, 0.26);
    let rolar = 0;
    let girarY = 0;
    if (cadencia && e.noChao) {
      corpoY += Math.sin(t * cadencia.pulso) * (andando ? 0.008 : 0.025 * cadencia.salto);
      rolar += Math.sin(t * cadencia.pulso * 0.65) * cadencia.balanco;
      if (this.identidade === 'nox') inclinaAlvo += 0.08;
      if (this.identidade === 'deepseek') girarY += Math.sin(t * 1.5) * 0.12;
      if (this.identidade === 'byte') rolar += Math.sin(t * 10) * 0.012;
    }

    // linguagem corporal de cada emoção
    switch (e.humor) {
      case 'triste':
        inclinaAlvo += 0.12;
        corpoY -= 0.08;
        break;
      case 'medo':
        rolar = Math.sin(t * 50) * 0.075;
        inclinaAlvo -= 0.1;
        break;
      case 'raiva':
        rolar = Math.sin(t * 38) * 0.065;
        inclinaAlvo += 0.08;
        break;
      case 'feliz':
        if (!andando && e.noChao) corpoY += Math.abs(Math.sin(t * 7)) * 0.17;
        rolar = Math.sin(t * 7) * 0.06;
        break;
      case 'curioso':
        rolar = 0.31 + Math.sin(t * 1.5) * 0.04;
        break;
      case 'envergonhado':
        inclinaAlvo += 0.15;
        girarY = Math.sin(t * 3) * 0.25;
        break;
      case 'sonolento':
        rolar = Math.sin(t * 0.9) * 0.12;
        inclinaAlvo += 0.14 + Math.sin(t * 0.9) * 0.06;
        break;
      case 'determinado':
        inclinaAlvo += 0.06;
        break;
      case 'carinho':
        rolar = Math.sin(t * 2.5) * 0.1;
        break;
      case 'dor':
        inclinaAlvo -= 0.25;
        break;
    }
    if (e.ferido > 0) inclinaAlvo -= 0.4 * e.ferido;
    this.inclinacao = aproximar(this.inclinacao, inclinaAlvo, 10, dt);
    this.girar = aproximar(this.girar, limitar(-taxaGiro * 0.05, -0.35, 0.35), 10, dt);

    // esquiva: cambalhota para frente
    let cambalhota = 0;
    if (e.esquiva >= 0) cambalhota = e.esquiva * Math.PI * 2;
    this.corpo.position.y = corpoY;
    this.corpo.rotation.set(this.inclinacao, girarY, this.girar + rolar);
    this.nucleo.rotation.x = cambalhota;
    if (e.esquiva >= 0) this.corpo.position.y += Math.sin(e.esquiva * Math.PI) * 0.35;

    // pés
    if (andando) {
      this.peE.rotation.x = passo * (cadencia?.amplitude ?? 0.9);
      this.peD.rotation.x = -passo * (cadencia?.amplitude ?? 0.9);
      this.peE.position.y = 0.2 + Math.max(0, Math.sin(this.fase)) * 0.09;
      this.peD.position.y = 0.2 + Math.max(0, -Math.sin(this.fase)) * 0.09;
    } else if (!e.noChao) {
      this.peE.rotation.x = aproximar(this.peE.rotation.x, -0.6, 12, dt);
      this.peD.rotation.x = aproximar(this.peD.rotation.x, 0.4, 12, dt);
      this.peE.position.y = aproximar(this.peE.position.y, 0.3, 12, dt);
      this.peD.position.y = aproximar(this.peD.position.y, 0.26, 12, dt);
    } else {
      this.peE.rotation.x = aproximar(this.peE.rotation.x, 0, 14, dt);
      this.peD.rotation.x = aproximar(this.peD.rotation.x, 0, 14, dt);
      this.peE.position.y = aproximar(this.peE.position.y, 0.2, 14, dt);
      this.peD.position.y = aproximar(this.peD.position.y, 0.2, 14, dt);
    }

    // braços: balanço, no ar para cima, golpe guiando a magia
    let alvoEX = andando ? -passo * (cadencia?.amplitude ?? 0.9) : 0;
    let alvoDX = andando ? passo * (cadencia?.amplitude ?? 0.9) : 0;
    let alvoEZ = -0.15;
    let alvoDZ = 0.15;
    if (cadencia && !andando && e.noChao) {
      const gesto = Math.sin(t * cadencia.pulso) * cadencia.balanco;
      alvoEX = gesto;
      alvoDX = -gesto * 1.4;
      alvoEZ -= cadencia.balanco;
      alvoDZ += cadencia.balanco;
      if (this.identidade === 'aurora') {
        alvoEZ -= 0.27;
        alvoDZ += 0.27;
      }
      if (this.identidade === 'nox') {
        alvoEX -= 0.2;
        alvoDX -= 0.2;
      }
    }
    if (!e.noChao) {
      alvoEZ = -1.5;
      alvoDZ = 1.5;
      alvoEX = -0.3;
      alvoDX = -0.3;
    }
    if (e.humor === 'feliz' && !andando && e.noChao) {
      alvoEZ = -2.4 + Math.sin(t * 7) * 0.4;
      alvoDZ = 2.4 - Math.sin(t * 7) * 0.4;
    }
    if (e.humor === 'medo' || e.humor === 'envergonhado') {
      alvoEX = -1.2;
      alvoDX = -1.2;
      alvoEZ = 0.5;
      alvoDZ = -0.5;
    }
    if (e.humor === 'raiva' && !andando) {
      alvoEZ = -0.6 + Math.sin(t * 30) * 0.1;
      alvoDZ = 0.6 - Math.sin(t * 30) * 0.1;
    }
    if (falando) {
      alvoDX = -0.95 + Math.sin(t * 9) * 0.45;
      alvoDZ = 0.65 + Math.sin(t * 5) * 0.2;
      alvoEX -= 0.25 + Math.sin(t * 6) * 0.15;
    }
    if (e.humor === 'surpreso') {
      alvoEZ = -1.7;
      alvoDZ = 1.7;
    }
    if (e.humor === 'triste') {
      alvoEZ = 0.18;
      alvoDZ = -0.18;
    }
    if (e.humor === 'carinho') {
      alvoEX = -0.9;
      alvoDX = -0.9;
      alvoEZ = 0.5;
      alvoDZ = -0.5;
    }
    if (e.golpe >= 0) {
      // braço direito aponta e "rege" a arma
      alvoDX = -1.6 + Math.sin(e.golpe * Math.PI) * 0.3;
      alvoDZ = 0.3 - e.golpe * 0.6;
      const arco = Math.sin(e.golpe * Math.PI);
      switch (this.identidade) {
        case 'claude': // Um gesto curioso de estalo, com o outro braço equilibrando.
          alvoEX = -0.45 - arco * 0.3;
          alvoDZ = 0.65 - arco * 1.05;
          break;
        case 'gpt': // Disparo preciso a partir de dois terminais.
          alvoDX = -1.8;
          alvoEX = -1.4;
          alvoEZ = -0.15;
          alvoDZ = 0.15;
          break;
        case 'gemini': // Abre as duas mãos em leque estelar.
          alvoEX = -1.3 - arco * 0.4;
          alvoDX = alvoEX;
          alvoEZ = -1.1 - arco * 0.5;
          alvoDZ = -alvoEZ;
          break;
        case 'llama': // Antecipa a cuspida com a cabeça e um pequeno recuo.
          alvoEX = -0.6;
          alvoDX = -0.6;
          alvoEZ = -0.45;
          alvoDZ = 0.45;
          this.nucleo.rotation.x += -0.24 + arco * 0.5;
          break;
        case 'mistral': // Corte largo e torção de cintura.
          alvoDX = -1.15 - arco * 0.8;
          alvoDZ = 1.1 - e.golpe * 2.3;
          alvoEX = 0.5;
          this.corpo.rotation.y += arco * 0.65;
          break;
        case 'deepseek': // Empurra a maré com os dois braços.
          alvoDX = -0.65 - arco * 1.25;
          alvoEX = alvoDX;
          alvoEZ = -0.7 + arco * 0.35;
          alvoDZ = -alvoEZ;
          break;
        case 'aurora': // Rege um compasso com mãos alternadas.
          alvoEX = -1.4 + Math.cos(e.golpe * Math.PI * 2) * 0.5;
          alvoDX = -1.4 - Math.cos(e.golpe * Math.PI * 2) * 0.5;
          alvoEZ = -0.85;
          alvoDZ = 0.85;
          break;
        case 'nox': // Lança o reflexo a partir de uma postura baixa e lateral.
          alvoEX = -1.1;
          alvoEZ = 0.45;
          alvoDX = -1.75 + arco * 0.35;
          alvoDZ = -0.8 + e.golpe * 0.6;
          this.corpo.position.y -= arco * 0.09;
          break;
        case 'byte': // Soco de luva com contrapeso mecânico.
          alvoDX = -0.5 - arco * 1.8;
          alvoDZ = 0.1;
          alvoEX = -1.2 + arco * 0.5;
          alvoEZ = -0.65;
          this.corpo.rotation.z += arco * 0.12;
          break;
      }
    }
    if (e.defendendo) {
      alvoDX = -1.5;
      alvoEX = -1.5;
      alvoEZ = 0.4;
      alvoDZ = -0.4;
    }
    if (e.conjurando > 0) {
      alvoEZ = -2.6;
      alvoDZ = 2.6;
    }
    const kb = e.golpe >= 0 ? 30 : 12;
    this.bracoE.rotation.x = aproximar(this.bracoE.rotation.x, alvoEX, kb, dt);
    this.bracoD.rotation.x = aproximar(this.bracoD.rotation.x, alvoDX, kb, dt);
    this.bracoE.rotation.z = aproximar(this.bracoE.rotation.z, alvoEZ, kb, dt);
    this.bracoD.rotation.z = aproximar(this.bracoD.rotation.z, alvoDZ, kb, dt);

    // olhar: acompanha a direção e às vezes passeia
    const olharX = Math.sin(t * 0.7) * 0.3 + limitar(taxaGiro * -0.1, -0.6, 0.6);
    this.rosto.olhar.set(
      aproximar(this.rosto.olhar.x, olharX, 6, dt),
      aproximar(this.rosto.olhar.y, e.humor === 'sonolento' ? -0.4 : 0, 6, dt)
    );
    const humor = e.ferido > 0.4 ? 'dor' : e.humor;
    if (this.rosto.humor !== humor) this.rosto.definirHumor(humor);
    this.rosto.falando = falando;
    this.rosto.atualizar(dt);
    if (this.capa) this.capa.rotation.x = -0.12 + Math.sin(t * 5) * 0.08 - vel * 0.035;
    for (let i = 0; i < this.asas.length; i++) {
      this.asas[i].rotation.y = (i === 0 ? -1 : 1) * (0.25 + Math.sin(t * 6) * 0.22);
    }
    if (this.aura) {
      this.aura.rotation.y = t * 0.65;
      this.aura.scale.setScalar(1 + Math.sin(t * 3) * 0.055);
    }
    if (this.aderecoIdentidade && cadencia) {
      this.aderecoIdentidade.rotation.y =
        Math.sin(t * cadencia.pulso * 0.6) * cadencia.balanco * 1.8;
      this.aderecoIdentidade.position.y = Math.sin(t * cadencia.pulso) * 0.018;
    }

    // centelha: cor e tamanho conforme a emoção
    const corC = COR_CENTELHA[e.humor] ?? this.corBaseCentelha;
    this.corAlvoCentelha.set(corC);
    this.matCentelha.color.lerp(this.corAlvoCentelha, 1 - Math.exp(-6 * dt));
    (this.brilhoCentelha.material as THREE.SpriteMaterial).color.copy(this.matCentelha.color);
    const pulso =
      e.humor === 'determinado'
        ? 1.5 + Math.sin(t * 12) * 0.2
        : e.humor === 'triste'
          ? 0.75
          : e.humor === 'sonolento'
            ? 0.6
            : 1 + Math.sin(t * 3) * 0.08;
    this.centelha.scale.setScalar(pulso * (1 + Math.min(this.nivelPoder, 30) * 0.018));
    this.centelha.rotation.y = t * 2.4;
    this.centelha.position.y = 0.7 + Math.sin(t * 2.6) * 0.05 + (e.humor === 'triste' ? -0.08 : 0);
    this.brilhoCentelha.position.copy(this.centelha.position);
    this.brilhoCentelha.scale.setScalar(0.65 * pulso + (e.conjurando > 0 ? 0.8 : 0));

    // transparência dentro do mato e brilho de dano
    this.flash = Math.max(0, this.flash - dt);
    const alfa = e.escondido ? 0.45 : 1;
    for (const m of this.materiais) {
      m.opacity = aproximar(m.opacity, alfa, 10, dt);
      m.emissive.setRGB(this.flash > 0 ? 1 : 0, this.flash > 0 ? 1 : 0, this.flash > 0 ? 1 : 0);
      m.depthWrite = m.opacity > 0.95;
    }
    this.emote.atualizar(dt);
  }
}

const COR_CENTELHA: Partial<Record<Humor, string>> = {
  feliz: '#ffe27a',
  triste: '#8fb6ff',
  raiva: '#ff6b5a',
  surpreso: '#ffffff',
  medo: '#c9b8ff',
  curioso: '#7af0d0',
  determinado: '#ff9b3d',
  envergonhado: '#ff9fb8',
  sonolento: '#9aa0c8',
  carinho: '#ff8fb0',
  dor: '#ff6b5a',
};
