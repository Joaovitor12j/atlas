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
})();
