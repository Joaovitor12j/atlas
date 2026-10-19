// Lançador independente da janela de preferências: registra o gresource do app Extensions
// (de onde prefs.js importa ExtensionPreferences) e monta a janela sem passar pelo Shell.
import Adw from 'gi://Adw';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';

Gio.Resource.load('/usr/share/gnome-shell/org.gnome.Shell.Extensions.src.gresource')._register();

const raiz = GLib.path_get_dirname(import.meta.url.replace('file://', ''));
const path = `${raiz}/atlas@joaovitor12j.dev`;
const metadata = JSON.parse(new TextDecoder().decode(GLib.file_get_contents(`${path}/metadata.json`)[1]));
metadata.path = path;
metadata.dir = Gio.File.new_for_path(path);

const {default: Prefs} = await import(`file://${path}/prefs.js`);

const app = new Adw.Application({application_id: 'dev.ixcsoft.AtlasPrefs'});
app.connect('activate', () => {
    const win = new Adw.PreferencesWindow({application: app});
    new Prefs(metadata).fillPreferencesWindow(win);
    win.present();
});
app.run([]);
