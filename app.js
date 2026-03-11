// ─────────────────────────────────────────────
//  DEFAULT CONTENT
// ─────────────────────────────────────────────
const DEFAULT_CONTENT = `# Welcome to Folio

Folio is a clean, distraction-free **Markdown notes** app that lives in your browser.

## Features

- Three-panel layout: file list, editor, and live preview
- Persistent notes stored in **localStorage**
- Real-time Markdown rendering
- Word, line, and character count
- Drag-to-resize panels

## Markdown Cheatsheet

### Text Formatting

You can write **bold**, *italic*, or \`inline code\` with ease.

### Code Blocks

\`\`\`javascript
const greet = (name) => \`Hello, \${name}!\`;
console.log(greet('world'));
\`\`\`

### Blockquotes

> "A note-taking app should get out of your way."

### Tables

| Feature     | Status |
|-------------|--------|
| Live preview| ✅     |
| File manager| ✅     |
| Export      | ✅     |

---

Start writing your own notes by clicking **+ New File**.
`;

// ─────────────────────────────────────────────
//  STATE
// ─────────────────────────────────────────────
let files         = JSON.parse(localStorage.getItem('folio-files') || '[]');
let activeId      = null;
let openTabs      = JSON.parse(localStorage.getItem('folio-tabs')  || '[]');
let renameTargetId = null;
let scrollSync    = false;
let saveTimer     = null;

if (files.length === 0) {
  const id = uid();
  files    = [{ id, name: 'welcome.md', content: DEFAULT_CONTENT, updated: Date.now() }];
  openTabs = [id];
  activeId = id;
  save();
} else {
  activeId = openTabs[0] || (files[0] && files[0].id) || null;
}

// ─────────────────────────────────────────────
//  UTILS
// ─────────────────────────────────────────────
function uid() {
  return Math.random().toString(36).slice(2, 10);
}

function save() {
  localStorage.setItem('folio-files', JSON.stringify(files));
  localStorage.setItem('folio-tabs',  JSON.stringify(openTabs));
}

function getFile(id) {
  return files.find(f => f.id === id);
}

function timeAgo(ts) {
  const d = Date.now() - ts;
  if (d < 60000)    return 'just now';
  if (d < 3600000)  return Math.floor(d / 60000)    + 'm ago';
  if (d < 86400000) return Math.floor(d / 3600000)  + 'h ago';
  return                    Math.floor(d / 86400000) + 'd ago';
}

function esc(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// ─────────────────────────────────────────────
//  DOM REFERENCES
// ─────────────────────────────────────────────
const fileList    = document.getElementById('file-list');
const fileTabBar  = document.getElementById('file-tab-bar');
const editor      = document.getElementById('editor');
const previewBody = document.getElementById('preview-body');
const previewEmpty = document.getElementById('preview-empty');
const editorEmpty = document.getElementById('editor-empty');
const fileCount   = document.getElementById('file-count');
const wordCount   = document.getElementById('word-count');
const lineCount   = document.getElementById('line-count');
const charCount   = document.getElementById('char-count');
const saveStatus  = document.getElementById('save-status');
const savedDot    = document.getElementById('saved-dot');
const searchInput = document.getElementById('search-input');
const renameModal = document.getElementById('rename-modal');
const renameInput = document.getElementById('rename-input');
const sidebar     = document.getElementById('sidebar');
const editorPanel = document.getElementById('editor-panel');

// ─────────────────────────────────────────────
//  RENDER
// ─────────────────────────────────────────────
function renderAll() {
  renderSidebar();
  renderTabs();
  renderEditor();
  renderPreview();
}

function renderSidebar(filter = '') {
  const q     = filter.toLowerCase();
  const shown = files.filter(f =>
    f.name.toLowerCase().includes(q) || f.content.toLowerCase().includes(q)
  );

  fileList.innerHTML = '';

  shown.forEach(f => {
    const el = document.createElement('div');
    el.className  = 'file-item' + (f.id === activeId ? ' active' : '');
    el.dataset.id = f.id;
    el.innerHTML  = `
      <span class="file-icon">📝</span>
      <span class="file-meta">
        <span class="file-name">${esc(f.name)}</span>
        <span class="file-date">${timeAgo(f.updated)}</span>
      </span>
      <span class="item-actions">
        <button class="item-btn"        data-action="rename" title="Rename">✎</button>
        <button class="item-btn danger" data-action="delete" title="Delete">✕</button>
      </span>`;

    el.addEventListener('click', (e) => {
      if (e.target.closest('.item-actions')) return;
      openFile(f.id);
    });
    el.querySelector('[data-action="rename"]').addEventListener('click', () => openRename(f.id));
    el.querySelector('[data-action="delete"]').addEventListener('click', () => deleteFile(f.id));

    fileList.appendChild(el);
  });

  fileCount.textContent = files.length + ' note' + (files.length !== 1 ? 's' : '');
}

function renderTabs() {
  fileTabBar.innerHTML = '';

  openTabs.forEach(id => {
    const f = getFile(id);
    if (!f) return;

    const tab      = document.createElement('div');
    tab.className  = 'file-tab' + (id === activeId ? ' active' : '');
    tab.dataset.id = id;
    tab.innerHTML  = `<span>${esc(f.name)}</span><span class="tab-close" data-id="${id}">✕</span>`;

    tab.addEventListener('click', (e) => {
      if (e.target.classList.contains('tab-close')) {
        closeTab(e.target.dataset.id);
      } else {
        openFile(id);
      }
    });

    fileTabBar.appendChild(tab);
  });
}

function renderEditor() {
  const f = getFile(activeId);

  if (!f) {
    editor.style.display      = 'none';
    editorEmpty.style.display = 'flex';
    updateStats('');
    return;
  }

  editor.style.display      = '';
  editorEmpty.style.display = 'none';
  if (editor.value !== f.content) editor.value = f.content;
  updateStats(f.content);
}

function renderPreview() {
  const f = getFile(activeId);

  if (!f || !f.content.trim()) {
    previewEmpty.style.display = '';
    previewBody.style.display  = 'none';
    previewBody.innerHTML      = '';
    return;
  }

  previewEmpty.style.display = 'none';
  previewBody.style.display  = '';
  previewBody.innerHTML      = marked.parse(f.content);
}

function updateStats(content) {
  const words = content.trim() ? content.trim().split(/\s+/).length : 0;
  const lines = content ? content.split('\n').length : 0;
  const chars = content.length;
  wordCount.textContent = words + ' word' + (words !== 1 ? 's' : '');
  lineCount.textContent = lines + ' line' + (lines !== 1 ? 's' : '');
  charCount.textContent = chars + ' char' + (chars !== 1 ? 's' : '');
}

// ─────────────────────────────────────────────
//  FILE OPERATIONS
// ─────────────────────────────────────────────
function newFile() {
  const id   = uid();
  const name = `note-${files.length + 1}.md`;
  files.unshift({ id, name, content: '', updated: Date.now() });
  if (!openTabs.includes(id)) openTabs.push(id);
  activeId = id;
  save();
  renderAll();
  editor.focus();
}

function openFile(id) {
  activeId = id;
  if (!openTabs.includes(id)) openTabs.push(id);
  save();
  renderAll();
  editor.focus();
}

function closeTab(id) {
  openTabs = openTabs.filter(t => t !== id);
  if (activeId === id) {
    activeId = openTabs[openTabs.length - 1] || (files[0] && files[0].id) || null;
  }
  save();
  renderAll();
}

function deleteFile(id) {
  if (!confirm(`Delete "${getFile(id)?.name}"? This cannot be undone.`)) return;
  files    = files.filter(f => f.id !== id);
  openTabs = openTabs.filter(t => t !== id);
  if (activeId === id) {
    activeId = openTabs[openTabs.length - 1] || (files[0] && files[0].id) || null;
    if (activeId && !openTabs.includes(activeId)) openTabs.push(activeId);
  }
  save();
  renderAll();
}

function openRename(id) {
  renameTargetId    = id;
  renameInput.value = getFile(id)?.name || '';
  renameModal.classList.add('open');
  setTimeout(() => { renameInput.focus(); renameInput.select(); }, 50);
}

function confirmRename() {
  const f = getFile(renameTargetId);
  if (!f) return;

  let name = renameInput.value.trim();
  if (!name) return;
  if (!name.endsWith('.md')) name += '.md';

  f.name    = name;
  f.updated = Date.now();
  save();
  renameModal.classList.remove('open');
  renderSidebar(searchInput.value);
  renderTabs();
}

// ─────────────────────────────────────────────
//  EDITOR EVENTS
// ─────────────────────────────────────────────
editor.addEventListener('input', () => {
  const f = getFile(activeId);
  if (!f) return;

  f.content = editor.value;
  f.updated = Date.now();
  updateStats(f.content);
  renderPreview();

  savedDot.classList.add('unsaved');
  saveStatus.textContent = 'Unsaved';

  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    save();
    renderSidebar(searchInput.value);
    savedDot.classList.remove('unsaved');
    saveStatus.textContent = 'Saved';
  }, 800);
});

editor.addEventListener('keydown', (e) => {
  // Tab → insert 2 spaces
  if (e.key === 'Tab') {
    e.preventDefault();
    const start = editor.selectionStart;
    const end   = editor.selectionEnd;
    editor.value = editor.value.slice(0, start) + '  ' + editor.value.slice(end);
    editor.selectionStart = editor.selectionEnd = start + 2;
    editor.dispatchEvent(new Event('input'));
  }
  // Cmd/Ctrl+S → save immediately
  if ((e.ctrlKey || e.metaKey) && e.key === 's') {
    e.preventDefault();
    save();
    savedDot.classList.remove('unsaved');
    saveStatus.textContent = 'Saved';
  }
});

// ─────────────────────────────────────────────
//  EDITOR TOOLBAR
// ─────────────────────────────────────────────
function wrap(before, after) {
  const s   = editor.selectionStart;
  const e   = editor.selectionEnd;
  const sel = editor.value.slice(s, e) || 'text';
  editor.value = editor.value.slice(0, s) + before + sel + after + editor.value.slice(e);
  editor.selectionStart = s + before.length;
  editor.selectionEnd   = s + before.length + sel.length;
  editor.focus();
  editor.dispatchEvent(new Event('input'));
}

function insertLine(prefix) {
  const s         = editor.selectionStart;
  const lineStart = editor.value.lastIndexOf('\n', s - 1) + 1;
  editor.value    = editor.value.slice(0, lineStart) + prefix + editor.value.slice(lineStart);
  editor.selectionStart = editor.selectionEnd = s + prefix.length;
  editor.focus();
  editor.dispatchEvent(new Event('input'));
}

document.getElementById('btn-bold').addEventListener('click',   () => wrap('**', '**'));
document.getElementById('btn-italic').addEventListener('click', () => wrap('*', '*'));
document.getElementById('btn-code').addEventListener('click',   () => wrap('`', '`'));
document.getElementById('btn-link').addEventListener('click',   () => wrap('[', '](url)'));
document.getElementById('btn-h1').addEventListener('click',     () => insertLine('# '));
document.getElementById('btn-ul').addEventListener('click',     () => insertLine('- '));

// ─────────────────────────────────────────────
//  NEW FILE & EXPORT
// ─────────────────────────────────────────────
document.getElementById('btn-new').addEventListener('click',    newFile);
document.getElementById('btn-new-sm').addEventListener('click', newFile);

document.getElementById('btn-export').addEventListener('click', () => {
  const f = getFile(activeId);
  if (!f) return alert('No file open.');
  const blob = new Blob([f.content], { type: 'text/markdown' });
  const a    = document.createElement('a');
  a.href     = URL.createObjectURL(blob);
  a.download = f.name;
  a.click();
});

// ─────────────────────────────────────────────
//  SEARCH
// ─────────────────────────────────────────────
searchInput.addEventListener('input', (e) => renderSidebar(e.target.value));

// ─────────────────────────────────────────────
//  SCROLL SYNC
// ─────────────────────────────────────────────
document.getElementById('btn-scroll-sync').addEventListener('click', function () {
  scrollSync = !scrollSync;
  this.classList.toggle('active', scrollSync);
  this.textContent = scrollSync ? '↕ Synced' : '↕ Sync Scroll';
});

let editorScrolling  = false;
let previewScrolling = false;

editor.addEventListener('scroll', () => {
  if (!scrollSync || previewScrolling) return;
  editorScrolling = true;
  const pct = editor.scrollTop / (editor.scrollHeight - editor.clientHeight);
  const pv  = document.getElementById('preview');
  pv.scrollTop = pct * (pv.scrollHeight - pv.clientHeight);
  setTimeout(() => editorScrolling = false, 50);
});

document.getElementById('preview').addEventListener('scroll', function () {
  if (!scrollSync || editorScrolling) return;
  previewScrolling = true;
  const pct = this.scrollTop / (this.scrollHeight - this.clientHeight);
  editor.scrollTop = pct * (editor.scrollHeight - editor.clientHeight);
  setTimeout(() => previewScrolling = false, 50);
});

// ─────────────────────────────────────────────
//  RENAME MODAL
// ─────────────────────────────────────────────
document.getElementById('rename-confirm').addEventListener('click', confirmRename);
document.getElementById('rename-cancel').addEventListener('click', () => renameModal.classList.remove('open'));
renameModal.addEventListener('click', (e) => { if (e.target === renameModal) renameModal.classList.remove('open'); });
renameInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter')  confirmRename();
  if (e.key === 'Escape') renameModal.classList.remove('open');
});

// ─────────────────────────────────────────────
//  RESIZABLE PANELS
// ─────────────────────────────────────────────
function makeResizable(handle, getWidth, setWidth) {
  let dragging = false;
  let startX, startVal;

  handle.addEventListener('mousedown', (e) => {
    dragging = true;
    startX   = e.clientX;
    startVal = getWidth();
    handle.classList.add('dragging');
    document.body.style.cursor     = 'col-resize';
    document.body.style.userSelect = 'none';
  });

  document.addEventListener('mousemove', (e) => {
    if (!dragging) return;
    setWidth(startVal + (e.clientX - startX));
  });

  document.addEventListener('mouseup', () => {
    if (!dragging) return;
    dragging = false;
    handle.classList.remove('dragging');
    document.body.style.cursor     = '';
    document.body.style.userSelect = '';
  });
}

makeResizable(
  document.getElementById('rh-1'),
  () => sidebar.offsetWidth,
  (val) => { sidebar.style.width = Math.max(160, Math.min(400, val)) + 'px'; }
);

makeResizable(
  document.getElementById('rh-2'),
  () => editorPanel.offsetWidth,
  (val) => { editorPanel.style.width = Math.max(200, Math.min(window.innerWidth * 0.65, val)) + 'px'; }
);

// ─────────────────────────────────────────────
//  INIT
// ─────────────────────────────────────────────
renderAll();
