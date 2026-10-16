import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { EntradaJogo } from '../../src/motor/entrada';

let janela: EventTarget;

beforeEach(() => {
  janela = new EventTarget();
  vi.stubGlobal('window', janela);
  vi.stubGlobal('navigator', { getGamepads: () => [] });
});

afterEach(() => vi.unstubAllGlobals());

function entrada() {
  return new EntradaJogo(new EventTarget() as HTMLElement);
}

describe('limpeza da entrada ao suspender', () => {
  it('blur descarta movimento e apertos pendentes, inclusive a tecla de pausa', () => {
    const e = entrada();
    janela.dispatchEvent(Object.assign(new Event('keydown'), { code: 'Escape', repeat: false }));
    e.definirComandoVirtual('pular', true);
    e.definirJoystick(1, -1);
    e.definirMiraToque({ x: 1, y: 0 });

    janela.dispatchEvent(new Event('blur'));
    e.iniciarPasso();

    expect(e.movimento()).toEqual({ x: 0, y: 0 });
    expect(e.segurando('pular')).toBe(false);
    expect(e.apertou('pausa')).toBe(false);
    expect(e.apertou('pular')).toBe(false);
    expect(e.miraToque()).toBeNull();
  });

  it('a limpeza explícita também descarta transições do passo atual e da fila', () => {
    const e = entrada();
    e.definirComandoVirtual('atacar', true);
    e.iniciarPasso();
    e.definirComandoVirtual('atacar', false);

    e.soltarTudo();

    expect(e.apertou('atacar')).toBe(false);
    expect(e.soltou('atacar')).toBe(false);
    e.iniciarPasso();
    expect(e.apertou('atacar')).toBe(false);
    expect(e.soltou('atacar')).toBe(false);
  });

  it('descarta movimento e botões lidos do controle', () => {
    const e = entrada();
    vi.stubGlobal('navigator', {
      getGamepads: () => [{ connected: true, axes: [1, 0], buttons: [{ pressed: true }] }],
    });
    e.iniciarPasso();
    expect(e.segurando('pular')).toBe(true);

    e.soltarTudo();

    expect(e.movimento()).toEqual({ x: 0, y: 0 });
    expect(e.segurando('pular')).toBe(false);
    expect(e.apertou('pular')).toBe(false);
  });

  it('avisa os controles de toque depois de limpar, inclusive em limpezas repetidas', () => {
    const e = entrada();
    e.definirJoystick(1, 0);
    const limpar = vi.fn(() => expect(e.movimento()).toEqual({ x: 0, y: 0 }));
    e.aoLimpar.add(limpar);

    e.soltarTudo();
    janela.dispatchEvent(new Event('blur'));

    expect(limpar).toHaveBeenCalledTimes(2);
  });
});
