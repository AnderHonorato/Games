#!/usr/bin/env node
/** Executa os dois modos contra o dist já compilado, com servidor próprio e sem shell. */
import { spawn } from 'node:child_process';
import { access } from 'node:fs/promises';
import { join } from 'node:path';
import { setTimeout as esperar } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import { preview } from 'vite';

const raiz = fileURLToPath(new URL('../../', import.meta.url));
const url = 'http://127.0.0.1:4183/';

async function aguardarServidor() {
  const limite = Date.now() + 15000;
  while (Date.now() < limite) {
    try {
      const resposta = await fetch(url, { signal: AbortSignal.timeout(1000) });
      await resposta.arrayBuffer();
      if (resposta.ok) return;
    } catch {
      // O servidor ainda pode estar abrindo a porta.
    }
    await esperar(100);
  }
  throw new Error(`O preview não respondeu em ${url}`);
}

function executar(script, args) {
  return new Promise((resolve, reject) => {
    const filho = spawn(process.execPath, [join(raiz, script), ...args], {
      cwd: raiz,
      stdio: 'inherit',
      shell: false,
    });
    filho.once('error', reject);
    filho.once('exit', (codigo, sinal) => {
      if (sinal) console.error(`${script} terminou pelo sinal ${sinal}.`);
      resolve(codigo ?? 1);
    });
  });
}

let servidor;
try {
  await access(join(raiz, 'dist/index.html'));
  servidor = await preview({
    root: raiz,
    clearScreen: false,
    preview: { host: '127.0.0.1', port: 4183, strictPort: true, open: false },
  });
  await aguardarServidor();
  let falhou = false;
  for (const [script, args] of [
    ['testes/e2e/paisagem.mjs', [url]],
    ['testes/e2e/campanha-v2.mjs', [url]],
    ['testes/e2e/rota.mjs', [url]],
    ['ferramentas/testar-multijogador.mjs', ['--url', url]],
  ]) {
    console.log(`\nExecutando ${script}`);
    if ((await executar(script, args)) !== 0) falhou = true;
  }
  process.exitCode = falhou ? 1 : 0;
} catch (erro) {
  console.error(erro);
  process.exitCode = 1;
} finally {
  if (servidor) {
    await new Promise((resolve, reject) => {
      servidor.httpServer.close((erro) => (erro ? reject(erro) : resolve()));
    });
  }
}
