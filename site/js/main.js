/* LIMKORM × RED SOLUTION — page behaviour. No dependencies. */
(() => {
  'use strict';

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

  /* ---------- Toast ---------- */
  const toastEl = $('[data-toast]');
  let toastTimer;
  function toast(message) {
    clearTimeout(toastTimer);
    toastEl.textContent = message;
    toastEl.classList.add('is-visible');
    toastTimer = setTimeout(() => toastEl.classList.remove('is-visible'), 3200);
  }

  /* ---------- Countdown: days until the promo starts ---------- */
  const countdown = $('[data-countdown]');
  if (countdown) {
    const start = new Date(countdown.dataset.start);
    let dismissed = false;
    try { dismissed = sessionStorage.getItem('countdown-hidden') === '1'; } catch { /* storage unavailable */ }
    const plural = (n) => {
      const m10 = n % 10, m100 = n % 100;
      if (m10 === 1 && m100 !== 11) return 'день';
      if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return 'дня';
      return 'дней';
    };
    const render = () => {
      const days = Math.ceil((start - Date.now()) / 86400000);
      if (Number.isNaN(days) || days <= 0 || dismissed) { countdown.hidden = true; return; }
      $('[data-countdown-num]', countdown).textContent = days;
      $('[data-countdown-unit]', countdown).textContent = plural(days);
      $('[data-countdown-sr]', countdown).textContent = `До старта акции ${days} ${plural(days)}`;
      countdown.hidden = false;
    };
    render();
    setInterval(render, 60 * 60 * 1000);
    $('[data-countdown-close]', countdown).addEventListener('click', () => {
      dismissed = true;
      try { sessionStorage.setItem('countdown-hidden', '1'); } catch { /* storage unavailable */ }
      countdown.hidden = true;
    });
  }

  /* ---------- Paw print on click (mouse only, motion allowed) ---------- */
  const finePointer = window.matchMedia('(pointer: fine)');
  const stillMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const root = document.documentElement;
  const release = () => root.classList.remove('is-pressing');
  document.addEventListener('pointerup', release);
  document.addEventListener('pointercancel', release);
  window.addEventListener('blur', release);
  document.addEventListener('pointerdown', (e) => {
    if (e.pointerType !== 'mouse' || !finePointer.matches || e.button !== 0) return;
    root.classList.add('is-pressing'); // paw curls its toes (cursor swap, not motion)
    if (stillMotion.matches) return;
    const print = document.createElement('span');
    print.className = 'paw-print';
    print.setAttribute('aria-hidden', 'true');
    print.style.setProperty('--x', `${e.clientX}px`);
    print.style.setProperty('--y', `${e.clientY}px`);
    print.style.setProperty('--r', `${Math.round(Math.random() * 40 - 20)}deg`);
    setTimeout(() => print.remove(), 700); // matches the 0.6s stamp animation
    document.body.appendChild(print);
  });

  /* ---------- Header: shadow on scroll ---------- */
  const header = $('.site-header');
  const onScroll = () => header.classList.toggle('is-scrolled', window.scrollY > 8);
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---------- Steps: paw trail reveal ---------- */
  const stepsEl = $('[data-steps]');
  if (stepsEl && 'IntersectionObserver' in window) {
    stepsEl.classList.add('js-reveal');
    const reveal = new IntersectionObserver((entries) => {
      if (!entries[0].isIntersecting) return;
      stepsEl.classList.add('is-visible');
      reveal.disconnect();
    }, { threshold: 0.35 });
    reveal.observe(stepsEl);
  }

  /* ---------- Mobile menu ---------- */
  const nav = $('#site-nav');
  const toggle = $('.menu-toggle');
  const desktopNav = window.matchMedia('(min-width: 1024px)');

  function setMenu(open, { focusToggle = false } = {}) {
    nav.classList.toggle('is-open', open);
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Закрыть меню' : 'Открыть меню');
    if (open) $('a', nav).focus();
    else if (focusToggle) toggle.focus();
  }

  toggle.addEventListener('click', () => setMenu(toggle.getAttribute('aria-expanded') !== 'true'));
  nav.addEventListener('click', (e) => {
    if (e.target.closest('a, button') && !desktopNav.matches) setMenu(false);
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && nav.classList.contains('is-open')) setMenu(false, { focusToggle: true });
  });
  document.addEventListener('click', (e) => {
    if (nav.classList.contains('is-open') && !e.target.closest('#site-nav, .menu-toggle')) setMenu(false);
  });
  desktopNav.addEventListener('change', () => setMenu(false));

  /* ---------- Current section in nav ---------- */
  const navLinks = $$('.site-nav__list a');
  const sections = navLinks.map((a) => $(a.hash)).filter(Boolean);
  if ('IntersectionObserver' in window) {
    const spy = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        navLinks.forEach((a) => {
          if (a.hash === '#' + entry.target.id) a.setAttribute('aria-current', 'true');
          else a.removeAttribute('aria-current');
        });
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    sections.forEach((s) => spy.observe(s));
  }

  /* ---------- Dialogs ---------- */
  let lastTrigger = null;
  const beforeOpen = new Map(); // dialog -> reset function, so every opening starts clean

  function openDialog(dialog, trigger) {
    if (!dialog || dialog.open) return;
    lastTrigger = trigger || document.activeElement;
    beforeOpen.get(dialog)?.();
    dialog.showModal();
  }

  $$('dialog').forEach((dialog) => {
    dialog.addEventListener('click', (e) => {
      if (e.target === dialog || e.target.closest('[data-close]')) dialog.close();
    });
    dialog.addEventListener('close', () => {
      // a trigger inside the closed mobile menu is not focusable; fall back to the toggle
      const target = lastTrigger && lastTrigger.offsetParent !== null ? lastTrigger : toggle;
      if (target && target.offsetParent !== null) target.focus();
    });
  });

  $$('[data-open]').forEach((btn) => {
    btn.addEventListener('click', () => openDialog(document.getElementById(btn.dataset.open), btn));
  });

  /* Info dialog: documents and contacts that are not approved yet */
  const INFO = {
    rules: {
      title: 'Правила акции',
      text: 'Документ появится после утверждения организатором: сроки, перечень товаров, ограничения, количество призов и порядок их получения.'
    },
    privacy: {
      title: 'Политика конфиденциальности',
      text: 'Политика обработки персональных данных будет опубликована до начала приёма чеков.'
    },
    support: {
      title: 'Поддержка',
      text: 'Контакты поддержки участников появятся здесь перед запуском акции.'
    }
  };
  const infoDialog = $('#info-dialog');
  $$('[data-info]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const info = INFO[btn.dataset.info];
      if (!info) return;
      $('[data-info-title]', infoDialog).textContent = info.title;
      $('[data-info-text]', infoDialog).textContent = info.text;
      openDialog(infoDialog, btn);
    });
  });

  /* ---------- Receipt form (demo, nothing is sent) ---------- */
  const receiptDialog = $('#receipt-dialog');
  const form = $('[data-receipt-form]');
  const done = $('[data-receipt-done]');
  const fileInput = $('input[type="file"]', form);
  const fileName = $('[data-file-name]', form);
  const dropzone = $('.dropzone', form);
  const contactInput = form.elements.contact;
  const consentInput = form.elements.consent;

  const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  const PHONE = /^\+?[\d\s()-]{10,18}$/;

  function setError(input, id, invalid, target = input) {
    const error = document.getElementById(id);
    error.hidden = !invalid;
    input.setAttribute('aria-invalid', String(invalid));
    target.classList?.toggle('is-invalid', invalid && target !== input);
    return !invalid;
  }

  function validate() {
    const contact = contactInput.value.trim();
    const okContact = setError(contactInput, 'receipt-contact-error', !(EMAIL.test(contact) || PHONE.test(contact)));
    const okFile = setError(fileInput, 'receipt-file-error', fileInput.files.length === 0, dropzone);
    const okConsent = setError(consentInput, 'receipt-consent-error', !consentInput.checked);
    return [okContact && contactInput, okFile && fileInput, okConsent && consentInput];
  }

  fileInput.addEventListener('change', () => {
    const file = fileInput.files[0];
    fileName.textContent = file ? file.name : 'Выберите файл';
    dropzone.classList.toggle('is-filled', Boolean(file));
    if (file) setError(fileInput, 'receipt-file-error', false, dropzone);
  });
  contactInput.addEventListener('input', () => {
    if (contactInput.getAttribute('aria-invalid') === 'true') validate();
  });
  consentInput.addEventListener('change', () => {
    if (consentInput.checked) setError(consentInput, 'receipt-consent-error', false);
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const fields = [contactInput, fileInput, consentInput];
    const result = validate();
    const firstInvalid = fields.find((f, i) => !result[i]);
    if (firstInvalid) {
      firstInvalid.focus();
      return;
    }
    form.hidden = true;
    done.hidden = false;
    done.focus();
  });

  beforeOpen.set(receiptDialog, () => {
    form.reset();
    form.hidden = false;
    done.hidden = true;
    fileName.textContent = 'Выберите файл';
    dropzone.classList.remove('is-filled', 'is-invalid');
    $$('.field__error', form).forEach((el) => { el.hidden = true; });
    $$('[aria-invalid]', form).forEach((el) => el.removeAttribute('aria-invalid'));
  });

  /* ---------- Copy promo code ---------- */
  $$('[data-copy]').forEach((btn) => {
    const label = $('span', btn);
    const initial = label.textContent;
    btn.addEventListener('click', async () => {
      const code = btn.dataset.copy;
      try {
        await navigator.clipboard.writeText(code);
      } catch {
        const range = document.createRange();
        range.selectNodeContents($('#promo-code'));
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
        toast('Выделили промокод — скопируйте его вручную');
        return;
      }
      btn.classList.add('is-done');
      label.textContent = 'Скопировано';
      toast(`Промокод ${code} скопирован`);
      setTimeout(() => {
        btn.classList.remove('is-done');
        label.textContent = initial;
      }, 2400);
    });
  });

  /* ---------- FAQ: chat-style answers ---------- */
  const faqItems = $$('.qa');
  const calm = window.matchMedia('(prefers-reduced-motion: reduce)');
  faqItems.forEach((item) => {
    item.addEventListener('toggle', () => {
      if (!item.open || calm.matches) return;
      // a short "typing" beat before the reply appears
      item.classList.add('is-typing');
      clearTimeout(item._typing);
      item._typing = setTimeout(() => item.classList.remove('is-typing'), 450);
    });
  });

  /* ---------- Folder tabs (rules) ---------- */
  $$('[data-tabs]').forEach((root) => {
    const tabs = $$('[role="tab"]', root);
    const select = (tab, focus) => {
      tabs.forEach((t) => {
        const on = t === tab;
        t.setAttribute('aria-selected', String(on));
        t.tabIndex = on ? 0 : -1;
        document.getElementById(t.getAttribute('aria-controls')).hidden = !on;
      });
      if (focus) tab.focus();
    };
    tabs.forEach((tab, i) => {
      tab.addEventListener('click', () => select(tab));
      tab.addEventListener('keydown', (e) => {
        const step = { ArrowRight: 1, ArrowLeft: -1 }[e.key];
        if (step) { e.preventDefault(); select(tabs[(i + step + tabs.length) % tabs.length], true); }
        if (e.key === 'Home') { e.preventDefault(); select(tabs[0], true); }
        if (e.key === 'End') { e.preventDefault(); select(tabs[tabs.length - 1], true); }
      });
    });
  });

  /* ---------- Quiz (local state only) ---------- */
  const quiz = $('[data-quiz]');
  if (quiz) {
    const steps = $$('[data-quiz-step]', quiz);
    const result = $('[data-quiz-result]', quiz);
    const bar = $('[data-quiz-bar]', quiz);
    const live = $('[data-quiz-live]', quiz);
    const answers = {};
    const total = steps.length;

    /* pet passport fills in as soon as an option is picked */
    const passport = $('[data-passport]');
    const PP = {
      pet: { 'кошка': 'Кошка', 'собака': 'Собака', 'кошка и собака': 'Кошка и собака' },
      age: { 'малыш': 'До года', 'взрослый': '1–7 лет', 'старший': 'Старше 7 лет' },
      focus: { 'состав': 'Мясной состав', 'пищеварение': 'Пищеварение', 'энергия': 'Энергия' }
    };
    function fillPassport(changed) {
      if (!passport) return;
      const picked = {};
      $$('input:checked', quiz).forEach((input) => { picked[input.name] = input.value; });
      Object.keys(PP).forEach((key) => {
        const dd = $(`[data-pp="${key}"]`, passport);
        const text = picked[key] ? PP[key][picked[key]] : '…';
        if (dd.textContent !== text) {
          dd.textContent = text;
          if (key === changed) { dd.classList.remove('is-new'); void dd.offsetWidth; dd.classList.add('is-new'); }
        }
      });
      passport.dataset.pet = picked.pet || '';
    }
    quiz.addEventListener('change', (e) => fillPassport(e.target.name));

    const PET = { 'кошка': 'кошки', 'собака': 'собаки', 'кошка и собака': 'кошки и собаки' };
    const AGE = { 'малыш': 'до года', 'взрослый': 'от 1 до 7 лет', 'старший': 'старше 7 лет' };
    const FOCUS = { 'состав': 'мясной состав', 'пищеварение': 'мягкое пищеварение', 'энергия': 'энергия на каждый день' };

    function show(index) {
      steps.forEach((s, i) => { s.hidden = i !== index; });
      result.hidden = index < total;
      if (passport) passport.classList.toggle('is-complete', index >= total);
      bar.style.transform = `scaleX(${Math.max(index / total, 0.04)})`;
      if (index < total) {
        live.textContent = `Вопрос ${index + 1} из ${total}`;
        if (index > 0) $('input', steps[index]).focus();
      } else {
        $('[data-quiz-title]', result).textContent = 'Спасибо за ответы!';
        $('[data-quiz-text]', result).textContent =
          `Корм для ${PET[answers.pet]} ${AGE[answers.age]}, приоритет — ${FOCUS[answers.focus]}. ` +
          'Сравните линейки AJO, SIRIUS, Одно Мясо и Наш Рацион в официальных магазинах LIMKORM: ' +
          'на упаковке указаны возраст и назначение корма. Это демонстрация квиза, ответы не сохраняются.';
        live.textContent = 'Квиз пройден, результат показан ниже';
        result.focus();
      }
    }

    steps.forEach((step, i) => {
      step.addEventListener('submit', (e) => {
        e.preventDefault();
        const checked = $('input:checked', step);
        if (!checked) {
          $('input', step).focus();
          live.textContent = 'Выберите один из вариантов';
          return;
        }
        answers[checked.name] = checked.value;
        show(i + 1);
      });
    });
    $$('[data-quiz-back]', quiz).forEach((btn) => {
      btn.addEventListener('click', () => show(steps.indexOf(btn.closest('[data-quiz-step]')) - 1));
    });
    $('[data-quiz-reset]', quiz).addEventListener('click', () => {
      steps.forEach((s) => s.reset());
      Object.keys(answers).forEach((k) => delete answers[k]);
      fillPassport();
      show(0);
      $('input', steps[0]).focus();
    });
  }
})();
