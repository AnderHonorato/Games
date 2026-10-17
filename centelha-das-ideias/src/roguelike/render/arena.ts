/**
 * A arena: uma grande clareira de ideias com grama ao vento, árvores, rochas,
 * formações de cristal que brilham à noite e uma borda de pilares de luz.
 */
import * as THREE from 'three';
import { criarAleatorio, hash2 } from '../../nucleo/aleatorio';
import {
  aplicarVento,
  gradienteToon,
  profundidadeComVento,
  toonNovo,
} from '../../render/materiais';

import type { IdMapa } from '../dados/mapas';

export const RAIO_ARENA = 105;

export interface Obstaculo {
  x: number;
  z: number;
  r: number;
  /** Altura sólida; ausência mantém o obstáculo bloqueando personagens voadores. */
  altura?: number;
}

export interface Arena {
  grupo: THREE.Group;
  obstaculos: Obstaculo[];
  /** Grade de obstáculos para consulta rápida. */
  obstaculosPerto(x: number, z: number): Obstaculo[];
  atualizar(dt: number, tempo: number, jx: number, jz: number, noite: number): void;
  descartar(): void;
}

export function criarArena(
  qualidade: 'alta' | 'media' | 'baixa',
  idMapa: IdMapa = 'jardim'
): Arena {
  if (idMapa !== 'jardim') return criarArenaMineral(qualidade, idMapa);
  return criarJardim(qualidade);
}

function criarJardim(qualidade: 'alta' | 'media' | 'baixa'): Arena {
  const grupo = new THREE.Group();
  const rnd = criarAleatorio(2026);

  // chão: disco com manchas de grama e trilhas de terra
  const aneis = qualidade === 'alta' ? 70 : qualidade === 'media' ? 48 : 30;
  const segs = qualidade === 'alta' ? 160 : 96;
  const pos: number[] = [];
  const cor: number[] = [];
  const idx: number[] = [];
  const c1 = new THREE.Color('#79c26a');
  const c2 = new THREE.Color('#a6d86d');
  const terra = new THREE.Color('#d1b07f');
  const tmp = new THREE.Color();
  pos.push(0, 0, 0);
  cor.push(c1.r, c1.g, c1.b);
  for (let a = 1; a <= aneis; a++) {
    for (let k = 0; k < segs; k++) {
      const ang = (k / segs) * Math.PI * 2;
      const r = (a / aneis) * (RAIO_ARENA + 14);
      const x = Math.cos(ang) * r;
      const z = Math.sin(ang) * r;
      pos.push(x, 0, z);
      const n =
        hash2(Math.floor(x / 4), Math.floor(z / 4), 1) * 0.6 +
        hash2(Math.floor(x / 1.5), Math.floor(z / 1.5), 2) * 0.4;
      tmp.copy(c1).lerp(c2, n);
      // trilhas de terra em espiral
      const trilha = Math.abs(Math.sin(ang * 3 + r * 0.06)) < 0.06 && r > 8;
      if (trilha) tmp.lerp(terra, 0.75);
      if (r > RAIO_ARENA) tmp.lerp(new THREE.Color('#8f86b8'), Math.min(1, (r - RAIO_ARENA) / 10));
      cor.push(tmp.r, tmp.g, tmp.b);
    }
  }
  for (let k = 0; k < segs; k++) idx.push(0, 1 + ((k + 1) % segs), 1 + k);
  for (let a = 1; a < aneis; a++) {
    const b0 = 1 + (a - 1) * segs;
    const b1 = 1 + a * segs;
    for (let k = 0; k < segs; k++) {
      const k2 = (k + 1) % segs;
      idx.push(b0 + k, b0 + k2, b1 + k, b0 + k2, b1 + k2, b1 + k);
    }
  }
  const geoChao = new THREE.BufferGeometry();
  geoChao.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geoChao.setAttribute('color', new THREE.Float32BufferAttribute(cor, 3));
  geoChao.setIndex(idx);
  geoChao.computeVertexNormals();
  const chao = new THREE.Mesh(
    geoChao,
    new THREE.MeshToonMaterial({ vertexColors: true, gradientMap: gradienteToon() })
  );
  chao.receiveShadow = true;
  grupo.add(chao);

  // obstáculos: árvores e rochas
  const obstaculos: Obstaculo[] = [];
  const arvores: { x: number; z: number; e: number; tipo: number }[] = [];
  const rochas: { x: number; z: number; r: number }[] = [];
  const livre = (x: number, z: number, r: number) =>
    Math.hypot(x, z) > 9 && obstaculos.every((o) => Math.hypot(o.x - x, o.z - z) > o.r + r + 2.2);
  for (let i = 0; i < 1400 && arvores.length < 170; i++) {
    const a = rnd() * Math.PI * 2;
    const d = Math.sqrt(rnd()) * (RAIO_ARENA - 4);
    const x = Math.cos(a) * d;
    const z = Math.sin(a) * d;
    const e = 0.8 + rnd() * 0.7;
    if (!livre(x, z, 0.5 * e)) continue;
    arvores.push({ x, z, e, tipo: rnd() < 0.3 ? 1 : 0 });
    obstaculos.push({ x, z, r: 0.45 * e, altura: 4.5 * e });
  }
  for (let i = 0; i < 800 && rochas.length < 90; i++) {
    const a = rnd() * Math.PI * 2;
    const d = Math.sqrt(rnd()) * (RAIO_ARENA - 4);
    const x = Math.cos(a) * d;
    const z = Math.sin(a) * d;
    const r = 0.6 + rnd() * 1.3;
    if (!livre(x, z, r)) continue;
    rochas.push({ x, z, r });
    obstaculos.push({ x, z, r: r * 0.9, altura: r * 1.05 });
  }

  const m4 = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const vv = new THREE.Vector3();
  const ss = new THREE.Vector3();
  const eixoY = new THREE.Vector3(0, 1, 0);

  const ventoTronco = { flex: 0.012, vazar: true };
  const ventoCopa = { flex: 0.045, absoluta: true, vazar: true };
  const geoTronco = new THREE.CylinderGeometry(0.22, 0.34, 3, 7);
  geoTronco.translate(0, 1.5, 0);
  const troncos = new THREE.InstancedMesh(
    geoTronco,
    aplicarVento(toonNovo('#8a5a3b'), ventoTronco),
    arvores.length
  );
  troncos.customDepthMaterial = profundidadeComVento({ flex: 0.012 });
  troncos.castShadow = true;
  const copasDados: { m: THREE.Matrix4; c: THREE.Color }[] = [];
  arvores.forEach((a, i) => {
    q.setFromAxisAngle(eixoY, rnd() * Math.PI * 2);
    m4.compose(vv.set(a.x, 0, a.z), q, ss.set(a.e, a.e, a.e));
    troncos.setMatrixAt(i, m4);
    const tons =
      a.tipo === 1 ? ['#c58bff', '#a46fe0', '#d9b0ff'] : ['#5fae5a', '#7cc56b', '#4f9a4a'];
    for (const [bx, by, bz, br] of [
      [0, 3.6, 0, 1.55],
      [0.85, 3.0, 0.3, 1.1],
      [-0.75, 3.1, -0.3, 1.15],
      [0.1, 4.5, -0.2, 0.95],
    ]) {
      const off = new THREE.Vector3(bx * a.e, by * a.e, bz * a.e).applyQuaternion(q);
      copasDados.push({
        m: new THREE.Matrix4().compose(
          new THREE.Vector3(a.x + off.x, off.y, a.z + off.z),
          q,
          new THREE.Vector3(br * a.e, br * a.e * 0.9, br * a.e)
        ),
        c: new THREE.Color(tons[Math.floor(rnd() * 3)]).multiplyScalar(0.9 + rnd() * 0.2),
      });
    }
  });
  const copas = new THREE.InstancedMesh(
    new THREE.IcosahedronGeometry(1, 1),
    aplicarVento(toonNovo('#ffffff'), ventoCopa),
    copasDados.length
  );
  copas.customDepthMaterial = profundidadeComVento({ flex: 0.045, absoluta: true });
  copasDados.forEach((d, i) => {
    copas.setMatrixAt(i, d.m);
    copas.setColorAt(i, d.c);
  });
  copas.castShadow = true;
  grupo.add(troncos, copas);

  const geoRocha = new THREE.DodecahedronGeometry(1, 0);
  const rochasM = new THREE.InstancedMesh(geoRocha, toonNovo('#a59a8c'), rochas.length);
  rochas.forEach((r, i) => {
    q.setFromEuler(new THREE.Euler(rnd(), rnd() * 6, rnd()));
    m4.compose(vv.set(r.x, r.r * 0.3, r.z), q, ss.set(r.r, r.r * 0.75, r.r));
    rochasM.setMatrixAt(i, m4);
  });
  rochasM.castShadow = true;
  rochasM.receiveShadow = true;
  grupo.add(rochasM);

  // formações de cristal decorativas (brilham mais à noite)
  const matCristal = new THREE.MeshToonMaterial({
    color: '#9df0ff',
    gradientMap: gradienteToon(),
    emissive: '#2a6a7a',
    transparent: true,
    opacity: 0.92,
  });
  const cristais = new THREE.InstancedMesh(new THREE.ConeGeometry(1, 1, 5), matCristal, 130);
  let nCristais = 0;
  cristais.castShadow = true;
  for (let i = 0; i < 26; i++) {
    const a = rnd() * Math.PI * 2;
    const d = 15 + rnd() * (RAIO_ARENA - 20);
    const x = Math.cos(a) * d;
    const z = Math.sin(a) * d;
    if (!livre(x, z, 1.5)) continue;
    for (let k = 0; k < 5; k++) {
      const h = 1 + rnd() * 2.2;
      const r = 0.35 + rnd() * 0.3;
      vv.set(x + (rnd() - 0.5) * 1.6, h / 2, z + (rnd() - 0.5) * 1.6);
      q.setFromEuler(new THREE.Euler((rnd() - 0.5) * 0.6, rnd() * 3, (rnd() - 0.5) * 0.6));
      m4.compose(vv, q, ss.set(r, h, r));
      cristais.setMatrixAt(nCristais++, m4);
    }
    obstaculos.push({ x, z, r: 1.2 });
  }

  cristais.count = nCristais;
  grupo.add(cristais);

  // borda: pilares de luz e névoa
  const matPilar = new THREE.MeshBasicMaterial({
    color: '#ffe9a8',
    transparent: true,
    opacity: 0.5,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const pilares = new THREE.InstancedMesh(
    new THREE.CylinderGeometry(0.5, 0.9, 14, 8, 1, true),
    matPilar,
    48
  );
  for (let i = 0; i < 48; i++) {
    const a = (i / 48) * Math.PI * 2;
    m4.makeTranslation(Math.cos(a) * (RAIO_ARENA + 1.5), 7, Math.sin(a) * (RAIO_ARENA + 1.5));
    pilares.setMatrixAt(i, m4);
  }
  grupo.add(pilares);
  const muro = new THREE.Mesh(
    new THREE.CylinderGeometry(RAIO_ARENA + 1.5, RAIO_ARENA + 1.5, 3, 96, 1, true),
    new THREE.MeshBasicMaterial({
      color: '#ffe9a8',
      transparent: true,
      opacity: 0.12,
      side: THREE.DoubleSide,
      depthWrite: false,
    })
  );
  muro.position.y = 1.5;
  grupo.add(muro);

  // grama ao redor do jogador (janela que acompanha)
  const CEL = 0.9;
  const RAIO_GRAMA = qualidade === 'alta' ? 24 : qualidade === 'media' ? 18 : 12;
  const geoTufo = (() => {
    const p: number[] = [];
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2 + 0.3;
      const ox = Math.cos(a) * 0.09;
      const oz = Math.sin(a) * 0.09;
      const h = 0.3 + (i % 3) * 0.09;
      const w = 0.05;
      p.push(
        ox - Math.sin(a) * w,
        0,
        oz + Math.cos(a) * w,
        ox + Math.sin(a) * w,
        0,
        oz - Math.cos(a) * w,
        ox + Math.cos(a) * 0.08,
        h,
        oz + Math.sin(a) * 0.08
      );
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3));
    g.computeVertexNormals();
    return g;
  })();
  const capGrama = Math.ceil(Math.PI * (RAIO_GRAMA / CEL) ** 2) + 50;
  const grama = new THREE.InstancedMesh(
    geoTufo,
    aplicarVento(
      new THREE.MeshToonMaterial({ gradientMap: gradienteToon(), side: THREE.DoubleSide }),
      { flex: 2.4, pisada: true }
    ),
    capGrama
  );
  grama.frustumCulled = false;
  grama.receiveShadow = true;
  grupo.add(grama);
  let ultimaCelX = Infinity;
  let ultimaCelZ = Infinity;
  const corT = new THREE.Color();
  const reposicionarGrama = (jx: number, jz: number) => {
    const cx = Math.round(jx / CEL);
    const cz = Math.round(jz / CEL);
    if (cx === ultimaCelX && cz === ultimaCelZ) return;
    ultimaCelX = cx;
    ultimaCelZ = cz;
    const r = Math.ceil(RAIO_GRAMA / CEL);
    let n = 0;
    for (let i = -r; i <= r; i++) {
      for (let k = -r; k <= r; k++) {
        if (i * i + k * k > r * r || n >= capGrama) continue;
        const gx = cx + i;
        const gz = cz + k;
        const h = hash2(gx, gz, 7);
        if (h < 0.35) continue;
        const x = gx * CEL + (hash2(gx, gz, 8) - 0.5) * CEL;
        const z = gz * CEL + (hash2(gx, gz, 9) - 0.5) * CEL;
        if (Math.hypot(x, z) > RAIO_ARENA) continue;
        const s = 0.7 + hash2(gx, gz, 10) * 0.9;
        q.setFromAxisAngle(eixoY, h * 20);
        m4.compose(vv.set(x, 0, z), q, ss.set(s, s * (0.8 + h * 0.5), s));
        grama.setMatrixAt(n, m4);
        corT
          .copy(c1)
          .lerp(c2, hash2(gx, gz, 11))
          .multiplyScalar(0.85 + h * 0.25);
        grama.setColorAt(n, corT);
        n++;
      }
    }
    grama.count = n;
    grama.instanceMatrix.needsUpdate = true;
    if (grama.instanceColor) grama.instanceColor.needsUpdate = true;
  };

  // grade de obstáculos
  const TAM = 6;
  const grade = new Map<string, Obstaculo[]>();
  for (const o of obstaculos) {
    const gx0 = Math.floor((o.x - o.r) / TAM);
    const gx1 = Math.floor((o.x + o.r) / TAM);
    const gz0 = Math.floor((o.z - o.r) / TAM);
    const gz1 = Math.floor((o.z + o.r) / TAM);
    for (let gx = gx0; gx <= gx1; gx++)
      for (let gz = gz0; gz <= gz1; gz++) {
        const k = `${gx},${gz}`;
        let l = grade.get(k);
        if (!l) grade.set(k, (l = []));
        l.push(o);
      }
  }
  const vazio: Obstaculo[] = [];

  const descartar = descarteArena(grupo);
  return {
    descartar,
    grupo,
    obstaculos,
    obstaculosPerto(x, z) {
      return grade.get(`${Math.floor(x / TAM)},${Math.floor(z / TAM)}`) ?? vazio;
    },
    atualizar(_dt, tempo, jx, jz, noite) {
      reposicionarGrama(jx, jz);
      matCristal.emissive.setRGB(0.15 + noite * 0.35, 0.4 + noite * 0.5, 0.48 + noite * 0.5);
      matPilar.opacity = 0.35 + Math.sin(tempo * 1.5) * 0.08 + noite * 0.25;
    },
  };
}

/** Todos os recursos de uma arena pertencem a ela; a rampa toon é global. */
function descarteArena(grupo: THREE.Group): () => void {
  let descartada = false;
  return () => {
    if (descartada) return;
    descartada = true;
    const geometrias = new Set<THREE.BufferGeometry>();
    const materiais = new Set<THREE.Material>();
    grupo.traverse((o) => {
      if (!(o instanceof THREE.Mesh)) return;
      geometrias.add(o.geometry);
      for (const m of Array.isArray(o.material) ? o.material : [o.material]) materiais.add(m);
      if (o.customDepthMaterial) materiais.add(o.customDepthMaterial);
      if (o.customDistanceMaterial) materiais.add(o.customDistanceMaterial);
      if (o instanceof THREE.InstancedMesh) o.dispose();
    });
    for (const g of geometrias) g.dispose();
    // Material.dispose não descarta texturas: preserva gradienteToon compartilhado.
    for (const m of materiais) m.dispose();
    grupo.clear();
    grupo.removeFromParent();
  };
}

/** Plataformas niveladas sobre piso contínuo: a física continua fiel ao desenho. */
function criarArenaMineral(qualidade: 'alta' | 'media' | 'baixa', id: 'forja' | 'abismo'): Arena {
  const forja = id === 'forja';
  const grupo = new THREE.Group();
  grupo.name = `arena-${id}`;
  const rnd = criarAleatorio(forja ? 731 : 1903);
  const obstaculos: Obstaculo[] = [];
  const m = new THREE.Matrix4();
  const pos = new THREE.Vector3();
  const q = new THREE.Quaternion();
  const escala = new THREE.Vector3();
  const eixo = new THREE.Vector3(0, 1, 0);
  type Instancia = [number, number, number, number, number, number, number?];
  const lote = (
    nome: string,
    geo: THREE.BufferGeometry,
    mat: THREE.Material,
    dados: Instancia[],
    sombra = false
  ) => {
    const malha = new THREE.InstancedMesh(geo, mat, dados.length);
    malha.name = nome;
    for (let i = 0; i < dados.length; i++) {
      const [x, y, z, sx, sy, sz, a = 0] = dados[i];
      q.setFromAxisAngle(eixo, a);
      m.compose(pos.set(x, y, z), q, escala.set(sx, sy, sz));
      malha.setMatrixAt(i, m);
    }
    malha.castShadow = sombra;
    malha.receiveShadow = true;
    grupo.add(malha);
    return malha;
  };
  const piso = new THREE.Mesh(
    new THREE.CylinderGeometry(
      RAIO_ARENA + 14,
      RAIO_ARENA + 14,
      1,
      qualidade === 'baixa' ? 64 : 112
    ),
    toonNovo(forja ? '#383741' : '#24283c')
  );
  piso.name = 'piso-continuo';
  piso.position.y = -0.52; // superfície em -0,02 m, nunca um buraco atravessável.
  piso.receiveShadow = true;
  grupo.add(piso);

  const plataformas: Instancia[] = [];
  const caminhos: Instancia[] = [];
  const fendas: Instancia[] = [];
  const pilares: Instancia[] = [];
  const adornos: Instancia[] = [];
  const rebites: Instancia[] = [];
  const borda: Instancia[] = [];
  const materialBrilho = new THREE.MeshToonMaterial({
    color: forja ? '#ffab39' : '#aa9bff',
    emissive: forja ? '#ff480f' : '#5336bb',
    emissiveIntensity: 0.8,
    gradientMap: gradienteToon(),
  });

  if (forja) {
    // Chapas quadradas, faixas de metal rebitado, lava sob tampas de vidro/grade.
    for (let x = -96; x <= 96; x += 16)
      for (let z = -96; z <= 96; z += 16) {
        if (Math.hypot(x, z) > RAIO_ARENA - 7) continue;
        plataformas.push([x, -0.21, z, 15.5, 0.4, 15.5]);
        rebites.push(
          [x - 6.6, 0.025, z - 6.6, 0.18, 0.06, 0.18],
          [x + 6.6, 0.025, z + 6.6, 0.18, 0.06, 0.18]
        );
      }
    for (const x of [-56, -24, 24, 56]) {
      fendas.push([x, 0.008, 0, 2.1, 0.016, 170]);
      // Uma grade rasa em toda a extensão deixa claro que se pode andar sobre ela.
      for (let z = -84; z <= 84; z += 2.8) caminhos.push([x, 0.025, z, 2.5, 0.035, 0.24]);
      for (const z of [-48, 0, 48]) {
        caminhos.push([x, 0.035, z, 8, 0.05, 5]);
        rebites.push([x, 0.075, z - 2, 7, 0.03, 0.16], [x, 0.075, z + 2, 7, 0.03, 0.16]);
      }
    }
    for (let i = 0; i < 48; i++) {
      const ang = i * 2.39996;
      const r = 18 + Math.sqrt(i / 48) * 77;
      const x = Math.cos(ang) * r,
        z = Math.sin(ang) * r;
      // Pilares longe dos corredores e do ponto inicial.
      if ([-56, -24, 24, 56].some((f) => Math.abs(x - f) < 5)) continue;
      const h = 3.5 + rnd() * 3;
      pilares.push([x, h / 2, z, 1.6, h, 1.6]);
      adornos.push([x, h + 0.08, z, 2, 0.18, 2], [x, 0.2, z, 2, 0.4, 2]);
      obstaculos.push({ x, z, r: 1.65 });
    }
    lote('plataformas-de-aco', new THREE.BoxGeometry(1, 1, 1), toonNovo('#666572'), plataformas);
    lote('lava-selada', new THREE.BoxGeometry(1, 1, 1), materialBrilho, fendas);
    lote('pontes-e-grades', new THREE.BoxGeometry(1, 1, 1), toonNovo('#8898a3'), caminhos);
    lote('rebites-mecanicos', new THREE.BoxGeometry(1, 1, 1), toonNovo('#d5b66d'), rebites);
    lote(
      'pilares-da-forja',
      new THREE.CylinderGeometry(1, 1, 1, 8),
      toonNovo('#454854'),
      pilares,
      true
    );
    lote(
      'coroas-dos-pilares',
      new THREE.CylinderGeometry(1, 1, 1, 8),
      toonNovo('#c58343'),
      adornos
    );
  } else {
    // Ilhas de basalto niveladas se projetam para baixo; passarelas ligam seus topos.
    plataformas.push([0, -0.51, 0, 17, 1, 17]);
    for (let i = 0; i < 18; i++) {
      const ang = i * 2.39996,
        r = 26 + Math.sqrt(i / 18) * 65;
      const x = Math.cos(ang) * r,
        z = Math.sin(ang) * r,
        raio = 8 + rnd() * 6;
      plataformas.push([x, -0.61, z, raio, 1.2, raio, ang]);
      caminhos.push([x / 2, -0.05, z / 2, 4, 0.1, r, -ang + Math.PI / 2]);
    }
    for (let i = 0; i < 62; i++) {
      const ang = rnd() * Math.PI * 2,
        r = 17 + Math.sqrt(rnd()) * 80;
      const x = Math.cos(ang) * r,
        z = Math.sin(ang) * r;
      const raio = i % 3 === 0 ? 1.65 : 0.9;
      if (obstaculos.some((o) => Math.hypot(o.x - x, o.z - z) < o.r + raio + 3)) continue;
      if (i % 3 === 0) {
        const h = 5 + rnd() * 5;
        pilares.push([x, h / 2, z, 1.5, h, 1.5, ang]);
        adornos.push([x, h * 0.7, z, 1.52, 0.18, 1.52, ang]);
      } else {
        for (let k = 0; k < 3; k++) {
          const h = 1.3 + rnd() * 2.5;
          rebites.push([x + (k - 1) * 0.4, h / 2, z, 0.35, h, 0.35, k]);
        }
      }
      obstaculos.push({ x, z, r: raio });
    }
    lote(
      'ilhas-de-basalto',
      new THREE.CylinderGeometry(1, 1.1, 1, 7),
      toonNovo('#41465d'),
      plataformas
    );
    lote('passarelas-de-pedra', new THREE.BoxGeometry(1, 1, 1), toonNovo('#5c607b'), caminhos);
    lote('monolitos-dos-ecos', new THREE.BoxGeometry(1, 1, 1), toonNovo('#202538'), pilares, true);
    lote('runas-dos-monolitos', new THREE.BoxGeometry(1, 1, 1), materialBrilho, adornos);
    lote('cristais-do-abismo', new THREE.ConeGeometry(1, 1, 5), materialBrilho, rebites, true);
    // Névoa baixa e translúcida sobre o piso; abismos abertos só além da borda física.
    const nevoa: Instancia[] = [];
    for (let i = 0; i < (qualidade === 'baixa' ? 8 : 16); i++) {
      const a = i * 2.4,
        r = 40 + i * 3;
      nevoa.push([Math.cos(a) * r, 0.13, Math.sin(a) * r, 14, 0.1, 8, a]);
    }
    lote(
      'nevoa-dos-ecos',
      new THREE.SphereGeometry(1, 12, 6),
      new THREE.MeshBasicMaterial({
        color: '#a294e8',
        transparent: true,
        opacity: 0.065,
        depthWrite: false,
      }),
      nevoa
    );
  }

  for (let i = 0; i < 48; i++) {
    const a = (i / 48) * Math.PI * 2;
    borda.push([
      Math.cos(a) * (RAIO_ARENA + 2),
      2.5,
      Math.sin(a) * (RAIO_ARENA + 2),
      0.35,
      5,
      0.35,
    ]);
  }
  lote('balizas-da-borda', new THREE.CylinderGeometry(1, 1, 1, 6), materialBrilho, borda);
  const parede = new THREE.Mesh(
    new THREE.CylinderGeometry(RAIO_ARENA + 1.5, RAIO_ARENA + 1.5, 2.5, 96, 1, true),
    new THREE.MeshBasicMaterial({
      color: forja ? '#ff8a39' : '#9d8ee9',
      transparent: true,
      opacity: 0.12,
      depthWrite: false,
      side: THREE.DoubleSide,
    })
  );
  parede.position.y = 1.25;
  grupo.add(parede);

  const grade = new Map<string, Obstaculo[]>();
  for (const o of obstaculos)
    for (let x = Math.floor((o.x - o.r) / 6); x <= Math.floor((o.x + o.r) / 6); x++)
      for (let z = Math.floor((o.z - o.r) / 6); z <= Math.floor((o.z + o.r) / 6); z++) {
        const chave = `${x},${z}`;
        const celula = grade.get(chave);
        if (celula) celula.push(o);
        else grade.set(chave, [o]);
      }
  const vazio: Obstaculo[] = [];
  return {
    grupo,
    obstaculos,
    obstaculosPerto(x, z) {
      return grade.get(`${Math.floor(x / 6)},${Math.floor(z / 6)}`) ?? vazio;
    },
    atualizar(_dt, tempo, _jx, _jz, noite) {
      materialBrilho.emissiveIntensity = 0.65 + noite * 0.5 + Math.sin(tempo * 1.7) * 0.12;
    },
    descartar: descarteArena(grupo),
  };
}
