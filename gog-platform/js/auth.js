/**
 * Got — Auth Logic
 * Handles login, registration form submissions, and role detection.
 */

'use strict';

/* ═══════════════════════════════════════
   LOGIN
   ═══════════════════════════════════════ */
async function handleLogin(e) {
  e.preventDefault();
  const form     = e.target;
  const email    = form.querySelector('#email').value.trim();
  const password = form.querySelector('#password').value;

  if (!email || !password) {
    renderToast('يرجى ملء جميع الحقول.', 'error');
    return;
  }

  const btn = form.querySelector('[type="submit"]');
  btn.disabled    = true;
  btn.textContent = 'جارٍ الدخول…';

  try {
    const res = await apiRequest('/api/auth/login.php', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    renderToast('أهلاً بك! 🎉', 'success');

    setTimeout(() => {
      if      (res.role === 'player') window.location.href = '/player/dashboard.html';
      else if (res.role === 'club')   window.location.href = '/club/dashboard.html';
      else if (res.role === 'admin')  window.location.href = '/admin/dashboard.html';
      else window.location.href = '/';
    }, 800);

  } catch (err) {
    renderToast(err.message || 'بيانات الدخول غير صحيحة.', 'error');
    btn.disabled    = false;
    btn.textContent = 'تسجيل الدخول';
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
    position_secondary: form.querySelector('#position_secondary')?.value || null,
    preferred_foot:     form.querySelector('#preferred_foot').value,
    height_cm:          form.querySelector('#height_cm')?.value || null,
    weight_kg:          form.querySelector('#weight_kg')?.value || null,
  };

  if (!data.full_name || !data.email || !data.password || !data.date_of_birth || !data.position_primary || !data.nationality || !data.country_residence || !data.preferred_foot) {
    renderToast('يرجى ملء جميع الحقول المطلوبة.', 'error');
    return;
  }

  if (data.password !== data.confirm_password) {
    renderToast('كلمتا المرور غير متطابقتين.', 'error');
    return;
  }

  if (data.password.length < 8) {
    renderToast('كلمة المرور يجب أن تكون ٨ أحرف على الأقل.', 'error');
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
    renderToast('تم إنشاء حسابك! ابنِ ملفك الآن.', 'success');
    setTimeout(() => { window.location.href = '/player/profile.html'; }, 1200);

  } catch (err) {
    hideLoader();
    renderToast(err.message || 'فشل التسجيل. حاول مرة أخرى.', 'error');
    btn.disabled = false;
  }
}

/* ═══════════════════════════════════════
   CLUB REGISTRATION
   ═══════════════════════════════════════ */
async function handleClubRegister(e) {
  e.preventDefault();
  const form = e.target;

  const email   = form.querySelector('#email').value.trim();
  const password = form.querySelector('#password').value;
  const confirm  = form.querySelector('#confirm_password').value;

  if (!email || !password) {
    renderToast('يرجى ملء جميع الحقول المطلوبة.', 'error');
    return;
  }

  if (password !== confirm) {
    renderToast('كلمتا المرور غير متطابقتين.', 'error');
    return;
  }

  if (password.length < 8) {
    renderToast('كلمة المرور يجب أن تكون ٨ أحرف على الأقل.', 'error');
    return;
  }

  const btn = form.querySelector('[type="submit"]');
  btn.disabled = true;
  renderLoader();

  try {
    const formData = new FormData(form);
    await apiRequest('/api/auth/register-club.php', {
      method: 'POST',
      body: formData,
      headers: {},
    });

    hideLoader();
    renderToast('تم إرسال طلبك! ستتلقى إشعاراً خلال ٤٨ ساعة.', 'success', 5000);
    setTimeout(() => { window.location.href = '/club/pending.html'; }, 1500);

  } catch (err) {
    hideLoader();
    renderToast(err.message || 'فشل التسجيل. حاول مرة أخرى.', 'error');
    btn.disabled = false;
  }
}

/* ═══════════════════════════════════════
   ADMIN LOGIN
   ═══════════════════════════════════════ */
async function handleAdminLogin(e) {
  e.preventDefault();
  const form     = e.target;
  const email    = form.querySelector('#email').value.trim();
  const password = form.querySelector('#password').value;
  const secret   = form.querySelector('#admin_secret')?.value || '';

  const btn = form.querySelector('[type="submit"]');
  btn.disabled    = true;
  btn.textContent = 'جارٍ المصادقة…';

  try {
    const res = await apiRequest('/api/auth/admin-login.php', {
      method: 'POST',
      body: JSON.stringify({ email, password, secret }),
    });

    if (res.role !== 'admin') throw new Error('وصول غير مصرح.');

    renderToast('أهلاً بك، المدير.', 'success');
    setTimeout(() => { window.location.href = '/admin/dashboard.html'; }, 800);

  } catch (err) {
    renderToast(err.message || 'وصول مرفوض.', 'error');
    btn.disabled    = false;
    btn.textContent = 'دخول لوحة الإدارة';
  }
}

/* ═══════════════════════════════════════
   PASSWORD TOGGLE
   ═══════════════════════════════════════ */
function initPasswordToggles() {
  document.querySelectorAll('.password-toggle').forEach(btn => {
    btn.addEventListener('click', () => {
      const input = btn.previousElementSibling;
      if (!input || input.tagName !== 'INPUT') return;
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

  const loginForm      = document.getElementById('login-form');
  const playerRegForm  = document.getElementById('player-register-form');
  const clubRegForm    = document.getElementById('club-register-form');
  const adminLoginForm = document.getElementById('admin-login-form');

  if (loginForm)      loginForm.addEventListener('submit', handleLogin);
  if (playerRegForm)  playerRegForm.addEventListener('submit', handlePlayerRegister);
  if (clubRegForm)    clubRegForm.addEventListener('submit', handleClubRegister);
  if (adminLoginForm) adminLoginForm.addEventListener('submit', handleAdminLogin);
});
