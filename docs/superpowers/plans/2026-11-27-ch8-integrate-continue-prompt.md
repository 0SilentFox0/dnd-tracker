# Prompt for a new session: finish the integration of feat/game-ui-ch8 with origin/main, then wave 3

Model: Opus for conflict decisions and the final review; Sonnet for mechanical fixes. Context budget ~150k: stop and hand off when reached.

Read first: CLAUDE.md; memory project-ch8-wave1, project-ch8-wave2, project-game-ui-ch8, feedback-tests-premerge-only, feedback-browser-live-check, feedback-shared-checkout; the original plan docs/superpowers/plans/2026-11-27-ch8-integrate-codex-prompt.md (steps 4-8 still apply).

## State (2026-11-27)

- Worktree `../dnd-tracker-ch8-int`, branch `integrate/ch8-codex`, merge commit a948d99f3 (origin/main cd5701cd6 merged into feat/game-ui-ch8 b0cdaa187). Not pushed. Main folder `../dnd-tracker` is on feat/ops-vercel-pro: do not touch.
- node_modules in the worktree is a real `pnpm install --frozen-lockfile` (main added @vercel/analytics).
- Decision (owner approved): on shared screens the BASE is origin/main («Кодекс»). All 122 conflicts were resolved by taking origin/main wholesale (content-import, campaigns, characters, units, spells, rules, artifacts, systems, hud, lib hooks/utils). Messages: union of keys, main values on shared keys.
- Lost from Ч8 wave 0-1 on purpose: HudFormPage `width="page"` + sticky actions bar + `HudFormPreviewButton`, `HudSegmentedOption.ariaLabel`, our FileDropZone API (`onFiles`/`multiple`), our rules-book (`components/rules/book/*`), banner/identity files, `useRulesSection` lib hook, `footerSlot` in the import dialog. BattleSetupForm now uses `header={{...}}` + `className="max-w-page"`; SideToggle uses sr-only labels.
- Deleted obsolete tests of our API: useCompendiumWizardView.test, useRulesForm-dirty.test, ArtifactSetForm.test (heading prop); FeatForm.test restored from main.
- Gate status: `tsc --noEmit` is CLEAN. `pnpm cycles` and `pnpm lint:dirs --changed origin/main` were started but the result was lost: rerun them.

## Remaining (sequential, not parallel; kill any process >5 min without progress)

1. `pnpm cycles`; `pnpm lint:dirs --changed origin/main` (fix: unused exports like UNIT_FORM_ID/SPELL_FORM_ID/ARTIFACT_FORM_ID, dead orphans, duplicate imports).
2. Check orphans/regressions the agents flagged: `components/rules/NumberField.tsx` uses `ds-setting-row` and RulesForm uses `hud-wide-side` (not in main css); `systems/*/rules/sections.ts` vs RulesForm of main; wave-2 files importing old lib symbols (ReferenceRef, alignmentKeyOf, usePreviewDeadline...) — tsc is clean so likely none; check Ч8-only files that still use removed classes (`hud-wide-body`, `--hud-form-footer-h`).
3. Full `pnpm test:run` (first for the whole of Ч8: expect red tests from waves 0-2 written without running; fix in Sonnet batches per folder; ratchet tests too: props-budget, raw-controls, cyrillic-comments, i18n-exempt, route-budgets, system-*; regenerate ratchets only if they shrink). i18n key test will show MISSING keys from wave-2 files.
4. Live run (step 5 of the original prompt): `NODE_OPTIONS=--max-old-space-size=10000 pnpm build:local`; migrate deploy on `ch8_live` (DATABASE_URL=DIRECT_URL=postgresql://postgres:postgres@localhost:54322/ch8_live); `RATE_LIMIT_ALLOW_MEMORY=1 next start -p 3100`; Sonnet agent checks conflicted screens (library forms, /info, rules, hero «Основне», import) + wave 2 (battles list, create, map) at 1280/390, tavern+parchment, console, 5xx, MISSING_MESSAGE, hscroll.
5. Opus review of the conflict decisions only; confirm that nothing wave-2 needs from the lost wave-0-1 frame is broken (sticky action bar on the battle setup form on mobile!).
6. Merge: feat/game-ui-ch8 <- integrate/ch8-codex (ff); then main in a temporary worktree; `git push origin main` only with green gates and a passed live run; no force. Check `git diff origin/main --stat -- prisma` (migrations deploy with prod, warn the owner). Do not delete the Ч8 spec/plan.
7. After push: update memory (project-ch8-wave1/2: integrated into main <sha>), write STATUS.md, update tip/branch in docs/superpowers/plans/2026-11-27-game-style-ui-ch8-wave3-prompt.md, then start wave 3 from that prompt (or hand off if context ~150k).
