const { getDB }      = require('../lib/db');
const { requireAuth } = require('../lib/auth');
const { handle, ok, err } = require('../lib/helpers');

module.exports = handle('POST', async (req, res) => {
  const session = requireAuth(req, 'player');
  const db = getDB();
  const b = req.body || {};

  if (!b.request_id || !b.status) return err(res, 'request_id and status are required.');
  if (!['accepted','declined'].includes(b.status)) return err(res, 'status must be accepted or declined.');

  const [profile] = await db.query('SELECT id FROM player_profiles WHERE user_id = ?', [session.id]);
  if (!profile[0]) return err(res, 'Profile not found.', 404);

  const [result] = await db.query(
    "UPDATE contact_requests SET status = ?, responded_at = NOW() WHERE id = ? AND player_id = ?",
    [b.status, b.request_id, profile[0].id]
  );
  if (result.affectedRows === 0) return err(res, 'Request not found.', 404);

  return ok(res, { success: true });
});
