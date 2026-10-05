# Система умінь, частина 3a — модель, реєстр, виконавець, міграція: план реалізації

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Замінити чотири розрізнені системи умінь (скіли, раси, артефакти+сети, юніти) однією моделлю «тригер → умова → ліміти → ефекти» з одним виконавцем подій і одним `collectModifiers`. Старі дані переносить конвертер зі звітом, і бій без перерви працює на новій моделі.

**Architecture:**
- Нова доменна папка `lib/utils/abilities/` має чотири частини:
  - `schema/` — Zod-моделі;
  - `registry/` — тригери, умови й ефекти з `describe`/`fields`/`apply`;
  - `engine/` — `runAbilities`, `resolveDowned`, `collectModifiers`, примітиви;
  - `legacy/` та `build/` — конвертер старих форматів і збирання вмінь учасника.
- Рушій бою (`lib/utils/battle/*`) кидає типізовані події в `runAbilities` і читає модифікатори лише через `collectModifiers`.
- Старі `lib/utils/skills/execution|triggers`, `PassiveAbility` і поля snapshot `activeSkills`/`racialAbilities`/`passiveAbilities` видаляються.
- Нова колонка `abilities JSONB NULL` на власниках. До backfill діє запасний варіант на час читання, а до 3b — подвійний запис.

**Tech Stack:** TypeScript (strict), Zod 4, Vitest, Prisma 6, Next.js route handlers.

**Spec:** `docs/superpowers/specs/2026-10-05-ability-system-core-design.md`. Уточнення, внесені під час планування, описані в §9 спеки.

## Global Constraints

- Міграції лише expand-only: `ALTER TABLE … ADD COLUMN "abilities" JSONB` у `skills`, `races`, `artifacts`, `artifact_sets`, `units`. Нових таблиць немає. Старі колонки не чіпаємо.
- `abilities = NULL` означає «ще не сконвертовано». Читання йде через `parseAbilities(raw) ?? convertLegacy*(row).abilities`.
- Усі ефекти, кидки й кубики вмінь проходять через `rng: () => number`. У рушії за замовчуванням використовується `Math.random`, у тестах — детермінований `seq(...)`.
- Каскадів немає: ефекти вмінь не породжують `attack`/`hit`/`spellCast`. Лише смерть від ефекту дає `lethalDamage` → `kill` на глибині 1.
- Ліміти: `perBattle`/`perRound`/`perTurn` перевіряються **до** кидка `chance`. Невдалий кидок ліміт не витрачає. `perRound` скидається на `roundStart`, `perTurn` — на `turnStart` власника.
- Пасивні модифікатори статів, що «запікаються» (`BAKED_STATS`), застосовуються один раз при побудові учасника. `collectModifiers` ігнорує їхні пасивні внески, щоб не порахувати двічі.
- Мораль завжди обмежується діапазоном −3…+3.
- Імпорти через `@/…`. Коментарі мінімальні, лише «чому». Код англійською, тексти логу українською. `simple-import-sort`, `padding-line-between-statements`, `react-hooks/exhaustive-deps` обов'язкові.
- Egress: списки скілів, рас, артефактів, сетів і юнітів у GET-роутах не віддають `abilities`; там, де читаються повні рядки, ставимо `omit: { abilities: true }`.
- Мова логу й describe-рядків — українська, з тими самими емодзі-префіксами, що й зараз.

## Review Focus

1. **Бій, розпочатий до деплою.** Snapshot учасника без `resolvedAbilities`, але з `activeSkills`, `racialAbilities`, `equippedArtifacts` і `skillUsageCounts`. Після `joinParticipant` вміння працюють, бонуси артефактів не рахуються двічі: AC уже «запечений» у `armorClass`, тож з `bonuses` нічого не береться. Ліміт `oncePerBattle`, уже витрачений до деплою, лишається витраченим. Тест — Task 9.
2. **Відкат на подію до деплою.** `battle_snapshots` зі старими учасниками проходять той самий апгрейд. Тест — Task 9.
3. **Ворог гине від `dealDamage` у фазі `attack/before`** (наприклад, «удар блискавки перед атакою»). Атака не кидається по мертвій цілі, `kill` спрацьовує рівно один раз, а мораль змінюється один раз. Тест — Task 11.
4. **Аура від загиблого учасника.** Пасивка з `target: allAllies` перестає діяти, щойно джерело стає `dead`/`unconscious`. Запечена аура з `maxHp` не знімається, бо це правило побудови. Тест — Task 5.
5. **Невалідний JSON у колонці `abilities`.** Наприклад, DM-скрипт записав сміття. Учасник будується через запасний конвертер, а не падає з 500. Лог — `console.warn`. Тест — Task 8.

---

## File Structure

| Файл | Дія | Відповідальність |
|---|---|---|
| `lib/utils/abilities/schema/common.ts` | Create | цілі, тривалість, Amount/Flat, константи видів шкоди |
| `lib/utils/abilities/schema/triggers.ts` | Create | `TriggerSchema` |
| `lib/utils/abilities/schema/conditions.ts` | Create | `ConditionSchema` (рекурсивна) |
| `lib/utils/abilities/schema/effects.ts` | Create | `EffectSchema`, стати, прапорці, `isStaticEffect`, `isBakedStat` |
| `lib/utils/abilities/schema/ability.ts` | Create | `AbilitySchema` + правила, `parseAbilities` |
| `lib/utils/abilities/schema/index.ts` | Create | barrel |
| `types/abilities.ts` | Create | `AbilitySource`, `ResolvedAbility`, `AbilityUsageCounter`, `SpellEnhancer`, `AbilityEvent` |
| `types/index.ts` | Modify | реекспорт `types/abilities` |
| `types/battle.ts` | Modify | нові поля `battleData` і `ActiveEffect`; видалення старих (Task 14) |
| `lib/utils/battle/__tests__/mock-participant.ts` | Create | `createMockParticipant`, перенесений зі `skills/__tests__` |
| `lib/utils/abilities/engine/{participants,amount,events,targets,usage,timed-effects,hp,types}.ts` | Create | примітиви |
| `lib/utils/abilities/registry/{fields,labels,triggers,conditions}.ts` | Create | реєстри тригерів та умов |
| `lib/utils/abilities/registry/effects/{static,hp,state,index}.ts` | Create | реєстр ефектів, `applyEffect`, `describeEffect` |
| `lib/utils/abilities/engine/run-abilities.ts` | Create | `runAbilities`, `resolveDowned` |
| `lib/utils/abilities/engine/collect-modifiers.ts` | Create | `collectModifiers`, `statWithModifiers`, `findFlags` |
| `lib/utils/abilities/engine/legacy-active-effects.ts` | Create | адаптер старих рядків `ActiveEffect.effects[].type` |
| `lib/utils/abilities/legacy/{types,parse-effects,stat-map,trigger-map}.ts` | Create | розбір старого формату |
| `lib/utils/abilities/legacy/{convert-skill,convert-race,convert-artifact,convert-artifact-set,convert-unit,convert-snapshot,read,report}.ts` | Create | конвертери, читання з запасним варіантом, звіт |
| `lib/utils/abilities/build/{resolve,bake,collect}.ts` | Create | ключі та джерела, «найвищий у лінії», запікання, аури |
| `lib/utils/abilities/index.ts` | Create | barrel публічного API |
| `prisma/schema.prisma`, `prisma/migrations/<ts>_ability_columns/migration.sql` | Modify / Create | колонки `abilities` |
| роути збереження скілів, рас, артефактів, сетів, юнітів (+ duplicate, import), `scripts/import-skills-library.ts` | Modify | подвійний запис |
| `lib/utils/battle/participant/*`, `artifact-sets/*`, `start/*`, `add-participant`, `add-summon`, `append-summoned-unit`, `damage-preview` | Modify | побудова через `build/collect` |
| `lib/utils/battle/store/{types,split-participant}.ts` | Modify | `abilityUsage`, апгрейд старого snapshot |
| `lib/utils/battle/{participant/helpers,attack/bonus,attack/roll,battle-start,damage/*,spell/calculations,spell/participant-spell-target-mode,spell/spell-immunity,resistance/*,attack/reaction}.ts` | Modify | читання через `collectModifiers` |
| `lib/utils/battle/attack/process/*`, `attack-and-next-turn/run-attack-phase.ts`, `spell/*`, `battle-turn.ts`, `turn/*` | Modify | точки подій |
| `app/api/campaigns/[id]/battles/[battleId]/{start,bonus-action,attack,participants/[participantId]}/*` | Modify | події, бонусна дія через `abilityKey` |
| `lib/api/battles.ts`, `lib/hooks/battles/useBattles.ts`, `lib/hooks/battle/useBattleSceneLogic*.ts`, `components/battle/**` | Modify | `abilityKey`, `resolvedAbilities` |
| `lib/utils/skills/{execution,triggers,types/execution.ts}`, `lib/utils/battle/triggers`, `lib/utils/battle/participant/{passive,apply-passive-stat-effect,build-active-skill,extract-racial,apply-artifact-flat-bonuses,merge-equipped-immune,extras}.ts`, `lib/utils/battle/damage/{skill,skill-resolve,bonuses}.ts`, `lib/utils/battle/artifact-sets/{apply-set-passive-effects,distribute-scoped-artifact-bonuses,merge-set-bonus,equipped-to-parsed-bundle}.ts`, `lib/types/{skill-triggers,skills}.ts`, `scripts/run-skills-testing*.ts`, `lib/utils/skills/__tests__/skill-triggers*` | Delete | старі шляхи (Task 14) |
| `scripts/convert-abilities.ts`, `package.json` | Create / Modify | скрипт `pnpm convert-abilities` |

---

### Task 1: Zod-модель уміння

**Files:**
- Create: `lib/utils/abilities/schema/{common,triggers,conditions,effects,ability,index}.ts`
- Test: `lib/utils/abilities/schema/__tests__/ability.test.ts`

**Interfaces:**
- Produces (from `@/lib/utils/abilities/schema`):
  - `AbilitySchema`, `AbilitiesSchema`, `parseAbilities(raw: unknown): Ability[] | null`;
  - типи `Ability`, `Trigger`, `TriggerEvent`, `Condition`, `Effect`, `EffectKind`, `StaticEffect`, `FlagEffect`, `FlagKey`, `StatKey`, `AbilityTarget`, `AttackKind`, `DamageKind`, `DamageFilterKind`, `Amount`, `Flat`, `Duration`, `Limits`;
  - константи `BAKED_STATS`, `TIMED_STATS`, `STAT_KEYS`, `CONDITION_KEYS`, `DICE_RE`, `ABILITY_TARGETS`, `DAMAGE_FILTER_KINDS`;
  - функції `isBakedStat(stat)`, `isStaticEffect(e): e is StaticEffect`, `isActionScopedTrigger(t)`.

- [ ] **Step 1: Написати тест**

```ts
// lib/utils/abilities/schema/__tests__/ability.test.ts
import { describe, expect, it } from "vitest";

import { AbilitySchema, parseAbilities } from "@/lib/utils/abilities/schema";

const base = { id: "a1", name: "Лють" };

describe("AbilitySchema", () => {
  it("приймає пасивку з бонусом шкоди", () => {
    const r = AbilitySchema.safeParse({
      ...base,
      trigger: { event: "passive" },
      effects: [{ kind: "damageBonus", filter: { kind: "melee" }, percent: 10 }],
    });

    expect(r.success).toBe(true);
  });

  it("пасивка не може мати лімітів і нестатичних ефектів", () => {
    const r = AbilitySchema.safeParse({
      ...base,
      trigger: { event: "passive" },
      limits: { perBattle: 1 },
      effects: [{ kind: "heal", amount: 5 }],
    });

    expect(r.success).toBe(false);
    expect(r.error?.issues.map((i) => i.path.join("."))).toEqual(expect.arrayContaining(["limits", "effects.0"]));
  });

  it("запечений стат — лише в пасивці і без умови", () => {
    const timed = AbilitySchema.safeParse({
      ...base,
      trigger: { event: "hit", role: "attacker" },
      effects: [{ kind: "modifyStat", stat: "maxHp", flat: 5, duration: { rounds: 2 } }],
    });

    const conditional = AbilitySchema.safeParse({
      ...base,
      trigger: { event: "passive" },
      condition: { type: "hpBelow", who: "self", percent: 50 },
      effects: [{ kind: "modifyStat", stat: "maxHp", flat: 5 }],
    });

    expect(timed.success).toBe(false);
    expect(conditional.success).toBe(false);
  });

  it("статичний ефект без duration дозволений лише у фазі before", () => {
    const before = AbilitySchema.safeParse({
      ...base,
      trigger: { event: "attack", phase: "before", role: "attacker", attackKind: "ranged" },
      effects: [{ kind: "flag", flag: "advantage", attackKind: "ranged" }],
    });

    const hit = AbilitySchema.safeParse({
      ...base,
      trigger: { event: "hit", role: "attacker" },
      effects: [{ kind: "flag", flag: "advantage", attackKind: "all" }],
    });

    expect(before.success).toBe(true);
    expect(hit.success).toBe(false);
  });

  it("dot вимагає duration, randomOf не вкладається", () => {
    expect(
      AbilitySchema.safeParse({
        ...base,
        trigger: { event: "hit", role: "attacker" },
        effects: [{ kind: "dot", damagePerRound: "1d4", damageType: "bleed" }],
      }).success,
    ).toBe(false);
    expect(
      AbilitySchema.safeParse({
        ...base,
        trigger: { event: "hit", role: "attacker" },
        effects: [
          {
            kind: "randomOf",
            options: [
              { kind: "randomOf", options: [] },
              { kind: "heal", amount: 1 },
            ],
          },
        ],
      }).success,
    ).toBe(false);
  });

  it("рекурсивні умови", () => {
    const r = AbilitySchema.safeParse({
      ...base,
      trigger: { event: "turnStart" },
      condition: {
        type: "any",
        conditions: [
          { type: "hpBelow", who: "anyAlly", percent: 15 },
          { type: "all", conditions: [{ type: "attackKind", kind: "magic" }] },
        ],
      },
      effects: [{ kind: "heal", amount: "2d4", target: "allAllies" }],
    });

    expect(r.success).toBe(true);
  });

  it("parseAbilities: null для null і для невалідних даних", () => {
    expect(parseAbilities(null)).toBeNull();
    expect(parseAbilities([{ id: "x" }])).toBeNull();
    expect(parseAbilities([])).toEqual([]);
  });
});
```

- [ ] **Step 2: Запустити тест і переконатися, що він падає**

Run: `pnpm test:run lib/utils/abilities/schema`
Expected: FAIL — `Cannot find module '@/lib/utils/abilities/schema'`.

- [ ] **Step 3: Реалізувати `common.ts`**

```ts
import { z } from "zod";

export const DICE_RE = /^(\d+)d(\d+)([+-]\d+)?$/;

export const ABILITY_TARGETS = ["self", "eventTarget", "eventActor", "allAllies", "allEnemies"] as const;

export const AbilityTargetSchema = z.enum(ABILITY_TARGETS);

export const ATTACK_KINDS = ["melee", "ranged"] as const;

export const DAMAGE_KINDS = ["melee", "ranged", "magic"] as const;

export const DAMAGE_FILTER_KINDS = ["melee", "ranged", "magic", "physical", "all"] as const;

export const DurationSchema = z.object({ rounds: z.number().int().min(1).max(99) });

export const FormulaSchema = z.object({ formula: z.string().min(1) });

export const FlatSchema = z.union([z.number(), FormulaSchema]);

export const AmountSchema = z.union([
  z.number().nonnegative(),
  z.string().regex(DICE_RE),
  FormulaSchema,
  z.object({ percentOf: z.enum(["eventDamage", "maxHp"]), value: z.number().positive() }),
]);

export type AbilityTarget = z.infer<typeof AbilityTargetSchema>;

export type AttackKind = (typeof ATTACK_KINDS)[number];

export type DamageKind = (typeof DAMAGE_KINDS)[number];

export type DamageFilterKind = (typeof DAMAGE_FILTER_KINDS)[number];

export type Duration = z.infer<typeof DurationSchema>;

export type Flat = z.infer<typeof FlatSchema>;

export type Amount = z.infer<typeof AmountSchema>;
```

- [ ] **Step 4: Реалізувати `triggers.ts`**

```ts
import { z } from "zod";

import { ATTACK_KINDS } from "./common";

const attackRole = z.enum(["attacker", "target"]);

const phase = z.enum(["before", "after"]);

export const TriggerSchema = z.discriminatedUnion("event", [
  z.object({ event: z.literal("passive") }),
  z.object({ event: z.literal("battleStart") }),
  z.object({ event: z.literal("roundStart") }),
  z.object({ event: z.literal("roundEnd") }),
  z.object({ event: z.literal("turnStart") }),
  z.object({ event: z.literal("turnEnd") }),
  z.object({ event: z.literal("attack"), phase, role: attackRole, attackKind: z.enum(ATTACK_KINDS).optional() }),
  z.object({ event: z.literal("hit"), role: attackRole, attackKind: z.enum(ATTACK_KINDS).optional() }),
  z.object({ event: z.literal("kill"), role: z.enum(["killer", "killerSide", "victimSide"]) }),
  z.object({ event: z.literal("lethalDamage") }),
  z.object({ event: z.literal("spellCast"), phase, role: z.enum(["caster", "target"]) }),
  z.object({
    event: z.literal("moraleCheck"),
    result: z.enum(["success", "fail", "any"]),
    whose: z.enum(["self", "ally"]),
  }),
  z.object({ event: z.literal("bonusAction") }),
]);

export type Trigger = z.infer<typeof TriggerSchema>;

export type TriggerEvent = Trigger["event"];

export function isActionScopedTrigger(t: Trigger): boolean {
  return (t.event === "attack" || t.event === "spellCast") && t.phase === "before";
}
```

- [ ] **Step 5: Реалізувати `conditions.ts`**

```ts
import { z } from "zod";

import { DAMAGE_KINDS, type DamageKind } from "./common";

export const CONDITION_SUBJECTS = ["self", "eventTarget", "eventActor", "anyAlly", "anyEnemy"] as const;

export type ConditionSubject = (typeof CONDITION_SUBJECTS)[number];

export type Condition =
  | { type: "hpBelow"; who: ConditionSubject; percent: number }
  | { type: "hpAbove"; who: ConditionSubject; percent: number }
  | { type: "attackKind"; kind: DamageKind }
  | { type: "targetHasCondition"; condition: string }
  | { type: "all"; conditions: Condition[] }
  | { type: "any"; conditions: Condition[] };

const subject = z.enum(CONDITION_SUBJECTS);

const percent = z.number().min(1).max(100);

export const ConditionSchema: z.ZodType<Condition> = z.lazy(() =>
  z.discriminatedUnion("type", [
    z.object({ type: z.literal("hpBelow"), who: subject, percent }),
    z.object({ type: z.literal("hpAbove"), who: subject, percent }),
    z.object({ type: z.literal("attackKind"), kind: z.enum(DAMAGE_KINDS) }),
    z.object({ type: z.literal("targetHasCondition"), condition: z.string().min(1) }),
    z.object({ type: z.literal("all"), conditions: z.array(ConditionSchema).min(1) }),
    z.object({ type: z.literal("any"), conditions: z.array(ConditionSchema).min(1) }),
  ]),
);
```

- [ ] **Step 6: Реалізувати `effects.ts`**

```ts
import { z } from "zod";

import {
  AbilityTargetSchema,
  AmountSchema,
  ATTACK_KINDS,
  DAMAGE_FILTER_KINDS,
  DAMAGE_KINDS,
  DurationSchema,
  FlatSchema,
} from "./common";

export const DYNAMIC_STATS = ["armor", "attackBonus", "critThreshold"] as const;

export const BAKED_STATS = [
  "initiative",
  "maxHp",
  "speed",
  "morale",
  "minTargets",
  "maxTargets",
  "spellSlots",
  "strength",
  "dexterity",
  "constitution",
  "intelligence",
  "wisdom",
  "charisma",
] as const;

export const STAT_KEYS = [...DYNAMIC_STATS, ...BAKED_STATS] as const;

export const TIMED_STATS = ["armor", "attackBonus", "critThreshold", "initiative"] as const;

export const CONDITION_KEYS = [
  "no_bonus_action",
  "no_reaction",
  "disable_melee_attacks",
  "disable_ranged_attacks",
  "disable_spell_casting",
] as const;

export type StatKey = (typeof STAT_KEYS)[number];

const target = { target: AbilityTargetSchema.optional() };

const timed = { ...target, duration: DurationSchema.optional() };

const hasValue = (e: { flat?: unknown; percent?: unknown }) => e.flat !== undefined || e.percent !== undefined;

const ModifyStatSchema = z
  .object({
    kind: z.literal("modifyStat"),
    stat: z.enum(STAT_KEYS),
    flat: FlatSchema.optional(),
    percent: z.number().optional(),
    attackKind: z.enum(ATTACK_KINDS).optional(),
    spellLevels: z.array(z.number().int().min(1).max(9)).min(1).optional(),
    ...timed,
  })
  .refine(hasValue, { message: "Потрібен flat або percent" });

const DamageBonusSchema = z
  .object({
    kind: z.literal("damageBonus"),
    filter: z.object({ kind: z.enum(DAMAGE_FILTER_KINDS), school: z.string().min(1).optional() }),
    flat: FlatSchema.optional(),
    percent: z.number().optional(),
    ...timed,
  })
  .refine(hasValue, { message: "Потрібен flat або percent" });

const flagBase = { kind: z.literal("flag"), ...timed };

const FlagSchema = z.discriminatedUnion("flag", [
  z.object({ ...flagBase, flag: z.literal("advantage"), attackKind: z.enum([...ATTACK_KINDS, "all"]) }),
  z.object({ ...flagBase, flag: z.literal("disadvantage") }),
  z.object({ ...flagBase, flag: z.literal("disadvantageForAttackers") }),
  z.object({ ...flagBase, flag: z.literal("guaranteedHit") }),
  z.object({
    ...flagBase,
    flag: z.literal("resistance"),
    damageType: z.string().min(1),
    percent: z.number().min(1).max(100),
  }),
  z.object({ ...flagBase, flag: z.literal("spellImmunity"), spellIds: z.array(z.string().min(1)).min(1) }),
  z.object({
    ...flagBase,
    flag: z.literal("counterAttack"),
    attackKinds: z.array(z.enum(DAMAGE_KINDS)).min(1),
    bonusPercent: z.number().min(0),
  }),
  z.object({ ...flagBase, flag: z.literal("seeEnemyHp") }),
]);

const NoteSchema = z.object({ kind: z.literal("note"), text: z.string().min(1) });

const GrantActionSchema = z
  .object({
    kind: z.literal("grantAction"),
    extraActions: z.number().int().min(1).optional(),
    refreshAction: z.boolean().optional(),
    refreshBonusAction: z.boolean().optional(),
    refreshReaction: z.boolean().optional(),
    ...target,
  })
  .refine((e) => e.extraActions || e.refreshAction || e.refreshBonusAction || e.refreshReaction, {
    message: "Порожня дія",
  });

const DealDamageSchema = z.object({
  kind: z.literal("dealDamage"),
  amount: AmountSchema,
  damageType: z.string().min(1).optional(),
  ...target,
});

const HealSchema = z.object({ kind: z.literal("heal"), amount: AmountSchema, revive: z.boolean().optional(), ...target });

const DotSchema = z.object({
  kind: z.literal("dot"),
  damagePerRound: AmountSchema,
  damageType: z.string().min(1),
  duration: DurationSchema,
  ...target,
});

const ApplyConditionSchema = z.object({
  kind: z.literal("applyCondition"),
  condition: z.enum(CONDITION_KEYS),
  duration: DurationSchema,
  ...target,
});

const RestoreSpellSlotSchema = z.object({ kind: z.literal("restoreSpellSlot"), count: z.number().int().min(1), ...target });

const ChangeMoraleSchema = z.object({
  kind: z.literal("changeMorale"),
  delta: z.number().int().refine((d) => d !== 0),
  ...target,
});

const CleanseSchema = z.object({ kind: z.literal("cleanse"), ...target });

const BASE_EFFECTS = [
  ModifyStatSchema,
  DamageBonusSchema,
  FlagSchema,
  NoteSchema,
  GrantActionSchema,
  DealDamageSchema,
  HealSchema,
  DotSchema,
  ApplyConditionSchema,
  RestoreSpellSlotSchema,
  ChangeMoraleSchema,
  CleanseSchema,
] as const;

export const NonRandomEffectSchema = z.discriminatedUnion("kind", [...BASE_EFFECTS]);

const RandomOfSchema = z.object({ kind: z.literal("randomOf"), options: z.array(NonRandomEffectSchema).min(2) });

export const EffectSchema = z.discriminatedUnion("kind", [...BASE_EFFECTS, RandomOfSchema]);

export type Effect = z.infer<typeof EffectSchema>;

export type EffectKind = Effect["kind"];

export type StaticEffect = Extract<Effect, { kind: "modifyStat" | "damageBonus" | "flag" }>;

export type FlagEffect = Extract<Effect, { kind: "flag" }>;

export type FlagKey = FlagEffect["flag"];

export function isStaticEffect(e: Effect): e is StaticEffect {
  return e.kind === "modifyStat" || e.kind === "damageBonus" || e.kind === "flag";
}

export function isBakedStat(stat: StatKey): boolean {
  return (BAKED_STATS as readonly string[]).includes(stat);
}
```

- [ ] **Step 7: Реалізувати `ability.ts` та `index.ts`**

```ts
// ability.ts
import { z } from "zod";

import { ConditionSchema } from "./conditions";
import { type Effect, EffectSchema, isBakedStat, isStaticEffect, TIMED_STATS } from "./effects";
import { isActionScopedTrigger, type Trigger, TriggerSchema } from "./triggers";

export const LimitsSchema = z.object({
  perBattle: z.number().int().min(1).optional(),
  perRound: z.number().int().min(1).optional(),
  perTurn: z.number().int().min(1).optional(),
  chance: z.number().min(1).max(100).optional(),
});

const PASSIVE_TARGETS = new Set(["self", "allAllies", "allEnemies"]);

function effectIssues(effect: Effect, trigger: Trigger, hasCondition: boolean): string[] {
  const issues: string[] = [];

  if (trigger.event === "passive") {
    if (effect.kind !== "note" && !isStaticEffect(effect)) {
      issues.push("Пасивка допускає лише modifyStat, damageBonus, flag, note");
    }

    if ("duration" in effect && effect.duration) issues.push("Пасивка діє постійно — без duration");

    if ("target" in effect && effect.target && !PASSIVE_TARGETS.has(effect.target)) {
      issues.push("Ціль пасивки: self, allAllies або allEnemies");
    }

    if (effect.kind === "modifyStat" && isBakedStat(effect.stat) && hasCondition) {
      issues.push(`${effect.stat} застосовується при побудові учасника — умова неможлива`);
    }

    return issues;
  }

  if (effect.kind === "modifyStat" && !(TIMED_STATS as readonly string[]).includes(effect.stat)) {
    issues.push(`${effect.stat} змінюється лише пасивкою`);
  }

  if (isStaticEffect(effect) && !effect.duration && !isActionScopedTrigger(trigger)) {
    issues.push("Потрібна duration (без неї — лише у фазі before)");
  }

  if (effect.kind === "randomOf") {
    for (const option of effect.options) issues.push(...effectIssues(option, trigger, hasCondition));
  }

  return issues;
}

export const AbilitySchema = z
  .object({
    id: z.string().min(1),
    name: z.string().min(1),
    description: z.string().optional(),
    trigger: TriggerSchema,
    condition: ConditionSchema.optional(),
    limits: LimitsSchema.optional(),
    effects: z.array(EffectSchema).min(1),
    stackable: z.boolean().optional(),
  })
  .superRefine((a, ctx) => {
    if (a.trigger.event === "passive" && a.limits) {
      ctx.addIssue({ code: "custom", path: ["limits"], message: "Пасивка без лімітів" });
    }

    a.effects.forEach((effect, i) => {
      for (const message of effectIssues(effect, a.trigger, a.condition !== undefined)) {
        ctx.addIssue({ code: "custom", path: ["effects", i], message });
      }
    });
  });

export const AbilitiesSchema = z.array(AbilitySchema);

export type Ability = z.infer<typeof AbilitySchema>;

export type Limits = z.infer<typeof LimitsSchema>;

export function parseAbilities(raw: unknown): Ability[] | null {
  if (raw === null || raw === undefined) return null;

  const parsed = AbilitiesSchema.safeParse(raw);

  return parsed.success ? parsed.data : null;
}
```

```ts
// index.ts
export * from "./ability";
export * from "./common";
export * from "./conditions";
export * from "./effects";
export * from "./triggers";
```

- [ ] **Step 8: Запустити тест**

Run: `pnpm test:run lib/utils/abilities/schema`
Expected: PASS (7 tests). If Zod 4 rejects the nested `FlagSchema` inside `z.discriminatedUnion("kind", …)`, replace the outer `EffectSchema` with `z.union([...])`. The type stays the same.

- [ ] **Step 9: Lint і коміт**

```bash
pnpm lint --fix lib/utils/abilities && git add lib/utils/abilities && git commit -m "feat(abilities): zod model for unified abilities"
```

---

### Task 2: Типи, примітиви рушія, спільний мок учасника

**Files:**
- Create: `types/abilities.ts`; `lib/utils/abilities/engine/{types,participants,events,amount,targets,usage,timed-effects,hp}.ts`; `lib/utils/battle/__tests__/mock-participant.ts`; `lib/utils/abilities/__tests__/fixtures.ts`
- Modify: `types/index.ts`, `types/battle.ts` (нові **опційні** поля); `app/api/__tests__/battles/fixtures.ts` та всі тести, що імпортують `createMockParticipant` зі `skills/__tests__/skill-triggers-execution-mocks` (лише змінити імпорт)
- Test: `lib/utils/abilities/engine/__tests__/primitives.test.ts`

**Interfaces:**
- Produces:
  - `types/abilities.ts`: `AbilitySource { type: "skill"|"race"|"artifact"|"artifactSet"|"unit"; id; name; icon?: string|null; line?: { mainSkillId: string; level: string } }`, `ResolvedAbility = Ability & { key: string; source: AbilitySource }`, `AbilityUsageCounter { battle; round; turn }`, `SpellEnhancer`, `AbilityEvent`.
  - `types/battle.ts`:
    - `BattleParticipantBattleData` отримує `resolvedAbilities?: ResolvedAbility[]`, `spellEnhancers?: SpellEnhancer[]`, `abilityUsage?: Record<string, AbilityUsageCounter>`;
    - `ActiveEffect` отримує `abilityKey?: string`, `abilityEffects?: StaticEffect[]`.
  - `engine/types.ts`: `Rng`, `AbilityRunContext { round: number; rng: Rng; depth?: number }`, `AbilityRunResult { participants; messages: string[]; actionModifiers: Record<string, StaticEffect[]>; fired: string[] }`, `Downed { victimId: string; actorId: string | null }`.
  - `engine/participants.ts`: `findParticipant`, `replaceParticipant`, `updateParticipant`, `isUp`, `resolvedAbilitiesOf`, `participantNames`.
  - `engine/events.ts`: `eventActorId(e)`, `eventTargetIds(e)`, `eventAttackKind(e): DamageKind | null`, `eventDamage(e): number | undefined`.
  - `engine/amount.ts`: `rollDice(notation, rng)`, `formulaContext(p)`, `resolveFlat(flat, owner)`, `resolveAmount(amount, { owner, target?, eventDamage?, rng })`.
  - `engine/targets.ts`: `resolveTargetIds(target, ownerId, event, participants)`.
  - `engine/usage.ts`: `usageOf`, `withinLimits`, `recordUse`, `resetUsage`.
  - `engine/timed-effects.ts`: `upsertTimedEffect(p, input, round)`.
  - `engine/hp.ts`: `applyRawDamage(p, amount)`, `downStatus(hp)`.
  - `lib/utils/battle/__tests__/mock-participant.ts`: `createMockParticipant(overrides?)`. Тіло таке саме, як у старому моку, плюс `resolvedAbilities: []`, `spellEnhancers: []`.
  - `lib/utils/abilities/__tests__/fixtures.ts`: `makeParticipant(opts)`, `resolved(ability, source?)`, `seq(...values)`.

- [ ] **Step 1: Типи**

```ts
// types/abilities.ts
import type { Ability, DamageKind, StaticEffect } from "@/lib/utils/abilities/schema";

export type { Ability, StaticEffect };

export interface AbilitySource {
  type: "skill" | "race" | "artifact" | "artifactSet" | "unit";
  id: string;
  name: string;
  icon?: string | null;
  line?: { mainSkillId: string; level: string };
}

export type ResolvedAbility = Ability & { key: string; source: AbilitySource };

export interface AbilityUsageCounter {
  battle: number;
  round: number;
  turn: number;
}

export interface SpellEnhancer {
  skillId: string;
  name: string;
  mainSkillId: string | null;
  level: string | null;
  linkedSpellId: string | null;
  spellGroupId: string | null;
  spellEnhancements: {
    spellEffectIncrease?: number;
    spellTargetChange?: { target: string };
    spellAdditionalModifier?: { modifier?: string; damageDice?: string; duration?: number };
    spellNewSpellId?: string;
    spellAllowMultipleTargets?: boolean;
    spellAoeSpellIds?: string[];
  };
}

export type AbilityEvent =
  | { type: "battleStart"; newcomerIds?: string[] }
  | { type: "roundStart" }
  | { type: "roundEnd" }
  | { type: "turnStart"; actorId: string }
  | { type: "turnEnd"; actorId: string }
  | { type: "attack"; phase: "before" | "after"; actorId: string; targetId: string; attackKind: "melee" | "ranged" }
  | { type: "hit"; actorId: string; targetId: string; attackKind: "melee" | "ranged"; damage: number }
  | { type: "kill"; actorId: string | null; targetId: string }
  | { type: "lethalDamage"; actorId: string | null; targetId: string }
  | { type: "spellCast"; phase: "before" | "after"; actorId: string; targetIds: string[] }
  | { type: "moraleCheck"; actorId: string; result: "success" | "fail" }
  | { type: "bonusAction"; actorId: string; abilityKey: string; targetId?: string };

export type AbilityDamageKind = DamageKind;
```

Додати в `types/index.ts`: `export * from "./abilities";`.

У `types/battle.ts`:
- імпортувати `import type { AbilityUsageCounter, ResolvedAbility, SpellEnhancer, StaticEffect } from "./abilities";`;
- в `ActiveEffect` додати `abilityKey?: string; abilityEffects?: StaticEffect[];`;
- у `BattleParticipantBattleData` додати `resolvedAbilities?: ResolvedAbility[]; spellEnhancers?: SpellEnhancer[]; abilityUsage?: Record<string, AbilityUsageCounter>;`.

- [ ] **Step 2: Перенести мок**

Створити `lib/utils/battle/__tests__/mock-participant.ts`. Скопіювати туди `createMockParticipant` з `lib/utils/skills/__tests__/skill-triggers-execution-mocks.ts` і додати в `battleData` `resolvedAbilities: [], spellEnhancers: []`. Потім знайти всіх користувачів старого моку:
`grep -rln "skill-triggers-execution-mocks" app lib components`
У файлах поза `lib/utils/skills/__tests__` змінити імпорт `createMockParticipant` на `@/lib/utils/battle/__tests__/mock-participant`.

- [ ] **Step 3: Фікстури для тестів умінь**

```ts
// lib/utils/abilities/__tests__/fixtures.ts
import { ParticipantSide } from "@/lib/constants/battle";
import type { Rng } from "@/lib/utils/abilities/engine/types";
import type { Ability } from "@/lib/utils/abilities/schema";
import { createMockParticipant } from "@/lib/utils/battle/__tests__/mock-participant";
import type { AbilitySource, ResolvedAbility } from "@/types/abilities";
import type { BattleParticipant } from "@/types/battle";

export function makeParticipant(opts: {
  id: string;
  side?: ParticipantSide;
  hp?: number;
  maxHp?: number;
  abilities?: ResolvedAbility[];
  level?: number;
}): BattleParticipant {
  const base = createMockParticipant();

  return {
    ...base,
    basicInfo: { ...base.basicInfo, id: opts.id, name: opts.id, side: opts.side ?? ParticipantSide.ALLY },
    abilities: { ...base.abilities, level: opts.level ?? 1 },
    combatStats: { ...base.combatStats, currentHp: opts.hp ?? 20, maxHp: opts.maxHp ?? 20 },
    battleData: { ...base.battleData, resolvedAbilities: opts.abilities ?? [] },
  };
}

export function resolved(ability: Omit<Ability, "id" | "name"> & Partial<Ability>, source: Partial<AbilitySource> = {}): ResolvedAbility {
  const full = { id: "a", name: "Вміння", ...ability } as Ability;

  const src: AbilitySource = { type: "skill", id: "s1", name: full.name, ...source };

  return { ...full, source: src, key: `${src.type}:${src.id}:${full.id}` };
}

export function seq(...values: number[]): Rng {
  let i = 0;

  return () => values[i++ % values.length];
}
```

- [ ] **Step 4: Написати тест примітивів**

```ts
// lib/utils/abilities/engine/__tests__/primitives.test.ts
import { describe, expect, it } from "vitest";

import { makeParticipant, resolved, seq } from "@/lib/utils/abilities/__tests__/fixtures";
import { resolveAmount, rollDice } from "@/lib/utils/abilities/engine/amount";
import { applyRawDamage } from "@/lib/utils/abilities/engine/hp";
import { resolveTargetIds } from "@/lib/utils/abilities/engine/targets";
import { upsertTimedEffect } from "@/lib/utils/abilities/engine/timed-effects";
import { recordUse, resetUsage, withinLimits } from "@/lib/utils/abilities/engine/usage";
import { ParticipantSide } from "@/lib/constants/battle";

describe("amount", () => {
  it("кидає кубики через rng", () => {
    expect(rollDice("2d6+1", seq(0, 0.99))).toBe(1 + 6 + 1);
  });

  it("формула, відсоток від шкоди і від макс. HP", () => {
    const owner = makeParticipant({ id: "o", level: 4, hp: 10, maxHp: 20 });

    const rng = seq(0);

    expect(resolveAmount({ formula: "2*hero_level" }, { owner, rng })).toBe(8);
    expect(resolveAmount({ percentOf: "eventDamage", value: 50 }, { owner, eventDamage: 9, rng })).toBe(4);
    expect(resolveAmount({ percentOf: "maxHp", value: 25 }, { owner, rng })).toBe(5);
  });
});

describe("targets", () => {
  const a = makeParticipant({ id: "a" });

  const b = makeParticipant({ id: "b" });

  const dead = { ...makeParticipant({ id: "d", hp: 0 }), combatStats: { ...makeParticipant({ id: "d" }).combatStats, currentHp: 0, status: "dead" as const } };

  const e = makeParticipant({ id: "e", side: ParticipantSide.ENEMY });

  const ps = [a, b, dead, e];

  it("allAllies — живі союзники разом із власником", () => {
    expect(resolveTargetIds("allAllies", "a", { type: "roundStart" }, ps)).toEqual(["a", "b"]);
  });

  it("eventTarget і eventActor з атаки", () => {
    const ev = { type: "hit" as const, actorId: "e", targetId: "a", attackKind: "melee" as const, damage: 3 };

    expect(resolveTargetIds("eventActor", "a", ev, ps)).toEqual(["e"]);
    expect(resolveTargetIds("eventTarget", "a", ev, ps)).toEqual(["a"]);
  });

  it("бонусна дія без цілі → власник", () => {
    expect(resolveTargetIds("eventTarget", "a", { type: "bonusAction", actorId: "a", abilityKey: "k" }, ps)).toEqual(["a"]);
  });
});

describe("usage", () => {
  const ab = resolved({ trigger: { event: "turnStart" }, limits: { perBattle: 2, perRound: 1 }, effects: [{ kind: "note", text: "x" }] });

  it("рахує й скидає лічильники", () => {
    let p = makeParticipant({ id: "p" });

    expect(withinLimits(p, ab)).toBe(true);
    p = recordUse(p, ab.key);
    expect(withinLimits(p, ab)).toBe(false);
    p = resetUsage(p, "round");
    expect(withinLimits(p, ab)).toBe(true);
    p = resetUsage(recordUse(p, ab.key), "round");
    expect(withinLimits(p, ab)).toBe(false);
  });
});

describe("timed effects", () => {
  it("повторне застосування оновлює тривалість, stackable — додає", () => {
    let p = makeParticipant({ id: "p" });

    const input = { timedKey: "k#0", name: "Лють", type: "buff" as const, rounds: 2, stackable: false };

    p = upsertTimedEffect(p, input, 1);
    p = upsertTimedEffect(p, { ...input, rounds: 3 }, 2);
    expect(p.battleData.activeEffects).toHaveLength(1);
    expect(p.battleData.activeEffects[0].duration).toBe(3);
    p = upsertTimedEffect(p, { ...input, stackable: true }, 2);
    expect(p.battleData.activeEffects).toHaveLength(2);
  });
});

describe("hp", () => {
  it("спершу tempHp, далі HP і статус", () => {
    const p = { ...makeParticipant({ id: "p", hp: 5 }), combatStats: { ...makeParticipant({ id: "p", hp: 5 }).combatStats, tempHp: 2 } };

    expect(applyRawDamage(p, 7).combatStats).toMatchObject({ tempHp: 0, currentHp: 0, status: "unconscious" });
    expect(applyRawDamage(p, 9).combatStats.status).toBe("dead");
  });
});
```

- [ ] **Step 5: Запустити тест — FAIL**

Run: `pnpm test:run lib/utils/abilities/engine`
Expected: FAIL — модулів не існує.

- [ ] **Step 6: Реалізувати примітиви**

```ts
// engine/types.ts
import type { StaticEffect } from "@/lib/utils/abilities/schema";
import type { BattleParticipant } from "@/types/battle";

export type Rng = () => number;

export interface AbilityRunContext {
  round: number;
  rng: Rng;
  depth?: number;
}

export interface AbilityRunResult {
  participants: BattleParticipant[];
  messages: string[];
  actionModifiers: Record<string, StaticEffect[]>;
  fired: string[];
}

export interface Downed {
  victimId: string;
  actorId: string | null;
}
```

```ts
// engine/participants.ts
import type { ResolvedAbility } from "@/types/abilities";
import type { BattleParticipant } from "@/types/battle";

export function findParticipant(ps: BattleParticipant[], id: string): BattleParticipant | undefined {
  return ps.find((p) => p.basicInfo.id === id);
}

export function replaceParticipant(ps: BattleParticipant[], updated: BattleParticipant): BattleParticipant[] {
  return ps.map((p) => (p.basicInfo.id === updated.basicInfo.id ? updated : p));
}

export function updateParticipant(
  ps: BattleParticipant[],
  id: string,
  fn: (p: BattleParticipant) => BattleParticipant,
): BattleParticipant[] {
  return ps.map((p) => (p.basicInfo.id === id ? fn(p) : p));
}

export function isUp(p: BattleParticipant): boolean {
  return p.combatStats.status === "active";
}

export function resolvedAbilitiesOf(p: BattleParticipant): ResolvedAbility[] {
  return p.battleData.resolvedAbilities ?? [];
}

export function participantNames(ps: BattleParticipant[], ids: string[]): string {
  return ids.map((id) => findParticipant(ps, id)?.basicInfo.name ?? id).join(", ");
}
```

```ts
// engine/events.ts
import type { DamageKind } from "@/lib/utils/abilities/schema";
import type { AbilityEvent } from "@/types/abilities";

export function eventActorId(e: AbilityEvent): string | null {
  return "actorId" in e ? e.actorId : null;
}

export function eventTargetIds(e: AbilityEvent): string[] {
  switch (e.type) {
    case "attack":
    case "hit":
    case "kill":
    case "lethalDamage":
      return [e.targetId];
    case "spellCast":
      return e.targetIds;
    case "bonusAction":
      return [e.targetId ?? e.actorId];
    default:
      return [];
  }
}

export function eventAttackKind(e: AbilityEvent | null): DamageKind | null {
  if (!e) return null;

  if (e.type === "attack" || e.type === "hit") return e.attackKind;

  return e.type === "spellCast" ? "magic" : null;
}

export function eventDamage(e: AbilityEvent): number | undefined {
  return e.type === "hit" ? e.damage : undefined;
}
```

```ts
// engine/amount.ts
import type { Rng } from "./types";

import { type Amount, DICE_RE, type Flat } from "@/lib/utils/abilities/schema";
import { evaluateFormula } from "@/lib/utils/battle/common/formula-evaluator";
import type { BattleParticipant } from "@/types/battle";

export function rollDice(notation: string, rng: Rng): number {
  const m = DICE_RE.exec(notation);

  if (!m) return 0;

  let total = Number(m[3] ?? 0);

  for (let i = 0; i < Number(m[1]); i++) total += 1 + Math.floor(rng() * Number(m[2]));

  return Math.max(0, total);
}

export function formulaContext(p: BattleParticipant): Record<string, number> {
  const { maxHp, currentHp, morale } = p.combatStats;

  return {
    hero_level: p.abilities.level,
    lost_hp_percent: maxHp > 0 ? ((maxHp - currentHp) / maxHp) * 100 : 0,
    morale,
  };
}

export function resolveFlat(flat: Flat, owner: BattleParticipant): number {
  return typeof flat === "number" ? flat : Math.floor(evaluateFormula(flat.formula, formulaContext(owner)));
}

export function resolveAmount(
  amount: Amount,
  input: { owner: BattleParticipant; target?: BattleParticipant; eventDamage?: number; rng: Rng },
): number {
  if (typeof amount === "number") return amount;

  if (typeof amount === "string") return rollDice(amount, input.rng);

  if ("formula" in amount) return Math.max(0, Math.floor(evaluateFormula(amount.formula, formulaContext(input.owner))));

  const base =
    amount.percentOf === "eventDamage" ? (input.eventDamage ?? 0) : (input.target ?? input.owner).combatStats.maxHp;

  return Math.floor((base * amount.value) / 100);
}
```

```ts
// engine/targets.ts
import { eventActorId, eventTargetIds } from "./events";
import { findParticipant, isUp } from "./participants";

import type { AbilityTarget } from "@/lib/utils/abilities/schema";
import type { AbilityEvent } from "@/types/abilities";
import type { BattleParticipant } from "@/types/battle";

export function resolveTargetIds(
  target: AbilityTarget | undefined,
  ownerId: string,
  event: AbilityEvent,
  ps: BattleParticipant[],
): string[] {
  const owner = findParticipant(ps, ownerId);

  if (!owner) return [];

  const side = owner.basicInfo.side;

  switch (target ?? "self") {
    case "self":
      return [ownerId];
    case "eventTarget":
      return eventTargetIds(event);
    case "eventActor": {
      const actor = eventActorId(event);

      return actor ? [actor] : [];
    }
    case "allAllies":
      return ps.filter((p) => isUp(p) && p.basicInfo.side === side).map((p) => p.basicInfo.id);
    case "allEnemies":
      return ps.filter((p) => isUp(p) && p.basicInfo.side !== side).map((p) => p.basicInfo.id);
  }
}
```

```ts
// engine/usage.ts
import type { AbilityUsageCounter, ResolvedAbility } from "@/types/abilities";
import type { BattleParticipant } from "@/types/battle";

const EMPTY: AbilityUsageCounter = { battle: 0, round: 0, turn: 0 };

export function usageOf(p: BattleParticipant, key: string): AbilityUsageCounter {
  return p.battleData.abilityUsage?.[key] ?? EMPTY;
}

export function withinLimits(p: BattleParticipant, ability: ResolvedAbility): boolean {
  const l = ability.limits;

  if (!l) return true;

  const u = usageOf(p, ability.key);

  return !(
    (l.perBattle !== undefined && u.battle >= l.perBattle) ||
    (l.perRound !== undefined && u.round >= l.perRound) ||
    (l.perTurn !== undefined && u.turn >= l.perTurn)
  );
}

export function recordUse(p: BattleParticipant, key: string): BattleParticipant {
  const u = usageOf(p, key);

  return {
    ...p,
    battleData: {
      ...p.battleData,
      abilityUsage: { ...p.battleData.abilityUsage, [key]: { battle: u.battle + 1, round: u.round + 1, turn: u.turn + 1 } },
    },
  };
}

export function resetUsage(p: BattleParticipant, scope: "round" | "turn"): BattleParticipant {
  const usage = p.battleData.abilityUsage;

  if (!usage) return p;

  const next = Object.fromEntries(Object.entries(usage).map(([k, u]) => [k, { ...u, [scope]: 0 }]));

  return { ...p, battleData: { ...p.battleData, abilityUsage: next } };
}
```

```ts
// engine/timed-effects.ts
import type { StaticEffect } from "@/lib/utils/abilities/schema";
import type { ActiveEffect, BattleParticipant } from "@/types/battle";

export interface TimedEffectInput {
  timedKey: string;
  name: string;
  type: ActiveEffect["type"];
  rounds: number;
  stackable: boolean;
  abilityEffects?: StaticEffect[];
  effects?: ActiveEffect["effects"];
  dotDamage?: ActiveEffect["dotDamage"];
}

export function upsertTimedEffect(p: BattleParticipant, input: TimedEffectInput, round: number): BattleParticipant {
  const current = p.battleData.activeEffects;

  const existing = input.stackable ? -1 : current.findIndex((e) => e.abilityKey === input.timedKey);

  const effect: ActiveEffect = {
    id: input.stackable ? `${input.timedKey}@${round}#${current.length}` : input.timedKey,
    name: input.name,
    type: input.type,
    duration: input.rounds,
    appliedAt: { round, timestamp: new Date() },
    effects: input.effects ?? [],
    abilityKey: input.timedKey,
    ...(input.abilityEffects && { abilityEffects: input.abilityEffects }),
    ...(input.dotDamage && { dotDamage: input.dotDamage }),
  };

  const next = existing >= 0 ? current.map((e, i) => (i === existing ? effect : e)) : [...current, effect];

  return { ...p, battleData: { ...p.battleData, activeEffects: next } };
}
```

```ts
// engine/hp.ts
import type { BattleParticipant, BattleParticipantCombatStats } from "@/types/battle";

export function downStatus(hp: number): BattleParticipantCombatStats["status"] {
  return hp < 0 ? "dead" : "unconscious";
}

export function applyRawDamage(p: BattleParticipant, amount: number): BattleParticipant {
  const fromTemp = Math.min(p.combatStats.tempHp, amount);

  const hp = p.combatStats.currentHp - (amount - fromTemp);

  return {
    ...p,
    combatStats: {
      ...p.combatStats,
      tempHp: p.combatStats.tempHp - fromTemp,
      currentHp: hp,
      status: hp <= 0 ? downStatus(hp) : p.combatStats.status,
    },
  };
}
```

- [ ] **Step 7: Тести і typecheck**

Run: `pnpm test:run lib/utils/abilities app/api/__tests__/battles && pnpm exec tsc --noEmit -p .`
Expected: PASS; tsc без помилок, бо нові поля опційні.

- [ ] **Step 8: Коміт**

```bash
pnpm lint --fix lib/utils/abilities lib/utils/battle/__tests__ types && git add -A && git commit -m "feat(abilities): engine primitives, ability types, shared participant mock"
```

---

### Task 3: Реєстр — тригери, умови, ефекти

**Files:**
- Create: `lib/utils/abilities/registry/{fields,labels,triggers,conditions}.ts`, `lib/utils/abilities/registry/effects/{static,hp,state,index}.ts`
- Test: `lib/utils/abilities/registry/__tests__/registry.test.ts`, `lib/utils/abilities/registry/__tests__/effects.test.ts`

**Interfaces:**
- Consumes: Task 1 (schema), Task 2 (`engine/*`, `types/abilities`).
- Produces:
  - `FieldMeta { name: string; label: string; input: "number"|"text"|"select"|"multiselect"|"amount"|"flat"|"target"|"duration"|"effects"|"strings"; options?: readonly { value: string; label: string }[]; optional?: boolean }`.
  - `TRIGGER_REGISTRY: { [E in TriggerEvent]: { event: E; label: string; fields: readonly FieldMeta[]; matches(trigger, event: AbilityEvent, owner: BattleParticipant, ps: BattleParticipant[]): boolean } }`, `triggerMatches(trigger, event, owner, ps): boolean`.
  - `CONDITION_REGISTRY` (`label`, `fields`), `evaluateCondition(c: Condition, ctx: { owner: BattleParticipant; event: AbilityEvent | null; participants: BattleParticipant[] }): boolean`.
  - `EffectApplyInput { participants; ability: ResolvedAbility; effectIndex: number; ownerId: string; effect: Effect; targetIds: string[]; event: AbilityEvent; ctx: AbilityRunContext }`.
  - `EffectApplyResult { participants; messages: string[]; actionModifiers?: { participantId: string; effect: StaticEffect }[]; downed?: Downed[] }`.
  - `EFFECT_REGISTRY: { [K in EffectKind]: { kind: K; label: string; static: boolean; fields: readonly FieldMeta[]; describe(e): string; apply(input): EffectApplyResult } }`, `applyEffect(input)`, `describeEffect(e)`.

- [ ] **Step 1: Тест-контракт і тести поведінки**

```ts
// registry/__tests__/registry.test.ts
import { describe, expect, it } from "vitest";

import { makeParticipant } from "@/lib/utils/abilities/__tests__/fixtures";
import { evaluateCondition } from "@/lib/utils/abilities/registry/conditions";
import { EFFECT_REGISTRY } from "@/lib/utils/abilities/registry/effects";
import { TRIGGER_REGISTRY, triggerMatches } from "@/lib/utils/abilities/registry/triggers";
import { ParticipantSide } from "@/lib/constants/battle";

describe("registry contract", () => {
  it("кожен ефект має label, fields, describe, apply", () => {
    for (const def of Object.values(EFFECT_REGISTRY)) {
      expect(def.label, def.kind).toBeTruthy();
      expect(Array.isArray(def.fields), def.kind).toBe(true);
      expect(typeof def.describe, def.kind).toBe("function");
      expect(typeof def.apply, def.kind).toBe("function");
    }
  });

  it("кожен тригер має label і matches", () => {
    for (const def of Object.values(TRIGGER_REGISTRY)) {
      expect(def.label).toBeTruthy();
      expect(typeof def.matches).toBe("function");
    }
  });
});

describe("triggerMatches", () => {
  const a = makeParticipant({ id: "a" });

  const ally = makeParticipant({ id: "b" });

  const e = makeParticipant({ id: "e", side: ParticipantSide.ENEMY });

  const ps = [a, ally, e];

  const atk = { type: "attack" as const, phase: "before" as const, actorId: "e", targetId: "a", attackKind: "ranged" as const };

  it("роль target спрацьовує для цілі атаки", () => {
    expect(triggerMatches({ event: "attack", phase: "before", role: "target" }, atk, a, ps)).toBe(true);
    expect(triggerMatches({ event: "attack", phase: "before", role: "attacker" }, atk, a, ps)).toBe(false);
    expect(triggerMatches({ event: "attack", phase: "before", role: "target", attackKind: "melee" }, atk, a, ps)).toBe(false);
  });

  it("kill: killer / killerSide / victimSide", () => {
    const kill = { type: "kill" as const, actorId: "a", targetId: "e" };

    expect(triggerMatches({ event: "kill", role: "killer" }, kill, a, ps)).toBe(true);
    expect(triggerMatches({ event: "kill", role: "killerSide" }, kill, ally, ps)).toBe(true);
    expect(triggerMatches({ event: "kill", role: "victimSide" }, kill, ally, ps)).toBe(false);
    expect(triggerMatches({ event: "kill", role: "victimSide" }, { type: "kill", actorId: "e", targetId: "a" }, ally, ps)).toBe(true);
  });

  it("battleStart з newcomerIds — лише для новачків", () => {
    expect(triggerMatches({ event: "battleStart" }, { type: "battleStart", newcomerIds: ["b"] }, a, ps)).toBe(false);
    expect(triggerMatches({ event: "battleStart" }, { type: "battleStart", newcomerIds: ["b"] }, ally, ps)).toBe(true);
  });

  it("passive ніколи не матчиться", () => {
    expect(triggerMatches({ event: "passive" }, { type: "roundStart" }, a, ps)).toBe(false);
  });
});

describe("evaluateCondition", () => {
  it("hpBelow anyAlly не враховує власника", () => {
    const owner = makeParticipant({ id: "o", hp: 1 });

    const ally = makeParticipant({ id: "x", hp: 3, maxHp: 20 });

    const ctx = { owner, event: null, participants: [owner, ally] };

    expect(evaluateCondition({ type: "hpBelow", who: "anyAlly", percent: 15 }, ctx)).toBe(true);
    expect(evaluateCondition({ type: "hpBelow", who: "anyAlly", percent: 10 }, ctx)).toBe(false);
    expect(evaluateCondition({ type: "any", conditions: [{ type: "hpAbove", who: "self", percent: 90 }, { type: "hpBelow", who: "self", percent: 10 }] }, ctx)).toBe(true);
  });

  it("attackKind з події заклинання — magic", () => {
    const owner = makeParticipant({ id: "o" });

    const ctx = { owner, event: { type: "spellCast" as const, phase: "before" as const, actorId: "o", targetIds: [] }, participants: [owner] };

    expect(evaluateCondition({ type: "attackKind", kind: "magic" }, ctx)).toBe(true);
  });
});
```

```ts
// registry/__tests__/effects.test.ts
import { describe, expect, it } from "vitest";

import { makeParticipant, resolved, seq } from "@/lib/utils/abilities/__tests__/fixtures";
import { applyEffect, describeEffect } from "@/lib/utils/abilities/registry/effects";
import type { Effect } from "@/lib/utils/abilities/schema";
import { ParticipantSide } from "@/lib/constants/battle";

function run(effect: Effect, targetIds: string[], ps = [makeParticipant({ id: "o" }), makeParticipant({ id: "t", side: ParticipantSide.ENEMY })]) {
  const ability = resolved({ trigger: { event: "hit", role: "attacker" }, effects: [effect] });

  return applyEffect({
    participants: ps,
    ability,
    effectIndex: 0,
    ownerId: "o",
    effect,
    targetIds,
    event: { type: "hit", actorId: "o", targetId: "t", attackKind: "melee", damage: 10 },
    ctx: { round: 1, rng: seq(0.5) },
  });
}

describe("effects", () => {
  it("dot кидає кубики один раз і вішає дебаф з dotDamage", () => {
    const r = run({ kind: "dot", damagePerRound: "1d4", damageType: "bleed", duration: { rounds: 3 } }, ["t"]);

    const t = r.participants[1];

    expect(t.battleData.activeEffects[0]).toMatchObject({ type: "debuff", duration: 3, dotDamage: { damagePerRound: 3, damageType: "bleed" } });
    expect(r.messages[0]).toContain("🔥");
  });

  it("статичний ефект без duration повертає actionModifiers і не змінює стан", () => {
    const r = run({ kind: "damageBonus", filter: { kind: "melee" }, percent: 10 }, ["o"]);

    expect(r.actionModifiers).toEqual([{ participantId: "o", effect: { kind: "damageBonus", filter: { kind: "melee" }, percent: 10 } }]);
    expect(r.participants[0].battleData.activeEffects).toHaveLength(0);
  });

  it("modifyStat з duration — таймовий бафф з abilityEffects", () => {
    const r = run({ kind: "modifyStat", stat: "armor", flat: -2, duration: { rounds: 1 }, target: "eventTarget" }, ["t"]);

    expect(r.participants[1].battleData.activeEffects[0]).toMatchObject({ type: "debuff", abilityEffects: [{ kind: "modifyStat", stat: "armor", flat: -2 }] });
  });

  it("dealDamage повертає downed", () => {
    const ps = [makeParticipant({ id: "o" }), makeParticipant({ id: "t", hp: 3, side: ParticipantSide.ENEMY })];

    const r = run({ kind: "dealDamage", amount: 5 }, ["t"], ps);

    expect(r.downed).toEqual([{ victimId: "t", actorId: "o" }]);
    expect(r.participants[1].combatStats.status).toBe("dead");
  });

  it("heal з revive повертає з 0 HP", () => {
    const down = makeParticipant({ id: "o", hp: -4 });

    const ps = [{ ...down, combatStats: { ...down.combatStats, status: "dead" as const } }];

    const r = run({ kind: "heal", amount: 1, revive: true }, ["o"], ps);

    expect(r.participants[0].combatStats).toMatchObject({ currentHp: 1, status: "active" });
  });

  it("changeMorale обмежується ±3, restoreSpellSlot бере найнижчий", () => {
    const base = makeParticipant({ id: "o" });

    const p = { ...base, combatStats: { ...base.combatStats, morale: 2 }, spellcasting: { ...base.spellcasting, spellSlots: { "1": { max: 2, current: 2 }, "2": { max: 2, current: 0 } } } };

    expect(run({ kind: "changeMorale", delta: 5 }, ["o"], [p]).participants[0].combatStats.morale).toBe(3);
    expect(run({ kind: "restoreSpellSlot", count: 1 }, ["o"], [p]).participants[0].spellcasting.spellSlots["2"].current).toBe(1);
  });

  it("randomOf обирає варіант через rng, cleanse знімає дебафи", () => {
    const r = run({ kind: "randomOf", options: [{ kind: "heal", amount: 1 }, { kind: "changeMorale", delta: 1 }] }, ["o"]);

    expect(r.participants[0].combatStats.morale).toBe(1);
  });

  it("describe", () => {
    expect(describeEffect({ kind: "damageBonus", filter: { kind: "melee" }, percent: 10 })).toBe("шкода (ближня) +10%");
    expect(describeEffect({ kind: "dot", damagePerRound: "1d4", damageType: "bleed", duration: { rounds: 3 } })).toBe("bleed 1d4/раунд × 3 р.");
  });
});
```

- [ ] **Step 2: FAIL**

Run: `pnpm test:run lib/utils/abilities/registry`
Expected: FAIL — модулі не існують.

- [ ] **Step 3: `fields.ts`, `labels.ts`**

```ts
// fields.ts
export type FieldInput = "number" | "text" | "select" | "multiselect" | "amount" | "flat" | "target" | "duration" | "effects" | "strings";

export interface FieldMeta {
  name: string;
  label: string;
  input: FieldInput;
  options?: readonly { value: string; label: string }[];
  optional?: boolean;
}

export const TARGET_FIELD: FieldMeta = { name: "target", label: "Ціль", input: "target", optional: true };

export const DURATION_FIELD: FieldMeta = { name: "duration", label: "Тривалість (раунди)", input: "duration", optional: true };
```

```ts
// labels.ts
import type { Amount, DamageFilterKind, Flat, StatKey } from "@/lib/utils/abilities/schema";

export const STAT_LABELS: Record<StatKey, string> = {
  armor: "AC",
  attackBonus: "бонус атаки",
  critThreshold: "поріг криту",
  initiative: "ініціатива",
  maxHp: "макс. HP",
  speed: "швидкість",
  morale: "мораль",
  minTargets: "мін. цілей",
  maxTargets: "макс. цілей",
  spellSlots: "слоти заклинань",
  strength: "Сила",
  dexterity: "Спритність",
  constitution: "Статура",
  intelligence: "Інтелект",
  wisdom: "Мудрість",
  charisma: "Харизма",
};

export const DAMAGE_FILTER_LABELS: Record<DamageFilterKind, string> = {
  melee: "ближня",
  ranged: "дальня",
  magic: "магічна",
  physical: "фізична",
  all: "вся",
};

export function signed(n: number): string {
  return n >= 0 ? `+${n}` : `${n}`;
}

export function flatLabel(flat: Flat): string {
  return typeof flat === "number" ? signed(flat) : `+(${flat.formula})`;
}

export function amountLabel(amount: Amount): string {
  if (typeof amount === "number" || typeof amount === "string") return String(amount);

  if ("formula" in amount) return `(${amount.formula})`;

  return `${amount.value}% від ${amount.percentOf === "eventDamage" ? "завданої шкоди" : "макс. HP"}`;
}
```

- [ ] **Step 4: `triggers.ts`**

```ts
import type { FieldMeta } from "./fields";

import { findParticipant } from "@/lib/utils/abilities/engine/participants";
import type { Trigger, TriggerEvent } from "@/lib/utils/abilities/schema";
import type { AbilityEvent } from "@/types/abilities";
import type { BattleParticipant } from "@/types/battle";

type Matcher<E extends TriggerEvent> = (
  trigger: Extract<Trigger, { event: E }>,
  event: AbilityEvent,
  owner: BattleParticipant,
  ps: BattleParticipant[],
) => boolean;

interface TriggerDefinition<E extends TriggerEvent> {
  event: E;
  label: string;
  fields: readonly FieldMeta[];
  matches: Matcher<E>;
}

const PHASE: FieldMeta = { name: "phase", label: "Фаза", input: "select", options: [{ value: "before", label: "до" }, { value: "after", label: "після" }] };

const ATTACK_KIND: FieldMeta = { name: "attackKind", label: "Тип атаки", input: "select", optional: true, options: [{ value: "melee", label: "ближня" }, { value: "ranged", label: "дальня" }] };

const ATTACK_ROLE: FieldMeta = { name: "role", label: "Роль", input: "select", options: [{ value: "attacker", label: "атакую я" }, { value: "target", label: "атакують мене" }] };

const id = (p: BattleParticipant) => p.basicInfo.id;

const sameSide = (a: BattleParticipant | undefined, b: BattleParticipant) => !!a && a.basicInfo.side === b.basicInfo.side;

export const TRIGGER_REGISTRY: { [E in TriggerEvent]: TriggerDefinition<E> } = {
  passive: { event: "passive", label: "Пасивно (завжди)", fields: [], matches: () => false },
  battleStart: {
    event: "battleStart",
    label: "Початок бою",
    fields: [],
    matches: (_t, e, o) => e.type === "battleStart" && (!e.newcomerIds || e.newcomerIds.includes(id(o))),
  },
  roundStart: { event: "roundStart", label: "Початок раунду", fields: [], matches: (_t, e) => e.type === "roundStart" },
  roundEnd: { event: "roundEnd", label: "Кінець раунду", fields: [], matches: (_t, e) => e.type === "roundEnd" },
  turnStart: { event: "turnStart", label: "Початок мого ходу", fields: [], matches: (_t, e, o) => e.type === "turnStart" && e.actorId === id(o) },
  turnEnd: { event: "turnEnd", label: "Кінець мого ходу", fields: [], matches: (_t, e, o) => e.type === "turnEnd" && e.actorId === id(o) },
  attack: {
    event: "attack",
    label: "Атака",
    fields: [PHASE, ATTACK_ROLE, ATTACK_KIND],
    matches: (t, e, o) =>
      e.type === "attack" &&
      e.phase === t.phase &&
      (!t.attackKind || t.attackKind === e.attackKind) &&
      (t.role === "attacker" ? e.actorId : e.targetId) === id(o),
  },
  hit: {
    event: "hit",
    label: "Влучання",
    fields: [ATTACK_ROLE, ATTACK_KIND],
    matches: (t, e, o) =>
      e.type === "hit" && (!t.attackKind || t.attackKind === e.attackKind) && (t.role === "attacker" ? e.actorId : e.targetId) === id(o),
  },
  kill: {
    event: "kill",
    label: "Смерть",
    fields: [{ name: "role", label: "Хто", input: "select", options: [{ value: "killer", label: "я вбив" }, { value: "killerSide", label: "вбив хтось із моїх" }, { value: "victimSide", label: "загинув союзник" }] }],
    matches: (t, e, o, ps) => {
      if (e.type !== "kill") return false;

      if (t.role === "killer") return e.actorId === id(o);

      if (t.role === "killerSide") return sameSide(e.actorId ? findParticipant(ps, e.actorId) : undefined, o);

      return e.targetId !== id(o) && sameSide(findParticipant(ps, e.targetId), o);
    },
  },
  lethalDamage: { event: "lethalDamage", label: "Летальна шкода", fields: [], matches: (_t, e, o) => e.type === "lethalDamage" && e.targetId === id(o) },
  spellCast: {
    event: "spellCast",
    label: "Заклинання",
    fields: [PHASE, { name: "role", label: "Роль", input: "select", options: [{ value: "caster", label: "кастую я" }, { value: "target", label: "ціль — я" }] }],
    matches: (t, e, o) =>
      e.type === "spellCast" && e.phase === t.phase && (t.role === "caster" ? e.actorId === id(o) : e.targetIds.includes(id(o))),
  },
  moraleCheck: {
    event: "moraleCheck",
    label: "Перевірка моралі",
    fields: [
      { name: "result", label: "Результат", input: "select", options: [{ value: "success", label: "успіх" }, { value: "fail", label: "провал" }, { value: "any", label: "будь-який" }] },
      { name: "whose", label: "Чия", input: "select", options: [{ value: "self", label: "моя" }, { value: "ally", label: "союзника" }] },
    ],
    matches: (t, e, o, ps) => {
      if (e.type !== "moraleCheck" || (t.result !== "any" && t.result !== e.result)) return false;

      return t.whose === "self" ? e.actorId === id(o) : e.actorId !== id(o) && sameSide(findParticipant(ps, e.actorId), o);
    },
  },
  bonusAction: { event: "bonusAction", label: "Бонусна дія (кнопка)", fields: [], matches: (_t, e, o) => e.type === "bonusAction" && e.actorId === id(o) },
};

export function triggerMatches(trigger: Trigger, event: AbilityEvent, owner: BattleParticipant, ps: BattleParticipant[]): boolean {
  const def = TRIGGER_REGISTRY[trigger.event] as TriggerDefinition<TriggerEvent>;

  return def.matches(trigger as never, event, owner, ps);
}
```

- [ ] **Step 5: `conditions.ts`**

```ts
import type { FieldMeta } from "./fields";

import { eventActorId, eventAttackKind, eventTargetIds } from "@/lib/utils/abilities/engine/events";
import { findParticipant, isUp } from "@/lib/utils/abilities/engine/participants";
import type { Condition, ConditionSubject } from "@/lib/utils/abilities/schema";
import type { AbilityEvent } from "@/types/abilities";
import type { BattleParticipant } from "@/types/battle";

export interface ConditionContext {
  owner: BattleParticipant;
  event: AbilityEvent | null;
  participants: BattleParticipant[];
}

const WHO: FieldMeta = {
  name: "who",
  label: "Хто",
  input: "select",
  options: [
    { value: "self", label: "я" },
    { value: "eventTarget", label: "ціль події" },
    { value: "eventActor", label: "виконавець події" },
    { value: "anyAlly", label: "будь-який союзник" },
    { value: "anyEnemy", label: "будь-який ворог" },
  ],
};

export const CONDITION_REGISTRY: Record<Condition["type"], { label: string; fields: readonly FieldMeta[] }> = {
  hpBelow: { label: "HP ≤ %", fields: [WHO, { name: "percent", label: "%", input: "number" }] },
  hpAbove: { label: "HP ≥ %", fields: [WHO, { name: "percent", label: "%", input: "number" }] },
  attackKind: { label: "Тип атаки", fields: [{ name: "kind", label: "Тип", input: "select", options: [{ value: "melee", label: "ближня" }, { value: "ranged", label: "дальня" }, { value: "magic", label: "магія" }] }] },
  targetHasCondition: { label: "Ціль має стан", fields: [{ name: "condition", label: "Стан", input: "text" }] },
  all: { label: "Усі умови", fields: [{ name: "conditions", label: "Умови", input: "effects" }] },
  any: { label: "Будь-яка умова", fields: [{ name: "conditions", label: "Умови", input: "effects" }] },
};

function subjects(who: ConditionSubject, ctx: ConditionContext): BattleParticipant[] {
  const { owner, event, participants: ps } = ctx;

  const byIds = (ids: string[]) => ids.map((i) => findParticipant(ps, i)).filter((p): p is BattleParticipant => !!p);

  switch (who) {
    case "self":
      return [owner];
    case "eventTarget":
      return event ? byIds(eventTargetIds(event)) : [];
    case "eventActor": {
      const actor = event ? eventActorId(event) : null;

      return actor ? byIds([actor]) : [];
    }
    case "anyAlly":
      return ps.filter((p) => isUp(p) && p.basicInfo.side === owner.basicInfo.side && p.basicInfo.id !== owner.basicInfo.id);
    case "anyEnemy":
      return ps.filter((p) => isUp(p) && p.basicInfo.side !== owner.basicInfo.side);
  }
}

const hpPercent = (p: BattleParticipant) => (p.combatStats.maxHp > 0 ? (p.combatStats.currentHp / p.combatStats.maxHp) * 100 : 0);

export function evaluateCondition(c: Condition, ctx: ConditionContext): boolean {
  switch (c.type) {
    case "hpBelow":
      return subjects(c.who, ctx).some((p) => hpPercent(p) <= c.percent);
    case "hpAbove":
      return subjects(c.who, ctx).some((p) => hpPercent(p) >= c.percent);
    case "attackKind":
      return eventAttackKind(ctx.event) === c.kind;
    case "targetHasCondition":
      return subjects("eventTarget", ctx).some((p) =>
        p.battleData.activeEffects.some((e) => e.effects.some((d) => d.type === c.condition)),
      );
    case "all":
      return c.conditions.every((x) => evaluateCondition(x, ctx));
    case "any":
      return c.conditions.some((x) => evaluateCondition(x, ctx));
  }
}
```

- [ ] **Step 6: Реєстр ефектів**

`registry/effects/static.ts` описує `modifyStat`, `damageBonus`, `flag`, `note`:

```ts
import { DURATION_FIELD, type FieldMeta, TARGET_FIELD } from "../fields";
import { DAMAGE_FILTER_LABELS, flatLabel, signed, STAT_LABELS } from "../labels";
import type { EffectApplyInput, EffectApplyResult } from "./types";

import { findParticipant, participantNames, updateParticipant } from "@/lib/utils/abilities/engine/participants";
import { upsertTimedEffect } from "@/lib/utils/abilities/engine/timed-effects";
import type { Effect, StaticEffect } from "@/lib/utils/abilities/schema";

export function stripTiming(effect: StaticEffect): StaticEffect {
  const { duration: _d, target: _t, ...rest } = effect;

  void _d;
  void _t;

  return rest as StaticEffect;
}

export function applyStatic(input: EffectApplyInput<StaticEffect>, describe: (e: Effect) => string): EffectApplyResult {
  const { effect, ability, targetIds, ctx } = input;

  const stripped = stripTiming(effect);

  if (!effect.duration) {
    return {
      participants: input.participants,
      messages: [],
      actionModifiers: targetIds.map((participantId) => ({ participantId, effect: stripped })),
    };
  }

  const owner = findParticipant(input.participants, input.ownerId);

  let ps = input.participants;

  for (const id of targetIds) {
    ps = updateParticipant(ps, id, (p) =>
      upsertTimedEffect(
        p,
        {
          timedKey: `${ability.key}#${input.effectIndex}`,
          name: ability.name,
          type: p.basicInfo.side === owner?.basicInfo.side ? "buff" : "debuff",
          rounds: effect.duration!.rounds,
          stackable: ability.stackable === true,
          abilityEffects: [stripped],
        },
        ctx.round,
      ),
    );
  }

  return {
    participants: ps,
    messages: [`✨ ${ability.name}: ${describe(effect)} → ${participantNames(ps, targetIds)} (${effect.duration.rounds} р.)`],
  };
}

const VALUE_FIELDS: readonly FieldMeta[] = [
  { name: "flat", label: "Число / формула", input: "flat", optional: true },
  { name: "percent", label: "%", input: "number", optional: true },
];

export const modifyStatFields: readonly FieldMeta[] = [
  { name: "stat", label: "Стат", input: "select", options: Object.entries(STAT_LABELS).map(([value, label]) => ({ value, label })) },
  ...VALUE_FIELDS,
  TARGET_FIELD,
  DURATION_FIELD,
];

export const damageBonusFields: readonly FieldMeta[] = [
  { name: "filter.kind", label: "Тип шкоди", input: "select", options: Object.entries(DAMAGE_FILTER_LABELS).map(([value, label]) => ({ value, label })) },
  { name: "filter.school", label: "Школа магії", input: "text", optional: true },
  ...VALUE_FIELDS,
  TARGET_FIELD,
  DURATION_FIELD,
];

function valueLabel(e: { flat?: Parameters<typeof flatLabel>[0]; percent?: number }): string {
  return [e.flat !== undefined ? flatLabel(e.flat) : null, e.percent !== undefined ? `${signed(e.percent)}%` : null]
    .filter(Boolean)
    .join(" ");
}

export function describeModifyStat(e: Extract<Effect, { kind: "modifyStat" }>): string {
  const levels = e.spellLevels ? ` (рівні ${e.spellLevels.join(", ")})` : "";

  return `${STAT_LABELS[e.stat]}${levels} ${valueLabel(e)}`;
}

export function describeDamageBonus(e: Extract<Effect, { kind: "damageBonus" }>): string {
  return `шкода (${DAMAGE_FILTER_LABELS[e.filter.kind]}${e.filter.school ? ", школа" : ""}) ${valueLabel(e)}`;
}

export function describeFlag(e: Extract<Effect, { kind: "flag" }>): string {
  switch (e.flag) {
    case "advantage":
      return e.attackKind === "all" ? "перевага на атаки" : `перевага на ${e.attackKind === "melee" ? "ближні" : "дальні"} атаки`;
    case "disadvantage":
      return "недолік на атаки";
    case "disadvantageForAttackers":
      return "недолік для атакувальників";
    case "guaranteedHit":
      return "гарантоване влучання";
    case "resistance":
      return e.percent >= 100 ? `імунітет: ${e.damageType}` : `опір ${e.damageType} ${e.percent}%`;
    case "spellImmunity":
      return `імунітет до заклинань (${e.spellIds.length})`;
    case "counterAttack":
      return `контратака +${e.bonusPercent}%`;
    case "seeEnemyHp":
      return "бачить HP ворогів";
  }
}
```

`registry/effects/types.ts`:

```ts
import type { AbilityRunContext, Downed } from "@/lib/utils/abilities/engine/types";
import type { Effect, StaticEffect } from "@/lib/utils/abilities/schema";
import type { AbilityEvent, ResolvedAbility } from "@/types/abilities";
import type { BattleParticipant } from "@/types/battle";

export interface EffectApplyInput<E extends Effect = Effect> {
  participants: BattleParticipant[];
  ability: ResolvedAbility;
  effectIndex: number;
  ownerId: string;
  effect: E;
  targetIds: string[];
  event: AbilityEvent;
  ctx: AbilityRunContext;
}

export interface EffectApplyResult {
  participants: BattleParticipant[];
  messages: string[];
  actionModifiers?: { participantId: string; effect: StaticEffect }[];
  downed?: Downed[];
}
```

`registry/effects/hp.ts` описує `dealDamage`, `heal`, `dot`:

```ts
import { amountLabel } from "../labels";
import type { EffectApplyInput, EffectApplyResult } from "./types";

import { resolveAmount } from "@/lib/utils/abilities/engine/amount";
import { eventDamage } from "@/lib/utils/abilities/engine/events";
import { applyRawDamage } from "@/lib/utils/abilities/engine/hp";
import { findParticipant, isUp, replaceParticipant } from "@/lib/utils/abilities/engine/participants";
import { upsertTimedEffect } from "@/lib/utils/abilities/engine/timed-effects";
import type { Effect } from "@/lib/utils/abilities/schema";

type Of<K extends Effect["kind"]> = Extract<Effect, { kind: K }>;

export function applyDealDamage(input: EffectApplyInput<Of<"dealDamage">>): EffectApplyResult {
  const { ability, effect, ctx } = input;

  let ps = input.participants;

  const owner = findParticipant(ps, input.ownerId)!;

  const messages: string[] = [];

  const downed: EffectApplyResult["downed"] = [];

  for (const id of input.targetIds) {
    const t = findParticipant(ps, id);

    if (!t || !isUp(t)) continue;

    const amount = resolveAmount(effect.amount, { owner, target: t, eventDamage: eventDamage(input.event), rng: ctx.rng });

    if (amount <= 0) continue;

    const updated = applyRawDamage(t, amount);

    ps = replaceParticipant(ps, updated);
    messages.push(`💥 ${ability.name}: ${t.basicInfo.name} −${amount} HP`);

    if (!isUp(updated)) downed.push({ victimId: id, actorId: input.ownerId });
  }

  return { participants: ps, messages, downed };
}

export function applyHeal(input: EffectApplyInput<Of<"heal">>): EffectApplyResult {
  const { ability, effect, ctx } = input;

  let ps = input.participants;

  const owner = findParticipant(ps, input.ownerId)!;

  const messages: string[] = [];

  for (const id of input.targetIds) {
    const t = findParticipant(ps, id);

    if (!t || (!isUp(t) && !effect.revive)) continue;

    const amount = resolveAmount(effect.amount, { owner, target: t, eventDamage: eventDamage(input.event), rng: ctx.rng });

    const before = Math.max(0, t.combatStats.currentHp);

    const hp = Math.min(t.combatStats.maxHp, before + amount);

    if (hp <= before && isUp(t)) continue;

    ps = replaceParticipant(ps, {
      ...t,
      combatStats: { ...t.combatStats, currentHp: hp, status: hp > 0 ? "active" : t.combatStats.status },
    });
    messages.push(
      isUp(t)
        ? `💚 ${ability.name}: ${t.basicInfo.name} +${hp - before} HP`
        : `✝️ ${ability.name}: ${t.basicInfo.name} повертається з ${hp} HP`,
    );
  }

  return { participants: ps, messages };
}

export function applyDot(input: EffectApplyInput<Of<"dot">>): EffectApplyResult {
  const { ability, effect, ctx } = input;

  let ps = input.participants;

  const owner = findParticipant(ps, input.ownerId)!;

  const messages: string[] = [];

  for (const id of input.targetIds) {
    const t = findParticipant(ps, id);

    if (!t || !isUp(t)) continue;

    const dmg = resolveAmount(effect.damagePerRound, { owner, target: t, eventDamage: eventDamage(input.event), rng: ctx.rng });

    if (dmg <= 0) continue;

    ps = replaceParticipant(
      ps,
      upsertTimedEffect(
        t,
        {
          timedKey: `${ability.key}#${input.effectIndex}`,
          name: ability.name,
          type: "debuff",
          rounds: effect.duration.rounds,
          stackable: ability.stackable === true,
          dotDamage: { damagePerRound: dmg, damageType: effect.damageType },
        },
        ctx.round,
      ),
    );
    messages.push(`🔥 ${ability.name}: ${effect.damageType} ${dmg}/раунд → ${t.basicInfo.name} (${effect.duration.rounds} р.)`);
  }

  return { participants: ps, messages };
}

export const describeDealDamage = (e: Of<"dealDamage">) => `шкода ${amountLabel(e.amount)}${e.damageType ? ` ${e.damageType}` : ""}`;

export const describeHeal = (e: Of<"heal">) => `${e.revive ? "воскресіння" : "лікування"} ${amountLabel(e.amount)}`;

export const describeDot = (e: Of<"dot">) => `${e.damageType} ${amountLabel(e.damagePerRound)}/раунд × ${e.duration.rounds} р.`;
```

`registry/effects/state.ts` описує `applyCondition`, `grantAction`, `restoreSpellSlot`, `changeMorale`, `cleanse`:

```ts
import { signed } from "../labels";
import type { EffectApplyInput, EffectApplyResult } from "./types";

import { findParticipant, participantNames, updateParticipant } from "@/lib/utils/abilities/engine/participants";
import { upsertTimedEffect } from "@/lib/utils/abilities/engine/timed-effects";
import type { Effect } from "@/lib/utils/abilities/schema";
import type { BattleParticipant } from "@/types/battle";

type Of<K extends Effect["kind"]> = Extract<Effect, { kind: K }>;

function each(
  input: EffectApplyInput,
  fn: (p: BattleParticipant) => BattleParticipant | null,
  message: (names: string) => string,
): EffectApplyResult {
  let ps = input.participants;

  const touched: string[] = [];

  for (const id of input.targetIds) {
    const p = findParticipant(ps, id);

    const next = p ? fn(p) : null;

    if (!next) continue;

    ps = updateParticipant(ps, id, () => next);
    touched.push(id);
  }

  return { participants: ps, messages: touched.length ? [message(participantNames(ps, touched))] : [] };
}

export const CONDITION_LABELS: Record<Of<"applyCondition">["condition"], string> = {
  no_bonus_action: "без бонусної дії",
  no_reaction: "без реакції",
  disable_melee_attacks: "без ближніх атак",
  disable_ranged_attacks: "без дальніх атак",
  disable_spell_casting: "без заклинань",
};

export function applyCondition(input: EffectApplyInput<Of<"applyCondition">>): EffectApplyResult {
  const { ability, effect, ctx } = input;

  return each(
    input,
    (p) =>
      upsertTimedEffect(
        p,
        {
          timedKey: `${ability.key}#${input.effectIndex}`,
          name: ability.name,
          type: "condition",
          rounds: effect.duration.rounds,
          stackable: false,
          effects: [{ type: effect.condition, value: 1 }],
        },
        ctx.round,
      ),
    (names) => `⛓ ${ability.name}: ${names} — ${CONDITION_LABELS[effect.condition]} (${effect.duration.rounds} р.)`,
  );
}

export function applyGrantAction(input: EffectApplyInput<Of<"grantAction">>): EffectApplyResult {
  const { ability, effect } = input;

  return each(
    input,
    (p) => ({
      ...p,
      actionFlags: {
        ...p.actionFlags,
        ...((effect.refreshAction || effect.extraActions) && { hasUsedAction: false }),
        ...(effect.refreshBonusAction && { hasUsedBonusAction: false }),
        ...(effect.refreshReaction && { hasUsedReaction: false }),
      },
      battleData: effect.extraActions
        ? { ...p.battleData, pendingExtraActions: (p.battleData.pendingExtraActions ?? 0) + effect.extraActions }
        : p.battleData,
    }),
    (names) => `⚔️ ${ability.name}: ${names} — ${describeGrantAction(effect)}`,
  );
}

export function applyRestoreSpellSlot(input: EffectApplyInput<Of<"restoreSpellSlot">>): EffectApplyResult {
  const { ability, effect } = input;

  return each(
    input,
    (p) => {
      const slots = p.spellcasting.spellSlots;

      const level = Object.keys(slots)
        .sort((a, b) => Number(a) - Number(b))
        .find((l) => slots[l].current < slots[l].max);

      if (!level) return null;

      const slot = slots[level];

      return {
        ...p,
        spellcasting: { ...p.spellcasting, spellSlots: { ...slots, [level]: { ...slot, current: Math.min(slot.max, slot.current + effect.count) } } },
      };
    },
    (names) => `🔮 ${ability.name}: ${names} відновлює ${effect.count} слот(и)`,
  );
}

export function applyChangeMorale(input: EffectApplyInput<Of<"changeMorale">>): EffectApplyResult {
  const { ability, effect } = input;

  return each(
    input,
    (p) => {
      const morale = Math.max(-3, Math.min(3, p.combatStats.morale + effect.delta));

      return morale === p.combatStats.morale ? null : { ...p, combatStats: { ...p.combatStats, morale } };
    },
    (names) => `📊 ${ability.name}: ${names} мораль ${signed(effect.delta)}`,
  );
}

export function applyCleanse(input: EffectApplyInput<Of<"cleanse">>): EffectApplyResult {
  const { ability } = input;

  return each(
    input,
    (p) => {
      const kept = p.battleData.activeEffects.filter((e) => e.type !== "debuff");

      return kept.length === p.battleData.activeEffects.length ? null : { ...p, battleData: { ...p.battleData, activeEffects: kept } };
    },
    (names) => `✨ ${ability.name}: з ${names} знято дебафи`,
  );
}

export function describeGrantAction(e: Of<"grantAction">): string {
  return [
    e.extraActions ? `+${e.extraActions} дія` : null,
    e.refreshAction ? "оновлює дію" : null,
    e.refreshBonusAction ? "оновлює бонусну дію" : null,
    e.refreshReaction ? "оновлює реакцію" : null,
  ]
    .filter(Boolean)
    .join(", ");
}
```

`registry/effects/index.ts` збирає реєстр, `applyEffect`, `describeEffect` і `randomOf`:

```ts
import { DURATION_FIELD, type FieldMeta, TARGET_FIELD } from "../fields";
import { applyDealDamage, applyDot, applyHeal, describeDealDamage, describeDot, describeHeal } from "./hp";
import {
  applyChangeMorale,
  applyCleanse,
  applyCondition,
  applyGrantAction,
  applyRestoreSpellSlot,
  CONDITION_LABELS,
  describeGrantAction,
} from "./state";
import {
  applyStatic,
  damageBonusFields,
  describeDamageBonus,
  describeFlag,
  describeModifyStat,
  modifyStatFields,
} from "./static";
import type { EffectApplyInput, EffectApplyResult } from "./types";

import { signed } from "../labels";

import type { Effect, EffectKind } from "@/lib/utils/abilities/schema";

export type { EffectApplyInput, EffectApplyResult };

interface EffectDefinition<K extends EffectKind> {
  kind: K;
  label: string;
  static: boolean;
  fields: readonly FieldMeta[];
  describe: (e: Extract<Effect, { kind: K }>) => string;
  apply: (input: EffectApplyInput<Extract<Effect, { kind: K }>>) => EffectApplyResult;
}

const AMOUNT: FieldMeta = { name: "amount", label: "Кількість (число, кубики, формула, %)", input: "amount" };

const REQUIRED_DURATION: FieldMeta = { ...DURATION_FIELD, optional: false };

export const EFFECT_REGISTRY: { [K in EffectKind]: EffectDefinition<K> } = {
  modifyStat: { kind: "modifyStat", label: "Змінити стат", static: true, fields: modifyStatFields, describe: describeModifyStat, apply: (i) => applyStatic(i, describeEffect) },
  damageBonus: { kind: "damageBonus", label: "Бонус шкоди", static: true, fields: damageBonusFields, describe: describeDamageBonus, apply: (i) => applyStatic(i, describeEffect) },
  flag: { kind: "flag", label: "Прапорець", static: true, fields: [{ name: "flag", label: "Прапорець", input: "select" }, TARGET_FIELD, DURATION_FIELD], describe: describeFlag, apply: (i) => applyStatic(i, describeEffect) },
  note: {
    kind: "note",
    label: "Нотатка для DM",
    static: true,
    fields: [{ name: "text", label: "Текст", input: "text" }],
    describe: (e) => e.text,
    apply: (i) => ({ participants: i.participants, messages: [`📜 ${i.ability.name}: ${i.effect.text}`] }),
  },
  dealDamage: { kind: "dealDamage", label: "Завдати шкоди", static: false, fields: [AMOUNT, { name: "damageType", label: "Тип", input: "text", optional: true }, TARGET_FIELD], describe: describeDealDamage, apply: applyDealDamage },
  heal: { kind: "heal", label: "Лікування", static: false, fields: [AMOUNT, { name: "revive", label: "Воскрешає", input: "select", optional: true }, TARGET_FIELD], describe: describeHeal, apply: applyHeal },
  dot: { kind: "dot", label: "Шкода щораунду (DOT)", static: false, fields: [{ ...AMOUNT, name: "damagePerRound" }, { name: "damageType", label: "Тип", input: "text" }, TARGET_FIELD, REQUIRED_DURATION], describe: describeDot, apply: applyDot },
  applyCondition: {
    kind: "applyCondition",
    label: "Накласти стан",
    static: false,
    fields: [{ name: "condition", label: "Стан", input: "select", options: Object.entries(CONDITION_LABELS).map(([value, label]) => ({ value, label })) }, TARGET_FIELD, REQUIRED_DURATION],
    describe: (e) => `${CONDITION_LABELS[e.condition]} × ${e.duration.rounds} р.`,
    apply: applyCondition,
  },
  grantAction: { kind: "grantAction", label: "Дати дію", static: false, fields: [{ name: "extraActions", label: "Додаткові дії", input: "number", optional: true }, TARGET_FIELD], describe: describeGrantAction, apply: applyGrantAction },
  restoreSpellSlot: { kind: "restoreSpellSlot", label: "Відновити слот", static: false, fields: [{ name: "count", label: "Скільки", input: "number" }, TARGET_FIELD], describe: (e) => `+${e.count} слот`, apply: applyRestoreSpellSlot },
  changeMorale: { kind: "changeMorale", label: "Змінити мораль", static: false, fields: [{ name: "delta", label: "Зміна", input: "number" }, TARGET_FIELD], describe: (e) => `мораль ${signed(e.delta)}`, apply: applyChangeMorale },
  cleanse: { kind: "cleanse", label: "Зняти дебафи", static: false, fields: [TARGET_FIELD], describe: () => "зняття дебафів", apply: applyCleanse },
  randomOf: {
    kind: "randomOf",
    label: "Випадковий з варіантів",
    static: false,
    fields: [{ name: "options", label: "Варіанти", input: "effects" }],
    describe: (e) => `одне з: ${e.options.map(describeEffect).join(" / ")}`,
    apply: (i) => {
      const index = Math.min(i.effect.options.length - 1, Math.floor(i.ctx.rng() * i.effect.options.length));

      return applyEffect({ ...i, effect: i.effect.options[index] });
    },
  },
};

export function applyEffect(input: EffectApplyInput): EffectApplyResult {
  const def = EFFECT_REGISTRY[input.effect.kind] as EffectDefinition<EffectKind>;

  return def.apply(input as never);
}

export function describeEffect(effect: Effect): string {
  const def = EFFECT_REGISTRY[effect.kind] as EffectDefinition<EffectKind>;

  return def.describe(effect as never);
}
```

У `randomOf` повідомлення бере ім'я вміння з вибраного варіанту — цього достатньо.

- [ ] **Step 7: Тести → PASS**

Run: `pnpm test:run lib/utils/abilities/registry`
Expected: PASS. Якщо `import/no-cycle` скаржиться на `static.ts` ↔ `index.ts`, `describe` передається параметром, тож циклу немає. Перевірити `pnpm lint lib/utils/abilities`.

- [ ] **Step 8: Коміт**

```bash
pnpm lint --fix lib/utils/abilities && git add lib/utils/abilities && git commit -m "feat(abilities): registry of triggers, conditions and effects"
```

---

### Task 4: `runAbilities` і `resolveDowned`

**Files:**
- Create: `lib/utils/abilities/engine/run-abilities.ts`
- Test: `lib/utils/abilities/engine/__tests__/run-abilities.test.ts`

**Interfaces:**
- Consumes: Tasks 2–3.
- Produces:
  - `runAbilities(participants: BattleParticipant[], event: AbilityEvent, ctx: AbilityRunContext): AbilityRunResult`;
  - `resolveDowned(participants, downed: Downed, ctx, opts?: { allowSurvive?: boolean }): { participants; messages: string[]; survived: boolean }`.
- Порядок обробки: власники йдуть у порядку масиву `participants`, тобто в порядку ініціативи, вміння — в порядку списку.

- [ ] **Step 1: Тест**

```ts
import { describe, expect, it } from "vitest";

import { makeParticipant, resolved, seq } from "@/lib/utils/abilities/__tests__/fixtures";
import { resolveDowned, runAbilities } from "@/lib/utils/abilities/engine/run-abilities";
import { ParticipantSide } from "@/lib/constants/battle";

const ctx = { round: 1, rng: seq(0) };

const hit = { type: "hit" as const, actorId: "a", targetId: "e", attackKind: "melee" as const, damage: 6 };

describe("runAbilities", () => {
  it("спрацьовує вміння цілі (role target)", () => {
    const thorns = resolved({ trigger: { event: "hit", role: "target" }, effects: [{ kind: "dealDamage", amount: 2, target: "eventActor" }] });

    const a = makeParticipant({ id: "a" });

    const e = makeParticipant({ id: "e", side: ParticipantSide.ENEMY, abilities: [thorns] });

    const r = runAbilities([a, e], hit, ctx);

    expect(r.participants[0].combatStats.currentHp).toBe(18);
    expect(r.fired).toEqual([thorns.key]);
  });

  it("perBattle блокує друге спрацювання; невдалий chance ліміт не витрачає", () => {
    const once = resolved({ trigger: { event: "hit", role: "attacker" }, limits: { perBattle: 1, chance: 50 }, effects: [{ kind: "changeMorale", delta: 1 }] });

    let ps = [makeParticipant({ id: "a", abilities: [once] }), makeParticipant({ id: "e", side: ParticipantSide.ENEMY })];

    ps = runAbilities(ps, hit, { round: 1, rng: seq(0.9) }).participants;
    expect(ps[0].combatStats.morale).toBe(0);
    ps = runAbilities(ps, hit, { round: 1, rng: seq(0.1) }).participants;
    expect(ps[0].combatStats.morale).toBe(1);
    ps = runAbilities(ps, hit, { round: 1, rng: seq(0.1) }).participants;
    expect(ps[0].combatStats.morale).toBe(1);
  });

  it("perRound скидається на roundStart, perTurn — на turnStart власника", () => {
    const ab = resolved({ trigger: { event: "hit", role: "attacker" }, limits: { perRound: 1 }, effects: [{ kind: "changeMorale", delta: 1 }] });

    let ps = [makeParticipant({ id: "a", abilities: [ab] }), makeParticipant({ id: "e", side: ParticipantSide.ENEMY })];

    ps = runAbilities(ps, hit, ctx).participants;
    ps = runAbilities(ps, hit, ctx).participants;
    expect(ps[0].combatStats.morale).toBe(1);
    ps = runAbilities(ps, { type: "roundStart" }, ctx).participants;
    ps = runAbilities(ps, hit, ctx).participants;
    expect(ps[0].combatStats.morale).toBe(2);
  });

  it("умова перевіряється на поточному стані", () => {
    const ab = resolved({ trigger: { event: "turnStart" }, condition: { type: "hpBelow", who: "self", percent: 50 }, effects: [{ kind: "heal", amount: 5 }] });

    const ps = [makeParticipant({ id: "a", hp: 15, abilities: [ab] })];

    expect(runAbilities(ps, { type: "turnStart", actorId: "a" }, ctx).participants[0].combatStats.currentHp).toBe(15);
    ps[0] = makeParticipant({ id: "a", hp: 8, abilities: [ab] });
    expect(runAbilities(ps, { type: "turnStart", actorId: "a" }, ctx).participants[0].combatStats.currentHp).toBe(13);
  });

  it("смерть від вміння дає один kill і не каскадить далі", () => {
    const bolt = resolved({ trigger: { event: "roundStart" }, effects: [{ kind: "dealDamage", amount: 50, target: "allEnemies" }] });

    const mourn = resolved({ trigger: { event: "kill", role: "victimSide" }, effects: [{ kind: "changeMorale", delta: -1 }] }, { id: "m" });

    const glory = resolved({ trigger: { event: "kill", role: "killer" }, effects: [{ kind: "dealDamage", amount: 50, target: "allEnemies" }] }, { id: "g" });

    const ps = [
      makeParticipant({ id: "a", abilities: [bolt, glory] }),
      makeParticipant({ id: "e1", side: ParticipantSide.ENEMY }),
      makeParticipant({ id: "e2", side: ParticipantSide.ENEMY, hp: 100, maxHp: 100, abilities: [mourn] }),
    ];

    const r = runAbilities(ps, { type: "roundStart" }, ctx);

    expect(r.participants[1].combatStats.status).toBe("dead");
    expect(r.participants[2].combatStats.morale).toBe(-1);
    // glory спрацював на глибині 1, тож його смерть від dealDamage вже не породжує kill
    expect(r.participants[2].combatStats.currentHp).toBe(0);
  });

  it("bonusAction виконує лише обране вміння", () => {
    const a1 = resolved({ id: "x", trigger: { event: "bonusAction" }, effects: [{ kind: "changeMorale", delta: 1 }] });

    const a2 = resolved({ id: "y", trigger: { event: "bonusAction" }, effects: [{ kind: "changeMorale", delta: -1 }] });

    const ps = [makeParticipant({ id: "a", abilities: [a1, a2] })];

    const r = runAbilities(ps, { type: "bonusAction", actorId: "a", abilityKey: a2.key }, ctx);

    expect(r.participants[0].combatStats.morale).toBe(-1);
  });

  it("before-фаза повертає actionModifiers по учасниках", () => {
    const aim = resolved({ trigger: { event: "attack", phase: "before", role: "attacker", attackKind: "ranged" }, effects: [{ kind: "flag", flag: "advantage", attackKind: "ranged" }] });

    const ps = [makeParticipant({ id: "a", abilities: [aim] }), makeParticipant({ id: "e", side: ParticipantSide.ENEMY })];

    const r = runAbilities(ps, { type: "attack", phase: "before", actorId: "a", targetId: "e", attackKind: "ranged" }, ctx);

    expect(r.actionModifiers.a).toEqual([{ kind: "flag", flag: "advantage", attackKind: "ranged" }]);
  });
});

describe("resolveDowned", () => {
  it("lethalDamage рятує з 1 HP; інакше kill", () => {
    const survive = resolved({ trigger: { event: "lethalDamage" }, limits: { perBattle: 1 }, effects: [{ kind: "heal", amount: 1, revive: true }] });

    const down = makeParticipant({ id: "v", abilities: [survive] });

    const victim = { ...down, combatStats: { ...down.combatStats, currentHp: -3, status: "dead" as const } };

    const r1 = resolveDowned([victim], { victimId: "v", actorId: null }, ctx);

    expect(r1.survived).toBe(true);
    expect(r1.participants[0].combatStats).toMatchObject({ currentHp: 1, status: "active" });

    const again = { ...r1.participants[0], combatStats: { ...r1.participants[0].combatStats, currentHp: 0, status: "unconscious" as const } };

    expect(resolveDowned([again], { victimId: "v", actorId: null }, ctx).survived).toBe(false);
  });
});
```

- [ ] **Step 2: FAIL**

Run: `pnpm test:run lib/utils/abilities/engine/__tests__/run-abilities.test.ts`
Expected: FAIL — модуля не існує.

- [ ] **Step 3: Реалізація**

```ts
// engine/run-abilities.ts
import { findParticipant, isUp, resolvedAbilitiesOf, updateParticipant } from "./participants";
import { resolveTargetIds } from "./targets";
import type { AbilityRunContext, AbilityRunResult, Downed } from "./types";
import { recordUse, resetUsage, withinLimits } from "./usage";

import { evaluateCondition } from "@/lib/utils/abilities/registry/conditions";
import { applyEffect } from "@/lib/utils/abilities/registry/effects";
import { triggerMatches } from "@/lib/utils/abilities/registry/triggers";
import type { StaticEffect } from "@/lib/utils/abilities/schema";
import type { AbilityEvent } from "@/types/abilities";
import type { BattleParticipant } from "@/types/battle";

function applyUsageResets(ps: BattleParticipant[], event: AbilityEvent): BattleParticipant[] {
  if (event.type === "roundStart") return ps.map((p) => resetUsage(p, "round"));

  if (event.type === "turnStart") return updateParticipant(ps, event.actorId, (p) => resetUsage(p, "turn"));

  return ps;
}

function canAct(owner: BattleParticipant, event: AbilityEvent): boolean {
  return isUp(owner) || (event.type === "lethalDamage" && event.targetId === owner.basicInfo.id);
}

export function runAbilities(participants: BattleParticipant[], event: AbilityEvent, ctx: AbilityRunContext): AbilityRunResult {
  let ps = applyUsageResets(participants, event);

  const messages: string[] = [];

  const actionModifiers: Record<string, StaticEffect[]> = {};

  const fired: string[] = [];

  const downed: Downed[] = [];

  for (const ownerId of participants.map((p) => p.basicInfo.id)) {
    for (const ability of resolvedAbilitiesOf(findParticipant(ps, ownerId)!)) {
      const owner = findParticipant(ps, ownerId);

      if (!owner || !canAct(owner, event)) break;

      if (event.type === "bonusAction" && ability.key !== event.abilityKey) continue;

      if (!triggerMatches(ability.trigger, event, owner, ps)) continue;

      if (ability.condition && !evaluateCondition(ability.condition, { owner, event, participants: ps })) continue;

      if (!withinLimits(owner, ability)) continue;

      if (ability.limits?.chance !== undefined && ctx.rng() * 100 >= ability.limits.chance) continue;

      ps = updateParticipant(ps, ownerId, (p) => recordUse(p, ability.key));
      fired.push(ability.key);

      for (const [effectIndex, effect] of ability.effects.entries()) {
        const targetIds = resolveTargetIds("target" in effect ? effect.target : undefined, ownerId, event, ps);

        const r = applyEffect({ participants: ps, ability, effectIndex, ownerId, effect, targetIds, event, ctx });

        ps = r.participants;
        messages.push(...r.messages);

        for (const m of r.actionModifiers ?? []) (actionModifiers[m.participantId] ??= []).push(m.effect);

        downed.push(...(r.downed ?? []));
      }
    }
  }

  if ((ctx.depth ?? 0) === 0) {
    for (const d of downed) {
      const r = resolveDowned(ps, d, { ...ctx, depth: 1 });

      ps = r.participants;
      messages.push(...r.messages);
    }
  }

  return { participants: ps, messages, actionModifiers, fired };
}

export function resolveDowned(
  participants: BattleParticipant[],
  downed: Downed,
  ctx: AbilityRunContext,
  opts: { allowSurvive?: boolean } = {},
): { participants: BattleParticipant[]; messages: string[]; survived: boolean } {
  const victim = findParticipant(participants, downed.victimId);

  if (!victim || isUp(victim)) return { participants, messages: [], survived: true };

  const deep = { ...ctx, depth: 1 };

  let ps = participants;

  const messages: string[] = [];

  if (opts.allowSurvive !== false) {
    const lethal = runAbilities(ps, { type: "lethalDamage", actorId: downed.actorId, targetId: downed.victimId }, deep);

    ps = lethal.participants;
    messages.push(...lethal.messages);

    if (isUp(findParticipant(ps, downed.victimId)!)) return { participants: ps, messages, survived: true };
  }

  const kill = runAbilities(ps, { type: "kill", actorId: downed.actorId, targetId: downed.victimId }, deep);

  return { participants: kill.participants, messages: [...messages, ...kill.messages], survived: false };
}
```

- [ ] **Step 4: PASS**

Run: `pnpm test:run lib/utils/abilities`
Expected: PASS.

- [ ] **Step 5: Коміт**

```bash
pnpm lint --fix lib/utils/abilities && git add lib/utils/abilities && git commit -m "feat(abilities): single event executor with limits, chance and downed resolution"
```

---

### Task 5: `collectModifiers` і адаптер старих `ActiveEffect`

**Files:**
- Create: `lib/utils/abilities/engine/{collect-modifiers,legacy-active-effects}.ts`
- Test: `lib/utils/abilities/engine/__tests__/collect-modifiers.test.ts`

**Interfaces:**
- Produces:
  - `ModifierQuery = { stat: StatKey; attackKind?: AttackKind } | { damage: { kind: DamageKind; school?: string | null } } | { flag: FlagKey }`;
  - `ModifierEntry { label: string; sourceType: AbilitySource["type"] | "effect" | "action"; flat: number; percent: number }`;
  - `ModifierResult { flat: number; percent: number; flags: FlagEffect[]; entries: ModifierEntry[] }`;
  - `collectModifiers(participants, participantId, query, extra?: StaticEffect[]): ModifierResult`;
  - `statWithModifiers(participants, id, stat, base, opts?: { extra?: StaticEffect[]; attackKind?: AttackKind }): number`, що повертає `floor(base + flat + base*percent/100)`;
  - `findFlags<F extends FlagKey>(participants, id, flag: F, extra?): Extract<FlagEffect, { flag: F }>[]`;
  - `legacyActiveEffectModifiers(ae: ActiveEffect): StaticEffect[]`.

- [ ] **Step 1: Тест**

```ts
import { describe, expect, it } from "vitest";

import { makeParticipant, resolved } from "@/lib/utils/abilities/__tests__/fixtures";
import { collectModifiers, findFlags, statWithModifiers } from "@/lib/utils/abilities/engine/collect-modifiers";
import { ParticipantSide } from "@/lib/constants/battle";

describe("collectModifiers", () => {
  it("умовна пасивка вмикається від HP", () => {
    const ab = resolved({ trigger: { event: "passive" }, condition: { type: "hpBelow", who: "self", percent: 50 }, effects: [{ kind: "modifyStat", stat: "armor", flat: 2 }] });

    const healthy = makeParticipant({ id: "a", hp: 20, abilities: [ab] });

    const hurt = makeParticipant({ id: "a", hp: 5, abilities: [ab] });

    expect(statWithModifiers([healthy], "a", "armor", 14)).toBe(14);
    expect(statWithModifiers([hurt], "a", "armor", 14)).toBe(16);
  });

  it("аура союзника і ворожа аура; мертве джерело не діє", () => {
    const aura = resolved({ trigger: { event: "passive" }, effects: [{ kind: "damageBonus", filter: { kind: "all" }, percent: 10, target: "allAllies" }] });

    const curse = resolved({ trigger: { event: "passive" }, effects: [{ kind: "modifyStat", stat: "armor", flat: -1, target: "allEnemies" }] }, { id: "c" });

    const banner = makeParticipant({ id: "b", abilities: [aura] });

    const a = makeParticipant({ id: "a" });

    const witch = makeParticipant({ id: "w", side: ParticipantSide.ENEMY, abilities: [curse] });

    expect(collectModifiers([a, banner, witch], "a", { damage: { kind: "melee" } }).percent).toBe(10);
    expect(statWithModifiers([a, banner, witch], "a", "armor", 14)).toBe(13);

    const deadBanner = { ...banner, combatStats: { ...banner.combatStats, status: "dead" as const } };

    expect(collectModifiers([a, deadBanner], "a", { damage: { kind: "melee" } }).percent).toBe(0);
  });

  it("подійний скіл не дає бонусу поза подією", () => {
    const onHit = resolved({ trigger: { event: "attack", phase: "before", role: "attacker" }, effects: [{ kind: "damageBonus", filter: { kind: "melee" }, percent: 25 }] });

    expect(collectModifiers([makeParticipant({ id: "a", abilities: [onHit] })], "a", { damage: { kind: "melee" } }).percent).toBe(0);
  });

  it("запечені стати ігнорують пасивки, але враховують таймові ефекти", () => {
    const ab = resolved({ trigger: { event: "passive" }, effects: [{ kind: "modifyStat", stat: "initiative", flat: 3 }] });

    const p = makeParticipant({ id: "a", abilities: [ab] });

    const withTimed = {
      ...p,
      battleData: {
        ...p.battleData,
        activeEffects: [{ id: "x", name: "Порив", type: "buff" as const, duration: 2, appliedAt: { round: 1, timestamp: new Date() }, effects: [], abilityEffects: [{ kind: "modifyStat" as const, stat: "initiative" as const, flat: 2 }] }],
      },
    };

    expect(collectModifiers([withTimed], "a", { stat: "initiative" }).flat).toBe(2);
  });

  it("школа магії і physical-фільтр", () => {
    const chaos = resolved({ trigger: { event: "passive" }, effects: [{ kind: "damageBonus", filter: { kind: "magic", school: "chaos" }, percent: 25 }] });

    const phys = resolved({ trigger: { event: "passive" }, effects: [{ kind: "damageBonus", filter: { kind: "physical" }, flat: 2 }] }, { id: "p" });

    const ps = [makeParticipant({ id: "a", abilities: [chaos, phys] })];

    expect(collectModifiers(ps, "a", { damage: { kind: "magic", school: "dark" } }).percent).toBe(0);
    expect(collectModifiers(ps, "a", { damage: { kind: "magic", school: "chaos" } }).percent).toBe(25);
    expect(collectModifiers(ps, "a", { damage: { kind: "ranged" } }).flat).toBe(2);
    expect(collectModifiers(ps, "a", { damage: { kind: "magic" } }).flat).toBe(0);
  });

  it("старі рядки ActiveEffect і extra-модифікатори дії", () => {
    const p = makeParticipant({ id: "a" });

    const legacy = {
      ...p,
      battleData: {
        ...p.battleData,
        activeEffects: [{ id: "x", name: "Крит", type: "buff" as const, duration: 1, appliedAt: { round: 1, timestamp: new Date() }, effects: [{ type: "ac_bonus", value: 2 }, { type: "advantage_attack", value: 1 }, { type: "ranged_damage_reduction", value: 50, isPercentage: true }] }],
      },
    };

    expect(statWithModifiers([legacy], "a", "armor", 10)).toBe(12);
    expect(findFlags([legacy], "a", "advantage")).toHaveLength(1);
    expect(collectModifiers([legacy], "a", { damage: { kind: "ranged" } }).percent).toBe(0);
    expect(findFlags([p], "a", "guaranteedHit", [{ kind: "flag", flag: "guaranteedHit" }])).toHaveLength(1);
  });
});
```

- [ ] **Step 2: FAIL** — `pnpm test:run lib/utils/abilities/engine/__tests__/collect-modifiers.test.ts`

- [ ] **Step 3: Реалізація**

```ts
// engine/legacy-active-effects.ts
import type { DamageFilterKind, StaticEffect } from "@/lib/utils/abilities/schema";
import type { ActiveEffect } from "@/types/battle";

function legacyDamageKind(type: string): DamageFilterKind | null {
  const s = type.toLowerCase();

  if (s === "all_damage") return "all";

  if (!s.includes("damage") || s.includes("reduction")) return null;

  if (s.includes("melee")) return "melee";

  if (s.includes("ranged")) return "ranged";

  if (s.includes("physical")) return "physical";

  if (s === "spell_damage" || s === "magic_damage" || s.endsWith("_spell_damage") || s.includes("magic")) return "magic";

  return null;
}

export function legacyActiveEffectModifiers(ae: ActiveEffect): StaticEffect[] {
  const out: StaticEffect[] = [];

  for (const d of ae.effects) {
    const value = typeof d.value === "number" ? d.value : 0;

    switch (d.type) {
      case "ac_bonus":
        out.push({ kind: "modifyStat", stat: "armor", flat: value });
        break;
      case "attack_bonus":
      case "attack":
        out.push({ kind: "modifyStat", stat: "attackBonus", flat: value });
        break;
      case "initiative_bonus":
      case "initiative":
        out.push({ kind: "modifyStat", stat: "initiative", flat: value });
        break;
      case "advantage":
      case "advantage_attack":
        out.push({ kind: "flag", flag: "advantage", attackKind: "all" });
        break;
      case "disadvantage_attack":
        out.push({ kind: "flag", flag: "disadvantage" });
        break;
      default: {
        const kind = legacyDamageKind(d.type);

        if (kind && value !== 0) out.push({ kind: "damageBonus", filter: { kind }, ...(d.isPercentage ? { percent: value } : { flat: value }) });
      }
    }
  }

  return out;
}
```

```ts
// engine/collect-modifiers.ts
import { resolveFlat } from "./amount";
import { legacyActiveEffectModifiers } from "./legacy-active-effects";
import { findParticipant, isUp, resolvedAbilitiesOf } from "./participants";

import { evaluateCondition } from "@/lib/utils/abilities/registry/conditions";
import {
  type AttackKind,
  type DamageKind,
  type FlagEffect,
  type FlagKey,
  isBakedStat,
  isStaticEffect,
  type StatKey,
  type StaticEffect,
} from "@/lib/utils/abilities/schema";
import type { AbilitySource } from "@/types/abilities";
import type { BattleParticipant } from "@/types/battle";

export type ModifierQuery =
  | { stat: StatKey; attackKind?: AttackKind }
  | { damage: { kind: DamageKind; school?: string | null } }
  | { flag: FlagKey };

export interface ModifierEntry {
  label: string;
  sourceType: AbilitySource["type"] | "effect" | "action";
  flat: number;
  percent: number;
}

export interface ModifierResult {
  flat: number;
  percent: number;
  flags: FlagEffect[];
  entries: ModifierEntry[];
}

function matchesQuery(effect: StaticEffect, query: ModifierQuery): boolean {
  if ("stat" in query) {
    return (
      effect.kind === "modifyStat" &&
      effect.stat === query.stat &&
      (!effect.attackKind || !query.attackKind || effect.attackKind === query.attackKind)
    );
  }

  if ("damage" in query) {
    if (effect.kind !== "damageBonus") return false;

    const { kind, school } = query.damage;

    const f = effect.filter;

    const kindOk = f.kind === "all" || f.kind === kind || (f.kind === "physical" && kind !== "magic");

    return kindOk && !(kind === "magic" && f.school && school && f.school !== school);
  }

  return effect.kind === "flag" && effect.flag === query.flag;
}

function appliesTo(target: StaticEffect["target"], source: BattleParticipant, subject: BattleParticipant): boolean {
  switch (target ?? "self") {
    case "self":
      return source.basicInfo.id === subject.basicInfo.id;
    case "allAllies":
      return source.basicInfo.side === subject.basicInfo.side;
    case "allEnemies":
      return source.basicInfo.side !== subject.basicInfo.side;
    default:
      return false;
  }
}

export function collectModifiers(
  participants: BattleParticipant[],
  participantId: string,
  query: ModifierQuery,
  extra: StaticEffect[] = [],
): ModifierResult {
  const result: ModifierResult = { flat: 0, percent: 0, flags: [], entries: [] };

  const subject = findParticipant(participants, participantId);

  if (!subject) return result;

  const add = (effect: StaticEffect, owner: BattleParticipant, label: string, sourceType: ModifierEntry["sourceType"]) => {
    if (!matchesQuery(effect, query)) return;

    if (effect.kind === "flag") {
      result.flags.push(effect);
      result.entries.push({ label, sourceType, flat: 0, percent: 0 });

      return;
    }

    const flat = effect.flat !== undefined ? resolveFlat(effect.flat, owner) : 0;

    const percent = effect.percent ?? 0;

    result.flat += flat;
    result.percent += percent;
    result.entries.push({ label, sourceType, flat, percent });
  };

  const skipPassive = "stat" in query && isBakedStat(query.stat);

  if (!skipPassive) {
    for (const source of participants) {
      if (source !== subject && !isUp(source)) continue;

      for (const ability of resolvedAbilitiesOf(source)) {
        if (ability.trigger.event !== "passive") continue;

        if (ability.condition && !evaluateCondition(ability.condition, { owner: source, event: null, participants })) continue;

        for (const effect of ability.effects) {
          if (isStaticEffect(effect) && appliesTo(effect.target, source, subject)) {
            add(effect, source, ability.name, ability.source.type);
          }
        }
      }
    }
  }

  for (const ae of subject.battleData.activeEffects) {
    for (const effect of ae.abilityEffects ?? legacyActiveEffectModifiers(ae)) add(effect, subject, ae.name, "effect");
  }

  for (const effect of extra) add(effect, subject, "Ця дія", "action");

  return result;
}

export function statWithModifiers(
  participants: BattleParticipant[],
  id: string,
  stat: StatKey,
  base: number,
  opts: { extra?: StaticEffect[]; attackKind?: AttackKind } = {},
): number {
  const m = collectModifiers(participants, id, { stat, attackKind: opts.attackKind }, opts.extra);

  return Math.floor(base + m.flat + (base * m.percent) / 100);
}

export function findFlags<F extends FlagKey>(
  participants: BattleParticipant[],
  id: string,
  flag: F,
  extra?: StaticEffect[],
): Extract<FlagEffect, { flag: F }>[] {
  return collectModifiers(participants, id, { flag }, extra).flags as Extract<FlagEffect, { flag: F }>[];
}
```

Перевірка `source !== subject` — тобто «власні пасивки діють навіть на лежачого» — потрібна тому, що резисти й AC лежачого учасника мають рахуватися.

- [ ] **Step 4: PASS, коміт**

```bash
pnpm test:run lib/utils/abilities && pnpm lint --fix lib/utils/abilities && git add lib/utils/abilities && git commit -m "feat(abilities): collectModifiers with auras, timed and legacy active effects"
```

---

### Task 6: Конвертер старих скілів

**Files:**
- Create: `lib/utils/abilities/legacy/{types,parse-effects,stat-map,trigger-map,convert-skill}.ts`
- Test: `lib/utils/abilities/legacy/__tests__/convert-skill.test.ts`

**Interfaces:**
- Produces:
  - `LegacyEffect { stat: string; type: string; value: number | string | boolean; isPercentage: boolean; duration?: number; target?: string; maxTriggers?: number | null }`;
  - `ConversionIssue { severity: "loss" | "behavior"; message: string }`, `ConversionResult { abilities: Ability[]; issues: ConversionIssue[] }`;
  - `ConvertOptions { skipBakedStats?: boolean }`;
  - `parseLegacyEffects(combatStats: unknown, bonuses: unknown): LegacyEffect[]` — перенесена `parseSkillEffects` з `participant/build-active-skill.ts`, разом з `PERCENT_DAMAGE_KEYS`;
  - `mapLegacyTrigger(raw: unknown): MappedTrigger | null`, де `MappedTrigger { trigger: Trigger; condition?: Condition; limits?: Limits; stackable?: boolean; counter?: { attackKinds: DamageKind[] }; notes: string[]; issues: ConversionIssue[] }`;
  - `mapLegacyEffect(e: LegacyEffect, ctx: StatMapContext): { effects: Effect[]; extras: Omit<Ability, "id" | "name">[]; issues: ConversionIssue[] }`, де `StatMapContext { trigger: Trigger; damageKindOverride: DamageKind | null; school: string | null; skipBakedStats: boolean; emitExtras: boolean }`;
  - `LegacySkillRow { id: string; name: string; combatStats: unknown; bonuses: unknown; skillTriggers: unknown; spellGroupId?: string | null }`;
  - `convertLegacySkill(row, opts?): ConversionResult`.

- [ ] **Step 1: Golden-тести**

```ts
import { describe, expect, it } from "vitest";

import { convertLegacySkill } from "@/lib/utils/abilities/legacy/convert-skill";
import { AbilitiesSchema } from "@/lib/utils/abilities/schema";

const row = (over: Partial<Parameters<typeof convertLegacySkill>[0]>) => ({ id: "s1", name: "Скіл", combatStats: {}, bonuses: {}, skillTriggers: [], ...over });

describe("convertLegacySkill", () => {
  it("пасивка: шкода ближня % з тип-фільтром скіла і резист", () => {
    const r = convertLegacySkill(
      row({
        combatStats: {
          affectsDamage: true,
          damageType: "melee",
          effects: [
            { stat: "all_damage", type: "percent", value: 15 },
            { stat: "physical_resistance", type: "percent", value: 10 },
          ],
        },
        skillTriggers: [{ type: "simple", trigger: "passive" }],
      }),
    );

    expect(r.abilities).toEqual([
      {
        id: "t0",
        name: "Скіл",
        trigger: { event: "passive" },
        effects: [
          { kind: "damageBonus", filter: { kind: "melee" }, percent: 15 },
          { kind: "flag", flag: "resistance", damageType: "physical", percent: 10 },
        ],
      },
    ]);
    expect(AbilitiesSchema.safeParse(r.abilities).success).toBe(true);
  });

  it("onHit + бонус шкоди → attack/before + DOT на ціль, ліміти й шанс", () => {
    const r = convertLegacySkill(
      row({
        combatStats: { effects: [{ stat: "melee_damage", type: "percent", value: 20 }, { stat: "bleed_damage", type: "dice", value: "1d4", duration: 2 }] },
        skillTriggers: [{ type: "simple", trigger: "onHit", modifiers: { probability: 0.3, oncePerBattle: true } }],
      }),
    );

    expect(r.abilities).toEqual([
      {
        id: "t0",
        name: "Скіл",
        trigger: { event: "hit", role: "attacker" },
        limits: { perBattle: 1, chance: 30 },
        effects: [{ kind: "dot", damagePerRound: "1d4", damageType: "bleed", duration: { rounds: 2 }, target: "eventTarget" }],
      },
      {
        id: "t0-before",
        name: "Скіл",
        trigger: { event: "attack", phase: "before", role: "attacker" },
        limits: { perBattle: 1, chance: 30 },
        effects: [{ kind: "damageBonus", filter: { kind: "melee" }, percent: 20 }],
      },
    ]);
    expect(r.issues.map((i) => i.severity)).toContain("behavior");
    expect(AbilitiesSchema.safeParse(r.abilities).success).toBe(true);
  });

  it("beforeEnemyAttack → role target (зміна поведінки)", () => {
    const r = convertLegacySkill(row({ combatStats: { effects: [{ stat: "armor", type: "flat", value: 2 }] }, skillTriggers: [{ type: "simple", trigger: "beforeEnemyAttack" }] }));

    expect(r.abilities[0].trigger).toEqual({ event: "attack", phase: "before", role: "target" });
    expect(r.abilities[0].effects).toEqual([{ kind: "modifyStat", stat: "armor", flat: 2 }]);
    expect(r.issues.some((i) => i.message.includes("beforeEnemyAttack"))).toBe(true);
  });

  it("complex allyHP <= 0.15 → turnStart + hpBelow 15", () => {
    const r = convertLegacySkill(
      row({
        combatStats: { effects: [{ stat: "hp_bonus", type: "flat", value: 5, target: "all_allies" }] },
        skillTriggers: [{ type: "complex", target: "ally", operator: "<=", value: 0.15, valueType: "percent", stat: "HP" }],
      }),
    );

    expect(r.abilities[0]).toMatchObject({ trigger: { event: "turnStart" }, condition: { type: "hpBelow", who: "anyAlly", percent: 15 } });
    expect(r.abilities[0].effects).toEqual([{ kind: "heal", amount: 5, target: "allAllies" }]);
  });

  it("onFirstHitTakenPerRound + counter_damage → пасивна контратака", () => {
    const r = convertLegacySkill(
      row({ combatStats: { effects: [{ stat: "counter_damage", type: "percent", value: 30 }] }, skillTriggers: [{ type: "simple", trigger: "onFirstHitTakenPerRound", modifiers: { responseType: "ranged" } }] }),
    );

    expect(r.abilities).toEqual([
      { id: "counter", name: "Скіл", trigger: { event: "passive" }, effects: [{ kind: "flag", flag: "counterAttack", attackKinds: ["ranged"], bonusPercent: 30 }] },
    ]);
  });

  it("morale_per_kill і max_targets стають окремими вміннями незалежно від тригера", () => {
    const r = convertLegacySkill(
      row({
        combatStats: { effects: [{ stat: "morale_per_kill", type: "flat", value: 1 }, { stat: "max_targets", type: "flat", value: 1 }] },
        skillTriggers: [{ type: "simple", trigger: "onBattleStart" }],
      }),
    );

    expect(r.abilities).toEqual([
      { id: "x0", name: "Скіл", trigger: { event: "kill", role: "killerSide" }, effects: [{ kind: "changeMorale", delta: 1 }] },
      { id: "x1", name: "Скіл", trigger: { event: "passive" }, effects: [{ kind: "modifyStat", stat: "maxTargets", flat: 1 }] },
    ]);
  });

  it("battleStart initiative за замовчуванням на союзників; текстова умова → note + issue", () => {
    const r = convertLegacySkill(
      row({
        combatStats: { effects: [{ stat: "initiative", type: "flat", value: 2 }] },
        skillTriggers: [{ type: "simple", trigger: "onBattleStart", modifiers: { condition: "onConsumeDead" } }],
      }),
    );

    expect(r.abilities[0].effects).toEqual([
      { kind: "modifyStat", stat: "initiative", flat: 2, target: "allAllies", duration: { rounds: 99 } },
      { kind: "note", text: "Умова: onConsumeDead" },
    ]);
    expect(r.issues.some((i) => i.severity === "loss")).toBe(true);
  });

  it("скіл без тригерів → пасивка; невідомий стат → note + issue", () => {
    const r = convertLegacySkill(row({ bonuses: { melee_damage: 10, weird_stat: 3 } }));

    expect(r.abilities[0].trigger).toEqual({ event: "passive" });
    expect(r.abilities[0].effects).toEqual(
      expect.arrayContaining([{ kind: "damageBonus", filter: { kind: "melee" }, percent: 10 }, { kind: "note", text: "weird_stat: 3" }]),
    );
    expect(r.issues.some((i) => i.message.includes("weird_stat"))).toBe(true);
  });

  it("школа магії зі skill.spellGroupId", () => {
    const r = convertLegacySkill(row({ spellGroupId: "chaos", combatStats: { effects: [{ stat: "magic_damage", type: "percent", value: 25 }] }, skillTriggers: [{ type: "simple", trigger: "passive" }] }));

    expect(r.abilities[0].effects[0]).toEqual({ kind: "damageBonus", filter: { kind: "magic", school: "chaos" }, percent: 25 });
  });

  it("skipBakedStats пропускає запечені стати", () => {
    const r = convertLegacySkill(row({ combatStats: { effects: [{ stat: "hp_bonus", type: "flat", value: 5 }] }, skillTriggers: [{ type: "simple", trigger: "passive" }] }), { skipBakedStats: true });

    expect(r.abilities).toEqual([]);
  });
});
```

- [ ] **Step 2: FAIL** — `pnpm test:run lib/utils/abilities/legacy`

- [ ] **Step 3: `types.ts`, `parse-effects.ts`**

`types.ts` містить інтерфейси з блоку Interfaces. `parse-effects.ts` — це дослівна копія `parseSkillEffects` і `PERCENT_DAMAGE_KEYS` з `lib/utils/battle/participant/build-active-skill.ts` (рядки 1–100), де `SkillEffect` замінено на `LegacyEffect`, а сигнатура стала `(combatStats: unknown, bonuses: unknown)`. Перед доступом до полів треба звузити тип: `const cs = (combatStats ?? {}) as { effects?: unknown[] }`. Старий файл видаляється в Task 14.

- [ ] **Step 4: `trigger-map.ts`**

```ts
import type { ConversionIssue } from "./types";

import type { Condition, DamageKind, Limits, Trigger } from "@/lib/utils/abilities/schema";

export interface MappedTrigger {
  trigger: Trigger;
  condition?: Condition;
  limits?: Limits;
  stackable?: boolean;
  counter?: { attackKinds: DamageKind[] };
  notes: string[];
  issues: ConversionIssue[];
}

const SIMPLE: Record<string, Trigger> = {
  passive: { event: "passive" },
  onBattleStart: { event: "battleStart" },
  startRound: { event: "roundStart" },
  endRound: { event: "roundEnd" },
  beforeOwnerAttack: { event: "attack", phase: "before", role: "attacker" },
  onAttack: { event: "attack", phase: "before", role: "attacker" },
  afterOwnerAttack: { event: "attack", phase: "after", role: "attacker" },
  beforeEnemyAttack: { event: "attack", phase: "before", role: "target" },
  afterEnemyAttack: { event: "attack", phase: "after", role: "target" },
  beforeOwnerSpellCast: { event: "spellCast", phase: "before", role: "caster" },
  onCast: { event: "spellCast", phase: "before", role: "caster" },
  afterOwnerSpellCast: { event: "spellCast", phase: "after", role: "caster" },
  beforeEnemySpellCast: { event: "spellCast", phase: "before", role: "target" },
  afterEnemySpellCast: { event: "spellCast", phase: "after", role: "target" },
  onHit: { event: "hit", role: "attacker" },
  onKill: { event: "kill", role: "killer" },
  onAllyDeath: { event: "kill", role: "victimSide" },
  onLethalDamage: { event: "lethalDamage" },
  onFirstRangedAttack: { event: "attack", phase: "before", role: "attacker", attackKind: "ranged" },
  onMoraleSuccess: { event: "moraleCheck", result: "success", whose: "self" },
  allyMoraleCheck: { event: "moraleCheck", result: "any", whose: "ally" },
  bonusAction: { event: "bonusAction" },
};

const SEMANTIC_CHANGE = new Set(["beforeEnemyAttack", "afterEnemyAttack", "beforeEnemySpellCast", "afterEnemySpellCast"]);

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

function mapModifiers(m: unknown, out: MappedTrigger) {
  if (!isRecord(m)) return;

  const limits: Limits = { ...out.limits };

  if (typeof m.probability === "number" && m.probability > 0) {
    const chance = Math.round(m.probability <= 1 ? m.probability * 100 : m.probability);

    if (chance < 100) limits.chance = Math.max(1, chance);
  }

  if (m.oncePerBattle === true) limits.perBattle = 1;

  if (m.twicePerBattle === true) limits.perBattle = 2;

  if (Object.keys(limits).length) out.limits = limits;

  if (m.stackable === true) out.stackable = true;

  if (typeof m.condition === "string" && m.condition) {
    out.notes.push(`Умова: ${m.condition}`);
    out.issues.push({ severity: "loss", message: `Текстова умова «${m.condition}» не автоматизована (тепер — нотатка)` });
  }

  if (typeof m.attackId === "string" && m.attackId) {
    out.issues.push({ severity: "loss", message: `Прив'язка до атаки ${m.attackId} не переноситься` });
  }
}

export function mapLegacyTrigger(raw: unknown): MappedTrigger | null {
  if (!isRecord(raw)) return null;

  if (raw.type === "complex") return mapComplex(raw);

  const name = typeof raw.trigger === "string" ? raw.trigger : "";

  const modifiers = isRecord(raw.modifiers) ? raw.modifiers : {};

  if (name === "onFirstHitTakenPerRound") {
    const kind = modifiers.responseType;

    return {
      trigger: { event: "passive" },
      counter: { attackKinds: [kind === "ranged" || kind === "magic" ? kind : "melee"] },
      notes: [],
      issues: [],
    };
  }

  const trigger = SIMPLE[name];

  if (!trigger) return null;

  const out: MappedTrigger = { trigger, notes: [], issues: [] };

  if (name === "onFirstRangedAttack") out.limits = { perBattle: 1 };

  if (SEMANTIC_CHANGE.has(name)) {
    out.issues.push({ severity: "behavior", message: `${name}: тепер спрацьовує, коли атакують/кастують на власника` });
  }

  mapModifiers(modifiers, out);

  if (trigger.event === "passive") delete out.limits;

  return out;
}

function mapComplex(raw: Record<string, unknown>): MappedTrigger {
  const out: MappedTrigger = { trigger: { event: "turnStart" }, notes: [], issues: [] };

  out.issues.push({ severity: "behavior", message: "Складний тригер тепер перевіряється на початку ходу власника" });

  const who = raw.target === "ally" ? "anyAlly" : raw.target === "enemy" ? "anyEnemy" : "self";

  const value = typeof raw.value === "number" ? raw.value : NaN;

  if (raw.stat === "HP" && raw.valueType === "percent" && Number.isFinite(value)) {
    const percent = Math.min(100, Math.max(1, Math.round(value <= 1 ? value * 100 : value)));

    out.condition = { type: String(raw.operator).startsWith("<") ? "hpBelow" : "hpAbove", who, percent };
  } else {
    out.issues.push({ severity: "loss", message: `Умова ${String(raw.stat)} ${String(raw.operator)} ${String(raw.value)} не переноситься` });
  }

  mapModifiers(raw.modifiers, out);

  return out;
}
```

- [ ] **Step 5: `stat-map.ts`**

```ts
import type { ConversionIssue, LegacyEffect } from "./types";

import {
  type Ability,
  type AbilityTarget,
  type DamageFilterKind,
  type DamageKind,
  type Duration,
  type Effect,
  type Flat,
  isActionScopedTrigger,
  type StatKey,
  type Trigger,
} from "@/lib/utils/abilities/schema";

export interface StatMapContext {
  trigger: Trigger;
  damageKindOverride: DamageKind | null;
  school: string | null;
  skipBakedStats: boolean;
  emitExtras: boolean;
}

export interface StatMapResult {
  effects: Effect[];
  extras: Omit<Ability, "id" | "name">[];
  beforeEffects: Effect[];
  counterPercent?: number;
  issues: ConversionIssue[];
}

const DAMAGE: Record<string, DamageFilterKind> = {
  melee_damage: "melee",
  ranged_damage: "ranged",
  all_damage: "all",
  damage: "all",
  physical_damage: "physical",
  magic_damage: "magic",
  spell_damage: "magic",
  chaos_spell_damage: "magic",
  dark_spell_damage: "magic",
};

const DOT: Record<string, string> = { bleed_damage: "bleed", poison_damage: "poison", burn_damage: "burn", fire_damage: "fire" };

const PASSIVE_BAKED: Record<string, StatKey> = {
  hp_bonus: "maxHp",
  speed: "speed",
  min_targets: "minTargets",
  min_targets_bonus: "minTargets",
  max_targets: "maxTargets",
  max_targets_bonus: "maxTargets",
  strength: "strength",
  dexterity: "dexterity",
  constitution: "constitution",
  intelligence: "intelligence",
  wisdom: "wisdom",
  charisma: "charisma",
};

const NOT_AUTOMATED = new Set([
  "area_damage",
  "area_cells",
  "attack_before_enemy",
  "control_units",
  "summon_tier",
  "redirect_physical_damage",
  "marked_targets",
  "spell_levels",
  "spell_targets_lvl4_5",
  "light_spells_target_all_allies",
  "damage_resistance",
]);

const LEGACY_TARGET: Record<string, AbilityTarget> = { self: "self", all_allies: "allAllies", all_enemies: "allEnemies", enemy: "eventTarget" };

function num(e: LegacyEffect): number | null {
  if (typeof e.value === "number") return e.value;

  if (typeof e.value === "string" && /^-?\d+(\.\d+)?$/.test(e.value)) return Number(e.value);

  return null;
}

function flatOf(e: LegacyEffect): Flat | null {
  if (e.type === "formula" && typeof e.value === "string" && e.value) return { formula: e.value };

  return num(e);
}

const hasEventTarget = (t: Trigger) => ["attack", "hit", "spellCast", "kill", "bonusAction"].includes(t.event);

export function mapLegacyEffect(e: LegacyEffect, ctx: StatMapContext): StatMapResult {
  const out: StatMapResult = { effects: [], extras: [], beforeEffects: [], issues: [] };

  const { trigger } = ctx;

  const passive = trigger.event === "passive";

  const isHitAttacker = trigger.event === "hit" && trigger.role === "attacker";

  const legacyTarget = e.target ? LEGACY_TARGET[e.target] : undefined;

  const target = (fallback: AbilityTarget): { target?: AbilityTarget } => {
    const t = legacyTarget ?? fallback;

    return t === "self" ? {} : { target: t };
  };

  const timing = (fallbackRounds: number): { duration?: Duration } => {
    if (passive || (isActionScopedTrigger(trigger) && !e.duration)) return {};

    return { duration: { rounds: Math.min(99, Math.max(1, e.duration ?? fallbackRounds)) } };
  };

  const note = (reason: string) => {
    out.effects.push({ kind: "note", text: `${e.stat}: ${String(e.value)}` });
    out.issues.push({ severity: "loss", message: `${e.stat}: ${reason}` });
  };

  const extra = (ability: Omit<Ability, "id" | "name">) => {
    if (ctx.emitExtras) out.extras.push(ability);
  };

  const flat = flatOf(e);

  const value = num(e);

  if (DAMAGE[e.stat]) {
    let kind = DAMAGE[e.stat];

    const o = ctx.damageKindOverride;

    if (o && kind === "all") kind = o;
    else if (o && kind !== o && !(kind === "physical" && o !== "magic")) {
      out.issues.push({ severity: "loss", message: `${e.stat}: не діяв через тип шкоди скіла (${o})` });

      return out;
    }

    if (flat === null) return (note("нечислове значення"), out);

    const school = kind === "magic" && ctx.school ? { school: ctx.school } : {};

    const bonus: Effect = {
      kind: "damageBonus",
      filter: { kind, ...school },
      ...(e.isPercentage && typeof flat === "number" ? { percent: flat } : { flat }),
    };

    if (isHitAttacker && !(e.target === "all_allies")) {
      out.beforeEffects.push(bonus);
      out.issues.push({ severity: "behavior", message: `${e.stat}: тепер діє лише на атаку (раніше — завжди)` });

      return out;
    }

    out.effects.push({ ...bonus, ...target(trigger.event === "battleStart" ? "allAllies" : "self"), ...timing(trigger.event === "hit" ? 2 : 1) } as Effect);

    return out;
  }

  if (DOT[e.stat]) {
    if (passive) return (note("DOT у пасивці не має події"), out);

    const amount = typeof e.value === "string" && e.value ? e.value : value;

    if (amount === null || amount === "" || (typeof amount === "number" && amount <= 0)) return (note("нечислове значення"), out);

    if (!legacyTarget && !hasEventTarget(trigger)) return (note("DOT без цілі"), out);

    out.effects.push({ kind: "dot", damagePerRound: amount, damageType: DOT[e.stat], duration: { rounds: Math.min(99, e.duration ?? 1) }, target: legacyTarget === "self" ? "eventTarget" : (legacyTarget ?? "eventTarget") });

    return out;
  }

  switch (e.stat) {
    case "counter_damage":
      out.counterPercent = value ?? 0;

      return out;
    case "morale_per_kill":
    case "morale_per_ally_death":
      if (value) extra({ trigger: { event: "kill", role: e.stat === "morale_per_kill" ? "killerSide" : "victimSide" }, effects: [{ kind: "changeMorale", delta: Math.trunc(value) }] });

      return out;
    case "see_enemy_hp":
      extra({ trigger: { event: "passive" }, effects: [{ kind: "flag", flag: "seeEnemyHp" }] });

      return out;
    case "spell_slots_lvl4_5":
      if (!passive) return (note("лише пасивкою"), out);

      if (!ctx.skipBakedStats && value) out.effects.push({ kind: "modifyStat", stat: "spellSlots", spellLevels: [4, 5], flat: value });

      return out;
  }

  if (PASSIVE_BAKED[e.stat]) {
    const stat = PASSIVE_BAKED[e.stat];

    const isTargets = stat === "minTargets" || stat === "maxTargets";

    if (ctx.skipBakedStats) return out;

    if (flat === null) return (note("нечислове значення"), out);

    if (isTargets) {
      extra({ trigger: { event: "passive" }, effects: [{ kind: "modifyStat", stat, flat }] });

      return out;
    }

    if (passive) {
      out.effects.push({ kind: "modifyStat", stat, flat, ...target("self") } as Effect);

      return out;
    }

    if (stat === "maxHp") {
      out.effects.push({ kind: "heal", amount: typeof flat === "number" ? Math.max(0, flat) : flat, ...target("self") });
      out.issues.push({ severity: "behavior", message: "hp_bonus у подійному тригері тепер лікує" });

      return out;
    }

    return (note("змінюється лише пасивкою"), out);
  }

  switch (e.stat) {
    case "armor":
    case "initiative": {
      if (flat === null) return (note("нечислове значення"), out);

      if (passive && e.stat === "initiative" && ctx.skipBakedStats) return out;

      const fallback: AbilityTarget = isHitAttacker ? "eventTarget" : trigger.event === "battleStart" && e.stat === "initiative" ? "allAllies" : "self";

      const rounds = trigger.event === "battleStart" && e.stat === "initiative" ? 99 : isHitAttacker ? (e.stat === "initiative" ? 2 : 1) : 1;

      out.effects.push({ kind: "modifyStat", stat: e.stat, flat, ...target(fallback), ...timing(rounds) } as Effect);

      return out;
    }
    case "armor_reduction":
      if (!value) return (note("нечислове значення"), out);

      out.effects.push({ kind: "modifyStat", stat: "armor", percent: -Math.abs(value), ...target("eventTarget"), ...timing(1) } as Effect);

      return out;
    case "morale":
      if (passive) {
        if (e.type === "min") return (note("мінімальна мораль не автоматизована"), out);

        if (!ctx.skipBakedStats && value) out.effects.push({ kind: "modifyStat", stat: "morale", flat: value });

        return out;
      }

      if (value) out.effects.push({ kind: "changeMorale", delta: Math.trunc(value), ...target(trigger.event === "bonusAction" ? "eventTarget" : "self") });

      return out;
    case "morale_restore":
      if (value) out.effects.push({ kind: "changeMorale", delta: Math.trunc(value), target: "allEnemies" });

      return out;
    case "physical_resistance":
    case "spell_resistance":
    case "all_resistance": {
      if (!value) return (note("нечислове значення"), out);

      const types = e.stat === "all_resistance" ? ["physical", "spell"] : [e.stat.replace("_resistance", "")];

      for (const damageType of types) {
        out.effects.push({ kind: "flag", flag: "resistance", damageType, percent: Math.min(100, value), ...target("self"), ...timing(1) } as Effect);
      }

      return out;
    }
    case "crit_threshold":
      if (!value) return (note("нечислове значення"), out);

      out.effects.push({ kind: "modifyStat", stat: "critThreshold", flat: value >= 10 ? value - 20 : -Math.abs(value), ...timing(1) } as Effect);

      return out;
    case "advantage":
    case "advantage_ranged":
      out.effects.push({ kind: "flag", flag: "advantage", attackKind: e.stat === "advantage" ? "all" : "ranged", ...target(trigger.event === "battleStart" ? "allAllies" : "self"), ...timing(1) } as Effect);

      return out;
    case "enemy_attack_disadvantage":
      out.effects.push({ kind: "flag", flag: "disadvantageForAttackers", ...timing(1) } as Effect);
      out.issues.push({ severity: "behavior", message: "enemy_attack_disadvantage тепер діє" });

      return out;
    case "guaranteed_hit":
      out.effects.push({ kind: "flag", flag: "guaranteedHit", ...timing(1) } as Effect);
      out.issues.push({ severity: "behavior", message: "guaranteed_hit тепер діє" });

      return out;
    case "field_damage":
      if (flat === null) return (note("нечислове значення"), out);

      out.effects.push({ kind: "dot", damagePerRound: typeof flat === "number" ? Math.max(0, flat) : flat, damageType: "fire", duration: { rounds: 3 }, target: "allEnemies" });

      return out;
    case "revive_hp":
      if (!value) return (note("нечислове значення"), out);

      out.effects.push({ kind: "heal", revive: true, amount: e.isPercentage ? { percentOf: "maxHp", value } : value, target: "eventTarget" });

      return out;
    case "runic_attack":
      out.effects.push({
        kind: "randomOf",
        options: [
          { kind: "modifyStat", stat: "initiative", flat: 1, duration: { rounds: 1 } },
          { kind: "modifyStat", stat: "armor", flat: 1, duration: { rounds: 1 } },
          { kind: "heal", amount: 10 },
          { kind: "changeMorale", delta: 1 },
        ],
      });

      return out;
    case "blood_sacrifice_heal":
      out.effects.push({ kind: "heal", amount: { percentOf: "eventDamage", value: e.isPercentage && value ? value : (value ?? 50) } });

      return out;
    case "clear_negative_effects":
      out.effects.push({ kind: "cleanse", target: "eventTarget" });

      return out;
    case "restore_spell_slot":
      out.effects.push({ kind: "restoreSpellSlot", count: Math.max(1, Math.trunc(value ?? 1)) });

      return out;
    case "extra_casts":
      out.effects.push({ kind: "grantAction", refreshAction: true });

      return out;
    case "actions":
      if (value && value > 0) out.effects.push({ kind: "grantAction", extraActions: Math.trunc(value) });

      return out;
    case "survive_lethal":
      out.effects.push({ kind: "heal", amount: 1, revive: true });

      return out;
  }

  if (NOT_AUTOMATED.has(e.stat)) return (note("не автоматизовано"), out);

  note("невідомий стат");

  return out;
}
```

Для `modifyStat` таймових ефектів `timing` у пасивці повертає `{}`. Для `onHit` броні та ініціативи за замовчуванням ціль — `eventTarget`, як і раніше: старий шлях вішав на ціль дебаф.

- [ ] **Step 6: `convert-skill.ts`**

```ts
import { parseLegacyEffects } from "./parse-effects";
import { mapLegacyEffect } from "./stat-map";
import { mapLegacyTrigger } from "./trigger-map";
import type { ConversionIssue, ConversionResult, ConvertOptions } from "./types";

import type { Ability, DamageKind, Effect } from "@/lib/utils/abilities/schema";

export interface LegacySkillRow {
  id: string;
  name: string;
  combatStats: unknown;
  bonuses: unknown;
  skillTriggers: unknown;
  spellGroupId?: string | null;
}

function damageKindOverride(combatStats: unknown): DamageKind | null {
  const cs = (combatStats ?? {}) as { affectsDamage?: unknown; damageType?: unknown };

  return cs.affectsDamage === true && (cs.damageType === "melee" || cs.damageType === "ranged" || cs.damageType === "magic") ? cs.damageType : null;
}

export function convertLegacySkill(row: LegacySkillRow, opts: ConvertOptions = {}): ConversionResult {
  const effects = parseLegacyEffects(row.combatStats, row.bonuses);

  const rawTriggers = Array.isArray(row.skillTriggers) && row.skillTriggers.length ? row.skillTriggers : [{ type: "simple", trigger: "passive" }];

  const issues: ConversionIssue[] = [];

  const abilities: Ability[] = [];

  const extras: Omit<Ability, "id" | "name">[] = [];

  let counterKinds: DamageKind[] | null = null;

  let counterPercent = 0;

  rawTriggers.forEach((raw, i) => {
    const mapped = mapLegacyTrigger(raw);

    if (!mapped) {
      issues.push({ severity: "loss", message: `Невідомий тригер: ${JSON.stringify(raw)}` });

      return;
    }

    issues.push(...mapped.issues);

    if (mapped.counter) counterKinds = mapped.counter.attackKinds;

    const main: Effect[] = [];

    const before: Effect[] = [];

    for (const e of effects) {
      const r = mapLegacyEffect(e, {
        trigger: mapped.trigger,
        damageKindOverride: damageKindOverride(row.combatStats),
        school: row.spellGroupId ?? null,
        skipBakedStats: opts.skipBakedStats === true,
        emitExtras: i === 0,
      });

      if (r.counterPercent !== undefined) counterPercent += r.counterPercent;

      if (mapped.counter) {
        if (r.effects.length) issues.push({ severity: "loss", message: `${e.stat}: у тригері першого удару не діяв` });

        continue;
      }

      main.push(...r.effects);
      before.push(...r.beforeEffects);
      extras.push(...r.extras);
      issues.push(...r.issues);
    }

    if (mapped.counter) return;

    for (const text of mapped.notes) main.push({ kind: "note", text });

    const common = {
      name: row.name,
      ...(mapped.condition && { condition: mapped.condition }),
      ...(mapped.limits && { limits: mapped.limits }),
      ...(mapped.stackable && { stackable: true }),
    };

    if (main.some((e) => e.kind !== "note") || (main.length && !before.length)) {
      abilities.push({ id: `t${i}`, ...common, trigger: mapped.trigger, effects: main });
    }

    if (before.length) {
      const t = mapped.trigger;

      abilities.push({
        id: `t${i}-before`,
        ...common,
        trigger: { event: "attack", phase: "before", role: "attacker", ...(t.event === "hit" && t.attackKind && { attackKind: t.attackKind }) },
        effects: before,
      });
    }
  });

  if (counterKinds || counterPercent > 0) {
    abilities.unshift({
      id: "counter",
      name: row.name,
      trigger: { event: "passive" },
      effects: [{ kind: "flag", flag: "counterAttack", attackKinds: counterKinds ?? ["melee"], bonusPercent: counterPercent || 15 }],
    });
  }

  extras.forEach((x, n) => abilities.push({ id: `x${n}`, name: row.name, ...x }));

  return { abilities, issues };
}
```

Тест «onHit + бонус шкоди» очікує, що `limits` є і на `t0`, і на `t0-before`. Це прийнятно: кожне вміння має свій лічильник, і невелике подвоєння лімітів фіксується в звіті як issue. У звіт додати `issues.push({ severity: "behavior", message: "Ліміт onHit тепер окремо для бонусу шкоди й ефектів влучання" })`, коли `before.length && mapped.limits`.

- [ ] **Step 7: PASS, коміт**

Run: `pnpm test:run lib/utils/abilities/legacy`
Якщо golden-тест розходиться лише порядком ключів, `toEqual` це ігнорує. Якщо розходиться за значенням, виправити маппер, а не тест: тест і є специфікація.

```bash
pnpm lint --fix lib/utils/abilities && git add lib/utils/abilities && git commit -m "feat(abilities): legacy skill converter with issue report"
```

---

### Task 7: Конвертери рас, артефактів, сетів, юнітів і старого snapshot

**Files:**
- Create: `lib/utils/abilities/legacy/{convert-race,convert-artifact,convert-artifact-set,convert-unit,convert-snapshot}.ts`
- Test: `lib/utils/abilities/legacy/__tests__/convert-owners.test.ts`

**Interfaces:**
- Produces:
  - `convertLegacyRace(row: { id; name; passiveAbility: unknown }, opts?)`;
  - `convertLegacyArtifact(row: { id; name; slot?: string | null; bonuses: unknown; modifiers: unknown; passiveAbility: unknown }, opts?)`;
  - `convertLegacyArtifactSet(row: { id; name; setBonus: unknown }, opts?)`;
  - `convertLegacyUnit(row: { id; name; specialAbilities: unknown })`;
  - `convertLegacySnapshot(battleData: Record<string, unknown>): { resolvedAbilities: ResolvedAbility[]; spellEnhancers: SpellEnhancer[]; abilityUsage: Record<string, AbilityUsageCounter> }`.
  - Усі конвертери власників повертають `ConversionResult`.
- Consumes: `parseArtifactSetBonus`. Знайти справжню назву експортованого парсера в `lib/types/artifact-set-bonus.ts` (`grep -n "export function" lib/types/artifact-set-bonus.ts`). Також `parseEffectScopeObject` з `lib/constants/artifact-effect-scope.ts`, `mapLegacyEffect` і `resolveAbilities` (Task 9 — тут лише локальний хелпер `toResolved`).

- [ ] **Step 1: Тест**

```ts
import { describe, expect, it } from "vitest";

import { convertLegacyArtifact } from "@/lib/utils/abilities/legacy/convert-artifact";
import { convertLegacyArtifactSet } from "@/lib/utils/abilities/legacy/convert-artifact-set";
import { convertLegacyRace } from "@/lib/utils/abilities/legacy/convert-race";
import { convertLegacySnapshot } from "@/lib/utils/abilities/legacy/convert-snapshot";
import { convertLegacyUnit } from "@/lib/utils/abilities/legacy/convert-unit";
import { AbilitiesSchema } from "@/lib/utils/abilities/schema";

describe("convertLegacyArtifact", () => {
  it("бонуси, модифікатори шкоди/атаки і пасивка з аурою", () => {
    const r = convertLegacyArtifact({
      id: "a1",
      name: "Прапор",
      slot: "item",
      bonuses: { strength: 2, armorClass: 1, slotBonus_3: 1 },
      modifiers: [{ type: "melee_damage", value: 10, isPercentage: true }, { type: "ranged_attack", value: 1 }],
      passiveAbility: { effectScope: "all_allies", effects: [{ stat: "physical_resistance", type: "percent", value: 10, isPercentage: true }] },
    });

    expect(r.abilities).toHaveLength(1);
    expect(r.abilities[0].trigger).toEqual({ event: "passive" });
    expect(r.abilities[0].effects).toEqual(
      expect.arrayContaining([
        { kind: "modifyStat", stat: "strength", flat: 2, target: "allAllies" },
        { kind: "modifyStat", stat: "armor", flat: 1, target: "allAllies" },
        { kind: "modifyStat", stat: "spellSlots", spellLevels: [3], flat: 1, target: "allAllies" },
        { kind: "damageBonus", filter: { kind: "melee" }, percent: 10, target: "allAllies" },
        { kind: "modifyStat", stat: "attackBonus", attackKind: "ranged", flat: 1, target: "allAllies" },
        { kind: "flag", flag: "resistance", damageType: "physical", percent: 10, target: "allAllies" },
      ]),
    );
    expect(AbilitiesSchema.safeParse(r.abilities).success).toBe(true);
  });

  it("цілі зброї не дублюються (їх рахує атака)", () => {
    const r = convertLegacyArtifact({ id: "w", name: "Лук", slot: "weapon", bonuses: {}, modifiers: [{ type: "max_targets", value: 1 }], passiveAbility: null });

    expect(r.abilities).toEqual([]);
  });

  it("skipBakedStats: лише модифікатори шкоди/атаки і прапорці", () => {
    const r = convertLegacyArtifact(
      { id: "a1", name: "Меч", slot: "weapon", bonuses: { armorClass: 1 }, modifiers: [{ type: "melee_damage", value: 2 }], passiveAbility: { effects: [{ stat: "hp_bonus", type: "flat", value: 5 }] } },
      { skipBakedStats: true },
    );

    expect(r.abilities[0].effects).toEqual([{ kind: "damageBonus", filter: { kind: "melee" }, flat: 2 }]);
  });
});

describe("convertLegacyArtifactSet / Race / Unit", () => {
  it("сет: слоти, імунітет до спелів, аура на ворогів", () => {
    const r = convertLegacyArtifactSet({ id: "set", name: "Сет", setBonus: { spellSlotBonus: { "2": 1 }, immuneSpellIds: ["sp1"], effectScope: "all_enemies", modifiers: [{ type: "all_damage", value: -5, isPercentage: true }] } });

    expect(r.abilities[0].effects).toEqual(
      expect.arrayContaining([
        { kind: "modifyStat", stat: "spellSlots", spellLevels: [2], flat: 1, target: "allEnemies" },
        { kind: "flag", flag: "spellImmunity", spellIds: ["sp1"], target: "allEnemies" },
        { kind: "damageBonus", filter: { kind: "all" }, percent: -5, target: "allEnemies" },
      ]),
    );
  });

  it("раса: цілі з passiveAbility, опис з «імунітет» → issue", () => {
    const r = convertLegacyRace({ id: "r", name: "Дракон", passiveAbility: { description: "Імунітет до вогню", max_targets: 1 } });

    expect(r.abilities[0].effects).toEqual([{ kind: "modifyStat", stat: "maxTargets", flat: 1 }]);
    expect(r.issues[0].message).toContain("вручну");
  });

  it("юніт: пасивні нотатки і бонусна дія", () => {
    const r = convertLegacyUnit({ id: "u", name: "Шаман", specialAbilities: [{ name: "Тотем", description: "Ставить тотем", type: "active", actionType: "bonus_action", spellId: "sp" }, { name: "Шкіра", type: "passive" }] });

    expect(r.abilities.map((a) => a.trigger.event)).toEqual(["bonusAction", "passive"]);
    expect(AbilitiesSchema.safeParse(r.abilities).success).toBe(true);
  });
});

describe("convertLegacySnapshot", () => {
  it("activeSkills + artifacts → resolvedAbilities без запечених статів; usage з skillUsageCounts", () => {
    const r = convertLegacySnapshot({
      activeSkills: [
        { skillId: "s1", name: "Напад — Базовий", mainSkillId: "m", level: "basic", effects: [{ stat: "melee_damage", type: "percent", value: 10, isPercentage: true }], skillTriggers: [{ type: "simple", trigger: "passive" }] },
        { skillId: "s2", name: "Напад — Експерт", mainSkillId: "m", level: "expert", effects: [{ stat: "melee_damage", type: "percent", value: 30, isPercentage: true }], skillTriggers: [{ type: "simple", trigger: "passive" }] },
        { skillId: "s3", name: "Шип", mainSkillId: "m", level: "basic", effects: [{ stat: "survive_lethal", type: "flag", value: true, isPercentage: false }], skillTriggers: [{ type: "simple", trigger: "onLethalDamage", modifiers: { oncePerBattle: true } }], spellEnhancements: { spellEffectIncrease: 25 }, spellGroupId: "g" },
      ],
      racialAbilities: [],
      equippedArtifacts: [{ artifactId: "a", name: "Меч", slot: "weapon", bonuses: { armorClass: 2 }, modifiers: [{ type: "melee_damage", value: 3 }] }],
      skillUsageCounts: { s3: 1 },
    });

    const keys = r.resolvedAbilities.map((a) => a.key);

    expect(keys).toEqual(expect.arrayContaining(["skill:s2:t0", "skill:s3:t0", "artifact:a:bonuses"]));
    expect(keys).not.toContain("skill:s1:t0");
    expect(r.abilityUsage["skill:s3:t0"]).toEqual({ battle: 1, round: 0, turn: 0 });
    expect(r.spellEnhancers).toEqual([expect.objectContaining({ skillId: "s3", spellGroupId: "g", spellEnhancements: { spellEffectIncrease: 25 } })]);
  });
});
```

- [ ] **Step 2: FAIL**

- [ ] **Step 3: Реалізація (ключові частини)**

`convert-artifact.ts`:

```ts
import { mapLegacyEffect } from "./stat-map";
import type { ConversionIssue, ConversionResult, ConvertOptions, LegacyEffect } from "./types";

import { parseEffectScopeObject } from "@/lib/constants/artifact-effect-scope";
import type { AbilityTarget, Effect, StatKey } from "@/lib/utils/abilities/schema";
import { matchesAttackBonusModifier } from "@/lib/utils/battle/common/modifiers";
import { legacyDamageKindOf } from "@/lib/utils/abilities/legacy/damage-kind";

const BONUS_STATS: Record<string, StatKey> = {
  strength: "strength",
  dexterity: "dexterity",
  constitution: "constitution",
  intelligence: "intelligence",
  wisdom: "wisdom",
  charisma: "charisma",
  armorClass: "armor",
  speed: "speed",
  initiative: "initiative",
  morale: "morale",
  minTargets: "minTargets",
  maxTargets: "maxTargets",
};

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

export function audienceTarget(raw: unknown): AbilityTarget | undefined {
  const audience = parseEffectScopeObject(raw);

  return audience === "all_allies" ? "allAllies" : audience === "all_enemies" ? "allEnemies" : undefined;
}

export function mapBonuses(bonuses: unknown, skipBaked: boolean, issues: ConversionIssue[]): Effect[] {
  if (!isRecord(bonuses) || skipBaked) return [];

  const out: Effect[] = [];

  for (const [key, raw] of Object.entries(bonuses)) {
    if (typeof raw !== "number" || raw === 0) continue;

    const slot = /^slotBonus_(\d)$/.exec(key);

    if (slot) out.push({ kind: "modifyStat", stat: "spellSlots", spellLevels: [Number(slot[1])], flat: raw });
    else if (BONUS_STATS[key]) out.push({ kind: "modifyStat", stat: BONUS_STATS[key], flat: raw });
    else issues.push({ severity: "loss", message: `Бонус ${key} не переноситься` });
  }

  return out;
}

export function mapModifiers(modifiers: unknown, opts: { skipBaked: boolean; skipTargets: boolean }, issues: ConversionIssue[]): Effect[] {
  if (!Array.isArray(modifiers)) return [];

  const out: Effect[] = [];

  for (const m of modifiers) {
    if (!isRecord(m) || typeof m.type !== "string") continue;

    const value = typeof m.value === "number" ? m.value : Number.parseFloat(String(m.value));

    if (!Number.isFinite(value) || value === 0) continue;

    const type = m.type.toLowerCase();

    const damageKind = legacyDamageKindOf(type);

    if (damageKind) {
      out.push({ kind: "damageBonus", filter: { kind: damageKind }, ...(m.isPercentage ? { percent: value } : { flat: value }) });
      continue;
    }

    if (!m.isPercentage && matchesAttackBonusModifier(type, "melee" as never) !== matchesAttackBonusModifier(type, "ranged" as never)) {
      out.push({ kind: "modifyStat", stat: "attackBonus", attackKind: type.includes("ranged") ? "ranged" : "melee", flat: value });
      continue;
    }

    if (!m.isPercentage && type.includes("attack") && !type.includes("disadvantage")) {
      out.push({ kind: "modifyStat", stat: "attackBonus", flat: value });
      continue;
    }

    if (type === "min_targets" || type === "max_targets") {
      if (!opts.skipBaked && !opts.skipTargets) out.push({ kind: "modifyStat", stat: type === "min_targets" ? "minTargets" : "maxTargets", flat: value });
      continue;
    }

    issues.push({ severity: "loss", message: `Модифікатор ${m.type} не переноситься` });
  }

  return out;
}

export function convertLegacyArtifact(
  row: { id: string; name: string; slot?: string | null; bonuses: unknown; modifiers: unknown; passiveAbility: unknown },
  opts: ConvertOptions = {},
): ConversionResult {
  const issues: ConversionIssue[] = [];

  const skipBaked = opts.skipBakedStats === true;

  const passive = isRecord(row.passiveAbility) ? row.passiveAbility : {};

  const target = audienceTarget(passive);

  const effects: Effect[] = [
    ...mapBonuses(row.bonuses, skipBaked, issues),
    ...mapModifiers(row.modifiers, { skipBaked, skipTargets: row.slot === "weapon" }, issues),
  ];

  for (const e of Array.isArray(passive.effects) ? (passive.effects as LegacyEffect[]) : []) {
    const r = mapLegacyEffect({ ...e, isPercentage: e.isPercentage === true || e.type === "percent" }, { trigger: { event: "passive" }, damageKindOverride: null, school: null, skipBakedStats: skipBaked, emitExtras: false });

    effects.push(...r.effects);
    issues.push(...r.issues);
  }

  const immune = Array.isArray(passive.immuneSpellIds) ? passive.immuneSpellIds.filter((x): x is string => typeof x === "string" && !!x) : [];

  if (immune.length) effects.push({ kind: "flag", flag: "spellImmunity", spellIds: immune });

  const targeted = target ? effects.map((e) => (e.kind === "note" ? e : ({ ...e, target } as Effect))) : effects;

  return { abilities: targeted.length ? [{ id: "bonuses", name: row.name, trigger: { event: "passive" }, effects: targeted }] : [], issues };
}
```

Винести `legacyDamageKind` з Task 5 у `lib/utils/abilities/legacy/damage-kind.ts` під назвою `legacyDamageKindOf` і перевикористати в `legacy-active-effects.ts`. Для `matchesAttackBonusModifier` замість `as never` передавати `AttackType.MELEE` / `AttackType.RANGED` з `@/lib/constants/battle`. Перевірка «тип стосується лише одного виду атаки» має вигляд `isMelee !== isRanged`.

`convert-artifact-set.ts` реалізується так само, з тими ж хелперами:
- розібрати `setBonus` наявним парсером;
- `bonuses` → `mapBonuses`, `modifiers` → `mapModifiers` з `skipTargets: false`;
- `spellSlotBonus` `{lvl: n}` → `modifyStat spellSlots [lvl]`;
- `passiveEffects` → `mapLegacyEffect` з тригером `passive`;
- `immuneSpellIds` → `spellImmunity`;
- `target` береться з `effectAudience`.

`convert-race.ts`:

```ts
export function convertLegacyRace(row: { id: string; name: string; passiveAbility: unknown }, opts: ConvertOptions = {}): ConversionResult {
  const issues: ConversionIssue[] = [];

  const pa = isRecord(row.passiveAbility) ? row.passiveAbility : {};

  const effects: Effect[] = [];

  if (!opts.skipBakedStats) {
    for (const [key, stat] of [["min_targets", "minTargets"], ["minTargets", "minTargets"], ["max_targets", "maxTargets"], ["maxTargets", "maxTargets"]] as const) {
      if (typeof pa[key] === "number" && pa[key] !== 0) effects.push({ kind: "modifyStat", stat, flat: pa[key] as number });
    }
  }

  const text = [pa.description, pa.statImprovements].filter((x) => typeof x === "string").join(" ");

  if (/імун|опір|immun|resist/i.test(text)) {
    issues.push({ severity: "loss", message: `Раса «${row.name}»: опис згадує опір/імунітет — задайте прапорець resistance вручну` });
  }

  return { abilities: effects.length ? [{ id: "race", name: row.name, trigger: { event: "passive" }, effects }] : [], issues };
}
```

`convert-unit.ts`:
- для кожного `specialAbilities[i]` з `name` створюється вміння `{ id: "sa" + i, name, description }` з ефектом `note` (`text` = `description ?? name`);
- `actionType === "bonus_action"` → тригер `bonusAction` і issue `loss` «спел ${spellId} не кастується автоматично»;
- інакше тригер `passive`.

`convert-snapshot.ts`:

```ts
import { convertLegacyArtifact } from "./convert-artifact";
import { convertLegacyRace } from "./convert-race";
import { convertLegacySkill } from "./convert-skill";

import { pickHighestPerLine, resolveAbilities } from "@/lib/utils/abilities/build/resolve";
import type { AbilitySource, AbilityUsageCounter, ResolvedAbility, SpellEnhancer } from "@/types/abilities";

type Rec = Record<string, unknown>;

const arr = (v: unknown): Rec[] => (Array.isArray(v) ? (v.filter((x) => typeof x === "object" && x) as Rec[]) : []);

const str = (v: unknown): string | null => (typeof v === "string" && v ? v : null);

export function convertLegacySnapshot(bd: Rec) {
  const skills = pickHighestPerLine(
    arr(bd.activeSkills).map((s) => ({
      item: s,
      source: {
        type: "skill",
        id: String(s.skillId),
        name: String(s.name ?? ""),
        icon: str(s.icon),
        ...(str(s.mainSkillId) && str(s.level) && { line: { mainSkillId: str(s.mainSkillId)!, level: str(s.level)! } }),
      } satisfies AbilitySource,
    })),
  );

  const resolvedAbilities: ResolvedAbility[] = [];

  for (const { item: s, source } of skills) {
    const { abilities } = convertLegacySkill(
      { id: source.id, name: source.name, combatStats: { effects: s.effects, affectsDamage: s.affectsDamage, damageType: s.damageType }, bonuses: null, skillTriggers: s.skillTriggers, spellGroupId: str(s.spellGroupId) },
      { skipBakedStats: true },
    );

    resolvedAbilities.push(...resolveAbilities(source, abilities));
  }

  for (const r of arr(bd.racialAbilities)) {
    const source: AbilitySource = { type: "race", id: String(r.id), name: String(r.name ?? "") };

    resolvedAbilities.push(...resolveAbilities(source, convertLegacyRace({ id: source.id, name: source.name, passiveAbility: r.effect }, { skipBakedStats: true }).abilities));
  }

  for (const a of arr(bd.equippedArtifacts)) {
    // scoped-артефакти вже роздані одержувачам синтетичними копіями
    if (a.effectAudience && a.effectAudience !== "self") continue;

    const source: AbilitySource = { type: "artifact", id: String(a.artifactId), name: String(a.name ?? "") };

    const { abilities } = convertLegacyArtifact({ id: source.id, name: source.name, slot: str(a.slot), bonuses: a.bonuses, modifiers: a.modifiers, passiveAbility: a.passiveAbility }, { skipBakedStats: true });

    resolvedAbilities.push(...resolveAbilities(source, abilities));
  }

  const spellEnhancers: SpellEnhancer[] = skills
    .filter(({ item }) => item.spellEnhancements && typeof item.spellEnhancements === "object")
    .map(({ item, source }) => ({
      skillId: source.id,
      name: source.name,
      mainSkillId: str(item.mainSkillId),
      level: str(item.level),
      linkedSpellId: str(item.linkedSpellId),
      spellGroupId: str(item.spellGroupId),
      spellEnhancements: item.spellEnhancements as SpellEnhancer["spellEnhancements"],
    }));

  const counts = (bd.skillUsageCounts ?? {}) as Record<string, number>;

  const abilityUsage: Record<string, AbilityUsageCounter> = {};

  for (const a of resolvedAbilities) {
    const used = a.source.type === "skill" ? counts[a.source.id] : undefined;

    if (used) abilityUsage[a.key] = { battle: used, round: 0, turn: 0 };
  }

  return { resolvedAbilities, spellEnhancers, abilityUsage };
}
```

Snapshot-конвертер використовує `build/resolve.ts` з Task 9. Щоб не порушити порядок, `build/resolve.ts` створюється **в цьому таску**:

```ts
// lib/utils/abilities/build/resolve.ts
import type { Ability } from "@/lib/utils/abilities/schema";
import { inferLevelFromSkillName } from "@/lib/utils/battle/participant/parse";
import type { AbilitySource, ResolvedAbility } from "@/types/abilities";

const RANK: Record<string, number> = { basic: 1, advanced: 2, expert: 3 };

export function abilityKey(source: AbilitySource, abilityId: string): string {
  return `${source.type}:${source.id}:${abilityId}`;
}

export function resolveAbilities(source: AbilitySource, abilities: Ability[]): ResolvedAbility[] {
  return abilities.map((a) => ({ ...a, source, key: abilityKey(source, a.id) }));
}

// «Найвищий рівень у лінії»: level-скіли (рівень у назві) групуються за mainSkillId, leaf-скіли — за власним id.
export function pickHighestPerLine<T>(items: { item: T; source: AbilitySource }[]): { item: T; source: AbilitySource }[] {
  const byKey = new Map<string, { item: T; source: AbilitySource }>();

  for (const entry of items) {
    const line = entry.source.line;

    const key = line && inferLevelFromSkillName(entry.source.name) !== null ? `line:${line.mainSkillId}` : `skill:${entry.source.id}`;

    const existing = byKey.get(key);

    const rank = RANK[line?.level ?? "basic"] ?? 1;

    if (!existing || rank > (RANK[existing.source.line?.level ?? "basic"] ?? 1)) byKey.set(key, entry);
  }

  return [...byKey.values()];
}
```

- [ ] **Step 4: PASS, коміт**

```bash
pnpm test:run lib/utils/abilities && pnpm lint --fix lib/utils/abilities && git add lib/utils/abilities && git commit -m "feat(abilities): converters for races, artifacts, sets, units and legacy snapshots"
```

---

### Task 8: Колонки БД, читання із запасним варіантом, подвійний запис

**Files:**
- Modify: `prisma/schema.prisma` (`abilities Json?` у `Skill`, `Race`, `Artifact`, `ArtifactSet`, `Unit`)
- Create: `prisma/migrations/<timestamp>_ability_columns/migration.sql`; `lib/utils/abilities/legacy/read.ts`
- Modify:
  - скіли: `app/api/campaigns/[id]/skills/route.ts` (POST), `skills/[skillId]/route.ts` (PATCH), `skills/[skillId]/duplicate/route.ts`;
  - раси: `races/route.ts`, `races/[raceId]/route.ts`;
  - артефакти: `artifacts/route.ts`, `artifacts/[artifactId]/route.ts`;
  - сети: `artifact-sets/route.ts`, `artifact-sets/[setId]/route.ts` (або `lib/utils/artifacts/artifact-set-queries.ts`);
  - юніти: `units/route.ts`, `units/[unitId]/route.ts`, `units/import/route.ts`;
  - `scripts/import-skills-library.ts`;
  - GET-списки, що читають повні рядки, отримують `omit: { abilities: true }`.
- Test: `lib/utils/abilities/legacy/__tests__/read.test.ts`; дописати `app/api/__tests__/skills-api.test.ts`

**Interfaces:**
- Produces (`legacy/read.ts`):
  - `skillAbilities(row: LegacySkillRow & { abilities?: unknown }): Ability[]`, `raceAbilities(row)`, `artifactAbilities(row)`, `artifactSetAbilities(row)`, `unitAbilities(row)`;
  - `abilitiesJson(abilities: Ability[]): Prisma.InputJsonValue`.
  - Кожна `*Abilities` повертає `parseAbilities(row.abilities) ?? convert(row).abilities`. Якщо `abilities` не `null`, але невалідний, пише `console.warn` з id.

- [ ] **Step 1: Тест читання**

```ts
import { afterEach, describe, expect, it, vi } from "vitest";

import { skillAbilities } from "@/lib/utils/abilities/legacy/read";

const legacy = { id: "s", name: "С", combatStats: { effects: [{ stat: "armor", type: "flat", value: 1 }] }, bonuses: {}, skillTriggers: [{ type: "simple", trigger: "passive" }] };

describe("skillAbilities", () => {
  afterEach(() => vi.restoreAllMocks());

  it("валідна колонка має пріоритет", () => {
    const abilities = [{ id: "n", name: "Н", trigger: { event: "passive" }, effects: [{ kind: "note", text: "x" }] }];

    expect(skillAbilities({ ...legacy, abilities })).toEqual(abilities);
  });

  it("NULL → конвертер", () => {
    expect(skillAbilities({ ...legacy, abilities: null })[0].effects).toEqual([{ kind: "modifyStat", stat: "armor", flat: 1 }]);
  });

  it("сміття → конвертер + warn", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    expect(skillAbilities({ ...legacy, abilities: { bad: true } })).toHaveLength(1);
    expect(warn).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: FAIL, реалізувати `read.ts`**

```ts
import type { Prisma } from "@prisma/client";

import { convertLegacyArtifact } from "./convert-artifact";
import { convertLegacyArtifactSet } from "./convert-artifact-set";
import { convertLegacyRace } from "./convert-race";
import { convertLegacySkill, type LegacySkillRow } from "./convert-skill";
import { convertLegacyUnit } from "./convert-unit";
import type { ConversionResult } from "./types";

import { type Ability, parseAbilities } from "@/lib/utils/abilities/schema";

function read<R extends { id: string; abilities?: unknown }>(row: R, convert: (r: R) => ConversionResult): Ability[] {
  const parsed = parseAbilities(row.abilities);

  if (parsed) return parsed;

  if (row.abilities !== null && row.abilities !== undefined) console.warn(`[abilities] invalid JSON for ${row.id}, using legacy conversion`);

  return convert(row).abilities;
}

export const skillAbilities = (row: LegacySkillRow & { abilities?: unknown }) => read(row, convertLegacySkill);

export const raceAbilities = (row: Parameters<typeof convertLegacyRace>[0] & { abilities?: unknown }) => read(row, (r) => convertLegacyRace(r));

export const artifactAbilities = (row: Parameters<typeof convertLegacyArtifact>[0] & { abilities?: unknown }) => read(row, (r) => convertLegacyArtifact(r));

export const artifactSetAbilities = (row: Parameters<typeof convertLegacyArtifactSet>[0] & { abilities?: unknown }) => read(row, (r) => convertLegacyArtifactSet(r));

export const unitAbilities = (row: Parameters<typeof convertLegacyUnit>[0] & { abilities?: unknown }) => read(row, convertLegacyUnit);

export function abilitiesJson(abilities: Ability[]): Prisma.InputJsonValue {
  return abilities as unknown as Prisma.InputJsonValue;
}
```

- [ ] **Step 3: Схема й міграція**

Додати `abilities Json?` до п'яти моделей у `prisma/schema.prisma`. Потім:

Run: `pnpm db:local` (якщо БД не запущена), далі `pnpm exec prisma migrate dev --name ability_columns`
Expected: новий файл `prisma/migrations/<ts>_ability_columns/migration.sql` з п'ятьма рядками `ALTER TABLE "<table>" ADD COLUMN "abilities" JSONB;`, без `DROP`. `pnpm test:run prisma` — тест RLS лишається зеленим, бо нових `CREATE TABLE` немає.

- [ ] **Step 4: Подвійний запис у роутах**

Патерн для **create** — дописати в `data` перед `create`:
```ts
abilities: abilitiesJson(convertLegacySkill({ id: "new", name: data.name, combatStats: data.combatStats, bonuses: data.bonuses, skillTriggers: data.skillTriggers ?? [], spellGroupId: data.spellGroupId ?? null }).abilities),
```
Поле `name` у подвійному записі використовується лише для імен вмінь, `id` — лише для логу.

Патерн для **update/duplicate** — після `update` та `create` взяти рядок, що повернувся:
```ts
const updated = await prisma.skill.update({ where: { id: skillId }, data: buildSkillUpdateData(data) });

await prisma.skill.update({ where: { id: skillId }, data: { abilities: abilitiesJson(convertLegacySkill(updated).abilities) } });
```
Якщо route уже повертає `updated` клієнту, повертати той самий об'єкт. Поле `abilities` клієнт не читає.

Те саме для рас (`convertLegacyRace`), артефактів (`convertLegacyArtifact`, передати `slot`, якщо поле є в моделі; інакше `null`), сетів (`convertLegacyArtifactSet` у `insertArtifactSet` / після `updateArtifactSetRow`) і юнітів (`convertLegacyUnit`). У `units/import/route.ts` додати поле в кожен об'єкт `unitsToCreate` до `createMany`.

`scripts/import-skills-library.ts`: після кожного `prisma.skill.create/update` дописати другий `update` з `abilities`, як вище. Скрипт імпортує відносно, тож шлях — `../lib/utils/abilities/legacy/convert-skill`.

Egress: у кожному GET-роуті списку цих моделей, що не має `select`, додати `omit: { abilities: true }`. Знайти їх так:
`grep -rn "findMany" app/api/campaigns/\[id\]/{skills,races,artifacts,artifact-sets,units} | grep -v select`
Battle-start і `damage-preview` колонку читають — там `omit` не ставити.

- [ ] **Step 5: API-тест**

У `app/api/__tests__/skills-api.test.ts`, у тест POST, дописати перевірку: `expect(prismaMock.skill.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ abilities: expect.any(Array) }) }))`. Мок береться з наявного патерну в цьому файлі.

Run: `pnpm test:run app/api lib/utils/abilities && pnpm exec tsc --noEmit -p .`
Expected: PASS.

- [ ] **Step 6: Коміт**

```bash
pnpm lint --fix app/api lib/utils/abilities scripts/import-skills-library.ts && git add -A && git commit -m "feat(abilities): abilities columns, read fallback and dual-write"
```

---

### Task 9: Побудова учасника, сховище, апгрейд старого snapshot

**Files:**
- Create: `lib/utils/abilities/build/{bake,collect}.ts`, `lib/utils/battle/participant/spell-enhancers.ts`
- Modify:
  - учасник: `lib/utils/battle/participant/{from-character,from-unit,extract-skills,index}.ts`, `lib/utils/battle/artifact-sets/{apply-completed-sets,index}.ts`;
  - старт і додавання: `app/api/campaigns/[id]/battles/[battleId]/start/start-battle-handler.ts`, `add-participant/add-participant-mutation.ts`, `add-summon/add-summon-mutation.ts`, `lib/utils/battle/spell/append-summoned-unit.ts`, `app/api/campaigns/[id]/characters/[characterId]/damage-preview/route.ts`;
  - сховище: `lib/utils/battle/store/{types,split-participant}.ts`, плюс місце, де читаються `battle_snapshots` для відкату (`grep -rn "battle_snapshots\|battleSnapshot" lib/utils/battle/store app/api`);
  - тип: `types/battle.ts` — `resolvedAbilities` і `spellEnhancers` стають обов'язковими.
- Test: `lib/utils/abilities/build/__tests__/build.test.ts`, дописати `lib/utils/battle/store/__tests__/split-participant.test.ts`

**Interfaces:**
- Produces:
  - `bakePassives(p: BattleParticipant): BattleParticipant` — запечені `modifyStat` з `target: self`;
  - `applyBakedAuras(ps: BattleParticipant[], newIds: Set<string>): BattleParticipant[]` — запечені ефекти з `allAllies`/`allEnemies` для пар (джерело, одержувач), де хоча б один у `newIds`;
  - `collectCharacterAbilities(input: { skills: { row: SkillRowWithAbilities; level: string | null; mainSkillId: string | null; mainSkillSpellGroupId: string | null }[]; race: RaceRow | null; artifacts: { row: ArtifactRow; slot: string }[]; completedSets: ArtifactSetRow[] }): ResolvedAbility[]`;
  - `collectUnitAbilities(unit: UnitRow, race: RaceRow | null): ResolvedAbility[]`;
  - `inheritSchool(abilities: Ability[], school: string | null): Ability[]`;
  - `buildSpellEnhancers(skills): SpellEnhancer[]` (у `spell-enhancers.ts`, переносить `extractSpellEnhancements` з `build-active-skill.ts`);
  - `upgradeLegacyParticipant(p: BattleParticipant): BattleParticipant` — якщо `resolvedAbilities` немає, бере результат `convertLegacySnapshot(battleData)`, видаляє `activeSkills`, `racialAbilities`, `passiveAbilities`, `skillUsageCounts` і переносить `abilityUsage`;
  - `ParticipantState.abilityUsage?: Record<string, AbilityUsageCounter>`.

- [ ] **Step 1: Тест побудови**

```ts
import { describe, expect, it } from "vitest";

import { makeParticipant, resolved } from "@/lib/utils/abilities/__tests__/fixtures";
import { applyBakedAuras, bakePassives } from "@/lib/utils/abilities/build/bake";
import { collectCharacterAbilities } from "@/lib/utils/abilities/build/collect";
import { ParticipantSide } from "@/lib/constants/battle";
import { upgradeLegacyParticipant } from "@/lib/utils/battle/store/split-participant";

describe("bake", () => {
  it("запікає maxHp, ініціативу, Силу (з модифікатором) і слоти", () => {
    const ab = resolved({
      trigger: { event: "passive" },
      effects: [
        { kind: "modifyStat", stat: "maxHp", flat: 5 },
        { kind: "modifyStat", stat: "initiative", flat: 2 },
        { kind: "modifyStat", stat: "strength", flat: 2 },
        { kind: "modifyStat", stat: "spellSlots", spellLevels: [4, 5], flat: 1 },
      ],
    });

    const p = bakePassives(makeParticipant({ id: "a", abilities: [ab] }));

    expect(p.combatStats).toMatchObject({ maxHp: 25, currentHp: 25 });
    expect(p.abilities.baseInitiative).toBe(12);
    expect(p.abilities.strength).toBe(16);
    expect(p.abilities.modifiers.strength).toBe(3);
    expect(p.spellcasting.spellSlots["4"]).toEqual({ max: 1, current: 1 });
  });

  it("аури: allAllies включає джерело; повторний виклик для нових не дублює старих", () => {
    const aura = resolved({ trigger: { event: "passive" }, effects: [{ kind: "modifyStat", stat: "maxHp", flat: 3, target: "allAllies" }] });

    const ps = [makeParticipant({ id: "s", abilities: [aura] }), makeParticipant({ id: "x" }), makeParticipant({ id: "e", side: ParticipantSide.ENEMY })];

    const once = applyBakedAuras(ps, new Set(["s", "x", "e"]));

    expect(once.map((p) => p.combatStats.maxHp)).toEqual([23, 23, 20]);

    const withNew = applyBakedAuras([...once, makeParticipant({ id: "n" })], new Set(["n"]));

    expect(withNew.map((p) => p.combatStats.maxHp)).toEqual([23, 23, 20, 23]);
  });
});

describe("collectCharacterAbilities", () => {
  it("найвищий у лінії, школа з mainSkill, сет лише повний", () => {
    const skillRow = (id: string, name: string, pct: number) => ({ id, name, icon: null, abilities: null, combatStats: { effects: [{ stat: "magic_damage", type: "percent", value: pct }] }, bonuses: {}, skillTriggers: [{ type: "simple", trigger: "passive" }], spellGroupId: null });

    const list = collectCharacterAbilities({
      skills: [
        { row: skillRow("b", "Хаос — Базовий", 10), level: "basic", mainSkillId: "m", mainSkillSpellGroupId: "chaos" },
        { row: skillRow("e", "Хаос — Експерт", 30), level: "expert", mainSkillId: "m", mainSkillSpellGroupId: "chaos" },
      ],
      race: null,
      artifacts: [],
      completedSets: [],
    });

    expect(list).toHaveLength(1);
    expect(list[0].effects[0]).toEqual({ kind: "damageBonus", filter: { kind: "magic", school: "chaos" }, percent: 30 });
  });
});

describe("upgradeLegacyParticipant", () => {
  it("бій до деплою: старі поля → resolvedAbilities + abilityUsage", () => {
    const base = makeParticipant({ id: "a" });

    const legacy = {
      ...base,
      battleData: {
        ...base.battleData,
        resolvedAbilities: undefined,
        activeSkills: [{ skillId: "s3", name: "Шип", mainSkillId: "m", level: "basic", effects: [{ stat: "survive_lethal", type: "flag", value: true, isPercentage: false }], skillTriggers: [{ type: "simple", trigger: "onLethalDamage", modifiers: { oncePerBattle: true } }] }],
        racialAbilities: [],
        passiveAbilities: [],
        skillUsageCounts: { s3: 1 },
      },
    } as unknown as typeof base;

    const up = upgradeLegacyParticipant(legacy);

    expect(up.battleData.resolvedAbilities?.map((a) => a.key)).toEqual(["skill:s3:t0"]);
    expect(up.battleData.abilityUsage?.["skill:s3:t0"].battle).toBe(1);
    expect("activeSkills" in up.battleData).toBe(false);
  });
});
```

У `split-participant.test.ts` дописати:
- round-trip `abilityUsage`: `splitParticipant` → `joinParticipant`, лічильник зберігається в `state`;
- тест `joinParticipant` на snapshot без `resolvedAbilities` з `activeSkills`. Результат має `resolvedAbilities`, тобто `joinParticipant` викликає `upgradeLegacyParticipant`.

- [ ] **Step 2: FAIL**

- [ ] **Step 3: `bake.ts`**

```ts
import { resolveFlat } from "@/lib/utils/abilities/engine/amount";
import { resolvedAbilitiesOf } from "@/lib/utils/abilities/engine/participants";
import { type Effect, isBakedStat } from "@/lib/utils/abilities/schema";
import { getAbilityModifier } from "@/lib/utils/common/calculations";
import type { BattleParticipant } from "@/types/battle";

type ModifyStat = Extract<Effect, { kind: "modifyStat" }>;

const SCORES = ["strength", "dexterity", "constitution", "intelligence", "wisdom", "charisma"] as const;

function bakeOne(p: BattleParticipant, e: ModifyStat, owner: BattleParticipant): BattleParticipant {
  const flat = e.flat !== undefined ? resolveFlat(e.flat, owner) : 0;

  const pct = (base: number) => flat + Math.floor((base * (e.percent ?? 0)) / 100);

  const cs = p.combatStats;

  switch (e.stat) {
    case "maxHp": {
      const d = pct(cs.maxHp);

      return { ...p, combatStats: { ...cs, maxHp: cs.maxHp + d, currentHp: cs.currentHp + d } };
    }
    case "speed":
      return { ...p, combatStats: { ...cs, speed: cs.speed + pct(cs.speed) } };
    case "morale":
      return { ...p, combatStats: { ...cs, morale: Math.max(-3, Math.min(3, cs.morale + flat)) } };
    case "minTargets":
    case "maxTargets":
      return { ...p, combatStats: { ...cs, [e.stat]: cs[e.stat] + flat } };
    case "initiative":
      return { ...p, abilities: { ...p.abilities, baseInitiative: p.abilities.baseInitiative + flat, initiative: p.abilities.initiative + flat } };
    case "spellSlots": {
      const slots = { ...p.spellcasting.spellSlots };

      for (const level of e.spellLevels ?? []) {
        const s = slots[String(level)] ?? { max: 0, current: 0 };

        slots[String(level)] = { max: s.max + flat, current: s.current + flat };
      }

      return { ...p, spellcasting: { ...p.spellcasting, spellSlots: slots } };
    }
    default: {
      if (!(SCORES as readonly string[]).includes(e.stat)) return p;

      const stat = e.stat as (typeof SCORES)[number];

      const score = p.abilities[stat] + flat;

      return { ...p, abilities: { ...p.abilities, [stat]: score, modifiers: { ...p.abilities.modifiers, [stat]: getAbilityModifier(score) } } };
    }
  }
}

function bakedEffects(p: BattleParticipant): { effect: ModifyStat; target: string }[] {
  return resolvedAbilitiesOf(p)
    .filter((a) => a.trigger.event === "passive" && !a.condition)
    .flatMap((a) => a.effects)
    .filter((e): e is ModifyStat => e.kind === "modifyStat" && isBakedStat(e.stat))
    .map((effect) => ({ effect, target: effect.target ?? "self" }));
}

export function bakePassives(p: BattleParticipant): BattleParticipant {
  return bakedEffects(p)
    .filter((x) => x.target === "self")
    .reduce((acc, { effect }) => bakeOne(acc, effect, p), p);
}

export function applyBakedAuras(ps: BattleParticipant[], newIds: Set<string>): BattleParticipant[] {
  let out = ps;

  for (const source of ps) {
    for (const { effect, target } of bakedEffects(source)) {
      if (target !== "allAllies" && target !== "allEnemies") continue;

      out = out.map((r) => {
        const sameSide = r.basicInfo.side === source.basicInfo.side;

        const hits = target === "allAllies" ? sameSide : !sameSide;

        const fresh = newIds.has(source.basicInfo.id) || newIds.has(r.basicInfo.id);

        return hits && fresh ? bakeOne(r, effect, source) : r;
      });
    }
  }

  return out;
}
```

- [ ] **Step 4: `collect.ts`**

```ts
import { pickHighestPerLine, resolveAbilities } from "./resolve";

import { artifactAbilities, artifactSetAbilities, raceAbilities, skillAbilities, unitAbilities } from "@/lib/utils/abilities/legacy/read";
import type { Ability } from "@/lib/utils/abilities/schema";
import type { AbilitySource, ResolvedAbility } from "@/types/abilities";

export function inheritSchool(abilities: Ability[], school: string | null): Ability[] {
  if (!school) return abilities;

  return abilities.map((a) => ({
    ...a,
    effects: a.effects.map((e) => (e.kind === "damageBonus" && e.filter.kind === "magic" && !e.filter.school ? { ...e, filter: { ...e.filter, school } } : e)),
  }));
}
```

`collectCharacterAbilities` і `collectUnitAbilities` працюють так:
- джерела `{ type: "skill", id: row.id, name: row.name, icon: row.icon, line }` проходять через `pickHighestPerLine`;
- `resolveAbilities(source, inheritSchool(skillAbilities(row), row.spellGroupId ?? mainSkillSpellGroupId))`;
- раса — `{ type: "race", id, name }`;
- артефакти — `{ type: "artifact", id, name, icon }` з `slot`;
- повні сети — `{ type: "artifactSet", id, name, icon }`;
- юніт — `{ type: "unit", id, name }` разом з расою юніта.

Рядкові типи (`SkillRowWithAbilities` та інші) беруться через `Prisma.SkillGetPayload<object>` тощо, а точніше через `Pick` потрібних полів.

- [ ] **Step 5: Перебудувати `from-character.ts` та `from-unit.ts`**

У `from-character.ts`:
- `extractActiveSkillsFromCharacter` переписати на `resolveCharacterSkills(character, campaignId, preloadedSkillsById, mainSkillsById)` → `{ row, level, mainSkillId, mainSkillSpellGroupId }[]`. Логіку резолву id з рівнями (`parseMainSkillLevelId`, `inferLevelFromSkillName`) лишити, а побудову `ActiveSkill` прибрати. Уже наявний запит `mainSkill.findMany select{id,spellGroupId}` (рядок ~201) пропускати, якщо є контекст.
- Блоки, що збирають `battleData`, замінити на:

```ts
const resolvedAbilities = collectCharacterAbilities({ skills, race, artifacts, completedSets });

let participant: BattleParticipant = {
  ...,
  battleData: {
    attacks,
    activeEffects: [],
    equippedArtifacts,
    artifactSetHudMarkers,
    resolvedAbilities,
    spellEnhancers: buildSpellEnhancers(skills),
    abilityUsage: {},
  },
};

participant = bakePassives(participant);
```

- `completedSets` і `artifactSetHudMarkers` взяти з логіки виявлення повних сетів у `apply-completed-sets.ts`. Перетворити її на `findCompletedSets(equipped, context) → { sets: ArtifactSetRow[]; hudMarkers: ArtifactSetHudMarker[] }` без злиття статів.
- Видалити виклики `applyCompletedArtifactSets` (злиття), `enqueueScopedBonusFromEquippedIfNeeded`, `applyEquippedArtifactFlatBonuses`, додавання min/max зі скілів (рядки ~178–191), `applyPassiveSkillEffects`, `applyArtifactPassiveEffects`, `mergeEquippedArtifactsImmuneSpellIds`.

`from-unit.ts`: `resolvedAbilities: collectUnitAbilities(unit, race)`, `spellEnhancers: []`, далі `bakePassives`. Видалити ручне додавання расових min/max (рядки ~170–192).

Побудова старту (`start-battle-handler.ts` `buildStartOrder`) та `add-participant-mutation.ts`: `distributePendingScopedArtifactBonuses(order)` замінити на `applyBakedAuras(order, new Set(<ids нових учасників>))`. На старті нові — всі учасники, в add-participant — щойно доданий.

`append-summoned-unit.ts`, `add-summon-mutation.ts`: літерал учасника отримує `resolvedAbilities: []`, `spellEnhancers: []` (або `collectUnitAbilities`, якщо будується з юніта), далі `applyBakedAuras`.

`damage-preview/route.ts`: `distributePendingScopedArtifactBonuses([participant])` → `applyBakedAuras([participant], new Set([participant.basicInfo.id]))`.

- [ ] **Step 6: Сховище**

`store/types.ts`: `ParticipantState` отримує `abilityUsage?: Record<string, AbilityUsageCounter>`. `skillUsageCounts` лишається лише для читання старих рядків.

`split-participant.ts`:
- `splitParticipant` деструктурує `abilityUsage` з `battleData` у `state` замість `skillUsageCounts`;
- `joinParticipant` повертає `upgradeLegacyParticipant({...})`;
- `abilityUsage` береться зі `state.abilityUsage`, а якщо його немає, `upgradeLegacyParticipant` бере його з `state.skillUsageCounts`.

Для цього `joinParticipant` перед апгрейдом кладе `skillUsageCounts` у `battleData`, як і зараз.

```ts
export function upgradeLegacyParticipant(p: BattleParticipant): BattleParticipant {
  const bd = p.battleData as BattleParticipant["battleData"] & Record<string, unknown>;

  if (Array.isArray(bd.resolvedAbilities)) return p;

  const { resolvedAbilities, spellEnhancers, abilityUsage } = convertLegacySnapshot(bd);

  const { activeSkills: _a, racialAbilities: _r, passiveAbilities: _p, skillUsageCounts: _s, ...rest } = bd;

  void [_a, _r, _p, _s];

  return { ...p, battleData: { ...rest, resolvedAbilities, spellEnhancers, abilityUsage: { ...abilityUsage, ...(rest.abilityUsage as object) } } as BattleParticipant["battleData"] };
}
```

Відкат: знайти функцію, що перетворює `battle_snapshots` на учасників (`grep -rn "snapshot" lib/utils/battle/store/*.ts`). Якщо вона йде через `joinParticipant`, нічого не робити. Інакше обгорнути результат у `upgradeLegacyParticipant`. Додати тест у `lib/utils/battle/store/__tests__/` на відкат зі старим учасником.

`types/battle.ts`: `resolvedAbilities` і `spellEnhancers` стають обов'язковими, `abilityUsage?` — опційним. Старі поля поки лишаються опційними (`activeSkills?`, `racialAbilities?`, `passiveAbilities?`, `skillUsageCounts?`), щоб ще не видалений код компілювався. Видаляються вони в Task 14.

- [ ] **Step 7: Тести і typecheck**

Run: `pnpm test:run lib/utils/abilities lib/utils/battle app/api/__tests__/battles && pnpm exec tsc --noEmit -p .`
Expected: PASS. Помилки tsc у старих модулях, що читають `activeSkills`, виправляються в Tasks 10–14. На цьому кроці додати `?? []` там, де tsc падає, і лишити TODO-free: ці файли все одно видаляються або переписуються пізніше.

- [ ] **Step 8: Коміт**

```bash
pnpm lint --fix lib app && git add -A && git commit -m "feat(abilities): build participants from unified abilities; legacy snapshot upgrade"
```

---

### Task 10: Читачі модифікаторів через `collectModifiers`

**Files:**
- Modify:
  - учасник і атака: `lib/utils/battle/participant/helpers.ts` (`getEffectiveArmorClass`), `lib/utils/battle/attack/{bonus,roll,reaction}.ts`;
  - ініціатива: `lib/utils/battle/battle-start.ts` (`calculateInitiative`);
  - шкода: `lib/utils/battle/damage/{impl,breakdown,breakdown-helpers,resist,index}.ts`;
  - заклинання: `lib/utils/battle/spell/{calculations,participant-spell-target-mode,spell-immunity,process-damage}.ts`;
  - резисти: `lib/utils/battle/resistance/{index,helpers}.ts`;
  - UI і хуки: `components/battle/dialogs/{DamageRollDialog,AttackRollDialog}.tsx`, `components/battle/ParticipantStats.tsx`, `lib/hooks/battle/useBattleSceneLogic.ts` (`canSeeEnemyHp`).
- Test: дописати `lib/utils/battle/__tests__/{battle-damage-calculations,battle-resistance}.test.ts`; створити `lib/utils/battle/__tests__/ability-readers.test.ts`

**Interfaces:**
- Consumes: `collectModifiers`, `statWithModifiers`, `findFlags` (Task 5).
- Нові/змінені сигнатури (опційні параметри мають дефолти, тож прості виклики працюють):
  - `getEffectiveArmorClass(p, participants: BattleParticipant[] = [p], extra?: StaticEffect[]): number`;
  - `calculateAttackBonus(attacker, attack, participants = [attacker], extra?)`;
  - `hasAdvantage(attacker, attack, participants = [attacker], extra?)`;
  - `hasDisadvantage(attacker, attack, participants = [attacker], opts?: { extra?: StaticEffect[]; targetId?: string; targetExtra?: StaticEffect[] })`;
  - `calculateAttackRoll(attacker, attack, d20, adv?, disadv?, opts?: { participants?; extra?; targetId?; targetExtra? })` — крит, якщо `finalRoll >= max(2, 20 + critThreshold.flat)`;
  - `calculateInitiative(p, participants = [p])` = `baseInitiative + collectModifiers(...{stat:"initiative"}).flat`;
  - `calculateDamageWithModifiersImpl(attacker, baseDamage, statModifier, attackType, context?: { …; allParticipants?; actionModifiers?: StaticEffect[] })`;
  - `getCombinedResistancePercent(target, damageType, opts?: { participants?; fromSpell?: boolean })`, `hasImmunity(target, damageType, opts?)`, `applyResistance(target, damage, damageType, opts?)`;
  - `participantImmuneToSpell(p, spellId, participants = [p])`;
  - `canPerformReaction(defender, incoming, participants = [defender])`, `getCounterDamagePercent(defender, participants = [defender])`.

- [ ] **Step 1: Тест читачів**

```ts
// lib/utils/battle/__tests__/ability-readers.test.ts
import { describe, expect, it } from "vitest";

import { makeParticipant, resolved } from "@/lib/utils/abilities/__tests__/fixtures";
import { AttackType, ParticipantSide } from "@/lib/constants/battle";
import { calculateAttackBonus, calculateAttackRoll, hasAdvantage, hasDisadvantage } from "@/lib/utils/battle/attack";
import { canPerformReaction, getCounterDamagePercent } from "@/lib/utils/battle/attack/reaction";
import { calculateDamageWithModifiers } from "@/lib/utils/battle/damage";
import { getEffectiveArmorClass } from "@/lib/utils/battle/participant";
import { applyResistance } from "@/lib/utils/battle/resistance";
import type { BattleAttack } from "@/types/battle";

const bow: BattleAttack = { name: "Лук", type: AttackType.RANGED, attackBonus: 0, damageDice: "1d8", damageType: "piercing" };

describe("readers", () => {
  it("AC: пасивка + extra дії", () => {
    const p = makeParticipant({ id: "a", abilities: [resolved({ trigger: { event: "passive" }, effects: [{ kind: "modifyStat", stat: "armor", flat: 1 }] })] });

    expect(getEffectiveArmorClass(p)).toBe(15);
    expect(getEffectiveArmorClass(p, [p], [{ kind: "modifyStat", stat: "armor", flat: 2 }])).toBe(17);
  });

  it("бонус атаки за типом, перевага дальня, недолік від цілі", () => {
    const archer = makeParticipant({
      id: "a",
      abilities: [
        resolved({ trigger: { event: "passive" }, effects: [{ kind: "modifyStat", stat: "attackBonus", attackKind: "ranged", flat: 1 }, { kind: "flag", flag: "advantage", attackKind: "ranged" }] }),
      ],
    });

    const shade = makeParticipant({ id: "s", side: ParticipantSide.ENEMY, abilities: [resolved({ trigger: { event: "passive" }, effects: [{ kind: "flag", flag: "disadvantageForAttackers" }] })] });

    const base = calculateAttackBonus(makeParticipant({ id: "z" }), bow);

    expect(calculateAttackBonus(archer, bow) - base).toBe(1);
    expect(hasAdvantage(archer, bow)).toBe(true);
    expect(hasDisadvantage(archer, bow, [archer, shade], { targetId: "s" })).toBe(true);
  });

  it("поріг криту з пасивки", () => {
    const p = makeParticipant({ id: "a", abilities: [resolved({ trigger: { event: "passive" }, effects: [{ kind: "modifyStat", stat: "critThreshold", flat: -1 }] })] });

    expect(calculateAttackRoll(p, bow, 19).isCritical).toBe(true);
    expect(calculateAttackRoll(makeParticipant({ id: "b" }), bow, 19).isCritical).toBe(false);
  });

  it("шкода: пасивка + extra дії, подійний скіл не рахується", () => {
    const p = makeParticipant({
      id: "a",
      abilities: [
        resolved({ trigger: { event: "passive" }, effects: [{ kind: "damageBonus", filter: { kind: "ranged" }, percent: 50 }] }),
        resolved({ trigger: { event: "hit", role: "attacker" }, effects: [{ kind: "dot", damagePerRound: 1, damageType: "bleed", duration: { rounds: 1 } }] }, { id: "s2" }),
      ],
    });

    const r = calculateDamageWithModifiers(p, 10, 0, AttackType.RANGED, { actionModifiers: [{ kind: "damageBonus", filter: { kind: "all" }, flat: 2 }] });

    expect(r.totalDamage).toBe(10 + 5 + 2);
  });

  it("резист: фізичний з пасивки, імунітет до вогню, spell для заклинань", () => {
    const p = makeParticipant({
      id: "a",
      abilities: [
        resolved({
          trigger: { event: "passive" },
          effects: [
            { kind: "flag", flag: "resistance", damageType: "physical", percent: 50 },
            { kind: "flag", flag: "resistance", damageType: "fire", percent: 100 },
            { kind: "flag", flag: "resistance", damageType: "spell", percent: 20 },
          ],
        }),
      ],
    });

    expect(applyResistance(p, 10, "slashing").finalDamage).toBe(5);
    expect(applyResistance(p, 10, "fire").immunityApplied).toBe(true);
    expect(applyResistance(p, 10, "cold", { fromSpell: true }).finalDamage).toBe(8);
  });

  it("контратака з прапорця", () => {
    const p = makeParticipant({ id: "a", abilities: [resolved({ trigger: { event: "passive" }, effects: [{ kind: "flag", flag: "counterAttack", attackKinds: ["ranged"], bonusPercent: 30 }] })] });

    expect(canPerformReaction(p, AttackType.RANGED)).toBe(true);
    expect(canPerformReaction(p, AttackType.MELEE)).toBe(false);
    expect(getCounterDamagePercent(p)).toBe(30);
  });
});
```

- [ ] **Step 2: FAIL**

Run: `pnpm test:run lib/utils/battle/__tests__/ability-readers.test.ts`

- [ ] **Step 3: Переписати читачів**

**AC:**
```ts
export function getEffectiveArmorClass(p: BattleParticipant, participants: BattleParticipant[] = [p], extra?: StaticEffect[]): number {
  return statWithModifiers(participants.some((x) => x.basicInfo.id === p.basicInfo.id) ? participants : [p, ...participants], p.basicInfo.id, "armor", p.combatStats.armorClass, { extra });
}
```
Хелпер `withSelf(participants, p)` винести в `engine/participants.ts`. Він гарантує, що `p` у списку і саме свіжою версією: `[p, ...ps.filter(x => x.basicInfo.id !== p.basicInfo.id)]`. Те саме робити у всіх читачах нижче.

**Бонус атаки:** база (`attack.attackBonus` + модифікатор стату + proficiency) лишається, плюс `collectModifiers(withSelf(ps, attacker), id, { stat: "attackBonus", attackKind: attack.type === AttackType.RANGED ? "ranged" : "melee" }, extra).flat`. Цикли по `activeEffects` і `equippedArtifacts` видалити: legacy-адаптер уже враховує `attack_bonus`.

**Перевага і недолік:**
- `hasAdvantage` — `findFlags(..., "advantage", extra).some(f => f.attackKind === "all" || f.attackKind === kind)` або хак ельфів, рядок з `race.includes("elf")` лишити;
- `hasDisadvantage` — `findFlags(attacker, "disadvantage", extra).length > 0 || (targetId && findFlags(ps, targetId, "disadvantageForAttackers", targetExtra).length > 0)`.

**Крит:** у `calculateAttackRoll` додати параметр `opts`, передати його в `hasAdvantage` / `hasDisadvantage` і рахувати `const threshold = Math.max(2, 20 + collectModifiers(ps, id, { stat: "critThreshold" }, extra).flat); const isCritical = finalRoll >= threshold;`.

**Ініціатива:** `calculateInitiative(participant, participants = [participant])`. Спецвипадки за іменем (999) лишаються. Далі `participant.abilities.baseInitiative + collectModifiers(withSelf(...), id, { stat: "initiative" }).flat`. Цикл по `activeEffects` видалити.

**Шкода (`impl.ts`):** блоки skill / artifact / passive замінити на:
```ts
const kind = attackType === AttackType.MELEE ? "melee" : "ranged";

const mods = collectModifiers(withSelf(context?.allParticipants ?? [], attacker), attacker.basicInfo.id, { damage: { kind } }, context?.actionModifiers);

for (const e of mods.entries) {
  if (e.percent) breakdown.push(`Бонус (${e.label}): ${e.percent > 0 ? "+" : ""}${e.percent}%`);

  if (e.flat) breakdown.push(`Flat бонус (${e.label}): ${e.flat > 0 ? "+" : ""}${e.flat}`);
}

const isArtifact = (e: ModifierEntry) => e.sourceType === "artifact" || e.sourceType === "artifactSet";

const sum = (pred: (e: ModifierEntry) => boolean, key: "flat" | "percent") => mods.entries.filter(pred).reduce((s, e) => s + e[key], 0);
```
Поля результату заповнюються так:
- `skillPercentBonus` = `sum(e => !isArtifact(e), "percent")`, `skillFlatBonus` — аналогічно для flat;
- `artifactPercentBonus` / `artifactFlatBonus` = `sum(isArtifact, …)`;
- `passiveAbilityBonus = 0`;
- `totalPercent = mods.percent`, `totalFlat = mods.flat`.

`calculatePercentBonus` повертає 0 для `percent <= 0`, тому негативні відсотки (прокльони) треба рахувати окремо: `const percentBonusDamage = Math.floor(baseWithStat * mods.percent / 100)`.

`computeHitDamage` (`attack/process/compute.ts`) приймає `actionModifiers?: StaticEffect[]` і передає їх у контекст. Блок `getPassiveAbilitiesByTrigger(attacker, "on_attack")` (рядки ~90–108) видалити.

**Заклинання (`spell/calculations.ts`):**
- `getSpellEnhancementSkills(p, ctx)` → `(p.battleData.spellEnhancers ?? []).filter((e) => !e.spellGroupId || !ctx?.spellGroupId || e.spellGroupId === ctx.spellGroupId)`;
- функції `calculateSpellEffectIncrease`, `getSpellTargetChange`, `calculateSpellAdditionalModifier` читають `e.spellEnhancements`, як і раніше;
- у `calculateSpellDamageWithEnhancements` skill flat/% магії замінити на `collectModifiers(withSelf(options?.allParticipants ?? [], p), id, { damage: { kind: "magic", school: spell?.groupId ?? null } })`. Параметр `allParticipants` додати в `options`, `process-damage.ts` його передає;
- рядок логу, що перелічує всі `activeSkills` (~205), видалити.

`participant-spell-target-mode.ts`: читати `spellEnhancers` (`spellAoeSpellIds`, `linkedSpellId` + `spellAllowMultipleTargets`).

**Резисти (`resistance/index.ts`):**
```ts
const PHYSICAL = ["slashing", "piercing", "bludgeoning", "physical"];

function resistanceFlags(target: BattleParticipant, opts?: { participants?: BattleParticipant[] }) {
  return findFlags(withSelf(opts?.participants ?? [], target), target.basicInfo.id, "resistance");
}

function matches(flagType: string, damageType: string, fromSpell: boolean): boolean {
  const t = damageType.toLowerCase();

  const f = flagType.toLowerCase();

  return f === t || (f === "physical" && PHYSICAL.includes(t)) || (f === "spell" && (fromSpell || t === "spell" || t === "magic"));
}

export function getCombinedResistancePercent(target, damageType, opts?: { participants?: BattleParticipant[]; fromSpell?: boolean }): number {
  const total = resistanceFlags(target, opts)
    .filter((f) => matches(f.damageType, damageType, opts?.fromSpell === true))
    .reduce((s, f) => s + f.percent, 0);

  return Math.min(BATTLE_CONSTANTS.RESISTANCE_PERCENT_CAP, total);
}

export function hasImmunity(target, damageType, opts?) {
  return resistanceFlags(target, opts).some((f) => f.percent >= 100 && matches(f.damageType, damageType, opts?.fromSpell === true));
}
```
`getResistance` видалити. `applyResistance(target, damage, damageType, opts?)` прокидає `opts`. У `resistance/helpers.ts` видалити `findRacialAbilityByPattern` і `extractResistanceValue` разом з реекспортом. Виклики:
- `attack/process/compute.ts`, `miss.ts`, `damage.ts` — передати `{ participants: allParticipants }`;
- `spell/process-damage.ts` — `{ participants, fromSpell: true }`.

`damage/resist.ts` (preview) і `damage/breakdown-helpers.ts` (`getResistanceSkillsHighestOnly`) перевести на `getCombinedResistancePercent`, а entries брати з `collectModifiers(... { flag: "resistance" })` для тексту.

**Імунітет до спелів:** `participantImmuneToSpell(p, spellId, ps = [p])` = `findFlags(withSelf(ps, p), id, "spellImmunity").some(f => f.spellIds.includes(spellId))`.

**Реакція (`attack/reaction.ts`):**
- `getCounterDamagePercent(defender, ps = [defender])` — максимальний `bonusPercent` серед прапорців `counterAttack`;
- `canPerformReaction(defender, incoming = MELEE, ps = [defender])` = `!hasUsedReaction && findFlags(..., "counterAttack").some(f => f.attackKinds.includes(kindOf(incoming)))`;
- `performReaction` — множник `1 + getCounterDamagePercent/100`. Fallback 1.15 прибрати: конвертер уже поставив 15;
- видалити `hasOnFirstHitTakenPerRoundTrigger` і `hasCounterDamageEffect`;
- `getReactionDamageAmount` використовує `getCounterDamagePercent`.

**UI:**
- `DamageRollDialog.tsx:82` замінити `extras.advantageOnAllRolls` на `findFlags([attacker], id, "advantage").some(f => f.attackKind === "all")`;
- `ParticipantStats.tsx` викликає `getEffectiveArmorClass(p, participants)`, якщо список є в props/контексті; інакше — `getEffectiveArmorClass(p)`;
- `useBattleSceneLogic.ts` `canSeeEnemyHp` перевіряє `(p.battleData.resolvedAbilities ?? []).some(a => a.effects.some(e => e.kind === "flag" && e.flag === "seeEnemyHp") || /enemy hp|detect/i.test(a.name))`.

- [ ] **Step 4: Тести (нові + наявні)**

Run: `pnpm test:run lib/utils/battle components/battle`
Expected: нові PASS. Старі тести, що будували учасників з `activeSkills` / `extras` / `racialAbilities` для шкоди, резистів чи реакції, оновити: замінити на `resolvedAbilities` з еквівалентними пасивками (через `resolved(...)`). Очікувані числа не змінювати, хіба що вони фіксували старий баг. Такий випадок позначити в коміті.

- [ ] **Step 5: Коміт**

```bash
pnpm exec tsc --noEmit -p . && pnpm lint --fix lib components && git add -A && git commit -m "refactor(battle): read AC, attack, crit, initiative, damage, resistance and reactions via collectModifiers"
```

---

### Task 11: Події в атаці

**Files:**
- Modify: `lib/utils/battle/attack/process/{run,miss,critical-fail,damage,hit-effects,compute}.ts`, `lib/utils/battle/types/attack-process.ts`, `lib/utils/battle/attack-and-next-turn/run-attack-phase.ts`, `app/api/campaigns/[id]/battles/[battleId]/attack/attack-mutation.ts`
- Test: `lib/utils/battle/attack/process/__tests__/ability-events.test.ts`

**Interfaces:**
- `ProcessAttackParams` отримує `rng?: Rng`. За замовчуванням `Math.random`.
- `ProcessAttackResult.allParticipantsUpdated` тепер **завжди** містить повний свіжий список. Через це `run-attack-phase` більше не губить зміни після on-hit (виправлення бага з карти коду).
- Консюмить `runAbilities`, `resolveDowned`.

- [ ] **Step 1: Тест**

```ts
import { describe, expect, it } from "vitest";

import { makeParticipant, resolved, seq } from "@/lib/utils/abilities/__tests__/fixtures";
import { AttackType, ParticipantSide } from "@/lib/constants/battle";
import { processAttack } from "@/lib/utils/battle/attack/process";
import type { BattleAttack, BattleParticipant } from "@/types/battle";

const sword: BattleAttack = { id: "sw", name: "Меч", type: AttackType.MELEE, attackBonus: 5, damageDice: "1d6", damageType: "slashing" };

function attack(attacker: BattleParticipant, target: BattleParticipant, d20 = 15, others: BattleParticipant[] = []) {
  return processAttack({ attacker: { ...attacker, battleData: { ...attacker.battleData, attacks: [sword] } }, target, attack: sword, d20Roll: d20, damageRolls: [4], allParticipants: [attacker, target, ...others], currentRound: 1, battleId: "b1", rng: seq(0) });
}

describe("ability events in attack", () => {
  it("before-бонус шкоди діє на цю атаку і не лишається", () => {
    const fury = resolved({ trigger: { event: "attack", phase: "before", role: "attacker" }, effects: [{ kind: "damageBonus", filter: { kind: "melee" }, flat: 3 }] });

    const r = attack(makeParticipant({ id: "a", abilities: [fury] }), makeParticipant({ id: "e", side: ParticipantSide.ENEMY, hp: 50, maxHp: 50 }));

    const plain = attack(makeParticipant({ id: "a" }), makeParticipant({ id: "e", side: ParticipantSide.ENEMY, hp: 50, maxHp: 50 }));

    expect(r.damage!.finalDamage - plain.damage!.finalDamage).toBe(3);
    expect(r.attackerUpdated.battleData.activeEffects).toHaveLength(0);
  });

  it("hit: DOT на ціль, шипи цілі б'ють атакувальника", () => {
    const bleed = resolved({ trigger: { event: "hit", role: "attacker" }, effects: [{ kind: "dot", damagePerRound: 2, damageType: "bleed", duration: { rounds: 2 }, target: "eventTarget" }] });

    const thorns = resolved({ trigger: { event: "hit", role: "target" }, effects: [{ kind: "dealDamage", amount: 1, target: "eventActor" }] }, { id: "t" });

    const r = attack(makeParticipant({ id: "a", abilities: [bleed] }), makeParticipant({ id: "e", side: ParticipantSide.ENEMY, hp: 50, maxHp: 50, abilities: [thorns] }));

    expect(r.targetUpdated.battleData.activeEffects[0].dotDamage).toEqual({ damagePerRound: 2, damageType: "bleed" });
    expect(r.attackerUpdated.combatStats.currentHp).toBe(19);
    expect(r.battleAction.resultText).toContain("🔥");
  });

  it("летальна шкода: виживання з 1 HP; інакше kill і мораль союзників", () => {
    const survive = resolved({ trigger: { event: "lethalDamage" }, limits: { perBattle: 1 }, effects: [{ kind: "heal", amount: 1, revive: true }] });

    const r1 = attack(makeParticipant({ id: "a" }), makeParticipant({ id: "e", side: ParticipantSide.ENEMY, hp: 2, abilities: [survive] }));

    expect(r1.targetUpdated.combatStats).toMatchObject({ currentHp: 1, status: "active" });

    const mourn = resolved({ trigger: { event: "kill", role: "victimSide" }, effects: [{ kind: "changeMorale", delta: -1 }] }, { id: "m" });

    const ally = makeParticipant({ id: "e2", side: ParticipantSide.ENEMY, abilities: [mourn] });

    const r2 = attack(makeParticipant({ id: "a" }), makeParticipant({ id: "e", side: ParticipantSide.ENEMY, hp: 2 }), 15, [ally]);

    expect(r2.allParticipantsUpdated?.find((p) => p.basicInfo.id === "e2")?.combatStats.morale).toBe(-1);
  });

  it("ціль загинула від before-ефекту — атака не кидається, kill один раз", () => {
    const bolt = resolved({ trigger: { event: "attack", phase: "before", role: "attacker" }, effects: [{ kind: "dealDamage", amount: 99, target: "eventTarget" }] });

    const glory = resolved({ trigger: { event: "kill", role: "killer" }, effects: [{ kind: "changeMorale", delta: 1 }] }, { id: "g" });

    const r = attack(makeParticipant({ id: "a", abilities: [bolt, glory] }), makeParticipant({ id: "e", side: ParticipantSide.ENEMY }));

    expect(r.damage).toBeUndefined();
    expect(r.attackerUpdated.combatStats.morale).toBe(1);
  });

  it("guaranteedHit влучає попри AC", () => {
    const sure = resolved({ trigger: { event: "attack", phase: "before", role: "attacker" }, effects: [{ kind: "flag", flag: "guaranteedHit" }] });

    const r = attack(makeParticipant({ id: "a", abilities: [sure] }), makeParticipant({ id: "e", side: ParticipantSide.ENEMY, hp: 50, maxHp: 50 }), 2);

    expect(r.success).toBe(true);
  });
});
```

- [ ] **Step 2: FAIL**

- [ ] **Step 3: Переписати `processAttack`**

Структура нового `run.ts`:
- локальний список `let ps = withSelf(withSelf(allParticipants, attacker), target)`;
- хелпери `const get = (id) => findParticipant(ps, id)!` і `const msgs: string[] = []`;
- `const kind = attack.type === AttackType.RANGED ? "ranged" : "melee"; const rng = params.rng ?? Math.random; const actx = { round: currentRound, rng };`.

Кроки:
1. `const before = runAbilities(ps, { type: "attack", phase: "before", actorId, targetId, attackKind: kind }, actx); ps = before.participants; msgs.push(...before.messages); const mods = before.actionModifiers;`
2. Якщо `!isUp(get(targetId))`, повернути результат «ціль загинула до атаки». Для цього `battleAction` будується через `buildBattleActionForMiss`-подібний хелпер з `resultText = [`${attacker.name} → ${target.name}: ціль загинула до атаки`, ...msgs].join(" | ")`, `success: false`, `allParticipantsUpdated: ps`. Хелпер `buildAbortedAttackAction` додати в `actions.ts`.
3. `attackRoll = calculateAttackRoll(get(actorId), attack, d20Roll, adv, disadv, { participants: ps, extra: mods[actorId], targetId, targetExtra: mods[targetId] })`.
4. `targetAC = getEffectiveArmorClass(get(targetId), ps, mods[targetId])`, а `isHit` — `!critFail && (crit || findFlags(ps, actorId, "guaranteedHit", mods[actorId]).length > 0 || total >= targetAC)`.
5. Промах і критичний провал: `handleMiss` / `handleCriticalFail` отримують `ps` і `actx` і самі запускають `attack after` (див. нижче).
6. `computeHitDamage({ …, attacker: get(actorId), target: get(targetId), allParticipants: ps, actionModifiers: mods[actorId] })`.
7. `applyDamageToTarget(target, totalFinalDamage)` — без `targetSkillUsageCounts` і без `checkSurviveLethal`, лише HP і статус. Далі `ps = replaceParticipant(ps, updatedTarget)`. Якщо ціль упала: `const d = resolveDowned(ps, { victimId: targetId, actorId }, actx); ps = d.participants; msgs.push(...d.messages);`.
8. `const hit = runAbilities(ps, { type: "hit", actorId, targetId, attackKind: kind, damage: resistanceResult.finalDamage }, actx)` — `ps` і `msgs`.
9. Вампіризм: `applyVampirism(get(actorId), …)` → `replaceParticipant`.
10. `const after = runAbilities(ps, { type: "attack", phase: "after", … }, actx)`.
11. Реакція: `applyReaction(get(targetId), get(actorId), ignore, override, attack.type, ps)`. Якщо атакувальник упав від контратаки: `resolveDowned(ps, { victimId: actorId, actorId: targetId }, actx)`.
12. `ps = updateParticipant(ps, actorId, applyMainActionUsed)`.
13. `battleAction = buildBattleActionForHit({ …, beforeMessages: before.messages, afterMessages: msgs-after-before })`. Простіше передати весь `msgs` у `afterMessages` і порожній масив у `beforeMessages`. У `hpChanges` додати HP-зміни інших учасників від вмінь: порівняти `allParticipants` і `ps` за `currentHp` для id, що не є ні атакувальником, ні ціллю. Хелпер `diffHp(before, after)` додати в `actions.ts`.
14. `return { …, targetUpdated: get(targetId), attackerUpdated: get(actorId), allParticipantsUpdated: ps }`.

Видалити з `run.ts`:
- `executeBeforeAttackTriggers` / `executeAfterAttackTriggers`;
- `isOwnerAction`;
- копії `skillUsageCounts`;
- `applyOnKillIfDead`, `applyOnHit`;
- цикл `getPassiveAbilitiesByTrigger`.

У `hit-effects.ts` видалити `applyOnKillIfDead` і `applyOnHit`. `applyReaction` отримує параметр `participants` і передає його в `canPerformReaction`.

У `damage.ts` прибрати `checkSurviveLethal` і `targetSkillUsageCounts` з сигнатури: `applyDamageToTarget(target, totalFinalDamage): { updatedTarget }`.

`miss.ts` / `critical-fail.ts`:
- прийняти `participants: BattleParticipant[]`, `actx`;
- замінити `executeAfterAttackTriggers` на `runAbilities(ps, { type: "attack", phase: "after", … })`;
- у `miss.ts` гарантована шкода тепер виставляє статус через `applyRawDamage` і викликає `resolveDowned` — так виправлено «смерть без статусу»;
- повернути `allParticipantsUpdated: ps`.

`run-attack-phase.ts`:
- прибрати обидва виклики `updateMoraleOnEvent` (рядки ~268–293), бо мораль тепер іде через `kill`-вміння;
- мердж порядку: брати `result.allParticipantsUpdated` як новий `order` (він завжди повний), а розрахунок `currentAttacker` спростити до `findParticipant(order, attacker.id)`;
- пробросити `rng` з `AttackPhaseInput` (опційно).

`attack-mutation.ts`: видалити блок complex-тригерів (рядки ~84–95) і `systemEvent("Тригери після зміни HP")`.

- [ ] **Step 4: Тести**

Run: `pnpm test:run lib/utils/battle app/api/__tests__/battles/attack-mutation.test.ts`
Expected: нові PASS. Старі тести атаки, що перевіряли мораль від `updateMoraleOnEvent` або complex-тригери, переписати на еквівалент із `kill`-вміннями. Ті, що перевіряли видалену поведінку (мораль за вбивство без вбивства), видалити з поясненням у коміті.

- [ ] **Step 5: Коміт**

```bash
pnpm exec tsc --noEmit -p . && pnpm lint --fix lib app && git add -A && git commit -m "feat(battle): attack fires ability events; lethal/kill resolution at every attack death site"
```

---

### Task 12: Події в заклинаннях, ходах, раундах, старті, моралі, DOT і правці HP від DM

**Files:**
- Modify:
  - заклинання: `lib/utils/battle/spell/{process,process-branches,process-damage}.ts`;
  - хід і раунд: `lib/utils/battle/battle-turn.ts`, `lib/utils/battle/turn/{run-advance-turn-loop,apply-pending-morale,advance-turn}.ts`, `lib/utils/battle/battle-start.ts` (видалити `applyStartOfBattleEffects`);
  - старт: `app/api/campaigns/[id]/battles/[battleId]/start/start-battle-handler.ts`;
  - правка HP: `app/api/campaigns/[id]/battles/[battleId]/participants/[participantId]/patch-participant-mutation.ts`.
- Test: `lib/utils/battle/__tests__/ability-turn-events.test.ts`; дописати `lib/utils/battle/spell/__tests__/*`

**Interfaces:**
- `processSpell(params & { rng?: Rng })`;
- `processStartOfTurn(participant, round, allParticipants, rng?) → { …; participants: BattleParticipant[]; abilityMessages: string[] }`. Поле `triggeredAbilities` видаляється, а `participants` повертає повний список, бо `turnStart` може змінити інших;
- `processStartOfRound(order, round, pendingSummons, rng?)` всередині використовує `runAbilities`.

- [ ] **Step 1: Тест**

```ts
import { describe, expect, it } from "vitest";

import { makeParticipant, resolved, seq } from "@/lib/utils/abilities/__tests__/fixtures";
import { ParticipantSide } from "@/lib/constants/battle";
import { processStartOfRound, processStartOfTurn } from "@/lib/utils/battle/battle-turn";
import { applyPendingMoraleCheck } from "@/lib/utils/battle/turn/apply-pending-morale";
import { runAdvanceTurnLoop } from "@/lib/utils/battle/turn/run-advance-turn-loop";

describe("turn events", () => {
  it("turnStart лікує, perTurn скидається", () => {
    const regen = resolved({ trigger: { event: "turnStart" }, limits: { perTurn: 1 }, effects: [{ kind: "heal", amount: 3 }] });

    const p = makeParticipant({ id: "a", hp: 10, abilities: [regen] });

    const r = processStartOfTurn(p, 1, [p], seq(0));

    expect(r.participants[0].combatStats.currentHp).toBe(13);
    expect(r.abilityMessages[0]).toContain("💚");
  });

  it("смерть від DOT дає kill-подію союзникам", () => {
    const base = makeParticipant({ id: "a", hp: 1 });

    const dying = { ...base, battleData: { ...base.battleData, activeEffects: [{ id: "d", name: "Отрута", type: "debuff" as const, duration: 2, appliedAt: { round: 1, timestamp: new Date() }, effects: [], dotDamage: { damagePerRound: 5, damageType: "poison" } }] } };

    const mourn = resolved({ trigger: { event: "kill", role: "victimSide" }, effects: [{ kind: "changeMorale", delta: -1 }] });

    const ally = makeParticipant({ id: "b", abilities: [mourn] });

    const r = processStartOfTurn(dying, 1, [dying, ally], seq(0));

    expect(r.participants.find((p) => p.basicInfo.id === "b")?.combatStats.morale).toBe(-1);
  });

  it("roundStart і roundEnd у циклі ходів", () => {
    const rally = resolved({ trigger: { event: "roundStart" }, effects: [{ kind: "changeMorale", delta: 1 }] });

    const tired = resolved({ trigger: { event: "roundEnd" }, effects: [{ kind: "changeMorale", delta: -1 }] }, { id: "t" });

    const a = makeParticipant({ id: "a", abilities: [rally] });

    const b = makeParticipant({ id: "b", abilities: [tired] });

    const r = runAdvanceTurnLoop({ initiativeOrder: [a, b], currentTurnIndex: 1, currentRound: 1, battleId: "b1", currentBattleLogLength: 0, pendingSummons: [] });

    expect(r.updatedInitiativeOrder.find((p) => p.basicInfo.id === "a")?.combatStats.morale).toBe(1);
    expect(r.updatedInitiativeOrder.find((p) => p.basicInfo.id === "b")?.combatStats.morale).toBe(-1);
  });

  it("moraleCheck: успіх власника і перевірка союзника", () => {
    const proud = resolved({ trigger: { event: "moraleCheck", result: "success", whose: "self" }, effects: [{ kind: "heal", amount: 2 }] });

    const a = makeParticipant({ id: "a", hp: 10, abilities: [proud] });

    const r = applyPendingMoraleCheck([a, makeParticipant({ id: "e", side: ParticipantSide.ENEMY })], { participantId: "a", roll: 20, success: true } as never, 1, "b1", 0);

    expect(r.updatedInitiativeOrder[0].combatStats.currentHp).toBe(12);
  });

  it("roundStart лише для новачків у battleStart", () => {
    const rally = resolved({ trigger: { event: "battleStart" }, effects: [{ kind: "changeMorale", delta: 1 }] });

    const veteran = { ...makeParticipant({ id: "a", abilities: [rally] }) };

    const r = processStartOfRound([veteran], 2, []);

    expect(r.updatedInitiativeOrder[0].combatStats.morale).toBe(0);
  });
});
```

Форму `payload` для `applyPendingMoraleCheck` звірити з типом у `turn/pending-morale.ts` і замінити `as never` на справжній об'єкт.

- [ ] **Step 2: FAIL**

- [ ] **Step 3: Реалізація**

**`battle-turn.ts` / `processStartOfTurn`:**
- `applyDOTEffects` і зменшення тривалостей лишаються;
- після DOT, якщо HP ≤ 0: виставити статус через `downStatus` і викликати `resolveDowned([...], { victimId, actorId: null }, ctx)`;
- якщо учасник живий: `runAbilities(ps, { type: "turnStart", actorId }, ctx)`;
- повернути `participants` і `abilityMessages`;
- видалити блок `getPassiveAbilitiesByTrigger(…, "start_of_turn")`.

**`processStartOfRound`:**
- `applyOnBattleStartEffectsToNewAllies` замінити на `runAbilities(order, { type: "battleStart", newcomerIds: [...newSummonIds] }, ctx)`, а потім `applyBakedAuras(order, newSummonIds)`;
- `executeStartOfRoundTriggers` замінити на `runAbilities(order, { type: "roundStart" }, ctx)`;
- повідомлення класти в `triggerMessages`.

**`run-advance-turn-loop.ts`:**
- перед переходом ходу: `runAbilities(order, { type: "turnEnd", actorId: current.id }, ctx)`;
- коли раунд завершується: замість циклу `executeSkillsByTrigger(p, "endRound")` один виклик `runAbilities(order, { type: "roundEnd" }, ctx)`;
- повідомлення `turnEnd`/`roundEnd`, якщо вони є, дописати системною `BattleAction` з текстом `Кінець раунду ${n}: …` (за аналогією з рядком ~112 для початку раунду);
- результат `processStartOfTurn.participants` мерджити в `order`, а не лише одного учасника;
- `abilityMessages` логувати так, як зараз логуються `triggeredAbilities` (рядок ~215).

**`apply-pending-morale.ts`:**
- замінити два `executeSkillsByTrigger` на `runAbilities(order, { type: "moraleCheck", actorId: payload.participantId, result: success ? "success" : "fail" }, ctx)`;
- `whose: ally` матчиться автоматично в тригері.

**Старт (`start-battle-handler.ts`, `applyStartOfBattleAndSort`):**
- прибрати `applyStartOfBattleEffects`, `executeOnBattleStartEffectsForAll`, `executeStartOfRoundTriggers`;
- натомість `let ps = runAbilities(order, { type: "battleStart" }, ctx).participants;` і далі `roundStart`;
- повідомлення класти в існуючий «Тригери початку бою»;
- `ctx = { round: 1, rng: Math.random }`.

Видалити `applyStartOfBattleEffects` з `battle-start.ts`. Конвертер артефактів уже переносить `start_of_battle` як вміння `battleStart`: перевірити, що `convertLegacyArtifact` обробляє `passiveAbility.trigger?.type === "start_of_battle"` — створює окреме вміння `{ id: "start", trigger: { event: "battleStart" }, effects: [{ kind: "note", text: name }] }`. Якщо ні, дописати разом з тестом у Task 7.

**Заклинання (`process.ts`, `process-branches.ts`):**
- `isOwnerAction` прибрати;
- before: `runAbilities(ps, { type: "spellCast", phase: "before", actorId: caster.id, targetIds }, ctx)`;
- after: те саме з `phase: "after"`, **до** `buildSpellSuccessAction`, щоб повідомлення потрапили в `resultText`;
- блок kill (рядки ~280–314) замінити: для кожної цілі з `orig.currentHp > 0 && status down` викликати `resolveDowned(ps, { victimId, actorId: caster.id }, ctx)` для будь-якої сторони, не лише ворогів;
- `computeSpellDamageAndApply` (`process-damage.ts:143`) і далі виставляє статус;
- `handleNoTargetSpell`, `handleDispelSpell` — after-подія з повідомленнями в лог;
- повідомлення додавати в `battleAction.resultText` через `" | "`;
- `ProcessSpellResult` отримує `allParticipantsUpdated: BattleParticipant[]`;
- `spell-mutation.ts` мерджить порядок з нього, а не лише `caster` і `targets`.

**`patch-participant-mutation.ts`:**
- прибрати complex-тригери (рядок ~107);
- коли DM ставить HP ≤ 0 живому учаснику: `resolveDowned(order, { victimId, actorId: null }, ctx, { allowSurvive: false })`;
- повідомлення — у `systemEvent`.

- [ ] **Step 4: Тести**

Run: `pnpm test:run lib/utils/battle app/api/__tests__/battles`
Expected: PASS. Наявні тести на `executeStartOfRoundTriggers`, `endRound` та інші переписати на вміння.

- [ ] **Step 5: Коміт**

```bash
pnpm exec tsc --noEmit -p . && pnpm lint --fix lib app && git add -A && git commit -m "feat(battle): spell, turn, round, battle-start, morale and DOT fire ability events"
```

---

### Task 13: Бонусна дія через `abilityKey`

**Files:**
- Modify:
  - API: `app/api/campaigns/[id]/battles/[battleId]/bonus-action/bonus-action-mutation.ts`;
  - клієнт: `lib/api/battles.ts`, `lib/hooks/battles/useBattles.ts`, `lib/hooks/battle/useBattleSceneLogic-handlers.ts`;
  - UI: `components/battle/views/PlayerTurnView.tsx`, `components/battle/dialogs/BonusActionPickerDialog.tsx`, `components/battle/ActionButtonsPanel.tsx` (якщо отримує скіли).
- Test: переписати `app/api/__tests__/battles/bonus-action-mutation.test.ts`

**Interfaces:**
- Тіло запиту: `{ participantId: string; abilityKey: string; targetParticipantId?: string }`.
- Нове: `getBonusActionAbilities(p: BattleParticipant): ResolvedAbility[]` — вміння з тригером `bonusAction`, що проходять `withinLimits`. Розмістити в `lib/utils/abilities/engine/bonus-actions.ts` і експортувати з `lib/utils/abilities/index.ts`.
- Помилки: `BattleRuleError("action_rejected")` — немає такого вміння; `"action_used"` — бонусну дію вже використано; `"ability_limit"` — ліміт вичерпано (код 422). Додати `"ability_limit"` до union кодів `BattleRuleError` у `lib/utils/battle/store/errors.ts`, якщо коди типізовані.

- [ ] **Step 1: Тест**

```ts
import { describe, expect, it } from "vitest";

import { context, goblin, participant } from "./fixtures";

import { bonusActionMutation } from "@/app/api/campaigns/[id]/battles/[battleId]/bonus-action/bonus-action-mutation";
import { resolved } from "@/lib/utils/abilities/__tests__/fixtures";

const rally = resolved({ id: "r", trigger: { event: "bonusAction" }, limits: { perBattle: 1 }, effects: [{ kind: "changeMorale", delta: 1, target: "eventTarget" }] });

const hero = participant("hero", { controlledBy: "user-1" }, {});

const heroWith = { ...hero, battleData: { ...hero.battleData, resolvedAbilities: [rally] } };

describe("bonusActionMutation", () => {
  it("виконує обране вміння, витрачає бонусну дію і ліміт", () => {
    const r = bonusActionMutation(context({ participants: [heroWith, goblin] }), { participantId: "hero", abilityKey: rally.key });

    const h = r.participants.find((p) => p.basicInfo.id === "hero")!;

    expect(h.combatStats.morale).toBe(1);
    expect(h.actionFlags.hasUsedBonusAction).toBe(true);
    expect(h.battleData.abilityUsage?.[rally.key].battle).toBe(1);
    expect(r.events[0]).toMatchObject({ type: "ability", details: { actionDetails: { abilityKey: rally.key, skillName: rally.name } } });
  });

  it("ліміт вичерпано → ability_limit", () => {
    const used = { ...heroWith, battleData: { ...heroWith.battleData, abilityUsage: { [rally.key]: { battle: 1, round: 1, turn: 1 } } } };

    expect(() => bonusActionMutation(context({ participants: [used, goblin] }), { participantId: "hero", abilityKey: rally.key })).toThrow(/ліміт/i);
  });

  it("невідоме вміння → action_rejected", () => {
    expect(() => bonusActionMutation(context({ participants: [heroWith, goblin] }), { participantId: "hero", abilityKey: "nope" })).toThrow();
  });
});
```

- [ ] **Step 2: FAIL**

- [ ] **Step 3: Мутація**

```ts
export const bonusActionSchema = z.object({
  participantId: z.string(),
  abilityKey: z.string(),
  targetParticipantId: z.string().optional(),
});

export function bonusActionMutation(ctx: BattleMutationContext, data: BonusActionBody): MutationResult {
  const participant = ctx.participants.find((p) => p.basicInfo.id === data.participantId);

  if (!participant) throw new BattleAccessError(404, "Учасника немає в бою");

  if (!ctx.isDM && participant.basicInfo.controlledBy !== ctx.userId) throw new BattleAccessError(403, "Forbidden");

  const ability = (participant.battleData.resolvedAbilities ?? []).find((a) => a.key === data.abilityKey && a.trigger.event === "bonusAction");

  if (!ability) throw new BattleRuleError("action_rejected", "У учасника немає такого вміння");

  if (participant.actionFlags.hasUsedBonusAction) throw new BattleRuleError("action_used", "Бонусну дію вже використано цього ходу");

  if (!withinLimits(participant, ability)) throw new BattleRuleError("ability_limit", "Ліміт використань вичерпано");

  const run = runAbilities(
    ctx.participants,
    { type: "bonusAction", actorId: participant.basicInfo.id, abilityKey: ability.key, targetId: data.targetParticipantId },
    { round: ctx.scene.round, rng: Math.random },
  );

  const participants = updateParticipant(run.participants, participant.basicInfo.id, (p) => ({ ...p, actionFlags: { ...p.actionFlags, hasUsedBonusAction: true } }));

  const text = run.fired.length ? run.messages.join(" | ") : `${ability.name}: не спрацювало`;

  return {
    participants,
    pending: ctx.pending,
    events: [
      {
        type: "ability",
        round: ctx.scene.round,
        actorId: participant.basicInfo.id,
        resultText: text || ability.name,
        details: { actorName: participant.basicInfo.name, actorSide: participant.basicInfo.side, actionDetails: { abilityKey: ability.key, skillName: ability.name } },
      },
    ],
  };
}
```

- [ ] **Step 4: Клієнт і UI**

- `lib/api/battles.ts` (функція бонусної дії) і `useBattles.ts`: параметр `skillId` → `abilityKey`.
- `useBattleSceneLogic-handlers.ts`: передати `abilityKey`.
- `PlayerTurnView.tsx:66-75`: `getSkillsByTrigger(activeSkills, "bonusAction")` → `getBonusActionAbilities(participant)`.
- `BonusActionPickerDialog.tsx`: пропс `skills: ActiveSkill[]` → `abilities: ResolvedAbility[]`; рендер `ability.source.icon`, `ability.name`, `ability.description ?? ability.effects.map(describeEffect).join(", ")`; `onSelect(ability.key, targetId)`. `describeEffect` імпортувати з `@/lib/utils/abilities`.

Потрібна ціль чи ні — визначається тим, чи є в ефектах `target: "eventTarget"`. Хелпер `abilityNeedsTarget(a)` додати в `engine/bonus-actions.ts`. Діалог показує вибір цілі лише тоді, коли це `true`; раніше скіли питали ціль завжди.

- [ ] **Step 5: Тести й коміт**

Run: `pnpm test:run app/api/__tests__/battles components/battle lib && pnpm exec tsc --noEmit -p .`

```bash
pnpm lint --fix app lib components && git add -A && git commit -m "feat(battle): bonus action executes unified abilities by key"
```

---

### Task 14: Видалити старі шляхи

**Files:** див. рядок «Delete» у File Structure. Додатково:
- `lib/utils/battle/participant/index.ts`, `lib/utils/battle/artifact-sets/index.ts` — barrels;
- `types/battle.ts` — видалити `PassiveAbility`, `RacialAbility`, `ActiveSkill`, `SkillEffect`, `SkillDamageType` (якщо ніде не лишилось), `PendingScopedArtifactBonus`, поля `passiveAbilities`, `racialAbilities`, `activeSkills`, `pendingScopedArtifactBonuses`, `skillUsageCounts`;
- `package.json` — видалити скрипти `run-skills-testing*`, якщо вони є.

- [ ] **Step 1: Видалення**

```bash
git rm -r lib/utils/skills/execution lib/utils/skills/triggers lib/utils/battle/triggers
git rm lib/utils/skills/types/execution.ts lib/utils/battle/participant/{passive,apply-passive-stat-effect,build-active-skill,extract-racial,apply-artifact-flat-bonuses,merge-equipped-immune}.ts
git rm lib/utils/battle/damage/{skill,skill-resolve,bonuses}.ts lib/utils/battle/artifact-sets/{apply-set-passive-effects,distribute-scoped-artifact-bonuses,merge-set-bonus,equipped-to-parsed-bundle}.ts
git rm lib/types/skill-triggers.ts lib/types/skills.ts scripts/run-skills-testing*.ts
git rm lib/utils/skills/__tests__/skill-triggers*.ts
```

Перед кожним `git rm` переконатися, що файл існує і що його не імпортує ніщо з того, що лишається:
`grep -rn "<module path>" app lib components scripts`
Якщо імпорт лишився в живому коді (наприклад, `extras.ts` у `getParticipantExtras`), перенести потрібне або прибрати виклик. `lib/utils/skills/types/index.ts` залишити, якщо його використовує UI скілів.

- [ ] **Step 2: Компіляція і чистка**

Run: `pnpm exec tsc --noEmit -p .`
Виправляти кожну помилку:
- тестові моки з `activeSkills` / `racialAbilities` / `passiveAbilities` → `resolvedAbilities: [], spellEnhancers: []`;
- імпорти видалених модулів — переключити на нові API.

Run: `grep -rn "activeSkills\|racialAbilities\|passiveAbilities\|skillUsageCounts\|executeSkillsByTrigger\|getSkillsByTrigger\|getPassiveAbilitiesByTrigger" app lib components scripts`
Expected: збіги лише в `lib/utils/abilities/legacy/convert-snapshot.ts`, `lib/utils/battle/store/{split-participant,types}.ts` (старий формат на вході) і `scripts/import-skills-library*` (старий формат джерела).

Також перевірити, що в `lib/utils/skills/__tests__/` лишилися лише тести UI-хелперів (`skill-helpers`, `skills`): `pnpm test:run lib/utils/skills`.

- [ ] **Step 3: Повний прогін**

Run: `pnpm test:run && pnpm lint && pnpm exec tsc --noEmit -p .`
Expected: усе зелене.

- [ ] **Step 4: Коміт**

```bash
git add -A && git commit -m "refactor(abilities): remove legacy skill execution, passive abilities and duplicated types"
```

---

### Task 15: Скрипт конвертації зі звітом

**Files:**
- Create: `lib/utils/abilities/legacy/report.ts`, `scripts/convert-abilities.ts`
- Modify: `package.json` (`"convert-abilities": "tsx scripts/convert-abilities.ts"`), `.gitignore`, якщо звіти не мають потрапляти в git (звіти **комітимо**: `docs/reports/` — так вирішено в спеці)
- Test: `lib/utils/abilities/legacy/__tests__/report.test.ts`

**Interfaces:**
- `ReportRow { kind: "skill"|"race"|"artifact"|"artifactSet"|"unit"; id: string; name: string; campaignId: string; result: ConversionResult; valid: boolean }`.
- `buildConversionReport(rows: ReportRow[], meta: { date: string; mode: "dry-run" | "apply" | "force" }): string`. Повертає markdown: підсумок за статусами «точно» (issues нема, valid), «з втратами» (є issue `loss` або `behavior`), «не вдалося» (`!valid` — результат не пройшов `AbilitiesSchema`). Далі розділ на кожен статус: таблиця `| тип | назва | id | причини |`.
- Скрипт:
  - `pnpm convert-abilities [--campaign <id>] [--apply] [--force]`;
  - читає всі п'ять моделей (`select` лише полів, потрібних конвертерам, плюс `abilities`, `campaignId`);
  - конвертує й валідує кожен рядок через `AbilitiesSchema.safeParse`;
  - пише звіт у `docs/reports/abilities-conversion-<YYYY-MM-DD>.md`;
  - з `--apply` оновлює рядки, де `abilities IS NULL` і результат валідний; з `--force` — усі валідні;
  - друкує підсумок через `console.info`;
  - рядки з `!valid` не записує ніколи.

- [ ] **Step 1: Тест звіту**

```ts
import { describe, expect, it } from "vitest";

import { buildConversionReport } from "@/lib/utils/abilities/legacy/report";

describe("buildConversionReport", () => {
  it("групує за статусами", () => {
    const md = buildConversionReport(
      [
        { kind: "skill", id: "1", name: "Ок", campaignId: "c", valid: true, result: { abilities: [], issues: [] } },
        { kind: "skill", id: "2", name: "Втрати", campaignId: "c", valid: true, result: { abilities: [], issues: [{ severity: "loss", message: "weird_stat: невідомий стат" }] } },
        { kind: "race", id: "3", name: "Зламано", campaignId: "c", valid: false, result: { abilities: [], issues: [] } },
      ],
      { date: "2026-10-08", mode: "dry-run" },
    );

    expect(md).toContain("Точно: 1");
    expect(md).toContain("З втратами: 1");
    expect(md).toContain("Не вдалося: 1");
    expect(md).toContain("| skill | Втрати | 2 | weird_stat: невідомий стат |");
  });
});
```

- [ ] **Step 2: FAIL → реалізувати `report.ts`**

```ts
import type { ConversionResult } from "./types";

export interface ReportRow {
  kind: "skill" | "race" | "artifact" | "artifactSet" | "unit";
  id: string;
  name: string;
  campaignId: string;
  result: ConversionResult;
  valid: boolean;
}

const status = (r: ReportRow) => (!r.valid ? "failed" : r.result.issues.length ? "lossy" : "exact");

const esc = (s: string) => s.replace(/\|/g, "\\|").replace(/\n/g, " ");

export function buildConversionReport(rows: ReportRow[], meta: { date: string; mode: "dry-run" | "apply" | "force" }): string {
  const groups = { exact: rows.filter((r) => status(r) === "exact"), lossy: rows.filter((r) => status(r) === "lossy"), failed: rows.filter((r) => status(r) === "failed") };

  const table = (list: ReportRow[], reasons: (r: ReportRow) => string) =>
    ["| тип | назва | id | причини |", "|---|---|---|---|", ...list.map((r) => `| ${r.kind} | ${esc(r.name)} | ${r.id} | ${esc(reasons(r))} |`)].join("\n");

  return [
    `# Конвертація умінь — ${meta.date} (${meta.mode})`,
    "",
    `- Точно: ${groups.exact.length}`,
    `- З втратами: ${groups.lossy.length}`,
    `- Не вдалося: ${groups.failed.length}`,
    "",
    "## Не вдалося",
    "",
    table(groups.failed, () => "результат не пройшов валідацію"),
    "",
    "## З втратами / зміною поведінки",
    "",
    table(groups.lossy, (r) => r.result.issues.map((i) => `${i.severity === "behavior" ? "⚠️ " : ""}${i.message}`).join("; ")),
    "",
    "## Точно",
    "",
    table(groups.exact, () => ""),
    "",
  ].join("\n");
}
```

- [ ] **Step 3: `scripts/convert-abilities.ts`**

Стиль імпортів — як у `scripts/import-skills-library.ts`: `new PrismaClient()` і відносні шляхи до `lib/`.

```ts
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { PrismaClient } from "@prisma/client";

import { convertLegacyArtifact } from "../lib/utils/abilities/legacy/convert-artifact";
import { convertLegacyArtifactSet } from "../lib/utils/abilities/legacy/convert-artifact-set";
import { convertLegacyRace } from "../lib/utils/abilities/legacy/convert-race";
import { convertLegacySkill } from "../lib/utils/abilities/legacy/convert-skill";
import { convertLegacyUnit } from "../lib/utils/abilities/legacy/convert-unit";
import { buildConversionReport, type ReportRow } from "../lib/utils/abilities/legacy/report";
import type { ConversionResult } from "../lib/utils/abilities/legacy/types";
import { AbilitiesSchema } from "../lib/utils/abilities/schema";

const prisma = new PrismaClient();

const args = process.argv.slice(2);

const campaignId = args.includes("--campaign") ? args[args.indexOf("--campaign") + 1] : undefined;

const mode = args.includes("--force") ? "force" : args.includes("--apply") ? "apply" : "dry-run";

const where = campaignId ? { campaignId } : {};

type Model = "skill" | "race" | "artifact" | "artifactSet" | "unit";

async function main() {
  const rows: (ReportRow & { hasAbilities: boolean })[] = [];

  const push = (kind: Model, row: { id: string; name: string; campaignId: string; abilities: unknown }, result: ConversionResult) =>
    rows.push({ kind, id: row.id, name: row.name, campaignId: row.campaignId, result, valid: AbilitiesSchema.safeParse(result.abilities).success, hasAbilities: row.abilities !== null });

  for (const r of await prisma.skill.findMany({ where, select: { id: true, name: true, campaignId: true, abilities: true, combatStats: true, bonuses: true, skillTriggers: true, spellGroupId: true } })) push("skill", r, convertLegacySkill(r));

  for (const r of await prisma.race.findMany({ where, select: { id: true, name: true, campaignId: true, abilities: true, passiveAbility: true } })) push("race", r, convertLegacyRace(r));

  for (const r of await prisma.artifact.findMany({ where, select: { id: true, name: true, campaignId: true, abilities: true, bonuses: true, modifiers: true, passiveAbility: true, slot: true } })) push("artifact", r, convertLegacyArtifact(r));

  for (const r of await prisma.artifactSet.findMany({ where, select: { id: true, name: true, campaignId: true, abilities: true, setBonus: true } })) push("artifactSet", r, convertLegacyArtifactSet(r));

  for (const r of await prisma.unit.findMany({ where, select: { id: true, name: true, campaignId: true, abilities: true, specialAbilities: true } })) push("unit", r, convertLegacyUnit(r));

  const date = new Date().toISOString().slice(0, 10);

  mkdirSync(join(process.cwd(), "docs/reports"), { recursive: true });

  const path = join(process.cwd(), `docs/reports/abilities-conversion-${date}.md`);

  writeFileSync(path, buildConversionReport(rows, { date, mode }));

  let written = 0;

  if (mode !== "dry-run") {
    for (const r of rows) {
      if (!r.valid || (mode === "apply" && r.hasAbilities)) continue;

      const data = { abilities: r.result.abilities as object };

      const whereId = { where: { id: r.id }, data };

      if (r.kind === "skill") await prisma.skill.update(whereId);
      else if (r.kind === "race") await prisma.race.update(whereId);
      else if (r.kind === "artifact") await prisma.artifact.update(whereId);
      else if (r.kind === "artifactSet") await prisma.artifactSet.update(whereId);
      else await prisma.unit.update(whereId);

      written++;
    }
  }

  console.info(`Звіт: ${path}; рядків: ${rows.length}; записано: ${written} (${mode})`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
```

Якщо в моделі `Artifact` немає поля `slot`, прибрати його з `select`: конвертер прийме `undefined`. Перевірити так: `grep -n "model Artifact " -A20 prisma/schema.prisma`.

- [ ] **Step 4: Локальний прогін**

Run: `pnpm test:run lib/utils/abilities/legacy && pnpm convert-abilities`
Expected: звіт у `docs/reports/abilities-conversion-<date>.md` по локальній Docker-БД. Переглянути розділ «Не вдалося». Кожен такий рядок — баг конвертера: виправити й додати тест у Task 6/7.

- [ ] **Step 5: Коміт**

```bash
pnpm lint --fix lib/utils/abilities scripts/convert-abilities.ts && git add -A && git commit -m "feat(abilities): convert-abilities script with dry-run report"
```

---

### Task 16: Інтеграційні тести через пайплайн і фінальна перевірка

**Files:**
- Test: `app/api/__tests__/battles/abilities-integration.test.ts`

**Interfaces:**
- Consumes: фікстури `app/api/__tests__/battles/fixtures.ts` (`context`, `participant`) і мутації `attackMutation`, `nextTurnMutation`, `bonusActionMutation`.

- [ ] **Step 1: Тест**

Сценарії тестуються на рівні мутацій з `context(...)`, за тим самим патерном, що й сусідні `*-mutation.test.ts`:

1. **Атака з DOT на влучання:** `attackMutation` з `d20` 15 → у цілі `activeEffects[0].dotDamage`. Потім `nextTurnMutation` → на початку ходу цілі HP зменшилось на `damagePerRound`, а лог містить повідомлення DOT.
2. **Контратака цілі:** у цілі пасивка `counterAttack` для melee → `attackMutation` → `reactionTriggered` true, HP атакувальника зменшилось; наступна атака в тому самому раунді контратаки не викликає (`hasUsedReaction`).
3. **Виживання:** у цілі `lethalDamage → heal 1 revive` з `perBattle: 1` → дві смертельні атаки підряд: перша лишає 1 HP, друга вбиває.
4. **Мораль союзників:** у союзника цілі `kill/victimSide → changeMorale -1` → смертельна атака → мораль союзника −1, рівно одна зміна.
5. **Бонусна дія з лімітом:** див. Task 13; тут — у зв'язці з `nextTurnMutation`: `perTurn: 1` скидається на наступному ході власника.
6. **Старий snapshot:** учасник, зібраний через `splitParticipant`/`joinParticipant` з `battleData`, де є `activeSkills` (пасивний `melee_damage` 50%) і немає `resolvedAbilities` → `attackMutation` → шкода містить +50%.

Кожен сценарій пишеться як `it(...)` з фактичними учасниками через `participant(...)` і `resolved(...)`. Кубики передаються явно в тілі атаки, як у наявному `attack-mutation.test.ts`.

- [ ] **Step 2: Прогін**

Run: `pnpm test:run app/api/__tests__/battles/abilities-integration.test.ts`
Expected: PASS. Якщо сценарій падає, причину шукати в Task 10–13, а тест не послаблювати.

- [ ] **Step 3: Повна верифікація**

Run: `pnpm test:run && pnpm lint && pnpm exec tsc --noEmit -p . && pnpm build`
Expected: усе зелене. `pnpm build` виконує `prisma generate && next build`.

- [ ] **Step 4: Коміт**

```bash
git add -A && git commit -m "test(abilities): pipeline-level integration scenarios"
```

---

## Після злиття (ручні кроки користувача)

1. `pnpm convert-abilities` проти prod. `DATABASE_URL`/`DIRECT_URL` береться з `.env.production-db.local`. Спершу dry-run, звіт показати DM.
2. Після перегляду звіту — `pnpm convert-abilities --apply`.
3. Запасний варіант на час читання і подвійний запис лишаються до contract-міграції після 3b/3c.
