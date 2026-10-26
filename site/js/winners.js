/* «Победители акции»: split-flap board clatters once into «ИТОГИ СКОРО». */
(() => {
  'use strict';

  const board = document.querySelector('[data-flapboard]');
  if (!board || !window.gsap) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const chars = [...board.querySelectorAll('.flap__char')];
  const POOL = 'АБВГДЕЖЗИКЛМНОПРСТУФХЦЧШЭЮЯ0123456789';
  const pick = () => POOL[Math.floor(Math.random() * POOL.length)];

  function play() {
    const tl = gsap.timeline();
    chars.forEach((el, i) => {
      const final = el.dataset.final;
      const flips = 5 + i; // tiles settle left to right
      const start = i * 0.05;
      for (let k = 0; k <= flips; k++) {
        const t = start + k * 0.075;
        tl.call(() => { el.textContent = k === flips ? final : pick(); }, null, t)
          .fromTo(el, { rotationX: -80 }, { rotationX: 0, duration: 0.07, ease: 'power2.out' }, t);
      }
    });
  }

  chars.forEach((el) => { el.dataset.final = el.textContent; el.textContent = pick(); });
  const io = new IntersectionObserver((entries) => {
    if (!entries[0].isIntersecting) return;
    io.disconnect();
    play();
  }, { threshold: 0.6 });
  io.observe(board);
})();
