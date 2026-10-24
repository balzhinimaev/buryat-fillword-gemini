# Progress storage and synchronization (1.14.5)

Learning data uses `<previous-key>:v2:<JWT sub>` (or `:guest`). The upgrade pins
legacy data to the account present at the first read/account transition. The
original key remains as a rollback backup; later accounts cannot claim it.
Guest achievements are not silently transferred to a signed-in account.

Game state is remounted on account changes. Token refresh, request responses,
prefetch handoffs and background merges are bound to their original account.
Campaign sync merges into fresh state after the request, so a round completed
in the meantime is not overwritten.

Textbook milestones are written locally before upload. Pending markers persist
across restarts; reconnect, app start and a 30-second foreground interval retry
them. Acknowledgements clear only the exact marker sent. Legacy completions are
reconciled once. Pull restores theory/quiz dates and best scores, without
regressing local results. Unmarking theory is a local review preference; it does
not erase the server's historical completion or award XP again.

The API's imported campaign records are personal learning progress, not ranked
scores. Existing historical records are not deleted by this update. Textbook
answer checks validate known content but are not a human anti-bot challenge.

Known boundary: this queue covers textbook milestones, not interrupted unfinished
online game rounds. Offline campaign progress remains local-first and syncs
separately. The Android release still targets the configured production API;
the inaccessible legacy production host has not been switched to the test DB.
