# Claude — A Centelha das Ideias

Jogo 3D (Three.js) com dois modos:

- **Sobrevivência (padrão)** — roguelike: escolha uma mente (Claude, GPT, Gemini, Llama, Mistral
  ou DeepSeek), sobreviva a hordas crescentes do Ruído, colete cristais de experiência e monte sua
  build com até 10 habilidades ativas e 5 passivas, cada uma evoluindo até o nível 10.
- **Aventura clássica** — o Claude explora ilhas flutuantes onde as ideias viraram lugares
  (abra com `?modo=aventura` ou pelo link no menu).

## Jogar

- **Pela web (após ativar GitHub Pages):** [abra A Centelha das Ideias](https://anderhonorato.github.io/Games/). O jogo roda no navegador de computador ou celular; em celular, use a tela na horizontal.
- **Código-fonte atual:** https://github.com/AnderHonorato/Games/tree/main/centelha-das-ideias
- **Protótipo original:** https://claude.ai/artifact/NNYiRYmQDY8fcm7PwDtSHy
- **Arquivo único (offline):** `pnpm install && pnpm compilar` e abra `dist/index.html` no navegador.
- **Android (APK offline):** `pnpm android:apk` com JDK 17 e SDK 35. O instalador sai em
  `android/app/build/outputs/apk/debug/app-debug.apk`. Instruções e limitações em [docs/android.md](docs/android.md).
  O workflow **Centelha Android** também gera o APK para download nos artefatos da execução.

O APK abre em **tela deitada**, nos dois sentidos. No navegador, gire o celular ou use
**Tela cheia horizontal** quando disponível; a trava de orientação depende do navegador.
Menus, cartas e controles foram verificados em paisagem a 844×390 e 640×360.

### Sobrevivência — Novos Mundos (0.2)

O menu apresenta o herói em 3D e permite definir nome, arma, roupas, acessórios e cores.
O XP permanente da conta libera **Jardim (0)**, **Forja (200)** e **Abismo (600)**.
Esse perfil fica salvo no dispositivo; o nível e as habilidades são temporários em cada mundo.

| Ação                                      | Teclado        | Celular                            |
| ----------------------------------------- | -------------- | ---------------------------------- |
| Andar                                     | WASD ou setas  | Arrastar em qualquer lugar da tela |
| Avanço próprio do personagem              | Espaço, C ou K | Botão Avanço                       |
| Ataque da arma inicial                    | J              | Botão Ataque                       |
| Escolher carta ao subir de nível          | 1–4 ou clique  | Tocar na carta                     |
| Sortear as cartas de novo (2 por partida) | R              | Botão                              |
| Pausa (volume, vozes)                     | Esc ou P       | II                                 |

Escolha lâmina, cajado ou martelo antes de começar. O ataque manual prioriza o inimigo
mais forte no alcance e usa a distância para desempatar. Cada herói tem um avanço próprio;
o Llama salta e aceita um segundo comando para esmagar o chão.
As habilidades disparam sozinhas, cada uma com recarga e velocidade próprias.

- **28 habilidades ativas** em 13 elementos (fogo, gelo, raio, luz, vento, terra, veneno,
  gravidade, cristal, som, arcano, água e código): órbitas, projéteis, cadeias, ondas, chicotes,
  auras, chuvas, tornados, buracos negros, lasers giratórios, ricochetes, bumerangues, poças e drones.
  Quatro são de programação: **Firewall** (anel de fogo que os inimigos não atravessam),
  **Coletor de Lixo** (puxa e apaga quem está quase sem vida), **Breakpoint** (pausa o maior grupo
  de inimigos) e **Recursão** (um bloco de código que se divide a cada acerto).
  Evoluções nos níveis 5 e 10 mudam o comportamento (ex.: a Centelha Orbital ganha um segundo
  anel girando ao contrário e, no 10, vira um Sol Particular que nunca apaga).
- **13 passivas** (vida, regeneração, velocidade, recarga, dano, área, projéteis extras, ímã,
  sorte, armadura, velocidade dos projéteis, duração e experiência).
- O que você já tem aparece bem mais nas cartas (peso 5, ou 6,5 quando a próxima escolha é
  uma evolução, contra 1 de uma nova).
- **Cristais** em quatro tamanhos (1, 4, 15 e 60 de experiência): quanto maior, mais brilha.
  Aglomerados longe do centro guardam cristais prismáticos.
- **Inimigos com cara de programação**: Vírus (se replica), Worm (rasteja em zigue-zague),
  Cavalo de Troia (um "presente" que solta vírus se você chegar perto), Loop Infinito (fecha um
  círculo em volta de você), Vazamento de Memória (deixa poças que deixam você lento), Ponteiro Nulo
  (marca o chão e se teleporta para lá) e Stack Overflow (desmonta em blocos). Cada tipo novo é
  apresentado na primeira vez que aparece.
- **Minichefe aos 75 s e Mega Chefe aos 180 s** de cada mundo, com apresentação e narrativa.
  Vencer o Mega abre uma transição para o próximo mapa, reiniciando nível e build e preservando
  o XP da conta. O Abismo encerra a campanha.
- **Hordas** a cada 60 s. Inimigos começam mais lentos e aceleram com o tempo.
- Personagens piscam, falam, gesticulam e expressam emoções; roupas e marcos de poder
  acompanham a evolução. Cada habilidade tem uma assinatura visual e sonora própria,
  com um salto de poder no nível 10.
- **Vozes:** cada personagem fala em português (síntese de voz do navegador, com tom e ritmo
  próprios; sem voz disponível, usa bipes com entonação). Inimigos resmungam com vozes sintetizadas.
- Recorde de tempo salvo por personagem no navegador.

### Multijogador local (até 4 pessoas)

Até 4 pessoas, cada uma no seu celular ou PC. No menu, toque em **Jogar junto**.
Nome, roupa e arma acompanham cada jogador. Para selecionar um mapa, todos precisam do XP exigido.

- **Na versão web:** todos abrem o link acima. Quem cria a sala toca em **Criar sala → Convidar alguém**
  e compartilha o código (ou QR). Cada convidado toca em **Entrar numa sala**, usa esse código e devolve
  o código de resposta para o anfitrião. A partida trafega diretamente entre os aparelhos por WebRTC;
  o site não guarda partidas nem exige conta.
- **Com um computador no Wi-Fi (sem códigos):** `pnpm install && pnpm compilar && pnpm lan`. Todos abrem
  o endereço que aparecer (ex.: `http://192.168.0.12:8080`); uma pessoa toca em **Criar sala** e as
  outras em **Entrar**. O computador precisa permanecer ligado durante a partida.

Na partida em grupo cada um tem personagem, build e cartas próprias; a experiência é do time. Quem
cai pode ser levantado por um colega que fique perto por 3 segundos; a partida acaba quando todos
caem. A pausa em grupo é só sua (o jogo continua para os outros e você fica protegido).

### Aventura clássica

| Ação                        | Teclado/mouse                    | Celular                                       |
| --------------------------- | -------------------------------- | --------------------------------------------- |
| Andar / correr              | WASD ou setas / Shift            | Arrastar no lado esquerdo (até a borda corre) |
| Pular                       | Espaço                           | Pular                                         |
| Atacar / especial           | J ou clique / L ou botão direito | Atacar / Especial                             |
| Esquivar                    | C ou K                           | Esquiva                                       |
| Falar / usar                | E                                | Usar                                          |
| Observar / Conectar / Criar | Q / R / F                        | botões que aparecem ao aprender               |
| Trocar arma                 | 1–6 ou roda do mouse             | Arma                                          |
| Mapa / pausa                | M / Esc                          | Mapa / II                                     |

Andar, pular e atacar funcionam ao mesmo tempo (também no toque).

## Desenvolvimento

```bash
pnpm install
pnpm iniciar          # servidor local em http://127.0.0.1:5173
pnpm tipos            # checagem de tipos
pnpm testar           # testes do núcleo e da progressão do roguelike
pnpm e2e              # compila; testa paisagem, aventura e multijogador em servidor temporário
node ferramentas/testar-multijogador.mjs   # dois aparelhos simulados jogando juntos
node testes/e2e/rota.mjs   # joga a história inteira automaticamente (precisa do servidor)
node testes/e2e/campanha-v2.mjs --preview   # perfil, chefes, portal e cooperação em memória
pnpm compilar && node ferramentas/gerar-artefato.mjs   # arquivo único + versão para publicar
```

Documentação: [campanha v2](docs/campanha-v2.md), `docs/design.md` (seção 13 descreve a versão 3D), `docs/tecnologia.md` (referências oficiais).

O workflow **Centelha Web** valida tipos e testes e publica `dist/` no GitHub Pages. A primeira vez requer habilitar Pages em **Settings → Pages → Build and deployment → Source: GitHub Actions** e iniciar o workflow manualmente; depois, alterações no código do jogo publicam automaticamente.

O aplicativo pausa ao ir para segundo plano ou usar Voltar. Ao retornar, toque em **Continuar**;
a partida não recomeça sozinha. Na aventura, o progresso também é salvo nesses eventos.
