/**
 * GOG — Club JS
 * Handles club dashboard: player search, saved players, contact requests.
 */

'use strict';

const POSITIONS = ['GK','CB','LB','RB','CDM','CM','CAM','LW','RW','ST'];
const PER_PAGE  = 20;

let currentPage    = 1;
let totalPages     = 1;
let activeFilters  = {};

/* ═══════════════════════════════════════
   PLAYER SEARCH
   ═══════════════════════════════════════ */
async function searchPlayers(page = 1) {
  currentPage = page;

  const position    = document.getElementById('filter-position')?.value    || '';
  const nationality = document.getElementById('filter-nationality')?.value || '';
  const foot        = document.getElementById('filter-foot')?.value        || '';
  const ageMin      = document.getElementById('filter-age-min')?.value     || '';
  const ageMax      = document.getElementById('filter-age-max')?.value     || '';
  const heightMin   = document.getElementById('filter-height-min')?.value  || '';

  activeFilters = { position, nationality, foot, ageMin, ageMax, heightMin };

  const params = new URLSearchParams({
    page,
    per_page: PER_PAGE,
    ...(position    && { position }),
    ...(nationality && { nationality }),
    ...(foot        && { foot }),
    ...(ageMin      && { age_min: ageMin }),
    ...(ageMax      && { age_max: ageMax }),
    ...(heightMin   && { height_min: heightMin }),
  });

  const grid    = document.getElementById('players-grid');
  const countEl = document.getElementById('results-count');
  const pagEl   = document.getElementById('pagination');

  if (grid) {
    grid.innerHTML = '<div class="flex-center" style="padding:var(--sp-16)"><div class="loader"></div></div>';
  }

  try {
    const res = await apiRequest(`/api/club/search-players.php?${params}`);
    const { players, total, pages } = res;
    totalPages = pages;

    if (countEl) countEl.textContent = `${total} player${total !== 1 ? 's' : ''} found`;

    if (!players.length) {
      if (grid) grid.innerHTML = renderEmptyState('⚽', 'No Players Found', 'Try adjusting your filters to find more players.');
    } else {
      if (grid) grid.innerHTML = players.map(p => renderPlayerCard(p)).join('');
    }

    if (pagEl) pagEl.innerHTML = renderPagination(currentPage, totalPages, searchPlayers);

  } catch (err) {
    if (grid) grid.innerHTML = renderEmptyState('❌', 'Search Failed', err.message || 'Unable to load players. Please try again.');
    renderToast('Failed to search players.', 'error');
  }
}

/* ═══════════════════════════════════════
   SAVED PLAYERS
   ═══════════════════════════════════════ */
async function loadSavedPlayers() {
  const container = document.getElementById('saved-players');
  if (!container) return;

  try {
    const players = await apiRequest('/api/club/saved-players.php');

    if (!players.length) {
      container.innerHTML = renderEmptyState('🔖', 'No Saved Players', 'Bookmark players from search results to view them here.');
      return;
    }

    container.innerHTML = `<div class="saved-list">${players.map(p => renderSavedPlayerCard(p)).join('')}</div>`;

  } catch {
    container.innerHTML = renderEmptyState('❌', 'Failed to Load', 'Unable to load saved players.');
  }
}

function renderSavedPlayerCard(player) {
  const age = player.date_of_birth
    ? Math.floor((Date.now() - new Date(player.date_of_birth)) / 3.156e10)
    : '—';

  return `
    <div class="player-card animate-fade-up">
      ${player.photo_url
        ? `<img src="${player.photo_url}" class="player-card__photo" alt="${escapeHtml(player.full_name)}">`
        : `<div class="player-card__photo-placeholder">⚽</div>`}
      <div class="player-card__body">
        <div class="player-card__name">${escapeHtml(player.full_name)}</div>
        <div class="player-card__meta">
          ${positionBadge(player.position_primary)}
          <span class="player-card__stat">📍 ${escapeHtml(player.nationality)}</span>
          <span class="player-card__stat">🎂 ${age}</span>
        </div>
        <div style="display:flex;gap:8px">
          <a href="/player/view.html?id=${player.id}" class="btn btn--outline btn--sm" style="flex:1">View</a>
          <button class="btn btn--ghost btn--sm" onclick="unsavePlayer(${player.id}, this)" title="Remove bookmark">🔖</button>
        </div>
      </div>
    </div>
  `;
}

async function savePlayer(playerId, btn) {
  try {
    await apiRequest('/api/club/save-player.php', {
      method: 'POST',
      body: JSON.stringify({ player_id: playerId }),
    });
    renderToast('Player saved!', 'success');
    if (btn) { btn.textContent = '🔖 Saved'; btn.disabled = true; }
  } catch (err) {
    renderToast(err.message || 'Failed to save player.', 'error');
  }
}

async function unsavePlayer(playerId, btn) {
  try {
    await apiRequest('/api/club/unsave-player.php', {
      method: 'POST',
      body: JSON.stringify({ player_id: playerId }),
    });
    renderToast('Player removed from saved list.', 'info');
    btn?.closest('.player-card')?.remove();
  } catch (err) {
    renderToast(err.message || 'Failed to remove player.', 'error');
  }
}

/* ═══════════════════════════════════════
   CONTACT REQUESTS (sent by club)
   ═══════════════════════════════════════ */
async function loadSentRequests() {
  const container = document.getElementById('sent-requests');
  if (!container) return;

  try {
    const requests = await apiRequest('/api/club/contact-requests.php');

    if (!requests.length) {
      container.innerHTML = renderEmptyState('📤', 'No Requests Sent', 'Contact players from their profile pages.');
      return;
    }

    container.innerHTML = `
      <div class="requests-list">
        ${requests.map(req => `
          <div class="request-card animate-fade-up">
            <div class="request-card__logo">⚽</div>
            <div class="request-card__info">
              <div class="request-card__name">${escapeHtml(req.player_name)}</div>
              <div class="request-card__date">Sent ${formatDate(req.sent_at)}</div>
            </div>
            <div>
              <span class="badge badge--${req.status === 'accepted' ? 'success' : req.status === 'declined' ? 'rejected' : 'pending'}">
                ${req.status}
              </span>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  } catch {
    container.innerHTML = renderEmptyState('❌', 'Failed to Load', 'Unable to load contact requests.');
  }
}

/* ═══════════════════════════════════════
   SEND CONTACT REQUEST (from view-player page)
   ═══════════════════════════════════════ */
async function sendContactRequest(playerId) {
  const message = await promptMessage();
  if (message === null) return; // cancelled

  const btn = document.getElementById('contact-request-btn');
  if (btn) btn.disabled = true;

  try {
    await apiRequest('/api/club/send-request.php', {
      method: 'POST',
      body: JSON.stringify({ player_id: playerId, message }),
    });

    renderToast('Contact request sent!', 'success');

    if (btn) {
      btn.textContent = 'Request Sent ✓';
      btn.className = 'btn btn--outline';
      btn.disabled = true;
    }
  } catch (err) {
    renderToast(err.message || 'Failed to send request.', 'error');
    if (btn) btn.disabled = false;
  }
}

function promptMessage() {
  return new Promise(resolve => {
    const body = `
      <div class="form-group">
        <label class="form-label">Message (optional)</label>
        <textarea class="form-textarea" id="contact-message" placeholder="Introduce your club and why you're interested…" maxlength="500"></textarea>
        <span class="form-hint">Max 500 characters</span>
      </div>
    `;

    renderModal('Send Contact Request', body, [
      {
        label: 'Send Request',
        class: 'btn--primary',
        onClick: () => {
          const msg = document.getElementById('contact-message')?.value || '';
          closeModal();
          resolve(msg);
        }
      },
      {
        label: 'Cancel',
        class: 'btn--ghost',
        onClick: () => { closeModal(); resolve(null); }
      }
    ]);
  });
}

/* ═══════════════════════════════════════
   PLAYER PUBLIC PROFILE PAGE (view-player)
   ═══════════════════════════════════════ */
async function loadPlayerPublicProfile() {
  const params = new URLSearchParams(window.location.search);
  const playerId = params.get('id');

  if (!playerId) {
    window.location.href = '/club/dashboard.html';
    return;
  }

  renderLoader();
  try {
    const [profile, skills, career, videos] = await Promise.all([
      apiRequest(`/api/player/public-profile.php?id=${playerId}`),
      apiRequest(`/api/player/skills.php?id=${playerId}`),
      apiRequest(`/api/player/career.php?id=${playerId}`),
      apiRequest(`/api/player/videos.php?id=${playerId}`),
    ]);
    hideLoader();

    renderPublicProfile(profile, skills, career, videos);

    // Check if request already sent
    try {
      const reqStatus = await apiRequest(`/api/club/request-status.php?player_id=${playerId}`);
      const btn = document.getElementById('contact-request-btn');
      if (btn && reqStatus.status) {
        btn.textContent = 'Request Sent ✓';
        btn.disabled = true;
        btn.className = 'btn btn--outline';
      }
    } catch { /* no existing request */ }

  } catch (err) {
    hideLoader();
    renderToast(err.message || 'Failed to load player profile.', 'error');
  }
}

function renderPublicProfile(profile, skills, career, videos) {
  const age = profile.date_of_birth
    ? Math.floor((Date.now() - new Date(profile.date_of_birth)) / 3.156e10)
    : '—';

  // Header
  const nameEl = document.getElementById('player-name');
  if (nameEl) nameEl.textContent = profile.full_name;

  const posEl = document.getElementById('player-position');
  if (posEl) posEl.innerHTML = positionBadge(profile.position_primary)
    + (profile.position_secondary ? ' ' + positionBadge(profile.position_secondary) : '');

  const photoEl = document.getElementById('player-photo');
  if (photoEl && profile.photo_url) {
    photoEl.src = profile.photo_url;
    photoEl.style.display = 'block';
    document.getElementById('player-photo-placeholder')?.style.setProperty('display','none');
  }

  const bioEl = document.getElementById('player-bio');
  if (bioEl) bioEl.textContent = profile.bio || 'No bio available.';

  // Stats
  const statsMap = {
    'stat-nationality': profile.nationality,
    'stat-age':         age,
    'stat-height':      profile.height_cm ? `${profile.height_cm} cm` : '—',
    'stat-weight':      profile.weight_kg ? `${profile.weight_kg} kg` : '—',
    'stat-foot':        profile.preferred_foot,
    'stat-country':     profile.country_residence,
  };
  Object.entries(statsMap).forEach(([id, val]) => {
    const el = document.getElementById(id);
    if (el) el.textContent = val || '—';
  });

  // Skills
  const skillsEl = document.getElementById('player-skills');
  if (skillsEl && skills) {
    skillsEl.innerHTML = Object.entries({
      Speed: skills.speed, Dribbling: skills.dribbling,
      Shooting: skills.shooting, Passing: skills.passing,
      Defending: skills.defending, Heading: skills.heading,
    }).map(([label, val]) => renderSkillBar(label, val || 50)).join('');
  }

  // Career
  const careerEl = document.getElementById('player-career');
  if (careerEl && career.length) {
    careerEl.innerHTML = `
      <div class="table-wrap">
        <table class="table">
          <thead><tr>
            <th>Club</th><th>Season</th><th>Apps</th><th>Goals</th><th>Assists</th>
          </tr></thead>
          <tbody>
            ${career.map(r => `
              <tr>
                <td>${escapeHtml(r.club_name)}</td>
                <td>${escapeHtml(r.season)}</td>
                <td>${r.appearances}</td>
                <td>${r.goals}</td>
                <td>${r.assists}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  } else if (careerEl) {
    careerEl.innerHTML = '<p style="color:var(--text-secondary)">No career history added yet.</p>';
  }

  // Videos
  const videosEl = document.getElementById('player-videos');
  if (videosEl && videos.length) {
    videosEl.innerHTML = `<div class="videos-grid">${videos.map(v => `
      <div class="video-card">
        <div class="video-card__thumb" onclick="openVideoModal('${escapeHtml(v.video_url)}', '${v.video_type}')">▶</div>
        <div class="video-card__info">
          <div class="video-card__title">${escapeHtml(v.title || 'Video')}</div>
          <div class="video-card__type">${v.video_type}</div>
        </div>
      </div>
    `).join('')}</div>`;
  }

  // Contact button
  const contactBtn = document.getElementById('contact-request-btn');
  if (contactBtn) {
    contactBtn.onclick = () => sendContactRequest(profile.id);
  }
}

/* ═══════════════════════════════════════
   INIT
   ═══════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', async () => {
  const page = document.body.dataset.page;

  if (page === 'club-dashboard') {
    const user = await requireAuth('club');
    if (!user) return;

    // Verify club is actually verified
    try {
      const club = await apiRequest('/api/club/profile.php');
      if (club.verification_status !== 'verified') {
        window.location.href = '/club/pending.html';
        return;
      }
    } catch {
      window.location.href = '/club/pending.html';
      return;
    }

    renderNavbar('club');
    initTabs();
    searchPlayers();

    // Filter listeners
    ['filter-position','filter-nationality','filter-foot','filter-age-min','filter-age-max','filter-height-min'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.addEventListener('change', () => searchPlayers(1));
    });

    const searchBtn = document.getElementById('search-btn');
    if (searchBtn) searchBtn.addEventListener('click', () => searchPlayers(1));
  }

  if (page === 'view-player') {
    const user = await requireAuth('club');
    if (!user) return;
    renderNavbar('club');
    loadPlayerPublicProfile();
  }
});
