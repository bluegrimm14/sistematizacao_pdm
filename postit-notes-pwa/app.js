/**
 * Post-it Notes PWA MD3
 * Lógica da aplicação - Gerenciamento de Notas, Tags, Temas, PWA e Lembretes.
 */

// ==========================================================================
// CONFIGURAÇÕES E VALORES PADRÃO
// ==========================================================================

// Cores dos Post-its (mesmas para modo claro e escuro, cores pastel/neon)
const POSTIT_COLORS = [
  // Pastéis
  { name: 'Amarelo Pastel', value: '#FFF9C4', textColor: '#5D4037' },
  { name: 'Rosa Pastel', value: '#F8BBD0', textColor: '#880E4F' },
  { name: 'Azul Pastel', value: '#B3E5FC', textColor: '#01579B' },
  { name: 'Verde Pastel', value: '#C8E6C9', textColor: '#1B5E20' },
  { name: 'Roxo Pastel', value: '#E1BEE7', textColor: '#4A148C' },
  { name: 'Laranja Pastel', value: '#FFE0B2', textColor: '#E65100' },
  // Neons
  { name: 'Amarelo Neon', value: '#EEFF41', textColor: '#33691E' },
  { name: 'Rosa Neon', value: '#FF4081', textColor: '#FFFFFF' },
  { name: 'Cyan Neon', value: '#00E5FF', textColor: '#006064' }
];

// Cores para os Marcadores (Tags)
const TAG_COLORS = [
  '#FF8A80', // Vermelho suave
  '#FFD180', // Laranja suave
  '#FFFF8D', // Amarelo suave
  '#A7FFEB', // Turquesa suave
  '#80D8FF', // Azul suave
  '#B9F6CA', // Verde suave
  '#CFD8DC', // Cinza azulado
  '#EA80FC'  // Roxo suave
];

// Marcadores Padrão do Sistema
const DEFAULT_TAGS = [
  { id: 'tag-urgent', name: 'Urgente', color: '#FF8A80' },
  { id: 'tag-important', name: 'Importante', color: '#FFD180' },
  { id: 'tag-routine', name: 'Rotina', color: '#B9F6CA' }
];

// ==========================================================================
// ESTADO DA APLICAÇÃO
// ==========================================================================

let notes = JSON.parse(localStorage.getItem('postit_notes')) || [];
let tags = JSON.parse(localStorage.getItem('postit_tags')) || DEFAULT_TAGS;
let activeFilterTag = 'all';
let searchQuery = '';

let currentNoteColor = POSTIT_COLORS[0].value; // Padrão: Amarelo Pastel
let currentNoteTagId = 'none';
let currentNewTagColor = TAG_COLORS[0]; // Padrão: Primeiro do array de cores de tag

// PWA Install Prompt Event
let deferredPrompt;

// ==========================================================================
// ELEMENTOS DO DOM
// ==========================================================================

// Header & Filtros
const themeToggleBtn = document.getElementById('themeToggleBtn');
const themeIcon = document.getElementById('themeIcon');
const searchInput = document.getElementById('searchInput');
const clearSearchBtn = document.getElementById('clearSearchBtn');
const manageTagsBtn = document.getElementById('manageTagsBtn');
const filtersContainer = document.getElementById('filtersContainer');
const notesGrid = document.getElementById('notesGrid');
const emptyState = document.getElementById('emptyState');

// FAB & Banner PWA
const fabAddNote = document.getElementById('fabAddNote');
const installBanner = document.getElementById('installBanner');
const installConfirmBtn = document.getElementById('installConfirmBtn');
const installCancelBtn = document.getElementById('installCancelBtn');

// Diálogo de Notas
const noteDialog = document.getElementById('noteDialog');
const noteForm = document.getElementById('noteForm');
const dialogTitle = document.getElementById('dialogTitle');
const dialogCloseBtn = document.getElementById('dialogCloseBtn');
const noteIdInput = document.getElementById('noteIdInput');
const noteTitleInput = document.getElementById('noteTitleInput');
const noteContentInput = document.getElementById('noteContentInput');
const colorOptionsContainer = document.getElementById('colorOptionsContainer');
const tagOptionsContainer = document.getElementById('tagOptionsContainer');
const noteDueDateInput = document.getElementById('noteDueDateInput');
const clearDateBtn = document.getElementById('clearDateBtn');
const reminderSelectorWrapper = document.getElementById('reminderSelectorWrapper');
const noteReminderInput = document.getElementById('noteReminderInput');
const noteDeleteBtn = document.getElementById('noteDeleteBtn');
const noteCancelBtn = document.getElementById('noteCancelBtn');

// Diálogo de Tags
const tagsDialog = document.getElementById('tagsDialog');
const tagsDialogCloseBtn = document.getElementById('tagsDialogCloseBtn');
const addTagForm = document.getElementById('addTagForm');
const newTagNameInput = document.getElementById('newTagNameInput');
const tagColorOptionsContainer = document.getElementById('tagColorOptionsContainer');
const tagsListContainer = document.getElementById('tagsListContainer');
const tagsCloseBtn = document.getElementById('tagsCloseBtn');

// Diálogo de Lembrete Ativo
const reminderDialog = document.getElementById('reminderDialog');
const reminderNotePreview = document.getElementById('reminderNotePreview');
const reminderDismissBtn = document.getElementById('reminderDismissBtn');
const reminderOpenBtn = document.getElementById('reminderOpenBtn');
const reminderSound = document.getElementById('reminderSound');

// Toast / Snackbar
const snackbar = document.getElementById('snackbar');
const snackbarMessage = document.getElementById('snackbarMessage');

// ==========================================================================
// INICIALIZAÇÃO DA APLICAÇÃO
// ==========================================================================

document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  renderFilters();
  renderNotes();
  setupEventListeners();
  initPWA();
  
  // Inicia o monitor de lembretes (roda a cada 15 segundos)
  setInterval(checkReminders, 15000);
  // Executa uma verificação imediata para prazos vencidos enquanto o app estava fechado
  checkPastDueRemindersOnStartup();
});

// ==========================================================================
// REGISTRO E CONTROLE DO PWA
// ==========================================================================

function initPWA() {
  // Registra o Service Worker
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js')
        .then(reg => console.log('[PWA] Service Worker registrado com sucesso:', reg.scope))
        .catch(err => console.error('[PWA] Falha ao registrar Service Worker:', err));
    });
  }

  // Captura o evento de instalação
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    // Exibe o banner de instalação se o usuário ainda não instalou
    installBanner.style.display = 'flex';
  });

  // Ação de confirmar instalação
  installConfirmBtn.addEventListener('click', async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      console.log(`[PWA] Escolha do usuário para instalação: ${outcome}`);
      deferredPrompt = null;
      installBanner.style.display = 'none';
    }
  });

  // Ação de recusar instalação
  installCancelBtn.addEventListener('click', () => {
    installBanner.style.display = 'none';
  });
}

// ==========================================================================
// TEMA CLARO / ESCURO
// ==========================================================================

function initTheme() {
  const savedTheme = localStorage.getItem('postit_theme');
  const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  
  if (savedTheme === 'dark' || (!savedTheme && systemPrefersDark)) {
    document.documentElement.setAttribute('data-theme', 'dark');
    themeIcon.textContent = 'light_mode';
  } else {
    document.documentElement.setAttribute('data-theme', 'light');
    themeIcon.textContent = 'dark_mode';
  }
}

function toggleTheme() {
  const currentTheme = document.documentElement.getAttribute('data-theme');
  if (currentTheme === 'dark') {
    document.documentElement.setAttribute('data-theme', 'light');
    themeIcon.textContent = 'dark_mode';
    localStorage.setItem('postit_theme', 'light');
    showSnackbar('Modo Claro ativado');
  } else {
    document.documentElement.setAttribute('data-theme', 'dark');
    themeIcon.textContent = 'light_mode';
    localStorage.setItem('postit_theme', 'dark');
    showSnackbar('Modo Escuro ativado');
  }
}

// ==========================================================================
// RENDERIZAÇÃO DE COMPONENTES
// ==========================================================================

// Gera a rotação sutil para o post-it (baseado no ID para manter fixo por nota)
function getRotationAngle(id) {
  // Gera uma hash simples a partir do ID da nota
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  // Retorna um ângulo entre -1.5deg e 1.5deg
  const maxAngle = 1.5;
  const angle = (Math.abs(hash) % (maxAngle * 20)) / 10 - maxAngle;
  return `${angle}deg`;
}

// Formatação legível de data e hora do prazo
function formatDueDate(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  const now = new Date();
  
  const options = { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' };
  const formatted = date.toLocaleDateString('pt-BR', options);
  
  const isOverdue = date < now;
  return {
    text: formatted,
    isOverdue: isOverdue
  };
}

// Renderiza o grid de notas
function renderNotes() {
  notesGrid.innerHTML = '';
  
  // Filtragem de notas
  let filteredNotes = notes.filter(note => {
    // Filtro por tag
    const matchesTag = activeFilterTag === 'all' || 
                       (activeFilterTag === 'none' && (!note.tagId || note.tagId === 'none')) || 
                       (note.tagId === activeFilterTag);
    
    // Filtro por pesquisa (título, conteúdo ou nome da tag)
    const noteTag = tags.find(t => t.id === note.tagId);
    const tagName = noteTag ? noteTag.name.toLowerCase() : '';
    const matchesSearch = !searchQuery || 
                          note.title.toLowerCase().includes(searchQuery) ||
                          note.content.toLowerCase().includes(searchQuery) ||
                          tagName.includes(searchQuery);
                          
    return matchesTag && matchesSearch;
  });

  if (filteredNotes.length === 0) {
    emptyState.style.display = 'flex';
    // Se houver filtros/pesquisa ativos, altera o texto do estado vazio
    if (activeFilterTag !== 'all' || searchQuery) {
      emptyState.querySelector('p').textContent = 'Nenhuma nota corresponde aos filtros.';
      emptyState.querySelector('.empty-state-message').textContent = 'Limpe a pesquisa ou mude o filtro de marcadores.';
    } else {
      emptyState.querySelector('p').textContent = 'Nenhuma nota por aqui.';
      emptyState.querySelector('.empty-state-message').textContent = 'Toque no botão abaixo para criar sua primeira nota post-it!';
    }
    notesGrid.appendChild(emptyState);
    return;
  }

  emptyState.style.display = 'none';

  // Renderiza cada nota
  filteredNotes.forEach(note => {
    const card = document.createElement('article');
    card.className = 'note-card';
    card.style.backgroundColor = note.color;
    
    // Encontra informações de texto e contraste para a cor do post-it
    const colorInfo = POSTIT_COLORS.find(c => c.value === note.color) || POSTIT_COLORS[0];
    card.style.setProperty('--color-accent-text', colorInfo.textColor);
    
    // Aplica rotação sutil e persistente baseada no ID da nota
    card.style.setProperty('--rotation', getRotationAngle(note.id));
    
    // Encontra informações da tag
    const noteTag = tags.find(t => t.id === note.tagId);
    
    // Constrói HTML do card
    let footerHTML = '';
    const dateFormatted = formatDueDate(note.dueDate);
    
    if (noteTag || dateFormatted) {
      footerHTML = `<div class="note-card__footer">`;
      
      // Renderiza as tags
      if (noteTag) {
        footerHTML += `
          <div class="note-card__tags">
            <span class="note-card__tag-chip" style="background-color: rgba(0,0,0,0.06); border-color: rgba(0,0,0,0.12);">
              <span class="chip__color-dot" style="background-color: ${noteTag.color}"></span>
              ${noteTag.name}
            </span>
          </div>`;
      }
      
      // Renderiza o prazo
      if (dateFormatted) {
        const overdueClass = dateFormatted.isOverdue ? 'overdue' : '';
        const iconName = dateFormatted.isOverdue ? 'error' : 'calendar_today';
        footerHTML += `
          <div class="note-card__date ${overdueClass}">
            <span class="material-symbols-outlined note-card__date-icon">${iconName}</span>
            <span>Prazo: ${dateFormatted.text}</span>
            ${note.reminderMinutes !== 'none' ? '<span class="material-symbols-outlined note-card__date-icon" style="font-size: 12px; margin-left: 2px;">notifications</span>' : ''}
          </div>`;
      }
      
      footerHTML += `</div>`;
    }

    card.innerHTML = `
      <h3 class="note-card__title">${escapeHTML(note.title)}</h3>
      <p class="note-card__content">${escapeHTML(note.content)}</p>
      ${footerHTML}
    `;

    // Clique duplo ou toque no card abre para edição
    card.addEventListener('click', () => openNoteDialog(note));
    
    notesGrid.appendChild(card);
  });
}

// Renderiza os chips de filtros de tag no topo
function renderFilters() {
  filtersContainer.innerHTML = '';

  // Filtro "Todas"
  const allChip = document.createElement('button');
  allChip.className = `chip ${activeFilterTag === 'all' ? 'chip--active' : ''}`;
  allChip.innerHTML = `<span class="material-symbols-outlined chip__icon">apps</span> Todas`;
  allChip.addEventListener('click', () => {
    activeFilterTag = 'all';
    updateActiveFilterUI();
  });
  filtersContainer.appendChild(allChip);

  // Filtro "Sem Marcador"
  const noneChip = document.createElement('button');
  noneChip.className = `chip ${activeFilterTag === 'none' ? 'chip--active' : ''}`;
  noneChip.innerHTML = `<span class="material-symbols-outlined chip__icon">label_off</span> Sem Marcador`;
  noneChip.addEventListener('click', () => {
    activeFilterTag = 'none';
    updateActiveFilterUI();
  });
  filtersContainer.appendChild(noneChip);

  // Filtros de marcadores existentes
  tags.forEach(tag => {
    const chip = document.createElement('button');
    chip.className = `chip ${activeFilterTag === tag.id ? 'chip--active' : ''}`;
    chip.innerHTML = `
      <span class="chip__color-dot" style="background-color: ${tag.color}"></span>
      ${tag.name}
    `;
    chip.addEventListener('click', () => {
      activeFilterTag = tag.id;
      updateActiveFilterUI();
    });
    filtersContainer.appendChild(chip);
  });
}

// Atualiza rapidamente o estado visual dos filtros ativos
function updateActiveFilterUI() {
  const chips = filtersContainer.querySelectorAll('.chip');
  let index = 0;
  
  // "Todas"
  chips[index++].className = `chip ${activeFilterTag === 'all' ? 'chip--active' : ''}`;
  // "Sem Marcador"
  chips[index++].className = `chip ${activeFilterTag === 'none' ? 'chip--active' : ''}`;
  
  // Tags dinâmicas
  tags.forEach(tag => {
    if (chips[index]) {
      chips[index].className = `chip ${activeFilterTag === tag.id ? 'chip--active' : ''}`;
      index++;
    }
  });

  renderNotes();
}

// ==========================================================================
// SISTEMA DE CONTROLE DE DIÁLOGO DE NOTAS
// ==========================================================================

function openNoteDialog(note = null) {
  // Carrega opções de cores e marcadores dinamicamente
  renderColorOptions();
  renderTagOptions();

  if (note) {
    // Modo Edição
    dialogTitle.textContent = 'Editar Nota';
    noteIdInput.value = note.id;
    noteTitleInput.value = note.title;
    noteContentInput.value = note.content;
    
    currentNoteColor = note.color;
    selectColorInUI(note.color);
    
    currentNoteTagId = note.tagId || 'none';
    selectTagInUI(currentNoteTagId);
    
    noteDueDateInput.value = note.dueDate || '';
    noteReminderInput.value = note.reminderMinutes || 'none';
    
    noteDeleteBtn.style.display = 'inline-flex';
    toggleDateClearBtn();
    toggleReminderSelector();
  } else {
    // Modo Criação
    dialogTitle.textContent = 'Nova Nota';
    noteForm.reset();
    noteIdInput.value = '';
    
    // Padrão: Primeira cor (amarelo) e nenhuma tag
    currentNoteColor = POSTIT_COLORS[0].value;
    selectColorInUI(currentNoteColor);
    
    currentNoteTagId = 'none';
    selectTagInUI(currentNoteTagId);
    
    noteDeleteBtn.style.display = 'none';
    toggleDateClearBtn();
    toggleReminderSelector();
  }
  
  noteDialog.style.display = 'flex';
  noteTitleInput.focus();
}

function closeNoteDialog() {
  noteDialog.style.display = 'none';
  noteForm.reset();
}

// Renderiza seletor de cores do Post-it
function renderColorOptions() {
  colorOptionsContainer.innerHTML = '';
  POSTIT_COLORS.forEach(color => {
    const option = document.createElement('div');
    option.className = `color-option ${currentNoteColor === color.value ? 'color-option--selected' : ''}`;
    option.style.backgroundColor = color.value;
    option.title = color.name;
    option.setAttribute('aria-label', color.name);
    option.addEventListener('click', () => {
      currentNoteColor = color.value;
      
      // Remove a classe selecionada dos outros
      colorOptionsContainer.querySelectorAll('.color-option').forEach(el => {
        el.classList.remove('color-option--selected');
      });
      option.classList.add('color-option--selected');
    });
    colorOptionsContainer.appendChild(option);
  });
}

function selectColorInUI(colorValue) {
  const options = colorOptionsContainer.querySelectorAll('.color-option');
  options.forEach(opt => {
    // Compara cores em formato hexadecimal/case insensível
    const optColor = rgbToHex(opt.style.backgroundColor).toUpperCase();
    const targetColor = colorValue.toUpperCase();
    if (optColor === targetColor) {
      opt.classList.add('color-option--selected');
    } else {
      opt.classList.remove('color-option--selected');
    }
  });
}

// Renderiza seletor de Marcador (Tags)
function renderTagOptions() {
  tagOptionsContainer.innerHTML = '';
  
  // Opção "Sem Marcador"
  const noneOpt = document.createElement('div');
  noneOpt.className = `tag-option-chip ${currentNoteTagId === 'none' ? 'tag-option-chip--selected' : ''}`;
  noneOpt.innerHTML = `
    <span class="tag-option-chip__color" style="background-color: var(--md-sys-color-outline-variant)"></span>
    Nenhum
  `;
  noneOpt.addEventListener('click', () => {
    currentNoteTagId = 'none';
    tagOptionsContainer.querySelectorAll('.tag-option-chip').forEach(el => {
      el.classList.remove('tag-option-chip--selected');
    });
    noneOpt.classList.add('tag-option-chip--selected');
  });
  tagOptionsContainer.appendChild(noneOpt);

  // Lista de tags existentes
  tags.forEach(tag => {
    const opt = document.createElement('div');
    opt.className = `tag-option-chip ${currentNoteTagId === tag.id ? 'tag-option-chip--selected' : ''}`;
    opt.innerHTML = `
      <span class="tag-option-chip__color" style="background-color: ${tag.color}"></span>
      ${tag.name}
    `;
    opt.addEventListener('click', () => {
      currentNoteTagId = tag.id;
      tagOptionsContainer.querySelectorAll('.tag-option-chip').forEach(el => {
        el.classList.remove('tag-option-chip--selected');
      });
      opt.classList.add('tag-option-chip--selected');
    });
    tagOptionsContainer.appendChild(opt);
  });
}

function selectTagInUI(tagId) {
  // Renderizar tag selector recria os elementos e já cuida do estado correto,
  // mas caso queiramos atualizar visualmente sem re-renderizar:
  const options = tagOptionsContainer.querySelectorAll('.tag-option-chip');
  // Primeiro chip é "Sem Marcador"
  if (tagId === 'none' || !tagId) {
    options[0].classList.add('tag-option-chip--selected');
  }
}

// Exibe/oculta botão de limpar data de prazo
function toggleDateClearBtn() {
  if (noteDueDateInput.value) {
    clearDateBtn.style.display = 'inline-flex';
  } else {
    clearDateBtn.style.display = 'none';
  }
}

// Exibe/oculta o seletor de lembrete com antecedência
function toggleReminderSelector() {
  if (noteDueDateInput.value) {
    reminderSelectorWrapper.style.display = 'block';
  } else {
    reminderSelectorWrapper.style.display = 'none';
    noteReminderInput.value = 'none'; // Reseta
  }
}

// Limpa data e lembrete
function clearDueDate() {
  noteDueDateInput.value = '';
  toggleDateClearBtn();
  toggleReminderSelector();
}

// ==========================================================================
// SALVAR E EXCLUIR NOTAS (LÓGICA DO FORMULÁRIO)
// ==========================================================================

async function saveNote(e) {
  e.preventDefault();
  
  const id = noteIdInput.value;
  const title = noteTitleInput.value.trim();
  const content = noteContentInput.value.trim();
  const color = currentNoteColor;
  const tagId = currentNoteTagId;
  const dueDate = noteDueDateInput.value;
  const reminderMinutes = noteReminderInput.value;

  // Solicita permissão para notificações se o usuário definiu lembretes
  if (dueDate && reminderMinutes !== 'none' && Notification.permission === 'default') {
    await Notification.requestPermission();
  }

  if (id) {
    // Modo Edição: atualiza nota existente
    const index = notes.findIndex(n => n.id === id);
    if (index !== -1) {
      // Se a data de vencimento ou antecedência mudou, reseta o estado de lembrete disparado
      const oldNote = notes[index];
      const reminderChanged = oldNote.dueDate !== dueDate || oldNote.reminderMinutes !== reminderMinutes;
      
      notes[index] = {
        ...oldNote,
        title,
        content,
        color,
        tagId,
        dueDate,
        reminderMinutes,
        reminderTriggered: reminderChanged ? false : oldNote.reminderTriggered
      };
      showSnackbar('Nota atualizada com sucesso!');
    }
  } else {
    // Modo Criação: cria nova nota
    const newNote = {
      id: 'note-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9),
      title,
      content,
      color,
      tagId,
      dueDate,
      reminderMinutes,
      reminderTriggered: false
    };
    notes.push(newNote);
    showSnackbar('Nota criada com sucesso!');
  }

  localStorage.setItem('postit_notes', JSON.stringify(notes));
  closeNoteDialog();
  renderNotes();
}

function deleteNote() {
  const id = noteIdInput.value;
  if (!id) return;
  
  if (confirm('Tem certeza de que deseja excluir este Post-it?')) {
    notes = notes.filter(n => n.id !== id);
    localStorage.setItem('postit_notes', JSON.stringify(notes));
    closeNoteDialog();
    renderNotes();
    showSnackbar('Post-it excluído.');
  }
}

// ==========================================================================
// GERENCIADOR DE TAGS (MARCADORES CUSTOMIZÁVEIS)
// ==========================================================================

function openTagsDialog() {
  renderTagColorOptions();
  renderTagsList();
  tagsDialog.style.display = 'flex';
}

function closeTagsDialog() {
  tagsDialog.style.display = 'none';
  addTagForm.reset();
}

// Renderiza seletor de cores da nova tag
function renderTagColorOptions() {
  tagColorOptionsContainer.innerHTML = '';
  TAG_COLORS.forEach(color => {
    const option = document.createElement('div');
    option.className = `color-option ${currentNewTagColor === color ? 'color-option--selected' : ''}`;
    option.style.backgroundColor = color;
    option.addEventListener('click', () => {
      currentNewTagColor = color;
      tagColorOptionsContainer.querySelectorAll('.color-option').forEach(el => {
        el.classList.remove('color-option--selected');
      });
      option.classList.add('color-option--selected');
    });
    tagColorOptionsContainer.appendChild(option);
  });
}

// Cria uma nova tag
function addNewTag(e) {
  e.preventDefault();
  
  const name = newTagNameInput.value.trim();
  const color = currentNewTagColor;
  
  if (!name) return;

  // Verifica duplicados
  const exists = tags.some(t => t.name.toLowerCase() === name.toLowerCase());
  if (exists) {
    alert('Já existe um marcador com esse nome.');
    return;
  }

  const newTag = {
    id: 'tag-' + Date.now(),
    name,
    color
  };

  tags.push(newTag);
  localStorage.setItem('postit_tags', JSON.stringify(tags));
  
  newTagNameInput.value = '';
  newTagNameInput.focus();
  
  // Reseta cor selecionada para o primeiro item
  currentNewTagColor = TAG_COLORS[0];
  renderTagColorOptions();
  
  renderTagsList();
  renderFilters(); // Atualiza os filtros do app
  showSnackbar(`Marcador "${name}" criado!`);
}

// Renderiza lista de tags no gerenciador
function renderTagsList() {
  tagsListContainer.innerHTML = '';
  
  tags.forEach(tag => {
    const row = document.createElement('div');
    row.className = 'tag-row';
    
    // Verifica se é tag de sistema (para não permitir deletar, mantendo integridade)
    const isSystemTag = DEFAULT_TAGS.some(t => t.id === tag.id);
    
    let deleteBtnHTML = '';
    if (!isSystemTag) {
      deleteBtnHTML = `
        <button type="button" class="icon-button button--error" aria-label="Excluir tag" onclick="deleteTag('${tag.id}')">
          <span class="material-symbols-outlined">delete</span>
        </button>
      `;
    } else {
      deleteBtnHTML = `<span style="font-size: 11px; font-weight: 500; color: var(--md-sys-color-outline); padding-right: 8px;">Padrão</span>`;
    }

    row.innerHTML = `
      <div class="tag-row__info">
        <span class="tag-row__color" style="background-color: ${tag.color}"></span>
        <span class="tag-row__name">${escapeHTML(tag.name)}</span>
      </div>
      ${deleteBtnHTML}
    `;
    
    tagsListContainer.appendChild(row);
  });
}

// Deleta uma tag
window.deleteTag = function(tagId) {
  const tagToDelete = tags.find(t => t.id === tagId);
  if (!tagToDelete) return;
  
  if (confirm(`Tem certeza de que deseja excluir o marcador "${tagToDelete.name}"? As notas associadas a ele não serão apagadas, mas perderão a etiqueta.`)) {
    // Remove do array de tags
    tags = tags.filter(t => t.id !== tagId);
    localStorage.setItem('postit_tags', JSON.stringify(tags));
    
    // Atualiza notas que usavam essa tag para ficarem sem tag
    notes = notes.map(n => {
      if (n.tagId === tagId) {
        return { ...n, tagId: 'none' };
      }
      return n;
    });
    localStorage.setItem('postit_notes', JSON.stringify(notes));
    
    // Se o filtro ativo era a tag deletada, volta para 'Todas'
    if (activeFilterTag === tagId) {
      activeFilterTag = 'all';
    }

    renderTagsList();
    renderFilters();
    renderNotes();
    showSnackbar(`Marcador "${tagToDelete.name}" removido.`);
  }
};

// ==========================================================================
// SISTEMA DE NOTIFICAÇÕES E LEMBRETES DE PRAZO
// ==========================================================================

// Monitora prazos e dispara lembretes ativos
function checkReminders() {
  const now = new Date().getTime();
  let stateChanged = false;
  
  notes.forEach(note => {
    // Se a nota tiver prazo, lembrete ativo e ainda não disparou
    if (note.dueDate && note.reminderMinutes !== 'none' && !note.reminderTriggered) {
      const dueTime = new Date(note.dueDate).getTime();
      const reminderMin = parseInt(note.reminderMinutes);
      const triggerTime = dueTime - (reminderMin * 60 * 1000);
      
      // Chegou a hora do lembrete!
      if (now >= triggerTime) {
        triggerReminder(note);
        note.reminderTriggered = true;
        stateChanged = true;
      }
    }
  });

  if (stateChanged) {
    localStorage.setItem('postit_notes', JSON.stringify(notes));
    renderNotes();
  }
}

// Dispara o alerta do lembrete (in-app + sistema nativo)
function triggerReminder(note) {
  // 1. Toca som de lembrete
  try {
    reminderSound.currentTime = 0;
    reminderSound.play();
  } catch (err) {
    console.log('Reprodução de áudio necessita de interação prévia do usuário:', err);
  }

  // 2. Dispara Notificação Nativa do Sistema (PWA em segundo plano)
  if (Notification.permission === 'granted') {
    const tagInfo = tags.find(t => t.id === note.tagId);
    const label = tagInfo ? ` [${tagInfo.name}]` : '';
    
    let timeText = 'Chegou o momento do seu prazo!';
    if (parseInt(note.reminderMinutes) > 0) {
      const min = parseInt(note.reminderMinutes);
      timeText = `Faltam ${min === 1440 ? '1 dia' : min + ' minutos'} para o seu prazo.`;
    }

    const notification = new Notification(`Post-it Notes: ${note.title}${label}`, {
      body: `${timeText}\n${note.content.substring(0, 100)}...`,
      icon: 'assets/icon-192.png',
      vibrate: [200, 100, 200],
      tag: note.id
    });

    notification.onclick = () => {
      window.focus();
      openNoteDialog(note);
      notification.close();
    };
  }

  // 3. Alerta visual In-App (para quando o usuário estiver usando o app)
  showInAppReminderDialog(note);
}

// Exibe modal de lembrete dentro do app
function showInAppReminderDialog(note) {
  reminderNotePreview.style.backgroundColor = note.color;
  const colorInfo = POSTIT_COLORS.find(c => c.value === note.color) || POSTIT_COLORS[0];
  reminderNotePreview.style.setProperty('--color-accent-text', colorInfo.textColor);
  
  const tagInfo = tags.find(t => t.id === note.tagId);
  const tagHTML = tagInfo ? `
    <div class="note-card__footer">
      <div class="note-card__tags">
        <span class="note-card__tag-chip" style="background-color: rgba(0,0,0,0.06);">
          <span class="chip__color-dot" style="background-color: ${tagInfo.color}"></span>
          ${tagInfo.name}
        </span>
      </div>
    </div>
  ` : '';

  reminderNotePreview.innerHTML = `
    <h4>${escapeHTML(note.title)}</h4>
    <p>${escapeHTML(note.content)}</p>
    ${tagHTML}
  `;

  // Salva referência da nota para ação do botão "Abrir Nota"
  reminderOpenBtn.onclick = () => {
    reminderDialog.style.display = 'none';
    openNoteDialog(note);
  };

  reminderDismissBtn.onclick = () => {
    reminderDialog.style.display = 'none';
  };

  reminderDialog.style.display = 'flex';
}

// Verifica lembretes perdidos enquanto o app estava offline/fechado
function checkPastDueRemindersOnStartup() {
  const now = new Date().getTime();
  let pastDueNotesCount = 0;
  let stateChanged = false;

  notes.forEach(note => {
    if (note.dueDate && note.reminderMinutes !== 'none' && !note.reminderTriggered) {
      const dueTime = new Date(note.dueDate).getTime();
      const reminderMin = parseInt(note.reminderMinutes);
      const triggerTime = dueTime - (reminderMin * 60 * 1000);
      
      // Se o momento de disparo já passou
      if (now > triggerTime) {
        note.reminderTriggered = true;
        stateChanged = true;
        
        // Se a data de vencimento total também já passou, avisa
        if (now > dueTime) {
          pastDueNotesCount++;
        }
      }
    }
  });

  if (stateChanged) {
    localStorage.setItem('postit_notes', JSON.stringify(notes));
    renderNotes();
    
    if (pastDueNotesCount > 0) {
      setTimeout(() => {
        showSnackbar(`Você tem ${pastDueNotesCount} prazo(s) vencido(s) pendente(s).`);
      }, 1500);
    }
  }
}

// ==========================================================================
// GERENCIAMENTO DE EVENTOS (LISTENERS)
// ==========================================================================

function setupEventListeners() {
  // Tema & Busca
  themeToggleBtn.addEventListener('click', toggleTheme);
  
  searchInput.addEventListener('input', (e) => {
    searchQuery = e.target.value.toLowerCase().trim();
    if (searchQuery) {
      clearSearchBtn.style.display = 'inline-flex';
    } else {
      clearSearchBtn.style.display = 'none';
    }
    renderNotes();
  });
  
  clearSearchBtn.addEventListener('click', () => {
    searchInput.value = '';
    searchQuery = '';
    clearSearchBtn.style.display = 'none';
    renderNotes();
    searchInput.focus();
  });

  // Modal Notas
  fabAddNote.addEventListener('click', () => openNoteDialog(null));
  dialogCloseBtn.addEventListener('click', closeNoteDialog);
  noteCancelBtn.addEventListener('click', closeNoteDialog);
  noteForm.addEventListener('submit', saveNote);
  noteDeleteBtn.addEventListener('click', deleteNote);
  
  noteDueDateInput.addEventListener('change', () => {
    toggleDateClearBtn();
    toggleReminderSelector();
  });
  clearDateBtn.addEventListener('click', clearDueDate);

  // Modal Tags
  manageTagsBtn.addEventListener('click', openTagsDialog);
  tagsDialogCloseBtn.addEventListener('click', closeTagsDialog);
  tagsCloseBtn.addEventListener('click', closeTagsDialog);
  addTagForm.addEventListener('submit', addNewTag);

  // Fecha diálogos clicando fora
  window.addEventListener('click', (e) => {
    if (e.target === noteDialog) closeNoteDialog();
    if (e.target === tagsDialog) closeTagsDialog();
    if (e.target === reminderDialog) reminderDialog.style.display = 'none';
  });
}

// ==========================================================================
// FUNÇÕES AUXILIARES / UTILS
// ==========================================================================

// Exibe Snackbar Toast rápido
function showSnackbar(message) {
  snackbarMessage.textContent = message;
  snackbar.style.display = 'flex';
  
  // Reseta animação tirando e recolocando elemento se já estiver visível
  snackbar.style.animation = 'none';
  setTimeout(() => {
    snackbar.style.animation = '';
  }, 10);

  // Oculta após 3 segundos
  if (window.snackbarTimeout) clearTimeout(window.snackbarTimeout);
  window.snackbarTimeout = setTimeout(() => {
    snackbar.style.display = 'none';
  }, 3000);
}

// Transforma cores rgb do browser em hexadecimal para comparações corretas
function rgbToHex(rgb) {
  if (rgb.startsWith('#')) return rgb;
  const match = rgb.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/);
  if (!match) return rgb;
  function hex(x) {
    return ("0" + parseInt(x).toString(16)).slice(-2);
  }
  return "#" + hex(match[1]) + hex(match[2]) + hex(match[3]);
}

// Higienização de strings para evitar XSS básico em conteúdo dinâmico
function escapeHTML(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
