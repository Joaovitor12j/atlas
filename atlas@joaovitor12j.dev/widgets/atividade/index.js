// Widget Atividade: CPU e memória.

// Amostras compartilhadas: o gráfico não zera quando a doca é reconstruída nem quando há uma doca por tela.
import St from 'gi://St';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';
import {anel, cor, grafico} from '../../nucleo/desenho.js';
import {empilhar, lerProc, ultimo} from '../amostras.js';
import {agoraMs, Camada, COR, Widget} from '../base.js';
import {percentualCpu} from './logica.js';

const ATIV = {cpu: [], mem: [], ant: null, ultimo: 0};

function ativAmostrar() {
    const agora = agoraMs();
    if (ATIV.ultimo && agora - ATIV.ultimo < 1500)
        return;
    ATIV.ultimo = agora;
    const n = lerProc('/proc/stat').split('\n')[0].trim().split(/\s+/).slice(1, 9).map(Number);
    const atual = n.length >= 4 ? {total: n.reduce((a, b) => a + b, 0), ocioso: n[3] + (n[4] || 0)} : null;
    const cpu = percentualCpu(ATIV.ant, atual);
    if (atual)
        ATIV.ant = atual;
    const txt = lerProc('/proc/meminfo');
    const total = Number(/MemTotal:\s+(\d+)/.exec(txt)?.[1]);
    const livre = Number(/MemAvailable:\s+(\d+)/.exec(txt)?.[1]);
    if (cpu !== null)
        empilhar(ATIV.cpu, cpu);
    if (total)
        empilhar(ATIV.mem, Math.round((1 - livre / total) * 100));
}

export class Atividade extends Widget {
    static FONTES = [0.13, 0.22, 0.17];
    static LARGURA = 2.2;

    get intervalo() {
        return 2000;
    }

    logica() {
        ativAmostrar();
    }

    get etiqueta() {
        return `CPU ${ultimo(ATIV.cpu)}%, memória ${ultimo(ATIV.mem)}%`;
    }

    construir() {
        this._criarTexto();
        this._camada((cr, w, h) => {
            const lado = Math.min(h, this._tam);
            const cx = lado / 2;
            const cy = h / 2;
            const r = lado / 2 - 5;
            anel(cr, cx, cy, r, 4, ultimo(ATIV.cpu) / 100, cor(COR.ambar));
            anel(cr, cx, cy, r - 6, 2.5, ultimo(ATIV.mem) / 100, cor(COR.azul));
            if (this._largo) {
                grafico(cr, lado + 6, 12, w - lado - 18, h - 24, [
                    {valores: ATIV.mem, cor: cor(COR.azul, 0.9)},
                    {valores: ATIV.cpu, cor: cor(COR.ambar), preencher: true},
                ]);
            }
        });
        if (this._largo)
            this._textoNoQuadrado();
        else
            this._ocultar(this._base); // no quadrado, o RAM já está no anel de dentro e no tooltip
        this._ocultar(this._topo);
    }

    atualizar() {
        this._txt(this._meio, `${ultimo(ATIV.cpu)}%`);
        this._txt(this._base, `RAM ${ultimo(ATIV.mem)}%`);
        // no quadrado só os anéis mudam com os valores; no largo o gráfico anda a cada amostra
        if (this._largo || this._mudou('v', `${ultimo(ATIV.cpu)}|${ultimo(ATIV.mem)}`))
            this._redesenhar();
    }

    fillMenu(menu) {
        menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem('Atividade'));
        const l = this._textoPainel('', 13);
        const grade = new Camada((cr, w, h) => {
            cr.setSourceRGBA(0.5, 0.5, 0.5, 0.12);
            cr.rectangle(0, 0, w, h);
            cr.fill();
            grafico(cr, 4, 6, w - 8, h - 12, [
                {valores: ATIV.mem, cor: cor(COR.azul, 0.9)},
                {valores: ATIV.cpu, cor: cor(COR.ambar), preencher: true},
            ]);
        }, '');
        grade.actor.set_size(244, 92);
        const caixa = new St.BoxLayout({vertical: true, style: 'spacing: 6px;'});
        caixa.add_child(grade.actor);
        caixa.add_child(l);
        const atualizar = () => {
            ativAmostrar();
            l.text = `CPU ${ultimo(ATIV.cpu)}%  ·  Memória ${ultimo(ATIV.mem)}%`;
            grade.redesenhar();
        };
        atualizar();
        this._item(menu, caixa);
        this._vivo(menu, 2000, atualizar, caixa);
    }
}
