// Ambientes no Shell: lê e troca o ambiente atual (guardado como JSON no GSettings), com aviso na tela (OSD).
// [{id, nome, cor, apps: [ids .desktop], tema?: id, widgets?: [ids], colecoes?: [{id, nome, apps}]}]
import Gio from 'gi://Gio';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import {escolherAmbiente, normalizarAmbientes} from './logica.js';

export function lerAmbientes(st) {
    return normalizarAmbientes(st?.get_string('ambientes'));
}

export function ambienteAtual(st, lista) {
    return escolherAmbiente(lista, st?.get_string('ambiente-atual'));
}

export function trocarAmbiente(st, delta) {
    const lista = lerAmbientes(st);
    if (lista.length < 2)
        return;
    const i = lista.indexOf(ambienteAtual(st, lista));
    selecionarAmbiente(st, lista[(i + delta + lista.length) % lista.length]);
}

export function selecionarAmbiente(st, amb) {
    st.set_string('ambiente-atual', amb.id);
    try {
        Main.osdWindowManager.show(-1, new Gio.ThemedIcon({name: 'view-grid-symbolic'}), amb.nome, null);
    } catch (_e) { /* OSD é só um aviso */ }
}

// Ctrl+Alt+N: vai direto ao N-ésimo ambiente (1 = primeiro da lista).
export function irParaAmbiente(st, n) {
    const lista = lerAmbientes(st);
    const amb = lista[n - 1];
    if (amb && amb.id !== ambienteAtual(st, lista)?.id)
        selecionarAmbiente(st, amb);
}
