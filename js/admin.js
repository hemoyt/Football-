/**
 * GOG — Admin JS
 * Admin dashboard: stats, club verification queue, user management, system logs.
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
    renderToast('Failed to load stats.', 'error');
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
      container.innerHTML = renderEmptyState('✅', 'Queue Empty', 'All club applications have been reviewed.');
      return;
    }

    container.innerHTML = `
      <div class="table-wrap">
        <table class="table">
          <thead><tr>
            <th>Club Name</th>
            <th>Country</th>
            <th>Contact</th>
            <th>Submitted</th>
            <th>Document</th>
            <th>Actions</th>
          </tr></thead>
          <tbody>
            ${clubs.map(c => `
              <tr data-club-id="${c.id}">
                <td>
                  <div style="font-weight:600">${escapeHtml(c.club_name)}</div>
                  <div style="font-size:0.8rem;color:var(--text-secondary)">${escapeHtml(c.league_division || '')}</div>
                </td>
                <td>${escapeHtml(c.country)}</td>
                <td>
                  <div>${escapeHtml(c.contact_person_name)}</div>
                  <div style="font-size:0.8rem;color:var(--text-secondary)">${escapeHtml(c.email)}</div>
                </td>
                <td>${formatDate(c.created_at)}</td>
                <td>
                  <a href="${escapeHtml(c.doc_url)}" target="_blank" rel="noopener" class="doc-link">
                    📄 View Doc
                  </a>
                </td>
                <td>
                  <div class="queue-actions">
                    <button class="btn btn--success btn--sm" onclick="verifyClub(${c.id})">Verify ✓</button>
                    <button class="btn btn--danger btn--sm"  onclick="rejectClub(${c.id})">Reject ✗</button>
                  </div>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;

  } catch (err) {
    container.innerHTML = renderEmptyState('❌', 'Failed to Load', err.message || 'Unable to load verification queue.');
  }
}

async function verifyClub(clubId) {
  renderModal(
    'Verify Club',
    '<p>Confirm that this club\'s documentation is legitimate and they meet GOG\'s requirements?</p>',
    [
      {
        label: 'Verify Club',
        class: 'btn--success',
        onClick: async () => {
          closeModal();
          try {
            await apiRequest('/api/admin/verify-club.php', {
              method: 'POST',
              body: JSON.stringify({ club_id: clubId, action: 'verify' }),
            });
            renderToast('Club verified successfully.', 'success');
            loadVerificationQueue();
            loadAdminStats();
          } catch (err) {
            renderToast(err.message || 'Verification failed.', 'error');
          }
        }
      },
      { label: 'Cancel', class: 'btn--ghost', onClick: closeModal }
    ]
  );
}

async function rejectClub(clubId) {
  const body = `
    <div class="form-group">
      <label class="form-label">Rejection Reason</label>
      <textarea class="form-textarea" id="rejection-reason" placeholder="Explain why the club application is being rejected…" required></textarea>
    </div>
  `;

  renderModal(
    'Reject Club Application',
    body,
    [
      {
        label: 'Reject Application',
        class: 'btn--danger',
        onClick: async () => {
          const reason = document.getElementById('rejection-reason')?.value.trim();
          if (!reason) {
            renderToast('Please provide a rejection reason.', 'error');
            return;
          }
          closeModal();
          try {
            await apiRequest('/api/admin/verify-club.php', {
              method: 'POST',
              body: JSON.stringify({ club_id: clubId, action: 'reject', reason }),
            });
            renderToast('Club application rejected.', 'info');
            loadVerificationQueue();
            loadAdminStats();
          } catch (err) {
            renderToast(err.message || 'Action failed.', 'error');
          }
        }
      },
      { label: 'Cancel', class: 'btn--ghost', onClick: closeModal }
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
      container.innerHTML = renderEmptyState('👤', 'No Players', 'No players registered yet.');
      return;
    }

    container.innerHTML = `
      <div class="table-wrap">
        <table class="table">
          <thead><tr>
            <th>Player</th>
            <th>Position</th>
            <th>Nationality</th>
            <th>Registered</th>
            <th>Status</th>
            <th>Actions</th>
          </tr></thead>
          <tbody>
            ${players.map(p => `
              <tr>
                <td>
                  <div style="font-weight:600">${escapeHtml(p.full_name)}</div>
                  <div style="font-size:0.8rem;color:var(--text-secondary)">${escapeHtml(p.email)}</div>
                </td>
                <td>${positionBadge(p.position_primary)}</td>
                <td>${escapeHtml(p.nationality)}</td>
                <td>${formatDate(p.created_at)}</td>
                <td>
                  <span class="badge badge--${p.is_active ? 'success' : 'rejected'}">
                    ${p.is_active ? 'Active' : 'Suspended'}
                  </span>
                </td>
                <td>
                  <div class="queue-actions">
                    <a href="/player/view.html?id=${p.player_id}" class="btn btn--ghost btn--sm" target="_blank">View</a>
                    ${p.is_active
                      ? `<button class="btn btn--danger btn--sm" onclick="suspendUser(${p.user_id})">Suspend</button>`
                      : `<button class="btn btn--success btn--sm" onclick="activateUser(${p.user_id})">Activate</button>`
                    }
                    <button class="btn btn--danger btn--sm" onclick="deleteUser(${p.user_id}, 'player')">Delete</button>
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
    container.innerHTML = renderEmptyState('❌', 'Failed to Load', err.message);
  }
}

/* ═══════════════════════════════════════
   CLUBS MANAGEMENT
   ═══════════════════════════════════════ */
async function loadClubsManagement(page = 1) {
  const container = document.getElementById('clubs-management');
  if (!container) return;

  try {
    const res = await apiRequest(`/api/admin/clubs.php?page=${page}&per_page=25`);
    const { clubs, total, pages } = res;

    if (!clubs.length) {
      container.innerHTML = renderEmptyState('🏟', 'No Clubs', 'No clubs registered yet.');
      return;
    }

    container.innerHTML = `
      <div class="table-wrap">
        <table class="table">
          <thead><tr>
            <th>Club</th>
            <th>Country</th>
            <th>Contact</th>
            <th>Status</th>
            <th>Verified</th>
            <th>Actions</th>
          </tr></thead>
          <tbody>
            ${clubs.map(c => `
              <tr>
                <td>
                  <div style="font-weight:600">${escapeHtml(c.club_name)}</div>
                  <div style="font-size:0.8rem;color:var(--text-secondary)">${escapeHtml(c.league_division || '')}</div>
                </td>
                <td>${escapeHtml(c.country)}</td>
                <td>
                  <div>${escapeHtml(c.contact_person_name)}</div>
                  <div style="font-size:0.8rem;color:var(--text-secondary)">${escapeHtml(c.email)}</div>
                </td>
                <td>
                  <span class="badge badge--${c.verification_status === 'verified' ? 'verified' : c.verification_status === 'pending' ? 'pending' : 'rejected'}">
                    ${c.verification_status}
                  </span>
                </td>
                <td>${c.verified_at ? formatDate(c.verified_at) : '—'}</td>
                <td>
                  <div class="queue-actions">
                    ${c.verification_status === 'verified'
                      ? `<button class="btn btn--danger btn--sm" onclick="revokeClub(${c.id})">Revoke</button>`
                      : c.verification_status === 'pending'
                        ? `<button class="btn btn--success btn--sm" onclick="verifyClub(${c.id})">Verify</button>`
                        : ''
                    }
                    <button class="btn btn--danger btn--sm" onclick="deleteUser(${c.user_id}, 'club')">Delete</button>
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
    container.innerHTML = renderEmptyState('❌', 'Failed to Load', err.message);
  }
}

/* ═══════════════════════════════════════
   USER ACTIONS
   ═══════════════════════════════════════ */
async function suspendUser(userId) {
  if (!confirm('Suspend this user? They will lose access to their account.')) return;
  try {
    await apiRequest('/api/admin/user-action.php', {
      method: 'POST',
      body: JSON.stringify({ user_id: userId, action: 'suspend' }),
    });
    renderToast('User suspended.', 'info');
    loadPlayersManagement();
  } catch (err) {
    renderToast(err.message || 'Action failed.', 'error');
  }
}

async function activateUser(userId) {
  try {
    await apiRequest('/api/admin/user-action.php', {
      method: 'POST',
      body: JSON.stringify({ user_id: userId, action: 'activate' }),
    });
    renderToast('User activated.', 'success');
    loadPlayersManagement();
  } catch (err) {
    renderToast(err.message || 'Action failed.', 'error');
  }
}

async function deleteUser(userId, type) {
  renderModal(
    'Delete User',
    `<p>This will <strong>permanently delete</strong> this ${type} account and all associated data. This action cannot be undone.</p>`,
    [
      {
        label: 'Delete Permanently',
        class: 'btn--danger',
        onClick: async () => {
          closeModal();
          try {
            await apiRequest('/api/admin/user-action.php', {
              method: 'POST',
              body: JSON.stringify({ user_id: userId, action: 'delete' }),
            });
            renderToast('User deleted.', 'info');
            type === 'player' ? loadPlayersManagement() : loadClubsManagement();
          } catch (err) {
            renderToast(err.message || 'Delete failed.', 'error');
          }
        }
      },
      { label: 'Cancel', class: 'btn--ghost', onClick: closeModal }
    ]
  );
}

async function revokeClub(clubId) {
  renderModal(
    'Revoke Club Verification',
    '<p>Revoking verification will prevent this club from accessing the player search and sending contact requests.</p>',
    [
      {
        label: 'Revoke Verification',
        class: 'btn--danger',
        onClick: async () => {
          closeModal();
          try {
            await apiRequest('/api/admin/verify-club.php', {
              method: 'POST',
              body: JSON.stringify({ club_id: clubId, action: 'revoke' }),
            });
            renderToast('Club verification revoked.', 'info');
            loadClubsManagement();
            loadAdminStats();
          } catch (err) {
            renderToast(err.message || 'Action failed.', 'error');
          }
        }
      },
      { label: 'Cancel', class: 'btn--ghost', onClick: closeModal }
    ]
  );
}

/* ═══════════════════════════════════════
   SYSTEM LOGS
   ═══════════════════════════════════════ */
async function loadSystemLogs(page = 1) {
  const container = document.getElementById('system-logs');
  if (!container) return;

  try {
    const res = await apiRequest(`/api/admin/logs.php?page=${page}&per_page=50`);
    const { logs, pages } = res;

    if (!logs.length) {
      container.innerHTML = renderEmptyState('📋', 'No Logs', 'No system events recorded yet.');
      return;
    }

    container.innerHTML = `
      <div class="table-wrap">
        <table class="table">
          <thead><tr>
            <th>Time</th>
            <th>Action</th>
            <th>Target</th>
            <th>Admin</th>
          </tr></thead>
          <tbody>
            ${logs.map(l => `
              <tr>
                <td style="white-space:nowrap;font-size:0.85rem">${formatDate(l.created_at)}</td>
                <td><span class="log-action">${escapeHtml(l.action)}</span></td>
                <td style="font-size:0.85rem">${escapeHtml(l.target_type || '')} ${l.target_id ? '#'+l.target_id : ''}</td>
                <td style="font-size:0.85rem;color:var(--text-secondary)">${escapeHtml(l.actor_email || 'System')}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
      ${renderPagination(page, pages, loadSystemLogs)}
    `;

  } catch (err) {
    container.innerHTML = renderEmptyState('❌', 'Failed to Load', err.message);
  }
}

/* ═══════════════════════════════════════
   TABS
   ═══════════════════════════════════════ */
function initAdminTabs() {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const panel = btn.dataset.panel;
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById(panel)?.classList.add('active');

      // Lazy load panel content
      if (panel === 'queue')   loadVerificationQueue();
      if (panel === 'players') loadPlayersManagement();
      if (panel === 'clubs')   loadClubsManagement();
      if (panel === 'logs')    loadSystemLogs();
    });
  });

  // Activate first tab (verification queue)
  document.querySelector('.tab-btn')?.click();
}

/* ═══════════════════════════════════════
   INIT
   ═══════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', async () => {
  const page = document.body.dataset.page;

  if (page === 'admin-dashboard') {
    const user = await requireAuth('admin');
    if (!user) return;
    renderNavbar('admin');
    loadAdminStats();
    initAdminTabs();
  }
});
