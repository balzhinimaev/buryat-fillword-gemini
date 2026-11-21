# English self-study book — integration, 2026-11-20

## Current snapshot — 2026-11-21

The sections below record the original integration and its first visual refresh. The current source includes the subsequent updates:

- **420 scored exercises:** the original 120 chapter questions, 240 additional chapter exercises and six mixed checks with ten questions each. New practice results are stored separately from the original checks.
- **24 dialogues**, 24 pairs of meaning contrasts (48 examples), and 24 guided speaking/writing tasks with sample answers and self-checks. Translation and model answers are revealed on demand; free-form responses are not automatically graded.
- Compact top navigation and search, collapsible chapter contents, a rules → dialogue → practice route, dialogue bubbles, question navigation and clearer results.
- Course/account access fixes, owner-scoped pending queues with explicit recovery, synchronization race protection and a shared guarded audio-upload path. Existing learning progress remains separate by course and account.
- The web edition at <https://buryat-game.ru/webapp/> was updated on 2026-11-20 with the same learning content and UI as the latest sideload APK. That frontend-only deployment did not replace the API or database.
- Story posters are archived in [marketing/english-stories](marketing/english-stories/README.md), including an A1–B2 topic roadmap. These labels indicate approximate topic difficulty, not measured proficiency or certification.

The UI release passed 324 automated tests, TypeScript/build checks and the bundle budget. Physical Android and browser visual QA were not performed. Book progress remains local to the current device/browser; no cross-device synchronization is promised. APK signing keys, binaries, local environments and deployment backups are not included in source control.

## Delivered content

The English course now opens a real book from **Учиться / Самоучитель**:

- 24 complete chapters with 120 addressable topic sections (not 120 standalone lessons).
- 15 reference tables, including 59 common irregular verbs.
- 120 grammar/reading questions: 72 multiple choice, 24 typed answers and 24 token-order tasks.
- Russian explanations, original English examples with translations, two common mistakes and an independent speaking/writing task per chapter.
- Full-text search across chapter content and reference tables, all chapters unlocked.
- Chapter bookmarks, remembered reading section, reader font sizes 16–22px, previous/next and contents navigation.
- Explicit read marker, separate best/latest quiz result, 80% quiz threshold and a filter for chapters with latest mistakes.
- Existing 8 lexical lessons remain under **Практика слов**, with links from relevant chapters. Their IDs, word quizzes and game progress are unchanged.

The initial design proposed 120 separate short lessons. The integrated edition groups the same broad subject areas into 24 substantial chapters, each with five topics and a chapter-level check. It does not present empty placeholders as completed lessons. The CEFR labels describe approximate topic complexity, not a validated CEFR course or certification.

## Architecture

- Data: `src/data/books/en-ru/{foundations,development,advanced,reference}.ts`.
- Schema/answer comparison: `src/learning/book/model.ts`.
- Reader/home/practice: `src/learning/book/`.
- `App.tsx`: English `textbook` route loads a dedicated lazy book screen; `bookChapter` route reads a selected chapter. Other courses keep the previous textbook screen.
- `gameStore.ts` adds chapter navigation without growing history on next/previous.
- Course catalog and English home card describe the book; no book data in the main application chunk.
- No added packages, API endpoints, database changes or external content requests are required to read the book.

## Progress and compatibility

Storage key: `course:en-ru:self-study-book:v1:v2:<owner>`, using existing owner-key helpers. Reading does not pass a test; a passed test does not mark reading. A worse retry retains the best score but records the latest errors. Account changes remount the quiz to prevent an unfinished attempt from leaking into another account. Removing browser data clears progress; storage failures retain only session-memory progress and display a notice.

Existing `burlive_textbook_progress` keys are neither imported nor modified. The new book has local progress only; no cross-device synchronization promise. Existing web/Telegram authorization and runtime configuration are unchanged.

## Verification

- 22 new tests pass: content IDs and completeness, reference dimensions, answer validity/token reconstruction, option position diversity, normalization, owner/course/legacy isolation, corrupt/unavailable storage, explicit clearing, account changes, search, bookmarks, font size, reader resume, back/next navigation, linked vocabulary lessons, error filters and all three exercise types.
- 77 existing related tests passed: courses/original engine, textbook, account-scoped storage and main menu.
- Scoped ESLint passes. The pre-existing `App.tsx` hook dependency warning remains unrelated.
- TypeScript and web production build pass; main-bundle budget remains under 400 KiB JS / 160 KiB CSS.
- Browser/visual testing was not performed. Automated UI tests use jsdom; they are not a phone rendering check.
- Content is original authored instructional material, not an independent teacher-reviewed textbook. Free writing, speaking and pronunciation are not automatically scored.

## Deployment

The existing frontend-only deployment was updated after the checks: https://buryat-game.ru/webapp/ , image `buryat-fillword-frontend:english-book-20261120`. Public entry and five critical assets byte-match the tested build; frontend, API and MongoDB are healthy. Its runtime auth-mode mount is preserved. API, MongoDB, audio volumes and other applications are not recreated. Release artifact logs and rollback metadata are stored at workspace `artifacts/fillword-english-book-20261120/`.

No Git push, Android APK publication or unrelated service deployment is part of this integration.


## Editorial visual refresh — 2026-11-20

- New typographic cover with a CSS book illustration, clear start/resume action and content counts.
- Three sequential chapter parts; two-column cards in wide layouts and a single column in the actual narrow app panel. Reading and verification progress remain separate.
- Selected/current/bookmarked/review states, quieter search/navigation, numbered reference disclosures and consistent spacing.
- Reader masthead, current-section navigation, comfortable reading measure, serif English examples, striped semantic tables, explicit wrong/right examples and a dedicated speaking task.
- Practice selection states, completion meter, illustrated feedback and retry panel. No scoring or persistence changes.
- Distinct light, steppe and dark palettes; reduced-motion handling, visible keyboard focus, 44px controls and local horizontal table scrolling.
- Layout uses the book container width, not just the browser viewport, because Telegram desktop constrains its app panel. A viewport fallback is retained for older WebViews.

Verification: existing 22 book tests passed; scoped ESLint and production build passed. 42 text/background palette pairs meet 4.5:1 contrast (minimum 4.57:1). Browser/phone visual QA was not performed, per the existing user preference. No new dependencies, external assets, content changes or storage migration. Release evidence is in `artifacts/fillword-english-book-visual-20261120/`.


Visual refresh deployed to https://buryat-game.ru/webapp/ as `buryat-fillword-frontend:english-book-visual-20261120`. Entry `index-BYO2lQxG.js`, book `EnglishBookScreen-Dns0NBi_.js`. Public bytes and runtime auth verified; frontend healthy; API and MongoDB containers not restarted. Previous image retained for rollback. Final main JS 392.75 KiB / CSS 118.16 KiB.
