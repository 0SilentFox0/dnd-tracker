# Етап 4a: стани 5e, рятівні кидки, кидки смерті, концентрація — план реалізації

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** рушій бою виконує 15 станів 5e, рятівні кидки 5e (перевага/перешкода, автопровал, майстерність), кидки смерті й концентрацію; ДМ накладає стани вручну. HOMM5 за замовчуванням працює без жодної зміни.

**Architecture:** нові секції `rules` (default = вимкнено). Стани 5e — реєстр у коді, що розгортає стан у наявні маркери (`skip_action`, `immobilized`, …) і прапорці `abilityEffects`, які вже читає `collectModifiers`. Рятівні кидки — одна функція `rollSave`. Наслідки шкоди — один хелпер `applyDamageConsequences` після кожного примітиву шкоди.

**Tech Stack:** TypeScript strict, Zod 4, Vitest, Next.js route handlers (`runBattleMutation`), TanStack Query, React 19.

**Spec:** `docs/archive/superpowers/specs/2026-10-22-constructor-stage4-5e-design.md` (розділ «4a. Дизайн»).

## Global Constraints

- Worktree `/Users/silentfox/Work/dnd-tracker-constructor`, гілка `feat/constructor`; основну папку `/Users/silentfox/Work/dnd-tracker` не чіпати. БД тільки `postgresql://postgres:postgres@localhost:54322/constructor`.
- **Нульова зміна поведінки HOMM5:** `rules = {}` і контент без нових ключів дають рівно ту саму поведінку. Наявні тести не редагувати (крім додавання нових `it`); будь-яке падіння наявного тесту — баг у новому коді.
- Міграцій немає (усе в JSON: `rules`, snapshot, `Spell.definition`).
- Бонуси й прапорці рушій читає лише через `collectModifiers`/`runAbilities`; `abilities` — лише через `lib/utils/abilities/read.ts`.
- Будь-що, що пише `battle_participants.snapshot`, пише й `snapshotHash` (через `saveBattle` у пайплайні — нові мутації йдуть тільки через `runBattleMutation`).
- Компоненти не імпортують `@/lib/api/*`; запити — `lib/api/battles.ts`, хуки — `lib/hooks/battles`. Діалоги — `ResponsiveDialog hud`. Без `console.log`, без `any`.
- Тексти UI й логів — українською; ідентифікатори — англійською. Коментарі мінімальні (лише неочевидне «чому»).
- ESLint: `padding-line-between-statements` (порожній рядок навколо `const`/`if`/`return`), `simple-import-sort`, `import/no-cycle`. Після правок — `pnpm lint --fix` на змінених файлах.
- Тести під час роботи: `pnpm test:related <files>` або `pnpm test:run <file>`; повний `pnpm test:run` — лише наприкінці частини (задача 10).
- Коміти: `feat(constructor): …`/`test(constructor): …`, трейлер `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. `.superpowers/` ніколи не комітити.

## Review Focus

1. **Стара HOMM-поведінка в тих самих функціях:** `applyCondition` з наявним ключем (`skip_action`, `no_reaction`) і `rollSave` без нових прапорців мають давати байт-у-байт той самий `ActiveEffect` і той самий лог, що й `rollSavingThrow`. Тести-«якорі» — задачі 2 і 3.
2. **Перевага + перешкода одночасно** на рятівному кидку (джерела з обох боків) → звичайний кидок; `presetRoll` від клієнта + перевага → другий кубик кидає сервер, береться більший. Задача 3.
3. **Той самий стан із двох джерел** (два вороги повалили) → два ефекти; зняття ДМ прибирає всі ефекти цього ключа; імунітет до стану блокує обидва. Задачі 2 і 8.
4. **Концентрація з кількома цілями й зоною:** провал кидка знімає ефекти на всіх цілях і робить небезпечні клітинки зони неактивними; новий каст з концентрацією знімає попередній. Задача 7.
5. **Усі герої на 0 HP з кидками смерті** — бій лишається коректним: перемога/поразка рахується як зараз (непритомні вважаються вибулими), хід не зациклюється, «союзники встають після перемоги» працює. Задача 6.

---

## Карта файлів

| Файл | Відповідальність |
|---|---|
| `lib/utils/rules/schema.ts`, `defaults.ts`, `registry.ts` (мод.) | секції `saves`, `deathSaves`, `concentration`, `conditions` |
| `components/rules/sections/{Saves,DeathSaves,Concentration,Conditions}Section.tsx`, `components/rules/RulesForm.tsx` (мод.) | вкладки правил |
| `lib/utils/battle/conditions/registry.ts` (нов.) | `CONDITION_5E_KEYS`, `CONDITION_5E_REGISTRY`, `expandCondition5e`, `exhaustionEffects` |
| `lib/utils/battle/conditions/query.ts` (нов.) | `conditionsOf(p)`, `hasCondition(p, key)`, `exhaustionLevel(p)`, `conditionSourceIds(p, key)` |
| `lib/utils/abilities/schema/kinds.ts`, `effects.ts`, `registry/labels.ts` (мод.) | нові ключі станів, прапорці, стат `savingThrow` |
| `lib/utils/abilities/registry/effects/state.ts` (мод.) | `applyCondition` для 5e-ключів, `saveEnds`, виснаження |
| `lib/utils/battle/saves/roll-save.ts` (нов.) | `saveRollMode`, `rollSave` |
| `lib/utils/battle/saves/save-ends.ts` (нов.) | повторні рятівні кидки наприкінці ходу |
| `lib/utils/battle/attack/*`, `grid/path.ts`, `spell/spell-targeting.ts` (мод.) | `proneDefense`, `autoCritAdjacent`, наляканий/зачарований |
| `lib/utils/battle/damage/consequences.ts` (нов.) | `applyDamageConsequences` |
| `lib/utils/battle/death-saves/*` (нов.) | стан кидків смерті, кидок у черзі ходу, лікування |
| `lib/utils/battle/concentration/*` (нов.) | старт, перевірка, зняття концентрації |
| `app/api/campaigns/[id]/battles/[battleId]/conditions/{route,conditions-mutation}.ts` (нов.) | ручні стани ДМ |
| `lib/api/battles.ts`, `lib/hooks/battles/useBattles.ts`, `lib/hooks/battle/*` (мод.) | клієнт ручних станів |
| `components/battle/dm/ConditionsDialog.tsx` (нов.), `DmParticipantRow.tsx` (мод.), картка учасника (мод.) | UI станів і кидків смерті |

---

### Task 1: Секції правил 4a

**Files:**
- Modify: `lib/utils/rules/schema.ts`, `lib/utils/rules/registry.ts`, `lib/utils/rules/defaults.ts` (якщо `DEFAULT_RULES` будується вручну — додати секції; якщо `RulesetSchema.parse({})` — нічого)
- Create: `components/rules/sections/SavesSection.tsx`, `DeathSavesSection.tsx`, `ConcentrationSection.tsx`, `ConditionsSection.tsx`
- Modify: `components/rules/RulesForm.tsx` (`SECTIONS`)
- Test: `lib/utils/rules/__tests__/schema-4a.test.ts`

**Interfaces:**
- Produces: `Ruleset["saves"] = { proficiency: boolean }`, `Ruleset["deathSaves"] = { enabled: boolean; unitsDieAtZero: boolean }`, `Ruleset["concentration"] = { enabled: boolean; dcCap: number | null }`, `Ruleset["conditions"] = { enabled: boolean; exhaustion: "2014" | "2024" }`.

- [ ] **Step 1: Failing test**

```ts
import { describe, expect, it } from "vitest";

import { mergeRules, parseRules, RulesetPatchSchema } from "@/lib/utils/rules/schema";

describe("rules 4a sections", () => {
  it("defaults keep 5e mechanics off", () => {
    const r = parseRules({});

    expect(r.saves).toEqual({ proficiency: false });
    expect(r.deathSaves).toEqual({ enabled: false, unitsDieAtZero: true });
    expect(r.concentration).toEqual({ enabled: false, dcCap: null });
    expect(r.conditions).toEqual({ enabled: false, exhaustion: "2014" });
  });

  it("invalid section falls back to defaults, others survive", () => {
    const r = parseRules({ conditions: { exhaustion: "1999" }, deathSaves: { enabled: true } });

    expect(r.conditions.exhaustion).toBe("2014");
    expect(r.deathSaves.enabled).toBe(true);
  });

  it("patch merges and validates dcCap", () => {
    const base = parseRules({});

    expect(RulesetPatchSchema.safeParse({ concentration: { dcCap: 30 } }).success).toBe(true);
    expect(RulesetPatchSchema.safeParse({ concentration: { dcCap: 5 } }).success).toBe(false);

    const merged = mergeRules(base, { concentration: { enabled: true, dcCap: 30 } });

    expect(merged.ok && merged.rules.concentration).toEqual({ enabled: true, dcCap: 30 });
  });
});
```

- [ ] **Step 2:** `pnpm test:run lib/utils/rules/__tests__/schema-4a.test.ts` → FAIL (`saves` undefined).

- [ ] **Step 3: Implementation.** У `sections` (schema.ts) додати:

```ts
  saves: z.strictObject({ proficiency: z.boolean().default(false) }),
  deathSaves: z.strictObject({ enabled: z.boolean().default(false), unitsDieAtZero: z.boolean().default(true) }),
  concentration: z.strictObject({ enabled: z.boolean().default(false), dcCap: z.number().int().min(10).max(99).nullable().default(null) }),
  conditions: z.strictObject({ enabled: z.boolean().default(false), exhaustion: z.enum(["2014", "2024"]).default("2014") }),
```

Додати чотири ключі в `RulesetSchema` (`.prefault({})`) і в `RulesetPatchSchema` (`patchSection(k).optional()`). У `MECHANIC_REGISTRY`:

```ts
  saves: { label: "Рятівні кидки", description: "Майстерність у рятівних кидках героя (з листа персонажа). Перевага, перешкода й автопровал приходять від станів і вмінь завжди." },
  deathSaves: { label: "Кидки смерті", description: "Герой на 0 HP кидає d20 у свою чергу: 3 успіхи — стабільний, 3 провали — смерть, 20 — 1 HP. Юніти на 0 HP помирають." },
  concentration: { label: "Концентрація", description: "Заклинання з концентрацією: одне на кастера; шкода вимагає рятівного кидка Витривалості СК max(10, ½ шкоди)." },
  conditions: { label: "Стани 5e", description: "Меню станів 5e для ДМ у бою і група станів 5e в редакторі вмінь; таблиця виснаження 2014 або 2024." },
```

Секції UI — за зразком `components/rules/sections/MoraleSection.tsx` (`<RulesSection mechanic="…">`, `form.set("…", {...})`): перемикачі для boolean; `dcCap` — перемикач «Межа СК 30 (2024)» (`null` ↔ `30`); `exhaustion` — `HudChipTabs` або select «2014 / 2024». `unitsDieAtZero` показувати лише при `deathSaves.enabled`. Додати в `SECTIONS`.

- [ ] **Step 4:** тест PASS; `pnpm test:related lib/utils/rules/schema.ts lib/utils/rules/registry.ts` — зелено (зокрема наявні тести правил і бандла шаблонів).
- [ ] **Step 5: Commit** `feat(constructor): 4a rules sections (saves, death saves, concentration, conditions)`.

---

### Task 2: Реєстр станів 5e, нові прапорці, `applyCondition`

**Files:**
- Create: `lib/utils/battle/conditions/registry.ts`, `lib/utils/battle/conditions/query.ts`, `lib/utils/battle/conditions/apply.ts`, `lib/utils/battle/conditions/index.ts`
- Modify: `lib/utils/abilities/schema/kinds.ts`, `lib/utils/abilities/schema/effects.ts`, `lib/utils/abilities/registry/labels.ts`, `lib/utils/abilities/registry/effects/state.ts`, `types/battle.ts` (`ActiveEffect`)
- Modify (редактор): компонент вибору стану в `components/abilities` (знайти `CONDITION_LABELS`/`CONDITION_KEYS` у `components/abilities/**`) — 5e-стани окремою групою «Стани 5e» і поля `levels`/`saveEnds`
- Test: `lib/utils/battle/conditions/__tests__/registry.test.ts`, `lib/utils/abilities/registry/__tests__/apply-condition-5e.test.ts`

**Interfaces:**
- Produces:
  - `CONDITION_5E_KEYS = ["blinded","charmed","deafened","frightened","grappled","incapacitated","invisible","paralyzed","petrified","poisoned","prone","restrained","stunned","unconscious","exhaustion"] as const`; `type Condition5eKey`.
  - `type AnyConditionKey = (typeof CONDITION_KEYS)[number] | Condition5eKey`.
  - `expandCondition5e(key: Condition5eKey, opts: { exhaustion: "2014" | "2024"; level?: number }): { markers: ActiveEffect["effects"]; flags: StaticEffect[] }`.
  - `exhaustionEffects(level: number, variant: "2014" | "2024"): StaticEffect[]`.
  - `lib/utils/battle/conditions/apply.ts`: `applyCondition5e(ps: BattleParticipant[], targetId: string, opts: { key: Condition5eKey; rounds: number; permanent?: boolean; levels?: number; saveEnds?: { ability: AbilityKey; dc: number }; source: ActiveEffect["source"]; sourceName: string; timedKey: string; round: number; rules?: Ruleset }): { participants: BattleParticipant[]; messages: string[]; blocked: boolean }` — ядро 5e-накладання (імунітет, розгортання, виснаження, `no_reaction`, недієздатність → концентрація в задачі 7); `applyCondition` (5e-гілка) і мутація ДМ (задача 8) викликають саме його.
  - `query.ts`: `hasCondition(p, key: Condition5eKey): boolean` (маркер `key` у будь-якому `activeEffects[].effects`), `conditionSourceIds(p, key): string[]` (`source.participantId` ефектів з цим маркером), `exhaustionLevel(p): number` (сума `value` маркерів `exhaustion`, макс. 6).
  - Нові прапорці (`FlagSchema`): `saveAdvantage {abilities: AbilityKey[] | "all"; vsSpells?: boolean}`, `saveDisadvantage {abilities: AbilityKey[] | "all"}`, `autoFailSave {abilities: AbilityKey[]}`, `saveProficiency {abilities: AbilityKey[]}`, `autoCritAdjacent {}`, `proneDefense {}`.
  - `DYNAMIC_STATS` + `"savingThrow"`; `TIMED_STATS` + `"savingThrow"`.
  - `ActiveEffect` нові необов'язкові поля: `saveEnds?: { ability: AbilityKey; dc: number }`, `concentrationOf?: { casterId: string; castId: string }`, `concentration?: { castId: string; spellName: string }`, `exhaustionHpHalved?: number` (скільки HP зняли з `maxHp`).
  - `ApplyConditionSchema.condition: z.enum([...CONDITION_KEYS, ...CONDITION_5E_KEYS])`, нові поля `levels?: 1–6`, `saveEnds?: { ability: AbilityKey }`.

- [ ] **Step 1: Failing tests** — реєстр:

```ts
import { describe, expect, it } from "vitest";

import { expandCondition5e, exhaustionEffects } from "@/lib/utils/battle/conditions";

const types = (m: { type: string }[]) => m.map((x) => x.type).sort();

describe("CONDITION_5E_REGISTRY", () => {
  it("paralyzed implies incapacitated and immobile", () => {
    const { markers, flags } = expandCondition5e("paralyzed", { exhaustion: "2014" });

    expect(types(markers)).toEqual(["immobilized", "incapacitated", "no_bonus_action", "no_reaction", "paralyzed", "skip_action"].sort());
    expect(markers.find((m) => m.type === "skip_action")?.value).toBe(100);
    expect(flags).toEqual(expect.arrayContaining([
      expect.objectContaining({ kind: "flag", flag: "autoFailSave", abilities: ["strength", "dexterity"] }),
      expect.objectContaining({ kind: "flag", flag: "advantageForAttackers" }),
      expect.objectContaining({ kind: "flag", flag: "autoCritAdjacent" }),
    ]));
  });

  it("unconscious implies prone", () => {
    expect(types(expandCondition5e("unconscious", { exhaustion: "2014" }).markers)).toContain("prone");
  });

  it("deafened is a bare marker", () => {
    expect(expandCondition5e("deafened", { exhaustion: "2014" })).toEqual({ markers: [{ type: "deafened", value: 1 }], flags: [] });
  });

  it("grappled: 2024 adds disadvantage, 2014 does not", () => {
    expect(expandCondition5e("grappled", { exhaustion: "2014" }).flags).toEqual([]);
    expect(expandCondition5e("grappled", { exhaustion: "2024" }).flags).toEqual([expect.objectContaining({ flag: "disadvantage" })]);
  });

  it("exhaustion 2014 table", () => {
    expect(exhaustionEffects(1, "2014")).toEqual([]);
    expect(exhaustionEffects(2, "2014")).toEqual([expect.objectContaining({ kind: "modifyStat", stat: "speed", percent: -50 })]);
    expect(exhaustionEffects(3, "2014").map((e) => ("flag" in e ? e.flag : e.kind))).toEqual(expect.arrayContaining(["disadvantage", "saveDisadvantage"]));
    expect(exhaustionEffects(5, "2014")).toEqual(expect.arrayContaining([expect.objectContaining({ stat: "speed", percent: -100 })]));
  });

  it("exhaustion 2024: -2 per level to attacks and saves, -5 ft speed per level", () => {
    expect(exhaustionEffects(3, "2024")).toEqual(expect.arrayContaining([
      expect.objectContaining({ stat: "attackBonus", flat: -6 }),
      expect.objectContaining({ stat: "savingThrow", flat: -6 }),
      expect.objectContaining({ stat: "speed", flat: -15 }),
    ]));
  });
});
```

`applyCondition` (у стилі `lib/utils/abilities/registry/__tests__/immunity-effects.test.ts`, фікстури `makeParticipant`, `resolved` з `lib/utils/abilities/__tests__/fixtures.ts`):
- 5e-ключ `stunned` на ціль → один `ActiveEffect` з `type: "condition"`, `name: "Приголомшений"`, маркери з реєстру, `abilityEffects` = прапорці; `actionFlags.hasUsedReaction === true` (бо `no_reaction` серед маркерів).
- наявний ключ `skip_action` з `percent: 40` → той самий об'єкт, що й до змін (зробити знімок `toEqual` з явним очікуваним об'єктом: `effects: [{ type: "skip_action", value: 40 }]`, без `abilityEffects`).
- `conditionImmunity { conditions: ["paralyzed"] }` блокує `paralyzed`, але не `stunned`; `conditions: "all"` блокує все.
- `exhaustion` з `levels: 2` двічі → `exhaustionLevel(p) === 4`; при варіанті 2014 і переході на рівень ≥ 4 `maxHp` зменшується вдвічі (`Math.ceil(maxHp/2)` лишається), `currentHp = min(currentHp, maxHp)`, `exhaustionHpHalved` = знята кількість; рівень 6 → `combatStats.status === CombatStatus.DEAD`, повідомлення «помирає від виснаження».
- `saveEnds: { ability: "wisdom" }` → в ефекті `saveEnds: { ability: "wisdom", dc: <СК власника вміння> }` (СК = `spellSaveDc(owner)` з `@/lib/utils/battle/spell/power`).
- Два різні вміння накладають `prone` → два ефекти (різні `timedKey`).

- [ ] **Step 2:** обидва тести FAIL.

- [ ] **Step 3: Implementation.**

`registry.ts` (каркас; розписати всі 15 рядків за таблицею спека, підписи — українські):

```ts
import type { ConditionKey } from "@/lib/utils/abilities/schema/kinds";
import type { StaticEffect } from "@/lib/utils/abilities/schema";
import type { ActiveEffect } from "@/types/battle";

export const CONDITION_5E_KEYS = [
  "blinded", "charmed", "deafened", "frightened", "grappled", "incapacitated", "invisible",
  "paralyzed", "petrified", "poisoned", "prone", "restrained", "stunned", "unconscious", "exhaustion",
] as const;

export type Condition5eKey = (typeof CONDITION_5E_KEYS)[number];

type Variant = "2014" | "2024";

type Condition5eDef = {
  label: string;
  description: string;
  markers: ConditionKey[];
  flags: (variant: Variant) => StaticEffect[];
  implies?: Condition5eKey[];
};

const flag = <F extends Record<string, unknown>>(f: F) => ({ kind: "flag", ...f }) as StaticEffect;

const STR_DEX = ["strength", "dexterity"] as const;

const INCAPACITATED: ConditionKey[] = ["skip_action", "no_bonus_action", "no_reaction"];

export const CONDITION_5E_REGISTRY = {
  blinded: { label: "Засліплений", description: "…", markers: [], flags: () => [flag({ flag: "disadvantage" }), flag({ flag: "advantageForAttackers" })] },
  incapacitated: { label: "Недієздатний", description: "…", markers: INCAPACITATED, flags: () => [] },
  paralyzed: {
    label: "Паралізований", description: "…", markers: ["immobilized"], implies: ["incapacitated"],
    flags: () => [flag({ flag: "autoFailSave", abilities: [...STR_DEX] }), flag({ flag: "advantageForAttackers" }), flag({ flag: "autoCritAdjacent" })],
  },
  petrified: {
    label: "Скам'янілий", description: "…", markers: ["immobilized"], implies: ["incapacitated"],
    flags: () => [
      flag({ flag: "autoFailSave", abilities: [...STR_DEX] }), flag({ flag: "advantageForAttackers" }),
      flag({ flag: "resistance", damageType: "all", percent: 50 }), flag({ flag: "conditionImmunity", conditions: ["poisoned"] }),
    ],
  },
  prone: { label: "Повалений", description: "…", markers: [], flags: () => [flag({ flag: "disadvantage" }), flag({ flag: "proneDefense" })] },
  grappled: { label: "Схоплений", description: "…", markers: ["immobilized"], flags: (v) => (v === "2024" ? [flag({ flag: "disadvantage" })] : []) },
  // … charmed/frightened: markers [] і flags [] (рушій перевіряє джерело, задача 4); deafened: [] / [];
  // invisible: advantage {attackKind:"all"} + disadvantageForAttackers; poisoned: disadvantage;
  // restrained: immobilized + disadvantage + advantageForAttackers + saveDisadvantage ["dexterity"];
  // stunned: immobilized, implies incapacitated, autoFailSave STR/DEX, advantageForAttackers;
  // unconscious: immobilized, implies incapacitated + prone, autoFailSave STR/DEX, advantageForAttackers, autoCritAdjacent;
  // exhaustion: markers [], flags () => [] (ефекти рахує exhaustionEffects за рівнем).
} satisfies Record<Condition5eKey, Condition5eDef>;
```

Прапорець `disadvantage` для grappled 2024 у 5e діє на атаки по всіх, крім того, хто схопив; виняток для схоплювача не моделюємо (зафіксувати в описі стану).

`expandCondition5e(key, { exhaustion, level })`: обійти `key` + `implies` рекурсивно (без повторів); маркери = `[{ type: key, value: key === "exhaustion" ? level ?? 1 : 1 }]` + маркери кожного стану з `implies` як `{ type: implied, value: 1 }` + `markers` реєстру (`skip_action` → `value: 100`, решта `1`), без дублікатів за `type`; прапорці = конкатенація `flags(variant)`; для `exhaustion` — `exhaustionEffects(level, variant)`.

`exhaustionEffects`: 2014 — рівень ≥2: `{ kind: "modifyStat", stat: "speed", percent: -50 }` (≥5 замінюється на `percent: -100`), ≥3: `flag disadvantage` + `flag saveDisadvantage { abilities: "all" }`; рівень 4 (½ макс. HP) обробляє `applyCondition`, не прапорець. 2024 — `modifyStat attackBonus flat -2L`, `modifyStat savingThrow flat -2L`, `modifyStat speed flat -5L`. **Перед реалізацією перевірити**, чи `movementBudget` (`grid/path.ts:10`) рахує `speed` з `collectModifiers` для timed-ефектів; якщо ні — додати в `movementBudget` `statWithModifiers(ps, id, "speed")`-подібний розрахунок лише коли є маркер `exhaustion` (щоб HOMM-шлях не змінився), і покрити тестом.

`kinds.ts`: експорт `CONDITION_5E_KEYS` імпортувати не можна (цикл `abilities` ↔ `battle`) — **оголосити `CONDITION_5E_KEYS` у `lib/utils/abilities/schema/kinds.ts`**, а `lib/utils/battle/conditions/registry.ts` реекспортує його. Розширити `ConditionImmunityKey` і `conditionImmunity.conditions` enum: `[...CONDITION_KEYS, ...CONDITION_5E_KEYS, "fear", "berserk", "charm"]`. `labels.ts`: `CONDITION_LABELS` стає `Record<AnyConditionKey, string>` (5e-підписи з реєстру, малими літерами для лога: «приголомшений»), підписи нових прапорців і стату `savingThrow` («рятівні кидки»).

`state.ts` `applyCondition`: якщо `effect.condition` ∈ `CONDITION_5E_KEYS` — гілка 5e, що для кожної цілі викликає `applyCondition5e` (`conditions/apply.ts`); ядро `applyCondition5e` робить таке:

```ts
const variant = ctx.rules?.conditions.exhaustion ?? "2014";
const def = CONDITION_5E_REGISTRY[key];
const level = key === "exhaustion" ? effect.levels ?? 1 : undefined;
const { markers, flags } = expandCondition5e(key, { exhaustion: variant, level });
const owner = findParticipant(input.participants, input.ownerId);
upsertTimedEffect(p, {
  timedKey: `${ability.key}#${input.effectIndex}`, source: effectSource(owner, ability), name: def.label,
  type: "condition", rounds: effect.duration.rounds, stackable: key === "exhaustion",
  effects: markers, abilityEffects: flags.length ? flags : undefined, breakOnDamage: effect.breakOnDamage,
}, ctx.round)
```

Для `exhaustion` ефект стекається (`stackable: true`), бо рівні сумуються; після накладання перерахувати `exhaustionLevel`: ≥6 → `status: DEAD`; варіант 2014 і рівень ≥4 і ще немає ефекту з `exhaustionHpHalved` → зменшити `maxHp`, записати `exhaustionHpHalved` у щойно доданий ефект. `saveEnds` → `{ ability, dc: owner ? spellSaveDc(owner) : 10 }`, записати в ефект після `upsertTimedEffect` (додати поле `saveEnds` у `TimedEffectInput` і в об'єкт `effect` у `upsertTimedEffect`, разом із `concentrationOf`). Якщо серед маркерів є `no_reaction` — `hasUsedReaction: true`, як для старого ключа. Імунітет — `immuneTo(ps, id, key)`. Повідомлення: `⛓ ${ability.name}: ${names} — ${def.label.toLowerCase()} (${rounds} р.)`. Стара гілка (наявні ключі) — без змін.

Коли виснаження знімається (`cleanse`, ДМ, тривалість), `maxHp` повертається: у місці видалення ефектів (`turn/effects.ts` `decreaseEffectDurations`, `cleanse` у `state.ts`, мутація ДМ у задачі 8) викликати `restoreExhaustionHp(p, removed: ActiveEffect[])` з `query.ts` (додає `exhaustionHpHalved` назад до `maxHp`). Тест на це — у `apply-condition-5e.test.ts` (cleanse з `includeConditions`).

Редактор: у списку станів `applyCondition` — дві групи (наявні механічні; «Стани 5e» з реєстру), для `exhaustion` — поле «Рівні» 1–6, для всіх 5e — необов'язкове «Рятівний кидок наприкінці ходу» (характеристика). Нові прапорці — у редакторі прапорців з підписами (за зразком наявних).

- [ ] **Step 4:** нові тести PASS; `pnpm test:related lib/utils/abilities/registry/effects/state.ts lib/utils/abilities/schema/effects.ts lib/utils/abilities/schema/kinds.ts lib/utils/abilities/registry/labels.ts lib/utils/abilities/engine/effects/timed-effects.ts` — зелено. Перевірити, що JSON-схема MCP/OpenAPI для abilities лишається в межах (`lib/server/content/__tests__` і `lib/ai/tools/__tests__` проходять — ліміт 24K на схему інструмента).
- [ ] **Step 5: Commit** `feat(constructor): 5e conditions registry and applyCondition`.

---

### Task 3: `rollSave` і повторні рятівні кидки

**Files:**
- Create: `lib/utils/battle/saves/roll-save.ts`, `lib/utils/battle/saves/save-ends.ts`, `lib/utils/battle/saves/index.ts`
- Modify: `lib/utils/battle/spell/power.ts` (видалити `rollSavingThrow`), `lib/utils/battle/spell/cast/outcome.ts`, `lib/utils/battle/maneuvers/fire-burst.ts`, `lib/utils/battle/turn/start-end.ts` (кінець ходу → `save-ends`), тип `actionDetails.savingThrows` (`types/battle.ts:501`) — додати необов'язкові `mode`, `rolls`, `autoFail`
- Modify tests: `lib/utils/battle/spell/__tests__/saving-throw.test.ts` — **лише імпорт** на нове API, якщо стара функція видаляється (очікування не змінювати)
- Test: `lib/utils/battle/saves/__tests__/roll-save.test.ts`, `save-ends.test.ts`

**Interfaces:**
- Consumes: прапорці й стат з задачі 2; `Ruleset["saves"]`.
- Produces:

```ts
export type SaveRollMode = "advantage" | "disadvantage" | "normal";

export function saveRollMode(target: BattleParticipant, ability: AbilityKey, participants: BattleParticipant[], opts?: { vsSpell?: boolean }): { mode: SaveRollMode; autoFail: boolean; reasons: { advantage: string[]; disadvantage: string[] } };

export function rollSave(input: {
  target: BattleParticipant; ability: AbilityKey; dc: number; participants: BattleParticipant[];
  rules?: Ruleset; rng: () => number; presetRoll?: number; vsSpell?: boolean;
}): { roll: number; rolls: number[]; mod: number; bonus: number; total: number; success: boolean; mode: SaveRollMode; autoFail: boolean };

export function rollSaveEnds(p: BattleParticipant, participants: BattleParticipant[], rules: Ruleset | undefined, rng: () => number): { participant: BattleParticipant; messages: string[] };
```

`bonus` = майстерність + `savingThrow` модифікатори; `mod` = модифікатор характеристики; `total = roll + mod + bonus`. `saveRollMode` — спільна для клієнта (майстер заклинань може показати режим) і сервера, без `rng`.

- [ ] **Step 1: Failing tests** (`roll-save.test.ts`, фікстура `makeParticipant` + `seq`):
- без прапорців, `rules` default: `rollSave` = `rollSavingThrow` для тих самих входів (`roll`, `total`, `success`), `mode: "normal"`, `rolls.length === 1` — якір HOMM.
- `autoFailSave ["dexterity"]` → `success: false`, `autoFail: true`, `rolls: []`, `rng` не викликається.
- `saveAdvantage "all"` → два кубики, береться більший; `saveDisadvantage ["wisdom"]` на Мудр → менший; обидва → `normal`, один кубик.
- `saveAdvantage { abilities: "all", vsSpells: true }`: з `vsSpell: true` — перевага, без — ні.
- `presetRoll: 3` + перевага, rng дає 15 → `rolls: [3, 15]`, `roll: 15`.
- майстерність: `rules.saves.proficiency: true` + герой з `savingThrows: { wisdom: true }` (у snapshot — див. нижче) → `bonus === proficiencyBonus`; при `false` — 0. Прапорець `saveProficiency ["wisdom"]` дає майстерність незалежно від `rules`.
- `modifyStat savingThrow flat 2` (timed) → `bonus` +2.

`save-ends.test.ts`: ефект `paralyzed` з `saveEnds { ability: "wisdom", dc: 14 }`; кидок 14+ → ефект знято, повідомлення «звільняється від стану»; провал → лишається; два ефекти з `saveEnds` → два окремі кидки.

- [ ] **Step 2:** FAIL.

- [ ] **Step 3: Implementation.**
- Майстерність героя в snapshot: у `createBattleParticipantFromCharacter` (`lib/utils/battle/participant/from-character.ts`) додати в `abilities` поле `saveProficiencies: AbilityKey[]` з `Character.savingThrows` (ключі зі значенням `true`, лише валідні `ABILITY_KEYS`); тип — у `types/battle.ts` (`abilities` учасника), необов'язкове. Юніти — без поля. `rollSave` додає майстерність, якщо (`rules?.saves.proficiency` і ability ∈ `saveProficiencies`) або є прапорець `saveProficiency` з цією характеристикою. **Перевірити**: якщо якийсь тест порівнює повний snapshot героя з `toEqual`, а поле додається завжди — додавати поле лише коли масив непорожній.
- `saveRollMode`: `collectModifiers(withSelf(participants, target), id, { flag: "saveAdvantage" }).entries` (і `saveDisadvantage`, `autoFailSave`) — фільтр за `abilities === "all" || abilities.includes(ability)` і `vsSpells` (лише коли `opts.vsSpell`). Підписи джерел — `label` записів, як у `rollModeReasons`.
- `bonus`: `collectModifiers(..., { stat: "savingThrow" }).flat` + майстерність (`target.abilities.proficiencyBonus`).
- `outcome.ts`: `rollSave({ target, ability: saveAbility, dc, participants: flow.ps, rules: flow.ctx.rules, rng: state.rng, presetRoll, vsSpell: true })`; лог — як зараз, з додатками лише коли `mode !== "normal"` (` (перевага: 7/15)`) чи `autoFail` («автопровал»), щоб HOMM-рядок лишився ідентичним. `state.saves.push` — додати `mode`/`rolls`/`autoFail` лише коли вони не дефолтні.
- `fire-burst.ts`: `rollSave({ target: t, ability: "dexterity", dc, participants: input.participants, rules: input.rules, rng: input.rng })` (якщо в `input` немає `participants`/`rules` — прокинути з викликача; лог без змін для HOMM).
- `rollSaveEnds`: для кожного `activeEffects` з `saveEnds` — `rollSave(…, dc: e.saveEnds.dc)`; успіх → видалити ефект (через ту саму функцію видалення, що й тривалість, з `restoreExhaustionHp`); повідомлення `🎲 ${name}: рятівний кидок ${label} ${total} проти СК ${dc} — звільняється від стану «${e.name}»` / `— стан «${e.name}» лишається`. Виклик — у кінці ходу учасника, там, де зменшуються тривалості (знайти в `advanceTurn`/`processEndOfTurn` місце, яке викликає `decreaseEffectDurations` для поточного учасника; передати `rules` і `rng`). Якщо учасник без `saveEnds`-ефектів — функція не викликає `rng` (детермінізм наявних тестів).

- [ ] **Step 4:** PASS + `pnpm test:related lib/utils/battle/spell/power.ts lib/utils/battle/spell/cast/outcome.ts lib/utils/battle/maneuvers/fire-burst.ts lib/utils/battle/turn/start-end.ts lib/utils/battle/participant/from-character.ts` — зелено, наявні очікування не змінені.
- [ ] **Step 5: Commit** `feat(constructor): 5e saving throws (rollSave, save-ends)`.

---

### Task 4: Стани в атаках, заклинаннях і русі

**Files:**
- Modify: `lib/utils/battle/attack/bonus.ts` (`rollModeReasons`), `lib/utils/battle/attack/process/run.ts` (крит з 5 фт), `lib/utils/battle/attack-phase/request.ts` (`validateAttackRequest`), `lib/utils/battle/spell/spell-targeting.ts` (`resolveSpellTargets`), `lib/utils/battle/grid/path.ts` + `app/api/campaigns/[id]/battles/[battleId]/move/move-mutation.ts`
- Test: `lib/utils/battle/conditions/__tests__/attack-conditions.test.ts`, `move-conditions.test.ts`

**Interfaces:**
- Consumes: `hasCondition`, `conditionSourceIds` (задача 2); прапорці `proneDefense`, `autoCritAdjacent`.
- Produces: `isAdjacent(a: BattleParticipant, b: BattleParticipant): boolean` у `lib/utils/battle/grid/occupancy.ts` (= `footprintDistance(cellsOf(a), cellsOf(b)) <= 1`; якщо хтось не на мапі — `attack.type === MELEE` вважається суміжною атакою, дальня — ні); `frightenedBlocksMove(map, participants, mover, to): boolean`.

- [ ] **Step 1: Failing tests:**
- ціль з `prone`: ближня атака суміжного атакувальника → `rollModeReasons(...).advantage` містить «Повалений», дальня атака здалеку → `disadvantage` містить «Повалений»; без мапи: ближня → перевага, дальня → перешкода.
- ціль `paralyzed`, суміжний атакувальник, влучання (кидок вище КЗ, не крит) → `isCritical === true` у результаті атаки; несуміжний (дальній) → не крит.
- атакувальник `poisoned` → перешкода; атакувальник `invisible` → перевага; ціль `invisible` → перешкода; перевага + перешкода → `forcedRollMode` = `normal`.
- `frightened` (джерело X живе) → перешкода на атаки; джерело мертве → без перешкоди.
- `charmed` (джерело X) → `validateAttackRequest` з ціллю X кидає `BattleRuleError` «не може атакувати того, хто його зачарував»; `resolveSpellTargets` для ворожого заклинання на X → `{ ok: false }`; на іншу ціль — ок.
- рух `frightened`: клітинка, що зменшує відстань до живого джерела, — недосяжна в `move-mutation` (помилка), на тій самій відстані або далі — дозволена.
- Регрес: учасник без 5e-станів — `rollModeReasons` дає ті самі масиви, що й до змін.

- [ ] **Step 2:** FAIL.
- [ ] **Step 3: Implementation.**
- `rollModeReasons`: після наявних джерел додати (тільки якщо `opts.targetId`): прапорці `proneDefense` цілі → якщо атака суміжна (`isAdjacent` атакувальника й цілі, або ближня без мапи) — в `advantage`, інакше — в `disadvantage`, підпис — `label` запису. Наляканий: якщо `hasCondition(attacker, "frightened")` і хоч одне `conditionSourceIds` живе (`isActive`) — `disadvantage.push(<назва ефекту>)`. `rollModeReasons` отримує `participants`, тож пошук джерела — `findParticipant`.
- Крит з 5 фт: у `run.ts` біля `isHit` (`:118`): `const adjacentCrit = isHit && !attackRoll.isCritical && collectModifiers(ps, targetId, { flag: "autoCritAdjacent" }).entries.length > 0 && isAdjacent(attacker, target)`; далі використовувати `isCritical || adjacentCrit` скрізь, де зараз `attackRoll.isCritical` впливає на шкоду/ефекти/лог (пройти всі використання в `run.ts` і `hit.ts`). Лог: «влучання впритул — критичне».
- `validateAttackRequest`: для кожної цілі — якщо атакувальник `charmed` і ціль ∈ `conditionSourceIds(attacker, "charmed")` → `BattleRuleError`. Те саме в `resolveSpellTargets` для заклинань із ворожим таргетингом (`enemy`, `area side=enemy`, `template side=enemy`, `allEnemies`): ціль-джерело викидається з `targetIds`, а якщо цілей не лишилось — `{ ok: false, error }`.
- Рух: `frightenedBlocksMove` — для кожного живого джерела `frightened` мувера: `footprintDistance(cellsOf at to, cellsOf(source)) < footprintDistance(cellsOf(mover), cellsOf(source))` → заблоковано. Виклик у `move-mutation.ts` після перевірки `reachable`; підказка на клієнті не обов'язкова (сервер — джерело правди).

- [ ] **Step 4:** PASS + `pnpm test:related` на змінених файлах — зелено.
- [ ] **Step 5: Commit** `feat(constructor): 5e conditions in attacks, spell targeting and movement`.

---

### Task 5: `applyDamageConsequences` і юніти, що помирають на 0

**Files:**
- Create: `lib/utils/battle/damage/consequences.ts`
- Modify: усі місця шкоди — `lib/utils/battle/attack/process/hit.ts` (`applyDamageToTarget` ×2), `attack/process/miss.ts`, `lib/utils/battle/spell/cast/effects.ts` (`dealSpellDamage`), `lib/utils/battle/damage/resisted-ability-damage.ts`, `lib/utils/battle/grid/hazard.ts`, `lib/utils/abilities/registry/effects/hp.ts` (`applyDealDamage`), `lib/utils/battle/turn/start-end.ts` (DOT, `:86`)
- Test: `lib/utils/battle/damage/__tests__/consequences.test.ts`

**Interfaces:**
- Produces:

```ts
export function applyDamageConsequences(input: {
  before: BattleParticipant; after: BattleParticipant; amount: number; crit?: boolean;
  rules?: Ruleset; rng: () => number; participants: BattleParticipant[];
}): { participant: BattleParticipant; participants: BattleParticipant[]; messages: string[] };
```

`participants` повертається, бо втрата концентрації змінює інших учасників (задача 7). У цій задачі хелпер робить лише: (а) `deathSaves.enabled && unitsDieAtZero` і юніт (`basicInfo.sourceType === ParticipantSourceType.UNIT`) з `after.currentHp <= 0` → `status: DEAD`; (б) виклики-заглушки `deathSaveDamage` (задача 6) і `concentrationCheck` (задача 7) — **у цій задачі не створювати**, лише точка розширення всередині хелпера. Коли `rules` відсутні або всі три механіки вимкнено — повертає `{ participant: after, participants, messages: [] }` без виклику `rng`.

- [ ] **Step 1: Failing test:** вимкнені правила → `participant === after` (той самий об'єкт), `rng` не викликався; юніт на 0 HP при `deathSaves.enabled` → `DEAD`; герой — без змін (поки що); `unitsDieAtZero: false` → юніт лишається `UNCONSCIOUS`.
- [ ] **Step 2:** FAIL.
- [ ] **Step 3: Implementation.** Хелпер + виклик у кожному місці одразу після примітиву шкоди (`before` = учасник до шкоди, `amount` = шкода до обрізання на 0, після опорів; `crit` — лише в атаці). Там, де місце працює з `ActionFlow`, брати `flow.ctx.rules`, `flow.ctx.rng`, `flow.ps`; у DOT/hazard — `rules`, `rng` з `processStartOfTurn`. Повідомлення хелпера додавати в наявний масив повідомлень цього місця. Якщо `rng` у місці відсутній (напр. `applyDamageToTarget` у `hit.ts`) — прокинути з `flow.ctx.rng`. Якщо після хелпера учасник `DEAD` — наявна логіка `settleDowned`/`resolveDowned` має отримати вже оновленого учасника (перевірити порядок у `hit.ts`).
- [ ] **Step 4:** PASS + `pnpm test:related` на змінених файлах — зелено (HOMM-тести атак/заклинань/DOT/зон без змін).
- [ ] **Step 5: Commit** `feat(constructor): damage consequences hook, units die at zero`.

---

### Task 6: Кидки смерті

**Files:**
- Create: `lib/utils/battle/death-saves/index.ts` (`deathSaveDamage`, `rollDeathSave`, `clearDeathSaves`, `startDying`)
- Modify: `lib/utils/battle/damage/consequences.ts`, `lib/utils/battle/turn/start-end.ts` (`processEndOfTurn` / `advanceTurn` — цикл пропуску), лікування (`lib/utils/abilities/engine/effects/hp.ts` `applyRawHeal` або `registry/effects/hp.ts` `applyHeal`, `turn/effects.ts` `applyHOTEffects`), `types/battle.ts` (`battleData.deathSaves?: { successes: number; failures: number; stable: boolean }`), `lib/utils/battle/pipeline/client-delta.ts` (якщо `PATCHABLE_PARTICIPANT_FIELDS` не покриває `battleData` — snapshot уже змінюється, перевірити, що delta містить учасника)
- Modify UI: картка учасника в бою (знайти компонент, що показує HP/статус учасника в `components/battle/scene` / `components/battle/participants`) — три кружечки успіхів/провалів, коли `battleData.deathSaves` є
- Test: `lib/utils/battle/death-saves/__tests__/death-saves.test.ts`

**Interfaces:**
- Consumes: `applyDamageConsequences` (задача 5), `applyCondition`-логіка 5e (для стану `unconscious` використати `expandCondition5e("unconscious", …)` + `upsertTimedEffect` з `rounds: 99`, `timedKey: "death-saves:unconscious"`, `permanent: true`).
- Produces:

```ts
export function startDying(p: BattleParticipant, rules: Ruleset): BattleParticipant;        // стан unconscious + deathSaves {0,0,false}
export function deathSaveDamage(p: BattleParticipant, crit: boolean): BattleParticipant;     // +1/+2 провали, stable=false; 3 → DEAD
export function rollDeathSave(p: BattleParticipant, rng: () => number): { participant: BattleParticipant; message: string };
export function clearDeathSaves(p: BattleParticipant): BattleParticipant;                     // знімає стан і лічильники
```

- [ ] **Step 1: Failing tests:**
- герой, `deathSaves.enabled`, шкода до 0 → `UNCONSCIOUS`, стан `unconscious` (маркер), `deathSaves = {0,0,false}`.
- масивна шкода: `maxHp 20`, `currentHp 5`, шкода 25 (залишок 20 ≥ 20) → `DEAD`; шкода 24 → `UNCONSCIOUS`.
- шкода по герою на 0 HP: +1 провал; крит → +2; 3 провали → `DEAD`; шкода скидає `stable`.
- `rollDeathSave`: 10 → успіх; 9 → провал; 1 → два провали; 20 → `currentHp 1`, статус `ACTIVE`, стан знято, лічильники прибрано; 3 успіхи → `stable: true` (далі кидків немає).
- лікування героя на 0 HP → HP > 0, `ACTIVE`, `clearDeathSaves`.
- черга ходу: `advanceTurn` з непритомним нестабільним героєм між поточним і наступним → герой кидає (повідомлення в результаті), хід переходить до наступного; стабільний — без кидка; вимкнені правила — `rng` не викликається, результат ідентичний поточному.
- усі герої на 0 HP → бій завершується тією самою перевіркою перемоги/поразки, що й зараз (знайти функцію перевірки перемоги в `turn/victory.ts` і додати тест, що непритомні з `deathSaves` вважаються вибулими).
- `rules.deathSaves.enabled: false` → шкода до 0 дає поточну поведінку (без `deathSaves`, без стану).

- [ ] **Step 2:** FAIL.
- [ ] **Step 3: Implementation.**
- У `applyDamageConsequences` для героя (`sourceType === CHARACTER`) при `deathSaves.enabled`: якщо `before.currentHp > 0` і `after.currentHp <= 0` → якщо `amount - before.currentHp - before.tempHp >= before.combatStats.maxHp` → `DEAD` (повідомлення «миттєва смерть від масивної шкоди»), інакше `startDying` (і статус `UNCONSCIOUS`, навіть якщо примітив поставив `DEAD` через HP < 0). Якщо `before.currentHp <= 0` і `amount > 0` → `deathSaveDamage(after, crit)`.
- Цикл пропуску в `processEndOfTurn`: функція зараз отримує `(currentTurnIndex, initiativeOrder, currentRound)` і повертає лише індекс. Додати необов'язкові `rules?`, `rng?`; коли `rules?.deathSaves.enabled` і учасник, якого пропускаємо, — непритомний герой з `deathSaves && !stable`, викликати `rollDeathSave` і повернути оновлених учасників (`participants?: BattleParticipant[]`, `messages?: string[]` у результаті). У викликачах (`advanceTurn`) застосувати повернуті зміни. Герой, що отримав 20 і прийшов до тями, у цьому проході ходу не отримує — він ходить у наступному раунді (зафіксувати в тесті).
- Лікування: у `applyRawHeal` (або у викликачах, якщо примітив не повинен знати про стани — вибрати одне місце, через яке проходять `heal`, `hot`, `raiseDead` не чіпати): якщо до лікування `deathSaves` є і HP стало > 0 → `clearDeathSaves`, статус `ACTIVE`.
- UI: у картці учасника на `UNCONSCIOUS` з `battleData.deathSaves` — рядок «Кидки смерті» з 3 зеленими і 3 червоними кружечками (CSS-змінні HUD), «Стабільний», якщо `stable`.

- [ ] **Step 4:** PASS + `pnpm test:related lib/utils/battle/turn/start-end.ts lib/utils/battle/damage/consequences.ts lib/utils/abilities/engine/effects/hp.ts lib/utils/battle/turn/victory.ts` — зелено.
- [ ] **Step 5: Commit** `feat(constructor): 5e death saves`.

---

### Task 7: Концентрація

**Files:**
- Create: `lib/utils/battle/concentration/index.ts` (`beginConcentration`, `tagConcentration`, `concentrationCheck`, `dropConcentration`, `isZoneConcentrationLive`)
- Modify: `lib/utils/spells/model/schema.ts` (`SpellDefinitionSchema.concentration?: boolean`), редактор заклинання (знайти форму `definition` у `components/spells/**` — перемикач «Концентрація»), `lib/utils/battle/spell/cast/index.ts`, `app/api/campaigns/[id]/battles/[battleId]/spell/spell-mutation.ts` (зони), `lib/utils/battle/spell/zone-hazard.ts`, `types/battle.ts` (`TerrainDamage.concentrationOf?: { casterId: string; castId: string }`), `lib/utils/battle/grid/hazard.ts` (`hazardUnder`/`hazardHit` ігнорують клітинку з неживою концентрацією), `lib/utils/battle/damage/consequences.ts`, `lib/utils/abilities/registry/effects/state.ts` (недієздатність знімає концентрацію)
- Test: `lib/utils/battle/concentration/__tests__/concentration.test.ts`

**Interfaces:**
- Consumes: `rollSave` (задача 3), `applyDamageConsequences` (задача 5), `hasCondition` (задача 2), поля `ActiveEffect.concentration`/`concentrationOf` (задача 2).
- Produces:

```ts
export function castIdFor(casterId: string, spellId: string, round: number, seq: number): string; // `${casterId}:${spellId}@${round}#${seq}`
export function beginConcentration(ps: BattleParticipant[], casterId: string, castId: string, spellName: string, rounds: number): { participants: BattleParticipant[]; messages: string[] }; // спершу dropConcentration
export function tagConcentration(before: BattleParticipant[], after: BattleParticipant[], tag: { casterId: string; castId: string }): BattleParticipant[]; // нові activeEffects (id, яких не було) отримують concentrationOf
export function concentrationCheck(input: { caster: BattleParticipant; damage: number; participants: BattleParticipant[]; rules: Ruleset; rng: () => number }): { participants: BattleParticipant[]; messages: string[] };
export function dropConcentration(ps: BattleParticipant[], casterId: string, reason: string): { participants: BattleParticipant[]; messages: string[] };
export function isZoneConcentrationLive(ps: BattleParticipant[], tag: { casterId: string; castId: string } | undefined): boolean;
```

- [ ] **Step 1: Failing tests:**
- каст заклинання з `concentration: true` при `rules.concentration.enabled` → кастер має ефект «Концентрація: <назва>» (`concentration.castId`), ефекти на двох цілях мають `concentrationOf` з тим самим `castId`; `enabled: false` → нічого з цього (і `ActiveEffect` цілей ідентичні поточним).
- шкода 30 по кастеру → СК 15; шкода 8 → СК 10; `dcCap: 30` і шкода 100 → СК 30, `null` → 50.
- провал → ефекти з `concentrationOf` зникають з обох цілей, ефект концентрації кастера зник, повідомлення «втрачає концентрацію на <назва>»; успіх → усе лишається.
- новий каст з концентрацією → попередні ефекти знято до нового.
- стан `incapacitated` (або `stunned`, що його має через `implies`) на кастері → концентрацію знято; 0 HP / смерть → знято.
- зона: клітинки небезпеки з `concentrationOf` після `dropConcentration` не завдають шкоди (`isZoneConcentrationLive === false`).
- тривалість ефекту концентрації = максимум `duration.rounds` серед ефектів заклинання (якщо ефектів із тривалістю немає — 10 раундів, тобто 1 хвилина).

- [ ] **Step 2:** FAIL.
- [ ] **Step 3: Implementation.**
- `castSpell` (`spell/cast/index.ts`): коли `rules?.concentration.enabled && spell.definition.concentration` — перед ефектами `beginConcentration`; після застосування ефектів — `tagConcentration(psBefore, flow.ps, tag)` (порівняння за `id` ефекту в межах кожного учасника, крім ефекту концентрації самого кастера). `seq` для `castId` — `flow.messages.length` або лічильник подій мутації; важлива лише унікальність у межах бою (додати `round`).
- `spell-mutation.ts`: передати `tag` у `spellZoneHazard`, який пише `damage.concentrationOf` у `TerrainDamage`.
- `hazard.ts`: у місці, де клітинка небезпеки завдає шкоди, пропускати клітинку, якщо `damage.concentrationOf && !isZoneConcentrationLive(ps, damage.concentrationOf)`. Мапу не переписувати (ліниве згасання; клітинка все одно зникне за `untilRound`).
- `concentrationCheck` у `applyDamageConsequences`: якщо `after` має ефект з `concentration` і `amount > 0` → `after.currentHp <= 0` → `dropConcentration`; інакше `rollSave({ ability: "constitution", dc: min(cap ?? Infinity, max(10, floor(amount/2))) … })`, провал → `dropConcentration`. Повідомлення: `🎲 ${name}: концентрація — рятівний кидок ВИТ ${total} проти СК ${dc} — утримує` / `— втрачає концентрацію на «${spellName}»`.
- `applyCondition` (5e-гілка): якщо після накладання ціль `hasCondition(p, "incapacitated")` і має ефект `concentration` → `dropConcentration` (результат повертає оновлений список учасників через `EffectApplyResult.participants`).
- Редактор заклинання: перемикач «Концентрація» в розділі визначення; показувати завжди (прапорець ігнорується, коли механіка вимкнена — підказка «діє, коли в правилах увімкнено концентрацію»).

- [ ] **Step 4:** PASS + `pnpm test:related lib/utils/battle/spell/cast/index.ts lib/utils/battle/grid/hazard.ts lib/utils/battle/spell/zone-hazard.ts lib/utils/spells/model/schema.ts lib/utils/battle/damage/consequences.ts` — зелено.
- [ ] **Step 5: Commit** `feat(constructor): 5e concentration`.

---

### Task 8: ДМ накладає й знімає стани

**Files:**
- Create: `app/api/campaigns/[id]/battles/[battleId]/conditions/route.ts`, `app/api/campaigns/[id]/battles/[battleId]/conditions/conditions-mutation.ts`, `components/battle/dm/ConditionsDialog.tsx`
- Modify: `lib/api/battles.ts` (`applyBattleCondition`), `lib/hooks/battles/useBattles.ts` (`useBattleConditions`), `lib/hooks/battle/useBattleScene.ts` (реєстрація мутації, як `revealParticipants` на `:334`), `lib/hooks/battle/useDmParticipantActions.ts`, `components/battle/dm/DmParticipantRow.tsx` (кнопка «Стани»), показ станів у списку ефектів учасника (`lib/utils/battle/view` — переконатися, що ефект `type: "condition"` 5e показується з назвою й тривалістю для гравців і для ворогів)
- Test: `app/api/campaigns/[id]/battles/[battleId]/conditions/__tests__/conditions-mutation.test.ts`, `components/battle/dm/__tests__/ConditionsDialog.test.tsx` (`// @vitest-environment happy-dom`)

**Interfaces:**
- Consumes: `expandCondition5e`, `CONDITION_5E_REGISTRY`, `restoreExhaustionHp`, `dropConcentration`, `startDying`-незалежно.
- Produces: тіло запиту

```ts
export const battleConditionsSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("apply"), participantId: z.string().min(1), condition: z.enum(CONDITION_5E_KEYS), rounds: z.number().int().min(1).max(99).optional(), levels: z.number().int().min(1).max(6).optional(), saveEnds: z.object({ ability: z.enum(ABILITY_KEYS), dc: z.number().int().min(1).max(40) }).optional() }),
  z.object({ action: z.literal("remove"), participantId: z.string().min(1), condition: z.enum(CONDITION_5E_KEYS) }),
]);
```

`rounds` відсутній → стан без тривалості (`permanent: true`), поки ДМ не зніме.

- [ ] **Step 1: Failing tests** (мутація — чиста функція, `BattleMutationContext` з фікстур інших `*-mutation.test.ts`, знайти зразок у `app/api/campaigns/[id]/battles/[battleId]/**/__tests__`):
- `apply prone` → учасник має ефект «Повалений» (джерело «ДМ», `source: undefined`), подія `dmEvent` з текстом «ДМ: <ім'я> — повалений».
- імунітет `conditionImmunity ["prone"]` → помилка `BattleRuleError` «імунітет».
- `remove prone` при двох ефектах `prone` (від ДМ і від вміння) → обидва знято; ефект `paralyzed`, що має маркер `incapacitated` через `implies`, **не** знімається запитом `remove incapacitated` (знімається лише ефект, чий власний ключ = `condition`: перший маркер ефекту).
- `remove exhaustion` → `maxHp` відновлено (`restoreExhaustionHp`).
- `apply stunned` на кастера з концентрацією → концентрацію знято.
- route: `access: BattleAccess.DM`, `requireStatus: BattleStatus.ACTIVE`, `allowWhileAwaitingDm: true` — тест доступу не потрібен, якщо пайплайн уже покритий; перевірити schema (невідомий стан → 400 через `parseBody`).
- Діалог: рендерить 15 станів з описом; поточні стани учасника з кнопкою «Зняти»; «Накласти» викликає `actions.conditions.mutate({ action: "apply", participantId, condition, rounds })`.

- [ ] **Step 2:** FAIL.
- [ ] **Step 3: Implementation.**
- `route.ts` — за зразком `reveal-participant/route.ts` (наведено у плані вище):

```ts
export async function POST(req: Request, { params }: { params: Promise<{ id: string; battleId: string }> }) {
  return runBattleMutation(req, { params: await params, access: BattleAccess.DM, requireStatus: BattleStatus.ACTIVE, allowWhileAwaitingDm: true, schema: battleConditionsSchema, mutate: battleConditionsMutation });
}
```

- Мутація: `apply` викликає `applyCondition5e` (задача 2) з `timedKey: \`dm:${key}@${round}\``, `source: undefined`, `sourceName: "ДМ"`, `rounds: rounds ?? 99`, `permanent: !rounds`; `blocked` → `BattleRuleError` «імунітет». `remove` — видалити ефекти, у яких `effects[0].type === key`, `restoreExhaustionHp`.
- Клієнт: `lib/api/battles.ts` `applyBattleCondition(campaignId, battleId, body)` (POST `…/conditions`), хук `useBattleConditions = (c, b, o = {}) => useBattleAction<BattleConditionsBody>(c, b, (body) => applyBattleCondition(c, b, body), o)`, реєстрація в `useBattleScene` як `conditions`.
- `DmParticipantRow`: кнопка «Стани» показується, коли `scene.rules.conditions.enabled` або в бою є хоч один ефект з 5e-маркером (`CONDITION_5E_KEYS.includes(e.effects[0]?.type)`); відкриває `ConditionsDialog` (`ResponsiveDialog hud`; список — `HudTile`/кнопки; поля «Раунди» (порожньо = доки не знімуть), «Рівні» для виснаження, «Рятівний кидок наприкінці ходу» (характеристика + СК)). Кнопки — у `footer`.

- [ ] **Step 4:** PASS + `pnpm test:related` на змінених файлах + `pnpm lint` (layering: компоненти не імпортують `@/lib/api`).
- [ ] **Step 5: Commit** `feat(constructor): DM applies and removes 5e conditions`.

---

### Task 9: Документи

**Files:**
- Modify: `docs/architecture/battle.md` (розділ «5e: стани, рятівні кидки, смерть, концентрація»: реєстр станів і розгортання в маркери/прапорці, `rollSave`, `applyDamageConsequences` як обов'язковий виклик після кожного примітиву шкоди, кидки смерті в циклі пропуску, концентрація з лінивим згасанням зон, роут `conditions`), `docs/architecture/abilities.md` (нові прапорці, стат `savingThrow`, 5e-ключі `applyCondition`, `saveEnds`, `levels`), `docs/STATUS.md` (рядок «Конструктор»: етап 4a готовий/в роботі; Warhammer — пост-MVP; злиття після 1–4 + 6), `docs/archive/superpowers/constructor-handoff.md` (стан, наступний крок 4b), `CLAUDE.md` — у розділі «Subsystems — rules» до пункту Battle додати: «шкода → `applyDamageConsequences` одразу після примітиву».
- [ ] **Step 1:** оновити документи (українською, стисло, у стилі наявних).
- [ ] **Step 2: Commit** `docs(constructor): 4a — battle/abilities docs, status, handoff`.

---

### Task 10: Повна перевірка

- [ ] `pnpm test:run` — усі тести (відомий нестабільний `lib/hooks/battle/__tests__/battle-fx.test.tsx` — перезапустити окремо).
- [ ] `pnpm lint` — 0 errors; `pnpm build` — OK.
- [ ] `set -a; source .env.local; set +a; pnpm battle-sweep --campaign cmuylhk0c0001ia06lg5eommv` — без регресу (відомий нестабільний сценарій лабіринту «ворог у полі зору прокидається»).
- [ ] Живий прогін (після фінального рев'ю, див. «Як працюємо» в хендофі): кампанія з «Порожньої», увімкнено `conditions`, `saves`, `deathSaves`, `concentration`; браузер `pnpm dev -p 3001`, десктоп + 500 px; тестові дані видалити.
