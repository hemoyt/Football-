const { getDB }      = require('../lib/db');
const { requireAuth } = require('../lib/auth');
const { handle, ok, err } = require('../lib/helpers');

module.exports = handle('POST', async (req, res) => {
  const session = requireAuth(req, 'admin');
  const db = getDB();
  const b = req.body || {};

  if (!b.user_id || !b.action) return err(res, 'user_id and action are required.');
  if (!['suspend','unsuspend','delete'].includes(b.action)) return err(res, 'action must be suspend, unsuspend, or delete.');

  if (b.action === 'delete') {
    await db.query('UPDATE users SET is_deleted = 1 WHERE id = ?', [b.user_id]);
    await db.query('UPDATE player_profiles SET is_deleted = 1 WHERE user_id = ?', [b.user_id]);
    await db.query('UPDATE club_profiles SET is_deleted = 1 WHERE user_id = ?', [b.user_id]);
  } else {
    const isActive = b.action === 'unsuspend' ? 1 : 0;
    await db.query('UPDATE users SET is_active = ? WHERE id = ?', [isActive, b.user_id]);
  }

  await db.query(
    'INSERT INTO system_logs (actor_id, action, target_type, target_id) VALUES (?, ?, ?, ?)',
    [session.id, b.action + '_user', 'user', b.user_id]
  );

  return ok(res, { success: true });
});
