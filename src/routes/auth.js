const router = require("express").Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { getDb } = require("../db/connection");

const JWT_SECRET =
  process.env.JWT_SECRET || "groove_dev_secret_yellow_submarine_753";

router.post("/register", (req, red) => {
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
    .prepare("SELECT id FROM users WHERE username = ? OR email = ?")
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

// TODO: Create auth/login route
router.get("/login", (_req, res) =>
  res.json({ status: "ok", app: "Login route exists" }),
);

module.exports = router;
