const { getDB }      = require('../lib/db');
const { requireAuth } = require('../lib/auth');
const { handle, ok, err } = require('../lib/helpers');

module.exports = handle('GET', async (req, res) => {
  const session = requireAuth(req, 'club');
  const db = getDB();

  const [club] = await db.query('SELECT id FROM club_profiles WHERE user_id = ?', [session.id]);
  if (!club[0]) return ok(res, []);

  const [rows] = await db.query(
    `SELECT pp.*, ps.speed, ps.dribbling, ps.shooting, ps.passing, ps.defending, ps.heading
     FROM saved_players sp
     JOIN player_profiles pp ON pp.id = sp.player_id
     LEFT JOIN player_skills ps ON ps.player_id = pp.id
     WHERE sp.club_id = ? AND pp.is_deleted = 0
     ORDER BY sp.saved_at DESC`,
    [club[0].id]
  );
  return ok(res, rows);
});
