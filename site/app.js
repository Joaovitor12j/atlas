(() => {
  'use strict';

  const reduzir = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Vídeos: tocam só enquanto estão na tela. Com movimento reduzido, ficam no pôster.
  const videos = document.querySelectorAll('video.demo');
  if (!reduzir && 'IntersectionObserver' in window) {
    const olho = new IntersectionObserver((itens) => {
      for (const i of itens) {
        if (i.isIntersecting) i.target.play().catch(() => {});
        else i.target.pause();
      }
    }, { threshold: 0.35 });
    videos.forEach((v) => olho.observe(v));
  }

  // Visores: lista de abas à esquerda, captura à direita. Setas movem a seleção.
  document.querySelectorAll('[data-visor]').forEach((visor) => {
    const abas = [...visor.querySelectorAll('[role="tab"]')];
    const img = visor.querySelector('.visor-tela img');

    const escolher = (aba) => {
      abas.forEach((b) => {
        b.setAttribute('aria-selected', String(b === aba));
        b.tabIndex = b === aba ? 0 : -1;
      });
      img.src = aba.dataset.img;
      img.width = Number(aba.dataset.w);
      img.height = Number(aba.dataset.h);
      img.alt = aba.dataset.alt;
    };

    abas.forEach((b, i) => {
      b.tabIndex = i === 0 ? 0 : -1;
      b.addEventListener('click', () => escolher(b));
      b.addEventListener('keydown', (e) => {
        const n = abas.length;
        const atual = abas.indexOf(b);
        let alvo = -1;
        if (e.key === 'ArrowDown' || e.key === 'ArrowRight') alvo = (atual + 1) % n;
        if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') alvo = (atual - 1 + n) % n;
        if (e.key === 'Home') alvo = 0;
        if (e.key === 'End') alvo = n - 1;
        if (alvo < 0) return;
        e.preventDefault();
        escolher(abas[alvo]);
        abas[alvo].focus();
      });
    });
  });

  // Dock de demonstração: lente, troca de ambiente pela roda ou pelos botões e seis temas.
  const dock = document.getElementById('dock');
  if (dock) {
    const palco = document.getElementById('palco');
    const trilho = document.getElementById('trilho');
    const dica = document.getElementById('dica');
    const aviso = document.getElementById('aviso');
    const gAmb = document.getElementById('g-ambiente');
    const gTema = document.getElementById('g-tema');
    const como = document.getElementById('como');

    const AMBIENTES = [
      { nome: 'Trabalho', cor: '#E8A33D', apps: [['Arquivos', 'Nautilus', 1], ['Terminal', 'Terminal', 1], ['Editor de texto', 'TextEditor', 0], ['Calculadora', 'Calculator', 0], ['Configurações', 'Settings', 0]] },
      { nome: 'Estudo', cor: '#3FB8A8', apps: [['Leitor de documentos', 'Evince', 1], ['Editor de texto', 'TextEditor', 1], ['Calendário', 'Calendar', 0], ['Relógios', 'clocks', 0], ['Mapa de caracteres', 'Characters', 0]] },
      { nome: 'Lazer', cor: '#6C8CF5', apps: [['Música', 'Rhythmbox3', 1], ['Vídeos', 'Totem', 0], ['Imagens', 'eog', 0], ['Programas', 'Software', 0], ['Arquivos', 'Nautilus', 0]] }
    ];
    const TEMAS = ['Noite', 'Papel', 'Cristal', 'Neon', 'Halloween', 'Natal'];

    let ambiente = 0;
    let itens = [], repouso = [], largura0 = 0, gap = 10;
    const centros = [], escalas = [];
    const MAX = 1.7, SIG = 76;

    const botao = (nome, classe) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = classe;
      b.dataset.nome = nome;
      b.setAttribute('aria-label', nome);
      return b;
    };
    const separador = () => {
      const s = document.createElement('span');
      s.className = 'sep';
      s.setAttribute('aria-hidden', 'true');
      return s;
    };

    function tileRelogio() {
      const b = botao('Relógio', 'it tile');
      b.innerHTML = '<svg viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="24" r="20" class="aro"/><line class="ponteiro" id="p-h" x1="24" y1="24" x2="24" y2="13"/><line class="ponteiro" id="p-m" x1="24" y1="24" x2="24" y2="8"/><circle cx="24" cy="24" r="2" fill="currentColor"/></svg>';
      return b;
    }
    function tileAtividade() {
      const b = botao('Atividade', 'it tile');
      b.innerHTML = '<svg viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="24" r="17" class="aro"/><circle cx="24" cy="24" r="17" class="arco" id="arco" transform="rotate(-90 24 24)" stroke-dasharray="106.8" stroke-dashoffset="70"/><text x="24" y="29" class="num" id="num">34</text></svg>';
      return b;
    }

    function montar(anunciar) {
      const a = AMBIENTES[ambiente];
      palco.style.setProperty('--cor', a.cor);
      trilho.textContent = '';
      dica.hidden = true;

      const sel = botao(`Ambiente ${a.nome}. Ativar para ir ao próximo`, 'it seletor');
      sel.dataset.nome = `Ambiente ${a.nome}`;
      sel.textContent = a.nome[0];
      sel.addEventListener('click', () => ir((ambiente + 1) % AMBIENTES.length));
      trilho.append(sel, separador());

      a.apps.forEach(([nome, icone, aberto]) => {
        const b = botao(nome, 'it' + (aberto ? ' aberto' : ''));
        const i = document.createElement('img');
        i.src = `img/apps/${icone}.png`;
        i.alt = '';
        i.width = 128;
        i.height = 128;
        b.append(i);
        trilho.append(b);
      });
      trilho.append(separador(), tileRelogio(), tileAtividade());

      medir();
      relogio();
      atividade();
      if (anunciar) {
        aviso.textContent = a.nome;
        aviso.classList.add('mostra');
        clearTimeout(montar.t);
        montar.t = setTimeout(() => aviso.classList.remove('mostra'), 1300);
      }
    }

    function medir() {
      itens = [...trilho.children].filter((el) => el.offsetWidth);
      dock.style.setProperty('--extra', '0px');
      itens.forEach((el) => { el.style.transform = ''; });
      gap = parseFloat(getComputedStyle(trilho).columnGap) || 10;
      repouso = itens.map((el) => ({ c: el.offsetLeft + el.offsetWidth / 2, w: el.offsetWidth, sep: el.classList.contains('sep') }));
      largura0 = trilho.offsetWidth;
    }

    function lente(x) {
      const s = repouso.map((r) => (r.sep ? 1 : 1 + (MAX - 1) * Math.exp(-(((r.c - x) / SIG) ** 2))));
      const nw = repouso.map((r, i) => r.w * s[i]);
      const total = nw.reduce((t, w) => t + w, 0) + gap * (repouso.length - 1);
      const extra = total - largura0;
      let esq = repouso[0].c - repouso[0].w / 2 - extra / 2;
      itens.forEach((el, i) => {
        const centro = esq + nw[i] / 2;
        centros[i] = centro;
        escalas[i] = s[i];
        el.style.transform = `translateX(${(centro - repouso[i].c).toFixed(1)}px) scale(${s[i].toFixed(3)})`;
        esq += nw[i] + gap;
      });
      dock.style.setProperty('--extra', `${extra.toFixed(1)}px`);
    }

    function repousar() {
      itens.forEach((el) => { el.style.transform = ''; });
      dock.style.setProperty('--extra', '0px');
      dica.hidden = true;
    }

    dock.addEventListener('pointermove', (e) => {
      const tr = trilho.getBoundingClientRect();
      lente(e.clientX - tr.left);
      const alvo = e.target.closest('.it');
      if (alvo && alvo.dataset.nome) {
        const i = itens.indexOf(alvo);
        const ra = dock.parentElement.getBoundingClientRect();
        dica.textContent = alvo.dataset.nome;
        dica.style.left = `${tr.left + centros[i] - ra.left}px`;
        dica.style.bottom = `${ra.bottom - tr.bottom + alvo.offsetHeight * escalas[i] + 6}px`;
        dica.hidden = false;
      } else {
        dica.hidden = true;
      }
    });
    dock.addEventListener('pointerleave', repousar);
    dock.addEventListener('pointercancel', repousar);

    let ultimaRoda = 0;
    dock.addEventListener('wheel', (e) => {
      e.preventDefault();
      const agora = performance.now();
      if (agora - ultimaRoda < 380) return;
      ultimaRoda = agora;
      ir((ambiente + (e.deltaY > 0 ? 1 : -1) + AMBIENTES.length) % AMBIENTES.length);
    }, { passive: false });

    function marcar(grupo, indice) {
      [...grupo.children].forEach((b, i) => {
        b.setAttribute('aria-checked', String(i === indice));
        b.tabIndex = i === indice ? 0 : -1;
      });
    }

    function ir(i, anunciar = true) {
      ambiente = i;
      marcar(gAmb, i);
      montar(anunciar);
    }

    function criarGrupo(grupo, nomes, aoEscolher) {
      nomes.forEach((nome, i) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.setAttribute('role', 'radio');
        b.textContent = nome;
        b.addEventListener('click', () => aoEscolher(i));
        grupo.append(b);
      });
      grupo.addEventListener('keydown', (e) => {
        const n = nomes.length;
        const atual = [...grupo.children].findIndex((b) => b.getAttribute('aria-checked') === 'true');
        let i = -1;
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') i = (atual + 1) % n;
        if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') i = (atual - 1 + n) % n;
        if (i < 0) return;
        e.preventDefault();
        aoEscolher(i);
        grupo.children[i].focus();
      });
    }

    function tema(i) {
      dock.className = `dock tema-${TEMAS[i].toLowerCase()}`;
      marcar(gTema, i);
      medir();
    }

    function relogio() {
      const h = document.getElementById('p-h');
      const m = document.getElementById('p-m');
      if (!h || !m) return;
      const d = new Date();
      h.setAttribute('transform', `rotate(${(d.getHours() % 12) * 30 + d.getMinutes() * 0.5} 24 24)`);
      m.setAttribute('transform', `rotate(${d.getMinutes() * 6 + d.getSeconds() * 0.1} 24 24)`);
    }

    let carga = 34;
    function atividade() {
      const arco = document.getElementById('arco');
      const num = document.getElementById('num');
      if (!arco || !num) return;
      carga = Math.max(8, Math.min(78, carga + (Math.random() - 0.5) * 22));
      arco.setAttribute('stroke-dashoffset', String(106.8 * (1 - carga / 100)));
      num.textContent = Math.round(carga);
    }

    criarGrupo(gAmb, AMBIENTES.map((a) => a.nome), (i) => ir(i));
    criarGrupo(gTema, TEMAS, tema);
    if (window.matchMedia('(pointer: coarse)').matches)
      como.textContent = 'Toque no círculo colorido ou nos botões para trocar de ambiente.';

    ir(0, false);
    tema(0);
    setInterval(relogio, 10000);
    setInterval(() => { if (!document.hidden) atividade(); }, 2500);

    let largura = window.innerWidth;
    window.addEventListener('resize', () => {
      if (window.innerWidth === largura) return;
      largura = window.innerWidth;
      medir();
    });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(medir);
    dock.querySelectorAll('img').forEach((i) => i.addEventListener('load', medir));
  }
})();
