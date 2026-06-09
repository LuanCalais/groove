CREATE TABLE
    IF NOT EXISTS posts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
        content TEXT NOT NULL CHECK (length (content) <= 500),
        post_type TEXT NOT NULL DEFAULT 'opinion' CHECK (
            post_type IN (
                'opinion',
                'review',
                'recommendation',
                'question',
                'listening_now'
            )
        ),
        music_ref TEXT,
        music_ref_type TEXT CHECK (
            music_ref_type IN ('track', 'album', 'artist')
            OR music_ref_type IS NULL
        ),
        created_at DATETIME NOT NULL DEFAULT (datetime ('now')),
        updated_at DATETIME NOT NULL DEFAULT (datetime ('now'))
    );

CREATE TRIGGER IF NOT EXISTS posts_updated_at AFTER
UPDATE ON posts FOR EACH ROW BEGIN
UPDATE posts
SET
    updated_at = datetime ('now')
WHERE
    id = OLD.id;

END;