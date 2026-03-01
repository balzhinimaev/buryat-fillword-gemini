# Android Release Runbook (Burlive)

Короткий операционный гайд: как выпускать APK/AAB без участия LLM.

## 1) Что уже настроено

### Debug pipeline
- Workflow: `.github/workflows/android-apk-telegram.yml`
- Что делает:
  - собирает `debug APK`
  - кладёт artifact в GitHub Actions
  - отправляет сообщение + APK в Telegram канал

### Signed release pipeline
- Workflow: `.github/workflows/android-release-telegram.yml`
- Что делает:
  - собирает **signed** `APK + AAB`
  - кладёт оба файла в artifact
  - отправляет релизное сообщение + signed APK в Telegram канал

---

## 2) Обязательные GitHub Secrets

### Telegram
- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_CHAT_ID`
- `TELEGRAM_THREAD_ID` (опционально)

### Signing (только для signed release)
- `ANDROID_KEYSTORE_B64`
- `ANDROID_KEYSTORE_PASSWORD`
- `ANDROID_KEY_ALIAS`
- `ANDROID_KEY_PASSWORD`

---

## 3) Как выпустить DEBUG APK

### Вариант A — вручную
1. GitHub → Actions → `Android APK Build & Telegram Release`
2. Run workflow (опц. `release_label`)

### Вариант B — тег
```bash
git tag v1.2.3
git push origin v1.2.3
```

Результат: APK уйдёт в Telegram + появится в Artifacts.

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

## 5) Проверка после релиза

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

## 6) Быстрый rollback

Если релиз неудачный:
1. Не использовать проблемный APK/AAB
2. Запустить workflow заново с новым `release_label`
3. Убедиться, что `version_code` увеличен

---

## 7) Ключ подписи (критично)

- Keystore нельзя терять.
- Хранить минимум в 2 независимых местах.
- При утрате keystore обновлять приложение тем же package id будет невозможно.

---

## 8) Частые проблемы

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
