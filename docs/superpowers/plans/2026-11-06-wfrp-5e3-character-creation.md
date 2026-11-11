# WFRP 5e-3 Character Creation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development. Executors = Sonnet, no per-task reviews, 3 dispatches (D1 = T2 then T1, D2 = T3+T4, D3 = T5+T6), one final Opus review of the branch (range from `2615aa1f9`) with fixes in one dispatch, then `/simplify` (1–2 agents). Steps are checkboxes; the plan gives signatures, cases and decisions, not full code — read the named neighbours and follow their style.

**Goal:** a wfrp player creates a hero through a d100 wizard (species → career → 10 characteristics → talents → identity) saved as a `pending` draft that the DM approves.

**Architecture:** pure `creation/` logic under `lib/utils/rules/systems/wfrp/` exposed via `RuleSystemDefinition.creation?`; species data in a new unlayered table `race_profiles`; wfrp-specific draft handlers behind the existing draft URLs; client form is a system-UI slot (`SystemUi.DraftForm`) so pages/core never import wfrp code.

**Tech Stack:** Next.js 16, React 19, Prisma 6/Postgres, Zod, TanStack Query, next-intl, Vitest.

**Spec:** `docs/superpowers/specs/2026-11-06-wfrp-5e3-design.md`

## Global Constraints

- Worktree `/Users/silentfox/Work/dnd-tracker-wfrp`, branch `feat/wfrp`. **No merge/push to main.** Local DB: container `dnd-tracker-wfrp-db-1` (port 54322, db `wfrp`); `.env.local` points at another DB, so override `DATABASE_URL`/`DIRECT_URL` inline to wfrp for prisma/dev server. Never touch prod URLs or `.env.production-db.local`. No prod migrations.
- Layers: components/`app/**` never import `@/lib/api/*` or `fetch`; logic in hooks. ESLint `SYSTEM_IMPORT_PATTERN` forbids importing `@/lib/utils/rules/systems/wfrp*`, `@/lib/hooks/systems/wfrp*`, `@/components/systems/wfrp*` outside system-owned dirs (`lib/utils/rules/systems/**`, `lib/hooks/systems/**`, `components/systems/**`): reach wfrp via `ruleSystemOf(rules).creation`, `useRuleSystem`, `systemUiOf(key)`. Flags only through `RuleSystemDefinition`, never `key === "wfrp"`.
- Hook folders have `index.ts` barrels; query keys are factories in `keys.ts`; `@/` alias only; `import/no-cycle` on.
- i18n: uk `scope-size` is 105.0/105 KB — all new uk text goes in the new namespace `wfrpCreation` (not in `CAMPAIGN_NAMESPACES`/`WFRP_CAMPAIGN_EXTRA`); en mirrors uk (parity test); non-React code returns keys. Server error texts go to `messages/{uk,en}/errors.json`.
- Migrations expand-only; every `CREATE TABLE` also `ENABLE ROW LEVEL SECURITY`.
- Prices/bonuses/budget are stubs: comment `// verify against 5e book` like `lib/utils/rules/advancement.ts`. Minimal comments otherwise.
- Tests: `pnpm test:run <file>` / `pnpm test:related <files>` while working; `pnpm exec eslint --fix <touched files>` only (no repo-wide lint); full `pnpm test:run` once at the end after checking `ps -Ao pid,pcpu,command -r | grep -E "eslint|vitest|next"`. Vitest env is node; DOM tests start with `// @vitest-environment happy-dom`.
- Commits end with `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`.
- Deviations from spec (decided here): `resilience` dropped from `SpeciesProfile` (no storage field in `CharacteristicsSchema`); species profile lives in `race_profiles`; wfrp draft PATCH edits identity only.

## Review Focus

1. Race with empty/absent profile or empty `careerTable` → create 422, wizard shows "species not ready", never a crash (T4, T6).
2. `careerTable` not ascending / last `max` ≠ 100 / dangling `careerId`/`featId` after deletion → profile PUT rejects; deleting a career/feat that stands in a profile → 409 (T1, T3).
3. Rearranged stats not a permutation of `rolls`, free points ≠ budget, values out of 2..20 → 400, no row created (T1, T4).
4. Second draft / non-player (DM) / already has hero → same rejections as 5e; two parallel POSTs make one draft (T4).
5. Player reopens wfrp draft: PATCH changes identity only; mechanics and `experience` untouched; foreign/active character → 403/400 (T4).
6. Old campaigns whose stored `rules.advancement` lacks `creation` still parse (defaults), not reset the whole section (T2).

---

### Task 1: SpeciesProfile + creation logic + system hook

**Files:**
- Create: `lib/utils/rules/systems/wfrp/creation/{profile.ts,roll.ts,plan.ts,index.ts}`, tests in `creation/__tests__/{profile,roll,plan}.test.ts`
- Modify: `lib/utils/rules/systems/types.ts` (add `creation?: RuleSystemCreation` next to `advancement?`), `lib/utils/rules/systems/wfrp/index.ts` (wire `creation: WFRP_CREATION`), `lib/utils/rules/systems/index.ts` (export types `SpeciesProfile`, `CreationPicks`, `PlanDraftResult`)

**Interfaces — Produces:**

```ts
// profile.ts
export const SpeciesProfileSchema: z.ZodType<SpeciesProfile>; // strictObject, all fields defaulted
export type SpeciesProfile = {
  mods: Partial<Record<CharacteristicKey, number>>; // -20..20, added to STAT_FLOOR
  move: number;            // 1..12, default 4
  fate: number;            // 0..9, default 0
  extraWounds: number;     // 0..3, default 0
  talents: string[];       // fixed featIds, ≤20
  randomTalentCount: number; // 0..5
  randomTalents: { max: number; featId: string }[];
  careerTable: { max: number; careerId: string }[];
};
export const STAT_FLOOR = 20;
export const isUsableProfile = (p: SpeciesProfile): boolean; // careerTable non-empty
// tables: max ascending 1..100, last === 100 (refine), ≤ 100 rows
// roll.ts
export type CreationRolls = { careerRolls: { careerId: string; roll: number }[]; statRolls: number[]; randomTalents: string[] };
export function rollCreation(rng: Rng, profile: SpeciesProfile): CreationRolls;
//  careerRolls: 2 rollTable results; statRolls: 10 × (rollDie(10)+rollDie(10)) in CHARACTERISTIC_KEYS order; randomTalents: randomTalentCount × rollTable(randomTalents)
// plan.ts
export type CreationPicks = {
  career: { mode: "rolled" | "choice" | "free"; careerId: string };
  stats:
    | { mode: "rolled"; rolls: number[] }
    | { mode: "rearranged"; rolls: number[]; arranged: number[] }
    | { mode: "free"; points: number[] };
  talents: string[]; // chosen random talent featIds
};
export type CreationCtx = { profile: SpeciesProfile; rules: AdvancementRules; careerIds: ReadonlySet<string>; featIds: ReadonlySet<string> };
export type PlanDraftResult = { ok: true; characteristics: Characteristics; experience: number } | { ok: false; errors: string[] };
export function planDraft(picks: CreationPicks, ctx: CreationCtx): PlanDraftResult;
// index.ts
export const WFRP_CREATION: RuleSystemCreation = { rollCreation, planDraft, isUsableProfile };
```

Semantics of `planDraft` (all in one function; error codes are plain keys like `"CAREER_NOT_IN_TABLE"`, `"STATS_LENGTH"`, `"STATS_RANGE"`, `"STATS_NOT_PERMUTATION"`, `"POINTS_BUDGET"`, `"POINTS_RANGE"`, `"TALENT_NOT_IN_TABLE"`, `"TALENT_COUNT"`, `"CAREER_UNKNOWN"`, `"PROFILE_NOT_READY"`):
- `rules.creation` (T2) supplies bonuses; until T2 lands import the type from the file where T2 defines it — implement T2 first inside the dispatch (order: T2 then T1 code that uses it; or define `AdvancementRules["creation"]` in T2 step 1).
- career `rolled`/`choice`: `careerId ∈ profile.careerTable`; `free`: `careerId ∈ ctx.careerIds`. Career set via `planCareerSet(DEFAULT-based characteristics, careerId)`.
- stats `rolled`: `rolls.length === 10`, each 2..20; value[i] = `STAT_FLOOR + (mods[key]??0) + rolls[i]`. `rearranged`: `rolls` valid as above, `arranged` same length, sorted(arranged) equals sorted(rolls); value from `arranged`. `free`: `points.length === 10`, each 4..18, `sum === rules.creation.freeBudget`; value from `points`.
- talents: fixed `profile.talents` each +1 rank; chosen `talents` each ∈ `randomTalents` featIds, `length ≤ randomTalentCount`; rank per featId capped 20; every featId ∈ `ctx.featIds` else `"FEAT_UNKNOWN"`.
- `move`/`fate`/`extraWounds` copied from profile; `experience = careerBonus[career.mode] + statBonus[stats.mode]`.
- Pure: no Prisma/React imports.

- [ ] **Step 1:** write failing tests. `profile.test`: defaults on `{}`; reject non-ascending `max`, last ≠ 100, `max` 0/101, unknown key (strict), `mods` out of ±20; `isUsableProfile` false for `{}`. `roll.test` (seeded `mulberry32`): lengths (2 career rolls, 10 stat rolls each 2..20, `randomTalentCount` talents), same seed same result, empty `randomTalents` + count>0 → `[]`. `plan.test`: each mode happy path (assert exact `base`, `experience`, `career {careerId,tier:1,ticks:[]}`, `talents` ranks, move/fate/extraWounds), each error code, mods applied, `free` with sum 99 → `POINTS_BUDGET`, `rearranged` with a changed value → `STATS_NOT_PERMUTATION`, `choice` with careerId outside table → `CAREER_NOT_IN_TABLE`, free career with unknown id → `CAREER_UNKNOWN`.
- [ ] **Step 2:** run `pnpm test:run lib/utils/rules/systems/wfrp/creation` → FAIL.
- [ ] **Step 3:** implement; use `rollTable`, `rollDie` (`@/lib/utils/common/dice`), `CHARACTERISTIC_KEYS`, `DEFAULT_CHARACTERISTICS`, `planCareerSet` (`../advancement/career`). Add `RuleSystemCreation = { rollCreation: typeof rollCreation; planDraft: typeof planDraft; isUsableProfile: typeof isUsableProfile }` in `types.ts`; homm/dnd5e (`d20System`) leave `creation` undefined.
- [ ] **Step 4:** tests pass; add `creation` assertions to the system registry test (wfrp defined, homm/dnd5e undefined). `pnpm exec eslint --fix` on touched files.
- [ ] **Step 5:** commit `feat(wfrp): species profile schema and creation planning (5e-3)`.

### Task 2: `rules.advancement.creation`

**Files:**
- Modify: `lib/utils/rules/advancement.ts` (type + `DEFAULT_ADVANCEMENT_RULES`), `lib/utils/rules/advancement-schema.ts`, `components/rules/sections/AdvancementSection.tsx`, `messages/{uk,en}/wfrpCareers.json` (`rules.*` keys; DM-only namespace, already outside the budget), tests next to each (`lib/utils/rules/__tests__/…`, `components/rules/sections/__tests__/AdvancementSection.test.tsx`)

**Interfaces — Produces:** `AdvancementRules["creation"] = { careerBonus: { rolled: number; choice: number; free: number }; statBonus: { rolled: number; rearranged: number; free: number }; freeBudget: number }`; defaults `careerBonus {50,25,0}`, `statBonus {50,25,0}`, `freeBudget 100` (`// verify against 5e book`). Schema: `z.strictObject` with every nested field `.default(...)` and the `creation` field itself defaulted so a partial stored object does not reset the whole advancement section (`parseRules` falls back per section on failure — confirm with a test).

- [ ] **Step 1:** failing tests: `parseRules` of rules whose `advancement` lacks `creation` → defaults present and other advancement values preserved; partial `creation` (`{ freeBudget: 90 }`) keeps `freeBudget 90` and defaults the rest; bonus `-1` rejected (min 0, max 1000), `freeBudget` 0..1000; `AdvancementSection` renders the 7 number fields and `form.set("advancement", …)` receives the edit; `MECHANIC_REGISTRY`/`hash` tests unaffected (the key is nested in `advancement`).
- [ ] **Step 2:** run → FAIL. **Step 3:** implement (follow how `career` was added, `withDefaults` in `lib/utils/rules/schema.ts`; uk/en strings under `wfrpCareers.rules.creation.*`). **Step 4:** tests + `pnpm test:related` on both rules dirs pass, eslint on touched files. **Step 5:** commit `feat(wfrp): advancement.creation rules and editor (5e-3)`.

---

### Task 3: `race_profiles` table, API, reference guards

**Files:**
- Create: `prisma/migrations/20261126000000_race_profiles/migration.sql`, `lib/server/races/race-profile.ts`, `lib/server/races/profile-usage.ts`, `app/api/campaigns/[id]/race-profiles/route.ts` (GET), `app/api/campaigns/[id]/races/[raceId]/profile/route.ts` (PUT), tests in `lib/server/races/__tests__/` and route `__tests__/`
- Modify: `prisma/schema.prisma` (model `RaceProfile`, `profile RaceProfile?` on `Race`), `lib/server/campaigns/campaign-refs.ts` (kind `career`), `lib/constants/api-errors.ts` + `messages/{uk,en}/errors.json` (`FOREIGN_CAREER`, `CAREER_IN_SPECIES_TABLE`, `FEAT_IN_SPECIES_TABLE`, `SPECIES_PROFILE_NOT_READY`), `lib/server/content/resources/{careers,feats}.ts` (`remove` guards)

**Interfaces — Produces:**

```ts
// prisma: model RaceProfile { raceId String @id; campaignId String; profile Json @default("{}"); createdAt; updatedAt;
//   race Race @relation(fields:[raceId], references:[id], onDelete: Cascade); @@index([campaignId]); @@map("race_profiles") }
export type RaceProfileItem = { raceId: string; profile: SpeciesProfile };
export async function listRaceProfiles(campaignId: string): Promise<RaceProfileItem[]>;   // parse each row with SpeciesProfileSchema.catch-safe; invalid row → skipped
export async function saveRaceProfile(campaignId: string, raceId: string, profile: SpeciesProfile): Promise<RaceProfileItem>; // loadOwned race (404/403), assertCampaignRefs({career, feat}), upsert
export async function profileReferences(campaignId: string, ref: { careerId?: string; featId?: string }): Promise<boolean>; // scans profiles in JS
```

Import `SpeciesProfileSchema` via a server-allowed path (`@/lib/utils/rules/systems` export — add it there in T1 if not exported; do not import `wfrp/*` directly from outside system dirs; `lib/server/**` is not system-owned, so go through the `ruleSystemOf`-style public export or add `SpeciesProfileSchema` to `lib/utils/rules/systems/index.ts`).

- [ ] **Step 1:** failing tests: `saveRaceProfile` upserts, rejects race of another campaign (404/403 like `loadOwned`), rejects `careerId`/`featId` of another campaign (`FOREIGN_CAREER`/`FOREIGN_FEAT`); PUT route: DM-only (player 403), invalid profile 400, success returns item; GET list: member access, returns only this campaign; `careersResource.remove` / `feats` remove → 409 `CAREER_IN_SPECIES_TABLE` / `FEAT_IN_SPECIES_TABLE` when a profile references it (and still `CAREER_IN_USE` check order unchanged); `profileReferences` true/false; race delete cascades the profile (integration/SQL test if the repo has a pattern — otherwise assert the `onDelete: Cascade` in schema via a prisma-schema test like existing ones).
- [ ] **Step 2:** run → FAIL.
- [ ] **Step 3:** write migration SQL (`CREATE TABLE "race_profiles" (...)`, FK `ON DELETE CASCADE`, index, `ALTER TABLE "race_profiles" ENABLE ROW LEVEL SECURITY;`), update Prisma model, `pnpm exec prisma generate` with the wfrp DB URLs inline, apply locally with `prisma migrate dev --name race_profiles` inline-overridden; implement handlers with `requireDM` / `requireCampaignAccess`, `parseBody`, `errorResponse`, `handleApiError` like neighbouring routes; extend `assertCampaignRefs` (`CampaignRefKind` + `REF_KINDS` + `prisma.career.count`).
- [ ] **Step 4:** run the new tests, `pnpm test:related lib/server/campaigns/campaign-refs.ts lib/server/content` and the templates/layer integration tests (`lib/db/__tests__/content-layer.integration.test.ts`, `lib/server/templates`) — `race_profiles` must not appear in bundles/layers; add a test asserting `race_profiles` is not in `BUNDLE_TABLES`. eslint touched files.
- [ ] **Step 5:** commit `feat(wfrp): race profiles table, API and reference guards (5e-3)`.

### Task 4: wfrp draft create/patch handlers

**Files:**
- Create: `app/api/campaigns/[id]/characters/draft/{wfrp-draft-schema.ts,create-wfrp-draft.ts}`, `app/api/campaigns/[id]/characters/[characterId]/draft/patch-wfrp-draft.ts`, tests in both `__tests__/` dirs
- Modify: `draft/create-draft.ts` (dispatch at the d20 gate), `[characterId]/draft/update-draft.ts` (dispatch), `draft/__tests__/create-draft-system-gate.test.ts` (wfrp now creates; keep a gate test with a stub system lacking `creation` → 409 `SYSTEM_DRAFTS_UNSUPPORTED`), `lib/constants/api-errors.ts` + errors.json (`WFRP_DRAFT_INVALID` with issue list), `types/characters.ts` (`WfrpDraftInput`, `WfrpDraftIdentityInput`)

**Interfaces:**
- Consumes: `ruleSystemOf(rules).creation`, `CreationPicks`, `planDraft`, `listRaceProfiles`/profile read for one race, `lockPlayerDrafts`, `EMPTY_INVENTORY`, `HERO_INITIATIVE`, `CharacterStatus`, avatar resolution from `draft-resolve.ts`.
- Produces: `wfrpDraftSchema` = `{ name (1..100), speciesId, career: {mode, careerId}, stats (discriminated by mode as `CreationPicks["stats"]`), talents: string[] (≤5), alignment?, background? (≤4000), avatar?, goals? (≤5, same shape as d20) }`; `wfrpDraftIdentitySchema` = `{ name, alignment?, background?, avatar?, goals? }`; `createWfrpDraft(request, campaign, access): Promise<NextResponse>`; `patchWfrpDraft(request, campaignId, characterId): Promise<NextResponse>`.

Decisions: dispatch in `createDraft`: `const creation = ruleSystemOf(campaign.rules).creation; if (creation) return createWfrpDraft(...); if (kind !== "d20") 409`. Inside `createWfrpDraft`: role/existing checks via the same `draftRejection`-style rules (player only, one draft/hero per player — reuse constants/helpers; write a small wfrp variant if `draftRejection` needs scores); load race (campaign-scoped) + its profile; `!isUsableProfile` → 422 `SPECIES_PROFILE_NOT_READY`; load campaign `careerIds`/`featIds` sets; `planDraft` fail → 400 `WFRP_DRAFT_INVALID` with `issues` = codes; success → in `$transaction`: `lockPlayerDrafts`, recount, `character.create` with `type PLAYER`, `status PENDING`, `controlledBy`, `level 1`, `race = race.name`, `raceId`, `class ""`, `archetype null`, d20 score columns left at schema defaults, `characteristics` (JSON), `experience`, `goals` via `mergeDraftGoals`, `initiative HERO_INITIATIVE.DEFAULT`, `skillTreeProgress {}`, then `characterInventory.create` with `EMPTY_INVENTORY`. Patch: owner + `PENDING` only (403 / `DRAFT_NOT_PENDING`), updates identity fields only, never `characteristics`/`experience`/`raceId`; body parsed with the identity schema.

- [ ] **Step 1:** failing tests (mock style from `create-draft-system-gate.test.ts` / `update-draft-choices.test.ts`): create happy path per career/stat mode asserting the `character.create` payload (`characteristics.base`, `experience`, `raceId`, `status`), species without profile → 422, `careerId` outside table → 400 with `issues`, foreign `speciesId` → 404/400, DM caller → rejected like 5e, existing draft → rejected (same status/key as 5e), d20 system still handled by old path (existing tests green), system without `creation` and non-d20 → 409; patch: identity updated, `characteristics`/`experience` untouched (assert `update` data keys), non-owner 403, non-pending 400.
- [ ] **Step 2:** run → FAIL. **Step 3:** implement; keep `route.ts` files thin (dispatch lives in the handler files). **Step 4:** pass; `pnpm test:related` over both draft dirs; eslint. **Step 5:** commit `feat(wfrp): wfrp player draft create/patch (5e-3)`.

---

### Task 5: client API, hooks, types

**Files:**
- Create: `lib/hooks/races/useRaceProfiles.ts` (+ `keys.ts` additions `raceProfileKeys.list(campaignId)`), `lib/hooks/systems/wfrp/useWfrpDraftForm.ts` (+ `index.ts` export through `lib/hooks/systems/`), tests `__tests__/`
- Modify: `lib/api/races.ts` (`getRaceProfiles`, `saveRaceProfile`), `lib/api/characters.ts` (`createWfrpDraft`, `updateWfrpDraftIdentity`), `types/races.ts` (`RaceProfileItem` re-export or mirror), `types/characters.ts`, `lib/hooks/races/index.ts`

**Interfaces — Produces:**

```ts
useRaceProfiles(campaignId: string): UseQueryResult<RaceProfileItem[]>
useSaveRaceProfile(campaignId: string): UseMutationResult<RaceProfileItem, Error, { raceId: string; profile: SpeciesProfile }> // invalidates list
useWfrpDraftForm(input: { campaignId: string; characterId?: string; initialIdentity?: WfrpDraftIdentityInput }): {
  step: { id: "species"|"career"|"stats"|"talents"|"identity"; index: number; next(): void; back(): void; canNext: boolean };
  species: { data: { race: Race; profile: SpeciesProfile }[]; selected?: string; select(raceId: string): void };
  career: { mode: CreationPicks["career"]["mode"]; setMode(m): void; rolls: CreationRolls["careerRolls"]; roll(): void; careerId?: string; pick(id: string): void };
  stats:  { mode; setMode(m): void; rolls: number[]; roll(): void; arranged: number[]; swap(i: number, j: number): void; points: number[]; setPoint(i: number, v: number): void };
  talents: { fixed: string[]; count: number; rolled: string[]; roll(): void; reroll(i: number): void };
  preview: PlanDraftResult | undefined;      // planDraft on current picks
  identity: { values: WfrpDraftIdentityInput; set(patch: Partial<WfrpDraftIdentityInput>): void };
  submit: { run(): void; isPending: boolean; error: Error | null };
}
```

Decisions: reach logic via `useRuleSystem({ campaignId })` → `system.creation` (hook file lives under `lib/hooks/systems/wfrp/` so it may import wfrp internals); species list = races ∩ profiles with `isUsableProfile`; rolls via `rollCreation(cryptoRandom-based rng, profile)` (`cryptoRandom` in `lib/utils/common/dice.ts`); `careerIds`/`featIds` from existing careers/feats list hooks; with `characterId` present the form is identity-only (no species/career/stats/talents steps, `submit` → `updateWfrpDraftIdentity`); on success invalidate `characterKeys.sheet(campaignId)` and `router.push(/campaigns/{id}/character)` exactly as `usePlayerDraftForm`; `useRollReveal` reused for the roll animation (`start(steps)`), Esc skip stays in the component.

- [ ] **Step 1:** failing hook tests (`// @vitest-environment happy-dom`; mock `@/lib/api/*`, `next/navigation`, stub `matchMedia` like `usePlayerDraftForm.test.ts`): species list excludes races without usable profile; `roll()` fills rolls deterministically with an injected rng; swapping updates `arranged` and `preview.experience` becomes the `rearranged` bonus; `free` with wrong budget → `preview.ok === false`; `canNext` false until the step is valid; `submit.run` posts the exact `WfrpDraftInput` (`speciesId`, `career`, `stats`, `talents`, identity) and navigates; identity-only mode PATCHes identity; `useRaceProfiles` caches under `raceProfileKeys.list`.
- [ ] **Step 2:** run → FAIL. **Step 3:** implement. **Step 4:** pass, eslint. **Step 5:** commit `feat(wfrp): draft form hook and race profile hooks (5e-3)`.

### Task 6: UI — wizard slot, species profile editor, i18n

**Files:**
- Create: `components/systems/wfrp/creation/{WfrpDraftForm.tsx,SpeciesStep.tsx,CareerStep.tsx,StatsStep.tsx,TalentsStep.tsx,IdentityStep.tsx,SpeciesProfileEditor.tsx,TableRowsEditor.tsx}`, `messages/{uk,en}/wfrpCreation.json`, component tests under `components/systems/wfrp/creation/__tests__/`
- Modify: `components/systems/types.ts` (`SystemUi.DraftForm?: ComponentType<{ campaignId: string; characterId?: string; initialIdentity?: WfrpDraftIdentityInput }>`, `SystemUi.RaceProfileEditor?: ComponentType<{ campaignId: string; raceId: string }>`), `components/systems/wfrp/index.ts` (`WFRP_UI`), `components/races/RaceEditForm.tsx` (render slot when present), `app/campaigns/[id]/character/new/page.tsx` and `app/campaigns/[id]/character/draft/page.tsx` (choose `systemUiOf(key).DraftForm` over `PlayerDraftForm`; wrap in `<ExtendLocaleScope namespaces={["wfrpCreation"]}>` for the wfrp branch; draft page builds `initialIdentity` from the pending row), `lib/i18n/config.ts` (`NAMESPACES` += `"wfrpCreation"`), `lib/i18n/scopes.ts` (`WFRP_DM_EXTRA` += `"wfrpCreation"`), `global.d.ts` (two lines like `wfrpCareers`), `app/campaigns/[id]/__tests__/layout.test.tsx` (expected DM scope string)

**Interfaces:** the components call only `useWfrpDraftForm`, `useRaceProfiles`, `useSaveRaceProfile` (+ existing `useDraftPortraits`/avatar pieces if reusable without `DraftInput` — otherwise omit AI avatar/backstory; the identity step then has name, alignment, background, avatar url input, goals). `SpeciesProfileEditor`: number inputs for the 10 `mods`, `move`, `fate`, `extraWounds`, `randomTalentCount`, fixed-talent multiselect (feats list hook), `TableRowsEditor` for `careerTable` (rows: `max` + career select) and `randomTalents` (rows: `max` + feat select); validates with `SpeciesProfileSchema` through the system hook (`system.creation`) — expose `validateProfile` on `RuleSystemCreation` if needed (add in T1 file: `export const parseProfile = (v: unknown)`), save disabled while invalid. Wizard layout works at 375 px (single column, 44 px tap targets, sticky Back/Next bar), shows `preview.experience` total on the identity step, "species not ready" empty state when the species list is empty.

- [ ] **Step 1:** failing component tests: wizard renders steps in order and blocks Next until valid; roll button fills rolls (mock hook); swap UI updates arranged list; empty species → empty state text key; profile editor adds/removes rows, blocks save on non-ascending `max`, calls `useSaveRaceProfile`; en/uk key parity passes (`pnpm test:run lib/i18n`); layout test updated; `scope-size` test still ≤ 105 KB.
- [ ] **Step 2:** run → FAIL. **Step 3:** implement; all texts via `useTranslations("wfrpCreation")`; no `fetch`/`@/lib/api` in components. **Step 4:** pass; `pnpm test:related` on touched files; eslint on touched files incl. Cyrillic rule (messages only). **Step 5:** commit `feat(wfrp): creation wizard, species profile editor, wfrpCreation i18n (5e-3)`.

---

### Task 7 (controller, after D3): docs and verification

- [ ] Full `pnpm test:run` once (check `ps` first), `pnpm exec tsc --noEmit` if the repo has the script, eslint only on the branch's touched files.
- [ ] Live-run by a Sonnet subagent on the wfrp dev server (inline DB override): seed a species profile + two careers/feats on the local `wfrp` DB; as player: wizard on desktop and 375 px (iframe), each mode of career/stats, submit → pending draft → DM approves → hero sheet shows characteristics/career/experience; as DM: species profile editor, 409 on deleting a stand-in career. Screenshots scale 0.5, prefer JS/text checks; delete test data afterwards.
- [ ] Final Opus review of `2615aa1f9..HEAD`; fixes in one dispatch; `/simplify` (1–2 agents).
- [ ] Update `docs/architecture/rule-systems.md` («Межі 5e-3»: table, hook, wizard, limits/stubs, deviations), `docs/architecture/characters.md` (wfrp drafts), `docs/STATUS.md`, memory `project-wfrp`. Keep `.superpowers/sdd/<plan>/` until the epic merges. Pre-deploy migration list of the epic += `race_profiles`.

## Self-review (spec coverage)

Spec Data → T1, T2, T3; pure logic + hook → T1; server → T3, T4; client/i18n/DM form → T5, T6; tests → each task + T7; deviations listed in Global Constraints; open spec item (sync/column) removed by the `race_profiles` decision.
