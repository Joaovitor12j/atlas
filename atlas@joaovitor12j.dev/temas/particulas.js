// Campos de partículas puros dos efeitos de época (neve, luzinhas, brilhos, mar). Hoje só os testes os usam.

// Flocos de neve caindo continuamente (nevemat): {x, y, r} em px, período de 4 a 7 s por floco.
import {sorteioFixo} from '../logica.js';

export function campoNeve(t, largura, altura, n = 14) {
    const flocos = [];
    for (let i = 0; i < n; i++) {
        const periodo = 4000 + sorteioFixo(i + 300) * 3000;
        const fase = ((t + sorteioFixo(i) * periodo) % periodo) / periodo;
        const x = sorteioFixo(i + 60) * largura + Math.sin(fase * 6 + i) * 6;
        flocos.push({x, y: fase * altura, r: 1.2 + sorteioFixo(i + 120) * 1.6});
    }
    return flocos;
}

// Brilho (0 a 1) de cada luzinha de um fio: pisca devagar (2,2 a 3,6 s por luz), nunca mais de 1 vez por segundo.
export function luzinhasPiscando(t, n = 8) {
    return Array.from({length: n}, (_, i) => {
        const periodo = 2200 + sorteioFixo(i + 500) * 1400;
        const fase = ((t + sorteioFixo(i + 10) * periodo) % periodo) / periodo;
        return 0.3 + 0.7 * (0.5 + 0.5 * Math.sin(fase * Math.PI * 2));
    });
}

// Pontos de brilho dourado espalhados (vitrine): {x, y} de 0 a 1 (fração da largura/altura) e `brilho` de 0 a 1.
export function brilhosDourados(t, n = 8) {
    return Array.from({length: n}, (_, i) => {
        const periodo = 1800 + sorteioFixo(i + 700) * 1600;
        const fase = ((t + sorteioFixo(i + 20) * periodo) % periodo) / periodo;
        return {x: sorteioFixo(i + 80), y: sorteioFixo(i + 140), brilho: Math.max(0, Math.sin(fase * Math.PI * 2))};
    });
}

// Mar subindo e descendo (Natal brasileiro): deslocamento de -1 a 1, ciclo de 2,6 s.
export function marOnda(t) {
    return Math.sin(t / 2600 * Math.PI * 2);
}
