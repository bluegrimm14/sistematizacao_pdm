/**
 * server.js — API REST Express para o Post-it Notes PWA
 * Post-it Notes PWA
 *
 * Endpoints disponíveis:
 *
 *   NOTAS
 *   GET    /api/notes          → Lista todas as notas
 *   POST   /api/notes          → Cria nova nota
 *   PUT    /api/notes/:id      → Atualiza nota existente
 *   DELETE /api/notes/:id      → Exclui nota
 *
 *   TAGS (Marcadores)
 *   GET    /api/tags           → Lista todas as tags
 *   POST   /api/tags           → Cria nova tag
 *   DELETE /api/tags/:id       → Exclui tag (notas associadas têm tag_id = NULL)
 *
 * Para iniciar:
 *   node server/server.js
 *
 * O app PWA ficará disponível em: http://localhost:3000
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

// ==========================================================================
// MIDDLEWARES
// ==========================================================================

app.use(cors());
app.use(express.json());

// Serve os arquivos estáticos do PWA (index.html, app.js, app.css, etc.)
app.use(express.static(path.join(__dirname, '..', 'postit-notes-pwa')));

// ==========================================================================
// ROTAS — NOTAS
// ==========================================================================

/**
 * GET /api/notes
 * Retorna todas as notas ordenadas pela mais recente.
 *
 * Query SQL equivalente:
 *   SELECT * FROM notes ORDER BY created_at DESC;
 */
app.get('/api/notes', (req, res) => {
  try {
    const notes = db.prepare(`
      SELECT
        id,
        title,
        content,
        color,
        tag_id             AS tagId,
        due_date           AS dueDate,
        reminder_minutes   AS reminderMinutes,
        reminder_triggered AS reminderTriggered,
        created_at         AS createdAt,
        updated_at         AS updatedAt
      FROM notes
      ORDER BY created_at DESC
    `).all();

    // Converte reminder_triggered de INTEGER (0/1) para boolean
    const formatted = notes.map(n => ({
      ...n,
      reminderTriggered: n.reminderTriggered === 1
    }));

    res.json(formatted);
  } catch (err) {
    console.error('[GET /api/notes]', err.message);
    res.status(500).json({ error: 'Erro ao buscar notas.' });
  }
});

/**
 * POST /api/notes
 * Cria uma nova nota.
 *
 * Body esperado: { id, title, content, color, tagId, dueDate, reminderMinutes, reminderTriggered }
 */
app.post('/api/notes', (req, res) => {
  const {
    id, title, content, color,
    tagId, dueDate, reminderMinutes, reminderTriggered
  } = req.body;

  if (!id || !title || !content) {
    return res.status(400).json({ error: 'Campos obrigatórios: id, title, content.' });
  }

  try {
    db.prepare(`
      INSERT INTO notes (id, title, content, color, tag_id, due_date, reminder_minutes, reminder_triggered)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      title,
      content,
      color || '#FFF9C4',
      tagId === 'none' ? null : (tagId || null),
      dueDate || null,
      reminderMinutes || 'none',
      reminderTriggered ? 1 : 0
    );

    const created = db.prepare('SELECT * FROM notes WHERE id = ?').get(id);
    res.status(201).json({ ...created, tagId: created.tag_id, reminderTriggered: created.reminder_triggered === 1 });
  } catch (err) {
    console.error('[POST /api/notes]', err.message);
    res.status(500).json({ error: 'Erro ao criar nota.' });
  }
});

/**
 * PUT /api/notes/:id
 * Atualiza uma nota existente.
 *
 * Body esperado: { title, content, color, tagId, dueDate, reminderMinutes, reminderTriggered }
 */
app.put('/api/notes/:id', (req, res) => {
  const { id } = req.params;
  const {
    title, content, color,
    tagId, dueDate, reminderMinutes, reminderTriggered
  } = req.body;

  if (!title || !content) {
    return res.status(400).json({ error: 'Campos obrigatórios: title, content.' });
  }

  try {
    const result = db.prepare(`
      UPDATE notes
      SET
        title              = ?,
        content            = ?,
        color              = ?,
        tag_id             = ?,
        due_date           = ?,
        reminder_minutes   = ?,
        reminder_triggered = ?,
        updated_at         = datetime('now', 'localtime')
      WHERE id = ?
    `).run(
      title,
      content,
      color || '#FFF9C4',
      tagId === 'none' ? null : (tagId || null),
      dueDate || null,
      reminderMinutes || 'none',
      reminderTriggered ? 1 : 0,
      id
    );

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Nota não encontrada.' });
    }

    res.json({ success: true, id });
  } catch (err) {
    console.error('[PUT /api/notes/:id]', err.message);
    res.status(500).json({ error: 'Erro ao atualizar nota.' });
  }
});

/**
 * DELETE /api/notes/:id
 * Exclui uma nota pelo ID.
 *
 * Query SQL equivalente:
 *   DELETE FROM notes WHERE id = 'note-xxx';
 */
app.delete('/api/notes/:id', (req, res) => {
  const { id } = req.params;

  try {
    const result = db.prepare('DELETE FROM notes WHERE id = ?').run(id);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Nota não encontrada.' });
    }

    res.json({ success: true, id });
  } catch (err) {
    console.error('[DELETE /api/notes/:id]', err.message);
    res.status(500).json({ error: 'Erro ao excluir nota.' });
  }
});

// ==========================================================================
// ROTAS — TAGS (MARCADORES)
// ==========================================================================

/**
 * GET /api/tags
 * Retorna todas as tags cadastradas.
 *
 * Query SQL equivalente:
 *   SELECT * FROM tags ORDER BY name;
 */
app.get('/api/tags', (req, res) => {
  try {
    const tags = db.prepare('SELECT * FROM tags ORDER BY name').all();
    res.json(tags);
  } catch (err) {
    console.error('[GET /api/tags]', err.message);
    res.status(500).json({ error: 'Erro ao buscar tags.' });
  }
});

/**
 * POST /api/tags
 * Cria uma nova tag.
 *
 * Body esperado: { id, name, color }
 */
app.post('/api/tags', (req, res) => {
  const { id, name, color } = req.body;

  if (!id || !name || !color) {
    return res.status(400).json({ error: 'Campos obrigatórios: id, name, color.' });
  }

  try {
    db.prepare('INSERT INTO tags (id, name, color) VALUES (?, ?, ?)').run(id, name, color);
    const created = db.prepare('SELECT * FROM tags WHERE id = ?').get(id);
    res.status(201).json(created);
  } catch (err) {
    if (err.message.includes('UNIQUE constraint failed')) {
      return res.status(409).json({ error: 'Já existe um marcador com esse nome.' });
    }
    console.error('[POST /api/tags]', err.message);
    res.status(500).json({ error: 'Erro ao criar tag.' });
  }
});

/**
 * DELETE /api/tags/:id
 * Exclui uma tag. As notas associadas ficam com tag_id = NULL (via FK ON DELETE SET NULL).
 *
 * Query SQL equivalente:
 *   DELETE FROM tags WHERE id = 'tag-xxx';
 *   -- Notas associadas: tag_id automaticamente vira NULL
 */
app.delete('/api/tags/:id', (req, res) => {
  const { id } = req.params;

  try {
    const result = db.prepare('DELETE FROM tags WHERE id = ?').run(id);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Tag não encontrada.' });
    }

    res.json({ success: true, id });
  } catch (err) {
    console.error('[DELETE /api/tags/:id]', err.message);
    res.status(500).json({ error: 'Erro ao excluir tag.' });
  }
});

// ==========================================================================
// FALLBACK — SPA Route
// ==========================================================================

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'postit-notes-pwa', 'index.html'));
});

// ==========================================================================
// INICIALIZAÇÃO
// ==========================================================================

app.listen(PORT, () => {
  console.log('');
  console.log('┌──────────────────────────────────────────────┐');
  console.log('│       Post-it Notes PWA — Servidor API       │');
  console.log('├──────────────────────────────────────────────┤');
  console.log(`│  App:    http://localhost:${PORT}                 │`);
  console.log(`│  Banco:  server/postit.db                    │`);
  console.log('│                                              │');
  console.log('│  Endpoints disponíveis:                      │');
  console.log('│    GET    /api/notes                         │');
  console.log('│    POST   /api/notes                         │');
  console.log('│    PUT    /api/notes/:id                     │');
  console.log('│    DELETE /api/notes/:id                     │');
  console.log('│    GET    /api/tags                          │');
  console.log('│    POST   /api/tags                          │');
  console.log('│    DELETE /api/tags/:id                      │');
  console.log('└──────────────────────────────────────────────┘');
  console.log('');
});
