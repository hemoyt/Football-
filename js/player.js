/**
 * Got — Player JS
 * Handles player profile builder and dashboard.
 */

'use strict';

/* ═══════════════════════════════════════
   PHOTO UPLOAD
   ═══════════════════════════════════════ */
function initPhotoUpload() {
  const area = document.getElementById('photo-upload-area');
  const input = document.getElementById('photo-input');
  const img = document.getElementById('photo-preview');

  if (!area || !input) return;

  area.addEventListener('click', () => input.click());
  area.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') input.click(); });

  input.addEventListener('change', () => {
    const file = input.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      renderToast('يرجى اختيار ملف صورة صالح.', 'error');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      renderToast('حجم الصورة يجب أن يكون أقل من 5 ميغابايت.', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = e => {
      if (img) {
        img.src = e.target.result;
        img.hidden = false;
        document.getElementById('photo-placeholder')?.style.setProperty('display', 'none');
      }
    };
    reader.readAsDataURL(file);
  });
}

/* ═══════════════════════════════════════
   SKILL SLIDERS
   ═══════════════════════════════════════ */
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

/* ═══════════════════════════════════════
   CAREER HISTORY
   ═══════════════════════════════════════ */
function initCareerHistory() {
  const container = document.getElementById('career-rows');
  const addBtn = document.getElementById('add-career-row');

  if (!container || !addBtn) return;

  loadCareerHistory();
  addBtn.addEventListener('click', () => addCareerRow());
}

function addCareerRow(data = {}) {
  const container = document.getElementById('career-rows');
  if (!container) return;

  const row = document.createElement('div');
  row.className = 'career-row';
  row.dataset.id = data.id || '';
  row.innerHTML = `
    <input class="form-input" type="text"   name="club_name"   placeholder="اسم النادي"   value="${escapeHtml(data.club_name || '')}" required>
    <input class="form-input" type="text"   name="season"      placeholder="2024/2025"    value="${escapeHtml(data.season || '')}">
    <input class="form-input" type="number" name="appearances" placeholder="م.م"          value="${data.appearances || ''}" min="0" max="200">
    <input class="form-input" type="number" name="goals"       placeholder="أهداف"        value="${data.goals || ''}" min="0" max="200">
    <input class="form-input" type="number" name="assists"     placeholder="تمريرات"      value="${data.assists || ''}" min="0" max="200">
    <button type="button" class="btn btn--ghost btn--sm remove-career-row" title="حذف السطر">✕</button>
  `;

  row.querySelector('.remove-career-row').addEventListener('click', () => row.remove());
  container.appendChild(row);
}

async function loadCareerHistory() {
  try {
    const data = await apiRequest('/api/player/career.php');
    if (Array.isArray(data)) data.forEach(entry => addCareerRow(entry));
  } catch { /* ملف جديد — لا يوجد سجل بعد */ }
}

function collectCareerRows() {
  const rows = document.querySelectorAll('#career-rows .career-row');
  return Array.from(rows).map(row => ({
    id: row.dataset.id || null,
    club_name: row.querySelector('[name="club_name"]').value.trim(),
    season: row.querySelector('[name="season"]').value.trim(),
    appearances: parseInt(row.querySelector('[name="appearances"]').value) || 0,
    goals: parseInt(row.querySelector('[name="goals"]').value) || 0,
    assists: parseInt(row.querySelector('[name="assists"]').value) || 0,
  })).filter(r => r.club_name);
}

/* ═══════════════════════════════════════
   VIDEO SECTION
   ═══════════════════════════════════════ */
function initVideoSection() {
  const addBtn = document.getElementById('add-video-btn');
  const list = document.getElementById('videos-list');

  if (!addBtn || !list) return;

  loadPlayerVideos();

  addBtn.addEventListener('click', () => {
    renderModal('رفع مقطعك!', `
      <form id="upload-video-form" style="display:flex; flex-direction:column; gap:16px;">
        <input type="text" id="vid-title" class="form-input" placeholder="عنوان المقطع" required>
        <textarea id="vid-desc" class="form-textarea" placeholder="الوصف"></textarea>
        <label class="btn btn--outline" style="text-align:center; cursor:pointer;" id="vid-lbl">
          <span id="vid-lbl-txt">☁ رفع ملف</span>
          <input type="file" id="vid-file" accept="video/*" style="display:none;">
        </label>
        <button type="submit" class="btn btn--success">نشر المقطع</button>
      </form>
    `);

    document.getElementById('vid-file').addEventListener('change', (e) => {
      const txt = document.getElementById('vid-lbl-txt');
      if (e.target.files.length > 0) {
        txt.textContent = '🎥 ' + e.target.files[0].name;
      } else {
        txt.textContent = '☁ رفع ملف';
      }
    });

    document.getElementById('upload-video-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const title = document.getElementById('vid-title').value;
      const desc = document.getElementById('vid-desc').value;
      const fileInput = document.getElementById('vid-file');
      const file = fileInput.files[0];

      if (!file) {
        renderToast('يرجى اختيار ملف فيديو.', 'error');
        return;
      }
      if (file.size > 500 * 1024 * 1024) {
        renderToast('يجب أن يكون حجم الفيديو أقل من 500 ميغابايت.', 'error');
        return;
      }

      const submitBtn = e.target.querySelector('[type="submit"]');
      submitBtn.disabled = true;
      submitBtn.textContent = 'جاري الرفع...';
      renderToast('جاري رفع الفيديو...', 'info');

      const fd = new FormData();
      fd.append('video', file);
      fd.append('title', title);
      fd.append('description', desc);

      try {
        const res = await apiRequest('/api/player/upload-video.php', { method: 'POST', body: fd, headers: {} });
        addVideoCard({ video_type: 'upload', video_url: res.url, title: title || file.name });
        renderToast('تم رفع الفيديو بنجاح!', 'success');
        closeModal();
      } catch (err) {
        renderToast(err.message || 'فشل الرفع.', 'error');
        submitBtn.disabled = false;
        submitBtn.textContent = 'نشر المقطع';
      }
    });
  });
}

function detectVideoType(url) {
  if (url.includes('youtube') || url.includes('youtu.be')) return 'youtube';
  if (url.includes('vimeo')) return 'vimeo';
  return 'upload';
}

async function loadPlayerVideos() {
  try {
    const data = await apiRequest('/api/player/videos.php');
    if (Array.isArray(data)) data.forEach(v => addVideoCard(v));
  } catch { /* لا توجد مقاطع بعد */ }
}

function addVideoCard(video) {
  const list = document.getElementById('videos-list');
  if (!list) return;

  const card = document.createElement('div');
  card.className = 'video-card';
  card.dataset.videoUrl = video.video_url;
  card.dataset.videoType = video.video_type;

  card.innerHTML = `
    <div class="video-card__thumb" onclick="openVideoModal('${escapeHtml(video.video_url)}', '${video.video_type}')">▶</div>
    <div class="video-card__info">
      <div class="video-card__title">${escapeHtml(video.title || 'مقطع')}</div>
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
  renderModal('مقطع الفيديو', embedHtml);
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

  fd.append('bio', form.querySelector('#bio')?.value || '');
  fd.append('instagram_url', form.querySelector('#instagram_url')?.value || '');
  fd.append('youtube_url', form.querySelector('#youtube_url')?.value || '');

  ['speed', 'dribbling', 'shooting', 'passing', 'defending', 'heading'].forEach(skill => {
    const el = document.getElementById(`skill-${skill}`);
    if (el) fd.append(skill, el.value);
  });

  const photoInput = document.getElementById('photo-input');
  if (photoInput?.files[0]) fd.append('photo', photoInput.files[0]);

  fd.append('career', JSON.stringify(collectCareerRows()));

  const btn = form.querySelector('[type="submit"]');
  btn.disabled = true;
  renderLoader();

  try {
    await apiRequest('/api/player/save-profile.php', { method: 'POST', body: fd, headers: {} });
    hideLoader();
    renderToast('تم حفظ الملف الشخصي بنجاح! ✓', 'success');
    btn.disabled = false;
  } catch (err) {
    hideLoader();
    renderToast(err.message || 'فشل حفظ الملف.', 'error');
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
    renderToast('فشل تحميل بيانات لوحة التحكم.', 'error');
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
    photoEl.hidden = false;
    document.getElementById('sidebar-photo-placeholder')?.style.setProperty('display', 'none');
  }

  const greetEl = document.getElementById('topbar-greeting');
  if (greetEl) greetEl.textContent = `مرحباً، ${profile.full_name.split(' ')[0]}`;

  // Profile completion
  const fields = ['full_name', 'bio', 'photo_url', 'instagram_url', 'youtube_url'];
  const filled = fields.filter(f => profile[f]).length;
  const pct = Math.round((filled / fields.length) * 100);

  const ringEl = document.getElementById('completion-ring');
  if (ringEl) ringEl.innerHTML = renderProgressRing(pct, 72);

  const pctEl = document.getElementById('completion-pct');
  if (pctEl) pctEl.textContent = `${pct}%`;
}

function renderContactRequests(requests) {
  const container = document.getElementById('contact-requests');
  if (!container) return;

  if (!requests.length) {
    container.innerHTML = renderEmptyState('📬', 'لا توجد طلبات بعد', 'عندما ترسل لك الأندية الموثقة طلبات تواصل، ستظهر هنا.');
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
          <button class="btn btn--success btn--sm" onclick="respondRequest('${req.id}','accepted')">قبول</button>
          <button class="btn btn--danger btn--sm"  onclick="respondRequest('${req.id}','declined')">رفض</button>
        ` : `<span class="badge badge--${req.status === 'accepted' ? 'success' : 'rejected'}">${req.status === 'accepted' ? 'مقبول' : 'مرفوض'}</span>`}
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
    renderToast(status === 'accepted' ? 'تم قبول الطلب ✓' : 'تم رفض الطلب.', status === 'accepted' ? 'success' : 'info');
    const requests = await apiRequest('/api/player/contact-requests.php');
    renderContactRequests(requests);
  } catch (err) {
    renderToast(err.message || 'فشل تحديث الطلب.', 'error');
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
      if (profile.youtube_url) document.getElementById('youtube_url').value = profile.youtube_url;

      if (profile.photo_url) {
        const img = document.getElementById('photo-preview');
        if (img) { img.src = profile.photo_url; img.hidden = false; }
      }

      // Load skills
      if (profile.skills) {
        Object.entries(profile.skills).forEach(([skill, val]) => {
          const el = document.getElementById(`skill-${skill}`);
          if (el) { el.value = val; el.dispatchEvent(new Event('input')); }
        });
      }
    } catch { /* نافذة جديدة */ }

    const form = document.getElementById('profile-form');
    if (form) form.addEventListener('submit', handleSaveProfile);
  }

  if (page === 'player-dashboard') {
    const user = await requireAuth('player');
    if (!user) return;
    renderNavbar('player');
    loadPlayerDashboard();
    initVideoSection();
  }
});
