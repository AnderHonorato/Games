# Verificação 0.6.0

Implementação do MOBA: `382e4f551179045e91a86a09668b73fe087f57c7`.
Correção de empacotamento Android: `e84215e60f7297fd0975d7b662d933e68eb729d2`.

- 532 testes passaram; TypeScript e compilação aprovados.
- UI: 1440×900, 844×390 e 640×360, com inspeção visual. Menu, rotas, dificuldade,
  itens, receitas, compra/venda, guardas, feitiços, som, ajuda e pausa exercitados.
- Mira: mouse e toque real via protocolo Chromium; arraste conjura uma vez,
  Esc cancela, pausa limpa alvo antigo e F executa Lampejo.
- Aventura e Sobrevivência preservadas: troca de modos, perfil, ataque e pausa
  passaram em 844×390, 640×360 e 1260×720.
- Arena: 67 geometrias após aquecimento, ainda 67 após três minutos simulados;
  uma textura, 32 draw calls no caso medido. Cenário em cinco meshes; FX em oito lotes limitados.
- Partida longa com jogador local inativo: 15min53s, máximo de 52 unidades e 83 objetos.
  Não é previsão da duração de todas as partidas, nem medição de FPS em celular físico.
- Revisão independente corrigiu tropas/torres atacando sem visão, salto causando dano atrás de
  obstáculos e personagens nascendo sobre o núcleo. Novos testes cobrem as regressões.

## Publicação

[MOBA](https://centelha-das-ideias-3jl76y.v2.appdeploy.ai/?modo=moba).
AppDeploy alcançou `ready` sem erros de frontend/backend.
Na URL pública, Chromium touch 844×390 verificou versão 0.6.0, seleção dos 25 heróis,
início 5×5, habilidade e pausa/ajuda. Sobrevivência gerou terreno em 10000/-17000 e atacou por toque;
Aventura concluiu a introdução até o estado jogável. Nenhum erro de página.

## Android

O empacotador agora rejeita `versionName` diferente do `package.json`; caminho de sucesso e rejeição
foram executados. O instalador é debug: as assinaturas de teste dos runners variam entre builds;
um APK novo pode ser incompatível com atualização sobre a instalação anterior.
Não foi instalado em aparelho físico nesta verificação.

O MOBA continua 5×5 contra bots locais. PvP, ranking e paridade completa com LoL/Dota não estão incluídos.

[Centelha Android — execução39171796634](https://github.com/AnderHonorato/Games/actions/runs/39171796634)
concluída com sucesso, incluindo os testes, compilação e Android Lint. Artefato12152941858.
Manifesto verificado: versionName0.6.0, versionCode6 e sensorLandscape; CRC e bloco de assinatura presentes.
Conteúdo web idêntico byte a byte à compilação testada.

- SHA-256 APK: `19b44154230eeba1384336642e38fc438be88c534ef2cb11dcd766519dd2e01c`.
- SHA-256 HTML: `b3a3a764f828b6e25570adf64cb3fe4f9d053c9dbe7c8ad61ccbda735b5bb441`.

O workflow Centelha Web ainda falha em Configurar GitHub Pages; a hospedagem AppDeploy acima funciona separadamente.
