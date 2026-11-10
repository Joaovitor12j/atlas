// Registro dos mascotes residentes: um por tema de pacote, indexado pelo id do tema.
import {residente as aguaViva} from './agua-viva.js';
import {residente as gaivota} from './gaivota.js';
import {residente as gato} from './gato.js';
import {residente as sapo} from './sapo.js';
import {residente as bonecoIlustrado} from './boneco-ilustrado.js';
import {residente as rena} from './rena.js';
import {residente as papaiNoel} from './papai-noel.js';

export const RESIDENTES = Object.fromEntries([aguaViva, gaivota, gato, sapo, bonecoIlustrado, rena, papaiNoel].map(r => [r.tema, r]));
