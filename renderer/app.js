// StratOverlay page: shows the current strat, its map and one step at a time.
const $ = (id) => document.getElementById(id);

// Each tower in the loadout gets its own color, used on its chip and wherever the step text names it.
const TOWER_COLORS = ['#ff6b6b', '#4dabf7', '#b197fc', '#ffa94d', '#51cf66', '#f783ac'];
const NOTE_COLORS = ['#4dabf7', '#51cf66', '#b197fc', '#ffa94d', '#f783ac'];
let towerColor = {};
const esc = (t) => t.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// Color tower names (and their plurals) and key words like Max / Chain in a step.
function colorize(text) {
  let html = esc(text);
  const names = Object.keys(towerColor).flatMap(n => n.split(' / ').map(part => [part, towerColor[n]]));
  names.sort((x, y) => y[0].length - x[0].length);
  const marks = [];
  for (const [name, color] of names) {
    const re = new RegExp('\\b(' + name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(?:e?s)?)\\b', 'gi');
    html = html.replace(re, (m) => { marks.push(`<span class="tw" style="color:${color}">${m}</span>`); return `\u0000${marks.length - 1}\u0000`; });
  }
  html = html.replace(/\b(Max|Chain(?: Call To Arms| CTA)?!?|1 by 1|Lv \d+[A-Z]?|\d[AB])\b/g, '<b class="kw">$1</b>');
  return html.replace(/\u0000(\d+)\u0000/g, (_m, i) => marks[i]);
}
let mode = 'overlay';
let collapsed = false;

// The main process tells us which mode we're in (and whether the overlay is collapsed).
function setModeUI(info) {
  mode = info.mode;
  collapsed = !!info.collapsed;
  document.body.classList.toggle('overlay', mode === 'overlay');
  document.body.classList.toggle('window', mode === 'window');
  document.body.classList.toggle('collapsed', collapsed && mode === 'overlay');
  $('modeBtn').textContent = mode === 'overlay' ? '⛶ Fullscreen' : '▣ Overlay';
  $('collapseBtn').textContent = collapsed ? '▸' : '▾';
}
document.body.classList.add('overlay');

function toggleCollapse() {
  if (mode !== 'overlay') return;
  collapsed = !collapsed;
  setModeUI({ mode, collapsed });
  // Measure how tall the small bar is so the window can shrink to fit it.
  const panel = $('panel');
  panel.style.height = 'auto';
  const barHeight = Math.ceil(panel.getBoundingClientRect().height) + 2;
  panel.style.height = '';
  window.bridge.setCollapsed(collapsed, collapsed ? barHeight : null);
}

let strats = [];
let strat = null;
let currentFile = null;
let rawStrat = null;
let player = null;
const progressKey = () => player === null ? currentFile : `${currentFile}#${player}`;
let step = 0;
let settings = {};

async function init() {
  settings = await window.bridge.getSettings();
  applyOpacity(settings.opacity ?? 92);
  $('opacity').value = settings.opacity ?? 92;
  $('showMap').checked = settings.showMap !== false;
  document.body.classList.toggle('hide-map', settings.showMap === false);

  await refreshList(settings.lastStrat);
}

async function refreshList(selectFile) {
  strats = await window.bridge.list();
  const picker = $('stratPicker');
  picker.innerHTML = '';
  if (!strats.length) {
    picker.innerHTML = '<option>No strats yet</option>';
    strat = null;
    showAddScreen(true);
    return;
  }
  showAddScreen(false);
  for (const s of strats) {
    const opt = document.createElement('option');
    opt.value = s.file; opt.textContent = s.name; opt.disabled = !!s.error;
    picker.appendChild(opt);
  }
  const pick = strats.find(s => s.file === selectFile && !s.error) || strats.find(s => !s.error);
  if (pick) { picker.value = pick.file; await openStrat(pick.file); }
}

async function openStrat(file) {
  rawStrat = await window.bridge.load(file);
  currentFile = file;
  window.bridge.saveSettings({ lastStrat: file });
  settings.lastStrat = file;

  // Multiplayer strats get a player picker; each player has their own loadout, map and steps.
  const players = rawStrat.players || [];
  $('players').innerHTML = '';
  $('players').style.display = players.length ? '' : 'none';
  players.forEach((p, i) => {
    const b = document.createElement('button');
    b.textContent = p.name || `Player ${i + 1}`;
    b.onclick = () => choosePlayer(i);
    $('players').appendChild(b);
  });
  const savedPlayer = (settings.players || {})[file] ?? 0;
  choosePlayer(players.length ? Math.min(savedPlayer, players.length - 1) : null);
}

function choosePlayer(index) {
  player = index;
  strat = index === null ? rawStrat : { ...rawStrat, ...rawStrat.players[index] };
  [...$('players').children].forEach((b, i) => b.classList.toggle('active', i === index));
  if (index !== null) {
    settings.players = { ...(settings.players || {}), [currentFile]: index };
    window.bridge.saveSettings({ players: settings.players });
  }
  const saved = (settings.progress || {})[progressKey()];
  step = Math.min(saved ?? 0, strat.steps.length - 1);

  $('meta').textContent = [strat.mode, strat.map, strat.difficulty].filter(Boolean).join(' · ');
  if (strat.placementMapUrl) {
    $('map').src = strat.placementMapUrl; $('map').style.display = ''; $('noMap').style.display = 'none';
  } else {
    $('map').style.display = 'none'; $('noMap').style.display = '';
  }
  towerColor = {};
  (strat.loadout || []).forEach((t, i) => {
    const c = TOWER_COLORS[i % TOWER_COLORS.length];
    towerColor[t.tower] = c;
    // Options like "DJ Booth" or "Juggernaut (bottom path)" share their slot's color in the text.
    for (const o of t.options || []) { const n = o.split(' (')[0].trim(); if (!(n in towerColor)) towerColor[n] = c; }
  });
  $('notes').innerHTML = '';
  (strat.notes || []).forEach((n, i) => {
    const li = document.createElement('li'); li.innerHTML = colorize(n);
    li.style.setProperty('--c', NOTE_COLORS[i % NOTE_COLORS.length]);
    $('notes').appendChild(li);
  });
  render();
}

function render() {
  if (!strat) return;
  const s = strat.steps[step];
  $('stepCount').textContent = `Step ${step + 1} / ${strat.steps.length}` + (s.wave ? ` · Wave ${s.wave}` : '');
  $('stepText').innerHTML = colorize(s.text);
  $('stepTip').textContent = s.tip || '';
  $('prevBtn').disabled = step === 0;
  $('nextBtn').disabled = step === strat.steps.length - 1;

  const active = new Set(s.towers || []);
  $('loadout').innerHTML = '';
  for (const t of strat.loadout || []) {
    const chip = document.createElement('span');
    chip.className = 'chip' + (active.has(t.tower) ? ' active' : '');
    chip.style.setProperty('--c', towerColor[t.tower]);
    chip.textContent = t.tower;
    if (t.options) chip.title = 'Options: ' + t.options.join(', ');
    $('loadout').appendChild(chip);
  }

  settings.progress = { ...(settings.progress || {}), [progressKey()]: step };
  window.bridge.saveSettings({ progress: settings.progress });
}

function go(action) {
  if (!strat) return;
  if (action === 'next') step = Math.min(step + 1, strat.steps.length - 1);
  if (action === 'prev') step = Math.max(step - 1, 0);
  if (action === 'first') step = 0;
  if (action === 'toggleCollapse') { toggleCollapse(); return; }
  if (action === 'toggleMap') { $('showMap').checked = !$('showMap').checked; setMap($('showMap').checked); return; }
  render();
}

function setMap(show) {
  document.body.classList.toggle('hide-map', !show);
  window.bridge.saveSettings({ showMap: show });
}

function applyOpacity(v) { document.documentElement.style.setProperty('--alpha', v / 100); }

$('nextBtn').onclick = () => go('next');
$('prevBtn').onclick = () => go('prev');
$('restartBtn').onclick = () => go('first');
$('stratPicker').onchange = (e) => { showAddScreen(false); openStrat(e.target.value); };
$('modeBtn').onclick = () => window.bridge.switchMode();
$('collapseBtn').onclick = toggleCollapse;
$('closeBtn').onclick = () => window.bridge.close();
$('showMap').onchange = (e) => setMap(e.target.checked);
$('opacity').oninput = (e) => { applyOpacity(e.target.value); window.bridge.saveSettings({ opacity: +e.target.value }); };
// ---- Add a strat screen ----
let pickedMap = null;
function showAddScreen(show, firstTime = !strats.length) {
  document.body.classList.toggle('adding', show);
  $('addBtn').classList.toggle('active', show);
  $('addBtn').textContent = show && !firstTime ? '✕ Close' : '+';
  $('addBtn').title = show ? 'Close the add screen' : 'Add a strat';
  $('welcome').style.display = firstTime ? '' : 'none';
  $('addTitle').textContent = firstTime ? 'Welcome to StratOverlay' : 'Add a strat';
  $('cancelAddBtn').style.display = firstTime ? 'none' : '';
  if (show) { $('addMsg').textContent = ''; $('addMsg').className = ''; }
}
function addMessage(text, ok) { $('addMsg').textContent = text; $('addMsg').className = ok ? 'ok' : 'bad'; }

$('addBtn').onclick = () => showAddScreen(!document.body.classList.contains('adding') || !strats.length);
$('cancelAddBtn').onclick = () => showAddScreen(false);
$('copyPromptBtn').onclick = async () => {
  await window.bridge.copyText(window.AI_PROMPT);
  $('copyPromptBtn').textContent = '✅ Copied! Now paste it into an AI';
  setTimeout(() => { $('copyPromptBtn').textContent = '📋 Copy AI prompt'; }, 2500);
};
$('pickMapBtn').onclick = async () => {
  const file = await window.bridge.pickMap();
  if (file) { pickedMap = file; $('mapName').textContent = file.split(/[\\/]/).pop(); }
};
$('saveStratBtn').onclick = async () => {
  const res = await window.bridge.saveStratText($('stratJson').value, pickedMap);
  if (!res.ok) return addMessage(res.error, false);
  $('stratJson').value = ''; pickedMap = null; $('mapName').textContent = '';
  await refreshList(res.file);
};
$('importBtn').onclick = async () => {
  try {
    const file = await window.bridge.importFile();
    if (file) await refreshList(file);
  } catch (e) {
    addMessage('That file could not be read: ' + e.message, false);
  }
};
$('openFolderBtn').onclick = () => window.bridge.openStratsFolder();

// Arrow keys also work while the StratOverlay window itself has focus.
document.addEventListener('keydown', (e) => {
  if (e.target.tagName === 'SELECT' || e.target.tagName === 'TEXTAREA') return;
  if (e.key === 'ArrowRight' || e.key === ' ') go('next');
  if (e.key === 'ArrowLeft') go('prev');
  if (e.key === 'Escape' && mode === 'window') window.bridge.switchMode();
});
// Drag the overlay by holding the mouse on any empty spot (buttons, menus and text boxes still work).
(() => {
  let start = null;
  const panel = $('panel');
  panel.addEventListener('pointerdown', (e) => {
    if (mode !== 'overlay' || e.button !== 0) return;
    if (e.target.closest('button, select, input, textarea, summary, label, a')) return;
    if (e.offsetX > panel.clientWidth) return; // clicking the scrollbar
    start = { x: e.screenX, y: e.screenY };
    panel.setPointerCapture(e.pointerId);
    document.body.classList.add('dragging');
  });
  panel.addEventListener('pointermove', (e) => {
    if (!start) return;
    const dx = e.screenX - start.x, dy = e.screenY - start.y;
    if (dx || dy) { window.bridge.moveBy(dx, dy); start = { x: e.screenX, y: e.screenY }; }
  });
  const stop = (e) => { if (!start) return; start = null; document.body.classList.remove('dragging'); window.bridge.moveDone(); };
  panel.addEventListener('pointerup', stop);
  panel.addEventListener('pointercancel', stop);
})();

window.bridge.onHotkey(go);
window.bridge.onMode(setModeUI);

init();
