import { describe, expect, it } from 'vitest';
import { instalarCicloDeVida } from '../../src/motor/ciclo-de-vida';

function ambiente() {
  const janela = new EventTarget();
  const documento = Object.assign(new EventTarget(), { hidden: false });
  const estado = { pausado: false, audioSuspenso: false, salvamentos: 0 };
  const remover = instalarCicloDeVida(janela, documento, {
    suspender: () => {
      estado.pausado = true;
      estado.audioSuspenso = true;
      estado.salvamentos++;
    },
    retomarAudio: () => {
      estado.audioSuspenso = false;
    },
  });
  return { janela, documento, estado, remover };
}

describe('ciclo de vida no navegador e Android', () => {
  it('pausa e salva ao esconder a página; voltar só libera o áudio', () => {
    const a = ambiente();
    a.documento.hidden = true;
    a.documento.dispatchEvent(new Event('visibilitychange'));
    expect(a.estado).toEqual({ pausado: true, audioSuspenso: true, salvamentos: 1 });
    a.documento.hidden = false;
    a.documento.dispatchEvent(new Event('visibilitychange'));
    expect(a.estado.pausado).toBe(true);
    expect(a.estado.audioSuspenso).toBe(false);
  });

  it('Voltar e onPause nativos nunca alternam a pausa', () => {
    const a = ambiente();
    a.janela.dispatchEvent(new Event('centelha:pausar'));
    a.janela.dispatchEvent(new Event('centelha:pausar'));
    a.janela.dispatchEvent(new Event('centelha:retomar'));
    expect(a.estado.pausado).toBe(true);
    expect(a.estado.salvamentos).toBe(2);
    expect(a.estado.audioSuspenso).toBe(false);
  });

  it('onResume não libera áudio quando a página ainda está oculta', () => {
    const a = ambiente();
    a.janela.dispatchEvent(new Event('centelha:pausar'));
    a.documento.hidden = true;
    a.janela.dispatchEvent(new Event('centelha:retomar'));
    expect(a.estado.audioSuspenso).toBe(true);
  });

  it('salva antes de sair da página', () => {
    const a = ambiente();
    a.janela.dispatchEvent(new Event('pagehide'));
    expect(a.estado).toEqual({ pausado: true, audioSuspenso: true, salvamentos: 1 });
  });

  it('já inicia suspenso se a página estiver oculta', () => {
    const documento = Object.assign(new EventTarget(), { hidden: true });
    let suspenso = false;
    instalarCicloDeVida(new EventTarget(), documento, {
      suspender: () => {
        suspenso = true;
      },
      retomarAudio: () => {},
    });
    expect(suspenso).toBe(true);
  });

  it('remove os ouvintes de ambos os ambientes', () => {
    const a = ambiente();
    a.remover();
    a.janela.dispatchEvent(new Event('centelha:pausar'));
    a.janela.dispatchEvent(new Event('pagehide'));
    a.documento.hidden = true;
    a.documento.dispatchEvent(new Event('visibilitychange'));
    expect(a.estado.salvamentos).toBe(0);
  });
});
