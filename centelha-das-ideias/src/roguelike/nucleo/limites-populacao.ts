/** Orçamento da simulação, compartilhado pelo anfitrião e pelos convidados. */
export const MAX_POPULACAO = 160;
export const RESERVA_CHEFES = 2;

export function limitePopulacao(jogadores: number): number {
  const n = Number.isFinite(jogadores) ? Math.max(1, Math.floor(jogadores)) : 1;
  return Math.min(MAX_POPULACAO, 100 + (n - 1) * 20);
}

export function podeSurgir(
  vivos: number,
  jogadores: number,
  chefe = false,
  chefesVivos = 0
): boolean {
  const limite = limitePopulacao(jogadores);
  return vivos < limite - (chefe ? 0 : Math.max(0, RESERVA_CHEFES - chefesVivos));
}

/** Descarta apenas dívida de relógio; nunca acumula uma rajada após uma lotação. */
export function creditoSurgimento(anterior: number, taxa: number, dt: number): number {
  return Math.min(1, Math.max(0, anterior + taxa * dt));
}
