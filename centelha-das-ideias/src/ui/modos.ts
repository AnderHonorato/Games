/** A troca de modo só navega ao ativar o link; perfil e demais parâmetros persistem. */
export type ModoJogo = 'aventura' | 'sobrevivencia';
export const VERSAO_JOGO = 'v0.4.0';

export function modoDaUrl(): ModoJogo {
  return new URLSearchParams(window.location.search).get('modo') === 'aventura'
    ? 'aventura'
    : 'sobrevivencia';
}

export function seletorModos(atual: ModoJogo): HTMLElement {
  const nav = document.createElement('nav');
  nav.className = 'seletor-modos';
  nav.setAttribute('aria-label', 'Modo de jogo');
  for (const [modo, nome, descricao] of [
    ['aventura', 'Aventura', 'História, exploração, missões e enigmas.'],
    ['sobrevivencia', 'Sobrevivência', '11 heróis, hordas e melhorias a cada nível.'],
  ] as const) {
    const item = document.createElement(modo === atual ? 'span' : 'a');
    item.className = 'seletor-modo';
    item.dataset.modo = modo;
    item.setAttribute('aria-label', `Modo ${nome}`);
    item.setAttribute('aria-description', descricao);
    if (modo === atual) item.setAttribute('aria-current', 'page');
    else {
      const url = new URL(window.location.href);
      url.searchParams.set('modo', modo);
      (item as HTMLAnchorElement).href = url.href;
    }
    const titulo = document.createElement('strong');
    titulo.textContent = nome;
    const detalhe = document.createElement('small');
    detalhe.textContent = descricao;
    item.append(titulo, detalhe);
    nav.append(item);
  }
  return nav;
}
