'use strict';

/* ============================================================
   ХЛЕБНОЕ МЕСТО — логика
   ============================================================ */

const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const FINE_POINTER = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

/* ============================================================
   ДАННЫЕ МЕНЮ
   ============================================================ */
const PRODUCTS = [
  { id: 1, title: 'Бородинский хлеб',    desc: 'ржаная мука, кориандр, тмин',              price: 120, category: 'bread'  },
  { id: 2, title: 'Багет французский',   desc: 'длинная холодная расстойка',               price: 150, category: 'bread'  },
  { id: 3, title: 'Бублик с маком',      desc: 'мягкий, щедрая маковая начинка',           price: 90,  category: 'bread'  },
  { id: 4, title: 'Круассан классик',    desc: '72 слоя, французское масло',               price: 180, category: 'pastry' },
  { id: 5, title: 'Крендель баварский',  desc: 'морская соль, тёмный солод',               price: 160, category: 'pastry' },
  { id: 6, title: 'Пирожок с вишней',    desc: 'дрожжевое тесто, кисло-сладкая вишня',     price: 110, category: 'pastry' },
  { id: 7, title: 'Капкейк ванильный',   desc: 'крем из сливочного сыра',                  price: 200, category: 'sweet'  },
  { id: 8, title: 'Медовик',             desc: 'восемь коржей, сметанный крем',            price: 320, category: 'sweet'  },
  { id: 9, title: 'Пончик шоколадный',   desc: 'глазурь из тёмного шоколада',              price: 140, category: 'sweet'  },
];

const REVIEWS = [
  {
    text: 'Беру бородинский каждую субботу. Запах из пакета — как у бабушки в деревне, только без нафталина.',
    author: 'Анна К.',
    role: 'постоянный гость',
  },
  {
    text: 'Круассан, от которого хруст слышно на всю улицу. Семьдесят два слоя — я не преувеличиваю, я считал.',
    author: 'Михаил Д.',
    role: 'фуд-блогер',
  },
  {
    text: 'Заказывали медовик на юбилей: восемь коржей, ни грамма приторности. Гости допрашивали, откуда торт.',
    author: 'Елена С.',
    role: 'мама двоих детей',
  },
];

/* ============================================================
   БЕГУЩАЯ СТРОКА — добираем половинки до ширины экрана
   ============================================================ */
(function initTicker() {
  const track = document.getElementById('tickerTrack');
  const half  = track && track.querySelector('.ticker__half');
  if (!track || !half) return;

  let guard = 0;
  // добавляем ПАРАМИ, чтобы число половинок всегда было чётным —
  // иначе шов анимации translateX(-50%) дёргается
  while (track.scrollWidth < document.documentElement.clientWidth * 2 + 200 && guard++ < 6) {
    track.appendChild(half.cloneNode(true));
    track.appendChild(half.cloneNode(true));
  }
})();

/* ============================================================
   МЕНЮ: РЕНДЕР ПРЕЙСКУРАНТА
   ============================================================ */
const menuGrid = document.getElementById('menuGrid');
const filters  = document.getElementById('filters');

function createRow(product, index) {
  const row = document.createElement('article');
  row.className = 'row';
  row.dataset.category = product.category;

  const num = String(index + 1).padStart(2, '0');

  row.innerHTML = `
    <span class="row__num">${num}</span>
    <div class="row__main">
      <h3 class="row__name">${product.title}</h3>
      <span class="row__desc">${product.desc}</span>
    </div>
    <span class="row__dots" aria-hidden="true"></span>
    <span class="row__price">${product.price} ₽</span>
    <button class="row__add" data-id="${product.id}" data-hover>в заказ</button>
  `;

  return row;
}

function renderMenu(category = 'all') {
  menuGrid.innerHTML = '';
  const list = category === 'all'
    ? PRODUCTS
    : PRODUCTS.filter(p => p.category === category);

  list.forEach((product, i) => menuGrid.appendChild(createRow(product, i)));

  // каскадное появление строк
  requestAnimationFrame(() => {
    [...menuGrid.children].forEach((row, i) => {
      setTimeout(() => row.classList.add('is-shown'), REDUCED ? 0 : 60 + i * 55);
    });
  });
}

renderMenu();

filters.addEventListener('click', (e) => {
  const tab = e.target.closest('.tab');
  if (!tab || tab.classList.contains('is-active')) return;

  filters.querySelectorAll('.tab').forEach(t => t.classList.remove('is-active'));
  tab.classList.add('is-active');
  renderMenu(tab.dataset.filter);
});

/* ============================================================
   КАРТОЧКА-СПРАВКА, СЛЕДУЮЩАЯ ЗА КУРСОРОМ
   ============================================================ */
let peek = null;
let peekTarget = { x: 0, y: 0 };
let peekPos = { x: 0, y: 0 };

if (FINE_POINTER && !REDUCED) {
  peek = document.createElement('aside');
  peek.className = 'peek';
  peek.setAttribute('aria-hidden', 'true');
  document.body.appendChild(peek);

  menuGrid.addEventListener('mouseover', (e) => {
    const row = e.target.closest('.row');
    if (!row) return;

    const nameEl  = row.querySelector('.row__name');
    const priceEl = row.querySelector('.row__price');
    const name    = nameEl ? nameEl.textContent : '';
    const price   = priceEl ? priceEl.textContent : '';

    peek.innerHTML = `
      <span class="peek__letter">${name.charAt(0)}</span>
      <span class="peek__name">${name}</span>
      <span class="peek__price">${price}</span>
    `;
    peek.classList.add('is-on');
  });

  menuGrid.addEventListener('mouseleave', () => peek.classList.remove('is-on'));
  menuGrid.addEventListener('mousemove', (e) => {
    peekTarget.x = e.clientX;
    peekTarget.y = e.clientY;
  });
}

/* ============================================================
   КУРСОР-КОЛЬЦО + ПОДГОНКА ПОЗИЦИЙ (единый rAF)
   ============================================================ */
if (FINE_POINTER && !REDUCED) {
  const ring = document.createElement('span');
  ring.className = 'cursor-ring';
  ring.setAttribute('aria-hidden', 'true');
  document.body.appendChild(ring);

  let mx = innerWidth / 2, my = innerHeight / 2;
  let rx = mx, ry = my;
  let px = mx, py = my;

  document.addEventListener('mousemove', (e) => {
    mx = e.clientX; my = e.clientY;
    ring.classList.add('is-on');
  });
  document.addEventListener('mouseleave', () => ring.classList.remove('is-on'));

  document.addEventListener('mouseover', (e) => {
    ring.classList.toggle('is-hover', Boolean(e.target.closest('a, button, input, textarea, [data-hover]')));
  });

  (function loop() {
    rx += (mx - rx) * .16;
    ry += (my - ry) * .16;
    px += (peekTarget.x - px) * .18;
    py += (peekTarget.y - py) * .18;

    ring.style.transform = `translate(${rx}px, ${ry}px) translate(-50%, -50%)`;

    if (peek) {
      peek.style.transform =
        `translate(${px}px, ${py}px) translate(-50%, -118%) rotate(-4deg)`;
    }

    requestAnimationFrame(loop);
  })();
}

/* ============================================================
   «В ЗАКАЗ»: счётчик в хедере + тезис в бланке
   ============================================================ */
const ctaCount = document.getElementById('ctaCount');
const messageField = document.querySelector('textarea[name="message"]');
let orderCount = 0;

function bumpCounter() {
  orderCount += 1;
  ctaCount.hidden = false;
  ctaCount.textContent = orderCount;
  ctaCount.classList.remove('is-add');
  void ctaCount.offsetWidth; // перезапуск анимации
  ctaCount.classList.add('is-add');
}

menuGrid.addEventListener('click', (e) => {
  const btn = e.target.closest('.row__add');
  if (!btn) return;

  const product = PRODUCTS.find(p => p.id === Number(btn.dataset.id));
  if (!product) return;

  bumpCounter();

  const line = `• ${product.title} — ${product.price} ₽`;
  messageField.value = messageField.value
    ? `${messageField.value}\n${line}`
    : `Хочу заказать:\n${line}`;

  btn.textContent = 'добавлено';
  setTimeout(() => { btn.textContent = 'в заказ'; }, 900);

  document.getElementById('contact').scrollIntoView({ behavior: REDUCED ? 'auto' : 'smooth' });
});

/* ============================================================
   ОТЗЫВЫ: карусель на typography
   ============================================================ */
const quoteBox    = document.getElementById('quote');
const quoteText   = document.getElementById('quoteText');
const quoteAuthor = document.getElementById('quoteAuthor');
const quoteRole   = document.getElementById('quoteRole');
const quoteCounter = document.getElementById('quoteCounter');
let quoteIndex = 0;
let quoteTimer = null;

function paintQuote(i) {
  const r = REVIEWS[i];
  quoteText.textContent = r.text;
  quoteAuthor.textContent = r.author;
  quoteRole.textContent = r.role;
  quoteCounter.textContent = String(i + 1).padStart(2, '0');
}

function showQuote(next, instant = false) {
  quoteIndex = (next + REVIEWS.length) % REVIEWS.length;

  if (REDUCED || instant) {
    paintQuote(quoteIndex);
    return;
  }

  quoteBox.classList.add('is-leaving');
  setTimeout(() => {
    paintQuote(quoteIndex);
    quoteBox.classList.remove('is-leaving');
    quoteBox.classList.add('is-entering');
    requestAnimationFrame(() => requestAnimationFrame(() => {
      quoteBox.classList.remove('is-entering');
    }));
  }, 300);
}

function restartAutoQuote() {
  if (quoteTimer) clearInterval(quoteTimer);
  if (!REDUCED) quoteTimer = setInterval(() => showQuote(quoteIndex + 1), 8000);
}

document.getElementById('qPrev').addEventListener('click', () => { showQuote(quoteIndex - 1); restartAutoQuote(); });
document.getElementById('qNext').addEventListener('click', () => { showQuote(quoteIndex + 1); restartAutoQuote(); });
quoteBox.addEventListener('mouseenter', () => quoteTimer && clearInterval(quoteTimer));
quoteBox.addEventListener('mouseleave', restartAutoQuote);

paintQuote(0);
restartAutoQuote();

/* ============================================================
   ХЕДЕР, ПРОГРЕСС, ЖИВОЙ СТАТУС
   ============================================================ */
const header    = document.getElementById('header');
const progress  = document.getElementById('progress');
const steps     = document.getElementById('steps');
const stepsFill = document.getElementById('stepsFill');

function onScroll() {
  const y = window.scrollY;
  const max = document.documentElement.scrollHeight - innerHeight;

  header.classList.toggle('is-scrolled', y > 24);
  progress.style.transform = `scaleX(${max > 0 ? clamp(y / max, 0, 1) : 0})`;

  if (steps && stepsFill) {
    const r = steps.getBoundingClientRect();
    const p = clamp((innerHeight * 0.55 - r.top) / r.height, 0, 1);
    stepsFill.style.transform = `scaleY(${p})`;
  }
}

window.addEventListener('scroll', onScroll, { passive: true });
window.addEventListener('resize', onScroll);
onScroll();

/* живой статус пекарни по локальному времени */
const statusChip = document.getElementById('statusChip');
const statusText = document.getElementById('statusText');

function updateStatus() {
  const h = new Date().getHours();
  if (h >= 7 && h < 21) {
    statusChip.classList.remove('is-closed');
    statusText.textContent = 'открыто · до 21:00';
  } else if (h < 7) {
    statusChip.classList.add('is-closed');
    statusText.textContent = 'закрыто · откроемся в 07:00';
  } else {
    statusChip.classList.add('is-closed');
    statusText.textContent = 'закрыто · завтра в 07:00';
  }
}

updateStatus();
setInterval(updateStatus, 30_000);

/* ============================================================
   БЛАНК ЗАКАЗА: печать «ПРИНЯТО»
   ============================================================ */
const form       = document.getElementById('orderForm');
const formStatus = document.getElementById('formStatus');
const stampBadge = document.getElementById('stampBadge');
const blankNum   = document.getElementById('blankNum');
const PHONE_RE   = /^[\d\s()+-]{10,}$/;

function newBlankNumber() {
  blankNum.textContent = String(Math.floor(1000 + Math.random() * 9000));
}
newBlankNumber();

form.addEventListener('submit', (e) => {
  e.preventDefault();
  formStatus.textContent = '';
  formStatus.className = 'form-status';
  stampBadge.classList.remove('is-shown');

  const { name, phone } = form.elements;
  let hasError = false;

  [name, phone].forEach(el => el.classList.remove('is-error'));

  if (name.value.trim().length < 2)  { name.classList.add('is-error');  hasError = true; }
  if (!PHONE_RE.test(phone.value.trim())) { phone.classList.add('is-error'); hasError = true; }

  if (hasError) {
    formStatus.textContent = 'заполните имя и корректный телефон — остальное мы возьмём на себя';
    formStatus.classList.add('is-error');
    return;
  }

  const submitBtn = form.querySelector('button[type="submit"]');
  const original = submitBtn.innerHTML;
  submitBtn.disabled = true;
  submitBtn.textContent = 'Отправляем…';

  setTimeout(() => {
    const firstName = name.value.trim().split(/\s+/)[0];
    stampBadge.querySelector('#stampName').textContent = `спасибо, ${firstName}`;
    stampBadge.classList.add('is-shown');

    formStatus.textContent = 'заявка у печатающего кассира — перезвоним в течение 15 минут';
    formStatus.classList.add('is-success');

    form.reset();
    newBlankNumber();

    orderCount = 0;
    ctaCount.hidden = true;

    submitBtn.disabled = false;
    submitBtn.innerHTML = original;
  }, 900);
});

/* ============================================================
   БУРГЕР / МОБИЛЬНАЯ НАВИГАЦИЯ
   ============================================================ */
const burger = document.getElementById('burger');
const nav    = document.getElementById('nav');

function closeNav() {
  burger.classList.remove('is-open');
  nav.classList.remove('is-open');
  burger.setAttribute('aria-expanded', 'false');
  document.body.classList.remove('is-locked');
}

burger.addEventListener('click', () => {
  const opened = nav.classList.toggle('is-open');
  burger.classList.toggle('is-open', opened);
  burger.setAttribute('aria-expanded', String(opened));
  document.body.classList.toggle('is-locked', opened);
});

nav.addEventListener('click', (e) => {
  if (e.target.closest('.nav__link')) closeNav();
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeNav();
});

/* ============================================================
   ПЛАВНЫЕ ЯКОРЯ (на всякий случай — для старых браузеров)
   ============================================================ */
document.querySelectorAll('a[href^="#"]').forEach(link => {
  link.addEventListener('click', (e) => {
    const id = link.getAttribute('href');
    if (!id || id === '#') return;
    const target = document.querySelector(id);
    if (!target) return;
    e.preventDefault();
    target.scrollIntoView({ behavior: REDUCED ? 'auto' : 'smooth' });
  });
});

/* ============================================================
   ПОЯВЛЕНИЕ ПРИ СКРОЛЛЕ
   ============================================================ */
function initReveals() {
  if (!('IntersectionObserver' in window)) {
    document.querySelectorAll('[data-reveal], .step').forEach(el => el.classList.add('is-in'));
    return;
  }

  const io = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-in');
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

  document.querySelectorAll('[data-reveal]').forEach(el => io.observe(el));

  const stepIO = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-in');
        stepIO.unobserve(entry.target);
      }
    });
  }, { threshold: 0.4 });

  document.querySelectorAll('.step').forEach(el => stepIO.observe(el));
}

/* ============================================================
   ПРОЛОГ: ПЕЧЬ НАГРЕВАЕТСЯ 18 → 240°C
   ============================================================ */
(function boot() {
  const loader = document.getElementById('loader');
  const tempEl = document.getElementById('loaderTemp');
  const barEl  = document.getElementById('loaderBar');

  document.body.classList.add('is-locked');

  const finish = () => {
    loader.classList.add('is-done');
    document.body.classList.remove('is-locked');
    setTimeout(() => loader.remove(), 800);
    initReveals();
  };

  if (REDUCED) {
    tempEl.textContent = '240';
    barEl.style.transform = 'scaleX(1)';
    loader.remove();
    document.body.classList.remove('is-locked');
    initReveals();
    return;
  }

  const DURATION = 1100;
  const start = performance.now();

  (function tick(now) {
    const t = clamp((now - start) / DURATION, 0, 1);
    const eased = 1 - Math.pow(1 - t, 3); // easeOutCubic

    tempEl.textContent = Math.round(18 + (240 - 18) * eased);
    barEl.style.transform = `scaleX(${eased})`;

    if (t < 1) requestAnimationFrame(tick);
    else setTimeout(finish, 180);
  })(start);
})();

/* год в футере */
document.getElementById('yearNow').textContent = new Date().getFullYear();
