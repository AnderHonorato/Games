import { afterEach, describe, expect, it, vi } from 'vitest';
import { pedirTelaDeitada } from '../../src/motor/tela-deitada';

afterEach(() => vi.unstubAllGlobals());

describe('pedido explícito de tela deitada', () => {
  it('aguarda entrar em tela cheia antes de pedir orientação landscape', async () => {
    const ordem: string[] = [];
    vi.stubGlobal('document', {
      fullscreenElement: null,
      documentElement: {
        async requestFullscreen() {
          ordem.push('iniciou tela cheia');
          await Promise.resolve();
          ordem.push('entrou em tela cheia');
        },
      },
    });
    vi.stubGlobal('screen', {
      orientation: {
        async lock(orientacao: string) {
          ordem.push(orientacao);
        },
      },
    });

    await pedirTelaDeitada();

    expect(ordem).toEqual(['iniciou tela cheia', 'entrou em tela cheia', 'landscape']);
  });

  it('pede apenas a orientação se já estiver em tela cheia', async () => {
    const lock = vi.fn().mockResolvedValue(undefined);
    const requestFullscreen = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('document', {
      fullscreenElement: {},
      documentElement: { requestFullscreen },
    });
    vi.stubGlobal('screen', { orientation: { lock } });

    await pedirTelaDeitada();

    expect(requestFullscreen).not.toHaveBeenCalled();
    expect(lock).toHaveBeenCalledWith('landscape');
  });

  it('ainda tenta orientar quando a API de tela cheia não existe', async () => {
    const lock = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('document', { fullscreenElement: null, documentElement: {} });
    vi.stubGlobal('screen', { orientation: { lock } });

    await pedirTelaDeitada();

    expect(lock).toHaveBeenCalledWith('landscape');
  });

  it.each([{}, { orientation: {} }])(
    'aceita navegador sem bloqueio de orientação: %j',
    async (tela) => {
      const requestFullscreen = vi.fn().mockResolvedValue(undefined);
      vi.stubGlobal('document', {
        fullscreenElement: null,
        documentElement: { requestFullscreen },
      });
      vi.stubGlobal('screen', tela);

      await expect(pedirTelaDeitada()).resolves.toBeUndefined();
      expect(requestFullscreen).toHaveBeenCalledOnce();
    }
  );

  it('trata rejeição de tela cheia e ainda tenta a orientação', async () => {
    const lock = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('document', {
      fullscreenElement: null,
      documentElement: {
        requestFullscreen: vi.fn().mockRejectedValue(new Error('Tela cheia recusada')),
      },
    });
    vi.stubGlobal('screen', { orientation: { lock } });

    await expect(pedirTelaDeitada()).resolves.toBeUndefined();
    expect(lock).toHaveBeenCalledWith('landscape');
  });

  it('absorve rejeição do bloqueio de orientação', async () => {
    const lock = vi.fn().mockRejectedValue(new Error('Orientação recusada'));
    vi.stubGlobal('document', { fullscreenElement: {}, documentElement: {} });
    vi.stubGlobal('screen', { orientation: { lock } });

    await expect(pedirTelaDeitada()).resolves.toBeUndefined();
    expect(lock).toHaveBeenCalledWith('landscape');
  });
});
