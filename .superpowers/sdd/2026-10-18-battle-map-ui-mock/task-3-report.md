# Task 3 report

Status: DONE (commit 8c4d5125).

TDD: test file written first, run failed (module missing); after implementation 6/6 pass (two fixes were test bugs: cellKey separator is ":" and nextTurn also logs).
Checks: tsc clean; lint 0 errors/warnings; full test:run 448 files / 2695 tests pass (one earlier run had 2 transient failures while lint ran in parallel; rerun clean).

Manual check: dev server started on :3123, ready in 2.3s; /dev/battle-map returned 307 -> /sign-in (auth). Page could not be compiled/viewed without a session, so visuals (background, grid, tokens, hex redraw) are NOT visually verified. Server killed.

Files: app/dev/battle-map/page.tsx; components/battle/map/dev/{BattleMapPlayground.tsx,mock-participants.ts}; lib/hooks/battle/useBattleMapPlayground.ts (+barrel export); lib/hooks/battle/__tests__/useBattleMapPlayground.test.ts.

Notes/concerns:
- Hook also returns `active` and `log` (extra to the brief's list).
- Hook imports mock data from components/battle/map/dev (location prescribed by brief).
- Test file has an eslint-disable for no-non-null-assertion.
- Avatars need NEXT_PUBLIC_SUPABASE_URL; otherwise initials.
- Moving: click on own/zero-cost cell is ignored; attack damage fixed at 7.
