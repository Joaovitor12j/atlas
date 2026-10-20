(() => {
  'use strict';

  const G = {
    terminal: '<path d="M5 7l5 5-5 5M12 18h7"/>',
    codigo: '<path d="M9 7l-5 5 5 5M15 7l5 5-5 5M13 5l-2 14"/>',
    web: '<circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17M12 3.5c3 3 3 14 0 17M12 3.5c-3 3-3 14 0 17"/>',
    chat: '<path d="M5 6h14v9H11l-4 3v-3H5z"/>',
    pasta: '<path d="M3.5 7.5h6l2 2.5h9v8h-17z"/>',
    livro: '<path d="M5 5h6v14H5zM13 5h6v14h-6z"/>',
    nota: '<path d="M6 4h12v16H6zM9 9h6M9 13h6M9 17h3"/>',
    calc: '<rect x="6" y="3.5" width="12" height="17" rx="2"/><path d="M9 8h6M9 12h.1M12 12h.1M15 12h.1M9 16h.1M12 16h.1M15 16h.1"/>',
    musica: '<path d="M9 17V6l10-2v11"/><circle cx="7" cy="17" r="2.2"/><circle cx="17" cy="15" r="2.2"/>',
    video: '<rect x="3.5" y="6" width="17" height="12" rx="2"/><path d="M10.5 9.5v5l4.5-2.5z"/>',
    jogo: '<rect x="3.5" y="8" width="17" height="9" rx="4"/><path d="M8 10.5v4M6 12.5h4M15.5 12h.1M17.5 13.5h.1"/>',
    foto: '<rect x="4" y="5" width="16" height="14" rx="2"/><path d="M4 16l4.5-4.5 3.5 3.5 3-3 5 5"/>',
    grade: '<path d="M6 6h.1M12 6h.1M18 6h.1M6 12h.1M12 12h.1M18 12h.1M6 18h.1M12 18h.1M18 18h.1" stroke-width="3"/>'
  };

  const AMBIENTES = [
    { nome: 'Trabalho', cor: '#2F6FED', apps: [['Terminal', 'terminal', '#2B3442', 1], ['Editor de código', 'codigo', '#2F6FED', 1], ['Navegador', 'web', '#E0661A', 1], ['Mensagens', 'chat', '#7A3FD0', 0], ['Arquivos', 'pasta', '#3C8DBC', 0]] },
    { nome: 'Estudo', cor: '#1E9E6A', apps: [['Leitor de PDF', 'livro', '#C4452F', 1], ['Notas', 'nota', '#D9A100', 1], ['Navegador', 'web', '#E0661A', 1], ['Calculadora', 'calc', '#4A5A6A', 0], ['Música', 'musica', '#1E9E6A', 0]] },
    { nome: 'Lazer', cor: '#E08A00', apps: [['Música', 'musica', '#C4165F', 1], ['Vídeos', 'video', '#D43A3A', 1], ['Jogos', 'jogo', '#5B4BDB', 0], ['Fotos', 'foto', '#1E9E6A', 0], ['Navegador', 'web', '#E0661A', 1]] }
  ];

  const TEMAS = ['Noite', 'Papel', 'Cristal', 'Neon', 'Halloween', 'Natal'];

  const raiz = document.documentElement;
  const dock = document.getElementById('dock');
  const trilho = document.getElementById('trilho');
  const dica = document.getElementById('tip');
  const rotulo = document.getElementById('rotulo');
  const gAmb = document.getElementById('g-ambiente');
  const gTema = document.getElementById('g-tema');
  const como = document.getElementById('como');

  let ambiente = 0;
  let itens = [];
  let repouso = [];
  let largura0 = 0;

  const svg = (corpo) => `<svg viewBox="0 0 24 24" aria-hidden="true">${corpo}</svg>`;

  function tileRelogio() {
    const b = document.createElement('button');
    b.className = 'it tile';
    b.dataset.nome = 'Relógio';
    b.innerHTML = `<svg viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="24" r="20" class="aro"/>
      <line class="ponteiro" id="p-h" x1="24" y1="24" x2="24" y2="13"/><line class="ponteiro" id="p-m" x1="24" y1="24" x2="24" y2="8"/>
      <circle cx="24" cy="24" r="2" fill="currentColor"/></svg>`;
    return b;
  }

  function tileAtividade() {
    const b = document.createElement('button');
    b.className = 'it tile';
    b.dataset.nome = 'Atividade';
    b.innerHTML = `<svg viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="24" r="17" class="aro"/>
      <circle cx="24" cy="24" r="17" class="arco" id="arco" transform="rotate(-90 24 24)" stroke-dasharray="106.8" stroke-dashoffset="70"/>
      <text x="24" y="29" class="num" id="num">34</text></svg>`;
    return b;
  }

  function montar() {
    const a = AMBIENTES[ambiente];
    trilho.textContent = '';
    dica.hidden = true;

    const sel = document.createElement('button');
    sel.className = 'it seletor';
    sel.dataset.nome = `Ambiente ${a.nome}`;
    sel.setAttribute('aria-label', `Ambiente ${a.nome}. Ativar para ir ao próximo`);
    sel.textContent = a.nome[0];
    sel.addEventListener('click', () => ir((ambiente + 1) % AMBIENTES.length));
    trilho.append(sel, separador());

    a.apps.forEach(([nome, glifo, cor, aberto]) => {
      const b = document.createElement('button');
      b.className = 'it' + (aberto ? ' aberto' : '');
      b.style.background = `linear-gradient(160deg, color-mix(in srgb, ${cor} 82%, white), ${cor})`;
      b.dataset.nome = nome;
      b.setAttribute('aria-label', nome);
      b.innerHTML = svg(G[glifo]);
      trilho.append(b);
    });

    trilho.append(separador(), tileRelogio(), tileAtividade());
    raiz.style.setProperty('--regiao', a.cor);
    rotulo.textContent = a.nome;
    medir();
    relogio();
    atividade();
  }

  function separador() {
    const s = document.createElement('span');
    s.className = 'sep';
    s.setAttribute('aria-hidden', 'true');
    return s;
  }

  function medir() {
    itens = [...trilho.children].filter((el) => el.offsetWidth);
    gap = parseFloat(getComputedStyle(trilho).columnGap) || 10;
    dock.style.setProperty('--extra', '0px');
    itens.forEach((el) => { el.style.transform = ''; });
    repouso = itens.map((el) => ({ c: el.offsetLeft + el.offsetWidth / 2, w: el.offsetWidth, sep: el.classList.contains('sep') }));
    largura0 = trilho.offsetWidth;
  }

  const MAX = 1.75, SIG = 78;
  let gap = 10;
  const centros = [], escalas = [];

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

  let semMouse = false;
  function mover(e) {
    const r = trilho.getBoundingClientRect();
    lente(e.clientX - r.left);
    const alvo = e.target.closest('.it');
    if (alvo && alvo.dataset.nome) {
      const i = itens.indexOf(alvo);
      const tr = trilho.getBoundingClientRect();
      const ra = dock.parentElement.getBoundingClientRect();
      dica.textContent = alvo.dataset.nome;
      dica.style.left = `${tr.left + centros[i] - ra.left}px`;
      dica.style.bottom = `${ra.bottom - tr.bottom + alvo.offsetHeight * escalas[i] + 6}px`;
      dica.hidden = false;
    } else {
      dica.hidden = true;
    }
  }

  dock.addEventListener('pointermove', (e) => { semMouse = false; mover(e); });
  dock.addEventListener('pointerleave', repousar);
  dock.addEventListener('pointercancel', repousar);

  let ultimaRoda = 0;
  dock.addEventListener('wheel', (e) => {
    const agora = performance.now();
    e.preventDefault();
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

  function ir(i) {
    ambiente = i;
    marcar(gAmb, i);
    montar();
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
  }

  function relogio() {
    const h = document.getElementById('p-h');
    const m = document.getElementById('p-m');
    if (!h || !m) return;
    const d = new Date();
    const gm = d.getMinutes() * 6 + d.getSeconds() * 0.1;
    const gh = (d.getHours() % 12) * 30 + d.getMinutes() * 0.5;
    h.setAttribute('transform', `rotate(${gh} 24 24)`);
    m.setAttribute('transform', `rotate(${gm} 24 24)`);
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

  criarGrupo(gAmb, AMBIENTES.map((a) => a.nome), ir);
  criarGrupo(gTema, TEMAS, tema);

  const toque = window.matchMedia('(pointer: coarse)').matches;
  if (toque) como.textContent = 'Toque no círculo colorido ou nos botões para trocar de ambiente.';

  ir(0);
  tema(0);

  setInterval(relogio, 10000);
  setInterval(() => { if (!document.hidden) atividade(); }, 2500);

  let tamanho = window.innerWidth;
  window.addEventListener('resize', () => {
    if (window.innerWidth === tamanho) return;
    tamanho = window.innerWidth;
    const t = tamanho < 520 ? 40 : tamanho < 760 ? 48 : 56;
    dock.style.setProperty('--tam', `${t}px`);
    medir();
  });
  if (window.innerWidth < 760) {
    dock.style.setProperty('--tam', window.innerWidth < 520 ? '40px' : '48px');
    medir();
  }

  if (document.fonts && document.fonts.ready) document.fonts.ready.then(medir);
})();
