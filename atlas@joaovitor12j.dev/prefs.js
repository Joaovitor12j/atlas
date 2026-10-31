// Engrenagem do app Extensões: abre o app de configuração e fecha a janela vazia (padrão do GSConnect).
import GLib from 'gi://GLib';
import Gio from 'gi://Gio';
import {ExtensionPreferences} from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

export default class AtlasPrefs extends ExtensionPreferences {
    fillPreferencesWindow(window) {
        try {
            const alvo = Gio.File.new_for_path(this.path).query_info(
                'standard::symlink-target', Gio.FileQueryInfoFlags.NOFOLLOW_SYMLINKS, null).get_symlink_target();
            const raiz = Gio.File.new_for_path(alvo ?? this.path).get_parent();
            Gio.Subprocess.new(['gjs', '-m', raiz.get_child('app').get_child('main.js').get_path()], Gio.SubprocessFlags.NONE);
        } catch (e) {
            console.error(`[atlas] não consegui abrir o app de configuração: ${e}`);
        }
        GLib.idle_add(GLib.PRIORITY_DEFAULT_IDLE, () => {
            window.close();
            return GLib.SOURCE_REMOVE;
        });
    }
}
