const { getDB }      = require('../lib/db');
const { requireAuth } = require('../lib/auth');
const { handle, ok, err } = require('../lib/helpers');

module.exports = handle(['GET','POST','DELETE'], async (req, res) => {
  const db = getDB();

  if (req.method === 'GET') {
    const playerId = req.query?.id;
    if (playerId) {
      const [rows] = await db.query('SELECT * FROM player_videos WHERE player_id = ? ORDER BY is_primary DESC, id', [playerId]);
      return ok(res, rows);
    }
    const session = requireAuth(req, 'player');
    const [profile] = await db.query('SELECT id FROM player_profiles WHERE user_id = ?', [session.id]);
    if (!profile[0]) return ok(res, []);
    const [rows] = await db.query('SELECT * FROM player_videos WHERE player_id = ? ORDER BY is_primary DESC, id', [profile[0].id]);
    return ok(res, rows);
  }

  const session = requireAuth(req, 'player');
  const [profile] = await db.query('SELECT id FROM player_profiles WHERE user_id = ?', [session.id]);
  if (!profile[0]) return err(res, 'Profile not found.', 404);
  const profileId = profile[0].id;

  if (req.method === 'POST') {
    const b = req.body || {};
    if (!b.video_url) return err(res, 'video_url is required.');
    const videoType = b.video_type || 'youtube';
    const [r] = await db.query(
      'INSERT INTO player_videos (player_id, video_type, video_url, title, is_primary) VALUES (?, ?, ?, ?, ?)',
      [profileId, videoType, b.video_url, b.title || null, b.is_primary ? 1 : 0]
    );
    return ok(res, { id: r.insertId, player_id: profileId, video_type: videoType, video_url: b.video_url, title: b.title || null }, 201);
  }

  if (req.method === 'DELETE') {
    const b = req.body || {};
    if (!b.id) return err(res, 'id is required.');
    await db.query('DELETE FROM player_videos WHERE id = ? AND player_id = ?', [b.id, profileId]);
    return ok(res, { success: true });
  }
});
