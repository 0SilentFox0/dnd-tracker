# Етап 4c-2: атаки й заклинання 5e — план реалізації

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** герой у режимі класів б'є за 5e (кубик зброї + мод., фехтувальна/метальна/універсальна/досяжність, дальність 80/320), має Додаткову атаку й бій двома зброями; криты за опцією подвоюють кубики; заклинання героя 5e рахують кубики за гранню, кантрипи за рівнем і підсилюються вищим слотом (зокрема пактом); є атака заклинанням. HOMM5 без змін.

**Architecture:** ознака `abilities.damageModel: "5e"` на snapshot героя (ставить `from-character.ts`, коли знайдено клас) — єдиний перемикач рушія. Шкода — у наявних `heroAttackDamageParts`/`heroDamageContext` + новий модуль характеристики атаки `attack/ability.ts`; властивості зброї — `BattleAttack.traits`. Додаткова атака — стат `attacksPerAction` + `battleData.attacksLeft`; друга рука — `offHand` у запиті атаки. Заклинання — нові колонки `spells` + гілка 5e у `casterSpellDice(caster, spell, castLevel)` + `slotKey` у запиті касту + розв'язка `attack`.

**Tech Stack:** TypeScript strict, Prisma 6 (PostgreSQL), Zod 4, Vitest, Next.js route handlers, TanStack Query, React 19.

**Spec:** `docs/superpowers/specs/2026-10-22-constructor-stage4-5e-design.md` (розділ «4c-2. Дизайн: атаки й заклинання 5e»; загальні правила етапу 4 і розділ 4c-1 — контекст).

## Global Constraints

- Worktree `/Users/silentfox/Work/dnd-tracker-constructor`, гілка `feat/constructor`; основну папку не чіпати; БД лише `postgresql://postgres:postgres@localhost:54322/constructor`. Міграцію застосовувати `set -a; source .env.local; set +a; pnpm exec prisma migrate deploy` (файл міграції писати вручну; **не** `migrate dev`). Ім'я міграції: `20261028000000_spell_5e_dice` (остання наявна — `20261027000000_classes`).
- **Нульова зміна поведінки HOMM5:** учасник без `abilities.damageModel` і `rules.criticals.doubleDice = false` → шкода, кидки, лог, споживання rng, валідація ідентичні. Наявні тести (до першого коміту цього плану) не редагувати, крім адитивних змін форми (`DEFAULT_RULES`, снапшоти OpenAPI/tool-schemas, межа розміру OpenAPI); падіння наявного тесту — баг нового коду.
- Нові бонуси/прапорці читаються лише через `collectModifiers`/`runAbilities` (`docs/architecture/abilities.md`); `abilities`-колонка — лише через `lib/utils/abilities/read.ts`.
- Бойові роути: Zod + `runBattleMutation` + `<action>-mutation.ts`; будь-який запис snapshot — разом із `snapshotHash` (пайплайн робить сам); відповіді — дельти.
- Компоненти не імпортують `@/lib/api/*`; ключі запитів — фабрики `keys.ts`; діалоги — `ResponsiveDialog hud`; клієнтські модулі не тягнуть zod (`lib/__tests__/client-entry-imports.test.ts`).
- Тексти помилок API — у `lib/constants/api-errors.ts`, формат `{ error, issues? }`. UI/лог українською, ідентифікатори англійською; мінімум коментарів. ESLint: padding lines, `simple-import-sort`, `import/no-cycle` (maxDepth 1).
- Тести: `pnpm test:run <file>` / `pnpm test:related <files>` під час роботи; повний `pnpm test:run` — лише в задачі 14.
- Коміти з трейлером `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`; `.superpowers/` не комітити.

## Review Focus

1. **HOMM-герой у кампанії з `classes.enabled`, але без класів** — `damageModel` не ставиться: кубики за рівнем, рівень, архетип, відмова дальньої атаки поруч з ворогом, досяжність 1 — як зараз. Тест-якір у задачі 2.
2. **Крит із `doubleDice`, коли клієнт надіслав лише один набір кубиків** — сервер докидає другий набір (rng) і позначає його в лозі «кинув сервер»; коли надіслано обидва набори — бере їх; кількість понад 2× — 400 (наявний `assertAttackRolls`). Тест у задачі 4.
3. **`attacksLeft` і HOMM-пул додаткових дій (`pendingExtraActions`)** не плутаються: атака з лічильника не витрачає ні дії, ні пулу; нова дія з пулу дає повний набір атак. Тест у задачі 6.
4. **`slotKey` нижче кола заклинання, порожній або відсутній слот, `slotKey` у HOMM-героя** — 422 з текстом; HOMM-герой із `slotKey` = звичайне коло — працює як автовибір (не ламає старі клієнти). Тест у задачі 10.
5. **Легка зброя в клітинці «Щит» у HOMM-кампанії** (класи вимкнені) — вдягання відхиляється; атака другою рукою HOMM-героя — 422. Тести в задачах 7 і 8.

---

## Карта файлів

| Файл | Відповідальність |
|---|---|
| `lib/utils/rules/{schema,defaults}.ts`, `components/rules/sections/CriticalsSection.tsx` | `criticals.doubleDice` |
| `lib/constants/weapon-traits.ts` | `WEAPON_TRAITS`, `WeaponTrait`, підписи |
| `types/battle.ts` | `BattleAttack.traits/versatileDice/hand`, `abilities.damageModel`, `battleData.attacksLeft/attackedWithLight`, `actionDetails.castLevel` |
| `lib/utils/abilities/schema/{kinds,effects}.ts`, `lib/utils/abilities/registry/labels.ts`, редактор прапорців | стат `attacksPerAction`, прапорець `twoWeaponFighting` |
| `lib/utils/artifacts/weapon-stats.ts`, `lib/constants/artifacts.ts`, `lib/schemas/units.ts`, `lib/utils/battle/participant/{extract-attacks,from-character,from-unit}.ts`, `lib/utils/battle/types/participant.ts` | властивості зброї, збирання атак 5e |
| `lib/utils/battle/attack/ability.ts` (новий) | характеристика й модифікатор атаки (HOMM / 5e / друга рука) |
| `lib/utils/battle/damage/{hero-damage,average,breakdown}.ts`, `attack/{bonus,process/compute}.ts`, `characters/sheet/lines.ts` | шкода 5e |
| `lib/utils/battle/attack/crit-dice.ts` (новий), `attack/process/run.ts`, `attack/server-attack.ts` | подвоєння кубиків крита |
| `lib/utils/battle/grid/attack-reach.ts`, `attack/bonus.ts` (`rollModeReasons`), `actions/opportunity.ts` | досяжність, дальність, ворог поруч |
| `lib/utils/battle/attack/attacks-left.ts` (новий), `attack-phase/request.ts`, `participant/helpers.ts`, `actions/run.ts`, `turn/turn-state.ts`, `view/turn-exhausted.ts` | Додаткова атака |
| `app/api/campaigns/[id]/battles/[battleId]/attack/attack-mutation.ts`, `attack-phase/request.ts` | `offHand` |
| `lib/utils/inventory/stash-actions.ts`, `app/api/.../stash/apply-stash.ts`, `app/api/.../inventory/update-inventory.ts`, `components/characters/artifacts/CharacterArtifactsSection.tsx`, `components/character-profile/stash/StashArtifactsPanel.tsx`, `lib/utils/artifacts/off-hand.ts` (новий) | легка зброя в «Щиті» |
| `prisma/schema.prisma`, `prisma/migrations/20261028000000_spell_5e_dice/migration.sql`, `lib/utils/spells/model/{schema,read,form}.ts`, `lib/schemas/spells.ts`, `lib/server/content/resources/spells.ts`, `lib/server/spells/book-spells-by-ids.ts`, `lib/utils/spells/to-book-spell.ts`, `types/spells.ts`, `components/spells/form/SpellFormPowerFields.tsx` | поля заклинання 5e |
| `lib/utils/spells/model/dice.ts`, `lib/utils/battle/spell/{caster-dice,slot}.ts`, `spell/cast/*`, `app/api/.../spell/{cast-spell-schema,spell-mutation}.ts`, `types/api.ts` | кубики 5e, `slotKey`, атака заклинанням |
| `lib/hooks/battle/{useAttackWizard,useSpellBook}.ts`, `lib/utils/battle/flows/spell-flow.ts`, `components/battle/wizards/**`, `components/battle/**/BonusActionPicker.tsx`, `components/artifacts/ArtifactWeaponFields.tsx`, `components/units/form/UnitAttack.tsx` | UI |

---

### Task 1: Каркас — правила, типи, стат і прапорець

**Files:** modify `lib/utils/rules/schema.ts` (`criticals.doubleDice: z.boolean().default(false)`), `lib/utils/rules/defaults.ts`, `components/rules/sections/CriticalsSection.tsx` (перемикач «Подвоєння кубиків на криті» з описом «Крит подвоює кубики шкоди (зброя, атака заклинанням); модифікатори не подвоюються»); create `lib/constants/weapon-traits.ts`; modify `types/battle.ts`, `lib/utils/battle/types/participant.ts` (`ExtractedAttack` + ті самі поля), `lib/utils/abilities/schema/kinds.ts` (`DYNAMIC_STATS` + `"attacksPerAction"`), `lib/utils/abilities/schema/effects.ts` (прапорець `twoWeaponFighting`), `lib/utils/abilities/registry/labels.ts` (підписи стату/прапорця); test `lib/utils/rules/__tests__/schema-4c2.test.ts`, `lib/utils/abilities/__tests__/schema-4c2.test.ts`; адитивно оновити очікуваний `DEFAULT_RULES` у `lib/utils/rules/__tests__/schema.test.ts`, якщо він порівнюється цілком.

**Interfaces — Produces:**

```ts
// lib/constants/weapon-traits.ts
export const WEAPON_TRAITS = ["light", "finesse", "twoHanded", "versatile", "reach", "thrown", "ammunition"] as const;
export type WeaponTrait = (typeof WEAPON_TRAITS)[number];
export const WEAPON_TRAIT_LABELS: Record<WeaponTrait, string> = {
  light: "Легка", finesse: "Фехтувальна", twoHanded: "Дворучна", versatile: "Універсальна",
  reach: "Досяжність", thrown: "Метальна", ammunition: "Боєприпаси",
};

// types/battle.ts
interface BattleAttack { /* … */ traits?: WeaponTrait[]; versatileDice?: string; hand?: "off" }
// BattleParticipant["abilities"]
damageModel?: "5e";
// BattleParticipant["battleData"]
attacksLeft?: number;          // атаки дії «Атака», що лишилися цього ходу
attackedWithLight?: boolean;   // цього ходу була атака дією легкою ближньою зброєю основної руки
// BattleAction["actionDetails"]
castLevel?: number;
```

Прапорець: `z.object({ ...flagBase, flag: z.literal("twoWeaponFighting") })`; підпис «Бій двома зброями: модифікатор до шкоди другої руки». Стат `attacksPerAction` — підпис «Атак за дію «Атака»».

- [ ] **Step 1: Failing tests**

```ts
// lib/utils/rules/__tests__/schema-4c2.test.ts
import { describe, expect, it } from "vitest";

import { DEFAULT_RULES, parseRules, RulesetPatchSchema } from "@/lib/utils/rules";

describe("rules.criticals.doubleDice", () => {
  it("defaults to false", () => {
    expect(DEFAULT_RULES.criticals.doubleDice).toBe(false);
    expect(parseRules({}).criticals.doubleDice).toBe(false);
  });

  it("parses and patches", () => {
    expect(parseRules({ criticals: { doubleDice: true } }).criticals.doubleDice).toBe(true);
    expect(RulesetPatchSchema.safeParse({ criticals: { doubleDice: true } }).success).toBe(true);
  });
});
```

```ts
// lib/utils/abilities/__tests__/schema-4c2.test.ts
import { describe, expect, it } from "vitest";

import { StaticEffectSchema } from "@/lib/utils/abilities/schema";

describe("4c-2 ability schema", () => {
  it("accepts attacksPerAction stat", () => {
    expect(StaticEffectSchema.safeParse({ kind: "modifyStat", stat: "attacksPerAction", flat: 1 }).success).toBe(true);
  });

  it("accepts twoWeaponFighting flag", () => {
    expect(StaticEffectSchema.safeParse({ kind: "flag", flag: "twoWeaponFighting" }).success).toBe(true);
  });
});
```

(Якщо назва експорту схеми статичного ефекту інша — взяти фактичну з `lib/utils/abilities/schema/index.ts`.)

- [ ] **Step 2:** `pnpm test:run lib/utils/rules/__tests__/schema-4c2.test.ts lib/utils/abilities/__tests__/schema-4c2.test.ts` — FAIL.
- [ ] **Step 3:** реалізувати; перемикач у `CriticalsSection` за зразком наявного `effects`.
- [ ] **Step 4:** ті самі тести + `pnpm test:related lib/utils/rules/schema.ts lib/utils/abilities/schema/effects.ts` — PASS (OpenAPI/tool-schemas снапшоти оновити адитивно, якщо зачеплені).
- [ ] **Step 5:** коміт `feat(constructor): 4c-2 rules.criticals.doubleDice, weapon traits, attacksPerAction, twoWeaponFighting`.

---

### Task 2: Властивості зброї й збирання атак героя 5e

**Files:** modify `lib/constants/artifacts.ts` (`ArtifactModifierType.TRAITS = "traits"`, `VERSATILE_DICE = "versatileDice"`), `lib/utils/artifacts/weapon-stats.ts`, `lib/schemas/units.ts` (`unitAttackSchema` + `traits`, `versatileDice`), `lib/utils/battle/participant/extract-attacks.ts`, `from-character.ts`, `from-unit.ts` (передати `traits`/`versatileDice` як є); tests `lib/utils/artifacts/__tests__/weapon-stats-traits.test.ts`, `lib/utils/battle/participant/__tests__/extract-attacks-5e.test.ts`, `participant/__tests__/from-character-damage-model.test.ts`.

**Interfaces:**
- Consumes: `WeaponTrait`, `WEAPON_TRAITS` (задача 1).
- Produces:
  - `WeaponStatsSchema` + `traits: z.array(z.enum(WEAPON_TRAITS)).max(7).optional()`, `versatileDice: z.string().trim().max(30).optional()`. У колонках `traits` зберігається одним модифікатором `{ type: "traits", value: "light,finesse" }`; `weaponStatsFromRow` розбирає його назад (невідомі ключі відкидає).
  - `extractAttacksFromCharacter(character, preloaded?, names?, opts?: { fiveE?: boolean })`. При `fiveE`:
    - артефакт-зброя отримує `traits`, `versatileDice`;
    - `versatile` + `versatileDice` + порожня клітинка `shield` → `damageDice = versatileDice`;
    - артефакт типу WEAPON у клітинці `shield` (ключ `equipped.shield`) → атака `{ …, id: \`${artifact.id}:off\`, hand: "off", type: MELEE }` (ranged, якщо `thrown` не робить її дальньою — тип як в основної логіки);
    - без `fiveE` поведінка ідентична нинішній (жодних нових полів, ключ `shield` не читається).
  - `from-character.ts`: `resolvedClasses` обчислюється **до** `extractAttacksFromCharacter` і передається `{ fiveE: !!resolvedClasses }`; `abilities.damageModel = "5e"` лише коли `resolvedClasses`.

- [ ] **Step 1: Failing tests** — ключові випадки:

```ts
// weapon-stats-traits.test.ts
it("round-trips traits and versatileDice", () => {
  const stats = { damageDice: "1d8", traits: ["versatile", "finesse"] as const, versatileDice: "1d10" };
  expect(weaponStatsFromRow(weaponStatsColumns({ ...stats, traits: [...stats.traits] }))).toEqual({ damageDice: "1d8", traits: ["versatile", "finesse"], versatileDice: "1d10" });
});

it("drops unknown traits", () => {
  expect(weaponStatsFromRow({ modifiers: [{ type: "traits", value: "light,flying" }] }).traits).toEqual(["light"]);
});
```

```ts
// extract-attacks-5e.test.ts — preloaded артефакти, без Prisma
const rapier = artifactRow({ id: "r", slot: "weapon", modifiers: [{ type: "damageDice", value: "1d8" }, { type: "traits", value: "finesse" }] });
const dagger = artifactRow({ id: "d", slot: "weapon", modifiers: [{ type: "damageDice", value: "1d4" }, { type: "traits", value: "light,finesse,thrown" }, { type: "range", value: "20/60" }] });
const longsword = artifactRow({ id: "l", slot: "weapon", modifiers: [{ type: "damageDice", value: "1d8" }, { type: "traits", value: "versatile" }, { type: "versatileDice", value: "1d10" }] });

it("off-hand from shield cell only in 5e", async () => {
  const c = character({ weapon: "r", shield: "d" });
  const fiveE = await extractAttacksFromCharacter(c, byId(rapier, dagger), undefined, { fiveE: true });
  expect(fiveE.find((a) => a.hand === "off")).toMatchObject({ id: "d:off", damageDice: "1d4", traits: ["light", "finesse", "thrown"] });
  const homm = await extractAttacksFromCharacter(c, byId(rapier, dagger));
  expect(homm.some((a) => a.hand === "off")).toBe(false);
  expect(homm.find((a) => a.id === "r")).not.toHaveProperty("traits");
});

it("versatile die when shield cell empty", async () => {
  const two = await extractAttacksFromCharacter(character({ weapon: "l" }), byId(longsword), undefined, { fiveE: true });
  expect(two.find((a) => a.id === "l")?.damageDice).toBe("1d10");
  const one = await extractAttacksFromCharacter(character({ weapon: "l", shield: "d" }), byId(longsword, dagger), undefined, { fiveE: true });
  expect(one.find((a) => a.id === "l")?.damageDice).toBe("1d8");
});
```

```ts
// from-character-damage-model.test.ts (за зразком from-character-classes.test.ts)
it("sets damageModel only when a class resolves", async () => {
  expect((await build({ rules: { classes: { enabled: true } }, classes: [{ classId: FIGHTER.id, level: 3 }] })).abilities.damageModel).toBe("5e");
  expect((await build({ rules: { classes: { enabled: true } }, classes: [] })).abilities.damageModel).toBeUndefined();
  expect((await build({ rules: {}, classes: [{ classId: FIGHTER.id, level: 3 }] })).abilities.damageModel).toBeUndefined();
});
```

- [ ] **Step 2:** запустити — FAIL.
- [ ] **Step 3:** реалізувати (хелпери `artifactRow`/`character`/`byId` — локальні у тесті).
- [ ] **Step 4:** нові тести + `pnpm test:related lib/utils/battle/participant/extract-attacks.ts lib/utils/artifacts/weapon-stats.ts lib/utils/battle/participant/from-character.ts` — PASS (наявні `extract-attacks.test.ts`, `weapon-stats.test.ts` без змін).
- [ ] **Step 5:** коміт `feat(constructor): 4c-2 weapon traits and 5e attack extraction`.

---

### Task 3: Шкода атаки 5e

**Files:** create `lib/utils/battle/attack/ability.ts`; modify `lib/utils/battle/damage/hero-damage.ts`, `attack/bonus.ts` (`calculateAttackBonus`), `attack/process/compute.ts`, `damage/average.ts`, `damage/breakdown.ts`, `lib/utils/characters/sheet/lines.ts`; test `lib/utils/battle/damage/__tests__/damage-5e.test.ts`.

**Interfaces — Produces:**

```ts
// lib/utils/battle/attack/ability.ts
export const isFiveE = (p: BattleParticipant): boolean => p.abilities.damageModel === "5e";
export const hasTrait = (a: Pick<BattleAttack, "traits">, t: WeaponTrait): boolean => !!a.traits?.includes(t);
/** HOMM — attackAbilityKey; 5e — finesse: більша з Сил/Спр, дальня (не метальна ближня) — Спр, ближня — Сил. */
export function attackAbilityFor(p: BattleParticipant, attack: BattleAttack): AbilityKey;
/** Модифікатор до кидка атаки (друга рука — повний). */
export function attackRollModifier(p: BattleParticipant, attack: BattleAttack): number;
/** Модифікатор до шкоди: друга рука 5e — min(mod, 0), якщо немає прапорця twoWeaponFighting. */
export function attackDamageModifier(p: BattleParticipant, attack: BattleAttack, participants?: BattleParticipant[]): number;
export function attackAbilityLabelFor(p: BattleParticipant, attack: BattleAttack): string;
```

Для HOMM (`!isFiveE`) три функції повертають рівно `getAttackAbilityModifier(p.abilities, attack.type)` / `attackAbilityLabel(...)` — замінюють прямі виклики в `bonus.ts`, `compute.ts`, `average.ts`, `breakdown.ts`, `sheet/lines.ts` (у `breakdown.ts` атака відома — передати її замість штучного типу). `lib/utils/units/damage-summary.ts` не чіпати (юніти).

`hero-damage.ts`: для `isFiveE(p)` — `heroAttackDamageParts` повертає `{ weaponDice, heroDice: "", formula: weaponDice }`; `heroDamageContext` — `heroLevelPart: 0`. Множник архетипу в режимі класів уже 1 — не чіпати.

- [ ] **Step 1: Failing tests** (`damage-5e.test.ts`; фікстура `createMockParticipant`, герой рівня 5, `abilities.damageModel: "5e"`, Сил 14 (+2), Спр 18 (+4)):

```ts
const fiveE = createMockParticipant({ abilities: { ...base.abilities, level: 5, damageModel: "5e", strength: 14, dexterity: 18, modifiers: { ...base.abilities.modifiers, strength: 2, dexterity: 4 } } });
const rapier: BattleAttack = { id: "r", name: "Рапіра", type: AttackType.MELEE, attackBonus: 0, damageDice: "1d8", damageType: "piercing", traits: ["finesse"] };
const club: BattleAttack = { id: "c", name: "Палиця", type: AttackType.MELEE, attackBonus: 0, damageDice: "1d4", damageType: "bludgeoning" };
const dagger: BattleAttack = { id: "d:off", name: "Кинджал", type: AttackType.MELEE, attackBonus: 0, damageDice: "1d4", damageType: "piercing", traits: ["light", "finesse"], hand: "off" };

it("5e formula has no hero dice or level", () => {
  expect(heroAttackDamageParts(fiveE, rapier).formula).toBe("1d8");
  expect(heroDamageContext(fiveE, rapier, [5]).heroLevelPart).toBe(0);
});

it("finesse uses the better of STR/DEX", () => {
  expect(hit(fiveE, rapier, [5]).physicalDamage).toBe(9); // 5 + 4
  expect(calculateAttackBonus(fiveE, rapier)).toBe(4 + 2);
});

it("plain melee uses STR", () => {
  expect(hit(fiveE, club, [3]).physicalDamage).toBe(5);
});

it("off-hand drops positive modifier unless twoWeaponFighting", () => {
  expect(hit(fiveE, dagger, [3]).physicalDamage).toBe(3);
  expect(calculateAttackBonus(fiveE, dagger)).toBe(6);
  const styled = withAbility(fiveE, { kind: "flag", flag: "twoWeaponFighting" });
  expect(hit(styled, dagger, [3]).physicalDamage).toBe(7);
});

it("off-hand keeps negative modifier", () => {
  const weak = { ...fiveE, abilities: { ...fiveE.abilities, dexterity: 8, strength: 8, modifiers: { ...fiveE.abilities.modifiers, strength: -1, dexterity: -1 } } };
  expect(hit(weak, dagger, [3]).physicalDamage).toBe(2);
});

it("average equals real hit (preview = server)", () => {
  expect(averageAttackDamage(fiveE, rapier).total).toBe(4.5 + 4); // або округлення, як у наявному average-damage.test.ts
});
```

(`hit`/`withAbility` — локальні хелпери за зразком `hero-damage.test.ts`; `withAbility` додає `resolvedAbilities` з пасивним прапорцем так, як це робить наявний тест прапорців — знайти зразок через `grep -rn "resolvedAbilities" lib/utils/battle/attack/__tests__ | head`.)

- [ ] **Step 2:** FAIL.
- [ ] **Step 3:** реалізувати.
- [ ] **Step 4:** новий тест + `pnpm test:related lib/utils/battle/damage/hero-damage.ts lib/utils/battle/attack/bonus.ts lib/utils/battle/attack/process/compute.ts lib/utils/battle/damage/average.ts lib/utils/battle/damage/breakdown.ts lib/utils/characters/sheet/lines.ts` — PASS, наявні `hero-damage.test.ts`, `average-damage.test.ts`, `hero-archetype-damage.test.ts` без змін.
- [ ] **Step 5:** коміт `feat(constructor): 4c-2 5e weapon damage`.

---

### Task 4: Подвоєння кубиків крита

**Files:** create `lib/utils/battle/attack/crit-dice.ts`; modify `attack/process/run.ts` (після визначення `attackRoll`, перед `resolveHit`), `attack/server-attack.ts`, `damage/breakdown.ts` (прев'ю крита), `lib/hooks/battle/useAttackWizard.ts` (кількість кубиків на криті для клієнта); test `lib/utils/battle/attack/__tests__/crit-double-dice.test.ts`.

**Interfaces — Produces:**

```ts
// crit-dice.ts
/** Крит із doubleDice: якщо надіслано один набір — сервер докидає другий; повертає усі кидки і докинуті. */
export function critDamageRolls(input: { formula: string; rolls: number[]; rng: () => number }): { rolls: number[]; serverRolled: number[] };
export const critDoublesDice = (rules: Ruleset | undefined, isCritical: boolean): boolean => !!rules?.criticals.doubleDice && isCritical;
```

- `formula` = `heroAttackDamageParts(attacker, attack).formula`; набір = `diceCount(formula)`; якщо `rolls.length >= 2 × набір` — повертає як є (`serverRolled: []`), інакше докидає `rollGroups(parseDiceLenient(formula).groups, rng)` до `rolls` (лише стільки, скільки бракує до 2×). Порожня формула — без змін.
- `run.ts`: коли `critDoublesDice(flow.ctx.rules, attackRoll.isCritical)` — `damageRolls` для `resolveHit`/`buildBattleActionForHit` = результат; докинуті — повідомлення `🎲 крит: кубики шкоди подвоєно${serverRolled.length ? ` (сервер: ${serverRolled.join(", ")})` : ""}`; `params.serverRolled.damageFrom` враховує докинуті для `diceRolls`.
- `server-attack.ts` (атаки при відході, підготовлені, берсерк через `resolveServerAttack`) отримує подвоєння тим самим шляхом, бо йде через `processAttack`.
- `breakdown.ts`: замість безумовного ×2 на криті — якщо `doubleDice`, кубики подвоюються (сума кидків ×2 як оцінка, коли передано один набір); якщо ефект крита `double_damage` — ×2; інакше без множника. Сигнатура отримує `rules?: Ruleset` (з `battle.rules` у хуку).
- Клієнт (`useAttackWizard`): при критичному d20 і `doubleDice` кількість слотів кубиків шкоди = 2× (`damageDiceSlots` двічі).

- [ ] **Step 1: Failing tests**

```ts
describe("critDamageRolls", () => {
  it("server adds the second set", () => {
    const r = critDamageRolls({ formula: "1d8", rolls: [5], rng: () => 0.5 });
    expect(r.rolls).toHaveLength(2);
    expect(r.serverRolled).toHaveLength(1);
  });

  it("keeps a full double set", () => {
    expect(critDamageRolls({ formula: "2d6", rolls: [1, 2, 3, 4], rng: () => 0 })).toEqual({ rolls: [1, 2, 3, 4], serverRolled: [] });
  });
});

describe("processAttack crit with doubleDice", () => {
  // processAttack з rules = parseRules({ criticals: { doubleDice: true, effects: false } }), d20 = 20, герой 5e з рапірою (1d8, Спр +4)
  it("doubles dice, not the modifier", () => {
    const r = attackWith({ d20: 20, damageRolls: [5, 3], doubleDice: true });
    expect(r.damage?.total ?? r.targetUpdated.combatStats.maxHp - r.targetUpdated.combatStats.currentHp).toBe(5 + 3 + 4);
  });

  it("HOMM default: crit without effects adds nothing", () => {
    const r = attackWith({ d20: 20, damageRolls: [5], doubleDice: false });
    expect(hpLost(r)).toBe(5 + 4);
  });
});

describe("breakdown preview", () => {
  it("does not double when neither doubleDice nor double_damage", () => {
    expect(previewTotal({ isCritical: true, rules: parseRules({ criticals: { effects: false } }) })).toBe(previewTotal({ isCritical: false }));
  });
});
```

(`attackWith`/`hpLost`/`previewTotal` — локальні хелпери над `processAttack`/`computeDamageBreakdown` за зразком `attack/process/__tests__/crit-max-damage.test.ts`.)

- [ ] **Step 2:** FAIL. **Step 3:** реалізувати. **Step 4:** нові + `pnpm test:related lib/utils/battle/attack/process/run.ts lib/utils/battle/damage/breakdown.ts lib/utils/battle/attack/server-attack.ts` — PASS (наявні `crit-rules.test.ts`, `critical.test.ts`, `crit-max-damage.test.ts`, `retaliation-anchor` снапшот без змін). Якщо наявний тест breakdown фіксує безумовне ×2 при `double_damage`-подібному сценарії — він лишається зеленим (ефект `double_damage` і далі ×2); якщо фіксує ×2 без ефекту — зупинитися й доповісти (це розбіжність, яку спек виправляє; рішення — за контролером).
- [ ] **Step 5:** коміт `feat(constructor): 4c-2 crit doubles damage dice`.

---

### Task 5: Досяжність, дальність 80/320, ворог поруч

**Files:** modify `lib/utils/battle/grid/attack-reach.ts` (`attackReachError`, `enemiesInReach`, `attackRangeCells`), `lib/utils/battle/attack/bonus.ts` (`rollModeReasons`), `lib/utils/battle/actions/opportunity.ts`; test `lib/utils/battle/grid/__tests__/attack-reach-5e.test.ts`, `lib/utils/battle/actions/__tests__/opportunity-reach.test.ts`.

**Interfaces — Produces:**

```ts
// attack-reach.ts
export function meleeReachCells(p: BattleParticipant, attack: BattleAttack): number;   // 5e + reach → 2, інакше 1
export function rangeBands(range: string | undefined): { normal: number; long: number } | null; // "80/320" → {16, 64}; "30" → {6, 6}
/** Причини перешкоди дальньої атаки 5e: «Далека дистанція», «Ворог поруч». HOMM — []. */
export function rangeDisadvantageReasons(map, participants, attacker, attack, target): string[];
```

- `attackReachError` для 5e: ближня — `distance > meleeReachCells` → «Ціль не поруч — спершу підійдіть»; дальня (або `thrown` ближня, кинута за межі досяжності) — **не** відхиляється через ворога поруч; відхиляється за `long`. HOMM — без змін (досяжність 1, відмова поруч з ворогом, останнє число).
- Метальна ближня зброя: у межах досяжності — ближня атака; далі, до `long` з `range` — дальня атака тією самою зброєю (характеристика з `attackAbilityFor`, без перешкоди «ворог поруч»).
- `rollModeReasons` отримує в `opts` `map?` і додає `rangeDisadvantageReasons` до `disadvantage` (лише 5e); викликачі, що вже мають мапу (`calculateAttackRoll` через `process/run.ts` — `flow.ctx.map`; клієнтське прев'ю майстра) передають її.
- `opportunity.ts`: поріг `footprintDistance(...) > 1` → `> meleeReachCells(e, attack)` для «був у зоні» і `<= reach` для «досі в зоні»; `pickMeleeAttack(e)` обирається до перевірки.

- [ ] **Step 1: Failing tests**

```ts
// attack-reach-5e.test.ts — мапа 10×10, атакувальник (0,0), ціль (2,0)
it("reach weapon hits at 2 cells in 5e only", () => {
  expect(attackReachError(map, ps, fiveE, glaive, [targetAt(2, 0)])).toBeNull();
  expect(attackReachError(map, ps, homm, glaive, [targetAt(2, 0)])).toBe("Ціль не поруч — спершу підійдіть");
});

it("ranged with adjacent enemy: 5e disadvantage, HOMM rejected", () => {
  expect(attackReachError(map, [...ps, enemyAt(1, 0)], fiveE, bow, [targetAt(5, 0)])).toBeNull();
  expect(rangeDisadvantageReasons(map, [...ps, enemyAt(1, 0)], fiveE, bow, targetAt(5, 0))).toContain("Ворог поруч");
  expect(attackReachError(map, [...ps, enemyAt(1, 0)], homm, bow, [targetAt(5, 0)])).toBe("Поруч ворог — стріляти не можна");
});

it("80/320: beyond normal is disadvantage, beyond long is rejected", () => {
  expect(rangeDisadvantageReasons(map, ps, fiveE, bow, targetAt(20, 0))).toContain("Далека дистанція");
  expect(attackReachError(map, ps, fiveE, bow, [targetAt(70, 0)])).toBe("Ціль поза дальністю атаки");
});
```

```ts
// opportunity-reach.test.ts — ворог 5e з glaive (reach) на (0,0), мувер (2,0) → (4,0)
it("leaving a 2-cell reach provokes", () => { expect(provoked(moveFrom(2, 0).to(4, 0))).toBe(true); });
it("HOMM reach stays 1", () => { expect(provoked(moveFrom(2, 0).to(4, 0), { homm: true })).toBe(false); });
```

(Мапу і розстановку будувати за зразком `lib/utils/battle/actions/__tests__/movement*.test.ts`; `glaive` = `{ …, damageDice: "1d10", traits: ["reach", "twoHanded"] }`, `bow` = `{ type: RANGED, range: "80/320" }`; для великої мапи брати розмір ≥ 72.)

- [ ] **Step 2:** FAIL. **Step 3:** реалізувати. **Step 4:** нові + `pnpm test:related lib/utils/battle/grid/attack-reach.ts lib/utils/battle/attack/bonus.ts lib/utils/battle/actions/opportunity.ts` — PASS.
- [ ] **Step 5:** коміт `feat(constructor): 4c-2 reach, range bands, adjacent ranged disadvantage`.

---

### Task 6: Додаткова атака

**Files:** create `lib/utils/battle/attack/attacks-left.ts`; modify `lib/utils/battle/attack-phase/request.ts` (`validateAttackRequest`), `attack/process/run.ts` (замість `applyMainActionUsed` на першому ударі — `spendAttack`), `lib/utils/battle/actions/run.ts` (Схоплення/Штовхання), `actions/availability.ts`, `turn/turn-state.ts`, `view/turn-exhausted.ts`; test `lib/utils/battle/attack/__tests__/extra-attack.test.ts`.

**Interfaces — Produces:**

```ts
// attacks-left.ts
export function attacksPerAction(p: BattleParticipant, participants: BattleParticipant[]): number; // max(0, floor(collectModifiers({ stat: "attacksPerAction" }).flat))
export const canAttackFromPool = (p: BattleParticipant): boolean => (p.battleData.attacksLeft ?? 0) > 0;
/** Атака дією «Атака»: з лічильника, якщо він є; інакше витрачає дію (applyMainActionUsed) і пише attacksLeft = attacksPerAction. */
export function spendAttack(p: BattleParticipant, participants: BattleParticipant[], attack: BattleAttack): BattleParticipant;
```

- `spendAttack` також ставить `battleData.attackedWithLight = true`, коли `attack.hand !== "off"`, ближня (не дальня) і `hasTrait(attack, "light")` — для задачі 7. Для HOMM-учасника без `attacksPerAction` результат ідентичний `applyMainActionUsed` (поле `attacksLeft` не пишеться, коли 0).
- `validateAttackRequest`: `hasUsedAction && !canAttackFromPool(attacker)` → `ACTION_USED` (як зараз); атака другою рукою — задача 7.
- `actions/run.ts`: для `grapple`/`shove` — якщо `canAttackFromPool(actor)`, `attacksLeft − 1` і дія не перевіряється/не витрачається; інакше як зараз, плюс після успішного витрачення дії пише `attacksLeft = attacksPerAction` (Схоплення — одна з атак дії «Атака»). `availability.ts` дзеркалить це.
- `resetTurnState` скидає `attacksLeft: undefined`, `attackedWithLight: undefined`.
- `turnExhausted`: `canAttackFromPool(p)` тримає хід відкритим.
- Атаки поза ходом (`opportunity`, `ready`, retaliation, berserk) лічильника не чіпають — вони не викликають `spendAttack` (перевірити: `processAttack` з `actionSpent: true` або окремим прапорцем `offTurn`; якщо `processAttack` для них зараз викликає `applyMainActionUsed` — задати `actionSpent: true`, як у наявних шляхах).

- [ ] **Step 1: Failing tests**

```ts
const fighter = withAbility(fiveEHero, { kind: "modifyStat", stat: "attacksPerAction", flat: 1 });

it("first attack spends the action and leaves one attack", () => {
  const p = spendAttack(fighter, [fighter], sword);
  expect(p.actionFlags.hasUsedAction).toBe(true);
  expect(p.battleData.attacksLeft).toBe(1);
});

it("second attack comes from the pool", () => {
  const p = spendAttack(spendAttack(fighter, [fighter], sword), [fighter], sword);
  expect(p.battleData.attacksLeft).toBe(0);
});

it("HOMM hero without the stat behaves like applyMainActionUsed", () => {
  expect(spendAttack(hommHero, [hommHero], sword)).toEqual(applyMainActionUsed(hommHero));
});

it("pool does not consume pendingExtraActions", () => {
  const withPool = { ...fighter, battleData: { ...fighter.battleData, pendingExtraActions: 1 } };
  const p = spendAttack(spendAttack(withPool, [withPool], sword), [withPool], sword);
  expect(p.battleData.pendingExtraActions).toBe(0); // перша атака взяла дію з пулу HOMM
  expect(p.battleData.attacksLeft).toBe(0);
});

it("validateAttackRequest allows a second attack via the pool and rejects a third", () => { /* scope з hasUsedAction: true, attacksLeft 1 → ok; attacksLeft 0 → ACTION_USED */ });

it("grapple consumes an attack from the pool", () => { /* runCoreAction grapple при hasUsedAction + attacksLeft 1 → attacksLeft 0, без помилки action_used */ });

it("reset at turn start", () => {
  expect(resetTurnState({ ...fighter, battleData: { ...fighter.battleData, attacksLeft: 1, attackedWithLight: true } })).toMatchObject({ attacksLeft: undefined, attackedWithLight: undefined });
});

it("opportunity attack does not touch the pool", () => { /* resolveMovement5e з ворогом attacksLeft 1 → після атаки при відході attacksLeft 1 */ });
```

- [ ] **Step 2:** FAIL. **Step 3:** реалізувати. **Step 4:** нові + `pnpm test:related lib/utils/battle/attack-phase/request.ts lib/utils/battle/attack/process/run.ts lib/utils/battle/actions/run.ts lib/utils/battle/turn/turn-state.ts lib/utils/battle/view/turn-exhausted.ts` — PASS.
- [ ] **Step 5:** коміт `feat(constructor): 4c-2 extra attack`.

---

### Task 7: Атака другою рукою (бонусна дія)

**Files:** modify `app/api/campaigns/[id]/battles/[battleId]/attack/attack-mutation.ts` (`attackBodySchema` + `offHand: z.boolean().optional()`), `lib/utils/battle/attack-phase/request.ts`, `attack-phase/run-attack-phase.ts`, `attack/process/run.ts` (друга рука витрачає бонус, не дію), `lib/constants/api-errors.ts`, `types/api.ts` (клієнтський тип запиту атаки); test `lib/utils/battle/attack-phase/__tests__/off-hand.test.ts`, `app/api/__tests__/battles/attack-off-hand.test.ts`.

**Interfaces — Produces:**
- `API_ERRORS.OFF_HAND_NOT_ALLOWED = "Атака другою рукою доступна лише героям 5e"`, `OFF_HAND_NEEDS_ATTACK = "Спершу атакуйте дією «Атака» легкою ближньою зброєю"`, `OFF_HAND_NOT_LIGHT = "Зброя другої руки має бути легкою"`, `OFF_HAND_TWO_HANDED = "Дворучною зброєю не можна битися двома руками"`, `NO_OFF_HAND_WEAPON = "Немає зброї в другій руці"`.
- `validateAttackRequest(scope, data)` при `data.offHand`:
  1. `!isFiveE(attacker)` → `OFF_HAND_NOT_ALLOWED` (422);
  2. атака = перша з `hand === "off"`, якщо `attackId` не вказує на неї; немає → `NO_OFF_HAND_WEAPON`;
  3. `hasUsedBonusAction` → `BONUS_ACTION_USED`;
  4. `!battleData.attackedWithLight` → `OFF_HAND_NEEDS_ATTACK`;
  5. зброя другої руки з `twoHanded` → `OFF_HAND_TWO_HANDED`; без `light` → `OFF_HAND_NOT_LIGHT` (основна рука перевірена через `attackedWithLight`: її ставить лише легка ближня атака);
  6. перевірка «дію витрачено» для `offHand` не застосовується.
- Без `offHand` атака з `hand === "off"` відхиляється `OFF_HAND_NEEDS_ATTACK` (друга рука не б'є за дію).
- `processAttack` отримує `offHand?: boolean`: замість `spendAttack` ставить `hasUsedBonusAction: true`.

- [ ] **Step 1: Failing tests** — по одному на кожну відмову 1–5 + успіх (бонус витрачено, дія й `attacksLeft` без змін) + HOMM-герой з `offHand: true` → 422 + «атака `d:off` без `offHand`» → відмова. Мутаційний тест — за зразком `app/api/__tests__/battles/attack-mutation.test.ts` (той самий харнес контексту).
- [ ] **Step 2:** FAIL. **Step 3:** реалізувати. **Step 4:** нові + `pnpm test:related app/api/campaigns/[id]/battles/[battleId]/attack/attack-mutation.ts lib/utils/battle/attack-phase/request.ts` — PASS.
- [ ] **Step 5:** коміт `feat(constructor): 4c-2 off-hand attack as bonus action`.

---

### Task 8: Легка зброя в клітинці «Щит»

**Files:** create `lib/utils/artifacts/off-hand.ts`; modify `lib/utils/inventory/stash-actions.ts` (дія `equip` + `slot?: "shield"`), відповідний Zod дії сховища (знайти `grep -rn "\"equip\"" lib/schemas app/api/campaigns/[id]/characters/[characterId]/stash`), `app/api/.../stash/apply-stash.ts` (передати в контекст `classesEnabled` і властивості артефакта), `app/api/.../inventory/update-inventory.ts` (серверна перевірка `equipped.shield`), `components/characters/artifacts/CharacterArtifactsSection.tsx`, `components/character-profile/stash/StashArtifactsPanel.tsx` (друга кнопка «У другу руку» для легкої зброї, коли класи ввімкнені); tests `lib/utils/inventory/__tests__/stash-off-hand.test.ts`, `lib/utils/artifacts/__tests__/off-hand.test.ts`.

**Interfaces — Produces:**

```ts
// off-hand.ts
/** Артефакт можна вдягнути в клітинку «Щит» як зброю другої руки (лише режим класів). */
export function canEquipOffHand(artifact: { slot: string; bonuses?: unknown; modifiers?: unknown }, classesEnabled: boolean): boolean;
// = classesEnabled && artifact.slot === ArtifactSlot.WEAPON && weaponStatsFromRow(artifact).traits?.includes("light")
```

- `stash-actions` `equip` з `slot: "shield"`: `canEquipOffHand(ctx.artifact, ctx.classesEnabled)` або відмова `StashError.NO_SLOT_FOR_ARTIFACT`; без `slot` — як зараз.
- `update-inventory.ts`: якщо `equipped.shield` вказує на артефакт не типу SHIELD — дозволено лише при `canEquipOffHand(..., rules.classes.enabled)`, інакше 422 (текст `API_ERRORS.OFF_HAND_EQUIP = "У клітинку «Щит» можна вдягнути лише щит або легку зброю (режим класів)"`).
- `CharacterArtifactsSection`: список для клітинки «Щит» = щити + (класи ввімкнені → легка зброя). Прапорець класів — з наявного хука правил кампанії (знайти `grep -rn "useCampaignRules\|useRules" lib/hooks | head`).

- [ ] **Step 1: Failing tests** — `canEquipOffHand` (легка/нелегка/не зброя/класи вимкнені); `stash equip slot shield` (5e — ок, HOMM — відмова, нелегка — відмова, кинджал витісняє наявний щит у сховище).
- [ ] **Step 2:** FAIL. **Step 3:** реалізувати. **Step 4:** нові + `pnpm test:related lib/utils/inventory/stash-actions.ts` — PASS.
- [ ] **Step 5:** коміт `feat(constructor): 4c-2 light weapon in shield cell`.

---

### Task 9: Поля заклинання 5e (схема, міграція, зберігання, редактор)

**Files:** modify `prisma/schema.prisma` (модель `Spell`: `dieSides Int?`, `upcastDice Int?`, `upcastTargets Int?`, `addAbilityMod Boolean?`); create `prisma/migrations/20261028000000_spell_5e_dice/migration.sql`; modify `lib/utils/spells/model/schema.ts` (`SpellDefinitionSchema`, `SpellResolutionSchema` + `{ kind: "attack" }`, `SpellDiceSchema` max 40), `lib/utils/spells/model/read.ts` (`readSpellDefinition`, `spellDefinitionColumns`, `SpellRulesRow`), `lib/schemas/spells.ts`, `lib/server/content/resources/spells.ts` (update-відображення), `lib/server/spells/book-spells-by-ids.ts` (`BOOK_SPELL_SELECT`), `lib/utils/spells/to-book-spell.ts`, `types/spells.ts` (`SpellRules`, `SpellFormData`), `lib/utils/spells/model/form.ts`, `components/spells/form/spell-form-defaults.ts`, `components/spells/form/SpellFormPowerFields.tsx`, вибір розв'язки у формі (знайти `grep -rn "onSuccess" components/spells/form | head`); tests `lib/utils/spells/model/__tests__/schema-5e.test.ts`, `lib/utils/spells/model/__tests__/read-5e.test.ts`.

**Migration SQL:**

```sql
ALTER TABLE "spells" ADD COLUMN "dieSides" INTEGER;
ALTER TABLE "spells" ADD COLUMN "upcastDice" INTEGER;
ALTER TABLE "spells" ADD COLUMN "upcastTargets" INTEGER;
ALTER TABLE "spells" ADD COLUMN "addAbilityMod" BOOLEAN;
```

(Перевірити фактичну назву таблиці в `@@map` моделі `Spell`.)

**Interfaces — Produces:**

```ts
// SpellDefinitionSchema (додатково)
dieSides: z.union([z.literal(4), z.literal(6), z.literal(8), z.literal(10), z.literal(12)]).optional(),
upcastDice: z.number().int().min(0).max(10).optional(),
upcastTargets: z.number().int().min(0).max(10).optional(),
addAbilityMod: z.boolean().optional(),
// SpellResolutionSchema
z.object({ kind: z.literal("attack") }),
```

`.refine`: `resolution.kind === "attack"` лише для `targeting.kind` `enemy` або `area` (повідомлення «Атака заклинанням — лише для цілі-ворога або області»).

Редактор: блок «5e» (`HudSection`) у `SpellFormPowerFields` — «Грань кубика» (select d4–d12, порожньо = d6), «+кубиків за коло», «+цілей за коло», «Додати модифікатор характеристики» (checkbox); показується, коли `rules.classes.enabled` (хук правил кампанії). Варіант розв'язки «Атака заклинанням» — там само, де «Рятівний кидок».

- [ ] **Step 1: Failing tests** — Zod: поля приймаються, `dieSides: 7` відхиляється, `dice: 40` ок / `41` ні, `attack` + `self` відхиляється; read/columns round-trip нових полів; `null` колонки → поля відсутні (HOMM-рядок дає те саме визначення, що й раніше).
- [ ] **Step 2:** FAIL. **Step 3:** реалізувати; `pnpm exec prisma generate`; застосувати міграцію на `constructor` (Global Constraints).
- [ ] **Step 4:** нові + `pnpm test:related lib/utils/spells/model/schema.ts lib/utils/spells/model/read.ts lib/server/content/resources/spells.ts lib/utils/spells/to-book-spell.ts` + `pnpm test:run prisma/__tests__ lib/server/content/__tests__` — PASS (снапшоти OpenAPI/tool-schemas оновити адитивно; межу розміру OpenAPI піднімати лише якщо перевищено, на мінімально потрібне).
- [ ] **Step 5:** коміт `feat(constructor): 4c-2 spell 5e dice fields`.

---

### Task 10: Кубики заклинань 5e і вибір слота

**Files:** modify `lib/utils/spells/model/dice.ts` (нова `spellDice5e`), `lib/utils/battle/spell/caster-dice.ts`, `lib/utils/battle/spell/slot.ts`, `lib/utils/battle/spell/cast/{index,finish,state}.ts`, `lib/utils/battle/types/spell-process.ts` (`CastSpellParams.slotKey?`), `app/api/campaigns/[id]/battles/[battleId]/spell/{cast-spell-schema,spell-mutation}.ts`, `types/api.ts` (`SpellCastData.slotKey?`), `lib/utils/spells/to-castable` / `toCastableSpell` (нові поля в `definition`), розв'язання цілей (`resolveSpellTargets` — `maxTargets` з урахуванням підсилення), `lib/constants/api-errors.ts`; tests `lib/utils/spells/model/__tests__/dice-5e.test.ts`, `lib/utils/battle/spell/__tests__/slot-choice.test.ts`, `app/api/__tests__/battles/spell-slot-key.test.ts`.

**Interfaces — Produces:**

```ts
// dice.ts
export function spellDice5e(spell: { dice: number; level: number; dieSides?: number; upcastDice?: number }, characterLevel: number, castLevel: number): SpellDice;
// кантрип: count = dice × (1 + [lvl≥5] + [lvl≥11] + [lvl≥17]); коло ≥1: dice + upcastDice × max(0, castLevel − level); sides = dieSides ?? 6; dice 0 → count 0

// caster-dice.ts
export function casterSpellDice(caster: BattleParticipant, spell: { dice: number; groupId: string | null; level?: number; dieSides?: number; upcastDice?: number }, castLevel?: number): SpellDice;
// isFiveE(caster) → spellDice5e(spell, caster.abilities.level, castLevel ?? spell.level ?? 0); інакше — нинішня гілка без змін
export const upcastSteps = (spellLevel: number, castLevel: number): number => Math.max(0, castLevel - spellLevel);

// slot.ts
/** Обраний слот: існує, не порожній, коло ≥ коло заклинання. Повертає коло касту або текст помилки. */
export function resolveChosenSlot(p: BattleParticipant, spellLevel: number, slotKey: string): { ok: true; castLevel: number } | { ok: false; error: string };
```

- `spellSchema` + `slotKey: z.string().regex(/^([1-9]|pact)$/).optional()`.
- `spell-mutation.ts`: якщо `slotKey` і не `free` → `resolveChosenSlot`; помилка → `BattleRuleError("action_rejected", error)` (422). Тексти: `API_ERRORS.SLOT_TOO_LOW = "Слот нижчого кола, ніж заклинання"`, `SLOT_EMPTY = "У цьому слоті не лишилося зарядів"`, `SLOT_MISSING = "Такого слота немає"`. `castLevel` передається в `casterSpellDice` і в `castSpell({ …, slotKey, castLevel })`. Кантрип зі `slotKey` — ігнорувати `slotKey`.
- HOMM-герой із `slotKey`: слот перевіряється так само; `castLevel` впливає лише на `actionDetails` (кубики HOMM-гілки його ігнорують).
- `castSpell`: `slotKey = params.slotKey ?? spellSlotKey(readyCaster, spell.level)`; `info.level` лишається колом заклинання, `info.castLevel = castLevel` (тригер `spellCast` — додаткове поле в `AbilityEvent`, необов'язкове); `actionDetails.spellSlotUsed = castLevel`, `castLevel` у `actionDetails`; `spellLevel` — коло заклинання (не змінювати семантику наявного поля, лише `spellSlotUsed`).
- `addAbilityMod` (5e): у `computeSpellPower` до `heal`/`damage` додати мод. характеристики заклинань кастера, рядок breakdown `+ мод. ${label} (${signed(mod)})` — лише коли `isFiveE(caster) && spell.definition.addAbilityMod`.
- Кількість цілей: `maxTargets + (upcastTargets ?? 0) × upcastSteps(level, castLevel)` (лише 5e) — у `resolveSpellTargets` через новий параметр `opts.castLevel`.

- [ ] **Step 1: Failing tests**

```ts
describe("spellDice5e", () => {
  const fireBolt = { dice: 1, level: 0, dieSides: 10 };
  it.each([[4, 1], [5, 2], [11, 3], [17, 4]])("cantrip at level %i → %i dice", (lvl, count) => {
    expect(spellDice5e(fireBolt, lvl, 0)).toEqual({ count, sides: 10 });
  });

  it("upcast adds dice per circle", () => {
    expect(spellDice5e({ dice: 8, level: 3, dieSides: 6, upcastDice: 1 }, 9, 5)).toEqual({ count: 10, sides: 6 });
  });

  it("default d6, no upcast field → base dice", () => {
    expect(spellDice5e({ dice: 3, level: 1 }, 5, 3)).toEqual({ count: 3, sides: 6 });
  });
});

describe("casterSpellDice", () => {
  it("HOMM branch unchanged and ignores castLevel", () => {
    expect(casterSpellDice(hommHero, { dice: 3, groupId: null, level: 1 }, 5)).toEqual(casterSpellDice(hommHero, { dice: 3, groupId: null }));
  });
});

describe("resolveChosenSlot", () => {
  it("pact slot casts at pact level", () => { expect(resolveChosenSlot(warlock({ pact: { level: 3, max: 2, current: 1 } }), 1, "pact")).toEqual({ ok: true, castLevel: 3 }); });
  it("rejects a lower slot", () => { expect(resolveChosenSlot(wizard({ "1": { max: 2, current: 2 } }), 2, "1")).toMatchObject({ ok: false }); });
  it("rejects an empty slot", () => { expect(resolveChosenSlot(wizard({ "3": { max: 1, current: 0 } }), 1, "3")).toMatchObject({ ok: false }); });
  it("rejects a missing slot", () => { expect(resolveChosenSlot(wizard({}), 1, "4")).toMatchObject({ ok: false }); });
});
```

Мутаційний тест (`spell-slot-key.test.ts`, харнес як у `spell-mutation.test.ts`): Вогняна куля (`dice 8, level 3, dieSides 6, upcastDice 1`) героя 5e зі `slotKey: "5"` → очікує 10 кидків (9 — 400), витрачено слот 5, `actionDetails.spellSlotUsed = 5`; `slotKey: "pact"` витрачає пакт; HOMM-герой зі `slotKey` звичайного кола — успіх, кубики HOMM; `upcastTargets` дає +1 ціль.

- [ ] **Step 2:** FAIL. **Step 3:** реалізувати. **Step 4:** нові + `pnpm test:related lib/utils/spells/model/dice.ts lib/utils/battle/spell/caster-dice.ts lib/utils/battle/spell/slot.ts lib/utils/battle/spell/cast/index.ts app/api/campaigns/[id]/battles/[battleId]/spell/spell-mutation.ts` — PASS (наявні `dice.test.ts`, `library-spells-chaos.test.ts`, `slot-pact.test.ts`, `spell-mutation.test.ts` без змін).
- [ ] **Step 5:** коміт `feat(constructor): 4c-2 5e spell dice, cantrip scaling, upcast slot choice`.

---

### Task 11: Атака заклинанням

**Files:** modify `lib/utils/battle/spell/cast/outcome.ts` (`resolveOutcome`: гілка `attack`), `spell/cast/state.ts` (`Outcome.critExtra?: number`, `SpellCastState.attackRolls`), `spell/cast/effects.ts` (шкода цілі + `critExtra`), `spell/cast/index.ts`, `types/spell-process.ts`, `cast-spell-schema.ts` (`attackRolls: z.array(z.object({ participantId: z.string(), roll: z.number().int().min(1).max(20) })).optional()`), `spell-mutation.ts`, `types/api.ts`, `lib/utils/battle/spell/power.ts` (`spellAttackBonus(caster)`), `actionDetails` (`spellAttacks?: { participantId, roll, total, ac, hit, crit }[]`); test `lib/utils/battle/spell/__tests__/spell-attack.test.ts`.

**Interfaces — Produces:**

```ts
// power.ts
export function spellAttackBonus(caster: BattleParticipant): number; // spellcasting.spellAttackBonus ?? proficiencyBonus + мод. характеристики заклинань
```

- `resolveOutcome` для `def.resolution.kind === "attack"` (і `withSave`): d20 = `state.attackRolls.find(id)?.roll ?? rollDie(20, rng)`; режим — `forcedRollMode(rollModeReasons(caster, pseudoAttack, flow.ps, { targetId: id, map }))`, де `pseudoAttack` — `{ name: spell.name, type: дальня, якщо ціль не суміжна, інакше ближня; attackBonus: 0, damageDice: "", damageType: "magic", range: spell.targeting.range у футах }` (другий d20 — сервер); `crit = d20 >= rules.criticals.critOn`, `fumble = d20 <= rules.criticals.fumbleOn`; `hit = !fumble && (crit || total >= getEffectiveArmorClass(target, flow.ps))`. Промах → `SKIPPED` і лог `🎯 ${name}: атака заклинанням ${d20}+${bonus}=${total} проти КЗ ${ac} — промах`. Влучання → `{ factor: 1, … }`; крит із `doubleDice` → `critExtra` = сума `rollGroups([{ count: state.diceCount, size: state.diceSides }], rng)` (кубики касту ще раз), лог «крит — кубики подвоєно».
- `effects.ts`: шкода цілі = нинішній розрахунок + `outcome.critExtra ?? 0` (до опорів, як кубики).
- `SpellCastState` отримує `diceCount`, `diceSides` з `spell-mutation` (через `CastSpellParams.dice?: SpellDice`).

- [ ] **Step 1: Failing tests** — влучання (шкода = кубики), промах (без шкоди й ефектів), крит із `doubleDice` (шкода > кубиків на суму `critExtra`, rng-детерміновано), крит без `doubleDice` (як влучання), preset `attackRolls` береться, перешкода від ворога поруч (5e) кидає другий d20.
- [ ] **Step 2:** FAIL. **Step 3:** реалізувати. **Step 4:** нові + `pnpm test:related lib/utils/battle/spell/cast/outcome.ts lib/utils/battle/spell/cast/effects.ts` — PASS.
- [ ] **Step 5:** коміт `feat(constructor): 4c-2 spell attack resolution`.

---

### Task 12: UI бою — майстер атаки, друга рука, діалог касту

**Files:** modify `lib/hooks/battle/useAttackWizard.ts` (лічильник `attacksLeft`/`attacksPerAction`, `offHand`-режим, причини дальності в прев'ю, `doubleDice` для кубиків крита), `components/battle/wizards/AttackWizard.tsx` і `wizards/attack/*` (заголовок «Атака 2/3»), `BonusActionPicker` (пункт «Атака другою рукою», коли є атака `hand: "off"`, `attackedWithLight`, бонус не витрачено), `lib/utils/battle/view/turn-exhausted.ts` (якщо не зроблено в задачі 6 — друга рука тримає хід відкритим), `lib/hooks/battle/useSpellBook.ts`, `lib/utils/battle/flows/spell-flow.ts` (`buildSpellPick(…, castLevel)`, `spellPayload` + `slotKey`, `attackRolls`), `components/battle/wizards/spellbook/SpellCastDialog.tsx` (селект слота для героя 5e: кола `level…9` з `current > 0` + «Пакт · коло N», перерахунок кубиків/цілей; крок d20 для `attack`), `lib/api/battles` (тип запиту), компонентні тести `components/battle/wizards/__tests__/spell-cast-slot.test.tsx`, `components/battle/__tests__/bonus-off-hand.test.tsx`.

**Interfaces:**
- Consumes: `casterSpellDice(caster, spell, castLevel)`, `resolveChosenSlot`, `upcastSteps` (задача 10); `canAttackFromPool`, `attacksPerAction` (задача 6); `rangeDisadvantageReasons` (задача 5); `critDoublesDice` (задача 4); `attackBodySchema.offHand` (задача 7).
- Produces: `buildSpellPick(caster, spell, opts: { castLevel?: number })` → `{ …, diceSlots, maxTargets }`; `slotOptions(caster, spellLevel): { key: string; label: string; castLevel: number; left: number }[]` (у `spell-flow.ts`, без zod).

- [ ] **Step 1: Failing component tests** (`// @vitest-environment happy-dom`, у `ConfirmProvider` за потреби):
  - діалог касту героя 5e зі слотами 1 і 3 і пактом 3: селект показує «Коло 1», «Коло 3», «Пакт · коло 3»; вибір «Коло 3» для заклинання з `upcastDice: 1, dice 3, level 1` змінює кількість кубиків на 5; HOMM-герой селекта не бачить;
  - `slotOptions` (чиста функція): лише кола ≥ рівня заклинання з `current > 0`, пакт ≥ рівня;
  - `BonusActionPicker`: пункт «Атака другою рукою» є лише при атаці `hand: "off"` + `attackedWithLight` + невитраченому бонусі.
- [ ] **Step 2:** FAIL. **Step 3:** реалізувати (крок d20 атаки заклинанням — перевикористати `RollStep` майстра атаки, якщо він приймає довільну підпис/бонус; інакше той самий компонент кидка, що й у рятівних кидках діалогу касту).
- [ ] **Step 4:** нові + `pnpm test:related lib/hooks/battle/useAttackWizard.ts lib/hooks/battle/useSpellBook.ts lib/utils/battle/flows/spell-flow.ts` — PASS (`spell-book.test.tsx` без змін).
- [ ] **Step 5:** коміт `feat(constructor): 4c-2 battle UI — attack counter, off-hand, slot picker, spell attack`.

---

### Task 13: UI контенту — форми зброї й атаки юніта, документи

**Files:** modify `components/artifacts/ArtifactWeaponFields.tsx` (чекбокси `WEAPON_TRAITS` з підписами + поле «Кубик двома руками» для `versatile`; текстове «Властивості» → підпис «Примітка»), `components/units/form/UnitAttack.tsx` (ті самі чекбокси), відповідні form-model файли (знайти `grep -rn "properties" lib/utils/artifacts lib/utils/units components/units/form | head`); docs: `docs/architecture/battle.md` (новий підрозділ «5e: атаки й заклинання» — `damageModel`, `attack/ability.ts`, `traits`, досяжність/дальність, `attacksLeft`, друга рука, `doubleDice`, `spellDice5e`, `slotKey`, атака заклинанням), `docs/architecture/abilities.md` (`attacksPerAction`, `twoWeaponFighting`), `docs/architecture/content-api.md` (поля заклинання, `traits` зброї); test `components/artifacts/__tests__/weapon-traits-fields.test.tsx` (чекбокс додає/знімає трейт у формі).

- [ ] **Step 1:** компонентний тест — FAIL. **Step 2:** реалізувати форми. **Step 3:** тест — PASS; `pnpm lint` по змінених файлах.
- [ ] **Step 4:** документи (українською, стисло, за стилем наявних розділів).
- [ ] **Step 5:** коміт `feat(constructor): 4c-2 weapon trait forms and docs`.

---

### Task 14: Повна перевірка

- [ ] `pnpm test:run` — усі зелені (відомий нестабільний `lib/hooks/battle/__tests__/battle-fx.test.tsx` — перезапустити окремо).
- [ ] `pnpm lint` — 0 errors.
- [ ] `pnpm build`.
- [ ] `set -a; source .env.local; set +a; pnpm battle-sweep --campaign cmuylhk0c0001ia06lg5eommv` — без регресу (відомий нестабільний сценарій лабіринту «ворог у полі зору прокидається»).
- [ ] Звіт контролеру: список комітів, будь-які відхилення від плану.

(Фінальне рев'ю opus, хвиля виправлень, повторне рев'ю, `/simplify`, живий прогін, `docs/STATUS.md`, хендоф і пам'ять — робить контролер після задачі 14.)
