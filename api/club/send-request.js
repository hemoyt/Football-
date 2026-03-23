const { getDB }      = require('../lib/db');
const { requireAuth } = require('../lib/auth');
const { handle, ok, err } = require('../lib/helpers');

module.exports = handle('POST', async (req, res) => {
  const session = requireAuth(req, 'club');
  const db = getDB();
  const b = req.body || {};
  if (!b.player_id) return err(res, 'player_id is required.');

  const [club] = await db.query(
    "SELECT id, verification_status FROM club_profiles WHERE user_id = ?",
    [session.id]
  );
  if (!club[0]) return err(res, 'Club not found.', 404);
  if (club[0].verification_status !== 'verified') return err(res, 'Club must be verified to send requests.', 403);

  try {
    const [r] = await db.query(
      "INSERT INTO contact_requests (club_id, player_id, status, message) VALUES (?, ?, 'pending', ?)",
      [club[0].id, b.player_id, b.message || null]
    );
    return ok(res, { id: r.insertId, club_id: club[0].id, player_id: b.player_id, status: 'pending' }, 201);
  } catch (e) {
    if (e.code === 'ER_DUP_ENTRY') return err(res, 'Request already sent to this player.', 409);
    throw e;
  }
});
