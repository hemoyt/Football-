const { getDB }     = require('../lib/db');
const { signToken } = require('../lib/auth');
const { handle, ok, err } = require('../lib/helpers');
const bcrypt        = require('bcryptjs');

module.exports = handle('POST', async (req, res) => {
  const b = req.body || {};
  const required = ['full_name','email','password','date_of_birth','nationality','country_residence','position_primary','preferred_foot'];
  for (const f of required) {
    if (!b[f] || !String(b[f]).trim()) return err(res, `Field '${f}' is required.`);
  }

  const email    = b.email.trim().toLowerCase();
  const password = String(b.password);
  if (password.length < 8) return err(res, 'Password must be at least 8 characters.');

  const FEET = ['left','right','both'];
  if (!FEET.includes(b.preferred_foot)) return err(res, 'preferred_foot must be left, right, or both.');

  const db = getDB();

  const [exists] = await db.query('SELECT id FROM users WHERE email = ? LIMIT 1', [email]);
  if (exists[0]) return err(res, 'An account with this email already exists.', 409);

  const hash = bcrypt.hashSync(password, 10);
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const [userResult] = await conn.query(
      "INSERT INTO users (email, password_hash, role, is_active, is_deleted) VALUES (?, ?, 'player', 1, 0)",
      [email, hash]
    );
    const userId = userResult.insertId;

    const [profileResult] = await conn.query(
      `INSERT INTO player_profiles
       (user_id, full_name, date_of_birth, nationality, country_residence, position_primary,
        position_secondary, preferred_foot, height_cm, weight_kg, bio, instagram_url, youtube_url, photo_url, profile_views)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, 0)`,
      [
        userId,
        b.full_name.trim(),
        b.date_of_birth,
        b.nationality.trim(),
        b.country_residence.trim(),
        b.position_primary,
        b.position_secondary || null,
        b.preferred_foot,
        b.height_cm ? parseInt(b.height_cm) : null,
        b.weight_kg ? parseFloat(b.weight_kg) : null,
        b.bio       ? b.bio.trim()            : null,
        b.instagram_url || null,
        b.youtube_url   || null,
      ]
    );
    const profileId = profileResult.insertId;

    await conn.query(
      'INSERT INTO player_skills (player_id, speed, dribbling, shooting, passing, defending, heading) VALUES (?, 50, 50, 50, 50, 50, 50)',
      [profileId]
    );

    await conn.commit();

    const token = signToken({ id: userId, email, role: 'player' });
    return ok(res, {
      token,
      id: userId, email, role: 'player',
      full_name:          b.full_name.trim(),
      date_of_birth:      b.date_of_birth,
      nationality:        b.nationality,
      country_residence:  b.country_residence,
      position_primary:   b.position_primary,
      preferred_foot:     b.preferred_foot,
    }, 201);
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
});
