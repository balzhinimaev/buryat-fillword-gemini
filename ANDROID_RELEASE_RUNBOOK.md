# Android Release Runbook (Burlive)

Короткий операционный гайд: как выпускать APK/AAB без участия LLM.

## 1) Что уже настроено

### Debug pipeline
- Workflow: `.github/workflows/android-apk-telegram.yml`
- Что делает:
  - всегда собирает `debug APK`
  - всегда кладёт artifact в GitHub Actions
  - в Telegram отправляет только:
    - nightly schedule
    - manual run с `publish_telegram=true`
  - push в `master` → **artifact only** (без спама в канал)

### Signed release pipeline
- Workflow: `.github/workflows/android-release-telegram.yml`
- Что делает:
  - собирает **signed** `APK + AAB`
  - кладёт оба файла в artifact
  - отправляет релизное сообщение + signed APK в Telegram канал
  - применяет версионирование, пригодное для Google Play

---

## 2) Обязательные GitHub Secrets

### Telegram
- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_CHAT_ID` (основной релизный канал)
- `TELEGRAM_THREAD_ID` (опционально)
- `TELEGRAM_CHAT_ID_INTERNAL` (рекомендуется для debug/nightly)
- `TELEGRAM_THREAD_ID_INTERNAL` (опционально)

### Signing (только для signed release)
- `ANDROID_KEYSTORE_B64`
- `ANDROID_KEYSTORE_PASSWORD`
- `ANDROID_KEY_ALIAS`
- `ANDROID_KEY_PASSWORD`

---

## 3) Как выпустить DEBUG APK

### Вариант A — вручную
1. GitHub → Actions → `Android Debug APK (artifact + optional Telegram)`
2. Run workflow
3. Параметры:
   - `release_label` (опционально)
   - `publish_telegram=true|false`

### Вариант B — автоматически
- push в `master` → сборка + artifact (без Telegram)
- nightly schedule (UTC) → сборка + отправка в внутренний Telegram канал

Результат: APK всегда в Artifacts; в Telegram отправляется по правилу выше.

---

## 4) Как выпустить SIGNED RELEASE (APK + AAB)

### Вариант A — вручную (рекомендуется)
1. GitHub → Actions → `Android Release (signed) + Telegram`
2. Run workflow
3. Опц. поля:
   - `release_label` (пример: `release-v1.2.3`)
   - `version_code` (целое число, уникальное)

### Вариант B — по тегу
```bash
git tag release-v1.2.3
git push origin release-v1.2.3
```

Результат:
- signed APK в Telegram
- signed APK + AAB в Artifacts

---

## 5) Политика версий (важно для Google Play)

- `versionName` — человекочитаемая версия (пример: `1.2.3`)
- `versionCode` — целое число, которое для каждого нового релиза должно **строго расти**

В workflow реализовано:
- если релиз идёт по тегу `release-vX.Y.Z`, то `versionName = X.Y.Z`
- по умолчанию `versionCode = YYDDDHHMM` (UTC), например `2606011520`
- можно вручную передать `version_code`, если нужен override
- workflow валидирует диапазон `1..2100000000`

Если Play отклоняет релиз по причине version code:
- запусти workflow ещё раз с большим `version_code`

---

## 6) Проверка после релиза

Проверить в workflow run:
- шаг `Build signed release APK + AAB` = success
- шаг `Send release APK to Telegram` = success

Проверить в Telegram:
- есть релизное сообщение
- есть APK файл

Проверить в Artifacts:
- `burlive-<release>-<sha>.apk`
- `burlive-<release>-<sha>.aab`

---

## 7) Быстрый rollback

Если релиз неудачный:
1. Не использовать проблемный APK/AAB
2. Запустить workflow заново с новым `release_label`
3. Убедиться, что `version_code` увеличен

---

## 8) Ключ подписи (критично)

- Keystore нельзя терять.
- Хранить минимум в 2 независимых местах.
- При утрате keystore обновлять приложение тем же package id будет невозможно.

---

## 9) Частые проблемы

### `Build debug/release APK` failed
- проверить Java (pipeline уже на JDK 21)
- проверить Android SDK step
- открыть failed logs job

### Telegram step failed
- проверить `TELEGRAM_BOT_TOKEN`
- проверить `TELEGRAM_CHAT_ID` (для канала обычно `-100...`)
- убедиться, что бот имеет доступ к каналу

### Signed release failed
- проверить 4 signing secrets
- проверить целостность `ANDROID_KEYSTORE_B64`
- проверить alias/password
