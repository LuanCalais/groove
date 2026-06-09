CREATE TABLE
    IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL UNIQUE,
        display_name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        bio TEXT,
        favorite_genre TEXT,
        favorite_artist TEXT,
        created_at DATETIME NOT NULL DEFAULT (datetime ('now'))
    );