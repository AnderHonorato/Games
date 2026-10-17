/** Inspeção do build real: novos heróis, cristais e poderes nos marcos 1/5/10. */
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { mkdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { chromium } from 'playwright';

const html = await readFile(new URL('../../dist/index.html', import.meta.url));
const server = createServer((_req, res) => {
  res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
  res.end(html);
});
await new Promise((ok) => server.listen(0, '127.0.0.1', ok));
const out = resolve('artifacts/visuais-v3');
await mkdir(out, { recursive: true });
const errors = [];
const browser = await chromium.launch({
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
});
try {
  const page = await browser.newPage({
    viewport: { width: 1260, height: 720 },
    reducedMotion: 'reduce',
  });
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(`http://127.0.0.1:${server.address().port}/`);
  await page.waitForFunction(() => window.__sobrevivencia);
  for (const hero of ['aurora', 'nox', 'byte']) {
    await page.evaluate((id) => {
      window.__sobrevivencia.menu();
      window.__sobrevivencia.personagem(id);
    }, hero);
    await page.waitForTimeout(350);
    await page.screenshot({ path: resolve(out, `${hero}.png`) });
  }
  await page.evaluate(() => {
    window.__sobrevivencia.iniciar('claude');
    window.__sobrevivencia.invencivel();
    window.__sobrevivencia.cristaisTeste();
  });
  await page.waitForTimeout(350);
  await page.screenshot({ path: resolve(out, 'xp.png') });
  for (const id of ['tremFantasma', 'dadosCaoticos', 'espelhoPrismatico', 'orquestraOrbital']) {
    for (const level of [1, 5, 10]) {
      await page.evaluate(
        ({ id, level }) => {
          const a = window.__sobrevivencia;
          a.menu();
          a.iniciar('claude');
          a.invencivel();
          a.inimigo('chefe', 5, 7);
          a.habilidade(id, level);
          a.avancar(0.65);
        },
        { id, level }
      );
      await page.waitForTimeout(130);
      await page.screenshot({ path: resolve(out, `${id}-${level}.png`) });
    }
    console.log(`OK ${id}: níveis 1, 5 e 10 renderizados`);
  }
  assert.deepEqual(errors, [], 'novos conteúdos devem renderizar sem erros');
  console.log('VISUAIS V3 OK: três heróis, XP e quatro poderes em três níveis');
} finally {
  await browser.close();
  await new Promise((ok) => server.close(ok));
}
