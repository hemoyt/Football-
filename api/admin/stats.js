const { getDB }      = require('../lib/db');
const { requireAuth } = require('../lib/auth');
const { handle, ok } = require('../lib/helpers');

module.exports = handle('GET', async (req, res) => {
  requireAuth(req, 'admin');
  const db = getDB();

  const [[players]]  = await db.query("SELECT COUNT(*) as cnt FROM player_profiles WHERE is_deleted = 0");
  const [[pending]]  = await db.query("SELECT COUNT(*) as cnt FROM club_profiles WHERE verification_status = 'pending' AND is_deleted = 0");
  const [[verified]] = await db.query("SELECT COUNT(*) as cnt FROM club_profiles WHERE verification_status = 'verified' AND is_deleted = 0");
  const [[rejected]] = await db.query("SELECT COUNT(*) as cnt FROM club_profiles WHERE verification_status = 'rejected' AND is_deleted = 0");
  const [[requests]] = await db.query("SELECT COUNT(*) as cnt FROM contact_requests");

  return ok(res, {
    total_players:  players.cnt,
    pending_clubs:  pending.cnt,
    verified_clubs: verified.cnt,
    rejected_clubs: rejected.cnt,
    total_requests: requests.cnt,
  });
});
