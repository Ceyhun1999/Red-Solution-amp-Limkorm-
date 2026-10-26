/* «Бренды акции»: dog and cat run behind the packs on the shelf. GSAP, transforms only. */
(() => {
  'use strict';

  const scene = document.querySelector('[data-brands-scene]');
  if (!scene || !window.gsap) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  /* ---------- Hover peek: the pet's eyes follow the cursor ---------- */
  document.querySelectorAll('.brand').forEach((card) => {
    const eyes = card.querySelector('.peek__eyes');
    const head = card.querySelector('.peek');
    if (!eyes || !head) return;
    const toX = gsap.quickTo(eyes, 'x', { duration: 0.3, ease: 'power3' });
    const toY = gsap.quickTo(eyes, 'y', { duration: 0.3, ease: 'power3' });
    const MAX = 3.5; // svg units
    card.addEventListener('pointermove', (e) => {
      const r = head.getBoundingClientRect();
      const dx = e.clientX - (r.left + r.width / 2);
      const dy = e.clientY - (r.top + r.height * 0.5);
      const len = Math.hypot(dx, dy) || 1;
      const k = Math.min(1, len / 160);
      toX((dx / len) * MAX * k);
      toY((dy / len) * MAX * k);
    });
    card.addEventListener('pointerleave', () => { toX(0); toY(0); });
  });

  const stage = scene.parentElement;
  const packs = [...stage.querySelectorAll('.brand__pack')];
  const shelves = [...stage.querySelectorAll('.brand__shelf')];
  const VIEW_W = 220;
  const VIEW_H = 132;
  const FOOT_Y = 126; // paw line inside the viewBox

  /* ---------- Gait: 8 samples per stride, looped with easeEach ---------- */
  const GAIT = {
    frontUpper: [-38, -18, 12, 34, 42, 18, -12, -34],
    frontLower: [0, 2, 8, 22, 55, 68, 38, 8],
    backUpper: [34, 42, 18, -10, -34, -40, -18, 12],
    backLower: [-8, -18, -4, 8, 0, -28, -44, -26],
    bodyY: [0, -3, -6, -4, 0, 2, 1, 0],
    bodyRot: [-2, 0, 2, 3, 1, -1, -3, -2],
    headRot: [2, 1, -1, -2, -1, 1, 2, 2],
    tailRot: [-12, 0, 12, 18, 10, 0, -10, -16]
  };
  const shift = (arr, k) => arr.map((_, i) => arr[(i + k) % arr.length]);
  const loop = (arr) => [...arr, arr[0]];

  function buildStride(runner, stride) {
    const q = (sel) => runner.querySelector(sel);
    const tl = gsap.timeline({ paused: true });
    const add = (el, prop, samples) => {
      if (!el) return;
      const vars = {
        keyframes: { [prop]: loop(samples), easeEach: 'sine.inOut' },
        ease: 'none',
        duration: stride,
        repeat: -1
      };
      if (el.dataset.pivot) vars.svgOrigin = el.dataset.pivot;
      tl.to(el, vars, 0);
    };
    // near and far legs of a pair are a beat apart, front and back pairs half a stride apart
    add(q('.leg-fn'), 'rotation', GAIT.frontUpper);
    add(q('.leg-fn-low'), 'rotation', GAIT.frontLower);
    add(q('.leg-ff'), 'rotation', shift(GAIT.frontUpper, 1));
    add(q('.leg-ff-low'), 'rotation', shift(GAIT.frontLower, 1));
    add(q('.leg-bn'), 'rotation', GAIT.backUpper);
    add(q('.leg-bn-low'), 'rotation', GAIT.backLower);
    add(q('.leg-bf'), 'rotation', shift(GAIT.backUpper, 1));
    add(q('.leg-bf-low'), 'rotation', shift(GAIT.backLower, 1));
    add(q('.head'), 'rotation', GAIT.headRot);
    add(q('.tail'), 'rotation', GAIT.tailRot);
    const rig = q('.rig');
    gsap.set(rig, { svgOrigin: '110 70' });
    tl.to(rig, { keyframes: { y: loop(GAIT.bodyY), rotation: loop(GAIT.bodyRot), easeEach: 'sine.inOut' }, ease: 'none', duration: stride, repeat: -1 }, 0);
    tl.timeScale(0.001).play();
    return tl;
  }

  const actors = {
    dog: { el: scene.querySelector('[data-runner="dog"]'), stride: 0.5, speed: 340 },
    cat: { el: scene.querySelector('[data-runner="cat"]'), stride: 0.42, speed: 420 }
  };
  Object.values(actors).forEach((a) => { a.cycle = buildStride(a.el, a.stride); });

  /* ---------- Layout: shelf tracks, pack gaps, animal size ---------- */
  function measure() {
    const box = stage.getBoundingClientRect();
    const rows = [];
    shelves.forEach((shelf, i) => {
      const r = shelf.getBoundingClientRect();
      const top = Math.round(r.top - box.top);
      let row = rows.find((x) => Math.abs(x.top - top) < 4);
      if (!row) { row = { top, packs: [] }; rows.push(row); }
      const p = packs[i].getBoundingClientRect();
      row.packs.push({ left: p.left - box.left, right: p.right - box.left, height: p.height });
    });
    rows.forEach((row) => {
      row.packs.sort((a, b) => a.left - b.left);
      row.gaps = row.packs.slice(1).map((p, i) => (row.packs[i].right + p.left) / 2);
    });
    return { width: box.width, rows };
  }

  /* ---------- Route: run in, slow down between packs, pause, dash out ---------- */
  function route(actor, row, width, dir, stopGap) {
    const { el, cycle, speed } = actor;
    const packH = row.packs[0].height;
    const h = Math.max(54, packH * 0.4);
    const w = h * (VIEW_W / VIEW_H);
    const y = row.top - h * (FOOT_Y / VIEW_H) + 7; // paws sit just behind the shelf lip
    const start = dir > 0 ? -w - 30 : width + 30;
    const end = dir > 0 ? width + 30 : -w - 30;
    gsap.set(el, { width: w, y, x: start }); // wait off stage until its turn
    const stopCenter = row.gaps.length ? row.gaps[stopGap % row.gaps.length] : width / 2;
    const stop = stopCenter - w / 2;
    const d1 = Math.abs(stop - start) / speed;
    const d2 = Math.abs(end - stop) / speed;

    const head = el.querySelector('.head-wrap');
    const tail = el.querySelector('.tail-wrap');
    const tl = gsap.timeline();
    tl.set(el, { x: start })
      .fromTo(cycle, { timeScale: 0.5 }, { timeScale: 1, duration: 0.6, ease: 'power1.out' }, 0)
      .to(el, { x: stop, duration: d1 * 1.25, ease: 'power2.out' }, 0)
      .to(cycle, { timeScale: 0.001, duration: d1 * 0.55, ease: 'power2.in' }, d1 * 0.7)
      .addLabel('pause')
      // a look around and a tail flick while standing between the packs
      .to(head, { rotation: dir > 0 ? 14 : 10, svgOrigin: head.dataset.pivot, duration: 0.35, ease: 'sine.inOut', yoyo: true, repeat: 3 }, 'pause')
      .to(tail, { rotation: 22, svgOrigin: tail.dataset.pivot, duration: 0.18, ease: 'sine.inOut', yoyo: true, repeat: 7 }, 'pause')
      .addLabel('go', 'pause+=1.5')
      .to(cycle, { timeScale: 1.15, duration: 0.5, ease: 'power1.in' }, 'go')
      .to(el, { x: end, duration: d2 * 0.95, ease: 'power2.in' }, 'go');
    return tl;
  }

  let master = null;
  function build() {
    if (master) master.kill();
    const { width, rows } = measure();
    if (!rows.length) return;
    const first = rows[0];
    const last = rows[rows.length - 1];
    master = gsap.timeline({ repeat: -1, repeatDelay: 1.2, delay: 0.6 });
    master
      .add(route(actors.dog, first, width, 1, 1))
      .add(route(actors.cat, last, width, -1, rows.length > 1 ? 0 : 2), '+=1.4');
    scene.classList.add('is-live');
    if (!visible) master.pause();
  }

  /* ---------- Only run while the shelf is on screen ---------- */
  let visible = false;
  const setPlaying = (on) => {
    visible = on;
    const method = on ? 'resume' : 'pause';
    if (master) master[method]();
    Object.values(actors).forEach((a) => a.cycle[method]());
  };
  new IntersectionObserver((entries) => setPlaying(entries[0].isIntersecting), { rootMargin: '100px 0px' }).observe(stage);

  let resizeTimer;
  let lastWidth = 0;
  new ResizeObserver(() => {
    const w = Math.round(stage.getBoundingClientRect().width);
    if (w === lastWidth) return;
    lastWidth = w;
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(build, 150);
  }).observe(stage);

  // packs set the track height, so wait until they have loaded
  Promise.all(packs.map((img) => (img.complete ? null : new Promise((r) => { img.addEventListener('load', r, { once: true }); img.addEventListener('error', r, { once: true }); })))).then(build);
})();
