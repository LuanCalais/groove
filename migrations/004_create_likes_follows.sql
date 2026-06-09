CREATE TABLE
    IF NOT EXISTS likes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
        post_id INTEGER NOT NULL REFERENCES posts (id) ON DELETE CASCADE,
        created_at DATETIME NOT NULL DEFAULT (datetime ('now')),
        UNIQUE (user_id, post_id)
    );

CREATE TABLE
    IF NOT EXISTS follows (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        follower_id INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
        following_id INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
        created_at DATETIME NOT NULL DEFAULT (datetime ('now')),
        UNIQUE (follower_id, following_id),
        CHECK (follower_id != following_id)
    );