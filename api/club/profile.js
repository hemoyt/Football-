const { getDB }      = require('../lib/db');
const { requireAuth } = require('../lib/auth');
const { handle, ok, err } = require('../lib/helpers');

module.exports = handle(['GET','PUT'], async (req, res) => {
  const session = requireAuth(req, 'club');
  const db = getDB();

  const [rows] = await db.query('SELECT * FROM club_profiles WHERE user_id = ? AND is_deleted = 0', [session.id]);
  if (!rows[0]) return err(res, 'Club profile not found.', 404);

  if (req.method === 'GET') return ok(res, rows[0]);

  // PUT — update club profile
  const b = req.body || {};
  const fields = ['club_name','country','league_division','contact_person_name','contact_title','phone','logo_url'];
  const updates = []; const vals = [];
  for (const f of fields) {
    if (b[f] !== undefined) { updates.push(`${f} = ?`); vals.push(b[f] || null); }
  }
  if (updates.length) {
    vals.push(rows[0].id);
    await db.query(`UPDATE club_profiles SET ${updates.join(', ')} WHERE id = ?`, vals);
  }
  return ok(res, { success: true });
});
