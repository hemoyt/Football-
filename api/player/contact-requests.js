const { getDB }      = require('../lib/db');
const { requireAuth } = require('../lib/auth');
const { handle, ok, err } = require('../lib/helpers');

module.exports = handle('GET', async (req, res) => {
  const session = requireAuth(req, 'player');
  const db = getDB();

  const [profile] = await db.query('SELECT id FROM player_profiles WHERE user_id = ?', [session.id]);
  if (!profile[0]) return ok(res, []);

  const [rows] = await db.query(
    `SELECT cr.*, cp.club_name
     FROM contact_requests cr
     JOIN club_profiles cp ON cp.id = cr.club_id
     WHERE cr.player_id = ?
     ORDER BY cr.sent_at DESC`,
    [profile[0].id]
  );
  return ok(res, rows);
});
