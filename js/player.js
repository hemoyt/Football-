/**
 * GOG — Player JS
 * Handles player profile builder and dashboard.
 */

'use strict';

/* ═══════════════════════════════════════
   PROFILE BUILDER
   ═══════════════════════════════════════ */

// Photo upload preview
function initPhotoUpload() {
  const area  = document.getElementById('photo-upload-area');
  const input = document.getElementById('photo-input');
  const img   = document.getElementById('photo-preview');

  if (!area || !input) return;

  area.addEventListener('click', () => input.click());

  input.addEventListener('change', () => {
    const file = input.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      renderToast('Please select a valid image file.', 'error');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      renderToast('Image must be under 5MB.', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = e => {
      if (img) { img.src = e.target.result; img.style.display = 'block'; }
    };
    reader.readAsDataURL(file);
  });
}

// Skills sliders
function initSkillSliders() {
  document.querySelectorAll('.skill-slider').forEach(slider => {
    const valEl = document.getElementById(`val-${slider.id}`);
    const update = () => {
      const v = slider.value;
      if (valEl) valEl.textContent = v;
      slider.style.setProperty('--val', `${v}%`);
    };
    slider.addEventListener('input', update);
    update();
  });
}

// Career history rows
let careerRows = [];

function initCareerHistory() {
  const container = document.getElementById('career-rows');
  const addBtn    = document.getElementById('add-career-row');

  if (!container || !addBtn) return;

  // Load existing entries from API
  loadCareerHistory();

  addBtn.addEventListener('click', () => addCareerRow());
}

function addCareerRow(data = {}) {
  const container = document.getElementById('career-rows');
  if (!container) return;

  const rowId = Date.now();
  const row = document.createElement('div');
  row.className = 'career-row';
  row.dataset.id = data.id || '';
  row.innerHTML = `
    <input class="form-input" type="text"   name="club_name"   placeholder="Club Name"   value="${escapeHtml(data.club_name  || '')}" required>
    <input class="form-input" type="text"   name="season"      placeholder="2023/2024"   value="${escapeHtml(data.season     || '')}">
    <input class="form-input" type="number" name="appearances" placeholder="Apps"        value="${data.appearances || ''}" min="0" max="200">
    <input class="form-input" type="number" name="goals"       placeholder="Goals"       value="${data.goals       || ''}" min="0" max="200">
    <input class="form-input" type="number" name="assists"     placeholder="Assists"     value="${data.assists     || ''}" min="0" max="200">
    <button type="button" class="btn btn--ghost btn--sm remove-career-row" title="Remove row">✕</button>
  `;

  row.querySelector('.remove-career-row').addEventListener('click', () => {
    row.remove();
  });

  container.appendChild(row);
}

async function loadCareerHistory() {
  try {
    const data = await apiRequest('/api/player/career.php');
    data.forEach(entry => addCareerRow(entry));
  } catch {
    // New profile — no career yet
  }
}

function collectCareerRows() {
  const rows = document.querySelectorAll('#career-rows .career-row');
  return Array.from(rows).map(row => ({
    id:          row.dataset.id || null,
    club_name:   row.querySelector('[name="club_name"]').value.trim(),
    season:      row.querySelector('[name="season"]').value.trim(),
    appearances: parseInt(row.querySelector('[name="appearances"]').value) || 0,
    goals:       parseInt(row.querySelector('[name="goals"]').value)       || 0,
    assists:     parseInt(row.querySelector('[name="assists"]').value)     || 0,
  })).filter(r => r.club_name);
}

// Video section
function initVideoSection() {
  const addBtn = document.getElementById('add-video-btn');
  const list   = document.getElementById('videos-list');

  if (!addBtn || !list) return;

  loadPlayerVideos();

  addBtn.addEventListener('click', () => {
    const url = prompt('Paste YouTube or Vimeo URL (or leave blank to upload a file):');
    if (url === null) return;

    if (url) {
      addVideoCard({ video_type: detectVideoType(url), video_url: url, title: 'Highlight reel' });
    } else {
      document.getElementById('video-file-input')?.click();
    }
  });

  const fileInput = document.getElementById('video-file-input');
  if (fileInput) {
    fileInput.addEventListener('change', async () => {
      const file = fileInput.files[0];
      if (!file) return;
      if (file.size > 500 * 1024 * 1024) {
        renderToast('Video must be under 500MB.', 'error');
        return;
      }
      renderToast('Uploading video…', 'info');
      const fd = new FormData();
      fd.append('video', file);
      try {
        const res = await apiRequest('/api/player/upload-video.php', { method: 'POST', body: fd, headers: {} });
        addVideoCard({ video_type: 'upload', video_url: res.url, title: file.name });
        renderToast('Video uploaded!', 'success');
      } catch (err) {
        renderToast(err.message || 'Upload failed.', 'error');
      }
    });
  }
}

function detectVideoType(url) {
  if (url.includes('youtube') || url.includes('youtu.be')) return 'youtube';
  if (url.includes('vimeo')) return 'vimeo';
  return 'upload';
}

async function loadPlayerVideos() {
  try {
    const data = await apiRequest('/api/player/videos.php');
    data.forEach(v => addVideoCard(v));
  } catch { /* empty */ }
}

function addVideoCard(video) {
  const list = document.getElementById('videos-list');
  if (!list) return;

  const card = document.createElement('div');
  card.className = 'video-card';
  card.dataset.videoUrl = video.video_url;
  card.dataset.videoType = video.video_type;

  const icon = video.video_type === 'youtube' ? '▶' :
               video.video_type === 'vimeo'   ? '▶' : '🎬';

  card.innerHTML = `
    <div class="video-card__thumb" onclick="openVideoModal('${escapeHtml(video.video_url)}', '${video.video_type}')">
      ${icon}
    </div>
    <div class="video-card__info">
      <div class="video-card__title">${escapeHtml(video.title || 'Video')}</div>
      <div class="video-card__type">${video.video_type}</div>
    </div>
  `;

  list.appendChild(card);
}

function openVideoModal(url, type) {
  let embedHtml;
  if (type === 'youtube') {
    const id = extractYouTubeId(url);
    embedHtml = `<iframe width="100%" height="315" src="https://www.youtube.com/embed/${id}" frameborder="0" allowfullscreen></iframe>`;
  } else if (type === 'vimeo') {
    const id = url.split('/').pop();
    embedHtml = `<iframe width="100%" height="315" src="https://player.vimeo.com/video/${id}" frameborder="0" allowfullscreen></iframe>`;
  } else {
    embedHtml = `<video src="${escapeHtml(url)}" controls style="width:100%;border-radius:8px"></video>`;
  }

  renderModal('Video', embedHtml);
}

function extractYouTubeId(url) {
  const match = url.match(/(?:v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  return match ? match[1] : '';
}

/* ═══════════════════════════════════════
   SAVE PROFILE
   ═══════════════════════════════════════ */
async function handleSaveProfile(e) {
  e.preventDefault();
  const form = e.target;

  const fd = new FormData();

  // Bio
  fd.append('bio', form.querySelector('#bio')?.value || '');

  // Social
  fd.append('instagram_url', form.querySelector('#instagram_url')?.value || '');
  fd.append('youtube_url',   form.querySelector('#youtube_url')?.value   || '');

  // Skills
  ['speed','dribbling','shooting','passing','defending','heading'].forEach(skill => {
    const el = document.getElementById(`skill-${skill}`);
    if (el) fd.append(skill, el.value);
  });

  // Photo
  const photoInput = document.getElementById('photo-input');
  if (photoInput?.files[0]) fd.append('photo', photoInput.files[0]);

  // Career
  fd.append('career', JSON.stringify(collectCareerRows()));

  const btn = form.querySelector('[type="submit"]');
  btn.disabled = true;
  renderLoader();

  try {
    await apiRequest('/api/player/save-profile.php', { method: 'POST', body: fd, headers: {} });
    hideLoader();
    renderToast('Profile saved successfully!', 'success');
    btn.disabled = false;
  } catch (err) {
    hideLoader();
    renderToast(err.message || 'Failed to save profile.', 'error');
    btn.disabled = false;
  }
}

/* ═══════════════════════════════════════
   DASHBOARD
   ═══════════════════════════════════════ */
async function loadPlayerDashboard() {
  renderLoader();
  try {
    const [profile, requests, stats] = await Promise.all([
      apiRequest('/api/player/profile.php'),
      apiRequest('/api/player/contact-requests.php'),
      apiRequest('/api/player/stats.php'),
    ]);
    hideLoader();

    renderDashboardProfile(profile);
    renderContactRequests(requests);
    renderPlayerStats(stats);

  } catch (err) {
    hideLoader();
    renderToast('Failed to load dashboard data.', 'error');
  }
}

function renderDashboardProfile(profile) {
  const el = document.getElementById('sidebar-name');
  if (el) el.textContent = profile.full_name;

  const posEl = document.getElementById('sidebar-position');
  if (posEl) posEl.innerHTML = positionBadge(profile.position_primary);

  const photoEl = document.getElementById('sidebar-photo');
  if (photoEl && profile.photo_url) {
    photoEl.src = profile.photo_url;
    photoEl.style.display = 'block';
  }

  // Profile completion
  const fields = ['full_name','bio','photo_url','instagram_url','youtube_url'];
  const filled = fields.filter(f => profile[f]).length;
  const pct = Math.round((filled / fields.length) * 100);

  const ringEl = document.getElementById('completion-ring');
  if (ringEl) ringEl.innerHTML = renderProgressRing(pct, 80);

  const pctEl = document.getElementById('completion-pct');
  if (pctEl) pctEl.textContent = `${pct}% complete`;
}

function renderContactRequests(requests) {
  const container = document.getElementById('contact-requests');
  if (!container) return;

  if (!requests.length) {
    container.innerHTML = renderEmptyState('📬', 'No Requests Yet', 'When verified clubs send you contact requests, they will appear here.');
    return;
  }

  container.innerHTML = requests.map(req => `
    <div class="request-card animate-fade-up" data-id="${req.id}">
      <div class="request-card__logo">🏟</div>
      <div class="request-card__info">
        <div class="request-card__name">${escapeHtml(req.club_name)} ${verifiedBadge()}</div>
        <div class="request-card__date">${formatDate(req.sent_at)}</div>
        ${req.message ? `<p style="font-size:0.85rem;color:var(--text-secondary);margin-top:4px">${escapeHtml(req.message)}</p>` : ''}
      </div>
      <div class="request-card__actions">
        ${req.status === 'pending' ? `
          <button class="btn btn--success btn--sm" onclick="respondRequest(${req.id},'accepted')">Accept</button>
          <button class="btn btn--danger btn--sm"  onclick="respondRequest(${req.id},'declined')">Decline</button>
        ` : `<span class="badge badge--${req.status === 'accepted' ? 'success' : 'rejected'}">${req.status}</span>`}
      </div>
    </div>
  `).join('');
}

async function respondRequest(requestId, status) {
  try {
    await apiRequest('/api/player/respond-request.php', {
      method: 'POST',
      body: JSON.stringify({ request_id: requestId, status }),
    });
    renderToast(`Request ${status}.`, status === 'accepted' ? 'success' : 'info');
    // Refresh
    const requests = await apiRequest('/api/player/contact-requests.php');
    renderContactRequests(requests);
  } catch (err) {
    renderToast(err.message || 'Failed to update request.', 'error');
  }
}

function renderPlayerStats(stats) {
  const viewsEl = document.getElementById('profile-views');
  if (viewsEl) viewsEl.textContent = stats.profile_views || 0;

  const requestsEl = document.getElementById('total-requests');
  if (requestsEl) requestsEl.textContent = stats.total_requests || 0;
}

/* ═══════════════════════════════════════
   INIT
   ═══════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', async () => {
  const page = document.body.dataset.page;

  if (page === 'player-profile-builder') {
    const user = await requireAuth('player');
    if (!user) return;
    renderNavbar('player');
    initPhotoUpload();
    initSkillSliders();
    initCareerHistory();
    initVideoSection();

    // Load existing profile data
    try {
      const profile = await apiRequest('/api/player/profile.php');
      if (profile.bio) document.getElementById('bio').value = profile.bio;
      if (profile.instagram_url) document.getElementById('instagram_url').value = profile.instagram_url;
      if (profile.youtube_url)   document.getElementById('youtube_url').value   = profile.youtube_url;
      if (profile.photo_url) {
        const img = document.getElementById('photo-preview');
        if (img) { img.src = profile.photo_url; img.style.display = 'block'; }
      }
    } catch { /* new profile */ }

    const form = document.getElementById('profile-form');
    if (form) form.addEventListener('submit', handleSaveProfile);
  }

  if (page === 'player-dashboard') {
    const user = await requireAuth('player');
    if (!user) return;
    renderNavbar('player');
    loadPlayerDashboard();
    initTabs();
  }
});

/* Simple tab init */
function initTabs() {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const panel = btn.dataset.panel;
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById(panel)?.classList.add('active');
    });
  });

  // Activate first tab
  document.querySelector('.tab-btn')?.click();
}
