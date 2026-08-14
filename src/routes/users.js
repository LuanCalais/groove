const router = require('express').Router();
const { getDb } = require('../db/connection');
const { authRequired, authOptional } = require('./middlewares/auth');

router.get('/', authOptional, (req, res) => {
  const db = getDb();
  const users = db.prepare(`
    SELECT 
      id, email, username, display_name, bio, favorite_genre, favorite_artist 
    FROM users
    WHERE is_deleted = 0
    ORDER BY created_at DESC
  `).all();

  res.json({ users });
});

router.get('/:username', authOptional, (req, res) => {
  const db = getDb();
  const users = db.prepare(`
    SELECT
      u.id, u.username, u.display_name, u.bio,
      u.favorite_genre, u.favorite_artist, u.created_at,
      COUNT(DISTINCT p.id)  AS posts_count,
      COUNT(DISTINCT f1.id) AS followers_count,
      COUNT(DISTINCT f2.id) AS following_count
      ${req.user ? ', MAX(CASE WHEN f3.follower_id = ? THEN 1 ELSE 0 END) AS followed_by_me' : ''}
    FROM users u
    LEFT JOIN posts p   ON p.user_id = u.id
    LEFT JOIN follows f1 ON f1.following_id = u.id
    LEFT JOIN follows f2 ON f2.follower_id  = u.id
    ${req.user ? 'LEFT JOIN follows f3 ON f3.following_id = u.id AND f3.follower_id = ?' : ''}
    WHERE u.username LIKE ? AND u.is_deleted = 0 
    GROUP BY u.id
  `).all(...(req.user ? [req.user.id, req.user.id] : []), `%${req.params.username}%`);

  if (!users) return res.status(404).json({ error: 'Usuário não encontrado' })
  res.json({ users });
});

router.patch('/me', authRequired, (req, res) => {
  const { display_name, bio, favorite_genre, favorite_artist } = req.body;
  const db = getDb();

  db.prepare(`
    UPDATE users
    SET
      display_name    = COALESCE(?, display_name),
      bio             = COALESCE(?, bio),
      favorite_genre  = COALESCE(?, favorite_genre),
      favorite_artist = COALESCE(?, favorite_artist)
    WHERE id = ?
  `).run(display_name || null, bio || null, favorite_genre || null, favorite_artist || null, req.user.id);

  const updated = db.prepare(`
    SELECT id, username, display_name, email, bio, favorite_genre, favorite_artist, created_at
    FROM users WHERE id = ?
  `).get(req.user.id);

  res.json({ user: updated });
});


module.exports = router;