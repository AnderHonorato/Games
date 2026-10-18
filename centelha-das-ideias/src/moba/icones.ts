import type { DefHeroiMoba } from './tipos';
/** Ilustrações vetoriais próprias: os retratos usam a silhueta de cada espécie. */
const svg = (miolo: string, classe = '') =>
  `<svg class="moba-svg ${classe}" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">${miolo}</svg>`;
const linha = (d: string) =>
  `<path d="${d}" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>`;
export function iconeMoba(tipo: string): string {
  const desenhos: Record<string, string> = {
    ataque: 'M16 48 47 17M38 16l11-1-1 11M13 39l12 12M12 52l8-8',
    loja: 'M15 25h34l-3 27H18l-3-27ZM23 25v-7a9 9 0 0 1 18 0v7',
    retorno: 'M11 29 32 11l21 18M18 27v25h28V27M26 51V36h12v15',
    ward: 'M9 32s9-14 23-14 23 14 23 14-9 14-23 14S9 32 9 32ZM32 25a7 7 0 1 0 0 14 7 7 0 0 0 0-14ZM32 8v6M32 50v6',
    ping: 'M32 45V22M32 52v1M11 48l19-37h4l19 37-3 5H14l-3-5Z',
    pausa: 'M24 14v36M40 14v36',
    ajuda: 'M22 24c0-15 23-15 23 0 0 9-13 8-13 18M32 50v1',
    placar: 'M13 16h38v36H13V16ZM23 16V9M41 16V9M22 29h4M37 29h5M22 41h4M37 41h5',
    cura: 'M24 10h16v14h14v16H40v14H24V40H10V24h14V10Z',
    escudo: 'M32 8 52 16v16c0 12-20 24-20 24S12 44 12 32V16L32 8ZM23 31l7 7 13-15',
    lampejo: 'M36 7 14 35h16l-3 22 23-31H34l2-19Z',
    projetil: 'M10 50 42 18M31 17l15-1-1 15M10 36l16 16M40 45l7-7M18 16l7-7',
    linha: 'M8 42 53 21M8 30l45-20M15 53l41-20M43 13l10-3-1 11',
    cone: 'M12 33 52 11c10 13 10 30 0 43L12 33ZM24 33h29M34 23l18-9M34 43l18 9',
    area: 'M32 12v16M24 20l8 8 8-8M9 43c0-9 46-9 46 0s-46 9-46 0ZM17 31 8 23M47 31l9-8',
    salto: 'M10 48c6-50 39-50 44-11M44 29l10 8 4-13M9 53h18M41 53h16',
    puxao: 'M49 12v16a13 13 0 0 1-26 0v-5M23 23l-9 9M23 23l9 9M9 47h21',
    invocar:
      'M32 8 39 24l17 2-13 12 4 18-15-9-15 9 4-18L8 26l17-2 7-16ZM26 32h1M37 32h1M27 39c3 3 7 3 10 0',
    raiz: 'M32 9v44M32 25 19 14M32 32l15-12M32 43 15 52M32 43l17 9M32 52l-10 4',
    orbita:
      'M9 32c0-18 46-18 46 0S9 50 9 32ZM32 9c18 0 18 46 0 46S14 9 32 9ZM32 28a4 4 0 1 0 0 8 4 4 0 0 0 0-8',
    canal: 'M13 48 46 15M34 15h12v12M10 20h11M15 15v11M43 45h12M49 39v12M25 48l23-23',
    veneno:
      'M32 8c-5 10-19 22-19 32a19 19 0 0 0 38 0C51 30 37 18 32 8ZM25 35l4 4M39 35l-4 4M26 48h12',
    troca: 'M9 22h43M43 13l9 9-9 9M55 44H12M21 35l-9 9 9 9',
    bota: 'M23 10h18l-3 25 15 9v10H12V42l10-7 1-25Z',
    espada: 'M17 49 44 13l9-3-1 10-29 35M13 39l17 13M10 55l8-10',
    cajado: 'M19 55 39 19M40 7l9 9-9 10-9-10 9-9ZM12 37l14 7',
    armadura: 'M21 9l11 6 11-6 12 15-10 8v22H19V32L9 24 21 9ZM32 23v22',
    coracao: 'M32 53S8 39 8 22c0-15 19-17 24-4 5-13 24-11 24 4 0 17-24 31-24 31Z',
    ampulheta: 'M19 9h26M19 55h26M22 10v9l10 13-10 13v9M42 10v9L32 32l10 13v9M25 17h14M25 49h14',
    arco: 'M14 12c46 4 46 36 0 40l10-20-10-20ZM24 32h31M47 25l8 7-8 7',
    coroa: 'M10 20l12 10 10-18 10 18 12-10-5 31H15l-5-31ZM17 43h30',
    semente: 'M32 55V32M32 41C9 44 8 18 8 18s25-1 24 23ZM32 33C30 12 54 9 54 9s2 25-22 24Z',
    manto: 'M24 11c4-5 12-5 16 0l3 10 12 34H9l12-34 3-10ZM24 21h16M32 25v25',
    ouro: 'M32 9c12 0 22 10 22 23S44 55 32 55 10 45 10 32 20 9 32 9ZM38 23H27v9h10v9H25M32 18v5M32 41v5',
    alvo: 'M32 11a21 21 0 1 0 0 42 21 21 0 0 0 0-42ZM32 22a10 10 0 1 0 0 20 10 10 0 0 0 0-20M32 5v12M32 47v12M5 32h12M47 32h12',
    torre: 'M20 10v10h8V10h8v10h8V10h7v20l-8 6 4 19H17l4-19-8-6V10h7ZM27 55V42h10v13',
    guardiao:
      'M15 20 8 9l17 8h14l17-8-7 11 5 14-10 16H20L10 34l5-14ZM23 30l5 3M41 30l-5 3M27 42h10',
  };
  return svg(linha(desenhos[tipo] ?? desenhos.invocar));
}
export function iconeItemMoba(id: string): string {
  const t = /bota|sandalia/.test(id)
    ? 'bota'
    : /lamina|espada|martelo|adaga|presa/.test(id)
      ? 'espada'
      : /cajado|varinha|orbe|cristal/.test(id)
        ? 'cajado'
        : /arco|flecha/.test(id)
          ? 'arco'
          : /colete|escudo|armadura|casco/.test(id)
            ? 'armadura'
            : /coracao|chaleira|pocao/.test(id)
              ? 'coracao'
              : /ampulheta|relogio/.test(id)
                ? 'ampulheta'
                : /manto/.test(id)
                  ? 'manto'
                  : /coroa/.test(id)
                    ? 'coroa'
                    : 'semente';
  return iconeMoba(t);
}
export function retratoMoba(h: DefHeroiMoba): string {
  const corpo = h.cor,
    claro = h.cor2;
  let atras = '',
    face = '',
    detalhe = '';
  const orelhas = (altas = false) =>
    `<path d="M11 31 9 ${altas ? 0 : 9}l20 12M35 21 55 ${altas ? 0 : 9}l-2 22" fill="${corpo}" stroke="#102b38" stroke-width="2"/><path d="m15 24-2-9 10 8M41 23l10-8-2 9" fill="${claro}"/>`;
  switch (h.forma) {
    case 'raposa':
      atras = orelhas();
      face = `<path d="M11 29 22 23h20l11 6-4 19-17 11-17-11-4-19Z" fill="${corpo}"/><path d="m13 35 19 7 19-7-7 15-12 9-12-9-7-15Z" fill="${claro}"/>`;
      break;
    case 'gato':
      atras = orelhas();
      detalhe = linha('M8 39h10M9 46l9-3M46 39h10M46 43l9 3');
      break;
    case 'coelho':
      atras = `<path d="M17 31C7-5 27-6 27 27M37 27C37-6 57-5 47 31" fill="${corpo}" stroke="#102b38" stroke-width="2"/><path d="M19 24 19 5M44 24 46 5" stroke="${claro}" stroke-width="5"/>`;
      break;
    case 'dragao':
      atras = `<path d="m11 28-3-17 13 9M43 20l13-9-3 17M26 18l6-15 6 15" fill="${claro}"/>`;
      detalhe = `<path d="M18 46h28v7H18z" fill="${claro}"/>`;
      break;
    case 'coruja':
      atras = `<path d="m12 26-5-15 18 8h14l18-8-5 15" fill="${corpo}"/>`;
      detalhe = `<ellipse cx="23" cy="34" rx="11" ry="13" fill="${claro}"/><ellipse cx="41" cy="34" rx="11" ry="13" fill="${claro}"/><path d="m28 42 4 8 4-8" fill="#f6c665"/>`;
      break;
    case 'axolote':
      atras = `<path d="M15 25 5 16M13 32 2 30M14 39 4 43M49 25l10-9M51 32l11-2M50 39l10 4" stroke="${claro}" stroke-width="6" stroke-linecap="round"/>`;
      break;
    case 'tartaruga':
      atras = `<path d="M5 49c-3-43 57-43 54 0" fill="${corpo}" stroke="#102b38" stroke-width="2"/>`;
      detalhe = `<path d="m16 18 16 8 16-8M32 26v-9" stroke="${claro}" stroke-width="3"/>`;
      break;
    case 'panda':
      atras = `<circle cx="14" cy="20" r="10" fill="#23353c"/><circle cx="50" cy="20" r="10" fill="#23353c"/>`;
      detalhe = `<ellipse cx="23" cy="34" rx="9" ry="11" fill="#24333e" transform="rotate(18 23 34)"/><ellipse cx="41" cy="34" rx="9" ry="11" fill="#24333e" transform="rotate(-18 41 34)"/>`;
      break;
    case 'morcego':
      atras = `<path d="M19 28 4 4l23 14M37 18 60 4 45 28" fill="${corpo}" stroke="#102b38" stroke-width="2"/>`;
      detalhe = `<path d="m24 48 3 7 3-7M34 48l3 7 3-7" fill="#fff4dc"/>`;
      break;
    case 'sapo':
      atras = `<circle cx="19" cy="21" r="12" fill="${corpo}"/><circle cx="45" cy="21" r="12" fill="${corpo}"/>`;
      detalhe = `<path d="M17 44q15 15 30 0" stroke="${claro}" stroke-width="5"/>`;
      break;
    case 'ourico':
      atras = `<path d="m6 42 3-13-4-12 14 3L25 5l9 12L47 7l1 15 12 5-8 14" fill="${claro}" stroke="#102b38" stroke-width="2"/>`;
      break;
    case 'cervo':
      atras = `<path d="M19 26 13 5M14 13 5 8M15 18l9-10M45 26 51 5M50 13l9-5M49 18 40 8" stroke="${claro}" stroke-width="4" stroke-linecap="round"/><path d="M17 30 5 21l2 13M47 30l12-9-2 13" fill="${corpo}"/>`;
      break;
    case 'pinguim':
      detalhe = `<path d="M12 30c12-15 16-2 20-2s8-13 20 2v14c-5 21-35 21-40 0V30Z" fill="${claro}"/><path d="m26 42 6 7 6-7" fill="#efb357"/>`;
      break;
    case 'guaxinim':
      atras = orelhas();
      detalhe = `<path d="m13 28 19 5 19-5 2 13-21 1-21-1 2-13Z" fill="#25323d"/>`;
      break;
    case 'polvo':
      atras = `<path d="M14 41C-2 55 7 63 18 53M24 48c-4 19 12 17 10 5M43 46c12 21 22 4 9-4" stroke="${corpo}" stroke-width="8" stroke-linecap="round"/>`;
      break;
    case 'borboleta':
      atras = `<path d="M27 31C6-4-8 23 17 38-6 51 18 67 28 45M37 31C58-4 72 23 47 38c23 13-1 29-11 7" fill="${claro}" stroke="#102b38" stroke-width="2"/>`;
      face = `<ellipse cx="32" cy="37" rx="13" ry="21" fill="${corpo}"/>`;
      detalhe = linha('M27 20 21 9M37 20l6-11');
      break;
    case 'capivara':
      atras = `<circle cx="16" cy="23" r="7" fill="${corpo}"/><circle cx="48" cy="23" r="7" fill="${corpo}"/>`;
      face = `<rect x="9" y="20" width="46" height="38" rx="17" fill="${corpo}"/>`;
      detalhe = `<ellipse cx="32" cy="45" rx="16" ry="10" fill="${claro}"/>`;
      break;
    case 'lontra':
      atras = `<circle cx="12" cy="25" r="7" fill="${corpo}"/><circle cx="52" cy="25" r="7" fill="${corpo}"/>`;
      detalhe = `<path d="M15 39c6-7 12-3 17 1 5-4 11-8 17-1v9c-8 14-26 14-34 0v-9Z" fill="${claro}"/>`;
      break;
    case 'tubarao':
      atras = `<path d="m25 24 8-22 9 24M12 39 0 32l6 18M52 39l12-7-6 18" fill="${corpo}" stroke="#102b38" stroke-width="2"/>`;
      detalhe = `<path d="M15 44h34c-2 17-32 17-34 0Z" fill="#14303f"/><path d="m20 44 4 7 4-7 4 7 4-7 4 7 4-7" fill="#fff5e3"/>`;
      break;
    case 'esquilo':
      atras = orelhas(true);
      detalhe = `<ellipse cx="20" cy="42" rx="9" ry="9" fill="${claro}"/><ellipse cx="44" cy="42" rx="9" ry="9" fill="${claro}"/><path d="M28 48h8v6h-8z" fill="#fff7e8"/>`;
      break;
    case 'carneiro':
      atras = `<path d="M15 23C-3 8-1 43 13 38M49 23c18-15 16 20 2 15" stroke="${claro}" stroke-width="8" stroke-linecap="round"/><path d="M15 20c-9-16 9-20 12-13 4-12 17-8 17 1 12-4 17 12 8 17" fill="${corpo}"/>`;
      break;
    case 'lobo':
      atras = orelhas(true);
      face = `<path d="M12 25 24 19h16l12 6 2 16-10 12-12 8-12-8-10-12 2-16Z" fill="${corpo}"/><path d="m14 40 18 1 18-1-8 12-10 9-10-9-8-12Z" fill="${claro}"/>`;
      break;
    case 'cogumelo':
      face = `<path d="M20 26h24v28c-7 7-17 7-24 0V26Z" fill="${claro}"/>`;
      detalhe = `<path d="M4 31C6-5 58-5 60 31H4Z" fill="${corpo}"/><circle cx="19" cy="20" r="6" fill="${claro}"/><circle cx="42" cy="15" r="7" fill="${claro}"/>`;
      break;
    case 'abelha':
      atras = `<ellipse cx="13" cy="36" rx="10" ry="18" fill="#d8f0f6"/><ellipse cx="51" cy="36" rx="10" ry="18" fill="#d8f0f6"/>`;
      detalhe = `<path d="M17 46h30v6H17z" fill="#29303b"/>${linha('M24 21 19 9M40 21l5-12')}`;
      break;
    case 'camaleao':
      atras = `<path d="m18 23 9-18 8 14 12 4" fill="${claro}"/>`;
      detalhe = `<circle cx="22" cy="32" r="10" fill="${claro}"/><circle cx="43" cy="32" r="10" fill="${claro}"/><path d="M43 47c21 0 16 18 8 13-7-5 5-9 5-5" stroke="${corpo}" stroke-width="5"/>`;
      break;
  }
  const yeux =
    h.forma === 'sapo' ? [19, 45, 23] : h.forma === 'cogumelo' ? [26, 38, 42] : [23, 41, 35];
  return svg(
    `<circle cx="32" cy="34" r="30" fill="#132d3c"/><path d="M7 59c3-18 47-18 50 0" fill="${claro}" opacity=".4"/>${atras}${face || `<ellipse cx="32" cy="37" rx="23" ry="22" fill="${corpo}"/>`}${detalhe}<g fill="#102b38"><ellipse cx="${yeux[0]}" cy="${yeux[2]}" rx="3.5" ry="5"/><ellipse cx="${yeux[1]}" cy="${yeux[2]}" rx="3.5" ry="5"/></g><g fill="#fff9e5"><circle cx="${yeux[0] - 1}" cy="${yeux[2] - 2}" r="1.3"/><circle cx="${yeux[1] - 1}" cy="${yeux[2] - 2}" r="1.3"/></g><path d="M28 44q4 4 8 0" stroke="#183240" stroke-width="1.8" stroke-linecap="round"/><ellipse cx="16" cy="43" rx="4" ry="2" fill="#f9a4a6" opacity=".55"/><ellipse cx="48" cy="43" rx="4" ry="2" fill="#f9a4a6" opacity=".55"/>`,
    'moba-retrato-svg'
  );
}
