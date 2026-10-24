# Widgets do ATLAS: como funciona cada um

Guia de uso dos widgets: o que cada um mostra, de onde vêm os dados, o que precisa configurar e o que fazer quando algo dá errado. Os widgets ficam dentro de um ambiente: na janela de preferências, aba **Widgets**, cada ambiente tem a sua lista para ligar, desligar e ordenar; na mesma aba ficam a posição (antes ou depois dos apps), os tiles largos e as opções gerais.

Por enquanto este guia cobre só o **Claude Code**; os outros entram aos poucos.

## Claude Code

Mostra quanto você já usou dos limites do plano do Claude (Pro ou Max): a **sessão de 5 horas** e a **semana**. São os mesmos números do `/usage` do Claude Code e do painel de uso do app; nada é estimado.

### O tile

- **Anel de fora:** a sessão de 5 h. Verde até 69%, âmbar de 70% a 89%, vermelho a partir de 90%.
- **Anel de dentro**, azul: a semana.
- **Número grande no centro:** o % da sessão de 5 h (ex.: `88%`). Mostra `—` enquanto não há dados.
- **Número azul embaixo dele:** o % da semana (ex.: `15%`), na mesma cor do anel de dentro.
- **Faísca laranja no canto de cima:** identifica o widget, para não confundir com os outros anéis (Atividade, Bateria, Pomodoro).
- **Dica ao parar o mouse:** os dois % e em quanto tempo a sessão de 5 h reinicia.

### O painel (clique no tile)

- **Sessão (5 h)** e **Semana**, cada uma com o %, uma barra e quando reinicia (ex.: `reinicia em 2 h 38 min (às 13:19)` ou `reinicia em 6 d 10 h (sex 20:59)`).
- Depois que uma janela reinicia, ela volta a 0% e mostra "sem uso desde o último reinício" até você usar o Claude de novo.
- No rodapé: há quanto tempo os números foram atualizados e, se houver, o motivo de não estarem atualizando.

### De onde vêm os números

O widget tem duas fontes e usa a leitura mais nova de cada janela.

1. **API de uso do plano** (a principal). O widget lê o login do Claude Code em `~/.claude/.credentials.json` e consulta `https://api.anthropic.com/api/oauth/usage` a cada 5 minutos (a cada 1 minuto com o painel aberto). O token é lido do arquivo na hora de cada consulta e não é guardado nem escrito em log; a única coisa que sai da máquina é essa consulta, para a própria Anthropic.
2. **Statusline do Claude Code no terminal** (opcional). O `claude-statusline.sh` grava, a cada atualização da barra do Claude Code, um JSON por sessão em `~/.cache/atlas/claude/`, com os limites que o próprio Claude Code recebe. Só funciona quando o Claude Code roda no terminal; o **app desktop não roda statusline**, então nele vale só a fonte 1.

### Configurar

1. Entre no Claude Code pelo terminal, uma vez:
   ```bash
   claude auth login
   ```
   Isso cria o `~/.claude/.credentials.json` que o widget usa. O login do app desktop é separado e não serve para o widget.
2. Ligue o widget **Claude Code** num ambiente, na aba **Widgets** das preferências.
3. (Opcional) Statusline, para quem usa o Claude Code no terminal: o `install.sh` copia o script para `~/.claude/atlas-statusline.sh`; aponte o `statusLine` do `~/.claude/settings.json` para ele:
   ```json
   "statusLine": {"type": "command", "command": "bash ~/.claude/atlas-statusline.sh"}
   ```
   O script repassa a entrada para a statusline que já existia (a do caveman, se instalada, ou a da variável `ATLAS_STATUSLINE_NEXT`), então a barra do Claude Code continua igual.

Não há opções gerais: o widget não tem nada para ajustar.

### Trocar de conta

O widget segue a conta do **CLI**, não a do app desktop. Para trocar:

```bash
claude auth logout
```
```bash
claude auth login
```

Depois apague os JSONs da statusline da conta antiga, para não se misturarem com os da nova:

```bash
rm -f ~/.cache/atlas/claude/*.json
```

Não precisa recarregar a extensão: em até 5 minutos (1 com o painel aberto) aparecem os números da conta nova.

### Mensagens do painel

| Mensagem | O que é | O que fazer |
|---|---|---|
| Sem login no Claude Code | Não existe `~/.claude/.credentials.json` ou ele não tem o login do Claude | `claude auth login` no terminal |
| Login do Claude Code vencido | O token venceu ou foi recusado (401/403) | Rode `claude` no terminal para renovar; se não resolver, `claude auth login` |
| A API de uso pediu um tempo | Consultas demais (429) | Nada: tenta de novo em 5 min |
| Sem resposta da API de uso | Sem internet ou a API fora do ar | Nada: tenta de novo em 5 min |

As mensagens só aparecem quando não há número recente (mais de 10 min sem atualizar); com números recentes, um erro passageiro fica escondido.

### Limites conhecidos

- O token do CLI vence de tempos em tempos e só é renovado quando o próprio Claude Code roda no terminal; o widget não renova o login sozinho, para não disputar o arquivo com o CLI.
- Contas sem plano Pro ou Max (chave de API, Bedrock, Vertex) não têm limites de 5 h e semana; o widget fica sem dados.
- Limites extras por modelo (ex.: semana só do Opus) e o uso extra pago não aparecem; só a sessão de 5 h e a semana de todos os modelos.

### Onde está o código

- `atlas@joaovitor12j.dev/consumo.js`: lógica pura (ler a resposta da API e da statusline, juntar as fontes, formatar), testada em `tests/consumo.test.js`.
- `atlas@joaovitor12j.dev/widgets.js`, classe `ClaudeCode`: consulta à API com Soup, leitura da statusline, tile e painel.
- `claude-statusline.sh`: a statusline opcional.
