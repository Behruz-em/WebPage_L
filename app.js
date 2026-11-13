(() => {
  'use strict';

  let weeks = [];
  const $ = (id) => document.getElementById(id);

  const els = {
    home: $('home'), weekView: $('week-view'), weekList: $('week-list'),
    search: $('search'), searchWrap: $('search-wrap'), noResults: $('no-results'),
    stats: $('stats'), position: $('week-position'),
    title: $('week-title'), desc: $('week-description'),
    exercises: $('exercise-list'), exerciseEmpty: $('exercise-empty'),
    prev: $('prev-btn'), next: $('next-btn'),
    themeToggle: $('theme-toggle'), year: $('year')
  };

  const BASE_TITLE = document.title;
  let currentIndex = -1;
  let lastOpenedId = null;
  let firstRender = true;

  /* ---------- Small helpers ---------- */

  // Builds elements safely (textContent, never innerHTML)
  function h(tag, props = {}, ...children) {
    const node = document.createElement(tag);
    for (const [key, value] of Object.entries(props)) {
      if (key === 'class') node.className = value;
      else if (key === 'text') node.textContent = value;
      else node.setAttribute(key, value);
    }
    node.append(...children);
    return node;
  }

  const exerciseCount = (week) => (Array.isArray(week.exercises) ? week.exercises.length : 0);
  const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

  /* ---------- Layer 1: home ---------- */

  function renderStats() {
    if (!weeks.length) { els.stats.textContent = 'No weeks yet'; return; }
    const total = weeks.reduce((sum, w) => sum + exerciseCount(w), 0);
    els.stats.textContent = `${plural(weeks.length, 'week')} · ${plural(total, 'exercise')}`;
  }

  function createCard(week) {
    const soon = week.status === 'soon';
    return h('a',
      { class: `week-card${soon ? ' is-soon' : ''}`, href: `#week-${week.id}`, 'data-id': week.id },
      h('span', { class: 'week-num', 'aria-hidden': 'true', text: String(week.id).padStart(2, '0') }),
      h('h3', { text: week.title }),
      h('p', { text: week.description || '' }),
      h('div', { class: 'card-meta' },
        h('span', { class: `badge ${soon ? 'soon' : 'done'}`, text: soon ? 'Coming soon' : 'Ready' }),
        h('span', { text: plural(exerciseCount(week), 'exercise') })
      )
    );
  }

  function renderWeekList(query = '') {
    const q = query.trim().toLowerCase();
    const matches = weeks.filter((w) => {
      const text = [w.title, w.description, ...(w.exercises || []).map((e) => e.title)].join(' ');
      return !q || text.toLowerCase().includes(q);
    });

    els.weekList.replaceChildren(...matches.map(createCard));
    els.noResults.hidden = matches.length > 0;
    els.noResults.textContent = weeks.length
      ? 'No weeks match your search.'
      : 'No weeks have been added yet.';
  }

  function showHome() {
    currentIndex = -1;
    els.weekView.hidden = true;
    els.home.hidden = false;
    document.title = BASE_TITLE;

    // Return keyboard focus to the week you just left
    if (!firstRender && lastOpenedId !== null) {
      const card = els.weekList.querySelector(`[data-id="${CSS.escape(String(lastOpenedId))}"]`);
      if (card) card.focus();
    }
  }

  /* ---------- Layer 2: week view ---------- */

  function renderExercises(week) {
    const list = Array.isArray(week.exercises) ? week.exercises : [];
    els.exerciseEmpty.hidden = list.length > 0;

    els.exercises.replaceChildren(...list.map((ex, i) => {
      const item = h('li', { class: 'exercise' },
        h('span', { class: 'ex-index', 'aria-hidden': 'true', text: String(i + 1) }),
        h('div', { class: 'ex-body' },
          h('h3', { text: ex.title }),
          h('p', { text: ex.description || '' })
        )
      );
      if (ex.live) {
        item.append(h('a',
          { class: 'btn', href: ex.live, target: '_blank', rel: 'noopener noreferrer' },
          'Open live',
          h('span', { class: 'sr-only', text: `: ${ex.title} (opens in a new tab)` }),
          h('span', { 'aria-hidden': 'true', text: ' ↗' })
        ));
      }
      return item;
    }));
  }

  function setNav(button, target) {
    button.disabled = !target;
    button.querySelector('.nav-name').textContent = target ? target.title : '';
  }

  function showWeek(index) {
    const week = weeks[index];
    currentIndex = index;
    lastOpenedId = week.id;

    els.home.hidden = true;
    els.weekView.hidden = false;

    els.position.textContent = `${index + 1} of ${weeks.length}`;
    els.title.textContent = week.title;
    els.desc.textContent = week.description || '';
    renderExercises(week);
    setNav(els.prev, weeks[index - 1]);
    setNav(els.next, weeks[index + 1]);
    document.title = `${week.title} | ${BASE_TITLE}`;

    // Replay the entrance animation
    els.weekView.classList.remove('enter');
    void els.weekView.offsetWidth;
    els.weekView.classList.add('enter');

    window.scrollTo(0, 0);
    if (!firstRender) els.title.focus({ preventScroll: true });
  }

  /* ---------- Routing: the URL hash (#week-7) is the single source of truth ---------- */

  function go(index) {
    if (weeks[index]) location.hash = `week-${weeks[index].id}`;
  }

  function route() {
    const match = location.hash.match(/^#week-(.+)$/);
    const index = match ? weeks.findIndex((w) => String(w.id) === match[1]) : -1;
    if (index === -1) showHome();
    else showWeek(index);
    firstRender = false;
  }

  els.prev.addEventListener('click', () => go(currentIndex - 1));
  els.next.addEventListener('click', () => go(currentIndex + 1));
  window.addEventListener('hashchange', route);

  // Keyboard: ← → move between weeks, Esc goes back to all weeks
  document.addEventListener('keydown', (e) => {
    if (currentIndex === -1 || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
    if (e.target.closest('input, textarea, select, [contenteditable]')) return;
    if (e.key === 'ArrowLeft') go(currentIndex - 1);
    else if (e.key === 'ArrowRight') go(currentIndex + 1);
    else if (e.key === 'Escape') location.hash = '';
  });

  /* ---------- Search ---------- */

  els.search.addEventListener('input', () => renderWeekList(els.search.value));

  /* ---------- Theme ---------- */

  const root = document.documentElement;

  function storedTheme() {
    try { return localStorage.getItem('theme'); } catch { return null; }
  }

  function applyTheme(theme) {
    root.dataset.theme = theme;
    els.themeToggle.setAttribute('aria-pressed', String(theme === 'dark'));
  }

  els.themeToggle.addEventListener('click', () => {
    const next = root.dataset.theme === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    try { localStorage.setItem('theme', next); } catch { /* storage unavailable */ }
  });

  // Follow the system theme until the visitor picks one manually
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    if (!storedTheme()) applyTheme(e.matches ? 'dark' : 'light');
  });

  /* ---------- Start ---------- */

  async function loadWeeks() {
    // no-cache: always check for a fresh file, so new weeks show up right away
    const res = await fetch('data/weeks.json', { cache: 'no-cache' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (!Array.isArray(data)) throw new Error('weeks.json must contain a list');
    return data;
  }

  async function start() {
    applyTheme(root.dataset.theme || 'light');
    els.year.textContent = new Date().getFullYear();
    els.stats.textContent = 'Loading…';

    try {
      weeks = await loadWeeks();
    } 
    catch (err) {
      console.error('Could not load weeks.json:', err);
      els.stats.textContent = '';
      els.noResults.hidden = false;
      els.noResults.textContent = 'Could not load the weeks. Please try again later.';
      return;
    }

    els.searchWrap.hidden = weeks.length < 5;
    renderStats();
    renderWeekList();
    route();
  }
   start();
})();