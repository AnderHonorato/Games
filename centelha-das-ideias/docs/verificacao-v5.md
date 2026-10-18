# Verificação da versão 0.5.0

Código do jogo: `90d540ba1bcbd324f1577b37fb70971c60e29eb4`.

- TypeScript e compilação em arquivo único aprovados; 490 testes de unidade passaram.
- MOBA: 25 modelos/100 habilidades; E2E completo em 1280×800, 844×390 e 640×360.
  As correções finais de ajuda durante pausa e atualização de preços da loja passaram em desktop.
- Aventura e Sobrevivência: troca de modos, perfil, ataque, pausa e retomada passaram nas mesmas três telas.
- Campanha: minichefe, Mega Chefe, portal e reinício de build testados, incluindo anfitrião/convidado em memória.
- Mundo contínuo: 15 viagens por coordenadas positivas/negativas e distantes; nove regiões ativas,
  24 recursos da arena e 22 texturas estáveis. Geometrias retornaram ao valor inicial após cada ciclo.
  Aurora e Coral carregaram; XP inspecionado sobre os três terrenos. Zero erros de página nos E2E concluídos.
- Uma partida longa do MOBA terminou aos 18min23s com jogador local inativo; máximos de 49 unidades e 80 objetos.
  Esse caso demonstra término e limites, não prevê duração de toda partida.

## Publicação

[Sobrevivência](https://centelha-das-ideias-3jl76y.v2.appdeploy.ai/?modo=roguelike),
[Aventura](https://centelha-das-ideias-3jl76y.v2.appdeploy.ai/?modo=aventura) e
[MOBA](https://centelha-das-ideias-3jl76y.v2.appdeploy.ai/?modo=moba).
A publicação AppDeploy alcançou `ready` sem erros de frontend/backend.
Na URL pública, seleção dos 25 heróis, início 5×5, habilidade, pausa/ajuda do MOBA,
mundo contínuo e ataque por toque da Sobrevivência foram conferidos em Chromium, touch 844×390.
Aventura pública também iniciou e concluiu o diálogo de introdução até o estado jogável, sem erros de página.

## Android

[Centelha Android — execução 39100549219](https://github.com/AnderHonorato/Games/actions/runs/39100549219):
concluída com sucesso, incluindo testes, compilação e Android Lint.
Artefato `centelha-android-debug`, ID `12125843368`.

- `versionName`: 0.5.0; `versionCode`: 5; orientação `sensorLandscape`.
- CRC dos ZIPs e bloco de assinatura APK presentes; conteúdo web idêntico byte a byte à compilação testada.
- SHA-256 APK: `b17c159bb780338f6eb4fce35083d293cff54bfee50e5a3c1f5293ff33ac0c00`.
- SHA-256 HTML: `9c8f01aa8c3a8718ffa809b8dfe523d339ee0d438a51d82c4e0e3663dcb5a0de`.

O APK é uma compilação de teste debug; não foi instalado em aparelho físico nesta validação.
O workflow Centelha Web passou pela validação do jogo, mas falhou em **Configurar GitHub Pages**;
a hospedagem pública acima funciona separadamente.

MOBA é 5×5 contra bots locais. PvP online, ranking e paridade completa com LoL/Dota ainda não estão implementados.
Medições de Chromium/SwiftShader não representam FPS de um celular físico.
