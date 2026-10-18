/** Controles do ateliê: atualizam somente o campo alterado, preservando foco. */
import type { Personalizacao } from '../render/personalizacao';
import type { Partida } from './jogo/partida';

export { ARMAS_INICIAIS } from './dados/armas-iniciais';

export function criarAtelie(p: Partida, mudou: () => void): HTMLElement {
  const raiz = document.createElement('div');
  raiz.className = 'rg-atelie';
  const visual = p.conta.visual(p.personagemId);
  const opcoes = [
    [
      'roupa',
      'Traje',
      [
        ['aventureiro', 'Aventureiro'],
        ['mago', 'Mago'],
        ['guardiao', 'Guardião'],
        ['pirata', 'Pirata'],
        ['astronauta', 'Astronauta'],
        ['floral', 'Floral'],
      ],
    ],
    [
      'cabeca',
      'Cabeça',
      [
        ['nenhum', 'Livre'],
        ['bone', 'Boné'],
        ['capuz', 'Capuz'],
        ['coroa', 'Coroa'],
        ['orelhas', 'Orelhas de coelho'],
        ['chapeu', 'Chapéu de sol'],
      ],
    ],
    [
      'acessorio',
      'Acessório',
      [
        ['nenhum', 'Nenhum'],
        ['oculos', 'Óculos'],
        ['cachecol', 'Cachecol'],
        ['asas', 'Asas'],
        ['mochila', 'Mochila'],
        ['laco', 'Laço'],
      ],
    ],
  ] as const;
  const ajustes = document.createElement('div');
  ajustes.className = 'rg-atelie-pecas';
  for (const [chave, titulo, valores] of opcoes) {
    const label = document.createElement('label');
    label.textContent = titulo;
    const select = document.createElement('select');
    select.setAttribute('aria-label', titulo);
    for (const [id, nome] of valores) {
      const option = document.createElement('option');
      option.value = id;
      option.textContent = nome;
      select.append(option);
    }
    select.value = visual[chave];
    select.addEventListener('change', () => {
      p.personalizar({ [chave]: select.value } as Partial<Personalizacao>);
      mudou();
    });
    label.append(select);
    ajustes.append(label);
  }
  const cores = document.createElement('div');
  cores.className = 'rg-atelie-cores';
  for (const [chave, titulo] of [
    ['corCorpo', 'Corpo'],
    ['corRoupa', 'Roupa'],
    ['corBracos', 'Braços'],
    ['corPernas', 'Pernas'],
    ['corOlhos', 'Olhos'],
    ['corDetalhe', 'Detalhes'],
  ] as const) {
    const label = document.createElement('label');
    const input = document.createElement('input');
    input.type = 'color';
    input.value = visual[chave];
    input.setAttribute('aria-label', `Cor: ${titulo}`);
    input.addEventListener('input', () => {
      p.personalizar({ [chave]: input.value });
      mudou();
    });
    label.append(input, document.createTextNode(titulo));
    cores.append(label);
  }
  raiz.append(ajustes, cores);
  return raiz;
}
