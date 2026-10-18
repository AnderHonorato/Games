import * as T from 'three';
import { ROTAS_MOBA, BASES_MOBA, CAMPOS_MOBA, CHEFE_MOBA } from './rotas';
import { MOITAS_MOBA, OBSTACULOS_MOBA } from './terreno';
import { EsculturaMoba } from './geometria';

const COR = { pedra: '#aab8ac', sombra: '#355d5c', borda: '#415a66', ouro: '#d8b76c' };
/** Arena inteira em lotes fixos. O cenário visual lê os mesmos obstáculos da simulação. */
export class CenarioMoba {
  readonly grupo = new T.Group();
  private recursos: (T.BufferGeometry | T.Material)[] = [];
  private moitas: T.InstancedMesh;
  private agua: T.Mesh;
  private runas: T.Mesh[] = [];
  private m = new T.Matrix4();
  private pos = new T.Vector3();
  private q = new T.Quaternion();
  private s = new T.Vector3();
  private e = new T.Euler();
  private fases: { x: number; z: number; escala: number; fase: number }[] = [];
  constructor() {
    const caixa = new T.BoxGeometry(1, 1, 1),
      esfera = new T.IcosahedronGeometry(1, 1),
      disco = new T.CylinderGeometry(1, 1, 1, 16),
      cone = new T.ConeGeometry(1, 1, 7),
      cristal = new T.OctahedronGeometry(1),
      torus = new T.TorusGeometry(1, 0.09, 4, 20);
    const est = new EsculturaMoba();
    est.adicionar(caixa, '#29483f', 0, -2.4, 0, 188, 4, 188);
    est.adicionar(caixa, '#527b54', 0, -0.42, 0, 182, 0.6, 182);
    // Tapete de clareiras facetadas, sem texturas grandes nem objetos individuais.
    for (let i = 0; i < 135; i++) {
      const x = Math.sin(i * 67.13) * 87,
        z = Math.cos(i * 37.71) * 87;
      est.adicionar(
        disco,
        i % 3 ? '#59875b' : '#64895b',
        x,
        -0.08 + i * 0.0005,
        z,
        3 + (i % 5) * 1.4,
        0.03,
        3.2 + (i % 4),
        0,
        i * 1.3
      );
    }
    const trilha = (
      pontos: { x: number; z: number }[],
      largura: number,
      cor: string,
      y: number
    ) => {
      for (let i = 1; i < pontos.length; i++) {
        const a = pontos[i - 1],
          b = pontos[i],
          dx = b.x - a.x,
          dz = b.z - a.z;
        est.adicionar(
          caixa,
          cor,
          (a.x + b.x) / 2,
          y,
          (a.z + b.z) / 2,
          largura,
          0.1,
          Math.hypot(dx, dz) + 0.3,
          0,
          Math.atan2(dx, dz)
        );
        est.adicionar(disco, cor, a.x, y - 0.015, a.z, largura / 2, 0.1, largura / 2);
      }
    };
    // Leito atravessa a arena perpendicularmente à rota central.
    const rio = [
      { x: -90, z: -62 },
      { x: -57, z: -41 },
      { x: -27, z: -20 },
      { x: 0, z: 0 },
      { x: 28, z: 20 },
      { x: 59, z: 42 },
      { x: 90, z: 63 },
    ];
    trilha(rio, 17.5, '#345c63', -0.02);
    trilha(rio, 14, '#65b9b4', 0.02);
    for (const rota of ROTAS_MOBA) {
      trilha(rota, 11.8, '#456b57', 0.08);
      trilha(rota, 9.6, '#baa981', 0.14);
      trilha(rota, 7.9, '#d2c39a', 0.2);
      // Lajes e bordas desenham o trajeto que as tropas realmente percorrem.
      for (let j = 1; j < rota.length; j++) {
        const a = rota[j - 1],
          b = rota[j],
          n = Math.ceil(Math.hypot(b.x - a.x, b.z - a.z) / 5);
        for (let k = 0; k < n; k++) {
          const f = (k + 0.5) / n,
            x = a.x + (b.x - a.x) * f,
            z = a.z + (b.z - a.z) * f,
            ang = Math.atan2(b.x - a.x, b.z - a.z);
          est.adicionar(caixa, k % 2 ? '#c6b58e' : '#e2d2aa', x, 0.28, z, 6.8, 0.08, 0.2, 0, ang);
        }
      }
    }
    // A ponte central fica sobre o rio; parapeitos baixos deixam o combate legível.
    est.adicionar(caixa, '#adbaad', 0, 0.38, 0, 11, 0.5, 20, 0, Math.PI / 4);
    for (const lado of [-1, 1])
      for (let i = -2; i <= 2; i++) {
        const a = lado * 5.4,
          b = i * 3.9,
          x = (a + b) / Math.sqrt(2),
          z = (a - b) / Math.sqrt(2);
        est.adicionar(caixa, COR.borda, x, 1.15, z, 0.7, 1.3, 0.7);
        est.adicionar(cristal, lado < 0 ? '#a5eadd' : '#f3b5c5', x, 2.1, z, 0.4, 0.7, 0.4);
      }
    // Janelas de luz nas bases, degraus concêntricos e oito obeliscos de cada facção.
    BASES_MOBA.forEach((p, time) => {
      const cor = time === 0 ? '#74dfe2' : '#c487cb',
        clara = time === 0 ? '#d4fff1' : '#fae0e8';
      est.adicionar(disco, COR.borda, p.x, 0.2, p.z, 16, 0.7, 16);
      est.adicionar(disco, '#c8d0b7', p.x, 0.55, p.z, 14, 0.35, 14);
      est.adicionar(disco, time === 0 ? '#467f85' : '#6a567d', p.x, 0.78, p.z, 12.6, 0.12, 12.6);
      est.adicionar(disco, '#adc1b0', p.x, 0.85, p.z, 9.7, 0.12, 9.7);
      for (let i = 0; i < 12; i++) {
        const a = (i * Math.PI) / 6,
          x = p.x + Math.cos(a) * 13.6,
          z = p.z + Math.sin(a) * 13.6;
        est.adicionar(caixa, COR.borda, x, 1.2, z, 1.2, 1.6, 1.2, 0, -a);
        est.adicionar(cristal, cor, x, 2.9, z, 0.7, 1.2, 0.7, 0, a);
        if (i % 2 === 0)
          est.adicionar(
            caixa,
            clara,
            p.x + Math.cos(a) * 11.8,
            0.98,
            p.z + Math.sin(a) * 11.8,
            0.22,
            0.1,
            2.2,
            0,
            -a
          );
      }
      const g = torus.clone();
      g.rotateX(-Math.PI / 2);
      g.scale(10.4, 1, 10.4);
      const mat = new T.MeshBasicMaterial({
        color: cor,
        transparent: true,
        opacity: 0.75,
        depthWrite: false,
      });
      const r = new T.Mesh(g, mat);
      r.position.set(p.x, 1.02, p.z);
      this.grupo.add(r);
      this.runas.push(r);
      this.recursos.push(g, mat);
    });
    // Campos neutros possuem anéis e totens para serem reconhecidos à distância.
    for (const [i, p] of CAMPOS_MOBA.entries()) {
      est.adicionar(disco, '#3b6059', p.x, 0.13, p.z, 5.2, 0.1, 5.2);
      est.adicionar(
        disco,
        i % 3 === 0 ? '#789d88' : i % 3 === 1 ? '#8d8870' : '#6b8e9d',
        p.x,
        0.2,
        p.z,
        4.3,
        0.12,
        4.3
      );
      for (let k = 0; k < 3; k++) {
        const a = k * 2.1;
        est.adicionar(
          cristal,
          i % 3 === 0 ? '#a3d998' : i % 3 === 1 ? '#e9c286' : '#aadce2',
          p.x + Math.cos(a) * 4.3,
          1.1,
          p.z + Math.sin(a) * 4.3,
          0.4,
          0.95,
          0.4,
          0,
          a
        );
      }
    }
    const chefe = CHEFE_MOBA;
    est.adicionar(disco, '#365466', chefe.x, 0.2, chefe.z, 8, 0.3, 8);
    est.adicionar(disco, '#827196', chefe.x, 0.4, chefe.z, 6.8, 0.1, 6.8);
    for (let i = 0; i < 10; i++) {
      const a = (i * Math.PI) / 5;
      est.adicionar(
        cristal,
        '#c6a9e4',
        chefe.x + Math.cos(a) * 7.7,
        1.7,
        chefe.z + Math.sin(a) * 7.7,
        0.55,
        1.6,
        0.55,
        0,
        a
      );
    }
    // Colisores únicos compartilhados com a simulação: nunca inventar rochas bloqueando rotas.
    for (const [oi, o] of OBSTACULOS_MOBA.entries()) {
      est.adicionar(disco, '#3a654f', o.x, 0.1, o.z, o.raio * 1.25, 0.1, o.raio * 1.1);
      if (o.id.includes('ruina') || o.id.includes('arco')) {
        // Fragmentos de santuário com pilares e uma arcada quebrada.
        est.adicionar(disco, '#7b8e82', o.x, 0.7, o.z, o.raio, 0.9, o.raio * 0.85);
        for (const lado of [-1, 1]) {
          const x = o.x + lado * o.raio * 0.56;
          est.adicionar(
            caixa,
            '#acb7a2',
            x,
            o.altura * 0.48,
            o.z,
            o.raio * 0.38,
            o.altura * 0.85,
            o.raio * 0.5,
            0,
            oi * 0.2
          );
          est.adicionar(
            caixa,
            '#d3c9a5',
            x,
            o.altura * 0.9,
            o.z,
            o.raio * 0.55,
            0.45,
            o.raio * 0.65,
            0,
            oi * 0.2
          );
          est.adicionar(cristal, '#82cabc', x, o.altura + 1, o.z, 0.35, 0.65, 0.35);
        }
        est.adicionar(
          caixa,
          '#869888',
          o.x,
          o.altura * 0.8,
          o.z,
          o.raio * 1.65,
          0.7,
          o.raio * 0.42,
          0,
          0,
          0.05
        );
        est.adicionar(
          esfera,
          '#5e8463',
          o.x - o.raio * 0.4,
          1,
          o.z + o.raio * 0.4,
          o.raio * 0.6,
          0.5,
          o.raio * 0.45
        );
      } else {
        est.adicionar(
          esfera,
          '#597c75',
          o.x,
          o.altura * 0.42,
          o.z,
          o.raio,
          o.altura * 0.6,
          o.raio * 0.85,
          0,
          oi
        );
        est.adicionar(
          esfera,
          '#93a18a',
          o.x - o.raio * 0.2,
          o.altura * 0.8,
          o.z + 0.2,
          o.raio * 0.6,
          o.altura * 0.23,
          o.raio * 0.6,
          0,
          oi
        );
        for (let k = 0; k < 3; k++)
          est.adicionar(
            esfera,
            '#638c64',
            o.x + Math.cos(k * 2) * o.raio * 0.55,
            o.altura * 0.82,
            o.z + Math.sin(k * 2) * o.raio * 0.5,
            o.raio * 0.4,
            0.4,
            o.raio * 0.4
          );
      }
    }
    // Arvoredos apenas nas bordas e junto às rochas, liberando a área de leitura dos heróis.
    const arvores: { x: number; z: number; s: number }[] = [];
    for (let i = 0; i < 70; i++) {
      const lado = i % 4,
        t = -88 + Math.floor(i / 4) * 10.3;
      arvores.push({
        x: lado === 0 ? -88 : lado === 1 ? 88 : t,
        z: lado === 2 ? -88 : lado === 3 ? 88 : t,
        s: 0.8 + (i % 5) * 0.1,
      });
    }
    OBSTACULOS_MOBA.forEach((o, i) => {
      if (!o.id.includes('ruina') && !o.id.includes('arco')) {
        arvores.push({ x: o.x - o.raio * 0.3, z: o.z + 0.3, s: 0.78 });
        arvores.push({ x: o.x + o.raio * 0.38, z: o.z - o.raio * 0.2, s: 0.62 });
      }
    });
    for (const [i, p] of arvores.entries()) {
      est.adicionar(disco, '#315744', p.x + 0.8, 0.27, p.z + 0.7, 3 * p.s, 0.1, 2.2 * p.s);
      est.adicionar(cone, '#786d52', p.x, 1.7 * p.s, p.z, 0.5 * p.s, 3.4 * p.s, 0.5 * p.s);
      est.adicionar(
        esfera,
        i % 3 ? '#2f6d57' : '#45815b',
        p.x,
        5 * p.s,
        p.z,
        2.7 * p.s,
        3.3 * p.s,
        2.7 * p.s,
        0,
        i
      );
      est.adicionar(
        esfera,
        '#6c9c65',
        p.x - 0.6,
        6.4 * p.s,
        p.z - 0.4,
        1.8 * p.s,
        1.7 * p.s,
        1.8 * p.s,
        0,
        i
      );
    }
    // Flores e pequenas lanternas agrupadas na mesma geometria estática.
    for (let i = 0; i < 200; i++) {
      const x = Math.sin(i * 17.19) * 85,
        z = Math.cos(i * 31.71) * 85;
      if (
        Math.abs(x + z) < 12 ||
        OBSTACULOS_MOBA.some((o) => Math.hypot(o.x - x, o.z - z) < o.raio + 1)
      )
        continue;
      est.adicionar(cone, '#668f55', x, 0.42, z, 0.22, 0.8, 0.22, 0, i);
      if (i % 3 === 0)
        est.adicionar(esfera, i % 2 ? '#e3c4da' : '#f7e0a0', x, 0.9, z, 0.34, 0.18, 0.34);
    }
    const geom = est.finalizar(),
      mat = new T.MeshStandardMaterial({ vertexColors: true, roughness: 1 });
    this.grupo.add(new T.Mesh(geom, mat));
    this.recursos.push(geom, mat);
    // Água leve, animada pelo deslocamento de listras instanciadas, sem render target.
    const aguaGeo = new T.PlaneGeometry(218, 13, 1, 1);
    aguaGeo.rotateX(-Math.PI / 2);
    aguaGeo.rotateY(-Math.atan(0.7));
    const aguaMat = new T.MeshBasicMaterial({
      color: '#95eeeb',
      transparent: true,
      opacity: 0.14,
      depthWrite: false,
    });
    this.agua = new T.Mesh(aguaGeo, aguaMat);
    this.agua.position.y = 0.04;
    this.grupo.add(this.agua);
    this.recursos.push(aguaGeo, aguaMat);
    const folha = new T.ConeGeometry(0.35, 2, 3),
      folhaMat = new T.MeshStandardMaterial({ color: '#7ea65b', roughness: 1 });
    let quantidade = MOITAS_MOBA.length * 70;
    this.moitas = new T.InstancedMesh(folha, folhaMat, quantidade);
    this.moitas.frustumCulled = false;
    this.grupo.add(this.moitas);
    this.recursos.push(folha, folhaMat);
    for (const [mi, p] of MOITAS_MOBA.entries())
      for (let k = 0; k < 70; k++) {
        const a = k * 2.4,
          r = Math.sqrt((k + 0.5) / 70) * p.raio;
        this.fases.push({
          x: p.x + Math.cos(a) * r,
          z: p.z + Math.sin(a) * r,
          escala: 0.75 + (k % 5) * 0.16,
          fase: k * 0.6 + mi,
        });
      }
    for (const g of [caixa, esfera, disco, cone, cristal, torus]) g.dispose();
    this.atualizar(0);
  }
  atualizar(tempo: number) {
    for (let i = 0; i < this.fases.length; i++) {
      const f = this.fases[i];
      this.pos.set(f.x, 0.85 * f.escala, f.z);
      this.s.set(1.25, f.escala, 1.25);
      this.q.setFromEuler(
        this.e.set(
          Math.sin(tempo * 1.6 + f.fase) * 0.1,
          f.fase,
          Math.cos(tempo * 1.2 + f.fase) * 0.13
        )
      );
      this.m.compose(this.pos, this.q, this.s);
      this.moitas.setMatrixAt(i, this.m);
    }
    this.moitas.instanceMatrix.needsUpdate = true;
    (this.agua.material as T.MeshBasicMaterial).opacity = 0.12 + Math.sin(tempo * 0.7) * 0.035;
    for (const [i, r] of this.runas.entries()) r.rotation.y = tempo * (i === 0 ? 0.06 : -0.06);
  }
  descartar() {
    for (const r of this.recursos) r.dispose();
    this.recursos.length = 0;
    this.grupo.clear();
  }
}
