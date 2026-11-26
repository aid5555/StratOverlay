// StratOverlay main process: creates the window, registers hotkeys, loads strat files.
const { app, BrowserWindow, globalShortcut, ipcMain, dialog, screen, clipboard, shell } = require('electron');
const path = require('path');
const fs = require('fs');

let win = null;
let mode = 'overlay'; // 'overlay' (see-through, always on top) or 'window' (fullscreen strat, no overlay)

// Strats live in two places: the ones shipped with the app, and the user's own folder.
// Bundled strats can sit in ./strats or ../strats next to the app (both are optional).
const bundledStratsDirs = [path.join(__dirname, 'strats'), path.join(__dirname, '..', 'strats')];
const userStratsDir = () => path.join(app.getPath('userData'), 'strats');

function settingsPath() { return path.join(app.getPath('userData'), 'settings.json'); }
function loadSettings() {
  try { return JSON.parse(fs.readFileSync(settingsPath(), 'utf8')); } catch { return {}; }
}
function saveSettings(patch) {
  const s = { ...loadSettings(), ...patch };
  fs.mkdirSync(path.dirname(settingsPath()), { recursive: true });
  fs.writeFileSync(settingsPath(), JSON.stringify(s, null, 2));
}

// One window for everything. Overlay mode = small, see-through, always on top.
// Fullscreen mode = the same window stretched over the screen with a solid background.
// (Mac's own green-button fullscreen doesn't work well with see-through windows, so we don't use it.)
let collapsed = false;

function createWindow() {
  const settings = loadSettings();
  collapsed = !!settings.collapsed;

  win = new BrowserWindow({
    ...(settings.overlayBounds || defaultBounds()),
    minWidth: 260,
    minHeight: 40,
    frame: false,
    transparent: true,
    hasShadow: false,
    title: 'StratOverlay',
    backgroundColor: '#00000000',
    webPreferences: { preload: path.join(__dirname, 'preload.js') },
  });
  win.loadFile(path.join(__dirname, 'renderer', 'index.html'));
  win.webContents.on('did-finish-load', () => applyMode());

  // Remember where you dragged the overlay to (and its size when not collapsed).
  const remember = () => {
    if (!win || win.isDestroyed() || mode !== 'overlay') return;
    const b = win.getBounds();
    const prev = loadSettings().overlayBounds || b;
    saveSettings({ overlayBounds: collapsed ? { ...b, height: prev.height } : b });
  };
  win.on('moved', remember);
  win.on('resized', remember);
  win.on('closed', () => { win = null; });
}

function applyMode() {
  if (!win || win.isDestroyed()) return;
  const settings = loadSettings();
  if (mode === 'overlay') {
    // 'screen-saver' level + visibleOnFullScreen lets it float above fullscreen Roblox on Mac.
    win.setAlwaysOnTop(true, 'screen-saver');
    if (process.platform === 'darwin') win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
    const b = settings.overlayBounds || defaultBounds();
    win.setBounds(collapsed && settings.collapsedHeight ? { ...b, height: settings.collapsedHeight } : b);
  } else {
    win.setAlwaysOnTop(false);
    if (process.platform === 'darwin') win.setVisibleOnAllWorkspaces(false);
    const display = screen.getDisplayMatching(win.getBounds());
    win.setBounds(display.workArea);
    win.focus();
  }
  win.webContents.send('mode', { mode, collapsed });
}

function defaultBounds() {
  const { workArea } = screen.getPrimaryDisplay();
  return { width: 380, height: 560, x: workArea.x + workArea.width - 400, y: workArea.y + 60 };
}

function switchMode() {
  if (mode === 'overlay' && win) {
    const b = win.getBounds();
    const prev = loadSettings().overlayBounds || b;
    saveSettings({ overlayBounds: collapsed ? { ...b, height: prev.height } : b });
  }
  mode = mode === 'overlay' ? 'window' : 'overlay';
  saveSettings({ mode });
  applyMode();
}

// Collapse the overlay to a small bar (renderer tells us how tall the bar is).
function setCollapsed(value, barHeight) {
  collapsed = value;
  saveSettings({ collapsed, ...(barHeight ? { collapsedHeight: barHeight } : {}) });
  if (mode === 'overlay') applyMode();
}

function send(action) { if (win && !win.isDestroyed()) win.webContents.send('hotkey', action); }

function registerHotkeys() {
  const keys = {
    'Alt+Right': () => send('next'),
    'Alt+Left': () => send('prev'),
    'Alt+Up': () => send('first'),
    'Alt+M': () => send('toggleMap'),
    'Alt+O': () => switchMode(),
    'Alt+C': () => send('toggleCollapse'),
    'Alt+H': () => { if (!win) return; win.isVisible() ? win.hide() : win.showInactive(); },
  };
  for (const [key, fn] of Object.entries(keys)) {
    if (!globalShortcut.register(key, fn)) console.warn('Could not register hotkey', key);
  }
}

// ---- Strat files ----
function readStratsFrom(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter(f => f.toLowerCase().endsWith('.json'))
    .map(f => {
      const file = path.join(dir, f);
      try {
        const strat = JSON.parse(fs.readFileSync(file, 'utf8'));
        return { file, name: strat.name || f };
      } catch (e) {
        return { file, name: f + ' (broken file)', error: String(e.message) };
      }
    });
}

ipcMain.handle('list-strats', () => {
  fs.mkdirSync(userStratsDir(), { recursive: true });
  return [...bundledStratsDirs.flatMap(readStratsFrom), ...readStratsFrom(userStratsDir())];
});

ipcMain.handle('load-strat', (_e, file) => {
  const strat = JSON.parse(fs.readFileSync(file, 'utf8'));
  // Turn the map path into a file:// URL the page can show.
  const mapUrl = (rel) => {
    if (!rel) return null;
    const mapPath = path.resolve(path.dirname(file), rel);
    return fs.existsSync(mapPath) ? 'file://' + mapPath.replace(/\\/g, '/') : null;
  };
  strat.placementMapUrl = mapUrl(strat.placementMap);
  // Multiplayer strats: every player has their own map.
  for (const p of strat.players || []) p.placementMapUrl = mapUrl(p.placementMap);
  return strat;
});

ipcMain.handle('import-strat', async () => {
  const res = await dialog.showOpenDialog(win, {
    title: 'Add a strat file',
    filters: [{ name: 'Strat files', extensions: ['json'] }],
    properties: ['openFile'],
  });
  if (res.canceled || !res.filePaths[0]) return null;
  const src = res.filePaths[0];
  JSON.parse(fs.readFileSync(src, 'utf8')); // throws if the file is not valid
  const destDir = userStratsDir();
  fs.mkdirSync(path.join(destDir, 'maps'), { recursive: true });
  const dest = path.join(destDir, path.basename(src));
  fs.copyFileSync(src, dest);
  // Copy its map image too, if it sits next to it.
  const strat = JSON.parse(fs.readFileSync(src, 'utf8'));
  const maps = [strat.placementMap, ...(strat.players || []).map(p => p.placementMap)].filter(Boolean);
  for (const rel of maps) {
    const mapSrc = path.resolve(path.dirname(src), rel);
    const mapDest = path.resolve(destDir, rel);
    if (fs.existsSync(mapSrc)) { fs.mkdirSync(path.dirname(mapDest), { recursive: true }); fs.copyFileSync(mapSrc, mapDest); }
  }
  return dest;
});

ipcMain.handle('switch-mode', () => switchMode());

// Save a strat pasted as text (usually JSON from an AI), with an optional map image.
ipcMain.handle('save-strat-text', (_e, text, mapPath) => {
  let strat;
  try {
    // AIs often wrap JSON in ```json fences; strip them and anything around the outer { }.
    const raw = String(text || '');
    const json = raw.slice(raw.indexOf('{'), raw.lastIndexOf('}') + 1);
    strat = JSON.parse(json);
  } catch {
    return { ok: false, error: "That isn't valid strat JSON. Copy the AI's whole answer and try again." };
  }
  const hasSteps = Array.isArray(strat.steps) && strat.steps.length;
  const hasPlayers = Array.isArray(strat.players) && strat.players.length && strat.players.every(p => Array.isArray(p.steps) && p.steps.length);
  if (!hasSteps && !hasPlayers) return { ok: false, error: 'The strat has no steps. Ask the AI to follow the format exactly.' };
  strat.formatVersion = strat.formatVersion || 1;
  strat.name = strat.name || 'New strat';

  const dir = userStratsDir();
  fs.mkdirSync(path.join(dir, 'maps'), { recursive: true });
  const slug = (strat.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'strat').slice(0, 50);
  let base = slug, n = 2;
  while (fs.existsSync(path.join(dir, base + '.json'))) base = `${slug}-${n++}`;
  if (mapPath && fs.existsSync(mapPath)) {
    const rel = `maps/${base}${path.extname(mapPath).toLowerCase() || '.png'}`;
    fs.copyFileSync(mapPath, path.join(dir, rel));
    strat.placementMap = rel;
  }
  const file = path.join(dir, base + '.json');
  fs.writeFileSync(file, JSON.stringify(strat, null, 2));
  return { ok: true, file };
});

ipcMain.handle('pick-map', async () => {
  const res = await dialog.showOpenDialog(win, {
    title: 'Choose the placement map image',
    filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'webp', 'gif'] }],
    properties: ['openFile'],
  });
  return res.canceled ? null : res.filePaths[0];
});
ipcMain.handle('copy-text', (_e, text) => clipboard.writeText(String(text)));
ipcMain.handle('open-strats-folder', () => {
  fs.mkdirSync(userStratsDir(), { recursive: true });
  return shell.openPath(userStratsDir());
});
ipcMain.on('move-by', (_e, dx, dy) => {
  if (!win || mode !== 'overlay') return;
  const [x, y] = win.getPosition();
  win.setPosition(Math.round(x + dx), Math.round(y + dy));
});
ipcMain.on('move-done', () => {
  if (!win || mode !== 'overlay') return;
  const b = win.getBounds();
  const prev = loadSettings().overlayBounds || b;
  saveSettings({ overlayBounds: collapsed ? { ...b, height: prev.height } : b });
});
ipcMain.handle('set-collapsed', (_e, value, barHeight) => setCollapsed(value, barHeight));
ipcMain.handle('get-settings', () => loadSettings());
ipcMain.handle('save-settings', (_e, patch) => saveSettings(patch));
ipcMain.handle('close', () => app.quit());

app.whenReady().then(() => {
  mode = 'overlay'; // always start as the overlay
  createWindow();
  registerHotkeys();
});

app.on('will-quit', () => globalShortcut.unregisterAll());
app.on('window-all-closed', () => app.quit());
