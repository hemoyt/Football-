/**
 * GOG — API Client Layer
 * Connects to the Vercel + MySQL backend via JWT-authenticated fetch calls.
 * Session token is stored in localStorage under 'gog:token'.
 */

'use strict';

/* ═══════════════════════════════════════
   SESSION HELPERS (localStorage)
   ═══════════════════════════════════════ */
const GOG_DB = {
  K: {
    TOKEN:   'gog:token',
    SESSION: 'gog:session',
  },

  getToken()        { return localStorage.getItem(this.K.TOKEN); },
  setToken(t)       { localStorage.setItem(this.K.TOKEN, t); },
  clearToken()      { localStorage.removeItem(this.K.TOKEN); },

  getSession()      { try { return JSON.parse(localStorage.getItem(this.K.SESSION)); } catch { return null; } },
  setSession(u)     {
    const safe = { id: u.id, email: u.email, role: u.role, full_name: u.full_name || '', verification_status: u.verification_status };
    localStorage.setItem(this.K.SESSION, JSON.stringify(safe));
    return safe;
  },
  clearSession()    {
    localStorage.removeItem(this.K.TOKEN);
    localStorage.removeItem(this.K.SESSION);
  },
};

/* ═══════════════════════════════════════
   FILE → base64 helper
   ═══════════════════════════════════════ */
function _fileToDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = e => resolve(e.target.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/* ═══════════════════════════════════════
   CORE apiRequest — real HTTP calls
   ═══════════════════════════════════════ */
async function apiRequest(url, options = {}) {
  // Strip .php extension so URLs work on both PHP and Node.js backends
  const cleanUrl = url.replace(/\.php(\?|$)/, '$1');

  const headers = {};
  const token = GOG_DB.getToken();
  if (token) headers['Authorization'] = 'Bearer ' + token;

  let body = options.body || null;

  // Convert FormData → plain JSON (base64-encode File fields)
  if (body instanceof FormData) {
    const obj = {};
    for (const [key, value] of body.entries()) {
      if (value instanceof File && value.size > 0) {
        obj[key] = await _fileToDataURL(value);
      } else {
        obj[key] = value;
      }
    }
    body = JSON.stringify(obj);
    headers['Content-Type'] = 'application/json';
  } else if (body && typeof body === 'object') {
    body = JSON.stringify(body);
    headers['Content-Type'] = 'application/json';
  } else if (typeof body === 'string' && body.startsWith('{')) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(cleanUrl, {
    method: options.method || 'GET',
    headers: { ...headers, ...(options.headers || {}) },
    body,
  });

  let data;
  try {
    data = await response.json();
  } catch {
    throw new Error('الخادم لم يُرجع استجابة صالحة');
  }

  if (!response.ok) {
    throw new Error(data.message || 'حدث خطأ في الخادم');
  }

  // Auto-save JWT token if returned (login / register)
  if (data.token) {
    GOG_DB.setToken(data.token);
    const sessionData = {
      id:                  data.id,
      email:               data.email,
      role:                data.role,
      full_name:           data.full_name || '',
      verification_status: data.verification_status,
    };
    GOG_DB.setSession(sessionData);
    // Return session object (strip token from result to match old interface)
    return sessionData;
  }

  return data;
}

/* ═══════════════════════════════════════
   requireAuth — validates JWT & role
   ═══════════════════════════════════════ */
async function requireAuth(requiredRole) {
  const token = GOG_DB.getToken();
  if (!token) {
    window.location.href = '/login.html';
    return null;
  }

  try {
    const session = await apiRequest('/api/auth/me');
    const roles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
    if (requiredRole && !roles.includes(session.role)) {
      window.location.href = '/login.html';
      return null;
    }
    GOG_DB.setSession(session);
    return session;
  } catch {
    GOG_DB.clearSession();
    window.location.href = '/login.html';
    return null;
  }
}

/* ═══════════════════════════════════════
   handleLogout
   ═══════════════════════════════════════ */
function handleLogout() {
  renderModal(
    'تسجيل الخروج',
    '<p style="color:var(--text-secondary)">هل أنت متأكد من أنك تريد تسجيل الخروج من Got؟</p>',
    [
      {
        label: 'تسجيل الخروج',
        class: 'btn--danger',
        onClick: () => {
          GOG_DB.clearSession();
          window.location.href = '/login.html';
        },
      },
      { label: 'إلغاء', class: 'btn--ghost', onClick: closeModal },
    ]
  );
}

/* ═══════════════════════════════════════
   SEED ADMIN — only runs in dev/demo mode
   (no-op when a real backend is present)
   ═══════════════════════════════════════ */
// Admin account is seeded via db/schema.sql on the MySQL backend.
// Default credentials: admin@gog.football / Admin@GOG2024
