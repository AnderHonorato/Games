import type { IdPersonagem } from '../dados/personagens';
export interface AlvoManual {
  x: number;
  z: number;
  vidaMax: number;
  vivo: boolean;
  raio?: number;
  elite?: boolean;
  def?: { comportamento: string };
}
/** Categorias são dominantes; vida máxima ordena dentro da categoria e distância desempata. */
export function selecionarAlvoManual<T extends AlvoManual>(
  alvos: readonly T[],
  x: number,
  z: number,
  alcance: number
): T | null {
  let melhor: T | null = null,
    peso = -Infinity,
    distancia = Infinity;
  for (const alvo of alvos) {
    const d = Math.hypot(alvo.x - x, alvo.z - z);
    if (!alvo.vivo || d > alcance + (alvo.raio ?? 0)) continue;
    const p =
      (alvo.def?.comportamento === 'chefe'
        ? 1e12
        : alvo.elite || alvo.def?.comportamento === 'elite'
          ? 1e9
          : 0) + alvo.vidaMax;
    if (p > peso || (p === peso && d < distancia)) {
      melhor = alvo;
      peso = p;
      distancia = d;
    }
  }
  return melhor;
}
export interface DefAvanco {
  duracao: number;
  recarga: number;
  velocidade: number;
  distancia: number;
  salto: number;
}
const AVANCOS: Record<IdPersonagem, DefAvanco> = {
  claude: { duracao: 0.16, recarga: 1.65, velocidade: 0, distancia: 6.2, salto: 0 },
  gpt: { duracao: 0.32, recarga: 1.7, velocidade: 12, distancia: 2.8, salto: 1.7 },
  gemini: { duracao: 0.48, recarga: 1.9, velocidade: 0, distancia: 3.4, salto: 0 },
  mistral: { duracao: 0.55, recarga: 1.8, velocidade: 19, distancia: 0, salto: 0.15 },
  llama: { duracao: 0.8, recarga: 2.3, velocidade: 9, distancia: 0, salto: 3.4 },
  deepseek: { duracao: 0.65, recarga: 2, velocidade: 15, distancia: 0, salto: 0.5 },
  aurora: { duracao: 0.4, recarga: 1.8, velocidade: 12, distancia: 1.5, salto: 0.8 },
  nox: { duracao: 0.22, recarga: 1.85, velocidade: 0, distancia: 5.4, salto: 0 },
  aeria: { duracao: 0.5, recarga: 1.65, velocidade: 17, distancia: 0, salto: 0.3 },
  fenix: { duracao: 0.45, recarga: 1.9, velocidade: 19, distancia: 0, salto: 0.6 },
  byte: { duracao: 0.35, recarga: 1.6, velocidade: 17, distancia: 1.2, salto: 0.5 },
};

export function avancoPersonagem(id: IdPersonagem): DefAvanco {
  return AVANCOS[id];
}

export interface AcertoBasico<T> {
  alvo: T;
  multiplicador: number;
  dx: number;
  dz: number;
  atraso: number;
}
/** Geometria determinística do ataque pessoal; arma modifica atributos, nunca a mecânica. */
export function acertosAtaqueBasico<T extends AlvoManual>(
  mecanica: import('../dados/ataques-basicos').MecanicaBasica,
  alvos: readonly T[],
  x: number,
  z: number,
  dx: number,
  dz: number,
  alcance: number,
  alvo: T | null
): AcertoBasico<T>[] {
  const vivos = alvos.filter(
    (i) => i.vivo && Math.hypot(i.x - x, i.z - z) <= alcance + (i.raio ?? 0)
  );
  const saida: AcertoBasico<T>[] = [];
  const acertar = (i: T, multiplicador = 1, atraso = 0, ox = x, oz = z) => {
    const d = Math.hypot(i.x - ox, i.z - oz) || 1;
    saida.push({ alvo: i, multiplicador, atraso, dx: (i.x - ox) / d, dz: (i.z - oz) / d });
  };
  const tx = alvo?.x ?? x + dx * Math.min(alcance, 3),
    tz = alvo?.z ?? z + dz * Math.min(alcance, 3);
  if (mecanica === 'cadeia' || mecanica === 'fork') {
    if (!alvo) return saida;
    acertar(alvo);
    const usados = new Set<T>([alvo]);
    let atual = alvo;
    for (let n = 0; n < 3; n++) {
      const origem = mecanica === 'fork' ? alvo : atual;
      const proximo = vivos
        .filter((i) => !usados.has(i) && Math.hypot(i.x - origem.x, i.z - origem.z) <= 4)
        .sort(
          (a, b) =>
            Math.hypot(a.x - origem.x, a.z - origem.z) - Math.hypot(b.x - origem.x, b.z - origem.z)
        )[0];
      if (!proximo) break;
      acertar(
        proximo,
        mecanica === 'fork' ? 0.65 : 1 - (n + 1) * 0.12,
        (n + 1) * 0.055,
        origem.x,
        origem.z
      );
      usados.add(proximo);
      atual = proximo;
    }
    return saida;
  }
  for (const i of vivos) {
    const ix = i.x - x,
      iz = i.z - z,
      d = Math.hypot(ix, iz),
      r = i.raio ?? 0;
    const frente = ix * dx + iz * dz,
      lado = Math.abs(ix * dz - iz * dx);
    if (mecanica === 'corte' && frente >= -r && lado < 1.5 + frente * 0.45 + r) acertar(i);
    if (mecanica === 'cruz') {
      const ax = i.x - tx,
        az = i.z - tz;
      const a = Math.abs(ax * dx + az * dz),
        b = Math.abs(ax * dz - az * dx);
      if (a <= 3 + r && b <= 0.65 + r) acertar(i);
      if (b <= 3 + r && a <= 0.65 + r) acertar(i, 1, 0.13);
    }
    if (mecanica === 'impacto' && Math.hypot(i.x - tx, i.z - tz) <= 3 + r) acertar(i);
    if (mecanica === 'leque') {
      for (const ang of [-0.42, 0, 0.42]) {
        const cx = dx * Math.cos(ang) - dz * Math.sin(ang),
          cz = dx * Math.sin(ang) + dz * Math.cos(ang);
        if (ix * cx + iz * cz >= 0 && Math.abs(ix * cz - iz * cx) <= 0.45 + r) acertar(i, 0.8);
      }
    }
    if (mecanica === 'onda' && frente >= -r && lado <= 1.2 + frente * 0.5 + r) acertar(i);
    if (mecanica === 'notas') {
      for (let n = 0; n < 3; n++) if (d <= (alcance * (n + 1)) / 3 + r) acertar(i, 1, n * 0.12);
    }
    if (mecanica === 'convergencia' && Math.hypot(i.x - tx, i.z - tz) <= 3.6 + r)
      acertar(i, 1, 0, tx, tz);
  }
  return saida;
}
