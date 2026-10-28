# Система умінь, частина 3b — редактор умінь з реєстру: план реалізації

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Один `AbilityListEditor` (акордеон, картки ефектів з полями з реєстру, шаблони, «Скопіювати з…») у формах скіла, артефакту, сету, раси та юніта. Колонку `abilities` пишемо напряму і припиняємо подвійний запис. Імунітети юнітів і персонажів стають механікою бою.

**Architecture:**
- Чисті хелпери (`lib/utils/abilities/{editor,templates}.ts`) і доповнений реєстр `fields` визначають, що й як редагується.
- React-компоненти в `components/abilities/` контрольовані: приймають `value: Ability[]` і викликають `onChange`, а помилки беруть з `AbilitiesSchema` за шляхами.
- Роути приймають `abilities` через Zod і пишуть колонку. `legacy/sync.ts` видаляється.
- Детальні GET віддають `abilities` разом з issues конвертера.

**Tech Stack:** React 19, Next.js 16 App Router, TanStack Query, Radix (Accordion, Dialog, Switch), Zod 4, Vitest + Testing Library + happy-dom.

**Spec:** `docs/superpowers/specs/2026-10-05-ability-editor-design.md` (основа — `docs/superpowers/specs/2026-10-05-ability-system-core-design.md`)

## Global Constraints

- Стан форм тримаємо на `useState` без react-hook-form.
- UI-примітиви беремо лише з `components/ui/*`: `SelectField`, `Input`, `Label`, `Switch`, `Button`, `Accordion*`, `Dialog*`, `Card*`. Нових залежностей не додаємо.
- Компоненти отримують ≤ ~7 пропсів, колбеки групуються.
- Тексти UI українською, ідентифікатори англійською, коментарі мінімальні.
- Компонентні тести починаються з `// @vitest-environment happy-dom`.
- Списки (GET колекцій) і далі не віддають `abilities`. Віддають їх лише детальні GET і `GET /abilities/:kind/:ownerId`.
- Помилка Zod у роутах → 400 `{ error: issues }`. Це вже робить `handleApiError`, і форма мапить `issue.path`, якщо він починається з `abilities`.
- `legacy/read` (запасний варіант на час читання) і `pnpm convert-abilities` лишаються до contract-міграції.

## Review Focus

1. **DM відкриває старий скіл з `NULL` у колонці і з втратами конвертера, змінює лише назву, зберігає.** Плашка «Перенесено зі старого формату» показує втрати до збереження, а збережено саме те, що DM бачив. Тест — Task 6 (GET з issues) і Task 8 (плашка).
2. **Зміна тригера на «Пасивно» в уміння з DOT.** Помилка біля ефекту, кнопка збереження вимкнена, нічого не падає. Тест — Task 8.
3. **Частковий PATCH після збереження з редактора** (зміна головного скіла з картки, `UnitQuickStatsEditor`) не чіпає `abilities`. Тест — Task 6.
4. **«Скопіювати з…» те саме вміння двічі.** Нові унікальні `id`, тож ключі лічильників у бою не злипаються. Тест — Task 5 (`withFreshIds`) і Task 8.
5. **У колонці вміння з невідомим `kind`** (зламані дані). Редактор показує картку «Невідомий ефект» лише для читання, решта редагується. Тест — Task 7.

---

## File Structure

| Файл | Дія | Відповідальність |
|---|---|---|
| `lib/utils/abilities/schema/effects.ts` | Modify | прапорець `conditionImmunity` |
| `lib/utils/abilities/registry/effects/{static,state,hp}.ts` | Modify | describe/fields для нового прапорця; імунітет у `applyCondition`/`changeMorale`/`dot` |
| `types/abilities.ts`, `lib/utils/battle/damage/impl.ts` | Modify | `AbilitySource.type += "character"` |
| `lib/utils/abilities/build/immunities.ts` | Create | `immunityAbilities(list, source)` |
| `lib/utils/battle/participant/{from-unit,from-character}.ts` | Modify | додати імунітети до `resolvedAbilities` |
| `lib/utils/abilities/legacy/convert-skill.ts` | Modify | `combatStats.min_targets / max_targets` |
| `lib/utils/abilities/registry/{fields,labels,triggers,conditions}.ts`, `registry/effects/*` | Modify | повні `fields`, `visibleWhen`, `FLAG_FIELDS`, `describeAbility` |
| `lib/utils/abilities/{editor,templates}.ts` | Create | чисті хелпери редактора, шаблони |
| `lib/utils/abilities/legacy/read.ts` | Modify | `readAbilities(kind,row) → { abilities, issues }` |
| `app/api/campaigns/[id]/abilities/sources/route.ts`, `abilities/[kind]/[ownerId]/route.ts` | Create | джерела для «Скопіювати з…» |
| `lib/api/abilities.ts`, `lib/hooks/abilities/{index,useAbilitySources}.ts` | Create | клієнт і хуки |
| роути skills/races/artifacts/artifact-sets/units + `lib/schemas/*`, `artifacts/schemas.ts`, `artifact-sets/schemas.ts`, `lib/utils/artifacts/artifact-set-queries.ts` | Modify | прийом `abilities`, без `sync`, без legacy-полів |
| `lib/utils/abilities/legacy/sync.ts` | Delete | кінець подвійного запису |
| `components/abilities/**` | Create | редактор і показ |
| `components/skills/form/**`, `lib/hooks/skills/useSkillForm*.ts` | Modify / Delete | скіл на редакторі |
| `components/artifacts/**`, `components/artifact-sets/**` | Modify / Delete | артефакт і сет на редакторі |
| `components/races/**`, `components/units/form/**`, `app/campaigns/[id]/dm/units/[unitId]/page.tsx` | Modify / Delete | раса і юніт на редакторі |
| `components/skills/list/**`, `components/artifact-sets/ArtifactSetBonusDisplay.tsx`, `components/units/list/UnitCard.tsx` | Modify | показ через `AbilitySummary` |
| `types/{skills,units,races}.ts`, `lib/api/{artifacts,artifact-sets}.ts` | Modify | `abilities?`, `abilityIssues?` |

---

### Task 1: Рушій — `conditionImmunity`, імунітет у DOT, `character` як джерело

**Files:**
- Modify: `lib/utils/abilities/schema/effects.ts`, `lib/utils/abilities/registry/effects/{static,state,hp}.ts`, `types/abilities.ts`, `lib/utils/battle/damage/impl.ts` (`BONUS_PREFIX`)
- Test: `lib/utils/abilities/registry/__tests__/immunity-effects.test.ts`

**Interfaces:**
- Produces:
  - варіант `FlagEffect` `{ kind: "flag"; flag: "conditionImmunity"; conditions: "all" | Array<ConditionKey | "fear">; target?; duration? }`;
  - `CONDITION_KEYS` без змін;
  - `type ConditionImmunityKey = (typeof CONDITION_KEYS)[number] | "fear"`;
  - `AbilitySource["type"]` включає `"character"`.

- [ ] **Step 1: Тест**

```ts
// lib/utils/abilities/registry/__tests__/immunity-effects.test.ts
import { describe, expect, it } from "vitest";

import { makeParticipant, resolved, seq } from "@/lib/utils/abilities/__tests__/fixtures";
import { applyEffect } from "@/lib/utils/abilities/registry/effects";
import { AbilitySchema, type Effect } from "@/lib/utils/abilities/schema";
import { ParticipantSide } from "@/lib/constants/battle";

const immune = (flag: Effect) => resolved({ trigger: { event: "passive" }, effects: [flag] }, { id: "imm" });

function apply(effect: Effect, target = makeParticipant({ id: "t", side: ParticipantSide.ENEMY })) {
  const ps = [makeParticipant({ id: "o" }), target];

  const ability = resolved({ trigger: { event: "hit", role: "attacker" }, effects: [effect] });

  return applyEffect({ participants: ps, ability, effectIndex: 0, ownerId: "o", effect, targetIds: ["t"], event: { type: "hit", actorId: "o", targetId: "t", attackKind: "melee", damage: 5 }, ctx: { round: 1, rng: seq(0.5) } });
}

describe("immunities", () => {
  it("схема приймає conditionImmunity", () => {
    expect(AbilitySchema.safeParse({ id: "a", name: "Імунітети", trigger: { event: "passive" }, effects: [{ kind: "flag", flag: "conditionImmunity", conditions: "all" }] }).success).toBe(true);
    expect(AbilitySchema.safeParse({ id: "a", name: "І", trigger: { event: "passive" }, effects: [{ kind: "flag", flag: "conditionImmunity", conditions: ["fear", "no_reaction"] }] }).success).toBe(true);
  });

  it("applyCondition не діє на ціль з імунітетом до контролю", () => {
    const t = makeParticipant({ id: "t", side: ParticipantSide.ENEMY, abilities: [immune({ kind: "flag", flag: "conditionImmunity", conditions: "all" })] });

    const r = apply({ kind: "applyCondition", condition: "no_reaction", duration: { rounds: 1 }, target: "eventTarget" }, t);

    expect(r.participants[1].battleData.activeEffects).toHaveLength(0);
    expect(r.messages[0]).toContain("⛔");
  });

  it("страх блокує лише втрату моралі", () => {
    const t = makeParticipant({ id: "t", side: ParticipantSide.ENEMY, abilities: [immune({ kind: "flag", flag: "conditionImmunity", conditions: ["fear"] })] });

    expect(apply({ kind: "changeMorale", delta: -1, target: "eventTarget" }, t).participants[1].combatStats.morale).toBe(0);
    expect(apply({ kind: "changeMorale", delta: 1, target: "eventTarget" }, t).participants[1].combatStats.morale).toBe(1);
  });

  it("DOT не накладається на ціль з імунітетом до свого типу", () => {
    const t = makeParticipant({ id: "t", side: ParticipantSide.ENEMY, abilities: [immune({ kind: "flag", flag: "resistance", damageType: "fire", percent: 100 })] });

    const fire = apply({ kind: "dot", damagePerRound: 3, damageType: "fire", duration: { rounds: 2 }, target: "eventTarget" }, t);

    const bleed = apply({ kind: "dot", damagePerRound: 3, damageType: "bleed", duration: { rounds: 2 }, target: "eventTarget" }, t);

    expect(fire.participants[1].battleData.activeEffects).toHaveLength(0);
    expect(bleed.participants[1].battleData.activeEffects).toHaveLength(1);
  });
});
```

- [ ] **Step 2: FAIL**

Run: `pnpm test:run lib/utils/abilities/registry/__tests__/immunity-effects.test.ts`
Expected: FAIL — схема відхиляє `conditionImmunity`.

- [ ] **Step 3: Реалізація**

`schema/effects.ts` — додати варіант у `FlagSchema` (після `seeEnemyHp`):

```ts
  z.object({
    ...flagBase,
    flag: z.literal("conditionImmunity"),
    conditions: z.union([z.literal("all"), z.array(z.enum([...CONDITION_KEYS, "fear"])).min(1)]),
  }),
```

Додати ще `export type ConditionImmunityKey = (typeof CONDITION_KEYS)[number] | "fear";`.

`registry/effects/static.ts` → `describeFlag`:

```ts
    case "conditionImmunity":
      return e.conditions === "all" ? "імунітет до контролю" : `імунітет: ${e.conditions.map((c) => (c === "fear" ? "страх" : c)).join(", ")}`;
```

`registry/effects/state.ts`:

```ts
import { findFlags } from "@/lib/utils/abilities/engine/collect-modifiers";

function immuneTo(ps: BattleParticipant[], id: string, key: ConditionImmunityKey): boolean {
  return findFlags(ps, id, "conditionImmunity").some((f) => f.conditions === "all" || f.conditions.includes(key));
}
```

- У `applyCondition`: усередині `each(...)` колбек повертає `null`, якщо `immuneTo(input.participants, p.basicInfo.id, effect.condition)`. Відфільтровані імена накопичуються, а в `messages` дописується `⛔ ${ability.name}: ${names} — імунітет`.
- У `applyChangeMorale` так само, але лише при `effect.delta < 0` і `immuneTo(..., "fear")`.
- Щоб `each` міг повернути повідомлення про імунітет, додати йому необов'язковий параметр `skipped?: (p) => boolean`. Для пропущених зібрати імена і додати друге повідомлення.

`registry/effects/hp.ts` → `applyDot`, на початку циклу після `if (!t || !isUp(t)) continue;`:

```ts
    if (findFlags(ps, id, "resistance").some((f) => f.percent >= 100 && f.damageType.toLowerCase() === effect.damageType.toLowerCase())) {
      messages.push(`⛔ ${ability.name}: ${t.basicInfo.name} — імунітет до ${effect.damageType}`);
      continue;
    }
```

`collect-modifiers.ts` імпортує `registry/conditions`, а не `registry/effects`, тож цикл імпортів не з'являється. Перевірити це: `pnpm lint lib/utils/abilities`.

`types/abilities.ts`: `type: "skill" | "race" | "artifact" | "artifactSet" | "unit" | "character";`.

`damage/impl.ts` → у `BONUS_PREFIX` додати `character: "Бонус персонажа",`.

- [ ] **Step 4: PASS**

Run: `pnpm test:run lib/utils/abilities && pnpm exec tsc --noEmit -p .`
Expected: PASS; tsc чистий.

- [ ] **Step 5: Коміт**

```bash
pnpm lint --fix lib/utils/abilities types && git add -A && git commit -m "feat(abilities): condition immunity flag; DOT respects immunity"
```

---

### Task 2: Імунітети юнітів і персонажів → вміння в бою

**Files:**
- Create: `lib/utils/abilities/build/immunities.ts`
- Modify: `lib/utils/battle/participant/from-unit.ts`, `lib/utils/battle/participant/from-character.ts`
- Test: `lib/utils/abilities/build/__tests__/immunities.test.ts`, дописати `lib/utils/battle/__tests__/ability-readers.test.ts`

**Interfaces:**
- Consumes: `getUnitImmunities(unit, race)` з `lib/utils/races/race-effects.ts`, `getCharacterImmunities(character, race)` з `lib/utils/characters/character-race-effects.ts` (обидві повертають `string[]`), `resolveAbilities`.
- Produces: `immunityAbilities(immunities: string[], source: { type: "unit" | "character"; id: string }): ResolvedAbility[]` — нуль або одне вміння `{ id: "immunities", name: "Імунітети", trigger: passive }`.

- [ ] **Step 1: Тест**

```ts
// lib/utils/abilities/build/__tests__/immunities.test.ts
import { describe, expect, it } from "vitest";

import { immunityAbilities } from "@/lib/utils/abilities/build/immunities";
import { AbilitiesSchema } from "@/lib/utils/abilities/schema";

describe("immunityAbilities", () => {
  it("мапить шкоду, контроль, страх; інше — нотатка", () => {
    const [a] = immunityAbilities([" Вогню ", "отруєння", "магії", "контролю", "страху", "сповільнення"], { type: "unit", id: "u1" });

    expect(a.key).toBe("unit:u1:immunities");
    expect(a.effects).toEqual([
      { kind: "flag", flag: "resistance", damageType: "fire", percent: 100 },
      { kind: "flag", flag: "resistance", damageType: "poison", percent: 100 },
      { kind: "flag", flag: "resistance", damageType: "spell", percent: 100 },
      { kind: "flag", flag: "conditionImmunity", conditions: "all" },
      { kind: "flag", flag: "conditionImmunity", conditions: ["fear"] },
      { kind: "note", text: "Імунітет: сповільнення" },
    ]);
    expect(AbilitiesSchema.safeParse([a]).success).toBe(true);
  });

  it("порожньо → без вміння; дублікати зливаються", () => {
    expect(immunityAbilities([], { type: "character", id: "c" })).toEqual([]);
    expect(immunityAbilities(["вогню", "вогня", "fire"], { type: "character", id: "c" })[0].effects).toHaveLength(1);
  });
});
```

У `ability-readers.test.ts` дописати бойовий тест:

```ts
  it("юніт з імунітетом до вогню не отримує вогняної шкоди", () => {
    const p = makeParticipant({ id: "u", abilities: immunityAbilities(["вогню"], { type: "unit", id: "u" }) });

    expect(applyResistance(p, 10, "fire").finalDamage).toBe(0);
    expect(applyResistance(p, 10, "fire", { fromSpell: true }).finalDamage).toBe(0);
  });
```

Також додати `import { immunityAbilities } from "@/lib/utils/abilities/build/immunities";`.

- [ ] **Step 2: FAIL** — `pnpm test:run lib/utils/abilities/build lib/utils/battle/__tests__/ability-readers.test.ts`

- [ ] **Step 3: Реалізація**

```ts
// lib/utils/abilities/build/immunities.ts
import { resolveAbilities } from "./resolve";

import type { Effect } from "@/lib/utils/abilities/schema";
import type { ResolvedAbility } from "@/types/abilities";

const RULES: Array<{ match: RegExp; effect: Effect }> = [
  { match: /^(вогн(ю|я|ь)|вогонь|fire)$/, effect: { kind: "flag", flag: "resistance", damageType: "fire", percent: 100 } },
  { match: /^(отру(єння|ти|та)|poison)$/, effect: { kind: "flag", flag: "resistance", damageType: "poison", percent: 100 } },
  { match: /^(магії|магія|чарівництва|magic|spell)$/, effect: { kind: "flag", flag: "resistance", damageType: "spell", percent: 100 } },
  { match: /^(контролю|контроль|control)$/, effect: { kind: "flag", flag: "conditionImmunity", conditions: "all" } },
  { match: /^(страху|страх|fear)$/, effect: { kind: "flag", flag: "conditionImmunity", conditions: ["fear"] } },
];

export function immunityAbilities(immunities: string[], source: { type: "unit" | "character"; id: string }): ResolvedAbility[] {
  const effects: Effect[] = [];

  const seen = new Set<string>();

  for (const raw of immunities) {
    const text = raw.trim().toLowerCase();

    if (!text) continue;

    const rule = RULES.find((r) => r.match.test(text));

    const effect: Effect = rule?.effect ?? { kind: "note", text: `Імунітет: ${text}` };

    const key = JSON.stringify(effect);

    if (seen.has(key)) continue;

    seen.add(key);
    effects.push(effect);
  }

  if (effects.length === 0) return [];

  return resolveAbilities({ type: source.type, id: source.id, name: "Імунітети" }, [
    { id: "immunities", name: "Імунітети", trigger: { event: "passive" }, effects },
  ]);
}
```

Підключення:
- `from-unit.ts`: `resolvedAbilities: [...collectUnitAbilities(unit, race), ...immunityAbilities(getUnitImmunities(unit as never, race as never), { type: "unit", id: unit.id })]`. `getUnitImmunities` типізована доменними типами. Якщо `tsc` не приймає Prisma-рядки, привести тип через `as unknown as Unit` / `Race`, як роблять сусідні виклики в `UnitCard`.
- `from-character.ts`: `resolvedAbilities: [...collectCharacterAbilities(...), ...immunityAbilities(getCharacterImmunities(character, race), { type: "character", id: character.id })]`.

- [ ] **Step 4: PASS, typecheck, коміт**

```bash
pnpm test:run lib/utils/abilities lib/utils/battle && pnpm exec tsc --noEmit -p . && pnpm lint --fix lib/utils && git add -A && git commit -m "feat(battle): unit and character immunities become resistance and control-immunity abilities"
```

---

### Task 3: Конвертер — цілі з форми скіла

**Files:**
- Modify: `lib/utils/abilities/legacy/convert-skill.ts`
- Test: дописати `lib/utils/abilities/legacy/__tests__/convert-skill.test.ts`

- [ ] **Step 1: Тест**

```ts
  it("combatStats.min_targets/max_targets → пасивні цілі + behavior issue", () => {
    const r = convertLegacySkill(row({ combatStats: { min_targets: 1, max_targets: 2, effects: [] } }));

    expect(r.abilities).toContainEqual({
      id: "targets",
      name: "Скіл",
      trigger: { event: "passive" },
      effects: [
        { kind: "modifyStat", stat: "minTargets", flat: 1 },
        { kind: "modifyStat", stat: "maxTargets", flat: 2 },
      ],
    });
    expect(r.issues.some((i) => i.message.includes("цілей"))).toBe(true);
  });
```

Тест додати перед останнім `});` у `describe`.

- [ ] **Step 2: FAIL**

- [ ] **Step 3: Реалізація** — у `convertLegacySkill` перед `return { abilities, issues };`:

```ts
  const cs = (row.combatStats ?? {}) as { min_targets?: unknown; max_targets?: unknown };

  const targets: Effect[] = [];

  if (typeof cs.min_targets === "number" && cs.min_targets !== 0) targets.push({ kind: "modifyStat", stat: "minTargets", flat: cs.min_targets });

  if (typeof cs.max_targets === "number" && cs.max_targets !== 0) targets.push({ kind: "modifyStat", stat: "maxTargets", flat: cs.max_targets });

  if (targets.length && !opts.skipBakedStats) {
    abilities.push({ id: "targets", name: row.name, trigger: { event: "passive" }, effects: targets });
    issues.push({ severity: "behavior", message: "Мін./макс. цілей скіла: раніше не діяло, тепер додається до цілей" });
  }
```

Скіл без ефектів і тригерів досі генерує вміння `t0` з порожніми ефектами? Ні: `main` порожній, тож вміння не створюється. Перевірити, що тест не отримує зайвого `t0`.

- [ ] **Step 4: PASS, коміт**

```bash
pnpm test:run lib/utils/abilities/legacy && git add -A && git commit -m "feat(abilities): convert skill form target counts"
```

---

### Task 4: Повні `fields` реєстру

**Files:**
- Modify: `lib/utils/abilities/registry/fields.ts`, `labels.ts`, `triggers.ts`, `conditions.ts`, `effects/static.ts`, `effects/index.ts`
- Test: `lib/utils/abilities/registry/__tests__/fields-contract.test.ts`

**Interfaces:**
- Produces:
  - `FieldInput = "number"|"text"|"select"|"multiselect"|"amount"|"flat"|"target"|"duration"|"effects"|"strings"|"toggle"|"numberList"|"spells"`;
  - `FieldMeta { name; label; input; options?; optional?; visibleWhen?: (value: Record<string, unknown>) => boolean }`;
  - `FLAG_FIELDS: Record<FlagKey, readonly FieldMeta[]>`, `FLAG_LABELS: Record<FlagKey, string>`;
  - `TARGET_LABELS: Record<AbilityTarget, string>`;
  - `describeAbility(a: Ability): string`;
  - `CUSTOM_RENDERED: Record<string, readonly string[]>` — ключі, які малюють власні рендерери (`flag` → усі поля підвиду, `randomOf` → `options`, `all`/`any` → `conditions`).

- [ ] **Step 1: Тест-контракт**

```ts
// lib/utils/abilities/registry/__tests__/fields-contract.test.ts
import { describe, expect, it } from "vitest";
import type { z } from "zod";

import { CONDITION_REGISTRY } from "@/lib/utils/abilities/registry/conditions";
import { EFFECT_REGISTRY, FLAG_FIELDS } from "@/lib/utils/abilities/registry/effects";
import { describeAbility } from "@/lib/utils/abilities/registry/labels";
import { TRIGGER_REGISTRY } from "@/lib/utils/abilities/registry/triggers";
import { ConditionSchema, EffectSchema, TriggerSchema } from "@/lib/utils/abilities/schema";

const keysOf = (s: z.ZodType) => Object.keys((s as unknown as { shape: Record<string, unknown> }).shape);

const topLevel = (names: readonly { name: string }[]) => new Set(names.map((f) => f.name.split(".")[0]));

describe("fields contract", () => {
  it("кожне поле ефекту описане в fields (прапорці — у FLAG_FIELDS)", () => {
    for (const option of (EffectSchema as unknown as { options: z.ZodType[] }).options) {
      const nested = (option as unknown as { options?: z.ZodType[] }).options;

      if (nested && !("shape" in (option as object))) {
        for (const flagOption of nested) {
          const shape = (flagOption as unknown as { shape: Record<string, { value?: string }> }).shape;

          const flag = (shape.flag as unknown as { value: string }).value as keyof typeof FLAG_FIELDS;

          const covered = new Set([...topLevel(FLAG_FIELDS[flag]), "kind", "flag", "target", "duration"]);

          for (const key of keysOf(flagOption)) expect(covered.has(key), `flag.${flag}.${key}`).toBe(true);
        }

        continue;
      }

      const kind = ((option as unknown as { shape: { kind: { value: string } } }).shape.kind.value) as keyof typeof EFFECT_REGISTRY;

      const covered = new Set([...topLevel(EFFECT_REGISTRY[kind].fields), "kind", ...(kind === "randomOf" ? ["options"] : [])]);

      for (const key of keysOf(option)) expect(covered.has(key), `${kind}.${key}`).toBe(true);
    }
  });

  it("кожне поле тригера описане", () => {
    for (const option of (TriggerSchema as unknown as { options: z.ZodType[] }).options) {
      const event = (option as unknown as { shape: { event: { value: string } } }).shape.event.value as keyof typeof TRIGGER_REGISTRY;

      const covered = new Set([...topLevel(TRIGGER_REGISTRY[event].fields), "event"]);

      for (const key of keysOf(option)) expect(covered.has(key), `${event}.${key}`).toBe(true);
    }
  });

  it("кожне поле умови описане", () => {
    const union = (ConditionSchema as unknown as { _zod: { def: { getter: () => { options: z.ZodType[] } } } })._zod.def.getter();

    for (const option of union.options) {
      const type = (option as unknown as { shape: { type: { value: string } } }).shape.type.value as keyof typeof CONDITION_REGISTRY;

      const covered = new Set([...topLevel(CONDITION_REGISTRY[type].fields), "type"]);

      for (const key of keysOf(option)) expect(covered.has(key), `${type}.${key}`).toBe(true);
    }
  });

  it("describeAbility", () => {
    expect(
      describeAbility({ id: "a", name: "Кровотеча", trigger: { event: "hit", role: "attacker" }, limits: { perBattle: 1, chance: 30 }, effects: [{ kind: "dot", damagePerRound: "1d4", damageType: "bleed", duration: { rounds: 2 }, target: "eventTarget" }] }),
    ).toBe("Влучання · 1 раз за бій · 30% · bleed 1d4/раунд × 2 р.");
  });
});
```

Доступ до `ConditionSchema` (обгорнута в `z.lazy`) у Zod 4 йде через `_zod.def.getter()`. Якщо API інше, взяти рядок `options` з `ConditionSchema._zod.def` у дебагері, а не послаблювати тест.

- [ ] **Step 2: FAIL**

Run: `pnpm test:run lib/utils/abilities/registry/__tests__/fields-contract.test.ts`
Expected: FAIL. Бракує `attackKind`, `spellLevels` у `modifyStat`, `refresh*` у `grantAction`, `FLAG_FIELDS` і `describeAbility`.

- [ ] **Step 3: Реалізація**

`fields.ts`:

```ts
export type FieldInput =
  | "number" | "text" | "select" | "multiselect" | "amount" | "flat" | "target" | "duration"
  | "effects" | "strings" | "toggle" | "numberList" | "spells";

export interface FieldMeta {
  name: string;
  label: string;
  input: FieldInput;
  options?: readonly { value: string; label: string }[];
  optional?: boolean;
  visibleWhen?: (value: Record<string, unknown>) => boolean;
}
```

`TARGET_FIELD` отримує `options` з `TARGET_LABELS`.

`labels.ts` — додати:

```ts
export const TARGET_LABELS: Record<AbilityTarget, string> = {
  self: "я",
  eventTarget: "ціль події",
  eventActor: "виконавець події",
  allAllies: "усі союзники",
  allEnemies: "усі вороги",
};

export function limitsLabel(l: Limits | undefined): string[] {
  if (!l) return [];

  return [
    l.perBattle ? `${l.perBattle} раз${l.perBattle > 1 ? "и" : ""} за бій` : null,
    l.perRound ? `${l.perRound}/раунд` : null,
    l.perTurn ? `${l.perTurn}/хід` : null,
    l.chance ? `${l.chance}%` : null,
  ].filter((x): x is string => !!x);
}
```

`describeAbility` живе в `registry/effects/index.ts` (щоб уникнути циклу `labels` → `effects`) і реекспортується з `labels.ts`. Якщо `import/no-cycle` скаржиться, тест імпортує його з `registry/effects`:

```ts
export function describeAbility(a: Ability): string {
  return [TRIGGER_REGISTRY[a.trigger.event].label, ...limitsLabel(a.limits), ...a.effects.map(describeEffect)].join(" · ");
}
```

Тест-контракт імпортує `describeAbility` з `@/lib/utils/abilities/registry/effects`. Відповідно змінити імпорт у тесті з Step 1.

`effects/static.ts`:
- `modifyStatFields` дописати:

```ts
  { name: "attackKind", label: "Тип атаки", input: "select", optional: true, options: [{ value: "melee", label: "ближня" }, { value: "ranged", label: "дальня" }], visibleWhen: (e) => e.stat === "attackBonus" },
  { name: "spellLevels", label: "Рівні слотів", input: "numberList", visibleWhen: (e) => e.stat === "spellSlots" },
```

- `FLAG_LABELS` і `FLAG_FIELDS`:

```ts
export const FLAG_LABELS: Record<FlagKey, string> = {
  advantage: "Перевага",
  disadvantage: "Недолік на свої атаки",
  disadvantageForAttackers: "Недолік для атакувальників",
  guaranteedHit: "Гарантоване влучання",
  resistance: "Опір / імунітет до шкоди",
  spellImmunity: "Імунітет до заклинань",
  counterAttack: "Контратака",
  seeEnemyHp: "Бачить HP ворогів",
  conditionImmunity: "Імунітет до станів",
};

const ATTACK_KIND_ALL = [{ value: "all", label: "усі" }, { value: "melee", label: "ближні" }, { value: "ranged", label: "дальні" }] as const;

const DAMAGE_KINDS_OPTIONS = [{ value: "melee", label: "ближня" }, { value: "ranged", label: "дальня" }, { value: "magic", label: "магія" }] as const;

export const FLAG_FIELDS: Record<FlagKey, readonly FieldMeta[]> = {
  advantage: [{ name: "attackKind", label: "Атаки", input: "select", options: ATTACK_KIND_ALL }],
  disadvantage: [],
  disadvantageForAttackers: [],
  guaranteedHit: [],
  resistance: [
    { name: "damageType", label: "Тип шкоди (physical, spell, fire…)", input: "text" },
    { name: "percent", label: "%, 100 = імунітет", input: "number" },
  ],
  spellImmunity: [{ name: "spellIds", label: "Заклинання", input: "spells" }],
  counterAttack: [
    { name: "attackKinds", label: "На атаки", input: "multiselect", options: DAMAGE_KINDS_OPTIONS },
    { name: "bonusPercent", label: "Бонус шкоди, %", input: "number" },
  ],
  seeEnemyHp: [],
  conditionImmunity: [
    { name: "conditions", label: "Стани", input: "multiselect", options: [{ value: "all", label: "усі (контроль)" }, { value: "fear", label: "страх" }, ...Object.entries(CONDITION_LABELS).map(([value, label]) => ({ value, label }))] },
  ],
};
```

`CONDITION_LABELS` імпортувати з `./state`. Якщо виникає цикл `static` ↔ `state`, перенести `CONDITION_LABELS` у `registry/labels.ts`.

`effects/index.ts`:
- `heal.fields`: `revive` → `{ name: "revive", label: "Воскрешає", input: "toggle", optional: true }`;
- `grantAction.fields` дописати `refreshAction`, `refreshBonusAction`, `refreshReaction` (`toggle`, optional);
- `flag.fields` → `[{ name: "flag", label: "Прапорець", input: "select", options: Object.entries(FLAG_LABELS).map(...) }, TARGET_FIELD, DURATION_FIELD]`;
- реекспортувати `FLAG_FIELDS`, `FLAG_LABELS`.

`describeAbility` додати в `effects/index.ts`. Для кожного тригера підпис у `TRIGGER_REGISTRY` уже є; спершу перевірити, що `hit.label === "Влучання"`.

Перевірити `conditions.ts`: `all`/`any` → `{ name: "conditions", input: "effects" }` уже є, решта полів теж.

- [ ] **Step 4: PASS**

Run: `pnpm test:run lib/utils/abilities`
Expected: PASS. Якщо контракт знаходить поле без мети, дописати мету, а не виняток у тесті.

- [ ] **Step 5: Коміт**

```bash
pnpm lint --fix lib/utils/abilities && git add -A && git commit -m "feat(abilities): complete registry field metadata and describeAbility"
```

---

### Task 5: Хелпери редактора й шаблони

**Files:**
- Create: `lib/utils/abilities/editor.ts`, `lib/utils/abilities/templates.ts`
- Test: `lib/utils/abilities/__tests__/editor.test.ts`, `lib/utils/abilities/__tests__/templates.test.ts`

**Interfaces:**
- Produces (`editor.ts`):
  - `allowedEffectKinds(trigger: Trigger): EffectKind[]` — для пасивки `modifyStat | damageBonus | flag | note`, інакше всі;
  - `newEffect(kind: EffectKind, trigger: Trigger): Effect` — валідний у контексті тригера;
  - `changeEffectKind(effect: Effect, kind: EffectKind, trigger: Trigger): Effect` — зберігає `target`, якщо він дозволений;
  - `newTrigger(event: TriggerEvent): Trigger`;
  - `changeTriggerEvent(ability: Ability, event: TriggerEvent): Ability` — нормалізує ефекти: прибирає `duration` і недозволені для пасивки цілі, додає `duration: { rounds: 1 }` статичним ефектам у непасивних і не action-scoped тригерах, видаляє `limits` для пасивки;
  - `getAtPath(obj, path): unknown`, `setAtPath<T>(obj: T, path: string, value: unknown): T` — незмінні, шлях `a.b.0.c`, `undefined` видаляє ключ;
  - `validateAbilities(list: unknown[]): { ok: boolean; errorsByPath: Record<string, string[]> }` — ключ `"0.effects.1.amount"`;
  - `withFreshIds(list: Ability[], taken: string[]): Ability[]` — id `a1`, `a2`, … без колізій;
  - `newAbility(taken: string[]): Ability`.
- Produces (`templates.ts`): `ABILITY_TEMPLATES: readonly { id: string; label: string; hint: string; build: () => Omit<Ability, "id"> }[]`.

- [ ] **Step 1: Тести**

```ts
// lib/utils/abilities/__tests__/templates.test.ts
import { describe, expect, it } from "vitest";

import { describeAbility } from "@/lib/utils/abilities/registry/effects";
import { AbilitySchema } from "@/lib/utils/abilities/schema";
import { ABILITY_TEMPLATES } from "@/lib/utils/abilities/templates";

describe("templates", () => {
  it("кожен шаблон валідний і має опис", () => {
    expect(ABILITY_TEMPLATES.map((t) => t.id)).toEqual(["stats", "damage", "onHit", "resistance", "aura", "survive", "bonusAction", "spellSlots", "custom"]);

    for (const t of ABILITY_TEMPLATES) {
      const a = { id: "a1", ...t.build() };

      expect(AbilitySchema.safeParse(a).success, t.id).toBe(true);
      expect(describeAbility(a).length).toBeGreaterThan(0);
    }
  });
});
```

```ts
// lib/utils/abilities/__tests__/editor.test.ts
import { describe, expect, it } from "vitest";

import {
  allowedEffectKinds,
  changeEffectKind,
  changeTriggerEvent,
  getAtPath,
  newAbility,
  newEffect,
  newTrigger,
  setAtPath,
  validateAbilities,
  withFreshIds,
} from "@/lib/utils/abilities/editor";
import { AbilitySchema, type EffectKind, type TriggerEvent } from "@/lib/utils/abilities/schema";
import { EFFECT_REGISTRY } from "@/lib/utils/abilities/registry/effects";
import { TRIGGER_REGISTRY } from "@/lib/utils/abilities/registry/triggers";

const EVENTS = Object.keys(TRIGGER_REGISTRY) as TriggerEvent[];

const KINDS = Object.keys(EFFECT_REGISTRY) as EffectKind[];

describe("editor helpers", () => {
  it("newEffect валідний для кожного виду в кожному дозволеному тригері", () => {
    for (const event of EVENTS) {
      const trigger = newTrigger(event);

      for (const kind of allowedEffectKinds(trigger)) {
        const a = { id: "a", name: "Т", trigger, effects: [newEffect(kind, trigger)] };

        expect(AbilitySchema.safeParse(a).success, `${event}/${kind}`).toBe(true);
      }
    }
  });

  it("пасивка не пропонує нестатичні ефекти", () => {
    expect(allowedEffectKinds({ event: "passive" })).toEqual(["modifyStat", "damageBonus", "flag", "note"]);
    expect(allowedEffectKinds({ event: "turnStart" })).toEqual(KINDS);
  });

  it("changeEffectKind зберігає сумісну ціль", () => {
    const trigger = newTrigger("hit");

    const dot = newEffect("dot", trigger);

    const next = changeEffectKind({ ...dot, target: "allEnemies" } as typeof dot, "applyCondition", trigger);

    expect(next).toMatchObject({ kind: "applyCondition", target: "allEnemies" });
  });

  it("changeTriggerEvent на пасивку прибирає ліміти й тривалості", () => {
    const a = { id: "a", name: "Т", trigger: newTrigger("hit"), limits: { perBattle: 1 }, effects: [{ kind: "modifyStat" as const, stat: "armor" as const, flat: 1, duration: { rounds: 1 }, target: "eventTarget" as const }] };

    const p = changeTriggerEvent(a, "passive");

    expect(p.limits).toBeUndefined();
    expect(p.effects[0]).toEqual({ kind: "modifyStat", stat: "armor", flat: 1 });
    expect(changeTriggerEvent(p, "hit").effects[0]).toMatchObject({ duration: { rounds: 1 } });
  });

  it("setAtPath / getAtPath", () => {
    const o = { filter: { kind: "melee" }, percent: 10 };

    const n = setAtPath(o, "filter.kind", "ranged");

    expect(n).toEqual({ filter: { kind: "ranged" }, percent: 10 });
    expect(o.filter.kind).toBe("melee");
    expect(getAtPath(n, "filter.kind")).toBe("ranged");
    expect(setAtPath(o, "percent", undefined)).toEqual({ filter: { kind: "melee" } });
  });

  it("validateAbilities — шляхи помилок", () => {
    const r = validateAbilities([newAbility([]), { id: "x", name: "Б", trigger: { event: "passive" }, effects: [{ kind: "heal", amount: 5 }] }]);

    expect(r.ok).toBe(false);
    expect(Object.keys(r.errorsByPath)).toContain("1.effects.0");
  });

  it("withFreshIds — без колізій", () => {
    const base = { name: "Т", trigger: { event: "passive" as const }, effects: [{ kind: "note" as const, text: "x" }] };

    const out = withFreshIds([{ id: "a1", ...base }, { id: "a1", ...base }], ["a1", "a2"]);

    expect(out.map((a) => a.id)).toEqual(["a3", "a4"]);
  });
});
```

- [ ] **Step 2: FAIL**

- [ ] **Step 3: Реалізація `editor.ts`**

```ts
import { AbilitiesSchema, type Ability, type Effect, type EffectKind, isActionScopedTrigger, isStaticEffect, type Trigger, type TriggerEvent } from "@/lib/utils/abilities/schema";

const STATIC_KINDS: EffectKind[] = ["modifyStat", "damageBonus", "flag", "note"];

const ALL_KINDS: EffectKind[] = ["modifyStat", "damageBonus", "flag", "note", "grantAction", "dealDamage", "heal", "dot", "applyCondition", "restoreSpellSlot", "changeMorale", "cleanse", "randomOf"];

const PASSIVE_TARGETS = new Set(["self", "allAllies", "allEnemies"]);

export function allowedEffectKinds(trigger: Trigger): EffectKind[] {
  return trigger.event === "passive" ? STATIC_KINDS : ALL_KINDS;
}

function baseEffect(kind: EffectKind): Effect {
  switch (kind) {
    case "modifyStat":
      return { kind, stat: "armor", flat: 1 };
    case "damageBonus":
      return { kind, filter: { kind: "all" }, percent: 10 };
    case "flag":
      return { kind, flag: "advantage", attackKind: "all" };
    case "note":
      return { kind, text: "Опис" };
    case "grantAction":
      return { kind, refreshAction: true };
    case "dealDamage":
      return { kind, amount: "1d6", target: "eventTarget" };
    case "heal":
      return { kind, amount: "1d8" };
    case "dot":
      return { kind, damagePerRound: "1d4", damageType: "bleed", duration: { rounds: 2 }, target: "eventTarget" };
    case "applyCondition":
      return { kind, condition: "no_reaction", duration: { rounds: 1 }, target: "eventTarget" };
    case "restoreSpellSlot":
      return { kind, count: 1 };
    case "changeMorale":
      return { kind, delta: 1 };
    case "cleanse":
      return { kind };
    case "randomOf":
      return { kind, options: [{ kind: "heal", amount: "1d4" }, { kind: "changeMorale", delta: 1 }] };
  }
}

function fitToTrigger(effect: Effect, trigger: Trigger): Effect {
  if (trigger.event === "passive") {
    const next = { ...effect } as Record<string, unknown>;

    delete next.duration;

    if (typeof next.target === "string" && !PASSIVE_TARGETS.has(next.target)) delete next.target;

    return next as Effect;
  }

  if (isStaticEffect(effect) && !effect.duration && !isActionScopedTrigger(trigger)) return { ...effect, duration: { rounds: 1 } };

  return effect;
}

export function newEffect(kind: EffectKind, trigger: Trigger): Effect {
  return fitToTrigger(baseEffect(kind), trigger);
}

export function changeEffectKind(effect: Effect, kind: EffectKind, trigger: Trigger): Effect {
  const next = baseEffect(kind) as Record<string, unknown>;

  const old = effect as Record<string, unknown>;

  if ("target" in old && old.target !== undefined && kind !== "note" && kind !== "randomOf") next.target = old.target;

  return fitToTrigger(next as Effect, trigger);
}

export function newTrigger(event: TriggerEvent): Trigger {
  switch (event) {
    case "attack":
      return { event, phase: "before", role: "attacker" };
    case "hit":
      return { event, role: "attacker" };
    case "kill":
      return { event, role: "killer" };
    case "spellCast":
      return { event, phase: "after", role: "caster" };
    case "moraleCheck":
      return { event, result: "success", whose: "self" };
    default:
      return { event } as Trigger;
  }
}

export function changeTriggerEvent(ability: Ability, event: TriggerEvent): Ability {
  const trigger = newTrigger(event);

  const { limits, ...rest } = ability;

  return { ...rest, ...(event !== "passive" && limits && { limits }), trigger, effects: ability.effects.map((e) => fitToTrigger(e, trigger)) };
}

const segs = (path: string) => path.split(".").filter(Boolean);

export function getAtPath(obj: unknown, path: string): unknown {
  return segs(path).reduce<unknown>((acc, k) => (acc && typeof acc === "object" ? (acc as Record<string, unknown>)[k] : undefined), obj);
}

export function setAtPath<T>(obj: T, path: string, value: unknown): T {
  const [head, ...tail] = segs(path);

  const src = (obj ?? {}) as Record<string, unknown> | unknown[];

  const copy = (Array.isArray(src) ? [...src] : { ...src }) as Record<string, unknown>;

  if (tail.length === 0) {
    if (value === undefined) delete copy[head];
    else copy[head] = value;
  } else {
    copy[head] = setAtPath(copy[head], tail.join("."), value);
  }

  return copy as T;
}

export function validateAbilities(list: unknown[]): { ok: boolean; errorsByPath: Record<string, string[]> } {
  const r = AbilitiesSchema.safeParse(list);

  if (r.success) return { ok: true, errorsByPath: {} };

  const errorsByPath: Record<string, string[]> = {};

  for (const issue of r.error.issues) (errorsByPath[issue.path.join(".")] ??= []).push(issue.message);

  return { ok: false, errorsByPath };
}

export function withFreshIds(list: Ability[], taken: string[]): Ability[] {
  const used = new Set(taken);

  let n = 1;

  return list.map((a) => {
    while (used.has(`a${n}`)) n++;

    const id = `a${n}`;

    used.add(id);

    return { ...a, id };
  });
}

export function newAbility(taken: string[]): Ability {
  return withFreshIds([{ id: "", name: "Нове вміння", trigger: { event: "passive" }, effects: [{ kind: "modifyStat", stat: "armor", flat: 1 }] }], taken)[0];
}
```

Поле `target` у `cleanse` за замовчуванням не задане, тож ціль — `self`, як і в схемі. Для `cleanse` при непасивному тригері DM сам вибирає ціль.

- [ ] **Step 4: Реалізація `templates.ts`**

```ts
import type { Ability } from "@/lib/utils/abilities/schema";

type Template = { id: string; label: string; hint: string; build: () => Omit<Ability, "id"> };

export const ABILITY_TEMPLATES: readonly Template[] = [
  { id: "stats", label: "Пасивний бонус статів", hint: "+Сила, +AC, +HP… завжди", build: () => ({ name: "Бонус статів", trigger: { event: "passive" }, effects: [{ kind: "modifyStat", stat: "armor", flat: 1 }] }) },
  { id: "damage", label: "Бонус шкоди", hint: "+% / +число до ближньої, дальньої, магії (школа)", build: () => ({ name: "Бонус шкоди", trigger: { event: "passive" }, effects: [{ kind: "damageBonus", filter: { kind: "melee" }, percent: 10 }] }) },
  { id: "onHit", label: "Ефект при влучанні", hint: "DOT, дебаф, стан на ціль", build: () => ({ name: "Кровотеча", trigger: { event: "hit", role: "attacker" }, effects: [{ kind: "dot", damagePerRound: "1d4", damageType: "bleed", duration: { rounds: 2 }, target: "eventTarget" }] }) },
  { id: "resistance", label: "Опір / імунітет", hint: "фізичний, магічний, стихія, заклинання", build: () => ({ name: "Опір", trigger: { event: "passive" }, effects: [{ kind: "flag", flag: "resistance", damageType: "physical", percent: 25 }] }) },
  { id: "aura", label: "Аура", hint: "бонус усім союзникам / штраф ворогам", build: () => ({ name: "Аура", trigger: { event: "passive" }, effects: [{ kind: "modifyStat", stat: "armor", flat: 1, target: "allAllies" }] }) },
  { id: "survive", label: "Раз за бій: вижити з 1 HP", hint: "летальна шкода → 1 HP", build: () => ({ name: "Невмирущий", trigger: { event: "lethalDamage" }, limits: { perBattle: 1 }, effects: [{ kind: "heal", amount: 1, revive: true }] }) },
  { id: "bonusAction", label: "Бонусна дія", hint: "кнопка гравця: лікування, мораль, слот…", build: () => ({ name: "Друге дихання", trigger: { event: "bonusAction" }, limits: { perBattle: 1 }, effects: [{ kind: "heal", amount: "1d10" }] }) },
  { id: "spellSlots", label: "Слоти заклинань", hint: "+N слотів рівня", build: () => ({ name: "Слоти", trigger: { event: "passive" }, effects: [{ kind: "modifyStat", stat: "spellSlots", spellLevels: [1], flat: 1 }] }) },
  { id: "custom", label: "Власне", hint: "порожнє вміння", build: () => ({ name: "Нове вміння", trigger: { event: "passive" }, effects: [{ kind: "note", text: "Опишіть вміння" }] }) },
];
```

- [ ] **Step 5: PASS, коміт**

```bash
pnpm test:run lib/utils/abilities && pnpm lint --fix lib/utils/abilities && git add -A && git commit -m "feat(abilities): editor helpers and built-in templates"
```

---

### Task 6: API — читання з `abilities`, запис напряму, джерела для копіювання, кінець подвійного запису

**Files:**
- Modify:
  - `lib/utils/abilities/legacy/read.ts`;
  - скіли: `app/api/campaigns/[id]/skills/{route.ts,create-skill-schema.ts}`, `skills/[skillId]/{route.ts,update-skill-schema.ts,build-skill-update-data.ts,format-skill-response.ts}`, `skills/[skillId]/duplicate/route.ts`;
  - раси: `races/{route.ts,[raceId]/route.ts}`, `lib/schemas/races.ts`;
  - артефакти: `artifacts/{route.ts,[artifactId]/route.ts,schemas.ts}`;
  - сети: `artifact-sets/{route.ts,[setId]/route.ts,schemas.ts}`, `lib/utils/artifacts/artifact-set-queries.ts`;
  - юніти: `units/{route.ts,[unitId]/route.ts}`, `lib/schemas/units.ts`;
  - сторінки й типи: `app/campaigns/[id]/dm/{races/[raceId],artifact-sets/[setId],artifacts/[artifactId]}/page.tsx`, `types/{skills,units,races}.ts`, `lib/api/{artifacts,artifact-sets}.ts`.
- Create: `app/api/campaigns/[id]/abilities/sources/route.ts`, `app/api/campaigns/[id]/abilities/[kind]/[ownerId]/route.ts`, `lib/api/abilities.ts`
- Delete: `lib/utils/abilities/legacy/sync.ts`
- Test: `app/api/__tests__/abilities-api.test.ts`; оновити `app/api/__tests__/skills-api.test.ts` (прибрати очікування `skill.update` з sync)

**Interfaces:**
- Produces:
  - `type OwnerKind = "skill" | "race" | "artifact" | "artifactSet" | "unit"`;
  - `readAbilities(kind: OwnerKind, row): { abilities: Ability[]; issues: ConversionIssue[] }` у `legacy/read.ts`. Якщо колонка валідна, `issues` порожній. Якщо `NULL`, повертаються issues конвертера. Якщо колонка невалідна, повертаються issues конвертера плюс `{ severity: "loss", message: "Дані вмінь у колонці невалідні — показано перенесене зі старого формату" }`;
  - `GET /api/campaigns/:id/abilities/sources` (DM): `{ sources: { kind: OwnerKind; id: string; name: string }[] }`, лише `id`/`name`, відсортовано за kind і name;
  - `GET /api/campaigns/:id/abilities/:kind/:ownerId` (DM): `{ abilities: Ability[] }`, 404, якщо немає;
  - `lib/api/abilities.ts`: `getAbilitySources(campaignId)`, `getOwnerAbilities(campaignId, kind, ownerId)`;
  - детальні відповіді додають `abilities: Ability[]` і `abilityIssues: ConversionIssue[]`;
  - тіла POST/PATCH отримують `abilities?: Ability[]`.

- [ ] **Step 1: Тести**

```ts
// app/api/__tests__/abilities-api.test.ts
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/utils/api/api-auth", () => ({
  requireDM: vi.fn(async () => ({ userId: "u1" })),
  requireCampaignAccess: vi.fn(async () => ({ userId: "u1" })),
  validateCampaignOwnership: vi.fn(() => null),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    skill: { findUnique: vi.fn(), findMany: vi.fn(async () => [{ id: "s1", name: "Лють" }]), update: vi.fn(), create: vi.fn() },
    race: { findMany: vi.fn(async () => []), findFirst: vi.fn() },
    artifact: { findMany: vi.fn(async () => []), findFirst: vi.fn() },
    artifactSet: { findMany: vi.fn(async () => []), findFirst: vi.fn() },
    unit: { findMany: vi.fn(async () => [{ id: "u1", name: "Гоблін" }]), findFirst: vi.fn() },
  },
}));

import { prisma } from "@/lib/db";

const ctx = (params: Record<string, string>) => ({ params: Promise.resolve({ id: "c1", ...params }) });

const req = (url: string, init?: RequestInit) => new Request(`http://localhost${url}`, init);

describe("abilities API", () => {
  beforeEach(() => vi.clearAllMocks());

  it("sources — лише id і name", async () => {
    const { GET } = await import("@/app/api/campaigns/[id]/abilities/sources/route");

    const res = await GET(req("/api/campaigns/c1/abilities/sources"), ctx({}));

    const body = await res.json();

    expect(body.sources).toEqual([
      { kind: "skill", id: "s1", name: "Лють" },
      { kind: "unit", id: "u1", name: "Гоблін" },
    ]);
    expect(vi.mocked(prisma.skill.findMany)).toHaveBeenCalledWith(expect.objectContaining({ select: { id: true, name: true } }));
  });

  it("GET skill detail з NULL у колонці — сконвертовані abilities + abilityIssues", async () => {
    vi.mocked(prisma.skill.findUnique).mockResolvedValue({
      id: "s1", campaignId: "c1", name: "Лють", abilities: null, combatStats: { effects: [{ stat: "weird", type: "flat", value: 1 }] }, bonuses: {}, skillTriggers: [],
    } as never);

    const { GET } = await import("@/app/api/campaigns/[id]/skills/[skillId]/route");

    const body = await (await GET(req("/api/campaigns/c1/skills/s1"), ctx({ skillId: "s1" }))).json();

    expect(body.abilities[0].effects[0]).toEqual({ kind: "note", text: "weird: 1" });
    expect(body.abilityIssues.length).toBeGreaterThan(0);
  });

  it("PATCH skill з abilities пише колонку; без abilities — не чіпає", async () => {
    vi.mocked(prisma.skill.findUnique).mockResolvedValue({ id: "s1", campaignId: "c1", name: "Лють" } as never);
    vi.mocked(prisma.skill.update).mockResolvedValue({ id: "s1", campaignId: "c1", name: "Лють", abilities: [] } as never);

    const { PATCH } = await import("@/app/api/campaigns/[id]/skills/[skillId]/route");

    const abilities = [{ id: "a1", name: "Лють", trigger: { event: "passive" }, effects: [{ kind: "damageBonus", filter: { kind: "melee" }, percent: 10 }] }];

    await PATCH(req("/api/campaigns/c1/skills/s1", { method: "PATCH", body: JSON.stringify({ abilities }) }), ctx({ skillId: "s1" }));

    expect(vi.mocked(prisma.skill.update).mock.calls[0][0].data).toMatchObject({ abilities });

    vi.mocked(prisma.skill.update).mockClear();

    await PATCH(req("/api/campaigns/c1/skills/s1", { method: "PATCH", body: JSON.stringify({ mainSkillData: { mainSkillId: "m1" } }) }), ctx({ skillId: "s1" }));

    expect(vi.mocked(prisma.skill.update)).toHaveBeenCalledTimes(1);
    expect(vi.mocked(prisma.skill.update).mock.calls[0][0].data).not.toHaveProperty("abilities");
  });

  it("PATCH з невалідними abilities → 400 з path", async () => {
    vi.mocked(prisma.skill.findUnique).mockResolvedValue({ id: "s1", campaignId: "c1", name: "Лють" } as never);

    const { PATCH } = await import("@/app/api/campaigns/[id]/skills/[skillId]/route");

    const bad = [{ id: "a1", name: "Б", trigger: { event: "passive" }, effects: [{ kind: "heal", amount: 5 }] }];

    const res = await PATCH(req("/api/campaigns/c1/skills/s1", { method: "PATCH", body: JSON.stringify({ abilities: bad }) }), ctx({ skillId: "s1" }));

    expect(res.status).toBe(400);
    expect(JSON.stringify(await res.json())).toContain('"abilities"');
  });
});
```

Мок `requireDM` і `requireCampaignAccess` взяти з `app/api/__tests__/skills-api.test.ts` (там вони повертають `{ userId }` або `NextResponse`). Якщо форма повернення інша, скопіювати її звідти.

- [ ] **Step 2: FAIL**

Run: `pnpm test:run app/api/__tests__/abilities-api.test.ts`

- [ ] **Step 3: `legacy/read.ts`**

```ts
export type OwnerKind = "skill" | "race" | "artifact" | "artifactSet" | "unit";

const CONVERTERS: Record<OwnerKind, (row: never) => ConversionResult> = {
  skill: convertLegacySkill as never,
  race: ((r: never) => convertLegacyRace(r)) as never,
  artifact: ((r: never) => convertLegacyArtifact(r)) as never,
  artifactSet: ((r: never) => convertLegacyArtifactSet(r)) as never,
  unit: convertLegacyUnit as never,
};

export function readAbilities(kind: OwnerKind, row: { id: string; abilities?: unknown }): { abilities: Ability[]; issues: ConversionIssue[] } {
  const parsed = parseAbilities(row.abilities);

  if (parsed) return { abilities: parsed, issues: [] };

  const converted = CONVERTERS[kind](row as never);

  const invalid = row.abilities !== null && row.abilities !== undefined;

  return {
    abilities: converted.abilities,
    issues: invalid ? [{ severity: "loss", message: "Дані вмінь у колонці невалідні — показано перенесене зі старого формату" }, ...converted.issues] : converted.issues,
  };
}
```

Наявні `skillAbilities` та інші функції лишити як тонкі обгортки (`read(row, …)`), бо їх використовує побудова учасника.

- [ ] **Step 4: Читання в роутах і сторінках**

- `format-skill-response.ts`: додати до об'єкта `...(() => { const r = readAbilities("skill", skill); return { abilities: r.abilities, abilityIssues: r.issues }; })()`. Тип параметра розширити на `abilities?: unknown`.
- `artifacts/[artifactId]/route.ts` GET і `units/[unitId]/route.ts` GET: відповідь = рядок + `abilities` + `abilityIssues` з `readAbilities`.
- `races/[raceId]/route.ts` GET і `artifact-sets/[setId]/route.ts` GET: те саме.
- Сторінки `dm/races/[raceId]`, `dm/artifact-sets/[setId]`, `dm/artifacts/[artifactId]`: передати у форму `abilities` і `abilityIssues` з `readAbilities`. Пропси форм отримують ці поля в Tasks 10–11. Тут лише обчислити їх і передати, позначивши на час проміжних комітів ESLint-коментарем лише там, де TS вимагає, або додати пропси у форми як необов'язкові вже тепер.
- Типи: `types/skills.ts` `GroupedSkill` і `Skill`, `types/units.ts` `Unit`, `types/races.ts` `Race` отримують `abilities?: Ability[]` і `abilityIssues?: ConversionIssue[]`. Типи артефакту й сету в `lib/api/*` — так само.

- [ ] **Step 5: Запис**

Схеми:
- `create-skill-schema.ts` і `update-skill-schema.ts`: додати `abilities: AbilitiesSchema.optional()`. Прибрати `skillTriggers`, `bonuses`, `combatStats` (повністю — форма його більше не шле). Також прибрати з `spellEnhancementData` лише нічого: покращення заклинань лишаються.
- `lib/schemas/races.ts`: `abilities` optional. `passiveAbility` лишається (опис, `statModifiers`).
- `artifacts/schemas.ts`: `abilities` optional. Прибрати `bonuses`, `modifiers`, `passiveAbility`.
- `artifact-sets/schemas.ts`: `abilities` optional. `setBonus` звузити до `z.object({ name: z.string().optional(), description: z.string().optional() }).nullable().optional()`.
- `lib/schemas/units.ts`: `abilities` optional. Прибрати `specialAbilities`.

Роути:
- POST: `abilities: data.abilities ? abilitiesJson(data.abilities) : undefined` у `data`. Якщо `abilities` не передано, колонка лишається `NULL` (запасний варіант на час читання).
- PATCH: `...(data.abilities !== undefined && { abilities: abilitiesJson(data.abilities) })`.
- Скіли: у `skills/route.ts` POST прибрати запис legacy-колонок `damage/armor/speed/physicalResistance/magicalResistance/bonuses/combatStats/skillTriggers`. `build-skill-update-data.ts` прибирає дзеркалення цих полів і додає `abilities`.
- Скіл duplicate: `abilities: abilitiesJson(skillAbilities(source))`.
- Видалити всі виклики `sync*Abilities`. Знайти їх так: `grep -rn "sync[A-Za-z]*Abilities" app lib`. Видалити `lib/utils/abilities/legacy/sync.ts`.
- `artifact-set-queries.ts`: прибрати `syncArtifactSetAbilities`. `insertArtifactSet` і `updateArtifactSetRow` приймають `abilities?` і пишуть колонку.
- `units/import/route.ts` лишається з конвертером, бо імпорт приходить у старому форматі.

Нові роути:

```ts
// app/api/campaigns/[id]/abilities/sources/route.ts
import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { requireDM } from "@/lib/utils/api/api-auth";
import { handleApiError } from "@/lib/utils/api/error-handler";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    const auth = await requireDM(id);

    if (auth instanceof NextResponse) return auth;

    const where = { campaignId: id };

    const select = { id: true, name: true } as const;

    const [skills, races, artifacts, sets, units] = await Promise.all([
      prisma.skill.findMany({ where, select }),
      prisma.race.findMany({ where, select }),
      prisma.artifact.findMany({ where, select }),
      prisma.artifactSet.findMany({ where, select }),
      prisma.unit.findMany({ where, select }),
    ]);

    const tag = (kind: string, rows: { id: string; name: string }[]) => rows.map((r) => ({ kind, id: r.id, name: r.name })).sort((a, b) => a.name.localeCompare(b.name, "uk"));

    return NextResponse.json({ sources: [...tag("skill", skills), ...tag("race", races), ...tag("artifact", artifacts), ...tag("artifactSet", sets), ...tag("unit", units)] });
  } catch (error) {
    return handleApiError(error, { action: "list ability sources" });
  }
}
```

`abilities/[kind]/[ownerId]/route.ts` працює так:
- знаходить рядок через `findFirst({ where: { id: ownerId, campaignId: id } })` у таблиці за kind;
- повертає `{ abilities: readAbilities(kind, row).abilities }`;
- для невідомого kind повертає 400, для відсутнього рядка — 404.

`lib/api/abilities.ts` використовує той самий `fetch`-хелпер, що й `lib/api/skills.ts` (подивитися `createCampaignCrudApi` / `apiFetch`):

```ts
export const getAbilitySources = (campaignId: string) => apiGet<{ sources: AbilitySourceRef[] }>(`/api/campaigns/${campaignId}/abilities/sources`);

export const getOwnerAbilities = (campaignId: string, kind: OwnerKind, ownerId: string) => apiGet<{ abilities: Ability[] }>(`/api/campaigns/${campaignId}/abilities/${kind}/${ownerId}`);
```

Тип `AbilitySourceRef { kind: OwnerKind; id: string; name: string }` додати в `types/abilities.ts`.

- [ ] **Step 6: PASS**

Run: `pnpm test:run app/api lib && pnpm exec tsc --noEmit -p .`
Expected: PASS. Старі тести, що очікували `skill.update` після create (sync), оновити: тепер `create` пише `abilities` у тому ж виклику, якщо їх передано.

- [ ] **Step 7: Коміт**

```bash
pnpm lint --fix app lib types && git add -A && git commit -m "feat(abilities): edit endpoints read and write abilities directly; drop dual-write"
```

---

### Task 7: Поля і картка ефекту

**Files:**
- Create: `components/abilities/fields/{FieldRenderer,NumberField,TextField,SelectInput,ToggleField,AmountField,FlatField,DurationField,NumberListField,MultiSelectField,SpellPickerField}.tsx`, `components/abilities/EffectCard.tsx`, `components/abilities/effect-renderers/{FlagEditor,RandomOfEditor}.tsx`, `components/abilities/editor-context.tsx`
- Test: `components/abilities/__tests__/EffectCard.test.tsx`

**Interfaces:**
- Produces:
  - `AbilityEditorContext { campaignId: string; errorsByPath: Record<string, string[]> }` + `useAbilityEditor()`. Контекст потрібен, щоб не прокидати `campaignId` і помилки через 4 рівні;
  - `FieldRenderer({ meta, value, onChange, errorPath })`, де `value` — значення поля, а `errorPath` — повний шлях для помилок;
  - `EffectCard({ effect, trigger, path, onChange, onRemove })`, де `path`, наприклад, `"2.effects.0"`.

- [ ] **Step 1: Тест**

```tsx
// @vitest-environment happy-dom
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { EffectCard } from "@/components/abilities/EffectCard";
import { AbilityEditorProvider } from "@/components/abilities/editor-context";
import type { Effect } from "@/lib/utils/abilities/schema";

function renderCard(effect: Effect, onChange = vi.fn(), errorsByPath: Record<string, string[]> = {}) {
  render(
    <AbilityEditorProvider value={{ campaignId: "c1", errorsByPath }}>
      <EffectCard effect={effect} trigger={{ event: "hit", role: "attacker" }} path="0.effects.0" actions={{ onChange, onRemove: vi.fn() }} />
    </AbilityEditorProvider>,
  );

  return onChange;
}

describe("EffectCard", () => {
  it("показує поля з реєстру і підсумок", () => {
    renderCard({ kind: "dot", damagePerRound: "1d4", damageType: "bleed", duration: { rounds: 2 }, target: "eventTarget" });

    expect(screen.getByLabelText("Шкода/раунд (число, кубики, формула)")).toHaveValue("1d4");
    expect(screen.getByText("bleed 1d4/раунд × 2 р.")).toBeInTheDocument();
  });

  it("зміна поля → onChange з оновленим ефектом", () => {
    const onChange = renderCard({ kind: "modifyStat", stat: "armor", flat: 1, duration: { rounds: 1 } });

    fireEvent.change(screen.getByLabelText("Число / формула"), { target: { value: "3" } });

    expect(onChange).toHaveBeenCalledWith({ kind: "modifyStat", stat: "armor", flat: 3, duration: { rounds: 1 } });
  });

  it("поле, приховане visibleWhen, не показується", () => {
    renderCard({ kind: "modifyStat", stat: "armor", flat: 1, duration: { rounds: 1 } });

    expect(screen.queryByLabelText("Рівні слотів")).toBeNull();
  });

  it("помилка біля поля", () => {
    renderCard({ kind: "dot", damagePerRound: "1d4", damageType: "", duration: { rounds: 2 } } as Effect, vi.fn(), { "0.effects.0.damageType": ["Too small"] });

    expect(screen.getByText("Too small")).toBeInTheDocument();
  });

  it("невідомий вид — картка лише для читання", () => {
    renderCard({ kind: "teleport", range: 5 } as unknown as Effect);

    expect(screen.getByText("Невідомий ефект")).toBeInTheDocument();
  });
});
```

Ярлик поля `damagePerRound` — `"Шкода/раунд (число, кубики, формула)"`. У Task 4 `dot.fields[0]` має `label: "Кількість (число, кубики, формула, %)"`. Змінити його в `effects/index.ts` на `"Шкода/раунд (число, кубики, формула)"`, щоб тест і UI збігалися.

- [ ] **Step 2: FAIL**

- [ ] **Step 3: Реалізація**

`editor-context.tsx`:

```tsx
"use client";

import { createContext, useContext } from "react";

export interface AbilityEditorContextValue {
  campaignId: string;
  errorsByPath: Record<string, string[]>;
}

const Ctx = createContext<AbilityEditorContextValue>({ campaignId: "", errorsByPath: {} });

export const AbilityEditorProvider = Ctx.Provider;

export const useAbilityEditor = () => useContext(Ctx);

export function useFieldErrors(path: string): string[] {
  return useAbilityEditor().errorsByPath[path] ?? [];
}
```

`FieldRenderer.tsx` — кожен інпут отримує `id = path` і рендерить `<Label htmlFor={id}>{meta.label}</Label>`, а під ним `useFieldErrors(path)` як `<p className="text-xs text-destructive">`:

```tsx
"use client";

import { AmountField } from "./AmountField";
import { DurationField } from "./DurationField";
import { FlatField } from "./FlatField";
import { MultiSelectField } from "./MultiSelectField";
import { NumberField } from "./NumberField";
import { NumberListField } from "./NumberListField";
import { SelectInput } from "./SelectInput";
import { SpellPickerField } from "./SpellPickerField";
import { TextField } from "./TextField";
import { ToggleField } from "./ToggleField";

import { useFieldErrors } from "@/components/abilities/editor-context";
import { Label } from "@/components/ui/label";
import type { FieldMeta } from "@/lib/utils/abilities/registry/fields";
import { TARGET_LABELS } from "@/lib/utils/abilities/registry/labels";

export interface FieldProps<V = unknown> {
  id: string;
  value: V;
  onChange: (v: V | undefined) => void;
  meta: FieldMeta;
}

const TARGET_OPTIONS = Object.entries(TARGET_LABELS).map(([value, label]) => ({ value, label }));

export function FieldRenderer({ meta, value, onChange, path }: { meta: FieldMeta; value: unknown; onChange: (v: unknown) => void; path: string }) {
  const errors = useFieldErrors(path);

  const props = { id: path, value, onChange, meta } as FieldProps<never>;

  const input = (() => {
    switch (meta.input) {
      case "number":
        return <NumberField {...props} />;
      case "text":
      case "strings":
        return <TextField {...props} />;
      case "select":
        return <SelectInput {...props} />;
      case "target":
        return <SelectInput {...props} meta={{ ...meta, options: TARGET_OPTIONS, optional: true }} />;
      case "multiselect":
        return <MultiSelectField {...props} />;
      case "toggle":
        return <ToggleField {...props} />;
      case "amount":
        return <AmountField {...props} />;
      case "flat":
        return <FlatField {...props} />;
      case "duration":
        return <DurationField {...props} />;
      case "numberList":
        return <NumberListField {...props} />;
      case "spells":
        return <SpellPickerField {...props} />;
      default:
        return null;
    }
  })();

  return (
    <div className="space-y-1">
      <Label htmlFor={path} className="text-xs text-muted-foreground">
        {meta.label}
      </Label>
      {input}
      {errors.map((e) => (
        <p key={e} className="text-xs text-destructive">
          {e}
        </p>
      ))}
    </div>
  );
}
```

Інпути (кожен у своєму файлі, ≤ 40 рядків):
- `NumberField`: `<Input id type="number" value={value ?? ""} onChange={(e) => onChange(e.target.value === "" ? undefined : Number(e.target.value))} />`.
- `TextField`: `<Input id value={value ?? ""} onChange={(e) => onChange(e.target.value || undefined)} />`. Для `strings` значення — кома-розділений рядок у масиві: `split(",").map(trim).filter(Boolean)`.
- `SelectInput`: `<SelectField id value={value ?? ""} options={meta.options} allowNone={meta.optional} noneLabel="—" onValueChange={(v) => onChange(v === "" ? undefined : v)} />`. Значення `noneValue` у `SelectField` за замовчуванням — `""`; перевірити в `components/ui/select-field.tsx` і передати `noneValue=""` явно.
- `ToggleField`: `<Switch id checked={value === true} onCheckedChange={(c) => onChange(c ? true : undefined)} />`.
- `MultiSelectField`: ряд кнопок-фішок з `meta.options`, вибране підсвічене (`variant="secondary"`). Значення — масив. Для `conditionImmunity`: якщо вибрано `all`, значення `"all"`, інакше масив.
- `AmountField`: `SelectField` режиму (`number` / `dice` / `formula` / `percentEventDamage` / `percentMaxHp`) плюс `Input`. Режим визначається з поточного значення: `typeof number` → число; рядок з `DICE_RE` → кубики; `{ formula }` → формула; `{ percentOf }` → відповідний відсоток. `onChange` збирає значення назад.
- `FlatField`: режим число / формула.
- `DurationField`: число раундів → `{ rounds }`, порожньо → `undefined`.
- `NumberListField`: `"1, 2"` → `[1, 2]`.
- `SpellPickerField`: `<SpellMultiSelect campaignId={useAbilityEditor().campaignId} selectedSpellIds={value ?? []} onSelectionChange={onChange} />`.

`EffectCard.tsx`:

```tsx
"use client";

import { X } from "lucide-react";

import { FlagEditor } from "./effect-renderers/FlagEditor";
import { RandomOfEditor } from "./effect-renderers/RandomOfEditor";
import { FieldRenderer } from "./fields/FieldRenderer";

import { Button } from "@/components/ui/button";
import { SelectField } from "@/components/ui/select-field";
import { allowedEffectKinds, changeEffectKind, getAtPath, setAtPath } from "@/lib/utils/abilities/editor";
import { describeEffect, EFFECT_REGISTRY } from "@/lib/utils/abilities/registry/effects";
import type { Effect, EffectKind, Trigger } from "@/lib/utils/abilities/schema";

interface EffectCardProps {
  effect: Effect;
  trigger: Trigger;
  path: string;
  actions: { onChange: (e: Effect) => void; onRemove: () => void };
  kinds?: EffectKind[];
}

export function EffectCard({ effect, trigger, path, actions, kinds }: EffectCardProps) {
  const def = EFFECT_REGISTRY[effect.kind as EffectKind];

  if (!def) {
    return (
      <div className="rounded-md border border-dashed p-2 text-xs">
        <div className="flex items-center justify-between font-medium">
          Невідомий ефект
          <Button type="button" size="icon" variant="ghost" onClick={actions.onRemove} aria-label="Видалити ефект">
            <X className="h-4 w-4" />
          </Button>
        </div>
        <pre className="overflow-x-auto text-muted-foreground">{JSON.stringify(effect)}</pre>
      </div>
    );
  }

  const options = (kinds ?? allowedEffectKinds(trigger)).map((k) => ({ value: k, label: EFFECT_REGISTRY[k].label }));

  const set = (name: string, v: unknown) => actions.onChange(setAtPath(effect, name, v));

  const body =
    effect.kind === "flag" ? (
      <FlagEditor effect={effect} path={path} onChange={actions.onChange} />
    ) : effect.kind === "randomOf" ? (
      <RandomOfEditor effect={effect} trigger={trigger} path={path} onChange={actions.onChange} />
    ) : (
      def.fields
        .filter((f) => !f.visibleWhen || f.visibleWhen(effect as Record<string, unknown>))
        .map((f) => <FieldRenderer key={f.name} meta={f} path={`${path}.${f.name}`} value={getAtPath(effect, f.name)} onChange={(v) => set(f.name, v)} />)
    );

  return (
    <div className="space-y-2 rounded-md border bg-muted/30 p-2">
      <div className="flex items-start gap-2">
        <div className="flex-1">
          <SelectField value={effect.kind} options={options} onValueChange={(k) => actions.onChange(changeEffectKind(effect, k as EffectKind, trigger))} />
        </div>
        <Button type="button" size="icon" variant="ghost" onClick={actions.onRemove} aria-label="Видалити ефект">
          <X className="h-4 w-4" />
        </Button>
      </div>
      <div className="grid grid-cols-2 gap-2">{body}</div>
      <p className="text-xs text-primary">= {describeEffect(effect)}</p>
    </div>
  );
}
```

`FlagEditor`:
- вибір підвиду (`FLAG_LABELS`). При зміні підвиду викликається `changeEffectKind`-подібна заміна: `{ kind: "flag", flag: next, ...defaults[next], target, duration }`. Значення за замовчуванням: `advantage { attackKind: "all" }`, `resistance { damageType: "physical", percent: 25 }`, `spellImmunity { spellIds: [] }`, `counterAttack { attackKinds: ["melee"], bonusPercent: 15 }`, `conditionImmunity { conditions: "all" }`;
- поля `FLAG_FIELDS[flag]` плюс `TARGET_FIELD` і `DURATION_FIELD` через `FieldRenderer`.

`RandomOfEditor`: список `EffectCard` для `options` з `kinds = allowedEffectKinds(trigger).filter((k) => k !== "randomOf")`, кнопка «+ варіант» (`newEffect("heal", trigger)`) і ✕ на кожному варіанті. Варіантів мінімум два: кнопка ✕ вимкнена, якщо їх лише два.

- [ ] **Step 4: PASS**

Run: `pnpm test:run components/abilities`
Expected: PASS. Якщо `toHaveValue` / `toBeInTheDocument` недоступні, додати `import "@testing-library/jest-dom/vitest";` у тест, як у наявних `components/skills/__tests__/*.test.tsx` (подивитися, як вони це роблять).

- [ ] **Step 5: Коміт**

```bash
pnpm lint --fix components/abilities lib/utils/abilities && git add -A && git commit -m "feat(ability-editor): registry-driven fields and effect card"
```

---

### Task 8: Рядок уміння, список, шаблони, «Скопіювати з…»

**Files:**
- Create: `components/abilities/{AbilityListEditor,AbilityRow,AbilityTemplatePicker,AbilityCopySourcePicker,AbilitySummary,ConditionEditor}.tsx`, `components/abilities/sections/{TriggerSection,ConditionSection,LimitsSection,EffectsSection}.tsx`, `components/abilities/index.ts`, `lib/hooks/abilities/{index,useAbilitySources}.ts`
- Test: `components/abilities/__tests__/AbilityListEditor.test.tsx`

**Interfaces:**
- Produces:
  - `AbilityListEditor({ campaignId, value, onChange, issues?, onValidityChange? })`;
  - `AbilitySummary({ abilities })` — список `describeAbility` без можливості редагування;
  - `useAbilitySources(campaignId, enabled)` → TanStack `useQuery(["ability-sources", campaignId], …, { enabled, staleTime: 5 * 60_000 })`.

- [ ] **Step 1: Тест**

```tsx
// @vitest-environment happy-dom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { AbilityListEditor } from "@/components/abilities";
import type { Ability } from "@/lib/utils/abilities/schema";

vi.mock("@/lib/api/abilities", () => ({
  getAbilitySources: vi.fn(async () => ({ sources: [{ kind: "skill", id: "s9", name: "Лють" }] })),
  getOwnerAbilities: vi.fn(async () => ({ abilities: [{ id: "a1", name: "Лють", trigger: { event: "passive" }, effects: [{ kind: "damageBonus", filter: { kind: "melee" }, percent: 10 }] }] })),
}));

function Harness({ initial = [] as Ability[], issues = [] as { severity: "loss" | "behavior"; message: string }[], onValid = vi.fn() }) {
  const [value, setValue] = useState<Ability[]>(initial);

  return (
    <QueryClientProvider client={new QueryClient()}>
      <AbilityListEditor campaignId="c1" value={value} onChange={setValue} issues={issues} onValidityChange={onValid} />
      <output data-testid="json">{JSON.stringify(value)}</output>
    </QueryClientProvider>
  );
}

const json = () => JSON.parse(screen.getByTestId("json").textContent ?? "[]") as Ability[];

describe("AbilityListEditor", () => {
  it("додати з шаблону → рядок з описом", () => {
    render(<Harness />);

    fireEvent.click(screen.getByRole("button", { name: "+ Вміння" }));
    fireEvent.click(screen.getByText("Бонус шкоди"));

    expect(json()).toHaveLength(1);
    expect(screen.getByText(/шкода \(ближня\) \+10%/)).toBeInTheDocument();
  });

  it("зміна тригера на пасивку з DOT → помилка і onValidityChange(false)", async () => {
    const onValid = vi.fn();

    render(<Harness initial={[{ id: "a1", name: "Кровотеча", trigger: { event: "hit", role: "attacker" }, effects: [{ kind: "dot", damagePerRound: "1d4", damageType: "bleed", duration: { rounds: 2 }, target: "eventTarget" }] }]} onValid={onValid} />);

    fireEvent.click(screen.getByText("Кровотеча"));
    fireEvent.change(screen.getByLabelText("Подія"), { target: { value: "passive" } });

    await waitFor(() => expect(onValid).toHaveBeenLastCalledWith(false));
    expect(screen.getAllByText(/Пасивка допускає/).length).toBeGreaterThan(0);
  });

  it("видалення вміння", () => {
    render(<Harness initial={[{ id: "a1", name: "Лють", trigger: { event: "passive" }, effects: [{ kind: "note", text: "x" }] }]} />);

    fireEvent.click(screen.getByRole("button", { name: "Видалити вміння Лють" }));

    expect(json()).toEqual([]);
  });

  it("плашка втрат конвертера", () => {
    render(<Harness issues={[{ severity: "loss", message: "weird: невідомий стат" }]} />);

    expect(screen.getByText(/Перенесено зі старого формату/)).toBeInTheDocument();
    expect(screen.getByText("weird: невідомий стат")).toBeInTheDocument();
  });

  it("скопіювати двічі → унікальні id", async () => {
    render(<Harness />);

    for (let i = 0; i < 2; i++) {
      fireEvent.click(screen.getByRole("button", { name: "+ Вміння" }));
      fireEvent.click(screen.getByText("Скопіювати з…"));
      fireEvent.click(await screen.findByText("Лють"));
      await waitFor(() => expect(json()).toHaveLength(i + 1));
    }

    expect(new Set(json().map((a) => a.id)).size).toBe(2);
  });
});
```

Якщо `SelectField` (Radix Select) не реагує на `fireEvent.change` у happy-dom, `TriggerSection` використовує той самий `SelectField`. Тоді тест вибирає подію через `fireEvent.click(trigger)` → `fireEvent.click(screen.getByRole("option", { name: "Пасивно (завжди)" }))`. Такий шаблон узяти з наявних тестів, що працюють із `SelectField` (`grep -rn "SelectField" components/**/__tests__`).

- [ ] **Step 2: FAIL**

- [ ] **Step 3: Реалізація**

`AbilityListEditor.tsx`:

```tsx
"use client";

import { useEffect, useMemo, useState } from "react";

import { AbilityRow } from "./AbilityRow";
import { AbilityTemplatePicker } from "./AbilityTemplatePicker";
import { AbilityEditorProvider } from "./editor-context";

import { Accordion } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { validateAbilities, withFreshIds } from "@/lib/utils/abilities/editor";
import type { ConversionIssue } from "@/lib/utils/abilities/legacy/types";
import type { Ability } from "@/lib/utils/abilities/schema";

interface AbilityListEditorProps {
  campaignId: string;
  value: Ability[];
  onChange: (next: Ability[]) => void;
  issues?: ConversionIssue[];
  onValidityChange?: (ok: boolean) => void;
}

export function AbilityListEditor({ campaignId, value, onChange, issues = [], onValidityChange }: AbilityListEditorProps) {
  const [pickerOpen, setPickerOpen] = useState(false);

  const [open, setOpen] = useState<string[]>([]);

  const validation = useMemo(() => validateAbilities(value), [value]);

  useEffect(() => {
    onValidityChange?.(validation.ok);
  }, [validation.ok, onValidityChange]);

  const add = (items: Ability[]) => {
    const fresh = withFreshIds(items, value.map((a) => a.id));

    onChange([...value, ...fresh]);
    setOpen((o) => [...o, ...fresh.map((a) => a.id)]);
  };

  const errorCount = Object.keys(validation.errorsByPath).length;

  return (
    <AbilityEditorProvider value={{ campaignId, errorsByPath: validation.errorsByPath }}>
      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">
            Вміння ({value.length}){errorCount > 0 && <span className="ml-2 text-destructive">помилок: {errorCount}</span>}
          </h3>
          <Button type="button" size="sm" onClick={() => setPickerOpen(true)}>
            + Вміння
          </Button>
        </div>
        {issues.length > 0 && (
          <div className="rounded-md border border-amber-500/50 bg-amber-500/10 p-2 text-xs">
            <p className="font-medium">Перенесено зі старого формату — перевірте перед збереженням:</p>
            <ul className="list-disc pl-4">
              {issues.map((i) => (
                <li key={i.message}>{i.message}</li>
              ))}
            </ul>
          </div>
        )}
        <Accordion type="multiple" value={open} onValueChange={setOpen}>
          {value.map((ability, index) => (
            <AbilityRow
              key={ability.id}
              ability={ability}
              path={String(index)}
              actions={{
                onChange: (next) => onChange(value.map((a, i) => (i === index ? next : a))),
                onRemove: () => onChange(value.filter((_, i) => i !== index)),
              }}
            />
          ))}
        </Accordion>
      </section>
      <AbilityTemplatePicker open={pickerOpen} onOpenChange={setPickerOpen} onPick={add} />
    </AbilityEditorProvider>
  );
}
```

Масив `issues` стабільний (приходить з `initialData`). Ключ `i.message` не завжди унікальний, тож брати `key={`${idx}-${i.message}`}`.

`AbilityRow.tsx`:
- `AccordionItem value={ability.id}`;
- `AccordionTrigger` показує назву і під нею `describeAbility(ability)` дрібним текстом;
- поруч кнопка ✕ з `aria-label={`Видалити вміння ${ability.name}`}` (поза тригером, щоб не розгортати рядок);
- `AccordionContent` містить `Input` назви і `Textarea` опису (необов'язковий), а також секції `TriggerSection`, `ConditionSection`, `LimitsSection`, `EffectsSection`;
- кожна секція отримує `ability`, `path` і `onChange(nextAbility)`.

Секції:
- **`TriggerSection`.** `SelectField` з `id={`${path}.trigger.event`}` і підписом «Подія». Опції — `TRIGGER_REGISTRY` (`label`). Зміна викликає `changeTriggerEvent`. Під ним `FieldRenderer` для `TRIGGER_REGISTRY[event].fields` з шляхом `${path}.trigger.<name>`.
- **`ConditionSection`.** Без умови показується кнопка «+ умова», яка ставить `{ type: "hpBelow", who: "self", percent: 50 }`. Інакше — `ConditionEditor` і ✕.
- **`ConditionEditor`.** Рекурсивний: вибір типу (`CONDITION_REGISTRY`), поля з `CONDITION_REGISTRY[type].fields`. Для `all` / `any` — список вкладених `ConditionEditor` з «+ умова».
- **`LimitsSection`.** Для пасивки показує текст «Пасивка діє постійно — ліміти не застосовуються». Інакше — чотири `NumberField`: «Разів за бій», «Разів за раунд», «Разів за хід», «Шанс, %». Порожні ліміти прибираються, а `limits: {}` перетворюється на `undefined`.
- **`EffectsSection`.** Список `EffectCard` з `path={`${path}.effects.${i}`}`, кнопка «+ ефект» (`newEffect(allowedEffectKinds(trigger)[0], trigger)`). Помилки рівня ефекту (шлях `${path}.effects.${i}` без поля) показуються над карткою.

`AbilityTemplatePicker.tsx`:
- `Dialog` з `DialogTitle` «Додати вміння» і список кнопок `ABILITY_TEMPLATES` (label + hint);
- останній пункт — «Скопіювати з…»: показує `AbilityCopySourcePicker`;
- клік по шаблону: `onPick([{ id: "", ...t.build() }])`, потім `onOpenChange(false)`.

`AbilityCopySourcePicker.tsx`:
- `useAbilitySources(campaignId, true)`, `Input` пошуку (фільтр за `name`, без урахування регістру);
- групи за `kind` з підписами «Скіли», «Раси», «Артефакти», «Сети», «Юніти»;
- клік: `getOwnerAbilities(...)` → `onPick(res.abilities)`;
- поки йде завантаження, кнопки вимкнені.

`AbilitySummary.tsx`: `<ul>` з `describeAbility` для кожного вміння, для порожнього — «—».

`components/abilities/index.ts` експортує `AbilityListEditor` і `AbilitySummary`.

- [ ] **Step 4: PASS, коміт**

```bash
pnpm test:run components/abilities && pnpm lint --fix components/abilities lib/hooks && git add -A && git commit -m "feat(ability-editor): accordion editor with templates and copy-from"
```

---

### Task 9: Форма скіла на редакторі

**Files:**
- Modify: `components/skills/form/SkillCreateForm.tsx`, `lib/hooks/skills/{useSkillForm,useSkillForm-normalize,useSkillForm-payload,useSkillForm-return}.ts`, `app/campaigns/[id]/dm/skills/[skillId]/edit-skill-client.tsx` (якщо прокидає `initialData`)
- Delete: `components/skills/form/effects/**`, `components/skills/form/triggers/**`, `components/skills/__tests__/SkillEffectRow.test.tsx`
- Test: `lib/hooks/skills/__tests__/useSkillForm-payload.test.ts`

**Interfaces:**
- Consumes: `AbilityListEditor`, `GroupedSkill.abilities/abilityIssues` (Task 6).
- Produces:
  - `buildSkillFormPayload(...)` повертає `abilities` і `null` для знятих прив'язок;
  - `GroupedSkillPayload` втрачає `combatStats`, `bonuses`, `skillTriggers`.

- [ ] **Step 1: Тест payload**

```ts
import { describe, expect, it } from "vitest";

import { buildSkillFormPayload } from "@/lib/hooks/skills/useSkillForm-payload";

describe("buildSkillFormPayload", () => {
  it("abilities і null для знятих прив'язок", () => {
    const abilities = [{ id: "a1", name: "Лють", trigger: { event: "passive" as const }, effects: [{ kind: "note" as const, text: "x" }] }];

    const p = buildSkillFormPayload({
      name: "Лють", description: "", icon: "", abilities,
      spellId: "", spellGroupId: "", grantedSpellId: "", mainSkillId: "",
      spellEnhancementTypes: [], spellEffectIncrease: "", spellTargetChange: "", spellAdditionalModifier: { modifier: "", damageDice: "", duration: "" }, spellNewSpellId: "", spellAllowMultipleTargets: false, spellAoeSpellIds: [],
    });

    expect(p.abilities).toEqual(abilities);
    expect(p.spellData).toEqual({ spellId: null, spellGroupId: null, grantedSpellId: null });
    expect(p.mainSkillData).toEqual({ mainSkillId: null });
    expect(p).not.toHaveProperty("combatStats");
    expect(p).not.toHaveProperty("skillTriggers");
  });
});
```

Аргумент `buildSkillFormPayload` має відповідати наявній сигнатурі. Подивитися її у файлі й підставити ті самі поля, прибравши `effects`, `minTargets`, `maxTargets`, `affectsDamage`, `damageType`, `skillTriggers` і додавши `abilities`.

- [ ] **Step 2: FAIL**

- [ ] **Step 3: Реалізація**

`useSkillForm.ts`:
- прибрати стани `effects`, `minTargets`, `maxTargets`, `affectsDamage`, `damageType`, `skillTriggers`;
- додати `const [abilities, setAbilities] = useState<Ability[]>(normalizedData?.abilities ?? [])` і `const [abilitiesValid, setAbilitiesValid] = useState(true)`;
- у `handleSubmit` повернутися без запиту, якщо `!abilitiesValid`;
- серверну 400 з `error: issues[]`, де `path[0] === "abilities"`, показати в `error` як «Помилки у вміннях: …». Підсвітку полів дає локальна валідація, бо схема та сама.

`useSkillForm-normalize.ts`: передати `abilities` і `abilityIssues` з `GroupedSkill`.

`useSkillForm-return.ts`: група `abilitiesGroup { abilities, issues, setAbilities, setAbilitiesValid, valid }` замість `effectsGroup`, `damageGroup` і `skillTriggers`.

`useSkillForm-payload.ts`:
- без `combatStats`, `bonuses`, `skillTriggers`; додати `abilities`;
- `spellData`: `{ spellId: spellId || null, spellGroupId: spellGroupId || null, grantedSpellId: grantedSpellId || null }`;
- `mainSkillData`: `{ mainSkillId: mainSkillId || null }`.

Перевірити, що `update-skill-schema.ts` дозволяє `null` для цих полів, а `build-skill-update-data.ts` від'єднує зв'язок при `null` (`{ disconnect: true }`). Якщо ні, дописати.

`SkillCreateForm.tsx`: прибрати `SkillEffectsEditor`, `SkillDamageAffinity`, `SkillTriggersEditor` та їхні імпорти. Після `SkillMainSkillSection` вставити:

```tsx
          <AbilityListEditor
            campaignId={campaignId}
            value={abilitiesGroup.abilities}
            onChange={abilitiesGroup.setAbilities}
            issues={abilitiesGroup.issues}
            onValidityChange={abilitiesGroup.setAbilitiesValid}
          />
```

Кнопка збереження: `disabled={isSaving || !abilitiesGroup.valid}`. Тип `initialData` спростити до `Skill | GroupedSkill`.

Видалити `components/skills/form/effects` і `triggers` разом із тестом `SkillEffectRow`. Перевірити, що нічого більше їх не імпортує: `grep -rn "form/effects\|form/triggers" components app lib`.

- [ ] **Step 4: PASS, tsc, коміт**

```bash
pnpm test:run lib/hooks components && pnpm exec tsc --noEmit -p . && pnpm lint --fix components lib && git add -A && git commit -m "feat(skills): skill form edits abilities via the registry editor"
```

---

### Task 10: Форми артефакту й сету

**Files:**
- Modify: `components/artifacts/{ArtifactForm,ArtifactCreateForm,ArtifactEditForm}.tsx`, `components/artifact-sets/ArtifactSetForm.tsx`, сторінки `app/campaigns/[id]/dm/artifacts/{new,[artifactId]}/page.tsx`, `dm/artifact-sets/{new,[setId]}/page.tsx`
- Delete: `components/artifacts/{ArtifactCombatBonusFields,ArtifactEffectScopeFields}.tsx`, `components/artifacts/artifact-combat-draft.ts`, `components/artifact-sets/{ArtifactSetBonusEditor,ExtraBonusesField,ModifiersField,PassiveEffectsField,SpellSlotsField}.tsx`, `components/artifact-sets/artifact-set-bonus-form.ts`
- Test: `components/artifacts/__tests__/ArtifactForm.test.tsx`

**Interfaces:**
- `ArtifactFormInitial` отримує `abilities: Ability[]` і `abilityIssues: ConversionIssue[]` та втрачає `bonuses`, `modifiers`, `passive*`, `effectScope`.
- Payload `onSubmit`: `{ name, description, rarity, slot, icon, setId, abilities }`.
- `ArtifactSetForm` приймає `initialAbilities`, `initialAbilityIssues`, `initialSetBonus?: { name?: string; description?: string }`. Payload: `{ name, description, icon, memberIds, setBonus: { name, description }, abilities }`.

- [ ] **Step 1: Тест**

```tsx
// @vitest-environment happy-dom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ArtifactForm } from "@/components/artifacts/ArtifactForm";

describe("ArtifactForm", () => {
  it("шле abilities і не шле старі поля бонусів", async () => {
    const onSubmit = vi.fn(async () => {});

    render(
      <QueryClientProvider client={new QueryClient()}>
        <ArtifactForm
          campaignId="c1"
          artifactSets={[]}
          mode="create"
          title="Новий артефакт"
          idPrefix="a"
          submitLabel="Створити"
          submitLabelSaving="..."
          cancelHref="/x"
          iconHint=""
          initial={{ name: "Меч", description: "", rarity: "", slot: "weapon", icon: "", setId: "", abilities: [{ id: "a1", name: "Гострота", trigger: { event: "passive" }, effects: [{ kind: "damageBonus", filter: { kind: "melee" }, flat: 2 }] }], abilityIssues: [] }}
          onSubmit={onSubmit}
        />
      </QueryClientProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Створити" }));

    await vi.waitFor(() => expect(onSubmit).toHaveBeenCalled());

    const payload = onSubmit.mock.calls[0][0] as Record<string, unknown>;

    expect(payload.abilities).toHaveLength(1);
    expect(payload).not.toHaveProperty("bonuses");
    expect(payload).not.toHaveProperty("modifiers");
    expect(payload).not.toHaveProperty("passiveAbility");
  });
});
```

Точні назви пропсів `ArtifactForm` звірити з поточним файлом (`campaignId` там міг бути відсутнім). Якщо `campaignId` немає, додати його: він потрібен редактору.

- [ ] **Step 2: FAIL**

- [ ] **Step 3: Реалізація**

`ArtifactForm.tsx`:
- прибрати стани `effectName`, `effectDescription`, `bonuses`, `modifiers`, `passiveEffects`, `effectScopeDraft` і компоненти `ArtifactCombatBonusFields`, `ArtifactEffectScopeFields`, `SkillEffectsEditor`;
- додати `abilities` / `abilitiesValid` і `<AbilityListEditor campaignId … />` після поля сету;
- кнопка збереження вимкнена, якщо вміння невалідні.

`ArtifactCreateForm` і `ArtifactEditForm`: `initial` з `abilities` (для нового — `[]`) і `abilityIssues`. Edit-сторінка передає їх з Task 6. Payload містить `abilities`.

`ArtifactSetForm.tsx`:
- прибрати `bonusForm` і `ArtifactSetBonusEditor`;
- лишити поля «Назва бонусу» й «Опис бонусу» (тепер це `setBonus.name` / `setBonus.description`);
- додати `AbilityListEditor`; сторінки передають `initialAbilities` / `initialAbilityIssues`.

Перевірити, що `artifact-set-queries.ts` (Task 6) приймає `abilities` у create/update, а `artifact-sets/[setId]/route.ts` прокидає його.

Видалити файли зі списку Delete і перевірити імпорти: `grep -rn "ArtifactCombatBonusFields\|artifact-combat-draft\|ArtifactSetBonusEditor\|artifact-set-bonus-form" components app lib`.

- [ ] **Step 4: PASS, tsc, коміт**

```bash
pnpm test:run components && pnpm exec tsc --noEmit -p . && pnpm lint --fix components app && git add -A && git commit -m "feat(artifacts): artifact and set forms edit abilities via the registry editor"
```

---

### Task 11: Форми раси й юніта

**Files:**
- Modify: `components/races/{RaceFormFields,RaceEditForm,CreateRaceDialog}.tsx`, `components/races/RaceEditFormUtils.ts`, `types/races.ts` (`RaceFormData.abilities`), `app/campaigns/[id]/dm/races/[raceId]/page.tsx`, `app/campaigns/[id]/dm/units/[unitId]/page.tsx`, `components/units/form/index.ts` (якщо є barrel)
- Delete: `components/units/form/{UnitSpecialAbilities,UnitSpecialAbility}.tsx`
- Test: `components/races/__tests__/RaceFormFields.test.tsx`

**Interfaces:**
- `RaceFormData` отримує `abilities: Ability[]`; `RaceFormFields` отримує `campaignId` і `abilityIssues?`.
- Сторінка юніта зберігає `formData.abilities` і не шле `specialAbilities`.

- [ ] **Step 1: Тест**

```tsx
// @vitest-environment happy-dom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it } from "vitest";

import { RaceFormFields } from "@/components/races/RaceFormFields";
import type { RaceFormData } from "@/types/races";

function Harness() {
  const [data, setData] = useState<RaceFormData>({ name: "Ельф", availableSkills: [], disabledSkills: [], abilities: [] });

  return (
    <QueryClientProvider client={new QueryClient()}>
      <RaceFormFields campaignId="c1" formData={data} setFormData={setData} mainSkills={[]} />
      <output data-testid="n">{data.abilities.length}</output>
    </QueryClientProvider>
  );
}

describe("RaceFormFields", () => {
  it("секція «Вміння в бою» додає вміння з шаблону", () => {
    render(<Harness />);

    expect(screen.getByText("Вміння в бою")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "+ Вміння" }));
    fireEvent.click(screen.getByText("Опір / імунітет"));

    expect(screen.getByTestId("n").textContent).toBe("1");
  });
});
```

Пропси `RaceFormFields` (`formData`, `setFormData`, `mainSkills`) звірити з файлом і підставити реальні назви.

- [ ] **Step 2: FAIL**

- [ ] **Step 3: Реалізація**

Раса:
- `RaceFormFields` після секції прогресії слотів отримує `<h3>Вміння в бою</h3>` і `AbilityListEditor`, `value={formData.abilities}`;
- `getInitialRaceFormData` бере `abilities` з даних сторінки (Task 6), для нової раси `[]`;
- `RaceEditForm` і `CreateRaceDialog` шлють `abilities` у payload;
- кнопка збереження вимкнена, якщо вміння невалідні: стан `abilitiesValid` у формі прокидається через `onValidityChange`.

Юніт (`dm/units/[unitId]/page.tsx`):
- замість `<UnitSpecialAbilities …/>` секція «Вміння» з `AbilityListEditor`, `value={formData.abilities ?? []}`;
- `onChange={(abilities) => setFormData({ ...formData, abilities })}`;
- `issues={unit.abilityIssues}`.

Старі `specialAbilities` у payload не шлемо, бо їх прибрано зі схеми. `UnitQuickStatsEditor` не шле `abilities`, тож колонку не чіпає (покрито тестом PATCH у Task 6).

Видалити `UnitSpecialAbilit{y,ies}.tsx` і перевірити імпорти.

- [ ] **Step 4: PASS, tsc, коміт**

```bash
pnpm test:run components && pnpm exec tsc --noEmit -p . && pnpm lint --fix components app types && git add -A && git commit -m "feat(races,units): race and unit forms edit abilities via the registry editor"
```

---

### Task 12: Показ умінь на картках

**Files:**
- Modify: `components/skills/list/SkillCard.tsx`, `components/skills/list/ui/{SkillCardEffectsList,SkillCardTriggersList}.tsx` (замінити або видалити), `components/artifact-sets/ArtifactSetBonusDisplay.tsx`, `components/units/list/UnitCard.tsx`, `app/campaigns/[id]/dm/print/skills/page.tsx` (+ `page-client.tsx`), а також GET-список `/skills` і `dm/skills/page.tsx`, якщо карткам потрібні `abilities`
- Delete: `components/skills/list/ui/skillCardFormatters.ts` (якщо більше не використовується)
- Test: оновити `components/skills/__tests__/SkillCard.test.tsx`

**Interfaces:**
- Consumes: `AbilitySummary`, `describeAbility`.
- Карткам у списках потрібен опис умінь. Щоб не тягнути важкі `abilities` у списки (egress), список повертає `abilitySummary: string[]`. Його рахує сервер (`readAbilities(...).abilities.map(describeAbility)`) замість `abilities`. Це кілька коротких рядків на сутність. Поле додається у формування відповіді списку скілів (`skills/route.ts` GET → `formatSkillsResponse`), у сторінки `dm/skills`, `print/skills`, сети (`listArtifactSets`) і юніти (`getCachedUnits`). Для цього `omit: { abilities: true }` у цих запитах замінюється на `select`/`omit` старих важких колонок (`combatStats`, `skillTriggers`, `bonuses`, `spellEnhancementData`), бо `abilities` потрібен для `describe`.

- [ ] **Step 1: Тест** — у `SkillCard.test.tsx` замінити перевірку старих ефектів:

```tsx
  it("показує опис умінь", () => {
    render(<SkillCard skill={{ ...baseSkill, abilitySummary: ["Пасивно · шкода (ближня) +10%"] }} {...props} />);

    expect(screen.getByText("Пасивно · шкода (ближня) +10%")).toBeInTheDocument();
  });
```

`baseSkill` і `props` — з наявного файла тесту.

- [ ] **Step 2: FAIL**

- [ ] **Step 3: Реалізація**

- `GroupedSkill.abilitySummary?: string[]`, `Unit.abilitySummary?: string[]`, тип сету — так само.
- `SkillCard`: замість `SkillCardEffectsList` / `SkillCardTriggersList` показувати `<ul>` з `skill.abilitySummary`. Старі ui-файли й `skillCardFormatters.ts` видалити, якщо `grep` не знаходить інших імпортів.
- `ArtifactSetBonusDisplay` показує `abilitySummary` сету.
- `UnitCard`: секція «Вміння» з `abilitySummary` замість спецздібностей.
- Сторінки й роути списків: обчислити `abilitySummary` на сервері через `readAbilities` + `describeAbility`.
  - Для egress замінити `omit: { abilities: true }` на `omit: { combatStats: true, skillTriggers: true, bonuses: true }` (для скілів; для юнітів — `specialAbilities`). Повертати `abilitySummary`, а не `abilities`.
  - Якщо форматувальник списку зараз використовує `combatStats` для інших полів картки, лишити ці поля і прибрати з `omit` лише те, що не потрібне. Звірити з `format-skills-response.ts`.

- [ ] **Step 4: PASS, tsc, коміт**

```bash
pnpm test:run components app && pnpm exec tsc --noEmit -p . && pnpm lint --fix components app && git add -A && git commit -m "feat(abilities): cards and print show ability summaries"
```

---

### Task 13: Чистка й фінальна перевірка

**Files:**
- Delete:
  - `lib/constants/skill-triggers.ts`;
  - невикористані частини `lib/constants/skill-effects.ts`;
  - `SkillEffect` / `SkillDamageType` у `types/battle.ts`, якщо вже ніде не використовуються;
  - `types/skill-triggers.ts`, якщо не використовується, разом із реекспортом у `types/index.ts`.
- Modify: `ARCHITECTURE.md` (розділ `components/abilities`), `CLAUDE.md` (рядок про abilities: «save routes dual-write» → «edit forms write `abilities` directly»).

- [ ] **Step 1: Пошук мертвого коду**

Run: `grep -rln "skill-triggers\|EFFECT_STAT_GROUPS\|EFFECT_TYPE_OPTIONS\|SkillEffect\b\|SkillTriggers\b" app lib components types scripts`

`scripts/import-skills-library*` використовують `types/skill-triggers` (старий формат джерела до 3c). Якщо файли лишаються потрібні, `types/skill-triggers.ts` теж лишаємо, а всі інші — видаляємо.

- [ ] **Step 2: Видалення і документація**

- Видалити знайдене мертве.
- Оновити `CLAUDE.md`: у пункті «Abilities» речення про dual-write замінити на «Edit forms write `abilities` directly through `AbilityListEditor` (`components/abilities`); the legacy read fallback stays until the contract migration».
- В `ARCHITECTURE.md` додати `components/abilities/` — редактор умінь (акордеон, поля з реєстру, шаблони, «Скопіювати з…»).

- [ ] **Step 3: Повна перевірка**

Run: `pnpm test:run && pnpm lint && pnpm exec tsc --noEmit -p . && pnpm build`
Expected: усе зелене.

- [ ] **Step 4: Ручна перевірка в браузері (dev)**

Run: `pnpm dev` на локальній БД (`pnpm db:local`, якщо вона не запущена). Перевірити:
1. Створити скіл з шаблону «Бонус шкоди» і зберегти. Відкрити ще раз: значення збереглися.
2. Відкрити наявний старий скіл, якщо він є після `pnpm seed`: показується плашка «Перенесено».
3. Ширина 375px (DevTools): картка ефекту читається, поля в 2 колонки не обрізаються.

Результат записати в ledger. Якщо локальна БД порожня, записати це як обмеження.

- [ ] **Step 5: Коміт**

```bash
git add -A && git commit -m "chore(abilities): remove legacy skill editor constants; docs"
```
