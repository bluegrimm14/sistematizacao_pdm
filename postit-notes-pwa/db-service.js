/**
 * db-service.js — Camada de acesso a dados do NoteIt PWA
 *
 * Persistência 100% via localStorage.
 * Funciona offline e em qualquer dispositivo, sem necessidade de servidor.
 */

const STORAGE_KEYS = {
  notes: 'noteit_notes',
  tags: 'noteit_tags',
};

// Migração única: move dados das chaves antigas (postit_*) para as novas (noteit_*)
(function _migrateOldData() {
  const OLD_KEYS = { notes: 'postit_notes', tags: 'postit_tags' };
  const migrated = localStorage.getItem('noteit_migrated_v1');
  if (migrated) return;

  [['notes', OLD_KEYS.notes], ['tags', OLD_KEYS.tags]].forEach(([type, oldKey]) => {
    const oldData = localStorage.getItem(oldKey);
    if (oldData && !localStorage.getItem(STORAGE_KEYS[type])) {
      localStorage.setItem(STORAGE_KEYS[type], oldData);
      console.info(`[DB Service] Migração: ${oldKey} → ${STORAGE_KEYS[type]}`);
    }
  });

  localStorage.setItem('noteit_migrated_v1', '1');
})();

// ==========================================================================
// UTILITÁRIOS INTERNOS
// ==========================================================================

function _readStorage(key) {
  try {
    return JSON.parse(localStorage.getItem(key)) || [];
  } catch {
    return [];
  }
}

function _writeStorage(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify(data));
    return true;
  } catch (err) {
    console.error('[DB Service] Falha ao salvar em localStorage:', err);
    return false;
  }
}

// ==========================================================================
// NOTAS
// ==========================================================================

/**
 * Carrega todas as notas salvas.
 * @returns {Promise<Array>}
 */
async function loadNotes() {
  return _readStorage(STORAGE_KEYS.notes);
}

/**
 * Salva (cria ou atualiza) uma nota.
 * @param {Object} note - Objeto completo da nota
 * @param {boolean} isNew - true para criar, false para atualizar
 * @returns {Promise<boolean>}
 */
async function saveNote(note, isNew) {
  const notes = _readStorage(STORAGE_KEYS.notes);
  if (isNew) {
    notes.push(note);
  } else {
    const idx = notes.findIndex(n => n.id === note.id);
    if (idx !== -1) {
      notes[idx] = note;
    } else {
      // Segurança: se não encontrar pelo id, adiciona como novo
      notes.push(note);
    }
  }
  return _writeStorage(STORAGE_KEYS.notes, notes);
}

/**
 * Exclui uma nota pelo ID.
 * @param {string} id
 * @returns {Promise<boolean>}
 */
async function deleteNote(id) {
  const notes = _readStorage(STORAGE_KEYS.notes);
  return _writeStorage(STORAGE_KEYS.notes, notes.filter(n => n.id !== id));
}

// ==========================================================================
// TAGS (MARCADORES)
// ==========================================================================

/**
 * Carrega todas as tags salvas.
 * @returns {Promise<Array>}
 */
async function loadTags() {
  return _readStorage(STORAGE_KEYS.tags);
}

/**
 * Cria uma nova tag.
 * @param {Object} tag - { id, name, color }
 * @returns {Promise<{success: boolean, error?: string}>}
 */
async function saveTag(tag) {
  const tags = _readStorage(STORAGE_KEYS.tags);

  // Verifica duplicata pelo nome (case-insensitive)
  const duplicate = tags.some(
    t => t.name.trim().toLowerCase() === tag.name.trim().toLowerCase()
  );
  if (duplicate) {
    return { success: false, error: 'duplicate' };
  }

  tags.push(tag);
  const ok = _writeStorage(STORAGE_KEYS.tags, tags);
  return ok ? { success: true } : { success: false, error: 'storage_error' };
}

/**
 * Exclui uma tag pelo ID.
 * Notas associadas terão tagId = 'none'.
 * @param {string} id
 * @returns {Promise<boolean>}
 */
async function deleteTag(id) {
  const tags = _readStorage(STORAGE_KEYS.tags);
  const notes = _readStorage(STORAGE_KEYS.notes);

  _writeStorage(STORAGE_KEYS.tags, tags.filter(t => t.id !== id));
  _writeStorage(STORAGE_KEYS.notes, notes.map(n => n.tagId === id ? { ...n, tagId: 'none' } : n));

  return true;
}

// Expõe as funções globalmente para uso no app.js
window.dbService = {
  loadNotes,
  saveNote,
  deleteNote,
  loadTags,
  saveTag,
  deleteTag,
};
