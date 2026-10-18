#!/usr/bin/env node
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { chromium } from 'playwright';
import { createServer } from 'vite';
const saida = resolve(process.argv[3] ?? 'artifacts/qa-v5-moba');
await mkdir(saida, { recursive: true });
let server, browser;
const erros = [],
  resultados = [];
try {
  let url = process.argv[2];
  if (!url) {
    server = await createServer({ server: { host: '127.0.0.1', port: 4195, hmr: false } });
    await server.listen();
    url = 'http://127.0.0.1:4195/';
  }
  browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-webgl'],
  });
  for (const [width, height, touch] of [
    [1280, 800, false],
    [844, 390, true],
    [640, 360, true],
  ]) {
    console.log(`MOBA QA ${width}×${height}`);
    const context = await browser.newContext({
      viewport: { width, height },
      hasTouch: touch,
      isMobile: touch,
      deviceScaleFactor: 1,
    });
    const page = await context.newPage();
    page.setDefaultTimeout(15000);
    page.on('pageerror', (e) => erros.push(e.message));
    await page.goto(`${url}${url.includes('?') ? '&' : '?'}modo=moba&teste=1`);
    await page.waitForFunction(() => window.__moba);
    assert.equal(await page.locator('[data-heroi]').count(), 25, '25 heróis disponíveis');
    await page.locator('[data-filtro=mago]').click();
    assert.ok((await page.locator('[data-heroi]').count()) > 0);
    assert.ok((await page.locator('[data-heroi]').count()) < 25);
    await page.locator('[data-filtro=todos]').click();
    await page.locator('[data-heroi]').nth(7).click();
    const escolhido = await page.locator('.moba-detalhe h2').textContent();
    await page.screenshot({ path: resolve(saida, `selecao-${width}.png`) });
    await page.locator('[data-acao=iniciar]').click();
    await page.waitForFunction(() => window.__moba.sim.estado === 'jogando');
    assert.equal(await page.evaluate(() => window.__moba.sim.herois.length), 10);
    assert.equal(await page.evaluate(() => window.__moba.sim.local.nome), escolhido);
    assert.ok(await page.locator('.moba-minimapa').isVisible());
    const minimap = await page.locator('.moba-minimapa').boundingBox();
    assert.ok(
      minimap.x >= 0 &&
        minimap.y >= 0 &&
        minimap.x + minimap.width <= width &&
        minimap.y + minimap.height <= height
    );
    assert.ok(
      await page.evaluate(() => window.__moba.snapshot().visiveis.length < 10),
      'névoa oculta heróis distantes'
    );
    await page.evaluate(() => {
      window.__moba.fixture('nivel');
      window.__moba.fixture('combate');
    });
    const antes = await page.evaluate(() => window.__moba.sim.local.mana);
    await page.locator('[data-skill="0"]').click();
    await page.waitForFunction((m) => window.__moba.sim.local.mana < m, antes);
    assert.ok(await page.evaluate(() => window.__moba.sim.local.recargas[0] > 0));
    await page.locator('[data-acao=ataque]').click();
    await page.waitForFunction(() => window.__moba.sim.local.alvo !== null);
    await page.evaluate(() => window.__moba.fixture('loja'));
    await page.locator('[data-acao=loja]').click();
    await page.locator('[data-item]').first().click();
    assert.equal(await page.evaluate(() => window.__moba.sim.local.inventario.length), 1);
    await page.locator('[data-vender="0"]').click();
    assert.equal(await page.evaluate(() => window.__moba.sim.local.inventario.length), 0);
    // A renda passiva atualiza ouro e disponibilidade com a loja aberta, preservando o DOM.
    const primeiroItem = page.locator('[data-item]').first();
    const custo = Number((await primeiroItem.locator('b').textContent()).match(/\d+/)[0]);
    await page.evaluate((custo) => {
      window.__moba.sim.local.ouro = custo - 1;
    }, custo);
    await page.waitForFunction(() => document.querySelector('[data-item]').disabled);
    await primeiroItem.evaluate((b) => {
      b.dataset.marcaTeste = 'preservado';
    });
    await page.evaluate(() => window.__moba.sim.atualizar(1));
    await page.waitForFunction(() => !document.querySelector('[data-item]').disabled);
    assert.equal(
      await primeiroItem.getAttribute('data-marca-teste'),
      'preservado',
      'loja atualiza sem recriar botões'
    );
    assert.ok(
      Number((await page.locator('.moba-modal h2 small').textContent()).match(/\d+/)[0]) >= custo
    );
    await page.locator('[data-acao=fechar]').click();
    await page.keyboard.down('d');
    await page.waitForTimeout(100);
    await page.locator('[data-acao=pausa]').click();
    await page.keyboard.up('d');
    assert.equal(await page.evaluate(() => window.__moba.sim.estado), 'pausa');
    const pos = await page.evaluate(() => window.__moba.sim.local.x);
    await page.waitForTimeout(160);
    assert.equal(await page.evaluate(() => window.__moba.sim.local.x), pos);
    await page.locator('[data-acao=continuar]').click();
    await page.waitForTimeout(100);
    assert.ok(
      Math.abs((await page.evaluate(() => window.__moba.sim.local.x)) - pos) < 0.3,
      'soltar pausa elimina movimento preso'
    );
    // Fechar a ajuda preserva uma pausa manual e retoma somente a pausa criada pela própria ajuda.
    await page.locator('[data-acao=pausa]').click();
    for (const fechar of ['botao', 'escape']) {
      await page.locator('.moba-modal [data-acao=ajuda]').click();
      if (fechar === 'botao')
        await page.getByRole('button', { name: 'Entendi', exact: true }).click();
      else await page.keyboard.press('Escape');
      assert.equal(
        await page.evaluate(() => window.__moba.sim.estado),
        'pausa',
        'ajuda não encerra pausa manual'
      );
      assert.ok(await page.getByText('Partida pausada', { exact: true }).isVisible());
    }
    await page.locator('[data-acao=continuar]').click();
    for (const fechar of ['botao', 'escape']) {
      await page.locator('.moba-top [data-acao=ajuda]').click();
      assert.equal(await page.evaluate(() => window.__moba.sim.estado), 'pausa');
      if (fechar === 'botao')
        await page.getByRole('button', { name: 'Entendi', exact: true }).click();
      else await page.keyboard.press('Escape');
      assert.equal(
        await page.evaluate(() => window.__moba.sim.estado),
        'jogando',
        'ajuda retoma pausa que ela mesma criou'
      );
    }
    await page.keyboard.down('Tab');
    assert.ok(await page.locator('.moba-tabela').isVisible());
    await page.keyboard.up('Tab');
    assert.equal(await page.locator('.moba-tabela').count(), 0);
    if (touch) {
      const j = page.locator('.moba-joystick');
      assert.ok(await j.isVisible());
      const b = await j.boundingBox();
      assert.ok(b.width >= 80 && b.x >= 0 && b.y >= 0);
    }
    await page.screenshot({ path: resolve(saida, `arena-${width}.png`) });
    await page.evaluate(() => window.__moba.fixture('vitoria'));
    assert.ok(await page.getByText('Vitória da sua equipe!').isVisible());
    await page.locator('[data-acao=menu]').click();
    await page.locator('[data-heroi]').nth(15).click();
    const outro = await page.locator('.moba-detalhe h2').textContent();
    await page.locator('[data-acao=iniciar]').click();
    assert.equal(await page.evaluate(() => window.__moba.sim.local.nome), outro);
    resultados.push({
      width,
      height,
      touch,
      herois: 25,
      estado: await page.evaluate(() => window.__moba.sim.estado),
    });
    await context.close();
  }
  assert.deepEqual(erros, []);
  await writeFile(
    resolve(saida, 'resultado.json'),
    JSON.stringify({ ok: true, resultados, erros }, null, 2)
  );
  console.log(JSON.stringify({ ok: true, resultados }));
} finally {
  await browser?.close();
  await server?.close();
}
