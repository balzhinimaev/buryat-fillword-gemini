# Buryat Fillword Frontend

Фронтенд Telegram Mini App для игры в бурятский филворд.

> Android release guide: [`ANDROID_RELEASE_RUNBOOK.md`](./ANDROID_RELEASE_RUNBOOK.md)

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
- JDK 21
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
- после завершения онбординга и успешной авторизации FCM token отправляется в backend (`/push/devices/register`),
- при logout токен отзывается (`/push/devices/unregister`).

### CI: APK в Telegram канал

#### 1) Debug APK (быстрые сборки)
Workflow: `.github/workflows/android-apk-telegram.yml`

Триггеры:
- `push` в `master` → сборка + artifact (без Telegram)
- `schedule` nightly (UTC) → сборка + отправка **signed internal APK** в Telegram
- manual `workflow_dispatch` → можно включить/выключить отправку в Telegram

Secrets (для Telegram-отправки):
- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_CHAT_ID_INTERNAL` (рекомендуется для debug/nightly)
- `TELEGRAM_THREAD_ID_INTERNAL` (опционально)
- fallback: `TELEGRAM_CHAT_ID` / `TELEGRAM_THREAD_ID`

Результат:
- на `master` всегда собирается `debug APK` и сохраняется в GitHub Artifact,
- для nightly/manual (с publish=true) в Telegram уходит **signed internal APK** (тот же keystore, обновляется поверх старой версии),
- перед отправкой выполняется preflight `getChat` + проверка chat_id + retry.

#### 2) Signed release APK + AAB
Workflow: `.github/workflows/android-release-telegram.yml`

Триггеры:
- push tag `release-v*` (например `release-v1.2.0`)
- manual `workflow_dispatch` (можно передать `release_label`, `version_name`, `version_code`)

Secrets:
- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_CHAT_ID`
- `TELEGRAM_THREAD_ID` (опционально)
- `ANDROID_KEYSTORE_B64` (base64 содержимое `.jks/.keystore`)
- `ANDROID_KEYSTORE_PASSWORD`
- `ANDROID_KEY_ALIAS`
- `ANDROID_KEY_PASSWORD`

Результат:
- собирается **signed release** `APK + AAB`,
- оба файла сохраняются в GitHub Artifact,
- в Telegram отправляется релизное сообщение + signed APK,
- `versionName`/`versionCode` назначаются автоматически (Play-safe), при необходимости можно переопределить вручную.
- перед отправкой выполняется preflight `getChat` + проверка chat_id + retry.

#### 3) Telegram delivery canary
Workflow: `.github/workflows/telegram-delivery-canary.yml`

Назначение:
- ежедневный health-check Telegram доставки (nightly),
- раннее обнаружение проблем с bot token/chat id до релизной сборки.

## Примечание по API

Фронт ходит в API через `src/services/api.ts` и использует `VITE_API_URL`.
Если переменная не задана, используется fallback, заданный в коде.
