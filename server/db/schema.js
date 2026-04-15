const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, 'crm.sqlite');

let db;

function getDb() {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    initSchema();
  }
  return db;
}

function initSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS deals (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('title','brokerage','acquisitions','debt','equity')),
      stage TEXT NOT NULL DEFAULT 'lead' CHECK(stage IN ('lead','due_diligence','under_contract','closing','closed_won','dead')),
      property_address TEXT,
      property_type TEXT,
      deal_value REAL,
      loan_amount REAL,
      equity_amount REAL,
      cap_rate REAL,
      noi REAL,
      irr REAL,
      close_date TEXT,
      description TEXT,
      priority TEXT DEFAULT 'medium' CHECK(priority IN ('low','medium','high')),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS contacts (
      id TEXT PRIMARY KEY,
      deal_id TEXT NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      role TEXT,
      email TEXT,
      phone TEXT,
      company TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS notes (
      id TEXT PRIMARY KEY,
      deal_id TEXT NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
      content TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS documents (
      id TEXT PRIMARY KEY,
      deal_id TEXT NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
      filename TEXT NOT NULL,
      original_name TEXT NOT NULL,
      file_size INTEGER,
      mime_type TEXT,
      analysis TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
}

module.exports = { getDb };
