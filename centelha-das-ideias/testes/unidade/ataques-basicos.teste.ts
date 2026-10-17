import { describe, expect, it } from 'vitest';
import { acertosAtaqueBasico } from '../../src/roguelike/nucleo/combate-manual';
const alvo = (x: number, z: number) => ({ x, z, vidaMax: 100, vivo: true, raio: 0 });
describe('geometrias pessoais independentes das habilidades automáticas', () => {
  it('corte pega frente larga e ignora costas', () => {
    const frente = alvo(3, 1),
      costas = alvo(-1, 0);
    expect(
      acertosAtaqueBasico('corte', [frente, costas], 0, 0, 1, 0, 6, frente).map((a) => a.alvo)
    ).toEqual([frente]);
  });
  it('cadeia salta entre vizinhos e fork se ramifica somente do impacto principal', () => {
    const principal = alvo(1, 0),
      segundo = alvo(4.5, 0),
      terceiro = alvo(7.5, 0);
    const cadeia = acertosAtaqueBasico(
      'cadeia',
      [principal, segundo, terceiro],
      0,
      0,
      1,
      0,
      10,
      principal
    );
    const fork = acertosAtaqueBasico(
      'fork',
      [principal, segundo, terceiro],
      0,
      0,
      1,
      0,
      10,
      principal
    );
    expect(cadeia.map((a) => a.alvo)).toEqual([principal, segundo, terceiro]);
    expect(fork.map((a) => a.alvo)).toEqual([principal, segundo]);
    expect(cadeia[1].atraso).toBeGreaterThan(0);
    expect(fork[1].multiplicador).toBe(0.65);
  });
  it('cruz causa dois golpes no centro e impacto alcança a área lateral do alvo', () => {
    const centro = alvo(3, 0),
      lateral = alvo(3, 2.5);
    expect(
      acertosAtaqueBasico('cruz', [centro], 0, 0, 1, 0, 7, centro).map((a) => a.atraso)
    ).toEqual([0, 0.13]);
    expect(acertosAtaqueBasico('impacto', [centro, lateral], 0, 0, 1, 0, 7, centro)).toHaveLength(
      2
    );
  });
  it('leque tem três faixas e onda cobre os intervalos entre elas', () => {
    const centro = alvo(3, 0),
      intervalo = alvo(6, 1.2);
    expect(acertosAtaqueBasico('leque', [intervalo], 0, 0, 1, 0, 8, centro)).toHaveLength(0);
    expect(acertosAtaqueBasico('onda', [intervalo], 0, 0, 1, 0, 8, centro)).toHaveLength(1);
  });
  it('notas atingem em três tempos e convergência orienta a força a partir do centro do alvo', () => {
    const centro = alvo(1, 0),
      perto = alvo(2, 0),
      longe = alvo(6, 0);
    expect(
      acertosAtaqueBasico('notas', [centro], 0, 0, 1, 0, 6, centro).map((a) => a.atraso)
    ).toEqual([0, 0.12, 0.24]);
    expect(
      acertosAtaqueBasico('notas', [longe], 0, 0, 1, 0, 6, centro).map((a) => a.atraso)
    ).toEqual([0.24]);
    expect(acertosAtaqueBasico('convergencia', [perto], 0, 0, 1, 0, 7, centro)[0].dx).toBe(1);
  });
});
