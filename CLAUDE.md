# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

ATLAS é uma extensão do GNOME Shell 46 (GJS, ES modules): dock com lente de ampliação, ambientes, widgets e mascotes. Código, comentários, commits e docs são em português.

## Comandos

```bash
npm test                                   # node --test tests/*.test.js (só lógica pura, sem GNOME)
node --test tests/logica.test.js           # um arquivo
node --test --test-name-pattern='diasAte' tests/logica.test.js   # um teste
glib-compile-schemas --strict --dry-run atlas@joaovitor12j.dev/schemas   # valida o schema (CI)
gjs -m tests/previa-cuco.js /tmp/cuco.png  # prévias PNG dos desenhos Cairo, sem abrir o Shell (previa-*.js)
gjs -m tests/previa-temas.js /tmp          # docas dos temas de pacote (decoracao.js) para comparar com os protótipos
./pack.sh                                  # gera dist/atlas@joaovitor12j.dev.zip (extension.js de produção + app/); --ego omite o schema compilado
./install.sh                               # symlink em ~/.local/share/gnome-shell/extensions + compila schema
./prefs.sh                                 # abre o app de configuração direto via gjs (sem relogin)
./tema.sh noite                            # troca tema ao vivo via gsettings
gnome-extensions disable atlas@joaovitor12j.dev && gnome-extensions enable atlas@joaovitor12j.dev   # recarrega
journalctl -f -o cat /usr/bin/gnome-shell  # logs (prefixo [atlas])
```

CI (`.github/workflows/ci.yml`): `node --check` em cada módulo, schema em modo estrito e `npm test`.

## Arquitetura

Tudo fica em `atlas@joaovitor12j.dev/`.

- **`extension.js` é só um carregador.** O GJS guarda módulos em cache pela URL e ignora `?query`, então cada `enable()` copia todo `.js` (menos `extension.js`, `prefs.js`) para `.run-<timestamp>/`, importa `dock.js` de lá e apaga a pasta. Resultado: editar qualquer módulo ou `temas.css` vale com disable/enable; mudanças em `extension.js` e `metadata.json` exigem novo login (Wayland).
- **`dock.js`**: classe `Dock` (exportada, ciclo enable/disable, settings, ambientes, Não perturbe, menu do painel) e `DockView` (actors St/Clutter, lente, posição, auto-ocultar, prévia de janelas).
- **`widgets.js`**: base `Widget` + uma classe por widget, registradas no mapa `CLASSES` e criadas por `criarWidget(id, ...)`. Estado de widgets com tempo (POMO, CRONO, TIMER, ATIV, REDE, CLIP) vive em objetos de módulo, compartilhado entre instâncias/ambientes.
- **`mascotes.js`**: motor dos mascotes (um único temporizador agenda todos; actor efêmero, destruído ao fim da aparição). Spec e princípios em `docs/MASCOTES.md`.
- **`decoracao.js`**: vidro, tiles de app, indicadores e efeitos animados dos temas de pacote (Pixel, Materiais, Natal), portados dos protótipos em `docs/design/pacotes-de-temas`; medidas em `geometriaTema` (`logica.js`).
- **`desenho.js`**: desenho Cairo puro (anéis, gráficos, relógio, mascotes). Sem dependência do Shell, usado por widgets, mascotes, prefs e prévias.
- **`logica.js`**: lógica pura (formatação, ambientes, DND, agendamento e linha do tempo dos mascotes, easing). Testável com node; mantenha livre de imports `gi://`. Lógica nova deve vir para cá, com teste.
- **`catalogo.js`**: listas `TEMAS`, `WIDGETS`, `MASCOTES` compartilhadas entre Shell e prefs. Não pode importar St, Clutter ou `resource:///org/gnome/shell` (o `app/` roda em GTK, fora do Shell).
- **`app/`** (dentro da pasta da extensão, para viajar no zip): app de configuração (`dev.joaovitor12j.Atlas`, gjs + Adw/GTK4), processo próprio, fora do loader e sem dependência do Shell. `app/main.js` (instância única), `janela.js` (cabeçalho, palco, abas e busca), `previa.js` (palco ao vivo em Cairo), `aparencia.js` (aba Aparência em cartões), `widgets.js` (grade de widgets), `ambientes.js` (lista, diálogo de edição e atalhos), `mascotes.js` (cartões de mascotes), `estilo.css` (design "Palco", ver `docs/design/app-configuracao/`), `config.js` (abre o schema da extensão, pasta pai), `paginas.js` (linhas reutilizáveis, seletor de cidade e de app, opções dos mascotes). `prefs.js` na extensão é só um stub que abre o app (engrenagem do app Extensões); `prefs.sh` abre o app direto. Plano em `docs/APP-CONFIGURACAO.md` e `docs/APP-NATIVO.md`.
- **`clima.js`**: serviço de previsão (Open-Meteo) do módulo, dividido entre o widget Clima e os mascotes de frio e calor. **`eventos.js`**: avisos entre módulos (fim de foco do Pomodoro). **`ponte.js`** + **`protocolo.js`**: cliente e contrato D-Bus do daemon do app nativo (fase 0, `app/daemon.js`); sem daemon o widget usa o cálculo local.
- **`perf.js`**: medidor opt-in (chave `perfil-ativo`); `agendar()` é o wrapper de timers usado pelo código. Método e números em `docs/DESEMPENHO.md`.
- Config: GSettings `org.gnome.shell.extensions.atlas` (schema em `schemas/`); o dock reage ao vivo às mudanças.

### Consistência checada por `tests/estrutura.test.js`
Ao adicionar tema, widget, mascote ou chave de settings, atualizar todos os lados:
- tema: entrada em `TEMAS`, `<choice>` no schema, regras `.atlas-<id> .atlas-bg` e `.atlas-tooltip.atlas-<id>` em `temas.css`;
- widget: entrada em `WIDGETS` + `<id>: Classe` em `CLASSES` de `widgets.js`;
- toda chave lida com `get_/set_<tipo>('chave')` em dock/widgets/app/mascotes precisa existir no schema.

### Desempenho é requisito
Consumo de referência: ~0,14% de um núcleo, zero sem widgets, 2 a 5 MB. Widgets pausam com a doca escondida, no Overview e em tela cheia e só redesenham quando algo muda; mascotes não têm timer quando desligados. Preservar isso em mudanças novas.

## Outros

- `CHANGELOG.md` segue Keep a Changelog; versões seguem `version-name` do `metadata.json`. Registrar mudanças relevantes em `[Não lançado]`.
