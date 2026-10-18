# Claude — A Centelha das Ideias

Jogo 3D (Three.js), versão 0.6.0, com três modos:

- **Sobrevivência (padrão)** — roguelike: escolha uma mente (Claude, GPT, Gemini, Llama, Mistral
  ou DeepSeek, Aurora, Nox, Byte, Aeria e Fênix), sobreviva a hordas crescentes do Ruído, colete cristais de experiência e monte sua
  build com até 10 habilidades ativas e 5 passivas, cada uma evoluindo até o nível 10.
- **MOBA 5×5 contra bots** — 25 guardiões animais, seis classes, 100 habilidades, três rotas,
  torres, inibidores, núcleo, selva, loja com receitas, visão e terreno tático (abra com `?modo=moba`). Você controla um herói;
  os outros nove são bots. PvP online e partidas ranqueadas ainda não estão disponíveis.
- **Aventura clássica** — o Claude explora ilhas flutuantes onde as ideias viraram lugares
  (abra com `?modo=aventura` ou pelo link no menu).

## Jogar

- **Jogar online:** [Sobrevivência](https://centelha-das-ideias-3jl76y.v2.appdeploy.ai/?modo=roguelike) · [Aventura](https://centelha-das-ideias-3jl76y.v2.appdeploy.ai/?modo=aventura) · [MOBA](https://centelha-das-ideias-3jl76y.v2.appdeploy.ai/?modo=moba). O seletor dos três modos fica nos menus. No celular, use a tela deitada.
- **Código-fonte atual:** https://github.com/AnderHonorato/Games/tree/main/centelha-das-ideias
- **Protótipo original:** https://claude.ai/artifact/NNYiRYmQDY8fcm7PwDtSHy
- **Arquivo único (offline):** `pnpm install && pnpm compilar` e abra `dist/index.html` no navegador.
- **Android (APK offline):** `pnpm android:apk` com JDK 17 e SDK 35. O instalador sai em
  `android/app/build/outputs/apk/debug/app-debug.apk`. Instruções e limitações em [docs/android.md](docs/android.md).
  O workflow **Centelha Android** também gera o APK para download nos artefatos da execução.

O APK abre em **tela deitada**, nos dois sentidos. No navegador, gire o celular ou use
**Tela cheia horizontal** quando disponível; a trava de orientação depende do navegador.
Menus, cartas e controles foram verificados em paisagem a 844×390 e 640×360.

### Roguelike — Ascensão Arcana (0.5)

O menu apresenta o herói em 3D e permite definir nome, arma, roupas, acessórios e cores.
O XP permanente da conta libera **Jardim (0)**, **Forja (200)**, **Abismo (600)**, **Aurora (1.200)** e **Coral (2.000)**.
Esse perfil fica salvo no dispositivo; o nível e as habilidades são temporários em cada mundo.

| Ação                                      | Teclado        | Celular                            |
| ----------------------------------------- | -------------- | ---------------------------------- |
| Andar                                     | WASD ou setas  | Arrastar em qualquer lugar da tela |
| Avanço próprio do personagem              | Espaço, C ou K | Botão Avanço                       |
| Ataque da arma inicial                    | J              | Botão Ataque                       |
| Escolher carta ao subir de nível          | 1–4 ou clique  | Tocar na carta                     |
| Sortear as cartas de novo (2 por partida) | R              | Botão                              |
| Interagir com fonte/totem/baú             | E              | Usar (ao se aproximar)             |
| Pausa (volume, vozes)                     | Esc ou P       | II                                 |

Cada personagem inicia com seu ataque básico manual fixo habilitado no botão **Ataque** e em **J**.
Esse básico não depende de cartas, XP ou sorteio e não ocupa slots das habilidades.
Escolha lâmina, cajado, martelo, arco, foice, lança ou grimório antes de começar para modificar seus atributos. O ataque manual prioriza o inimigo
mais forte no alcance e usa a distância para desempatar. Cada herói tem um avanço próprio;
o Llama salta e aceita um segundo comando para esmagar o chão.
As habilidades disparam sozinhas, cada uma com recarga e velocidade próprias.

- **50 habilidades ativas** em 13 elementos (fogo, gelo, raio, luz, vento, terra, veneno,
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
- **XP mágico** em quatro valores (1, 4, 15 e 60): estrelas flutuantes, crescentes, runas e sóis com faíscas e brilho próprio instanciados.
- **Limite de população:** 100 inimigos simultâneos em solo, +20 por jogador até 160, com reserva para chefes; todos os tipos e as hordas continuam disponíveis.
- **Aeria e Fênix** voam sobre pedras baixas; árvores altas continuam bloqueando; o terreno é gerado continuamente ao caminhar. Morcegos Rúnicos e Arraias Celestes ampliam os inimigos aéreos.
- Poderes automáticos acumulam área, alcance, ritmo e unidades conforme o nível. Órbitas ganham raio, velocidade e orbes em cada nível, com centros visuais e colisões compartilhados.
- **Inimigos com cara de programação**: Vírus (se replica), Worm (rasteja em zigue-zague),
  Cavalo de Troia (um "presente" que solta vírus se você chegar perto), Loop Infinito (fecha um
  círculo em volta de você), Vazamento de Memória (deixa poças que deixam você lento), Ponteiro Nulo
  (marca o chão e se teleporta para lá) e Stack Overflow (desmonta em blocos). Cada tipo novo é
  apresentado na primeira vez que aparece.
- **Minichefe aos 5 min e Mega Chefe aos 12 min** de cada mundo, com apresentação e narrativa.
  Vencer o Mega abre uma transição para o próximo mapa, reiniciando nível e build e preservando
  o XP da conta. O Coral encerra a campanha de cinco mundos.
- **Hordas** a cada 120 s; bandos aéreos cruzam o mapa a partir de 65 s e depois em intervalos de 135–165 s. Inimigos começam mais lentos e aceleram com o tempo.
- Personagens piscam, falam, gesticulam e expressam emoções; roupas e marcos de poder
  acompanham a evolução. Cada habilidade tem uma assinatura visual e sonora própria,
  com um salto de poder no nível 10.
- **Vozes:** cada personagem fala em português (síntese de voz do navegador, com tom e ritmo
  próprios; sem voz disponível, usa bipes com entonação). Inimigos resmungam com vozes sintetizadas.
- Recorde de tempo salvo por personagem no navegador.

### MOBA — Guardiões da Centelha (0.6)

Escolha entre 25 heróis com passiva e quatro habilidades próprias, distribua pontos ao subir de nível
(até 18; ultimate disponível no nível 6) e destrua o núcleo inimigo. Há três rotas com duas torres
e um inibidor por equipe, tropas a cada 30 s, seis campos de selva e um chefe com bônus contra estruturas.
Ouro por abates e último golpe, assistência, morte e renascimento, neblina, sentinelas e sinais fazem parte da partida.
A loja tem 28 itens com componentes, receitas e seis efeitos exclusivos; há seis espaços; comprar e vender exige estar na base. Venda devolve 70% do custo.

| Ação                  | Teclado/mouse                            | Celular                      |
| --------------------- | ---------------------------------------- | ---------------------------- |
| Mover                 | Clique no terreno, setas ou segurar WASD | Joystick ou toque no terreno |
| Habilidades           | 1–4; Q/E/R; toque breve em W ao soltar   | Botões Q/W/E/R               |
| Evoluir habilidade    | Shift + Q/W/E/R                          | Botão +                      |
| Ataque básico         | J ou Espaço; clique no inimigo           | Atacar ou toque no inimigo   |
| Loja / retorno à base | B / H                                    | Loja / Retorno               |
| Lampejo / cura        | F / T                                    | Botões F / T                 |
| Sentinela / sinal     | G / P                                    | Ward / Sinal                 |
| Placar / pausa        | Tab / Esc                                | Placar / II                  |

Arraste um botão de habilidade para prever o alcance e mirar; solte para conjurar. Esc cancela o gesto.
Escolha rota e dificuldade antes de entrar. Ruínas bloqueiam movimento; moitas escondem inimigos até
um aliado entrar, uma sentinela revelar ou o inimigo atacar. Lampejo percorre até 12m sem atravessar ruínas;
Cura recupera 28% da vida e remove lentidão. Os dois feitiços têm recargas próprias.
O som do MOBA tem trilha e timbres de habilidades e pode ser desligado no HUD ou pausa.

O toque breve em W lança a segunda habilidade; para mover sem essa ação use as setas ou clique.
As partidas são locais contra bots. A cooperação da Sobrevivência continua separada e disponível.

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

Documentação: [expansão v5](docs/expansao-v5.md), [campanha v2](docs/campanha-v2.md), `docs/design.md` (seção 13 descreve a versão 3D), `docs/tecnologia.md` (referências oficiais).

O workflow **Centelha Web** valida tipos e testes e, quando Pages está habilitado, publica `dist/` no GitHub Pages. A primeira vez requer habilitar Pages em **Settings → Pages → Build and deployment → Source: GitHub Actions** e iniciar o workflow manualmente; depois, alterações no código do jogo publicam automaticamente.

O aplicativo pausa ao ir para segundo plano ou usar Voltar. Ao retornar, toque em **Continuar**;
a partida não recomeça sozinha. Na aventura, o progresso também é salvo nesses eventos.
