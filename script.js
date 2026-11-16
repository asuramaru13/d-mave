// Год в копирайте
document.getElementById('year').textContent = new Date().getFullYear();

// Вращение пластинки, направление зависит от направления скролла:
// скролл вниз → по часовой, скролл вверх → против часовой. Пауза при наведении.
(() => {
  const vinyl = document.getElementById('vinyl');
  if (!vinyl) return;
  const reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduced) { vinyl.style.transform = 'rotate(0deg)'; return; }

  const SPEED = 360 / 26;      // град/сек (как и прежде — оборот за 26с)
  let angle = 0;
  let curDir = 1;              // текущее направление (плавно меняется)
  let targetDir = 1;          // цель: вниз = +1 (по часовой), вверх = -1 (против)
  let hovered = false;
  let lastY = window.scrollY || window.pageYOffset || 0;
  let lastT = performance.now();

  window.addEventListener('scroll', () => {
    const y = window.scrollY || window.pageYOffset || 0;
    if (y > lastY + 0.5) targetDir = 1;
    else if (y < lastY - 0.5) targetDir = -1;
    lastY = y;
  }, { passive: true });

  vinyl.addEventListener('pointerenter', () => { hovered = true; });
  vinyl.addEventListener('pointerleave', () => { hovered = false; });

  const tick = (now) => {
    const dt = Math.min(0.05, (now - lastT) / 1000);
    lastT = now;
    // плавный разворот (проходит через замедление при смене направления)
    curDir += (targetDir - curDir) * (1 - Math.exp(-dt / 0.35));
    if (!hovered) angle = (angle + curDir * SPEED * dt) % 360;
    vinyl.style.transform = 'rotate(' + angle.toFixed(2) + 'deg)';
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
})();

// Apple-style появление текста при попадании в вьюпорт
(() => {
  const reveals = Array.from(document.querySelectorAll('.reveal'));
  if (!reveals.length) return;

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduced || !('IntersectionObserver' in window)) {
    reveals.forEach((el) => el.classList.add('in'));
    return;
  }

  // Каскад для групп (треки появляются по очереди)
  document.querySelectorAll('.js-stagger').forEach((group) => {
    group.querySelectorAll('.reveal').forEach((el, i) => {
      el.style.transitionDelay = (i * 0.06) + 's';
    });
  });

  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('in');
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });

  reveals.forEach((el) => io.observe(el));
})();

// Декоративный прогресс-ползунок вокруг пластинки + таймер
(() => {
  const fill = document.getElementById('vpFill');
  const handle = document.getElementById('vpHandle');
  const cur = document.getElementById('tCur');
  const dur = document.getElementById('tDur');
  if (!fill || !handle || !cur) return;

  const R = 47, CX = 50, CY = 50;
  const DURATION = 158;        // 2:38
  const START = 0.657;         // стартовое положение ~1:43

  const fmt = (s) => {
    s = Math.max(0, Math.floor(s));
    return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
  };

  // Полукруг: p=0 — верх (12ч), p=0.5 — лево (9ч), p=1 — низ (6ч)
  const render = (p) => {
    const theta = -p * Math.PI;
    handle.setAttribute('cx', (CX + R * Math.sin(theta)).toFixed(2));
    handle.setAttribute('cy', (CY - R * Math.cos(theta)).toFixed(2));
    fill.style.strokeDashoffset = (100 * (1 - p)).toFixed(2);
    cur.textContent = fmt(p * DURATION);
  };

  if (dur) dur.textContent = fmt(DURATION);
  render(START); // стартовая позиция сразу

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduced) return;

  // setInterval надёжнее rAF (rAF может тормозиться вне фокуса); бегунок медленный — 120ms достаточно плавно
  const t0 = performance.now();
  setInterval(() => {
    const elapsed = (START * DURATION + (performance.now() - t0) / 1000) % DURATION;
    render(elapsed / DURATION);
  }, 120);
})();

// Превью треков: короткий семпл по клику на кнопку Play или на название
(() => {
  const tracks = Array.from(document.querySelectorAll('.track[data-src]'));
  if (!tracks.length) return;

  const audio = new Audio();
  audio.preload = 'none';
  const MAX = 30;        // предохранитель (семплы ~20с, ограничим на всякий случай)
  const FADE = 1.2;      // плавное затухание в конце, сек
  let current = null;

  const clear = () => {
    audio.pause();
    if (current) { current.classList.remove('is-playing'); current = null; }
  };

  const play = (li) => {
    if (current === li) {
      if (audio.paused) { audio.play().catch(() => {}); li.classList.add('is-playing'); }
      else { clear(); }
      return;
    }
    clear();
    audio.src = encodeURI(li.dataset.src);   // пробелы в именах → %20
    audio.currentTime = 0;
    audio.volume = 1;
    li.classList.add('is-playing');
    current = li;
    audio.play().catch(() => { li.classList.remove('is-playing'); current = null; });
  };

  audio.addEventListener('timeupdate', () => {
    if (!current) return;
    const end = Math.min(MAX, audio.duration || MAX);
    const remain = end - audio.currentTime;
    if (remain <= 0) { clear(); return; }
    audio.volume = remain < FADE ? Math.max(0, remain / FADE) : 1;
  });
  audio.addEventListener('ended', clear);
  audio.addEventListener('error', clear);

  tracks.forEach((li) => {
    li.querySelector('.track__btn').addEventListener('click', () => play(li));
    li.querySelector('.track__name').addEventListener('click', () => play(li));
  });
})();
