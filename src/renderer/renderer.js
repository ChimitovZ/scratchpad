const editor = document.getElementById('editor')
const statsEl = document.getElementById('stats')
const msgEl = document.getElementById('msg')
const panel = document.getElementById('panel')
const confirmEl = document.getElementById('confirm')
const undoBtn = document.getElementById('undo')
const fontSizeEl = document.getElementById('fontSize')
const wrapEl = document.getElementById('wrap')
const confirmClearEl = document.getElementById('confirmClear')
const hideOnBlurEl = document.getElementById('hideOnBlur')
const hotkeyEl = document.getElementById('hotkey')
const wrapBtn = document.querySelector('[data-act="wrap"]')

let settings = {}
let saveTimer
let undoTimer
let undoText = ''
let msgTimer
let capturingHotkey = false

function applyTheme(dark) {
  document.documentElement.classList.toggle('light', !dark)
}

function setIcons(icons) {
  document.querySelectorAll('[data-icon]').forEach((btn) => {
    btn.innerHTML = icons[btn.dataset.icon] || ''
  })
}

function stats(t) {
  const chars = t.length
  const words = t.trim() ? t.trim().split(/\s+/).length : 0
  const lines = t.length ? t.split(/\r\n|\n|\r/).length : 1
  statsEl.textContent = `${chars} символов · ${words} слов · ${lines} ${plural(lines)}`
}

function plural(n) {
  const m = n % 100
  if (m > 10 && m < 20) return 'строк'
  const d = n % 10
  if (d === 1) return 'строка'
  if (d > 1 && d < 5) return 'строки'
  return 'строк'
}

function say(text, err) {
  clearTimeout(msgTimer)
  msgEl.textContent = text || ''
  msgEl.classList.toggle('err', !!err)
  if (text) msgTimer = setTimeout(() => { msgEl.textContent = '' }, 2500)
}

function applySettings() {
  editor.style.fontSize = settings.fontSize + 'px'
  editor.classList.toggle('wrap', settings.wrap)
  wrapBtn.classList.toggle('active', settings.wrap)
  wrapEl.checked = settings.wrap
  fontSizeEl.value = settings.fontSize
  confirmClearEl.checked = settings.confirmClear
  hideOnBlurEl.checked = settings.hideOnBlur
  hotkeyEl.value = settings.hotkey
}

function persist() {
  window.api.saveSettings({
    fontSize: +fontSizeEl.value || 14,
    wrap: wrapEl.checked,
    confirmClear: confirmClearEl.checked,
    hideOnBlur: hideOnBlurEl.checked
  })
  settings.fontSize = +fontSizeEl.value || 14
  settings.wrap = wrapEl.checked
  settings.confirmClear = confirmClearEl.checked
  settings.hideOnBlur = hideOnBlurEl.checked
  applySettings()
}

function queueSave() {
  stats(editor.value)
  clearTimeout(saveTimer)
  saveTimer = setTimeout(flush, 400)
}

function flush() {
  clearTimeout(saveTimer)
  const res = window.api.saveDraftSync(editor.value)
  if (res && !res.ok) say(res.error, true)
}

function insertPlain(text) {
  const start = editor.selectionStart
  const end = editor.selectionEnd
  const v = editor.value
  editor.value = v.slice(0, start) + text + v.slice(end)
  const pos = start + text.length
  editor.setSelectionRange(pos, pos)
  queueSave()
}

function doClear() {
  undoText = editor.value
  editor.value = ''
  queueSave()
  editor.focus()
  undoBtn.hidden = false
  clearTimeout(undoTimer)
  undoTimer = setTimeout(() => { undoBtn.hidden = true }, 5000)
}

function askClear() {
  if (!editor.value) return
  if (settings.confirmClear) {
    confirmEl.hidden = false
    return
  }
  doClear()
}

async function saveAs() {
  const res = await window.api.saveFile(editor.value)
  if (res.canceled) return
  if (!res.ok) say(res.error, true)
  else say('Сохранено: ' + res.name)
}

async function openFile() {
  const res = await window.api.openFile()
  if (res.canceled) return
  if (!res.ok) say(res.error, true)
  else {
    editor.value = res.text
    queueSave()
    say('Открыто: ' + res.name)
  }
}

async function copyAll() {
  await window.api.clipboardWrite(editor.value)
  say('Скопировано')
}

async function pasteReplace() {
  const text = await window.api.clipboardRead()
  editor.value = text ?? ''
  queueSave()
  editor.focus()
}

function closeOverlays() {
  panel.hidden = true
  confirmEl.hidden = true
  capturingHotkey = false
}

function toAccel(e) {
  const parts = []
  if (e.ctrlKey) parts.push('Control')
  if (e.altKey) parts.push('Alt')
  if (e.shiftKey) parts.push('Shift')
  if (e.metaKey) parts.push('Super')
  const skip = ['Control', 'Alt', 'Shift', 'Meta', 'OS']
  if (skip.includes(e.key)) return null
  let key = e.key
  if (key === ' ') key = 'Space'
  else if (key.length === 1) key = key.toUpperCase()
  else if (key.startsWith('Arrow')) key = key.slice(5)
  parts.push(key)
  return parts.length > 1 ? parts.join('+') : null
}

document.querySelectorAll('[data-act]').forEach((btn) => {
  btn.addEventListener('click', () => {
    const act = btn.dataset.act
    if (act === 'clear') askClear()
    if (act === 'save') saveAs()
    if (act === 'open') openFile()
    if (act === 'copy') copyAll()
    if (act === 'paste') pasteReplace()
    if (act === 'wrap') {
      wrapEl.checked = !wrapEl.checked
      persist()
    }
    if (act === 'settings') {
      confirmEl.hidden = true
      panel.hidden = !panel.hidden
    }
    if (act === 'hide') {
      flush()
      window.api.hide()
    }
  })
})

document.getElementById('yes').onclick = () => { confirmEl.hidden = true; doClear() }
document.getElementById('no').onclick = () => { confirmEl.hidden = true; editor.focus() }
undoBtn.onclick = () => {
  editor.value = undoText
  undoBtn.hidden = true
  queueSave()
  editor.focus()
}

fontSizeEl.addEventListener('change', persist)
wrapEl.addEventListener('change', persist)
confirmClearEl.addEventListener('change', persist)
hideOnBlurEl.addEventListener('change', persist)

hotkeyEl.addEventListener('focus', () => {
  capturingHotkey = true
  hotkeyEl.value = 'Нажмите сочетание…'
})
hotkeyEl.addEventListener('blur', () => {
  capturingHotkey = false
  hotkeyEl.value = settings.hotkey
})

editor.addEventListener('mousedown', closeOverlays)
editor.addEventListener('input', queueSave)
editor.addEventListener('paste', (e) => {
  e.preventDefault()
  insertPlain(e.clipboardData.getData('text/plain') || '')
})

window.addEventListener('keydown', (e) => {
  if (capturingHotkey) {
    e.preventDefault()
    const accel = toAccel(e)
    if (!accel) return
    window.api.setHotkey(accel).then((res) => {
      if (res.ok) {
        settings.hotkey = accel
        hotkeyEl.value = accel
        say('Хоткей: ' + accel)
      } else {
        hotkeyEl.value = settings.hotkey
        say(res.error, true)
      }
      hotkeyEl.blur()
    })
    return
  }
  if (e.key === 'Escape') {
    if (!confirmEl.hidden || !panel.hidden) {
      closeOverlays()
      editor.focus()
      return
    }
    flush()
    window.api.hide()
    return
  }
  const ctrl = e.ctrlKey && !e.metaKey
  if (ctrl && e.shiftKey && e.key === 'Delete') { e.preventDefault(); askClear() }
  else if (ctrl && e.shiftKey && (e.key === 'C' || e.key === 'c')) { e.preventDefault(); copyAll() }
  else if (ctrl && e.shiftKey && (e.key === 'V' || e.key === 'v')) { e.preventDefault(); pasteReplace() }
  else if (ctrl && (e.key === 's' || e.key === 'S')) { e.preventDefault(); saveAs() }
  else if (ctrl && (e.key === 'o' || e.key === 'O')) { e.preventDefault(); openFile() }
  else if (ctrl && (e.key === 'w' || e.key === 'W')) { e.preventDefault(); flush(); window.api.hide() }
})

window.api.onFocus(() => {
  editor.focus()
})
window.api.onFlush(flush)
window.api.onTheme(applyTheme)

window.api.init().then((state) => {
  setIcons(state.icons)
  applyTheme(state.dark)
  settings = state.settings
  editor.value = state.draft || ''
  applySettings()
  stats(editor.value)
  editor.focus()
})
