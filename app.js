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
    'Mohamed Mustaf Ahmed'
  ];

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
  function getNextSuggestion() {
    if (papers.length === 0) {
      return {
        first: TEAM[0],
        second: TEAM[1],
        third: TEAM[2],
        corresponding: TEAM[3]
      };
    }

    const lastPaper = papers[papers.length - 1];
    const lastRoles = lastPaper.roles;
    const roleOrder = ['first', 'second', 'third', 'corresponding'];
    const suggestion = {};

    roleOrder.forEach((role, idx) => {
      const nextRole = roleOrder[(idx + 1) % 4];
      suggestion[nextRole] = lastRoles[role];
    });

    return suggestion;
  }

  // --- Rendering ---
  function renderSuggestion() {
    const suggestion = getNextSuggestion();
    const container = document.getElementById('suggestion-grid');
    const labels = {
      first: '1st Author',
      second: '2nd Author',
      third: '3rd Author',
      corresponding: 'Corresponding'
    };
    const numbers = { first: '1', second: '2', third: '3', corresponding: 'C' };

    container.innerHTML = ['first', 'second', 'third', 'corresponding'].map(role => `
      <div class="suggestion-item animate-in">
        <div class="role-number">${numbers[role]}</div>
        <div class="role-label">${labels[role]}</div>
        <div class="author-name">${suggestion[role]}</div>
      </div>
    `).join('');

    prefillForm(suggestion);
  }

  function prefillForm(suggestion) {
    const selects = {
      first: document.getElementById('select-first'),
      second: document.getElementById('select-second'),
      third: document.getElementById('select-third'),
      corresponding: document.getElementById('select-corresponding')
    };

    Object.keys(selects).forEach(role => {
      if (selects[role]) selects[role].value = suggestion[role];
    });

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
        ${sorted.map((p, i) => `
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
              <span class="author-chip role-1"><span class="chip-role">1</span><span class="chip-name">${escapeHtml(p.roles.first)}</span></span>
              <span class="author-chip role-2"><span class="chip-role">2</span><span class="chip-name">${escapeHtml(p.roles.second)}</span></span>
              <span class="author-chip role-3"><span class="chip-role">3</span><span class="chip-name">${escapeHtml(p.roles.third)}</span></span>
              <span class="author-chip role-c"><span class="chip-role">C</span><span class="chip-name">${escapeHtml(p.roles.corresponding)}</span></span>
            </div>
          </article>
        `).join('')}
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
      stats[name] = { first: 0, second: 0, third: 0, corresponding: 0 };
    });

    papers.forEach(p => {
      Object.keys(p.roles).forEach(role => {
        const author = p.roles[role];
        if (stats[author]) stats[author][role]++;
      });
    });

    const maxCount = Math.max(1, ...Object.values(stats).flatMap(s => Object.values(s)));

    const roleLabels = { first: '1st', second: '2nd', third: '3rd', corresponding: 'Corresp.' };

    container.innerHTML = `
      <div class="stats-grid">
        ${TEAM.map(name => `
          <div class="stat-card animate-in">
            <div class="author-name">${name}</div>
            <div class="stat-bars">
              ${['first', 'second', 'third', 'corresponding'].map(role => `
                <div class="stat-row">
                  <span class="stat-label">${roleLabels[role]}</span>
                  <div class="stat-bar-track">
                    <div class="stat-bar-fill" style="width: ${(stats[name][role] / maxCount) * 100}%"></div>
                  </div>
                  <span class="stat-count">${stats[name][role]}</span>
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

    const roles = {
      first: document.getElementById('select-first').value,
      second: document.getElementById('select-second').value,
      third: document.getElementById('select-third').value,
      corresponding: document.getElementById('select-corresponding').value
    };

    // Check for duplicate assignments
    const assigned = Object.values(roles);
    const unique = new Set(assigned);
    if (unique.size !== 4) {
      showToast('Each author must have a unique role.');
      return;
    }

    const paper = {
      title,
      date: date || new Date().toISOString().split('T')[0],
      month,
      roles,
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

    // Build selects
    ['select-first', 'select-second', 'select-third', 'select-corresponding'].forEach(id => {
      const select = document.getElementById(id);
      if (select) {
        select.innerHTML = TEAM.map(name =>
          `<option value="${name}">${name}</option>`
        ).join('');
      }
    });

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
