const {
  app,
  BrowserWindow,
  Tray,
  Menu,
  nativeImage,
  nativeTheme,
  globalShortcut,
  ipcMain,
  clipboard,
  dialog,
  screen,
  Notification
} = require('electron')
const fs = require('fs')
const path = require('path')

app.setAppUserModelId('ru.scratchpad.app')

const gotLock = app.requestSingleInstanceLock()
if (!gotLock) {
  app.quit()
} else {
  app.on('second-instance', () => showWindow())
}

const DEFAULTS = {
  fontSize: 14,
  wrap: true,
  confirmClear: true,
  hideOnBlur: false,
  hotkey: 'Control+Alt+Space',
  bounds: null
}

let win
let tray
let quitting = false
let dialogOpen = false
let ignoreBlur = false
let settings = { ...DEFAULTS }
let saveBoundsTimer

function userFile(name) {
  return path.join(app.getPath('userData'), name)
}

function readJson(file, fallback) {
  try {
    return { ...fallback, ...JSON.parse(fs.readFileSync(file, 'utf8')) }
  } catch {
    return { ...fallback }
  }
}

function writeFile(file, data) {
  fs.writeFileSync(file, data)
}

function persistSettings() {
  try {
    writeFile(userFile('settings.json'), JSON.stringify(settings, null, 2))
  } catch (err) {
    notify('Не удалось сохранить настройки', err.message)
  }
}

function notify(title, body) {
  try {
    new Notification({ title, body, icon: nativeImage.createFromBuffer(trayPng()) }).show()
  } catch {
    /* ignore */
  }
}

function isDark() {
  return nativeTheme.shouldUseDarkColors
}

function trayPng() {
  const name = isDark() ? 'tray-light.png' : 'tray-dark.png'
  return fs.readFileSync(path.join(__dirname, '..', 'assets', name))
}

function trayImage() {
  return nativeImage.createFromBuffer(trayPng())
}

function assetIcon() {
  return nativeImage.createFromBuffer(fs.readFileSync(path.join(__dirname, '..', 'assets', 'icon-32.png')))
}

function loadUiIcons() {
  const dir = path.join(__dirname, '..', 'assets', 'icons')
  const names = [
    'trash-2',
    'save',
    'folder-open',
    'copy',
    'clipboard-paste',
    'settings',
    'minus',
    'wrap-text'
  ]
  const out = {}
  for (const name of names) {
    out[name] = fs
      .readFileSync(path.join(dir, name + '.svg'), 'utf8')
      .replace(/width="24"/, 'width="16"')
      .replace(/height="24"/, 'height="16"')
      .replace(/stroke-width="2"/, 'stroke-width="1.75"')
  }
  return out
}

function clampBounds(b) {
  const displays = screen.getAllDisplays()
  const hit = displays.some((d) => {
    const a = d.workArea
    return b.x < a.x + a.width && b.x + 80 > a.x && b.y < a.y + a.height && b.y + 40 > a.y
  })
  return hit ? b : null
}

function placeNearCursor() {
  const pt = screen.getCursorScreenPoint()
  const { width, height } = win.getBounds()
  const { workArea } = screen.getDisplayNearestPoint(pt)
  let x = pt.x + 12
  let y = pt.y + 12
  if (x + width > workArea.x + workArea.width) x = pt.x - width - 12
  if (y + height > workArea.y + workArea.height) y = pt.y - height - 12
  x = Math.min(Math.max(workArea.x, x), workArea.x + workArea.width - width)
  y = Math.min(Math.max(workArea.y, y), workArea.y + workArea.height - height)
  win.setPosition(Math.round(x), Math.round(y))
}

function applyBounds() {
  const b = settings.bounds && clampBounds(settings.bounds)
  if (b) win.setBounds(b)
  else placeNearCursor()
}

function saveBoundsSoon() {
  clearTimeout(saveBoundsTimer)
  saveBoundsTimer = setTimeout(() => {
    if (!win || !win.isVisible()) return
    settings.bounds = win.getBounds()
    persistSettings()
  }, 250)
}

function hideWindow() {
  if (!win) return
  win.webContents.send('flush-draft')
  win.hide()
}

function showWindow() {
  if (!win) return
  applyBounds()
  win.setAlwaysOnTop(true)
  win.show()
  win.focus()
  win.webContents.send('focus-editor')
}

function toggleWindow() {
  if (!win) return
  if (win.isVisible()) hideWindow()
  else showWindow()
}

function registerHotkey(accel) {
  globalShortcut.unregisterAll()
  const key = accel || settings.hotkey
  const ok = globalShortcut.register(key, toggleWindow)
  if (!ok) notify('Черновик', `Хоткей ${key} занят. Откройте окно из трея.`)
  return ok
}

function loginOpts(openAtLogin) {
  if (app.isPackaged) return { openAtLogin }
  return { openAtLogin, path: process.execPath, args: [path.join(__dirname, '..')] }
}

function trayMenu() {
  const auto = app.getLoginItemSettings(loginOpts()).openAtLogin
  return Menu.buildFromTemplate([
    { label: 'Показать', click: showWindow },
    {
      label: 'Автозапуск вместе с Windows',
      type: 'checkbox',
      checked: auto,
      click: (item) => {
        app.setLoginItemSettings(loginOpts(item.checked))
      }
    },
    { type: 'separator' },
    {
      label: 'Выход',
      click: () => {
        quitting = true
        app.quit()
      }
    }
  ])
}

function createTray() {
  tray = new Tray(trayImage())
  tray.setToolTip('Черновик')
  tray.setContextMenu(trayMenu())
  tray.on('click', () => {
    ignoreBlur = true
    toggleWindow()
    setTimeout(() => { ignoreBlur = false }, 300)
  })
}

function createWindow() {
  const dark = isDark()
  win = new BrowserWindow({
    width: 460,
    height: 340,
    minWidth: 320,
    minHeight: 220,
    show: false,
    frame: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    fullscreenable: false,
    minimizable: false,
    maximizable: false,
    backgroundColor: dark ? '#1c1d21' : '#f3f3f4',
    icon: assetIcon(),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      spellcheck: false
    }
  })
  win.setMenu(null)
  win.loadFile(path.join(__dirname, 'renderer', 'index.html'))
  win.on('close', (e) => {
    if (quitting) return
    e.preventDefault()
    hideWindow()
  })
  win.on('blur', () => {
    if (ignoreBlur || !settings.hideOnBlur || dialogOpen || quitting || !win.isVisible()) return
    hideWindow()
  })
  win.on('moved', saveBoundsSoon)
  win.on('resized', saveBoundsSoon)
}

async function withDialog(fn) {
  dialogOpen = true
  try {
    return await fn()
  } finally {
    dialogOpen = false
    if (win && win.isVisible()) win.focus()
  }
}

function readDraft() {
  try {
    return fs.readFileSync(userFile('draft.txt'), 'utf8')
  } catch {
    return ''
  }
}

ipcMain.handle('init', () => ({
  draft: readDraft(),
  settings: {
    fontSize: settings.fontSize,
    wrap: settings.wrap,
    confirmClear: settings.confirmClear,
    hideOnBlur: settings.hideOnBlur,
    hotkey: settings.hotkey
  },
  dark: isDark(),
  icons: loadUiIcons()
}))

function saveDraft(text) {
  try {
    writeFile(userFile('draft.txt'), text ?? '')
    return { ok: true }
  } catch (err) {
    return { ok: false, error: 'Не удалось сохранить черновик: ' + err.message }
  }
}

ipcMain.handle('draft:save', (_e, text) => saveDraft(text))
ipcMain.on('draft:saveSync', (e, text) => {
  e.returnValue = saveDraft(text)
})

ipcMain.handle('settings:save', (_e, patch) => {
  settings = {
    ...settings,
    fontSize: patch.fontSize,
    wrap: patch.wrap,
    confirmClear: patch.confirmClear,
    hideOnBlur: patch.hideOnBlur
  }
  persistSettings()
  return { ok: true }
})

ipcMain.handle('hotkey:set', (_e, accel) => {
  const prev = settings.hotkey
  const ok = registerHotkey(accel)
  if (ok) {
    settings.hotkey = accel
    persistSettings()
    return { ok: true }
  }
  registerHotkey(prev)
  return { ok: false, error: 'Не удалось назначить хоткей: он занят' }
})

ipcMain.handle('clipboard:read', () => clipboard.readText())
ipcMain.handle('clipboard:write', (_e, text) => {
  clipboard.writeText(text ?? '')
  return { ok: true }
})

ipcMain.handle('file:save', async (_e, text) => {
  try {
    const res = await withDialog(() =>
      dialog.showSaveDialog(win, {
        title: 'Сохранить как',
        defaultPath: 'draft.txt',
        filters: [
          { name: 'Текст', extensions: ['txt'] },
          { name: 'Все файлы', extensions: ['*'] }
        ]
      })
    )
    if (res.canceled || !res.filePath) return { ok: false, canceled: true }
    writeFile(res.filePath, text ?? '')
    return { ok: true, name: path.basename(res.filePath) }
  } catch (err) {
    return { ok: false, error: 'Не удалось сохранить файл: ' + err.message }
  }
})

ipcMain.handle('file:open', async () => {
  try {
    const res = await withDialog(() =>
      dialog.showOpenDialog(win, {
        title: 'Открыть файл',
        properties: ['openFile'],
        filters: [
          { name: 'Текст', extensions: ['txt', 'md', 'log', 'json', 'csv'] },
          { name: 'Все файлы', extensions: ['*'] }
        ]
      })
    )
    if (res.canceled || !res.filePaths[0]) return { ok: false, canceled: true }
    let text = fs.readFileSync(res.filePaths[0], 'utf8')
    if (text.charCodeAt(0) === 0xfeff) text = text.slice(1)
    return { ok: true, text, name: path.basename(res.filePaths[0]) }
  } catch (err) {
    return { ok: false, error: 'Не удалось открыть файл: ' + err.message }
  }
})

ipcMain.on('window:hide', hideWindow)

nativeTheme.on('updated', () => {
  if (tray) tray.setImage(trayImage())
  if (win) {
    win.setBackgroundColor(isDark() ? '#1c1d21' : '#f3f3f4')
    win.webContents.send('theme', isDark())
  }
})

app.whenReady().then(() => {
  if (!gotLock) return
  settings = readJson(userFile('settings.json'), DEFAULTS)
  createWindow()
  createTray()
  registerHotkey(settings.hotkey)
})

app.on('before-quit', () => {
  quitting = true
  globalShortcut.unregisterAll()
})
