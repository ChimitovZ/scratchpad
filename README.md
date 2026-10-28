# Черновик

Лёгкий блокнот-черновик в системном трее для Windows 10.

## Запуск из исходников

```powershell
cd $env:USERPROFILE\Projects\scratchpad
npm install
npm run icons
npm start
```

## Сборка установщика и portable

```powershell
cd $env:USERPROFILE\Projects\scratchpad
npm run dist
```

Готовые файлы появятся в папке `dist`: NSIS-установщик и `Scratchpad-portable.exe`.

## Управление

| Действие | Клавиши |
| --- | --- |
| Показать / скрыть | `Ctrl+Alt+Space` (можно сменить) |
| Скрыть | `Esc`, `Ctrl+W` |
| Сохранить как… | `Ctrl+S` |
| Открыть файл | `Ctrl+O` |
| Копировать всё | `Ctrl+Shift+C` |
| Вставить и заменить | `Ctrl+Shift+V` |
| Очистить | `Ctrl+Shift+Delete` |

Левый клик по иконке в трее показывает или скрывает окно. Правый клик — меню (показать, автозапуск, выход).
