/* Página do ATLAS: cenas vivas (hero e prévia do app), mascotes, ambientes e a janela do app desenhada. */
(() => {
  'use strict';

  const reduzir = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  /* ---------- mascotes ---------- */
  // est: [classe, nome, anda?, chão]; ini: estado inicial na galeria; walk: estado na doca
  const MASC = {
    aguaviva: { nome: 'Água-viva', tema: 'Aurora', svg: JV, larg: 100, flutua: true, fala: 'Calma e brilhante. Flutua, nada em pulsos e acende quando está feliz.', cor: ['#4a5fd0', '#2a2f7a', '#14183f'], ini: 1, est: [['idle', 'Flutuando'], ['swim', 'Nadando', 1, 'r3'], ['glow', 'Brilhando'], ['sleep', 'Dormindo']] },
    gaivota: { nome: 'Gaivota', tema: 'Carta', svg: GV, larg: 120, voa: ['fly'], fala: 'Marujo atrapalhado de boné. Anda bicando, voa de ponta a ponta e cochila de pé.', cor: ['#4d6d78', '#2a4048', '#18262c'], ini: 1, est: [['idle', 'Parada'], ['walk', 'Andando', 1, 'r1'], ['fly', 'Voando', 1, 'r3'], ['sleep', 'Dormindo']] },
    gato: { nome: 'Gato', tema: 'Jardim', svg: GATO, larg: 112, fala: 'Curioso e dorminhoco. Anda, corre e dorme enrolado.', cor: ['#46508f', '#262a52', '#171a38'], ini: 1, est: [['idle', 'Parado'], ['walk', 'Andando', 1, 'r1'], ['run', 'Correndo', 1, 'r2'], ['sleep', 'Dormindo']] },
    sapo: { nome: 'Sapo', tema: 'Chuva', svg: SP, larg: 112, fala: 'Tranquilo e chuvoso. Pula de poça em poça, coaxa e dorme debaixo do guarda-chuva.', cor: ['#3a4f8a', '#1f2c55', '#111830'], ini: 1, est: [['idle', 'Parado'], ['hop', 'Pulando', 1, 'r3'], ['croak', 'Coaxando'], ['sleep', 'Dormindo']] },
    boneco: { nome: 'Boneco de neve', tema: 'Noite de neve', svg: BONECO, larg: 100, fala: 'Bonachão, macio e brilhante. Passa saltitando, acena e cochila de gorro torto.', cor: ['#3a6aa8', '#17356c', '#09173a'], ini: 0, est: [['idle', 'Parado'], ['walk', 'Saltitando', 1, 'r1'], ['wave', 'Acenando'], ['sleep', 'Dormindo']] },
    rena: { nome: 'Rena', tema: 'Vitrine', svg: RENA, larg: 124, fala: 'Elegante e festeira. Trota de cachecol, balança o sininho e cochila de pé.', cor: ['#4a5a8a', '#2a3158', '#161a35'], ini: 0, est: [['idle', 'Parada'], ['walk', 'Trotando', 1, 'r1'], ['sino', 'Sininho'], ['sleep', 'Dormindo']] },
    noel: { nome: 'Papai Noel', tema: 'Natal brasileiro', svg: NOEL, larg: 100, fala: 'Veio de bermuda. Acena de óculos escuros, passeia com a prancha, ri alto e tira uma soneca.', cor: ['#ff9a5a', '#c4408a', '#2b1a5c'], ini: 0, est: [['idle', 'Acenando'], ['walk', 'Passeando', 1, 'r2'], ['ho', 'Rindo'], ['sleep', 'Dormindo']] },
  };

  const poeMascote = (pas, host, id, i = 1) => {
    const m = MASC[id], d = m.est[i];
    pas.style.width = m.larg + 'px';
    host.innerHTML = m.svg.replace('%E%', d[0]);
    pas.classList.toggle('parado', !d[2]);
    pas.classList.toggle('ar', !!m.flutua || (m.voa || []).includes(d[0]));
  };

  /* ---------- temas ---------- */
  const TEMAS = [
    { id: 't-aurora', nome: 'Aurora', desc: 'Vidro com cor viva', pacote: 'Materiais', bg: 'linear-gradient(120deg,#1b2a5c,#6a3fa0 55%,#e5708f)', dk: 'rgba(255,255,255,.55)' },
    { id: 't-carta', nome: 'Carta', desc: 'Papel de carta náutica', pacote: 'Materiais', bg: 'linear-gradient(#2f4a52,#1b2a30)', dk: '#f1e7cf' },
    { id: 't-jardim', nome: 'Jardim', desc: 'Luz de fim de tarde', pacote: 'Materiais', bg: 'linear-gradient(#ffd89b,#f7a76c 60%,#c75b6b)', dk: 'rgba(255,244,225,.8)' },
    { id: 't-chuva', nome: 'Chuva', desc: 'Janela à noite', pacote: 'Materiais', bg: 'radial-gradient(40% 70% at 25% 70%,rgba(255,64,160,.5),transparent),radial-gradient(40% 60% at 78% 60%,rgba(0,220,255,.45),transparent),#0a1020', dk: 'rgba(18,28,50,.85)' },
    { id: 't-neve2', nome: 'Noite de neve', desc: 'Gelo e luzinhas', pacote: 'Natal', bg: 'linear-gradient(#09173a,#2d5a9a)', dk: 'rgba(220,238,255,.5)' },
    { id: 't-vitrine', nome: 'Vitrine', desc: 'Embrulhada para presente', pacote: 'Natal', bg: 'radial-gradient(60% 80% at 15% 30%,rgba(255,200,90,.4),transparent),#3a0f18', dk: '#c42034' },
    { id: 't-brasil', nome: 'Natal brasileiro', desc: 'Praia e pisca-pisca', pacote: 'Natal', bg: 'linear-gradient(#2b1a5c,#9e3a8c 45%,#ff7a5a 80%,#ffc36b)', dk: 'rgba(255,236,205,.8)' },
  ];
  const porId = Object.fromEntries(TEMAS.map((t) => [t.id, t]));
  const estado = { tema: 't-aurora', mexeu: false };

  /* ---------- dock real: ícones, widgets, seletor de ambiente, lente, dicas e prévia ---------- */
  const APPS = {
    arq: { nome: 'Arquivos', c1: '#4facfe', c2: '#0066ff', c: '#1f5fae', n: '#9fd4ff' },
    term: { nome: 'Terminal', c1: '#6b7386', c2: '#2b2f3a', c: '#2b2f3a', n: '#8affb4' },
    calc: { nome: 'Calculadora', c1: '#ffb347', c2: '#ff6a3d', c: '#c0392b', n: '#ffcf5c' },
    ed: { nome: 'Editor de texto', c1: '#8e5cff', c2: '#4a2fd8', c: '#8e44ad', n: '#a6ff6a' },
    mus: { nome: 'Música', c1: '#ff7ab6', c2: '#e03a8f', c: '#c0392b', n: '#ff6ad5' },
    cal: { nome: 'Calendário', c1: '#ff7a6b', c2: '#e03a3a', c: '#1e8449', n: '#ffe27a' },
    nav: { nome: 'Firefox', c1: '#43e97b', c2: '#0bb5a5', c: '#16a085', n: '#ffc0e8' },
    brave: { nome: 'Brave', c1: '#ff9a62', c2: '#e5483a', c: '#16a085', n: '#9fd4ff' },
  };
  // ordem da doca real: seletor, apps do ambiente (aberto a cada 3º), widgets do ambiente, botão de apps
  const AMBH = [
    { nome: 'Trabalho', letra: 'T', cor: '#E8A33D', apps: ['arq', 'term', 'calc', 'nav', 'brave'], widgets: ['relogio', 'musica', 'atividade'] },
    { nome: 'Estudo', letra: 'E', cor: '#3FB8A8', apps: ['cal', 'ed', 'calc', 'nav'], widgets: ['relogio', 'progresso'] },
    { nome: 'Lazer', letra: 'L', cor: '#6C8CF5', apps: ['mus', 'nav', 'brave', 'arq'], widgets: ['relogio', 'musica', 'clima'] },
  ];
  const NOME_W = { relogio: 'Relógio', musica: 'Música', atividade: 'Atividade', progresso: 'Progresso do tempo', clima: 'Clima' };
  const estadoDock = { amb: 0, lente: 1.5 };

  const tileHTML = (id, ativo) => {
    const a = APPS[id];
    return `<div class="tile${ativo ? ' ativo' : ''}" role="button" tabindex="0" data-app="${id}" aria-label="${a.nome}" style="--c1:${a.c1};--c2:${a.c2};--c:${a.c};--n:${a.n}"><img class="ic" src="img/apps/${id}.png" alt="" width="128" height="128"><span class="etq"></span></div>`;
  };
  const anel = (r, p, cls = '') => `<circle cx="50" cy="50" r="${r}" class="f"/><circle cx="50" cy="50" r="${r}" class="a ${cls}" style="--p:${p};--r:${r}"/>`;
  const widgetHTML = (id) => {
    if (id === 'relogio') return `<div class="w s-w1" data-w="${id}" aria-label="Relógio"><svg viewBox="0 0 40 40" class="s-rel" aria-hidden="true"><circle cx="20" cy="20" r="17" fill="none" stroke="currentColor" stroke-width="2"/><line class="hh" x1="20" y1="20" x2="20" y2="11" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/><line class="mm" x1="20" y1="20" x2="20" y2="7" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><line class="ss" x1="20" y1="22" x2="20" y2="6.5" stroke="#ff6b4a" stroke-width="1.2" stroke-linecap="round"/><circle cx="20" cy="20" r="1.8" fill="currentColor"/></svg></div>`;
    if (id === 'atividade') return `<div class="w s-w1" data-w="${id}" aria-label="Atividade"><svg viewBox="0 0 100 100" class="s-an" aria-hidden="true">${anel(42, 45, 'amb1')}${anel(30, 70, 'amb2')}<text x="50" y="56" text-anchor="middle">45%</text></svg></div>`;
    if (id === 'progresso') return `<div class="w s-w1" data-w="${id}" aria-label="Progresso do tempo"><svg viewBox="0 0 100 100" class="s-an fino" aria-hidden="true">${anel(44, 62)}${anel(36, 40)}${anel(28, 78)}${anel(20, 25)}<text x="50" y="56" text-anchor="middle">62%</text></svg></div>`;
    if (id === 'clima') return `<div class="w s-w1" data-w="${id}" aria-label="Clima"><div class="s-clima-t"><svg viewBox="0 0 24 24" aria-hidden="true"><use href="#i-sol"/></svg><b>24°</b></div></div>`;
    return `<div class="w s-mus" data-w="musica" aria-label="Música"><span class="s-capa-m" aria-hidden="true"></span><div class="s-mus-txt"><b>Nada tocando</b><i class="s-mus-barra"><u></u></i></div><div class="s-mus-ctl" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M7 6v12M18 6l-8 6 8 6z"/></svg><svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg><svg viewBox="0 0 24 24"><path d="M17 6v12M6 6l8 6-8 6z"/></svg></div></div>`;
  };
  const dockHTML = () => {
    const a = AMBH[estadoDock.amb];
    return `<div class="s-sel" role="button" tabindex="0" aria-label="Ambiente ${a.nome}. Clique para trocar" style="--amb:${a.cor}"><span>${a.letra}</span></div>`
      + `<div class="sep"></div>`
      + a.apps.map((id, i) => tileHTML(id, i % 3 === 0)).join('')
      + `<div class="sep"></div>`
      + a.widgets.map(widgetHTML).join('')
      + `<div class="sep"></div>`
      + `<div class="tile s-grade" role="button" tabindex="0" aria-label="Mostrar aplicativos"><svg viewBox="0 0 40 40" aria-hidden="true"><g fill="currentColor">${[0, 1, 2].map((i) => [0, 1, 2].map((k) => `<rect x="${9 + i * 8}" y="${9 + k * 8}" width="5" height="5" rx="1.5"/>`).join('')).join('')}</g></svg></div>`;
  };

  const ligarDock = (cena) => {
    const dw = $(':scope > .dockw', cena), dock = $('.dock', dw);
    if (!dw) return;
    // troca só o miolo; os efeitos (.fx, laço, passeio) ficam como o tema define
    $$(':scope > .tile, :scope > .s-sel, :scope > .sep, :scope > .sp, :scope > .w', dock).forEach((n) => n.remove());
    dock.insertAdjacentHTML('beforeend', dockHTML());
    $$(':scope > .s-dica, :scope > .s-aviso, :scope > .s-prev', dw).forEach((n) => n.remove());
    const dica = document.createElement('div'); dica.className = 's-dica'; dica.setAttribute('role', 'tooltip'); dica.hidden = true;
    const aviso = document.createElement('div'); aviso.className = 's-aviso'; aviso.setAttribute('aria-live', 'polite');
    const prev = document.createElement('div'); prev.className = 's-prev'; prev.hidden = true;
    dw.append(dica, aviso, prev);
    const itens = () => $$(':scope > .tile, :scope > .s-sel, :scope > .w', dock);
    const nomeDe = (el) => el.classList.contains('s-sel') ? AMBH[estadoDock.amb].nome : el.getAttribute('aria-label');
    const xDe = (el) => { const r = el.getBoundingClientRect(), b = dw.getBoundingClientRect(); return r.left - b.left + r.width / 2; };

    const irAmb = (i) => sincronizaDocks((i + AMBH.length) % AMBH.length);
    // ambiente
    const sel = $('.s-sel', dock);
    sel.addEventListener('click', () => irAmb(estadoDock.amb + 1));
    sel.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); irAmb(estadoDock.amb + 1); } });
    if (!dw._roda) {
      dw._roda = true;
      let rolo = 0;
      dw.addEventListener('wheel', (e) => {
        if (Math.abs(e.deltaY) < 4) return;
        e.preventDefault();
        const t = Date.now(); if (t - rolo < 280) return; rolo = t;
        irAmb(estadoDock.amb + (e.deltaY > 0 ? 1 : -1));
      }, { passive: false });
    }
    const a = AMBH[estadoDock.amb];
    if (cena._avisar) { aviso.textContent = a.nome; aviso.style.setProperty('--amb', a.cor); aviso.classList.add('mostra'); setTimeout(() => aviso.classList.remove('mostra'), 1500); }

    // lente
    const lente = (e) => {
      if (reduzir) return;
      itens().forEach((t) => {
        const r = t.getBoundingClientRect();
        const k = Math.max(0, 1 - Math.abs(e.clientX - (r.left + r.width / 2)) / 130);
        const s = 1 + (estadoDock.lente - 1) * k * k;
        t.style.transform = s > 1.005 ? `translateY(${-(s - 1) * 14}px) scale(${s})` : '';
      });
    };
    dock.onmousemove = lente;
    dock.onmouseleave = () => { itens().forEach((t) => { t.style.transform = ''; }); dica.hidden = true; };

    // dicas e prévia de janela
    let tp, fecha;
    const esconderPrev = () => { prev.hidden = true; };
    itens().forEach((t) => {
      t.addEventListener('mouseenter', () => {
        clearTimeout(fecha);
        dica.textContent = nomeDe(t); dica.hidden = false; dica.style.left = xDe(t) + 'px';
        clearTimeout(tp);
        if (t.classList.contains('ativo') && t.dataset.app) tp = setTimeout(() => abrirPrev(t), 380);
        else esconderPrev();
      });
      t.addEventListener('mouseleave', () => { clearTimeout(tp); fecha = setTimeout(esconderPrev, 220); });
      const acionar = () => {
        t.classList.remove('salta'); void t.offsetWidth; t.classList.add('salta');
        if (t.classList.contains('s-sel') || t.classList.contains('s-grade')) return;
        t.classList.toggle('ativo'); if (!t.classList.contains('ativo')) esconderPrev();
      };
      if (!t.classList.contains('s-sel')) {
        t.addEventListener('click', acionar);
        t.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); acionar(); } });
      }
    });
    const abrirPrev = (t) => {
      const ap = APPS[t.dataset.app];
      prev.innerHTML = `<div class="s-prev-top"><img src="img/apps/${t.dataset.app}.png" alt="" width="18" height="18"><b>${ap.nome}</b><button type="button" aria-label="Fechar ${ap.nome}">×</button></div><div class="s-prev-corpo"><span></span><span></span><span></span></div>`;
      prev.style.left = xDe(t) + 'px'; prev.hidden = false;
      $('button', prev).addEventListener('click', () => { t.classList.remove('ativo'); esconderPrev(); });
    };
    prev.addEventListener('mouseenter', () => clearTimeout(fecha));
    prev.addEventListener('mouseleave', () => { fecha = setTimeout(esconderPrev, 220); });

  };

  const sincronizaDocks = (i, avisar = true) => {
    estadoDock.amb = i;
    [cenaHero, cenaApp].forEach((c) => { c._avisar = avisar; ligarDock(c); });
    girarRelogios();
  };
  // ponteiros do relógio acompanham a hora de verdade
  const girarRelogios = () => {
    const d = new Date(), s = d.getSeconds(), m = d.getMinutes() + s / 60, h = (d.getHours() % 12) + m / 60;
    $$('.s-rel').forEach((r) => {
      $('.hh', r).setAttribute('transform', `rotate(${h * 30} 20 20)`);
      $('.mm', r).setAttribute('transform', `rotate(${m * 6} 20 20)`);
      $('.ss', r).setAttribute('transform', `rotate(${s * 6} 20 20)`);
    });
  };
  setInterval(() => { if (!document.hidden) girarRelogios(); }, 1000);

  // monta a cena (doca, efeitos, mascote) dentro de `cena`, trocando só o que o tema define
  const montar = (cena, id, mascoteForcado) => {
    const def = CENAS[id];
    const tmp = document.createElement('div');
    tmp.innerHTML = def.html;
    const fonte = tmp.firstElementChild;
    $$(':scope > .dockw, :scope > .neveCena', cena).forEach((n) => n.remove());
    const ref = $(':scope > .s-seletor', cena);
    [...fonte.children].forEach((n) => cena.insertBefore(n, ref));
    cena._avisar = false;
    ligarDock(cena);
    girarRelogios();
    poeMascote($('.passeio', cena), $('.passeio .host', cena), mascoteForcado || def.m);
  };

  const hero = $('#inicio');
  const cenaHero = $('#cena-hero');
  const palco = $('#palco');
  const cenaApp = $('#cena-app');

  const aplicarTema = (id, { fade = true } = {}) => {
    estado.tema = id;
    hero.className = 's-hero ' + id;
    palco.className = 's-palco ' + id + (palco.classList.contains('sem-efeitos') ? ' sem-efeitos' : '');
    montar(cenaHero, id);
    montar(cenaApp, id);
    if (fade && !reduzir) {
      cenaHero.classList.remove('entra');
      void cenaHero.offsetWidth;
      cenaHero.classList.add('entra');
    }
    $$('#seletor-hero button').forEach((b) => b.setAttribute('aria-checked', String(b.dataset.tema === id)));
    $$('.s-tema').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.tema === id)));
    ajustaJanela();
  };

  // seletor do hero
  const seletor = $('#seletor-hero');
  TEMAS.forEach((t) => {
    const b = document.createElement('button');
    b.type = 'button'; b.setAttribute('role', 'radio'); b.dataset.tema = t.id; b.textContent = t.nome;
    b.addEventListener('click', () => { estado.mexeu = true; aplicarTema(t.id); });
    seletor.appendChild(b);
  });

  // chips da seção Temas: trocam a cena e levam ao topo
  $$('.s-temas button[data-tema]').forEach((b) => b.addEventListener('click', () => {
    estado.mexeu = true;
    aplicarTema(b.dataset.tema);
    hero.scrollIntoView({ behavior: reduzir ? 'auto' : 'smooth' });
  }));

  // troca sozinha enquanto a pessoa não mexer
  if (!reduzir) {
    let visivel = true;
    new IntersectionObserver(([e]) => { visivel = e.isIntersecting; }, { threshold: 0.3 }).observe(hero);
    setInterval(() => {
      if (estado.mexeu || !visivel || document.hidden) return;
      const i = TEMAS.findIndex((t) => t.id === estado.tema);
      aplicarTema(TEMAS[(i + 1) % TEMAS.length].id);
    }, 8000);
  }

  /* ---------- galeria de mascotes ---------- */
  const grade = $('#grade-masc');
  Object.entries(MASC).forEach(([id, m]) => {
    const art = document.createElement('article');
    art.className = 's-masc';
    art.innerHTML = `<div class="palcoM" style="--p1:${m.cor[0]};--p2:${m.cor[1]};--p3:${m.cor[2]}"><div class="chao"></div><div class="base"></div><div class="host" style="position:relative;z-index:2;display:flex"></div></div>
      <h3>${m.nome}<small>tema ${m.tema}</small></h3><p>${m.fala}</p><div class="s-estados" role="group" aria-label="O que ${m.nome} está fazendo"></div>`;
    grade.appendChild(art);
    const host = $('.host', art), chao = $('.chao', art), linha = $('.s-estados', art);
    const set = (i) => {
      const d = m.est[i];
      host.innerHTML = m.svg.replace('%E%', d[0]);
      chao.className = 'chao ' + (d[3] || '');
      $$('button', linha).forEach((b, j) => b.setAttribute('aria-pressed', String(j === i)));
    };
    m.est.forEach((d, i) => {
      const b = document.createElement('button');
      b.type = 'button'; b.textContent = d[1];
      b.addEventListener('click', () => set(i));
      linha.appendChild(b);
    });
    set(m.ini);
  });

  /* ---------- ambientes ---------- */
  const AMBS = [
    { nome: 'Trabalho', cor: '#E8A33D', apps: ['arq', 'term', 'calc', 'nav', 'brave'] },
    { nome: 'Estudo', cor: '#3FB8A8', apps: ['cal', 'ed', 'calc', 'nav'] },
    { nome: 'Lazer', cor: '#6C8CF5', apps: ['mus', 'nav', 'brave', 'arq'] },
  ];
  const amb = { i: 0 };
  const ambDock = $('#amb-dock'), ambAviso = $('#amb-aviso'), ambBtn = $('#amb-botoes'), ambRaiz = $('#amb');
  AMBS.forEach((a, i) => {
    const b = document.createElement('button');
    b.type = 'button'; b.setAttribute('role', 'radio'); b.textContent = a.nome;
    b.addEventListener('click', () => irAmb(i));
    ambBtn.appendChild(b);
  });
  let ambTempo;
  const irAmb = (i, avisar = true) => {
    amb.i = (i + AMBS.length) % AMBS.length;
    const a = AMBS[amb.i];
    ambRaiz.style.setProperty('--cor', a.cor);
    ambDock.style.setProperty('--cor', a.cor);
    ambDock.innerHTML = a.apps.map((id) => `<div class="at"><img src="img/apps/${id}.png" alt="" width="128" height="128"></div>`).join('');
    $$('button', ambBtn).forEach((b, j) => { b.setAttribute('aria-checked', String(j === amb.i)); b.style.setProperty('--cor', a.cor); });
    if (avisar) {
      ambAviso.textContent = a.nome;
      ambAviso.style.setProperty('--cor', a.cor);
      ambAviso.style.opacity = '1';
      clearTimeout(ambTempo);
      ambTempo = setTimeout(() => { ambAviso.style.opacity = '0'; }, 1400);
    } else ambAviso.style.opacity = '0';
  };
  ambRaiz.style.setProperty('--cor', AMBS[0].cor);
  ambAviso.style.transition = 'opacity .3s, background .35s';
  let rolo = 0;
  ambRaiz.addEventListener('wheel', (e) => {
    e.preventDefault();
    const agora = Date.now();
    if (agora - rolo < 260) return;
    rolo = agora;
    irAmb(amb.i + (e.deltaY > 0 ? 1 : -1));
  }, { passive: false });
  ambRaiz.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); irAmb(amb.i + 1); }
    if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); irAmb(amb.i - 1); }
  });
  irAmb(0, false);

  /* ---------- janela do app ---------- */
  const janela = $('#janela'), caixa = $('#janela-caixa');
  function ajustaJanela() {
    const s = Math.min(1, caixa.clientWidth / 1120);
    janela.style.transform = `scale(${s})`;
    caixa.style.height = Math.ceil(janela.offsetHeight * s) + 'px';
  }
  new ResizeObserver(ajustaJanela).observe(caixa);

  // abas
  const abas = $$('.s-abas [role="tab"]');
  const irAba = (a) => {
    abas.forEach((b) => {
      const on = b === a;
      b.setAttribute('aria-selected', String(on));
      b.tabIndex = on ? 0 : -1;
      $('#' + b.getAttribute('aria-controls')).hidden = !on;
    });
    ajustaJanela();
  };
  abas.forEach((b, i) => {
    b.addEventListener('click', () => irAba(b));
    b.addEventListener('keydown', (e) => {
      let j = -1;
      if (e.key === 'ArrowRight') j = (i + 1) % abas.length;
      if (e.key === 'ArrowLeft') j = (i - 1 + abas.length) % abas.length;
      if (j < 0) return;
      e.preventDefault(); irAba(abas[j]); abas[j].focus();
    });
  });

  // seletor visual de tema, por pacote
  const appTemas = $('#app-temas');
  ['Materiais', 'Natal'].forEach((pac) => {
    const t = document.createElement('div');
    t.innerHTML = `<div class="s-pacote-nome">${pac.toUpperCase()}</div><div class="s-tgrade"></div>`;
    const g = $('.s-tgrade', t);
    TEMAS.filter((x) => x.pacote === pac).forEach((x) => {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 's-tema'; b.dataset.tema = x.id; b.setAttribute('aria-pressed', 'false');
      b.innerHTML = `<span class="mini" style="--bg:${x.bg};--dk:${x.dk}"></span><b>${x.nome}<em>novo</em></b><span class="d">${x.desc}</span>`;
      b.addEventListener('click', () => { estado.mexeu = true; aplicarTema(x.id, { fade: false }); });
      g.appendChild(b);
    });
    appTemas.appendChild(t);
  });
  $('.s-pacote-nome', appTemas).style.marginTop = '0';

  // posição
  const seg = $('#seg-pos'), mini = $('.s-minitela');
  $$('button', seg).forEach((b) => b.addEventListener('click', () => {
    $$('button', seg).forEach((x) => x.setAttribute('aria-checked', String(x === b)));
    mini.className = 's-minitela ' + b.dataset.pos;
  }));

  // sliders
  const sl = (id, fmt, aplicar) => {
    const r = $('#' + id), o = $('#out-' + id.slice(3));
    const f = () => {
      r.style.setProperty('--f', ((r.value - r.min) / (r.max - r.min)) * 100 + '%');
      o.textContent = fmt(+r.value);
      aplicar(+r.value);
    };
    r.addEventListener('input', f); f();
    return { r, f };
  };
  const margem = sl('rg-margem', (v) => v + ' px', (v) => { cenaApp.style.paddingBottom = (12 + v) + 'px'; });
  const tam = sl('rg-tam', (v) => v + '%', (v) => { palco.style.setProperty('--esc', v / 100); });
  const lente = sl('rg-lente', (v) => (v / 100).toFixed(2).replace('.', ','), (v) => { estadoDock.lente = v / 100; });
  palco.style.setProperty('--esc', 1);

  // interruptores
  const trocaSw = (b) => b.addEventListener('click', () => b.setAttribute('aria-checked', String(b.getAttribute('aria-checked') !== 'true')));
  $$('.s-sw').forEach(trocaSw);
  $('#sw-resid').addEventListener('click', () => {
    const on = $('#sw-resid').getAttribute('aria-checked') === 'true';
    const p = $('.passeio', cenaApp); if (p) p.style.display = on ? '' : 'none';
  });
  $('#sw-efeito').addEventListener('click', () => {
    palco.classList.toggle('sem-efeitos', $('#sw-efeito').getAttribute('aria-checked') !== 'true');
  });

  // cartões de widgets
  const WIDGETS = [
    ['Relógio', 'De ponteiros ou digital', 'i-timer', true, true], ['Pomodoro', 'Foco e pausas', 'i-timer', false, false],
    ['Bateria', 'Carga e tempo restante', 'i-bat', false, false], ['Música', 'Capa e controles', 'i-musica', true, true],
    ['Progresso do tempo', 'Dia, semana, mês, ano', 'i-graf', false, false], ['Cronômetro', 'Conta com voltas', 'i-timer', false, false],
    ['Timer', 'Contagem regressiva', 'i-timer', false, false], ['Atividade', 'CPU e memória', 'i-graf', true, true],
    ['Rede', 'Download e upload', 'i-rede', false, true], ['Contagem regressiva', 'Dias até uma data', 'i-cal', false, false],
    ['Área de transferência', 'Histórico e fixados', 'i-prancheta', false, false], ['Slack', 'Selo de não lidas', 'i-slack', false, false],
    ['Clima', 'Tempo agora e previsão', 'i-sol', true, true], ['Nota', 'Um recado fixo', 'i-nota', false, false],
  ];
  const wc = $('#wcartoes');
  WIDGETS.forEach(([nome, desc, ic, on, larga]) => {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 's-wc'; b.setAttribute('aria-pressed', String(on));
    b.innerHTML = `<svg viewBox="0 0 24 24"><use href="#${ic}"/></svg><b>${nome}</b><span>${desc}</span><small>${on ? 'Na doca' : larga ? 'Tem versão larga' : '&nbsp;'}</small>`;
    b.addEventListener('click', () => {
      const v = b.getAttribute('aria-pressed') !== 'true';
      b.setAttribute('aria-pressed', String(v));
      $('small', b).innerHTML = v ? 'Na doca' : larga ? 'Tem versão larga' : '&nbsp;';
    });
    wc.appendChild(b);
  });
  $$('.s-wlinha .s-pill').forEach((p, _, todos) => p.addEventListener('click', () => todos.forEach((x) => x.setAttribute('aria-checked', String(x === p)))));

  // lista de mascotes + Testar
  const ML = [['noel', 'Papai Noel', 'De 1 a 25 de dezembro, sobe da doca, acena e ri com a barriga'], ['boneco', 'Boneco de neve', 'De 1 a 25 de dezembro, sobe da doca e balança ao vento'], ['gato', 'Gato', 'Atravessa a doca caminhando']];
  const mlista = $('#mlista');
  let testeTempo;
  ML.forEach(([id, nome, desc]) => {
    const m = MASC[id];
    const d = document.createElement('div');
    d.className = 's-mc';
    d.innerHTML = `<span class="mm" style="--p1:${m.cor[0]};--p2:${m.cor[1]}">${m.svg.replace('%E%', 'idle')}</span><div><b>${nome}</b><span>${desc}</span></div><button type="button" class="s-testar">Testar</button><button type="button" class="s-sw" role="switch" aria-checked="${id !== 'gato'}" aria-label="Ligar ${nome}"></button>`;
    mlista.appendChild(d);
    trocaSw($('.s-sw', d));
    $('.s-testar', d).addEventListener('click', () => {
      const p = $('.passeio', cenaApp); if (!p) return;
      p.style.display = '';
      poeMascote(p, $('.host', p), id, 1);
      clearTimeout(testeTempo);
      testeTempo = setTimeout(() => poeMascote(p, $('.host', p), CENAS[estado.tema].m), 7000);
      palco.scrollIntoView({ block: 'nearest', behavior: reduzir ? 'auto' : 'smooth' });
    });
  });
  const mais = document.createElement('p');
  mais.className = 's-csub'; mais.style.gridColumn = '1 / -1'; mais.style.marginTop = '6px';
  mais.textContent = 'Há mais dez: Cuco, Coruja, Calor, Frio, Chama, Pilha cansada, Satélite perdido, Tomate, Fantasma e Esqueleto.';
  mlista.appendChild(mais);

  // restaurar
  $('#restaurar').addEventListener('click', () => {
    [['rg-margem', 8], ['rg-tam', 100], ['rg-lente', 150]].forEach(([id, v]) => { const r = $('#' + id); r.value = v; r.dispatchEvent(new Event('input')); });
    $$('button', seg).forEach((x) => x.setAttribute('aria-checked', String(x.dataset.pos === 'b')));
    mini.className = 's-minitela b';
    aplicarTema('t-aurora', { fade: false });
  });

  const qs = new URLSearchParams(location.search);
  if (qs.get('tema') && porId['t-' + qs.get('tema')]) estado.mexeu = true;
  aplicarTema(qs.get('tema') && porId['t-' + qs.get('tema')] ? 't-' + qs.get('tema') : 't-aurora', { fade: false });
  if (qs.get('aba')) irAba($('#aba-' + qs.get('aba')) || abas[0]);
  ajustaJanela();
  window.addEventListener('load', ajustaJanela);
  if (document.fonts) document.fonts.ready.then(ajustaJanela);
})();
