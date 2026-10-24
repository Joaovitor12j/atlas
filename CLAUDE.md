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
./install.sh                               # symlink em ~/.local/share/gnome-shell/extensions + compila schema
./prefs.sh                                 # abre as preferências direto via gjs (sem relogin)
./tema.sh noite                            # troca tema ao vivo via gsettings
gnome-extensions disable atlas@joaovitor12j.dev && gnome-extensions enable atlas@joaovitor12j.dev   # recarrega
journalctl -f -o cat /usr/bin/gnome-shell  # logs (prefixo [atlas])
```

CI (`.github/workflows/ci.yml`): `node --check` em cada módulo, schema em modo estrito e `npm test`.

## Arquitetura

Tudo fica em `atlas@joaovitor12j.dev/`.

- **`extension.js` é só um carregador.** O GJS guarda módulos em cache pela URL e ignora `?query`, então cada `enable()` copia todo `.js` (menos `extension.js`, `prefs.js`, `abrir-prefs.js`) para `.run-<timestamp>/`, importa `dock.js` de lá e apaga a pasta. Resultado: editar qualquer módulo, `temas.css` ou `prefs.js` vale com disable/enable; mudanças em `extension.js` e `metadata.json` exigem novo login (Wayland).
- **`dock.js`**: classe `Dock` (exportada, ciclo enable/disable, settings, ambientes, Não perturbe, menu do painel) e `DockView` (actors St/Clutter, lente, posição, auto-ocultar, prévia de janelas).
- **`widgets.js`**: base `Widget` + uma classe por widget, registradas no mapa `CLASSES` e criadas por `criarWidget(id, ...)`. Estado de widgets com tempo (POMO, CRONO, TIMER, ATIV, REDE, CLIP) vive em objetos de módulo, compartilhado entre instâncias/ambientes.
- **`mascotes.js`**: motor dos mascotes (um único temporizador agenda todos; actor efêmero, destruído ao fim da aparição). Spec e princípios em `docs/MASCOTES.md`.
- **`desenho.js`**: desenho Cairo puro (anéis, gráficos, relógio, mascotes). Sem dependência do Shell, usado por widgets, mascotes, prefs e prévias.
- **`logica.js`**: lógica pura (formatação, ambientes, DND, agendamento e linha do tempo dos mascotes, easing). Testável com node; mantenha livre de imports `gi://`. Lógica nova deve vir para cá, com teste.
- **`catalogo.js`**: listas `TEMAS`, `WIDGETS`, `MASCOTES` compartilhadas entre Shell e prefs. Não pode importar St, Clutter ou `resource:///org/gnome/shell` (o `prefs.js` roda em GTK, fora do Shell).
- **`prefs.js`**: janela Adw/GTK4. `abrir-prefs.js` (via `prefs.sh`) a monta fora do Shell registrando o gresource do app Extensões.
- **`perf.js`**: medidor opt-in (chave `perfil-ativo`); `agendar()` é o wrapper de timers usado pelo código. Método e números em `docs/DESEMPENHO.md`.
- Config: GSettings `org.gnome.shell.extensions.atlas` (schema em `schemas/`); o dock reage ao vivo às mudanças.

### Consistência checada por `tests/estrutura.test.js`
Ao adicionar tema, widget, mascote ou chave de settings, atualizar todos os lados:
- tema: entrada em `TEMAS`, `<choice>` no schema, regras `.atlas-<id> .atlas-bg` e `.atlas-tooltip.atlas-<id>` em `temas.css`;
- widget: entrada em `WIDGETS` + `<id>: Classe` em `CLASSES` de `widgets.js`;
- toda chave lida com `get_/set_<tipo>('chave')` em dock/widgets/prefs/mascotes precisa existir no schema.

### Desempenho é requisito
Consumo de referência: ~0,14% de um núcleo, zero sem widgets, 2 a 5 MB. Widgets pausam com a doca escondida, no Overview e em tela cheia e só redesenham quando algo muda; mascotes não têm timer quando desligados. Preservar isso em mudanças novas.

## Outros

- `site/`: página pública estática (HTML/CSS/JS puros) na Vercel; `site/DESIGN.md` é a fonte de verdade visual. Deploy: `cd site && vercel deploy --prod --yes`.
- `CHANGELOG.md` segue Keep a Changelog; versões seguem `version-name` do `metadata.json`. Registrar mudanças relevantes em `[Não lançado]`.
