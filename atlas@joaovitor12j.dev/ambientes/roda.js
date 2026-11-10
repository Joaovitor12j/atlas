// Roda do mouse sobre a doca troca de ambiente.
// Mistura de métodos em DockView (ver `misturar` em dock/mixin.js): usa o estado da doca (this._c, this._items...).
import Clutter from 'gi://Clutter';
import GLib from 'gi://GLib';
import {trocarAmbiente} from './acoes.js';

export class RodaAmbientes {
    // O container não é reativo, então a roda é ligada no vidro e em cada ícone.
    _hookScroll(actor) {
        actor.connect('scroll-event', (_a, event) => {
            if (!this._c.trocaRoda || this._c.ambientes.length < 2)
                return Clutter.EVENT_PROPAGATE;
            this._onScroll(event);
            return Clutter.EVENT_STOP;
        });
    }

    // Roda do mouse sobre a doca troca de ambiente (com um intervalo para não disparar várias vezes).
    _onScroll(event) {
        const dir = event.get_scroll_direction();
        let delta = 0;
        if (dir === Clutter.ScrollDirection.UP || dir === Clutter.ScrollDirection.LEFT)
            delta = -1;
        else if (dir === Clutter.ScrollDirection.DOWN || dir === Clutter.ScrollDirection.RIGHT)
            delta = 1;
        else if (dir === Clutter.ScrollDirection.SMOOTH)
            delta = Math.sign(event.get_scroll_delta()[1]);
        if (this._c.rodaInverter)
            delta = -delta;
        const agora = GLib.get_monotonic_time() / 1000;
        if (delta && agora - (this._lastScroll ?? 0) > 250) {
            this._lastScroll = agora;
            trocarAmbiente(this._settings, delta);
        }
    }
}
