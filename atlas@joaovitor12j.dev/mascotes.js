// Mascotes do ATLAS: aparecem em cima da doca, fazem o que têm de fazer e somem. Ver docs/MASCOTES.md.
//
// Em repouso o custo é um único temporizador (no máximo a cada 15 min) e só com um mascote ligado; o actor só
// existe durante a aparição. A lógica de horários e a linha do tempo estão em logica.js, o desenho em desenho.js.
import Cairo from 'gi://cairo';
import {EFEITOS_TEMA} from './decoracao.js';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import St from 'gi://St';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import {aguaViva, bonecoIlustrado, boneco, chama, coruja, cuco, cucoVoa, esqueleto, fantasma, gaivota, gatoIlustrado, neve, noel, papaiNoel, passear, pendurado, picole, pilha, pinguim, rena, sapo, satelite, solArco, solLeque, sprite, tomate} from './desenho.js';
import {AO_CONCLUIR_FOCO} from './eventos.js';
import {CLIMA, buscarClima} from './clima.js';
import {agendar, agora, registrar} from './perf.js';
import {
    avaliarDisparo, bateriaPedeAparicao, batidasDoDisparo, duracaoCoruja, SPRITES, quadroSprite, duracaoPilha, duracaoSatelite, duracaoTomate,
    quadroCoruja, quadroPilha, quadroSatelite, quadroTomate, rearmarBateria, deslocamentoAleatorio, deslocamentosLado, duracaoBoneco, duracaoChama, duracaoCuco,
    duracaoEsqueleto, duracaoFantasma, duracaoNeve, duracaoNoel, duracaoPendurado, duracaoPicole, duracaoPinguim,
    duracaoCucoVoa, duracaoPasseio, duracaoPinguimAnda, duracaoPinguimPula, duracaoSolCorre, duracaoSolNasce, duracaoSolQuica,
    quadroCucoVoa, quadroPinguimAnda, quadroPinguimPula, quadroSolCorre, quadroSolNasce, quadroSolQuica, duracaoSolArco, duracaoSolLeque, PASSEIOS, quadroPasseio, tamanhoPasseio, escolherAparicao, escolherVariante, esperaAte, flocosDeNeve, mascoteDoClima,
    memoriaPedeAparicao, naJanela, naTemporada, posicionarMascote, proximoDisparo, proximoEstadoResidente, quadroAguaViva,
    quadroBoneco, quadroBonecoIlustrado, quadroChama, quadroCuco,
    quadroEsqueleto, quadroFantasma, quadroGaivota, quadroGatoIlustrado, quadroNeve, quadroNoel, quadroPapaiNoel, quadroPendurado, quadroPicole, quadroPinguim, quadroRena, quadroSapo, quadroSolArco,
    quadroSolLeque, rearmarMemoria, tamanhoMascoteClima, usoMemoria,
} from './logica.js';

// Mascotes residentes: moram na doca do tema atual (ligados por `mascote-residente-ativo`) e nunca saem, diferente
// dos mascotes por horário/data/evento acima. `estados` é [[id, peso]] para proximoEstadoResidente (logica.js);
// `duracaoMs` dá a faixa [min, max] de cada estado antes de sortear o próximo. Pixel e nevepixel ficam para quando
// houver folha de sprites de verdade (precisam de arte, não só código).
const RESIDENTES = {
    aurora: {
        id: 'agua-viva',
        estados: [['flutuando', 6], ['nadando', 3], ['brilhando', 2], ['dormindo', 1]],
        duracaoMs: {flutuando: [4000, 7000], nadando: [3000, 5000], brilhando: [2000, 3000], dormindo: [5000, 9000]},
        tamanho: icone => ({w: Math.round(icone * 1.5), h: Math.round(icone * 1.5)}),
        desenhar: aguaViva,
        quadro: quadroAguaViva,
    },
    carta: {
        id: 'gaivota',
        estados: [['parada', 5], ['andando', 3], ['voando', 2], ['dormindo', 1]],
        duracaoMs: {parada: [3000, 6000], andando: [2500, 4500], voando: [2500, 4000], dormindo: [5000, 9000]},
        tamanho: icone => ({w: Math.round(icone * 1.4), h: Math.round(icone * 1.1)}),
        desenhar: gaivota,
        quadro: quadroGaivota,
    },
    jardim: {
        id: 'gato',
        estados: [['parado', 5], ['andando', 3], ['correndo', 1], ['dormindo', 1]],
        duracaoMs: {parado: [3000, 6000], andando: [2500, 4500], correndo: [1500, 2500], dormindo: [5000, 9000]},
        tamanho: icone => ({w: Math.round(icone * 1.3), h: Math.round(icone * 1.1)}),
        desenhar: gatoIlustrado,
        quadro: quadroGatoIlustrado,
    },
    chuva: {
        id: 'sapo',
        estados: [['parado', 5], ['pulando', 3], ['coaxando', 2], ['dormindo', 1]],
        duracaoMs: {parado: [3000, 5500], pulando: [1500, 2500], coaxando: [2000, 3500], dormindo: [5000, 9000]},
        tamanho: icone => ({w: Math.round(icone * 1.3), h: Math.round(icone * 1.7)}),
        desenhar: sapo,
        quadro: quadroSapo,
    },
    nevemat: {
        id: 'boneco-ilustrado',
        estados: [['parado', 5], ['saltitando', 3], ['acenando', 2], ['dormindo', 1]],
        duracaoMs: {parado: [3000, 6000], saltitando: [2000, 3500], acenando: [2000, 3500], dormindo: [5000, 9000]},
        tamanho: icone => ({w: Math.round(icone * 1.3), h: Math.round(icone * 1.8)}),
        desenhar: bonecoIlustrado,
        quadro: quadroBonecoIlustrado,
    },
    vitrine: {
        id: 'rena',
        estados: [['parada', 5], ['trotando', 3], ['sininho', 2], ['dormindo', 1]],
        duracaoMs: {parada: [3000, 6000], trotando: [2500, 4500], sininho: [2000, 3500], dormindo: [5000, 9000]},
        tamanho: icone => ({w: Math.round(icone * 1.5), h: Math.round(icone * 1.1)}),
        desenhar: rena,
        quadro: quadroRena,
    },
    brasileiro: {
        id: 'papai-noel',
        estados: [['parado', 4], ['passeando', 3], ['rindo', 2], ['dormindo', 1]],
        duracaoMs: {parado: [3000, 5500], passeando: [2500, 4500], rindo: [2000, 3500], dormindo: [5000, 9000]},
        tamanho: icone => ({w: Math.round(icone * 1.3), h: Math.round(icone * 1.9)}),
        desenhar: papaiNoel,
        quadro: quadroPapaiNoel,
    },
};
const RESIDENTE_QUADRO_MS = 33;

// Efeitos dos temas de pacote (decoracao.js, ligados por padrão via `efeito-epoca-ativo`): campo de partículas em loop,
// desenhado dentro do vidro da doca (não a tela toda). `desenhar(cr, w, h, t)` é puro, sem estado.
const EFEITOS = EFEITOS_TEMA;

// No teste manual, dizer por que nada apareceu; nos disparos normais pular em silêncio é o esperado.
const pular = (forcar, motivo) => {
    if (forcar)
        console.log(`[atlas] mascote não apareceu: ${motivo}`);
    return false;
};

const QUADRO_MS = 33; // ~30 quadros por segundo, só durante a aparição

// Cada mascote: `prefixo` das chaves do schema (`<prefixo>-intervalo`, `-das`, `-ate`), tamanho do actor (a partir do
// ícone e da doca), duração e quadro (puros, em logica.js) e o desenho. `temporada` (opcional) limita a aparição a datas
// do ano; `gatilho: 'memoria'` troca o horário pelo amostrador de memória (sem `prefixo`) e `gatilho: 'clima'` pela
// previsão do tempo (clima.js). Quem tem `variantes` escolhe o movimento a cada aparição (chave `<id>-movimento`).
// Um movimento dos mascotes do clima: o desenho recebe `ctx.base` e `ctx.icone` do motor; `dir` sorteia o lado de onde
// vêm os que atravessam a doca.
const movimento = (variante, duracao, quadro, desenhar) => ({
    tamanho: (icone, caixa) => tamanhoMascoteClima(variante, icone, caixa.w),
    contexto: () => ({dir: Math.random() < 0.5 ? -1 : 1}),
    duracao,
    quadro: (t, ctx) => quadro(t, ctx.dir),
    desenhar: (cr, w, h, q, ctx) => desenhar(cr, w, h, q, ctx),
});

// Um passeio (logica.js, PASSEIOS): o mascote atravessa a doca. `quadroFig` converte o estado do passeio no estado do
// desenho que sobe da doca (o mesmo desenho do mascote, só que andando, voando ou pulando).
const passeio = (chave, desenhar, quadroFig, contexto = () => ({})) => ({
    tamanho: (icone, caixa) => tamanhoPasseio(chave, icone, caixa.w),
    contexto: (settings, alvo) => ({dir: Math.random() < 0.5 ? -1 : 1, ...contexto(settings, alvo)}),
    duracao: () => duracaoPasseio(chave),
    quadro: (t, ctx) => quadroPasseio(t, ctx.dir, PASSEIOS[chave]),
    desenhar: (cr, w, h, q, ctx) => passear(cr, w, h, q, ctx, PASSEIOS[chave].fig, desenhar, quadroFig),
});

// Um sprite que atravessa a doca (SPRITES, logica.js): o actor tem a largura da doca e a altura do mascote. A imagem
// é carregada pelo motor (`impl.sprite`) e chega ao desenho em `ctx.imagem`.
const andarSprite = (id, {velocidade, passo}) => ({
    sprite: id,
    tamanho: (icone, caixa) => ({w: Math.round(caixa.w), h: Math.round(icone * (SPRITES[id].altura * 1.05 + 0.25)), abaixo: Math.round(icone * 0.25)}),
    contexto: () => ({dir: Math.random() < 0.5 ? -1 : 1, spec: SPRITES[id]}),
    duracao: () => 0,
    quadro: (t, ctx) => quadroSprite(t, ctx.dir, ctx.spec, {largura: ctx.largura, icone: ctx.icone, velocidade, passo}),
    desenhar: (cr, w, h, q, ctx) => sprite(cr, w, h, q, ctx),
});

const IMPL = {
    cuco: {
        prefixo: 'cuco',
        variantes: {
            'casa': {
                tamanho: icone => ({w: Math.round(icone * 1.6), h: Math.round(icone * 2)}),
                contexto: (settings, alvo) => ({
                    batidas: batidasDoDisparo(alvo.hora, alvo.minuto, settings.get_int('cuco-max-batidas')),
                    hora: alvo.hora,
                    minuto: alvo.minuto,
                }),
                duracao: ctx => duracaoCuco(ctx.batidas),
                quadro: (t, ctx) => quadroCuco(t, ctx.batidas),
                desenhar: (cr, w, h, q, ctx) => cuco(cr, w, h, q, ctx),
            },
            'passeia': passeio('cuco-passeia', cuco, q => ({
                casa: 1, porta: q.parado, passaro: q.parado * Math.abs(Math.sin(q.t / 480)), bico: Math.abs(Math.sin(q.t / 160)) * q.parado,
                inclina: Math.sin(q.t / 240) * q.parado,
            }), (settings, alvo) => ({hora: alvo.hora, minuto: alvo.minuto})),
            'voa': movimento('cuco-voa', duracaoCucoVoa, quadroCucoVoa, cucoVoa),
        },
    },
    fantasma: {
        prefixo: 'fantasma',
        temporada: {ini: [9, 24], fim: [9, 31]}, // 24 a 31 de outubro
        variantes: {
            'sobe': {
                tamanho: icone => ({w: Math.round(icone * 1.4), h: Math.round(icone * 1.8)}),
                contexto: () => ({}),
                duracao: () => duracaoFantasma(),
                finais: ['cai', 'some', 'espia'],
                quadro: (t, ctx) => quadroFantasma(t, ctx.saida),
                desenhar: (cr, w, h, q) => fantasma(cr, w, h, q),
            },
            'flutua': passeio('fantasma-flutua', fantasma, q => ({
                sobe: 1, balanco: Math.sin(q.t / 260), susto: q.parado, fase: q.t / 160, olhar: q.olhar,
            })),
            'zigue': passeio('fantasma-zigue', fantasma, q => ({
                sobe: 1, balanco: Math.sin(q.t / 200), susto: 0.4 + 0.4 * Math.sin(q.t / 350), fase: q.t / 120, olhar: q.olhar,
            })),
        },
    },
    esqueleto: {
        prefixo: 'esqueleto',
        temporada: {ini: [9, 24], fim: [9, 31]},
        variantes: {
            'sobe': {
                tamanho: icone => ({w: Math.round(icone * 1.2), h: Math.round(icone * 1.9)}),
                contexto: () => ({}),
                duracao: () => duracaoEsqueleto(),
                finais: ['cai', 'afunda', 'espia'],
                quadro: (t, ctx) => quadroEsqueleto(t, ctx.saida),
                desenhar: (cr, w, h, q) => esqueleto(cr, w, h, q),
            },
            'caminha': passeio('esqueleto-caminha', esqueleto, q => ({
                sobe: 1, balanco: Math.sin(q.t / 190) * 0.8, aceno: q.acena, mandibula: Math.abs(Math.sin(q.t / 95)) * q.parado, olhar: q.olhar,
            })),
            'danca': passeio('esqueleto-danca', esqueleto, q => ({
                sobe: 1, balanco: Math.sin(q.t / 260), aceno: Math.sin(q.t / 130), mandibula: Math.abs(Math.sin(q.t / 130)), olhar: q.olhar,
            })),
        },
    },
    noel: {
        prefixo: 'noel',
        temporada: {ini: [11, 1], fim: [11, 25]}, // 1 a 25 de dezembro
        variantes: {
            'sobe': {
                tamanho: icone => ({w: Math.round(icone * 1.3), h: Math.round(icone * 1.8)}),
                contexto: () => ({}),
                duracao: () => duracaoNoel(),
                finais: ['cai', 'afunda', 'espia'],
                quadro: (t, ctx) => quadroNoel(t, ctx.saida),
                desenhar: (cr, w, h, q) => noel(cr, w, h, q),
            },
            'passeia': passeio('noel-passeia', noel, q => ({
                sobe: 1, balanco: Math.sin(q.t / 210) * 0.7, aceno: q.acena, riso: Math.abs(Math.sin(q.t / 210)) * q.parado, olhar: q.olhar,
            })),
            'pula': passeio('noel-pula', noel, q => ({
                sobe: 1, balanco: Math.sin(q.t / 400) * 0.5, aceno: Math.sin(q.t / 150), riso: Math.abs(Math.sin(q.t / 260)), olhar: q.olhar,
            })),
        },
    },
    boneco: {
        prefixo: 'boneco',
        temporada: {ini: [11, 1], fim: [11, 25]},
        variantes: {
            'sobe': {
                tamanho: icone => ({w: Math.round(icone * 1.2), h: Math.round(icone * 1.8)}),
                contexto: () => ({}),
                duracao: () => duracaoBoneco(),
                finais: ['cai', 'afunda'],
                quadro: (t, ctx) => quadroBoneco(t, ctx.saida),
                desenhar: (cr, w, h, q) => boneco(cr, w, h, q),
            },
            'desliza': passeio('boneco-desliza', boneco, q => ({
                sobe: 1, balanco: Math.sin(q.t / 350) * 0.4, vento: Math.sin(q.t / 150), olhar: q.olhar,
            })),
            'pula': passeio('boneco-pula', boneco, q => ({
                sobe: 1, balanco: Math.sin(q.t / 350) * 0.5, vento: Math.sin(q.t / 230), olhar: q.olhar,
            })),
        },
    },
    chama: {
        gatilho: 'memoria',
        variantes: {
            'sobe': {
                tamanho: icone => ({w: Math.round(icone * 1.1), h: Math.round(icone * 1.5)}),
                contexto: () => ({}),
                duracao: () => duracaoChama(),
                finais: ['cai', 'some'],
                quadro: (t, ctx) => quadroChama(t, ctx.saida),
                desenhar: (cr, w, h, q) => chama(cr, w, h, q),
            },
            'salta': passeio('chama-salta', chama, q => ({sobe: 1, fase: q.t / 90, aflicao: 1, olhar: q.olhar})),
            'corre': passeio('chama-corre', chama, q => ({sobe: 1, fase: q.t / 60, aflicao: 0.8, olhar: q.olhar})),
        },
    },
    gato: {
        prefixo: 'gato',
        variantes: {
            'caminha': andarSprite('gato', {velocidade: 3, passo: 0.8}),
            'corre': andarSprite('gato', {velocidade: 6.5, passo: 1.5}),
        },
    },
    coruja: {
        prefixo: 'coruja',
        variantes: {
            'sobe': {
                tamanho: icone => ({w: Math.round(icone * 1.3), h: Math.round(icone * 1.8)}),
                contexto: () => ({}),
                duracao: () => duracaoCoruja(),
                finais: ['cai', 'afunda', 'espia'],
                quadro: (t, ctx) => quadroCoruja(t, ctx.saida),
                desenhar: (cr, w, h, q) => coruja(cr, w, h, q),
            },
            'salta': passeio('coruja-salta', coruja, q => ({sobe: 1, sono: 0, olhos: 1, cabeca: Math.sin(q.t / 500), olhar: q.olhar})),
        },
    },
    pilha: {
        gatilho: 'bateria',
        variantes: {
            'sobe': {
                tamanho: icone => ({w: Math.round(icone * 1.2), h: Math.round(icone * 1.8)}),
                contexto: () => ({}),
                duracao: () => duracaoPilha(),
                finais: ['cai', 'afunda'],
                quadro: (t, ctx) => quadroPilha(t, ctx.saida),
                desenhar: (cr, w, h, q) => pilha(cr, w, h, q),
            },
            'arrasta': passeio('pilha-arrasta', pilha, q => ({
                sobe: 1, nivel: 0.1 + 0.05 * Math.abs(Math.sin(q.t / 420)), cansaco: Math.sin(q.t / 380) * 0.8, suspiro: 0.5 + 0.5 * Math.sin(q.t / 600), olhar: q.olhar,
            })),
        },
    },
    satelite: {
        gatilho: 'rede',
        variantes: {
            'sobe': {
                tamanho: icone => ({w: Math.round(icone * 1.8), h: Math.round(icone * 2.1)}),
                contexto: () => ({}),
                duracao: () => duracaoSatelite(),
                finais: ['cai', 'some'],
                quadro: (t, ctx) => quadroSatelite(t, ctx.saida),
                desenhar: (cr, w, h, q) => satelite(cr, w, h, q),
            },
            'deriva': passeio('satelite-deriva', satelite, q => ({
                sobe: 1, giro: Math.sin(q.t / 520) * 0.5, sinal: (q.t % 1300) / 1300, perdido: 1, olhar: q.olhar,
            })),
        },
    },
    tomate: {
        gatilho: 'pomodoro',
        variantes: {
            'sobe': {
                tamanho: icone => ({w: Math.round(icone * 1.8), h: Math.round(icone * 1.9)}),
                contexto: () => ({}),
                duracao: () => duracaoTomate(),
                finais: ['cai', 'afunda', 'some'],
                quadro: (t, ctx) => quadroTomate(t, ctx.saida),
                desenhar: (cr, w, h, q) => tomate(cr, w, h, q),
            },
            'pula': passeio('tomate-pula', tomate, q => ({sobe: 1, pulo: 0, confete: q.t / 1000 % 2.4, olhar: q.olhar})),
        },
    },
    calor: {
        gatilho: 'clima',
        variantes: {
            'picole': movimento('picole', duracaoPicole, t => quadroPicole(t), picole),
            'sol-arco': movimento('sol-arco', duracaoSolArco, quadroSolArco, solArco),
            'sol-leque': movimento('sol-leque', duracaoSolLeque, quadroSolLeque, solLeque),
            'sol-corre': movimento('sol-corre', duracaoSolCorre, quadroSolCorre, solLeque),
            'sol-quica': movimento('sol-quica', duracaoSolQuica, quadroSolQuica, solArco),
            'sol-nasce': movimento('sol-nasce', duracaoSolNasce, t => quadroSolNasce(t), solArco),
        },
    },
    frio: {
        gatilho: 'clima',
        variantes: {
            'pinguim': movimento('pinguim', duracaoPinguim, quadroPinguim, pinguim),
            'pinguim-pula': movimento('pinguim-pula', duracaoPinguimPula, quadroPinguimPula, pinguim),
            'pinguim-anda': movimento('pinguim-anda', duracaoPinguimAnda, quadroPinguimAnda, pinguim),
            'neve': movimento('neve', duracaoNeve, t => quadroNeve(t),
                (cr, w, h, q, ctx) => neve(cr, w, h, q, {...ctx, flocos: flocosDeNeve(q.t)})),
            'pendurado': movimento('pendurado', duracaoPendurado, t => quadroPendurado(t), pendurado),
        },
    },
};
// os de horário (cuco, fantasma, esqueleto, noel, boneco) dividem o temporizador de disparos; a chama tem o amostrador
// de memória e os do clima conferem a previsão (que só é buscada de novo a cada 30 min, ver clima.js)
const HORARIOS = Object.keys(IMPL).filter(id => !IMPL[id].gatilho);
const DO_CLIMA = Object.keys(IMPL).filter(id => IMPL[id].gatilho === 'clima');
// mascotes de evento sem prefixo: ligam só ao evento (memória, bateria, rede, fim de foco do Pomodoro)
const DE_EVENTO = new Set(['memoria', 'bateria', 'rede', 'pomodoro']);
const AMOSTRA_MS = 15_000;
const CONFIRMA_REDE_MS = 6000; // fica sem rede por esse tempo antes de o satélite aparecer
const AMOSTRA_CLIMA_MS = 5 * 60_000;
const naData = (impl, ms) => !impl.temporada || naTemporada(new Date(ms), impl.temporada.ini, impl.temporada.fim);

export class Mascotes {
    // `ganchos`: {doca: () => DockView da tela principal, naoPerturbe: () => bool}; só são chamados na hora de usar.
    constructor(settings, ganchos) {
        this._settings = settings;
        this._ganchos = ganchos;
    }

    enable() {
        this._sinais = [];
        this._timerId = 0;
        this._quadroId = 0;
        this._atuais = [];
        this._alvo = null;
        this._memId = 0;
        this._mem = {armado: true, ultimo: -Infinity};
        this._climaId = 0;
        this._climaUltimo = {};
        this._climaOuvinte = null;
        this._ultimoEvento = {};
        this._bat = null;
        this._redeSinal = null;
        this._redeId = 0;
        this._aoFoco = () => this._disparar('tomate');
        this._residId = 0;
        this._resid = null;
        this._efeitoId = 0;
        this._efeito = null;
        const st = this._settings;
        for (const chave of ['mascotes-ativos', 'clima-cidade', ...HORARIOS.map(id => `${IMPL[id].prefixo}-intervalo`)])
            this._sinais.push([st, st.connect(`changed::${chave}`, () => this._reagendar())]);
        this._sinais.push([st, st.connect('changed::mascote-teste', () => this._teste())]);
        this._sinais.push([st, st.connect('changed::tema', () => this._atualizarResidente())]);
        this._sinais.push([st, st.connect('changed::mascote-residente-ativo', () => this._atualizarResidente())]);
        this._sinais.push([st, st.connect('changed::tema', () => this._atualizarEfeito())]);
        this._sinais.push([st, st.connect('changed::efeito-epoca-ativo', () => this._atualizarEfeito())]);
        this._sinais.push([Main.overview, Main.overview.connect('showing', () => this._encerrar())]);
        this._reagendar();
        this._atualizarResidente();
        this._atualizarEfeito();
    }

    disable() {
        for (const [obj, id] of this._sinais ?? [])
            obj.disconnect(id);
        this._sinais = [];
        this._cancelar();
        this._desligarEventos();
        this._encerrar();
        this._pararResidente();
        this._pararEfeito();
        for (const img of Object.values(this._imagens ?? {}))
            img.finish();
        this._imagens = {};
    }

    // Folha de sprites `id` (sprites/<arquivo> na pasta da extensão), aberta uma vez e solta ao desligar; null se falhar.
    _imagem(id) {
        this._imagens ??= {};
        if (!this._imagens[id]) {
            try {
                const arq = this._ganchos.pasta().get_child('sprites').get_child(SPRITES[id].arquivo);
                this._imagens[id] = Cairo.ImageSurface.createFromPNG(arq.get_path());
            } catch (e) {
                console.error(`[atlas] sprite ${id}: ${e}`);
                return null;
            }
        }
        return this._imagens[id];
    }

    _ativo(id) {
        return this._settings.get_strv('mascotes-ativos').includes(id);
    }

    _cancelar() {
        for (const campo of ['_timerId', '_memId', '_climaId']) {
            if (this[campo]) {
                GLib.source_remove(this[campo]);
                this[campo] = 0;
            }
        }
        if (this._climaOuvinte)
            CLIMA.ouvintes.delete(this._climaOuvinte);
        this._climaOuvinte = null;
    }

    // Recalcula o próximo disparo de cada mascote ligado; o temporizador espera o mais próximo. Sem mascote ligado
    // não sobra temporizador.
    _reagendar() {
        this._cancelar();
        this._ligarEventos();
        const ligados = HORARIOS.filter(id => this._ativo(id));
        const comMemoria = this._ativo('chama');
        const comClima = DO_CLIMA.some(id => this._ativo(id));
        if (!ligados.length && !comMemoria && !comClima) {
            this._encerrar();
            return;
        }
        if (comMemoria)
            this._memId = agendar('mascote-memoria', AMOSTRA_MS, () => this._amostrar());
        if (comClima) {
            // confere a cada 5 min e logo que chega uma previsão nova
            this._climaOuvinte = () => this._avaliarClima();
            CLIMA.ouvintes.add(this._climaOuvinte);
            this._climaId = agendar('mascote-clima', AMOSTRA_CLIMA_MS, () => {
                buscarClima(this._settings);
                this._avaliarClima();
                return GLib.SOURCE_CONTINUE;
            });
            buscarClima(this._settings);
            this._avaliarClima();
        }
        this._alvos = [];
        if (!ligados.length)
            return;
        const agora = Date.now();
        this._alvos = ligados.map(id => [id, proximoDisparo(agora, this._settings.get_string(`${IMPL[id].prefixo}-intervalo`))]);
        this._alvo = this._alvos.reduce((a, [, b]) => (b.ms < a.ms ? b : a), this._alvos[0][1]);
        this._dormir();
    }

    _dormir() {
        const ms = esperaAte(Date.now(), this._alvo.ms);
        this._timerId = agendar('mascotes', ms, () => {
            this._timerId = 0;
            this._acordar();
            return GLib.SOURCE_REMOVE;
        });
    }

    _acordar() {
        const alvo = this._alvo;
        const r = avaliarDisparo(Date.now(), alvo.ms);
        if (r === 'esperar') {
            this._dormir();
            return;
        }
        if (r === 'disparar') {
            const juntos = this._alvos.filter(([id, a]) => a.ms === alvo.ms && this._pode(id, a, false));
            // vários na mesma hora: às vezes um só (sorteado), às vezes todos lado a lado
            const grupo = escolherAparicao(juntos.length, Math.random());
            this._iniciar(grupo.map(i => juntos[i]), false);
        } else {
            console.log('[atlas] mascote: disparo perdido (suspensão do computador), descartado');
        }
        this._reagendar();
    }

    // Os mascotes de evento (pilha, satélite, tomate) só escutam enquanto estão ligados, por sinais: sem temporizador
    // em repouso (o da rede só existe nos segundos de confirmação da queda).
    _ligarEventos() {
        if (this._ativo('pilha'))
            this._abrirBateria();
        else
            this._fecharBateria();
        if (this._ativo('satelite') && !this._redeSinal) {
            const m = Gio.NetworkMonitor.get_default();
            this._redeSinal = [m, m.connect('network-changed', () => this._redeMudou(m))];
        } else if (!this._ativo('satelite')) {
            this._fecharRede();
        }
        if (this._ativo('tomate'))
            AO_CONCLUIR_FOCO.add(this._aoFoco);
        else
            AO_CONCLUIR_FOCO.delete(this._aoFoco);
    }

    _desligarEventos() {
        this._fecharBateria();
        this._fecharRede();
        AO_CONCLUIR_FOCO.delete(this._aoFoco);
    }

    // Chama o mascote de evento `id` agora, se ele estiver ligado e puder aparecer.
    _disparar(id) {
        const d = new Date();
        const alvo = {hora: d.getHours(), minuto: d.getMinutes(), ms: d.getTime()};
        return this._pode(id, alvo, false) && this._iniciar([[id, alvo]], false);
    }

    // Passou `esperaMin` desde a última aparição de `id`? (marca o instante ao devolver verdadeiro)
    _livre(id, esperaMin) {
        const agoraMs = Date.now();
        if (agoraMs - (this._ultimoEvento[id] ?? -Infinity) < esperaMin * 60_000)
            return false;
        this._ultimoEvento[id] = agoraMs;
        return true;
    }

    _abrirBateria() {
        if (this._bat)
            return;
        const bat = this._bat = {proxy: null, sig: 0, armado: true, ultimo: -Infinity};
        Gio.DBusProxy.new_for_bus(Gio.BusType.SYSTEM, Gio.DBusProxyFlags.NONE, null,
            'org.freedesktop.UPower', '/org/freedesktop/UPower/devices/DisplayDevice',
            'org.freedesktop.UPower.Device', null, (_o, res) => {
                try {
                    const proxy = Gio.DBusProxy.new_for_bus_finish(res);
                    if (this._bat !== bat)
                        return; // desligado enquanto conectava
                    bat.proxy = proxy;
                    bat.sig = proxy.connect('g-properties-changed', () => this._bateriaMudou());
                    this._bateriaMudou();
                } catch (e) {
                    console.error(`[atlas] UPower indisponível para o mascote da bateria: ${e}`);
                }
            });
    }

    _fecharBateria() {
        if (this._bat?.proxy && this._bat.sig)
            this._bat.proxy.disconnect(this._bat.sig);
        this._bat = null;
    }

    _bateriaMudou() {
        const bat = this._bat;
        const p = bat?.proxy;
        if (!p || !p.get_cached_property('IsPresent')?.unpack())
            return;
        const pct = p.get_cached_property('Percentage')?.unpack() ?? null;
        const estado = p.get_cached_property('State')?.unpack() ?? 0; // 1 carregando, 2 descarregando
        const st = this._settings;
        const limiar = st.get_int('pilha-limiar');
        bat.armado = rearmarBateria(pct, estado, limiar, bat.armado);
        const agoraMs = GLib.get_monotonic_time() / 1000;
        if (bateriaPedeAparicao(pct, estado, limiar, bat.armado, agoraMs, bat.ultimo, st.get_int('pilha-espera') * 60_000) &&
            this._disparar('pilha')) {
            bat.armado = false;
            bat.ultimo = agoraMs;
        }
    }

    _fecharRede() {
        if (this._redeSinal)
            this._redeSinal[0].disconnect(this._redeSinal[1]);
        this._redeSinal = null;
        if (this._redeId) {
            GLib.source_remove(this._redeId);
            this._redeId = 0;
        }
    }

    // A rede caiu? Confirma depois de alguns segundos (oscilações curtas não contam) antes de chamar o satélite.
    _redeMudou(monitor) {
        if (monitor.network_available) {
            if (this._redeId) {
                GLib.source_remove(this._redeId);
                this._redeId = 0;
            }
            return;
        }
        if (this._redeId)
            return;
        this._redeId = agendar('mascote-evento', CONFIRMA_REDE_MS, () => {
            this._redeId = 0;
            if (!monitor.network_available && this._ativo('satelite') && this._livre('satelite', this._settings.get_int('satelite-espera')))
                this._disparar('satelite');
            return GLib.SOURCE_REMOVE;
        });
    }

    // A cada 15 s, só com a chama ligada: lê o uso de memória e chama o mascote quando passa do limiar.
    _amostrar() {
        let uso = null;
        try {
            const [ok, bytes] = GLib.file_get_contents('/proc/meminfo');
            if (ok)
                uso = usoMemoria(new TextDecoder().decode(bytes));
        } catch (e) {
            console.error(`[atlas] não consegui ler /proc/meminfo: ${e}`);
        }
        const st = this._settings;
        const mem = this._mem;
        const limiar = st.get_int('chama-limiar');
        mem.armado = rearmarMemoria(uso, limiar, mem.armado);
        const agora = GLib.get_monotonic_time() / 1000;
        if (memoriaPedeAparicao(uso, limiar, mem.armado, agora, mem.ultimo, st.get_int('chama-espera') * 60_000) &&
            this._pode('chama', null, false) && this._iniciar([['chama', {hora: 0, minuto: 0, ms: Date.now()}]], false)) {
            mem.armado = false;
            mem.ultimo = agora;
        }
        return GLib.SOURCE_CONTINUE;
    }

    // Frio ou calor na previsão (a temperatura de agora, a mesma do widget Clima)? Chama o mascote ligado, respeitando a
    // janela de horas e o tempo de espera de cada um.
    _avaliarClima() {
        const st = this._settings;
        const tipo = mascoteDoClima(CLIMA.dados?.temp ?? null,
            {frio: this._ativo('frio'), calor: this._ativo('calor')},
            {frio: st.get_int('frio-limiar'), calor: st.get_int('calor-limiar')},
            this._climaUltimo,
            {frio: st.get_int('frio-espera') * 60_000, calor: st.get_int('calor-espera') * 60_000},
            Date.now());
        if (!tipo)
            return;
        const d = new Date();
        const alvo = {hora: d.getHours(), minuto: d.getMinutes(), ms: d.getTime()};
        if (this._pode(tipo, alvo, false) && this._iniciar([[tipo, alvo]], false))
            this._climaUltimo[tipo] = Date.now();
    }

    // Botão "Testar agora" das preferências: o valor é "id:marca-de-tempo", que sempre muda. Vários ids com "+"
    // ("fantasma+esqueleto:...") aparecem juntos, lado a lado; "calor=picole:..." força um movimento.
    _teste() {
        const pedidos = this._settings.get_string('mascote-teste').split(':')[0].split('+').map(p => p.split('='));
        const d = new Date();
        const alvo = {hora: d.getHours(), minuto: 0, ms: d.getTime()};
        this._iniciar(pedidos.filter(([id]) => IMPL[id]).map(([id, variante]) => [id, alvo, variante]), true);
    }

    // O mascote `id` pode aparecer neste alvo? `forcar` (teste) ignora ligado, janela de horas, temporada e Não perturbe.
    _pode(id, alvo, forcar) {
        if (forcar)
            return true;
        if (DE_EVENTO.has(IMPL[id].gatilho))
            return this._ativo(id) && !this._ganchos.naoPerturbe();
        if (IMPL[id].gatilho === 'clima') {
            return this._ativo(id) && naJanela(alvo.hora, this._settings.get_int(`${id}-das`), this._settings.get_int(`${id}-ate`)) &&
                !this._ganchos.naoPerturbe();
        }
        const st = this._settings;
        const p = IMPL[id].prefixo;
        return this._ativo(id) && naJanela(alvo.hora, st.get_int(`${p}-das`), st.get_int(`${p}-ate`)) &&
            naData(IMPL[id], alvo.ms) && !this._ganchos.naoPerturbe();
    }

    // Faz aparecer `grupo` ([id, alvo]...), lado a lado e centrado na doca. Doca escondida e Overview sempre pulam.
    _iniciar(grupo, forcar) {
        if (!grupo.length || this._atuais.length)
            return false;
        if (Main.overview.visible)
            return pular(forcar, 'Overview aberto');
        const anc = this._ganchos.doca()?.ancoraMascote();
        if (!anc)
            return pular(forcar, 'doca escondida'); // pula a aparição
        const impls = grupo.map(([id, , variante]) => this._impl(id, variante));
        if (impls.some(impl => impl.sprite && !this._imagem(impl.sprite)))
            return pular(forcar, 'não consegui abrir a folha de sprites');
        const tams = impls.map(impl => impl.tamanho(anc.icone, anc.caixa));
        // quem atravessa a doca (actor da largura dela) não entra na fila lado a lado: passa por cima, sem deslocamento
        const largo = tams.map(t => t.w > anc.caixa.w * 0.6);
        const larguras = tams.map((t, i) => (largo[i] ? 0 : t.w));
        const folga = Math.round(anc.icone * 0.1);
        // o conjunto aparece num ponto qualquer da doca, sorteado a cada aparição
        const base = deslocamentoAleatorio(anc.caixa.w, larguras.reduce((s, w) => s + w, folga * (larguras.length - 1)), Math.random());
        const dxs = deslocamentosLado(larguras, folga).map((d, i) => (largo[i] ? 0 : d + base));
        grupo.forEach(([id, alvo], i) => {
            if (posicionarMascote(anc.caixa, tams[i], anc.topoUtil, dxs[i]))
                this._criar(id, impls[i], alvo, tams[i], dxs[i], anc.icone);
            else
                pular(forcar, 'não cabe acima da doca');
        });
        if (!this._atuais.length)
            return false;
        this._quadroId = agendar('mascote-quadro', QUADRO_MS, () => this._quadro());
        return true;
    }

    // O mascote com movimentos dá o escolhido nas preferências (ou um sorteado); os outros são o próprio IMPL.
    _impl(id, variante) {
        const m = IMPL[id];
        if (!m.variantes)
            return m;
        const nomes = Object.keys(m.variantes);
        return m.variantes[escolherVariante(variante ?? this._settings.get_string(`${id}-movimento`), nomes, Math.random())];
    }

    _criar(id, impl, alvo, tam, dx, icone) {
        const ctx = impl.contexto(this._settings, alvo);
        ctx.base = tam.h - (tam.abaixo ?? 0); // a linha do topo da doca dentro do actor
        ctx.icone = icone;
        ctx.largura = tam.w;
        if (impl.sprite)
            ctx.imagem = this._imagem(impl.sprite);
        // cada aparição escolhe um final entre os do mascote (cai, afunda, espia, some)
        if (impl.finais)
            ctx.saida = impl.finais[Math.floor(Math.random() * impl.finais.length)];
        console.log(`[atlas] mascote ${id} aparece (${tam.w}x${tam.h}, deslocamento ${dx})`);
        const atual = {impl, ctx, tam, dx, olhar: {x: 0, y: 0}, q: impl.quadro(0, ctx), t0: GLib.get_monotonic_time()};
        const actor = atual.actor = new St.DrawingArea({reactive: false, clip_to_allocation: true});
        actor.set_size(tam.w, tam.h);
        actor.connect('repaint', a => {
            const cr = a.get_context();
            const t0 = agora();
            try {
                const [w, h] = a.get_surface_size();
                // esticar e esmagar em torno da borda da doca (base do actor), para quem traz `esmaga` no quadro
                const e = atual.q?.esmaga;
                if (e) {
                    const base = atual.ctx.base ?? h;
                    cr.translate(w / 2, base);
                    cr.scale(e.sx, e.sy);
                    cr.translate(-w / 2, -base);
                }
                // "puf": o final `some` desbota o mascote inteiro
                const alfa = atual.q?.alfa ?? 1;
                if (alfa < 1)
                    cr.pushGroup();
                atual.impl.desenhar(cr, w, h, atual.q, atual.ctx);
                if (alfa < 1) {
                    cr.popGroupToSource();
                    cr.paintWithAlpha(Math.max(0, alfa));
                }
            } catch (e) {
                console.error(`[atlas] erro ao desenhar o mascote: ${e}`);
            } finally {
                cr.$dispose();
                registrar('desenho', t0);
            }
        });
        // fora da tela até o primeiro quadro, que posiciona
        actor.set_position(-tam.w, -tam.h);
        // cliques passam direto para o que está embaixo
        Main.layoutManager.addChrome(actor, {affectsInputRegion: false, affectsStruts: false, trackFullscreen: true});
        this._atuais.push(atual);
    }

    // Um quadro de todos os que estão na tela; cada um sai quando termina, e o temporizador acaba com o último.
    _quadro() {
        const anc = this._ganchos.doca()?.ancoraMascote();
        for (const a of [...this._atuais]) {
            const q = a.impl.quadro((GLib.get_monotonic_time() - a.t0) / 1000, a.ctx);
            const pos = anc && posicionarMascote(anc.caixa, a.tam, anc.topoUtil, a.dx);
            if (!pos) { // a doca sumiu ou mudou de lugar: encerra tudo
                this._encerrar();
                return GLib.SOURCE_REMOVE;
            }
            if (!q) {
                a.actor.destroy();
                this._atuais.splice(this._atuais.indexOf(a), 1);
                continue;
            }
            // os olhos seguem o ponteiro (suavizado quadro a quadro); só existe durante a aparição
            const [px, py] = global.get_pointer();
            const alvoX = Math.max(-1, Math.min(1, (px - (pos.x + a.tam.w / 2)) / 400));
            const alvoY = Math.max(-1, Math.min(1, (py - (pos.y + a.tam.h * 0.4)) / 300));
            a.olhar.x += (alvoX - a.olhar.x) * 0.2;
            a.olhar.y += (alvoY - a.olhar.y) * 0.2;
            a.q = {...q, olhar: a.olhar};
            a.actor.set_position(pos.x, pos.y);
            a.actor.queue_repaint();
        }
        if (!this._atuais.length) {
            this._quadroId = 0;
            return GLib.SOURCE_REMOVE;
        }
        return GLib.SOURCE_CONTINUE;
    }

    _parar() {
        this._quadroId = 0;
        return GLib.SOURCE_REMOVE;
    }

    // Destrói o actor e o temporizador de quadros; entre aparições não sobra nada vivo.
    _encerrar() {
        if (this._quadroId) {
            GLib.source_remove(this._quadroId);
            this._quadroId = 0;
        }
        for (const a of this._atuais ?? [])
            a.actor.destroy();
        this._atuais = [];
    }

    // Religa ou desliga o mascote residente ao trocar de tema ou de chave; o tema atual decide qual (ou nenhum).
    _atualizarResidente() {
        const spec = RESIDENTES[this._settings.get_string('tema')];
        if (!spec || !this._settings.get_boolean('mascote-residente-ativo')) {
            this._pararResidente();
            return;
        }
        if (this._resid?.spec === spec)
            return; // já é esse: não recria o actor
        this._pararResidente();
        this._iniciarResidente(spec);
    }

    _iniciarResidente(spec) {
        const anc = this._ganchos.doca()?.ancoraMascote();
        const tam = spec.tamanho(anc?.icone ?? 48);
        const actor = new St.DrawingArea({reactive: false, clip_to_allocation: true});
        actor.set_size(tam.w, tam.h);
        actor.set_position(-tam.w, -tam.h);
        const [faixaMin, faixaMax] = spec.duracaoMs[spec.estados[0][0]];
        this._resid = {
            spec, tam, actor,
            estado: spec.estados[0][0],
            t0: GLib.get_monotonic_time(),
            trocaEm: faixaMin + Math.random() * (faixaMax - faixaMin),
        };
        actor.connect('repaint', a => {
            const cr = a.get_context();
            const t0 = agora();
            try {
                const [w, h] = a.get_surface_size();
                const t = (GLib.get_monotonic_time() - this._resid.t0) / 1000;
                spec.desenhar(cr, w, h, spec.quadro(t, this._resid.estado));
            } catch (e) {
                console.error(`[atlas] erro ao desenhar o mascote residente: ${e}`);
            } finally {
                cr.$dispose();
                registrar('desenho', t0);
            }
        });
        Main.layoutManager.addChrome(actor, {affectsInputRegion: false, affectsStruts: false, trackFullscreen: true});
        this._residId = agendar('mascote-residente', RESIDENTE_QUADRO_MS, () => this._quadroResidente());
    }

    // A cada quadro: esconde sem gastar desenho se a doca estiver escondida/Overview aberto; senão posiciona,
    // troca de estado quando a janela do estado atual termina (sorteio ponderado) e pede o próximo repaint.
    _quadroResidente() {
        const r = this._resid;
        if (!r)
            return GLib.SOURCE_REMOVE;
        const anc = this._ganchos.doca()?.ancoraMascote();
        if (!anc || Main.overview.visible) {
            r.actor.visible = false;
            return GLib.SOURCE_CONTINUE;
        }
        const dx = Math.round(anc.caixa.w / 2 - r.tam.w / 2 - anc.icone * 0.15);
        const pos = posicionarMascote(anc.caixa, r.tam, anc.topoUtil, dx);
        if (!pos) {
            r.actor.visible = false;
            return GLib.SOURCE_CONTINUE;
        }
        r.actor.visible = true;
        r.actor.set_position(pos.x, pos.y);
        const tEstado = (GLib.get_monotonic_time() - r.t0) / 1000;
        if (tEstado >= r.trocaEm) {
            r.estado = proximoEstadoResidente(r.spec.estados, Math.random());
            r.t0 = GLib.get_monotonic_time();
            const [faixaMin, faixaMax] = r.spec.duracaoMs[r.estado];
            r.trocaEm = faixaMin + Math.random() * (faixaMax - faixaMin);
        }
        r.actor.queue_repaint();
        return GLib.SOURCE_CONTINUE;
    }

    _pararResidente() {
        if (this._residId) {
            GLib.source_remove(this._residId);
            this._residId = 0;
        }
        this._resid?.actor.destroy();
        this._resid = null;
    }

    // Religa ou desliga o efeito de época ao trocar de tema ou de chave; cobre todo o vidro da doca (não a tela).
    _atualizarEfeito() {
        const desenhar = EFEITOS[this._settings.get_string('tema')];
        if (!desenhar || !this._settings.get_boolean('efeito-epoca-ativo')) {
            this._pararEfeito();
            return;
        }
        if (this._efeito?.desenhar === desenhar)
            return; // já é esse: não recria o actor
        this._pararEfeito();
        this._iniciarEfeito(desenhar);
    }

    _iniciarEfeito(desenhar) {
        const actor = new St.DrawingArea({reactive: false, clip_to_allocation: true});
        actor.set_position(-1, -1);
        this._efeito = {desenhar, actor, t0: GLib.get_monotonic_time()};
        actor.connect('repaint', a => {
            const cr = a.get_context();
            const t0 = agora();
            try {
                const [w, h] = a.get_surface_size();
                desenhar(cr, w, h, (GLib.get_monotonic_time() - this._efeito.t0) / 1000);
            } catch (e) {
                console.error(`[atlas] erro ao desenhar o efeito de época: ${e}`);
            } finally {
                cr.$dispose();
                registrar('desenho', t0);
            }
        });
        Main.layoutManager.addChrome(actor, {affectsInputRegion: false, affectsStruts: false, trackFullscreen: true});
        this._efeitoId = agendar('mascote-efeito', RESIDENTE_QUADRO_MS, () => this._quadroEfeito());
    }

    // Cobre exatamente o vidro da doca (ancoraMascote().caixa); some sem gastar desenho se a doca estiver escondida.
    _quadroEfeito() {
        const e = this._efeito;
        if (!e)
            return GLib.SOURCE_REMOVE;
        const anc = this._ganchos.doca()?.ancoraMascote();
        if (!anc || Main.overview.visible) {
            e.actor.visible = false;
            return GLib.SOURCE_CONTINUE;
        }
        e.actor.visible = true;
        e.actor.set_size(anc.caixa.w, anc.caixa.h);
        e.actor.set_position(Math.round(anc.caixa.x), Math.round(anc.caixa.y));
        e.actor.queue_repaint();
        return GLib.SOURCE_CONTINUE;
    }

    _pararEfeito() {
        if (this._efeitoId) {
            GLib.source_remove(this._efeitoId);
            this._efeitoId = 0;
        }
        this._efeito?.actor.destroy();
        this._efeito = null;
    }
}
