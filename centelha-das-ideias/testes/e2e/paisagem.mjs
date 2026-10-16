#!/usr/bin/env node
/** Valida os dois modos e seus controles em telas de celular deitadas. */
import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const origem = new URL(process.argv[2] ?? 'http://127.0.0.1:5173/');
const navegador = await chromium.launch({
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
});
const erros = [];
const aguardarMenu = (pagina) =>
  pagina.locator('.rg-menu-painel').evaluate(async (painel) => {
    await Promise.all(painel.getAnimations().map((animacao) => animacao.finished.catch(() => {})));
  });
try {
  for (const viewport of [
    { width: 844, height: 390 },
    { width: 640, height: 360 },
  ]) {
    const contexto = await navegador.newContext({ viewport, hasTouch: true, isMobile: true });
    const pagina = await contexto.newPage();
    pagina.on('pageerror', (erro) => erros.push(erro.message));
    pagina.on('console', (msg) => {
      if (msg.type() === 'error') erros.push(msg.text());
    });
    const url = new URL(origem);
    url.searchParams.delete('modo');
    await pagina.goto(url.href);
    await pagina.waitForFunction(() => window.__sobrevivencia);
    await aguardarMenu(pagina);
    const painel = await pagina.locator('.rg-menu-painel').boundingBox();
    assert.ok(
      painel &&
        painel.x >= 0 &&
        painel.y >= 0 &&
        painel.x + painel.width <= viewport.width &&
        painel.y + painel.height <= viewport.height,
      `painel do menu cabe em ${viewport.width}×${viewport.height}`
    );
    assert.equal(
      await pagina.evaluate(() => document.documentElement.scrollWidth > innerWidth),
      false,
      'menu não cria rolagem horizontal'
    );
    for (const aba of ['Herói', 'Ateliê', 'Mundos']) {
      const botao = pagina.getByRole('button', { name: aba, exact: true });
      await botao.click();
      await aguardarMenu(pagina);
      const box = await botao.boundingBox();
      assert.ok(
        box &&
          box.x >= 0 &&
          box.y >= 0 &&
          box.x + box.width <= viewport.width &&
          box.y + box.height <= viewport.height,
        `aba ${aba} cabe em ${viewport.width}×${viewport.height}`
      );
    }
    const iniciar = pagina.getByRole('button', { name: /Iniciar jornada/ });
    const menu = await iniciar.boundingBox();
    assert.ok(
      menu &&
        menu.x >= 0 &&
        menu.y >= 0 &&
        menu.x + menu.width <= viewport.width &&
        menu.y + menu.height <= viewport.height,
      'ação principal do menu cabe na tela'
    );
    await iniciar.click();
    await pagina.waitForFunction(() => window.__sobrevivencia.estado().estado === 'jogando');
    assert.equal(await pagina.locator('#tela-jogo').evaluate((e) => e.clientWidth), viewport.width);
    const dash = await pagina.getByRole('button', { name: 'Esquiva', exact: true }).boundingBox();
    assert.ok(
      dash &&
        dash.x >= 0 &&
        dash.y >= 0 &&
        dash.x + dash.width <= viewport.width &&
        dash.y + dash.height <= viewport.height
    );
    for (const nome of ['Ataque', 'Esquiva']) {
      const botao = pagina.getByRole('button', { name: nome, exact: true });
      const box = await botao.boundingBox();
      assert.ok(
        box &&
          box.x >= 0 &&
          box.y >= 0 &&
          box.x + box.width <= viewport.width &&
          box.y + box.height <= viewport.height,
        `controle ${nome} cabe em ${viewport.width}×${viewport.height}`
      );
    }
    await pagina.evaluate(() => window.dispatchEvent(new Event('centelha:pausar')));
    await pagina.getByRole('button', { name: 'Continuar', exact: true }).click();
    await pagina.waitForFunction(() => window.__sobrevivencia.estado().estado === 'jogando');
    assert.equal(
      await pagina.evaluate(() => document.documentElement.scrollWidth > innerWidth),
      false
    );

    url.searchParams.set('modo', 'aventura');
    await pagina.goto(url.href);
    await pagina.waitForFunction(() => window.__centelha);
    await pagina.getByRole('button', { name: 'Novo jogo', exact: true }).click();
    await pagina.waitForFunction(() => window.__centelha.estado().estado === 'dialogo');
    await pagina.evaluate(() => window.dispatchEvent(new Event('centelha:pausar')));
    assert.equal(await pagina.evaluate(() => window.__centelha.estado().estado), 'pausado');
    await pagina.getByRole('button', { name: 'Continuar', exact: true }).click();
    assert.equal(await pagina.evaluate(() => window.__centelha.estado().estado), 'dialogo');
    assert.equal(
      await pagina.evaluate(() => document.documentElement.scrollWidth > innerWidth),
      false
    );
    await pagina.evaluate(() => window.__centelha.jogo.voltarAoTitulo());
    await pagina.getByRole('link', { name: 'Modo Sobrevivência', exact: true }).click();
    await pagina.waitForFunction(() => window.__sobrevivencia);
    console.log(`PAISAGEM OK: ${viewport.width}×${viewport.height}, dois modos, pausa e navegação`);
    await contexto.close();
  }
  assert.deepEqual(erros, [], 'não deve haver erros do navegador');
} finally {
  await navegador.close();
}
