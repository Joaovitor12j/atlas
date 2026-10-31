#!/usr/bin/env -S gjs -m
// App de configuração do ATLAS (dev.joaovitor12j.Atlas). Instância única: abrir de novo traz a janela existente.
import Adw from 'gi://Adw';
import Gtk from 'gi://Gtk';
import System from 'system';
import {abrirConfig} from './config.js';
import {Paginas} from './paginas.js';

const ID = 'dev.joaovitor12j.Atlas';

const app = new Adw.Application({application_id: ID});
app.connect('activate', () => {
    let win = app.active_window;
    if (!win) {
        Gtk.Window.set_default_icon_name(ID);
        win = new Adw.PreferencesWindow({application: app});
        win.set_default_size(560, 700);
        new Paginas().preencher(win, abrirConfig());
    }
    win.present();
});
app.run([System.programInvocationName, ...ARGV]);
