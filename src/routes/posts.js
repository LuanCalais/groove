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
          COUNT(DISTINCT l.id)  AS likes_count,
          COUNT(DISTINCT c.id)  AS comments_count
          ${req.user ? ', MAX(CASE WHEN l2.user_id = ? THEN 1 ELSE 0 END) AS liked_by_me' : ''}
        FROM posts p
        JOIN users u ON u.id = p.user_id
        LEFT JOIN likes l ON l.post_id = p.id
        LEFT JOIN comments c ON c.post_id = p.id
        ${req.user ? 'LEFT JOIN likes l2 ON l2.post_id = p.id AND l2.user_id = ?' : ''}
        ${type && POST_TYPES.includes(type) ? 'WHERE p.post_type = ?' : ''}
        GROUP BY p.id
        ORDER BY p.created_at DESC
        LIMIT ? OFFSET ?
    `

    const params = []
    if (req.user) params.push(req.user.id, req.user.id);
    if (type && POST_TYPES.includes(type)) params.push(type);
    params.push(limit, offset);

    const posts = db.prepare(query).all(...params);
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

module.exports = router;