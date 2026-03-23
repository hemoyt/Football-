const { getDB }      = require('../lib/db');
const { requireAuth } = require('../lib/auth');
const { handle, ok } = require('../lib/helpers');

module.exports = handle('GET', async (req, res) => {
  requireAuth(req, 'club');
  const db  = getDB();
  const q   = req.query || {};

  const page    = Math.max(1, parseInt(q.page)     || 1);
  const perPage = Math.min(50, parseInt(q.per_page) || 20);
  const offset  = (page - 1) * perPage;

  let where = ['pp.is_deleted = 0'];
  const vals = [];

  if (q.position)    { where.push('pp.position_primary = ?');        vals.push(q.position); }
  if (q.nationality) { where.push('pp.nationality LIKE ?');           vals.push(`%${q.nationality}%`); }
  if (q.foot)        { where.push('pp.preferred_foot = ?');           vals.push(q.foot); }
  if (q.height_min)  { where.push('pp.height_cm >= ?');               vals.push(parseInt(q.height_min)); }
  if (q.height_max)  { where.push('pp.height_cm <= ?');               vals.push(parseInt(q.height_max)); }
  if (q.age_min) {
    where.push('TIMESTAMPDIFF(YEAR, pp.date_of_birth, CURDATE()) >= ?');
    vals.push(parseInt(q.age_min));
  }
  if (q.age_max) {
    where.push('TIMESTAMPDIFF(YEAR, pp.date_of_birth, CURDATE()) <= ?');
    vals.push(parseInt(q.age_max));
  }

  const whereStr = where.join(' AND ');

  const [[{ total }]] = await db.query(
    `SELECT COUNT(*) as total FROM player_profiles pp WHERE ${whereStr}`,
    vals
  );

  const [players] = await db.query(
    `SELECT pp.id, pp.user_id, pp.full_name, pp.date_of_birth, pp.nationality, pp.country_residence,
            pp.position_primary, pp.position_secondary, pp.preferred_foot, pp.height_cm, pp.weight_kg,
            pp.bio, pp.photo_url, pp.profile_views,
            TIMESTAMPDIFF(YEAR, pp.date_of_birth, CURDATE()) AS age,
            ps.speed, ps.dribbling, ps.shooting, ps.passing, ps.defending, ps.heading
     FROM player_profiles pp
     LEFT JOIN player_skills ps ON ps.player_id = pp.id
     WHERE ${whereStr}
     ORDER BY pp.created_at DESC
     LIMIT ? OFFSET ?`,
    [...vals, perPage, offset]
  );

  const pages = Math.max(1, Math.ceil(total / perPage));
  return ok(res, { players, total, pages, page });
});
