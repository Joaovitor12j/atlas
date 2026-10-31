#!/usr/bin/env -S gjs -m
// App de configuração do ATLAS (dev.joaovitor12j.Atlas). Instância única: abrir de novo traz a janela existente.
// Uso: main.js [--pagina=dock|ambientes|widgets|mascotes|sobre]
import Adw from 'gi://Adw';
import Gdk from 'gi://Gdk';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import Gtk from 'gi://Gtk';
import System from 'system';
import {abrirConfig} from './config.js';
import {criarJanela} from './janela.js';

const ID = 'dev.joaovitor12j.Atlas';

const app = new Adw.Application({application_id: ID, flags: Gio.ApplicationFlags.HANDLES_COMMAND_LINE});
app.add_main_option('pagina', 0, GLib.OptionFlags.NONE, GLib.OptionArg.STRING, 'Página a abrir', 'ID');

let janela = null;

app.connect('command-line', (_a, cmd) => {
    const opts = cmd.get_options_dict().end().recursiveUnpack();
    if (!janela) {
        Adw.StyleManager.get_default().color_scheme = Adw.ColorScheme.FORCE_DARK;
        Gtk.Window.set_default_icon_name(ID);
        const css = new Gtk.CssProvider();
        css.load_from_path(GLib.build_filenamev([GLib.path_get_dirname(import.meta.url.replace('file://', '')), 'estilo.css']));
        Gtk.StyleContext.add_provider_for_display(Gdk.Display.get_default(), css, Gtk.STYLE_PROVIDER_PRIORITY_APPLICATION);
        janela = criarJanela(app, abrirConfig(), opts.pagina);
    } else if (opts.pagina) {
        janela.ir(opts.pagina);
    }
    janela.win.present();
    return 0;
});
app.run([System.programInvocationName, ...ARGV]);
