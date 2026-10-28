# New Spell Model Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the old spell model (free-text effects, `effectDetails`, tags, damage distribution, concentration, skill "spell enhancements") with the spec's model: dice that scale with hero level and school mastery, explicit targeting and saves, and effects from the unified ability model.

**Architecture:** A spell row gets typed JSONB columns (`targeting`, `resolution`, `effects`, `raceModifiers`) plus `dice` and `cost`; Zod schemas live next to the ability schema and reuse `EffectSchema`. Casting becomes: validate cost/slot → resolve targets (spell targeting + skill `spellTargeting`) → per target: save roll → dice amount (player rolls, server validates count/sides) → apply effects through the ability registry (`applyEffect`) with the spell as the source → fire `spellCast` events (already carry id/school/level). Old columns stop being read (expand-only; dropped in a later migration).

**Tech Stack:** Prisma 6 (expand-only migration), Zod, Vitest, Next.js route mutations, TanStack Query hooks, existing ability editor components.

**Spec:** `docs/superpowers/specs/2026-10-08-spells-design.md` (§1, §3), parent `docs/superpowers/specs/2026-10-07-skills-rebalance-design.md`

## Global Constraints

- Migration is expand-only (add columns; no drops, no renames); `pnpm exec prisma migrate dev --name spell_model_v2` against the local Docker DB; no new tables (so no RLS change).
- Dice formula (spec §1): `(dice + ⌊casterLevel / 3⌋) d{sides} + casterLevel + castingMod`; sides by the caster's mastery level of the spell school's branch: none/basic → 6, advanced → 8, expert → 10; units: unit level, d6. Same for heal and DoT amounts (DoT rolled once).
- Effects reuse the ability model (`EffectSchema`, registry `apply`); no second effect format.
- Spell damage keeps school `damageBonus` from skills; `spellCast` events keep spellId/school/level.
- No new dependencies; Ukrainian UI text; minimal comments; layering (components never import `@/lib/api`); battle routes = Zod + `runBattleMutation`.
- Final: `pnpm test:run`, `pnpm lint`, `pnpm exec tsc --noEmit` (both configs), `pnpm build`, `pnpm simulate-battle` (LOCAL DB only).

## Review Focus

- Server validates player dice: count and sides must match the formula for this caster/spell; otherwise 422 (no cheating with extra dice).
- `save` with `half`: dice-based amounts halve, non-dice effects (debuffs/conditions) are skipped on success; `none`: nothing applies on success.
- Race modifiers: −100 % gives immunity (0 damage, no on-hit effects), +100 % doubles; applied after resistances? — rule: after school bonuses, before resistances.
- `everyone` targeting includes allies and the caster; `allyDead` only fallen allies; skill `spellTargeting` widens `ally`/`enemy` spells only.
- Units casting (`knownSpells`) and hero-power/DPR estimates (`lib/utils/battle/balance/stats.ts`) use the new formula.

---

### Task 1: Spell schema, migration, types

**Files:** `prisma/schema.prisma` (Spell: `dice Int @default(0)`, `cost String @default("action")`, `targeting Json @default("{\"kind\":\"enemy\"}")`, `resolution Json @default("{\"kind\":\"auto\"}")`, `spellEffects Json @default("[]")`, `raceModifiers Json @default("[]")`), migration, `lib/utils/spells/model/schema.ts` (Zod: `SpellTargetingSchema` with kinds `self|ally|enemy|allyDead|area{side,maxTargets}|allAllies|allEnemies|everyone`, `SpellResolutionSchema` `auto|save{ability,onSuccess}`, `RaceModifierSchema {raceId, percent −100..200}`, `SpellDefinitionSchema`), `types/spells.ts`, `lib/utils/spells/model/read.ts` (single reader of the new columns, like `abilities/read.ts`), tests.
- [ ] Tests: schema accepts each spec example (Вогняна куля area save half, Воскресіння allyDead, Армагеддон everyone, Слово світла raceModifiers); rejects area without side; reader returns defaults for empty rows.
- [ ] Commit `feat(spells): new spell model schema`.

### Task 2: Dice formula and validation

**Files:** `lib/utils/spells/model/dice.ts` (`spellDice(caster, spell, masteryOf): { count, sides, flat }`, `assertSpellDice(rolls, expected)`), mastery lookup from the caster's progression (how branch levels are read in battle — `lib/utils/skills/progression`/participant build), tests.
- [ ] Tests: hero L6 expert Вогняна куля dice 4 → 6d10 + 6 + mod; L2 none → 4d6; unit L5 → (4+1)d6 + 5; wrong count/sides rejected.
- [ ] Commit `feat(spells): dice scale with caster level and school mastery`.

### Task 3: Engine extensions for spell effects (spec §3 items 2–5, 7–11)

**Files:** ability schema/registry/engine (`hot` effect; `resistance.attackKind`; condition effects `skipActionChance {percent}` and `breakOnDamage`; `damageFalloff` on dealDamage over ordered targets; summon `{ unitId }` variant), battle turn start (hot ticks, skip-action roll), damage application (break-on-damage removal), tests per item.
- [ ] One commit per item group; tests mirror wave-1 style.

### Task 4: Control effects — Шал and Ляльковод

**Files:** effect `berserk { durationRounds, damageBonusPercent }` (at the target's turn start the server performs an attack on a random other living participant with the bonus, then ends the turn), effect `charm { rounds }` (temporary side + controlledBy swap, restored on expiry or death), turn/advance code, tests (berserk attacks an ally; charm returns side after 1 round; charm on hero rejected).
- [ ] Commit `feat(spells): berserk and charm control effects`.

### Task 5: Cast pipeline

**Files:** `lib/utils/battle/spell/*` (replace `process.ts` branches with the new flow; delete code paths only reachable from removed fields), `app/api/campaigns/[id]/battles/[battleId]/spell/spell-mutation.ts` (+ schema: `targetIds`, `diceRolls`, `saveRolls?`), `lib/utils/battle/spell/spell-targeting.ts` (map spell targeting + skill flags), race modifiers, `everyone`/`allyDead`, slots and `cost` (action/bonus), spellCast events, battle log text.
- [ ] Tests: each targeting kind; save half/none; race immunity; skill `spellTargeting all` widens an `ally` buff; Вогняна стіна DoT rolled once; Ланцюгова блискавка falloff; summon by unitId with summoner control.
- [ ] Commit `feat(spells): cast pipeline on the new model`.

### Task 6: Player spell book & wizard

**Files:** `lib/hooks/battle/useSpellBook.ts`, `lib/utils/battle/flows/spell-flow.ts`, `components/battle/wizards/SpellBook.tsx`: show dice formula for this caster («6к10 + 10»), target picking per targeting kind (auto for all/everyone/self), save rolls input when needed, dice slots = computed count/sides.
- [ ] Reducer/hook tests for each targeting kind and dice slot count.
- [ ] Commit `feat(spells): spell book shows scaled dice and new targeting`.

### Task 7: DM spell editor and cleanup

**Files:** `app/campaigns/[id]/dm/spells/*` form rebuilt (school, level, cost, dice, targeting, resolution, effects via the ability effect editors, race modifiers picker, description + appearanceDescription, icon), `lib/schemas/spells.ts`, `lib/api/spells.ts`, hooks; remove the free-text CSV import UI/route/parser (replaced by library seed later); skills: stop reading `spellEnhancement*` fields (form fields removed, `participant/spell-enhancers.ts` removed, progression keeps `spellNewSpellId` → rename usage to «дає заклинання»); balance `stats.ts` uses the new dice formula; units `knownSpells` cast through the same pipeline.
- [ ] Tests: form submit round-trip through the API; balance DPR uses dice formula; grep shows no reader of removed fields outside the migration.
- [ ] Commit per area.

### Task 8: Simulation + verification

- [ ] Simulation checks: Вогняна куля with save half on 3 enemies; Слово світла skips a human; Армагеддон hits the caster's side; Регенерація heals at turn start; Шал makes an enemy hit its ally; Ляльковод returns the unit after 1 round; spell dice rejected when wrong.
- [ ] Full verification (Global Constraints last line); commit `test(battle): simulation covers the new spell model`.
