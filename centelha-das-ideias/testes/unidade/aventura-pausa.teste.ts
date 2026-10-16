import { describe, expect, it } from 'vitest';
import { JogoCentelha, type EstadoJogo } from '../../src/jogo/jogo';

function jogoParaPausa(estadoJogo: EstadoJogo): JogoCentelha {
  return Object.assign(Object.create(JogoCentelha.prototype) as JogoCentelha, {
    estadoJogo,
    tempo: 0,
    entrada: {
      iniciarPasso() {},
      finalizarPasso() {},
      apertou() {
        return false;
      },
    },
    ui: {
      pausa() {},
      atualizar() {},
      menuAberto() {
        return false;
      },
    },
    audio: { tocar() {} },
    salvar() {},
  });
}

describe('pausa explícita da Aventura', () => {
  it.each(['jogando', 'dialogo', 'cena'] as const)(
    'interrompe %s e restaura o mesmo estado somente ao continuar',
    (estado) => {
      const jogo = jogoParaPausa(estado);

      jogo.alternarPausa(true);
      expect(jogo.estadoJogo).toBe('pausado');
      jogo.passo(10);
      expect(jogo.estadoJogo).toBe('pausado');

      // visibilitychange e appStateChange podem pedir a mesma pausa.
      jogo.alternarPausa(true);
      jogo.alternarPausa(false);
      expect(jogo.estadoJogo).toBe(estado);
    }
  );

  it.each(['titulo', 'derrota'] as const)('mantém %s ao receber pausa ou retomada', (estado) => {
    const jogo = jogoParaPausa(estado);
    jogo.alternarPausa(true);
    expect(jogo.estadoJogo).toBe(estado);
    jogo.alternarPausa(false);
    expect(jogo.estadoJogo).toBe(estado);
  });

  it('usa o estado atual na próxima pausa depois de retomar uma cena', () => {
    const jogo = jogoParaPausa('cena');
    jogo.alternarPausa(true);
    jogo.alternarPausa(false);
    jogo.estadoJogo = 'jogando';
    jogo.alternarPausa(true);
    jogo.alternarPausa(false);
    expect(jogo.estadoJogo).toBe('jogando');
  });
});
