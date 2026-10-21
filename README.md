# Мой Капитал

Mobile-first финансовый коуч, а не обычный финтрекер.

Главная идея продукта:
- сначала платить себе;
- растить капитал через дерево;
- снижать главную долговую нагрузку;
- показывать не только цифры, а следующее лучшее действие.

## Что есть в проекте

- `Home` как главный экран действия
- дерево как главный визуальный индикатор роста
- стратегия долгов и приоритетный долг
- safe payment / suggested payment
- onboarding стартовой базы
- доход / расход / перевод / оплата долга / откат
- backup / import / export
- PIN / lock

## Стек

- React 19
- Vite
- Zustand
- Tailwind CSS
- Framer Motion

## Запуск локально

```bash
npm install
npm run dev
```

Preview production build:

```bash
npm run build
npm run preview
```

Тесты:

```bash
npm test
```

Полная проверка:

```bash
npm run verify
```

## Что загружать в GitHub

Загружай в репозиторий только это:

- `src/`
- `public/`
- `tests/`
- `index.html`
- `package.json`
- `package-lock.json`
- `vite.config.js`
- `tailwind.config.js`
- `postcss.config.js`
- `.gitignore`
- `README.md`
- `RELEASE_CHECKLIST.md`

## Что не загружать

Не загружай:

- `node_modules/`
- `dist/`
- `*.log`
- локальные временные файлы

`.gitignore` уже добавлен в проект и это закрывает основной мусор.

## Публикация в уже созданный GitHub-репозиторий

Если загружаешь через веб-интерфейс GitHub, просто добавь перечисленные выше файлы и папки в существующий репозиторий.

Если загружаешь через git:

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/USERNAME/REPOSITORY.git
git push -u origin main
```
