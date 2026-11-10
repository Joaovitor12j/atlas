// Registro dos mascotes de aparição (por horário, data ou evento). Cada um mora no próprio arquivo e exporta `personagem`.
import {personagem as cuco, PASSEIOS as PASSEIOS_CUCO} from './cuco.js';
import {personagem as fantasma, PASSEIOS as PASSEIOS_FANTASMA} from './fantasma.js';
import {personagem as esqueleto, PASSEIOS as PASSEIOS_ESQUELETO} from './esqueleto.js';
import {personagem as noel, PASSEIOS as PASSEIOS_NOEL} from './noel.js';
import {personagem as boneco, PASSEIOS as PASSEIOS_BONECO} from './boneco.js';
import {personagem as chama, PASSEIOS as PASSEIOS_CHAMA} from './chama.js';
import {personagem as gato} from './gato.js';
import {personagem as coruja, PASSEIOS as PASSEIOS_CORUJA} from './coruja.js';
import {personagem as pilha, PASSEIOS as PASSEIOS_PILHA} from './pilha.js';
import {personagem as satelite, PASSEIOS as PASSEIOS_SATELITE} from './satelite.js';
import {personagem as tomate, PASSEIOS as PASSEIOS_TOMATE} from './tomate.js';
import {personagem as calor} from './calor.js';
import {personagem as frio} from './frio.js';

export const PERSONAGENS = {cuco, fantasma, esqueleto, noel, boneco, chama, gato, coruja, pilha, satelite, tomate, calor, frio};

// Todas as configurações de passeio (atravessar a doca), por chave `<mascote>-<movimento>`.
export const PASSEIOS = {...PASSEIOS_CUCO, ...PASSEIOS_FANTASMA, ...PASSEIOS_ESQUELETO, ...PASSEIOS_NOEL, ...PASSEIOS_BONECO, ...PASSEIOS_CHAMA, ...PASSEIOS_CORUJA, ...PASSEIOS_PILHA, ...PASSEIOS_SATELITE, ...PASSEIOS_TOMATE};

// Os de horário (sem `gatilho`: cuco, gato, coruja e os sazonais) dividem o temporizador de disparos; os demais
// têm gatilho próprio (memória, bateria, rede, Pomodoro, clima), em gatilhos/.
export const HORARIOS = Object.keys(PERSONAGENS).filter(id => !PERSONAGENS[id].gatilho);
