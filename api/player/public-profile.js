const { getDB }  = require('../lib/db');
const { getToken, verifyToken } = require('../lib/auth');
const { handle, ok, err } = require('../lib/helpers');

module.exports = handle('GET', async (req, res) => {
  const playerId = req.query?.id;
  if (!playerId) return err(res, 'Player id is required.');

  const db = getDB();

  const [rows] = await db.query(
    `SELECT pp.*, ps.speed, ps.dribbling, ps.shooting, ps.passing, ps.defending, ps.heading
     FROM player_profiles pp
     LEFT JOIN player_skills ps ON ps.player_id = pp.id
     WHERE pp.id = ? AND pp.is_deleted = 0`,
    [playerId]
  );
  if (!rows[0]) return err(res, 'Player not found.', 404);

  const p = rows[0];
  const skills = { speed: p.speed, dribbling: p.dribbling, shooting: p.shooting, passing: p.passing, defending: p.defending, heading: p.heading };
  delete p.speed; delete p.dribbling; delete p.shooting; delete p.passing; delete p.defending; delete p.heading;

  const [career] = await db.query('SELECT * FROM player_career_history WHERE player_id = ? ORDER BY sort_order, id', [p.id]);
  const [videos] = await db.query('SELECT * FROM player_videos WHERE player_id = ? ORDER BY is_primary DESC, id', [p.id]);

  // Log profile view if viewer is a club
  try {
    const token = getToken({ headers: req.headers });
    if (token) {
      const session = verifyToken(token);
      if (session.role === 'club') {
        // Increment view counter
        await db.query('UPDATE player_profiles SET profile_views = profile_views + 1 WHERE id = ?', [p.id]);
        p.profile_views = (p.profile_views || 0) + 1;
        // Log view
        await db.query(
          'INSERT INTO profile_views_log (player_id, viewed_by) VALUES (?, ?)',
          [p.id, session.id]
        );
      }
    }
  } catch { /* ignore auth errors for public endpoint */ }

  return ok(res, { ...p, skills, career, videos });
});
