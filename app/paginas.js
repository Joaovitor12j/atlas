// Páginas da janela de configuração do ATLAS. As mudanças valem ao vivo: o dock escuta o GSettings.
import Adw from 'gi://Adw';
import Gdk from 'gi://Gdk';
import GLib from 'gi://GLib';
import Gio from 'gi://Gio';
import Gtk from 'gi://Gtk';
import Soup from 'gi://Soup?version=3.0';
import {CATEGORIAS_MASCOTE, MASCOTES, TEMAS, WIDGETS} from '../atlas@joaovitor12j.dev/catalogo.js';
import {boneco, chama, cuco, esqueleto, fantasma, noel, pinguim, solArco} from '../atlas@joaovitor12j.dev/desenho.js';
import {diasAte, lerLocais, quadroBoneco, quadroPinguim, quadroSolArco, quadroChama, quadroCuco, quadroEsqueleto, quadroFantasma, quadroNoel, urlBuscaLocal} from '../atlas@joaovitor12j.dev/logica.js';

const POSICOES = [
    ['baixo', 'Embaixo'],
    ['esquerda', 'Esquerda'],
    ['direita', 'Direita'],
];

export class Paginas {
    // Páginas feitas com libadwaita (Ambientes, Mascotes): [{id, titulo, icone, page}]. Aparência e Widgets ficam em aparencia.js e widgets.js.
    criar(window, settings) {
        return [
            {id: 'ambientes', titulo: 'Ambientes', icone: 'view-grid-symbolic', page: this._paginaAmbientes(settings, window)},
            {id: 'mascotes', titulo: 'Mascotes', icone: 'face-smile-symbolic', page: this._paginaMascotes(settings)},
        ];
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

        const dnd = new Adw.PreferencesGroup({
            title: 'Não perturbe',
            description: 'Para um ambiente entrar sozinho quando você liga o Não perturbe do GNOME, expanda o ambiente na lista abaixo e ligue "Entra com Não perturbe". Ao desligar, o ATLAS volta ao ambiente anterior.',
        });
        page.add(dnd);

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

    // ----- Mascotes -----
    // A aba cresce com o catálogo: um grupo por categoria (só os que têm mascote) e uma linha por mascote, com a
    // miniatura, o interruptor no cabeçalho e as opções dentro da linha, que só abre quando você quer mexer.

    _paginaMascotes(settings) {
        const page = new Adw.PreferencesPage({title: 'Mascotes', icon_name: 'face-smile-symbolic'});
        const intro = new Adw.PreferencesGroup({
            description: 'Aparecem em cima da doca, fazem o que têm de fazer e somem. Todos começam desligados; ligado e parado, o custo é quase zero. Não aparecem com a doca escondida, no Overview nem com o Não perturbe ligado.',
        });
        page.add(intro);

        // miniatura de cada mascote (o desenho de verdade, num quadro parado) e as opções que ele tem
        const miniaturas = {
            cuco: (cr, w, h) => cuco(cr, w, h, quadroCuco(900, 1)),
            chama: (cr, w, h) => chama(cr, w, h, quadroChama(1200)),
            fantasma: (cr, w, h) => fantasma(cr, w, h, quadroFantasma(1500)),
            esqueleto: (cr, w, h) => esqueleto(cr, w, h, quadroEsqueleto(1000)),
            noel: (cr, w, h) => noel(cr, w, h, quadroNoel(1200)),
            boneco: (cr, w, h) => boneco(cr, w, h, quadroBoneco(1200)),
            calor: (cr, w, h) => solArco(cr, w, h, {...quadroSolArco(2600), x: 0.5}, {base: h, icone: w * 0.62}),
            frio: (cr, w, h) => pinguim(cr, w, h, {...quadroPinguim(1900), x: 0.4}, {base: h * 0.7, icone: w * 0.6}),
        };
        const opcoes = {
            cuco: linha => this._opcoesCuco(settings, linha),
            chama: linha => this._opcoesChama(settings, linha),
            fantasma: linha => this._opcoesSazonal(settings, linha, 'fantasma', 'o fantasma'),
            esqueleto: linha => this._opcoesSazonal(settings, linha, 'esqueleto', 'o esqueleto'),
            noel: linha => this._opcoesSazonal(settings, linha, 'noel', 'o Papai Noel'),
            boneco: linha => this._opcoesSazonal(settings, linha, 'boneco', 'o boneco de neve'),
            calor: linha => this._opcoesClima(settings, linha, 'calor', [
                ['picole', 'Picolé derretendo'], ['sol-arco', 'Sol atravessando'], ['sol-leque', 'Sol abanando'],
            ], 'Temperatura mínima (°C)', 'Aparece quando a temperatura chega a este valor', 10, 50),
            frio: linha => this._opcoesClima(settings, linha, 'frio', [
                ['pinguim', 'Pinguim no tobogã'], ['neve', 'Neve acumulando'], ['pendurado', 'Pendurado tremendo'],
            ], 'Temperatura máxima (°C)', 'Aparece quando a temperatura cai a este valor', -30, 35),
        };

        for (const [catId, titulo] of CATEGORIAS_MASCOTE) {
            const daCategoria = MASCOTES.filter(m => m[3] === catId);
            if (!daCategoria.length)
                continue;
            const grupo = new Adw.PreferencesGroup({title: titulo});
            page.add(grupo);
            for (const [id, nome, desc] of daCategoria) {
                const ligado = settings.get_strv('mascotes-ativos').includes(id);
                const mudar = ativo => {
                    const lista = settings.get_strv('mascotes-ativos').filter(x => x !== id);
                    if (ativo)
                        lista.push(id);
                    settings.set_strv('mascotes-ativos', lista);
                };
                let linha;
                if (opcoes[id]) {
                    linha = new Adw.ExpanderRow({title: nome, subtitle: desc, show_enable_switch: true, enable_expansion: ligado});
                    linha.connect('notify::enable-expansion', () => mudar(linha.enable_expansion));
                    opcoes[id](linha);
                } else {
                    linha = new Adw.SwitchRow({title: nome, subtitle: desc, active: ligado});
                    linha.connect('notify::active', () => mudar(linha.active));
                }
                if (miniaturas[id]) {
                    const area = new Gtk.DrawingArea({content_width: 40, content_height: 50, valign: Gtk.Align.CENTER, margin_top: 4, margin_bottom: 4});
                    area.set_draw_func((_a, cr, w, h) => miniaturas[id](cr, w, h));
                    linha.add_prefix(area);
                }
                grupo.add(linha);
            }
        }
        return page;
    }

    _opcoesCuco(settings, linha) {
        linha.add_row(this._combo(settings, 'cuco-intervalo', 'Quando canta', [
            ['hora', 'Nas horas cheias'], ['meia-hora', 'Nas horas cheias e nas meias horas'],
        ]));
        linha.add_row(this._spin(settings, 'cuco-das', 'Primeira hora do dia', 'Antes disso o cuco fica quieto', 0, 23, 1, 0));
        linha.add_row(this._spin(settings, 'cuco-ate', 'Última hora do dia', 'Depois disso o cuco fica quieto; se for menor que a primeira, a janela cruza a meia-noite', 0, 23, 1, 0));
        linha.add_row(this._spin(settings, 'cuco-max-batidas', 'Máximo de cantos', 'O cuco canta uma vez por hora do relógio, até este limite', 1, 12, 1, 0));
        const testar = new Adw.ActionRow({title: 'Testar agora', subtitle: 'Faz o cuco aparecer na hora, mesmo fora da janela de horas'});
        const botao = new Gtk.Button({label: 'Testar', valign: Gtk.Align.CENTER});
        botao.connect('clicked', () => settings.set_string('mascote-teste', `cuco:${GLib.get_monotonic_time()}`));
        testar.add_suffix(botao);
        testar.set_activatable_widget(botao);
        linha.add_row(testar);
    }

    _opcoesChama(settings, linha) {
        linha.add_row(this._spin(settings, 'chama-limiar', 'Uso de memória (%)', 'A chama aparece quando o uso chega a este valor', 50, 99, 1, 0));
        linha.add_row(this._spin(settings, 'chama-espera', 'Minutos entre aparições', 'Tempo mínimo entre duas aparições, mesmo com a memória alta', 1, 240, 1, 0));
        const testar = new Adw.ActionRow({title: 'Testar agora', subtitle: 'Faz a chama aparecer na hora, mesmo com a memória baixa'});
        const botao = new Gtk.Button({label: 'Testar', valign: Gtk.Align.CENTER});
        botao.connect('clicked', () => settings.set_string('mascote-teste', `chama:${GLib.get_monotonic_time()}`));
        testar.add_suffix(botao);
        testar.set_activatable_widget(botao);
        linha.add_row(testar);
    }

    // Opções dos mascotes sazonais (fantasma, esqueleto, Papai Noel, boneco de neve): todos têm as chaves
    // `<id>-intervalo`, `<id>-das` e `<id>-ate` e o botão de teste. `quem` é o nome com artigo ("o fantasma").
    _opcoesSazonal(settings, linha, id, quem) {
        linha.add_row(this._combo(settings, `${id}-intervalo`, 'Quando aparece', [
            ['hora', 'Nas horas cheias'], ['meia-hora', 'Nas horas cheias e nas meias horas'],
        ]));
        linha.add_row(this._spin(settings, `${id}-das`, 'Primeira hora do dia', `Antes disso ${quem} fica quieto`, 0, 23, 1, 0));
        linha.add_row(this._spin(settings, `${id}-ate`, 'Última hora do dia', `Depois disso ${quem} fica quieto; se for menor que a primeira, a janela cruza a meia-noite`, 0, 23, 1, 0));
        const testar = new Adw.ActionRow({title: 'Testar agora', subtitle: `Faz ${quem} aparecer na hora, mesmo fora da temporada e da janela de horas`});
        const botao = new Gtk.Button({label: 'Testar', valign: Gtk.Align.CENTER});
        botao.connect('clicked', () => settings.set_string('mascote-teste', `${id}:${GLib.get_monotonic_time()}`));
        testar.add_suffix(botao);
        testar.set_activatable_widget(botao);
        linha.add_row(testar);
    }

    // Opções dos mascotes do clima (frio e calor): movimento, limite de temperatura, espera e janela de horas, e um
    // botão de teste por movimento, para comparar. Dependem da cidade do widget Clima (aba Widgets).
    _opcoesClima(settings, linha, id, movimentos, tituloLimiar, subLimiar, min, max) {
        const cidade = new Adw.ActionRow({title: 'Cidade', use_markup: false});
        const mostrar = () => {
            cidade.subtitle = settings.get_string('clima-cidade') || 'Nenhuma: escolha na aba Widgets, em Clima';
        };
        const sinal = settings.connect('changed::clima-cidade', mostrar);
        cidade.connect('destroy', () => settings.disconnect(sinal));
        mostrar();
        linha.add_row(cidade);
        linha.add_row(this._combo(settings, `${id}-movimento`, 'Movimento', [['sortear', 'Sortear a cada vez'], ...movimentos]));
        linha.add_row(this._spin(settings, `${id}-limiar`, tituloLimiar, subLimiar, min, max, 1, 0));
        linha.add_row(this._spin(settings, `${id}-espera`, 'Minutos entre aparições', 'Enquanto a temperatura continuar no limite', 15, 1440, 15, 0));
        linha.add_row(this._spin(settings, `${id}-das`, 'Primeira hora do dia', 'Antes disso não aparece', 0, 23, 1, 0));
        linha.add_row(this._spin(settings, `${id}-ate`, 'Última hora do dia', 'Depois disso não aparece; se for menor que a primeira, a janela cruza a meia-noite', 0, 23, 1, 0));
        const testar = new Adw.ActionRow({title: 'Testar agora', subtitle: 'Faz o movimento aparecer na hora, com qualquer temperatura'});
        const caixa = new Gtk.Box({spacing: 6, valign: Gtk.Align.CENTER});
        for (const [mov, nome] of movimentos) {
            const b = new Gtk.Button({label: nome.split(' ')[0], tooltip_text: nome});
            b.connect('clicked', () => settings.set_string('mascote-teste', `${id}=${mov}:${GLib.get_monotonic_time()}`));
            caixa.append(b);
        }
        testar.add_suffix(caixa);
        linha.add_row(testar);
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

    // Cidade do widget Clima: a linha mostra a escolhida; "Escolher" abre a busca e "Remover" desliga a busca do tempo.
    _grupoClima(settings) {
        const grupo = new Adw.PreferencesGroup({
            title: 'Clima',
            description: 'A previsão vem do Open-Meteo, sem conta nem chave. Só as coordenadas da cidade saem da sua máquina.',
        });
        const row = new Adw.ActionRow({title: 'Cidade', use_markup: false});
        const mostrar = () => {
            row.subtitle = settings.get_string('clima-cidade') || 'Nenhuma: o widget fica sem dados';
        };
        const remover = new Gtk.Button({icon_name: 'user-trash-symbolic', tooltip_text: 'Remover', valign: Gtk.Align.CENTER, css_classes: ['flat']});
        remover.connect('clicked', () => settings.set_string('clima-cidade', ''));
        const escolher = new Gtk.Button({label: 'Escolher', valign: Gtk.Align.CENTER});
        escolher.connect('clicked', () => this._escolherCidade(row.get_root(), ({rotulo, lat, lon}) => {
            settings.set_double('clima-latitude', lat);
            settings.set_double('clima-longitude', lon);
            settings.set_string('clima-cidade', rotulo); // por último: o widget escuta esta chave
        }));
        row.add_suffix(remover);
        row.add_suffix(escolher);
        const id = settings.connect('changed::clima-cidade', mostrar);
        row.connect('destroy', () => settings.disconnect(id));
        mostrar();
        grupo.add(row);
        return grupo;
    }

    // Janela com busca de cidade (geocodificação do Open-Meteo); busca meio segundo depois de parar de digitar.
    _escolherCidade(pai, aoEscolher) {
        const win = new Gtk.Window({title: 'Escolher cidade', modal: true, transient_for: pai, default_width: 420, default_height: 460});
        const caixa = new Gtk.Box({orientation: Gtk.Orientation.VERTICAL, spacing: 8, margin_top: 12, margin_bottom: 12, margin_start: 12, margin_end: 12});
        const busca = new Gtk.SearchEntry({placeholder_text: 'Nome da cidade'});
        const aviso = new Gtk.Label({label: 'Digite ao menos 2 letras.', css_classes: ['dim-label'], xalign: 0});
        const lista = new Gtk.ListBox({selection_mode: Gtk.SelectionMode.NONE, css_classes: ['boxed-list']});
        caixa.append(busca);
        caixa.append(aviso);
        caixa.append(new Gtk.ScrolledWindow({vexpand: true, child: lista}));
        win.set_child(caixa);

        const sessao = new Soup.Session({user_agent: 'ATLAS (preferências)', timeout: 15});
        let cancelar = null;
        let esperaId = 0;
        const limpar = () => {
            for (let r = lista.get_row_at_index(0); r; r = lista.get_row_at_index(0))
                lista.remove(r);
        };
        const buscar = () => {
            esperaId = 0;
            cancelar?.cancel();
            limpar();
            const url = urlBuscaLocal(busca.text);
            if (!url) {
                aviso.label = 'Digite ao menos 2 letras.';
                return GLib.SOURCE_REMOVE;
            }
            aviso.label = 'Buscando…';
            const msg = Soup.Message.new('GET', url);
            const meu = cancelar = new Gio.Cancellable();
            sessao.send_and_read_async(msg, GLib.PRIORITY_DEFAULT, meu, (s, res) => {
                let locais = null;
                try {
                    const bytes = s.send_and_read_finish(res);
                    if (msg.get_status() === Soup.Status.OK)
                        locais = lerLocais(JSON.parse(new TextDecoder().decode(bytes.get_data())));
                } catch (_e) { /* cancelada ou sem rede */ }
                if (meu.is_cancelled())
                    return;
                if (locais === null) {
                    aviso.label = 'Não consegui buscar: confira a conexão.';
                    return;
                }
                aviso.label = locais.length ? 'Clique na cidade.' : 'Nada encontrado.';
                for (const local of locais) {
                    const row = new Adw.ActionRow({title: local.rotulo, use_markup: false, activatable: true,
                        subtitle: `${local.lat.toFixed(2)}, ${local.lon.toFixed(2)}`});
                    row.connect('activated', () => {
                        aoEscolher(local);
                        win.close();
                    });
                    lista.append(row);
                }
            });
            return GLib.SOURCE_REMOVE;
        };
        busca.connect('search-changed', () => {
            if (esperaId)
                GLib.source_remove(esperaId);
            esperaId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 500, buscar);
        });
        win.connect('close-request', () => {
            if (esperaId)
                GLib.source_remove(esperaId);
            esperaId = 0;
            cancelar?.cancel();
            sessao.abort();
            return false;
        });
        win.present();
        busca.grab_focus();
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
