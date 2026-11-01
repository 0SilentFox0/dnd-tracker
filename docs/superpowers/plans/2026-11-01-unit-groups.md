# Unit groups implementation plan

> Implement inline with regression checks.

**Goal:** Hide empty unit groups (including races), allow editing group names and images, and default to the first available unit avatar.

**Architecture:** Keep group identity and creature types unchanged. Store per-group presentation overrides in the existing campaign rules JSON under encounters.unitGroups, using the existing authorized rules update path. Race icons remain defaults where present. Group images derive from the unfiltered, display-sorted membership so search does not change them.

**Tech Stack:** React, TypeScript, Zod, TanStack Query, Vitest.

**Spec:** User request in this conversation.

## Constraints and review focus

- No empty race, creature-type or unassigned groups in the list or filter chips.
- Search must not change the default image; skip units without an avatar.
- Edits must survive reload, preserve other groups and encounter settings, and preserve creature types.
- Edit control must work while collapsed without nesting buttons.
- Failed saves must retain the dialog and entered values.

## Tasks

- [x] Update grouping regression tests; observe failures; implement empty filtering and stable avatar fallback. Remove redundant hide-empty toggle.
- [x] Add schema/merge regression tests; observe failures; implement validated group presentation overrides and merge by group key.
- [x] Add page interaction tests; observe failures; implement edit dialog, persistence, and localized labels.
- [x] Run relevant Vitest suites, TypeScript and ESLint checks; inspect diff and report results.

## Verification

- 172 tests passed across 28 relevant files.
- `pnpm exec tsc --noEmit` passed.
- ESLint on changed TypeScript files and `git diff --check` passed.
- Independent review findings addressed: inactive group filters and automatic-image preview.
- Unrelated concurrent edits in `components/units/list/UnitCard.tsx` preserved.
