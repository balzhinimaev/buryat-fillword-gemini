# Buryat Fillword Frontend

Фронтенд Telegram Mini App для игры в бурятский филворд.

## Архитектура

- **Frontend:** этот репозиторий (`buryat-fillword-gemini`)
- **Backend API:** отдельный сервис (`buryat-fillword-api`)
- Локально backend обычно работает на `http://localhost:3000`

> Легаси-папка `api/` в этом репозитории удалена. Встроенного backend здесь больше нет.

## Требования

- Node.js 22+
- npm 10+

## Быстрый старт

```bash
npm install
cp .env.example .env
npm run dev
```

Приложение поднимется через Vite.

## Переменные окружения

- `VITE_API_URL` — базовый URL backend API (без завершающего `/`)

Пример для локальной разработки:

```env
VITE_API_URL=http://localhost:3000
```

Пример для прода:

```env
VITE_API_URL=https://burlive.ru/api
```

## Скрипты

- `npm run dev` — запуск в dev-режиме
- `npm run build` — production build
- `npm run preview` — предпросмотр build
- `npm run lint` — линтер

## Примечание по API

Фронт ходит в API через `src/services/api.ts` и использует `VITE_API_URL`.
Если переменная не задана, используется fallback, заданный в коде.
