# Task 7 report
Files: components/soundboard/{SoundboardPanel,SoundPad,SoundEditDialog,SoundUploader,sound-icon}, lib/hooks/soundboard/useSoundboardKeys.ts, messages/{uk,en}/soundboard.json, core-namespaces + global.d.ts registration, mounts in BattleScreen (desktop corner stack), MobileBattleLayout, show page-client, ScenarioShowDock (expanded body). All DM-only, not readOnly.
Tests: components/soundboard/__tests__ (5), useSoundboardKeys.test (2), scenario-show-dock mock added. Run: 983 passed across soundboard, scenario/play, lib/i18n, battle/scene. tsc grep clean.
Notes: preview = secondary headphone button (no long-press). Pad icons from a static lucide map. Mount-condition for non-DM not unit-tested beyond the existing hosts.

## Fix round 1
- useSoundboardKeys now uses shortcutBlocked(e); tests add Shift and Alt cases.
- SoundUploader: verified, no change needed. translateIssue translates key messages (soundboard.uploadFailed, TRACK_FILE_INVALID via root translator) and returns non-key text unchanged.
- global.d.ts: soundboard import moved to alphabetical position (after skillTree).
- Tests: `pnpm test:run lib/hooks/soundboard/__tests__/useSoundboardKeys.test.tsx` -> 2 passed. eslint --fix clean.
