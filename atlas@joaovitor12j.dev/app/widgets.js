// Aba Widgets: grade de cartões por ambiente (toque liga/desliga) e opções gerais em cartões.
import Adw from 'gi://Adw';
import GLib from 'gi://GLib';
import Gtk from 'gi://Gtk';
import {CORES_TEMA} from '../temas/catalogo.js';
import {WIDGETS} from '../widgets/catalogo.js';
import {diasAte} from '../widgets/contagem/logica.js';
import {cartao} from './aparencia.js';
import {desenharPapelDeParede, desenharWidget} from './previa.js';

// descrição curta de cada widget
const VISUAL = {
    relogio: 'Ponteiros ou digital',
    pomodoro: 'Foco e pausas',
    bateria: 'Carga e tempo restante',
    musica: 'Capa e controles',
    progresso: 'Dia, semana, mês, ano',
    cronometro: 'Conta com voltas',
    timer: 'Contagem regressiva',
    atividade: 'CPU e memória',
    rede: 'Download e upload',
    contagem: 'Dias até uma data',
    clipboard: 'Histórico e fixados',
    slack: 'Selo de não lidas',
    clima: 'Tempo agora e previsão',
    nota: 'Um recado fixo',
};

function lerAmbientes(settings) {
    try {
        const v = JSON.parse(settings.get_string('ambientes'));
        return Array.isArray(v) ? v : [];
    } catch (_e) {
        return [];
    }
}

export function criarWidgets(settings, p) {
    const cartoes = [];
    let interno = false; // as próprias gravações não reconstroem a grade
    let escolhido = null;

    const alterar = (id, fn) => {
        const lista = lerAmbientes(settings);
        const amb = lista.find(a => a.id === id);
        if (!amb)
            return;
        fn(amb);
        interno = true;
        settings.set_string('ambientes', JSON.stringify(lista));
        interno = false;
    };

    // ----- Cartão principal: widgets do ambiente -----
    const cabeca = new Gtk.Box({spacing: 12});
    const titulos = new Gtk.Box({orientation: Gtk.Orientation.VERTICAL, hexpand: true});
    titulos.append(new Gtk.Label({label: 'Widgets do ambiente', xalign: 0, css_classes: ['atlas-cartao-titulo']}));
    titulos.append(new Gtk.Label({label: 'Toque num cartão para ligar ou desligar na doca do ambiente escolhido.', xalign: 0, wrap: true, css_classes: ['atlas-cartao-sub']}));
    cabeca.append(titulos);
    const seletor = new Gtk.Box({css_classes: ['atlas-seg'], spacing: 2, valign: Gtk.Align.START});
    cabeca.append(seletor);
    const grade = new Gtk.Grid({column_spacing: 10, row_spacing: 10, column_homogeneous: true, margin_top: 6});
    const vazio = new Gtk.Label({label: 'Widgets ficam dentro de um ambiente. Crie um na aba Ambientes para ligá-los.', xalign: 0, wrap: true, css_classes: ['atlas-cartao-sub'], margin_top: 8});
    const principal = new Gtk.Box({orientation: Gtk.Orientation.VERTICAL, css_classes: ['atlas-cartao']});
    principal.append(cabeca);
    principal.append(grade);
    principal.append(vazio);
    principal._texto = `widgets do ambiente ${WIDGETS.map(w => `${w[1]} ${w[2]} ${VISUAL[w[0]] ?? ''}`).join(' ')}`.toLowerCase();
    cartoes.push(principal);

    const montarCartao = (amb, [id, nome, , largo]) => {
        const curta = VISUAL[id] ?? '';
        const b = new Gtk.Button({css_classes: ['atlas-w']});
        const col = new Gtk.Box({spacing: 12});
        const texto = new Gtk.Box({orientation: Gtk.Orientation.VERTICAL, spacing: 2, hexpand: true, valign: Gtk.Align.CENTER});
        // o tile como ele aparece na doca, com o tema do ambiente, sobre o papel de parede
        const tile = new Gtk.DrawingArea({content_width: 52, content_height: 52, valign: Gtk.Align.CENTER});
        tile.set_draw_func((_a, cr, w, h) => {
            const tema = amb.tema && CORES_TEMA[amb.tema] ? amb.tema : settings.get_string('tema');
            cr.save();
            desenharPapelDeParede(cr, w, h, 12);
            cr.restore();
            cr.save();
            cr.translate(5, 5);
            desenharWidget(cr, id, w - 10, h - 10, CORES_TEMA[tema] ?? CORES_TEMA.noite, false);
            cr.restore();
        });
        col.append(tile);
        texto.append(new Gtk.Label({label: nome, xalign: 0, css_classes: ['atlas-w-nome']}));
        texto.append(new Gtk.Label({label: curta, xalign: 0, wrap: true, css_classes: ['atlas-w-desc']}));
        const rodape = new Gtk.Box();
        rodape.append(new Gtk.Label({label: largo ? 'Tem versão larga' : '', xalign: 0, hexpand: true, css_classes: ['atlas-w-rodape']}));
        const naDoca = new Gtk.Label({css_classes: ['atlas-w-rodape', 'atlas-ok']});
        rodape.append(naDoca);
        texto.append(rodape);
        col.append(texto);
        b.child = col;
        const marcar = () => {
            const on = (lerAmbientes(settings).find(a => a.id === amb.id)?.widgets ?? []).includes(id);
            naDoca.label = on ? '● Na doca' : '';
            if (on)
                b.add_css_class('atlas-w-on');
            else
                b.remove_css_class('atlas-w-on');
        };
        marcar();
        b.connect('clicked', () => {
            alterar(amb.id, a => {
                const ws = (a.widgets ?? []).filter(x => x !== id);
                if (!(a.widgets ?? []).includes(id))
                    ws.push(id);
                a.widgets = ws;
            });
            marcar();
        });
        return b;
    };

    const montar = () => {
        const lista = lerAmbientes(settings);
        for (let f = seletor.get_first_child(); f; f = seletor.get_first_child())
            seletor.remove(f);
        for (let f = grade.get_first_child(); f; f = grade.get_first_child())
            grade.remove(f);
        vazio.visible = !lista.length;
        seletor.visible = lista.length > 1;
        if (!lista.length)
            return;
        if (!lista.some(a => a.id === escolhido))
            escolhido = lista.find(a => a.id === settings.get_string('ambiente-atual'))?.id ?? lista[0].id;
        const botoes = lista.map(a => {
            const b = new Gtk.ToggleButton({label: a.nome, active: a.id === escolhido});
            seletor.append(b);
            return b;
        });
        botoes.slice(1).forEach(b => b.set_group(botoes[0]));
        botoes.forEach((b, i) => b.connect('toggled', () => {
            if (!b.active)
                return;
            escolhido = lista[i].id;
            GLib.idle_add(GLib.PRIORITY_DEFAULT, () => {
                montar();
                return GLib.SOURCE_REMOVE;
            });
        }));
        const amb = lista.find(a => a.id === escolhido);
        WIDGETS.forEach((w, i) => grade.attach(montarCartao(amb, w), i % 4, Math.floor(i / 4), 1, 1));
    };
    montar();
    settings.connect('changed::ambientes', () => {
        if (!interno)
            montar();
    });

    // ----- Opções gerais -----
    const lista = new Gtk.ListBox({selection_mode: Gtk.SelectionMode.NONE, css_classes: ['boxed-list']});
    const linhas = [
        p._spin(settings, 'pomodoro-foco', 'Pomodoro: foco', 'Minutos de foco', 1, 180, 1, 0),
        p._spin(settings, 'pomodoro-pausa', 'Pomodoro: pausa curta', 'Minutos', 1, 60, 1, 0),
        p._spin(settings, 'pomodoro-pausa-longa', 'Pomodoro: pausa longa', 'Minutos, a cada 4 focos', 1, 120, 1, 0),
        p._spin(settings, 'timer-minutos', 'Timer: duração', 'Minutos', 1, 600, 1, 0),
        p._combo(settings, 'widgets-posicao', 'Posição na doca', [
            ['depois', 'Depois dos apps (no fim)'],
            ['antes', 'Antes dos apps (logo após o seletor)'],
        ]),
        p._texto(settings, 'contagem-nome', 'Contagem regressiva: nome', v => v.length <= 40),
        p._texto(settings, 'contagem-data', 'Contagem regressiva: data (AAAA-MM-DD)',
            v => v === '' || diasAte({ano: 2000, mes: 1, dia: 1}, v) !== null),
        p._texto(settings, 'nota-texto', 'Nota', v => v.length <= 200),
        p._switch(settings, 'relogio-24h', 'Relógio em 24 horas', 'Desligado mostra 12 horas'),
    ];
    for (const l of linhas)
        lista.append(l);
    const geral = cartao('Opções gerais', 'Valem para todos os ambientes.', lista);
    geral._texto += ` ${linhas.map(l => `${l.title} ${l.subtitle ?? ''}`).join(' ').toLowerCase()}`;
    cartoes.push(geral);

    // ----- Tiles largos e Clima -----
    const largos = new Gtk.ListBox({selection_mode: Gtk.SelectionMode.NONE, css_classes: ['boxed-list']});
    for (const [wid, nome] of WIDGETS.filter(w => w[3])) {
        const sw = new Adw.SwitchRow({title: nome, active: settings.get_strv('widgets-largos').includes(wid)});
        sw.connect('notify::active', () => {
            const l = settings.get_strv('widgets-largos').filter(x => x !== wid);
            if (sw.active)
                l.push(wid);
            settings.set_strv('widgets-largos', l);
        });
        largos.append(sw);
    }
    const cLargos = cartao('Tiles largos', 'O widget vira uma faixa com mais informação. Só vale com a doca embaixo.', largos);
    cLargos._texto += ` ${WIDGETS.filter(w => w[3]).map(w => w[1]).join(' ').toLowerCase()}`;
    cartoes.push(cLargos);

    const clima = p._grupoClima(settings);
    const subClima = clima.description;
    clima.title = '';
    clima.description = '';
    const cClima = cartao('Clima', subClima, clima);
    cartoes.push(cClima);

    const direita = new Gtk.Box({orientation: Gtk.Orientation.VERTICAL, spacing: 16});
    direita.append(cLargos);
    direita.append(cClima);

    const corpo = new Gtk.Grid({column_spacing: 16, row_spacing: 16, column_homogeneous: true, css_classes: ['atlas-corpo']});
    corpo.attach(principal, 0, 0, 12, 1);
    corpo.attach(geral, 0, 1, 7, 1);
    corpo.attach(direita, 7, 1, 5, 1);

    const rolagem = new Gtk.ScrolledWindow({child: corpo, hscrollbar_policy: Gtk.PolicyType.NEVER, vexpand: true});
    rolagem._filtrar = q => {
        let n = 0;
        for (const c of cartoes) {
            c.visible = !q || c._texto.includes(q);
            n += c.visible ? 1 : 0;
        }
        direita.visible = cLargos.visible || cClima.visible;
        return n;
    };
    return rolagem;
}
