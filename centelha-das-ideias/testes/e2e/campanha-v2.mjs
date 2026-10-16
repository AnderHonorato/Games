#!/usr/bin/env node
/** Regressão da campanha, perfil persistente e cooperação sem depender de WebRTC. */
import assert from 'node:assert/strict';
import { mkdir, readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { resolve } from 'node:path';
import { chromium } from 'playwright';

let servidor;
let url = process.argv[2] ?? '--preview';
if (url === '--preview') {
  const html = await readFile(new URL('../../dist/index.html', import.meta.url));
  servidor = createServer((req, res) => {
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
    res.end(html);
  });
  await new Promise((ok) => servidor.listen(4184, '127.0.0.1', ok));
  url = 'http://127.0.0.1:4184/';
}
const saida = resolve(process.argv[3] ?? '../../toolchain/qa-campanha');
await mkdir(saida, { recursive: true });
const erros = [];
const browser = await chromium.launch({
  args: [
    '--use-angle=swiftshader',
    '--enable-unsafe-swiftshader',
    '--ignore-gpu-blocklist',
    '--autoplay-policy=no-user-gesture-required',
  ],
});
const contexto = await browser.newContext({
  viewport: { width: 844, height: 390 },
  hasTouch: true,
  isMobile: true,
  reducedMotion: 'reduce',
});
const registrar = (page) => {
  page.on('pageerror', (e) => erros.push(e.message));
  page.on('console', (m) => {
    if (m.type() === 'error') erros.push(m.text());
  });
};
const estado = (page) => page.evaluate(() => window.__sobrevivencia.estado());
const simular = async (page, segundos) => {
  const antes = await estado(page);
  await page.evaluate((t) => window.__sobrevivencia.avancar(t), segundos);
  const depois = await estado(page);
  console.log(
    `simular ${segundos}s: ${antes.estado}/${antes.cinematica?.tipo ?? '-'} vida=${antes.vida.toFixed(1)} -> ${depois.estado}/${depois.cinematica?.tipo ?? '-'} vida=${depois.vida.toFixed(1)} nv=${depois.nivel} mapa=${depois.mapa}`
  );
};
const esperarEstado = async (page, valor) => {
  try {
    await page.waitForFunction((v) => window.__sobrevivencia.estado().estado === v, valor);
  } catch (e) {
    console.error('ESTADO NO TIMEOUT', JSON.stringify(await estado(page)));
    throw e;
  }
};
async function dentroDaTela(page, seletor) {
  const box = await seletor.boundingBox();
  const size = page.viewportSize();
  assert.ok(
    box &&
      box.x >= -1 &&
      box.y >= -1 &&
      box.x + box.width <= size.width + 1 &&
      box.y + box.height <= size.height + 1,
    'controle deve caber na tela deitada'
  );
}
async function registrarTela(page, nome) {
  if (process.env.QA_FAST === '1') return;
  await page.screenshot({ animations: 'disabled', path: resolve(saida, `${nome}-844x390.png`) });
  await page.setViewportSize({ width: 1260, height: 720 });
  await page.screenshot({ animations: 'disabled', path: resolve(saida, `${nome}-1260x720.png`) });
  await page.setViewportSize({ width: 844, height: 390 });
}
async function cinema(page, tipo) {
  await page.waitForFunction((t) => window.__sobrevivencia.estado().cinematica?.tipo === t, tipo);
  await page.locator('.rg-cinema').waitFor({ state: 'visible' });
  assert.equal(await page.locator('.rg-cinema').getAttribute('data-tipo'), tipo);
  assert.ok((await page.locator('.rg-cinema h2').textContent()).trim());
  assert.ok((await page.locator('.rg-cinema p').textContent()).trim());
}
async function terminarCinema(page) {
  // Consumir só a apresentação: 8 s também simulava vários segundos de combate
  // depois que o próprio jogo reduz a invencibilidade para 1 s.
  await page.evaluate(() => {
    const api = window.__sobrevivencia;
    const c = api.estado().cinematica;
    if (c) api.avancar(Math.max(0, c.duracao - c.tempo) + 1 / 60);
    api.invencivel();
  });
  await esperarEstado(page, 'jogando');
}
try {
  const page = await contexto.newPage();
  registrar(page);
  await page.goto(url);
  await page.waitForFunction(() => window.__sobrevivencia?.estado);
  assert.equal((await estado(page)).estado, 'menu');
  for (const aba of ['Herói', 'Ateliê', 'Mundos']) {
    const botao = page.getByRole('button', { name: aba, exact: true });
    await dentroDaTela(page, botao);
    await botao.click();
    assert.equal(await botao.getAttribute('aria-pressed'), 'true');
  }
  await page.getByRole('button', { name: 'Mundos', exact: true }).click();
  assert.equal(await page.getByRole('button', { name: /Forja das Centelhas/ }).isDisabled(), true);
  assert.equal(await page.getByRole('button', { name: /Abismo dos Ecos/ }).isDisabled(), true);
  assert.equal(await page.evaluate(() => window.__sobrevivencia.mapa('forja')), false);
  assert.equal((await estado(page)).mapa, 'jardim');
  await page.getByRole('button', { name: 'Herói', exact: true }).click();
  await page.getByRole('button', { name: /Martelo/ }).click();
  await page.getByRole('textbox', { name: 'Nome do jogador' }).fill('Lia da Centelha');
  await page.getByRole('textbox', { name: 'Nome do jogador' }).press('Tab');
  assert.equal((await estado(page)).arma, 'martelo', 'alterar nome mantém a arma selecionada');
  // O blur do nome seguido de uma seleção deve preservar o clique, mesmo que
  // o menu precise redesenhar. Não repetir clicks nem inserir waits de frames.
  await page.getByRole('textbox', { name: 'Nome do jogador' }).fill('Lia');
  await page.getByRole('button', { name: /Cajado/ }).click();
  assert.equal(
    (await estado(page)).arma,
    'cajado',
    'clique imediato após editar nome equipa a arma'
  );
  await page.getByRole('button', { name: /Martelo/ }).click();
  await page.getByRole('textbox', { name: 'Nome do jogador' }).fill('Lia da Centelha');
  await page.getByRole('textbox', { name: 'Nome do jogador' }).press('Tab');
  await page.getByRole('button', { name: 'Ateliê', exact: true }).click();
  await page.getByRole('combobox', { name: 'Traje', exact: true }).selectOption('mago');
  await page.getByRole('combobox', { name: 'Cabeça', exact: true }).selectOption('capuz');
  await page.getByRole('combobox', { name: 'Acessório', exact: true }).selectOption('asas');
  await page.getByLabel('Cor: Roupa', { exact: true }).fill('#5836bd');
  const perfil = await estado(page);
  assert.equal(perfil.nome, 'Lia da Centelha');
  assert.equal(perfil.arma, 'martelo');
  assert.equal(perfil.visual.roupa, 'mago');
  assert.equal(perfil.visual.corRoupa, '#5836bd');
  await page.reload();
  await page.waitForFunction(() => window.__sobrevivencia);
  const recarregado = await estado(page);
  assert.equal(recarregado.nome, perfil.nome);
  assert.equal(recarregado.arma, perfil.arma);
  assert.deepEqual(recarregado.visual, perfil.visual);
  await registrarTela(page, '00-menu');
  await page.getByRole('button', { name: 'Ateliê', exact: true }).click();
  assert.equal(
    await page.getByRole('combobox', { name: 'Traje', exact: true }).inputValue(),
    'mago'
  );
  await registrarTela(page, '01-atelie');
  console.log(
    'OK menu em abas, nome, roupa, cores e arma persistem após recarregar; mapas protegidos'
  );

  for (const [rotulo, id] of [
    ['Lâmina', 'lamina'],
    ['Cajado', 'cajado'],
    ['Martelo', 'martelo'],
  ]) {
    await page.getByRole('button', { name: 'Herói', exact: true }).click();
    await page.getByRole('button', { name: new RegExp(rotulo) }).click();
    await page.getByRole('button', { name: /Iniciar jornada/ }).click();
    await esperarEstado(page, 'jogando');
    await page.evaluate(() => window.__sobrevivencia.invencivel());
    assert.equal((await estado(page)).arma, id);
    await dentroDaTela(page, page.getByRole('button', { name: 'Ataque', exact: true }));
    await page.getByRole('button', { name: 'Ataque', exact: true }).tap();
    await page.waitForFunction(() => window.__sobrevivencia.estado().recargaAtaque > 0);
    await simular(page, 1.5);
    await page.keyboard.press('KeyJ');
    await page.waitForFunction(() => window.__sobrevivencia.estado().recargaAtaque > 0);
    if (id !== 'martelo') await page.evaluate(() => window.__sobrevivencia.menu());
  }
  await registrarTela(page, '02-combate');
  await page.evaluate(() => window.__sobrevivencia.xp(12));
  await esperarEstado(page, 'nivel');
  await page.evaluate(() => window.__sobrevivencia.escolher(0));
  await esperarEstado(page, 'jogando');
  assert.ok((await estado(page)).nivel > 1);
  await page.evaluate(() => window.__sobrevivencia.tempo(75));
  await simular(page, 0.1);
  await cinema(page, 'mini');
  await page.evaluate(() => window.__sobrevivencia.pausar(true));
  await esperarEstado(page, 'pausa');
  const cinePausada = (await estado(page)).cinematica.tempo;
  await simular(page, 0.5);
  assert.equal((await estado(page)).cinematica.tempo, cinePausada);
  await page.getByRole('button', { name: 'Continuar', exact: true }).click();
  await cinema(page, 'mini');
  const antes = await estado(page);
  await page.evaluate(() => window.__sobrevivencia.joystick(1, 0));
  await simular(page, 0.5);
  const durante = await estado(page);
  assert.equal(durante.tempo, antes.tempo, 'relógio da campanha congela na apresentação');
  assert.equal(durante.x, antes.x, 'movimento congela na apresentação');
  assert.equal(await page.evaluate(() => window.__sobrevivencia.atacar()), false);
  await registrarTela(page, '03-minichefe');
  await page.evaluate(() => window.__sobrevivencia.joystick(0, 0));
  await terminarCinema(page);
  await page.evaluate(() => window.__sobrevivencia.derrotarChefes());
  await page.evaluate(() => window.__sobrevivencia.tempo(180));
  await simular(page, 0.1);
  await cinema(page, 'mega');
  await registrarTela(page, '04-megachefe');
  await terminarCinema(page);
  await page.evaluate(() => window.__sobrevivencia.derrotarChefes());
  await simular(page, 0.1);
  await cinema(page, 'transicao');
  await registrarTela(page, '05-transicao');
  await terminarCinema(page);
  const proxima = await estado(page);
  assert.equal(proxima.mapa, 'forja');
  assert.ok(proxima.xpConta >= 200);
  assert.equal(proxima.nivel, 1, 'portal reinicia a força temporária');
  await registrarTela(page, '06-forja');
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  console.log(
    'OK arma por toque e J, minichefe, megachefe, apresentação congelada, XP e passagem à Forja'
  );

  await page.evaluate(() => {
    window.__sobrevivencia.menu();
    window.__sobrevivencia.contaXp(600);
    window.__sobrevivencia.mapa('jardim');
  });
  const popupPromise = page.waitForEvent('popup');
  await page.evaluate(() => {
    window.__convidado = window.open(location.href);
  });
  const guest = await popupPromise;
  registrar(guest);
  await guest.waitForFunction(() => window.__sobrevivencia);
  // O novo perfil começa zerado em um armazenamento próprio para provar o bloqueio coletivo.
  await guest.evaluate(() => {
    localStorage.removeItem('centelha-conta-v1');
  });
  await guest.reload();
  await guest.waitForFunction(() => window.__sobrevivencia);
  await guest.evaluate(() => {
    window.__sobrevivencia.nome('Noa');
    window.__sobrevivencia.personagem('gemini');
    window.__sobrevivencia.arma('cajado');
    window.__sobrevivencia.visual({ roupa: 'guardiao' });
  });
  await page.evaluate(() =>
    window.__sobrevivencia.mpMemoriaComOutraJanela(window.__convidado.__sobrevivencia)
  );
  await page.waitForFunction(() => window.__sobrevivencia.mpSala()?.membros.length === 2);
  assert.equal(
    await page.evaluate(() => window.__sobrevivencia.mapa('forja')),
    false,
    'XP de cada membro protege o acesso do grupo'
  );
  await guest.evaluate(() => window.__sobrevivencia.contaXp(200));
  await page.waitForFunction(() =>
    window.__sobrevivencia.mpSala()?.membros.some((m) => m.nome === 'Noa' && m.xpConta >= 200)
  );
  assert.equal(await page.evaluate(() => window.__sobrevivencia.mapa('forja')), true);
  await page.evaluate(() => window.__sobrevivencia.mpIniciar());
  await esperarEstado(guest, 'jogando');
  assert.equal((await estado(guest)).mapa, 'forja');
  const jogadores = await page.evaluate(() => window.__sobrevivencia.mpJogadores());
  assert.equal(jogadores.length, 2);
  assert.ok(
    jogadores.some((j) => j.nome === 'Noa' && j.arma === 'cajado' && j.visual.roupa === 'guardiao')
  );
  await page.evaluate(() => window.__sobrevivencia.invencivel());
  await guest.evaluate(() => window.__sobrevivencia.invencivel());
  await page.evaluate(() => window.__sobrevivencia.tempo(75));
  await simular(page, 0.1);
  await cinema(page, 'mini');
  await cinema(guest, 'mini');
  assert.equal((await estado(guest)).cinematica.nome, (await estado(page)).cinematica.nome);
  await terminarCinema(page);
  await esperarEstado(guest, 'jogando');
  await page.evaluate(() => window.__sobrevivencia.derrotarChefes());
  await page.evaluate(() => window.__sobrevivencia.xp(12));
  await esperarEstado(page, 'nivel');
  await esperarEstado(guest, 'nivel');
  await page.evaluate(() => window.__sobrevivencia.mpEscolher(0));
  await guest.evaluate(() => window.__sobrevivencia.mpEscolher(0));
  await esperarEstado(page, 'jogando');
  await esperarEstado(guest, 'jogando');
  assert.equal((await estado(guest)).nivel, 2);
  await guest.evaluate(() => window.__sobrevivencia.posicionar(80, 20));
  assert.equal((await estado(guest)).x, 80);
  assert.equal((await estado(guest)).z, 20);
  await page.waitForFunction(() =>
    window.__sobrevivencia.mpJogadores().some((j) => j.nome === 'Noa' && j.x > 79)
  );
  const xpAntes = [(await estado(page)).xpConta, (await estado(guest)).xpConta];
  await page.evaluate(() => window.__sobrevivencia.tempo(180));
  await simular(page, 0.1);
  await cinema(page, 'mega');
  await cinema(guest, 'mega');
  await terminarCinema(page);
  await page.evaluate(() => window.__sobrevivencia.derrotarChefes());
  await cinema(page, 'transicao');
  await cinema(guest, 'transicao');
  await terminarCinema(page);
  await guest.waitForFunction(() => {
    const s = window.__sobrevivencia.estado();
    return s.mapa === 'abismo' && s.estado === 'jogando';
  });
  for (const [i, jogador] of [page, guest].entries()) {
    const s = await estado(jogador);
    assert.equal(s.mapa, 'abismo');
    assert.equal(s.nivel, 1, 'portal reinicia nível também no convidado');
    assert.equal(s.build.ativas.length, 1);
    assert.equal(s.build.ativas[0].nivel, 1);
    assert.deepEqual(s.build.passivas, []);
    assert.ok(Math.abs(s.x) <= 3 && Math.abs(s.z) <= 3, 'portal reposiciona no spawn coletivo');
    assert.equal(
      s.xpConta,
      xpAntes[i] + 425,
      '25 XP pelo chefe + 400 de bônus da Forja chegam uma única vez a cada conta'
    );
  }
  await simular(page, 0.5);
  await guest.waitForFunction(
    (xp) => window.__sobrevivencia.estado().xpConta === xp,
    xpAntes[1] + 425
  );
  assert.equal((await estado(page)).xpConta, xpAntes[0] + 425);
  console.log(
    'OK cooperação em memória: perfis, bloqueio por XP, chefes e portal Forja→Abismo; convidado nv2 em 80/20 volta ao spawn/nv1 e recebe 25 XP pelo abate + 400 de bônus sem duplicar'
  );
  assert.deepEqual(erros, [], 'console do navegador deve ficar limpo');
  console.log('CAMPANHA V2 OK');
} finally {
  await browser.close();
  if (servidor) await new Promise((ok) => servidor.close(ok));
}
