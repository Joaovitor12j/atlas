// Mascote Gato: sprite de gato desenhado à mão, caminhando ou correndo pela doca (sprites/gato.png).

// Como o motor (index.js) usa o mascote: `prefixo` das chaves do schema, `gatilho` (sem ele, dispara por horário), `temporada`,
// e `variantes` (movimentos) com tamanho, contexto, duração, quadro e desenho.
import {andarSprite} from '../movimento.js';

export const personagem = {
    prefixo: 'gato',
    variantes: {
        'caminha': andarSprite('gato', {velocidade: 3, passo: 0.8}),
        'corre': andarSprite('gato', {velocidade: 6.5, passo: 1.5}),
    },
};
