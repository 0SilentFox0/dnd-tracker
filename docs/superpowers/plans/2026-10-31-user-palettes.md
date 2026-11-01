# User Palettes Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Six account-persisted palettes selected in the header, including both spellbooks.
**Architecture:** A shared palette registry, CSS tokens and an authenticated profile API. A client provider restores account-scoped cached selection and synchronizes with the profile; the static root layout does not read cookies.
**Tech Stack:** Existing Next.js, React, Prisma, Tailwind, Radix Select, Vitest.
**Spec:** `docs/superpowers/specs/2026-10-31-user-palettes-design.md`

## Global Constraints

- Palette IDs: `tavern`, `midnight`, `forest`, `parchment`, `amethyst`, `frost`.
- Ukrainian and English labels. Expand-only migration. No new dependencies.
- Keep game semantics, print output and landing design intact.

## Review Focus

- Switching accounts must not copy another user's preference.
- A slow initial GET must not overwrite a newer selection.
- Failed writes must not claim the profile was saved.
- Dialog portals and light spellbook previews must inherit the palette.
- Narrow headers and colored school labels must remain usable.

### Task 1: Account preference and palette lifecycle

Files: `lib/theme/{palettes,client}.ts`, `types/theme.ts`, `lib/api/theme.ts`, `lib/hooks/theme/*`, `lib/providers/theme-provider.tsx`, `app/api/theme/route.ts`, `lib/server/users/palette.ts`, `prisma/schema.prisma`, migration, API/hook tests.

Interfaces: `PaletteId`, `PALETTE_IDS`, `isPaletteId`, `themeApi.get/set`; `useTheme(): { palette, ready, saving, error, setPalette }`.

- [ ] Write API tests for 401, invalid input, six valid IDs, current-user scope and fallback; run and observe missing route failure.
- [ ] Add nullable palette field, migration and authenticated read/write helper; run Prisma generation and API tests.
- [ ] Write lifecycle tests for cached restore, account change, stale GET, failed save; run RED, implement provider/hook, run GREEN.

### Task 2: Header and complete visual palette

Files: `app/{layout.tsx,globals.css,palettes.css}`, `components/common/PaletteSwitcher.tsx`, `components/layout/Header.tsx`, HUD styles, book components, spell preview, theme-specific surface styles, message catalogs.

Consumes Task 1 `useTheme`, `PaletteId`; produces root `data-palette` and `.dark` state, shared HUD/book CSS tokens.

- [ ] Add six token sets and map HUD/form tokens to inherited palette values.
- [ ] Add accessible Select with swatches and localized errors; bootstrap cached palette before paint without dynamic root rendering.
- [ ] Replace hard-coded book colors in shared pages, wrappers, casting controls and previews; preserve school and status meanings.
- [ ] Check dark/light surfaces, portal inheritance and small header in browser; run spellbook regression tests.

### Task 3: Verification and documentation

Files: `lib/onboarding/whats-new.ts`, message catalogs, `docs/{STATUS.md,architecture/platform.md}`.

- [ ] Add release note and architecture documentation.
- [ ] Run targeted ESLint, TypeScript, relevant API/lifecycle/book/i18n tests and build.
- [ ] Review final diff with a fresh reviewer; fix material findings, verify, report migration and any unverified behavior.
