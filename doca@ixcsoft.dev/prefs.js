// Janela de preferências do ATLAS. As mudanças valem ao vivo: o dock escuta o GSettings.
import Adw from 'gi://Adw';
import Gdk from 'gi://Gdk';
import Gio from 'gi://Gio';
import Gtk from 'gi://Gtk';
import {ExtensionPreferences} from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

const TEMAS = [
    ['noite', 'Noite', 'Grafite-azulado, âmbar e verde-água'],
    ['papel', 'Papel', 'Creme com linhas finas'],
    ['cristal', 'Cristal', 'Vidro translúcido com blur'],
];
const POSICOES = [
    ['baixo', 'Embaixo'],
    ['esquerda', 'Esquerda'],
    ['direita', 'Direita'],
];

export default class AtlasPrefs extends ExtensionPreferences {
    fillPreferencesWindow(window) {
        const settings = this.getSettings();
        window.set_default_size(560, 700);

        const page = new Adw.PreferencesPage({title: 'ATLAS', icon_name: 'preferences-desktop-appearance-symbolic'});
        window.add(page);

        const aparencia = new Adw.PreferencesGroup({title: 'Aparência'});
        page.add(aparencia);
        aparencia.add(this._combo(settings, 'tema', 'Tema', TEMAS.map(([v, n, d]) => [v, `${n}: ${d}`])));
        aparencia.add(this._spin(settings, 'tamanho-icone', 'Tamanho dos ícones', 'Em pixels', 32, 96, 2, 0));

        const lente = new Adw.PreferencesGroup({
            title: 'Lente de ampliação',
            description: 'Força 1,00 desliga a lente.',
        });
        page.add(lente);
        lente.add(this._spin(settings, 'lente-forca', 'Força', 'Quanto o ícone sob o ponteiro cresce', 1, 2.5, 0.05, 2));
        lente.add(this._spin(settings, 'lente-largura', 'Largura', 'Quantos vizinhos a lente alcança, em pixels', 30, 160, 5, 0));

        const posicao = new Adw.PreferencesGroup({title: 'Posição'});
        page.add(posicao);
        posicao.add(this._combo(settings, 'posicao', 'Borda da tela', POSICOES));
        posicao.add(this._spin(settings, 'margem', 'Margem da borda', 'Em pixels', 0, 60, 1, 0));
        aparencia.add(this._switch(settings, 'previa-janelas', 'Prévia de janelas', 'Miniaturas das janelas ao parar o mouse num app aberto'));
        posicao.add(this._switch(settings, 'auto-ocultar', 'Auto-ocultar', 'Esconde a doca e mostra ao encostar na borda da tela'));
        posicao.add(this._combo(settings, 'monitores', 'Telas', this._opcoesTelas()));

        const rodape = new Adw.PreferencesGroup();
        page.add(rodape);
        const reset = new Gtk.Button({label: 'Restaurar padrões', halign: Gtk.Align.START, css_classes: ['destructive-action']});
        reset.connect('clicked', () => {
            for (const key of settings.settings_schema.list_keys())
                settings.reset(key);
        });
        rodape.add(reset);
    }

    // Linha com lista de opções ligada a uma chave string.
    _combo(settings, key, title, opcoes) {
        const row = new Adw.ComboRow({title, model: Gtk.StringList.new(opcoes.map(o => o[1]))});
        const valores = opcoes.map(o => o[0]);
        const sync = () => {
            const i = valores.indexOf(settings.get_string(key));
            if (i >= 0 && row.selected !== i)
                row.selected = i;
        };
        sync();
        row.connect('notify::selected', () => settings.set_string(key, valores[row.selected]));
        settings.connect(`changed::${key}`, sync);
        return row;
    }

    // Opções de tela: principal, todas e cada monitor, na mesma ordem usada pelo dock (esquerda para a direita).
    _opcoesTelas() {
        const opcoes = [['principal', 'Só na tela principal'], ['todas', 'Em todas as telas']];
        const lista = Gdk.Display.get_default()?.get_monitors();
        const mons = [];
        for (let i = 0; lista && i < lista.get_n_items(); i++) {
            const m = lista.get_item(i);
            const g = m.get_geometry();
            mons.push({x: g.x, y: g.y, w: g.width, h: g.height, nome: m.get_connector() ?? m.get_model() ?? ''});
        }
        mons.sort((a, b) => a.x - b.x || a.y - b.y);
        mons.forEach((m, i) => opcoes.push([`tela-${i + 1}`, `Só na tela ${i + 1}: ${m.nome} (${m.w}×${m.h})`]));
        return opcoes;
    }

    // Linha com interruptor ligada a uma chave booleana.
    _switch(settings, key, title, subtitle) {
        const row = new Adw.SwitchRow({title, subtitle});
        settings.bind(key, row, 'active', Gio.SettingsBindFlags.DEFAULT);
        return row;
    }

    // Linha numérica ligada a uma chave int ou double.
    _spin(settings, key, title, subtitle, min, max, step, digits) {
        const row = new Adw.SpinRow({
            title,
            subtitle,
            digits,
            adjustment: new Gtk.Adjustment({lower: min, upper: max, step_increment: step, page_increment: step * 5}),
        });
        settings.bind(key, row, 'value', Gio.SettingsBindFlags.DEFAULT);
        return row;
    }
}
