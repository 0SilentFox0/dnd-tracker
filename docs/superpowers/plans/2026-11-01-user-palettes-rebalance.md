# User Palettes Rebalance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make all six account palettes readable and consistently applied across shared HUD and spellbook surfaces before enabling them again.

**Architecture:** Keep the existing palette IDs and shared CSS custom properties. Correct contrast-sensitive token pairs per palette, make shared HUD/book components consume those tokens, and enable the feature after WCAG checks and user approval.

**Tech Stack:** Next.js, React, TypeScript, Tailwind CSS, CSS custom properties.

**Spec:** `docs/superpowers/specs/2026-10-31-user-palettes-design.md`

## Global Constraints

- Palette IDs remain `tavern`, `midnight`, `forest`, `parchment`, `amethyst`, `frost`.
- Semantic colors for spell schools, battle participants, danger, and success retain their meanings.
- Normal text meets WCAG AA contrast at 4.5:1; meaningful component boundaries meet 3:1.
- Print output and public landing page retain their own styling.
- Enable palette selection only after shared surfaces meet the WCAG contrast checks.

## Review Focus

- Light palettes must use dark readable body text throughout HUD and dialogs.
- Muted text, accent text, and primary button labels must contrast with their actual surfaces.
- Portal content, spellbook pages, previews, and profile/book dialogs must use palette tokens consistently.
- Hard-coded colors that express the default tavern theme must not override active palette tokens.
- Disabled palettes must not be applied by bootstrap or client navigation.

---

### Task 1: Rebalance palette tokens

**Files:**
- Modify: `app/palettes.css`
- Modify: `lib/theme/palettes.ts` only if swatches need to match updated token colors

**Interfaces:**
- Consumes: existing `PaletteId` values and CSS custom properties.
- Produces: readable foreground, muted, accent, primary foreground, field, and book colors for all six palettes.

- [x] Inventory token pairs against their rendered surfaces, especially `--hud-muted`, `--hud-gold`, `--palette-primary-foreground`, `--book-muted`, `--book-quiet`, and `--book-accent-ink`.
- [x] Adjust only the token values whose contrast or palette consistency is inadequate; keep dark/light identity and semantic colors intact.
- [x] Keep the disabled feature gate in `lib/theme/palettes.ts` unchanged.

### Task 2: Apply tokens consistently to HUD and spellbooks

**Files:**
- Modify: `components/hud/hud.css`
- Modify: `components/character-profile/CharacterProfile.tsx`
- Modify: `components/character-profile/BiographyText.tsx`
- Modify: `components/character-profile/MagicTab.tsx`
- Modify: `components/spells/book/SpellBookPages.tsx`
- Modify: `components/spells/preview/SpellBattlePreviewPanel.tsx`
- Modify other directly identified shared HUD/book components if they contain default-theme presentation colors
- Modify: `app/palettes.css` for shared scoped overrides

**Interfaces:**
- Consumes: the token contract from Task 1.
- Produces: default-theme presentation uses shared tokens; explicitly semantic colors remain local.

- [x] Replace hard-coded tavern presentation colors with the existing semantic HUD/book tokens or palette-aware token fallbacks.
- [x] Ensure light and dark palette text, inputs, controls, and dialog portals inherit matching foreground and surface colors.
- [x] Preserve deliberate school, ally/enemy, status, and material colors.

### Task 3: Review feature scope and final changes

**Files:**
- Review: `lib/theme/palettes.ts`, `lib/theme/client.ts`, `app/layout.tsx`, `components/common/PaletteSwitcher.tsx`

- [x] Confirm the palette feature flag is enabled after the user approved production activation.
- [x] Review the final diff for unintended changes to print, landing, and semantic game colors.
- [x] Run `git diff --check` and inspect the changed-file list.

### Task 4: Enforce WCAG contrast across palette tokens and variable school colors

**Files:**
- Create: `lib/theme/__tests__/palette-contrast.test.ts`
- Create: `lib/theme/contrast-text-color.ts`
- Create: `lib/theme/__tests__/contrast-text-color.test.ts`
- Modify: `app/palettes.css`, `app/globals.css`
- Modify: `components/spells/book/{SchoolTabs,SchoolHeading,LevelBookmarks}.tsx`
- Modify: `components/character-profile/GoalList.tsx`

- [x] Add AA text and 3:1 non-text contrast assertions for all six token sets and spellbook blends.
- [x] Add a contrast-safe foreground helper for arbitrary school colors and use palette-safe labels for content with opacity states.
- [x] Run the targeted contrast suite and confirm every palette passes.

### Task 5: Remove the temporary preview page

- [x] Remove the interactive palette preview page after review; the user requested it be deleted.
- [x] Keep only the actual application palette support and WCAG contrast tests.
