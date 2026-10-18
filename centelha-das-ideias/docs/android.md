# Android — Claude · A Centelha das Ideias

O APK inclui o jogo completo, com Sobrevivência, Aventura e MOBA contra bots. Abre a Sobrevivência;
o link **Aventura clássica** continua funcionando com `?modo=aventura` na mesma
origem local. Não abre o Claude nem baixa o jogo de um site. Depois de instalado,
os três modos solo funcionam sem conexão.

## Requisitos de compilação

| Ferramenta              | Versão fixada                               |
| ----------------------- | ------------------------------------------- |
| Node.js                 | 22.20.0 ou superior compatível com Vite 7   |
| pnpm                    | 10.17.1, conforme `packageManager`          |
| JDK                     | 17                                          |
| Gradle Wrapper          | 8.11.1; distribuição com SHA-256 verificado |
| Android Gradle Plugin   | 8.9.2                                       |
| Android SDK Platform    | 35                                          |
| Android SDK Build Tools | 35.0.0                                      |
| AndroidX WebKit         | 1.13.0                                      |

Instale o Android SDK pelo Android Studio ou pelas Command-line Tools oficiais.
Defina `JAVA_HOME` para o JDK 17 e `ANDROID_HOME` para o SDK. No terminal com
`sdkmanager` disponível:

```sh
sdkmanager --licenses
sdkmanager 'platform-tools' 'platforms;android-35' 'build-tools;35.0.0'
```

Alternativamente, configure `sdk.dir=/caminho/absoluto/do/sdk` em
`android/local.properties`. Esse arquivo é local e não deve entrar no Git.
Não é necessário instalar Gradle globalmente: o Wrapper baixa a versão fixada
na primeira execução. A primeira compilação requer internet para dependências;
a execução solo do APK não requer.

## Gerar e instalar o APK

Na pasta `centelha-das-ideias`:

```sh
pnpm install --frozen-lockfile
pnpm android:apk
adb install -r android/app/build/outputs/apk/debug/app-debug.apk
```

`android:apk` compila o TypeScript e o arquivo único Vite, copia `dist/` para
`android/app/build/generated/assets/web/`, executa `assembleDebug` e
`lintDebug`. A saída é um APK **debug instalável**, assinado automaticamente pela
chave debug padrão do ambiente Android. Não configura chave release nem publica
na Play Store.

Para inspecionar no Android Studio, primeiro execute `pnpm android:preparar`,
depois abra a pasta `android/`. Para repetir somente a etapa nativa:

```sh
cd android
./gradlew assembleDebug lintDebug
```

No Windows, use `gradlew.bat`. O Gradle copia os assets novamente em `preBuild`
e falha se `dist/` não existir. Sempre rode `android:preparar` após mudar o jogo.
Não versione `dist/`, `node_modules/`, diretórios `build/`, APKs ou chaves.

O workflow [Centelha Android](../../.github/workflows/centelha-android.yml)
gera o APK em pushes para `main`, pull requests e execução manual. Ao terminar,
baixe **centelha-android-debug** na seção Artifacts da execução; contém APK e
relatório do Android Lint. O workflow testa o núcleo do jogo e compila Android;
ele não executa um emulador nem valida toques ou GPU reais.

APKs debug de máquinas/execuções diferentes podem ter assinaturas diferentes.
Uma atualização com `adb install -r` só preserva os dados quando a assinatura é
a mesma. Desinstalar ou limpar dados remove salvamentos e recordes; para uma
distribuição estável futura será necessário definir uma chave de assinatura
própria, guardada fora do repositório.

## Comportamento no aparelho

- Android 8.0 (API 26) ou superior, GPU com OpenGL ES 3 e Android System WebView
  atualizado. O jogo usa Three.js/WebGL2, com aceleração de hardware habilitada.
- Orientação fixa em paisagem nos dois sentidos (`sensorLandscape`), barras do sistema ocultas; deslizar da borda
  mostra as barras temporariamente. Controles respeitam o recorte físico da tela.
- JavaScript e DOM storage habilitados. Aventura e recordes usam o mesmo
  `localStorage` persistente da origem local entre aberturas e mudanças de modo.
- Home, troca de app e bloqueio da tela pausam o jogo e o áudio. Voltar ao app
  mantém a partida pausada; toque em **Continuar** no jogo para retomar.
- A tecla/gesto Voltar pausa e oferece **Ficar no jogo** ou **Segundo plano**.
  A segunda opção preserva a Activity e a partida em memória. O salvamento da
  Aventura ocorre na pausa; uma partida de Sobrevivência em andamento não possui
  salvamento completo. Se o Android encerrar o processo, ela não será restaurada;
  o salvamento e os recordes já persistidos permanecem.
- A permissão normal `INTERNET` preserva o multijogador WebRTC já existente.
  Não há servidor embutido no APK. Para jogar junto, use o fluxo de códigos do
  menu em aparelhos na mesma rede. O APK não transforma o celular em servidor
  LAN; o fluxo de descoberta automática exige o servidor do projeto no computador.
  A conexão depende do suporte WebRTC do WebView e da rede.

## Origem e segurança

O conteúdo é servido por `WebViewAssetLoader` em
`https://appassets.androidplatform.net/assets/web/index.html`. Essa é uma origem
HTTPS reservada pelo Android para recursos do aplicativo; nenhuma requisição
desse conteúdo precisa sair do aparelho. O cliente bloqueia a navegação para
outros documentos e devolve 404 para recursos fora dos assets, inclusive quando
um arquivo local está ausente, sem recorrer à rede.

Não há `addJavascriptInterface`, permissão de arquivos, abertura automática de
janelas ou acesso `file://`. Conteúdo misto é bloqueado. A inspeção remota do
WebView fica disponível apenas na variante debug.

O host emite eventos `window` `centelha:pausar` e `centelha:retomar`. O primeiro
pausa explicitamente e salva a Aventura; o segundo só libera o áudio e nunca
retoma a partida automaticamente. O ciclo nativo chama `WebView.onPause()` e
`WebView.onResume()` e mantém a mesma WebView nas mudanças de configuração
declaradas no manifesto.

## Verificação manual de aceitação

1. Instalar em Android 8+ com WebView atualizado; ativar modo avião e abrir o app.
2. Iniciar a Sobrevivência, mover com toque e esquivar. Pausar e continuar.
3. Pressionar Home durante uma horda, esperar e retornar; conferir que o tempo
   não avança e que a tela exige **Continuar**.
4. Usar Voltar e **Ficar no jogo**; conferir pausa. Repetir com **Segundo plano**
   e reabrir pelo ícone; conferir que a partida permanece pausada.
5. No menu, abrir a Aventura, iniciar e avançar até um salvamento; pausar, fechar
   pelo seletor de apps e reabrir. Abrir Aventura e conferir **Continuar**.
6. Conferir o recorde da Sobrevivência após encerrar uma partida e reabrir o app.
7. Girar a paisagem, testar recortes de tela e navegação por gestos.
8. Com rede ativa, testar uma sala WebRTC por códigos em dois aparelhos.

## Referências oficiais

- [Carregar conteúdo local com WebViewAssetLoader](https://developer.android.com/develop/ui/views/layout/webapps/load-local-content).
- [Compatibilidade do AGP 8.9 e correções 8.9.2](https://developer.android.com/build/releases/agp-8-9-0-release-notes).
- [AndroidX WebKit: versões](https://developer.android.com/jetpack/androidx/releases/webkit).
- [Gradle Wrapper e verificação de distribuição](https://docs.gradle.org/8.11.1/userguide/gradle_wrapper.html).
