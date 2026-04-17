# Мой Капитал — готовые файлы для GitHub Pages

Этот пакет предназначен для замены файлов в репозитории GitHub Pages.

Что внутри:
- `assets/` — собранные JS/CSS/изображения
- `index.html` — готовая production-страница
- `manifest.json` — PWA-манифест
- `sw.js` — service worker для кэша и офлайн-старта
- `icon-180.png`, `icon-192.png`, `icon-512.png`, `icon-source.png`, `icon.svg` — иконки приложения

Как заменить:
1. Удали старую папку `assets` в репозитории.
2. Загрузи из этого архива новую папку `assets`.
3. Замени в корне репозитория файлы `index.html`, `manifest.json`, `sw.js`, `README.md` и все `icon-*`.
4. Сделай commit и подожди публикацию GitHub Pages.

Если после обновления откроется старая версия, очисти кэш сайта или сделай hard refresh, потому что браузер может держать старый service worker.
