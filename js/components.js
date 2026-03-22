/**
 * GOG — Global UI Components
 * Reusable functions: navbar, toast, modal, loader, badges
 */

'use strict';

/* ═══════════════════════════════════════
   NAVBAR
   ═══════════════════════════════════════ */
/**
 * Renders navbar based on user role.
 * @param {string} role - 'guest' | 'player' | 'club' | 'admin'
 */
function renderNavbar(role = 'guest') {
  const links = {
    guest: [
      { href: '/index.html',          label: 'Home' },
      { href: '/login.html',          label: 'Login' },
    ],
    player: [
      { href: '/player/dashboard.html', label: 'Dashboard' },
      { href: '/player/profile.html',   label: 'My Profile' },
    ],
    club: [
      { href: '/club/dashboard.html',   label: 'Dashboard' },
      { href: '/club/dashboard.html#search', label: 'Find Players' },
    ],
    admin: [
      { href: '/admin/dashboard.html',  label: 'Admin Panel' },
    ],
  };

  const actions = {
    guest: `
      <a href="/login.html"          class="btn btn--ghost btn--sm">Login</a>
      <a href="/player/register.html" class="btn btn--primary btn--sm">Get Started</a>
    `,
    player: `
      <button class="btn btn--ghost btn--sm" onclick="handleLogout()">Logout</button>
    `,
    club: `
      <button class="btn btn--ghost btn--sm" onclick="handleLogout()">Logout</button>
    `,
    admin: `
      <span class="badge badge--verified" style="margin-right:8px">ADMIN</span>
      <button class="btn btn--ghost btn--sm" onclick="handleLogout()">Logout</button>
    `,
  };

  const navLinks = (links[role] || links.guest)
    .map(l => {
      const active = window.location.pathname.includes(l.href.replace('/index.html','')) ? 'active' : '';
      return `<a href="${l.href}" class="navbar__link ${active}">${l.label}</a>`;
    })
    .join('');

  const html = `
    <nav class="navbar">
      <div class="navbar__inner">
        <a href="/index.html" class="navbar__logo">GOG</a>
        <div class="navbar__links hide-mobile">
          ${navLinks}
        </div>
        <div class="navbar__actions">
          ${actions[role] || actions.guest}
        </div>
      </div>
    </nav>
  `;

  const placeholder = document.getElementById('navbar-placeholder');
  if (placeholder) {
    placeholder.outerHTML = html;
  } else {
    document.body.insertAdjacentHTML('afterbegin', html);
  }
}

/* ═══════════════════════════════════════
   TOAST
   ═══════════════════════════════════════ */
let toastContainer = null;

function getToastContainer() {
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.className = 'toast-container';
    document.body.appendChild(toastContainer);
  }
  return toastContainer;
}

/**
 * Shows a toast notification.
 * @param {string} msg   - Message text
 * @param {string} type  - 'success' | 'error' | 'info'
 * @param {number} duration - ms before auto-dismiss (default 3000)
 */
function renderToast(msg, type = 'info', duration = 3000) {
  const icons = { success: '✓', error: '✕', info: 'ℹ' };
  const container = getToastContainer();

  const toast = document.createElement('div');
  toast.className = `toast toast--${type}`;
  toast.innerHTML = `
    <span class="toast__icon">${icons[type] || icons.info}</span>
    <span class="toast__msg">${msg}</span>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('hide');
    toast.addEventListener('animationend', () => toast.remove(), { once: true });
    setTimeout(() => toast.remove(), 350);
  }, duration);
}

/* ═══════════════════════════════════════
   MODAL
   ═══════════════════════════════════════ */
let activeModal = null;

/**
 * Renders a modal dialog.
 * @param {string} title     - Modal title
 * @param {string} body      - HTML content for modal body
 * @param {Array}  [actions] - Array of {label, class, onClick} for footer buttons
 * @returns {HTMLElement} the modal element
 */
function renderModal(title, body, actions = []) {
  closeModal(); // close any existing modal

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';

  const footerBtns = actions
    .map(a => `<button class="btn ${a.class || 'btn--ghost'}" data-action="${a.label}">${a.label}</button>`)
    .join('');

  overlay.innerHTML = `
    <div class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <div class="modal__header">
        <h3 class="modal__title" id="modal-title">${title}</h3>
        <button class="modal__close" aria-label="Close modal">&times;</button>
      </div>
      <div class="modal__body">${body}</div>
      ${actions.length ? `<div class="modal__footer">${footerBtns}</div>` : ''}
    </div>
  `;

  overlay.querySelector('.modal__close').addEventListener('click', closeModal);
  overlay.addEventListener('click', e => { if (e.target === overlay) closeModal(); });

  actions.forEach(a => {
    const btn = overlay.querySelector(`[data-action="${a.label}"]`);
    if (btn && a.onClick) btn.addEventListener('click', a.onClick);
  });

  document.body.appendChild(overlay);
  document.body.style.overflow = 'hidden';
  activeModal = overlay;

  return overlay;
}

function closeModal() {
  if (activeModal) {
    activeModal.remove();
    activeModal = null;
    document.body.style.overflow = '';
  }
}

/* ═══════════════════════════════════════
   LOADER
   ═══════════════════════════════════════ */
let loaderOverlay = null;

function renderLoader() {
  if (loaderOverlay) return;
  loaderOverlay = document.createElement('div');
  loaderOverlay.className = 'loader-overlay';
  loaderOverlay.innerHTML = '<div class="loader"></div>';
  document.body.appendChild(loaderOverlay);
}

function hideLoader() {
  if (loaderOverlay) {
    loaderOverlay.remove();
    loaderOverlay = null;
  }
}

/* ═══════════════════════════════════════
   POSITION BADGE
   ═══════════════════════════════════════ */
const GK_POSITIONS  = ['GK'];
const DEF_POSITIONS = ['CB', 'LB', 'RB'];
const MID_POSITIONS = ['CDM', 'CM', 'CAM'];
const FWD_POSITIONS = ['LW', 'RW', 'ST'];

/**
 * Returns HTML for a colored position badge.
 * @param {string} position - e.g. 'GK', 'CB', 'CM', 'ST'
 */
function positionBadge(position) {
  let cls = 'badge--fwd';
  if (GK_POSITIONS.includes(position))  cls = 'badge--gk';
  if (DEF_POSITIONS.includes(position)) cls = 'badge--def';
  if (MID_POSITIONS.includes(position)) cls = 'badge--mid';
  return `<span class="badge ${cls}">${position}</span>`;
}

/**
 * Returns group label for a position.
 */
function positionGroup(position) {
  if (GK_POSITIONS.includes(position))  return 'GK';
  if (DEF_POSITIONS.includes(position)) return 'DEF';
  if (MID_POSITIONS.includes(position)) return 'MID';
  return 'FWD';
}

/* ═══════════════════════════════════════
   VERIFIED BADGE
   ═══════════════════════════════════════ */
/**
 * Returns HTML for the verified club badge.
 */
function verifiedBadge() {
  return `<span class="badge badge--verified">🛡 Verified</span>`;
}

/* ═══════════════════════════════════════
   PROGRESS RING
   ═══════════════════════════════════════ */
/**
 * Creates a circular progress ring SVG.
 * @param {number} pct - 0 to 100
 * @param {number} size - diameter in px
 */
function renderProgressRing(pct, size = 100) {
  const r = (size / 2) - 8;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;

  return `
    <div class="progress-ring" style="width:${size}px;height:${size}px;">
      <svg width="${size}" height="${size}">
        <circle class="progress-ring__bg" cx="${size/2}" cy="${size/2}" r="${r}"/>
        <circle class="progress-ring__fill"
          cx="${size/2}" cy="${size/2}" r="${r}"
          stroke-dasharray="${circ}"
          stroke-dashoffset="${offset}"
        />
      </svg>
      <span class="progress-ring__label">${pct}%</span>
    </div>
  `;
}

/* ═══════════════════════════════════════
   SKILL BAR
   ═══════════════════════════════════════ */
/**
 * Renders a gold skill bar.
 * @param {string} label - skill name
 * @param {number} value - 0 to 100
 */
function renderSkillBar(label, value) {
  return `
    <div class="skill-bar">
      <div class="skill-bar__header">
        <span class="skill-bar__label">${label}</span>
        <span class="skill-bar__value">${value}</span>
      </div>
      <div class="skill-bar__track">
        <div class="skill-bar__fill" style="width:${value}%"></div>
      </div>
    </div>
  `;
}

/* ═══════════════════════════════════════
   EMPTY STATE
   ═══════════════════════════════════════ */
function renderEmptyState(icon, title, text, actionHtml = '') {
  return `
    <div class="empty-state">
      <div class="empty-state__icon">${icon}</div>
      <div class="empty-state__title">${title}</div>
      <p class="empty-state__text">${text}</p>
      ${actionHtml ? `<div style="margin-top:var(--sp-6)">${actionHtml}</div>` : ''}
    </div>
  `;
}

/* ═══════════════════════════════════════
   PAGINATION
   ═══════════════════════════════════════ */
/**
 * Renders pagination controls.
 * @param {number} current - current page (1-indexed)
 * @param {number} total   - total pages
 * @param {Function} onPage - callback(pageNumber)
 */
function renderPagination(current, total, onPage) {
  if (total <= 1) return '';
  let html = '<div class="pagination">';

  if (current > 1) {
    html += `<button class="pagination__btn" onclick="(${onPage.toString()})(${current-1})">&lsaquo;</button>`;
  }

  for (let i = 1; i <= total; i++) {
    if (total > 7) {
      if (i !== 1 && i !== total && Math.abs(i - current) > 2) {
        if (i === 2 || i === total - 1) html += `<span style="color:var(--text-secondary);padding:0 4px">…</span>`;
        continue;
      }
    }
    html += `<button class="pagination__btn ${i === current ? 'active' : ''}" onclick="(${onPage.toString()})(${i})">${i}</button>`;
  }

  if (current < total) {
    html += `<button class="pagination__btn" onclick="(${onPage.toString()})(${current+1})">&rsaquo;</button>`;
  }

  html += '</div>';
  return html;
}

/* ═══════════════════════════════════════
   PLAYER CARD
   ═══════════════════════════════════════ */
/**
 * Renders a player card for grid display.
 * @param {Object} player - player data object
 */
function renderPlayerCard(player) {
  const photo = player.photo_url
    ? `<img src="${player.photo_url}" class="player-card__photo" alt="${player.full_name}" loading="lazy">`
    : `<div class="player-card__photo-placeholder">⚽</div>`;

  const age = player.date_of_birth
    ? Math.floor((Date.now() - new Date(player.date_of_birth)) / 3.156e10)
    : '—';

  return `
    <div class="player-card animate-fade-up" onclick="window.location.href='/player/view.html?id=${player.id}'">
      ${photo}
      <div class="player-card__body">
        <div class="player-card__name">${escapeHtml(player.full_name)}</div>
        <div class="player-card__meta">
          ${positionBadge(player.position_primary)}
          <span class="player-card__stat">📍 ${escapeHtml(player.nationality)}</span>
          <span class="player-card__stat">🎂 ${age}</span>
          ${player.height_cm ? `<span class="player-card__stat">📏 ${player.height_cm}cm</span>` : ''}
        </div>
        <a href="/player/view.html?id=${player.id}" class="btn btn--outline btn--sm btn--full">View Profile</a>
      </div>
    </div>
  `;
}

/* ═══════════════════════════════════════
   UTILITIES
   ═══════════════════════════════════════ */
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric'
  });
}

function calcAge(dob) {
  if (!dob) return null;
  return Math.floor((Date.now() - new Date(dob)) / 3.156e10);
}

/**
 * Logout handler — clears session and redirects.
 */
function handleLogout() {
  renderModal(
    'Log Out',
    '<p>Are you sure you want to log out of GOG?</p>',
    [
      {
        label: 'Log Out',
        class: 'btn--danger',
        onClick: () => {
          fetch('/api/auth/logout.php', { method: 'POST', credentials: 'include' })
            .finally(() => {
              sessionStorage.clear();
              localStorage.removeItem('gog_user');
              window.location.href = '/login.html';
            });
        }
      },
      { label: 'Cancel', class: 'btn--ghost', onClick: closeModal }
    ]
  );
}

/* ═══════════════════════════════════════
   SESSION CHECK
   ═══════════════════════════════════════ */
/**
 * Checks if user is logged in with required role.
 * Redirects to login if not authenticated.
 * @param {string|string[]} requiredRole
 * @returns {Object|null} user object
 */
async function requireAuth(requiredRole) {
  try {
    const res = await fetch('/api/auth/me.php', { credentials: 'include' });
    if (!res.ok) throw new Error('Not authenticated');
    const user = await res.json();
    if (!user || !user.id) throw new Error('No user');

    const roles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
    if (requiredRole && !roles.includes(user.role)) {
      window.location.href = '/login.html';
      return null;
    }
    return user;
  } catch {
    window.location.href = '/login.html';
    return null;
  }
}

/* ═══════════════════════════════════════
   API HELPER
   ═══════════════════════════════════════ */
/**
 * Wrapper around fetch for API calls with CSRF and credentials.
 */
async function apiRequest(url, options = {}) {
  const defaults = {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
  };

  // Don't set Content-Type for FormData (browser sets it with boundary)
  if (options.body instanceof FormData) {
    delete defaults.headers['Content-Type'];
  }

  const res = await fetch(url, { ...defaults, ...options });
  const contentType = res.headers.get('content-type') || '';

  let data;
  if (contentType.includes('application/json')) {
    data = await res.json();
  } else {
    data = { message: await res.text() };
  }

  if (!res.ok) {
    throw new Error(data.message || `HTTP ${res.status}`);
  }

  return data;
}

// Keyboard shortcut: Escape closes modal
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeModal();
});

// Stagger animation for cards
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.animate-fade-up').forEach((el, i) => {
    el.style.animationDelay = `${i * 0.05}s`;
  });
});
