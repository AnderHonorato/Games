#!/usr/bin/env node
/** Regressão v0.3: baseline antes do fix: em 844×390, (811,47) atingia
 * rg-toque-zona e o toque real mantinha estado=jogando. Vite e browser usam
 * a mesma árvore de processos para funcionar também em ambientes isolados. */
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { chromium } from 'playwright';
import { createServer } from 'vite';

const saida = resolve(process.argv[3] ?? 'artifacts/qa-v3');
await mkdir(saida, { recursive: true });
let server;
let browser;
const erros = [];
const resultados = [];
// Partida usa Date.now() & 0xffff para o RNG; fixar a origem torna esta sonda reproduzível.
const semente = 40403;
const instalarSemente = (context) =>
  context.addInitScript((valor) => {
    const instante = Math.floor(Date.UTC(2026, 9, 17) / 65536) * 65536 + valor;
    Date.now = () => instante;
  }, semente);
const estado = (page) => page.evaluate(() => window.__sobrevivencia.estado());
async function centro(locator) {
  const box = await locator.boundingBox();
  assert.ok(box, 'controle visível');
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}
async function tocar(page, locator) {
  const point = await centro(locator);
  const hit = await page.evaluate(
    ({ x, y }) => document.elementFromPoint(x, y)?.closest('button')?.className,
    point
  );
  assert.ok(hit, 'toque deve atingir um botão, sem camada de joystick interceptando');
  await page.touchscreen.tap(point.x, point.y);
  return { ...point, hit };
}
async function congelado(page, cinematic = false) {
  const antes = await estado(page);
  await page.evaluate(() => window.__sobrevivencia.avancar(1));
  await page.waitForTimeout(240);
  const depois = await estado(page);
  for (const k of ['tempo', 'x', 'z', 'vida', 'recargaAtaque'])
    assert.equal(depois[k], antes[k], `${k} congelado em pausa`);
  if (cinematic) assert.equal(depois.cinematica.tempo, antes.cinematica.tempo);
}
try {
  let url = process.argv[2];
  if (!url || url === '--dev') {
    server = await createServer({
      server: { host: '127.0.0.1', port: 5193, strictPort: true, watch: null, hmr: false },
    });
    await server.listen();
    url = 'http://127.0.0.1:5193/';
  }
  browser = await chromium.launch({
    args: [
      '--use-angle=swiftshader',
      '--enable-unsafe-swiftshader',
      '--ignore-gpu-blocklist',
      '--autoplay-policy=no-user-gesture-required',
    ],
  });
  const context = await browser.newContext({
    viewport: { width: 844, height: 390 },
    hasTouch: true,
    isMobile: true,
    reducedMotion: 'reduce',
  });
  await instalarSemente(context);
  console.log(`v3: semente fixa ${semente}`);
  const page = await context.newPage();
  page.setDefaultTimeout(12000);
  page.on('pageerror', (e) => erros.push(e.message));
  page.on('console', (m) => {
    if (m.type() === 'error') erros.push(m.text());
  });
  await page.goto(url);
  await page.waitForFunction(() => window.__sobrevivencia?.estado);
  await page.locator('.rg-carta-personagem').first().waitFor();
  assert.equal(await page.locator('.rg-carta-personagem').count(), 11);
  assert.match(await page.locator('.rg-menu .rg-modo-versao').textContent(), /Roguelike.*v0\.6\.0/);
  await page.setViewportSize({ width: 640, height: 360 });
  const menu = await page
    .locator('.rg-menu-conteudo')
    .evaluate((el) => ({ scroll: el.scrollHeight, height: el.clientHeight }));
  assert.ok(menu.scroll > menu.height, 'onze heróis e detalhes rolam no conteúdo');
  for (const locator of [
    page.locator('.rg-menu-base'),
    page.getByRole('button', { name: /Iniciar jornada/ }),
  ]) {
    const b = await locator.boundingBox();
    assert.ok(b.y >= 0 && b.y + b.height <= 361, 'rodapé cabe em 640×360');
  }
  const colunas = await page
    .locator('.rg-cartas-personagem')
    .evaluate((el) => getComputedStyle(el).gridTemplateColumns.split(' ').length);
  await page.evaluate(() => window.__sobrevivencia.personagem('claude'));
  await page.keyboard.press('ArrowDown');
  const esperado = [
    'claude',
    'gpt',
    'gemini',
    'llama',
    'mistral',
    'deepseek',
    'aurora',
    'nox',
    'byte',
    'aeria',
    'fenix',
  ][colunas];
  assert.equal((await estado(page)).personagem, esperado, 'teclado usa número real de colunas CSS');
  await page.screenshot({ path: resolve(saida, 'menu-640x360.png') });
  await page.setViewportSize({ width: 844, height: 390 });
  for (const id of [
    'claude',
    'gpt',
    'gemini',
    'llama',
    'mistral',
    'deepseek',
    'aurora',
    'nox',
    'byte',
    'aeria',
    'fenix',
  ]) {
    await page.evaluate((id) => {
      window.__sobrevivencia.menu();
      window.__sobrevivencia.iniciar(id);
      window.__sobrevivencia.invencivel();
    }, id);
    assert.equal(
      (await estado(page)).estado,
      'jogando',
      `${id}: joga imediatamente sem sorteio inicial`
    );
    const s = await estado(page);
    assert.equal(s.ofertas.length, 0, `${id}: nenhuma carta precisa ser escolhida para atacar`);
    assert.equal(await page.getByRole('button', { name: 'Ataque', exact: true }).isVisible(), true);
    assert.equal(await page.locator('.rg-ataque').getAttribute('data-ataque'), s.ataqueBasico.nome);
    await page.keyboard.press('j');
    await page.waitForFunction(() => window.__sobrevivencia.estado().recargaAtaque > 0);
    assert.deepEqual(
      (await estado(page)).build,
      s.build,
      `${id}: ataque pessoal não modifica cartas`
    );
    resultados.push({ personagem: id, ataque: s.ataqueBasico.nome, inicio: 'jogando', J: true });
  }
  console.log('v3: onze ataques e menu verificados');
  const pauseHit = await tocar(page, page.getByRole('button', { name: 'Pausar', exact: true }));
  await page.waitForFunction(() => window.__sobrevivencia.estado().estado === 'pausa');
  await congelado(page);
  await page
    .locator('.rg-caixa-pausa')
    .evaluate((el) => Promise.all(el.getAnimations().map((a) => a.finished)));
  await page.screenshot({ path: resolve(saida, 'pausa-844x390.png') });
  await tocar(page, page.getByRole('button', { name: 'Continuar', exact: true }));
  const retomada = (await estado(page)).tempo;
  await page.waitForFunction((t) => window.__sobrevivencia.estado().tempo > t, retomada);
  console.log('v3: pausa simples congelou e retomou');
  // Multitoque real: um dedo segura o joystick enquanto o segundo pausa.
  const cdp = await context.newCDPSession(page);
  const dedo = { x: 105, y: 285, id: 1 };
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [dedo] });
  dedo.x = 165;
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [dedo] });
  const antesMover = (await estado(page)).x;
  await page.waitForFunction((x) => window.__sobrevivencia.estado().x !== x, antesMover);
  const pausePoint = await centro(page.getByRole('button', { name: 'Pausar', exact: true }));
  await cdp.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [dedo, { ...pausePoint, id: 2 }],
  });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [dedo] });
  await page.waitForFunction(() => window.__sobrevivencia.estado().estado === 'pausa');
  console.log('v3: pausa multitoque entrou');
  await congelado(page);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await tocar(page, page.getByRole('button', { name: 'Continuar', exact: true }));
  const parado = await estado(page);
  await page.waitForTimeout(180);
  const semDedo = await estado(page);
  assert.deepEqual(semDedo.movimento, { x: 0, y: 0 }, 'retomar limpa joystick segurado');
  assert.ok(Math.abs(semDedo.x - parado.x) < 1, 'retomar só desacelera a inércia anterior');
  console.log('v3: multitoque congelou e retomou');
  await page.evaluate(() => window.__sobrevivencia.xp(100));
  await page.waitForFunction(() => window.__sobrevivencia.estado().estado === 'nivel');
  console.log('v3: cartas abertas');
  const ofertas = (await estado(page)).ofertas;
  await tocar(page, page.getByRole('button', { name: 'Pausar melhorias', exact: true }));
  await page.waitForFunction(() => window.__sobrevivencia.estado().estado === 'pausa');
  await congelado(page);
  await tocar(page, page.getByRole('button', { name: 'Continuar', exact: true }));
  assert.equal((await estado(page)).estado, 'nivel');
  assert.deepEqual((await estado(page)).ofertas, ofertas, 'retomar preserva as mesmas cartas');
  await page.evaluate(() => {
    window.__sobrevivencia.menu();
    window.__sobrevivencia.iniciar('aurora');
    window.__sobrevivencia.cinematicaTeste();
  });
  await page.locator('.rg-cinema').waitFor({ state: 'visible' });
  await tocar(page, page.getByRole('button', { name: 'Pausar', exact: true }));
  await page.waitForFunction(() => window.__sobrevivencia.estado().estado === 'pausa');
  await congelado(page, true);
  await tocar(page, page.getByRole('button', { name: 'Continuar', exact: true }));
  assert.equal((await estado(page)).estado, 'cinematica');
  console.log('v3: cartas e cinema verificados');
  // Mouse/teclado sem pointer coarse também mantém o ataque na tela.
  const interacoes = [];
  for (const tipo of ['fonte', 'totem', 'cofre']) {
    await page.evaluate((tipo) => {
      const api = window.__sobrevivencia;
      api.menu();
      api.iniciar('claude');
      api.vidaTeste(20);
      const ponto = api.pontosInteracoes().find((i) => i.tipo === tipo);
      api.posicionar(ponto.x, ponto.z);
    }, tipo);
    // A UI só é atualizada no desenho: ler estado e botão juntos evita aceitar
    // um DOM do quadro anterior ao teleporte ou ao reinício da fixture.
    const pronto = await page
      .waitForFunction((esperado) => {
        const atual = window.__sobrevivencia.estado();
        const botao = document.querySelector('.rg-usar');
        return atual.interacaoAtual?.tipo === esperado &&
          botao &&
          !botao.hidden &&
          botao.getBoundingClientRect().width > 0
          ? atual
          : false;
      }, tipo)
      .catch(async (erro) => {
        const atual = await estado(page);
        console.error('Diagnóstico da interação ausente:', {
          esperado: tipo,
          semente,
          estado: atual.estado,
          x: atual.x,
          z: atual.z,
          interacao: atual.interacaoAtual,
          pontos: await page.evaluate(() => window.__sobrevivencia.pontosInteracoes()),
          botao: await page.locator('.rg-usar').textContent(),
          atributos: await page.locator('.rg-usar').evaluate((e) => ({
            hidden: e.hidden,
            display: getComputedStyle(e).display,
          })),
        });
        throw erro;
      });
    const antes = await pronto.jsonValue();
    await pronto.dispose();
    assert.equal(antes.interacaoAtual.tipo, tipo);
    await page.screenshot({ path: resolve(saida, `interacao-${tipo}-844x390.png`) });
    await tocar(page, page.locator('.rg-usar'));
    await page.waitForFunction(() => window.__sobrevivencia.estado().interacaoAtual === null);
    const depois = await estado(page);
    if (tipo === 'fonte') assert.ok(depois.vida > antes.vida);
    if (tipo === 'totem') assert.ok(depois.invencivel > 5);
    if (tipo === 'cofre') assert.equal(depois.rerrolagens, antes.rerrolagens + 1);
    assert.equal(
      await page.evaluate(() => window.__sobrevivencia.interagir()),
      false,
      'benefício é finito'
    );
    await page.locator('.rg-usar').waitFor({ state: 'hidden' });
    interacoes.push({ tipo, usada: true, repetida: false });
  }
  await context.close();
  const desktop = await browser.newContext({ viewport: { width: 1260, height: 720 } });
  await instalarSemente(desktop);
  const desk = await desktop.newPage();
  desk.on('pageerror', (e) => erros.push(e.message));
  await desk.goto(url);
  await desk.waitForFunction(() => window.__sobrevivencia);
  await desk.evaluate(() => window.__sobrevivencia.iniciar('nox'));
  assert.equal(await desk.getByRole('button', { name: 'Ataque', exact: true }).isVisible(), true);
  await desk.getByRole('button', { name: 'Ataque', exact: true }).click();
  await desk.waitForFunction(() => window.__sobrevivencia.estado().recargaAtaque > 0);
  await desk.screenshot({ path: resolve(saida, 'jogo-1260x720.png') });
  assert.deepEqual(erros, []);
  const relatorio = {
    semente,
    pauseHit,
    personagens: resultados,
    interacoes,
    pausa: ['toque', 'joystick multitoque', 'cartas', 'cinemática'],
    erros,
  };
  await writeFile(resolve(saida, 'regressao-v3.json'), JSON.stringify(relatorio, null, 2));
  console.log(JSON.stringify(relatorio, null, 2));
} catch (erro) {
  console.error(erro);
  process.exitCode = 1;
} finally {
  // Chromium/SwiftShader pode reter processos filhos após fechar as páginas.
  const limite = setTimeout(() => process.exit(process.exitCode ?? 0), 6000);
  limite.unref();
  await browser?.close();
  await server?.close();
}
