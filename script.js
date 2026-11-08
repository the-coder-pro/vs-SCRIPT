const samples = {
  'index.html': `<!doctype html>\n<html lang="id">\n<head>\n  <meta charset="UTF-8">\n  <meta name="viewport" content="width=device-width, initial-scale=1">\n  <title>My App</title>\n  <link rel="stylesheet" href="style.css">\n</head>\n<body>\n  <main class="container">\n    <h1>Hello, vsSCRIPT!</h1>\n    <p>Mulai bangun sesuatu yang keren.</p>\n    <button id="helloButton">Click me</button>\n  </main>\n  <script src="script.js"><\/script>\n</body>\n</html>`,
  'style.css': `:root {\n  --background: #111318;\n  --foreground: #e5e7eb;\n  --accent: #8b9cff;\n}\n\n* {\n  box-sizing: border-box;\n}\n\nbody {\n  margin: 0;\n  background: var(--background);\n  color: var(--foreground);\n  font-family: system-ui, sans-serif;\n}\n\n.container {\n  width: min(720px, 90%);\n  margin: 10vh auto;\n}\n\nbutton {\n  padding: 10px 16px;\n  border: 0;\n  border-radius: 8px;\n  background: var(--accent);\n  color: #111318;\n}`,
  'script.js': `const button = document.querySelector('#helloButton');\n\nbutton?.addEventListener('click', () => {\n  console.log('Hello from vsSCRIPT!');\n});`
};
const codeInput = document.getElementById('codeInput');
const highlightLayer = document.getElementById('highlightLayer');
const lineNumbers = document.getElementById('lineNumbers');
const languageLabel = document.getElementById('languageLabel');
const statusLanguage = document.getElementById('statusLanguage');
const breadcrumbFile = document.getElementById('breadcrumbFile');
const cursorPosition = document.getElementById('cursorPosition');
const editorMessage = document.getElementById('editorMessage');
const toast = document.getElementById('toast');
let currentFile = 'index.html';
let toastTimer;

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
}
function highlight(code, file) {
  const escaped = escapeHtml(code);
  if (file.endsWith('.html')) {
    return escaped
      .replace(/(&lt;\/?)([a-zA-Z][\w-]*)/g, '$1<span class="token-tag">$2</span>')
      .replace(/([\w-]+)(=)("[^"]*"|'[^']*')/g, '<span class="token-attr">$1</span><span class="token-operator">$2</span><span class="token-string">$3</span>')
      .replace(/(&lt;!--[\s\S]*?--&gt;)/g, '<span class="token-comment">$1</span>');
  }
  const tokenPattern = /(\/\/[^\n]*|#[^\n]*|`(?:\\.|[^`])*`|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|\b(?:const|let|var|function|return|if|else|for|while|class|new|this|true|false|null|undefined|async|await|try|catch|import|export|from|local|then|end|do|nil|and|or|not)\b|\b\d+(?:\.\d+)?\b|\b[A-Za-z_$][\w$]*(?=\s*\()|[=+*/%<>!&|?:.-])/g;
  let output = '', last = 0, match;
  while ((match = tokenPattern.exec(escaped)) !== null) {
    output += escaped.slice(last, match.index);
    const token = match[0];
    let cls = 'token-operator';
    if (/^(\/\/|#)/.test(token)) cls = 'token-comment';
    else if (/^[`"']/.test(token)) cls = 'token-string';
    else if (/^(const|let|var|function|return|if|else|for|while|class|new|this|true|false|null|undefined|async|await|try|catch|import|export|from|local|then|end|do|nil|and|or|not)$/.test(token)) cls = 'token-keyword';
    else if (/^\d/.test(token)) cls = 'token-number';
    else if (/^[A-Za-z_$]/.test(token)) cls = 'token-function';
    output += `<span class="${cls}">${token}</span>`;
    last = tokenPattern.lastIndex;
  }
  return output + escaped.slice(last);
}
function renderEditor() {
  const code = codeInput.value;
  highlightLayer.innerHTML = highlight(code, currentFile) + (code.endsWith('\n') ? ' ' : '\n');
  const lineCount = Math.max(1, code.split('\n').length);
  lineNumbers.textContent = Array.from({length: lineCount}, (_, i) => i + 1).join('\n');
  syncScroll();
  updateCursor();
}
function syncScroll() {
  highlightLayer.scrollTop = codeInput.scrollTop;
  highlightLayer.scrollLeft = codeInput.scrollLeft;
  lineNumbers.scrollTop = codeInput.scrollTop;
}
function updateCursor() {
  const before = codeInput.value.slice(0, codeInput.selectionStart);
  const lines = before.split('\n');
  const line = lines.length;
  const col = lines[lines.length - 1].length + 1;
  cursorPosition.textContent = `Ln ${line}, Col ${col}`;
}
function languageFor(file) { return file.endsWith('.html') ? 'HTML' : file.endsWith('.css') ? 'CSS' : 'JavaScript'; }
function switchFile(file) {
  if (!samples[file]) return;
  currentFile = file;
  codeInput.value = samples[file];
  document.querySelectorAll('[data-file]').forEach(el => el.classList.toggle('active', el.classList.contains('editor-tab') && el.dataset.file === file));
  document.querySelectorAll('.file-row').forEach(el => el.classList.toggle('selected', el.dataset.file === file));
  breadcrumbFile.textContent = file;
  languageLabel.textContent = statusLanguage.textContent = languageFor(file);
  editorMessage.textContent = `${file} · Local editing`;
  renderEditor();
}
function showToast(message) {
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 1900);
}

document.querySelectorAll('.editor-tab,.file-row').forEach(button => button.addEventListener('click', () => switchFile(button.dataset.file)));
codeInput.addEventListener('input', renderEditor);
codeInput.addEventListener('scroll', syncScroll);
codeInput.addEventListener('click', updateCursor);
codeInput.addEventListener('keyup', updateCursor);
codeInput.addEventListener('keydown', event => {
  if (event.key === 'Tab') {
    event.preventDefault();
    const start = codeInput.selectionStart, end = codeInput.selectionEnd;
    codeInput.setRangeText('  ', start, end, 'end');
    renderEditor();
  }
  if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') runCurrentFile();
});

const sidebar = document.getElementById('sidebar');
const scrim = document.getElementById('mobileScrim');
function closeSidebar() { sidebar.classList.remove('open'); scrim.classList.remove('show'); }
document.getElementById('sidebarToggle').addEventListener('click', () => { sidebar.classList.toggle('open'); scrim.classList.toggle('show'); });
scrim.addEventListener('click', closeSidebar);
document.getElementById('collapseSidebar').addEventListener('click', () => { if (innerWidth <= 760) closeSidebar(); else sidebar.hidden = true; });
document.querySelectorAll('.activity-item[data-view]').forEach(button => button.addEventListener('click', () => {
  document.querySelectorAll('.activity-item').forEach(item => item.classList.remove('active'));
  button.classList.add('active');
  if (button.dataset.view === 'explorer') { sidebar.hidden = false; showToast('Explorer aktif'); }
  else showToast(`${button.title} panel belum dikonfigurasi`);
}));

document.getElementById('panelToggle').addEventListener('click', () => {
  const panel = document.getElementById('bottomPanel');
  panel.classList.toggle('collapsed');
  document.getElementById('panelToggle').textContent = panel.classList.contains('collapsed') ? '⌃' : '⌄';
});
document.querySelectorAll('.panel-tab').forEach(button => button.addEventListener('click', () => {
  document.querySelectorAll('.panel-tab').forEach(tab => tab.classList.toggle('active', tab === button));
  const content = document.getElementById('panelContent');
  const panel = button.dataset.panel;
  content.innerHTML = panel === 'terminal'
    ? '<div class="terminal-line"><span class="terminal-prompt">➜</span><span class="terminal-path">my-project</span><span class="terminal-symbol">$</span><span class="terminal-text">_</span></div><div class="terminal-note">Terminal preview — connect a runtime to execute code.</div>'
    : panel === 'output' ? '<div> <span class="terminal-prompt">●</span> Output panel is ready.</div><div class="terminal-note">Run output will appear here when a runtime is connected.</div>'
    : '<div> <span class="terminal-prompt">✓</span> No problems detected in this demo.</div>';
}));
function runCurrentFile() {
  const lang = languageFor(currentFile);
  if (lang === 'HTML') showToast('Preview runtime belum terhubung');
  else if (lang === 'JavaScript') showToast('JavaScript tersimpan di editor (demo)');
  else showToast('CSS siap diedit');
  document.getElementById('panelContent').innerHTML = `<div><span class="terminal-prompt">➜</span> Run requested: ${currentFile}</div><div class="terminal-note">This UI demo does not execute project files yet.</div>`;
  document.querySelectorAll('.panel-tab').forEach(tab => tab.classList.toggle('active', tab.dataset.panel === 'output'));
}
document.getElementById('runButton').addEventListener('click', runCurrentFile);
document.getElementById('newFileButton').addEventListener('click', () => showToast('File creation akan ditambahkan pada tahap berikutnya'));
document.getElementById('searchToggle').addEventListener('click', () => showToast('Search siap dikembangkan'));
document.getElementById('moreButton').addEventListener('click', () => showToast('Menu lainnya akan ditambahkan'));
document.getElementById('settingsButton').addEventListener('click', () => showToast('Settings akan ditambahkan'));

const modal = document.getElementById('modalBackdrop');
const commandInput = document.getElementById('commandInput');
function openCommands() { modal.hidden = false; commandInput.value = ''; commandInput.focus(); }
function closeCommands() { modal.hidden = true; }
document.getElementById('commandButton').addEventListener('click', openCommands);
modal.addEventListener('click', event => { if (event.target === modal) closeCommands(); });
document.querySelectorAll('[data-command]').forEach(button => button.addEventListener('click', () => {
  const command = button.dataset.command;
  if (command === 'explorer') { sidebar.hidden = false; if (innerWidth <= 760) { sidebar.classList.add('open'); scrim.classList.add('show'); } }
  if (command === 'terminal') document.getElementById('bottomPanel').classList.toggle('collapsed');
  if (command === 'run') runCurrentFile();
  closeCommands();
}));
document.addEventListener('keydown', event => {
  if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key.toLowerCase() === 'p') { event.preventDefault(); openCommands(); }
  if (event.key === 'Escape') { closeCommands(); closeSidebar(); }
});

switchFile('index.html');
