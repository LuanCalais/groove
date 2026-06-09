const Database = require('better-sqlite3');
const { config } = require('dotenv');

const DB_PATH = process.env.DB_PATH || './groove.db';

let instance = null;

function getDb() {
    if (!instance) {
        instance = new Database(DB_PATH);
        instance.pragma('journal_mode = WAL');
        instance.pragma('foreign_keys = ON');
    }
    return instance;
}

module.exports = { getDb };