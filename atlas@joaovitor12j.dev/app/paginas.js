// Páginas da janela de configuração do ATLAS. As mudanças valem ao vivo: o dock escuta o GSettings.
import Adw from 'gi://Adw';
import Gdk from 'gi://Gdk';
import GLib from 'gi://GLib';
import Gio from 'gi://Gio';
import Gtk from 'gi://Gtk';
import Soup from 'gi://Soup?version=3.0';
import {boneco, chama, coruja, cuco, esqueleto, fantasma, noel, sprite, pilha, pinguim, satelite, solArco, tomate} from '../desenho.js';
import {MOVIMENTOS} from '../catalogo.js';
import {SPRITES, lerLocais, quadroCoruja, quadroPilha, quadroSatelite, quadroTomate, quadroBoneco, quadroPinguim, quadroSolArco, quadroChama, quadroCuco, quadroEsqueleto, quadroFantasma, quadroNoel, urlBuscaLocal, definirTela, lerTelas} from '../logica.js';

export class Paginas {
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

    // ----- Mascotes -----
    // Dados da aba Mascotes (app/mascotes.js): o desenho parado de cada mascote e as linhas de opções que ele tem
    // (cada função recebe algo com `add_row`).

    _mascotesDados(settings) {
        // miniatura de cada mascote (o desenho de verdade, num quadro parado) e as opções que ele tem
        const miniaturas = {
            gato: (cr, w, h) => this._miniaturaSprite(cr, w, h, 'gato'),
            coruja: (cr, w, h) => coruja(cr, w, h, quadroCoruja(1500)),
            pilha: (cr, w, h) => pilha(cr, w, h, quadroPilha(1500)),
            satelite: (cr, w, h) => satelite(cr, w, h, quadroSatelite(1500)),
            tomate: (cr, w, h) => tomate(cr, w, h, quadroTomate(900)),
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
            gato: linha => this._opcoesSazonal(settings, linha, 'gato', 'o gato', 'da janela de horas'),
            coruja: linha => this._opcoesSazonal(settings, linha, 'coruja', 'a coruja', 'da janela de horas'),
            pilha: linha => this._opcoesPilha(settings, linha),
            satelite: linha => this._opcoesSatelite(settings, linha),
            tomate: linha => this._movimentos(settings, linha, 'tomate', 'Faz o tomate aparecer na hora, sem esperar o fim de um foco'),
            cuco: linha => this._opcoesCuco(settings, linha),
            chama: linha => this._opcoesChama(settings, linha),
            fantasma: linha => this._opcoesSazonal(settings, linha, 'fantasma', 'o fantasma'),
            esqueleto: linha => this._opcoesSazonal(settings, linha, 'esqueleto', 'o esqueleto'),
            noel: linha => this._opcoesSazonal(settings, linha, 'noel', 'o Papai Noel'),
            boneco: linha => this._opcoesSazonal(settings, linha, 'boneco', 'o boneco de neve'),
            calor: linha => this._opcoesClima(settings, linha, 'calor', MOVIMENTOS.calor, 'Temperatura mínima (°C)', 'Aparece quando a temperatura chega a este valor', 10, 50),
            frio: linha => this._opcoesClima(settings, linha, 'frio', MOVIMENTOS.frio, 'Temperatura máxima (°C)', 'Aparece quando a temperatura cai a este valor', -30, 35),
        };

        return {miniaturas, opcoes};
    }

    // Miniatura de um mascote de sprite: o primeiro quadro da folha, centrado e com os pés no chão da miniatura.
    _miniaturaSprite(cr, w, h, id) {
        const spec = SPRITES[id];
        try {
            this._folhas ??= {};
            this._folhas[id] ??= imports.cairo.ImageSurface.createFromPNG(
                GLib.build_filenamev([GLib.path_get_dirname(GLib.filename_from_uri(import.meta.url)[0]), '..', 'sprites', spec.arquivo]));
            const escala = Math.min(w / spec.fw, h / spec.fh) * 0.95;
            sprite(cr, w, h, {x: w / 2, quadro: 4, dir: 1, escala, pe: 0}, {spec, imagem: this._folhas[id], base: h * 0.5 + spec.chao * escala - spec.fh * escala / 2});
        } catch (e) {
            console.error(`[atlas] miniatura do sprite ${id}: ${e}`);
        }
    }

    // Escolha do movimento de um mascote (ou "sortear" a cada aparição) e um botão de teste por movimento, para comparar.
    // Devolve a linha de teste para o chamador acrescentar o que mais precisar.
    _movimentos(settings, linha, id, subtitulo) {
        const movimentos = MOVIMENTOS[id];
        linha.add_row(this._combo(settings, `${id}-movimento`, 'Movimento', [['sortear', 'Sortear a cada vez'], ...movimentos]));
        this._linhaTeste(settings, linha, id, movimentos, subtitulo);
    }

    // "Testar agora": título e subtítulo numa linha e, logo abaixo, um botão por movimento, que quebram de linha se
    // faltar espaço (no sufixo da linha os botões espremiam o texto).
    _linhaTeste(settings, linha, id, movimentos, subtitulo) {
        linha.add_row(new Adw.ActionRow({title: 'Testar agora', subtitle: subtitulo}));
        const botoes = new Gtk.FlowBox({
            selection_mode: Gtk.SelectionMode.NONE, homogeneous: false, column_spacing: 6, row_spacing: 6,
            max_children_per_line: 4, margin_top: 4, margin_bottom: 12, margin_start: 12, margin_end: 12,
        });
        for (const [mov, nome] of movimentos) {
            const b = new Gtk.Button({label: nome});
            b.connect('clicked', () => settings.set_string('mascote-teste', `${id}=${mov}:${GLib.get_monotonic_time()}`));
            botoes.append(b);
        }
        const linhaBotoes = new Adw.PreferencesRow({activatable: false, child: botoes});
        linha.add_row(linhaBotoes);
    }

    _opcoesCuco(settings, linha) {
        linha.add_row(this._combo(settings, 'cuco-intervalo', 'Quando canta', [
            ['hora', 'Nas horas cheias'], ['meia-hora', 'Nas horas cheias e nas meias horas'],
        ]));
        linha.add_row(this._spin(settings, 'cuco-das', 'Primeira hora do dia', 'Antes disso o cuco fica quieto', 0, 23, 1, 0));
        linha.add_row(this._spin(settings, 'cuco-ate', 'Última hora do dia', 'Depois disso o cuco fica quieto; se for menor que a primeira, a janela cruza a meia-noite', 0, 23, 1, 0));
        linha.add_row(this._spin(settings, 'cuco-max-batidas', 'Máximo de cantos', 'O cuco canta uma vez por hora do relógio, até este limite', 1, 12, 1, 0));
        this._movimentos(settings, linha, 'cuco', 'Faz o cuco aparecer na hora, mesmo fora da janela de horas');
    }

    _opcoesChama(settings, linha) {
        linha.add_row(this._spin(settings, 'chama-limiar', 'Uso de memória (%)', 'A chama aparece quando o uso chega a este valor', 50, 99, 1, 0));
        linha.add_row(this._spin(settings, 'chama-espera', 'Minutos entre aparições', 'Tempo mínimo entre duas aparições, mesmo com a memória alta', 1, 240, 1, 0));
        this._movimentos(settings, linha, 'chama', 'Faz a chama aparecer na hora, mesmo com a memória baixa');
    }

    // Pilha cansada: aparece quando a bateria, descarregando, chega ao limite.
    _opcoesPilha(settings, linha) {
        linha.add_row(this._spin(settings, 'pilha-limiar', 'Carga da bateria (%)', 'A pilha aparece quando a bateria, descarregando, chega a este valor', 5, 50, 1, 0));
        linha.add_row(this._spin(settings, 'pilha-espera', 'Minutos entre aparições', 'Tempo mínimo entre duas aparições, mesmo com a bateria baixa', 1, 240, 1, 0));
        this._movimentos(settings, linha, 'pilha', 'Faz a pilha aparecer na hora, com qualquer carga');
    }

    // Satélite perdido: aparece alguns segundos depois de a rede cair.
    _opcoesSatelite(settings, linha) {
        linha.add_row(this._spin(settings, 'satelite-espera', 'Minutos entre aparições', 'Tempo mínimo entre duas aparições, se a rede oscilar', 1, 240, 1, 0));
        this._movimentos(settings, linha, 'satelite', 'Faz o satélite aparecer na hora, com a rede funcionando');
    }

    // Opções dos mascotes sazonais (fantasma, esqueleto, Papai Noel, boneco de neve): todos têm as chaves
    // `<id>-intervalo`, `<id>-das` e `<id>-ate` e o botão de teste. `quem` é o nome com artigo ("o fantasma").
    _opcoesSazonal(settings, linha, id, quem, fora = 'da temporada e da janela de horas') {
        linha.add_row(this._combo(settings, `${id}-intervalo`, 'Quando aparece', [
            ['hora', 'Nas horas cheias'], ['meia-hora', 'Nas horas cheias e nas meias horas'],
        ]));
        linha.add_row(this._spin(settings, `${id}-das`, 'Primeira hora do dia', `Antes disso ${quem} fica quieto`, 0, 23, 1, 0));
        linha.add_row(this._spin(settings, `${id}-ate`, 'Última hora do dia', `Depois disso ${quem} fica quieto; se for menor que a primeira, a janela cruza a meia-noite`, 0, 23, 1, 0));
        this._movimentos(settings, linha, id, `Faz ${quem} aparecer na hora, mesmo fora ${fora}`);
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
        this._linhaTeste(settings, linha, id, movimentos, 'Faz o movimento aparecer na hora, com qualquer temperatura');
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

    // Uma linha por tela (mesma ordem do dock: esquerda para a direita, depois de cima para baixo): o interruptor
    // da linha liga a doca naquela tela e, dentro dela, o auto-ocultar vale só para ela. Desligar todas = sem doca.
    _linhasTelas(settings) {
        const lista = Gdk.Display.get_default()?.get_monitors();
        const mons = [];
        for (let i = 0; lista && i < lista.get_n_items(); i++) {
            const m = lista.get_item(i);
            const g = m.get_geometry();
            mons.push({x: g.x, y: g.y, w: g.width, h: g.height, nome: m.get_connector() ?? m.get_model() ?? ''});
        }
        mons.sort((a, b) => a.x - b.x || a.y - b.y);
        const entrada = pos => lerTelas(settings.get_string('telas'))?.[String(pos + 1)];
        return mons.map((m, pos) => {
            const linha = new Adw.ExpanderRow({
                title: `Tela ${pos + 1}`,
                subtitle: `${m.nome} (${m.w}×${m.h})`,
                show_enable_switch: true,
            });
            const auto = new Adw.SwitchRow({title: 'Auto-ocultar', subtitle: 'Esconde a doca desta tela e mostra ao encostar na borda'});
            linha.add_row(auto);
            let atualizando = false;
            const sync = () => {
                atualizando = true;
                const e = entrada(pos);
                linha.enable_expansion = e?.ativa === true;
                auto.active = e?.auto === true;
                atualizando = false;
            };
            sync();
            linha.connect('notify::enable-expansion', () => {
                if (!atualizando)
                    settings.set_string('telas', definirTela(settings.get_string('telas'), pos, 'ativa', linha.enable_expansion));
            });
            auto.connect('notify::active', () => {
                if (!atualizando)
                    settings.set_string('telas', definirTela(settings.get_string('telas'), pos, 'auto', auto.active));
            });
            settings.connect('changed::telas', sync);
            return linha;
        });
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
