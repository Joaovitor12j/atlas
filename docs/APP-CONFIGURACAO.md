# App de configuração do ATLAS

> Os nomes de arquivos deste documento são do desenho original (`dock.js`, `logica.js`, `catalogo.js`...). A estrutura atual, uma pasta por funcionalidade, está no [CLAUDE.md](../CLAUDE.md).

Plano para tirar as preferências de dentro do app Extensões e fazer delas um aplicativo próprio, com a identidade visual do ATLAS. Rascunho, nada implementado.

## É possível?

Sim. Três fatos sustentam:

1. **Já existe meio caminho.** `abrir-prefs.js` abre a janela num `Adw.Application` próprio (`dev.joaovitor12j.AtlasPrefs`), e o `install.sh` cria o `.desktop` e o ícone. O que ainda prende ao app Extensões é o `prefs.js` herdar de `ExtensionPreferences`, que vem de um gresource privado do Shell (`/usr/share/gnome-shell/org.gnome.Shell.Extensions.src.gresource`). Esse caminho pode mudar entre versões do GNOME.
2. **Há precedente aprovado no extensions.gnome.org.** O `prefs.js` do GSConnect não monta janela nenhuma: chama `gjs -m gsconnect-preferences.js` e fecha a janela recebida num `GLib.idle_add`. A engrenagem do app Extensões continua funcionando e abre o app próprio.
3. **A configuração já é toda GSettings.** O dock reage ao vivo a qualquer processo que grave no schema, então o app só precisa abrir o schema da pasta da extensão (`Gio.SettingsSchemaSource.new_from_directory`), sem API do Shell.

Ambiente desta máquina: GNOME Shell 46, gjs 1.80, GTK 4.14, libadwaita 1.5. Disponíveis: `Adw.NavigationSplitView`, `Adw.Breakpoint`, `Adw.Dialog`, `Adw.AboutDialog`. Indisponível: `Adw.AccentColor` e as variáveis CSS (`--accent-bg-color`), que só chegam no libadwaita 1.6 com GTK 4.16.

## Arquitetura

```
atlas@joaovitor12j.dev/
  prefs.js            stub: abre o app e fecha a janela do Extensões (padrão GSConnect)
  app/
    main.js           Adw.Application dev.joaovitor12j.Atlas, linha de comando (--pagina=widgets)
    config.js         abre o GSettings pelo schemas/ da extensão
    janela.js         Adw.ApplicationWindow + NavigationSplitView (barra lateral e conteúdo)
    linhas.js         _combo, _switch, _spin, _texto, _atalho (saem do prefs.js atual)
    previa.js         prévia ao vivo do dock (Gtk.DrawingArea + desenho.js)
    paginas/          geral.js, ambientes.js, widgets.js, mascotes.js, sobre.js
    estilo.css        identidade (cores nomeadas do libadwaita 1.5)
    estilo-16.css     as mesmas cores em variáveis CSS, carregado só com libadwaita >= 1.6
```

- **Pasta `app/` fica fora do loader.** `extension.js` só copia os `.js` da raiz para `.run-*`, então o app não entra no Shell e `extension.js` não muda (sem relogin).
- **Reaproveita** `catalogo.js`, `desenho.js` e `logica.js` por `../`. Eles já não dependem do Shell.
- **Uma instância só.** O `application_id` registra o app no D-Bus: abrir de novo traz a janela existente para frente e repassa `--pagina`.
- **Pontos de entrada:** menu do painel e clique direito do dock (`Dock._openPrefs` passa a chamar `gjs -m app/main.js` direto, sem `prefs.sh` nem symlink), engrenagem do app Extensões (stub), lançador no menu de aplicativos (`.desktop` do `install.sh`).
- **Desempenho:** processo separado, só existe com a janela aberta. Custo zero no Shell, igual ao app Extensões hoje.

## Identidade visual

Direção: carta náutica noturna, a mesma do antigo site do projeto (hoje fora do repositório).

- **Cores** (libadwaita 1.5 usa `@define-color`):
  `window_bg_color` e `sidebar_bg_color` `#0F1B28` (grafite), `card_bg_color` e `view_bg_color` `#16283A`, `window_fg_color` `#DCE7EE`, `accent_bg_color` `#E8A33D` (âmbar) com `accent_fg_color` escuro, divisores `#7899B8` a 22%. `Adw.StyleManager` em `FORCE_DARK`.
- **Grade de coordenadas** atrás do conteúdo, com `repeating-linear-gradient` (120 px e 24 px), como na página.
- **Tipografia:** Bricolage Grotesque nos títulos, Instrument Sans no texto, Spline Sans Mono em atalhos e números. Nenhuma está instalada; o `install.sh` copia os arquivos (licença OFL) para `~/.local/share/fonts/atlas`. Sem elas, cai para Cantarell.
- **Traço:** bordas de 1 px, cantos de 12 px só nos cartões, sem sombras suaves.
- **Barra lateral:** marca ATLAS (`icons/atlas.svg`) e versão no topo; seções Geral, Dock, Ambientes, Widgets, Mascotes, Sobre. Abaixo de ~640 px de largura a barra recolhe (`Adw.Breakpoint`).

## O que muda nas páginas

- **Geral:** no topo, a **prévia ao vivo do dock**, desenhada em Cairo com o tema, tamanho, indicador e efeito escolhidos. A lente funciona ao passar o mouse na prévia. Para isso, a conta da lente sai do `dock.js` para `logica.js` (com teste), e as cores de cada tema passam a existir também em `catalogo.js` (o `estrutura.test.js` confere contra `temas.css`).
- **Ambientes:** cartões com a cor e a inicial do ambiente e os ícones dos apps, no lugar das `ExpanderRow`. Editar abre um `Adw.Dialog`.
- **Widgets:** galeria com o tile real de cada widget (o mesmo desenho do `desenho.js`), interruptor e ordem por arrastar.
- **Mascotes:** cartões com a prévia animada (os `quadro*` de `logica.js` já existem) e o botão "Testar agora".
- **Sobre:** `Adw.AboutDialog` com versão, link da página e créditos.
- Os diálogos "Escolher cidade" e "Escolher aplicativo" passam de `Gtk.Window` para `Adw.Dialog`.

## Fases

Cada fase fecha num PR que funciona sozinho.

| Fase | Entrega | Pronto quando |
|---|---|---|
| 0. Protótipo | `app/main.js` com janela vazia, `config.js`, `estilo.css`, fontes | lê e grava uma chave, o dock reage; cores e fontes aplicadas; abrir duas vezes traz a mesma janela |
| 1. Migração | conteúdo do `prefs.js` dividido em `app/paginas/`, `prefs.js` vira stub, `_openPrefs`, `install.sh`, `.desktop`; saem `abrir-prefs.js` e `prefs.sh` (ou `prefs.sh` só chama o app) | todas as opções de hoje funcionam no app; engrenagem do Extensões abre o app; `npm test` e CI verdes |
| 2. Casca | `NavigationSplitView`, barra lateral com marca, grade, Sobre, `--pagina` | visual travado; ver o resultado em captura antes de seguir |
| 3. Prévia do dock | `previa.js`, lente em `logica.js`, cores dos temas em `catalogo.js` | a prévia muda ao vivo com tema, tamanho e indicador; lente segue o mouse |
| 4. Páginas | Ambientes em cartões, galeria de widgets, cartões de mascotes, `Adw.Dialog` | sem perda de opção em relação à fase 1 |
| 5. Acabamento | "Configurar" no clique direito de um widget abre a página certa; CHANGELOG, CLAUDE.md | |

## Testes e CI

- `tests/estrutura.test.js` lê as chaves de `prefs.js`; passa a ler `app/**/*.js`.
- CI: `node --check` também nos módulos de `app/`.
- Lógica nova (lente, cores dos temas, parse de `--pagina`) em `logica.js`/`catalogo.js`, com teste em node.
- Visual: `gjs -m app/main.js` abre direto, sem relogin nem disable/enable.

## Riscos

- **Flash da janela do Extensões** ao usar a engrenagem: aparece e fecha no mesmo instante (o GSConnect convive com isso).
- **libadwaita 1.6+** troca cores nomeadas por variáveis CSS. Por isso o `estilo-16.css` separado, carregado conforme `Adw.get_minor_version()`; o GTK 4.14 não entende `:root` e reclamaria.
- **Tema forçado escuro** ignora a preferência clara do sistema. É escolha de identidade (a página também só tem tema escuro).
- **Memória do app** aberto: um processo gjs com GTK, na casa do app Extensões. Só existe com a janela aberta.

## Decisões em aberto

1. Janela sempre na carta náutica, ou trocar de cor conforme o tema do dock escolhido (Noite, Papel, Neon...)?
2. Manter a engrenagem no app Extensões (stub) ou remover o `prefs.js` de vez?
3. Renomear o id do app de `dev.joaovitor12j.AtlasPrefs` para `dev.joaovitor12j.Atlas`?
