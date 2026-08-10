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
  const user = db.prepare(`
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
    WHERE u.username = ? AND u.is_deleted = 0 
    GROUP BY u.id
  `).get(...(req.user ? [req.user.id, req.user.id] : []), req.params.username);

  if (!user) return res.status(404).json({ error: 'Usuário não encontrado' })
  res.json({ user });
});


module.exports = router;