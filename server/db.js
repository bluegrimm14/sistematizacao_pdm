/**
 * db.js — Inicialização e configuração do banco SQLite
 * Post-it Notes PWA
 *
 * O arquivo do banco (postit.db) é criado automaticamente na
 * pasta server/ ao rodar o servidor pela primeira vez.
 *
 * Para consultar manualmente via CLI:
 *   sqlite3 server/postit.db
 *
 * Para usar uma GUI:
 *   DB Browser for SQLite: https://sqlitebrowser.org/
 */

const Database = require('better-sqlite3');
const path = require('path');

// Caminho do arquivo do banco de dados
const DB_PATH = path.join(__dirname, 'postit.db');

// Conecta (ou cria) o banco
const db = new Database(DB_PATH);

// Habilita foreign keys no SQLite (desativado por padrão)
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// ==========================================================================
// SCHEMA — Criação das Tabelas
// ==========================================================================

db.exec(`
  -- Tabela de Marcadores (Tags)
  -- Criada primeiro pois é referenciada por notas via FK
  CREATE TABLE IF NOT EXISTS tags (
    id         TEXT PRIMARY KEY,
    name       TEXT NOT NULL UNIQUE,
    color      TEXT NOT NULL
  );

  -- Tabela de Notas
  CREATE TABLE IF NOT EXISTS notes (
    id                 TEXT PRIMARY KEY,
    title              TEXT NOT NULL,
    content            TEXT NOT NULL,
    color              TEXT NOT NULL DEFAULT '#FFF9C4',
    tag_id             TEXT,
    due_date           TEXT,
    reminder_minutes   TEXT NOT NULL DEFAULT 'none',
    reminder_triggered INTEGER NOT NULL DEFAULT 0,
    created_at         TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
    updated_at         TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
    FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE SET NULL
  );
`);

// ==========================================================================
// SEED — Tags padrão do sistema (inseridas apenas se o banco estiver vazio)
// ==========================================================================

const tagCount = db.prepare('SELECT COUNT(*) AS count FROM tags').get();

if (tagCount.count === 0) {
  const insertTag = db.prepare(
    'INSERT OR IGNORE INTO tags (id, name, color) VALUES (?, ?, ?)'
  );

  const seedTags = [
    { id: 'tag-urgent', name: 'Urgente', color: '#FF8A80' },
    { id: 'tag-important', name: 'Importante', color: '#FFD180' },
    { id: 'tag-routine', name: 'Rotina', color: '#B9F6CA' }
  ];

  const seedMany = db.transaction((tags) => {
    for (const tag of tags) insertTag.run(tag.id, tag.name, tag.color);
  });

  seedMany(seedTags);
  console.log('[DB] Tags padrão inseridas com sucesso.');
}

console.log(`[DB] Banco SQLite conectado em: ${DB_PATH}`);

module.exports = db;
