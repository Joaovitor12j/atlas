// Widget Cronômetro com voltas.

import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';
import {anelDeTile, cor} from '../../nucleo/desenho.js';
import {agoraMs, COR, linha, Widget} from '../base.js';
import {formatarCrono} from '../formato.js';

// ----- Cronômetro (estado fora da classe, como o pomodoro) -----
const CRONO = {inicio: 0, acumulado: 0, voltas: []};

const cronoMs = () => CRONO.acumulado + (CRONO.inicio ? agoraMs() - CRONO.inicio : 0);

export class Cronometro extends Widget {
    static FONTES = [0.13, 0.27, 0.17];

    get intervalo() {
        return CRONO.inicio ? 250 : 2000; // parado não há o que animar
    }

    get etiqueta() {
        return `Cronômetro: ${formatarCrono(cronoMs())}`;
    }

    construir() {
        this._criarTexto();
        this._ocultar(this._topo);
        // o anel dá uma volta por minuto
        this._camada((cr, w, h) => anelDeTile(cr, w, h, (cronoMs() % 60000) / 60000,
            cor(CRONO.inicio ? COR.ok : COR.ambar)));
    }

    atualizar() {
        this._txt(this._topo, 'CRONÔMETRO');
        this._txt(this._meio, formatarCrono(cronoMs()));
        this._txt(this._base, CRONO.voltas.length ? `${CRONO.voltas.length} volta(s)` : (CRONO.inicio ? '' : '❚❚'));
        // rodando o anel anda a cada passo; parado só redesenha se algo mudou
        if (CRONO.inicio || this._mudou('crono', `${cronoMs()}|${CRONO.voltas.length}`))
            this._redesenhar();
    }

    fillMenu(menu) {
        menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem('Cronômetro'));
        this._anelGrande(menu, {
            frac: () => (cronoMs() % 60000) / 60000, cor: () => (CRONO.inicio ? COR.ok : COR.ambar),
            texto: () => formatarCrono(cronoMs()), sub: () => (CRONO.inicio ? 'rodando' : 'parado'),
        });
        menu.addAction(CRONO.inicio ? 'Pausar' : 'Iniciar', () => {
            if (CRONO.inicio) {
                CRONO.acumulado = cronoMs();
                CRONO.inicio = 0;
            } else {
                CRONO.inicio = agoraMs();
            }
            this._acao();
        });
        menu.addAction('Volta', () => {
            CRONO.voltas.push(cronoMs());
            this._acao();
        });
        menu.addAction('Zerar', () => {
            CRONO.inicio = 0;
            CRONO.acumulado = 0;
            CRONO.voltas = [];
            this._acao();
        });
        CRONO.voltas.slice(-5).forEach((ms, i, ult) => {
            const n = CRONO.voltas.length - ult.length + i + 1;
            const anterior = n > 1 ? CRONO.voltas[n - 2] : 0;
            linha(menu, `Volta ${n}: ${formatarCrono(ms)} (+${formatarCrono(ms - anterior)})`);
        });
    }
}
