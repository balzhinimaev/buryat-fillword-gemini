# Verified releases (2026-10-23)

Node 24 is used in CI and Docker. Pull requests run the quality gate. A master
push builds and publishes `ghcr.io/OWNER/REPOSITORY:COMMIT_SHA` only after that
gate passes. `latest` is no longer deployed independently of tests.

The former automatic SSH deployment is paused: the legacy VPS is unreachable
from the current host and the bot's last deploy failed SSH authentication.
There is no automatic database rename, environment replacement, rsync deletion,
or Telegram announcement during a merge. Restore deployment only after access,
existing Compose project/volumes, environment and a database backup are verified.

Deploy the immutable image SHA, preserve the existing environment/DB target,
record the previous image for rollback, then check readiness before switching
traffic. Never apply an empty Compose database volume as a production migration.

## Build profiles
`npm run build:web` forces online mode and defaults to same-origin `/api`.
`npm run build:android` bundles offline content and defaults to
`https://buryat-game.ru/api`. Override `VITE_API_URL` for another verified server.
`release.json` owns app version; CI passes the same metadata to Vite and Gradle.
Android builds produce artifacts by default, without Telegram delivery.
Configure `VITE_VK_CLIENT_ID` and an authorized `VITE_VK_REDIRECT_URI` together
with the corresponding API credentials before enabling VK login.
The static image proxies API and audio through `API_UPSTREAM` (default api:3000).

When behind another reverse proxy, set `TRUSTED_PROXY_CIDR` to that proxy network
only (default loopback). Client IP is then passed as a single trusted hop to API.
