// Widget Rede: velocidade de download e upload.

// ----- Rede (bytes por segundo, via /proc/net/dev) -----
import St from 'gi://St';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';
import {cor, grafico} from '../../desenho.js';
import {empilhar, lerProc, ultimo} from '../amostras.js';
import {agoraMs, AL, Camada, COR, Widget} from '../base.js';
import {escalaGrafico, formatarBps, formatarTaxa} from './logica.js';

const REDE = {down: [], up: [], ant: null, ultimo: 0};

function redeAmostrar() {
    const t = agoraMs();
    if (REDE.ultimo && t - REDE.ultimo < 800)
        return;
    REDE.ultimo = t;
    let rx = 0;
    let tx = 0;
    for (const l of lerProc('/proc/net/dev').split('\n').slice(2)) {
        const [nome, resto] = l.split(':');
        if (!resto || nome.trim() === 'lo')
            continue;
        const c = resto.trim().split(/\s+/).map(Number);
        rx += c[0] || 0;
        tx += c[8] || 0;
    }
    if (REDE.ant) {
        const dt = Math.max(0.001, (t - REDE.ant.t) / 1000);
        empilhar(REDE.down, Math.max(0, (rx - REDE.ant.rx) / dt));
        empilhar(REDE.up, Math.max(0, (tx - REDE.ant.tx) / dt));
    }
    REDE.ant = {rx, tx, t};
}

export class Rede extends Widget {
    static FONTES = [0.22, 0.22, 0.12];
    static LARGURA = 2.2;

    get intervalo() {
        return 1000;
    }

    logica() {
        redeAmostrar();
    }

    get etiqueta() {
        return `Rede: ↓ ${formatarBps(ultimo(REDE.down))}, ↑ ${formatarBps(ultimo(REDE.up))}`;
    }

    construir() {
        this._criarTexto();
        this._camada((cr, w, h) => {
            const x0 = this._largo ? this._tam + 2 : 6;
            const topo = this._largo ? 10 : h * 0.5;
            const max = escalaGrafico([REDE.down, REDE.up], 10240);
            grafico(cr, x0, topo, w - x0 - 8, h - topo - 8, [
                {valores: REDE.down, cor: cor(COR.ok), preencher: true},
                {valores: REDE.up, cor: cor(COR.ambar)},
            ], {max});
        });
        this._texto.y_align = AL.START;
        this._topo.style += ` color: ${COR.ok};`;
        this._meio.style += ` color: ${COR.ambar};`;
        this._ocultar(this._base);
        if (this._largo)
            this._textoNoQuadrado();
    }

    atualizar() {
        this._txt(this._topo, `↓${formatarTaxa(ultimo(REDE.down))}`);
        this._txt(this._meio, `↑${formatarTaxa(ultimo(REDE.up))}`);
        // com o histórico cheio e a taxa igual, o gráfico não muda
        if (this._mudou('r', `${ultimo(REDE.down)}|${ultimo(REDE.up)}`) || REDE.down.length < 60)
            this._redesenhar();
    }

    fillMenu(menu) {
        menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem('Rede'));
        const l = this._textoPainel('', 13);
        const grade = new Camada((cr, w, h) => {
            cr.setSourceRGBA(0.5, 0.5, 0.5, 0.12);
            cr.rectangle(0, 0, w, h);
            cr.fill();
            grafico(cr, 4, 6, w - 8, h - 12, [
                {valores: REDE.down, cor: cor(COR.ok), preencher: true},
                {valores: REDE.up, cor: cor(COR.ambar)},
            ], {max: escalaGrafico([REDE.down, REDE.up], 10240)});
        }, '');
        grade.actor.set_size(244, 92);
        const caixa = new St.BoxLayout({vertical: true, style: 'spacing: 6px;'});
        caixa.add_child(grade.actor);
        caixa.add_child(l);
        const atualizar = () => {
            redeAmostrar();
            l.text = `↓ ${formatarBps(ultimo(REDE.down))}  ·  ↑ ${formatarBps(ultimo(REDE.up))}`;
            grade.redesenhar();
        };
        atualizar();
        this._item(menu, caixa);
        this._vivo(menu, 1000, atualizar, caixa);
    }
}
