// Medição opt-in do custo do ATLAS (chave `perfil-ativo`, desligada por padrão): cronometra cada temporizador
// e cada desenho e escreve um resumo no log a cada 30 s. Com a chave desligada, `agendar` só repassa ao GLib.
//   gsettings set org.gnome.shell.extensions.atlas perfil-ativo true
//   journalctl -f -o cat /usr/bin/gnome-shell | grep -A12 atlas-perf
import GLib from 'gi://GLib';

const P = {ligado: false, ini: 0, por: new Map(), relId: 0};

export function registrar(rotulo, t0) {
    if (!P.ligado)
        return;
    const e = P.por.get(rotulo) ?? {us: 0, n: 0};
    e.us += GLib.get_monotonic_time() - t0;
    e.n++;
    P.por.set(rotulo, e);
}

// Agenda um temporizador de `ms` milissegundos; `rotulo` nomeia a linha no relatório.
export function agendar(rotulo, ms, fn) {
    return GLib.timeout_add(GLib.PRIORITY_DEFAULT, ms, () => {
        if (!P.ligado)
            return fn();
        const t0 = GLib.get_monotonic_time();
        try {
            return fn();
        } finally {
            registrar(`${rotulo} (${ms}ms)`, t0);
        }
    });
}

export const agora = () => GLib.get_monotonic_time();

function relatorio() {
    const dt = (GLib.get_monotonic_time() - P.ini) / 1e6;
    if (dt < 1)
        return;
    let totalUs = 0;
    let totalN = 0;
    for (const e of P.por.values()) {
        totalUs += e.us;
        totalN += e.n;
    }
    const linhas = [...P.por.entries()].sort((a, b) => b[1].us - a[1].us).slice(0, 10)
        .map(([k, v]) => `  ${(v.us / 1e4 / dt).toFixed(3)}% de 1 núcleo, ${(v.n / dt).toFixed(1)}/s  ${k}`);
    console.log(`[atlas-perf] ${dt.toFixed(0)} s: total ${(totalUs / 1e4 / dt).toFixed(3)}% de 1 núcleo, ${(totalN / dt).toFixed(1)} execuções/s\n${linhas.join('\n')}`);
    P.ini = GLib.get_monotonic_time();
    P.por.clear();
}

// Liga ou desliga a medição.
export function perfilar(ligar) {
    if (ligar === P.ligado)
        return;
    P.ligado = ligar;
    if (P.relId) {
        GLib.source_remove(P.relId);
        P.relId = 0;
    }
    P.por.clear();
    if (ligar) {
        P.ini = GLib.get_monotonic_time();
        P.relId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 30000, () => {
            relatorio();
            return GLib.SOURCE_CONTINUE;
        });
    }
}
