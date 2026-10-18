import * as T from 'three';
import { criarModeloHeroiMoba, animarModeloHeroiMoba, descartarModeloHeroiMoba } from './modelos';
import { heroiMoba } from './dados';
import type { SimulacaoMoba } from './simulacao';
import type { DefHeroiMoba, UnidadeMoba, EstruturaMoba } from './tipos';
import type { MiraMoba } from './mira';
import { CenarioMoba } from './cenario';
import { EfeitosMoba } from './efeitos';
import { EsculturaMoba } from './geometria';
import { CAMPOS_MOBA } from './rotas';

/** Cena de fantasia legível, com cenário agrupado e efeitos em oito lotes instanciados. */
export class RenderMoba {
  readonly renderer: T.WebGLRenderer;
  readonly cena = new T.Scene();
  readonly camera = new T.OrthographicCamera(-40, 40, 23, -23, 0.1, 600);
  private ray = new T.Raycaster();
  private plano = new T.Plane(new T.Vector3(0, 1, 0), 0);
  private recursos = new Set<T.BufferGeometry | T.Material | T.Texture>();
  private entidades = new Map<number, T.Group>();
  private modelos = new Map<number, T.Group>();
  private templates = new Map<string, T.Group>();
  private alvo = new T.Vector3(-72, 0, 72);
  private previa?: T.Group;
  private largura = 0;
  private altura = 0;
  private destino = new T.Vector3();
  private pointer = new T.Vector2();
  private intersecao = new T.Vector3();
  private usados = new Set<number>();
  private definicoes = new Map<number, string>();
  private anteriores = new Map<number, { x: number; z: number }>();
  private cenario = new CenarioMoba();
  private fx = new EfeitosMoba();
  private fog: T.Mesh;
  private fogDados = new Uint8Array(60 * 60 * 4);
  private fogTextura: T.DataTexture;
  private fogTempo = -1;
  private mira: MiraMoba | null = null;
  private descartado = false;
  private geoCaixa = this.geo(new T.BoxGeometry(1, 1, 1));
  private geoBola = this.geo(new T.IcosahedronGeometry(1, 1));
  private geoDisco = this.geo(new T.CylinderGeometry(1, 1, 1, 16));
  private geoCone = this.geo(new T.ConeGeometry(1, 1, 8));
  private geoCristal = this.geo(new T.OctahedronGeometry(1));
  private geoAnel = this.geo(new T.TorusGeometry(1, 0.12, 4, 20));
  private materialEscultura = this.material(
    new T.MeshStandardMaterial({ vertexColors: true, roughness: 0.78 })
  );
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
    this.renderer.toneMapping = T.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.02;
    this.cena.background = new T.Color('#41655f');
    this.cena.fog = new T.Fog('#41655f', 150, 310);
    this.cena.add(new T.HemisphereLight('#e2f7f5', '#526443', 1.6));
    const luz = new T.DirectionalLight('#fff0cf', 2.25);
    luz.position.set(-40, 65, 35);
    this.cena.add(luz);
    const borda = new T.DirectionalLight('#b6c8ff', 0.65);
    borda.position.set(45, 35, -55);
    this.cena.add(borda);
    this.cena.add(this.cenario.grupo, this.fx.grupo);
    for (let i = 0; i < 3600; i++) {
      this.fogDados[i * 4] = 14;
      this.fogDados[i * 4 + 1] = 30;
      this.fogDados[i * 4 + 2] = 44;
      this.fogDados[i * 4 + 3] = 0;
    }
    this.fogTextura = new T.DataTexture(this.fogDados, 60, 60, T.RGBAFormat);
    this.fogTextura.magFilter = T.LinearFilter;
    this.fogTextura.minFilter = T.LinearFilter;
    this.fogTextura.needsUpdate = true;
    this.recursos.add(this.fogTextura);
    const fogMat = this.material(
      new T.MeshBasicMaterial({
        map: this.fogTextura,
        transparent: true,
        depthWrite: false,
        toneMapped: false,
        side: T.DoubleSide,
      })
    );
    const fogGeo = this.geo(new T.PlaneGeometry(180, 180));
    fogGeo.rotateX(-Math.PI / 2);
    this.fog = new T.Mesh(fogGeo, fogMat);
    this.fog.position.y = 0.43;
    this.fog.renderOrder = 2;
    this.cena.add(this.fog);
  }
  private geo<G extends T.BufferGeometry>(g: G): G {
    this.recursos.add(g);
    return g;
  }
  private material<M extends T.Material>(m: M): M {
    this.recursos.add(m);
    return m;
  }
  private mat(cor: string) {
    let m = this.materiais.get(cor);
    if (!m) {
      m = this.material(
        new T.MeshStandardMaterial({
          color: cor,
          roughness: 0.4,
          emissive: cor,
          emissiveIntensity: 0.24,
        })
      );
      this.materiais.set(cor, m);
    }
    return m;
  }
  definirMira(mira: MiraMoba | null): void {
    this.mira = mira;
  }
  selecionar(def: DefHeroiMoba) {
    if (this.previa) {
      this.cena.remove(this.previa);
      descartarModeloHeroiMoba(this.previa);
    }
    this.previa = criarModeloHeroiMoba(def);
    this.previa.scale.setScalar(2.2);
    this.previa.position.set(-72, 1, 72);
    this.cena.add(this.previa);
  }
  ponto(clientX: number, clientY: number, limitar = true): { x: number; z: number } {
    const r = this.canvas.getBoundingClientRect();
    this.pointer.set(
      ((clientX - r.left) / r.width) * 2 - 1,
      -((clientY - r.top) / r.height) * 2 + 1
    );
    this.ray.setFromCamera(this.pointer, this.camera);
    this.ray.ray.intersectPlane(this.plano, this.intersecao);
    return limitar
      ? {
          x: Math.max(-88, Math.min(88, this.intersecao.x)),
          z: Math.max(-88, Math.min(88, this.intersecao.z)),
        }
      : { x: this.intersecao.x, z: this.intersecao.z };
  }
  private escultura(e: EsculturaMoba, grupo: T.Group): T.Mesh {
    const g = this.geo(e.finalizar()),
      m = new T.Mesh(g, this.materialEscultura);
    grupo.add(m);
    return m;
  }
  private criarUnidade(u: UnidadeMoba): T.Group {
    const variante =
      u.tipo === 'neutro'
        ? CAMPOS_MOBA.reduce(
            (melhor, p, i) =>
              Math.hypot(p.x - u.x, p.z - u.z) <
              Math.hypot(CAMPOS_MOBA[melhor].x - u.x, CAMPOS_MOBA[melhor].z - u.z)
                ? i
                : melhor,
            0
          ) % 3
        : 0;
    const alcance = u.alcance > 3 ? 'mago' : 'guarda',
      chave = `${u.tipo}-${u.time}-${alcance}-${variante}`;
    let template = this.templates.get(chave);
    if (!template) {
      template = new T.Group();
      const e = new EsculturaMoba(),
        cor = u.time === 0 ? '#66ccdb' : u.time === 1 ? '#dc829f' : '#98c4a2',
        clara = u.time === 0 ? '#d8fbf0' : u.time === 1 ? '#f8d7e2' : '#e2e1ba',
        escura = u.time === 0 ? '#356477' : '#744664';
      if (u.tipo === 'cerco') {
        // Carrinho de cerco com quatro rodas, canhão e cristal carregado.
        e.adicionar(this.geoCaixa, '#816e57', 0, 0.9, 0, 1.8, 0.75, 2.7);
        e.adicionar(this.geoCaixa, cor, 0, 1.55, 0, 1.45, 0.7, 1.8);
        for (const lado of [-1, 1])
          for (const z of [-0.8, 0.8]) {
            e.adicionar(
              this.geoDisco,
              '#3c5054',
              lado * 1.05,
              0.65,
              z,
              0.58,
              0.32,
              0.58,
              0,
              0,
              Math.PI / 2
            );
            e.adicionar(
              this.geoDisco,
              '#d5bb80',
              lado * 1.24,
              0.65,
              z,
              0.26,
              0.06,
              0.26,
              0,
              0,
              Math.PI / 2
            );
          }
        e.adicionar(this.geoDisco, escura, 0, 1.85, 1, 0.52, 1.8, 0.52, Math.PI / 2);
        e.adicionar(this.geoDisco, clara, 0, 1.85, 1.89, 0.37, 0.12, 0.37, Math.PI / 2);
        e.adicionar(this.geoCristal, cor, 0, 2.5, -0.55, 0.5, 0.7, 0.5);
      } else if (u.tipo === 'chefe') {
        // Leviatã de cristal: corpo, focinho, garras, chifres, cauda e duas asas distintas.
        e.adicionar(this.geoBola, '#8874ae', 0, 2.6, 0, 2.4, 2.2, 2.8);
        e.adicionar(this.geoBola, '#dbcced', 0, 2.45, 1.4, 1.55, 1.8, 1.7);
        e.adicionar(this.geoBola, '#b1a1ce', 0, 4.5, 1.5, 1.6, 1.5, 1.4);
        e.adicionar(this.geoBola, '#ebdfec', 0, 4.1, 2.55, 1.1, 0.6, 0.9);
        for (const lado of [-1, 1]) {
          e.adicionar(this.geoBola, '#24334d', lado * 0.7, 4.8, 2.6, 0.24, 0.32, 0.13);
          e.adicionar(this.geoBola, '#a7f4f6', lado * 0.66, 4.9, 2.7, 0.09, 0.12, 0.06);
          e.adicionar(
            this.geoCone,
            '#edcc92',
            lado * 1.15,
            6,
            1.5,
            0.46,
            1.8,
            0.46,
            0,
            0,
            -lado * 0.32
          );
          for (const z of [-1.3, 1]) {
            e.adicionar(this.geoBola, '#766397', lado * 1.9, 1, z, 0.75, 1.15, 0.8);
            e.adicionar(
              this.geoCone,
              '#eee2ba',
              lado * 1.9,
              0.6,
              z + 0.6,
              0.35,
              0.8,
              0.35,
              Math.PI / 2
            );
          }
        }
        for (let i = 0; i < 4; i++)
          e.adicionar(
            this.geoCristal,
            '#98e4df',
            0,
            4.8 - i * 0.48,
            -0.5 - i * 0.8,
            0.65,
            0.8,
            0.5
          );
        e.adicionar(this.geoCone, '#8874ae', 0, 1.8, -3.3, 1.1, 4, 1.1, -Math.PI / 2 + 0.2);
      } else if (u.tipo === 'neutro') {
        if (variante === 0) {
          // Guardião vegetal.
          e.adicionar(this.geoBola, '#7c9b70', 0, 1.7, 0, 1.5, 1.65, 1.3);
          e.adicionar(this.geoBola, '#d5d8a8', 0, 2.3, 0.8, 1.1, 0.9, 0.7);
          for (const lado of [-1, 1]) {
            e.adicionar(this.geoBola, '#3d524c', lado * 0.43, 2.6, 1.4, 0.18, 0.25, 0.12);
            e.adicionar(
              this.geoCone,
              '#538f68',
              lado * 0.9,
              3.4,
              0,
              0.8,
              1.6,
              0.65,
              0,
              0,
              -lado * 0.5
            );
            e.adicionar(this.geoCaixa, '#6c8359', lado * 1.35, 0.9, 0, 0.8, 1.5, 0.8);
          }
        } else if (variante === 1) {
          // Golem de âmbar.
          e.adicionar(this.geoBola, '#a99774', 0, 1.4, 0, 1.5, 1.3, 1.4);
          e.adicionar(this.geoCristal, '#e4bf7b', 0, 2.7, 0, 1.2, 1.25, 1.1);
          for (const lado of [-1, 1]) {
            e.adicionar(this.geoBola, '#958873', lado * 1.4, 1.1, 0, 0.65, 1.2, 0.7);
            e.adicionar(this.geoBola, '#33464e', lado * 0.38, 2.9, 1, 0.19, 0.2, 0.1);
          }
        } else {
          // Ave da selva, bico e asas abertas.
          e.adicionar(this.geoBola, '#6e9bac', 0, 1.8, 0, 1.2, 1.5, 1.1);
          e.adicionar(this.geoBola, '#d9e5d1', 0, 2, 0.8, 0.85, 1.05, 0.55);
          for (const lado of [-1, 1]) {
            e.adicionar(
              this.geoCone,
              '#547f94',
              lado * 1.45,
              1.9,
              0,
              0.65,
              2.8,
              0.9,
              0,
              0,
              lado * 1.1
            );
            e.adicionar(this.geoBola, '#273e54', lado * 0.38, 2.5, 1.2, 0.2, 0.24, 0.1);
          }
          e.adicionar(this.geoCone, '#e8c07b', 0, 2.05, 1.55, 0.3, 0.8, 0.3, Math.PI / 2);
        }
      } else if (u.tipo === 'invocacao') {
        e.adicionar(this.geoCristal, cor, 0, 1.2, 0, 0.7, 1.2, 0.7);
        e.adicionar(this.geoBola, clara, 0, 1.7, 0.4, 0.5, 0.5, 0.35);
        for (const lado of [-1, 1]) {
          e.adicionar(this.geoBola, '#314955', lado * 0.2, 1.8, 0.7, 0.09, 0.14, 0.06);
          e.adicionar(this.geoCone, cor, lado * 0.65, 1.2, -0.1, 0.35, 0.8, 0.35, 0, 0, lado * 0.8);
        }
      } else {
        const mago = alcance === 'mago';
        e.adicionar(this.geoCone, escura, 0, 0.95, 0, 0.75, 1.5, 0.65);
        e.adicionar(this.geoCaixa, cor, 0, 1.55, 0, 1.05, 0.9, 0.65);
        e.adicionar(this.geoBola, '#f1ddbc', 0, 2.2, 0.1, 0.58, 0.6, 0.55);
        e.adicionar(
          mago ? this.geoCone : this.geoBola,
          cor,
          0,
          2.6,
          -0.05,
          0.75,
          mago ? 1.2 : 0.45,
          0.72
        );
        e.adicionar(this.geoCaixa, clara, 0, 2.5, 0.63, 0.8, 0.15, 0.12);
        e.adicionar(this.geoCaixa, '#2b414c', -0.21, 2.25, 0.61, 0.12, 0.16, 0.06);
        e.adicionar(this.geoCaixa, '#2b414c', 0.21, 2.25, 0.61, 0.12, 0.16, 0.06);
        for (const lado of [-1, 1]) {
          e.adicionar(this.geoBola, clara, lado * 0.68, 1.7, 0, 0.35, 0.3, 0.35);
          e.adicionar(this.geoCaixa, '#44545a', lado * 0.3, 0.28, 0, 0.4, 0.45, 0.65);
        }
        if (mago) {
          e.adicionar(this.geoCaixa, '#8a7354', 0.9, 1.55, 0.15, 0.16, 2.5, 0.16);
          e.adicionar(this.geoCristal, clara, 0.9, 2.95, 0.15, 0.4, 0.58, 0.4);
        } else {
          e.adicionar(this.geoCaixa, '#e3c38b', 0.95, 1.4, 0.4, 0.75, 0.14, 0.2);
          e.adicionar(this.geoCaixa, '#eef6e3', 0.95, 2.1, 0.4, 0.24, 1.3, 0.13);
          e.adicionar(this.geoBola, cor, -0.85, 1.35, 0.42, 0.5, 0.65, 0.16);
          e.adicionar(this.geoBola, clara, -0.85, 1.35, 0.58, 0.24, 0.28, 0.06);
        }
      }
      this.escultura(e, template);
      if (u.tipo === 'chefe') {
        for (const lado of [-1, 1]) {
          const asa = new EsculturaMoba();
          asa.adicionar(
            this.geoCone,
            '#a18abe',
            lado * 2,
            0,
            -0.4,
            1.45,
            4.6,
            0.3,
            0,
            0.2,
            lado * 1.1
          );
          asa.adicionar(
            this.geoCone,
            '#d0bae5',
            lado * 1.55,
            -0.5,
            -0.1,
            0.85,
            3,
            0.22,
            0,
            0.2,
            lado * 1.1
          );
          const mesh = this.escultura(asa, template);
          mesh.position.set(lado * 1.2, 3.9, -0.7);
          mesh.name = lado < 0 ? 'asa-e' : 'asa-d';
        }
      }
      this.templates.set(chave, template);
    }
    return template.clone();
  }
  private criarEstrutura(u: EstruturaMoba): T.Group {
    const chave = `${u.tipo}-${u.time}`;
    let template = this.templates.get(chave);
    if (!template) {
      template = new T.Group();
      const e = new EsculturaMoba(),
        cor = u.time === 0 ? '#7ee9e0' : '#dd9ed6',
        pedra = u.time === 0 ? '#d3dec5' : '#b4a7c3',
        escura = u.time === 0 ? '#507c82' : '#705a82',
        ouro = '#d9ba7c',
        s = u.tipo === 'nucleo' ? 4.7 : u.tipo === 'torre' ? 2.5 : 2.9;
      e.adicionar(this.geoDisco, escura, 0, 0.5, 0, s * 1.35, 1, s * 1.35);
      e.adicionar(this.geoDisco, pedra, 0, 1, 0, s * 1.08, 0.45, s * 1.08);
      if (u.tipo === 'torre') {
        e.adicionar(this.geoDisco, escura, 0, 3, 0, 1.5, 4, 1.5);
        e.adicionar(this.geoDisco, pedra, 0, 5.1, 0, 2.25, 0.55, 2.25);
        for (let i = 0; i < 4; i++) {
          const a = (i * Math.PI) / 2,
            x = Math.cos(a) * 1.5,
            z = Math.sin(a) * 1.5;
          e.adicionar(this.geoCaixa, pedra, x, 3, z, 0.65, 3.8, 0.65, 0, a);
          e.adicionar(this.geoCone, ouro, x, 6, z, 0.55, 1.65, 0.55);
        }
        e.adicionar(this.geoDisco, ouro, 0, 2, 0, 1.65, 0.24, 1.65);
      } else if (u.tipo === 'inibidor') {
        e.adicionar(this.geoDisco, escura, 0, 1.5, 0, 1.9, 0.75, 1.9);
        for (let i = 0; i < 3; i++) {
          const a = (i * Math.PI * 2) / 3;
          e.adicionar(
            this.geoCone,
            pedra,
            Math.cos(a) * 2.3,
            2.4,
            Math.sin(a) * 2.3,
            0.9,
            3,
            0.9,
            0,
            a,
            Math.cos(a) * 0.35
          );
        }
      } else {
        e.adicionar(this.geoDisco, escura, 0, 1.8, 0, 3.7, 1.3, 3.7);
        for (let i = 0; i < 6; i++) {
          const a = (i * Math.PI) / 3;
          e.adicionar(
            this.geoCone,
            pedra,
            Math.cos(a) * 3.7,
            3.2,
            Math.sin(a) * 3.7,
            0.9,
            4.4,
            0.9,
            0,
            a
          );
          e.adicionar(
            this.geoCristal,
            ouro,
            Math.cos(a) * 3.7,
            5.5,
            Math.sin(a) * 3.7,
            0.6,
            1,
            0.6
          );
        }
      }
      this.escultura(e, template);
      const cristal = new T.Mesh(this.geoCristal, this.mat(cor));
      cristal.name = 'cristal';
      cristal.position.y = u.tipo === 'torre' ? 6 : u.tipo === 'nucleo' ? 5.5 : 3;
      const r = u.tipo === 'nucleo' ? 2.4 : u.tipo === 'torre' ? 1 : 1.3;
      cristal.scale.set(r, r * 1.65, r);
      template.add(cristal);
      const anel = new T.Mesh(this.geoAnel, this.mat(ouro));
      anel.name = 'anel';
      anel.position.y = cristal.position.y - 0.7;
      anel.scale.setScalar(r * 1.4);
      anel.rotation.x = Math.PI / 2.6;
      template.add(anel);
      this.templates.set(chave, template);
    }
    return template.clone();
  }
  private desenharMira(sim: SimulacaoMoba) {
    const m = this.mira;
    if (!m || sim.estado !== 'jogando') return;
    const h = sim.local;
    this.fx.emitir('anel', '#a4eae4', h.x, 0.65, h.z, m.alcance, 1, m.alcance);
    const dx = m.x - h.x,
      dz = m.z - h.z,
      d = Math.hypot(dx, dz) || 1,
      ang = Math.atan2(dz, dx);
    if (m.tipo === 'linha' || m.tipo === 'cone' || m.tipo === 'projetil' || m.tipo === 'puxao') {
      this.fx.linha(m.cor, h.x, h.z, m.x, m.z, 0.68, 0.22);
      if (m.tipo === 'cone')
        for (const lado of [-1, 1])
          this.fx.linha(
            m.cor,
            h.x,
            h.z,
            h.x + Math.cos(ang + lado * 0.48) * m.alcance,
            h.z + Math.sin(ang + lado * 0.48) * m.alcance,
            0.65,
            0.13
          );
      else
        for (const lado of [-1, 1])
          this.fx.linha(
            m.cor,
            h.x - (dz / d) * m.raio * lado,
            h.z + (dx / d) * m.raio * lado,
            m.x - (dz / d) * m.raio * lado,
            m.z + (dx / d) * m.raio * lado,
            0.64,
            0.1
          );
    }
    this.fx.emitir('anel', m.cor, m.x, 0.72, m.z, m.raio, 1, m.raio);
    this.fx.emitir('cristal', '#fff7d6', m.x, 0.95, m.z, 0.25, 0.55, 0.25, 0, sim.tempo);
  }
  desenhar(sim: SimulacaoMoba, dt: number) {
    const w = this.canvas.clientWidth || innerWidth,
      h = this.canvas.clientHeight || innerHeight;
    if (w !== this.largura || h !== this.altura) {
      this.largura = w;
      this.altura = h;
      this.renderer.setSize(w, h, false);
    }
    const menu = sim.estado === 'menu';
    if (!menu && this.previa) {
      this.cena.remove(this.previa);
      descartarModeloHeroiMoba(this.previa);
      this.previa = undefined;
    }
    const local = sim.local,
      destino = this.destino.set(menu ? -72 : local.x, 0, menu ? 72 : local.z);
    this.alvo.lerp(destino, Math.min(1, dt * 9));
    this.renderer.setViewport(0, 0, w, h);
    this.camera.left = (-23 * w) / h;
    this.camera.right = (23 * w) / h;
    this.camera.top = 23;
    this.camera.bottom = -23;
    this.camera.updateProjectionMatrix();
    this.camera.position.set(this.alvo.x, 83, this.alvo.z + 48);
    this.camera.lookAt(this.alvo);
    this.cenario.atualizar(menu ? performance.now() / 1000 : sim.tempo);
    this.fx.iniciar();
    if (menu) {
      const box = document.querySelector('.moba-preview')?.getBoundingClientRect();
      if (box && box.width > 0 && box.height > 0) {
        this.renderer.setViewport(box.left, h - box.bottom, box.width, box.height);
        this.camera.left = (-6.5 * box.width) / box.height;
        this.camera.right = (6.5 * box.width) / box.height;
        this.camera.top = 6.5;
        this.camera.bottom = -6.5;
        this.camera.updateProjectionMatrix();
        this.camera.position.set(-72, 13, 94);
        this.camera.lookAt(-72, 4.6, 72);
      }
      this.fog.visible = false;
      for (const g of this.entidades.values()) g.visible = false;
      for (const m of this.modelos.values()) m.visible = false;
      if (this.previa) animarModeloHeroiMoba(this.previa, performance.now() / 1000, false);
      this.fx.finalizar();
      this.renderer.render(this.cena, this.camera);
      return;
    }
    this.fog.visible = true;
    this.usados.clear();
    for (const heroi of sim.herois) {
      this.usados.add(heroi.id);
      let modelo = this.modelos.get(heroi.id);
      if (modelo && this.definicoes.get(heroi.id) !== heroi.defId) {
        this.cena.remove(modelo);
        descartarModeloHeroiMoba(modelo);
        this.modelos.delete(heroi.id);
        modelo = undefined;
      }
      if (!modelo) {
        modelo = criarModeloHeroiMoba(heroiMoba(heroi.defId));
        this.modelos.set(heroi.id, modelo);
        this.definicoes.set(heroi.id, heroi.defId);
        this.cena.add(modelo);
      }
      modelo.visible =
        heroi.vivo && (heroi.time === local.time || sim.visivel(local.time, heroi.x, heroi.z));
      modelo.scale.setScalar(1.18 + Math.min(18, heroi.nivel) * 0.006);
      modelo.position.set(heroi.x, 0.35, heroi.z);
      const antes = this.anteriores.get(heroi.id),
        movendo = !!antes && Math.hypot(antes.x - heroi.x, antes.z - heroi.z) > 0.005;
      if (movendo && antes) modelo.rotation.y = Math.atan2(heroi.x - antes.x, heroi.z - antes.z);
      else if (heroi.alvo !== null) {
        const alvo =
          sim.herois.find((a) => a.id === heroi.alvo) ??
          sim.unidades.find((a) => a.id === heroi.alvo);
        if (alvo) modelo.rotation.y = Math.atan2(alvo.x - heroi.x, alvo.z - heroi.z);
      }
      if (antes) {
        antes.x = heroi.x;
        antes.z = heroi.z;
      } else this.anteriores.set(heroi.id, { x: heroi.x, z: heroi.z });
      animarModeloHeroiMoba(modelo, sim.tempo, movendo, heroi.recargaAtaque > 0.65);
      if (modelo.visible) {
        this.fx.emitir('disco', '#315049', heroi.x + 0.35, 0.48, heroi.z + 0.4, 1.35, 0.3, 1.05);
        this.fx.emitir(
          'anel',
          heroi.id === local.id ? '#fff0a7' : heroi.time === local.time ? '#7fe8db' : '#ee89b4',
          heroi.x,
          0.58,
          heroi.z,
          heroi.id === local.id ? 1.65 : 1.3,
          1,
          heroi.id === local.id ? 1.65 : 1.3
        );
        if (heroi.nivel >= 6)
          for (let i = 0; i < Math.min(4, Math.floor(heroi.nivel / 5)); i++) {
            const a = sim.tempo * 0.6 + (i * Math.PI) / 2;
            this.fx.emitir(
              'cristal',
              heroi.cor,
              heroi.x + Math.cos(a) * 1.8,
              0.9,
              heroi.z + Math.sin(a) * 1.8,
              0.12,
              0.3,
              0.12
            );
          }
        if (heroi.escudo > 0) {
          this.fx.emitir('anel', '#b9e8ff', heroi.x, 1.6, heroi.z, 1.6, 1, 1.6, 0, sim.tempo);
          for (let i = 0; i < 3; i++) {
            const a = sim.tempo + (i * Math.PI * 2) / 3;
            this.fx.emitir(
              'cristal',
              '#c8f8ff',
              heroi.x + Math.cos(a) * 1.5,
              1.8,
              heroi.z + Math.sin(a) * 1.5,
              0.35,
              0.6,
              0.15,
              0,
              -a
            );
          }
        }
      }
    }
    for (const u of [...sim.unidades, ...sim.estruturas]) {
      this.usados.add(u.id);
      let g = this.entidades.get(u.id);
      const assinatura =
        'ordem' in u ? `${u.tipo}-${u.time}` : `${u.tipo}-${u.time}-${u.alcance > 3}`;
      if (g && g.userData.assinatura !== assinatura) {
        this.cena.remove(g);
        this.entidades.delete(u.id);
        g = undefined;
      }
      if (!g) {
        g = 'ordem' in u ? this.criarEstrutura(u) : this.criarUnidade(u);
        g.userData.assinatura = assinatura;
        this.entidades.set(u.id, g);
        this.cena.add(g);
      }
      g.position.set(u.x, 0, u.z);
      g.visible = u.vida > 0 && (u.time === local.time || sim.visivel(local.time, u.x, u.z));
      if (g.visible) {
        if ('ordem' in u) {
          const cr = g.getObjectByName('cristal');
          if (cr) {
            cr.rotation.y = sim.tempo * 0.45;
            cr.position.y =
              (u.tipo === 'torre' ? 6 : u.tipo === 'nucleo' ? 5.5 : 3) +
              Math.sin(sim.tempo * 1.8 + u.id) * 0.2;
          }
          const an = g.getObjectByName('anel');
          if (an) an.rotation.z = sim.tempo * 0.3;
        } else {
          const antes = this.anteriores.get(u.id),
            movendo = !!antes && Math.hypot(antes.x - u.x, antes.z - u.z) > 0.002;
          if (movendo && antes) g.rotation.y = Math.atan2(u.x - antes.x, u.z - antes.z);
          if (antes) {
            antes.x = u.x;
            antes.z = u.z;
          } else this.anteriores.set(u.id, { x: u.x, z: u.z });
          g.position.y = movendo
            ? Math.abs(Math.sin(sim.tempo * (u.tipo === 'cerco' ? 5 : 10) + u.id)) * 0.12
            : 0;
          if (u.tipo === 'chefe')
            for (const nome of ['asa-e', 'asa-d']) {
              const asa = g.getObjectByName(nome);
              if (asa)
                asa.rotation.z = Math.sin(sim.tempo * 2.5) * 0.15 * (nome === 'asa-e' ? 1 : -1);
            }
          this.fx.emitir(
            'disco',
            '#355548',
            u.x + 0.3,
            0.43,
            u.z + 0.4,
            u.raio * 1.4,
            0.25,
            u.raio
          );
        }
      }
    }
    for (const [id, g] of this.entidades)
      if (!this.usados.has(id)) {
        this.cena.remove(g);
        this.entidades.delete(id);
        this.anteriores.delete(id);
      }
    for (const [id, m] of this.modelos)
      if (!this.usados.has(id)) {
        this.cena.remove(m);
        descartarModeloHeroiMoba(m);
        this.modelos.delete(id);
        this.definicoes.delete(id);
        this.anteriores.delete(id);
      }
    if (sim.tempo - this.fogTempo > 0.15 || sim.tempo < this.fogTempo) {
      this.fogTempo = sim.tempo;
      // Interpolação linear de 3 m suaviza a borda; entidades inimigas continuam ocultas pela simulação.
      for (let z = 0; z < 60; z++)
        for (let x = 0; x < 60; x++)
          this.fogDados[(z * 60 + x) * 4 + 3] = sim.visivel(local.time, -88.5 + x * 3, 88.5 - z * 3)
            ? 0
            : 133;
      this.fogTextura.needsUpdate = true;
    }
    for (const p of sim.projeteis.slice(0, 100))
      if (sim.visivel(local.time, p.x, p.z))
        this.fx.projetil(p, sim.tempo, sim.herois.find((h) => h.id === p.dono)?.defId);
    for (const e of sim.efeitos.slice(-64))
      if (sim.visivel(local.time, e.x, e.z)) this.fx.efeito(e, sim.tempo);
    for (const s of sim.sentinelas)
      if (s.time === local.time) {
        this.fx.emitir('cone', '#c7af77', s.x, 1, s.z, 0.4, 1.6, 0.4);
        this.fx.emitir('cristal', '#e5ffbd', s.x, 2, s.z, 0.5, 0.45, 0.35, 0, sim.tempo);
        this.fx.emitir('anel', '#a9e8be', s.x, 0.55, s.z, 1.1, 1, 1.1);
      }
    for (const u of [...sim.herois, ...sim.unidades, ...sim.estruturas]) {
      if (u.vida <= 0 || !(u.time === local.time || sim.visivel(local.time, u.x, u.z))) continue;
      const heroi = u.tipo === 'heroi',
        estrutura = 'ordem' in u,
        chefe = u.tipo === 'chefe',
        y = estrutura ? (u.tipo === 'torre' ? 8.4 : 9) : heroi ? 6.6 : chefe ? 8.4 : 3.7,
        largura = heroi ? 3.7 : estrutura ? 5 : chefe ? 5.5 : 2.5,
        v = Math.max(0.01, u.vida / u.vidaMax);
      this.fx.emitir('caixa', '#213c45', u.x, y, u.z, largura + 0.25, 0.43, 0.45);
      this.fx.emitir(
        'caixa',
        u.time === local.time ? '#7ee5ae' : u.time === 2 ? '#efd595' : '#f394ad',
        u.x - ((1 - v) * largura) / 2,
        y + 0.03,
        u.z,
        largura * v,
        0.28,
        0.52
      );
      if (heroi) {
        const h = u as import('./tipos').HeroiMoba;
        this.fx.emitir(
          'caixa',
          '#4daeea',
          u.x - ((1 - h.mana / h.manaMax) * largura) / 2,
          y - 0.31,
          u.z,
          largura * Math.max(0.01, h.mana / h.manaMax),
          0.11,
          0.38
        );
      }
      if ('controle' in u && u.controle > 0) {
        for (let i = 0; i < 3; i++) {
          const a = sim.tempo * 4 + (i * Math.PI * 2) / 3;
          this.fx.emitir(
            'estrela',
            '#ffe59b',
            u.x + Math.cos(a) * 0.8,
            y + 0.8,
            u.z + Math.sin(a) * 0.6,
            0.25,
            0.25,
            0.25,
            0,
            -a
          );
        }
      }
      if ('queimadura' in u && u.queimadura > 0)
        this.fx.emitir('cone', '#c5e179', u.x, 1, u.z, 0.65, 1.4, 0.65);
    }
    this.desenharMira(sim);
    this.fx.finalizar();
    this.renderer.render(this.cena, this.camera);
  }
  descartar() {
    if (this.descartado) return;
    this.descartado = true;
    for (const m of this.modelos.values()) descartarModeloHeroiMoba(m);
    if (this.previa) descartarModeloHeroiMoba(this.previa);
    this.cenario.descartar();
    this.fx.descartar();
    for (const r of this.recursos) r.dispose();
    this.recursos.clear();
    this.entidades.clear();
    this.modelos.clear();
    this.templates.clear();
    this.cena.clear();
    this.renderer.dispose();
  }
}
