/** Dados cosméticos persistíveis; nunca contêm objetos Three.js. */
export interface Personalizacao {
  roupa: 'aventureiro' | 'mago' | 'guardiao' | 'pirata' | 'astronauta' | 'floral';
  cabeca: 'nenhum' | 'bone' | 'capuz' | 'coroa' | 'orelhas' | 'chapeu';
  acessorio: 'nenhum' | 'oculos' | 'cachecol' | 'asas' | 'mochila' | 'laco';
  corCorpo: string;
  corRoupa: string;
  corBracos: string;
  corPernas: string;
  corOlhos: string;
  corDetalhe: string;
}

function cor(value: unknown, fallback: string): string {
  if (typeof value !== 'string') return fallback;
  const limpa = value.trim();
  if (/^#[\da-f]{6}$/i.test(limpa)) return limpa.toLowerCase();
  if (/^#[\da-f]{3}$/i.test(limpa)) {
    return `#${limpa[1]}${limpa[1]}${limpa[2]}${limpa[2]}${limpa[3]}${limpa[3]}`.toLowerCase();
  }
  return fallback;
}

export function personalizacaoPadrao(corBase?: string): Personalizacao {
  const base = cor(corBase, '#d97757');
  return {
    roupa: 'aventureiro',
    cabeca: 'nenhum',
    acessorio: 'nenhum',
    corCorpo: base,
    corRoupa: '#285b69',
    corBracos: base,
    corPernas: '#493848',
    corOlhos: '#305d66',
    corDetalhe: '#ffd27a',
  };
}

/** Valida também saves antigos, arrays e entradas incompletas. */
export function normalizarPersonalizacao(value: unknown, corBase?: string): Personalizacao {
  const p = personalizacaoPadrao(corBase);
  if (!value || typeof value !== 'object' || Array.isArray(value)) return p;
  const origem = value as Record<string, unknown>;
  const v: Record<string, unknown> = {};
  for (const chave of Object.keys(p)) {
    if (Object.hasOwn(origem, chave)) v[chave] = origem[chave];
  }
  if (
    v.roupa === 'aventureiro' ||
    v.roupa === 'mago' ||
    v.roupa === 'guardiao' ||
    v.roupa === 'pirata' ||
    v.roupa === 'astronauta' ||
    v.roupa === 'floral'
  )
    p.roupa = v.roupa;
  if (
    v.cabeca === 'nenhum' ||
    v.cabeca === 'bone' ||
    v.cabeca === 'capuz' ||
    v.cabeca === 'coroa' ||
    v.cabeca === 'orelhas' ||
    v.cabeca === 'chapeu'
  )
    p.cabeca = v.cabeca;
  if (
    v.acessorio === 'nenhum' ||
    v.acessorio === 'oculos' ||
    v.acessorio === 'cachecol' ||
    v.acessorio === 'asas' ||
    v.acessorio === 'mochila' ||
    v.acessorio === 'laco'
  )
    p.acessorio = v.acessorio;
  for (const chave of [
    'corCorpo',
    'corRoupa',
    'corBracos',
    'corPernas',
    'corOlhos',
    'corDetalhe',
  ] as const) {
    p[chave] = cor(v[chave], p[chave]);
  }
  return p;
}
