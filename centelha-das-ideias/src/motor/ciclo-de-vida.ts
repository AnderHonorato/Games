/** Une os eventos do navegador e do aplicativo sem retomar a partida automaticamente. */
export function instalarCicloDeVida(
  janela: EventTarget,
  documento: EventTarget & { readonly hidden: boolean },
  acoes: { suspender: () => void; retomarAudio: () => void }
): () => void {
  const suspender = () => acoes.suspender();
  const retomar = () => {
    if (!documento.hidden) acoes.retomarAudio();
  };
  const visibilidade = () => (documento.hidden ? suspender() : retomar());
  documento.addEventListener('visibilitychange', visibilidade);
  janela.addEventListener('pagehide', suspender);
  janela.addEventListener('centelha:pausar', suspender);
  janela.addEventListener('centelha:retomar', retomar);
  if (documento.hidden) suspender();
  return () => {
    documento.removeEventListener('visibilitychange', visibilidade);
    janela.removeEventListener('pagehide', suspender);
    janela.removeEventListener('centelha:pausar', suspender);
    janela.removeEventListener('centelha:retomar', retomar);
  };
}
