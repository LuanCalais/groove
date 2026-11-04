const router = require("express").Router();
const { getDb } = require("../db/connection");
const { authRequired, authOptional } = require('../routes/middlewares/auth');
const { POST_TYPES, MUSIC_REF_TYPES } = require('../utils/index');

router.get('/', authOptional, (req, res) => {
  const db = getDb();
  const limit = Math.min(parseInt(req.query.limit) || 20, 50);
  const offset = parseInt(req.query.offset) || 0;
  const type = req.query.type;

  let query = `
    SELECT
      p.*,
      u.username,
      u.display_name,
      COUNT(DISTINCT l.id) AS likes_count,
      COUNT(DISTINCT c.id) AS comments_count
      ${req.user ? ', MAX(CASE WHEN l2.user_id = ? THEN 1 ELSE 0 END) AS liked_by_me' : ''}
    FROM posts p
    JOIN users u ON u.id = p.user_id
    LEFT JOIN likes l    ON l.post_id = p.id
    LEFT JOIN comments c ON c.post_id = p.id
    ${req.user ? 'LEFT JOIN likes l2 ON l2.post_id = p.id AND l2.user_id = ?' : ''}
    ${type && POST_TYPES.includes(type) ? 'WHERE p.post_type = ?' : ''}
    GROUP BY p.id
    ORDER BY p.created_at DESC
    LIMIT ? OFFSET ?
  `;

  const params = [];
  if (req.user) params.push(req.user.id, req.user.id);
  if (type && POST_TYPES.includes(type)) params.push(type);
  params.push(limit, offset);

  const posts = db.prepare(query).all(...params);

  if (posts.length > 0) {
    const ids = posts.map(p => p.id);
    const placeholders = ids.map(() => '?').join(',');

    const tagRows = db.prepare(`
      SELECT pt.post_id, t.name
      FROM post_tags pt
      JOIN tags t ON t.id = pt.tag_id
      WHERE pt.post_id IN (${placeholders})
      ORDER BY t.name
    `).all(...ids);

    const tagsByPost = new Map();
    for (const row of tagRows) {
      if (!tagsByPost.has(row.post_id)) tagsByPost.set(row.post_id, []);
      tagsByPost.get(row.post_id).push(row.name);
    }

    for (const post of posts) {
      post.tags = tagsByPost.get(post.id) || [];
    }
  }

  res.json({ posts, limit, offset });
});

router.get('/feed', authRequired, (req, res) => {
  const db = getDb();
  const limit = Math.min(parseInt(req.query.limit) || 20, 50);
  const offset = parseInt(req.query.offset) || 0;

  if (!req?.user?.id) {
    res.status(400).json({ Error: "User ID is required" });
    return
  }

  const posts = db.prepare(`
          SELECT
            p.*,
            u.username,
            u.display_name,
            COUNT(DISTINCT l.id)  AS likes_count,
            COUNT(DISTINCT c.id)  AS comments_count,
            MAX(CASE WHEN l2.user_id = ? THEN 1 ELSE 0 END) AS liked_by_me
          FROM posts p
          JOIN users u ON u.id = p.user_id
          JOIN follows f ON f.following_id = p.user_id AND f.follower_id = ?
          LEFT JOIN likes l  ON l.post_id  = p.id
          LEFT JOIN likes l2 ON l2.post_id = p.id AND l2.user_id = ?
          LEFT JOIN comments c ON c.post_id = p.id
          GROUP BY p.id
          ORDER BY p.created_at DESC
          LIMIT ? OFFSET ?
  `).all(req.user.id, req.user.id, req.user.id, limit, offset);

  res.status(200).json({ posts, limit, offset });
});


router.post('/', authRequired, (req, res) => {
  const { content, post_type = 'opinion', music_ref, music_ref_type, tags } = req.body;
  console.log(req.body)
  if (!content || content.trim().length === 0) {
    return res.status(400).json({ error: 'Conteúdo é obrigatório' });
  }
  
  if (content.length > 500) {
    return res.status(400).json({ error: 'Post pode ter no máximo 500 caracteres' });
  }

  if (!POST_TYPES.includes(post_type)) {
    return res.status(400).json({ error: `Tipo de postagem inválido. Use: ${POST_TYPES.join(', ')}` });
  }

  if (music_ref_type && !MUSIC_REF_TYPES.includes(music_ref_type)) {
    return res.status(400).json({ error: `music_ref_type inválido. Use: ${MUSIC_REF_TYPES.join(', ')}` });
  }

  const db = getDb();

  const insertPost = db.transaction(() => {
    const result = db.prepare(`
      INSERT INTO posts (user_id, content, post_type, music_ref, music_ref_type)
      VALUES (?, ?, ?, ?, ?)
    `).run(req.user.id, content.trim(), post_type, music_ref || null, music_ref_type || null);

    const postId = result.lastInsertRowid;

    if (Array.isArray(tags) && tags.length > 0) {
      for (const name of tags.slice(0, 5)) { 
        const tag = db.prepare('INSERT OR IGNORE INTO tags (name) VALUES (?)').run(name.toLowerCase());
        const tagId = tag.lastInsertRowid
          || db.prepare('SELECT id FROM tags WHERE name = ?').get(name.toLowerCase()).id;
        db.prepare('INSERT OR IGNORE INTO post_tags (post_id, tag_id) VALUES (?, ?)').run(postId, tagId);  
      }
    }

    return postId;
  });

  const postId = insertPost();
  
  const post = db.prepare(`
    SELECT p.*, u.username, u.display_name
    FROM posts p JOIN users u ON u.id = p.user_id
    WHERE p.id = ?
  `).get(postId);

  res.status(201).json({ post });
})

module.exports = router;