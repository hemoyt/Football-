/**
 * GOG — Auth Logic
 * Handles login, registration form submissions, and role detection.
 */

'use strict';

/* ═══════════════════════════════════════
   LOGIN
   ═══════════════════════════════════════ */
async function handleLogin(e) {
  e.preventDefault();
  const form = e.target;
  const email    = form.querySelector('#email').value.trim();
  const password = form.querySelector('#password').value;

  if (!email || !password) {
    renderToast('Please fill in all fields.', 'error');
    return;
  }

  const btn = form.querySelector('[type="submit"]');
  btn.disabled = true;
  btn.textContent = 'Signing in…';

  try {
    const res = await apiRequest('/api/auth/login.php', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    renderToast('Welcome back!', 'success');

    // Redirect based on role
    setTimeout(() => {
      if      (res.role === 'player') window.location.href = '/player/dashboard.html';
      else if (res.role === 'club')   window.location.href = '/club/dashboard.html';
      else if (res.role === 'admin')  window.location.href = '/admin/dashboard.html';
      else window.location.href = '/';
    }, 800);

  } catch (err) {
    renderToast(err.message || 'Invalid credentials.', 'error');
    btn.disabled = false;
    btn.textContent = 'Sign In';
  }
}

/* ═══════════════════════════════════════
   PLAYER REGISTRATION
   ═══════════════════════════════════════ */
async function handlePlayerRegister(e) {
  e.preventDefault();
  const form = e.target;

  const data = {
    full_name:          form.querySelector('#full_name').value.trim(),
    email:              form.querySelector('#email').value.trim(),
    password:           form.querySelector('#password').value,
    confirm_password:   form.querySelector('#confirm_password').value,
    date_of_birth:      form.querySelector('#date_of_birth').value,
    nationality:        form.querySelector('#nationality').value.trim(),
    country_residence:  form.querySelector('#country_residence').value.trim(),
    position_primary:   form.querySelector('#position_primary').value,
    position_secondary: form.querySelector('#position_secondary').value || null,
    preferred_foot:     form.querySelector('#preferred_foot').value,
    height_cm:          form.querySelector('#height_cm').value || null,
    weight_kg:          form.querySelector('#weight_kg').value || null,
  };

  // Client validation
  if (!data.full_name || !data.email || !data.password || !data.date_of_birth || !data.position_primary) {
    renderToast('Please fill in all required fields.', 'error');
    return;
  }

  if (data.password !== data.confirm_password) {
    renderToast('Passwords do not match.', 'error');
    return;
  }

  if (data.password.length < 8) {
    renderToast('Password must be at least 8 characters.', 'error');
    return;
  }

  const btn = form.querySelector('[type="submit"]');
  btn.disabled = true;
  renderLoader();

  try {
    await apiRequest('/api/auth/register-player.php', {
      method: 'POST',
      body: JSON.stringify(data),
    });

    hideLoader();
    renderToast('Account created! Build your profile.', 'success');
    setTimeout(() => { window.location.href = '/player/profile.html'; }, 1200);

  } catch (err) {
    hideLoader();
    renderToast(err.message || 'Registration failed.', 'error');
    btn.disabled = false;
  }
}

/* ═══════════════════════════════════════
   CLUB REGISTRATION
   ═══════════════════════════════════════ */
async function handleClubRegister(e) {
  e.preventDefault();
  const form = e.target;
  const formData = new FormData(form);

  const email    = form.querySelector('#email').value.trim();
  const password = form.querySelector('#password').value;
  const confirm  = form.querySelector('#confirm_password').value;
  const docFile  = form.querySelector('#doc_file').files[0];

  if (!docFile) {
    renderToast('Please upload a verification document.', 'error');
    return;
  }

  if (password !== confirm) {
    renderToast('Passwords do not match.', 'error');
    return;
  }

  const btn = form.querySelector('[type="submit"]');
  btn.disabled = true;
  renderLoader();

  try {
    await apiRequest('/api/auth/register-club.php', {
      method: 'POST',
      body: formData,
      headers: {}, // let browser set Content-Type for FormData
    });

    hideLoader();
    renderToast('Application submitted! You will be notified within 48 hours.', 'success', 5000);
    setTimeout(() => { window.location.href = '/club/pending.html'; }, 1500);

  } catch (err) {
    hideLoader();
    renderToast(err.message || 'Registration failed.', 'error');
    btn.disabled = false;
  }
}

/* ═══════════════════════════════════════
   ADMIN LOGIN
   ═══════════════════════════════════════ */
async function handleAdminLogin(e) {
  e.preventDefault();
  const form = e.target;
  const email    = form.querySelector('#email').value.trim();
  const password = form.querySelector('#password').value;
  const secret   = form.querySelector('#admin_secret')?.value || '';

  const btn = form.querySelector('[type="submit"]');
  btn.disabled = true;
  btn.textContent = 'Authenticating…';

  try {
    const res = await apiRequest('/api/auth/admin-login.php', {
      method: 'POST',
      body: JSON.stringify({ email, password, secret }),
    });

    if (res.role !== 'admin') throw new Error('Unauthorized access.');

    renderToast('Welcome, Administrator.', 'success');
    setTimeout(() => { window.location.href = '/admin/dashboard.html'; }, 800);

  } catch (err) {
    renderToast(err.message || 'Access denied.', 'error');
    btn.disabled = false;
    btn.textContent = 'Access Admin Panel';
  }
}

/* ═══════════════════════════════════════
   PASSWORD TOGGLE
   ═══════════════════════════════════════ */
function initPasswordToggles() {
  document.querySelectorAll('.password-toggle').forEach(btn => {
    btn.addEventListener('click', () => {
      const input = btn.previousElementSibling;
      if (!input) return;
      if (input.type === 'password') {
        input.type = 'text';
        btn.textContent = '🙈';
      } else {
        input.type = 'password';
        btn.textContent = '👁';
      }
    });
  });
}

/* ═══════════════════════════════════════
   INIT
   ═══════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
  initPasswordToggles();

  const loginForm         = document.getElementById('login-form');
  const playerRegForm     = document.getElementById('player-register-form');
  const clubRegForm       = document.getElementById('club-register-form');
  const adminLoginForm    = document.getElementById('admin-login-form');

  if (loginForm)      loginForm.addEventListener('submit', handleLogin);
  if (playerRegForm)  playerRegForm.addEventListener('submit', handlePlayerRegister);
  if (clubRegForm)    clubRegForm.addEventListener('submit', handleClubRegister);
  if (adminLoginForm) adminLoginForm.addEventListener('submit', handleAdminLogin);
});
