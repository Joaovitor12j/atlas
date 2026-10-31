# ATLAS como app nativo

Plano para o ATLAS deixar de ser "uma extensão com uma janela de prefs" e virar um **app nativo** (gjs + GTK4 + libadwaita) que é o produto. Rascunho, nada implementado. Estende `docs/APP-CONFIGURACAO.md`, que vira a fase 1 deste plano.

## O limite que decide a arquitetura

No GNOME 46 (Wayland) o Mutter não implementa `wlr-layer-shell`. Um app comum não consegue: ancorar na borda, ficar sempre por cima, reservar espaço (struts), listar janelas/workspaces de outros apps, registrar atalhos globais nem rodar a lente com o ponteiro fora da própria janela. Por isso **o dock continua sendo desenhado dentro do Shell**. "Remover o ATLAS da extensão" significa tirar da extensão tudo que não exige o Shell, deixando um **shim fino** (extensão pequena e estável) que o app comanda.

| Fica no shim (extensão) | Vai para o app |
|---|---|
| Actors St/Clutter do dock, lente, auto-ocultar, struts | Toda a configuração (UI, schema, presets) |
| `Shell.AppSystem`, `WindowTracker`, workspaces, prévia de janelas | Estado e serviços: clima, Claude Code, Slack, rede, CPU/RAM, bateria, MPRIS, relógio/pomodoro/timer |
| Atalhos (`Main.wm.addKeybinding`), Não perturbe, Overview | Motor de mascotes (agenda, decisão, quadros) |
| Painel (ícone/menu), reserva de espaço | Ambientes (modelo, regras, DND, janelas seguem ambiente) |
| Desenho final dos tiles (recebe dados, pinta com `desenho.js`) | Ciclo de vida: autostart, instância única, atualização |

Resultado: a extensão encolhe de ~5000 linhas (dock+widgets+mascotes) para algo na casa de 1000 a 1500, sem lógica de produto. Mudar o shim exige relogin (Wayland); por isso ele deve mudar raramente e ter protocolo versionado.

## Arquitetura alvo

```
app/                         (Adw.Application dev.joaovitor12j.Atlas, fora do Shell)
  main.js                    instância única, --pagina, modo --daemon (sem janela)
  nucleo/                    daemon: serviços + estado, expõe D-Bus
    barramento.js            interface D-Bus dev.joaovitor12j.Atlas1
    servicos/                clima, claude, slack, rede, atividade, bateria, musica, clipboard, tempo
    ambientes.js, mascotes.js (agendador)
  janela/ paginas/ previa.js estilo*.css   (UI, conforme APP-CONFIGURACAO.md)
compartilhado/               catalogo.js, desenho.js, logica.js, clima.js  (sem gi:// de Shell)
atlas@joaovitor12j.dev/      shim: extension.js, dock.js (só view), schemas/, metadata.json
```

- **Daemon**: o app roda em segundo plano (`--daemon`, autostart via `.desktop` em `~/.config/autostart` ou serviço D-Bus activatable) sem janela. Janela abre sob demanda no mesmo processo.
- **Protocolo D-Bus** `dev.joaovitor12j.Atlas1`:
  - propriedades/sinais de estado: ambiente atual, lista de apps por ambiente, DND, dados de cada widget já formatados (valor, rótulo, séries para gráfico), pedido de mascote (id, movimento, posição);
  - métodos do shim para o app: `JanelasMudaram`, `AppsAbertos`, `AmbienteTrocado`, `DndMudou`;
  - métodos do app para o shim: `TrocarAmbiente`, `MostrarMascote`, `MinimizarOutrosAmbientes`.
  - Versão do protocolo no nome e em `Versao()`; shim recusa app incompatível e mostra aviso no painel.
- **Shim sem app**: se o daemon não está no ar, o dock mostra favoritos e apps abertos com os últimos dados (ou vazio nos widgets). Nunca trava o Shell: chamadas assíncronas, sem bloqueio no main loop.
- **GSettings continua** sendo a fonte de verdade da configuração (o shim reage ao vivo, como hoje). O app escreve; o shim e o daemon leem. Dados voláteis (clima, séries) vão por D-Bus, não por GSettings.
- **Desempenho**: o requisito de ~0,14% de um núcleo vale para shim + daemon somados. Daemon só amostra o que está ligado; amostradores param quando o shim avisa dock escondida/Overview/tela cheia (sinal `Visivel(bool)`); mascotes sem timer quando desligados. Medir com `perf.js` nos dois processos. Custo novo: um processo gjs residente (estimar 30 a 60 MB; **medir na fase 0 e decidir se vale**).

## Fases

Cada fase é um PR que funciona sozinho; o dock nunca fica quebrado entre fases.

| Fase | Entrega | Pronto quando |
|---|---|---|
| 0. Prova | Daemon mínimo + shim lendo 1 widget (Relógio) por D-Bus; medir memória e CPU do processo residente | Número real de MB/CPU; decisão go/no-go; protocolo rascunhado |
| 1. App de configuração | `docs/APP-CONFIGURACAO.md` inteiro (casca, prévia, páginas, `prefs.js` vira stub) | Todas as opções de hoje no app; engrenagem abre o app |
| 2. Reorganização | Mover `catalogo/desenho/logica/clima` para `compartilhado/` sem dependência de Shell; `install.sh` e loader ajustados; testes e CI verdes | Mesmo comportamento, nova estrutura |
| 3. Daemon e protocolo | `barramento.js`, ciclo de vida, autostart, instância única, versão do protocolo; shim conecta e reconecta ao daemon | Matar/subir o daemon não derruba o dock |
| 4. Serviços para o app | Migrar widgets um a um (puros primeiro: tempo, atividade, rede, bateria; depois clima, Claude, Slack, música, clipboard). Shim vira só renderizador por widget | Cada widget igual ao atual; CPU/RAM medidos por migração |
| 5. Ambientes e mascotes | Modelo de ambientes, DND e agendador de mascotes no app; shim só aplica (trocar workspace, minimizar, desenhar mascote) | Sem regressão em atalhos, roda do mouse, DND |
| 6. Remoção | Apagar do shim lógica e serviços restantes; `extension.js` e `dock.js` enxutos; CLAUDE.md, README, CHANGELOG, `docs/DESEMPENHO.md` atualizados | Shim sem regra de produto; tag de versão |
| 7. Distribuição | `.desktop`, ícones, fontes, `install.sh` único; avaliar Flatpak (precisa de portal/`--talk-name` para D-Bus e acesso a `~/.claude`) ou pacote `.deb` | Instalação em máquina limpa |

## Decisões (2026-10-31)

1. **Instalação local** (`install.sh`). Flatpak fica para depois da fase 7, se um dia houver distribuição.
2. **Daemon residente**, com só os serviços dos widgets ligados.
3. **Daemon no ar mesmo sem janela**; sem daemon, o dock fica degradado (favoritos e apps abertos, widgets com o último dado).
4. **Sem extensions.gnome.org**: distribuição só local. Motivo: o shim depende de um app externo, o que a revisão do site costuma barrar, e o código é fechado. Não bloqueia nada.
5. **Janela de cor fixa** (carta náutica de `site/DESIGN.md`), não varia com o tema do dock. O id do app passa a `dev.joaovitor12j.Atlas`.

## Resultado da fase 0 (2026-10-31)

Protótipo em `app/daemon.js` (nome `dev.joaovitor12j.Atlas`, só GLib/Gio) e `ponte.js` no shim; o Relógio lê a hora do daemon e cai no cálculo local se ele não existe. Medido nesta máquina (GNOME 46, gjs 1.80):

| Processo | Memória (RSS) |
|---|---|
| gjs vazio | 26 MB |
| daemon (D-Bus, 1 widget assinado) | 27 MB |
| gjs com GTK4 + libadwaita iniciados, sem janela | 60 MB |
| app com uma `Adw.ApplicationWindow` vazia | 176 MB, **não volta** ao fechar a janela |

- **CPU do daemon** com 1 assinante a 1 Hz: ~0,1% de um núcleo (6 centésimos de segundo em 60 s, resolução de ±0,017%). Sem assinantes não há timer.
- **Decisão: daemon e janela são processos separados.** O daemon fica residente sem GTK (~27 MB); a janela de configuração é outro processo (`app/main.js`), aberto sob demanda e encerrado ao fechar, devolvendo os ~150 MB. Isso muda a arquitetura acima: a "instância única" e o `--pagina` valem para a janela, e o `--daemon` vira o `app/daemon.js`.
- **O Relógio não deve ir para o daemon.** Custa ~0,1% para entregar o que o shim calcula de graça. O daemon só vale para o que o shim não consegue ou não deveria fazer: serviços com rede/disco/processos (clima, Claude, Slack, CPU/RAM, rede, bateria, MPRIS) e estado compartilhado (ambientes, mascotes). O Relógio ficou só como cobaia do protocolo; sai na fase 4 (ou vira local de novo).
- Protocolo v1: `Versao()`, `Assinar(id)`, `Soltar(id)`, sinal `Dado(id, json)`. Contagem de assinantes por id; dado com mais de 3 s é ignorado no shim.
- Latência não medida no Shell (falta testar com o dock real; `ponte.js` é copiado pelo loader, sem relogin).

## Riscos

- **Latência e desenho entre processos**: o shim pinta com dados recebidos; nunca enviar pixels. Mascotes e lente continuam locais no shim (animação não pode depender de D-Bus).
- **Duas fontes de verdade** para ambientes (workspaces do Mutter vs. modelo do app): o shim é dono do fato (workspace/janelas), o app é dono da regra; sincronizar por sinais idempotentes.
- **Relogin a cada mudança do shim**: mitigado por protocolo versionado e shim pequeno; o loader `.run-*` continua valendo para os módulos do shim.
- **Regressão de desempenho** por processo extra: gate de CI/medição por fase (fases 0 e 4).
- **Escopo**: é uma reescrita da arquitetura, não um refactor. Fases 0 e 1 entregam valor e permitem desistir sem perda.

## Testes

- Lógica nova (protocolo, serialização de widgets, regras de ambiente) em `compartilhado/logica.js` com `node --test`.
- Daemon testável com `gjs` + `Gio.DBusConnection` em barramento privado (`dbus-run-session`), sem Shell.
- `tests/estrutura.test.js` passa a cobrir `app/**` e `compartilhado/**` e confere que o shim não importa `app/`.
- CI: `node --check` nos novos módulos; checagem de que `compartilhado/` não importa St, Clutter nem `resource:///org/gnome/shell`.
