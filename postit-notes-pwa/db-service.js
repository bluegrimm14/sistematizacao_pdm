/**
 * db-service.js — Camada de acesso a dados do Post-it Notes PWA
 *
 * Abstrai todas as operações de persistência. O app.js não precisa
 * saber se os dados vêm da API REST (SQLite no servidor) ou do
 * localStorage (fallback offline).
 *
 * Estratégia:
 *   1. Tenta a API REST (http://localhost:3000/api/...)
 *   2. Se o servidor estiver offline, usa localStorage como fallback
 *      e sinaliza o status no console.
 */

const API_BASE = 'http://localhost:3000/api';

// Indicador de conectividade com o servidor (atualizado a cada operação)
let _serverOnline = true;

function _setServerStatus(online) {
  if (_serverOnline !== online) {
    _serverOnline = online;
    if (online) {
      console.info('[DB Service] ✅ Servidor reconectado — usando SQLite.');
    } else {
      console.warn('[DB Service] ⚠️ Servidor offline — usando localStorage como fallback.');
    }
  }
}

// ==========================================================================
// NOTAS
// ==========================================================================

/**
 * Carrega todas as notas do servidor (ou localStorage como fallback).
 * @returns {Promise<Array>}
 */
async function loadNotes() {
  try {
    const res = await fetch(`${API_BASE}/notes`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const notes = await res.json();
    _setServerStatus(true);
    return notes;
  } catch {
    _setServerStatus(false);
    return JSON.parse(localStorage.getItem('postit_notes')) || [];
  }
}

/**
 * Salva (cria ou atualiza) uma nota.
 * @param {Object} note - Objeto completo da nota
 * @param {boolean} isNew - true para criar, false para atualizar
 * @returns {Promise<boolean>}
 */
async function saveNote(note, isNew) {
  // Atualiza localStorage sempre (garante fallback e consistência offline)
  const localNotes = JSON.parse(localStorage.getItem('postit_notes')) || [];
  if (isNew) {
    localNotes.push(note);
  } else {
    const idx = localNotes.findIndex(n => n.id === note.id);
    if (idx !== -1) localNotes[idx] = note;
  }
  localStorage.setItem('postit_notes', JSON.stringify(localNotes));

  // Tenta persistir no servidor
  try {
    const method = isNew ? 'POST' : 'PUT';
    const url = isNew ? `${API_BASE}/notes` : `${API_BASE}/notes/${note.id}`;

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(note)
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || `HTTP ${res.status}`);
    }

    _setServerStatus(true);
    return true;
  } catch (err) {
    _setServerStatus(false);
    console.error('[DB Service] saveNote falhou:', err.message);
    return false;
  }
}

/**
 * Exclui uma nota pelo ID.
 * @param {string} id
 * @returns {Promise<boolean>}
 */
async function deleteNote(id) {
  // Remove do localStorage
  const localNotes = JSON.parse(localStorage.getItem('postit_notes')) || [];
  localStorage.setItem('postit_notes', JSON.stringify(localNotes.filter(n => n.id !== id)));

  // Tenta remover no servidor
  try {
    const res = await fetch(`${API_BASE}/notes/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    _setServerStatus(true);
    return true;
  } catch (err) {
    _setServerStatus(false);
    console.error('[DB Service] deleteNote falhou:', err.message);
    return false;
  }
}

// ==========================================================================
// TAGS (MARCADORES)
// ==========================================================================

/**
 * Carrega todas as tags do servidor (ou localStorage como fallback).
 * @returns {Promise<Array>}
 */
async function loadTags() {
  try {
    const res = await fetch(`${API_BASE}/tags`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const tags = await res.json();
    _setServerStatus(true);
    return tags;
  } catch {
    _setServerStatus(false);
    return JSON.parse(localStorage.getItem('postit_tags')) || [];
  }
}

/**
 * Cria uma nova tag.
 * @param {Object} tag - { id, name, color }
 * @returns {Promise<{success: boolean, error?: string}>}
 */
async function saveTag(tag) {
  // Atualiza localStorage
  const localTags = JSON.parse(localStorage.getItem('postit_tags')) || [];
  localTags.push(tag);
  localStorage.setItem('postit_tags', JSON.stringify(localTags));

  // Tenta persistir no servidor
  try {
    const res = await fetch(`${API_BASE}/tags`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(tag)
    });

    if (res.status === 409) {
      return { success: false, error: 'duplicate' };
    }

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    _setServerStatus(true);
    return { success: true };
  } catch (err) {
    _setServerStatus(false);
    console.error('[DB Service] saveTag falhou:', err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Exclui uma tag pelo ID.
 * Notas associadas terão tagId = null via FK ON DELETE SET NULL.
 * @param {string} id
 * @returns {Promise<boolean>}
 */
async function deleteTag(id) {
  // Remove do localStorage e atualiza notas associadas
  const localTags = JSON.parse(localStorage.getItem('postit_tags')) || [];
  localStorage.setItem('postit_tags', JSON.stringify(localTags.filter(t => t.id !== id)));

  const localNotes = JSON.parse(localStorage.getItem('postit_notes')) || [];
  localStorage.setItem('postit_notes', JSON.stringify(
    localNotes.map(n => n.tagId === id ? { ...n, tagId: 'none' } : n)
  ));

  // Tenta remover no servidor
  try {
    const res = await fetch(`${API_BASE}/tags/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    _setServerStatus(true);
    return true;
  } catch (err) {
    _setServerStatus(false);
    console.error('[DB Service] deleteTag falhou:', err.message);
    return false;
  }
}

// Expõe as funções globalmente para uso no app.js
window.dbService = {
  loadNotes,
  saveNote,
  deleteNote,
  loadTags,
  saveTag,
  deleteTag
};
