#!/usr/bin/env node
/** Aventura continua jogável e os dois títulos permitem trocar de modo sem perder perfil/URL. */
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { chromium } from 'playwright';
import { createServer } from 'vite';

const saida = resolve(process.argv[3] ?? 'artifacts/qa-v4-modos');
await mkdir(saida, { recursive: true });
let server;
let browser;
const erros = [];
const resultados = [];
async function cabe(page, locator, descricao) {
  const box = await locator.boundingBox();
  const viewport = page.viewportSize();
  assert.ok(box && box.width > 0 && box.height > 0, `${descricao}: visível`);
  assert.ok(
    box.x >= 0 &&
      box.y >= 0 &&
      box.x + box.width <= viewport.width + 1 &&
      box.y + box.height <= viewport.height + 1,
    `${descricao}: cabe em ${viewport.width}×${viewport.height}: ${JSON.stringify(box)}`
  );
}
async function ativar(page, locator, toque) {
  if (toque) await locator.tap();
  else await locator.click();
}
function urlPreservada(page, modo) {
  const atual = new URL(page.url());
  assert.equal(atual.searchParams.get('modo'), modo);
  assert.equal(atual.searchParams.get('teste'), 'nome com espaços');
  assert.deepEqual(atual.searchParams.getAll('extra'), ['um', 'dois']);
  assert.equal(atual.hash, '#meu-progresso');
}
try {
  let origem = process.argv[2];
  if (!origem || origem === '--dev') {
    server = await createServer({
      server: { host: '127.0.0.1', port: 5194, strictPort: true, watch: null, hmr: false },
    });
    await server.listen();
    origem = 'http://127.0.0.1:5194/';
  }
  browser = await chromium.launch({
    args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
  });
  for (const viewport of [
    { width: 844, height: 390 },
    { width: 640, height: 360 },
    { width: 1260, height: 720 },
  ]) {
    const toque = viewport.height < 500;
    const contexto = await browser.newContext({
      viewport,
      hasTouch: toque,
      isMobile: toque,
      reducedMotion: 'reduce',
    });
    const page = await contexto.newPage();
    page.setDefaultTimeout(20000);
    page.on('pageerror', (e) => erros.push(e.message));
    page.on('console', (m) => {
      if (m.type() === 'error') erros.push(m.text());
    });
    const url = new URL(origem);
    url.searchParams.delete('modo');
    url.searchParams.set('teste', 'nome com espaços');
    url.searchParams.append('extra', 'um');
    url.searchParams.append('extra', 'dois');
    url.hash = 'meu-progresso';
    await page.goto(url.href);
    await page.waitForFunction(() => window.__sobrevivencia);
    assert.equal(await page.locator('.rg-carta-personagem').count(), 11);
    assert.match(await page.locator('.rg-menu .rg-modo-versao').textContent(), /v0\.6\.0/);
    assert.equal(
      await page.locator('.rg-menu [aria-current="page"]').getAttribute('data-modo'),
      'sobrevivencia'
    );
    await cabe(page, page.locator('.rg-menu .seletor-modos'), 'troca de modos');
    await cabe(
      page,
      page.getByRole('button', { name: /Iniciar jornada/ }),
      'iniciar sobrevivência'
    );
    if (toque) {
      const scroll = await page
        .locator('.rg-menu-conteudo')
        .evaluate((e) => e.scrollHeight > e.clientHeight);
      assert.ok(scroll, '11 heróis e detalhes têm rolagem em paisagem');
    }
    await page.locator('.rg-carta-personagem').last().scrollIntoViewIfNeeded();
    await ativar(page, page.locator('.rg-carta-personagem').last(), toque);
    assert.equal(
      await page.locator('.rg-carta-personagem').last().getAttribute('aria-pressed'),
      'true'
    );
    await page.evaluate(() => {
      window.__testeSemReload = 'mesmo documento';
    });
    await page.getByRole('textbox', { name: 'Nome do jogador' }).fill('Ander Luz');
    // O blur provocado pelo link não pode re-renderizar o menu e engolir o clique.
    await page.waitForTimeout(150);
    assert.equal(await page.evaluate(() => window.__testeSemReload), 'mesmo documento');
    const perfil = await page.evaluate(() => localStorage.getItem('centelha-conta-v1'));
    await page.screenshot({
      path: resolve(saida, `sobrevivencia-${viewport.width}x${viewport.height}.png`),
    });
    const aventura = page.getByRole('link', { name: 'Modo Aventura', exact: true });
    if (toque) await aventura.tap();
    else {
      await aventura.focus();
      await page.keyboard.press('Enter');
    }
    await page.waitForFunction(() => window.__centelha);
    urlPreservada(page, 'aventura');
    assert.equal(await page.evaluate(() => localStorage.getItem('centelha-conta-v1')), perfil);
    assert.equal(await page.evaluate(() => window.__centelha.estado().estado), 'titulo');
    assert.match(
      await page.locator('.tela-titulo .modo-versao-aventura').textContent(),
      /Aventura.*v0\.6\.0/
    );
    await cabe(page, page.locator('.tela-titulo .seletor-modos'), 'modos na aventura');
    await cabe(
      page,
      page.getByRole('button', { name: 'Novo jogo', exact: true }),
      'iniciar aventura'
    );
    await page.screenshot({
      path: resolve(saida, `aventura-${viewport.width}x${viewport.height}.png`),
    });
    await ativar(page, page.getByRole('button', { name: 'Novo jogo', exact: true }), toque);
    await page.waitForFunction(() => window.__centelha.estado().estado === 'dialogo');
    await page.evaluate(() => window.dispatchEvent(new Event('centelha:pausar')));
    assert.equal(await page.evaluate(() => window.__centelha.estado().estado), 'pausado');
    await ativar(page, page.getByRole('button', { name: 'Continuar', exact: true }), toque);
    assert.equal(await page.evaluate(() => window.__centelha.estado().estado), 'dialogo');
    // Encerrar a introdução usa a própria API de diálogo, sem trocar o estado do jogo.
    await page.evaluate(() => {
      for (let i = 0; i < 40 && window.__centelha.estado().estado === 'dialogo'; i++)
        window.__centelha.escolher(null);
      window.__centelha.arma('galho');
    });
    await page.waitForFunction(() => window.__centelha.estado().estado === 'jogando');
    const posicao = await page.evaluate(() => window.__centelha.estado().x);
    await page.keyboard.down('d');
    await page.waitForFunction((x) => window.__centelha.estado().x > x + 0.1, posicao);
    await page.keyboard.up('d');
    await page.keyboard.press('j');
    await page.waitForFunction(() => window.__centelha.jogo.jogador.recargaGolpe > 0);
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => window.__centelha.estado().estado === 'pausado');
    await ativar(
      page,
      page.getByRole('button', { name: 'Salvar e ir ao título', exact: true }),
      toque
    );
    const salvo = await page.evaluate(() => localStorage.getItem('centelha-das-ideias:salvamento'));
    assert.ok(salvo, 'aventura mantém seu salvamento');
    await ativar(page, page.getByRole('link', { name: 'Modo Sobrevivência', exact: true }), toque);
    await page.waitForFunction(() => window.__sobrevivencia);
    urlPreservada(page, 'sobrevivencia');
    assert.equal(await page.locator('.rg-carta-personagem').count(), 11);
    assert.equal(
      await page.getByRole('textbox', { name: 'Nome do jogador' }).inputValue(),
      'Ander Luz'
    );
    assert.equal(await page.evaluate(() => localStorage.getItem('centelha-conta-v1')), perfil);
    assert.equal(
      await page.evaluate(() => localStorage.getItem('centelha-das-ideias:salvamento')),
      salvo
    );
    await ativar(page, page.getByRole('button', { name: /Iniciar jornada/ }), toque);
    await page.waitForFunction(() => window.__sobrevivencia.estado().estado === 'jogando');
    await page.evaluate(() => window.__sobrevivencia.invencivel());
    await page.keyboard.press('j');
    await page.waitForFunction(() => window.__sobrevivencia.estado().recargaAtaque > 0);
    await ativar(page, page.getByRole('button', { name: 'Pausar', exact: true }), toque);
    await page.waitForFunction(() => window.__sobrevivencia.estado().estado === 'pausa');
    const antes = await page.evaluate(() => window.__sobrevivencia.estado());
    await page.evaluate(() => window.__sobrevivencia.avancar(1));
    const depois = await page.evaluate(() => window.__sobrevivencia.estado());
    for (const k of ['tempo', 'x', 'z', 'vida', 'recargaAtaque']) assert.equal(depois[k], antes[k]);
    await ativar(page, page.getByRole('button', { name: 'Continuar', exact: true }), toque);
    await page.waitForFunction(() => window.__sobrevivencia.estado().estado === 'jogando');
    assert.equal(
      await page.evaluate(() => document.documentElement.scrollWidth > innerWidth),
      false
    );
    resultados.push({
      viewport,
      aventura: 'história, movimento, ataque, pausa e salvamento',
      sobrevivencia: '11 heróis, ataque e pausa',
      urlEPerfil: 'preservados',
    });
    console.log(`MODOS V4 OK: ${viewport.width}×${viewport.height}`);
    await contexto.close();
  }
  assert.deepEqual(erros, [], 'nenhum erro de navegador');
  await writeFile(resolve(saida, 'modos-v4.json'), JSON.stringify({ resultados, erros }, null, 2));
} catch (erro) {
  console.error(erro);
  process.exitCode = 1;
} finally {
  const limite = setTimeout(() => process.exit(process.exitCode ?? 0), 6000);
  limite.unref();
  await browser?.close();
  await server?.close();
}
