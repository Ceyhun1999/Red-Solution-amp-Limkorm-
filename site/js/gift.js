/* «Подарок каждому участнику»: open the gift box, the LIMKORM coupon rises out. */
(() => {
  'use strict';

  const stage = document.querySelector('[data-gift]');
  if (!stage || !window.gsap) return; // without JS the coupon simply stays visible

  const box = stage.querySelector('[data-gift-box]');
  const lid = stage.querySelector('.gift__lid');
  const coupon = stage.querySelector('.gift__coupon');
  const openBtn = stage.querySelector('[data-gift-open]');
  const confetti = stage.querySelector('[data-gift-confetti]');
  const copyBtn = coupon.querySelector('[data-copy]');
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // how far the coupon must sink to hide fully behind the box front
  const sinkDepth = () => {
    const bodyH = stage.querySelector('.gift__body').offsetHeight;
    const bottom = parseFloat(getComputedStyle(coupon).bottom);
    return bottom + coupon.offsetHeight - bodyH + 12;
  };

  function close() {
    stage.classList.add('is-closed');
    gsap.set(coupon, { y: sinkDepth() });
    gsap.set(lid, { x: 0, y: 0, rotation: 0, autoAlpha: 1 });
    coupon.inert = true;
    openBtn.hidden = false;
    openBtn.setAttribute('aria-expanded', 'false');
  }

  const COLORS = ['#f5a211', '#ffffff', '#ffd27a', '#ffb93a'];
  function burst() {
    confetti.replaceChildren();
    const bits = Array.from({ length: 22 }, (_, i) => {
      const el = document.createElement('i');
      el.style.background = COLORS[i % COLORS.length];
      confetti.appendChild(el);
      return el;
    });
    gsap.fromTo(bits,
      { x: () => gsap.utils.random(-40, 40), y: 0, rotation: 0, opacity: 1, scale: () => gsap.utils.random(0.6, 1.2) },
      {
        x: () => gsap.utils.random(-190, 190),
        y: () => gsap.utils.random(-230, -90),
        rotation: () => gsap.utils.random(-540, 540),
        duration: () => gsap.utils.random(0.9, 1.4),
        ease: 'power2.out',
        stagger: 0.01
      });
    gsap.to(bits, { opacity: 0, duration: 0.5, delay: 0.8, stagger: 0.01, onComplete: () => confetti.replaceChildren() });
  }

  function open() {
    if (!stage.classList.contains('is-closed')) return;
    stage.classList.remove('is-closed');
    openBtn.setAttribute('aria-expanded', 'true');
    coupon.inert = false;

    const done = () => {
      openBtn.hidden = true;
      copyBtn.focus({ preventScroll: true });
    };

    if (reduce) {
      gsap.set(coupon, { y: 0 });
      gsap.set(lid, { autoAlpha: 0 });
      done();
      return;
    }

    gsap.timeline({ onComplete: done })
      .to(openBtn, { autoAlpha: 0, scale: 0.9, duration: 0.15, ease: 'power1.in' })
      // the box shudders, then the lid pops off and flies away
      .to(box, { keyframes: { rotation: [0, -4, 3.5, -2, 0] }, duration: 0.45, ease: 'none' }, 0)
      .to(lid, { y: -170, x: -120, rotation: -38, duration: 0.55, ease: 'power2.out' }, 0.42)
      .to(lid, { autoAlpha: 0, duration: 0.25, ease: 'power1.in' }, 0.7)
      .add(burst, 0.45)
      .to(coupon, { y: 0, duration: 0.7, ease: 'back.out(1.6)' }, 0.5)
      .set(openBtn, { clearProps: 'opacity,visibility,transform' });
  }

  close();
  openBtn.addEventListener('click', open);
  box.addEventListener('click', open);

  // keep the closed coupon fully tucked in when the layout changes
  let lastW = stage.offsetWidth;
  new ResizeObserver(() => {
    if (stage.offsetWidth === lastW) return;
    lastW = stage.offsetWidth;
    if (stage.classList.contains('is-closed')) gsap.set(coupon, { y: sinkDepth() });
  }).observe(stage);
})();
