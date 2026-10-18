#!/usr/bin/env node
/** Mundo contínuo, recursos GPU e legibilidade dos novos biomas em tela touch. */
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { setTimeout as esperar } from 'node:timers/promises';
import { chromium } from 'playwright';
import { createServer } from 'vite';

const saida = resolve(process.argv[2] ?? 'artifacts/qa-v5-mundo');
await mkdir(saida, { recursive: true });
const erros = [],
  amostras = [],
  biomas = [];
let servidor, navegador, pagina;
const estado = () => pagina.evaluate(() => window.__sobrevivencia.estado());
const quadros = (n = 16) =>
  pagina.evaluate(async (n) => {
    for (let i = 0; i < n; i++) await new Promise(requestAnimationFrame);
  }, n);
async function visitar(x, z, ciclo) {
  await pagina.evaluate(({ x, z }) => window.__sobrevivencia.posicionar(x, z), { x, z });
  await quadros();
  await pagina.waitForFunction(() => window.__sobrevivencia.estado().mundo.regioes === 9);
  const s = await estado();
  assert.ok(
    Math.abs(s.x - x) < 3 && Math.abs(s.z - z) < 3,
    `posição distante preservada: ${x},${z}`
  );
  assert.ok(s.mundo.regioes <= 49, 'no máximo49 regiões');
  assert.ok(s.mundo.obstaculos > 0 && s.mundo.obstaculos <= 49 * 9);
  assert.ok(Object.values(s.recursos).every(Number.isFinite), 'contadores GPU finitos');
  const amostra = { ciclo, destino: [x, z], mundo: s.mundo, recursos: s.recursos };
  amostras.push(amostra);
  console.log('mundo-v5: região', JSON.stringify(amostra));
  return s;
}
try {
  // Outras sondas podem usar o mesmo renderizador de software da máquina.
  await esperar(10000);
  servidor = await createServer({
    server: { host: '127.0.0.1', port: 5197, strictPort: true, watch: null, hmr: false },
  });
  await servidor.listen();
  navegador = await chromium.launch({
    args: [
      '--use-angle=swiftshader',
      '--enable-unsafe-swiftshader',
      '--ignore-gpu-blocklist',
      '--autoplay-policy=no-user-gesture-required',
    ],
  });
  const contexto = await navegador.newContext({
    viewport: { width: 640, height: 360 },
    hasTouch: true,
    isMobile: true,
    reducedMotion: 'reduce',
  });
  await contexto.addInitScript(() => {
    Date.now = () => 1792259020035;
  });
  pagina = await contexto.newPage();
  pagina.setDefaultTimeout(60000);
  pagina.on('pageerror', (e) => erros.push(e.message));
  pagina.on('console', (m) => {
    if (m.type() === 'error') erros.push(m.text());
  });
  await pagina.goto('http://127.0.0.1:5197/', { timeout: 90000 });
  await pagina.waitForFunction(() => window.__sobrevivencia?.estado);
  await pagina.evaluate(() => {
    const a = window.__sobrevivencia;
    a.iniciar('claude');
    a.invencivel();
    a.pausar(true);
  });
  const rota = [
    [0, 0],
    [10000, -17000],
    [-17000, -10000],
    [-0.1, -32.1],
    [0, 0],
  ];
  for (let ciclo = 0; ciclo < 3; ciclo++) for (const [x, z] of rota) await visitar(x, z, ciclo);
  const inicial = amostras[0],
    finaisOrigem = amostras.filter((a) => a.destino[0] === 0 && a.destino[1] === 0);
  for (const a of amostras) {
    assert.equal(
      a.mundo.recursos,
      inicial.mundo.recursos,
      'recursos de arena independem de distância e revisitas'
    );
    assert.ok(
      a.recursos.geometrias <= inicial.recursos.geometrias + 140,
      'GPU tem orçamento fixo para marcos ativos'
    );
    assert.ok(
      a.recursos.texturas <= inicial.recursos.texturas + 2,
      'texturas não se acumulam com viagem'
    );
  }
  for (const a of finaisOrigem)
    assert.equal(
      a.recursos.geometrias,
      inicial.recursos.geometrias,
      'retorno à origem restaura exatamente o mesmo número de geometrias'
    );
  await pagina.evaluate(() => {
    const a = window.__sobrevivencia;
    a.pausar(false);
    a.cristaisTeste();
  });
  await quadros(8);
  await pagina.screenshot({ path: resolve(saida, 'xp-jardim-640x360.png') });
  for (const id of ['aurora', 'coral']) {
    await pagina.evaluate((id) => {
      const a = window.__sobrevivencia;
      a.menu();
      a.contaXp(3000);
      if (!a.mapa(id)) throw new Error(`mapa bloqueado: ${id}`);
      a.iniciar('claude');
      a.invencivel();
      a.posicionar(0, 0);
      a.cristaisTeste();
    }, id);
    await quadros(16);
    const s = await estado();
    assert.equal(s.mapa, id);
    assert.equal(s.mundo.regioes, 9);
    assert.ok(
      s.recursos.geometrias <= inicial.recursos.geometrias + 180,
      'troca de bioma libera recursos do anterior'
    );
    assert.ok(s.recursos.texturas <= inicial.recursos.texturas + 2);
    await pagina.screenshot({ path: resolve(saida, `xp-${id}-640x360.png`) });
    biomas.push({ mapa: id, mundo: s.mundo, recursos: s.recursos });
  }
  assert.deepEqual(erros, [], 'sem erros de navegador');
  const resultado = {
    sucesso: true,
    viewport: '640x360 touch',
    navegador: 'Chromium SwiftShader',
    viagens: amostras.length,
    amostras,
    biomas,
    erros,
  };
  await writeFile(resolve(saida, 'mundo-v5.json'), JSON.stringify(resultado, null, 2));
  console.log('mundo-v5: OK', JSON.stringify({ viagens: amostras.length, biomas, erros }));
} catch (erro) {
  console.error(erro);
  await writeFile(
    resolve(saida, 'falha.json'),
    JSON.stringify({ erro: String(erro), amostras, biomas, erros }, null, 2)
  );
  if (pagina) await pagina.screenshot({ path: resolve(saida, 'falha.png') }).catch(() => {});
  process.exitCode = 1;
} finally {
  const limite = setTimeout(() => process.exit(process.exitCode ?? 0), 6000);
  limite.unref();
  await navegador?.close();
  await servidor?.close();
}
