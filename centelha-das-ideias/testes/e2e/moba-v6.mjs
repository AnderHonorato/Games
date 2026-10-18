#!/usr/bin/env node
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { chromium } from 'playwright';
import { createServer } from 'vite';
const saida = resolve(process.argv[3] ?? 'artifacts/qa-v6-moba');
await mkdir(saida, { recursive: true });
let servidor, navegador;
const erros = [],
  resultados = [];
try {
  let url = process.argv[2];
  if (!url) {
    servidor = await createServer({ server: { host: '127.0.0.1', port: 4196, hmr: false } });
    await servidor.listen();
    url = 'http://127.0.0.1:4196/';
  }
  navegador = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
  });
  for (const [width, height, touch] of [
    [1440, 900, false],
    [844, 390, true],
    [640, 360, true],
  ]) {
    const contexto = await navegador.newContext({
      viewport: { width, height },
      hasTouch: touch,
      isMobile: touch,
      deviceScaleFactor: 1,
    });
    const pagina = await contexto.newPage();
    pagina.setDefaultTimeout(15000);
    pagina.on('pageerror', (e) => erros.push(e.message));
    await pagina.goto(`${url}${url.includes('?') ? '&' : '?'}modo=moba&teste=1`);
    await pagina.waitForFunction(() => window.__moba);
    assert.equal(await pagina.locator('[data-heroi]').count(), 25);
    assert.equal(
      await pagina.locator('[data-heroi] .moba-retrato svg').count(),
      25,
      'todos os heróis têm retrato ilustrado'
    );
    assert.equal(
      new Set(
        await pagina
          .locator('[data-heroi] .moba-retrato')
          .evaluateAll((es) => es.map((e) => e.innerHTML))
      ).size,
      25,
      '25 retratos originais'
    );
    await pagina.locator('[data-filtro=suporte]').click();
    assert.ok((await pagina.locator('[data-heroi]').count()) < 25);
    await pagina.locator('[data-filtro=todos]').click();
    await pagina.locator('[data-heroi=aura]').click();
    await pagina.locator('[name=rota]').selectOption('2');
    await pagina.locator('[name=dificuldade]').selectOption('iniciante');
    await pagina.screenshot({ path: resolve(saida, `menu-${width}.png`) });
    await pagina.locator('[data-acao=iniciar]').click();
    await pagina.waitForFunction(() => window.__moba.sim.estado === 'jogando');
    assert.equal(await pagina.evaluate(() => window.__moba.sim.local.rota), 2);
    assert.equal(await pagina.evaluate(() => window.__moba.sim.dificuldade), 'iniciante');
    await pagina.waitForTimeout(150);
    for (const seletor of ['.moba-status', '.moba-acoes', '.moba-minimapa', '.moba-top']) {
      const b = await pagina.locator(seletor).boundingBox();
      assert.ok(
        b.x >= 0 && b.y >= 0 && b.x + b.width <= width + 1 && b.y + b.height <= height + 1,
        `${seletor} cabe na tela ${width}`
      );
    }
    assert.equal(await pagina.locator('[data-skill] .moba-skill-icon svg').count(), 4);
    assert.ok(await pagina.locator('.moba-objetivos').isVisible());
    const hud = await pagina.locator('.moba-acoes').boundingBox();
    assert.ok(hud.height < height * 0.42, 'ações compactas preservam campo visível');
    const maxSvg = await pagina
      .locator('.moba-hud svg')
      .evaluateAll((es) => Math.max(...es.map((e) => e.getBoundingClientRect().width)));
    assert.ok(maxSvg < 80, 'nenhum SVG cobre a arena');
    await pagina.evaluate(() => {
      window.__moba.fixture('nivel');
      window.__moba.fixture('combate');
    });
    await pagina.locator('[data-skill="0"]').click();
    await pagina.waitForFunction(() => window.__moba.sim.local.recargas[0] > 0);
    await pagina.evaluate(() => {
      window.__moba.sim.local.vida *= 0.5;
    });
    await pagina.locator('[data-acao=cura]').click();
    assert.ok(await pagina.evaluate(() => window.__moba.sim.recargaFeitico('cura') > 0));
    await pagina.evaluate(() => window.__moba.fixture('loja'));
    await pagina.locator('[data-acao=loja]').click();
    await pagina.locator('[data-categoria=todos]').click();
    assert.equal(await pagina.locator('[data-item]').count(), 28);
    await pagina.locator('[data-busca]').fill('Botas');
    assert.ok((await pagina.locator('[data-item]').count()) > 0);
    assert.ok((await pagina.locator('[data-item]').count()) < 28);
    await pagina.locator('[data-item]').first().click();
    assert.equal(await pagina.evaluate(() => window.__moba.sim.local.inventario.length), 1);
    assert.equal(await pagina.locator('.moba-venda svg').count(), 1);
    await pagina.locator('[data-busca]').fill('');
    await pagina.locator('[data-categoria=magia]').click();
    assert.ok((await pagina.locator('[data-item]').count()) > 0);
    await pagina.screenshot({ path: resolve(saida, `loja-${width}.png`) });
    await pagina.locator('[data-acao=fechar]').click();
    await pagina.locator('[data-acao=placar]').click();
    assert.equal(await pagina.locator('.moba-tabela tbody tr').count(), 10);
    assert.ok(await pagina.locator('.moba-resumo-objetivos').isVisible());
    await pagina.locator('[data-acao=fechar]').click();
    await pagina.evaluate(() => window.__moba.fixture('combate'));
    await pagina.locator('[data-acao=loja]').click();
    assert.equal(
      await pagina.locator('[data-item]:not([disabled])').count(),
      0,
      'loja bloqueia compra longe da fonte'
    );
    await pagina.locator('[data-acao=fechar]').click();
    await pagina.locator('[data-acao=pausa]').click();
    const t = await pagina.evaluate(() => window.__moba.sim.tempo);
    await pagina.waitForTimeout(200);
    assert.equal(await pagina.evaluate(() => window.__moba.sim.tempo), t);
    await pagina.locator('.moba-modal [data-acao=som]').click();
    assert.equal(await pagina.evaluate(() => localStorage.getItem('centelha.moba.sons')), 'nao');
    await pagina.locator('[data-acao=continuar]').click();
    if (touch) {
      const j = await pagina.locator('.moba-joystick').boundingBox();
      assert.ok(j.width >= 80 && j.x >= 0 && j.y >= 0);
    }
    await pagina.screenshot({ path: resolve(saida, `arena-${width}.png`) });
    resultados.push({ width, height, touch, herois: 25, itens: 28 });
    await contexto.close();
  }
  assert.deepEqual(erros, []);
  await writeFile(
    resolve(saida, 'resultado.json'),
    JSON.stringify({ ok: true, resultados, erros }, null, 2)
  );
  console.log(JSON.stringify({ ok: true, resultados }));
} finally {
  await navegador?.close();
  await servidor?.close();
}
