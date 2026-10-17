/** Sonda reproduzível de população e custo de simulação; não representa FPS de aparelho. */
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { chromium } from 'playwright';

const baseline = process.argv.includes('--baseline');
const entrada = process.argv.find((a) => a.startsWith('--html='))?.slice(7) ?? 'dist/index.html';
const html = await readFile(resolve(entrada));
const server = createServer((_req, res) => {
  res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
  res.end(html);
});
await new Promise((ok) => server.listen(0, '127.0.0.1', ok));
const browser = await chromium.launch({
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
});
const erros = [];
try {
  const page = await browser.newPage({
    viewport: { width: 844, height: 390 },
    reducedMotion: 'reduce',
  });
  page.on('pageerror', (e) => erros.push(e.message));
  await page.goto(`http://127.0.0.1:${server.address().port}/?modo=roguelike`);
  await page.waitForFunction(() => window.__sobrevivencia);
  const resultado = await page.evaluate(() => {
    const a = window.__sobrevivencia;
    a.iniciar('claude');
    a.invencivel();
    const inicio = performance.now();
    a.inimigo('chiado', 1000, 18);
    const criacaoMs = performance.now() - inicio;
    const populacaoNormal = a.estado().inimigos;
    const custos = [];
    for (let n = 0; n < 4; n++) {
      const t = performance.now();
      a.avancar(0.5);
      custos.push(performance.now() - t);
    }
    a.inimigo('chefe', 30, 20);
    const populacaoComChefes = a.estado().inimigos;
    const t = a.estado().tempo;
    a.pausar(true);
    a.avancar(1);
    const pausaPreservada = a.estado().tempo === t;
    a.pausar(false);
    a.tempo(61);
    a.avancar(0.5);
    return {
      populacaoNormal,
      populacaoComChefes,
      populacaoAposHorda: a.estado().inimigos,
      criacaoMs,
      custosSimulacaoMeioSegundoMs: custos,
      pausaPreservada,
    };
  });
  assert.deepEqual(erros, [], 'sem erros de navegador durante lotação');
  assert.equal(resultado.pausaPreservada, true);
  if (!baseline) {
    assert.ok(resultado.populacaoNormal <= 98, 'reserva dois lugares para chefes');
    assert.ok(resultado.populacaoComChefes <= 100, 'chefes também respeitam o limite solo');
    assert.ok(resultado.populacaoAposHorda <= 100, 'horda respeita o mesmo limite');
  }
  await mkdir('artifacts/desempenho-v4', { recursive: true });
  await writeFile(
    `artifacts/desempenho-v4/${baseline ? 'baseline' : 'atual'}.json`,
    JSON.stringify({ baseline, ...resultado, erros }, null, 2)
  );
  console.log(JSON.stringify({ baseline, ...resultado, erros }, null, 2));
} finally {
  await browser.close();
  server.closeAllConnections();
  await new Promise((ok) => server.close(ok));
}
