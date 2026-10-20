# Mascotes do ATLAS: especificação

Status: implementado na branch `feat/mascotes` (motor + cuco). Faltam a conferência visual no Shell, a medição com `perf.js` e a revisão. Primeiro mascote: o **cuco**.

## Objetivo

Dar personalidade ao ATLAS com mascotes que o usuário liga um a um, combinando com temas, datas (Natal, Halloween) e eventos (hora cheia, memória alta), **sem aumentar o consumo**. O custo de referência é o de hoje: zero sem widgets, 2 a 5 MB de memória própria (ver `DESEMPENHO.md`).

Fora de escopo desta etapa: mascotes sazonais, estáticos, de passagem e de métrica. A forma de registrar um mascote fica pronta para eles, mas só o cuco é construído (ver "Contrato" e "Fora desta etapa").

## Princípios (valem para todos os mascotes)

1. **Desligado por padrão.** Cada mascote é opt-in (`mascotes-ativos`).
2. **Zero em repouso.** Sem mascote ligado não há timer. Com mascote ligado, o único custo parado é um temporizador que acorda no máximo a cada 15 min.
3. **Actor efêmero.** O desenho só existe durante a aparição. Ao terminar, o actor é destruído (`null`), sem textura retida.
4. **Vetorial com Cairo**, como os widgets (`desenho.js`): sem PNG, sem arquivo de arte, escala com o tamanho dos ícones.
5. **Lógica pura testável com node.** Horários, linha do tempo e easing ficam em `logica.js`; o desenho em `desenho.js`, visível fora do Shell por `tests/previa-cuco.js`.
6. **Respeita o usuário.** Não aparece com a doca escondida, em tela cheia, no Overview nem com o Não perturbe ligado.

## O cuco

### Comportamento

Na hora cheia (ou meia hora, configurável), uma casinha de cuco **sobe de trás da borda superior da doca**, abre a porta, o pássaro sai e canta N vezes, recolhe, a porta fecha e a casinha desce.

Linha do tempo, em milissegundos (`quadroCuco(t, batidas)`):

| Fase | Duração | Curva |
|---|---|---|
| Casa sobe | 0 a 300 | ease-out cúbico |
| Porta abre | 300 a 500 | ease-in-out |
| Cada batida (N vezes) | 700 | sai 0 a 200 (ease-out com overshoot), canta 200 a 500 (bico abre e fecha duas vezes, corpo inclina), recolhe 500 a 700 |
| Porta fecha | 200 | ease-in-out |
| Casa desce | 300 | ease-in cúbico |

Duração total: `1000 + 700 × N` ms. Com N = 3: 3,1 s. Com N = 12: 9,4 s.

Batidas: `batidasDaHora(h)` = `h % 12`, e 12 quando o resto é 0, limitado por `cuco-max-batidas` (padrão 3). Na meia hora, 1 batida.

### Onde aparece

Um actor próprio em `Main.layoutManager.addChrome` (não filho do container da doca, para não mexer em tamanho nem em reserva de espaço), `reactive: false` (cliques passam) e `trackFullscreen: true`.

- Tamanho: `iconSize × 1,6` de largura e `× 2` de altura (a casa é mais alta que larga).
- Posição: centrado no eixo transversal da doca, encostado na **borda superior** do container. Para doca embaixo, é em cima do vidro; para esquerda e direita, em cima da ponta superior da doca.
- A subida é desenhada dentro do actor, com `clip_to_allocation`, e não sobrepõe o vidro. Isso evita ver a casa através do tema Cristal.
- A posição é relida do container a cada quadro (barato), então reconstruir a doca durante a aparição não deixa a casa para trás.
- Se a casa não cabe acima da doca (`y < área útil`), a aparição é pulada.
- Em várias telas: só na doca da tela principal (ou na primeira, se a principal não tiver doca).

### Quando aparece (e quando não)

Aparece se **todas** as condições valem no instante do disparo:

- cuco ligado em `mascotes-ativos`;
- hora do disparo dentro da janela `cuco-das` a `cuco-ate` (inclusive; se `das > ate`, a janela cruza a meia-noite);
- Não perturbe desligado (mesmo `show-banners` que o ATLAS já observa);
- doca visível (não escondida pelo auto-ocultar);
- Overview fechado.

Se alguma falha, o cuco **não recupera** a aparição perdida.

### Agendador

Um único `agendar('mascotes', ms, fn)` (`perf.js`), sem outros temporizadores em repouso.

1. `proximoDisparo(agoraMs, intervalo)` devolve o próximo alvo (hora cheia ou meia hora) estritamente depois de agora.
2. O temporizador dorme `min(alvo - agora + 200 ms, 15 min)` e **recalcula** ao acordar.
3. Ao acordar, se o relógio de parede está entre o alvo e o alvo + 90 s, dispara; se passou disso, o disparo foi perdido (suspensão do computador) e é descartado.

O limite de 15 min existe porque o GLib mede tempo em relógio monotônico, que para durante a suspensão: sem ele, o cuco poderia cantar a hora errada depois de acordar. Com ele, o erro máximo é 15 min e a tolerância de 90 s descarta o resto.

Os quadros da aparição usam `agendar('mascote-quadro', 33, ...)`: ~30 quadros por segundo, só durante a aparição, com `queue_repaint` e o tempo vindo do relógio monotônico (sem acumular erro).

## Contrato do mascote

Cada mascote é um objeto registrado em `catalogo.js` (como `TEMAS` e `WIDGETS`):

```js
export const MASCOTES = [
    ['cuco', 'Cuco', 'Canta a hora cheia sobre a doca.'],
];
```

e uma entrada em `mascotes.js`:

```js
{
    id: 'cuco',
    gatilho: {tipo: 'hora'},          // v1 só implementa 'hora'
    tamanho: [1.6, 2],                // múltiplos de iconSize
    duracao: ctx => 1000 + 700 * ctx.batidas,
    quadro: (t, ctx) => quadroCuco(t, ctx.batidas),   // puro, em logica.js
    desenhar: (cr, w, h, q, fg) => cuco(cr, w, h, q), // em desenho.js
}
```

Os tipos de gatilho previstos para depois (`data`, `metrica`, `evento`, `tema`) **não são implementados agora**. O contrato só precisa não impedi-los; a forma exata se define quando houver o segundo mascote, para não desenhar abstração sem uso.

## Configuração (schema GSettings)

| Chave | Tipo | Padrão | Uso |
|---|---|---|---|
| `mascotes-ativos` | `as` | `[]` | ids dos mascotes ligados |
| `cuco-intervalo` | `s` (`hora`, `meia-hora`) | `hora` | frequência |
| `cuco-das` | `i` (0 a 23) | 8 | início da janela |
| `cuco-ate` | `i` (0 a 23) | 22 | fim da janela |
| `cuco-max-batidas` | `i` (1 a 12) | 3 | limite de cantos |
| `mascote-teste` | `s` | `''` | canal prefs para Shell: `"cuco:<timestamp>"` dispara uma aparição na hora (o timestamp garante que a chave sempre muda) |

Janela de preferências: aba **Mascotes** com uma linha por mascote do catálogo (interruptor, descrição e as opções do cuco) e o botão **Testar agora**.

## Arquivos

| Arquivo | Mudança |
|---|---|
| `logica.js` | `batidasDaHora`, `proximoDisparo`, `naJanela`, `quadroCuco`, funções de easing |
| `desenho.js` | `cuco(cr, w, h, quadro)` |
| `mascotes.js` (novo) | motor: registro, agendador, actor efêmero, destruição |
| `catalogo.js` | `MASCOTES` |
| `dock.js` | cria o motor no `Dock.enable`, expõe a âncora de cada `DockView`, avisa sobre Overview e Não perturbe, destrói no `disable` |
| `prefs.js` | aba Mascotes |
| schema | chaves acima |
| `tests/` | `mascotes.test.js` (lógica pura), casos novos em `estrutura.test.js` e `previa-cuco.js` |

`extension.js` não muda: o carregador já copia todo `.js` novo.

## Testes e verificação

Automáticos (`npm test`, sem Shell):
- `batidasDaHora`: 0 vira 12, 13 vira 1, limite respeitado.
- `proximoDisparo`: hora cheia e meia hora, virada de dia, instante exato do alvo (devolve o próximo, não o mesmo).
- `naJanela`: janela normal, cruzando a meia-noite, bordas inclusivas.
- `quadroCuco`: valores em 0..1, começa e termina com a casa e a porta fechadas, `t` depois do fim devolve `null`, número de cantos igual a N.
- `estrutura.test.js`: todo mascote do catálogo tem entrada em `mascotes.js`; as chaves lidas por `mascotes.js` existem no schema (incluir o arquivo na lista que o teste varre).

Visual (sem abrir o Shell): `gjs -m tests/previa-cuco.js saida.png` gera uma tira com 12 quadros do cuco, nos fundos escuro e claro.

No Shell real (a validar de verdade):
- botão **Testar agora**, nas quatro posições da doca;
- com auto-ocultar, doca escondida, Overview aberto, Não perturbe ligado e tela cheia: não deve aparecer;
- com duas telas: só na principal;
- reconstruir a doca (abrir um app) no meio da aparição.

## Critérios de sucesso

1. **Repouso:** com o cuco ligado, no máximo 1 acordada a cada 15 min e custo medido pelo `perf.js` abaixo de 0,001% de um núcleo; com o cuco desligado, zero timers do módulo.
2. **Aparição:** ~30 desenhos por segundo só enquanto dura (~3 s com N = 3). Estimativa a confirmar com `perf.js` (`mascote-quadro (33ms)`): poucas dezenas de ms de CPU por aparição.
3. **Memória:** nenhum actor vivo entre aparições; depois de 50 disparos seguidos pelo botão de teste, o RSS do `gnome-shell` não cresce além do ruído já medido (~0,3 MB por recarga).
4. **Sem lixo:** `disable()` no meio de uma aparição destrói o actor e remove os dois temporizadores.
5. **Hora certa:** depois de suspender e voltar, o cuco nunca canta uma hora que já passou há mais de 90 s.

## Fora desta etapa

Mascotes estáticos e sazonais (Natal, Halloween, Páscoa, Festa Junina), de passagem (gato cruzando a doca), de métrica (RAM alta, com amostrador próprio de `/proc/meminfo` a cada ~15 s, porque o histórico do widget Atividade só existe com o widget ligado), de evento (fim do pomodoro, bateria baixa), e som no cuco.

## Decisões

Tomadas em 2026-10-19:

1. Vetorial com Cairo, em cima da doca, cuco como primeiro mascote.
2. **Doca escondida na hora:** pula a aparição.
3. **Várias telas:** só a doca da tela principal.
4. **Batidas:** limite padrão 3.
5. **Clique:** o cuco ignora (os cliques passam).
6. **Som:** fica de fora. Antes de incluir, conferir a API de som do Shell (`Meta.SoundPlayer`) e a licença do áudio.

## Segundo mascote: fantasma (Halloween)

Primeiro mascote de data. Mesmo contrato do cuco, com `temporada` (24 a 31 de outubro, `naTemporada` em `logica.js`) e chaves `fantasma-intervalo`, `fantasma-das`, `fantasma-ate`. O motor agenda todos os ligados com um só temporizador (o do disparo mais próximo); se dois coincidem, o primeiro da lista aparece. Linha do tempo: sobe 450 ms, fica 2 s (balança, "bu!" com olhos arregalados e braços para cima), desce 400 ms. Os gatilhos `metrica` e `evento` seguem para os próximos.

## Terceiro mascote: esqueleto (Halloween)

Mesma temporada e mesmas opções do fantasma (`esqueleto-intervalo`, `-das`, `-ate`). Sobe 450 ms, fica 2,4 s (acena com o braço direito e bate o queixo) e desce 400 ms. Quando dois ou mais mascotes caem na mesma hora, o motor sorteia: metade das vezes um só (escolhido ao acaso), metade das vezes todos juntos, lado a lado e centrados na doca (`escolherAparicao`, `deslocamentosLado`). Vários actors dividem o mesmo temporizador de quadros. No teste, `mascote-teste` aceita `id+id:marca` para forçar o lado a lado.

## Posição horizontal

Cada aparição sorteia um ponto qualquer ao longo da doca (`deslocamentoAleatorio`), sem passar das pontas; vale para todos os mascotes, não só os de Halloween. Um grupo lado a lado se move junto. Só o eixo da doca varia: a altura continua encostada na borda.

## Chama (gatilho de memória)

Primeiro mascote que não é de horário. Com ela ligada, um temporizador `mascote-memoria` lê `/proc/meminfo` a cada 15 s (sem ela, não existe). `usoMemoria` calcula `1 - MemAvailable/MemTotal`; `memoriaPedeAparicao` exige uso no limiar (`chama-limiar`, padrão 90), estar armada e ter passado `chama-espera` minutos (padrão 10) desde a última aparição; `rearmarMemoria` só rearma quando o uso cai 5 pontos abaixo do limiar. Respeita doca escondida, Overview e Não perturbe, e se não conseguir aparecer continua tentando a cada amostra. Validada subindo o uso real de 41% para ~55% com limiar 50%.

## Natal: Papai Noel e boneco de neve

De 1 a 25 de dezembro, mesmo esquema do Halloween (`noel-*`, `boneco-*`; opções num bloco só em `prefs.js`). Noel: acena e a barriga sacode no "ho ho ho" (3,65 s). Boneco: balança, com cachecol e galhos ao vento (3,45 s).
