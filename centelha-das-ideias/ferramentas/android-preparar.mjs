import { cpSync, existsSync, mkdirSync, readFileSync, rmSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const somenteCopiar = process.argv.includes('--somente-copiar');
if (process.argv.slice(2).some((arg) => arg !== '--somente-copiar')) {
  throw new Error('Uso: node ferramentas/android-preparar.mjs [--somente-copiar]');
}

if (!somenteCopiar) {
  // Reutiliza a versão do pnpm que chamou o script, inclusive via corepack/npx.
  const pnpm = process.env.npm_execpath;
  const resultado = pnpm
    ? spawnSync(process.execPath, [pnpm, 'run', 'compilar'], { cwd: raiz, stdio: 'inherit' })
    : spawnSync(process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm', ['run', 'compilar'], {
        cwd: raiz,
        stdio: 'inherit',
        shell: process.platform === 'win32',
      });
  if (resultado.error) throw resultado.error;
  if (resultado.status !== 0) process.exit(resultado.status ?? 1);
}

const dist = join(raiz, 'dist');
const html = join(dist, 'index.html');
if (!existsSync(html)) {
  throw new Error('dist/index.html ausente. Execute pnpm android:preparar antes do Gradle.');
}
if (!readFileSync(html, 'utf8').includes('<html')) {
  throw new Error('dist/index.html inválido: compile o jogo antes de gerar o APK.');
}
const destino = join(raiz, 'android/app/build/generated/assets/web');
rmSync(destino, { recursive: true, force: true });
mkdirSync(dirname(destino), { recursive: true });
cpSync(dist, destino, { recursive: true });
console.log('Conteúdo offline atualizado em android/app/build/generated/assets/web.');
