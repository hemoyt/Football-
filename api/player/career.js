const { getDB }      = require('../lib/db');
const { requireAuth, getToken, verifyToken } = require('../lib/auth');
const { handle, ok, err } = require('../lib/helpers');

module.exports = handle(['GET','POST','PUT','DELETE'], async (req, res) => {
  const db = getDB();

  if (req.method === 'GET') {
    // Public: get by player profile id
    const playerId = req.query?.id;
    if (!playerId) {
      // own career
      const session = requireAuth(req, 'player');
      const [rows] = await db.query('SELECT id FROM player_profiles WHERE user_id = ?', [session.id]);
      if (!rows[0]) return ok(res, []);
      const [career] = await db.query('SELECT * FROM player_career_history WHERE player_id = ? ORDER BY sort_order, id', [rows[0].id]);
      return ok(res, career);
    }
    const [career] = await db.query('SELECT * FROM player_career_history WHERE player_id = ? ORDER BY sort_order, id', [playerId]);
    return ok(res, career);
  }

  const session = requireAuth(req, 'player');
  const [rows] = await db.query('SELECT id FROM player_profiles WHERE user_id = ?', [session.id]);
  if (!rows[0]) return err(res, 'Profile not found.', 404);
  const profileId = rows[0].id;
  const b = req.body || {};

  if (req.method === 'POST') {
    if (!b.club_name) return err(res, 'club_name is required.');
    const [r] = await db.query(
      'INSERT INTO player_career_history (player_id, club_name, season, appearances, goals, assists, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [profileId, b.club_name, b.season || '', b.appearances || 0, b.goals || 0, b.assists || 0, b.sort_order || 0]
    );
    return ok(res, { id: r.insertId, ...b }, 201);
  }

  if (req.method === 'PUT') {
    if (!b.id) return err(res, 'id is required.');
    await db.query(
      'UPDATE player_career_history SET club_name = ?, season = ?, appearances = ?, goals = ?, assists = ? WHERE id = ? AND player_id = ?',
      [b.club_name, b.season, b.appearances || 0, b.goals || 0, b.assists || 0, b.id, profileId]
    );
    return ok(res, { success: true });
  }

  if (req.method === 'DELETE') {
    if (!b.id) return err(res, 'id is required.');
    await db.query('DELETE FROM player_career_history WHERE id = ? AND player_id = ?', [b.id, profileId]);
    return ok(res, { success: true });
  }
});
