/** Verifica conteúdo novo no build real sem substituir os testes de mecânica. */
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { chromium } from 'playwright';

const poderes = [
  'serpenteEletrica',
  'portalBumerangue',
  'constelacao',
  'sinoGravitacional',
  'jardimEspinhos',
  'furacaoLaminas',
  'marioneteAstral',
  'mandalaMeteoro',
  'ancoraCeleste',
  'bolhasEstase',
  'enxameVespas',
  'tempestadeEspadas',
];
const html = await readFile(new URL('../../dist/index.html', import.meta.url));
const server = createServer((_req, res) => {
  res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
  res.end(html);
});
await new Promise((ok) => server.listen(0, '127.0.0.1', ok));
const out = resolve('artifacts/visuais-v4');
await mkdir(out, { recursive: true });
const erros = [],
  resultados = [];
const browser = await chromium.launch({
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
});
try {
  const page = await browser.newPage({
    viewport: { width: 1260, height: 720 },
    reducedMotion: 'reduce',
  });
  page.on('pageerror', (e) => erros.push(e.message));
  await page.goto(`http://127.0.0.1:${server.address().port}/?modo=roguelike`);
  await page.waitForFunction(() => window.__sobrevivencia);
  for (const heroi of ['aeria', 'fenix']) {
    await page.evaluate((id) => {
      const a = window.__sobrevivencia;
      a.menu();
      a.personagem(id);
    }, heroi);
    await page.screenshot({ path: resolve(out, `${heroi}-menu.png`) });
    const estado = await page.evaluate((id) => {
      const a = window.__sobrevivencia;
      a.iniciar(id);
      a.invencivel();
      a.avancar(4);
      a.inimigo('morcegoRunico', 3, 7);
      a.inimigo('arraiaCeleste', 3, 9);
      return a.estado();
    }, heroi);
    assert.ok(estado.voo > 1 && estado.y > 1, `${heroi} deve estar voando`);
    await page.screenshot({ path: resolve(out, `${heroi}-voo.png`) });
  }
  await page.evaluate(() => {
    const a = window.__sobrevivencia;
    a.menu();
    a.iniciar('claude');
    a.invencivel();
    a.avancar(4);
    a.cristaisTeste();
  });
  await page.screenshot({ path: resolve(out, 'xp-magico.png') });
  for (const id of poderes) {
    for (const nivel of [1, 10]) {
      const r = await page.evaluate(
        ({ id, nivel }) => {
          const a = window.__sobrevivencia;
          a.menu();
          a.iniciar('claude');
          a.invencivel();
          a.avancar(4);
          a.inimigo('chefe', 1, 5);
          a.inimigo('chiado', 12, 7);
          a.habilidade(id, nivel);
          a.avancar(0.55);
          const e = a.estado();
          return {
            id,
            nivel,
            build: e.build,
            inimigos: e.inimigos,
            chefeVida: e.chefe?.vida,
            estado: e.estado,
          };
        },
        { id, nivel }
      );
      assert.ok(
        r.build.ativas.some((s) => s.id === id && s.nivel === nivel),
        `${id} equipado no nível ${nivel}`
      );
      resultados.push(r);
      if (nivel === 10) await page.screenshot({ path: resolve(out, `${id}-10.png`) });
    }
    console.log(`OK ${id} nos níveis 1/10`);
  }
  assert.deepEqual(erros, []);
  await writeFile(resolve(out, 'resultado.json'), JSON.stringify({ resultados, erros }, null, 2));
  console.log('VISUAIS V4 OK: dois voadores, XP mágico e doze poderes nos níveis 1/10.');
} finally {
  await browser.close();
  server.closeAllConnections();
  await new Promise((ok) => server.close(ok));
}
