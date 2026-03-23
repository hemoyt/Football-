const { getDB }      = require('../lib/db');
const { requireAuth } = require('../lib/auth');
const { handle, ok } = require('../lib/helpers');

module.exports = handle('GET', async (req, res) => {
  const session = requireAuth(req);
  const db = getDB();

  let full_name = '';
  let extra = {};

  if (session.role === 'player') {
    const [rows] = await db.query('SELECT full_name FROM player_profiles WHERE user_id = ?', [session.id]);
    full_name = rows[0]?.full_name || '';
  } else if (session.role === 'club') {
    const [rows] = await db.query('SELECT club_name, verification_status FROM club_profiles WHERE user_id = ?', [session.id]);
    full_name = rows[0]?.club_name || '';
    extra.verification_status = rows[0]?.verification_status || 'pending';
  } else if (session.role === 'admin') {
    full_name = 'المشرف';
  }

  return ok(res, { id: session.id, email: session.email, role: session.role, full_name, ...extra });
});
