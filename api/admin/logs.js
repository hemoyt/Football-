const { getDB }      = require('../lib/db');
const { requireAuth } = require('../lib/auth');
const { handle, ok } = require('../lib/helpers');

module.exports = handle('GET', async (req, res) => {
  requireAuth(req, 'admin');
  const db = getDB();
  const q = req.query || {};

  const page    = Math.max(1, parseInt(q.page)     || 1);
  const perPage = Math.min(100, parseInt(q.per_page) || 50);
  const offset  = (page - 1) * perPage;

  const [[{ total }]] = await db.query("SELECT COUNT(*) as total FROM system_logs");
  const [logs] = await db.query(
    `SELECT sl.*, u.email AS actor_email
     FROM system_logs sl
     LEFT JOIN users u ON u.id = sl.actor_id
     ORDER BY sl.created_at DESC
     LIMIT ? OFFSET ?`,
    [perPage, offset]
  );

  return ok(res, { logs, total, pages: Math.max(1, Math.ceil(total / perPage)), page });
});
