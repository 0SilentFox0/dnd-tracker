# Ability Engine Extensions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the ability-engine mechanics the rebalanced skills need (spec §5): spell data on `spellCast`, skill-driven spell targeting, marks, guard, attack cancel, timed morale, formula percents, `ownerAttack` amounts, chance in log, full cleanse, dead-target bonus actions.

**Architecture:** Everything stays inside the unified ability model (`lib/utils/abilities/`): Zod schema → registry (labels, editor fields, `apply`) → engine reads via `collectModifiers`/`runAbilities`. Battle code (`lib/utils/battle/`) only gets narrow hooks: event payloads, damage split, target expansion. No DB migrations — abilities and `activeEffects` are JSONB. The editor (`AbilityListEditor`) is registry-driven, so new fields appear by adding `FieldMeta`.

**Tech Stack:** TypeScript strict, Zod, Vitest, Next.js route mutations (`runBattleMutation`).

**Spec:** `docs/superpowers/specs/2026-10-07-skills-rebalance-design.md` (§5)

## Global Constraints

- No DB migrations; no new dependencies.
- Old ability JSON must still parse (every new field optional; new union members only added).
- Every user-visible text in Ukrainian; identifiers English.
- `collectModifiers` stays the only reader of static bonuses; `lib/utils/abilities/read.ts` the only reader of `abilities` columns.
- ESLint: `padding-line-between-statements`, `simple-import-sort`, `import/no-cycle` (depth 1), `react-hooks/exhaustive-deps` error; minimal comments.
- Tests in sibling `__tests__/` (`lib/utils/abilities/__tests__`, `lib/utils/battle/**/__tests__`); reuse existing participant fixtures there (grep `makeParticipant`/`createTestParticipant` in those folders before writing new ones).
- After the last task: `pnpm test:run`, `pnpm lint`, `pnpm exec tsc --noEmit`, `pnpm simulate-battle` all green.

## Review Focus

- Spell targeting `all`: dead/unconscious participants and the caster's hidden/removed units must not be added; the server must reject more targets than the skill allows (client can be bypassed).
- Marks from two different heroes on one target: each hero's `perMark` bonus counts only its own marks.
- Guard when the guardian is down or the guard target is the guardian itself: no redirect, full damage to the target.
- `percentOf: "ownerAttack"` for a participant without attacks (pure caster/summon): resolves to 0, no throw.
- `targetDead` bonus action with a living target or no target: 400 with a Ukrainian error, ability use not consumed.

---

### Task 1: Spell data on `spellCast` + trigger filters

**Files:**
- Modify: `types/abilities.ts` (`AbilityEvent` spellCast member)
- Modify: `lib/utils/abilities/schema/triggers.ts`
- Modify: `lib/utils/abilities/registry/triggers.ts` (match + editor fields + describe)
- Modify: `lib/utils/battle/spell/process.ts:76,89` (emit spell data)
- Test: `lib/utils/abilities/__tests__/spell-cast-filters.test.ts`

**Interfaces:**
- Produces: event `{ type: "spellCast"; phase; actorId; targetIds; spellId?: string; school?: string | null; level?: number }`; trigger `{ event: "spellCast"; phase; role; spellIds?: string[]; school?: string; spellLevels?: number[] }`.

- [ ] **Step 1: Failing test** — build two participants (caster, target) with one resolved ability each and call `runAbilities` directly:

```ts
const trig = (extra: object) => ({ event: "spellCast", phase: "after", role: "caster", ...extra });
const cast = (over: object) => ({ type: "spellCast", phase: "after", actorId: "c", targetIds: ["t"], spellId: "fireball", school: "chaos", level: 3, ...over });

it.each([
  [{ spellIds: ["fireball"] }, {}, true],
  [{ spellIds: ["fireball"] }, { spellId: "ice" }, false],
  [{ school: "chaos" }, {}, true],
  [{ school: "chaos" }, { school: "light" }, false],
  [{ spellLevels: [1, 2] }, {}, false],
  [{}, { spellId: undefined, school: undefined, level: undefined }, true],
])("filter %o on %o fires=%s", (filter, over, fires) => {
  const caster = withAbility(makeParticipant("c"), { trigger: trig(filter), effects: [{ kind: "note", text: "x" }] });
  const r = runAbilities([caster, makeParticipant("t")], cast(over) as AbilityEvent, { round: 1, rng: () => 0 });

  expect(r.fired.length > 0).toBe(fires);
});
```

(`withAbility` = local helper that sets `battleData.resolvedAbilities` with `key`, `source`, `name` — copy the shape used in existing `run-abilities` tests.)

- [ ] **Step 2:** `pnpm test:run lib/utils/abilities/__tests__/spell-cast-filters.test.ts` → FAIL (schema rejects / no filtering).
- [ ] **Step 3: Implement.** Schema: `spellIds: z.array(z.string().min(1)).min(1).optional(), school: z.string().min(1).optional(), spellLevels: z.array(z.number().int().min(1).max(9)).min(1).optional()`. Matcher in `registry/triggers.ts:89` additionally requires `(!t.spellIds || (e.spellId && t.spellIds.includes(e.spellId))) && (!t.school || e.school === t.school) && (!t.spellLevels || (e.level !== undefined && t.spellLevels.includes(e.level)))`. Editor fields: `spellIds` (input `"spells"`), `school` (`"text"`), `spellLevels` (`"numberList"`), all optional; extend describe with «закляття: …», «школа …», «рівні …». In `process.ts` add `spellId: spell.id, school: spell.groupId, level: spell.level` to both `fire` calls.
- [ ] **Step 4:** test PASS; `pnpm test:run lib/utils/battle/spell` still green.
- [ ] **Step 5: Commit** `feat(abilities): spell id, school and level on spellCast triggers`

### Task 2: Skill-driven spell targeting (`area` / `all`)

**Files:**
- Modify: `lib/utils/abilities/schema/effects.ts` (new flag `spellTargeting`)
- Modify: `lib/utils/abilities/registry/effects/static.ts` (`FLAG_LABELS`, `FLAG_FIELDS`, `describeFlag`)
- Create: `lib/utils/battle/spell/spell-targeting.ts`
- Modify: `lib/utils/battle/spell/participant-spell-target-mode.ts`, `lib/hooks/battle/useSpellBook.ts:53`
- Modify: `app/api/campaigns/[id]/battles/[battleId]/spell/spell-mutation.ts` (expand + validate before `assertSpellRolls`)
- Modify: `lib/constants/api-errors.ts` (new text)
- Test: `lib/utils/battle/spell/__tests__/spell-targeting.test.ts`

**Interfaces:**
- Produces: flag `{ kind: "flag"; flag: "spellTargeting"; mode: "area" | "all"; spellIds?: string[]; school?: string; maxTargets?: number; maxLevel?: number }`.
- Produces: `spellTargetingFor(ps: BattleParticipant[], casterId: string, spell: { id: string; groupId: string | null; level: number }): { mode: "single" | "area" | "all"; maxTargets: number }` — `all` beats `area`; among `area`, max `maxTargets` (default 3); flags whose `maxLevel < spell.level` or whose `spellIds`/`school` don't match are ignored.
- Produces: `expandSpellTargets(ps, casterId, spell, chosenIds: string[]): string[]` — `single`: unchanged; `area`: unchanged (validated); `all`: every active participant (`isActive`) on the side of `chosenIds[0]`.
- Produces: `validateSpellTargetCount(targeting, count: number, spellType: string): boolean` — `aoe` spells and `all` always pass; single ≤ 1 (plus legacy multi-target enhancers); area ≤ `maxTargets`.

- [ ] **Step 1: Failing tests**

```ts
const spell = { id: "bless", groupId: "light", level: 2 };

it("no flag → single", () => {
  expect(spellTargetingFor([caster()], "c", spell)).toEqual({ mode: "single", maxTargets: 1 });
});

it("school area flag → area 3", () => {
  const c = caster([{ kind: "flag", flag: "spellTargeting", mode: "area", school: "light" }]);

  expect(spellTargetingFor([c], "c", spell)).toEqual({ mode: "area", maxTargets: 3 });
});

it("all beats area; maxLevel excludes level 5", () => {
  const c = caster([
    { kind: "flag", flag: "spellTargeting", mode: "area", school: "light" },
    { kind: "flag", flag: "spellTargeting", mode: "all", school: "light", maxLevel: 4 },
  ]);

  expect(spellTargetingFor([c], "c", spell).mode).toBe("all");
  expect(spellTargetingFor([c], "c", { ...spell, level: 5 }).mode).toBe("area");
});

it("all expands to active units on the first target's side", () => {
  const ps = [casterAllSpells(), ally("a1"), ally("a2"), downedAlly("a3"), enemy("e1")];

  expect(expandSpellTargets(ps, "c", spell, ["a1"]).sort()).toEqual(["a1", "a2", "c"]);
});

it("rejects more targets than the skill allows", () => {
  expect(validateSpellTargetCount({ mode: "area", maxTargets: 3 }, 4, "single_target")).toBe(false);
  expect(validateSpellTargetCount({ mode: "single", maxTargets: 1 }, 2, "single_target")).toBe(false);
  expect(validateSpellTargetCount({ mode: "single", maxTargets: 1 }, 5, "aoe")).toBe(true);
});
```

(`caster(effects)` = participant `c` on side `party` with one passive ability holding `effects`; `ally/enemy/downedAlly` from the existing fixtures with `combatStats.status` set.)

- [ ] **Step 2:** run → FAIL.
- [ ] **Step 3: Implement** schema member (`mode: z.enum(["area","all"])`, others optional, `maxTargets: z.number().int().min(2).optional()`, `maxLevel: z.number().int().min(1).max(9).optional()`); label «Режим цілей заклять»; describe «закляття школи X — по області (до N цілей)» / «… — на всіх». `spellTargetingFor` reads `findFlags(ps, casterId, "spellTargeting")`. `participantSpellAllowsMultipleTargets` keeps the legacy enhancer check OR `spellTargetingFor(...).mode !== "single"` — it needs `spell` (id, groupId, level) instead of `spellId`; update its single caller `useSpellBook.ts:53`, and for `all` the hook must auto-select: after the first target is chosen, the wizard shows «на всіх: N» (set `targetMode: "all"`; in `lib/utils/battle/flows/spell-flow.ts` treat `"all"` like `"single"` for picking, the server expands). In `spell-mutation.ts`: compute targeting, reject with 400 `API_ERRORS.SPELL_TOO_MANY_TARGETS` («Забагато цілей для цього закляття») when `validateSpellTargetCount` fails, then `data.targetIds = expandSpellTargets(...)` before rolls are checked (`assertSpellRolls` gets the expanded count).
- [ ] **Step 4:** tests PASS; `pnpm test:run lib/utils/battle/spell lib/hooks/battle app/api` green.
- [ ] **Step 5: Commit** `feat(spells): skills widen spell targets to area or all`

### Task 3: Marks on targets + `perMark` damage bonus

**Files:**
- Modify: `lib/utils/abilities/schema/effects.ts` (effect `mark`; `damageBonus.perMark?: string`)
- Modify: `lib/utils/abilities/registry/effects/state.ts` (`applyMark`), `registry/effects/index.ts`, `registry/effects/static.ts` (`damageBonusFields` + describe)
- Modify: `lib/utils/abilities/engine/collect-modifiers.ts` (damage query `targetId?`)
- Modify: `lib/utils/battle/damage/impl.ts:76-81` and the attack call chain to pass `targetId` in `context`
- Test: `lib/utils/abilities/__tests__/marks.test.ts`

**Interfaces:**
- Produces: effect `{ kind: "mark"; markId: string; duration: Duration; target? }` → stackable `ActiveEffect` on each target: `type: "debuff"`, `abilityKey: "mark:" + markId`, `source.participantId = ownerId`.
- Produces: `countMarks(target: BattleParticipant, markId: string, sourceId: string): number`.
- Produces: `ModifierQuery` damage variant `{ damage: { kind; school?; targetId?: string } }`; a `damageBonus` with `perMark` contributes `value × countMarks(target, perMark, ownerId)` (0 without `targetId`).

- [ ] **Step 1: Failing test** — hero `h` with abilities: (1) `hit` attacker → `mark {markId:"seq", duration:{rounds:2}, target:"eventTarget"}`; (2) passive `damageBonus {filter:{kind:"melee"}, percent:2, perMark:"seq"}`. Fire `hit` twice on `t`, once from another hero `h2` with the same ability; assert `countMarks(t,"seq","h") === 2` and `collectModifiers(ps,"h",{damage:{kind:"melee",targetId:"t"}}).percent === 4`, and without `targetId` → `0`.
- [ ] **Step 2:** run → FAIL.
- [ ] **Step 3: Implement.** `applyMark` uses `upsertTimedEffect(p, { timedKey: "mark:" + markId, stackable: true, type: "debuff", name: ability.name, rounds, source: effectSource(owner, ability) }, round)`; message `🎯 ${ability.name}: ${names} — мітка (${count})`. In `collectModifiers.add`, when `effect.kind === "damageBonus" && effect.perMark`, multiply flat and percent by `countMarks(findParticipant(participants, query.damage.targetId), effect.perMark, owner.basicInfo.id)`; skip the entry when the result is 0. Pass `targetId` from the attack flow into `calculateDamageWithModifiers` context (`hit.ts` → damage computation → `impl.ts`), add `targetId?: string` to that context type.
- [ ] **Step 4:** PASS; `pnpm test:run lib/utils/battle/attack lib/utils/battle/damage` green.
- [ ] **Step 5: Commit** `feat(abilities): stacking marks with per-mark damage bonus`

### Task 4: Guard (damage redirect)

**Files:**
- Modify: `lib/utils/abilities/schema/effects.ts` (effect `guard`)
- Modify: `lib/utils/abilities/registry/effects/state.ts` (`applyGuard`), `registry/effects/index.ts`
- Create: `lib/utils/battle/attack/process/guard.ts`
- Modify: `lib/utils/battle/attack/process/hit.ts:43`
- Test: `lib/utils/battle/attack/__tests__/guard.test.ts`

**Interfaces:**
- Produces: effect `{ kind: "guard"; percent: number (1–100); duration: Duration; target? }` → `ActiveEffect` on the guarded ally: `type: "buff"`, `abilityKey: "guard"`, `effects: [{ type: "guard", value: percent }]`, `source.participantId = guardianId`, not stackable (a new guard replaces the old).
- Produces: `splitGuardedDamage(ps, targetId, damage): { targetDamage: number; guardianId: string | null; guardianDamage: number }`.

- [ ] **Step 1: Failing tests** — `splitGuardedDamage` for: no guard → all to target; guard 50 % with active guardian → `floor(d/2)` to guardian, rest to target; guardian down → all to target; guardian === target → all to target.
- [ ] **Step 2:** run → FAIL.
- [ ] **Step 3: Implement** the split; in `hit.ts` replace the single `applyDamageToTarget` with: split → apply `targetDamage` to target, `guardianDamage` to guardian via `applyDamageToTarget`, `settleDowned` for both, push `🛡 ${guardianName} приймає ${n} шкоди за ${targetName}` to `flow.messages`. Applies to weapon hits only (spell damage untouched) — say so in the describe text «шкода від атак».
- [ ] **Step 4:** PASS; attack tests green.
- [ ] **Step 5: Commit** `feat(abilities): guard redirects part of attack damage to the guardian`

### Task 5: Cancel the attack when the attacker falls in `attack before`

**Files:**
- Modify: `lib/utils/battle/attack/process/run.ts:49`
- Test: `lib/utils/battle/attack/__tests__/preemptive-cancel.test.ts`

- [ ] **Step 1: Failing test** — target has `attack before` (role target, `attackKind: "melee"`, `limits.perRound: 1`) → `dealDamage {amount: 1000, target: "eventActor"}`; attacker attacks; expect `success: false`, target HP unchanged, attacker `status` not active, battle action text contains the ability name.
- [ ] **Step 2:** run → FAIL (attack proceeds).
- [ ] **Step 3: Implement** — change the guard to `if (!isActive(getP(flow, targetId)) || !isActive(getP(flow, attackerId)))`, same aborted-attack branch.
- [ ] **Step 4:** PASS. **Step 5: Commit** `fix(attack): attack is cancelled when the attacker falls before it lands`

### Task 6: Timed morale

**Files:**
- Modify: `lib/utils/abilities/schema/kinds.ts:34` (`TIMED_STATS` += `"morale"`)
- Modify: `lib/utils/battle/morale/effective-morale.ts`
- Test: `lib/utils/battle/morale/__tests__/effective-morale.test.ts` (extend)

- [ ] **Step 1: Failing test** — participant morale 2 with an activeEffect `abilityEffects: [{kind:"modifyStat", stat:"morale", flat: 1}]` → `effectiveMorale` = 3; morale 3 + 1 → 3 (cap); morale −1 + 1 → 0; schema accepts a `bonusAction` ability with `modifyStat morale flat 1 duration {rounds:2} target eventTarget`.
- [ ] **Step 2:** run → FAIL.
- [ ] **Step 3: Implement** — `raw = clamp(p.combatStats.morale + collectModifiers(all, id, { stat: "morale" }).flat, -3, 3)` before the `noNegativeMorale` check (baked stat → only activeEffects contribute, passives already baked).
- [ ] **Step 4:** PASS + `pnpm test:run lib/utils/battle` green. **Step 5: Commit** `feat(morale): temporary morale modifiers`

### Task 7: Formula in `percent`

**Files:**
- Modify: `lib/utils/abilities/schema/effects.ts` (`percent: FlatSchema.optional()` for `modifyStat` and `damageBonus`)
- Modify: `lib/utils/abilities/engine/collect-modifiers.ts` (`resolveFlat(effect.percent, owner)`)
- Modify: `registry/effects/static.ts` (percent field input `"flat"`; describe formulas as `(${formula})%`)
- Modify: any other reader of `.percent` on these effects — `grep -rn "\.percent" lib/utils/abilities lib/utils/battle | grep -v __tests__` and route numeric uses through `resolveFlat`
- Test: `lib/utils/abilities/__tests__/percent-formula.test.ts`

- [ ] **Step 1: Failing test** — passive `damageBonus {filter:{kind:"physical"}, percent:{formula:"3*morale"}}` on a hero with morale 2 → `collectModifiers(..., {damage:{kind:"melee"}}).percent === 6`; morale −1 → `-3`.
- [ ] **Step 2–4:** FAIL → implement → PASS; `pnpm exec tsc --noEmit` clean (types widen from `number` to `Flat`).
- [ ] **Step 5: Commit** `feat(abilities): formulas in percent bonuses`

### Task 8: `percentOf: "ownerAttack"`

**Files:**
- Modify: `lib/utils/abilities/schema/common.ts` (`percentOf: z.enum(["eventDamage", "maxHp", "ownerAttack"])`)
- Modify: `lib/utils/abilities/engine/amount.ts`
- Modify: callers of `resolveAmount` to pass `participants` (`registry/effects/hp.ts`)
- Modify: `registry/effects/hp.ts` describe («N % шкоди атаки»)
- Test: `lib/utils/abilities/__tests__/amount-owner-attack.test.ts`

**Interfaces:**
- Consumes: `averageAttackDamage(p, attack, all)` from `lib/utils/battle/damage/average.ts` (`.total`).
- Produces: `resolveAmount(amount, { owner, target?, eventDamage?, rng, participants? })`; `ownerAttack` = `floor(averageAttackDamage(owner, primaryAttack, participants ?? [owner]).total × value / 100)` where `primaryAttack` = the owner's first attack (check the attacks field on `BattleParticipant`, e.g. `battleData.attacks`); no attack → 0.

- [ ] **Step 1: Failing test** — hero with one melee attack whose average total is known from `averageAttackDamage`; `{percentOf:"ownerAttack", value:50}` → `floor(total/2)`; participant without attacks → 0; `dot` with this amount on a target stores that number as its per-round damage.
- [ ] **Step 2–4:** FAIL → implement → PASS. If importing `average.ts` into `amount.ts` trips `import/no-cycle`, inject instead: add `ownerAttackDamage?: (p: BattleParticipant) => number` to `AbilityRunContext` and set it where contexts are created in battle code (grep `rng: ` in `lib/utils/battle` for `AbilityRunContext` literals).
- [ ] **Step 5: Commit** `feat(abilities): amounts as a percent of the owner's attack`

### Task 9: Chance shown in the log

**Files:**
- Modify: `lib/utils/abilities/engine/run-abilities.ts`
- Test: `lib/utils/abilities/__tests__/run-abilities.test.ts` (extend)

- [ ] **Step 1: Failing test** — ability with `limits: { chance: 40 }` and `rng: () => 0` → every message produced by that ability ends with ` (шанс 40 %)`; ability without chance → messages unchanged.
- [ ] **Step 2–4:** FAIL → in the effect loop, `messages.push(...r.messages.map((m) => (ability.limits?.chance !== undefined ? `${m} (шанс ${ability.limits.chance} %)` : m)))` → PASS.
- [ ] **Step 5: Commit** `feat(abilities): show trigger chance in battle log`

### Task 10: Cleanse removes conditions too

**Files:**
- Modify: `lib/utils/abilities/schema/effects.ts` (`cleanse.includeConditions?: boolean`)
- Modify: `registry/effects/state.ts` (`applyCleanse`), `registry/effects/index.ts` (toggle field, describe)
- Test: `lib/utils/abilities/__tests__/cleanse.test.ts`

- [ ] **Step 1: Failing test** — target with one `debuff`, one `condition`, one `buff`: default cleanse keeps condition+buff; `includeConditions: true` keeps only the buff; message «знято дебафи та стани».
- [ ] **Step 2–4:** FAIL → filter `e.type !== "debuff" && !(effect.includeConditions && e.type === "condition")` → PASS.
- [ ] **Step 5: Commit** `feat(abilities): cleanse can remove conditions`

### Task 11: Dead-target bonus actions

**Files:**
- Modify: `lib/utils/abilities/schema/conditions.ts` (`{ type: "targetDead" }`)
- Modify: `lib/utils/abilities/registry/conditions.ts` (evaluate: event target exists and is not active; label «ціль мертва»)
- Modify: `app/api/campaigns/[id]/battles/[battleId]/bonus-action/bonus-action-mutation.ts`
- Modify: bonus-action target picker (find it: `grep -rn "bonusAction\|bonus-action" components/battle lib/hooks/battle | grep -i target`) — offer dead participants only for abilities whose condition tree contains `targetDead`, otherwise only active ones
- Modify: `lib/constants/api-errors.ts`
- Test: `app/api/__tests__/bonus-action-dead-target.test.ts` (follow the existing bonus-action/route test setup in `app/api/__tests__`)

- [ ] **Step 1: Failing test** — ability `bonusAction`, condition `targetDead`, `limits.perBattle: 2`, effect `restoreSpellSlot {count:1, target:"self"}`: dead target → slot restored, use recorded; living target → `BattleRuleError` with `API_ERRORS.BONUS_TARGET_MUST_BE_DEAD` («Ціль має бути мертвою»), slot unchanged, use not recorded, bonus action not spent; no target → same error.
- [ ] **Step 2:** run → FAIL.
- [ ] **Step 3: Implement** — helper `conditionRequiresDeadTarget(c?: Condition): boolean` (walks `all`/`any`) in `registry/conditions.ts`; mutation checks it before `runAbilities` and throws when the target is missing or `isActive`. Picker uses the same helper.
- [ ] **Step 4:** PASS. **Step 5: Commit** `feat(abilities): bonus actions that target the fallen`

### Task 12: Simulation steps + full verification

**Files:**
- Modify: the battle simulation script behind `pnpm simulate-battle` (see `package.json`) — add steps: marks stack and boost damage; guard splits damage; preemptive strike kills and cancels; Light buff with `spellTargeting all` hits every ally; chance suffix in the log.

- [ ] **Step 1:** add the steps following the script's existing step format; run `pnpm simulate-battle` → all steps pass (previous count + 5).
- [ ] **Step 2:** `pnpm test:run && pnpm lint && pnpm exec tsc --noEmit` → clean.
- [ ] **Step 3: Commit** `test(battle): simulation covers new skill mechanics`
