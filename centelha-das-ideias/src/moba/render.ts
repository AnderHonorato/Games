import * as T from 'three';
import { criarModeloHeroiMoba, animarModeloHeroiMoba, descartarModeloHeroiMoba } from './modelos';
import { heroiMoba } from './dados';
import type { SimulacaoMoba } from './simulacao';
import type { DefHeroiMoba } from './tipos';

/** Cena ortográfica com recursos geométricos compartilhados e limites de efeitos. */
export class RenderMoba {
  readonly renderer: T.WebGLRenderer;
  readonly cena = new T.Scene();
  readonly camera = new T.OrthographicCamera(-40, 40, 24, -24, 0.1, 600);
  private ray = new T.Raycaster();
  private plano = new T.Plane(new T.Vector3(0, 1, 0), 0);
  private recursos = new Set<T.BufferGeometry | T.Material>();
  private entidades = new Map<number, T.Group>();
  private modelos = new Map<number, ReturnType<typeof criarModeloHeroiMoba>>();
  private dinamicos = new T.Group();
  private alvo = new T.Vector3(-72, 0, 72);
  private previa?: ReturnType<typeof criarModeloHeroiMoba>;
  private largura = 0;
  private pool: T.Mesh[] = [];
  private cursor = 0;
  private destino = new T.Vector3();
  private pointer = new T.Vector2();
  private intersecao = new T.Vector3();
  private usados = new Set<number>();
  private definicoes = new Map<number, string>();
  private anteriores = new Map<number, { x: number; z: number }>();
  private fog!: T.InstancedMesh;
  private matriz = new T.Matrix4();
  private fogTempo = -1;
  private altura = 0;
  private geoDisco = this.geo(new T.CylinderGeometry(1, 1, 0.1, 20));
  private geoBola = this.geo(new T.SphereGeometry(1, 8, 6));
  private geoCaixa = this.geo(new T.BoxGeometry(1, 1, 1));
  private materiais = new Map<string, T.MeshStandardMaterial>();
  constructor(readonly canvas: HTMLCanvasElement) {
    this.renderer = new T.WebGLRenderer({
      canvas,
      antialias: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
    this.renderer.shadowMap.enabled = false;
    this.renderer.outputColorSpace = T.SRGBColorSpace;
    this.cena.background = new T.Color('#183b3c');
    this.cena.fog = new T.Fog('#183b3c', 130, 290);
    this.cena.add(new T.HemisphereLight('#e9fff2', '#51656c', 2.5));
    const luz = new T.DirectionalLight('#ffedcf', 2.6);
    luz.position.set(-30, 80, 35);
    this.cena.add(luz);
    this.cena.add(this.dinamicos);
    this.cenario();
    const fogMat = new T.MeshBasicMaterial({
      color: '#0b2025',
      transparent: true,
      opacity: 0.84,
      depthWrite: false,
    });
    this.recursos.add(fogMat);
    this.fog = new T.InstancedMesh(this.geoCaixa, fogMat, 900);
    this.fog.frustumCulled = false;
    this.cena.add(this.fog);
  }
  private geo<G extends T.BufferGeometry>(g: G): G {
    this.recursos.add(g);
    return g;
  }
  private mat(cor: string): T.MeshStandardMaterial {
    let m = this.materiais.get(cor);
    if (!m) {
      m = new T.MeshStandardMaterial({ color: cor, roughness: 0.9 });
      this.materiais.set(cor, m);
      this.recursos.add(m);
    }
    return m;
  }
  private forma(
    g: T.BufferGeometry,
    cor: string,
    x: number,
    y: number,
    z: number,
    sx = 1,
    sy = 1,
    sz = 1,
    grupo: T.Object3D = this.cena
  ): T.Mesh {
    const m = new T.Mesh(g, this.mat(cor));
    m.position.set(x, y, z);
    m.scale.set(sx, sy, sz);
    grupo.add(m);
    return m;
  }
  private trilha(pontos: number[][], cor: string, largura: number, y: number) {
    for (let i = 1; i < pontos.length; i++) {
      const a = pontos[i - 1],
        b = pontos[i],
        dx = b[0] - a[0],
        dz = b[1] - a[1];
      const m = this.forma(
        this.geoCaixa,
        cor,
        (a[0] + b[0]) / 2,
        y,
        (a[1] + b[1]) / 2,
        largura,
        0.15,
        Math.hypot(dx, dz) + largura
      );
      m.rotation.y = Math.atan2(dx, dz);
    }
  }
  private cenario() {
    this.forma(this.geoCaixa, '#32635b', 0, -0.7, 0, 184, 1, 184);
    this.trilha(
      [
        [-82, -56],
        [-35, -30],
        [0, 0],
        [36, 32],
        [82, 57],
      ],
      '#438f98',
      13,
      -0.08
    );
    for (const pontos of [
      [
        [-72, 72],
        [-72, -72],
        [72, -72],
      ],
      [
        [-72, 72],
        [0, 0],
        [72, -72],
      ],
      [
        [-72, 72],
        [72, 72],
        [72, -72],
      ],
    ]) {
      this.trilha(pontos, '#567668', 10, 0.05);
      this.trilha(pontos, '#a7b9a0', 7.4, 0.16);
    }
    const tronco = this.geo(new T.CylinderGeometry(0.4, 0.7, 3, 5));
    const copa = this.geo(new T.ConeGeometry(3.5, 7, 6));
    for (let i = 0; i < 150; i++) {
      const x = Math.sin(i * 57.7) * 86,
        z = Math.cos(i * 33.3) * 86;
      if (
        Math.abs(x + z) < 12 ||
        Math.abs(x) > 65 ||
        Math.abs(z) > 65 ||
        Math.abs(z - x * 0.7) < 12
      )
        continue;
      this.forma(tronco, '#796951', x, 1.5, z);
      this.forma(copa, i % 3 === 0 ? '#3d8b70' : '#286c60', x, 6, z, 1, 1 + (i % 3) * 0.15, 1);
      this.forma(this.geoDisco, '#28544c', x + 1.1, 0.2, z + 1.4, 4, 1, 3.5);
    }
    for (let i = 0; i < 48; i++) {
      const x = Math.sin(i * 48) * 83,
        z = Math.cos(i * 77) * 84;
      if (Math.abs(x + z) < 9 || Math.abs(x) > 66 || Math.abs(z) > 66) continue;
      this.forma(this.geoBola, '#7f9790', x, 0.7, z, 1.2, 1.5, 1.8);
    }
    for (const [x, z, cor] of [
      [-72, 72, '#78dce3'],
      [72, -72, '#f7a092'],
    ] as const) {
      this.forma(this.geoDisco, '#536e7b', x, 0.3, z, 13, 2, 13);
      this.forma(this.geoDisco, cor, x, 0.45, z, 10, 1, 10);
      this.forma(this.geoDisco, '#d8e9ce', x, 0.55, z, 7, 1, 7);
      for (let i = 0; i < 8; i++)
        this.forma(
          this.geoBola,
          cor,
          x + Math.cos((i * Math.PI) / 4) * 11,
          1,
          z + Math.sin((i * Math.PI) / 4) * 11,
          0.65,
          0.65,
          0.65
        );
    }
  }
  selecionar(def: DefHeroiMoba) {
    if (this.previa) {
      this.cena.remove(this.previa);
      descartarModeloHeroiMoba(this.previa);
    }
    this.previa = criarModeloHeroiMoba(def);
    this.previa.scale.setScalar(2.2);
    this.previa.position.set(-72, 0.4, 72);
    this.cena.add(this.previa);
  }
  ponto(clientX: number, clientY: number): { x: number; z: number } {
    const r = this.canvas.getBoundingClientRect();
    this.pointer.set(
      ((clientX - r.left) / r.width) * 2 - 1,
      (-(clientY - r.top) / r.height) * 2 + 1
    );
    this.ray.setFromCamera(this.pointer, this.camera);
    const p = this.intersecao;
    this.ray.ray.intersectPlane(this.plano, p);
    return { x: Math.max(-88, Math.min(88, p.x)), z: Math.max(-88, Math.min(88, p.z)) };
  }
  private unidade(id: number, cor: string, tamanho: number): T.Group {
    let grupo = this.entidades.get(id);
    if (!grupo) {
      grupo = new T.Group();
      this.entidades.set(id, grupo);
      this.cena.add(grupo);
      this.forma(this.geoDisco, '#233c3c', 0.6, 0.25, 0.7, tamanho * 1.1, 1, tamanho * 0.8, grupo);
      this.forma(this.geoBola, cor, 0, tamanho, 0, tamanho * 0.7, tamanho, tamanho * 0.7, grupo);
      this.forma(this.geoCaixa, '#e8ead2', 0, tamanho * 1.8, 0.5, tamanho * 0.6, 0.4, 0.4, grupo);
    }
    return grupo;
  }
  desenhar(sim: SimulacaoMoba, dt: number) {
    const w = this.canvas.clientWidth || innerWidth,
      h = this.canvas.clientHeight || innerHeight;
    if (w !== this.largura || h !== this.altura) {
      this.largura = w;
      this.altura = h;
      this.renderer.setSize(w, h, false);
      this.camera.left = (-30 * w) / h;
      this.camera.right = (30 * w) / h;
      this.camera.top = 30;
      this.camera.bottom = -30;
      this.camera.updateProjectionMatrix();
    }
    const menu = sim.estado === 'menu';
    if (!menu && this.previa) {
      this.cena.remove(this.previa);
      descartarModeloHeroiMoba(this.previa);
      this.previa = undefined;
    }
    const local = sim.local;
    const destino = this.destino.set(menu ? -72 : local.x, 0, menu ? 72 : local.z);
    this.alvo.lerp(destino, Math.min(1, dt * 9));
    this.renderer.setViewport(0, 0, w, h);
    this.camera.left = (-30 * w) / h;
    this.camera.right = (30 * w) / h;
    this.camera.top = 30;
    this.camera.bottom = -30;
    this.camera.updateProjectionMatrix();
    this.camera.position.set(this.alvo.x, 83, this.alvo.z + 48);
    this.camera.lookAt(this.alvo);
    if (menu) {
      const box = document.querySelector('.moba-preview')?.getBoundingClientRect();
      if (box) {
        this.renderer.setViewport(box.left, h - box.bottom, box.width, box.height);
        this.camera.left = (-9 * box.width) / box.height;
        this.camera.right = (9 * box.width) / box.height;
        this.camera.top = 9;
        this.camera.bottom = -9;
        this.camera.updateProjectionMatrix();
        this.camera.position.set(-72, 13, 94);
        this.camera.lookAt(-72, 5, 72);
      }
      this.fog.visible = false;
      for (const g of this.entidades.values()) g.visible = false;
      for (const m of this.modelos.values()) m.visible = false;
      for (const m of this.pool) m.visible = false;
      if (this.previa)
        animarModeloHeroiMoba(this.previa, sim.tempo + performance.now() / 1000, false);
      this.renderer.render(this.cena, this.camera);
      return;
    }
    const existentes = this.usados;
    existentes.clear();
    this.fog.visible = true;
    for (const h of sim.herois) {
      existentes.add(h.id);
      let modelo = this.modelos.get(h.id);
      if (modelo && this.definicoes.get(h.id) !== h.defId) {
        this.cena.remove(modelo);
        descartarModeloHeroiMoba(modelo);
        this.modelos.delete(h.id);
        modelo = undefined;
      }
      if (!modelo) {
        modelo = criarModeloHeroiMoba(heroiMoba(h.defId));
        this.modelos.set(h.id, modelo);
        this.definicoes.set(h.id, h.defId);
        modelo.scale.setScalar(1);
        this.cena.add(modelo);
      }
      modelo.visible = h.vivo && (h.time === local.time || sim.visivel(local.time, h.x, h.z));
      modelo.position.set(h.x, 0.25, h.z);
      const antes = this.anteriores.get(h.id);
      const movendo = !!antes && Math.hypot(antes.x - h.x, antes.z - h.z) > 0.005;
      if (movendo && antes) modelo.rotation.y = Math.atan2(h.x - antes.x, h.z - antes.z);
      if (antes) {
        antes.x = h.x;
        antes.z = h.z;
      } else this.anteriores.set(h.id, { x: h.x, z: h.z });
      animarModeloHeroiMoba(modelo, sim.tempo, movendo, h.recargaAtaque > 0.65);
    }
    for (const u of [...sim.unidades, ...sim.estruturas]) {
      existentes.add(u.id);
      const cor = u.time === local.time ? '#74dbe0' : u.time === 2 ? '#d3ba7e' : '#f58c8d';
      let g = this.entidades.get(u.id);
      if (!g && 'ordem' in u) {
        g = new T.Group();
        this.entidades.set(u.id, g);
        this.cena.add(g);
        const s = u.tipo === 'nucleo' ? 5 : u.tipo === 'torre' ? 2.3 : 3;
        this.forma(this.geoDisco, '#475d62', 0, 0.35, 0, s * 1.5, 3, s * 1.5, g);
        this.forma(this.geoCaixa, '#e4e4ca', 0, 2.5, 0, s, 4, s, g);
        const cristal = this.forma(
          this.geo(new T.OctahedronGeometry(s)),
          cor,
          0,
          6,
          0,
          1,
          1.4,
          1,
          g
        );
        cristal.rotation.y = 0.4;
      }
      g ??= this.unidade(u.id, cor, u.tipo === 'chefe' ? 3 : u.tipo === 'neutro' ? 1.5 : 1);
      g.position.set(u.x, 0, u.z);
      g.visible = u.vida > 0 && (u.time === local.time || sim.visivel(local.time, u.x, u.z));
    }
    for (const [id, g] of this.entidades)
      if (!existentes.has(id)) {
        this.cena.remove(g);
        this.entidades.delete(id);
      }
    this.cursor = 0;
    if (sim.tempo - this.fogTempo > 0.2 || sim.tempo < this.fogTempo) {
      this.fogTempo = sim.tempo;
      for (let i = 0; i < 900; i++) {
        const x = -87 + (i % 30) * 6,
          z = -87 + Math.floor(i / 30) * 6;
        const v = sim.visivel(local.time, x, z);
        this.matriz.makeScale(v ? 0 : 6.05, 0.12, v ? 0 : 6.05);
        this.matriz.setPosition(x, 0.75, z);
        this.fog.setMatrixAt(i, this.matriz);
      }
      this.fog.instanceMatrix.needsUpdate = true;
    }
    for (const p of sim.projeteis.slice(0, 100))
      if (sim.visivel(local.time, p.x, p.z))
        this.temporario(
          this.geoBola,
          p.cor,
          p.x,
          2,
          p.z,
          Math.max(0.35, p.raio),
          Math.max(0.35, p.raio),
          Math.max(0.35, p.raio)
        );
    for (const e of sim.efeitos.slice(-40))
      if (sim.visivel(local.time, e.x, e.z)) {
        const m = this.temporario(this.geoDisco, e.cor, e.x, 0.85, e.z, e.raio, 1, e.raio);
        m.scale.multiplyScalar(0.7 + 0.3 * (1 - e.vida / e.total));
      }
    for (const s of sim.sentinelas)
      if (s.time === local.time)
        this.temporario(this.geoBola, '#f6e7a5', s.x, 1.4, s.z, 0.7, 1.2, 0.7);
    // Barras usam geometria compartilhada; nenhum canvas ou textura é criado por quadro.
    for (const u of [...sim.herois, ...sim.unidades, ...sim.estruturas]) {
      if (u.vida <= 0 || !(u.time === local.time || sim.visivel(local.time, u.x, u.z))) continue;
      const y = 'ordem' in u ? 9 : u.tipo === 'heroi' ? 8 : 3.5;
      this.temporario(this.geoCaixa, '#183335', u.x, y, u.z, 4.2, 0.4, 0.5);
      const v = Math.max(0.01, u.vida / u.vidaMax);
      this.temporario(
        this.geoCaixa,
        u.time === local.time ? '#85e9aa' : '#fb9b9a',
        u.x - (1 - v) * 2,
        y + 0.06,
        u.z,
        4 * v,
        0.42,
        0.55
      );
    }
    for (let i = this.cursor; i < this.pool.length; i++) this.pool[i].visible = false;
    this.renderer.render(this.cena, this.camera);
  }
  private temporario(
    geo: T.BufferGeometry,
    cor: string,
    x: number,
    y: number,
    z: number,
    sx: number,
    sy: number,
    sz: number
  ): T.Mesh {
    let m = this.pool[this.cursor++];
    if (!m) {
      m = new T.Mesh(geo, this.mat(cor));
      this.pool.push(m);
      this.dinamicos.add(m);
    }
    m.geometry = geo;
    m.material = this.mat(cor);
    m.visible = true;
    m.position.set(x, y, z);
    m.scale.set(sx, sy, sz);
    return m;
  }
  descartar() {
    for (const m of this.modelos.values()) descartarModeloHeroiMoba(m);
    if (this.previa) descartarModeloHeroiMoba(this.previa);
    for (const r of this.recursos) r.dispose();
    this.renderer.dispose();
  }
}
