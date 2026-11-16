# Language courses on the original application

The rejected unified-learning change was reverted in `de87b1c` (API `4923659`).
The original Buryat application is the base, not an optional "classic" mode.

## Shared implementation

`CourseMenu` selects content and renders the original `screens/MainMenu` for
every course. Navigation, textbook, flashcards, quizzes, exam, chapters, stars,
level mode, daily puzzle and `GameScreen` are the existing implementation.
The duplicate simplified course/lesson screen has been removed.

English and Czech are content adapters for the existing local-first services.
Their eight lessons are grouped into two chapters. The original DFS generator
accepts optional alphabet/tokenization rules: Czech CH is one cell; English CH
is two. Buryat curated server maps and existing offline campaign content remain
unchanged, including downloaded additional lessons.

## Data integrity

- Buryat keys, routes, stars and ranked results are unchanged.
- New-course local state is namespaced by course and existing account owner.
- Course choice is pinned for an active app instance. Switching on the home
  screen reloads the app; a different tab cannot redirect an active game's writes.
- Local asynchronous service dispatch checks the account/course after loading.
- Late Buryat textbook responses cannot write into another course.
- Previously completed English/Czech lessons count as completed practice,
  without fabricating quiz passes, stars or XP.
- Existing saved puzzles are reconstructed once using their old versioned
  generator and then played in the original GameScreen. New puzzles use the
  original app generator. Found words and elapsed time remain device-local.
- Existing typed spaced review remains available as a supplementary exercise.

## Deliberate limits

English/Czech completed-lesson flags continue syncing through `/courses/...`.
Their stars, XP, textbook/quiz results, drafts and review schedules are currently
device-local; the home screen states this explicitly. They are not sent to
Buryat ranking, community, dictionary-contribution or textbook-voting routes.
Those Buryat features remain available unchanged when Buryat is selected.
Audio uses the installed language voice where available. No new backend schema,
database migration, new APK, or browser-based QA is part of this change.

## Verification

The full frontend suite plus original-engine integration tests cover original
Buryat navigation, English/Czech textbook routing, drag-play and stars on the
original screen, draft restoration, old course completions, 128 generated maps,
CH handling, per-account/course storage, stale sessions and late responses.
Build and deployment evidence is under workspace
`artifacts/burlive-original-engine-20261116`.
