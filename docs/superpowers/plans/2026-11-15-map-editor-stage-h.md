# Map Editor Stage H Implementation Plan

> **For agentic workers:** follow the repo's existing Stage E conventions; do not commit or push during this task.

**Goal:** Import `.dd2vtt` and `.uvtt` files into the campaign map editor with validated background, grid scale, walls, and doors.

**Architecture:** Add a pure UVTT parser and geometry converter under `lib/utils/battle/uvtt`. The editor accepts a local JSON file, applies a validated import as one draft update, then uses the existing map save/background persistence flow. Import does not contact Storage itself; background persistence happens only if a user later presses the existing Save button.

**Files:**
- `lib/utils/battle/uvtt/*`: format parsing, limits, PPI dimensions, LOS/portal conversion.
- `lib/utils/battle/uvtt/__tests__/*`: malformed input, bounds, geometry and conversion tests.
- `lib/hooks/battles/setup/useBattleMapEditor.ts`: atomic draft replacement action.
- `components/maps/MapEditorScreen.tsx`: file picker, import feedback, apply parsed draft.
- `components/maps/__tests__/MapEditorScreen.test.tsx`: integration route coverage.
- `messages/{en,uk}/maps.json`: import control and readable errors.
- `docs/STATUS.md` and this plan/spec: executed scope and deferred environment checks.

**Tasks:**
1. [x] Add failing unit tests for format/size validation, PPI-derived map dimensions, LOS edge conversion, and portal doors.
2. [x] Implement parser and geometry conversion without dependencies; validate structure, base64 image, dimensions, edge/door limits, and reject unsupported geometry clearly.
3. [x] Add an atomic editor action that replaces map dimensions/background/edges/doors while retaining editor name and save workflow.
4. [x] Add `.dd2vtt`/`.uvtt` file selection and readable validation errors; do not auto-save or upload.
5. [x] Add editor integration test for importing a file into the draft without saving.
6. [x] Run requested target tests, TypeScript, changed-file ESLint, and local checks; inspect `data-fx-grid` and CTM coordinate conversion for unchanged diffs.
7. [x] Update Stage H status and spec with completed work and environment/storage/browser limitations.

**Constraints:** Preserve all existing uncommitted F/G work. No migrations, production scenarios, remote Storage uploads, commits, pushes, worktrees, or unrelated prompt/assets changes. Keep `data-fx-grid` and CTM coordinate transforms unchanged.
