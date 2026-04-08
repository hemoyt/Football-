const { getDB }      = require('../lib/db');
const { requireAuth } = require('../lib/auth');
const { handle, ok } = require('../lib/helpers');

module.exports = handle('GET', async (req, res) => {
  requireAuth(req, 'admin');
  const db = getDB();
  const q = req.query || {};

  const page    = Math.max(1, parseInt(q.page)     || 1);
  const perPage = Math.min(100, parseInt(q.per_page) || 25);
  const offset  = (page - 1) * perPage;

  const [[{ total }]] = await db.query("SELECT COUNT(*) as total FROM club_profiles WHERE is_deleted = 0");
  const [clubs] = await db.query(
    `SELECT cp.*, u.email
     FROM club_profiles cp
     JOIN users u ON u.id = cp.user_id
     WHERE cp.is_deleted = 0
     ORDER BY cp.created_at DESC
     LIMIT ? OFFSET ?`,
    [perPage, offset]
  );

  return ok(res, { clubs, total, pages: Math.max(1, Math.ceil(total / perPage)), page });
});
