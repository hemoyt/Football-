const { getDB }      = require('../lib/db');
const { requireAuth } = require('../lib/auth');
const { handle, ok } = require('../lib/helpers');

module.exports = handle('GET', async (req, res) => {
  requireAuth(req, 'admin');
  const db = getDB();

  const [rows] = await db.query(
    `SELECT cp.*, u.email, u.created_at AS user_created_at
     FROM club_profiles cp
     JOIN users u ON u.id = cp.user_id
     WHERE cp.verification_status = 'pending' AND cp.is_deleted = 0
     ORDER BY cp.created_at DESC`
  );
  return ok(res, rows);
});
