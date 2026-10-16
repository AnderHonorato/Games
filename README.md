# Games

Projetos de jogos de Ander Honorato.

## Claude — A Centelha das Ideias

[URL web permanente (após ativar Pages)](https://anderhonorato.github.io/Games/) · [Abrir o projeto](centelha-das-ideias) · [Campanha e recursos](centelha-das-ideias/docs/campanha-v2.md) · [Android](centelha-das-ideias/docs/android.md)

Aventura 3D e sobrevivência em tela deitada. Personagens expressivos e personalizáveis,
três mundos liberados pelo XP permanente da conta, armas iniciais, avanços individuais,
chefes com apresentação, transições e cooperação com perfis de jogadores.

Na primeira publicação, ative **Settings → Pages → Build and deployment → Source: GitHub Actions** no repositório e execute **Actions → Centelha Web → Run workflow**. Depois, mudanças no jogo publicam automaticamente.

```bash
cd centelha-das-ideias
pnpm install --frozen-lockfile
pnpm iniciar
```

`pnpm compilar` gera `dist/index.html` para jogar offline. `pnpm android:apk` gera o APK debug instalável com JDK 17 e SDK 35.
O workflow **Centelha Android** disponibiliza o APK nos artefatos de cada execução.
