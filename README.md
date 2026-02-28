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

### Для Android (Capacitor)

- Android Studio (последняя стабильная)
- Android SDK Platform 34+
- JDK 17
- Android device / эмулятор для теста APK

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
- `npm run android:sync` — синхронизировать web-проект в Android shell
- `npm run android:open` — открыть Android проект в Android Studio
- `npm run android:build:debug` — собрать debug APK (`android/app/build/outputs/apk/debug`)
- `npm run android:build:release` — собрать release APK (`android/app/build/outputs/apk/release`)

## Android APK (Capacitor)

В репозитории добавлен Android shell (`/android`) через Capacitor.

- `appId`: `ru.burlive.app`
- `appName`: `Burlive`
- URL в APK: `https://burlive.ru/webapp/`

### Быстрый цикл для Android

```bash
npm install
npm run build
npm run android:sync
npm run android:open
```

Дальше в Android Studio:
1. Подключить устройство/эмулятор
2. Запустить `app` (debug)
3. Для релиза использовать `Build > Generate Signed Bundle / APK`

> Важно: перед публикацией в стор зафиксируйте release keystore и храните его отдельно от репозитория.

### Push (Firebase FCM) — Android

- В проекте используется plugin `@capacitor/push-notifications`.
- Файл `android/app/google-services.json` должен соответствовать `applicationId` (`ru.burlive.app`).
- После изменения firebase-конфига обязательно выполнить:

```bash
npm run android:sync
```

Клиентское поведение:
- permission запрашивается только в нативном Android-приложении,
- после успешного login FCM token отправляется в backend (`/push/devices/register`),
- при logout токен отзывается (`/push/devices/unregister`).

## Примечание по API

Фронт ходит в API через `src/services/api.ts` и использует `VITE_API_URL`.
Если переменная не задана, используется fallback, заданный в коде.
