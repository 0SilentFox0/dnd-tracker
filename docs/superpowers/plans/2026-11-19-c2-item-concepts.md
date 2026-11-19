# C2 — Item Concepts (initial save, target-conditional attack, weapon-bound attack, breath-weapon advantage) — Implementation Plan

> **For agentic workers:** use superpowers:subagent-driven-development (Sonnet implementers). Design only; nothing here is implemented yet. Steps use `- [ ]`.

**Goal:** close the four engine gaps that `4f3e771ef`/`e98ca61ea` left as notes or approximations in the SRD 5.2 combat items. Owner decision 2026-11-19: do all four.

| # | Concept | SRD item | Today (`scripts/srd/overrides/magic-items.ts`) |
|---|---------|----------|---------------------------------------------|
| 1 | Initial saving throw on effects an ability applies | Dagger of Venom | `mark venom-coat` + `note` "DC 15 Con save or 2d10 + Poisoned" (nothing happens on a hit) |
| 2 | Attack bonus only against a given target | Mace of Smiting (+3 vs Construct) | only the +2 damage half via a `hit` → `dealDamage 2`; the +2 to hit is missing |
| 3 | Bonus action = one attack with *this* weapon | Scimitar of Speed | `grantAction extraActions: 1` (a whole extra action, usable for anything) |
| 4 | Advantage on saves vs breath weapons (of a creature type) | Dragon Scale Mail | missing (only AC +1 and the parameter resistance) |

**Context:** branch `fix/canon-tails`, worktree `/Users/silentfox/Work/dnd-tracker-canon3`. Never touch `/Users/silentfox/Work/dnd-tracker`.

## Global constraints

- Core names no system: every new field is generic data (ability/effect/flag/spell-resolution). The d20 save roll (`systems/d20/rules/saves/roll-save.ts`) is the only system file that reads the new save-source data; other systems ignore it.
- Abilities engine rule: bonuses and flags only via `collectModifiers` / `runAbilities`; the `abilities` column only via `lib/utils/abilities/read.ts`.
- No migration: all new fields live in existing JSON columns (`abilities`, `spells.resolution`, `battle_participants.snapshot`). Anything writing `snapshot` already goes through the patch path that writes `snapshotHash`.
- i18n: new texts are keys in `messages/{en,uk}/*.json`; no Cyrillic in code; one-line English comments only where non-obvious.
- Agents write tests but do not run the full suite: `pnpm test:related <files>` / single files; lint per touched folder; `pnpm cycles` once per batch. The full `pnpm test:run` stays with the epic's final gate (see memory `project-canon-tails`).
- Template data changes need `pnpm srd:build` (regenerates `data/templates/srd-5.2/*.json`); publishing the template to prod stays with the end of the epic and the owner's «так».

## Reused (no new mechanism where one exists)

| Need | Reused |
|------|--------|
| Save roll, legendary resistance | `savesOf(rules).roll` / `.resolve` (`lib/utils/battle/saves/access.ts`), as in `hit-rider.ts` `riderSave` and `spell/cast/outcome.ts` |
| Bound to the item | `ability.source.id` = `attackSourceOf(attack).attackSourceId` (`lib/utils/battle/attack/source.ts`), the same equality `withThisItem` uses (`registry/conditions.ts`) |
| Per-attack bonus | `attack` / `phase: 'before'` trigger → `applyStatic` returns `actionModifiers` → `extra` in `attackBonusOf` (`attack/process/run.ts:122`, `bonus.ts previewBefore`) — already works, only the per-target condition evaluation is wrong (D2) |
| Creature-type check | `targetCreatureType` condition, `hasCreatureTypeCondition`, `conditionEventForTarget` |
| Mark lifecycle | `mark` effect, `hasMark` condition, `markKey` + `removeEffects` (`engine/effects/marks.ts`, `battle/conditions/query.ts`) |
| Attack economy | `attacksLeft` pool pattern (`attack/attacks-left.ts`), `resetTurnState` (`turn/turn-state.ts`), `redact-participants.ts` field list |
| Save flags | `saveAdvantage` flag + `modeFrom` filter (`vsSpells` precedent) |
| Editor rows | `FieldMeta` rows in `registry/effects/index.ts`, `registry/effects/flags.ts`; ability sections pattern `components/abilities/sections/PerformSection.tsx` |

## Decisions

| # | Decision |
|---|----------|
| D1 | **Initial save is ability-level**, not per effect: `Ability.save?: { ability: AbilityKey; dc: number }` (dc int 1–30). One roll per **non-owner** target id, cached per firing, so Dagger's damage and Poisoned share one roll. A target that succeeds gets none of the ability's effects; effects that resolve to the owner (`self`) always apply. Hostile targets go through `saves.resolve` (legendary resistance). `vsSpell` is **false** (an item is not a spell). Allowed only on non-passive triggers (validation `abilities.validation.savePassive`). No `onSuccess: 'half'` now (no SRD item needs it; add later as a field). Log: `abilityText.log.initialSave` `{ target, ability, total, dc, success }`. |
| D1b | **New effect `removeMark { markId, target? }`** (generic, static: false) removes the target's marks with that id via `removeEffects(p, e => markKey match)`. Dagger: the hit ability removes `venom-coat` from `self` after the save ("1 minute or until you hit"). |
| D2 | **Fix per-target condition evaluation in `runAbilities`:** when `perTarget` (creature-type condition) and a resolved effect target is the **owner** while the event does not target the owner, evaluate the condition with the **original event** (not `conditionEventForTarget(event, ownerId)`). Today a self-targeted `modifyStat attackBonus` under `targetCreatureType` checks the attacker's own type. No schema change. Mace: new ability `smite-construct-hit`: `attack/before/attacker`, condition `all[withThisItem, targetCreatureType construct]`, effect `modifyStat attackBonus flat 2` (self, no duration — action-scoped). Keeps the existing +2 damage `hit` ability. |
| D3 | **`grantAction.itemAttacks?: number`** (int 1–4): grants N attacks usable only with the ability's source item. State `battleData.boundAttacks?: { sourceId: string; left: number }[]`; cleared in `resetTurnState` (same place as `attacksLeft`), added to the redact list. Needs `ability.source.id` (item); without one the effect is a no-op with no log. Spending: in `spendAttack` (`attack/off-hand.ts`), if a bound entry matches `attackSourceOf(attack)` → decrement it and do **not** touch the main action / `attacksLeft`; else existing `spendFromPool`. Allowed check in `attack-phase/request.ts`: the `ACTION_USED` reject is skipped when `canAttackWithBound(attacker, attack)`; a wrong weapon with only bound attacks left → `API_ERRORS.BOUND_ATTACK_WEAPON` (new key). Off-hand path unchanged. `canAttackFromPool(p)` (UI "attack left") becomes true also when any bound entry has `left > 0`. Scimitar: `grantAction { itemAttacks: 1 }` replaces `extraActions: 1`. |
| D4 | **Save source tags.** `SAVE_SOURCE_TAGS = ['breath'] as const` (`lib/utils/abilities/schema/kinds.ts`, extensible). Spell `resolution` (kind `save`) gains `tags?: SaveSourceTag[]` (JSON column, no migration). `SaveRollInput` gains `source?: { tags?: readonly SaveSourceTag[]; creatureType?: string | null }`. Flag `saveAdvantage` gains `vsTags?: SaveSourceTag[]` and `vsCreatureTypes?: string[]`; `modeFrom` keeps an entry only if every present filter matches (`vsTags` ∩ source.tags ≠ ∅; source.creatureType matches case-insensitively). `spell/cast/outcome.ts` passes `source: { tags: def.resolution.tags, creatureType: state.caster.abilities.creatureType }`. Converters set `tags: ['breath']` on monster actions whose name matches `/\bBreath\b/` (not "Water Breathing"/"Hold Breath": those are not save actions) and on Dragonborn breath spells. Dragon Scale Mail: passive `saveAdvantage { abilities: 'all', vsTags: ['breath'], vsCreatureTypes: ['dragon'] }`. Spell editor: a "Breath weapon" toggle in `SpellResolutionFields` when kind is `save`. |
| D5 | Describe/summary: new segments for ability `save`, `removeMark`, `itemAttacks`, `vsTags`/`vsCreatureTypes`; update `describe-golden` snapshot (it was already hand-edited on this branch — regenerate with `-u` and review the diff). |

## Signatures

```ts
// lib/utils/abilities/schema/ability.ts
save: z.object({ ability: AbilityKeySchema, dc: z.number().int().min(1).max(30) }).strict().optional()

// lib/utils/abilities/schema/effects.ts
const RemoveMarkSchema = z.object({ kind: z.literal('removeMark'), markId: z.string().min(1), ...target });
GrantActionSchema: + itemAttacks: z.number().int().min(1).max(4).optional()   // refine: itemAttacks counts as a grant
saveAdvantage flag: + vsTags: z.array(z.enum(SAVE_SOURCE_TAGS)).min(1).optional(), vsCreatureTypes: z.array(z.string().trim().min(1).max(60)).min(1).max(20).optional()

// lib/utils/abilities/engine/core/initial-save.ts (new)
export function rollInitialSaves(ability: ResolvedAbility, ownerId: string, targetIds: string[], ps: BattleParticipant[], ctx: AbilityRunContext):
  { failed: Set<string>; participants: BattleParticipant[]; messages: LogLine[] }

// lib/utils/battle/attack/attacks-left.ts
export function boundAttackFor(p: BattleParticipant, attack: BattleAttack): number          // index or -1
export const canAttackWithBound = (p, attack) => boundAttackFor(p, attack) >= 0
export function grantBoundAttacks(p, sourceId: string, n: number): BattleParticipant

// lib/utils/spells/model/schema.ts  (save variant)
tags: z.array(z.enum(SAVE_SOURCE_TAGS)).min(1).optional()

// lib/utils/battle/saves/types.ts
SaveRollInput.source?: { tags?: readonly SaveSourceTag[]; creatureType?: string | null }
```

## Test cases

- **initial-save** (`lib/utils/abilities/__tests__/initial-save.test.ts`): hit ability with `save {constitution, 15}` + `dealDamage 2d10` + `applyCondition poisoned` on `eventTarget`: forced fail (rng/presetRoll) → damage + Poisoned + one log line; forced success → neither; one roll for both effects (spy on `saves.roll`, called once per target); self-targeted `removeMark` applies on both outcomes; hostile with legendary resistance → resisted; passive + `save` → validation issue `savePassive`.
- **removeMark**: removes only marks with that id from the target; no-op without one.
- **per-target self fix** (`run-abilities` test): `attack/before` ability, condition `targetCreatureType ['construct']`, effect `modifyStat attackBonus +2` self → `actionModifiers[attacker]` has it vs a construct, not vs a humanoid; attacker who is itself a construct attacking a humanoid → no bonus (regression of the bug). Existing creature-type tests (Dragon Slayer, Holy Avenger `hit` damage on `eventTarget`) stay green.
- **Mace** (`scripts/srd/__tests__/magic-combat-items.test.ts`): `calculateAttackBonus` path via `predictAttack`/`previewBefore` → +2 vs construct, 0 vs other, only with the mace.
- **bound attacks** (`lib/utils/battle/attack/__tests__/bound-attacks.test.ts`): grant → `boundAttacks [{sourceId, left:1}]`; attack with the item after the main action → allowed, spends bound, `attacksLeft` untouched; attack with another weapon → `BOUND_ATTACK_WEAPON`; attack with the item before the main action → spends bound, `hasUsedAction` stays false; `resetTurnState` clears; `canAttackFromPool` true with bound only; redacted for other viewers.
- **save tags** (`systems/d20/rules/saves/__tests__/roll-save-tags.test.ts`): `vsTags ['breath'] vsCreatureTypes ['dragon']` → advantage vs a dragon's breath, normal vs a dragonborn breath (humanoid), normal vs a dragon's non-breath save spell, normal without `source`; existing `vsSpells` behaviour unchanged.
- **converter** (`scripts/srd/__tests__/monster-actions.test.ts`): `Fire Breath (Adult Red Dragon)` has `resolution.tags ['breath']`; a non-breath save action has none; Dragonborn breath spells carry it.
- **items data** (`magic-combat-items.test.ts`): Dagger hit ability has `save` and no `note`; Scimitar uses `itemAttacks: 1`; Dragon Scale Mail has the breath flag; all rows pass `validateAbilities`.

## Tasks

### Batch A — engine, schema, editor rows (one Sonnet dispatch)

- [ ] **A1. Initial save + `removeMark`.** Schema (`ability.ts` field + superRefine `savePassive`; `effects.ts` `RemoveMarkSchema` in the union and kinds lists), registry row in `registry/effects/index.ts` (apply in `state.ts` next to `cleanse`, describe), `engine/core/initial-save.ts`, hook it into `run-abilities.ts` after `withinLimits`/chance and before the effect loop (filter `targetIds` of each effect by `failed`, owner always kept). Ability editor: small `SaveSection.tsx` in `components/abilities/sections/` (ability select + DC number, hidden for passive) wired in `AbilityPanel.tsx`; summary segment in `lib/utils/abilities/summary.ts`. i18n `abilityRegistry.json`, `abilityText` log, `abilities.validation.savePassive` in en/uk. Tests above.
- [ ] **A2. Per-target self fix.** `run-abilities.ts` per-target filter per D2; test above.
- [ ] **A3. Bound attacks.** Schema + registry field row (`{ name: 'itemAttacks', input: 'number', optional: true }`) + describe (`summary.effects.grantItemAttacks`); `applyGrantAction` calls `grantBoundAttacks(p, ability.source.id, n)`; `types/battle.ts` `boundAttacks`; `attacks-left.ts` helpers; `off-hand.ts spendAttack`; `attack-phase/request.ts` checks; `turn-state.ts` reset; `view/redact-participants.ts`; `API_ERRORS.BOUND_ATTACK_WEAPON` + `errors.json` en/uk. Check `usePlayerTurn.ts` attack button uses `canAttackFromPool` (no other UI change). Tests above.
- [ ] **A4. Save source tags.** `SAVE_SOURCE_TAGS` in `schema/kinds.ts`; spell resolution field; `SaveRollInput.source`; `roll-save.ts modeFrom` (+ `saveRollMode` opts); `outcome.ts` passes source; `saveAdvantage` flag schema + `flags.ts` row fields (`vsTags` multi-select, `vsCreatureTypes` strings) + segment; `SpellResolutionFields.tsx` breath toggle; i18n (`abilityRegistry.json`, spells form keys) en/uk. Tests above.
- [ ] **A-gate.** `pnpm test:related` on touched files, `pnpm exec eslint --fix` on touched files, `pnpm cycles`, `NODE_OPTIONS=--max-old-space-size=8192 pnpm exec tsc --noEmit`. Commit per task with explicit paths.

### Batch B — SRD data, docs (one Sonnet dispatch, after A)

- [ ] **B1. Overrides.** `scripts/srd/overrides/magic-items.ts`: Dagger (`coat-blade` keeps mark; new `venom-hit`: `hit/attacker`, condition `all[withThisItem, hasMark self venom-coat]`, `save {constitution, 15}`, effects `dealDamage '2d10' poison eventTarget`, `applyCondition poisoned 10 rounds eventTarget`, `removeMark venom-coat self`; drop the `note`); Mace `smite-construct-hit` (D2); Scimitar `itemAttacks: 1`; Dragon Scale Mail breath flag as a `UNIQUE_ABILITIES['srd-2024_dragon-scale-mail']` entry (appended in `convert/magic-items.ts:581` after the generated `parameter-resistance` from `item-casting.ts`). Update descriptions (English) and `data/templates/srd-5.2/i18n/uk.json` for any changed/new ability names/descriptions.
- [ ] **B2. Converters.** `scripts/srd/convert/monster-actions.ts` (`tags: ['breath']` by name), `scripts/srd/convert/race-choices.ts` (Dragonborn breath). `pnpm srd:build`; review the `artifacts.json`/`spells.json` diff (only the expected rows change); leave the unrelated uncommitted `coverage-4f5b.json` change alone.
- [ ] **B3. Snapshot + docs.** Regenerate `describe-golden` snapshot and review; `docs/architecture/abilities.md` (one bullet: ability `save`, `removeMark`, `itemAttacks`/`boundAttacks`, `saveAdvantage vsTags/vsCreatureTypes`, per-target self rule), `docs/architecture/battle.md` (bound attacks in the attack economy, breath `resolution.tags`), `docs/STATUS.md` canon-tails row (C2 done). Commit with explicit paths.

The epic's final gate (full `pnpm test:run`, sweep on `prodcopy_tails`, browser on `next start`, review) covers C2 together with the Counterspell tasks; live-check scenarios to add there: Dagger coat → hit → save log; Scimitar bonus attack only with the scimitar; Mace to-hit vs a construct; dragon breath vs a Dragon Scale Mail wearer (advantage in the save log).
