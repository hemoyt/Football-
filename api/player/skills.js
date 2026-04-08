const { getDB }      = require('../lib/db');
const { requireAuth } = require('../lib/auth');
const { handle, ok, err } = require('../lib/helpers');

module.exports = handle(['GET','PUT'], async (req, res) => {
  const db = getDB();

  if (req.method === 'GET') {
    const playerId = req.query?.id;
    if (playerId) {
      const [rows] = await db.query('SELECT * FROM player_skills WHERE player_id = ?', [playerId]);
      return ok(res, rows[0] || { speed:50, dribbling:50, shooting:50, passing:50, defending:50, heading:50 });
    }
    const session = requireAuth(req, 'player');
    const [profile] = await db.query('SELECT id FROM player_profiles WHERE user_id = ?', [session.id]);
    if (!profile[0]) return ok(res, { speed:50, dribbling:50, shooting:50, passing:50, defending:50, heading:50 });
    const [rows] = await db.query('SELECT * FROM player_skills WHERE player_id = ?', [profile[0].id]);
    return ok(res, rows[0] || { speed:50, dribbling:50, shooting:50, passing:50, defending:50, heading:50 });
  }

  // PUT
  const session = requireAuth(req, 'player');
  const [profile] = await db.query('SELECT id FROM player_profiles WHERE user_id = ?', [session.id]);
  if (!profile[0]) return err(res, 'Profile not found.', 404);
  const b = req.body || {};
  const SKILLS = ['speed','dribbling','shooting','passing','defending','heading'];
  const updates = []; const vals = [];
  for (const s of SKILLS) {
    if (b[s] !== undefined) {
      updates.push(`${s} = ?`);
      vals.push(Math.max(0, Math.min(100, parseInt(b[s]) || 0)));
    }
  }
  if (!updates.length) return err(res, 'No skill fields provided.');
  vals.push(profile[0].id);
  await db.query(`UPDATE player_skills SET ${updates.join(', ')} WHERE player_id = ?`, vals);
  return ok(res, { success: true });
});
