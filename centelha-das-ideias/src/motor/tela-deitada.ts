/** Solicitação explícita pelo botão: navegadores podem recusar tela cheia ou orientação. */
export async function pedirTelaDeitada(): Promise<void> {
  if (typeof document === 'undefined') return;
  try {
    if (!document.fullscreenElement) await document.documentElement.requestFullscreen?.();
  } catch {
    // A orientação pode funcionar mesmo se o navegador recusar tela cheia.
  }
  if (typeof screen === 'undefined') return;
  const orientacao = screen.orientation as
    (ScreenOrientation & { lock?: (orientacao: 'landscape') => Promise<void> }) | undefined;
  try {
    await orientacao?.lock?.('landscape');
  } catch {
    // O jogo continua quando a plataforma não permite travar a orientação.
  }
}
