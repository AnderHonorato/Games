/** Piso infinito e regiões regeneráveis, com lotes de desenho de tamanho fixo. */
import * as THREE from 'three';
import { hash2 } from '../../nucleo/aleatorio';
import { aplicarVento, gradienteToon, toonNovo } from '../../render/materiais';
import type { IdMapa } from '../dados/mapas';
import {
  LIMITE_REGIOES,
  MundoContinuo,
  type PosicaoMundo,
  type PontoExploracao,
  type QualidadeMundo,
  type RegiaoMundo,
} from '../mundo-continuo/geracao-mundo';

/** Referência histórica da clareira inicial; não é uma fronteira física. */
export const RAIO_ARENA = 105;
export interface Obstaculo {
  x: number;
  z: number;
  r: number;
  altura?: number;
}
export interface Arena {
  grupo: THREE.Group;
  obstaculos: Obstaculo[];
  readonly infinito: true;
  obstaculosPerto(x: number, z: number): Obstaculo[];
  atualizar(
    dt: number,
    tempo: number,
    jx: number,
    jz: number,
    noite: number,
    jogadores?: readonly PosicaoMundo[]
  ): void;
  regioesAtivas(): readonly RegiaoMundo[];
  pontosExploracao(): readonly PontoExploracao[];
  estadoMundo(): { regioes: number; obstaculos: number; recursos: number; limiteRegioes: number };
  descartar(): void;
}
const PALETAS: Record<
  IdMapa,
  { chao: string; trilha: string; tronco: string; copa: string; rocha: string; cristal: string }
> = {
  jardim: {
    chao: '#79bd68',
    trilha: '#c6ad79',
    tronco: '#885b43',
    copa: '#5a9c63',
    rocha: '#9e9b91',
    cristal: '#a879ef',
  },
  forja: {
    chao: '#383741',
    trilha: '#666572',
    tronco: '#454854',
    copa: '#c58343',
    rocha: '#8898a3',
    cristal: '#ff772d',
  },
  abismo: {
    chao: '#24283c',
    trilha: '#41465d',
    tronco: '#202538',
    copa: '#665583',
    rocha: '#5c607b',
    cristal: '#ac8bff',
  },
  aurora: {
    chao: '#ccdde6',
    trilha: '#90b9ca',
    tronco: '#526778',
    copa: '#c8f2f4',
    rocha: '#91b5ca',
    cristal: '#6a95f5',
  },
  coral: {
    chao: '#a2d7d0',
    trilha: '#e7d7ac',
    tronco: '#dc74a8',
    copa: '#ffacd1',
    rocha: '#e9d8c1',
    cristal: '#7b63d9',
  },
};

export function criarArena(qualidade: QualidadeMundo, idMapa: IdMapa = 'jardim'): Arena {
  const grupo = new THREE.Group();
  grupo.name = `mundo-continuo-${idMapa}`;
  const mundo = new MundoContinuo(qualidade, idMapa);
  const cores = PALETAS[idMapa];
  const mineral = idMapa === 'forja' || idMapa === 'abismo';
  const neve = idMapa === 'aurora';
  const coral = idMapa === 'coral';
  const obstaculos: Obstaculo[] = [];
  let regioes: RegiaoMundo[] = [],
    pontos: PontoExploracao[] = [];
  const grade = new Map<string, Obstaculo[]>(),
    vazio: Obstaculo[] = [];
  const geometrias = new Set<THREE.BufferGeometry>(),
    materiais = new Set<THREE.Material>();
  const matrizes = new THREE.Matrix4(),
    pos = new THREE.Vector3(),
    escala = new THREE.Vector3();
  const q = new THREE.Quaternion(),
    eixo = new THREE.Vector3(0, 1, 0),
    cor = new THREE.Color();
  const lotes: THREE.InstancedMesh[] = [];
  const lote = (
    nome: string,
    geo: THREE.BufferGeometry,
    mat: THREE.Material,
    cap: number,
    sombra = false
  ) => {
    geometrias.add(geo);
    materiais.add(mat);
    const malha = new THREE.InstancedMesh(geo, mat, cap);
    malha.name = nome;
    malha.count = 0;
    malha.castShadow = sombra && qualidade !== 'baixa';
    malha.receiveShadow = true;
    // As posições mudam ao trocar regiões; não reutilizar uma bounding sphere antiga.
    malha.frustumCulled = false;
    malha.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    grupo.add(malha);
    lotes.push(malha);
    return malha;
  };
  const por = (
    l: THREE.InstancedMesh,
    x: number,
    y: number,
    z: number,
    sx: number,
    sy: number,
    sz: number,
    giro = 0,
    tom?: string
  ) => {
    if (l.count >= l.instanceMatrix.count) return;
    q.setFromAxisAngle(eixo, giro);
    matrizes.compose(pos.set(x, y, z), q, escala.set(sx, sy, sz));
    l.setMatrixAt(l.count, matrizes);
    if (tom) l.setColorAt(l.count, cor.set(tom));
    l.count++;
  };
  const capacidade = LIMITE_REGIOES * 9;
  const cubo = new THREE.BoxGeometry(1, 1, 1);
  const pisoGeo = new THREE.PlaneGeometry(1, 1);
  pisoGeo.rotateX(-Math.PI / 2);
  const pisoMat = toonNovo(cores.chao);
  // Fundo nivelado acompanha a câmera enquanto os detalhes chegam em pequenos lotes.
  const piso = new THREE.Mesh(pisoGeo, pisoMat);
  piso.name = 'piso-continuo';
  piso.scale.set(512, 1, 512);
  piso.position.y = -0.045;
  piso.receiveShadow = true;
  grupo.add(piso);
  geometrias.add(pisoGeo);
  materiais.add(pisoMat);
  const chao = lote('regioes-do-piso', pisoGeo, pisoMat, LIMITE_REGIOES);
  const trilhas = lote(
    mineral ? 'plataformas-e-passarelas' : coral ? 'bancos-de-areia' : 'trilhas-do-bioma',
    cubo,
    toonNovo(cores.trilha),
    LIMITE_REGIOES * 6
  );
  const troncos = lote(
    mineral ? 'monolitos-e-pilares' : coral ? 'ramos-de-coral' : 'troncos-do-bioma',
    mineral ? cubo : new THREE.CylinderGeometry(0.65, 1, 1, 6),
    toonNovo(cores.tronco),
    capacidade * 3,
    true
  );
  const copas = lote(
    mineral
      ? 'coroas-e-runas'
      : neve
        ? 'copas-nevadas'
        : coral
          ? 'corais-vivos'
          : 'copas-do-jardim',
    mineral ? cubo : neve ? new THREE.ConeGeometry(1, 1, 7) : new THREE.IcosahedronGeometry(1, 1),
    mineral
      ? toonNovo(cores.copa)
      : aplicarVento(toonNovo('#ffffff'), { flex: 0.035, absoluta: true, vazar: true }),
    capacidade * 3,
    true
  );
  const rochas = lote(
    coral ? 'perolas-e-ruinas' : 'rochas-do-bioma',
    new THREE.DodecahedronGeometry(1, 0),
    toonNovo(cores.rocha),
    capacidade,
    true
  );
  const matBrilho = new THREE.MeshToonMaterial({
    color: cores.cristal,
    emissive: cores.cristal,
    emissiveIntensity: 0.3,
    gradientMap: gradienteToon(),
  });
  const cristais = lote(
    mineral ? 'lava-e-cristais-dos-ecos' : 'cristais-do-bioma',
    new THREE.ConeGeometry(1, 1, 5),
    matBrilho,
    capacidade * 3,
    true
  );
  const detalheGeo = new THREE.ConeGeometry(0.12, 0.65, 3);
  detalheGeo.translate(0, 0.32, 0);
  const detalhes = lote(
    mineral
      ? 'rebites-e-runarios'
      : neve
        ? 'estilhacos-de-gelo'
        : coral
          ? 'algas-do-oceano'
          : 'grama-ao-vento',
    detalheGeo,
    aplicarVento(
      toonNovo(mineral ? cores.rocha : neve ? '#e2faff' : coral ? '#479b9d' : '#75ac54'),
      { flex: 0.8, vazar: true }
    ),
    LIMITE_REGIOES * 24
  );
  const aguas = lote(
    coral
      ? 'ondas-rasas'
      : neve
        ? 'lagos-congelados'
        : mineral
          ? 'canais-selados'
          : 'flores-luminosas',
    pisoGeo,
    new THREE.MeshBasicMaterial({
      color: coral ? '#b4f4ed' : neve ? '#82cadf' : cores.cristal,
      transparent: true,
      opacity: coral ? 0.18 : 0.28,
      depthWrite: false,
      toneMapped: false,
    }),
    LIMITE_REGIOES * 2
  );

  const gramaProxima = !mineral
    ? lote(
        neve ? 'cristais-na-neve-proximos' : coral ? 'algas-proximas' : 'grama-proxima',
        detalheGeo,
        detalhes.material,
        qualidade === 'alta' ? 1700 : qualidade === 'media' ? 1000 : 550
      )
    : null;
  let celulaGrama = '';
  const atualizarGrama = (jx: number, jz: number) => {
    if (!gramaProxima) return;
    const cx = Math.floor(jx / 2),
      cz = Math.floor(jz / 2),
      chave = `${cx},${cz}`;
    if (chave === celulaGrama) return;
    celulaGrama = chave;
    gramaProxima.count = 0;
    const raio = qualidade === 'alta' ? 20 : qualidade === 'media' ? 16 : 12;
    const passo = 0.85;
    const n = Math.ceil(raio / passo);
    for (let dx = -n; dx <= n; dx++)
      for (let dz = -n; dz <= n; dz++) {
        if ((dx * dx + dz * dz) * passo * passo > raio * raio) continue;
        const gx = Math.floor((cx * 2) / passo) + dx,
          gz = Math.floor((cz * 2) / passo) + dz;
        const ruido = hash2(gx, gz, 409);
        if (ruido < (neve ? 0.93 : coral ? 0.82 : 0.3)) continue;
        const x = gx * passo + (ruido - 0.5) * 0.6;
        const z = gz * passo + (hash2(gx, gz, 410) - 0.5) * 0.6;
        const e = 0.65 + ruido * 0.7;
        por(gramaProxima, x, 0, z, e, e * (neve ? 0.6 : coral ? 1.4 : 1), e, ruido * 10);
      }
    gramaProxima.instanceMatrix.needsUpdate = true;
  };

  const reconstruir = () => {
    regioes = [...mundo.regioes.values()];
    pontos = regioes.flatMap((r) => r.pontos);
    obstaculos.length = 0;
    grade.clear();
    for (const l of lotes) if (l !== gramaProxima) l.count = 0;
    for (const r of regioes) {
      por(chao, r.x + 16, -0.025, r.z + 16, 32, 1, 32);
      if (idMapa === 'forja') {
        for (let k = 0; k < 4; k++)
          por(
            trilhas,
            r.x + 8 + (k % 2) * 16,
            -0.12,
            r.z + 8 + Math.floor(k / 2) * 16,
            15.5,
            0.2,
            15.5
          );
        por(aguas, r.x + 16, -0.009, r.z + 16, 1.6, 1, 32);
        for (let k = 0; k < 8; k++) por(detalhes, r.x + 16, 0.02, r.z + 2 + k * 4, 13, 0.06, 1);
      } else if (idMapa === 'abismo') {
        por(trilhas, r.x + 16, -0.08, r.z + 16, 22, 0.12, 22);
        por(trilhas, r.x + 16, -0.06, r.z + 16, 32, 0.08, 3);
        por(trilhas, r.x + 16, -0.06, r.z + 16, 3, 0.08, 32);
        por(aguas, r.x + 8, 0.015, r.z + 8, 11, 1, 6);
      } else {
        por(trilhas, r.x + 16, -0.017, r.z + 16, coral ? 22 : 2.2, 0.012, 32);
        if (neve || coral) por(aguas, r.x + 8, 0.002, r.z + 10, 12, 1, 7);
        const n = qualidade === 'alta' ? 24 : 12;
        for (let k = 0; k < n; k++) {
          const x = r.x + hash2(r.cx * 31 + k, r.cz, 81) * 32;
          const z = r.z + hash2(r.cx, r.cz * 31 + k, 82) * 32;
          por(detalhes, x, 0, z, coral ? 2 : 1, neve ? 0.5 : 1, 1, k);
        }
      }
      for (const o of r.obstaculos) {
        obstaculos.push(o);
        for (let x = Math.floor((o.x - o.r) / 6); x <= Math.floor((o.x + o.r) / 6); x++)
          for (let z = Math.floor((o.z - o.r) / 6); z <= Math.floor((o.z + o.r) / 6); z++) {
            const chave = `${x},${z}`;
            const celula = grade.get(chave);
            if (celula) celula.push(o);
            else grade.set(chave, [o]);
          }
        if (o.tipo === 'arvore') {
          por(troncos, o.x, o.altura * 0.35, o.z, o.r, o.altura * 0.7, o.r, o.giro);
          if (mineral) por(copas, o.x, o.altura * 0.7, o.z, 1.3, 0.2, 1.3, o.giro, cores.copa);
          else
            for (let k = 0; k < (coral ? 3 : 2); k++) {
              const ox = coral ? Math.sin(o.giro + k * 2) * 0.8 : 0;
              const oz = coral ? Math.cos(o.giro + k * 2) * 0.8 : 0;
              por(
                copas,
                o.x + ox,
                o.altura * (0.66 + k * 0.19),
                o.z + oz,
                1.6 - k * 0.4,
                neve ? 2 : coral ? 0.9 : 1.4,
                1.6 - k * 0.4,
                o.giro,
                idMapa === 'jardim' && hash2(r.cx, r.cz, k) > 0.65 ? '#ae80d9' : cores.copa
              );
            }
        } else if (o.tipo === 'rocha')
          por(rochas, o.x, o.altura * 0.43, o.z, o.r, o.altura * 0.6, o.r, o.giro);
        else
          for (let k = 0; k < 3; k++) {
            const h = o.altura * (1 - k * 0.22);
            por(cristais, o.x + (k - 1) * 0.35, h / 2, o.z, 0.32, h, 0.32, o.giro);
          }
      }
    }
    for (const l of lotes) {
      l.instanceMatrix.needsUpdate = true;
      if (l.instanceColor) l.instanceColor.needsUpdate = true;
    }
  };
  mundo.atualizar([{ x: 0, z: 0 }], qualidade === 'alta' ? 24 : 8);
  reconstruir();
  atualizarGrama(0, 0);
  let descartada = false;
  return {
    grupo,
    obstaculos,
    infinito: true,
    regioesAtivas: () => regioes,
    pontosExploracao: () => pontos,
    estadoMundo: () => ({
      regioes: regioes.length,
      obstaculos: obstaculos.length,
      recursos: descartada ? 0 : geometrias.size + materiais.size + lotes.length,
      limiteRegioes: LIMITE_REGIOES,
    }),
    obstaculosPerto: (x, z) => grade.get(`${Math.floor(x / 6)},${Math.floor(z / 6)}`) ?? vazio,
    atualizar(_dt, tempo, jx, jz, noite, jogadores) {
      if (descartada) return;
      const x = Number.isFinite(jx) ? jx : 0,
        z = Number.isFinite(jz) ? jz : 0;
      if (mundo.atualizar([{ x, z }, ...(jogadores ?? [])])) reconstruir();
      piso.position.x = x;
      piso.position.z = z;
      atualizarGrama(x, z);
      matBrilho.emissiveIntensity =
        0.25 + Math.max(0, Math.min(1, noite)) * 0.5 + Math.sin(tempo * 1.7) * 0.08;
      aguas.material.opacity = coral ? 0.14 + Math.sin(tempo * 1.5) * 0.04 : 0.25;
    },
    descartar() {
      if (descartada) return;
      descartada = true;
      for (const l of lotes) l.dispose();
      for (const g of geometrias) g.dispose();
      for (const m of materiais) m.dispose();
      mundo.limpar();
      regioes = [];
      pontos = [];
      obstaculos.length = 0;
      grade.clear();
      grupo.clear();
      grupo.removeFromParent();
    },
  };
}
