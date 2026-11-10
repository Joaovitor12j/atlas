// Abre o GSettings do ATLAS pelo schema da pasta da extensão, sem exigir instalação no sistema.
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';

// O app mora em <extensão>/app/, então a pasta da extensão é a pai desta.
const PASTA_EXTENSAO = GLib.path_get_dirname(GLib.path_get_dirname(GLib.filename_from_uri(import.meta.url)[0]));
const SCHEMA = 'org.gnome.shell.extensions.atlas';

export function abrirConfig() {
    const fonte = Gio.SettingsSchemaSource.new_from_directory(
        `${PASTA_EXTENSAO}/schemas`, Gio.SettingsSchemaSource.get_default(), false);
    return new Gio.Settings({settings_schema: fonte.lookup(SCHEMA, true)});
}
