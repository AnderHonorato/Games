import * as T from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { DefHeroiMoba } from './tipos';

type Forma = 'bola' | 'caixa' | 'cone' | 'cilindro' | 'anel' | 'cristal' | 'asa';
type No =
  | 'corpo'
  | 'cabeca'
  | 'bracoE'
  | 'bracoD'
  | 'pernaE'
  | 'pernaD'
  | 'cauda'
  | 'asaE'
  | 'asaD'
  | 'acessorio';
type Vetor = [number, number, number];
interface Rig {
  raiz: T.Group;
  nos: Record<No, T.Group>;
  bases: Record<No, Vetor>;
  fase: number;
  voa: boolean;
  descartado: boolean;
}
const rigs = new WeakMap<T.Group, Rig>();
const creme = '#fff1d2',
  escuro = '#293343',
  rosa = '#f88eac',
  ouro = '#ffc968',
  madeira = '#8e6550';

/** Geometrias fonte pertencem somente à construção; não há cache global entre partidas. */
class Oficina {
  readonly grupo = new T.Group();
  readonly raiz = new T.Group();
  readonly nos = {} as Record<No, T.Group>;
  readonly bases = {} as Record<No, Vetor>;
  private partes = new Map<No, T.BufferGeometry[]>();
  private cache = new Map<Forma, T.BufferGeometry>();
  private matriz = new T.Matrix4();
  private rotacao = new T.Quaternion();
  constructor(readonly def: DefHeroiMoba) {
    this.grupo.name = `heroi-${def.id}`;
    this.grupo.userData.forma = def.forma;
    this.grupo.add(this.raiz);
    const posicoes: Record<No, Vetor> = {
      corpo: [0, 0, 0],
      cabeca: [0, 2.55, 0.12],
      bracoE: [-0.83, 1.9, 0],
      bracoD: [0.83, 1.9, 0],
      pernaE: [-0.4, 0.65, 0],
      pernaD: [0.4, 0.65, 0],
      cauda: [0, 1.15, -0.45],
      asaE: [-0.65, 1.95, -0.2],
      asaD: [0.65, 1.95, -0.2],
      acessorio: [0, 0, 0],
    };
    for (const nome of Object.keys(posicoes) as No[]) {
      const no = new T.Group();
      no.name = nome;
      no.position.fromArray(posicoes[nome]);
      this.nos[nome] = no;
      this.bases[nome] = [...posicoes[nome]];
      this.raiz.add(no);
      this.partes.set(nome, []);
    }
  }
  private geometria(forma: Forma): T.BufferGeometry {
    let g = this.cache.get(forma);
    if (g) return g;
    switch (forma) {
      case 'bola':
        g = new T.SphereGeometry(1, 12, 8);
        break;
      case 'caixa':
        g = new T.BoxGeometry(1, 1, 1);
        break;
      case 'cone':
        g = new T.ConeGeometry(1, 1, 8);
        break;
      case 'cilindro':
        g = new T.CylinderGeometry(1, 1, 1, 12);
        break;
      case 'anel':
        g = new T.TorusGeometry(1, 0.16, 5, 18);
        break;
      case 'cristal':
        g = new T.OctahedronGeometry(1);
        break;
      case 'asa': {
        const asa = new T.Shape();
        asa.moveTo(0, 0);
        asa.lineTo(1.65, 0.65);
        asa.lineTo(1.4, -0.32);
        asa.quadraticCurveTo(1.1, -0.08, 0.9, -0.7);
        asa.quadraticCurveTo(0.55, -0.3, 0.3, -0.9);
        asa.lineTo(0, 0);
        g = new T.ExtrudeGeometry(asa, { depth: 0.12, bevelEnabled: false, curveSegments: 3 });
        break;
      }
    }
    if (g.index) {
      const expandida = g.toNonIndexed();
      g.dispose();
      g = expandida;
    }
    g.deleteAttribute('uv');
    this.cache.set(forma, g);
    return g;
  }
  p(no: No, forma: Forma, cor: string, pos: Vetor, escala: Vetor, rot: Vetor = [0, 0, 0]) {
    const g = this.geometria(forma).clone();
    this.rotacao.setFromEuler(new T.Euler(...rot));
    this.matriz.compose(new T.Vector3(...pos), this.rotacao, new T.Vector3(...escala));
    g.applyMatrix4(this.matriz);
    // Espelhar uma asa também inverte o winding; mantenha as faces fechadas voltadas para fora.
    if (escala[0] * escala[1] * escala[2] < 0) {
      for (const nome of ['position', 'normal']) {
        const atributo = g.getAttribute(nome);
        for (let i = 0; i < atributo.count; i += 3) {
          const x = atributo.getX(i + 1),
            y = atributo.getY(i + 1),
            z = atributo.getZ(i + 1);
          atributo.setXYZ(i + 1, atributo.getX(i + 2), atributo.getY(i + 2), atributo.getZ(i + 2));
          atributo.setXYZ(i + 2, x, y, z);
        }
      }
    }
    const c = new T.Color(cor),
      cores = new Float32Array(g.getAttribute('position').count * 3);
    for (let i = 0; i < cores.length; i += 3) {
      cores[i] = c.r;
      cores[i + 1] = c.g;
      cores[i + 2] = c.b;
    }
    g.setAttribute('color', new T.BufferAttribute(cores, 3));
    this.partes.get(no)!.push(g);
  }
  bola(no: No, cor: string, x: number, y: number, z: number, sx: number, sy = sx, sz = sx) {
    this.p(no, 'bola', cor, [x, y, z], [sx, sy, sz]);
  }
  orelhas(
    forma: 'pontuda' | 'redonda' | 'longa',
    cor = this.def.cor,
    altura = 0.55,
    abertura = 0.63
  ) {
    for (const s of [-1, 1]) {
      const x = s * abertura;
      if (forma === 'pontuda') {
        this.p(
          'cabeca',
          'cone',
          cor,
          [x, 0.82, -0.04],
          [0.35, altura * 1.6, 0.3],
          [0, 0, -s * 0.22]
        );
        this.p('cabeca', 'cone', rosa, [x, 0.83, 0.17], [0.19, altura, 0.07], [0, 0, -s * 0.22]);
      } else {
        this.bola(
          'cabeca',
          cor,
          x,
          forma === 'longa' ? 0.95 : 0.68,
          0,
          forma === 'longa' ? 0.23 : 0.35,
          altura,
          0.23
        );
        this.bola(
          'cabeca',
          rosa,
          x,
          forma === 'longa' ? 0.99 : 0.7,
          0.18,
          forma === 'longa' ? 0.12 : 0.2,
          altura * 0.68,
          0.07
        );
      }
    }
  }
  cachecol(cor = this.def.cor2) {
    this.p('corpo', 'anel', cor, [0, 2.05, 0.03], [0.67, 0.52, 0.5], [Math.PI / 2, 0, 0]);
    this.p('corpo', 'caixa', cor, [-0.5, 1.5, -0.53], [0.35, 0.95, 0.12], [0, 0, -0.18]);
  }
  capa(cor = this.def.cor2) {
    this.bola('corpo', cor, 0, 1.43, -0.58, 0.87, 0.95, 0.22);
  }
  mochila(cor = this.def.cor2) {
    this.p('corpo', 'caixa', cor, [0, 1.4, -0.78], [0.95, 0.95, 0.5]);
    this.p('corpo', 'caixa', ouro, [0, 1.7, -1.05], [0.65, 0.15, 0.12]);
    for (const s of [-1, 1])
      this.p('corpo', 'caixa', madeira, [s * 0.58, 1.65, 0], [0.14, 1.05, 0.12]);
  }
  bastao(cor: string, topo: Forma = 'cristal', altura = 1.4) {
    this.p(
      'bracoD',
      'cilindro',
      madeira,
      [0.28, -0.35, 0.3],
      [0.08, altura * 1.5, 0.08],
      [0, 0, -0.12]
    );
    this.p('bracoD', topo, cor, [0.36, altura * 0.5, 0.3], [0.31, 0.4, 0.25]);
  }
  espada(cor: string, florete = false) {
    this.p('bracoD', 'caixa', madeira, [0.15, -0.43, 0.45], [0.13, 0.45, 0.15]);
    this.p('bracoD', 'cilindro', ouro, [0.15, -0.18, 0.45], [0.32, 0.1, 0.3]);
    this.p(
      'bracoD',
      florete ? 'cone' : 'cristal',
      cor,
      [0.15, 0.6, 0.45],
      [florete ? 0.055 : 0.17, 1.2, 0.07]
    );
  }
  chapeu(cor: string, alto = 0.55) {
    this.p('cabeca', 'cilindro', cor, [0, 0.75, 0], [1.05, 0.12, 0.76]);
    this.p('cabeca', 'cone', cor, [-0.08, 1 + alto * 0.3, -0.05], [0.65, alto, 0.6], [0, 0, -0.18]);
  }
  asas(tipo: 'morcego' | 'borboleta' | 'ave' | 'abelha', cor = this.def.cor2) {
    for (const [no, s] of [
      ['asaE', -1],
      ['asaD', 1],
    ] as const) {
      if (tipo === 'morcego') this.p(no, 'asa', cor, [0, 0, 0], [s, 1, 1]);
      else if (tipo === 'borboleta') {
        this.bola(no, cor, s * 0.8, 0.35, -0.12, 0.95, 1.1, 0.12);
        this.bola(no, this.def.cor, s * 0.7, -0.65, -0.08, 0.7, 0.7, 0.13);
        this.bola(no, creme, s * 0.92, 0.42, 0.02, 0.41, 0.58, 0.05);
        this.bola(no, ouro, s * 0.7, -0.64, 0.06, 0.25, 0.33, 0.05);
      } else if (tipo === 'abelha') {
        this.bola(no, '#dcf8ff', s * 0.62, 0.45, -0.22, 0.6, 0.9, 0.08);
        this.bola(no, creme, s * 0.6, -0.32, -0.2, 0.55, 0.6, 0.07);
      } else {
        this.bola(no, cor, s * 0.48, -0.15, 0, 0.5, 0.75, 0.24);
        for (let i = 0; i < 3; i++)
          this.bola(
            no,
            this.def.cor,
            s * (0.55 + i * 0.16),
            -0.45 - i * 0.12,
            0.05,
            0.2,
            0.48,
            0.15
          );
      }
    }
  }
  terminar(): T.Group {
    const material = new T.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.57,
      metalness: 0.03,
    });
    let desenhos = 0;
    for (const [nome, partes] of this.partes) {
      if (!partes.length) continue;
      const g = mergeGeometries(partes, false)!;
      for (const parte of partes) parte.dispose();
      g.computeBoundingBox();
      g.computeBoundingSphere();
      const mesh = new T.Mesh(g, material);
      mesh.name = `${this.def.forma}-${nome}`;
      this.nos[nome].add(mesh);
      desenhos++;
    }
    for (const g of this.cache.values()) g.dispose();
    this.grupo.userData.desenhos = desenhos;
    rigs.set(this.grupo, {
      raiz: this.raiz,
      nos: this.nos,
      bases: this.bases,
      fase: this.def.nome.length * 0.43,
      voa: ['morcego', 'borboleta', 'abelha'].includes(this.def.forma),
      descartado: false,
    });
    return this.grupo;
  }
}

/** Frente +Z; altura nativa de aproximadamente 3–5 metros, sem texturas externas. */
export function criarModeloHeroiMoba(def: DefHeroiMoba): T.Group {
  const o = new Oficina(def),
    c = def.cor,
    a = def.cor2,
    forma = def.forma;
  const arredondado = ['panda', 'capivara', 'tartaruga', 'pinguim', 'carneiro'].includes(forma);
  const largura = arredondado ? 0.86 : 0.66;
  o.bola('corpo', c, 0, 1.4, 0, largura, 0.91, 0.6);
  o.bola('corpo', creme, 0, 1.4, 0.49, largura * 0.72, 0.65, 0.16);
  o.bola('cabeca', c, 0, 0, 0, 0.87, 0.77, 0.7);
  for (const [no, s] of [
    ['bracoE', -1],
    ['bracoD', 1],
  ] as const) {
    o.p(no, 'bola', c, [s * 0.08, -0.36, 0.08], [0.24, 0.55, 0.27], [0, 0, s * 0.18]);
    o.bola(no, creme, s * 0.12, -0.73, 0.12, 0.25, 0.21, 0.27);
  }
  if (forma !== 'polvo')
    for (const no of ['pernaE', 'pernaD'] as const) {
      o.bola(no, c, 0, -0.2, 0.03, 0.27, 0.48, 0.28);
      o.bola(no, a, 0, -0.48, 0.18, 0.33, 0.19, 0.44);
    }
  // Máscara, focinho e olhos têm relevo real, incluindo brilho e pequenas bochechas.
  if (['panda', 'guaxinim'].includes(forma))
    for (const s of [-1, 1]) o.bola('cabeca', escuro, s * 0.33, 0.08, 0.59, 0.3, 0.32, 0.16);
  if (['raposa', 'lobo', 'lontra', 'capivara', 'cervo', 'tubarao'].includes(forma)) {
    o.bola('cabeca', creme, 0, -0.23, 0.59, forma === 'capivara' ? 0.68 : 0.46, 0.29, 0.37);
    o.bola('cabeca', escuro, 0, -0.14, 0.91, 0.12, 0.08, 0.07);
  }
  for (const s of [-1, 1]) {
    o.bola('cabeca', escuro, s * 0.32, 0.12, 0.663, 0.135, 0.18, 0.09);
    o.bola('cabeca', '#ffffff', s * 0.32 - 0.035, 0.18, 0.742, 0.047, 0.06, 0.025);
    o.bola('cabeca', '#aeefff', s * 0.32 + 0.04, 0.07, 0.746, 0.023, 0.025, 0.015);
    o.bola('cabeca', rosa, s * 0.57, -0.17, 0.594, 0.14, 0.075, 0.05);
  }
  o.bola('cabeca', escuro, 0, -0.32, 0.686, 0.1, 0.035, 0.025);

  switch (forma) {
    case 'raposa':
      o.orelhas('pontuda', c, 0.7);
      o.capa();
      o.cachecol();
      o.mochila('#b6794f');
      o.p('cauda', 'bola', c, [0, 0.28, -0.67], [0.52, 0.47, 0.95], [-0.45, 0, 0]);
      o.bola('cauda', creme, 0, 0.69, -1.27, 0.36, 0.35, 0.4);
      o.p('bracoD', 'cilindro', ouro, [0.22, -0.9, 0.3], [0.29, 0.58, 0.29]);
      o.bola('bracoD', '#fff3a2', 0.22, -0.9, 0.3, 0.21, 0.25, 0.21);
      o.p('bracoD', 'anel', ouro, [0.22, -0.47, 0.3], [0.22, 0.28, 0.12]);
      break;
    case 'gato':
      o.orelhas('pontuda', c, 0.5);
      o.cachecol();
      o.capa('#725594');
      o.p('cauda', 'anel', c, [-0.42, 0.05, -0.5], [0.55, 0.7, 0.48], [0, 0.5, -0.5]);
      for (const no of ['bracoE', 'bracoD'] as const)
        for (let i = 0; i < 3; i++)
          o.p(
            no,
            'cone',
            '#e9ecff',
            [(i - 1) * 0.13, -0.78, 0.38],
            [0.045, 0.35, 0.05],
            [Math.PI / 2, 0, 0]
          );
      o.bola('corpo', a, 0.55, 1.1, 0.65, 0.25);
      break;
    case 'dragao':
      o.asas('morcego', a);
      o.orelhas('pontuda', c, 0.35);
      o.p('cauda', 'cone', c, [0, 0.13, -0.9], [0.35, 1.8, 0.35], [-Math.PI / 2, 0, 0]);
      for (let i = 0; i < 4; i++)
        o.p('corpo', 'cone', a, [0, 1 + i * 0.35, -0.63], [0.2, 0.4, 0.2], [-0.8, 0, 0]);
      for (const s of [-1, 1])
        o.p('cabeca', 'anel', madeira, [s * 0.35, 0.48, 0.59], [0.29, 0.25, 0.13]);
      o.cachecol('#c06d52');
      break;
    case 'coruja':
      o.asas('ave');
      for (const s of [-1, 1]) {
        o.bola('cabeca', creme, s * 0.37, 0.08, 0.54, 0.37, 0.41, 0.11);
        o.p('cabeca', 'anel', ouro, [s * 0.32, 0.12, 0.74], [0.23, 0.28, 0.1]);
        // Reaplica a pupila na frente do disco facial claro.
        o.bola('cabeca', escuro, s * 0.32, 0.12, 0.76, 0.12, 0.16, 0.06);
        o.bola('cabeca', '#ffffff', s * 0.32 - 0.03, 0.18, 0.81, 0.04);
        o.p('cabeca', 'cone', c, [s * 0.65, 0.66, -0.1], [0.26, 0.55, 0.3], [0, 0, -s * 0.5]);
      }
      o.p('cabeca', 'cone', ouro, [0, -0.15, 0.78], [0.16, 0.3, 0.2], [-Math.PI / 2, 0, Math.PI]);
      o.capa('#404d99');
      o.bastao(ouro);
      o.p('bracoE', 'caixa', '#f7e4ba', [0, -0.6, 0.3], [0.6, 0.16, 0.75], [0.2, 0, -0.2]);
      break;
    case 'axolote':
      for (const s of [-1, 1])
        for (let i = 0; i < 3; i++) {
          const y = 0.55 - i * 0.43;
          o.p(
            'cabeca',
            'bola',
            a,
            [s * 1.01, y, 0],
            [0.44, 0.12, 0.12],
            [0, 0, s * (0.5 - i * 0.5)]
          );
          o.bola('cabeca', '#f475a0', s * 1.27, y * 1.3, 0, 0.17, 0.2, 0.12);
        }
      o.bola('cauda', a, 0, 0.18, -0.8, 0.25, 0.62, 1);
      o.mochila('#8dcfcf');
      o.bastao('#c6fbff', 'bola');
      o.p('bracoE', 'bola', '#ffe7b0', [-0.08, -0.6, 0.3], [0.4, 0.33, 0.15]);
      break;
    case 'tartaruga':
      o.bola('corpo', '#467b50', 0, 1.52, -0.51, 1.04, 1.07, 0.62);
      for (const s of [-1, 1]) o.bola('corpo', a, s * 0.5, 1.75, -0.97, 0.35, 0.47, 0.12);
      o.p('corpo', 'cilindro', madeira, [0, 2.35, -0.65], [0.12, 1, 0.12]);
      o.bola('corpo', '#8dc97c', 0, 2.95, -0.65, 0.63, 0.55, 0.52);
      o.bola('corpo', '#aadd8b', 0.4, 2.8, -0.65, 0.38);
      o.chapeu('#e6c78a', 0.12);
      o.bastao('#8bd087', 'bola');
      break;
    case 'panda':
      o.orelhas('redonda', escuro, 0.32);
      o.cachecol();
      for (const no of ['bracoE', 'bracoD'] as const)
        o.bola(no, escuro, 0, -0.3, 0.06, 0.27, 0.48, 0.29);
      o.p('corpo', 'cilindro', '#b87951', [0, 1.12, 0.75], [0.7, 0.68, 0.65], [Math.PI / 2, 0, 0]);
      o.p('corpo', 'cilindro', creme, [0, 1.12, 1.1], [0.67, 0.06, 0.67], [Math.PI / 2, 0, 0]);
      for (const no of ['bracoE', 'bracoD'] as const)
        o.p(no, 'cilindro', madeira, [0, -0.65, 0.54], [0.07, 0.88, 0.07], [0.7, 0, 0]);
      break;
    case 'morcego':
      o.orelhas('pontuda', c, 0.9);
      o.asas('morcego');
      o.cachecol();
      for (const s of [-1, 1])
        o.p('cabeca', 'cone', creme, [s * 0.17, -0.37, 0.68], [0.075, 0.19, 0.05], [Math.PI, 0, 0]);
      o.p('bracoD', 'cone', ouro, [0.1, -0.85, 0.25], [0.25, 0.4, 0.25]);
      o.mochila('#986f9c');
      break;
    case 'coelho':
      o.orelhas('longa', c, 1.05, 0.46);
      o.mochila();
      o.bola('cauda', creme, 0, -0.1, -0.3, 0.4);
      for (const s of [-1, 1])
        o.p(
          'bracoD',
          'cilindro',
          madeira,
          [s * 0.22, -0.25, 0.4],
          [0.075, 0.75, 0.075],
          [0, 0, -s * 0.45]
        );
      o.p('bracoD', 'caixa', '#b9ad89', [0, 0.05, 0.4], [0.65, 0.09, 0.08]);
      for (const s of [-1, 1]) {
        o.p(
          'corpo',
          'cone',
          '#f79d4e',
          [s * 0.28, 1.8, -0.97],
          [0.14, 0.55, 0.14],
          [Math.PI, 0, 0]
        );
        o.bola('corpo', '#81ad60', s * 0.28, 2.12, -0.97, 0.15, 0.24, 0.13);
      }
      break;
    case 'sapo':
      for (const s of [-1, 1]) o.bola('cabeca', c, s * 0.61, 0.46, 0.02, 0.38, 0.39, 0.35);
      o.chapeu('#77599f', 1.25);
      o.p('cabeca', 'anel', ouro, [0, 0.93, 0], [0.49, 0.1, 0.49], [Math.PI / 2, 0, 0]);
      o.bola('bracoE', '#514e6b', -0.12, -0.7, 0.47, 0.49, 0.38, 0.43);
      o.p('bracoE', 'anel', a, [-0.12, -0.48, 0.47], [0.42, 0.42, 0.18], [Math.PI / 2, 0, 0]);
      o.p('bracoD', 'cilindro', '#b5f2d2', [0.12, -0.5, 0.3], [0.2, 0.6, 0.2]);
      o.bola('bracoD', a, 0.12, -0.69, 0.3, 0.24);
      break;
    case 'ourico':
      for (let i = 0; i < 11; i++) {
        const t = (i * Math.PI * 2) / 11;
        o.p(
          'corpo',
          'cone',
          '#795943',
          [Math.cos(t) * 0.82, 1.5 + Math.sin(t) * 0.83, -0.4],
          [0.25, 0.75, 0.25],
          [0, 0, t - Math.PI / 2]
        );
      }
      o.p('cabeca', 'bola', '#b9c9cc', [0, 0.59, -0.1], [0.92, 0.38, 0.71]);
      o.p('cabeca', 'cilindro', madeira, [1, 0.63, -0.1], [0.08, 0.55, 0.08], [0, 0, Math.PI / 2]);
      o.bola('bracoE', a, -0.13, -0.4, 0.48, 0.49, 0.68, 0.13);
      o.bola('bracoE', creme, -0.13, -0.4, 0.59, 0.22, 0.35, 0.04);
      o.espada('#d9eaff');
      break;
    case 'cervo':
      o.orelhas('longa', c, 0.3, 0.81);
      for (const s of [-1, 1]) {
        o.p(
          'cabeca',
          'cilindro',
          madeira,
          [s * 0.5, 1, -0.2],
          [0.085, 1, 0.085],
          [0, 0, -s * 0.35]
        );
        for (let i = 0; i < 2; i++) {
          o.p(
            'cabeca',
            'cilindro',
            madeira,
            [s * (0.65 + i * 0.11), 1 + i * 0.28, -0.2],
            [0.065, 0.5, 0.065],
            [0, 0, s * 0.9]
          );
          o.bola('cabeca', a, s * (0.84 + i * 0.12), 1.15 + i * 0.28, -0.2, 0.17);
        }
      }
      o.capa('#83bb7c');
      o.bastao('#edb1cf', 'bola', 1.8);
      o.bola('cauda', creme, 0, 0, -0.3, 0.27);
      break;
    case 'pinguim':
      o.bola('cabeca', creme, 0, -0.05, 0.57, 0.63, 0.58, 0.13);
      for (const s of [-1, 1]) {
        o.bola('cabeca', escuro, s * 0.3, 0.13, 0.72, 0.12, 0.16, 0.06);
        o.bola('cabeca', '#ffffff', s * 0.3 - 0.03, 0.18, 0.77, 0.04);
      }
      o.p('cabeca', 'cone', ouro, [0, -0.14, 0.83], [0.24, 0.5, 0.17], [Math.PI / 2, 0, 0]);
      o.cachecol();
      for (const no of ['pernaE', 'pernaD'] as const)
        o.p(no, 'caixa', '#cbe4f1', [0, -0.57, 0.13], [0.12, 0.15, 0.95]);
      o.p('bracoD', 'cilindro', a, [0.2, -0.45, 0.55], [0.36, 1.1, 0.36], [Math.PI / 2, 0, 0]);
      o.bola('bracoD', '#efffff', 0.2, -0.45, 1.13, 0.28);
      break;
    case 'guaxinim':
      o.orelhas('redonda', c, 0.32);
      o.mochila('#cf9d58');
      o.bola('cauda', c, 0, 0.05, -0.8, 0.35, 0.36, 1);
      for (let i = 0; i < 3; i++)
        o.p(
          'cauda',
          'cilindro',
          escuro,
          [0, 0.05, -0.35 - i * 0.45],
          [0.34, 0.17, 0.34],
          [Math.PI / 2, 0, 0]
        );
      for (const s of [-1, 1])
        o.p('cabeca', 'anel', ouro, [s * 0.35, 0.48, 0.6], [0.27, 0.24, 0.12]);
      o.p('bracoD', 'caixa', '#d9e7e9', [0.12, -0.18, 0.35], [0.18, 0.95, 0.15]);
      o.p('bracoD', 'anel', '#d9e7e9', [0.12, 0.4, 0.35], [0.28, 0.28, 0.14]);
      break;
    case 'polvo':
      o.bola('corpo', c, 0, 1, 0, 0.94, 0.78, 0.78);
      for (let i = 0; i < 8; i++) {
        const t = (i * Math.PI) / 4;
        const x = Math.cos(t),
          z = Math.sin(t);
        o.p(
          'corpo',
          'bola',
          c,
          [x * 0.79, 0.5, z * 0.79],
          [0.28, 0.32, 0.72],
          [0, Math.PI / 2 - t, 0.13]
        );
        o.bola('corpo', a, x * 1.22, 0.37, z * 1.22, 0.23, 0.13, 0.24);
      }
      o.bola('cabeca', '#665077', -0.17, 0.72, -0.05, 0.91, 0.24, 0.65);
      o.bola('cabeca', a, -0.24, 0.96, 0, 0.13);
      o.bastao(a, 'cone', 1.1);
      o.p('bracoE', 'bola', '#edc891', [-0.08, -0.65, 0.5], [0.43, 0.13, 0.6], [0.1, 0, 0]);
      for (let i = 0; i < 3; i++)
        o.bola('bracoE', ['#f67d88', '#81e3d4', '#ab92ed'][i], (i - 1) * 0.22, -0.49, 0.5, 0.09);
      break;
    case 'borboleta':
      o.asas('borboleta');
      o.capa('#c6a9e9');
      o.bastao('#fff5cc', 'cone');
      for (const s of [-1, 1]) {
        o.p(
          'cabeca',
          'cilindro',
          escuro,
          [s * 0.33, 0.98, 0],
          [0.035, 0.7, 0.035],
          [0, 0, -s * 0.3]
        );
        o.bola('cabeca', a, s * 0.44, 1.32, 0, 0.12);
      }
      o.p('bracoE', 'anel', ouro, [-0.1, -0.5, 0.4], [0.38, 0.38, 0.15]);
      break;
    case 'capivara':
      o.orelhas('redonda', c, 0.22, 0.73);
      o.cachecol();
      o.p('cabeca', 'bola', a, [0, 0.8, 0], [0.47, 0.32, 0.42]);
      o.p('cabeca', 'cone', ouro, [0, 1.14, 0], [0.35, 0.16, 0.32]);
      o.p('cabeca', 'cone', a, [0.51, 0.94, 0], [0.16, 0.46, 0.14], [0, 0, -0.9]);
      o.p('cabeca', 'anel', a, [-0.44, 0.9, 0], [0.28, 0.23, 0.15]);
      o.p('bracoE', 'cilindro', creme, [0, -0.6, 0.35], [0.28, 0.34, 0.28]);
      o.p('bracoE', 'anel', ouro, [-0.29, -0.6, 0.35], [0.17, 0.14, 0.1]);
      break;
    case 'lontra':
      o.orelhas('redonda', c, 0.23, 0.74);
      o.cachecol();
      o.espada('#a6eaf4');
      o.p('cauda', 'bola', c, [0, -0.15, -0.7], [0.27, 0.27, 0.95], [0.3, 0, 0]);
      o.bola('bracoE', a, -0.09, -0.45, 0.4, 0.38, 0.49, 0.15);
      break;
    case 'tubarao':
      o.bola('cabeca', c, 0, -0.04, 0.36, 0.79, 0.56, 0.7);
      for (const lado of [-1, 1]) {
        o.bola('cabeca', escuro, lado * 0.34, 0.15, 0.995, 0.13, 0.17, 0.07);
        o.bola('cabeca', '#ffffff', lado * 0.34 - 0.03, 0.2, 1.052, 0.044, 0.055, 0.025);
        o.bola('cabeca', rosa, lado * 0.56, -0.08, 0.91, 0.13, 0.07, 0.04);
      }
      o.bola('cabeca', creme, 0, -0.29, 0.75, 0.65, 0.21, 0.3);
      for (const s of [-1, 1])
        o.p('cabeca', 'cone', creme, [s * 0.28, -0.23, 1], [0.09, 0.18, 0.07], [Math.PI, 0, 0]);
      o.p('corpo', 'cone', c, [0, 1.8, -0.83], [0.42, 1.1, 0.21], [-0.35, 0, 0]);
      o.p('cabeca', 'bola', a, [0, 0.58, -0.04], [0.9, 0.24, 0.67]);
      o.cachecol('#e3a373');
      o.p('cauda', 'bola', c, [0, -0.05, -0.7], [0.23, 0.24, 0.85]);
      for (const s of [-1, 1])
        o.p('cauda', 'cone', c, [s * 0.34, 0.04, -1.33], [0.32, 0.9, 0.22], [0, 0, s * 1.05]);
      o.p('bracoD', 'cilindro', '#748a9a', [0.1, -0.15, 0.4], [0.09, 1.45, 0.09]);
      o.p('bracoD', 'anel', '#a3c8d3', [0.1, -0.83, 0.4], [0.48, 0.38, 0.12]);
      break;
    case 'esquilo':
      o.orelhas('pontuda', c, 0.36);
      o.mochila('#a77958');
      o.bola('cauda', c, 0, 0.65, -0.78, 0.71, 1.3, 0.65);
      o.bola('cauda', creme, 0, 0.88, -1.22, 0.47, 0.86, 0.2);
      for (const s of [-1, 1])
        o.p('cabeca', 'anel', madeira, [s * 0.32, 0.13, 0.77], [0.23, 0.27, 0.1]);
      o.p('bracoD', 'cilindro', ouro, [0.16, -0.4, 0.5], [0.25, 0.9, 0.25], [Math.PI / 2, 0, 0]);
      o.bola('bracoD', madeira, 0.16, -0.4, 1.02, 0.26);
      break;
    case 'carneiro':
      for (let i = 0; i < 11; i++) {
        const t = (i * Math.PI * 2) / 11;
        o.bola('cabeca', creme, Math.cos(t) * 0.7, Math.sin(t) * 0.62, -0.08, 0.35);
      }
      for (const s of [-1, 1]) {
        o.bola('cabeca', c, s * 0.9, -0.05, 0.03, 0.32, 0.18, 0.25);
        o.p('cabeca', 'anel', '#caa789', [s * 0.79, 0.2, -0.13], [0.33, 0.35, 0.18]);
      }
      o.p('corpo', 'bola', a, [0, 1.29, 0.23], [0.79, 0.83, 0.54]);
      o.p('bracoE', 'caixa', '#c3b6ed', [-0.09, -0.45, 0.65], [0.95, 0.62, 0.24], [0, 0, -0.13]);
      o.chapeu(a, 0.7);
      break;
    case 'lobo':
      o.orelhas('pontuda', c, 0.74);
      o.capa('#6a9cbe');
      o.cachecol();
      o.p('cauda', 'bola', c, [0, 0.02, -0.8], [0.35, 0.34, 1.05], [0.4, 0, 0]);
      o.bola('cauda', creme, 0, 0.4, -1.46, 0.27);
      for (const no of ['bracoE', 'bracoD'] as const)
        o.p(no, 'cristal', a, [0, -0.67, 0.43], [0.16, 0.46, 0.13], [0.6, 0, 0]);
      break;
    case 'cogumelo':
      o.p('cabeca', 'bola', c, [0, 0.79, 0], [1.24, 0.64, 1.04]);
      o.p('cabeca', 'cilindro', creme, [0, 0.48, 0], [1.19, 0.09, 1]);
      for (let i = 0; i < 7; i++) {
        const t = (i * Math.PI * 2) / 7;
        o.bola('cabeca', creme, Math.cos(t) * 0.79, 1.12, Math.sin(t) * 0.61, 0.18, 0.07, 0.19);
      }
      o.mochila('#9e9565');
      o.bastao('#b9f5ba', 'bola');
      o.bola('corpo', creme, 0, 1.5, 0.5, 0.5, 0.67, 0.18);
      break;
    case 'abelha':
      o.asas('abelha');
      for (let i = 0; i < 3; i++)
        o.p('corpo', 'cilindro', '#6e5148', [0, 0.95 + i * 0.34, -0.03], [0.68, 0.15, 0.6]);
      for (const s of [-1, 1]) {
        o.p(
          'cabeca',
          'cilindro',
          escuro,
          [s * 0.34, 0.91, -0.04],
          [0.04, 0.61, 0.04],
          [0, 0, -s * 0.4]
        );
        o.bola('cabeca', ouro, s * 0.46, 1.2, -0.04, 0.12);
      }
      o.chapeu('#87647e', 0.3);
      o.espada('#fff0bb', true);
      o.p('cauda', 'cone', madeira, [0, -0.05, -0.4], [0.2, 0.6, 0.2], [-Math.PI / 2, 0, 0]);
      break;
    case 'camaleao':
      for (const s of [-1, 1]) o.bola('cabeca', c, s * 0.72, 0.16, 0.18, 0.33, 0.36, 0.4);
      o.p('cauda', 'anel', c, [0, -0.05, -0.66], [0.62, 0.66, 0.42], [0, 0.15, 0]);
      for (let i = 0; i < 5; i++)
        o.p('cabeca', 'cristal', a, [0, 0.35 + i * 0.12, -0.48 + i * 0.16], [0.18, 0.3, 0.2]);
      for (const s of [-1, 1]) o.p('corpo', 'cristal', a, [s * 0.64, 1.8, 0.1], [0.4, 0.48, 0.37]);
      o.espada('#b2f5ef');
      break;
    default:
      o.orelhas('redonda');
      o.cachecol();
      o.bastao(a);
  }
  return o.terminar();
}

/** Anima só o rig interno; movimento e orientação do herói continuam sob controle da simulação. */
export function animarModeloHeroiMoba(
  grupo: T.Group,
  tempo: number,
  movendo: boolean,
  atacando = false
): void {
  const rig = rigs.get(grupo);
  if (!rig || rig.descartado) return;
  const t = (Number.isFinite(tempo) ? tempo : 0) + rig.fase;
  const passo = Math.sin(t * 10),
    respirar = Math.sin(t * 2.5);
  rig.raiz.position.y = rig.voa
    ? 0.3 + Math.sin(t * 4) * 0.13
    : movendo
      ? Math.abs(passo) * 0.1
      : respirar * 0.035;
  rig.raiz.rotation.z = movendo ? passo * 0.035 : respirar * 0.013;
  rig.nos.cabeca.rotation.y = Math.sin(t * 1.5) * 0.065;
  rig.nos.cabeca.rotation.z = respirar * 0.025;
  rig.nos.pernaE.rotation.x = movendo ? passo * 0.48 : 0;
  rig.nos.pernaD.rotation.x = movendo ? -passo * 0.48 : 0;
  rig.nos.bracoE.rotation.x = movendo ? -passo * 0.3 : respirar * 0.035;
  rig.nos.bracoD.rotation.x = atacando
    ? -0.6 + Math.sin(t * 17) * 0.65
    : movendo
      ? passo * 0.3
      : -respirar * 0.035;
  rig.nos.bracoD.rotation.z = atacando ? -0.23 : 0;
  rig.nos.cauda.rotation.y = Math.sin(t * (movendo ? 7 : 2.7)) * 0.24;
  rig.nos.asaE.rotation.y = Math.sin(t * (rig.voa ? 13 : 3.3)) * (rig.voa ? 0.53 : 0.16);
  rig.nos.asaD.rotation.y = -rig.nos.asaE.rotation.y;
  rig.nos.asaE.rotation.z = Math.sin(t * 4) * 0.08;
  rig.nos.asaD.rotation.z = -rig.nos.asaE.rotation.z;
}

/** Idempotente: nenhuma geometria/material pertence a outra instância. */
export function descartarModeloHeroiMoba(grupo: T.Group): void {
  const rig = rigs.get(grupo);
  if (!rig || rig.descartado) return;
  rig.descartado = true;
  const geometrias = new Set<T.BufferGeometry>(),
    materiais = new Set<T.Material>();
  grupo.traverse((obj) => {
    if (obj instanceof T.Mesh) {
      geometrias.add(obj.geometry);
      for (const material of Array.isArray(obj.material) ? obj.material : [obj.material])
        materiais.add(material);
    }
  });
  for (const g of geometrias) g.dispose();
  for (const m of materiais) m.dispose();
  grupo.removeFromParent();
  grupo.clear();
  rigs.delete(grupo);
}
