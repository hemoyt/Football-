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

    if (countEl) countEl.textContent = `${total} لاعب${total !== 1 ? '' : ''} في النتائج`;

    if (!players.length) {
      if (grid) grid.innerHTML = renderEmptyState('⚽', 'لم يتم العثور على لاعبين', 'جرّب تعديل فلاتر البحث للعثور على المزيد.');
    } else {
      if (grid) grid.innerHTML = players.map(p => renderPlayerCard(p)).join('');
    }

    if (pagEl) pagEl.innerHTML = renderPagination(currentPage, totalPages, searchPlayers);

  } catch (err) {
    if (grid) grid.innerHTML = renderEmptyState('❌', 'فشل البحث', err.message || 'تعذّر تحميل اللاعبين. حاول مرة أخرى.');
    renderToast('فشل البحث عن اللاعبين.', 'error');
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
      container.innerHTML = renderEmptyState('🔖', 'لا يوجد لاعبون محفوظون', 'احفظ اللاعبين من نتائج البحث لمراجعتهم هنا.');
      return;
    }

    container.innerHTML = `<div class="saved-list">${players.map(p => renderSavedPlayerCard(p)).join('')}</div>`;

  } catch {
    container.innerHTML = renderEmptyState('❌', 'فشل التحميل', 'تعذّر تحميل اللاعبين المحفوظين.');
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
          <a href="/player/view.html?id=${player.id}" class="btn btn--outline btn--sm" style="flex:1">عرض الملف</a>
          <button class="btn btn--ghost btn--sm" onclick="unsavePlayer('${player.id}', this)" title="إزالة الحفظ">🔖</button>
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
    renderToast('تم حفظ اللاعب! ✓', 'success');
    if (btn) { btn.textContent = '🔖 تم الحفظ'; btn.disabled = true; }
  } catch (err) {
    renderToast(err.message || 'فشل حفظ اللاعب.', 'error');
  }
}

async function unsavePlayer(playerId, btn) {
  try {
    await apiRequest('/api/club/unsave-player.php', {
      method: 'POST',
      body: JSON.stringify({ player_id: playerId }),
    });
    renderToast('تمت إزالة اللاعب من المحفوظات.', 'info');
    btn?.closest('.player-card')?.remove();
  } catch (err) {
    renderToast(err.message || 'فشل إزالة اللاعب.', 'error');
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
      container.innerHTML = renderEmptyState('📤', 'لم يتم إرسال أي طلبات', 'تواصل مع اللاعبين من صفحات ملفاتهم الشخصية.');
      return;
    }

    const statusMap = { accepted: 'مقبول', declined: 'مرفوض', pending: 'قيد الانتظار' };
    const badgeMap  = { accepted: 'success', declined: 'rejected', pending: 'pending' };

    container.innerHTML = requests.map(req => `
      <div class="request-card animate-fade-up">
        <div class="request-card__logo">⚽</div>
        <div class="request-card__info">
          <div class="request-card__name">${escapeHtml(req.player_name)}</div>
          <div class="request-card__date">أُرسل ${formatDate(req.sent_at)}</div>
        </div>
        <div>
          <span class="badge badge--${badgeMap[req.status] || 'pending'}">
            ${statusMap[req.status] || req.status}
          </span>
        </div>
      </div>
    `).join('');
  } catch {
    container.innerHTML = renderEmptyState('❌', 'فشل التحميل', 'تعذّر تحميل الطلبات.');
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

    renderToast('تم إرسال طلب التواصل! ✓', 'success');

    if (btn) {
      btn.textContent = 'تم الإرسال ✓';
      btn.className = 'btn btn--outline';
      btn.disabled = true;
    }
  } catch (err) {
    renderToast(err.message || 'فشل إرسال الطلب.', 'error');
    if (btn) btn.disabled = false;
  }
}

function promptMessage() {
  return new Promise(resolve => {
    const body = `
      <div class="form-group">
        <label class="form-label">رسالة (اختياري)</label>
        <textarea class="form-textarea" id="contact-message" placeholder="عرّف ناديك وسبب اهتمامك بهذا اللاعب…" maxlength="500"></textarea>
        <span class="form-hint">الحد الأقصى 500 حرف</span>
      </div>
    `;

    renderModal('إرسال طلب تواصل', body, [
      {
        label: 'إرسال الطلب',
        class: 'btn--primary',
        onClick: () => {
          const msg = document.getElementById('contact-message')?.value || '';
          closeModal();
          resolve(msg);
        }
      },
      {
        label: 'إلغاء',
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

    // Load club profile (auto-verify for localStorage demo)
    try {
      const club = await apiRequest('/api/club/profile.php');
      // For localStorage demo, auto-verify clubs after they register
      if (club.verification_status === 'pending') {
        club.verification_status = 'verified';
        GOG_DB.upsertClub(club);
      }
      if (club.verification_status !== 'verified') {
        window.location.href = '/club/pending.html';
        return;
      }

      const nameEl = document.getElementById('club-name');
      if (nameEl) nameEl.textContent = club.club_name || 'النادي';

      const countryEl = document.getElementById('club-country');
      if (countryEl) countryEl.textContent = club.country || '';

      const badgeEl = document.getElementById('club-verified-badge');
      if (badgeEl) badgeEl.innerHTML = verifiedBadge();

    } catch {
      window.location.href = '/club/pending.html';
      return;
    }

    renderNavbar('club');
    searchPlayers(1);

    ['filter-position','filter-nationality','filter-foot','filter-age-min','filter-age-max'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.addEventListener('change', () => searchPlayers(1));
    });
  }

  if (page === 'view-player') {
    const user = await requireAuth('club');
    if (!user) return;
    renderNavbar('club');
    loadPlayerPublicProfile();
  }
});
