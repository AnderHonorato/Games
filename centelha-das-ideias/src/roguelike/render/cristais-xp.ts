/** Motes de energia: estrelas, fitas orbitais e runas, sem suporte físico. */
import * as THREE from 'three';

export const CORES_CRISTAIS_XP = ['#59e7b7', '#49c9ff', '#b28aff', '#ffc766'] as const;
const TAMANHOS = [0.34, 0.43, 0.53, 0.66];
const VOLTA = Math.PI * 2;
type Ponto = readonly [number, number, number];

function indice(tipo: number): number {
  return Number.isFinite(tipo) ? Math.max(0, Math.min(3, Math.floor(tipo))) : 0;
}

/** Construção única por lote; nenhum objeto de cena ou luz por coletável. */
function desenhoEnergia() {
  const pos: number[] = [];
  const cores: number[] = [];
  const triangulo = (a: Ponto, b: Ponto, c: Ponto, la: number, lb = la, lc = la) => {
    pos.push(...a, ...b, ...c);
    for (const luz of [la, lb, lc]) cores.push(luz * 0.9, luz * 0.96, luz);
  };
  const plano = (x: number, y: number, z: number, giro: number, inclinacao = 0): Ponto => {
    const altura = y * Math.cos(inclinacao) - z * Math.sin(inclinacao);
    const fundo = y * Math.sin(inclinacao) + z * Math.cos(inclinacao);
    return [
      x * Math.cos(giro) + fundo * Math.sin(giro),
      altura,
      -x * Math.sin(giro) + fundo * Math.cos(giro),
    ];
  };
  // A cor desvanece do centro à ponta: são raios de luz, sem faces minerais.
  const estrela = (
    raio: number,
    pontas: number,
    giro: number,
    inclinacao = 0,
    centro: Ponto = [0, 0, 0]
  ) => {
    const ponto = (a: number, r: number): Ponto => {
      const p = plano(Math.cos(a) * r, Math.sin(a) * r, 0, giro, inclinacao);
      return [p[0] + centro[0], p[1] + centro[1], p[2] + centro[2]];
    };
    for (let k = 0; k < pontas * 2; k++) {
      const a = (k * Math.PI) / pontas;
      const b = ((k + 1) * Math.PI) / pontas;
      triangulo(
        centro,
        ponto(a, k % 2 ? raio * 0.18 : raio),
        ponto(b, k % 2 ? raio : raio * 0.18),
        0.66,
        0.16,
        0.16
      );
    }
  };
  // Fita estreita afilada com intervalos: arco/runa suspenso, nunca aro no chão.
  const arco = (
    raio: number,
    inicio: number,
    comprimento: number,
    largura: number,
    giro: number,
    inclinacao: number,
    segmentos: number,
    runa = false
  ) => {
    const ponto = (a: number, r: number): Ponto =>
      plano(Math.cos(a) * r, Math.sin(a) * r, 0, giro, inclinacao);
    for (let k = 0; k < segmentos; k++) {
      if (runa && k % 5 === 4) continue;
      const a = inicio + (comprimento * k) / segmentos;
      const b = inicio + (comprimento * (k + 1)) / segmentos;
      const espessura = largura * (0.18 + 0.82 * Math.sin((Math.PI * (k + 0.5)) / segmentos));
      const brilho = 0.14 + (0.29 * k) / segmentos;
      const p = ponto(a, raio - espessura);
      const q = ponto(a, raio + espessura);
      const r = ponto(b, raio + espessura);
      const s = ponto(b, raio - espessura);
      triangulo(p, q, r, brilho * 0.55, brilho, brilho);
      triangulo(p, r, s, brilho * 0.55, brilho, brilho * 0.55);
    }
  };
  const geometria = () => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(cores, 3));
    geo.computeBoundingBox();
    geo.computeBoundingSphere();
    return geo;
  };
  return { estrela, arco, geometria };
}

/** Cada chamada possui sua geometria; descarte junto ao lote, sem cache global. */
export function geometriaCristalXp(tipo: number): THREE.BufferGeometry {
  const t = indice(tipo);
  const d = desenhoEnergia();
  if (t === 0) {
    d.estrela(0.8, 4, 0);
    d.estrela(0.65, 4, Math.PI / 2);
    d.arco(0.89, -0.4, Math.PI * 1.25, 0.045, 0.4, 0.55, 14);
  } else if (t === 1) {
    d.estrela(0.67, 6, 0.25);
    d.estrela(0.55, 4, Math.PI / 2);
    d.arco(0.94, -1.6, Math.PI * 1.65, 0.075, 0.45, 0.35, 20);
    d.estrela(0.16, 4, 0, 0, [0.78, 0.52, 0]);
  } else if (t === 2) {
    d.estrela(0.7, 4, 0);
    d.estrela(0.55, 4, Math.PI / 2);
    d.arco(0.96, 0, VOLTA, 0.055, 0.2, 0.38, 30, true);
    d.arco(0.76, 1.1, Math.PI * 1.45, 0.04, 1.25, 0.65, 16);
    d.estrela(0.17, 4, 0, 0, [-0.82, 0.52, 0.12]);
    d.estrela(0.13, 4, 0.6, 0, [0.75, -0.52, 0.2]);
  } else {
    d.estrela(0.82, 8, 0.1);
    d.estrela(0.6, 4, Math.PI / 2);
    d.arco(1.02, 0.2, Math.PI * 1.8, 0.06, 0.35, 0.6, 28, true);
    d.arco(0.89, -0.6, Math.PI * 1.7, 0.045, 1.7, -0.45, 22);
    for (let k = 0; k < 3; k++) {
      const a = (k * VOLTA) / 3 + 0.3;
      d.estrela(0.15, 4, a, 0, [Math.cos(a) * 1.08, Math.sin(a) * 0.9, 0]);
    }
  }
  return d.geometria();
}

/** Luz própria saturada; não depende do sol e não cria PointLights. */
export function materialCristalXp(_tipo: number): THREE.MeshBasicMaterial {
  return new THREE.MeshBasicMaterial({
    color: '#ffffff',
    vertexColors: true,
    transparent: true,
    opacity: 0.8,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
    toneMapped: false,
  });
}

/** Uma única geometria/material pode servir todas as faíscas instanciadas. */
export function geometriaFaiscaXp(): THREE.BufferGeometry {
  const d = desenhoEnergia();
  d.estrela(1, 4, 0);
  d.estrela(0.8, 4, Math.PI / 2);
  return d.geometria();
}

export function materialFaiscaXp(): THREE.MeshBasicMaterial {
  const mat = materialCristalXp(0);
  mat.opacity = 0.7;
  return mat;
}

export interface VisualCristalXp {
  escalaX: number;
  escalaY: number;
  escalaZ: number;
  y: number;
  rotacao: number;
  cor: (typeof CORES_CRISTAIS_XP)[number];
  halo: number;
  haloIntensidade: number;
  alfa: number;
  faiscaX: number;
  faiscaY: number;
  faiscaZ: number;
  faiscaEscala: number;
  faiscaIntensidade: number;
}

/** Passe um alvo reutilizável no loop de desenho para não alocar por mote/quadro. */
export function visualCristalXp(
  tipo: number,
  tempo: number,
  fase: number,
  alvo?: VisualCristalXp
): VisualCristalXp {
  const t = indice(tipo);
  const agora = Number.isFinite(tempo) ? tempo % (Math.PI * 200) : 0;
  const deslocamento = Number.isFinite(fase) ? fase % VOLTA : 0;
  const onda = Math.sin(agora * 2.2 + deslocamento);
  const tamanho = TAMANHOS[t];
  const orbita = agora * (1.8 - t * 0.13) + deslocamento;
  const v = alvo ?? ({} as VisualCristalXp);
  v.escalaX = tamanho * (1 + onda * 0.025);
  v.escalaY = tamanho * (1 + onda * 0.08);
  v.escalaZ = tamanho;
  v.y = 0.83 + t * 0.1 + onda * 0.11;
  v.rotacao = (agora * (0.72 - t * 0.07) + deslocamento) % VOLTA;
  v.cor = CORES_CRISTAIS_XP[t];
  v.halo = tamanho * (3.2 + onda * 0.16);
  v.haloIntensidade = 0.18 + t * 0.025 + onda * 0.025;
  v.alfa = 0.2 + (onda + 1) * 0.035;
  v.faiscaX = Math.cos(orbita) * tamanho * 1.25;
  v.faiscaY = Math.sin(orbita * 1.7) * tamanho * 0.75;
  v.faiscaZ = Math.sin(orbita) * tamanho * 1.25;
  v.faiscaEscala = (0.04 + t * 0.012) * (1 + Math.sin(orbita * 2.7) * 0.22);
  v.faiscaIntensidade = 0.62 + Math.sin(orbita * 2.7) * 0.18;
  return v;
}
