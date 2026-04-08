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

  const [[{ total }]] = await db.query("SELECT COUNT(*) as total FROM player_profiles WHERE is_deleted = 0");
  const [players] = await db.query(
    `SELECT pp.*, u.email, u.is_active
     FROM player_profiles pp
     JOIN users u ON u.id = pp.user_id
     WHERE pp.is_deleted = 0
     ORDER BY pp.created_at DESC
     LIMIT ? OFFSET ?`,
    [perPage, offset]
  );

  return ok(res, { players, total, pages: Math.max(1, Math.ceil(total / perPage)), page });
});
