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

  const exists = db.prepare(`SELECT email, username FROM users WHERE id = ? AND is_deleted = 0 LIMIT 1`).get(req.user.id);
  if (!exists) {
    res.status(404).json({ error: "Usuário não encontrado" });
    return;
  }

  db.prepare(`
    UPDATE users
    SET
      display_name    = COALESCE(?, display_name),
      bio             = COALESCE(?, bio),
      favorite_genre  = COALESCE(?, favorite_genre),
      favorite_artist = COALESCE(?, favorite_artist)
    WHERE id = ? AND is_deleted = 0
  `).run(display_name || null, bio || null, favorite_genre || null, favorite_artist || null, req.user.id);

  const updated = db.prepare(`
    SELECT id, username, display_name, email, bio, favorite_genre, favorite_artist, created_at
    FROM users WHERE id = ?
  `).get(req.user.id);

  res.json({ user: updated });
});

router.delete("/:id", authRequired, (req, res) => {
  const { id } = req.params;
  if (!id) {
    res.status(400).json({ error: "Id do usuário é obrigatório" });
  }
  const db = getDb();
  const user = db.prepare(`SELECT email, username FROM users WHERE id = ? AND is_deleted = 0 LIMIT 1`).get(id);

  if (!user) {
    res.status(404).json({ error: "Usuário não encontrado" });
    return;
  }

  if (req.user.id !== parseInt(req.params.id)) {
    return res.status(403).json({ error: 'Sem permissão para deletar este usuário' });
  }

  const timestamp = Date.now();

  db.prepare(`
    UPDATE users 
    SET is_deleted = 1,
        email = ?,
        username = ?
     WHERE id = ?      
  `).run(
    `_DELETED_${timestamp}_${user.email}`,
    `_DELETED_${timestamp}_${user.username}`,
    id
  );

  res.json({ message: 'Usuário deletado com sucesso' });

});

router.get('/:username/posts', authOptional, (req, res) => {
  const db = getDb();
  const limit = Math.min(parseInt(req.query.limit) || 20, 50);
  const offset = parseInt(req.query.offset) || 0;

  const user = db.prepare('SELECT id FROM users WHERE username = ?').get(req.params.username);
  if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });

  const posts = db.prepare(`
    SELECT
      p.*,
      u.username,
      u.display_name,
      COUNT(DISTINCT l.id)  AS likes_count,
      COUNT(DISTINCT c.id)  AS comments_count
      ${req.user ? ', MAX(CASE WHEN l2.user_id = ? THEN 1 ELSE 0 END) AS liked_by_me' : ''}
    FROM posts p
    JOIN users u ON u.id = p.user_id
    LEFT JOIN likes l ON l.post_id = p.id
    LEFT JOIN likes l2 ON l2.post_id = p.id AND l2.user_id = ${req.user ? '?' : 'NULL'}
    LEFT JOIN comments c ON c.post_id = p.id
    WHERE p.user_id = ?
    GROUP BY p.id
    ORDER BY p.created_at DESC
    LIMIT ? OFFSET ?
  `).all(...(req.user ? [req.user.id, req.user.id] : []), user.id, limit, offset);

  res.json({ posts, limit, offset });
});

router.post('/:username/follow', authRequired, (req, res) => {
  const db = getDb();
  const target = db.prepare('SELECT id FROM users WHERE username = ?').get(req.params.username);
  if (!target) return res.status(404).json({ error: 'Usuário não encontrado' });
  
  if (target.id === req.user.id) {
    return res.status(400).json({ error: 'Você não pode seguir a si mesmo' });
  }

  const existing = db.prepare(
    'SELECT id FROM follows WHERE follower_id = ? AND following_id = ?'
  ).get(req.user.id, target.id);

  if (existing) {
    db.prepare('DELETE FROM follows WHERE follower_id = ? AND following_id = ?').run(req.user.id, target.id);
    return res.json({ following: false });
  }

  db.prepare('INSERT INTO follows (follower_id, following_id) VALUES (?, ?)').run(req.user.id, target.id);
  res.json({ following: true });

});

module.exports = router;