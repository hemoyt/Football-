const { getDB }    = require('../lib/db');
const { signToken } = require('../lib/auth');
const { handle, ok, err } = require('../lib/helpers');
const bcrypt       = require('bcryptjs');

module.exports = handle('POST', async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return err(res, 'Email and password are required.');

  const db = getDB();

  const [rows] = await db.query(
    'SELECT id, email, password_hash, role, is_active, is_deleted FROM users WHERE email = ? LIMIT 1',
    [email.trim().toLowerCase()]
  );
  const user = rows[0];

  if (!user || user.is_deleted) return err(res, 'Invalid email or password.', 401);
  if (!user.is_active)           return err(res, 'Your account is suspended.', 403);
  if (!bcrypt.compareSync(password, user.password_hash)) return err(res, 'Invalid email or password.', 401);

  await db.query('UPDATE users SET last_login = NOW() WHERE id = ?', [user.id]);

  // Get display name
  let full_name = '';
  if (user.role === 'player') {
    const [p] = await db.query('SELECT full_name FROM player_profiles WHERE user_id = ?', [user.id]);
    full_name = p[0]?.full_name || '';
  } else if (user.role === 'club') {
    const [c] = await db.query('SELECT club_name, verification_status FROM club_profiles WHERE user_id = ?', [user.id]);
    full_name = c[0]?.club_name || '';
    const token = signToken({ id: user.id, email: user.email, role: user.role });
    return ok(res, {
      token,
      id:    user.id,
      email: user.email,
      role:  user.role,
      full_name,
      verification_status: c[0]?.verification_status || 'pending',
    });
  } else if (user.role === 'admin') {
    full_name = 'المشرف';
  }

  const token = signToken({ id: user.id, email: user.email, role: user.role });
  return ok(res, { token, id: user.id, email: user.email, role: user.role, full_name });
});
