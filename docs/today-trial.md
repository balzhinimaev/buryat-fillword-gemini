# Today and trial lesson — 1.14.6

- Ordinary startup stays on Today in both web and offline Android. Explicit daily/module/resume links retain precedence.
- Primary action: interactive tutorial for a new player, saved campaign if present, first unfinished textbook lesson (partially completed first), or mode selection after completing the course.
- Course progress refreshes after textbook synchronization. A failed overview request does not block local lessons or navigation.
- Existing mistake-review quiz is reachable from Today; it retains the existing account-scoped persistence.
- All game modes, daily puzzle, statistics, leaderboard, community, contributions, support, settings, help, news and admin links remain available. Donation restrictions for VK/new users remain intact.
- Guest web trial is loaded on demand from the login screen. It does not create an account, submit results, grant XP/stars, or import guest achievements. Only the existing device-level tutorial preference is marked locally after explicit completion.
- Native How to play uses the same three-word board. Sequential taps, keyboard activation and captured pointer drags are supported. Pointer cancel, capture loss and backgrounding clear selection. No timer, animated background or automatic question advance.
- Words/translations are existing textbook entries: НАРАН / солнце, УҺАН / вода, ГЭР / дом.

Verification: 133 non-browser tests, lint (no errors; pre-existing App vkLogin dependency warning), web and Android build/size checks. New regression scenarios cover guest trial completion without auth/results writes, retained email, local-only tutorial settings, pointer/tap/keyboard selection and cancellation, saved campaign routing, offline fallback, restored course state and review completion.

No browser/emulator/physical-device QA, per user preference. This release changes the client only: no API/schema migration, historical-score cleanup, legacy production switch or store publication. Android online features retain their configured legacy API endpoint.
