# Scratchpad (Черновик)

Лёгкий блокнот в системном трее для Windows 10. Окно без рамки, без панели задач, поверх других окон. Один экземпляр (`requestSingleInstanceLock`).

Стек: Electron 45, ванильный JS (без TypeScript, без Vue/сборщика UI). UI — HTML/CSS в renderer.

## Структура

- `src/main.js` — процесс Electron: окно, трей, хоткей, файлы, IPC
- `src/preload.js` — `contextBridge` → `window.api`
- `src/renderer/` — `index.html`, `renderer.js`, `styles.css`
- `scripts/icons.js` — копирует Lucide SVG и собирает png/ico в `assets/`
- `assets/` — иконки приложения, трея и кнопок (кнопки: `assets/icons/*.svg`)

## Поведение

- Старт: окно скрыто. Показ: глобальный хоткей (по умолчанию `Control+Alt+Space`), клик по трею, повторный запуск exe.
- Закрытие крестиком / `Esc` / `Ctrl+W` / кнопка минус — скрытие, не выход. Выход только из меню трея.
- Текст живёт в `%APPDATA%/scratchpad/draft.txt` (у Electron `userData`). Автосейв ~400 мс и синхронно перед скрытием (`draft:saveSync`).
- Настройки — `settings.json` рядом: `fontSize`, `wrap`, `confirmClear`, `hideOnBlur`, `hotkey`, `bounds`.
- Тема следует за Windows (`nativeTheme`). Трей: светлая иконка на тёмном, тёмная на светлом.
- Вставка в редактор — только plain text.
- UI компактный: шапка 30px, футер 22px, кнопки ~26×24.

IPC: `init`, `draft:save` / `draft:saveSync`, `settings:save`, `hotkey:set`, `file:save` / `file:open`, `clipboard:read` / `clipboard:write`, `window:hide`. События в renderer: `focus-editor`, `flush-draft`, `theme`.

## Команды

```
npm start          # electron .
npm run icons      # lucide → assets (нужен node_modules)
npm run dist       # NSIS + portable в dist/, не гонять для обычной проверки
```

Не запускать `npm run dist` / полный build ради проверки UI.

## Правки

- Код короткий, без лишней абстракции. Не растягивать файлы.
- SVG path в `assets/icons` не править вручную — менять набор имён в `scripts/icons.js` и `loadUiIcons()` в `main.js`, затем `npm run icons`.
- Интерфейс: мало места, тёмная/светлая палитра уже в CSS-переменных.
- Коммиты по запросу, сообщения на русском.
