// O tema que a doca está mostrando agora: o do ambiente atual, quando ele tem um; senão o global.
import {escolherAmbiente, normalizarAmbientes} from '../ambientes/logica.js';
import {TEMAS} from './catalogo.js';
import {temaEfetivo} from './logica.js';

export function temaDaDoca(settings) {
    const amb = escolherAmbiente(normalizarAmbientes(settings.get_string('ambientes')), settings.get_string('ambiente-atual'));
    return temaEfetivo(amb, settings.get_string('tema'), TEMAS.map(t => t[0]));
}
