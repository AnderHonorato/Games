import * as T from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

/** Assa peças coloridas em uma única geometria, sem materiais por detalhe. */
export class EsculturaMoba {
  private pecas: T.BufferGeometry[] = [];
  private matriz = new T.Matrix4();
  private posicao = new T.Vector3();
  private escala = new T.Vector3();
  private quaternion = new T.Quaternion();
  private euler = new T.Euler();
  adicionar(
    geo: T.BufferGeometry,
    cor: string,
    x: number,
    y: number,
    z: number,
    sx = 1,
    sy = 1,
    sz = 1,
    rx = 0,
    ry = 0,
    rz = 0
  ): this {
    const g = geo.index ? geo.toNonIndexed() : geo.clone();
    this.posicao.set(x, y, z);
    this.escala.set(sx, sy, sz);
    this.quaternion.setFromEuler(this.euler.set(rx, ry, rz));
    this.matriz.compose(this.posicao, this.quaternion, this.escala);
    g.applyMatrix4(this.matriz);
    const c = new T.Color(cor),
      cores = new Float32Array(g.getAttribute('position').count * 3);
    for (let i = 0; i < cores.length; i += 3) {
      cores[i] = c.r;
      cores[i + 1] = c.g;
      cores[i + 2] = c.b;
    }
    g.setAttribute('color', new T.BufferAttribute(cores, 3));
    g.deleteAttribute('uv');
    this.pecas.push(g);
    return this;
  }
  finalizar(): T.BufferGeometry {
    const g = mergeGeometries(this.pecas, false) ?? new T.BufferGeometry();
    for (const p of this.pecas) p.dispose();
    this.pecas.length = 0;
    g.computeBoundingSphere();
    return g;
  }
}
