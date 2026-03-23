/**
 * Got — Admin JS
 * لوحة تحكم المشرف: الإحصائيات، طابور التحقق، إدارة المستخدمين، السجلات.
 */

'use strict';

/* ═══════════════════════════════════════
   DASHBOARD OVERVIEW STATS
   ═══════════════════════════════════════ */
async function loadAdminStats() {
  try {
    const stats = await apiRequest('/api/admin/stats.php');
    const map = {
      'stat-total-players':  stats.total_players  || 0,
      'stat-pending-clubs':  stats.pending_clubs   || 0,
      'stat-verified-clubs': stats.verified_clubs  || 0,
      'stat-rejected-clubs': stats.rejected_clubs  || 0,
    };
    Object.entries(map).forEach(([id, val]) => {
      const el = document.getElementById(id);
      if (el) el.textContent = val;
    });
  } catch {
    renderToast('فشل تحميل الإحصائيات.', 'error');
  }
}

/* ═══════════════════════════════════════
   CLUB VERIFICATION QUEUE
   ═══════════════════════════════════════ */
async function loadVerificationQueue() {
  const container = document.getElementById('verification-queue');
  if (!container) return;

  try {
    const clubs = await apiRequest('/api/admin/pending-clubs.php');

    if (!clubs.length) {
      container.innerHTML = renderEmptyState('✅', 'الطابور فارغ', 'تمت مراجعة جميع طلبات الأندية.');
      return;
    }

    container.innerHTML = `
      <div class="table-wrap">
        <table class="table">
          <thead><tr>
            <th>اسم النادي</th>
            <th>الدولة</th>
            <th>البريد الإلكتروني</th>
            <th>تاريخ التقديم</th>
            <th>الإجراءات</th>
          </tr></thead>
          <tbody>
            ${clubs.map(c => `
              <tr data-club-id="${c.id}">
                <td>
                  <div style="font-weight:600">${escapeHtml(c.club_name)}</div>
                  <div style="font-size:0.8rem;color:var(--text-secondary)">${escapeHtml(c.league || '')}</div>
                </td>
                <td>${escapeHtml(c.country)}</td>
                <td style="font-size:0.85rem;color:var(--text-secondary)">${escapeHtml(c.email)}</td>
                <td>${formatDate(c.created_at)}</td>
                <td>
                  <div style="display:flex;gap:8px">
                    <button class="btn btn--success btn--sm" onclick="verifyClub('${c.id}')">توثيق ✓</button>
                    <button class="btn btn--danger btn--sm"  onclick="rejectClub('${c.id}')">رفض ✗</button>
                  </div>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;

  } catch (err) {
    container.innerHTML = renderEmptyState('❌', 'فشل التحميل', err.message || 'تعذّر تحميل طابور التحقق.');
  }
}

async function verifyClub(clubId) {
  renderModal(
    'توثيق النادي',
    '<p style="color:var(--text-secondary)">هل تؤكد أن وثائق هذا النادي صحيحة وأنه يستوفي متطلبات Got؟</p>',
    [
      {
        label: 'توثيق النادي',
        class: 'btn--success',
        onClick: async () => {
          closeModal();
          try {
            await apiRequest('/api/admin/verify-club.php', {
              method: 'POST',
              body: JSON.stringify({ club_id: clubId, action: 'verify' }),
            });
            renderToast('تم توثيق النادي بنجاح. ✓', 'success');
            loadVerificationQueue();
            loadAdminStats();
          } catch (err) {
            renderToast(err.message || 'فشل التوثيق.', 'error');
          }
        }
      },
      { label: 'إلغاء', class: 'btn--ghost', onClick: closeModal }
    ]
  );
}

async function rejectClub(clubId) {
  const body = `
    <div class="form-group">
      <label class="form-label">سبب الرفض</label>
      <textarea class="form-textarea" id="rejection-reason" placeholder="اشرح سبب رفض طلب النادي…" required></textarea>
    </div>
  `;

  renderModal(
    'رفض طلب النادي',
    body,
    [
      {
        label: 'رفض الطلب',
        class: 'btn--danger',
        onClick: async () => {
          const reason = document.getElementById('rejection-reason')?.value.trim();
          if (!reason) {
            renderToast('يرجى إدخال سبب الرفض.', 'error');
            return;
          }
          closeModal();
          try {
            await apiRequest('/api/admin/verify-club.php', {
              method: 'POST',
              body: JSON.stringify({ club_id: clubId, action: 'reject', reason }),
            });
            renderToast('تم رفض طلب النادي.', 'info');
            loadVerificationQueue();
            loadAdminStats();
          } catch (err) {
            renderToast(err.message || 'فشل تنفيذ الإجراء.', 'error');
          }
        }
      },
      { label: 'إلغاء', class: 'btn--ghost', onClick: closeModal }
    ]
  );
}

/* ═══════════════════════════════════════
   PLAYERS MANAGEMENT
   ═══════════════════════════════════════ */
async function loadPlayersManagement(page = 1) {
  const container = document.getElementById('players-management');
  if (!container) return;

  try {
    const res = await apiRequest(`/api/admin/players.php?page=${page}&per_page=25`);
    const { players, total, pages } = res;

    if (!players.length) {
      container.innerHTML = renderEmptyState('👤', 'لا يوجد لاعبون', 'لم يسجّل أي لاعب بعد.');
      return;
    }

    container.innerHTML = `
      <div class="table-wrap">
        <table class="table">
          <thead><tr>
            <th>اللاعب</th>
            <th>المركز</th>
            <th>الجنسية</th>
            <th>تاريخ التسجيل</th>
            <th>الحالة</th>
            <th>الإجراءات</th>
          </tr></thead>
          <tbody>
            ${players.map(p => `
              <tr>
                <td>
                  <div style="font-weight:600">${escapeHtml(p.full_name)}</div>
                  <div style="font-size:0.8rem;color:var(--text-secondary)">${escapeHtml(p.email)}</div>
                </td>
                <td>${positionBadge(p.position_primary)}</td>
                <td>${escapeHtml(p.nationality || '—')}</td>
                <td>${formatDate(p.created_at)}</td>
                <td><span class="badge badge--success">نشط</span></td>
                <td>
                  <div style="display:flex;gap:8px">
                    <a href="/player/view.html?id=${p.id}" class="btn btn--ghost btn--sm" target="_blank">عرض</a>
                    <button class="btn btn--danger btn--sm" onclick="deleteUser('${p.user_id}', 'player')">حذف</button>
                  </div>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
      ${renderPagination(page, pages, loadPlayersManagement)}
    `;

  } catch (err) {
    container.innerHTML = renderEmptyState('❌', 'فشل التحميل', err.message);
  }
}

/* ═══════════════════════════════════════
   CLUBS MANAGEMENT
   ═══════════════════════════════════════ */
async function loadClubsManagement(page = 1) {
  const container = document.getElementById('clubs-management');
  if (!container) return;

  const statusMap = { verified: 'موثّق', pending: 'قيد الانتظار', rejected: 'مرفوض' };
  const badgeMap  = { verified: 'verified', pending: 'pending', rejected: 'rejected' };

  try {
    const res = await apiRequest(`/api/admin/clubs.php?page=${page}&per_page=25`);
    const { clubs, total, pages } = res;

    if (!clubs.length) {
      container.innerHTML = renderEmptyState('🏟', 'لا توجد أندية', 'لم يسجّل أي نادٍ بعد.');
      return;
    }

    container.innerHTML = `
      <div class="table-wrap">
        <table class="table">
          <thead><tr>
            <th>النادي</th>
            <th>الدولة</th>
            <th>الحالة</th>
            <th>الإجراءات</th>
          </tr></thead>
          <tbody>
            ${clubs.map(c => `
              <tr>
                <td>
                  <div style="font-weight:600">${escapeHtml(c.club_name)}</div>
                  <div style="font-size:0.8rem;color:var(--text-secondary)">${escapeHtml(c.email)}</div>
                </td>
                <td>${escapeHtml(c.country || '—')}</td>
                <td>
                  <span class="badge badge--${badgeMap[c.verification_status] || 'pending'}">
                    ${statusMap[c.verification_status] || c.verification_status}
                  </span>
                </td>
                <td>
                  <div style="display:flex;gap:8px">
                    ${c.verification_status === 'verified'
                      ? `<button class="btn btn--danger btn--sm" onclick="revokeClub('${c.id}')">سحب التوثيق</button>`
                      : c.verification_status === 'pending'
                        ? `<button class="btn btn--success btn--sm" onclick="verifyClub('${c.id}')">توثيق</button>`
                        : ''
                    }
                    <button class="btn btn--danger btn--sm" onclick="deleteUser('${c.user_id}', 'club')">حذف</button>
                  </div>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
      ${renderPagination(page, pages, loadClubsManagement)}
    `;

  } catch (err) {
    container.innerHTML = renderEmptyState('❌', 'فشل التحميل', err.message);
  }
}

/* ═══════════════════════════════════════
   USER ACTIONS
   ═══════════════════════════════════════ */
async function deleteUser(userId, type) {
  const typeLabel = type === 'player' ? 'اللاعب' : 'النادي';
  renderModal(
    'حذف المستخدم',
    `<p style="color:var(--text-secondary)">سيُحذف حساب ${typeLabel} وجميع بياناته <strong>نهائياً</strong>. هذا الإجراء لا يمكن التراجع عنه.</p>`,
    [
      {
        label: 'حذف نهائي',
        class: 'btn--danger',
        onClick: async () => {
          closeModal();
          try {
            await apiRequest('/api/admin/user-action.php', {
              method: 'POST',
              body: JSON.stringify({ user_id: userId, action: 'delete' }),
            });
            renderToast('تم حذف المستخدم.', 'info');
            type === 'player' ? loadPlayersManagement() : loadClubsManagement();
            loadAdminStats();
          } catch (err) {
            renderToast(err.message || 'فشل الحذف.', 'error');
          }
        }
      },
      { label: 'إلغاء', class: 'btn--ghost', onClick: closeModal }
    ]
  );
}

async function revokeClub(clubId) {
  renderModal(
    'سحب توثيق النادي',
    '<p style="color:var(--text-secondary)">سحب التوثيق سيمنع هذا النادي من الوصول إلى البحث عن اللاعبين وإرسال طلبات التواصل.</p>',
    [
      {
        label: 'سحب التوثيق',
        class: 'btn--danger',
        onClick: async () => {
          closeModal();
          try {
            await apiRequest('/api/admin/verify-club.php', {
              method: 'POST',
              body: JSON.stringify({ club_id: clubId, action: 'revoke' }),
            });
            renderToast('تم سحب توثيق النادي.', 'info');
            loadClubsManagement();
            loadAdminStats();
          } catch (err) {
            renderToast(err.message || 'فشل تنفيذ الإجراء.', 'error');
          }
        }
      },
      { label: 'إلغاء', class: 'btn--ghost', onClick: closeModal }
    ]
  );
}

/* ═══════════════════════════════════════
   SYSTEM LOGS
   ═══════════════════════════════════════ */
async function loadSystemLogs(page = 1) {
  const container = document.getElementById('system-logs');
  if (!container) return;

  const actionMap = { verify_club: 'توثيق نادٍ', reject_club: 'رفض نادٍ', revoke_club: 'سحب توثيق' };

  try {
    const res = await apiRequest(`/api/admin/logs.php?page=${page}&per_page=50`);
    const { logs, pages } = res;

    if (!logs.length) {
      container.innerHTML = renderEmptyState('📋', 'لا توجد سجلات', 'لم يتم تسجيل أي عمليات بعد.');
      return;
    }

    container.innerHTML = `
      <div class="table-wrap">
        <table class="table">
          <thead><tr>
            <th>الوقت</th>
            <th>الإجراء</th>
            <th>الهدف</th>
            <th>المشرف</th>
          </tr></thead>
          <tbody>
            ${logs.map(l => `
              <tr>
                <td style="white-space:nowrap;font-size:0.85rem">${formatDate(l.created_at)}</td>
                <td>${escapeHtml(actionMap[l.action] || l.action)}</td>
                <td style="font-size:0.85rem">${escapeHtml(l.target_type || '')} ${l.target_id ? '#'+l.target_id : ''}</td>
                <td style="font-size:0.85rem;color:var(--text-secondary)">${escapeHtml(l.actor_email || 'النظام')}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
      ${renderPagination(page, pages, loadSystemLogs)}
    `;

  } catch (err) {
    container.innerHTML = renderEmptyState('❌', 'فشل التحميل', err.message);
  }
}

/* ═══════════════════════════════════════
   INIT
   ═══════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', async () => {
  const page = document.body.dataset.page;

  if (page === 'admin-dashboard') {
    const user = await requireAuth('admin');
    if (!user) return;
    loadAdminStats();
    loadVerificationQueue();
  }
});
