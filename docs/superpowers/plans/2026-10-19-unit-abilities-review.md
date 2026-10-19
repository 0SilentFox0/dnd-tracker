# Unit Abilities Review — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the per-unit ability decisions from the 2026-10-19 review (plus the already-written opposing-spells and Haste/Slow speed changes), then reseed the library units on prod.

**Architecture:** Most changes are library data (`data/library/units/*.ts`, `data/library/unit-abilities.ts`). New engine mechanics are added as small, separately tested pieces: a round cooldown limit, a retaliation counter, spell-school filters on resistance/absorb, a `cells_moved` formula variable, a spell-cast-on-hit flag, a "copy ally's Light buffs" trigger/effect, map aim for active abilities, and four map mechanics (strike-and-return, piercing shot, fire wave, griffin dive/squall). Engine rules live in `lib/utils/**`, routes stay thin (`runBattleMutation` + `*-mutation.ts`), client wiring goes through `lib/api/battles.ts` → `lib/hooks/battles/useBattles.ts` → `lib/hooks/battle/*` → components.

**Tech Stack:** Next.js 16, React 19, TypeScript strict, Zod, Vitest, Prisma 6.

**Spec:** `docs/superpowers/specs/2026-10-19-unit-abilities-review.md`

## Global Constraints

- All user-facing text (ability names, descriptions, log lines) in Ukrainian; identifiers in English.
- Minimal comments: only non-obvious "why", one line.
- Import order via `pnpm lint --fix`; blank lines around `const`/`if`/`return` (`padding-line-between-statements`).
- Components never import `@/lib/api/*`; requests in `lib/api/battles.ts`, logic in hooks.
- Any new per-participant runtime field in `battleData` must be added to `lib/utils/battle/store/split-participant.ts:24` (state keys) and `lib/utils/battle/store/participant-patch.ts:14` (patchable fields), otherwise it lands in the immutable snapshot.
- Ability `dealDamage` uses `applyRawDamage` (no resistance). New damage introduced by this plan (fire wave, fire burst, dive, squall, piercing shot) MUST go through `applyResistance` (`lib/utils/battle/resistance/index.ts:77`).
- Battles without a map must keep working; every map mechanic has a no-map fallback defined in the spec.
- Tests: Vitest in sibling `__tests__/` folders. `pnpm test:run`, `pnpm exec tsc --noEmit -p .`, `pnpm lint` must be green after every task.
- Work on branch `feat/unit-abilities-review` (create from `main`); commit after every task with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- No migrations needed (all new state lives in `battleData` JSON).

## Review Focus

1. Griffin lands while its landing cell is occupied by an ally / is a wall / is off-map → it must land on the nearest free standable cell, never overlap (`canStand`). Test in Task 12.
2. Airborne griffin is the last living unit of its side → the battle waits for its turn (it lands and fights on); victory must NOT be declared while it is airborne. Test in Task 12.
3. Strike-and-return happens within the maiden's own turn, so nobody can take her start cell meanwhile (user decision); keep only a defensive `canStand` check (rule error, no overlap) — no dedicated UX. Test in Task 9.
4. Shadow Mistress hit-spell on a target immune to spells / with `conditionImmunity` (e.g. Black Dragon, Earth Elemental) → the spell simply does not take effect (user decision), attack still resolves. Test in Task 7.
5. Opposing spells: re-casting the SAME spell must refresh it, not remove itself; stackable Frailty stacks are removed all at once by Stoneskin; incidental −init debuffs (Lightning bolt, Roots, Wasp swarm, Circle of winter) DO strip Haste's initiative part (user decision). Already tested in `lib/utils/battle/spell/__tests__/opposing-spells.test.ts` (Task 1).

---

### Task 1: Branch + commit the already-written spell changes

Already implemented in the working tree (uncommitted on `main`): opposing spells cancel each other (`lib/utils/abilities/engine/effects/opposing-spells.ts`, wired in `lib/utils/abilities/registry/effects/static.ts`), Haste/Slow also change `speed` ±10 ft (`data/library/spells.ts`, `TIMED_STATS` += `speed` in `lib/utils/abilities/schema/kinds.ts`, `movementBudget` reads timed speed in `lib/utils/battle/grid/path.ts`, `isRoundCounted` in `lib/utils/battle/turn/effects.ts`), tests in `lib/utils/battle/spell/__tests__/{opposing-spells,library-spells-light,library-spells-dark}.test.ts`.

**Files:** the ones above + `docs/superpowers/specs/2026-10-19-unit-abilities-review.md` + this plan.

- [ ] **Step 1:** `git checkout -b feat/unit-abilities-review`
- [ ] **Step 2:** `pnpm test:run && pnpm exec tsc --noEmit -p . && pnpm lint` — expect all green.
- [ ] **Step 3: Commit**

```bash
git add data/library/spells.ts lib/utils/abilities lib/utils/battle/grid/path.ts lib/utils/battle/turn/effects.ts lib/utils/battle/spell/__tests__ docs/superpowers/specs/2026-10-19-unit-abilities-review.md docs/superpowers/plans/2026-10-19-unit-abilities-review.md
git commit -m "feat(spells): opposing spells cancel each other; haste/slow change speed"
```

---

### Task 2: Pure data changes (spell lists, removals, swaps)

No engine changes. Edit library units only.

**Files:**
- Modify: `data/library/units/dark-elves.ts`, `mages.ts`, `demons.ts`, `elves.ts`, `dwarves.ts`, `necromancers.ts`
- Test: `data/library/__tests__/unit-review-2026-10-19.test.ts` (create)

Changes (by unit key):

| key | change |
|---|---|
| `dark-elves-shadow-witch` | `spellKeys: ["weakness", "slow", "frailty", "plague"]` |
| `dark-elves-shadow-matriarch` | `spellKeys: ["weakness", "slow", "frailty", "plague", "confusion", "suffering", "sorrow"]` |
| `mages-mage` | `spellKeys: ["eldritch-arrow", "stone-spikes", "ice-bolt", "lightning-bolt", "summon-air-elemental"]` |
| `mages-archmage` | `spellKeys: ["fireball", "fire-wall", "circle-of-winter", "chain-lightning", "meteor-shower", "cleansing"]` (keep `restoreSlotOnce`) |
| `demons-cave-demon` | `spellKeys: ["fireball", "frailty"]` |
| `demons-cave-lord` | `spellKeys: ["fireball", "frailty", "meteor-shower"]` |
| `elves-druid` | `spellKeys: ["lightning-bolt", "stone-spikes"]` |
| `elves-elder-druid` | `spellKeys: ["lightning-bolt", "stone-spikes", "stoneskin"]` |
| `elves-forest-ranger` | `abilities: [stun("Приголомшливий постріл", 40)]` (remove `hatred`) |
| `elves-wild-ent` | add `stun("Сплутування", 25)` |
| `dwarves-flame-priest` | `spellKeys: ["ice-bolt", "lightning-bolt", "fireball", "fire-wall"]` |
| `dwarves-arkat-priest` | append `"evasion"` to `spellKeys` |
| `necromancers-skeleton`, `-skeleton-archer`, `-skeleton-warrior` | remove `boneBody()`; archer keeps only `undead`; warrior keeps `bigShield()`. Delete `boneBody` helper if unused. |

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from "vitest";

import { UNITS } from "@/data/library/units";

const unit = (key: string) => {
  const u = UNITS.find((x) => x.key === key);

  if (!u) throw new Error(key);

  return u;
};

const abilityNames = (key: string) => unit(key).abilities.map((a) => a.name);

describe("огляд юнітів 2026-10-19 — дані", () => {
  it("заклинання", () => {
    expect(unit("dark-elves-shadow-witch").spellKeys).toEqual(["weakness", "slow", "frailty", "plague"]);
    expect(unit("dark-elves-shadow-matriarch").spellKeys).toEqual(["weakness", "slow", "frailty", "plague", "confusion", "suffering", "sorrow"]);
    expect(unit("mages-mage").spellKeys).toEqual(["eldritch-arrow", "stone-spikes", "ice-bolt", "lightning-bolt", "summon-air-elemental"]);
    expect(unit("mages-archmage").spellKeys).toEqual(["fireball", "fire-wall", "circle-of-winter", "chain-lightning", "meteor-shower", "cleansing"]);
    expect(unit("demons-cave-demon").spellKeys).toEqual(["fireball", "frailty"]);
    expect(unit("demons-cave-lord").spellKeys).toEqual(["fireball", "frailty", "meteor-shower"]);
    expect(unit("elves-druid").spellKeys).toEqual(["lightning-bolt", "stone-spikes"]);
    expect(unit("elves-elder-druid").spellKeys).toEqual(["lightning-bolt", "stone-spikes", "stoneskin"]);
    expect(unit("dwarves-flame-priest").spellKeys).toEqual(["ice-bolt", "lightning-bolt", "fireball", "fire-wall"]);
    expect(unit("dwarves-arkat-priest").spellKeys).toContain("evasion");
  });

  it("здібності", () => {
    expect(abilityNames("elves-forest-ranger")).toEqual(["Приголомшливий постріл"]);
    expect(abilityNames("elves-wild-ent")).toContain("Сплутування");
    expect(abilityNames("mages-archmage")).toContain("Енергетичний канал");
    for (const key of ["necromancers-skeleton", "necromancers-skeleton-archer", "necromancers-skeleton-warrior"]) expect(abilityNames(key)).not.toContain("Кістяне тіло");
    expect(abilityNames("necromancers-skeleton-warrior")).toContain("Великий щит");
  });
});
```

- [ ] **Step 2:** `pnpm test:run data/library/__tests__/unit-review-2026-10-19.test.ts` — FAIL.
- [ ] **Step 3:** Apply the table. Ranger: replace `hatred(...)` with `stun("Приголомшливий постріл", 40)`; import `stun` in `elves.ts`.
- [ ] **Step 4:** Run the new test + `data/library/__tests__` (library/unit-budget tests may assert old spell counts or power budget — if `unit-budget.test.ts` fails because a unit's budget moved, adjust ONLY the expected numbers that the spec change implies and note it in the commit message).
- [ ] **Step 5: Commit** `feat(units): review 2026-10-19 data — spell lists, ranger stun, skeletons`

---

### Task 3: Round cooldown limit (`limits.cooldownRounds`)

Used by Dive, Squall, Fire burst (2 rounds) and Onslaught (3 rounds).

**Files:**
- Modify: `lib/utils/abilities/schema/ability.ts:8-13` (LimitsSchema), `lib/utils/abilities/engine/core/usage.ts`, `types/battle.ts` (abilityUsage entry type), editor labels if limits are listed (`grep -rn "perBattle" lib/utils/abilities/registry components/abilities` — add the field next to `perBattle` with label «Перезарядка (раунди)»), `lib/utils/battle/view/hero.ts` (show «перезарядка: N р.» where perBattle usage is displayed — `grep -n "perBattle" lib/utils/battle/view`)
- Test: `lib/utils/abilities/__tests__/cooldown.test.ts`

**Interfaces:**
- Produces: `limits.cooldownRounds?: number` (int ≥ 1). Runtime: `abilityUsage[key].lastRound?: number`. `withinLimits(p, ability, round)` returns false while `round - lastRound <= cooldownRounds`. Exported helper `cooldownLeft(p, ability, round): number` (0 = ready).

Semantics: used in round R with `cooldownRounds: 2` → unavailable in R+1 and R+2, available in R+3.

- [ ] **Step 1: Failing test**

```ts
import { describe, expect, it } from "vitest";

import { makeParticipant } from "@/lib/utils/abilities/__tests__/fixtures";
import { cooldownLeft, recordUse, withinLimits } from "@/lib/utils/abilities/engine/core/usage";
import type { ResolvedAbility } from "@/types/abilities";

const ability = { id: "a", key: "k", name: "Пікірування", trigger: { event: "action" }, limits: { cooldownRounds: 2 }, effects: [{ kind: "note", text: "x" }], source: { type: "unit", id: "u", name: "u" } } as unknown as ResolvedAbility;

describe("cooldownRounds", () => {
  it("недоступна 2 раунди після використання", () => {
    const used = recordUse(makeParticipant({ id: "g" }), ability, 1);

    expect(withinLimits(used, ability, 2)).toBe(false);
    expect(cooldownLeft(used, ability, 2)).toBe(2);
    expect(withinLimits(used, ability, 3)).toBe(false);
    expect(withinLimits(used, ability, 4)).toBe(true);
    expect(cooldownLeft(used, ability, 4)).toBe(0);
  });
});
```

Adjust `recordUse`/`withinLimits` call shapes to the real signatures in `usage.ts` (read it first; if they don't take `round`, add a `round` parameter and update all call sites found by `grep -rn "withinLimits\|recordUse" lib app`).

- [ ] **Step 2:** run — FAIL.
- [ ] **Step 3:** Implement: add `cooldownRounds: z.number().int().min(1).optional()` to LimitsSchema; in `recordUse` store `lastRound: round`; in `withinLimits` add `if (limits.cooldownRounds && usage.lastRound !== undefined && round - usage.lastRound <= limits.cooldownRounds) return false;`; `cooldownLeft = Math.max(0, usage.lastRound + cooldownRounds + 1 - round)`.
- [ ] **Step 4:** In `BonusActionPicker` (`components/battle/wizards/BonusActionPicker.tsx`) disable an ability whose cooldown is running and show «ще N р.» — compute in the hook/view (`lib/utils/battle/view/hero.ts`), not in the component.
- [ ] **Step 5:** run all ability tests + tsc + lint; commit `feat(abilities): cooldownRounds limit`.

---

### Task 4: Retaliation counter (Defender of Faith: 2 retaliations per round)

**Files:**
- Modify: `lib/utils/abilities/schema/effects.ts` (new flag), `lib/utils/abilities/registry/labels.ts` (flag label), `lib/utils/battle/attack/retaliation.ts:71-86`, `lib/utils/battle/turn/start-end.ts:131`, `lib/utils/battle/turn/advance-turn.ts:84`, `types/battle.ts` (`battleData.retaliationsUsed?: number`), `split-participant.ts`, `participant-patch.ts`, `data/library/unit-abilities.ts`, `data/library/units/humans.ts`
- Test: `lib/utils/battle/attack/__tests__/retaliation-count.test.ts`

**Interfaces:**
- Produces: flag `{ kind: "flag", flag: "extraRetaliations", count: number }` (int 1..5). Helper `export const extraRetaliations = (count = 1): Ability` in `unit-abilities.ts`, name «Подвійна відсіч», description «Відповідає на атаки двічі за раунд.» (for count 1).

Logic in `resolveRetaliation` (non-provoked, not unlimited): `allowed = 1 + sum(extraRetaliations.count)`; `used = battleData.retaliationsUsed ?? (hasUsedReaction ? 1 : 0)`; refuse if `used >= allowed`; on retaliate set `retaliationsUsed = used + 1` and `hasUsedReaction = used + 1 >= allowed`. Reset `retaliationsUsed` to 0 wherever `hasUsedReaction` resets at own turn start / extra turn.

- [ ] **Step 1: Failing test** — build attacker A and defender D (`createMockParticipant`, enemy sides, D with `battleData.resolvedAbilities` containing the new ability — copy how `lib/utils/battle/attack/__tests__` builds participants with abilities, e.g. grep `unlimitedRetaliation` in tests). Call `resolveRetaliation` three times in a row (feeding back the returned participants): expect non-null, non-null, null. Without the flag: non-null, null.
- [ ] **Step 2:** FAIL. **Step 3:** implement. **Step 4:** PASS.
- [ ] **Step 5:** `humans-defender-of-faith`: `abilities: [extraRetaliations()]`, delete local `cleave`. Extend Task 2 data test file with `expect(abilityNames("humans-defender-of-faith")).toEqual(["Подвійна відсіч"])`.
- [ ] **Step 6:** test/tsc/lint; commit `feat(units): defender of faith retaliates twice per round`.

---

### Task 5: Onslaught (Ракшас-кшатрій) — bonus action self-buff

Depends on Task 3.

**Files:** `data/library/units/mages.ts`, data test file.

```ts
const onslaught: Ability = {
  id: "unit-onslaught",
  name: "Натиск",
  description: "Бонусна дія: +3 до ініціативи і +2 до атаки на 2 раунди. Перезарядка 3 раунди.",
  trigger: { event: "bonusAction" },
  limits: { cooldownRounds: 3 },
  effects: [
    { kind: "modifyStat", stat: "initiative", flat: 3, duration: { rounds: 2 }, target: "self" },
    { kind: "modifyStat", stat: "attackBonus", flat: 2, duration: { rounds: 2 }, target: "self" },
  ],
};
```

`mages-rakshasa-kshatriya`: `abilities: [falloff("Вихор клинків"), onslaught]`.

- [ ] **Step 1:** Add to data test: ability present, `AbilitySchema.parse(onslaught)` succeeds (import schema from `@/lib/utils/abilities/schema`).
- [ ] **Step 2:** Engine test in `lib/utils/abilities/__tests__/onslaught.test.ts`: run `runAbilities` with `{type:"bonusAction", actorId, abilityKey}` (copy the call shape from `app/api/campaigns/[id]/battles/[battleId]/bonus-action/bonus-action-mutation.ts`) → `collectModifiers(ps, id, {stat:"attackBonus"}).flat === 2` and initiative +3.
- [ ] **Step 3:** implement data, PASS, commit `feat(units): kshatriya onslaught`.

---

### Task 6: Spell-school filters — Elemental Gargoyle aura & Magnetic Golem absorb

**Files:**
- Modify: `lib/utils/abilities/schema/effects.ts` — add `school: z.string().min(1).optional()` to the `resistance` flag; add new flag `{ flag: "spellAbsorb", school: string, percent: 1..100 }`
- Modify: `lib/utils/battle/resistance/index.ts` — `ResistanceOptions.school?: string`; a resistance flag with `school` applies only when `opts.school === flag.school` (and only for spell damage); flags without `school` behave as before
- Modify: `lib/utils/battle/spell/cast.ts:166-180` — pass `{ school: spell.groupId }` to `applyResistance`; after damage is applied, if the target has `spellAbsorb` flags with `school === spell.groupId`, heal `floor(finalDamage * percent / 100)` (cap at maxHp) and push `💚 ${name}: поглинає ${n} HP (${abilityName})`
- Modify: `lib/utils/abilities/registry/labels.ts` (labels for new flag/field)
- Modify: `data/library/unit-abilities.ts`, `data/library/units/mages.ts`
- Test: `lib/utils/battle/spell/__tests__/school-filters.test.ts`

Data (school value is the school NAME; `remapRefs` maps the `school` key to the DB group id at seed time — `scripts/seed/seed-library-lib.ts:100`, so it matches `spell.groupId` at runtime):

```ts
export const chaosVulnerabilityAura = (): Ability => ({
  id: "unit-chaos-vulnerability-aura",
  name: "Аура стихій",
  description: "Аура: вороги поруч отримують на 25 % більше шкоди від заклинань Хаосу.",
  trigger: { event: "passive" },
  effects: [{ kind: "flag", flag: "resistance", damageType: "spell", percent: -25, school: "Хаос", target: "nearbyEnemies" }],
});

export const chaosAbsorb = (): Ability => ({
  id: "unit-chaos-absorb",
  name: "Магнітне поле",
  description: "Лікується на 50 % шкоди, яку по ньому завдають заклинання Хаосу.",
  trigger: { event: "passive" },
  effects: [{ kind: "flag", flag: "spellAbsorb", school: "Хаос", percent: 50 }],
});
```

`mages-elemental-gargoyle`: `[construct(), chaosVulnerabilityAura()]`; `mages-magnetic-golem`: `[construct(), magicResist(50), chaosAbsorb()]`.

Note: Golem keeps `magicResist(50)`, so absorb heals 50 % of the already-halved damage — this is intended (heal is on damage actually taken).

- [ ] **Step 1: Failing tests** (use the `spellOf`/`unit`/`cast` helpers pattern from `lib/utils/battle/spell/__tests__/library-spells-light.test.ts`; in tests the spell's `groupId` is the school name, so the flag's `school: "Хаос"` matches directly):
  1. Target with an active zone/static flag `resistance spell -25 school "Хаос"` hit by `eldritch-arrow` with fixed dice takes 125 % damage; hit by a Light/Nature damage spell takes 100 %.
  2. Target with `spellAbsorb Хаос 50` and 100/100 HP minus damage D ends at `100 - D + floor(D/2)`; a non-Chaos damage spell gives no heal.
- [ ] **Step 2:** FAIL. **Step 3:** implement. **Step 4:** PASS + full `lib/utils/battle/spell` and `resistance` tests.
- [ ] **Step 5:** data + data-test lines; commit `feat(units): chaos vulnerability aura, chaos absorb`.

---

### Task 7: Shadow Mistress — random Dark spell on hit

**Files:**
- Modify: `lib/utils/abilities/schema/effects.ts` — new flag `{ flag: "castSpellOnHit", spellIds: string[] (min 1), attackKind?: AttackKind }` (key `spellIds` → remapped to DB ids by seed)
- Create: `lib/utils/battle/attack/process/hit-spell.ts` — `export function castHitSpell(input: { attacker; targetId; participants; spells: ReadonlyMap<string, CastableSpell>; round; battleId; rng }): { participants: BattleParticipant[]; messages: string[] } `: collects attacker's `castSpellOnHit` flags (`findFlags`), picks one id uniformly with `rng`, looks it up in `spells` (skip silently if missing), calls `castSpell({ caster: attacker, spell, targetIds: [targetId], allParticipants, currentRound: round, battleId, diceRolls: [], rng, isDMCast: true })` (no slot use — verify `isDMCast` skips slot consumption in `cast.ts`; if it doesn't, add `free: true` param that skips `consumeSlot`), returns `allParticipantsUpdated` and the result text as one message `🌑 ${attacker}: ${spell.name} → ${target}`. Saves: pass no `saveRolls` → engine auto-rolls via `rng` (verify in `cast.ts` that missing save rolls are rolled with `rng`; if not, roll `rollDie(20, rng)` here for spells with `resolution.kind === "save"`).
- Modify: `lib/utils/battle/attack/process/hit.ts` (after the `hit` event, ~line 71) — call `castHitSpell` when the hit landed and target is still active
- Modify: `app/api/campaigns/[id]/battles/[battleId]/attack/attack-mutation.ts` — before `runAttackPhase`, collect `spellIds` from the attacker's `castSpellOnHit` flags, load them with `prisma.spell.findMany({ where: { id: { in } } })`, convert with the same converter the spell mutation uses (`grep -n "toCastable" app/api/campaigns/\[id\]/battles/\[battleId\]/spell/spell-mutation.ts`), pass `hitSpells: Map` through `runAttackPhase` → process attack input (add optional field; default empty map)
- Modify: `data/library/unit-abilities.ts`, `data/library/units/dark-elves.ts`
- Test: `lib/utils/battle/attack/__tests__/hit-spell.test.ts`

Data:

```ts
const MISTRESS_SPELLS = ["weakness", "slow", "frailty", "plague", "confusion", "suffering", "sorrow"];

export const hitSpell = (name: string, spellIds: string[]): Ability => ({
  id: "unit-hit-spell",
  name,
  description: "Влучання накладає на ціль випадкове закляття Темряви 1–3 рівня (рятівні кидки — як у закляття).",
  trigger: { event: "passive" },
  effects: [{ kind: "flag", flag: "castSpellOnHit", spellIds }],
});
```

`dark-elves-shadow-mistress`: `abilities: [hitSpell("Тіньове прокляття", MISTRESS_SPELLS)]` (remove `debuff("Удар відчаю"...)`), keep `spellKeys: ["suffering"]`.

- [ ] **Step 1: Failing tests:**
  1. `castHitSpell` with `spells` = {frailty} and `rng` fixed → target gets an activeEffect named «Немічність».
  2. With `spells` = {slow} and `rng` making the save succeed (roll 20) → no effect; with roll 1 → «Сповільнення».
  3. Review Focus #4: target with `conditionImmunity all` / `spellImmunity` → `castHitSpell` returns participants unchanged except log message «імунітет», no throw.
  4. Missing id in `spells` → no change, no throw.
- [ ] **Step 2:** FAIL. **Step 3:** implement. **Step 4:** PASS + `lib/utils/battle/attack` tests.
- [ ] **Step 5:** data; commit `feat(units): shadow mistress casts a random dark spell on hit`.

---

### Task 8: Light Unicorn — copies allies' Light buffs

**Files:**
- Modify: `lib/utils/abilities/schema/triggers.ts:23` — `spellCast` gains `whose: z.enum(["self", "ally"]).optional()`; with `role: "target", whose: "ally"` the trigger matches when an ACTIVE ally of the owner (not the owner) is in `event.targetIds`
- Modify: `lib/utils/abilities/registry/triggers.ts:109-115` — implement the match
- Modify: `lib/utils/abilities/schema/effects.ts` — new effect `{ kind: "copySpellBuffs" }` (no fields)
- Create: `lib/utils/abilities/registry/effects/copy-buffs.ts` — handler: for the event's `spellId`, take from the first ally target the `activeEffects` with `abilityKey?.startsWith(`spell:${spellId}#`)` and `type === "buff"`, and `upsertTimedEffect` copies onto the owner (same `timedKey = abilityKey`, same `abilityEffects`, `rounds = duration`, `stackable: false`), message `✨ ${owner}: отримує «${name}» (${abilityName})`
- Modify: `lib/utils/abilities/registry/effects/index.ts` (register), labels
- Modify: `data/library/units/elves.ts`
- Test: `lib/utils/abilities/__tests__/copy-spell-buffs.test.ts`

Data (`school` remapped to group id by seed; tests use the name):

```ts
const lightEcho = (): Ability => ({
  id: "unit-light-echo",
  name: "Світле відлуння",
  description: "Коли союзник отримує баф від закляття Світла, єдиноріг теж його отримує.",
  trigger: { event: "spellCast", phase: "after", role: "target", whose: "ally", school: "Світло" },
  effects: [{ kind: "copySpellBuffs", target: "self" }],
});
```

`elves-light-unicorn`: `[unicornAura(), lightEcho()]` (remove `radiance`; delete the helper if unused). Check `ability.ts` validation allows a non-passive effect without duration for this kind — add `copySpellBuffs` to whatever allow-list is needed.

- [ ] **Step 1: Failing tests** (cast via `castSpell` so the real `spellCast` event fires):
  1. Ally caster casts `stoneskin` on ally A; Light Unicorn U (same side) → U has «Кам'яна шкіра» and `collectModifiers(ps, U, {stat:"armor"}).flat === 3`.
  2. `haste` → U gets both Haste parts.
  3. Cast on U itself → no duplicate (exactly one «Кам'яна шкіра» on U).
  4. Dark spell on an enemy / Nature buff on ally → U unchanged.
  5. Enemy-side unicorn does not copy our buffs.
- [ ] **Step 2:** FAIL. **Step 3:** implement. **Step 4:** PASS.
- [ ] **Step 5:** data; commit `feat(units): light unicorn echoes allies' light buffs`.

---

### Task 9: Turn-start position + Strike-and-return (Blood maidens)

**Files:**
- Modify: `types/battle.ts` — `battleData.turnStartPosition?: GridPoint`, `battleData.returnedThisTurn?: boolean`; add both to `split-participant.ts` and `participant-patch.ts`
- Modify: `lib/utils/battle/turn/start-end.ts:135` (`processStartOfTurn`) — set `turnStartPosition = position` (when on map), `returnedThisTurn = undefined`; same in `advance-turn.ts:89` extra-turn reset
- Modify: `lib/utils/abilities/schema/effects.ts` — flag `strikeAndReturn`
- Modify: `app/api/campaigns/[id]/battles/[battleId]/move/move-mutation.ts` + its route schema — new optional `returnToStart: true`: allowed only if mover has `strikeAndReturn`, `actionFlags.hasUsedAction` (attacked this turn), `!returnedThisTurn`, `turnStartPosition` set, and `canStand` at `turnStartPosition`; moves there at cost 0, sets `returnedThisTurn: true`. Otherwise throw `BattleRuleError` with «Повернутися неможливо: клітинка зайнята» / «Повернення доступне лише після атаки».
- Create: `lib/utils/battle/grid/return-to-start.ts` — `export function returnToStartError(map, ps, mover): string | null` (pure, used by mutation and UI)
- Modify: `lib/api/battles.ts` (`move` accepts `returnToStart`), `lib/hooks/battles/useBattles.ts`, `lib/hooks/battle/useBattleMapScene.ts` (expose `canReturn` + `returnToStart()`), `components/battle/map/MapTokenHud.tsx` (button «Повернутися» when `canReturn`)
- Modify: `data/library/unit-abilities.ts` (`strikeAndReturn()` helper: name «Удар і повернення», description «Після атаки може безкоштовно повернутися на клітинку, з якої почав хід.»), `data/library/units/dark-elves.ts` (blood maiden, fury, sister)
- Test: `lib/utils/battle/grid/__tests__/return-to-start.test.ts`, extend `app/api/__tests__` move tests if a move-mutation test exists (`grep -rln "move-mutation" app lib`)

- [ ] **Step 1: Failing tests** for `returnToStartError`: null when flag+attacked+free; message when no flag; when not attacked; when already returned; defensive: if something stands on `turnStartPosition` → «клітинка зайнята» (no overlap). And `processStartOfTurn` stores `turnStartPosition`.
- [ ] **Step 2:** FAIL. **Step 3:** implement engine + mutation. **Step 4:** PASS.
- [ ] **Step 5:** client wiring + button; component test optional (happy-dom) if `MapTokenHud` has tests.
- [ ] **Step 6:** commit `feat(units): blood maidens strike and return`.

---

### Task 10: Wind Dancer — +2 damage per cell moved

**Files:** `lib/utils/abilities/engine/core/amount.ts:10-18` (`formulaContext` += `cells_moved: p.battleData.movementUsed ?? 0`), formula docs/labels if variables are listed (`grep -rn "lost_hp_percent" lib components`), `data/library/units/elves.ts`, test `lib/utils/abilities/__tests__/cells-moved.test.ts`.

```ts
const windStep = (): Ability => ({
  id: "unit-wind-step",
  name: "Танець вітру",
  description: "+2 до шкоди за кожну клітинку, пройдену цього ходу до удару.",
  trigger: { event: "passive" },
  effects: [{ kind: "damageBonus", filter: { kind: "melee" }, flat: { formula: "cells_moved * 2" } }],
});
```

`elves-wind-dancer`: `abilities: [windStep()]`.

- [ ] **Step 1: Failing test:** participant with the ability and `movementUsed: 3` → `collectModifiers(ps, id, { damage: { kind: "melee" } }).flat === 6`; `movementUsed` 0/undefined → 0. Also verify the flat formula is evaluated with the owner (it is: `resolveFlat(effect.flat, owner)`).
- [ ] **Step 2–4:** FAIL → implement → PASS (also check `evaluateFormula` accepts `*` and the new variable).
- [ ] **Step 5:** commit `feat(units): wind dancer damage per cell moved`.

---

### Task 11: Map aim for active abilities + resisted ability damage helper

Infrastructure for Tasks 12–14 (fire burst, dive, squall). Piercing shot and fire wave (Task 13) do not need aim.

**Files:**
- Modify: `lib/utils/abilities/schema/ability.ts` — optional `aim?: { kind: "cell" | "direction"; range: number /* feet */ }` (only for `action`/`bonusAction`)
- Modify: ability-action & bonus-action route schemas + mutations — optional `targetCell: { x, y }`; when `ability.aim` is set and the battle has a map, `targetCell` is required and must be within `range` of the actor (`aimInRange` from `lib/utils/battle/grid/template.ts`); without a map `targetCell` is ignored
- Modify: `lib/utils/abilities/engine/core/types.ts` — `AbilityRunContext` gains optional `map?: BattleMapConfig` and the action event gains optional `targetCell?: GridPoint` (`types/abilities.ts:31` area)
- Create: `lib/utils/battle/damage/resisted-ability-damage.ts` — `export function dealResistedDamage(ps, targetId, amount, damageType, sourceName): { participants; message }` using `applyResistance` then the same HP application `applyRawDamage` uses (find it in `lib/utils/abilities/registry/effects/hp.ts`)
- Modify: client: `lib/api/battles.ts` (`abilityAction`/`bonusAction` accept `targetCell`), `lib/hooks/battle/*` — when the picked ability has `aim`, call `scene.intents.setMapAim` like `useSpellMapAim` in `lib/hooks/battle/useSpellBook.ts:83-116`, then submit with the aimed cell; `BonusActionPicker` closes into aim mode
- Test: `lib/utils/battle/validation/__tests__/ability-aim.test.ts`, `lib/utils/battle/damage/__tests__/resisted-ability-damage.test.ts`

- [ ] **Step 1: Failing tests:** aim validation (missing cell on map → error «Оберіть клітинку на карті»; out of range → «Задалеко»; no map → ok); `dealResistedDamage` halves for 50 % resistance and is 0 for immunity.
- [ ] **Step 2–4:** FAIL → implement → PASS.
- [ ] **Step 5:** commit `feat(abilities): map aim for active abilities`.

---

### Task 12: Griffins — Dive and Squall; Fire Demon burst

Depends on Tasks 3 and 11.

**New engine module:** `lib/utils/battle/maneuvers/` (one file per maneuver + `index.ts`), each a pure function `(state, input) => { participants, messages }`, called from a new effect kind `{ kind: "maneuver", maneuver: "dive" | "squall" | "fireBurst", percentOfAttack: number }` registered in `lib/utils/abilities/registry/effects/` (the handler gets `ctx.map`, `event.targetCell`, `event.targetIds`).

**Airborne state:** `battleData.airborne?: { landAt?: GridPoint; targetId?: string; since: number }` (add to state/patch lists).
- While airborne: `isOnMap` false (`lib/utils/battle/grid/occupancy.ts:10`), excluded from target candidates — add `isTargetable(p) = isActive(p) && !p.battleData.airborne` and use it in `resolveTargetIds` (`engine/core/targets.ts`), `run-attack-phase.ts:140-149`, `resolveSpellTargets`, `participantsInCells`, `bonusTargetCandidates`, `flows/attack-intent.ts`. Auras: `syncMapAuras` skips airborne (no position).
- Victory check must count airborne as alive (it is `ACTIVE`) — Review Focus #2.

**Dive** (`maneuvers/dive.ts`): on use → set `airborne { landAt: targetCell, targetId: targetIds[0] (no-map), since: round }`, clear `position`, mark action used. At the griffin's next `processStartOfTurn` (`lib/utils/battle/turn/start-end.ts`): land — victim = participant occupying `landAt` (map) or `targetId` if still active (no map); damage = `200 %` of `ownerAttack` (average, `resolveAmount({percentOf:"ownerAttack", value:200})`) via `dealResistedDamage`, damage type of the first attack; place the griffin at `landAt` if `canStand`, else nearest standable cell by BFS ring (Review Focus #1); clear `airborne`; landing consumes the action (`hasUsedAction: true`), movement stays available. Empty cell → message «Пікірування: удар у порожнечу».

**Squall** (`maneuvers/squall.ts`): `cellLine(griffinCell, targetCell)` limited to `range`; path cells; enemies whose footprint intersects the path take `100 %` `ownerAttack` (resisted); griffin ends on the last standable cell of the path (walk back from the end until `canStand`); movement not charged. No map: `targetIds` (max 3) each take 100 %.

**Fire burst** (`maneuvers/fire-burst.ts`): enemies with `footprintDistance(actor, enemy) <= 1`; each makes a Dexterity save vs `spellSaveDc(actor)` (`lib/utils/battle/spell/power.ts:18`), d20 from `rng` + their DEX mod (reuse the save-modifier helper used in `cast.ts`); damage `50 %` `ownerAttack` fire, halved on success, resisted (fire immunity → 0). No map: `targetIds` (max 3).

Data (`data/library/unit-abilities.ts`):

```ts
export const dive = (): Ability => ({
  id: "unit-dive",
  name: "Пікірування",
  description: "Дія, перезарядка 2 раунди: злітає з поля на раунд (його не можна атакувати) і на початку свого наступного ходу падає на обрану клітинку — ×2 шкоди тому, хто там стоїть.",
  trigger: { event: "action" },
  limits: { cooldownRounds: 2 },
  aim: { kind: "cell", range: 120 },
  effects: [{ kind: "maneuver", maneuver: "dive", percentOfAttack: 200 }],
});

export const squall = (): Ability => ({
  id: "unit-squall",
  name: "Шквал",
  description: "Дія, перезарядка 2 раунди: пролітає по прямій і завдає звичайної шкоди кожному ворогу на шляху.",
  trigger: { event: "action" },
  limits: { cooldownRounds: 2 },
  maxTargets: 3,
  aim: { kind: "direction", range: 60 },
  effects: [{ kind: "maneuver", maneuver: "squall", percentOfAttack: 100 }],
});

export const fireBurst = (): Ability => ({
  id: "unit-fire-burst",
  name: "Вогняний вибух",
  description: "Дія, перезарядка 2 раунди: вороги на сусідніх клітинках отримують 50 % шкоди атаки вогнем (рятівний кидок Спритності — половина).",
  trigger: { event: "action" },
  limits: { cooldownRounds: 2 },
  maxTargets: 3,
  effects: [{ kind: "maneuver", maneuver: "fireBurst", percentOfAttack: 50 }],
});
```

Units: `humans-royal-griffin` → `[unlimitedRetaliation(), dive()]`; `humans-battle-griffin` → `[unlimitedRetaliation(), squall()]` and its attack back to a single target (remove `targets: 2` and `falloff("Шквал")`, rename attack to «Пазурі»); `demons-fire-demon` → add `fireBurst()`.

Target UI: dive/squall need `aim` (Task 11); without map they use the existing target picker (`maxTargets`). `needsBonusTarget` (`lib/utils/battle/view/hero.ts:65-90`) must treat `maneuver` effects as enemy-targeted when no map.

- [ ] **Step 1: Failing tests** `lib/utils/battle/maneuvers/__tests__/`:
  - dive: after use griffin has no position, `airborne` set, enemies' attack candidates exclude it; at its next turn start the unit on `landAt` takes `2 × average` (resisted); landing cell occupied by an ally → griffin placed on nearest free cell, no overlap; empty cell → «удар у порожнечу»; no-map fallback hits `targetId`; griffin last alive on its side while airborne → battle not won.
  - squall: 3 enemies on a line, 1 ally on the line → 3 damaged, ally untouched; griffin ends on the last free cell; blocked end → earlier cell.
  - fire burst: two adjacent enemies, one distant → only two damaged; save success (rng → 20) halves; fire-immune enemy takes 0; allies untouched.
  - cooldown: second use next round rejected by `withinLimits`.
- [ ] **Step 2–4:** FAIL → implement → PASS; run `pnpm test:run lib/utils/battle` fully.
- [ ] **Step 5:** commit `feat(units): griffin dive and squall, fire demon burst`.

---

### Task 13: Piercing shot (Battle Mage) and Fire Wave (Jarl)

Both are passive flags resolved inside the attack flow; the map must be threaded into `processAttack` (it already reaches `runAttackPhase` via `ctx.meta.map`, `attack-mutation.ts:79`).

**Files:**
- Modify: `lib/utils/abilities/schema/effects.ts` — flags `piercingShot` and `fireWave { percent: number; size: number /* ft */ }`
- Create: `lib/utils/battle/attack/process/piercing.ts` — `export function piercingTargets(map, ps, attacker, firstTargetId): string[]`: extend `cellLine(attackerCenter, victimCell)` beyond the victim to the map edge; return active, targetable enemies whose footprint intersects that line, ordered by distance, first target included. No map → `[firstTargetId]`.
- Create: `lib/utils/battle/attack/process/fire-wave.ts` — `export function fireWaveVictims(map, ps, attacker, victimId, sizeFt): string[]`: cone `templateCells(map, { shape: "cone", size }, cellsOf(victim), aimPointBeyondVictim)` where the aim point is the victim's cell + (victim − attacker) direction; enemies in the cone except the victim. No map: up to 2 other active enemies (first two in initiative order).
- Modify: `lib/utils/battle/attack-phase/run-attack-phase.ts` — for ranged attacks by an attacker with `piercingShot`, expand targets with `piercingTargets` (each target resolved as a normal attack roll, like multi-target attacks with `maxTargets`, no falloff)
- Modify: `lib/utils/battle/attack/process/hit.ts` — after a successful hit by an attacker with `fireWave`, apply `floor(hitDamage * percent / 100)` fire via `dealResistedDamage` to each `fireWaveVictims`, message `🔥 Вогняна хвиля: ${names} (−N)`
- Modify: `data/library/unit-abilities.ts`, `data/library/units/mages.ts`, `data/library/units/dwarves.ts`

Data:

```ts
export const piercingShot = (): Ability => ({
  id: "unit-piercing-shot",
  name: "Наскрізний постріл",
  description: "Дальня атака влучає в усіх ворогів на одній лінії за ціллю.",
  trigger: { event: "passive" },
  effects: [{ kind: "flag", flag: "piercingShot" }],
});

export const fireWave = (): Ability => ({
  id: "unit-fire-wave",
  name: "Вогняна хвиля",
  description: "Влучання обпікає ворогів позаду цілі (конус 15 фт): 50 % шкоди удару вогнем.",
  trigger: { event: "passive" },
  effects: [{ kind: "flag", flag: "fireWave", percent: 50, size: 15 }],
});
```

`mages-battle-mage`: `[spellSuppression(), piercingShot()]`; `dwarves-jarl`: replace the active «Вогняна куля» (`oncePerBattleAoe`) with `fireWave()`.

- [ ] **Step 1: Failing tests** (`lib/utils/battle/attack/process/__tests__/piercing.test.ts`, `fire-wave.test.ts`): geometry on a 10×10 map — enemies on the line behind the first target are included, enemies off the line and allies excluded; cone behind victim includes the enemy right behind, excludes one beside the attacker; fire-immune victim in the cone takes 0; no-map fallbacks.
- [ ] **Step 2–4:** FAIL → implement → PASS + `lib/utils/battle/attack-phase` tests.
- [ ] **Step 5:** commit `feat(units): battle mage piercing shot, jarl fire wave`.

---

### Task 14: Descriptions, info reference, sweep, prod reseed

**Files:** `lib/cache/info-reference.ts` (if it lists limits/flags — add new ones), `lib/utils/abilities/summary.ts` (human summary for new flags/effects/limits), battle sweep `scripts/` (add cases if the sweep enumerates unit abilities: `grep -rn "oncePerBattleAoe\|abilityAction" scripts/battle-sweep*`).

- [ ] **Step 1:** `pnpm test:run && pnpm exec tsc --noEmit -p . && pnpm lint`.
- [ ] **Step 2:** `./scripts/db/prodcopy-db.sh` then `DATABASE_URL=postgresql://postgres:postgres@localhost:54322/prodcopy pnpm seed-library <campaignId> --dry-run` against prodcopy, then real run on prodcopy, then `pnpm battle-sweep` on prodcopy — expect exit 0.
- [ ] **Step 3:** Browser check on local dev (desktop + mobile): griffin dive/squall aim + landing, blood maiden return button, fire burst, opposing spells log line, Haste movement range.
- [ ] **Step 4:** Commit; then ASK the user before: merge to `main`, push (prod deploy), and `pnpm seed-library <prodCampaignId> --allow-remote` (overwrites unit abilities/spells by name; also updates Haste/Slow spell definitions). Note: running battles keep old snapshots until the DM uses «refresh sources».

---

### Task 15: DM assigns allied unit control (manual + random)

Spec section «Керування союзними юнітами в бою».

**Files:**
- Modify: `types/battle.ts` — `battleData.controlAssigned?: boolean`; add to `lib/utils/battle/store/split-participant.ts` state keys and `participant-patch.ts` patchable fields; make sure `basicInfo.controlledBy` changes reach clients (check `PATCHABLE_PARTICIPANT_FIELDS` / snapshot handling — if `controlledBy` lives in the snapshot, the changed participant must be sent as `upserted`; follow how `assignUnitControl` changes already propagate in `add-participant`/`reveal-participant`)
- Modify: `lib/utils/battle/participant/unit-control.ts` — `assignUnitControl` skips participants with `controlAssigned`; new pure functions:
  - `allyOwners(order, dmUserId): string[]` — unique `controlledBy` of real players' characters on the ally (players') side, in order
  - `setUnitController(order, unitId, controlledBy: string /* user id or CONTROLLED_BY_DM */, dmUserId): BattleParticipant[]` — throws `BattleRuleError` («Цим юнітом не можна керувати гравцю» for summoned/charmed/enemy/non-unit; «Гравець не бере участі в бою» if `controlledBy` not in `allyOwners` and not DM); sets `controlAssigned: true`
  - `randomizeUnitControl(order, dmUserId, rng): BattleParticipant[]` — for each side-unit on the ally side WITHOUT `controlAssigned`, pick a uniform random owner from `allyOwners` (no players → unchanged); does not set `controlAssigned`
- Create: route `app/api/campaigns/[id]/battles/[battleId]/unit-control/route.ts` + `unit-control-mutation.ts` (`runBattleMutation`, DM access, ACTIVE battle). Body: `{ mode: "assign", participantId, controlledBy } | { mode: "random" }`. Log event text: `🎮 ДМ передає ${unit} під керування ${playerName}` / `🎲 ДМ роздає вільних юнітів: …`.
- Modify: `lib/api/battles.ts` (`unitControl`), `lib/hooks/battles/useBattles.ts` (`useUnitControl` via `useBattleAction`), wire into the battle scene actions (`lib/hooks/battle/useBattleScene.ts`)
- UI (DM only): in the participant details/row menu for an allied unit — a select «Керує:» with «ДМ» + allied players (hero name + player), hook provides options; in the DM controls panel a button «Роздати юнітів випадково». Use `ResponsiveDialog`/existing DM menus; no direct fetch.
- Tests: `lib/utils/battle/participant/__tests__/unit-control-assign.test.ts` (setUnitController happy path + all three errors; assignUnitControl keeps a `controlAssigned` unit; randomizeUnitControl with seeded rng distributes only free ally units, skips summoned/charmed/enemies/assigned, no players → unchanged), mutation test following the pattern of an existing `*-mutation` test in `app/api/__tests__`.

- [ ] Steps: failing tests → implement engine → route/mutation → client + UI → `pnpm test:run`, tsc, lint → commit `feat(battle): DM assigns allied unit control`.
