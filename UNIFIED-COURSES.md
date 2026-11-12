# Shared learning path

All three courses use the same course screen, lesson screen, puzzle generator,
draft format and recall scheduler. Russian is the instruction language. Language
selection changes the course data, not the implementation of these screens.

- `src/courses/model.ts`: language-independent contracts and orthography rules.
- `catalog.ts`: course registration; counts derive from data.
- `buryat.ts`: adapter for the existing bundled 31-lesson Buryat curriculum;
  keeps slugs and translations, no second hand-maintained vocabulary list.
- `engine.ts`: common board/selection logic; version 1 and 2 kept for old drafts.
- `progress.ts`: account/course-scoped completions, additive API sync.
- `legacyProgress.ts`: read-only bridge from Buryat offline stars and server
  campaign overview; only known completed lesson slugs are imported.
- `review.ts`: one local schedule per word/account/course, including repeated
  Buryat vocabulary across lessons. Existing Czech/English IDs are unchanged.

Learning sequence: words and Russian explanations → puzzle → optional typed
recall → scheduled reviews. Completing a puzzle means completing practice, not
proven mastery. It does not award ranked XP or old campaign stars.

## Compatibility and rollout

Deploy the matching API first: `/courses/bua-ru/progress` accepts the 31 known
slugs in addition to the existing Czech/English endpoints. Server validation is
per course; its collection remains `language_course_progress`. No DB rewrite is
needed. Old clients remain compatible. No legacy progress is deleted or modified.

The Buryat classic menu, ranked modes, textbook and workshop remain available
through an explicit button. They are **not** yet converted to multilingual
content. Old unfinished classic sessions are resumed there, not transformed into
new randomly generated boards. Dynamically downloaded extra campaign lessons
also remain in the classic mode. The shared Buryat course uses the bundled
curriculum snapshot; it does not silently import unvalidated new content.

Completions sync to the account. Drafts and review schedules remain device-local
for all languages, as before. Guest progress is not claimed by a later login.

Rollback: restore frontend/API images, retaining all DB volumes and scoped local
keys. Old Buryat stars and Czech/English saves remain usable.

## Next boundary

Before removing the classic engine, adapt ranked-session validation, curated
maps, chapter unlocking, audio and editorial content to course-scoped contracts.
Do not relabel an unvalidated local practice completion as a server-ranked win.
New languages require content, orthography and server curriculum registration,
not copies of the game screens.
