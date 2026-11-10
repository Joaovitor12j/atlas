// ATLAS: dock com lente de ampliação para GNOME Shell (Wayland/X11).
// Mutter não aceita layer-shell, então o dock é um actor "chrome" desenhado pelo próprio Shell.
// Este arquivo é o gerenciador: junta as funcionalidades (doca por tela, ambientes, mascotes, painel) e as liga/desliga.
import Gio from 'gi://Gio';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import {registrarAtalhos} from '../ambientes/atalhos.js';
import {SeguirAmbiente} from '../ambientes/seguir.js';
import {pararClima} from '../clima/servico.js';
import {Mascotes} from '../mascotes/index.js';
import {perfilar} from '../nucleo/perf.js';
import {pararPonte} from '../nucleo/ponte.js';
import {pararWidgets} from '../widgets/index.js';
import {CssTemas} from './css.js';
import {DockView} from './doca.js';
import {telasDoShell} from './monitores.js';
import {PainelShell} from './painel.js';

const SCHEMA_ID = 'org.gnome.shell.extensions.atlas';

// Gerenciador: carrega configuração e CSS uma vez e cria uma doca por tela conforme a chave `telas`.
export class Dock {
    // `dir`: pasta da extensão, dada pelo extension.js (os módulos rodam de uma cópia temporária).
    constructor(dir) {
        this._extDir = dir ?? Gio.File.new_for_uri(import.meta.url.split('?')[0]).get_parent().get_parent();
    }

    enable() {
        this._signals = [];
        this._views = [];
        this._settings = this._loadSettings();
        this._css = new CssTemas(this._extDir);
        this._css.carregar();

        this._connect(Main.layoutManager, 'monitors-changed', () => this._buildViews());
        this._painel = new PainelShell(this._settings, this._extDir, () => this._openPrefs());
        if (this._settings)
            this._connect(this._settings, 'changed::no-overview', () => {
                this._painel.sincronizarDash();
                this._buildViews();
            });
        this._painel.sincronizarDash();
        if (this._settings)
            this._connect(this._settings, 'changed::mostrar-icone-painel', () => this._painel.sincronizarIcone());
        this._painel.sincronizarIcone();
        this._removerAtalhos = this._settings ? registrarAtalhos(this._settings) : null;
        if (this._settings)
            this._connect(this._settings, 'changed::monitores', () => this._buildViews());
        if (this._settings) {
            this._migrarTelas();
            // só recria as docas se mudou quais telas têm doca; o auto-ocultar cada doca resolve sozinha
            this._connect(this._settings, 'changed::telas', () => {
                // "Restaurar padrões" do app esvazia a chave: regrava na hora, senão o app mostra todas as telas
                // desligadas e ligar uma delas apagaria a doca das outras
                if (!this._settings.get_string('telas')) {
                    this._migrarTelas();
                    return; // a gravação acima dispara este sinal de novo
                }
                const quer = this._monitorIndexes().join();
                if (quer !== this._views.map(v => v._monIdx).join())
                    this._buildViews();
            });
        }
        this._seguir = new SeguirAmbiente(this._settings, (obj, nome, cb) => this._connect(obj, nome, cb));
        if (this._settings) {
            perfilar(this._settings.get_boolean('perfil-ativo'));
            this._connect(this._settings, 'changed::perfil-ativo', () => perfilar(this._settings.get_boolean('perfil-ativo')));
        }
        if (this._settings) {
            // um temporizador só, e só com um mascote ligado
            this._mascotes = new Mascotes(this._settings, {
                pasta: () => this._extDir,
                doca: () => this._views.find(v => v._monIdx === Main.layoutManager.primaryIndex) ?? this._views[0],
                naoPerturbe: () => this._seguir.naoPerturbe(),
            });
            this._mascotes.enable();
        }
        this._buildViews();
    }

    disable() {
        for (const [obj, id] of this._signals)
            obj.disconnect(id);
        this._signals = [];
        this._removerAtalhos?.();
        this._removerAtalhos = null;
        this._seguir?.parar();
        this._seguir = null;
        this._mascotes?.disable();
        this._mascotes = null;
        perfilar(false);
        pararWidgets();
        pararPonte();
        pararClima();
        this._destroyViews();
        this._painel?.restaurar();
        this._painel = null;
        this._css?.descarregar();
        this._css = null;
        this._settings = null;
    }

    _connect(obj, name, cb) {
        this._signals.push([obj, obj.connect(name, cb)]);
    }

    _buildViews() {
        this._destroyViews();
        for (const i of this._monitorIndexes()) {
            const view = new DockView(this._settings, i, () => this._openPrefs());
            this._views.push(view); // entra antes, para o disable limpar mesmo se o enable falhar no meio
            try {
                view.enable();
            } catch (e) {
                console.error(`[atlas] falha ao criar a doca da tela ${i}: ${e}\n${e.stack}`);
            }
        }
    }

    // Primeira vez com o recurso: grava em `telas` o que as chaves antigas (`monitores`, `auto-ocultar`) diziam.
    _migrarTelas() {
        const st = this._settings;
        if (st.get_string('telas'))
            return;
        const t = telasDoShell(st);
        const obj = {};
        t.lista.forEach((e, i) => {
            obj[String(i + 1)] = {ativa: e.ativa, auto: e.auto};
        });
        st.set_string('telas', JSON.stringify(obj));
    }

    // Índices dos monitores do Shell que têm doca.
    _monitorIndexes() {
        return telasDoShell(this._settings).ativos;
    }

    // Abre o app de configuração (app/main.js, dentro da pasta da extensão); sem ele, cai no prefs do Shell.
    _openPrefs() {
        try {
            const dir = this._extDir;
            const main = dir.get_child('app').get_child('main.js');
            if (main.query_exists(null))
                Gio.Subprocess.new(['gjs', '-m', main.get_path()], Gio.SubprocessFlags.NONE);
            else if (Main.extensionManager.lookup(dir.get_basename())?.hasPrefs)
                Main.extensionManager.openExtensionPrefs(dir.get_basename(), '', {});
            else
                Main.notify('ATLAS', 'App de configuração não encontrado.');
        } catch (e) {
            console.error(`[atlas] não consegui abrir as preferências: ${e}`);
        }
    }

    _destroyViews() {
        for (const v of this._views ?? [])
            v.disable();
        this._views = [];
    }

    // Lê o schema da pasta da própria extensão (sem precisar instalá-lo no sistema).
    _loadSettings() {
        try {
            const src = Gio.SettingsSchemaSource.new_from_directory(
                this._extDir.get_child('schemas').get_path(), Gio.SettingsSchemaSource.get_default(), false);
            return new Gio.Settings({settings_schema: src.lookup(SCHEMA_ID, true)});
        } catch (e) {
            console.error(`[atlas] sem GSettings, usando valores padrão: ${e}`);
            return null;
        }
    }
}
