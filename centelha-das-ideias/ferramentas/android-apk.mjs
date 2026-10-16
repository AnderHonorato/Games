import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const android = join(raiz, 'android');
if (process.argv.length > 2) throw new Error('Uso: node ferramentas/android-apk.mjs');

function executar(comando, args, cwd = raiz, shell = false) {
  const resultado = spawnSync(comando, args, { cwd, stdio: 'inherit', shell });
  if (resultado.error) throw resultado.error;
  if (resultado.status !== 0) process.exit(resultado.status ?? 1);
}

if (
  !process.env.ANDROID_HOME &&
  !process.env.ANDROID_SDK_ROOT &&
  !existsSync(join(android, 'local.properties'))
) {
  throw new Error(
    'SDK Android ausente. Configure ANDROID_HOME ou android/local.properties; veja docs/android.md.'
  );
}
executar('java', ['-version']);
executar(process.execPath, [join(raiz, 'ferramentas/android-preparar.mjs')]);
const windows = process.platform === 'win32';
executar(
  windows ? 'gradlew.bat' : './gradlew',
  ['--no-daemon', 'assembleDebug', 'lintDebug'],
  android,
  windows
);
console.log('APK instalável: android/app/build/outputs/apk/debug/app-debug.apk');
