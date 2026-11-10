// Widget Pomodoro: foco e pausas, com o estado compartilhado entre doca e ambientes.
import GLib from 'gi://GLib';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';
import {anelDeTile, cor} from '../../desenho.js';
import {AO_CONCLUIR_FOCO} from '../../nucleo/eventos.js';
import {agoraMs, CFG, COR, MIN, Widget} from '../base.js';
import {formatarCrono} from '../formato.js';
import {proximaFase} from './logica.js';

const FASES = {
    foco: {nome: 'Foco', chave: 'pomodoro-foco', padrao: 25, cor: COR.foco},
    pausa: {nome: 'Pausa', chave: 'pomodoro-pausa', padrao: 5, cor: COR.ok},
    longa: {nome: 'Pausa longa', chave: 'pomodoro-pausa-longa', padrao: 15, cor: COR.azul},
};

const duracaoFase = fase => (CFG?.get_int(FASES[fase].chave) ?? FASES[fase].padrao) * MIN;

// `intacto`: a fase ainda não rodou, então uma mudança de duração nas preferências vale na hora.
const POMO = {fase: 'foco', fim: 0, restante: 25 * MIN, intacto: true, ciclos: 0, dia: '', pulsoAte: 0};

function pomoRestante() {
    return POMO.fim ? Math.max(0, POMO.fim - agoraMs()) : POMO.restante;
}

function pomoTrocarFase(fase) {
    POMO.fase = fase;
    POMO.restante = duracaoFase(fase);
    POMO.fim = 0;
    POMO.intacto = true;
}

// Foco concluído conta um ciclo; a cada 4 vem a pausa longa.
function pomoAvancar() {
    const prox = proximaFase(POMO.fase, POMO.ciclos);
    POMO.ciclos = prox.ciclos;
    pomoTrocarFase(prox.fase);
}

// Idempotente: vários widgets (um por tela) chamam isto, só o primeiro encontra o fim vencido.
function pomoTick() {
    const hoje = GLib.DateTime.new_now_local().format('%Y-%m-%d');
    if (POMO.dia !== hoje) {
        POMO.dia = hoje;
        POMO.ciclos = 0;
    }
    if (POMO.fim && agoraMs() >= POMO.fim) {
        const terminou = POMO.fase;
        pomoAvancar();
        POMO.pulsoAte = agoraMs() + 10000; // o tile pisca por 10 s
        if (terminou === 'foco')
            AO_CONCLUIR_FOCO.forEach(f => f()); // o mascote do tomate comemora
        Main.notify('ATLAS',
            terminou === 'foco' ? `Foco concluído. Hora da ${FASES[POMO.fase].nome.toLowerCase()}.` : 'Pausa acabou. Hora de focar.');
    }
}

const pomoFrac = () => (POMO.intacto && !POMO.fim ? 0 : 1 - pomoRestante() / duracaoFase(POMO.fase));

export const mmss = ms => formatarCrono(Math.ceil(ms / 1000) * 1000);

export class Pomodoro extends Widget {
    static FONTES = [0.13, 0.27, 0.18];

    // parado, só confere de vez em quando; rodando, a cada segundo
    get intervalo() {
        return POMO.fim ? 1000 : 4000;
    }

    logica() {
        pomoTick();
    }

    get etiqueta() {
        return `Pomodoro: ${FASES[POMO.fase].nome}`;
    }

    construir() {
        this._criarTexto();
        this._ocultar(this._topo); // a fase aparece na cor do anel e no tooltip
        this._anim = this._animado();
        this._camada((cr, w, h) => anelDeTile(cr, w, h, this._anim.atual, cor(FASES[POMO.fase].cor)));
    }

    atualizar() {
        pomoTick();
        if (POMO.intacto && !POMO.fim)
            POMO.restante = duracaoFase(POMO.fase);
        const f = FASES[POMO.fase];
        const c = POMO.ciclos % 4;
        this._txt(this._topo, f.nome.toUpperCase());
        this._txt(this._meio, mmss(pomoRestante()));
        this._txt(this._base, '●'.repeat(c) + '○'.repeat(4 - c));
        this._anim.definir(pomoFrac());
        this._pulsar(agoraMs() < POMO.pulsoAte);
    }

    fillMenu(menu) {
        menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem('Pomodoro'));
        this._anelGrande(menu, {
            frac: pomoFrac, cor: () => FASES[POMO.fase].cor, texto: () => mmss(pomoRestante()),
            sub: () => `${FASES[POMO.fase].nome} · ${POMO.ciclos} ciclo(s) hoje`,
        });
        menu.addAction(POMO.fim ? 'Pausar' : 'Iniciar', () => {
            if (POMO.fim) {
                POMO.restante = pomoRestante();
                POMO.fim = 0;
            } else {
                POMO.fim = agoraMs() + POMO.restante;
                POMO.intacto = false;
                POMO.pulsoAte = 0;
            }
            this._acao();
        });
        menu.addAction('Pular fase', () => {
            pomoAvancar();
            POMO.pulsoAte = 0;
            this._acao();
        });
        menu.addAction('Reiniciar', () => {
            POMO.ciclos = 0;
            pomoTrocarFase('foco');
            POMO.pulsoAte = 0;
            this._acao();
        });
    }
}
