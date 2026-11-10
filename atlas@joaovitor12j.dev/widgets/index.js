// Registro dos widgets: cria o widget pelo id do catálogo. Cada widget mora na própria pasta (widgets/<id>/).
import {Atividade} from './atividade/index.js';
import {definirCfg} from './base.js';
import {Bateria} from './bateria/index.js';
import {Clima} from './clima/index.js';
import {AreaTransferencia, pararClipboard} from './clipboard/index.js';
import {Contagem} from './contagem/index.js';
import {Cronometro} from './cronometro/index.js';
import {Musica} from './musica/index.js';
import {Nota} from './nota/index.js';
import {Pomodoro} from './pomodoro/index.js';
import {Progresso} from './progresso/index.js';
import {Rede} from './rede/index.js';
import {Relogio} from './relogio/index.js';
import {Slack} from './slack/index.js';
import {Timer} from './timer/index.js';

const CLASSES = {
    relogio: Relogio, pomodoro: Pomodoro, bateria: Bateria, musica: Musica,
    progresso: Progresso, cronometro: Cronometro, timer: Timer, atividade: Atividade, rede: Rede,
    contagem: Contagem, nota: Nota, clipboard: AreaTransferencia, slack: Slack, clima: Clima,
};

// Cria e inicia o widget `id` num tile de `tam` px (`largo`: versão larga, se o widget tiver); null se não existe.
export function criarWidget(id, tam, settings, largo = false) {
    definirCfg(settings);
    const Classe = CLASSES[id];
    if (!Classe)
        return null;
    const w = new Classe(tam, largo);
    w.iniciar();
    return w;
}

// Para o que os widgets mantêm vivo fora da doca (hoje só o observador da área de transferência).
export function pararWidgets() {
    pararClipboard();
}
