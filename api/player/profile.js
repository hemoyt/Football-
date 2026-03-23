const { getDB }      = require('../lib/db');
const { requireAuth } = require('../lib/auth');
const { handle, ok, err } = require('../lib/helpers');

module.exports = handle(['GET','PUT'], async (req, res) => {
  const session = requireAuth(req, 'player');
  const db = getDB();

  if (req.method === 'GET') {
    const [rows] = await db.query(
      `SELECT pp.*, ps.speed, ps.dribbling, ps.shooting, ps.passing, ps.defending, ps.heading
       FROM player_profiles pp
       LEFT JOIN player_skills ps ON ps.player_id = pp.id
       WHERE pp.user_id = ? AND pp.is_deleted = 0`,
      [session.id]
    );
    if (!rows[0]) return err(res, 'Profile not found.', 404);

    const p = rows[0];
    const skills = { speed: p.speed, dribbling: p.dribbling, shooting: p.shooting, passing: p.passing, defending: p.defending, heading: p.heading };
    delete p.speed; delete p.dribbling; delete p.shooting; delete p.passing; delete p.defending; delete p.heading;

    // career
    const [career] = await db.query(
      'SELECT * FROM player_career_history WHERE player_id = ? ORDER BY sort_order, id',
      [p.id]
    );
    // videos
    const [videos] = await db.query(
      'SELECT * FROM player_videos WHERE player_id = ? ORDER BY is_primary DESC, id',
      [p.id]
    );

    return ok(res, { ...p, skills, career, videos });
  }

  // PUT — update basic profile fields
  const b = req.body || {};
  const [rows] = await db.query('SELECT id FROM player_profiles WHERE user_id = ? AND is_deleted = 0', [session.id]);
  if (!rows[0]) return err(res, 'Profile not found.', 404);
  const profileId = rows[0].id;

  const fields = ['full_name','date_of_birth','nationality','country_residence','position_primary','position_secondary','preferred_foot','height_cm','weight_kg','bio','instagram_url','youtube_url'];
  const updates = [];
  const vals = [];
  for (const f of fields) {
    if (b[f] !== undefined) { updates.push(`${f} = ?`); vals.push(b[f] || null); }
  }
  if (updates.length) {
    vals.push(profileId);
    await db.query(`UPDATE player_profiles SET ${updates.join(', ')} WHERE id = ?`, vals);
  }
  return ok(res, { success: true });
});
