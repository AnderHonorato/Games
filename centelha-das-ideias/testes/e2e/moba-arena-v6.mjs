#!/usr/bin/env node
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { chromium } from 'playwright';
import { createServer } from 'vite';
const saida = resolve('artifacts/qa-v6-arena');
await mkdir(saida, { recursive: true });
const server = await createServer({ server: { host: '127.0.0.1', port: 4197, hmr: false } });
await server.listen();
let browser;
try {
  browser = await chromium.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--use-angle=swiftshader',
      '--enable-unsafe-swiftshader',
      '--ignore-gpu-blocklist',
    ],
  });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const erros = [];
  page.on('pageerror', (e) => erros.push(e.message));
  page.on('console', (e) => {
    if (e.type() === 'error') erros.push(e.text());
  });
  await page.goto('http://127.0.0.1:4197/?modo=moba&teste=1');
  await page.waitForFunction(() => window.__moba);
  await page.screenshot({ path: resolve(saida, 'selecao.png') });
  await page.locator('[data-acao=iniciar]').click();
  await page.waitForFunction(() => window.__moba.sim.estado === 'jogando');
  await page.screenshot({ path: resolve(saida, 'base.png') });
  await page.evaluate(() => {
    window.__moba.fixture('combate');
    window.__moba.fixture('nivel');
  });
  await page.waitForTimeout(350);
  await page.screenshot({ path: resolve(saida, 'rio.png') });
  const antes = await page.evaluate(() => window.__moba.snapshot().recursos);
  const cheia = await page.evaluate(async () => {
    const sim = window.__moba.sim;
    sim.visivel = () => true;
    for (let i = 0; i < 1800; i++) sim.atualizar(1 / 60);
    Object.assign(sim.local, { x: 18, z: 18 });
    return { herois: sim.herois.length, unidades: sim.unidades.length };
  });
  await page.waitForTimeout(250);
  await page.screenshot({ path: resolve(saida, 'selva.png') });
  const aquecido = await page.evaluate(() => window.__moba.snapshot().recursos);
  // Repetir criação e limpeza de ondas não aloca recursos gráficos por unidade.
  await page.evaluate(() => {
    for (let i = 0; i < 10800; i++) window.__moba.sim.atualizar(1 / 60);
  });
  await page.waitForTimeout(180);
  const depois = await page.evaluate(() => window.__moba.snapshot().recursos);
  assert.ok(depois.geometrias <= aquecido.geometrias + 8, JSON.stringify({ aquecido, depois }));
  assert.ok(depois.drawCalls < 240, JSON.stringify(depois));
  await page.evaluate(() => {
    const sim = window.__moba.sim;
    Object.assign(sim.local, { x: 14, z: 29, vivo: true, vida: 1e6, vidaMax: 1e6 });
    for (const h of sim.herois)
      if (h.id !== sim.local.id) Object.assign(h, { vivo: false, renasceEm: 100 });
    const chefe = sim.unidades.find((u) => u.tipo === 'chefe');
    if (chefe) Object.assign(chefe, { x: 18, z: 18, vivo: true, vida: chefe.vidaMax });
  });
  await page.waitForTimeout(170);
  await page.screenshot({ path: resolve(saida, 'guardiao.png') });
  assert.deepEqual(erros, []);
  const resultado = { ok: true, antes, aquecido, depois, cheia, erros };
  await writeFile(resolve(saida, 'resultado.json'), JSON.stringify(resultado, null, 2));
  console.log(JSON.stringify(resultado));
} finally {
  await browser?.close();
  await server.close();
}
