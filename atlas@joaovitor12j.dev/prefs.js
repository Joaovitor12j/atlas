// Janela de preferências do ATLAS. As mudanças valem ao vivo: o dock escuta o GSettings.
import Adw from 'gi://Adw';
import Gdk from 'gi://Gdk';
import GLib from 'gi://GLib';
import Gio from 'gi://Gio';
import Gtk from 'gi://Gtk';
import {ExtensionPreferences} from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';
import {TEMAS, WIDGETS} from './catalogo.js';
import {diasAte} from './logica.js';

const POSICOES = [
    ['baixo', 'Embaixo'],
    ['esquerda', 'Esquerda'],
    ['direita', 'Direita'],
];

export default class AtlasPrefs extends ExtensionPreferences {
    fillPreferencesWindow(window) {
        const settings = this.getSettings();
        window.set_default_size(560, 700);

        const page = new Adw.PreferencesPage({title: 'Geral', icon_name: 'preferences-desktop-appearance-symbolic'});
        window.add(page);

        const aparencia = new Adw.PreferencesGroup({title: 'Aparência'});
        page.add(aparencia);
        aparencia.add(this._combo(settings, 'tema', 'Tema', TEMAS.map(([v, n, d]) => [v, `${n}: ${d}`])));
        aparencia.add(this._combo(settings, 'efeito-hover', 'Efeito ao passar o mouse', [
            ['nenhum', 'Só a lente'], ['brilho', 'Brilho no fundo do ícone'], ['elevar', 'Ícone sobe'],
        ]));
        aparencia.add(this._combo(settings, 'estilo-indicador', 'Indicador de app aberto', [
            ['ponto', 'Ponto'], ['barra', 'Barra'], ['nenhum', 'Nenhum'],
        ]));
        aparencia.add(this._combo(settings, 'animacao-abertura', 'Animação de abertura', [
            ['nenhuma', 'Nenhuma'], ['deslizar', 'Deslizar da borda'], ['surgir', 'Surgir (fade)'],
        ]));
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
        aparencia.add(this._switch(settings, 'no-overview', 'ATLAS na tela de aplicativos', 'Mantém a doca visível ao abrir todos os aplicativos e esconde o dock original do GNOME'));
        aparencia.add(this._switch(settings, 'mostrar-icone-painel', 'Ícone no painel superior', 'Menu do ATLAS na barra de cima; também dá para ocultar pelo próprio menu'));
        aparencia.add(this._switch(settings, 'previa-janelas', 'Prévia de janelas', 'Miniaturas das janelas ao parar o mouse num app aberto'));
        posicao.add(this._switch(settings, 'reservar-espaco', 'Reservar espaço', 'Janelas maximizadas terminam acima da doca (não vale com auto-ocultar)'));
        posicao.add(this._switch(settings, 'auto-ocultar', 'Auto-ocultar', 'Esconde a doca e mostra ao encostar na borda da tela'));
        posicao.add(this._combo(settings, 'monitores', 'Telas', this._opcoesTelas()));

        window.add(this._paginaAmbientes(settings, window));
        window.add(this._paginaWidgets(settings));

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

    // ----- Ambientes -----

    _paginaAmbientes(settings, window) {
        const page = new Adw.PreferencesPage({title: 'Ambientes', icon_name: 'view-grid-symbolic'});

        const atalhos = new Adw.PreferencesGroup({
            title: 'Troca de ambiente',
            description: 'Formato do atalho: &lt;Super&gt;&lt;Alt&gt;Right',
        });
        page.add(atalhos);
        atalhos.add(this._switch(settings, 'mostrar-seletor', 'Seletor na doca', 'Círculo colorido com a inicial do ambiente'));
        atalhos.add(this._switch(settings, 'janelas-seguem', 'Janelas seguem o ambiente', 'Ao trocar, minimiza as janelas dos apps de outros ambientes e as traz de volta ao retornar. Apps que não estão em nenhum ambiente não são mexidos'));
        atalhos.add(this._switch(settings, 'troca-roda', 'Roda do mouse', 'Troca de ambiente ao rolar sobre a doca'));
        atalhos.add(this._switch(settings, 'roda-inverter', 'Inverter a roda', 'Troca a direção ao rolar'));
        atalhos.add(this._switch(settings, 'atalhos-ativos', 'Atalhos de teclado', 'Liga ou desliga os dois atalhos abaixo'));
        atalhos.add(this._switch(settings, 'atalho-numero-ativo', 'Ctrl+Alt+1 a 9', 'Vai direto ao ambiente da posição N da lista'));
        atalhos.add(this._atalho(settings, 'atalho-proximo', 'Atalho: próximo ambiente'));
        atalhos.add(this._atalho(settings, 'atalho-anterior', 'Atalho: ambiente anterior'));

        const grupo = new Adw.PreferencesGroup({
            title: 'Ambientes',
            description: 'Cada ambiente é um conjunto de apps com uma cor. Sem ambientes, a doca usa os favoritos do GNOME.',
        });
        page.add(grupo);

        const ler = () => {
            try {
                const v = JSON.parse(settings.get_string('ambientes'));
                return Array.isArray(v) ? v : [];
            } catch (_e) {
                return [];
            }
        };
        let interno = false; // evita redesenhar a lista (e perder o foco do campo) por causa das próprias gravações
        const salvar = lista => {
            interno = true;
            settings.set_string('ambientes', JSON.stringify(lista));
            interno = false;
        };
        const hex = c => '#' + [c.red, c.green, c.blue].map(v => Math.round(v * 255).toString(16).padStart(2, '0')).join('');
        const alterar = (id, fn) => {
            const lista = ler();
            const amb = lista.find(a => a.id === id);
            if (amb) {
                fn(amb, lista);
                salvar(lista);
            }
        };

        let linhas = [];
        let aberto = null;
        let abertoCol = null;
        let render = () => {};

        // Linhas de apps (subir, descer, remover, adicionar) de uma lista dentro de `exp`.
        // `lista` só serve para desenhar; as gravações usam `alvo(ambiente)`, que devolve o array vivo.
        const linhasApps = (exp, ambId, lista, alvo, colId = null) => {
            lista.forEach((id, i) => {
                const info = Gio.DesktopAppInfo.new(id);
                const row = new Adw.ActionRow({title: info?.get_name() ?? id, use_markup: false, subtitle: info ? '' : 'não encontrado'});
                if (info?.get_icon())
                    row.add_prefix(new Gtk.Image({gicon: info.get_icon(), pixel_size: 32}));
                const botao = (icone, dica, fn, ativo = true) => {
                    const b = new Gtk.Button({icon_name: icone, tooltip_text: dica, valign: Gtk.Align.CENTER, css_classes: ['flat'], sensitive: ativo});
                    b.connect('clicked', () => { aberto = ambId; abertoCol = colId; fn(); render(); });
                    row.add_suffix(b);
                };
                const mover = d => alterar(ambId, a => {
                    const arr = alvo(a);
                    const [x] = arr.splice(i, 1);
                    arr.splice(i + d, 0, x);
                });
                botao('go-up-symbolic', 'Subir', () => mover(-1), i > 0);
                botao('go-down-symbolic', 'Descer', () => mover(1), i < lista.length - 1);
                botao('user-trash-symbolic', 'Remover', () => alterar(ambId, a => alvo(a).splice(i, 1)));
                exp.add_row(row);
            });
            const add = new Adw.ActionRow({title: 'Adicionar aplicativo', activatable: true});
            add.add_prefix(new Gtk.Image({icon_name: 'list-add-symbolic'}));
            add.connect('activated', () => this._escolherApp(window, id => {
                aberto = ambId;
                abertoCol = colId;
                alterar(ambId, a => { const arr = alvo(a); if (!arr.includes(id)) arr.push(id); });
                render();
            }));
            exp.add_row(add);
        };

        render = () => {
            for (const r of linhas)
                grupo.remove(r);
            linhas = [];
            const lista = ler();

            for (const amb of lista) {
                const exp = new Adw.ExpanderRow({
                    title: amb.nome,
                    use_markup: false,
                    subtitle: `${amb.apps.length} apps`,
                    expanded: amb.id === aberto,
                });
                const cor = new Gtk.ColorDialogButton({dialog: new Gtk.ColorDialog(), valign: Gtk.Align.CENTER});
                const rgba = new Gdk.RGBA();
                rgba.parse(amb.cor || '#E8A93A');
                cor.rgba = rgba;
                cor.connect('notify::rgba', () => alterar(amb.id, a => { a.cor = hex(cor.rgba); }));
                exp.add_prefix(cor);

                const nome = new Adw.EntryRow({title: 'Nome', text: amb.nome});
                nome.connect('changed', () => {
                    alterar(amb.id, a => { a.nome = nome.text; });
                    exp.title = nome.text;
                });
                exp.add_row(nome);

                const tema = new Adw.ComboRow({
                    title: 'Tema deste ambiente',
                    model: Gtk.StringList.new(['Padrão (o da aba Geral)', ...TEMAS.map(t => t[1])]),
                });
                tema.selected = Math.max(0, TEMAS.findIndex(t => t[0] === amb.tema) + 1);
                tema.connect('notify::selected', () => alterar(amb.id, a => {
                    a.tema = tema.selected > 0 ? TEMAS[tema.selected - 1][0] : '';
                }));
                exp.add_row(tema);

                const dnd = new Adw.SwitchRow({
                    title: 'Entra com Não perturbe',
                    subtitle: 'Ao ligar o Não perturbe do GNOME, o ATLAS muda para este ambiente e volta ao anterior ao desligar. Só um ambiente por vez',
                    active: !!amb.naoperturbe,
                });
                dnd.connect('notify::active', () => {
                    alterar(amb.id, (a, lista) => {
                        for (const outro of lista)
                            delete outro.naoperturbe;
                        if (dnd.active)
                            a.naoperturbe = true;
                    });
                    aberto = amb.id;
                    GLib.idle_add(GLib.PRIORITY_DEFAULT, () => {
                        render();
                        return GLib.SOURCE_REMOVE;
                    });
                });
                exp.add_row(dnd);

                linhasApps(exp, amb.id, amb.apps, a => a.apps);

                const colecoes = new Adw.ExpanderRow({
                    title: 'Coleções',
                    subtitle: 'Um ícone na doca que guarda um grupo de apps',
                    expanded: amb.id === aberto && abertoCol !== null,
                });
                for (const col of amb.colecoes ?? []) {
                    const alvo = a => a.colecoes.find(c => c.id === col.id);
                    const linhaCol = new Adw.ExpanderRow({title: col.nome, subtitle: `${col.apps.length} apps`, expanded: col.id === abertoCol});
                    const nomeCol = new Adw.EntryRow({title: 'Nome', text: col.nome});
                    nomeCol.connect('changed', () => {
                        alterar(amb.id, a => { alvo(a).nome = nomeCol.text; });
                        linhaCol.title = nomeCol.text;
                    });
                    linhaCol.add_row(nomeCol);
                    linhasApps(linhaCol, amb.id, col.apps, a => alvo(a).apps, col.id);
                    const apagarCol = new Adw.ActionRow({title: 'Excluir coleção'});
                    const bCol = new Gtk.Button({label: 'Excluir', valign: Gtk.Align.CENTER, css_classes: ['destructive-action']});
                    bCol.connect('clicked', () => {
                        aberto = amb.id;
                        alterar(amb.id, a => { a.colecoes = a.colecoes.filter(c => c.id !== col.id); });
                        abertoCol = null;
                        render();
                    });
                    apagarCol.add_suffix(bCol);
                    linhaCol.add_row(apagarCol);
                    colecoes.add_row(linhaCol);
                }
                const novaCol = new Adw.ActionRow({title: 'Nova coleção', activatable: true});
                novaCol.add_prefix(new Gtk.Image({icon_name: 'list-add-symbolic'}));
                novaCol.connect('activated', () => {
                    const id = `c${Date.now()}`;
                    aberto = amb.id;
                    abertoCol = id;
                    alterar(amb.id, a => {
                        a.colecoes = a.colecoes ?? [];
                        a.colecoes.push({id, nome: `Coleção ${a.colecoes.length + 1}`, apps: []});
                    });
                    render();
                });
                colecoes.add_row(novaCol);
                exp.add_row(colecoes);

                const apagar = new Adw.ActionRow({title: 'Excluir ambiente'});
                const bApagar = new Gtk.Button({label: 'Excluir', valign: Gtk.Align.CENTER, css_classes: ['destructive-action']});
                bApagar.connect('clicked', () => {
                    const nova = ler().filter(a => a.id !== amb.id);
                    salvar(nova);
                    if (settings.get_string('ambiente-atual') === amb.id)
                        settings.set_string('ambiente-atual', nova[0]?.id ?? '');
                    aberto = null;
                    render();
                });
                apagar.add_suffix(bApagar);
                exp.add_row(apagar);

                grupo.add(exp);
                linhas.push(exp);
            }

            const novo = new Adw.ActionRow({title: 'Novo ambiente', activatable: true});
            novo.add_prefix(new Gtk.Image({icon_name: 'list-add-symbolic'}));
            novo.connect('activated', () => {
                const nova = ler();
                const amb = {id: `a${Date.now()}`, nome: `Ambiente ${nova.length + 1}`, cor: '#E8A93A', apps: []};
                nova.push(amb);
                salvar(nova);
                if (nova.length === 1)
                    settings.set_string('ambiente-atual', amb.id);
                aberto = amb.id;
                render();
            });
            grupo.add(novo);
            linhas.push(novo);

            if (!lista.length) {
                const seed = new Adw.ActionRow({
                    title: 'Começar com meus favoritos atuais',
                    subtitle: 'Cria um ambiente com os apps fixados hoje no GNOME',
                    activatable: true,
                });
                seed.add_prefix(new Gtk.Image({icon_name: 'starred-symbolic'}));
                seed.connect('activated', () => {
                    const favs = new Gio.Settings({schema_id: 'org.gnome.shell'}).get_strv('favorite-apps');
                    const amb = {id: `a${Date.now()}`, nome: 'Principal', cor: '#E8A93A', apps: favs};
                    salvar([amb]);
                    settings.set_string('ambiente-atual', amb.id);
                    aberto = amb.id;
                    render();
                });
                grupo.add(seed);
                linhas.push(seed);
            }
        };
        render();
        settings.connect('changed::ambientes', () => {
            // mudanças vindas de fora (ex.: fixar app pelo menu da doca): redesenha a lista
            if (!interno)
                render();
        });
        return page;
    }

    // ----- Widgets -----

    // Um grupo por ambiente, com um interruptor para cada widget. Fica numa aba própria
    // porque os widgets são o que mais se liga e desliga.
    _paginaWidgets(settings) {
        const page = new Adw.PreferencesPage({title: 'Widgets', icon_name: 'view-pin-symbolic'});

        const geral = new Adw.PreferencesGroup({
            title: 'Opções gerais',
            description: 'Valem para todos os ambientes.',
        });
        page.add(geral);
        geral.add(this._spin(settings, 'pomodoro-foco', 'Pomodoro: foco', 'Minutos de foco', 1, 180, 1, 0));
        geral.add(this._spin(settings, 'pomodoro-pausa', 'Pomodoro: pausa curta', 'Minutos', 1, 60, 1, 0));
        geral.add(this._spin(settings, 'pomodoro-pausa-longa', 'Pomodoro: pausa longa', 'Minutos, a cada 4 focos', 1, 120, 1, 0));
        geral.add(this._spin(settings, 'timer-minutos', 'Timer: duração', 'Minutos', 1, 600, 1, 0));
        geral.add(this._combo(settings, 'widgets-posicao', 'Posição na doca', [
            ['depois', 'Depois dos apps (no fim)'],
            ['antes', 'Antes dos apps (logo após o seletor)'],
        ]));
        geral.add(this._texto(settings, 'contagem-nome', 'Contagem regressiva: nome', v => v.length <= 40));
        geral.add(this._texto(settings, 'contagem-data', 'Contagem regressiva: data (AAAA-MM-DD)',
            v => v === '' || diasAte({ano: 2000, mes: 1, dia: 1}, v) !== null));
        geral.add(this._texto(settings, 'nota-texto', 'Nota', v => v.length <= 200));
        geral.add(this._switch(settings, 'relogio-24h', 'Relógio em 24 horas', 'Desligado mostra 12 horas'));

        const ler = () => {
            try {
                const v = JSON.parse(settings.get_string('ambientes'));
                return Array.isArray(v) ? v : [];
            } catch (_e) {
                return [];
            }
        };
        let interno = false; // as próprias gravações não redesenham a lista
        const alterar = (id, fn) => {
            const lista = ler();
            const amb = lista.find(a => a.id === id);
            if (!amb)
                return;
            fn(amb);
            interno = true;
            settings.set_string('ambientes', JSON.stringify(lista));
            interno = false;
        };

        let grupos = [];
        const render = () => {
            for (const g of grupos)
                page.remove(g);
            grupos = [];
            const lista = ler();

            if (!lista.length) {
                const vazio = new Adw.PreferencesGroup({
                    title: 'Widgets',
                    description: 'Widgets ficam dentro de um ambiente. Crie um na aba Ambientes para ligá-los.',
                });
                page.add(vazio);
                grupos.push(vazio);
                return;
            }

            for (const amb of lista) {
                const grupo = new Adw.PreferencesGroup({
                    title: amb.nome,
                    description: grupos.length ? '' : 'Tiles vivos na doca; o clique abre um painel. Cada ambiente tem os seus, na ordem desta lista.',
                });
                // ligados primeiro, na ordem da doca; depois os desligados
                const ativos = (amb.widgets ?? []).filter(id => WIDGETS.some(w => w[0] === id));
                const ordem = [...ativos, ...WIDGETS.map(w => w[0]).filter(id => !ativos.includes(id))];
                for (const wid of ordem) {
                    const [, nome, desc] = WIDGETS.find(w => w[0] === wid);
                    const idx = ativos.indexOf(wid);
                    const sw = new Adw.SwitchRow({title: nome, subtitle: desc, active: idx >= 0});
                    const mover = d => {
                        alterar(amb.id, a => {
                            const arr = a.widgets;
                            const [x] = arr.splice(idx, 1);
                            arr.splice(idx + d, 0, x);
                        });
                        render();
                    };
                    for (const [icone, dica, d, ok] of [
                        ['go-up-symbolic', 'Subir', -1, idx > 0],
                        ['go-down-symbolic', 'Descer', 1, idx >= 0 && idx < ativos.length - 1],
                    ]) {
                        const b = new Gtk.Button({icon_name: icone, tooltip_text: dica, valign: Gtk.Align.CENTER, css_classes: ['flat'], sensitive: ok});
                        b.connect('clicked', () => mover(d));
                        sw.add_prefix(b);
                    }
                    sw.connect('notify::active', () => {
                        alterar(amb.id, a => {
                            a.widgets = (a.widgets ?? []).filter(x => x !== wid);
                            if (sw.active)
                                a.widgets.push(wid);
                        });
                        // redesenha depois do sinal, para a linha subir/descer na lista
                        GLib.idle_add(GLib.PRIORITY_DEFAULT, () => {
                            render();
                            return GLib.SOURCE_REMOVE;
                        });
                    });
                    grupo.add(sw);
                }
                page.add(grupo);
                grupos.push(grupo);
            }
        };
        render();
        settings.connect('changed::ambientes', () => {
            if (!interno)
                render();
        });
        return page;
    }

    // Campo de texto ligado a uma chave string; só grava se `valido(texto)`, senão marca erro.
    _texto(settings, key, title, valido) {
        const row = new Adw.EntryRow({title, text: settings.get_string(key), show_apply_button: true});
        row.connect('apply', () => {
            const texto = row.text.trim();
            if (!valido(texto)) {
                row.add_css_class('error');
                return;
            }
            row.remove_css_class('error');
            settings.set_string(key, texto);
        });
        return row;
    }

    // Campo de atalho de teclado; só grava se o texto for um atalho válido.
    _atalho(settings, key, title) {
        const row = new Adw.EntryRow({title, text: settings.get_strv(key)[0] ?? '', show_apply_button: true});
        row.connect('apply', () => {
            const texto = row.text.trim();
            const [ok] = Gtk.accelerator_parse(texto);
            if (texto && !ok) {
                row.add_css_class('error');
                return;
            }
            row.remove_css_class('error');
            settings.set_strv(key, texto ? [texto] : []);
        });
        return row;
    }

    // Janela com busca para escolher um aplicativo instalado.
    _escolherApp(pai, aoEscolher) {
        const win = new Gtk.Window({title: 'Escolher aplicativo', modal: true, transient_for: pai, default_width: 420, default_height: 540});
        const caixa = new Gtk.Box({orientation: Gtk.Orientation.VERTICAL, spacing: 8, margin_top: 12, margin_bottom: 12, margin_start: 12, margin_end: 12});
        const busca = new Gtk.SearchEntry({placeholder_text: 'Buscar aplicativo'});
        const lista = new Gtk.ListBox({selection_mode: Gtk.SelectionMode.NONE, css_classes: ['boxed-list']});
        const rolagem = new Gtk.ScrolledWindow({vexpand: true, child: lista});
        caixa.append(busca);
        caixa.append(rolagem);
        win.set_child(caixa);

        const apps = Gio.AppInfo.get_all().filter(a => a.should_show() && a.get_id())
            .sort((a, b) => a.get_name().localeCompare(b.get_name()));
        for (const app of apps) {
            const row = new Adw.ActionRow({title: app.get_name(), use_markup: false, activatable: true});
            row.appId = app.get_id();
            row.nome = app.get_name().toLowerCase();
            if (app.get_icon())
                row.add_prefix(new Gtk.Image({gicon: app.get_icon(), pixel_size: 32}));
            row.connect('activated', () => {
                aoEscolher(row.appId);
                win.close();
            });
            lista.append(row);
        }
        lista.set_filter_func(row => row.nome.includes(busca.text.toLowerCase()));
        busca.connect('search-changed', () => lista.invalidate_filter());
        win.present();
        busca.grab_focus();
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
