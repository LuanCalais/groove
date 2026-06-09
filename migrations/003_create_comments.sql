CREATE TABLE
  IF NOT EXISTS comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    post_id INTEGER NOT NULL REFERENCES posts (id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    content TEXT NOT NULL CHECK (length (content) <= 300),
    created_at DATETIME NOT NULL DEFAULT (datetime ('now'))
  );