# Identity and feature icons — implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Seed 224 AI icons (9 races, 12 classes, 12 subclasses, 4 backgrounds, 186 class/subclass features) into the SRD template (en + uk) and show them in the UI.

**Architecture:** Extend the existing `tokens-5e` pipeline (`icons.json` + `withIcons` + upload script) with five new categories; a pure mapping module turns SRD data into expected icon keys. Feature icons live inside the class JSON (`abilities[].icon`, `subclasses[].icon`), so there is no migration. UI shows `icon` with the existing fallbacks.

**Tech Stack:** TypeScript, sharp (webp), Supabase Storage, Zod, vitest, next/image via `OptimizedImage`.

**Spec:** `docs/superpowers/specs/2026-10-31-identity-icons-design.md`

## Global Constraints

- No migration, no DDL. Nothing runs against prod DB/Supabase without `--allow-remote` and the user's confirmation.
- Only SRD entities get icons; out-of-SRD icons are not uploaded.
- `@/` alias imports in app code; scripts follow the neighbours (relative inside `scripts/`).
- Components never import `@/lib/api/*` or call `fetch`.
- Minimal comments (global CLAUDE.md). New identifiers in English.
- ESLint only on touched files: `pnpm exec eslint --fix <files>`. Tests: `pnpm test:related <files>` while working; full `pnpm test:run` once before merge.
- Work in worktree `../dnd-tracker-icons`, branch `feat/identity-icons`. Commit messages end with `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`.

## Review Focus

- `AbilitySchema` is not `.strict()`: Zod silently drops unknown keys, so without the schema change `icon` vanishes on import. Task 1 pins this with a parse round-trip test.
- An ability with `icon` must not change engine behaviour or hashes: Task 1 asserts `collectModifiers`-visible shape is unaffected (round-trip equality of everything except `icon`).
- Subclass id mismatch (3 aliases): Task 2 test fails if SRD data adds a subclass with no icon mapping.
- Placeholder abilities `*-subclass-3` have no icon: must stay untouched, not an error (Task 2/3).
- `icons.json` from before this change (3 categories) must still load (Task 2).
- en and uk builds must give identical icon URLs (Task 6).
- Missing icon renders exactly as before (Task 5).

---

### Task 1: `icon` on abilities and progression items

**Files:**
- Modify: `lib/utils/abilities/schema/ability.ts` (add field after `name`)
- Modify: `types/classes.ts:73` (`ProgressionItem`)
- Modify: `lib/utils/characters/classes/progression.ts:8`
- Test: `lib/utils/abilities/schema/__tests__/ability-icon.test.ts` (create), extend the existing progression test beside `progression.ts` if present

**Interfaces:**
- Produces: `Ability.icon?: string | null`; `ProgressionItem.icon?: string | null`.

- [ ] **Step 1: Failing tests**

```ts
import { expect, it } from "vitest";
import { AbilitySchema } from "../ability";

const base = { id: "rage-1", name: "Rage", trigger: { event: "passive" }, effects: [{ kind: "note", text: "Rage" }] };

it("keeps a valid icon link", () => {
  expect(AbilitySchema.parse({ ...base, icon: "https://x/a.webp" }).icon).toBe("https://x/a.webp");
});

it("rejects data: URLs", () => {
  expect(AbilitySchema.safeParse({ ...base, icon: "data:image/png;base64,AAAA" }).success).toBe(false);
});

it("without icon the parsed ability is unchanged", () => {
  expect(AbilitySchema.parse(base)).toEqual(AbilitySchema.parse({ ...base, icon: undefined }));
});
```

Progression test: `featureItems` (the function at `progression.ts:8`; read its name) maps `icon: a.icon ?? null`.

- [ ] **Step 2:** `pnpm test:run lib/utils/abilities/schema/__tests__/ability-icon.test.ts` → FAIL (icon stripped).
- [ ] **Step 3:** In `AbilitySchema` add
  `icon: z.string().max(2000).refine((v) => !v.startsWith("data:"), "abilities.validation.iconLink").nullable().optional(),`
  Add key `abilities.validation.iconLink` to `messages/en/*` and `messages/uk/*` where the other `abilities.validation.*` keys live (find with grep; keep the same namespace file). Add `icon?: string | null` to `ProgressionItem` and `icon: a.icon ?? null` in the mapper at `progression.ts:8`.
- [ ] **Step 4:** `pnpm test:related lib/utils/abilities/schema/ability.ts lib/utils/characters/classes/progression.ts types/classes.ts` → PASS (existing snapshots untouched; if an i18n key test fails, fix the key).
- [ ] **Step 5:** eslint touched files; commit `feat(abilities): optional icon on abilities and progression items`.

---

### Task 2: icons file categories + identity mapping module

**Files:**
- Modify: `scripts/assets/tokens-5e/icons-file.ts`
- Create: `scripts/assets/tokens-5e/identity-catalog.ts`
- Test: `scripts/assets/tokens-5e/__tests__/icons-file.test.ts` (extend), `scripts/assets/tokens-5e/__tests__/identity-catalog.test.ts` (create)

**Interfaces:**
- Produces from `icons-file.ts`:
  ```ts
  export type IconKind = "spells" | "units" | "artifacts" | "features" | "races" | "classes" | "subclasses" | "backgrounds";
  export type IconsFile = Record<IconKind, Record<string, string>>;
  ```
  `TokenKind` in `catalog.ts` stays the 3 token kinds (keeps `TOKEN_SIZE`/`parseCatalog` untouched); `IconsFile` is keyed by `IconKind`. `readIcons` returns `{}` for missing categories; `writeIcons` writes all eight sorted. Check `withIcons`'s `icons[kind as TokenKind]` still type-checks.
- Produces from `identity-catalog.ts`:
  ```ts
  export type IdentityKind = "features" | "races" | "classes" | "subclasses" | "backgrounds";
  export interface IdentityTarget { kind: IdentityKind; key: string; recordId: string }
  export const SRD_PREFIX = "srd-2024_";
  export const SUBCLASS_RECORD_ALIAS: Record<string, string>; // "srd-2024_sorcerer/draconic-sorcery" -> "subclass:sorcerer-draconic-bloodline", etc.
  export const IDENTITY_SIZE = 256;
  export const IDENTITY_BUCKET: Record<IdentityKind, string>; // races "race-icons", classes+subclasses "class-icons", backgrounds "background-icons", features "feature-icons"
  export function expectedTargets(data: SrdData): IdentityTarget[];
  export function parseIdentityCsv(csv: string): Map<string, { folder: string; file: string }>; // record_id -> generation_folder + output_filename
  ```
  Keys: races/classes/backgrounds = row `slug`; subclasses = `${classSlug}/${subclass.id}`; features = `${classSlug}/${ability.id}` or `${classSlug}/${subclass.id}/${ability.id}`. `recordId`: `race:<slug minus prefix>`, `class:…`, `background:…`, `subclass:<class>-<id>` (or alias), `feature:<class>/<id>` / `feature:<class>/<subclass>/<id>`.
  `expectedTargets` skips abilities whose id matches `/-subclasses?-\d+$/` (placeholders).

- [ ] **Step 1: Failing tests.** `identity-catalog.test.ts`: a small `SrdData` fixture (one class `srd-2024_wizard` with ability `spell-mastery-18`, subclass `evoker` with ability `x-3`, a `wizard-subclass-3` placeholder; one race; one background) → `expectedTargets` equals the exact list incl. alias `subclass:wizard-school-of-evocation` and no placeholder. Second test on real data: `expectedTargets(readSrdData())` returns 186 features, 9 races, 12 classes, 12 subclasses, 4 backgrounds. `parseIdentityCsv` test on a two-row CSV string (use `parseTable` like `catalog.ts`). `icons-file.test.ts`: file with only `spells` loads with all eight keys; write/read round trip sorted.
- [ ] **Step 2:** run → FAIL.
- [ ] **Step 3:** implement. Use `parseTable` from `@/lib/utils/content/import/table` (as `catalog.ts`).
- [ ] **Step 4:** run `pnpm test:related scripts/assets/tokens-5e/icons-file.ts scripts/assets/tokens-5e/identity-catalog.ts` → PASS. `pnpm exec tsc --noEmit -p tsconfig.scripts.json` if the repo has it, else rely on the test run.
- [ ] **Step 5:** eslint; commit `feat(assets): identity icon categories and SRD mapping`.

---

### Task 3: seed-time merge (`withIcons` for races/classes/backgrounds, `withClassIcons`)

**Files:**
- Modify: `scripts/srd/lib/load-template.ts` (`ICON_COLUMN`, new `withClassIcons`)
- Modify: `scripts/srd/constructor-srd-template.ts` — find the real file name via `grep -l "constructor:srd-template" package.json`; the `prepare` callback at the `withIcons(...)` call
- Test: `scripts/srd/__tests__/icons-merge.test.ts` (extend)

**Interfaces:**
- Consumes: `IconsFile` (Task 2), `SRD_PREFIX`.
- Produces: `withClassIcons(rows: Record<string, unknown>[], data: SrdData, icons: IconsFile): Record<string, unknown>[]` — rows aligned with `data.classes` (same length assertion as `withIcons`); returns new rows where `features[].abilities[]` and `subclasses[].features[].abilities[]` get `icon` when `icons.features` has the key, and `subclasses[]` get `icon` from `icons.subclasses`. Never mutates input; entries without a key stay untouched.

- [ ] **Step 1: Failing tests** (extend the file's style): `ICON_COLUMN` now maps `races`, `classes`, `backgrounds` → `icon`; `withIcons("races"|"classes"|"backgrounds", …)` sets `icon`; `withClassIcons` on a fixture with one class, one feature, one subclass with one feature and one placeholder ability → icons set on the three real ones, placeholder untouched, input rows not mutated; length mismatch throws.
- [ ] **Step 2:** run → FAIL.
- [ ] **Step 3:** implement. In the script's `prepare`: `kind === "classes" ? withClassIcons(withIcons(kind, data, rows, icons), data, icons) : withIcons(...)`. Note the existing test line `withIcons("races", …)` expects "untouched": update it to the new behaviour (races now get icons; use `"feats"` for the untouched case).
- [ ] **Step 4:** `pnpm test:related scripts/srd/lib/load-template.ts` → PASS (includes `load-template.test.ts`).
- [ ] **Step 5:** eslint; commit `feat(srd): merge identity and feature icons at template seed`.

---

### Task 4: upload script

**Files:**
- Create: `scripts/assets/tokens-5e/upload-identity-icons.ts`
- Modify: `package.json` (script `assets:identity-icons`, same form as `assets:tokens-5e`)
- Test: `scripts/assets/tokens-5e/__tests__/identity-upload.test.ts` (create, pure part only)

**Interfaces:**
- Consumes: `expectedTargets`, `parseIdentityCsv`, `IDENTITY_BUCKET`, `IDENTITY_SIZE`, `toWebp`, `readIcons/writeIcons`, `ensureBucket`, `staticAssetUploadOptions`, `assertSeedTarget`.
- Produces: `planUploads(targets, featuresCsv, identityCsv, roots): { file: string; target: IdentityTarget; missing: boolean }[]` (pure, exported, tested). CLI: `pnpm assets:identity-icons <templateId> [--dir ~/Downloads/fantasy-tokens] [--dry-run] [--allow-remote]`.

- [ ] **Step 1: Failing test** for `planUploads`: feature CSV row `feature:barbarian/rage-1` with folder `feature/barbarian`, file `barbarian-rage-1.png` and roots `{ features: "/d/output-features/icons", identity: "/d/output-identity/icons" }` → `/d/output-features/icons/feature/barbarian/barbarian-rage-1.png`; an identity row resolves under `identity`; a target absent from the CSV → `missing: true`.
- [ ] **Step 2:** run → FAIL.
- [ ] **Step 3:** implement script mirroring `upload-tokens-5e.ts` (same flow: dry-run converts only; real run validates template campaign name/kind, `assertSeedTarget`, `ensureBucket`, object name `${templateId}/${kind}/${key.replaceAll("/", "_")}-${sha1[0..8]}.webp`, `upload(..., staticAssetUploadOptions("image/webp"))`, URL from `getPublicUrl`). On success merge into `icons.json` per category keeping only keys still in `expectedTargets`. Exit code 1 on any upload error or missing file.
- [ ] **Step 4:** run test → PASS; then local dry-run (no network, no DB): `pnpm assets:identity-icons dry --dir ~/Downloads/fantasy-tokens --dry-run`. Expect 224 converted, 0 missing, sizes printed. Record the totals in the commit body.
- [ ] **Step 5:** eslint; commit `feat(assets): upload script for identity and feature icons`.

---

### Task 5: UI display and fallbacks (libraries + progression)

Rule: every place that lists or picks a race, class, subclass, background or feat shows its icon through `EntityIcon` (`components/common/EntityIcon.tsx`: `src`, `name`, `size`, `className`; with no `src` or a failed load it shows the initial letter, which is the fallback). Feats have no seeded icons (none generated), so they show the initial until the DM sets one.

**Files:**
- Modify: `components/common/DmEntityCard.tsx` (new optional prop `icon?: string | null`; renders `<EntityIcon src={icon} name={title} size={48} className="size-12 rounded-lg" />` left of the title; hidden when the prop is `undefined`, so other users of the card are unchanged)
- Modify: `components/classes/ClassCard.tsx`, `components/feats/FeatCard.tsx`, `components/backgrounds/BackgroundCard.tsx` (pass `icon`)
- Modify: `components/races/RaceCard.tsx` (own layout: add `EntityIcon` next to the name, as `ArtifactCard` does)
- Modify: `components/classes/ClassCard.tsx` (below the badges: a row of subclass icons, 24 px, `title` = subclass name; omitted when the class has no subclasses)
- Modify: `components/classes/SubclassesEditor.tsx` (`EntityIcon` in each subclass header, from `subclass.icon`)
- Modify: `components/classes/progression/ProgressionRowView.tsx` (`Items`), `components/character-profile/path/PathRowCard.tsx`
- Check and fix only if the icon is missing: `components/choices/{SubclassCard,BackgroundPicker}.tsx` and the race/class/feat pickers in create-character and the character profile (`grep -rn "RacePicker\|ClassPicker\|FeatPicker\|ChoiceCard" components app`), the `info` pages (`app/campaigns/[id]/info`) that list these entities, `components/classes/progression/ClassProgressionMap.tsx` subclass tabs/columns
- Test: one test per touched component group in its `__tests__/` folder (`// @vitest-environment happy-dom`)

**Interfaces:**
- Consumes: `ProgressionItem.icon` (Task 1); `GameClassData.icon`, `GameClassData.subclasses[].icon`, `Race.icon`, `Background.icon`, `Feat.icon` (already in the types; verify `Race`/`Feat`/`Background` list DTOs actually carry `icon` — if a list endpoint or `select` drops it, add it there and note it in the commit).

- [ ] **Step 1: Failing tests**
  - `Items` with `[{ key: "a", name: "Rage", summary: "", icon: "https://x/r.webp" }, { key: "b", name: "Plain", summary: "" }]`: first `<summary>` has an `img`, second has none and still shows its name.
  - `ClassCard` with `icon` and two subclasses with icons: the class icon and two subclass icons render; with `icon: null` it shows the initial letter and no `img`.
  - `RaceCard`, `BackgroundCard`, `FeatCard`: with `icon` an `img` renders; with `null` the initial letter renders.
  - `SubclassesEditor`: subclass with `icon` shows an `img`; without, the initial.
- [ ] **Step 2:** run them → FAIL.
- [ ] **Step 3:** Implement as listed. In `Items` render a 20x20 `EntityIcon` (`size={20}`, `className="size-5 rounded"`) only when `it.icon` is set (progression rows with no icon look exactly as before); same in `PathRowCard`. Keep the layering: no `fetch` or `@/lib/api` in components.
- [ ] **Step 4:** `pnpm test:related components/common/DmEntityCard.tsx components/classes components/races components/feats components/backgrounds components/character-profile/path components/choices` → PASS. Then a browser check of the four library pages and the class page with the local DB seeded (Task 8): live runs go to a Sonnet subagent, text/JS checks over screenshots.
- [ ] **Step 5:** eslint touched files; commit `feat(ui): icons in race, class, subclass, background and feat libraries`.

### Task 5b: icon field for class/subclass abilities in the editor

The user requires a URL field for ability icons in the class editor (rules out the earlier "preserve only" reduction).

**Files:**
- Modify: `components/abilities/AbilityListEditor.tsx` and `components/abilities/AbilityPanel.tsx` (read both first): new optional prop `withIcon?: boolean`; when true, the ability header shows `ImageUpload` (`allowFile={false}`, same props as `components/classes/ClassBasicsTab.tsx:51`) bound to `ability.icon`; empty string clears to `null`/undefined
- Modify: `components/classes/ClassFeaturesEditor.tsx` (pass `withIcon` to `AbilityListEditor`; subclass features go through the same editor, verify in `SubclassesEditor`)
- Messages: label key in `messages/{en,uk}/classes.json` (e.g. `classes.features.abilityIcon`), kept Ukrainian only in the uk file
- Test: `components/classes/__tests__/ClassFeaturesEditor.test.tsx` (extend), `components/abilities/__tests__/` (extend or create next to existing editor tests)

**Interfaces:**
- Consumes: `Ability.icon` (Task 1). Other editors (skills, races, artifacts, units) do not pass `withIcon` and are unchanged.

- [ ] **Step 1: Failing tests:** with `withIcon`, the editor renders the icon input; typing a URL calls `onChange` with an ability whose `icon` is that URL; clearing gives no `icon` (or `null`); an ability that already has `icon` round-trips unchanged when another field is edited; without `withIcon` no icon input renders.
- [ ] **Step 2:** run → FAIL.
- [ ] **Step 3:** implement; keep the field out of the ability engine/validation flow other than the schema from Task 1 (a `data:` URL shows the existing field error through the `abilities.validation.iconLink` message).
- [ ] **Step 4:** `pnpm test:related components/abilities components/classes` → PASS.
- [ ] **Step 5:** eslint touched files; commit `feat(classes): icon field for class and subclass abilities`.

---

### Task 6: integrity, coverage and en/uk parity tests

**Files:**
- Modify: `scripts/srd/__tests__/icons-integrity.test.ts`
- Create: `scripts/srd/__tests__/icons-i18n-parity.test.ts`

- [ ] **Step 1: Write tests.**
  - Integrity (extend): for the five new categories every key is in `expectedTargets(data)`, URL matches `/<IDENTITY_BUCKET[kind]>/.+\.webp$`. Completeness: for each category whose `icons.<cat>` is non-empty, its key set equals the expected key set (so the gate switches on once the seed is committed; before that it passes with empty categories).
  - Parity: for `locale` in `en`, `uk`: `readSrdData(undefined, locale)` → `withIcons` for `races/classes/backgrounds`, `withClassIcons` for classes, collect `[path, url]` lists; assert both locales produce identical lists (include a fixture-icons file written to a temp dir with fake URLs for every expected key so the test is independent of the real upload).
- [ ] **Step 2:** `pnpm test:run scripts/srd/__tests__/icons-integrity.test.ts scripts/srd/__tests__/icons-i18n-parity.test.ts` → PASS.
- [ ] **Step 3:** eslint; commit `test(srd): identity icon integrity and en/uk parity`.

---

### Task 7: icon QA (before any upload) — user gate

- [ ] **Step 1:** Build contact sheets of the 224 SRD icons (about 60 per sheet, labelled with the key) in the scratchpad with Pillow; review each sheet visually.
- [ ] **Step 2:** List icons with embedded text or corner signatures. Give the list to the user with the `--redo "<Name>"` commands. **Stop and wait**: do not regenerate or upload before the user decides (redo / crop signatures in `toWebp` / accept).
- [ ] **Step 3:** If cropping is chosen, add an optional `crop` zoom to `toWebp` in `scripts/assets/tokens-5e/convert.ts` with a test in `convert.test.ts`; otherwise skip.

---

### Task 8: local seed, populate `icons.json`, docs (user-confirmed steps)

- [ ] **Step 1 (needs user OK for Storage writes):** the upload writes to the Supabase project from `.env.local`. Ask the user which project/bucket target to use and for the local template id; then run `pnpm assets:identity-icons <templateId> --dry-run` first, and the real run only after confirmation (`--allow-remote` only if the target is not local, again only with confirmation).
- [ ] **Step 2:** Commit the updated `data/templates/srd-5.2/icons.json`; re-run Task 6 tests (completeness now active) → PASS.
- [ ] **Step 3:** Local DB: `pnpm constructor:srd-template` (en) then `--locale uk` against the local Docker DB; spot-check in SQL that `races/classes/backgrounds.icon` is set and `classes.features` contain `icon`. Record counts.
- [ ] **Step 4:** Full `pnpm test:run` once (check `ps` for other heavy runs first), eslint on touched files only.
- [ ] **Step 5:** `/simplify` on the branch diff (one agent); update `docs/architecture/` (the file that covers templates/constructor: grep `icons.json` in `docs/architecture`) and `docs/STATUS.md`; decide `whatsNew` per the user's answer; commit.
- [ ] **Step 6:** One final Opus review of the branch; then merge ritual (temp worktree if the primary folder is on another branch), `git mv` spec and plan to `docs/archive/superpowers/` in the merge commit. Prod seeding stays in the separate "official templates on prod" step.

---

## Self-review

- Spec coverage: model change (T1), mapping + aliases + placeholders (T2), `icons.json` format (T2), conversion/upload/buckets (T4), seed merge and en/uk (T3, T6), UI + fallback (T5), QA (T7), tests (all), docs/simplify/review (T8). The spec's "editor field" is reduced to a preservation test (flagged in T5).
- Types: `IconKind`/`IdentityKind`/`IdentityTarget`/`withClassIcons`/`planUploads` names are the same across tasks.
- No placeholders; the only open reads are file names to confirm by grep (marked in the tasks).
