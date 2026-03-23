const { getDB }      = require('../lib/db');
const { requireAuth } = require('../lib/auth');
const { handle, ok, err } = require('../lib/helpers');

module.exports = handle('GET', async (req, res) => {
  const session = requireAuth(req, 'player');
  const db = getDB();

  const [profile] = await db.query('SELECT id, profile_views FROM player_profiles WHERE user_id = ?', [session.id]);
  if (!profile[0]) return ok(res, { profile_views: 0, total_requests: 0 });

  const [reqCount] = await db.query(
    'SELECT COUNT(*) as cnt FROM contact_requests WHERE player_id = ?',
    [profile[0].id]
  );

  return ok(res, {
    profile_views:  profile[0].profile_views,
    total_requests: reqCount[0].cnt,
  });
});
