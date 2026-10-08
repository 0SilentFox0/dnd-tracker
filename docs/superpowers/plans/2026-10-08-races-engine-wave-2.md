# Races & Personal Abilities — Engine Wave 2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add racial skill icons and the engine mechanics that racial skills, ultimates and personal abilities need (spec §5b items 12–18).

**Architecture:** Same as wave 1: everything goes through the unified ability model (`lib/utils/abilities/`: Zod schema → registry (label, editor fields, `apply`) → engine), battle code gets narrow hooks. New active entry point `action` mirrors the existing bonus-action route/mutation/picker. No DB migrations (abilities and `activeEffects` are JSONB; participants live in the battle snapshot).

**Tech Stack:** TypeScript strict, Zod, Vitest, Next.js route mutations (`runBattleMutation`), TanStack Query hooks.

**Spec:** `docs/superpowers/specs/2026-10-07-skills-rebalance-design.md` (§4 «Раси», «Персональні здібності»; §5b; §6 «Іконки рас»)

## Global Constraints

- No DB migrations; no new dependencies; old ability JSON must still parse (new fields optional, union members only added).
- User-visible text Ukrainian (errors from `lib/constants/api-errors.ts`); identifiers English; minimal comments.
- `collectModifiers` stays the only reader of static bonuses; layering: components never import `@/lib/api`, logic in hooks/`lib`, components call and render.
- ESLint: `padding-line-between-statements`, `simple-import-sort`, `import/no-cycle` (depth 1), `react-hooks/exhaustive-deps` error.
- Battle rule errors are `BattleRuleError` (→ 422). Rejections happen before anything is consumed.
- Anything written to `battle_participants.snapshot` must keep `snapshotHash` in sync (go through the existing pipeline/`saveBattle`; new participants via the same path summons use).
- Final: `pnpm test:run`, `pnpm lint`, `pnpm exec tsc --noEmit`, `pnpm build`, `pnpm simulate-battle` (LOCAL Docker DB only) green.

## Review Focus

- `action` abilities: using one consumes the main action (`hasUsedAction`) and respects limits; can't be used when the main action is spent or during a pending morale panic.
- `summon`/`raiseDead`: summoned/raised units join the initiative order correctly, have an owner, survive save/reload (snapshot + delta), and `raiseDead` never targets heroes or living units.
- Multi-target bonus/action: server enforces `maxTargets` and target validity independently of the client.
- `maxStacks`: the N+1-th application refreshes/ignores instead of adding a stack; `actionsPerTurn` grants extra actions at each own turn start and stops when the effect ends.
- `minMorale` interacts correctly with `noNegativeMorale`/`ignoreMorale` and the formula morale core (`lib/utils/abilities/engine/morale.ts`).

---

### Task 1: Racial skill icons

**Files:** Modify `data/skill-icons.ts`, `data/__tests__/skill-icons.test.ts`; run `scripts/import-wiki-icon-bundle.ts`; upload.

- [ ] Add 28 keys to `SKILL_ICONS` generated from a table — races `humans: Counterstrike, demons: Gating, elves: Avenger, necromancers: Necromancy, mages: Artificer, dark-elves: IrresistibleMagic, dwarves: Runelore`, levels `basic|advanced|expert|ultimate` → key `racial-<race>-<level>`, file `H5<Basic|Advanced|Expert|Ultimate><Skill>.png`.
- [ ] Test: 28 `racial-*` keys, each file matches `^H5(Basic|Advanced|Expert|Ultimate)[A-Za-z]+\.png$`, all in bucket `skill-icons`.
- [ ] Run `pnpm import-wiki-icons .superpowers/bundles/dnd-race-icons-bundle.json` → expect exactly 28 new `assets/skill-icons/racial-*.webp`, real WEBP (`file`), then «Усі іконки вже є» on rerun.
- [ ] Commit `feat(skills): racial skill icons from original H5 racial skills`. Upload to prod Storage is done by the controller after review (needs user OK).

### Task 2: Small flags and stats (items 15, 17, maxStacks part of 16)

**Files:** `lib/utils/battle/resistance/index.ts` (`matchesDamageType`), `lib/utils/abilities/schema/effects.ts`, `schema/ability.ts`, `registry/effects/static.ts`, `lib/utils/abilities/engine/morale.ts`, `lib/utils/battle/morale/effective-morale.ts`, `lib/utils/abilities/engine/timed-effects.ts`, tests in sibling `__tests__/`.

**Interfaces:**
- Resistance flag `damageType: "all"` matches every damage type (physical, elemental, spell).
- Flag `{ kind: "flag", flag: "minMorale", value: int −3..3 }`: combined morale = `max(value, …)` applied after the clamp and after `noNegativeMorale`; `ignoreMorale` still wins (→ 0). Both `effectiveMorale` and the formula core use it (formula core: owner's own flag only, as with the other flags).
- `Ability.maxStacks?: int ≥ 1` (only meaningful with `stackable: true`): `upsertTimedEffect` gets `maxStacks`; when the target already holds `maxStacks` effects with this `timedKey`, the oldest one's duration is refreshed instead of adding a stack.

- [ ] Tests: resistance all 20 % reduces fire, slashing and spell damage; `minMorale 1` turns raw −2 into 1, raw 3 stays 3, `ignoreMorale` → 0; formula `3*morale` with `minMorale 1` at raw −2 → 3; `maxStacks 2` → third application leaves 2 stacks with refreshed duration.
- [ ] Commit per item group (`feat(abilities): resistance to all damage`, `feat(morale): minimum morale flag`, `feat(abilities): stack cap for timed effects`).

### Task 3: Extra actions per turn (item 16)

**Files:** `schema/kinds.ts` (`TIMED_STATS` += `"actionsPerTurn"`, add to `BAKED_STATS`/`STAT_KEYS` as needed), turn start in `lib/utils/battle/turn/` (where `turnStart` resets action flags), tests.

**Interfaces:** timed `modifyStat actionsPerTurn flat N` → at the owner's turn start, `battleData.pendingExtraActions += N` (sum of active timed flats). Жага крові = `kill {role: killer}` → `modifyStat actionsPerTurn +1 duration 99`, `stackable: true`, `maxStacks: 1|2|3`.
- [ ] Tests: hero with two stacks gets 2 extra actions at each own turn start, none after the effect expires; kill trigger + maxStacks 2 → third kill adds nothing.
- [ ] Commit `feat(abilities): extra actions per turn`.

### Task 4: `action` trigger (item 12)

**Files:** `schema/triggers.ts` (`{ event: "action" }`), `types/abilities.ts` (event `{ type: "action"; actorId; abilityKey; targetIds?: string[] }`), `registry/triggers.ts`, new route `app/api/campaigns/[id]/battles/[battleId]/ability-action/route.ts` + `ability-action-mutation.ts` (mirror `bonus-action/*`), `lib/api/battles.ts`, mutation hook in `lib/hooks/battles/useBattles.ts` via `useBattleAction`, player-turn UI next to the bonus-action picker (reuse `BonusActionPicker` logic/helpers from `lib/utils/battle/view/hero.ts`, generalised by trigger), `lib/constants/api-errors.ts`.

**Interfaces:** mutation checks: participant control, not panicking, ability exists with `trigger.event === "action"`, `!actionFlags.hasUsedAction`, `withinLimits`, target rules (dead-target condition from wave 1, `maxTargets` from Task 5); then `runAbilities` and `hasUsedAction: true`; event type `ability` like bonus actions. Bonus-action route stays unchanged.
- [ ] Tests (route-level, follow `app/api/__tests__/battles/` setup): action consumes main action; second action in the same turn → 422; limit perBattle 1 respected; Ангел Хранитель shape (action, perBattle 1, `targetDead`, `heal {percentOf: maxHp, value: 50, revive: true}` on eventTarget) revives a dead ally at 50 %.
- [ ] Commit `feat(abilities): abilities used as the main action`.

### Task 5: Multi-target active abilities + advantage for attackers (item 14)

**Files:** `schema/ability.ts` (`maxTargets?: int ≥ 1` on abilities with `bonusAction`/`action` trigger), events carry `targetIds`, `engine/events.ts` (`eventTargetIds`), both mutations validate `targetIds.length ≤ maxTargets` (default 1) and target validity, pickers allow multi-select up to N; flag `advantageForAttackers` in `schema/effects.ts` + attack roll (mirror where `disadvantageForAttackers` is read).
- [ ] Tests: Мисливець shape (bonusAction, maxTargets 3, `flag advantageForAttackers` on eventTarget, duration 1) marks 3 enemies; 4 targets → 422; an ally attacking a marked enemy rolls with advantage; advantage + disadvantage cancel as in the existing roll logic.
- [ ] Commit `feat(abilities): multi-target active abilities and advantage for attackers`.

### Task 6: `summon` and `raiseDead` effects (items 13, 13b)

**Files:** `schema/effects.ts`, `registry/effects/` (new `summon.ts`), reuse `lib/utils/battle/spell/append-summoned-unit.ts` (extract a shared helper if it is spell-specific), unit templates source for the battle (how spell summons find `summonedUnitTemplateId` — follow that path; templates must be available to the mutation without extra per-request DB reads beyond what spell summons already do), tests.

**Interfaces:**
- `{ kind: "summon", group: string, tier: int 1–7, count?: int ≥1 }` → picks a random unit template of that campaign group and tier (rng from ctx), appends `count` participants on the owner's side, `battleData.summonedBy = ownerId`, joins initiative like spell summons. No template → message «немає юніта групи X Tier N», nothing consumed beyond the ability use.
- `{ kind: "raiseDead", hpPercent: 1–100 }` applied to event targets that are dead, non-hero units: side → owner's side, `summonedBy = ownerId`, status active, `currentHp = floor(maxHp × hpPercent / 100)`, removed timed effects; heroes/living targets are skipped with ⛔ message.
- [ ] Tests: Відкриття воріт (bonusAction, perBattle 1, `summon {group: "Демони", tier: 5}`) adds one demon with owner, survives a save/reload round trip (participant patch/upsert in the delta); Підняття мертвих (action, perBattle 1, maxTargets 2, `targetDead`, `raiseDead {hpPercent: 90}`) flips two dead enemy units to the necromancer's side at 90 %; a dead hero target is refused.
- [ ] Commit `feat(abilities): summon and raise dead effects`.

### Task 7: `hasMark` / `not` conditions (item 18)

**Files:** `schema/conditions.ts`, `registry/conditions.ts`, tests.

**Interfaces:** `{ type: "hasMark", who: ConditionSubject, markId, bySelf?: boolean }` (uses `countMarks` from wave 1), `{ type: "not", condition }`.
- [ ] Test Семгрун shape: `attack before (role target)`, condition `not hasMark {who: eventActor, markId: "semgrun", bySelf: true}`, effects: `flag disadvantage` on eventActor (action modifier) + `mark {markId: "semgrun", duration 1}` on eventActor → first attack of each attacker per round has disadvantage, second doesn't, next round again yes.
- [ ] Commit `feat(abilities): mark and negation conditions`.

### Task 8: Simulation + full verification

- [ ] Add simulation checks to `scripts/simulate-battle.ts` (new-mechanics campaign): action ult revive; demon summon; raise dead; Мисливець advantage; Жага крові extra actions; Семгрун first-attack disadvantage; Рунна броня resistance all.
- [ ] Run full verification (Global Constraints last line) and paste summaries in the report.
- [ ] Commit `test(battle): simulation covers racial mechanics`.
