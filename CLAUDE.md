# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

ATLAS é uma extensão do GNOME Shell 46 (GJS, ES modules): dock com lente de ampliação, ambientes, widgets e mascotes. Código, comentários, commits e docs são em português.

## Comandos

```bash
npm test                                   # node --test tests/**/*.test.js (só lógica pura, sem GNOME)
npm run lint                               # eslint: imports, variáveis, ciclos, fronteiras entre pastas (GJS só acusa import quebrado no Shell)
node --test tests/logica.test.js           # um arquivo
node --test --test-name-pattern='diasAte' tests/logica.test.js   # um teste
glib-compile-schemas --strict --dry-run atlas@joaovitor12j.dev/schemas   # valida o schema (CI)
gjs -m tests/previa-cuco.js /tmp/cuco.png  # prévias PNG dos desenhos Cairo, sem abrir o Shell (previa-*.js)
gjs -m tests/previa-temas.js /tmp          # docas dos temas de pacote (temas/decoracao/) para comparar com os protótipos
./pack.sh                                  # gera dist/atlas@joaovitor12j.dev.zip (extension.js de produção + app/); --ego omite o schema compilado
./install.sh                               # symlink em ~/.local/share/gnome-shell/extensions + compila schema
./prefs.sh                                 # abre o app de configuração direto via gjs (sem relogin)
./tema.sh noite                            # troca tema ao vivo via gsettings
gnome-extensions disable atlas@joaovitor12j.dev && gnome-extensions enable atlas@joaovitor12j.dev   # recarrega
journalctl -f -o cat /usr/bin/gnome-shell  # logs (prefixo [atlas])
```

CI (`.github/workflows/ci.yml`): `node --check` em cada módulo, schema em modo estrito e `npm test`.

## Arquitetura

Tudo fica em `atlas@joaovitor12j.dev/`, uma pasta por funcionalidade. Cada funcionalidade é individual; quem junta todas é o `dock/`.

- **`extension.js` é só um carregador.** O GJS guarda módulos em cache pela URL e ignora `?query`, então cada `enable()` copia todo `.js` (recursivo; menos `extension.js`, `prefs.js`) para `.run-<timestamp>/`, importa `dock/index.js` de lá e apaga a pasta. Resultado: editar qualquer módulo ou `temas/temas.css` vale com disable/enable; mudanças em `extension.js` e `metadata.json` exigem novo login (Wayland).
- **Fronteiras**: `PODE` em `eslint.config.js` diz quem importa quem (`nucleo` ← `clima`/`ambientes` ← `temas`/`widgets` ← `mascotes` ← `dock`). Ciclos e imports fora do mapa quebram o `npm run lint`. O `app/` (GTK, outro processo) não pode importar, nem transitivamente, nada do Shell (`tests/estrutura.test.js`).
- **`dock/`**: `index.js` é o gerente `Dock` (enable/disable, uma doca por tela, junta painel, ambientes, mascotes). `doca.js` é a `DockView` (uma doca num monitor: ciclo de vida, config, tema, reconstrução); o resto dela vem de mixins copiados para o protótipo por `misturar` (`mixin.js`): `itens.js`, `previa.js` (prévia de janelas), `menus.js`, `posicao.js` (geometria, strut, auto-ocultar), `ampliacao.js` (lente por quadro, tooltip) e `ambientes/roda.js`. Eles usam o estado da doca (`this._c`, `this._items`). `painel.js` (dash e ícone do painel), `css.js` (carrega `temas.css`), `monitores.js`, `lente.js` e `telas.js` (contas puras).
- **`ambientes/`**: `logica.js` (puro: normalização, escolha, Não perturbe), `acoes.js` (ler/trocar no GSettings + OSD), `atalhos.js`, `roda.js`, `seguir.js` (janelas que seguem o ambiente e Não perturbe).
- **`widgets/`**: `base.js` (classe `Widget`), `index.js` (mapa `CLASSES`, `criarWidget(id, ...)`), `catalogo.js` (`WIDGETS`), `formato.js`/`amostras.js` e uma pasta por widget com `index.js` (a classe) e `logica.js` (contas puras, com teste). Estado de widgets com tempo (POMO, CRONO, TIMER, ATIV, REDE, CLIP) vive em objetos de módulo, compartilhado entre instâncias/ambientes.
- **`mascotes/`**: motor em `index.js` (um único temporizador agenda todos; actor efêmero, destruído ao fim da aparição) com colaboradores `palco.js`, `efeito.js` (efeito de época), `residente.js`, `posicao.js`; `gatilhos/<tipo>/` (horário, clima, bateria, memória, pomodoro, rede: quando um mascote deve aparecer), `personagens/<id>.js` (desenho e linha do tempo de cada um, registrados em `personagens/index.js`) e `residentes/`. Spec e princípios em `docs/MASCOTES.md`.
- **`temas/`**: `catalogo.js` (`TEMAS`, cores), `logica.js` (puro: tema efetivo, medidas, `geometriaTema`), `atual.js`, `particulas.js`, `temas.css` e `decoracao/` (vidro, tiles, indicadores e efeitos animados dos temas de pacote — Pixel, Materiais, Natal —, portados dos protótipos em `docs/design/pacotes-de-temas`).
- **`clima/`**: `servico.js` (previsão Open-Meteo, dividida entre o widget Clima e os mascotes de frio e calor), `logica.js`, `desenho.js`.
- **`nucleo/`**: `perf.js` (medidor opt-in, chave `perfil-ativo`; `agendar()` é o wrapper de timers usado pelo código; método em `docs/DESEMPENHO.md`), `eventos.js` (avisos entre módulos: fim de foco do Pomodoro), `ponte.js` + `protocolo.js` (cliente e contrato D-Bus do daemon do app nativo, fase 0, `app/daemon.js`; sem daemon o widget usa o cálculo local), `matematica.js` (easing, mola, clamp), `desenho.js` (Cairo puro: anéis, gráficos, relógio). Não conhece nenhuma funcionalidade.
- **Arquivos `logica.js`** (em `ambientes/`, `clima/`, `temas/`, `widgets/<id>/`...) são lógica pura, testável com node: nada de imports `gi://`. Lógica nova vai para o `logica.js` da funcionalidade, com teste. Arquivo que mistura `gi://` e regra pura deve ser dividido (classe em `index.js`, regra em `logica.js`).
- **`desenho.js` das áreas** (`clima/`, `mascotes/`, `nucleo/`): desenho Cairo puro, sem Shell, usado por widgets, mascotes, app e prévias.
- **Catálogos** (`temas/catalogo.js`, `widgets/catalogo.js`, `mascotes/catalogo.js`): listas compartilhadas entre Shell e app. Não podem importar St, Clutter ou `resource:///org/gnome/shell` (o `app/` roda em GTK, fora do Shell).
- **`app/`** (dentro da pasta da extensão, para viajar no zip): app de configuração (`dev.joaovitor12j.Atlas`, gjs + Adw/GTK4), processo próprio, fora do loader e sem dependência do Shell. `app/main.js` (instância única), `janela.js` (cabeçalho, palco, abas e busca), `previa.js` (palco ao vivo em Cairo), `aparencia.js` (aba Aparência em cartões), `widgets.js` (grade de widgets), `ambientes.js` (lista, diálogo de edição e atalhos), `mascotes.js` (cartões de mascotes), `estilo.css` (design "Palco", ver `docs/design/app-configuracao/`), `config.js` (abre o schema da extensão, pasta pai), `paginas.js` (linhas reutilizáveis, seletor de cidade e de app, opções dos mascotes). `prefs.js` na extensão é só um stub que abre o app (engrenagem do app Extensões); `prefs.sh` abre o app direto. Plano em `docs/APP-CONFIGURACAO.md` e `docs/APP-NATIVO.md`.
- Config: GSettings `org.gnome.shell.extensions.atlas` (schema em `schemas/`); o dock reage ao vivo às mudanças.

### Consistência checada por `tests/estrutura.test.js`
Ao adicionar tema, widget, mascote ou chave de settings, atualizar todos os lados:
- tema: entrada em `TEMAS` (`temas/catalogo.js`), `<choice>` no schema, regras `.atlas-<id> .atlas-bg` e `.atlas-tooltip.atlas-<id>` em `temas/temas.css`;
- widget: pasta `widgets/<id>/` (`index.js` + `logica.js`), entrada em `WIDGETS` (`widgets/catalogo.js`) + `<id>: Classe` em `CLASSES` de `widgets/index.js`;
- mascote: entrada em `MASCOTES` (`mascotes/catalogo.js`) + `personagens/<id>.js` registrado em `personagens/index.js`;
- toda chave lida com `get_/set_<tipo>('chave')` em qualquer módulo (dock, widgets, app, mascotes...) precisa existir no schema.

### Desempenho é requisito
Consumo de referência: ~0,14% de um núcleo, zero sem widgets, 2 a 5 MB. Widgets pausam com a doca escondida, no Overview e em tela cheia e só redesenham quando algo muda; mascotes não têm timer quando desligados. Preservar isso em mudanças novas.

## Outros

- `CHANGELOG.md` segue Keep a Changelog; versões seguem `version-name` do `metadata.json`. Registrar mudanças relevantes em `[Não lançado]`.
