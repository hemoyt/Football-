const { getDB }      = require('../lib/db');
const { requireAuth } = require('../lib/auth');
const { handle, ok, err } = require('../lib/helpers');

module.exports = handle('GET', async (req, res) => {
  const session = requireAuth(req, 'club');
  const db = getDB();

  const [club] = await db.query('SELECT id FROM club_profiles WHERE user_id = ?', [session.id]);
  if (!club[0]) return ok(res, []);

  const [rows] = await db.query(
    `SELECT cr.*, pp.full_name AS player_name, pp.position_primary, pp.photo_url
     FROM contact_requests cr
     JOIN player_profiles pp ON pp.id = cr.player_id
     WHERE cr.club_id = ?
     ORDER BY cr.sent_at DESC`,
    [club[0].id]
  );
  return ok(res, rows);
});
