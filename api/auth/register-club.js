const { getDB }     = require('../lib/db');
const { signToken } = require('../lib/auth');
const { handle, ok, err } = require('../lib/helpers');
const bcrypt        = require('bcryptjs');

module.exports = handle('POST', async (req, res) => {
  const b = req.body || {};
  const required = ['email','password','club_name','country','contact_person_name'];
  for (const f of required) {
    if (!b[f] || !String(b[f]).trim()) return err(res, `Field '${f}' is required.`);
  }

  const email    = b.email.trim().toLowerCase();
  const password = String(b.password);
  if (password.length < 8) return err(res, 'Password must be at least 8 characters.');

  const db = getDB();

  const [exists] = await db.query('SELECT id FROM users WHERE email = ? LIMIT 1', [email]);
  if (exists[0]) return err(res, 'An account with this email already exists.', 409);

  const hash = bcrypt.hashSync(password, 10);
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const [userResult] = await conn.query(
      "INSERT INTO users (email, password_hash, role, is_active, is_deleted) VALUES (?, ?, 'club', 1, 0)",
      [email, hash]
    );
    const userId = userResult.insertId;

    await conn.query(
      `INSERT INTO club_profiles
       (user_id, club_name, country, league_division, contact_person_name, contact_title, phone, logo_url, doc_url, verification_status)
       VALUES (?, ?, ?, ?, ?, ?, ?, NULL, ?, 'pending')`,
      [
        userId,
        b.club_name.trim(),
        b.country.trim(),
        b.league_division || null,
        b.contact_person_name.trim(),
        b.contact_title || null,
        b.phone         || null,
        b.doc_url       || '',   // clubs can upload doc later
      ]
    );

    await conn.commit();

    const token = signToken({ id: userId, email, role: 'club' });
    return ok(res, {
      token,
      id: userId, email, role: 'club',
      full_name: b.club_name.trim(),
      verification_status: 'pending',
    }, 201);
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
});
