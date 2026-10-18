import { describe, expect, it } from 'vitest';
import { HEROIS_MOBA } from '../../src/moba/dados';
import { ITENS_MOBA, itemMoba, custoCompra, recomendadosPorClasse } from '../../src/moba/itens';

describe('loja MOBA: receitas e escolhas de equipamento', () => {
  it('oferece 28 itens, oito componentes e seis passivas distintas', () => {
    expect(ITENS_MOBA).toHaveLength(28);
    expect(new Set(ITENS_MOBA.map((i) => i.id)).size).toBe(28);
    expect(ITENS_MOBA.filter((i) => i.categoria === 'componente')).toHaveLength(8);
    expect(new Set(ITENS_MOBA.flatMap((i) => (i.efeito ? [i.efeito.tipo] : []))).size).toBe(6);
    for (const i of ITENS_MOBA) {
      expect(itemMoba(i.id)).toBe(i);
      expect(Number.isFinite(i.custo)).toBe(true);
      expect(i.custo).toBeGreaterThan(0);
      expect(i.classes.length).toBeGreaterThan(0);
      expect(i.receita).toBeInstanceOf(Array);
      if (i.efeito) expect(i.passiva?.descricao).toBe(i.efeito.descricao);
    }
  });

  it('preserva os preços dos 14 equipamentos anteriores', () => {
    const precos = {
      'botas-brisa': 350,
      'lamina-sol': 900,
      'cajado-lua': 950,
      'colete-musgo': 850,
      'coracao-carvalho': 1350,
      'ampulheta-mel': 1050,
      'arco-vagalume': 1250,
      'escudo-concha': 1000,
      'chaleira-viva': 800,
      'coroa-aurora': 1700,
      'martelo-cometa': 1600,
      'manto-neblina': 1150,
      'semente-eterna': 1800,
      'relogio-estelar': 1500,
    };
    for (const [id, custo] of Object.entries(precos)) expect(itemMoba(id)?.custo).toBe(custo);
    expect(itemMoba('lamina-sol')?.dano).toBe(27);
    expect(itemMoba('semente-eterna')?.regeneracao).toBe(9);
  });

  it('valida receitas conhecidas, acíclicas e economicamente consistentes', () => {
    const visitar = (id: string, caminho: string[] = []): void => {
      expect(caminho).not.toContain(id);
      const i = itemMoba(id)!;
      expect(i).toBeDefined();
      const subtotal = i.receita.reduce((total, componente) => {
        expect(itemMoba(componente)).toBeDefined();
        visitar(componente, [...caminho, id]);
        return total + itemMoba(componente)!.custo;
      }, 0);
      expect(subtotal).toBeLessThan(i.custo);
    };
    for (const item of ITENS_MOBA) visitar(item.id);
  });

  it('cobra o preço integral quando faltam componentes', () => {
    const compra = custoCompra([], 'presa-veludo')!;
    expect(compra.custo).toBe(2400);
    expect(compra.consumidos).toEqual([]);
    expect(compra.inventarioRestante).toEqual([]);
  });

  it('consome uma ocorrência de cada componente repetido', () => {
    const compra = custoCompra(['lasca-sol', 'gota-lua', 'lasca-sol', 'lasca-sol'], 'lamina-sol')!;
    expect(compra.custo).toBe(400);
    expect(compra.consumidos).toEqual([0, 2]);
    expect(compra.inventarioRestante).toEqual(['gota-lua', 'lasca-sol']);
  });

  it('não usa o mesmo componente duas vezes quando só há uma peça', () => {
    const compra = custoCompra(['lasca-sol'], 'lamina-sol')!;
    expect(compra.custo).toBe(650);
    expect(compra.consumidos).toEqual([0]);
  });

  it('credita peças de receitas intermediárias sem exigir compra intermediária', () => {
    const compra = custoCompra(['lasca-sol', 'fio-vento', 'lasca-sol'], 'garras-tempestade')!;
    // Arco: lâmina + fio; lâmina: duas lascas. A receita também aceita mais uma lasca.
    expect(compra.custo).toBe(1750);
    expect(compra.consumidos).toEqual([0, 1, 2]);
    expect(compra.inventarioRestante).toEqual([]);
  });

  it('prioriza o componente completo e guarda sobras para outra receita', () => {
    const compra = custoCompra(
      ['lamina-sol', 'lasca-sol', 'fio-vento', 'gota-lua'],
      'arco-vagalume'
    )!;
    expect(compra.custo).toBe(100);
    expect(compra.consumidos).toEqual([0, 2]);
    expect(compra.inventarioRestante).toEqual(['lasca-sol', 'gota-lua']);
  });

  it('permite calcular upgrade com inventário cheio sem destruir itens antes dos guards', () => {
    const inventario = Object.freeze([
      'lamina-sol',
      'dente-rubro',
      'folha-viva',
      'gota-lua',
      'botas-brisa',
      'casca-ferro',
    ]);
    const compra = custoCompra(inventario, 'presa-veludo')!;
    expect(compra.inventarioRestante.length + 1).toBe(5);
    expect(inventario).toHaveLength(6);
    expect(inventario[0]).toBe('lamina-sol');
    const semReceita = custoCompra(inventario, 'sino-eco')!;
    expect(semReceita.inventarioRestante.length + 1).toBe(6);
    expect(inventario).toHaveLength(6);
  });

  it('não dá desconto por equipamentos alheios nem recompra o próprio item de graça', () => {
    expect(custoCompra(['presa-veludo', 'botas-brisa'], 'presa-veludo')?.custo).toBe(2400);
    expect(custoCompra(['desconhecido'], 'botas-brisa')?.custo).toBe(350);
    expect(custoCompra(['gota-lua'], 'inexistente')).toBeUndefined();
  });

  it('comprar a receita em etapas e vender nunca cria ouro', () => {
    for (const alvo of ITENS_MOBA) {
      const inventario = [...alvo.receita];
      const pagoComponentes = inventario.reduce((s, id) => s + itemMoba(id)!.custo, 0);
      const compra = custoCompra(inventario, alvo.id)!;
      expect(compra.consumidos).toHaveLength(inventario.length);
      expect(pagoComponentes + compra.custo).toBe(alvo.custo);
      expect(Math.floor(alvo.custo * 0.7)).toBeLessThan(pagoComponentes + compra.custo);
    }
  });

  it('recomenda opções para as seis classes sem mostrar componentes como build final', () => {
    for (const classe of new Set(HEROIS_MOBA.map((h) => h.classe))) {
      const opcoes = recomendadosPorClasse(classe);
      expect(opcoes.length).toBeGreaterThanOrEqual(4);
      expect(opcoes.every((i) => i.classes.includes(classe) && i.categoria !== 'componente')).toBe(
        true
      );
      expect(opcoes.some((i) => i.efeito)).toBe(true);
    }
    expect(recomendadosPorClasse('desconhecida')).toEqual([]);
    const mutavel = recomendadosPorClasse('mago');
    mutavel.length = 0;
    expect(recomendadosPorClasse('mago').length).toBeGreaterThan(0);
  });
});
