# Desempenho do ATLAS

O ATLAS é leve. Em uso normal ele consome **cerca de 0,14% de um núcleo** de CPU, o que dá **0,01% da máquina de teste** (12 núcleos); com a doca escondida cai para **~0,03%**; e **sem nenhum widget ligado o custo medido é zero**. A memória fica na faixa de **2 a 5 MB**, dentro de um processo (`gnome-shell`) que já usa ~230 MB.

Este documento mostra como isso foi medido, o que os números cobrem e o que ficou de fora, para você poder conferir.

## Resumo

| Cenário | CPU do ATLAS (de 1 núcleo) | Execuções por segundo |
|---|---|---|
| Sem widgets (só apps, lente em repouso) | **0,000%** | 0 |
| Seus widgets, doca **escondida** (auto-ocultar) | **~0,03%** | ~4 |
| Seus widgets, doca visível | **~0,14%** | ~6 |
| **Todos** os 13 widgets ligados (tiles quadrados) | **~0,37%** | 12 a 16 |

"Seus widgets" é o ambiente de uso real de quem desenvolveu: Slack, Música (larga), Progresso do tempo, Área de transferência, Relógio (largo) e Atividade, em **duas telas** (cada tela tem a própria doca e os próprios widgets).

Para escala: 1% de um núcleo é 0,083% dessa máquina. O pior caso acima (todos os widgets) usa menos de **0,03% da CPU total**.

## Antes e depois das otimizações

Antes, os widgets atualizavam e redesenhavam em ritmo fixo, mesmo escondidos ou sem nada para mudar. Duas mudanças corrigiram isso; o antes e o depois foram medidos no mesmo ambiente, com a mesma ferramenta:

1. **Pausar o que ninguém vê.** Com a doca escondida (auto-ocultar), no Overview ou em tela cheia, os widgets não redesenham. O que não pode parar (fim do timer e do pomodoro, amostras de CPU e rede para o gráfico) continua.
2. **Redesenhar só quando algo mudou, e acordar menos.** O cronômetro parado, o pomodoro e o timer sem contagem, e a música sem tocar passam a conferir a cada 2 a 10 s em vez de a cada 0,25 a 1 s; a Música larga só pergunta a posição por D-Bus enquanto toca.

| Cenário (seus widgets, 2 telas) | Antes | Depois |
|---|---|---|
| Doca visível | 0,190% / 11,5 por s | **~0,144%** / ~6,3 por s |
| Doca escondida | 0,173% / ~10,8 por s | **~0,030%** / ~3,8 por s |

Visível, o custo caiu cerca de 25% e as acordadas, cerca de 45%. Escondida, o custo caiu cerca de 80%.

## Memória

| Medida | Resultado |
|---|---|
| `gnome-shell` inteiro (RSS) | ~228 MB depois de 7 h ligado |
| Memória própria do `gnome-shell` (PSS) | ~180 MB |
| Efeito de ligar o ATLAS | dentro do ruído (~0,2 MB) |
| Cada recarga da extensão (só no desenvolvimento) | +0,3 MB em média, sem crescimento além disso em 6 recargas |

O ATLAS não é um processo separado: roda dentro do `gnome-shell`. Por isso não existe "memória do ATLAS" pronta para ler. O JavaScript só devolve memória no coletor de lixo, então a diferença entre ligado e desligado não aparece de forma limpa. A **estimativa de 2 a 5 MB** vem do tamanho dos módulos (~0,3 MB, o custo de uma recarga) somado às texturas dos ícones em cada tela (cerca de 33 KB por ícone na ampliação máxima). É uma estimativa, não uma medida direta.

## Como foi medido

### CPU do ATLAS por dentro
Comparar o CPU do `gnome-shell` com o ATLAS ligado e desligado **não funciona**: o Shell já gasta 15 a 22% de um núcleo sozinho (composição, animações, outras janelas) e isso varia mais que o custo do ATLAS. Numa tentativa assim, o caso com o ATLAS desligado chegou a dar *mais* CPU que os ligados.

Por isso o ATLAS tem um **medidor próprio** (`perf.js`), desligado por padrão. Ele cronometra cada temporizador e cada desenho do ATLAS e escreve um resumo no log a cada 30 s:

```bash
gsettings set org.gnome.shell.extensions.atlas perfil-ativo true
journalctl -f -o cat /usr/bin/gnome-shell | grep -A12 atlas-perf
gsettings set org.gnome.shell.extensions.atlas perfil-ativo false   # ao terminar
```

Exemplo de saída (os números deste documento vêm daqui):

```
[atlas-perf] 30 s: total 0.148% de 1 núcleo, 6.7 execuções/s
  0.058% de 1 núcleo, 1.9/s  Relogio (1000ms)
  0.045% de 1 núcleo, 0.9/s  Atividade (2000ms)
  0.042% de 1 núcleo, 3.7/s  desenho
```

Cada cenário foi medido por 66 s (duas janelas de 30 s), com a máquina em repouso e a configuração restaurada depois.

### Memória
Leitura de `VmRSS` e `Pss` do processo `gnome-shell` em `/proc` (antes, durante e depois de recargas da extensão).

## O que os números cobrem e o que não

**Cobrem:** o tempo de JavaScript dos temporizadores e dos desenhos (Cairo) do ATLAS, que é onde o ATLAS trabalha enquanto não há interação.

**Não cobrem:**
- **A lente de ampliação**, que roda a cada 16 ms mas **só enquanto o mouse está sobre a doca**. Não foi possível simular o ponteiro nesta máquina, então esse custo não foi medido.
- A **composição e o desenho dos próprios actors** pelo Shell (o que o Mutter faz para pôr a doca na tela).
- **Picos pontuais**, como reconstruir a doca ao abrir ou fechar um app.
- A memória exata do JavaScript: ver a estimativa acima.
- Outras máquinas: tudo foi medido num i5-12450H (12 núcleos), Ubuntu com GNOME Shell 46 e Wayland, com duas telas. Em CPUs mais lentas o custo em porcentagem de um núcleo sobe na proporção da diferença de velocidade.

**Ressalva da medição:** nesta sessão de testes ficou na memória do `gnome-shell` um medidor temporário de uma tentativa anterior (um empacotador de `GLib.timeout_add`), que só sai com um novo login. Ele soma microssegundos por execução; o efeito nos números é desprezível, mas por transparência fica registrado.

## Onde o custo está

Com todos os widgets ligados, o que mais pesa é a **Rede** (~0,12%: lê `/proc/net/dev` e redesenha o gráfico a cada segundo), seguida do **Relógio** (~0,06%: o ponteiro dos segundos exige um desenho por segundo) e da **Atividade** (~0,03 a 0,05%: lê `/proc` a cada 2 s). Os widgets que dependem de eventos (Bateria, Música, Slack, Área de transferência) praticamente não custam em repouso, porque reagem a sinais do sistema em vez de consultar.

## Para quem quer gastar menos
- Ligue só os widgets que você usa, por ambiente: sem widgets, o custo medido é zero.
- O auto-ocultar reduz o custo dos widgets em cerca de 80%.
- Os tiles quadrados do Relógio e da Atividade custam menos que os largos (o largo desenha também o gráfico).
