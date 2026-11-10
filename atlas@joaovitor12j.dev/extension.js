// Carregador do ATLAS. O GJS ignora query string no import e guarda cada módulo em cache pela URL, então
// cada enable() copia os módulos (todo .js das pastas de funcionalidade, menos extension.js, prefs.js e app/) para
// uma pasta com nome único e importa de lá. Assim, editar qualquer um deles e fazer disable/enable aplica a mudança
// sem novo login (Wayland). Entrada do dock: dock/index.js.
import Gio from 'gi://Gio';
import {Extension} from 'resource:///org/gnome/shell/extensions/extension.js';

// Tudo o que o dock importa; extension.js, prefs.js e o app de configuração (processo próprio) ficam de fora.
const FORA_NA_RAIZ = new Set(['extension.js', 'prefs.js']);
const PASTAS_FORA = new Set(['app', 'schemas', 'icons', 'sprites']);

function filhos(pasta) {
    const lista = [];
    const it = pasta.enumerate_children('standard::name,standard::type', Gio.FileQueryInfoFlags.NOFOLLOW_SYMLINKS, null);
    for (let info = it.next_file(null); info; info = it.next_file(null))
        lista.push({nome: info.get_name(), pasta: info.get_file_type() === Gio.FileType.DIRECTORY});
    return lista;
}

function apagarPasta(pasta) {
    try {
        for (const f of filhos(pasta)) {
            if (f.pasta)
                apagarPasta(pasta.get_child(f.nome));
            else
                pasta.get_child(f.nome).delete(null);
        }
        pasta.delete(null);
    } catch (_e) { /* já removida */ }
}

export default class AtlasLoader extends Extension {
    enable() {
        const token = this._token = {};
        this._limparSobras();
        const pasta = this.dir.get_child(`.run-${Date.now()}`);
        try {
            pasta.make_directory(null);
            for (const caminho of this._modulos()) {
                const destino = caminho.reduce((d, parte) => d.get_child(parte), pasta);
                destino.get_parent().make_directory_with_parents(null);
                caminho.reduce((d, parte) => d.get_child(parte), this.dir).copy(destino, Gio.FileCopyFlags.OVERWRITE, null, null);
            }
        } catch (e) {
            console.error(`[atlas] não consegui copiar os módulos: ${e}`);
            apagarPasta(pasta);
            return;
        }
        import(pasta.get_child('dock').get_child('index.js').get_uri()).then(mod => {
            if (this._token !== token)
                return; // desativada enquanto importava
            this._dock = new mod.Dock(this.dir);
            this._dock.enable();
        }).catch(e => console.error(`[atlas] falha ao carregar dock/index.js: ${e}\n${e.stack}`))
        .finally(() => apagarPasta(pasta)); // os módulos já estão em memória
    }

    disable() {
        this._token = null;
        this._dock?.disable();
        this._dock = null;
    }

    // Caminhos (lista de partes) de todo .js a copiar, varrendo as pastas de funcionalidade.
    _modulos() {
        const caminhos = [];
        const varrer = (pasta, partes) => {
            for (const f of filhos(pasta)) {
                if (f.nome.startsWith('.'))
                    continue;
                if (f.pasta) {
                    if (partes.length || !PASTAS_FORA.has(f.nome))
                        varrer(pasta.get_child(f.nome), [...partes, f.nome]);
                } else if (f.nome.endsWith('.js') && (partes.length || !FORA_NA_RAIZ.has(f.nome))) {
                    caminhos.push([...partes, f.nome]);
                }
            }
        };
        varrer(this.dir, []);
        return caminhos;
    }

    // Pastas de uma sessão que travou no meio do carregamento.
    _limparSobras() {
        try {
            for (const f of filhos(this.dir)) {
                if (f.nome.startsWith('.run-'))
                    apagarPasta(this.dir.get_child(f.nome));
            }
        } catch (_e) { /* sem sobras */ }
    }
}
