// =============================================
// Author Rotation Tracker – Research Sharks
// Firebase Realtime Database Integration
// =============================================

(function () {
  'use strict';

  // --- Firebase Config ---
  const firebaseConfig = {
    apiKey: "AIzaSyAEV_2ORJCUW72OHPm5c-zM1nszsXnxXI4",
    authDomain: "research-sharks.firebaseapp.com",
    databaseURL: "https://research-sharks-default-rtdb.firebaseio.com",
    projectId: "research-sharks",
    storageBucket: "research-sharks.firebasestorage.app",
    messagingSenderId: "800117133521",
    appId: "1:800117133521:web:35f97dea5563a91b8cf5f0"
  };

  // Initialize Firebase
  firebase.initializeApp(firebaseConfig);
  const db = firebase.database();
  const papersRef = db.ref('papers');

  // --- Team & Roles ---
  const TEAM = [
    'Abdirasak Sharif Ali',
    'Mohamed Abdirahim Omar',
    'Yahye Sheikh Abdulle Hassan',
    'Mohamed Mustaf Ahmed',
    'Abdullahi Abdisalam Mohamed'
  ];

  // Ordered authorship positions (1st … 5th).
  const POSITIONS = ['first', 'second', 'third', 'fourth', 'fifth'];
  const POSITION_NUM = { first: '1', second: '2', third: '3', fourth: '4', fifth: '5' };
  const POSITION_LABEL = {
    first: '1st Author', second: '2nd Author', third: '3rd Author',
    fourth: '4th Author', fifth: '5th Author'
  };

  const MONTHS = [
    'January','February','March','April','May','June',
    'July','August','September','October','November','December'
  ];

  const THEME_KEY = 'sharks_theme';

  // --- State ---
  let papers = [];
  let currentTab = 'history';
  let firebaseReady = false;

  // --- Theme ---
  function initTheme() {
    const saved = localStorage.getItem(THEME_KEY);
    const isDark = saved === 'dark';
    applyTheme(isDark);
  }

  function applyTheme(isDark) {
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
    const btn = document.getElementById('theme-toggle');
    if (btn) {
      btn.querySelector('.toggle-icon').textContent = isDark ? '🌙' : '☀️';
      btn.querySelector('.toggle-label').textContent = isDark ? 'Dark' : 'Light';
    }
    localStorage.setItem(THEME_KEY, isDark ? 'dark' : 'light');
  }

  function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme');
    applyTheme(current !== 'dark');
  }

  // --- Firebase Sync ---
  function listenForPapers() {
    papersRef.on('value', (snapshot) => {
      const data = snapshot.val();
      if (data) {
        // Convert Firebase object to sorted array
        papers = Object.keys(data).map(key => ({
          id: key,
          ...data[key]
        }));
        // Sort by timestamp (oldest first)
        papers.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
      } else {
        papers = [];
      }
      firebaseReady = true;
      renderAll();
    });
  }

  function addPaperToFirebase(paper) {
    const newRef = papersRef.push();
    return newRef.set(paper);
  }



  // --- Rotation Algorithm ---
  // Even 5-author cycle: the starting author advances by one each paper, so
  // over any 5 papers every author holds every position (1st … 5th) once.
  function getNextSuggestion() {
    const offset = papers.length % TEAM.length;
    const suggestion = {};
    POSITIONS.forEach((pos, i) => {
      suggestion[pos] = TEAM[(offset + i) % TEAM.length];
    });
    return suggestion;
  }

  // Normalize a stored paper (legacy 4-author or current 5-author format)
  // into an ordered author list plus the corresponding author's name.
  function normalizePaper(p) {
    const r = p.roles || {};
    // Current format: has fourth/fifth positions + a separate corresponding field.
    if (r.fourth !== undefined || r.fifth !== undefined) {
      const ordered = POSITIONS
        .map(pos => ({ num: POSITION_NUM[pos], name: r[pos] }))
        .filter(a => a.name);
      return { ordered, corresponding: p.corresponding || r.fifth };
    }
    // Legacy format: first/second/third + corresponding (who was the last author).
    const ordered = [
      { num: '1', name: r.first },
      { num: '2', name: r.second },
      { num: '3', name: r.third },
      { num: '4', name: r.corresponding }
    ].filter(a => a.name);
    return { ordered, corresponding: r.corresponding };
  }

  // --- Rendering ---
  function renderSuggestion() {
    const suggestion = getNextSuggestion();
    const container = document.getElementById('suggestion-grid');

    container.innerHTML = POSITIONS.map(pos => `
      <div class="suggestion-item animate-in${pos === 'fifth' ? ' is-corresponding' : ''}">
        <div class="role-number">${POSITION_NUM[pos]}</div>
        <div class="role-label">${POSITION_LABEL[pos]}</div>
        <div class="author-name">${suggestion[pos]}</div>
        ${pos === 'fifth' ? '<div class="corr-tag">✉ Corresponding</div>' : ''}
      </div>
    `).join('');

    prefillForm(suggestion);
  }

  function prefillForm(suggestion) {
    // Locked position selects follow the rotation.
    POSITIONS.forEach(pos => {
      const sel = document.getElementById('select-' + pos);
      if (sel) sel.value = suggestion[pos];
    });

    // Corresponding select lists the 5 suggested authors (by position + name).
    const corrSelect = document.getElementById('select-corresponding');
    if (corrSelect) {
      const prev = corrSelect.value;
      const names = POSITIONS.map(pos => suggestion[pos]);
      corrSelect.innerHTML = POSITIONS.map(pos =>
        `<option value="${suggestion[pos]}">${POSITION_NUM[pos]} · ${suggestion[pos]}</option>`
      ).join('');
      // Preserve a still-valid manual choice; otherwise default to the last author.
      corrSelect.value = names.includes(prev) ? prev : suggestion.fifth;
    }
    syncCorrControl();

    const dateInput = document.getElementById('paper-date');
    if (dateInput && !dateInput.value) {
      dateInput.value = new Date().toISOString().split('T')[0];
    }

    // Set current month in dropdown
    const monthSelect = document.getElementById('paper-month');
    if (monthSelect) {
      monthSelect.value = MONTHS[new Date().getMonth()];
    }
  }

  // Keep the corresponding control in sync with the "last author is corresponding" toggle.
  function syncCorrControl() {
    const corrIsLast = document.getElementById('corr-is-last');
    const corrSelect = document.getElementById('select-corresponding');
    if (!corrIsLast || !corrSelect) return;
    if (corrIsLast.checked) {
      const fifth = document.getElementById('select-fifth');
      if (fifth) corrSelect.value = fifth.value;
      corrSelect.disabled = true;   // locked to the last author
    } else {
      corrSelect.disabled = false;  // user may choose any author
    }
  }

  function renderPaperHistory() {
    const container = document.getElementById('history-content');
    const countEl = document.getElementById('paper-count');
    if (countEl) countEl.textContent = papers.length;

    if (!firebaseReady) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">⏳</div>
          <p>Connecting to database…</p>
        </div>`;
      return;
    }

    if (papers.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">📄</div>
          <p>No papers yet.<br><strong>Add your first paper above</strong> to start tracking rotations.</p>
        </div>`;
      return;
    }

    const sorted = [...papers].reverse();
    container.innerHTML = `
      <div class="paper-list">
        ${sorted.map((p, i) => {
          const norm = normalizePaper(p);
          return `
          <article class="paper-card">
            <div class="paper-card-top">
              <span class="paper-card-num">#${papers.length - i}</span>
              <span class="paper-card-date">
                <span class="paper-card-month">${escapeHtml(p.month || '—')}</span>
                ${formatDate(p.date)}
              </span>
            </div>
            <h3 class="paper-card-title">${escapeHtml(p.title)}</h3>
            <div class="paper-card-authors">
              ${norm.ordered.map(a => {
                const isCorr = a.name === norm.corresponding;
                return `<span class="author-chip role-${a.num}${isCorr ? ' is-corresponding' : ''}">` +
                  `<span class="chip-role">${a.num}</span>` +
                  `<span class="chip-name">${escapeHtml(a.name)}</span>` +
                  (isCorr ? '<span class="chip-corr" title="Corresponding author">✉</span>' : '') +
                  `</span>`;
              }).join('')}
            </div>
          </article>`;
        }).join('')}
      </div>`;
  }

  function renderStatistics() {
    const container = document.getElementById('stats-content');

    if (papers.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">📊</div>
          <p>Add papers to see statistics.</p>
        </div>`;
      return;
    }

    const stats = {};
    TEAM.forEach(name => {
      stats[name] = { first: 0, second: 0, third: 0, fourth: 0, fifth: 0, corresponding: 0 };
    });

    papers.forEach(p => {
      const norm = normalizePaper(p);
      norm.ordered.forEach(a => {
        const pos = POSITIONS[Number(a.num) - 1]; // '1' -> first … '5' -> fifth
        if (pos && stats[a.name]) stats[a.name][pos]++;
      });
      if (stats[norm.corresponding]) stats[norm.corresponding].corresponding++;
    });

    const maxCount = Math.max(1, ...Object.values(stats).flatMap(s => Object.values(s)));

    const rows = [
      ['first', '1st'], ['second', '2nd'], ['third', '3rd'],
      ['fourth', '4th'], ['fifth', '5th'], ['corresponding', 'Corresp.']
    ];

    container.innerHTML = `
      <div class="stats-grid">
        ${TEAM.map(name => `
          <div class="stat-card animate-in">
            <div class="author-name">${name}</div>
            <div class="stat-bars">
              ${rows.map(([key, label]) => `
                <div class="stat-row">
                  <span class="stat-label">${label}</span>
                  <div class="stat-bar-track">
                    <div class="stat-bar-fill" style="width: ${(stats[name][key] / maxCount) * 100}%"></div>
                  </div>
                  <span class="stat-count">${stats[name][key]}</span>
                </div>
              `).join('')}
            </div>
          </div>
        `).join('')}
      </div>`;
  }

  function renderTabs() {
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === currentTab);
    });

    document.getElementById('history-content').style.display = currentTab === 'history' ? 'block' : 'none';
    document.getElementById('stats-content').style.display = currentTab === 'stats' ? 'block' : 'none';

    if (currentTab === 'history') renderPaperHistory();
    if (currentTab === 'stats') renderStatistics();
  }

  // --- Actions ---
  function addPaper() {
    const title = document.getElementById('paper-title').value.trim();
    const date = document.getElementById('paper-date').value;
    const month = document.getElementById('paper-month').value;

    if (!title) {
      showToast('Please enter a paper title.');
      return;
    }

    const roles = {};
    POSITIONS.forEach(pos => {
      roles[pos] = document.getElementById('select-' + pos).value;
    });

    // Positions come from the locked rotation, so they should all be distinct.
    if (new Set(Object.values(roles)).size !== POSITIONS.length) {
      showToast('Each author must hold a unique position.');
      return;
    }

    // Corresponding author: the last author by default, or a manual choice.
    const corrIsLast = document.getElementById('corr-is-last');
    const corresponding = (corrIsLast && corrIsLast.checked)
      ? roles.fifth
      : document.getElementById('select-corresponding').value;

    const paper = {
      title,
      date: date || new Date().toISOString().split('T')[0],
      month,
      roles,
      corresponding,
      timestamp: Date.now()
    };

    addPaperToFirebase(paper).then(() => {
      document.getElementById('paper-title').value = '';
      document.getElementById('paper-date').value = new Date().toISOString().split('T')[0];
      showToast('Paper added ✓');
    }).catch(err => {
      showToast('Error saving — check connection');
      console.error(err);
    });
  }




  // --- Utilities ---
  function formatDate(dateStr) {
    if (!dateStr) return '—';
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function showToast(message) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = 'toast show';
    clearTimeout(toast._timeout);
    toast._timeout = setTimeout(() => {
      toast.classList.remove('show');
    }, 2400);
  }

  function renderAll() {
    renderSuggestion();
    renderTabs();
  }

  // --- Init ---
  function init() {
    initTheme();

    // Build locked position selects (the corresponding select is filled in prefillForm)
    ['select-first', 'select-second', 'select-third', 'select-fourth', 'select-fifth'].forEach(id => {
      const select = document.getElementById(id);
      if (select) {
        select.innerHTML = TEAM.map(name =>
          `<option value="${name}">${name}</option>`
        ).join('');
      }
    });

    // Corresponding-author toggle
    const corrIsLast = document.getElementById('corr-is-last');
    if (corrIsLast) corrIsLast.addEventListener('change', syncCorrControl);

    // Default date
    const dateInput = document.getElementById('paper-date');
    if (dateInput) dateInput.value = new Date().toISOString().split('T')[0];

    // Default month
    const monthSelect = document.getElementById('paper-month');
    if (monthSelect) monthSelect.value = MONTHS[new Date().getMonth()];

    // Tab switching
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        currentTab = btn.dataset.tab;
        renderTabs();
      });
    });

    // Buttons
    document.getElementById('btn-add-paper').addEventListener('click', addPaper);
    document.getElementById('theme-toggle').addEventListener('click', toggleTheme);

    // Start listening for Firebase data (real-time sync)
    listenForPapers();

    // Initial render (will show "Connecting..." until Firebase responds)
    renderAll();
  }

  // Expose
  window.app = {};

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
