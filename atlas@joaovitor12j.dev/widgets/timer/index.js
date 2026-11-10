// Widget Timer.

import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';
import {anelDeTile, cor} from '../../nucleo/desenho.js';
import {agoraMs, CFG, COR, MIN, Widget} from '../base.js';
import {mmss} from '../pomodoro/index.js';

// ----- Timer (contagem regressiva) -----
const duracaoTimer = () => (CFG?.get_int('timer-minutos') ?? 10) * MIN;

// `extra`: minutos somados com "+1 minuto", para o anel continuar proporcional.
const TIMER = {fim: 0, restante: 10 * MIN, intacto: true, extra: 0, pulsoAte: 0};

function timerRestante() {
    return TIMER.fim ? Math.max(0, TIMER.fim - agoraMs()) : TIMER.restante;
}

const timerFrac = () => (TIMER.intacto && !TIMER.fim ? 0 : 1 - timerRestante() / (duracaoTimer() + TIMER.extra));

function timerTick() {
    if (TIMER.fim && agoraMs() >= TIMER.fim) {
        TIMER.fim = 0;
        TIMER.extra = 0;
        TIMER.restante = duracaoTimer();
        TIMER.intacto = true;
        TIMER.pulsoAte = agoraMs() + 10000;
        Main.notify('ATLAS', 'O timer acabou.');
    }
}

export class Timer extends Widget {
    static FONTES = [0.13, 0.28, 0.18];

    get intervalo() {
        return TIMER.fim ? 1000 : 4000;
    }

    logica() {
        timerTick();
    }

    get etiqueta() {
        return 'Timer';
    }

    construir() {
        this._criarTexto();
        this._ocultar(this._topo);
        this._anim = this._animado();
        this._camada((cr, w, h) => anelDeTile(cr, w, h, this._anim.atual, cor(COR.ambar)));
    }

    atualizar() {
        timerTick();
        if (TIMER.intacto && !TIMER.fim)
            TIMER.restante = duracaoTimer();
        this._txt(this._topo, 'TIMER');
        this._txt(this._meio, mmss(timerRestante()));
        this._txt(this._base, TIMER.fim ? '' : '❚❚');
        this._anim.definir(timerFrac());
        this._pulsar(agoraMs() < TIMER.pulsoAte);
    }

    fillMenu(menu) {
        menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem('Timer'));
        this._anelGrande(menu, {
            frac: timerFrac, cor: () => COR.ambar, texto: () => mmss(timerRestante()),
            sub: () => (TIMER.fim ? 'contando' : 'parado'),
        });
        menu.addAction(TIMER.fim ? 'Pausar' : 'Iniciar', () => {
            if (TIMER.fim) {
                TIMER.restante = timerRestante();
                TIMER.fim = 0;
            } else {
                TIMER.fim = agoraMs() + TIMER.restante;
                TIMER.intacto = false;
                TIMER.pulsoAte = 0;
            }
            this._acao();
        });
        menu.addAction('+1 minuto', () => {
            if (TIMER.fim)
                TIMER.fim += MIN;
            else
                TIMER.restante += MIN;
            TIMER.extra += MIN;
            TIMER.intacto = false;
            this._acao();
        });
        menu.addAction('Reiniciar', () => {
            TIMER.fim = 0;
            TIMER.extra = 0;
            TIMER.restante = duracaoTimer();
            TIMER.intacto = true;
            TIMER.pulsoAte = 0;
            this._acao();
        });
    }
}
