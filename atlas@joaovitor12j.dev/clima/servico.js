// Previsão do tempo (Open-Meteo, sem conta nem chave), dividida entre o widget Clima e os mascotes de frio e calor.
//
// Fica no módulo, como o histórico de CPU: a doca recria os widgets e o tempo não muda por isso. Busca a cada 30 min
// (5 min depois de uma falha), só com uma cidade escolhida; só as coordenadas saem da máquina. O relógio de parede
// (e não o monotônico) mede a validade, para os dados vencerem depois de uma suspensão.
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import Soup from 'gi://Soup?version=3.0';
import {climaVencido, lerClima, urlClima} from './logica.js';

// `dados` vem de lerClima (logica.js); `ouvintes` são chamados a cada busca terminada, com ou sem sucesso.
export const CLIMA = {dados: null, buscadoEm: 0, erro: false, chave: '', cancelar: null, sessao: null, ouvintes: new Set()};

// Cidade escolhida nas preferências: {nome, lat, lon}, ou null sem cidade.
export function localDoClima(settings) {
    const nome = (settings?.get_string('clima-cidade') ?? '').trim();
    return nome ? {nome, lat: settings.get_double('clima-latitude'), lon: settings.get_double('clima-longitude')} : null;
}

// Busca se os dados venceram (ou sempre, com `forcar`). Trocar de cidade descarta a previsão anterior.
export function buscarClima(settings, forcar = false) {
    const local = localDoClima(settings);
    if (!local)
        return;
    const chave = `${local.lat},${local.lon}`;
    if (chave !== CLIMA.chave) {
        CLIMA.cancelar?.cancel();
        Object.assign(CLIMA, {dados: null, buscadoEm: 0, erro: false, chave, cancelar: null});
    }
    const url = urlClima(local.lat, local.lon);
    if (!url || CLIMA.cancelar || (!forcar && !climaVencido(Date.now(), CLIMA.buscadoEm, {erro: CLIMA.erro})))
        return;
    CLIMA.sessao ??= new Soup.Session({user_agent: 'ATLAS (extensão do GNOME Shell)', timeout: 20});
    const msg = Soup.Message.new('GET', url);
    const cancelar = CLIMA.cancelar = new Gio.Cancellable();
    CLIMA.sessao.send_and_read_async(msg, GLib.PRIORITY_DEFAULT, cancelar, (sessao, res) => {
        let dados = null;
        try {
            const bytes = sessao.send_and_read_finish(res);
            if (msg.get_status() === Soup.Status.OK)
                dados = lerClima(JSON.parse(new TextDecoder().decode(bytes.get_data())));
        } catch (e) {
            if (!cancelar.is_cancelled())
                console.warn(`[atlas] clima: ${e.message}`);
        }
        if (cancelar !== CLIMA.cancelar)
            return; // cancelada (extensão desligada ou outra cidade)
        CLIMA.cancelar = null;
        CLIMA.buscadoEm = Date.now();
        CLIMA.erro = !dados;
        if (dados)
            CLIMA.dados = dados;
        for (const f of CLIMA.ouvintes)
            f();
    });
}

// Cancela a busca e esquece a previsão (chamado ao desativar a extensão).
export function pararClima() {
    CLIMA.cancelar?.cancel();
    CLIMA.sessao?.abort();
    Object.assign(CLIMA, {dados: null, buscadoEm: 0, erro: false, chave: '', cancelar: null, sessao: null});
    CLIMA.ouvintes.clear();
}
