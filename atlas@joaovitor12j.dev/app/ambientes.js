// Aba Ambientes: lista com pastilha, apps e "Editar" (diálogo), formas de trocar e atalhos com teclas desenhadas.
import Adw from 'gi://Adw';
import Gdk from 'gi://Gdk';
import Gio from 'gi://Gio';
import Gtk from 'gi://Gtk';
import {TEMAS} from '../catalogo.js';
import {cartao} from './aparencia.js';

const COR_PADRAO = '#E8A93A';

function lerLista(settings) {
    try {
        const v = JSON.parse(settings.get_string('ambientes'));
        return Array.isArray(v) ? v : [];
    } catch (_e) {
        return [];
    }
}

// Círculo colorido com a inicial do ambiente.
function pastilha(cor, nome, d = 38) {
    const a = new Gtk.DrawingArea({content_width: d, content_height: d, valign: Gtk.Align.CENTER});
    a.set_draw_func((_a, cr, w, h) => {
        const c = new Gdk.RGBA();
        c.parse(cor || COR_PADRAO);
        cr.setSourceRGBA(c.red, c.green, c.blue, 1);
        cr.arc(w / 2, h / 2, Math.min(w, h) / 2, 0, 2 * Math.PI);
        cr.fill();
        cr.setSourceRGBA(0.1, 0.05, 0.03, 1);
        cr.selectFontFace('Sora', 0, 1);
        cr.setFontSize(d * 0.4);
        const t = (nome || '?').trim().charAt(0).toUpperCase();
        const e = cr.textExtents(t);
        cr.moveTo(w / 2 - e.width / 2 - e.xBearing, h / 2 - e.height / 2 - e.yBearing);
        cr.showText(t);
    });
    return a;
}

const NOMES_TECLA = {Right: '→', Left: '←', Up: '↑', Down: '↓', space: 'Espaço', Return: 'Enter', Escape: 'Esc'};

// "<Super><Alt>Right" -> ['Super', 'Alt', '→']
function teclas(accel) {
    const [ok, key, mods] = Gtk.accelerator_parse(accel ?? '');
    if (!ok || !key)
        return [];
    const t = [];
    if (mods & Gdk.ModifierType.CONTROL_MASK)
        t.push('Ctrl');
    if (mods & Gdk.ModifierType.SUPER_MASK)
        t.push('Super');
    if (mods & Gdk.ModifierType.ALT_MASK)
        t.push('Alt');
    if (mods & Gdk.ModifierType.SHIFT_MASK)
        t.push('Shift');
    const nome = Gdk.keyval_name(key) ?? '?';
    t.push(NOMES_TECLA[nome] ?? (nome.length === 1 ? nome.toUpperCase() : nome));
    return t;
}

export function criarAmbientes(settings, p, win) {
    const cartoes = [];
    let interno = false; // as próprias gravações não reconstroem a lista por cima do campo que você digita
    let dialogo = null;
    let redesenharEdicao = () => {};

    const salvar = lista => {
        interno = true;
        settings.set_string('ambientes', JSON.stringify(lista));
        interno = false;
        listar();
    };
    const alterar = (id, fn) => {
        const lista = lerLista(settings);
        const amb = lista.find(a => a.id === id);
        if (amb) {
            fn(amb, lista);
            salvar(lista);
        }
    };

    // ----- Cartão "Seus ambientes" -----
    const novo = new Gtk.Button({label: '+ Novo ambiente', css_classes: ['atlas-primario'], valign: Gtk.Align.START});
    const cabeca = new Gtk.Box({spacing: 12});
    const titulos = new Gtk.Box({orientation: Gtk.Orientation.VERTICAL, hexpand: true});
    titulos.append(new Gtk.Label({label: 'Seus ambientes', xalign: 0, css_classes: ['atlas-cartao-titulo']}));
    titulos.append(new Gtk.Label({label: 'Conjuntos de apps com nome e cor. Troque pelo seletor da doca, pela roda do mouse ou por atalho.', xalign: 0, wrap: true, css_classes: ['atlas-cartao-sub']}));
    cabeca.append(titulos);
    cabeca.append(novo);
    const corpoLista = new Gtk.Box({orientation: Gtk.Orientation.VERTICAL});
    const principal = new Gtk.Box({orientation: Gtk.Orientation.VERTICAL, css_classes: ['atlas-cartao']});
    principal.append(cabeca);
    principal.append(corpoLista);
    principal._texto = 'seus ambientes conjuntos de apps nome cor novo ambiente editar não perturbe';
    cartoes.push(principal);

    const criarAmbiente = apps => {
        const lista = lerLista(settings);
        const amb = {id: `a${Date.now()}`, nome: apps ? 'Principal' : `Ambiente ${lista.length + 1}`, cor: COR_PADRAO, apps: apps ?? []};
        lista.push(amb);
        salvar(lista);
        if (lista.length === 1)
            settings.set_string('ambiente-atual', amb.id);
        editar(amb.id);
    };
    novo.connect('clicked', () => criarAmbiente());

    const listar = () => {
        for (let f = corpoLista.get_first_child(); f; f = corpoLista.get_first_child())
            corpoLista.remove(f);
        const lista = lerLista(settings);
        if (!lista.length) {
            corpoLista.append(new Gtk.Label({label: 'Nenhum ambiente ainda.', xalign: 0, css_classes: ['atlas-rotulo'], margin_top: 12}));
            corpoLista.append(new Gtk.Label({label: 'Sem ambientes, a doca usa os favoritos do GNOME.', xalign: 0, css_classes: ['atlas-cartao-sub']}));
            const botoes = new Gtk.Box({spacing: 8, margin_top: 4});
            const fav = new Gtk.Button({label: 'Começar com meus favoritos', css_classes: ['atlas-primario']});
            fav.connect('clicked', () => criarAmbiente(new Gio.Settings({schema_id: 'org.gnome.shell'}).get_strv('favorite-apps')));
            const zero = new Gtk.Button({label: 'Criar do zero', css_classes: ['atlas-secundario']});
            zero.connect('clicked', () => criarAmbiente());
            botoes.append(fav);
            botoes.append(zero);
            corpoLista.append(botoes);
            return;
        }
        for (const amb of lista) {
            const linha = new Gtk.Box({spacing: 14, css_classes: ['atlas-amb']});
            linha.append(pastilha(amb.cor, amb.nome));
            const nomes = new Gtk.Box({orientation: Gtk.Orientation.VERTICAL, valign: Gtk.Align.CENTER, width_request: 150});
            nomes.append(new Gtk.Label({label: amb.nome, xalign: 0, css_classes: ['atlas-rotulo'], ellipsize: 3}));
            const tema = TEMAS.find(t => t[0] === amb.tema)?.[1];
            nomes.append(new Gtk.Label({label: `${amb.apps.length} ${amb.apps.length === 1 ? 'app' : 'apps'}${tema ? ` · tema ${tema}` : ''}`, xalign: 0, css_classes: ['atlas-cartao-sub']}));
            linha.append(nomes);

            const apps = new Gtk.Box({spacing: 6, hexpand: true, valign: Gtk.Align.CENTER});
            for (const id of amb.apps.slice(0, 8)) {
                const info = Gio.DesktopAppInfo.new(id);
                apps.append(new Gtk.Image({gicon: info?.get_icon() ?? Gio.ThemedIcon.new('application-x-executable'), pixel_size: 28, tooltip_text: info?.get_name() ?? id}));
            }
            if (amb.apps.length > 8)
                apps.append(new Gtk.Label({label: `+${amb.apps.length - 8}`, css_classes: ['atlas-cartao-sub']}));
            const add = new Gtk.Button({label: '+', css_classes: ['atlas-add-app'], tooltip_text: 'Adicionar aplicativo', valign: Gtk.Align.CENTER});
            add.connect('clicked', () => p._escolherApp(win, id => alterar(amb.id, a => {
                if (!a.apps.includes(id))
                    a.apps.push(id);
            })));
            apps.append(add);
            linha.append(apps);

            if (amb.naoperturbe)
                linha.append(new Gtk.Label({label: 'Entra com Não perturbe', css_classes: ['atlas-selo'], valign: Gtk.Align.CENTER}));
            const ed = new Gtk.Button({label: 'Editar', css_classes: ['atlas-secundario'], valign: Gtk.Align.CENTER});
            ed.connect('clicked', () => editar(amb.id));
            linha.append(ed);
            corpoLista.append(linha);
        }
    };

    // ----- Diálogo de edição -----
    const hex = c => '#' + [c.red, c.green, c.blue].map(v => Math.round(v * 255).toString(16).padStart(2, '0')).join('');

    // Linhas de apps (subir, descer, remover, adicionar) para `grupo`; `alvo(ambiente)` devolve o array vivo.
    const linhasApps = (grupo, ambId, lista, alvo, colId = null) => {
        lista.forEach((id, i) => {
            const info = Gio.DesktopAppInfo.new(id);
            const row = new Adw.ActionRow({title: info?.get_name() ?? id, use_markup: false, subtitle: info ? '' : 'não encontrado'});
            if (info?.get_icon())
                row.add_prefix(new Gtk.Image({gicon: info.get_icon(), pixel_size: 32}));
            const botao = (icone, dica, fn, ativo = true) => {
                const b = new Gtk.Button({icon_name: icone, tooltip_text: dica, valign: Gtk.Align.CENTER, css_classes: ['flat'], sensitive: ativo});
                b.connect('clicked', () => {
                    fn();
                    redesenharEdicao(colId);
                });
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
            grupo.add(row);
        });
        const add = new Adw.ActionRow({title: 'Adicionar aplicativo', activatable: true});
        add.add_prefix(new Gtk.Image({icon_name: 'list-add-symbolic'}));
        add.connect('activated', () => p._escolherApp(dialogo ?? win, id => {
            alterar(ambId, a => {
                const arr = alvo(a);
                if (!arr.includes(id))
                    arr.push(id);
            });
            redesenharEdicao(colId);
        }));
        grupo.add(add);
    };

    const editar = ambId => {
        const dlg = new Adw.Dialog({title: 'Editar ambiente', content_width: 560, content_height: 680});
        dialogo = dlg;
        const pagina = new Adw.PreferencesPage();
        const vista = new Adw.ToolbarView({content: pagina});
        vista.add_top_bar(new Adw.HeaderBar());
        dlg.child = vista;
        dlg.connect('closed', () => {
            dialogo = null;
            redesenharEdicao = () => {};
        });

        let grupos = [];
        const montar = colAberta => {
            for (const g of grupos)
                pagina.remove(g);
            grupos = [];
            const amb = lerLista(settings).find(a => a.id === ambId);
            if (!amb) {
                dlg.close();
                return;
            }
            const g = new Adw.PreferencesGroup();
            pagina.add(g);
            grupos.push(g);

            const nome = new Adw.EntryRow({title: 'Nome', text: amb.nome});
            nome.connect('changed', () => alterar(amb.id, a => { a.nome = nome.text; }));
            const cor = new Gtk.ColorDialogButton({dialog: new Gtk.ColorDialog(), valign: Gtk.Align.CENTER});
            const rgba = new Gdk.RGBA();
            rgba.parse(amb.cor || COR_PADRAO);
            cor.rgba = rgba;
            cor.connect('notify::rgba', () => alterar(amb.id, a => { a.cor = hex(cor.rgba); }));
            nome.add_suffix(cor);
            g.add(nome);

            const tema = new Adw.ComboRow({
                title: 'Tema deste ambiente',
                model: Gtk.StringList.new(['Padrão (o da aba Aparência)', ...TEMAS.map(t => t[1])]),
            });
            tema.selected = Math.max(0, TEMAS.findIndex(t => t[0] === amb.tema) + 1);
            tema.connect('notify::selected', () => alterar(amb.id, a => {
                a.tema = tema.selected > 0 ? TEMAS[tema.selected - 1][0] : '';
            }));
            g.add(tema);

            const dnd = new Adw.SwitchRow({
                title: 'Entra com Não perturbe',
                subtitle: 'Ao ligar o Não perturbe do GNOME, o ATLAS muda para este ambiente e volta ao anterior ao desligar. Só um ambiente por vez',
                active: !!amb.naoperturbe,
            });
            dnd.connect('notify::active', () => alterar(amb.id, (a, lista) => {
                for (const outro of lista)
                    delete outro.naoperturbe;
                if (dnd.active)
                    a.naoperturbe = true;
            }));
            g.add(dnd);

            const gApps = new Adw.PreferencesGroup({title: 'Aplicativos', description: 'A ordem aqui é a ordem na doca.'});
            pagina.add(gApps);
            grupos.push(gApps);
            linhasApps(gApps, amb.id, amb.apps, a => a.apps);

            const gCol = new Adw.PreferencesGroup({title: 'Coleções', description: 'Um ícone na doca que guarda um grupo de apps.'});
            pagina.add(gCol);
            grupos.push(gCol);
            for (const col of amb.colecoes ?? []) {
                const alvo = a => a.colecoes.find(c => c.id === col.id);
                const linhaCol = new Adw.ExpanderRow({title: col.nome, subtitle: `${col.apps.length} apps`, expanded: col.id === colAberta});
                const nomeCol = new Adw.EntryRow({title: 'Nome', text: col.nome});
                nomeCol.connect('changed', () => {
                    alterar(amb.id, a => { alvo(a).nome = nomeCol.text; });
                    linhaCol.title = nomeCol.text;
                });
                linhaCol.add_row(nomeCol);
                const interna = {add: r => linhaCol.add_row(r)};
                linhasApps(interna, amb.id, col.apps, a => alvo(a).apps, col.id);
                const apagarCol = new Adw.ActionRow({title: 'Excluir coleção'});
                const bCol = new Gtk.Button({label: 'Excluir', valign: Gtk.Align.CENTER, css_classes: ['destructive-action']});
                bCol.connect('clicked', () => {
                    alterar(amb.id, a => { a.colecoes = a.colecoes.filter(c => c.id !== col.id); });
                    montar(null);
                });
                apagarCol.add_suffix(bCol);
                linhaCol.add_row(apagarCol);
                gCol.add(linhaCol);
            }
            const novaCol = new Adw.ActionRow({title: 'Nova coleção', activatable: true});
            novaCol.add_prefix(new Gtk.Image({icon_name: 'list-add-symbolic'}));
            novaCol.connect('activated', () => {
                const id = `c${Date.now()}`;
                alterar(amb.id, a => {
                    a.colecoes = a.colecoes ?? [];
                    a.colecoes.push({id, nome: `Coleção ${a.colecoes.length + 1}`, apps: []});
                });
                montar(id);
            });
            gCol.add(novaCol);

            const gExcluir = new Adw.PreferencesGroup();
            pagina.add(gExcluir);
            grupos.push(gExcluir);
            const apagar = new Gtk.Button({label: 'Excluir ambiente', css_classes: ['destructive-action'], halign: Gtk.Align.START});
            apagar.connect('clicked', () => {
                const nova = lerLista(settings).filter(a => a.id !== amb.id);
                salvar(nova);
                if (settings.get_string('ambiente-atual') === amb.id)
                    settings.set_string('ambiente-atual', nova[0]?.id ?? '');
                dlg.close();
            });
            gExcluir.add(apagar);
        };
        redesenharEdicao = montar;
        montar(null);
        dlg.present(win);
    };

    // ----- Como trocar e Atalhos -----
    const comoTrocar = new Gtk.ListBox({selection_mode: Gtk.SelectionMode.NONE, css_classes: ['boxed-list']});
    const linhasTroca = [
        p._switch(settings, 'mostrar-seletor', 'Seletor na doca', 'Círculo colorido com a inicial do ambiente.'),
        p._switch(settings, 'troca-roda', 'Roda do mouse', 'Troca de ambiente ao rolar sobre a doca.'),
        p._switch(settings, 'roda-inverter', 'Inverter a roda', 'Troca a direção ao rolar.'),
        p._switch(settings, 'janelas-seguem', 'Janelas seguem o ambiente', 'Ao trocar, minimiza as janelas dos apps de outros ambientes e as traz de volta ao retornar.'),
    ];
    for (const l of linhasTroca)
        comoTrocar.append(l);
    const cTroca = cartao('Como trocar', null, comoTrocar);
    cTroca._texto += ` ${linhasTroca.map(l => `${l.title} ${l.subtitle ?? ''}`).join(' ').toLowerCase()}`;
    cartoes.push(cTroca);

    const capturar = (key, titulo, aoMudar) => {
        const d = new Adw.AlertDialog({heading: titulo, body: 'Pressione a nova combinação. Esc cancela.'});
        d.add_response('cancelar', 'Cancelar');
        d.add_response('limpar', 'Desligar atalho');
        const ctl = new Gtk.EventControllerKey();
        ctl.connect('key-pressed', (_c, keyval, _code, estado) => {
            if (keyval === Gdk.KEY_Escape) {
                d.close();
                return true;
            }
            const mods = estado & Gtk.accelerator_get_default_mod_mask();
            if (!mods || [Gdk.KEY_Control_L, Gdk.KEY_Control_R, Gdk.KEY_Alt_L, Gdk.KEY_Alt_R, Gdk.KEY_Super_L, Gdk.KEY_Super_R, Gdk.KEY_Shift_L, Gdk.KEY_Shift_R].includes(keyval))
                return true; // espera uma tecla de verdade junto de um modificador
            settings.set_strv(key, [Gtk.accelerator_name(keyval, mods)]);
            aoMudar();
            d.close();
            return true;
        });
        d.add_controller(ctl);
        d.connect('response', (_d, r) => {
            if (r === 'limpar') {
                settings.set_strv(key, []);
                aoMudar();
            }
        });
        d.present(win);
    };

    const listaAtalhos = new Gtk.Box({orientation: Gtk.Orientation.VERTICAL});
    const montarAtalhos = () => {
        for (let f = listaAtalhos.get_first_child(); f; f = listaAtalhos.get_first_child())
            listaAtalhos.remove(f);
        for (const [key, nome] of [['atalho-proximo', 'Próximo'], ['atalho-anterior', 'Anterior']]) {
            const l = new Gtk.Box({spacing: 8, css_classes: ['atlas-atalho']});
            l.append(new Gtk.Label({label: nome, xalign: 0, hexpand: true, css_classes: ['atlas-rotulo']}));
            const teclasBox = new Gtk.Button({css_classes: ['atlas-teclas'], tooltip_text: 'Clique para mudar o atalho', valign: Gtk.Align.CENTER});
            const caixa = new Gtk.Box({spacing: 6});
            const ts = teclas(settings.get_strv(key)[0]);
            for (const t of ts.length ? ts : ['desligado'])
                caixa.append(new Gtk.Label({label: t, css_classes: ['atlas-kbd']}));
            teclasBox.child = caixa;
            teclasBox.connect('clicked', () => capturar(key, `Atalho: ${nome.toLowerCase()} ambiente`, montarAtalhos));
            l.append(teclasBox);
            listaAtalhos.append(l);
        }
    };
    montarAtalhos();
    const lista2 = new Gtk.ListBox({selection_mode: Gtk.SelectionMode.NONE, css_classes: ['boxed-list']});
    const linhasAt = [
        p._switch(settings, 'atalhos-ativos', 'Atalhos de teclado', 'Liga ou desliga os atalhos de próximo e anterior.'),
        p._switch(settings, 'atalho-numero-ativo', 'Ctrl+Alt+1 a 9', 'Vai direto ao ambiente da posição N da lista.'),
    ];
    for (const l of linhasAt)
        lista2.append(l);
    const cAtalhos = cartao('Atalhos', null, listaAtalhos, lista2);
    cAtalhos._texto += ` ${linhasAt.map(l => `${l.title} ${l.subtitle ?? ''}`).join(' ').toLowerCase()} próximo anterior`;
    cartoes.push(cAtalhos);

    const corpo = new Gtk.Grid({column_spacing: 16, row_spacing: 16, column_homogeneous: true, css_classes: ['atlas-corpo']});
    corpo.attach(principal, 0, 0, 12, 1);
    corpo.attach(cTroca, 0, 1, 6, 1);
    corpo.attach(cAtalhos, 6, 1, 6, 1);

    listar();
    settings.connect('changed::ambientes', () => {
        if (!interno)
            listar();
    });

    const rolagem = new Gtk.ScrolledWindow({child: corpo, hscrollbar_policy: Gtk.PolicyType.NEVER, vexpand: true});
    rolagem._filtrar = q => {
        let n = 0;
        for (const c of cartoes) {
            c.visible = !q || c._texto.includes(q);
            n += c.visible ? 1 : 0;
        }
        return n;
    };
    return rolagem;
}
