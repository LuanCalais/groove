const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');
const { config } = require('dotenv');

const DB_PATH = process.env.DB_PATH || './groove.db';
const MIGRATIONS_DIR = path.join(__dirname, '../../migrations');

const db = new Database(DB_PATH);

// ativa FK no sqlite
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
    CREATE TABLE IF NOT EXISTS _migrations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        filename TEXT NOT NULL UNIQUE,
        applied_at DATETIME NOT NULL DEFAULT (datetime('now'))
    )
`);

const applied = db
    .prepare('SELECT filename FROM _migrations')
    .all()
    .map(r => r.filename);

const files = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter(f => f.endsWith('.sql'))
    .sort();

let ran = 0;

for (const file of files) {
    if (applied.includes(file)) {
        console.log(`skip ${file}`);
        continue;
    }

    const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');

    db.transaction(() => {
        db.exec(sql);
        db.prepare('INSERT INTO _migrations (filename) VALUES (?)').run(file);
    })();

    console.log(`✓ - ${file}`);
    ran++;
}

if (ran === 0) {
    console.log('Nenhuma migration nova');
} else {
    console.log(`\n${ran} migration(s) aplicada(s).`);
}

db.close();