const { getDB }      = require('../lib/db');
const { requireAuth } = require('../lib/auth');
const { handle, ok, err } = require('../lib/helpers');

// On Vercel, file uploads use base64-encoded strings in JSON body.
// For large videos, use a YouTube/Vimeo URL instead via /api/player/videos
module.exports = handle('POST', async (req, res) => {
  const session = requireAuth(req, 'player');
  const db = getDB();
  const b = req.body || {};

  const [profile] = await db.query('SELECT id FROM player_profiles WHERE user_id = ?', [session.id]);
  if (!profile[0]) return err(res, 'Profile not found.', 404);
  const profileId = profile[0].id;

  // Accept either a base64 data URL or a video URL
  const videoUrl = b.video_url || b.video;
  if (!videoUrl) return err(res, 'video_url is required. For large files, use a YouTube or Vimeo link.');

  // For direct base64 uploads, check size (Vercel limit ~4.5MB body)
  if (videoUrl.startsWith('data:')) {
    const sizeBytes = Math.ceil((videoUrl.length * 3) / 4);
    if (sizeBytes > 4 * 1024 * 1024) {
      return err(res, 'Video file too large. Please upload to YouTube/Vimeo and paste the URL instead.', 413);
    }
  }

  const [r] = await db.query(
    'INSERT INTO player_videos (player_id, video_type, video_url, title, is_primary) VALUES (?, ?, ?, ?, 0)',
    [profileId, b.video_type || 'upload', videoUrl, b.title || null]
  );

  return ok(res, { id: r.insertId, url: videoUrl, message: 'تم رفع الفيديو' });
});
