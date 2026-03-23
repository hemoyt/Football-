const { getDB }      = require('../lib/db');
const { requireAuth } = require('../lib/auth');
const { handle, ok, err } = require('../lib/helpers');

module.exports = handle('POST', async (req, res) => {
  const session = requireAuth(req, 'player');
  const db = getDB();
  const b = req.body || {};

  const [rows] = await db.query('SELECT id FROM player_profiles WHERE user_id = ? AND is_deleted = 0', [session.id]);
  if (!rows[0]) return err(res, 'Profile not found.', 404);
  const profileId = rows[0].id;

  // Update profile fields
  const profileFields = ['bio','instagram_url','youtube_url','photo_url'];
  const updates = [];
  const vals = [];
  for (const f of profileFields) {
    if (b[f] !== undefined) { updates.push(`${f} = ?`); vals.push(b[f] || null); }
  }
  if (updates.length) {
    vals.push(profileId);
    await db.query(`UPDATE player_profiles SET ${updates.join(', ')} WHERE id = ?`, vals);
  }

  // Update skills if provided
  const skillFields = ['speed','dribbling','shooting','passing','defending','heading'];
  const skillUpdates = [];
  const skillVals = [];
  for (const f of skillFields) {
    if (b[f] !== undefined) {
      const v = Math.max(0, Math.min(100, parseInt(b[f]) || 0));
      skillUpdates.push(`${f} = ?`);
      skillVals.push(v);
    }
  }
  if (skillUpdates.length) {
    skillVals.push(profileId);
    await db.query(`UPDATE player_skills SET ${skillUpdates.join(', ')} WHERE player_id = ?`, skillVals);
  }

  // Update career if provided
  if (b.career && Array.isArray(b.career)) {
    await db.query('DELETE FROM player_career_history WHERE player_id = ?', [profileId]);
    for (let i = 0; i < b.career.length; i++) {
      const c = b.career[i];
      if (!c.club_name) continue;
      await db.query(
        'INSERT INTO player_career_history (player_id, club_name, season, appearances, goals, assists, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [profileId, c.club_name, c.season || '', c.appearances || 0, c.goals || 0, c.assists || 0, i]
      );
    }
  }

  return ok(res, { success: true });
});
