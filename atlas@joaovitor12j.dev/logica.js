// Lógica pura do ATLAS (sem gi://, St ou Shell): formatação, contas de tempo e ambientes.
// Fica separada para poder ser testada com `node --test` fora do GNOME Shell.

// Segundos -> "2h 05" ou "42 min".
import {CUCO} from './mascotes/personagens/cuco.js';

// ----- Clima (Open-Meteo) -----

// ----- Mascotes -----

CUCO.inicio = CUCO.sobe + CUCO.porta;

// ----- Mascotes do clima (frio e calor) -----

// Tamanho do actor de cada movimento, em px, a partir do tamanho dos ícones `icone` e da largura da doca: {w, h,
// abaixo} (`abaixo` é a parte que desce sobre a doca). Os que atravessam a doca ocupam a largura toda dela.
export function tamanhoMascoteClima(variante, icone, larguraDoca) {
    const a = icone;
    const r = x => Math.round(x);
    switch (variante) {
    case 'picole':
        return {w: r(a * 1.3), h: r(a * 2.2), abaixo: r(a * 0.7)};
    case 'sol-arco':
        return {w: r(larguraDoca), h: r(a * 2), abaixo: 0};
    case 'sol-leque':
    case 'sol-corre':
        return {w: r(larguraDoca), h: r(a * 1.7), abaixo: 0};
    case 'sol-quica':
    case 'sol-nasce':
        return {w: r(larguraDoca), h: r(a * 2), abaixo: 0};
    case 'cuco-voa':
        return {w: r(larguraDoca), h: r(a * 2.4), abaixo: 0};
    case 'pinguim':
    case 'pinguim-pula':
    case 'pinguim-anda':
        return {w: r(larguraDoca), h: r(a * 1.3), abaixo: 0};
    case 'neve':
        return {w: r(a * 2.6), h: r(a * 3.2), abaixo: 0};
    case 'pendurado':
        return {w: r(a * 1.6), h: r(a * 2.4), abaixo: r(a * 1.8)};
    default:
        return null;
    }
}

// ----- Passeios: mascotes que atravessam a doca em vez de só subir e descer -----
// Cada passeio é uma configuração: `dur` em ms, `fig` [largura, altura] da figura em múltiplos do ícone, `cabeca` (folga
// acima da figura, em múltiplos da altura dela), `modo` do movimento (`flutua`: paira e balança; `anda`: passinhos;
// `salta`: pulos de um lado ao outro), `passoMs` (período de um ciclo), `altura` (pairando, em alturas da figura),
// `bob` (amplitude, em alturas), `inclina` (rad) e `pausa` opcional {dur}: para no meio da doca por `dur` ms.
export const PASSEIOS = {
    'fantasma-flutua': {dur: 6200, fig: [1.4, 1.8], cabeca: 0.3, modo: 'flutua', passoMs: 1500, altura: 0.12, bob: 0.07, inclina: 0.1, pausa: {dur: 1500}},
    'fantasma-zigue': {dur: 4600, fig: [1.4, 1.8], cabeca: 0.5, modo: 'flutua', passoMs: 900, altura: 0.3, bob: 0.22, inclina: 0.22},
    'esqueleto-caminha': {dur: 7000, fig: [1.2, 1.9], cabeca: 0.1, modo: 'anda', passoMs: 380, bob: 0.03, inclina: 0.07, pausa: {dur: 1900}},
    'esqueleto-danca': {dur: 6600, fig: [1.2, 1.9], cabeca: 0.3, modo: 'salta', passoMs: 520, bob: 0.1, inclina: 0.14, pausa: {dur: 3600}},
    'noel-passeia': {dur: 7000, fig: [1.3, 1.8], cabeca: 0.1, modo: 'anda', passoMs: 420, bob: 0.03, inclina: 0.06, pausa: {dur: 2200}},
    'noel-pula': {dur: 5600, fig: [1.3, 1.8], cabeca: 0.4, modo: 'salta', passoMs: 800, bob: 0.22, inclina: 0.05},
    'boneco-desliza': {dur: 5200, fig: [1.2, 1.8], cabeca: 0.1, modo: 'flutua', passoMs: 700, altura: 0.012, bob: 0.012, inclina: 0.16},
    'boneco-pula': {dur: 5400, fig: [1.2, 1.8], cabeca: 0.4, modo: 'salta', passoMs: 700, bob: 0.2, inclina: 0.05},
    'chama-salta': {dur: 4200, fig: [1.1, 1.5], cabeca: 0.5, modo: 'salta', passoMs: 600, bob: 0.3, inclina: 0.1},
    'cuco-passeia': {dur: 8200, fig: [1.6, 2], cabeca: 0.1, modo: 'anda', passoMs: 460, bob: 0.015, inclina: 0.05, pausa: {dur: 3600}},
    'coruja-salta': {dur: 5200, fig: [1.2, 1.4], cabeca: 0.4, modo: 'salta', passoMs: 700, bob: 0.2, inclina: 0.07},
    'pilha-arrasta': {dur: 7400, fig: [1, 1.5], cabeca: 0.1, modo: 'anda', passoMs: 760, bob: 0.02, inclina: 0.06, pausa: {dur: 2000}},
    'satelite-deriva': {dur: 6400, fig: [1.3, 1.3], cabeca: 0.4, modo: 'flutua', passoMs: 1800, altura: 0.25, bob: 0.12, inclina: 0.14},
    'tomate-pula': {dur: 4800, fig: [1.1, 1.1], cabeca: 0.5, modo: 'salta', passoMs: 600, bob: 0.25, inclina: 0.08},
    'chama-corre': {dur: 3200, fig: [1.1, 1.5], cabeca: 0.2, modo: 'anda', passoMs: 200, bob: 0.08, inclina: 0.16},
};

// ----- Movimentos extras (Cuco, Calor e Frio) -----

// ----- Mascotes novos: coruja, pilha (bateria baixa), satélite (sem rede) e tomate (pomodoro) -----

// Efeitos de época (pacote Natal, ligados por padrão): campo de partículas em loop, dentro do vidro da doca.
// `largura`/`altura` em px do actor; `t` em ms desde que o efeito começou. Cada partícula sempre no mesmo lugar
// e período (sorteioFixo), só a fase avança com `t`, então dá pra entrar e sair do efeito sem salto visual.

// ----- Temas de pacote (Pixel, Materiais, Natal): o material da doca é desenhado em Cairo (decoracao.js) -----

