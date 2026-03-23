const { getDB }      = require('../lib/db');
const { requireAuth } = require('../lib/auth');
const { handle, ok, err } = require('../lib/helpers');

module.exports = handle(['POST','DELETE'], async (req, res) => {
  const session = requireAuth(req, 'club');
  const db = getDB();
  const b = req.body || {};
  if (!b.player_id) return err(res, 'player_id is required.');

  const [club] = await db.query('SELECT id FROM club_profiles WHERE user_id = ?', [session.id]);
  if (!club[0]) return err(res, 'Club not found.', 404);

  await db.query('DELETE FROM saved_players WHERE club_id = ? AND player_id = ?', [club[0].id, b.player_id]);
  return ok(res, { success: true, message: 'تمت الإزالة' });
});
