const { getDB }      = require('../lib/db');
const { requireAuth } = require('../lib/auth');
const { handle, ok, err } = require('../lib/helpers');

module.exports = handle('GET', async (req, res) => {
  const session = requireAuth(req, 'club');
  const db = getDB();
  const playerId = req.query?.player_id;
  if (!playerId) return err(res, 'player_id is required.');

  const [club] = await db.query('SELECT id FROM club_profiles WHERE user_id = ?', [session.id]);
  if (!club[0]) return ok(res, { status: null });

  const [rows] = await db.query(
    'SELECT status FROM contact_requests WHERE club_id = ? AND player_id = ? LIMIT 1',
    [club[0].id, playerId]
  );
  return ok(res, { status: rows[0]?.status || null });
});
