# Isolated Android test app

Use manual `Android Release (signed) + Telegram` with `test_server=true` and `publish_telegram=false`.

- Application ID `ru.burlive.app.test`, launcher name `Burlive Test`, separate private app data and deep-link scheme. Production defaults remain `ru.burlive.app` / legacy API.
- Embedded offline gameplay is retained. Workshop offers explicit server login/registration using the existing auth UI. Signed-in Android profiles use `/auth/me`; local-only profiles remain local.
- Test API is `https://fillword.31.76.83.11.sslip.io/api`, a separate database. Existing production credentials/data are not migrated.
- Firebase push registration is disabled for this separate test package; the production Firebase client is not reused.
- Test APK/OTA checks are disabled, preventing production updates from switching the test install back to the legacy backend.
- No Play upload or Telegram broadcast. Installation alongside production does not migrate local progress.

Verification: regression tests distinguish missing session from disconnected network, assert real profile lookup and successful login callback. HTTPS smoke on isolated disposable user covers registration, keeper membership, profile and token refresh. Android WebView origin `https://localhost` is permitted by the test API CORS policy. No browser/device visual testing.
