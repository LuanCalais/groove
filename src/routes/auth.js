const router = require("express").Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { getDb } = require("../db/connection");

const JWT_SECRET =
  process.env.JWT_SECRET || "groove_dev_secret_yellow_submarine_753";

router.post("/register", (req, res) => {
  const { username, display_name, email, password } = req.body;

  if (!username || !display_name || !email || !password) {
    return res.status(400).json({ error: "All fields are required" });
  }

  if (password.length < 6) {
    return res
      .status(400)
      .json({ error: "Senha deve ter ao menos 6 caracteres" });
  }

  const db = getDb();

  const existingUser = db
    .prepare("SELECT id FROM users WHERE is_deleted = 0 AND (username = ? OR email = ?)")
    .get(username, email);

  if (existingUser) {
    return res.status(400).json({ error: "Username or email already in use" });
  }

  const passwordHash = bcrypt.hashSync(password, 10);

  const result = db
    .prepare(
      `
        INSERT INTO users (username, display_name, email, password_hash)
      VALUES (?, ?, ?, ?)    
    `,
    )
    .run(username, display_name, email, passwordHash);

  const token = jwt.sign({ id: result.lastInsertRowid, username }, JWT_SECRET, {
    expiresIn: "7d",
  });

  res.status(201).json({
    token,
    user: { id: result.lastInsertRowid, username, display_name, email },
  });
});

router.delete("/:id", (req, res) => {
  const { id } = req.params;
  if (!id) {
    res.status(400).json({ error: "Id do usuário é obrigatório" });
  }
  console.log("Aqui");
  const db = getDb();
  const user = db.prepare(`SELECT email, username FROM users WHERE id = ? AND is_deleted = 0 LIMIT 1`).get(id);

  if (!user) {
    res.status(404).json({ error: "Usuário não encontrado" });
  }

  /* TODO: Descomentar assim que tiver validação do middlewares
    if (req.user.id !== parseInt(req.params.id)) {
      return res.status(403).json({ error: 'Sem permissão para deletar este usuário' });
    }
  */

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

router.post('/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'E-mail e senha são obrigatórios' })
  }

  const db = getDb();
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);

  const token = jwt.sign(
    { id: user.id, username: user.username },
    JWT_SECRET,
    { expiresIn: '7d' }
  )

  const { password_hash, ...safeUser } = user;
  res.json({ token, user: safeUser });

})

module.exports = router;
