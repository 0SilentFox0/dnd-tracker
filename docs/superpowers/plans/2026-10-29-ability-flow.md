# Ability flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ability summaries become structured i18n segments, rendered as КОЛИ → ЯКЩО → ТОДІ → ЛІМІТ chips in the editor and on cards, with triggers grouped by category.

**Architecture:** every `describe*` in `lib/utils/abilities/registry/` returns `Segment` objects (`{ key, params }`) instead of Ukrainian strings; one `renderSegment(t, segment)` translates at the boundary. `summarizeAbility` groups segments into `{ when, if, then, limits }`; `AbilityFlow` renders them. A golden test on today's uk output guards the conversion.

**Tech Stack:** Next.js 16, React 19, TypeScript strict, next-intl / use-intl, Zod, Vitest.

**Spec:** `docs/superpowers/specs/2026-10-29-ability-flow-design.md` (read it first; this plan only adds order, signatures and test cases).

## Global Constraints

- Worktree `../dnd-tracker-ux`, branch `feat/ability-ux`; never touch the main checkout. Commit after every task; commit messages end with `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`.
- Ability schema, engine behaviour and DB are unchanged. No migration.
- No Cyrillic in `lib/utils/abilities/**` after Task 8 (ESLint via `i18n-migrated.json`); texts live in `messages/{uk,en}/abilityRegistry.json`. New keys under `summary.*`; reuse existing `effects.*.label`, `flags`, `stats`, `targets`, `conditionTypes`, `damageFilters`, `options`.
- Plural forms via ICU `plural` (uk: one/few/many/other), not `pluralUk`.
- CLAUDE.md layering: components never import `@/lib/api/*`; no `console.log`; `padding-line-between-statements`, import order enforced (`pnpm lint --fix`).
- uk text produced after the conversion must equal today's text (golden test), except where noted in a task.
- Tests while working: `pnpm test:related <files>`; full `pnpm test:run` once at the end (Task 12). Fall back to the full suite if `vitest.config.mts` or shared helpers change.

## Review Focus

- Unknown/legacy effect kind (`describeEffect` fallback) must render a chip, not throw (Task 5, Task 10).
- `randomOf` with nested options and `Segment[]` params must render in uk and en (Task 5).
- English locale: rendered summaries contain no Cyrillic and no leftover `{param}` for any registry fixture (Task 1 harness, run in en from Task 2 on).
- Plural boundaries 1, 2, 5, 11, 21 for «разів» / times in `limits` (Task 2).
- Server lists: an ability that fails `AbilitySchema` is still filtered out of `abilitySummary`, and list payload stays JSON-serializable (Task 9).
- Passive ability without condition/limits renders only КОЛИ + ТОДІ chips (Task 10).

---

### Task 1: Segment infrastructure and golden harness

**Files:**
- Create: `lib/utils/abilities/segments.ts`, `lib/utils/abilities/__tests__/segments.test.ts`, `lib/utils/abilities/__tests__/describe-golden.test.ts`, `lib/utils/abilities/__tests__/describe-fixtures.ts`
- Modify: `types/abilities.ts` (re-export `Segment`)

**Interfaces — Produces:**
```ts
export type SegmentParam = string | number | Segment | Segment[] | { join: string; items: Segment[] };
export interface Segment { key: string; params?: Record<string, SegmentParam> }
export const seg = (key: string, params?: Record<string, SegmentParam>): Segment;
export function renderSegment(t: Translator, s: Segment): string;      // nested Segment → rendered, Segment[] → join(", "), {join,items} → join(join)
export function renderSegments(t: Translator, list: readonly Segment[]): string[];
```
`key` is relative to namespace `abilityRegistry` (`t = getTranslator(locale, "abilityRegistry")` / `useTranslator("abilityRegistry")`).

- [ ] **Step 1: Failing tests for `renderSegment`** (`segments.test.ts`): plain key; numeric param; nested Segment param; `Segment[]` joins with ", "; `{join:" / ",items}`; missing key falls back to key (translator already does this: assert result contains the key).
- [ ] **Step 2: Implement `segments.ts`** (recursion over params, everything else delegates to `t(key, values)`). Run the test, expect PASS.
- [ ] **Step 3: Build `describe-fixtures.ts`.** Export `ABILITY_FIXTURES: Ability[]` generated from the registries so new kinds are covered automatically: for every `EFFECT_REGISTRY` kind and every `FLAG_REGISTRY` key a valid minimal effect (use each flag's `defaults`; for other kinds hand-written minimal valid objects in a `Record<EffectKind, Effect>` — the type forces completeness); for every `TRIGGER_REGISTRY` event a trigger with required fields filled; for every `CONDITION_REGISTRY` type a condition (`not/all/any` nest `targetDead`); plus a `limits` fixture with every limit key and plural boundary values (1, 2, 5, 11, 21). Validate each fixture with `AbilitySchema.safeParse`/`EffectSchema` in a test so a broken fixture fails loudly.
- [ ] **Step 4: Golden test (still on the old string API).** `describe-golden.test.ts` computes `describeEffect`/`describeTrigger`/`limitsLabel`/`describeAbility` for all fixtures and `expect(...).toMatchSnapshot()` into `__snapshots__/describe-golden.test.ts.snap`. Run once to write the snapshot, commit it. This file is the contract for Tasks 2–7: after each conversion the same fixtures must render the same uk strings through `renderSegment`.
- [ ] **Step 5: Commit** `test(abilities): segment renderer and describe golden snapshot`.

---

### Task 2: Labels → segments (amount, flat, limits, stat, target, damage filter, condition labels)

**Files:** Modify `lib/utils/abilities/registry/labels.ts`, `messages/{uk,en}/abilityRegistry.json`; Test: `registry/__tests__/labels.test.ts`, golden test.

**Interfaces — Consumes:** `seg`, `Segment` (Task 1). **Produces:**
```ts
export function flatSegment(flat: Flat): Segment;
export function amountSegment(amount: Amount): Segment;
export function limitsSegments(l: Limits | undefined): Segment[];
export const statSegment = (k: StatKey): Segment;           // key `stats.<k>` (already exists; add missing)
export const targetSegment = (k: AbilityTarget): Segment;   // `targets.<k>`
export const damageFilterSegment = (k: DamageFilterKind): Segment;   // `damageFilters.<k>`
export const conditionKeySegment = (k: AnyConditionKey): Segment;    // `conditionTypes`/`conditionKeys.<k>` — check which exists; add the missing ones
```
Delete `STAT_LABELS`/`DAMAGE_FILTER_LABELS`/`TARGET_LABELS`/`CONDITION_LABELS` text maps; keep their key lists as `Object.keys`-able constants (`STAT_KEYS` etc.) because `FieldRenderer` and `static.ts` build option lists from them (`FieldRenderer.tsx:47`, `static.ts:95,106`: switch to `tr(\`stats.${k}\`)`).

- [ ] Step 1: tests — `limitsSegments` with `perBattle: n` for n in {1,2,5,11,21} rendered in uk gives «1 раз за бій», «2 рази за бій», «5 разів…», «11 разів…», «21 раз…»; same in en («1 time», «2 times»); `amountSegment` for each `Amount` variant; `flatSegment` signed numbers.
- [ ] Step 2: implement with ICU plural messages in `summary.limits.perBattle` etc.; add uk+en messages; run `labels.test.ts`.
- [ ] Step 3: adapt golden test so it renders the segment output through a real uk translator for these functions and compares to the snapshot (add a helper `ukT()` in `describe-fixtures.ts` using `getTranslator("uk","abilityRegistry")`), plus an `en` variant asserting `!/[А-Яа-яІіЇїЄєҐґ]/` and no `{`.
- [ ] Step 4: run `pnpm test:related lib/utils/abilities`, fix, commit `refactor(abilities): label helpers return segments`.

---

### Task 3: Effects — hp, control, maneuver, summon, state, static

**Files:** Modify `registry/effects/{hp,control,maneuver,summon,state,static,types}.ts` and messages. `EffectDefinition.describe` type becomes `(e) => Segment[]`.

**Interfaces — Consumes:** Task 2 helpers. **Produces:** `describeDealDamage … describeModifyStat` etc. all returning `Segment[]`; `damageTypeLabel`, `MANEUVER_LABELS`, `MONSTER_SENSE_LABELS`-style text constants replaced by key segments (`damageTypes.<k>`, `maneuvers.<k>`).

- [ ] Step 1: for each function add the uk+en message (`summary.effects.<kind>`), using ICU `select` for variants (e.g. heal vs revive) instead of branching text in code; params hold numbers and nested segments (amount, damage type).
- [ ] Step 2: convert functions. `state.ts:123` (`⛓ ${ability.name}: …`) is a battle-log line, not a summary: leave it out of scope. Keep a private Ukrainian `CONDITION_LOG_LABELS` map in `state.ts` for that one use, mark it `// i18n part 6: battle log`, exclude `registry/effects/state.ts` from the `i18n-migrated.json` entry (Task 8) and add the line to the leftovers file (Task 7). Mention the decision in the commit message.
- [ ] Step 3: golden test green (uk equal to snapshot) and en test green for these kinds; commit `refactor(abilities): effect descriptions as segments (hp/control/state/static)`.

---

### Task 4: Effects — flags (45 keys)

**Files:** Modify `registry/effects/flags.ts` and messages (`summary.flags.<key>`); Test: golden + en.

**Interfaces — Consumes:** Task 2–3 helpers. `FlagDefinition.describe: (e) => Segment[]`; `plain(label, text)` helper becomes `plain(label, key)`.

- [ ] Step 1: convert the `plain(...)` flags first (pure key), then the parametrised ones (`sense`, `advantage`, `resistance`, `spellAbsorb`, `castSpellOnHit`, `spellImmunity`, `spellTargeting`, `counterAttack`, …); skills/abilities lists (`skillsText`, `abilitiesText`) become `Segment[]` of `skills.<k>` / `abilities.<k>` keys (add the keys if the `DND_SKILL_META` labels are not yet in messages — copy uk text from the constants, write en).
- [ ] Step 2: golden + en green; commit `refactor(abilities): flag descriptions as segments`.

---

### Task 5: Effects index, `randomOf`, `describeAbility`

**Files:** Modify `registry/effects/index.ts` (inline `describe:` lambdas, `describeEffect`, `describeAbility`), messages; Test: `registry/__tests__/effects.test.ts` (update), golden.

**Interfaces — Produces:**
```ts
export function describeEffect(effect: Effect): Segment[];           // unknown kind → [seg("summary.unknownEffect", { kind })]
export function describeAbilitySegments(a: Ability): Segment[];      // trigger + limits + effects (same order as today)
export function describeAbilityText(a: Ability, t: Translator): string;  // renderSegments(...).join(" · ")
```
`randomOf` → `seg("summary.effects.randomOf", { options: { join: " / ", items: e.options.flatMap(describeEffect) } })`.

- [ ] Step 1: failing tests: unknown kind renders (uk «невідомий ефект (xyz)», en English) — **Review Focus 1**; `randomOf` with two options renders in uk equal to snapshot and in en without Cyrillic — **Review Focus 2**.
- [ ] Step 2: convert remaining lambdas, implement the three functions, update `effects.test.ts`, `spell-effect-extensions.test.ts`, `legendary-cost.test.ts`, `percent-formula.test.ts`, `class-scale-schema.test.ts`, `templates.test.ts`, `fields-contract.test.ts` and `battle/turn/__tests__/hot-effect.test.ts` to the new API (render through `ukT()`; assertions on text stay).
- [ ] Step 3: golden green for `describeAbilityText`; commit `refactor(abilities): describeEffect/describeAbility via segments`.

---

### Task 6: Triggers and conditions as segments

**Files:** Modify `registry/triggers.ts` (`describeTrigger`, per-event `describe`), `registry/conditions.ts`; messages (`summary.triggers.<event>`, `summary.conditions.<type>`); Test: `registry/__tests__/triggers.test.ts`, `registry/__tests__/conditions-describe.test.ts`, golden.

**Interfaces — Produces:**
```ts
export function describeTrigger(trigger: Trigger): Segment[];       // [label seg, ...extras]
export function describeCondition(c: Condition): Segment[];         // NEW: one message per type; not/all/any nest Segment[]
```
Trigger `label` strings in `TriggerDefinition` are removed (the label already exists in `abilityRegistry.triggers.<event>.label`; use `seg("triggers.<event>.label")`).

- [ ] Step 1: tests: every `TRIGGER_REGISTRY` event and every `Condition["type"]` renders in uk (non-empty, no `{`) and en (no Cyrillic); `describeCondition({type:"not",condition:{type:"targetDead"}})` renders «НЕ (ціль мертва)»-style text (write the uk message, then pin it).
- [ ] Step 2: implement; golden green for triggers; conditions have no old text, so pin new uk text in the snapshot; commit.

---

### Task 7: Remaining text constants in `registry/`

**Files:** `registry/fields.ts`, field/option `label:` strings in registries that still hold Cyrillic.

- [ ] Step 1: `grep -rnP '[А-Яа-яІіЇїЄє]' lib/utils/abilities` ; every hit that is a UI label should already be reachable via `abilityRegistry.fields.*`/`options.*` (the editor uses `tr()`); remove the dead Cyrillic `label` literals from `FieldMeta`/options where the editor never reads them (verify with `FieldRenderer`/`registry-labels.ts`), or move to messages if it does.
- [ ] Step 2: engine/log strings (battle log, `state.ts:123`, engine `core/*`) are out of scope: list them in `docs/superpowers/plans/2026-10-29-ability-flow-leftovers.md` (file path + line) for i18n part 6 — do not translate.
- [ ] Step 3: commit `refactor(abilities): drop dead Cyrillic labels from registries`.

---

### Task 8: Consumers of `describeEffect` / `describeAbility`

**Files (known consumers):** `components/abilities/{EffectCard,AbilityPanel,AbilitySummary}.tsx`, `components/battle/wizards/{BonusActionPicker,AuraZonePicker}.tsx`, `lib/cache/info-reference.ts`, `lib/utils/battle/fx/spell-preview.ts`, `lib/utils/battle/view/effect-summary.ts`, `lib/utils/abilities/summary.ts`. Re-run `grep -rnE "describeAbility|describeEffect|describeTrigger|limitsLabel|amountLabel|flatLabel"` to catch any others.

**Interfaces — Produces:** `components/abilities/use-ability-text.ts`:
```ts
export function useAbilityText(): { effect: (e: Effect) => string; ability: (a: Ability) => string; segments: (s: readonly Segment[]) => string };
```
(wraps `useTranslator("abilityRegistry")`).

- [ ] Step 1: for each consumer decide client vs server: client components → `useAbilityText()`; pure battle utils that run in the client (`effect-summary`, `spell-preview`) → take a `t: Translator` argument from their calling component (update call sites and tests); `info-reference` (server, cached) → store `Segment[][]` in the cached payload (JSON-serializable, locale-independent) and render in the client component that shows it. Do not add locale to cache keys.
- [ ] Step 2: update tests of every touched consumer; `pnpm test:related` on all touched files.
- [ ] Step 3: add `lib/utils/abilities/**` (except the documented exceptions from Task 3/7) to `i18n-migrated.json`; `pnpm lint` must pass with no Cyrillic. Commit `refactor(abilities): consumers render segments; catalog migrated`.

---

### Task 9: `summarizeAbility` and server lists

**Files:** Modify `lib/utils/abilities/summary.ts`, `types/abilities.ts`, `lib/server/skills/format-skills-response.ts`, `lib/cache/{info-reference,artifact-reference}.ts`, `lib/server/characters/core/{sheet-handler,get-progression-handler}.ts`, `lib/server/artifacts/{artifact-set-queries,read-artifacts-list}.ts`, `lib/utils/units/to-unit.ts`, `app/campaigns/[id]/dm/print/skills/page.tsx`, matching tests (`format-skills-response.test.ts`, `info-reference.test.ts`, `summary.test.ts`, `to-unit.test.ts`, card tests).

**Interfaces — Produces:**
```ts
export interface AbilityFlowSummary { when: Segment[]; if: Segment[]; then: Segment[][]; limits: Segment[] }
export function summarizeAbility(a: Ability): AbilityFlowSummary;
export function abilitySummary(kind: OwnerKind, row: {...}): AbilityFlowSummary[];   // invalid abilities filtered as before
```
`withAbilitySummary` keeps its name and returns `abilitySummary: AbilityFlowSummary[]`.

- [ ] Step 1: failing tests in `summary.test.ts`: passive ability → `if: []`, `limits: []`; ability with condition `hpBelow` → `if` length 1; two effects → `then.length === 2`; ability invalid per schema is filtered — **Review Focus 5**; `JSON.parse(JSON.stringify(x))` equals `x`.
- [ ] Step 2: implement (`when = describeTrigger`, `if = a.condition ? describeCondition(a.condition) : []`, `then = effects.map(describeEffect)`, `limits = limitsSegments(a.limits)`); `describeAbilitySegments` from Task 5 must equal `[...when, ...limits, ...then.flat()]` (assert in a test so the string form cannot drift).
- [ ] Step 3: migrate all list consumers (types first, then tests); check the cached payloads (`info-reference`, `artifact-reference`) still serialize and their tests pass. Commit `feat(abilities): structured ability summary for lists`.

---

### Task 10: `AbilityFlow` component

**Files:** Create `components/abilities/AbilityFlow.tsx`, `components/abilities/__tests__/AbilityFlow.test.tsx`; Modify `components/abilities/index.ts`, `app/globals.css` (or the HUD token file; follow where `--hud-*` tokens are defined) for `--flow-when/if/then/limit` colours; delete `AbilitySummary.tsx` when unused.

**Interfaces — Produces:**
```tsx
type FlowPart = "when" | "if" | "then" | "limits";
export function AbilityFlow(props: { summary: AbilityFlowSummary; variant: "editor" | "card"; onChipClick?: (part: FlowPart) => void }): JSX.Element;
```
Uses `useAbilityText().segments`. Chips: КОЛИ (blue), ЯКЩО (amber), ТОДІ (red, one chip per effect), ЛІМІТ (grey); small caps label from `abilities.flow.{when,if,then,limit}` (new keys in `messages/*/abilities.json`); `if`/`limits` rendered only when non-empty; arrows hidden below 640px (use existing responsive utilities; chips wrap). With `onChipClick` chips are `<button>`, otherwise `<span>`.

- [ ] Step 1: failing tests (`@vitest-environment happy-dom`, render with the repo's intl test wrapper from `lib/i18n/test`): full ability renders four labelled groups; passive without condition/limits renders only КОЛИ + ТОДІ — **Review Focus 6**; unknown effect kind renders the fallback text, no throw — **Review Focus 1**; click on a chip calls `onChipClick("if")`; en locale shows English labels.
- [ ] Step 2: implement; replace `AbilitySummary` usage in `SkillCard`, `UnitCard`, `ArtifactCard`, `ArtifactSetCard`, `ArtifactSetBonusDisplay`, `app/campaigns/[id]/info`, `dm/artifact-sets/page-client.tsx` with `AbilityFlow variant="card"` (these receive `AbilityFlowSummary[]` from Task 9); update their tests.
- [ ] Step 3: commit `feat(abilities): AbilityFlow chips on cards`.

---

### Task 11: Editor integration and trigger groups

**Files:** Modify `components/abilities/AbilityPanel.tsx`, `sections/{TriggerSection,ConditionSection,EffectsSection,LimitsSection}.tsx`, `components/ui/select-field.tsx` (grouped options, only if not supported — check first), `lib/utils/abilities/registry/triggers.ts` (`group` field), `messages/{uk,en}/abilityRegistry.json` (`triggerGroups.*`, `triggers.<event>.hint`); Tests: `components/abilities/__tests__/AbilityPanel-flow.test.tsx`, `registry/__tests__/trigger-groups.test.ts`.

**Interfaces — Produces:** `TriggerDefinition.group: "always" | "boundaries" | "myTurn" | "incoming" | "outgoing" | "other"`; `export const TRIGGER_GROUPS: readonly TriggerGroup[]` (display order). Section roots get `id={\`${path}-section-when|if|then|limits\`}` and a left border using the flow colour token.

- [ ] Step 1: failing tests: every event has a `group` that is in `TRIGGER_GROUPS`, a `triggers.<event>.hint` and a `triggerGroups.<group>` in uk and en; `AbilityPanel` shows `AbilityFlow` that updates after changing the trigger select; clicking the «ТОДІ» chip scrolls the effects section into view (`scrollIntoView` mocked) and sets a transient highlight class.
- [ ] Step 2: inventory all events and assign groups (`passive`→always; `battleStart/roundStart/roundEnd`→boundaries; `turnStart/turnEnd/action/bonusAction`→myTurn; attacks/damage taken on me → incoming; `hit/kill/spell cast by me`→outgoing; rest → other); write hints (one sentence + example, uk+en); `roundStartHint` moves into the generic hint.
- [ ] Step 3: implement `TriggerSection` with grouped select + hint text; wire `AbilityPanel` (`AbilityFlow variant="editor"`, `summarizeAbility(ability)` memoised) replacing the small `describeAbility` paragraph; update `AbilityListEditor.test.tsx` and form tests that matched the old paragraph.
- [ ] Step 4: commit `feat(abilities): flow chips in editor, grouped triggers with hints`.

---

### Task 12: Docs, cleanup, full verification

- [ ] Step 1: update `docs/architecture/abilities.md` (segments, `summarizeAbility`, `AbilityFlow`, trigger groups), `docs/architecture/i18n.md` (abilities catalog migrated; leftovers list for part 6), `docs/STATUS.md`; archive nothing yet.
- [ ] Step 2: `pnpm exec tsc --noEmit`, `pnpm lint`, full `pnpm test:run`; fix failures. Run `/simplify` on the branch diff (1–2 agents).
- [ ] Step 3: live check on a local build (run a subagent on Sonnet): open DM skill create form → pick a template → chips update on trigger/effect change and on a skill card; switch locale to en and confirm no Cyrillic in chips. Report only; do not merge.
- [ ] Step 4: one final Opus review of the whole branch; then ask the user before merging (merge to `main` only in a temp worktree per the shared-checkout rule).
