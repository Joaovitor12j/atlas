// Abre o GSettings do ATLAS pelo schema da pasta da extensão, sem exigir instalação no sistema.
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';

const RAIZ = GLib.path_get_dirname(GLib.path_get_dirname(import.meta.url.replace('file://', '')));
export const PASTA_EXTENSAO = `${RAIZ}/atlas@joaovitor12j.dev`;
const SCHEMA = 'org.gnome.shell.extensions.atlas';

export function abrirConfig() {
    const fonte = Gio.SettingsSchemaSource.new_from_directory(
        `${PASTA_EXTENSAO}/schemas`, Gio.SettingsSchemaSource.get_default(), false);
    return new Gio.Settings({settings_schema: fonte.lookup(SCHEMA, true)});
}

export function lerVersao() {
    try {
        const [, bytes] = GLib.file_get_contents(`${PASTA_EXTENSAO}/metadata.json`);
        return JSON.parse(new TextDecoder().decode(bytes))['version-name'] ?? '';
    } catch (_e) {
        return '';
    }
}
