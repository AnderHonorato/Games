import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { createServer } from 'vite';
import { mkdir, writeFile } from 'node:fs/promises';
const server = await createServer({
  server: { host: '127.0.0.1', port: 4198, strictPort: true, hmr: false, watch: null },
});
await server.listen();
const browser = await chromium.launch({
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
});
const errors = [],
  results = [];
try {
  for (const touch of [false, true]) {
    const context = await browser.newContext({
      viewport: { width: 844, height: 390 },
      hasTouch: touch,
      isMobile: touch,
    });
    const page = await context.newPage();
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto('http://127.0.0.1:4198/?modo=moba&teste=1');
    await page.waitForFunction(() => window.__moba);
    await page.locator('[data-heroi=brasa]').click();
    await page.locator('[data-acao=iniciar]').click();
    await page.evaluate(() => {
      const a = window.__moba;
      a.fixture('nivel');
      a.fixture('combate');
      const original = a.sim.habilidade.bind(a.sim);
      window.__casts = [];
      a.sim.habilidade = (...args) => {
        window.__casts.push(args);
        return original(...args);
      };
    });
    const b = await page.locator('[data-skill="0"]').boundingBox(),
      x = b.x + b.width / 2,
      y = b.y + b.height / 2;
    const cdp = touch ? await context.newCDPSession(page) : null;
    async function gesture(cancel) {
      if (touch) {
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
        await cdp.send('Input.dispatchTouchEvent', {
          type: 'touchMove',
          touchPoints: [{ x: x - 70, y: y - 50 }],
        });
      } else {
        await page.mouse.move(x, y);
        await page.mouse.down();
        await page.mouse.move(x - 70, y - 50, { steps: 5 });
      }
      if (cancel) await page.keyboard.press('Escape');
      if (touch) await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      else await page.mouse.up();
    }
    await gesture(false);
    await page.waitForFunction(() => window.__casts.length === 1);
    let cast = await page.evaluate(() => window.__casts[0]);
    assert.equal(cast[0], 0);
    assert.ok(Number.isFinite(cast[1]) && Number.isFinite(cast[2]));
    assert.ok(Math.hypot(cast[1], cast[2]) <= 13.01, 'mira dentro do alcance');
    await page.evaluate(() => {
      window.__casts = [];
      window.__moba.sim.local.recargas[0] = 0;
    });
    await gesture(true);
    await page.waitForTimeout(100);
    assert.equal(
      await page.evaluate(() => window.__casts.length),
      0,
      'Esc cancela sem disparar ao soltar'
    );
    assert.equal(await page.evaluate(() => window.__moba.sim.estado), 'jogando');
    await page.locator('[data-acao=pausa]').click();
    await page.locator('[data-acao=continuar]').click();
    await page.evaluate(() => {
      window.__casts = [];
      window.__moba.sim.local.recargas[0] = 0;
    });
    if (touch) await page.locator('[data-skill="0"]').tap();
    else await page.locator('[data-skill="0"]').click();
    await page.waitForFunction(() => window.__casts.length === 1);
    cast = await page.evaluate(() => window.__casts[0]);
    assert.equal(cast[1], undefined, 'pausa limpa alvo antigo');
    await page.keyboard.press('f');
    assert.ok(await page.evaluate(() => window.__moba.sim.recargaFeitico('lampejo') > 0));
    results.push({ touch, arraste: true, cancelamento: true, tap: true, lampejo: true });
    await context.close();
  }
  assert.deepEqual(errors, []);
  await mkdir('artifacts/qa-v6-mira', { recursive: true });
  await writeFile(
    'artifacts/qa-v6-mira/resultado.json',
    JSON.stringify({ ok: true, results, errors }, null, 2)
  );
  console.log(JSON.stringify({ ok: true, results, errors }));
} finally {
  await browser.close();
  await server.close();
}
