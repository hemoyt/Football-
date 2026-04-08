const { getDB }      = require('../lib/db');
const { requireAuth } = require('../lib/auth');
const { handle, ok, err } = require('../lib/helpers');

module.exports = handle('POST', async (req, res) => {
  const session = requireAuth(req, 'admin');
  const db = getDB();
  const b = req.body || {};

  if (!b.club_id || !b.action) return err(res, 'club_id and action are required.');

  const STATUS_MAP = { verify: 'verified', reject: 'rejected', revoke: 'pending' };
  const newStatus = STATUS_MAP[b.action];
  if (!newStatus) return err(res, 'action must be verify, reject, or revoke.');

  const [result] = await db.query(
    `UPDATE club_profiles SET
       verification_status = ?,
       verified_by = ?,
       verified_at = ${b.action === 'verify' ? 'NOW()' : 'NULL'},
       rejection_reason = ?
     WHERE id = ?`,
    [newStatus, session.id, b.rejection_reason || null, b.club_id]
  );
  if (result.affectedRows === 0) return err(res, 'Club not found.', 404);

  // Log the action
  await db.query(
    'INSERT INTO system_logs (actor_id, action, target_type, target_id, meta) VALUES (?, ?, ?, ?, ?)',
    [session.id, `${b.action}_club`, 'club', b.club_id, b.rejection_reason ? JSON.stringify({ reason: b.rejection_reason }) : null]
  );

  return ok(res, { success: true });
});
