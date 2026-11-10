// temas.css (temas/temas.css): o Shell só lê stylesheet.css no login; este é carregado aqui para valer ao recarregar.
import St from 'gi://St';

export class CssTemas {
    // `dir`: pasta da extensão.
    constructor(dir) {
        this._arquivo = dir.get_child('temas').get_child('temas.css');
        this._tema = null;
    }

    carregar() {
        this._tema = St.ThemeContext.get_for_stage(global.stage).get_theme();
        // Nunca duas entradas do mesmo arquivo no mesmo tema: descarregar uma delas deixa a outra
        // apontando para um GFile já liberado e o próximo Main.loadTheme() derruba o Shell.
        // unload_stylesheet não faz nada se o arquivo não estiver carregado.
        this._tema.unload_stylesheet(this._arquivo);
        this._tema.load_stylesheet(this._arquivo);
    }

    // O Shell troca o St.Theme ao bloquear/desbloquear a tela (Main.loadTheme) e copia os estilos
    // customizados para o novo. Descarregar só do tema guardado deixava o temas.css no tema novo
    // e o gnome-shell caía com SIGSEGV em st_theme_get_custom_stylesheets. Descarrega dos dois.
    descarregar() {
        if (this._arquivo) {
            const atual = St.ThemeContext.get_for_stage(global.stage).get_theme();
            for (const tema of new Set([this._tema, atual])) {
                if (!tema)
                    continue;
                try {
                    tema.unload_stylesheet(this._arquivo);
                } catch (e) {
                    console.error(`[atlas] falha ao descarregar temas.css: ${e}`);
                }
            }
        }
        this._tema = null;
    }
}
