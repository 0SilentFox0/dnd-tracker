# Етап 4f-2: броня 5e і числа класів — план реалізації

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** герой у режимі класів отримує КЗ 5e з моделі броні артефакта (легка/середня/важка, межа Спр, вимога Сили, перешкода скритності), а вміння класів — числа з таблиці класу (`classes.columns`: `{ scale }`, `class_level`, змінні формул `*_mod`/`prof`, спільні пули `limits.pool`), умови `armorWorn`/`attackRollMode`/`allyAdjacent` і прапорець `evasion`; конвертер SRD 5.2 дає 12 обладунків і колонки/пули/37 механізованих умінь класів; дані й локальний шаблон перезалито.

**Architecture:** броня живе записами в наявній колонці `artifacts.modifiers` (окремий enum `ArmorModifierType`, `armorStatsFromRow` спільний для сервера, клієнта й snapshot). КЗ 5e рахує чиста `applyClassArmor` після `bakePassives` лише для героя з класами; щит, Unarmored Defense, Shield — як і досі `modifyStat armor` через `collectModifiers`. Таблиця класу — нова колонка `classes.columns` (міграція лише розширює); посилання `{ scale }`, `class_level` і ключі пулів розв'язуються **при збиранні** (`applyClassScale` у `classResolved`), а формульні `perRest.uses` — після запікання (`resolveLimitFormulas`), тож рушій бачить звичайні числа й кубики. Пул — `battleData.pools` + лічильник `abilityUsage[poolKey].battle`; між боями — `resources.charges[poolKey]` (4d). Усі нові шляхи рушія закриті умовою «герой з класами / нове поле присутнє»; HOMM5 не змінюється.

**Tech Stack:** TypeScript strict, Next.js 16, React 19, Prisma 6 (PostgreSQL), Zod 4, Vitest (+ happy-dom для компонентів), `tsx`-скрипти (`tsconfig.scripts.json`).

**Spec:** `docs/superpowers/specs/2026-10-22-constructor-stage4-5e-design.md` — розділ «## 4f-2. Дизайн: броня 5e і числа класів» (§1–§8), «Загальні правила етапу 4», «Ризики». Рішення щодо відкритих питань спеку (користувач спав, прийнято рекомендоване): (1) КЗ у режимі класів **не читає** `Character.armorClass`; (2) пули Channel Divinity різних класів мультикласу — **окремі**; (3) короткий відпочинок — наближення зі спеку (див. «Рішення»); (4) поля броні у формі артефакта — **лише коли класи ввімкнені**; (5) фільтр школи Evocation — див. «Рішення».

## Global Constraints

- Worktree `/Users/silentfox/Work/dnd-tracker-constructor`, гілка `feat/constructor`; `/Users/silentfox/Work/dnd-tracker` не чіпати. БД лише `postgresql://postgres:postgres@localhost:54322/constructor`; prod і prodcopy не чіпати.
- **Нульова зміна HOMM5.** Кожен новий шлях рушія закритий однією з умов: герой у режимі класів (`rules.classes.enabled` і розв'язані класи; ознака на учаснику — `isClassModeHero(p)`: `sourceType === "character"` і `abilities.damageModel === "5e"`), або нове необов'язкове поле присутнє (`armor`, `columns`, `battleData.pools`, `{ scale }`, `limits.pool`, `rollMode`), або новий ключ умови/прапорця (`armorWorn`, `attackRollMode`, `allyAdjacent`, `evasion`), якого немає в HOMM-контенті.
- **Наявні тести не редагувати** — лише нові `it(...)`/файли. Єдині дозволені правки наявних тестів (спек свідомо змінює вихід конвертера 4f-1): `scripts/srd/__tests__/classes.test.ts` — три твердження (Second Wind, Action Surge 17, Unarmored Movement; задача 14), `scripts/srd/__tests__/data-integrity.test.ts` — `EXPECTED.artifacts` 39 → 51 (задача 15), і, лише якщо після задачі 15 документ OpenAPI все ще ≥ 130 000 символів, межа в `lib/server/content/__tests__/openapi.test.ts` → `135_000` (задача 15, з поясненням у коміті).
- Рушій читає бонуси лише через `collectModifiers`/`runAbilities`; колонку `abilities` — лише через `lib/utils/abilities/read.ts`. Нових записувачів `battle_participants.snapshot` немає (пули — частина `battleData`, яку пише наявний конвеєр разом із `snapshotHash`).
- Нові поля спільних типів — **необов'язкові** (`GameClassData.columns?`, `BattleParticipantBattleData.pools?`, `rollMode?` у подіях `attack`/`hit`, `ArtifactFormState.armor?`, `ArtifactData.armor?`, `CharacterSheet.classTable?`), щоб наявні тести компілювались без змін.
- Міграція одна: `prisma/migrations/20261101000000_class_columns/migration.sql` = `ALTER TABLE "classes" ADD COLUMN "columns" JSONB NOT NULL DEFAULT '[]';` (лише розширення; таблиця вже з RLS). Застосування: `set -a; source .env.local; set +a; pnpm exec prisma migrate deploy && pnpm exec prisma generate` (**не** `migrate dev`).
- Нові змінні формул: `str_mod`, `dex_mod`, `con_mod`, `int_mod`, `wis_mod`, `cha_mod` (запечені модифікатори), `prof` (бонус майстерності), `class_level` (у рушії — запасне значення `hero_level`). Перед злиттям задачі 4 — пошук цих слів у локальній БД і в репо (крок у задачі 4).
- OpenAPI (`lib/server/content/__tests__/openapi.test.ts`, межа `< 130_000`, зараз 129 850): спершу дедуплікація — `Formula`, `Flat`, `Amount`, `ArmorStats`, `ClassColumn` реєструються в `SHARED_SCHEMAS` (`$ref`), що звільняє ≈ 1 900 символів (виміряно). Межу піднімати лише за умовою вище.
- Ключ колонки класу: `CLASS_COLUMN_KEY_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/`, ≤ 40 символів; колонок ≤ 12; рівно 20 клітинок; ключ пулу при збиранні — `pool:<classId>:<key>`.
- Шари й стиль: компоненти не імпортують `@/lib/api/*`; UI українською, ідентифікатори англійською; мінімум коментарів (лише неочевидне «чому»). ESLint: порожні рядки навколо `const`/`let`/`if`/`return`/блоків, `simple-import-sort`, `import/no-cycle`, `no-console` (у `scripts/` дозволено `info/warn/error`). Імпорти всередині `scripts/srd` — відносні, з `lib/` — через `@/`.
- Тести: під час роботи `pnpm test:run <files>`; після змін типів — `pnpm exec tsc --noEmit -p tsconfig.json` (тип-перевірка охоплює тести й `scripts/**`); повний `pnpm test:run`, `pnpm lint`, `pnpm build` — лише в задачі 17.
- Коміти з трейлером `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`; `.superpowers/` не комітити.

## Review Focus

1. **HOMM-герой і герой без класів**: у кампанії з `classes.enabled` герой без класів, а також HOMM-кампанія з артефактом, що має `armor`, — КЗ = `Character.armorClass`, швидкість без штрафу, жодного синтетичного вміння броні, у `battleData` немає ключа `pools`. Тести в задачах 2 і 7.
2. **Броня без моделі й «щит», що є зброєю**: HOMM-артефакт у слоті «Броня» без `armor` у героя з класами — «без броні» (10 + Спр), а його вміння діють; легка зброя другої руки в клітинці «Щит» щитом не є (`armorWorn shield: "without"` істинна). Тести в задачах 2 і 3.
3. **Мультиклас Fighter 3 / Monk 5**: `{ scale }` і `class_level` беруть рівень свого класу; пули різних класів — окремі ключі `pool:<classId>:…`; підклас бере колонки свого класу. Тести в задачах 7 і 8.
4. **Криві дані таблиці**: невідомий ключ, кубики в числовому полі, порожня клітинка на рівні героя (Monk 1, Focus «»), рівень > 20 — рушій дає 0/вміння недоступне без винятку; редактор показує проблему. Тести в задачах 6 і 7.
5. **Пул між боями**: витрачений пул пишеться в `resources.charges[poolKey]` з видом відпочинку колонки; короткий відпочинок скидає короткі пули, довгий — усе; якщо ДМ зменшив значення колонки (used > max), залишок 0, не від'ємний. Тести в задачі 8.

## Рішення щодо неоднозначностей спеку

- **Фільтр школи Evocation (питання 5).** Рушій порівнює `damageBonus.filter.school` з **id** групи заклинань: `lib/utils/battle/spell/power.ts` передає `{ damage: { kind: "magic", school: input.groupId } }`, а `inheritSchool` у `abilities/build/collect.ts` пише `spellGroupId`. Тому в даних SRD `school` лишається **назвою** («Evocation», переносно між кампаніями), а завантажувач перед імпортом не-заклинальних видів замінює кожен рядок `school`, що збігається з назвою групи кампанії, на її id (`resolveSchoolRefs`, задача 15). Копія шаблону зберігає id (`remapIds` переписує id будь-де в JSON). Ручний імпорт `classes.json` через UI лишить назву (бонус не спрацює) — записано в `content-api.md`.
- **КЗ (питання 1).** У режимі класів база = броня або `10 + мод. Спр`; `Character.armorClass` не читається; у формі персонажа поле КЗ лише для читання з розкладом листа. HOMM — без змін.
- **Мультиклас (питання 2).** Пули Channel Divinity Cleric і Paladin — окремі (`pool:<cleric>:channel-divinity-uses`, `pool:<paladin>:channel-divinity-uses`).
- **Відпочинки (питання 3).** Часткового відновлення немає: Channel Divinity, Focus Points, Wild Shape, Action Surge, Relentless Rage — короткий; Rage, Second Wind, Sorcery Points, Lay on Hands, Bardic Inspiration, Innate Sorcery, Wholeness of Body, Uncanny Metabolism — довгий.
- **Поля броні (питання 4).** Вкладка «Броня» у формі артефакта — лише при `slot = armor` і `rules.classes.enabled`.
- **`armorWorn.shield`** — `"with" | "without"` замість `boolean` спеку: редактор умов має лише select/toggle, а toggle не задає «так/ні/байдуже». Семантика та сама.
- **`rollMode` події** — остаточний режим кидка атаки (`attackRoll.secondRoll?.mode`, уже з урахуванням `rollModeReasons` і вибору гравця); у подію пишеться лише перевага/недолік, відсутність = `"normal"`.
- **Нестача пулу** — вміння зникає з вибору (як і зараз при вичерпаному ліміті), сервер відмовляє `API_ERRORS.ABILITY_POOL_EMPTY`. Плитка показує залишок пулу.
- **Кубики в числовому полі** (`Flat`, `perRest.uses`) і нерозв'язане посилання → 0; `perRest.uses = 0` → вміння недоступне.
- **`resolveLimitFormulas`** застосовується в `from-character` і `from-unit` після запікання; для вмінь без формульних `uses` повертає того самого учасника (той самий об'єкт).
- **OpenAPI.** Спек каже «оновити `app/api/openapi.json`» — це згенерований роут (`getOpenApiDocument()`), окремого файлу немає; схеми потрапляють туди з ресурсів автоматично.
- **Фікстури.** Нова тека `scripts/srd/__tests__/fixtures-4f2/` (Barbarian, Rogue, Cleric, Paladin, Sorcerer, Druid, Monk, Fighter, Bard, Wizard з підкласами + 4 обладунки й щит), щоб тести 4f-1 на `fixtures/` лишились незмінними.
- **Кількість умінь** — 37 (6 уточнених: Rage, Fast Movement, Unarmored Movement, Second Wind, Action Surge, Draconic Resilience; 31 нове), а не 34 спеку: Evasion рахується для Monk і Rogue окремо, Channel Divinity Cleric/Paladin і Monk's Focus розгорнуто в опції. Draconic Resilience — два вміння (HP `class_level` без умови й КЗ `cha_mod` з `armorWorn none`), бо HP не має залежати від броні.
- **Наближення:** Lay on Hands — ціна 5, лікування 5; Sacred Weapon і Superior Defense — бонусною дією; Preserve Life — одна ціль; Bardic Inspiration — мітка на 99 раундів; Turn Undead, Divine Sense, Flurry of Blows, Step of the Wind — лише списання пулу (ефект — нотатка); Font of Magic — «Створити слот» ціна 2, `restoreSpellSlot 1`.
- **Дані Open5e:** колонка `druid_wild-shape-uses` названа в Open5e «Cantrips Known» → назва «Wild Shape» (оверрайд); колонки слотів Warlock (`slot-level`, `spell-slots`) відкидаються (їх рахує `classSpellSlots`).
- **Таблиця класу на листі** — `CharacterSheet.classTable?: string[]` (рядок на клас: «Barbarian 5 · Rages 3 · Rage Damage +2»), показ під рядком HP у шапці профілю. Пули — у наявному списку «Заряди» (`SheetRest.charges`).

---

## Карта файлів

| Файл | Відповідальність |
|---|---|
| `lib/constants/artifacts.ts` | + `ArmorModifierType` |
| `lib/utils/artifacts/armor-stats.ts` | `ArmorStatsSchema`, `armorStatsColumns`, `armorStatsFromRow`, `armorDexCap` |
| `lib/utils/artifacts/worn-armor.ts` | `wornArmor`, `wornArmorCategory`, `hasShield`, `armorWornMatches` |
| `lib/utils/characters/classes/armor-class.ts` | `isClassModeHero`, `classArmorBase`, `armorPenalties`, `applyClassArmor` |
| `lib/utils/characters/classes/columns.ts` | `parseColumnValue`, `columnValueAt`, `classColumnIssues`, `parseColumnValuesText`, `classTableText` |
| `lib/utils/abilities/class-columns.ts` | `abilityColumnRefs`, `columnRefIssues`, `applyClassScale`, `poolKey`, `classPools` |
| `lib/utils/abilities/build/limit-formulas.ts` | `resolveLimitFormulas` |
| `lib/utils/battle/saves/evasion.ts` | `hasEvasion`, `evasionFactor` |
| `lib/utils/abilities/schema/{common,ability,conditions,effects}.ts` | `ScaleSchema`, `Flat`/`Amount`/`perRest.uses`/`limits.pool`, нові умови, прапорець `evasion`, `isStaticCondition` |
| `lib/utils/abilities/registry/{conditions,labels}.ts`, `registry/effects/{static,flags}.ts` | оцінка й підписи нових умов/прапорця, підписи `{ scale }`/пулу |
| `lib/utils/abilities/engine/core/{amount,usage,run-abilities}.ts` | змінні формул, `restUses`, пули |
| `lib/utils/abilities/build/{bake,collect}.ts` | статичні умови в запіканні, `applyClassScale` у `classResolved` |
| `lib/utils/abilities/editor.ts` | `validateAbilities(list, { classColumns })` |
| `lib/utils/battle/participant/{from-character,from-unit,refresh-from-source}.ts` | КЗ 5e, пули, формульні ліміти |
| `lib/utils/battle/attack/{roll,process/hit,process/run}.ts`, `types/abilities.ts` | `rollMode` у подіях |
| `lib/utils/battle/spell/cast/outcome.ts`, `lib/utils/battle/maneuvers/fire-burst.ts` | `evasion` |
| `lib/utils/battle/pipeline/ability-use.ts`, `lib/utils/battle/view/hero.ts` | відмова й показ пулу |
| `lib/utils/characters/resources/battle.ts`, `lib/utils/characters/sheet/{rest-block,lines,build-sheet}.ts` | пули в ресурсах і на листі, розклад КЗ, таблиця класу |
| `prisma/schema.prisma`, `prisma/migrations/20261101000000_class_columns/migration.sql` | колонка `classes.columns` |
| `lib/schemas/{artifacts,classes}.ts`, `lib/server/content/resources/{artifacts,classes}.ts`, `lib/utils/characters/classes/row.ts`, `types/{classes,battle,artifacts,characters}.ts` | `armor`, `columns` через ресурс |
| `lib/utils/content/import/fields/{artifacts,classes}.ts`, `lib/server/content/import/export.ts`, `lib/server/content/json-schema.ts` | імпорт/експорт, OpenAPI |
| `lib/constants/{api-errors,classes}.ts` | тексти відмов, `CLASS_COLUMN_KEY_RE`, `MAX_CLASS_COLUMNS` |
| `components/classes/{ClassColumnsEditor,ClassForm,ClassFeaturesEditor,SubclassesEditor}.tsx` | вкладка «Таблиця класу» |
| `components/abilities/{AbilityListEditor,editor-context,ConditionEditor}.tsx`, `components/abilities/fields/{FlatField,AmountField,ScaleColumnSelect}.tsx`, `components/abilities/sections/LimitsSection.tsx` | режим «З таблиці класу», пул, підказка змінних |
| `components/artifacts/{ArtifactArmorFields,ArtifactForm,ArtifactEditForm,artifact-form-tabs}.tsx`, `lib/utils/artifacts/artifact-form.ts`, `lib/hooks/artifacts/useArtifactForm.ts`, `app/campaigns/[id]/dm/artifacts/[artifactId]/page.tsx` | блок «Броня» |
| `components/characters/stats/CharacterCombatParams.tsx`, `components/character-profile/{ProfileEditor,ProfileHero}.tsx`, `components/characters/NewCharacterForm.tsx` | КЗ лише для читання, таблиця класу |
| `components/battle/participants/MyHeroPanel.tsx`, `components/battle/wizards/BonusActionPicker.tsx` | пули в бою |
| `scripts/srd/lib/{open5e,types,load-template}.ts`, `scripts/srd/convert/{artifacts,classes}.ts`, `scripts/srd/overrides/classes.ts`, `scripts/srd/load-template.ts` | конвертер броні, колонок, пулів, умінь; школи → id |
| `scripts/srd/__tests__/fixtures-4f2/*.json`, `scripts/srd/__tests__/{armor-4f2,classes-4f2,data-integrity-4f2}.test.ts` | фікстури й тести |
| `data/templates/srd-5.2/*.json` | перегенеровані дані |
| `docs/architecture/{battle,abilities,content-api}.md`, `docs/STATUS.md`, `docs/superpowers/constructor-handoff.md` | документи |

---

### Task 1: Модель броні артефакта (схема, `modifiers`, ресурс, імпорт/експорт) і дедуплікація OpenAPI

**Files:**
- Modify: `lib/constants/artifacts.ts` (після `enum ArtifactModifierType`, рядок ~126)
- Create: `lib/utils/artifacts/armor-stats.ts`
- Modify: `lib/schemas/artifacts.ts`, `lib/constants/api-errors.ts`, `lib/server/content/resources/artifacts.ts`, `lib/utils/content/import/fields/artifacts.ts`, `lib/server/content/import/export.ts`, `lib/server/content/json-schema.ts`
- Test: `lib/utils/artifacts/__tests__/armor-stats.test.ts`, `lib/schemas/__tests__/artifacts-armor.test.ts`, `lib/server/content/__tests__/openapi-4f2.test.ts`

**Interfaces:**
- Produces: `enum ArmorModifierType { CATEGORY = "armorCategory", BASE = "armorBase", DEX_CAP = "armorDexCap", STRENGTH = "armorStrength", STEALTH = "armorStealth" }`; `ARMOR_CATEGORIES`, `type ArmorCategory = "light" | "medium" | "heavy"`; `ArmorStatsSchema`, `type ArmorStats = { category; base: number; dexCap?: number | null; strength?: number; stealthDisadvantage?: boolean }`; `armorStatsColumns(stats: ArmorStats): { modifiers: Array<{ type: string; value: string }> }`; `armorStatsFromRow(row: { modifiers?: unknown }): ArmorStats | null`; `armorDexCap(stats: ArmorStats): number | null` (null — без межі); `API_ERRORS.ARMOR_SLOT_ONLY`; поле `armor` у `createArtifactSchema`/`patchArtifactSchema`; спільні схеми OpenAPI `Formula`, `Flat`, `Amount`, `ArmorStats`.

- [ ] **Step 1: Write the failing tests**

`lib/utils/artifacts/__tests__/armor-stats.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { armorDexCap, armorStatsColumns, armorStatsFromRow } from "@/lib/utils/artifacts/armor-stats";
import { weaponStatsColumns, weaponStatsFromRow } from "@/lib/utils/artifacts/weapon-stats";

describe("armor stats in modifiers", () => {
  it("round-trips heavy armor with strength and stealth", () => {
    const stats = { category: "heavy" as const, base: 16, strength: 13, stealthDisadvantage: true };

    const cols = armorStatsColumns(stats);

    expect(cols.modifiers).toEqual([
      { type: "armorCategory", value: "heavy" },
      { type: "armorBase", value: "16" },
      { type: "armorStrength", value: "13" },
      { type: "armorStealth", value: "true" },
    ]);
    expect(armorStatsFromRow(cols)).toEqual(stats);
  });

  it("keeps an explicit dex cap, drops empty optional fields", () => {
    expect(armorStatsFromRow(armorStatsColumns({ category: "medium", base: 14, dexCap: 3 }))).toEqual({ category: "medium", base: 14, dexCap: 3 });
    expect(armorStatsFromRow(armorStatsColumns({ category: "light", base: 11 }))).toEqual({ category: "light", base: 11 });
  });

  it("no armor records / broken records → null; weapon reader ignores armor records", () => {
    expect(armorStatsFromRow({ modifiers: [] })).toBeNull();
    expect(armorStatsFromRow({ modifiers: [{ type: "armorCategory", value: "heavy" }] })).toBeNull();
    expect(armorStatsFromRow({ modifiers: [{ type: "armorCategory", value: "cloth" }, { type: "armorBase", value: "12" }] })).toBeNull();
    expect(armorStatsFromRow({ modifiers: "x" })).toBeNull();
    expect(weaponStatsFromRow(armorStatsColumns({ category: "heavy", base: 18 }))).toEqual({});
  });

  it("weapon records do not look like armor", () => {
    expect(armorStatsFromRow(weaponStatsColumns({ damageDice: "1d8", damageType: "slashing" }))).toBeNull();
  });

  it("dex cap defaults by category", () => {
    expect(armorDexCap({ category: "light", base: 11 })).toBeNull();
    expect(armorDexCap({ category: "medium", base: 14 })).toBe(2);
    expect(armorDexCap({ category: "heavy", base: 16 })).toBe(0);
    expect(armorDexCap({ category: "medium", base: 14, dexCap: 3 })).toBe(3);
    expect(armorDexCap({ category: "medium", base: 14, dexCap: null })).toBe(2);
  });
});
```

`lib/schemas/__tests__/artifacts-armor.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { API_ERRORS } from "@/lib/constants/api-errors";
import { createArtifactSchema, patchArtifactSchema } from "@/lib/schemas/artifacts";

const armor = { category: "heavy", base: 16, strength: 13, stealthDisadvantage: true };

describe("artifact armor field", () => {
  it("accepts armor only in the armor slot", () => {
    expect(createArtifactSchema.safeParse({ name: "Chain Mail", slot: "armor", armor }).success).toBe(true);

    const wrong = createArtifactSchema.safeParse({ name: "Sword", slot: "weapon", armor });

    expect(wrong.success).toBe(false);
    expect(wrong.error?.issues[0]).toMatchObject({ path: ["armor"], message: API_ERRORS.ARMOR_SLOT_ONLY });
  });

  it("patch: armor with another slot fails, armor without slot passes (resource checks the stored slot)", () => {
    expect(patchArtifactSchema.safeParse({ slot: "ring", armor }).success).toBe(false);
    expect(patchArtifactSchema.safeParse({ armor }).success).toBe(true);
    expect(patchArtifactSchema.safeParse({ slot: "armor", armor }).success).toBe(true);
  });

  it("validates ranges and category", () => {
    expect(createArtifactSchema.safeParse({ name: "X", slot: "armor", armor: { category: "cloth", base: 11 } }).success).toBe(false);
    expect(createArtifactSchema.safeParse({ name: "X", slot: "armor", armor: { category: "light", base: 0 } }).success).toBe(false);
    expect(createArtifactSchema.safeParse({ name: "X", slot: "armor", armor: { category: "light", base: 31 } }).success).toBe(false);
  });

  it("HOMM artifacts without armor still parse", () => {
    expect(createArtifactSchema.safeParse({ name: "Кільце", slot: "ring" }).success).toBe(true);
    expect(patchArtifactSchema.safeParse({ name: "Кільце" }).success).toBe(true);
  });
});
```

`lib/server/content/__tests__/openapi-4f2.test.ts`:

```ts
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/utils/api/actor", () => ({ resolveActor: vi.fn() }));

import { buildOpenApi } from "@/lib/server/content/openapi";

const doc = buildOpenApi();

const json = (v: unknown) => JSON.stringify(v);

describe("OpenAPI 4f-2", () => {
  it("Formula, Flat, Amount and ArmorStats are shared components", () => {
    for (const id of ["Formula", "Flat", "Amount", "ArmorStats"]) expect(doc.components.schemas).toHaveProperty(id);
    expect(json(doc.components.schemas["Effect.heal"])).toContain("#/components/schemas/Amount");
    expect(json(doc.components.schemas["Effect.modifyStat"])).toContain("#/components/schemas/Flat");
    expect(json(doc.components.schemas.ArtifactsCreate)).toContain("#/components/schemas/ArmorStats");
  });

  it("stays compact", () => {
    expect(json(doc).length).toBeLessThan(130_000);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm test:run lib/utils/artifacts/__tests__/armor-stats.test.ts lib/schemas/__tests__/artifacts-armor.test.ts lib/server/content/__tests__/openapi-4f2.test.ts`
Expected: FAIL — `Cannot find module '@/lib/utils/artifacts/armor-stats'`, `armor` невідоме поле, схем `Amount`/`ArmorStats` немає.

- [ ] **Step 3: `ArmorModifierType`** — у `lib/constants/artifacts.ts` одразу після `enum ArtifactModifierType { … }`:

```ts
// окремо від ArtifactModifierType: weaponStatsFromRow бере лише свої типи
export enum ArmorModifierType {
  CATEGORY = "armorCategory",
  BASE = "armorBase",
  DEX_CAP = "armorDexCap",
  STRENGTH = "armorStrength",
  STEALTH = "armorStealth",
}
```

- [ ] **Step 4: `lib/utils/artifacts/armor-stats.ts`**

```ts
import { z } from "zod";

import { ArmorModifierType } from "@/lib/constants/artifacts";

export const ARMOR_CATEGORIES = ["light", "medium", "heavy"] as const;

export type ArmorCategory = (typeof ARMOR_CATEGORIES)[number];

export const ArmorStatsSchema = z.object({
  category: z.enum(ARMOR_CATEGORIES),
  base: z.number().int().min(1).max(30),
  dexCap: z.number().int().min(0).max(10).nullable().optional(),
  strength: z.number().int().min(1).max(30).optional(),
  stealthDisadvantage: z.boolean().optional(),
});

export type ArmorStats = z.infer<typeof ArmorStatsSchema>;

const DEFAULT_DEX_CAP: Record<ArmorCategory, number | null> = { light: null, medium: 2, heavy: 0 };

export function armorDexCap(stats: ArmorStats): number | null {
  return stats.dexCap ?? DEFAULT_DEX_CAP[stats.category];
}

export function armorStatsColumns(stats: ArmorStats): { modifiers: Array<{ type: string; value: string }> } {
  return {
    modifiers: [
      { type: ArmorModifierType.CATEGORY, value: stats.category },
      { type: ArmorModifierType.BASE, value: String(stats.base) },
      ...(stats.dexCap != null ? [{ type: ArmorModifierType.DEX_CAP, value: String(stats.dexCap) }] : []),
      ...(stats.strength ? [{ type: ArmorModifierType.STRENGTH, value: String(stats.strength) }] : []),
      ...(stats.stealthDisadvantage ? [{ type: ArmorModifierType.STEALTH, value: "true" }] : []),
    ],
  };
}

export function armorStatsFromRow(row: { modifiers?: unknown }): ArmorStats | null {
  const byType = new Map<string, string>();

  for (const m of Array.isArray(row.modifiers) ? row.modifiers : []) {
    if (!m || typeof m !== "object") continue;

    const { type, value } = m as { type?: unknown; value?: unknown };

    if (typeof type === "string" && value != null) byType.set(type, String(value));
  }

  const category = byType.get(ArmorModifierType.CATEGORY);

  const base = byType.get(ArmorModifierType.BASE);

  if (!category || !base) return null;

  const dexCap = byType.get(ArmorModifierType.DEX_CAP);

  const strength = byType.get(ArmorModifierType.STRENGTH);

  const parsed = ArmorStatsSchema.safeParse({
    category,
    base: Number(base),
    ...(dexCap !== undefined && { dexCap: Number(dexCap) }),
    ...(strength !== undefined && { strength: Number(strength) }),
    ...(byType.get(ArmorModifierType.STEALTH) === "true" && { stealthDisadvantage: true }),
  });

  return parsed.success ? parsed.data : null;
}
```

- [ ] **Step 5: Error text** — у `lib/constants/api-errors.ts` після `ARTIFACT_HELD_BY_OTHER`:

```ts
  ARMOR_SLOT_ONLY: "Модель броні — лише для артефакта в слоті «Броня»",
```

- [ ] **Step 6: Schemas** — `lib/schemas/artifacts.ts` повністю:

```ts
import { z } from "zod";

import { API_ERRORS } from "@/lib/constants/api-errors";
import { ARTIFACT_RARITY_VALUES, ARTIFACT_SLOT_VALUES, ArtifactSlot } from "@/lib/constants/artifacts";
import { AbilitiesSchema } from "@/lib/utils/abilities/schema";
import { ArmorStatsSchema } from "@/lib/utils/artifacts/armor-stats";
import { WeaponStatsSchema } from "@/lib/utils/artifacts/weapon-stats";

const armorSlotOnly = { message: API_ERRORS.ARMOR_SLOT_ONLY, path: ["armor"] };

export const createArtifactSchema = z
  .object({
    name: z.string().min(1).max(100),
    description: z.string().optional(),
    rarity: z.enum(ARTIFACT_RARITY_VALUES).optional(),
    slot: z.enum(ARTIFACT_SLOT_VALUES),
    abilities: AbilitiesSchema.describe("Здібності артефакту").optional(),
    weapon: WeaponStatsSchema.optional(),
    armor: ArmorStatsSchema.describe("Броня 5e (лише слот armor)").optional(),
    setId: z.string().optional(),
    icon: z.preprocess(
      (val) => (val === "" ? null : val),
      z.string().url().nullable().optional(),
    ),
  })
  .refine((d) => d.armor === undefined || d.slot === ArtifactSlot.ARMOR, armorSlotOnly);

export const patchArtifactSchema = z
  .object({
    name: z.string().min(1).max(100).optional(),
    description: z.string().nullable().optional(),
    rarity: z.enum(ARTIFACT_RARITY_VALUES).nullable().optional(),
    slot: z.enum(ARTIFACT_SLOT_VALUES).optional(),
    abilities: AbilitiesSchema.describe("Здібності артефакту").optional(),
    weapon: WeaponStatsSchema.optional(),
    armor: ArmorStatsSchema.describe("Броня 5e (лише слот armor)").optional(),
    setId: z.string().nullable().optional(),
    icon: z.preprocess(
      (val) => (val === "" ? null : val),
      z.string().url().nullable().optional(),
    ),
  })
  .refine((d) => d.armor === undefined || d.slot === undefined || d.slot === ArtifactSlot.ARMOR, armorSlotOnly);
```

- [ ] **Step 7: Resource** — `lib/server/content/resources/artifacts.ts`:
  - імпорти: `import { ArtifactSlot } from "@/lib/constants/artifacts";`, `import { ContentError } from "@/lib/server/content/errors";`, `import { armorStatsColumns } from "@/lib/utils/artifacts/armor-stats";`;
  - `description: "Артефакти: слот, рідкість, сет, зброя, броня 5e (armor — лише слот armor), бонуси (здібності)."`;
  - `errors: [400, 422]`;
  - у `create` в `data` після рядка `...(data.weapon && weaponStatsColumns(data.weapon)),` додати `...(data.armor && armorStatsColumns(data.armor)),`;
  - у `update` першим рядком: `if (data.armor && (data.slot ?? existing.slot) !== ArtifactSlot.ARMOR) throw new ContentError(API_ERRORS.ARMOR_SLOT_ONLY, 400);`, а в `data` після `...(data.weapon && weaponStatsColumns(data.weapon)),` — `...(data.armor && armorStatsColumns(data.armor)),`.

- [ ] **Step 8: Import / export** — у `lib/utils/content/import/fields/artifacts.ts` після поля `weapon`: `jsonField("armor", "Броня (JSON)", ["armor"]),`. У `lib/server/content/import/export.ts`: імпорти `import { ArtifactSlot } from "@/lib/constants/artifacts";` і `import { armorStatsFromRow } from "@/lib/utils/artifacts/armor-stats";`; у `EXPORT_LOADERS.artifacts` об'єкт рядка доповнити `armor: r.slot === ArtifactSlot.ARMOR ? (armorStatsFromRow(r) ?? undefined) : undefined`.

- [ ] **Step 9: OpenAPI shared schemas** — `lib/server/content/json-schema.ts`: імпорти `import { AmountSchema, FlatSchema, FormulaSchema } from "@/lib/utils/abilities/schema/common";` і `import { ArmorStatsSchema } from "@/lib/utils/artifacts/armor-stats";`; у `SHARED_SCHEMAS` перед `[AbilityKeySchema, "AbilityKey"]` додати:

```ts
  [FormulaSchema, "Formula"],
  [FlatSchema, "Flat"],
  [AmountSchema, "Amount"],
```

і після `[WeaponStatsSchema, "WeaponStats"]` — `[ArmorStatsSchema, "ArmorStats"],`.

- [ ] **Step 10: Run tests to verify they pass**

Run: `pnpm test:run lib/utils/artifacts lib/schemas/__tests__/artifacts-armor.test.ts lib/server/content lib/utils/content`
Expected: PASS (нові й наявні, зокрема `openapi.test.ts` < 130 000 і `tool-schemas.test.ts`).

- [ ] **Step 11: Type check** — `pnpm exec tsc --noEmit -p tsconfig.json` → 0 errors.

- [ ] **Step 12: Commit**

```bash
git add lib/constants/artifacts.ts lib/constants/api-errors.ts lib/utils/artifacts/armor-stats.ts lib/schemas/artifacts.ts lib/server/content/resources/artifacts.ts lib/utils/content/import/fields/artifacts.ts lib/server/content/import/export.ts lib/server/content/json-schema.ts lib/utils/artifacts/__tests__/armor-stats.test.ts lib/schemas/__tests__/artifacts-armor.test.ts lib/server/content/__tests__/openapi-4f2.test.ts
git commit -m "feat(constructor): 4f-2 artifact armor model in modifiers, shared Flat/Amount schemas

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: КЗ 5e і наслідки броні (учасник, лист)

**Files:**
- Create: `lib/utils/artifacts/worn-armor.ts`, `lib/utils/characters/classes/armor-class.ts`
- Modify: `lib/utils/battle/participant/from-character.ts:208-217`, `lib/utils/characters/sheet/lines.ts:22-35`
- Test: `lib/utils/characters/classes/__tests__/armor-class.test.ts`, `lib/utils/battle/participant/__tests__/from-character-armor.test.ts`

**Interfaces:**
- Consumes: `armorStatsColumns`, `armorStatsFromRow`, `armorDexCap`, `ArmorStats`, `ArmorCategory` (задача 1); `weaponStatsFromRow` (наявна).
- Produces:
  - `worn-armor.ts`: `type WornArmorKind = "none" | ArmorCategory`; `wornArmor(p: BattleParticipant): { artifact: EquippedArtifact; stats: ArmorStats } | null`; `wornArmorCategory(p): WornArmorKind`; `hasShield(p): boolean` (артефакт у клітинці `shield` без `damageDice`).
  - `armor-class.ts`: `isClassModeHero(p): boolean`; `classArmorBase(p): { base: number; lines: SheetLine[] }`; `armorPenalties(p): ResolvedAbility | null` (id `armor-penalties`, джерело — артефакт броні); `applyClassArmor(p): BattleParticipant`; `ARMOR_STRENGTH_SPEED_PENALTY = 10`.

- [ ] **Step 1: Write the failing tests**

`lib/utils/characters/classes/__tests__/armor-class.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { createMockParticipant, grantPassive } from "@/lib/utils/battle/__tests__/fixtures/mock-participant";
import { getEffectiveArmorClass } from "@/lib/utils/battle/participant/helpers";
import { type ArmorStats, armorStatsColumns } from "@/lib/utils/artifacts/armor-stats";
import { weaponStatsColumns } from "@/lib/utils/artifacts/weapon-stats";
import { hasShield, wornArmor, wornArmorCategory } from "@/lib/utils/artifacts/worn-armor";
import { applyClassArmor, armorPenalties, classArmorBase, isClassModeHero } from "@/lib/utils/characters/classes/armor-class";
import type { BattleParticipant, EquippedArtifact } from "@/types/battle";

const item = (artifactId: string, slot: string, modifiers: EquippedArtifact["modifiers"] = []): EquippedArtifact => ({ artifactId, name: artifactId, slot, bonuses: {}, modifiers });

const armorItem = (name: string, stats: ArmorStats) => ({ ...item(name, "armor", armorStatsColumns(stats).modifiers), name });

function hero(opts: { dex?: number; str?: number; items?: EquippedArtifact[] } = {}): BattleParticipant {
  const base = createMockParticipant();

  return {
    ...base,
    abilities: { ...base.abilities, damageModel: "5e", strength: opts.str ?? 10, modifiers: { ...base.abilities.modifiers, dexterity: opts.dex ?? 0 } },
    battleData: { ...base.battleData, equippedArtifacts: opts.items ?? [] },
  };
}

const CHAIN = { category: "heavy", base: 16, strength: 13, stealthDisadvantage: true } as const;

describe("worn armor", () => {
  it("reads the armor slot; HOMM armor without stats counts as none", () => {
    expect(wornArmorCategory(hero({ items: [armorItem("Chain Mail", CHAIN)] }))).toBe("heavy");
    expect(wornArmorCategory(hero({ items: [item("Кіраса Хаосу", "armor")] }))).toBe("none");
    expect(wornArmor(hero())).toBeNull();
  });

  it("a shield is the shield slot without weapon stats", () => {
    expect(hasShield(hero({ items: [item("Shield", "shield")] }))).toBe(true);
    expect(hasShield(hero({ items: [item("Dagger", "shield", weaponStatsColumns({ damageDice: "1d4", damageType: "piercing" }).modifiers)] }))).toBe(false);
    expect(hasShield(hero())).toBe(false);
  });
});

describe("classArmorBase", () => {
  it("no armor: 10 + Dex", () => {
    expect(classArmorBase(hero({ dex: 3 })).base).toBe(13);
    expect(classArmorBase(hero({ dex: -1 })).base).toBe(9);
    expect(classArmorBase(hero({ dex: 3 })).lines).toEqual([
      { label: "Без броні", value: "10", source: "base" },
      { label: "Спритність", value: "+3", source: "ability" },
    ]);
  });

  it("light adds full Dex, medium caps at 2, heavy ignores Dex", () => {
    expect(classArmorBase(hero({ dex: 4, items: [armorItem("Leather Armor", { category: "light", base: 11 })] })).base).toBe(15);
    expect(classArmorBase(hero({ dex: 4, items: [armorItem("Breastplate", { category: "medium", base: 14 })] })).base).toBe(16);
    expect(classArmorBase(hero({ dex: -1, items: [armorItem("Breastplate", { category: "medium", base: 14 })] })).base).toBe(13);
    expect(classArmorBase(hero({ dex: 4, items: [armorItem("Chain Mail", CHAIN)] })).base).toBe(16);
    expect(classArmorBase(hero({ dex: 4, items: [armorItem("Odd", { category: "medium", base: 14, dexCap: 3 })] })).base).toBe(17);
  });

  it("lines name the armor and the capped Dex", () => {
    expect(classArmorBase(hero({ dex: 4, items: [armorItem("Breastplate", { category: "medium", base: 14 })] })).lines).toEqual([
      { label: "Breastplate", value: "14", source: "artifact" },
      { label: "Спритність (межа 2)", value: "+2", source: "ability" },
    ]);
    expect(classArmorBase(hero({ dex: 4, items: [armorItem("Chain Mail", CHAIN)] })).lines).toEqual([{ label: "Chain Mail", value: "16", source: "artifact" }]);
  });
});

describe("armorPenalties / applyClassArmor", () => {
  it("stealth disadvantage and −10 speed below the strength requirement", () => {
    const p = armorPenalties(hero({ str: 12, items: [armorItem("Chain Mail", CHAIN)] }));

    expect(p).toMatchObject({ id: "armor-penalties", name: "Chain Mail", trigger: { event: "passive" }, source: { type: "artifact", id: "Chain Mail", name: "Chain Mail" }, key: "artifact:Chain Mail:armor-penalties" });
    expect(p?.effects).toEqual([{ kind: "flag", flag: "checkDisadvantage", skills: ["stealth"] }, { kind: "modifyStat", stat: "speed", flat: -10 }]);
    expect(armorPenalties(hero({ str: 13, items: [armorItem("Chain Mail", CHAIN)] }))?.effects).toEqual([{ kind: "flag", flag: "checkDisadvantage", skills: ["stealth"] }]);
    expect(armorPenalties(hero({ items: [armorItem("Leather Armor", { category: "light", base: 11 })] }))).toBeNull();
    expect(armorPenalties(hero())).toBeNull();
  });

  it("applyClassArmor writes AC, speed once and the penalty ability", () => {
    const out = applyClassArmor(hero({ str: 12, dex: 2, items: [armorItem("Chain Mail", CHAIN)] }));

    expect(out.combatStats.armorClass).toBe(16);
    expect(out.combatStats.speed).toBe(20);
    expect(out.battleData.resolvedAbilities.map((a) => a.id)).toEqual(["armor-penalties"]);
  });

  it("a shield ability stacks on top through collectModifiers", () => {
    const p = applyClassArmor(hero({ dex: 2, items: [item("Shield", "shield")] }));

    grantPassive(p, [{ kind: "modifyStat", stat: "armor", flat: 2 }], "Shield");

    expect(getEffectiveArmorClass(p)).toBe(14);
  });

  it("class-mode marker: a 5e character, not a 5e monster", () => {
    expect(isClassModeHero(hero())).toBe(true);
    expect(isClassModeHero(createMockParticipant())).toBe(false);
    expect(isClassModeHero({ ...hero(), basicInfo: { ...hero().basicInfo, sourceType: "unit" } })).toBe(false);
  });
});
```

`lib/utils/battle/participant/__tests__/from-character-armor.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { ParticipantSide } from "@/lib/constants/battle";
import { armorStatsColumns } from "@/lib/utils/artifacts/armor-stats";
import { createBattleParticipantFromCharacter } from "@/lib/utils/battle/participant/from-character";
import { DEFAULT_RULES, type Ruleset } from "@/lib/utils/rules";
import { parseRules } from "@/lib/utils/rules/schema";
import type { GameClassData } from "@/types/classes";

const chain = { id: "art1", campaignId: "c1", name: "Chain Mail", slot: "armor", setId: null, bonuses: {}, abilities: [], icon: null, ...armorStatsColumns({ category: "heavy", base: 16, strength: 13, stealthDisadvantage: true }) };

const base = {
  id: "ch1", campaignId: "c1", name: "Герой", race: "Людина", class: "Воїн", level: 5,
  strength: 12, dexterity: 14, constitution: 14, intelligence: 10, wisdom: 10, charisma: 10,
  armorClass: 12, speed: 30, initiative: 0, morale: 0, controlledBy: "u1", immunities: [], knownSpells: [],
  equipment: {}, skillTreeProgress: {}, personalSkillId: null, archetype: "warrior", classes: [],
};

const fighter: GameClassData = {
  id: "fighter", name: "Fighter", icon: null, color: null, hitDie: 10, savingThrows: ["strength", "constitution"],
  proficiencies: { armor: [], weapons: [], tools: [] }, skillChoices: { count: 0, from: [] },
  caster: "none", spellcastingAbility: null, features: [], subclassLevel: 3, subclasses: [],
};

const build = (rules: Ruleset, character: object) => {
  const context = {
    skillTreeByRace: {}, mainSkills: [], spells: [], allSkills: [],
    racesByName: { "Людина": null }, campaign: { maxLevel: 20 }, skillsById: {}, artifactsById: { art1: chain }, artifactSetsById: {}, artifactSetMemberIds: {},
    rules, classesById: { fighter },
  } as never;

  return createBattleParticipantFromCharacter({ ...base, ...character } as never, "b1", ParticipantSide.ALLY, undefined, context);
};

const enabled = parseRules({ classes: { enabled: true } });

const wearing = { inventory: { equipped: { armor: "art1" } } };

describe("КЗ героя з класами", () => {
  it("Fighter 5 у Chain Mail із Силою 12: КЗ 16, швидкість 20, перешкода скритності", async () => {
    const p = await build(enabled, { ...wearing, classes: [{ classId: "fighter", level: 5 }] });

    expect(p.combatStats.armorClass).toBe(16);
    expect(p.combatStats.speed).toBe(20);
    expect(p.battleData.resolvedAbilities.find((a) => a.key === "artifact:art1:armor-penalties")?.effects).toContainEqual({ kind: "flag", flag: "checkDisadvantage", skills: ["stealth"] });
  });

  it("без броні: 10 + Спр, Character.armorClass не читається", async () => {
    const p = await build(enabled, { dexterity: 16, classes: [{ classId: "fighter", level: 5 }] });

    expect(p.combatStats.armorClass).toBe(13);
    expect(p.combatStats.speed).toBe(30);
  });

  it("HOMM і герой без класів: КЗ з персонажа, без штрафів навіть у броні з моделлю", async () => {
    for (const p of [await build(DEFAULT_RULES, wearing), await build(enabled, wearing)]) {
      expect(p.combatStats.armorClass).toBe(12);
      expect(p.combatStats.speed).toBe(30);
      expect(p.battleData.resolvedAbilities.some((a) => a.id === "armor-penalties")).toBe(false);
    }
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm test:run lib/utils/characters/classes/__tests__/armor-class.test.ts lib/utils/battle/participant/__tests__/from-character-armor.test.ts`
Expected: FAIL — модулів `worn-armor`/`armor-class` немає.

- [ ] **Step 3: `lib/utils/artifacts/worn-armor.ts`**

```ts
import { ArtifactSlot } from "@/lib/constants/artifacts";
import { type ArmorCategory, type ArmorStats, armorStatsFromRow } from "@/lib/utils/artifacts/armor-stats";
import { weaponStatsFromRow } from "@/lib/utils/artifacts/weapon-stats";
import type { BattleParticipant, EquippedArtifact } from "@/types/battle";

export type WornArmorKind = "none" | ArmorCategory;

export function wornArmor(p: BattleParticipant): { artifact: EquippedArtifact; stats: ArmorStats } | null {
  for (const artifact of p.battleData.equippedArtifacts ?? []) {
    if (artifact.slot !== ArtifactSlot.ARMOR) continue;

    const stats = armorStatsFromRow(artifact);

    if (stats) return { artifact, stats };
  }

  return null;
}

export const wornArmorCategory = (p: BattleParticipant): WornArmorKind => wornArmor(p)?.stats.category ?? "none";

export const hasShield = (p: BattleParticipant): boolean =>
  (p.battleData.equippedArtifacts ?? []).some((a) => a.slot === ArtifactSlot.SHIELD && !weaponStatsFromRow(a).damageDice);
```

- [ ] **Step 4: `lib/utils/characters/classes/armor-class.ts`**

```ts
import { ParticipantSourceType } from "@/lib/constants/battle";
import type { Effect } from "@/lib/utils/abilities/schema";
import { armorDexCap } from "@/lib/utils/artifacts/armor-stats";
import { wornArmor } from "@/lib/utils/artifacts/worn-armor";
import { signed } from "@/lib/utils/common/format";
import type { ResolvedAbility } from "@/types/abilities";
import type { BattleParticipant } from "@/types/battle";
import type { SheetLine } from "@/types/characters";

export const ARMOR_STRENGTH_SPEED_PENALTY = 10;

const PENALTY_ID = "armor-penalties";

export const isClassModeHero = (p: BattleParticipant): boolean => p.basicInfo.sourceType === ParticipantSourceType.CHARACTER && p.abilities.damageModel === "5e";

export function classArmorBase(p: BattleParticipant): { base: number; lines: SheetLine[] } {
  const dex = p.abilities.modifiers.dexterity;

  const worn = wornArmor(p);

  if (!worn) return { base: 10 + dex, lines: [{ label: "Без броні", value: "10", source: "base" }, { label: "Спритність", value: signed(dex), source: "ability" }] };

  const cap = armorDexCap(worn.stats);

  const dexPart = cap === null ? dex : Math.min(dex, cap);

  return {
    base: worn.stats.base + dexPart,
    lines: [
      { label: worn.artifact.name, value: String(worn.stats.base), source: "artifact" },
      ...(cap === 0 ? [] : [{ label: cap === null ? "Спритність" : `Спритність (межа ${cap})`, value: signed(dexPart), source: "ability" as const }]),
    ],
  };
}

export function armorPenalties(p: BattleParticipant): ResolvedAbility | null {
  const worn = wornArmor(p);

  if (!worn) return null;

  const { strength, stealthDisadvantage } = worn.stats;

  const slowed = !!strength && p.abilities.strength < strength;

  const effects: Effect[] = [];

  if (stealthDisadvantage) effects.push({ kind: "flag", flag: "checkDisadvantage", skills: ["stealth"] });

  if (slowed) effects.push({ kind: "modifyStat", stat: "speed", flat: -ARMOR_STRENGTH_SPEED_PENALTY });

  if (effects.length === 0) return null;

  const { artifactId, name } = worn.artifact;

  const description = [stealthDisadvantage ? "Перешкода на Скритність" : null, slowed ? `Сила нижче ${strength}: швидкість −${ARMOR_STRENGTH_SPEED_PENALTY}` : null].filter(Boolean).join("; ");

  return { id: PENALTY_ID, name, description, trigger: { event: "passive" }, effects, source: { type: "artifact", id: artifactId, name }, key: `artifact:${artifactId}:${PENALTY_ID}` };
}

// запікання вже минуло, тож −10 швидкості пишемо одразу, а вміння лише показує джерело
export function applyClassArmor(p: BattleParticipant): BattleParticipant {
  const penalty = armorPenalties(p);

  const slowed = penalty?.effects.some((e) => e.kind === "modifyStat" && e.stat === "speed") ?? false;

  return {
    ...p,
    combatStats: { ...p.combatStats, armorClass: classArmorBase(p).base, speed: p.combatStats.speed - (slowed ? ARMOR_STRENGTH_SPEED_PENALTY : 0) },
    battleData: { ...p.battleData, resolvedAbilities: penalty ? [...p.battleData.resolvedAbilities, penalty] : p.battleData.resolvedAbilities },
  };
}
```

- [ ] **Step 5: Participant** — `lib/utils/battle/participant/from-character.ts`: імпорт `import { applyClassArmor } from "@/lib/utils/characters/classes/armor-class";`; кінець функції замінити:

```ts
  const baked = bakePassives(participant);

  const armored = resolvedClasses ? applyClassArmor(baked) : baked;

  // СК і бонус заклять — від характеристики з расовими/артефактними бонусами, тож після запікання
  const spell = spellcastingDerived(character.level, spellcastingAbility, armored.abilities, rules.formulas);

  const ready = { ...armored, spellcasting: { ...armored.spellcasting, spellSaveDC: spell?.saveDC, spellAttackBonus: spell?.attackBonus } };

  return applyCharacterResources(ready, storedCharacterState(character, rules), rules);
```

- [ ] **Step 6: Sheet** — `lib/utils/characters/sheet/lines.ts`: імпорт `import { classArmorBase, isClassModeHero } from "@/lib/utils/characters/classes/armor-class";`; `armorTotal`:

```ts
export function armorTotal(p: BattleParticipant): SheetTotal {
  const mods = collectModifiers([p], p.basicInfo.id, { stat: "armor" });

  const base: SheetLine[] = isClassModeHero(p) ? classArmorBase(p).lines : [{ label: "База", value: String(p.combatStats.armorClass), source: "base" }];

  return {
    total: statWithModifiers([p], p.basicInfo.id, "armor", p.combatStats.armorClass),
    lines: [
      ...base,
      ...mods.entries.flatMap((e) => [
        ...(e.flat ? [{ label: e.label, value: signed(e.flat), source: asSource(e.sourceType) }] : []),
        ...(e.percent ? [{ label: e.label, value: `${signed(e.percent)}%`, source: asSource(e.sourceType) }] : []),
      ]),
    ],
  };
}
```

(Якщо `SheetLine` ще не імпортований у `lines.ts` — додати до наявного `import type { … } from "@/types/characters";`.)

- [ ] **Step 7: Run tests to verify they pass**

Run: `pnpm test:run lib/utils/characters lib/utils/battle/participant lib/utils/artifacts`
Expected: PASS (нові й наявні, зокрема `from-character-classes.test.ts` «HOMM без змін»).

- [ ] **Step 8: Type check** — `pnpm exec tsc --noEmit -p tsconfig.json` → 0 errors.

- [ ] **Step 9: Commit**

```bash
git add lib/utils/artifacts/worn-armor.ts lib/utils/characters/classes/armor-class.ts lib/utils/battle/participant/from-character.ts lib/utils/characters/sheet/lines.ts lib/utils/characters/classes/__tests__/armor-class.test.ts lib/utils/battle/participant/__tests__/from-character-armor.test.ts
git commit -m "feat(constructor): 4f-2 class-mode AC from worn armor, stealth and strength penalties

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Умова `armorWorn` і запікання статичних умов

**Files:**
- Modify: `lib/utils/abilities/schema/conditions.ts`, `lib/utils/abilities/schema/ability.ts:107-111`, `lib/utils/abilities/registry/conditions.ts`, `lib/utils/abilities/build/bake.ts`, `lib/utils/artifacts/worn-armor.ts`, `components/abilities/ConditionEditor.tsx` (`defaultFor`)
- Test: `lib/utils/abilities/__tests__/armor-worn.test.ts`

**Interfaces:**
- Consumes: `wornArmorCategory`, `hasShield`, `applyClassArmor` (задача 2).
- Produces: `WORN_ARMOR_KINDS = ["none","light","medium","heavy"] as const`; умова `{ type: "armorWorn"; categories: WornArmorKind[]; shield?: "with" | "without" }`; `isStaticCondition(c: Condition): boolean`; `armorWornMatches(p, c): boolean` у `worn-armor.ts`. Тип `WornArmorKind` тепер експортується з `schema/conditions.ts`, а `worn-armor.ts` його реекспортує.

- [ ] **Step 1: Write the failing test** — `lib/utils/abilities/__tests__/armor-worn.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { bakePassives, bakedStatSources } from "@/lib/utils/abilities/build/bake";
import { evaluateCondition } from "@/lib/utils/abilities/registry/conditions";
import { AbilitySchema, type Condition, isStaticCondition } from "@/lib/utils/abilities/schema";
import { createMockParticipant } from "@/lib/utils/battle/__tests__/fixtures/mock-participant";
import { getEffectiveArmorClass } from "@/lib/utils/battle/participant/helpers";
import { armorStatsColumns } from "@/lib/utils/artifacts/armor-stats";
import { applyClassArmor } from "@/lib/utils/characters/classes/armor-class";
import type { ResolvedAbility } from "@/types/abilities";
import type { BattleParticipant, EquippedArtifact } from "@/types/battle";

const NO_ARMOR: Condition = { type: "armorWorn", categories: ["none"] };

const NO_ARMOR_NO_SHIELD: Condition = { type: "armorWorn", categories: ["none"], shield: "without" };

const chain: EquippedArtifact = { artifactId: "cm", name: "Chain Mail", slot: "armor", bonuses: {}, modifiers: armorStatsColumns({ category: "heavy", base: 16 }).modifiers };

const shield: EquippedArtifact = { artifactId: "sh", name: "Shield", slot: "shield", bonuses: {}, modifiers: [] };

const passive = (id: string, condition: Condition, effects: ResolvedAbility["effects"]): ResolvedAbility => ({ id, name: id, trigger: { event: "passive" }, condition, effects, source: { type: "class", id: "monk", name: "Monk" }, key: `class:monk:${id}` });

function hero(items: EquippedArtifact[], abilities: ResolvedAbility[]): BattleParticipant {
  const base = createMockParticipant();

  return { ...base, abilities: { ...base.abilities, damageModel: "5e", modifiers: { ...base.abilities.modifiers, dexterity: 2, constitution: 3, wisdom: 3 } }, battleData: { ...base.battleData, equippedArtifacts: items, resolvedAbilities: abilities } };
}

const ctx = (p: BattleParticipant) => ({ owner: p, event: null, participants: [p] });

describe("armorWorn", () => {
  it("matches the worn category and the shield option", () => {
    expect(evaluateCondition(NO_ARMOR, ctx(hero([], [])))).toBe(true);
    expect(evaluateCondition(NO_ARMOR, ctx(hero([chain], [])))).toBe(false);
    expect(evaluateCondition(NO_ARMOR, ctx(hero([shield], [])))).toBe(true);
    expect(evaluateCondition(NO_ARMOR_NO_SHIELD, ctx(hero([shield], [])))).toBe(false);
    expect(evaluateCondition({ type: "armorWorn", categories: ["none"], shield: "with" }, ctx(hero([shield], [])))).toBe(true);
    expect(evaluateCondition({ type: "armorWorn", categories: ["none", "light", "medium"] }, ctx(hero([chain], [])))).toBe(false);
  });

  it("is static, also inside not/all/any; other conditions are not", () => {
    expect(isStaticCondition(NO_ARMOR)).toBe(true);
    expect(isStaticCondition({ type: "not", condition: NO_ARMOR })).toBe(true);
    expect(isStaticCondition({ type: "all", conditions: [NO_ARMOR, NO_ARMOR_NO_SHIELD] })).toBe(true);
    expect(isStaticCondition({ type: "any", conditions: [NO_ARMOR, { type: "hpBelow", who: "self", percent: 50 }] })).toBe(false);
    expect(isStaticCondition({ type: "hpBelow", who: "self", percent: 50 })).toBe(false);
  });

  it("schema: a baked stat may use armorWorn, not a dynamic condition", () => {
    const ability = (condition: Condition) => ({ id: "m", name: "Unarmored Movement", trigger: { event: "passive" }, condition, effects: [{ kind: "modifyStat", stat: "speed", flat: 10 }] });

    expect(AbilitySchema.safeParse(ability(NO_ARMOR_NO_SHIELD)).success).toBe(true);
    expect(AbilitySchema.safeParse(ability({ type: "hpBelow", who: "self", percent: 50 })).success).toBe(false);
  });

  it("bakePassives applies armorWorn passives only when the armor matches", () => {
    const movement = passive("move", NO_ARMOR_NO_SHIELD, [{ kind: "modifyStat", stat: "speed", flat: 10 }]);

    expect(bakePassives(hero([], [movement])).combatStats.speed).toBe(40);
    expect(bakePassives(hero([chain], [movement])).combatStats.speed).toBe(30);
    expect(bakePassives(hero([shield], [movement])).combatStats.speed).toBe(30);
    expect(bakedStatSources(hero([], [movement]), "speed")).toEqual([{ label: "Monk", value: 10, sourceType: "class" }]);
    expect(bakedStatSources(hero([chain], [movement]), "speed")).toEqual([]);
  });

  it("Unarmored Defense: Barbarian keeps it with a shield, Monk loses it", () => {
    const barbarian = passive("ud-barb", NO_ARMOR, [{ kind: "modifyStat", stat: "armor", flat: 3 }]);

    const monk = passive("ud-monk", NO_ARMOR_NO_SHIELD, [{ kind: "modifyStat", stat: "armor", flat: 3 }]);

    const shieldBonus = passive("shield", { type: "armorWorn", categories: ["none", "light", "medium", "heavy"] }, [{ kind: "modifyStat", stat: "armor", flat: 2 }]);

    expect(getEffectiveArmorClass(applyClassArmor(hero([shield], [barbarian, shieldBonus])))).toBe(10 + 2 + 3 + 2);
    expect(getEffectiveArmorClass(applyClassArmor(hero([shield], [monk, shieldBonus])))).toBe(10 + 2 + 2);
    expect(getEffectiveArmorClass(applyClassArmor(hero([], [monk])))).toBe(10 + 2 + 3);
    expect(getEffectiveArmorClass(applyClassArmor(hero([chain], [barbarian])))).toBe(16);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test:run lib/utils/abilities/__tests__/armor-worn.test.ts`
Expected: FAIL — `isStaticCondition` не експортується, `armorWorn` невідомий тип.

- [ ] **Step 3: Schema** — `lib/utils/abilities/schema/conditions.ts`: додати перед `export type Condition`:

```ts
export const WORN_ARMOR_KINDS = ["none", "light", "medium", "heavy"] as const;

export type WornArmorKind = (typeof WORN_ARMOR_KINDS)[number];
```

у тип `Condition` — рядок `| { type: "armorWorn"; categories: WornArmorKind[]; shield?: "with" | "without" }` (перед `| { type: "not"; … }`); у `discriminatedUnion` перед `not`:

```ts
    z.object({ type: z.literal("armorWorn"), categories: z.array(z.enum(WORN_ARMOR_KINDS)).min(1), shield: z.enum(["with", "without"]).optional() }),
```

і в кінець файлу:

```ts
/** Спорядження в бою не змінюється, тож така умова дозволена й на запечених статах. */
export function isStaticCondition(c: Condition): boolean {
  switch (c.type) {
    case "armorWorn":
      return true;
    case "not":
      return isStaticCondition(c.condition);
    case "all":
    case "any":
      return c.conditions.every(isStaticCondition);
    default:
      return false;
  }
}
```

- [ ] **Step 4: Ability issues** — `lib/utils/abilities/schema/ability.ts`: імпорт `import { ConditionSchema, isStaticCondition } from "./conditions";`; у `superRefine` замінити виклик на:

```ts
    a.effects.forEach((effect, i) => {
      for (const message of effectIssues(effect, a.trigger, a.condition !== undefined && !isStaticCondition(a.condition))) {
        ctx.addIssue({ code: "custom", path: ["effects", i], message });
      }
    });
```

- [ ] **Step 5: `armorWornMatches`** — у `lib/utils/artifacts/worn-armor.ts`: видалити локальний `export type WornArmorKind = "none" | ArmorCategory;` і `ArmorCategory` з імпорту, додати `import type { WornArmorKind } from "@/lib/utils/abilities/schema/conditions";`, `export type { WornArmorKind };` і функцію:

```ts
export function armorWornMatches(p: BattleParticipant, c: { categories: readonly WornArmorKind[]; shield?: "with" | "without" }): boolean {
  if (!c.categories.includes(wornArmorCategory(p))) return false;

  return c.shield === undefined || (c.shield === "with") === hasShield(p);
}
```

- [ ] **Step 6: Registry** — `lib/utils/abilities/registry/conditions.ts`: імпорт `import { armorWornMatches } from "@/lib/utils/artifacts/worn-armor";`; у `CONDITION_REGISTRY` перед `not`:

```ts
  armorWorn: {
    label: "Броня на мені",
    fields: [
      { name: "categories", label: "Категорії", input: "multiselect", options: [{ value: "none", label: "без броні" }, { value: "light", label: "легка" }, { value: "medium", label: "середня" }, { value: "heavy", label: "важка" }] },
      { name: "shield", label: "Щит", input: "select", optional: true, options: [{ value: "with", label: "зі щитом" }, { value: "without", label: "без щита" }] },
    ],
  },
```

у `evaluateCondition` перед `case "not":` — `case "armorWorn": return armorWornMatches(ctx.owner, c);`.

- [ ] **Step 7: Editor default** — `components/abilities/ConditionEditor.tsx`, у `defaultFor` перед `case "not":`:

```ts
    case "armorWorn":
      return { type, categories: ["none"] };
```

- [ ] **Step 8: Bake** — `lib/utils/abilities/build/bake.ts`: імпорти `import { evaluateCondition } from "@/lib/utils/abilities/registry/conditions";` і `isStaticCondition` (додати до `import type { Effect } …` окремим рядком `import { isStaticCondition } from "@/lib/utils/abilities/schema/conditions";`); додати хелпер і замінити обидва фільтри `a.trigger.event === "passive" && !a.condition`:

```ts
const bakesNow = (a: ResolvedAbility, p: BattleParticipant) =>
  a.trigger.event === "passive" && (!a.condition || (isStaticCondition(a.condition) && evaluateCondition(a.condition, { owner: p, event: null, participants: [p] })));
```

`bakedEffects`: `.filter((a) => bakesNow(a, p))`; `bakedStatSources`: `.filter((a) => bakesNow(a, p))`.

- [ ] **Step 9: Run tests to verify they pass**

Run: `pnpm test:run lib/utils/abilities lib/utils/characters components/abilities`
Expected: PASS.

- [ ] **Step 10: Type check** — `pnpm exec tsc --noEmit -p tsconfig.json` → 0 errors.

- [ ] **Step 11: Commit**

```bash
git add lib/utils/abilities/schema/conditions.ts lib/utils/abilities/schema/ability.ts lib/utils/abilities/registry/conditions.ts lib/utils/abilities/build/bake.ts lib/utils/artifacts/worn-armor.ts components/abilities/ConditionEditor.tsx lib/utils/abilities/__tests__/armor-worn.test.ts
git commit -m "feat(constructor): 4f-2 armorWorn condition, static conditions bake into passives

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Змінні формул `*_mod`, `prof`, `class_level`

**Files:**
- Modify: `lib/utils/abilities/engine/core/amount.ts:10-19`
- Test: `lib/utils/abilities/__tests__/formula-variables.test.ts`

**Interfaces:**
- Produces: `FORMULA_VARIABLES` (readonly tuple назв, експорт з `amount.ts`); `formulaContext` дає `hero_level`, `class_level` (= `abilities.level`, запасне), `str_mod`…`cha_mod` (з `abilities.modifiers`), `prof` (= `abilities.proficiencyBonus`), `lost_hp_percent`, `morale`, `cells_moved`.

- [ ] **Step 1: Collision check (до змін)** — HOMM-формула з цими словами зараз дає 0 як невідома; після задачі дасть число. Перевірити локальну БД і репо:

```bash
psql "postgresql://postgres:postgres@localhost:54322/constructor" -At -c "
select 'units', count(*) from units where abilities::text ~ '\m(prof|str_mod|dex_mod|con_mod|int_mod|wis_mod|cha_mod|class_level)\M'
union all select 'skills', count(*) from skills where abilities::text ~ '\m(prof|str_mod|dex_mod|con_mod|int_mod|wis_mod|cha_mod|class_level)\M'
union all select 'races', count(*) from races where abilities::text ~ '\m(prof|str_mod|dex_mod|con_mod|int_mod|wis_mod|cha_mod|class_level)\M'
union all select 'artifacts', count(*) from artifacts where abilities::text ~ '\m(prof|str_mod|dex_mod|con_mod|int_mod|wis_mod|cha_mod|class_level)\M'
union all select 'artifact_sets', count(*) from artifact_sets where abilities::text ~ '\m(prof|str_mod|dex_mod|con_mod|int_mod|wis_mod|cha_mod|class_level)\M'
union all select 'classes', count(*) from classes where (features::text || subclasses::text) ~ '\m(prof|str_mod|dex_mod|con_mod|int_mod|wis_mod|cha_mod|class_level)\M'
union all select 'spells', count(*) from spells where row_to_json(spells)::text ~ '\m(prof|str_mod|dex_mod|con_mod|int_mod|wis_mod|cha_mod|class_level)\M';"
grep -rlE '"formula": ?"[^"]*\b(prof|str_mod|dex_mod|con_mod|int_mod|wis_mod|cha_mod|class_level)\b' data scripts lib prisma
```

Expected: усі 7 рядків `…|0`, `grep` нічого не друкує (перевірено при написанні плану 2026-10-23). Якщо щось знайдено — зупинитись і повідомити контролеру (назву, таблицю, формулу), не продовжувати.

- [ ] **Step 2: Write the failing test** — `lib/utils/abilities/__tests__/formula-variables.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { FORMULA_VARIABLES, resolveAmount, resolveFlat } from "@/lib/utils/abilities/engine/core/amount";
import { createMockParticipant } from "@/lib/utils/battle/__tests__/fixtures/mock-participant";
import type { BattleParticipant } from "@/types/battle";

function owner(over: { level?: number; prof?: number; cha?: number; con?: number; hp?: number } = {}): BattleParticipant {
  const p = createMockParticipant();

  return {
    ...p,
    abilities: { ...p.abilities, level: over.level ?? 5, proficiencyBonus: over.prof ?? 3, modifiers: { ...p.abilities.modifiers, charisma: over.cha ?? 3, constitution: over.con ?? 2 } },
    combatStats: { ...p.combatStats, currentHp: over.hp ?? 20 },
  };
}

describe("formula variables", () => {
  it("ability modifiers, proficiency and class_level (fallback: hero level)", () => {
    expect(resolveFlat({ formula: "cha_mod" }, owner())).toBe(3);
    expect(resolveFlat({ formula: "max(1, cha_mod)" }, owner({ cha: -1 }))).toBe(1);
    expect(resolveFlat({ formula: "max(0, con_mod)" }, owner({ con: -2 }))).toBe(0);
    expect(resolveFlat({ formula: "str_mod + dex_mod" }, owner())).toBe(3);
    expect(resolveFlat({ formula: "prof * 2" }, owner())).toBe(6);
    expect(resolveFlat({ formula: "2 * class_level" }, owner({ level: 7 }))).toBe(14);
    expect(resolveFlat({ formula: "5 + con_mod" }, owner({ con: -1 }))).toBe(4);
    expect(resolveAmount({ formula: "wis_mod + 1" }, { owner: owner(), rng: () => 0.5 })).toBe(1);
  });

  it("HOMM variables unchanged; prof does not touch other words", () => {
    expect(resolveFlat({ formula: "3 * floor(lost_hp_percent / 10)" }, owner({ hp: 10 }))).toBe(15);
    expect(resolveFlat({ formula: "hero_level" }, owner({ level: 9 }))).toBe(9);
    expect(resolveFlat({ formula: "proficiency + 1" }, owner())).toBe(0);
  });

  it("FORMULA_VARIABLES lists the context keys", () => {
    expect([...FORMULA_VARIABLES].sort()).toEqual(["cells_moved", "cha_mod", "class_level", "con_mod", "dex_mod", "hero_level", "int_mod", "lost_hp_percent", "morale", "prof", "str_mod", "wis_mod"]);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `pnpm test:run lib/utils/abilities/__tests__/formula-variables.test.ts`
Expected: FAIL — `FORMULA_VARIABLES` не експортується; `cha_mod` дає 0.

- [ ] **Step 4: Implement** — `lib/utils/abilities/engine/core/amount.ts`, замінити `formulaContext`:

```ts
export const FORMULA_VARIABLES = ["hero_level", "class_level", "str_mod", "dex_mod", "con_mod", "int_mod", "wis_mod", "cha_mod", "prof", "lost_hp_percent", "morale", "cells_moved"] as const;

function formulaContext(p: BattleParticipant): Record<(typeof FORMULA_VARIABLES)[number], number> {
  const { maxHp, currentHp } = p.combatStats;

  const m = p.abilities.modifiers;

  return {
    hero_level: p.abilities.level,
    // у вміннях класу class_level уже підставлено при збиранні (applyClassScale)
    class_level: p.abilities.level,
    str_mod: m.strength,
    dex_mod: m.dexterity,
    con_mod: m.constitution,
    int_mod: m.intelligence,
    wis_mod: m.wisdom,
    cha_mod: m.charisma,
    prof: p.abilities.proficiencyBonus ?? 0,
    lost_hp_percent: maxHp > 0 ? ((maxHp - currentHp) / maxHp) * 100 : 0,
    morale: ownMorale(p),
    cells_moved: p.battleData.movementUsed ?? 0,
  };
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `pnpm test:run lib/utils/abilities lib/utils/battle/participant/__tests__/formulas-rules.test.ts lib/utils/abilities/__tests__/percent-formula.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add lib/utils/abilities/engine/core/amount.ts lib/utils/abilities/__tests__/formula-variables.test.ts
git commit -m "feat(constructor): 4f-2 formula variables str_mod..cha_mod, prof, class_level

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---
### Task 5: Колонки класу (міграція, ресурс, `parseColumnValue`, імпорт, OpenAPI)

**Files:**
- Modify: `prisma/schema.prisma:594-617` (модель `GameClass`)
- Create: `prisma/migrations/20261101000000_class_columns/migration.sql`
- Modify: `lib/constants/classes.ts`, `types/classes.ts`, `lib/schemas/classes.ts`, `lib/utils/characters/classes/row.ts`, `lib/server/content/resources/classes.ts`, `lib/utils/content/import/fields/classes.ts`, `lib/server/content/json-schema.ts`
- Create: `lib/utils/characters/classes/columns.ts`
- Test: `lib/utils/characters/classes/__tests__/columns.test.ts`, `lib/schemas/__tests__/classes-columns.test.ts`, `lib/server/templates/__tests__/bundle-columns.test.ts`

**Interfaces:**
- Produces:
  - `lib/constants/classes.ts`: `CLASS_COLUMN_KEY_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/`, `MAX_CLASS_COLUMNS = 12`.
  - `types/classes.ts`: `interface ClassColumn { key: string; label: string; values: string[]; pool?: { rest: "short" | "long" } }`; `GameClassData.columns?: ClassColumn[]` (`toGameClassData` завжди заповнює).
  - `lib/schemas/classes.ts`: `ClassColumnSchema`; `columns` у `createClassSchema` (default `[]`) і `updateClassSchema` (optional).
  - `columns.ts`: `type ColumnValue = number | string` (рядок — кубики `NdM`); `parseColumnValue(cell: string | undefined): ColumnValue | null`; `columnValueAt(column: ClassColumn, level: number): ColumnValue | null`; `classColumnIssues(columns: readonly ClassColumn[]): { path: (string | number)[]; message: string }[]`; `parseColumnValuesText(text: string): string[]` (рівно 20); `classTableText(entry: { name: string; level: number; columns: readonly ClassColumn[] }): string`.
  - OpenAPI: спільна схема `ClassColumn`.

- [ ] **Step 1: Write the failing tests**

`lib/utils/characters/classes/__tests__/columns.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { classColumnIssues, classTableText, columnValueAt, parseColumnValue, parseColumnValuesText } from "@/lib/utils/characters/classes/columns";
import { toGameClassData } from "@/lib/utils/characters/classes/row";
import type { ClassColumn } from "@/types/classes";

const levels = (f: (l: number) => string) => Array.from({ length: 20 }, (_, i) => f(i + 1));

const rages: ClassColumn = { key: "rages", label: "Rages", values: levels((l) => (l >= 17 ? "6" : l >= 9 ? "4" : "2")) };

describe("parseColumnValue", () => {
  it("numbers with sign and unit, dice, empty", () => {
    expect(parseColumnValue("2")).toBe(2);
    expect(parseColumnValue("+3")).toBe(3);
    expect(parseColumnValue("+10 ft.")).toBe(10);
    expect(parseColumnValue("-1")).toBe(-1);
    expect(parseColumnValue("D8")).toBe("1d8");
    expect(parseColumnValue("d12")).toBe("1d12");
    expect(parseColumnValue("3d6")).toBe("3d6");
    expect(parseColumnValue("1D10")).toBe("1d10");
    expect(parseColumnValue("")).toBeNull();
    expect(parseColumnValue("  ")).toBeNull();
    expect(parseColumnValue("—")).toBeNull();
    expect(parseColumnValue(undefined)).toBeNull();
  });

  it("columnValueAt clamps the level to 1..20", () => {
    expect(columnValueAt(rages, 1)).toBe(2);
    expect(columnValueAt(rages, 9)).toBe(4);
    expect(columnValueAt(rages, 25)).toBe(6);
    expect(columnValueAt(rages, 0)).toBe(2);
  });
});

describe("classColumnIssues", () => {
  it("duplicate keys and non-numeric pool cells", () => {
    const focus: ClassColumn = { key: "focus-points", label: "Focus Points", values: levels((l) => (l === 1 ? "" : String(l))), pool: { rest: "short" } };

    expect(classColumnIssues([rages, focus])).toEqual([]);
    expect(classColumnIssues([rages, { ...rages }])).toEqual([{ path: [1, "key"], message: "Ключ колонки «rages» повторюється" }]);
    expect(classColumnIssues([{ ...focus, values: levels(() => "D6") }])[0]).toEqual({ path: [0, "values", 0], message: "Пул «Focus Points»: рівень 1 — не число" });
  });
});

describe("text helpers", () => {
  it("parseColumnValuesText pads and trims to 20 cells", () => {
    expect(parseColumnValuesText("2, 2, 3")).toEqual(["2", "2", "3", ...Array(17).fill("")]);
    expect(parseColumnValuesText(Array(25).fill("1").join(","))).toHaveLength(20);
  });

  it("classTableText shows non-empty cells at the level", () => {
    const damage: ClassColumn = { key: "rage-damage", label: "Rage Damage", values: levels((l) => (l >= 9 ? "+3" : "+2")) };

    const empty: ClassColumn = { key: "x", label: "X", values: levels(() => "") };

    expect(classTableText({ name: "Barbarian", level: 5, columns: [rages, damage, empty] })).toBe("Barbarian 5 · Rages 2 · Rage Damage +2");
    expect(classTableText({ name: "Fighter", level: 3, columns: [] })).toBe("Fighter 3");
  });
});

describe("toGameClassData columns", () => {
  it("keeps valid columns, drops broken ones, defaults to []", () => {
    const row = { id: "b", campaignId: "c", name: "Barbarian", icon: null, color: null, hitDie: 12, savingThrows: [], proficiencies: {}, skillChoices: {}, caster: "none", spellcastingAbility: null, features: [], subclassLevel: 3, subclasses: [], createdAt: new Date(0), updatedAt: new Date(0), sourceId: null, sourceHash: null };

    expect(toGameClassData({ ...row, columns: [rages, { key: "Bad Key", label: "x", values: [] }] } as never).columns).toEqual([rages]);
    expect(toGameClassData({ ...row, columns: null } as never).columns).toEqual([]);
  });
});
```

`lib/schemas/__tests__/classes-columns.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { createClassSchema, updateClassSchema } from "@/lib/schemas/classes";

const values = Array.from({ length: 20 }, (_, i) => String(i + 1));

describe("class columns schema", () => {
  it("create defaults columns to [] and accepts a pool column", () => {
    expect(createClassSchema.parse({ name: "Monk" }).columns).toEqual([]);
    expect(createClassSchema.safeParse({ name: "Monk", columns: [{ key: "focus-points", label: "Focus Points", values, pool: { rest: "short" } }] }).success).toBe(true);
  });

  it("rejects bad keys, wrong cell count, too many columns, duplicates", () => {
    expect(createClassSchema.safeParse({ name: "X", columns: [{ key: "Focus Points", label: "F", values }] }).success).toBe(false);
    expect(createClassSchema.safeParse({ name: "X", columns: [{ key: "f", label: "F", values: values.slice(1) }] }).success).toBe(false);
    expect(createClassSchema.safeParse({ name: "X", columns: Array.from({ length: 13 }, (_, i) => ({ key: `c${i}`, label: "C", values })) }).success).toBe(false);

    const dup = createClassSchema.safeParse({ name: "X", columns: [{ key: "f", label: "F", values }, { key: "f", label: "G", values }] });

    expect(dup.success).toBe(false);
    expect(dup.error?.issues[0]).toMatchObject({ path: ["columns", 1, "key"] });
  });

  it("update: columns optional", () => {
    expect(updateClassSchema.safeParse({ name: "Monk" }).success).toBe(true);
    expect(updateClassSchema.parse({ name: "Monk" }).columns).toBeUndefined();
  });
});
```

`lib/server/templates/__tests__/bundle-columns.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { BUNDLE_TABLES } from "../bundle";

describe("bundle: class table", () => {
  it("classes carry the columns column", () => {
    expect(BUNDLE_TABLES.find((t) => t.key === "classes")?.columns).toContain("columns");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm test:run lib/utils/characters/classes/__tests__/columns.test.ts lib/schemas/__tests__/classes-columns.test.ts lib/server/templates/__tests__/bundle-columns.test.ts`
Expected: FAIL — модуля `columns.ts` немає, `columns` невідоме поле, у бандлі немає колонки.

- [ ] **Step 3: Prisma + migration** — у `prisma/schema.prisma` в `model GameClass` після `subclasses          Json     @default("[]")` додати `columns             Json     @default("[]")`. Створити `prisma/migrations/20261101000000_class_columns/migration.sql`:

```sql
ALTER TABLE "classes" ADD COLUMN "columns" JSONB NOT NULL DEFAULT '[]';
```

Застосувати: `set -a; source .env.local; set +a; pnpm exec prisma migrate deploy && pnpm exec prisma generate`
Expected: `Applying migration 20261101000000_class_columns`, `Generated Prisma Client`.

- [ ] **Step 4: Constants and types** — у `lib/constants/classes.ts` додати:

```ts
export const CLASS_COLUMN_KEY_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const MAX_CLASS_COLUMNS = 12;
```

У `types/classes.ts` перед `export interface GameClassData`:

```ts
export interface ClassColumn {
  key: string;
  label: string;
  /** рівно 20 клітинок: "2", "+2", "1d6", "D8", "+10 ft.", "" */
  values: string[];
  /** колонка — максимум спільного пулу вмінь класу */
  pool?: { rest: "short" | "long" };
}
```

і в `GameClassData` після `subclasses: Subclass[];` — `columns?: ClassColumn[];`.

- [ ] **Step 5: `lib/utils/characters/classes/columns.ts`**

```ts
import { MAX_CLASS_LEVEL } from "@/lib/constants/classes";
import type { ClassColumn } from "@/types/classes";

export type ColumnValue = number | string;

const DIE_ONLY = /^d(\d+)$/i;

const DICE = /^(\d+)d(\d+)$/i;

const NUMBER = /^([+-]?\d+)/;

export function parseColumnValue(cell: string | undefined): ColumnValue | null {
  const s = (cell ?? "").trim();

  if (!s) return null;

  const die = DIE_ONLY.exec(s);

  if (die) return `1d${die[1]}`;

  const dice = DICE.exec(s);

  if (dice) return `${dice[1]}d${dice[2]}`;

  const n = NUMBER.exec(s);

  return n ? Number(n[1]) : null;
}

const cellIndex = (level: number) => Math.min(Math.max(level, 1), MAX_CLASS_LEVEL) - 1;

export const columnValueAt = (column: ClassColumn, level: number): ColumnValue | null => parseColumnValue(column.values[cellIndex(level)]);

export function classColumnIssues(columns: readonly ClassColumn[]): { path: (string | number)[]; message: string }[] {
  const issues: { path: (string | number)[]; message: string }[] = [];

  const seen = new Set<string>();

  columns.forEach((c, i) => {
    if (seen.has(c.key)) issues.push({ path: [i, "key"], message: `Ключ колонки «${c.key}» повторюється` });

    seen.add(c.key);

    if (!c.pool) return;

    c.values.forEach((v, l) => {
      if (v.trim() && typeof parseColumnValue(v) !== "number") issues.push({ path: [i, "values", l], message: `Пул «${c.label}»: рівень ${l + 1} — не число` });
    });
  });

  return issues;
}

export function parseColumnValuesText(text: string): string[] {
  const cells = text.split(",").map((s) => s.trim());

  return Array.from({ length: MAX_CLASS_LEVEL }, (_, i) => cells[i] ?? "");
}

export function classTableText(entry: { name: string; level: number; columns: readonly ClassColumn[] }): string {
  const cells = entry.columns.flatMap((c) => {
    const raw = c.values[cellIndex(entry.level)]?.trim();

    return raw ? [`${c.label} ${raw}`] : [];
  });

  return [`${entry.name} ${entry.level}`, ...cells].join(" · ");
}
```

- [ ] **Step 6: Zod** — `lib/schemas/classes.ts`: імпорти `import { CLASS_CASTERS, CLASS_COLUMN_KEY_RE, MAX_CLASS_COLUMNS, MAX_CLASS_LEVEL } from "@/lib/constants/classes";` і `import { classColumnIssues } from "@/lib/utils/characters/classes/columns";`; додати після `subclassSchema`:

```ts
export const ClassColumnSchema = z.object({
  key: z.string().regex(CLASS_COLUMN_KEY_RE, "Ключ колонки — латиниця в kebab-case").max(40),
  label: z.string().trim().min(1).max(60),
  values: z.array(z.string().trim().max(20)).length(MAX_CLASS_LEVEL),
  pool: z.object({ rest: z.enum(["short", "long"]) }).optional(),
});

const columnsSchema = z.array(ClassColumnSchema).max(MAX_CLASS_COLUMNS);

type TableIssue = { path: (string | number)[]; message: string };

const columnsIssues = (c: { columns?: z.infer<typeof ClassColumnSchema>[] }): TableIssue[] =>
  classColumnIssues(c.columns ?? []).map((issue) => ({ path: ["columns", ...issue.path], message: issue.message }));

const tableIssues = (c: { columns?: z.infer<typeof ClassColumnSchema>[] }): TableIssue[] => columnsIssues(c);
```

У `createClassSchema` в об'єкт після `subclasses: …` — `columns: columnsSchema.default([]),`, а після `.refine(uniqueSubclassIds, duplicateSubclass)` —

```ts
  .superRefine((c, ctx) => {
    for (const issue of tableIssues(c)) ctx.addIssue({ code: "custom", path: issue.path, message: issue.message });
  });
```

У `updateClassSchema` — `columns: columnsSchema.optional(),` і той самий `.superRefine(…)`.

- [ ] **Step 7: Row** — `lib/utils/characters/classes/row.ts`: імпорти `import { ClassColumnSchema } from "@/lib/schemas/classes";` і тип `ClassColumn` (додати до наявного `import type { … } from "@/types/classes";`); функція і поле:

```ts
function columnsOf(v: unknown): ClassColumn[] {
  if (!Array.isArray(v)) return [];

  return v.flatMap((c) => {
    const parsed = ClassColumnSchema.safeParse(c);

    return parsed.success ? [parsed.data] : [];
  });
}
```

у `toGameClassData` після `subclasses: subclassesOf(row.subclasses),` — `columns: columnsOf(row.columns),`.

- [ ] **Step 8: Resource** — `lib/server/content/resources/classes.ts`:
  - `description: "Класи 5e: кістка хітів, рятівні кидки, тип заклинача, вміння за рівнями, підкласи, таблиця класу (columns: 20 клітинок; pool — спільний пул)."`;
  - `updateData`: `const { savingThrows, proficiencies, skillChoices, features, subclasses, columns, ...rest } = data;` і `...(columns && { columns: json(columns) }),`;
  - у `create` у `data` після `subclasses: json(data.subclasses),` — `columns: json(data.columns),`.

- [ ] **Step 9: Import + OpenAPI** — `lib/utils/content/import/fields/classes.ts` після поля `subclasses`: `jsonField("columns", "Таблиця класу (JSON)", ["columns", "class table"], ["[]", "[]"]),`. `lib/server/content/json-schema.ts`: імпорт `import { ClassColumnSchema } from "@/lib/schemas/classes";`, у `SHARED_SCHEMAS` після `[ArmorStatsSchema, "ArmorStats"]` — `[ClassColumnSchema, "ClassColumn"],`.

- [ ] **Step 10: Run tests to verify they pass**

Run: `pnpm test:run lib/utils/characters lib/schemas lib/server/templates lib/server/content lib/utils/content`
Expected: PASS (зокрема `openapi.test.ts` < 130 000).

- [ ] **Step 11: Type check** — `pnpm exec tsc --noEmit -p tsconfig.json` → 0 errors.

- [ ] **Step 12: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/20261101000000_class_columns lib/constants/classes.ts types/classes.ts lib/schemas/classes.ts lib/utils/characters/classes/columns.ts lib/utils/characters/classes/row.ts lib/server/content/resources/classes.ts lib/utils/content/import/fields/classes.ts lib/server/content/json-schema.ts lib/utils/characters/classes/__tests__/columns.test.ts lib/schemas/__tests__/classes-columns.test.ts lib/server/templates/__tests__/bundle-columns.test.ts
git commit -m "feat(constructor): 4f-2 class table columns (migration, resource, import, OpenAPI)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: `{ scale }`, формульні `uses`, `limits.pool` у схемі; перевірка посилань (редактор, Zod класу)

**Files:**
- Modify: `lib/utils/abilities/schema/common.ts`, `lib/utils/abilities/schema/ability.ts:8-16`, `lib/utils/abilities/engine/core/amount.ts`, `lib/utils/abilities/engine/core/usage.ts:21`, `lib/utils/abilities/registry/labels.ts:32-48,76-89`, `lib/utils/abilities/registry/effects/static.ts:105`, `lib/utils/characters/sheet/rest-block.ts:36`, `lib/utils/abilities/editor.ts:135-145`, `components/abilities/editor-context.tsx`, `components/abilities/AbilityListEditor.tsx`, `components/abilities/fields/FlatField.tsx`, `components/abilities/fields/AmountField.tsx`, `lib/schemas/classes.ts`, `lib/server/content/resources/classes.ts`, `lib/constants/api-errors.ts`
- Create: `lib/utils/abilities/class-columns.ts`
- Test: `lib/utils/abilities/__tests__/class-scale-schema.test.ts`, `lib/utils/abilities/__tests__/class-column-refs.test.ts`

**Interfaces:**
- Consumes: `CLASS_COLUMN_KEY_RE` (задача 5), `ClassColumn` (задача 5).
- Produces:
  - `ScaleSchema = z.object({ scale: <key> })`, `type Scale`; `FlatSchema = number | Formula | Scale`; `AmountSchema` + `Scale`; `LimitsSchema.perRest.uses: number(≥1) | Formula | Scale`; `LimitsSchema.pool?: { key: string; cost: number(1–20) }`.
  - `resolveFlat({ scale })` → 0; `resolveAmount({ scale })` → 0; `restUses(l: Limits): number | undefined` (не число → 0); `battleLimit(l) = l.perBattle ?? restUses(l)`.
  - `class-columns.ts`: `type ColumnRef = { path: (string | number)[]; key: string; kind: "scale" | "pool" }`; `FLAT_KEYS`, `AMOUNT_KEYS`; `isScaleRef(v: unknown): v is { scale: string }`; `abilityColumnRefs(a: Ability): ColumnRef[]`; `CLASS_REF_OUTSIDE`; `columnRefIssues(abilities: readonly Ability[], columns: readonly ClassColumn[] | null): { path: (string | number)[]; message: string }[]` (шлях починається з індексу вміння).
  - `validateAbilities(list: unknown[], opts?: { classColumns?: readonly ClassColumn[] })` — без `classColumns` будь-яке посилання на таблицю — проблема.
  - `AbilityEditorContextValue.classColumns?: readonly ClassColumn[]`; `AbilityListEditor` prop `classColumns?: readonly ClassColumn[]`.
  - `API_ERRORS.CLASS_COLUMN_UNKNOWN`.

- [ ] **Step 1: Write the failing tests**

`lib/utils/abilities/__tests__/class-scale-schema.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { resolveAmount, resolveFlat } from "@/lib/utils/abilities/engine/core/amount";
import { battleLimit, restUses, withinCountLimits } from "@/lib/utils/abilities/engine/core/usage";
import { amountLabel, flatLabel, limitsLabel } from "@/lib/utils/abilities/registry/labels";
import { AbilitySchema, AmountSchema, FlatSchema, LimitsSchema } from "@/lib/utils/abilities/schema";
import { makeParticipant, resolved } from "@/lib/utils/abilities/__tests__/fixtures";

describe("scale refs in the schema", () => {
  it("Flat, Amount and perRest.uses accept { scale }; uses also { formula }", () => {
    expect(FlatSchema.safeParse({ scale: "rage-damage" }).success).toBe(true);
    expect(AmountSchema.safeParse({ scale: "sneak-attack" }).success).toBe(true);
    expect(LimitsSchema.safeParse({ perRest: { rest: "long", uses: { scale: "rages" } } }).success).toBe(true);
    expect(LimitsSchema.safeParse({ perRest: { rest: "long", uses: { formula: "max(1, cha_mod)" } } }).success).toBe(true);
    expect(FlatSchema.safeParse({ scale: "Rage Damage" }).success).toBe(false);
  });

  it("pool: key and cost 1..20", () => {
    expect(LimitsSchema.safeParse({ pool: { key: "focus-points", cost: 1 } }).success).toBe(true);
    expect(LimitsSchema.safeParse({ pool: { key: "focus-points", cost: 0 } }).success).toBe(false);
    expect(LimitsSchema.safeParse({ pool: { key: "focus-points", cost: 21 } }).success).toBe(false);
  });

  it("old values still parse", () => {
    expect(AbilitySchema.safeParse({ id: "a", name: "A", trigger: { event: "bonusAction" }, limits: { perRest: { rest: "short", uses: 1 } }, effects: [{ kind: "heal", amount: "1d10" }] }).success).toBe(true);
  });
});

describe("unresolved refs in the engine", () => {
  const owner = makeParticipant({ id: "o" });

  it("resolve to 0; a scale or formula perRest makes the ability unavailable", () => {
    expect(resolveFlat({ scale: "rage-damage" }, owner)).toBe(0);
    expect(resolveAmount({ scale: "sneak-attack" }, { owner, rng: () => 0.5 })).toBe(0);
    expect(restUses({ perRest: { rest: "long", uses: { scale: "rages" } } })).toBe(0);
    expect(restUses({ perRest: { rest: "long", uses: 3 } })).toBe(3);
    expect(restUses({})).toBeUndefined();
    expect(battleLimit({ perRest: { rest: "long", uses: { formula: "cha_mod" } } })).toBe(0);
    expect(withinCountLimits(owner, resolved({ trigger: { event: "bonusAction" }, limits: { perRest: { rest: "long", uses: { scale: "rages" } } }, effects: [{ kind: "note", text: "x" }] }))).toBe(false);
  });

  it("labels show the column key", () => {
    expect(flatLabel({ scale: "rage-damage" })).toBe("+[rage-damage]");
    expect(amountLabel({ scale: "sneak-attack" })).toBe("[sneak-attack]");
    expect(limitsLabel({ perRest: { rest: "long", uses: { scale: "rages" } } })).toEqual(["[rages] разів за довгий відпочинок"]);
    expect(limitsLabel({ perRest: { rest: "long", uses: { formula: "max(1, cha_mod)" } } })).toEqual(["(max(1, cha_mod)) разів за довгий відпочинок"]);
    expect(limitsLabel({ pool: { key: "focus-points", cost: 3 } })).toEqual(["пул «focus-points»: 3"]);
  });
});
```

`lib/utils/abilities/__tests__/class-column-refs.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { API_ERRORS } from "@/lib/constants/api-errors";
import { createClassSchema } from "@/lib/schemas/classes";
import { abilityColumnRefs, CLASS_REF_OUTSIDE, columnRefIssues } from "@/lib/utils/abilities/class-columns";
import { validateAbilities } from "@/lib/utils/abilities/editor";
import type { Ability } from "@/lib/utils/abilities/schema";
import type { ClassColumn } from "@/types/classes";

const values = Array.from({ length: 20 }, () => "2");

const columns: ClassColumn[] = [
  { key: "rages", label: "Rages", values },
  { key: "focus-points", label: "Focus Points", values, pool: { rest: "short" } },
];

const rage: Ability = {
  id: "rage",
  name: "Rage",
  trigger: { event: "bonusAction" },
  limits: { perRest: { rest: "long", uses: { scale: "rages" } } },
  effects: [{ kind: "damageBonus", filter: { kind: "melee" }, flat: { scale: "rage-damage" }, duration: { rounds: 10 } }],
};

const patient: Ability = { id: "pd", name: "Patient Defense", trigger: { event: "bonusAction" }, limits: { pool: { key: "rages", cost: 1 } }, effects: [{ kind: "note", text: "x" }] };

describe("column refs", () => {
  it("finds scale refs in effects and uses, and the pool", () => {
    expect(abilityColumnRefs(rage)).toEqual([
      { path: ["effects", 0, "flat"], key: "rage-damage", kind: "scale" },
      { path: ["limits", "perRest", "uses"], key: "rages", kind: "scale" },
    ]);
    expect(abilityColumnRefs(patient)).toEqual([{ path: ["limits", "pool", "key"], key: "rages", kind: "pool" }]);
  });

  it("issues: outside a class, unknown key, pool on a plain column", () => {
    expect(columnRefIssues([rage], null)).toEqual([
      { path: [0, "effects", 0, "flat"], message: CLASS_REF_OUTSIDE },
      { path: [0, "limits", "perRest", "uses"], message: CLASS_REF_OUTSIDE },
    ]);
    expect(columnRefIssues([rage], columns)).toEqual([{ path: [0, "effects", 0, "flat"], message: "Немає колонки «rage-damage» у таблиці класу" }]);
    expect(columnRefIssues([patient], columns)).toEqual([{ path: [0, "limits", "pool", "key"], message: "Колонка «Rages» не є пулом" }]);
  });

  it("validateAbilities: issues without classColumns, none with matching columns", () => {
    const fixed = { ...rage, effects: [{ kind: "damageBonus" as const, filter: { kind: "melee" as const }, flat: { scale: "rages" }, duration: { rounds: 10 } }] };

    expect(validateAbilities([fixed])).toEqual({ ok: false, errorsByPath: { "0.effects.0.flat": [CLASS_REF_OUTSIDE], "0.limits.perRest.uses": [CLASS_REF_OUTSIDE] } });
    expect(validateAbilities([fixed], { classColumns: columns })).toEqual({ ok: true, errorsByPath: {} });
    expect(validateAbilities([{ id: "x", name: "X", trigger: { event: "passive" }, effects: [{ kind: "note", text: "n" }] }])).toEqual({ ok: true, errorsByPath: {} });
  });

  it("class schema rejects refs to missing columns in features and subclasses", () => {
    const bad = createClassSchema.safeParse({ name: "Barbarian", columns, features: [{ level: 1, abilities: [rage] }] });

    expect(bad.success).toBe(false);
    expect(bad.error?.issues.map((i) => i.path)).toEqual([["features", 0, "abilities", 0, "effects", 0, "flat"]]);

    const sub = createClassSchema.safeParse({ name: "Monk", columns, subclasses: [{ id: "oh", name: "Open Hand", features: [{ level: 3, abilities: [patient] }] }] });

    expect(sub.error?.issues.map((i) => i.path)).toEqual([["subclasses", 0, "features", 0, "abilities", 0, "limits", "pool", "key"]]);
    expect(API_ERRORS.CLASS_COLUMN_UNKNOWN).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm test:run lib/utils/abilities/__tests__/class-scale-schema.test.ts lib/utils/abilities/__tests__/class-column-refs.test.ts`
Expected: FAIL — `{ scale }` не проходить схему, `class-columns.ts` немає.

- [ ] **Step 3: Schema** — `lib/utils/abilities/schema/common.ts`: імпорт `import { CLASS_COLUMN_KEY_RE } from "@/lib/constants/classes";`; після `FormulaSchema`:

```ts
/** Значення з колонки таблиці класу; розв'язується при збиранні вмінь класу. */
export const ScaleSchema = z.object({ scale: z.string().regex(CLASS_COLUMN_KEY_RE).max(40) });

export const FlatSchema = z.union([z.number(), FormulaSchema, ScaleSchema]);
```

у `AmountSchema` після `FormulaSchema,` додати `ScaleSchema,`; в кінці — `export type Scale = z.infer<typeof ScaleSchema>;`.

`lib/utils/abilities/schema/ability.ts`: імпорт `import { CLASS_COLUMN_KEY_RE } from "@/lib/constants/classes";` і `import { FormulaSchema, ScaleSchema } from "./common";`; у `LimitsSchema`:

```ts
  perRest: z.object({ rest: z.enum(["short", "long"]), uses: z.union([z.number().int().min(1), FormulaSchema, ScaleSchema]) }).optional(),
```

і після `legendaryCost` — `pool: z.object({ key: z.string().regex(CLASS_COLUMN_KEY_RE).max(40), cost: z.number().int().min(1).max(20) }).optional(),`.

- [ ] **Step 4: Engine readers** — `lib/utils/abilities/engine/core/amount.ts`:

```ts
export function resolveFlat(flat: Flat, owner: BattleParticipant): number {
  if (typeof flat === "number") return flat;

  return "formula" in flat ? Math.floor(evaluateFormula(flat.formula, formulaContext(owner))) : 0;
}
```

у `resolveAmount` перед `if ("formula" in amount)` — `if ("scale" in amount) return 0;`.

`lib/utils/abilities/engine/core/usage.ts`, замінити `battleLimit`:

```ts
// нерозв'язане посилання на таблицю класу чи формула → 0, вміння недоступне
export function restUses(l: Limits): number | undefined {
  const uses = l.perRest?.uses;

  if (uses === undefined) return undefined;

  return typeof uses === "number" ? uses : 0;
}

export const battleLimit = (l: Limits): number | undefined => l.perBattle ?? restUses(l);
```

- [ ] **Step 5: Labels** — `lib/utils/abilities/registry/labels.ts`:

```ts
export function flatLabel(flat: Flat): string {
  if (typeof flat === "number") return signed(flat);

  return "formula" in flat ? `+(${flat.formula})` : `+[${flat.scale}]`;
}
```

в `amountLabel` після першого рядка — `if ("scale" in amount) return \`[${amount.scale}]\`;`; у `limitsLabel` замінити рядок `perRest` і додати пул:

```ts
    l.perRest ? `${usesLabel(l.perRest.uses)} за ${l.perRest.rest === "short" ? "короткий" : "довгий"} відпочинок` : null,
```

```ts
    l.pool ? `пул «${l.pool.key}»: ${l.pool.cost}` : null,
```

(пул — останнім елементом масиву) і над `limitsLabel`:

```ts
const usesLabel = (uses: NonNullable<Limits["perRest"]>["uses"]) =>
  typeof uses === "number" ? `${uses} ${pluralUk(uses, ["раз", "рази", "разів"])}` : `${"formula" in uses ? `(${uses.formula})` : `[${uses.scale}]`} разів`;
```

`lib/utils/abilities/registry/effects/static.ts`, `percentLabel`:

```ts
const percentLabel = (p: Parameters<typeof flatLabel>[0]) => (typeof p === "number" ? `${signed(p)}%` : "formula" in p ? `(${p.formula})%` : `[${p.scale}]%`);
```

`lib/utils/characters/sheet/rest-block.ts`: імпорт `import { restUses } from "@/lib/utils/abilities/engine/core/usage";`, у `charges` замінити `uses: a.limits.perRest.uses` на `uses: restUses(a.limits) ?? 0`.

- [ ] **Step 6: Field type fixes (повний UI — задача 11)** — `components/abilities/fields/FlatField.tsx`: рядок `text` замінити на

```ts
  const text = draft ?? (value === undefined ? "" : typeof value === "object" ? ("formula" in value ? value.formula : value.scale) : String(value));
```

`components/abilities/fields/AmountField.tsx`: у `modeOf` об'єктну гілку замінити на `if (v && typeof v === "object") return "formula" in v || "scale" in v ? "formula" : "spellRoll" in v ? "spellRoll" : v.percentOf;`; у `textOf` перед `if ("formula" in v)` — `if ("scale" in v) return v.scale;`.

- [ ] **Step 7: `lib/utils/abilities/class-columns.ts`**

```ts
import type { Ability, Effect } from "@/lib/utils/abilities/schema";
import type { ClassColumn } from "@/types/classes";

type Path = (string | number)[];

export interface ColumnRef {
  path: Path;
  key: string;
  kind: "scale" | "pool";
}

export const FLAT_KEYS = ["flat", "percent"] as const;

export const AMOUNT_KEYS = ["amount", "damagePerRound", "healPerRound"] as const;

export const CLASS_REF_OUTSIDE = "Посилання на таблицю класу — лише у вміннях класу";

export const isScaleRef = (v: unknown): v is { scale: string } => !!v && typeof v === "object" && typeof (v as { scale?: unknown }).scale === "string";

function effectRefs(e: Effect, path: Path): ColumnRef[] {
  if (e.kind === "randomOf") return e.options.flatMap((o, i) => effectRefs(o, [...path, "options", i]));

  const record = e as Record<string, unknown>;

  return [...FLAT_KEYS, ...AMOUNT_KEYS].flatMap((k) => {
    const v = record[k];

    return isScaleRef(v) ? [{ path: [...path, k], key: v.scale, kind: "scale" as const }] : [];
  });
}

export function abilityColumnRefs(a: Ability): ColumnRef[] {
  const refs = a.effects.flatMap((e, i) => effectRefs(e, ["effects", i]));

  const uses = a.limits?.perRest?.uses;

  if (isScaleRef(uses)) refs.push({ path: ["limits", "perRest", "uses"], key: uses.scale, kind: "scale" });

  if (a.limits?.pool) refs.push({ path: ["limits", "pool", "key"], key: a.limits.pool.key, kind: "pool" });

  return refs;
}

export function columnRefIssues(abilities: readonly Ability[], columns: readonly ClassColumn[] | null): { path: Path; message: string }[] {
  return abilities.flatMap((a, i) =>
    abilityColumnRefs(a).flatMap((ref) => {
      const path = [i, ...ref.path];

      if (!columns) return [{ path, message: CLASS_REF_OUTSIDE }];

      const column = columns.find((c) => c.key === ref.key);

      if (!column) return [{ path, message: `Немає колонки «${ref.key}» у таблиці класу` }];

      return ref.kind === "pool" && !column.pool ? [{ path, message: `Колонка «${column.label}» не є пулом` }] : [];
    }),
  );
}
```

- [ ] **Step 8: Editor validation** — `lib/utils/abilities/editor.ts`: імпорти `import { columnRefIssues } from "@/lib/utils/abilities/class-columns";`, `AbilitySchema` (додати до наявного імпорту зі схеми), `import type { ClassColumn } from "@/types/classes";`; `validateAbilities`:

```ts
export function validateAbilities(list: unknown[], opts: { classColumns?: readonly ClassColumn[] } = {}): { ok: boolean; errorsByPath: Record<string, string[]> } {
  const errorsByPath: Record<string, string[]> = {};

  const push = (path: PropertyKey[], message: string) => (errorsByPath[path.map(String).join(".")] ??= []).push(message);

  const r = AbilitiesSchema.safeParse(list);

  if (!r.success) for (const issue of r.error.issues) push(issue.path, issue.message);

  list.forEach((raw, i) => {
    const one = AbilitySchema.safeParse(raw);

    if (!one.success) return;

    for (const issue of columnRefIssues([one.data], opts.classColumns ?? null)) push([i, ...issue.path.slice(1)], issue.message);
  });

  return { ok: Object.keys(errorsByPath).length === 0, errorsByPath };
}
```

- [ ] **Step 9: Editor context** — `components/abilities/editor-context.tsx`: імпорт `import type { ClassColumn } from "@/types/classes";`; в інтерфейс — `classColumns?: readonly ClassColumn[];`. `components/abilities/AbilityListEditor.tsx`: у `AbilityListEditorProps` — `classColumns?: readonly ClassColumn[];` (імпорт типу), деструктуризація `classColumns`, `const validation = useMemo(() => validateAbilities(value, { classColumns }), [value, classColumns]);`, провайдер — `value={{ campaignId, errorsByPath: validation.errorsByPath, classColumns }}`.

- [ ] **Step 10: Class schema + resource** — `lib/constants/api-errors.ts` після `CLASS_IN_USE`: `CLASS_COLUMN_UNKNOWN: "Вміння класу посилається на невідому колонку таблиці класу",`. `lib/schemas/classes.ts`: імпорт `import { columnRefIssues } from "@/lib/utils/abilities/class-columns";`; додати:

```ts
type FeatureLike = { abilities: Parameters<typeof columnRefIssues>[0] };

type TableInput = { columns?: z.infer<typeof ClassColumnSchema>[]; features?: FeatureLike[]; subclasses?: { features: FeatureLike[] }[] };

function refsIssues(c: TableInput): TableIssue[] {
  // оновлення без columns перевіряє ресурс за збереженою таблицею
  if (c.columns === undefined) return [];

  const columns = c.columns;

  const check = (features: FeatureLike[] | undefined, base: (string | number)[]) =>
    (features ?? []).flatMap((f, i) => columnRefIssues(f.abilities, columns).map((issue) => ({ path: [...base, i, "abilities", ...issue.path], message: issue.message })));

  return [...check(c.features, ["features"]), ...(c.subclasses ?? []).flatMap((s, k) => check(s.features, ["subclasses", k, "features"]))];
}
```

і `tableIssues` (задача 5) замінити на `const tableIssues = (c: TableInput): TableIssue[] => [...columnsIssues(c), ...refsIssues(c)];` (оголосити `refsIssues` вище за `tableIssues`).

`lib/server/content/resources/classes.ts`: імпорт `import { columnRefIssues } from "@/lib/utils/abilities/class-columns";`; в `update` після перевірки назви:

```ts
    if (data.columns === undefined && (data.features || data.subclasses)) {
      const columns = toGameClassData(existing).columns ?? [];

      const lists = [...(data.features ?? []), ...(data.subclasses ?? []).flatMap((s) => s.features)];

      const issues = lists.flatMap((f) => columnRefIssues(f.abilities, columns));

      if (issues.length > 0) throw new ContentError(API_ERRORS.CLASS_COLUMN_UNKNOWN, 400, issues);
    }
```

і `errors: [400, 409]`.

- [ ] **Step 11: Run tests to verify they pass**

Run: `pnpm test:run lib/utils/abilities lib/schemas lib/utils/characters components/abilities lib/server/content`
Expected: PASS.

- [ ] **Step 12: Type check** — `pnpm exec tsc --noEmit -p tsconfig.json` → 0 errors. Якщо знайдуться інші місця, що читають `Flat`/`Amount`/`perRest.uses` як `number | { formula }`, виправити за тим самим правилом (`{ scale }` → 0 у рушії, `[key]` у підписах) і перелічити файли у звіті задачі.

- [ ] **Step 13: Commit**

```bash
git add lib/utils/abilities lib/utils/characters/sheet/rest-block.ts components/abilities lib/schemas/classes.ts lib/server/content/resources/classes.ts lib/constants/api-errors.ts
git commit -m "feat(constructor): 4f-2 scale refs, formula uses and pools in the ability schema; class ref checks

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Розв'язання при збиранні — `applyClassScale`, `class_level`, `classPools`, `resolveLimitFormulas`

**Files:**
- Modify: `lib/utils/abilities/class-columns.ts`, `lib/utils/abilities/build/collect.ts:93-104`, `types/battle.ts` (`BattleParticipantBattleData`), `lib/utils/battle/participant/from-character.ts`, `lib/utils/battle/participant/from-unit.ts:185`
- Create: `lib/utils/abilities/build/limit-formulas.ts`
- Test: `lib/utils/abilities/__tests__/class-scale-apply.test.ts`, `lib/utils/battle/participant/__tests__/from-character-class-scale.test.ts`

**Interfaces:**
- Consumes: `columnValueAt` (задача 5), `isScaleRef`, `FLAT_KEYS`, `AMOUNT_KEYS`, `abilityColumnRefs` (задача 6), `resolveFlat` (задача 4/6).
- Produces:
  - `types/battle.ts`: `interface AbilityPool { label: string; max: number; rest: "short" | "long" }`; `BattleParticipantBattleData.pools?: Record<string, AbilityPool>`.
  - `class-columns.ts`: `interface ScaleContext { classId: string; level: number; columns: readonly ClassColumn[] }`; `poolKey(classId: string, key: string): string` (`pool:<classId>:<key>`); `applyClassScale(abilities: Ability[], ctx: ScaleContext): Ability[]` (вміння без посилань/`class_level`/пулу — той самий об'єкт); `classPools(entries: readonly ResolvedClassEntry[]): Record<string, AbilityPool>`.
  - `limit-formulas.ts`: `resolveLimitFormulas(p: BattleParticipant): BattleParticipant` (без формульних `uses` — той самий об'єкт).
  - `from-character`: `battleData.pools` лише коли непорожній.

- [ ] **Step 1: Write the failing tests**

`lib/utils/abilities/__tests__/class-scale-apply.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { collectCharacterAbilities } from "@/lib/utils/abilities/build/collect";
import { resolveLimitFormulas } from "@/lib/utils/abilities/build/limit-formulas";
import { applyClassScale, classPools, poolKey } from "@/lib/utils/abilities/class-columns";
import type { Ability } from "@/lib/utils/abilities/schema";
import { createMockParticipant } from "@/lib/utils/battle/__tests__/fixtures/mock-participant";
import type { ClassColumn, GameClassData, ResolvedClassEntry } from "@/types/classes";

const levels = (f: (l: number) => string) => Array.from({ length: 20 }, (_, i) => f(i + 1));

const barbCols: ClassColumn[] = [
  { key: "rages", label: "Rages", values: levels((l) => (l >= 17 ? "6" : l >= 9 ? "4" : "2")) },
  { key: "rage-damage", label: "Rage Damage", values: levels((l) => (l >= 16 ? "+4" : l >= 9 ? "+3" : "+2")) },
  { key: "dice-col", label: "Dice", values: levels(() => "1d6") },
];

const rage: Ability = {
  id: "rage",
  name: "Rage",
  trigger: { event: "bonusAction" },
  limits: { perRest: { rest: "long", uses: { scale: "rages" } } },
  effects: [
    { kind: "damageBonus", filter: { kind: "melee" }, flat: { scale: "rage-damage" }, duration: { rounds: 10 } },
    { kind: "heal", amount: { formula: "2 * class_level" }, target: "self" },
  ],
};

const ctx = (level: number) => ({ classId: "barb", level, columns: barbCols });

describe("applyClassScale", () => {
  it("numbers and class_level by the level in this class", () => {
    const [at9] = applyClassScale([rage], ctx(9));

    expect(at9.limits?.perRest?.uses).toBe(4);
    expect(at9.effects[0]).toMatchObject({ flat: 3 });
    expect(at9.effects[1]).toMatchObject({ amount: { formula: "2 * 9" } });
    expect(applyClassScale([rage], ctx(1))[0].limits?.perRest?.uses).toBe(2);
    expect(applyClassScale([rage], ctx(17))[0].limits?.perRest?.uses).toBe(6);
  });

  it("dice stay dice in amounts, become 0 in numeric fields; missing column → 0", () => {
    const a: Ability = {
      id: "x",
      name: "X",
      trigger: { event: "hit", role: "attacker" },
      effects: [
        { kind: "dealDamage", amount: { scale: "dice-col" }, target: "eventTarget" },
        { kind: "modifyStat", stat: "armor", flat: { scale: "dice-col" }, duration: { rounds: 1 } },
        { kind: "dealDamage", amount: { scale: "nope" }, target: "eventTarget" },
      ],
    };

    const [out] = applyClassScale([a], ctx(5));

    expect(out.effects.map((e) => ("amount" in e ? e.amount : "flat" in e ? e.flat : null))).toEqual(["1d6", 0, 0]);
  });

  it("empty cell at the level and level above 20", () => {
    const focus: ClassColumn = { key: "focus-points", label: "Focus Points", values: levels((l) => (l === 1 ? "" : String(l))), pool: { rest: "short" } };

    const a: Ability = { id: "w", name: "W", trigger: { event: "bonusAction" }, limits: { perRest: { rest: "long", uses: { scale: "focus-points" } } }, effects: [{ kind: "note", text: "n" }] };

    expect(applyClassScale([a], { classId: "monk", level: 1, columns: [focus] })[0].limits?.perRest?.uses).toBe(0);
    expect(applyClassScale([a], { classId: "monk", level: 30, columns: [focus] })[0].limits?.perRest?.uses).toBe(20);
  });

  it("renames the pool key per class; untouched abilities keep identity", () => {
    const pd: Ability = { id: "pd", name: "Patient Defense", trigger: { event: "bonusAction" }, limits: { pool: { key: "focus-points", cost: 1 } }, effects: [{ kind: "note", text: "n" }] };

    const plain: Ability = { id: "p", name: "P", trigger: { event: "passive" }, effects: [{ kind: "modifyStat", stat: "speed", flat: 10 }] };

    const [renamed, same] = applyClassScale([pd, plain], { classId: "monk", level: 5, columns: [] });

    expect(renamed.limits?.pool).toEqual({ key: poolKey("monk", "focus-points"), cost: 1 });
    expect(poolKey("monk", "focus-points")).toBe("pool:monk:focus-points");
    expect(same).toBe(plain);
  });
});

const cls = (id: string, over: Partial<GameClassData>): GameClassData => ({
  id, name: id, icon: null, color: null, hitDie: 8, savingThrows: [], proficiencies: { armor: [], weapons: [], tools: [] }, skillChoices: { count: 0, from: [] },
  caster: "none", spellcastingAbility: null, features: [], subclassLevel: 3, subclasses: [], ...over,
});

const focusCol: ClassColumn = { key: "focus-points", label: "Focus Points", values: levels((l) => (l === 1 ? "" : String(l))), pool: { rest: "short" } };

const cdCol = (key: string): ClassColumn => ({ key, label: "Channel Divinity", values: levels(() => "2"), pool: { rest: "short" } });

describe("multiclass and subclass", () => {
  const second: Ability = { id: "sw", name: "Second Wind", trigger: { event: "bonusAction" }, effects: [{ kind: "heal", amount: { formula: "class_level" }, target: "self" }] };

  const wholeness: Ability = { id: "wb", name: "Wholeness", trigger: { event: "bonusAction" }, limits: { pool: { key: "focus-points", cost: 1 } }, effects: [{ kind: "heal", amount: { formula: "class_level" }, target: "self" }] };

  const fighter = cls("fighter", { features: [{ level: 1, abilities: [second] }] });

  const monk = cls("monk", { columns: [focusCol], subclasses: [{ id: "oh", name: "Open Hand", features: [{ level: 3, abilities: [wholeness] }] }] });

  const entries: ResolvedClassEntry[] = [
    { classId: "fighter", level: 3, class: fighter, subclass: null },
    { classId: "monk", level: 5, subclassId: "oh", class: monk, subclass: monk.subclasses[0] },
  ];

  it("each class uses its own level; the subclass uses its class columns and pool", () => {
    const list = collectCharacterAbilities({ skills: [], race: null, artifacts: [], completedSets: [], classes: entries });

    expect(list.find((a) => a.id === "sw")?.effects[0]).toMatchObject({ amount: { formula: "3" } });
    expect(list.find((a) => a.id === "wb")).toMatchObject({ effects: [{ amount: { formula: "5" } }], limits: { pool: { key: "pool:monk:focus-points" } } });
  });

  it("classPools: max at the class level, separate keys per class, empty cells skipped", () => {
    const cleric = cls("cleric", { columns: [cdCol("channel-divinity-uses")] });

    const paladin = cls("paladin", { columns: [cdCol("channel-divinity-uses")] });

    expect(classPools([...entries, { classId: "cleric", level: 2, class: cleric, subclass: null }, { classId: "paladin", level: 3, class: paladin, subclass: null }])).toEqual({
      "pool:monk:focus-points": { label: "Focus Points", max: 5, rest: "short" },
      "pool:cleric:channel-divinity-uses": { label: "Channel Divinity", max: 2, rest: "short" },
      "pool:paladin:channel-divinity-uses": { label: "Channel Divinity", max: 2, rest: "short" },
    });
    expect(classPools([{ classId: "monk", level: 1, class: monk, subclass: null }])).toEqual({});
  });
});

describe("resolveLimitFormulas", () => {
  const withAbility = (uses: number | { formula: string }, cha: number) => {
    const p = createMockParticipant();

    return {
      ...p,
      abilities: { ...p.abilities, modifiers: { ...p.abilities.modifiers, charisma: cha } },
      battleData: { ...p.battleData, resolvedAbilities: [{ id: "bi", name: "Bardic Inspiration", trigger: { event: "bonusAction" as const }, limits: { perRest: { rest: "long" as const, uses } }, effects: [{ kind: "note" as const, text: "n" }], source: { type: "class" as const, id: "bard", name: "Bard" }, key: "class:bard:bi" }] },
    };
  };

  it("formula uses → number with a floor of 1; numeric uses keep the participant", () => {
    expect(resolveLimitFormulas(withAbility({ formula: "max(1, cha_mod)" }, 3)).battleData.resolvedAbilities[0].limits?.perRest?.uses).toBe(3);
    expect(resolveLimitFormulas(withAbility({ formula: "cha_mod" }, -2)).battleData.resolvedAbilities[0].limits?.perRest?.uses).toBe(1);

    const plain = withAbility(2, 3);

    expect(resolveLimitFormulas(plain)).toBe(plain);
  });
});
```

`lib/utils/battle/participant/__tests__/from-character-class-scale.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { ParticipantSide } from "@/lib/constants/battle";
import { createBattleParticipantFromCharacter } from "@/lib/utils/battle/participant/from-character";
import { DEFAULT_RULES, type Ruleset } from "@/lib/utils/rules";
import { parseRules } from "@/lib/utils/rules/schema";
import type { GameClassData } from "@/types/classes";

const levels = (f: (l: number) => string) => Array.from({ length: 20 }, (_, i) => f(i + 1));

const base = {
  id: "ch1", campaignId: "c1", name: "Герой", race: "Людина", class: "Монах", level: 5,
  strength: 10, dexterity: 14, constitution: 12, intelligence: 10, wisdom: 16, charisma: 10,
  armorClass: 12, speed: 30, initiative: 0, morale: 0, controlledBy: "u1", immunities: [], knownSpells: [],
  equipment: {}, skillTreeProgress: {}, personalSkillId: null, archetype: "warrior", classes: [],
};

const monk: GameClassData = {
  id: "monk", name: "Monk", icon: null, color: null, hitDie: 8, savingThrows: ["strength", "dexterity"],
  proficiencies: { armor: [], weapons: [], tools: [] }, skillChoices: { count: 0, from: [] },
  caster: "none", spellcastingAbility: null, subclassLevel: 3, subclasses: [],
  columns: [{ key: "focus-points", label: "Focus Points", values: levels((l) => (l === 1 ? "" : String(l))), pool: { rest: "short" } }],
  features: [{ level: 2, abilities: [{ id: "pd", name: "Patient Defense", trigger: { event: "bonusAction" }, limits: { pool: { key: "focus-points", cost: 1 } }, effects: [{ kind: "note", text: "n" }] }] }],
};

const build = (rules: Ruleset, character: object) =>
  createBattleParticipantFromCharacter({ ...base, ...character } as never, "b1", ParticipantSide.ALLY, undefined, {
    skillTreeByRace: {}, mainSkills: [], spells: [], allSkills: [], racesByName: { "Людина": null }, campaign: { maxLevel: 20 },
    skillsById: {}, artifactsById: {}, artifactSetsById: {}, artifactSetMemberIds: {}, rules, classesById: { monk },
  } as never);

describe("числа класу на учаснику", () => {
  it("Monk 5: пул Focus 5/5 і ключ пулу на вмінні", async () => {
    const p = await build(parseRules({ classes: { enabled: true } }), { classes: [{ classId: "monk", level: 5 }] });

    expect(p.battleData.pools).toEqual({ "pool:monk:focus-points": { label: "Focus Points", max: 5, rest: "short" } });
    expect(p.battleData.resolvedAbilities.find((a) => a.id === "pd")?.limits?.pool).toEqual({ key: "pool:monk:focus-points", cost: 1 });
  });

  it("HOMM-герой: ключа pools немає", async () => {
    const p = await build(DEFAULT_RULES, {});

    expect("pools" in p.battleData).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm test:run lib/utils/abilities/__tests__/class-scale-apply.test.ts lib/utils/battle/participant/__tests__/from-character-class-scale.test.ts`
Expected: FAIL — `applyClassScale`/`classPools`/`resolveLimitFormulas` не існують.

- [ ] **Step 3: Pool type** — `types/battle.ts` перед `export interface BattleParticipantBattleData`:

```ts
export interface AbilityPool {
  label: string;
  max: number;
  rest: "short" | "long";
}
```

у `BattleParticipantBattleData` після `abilityUsage?: …` — `/** Спільні пули вмінь класу (ключ pool:<classId>:<колонка>); витрачено — abilityUsage[ключ].battle */ pools?: Record<string, AbilityPool>;`.

- [ ] **Step 4: Apply** — дописати в `lib/utils/abilities/class-columns.ts` (імпорти: `import { columnValueAt } from "@/lib/utils/characters/classes/columns";`, `import type { AbilityPool } from "@/types/battle";`, тип `ResolvedClassEntry` з `@/types/classes`):

```ts
export interface ScaleContext {
  classId: string;
  level: number;
  columns: readonly ClassColumn[];
}

export const poolKey = (classId: string, key: string) => `pool:${classId}:${key}`;

const CLASS_LEVEL_RE = /\bclass_level\b/g;

const HAS_CLASS_LEVEL = /\bclass_level\b/;

const cellAt = (ref: { scale: string }, ctx: ScaleContext) => {
  const column = ctx.columns.find((c) => c.key === ref.scale);

  return column ? columnValueAt(column, ctx.level) : null;
};

const numberAt = (ref: { scale: string }, ctx: ScaleContext): number => {
  const v = cellAt(ref, ctx);

  return typeof v === "number" ? v : 0;
};

const amountAt = (ref: { scale: string }, ctx: ScaleContext): number | string => cellAt(ref, ctx) ?? 0;

function withClassLevel<T>(value: T, level: number): T {
  if (Array.isArray(value)) return value.map((v) => withClassLevel(v, level)) as T;

  if (!value || typeof value !== "object") return value;

  return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, k === "formula" && typeof v === "string" ? v.replace(CLASS_LEVEL_RE, String(level)) : withClassLevel(v, level)])) as T;
}

function scaleEffect(e: Effect, ctx: ScaleContext): Effect {
  if (e.kind === "randomOf") return { ...e, options: e.options.map((o) => scaleEffect(o, ctx) as typeof o) };

  const out: Record<string, unknown> = { ...e };

  for (const k of FLAT_KEYS) if (isScaleRef(out[k])) out[k] = numberAt(out[k] as { scale: string }, ctx);

  for (const k of AMOUNT_KEYS) if (isScaleRef(out[k])) out[k] = amountAt(out[k] as { scale: string }, ctx);

  return out as Effect;
}

const needsClassScale = (a: Ability) => abilityColumnRefs(a).length > 0 || HAS_CLASS_LEVEL.test(JSON.stringify(a));

export function applyClassScale(abilities: Ability[], ctx: ScaleContext): Ability[] {
  return abilities.map((a) => {
    if (!needsClassScale(a)) return a;

    const l = a.limits;

    const uses = l?.perRest?.uses;

    const limits = l && {
      ...l,
      ...(l.perRest && { perRest: { ...l.perRest, uses: isScaleRef(uses) ? numberAt(uses, ctx) : l.perRest.uses } }),
      ...(l.pool && { pool: { ...l.pool, key: poolKey(ctx.classId, l.pool.key) } }),
    };

    return withClassLevel({ ...a, effects: a.effects.map((e) => scaleEffect(e, ctx)), ...(limits && { limits }) }, ctx.level);
  });
}

export function classPools(entries: readonly ResolvedClassEntry[]): Record<string, AbilityPool> {
  const out: Record<string, AbilityPool> = {};

  for (const { class: cls, level } of entries) {
    for (const column of cls?.columns ?? []) {
      if (!cls || !column.pool) continue;

      const max = columnValueAt(column, level);

      if (typeof max === "number" && max > 0) out[poolKey(cls.id, column.key)] = { label: column.label, max, rest: column.pool.rest };
    }
  }

  return out;
}
```

- [ ] **Step 5: Collect** — `lib/utils/abilities/build/collect.ts`: імпорт `import { applyClassScale } from "@/lib/utils/abilities/class-columns";`; `classResolved`:

```ts
function classResolved(entries: ResolvedClassEntry[]): ResolvedAbility[] {
  return entries.flatMap(({ class: cls, subclass, level }) => {
    if (!cls) return [];

    const upTo = (features: { level: number; abilities: Ability[] }[]) => features.filter((f) => f.level <= level).flatMap((f) => f.abilities);

    // підклас бере колонки, рівень і пули свого класу
    const scale = (abilities: Ability[]) => applyClassScale(abilities, { classId: cls.id, level, columns: cls.columns ?? [] });

    return [
      ...resolveAbilities({ type: "class", id: cls.id, name: cls.name, icon: cls.icon }, scale(upTo(cls.features))),
      ...(subclass ? resolveAbilities({ type: "class", id: subclass.id, name: `${cls.name}: ${subclass.name}` }, scale(upTo(subclass.features))) : []),
    ];
  });
}
```

- [ ] **Step 6: `lib/utils/abilities/build/limit-formulas.ts`**

```ts
import { resolveFlat } from "@/lib/utils/abilities/engine/core/amount";
import type { BattleParticipant } from "@/types/battle";

const isFormula = (v: unknown): v is { formula: string } => !!v && typeof v === "object" && typeof (v as { formula?: unknown }).formula === "string";

/** Після запікання: perRest.uses { formula } → число (мінімум 1) від запечених модифікаторів. */
export function resolveLimitFormulas(p: BattleParticipant): BattleParticipant {
  const list = p.battleData.resolvedAbilities;

  if (!list.some((a) => isFormula(a.limits?.perRest?.uses))) return p;

  return {
    ...p,
    battleData: {
      ...p.battleData,
      resolvedAbilities: list.map((a) => {
        const perRest = a.limits?.perRest;

        return a.limits && perRest && isFormula(perRest.uses) ? { ...a, limits: { ...a.limits, perRest: { ...perRest, uses: Math.max(1, resolveFlat(perRest.uses, p)) } } } : a;
      }),
    },
  };
}
```

- [ ] **Step 7: Participants** — `lib/utils/battle/participant/from-character.ts`: імпорти `import { resolveLimitFormulas } from "@/lib/utils/abilities/build/limit-formulas";` і `import { classPools } from "@/lib/utils/abilities/class-columns";`; перед `const participant: BattleParticipant = {` — `const pools = resolvedClasses ? classPools(resolvedClasses) : {};`; у `battleData` після `abilityUsage: {},` — `...(Object.keys(pools).length > 0 && { pools }),`; рядок `const armored = …` (задача 2) замінити на `const armored = resolveLimitFormulas(resolvedClasses ? applyClassArmor(baked) : baked);`. `lib/utils/battle/participant/from-unit.ts`: імпорт `resolveLimitFormulas`, рядок `return bakePassives(participant);` → `return resolveLimitFormulas(bakePassives(participant));`.

- [ ] **Step 8: Run tests to verify they pass**

Run: `pnpm test:run lib/utils/abilities lib/utils/battle/participant`
Expected: PASS (зокрема `from-character-classes.test.ts` «HOMM без змін», `from-unit*.test.ts`).

- [ ] **Step 9: Type check** — `pnpm exec tsc --noEmit -p tsconfig.json` → 0 errors.

- [ ] **Step 10: Commit**

```bash
git add lib/utils/abilities/class-columns.ts lib/utils/abilities/build/collect.ts lib/utils/abilities/build/limit-formulas.ts types/battle.ts lib/utils/battle/participant/from-character.ts lib/utils/battle/participant/from-unit.ts lib/utils/abilities/__tests__/class-scale-apply.test.ts lib/utils/battle/participant/__tests__/from-character-class-scale.test.ts
git commit -m "feat(constructor): 4f-2 resolve class table refs, class_level and pools at build time

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: Пули в рушії й ресурсах 4d

**Files:**
- Modify: `lib/utils/abilities/engine/core/usage.ts`, `lib/utils/abilities/engine/core/run-abilities.ts:62`, `lib/utils/battle/pipeline/ability-use.ts:59`, `lib/constants/api-errors.ts`, `lib/utils/battle/view/hero.ts`, `lib/utils/characters/resources/battle.ts`, `lib/utils/characters/sheet/rest-block.ts`, `lib/utils/battle/participant/refresh-from-source.ts`
- Test: `lib/utils/abilities/engine/core/__tests__/pools.test.ts`, `lib/utils/characters/resources/__tests__/pools-resources.test.ts`

**Interfaces:**
- Consumes: `AbilityPool`, `battleData.pools` (задача 7); `restUses` (задача 6).
- Produces: `poolLeft(p, key): number | null`; `poolAffordable(p, ability): boolean`; `recordUse(p, key, round, pool?: { key: string; cost: number })`; `API_ERRORS.ABILITY_POOL_EMPTY`; `PoolView = { key; label; left; max }`, `poolViews(p): PoolView[]`; `AbilityOption.pool?: PoolView & { cost: number }`.

- [ ] **Step 1: Write the failing tests**

`lib/utils/abilities/engine/core/__tests__/pools.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { makeParticipant, resolved, seq } from "@/lib/utils/abilities/__tests__/fixtures";
import { runAbilities } from "@/lib/utils/abilities/engine/core/run-abilities";
import { poolAffordable, poolLeft, recordUse, resetUsage, withinCountLimits } from "@/lib/utils/abilities/engine/core/usage";
import { abilityOptions, poolViews } from "@/lib/utils/battle/view";
import type { BattleParticipant } from "@/types/battle";

const KEY = "pool:monk:focus-points";

const pd = resolved({ id: "pd", name: "Patient Defense", trigger: { event: "bonusAction" }, limits: { pool: { key: KEY, cost: 1 } }, effects: [{ kind: "note", text: "pd" }] }, { type: "class", id: "monk" });

const sd = resolved({ id: "sd", name: "Superior Defense", trigger: { event: "bonusAction" }, limits: { pool: { key: KEY, cost: 3 } }, effects: [{ kind: "note", text: "sd" }] }, { type: "class", id: "monk" });

function monk(max = 5, used = 0): BattleParticipant {
  const p = makeParticipant({ id: "m", abilities: [pd, sd] });

  return { ...p, battleData: { ...p.battleData, pools: { [KEY]: { label: "Focus Points", max, rest: "short" } }, abilityUsage: used ? { [KEY]: { battle: used, round: 0, turn: 0 } } : {} } };
}

const use = (p: BattleParticipant, key: string) => runAbilities([p], { type: "bonusAction", actorId: "m", abilityKey: key, targetIds: [] }, { round: 1, rng: seq(0.5) });

describe("shared pools", () => {
  it("spending a cost lowers the shared pool for every ability", () => {
    const after = use(monk(), pd.key).participants[0];

    expect(poolLeft(after, KEY)).toBe(4);

    const afterSd = use(after, sd.key).participants[0];

    expect(poolLeft(afterSd, KEY)).toBe(1);
    expect(withinCountLimits(afterSd, pd)).toBe(true);
    expect(withinCountLimits(afterSd, sd)).toBe(false);
    expect(use(afterSd, sd.key).fired).toEqual([]);
  });

  it("no pool on the participant (non-class ability or empty column) → unavailable", () => {
    const p = makeParticipant({ id: "m", abilities: [pd] });

    expect(poolAffordable(p, pd)).toBe(false);
    expect(poolLeft(p, KEY)).toBeNull();
  });

  it("round/turn resets do not refill; shrunk max never goes negative", () => {
    expect(poolLeft(resetUsage(resetUsage(monk(5, 4), "round"), "turn"), KEY)).toBe(1);
    expect(poolLeft(monk(3, 5), KEY)).toBe(0);
  });

  it("recordUse without a pool is unchanged", () => {
    const p = recordUse(monk(), pd.key, 1);

    expect(p.battleData.abilityUsage?.[KEY]).toBeUndefined();
    expect(recordUse(monk(), pd.key, 1, { key: KEY, cost: 2 }).battleData.abilityUsage?.[KEY]).toEqual({ battle: 2, round: 2, turn: 2, lastRound: 1 });
  });

  it("views: hero card pools and the picker tile", () => {
    expect(poolViews(monk(5, 2))).toEqual([{ key: KEY, label: "Focus Points", left: 3, max: 5 }]);
    expect(abilityOptions(monk(5, 2), "bonusAction", 1).map((o) => [o.ability.id, o.pool?.left, o.pool?.cost])).toEqual([["pd", 3, 1], ["sd", 3, 3]]);
    expect(abilityOptions(monk(5, 3), "bonusAction", 1).map((o) => o.ability.id)).toEqual(["pd"]);
  });
});
```

`lib/utils/characters/resources/__tests__/pools-resources.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { makeParticipant } from "@/lib/utils/abilities/__tests__/fixtures";
import { applyBattleResult, applyCharacterResources } from "@/lib/utils/characters/resources/battle";
import { applyRest } from "@/lib/utils/characters/resources/rest";
import { buildRestBlock } from "@/lib/utils/characters/sheet/rest-block";
import { parseRules } from "@/lib/utils/rules/schema";
import type { BattleParticipant } from "@/types/battle";

const FOCUS = "pool:monk:focus-points";

const SORC = "pool:sorc:sorcery-points";

const rules = parseRules({ classes: { enabled: true }, outOfCombat: { persistResources: true } });

function hero(usage: Record<string, number> = {}): BattleParticipant {
  const p = makeParticipant({ id: "h" });

  return {
    ...p,
    battleData: {
      ...p.battleData,
      pools: { [FOCUS]: { label: "Focus Points", max: 5, rest: "short" }, [SORC]: { label: "Sorcery Points", max: 4, rest: "long" } },
      abilityUsage: Object.fromEntries(Object.entries(usage).map(([k, battle]) => [k, { battle, round: 0, turn: 0 }])),
    },
  };
}

describe("pools between battles", () => {
  it("battle result stores spent pools with their rest kind", () => {
    expect(applyBattleResult({}, hero({ [FOCUS]: 1, [SORC]: 2 })).charges).toEqual({ [FOCUS]: { used: 1, rest: "short" }, [SORC]: { used: 2, rest: "long" } });
  });

  it("battle start restores spent pools", () => {
    const p = applyCharacterResources(hero(), { resources: { charges: { [FOCUS]: { used: 2, rest: "short" } } }, inspiration: null }, rules);

    expect(p.battleData.abilityUsage?.[FOCUS]).toEqual({ battle: 2, round: 0, turn: 0 });
  });

  it("short rest refills short pools only; long rest refills all", () => {
    const r = { charges: { [FOCUS]: { used: 1, rest: "short" as const }, [SORC]: { used: 2, rest: "long" as const } } };

    expect(applyRest("short", r, { pool: [], longRestHitDice: "half" }).charges).toEqual({ [SORC]: { used: 2, rest: "long" } });
    expect(applyRest("long", r, { pool: [], longRestHitDice: "half" }).charges).toBeUndefined();
  });

  it("sheet rest block lists pools as charges", () => {
    const block = buildRestBlock({ participant: hero({ [FOCUS]: 1 }), character: { level: 5 }, rules, maxLevel: 20 });

    expect(block?.charges).toEqual([
      { key: FOCUS, name: "Focus Points", uses: 5, used: 1, rest: "short" },
      { key: SORC, name: "Sorcery Points", uses: 4, used: 0, rest: "long" },
    ]);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm test:run lib/utils/abilities/engine/core/__tests__/pools.test.ts lib/utils/characters/resources/__tests__/pools-resources.test.ts`
Expected: FAIL — `poolLeft`/`poolViews` не існують, ліміти пулу не діють.

- [ ] **Step 3: Usage** — `lib/utils/abilities/engine/core/usage.ts`:

```ts
export function poolLeft(p: BattleParticipant, key: string): number | null {
  const pool = p.battleData.pools?.[key];

  return pool ? Math.max(0, pool.max - usageOf(p, key).battle) : null;
}

export function poolAffordable(p: BattleParticipant, ability: ResolvedAbility): boolean {
  const pool = ability.limits?.pool;

  if (!pool) return true;

  const left = poolLeft(p, pool.key);

  return left !== null && left >= pool.cost;
}
```

у `withinCountLimits` після `if (!l) return true;` — `if (!poolAffordable(p, ability)) return false;`; `recordUse`:

```ts
export function recordUse(p: BattleParticipant, key: string, round: number, pool?: { key: string; cost: number }): BattleParticipant {
  const u = usageOf(p, key);

  const usage = { ...p.battleData.abilityUsage, [key]: { battle: u.battle + 1, round: u.round + 1, turn: u.turn + 1, lastRound: round } };

  if (pool) {
    const pu = usageOf(p, pool.key);

    usage[pool.key] = { battle: pu.battle + pool.cost, round: pu.round + pool.cost, turn: pu.turn + pool.cost, lastRound: round };
  }

  return { ...p, battleData: { ...p.battleData, abilityUsage: usage } };
}
```

`lib/utils/abilities/engine/core/run-abilities.ts:62` → `ps = updateParticipant(ps, ownerId, (p) => recordUse(p, ability.key, ctx.round, ability.limits?.pool));`.

- [ ] **Step 4: Server refusal** — `lib/constants/api-errors.ts` після `CLASS_COLUMN_UNKNOWN`: `ABILITY_POOL_EMPTY: "У пулі недостатньо очок для цього вміння",`. `lib/utils/battle/pipeline/ability-use.ts`: імпорт `poolAffordable` (з тим самим `usage`), перед рядком з `withinCountLimits` — `if (!poolAffordable(participant, ability)) throw new BattleRuleError("ability_limit", API_ERRORS.ABILITY_POOL_EMPTY);`.

- [ ] **Step 5: Views** — `lib/utils/battle/view/hero.ts`: імпорт `poolLeft` з `usage`; додати:

```ts
export interface PoolView {
  key: string;
  label: string;
  left: number;
  max: number;
}

export function poolViews(p: BattleParticipant): PoolView[] {
  return Object.entries(p.battleData.pools ?? {}).map(([key, pool]) => ({ key, label: pool.label, left: poolLeft(p, key) ?? 0, max: pool.max }));
}
```

`AbilityOption` — `pool?: PoolView & { cost: number };`; `abilityOptions`:

```ts
export function abilityOptions(p: BattleParticipant, trigger: "bonusAction" | "action", round: number): AbilityOption[] {
  const pools = poolViews(p);

  return (p.battleData.resolvedAbilities ?? [])
    .filter((a) => a.trigger.event === trigger && !a.limits?.legendaryCost && withinCountLimits(p, a))
    .map((ability) => {
      const ref = ability.limits?.pool;

      const view = ref && pools.find((v) => v.key === ref.key);

      return { ability, cooldownLeft: cooldownLeft(p, ability, round), ...(view && ref && { pool: { ...view, cost: ref.cost } }) };
    });
}
```

- [ ] **Step 6: Resources** — `lib/utils/characters/resources/battle.ts`: у `withCharges` перед `return` додати

```ts
  for (const key of Object.keys(p.battleData.pools ?? {})) {
    const used = charges[key]?.used ?? 0;

    if (used > 0) usage[key] = { battle: used, round: 0, turn: 0 };
  }
```

у `battleCharges` рядок `const perRest = …` замінити на

```ts
  const perRest = [
    ...p.battleData.resolvedAbilities.flatMap((a) => (a.limits?.perRest ? [{ key: a.key, rest: a.limits.perRest.rest }] : [])),
    ...Object.entries(p.battleData.pools ?? {}).map(([key, pool]) => ({ key, rest: pool.rest })),
  ];
```

`lib/utils/characters/sheet/rest-block.ts`, поле `charges`:

```ts
    charges: persist
      ? [
          ...p.battleData.resolvedAbilities.flatMap((a) => (a.limits?.perRest ? [{ key: a.key, name: a.name, uses: restUses(a.limits) ?? 0, used: p.battleData.abilityUsage?.[a.key]?.battle ?? 0, rest: a.limits.perRest.rest }] : [])),
          ...Object.entries(p.battleData.pools ?? {}).map(([key, pool]) => ({ key, name: pool.label, uses: pool.max, used: p.battleData.abilityUsage?.[key]?.battle ?? 0, rest: pool.rest })),
        ]
      : [],
```

`lib/utils/battle/participant/refresh-from-source.ts`: у `battleData` після `attacks: fresh.battleData.attacks,` — `...(fresh.battleData.pools && { pools: fresh.battleData.pools }),`.

- [ ] **Step 7: Run tests to verify they pass**

Run: `pnpm test:run lib/utils/abilities lib/utils/characters lib/utils/battle/view lib/utils/battle/participant lib/utils/battle/pipeline`
Expected: PASS.

- [ ] **Step 8: Type check** — `pnpm exec tsc --noEmit -p tsconfig.json` → 0 errors.

- [ ] **Step 9: Commit**

```bash
git add lib/utils/abilities/engine/core/usage.ts lib/utils/abilities/engine/core/run-abilities.ts lib/utils/battle/pipeline/ability-use.ts lib/constants/api-errors.ts lib/utils/battle/view/hero.ts lib/utils/characters/resources/battle.ts lib/utils/characters/sheet/rest-block.ts lib/utils/battle/participant/refresh-from-source.ts lib/utils/abilities/engine/core/__tests__/pools.test.ts lib/utils/characters/resources/__tests__/pools-resources.test.ts
git commit -m "feat(constructor): 4f-2 shared ability pools in battle, resources and rest

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---
### Task 9: `rollMode` у подіях атаки й умови Підступної атаки

**Files:**
- Modify: `types/abilities.ts:32-33`, `lib/utils/battle/attack/roll.ts`, `lib/utils/battle/attack/process/hit.ts:76-82`, `lib/utils/battle/attack/process/run.ts:197`, `lib/utils/abilities/schema/conditions.ts`, `lib/utils/abilities/registry/conditions.ts`, `components/abilities/ConditionEditor.tsx`
- Test: `lib/utils/abilities/__tests__/sneak-attack-conditions.test.ts`

**Interfaces:**
- Produces: подія `attack`/`hit` — `rollMode?: "advantage" | "disadvantage"` (відсутність = звичайний); `eventRollMode(roll: AttackRollResult): { rollMode?: "advantage" | "disadvantage" }` у `attack/roll.ts`; умови `{ type: "attackRollMode"; mode: "advantage" | "disadvantage" | "normal" }`, `{ type: "allyAdjacent" }` (інший живий союзник власника за ≤ 1 клітинку від цілі події; без позиції цілі — хибно).

- [ ] **Step 1: Write the failing test** — `lib/utils/abilities/__tests__/sneak-attack-conditions.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { ParticipantSide } from "@/lib/constants/battle";
import { makeParticipant, resolved, seq } from "@/lib/utils/abilities/__tests__/fixtures";
import { runAbilities } from "@/lib/utils/abilities/engine/core/run-abilities";
import type { Condition } from "@/lib/utils/abilities/schema";
import { eventRollMode } from "@/lib/utils/battle/attack/roll";
import type { AttackRollResult } from "@/lib/utils/battle/types/attack";
import type { AbilityEvent } from "@/types/abilities";
import type { BattleParticipant, GridPoint } from "@/types/battle";

const SNEAK: Condition = {
  type: "any",
  conditions: [
    { type: "attackRollMode", mode: "advantage" },
    { type: "all", conditions: [{ type: "allyAdjacent" }, { type: "not", condition: { type: "attackRollMode", mode: "disadvantage" } }] },
  ],
};

const sneak = resolved({ id: "sa", name: "Sneak Attack", trigger: { event: "hit", role: "attacker" }, condition: SNEAK, limits: { perTurn: 1 }, effects: [{ kind: "dealDamage", amount: 7, target: "eventTarget" }] }, { type: "class", id: "rogue" });

const at = (p: BattleParticipant, position?: GridPoint): BattleParticipant => ({ ...p, battleData: { ...p.battleData, ...(position && { position }) } });

function scene(opts: { allyAt?: GridPoint; targetAt?: GridPoint } = {}) {
  const rogue = at(makeParticipant({ id: "r", abilities: [sneak] }), opts.targetAt && { x: 0, y: 0 });

  const ally = at(makeParticipant({ id: "a" }), opts.allyAt);

  const target = at(makeParticipant({ id: "t", side: ParticipantSide.ENEMY, hp: 50, maxHp: 50 }), opts.targetAt);

  return [rogue, ally, target];
}

const hit = (rollMode?: "advantage" | "disadvantage"): AbilityEvent => ({ type: "hit", actorId: "r", targetId: "t", attackKind: "melee", damage: 5, ...(rollMode && { rollMode }) });

const hpAfter = (ps: BattleParticipant[], event: AbilityEvent) => runAbilities(ps, event, { round: 1, rng: seq(0.5) }).participants.find((p) => p.basicInfo.id === "t")?.combatStats.currentHp;

describe("Sneak Attack conditions", () => {
  it("advantage alone is enough, even without a map", () => {
    expect(hpAfter(scene(), hit("advantage"))).toBe(43);
    expect(hpAfter(scene(), hit())).toBe(50);
  });

  it("an ally next to the target without disadvantage", () => {
    expect(hpAfter(scene({ targetAt: { x: 5, y: 5 }, allyAt: { x: 6, y: 5 } }), hit())).toBe(43);
    expect(hpAfter(scene({ targetAt: { x: 5, y: 5 }, allyAt: { x: 6, y: 5 } }), hit("disadvantage"))).toBe(50);
    expect(hpAfter(scene({ targetAt: { x: 5, y: 5 }, allyAt: { x: 8, y: 5 } }), hit())).toBe(50);
  });

  it("a downed ally does not count", () => {
    const ps = scene({ targetAt: { x: 5, y: 5 }, allyAt: { x: 6, y: 5 } }).map((p) => (p.basicInfo.id === "a" ? { ...p, combatStats: { ...p.combatStats, currentHp: 0, status: "dead" as const } } : p));

    expect(hpAfter(ps, hit())).toBe(50);
  });

  it("once per turn", () => {
    const first = runAbilities(scene(), hit("advantage"), { round: 1, rng: seq(0.5) });

    expect(hpAfter(first.participants, hit("advantage"))).toBe(43);
  });

  it("eventRollMode carries only advantage or disadvantage", () => {
    const roll = (mode?: "advantage" | "disadvantage") => ({ isHit: true, isCritical: false, isCriticalFail: false, totalAttackValue: 15, attackBonus: 5, advantageUsed: mode === "advantage", chosenD20: 10, ...(mode && { secondRoll: { mode, value: 4, serverRolled: true } }) }) as AttackRollResult;

    expect(eventRollMode(roll("advantage"))).toEqual({ rollMode: "advantage" });
    expect(eventRollMode(roll("disadvantage"))).toEqual({ rollMode: "disadvantage" });
    expect(eventRollMode(roll())).toEqual({});
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test:run lib/utils/abilities/__tests__/sneak-attack-conditions.test.ts`
Expected: FAIL — `eventRollMode` не існує, умови `attackRollMode`/`allyAdjacent` не проходять схему.

- [ ] **Step 3: Events** — `types/abilities.ts`:

```ts
  | { type: "attack"; phase: "before" | "after"; actorId: string; targetId: string; attackKind: AttackType; rollMode?: "advantage" | "disadvantage" }
  | { type: "hit"; actorId: string; targetId: string; attackKind: AttackType; damage: number; rollMode?: "advantage" | "disadvantage" }
```

`lib/utils/battle/attack/roll.ts` — у кінець файлу:

```ts
/** Режим кидка для подій hit / attack after: лише перевага чи недолік, звичайний — без поля. */
export function eventRollMode(roll: AttackRollResult): { rollMode?: "advantage" | "disadvantage" } {
  return roll.secondRoll ? { rollMode: roll.secondRoll.mode } : {};
}
```

`lib/utils/battle/attack/process/hit.ts`: імпорт `import { eventRollMode } from "@/lib/utils/battle/attack/roll";`; в об'єкт події `hit` після `damage: …,` додати `...eventRollMode(p.attackRoll),`. `lib/utils/battle/attack/process/run.ts:197`: `fire(flow, { type: "attack", phase: "after", actorId: attackerId, targetId, attackKind, ...eventRollMode(attackRoll) });` (імпорт `eventRollMode` додати до наявного імпорту з `../roll` або `@/lib/utils/battle/attack/roll` — як імпортується `calculateAttackRoll` у цьому файлі).

- [ ] **Step 4: Conditions schema** — `lib/utils/abilities/schema/conditions.ts`: у тип `Condition` перед `not`:

```ts
  | { type: "attackRollMode"; mode: "advantage" | "disadvantage" | "normal" }
  | { type: "allyAdjacent" }
```

у `discriminatedUnion` перед `not`:

```ts
    z.object({ type: z.literal("attackRollMode"), mode: z.enum(["advantage", "disadvantage", "normal"]) }),
    z.object({ type: z.literal("allyAdjacent") }),
```

- [ ] **Step 5: Registry** — `lib/utils/abilities/registry/conditions.ts`: імпорт `import { isAdjacent } from "@/lib/utils/battle/grid/occupancy";` (напряму, не через barrel `grid`, щоб не тягнути важкі модулі в реєстр умов; `isAdjacent` уже перевіряє, що обидва на карті, і відстань footprint ≤ 1); у `CONDITION_REGISTRY` перед `not`:

```ts
  attackRollMode: {
    label: "Режим кидка атаки",
    fields: [{ name: "mode", label: "Режим", input: "select", options: [{ value: "advantage", label: "перевага" }, { value: "disadvantage", label: "недолік" }, { value: "normal", label: "звичайний" }] }],
  },
  allyAdjacent: { label: "Союзник поруч із ціллю", fields: [] },
```

хелпери над `evaluateCondition`:

```ts
function eventRollModeOf(e: AbilityEvent | null): "advantage" | "disadvantage" | "normal" | null {
  if (!e || (e.type !== "attack" && e.type !== "hit")) return null;

  return e.rollMode ?? "normal";
}

function allyNextToTarget({ owner, event, participants }: ConditionContext): boolean {
  const target = event ? eventTargetIds(event).map((id) => findParticipant(participants, id)).find((p) => !!p) : undefined;

  if (!target) return false;

  return participants.some((p) => p.basicInfo.id !== owner.basicInfo.id && p.basicInfo.side === owner.basicInfo.side && isActive(p) && isAdjacent(p, target));
}
```

у `evaluateCondition` перед `case "not":`:

```ts
    case "attackRollMode":
      return eventRollModeOf(ctx.event) === c.mode;
    case "allyAdjacent":
      return allyNextToTarget(ctx);
```

- [ ] **Step 6: Editor default** — `components/abilities/ConditionEditor.tsx`, `defaultFor`: додати `case "allyAdjacent":` до групи `case "targetDead": case "actorIsEnemy": return { type };` і окремо

```ts
    case "attackRollMode":
      return { type, mode: "advantage" };
```

- [ ] **Step 7: Run tests to verify they pass**

Run: `pnpm test:run lib/utils/abilities lib/utils/battle/attack lib/utils/battle/attack-phase components/abilities`
Expected: PASS.

- [ ] **Step 8: Type check** — `pnpm exec tsc --noEmit -p tsconfig.json` → 0 errors.

- [ ] **Step 9: Commit**

```bash
git add types/abilities.ts lib/utils/battle/attack/roll.ts lib/utils/battle/attack/process/hit.ts lib/utils/battle/attack/process/run.ts lib/utils/abilities/schema/conditions.ts lib/utils/abilities/registry/conditions.ts components/abilities/ConditionEditor.tsx lib/utils/abilities/__tests__/sneak-attack-conditions.test.ts
git commit -m "feat(constructor): 4f-2 attack roll mode in hit events, attackRollMode and allyAdjacent conditions

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 10: Прапорець `evasion`

**Files:**
- Modify: `lib/utils/abilities/schema/effects.ts` (`FlagSchema`), `lib/utils/abilities/registry/effects/flags.ts:228`, `lib/utils/battle/spell/cast/outcome.ts:113-141`, `lib/utils/battle/maneuvers/fire-burst.ts:32-45`
- Create: `lib/utils/battle/saves/evasion.ts`
- Test: `lib/utils/battle/spell/__tests__/evasion.test.ts`

**Interfaces:**
- Produces: прапорець `{ kind: "flag", flag: "evasion" }`; `hasEvasion(participants: BattleParticipant[], target: BattleParticipant): boolean` (не діє на `incapacitated`); `evasionFactor(success: boolean, evasive: boolean): number` (без ухилення — `success ? 0.5 : 1`).

- [ ] **Step 1: Write the failing test** — `lib/utils/battle/spell/__tests__/evasion.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { ParticipantSide } from "@/lib/constants/battle";
import { makeEffect, makeParticipant, seq } from "@/lib/utils/abilities/__tests__/fixtures";
import type { Effect } from "@/lib/utils/abilities/schema";
import { grantPassive } from "@/lib/utils/battle/__tests__/fixtures/mock-participant";
import { evasionFactor, hasEvasion } from "@/lib/utils/battle/saves/evasion";
import { castSpell } from "@/lib/utils/battle/spell";
import type { CastableSpell } from "@/lib/utils/battle/types/spell-process";
import type { SpellDefinition } from "@/lib/utils/spells/model/schema";
import type { BattleParticipant } from "@/types/battle";

const fire: Effect = { kind: "dealDamage", amount: { spellRoll: 100 }, damageType: "fire" };

const spellOf = (over: Partial<SpellDefinition> = {}): CastableSpell => ({
  id: "sp",
  name: "Fireball",
  level: 1,
  groupId: "evo",
  definition: { dice: 2, cost: "action", targeting: { kind: "enemy" }, resolution: { kind: "save", ability: "dexterity", onSuccess: "half" }, effects: [fire], raceModifiers: [], ...over },
});

const caster = () => {
  const p = makeParticipant({ id: "c" });

  return { ...p, spellcasting: { ...p.spellcasting, spellSlots: { "1": { max: 2, current: 2 } } } };
};

const rogue = (incapacitated = false): BattleParticipant => {
  const p = grantPassive(makeParticipant({ id: "e", side: ParticipantSide.ENEMY, hp: 200, maxHp: 200 }), [{ kind: "flag", flag: "evasion" }], "Evasion");

  return incapacitated ? { ...p, battleData: { ...p.battleData, activeEffects: [makeEffect("stun", { effects: [{ type: "incapacitated", value: 1 }] as never })] } } : p;
};

const hpAfter = (target: BattleParticipant, roll: number, spell = spellOf()) => {
  const c = caster();

  const r = castSpell({ caster: c, spell, targetIds: ["e"], allParticipants: [c, target], currentRound: 1, battleId: "b", diceRolls: [3, 3], saveRolls: [{ participantId: "e", roll }], rng: seq(0.5) });

  return r.allParticipantsUpdated.find((p) => p.basicInfo.id === "e")?.combatStats.currentHp;
};

describe("evasion", () => {
  it("success → no damage, failure → half", () => {
    expect(hpAfter(rogue(), 20)).toBe(200);
    expect(hpAfter(rogue(), 1)).toBe(197);
  });

  it("incapacitated loses evasion", () => {
    expect(hpAfter(rogue(true), 20)).toBe(197);
    expect(hasEvasion([rogue(true)], rogue(true))).toBe(false);
  });

  it("only Dexterity saves with half on success", () => {
    expect(hpAfter(rogue(), 1, spellOf({ resolution: { kind: "save", ability: "constitution", onSuccess: "half" } }))).toBe(194);
    expect(hpAfter(rogue(), 1, spellOf({ resolution: { kind: "save", ability: "dexterity", onSuccess: "none" } }))).toBe(194);
  });

  it("evasionFactor keeps the old factors without evasion", () => {
    expect([evasionFactor(true, false), evasionFactor(false, false), evasionFactor(true, true), evasionFactor(false, true)]).toEqual([0.5, 1, 0, 0.5]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test:run lib/utils/battle/spell/__tests__/evasion.test.ts`
Expected: FAIL — модуля `saves/evasion` немає; прапорець `evasion` невідомий.

- [ ] **Step 3: Flag** — `lib/utils/abilities/schema/effects.ts`, у `FlagSchema` після `twoWeaponFighting`: `z.object({ ...flagBase, flag: z.literal("evasion") }),`. `lib/utils/abilities/registry/effects/flags.ts` після `twoWeaponFighting`: `evasion: plain("Ухилення (Evasion)", "рятівний кидок Спритності з половиною шкоди: успіх — 0, провал — половина"),`.

- [ ] **Step 4: `lib/utils/battle/saves/evasion.ts`**

```ts
import { findFlags } from "@/lib/utils/abilities/engine/core/collect-modifiers";
import { withSelf } from "@/lib/utils/abilities/engine/core/participants";
import { hasCondition } from "@/lib/utils/battle/conditions/query";
import type { BattleParticipant } from "@/types/battle";

export function hasEvasion(participants: BattleParticipant[], target: BattleParticipant): boolean {
  return !hasCondition(target, "incapacitated") && findFlags(withSelf(participants, target), target.basicInfo.id, "evasion").length > 0;
}

export function evasionFactor(success: boolean, evasive: boolean): number {
  if (evasive) return success ? 0 : 0.5;

  return success ? 0.5 : 1;
}
```

- [ ] **Step 5: Spell outcome** — `lib/utils/battle/spell/cast/outcome.ts`: імпорт `import { evasionFactor, hasEvasion } from "@/lib/utils/battle/saves/evasion";`; рядок `if (success) factor = onSuccess === "half" ? 0.5 : 0;` замінити на

```ts
    const evasive = saveAbility === "dexterity" && onSuccess === "half" && hasEvasion(flow.ps, target);

    if (evasive) factor = evasionFactor(success, true);
    else if (success) factor = onSuccess === "half" ? 0.5 : 0;
```

і в повідомленні кидка після `${r.success ? (factor > 0 ? "успіх, половина шкоди" : "успіх") : "провал"}` додати `${evasive ? " · ухилення" : ""}` (усередині того самого шаблонного рядка).

- [ ] **Step 6: Fire Burst** — `lib/utils/battle/maneuvers/fire-burst.ts`: імпорт `evasionFactor, hasEvasion`; у `targets.map`:

```ts
    const evasive = hasEvasion(ps, t);

    notes.set(t.basicInfo.id, ` (Спритність ${rolled.total} проти СК ${dc}${evasive ? (result.success ? " — ухилення" : " — ухилення, половина") : result.success ? " — половина" : ""})`);

    return { targetId: t.basicInfo.id, amount: Math.floor(full * evasionFactor(result.success, evasive)) };
```

(без ухилення — та сама шкода й текст, що й раніше).

- [ ] **Step 7: Run tests to verify they pass**

Run: `pnpm test:run lib/utils/battle/spell lib/utils/battle/maneuvers lib/utils/abilities`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add lib/utils/abilities/schema/effects.ts lib/utils/abilities/registry/effects/flags.ts lib/utils/battle/saves/evasion.ts lib/utils/battle/spell/cast/outcome.ts lib/utils/battle/maneuvers/fire-burst.ts lib/utils/battle/spell/__tests__/evasion.test.ts
git commit -m "feat(constructor): 4f-2 evasion flag for Dexterity half-damage saves

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 11: UI — вкладка «Таблиця класу» й режим «З таблиці класу» в редакторі вмінь

**Files:**
- Create: `components/classes/ClassColumnsEditor.tsx`, `components/abilities/fields/ScaleColumnSelect.tsx`
- Modify: `components/classes/ClassForm.tsx`, `components/classes/ClassFeaturesEditor.tsx`, `components/classes/SubclassesEditor.tsx:67`, `components/abilities/fields/FlatField.tsx`, `components/abilities/fields/AmountField.tsx`, `components/abilities/sections/LimitsSection.tsx`
- Test: `components/classes/__tests__/ClassColumnsEditor.test.tsx`, `components/abilities/__tests__/class-scale-fields.test.tsx`

**Interfaces:**
- Consumes: `parseColumnValuesText` (задача 5); `AbilityEditorContextValue.classColumns`, `AbilityListEditor` prop `classColumns` (задача 6); `FORMULA_VARIABLES` (задача 4).
- Produces: `ClassColumnsEditor({ value: ClassColumn[]; onChange: (next: ClassColumn[]) => void })`; `ScaleColumnSelect({ id; value: string | undefined; onChange: (key: string) => void; poolsOnly?: boolean })` — нативний `<select aria-label="Колонка таблиці класу">`; `ClassFeaturesEditor` prop `classColumns?: readonly ClassColumn[]`.

- [ ] **Step 1: Write the failing tests**

`components/classes/__tests__/ClassColumnsEditor.test.tsx`:

```tsx
// @vitest-environment happy-dom
import { useState } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { ClassColumnsEditor } from "@/components/classes/ClassColumnsEditor";
import type { ClassColumn } from "@/types/classes";

function Harness({ initial = [] }: { initial?: ClassColumn[] }) {
  const [v, setV] = useState<ClassColumn[]>(initial);

  return (
    <>
      <ClassColumnsEditor value={v} onChange={setV} />
      <output data-testid="v">{JSON.stringify(v)}</output>
    </>
  );
}

const out = () => JSON.parse(screen.getByTestId("v").textContent ?? "[]") as ClassColumn[];

describe("ClassColumnsEditor", () => {
  afterEach(cleanup);

  it("adds a column with 20 empty cells", () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole("button", { name: "Додати колонку" }));

    expect(out()).toEqual([{ key: "column-1", label: "Колонка 1", values: Array(20).fill("") }]);
  });

  it("edits key, label, values (comma list) and the pool switch", () => {
    render(<Harness initial={[{ key: "column-1", label: "Колонка 1", values: Array(20).fill("") }]} />);

    fireEvent.change(screen.getByLabelText("Ключ колонки 1"), { target: { value: "focus-points" } });
    fireEvent.change(screen.getByLabelText("Назва колонки 1"), { target: { value: "Focus Points" } });
    fireEvent.change(screen.getByLabelText("Значення колонки 1"), { target: { value: ", 2, 3" } });
    fireEvent.click(screen.getByRole("checkbox", { name: "Пул колонки 1" }));

    expect(out()[0]).toEqual({ key: "focus-points", label: "Focus Points", values: ["", "2", "3", ...Array(17).fill("")], pool: { rest: "long" } });

    fireEvent.change(screen.getByLabelText("Відпочинок колонки 1"), { target: { value: "short" } });

    expect(out()[0].pool).toEqual({ rest: "short" });

    fireEvent.click(screen.getByRole("checkbox", { name: "Пул колонки 1" }));

    expect(out()[0]).not.toHaveProperty("pool");
  });

  it("removes a column", () => {
    render(<Harness initial={[{ key: "a", label: "A", values: Array(20).fill("") }]} />);
    fireEvent.click(screen.getByRole("button", { name: "Видалити колонку 1" }));

    expect(out()).toEqual([]);
  });
});
```

`components/abilities/__tests__/class-scale-fields.test.tsx`:

```tsx
// @vitest-environment happy-dom
import { useState } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { AbilityEditorProvider } from "@/components/abilities/editor-context";
import { AmountField } from "@/components/abilities/fields/AmountField";
import { FlatField } from "@/components/abilities/fields/FlatField";
import type { FieldMeta } from "@/lib/utils/abilities/registry/fields";
import type { ClassColumn } from "@/types/classes";

const values = Array(20).fill("2");

const columns: ClassColumn[] = [
  { key: "rages", label: "Rages", values },
  { key: "rage-damage", label: "Rage Damage", values },
];

const meta = { name: "flat", label: "Значення", input: "flat" } as FieldMeta;

function Harness({ kind, initial, withColumns = true }: { kind: "flat" | "amount"; initial: unknown; withColumns?: boolean }) {
  const [v, setV] = useState<unknown>(initial);

  const Field = kind === "flat" ? FlatField : AmountField;

  return (
    <AbilityEditorProvider value={{ campaignId: "c", errorsByPath: {}, ...(withColumns && { classColumns: columns }) }}>
      <Field id="f" meta={meta} value={v as never} onChange={(x: unknown) => setV(x)} />
      <output data-testid="v">{JSON.stringify(v ?? null)}</output>
    </AbilityEditorProvider>
  );
}

describe.each(["flat", "amount"] as const)("%s: class table mode", (kind) => {
  afterEach(cleanup);

  it("shows the column picker for a scale value and switches the column", () => {
    render(<Harness kind={kind} initial={{ scale: "rages" }} />);

    const select = screen.getByLabelText("Колонка таблиці класу") as HTMLSelectElement;

    expect(select.value).toBe("rages");

    fireEvent.change(select, { target: { value: "rage-damage" } });

    expect(screen.getByTestId("v").textContent).toBe('{"scale":"rage-damage"}');
  });

  it("outside a class form a scale value is shown read-only with a hint", () => {
    render(<Harness kind={kind} initial={{ scale: "rages" }} withColumns={false} />);

    expect(screen.queryByLabelText("Колонка таблиці класу")).toBeNull();
    expect(screen.getByText("Посилання на таблицю класу — лише у вміннях класу")).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm test:run components/classes/__tests__/ClassColumnsEditor.test.tsx components/abilities/__tests__/class-scale-fields.test.tsx`
Expected: FAIL — компонентів немає, режиму «таблиця» немає.

- [ ] **Step 3: `components/abilities/fields/ScaleColumnSelect.tsx`**

```tsx
"use client";

import { useAbilityEditor } from "@/components/abilities/editor-context";

const SELECT_CLASS = "h-9 w-full rounded-md border border-hud-line bg-hud-field px-2 text-sm text-hud-ink";

export function ScaleColumnSelect({ id, value, onChange, poolsOnly = false }: { id: string; value: string | undefined; onChange: (key: string) => void; poolsOnly?: boolean }) {
  const columns = (useAbilityEditor().classColumns ?? []).filter((c) => !poolsOnly || c.pool);

  return (
    <select id={id} aria-label="Колонка таблиці класу" className={SELECT_CLASS} value={value ?? ""} onChange={(e) => onChange(e.target.value)}>
      <option value="" disabled>
        —
      </option>
      {columns.map((c) => (
        <option key={c.key} value={c.key}>
          {c.label} ({c.key})
        </option>
      ))}
    </select>
  );
}
```

- [ ] **Step 4: `FlatField.tsx`** — повністю:

```tsx
"use client";

import { useState } from "react";

import type { FieldProps } from "./FieldRenderer";
import { ScaleColumnSelect } from "./ScaleColumnSelect";

import { useAbilityEditor } from "@/components/abilities/editor-context";
import { Input } from "@/components/ui/input";
import { SelectField } from "@/components/ui/select-field";
import { FORMULA_VARIABLES } from "@/lib/utils/abilities/engine/core/amount";
import { CLASS_REF_OUTSIDE } from "@/lib/utils/abilities/class-columns";
import type { Flat } from "@/lib/utils/abilities/schema";

type Mode = "number" | "formula" | "scale";

const modeOf = (v: Flat | undefined): Mode => (typeof v === "object" && v !== null ? ("formula" in v ? "formula" : "scale") : "number");

export function FlatField({ id, value, onChange }: FieldProps<Flat | undefined>) {
  const columns = useAbilityEditor().classColumns;

  const mode = modeOf(value);

  const [draft, setDraft] = useState<string | null>(null);

  const modes = [
    { value: "number", label: "число" },
    { value: "formula", label: "формула" },
    ...(columns ? [{ value: "scale", label: "з таблиці класу" }] : []),
  ];

  const text = draft ?? (value === undefined ? "" : typeof value === "object" ? ("formula" in value ? value.formula : value.scale) : String(value));

  const emit = (m: Mode, t: string) => {
    if (m === "scale") return onChange({ scale: columns?.[0]?.key ?? "" });

    if (t.trim() === "") return onChange(undefined);

    if (m === "formula") return onChange({ formula: t });

    const n = Number(t);

    // keep partial input like "-" on screen; emit only once it is a real number
    if (Number.isFinite(n)) onChange(n);
  };

  if (mode === "scale" && !columns) {
    return (
      <p className="text-xs text-muted-foreground">
        <span>{CLASS_REF_OUTSIDE}</span> <code>[{text}]</code>
      </p>
    );
  }

  return (
    <div className="space-y-1">
      <div className="flex gap-1">
        <div className="w-32 shrink-0">
          <SelectField value={mode} options={modes} onValueChange={(m) => {
              setDraft(null);
              emit(m as Mode, text);
            }} />
        </div>
        {mode === "scale" ? (
          <ScaleColumnSelect id={id} value={text} onChange={(key) => onChange({ scale: key })} />
        ) : (
          <Input
            id={id}
            value={text}
            onChange={(e) => {
              setDraft(e.target.value);
              emit(mode, e.target.value);
            }}
            onBlur={() => setDraft(null)}
          />
        )}
      </div>
      {mode === "formula" && <p className="text-xs text-muted-foreground">Змінні: {FORMULA_VARIABLES.join(", ")}</p>}
    </div>
  );
}
```

- [ ] **Step 5: `AmountField.tsx`** — повністю:

```tsx
"use client";

import { useState } from "react";

import type { FieldProps } from "./FieldRenderer";
import { ScaleColumnSelect } from "./ScaleColumnSelect";

import { useAbilityEditor } from "@/components/abilities/editor-context";
import { Input } from "@/components/ui/input";
import { SelectField } from "@/components/ui/select-field";
import { FORMULA_VARIABLES } from "@/lib/utils/abilities/engine/core/amount";
import { CLASS_REF_OUTSIDE } from "@/lib/utils/abilities/class-columns";
import type { Amount } from "@/lib/utils/abilities/schema";
import { DICE_RE } from "@/lib/utils/abilities/schema/kinds";

type Mode = "number" | "dice" | "formula" | "scale" | "spellRoll" | "eventDamage" | "maxHp" | "ownerAttack";

const BASE_MODES = [
  { value: "number", label: "число" },
  { value: "dice", label: "кубики" },
  { value: "formula", label: "формула" },
  { value: "spellRoll", label: "% кидка заклинання" },
  { value: "eventDamage", label: "% від шкоди" },
  { value: "maxHp", label: "% від макс. HP" },
  { value: "ownerAttack", label: "% шкоди моєї атаки" },
];

function modeOf(v: Amount | undefined): Mode {
  if (typeof v === "string") return "dice";

  if (v && typeof v === "object") return "formula" in v ? "formula" : "scale" in v ? "scale" : "spellRoll" in v ? "spellRoll" : v.percentOf;

  return "number";
}

function textOf(v: Amount | undefined): string {
  if (v === undefined) return "";

  if (typeof v === "number" || typeof v === "string") return String(v);

  if ("formula" in v) return v.formula;

  if ("scale" in v) return v.scale;

  if ("spellRoll" in v) return typeof v.spellRoll === "number" ? String(v.spellRoll) : v.spellRoll.formula;

  return String(v.value);
}

/** `null` means "not a number yet" (e.g. a lone "-") — keep the previous value. */
function build(mode: Mode, text: string, firstColumn: string): Amount | undefined | null {
  if (mode === "scale") return { scale: firstColumn };

  if (text.trim() === "") return undefined;

  switch (mode) {
    case "number":
      return Number.isFinite(Number(text)) ? Number(text) : null;
    case "dice":
      return DICE_RE.test(text.trim()) ? text.trim() : text;
    case "formula":
      return { formula: text };
    case "spellRoll":
      if (!Number.isFinite(Number(text))) return { spellRoll: { formula: text } };

      return Number(text) > 0 ? { spellRoll: Number(text) } : null;
    default:
      return Number.isFinite(Number(text)) ? { percentOf: mode, value: Number(text) } : null;
  }
}

export function AmountField({ id, value, onChange }: FieldProps<Amount | undefined>) {
  const columns = useAbilityEditor().classColumns;

  const mode = modeOf(value);

  const [draft, setDraft] = useState<string | null>(null);

  const modes = columns ? [...BASE_MODES.slice(0, 3), { value: "scale", label: "з таблиці класу" }, ...BASE_MODES.slice(3)] : BASE_MODES;

  const emit = (next: Amount | undefined | null) => {
    if (next !== null) onChange(next);
  };

  if (mode === "scale" && !columns) {
    return (
      <p className="text-xs text-muted-foreground">
        <span>{CLASS_REF_OUTSIDE}</span> <code>[{textOf(value)}]</code>
      </p>
    );
  }

  return (
    <div className="space-y-1">
      <div className="flex gap-1">
        <div className="w-32 shrink-0">
          <SelectField value={mode} options={modes} onValueChange={(m) => {
              setDraft(null);
              emit(build(m as Mode, textOf(value), columns?.[0]?.key ?? ""));
            }} />
        </div>
        {mode === "scale" ? (
          <ScaleColumnSelect id={id} value={textOf(value)} onChange={(key) => onChange({ scale: key })} />
        ) : (
          <Input
            id={id}
            value={draft ?? textOf(value)}
            onChange={(e) => {
              setDraft(e.target.value);
              emit(build(mode, e.target.value, columns?.[0]?.key ?? ""));
            }}
            onBlur={() => setDraft(null)}
          />
        )}
      </div>
      {mode === "formula" && <p className="text-xs text-muted-foreground">Змінні: {FORMULA_VARIABLES.join(", ")}</p>}
    </div>
  );
}
```

- [ ] **Step 6: Limits** — `components/abilities/sections/LimitsSection.tsx`: імпорти `import { useAbilityEditor } from "../editor-context";`, `import { ScaleColumnSelect } from "../fields/ScaleColumnSelect";`, `import { FlatField } from "../fields/FlatField";`; у тілі після `if (ability.trigger.event === "passive") {…}`:

```tsx
  const columns = useAbilityEditor().classColumns;
```

(хук — до раннього `return` для пасивки: перенести виклик `useAbilityEditor()` першим рядком функції, щоб порядок хуків не залежав від тригера). Поле «Разів» відпочинку замінити: коли `columns` є — `FlatField` (число / формула / з таблиці) із тим самим `setRest({ uses })`; інакше — наявний `FieldRenderer` number. Обгортка для `FlatField`:

```tsx
        {columns ? (
          <div className="col-span-3 space-y-1">
            <span className="text-xs text-muted-foreground">Разів за відпочинок</span>
            <FlatField id={`${path}.limits.perRest.uses`} meta={{ name: "perRestUses", label: "Разів", input: "flat", optional: true }} value={ability.limits?.perRest?.uses as never} onChange={(v) => setRest({ uses: v as never })} />
          </div>
        ) : (
          <FieldRenderer meta={{ name: "perRestUses", label: "Разів", input: "number", optional: true }} path={`${path}.limits.perRest.uses`} value={ability.limits?.perRest?.uses} onChange={(v) => setRest({ uses: v as number | undefined })} />
        )}
```

(тип `setRest` розширити: `patch: { rest?: string; uses?: NonNullable<Limits["perRest"]>["uses"] }`). Після блоку відпочинку, коли `columns` є і `isButton`, — пул:

```tsx
        {columns && isButton && (
          <div className="col-span-3 space-y-1">
            <span className="text-xs text-muted-foreground">Пул (колонка, ціна)</span>
            <div className="flex gap-1">
              <ScaleColumnSelect id={`${path}.limits.pool.key`} poolsOnly value={ability.limits?.pool?.key} onChange={(key) => set("pool", { key, cost: ability.limits?.pool?.cost ?? 1 })} />
              <input aria-label="Ціна пулу" type="number" min={1} max={20} className="h-9 w-16 rounded-md border border-hud-line bg-hud-field px-2 text-sm" value={ability.limits?.pool?.cost ?? ""} onChange={(e) => set("pool", e.target.value === "" ? undefined : { key: ability.limits?.pool?.key ?? "", cost: Number(e.target.value) })} />
            </div>
          </div>
        )}
```

- [ ] **Step 7: `components/classes/ClassColumnsEditor.tsx`**

```tsx
"use client";

import { Plus, Trash2 } from "lucide-react";

import { HudSection } from "@/components/hud/form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MAX_CLASS_COLUMNS, MAX_CLASS_LEVEL } from "@/lib/constants/classes";
import { parseColumnValuesText } from "@/lib/utils/characters/classes/columns";
import type { ClassColumn } from "@/types/classes";

const SELECT_CLASS = "h-9 rounded-md border border-hud-line bg-hud-field px-2 text-sm text-hud-ink";

export function ClassColumnsEditor({ value, onChange }: { value: ClassColumn[]; onChange: (next: ClassColumn[]) => void }) {
  const patch = (i: number, next: Partial<ClassColumn>) => onChange(value.map((c, j) => (j === i ? { ...c, ...next } : c)));

  const setPool = (i: number, on: boolean) =>
    onChange(value.map((c, j) => {
      if (j !== i) return c;

      const { pool: _drop, ...rest } = c;

      return on ? { ...rest, pool: { rest: "long" as const } } : rest;
    }));

  const add = () => {
    const n = value.length + 1;

    onChange([...value, { key: `column-${n}`, label: `Колонка ${n}`, values: Array(MAX_CLASS_LEVEL).fill("") }]);
  };

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">20 значень через кому (рівні 1–20): «2», «+2», «1d6», «D8», «+10 ft.»; порожньо — немає. Колонка-пул — максимум очок, спільних для вмінь класу.</p>
      {value.map((c, i) => (
        <HudSection
          key={i}
          title={c.label || c.key}
          action={
            <Button type="button" variant="ghost" size="sm" aria-label={`Видалити колонку ${i + 1}`} onClick={() => onChange(value.filter((_, j) => j !== i))}>
              <Trash2 className="h-4 w-4" />
            </Button>
          }
        >
          <div className="grid gap-2 sm:grid-cols-2">
            <Input aria-label={`Ключ колонки ${i + 1}`} value={c.key} onChange={(e) => patch(i, { key: e.target.value })} placeholder="sneak-attack" />
            <Input aria-label={`Назва колонки ${i + 1}`} value={c.label} onChange={(e) => patch(i, { label: e.target.value })} placeholder="Sneak Attack" />
          </div>
          <Input aria-label={`Значення колонки ${i + 1}`} className="mt-2" value={c.values.join(", ")} onChange={(e) => patch(i, { values: parseColumnValuesText(e.target.value) })} />
          <div className="mt-2 flex flex-wrap items-center gap-3 text-sm">
            <label className="flex items-center gap-2">
              <input type="checkbox" aria-label={`Пул колонки ${i + 1}`} checked={!!c.pool} onChange={(e) => setPool(i, e.target.checked)} />
              Пул
            </label>
            {c.pool && (
              <select aria-label={`Відпочинок колонки ${i + 1}`} className={SELECT_CLASS} value={c.pool.rest} onChange={(e) => patch(i, { pool: { rest: e.target.value as "short" | "long" } })}>
                <option value="short">короткий відпочинок</option>
                <option value="long">довгий відпочинок</option>
              </select>
            )}
          </div>
        </HudSection>
      ))}
      {value.length < MAX_CLASS_COLUMNS && (
        <Button type="button" variant="outline" size="sm" onClick={add}>
          <Plus className="h-4 w-4" />
          Додати колонку
        </Button>
      )}
    </div>
  );
}
```

(Текст значень: `values.join(", ")` для порожніх клітинок дає `", 2, 3, …"` — `parseColumnValuesText` повертає їх назад без втрат.)

- [ ] **Step 8: Class form wiring** — `components/classes/ClassForm.tsx`: `type ClassFormTabId = "basics" | "table" | "features" | "subclasses";`; імпорт `ClassColumnsEditor`; після вкладки `basics`:

```tsx
    { id: "table", label: "Таблиця класу", content: <ClassColumnsEditor value={data.columns ?? []} onChange={(columns) => set((prev) => ({ ...prev, columns }))} /> },
```

і в `ClassFeaturesEditor` (вкладка `features`) — prop `classColumns={data.columns ?? []}`. `components/classes/ClassFeaturesEditor.tsx`: у `ClassFeaturesEditorProps` — `classColumns?: readonly ClassColumn[];` (імпорт типу), деструктуризація й передача `classColumns={classColumns}` в `AbilityListEditor`. `components/classes/SubclassesEditor.tsx:67` — у виклик `ClassFeaturesEditor` додати `classColumns={form.data.columns ?? []}` (назва змінної форми — як у файлі; там `form` = `editor.form`).

- [ ] **Step 9: Run tests to verify they pass**

Run: `pnpm test:run components/classes components/abilities`
Expected: PASS (зокрема наявний `numeric-fields.test.tsx` — без провайдера `classColumns` поля поводяться як раніше).

- [ ] **Step 10: Type check + lint на змінених файлах** — `pnpm exec tsc --noEmit -p tsconfig.json` → 0 errors; `pnpm exec eslint components/classes components/abilities` → 0 errors.

- [ ] **Step 11: Commit**

```bash
git add components/classes components/abilities
git commit -m "feat(constructor): 4f-2 class table tab and class-table mode in the ability editor

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 12: UI — блок «Броня», таблиця класу на листі, КЗ у формі, пули в бою

**Files:**
- Create: `components/artifacts/ArtifactArmorFields.tsx`
- Modify: `components/artifacts/artifact-form-tabs.ts`, `components/artifacts/ArtifactForm.tsx`, `components/artifacts/ArtifactEditForm.tsx:56`, `lib/utils/artifacts/artifact-form.ts`, `lib/hooks/artifacts/useArtifactForm.ts:15,24`, `types/artifacts.ts:35-46`, `app/campaigns/[id]/dm/artifacts/[artifactId]/page.tsx`, `types/characters.ts` (`CharacterSheet`), `lib/utils/characters/classes/columns.ts`, `lib/utils/characters/sheet/build-sheet.ts`, `components/character-profile/ProfileHero.tsx`, `components/characters/stats/CharacterCombatParams.tsx`, `components/character-profile/ProfileEditor.tsx:95`, `components/characters/NewCharacterForm.tsx:62`, `components/battle/participants/MyHeroPanel.tsx`, `components/battle/wizards/BonusActionPicker.tsx`
- Test: `components/artifacts/__tests__/ArtifactArmorFields.test.tsx`, `lib/utils/artifacts/__tests__/artifact-form-armor.test.ts`, `lib/utils/characters/classes/__tests__/class-table-lines.test.ts`, `components/characters/stats/__tests__/CharacterCombatParams.test.tsx`

**Interfaces:**
- Consumes: `ArmorStats`, `armorStatsFromRow`, `armorDexCap`, `ARMOR_CATEGORIES` (задача 1); `classTableText` (задача 5); `poolViews`, `AbilityOption.pool` (задача 8).
- Produces: `ArtifactArmorFields({ value: ArmorStats | null; onChange: (next: ArmorStats | null) => void })`; `ARTIFACT_FORM_TAB.armor = "armor"`; `ArtifactFormState.armor?: ArmorStats | null`; `ArtifactFormSubmitPayload.armor?: ArmorStats`; `ArtifactData.armor?: ArmorStats | null`; `classTableLines(entries: readonly ResolvedClassEntry[]): string[]`; `CharacterSheet.classTable?: string[]`; `CharacterCombatParams` prop `classArmor?: SheetTotal | null` (`undefined` — звичайне поле; `null` — «рахується автоматично»; `SheetTotal` — значення й розклад).

- [ ] **Step 1: Write the failing tests**

`components/artifacts/__tests__/ArtifactArmorFields.test.tsx`:

```tsx
// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ArtifactArmorFields } from "@/components/artifacts/ArtifactArmorFields";

describe("ArtifactArmorFields", () => {
  afterEach(cleanup);

  it("no model yet: a button creates light armor 11", () => {
    const onChange = vi.fn();

    render(<ArtifactArmorFields value={null} onChange={onChange} />);
    fireEvent.click(screen.getByRole("button", { name: "Додати модель броні" }));

    expect(onChange).toHaveBeenCalledWith({ category: "light", base: 11 });
  });

  it("edits category, base, strength and stealth; dex cap placeholder follows the category", () => {
    const onChange = vi.fn();

    render(<ArtifactArmorFields value={{ category: "medium", base: 14 }} onChange={onChange} />);

    expect((screen.getByLabelText("Межа Спритності") as HTMLInputElement).placeholder).toBe("2");

    fireEvent.change(screen.getByLabelText("Категорія броні"), { target: { value: "heavy" } });
    expect(onChange).toHaveBeenLastCalledWith({ category: "heavy", base: 14 });

    fireEvent.change(screen.getByLabelText("База КЗ"), { target: { value: "16" } });
    expect(onChange).toHaveBeenLastCalledWith({ category: "medium", base: 16 });

    fireEvent.change(screen.getByLabelText("Вимога Сили"), { target: { value: "13" } });
    expect(onChange).toHaveBeenLastCalledWith({ category: "medium", base: 14, strength: 13 });

    fireEvent.click(screen.getByRole("checkbox", { name: "Перешкода на Скритність" }));
    expect(onChange).toHaveBeenLastCalledWith({ category: "medium", base: 14, stealthDisadvantage: true });
  });

  it("removing the model", () => {
    const onChange = vi.fn();

    render(<ArtifactArmorFields value={{ category: "light", base: 11 }} onChange={onChange} />);
    fireEvent.click(screen.getByRole("button", { name: "Прибрати модель броні" }));

    expect(onChange).toHaveBeenCalledWith(null);
  });
});
```

`lib/utils/artifacts/__tests__/artifact-form-armor.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { buildArtifactPayload } from "@/lib/utils/artifacts/artifact-form";

const base = { name: "Chain Mail", description: "", rarity: "common", slot: "armor", icon: "", setId: null, abilities: [], weapon: {} };

describe("artifact payload armor", () => {
  it("sends armor only for the armor slot with a model", () => {
    expect(buildArtifactPayload({ ...base, armor: { category: "heavy", base: 16 } }, "create").armor).toEqual({ category: "heavy", base: 16 });
    expect(buildArtifactPayload({ ...base, slot: "ring", armor: { category: "heavy", base: 16 } }, "create")).not.toHaveProperty("armor");
    expect(buildArtifactPayload({ ...base, armor: null }, "create")).not.toHaveProperty("armor");
    expect(buildArtifactPayload(base, "create")).not.toHaveProperty("armor");
  });
});
```

`lib/utils/characters/classes/__tests__/class-table-lines.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { classTableLines } from "@/lib/utils/characters/classes/columns";
import type { GameClassData, ResolvedClassEntry } from "@/types/classes";

const barbarian = { id: "b", name: "Barbarian", columns: [{ key: "rages", label: "Rages", values: Array.from({ length: 20 }, (_, i) => (i >= 2 ? "3" : "2")) }] } as unknown as GameClassData;

describe("classTableLines", () => {
  it("one line per resolved class; unknown classes skipped", () => {
    const entries: ResolvedClassEntry[] = [
      { classId: "b", level: 5, class: barbarian, subclass: null },
      { classId: "x", level: 2, class: null, subclass: null },
    ];

    expect(classTableLines(entries)).toEqual(["Barbarian 5 · Rages 3"]);
  });
});
```

`components/characters/stats/__tests__/CharacterCombatParams.test.tsx`:

```tsx
// @vitest-environment happy-dom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/hooks/campaigns", () => ({ useCampaignRules: () => ({ data: undefined }) }));

import { CharacterCombatParams } from "@/components/characters/stats/CharacterCombatParams";

const combatStats = { data: { armorClass: 12, initiative: 10, speed: 30, minTargets: 1, maxTargets: 1, morale: 0 }, set: vi.fn() } as never;

describe("CharacterCombatParams AC in class mode", () => {
  afterEach(cleanup);

  it("plain input outside class mode", () => {
    render(<CharacterCombatParams campaignId="c" combatStats={combatStats} />);

    expect((screen.getByLabelText("Клас Броні (AC)") as HTMLInputElement).value).toBe("12");
  });

  it("read-only value and breakdown in class mode", () => {
    render(<CharacterCombatParams campaignId="c" combatStats={combatStats} classArmor={{ total: 16, lines: [{ label: "Chain Mail", value: "16", source: "artifact" }] }} />);

    expect(screen.queryByLabelText("Клас Броні (AC)")).toBeNull();
    expect(screen.getByText("16")).toBeTruthy();
    expect(screen.getByText("Chain Mail 16")).toBeTruthy();
  });

  it("new class-mode hero: computed automatically", () => {
    render(<CharacterCombatParams campaignId="c" combatStats={combatStats} classArmor={null} />);

    expect(screen.getByText("КЗ рахується з броні й Спритності")).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm test:run components/artifacts/__tests__/ArtifactArmorFields.test.tsx lib/utils/artifacts/__tests__/artifact-form-armor.test.ts lib/utils/characters/classes/__tests__/class-table-lines.test.ts components/characters/stats/__tests__/CharacterCombatParams.test.tsx`
Expected: FAIL — компонентів/функцій немає.

- [ ] **Step 3: Form state** — `lib/utils/artifacts/artifact-form.ts`: імпорт `import type { ArmorStats } from "@/lib/utils/artifacts/armor-stats";` і `import { ArtifactSlot } from "@/lib/constants/artifacts";`; `ArtifactFormState` — `armor?: ArmorStats | null;`; `ArtifactFormSubmitPayload` — `armor?: ArmorStats;`; у `buildArtifactPayload` після рядка зброї — `...(s.slot === ArtifactSlot.ARMOR && s.armor && { armor: s.armor }),`. `lib/hooks/artifacts/useArtifactForm.ts`: `initial: Omit<ArtifactFormState, "weapon" | "armor"> & { weapon?: WeaponStats; armor?: ArmorStats | null };`, стан `{ ...initial, weapon: initial.weapon ?? {}, armor: initial.armor ?? null }`. `types/artifacts.ts`: `ArtifactData.armor?: ArmorStats | null;` (імпорт типу). `components/artifacts/ArtifactForm.tsx`: `ArtifactFormInitial.armor?: ArmorStats | null;`. `components/artifacts/ArtifactEditForm.tsx`: поруч із `weapon: artifact.weapon,` — `armor: artifact.armor ?? null,`. `app/campaigns/[id]/dm/artifacts/[artifactId]/page.tsx`: імпорт `armorStatsFromRow`, поле `armor: armorStatsFromRow(artifact),`.

- [ ] **Step 4: `components/artifacts/ArtifactArmorFields.tsx`**

```tsx
"use client";

import { HudSection } from "@/components/hud/form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ARMOR_CATEGORIES, type ArmorStats, armorDexCap } from "@/lib/utils/artifacts/armor-stats";

const CATEGORY_LABELS: Record<ArmorStats["category"], string> = { light: "Легка", medium: "Середня", heavy: "Важка" };

const SELECT_CLASS = "h-9 w-full rounded-md border border-hud-line bg-hud-field px-2 text-sm text-hud-ink";

const intOrUndefined = (v: string) => (v.trim() === "" || !Number.isFinite(Number(v)) ? undefined : Math.trunc(Number(v)));

export function ArtifactArmorFields({ value, onChange }: { value: ArmorStats | null; onChange: (next: ArmorStats | null) => void }) {
  if (!value) {
    return (
      <HudSection title="Броня">
        <p className="text-sm text-muted-foreground">КЗ героя з класами рахується з бази броні й Спритності.</p>
        <Button type="button" variant="outline" size="sm" className="mt-2" onClick={() => onChange({ category: "light", base: 11 })}>
          Додати модель броні
        </Button>
      </HudSection>
    );
  }

  const set = <K extends keyof ArmorStats>(key: K, v: ArmorStats[K] | undefined) => {
    const next = { ...value, [key]: v } as ArmorStats;

    if (v === undefined || v === false) delete next[key];

    onChange(next);
  };

  return (
    <HudSection title="Броня" className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor="armor-category" className="text-xs text-muted-foreground">Категорія броні</Label>
          <select id="armor-category" className={SELECT_CLASS} value={value.category} onChange={(e) => set("category", e.target.value as ArmorStats["category"])}>
            {ARMOR_CATEGORIES.map((c) => (
              <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="armor-base" className="text-xs text-muted-foreground">База КЗ</Label>
          <Input id="armor-base" type="number" min={1} max={30} value={value.base} onChange={(e) => set("base", intOrUndefined(e.target.value) ?? value.base)} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="armor-dex-cap" className="text-xs text-muted-foreground">Межа Спритності</Label>
          <Input id="armor-dex-cap" type="number" min={0} max={10} placeholder={String(armorDexCap({ ...value, dexCap: undefined }) ?? "—")} value={value.dexCap ?? ""} onChange={(e) => set("dexCap", intOrUndefined(e.target.value))} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="armor-strength" className="text-xs text-muted-foreground">Вимога Сили</Label>
          <Input id="armor-strength" type="number" min={1} max={30} value={value.strength ?? ""} onChange={(e) => set("strength", intOrUndefined(e.target.value))} />
        </div>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" aria-label="Перешкода на Скритність" checked={!!value.stealthDisadvantage} onChange={(e) => set("stealthDisadvantage", e.target.checked)} />
        Перешкода на Скритність
      </label>
      <Button type="button" variant="ghost" size="sm" onClick={() => onChange(null)}>
        Прибрати модель броні
      </Button>
    </HudSection>
  );
}
```

- [ ] **Step 5: Armor tab** — `components/artifacts/artifact-form-tabs.ts`: `{ basic: "basic", weapon: "weapon", armor: "armor", abilities: "abilities" }`. `components/artifacts/ArtifactForm.tsx`: імпорти `ArtifactArmorFields`, `ArtifactSlot`, `useCampaignRules` (`@/lib/hooks/campaigns`), тип `ArmorStats`; після `const hasWeapon = …`:

```tsx
  const classesEnabled = !!useCampaignRules(campaignId).data?.classes.enabled;

  const hasArmor = classesEnabled && data.slot === ArtifactSlot.ARMOR;
```

рядки корекції вкладки: `if ((!hasWeapon && tab === ARTIFACT_FORM_TAB.weapon) || (!hasArmor && tab === ARTIFACT_FORM_TAB.armor)) setTab(ARTIFACT_FORM_TAB.basic);` і `const activeTab = (tab === ARTIFACT_FORM_TAB.weapon && !hasWeapon) || (tab === ARTIFACT_FORM_TAB.armor && !hasArmor) ? ARTIFACT_FORM_TAB.basic : tab;`; після блоку `...(hasWeapon ? [...] : [])`:

```tsx
    ...(hasArmor
      ? [{ id: ARTIFACT_FORM_TAB.armor, label: "Броня", content: <ArtifactArmorFields value={data.armor ?? null} onChange={(a) => set("armor", a)} /> }]
      : []),
```

- [ ] **Step 6: Class table on the sheet** — `lib/utils/characters/classes/columns.ts`: імпорт типу `ResolvedClassEntry`; додати

```ts
export const classTableLines = (entries: readonly ResolvedClassEntry[]): string[] =>
  entries.flatMap((e) => (e.class ? [classTableText({ name: e.class.name, level: e.level, columns: e.class.columns ?? [] })] : []));
```

`types/characters.ts`, `CharacterSheet` після `hitDice…` (або в кінці інтерфейсу): `/** рядок на клас: «Barbarian 5 · Rages 3 · Rage Damage +2» */ classTable?: string[];`. `lib/utils/characters/sheet/build-sheet.ts`: імпорт `classTableLines`; в об'єкт після `hitDice: …,` — `...(classEntries && { classTable: classTableLines(classEntries) }),`. `components/character-profile/ProfileHero.tsx` — одразу після кнопки HP (перед `{sheet.rest && <RestBadges />}`):

```tsx
              {sheet.classTable?.map((line) => (
                <p key={line} className="text-xs text-hud-muted">{line}</p>
              ))}
```

- [ ] **Step 7: AC in the character form** — `components/characters/stats/CharacterCombatParams.tsx`: імпорт `import type { SheetTotal } from "@/types/characters";`; сигнатура `{ campaignId, combatStats: { data, set }, classArmor }: { campaignId: string; combatStats: CharacterFormBindings["combatStats"]; classArmor?: SheetTotal | null }`; перший елемент сітки:

```tsx
      {classArmor === undefined ? (
        <LabeledInput id="armorClass" label="Клас Броні (AC)" labelClassName="text-xs leading-tight" type="number" min="0" value={armorClass} onChange={(e) => set("armorClass", intOr(e.target.value, 10))} containerClassName="w-full min-w-0" className="w-full" />
      ) : (
        <div className="col-span-3 space-y-1 sm:col-span-4">
          <span className="text-xs leading-tight text-hud-muted">Клас Броні (AC)</span>
          {classArmor === null ? (
            <p className="text-sm">КЗ рахується з броні й Спритності</p>
          ) : (
            <>
              <p className="text-lg font-bold">{classArmor.total}</p>
              <ul className="text-xs text-hud-muted">
                {classArmor.lines.map((l) => (
                  <li key={`${l.label}-${l.value}`}>{`${l.label} ${l.value}`}</li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}
```

`components/character-profile/ProfileEditor.tsx:95` → `<CharacterCombatParams campaignId={campaignId} combatStats={combatStats} classArmor={classesEnabled && (formData.basicInfo.classes ?? []).length > 0 ? sheet.armorClass : undefined} />`. `components/characters/NewCharacterForm.tsx:62` → `<CharacterCombatParams campaignId={id} combatStats={combatStats} classArmor={classMode.enabled && (basicInfo.data.classes ?? []).length > 0 ? null : undefined} />`.

- [ ] **Step 8: Pools in battle** — `components/battle/participants/MyHeroPanel.tsx`: імпорт `poolViews` (з `@/lib/utils/battle/view`); `const pools = poolViews(hero);`; умову рядка зарядів — `{!compact && (charges.length > 0 || pools.length > 0) && (`, і в рядок після `charges.map(...)` — `{pools.map((p) => <span key={p.key}>{p.label} {p.left}/{p.max}</span>)}`. `components/battle/wizards/BonusActionPicker.tsx`: у мапі `abilities.map(({ ability: a, cooldownLeft }) =>` додати `pool` у деструктуризацію і після `cooldownLeft`-позначки в назві — `{pool && <span className="ml-2 text-xs font-normal text-[#a89c88]">{pool.label} {pool.left}/{pool.max} · −{pool.cost}</span>}`.

- [ ] **Step 9: Run tests to verify they pass**

Run: `pnpm test:run components/artifacts components/characters components/character-profile components/battle lib/utils/artifacts lib/utils/characters`
Expected: PASS (зокрема наявні `ArtifactForm.test.tsx`, `profile-editor.test.tsx`).

- [ ] **Step 10: Type check + lint** — `pnpm exec tsc --noEmit -p tsconfig.json` → 0 errors; `pnpm exec eslint components lib/utils/artifacts lib/utils/characters "app/campaigns/[id]/dm/artifacts"` → 0 errors.

- [ ] **Step 11: Commit**

```bash
git add components/artifacts components/characters components/character-profile components/battle lib/utils/artifacts lib/hooks/artifacts types/artifacts.ts types/characters.ts lib/utils/characters "app/campaigns/[id]/dm/artifacts/[artifactId]/page.tsx"
git commit -m "feat(constructor): 4f-2 armor fields, class table and AC breakdown on the sheet, pools in battle

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---
### Task 13: Конвертер броні й фікстури 4f-2

**Files:**
- Modify: `scripts/srd/lib/open5e.ts` (`O5Armor`, `O5FeatureItem`), `scripts/srd/lib/types.ts` (`ArtifactRow`), `scripts/srd/convert/artifacts.ts`
- Create: `scripts/srd/__tests__/fixtures-4f2/*.json` (генерується), `scripts/srd/__tests__/armor-4f2.test.ts`

**Interfaces:**
- Consumes: `ArmorStats`, `ArmorCategory` (задача 1).
- Produces: `O5Armor = { name; ac_base; ac_add_dexmod: boolean; ac_cap_dexmod: number | null; strength_score_required: number | null; grants_stealth_disadvantage: boolean }`; `O5FeatureItem.column_value: string | null`; `ArtifactRow.slot` + `"armor"`, `ArtifactRow.armor?: ArmorStats`; `armorCategory(a: O5Armor): ArmorCategory`; `FIXTURE_4F2_DIR` (експорт з `scripts/srd/lib/open5e.ts`).

- [ ] **Step 1: Generate the fixtures** (мережа не потрібна — сирі файли Open5e уже в tmp, md5 перевірено):

```bash
pnpm exec tsx --tsconfig tsconfig.scripts.json scripts/srd/extract-fixture.ts \
  --source /Users/silentfox/.claude/jobs/4ad97a0b/tmp/srd --out scripts/srd/__tests__/fixtures-4f2 \
  srd-2024_barbarian srd-2024_path-of-the-berserker srd-2024_rogue srd-2024_thief srd-2024_cleric srd-2024_life-domain \
  srd-2024_paladin srd-2024_oath-of-devotion srd-2024_sorcerer srd-2024_draconic-sorcery srd-2024_druid srd-2024_circle-of-the-land \
  srd-2024_monk srd-2024_warrior-of-the-open-hand srd-2024_fighter srd-2024_champion srd-2024_bard srd-2024_college-of-lore \
  srd-2024_wizard srd-2024_evoker \
  srd-2024_chain-mail srd-2024_breastplate srd-2024_leather-armor srd-2024_plate-armor srd-2024_shield
```

Expected: 17 рядків `<File>: N`; `CharacterClass: 20`, `Armor: 5`, `Item: 5`, `Weapon: 0`, `Creature: 0`, `WeaponProperty: 17`, `Document: 1`.

- [ ] **Step 2: Write the failing test** — `scripts/srd/__tests__/armor-4f2.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { convertArtifacts } from "../convert/artifacts";
import { FIXTURE_4F2_DIR, loadOpen5e } from "../lib/open5e";

import { createArtifactSchema } from "@/lib/schemas/artifacts";

const items = convertArtifacts(loadOpen5e(FIXTURE_4F2_DIR));

const item = (name: string) => items.find((i) => i.name === name)!;

describe("convertArtifacts: armor", () => {
  it("4 armors + shield, armor slot", () => {
    expect(items.map((i) => i.name).sort()).toEqual(["Breastplate", "Chain Mail", "Leather Armor", "Plate Armor", "Shield"]);
    expect(items.filter((i) => i.slot === "armor")).toHaveLength(4);
  });

  it("Chain Mail: heavy 16, Strength 13, stealth disadvantage", () => {
    expect(item("Chain Mail")).toMatchObject({ slug: "srd-2024_chain-mail", rarity: "common", slot: "armor", armor: { category: "heavy", base: 16, strength: 13, stealthDisadvantage: true } });
    expect(item("Chain Mail").description).toBe("Heavy Armor. Armor Class: 16. Strength: 13. Stealth: Disadvantage. Cost: 75 GP. Weight: 55 lb.");
  });

  it("Breastplate: medium 14 (Dex cap 2 by category); Leather: light 11", () => {
    expect(item("Breastplate").armor).toEqual({ category: "medium", base: 14 });
    expect(item("Breastplate").description).toBe("Medium Armor. Armor Class: 14 + Dex modifier (max 2). Cost: 400 GP. Weight: 20 lb.");
    expect(item("Leather Armor").armor).toEqual({ category: "light", base: 11 });
    expect(item("Plate Armor").armor).toEqual({ category: "heavy", base: 18, strength: 15, stealthDisadvantage: true });
  });

  it("every armor row passes the artifact schema", () => {
    for (const row of items.filter((i) => i.slot === "armor")) {
      const { slug: _slug, ...body } = row;

      expect(createArtifactSchema.safeParse(body).success, row.name).toBe(true);
    }
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `pnpm test:run scripts/srd/__tests__/armor-4f2.test.ts`
Expected: FAIL — `FIXTURE_4F2_DIR` не експортується; обладунків немає.

- [ ] **Step 4: Types** — `scripts/srd/lib/open5e.ts`:

```ts
export interface O5FeatureItem { parent: string; level: number; column_value: string | null }
```

```ts
export interface O5Armor {
  name: string;
  ac_base: number;
  ac_add_dexmod: boolean;
  ac_cap_dexmod: number | null;
  strength_score_required: number | null;
  grants_stealth_disadvantage: boolean;
}
```

і після `FIXTURE_DIR` — `export const FIXTURE_4F2_DIR = path.join(process.cwd(), "scripts", "srd", "__tests__", "fixtures-4f2");`. `scripts/srd/lib/types.ts`: імпорт `import type { ArmorStats } from "@/lib/utils/artifacts/armor-stats";`; `ArtifactRow`:

```ts
export interface ArtifactRow { slug: string; name: string; description: string; rarity: "common"; slot: "weapon" | "range_weapon" | "shield" | "armor"; weapon?: WeaponStats; armor?: ArmorStats; abilities?: Ability[] }
```

- [ ] **Step 5: Converter** — `scripts/srd/convert/artifacts.ts`: імпорти `type O5Armor` (з `../lib/open5e`), `import type { ArmorCategory } from "@/lib/utils/artifacts/armor-stats";`, `import { capitalize } from "@/lib/utils/common/text";`; додати:

```ts
const SHIELD_PK = "srd-2024_shield";

// Open5e has no category: no Dex → heavy, Dex capped at 2 → medium, otherwise light
export function armorCategory(a: O5Armor): ArmorCategory {
  if (!a.ac_add_dexmod) return "heavy";

  return a.ac_cap_dexmod === 2 ? "medium" : "light";
}

const AC_TEXT: Record<ArmorCategory, (base: number) => string> = {
  light: (b) => `${b} + Dex modifier`,
  medium: (b) => `${b} + Dex modifier (max 2)`,
  heavy: (b) => String(b),
};

function convertArmor(data: Open5eData): ArtifactRow[] {
  return data.armor
    .filter((a) => a.pk !== SHIELD_PK)
    .map((a) => {
      const f = a.fields;

      const category = armorCategory(f);

      const item = data.items.find((i) => i.pk === a.pk || i.fields.armor === a.pk)?.fields;

      const description = [
        `${capitalize(category)} Armor.`,
        `Armor Class: ${AC_TEXT[category](f.ac_base)}.`,
        f.strength_score_required ? `Strength: ${f.strength_score_required}.` : null,
        f.grants_stealth_disadvantage ? "Stealth: Disadvantage." : null,
        `Cost: ${amount(item?.cost)} GP. Weight: ${amount(item?.weight)} lb.`,
      ]
        .filter(Boolean)
        .join(" ");

      return {
        slug: a.pk,
        name: f.name,
        description,
        rarity: "common" as const,
        slot: "armor" as const,
        armor: { category, base: f.ac_base, ...(f.strength_score_required && { strength: f.strength_score_required }), ...(f.grants_stealth_disadvantage && { stealthDisadvantage: true }) },
      };
    });
}
```

у `convertShield` замінити літерал `"srd-2024_shield"` на `SHIELD_PK` (обидва входження), а `convertArtifacts` — `return [...data.weapons.map((w) => convertWeapon(w, data, assignments)), ...convertArmor(data), ...convertShield(data)].sort(bySlug);`.

- [ ] **Step 6: Run tests to verify they pass**

Run: `pnpm test:run scripts/srd/__tests__/armor-4f2.test.ts scripts/srd/__tests__/artifacts.test.ts`
Expected: PASS (наявний `artifacts.test.ts` на старих фікстурах — без змін: «6 weapons + shield»).

- [ ] **Step 7: Commit**

```bash
git add scripts/srd/lib/open5e.ts scripts/srd/lib/types.ts scripts/srd/convert/artifacts.ts scripts/srd/__tests__/fixtures-4f2 scripts/srd/__tests__/armor-4f2.test.ts
git commit -m "feat(srd): 4f-2 armor converter (12 armors with category, strength, stealth) and 4f-2 fixtures

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 14: Конвертер колонок, пулів і 37 умінь класів

**Files:**
- Modify: `scripts/srd/overrides/classes.ts`, `scripts/srd/convert/classes.ts`, `scripts/srd/lib/types.ts` (`ClassRow`), `scripts/srd/lib/build-data.ts` (`assertKnown`)
- Modify (дозволена правка наявного тесту): `scripts/srd/__tests__/classes.test.ts` — лише три твердження нижче
- Test: `scripts/srd/__tests__/classes-4f2.test.ts`

**Interfaces:**
- Consumes: `FIXTURE_4F2_DIR`, `O5FeatureItem.column_value` (задача 13); `ClassColumn` (задача 5); `applyClassScale`, `classPools` (задача 7); умови `armorWorn`/`attackRollMode`/`allyAdjacent` (задачі 3, 9); прапорець `evasion` (задача 10); `createClassSchema` з перевіркою посилань (задача 6).
- Produces: `ClassRow.columns: ClassColumn[]`; `columnKey(featurePk: string, classPk: string): string`; в `overrides/classes.ts`: `type FeatureOption = AbilityCore & { name: string; slug: string }`, `CLASS_FEATURE_OVERRIDES: Record<string, AbilityCore | FeatureOption[]>`, `COLUMN_FEATURES`, `DROP_COLUMNS`, `COLUMN_LABELS`, `POOL_COLUMNS`, `EXTRA_COLUMNS`, `SINGLE_LEVEL_FEATURES`.

- [ ] **Step 1: Write the failing test** — `scripts/srd/__tests__/classes-4f2.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { columnKey, convertClasses } from "../convert/classes";
import { FIXTURE_4F2_DIR, loadOpen5e } from "../lib/open5e";

import { createClassSchema } from "@/lib/schemas/classes";
import { applyClassScale, classPools } from "@/lib/utils/abilities/class-columns";
import type { Ability } from "@/lib/utils/abilities/schema";
import type { GameClassData } from "@/types/classes";

const classes = convertClasses(loadOpen5e(FIXTURE_4F2_DIR));

const cls = (name: string) => classes.find((c) => c.name === name)!;

const all = (name: string) => [...cls(name).features, ...cls(name).subclasses.flatMap((s) => s.features)].flatMap((f) => f.abilities.map((a) => ({ level: f.level, a })));

const ability = (className: string, name: string): Ability => all(className).find((x) => x.a.name === name)!.a;

const scaled = (className: string, name: string, level: number) => applyClassScale([ability(className, name)], { classId: cls(className).slug, level, columns: cls(className).columns })[0];

describe("class columns", () => {
  it("keys from the slug tail, sorted; warlock slot columns and proficiency are not columns", () => {
    expect(cls("Barbarian").columns.map((c) => c.key)).toEqual(["rage-damage", "rages", "weapon-mastery-count"]);
    expect(cls("Rogue").columns.map((c) => c.key)).toEqual(["sneak-attack"]);
    expect(columnKey("srd-2024_rogue_sneak-attack-column-data", "srd-2024_rogue")).toBe("sneak-attack");
    expect(cls("Barbarian").columns.find((c) => c.key === "rages")?.values).toEqual(["2", "2", "3", "3", "3", "4", "4", "4", "4", "4", "4", "5", "5", "5", "5", "5", "6", "6", "6", "6"]);
  });

  it("pools, extra columns, Wild Shape and Unarmored Movement columns", () => {
    expect(cls("Monk").columns.find((c) => c.key === "focus-points")?.pool).toEqual({ rest: "short" });
    expect(cls("Monk").columns.find((c) => c.key === "unarmored-movement")).toMatchObject({ label: "Unarmored Movement", values: expect.arrayContaining(["+10 ft.", "+30 ft."]) });
    expect(cls("Sorcerer").columns.find((c) => c.key === "sorcery-points")?.pool).toEqual({ rest: "long" });
    expect(cls("Cleric").columns.find((c) => c.key === "channel-divinity-uses")?.pool).toEqual({ rest: "short" });
    expect(cls("Cleric").columns.find((c) => c.key === "divine-spark")?.values.slice(0, 8)).toEqual(["", "1d8", "1d8", "1d8", "1d8", "1d8", "2d8", "2d8"]);
    expect(cls("Paladin").columns.find((c) => c.key === "lay-on-hands")).toMatchObject({ pool: { rest: "long" }, values: expect.arrayContaining(["5", "100"]) });
    expect(cls("Fighter").columns.find((c) => c.key === "action-surge")?.values.slice(15, 18)).toEqual(["1", "2", "2"]);
    expect(cls("Druid").columns.find((c) => c.key === "wild-shape-uses")?.label).toBe("Wild Shape");
    expect(all("Druid").some((x) => x.a.name === "Cantrips Known")).toBe(false);
  });

  it("every class row passes the class schema (refs resolve)", () => {
    for (const c of classes) {
      const { slug: _slug, ...body } = c;

      const parsed = createClassSchema.safeParse(body);

      expect(parsed.success, `${c.name}: ${JSON.stringify(parsed.error?.issues.slice(0, 3))}`).toBe(true);
    }
  });
});

describe("scaled class abilities", () => {
  it("Barbarian Rage at 1/9/17: 2/4/6 uses, +2/+3/+4", () => {
    expect([1, 9, 17].map((l) => scaled("Barbarian", "Rage", l).limits?.perRest?.uses)).toEqual([2, 4, 6]);
    expect([1, 9, 17].map((l) => scaled("Barbarian", "Rage", l).effects.find((e) => e.kind === "damageBonus"))).toEqual([2, 3, 4].map((flat) => expect.objectContaining({ flat })));
    expect(ability("Barbarian", "Rage").condition).toEqual({ type: "armorWorn", categories: ["none", "light", "medium"] });
  });

  it("Sneak Attack at Rogue 5 → 3d6, once per turn, advantage or ally adjacent", () => {
    expect(scaled("Rogue", "Sneak Attack", 5).effects[0]).toMatchObject({ kind: "dealDamage", amount: "3d6", target: "eventTarget" });
    expect(ability("Rogue", "Sneak Attack")).toMatchObject({ trigger: { event: "hit", role: "attacker" }, limits: { perTurn: 1 }, condition: { type: "any" } });
  });

  it("Monk 5: Focus pool 5, Patient Defense spends 1", () => {
    const monk = { ...cls("Monk"), id: cls("Monk").slug } as unknown as GameClassData;

    expect(classPools([{ classId: monk.id, level: 5, class: monk, subclass: null }])).toEqual({ [`pool:${monk.id}:focus-points`]: { label: "Focus Points", max: 5, rest: "short" } });
    expect(scaled("Monk", "Patient Defense", 5).limits?.pool).toEqual({ key: `pool:${monk.id}:focus-points`, cost: 1 });
  });

  it("Second Wind and Action Surge read the table; Action Surge only at level 2", () => {
    expect(scaled("Fighter", "Second Wind", 4).limits?.perRest?.uses).toBe(3);
    expect(scaled("Fighter", "Second Wind", 4).effects[1]).toMatchObject({ kind: "heal", amount: { formula: "4" } });
    expect(scaled("Fighter", "Action Surge", 17).limits?.perRest?.uses).toBe(2);
    expect(all("Fighter").filter((x) => x.a.name === "Action Surge").map((x) => x.level)).toEqual([2]);
  });

  it("Channel Divinity and Monk's Focus become options", () => {
    expect(all("Cleric").filter((x) => x.level === 2).map((x) => x.a.name)).toEqual(expect.arrayContaining(["Divine Spark", "Turn Undead"]));
    expect(ability("Cleric", "Divine Spark").id).toBe("channel-divinity-divine-spark-2");
    expect(all("Monk").filter((x) => x.level === 2).map((x) => x.a.name)).toEqual(expect.arrayContaining(["Patient Defense", "Flurry of Blows", "Step of the Wind"]));
    expect(ability("Monk", "Flurry of Blows").description).toContain("Flurry of Blows");
  });

  const MECHANIZED: Array<[string, string]> = [
    ["Barbarian", "Unarmored Defense"], ["Barbarian", "Fast Movement"], ["Barbarian", "Rage"], ["Barbarian", "Relentless Rage"], ["Barbarian", "Mindless Rage"], ["Barbarian", "Retaliation"],
    ["Bard", "Bardic Inspiration"],
    ["Cleric", "Divine Spark"], ["Cleric", "Turn Undead"], ["Cleric", "Preserve Life"],
    ["Paladin", "Lay on Hands"], ["Paladin", "Divine Sense"], ["Paladin", "Sacred Weapon"], ["Paladin", "Aura of Protection"], ["Paladin", "Radiant Strikes"],
    ["Fighter", "Second Wind"], ["Fighter", "Action Surge"], ["Fighter", "Survivor"],
    ["Monk", "Unarmored Defense"], ["Monk", "Unarmored Movement"], ["Monk", "Patient Defense"], ["Monk", "Flurry of Blows"], ["Monk", "Step of the Wind"], ["Monk", "Superior Defense"], ["Monk", "Deflect Attacks"], ["Monk", "Wholeness of Body"], ["Monk", "Uncanny Metabolism"], ["Monk", "Evasion"],
    ["Rogue", "Sneak Attack"], ["Rogue", "Uncanny Dodge"], ["Rogue", "Evasion"],
    ["Sorcerer", "Create Spell Slot"], ["Sorcerer", "Innate Sorcery"], ["Sorcerer", "Draconic Resilience"], ["Sorcerer", "Draconic Resilience: AC"],
    ["Druid", "Wild Shape"],
    ["Wizard", "Empowered Evocation"],
  ];

  it("37 mechanized abilities: a real effect or a pool spend, full SRD text kept", () => {
    expect(MECHANIZED).toHaveLength(37);

    for (const [c, name] of MECHANIZED) {
      const a = ability(c, name);

      expect(a, `${c}/${name}`).toBeDefined();
      expect(!!a.limits?.pool || a.effects.some((e) => e.kind !== "note"), `${c}/${name}`).toBe(true);
      expect(a.description?.length ?? 0, `${c}/${name}`).toBeGreaterThan(40);
    }
  });

  it("Empowered Evocation names the school; evasion flags; Draconic Resilience split", () => {
    expect(ability("Wizard", "Empowered Evocation").effects).toEqual([{ kind: "damageBonus", filter: { kind: "magic", school: "Evocation" }, flat: { formula: "int_mod" } }]);
    expect(ability("Rogue", "Evasion").effects).toEqual([{ kind: "flag", flag: "evasion" }]);
    expect(ability("Sorcerer", "Draconic Resilience").effects).toEqual([{ kind: "modifyStat", stat: "maxHp", flat: { formula: "class_level" } }]);
    expect(ability("Sorcerer", "Draconic Resilience: AC")).toMatchObject({ condition: { type: "armorWorn", categories: ["none"] }, effects: [{ kind: "modifyStat", stat: "armor", flat: { formula: "cha_mod" } }] });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test:run scripts/srd/__tests__/classes-4f2.test.ts`
Expected: FAIL — `columnKey` не експортується, у рядках класів немає `columns`.

- [ ] **Step 3: Overrides** — `scripts/srd/overrides/classes.ts` повністю (наявні 4f-1 записи збережено; Rage, Fast Movement, Unarmored Movement, Second Wind, Action Surge, Draconic Resilience — уточнено):

```ts
import type { AbilityCore } from "../lib/abilities";

import type { AbilityKey } from "@/lib/constants/abilities";
import type { Condition, Effect } from "@/lib/utils/abilities/schema";
import type { ClassColumn } from "@/types/classes";

export type FeatureOption = AbilityCore & { name: string; slug: string };

const EXTRA_ATTACK: AbilityCore = { trigger: { event: "passive" }, effects: [{ kind: "modifyStat", stat: "attacksPerAction", flat: 1 }] };

const passive = (effects: AbilityCore["effects"], condition?: Condition): AbilityCore => ({ trigger: { event: "passive" }, effects, ...(condition && { condition }) });

const NOT_HEAVY: Condition = { type: "armorWorn", categories: ["none", "light", "medium"] };

const UNARMORED: Condition = { type: "armorWorn", categories: ["none"] };

const UNARMORED_NO_SHIELD: Condition = { type: "armorWorn", categories: ["none"], shield: "without" };

const RAGING: Condition = { type: "hasMark", who: "self", markId: "rage" };

const SNEAK: Condition = {
  type: "any",
  conditions: [
    { type: "attackRollMode", mode: "advantage" },
    { type: "all", conditions: [{ type: "allyAdjacent" }, { type: "not", condition: { type: "attackRollMode", mode: "disadvantage" } }] },
  ],
};

const resist = (damageType: string): Effect => ({ kind: "flag", flag: "resistance", damageType, percent: 50, duration: { rounds: 10 } });

const NON_FORCE = ["acid", "bludgeoning", "cold", "fire", "lightning", "necrotic", "piercing", "poison", "psychic", "radiant", "slashing", "thunder"];

const pool = (key: string, cost = 1) => ({ pool: { key, cost } });

const note = (text: string): Effect => ({ kind: "note", text });

// incremental: Two/Three Extra Attacks stack with Extra Attack, Superior Critical with Improved Critical
export const CLASS_FEATURE_OVERRIDES: Record<string, AbilityCore | FeatureOption[]> = {
  "srd-2024_barbarian_extra-attack": EXTRA_ATTACK,
  "srd-2024_fighter_extra-attack": EXTRA_ATTACK,
  "srd-2024_paladin_extra-attack": EXTRA_ATTACK,
  "srd-2024_ranger_extra-attack": EXTRA_ATTACK,
  "srd-2024_monk_extra-attack": EXTRA_ATTACK,
  "srd-2024_fighter_two-extra-attacks": EXTRA_ATTACK,
  "srd-2024_fighter_three-extra-attacks": EXTRA_ATTACK,
  // the action is spent first: the first granted action returns it, the second goes to the pool
  "srd-2024_fighter_action-surge": { trigger: { event: "action" }, limits: { perRest: { rest: "short", uses: { scale: "action-surge" } } }, effects: [{ kind: "grantAction", extraActions: 2 }] },
  "srd-2024_fighter_second-wind": {
    trigger: { event: "bonusAction" },
    limits: { perRest: { rest: "long", uses: { scale: "second-wind-uses" } } },
    effects: [
      { kind: "heal", amount: "1d10", target: "self" },
      { kind: "heal", amount: { formula: "class_level" }, target: "self" },
    ],
  },
  "srd-2024_fighter_champion_improved-critical": passive([{ kind: "modifyStat", stat: "critThreshold", flat: -1 }]),
  "srd-2024_fighter_champion_superior-critical": passive([{ kind: "modifyStat", stat: "critThreshold", flat: -1 }]),
  "srd-2024_fighter_champion_remarkable-athlete": passive([{ kind: "flag", flag: "checkAdvantage", skills: ["athletics"] }]),
  "srd-2024_fighter_champion_survivor": { trigger: { event: "turnStart" }, condition: { type: "hpBelow", who: "self", percent: 50 }, effects: [{ kind: "heal", amount: { formula: "5 + con_mod" }, target: "self" }] },
  "srd-2024_barbarian_danger-sense": passive([{ kind: "flag", flag: "saveAdvantage", abilities: ["dexterity"] }]),
  "srd-2024_barbarian_unarmored-defense": passive([{ kind: "modifyStat", stat: "armor", flat: { formula: "max(0, con_mod)" } }], UNARMORED),
  "srd-2024_barbarian_fast-movement": passive([{ kind: "modifyStat", stat: "speed", flat: 10 }], NOT_HEAVY),
  "srd-2024_barbarian_primal-champion": passive([
    { kind: "modifyStat", stat: "strength", flat: 4 },
    { kind: "modifyStat", stat: "constitution", flat: 4 },
  ]),
  "srd-2024_barbarian_rage": {
    trigger: { event: "bonusAction" },
    condition: NOT_HEAVY,
    limits: { perRest: { rest: "long", uses: { scale: "rages" } } },
    effects: [
      resist("bludgeoning"),
      resist("piercing"),
      resist("slashing"),
      { kind: "damageBonus", filter: { kind: "melee" }, flat: { scale: "rage-damage" }, duration: { rounds: 10 } },
      { kind: "mark", markId: "rage", duration: { rounds: 10 }, target: "self" },
    ],
  },
  "srd-2024_barbarian_relentless-rage": { trigger: { event: "lethalDamage" }, condition: RAGING, limits: { perRest: { rest: "short", uses: 1 } }, effects: [{ kind: "heal", amount: { formula: "2 * class_level" }, revive: true, target: "self" }] },
  "srd-2024_path-of-the-berserker_mindless-rage": passive([{ kind: "flag", flag: "conditionImmunity", conditions: ["charmed", "frightened"] }], RAGING),
  "srd-2024_path-of-the-berserker_retaliation": passive([{ kind: "flag", flag: "counterAttack", attackKinds: ["melee"], bonusPercent: 0 }]),
  "srd-2024_bard_bardic-inspiration": { trigger: { event: "bonusAction" }, limits: { perRest: { rest: "long", uses: { formula: "max(1, cha_mod)" } } }, effects: [{ kind: "mark", markId: "bardic-inspiration", duration: { rounds: 99 }, target: "eventTarget" }] },
  "srd-2024_cleric_channel-divinity": [
    { name: "Divine Spark", slug: "divine-spark", trigger: { event: "action" }, limits: pool("channel-divinity-uses"), effects: [{ kind: "heal", amount: { scale: "divine-spark" }, target: "eventTarget" }, { kind: "heal", amount: { formula: "wis_mod" }, target: "eventTarget" }] },
    { name: "Turn Undead", slug: "turn-undead", trigger: { event: "action" }, limits: pool("channel-divinity-uses"), effects: [note("Turn Undead")] },
  ],
  "srd-2024_cleric_life-domain_preserve-life": { trigger: { event: "action" }, limits: pool("channel-divinity-uses"), effects: [{ kind: "heal", amount: { formula: "5 * class_level" }, target: "eventTarget" }] },
  "srd-2024_paladin_lay-on-hands": { trigger: { event: "bonusAction" }, limits: pool("lay-on-hands", 5), effects: [{ kind: "heal", amount: 5, target: "eventTarget" }] },
  "srd-2024_paladin_channel-divinity": [{ name: "Divine Sense", slug: "divine-sense", trigger: { event: "bonusAction" }, limits: pool("channel-divinity-uses"), effects: [note("Divine Sense")] }],
  "srd-2024_paladin_oath-of-devotion_sacred-weapon": { trigger: { event: "bonusAction" }, limits: pool("channel-divinity-uses"), effects: [{ kind: "modifyStat", stat: "attackBonus", flat: { formula: "max(1, cha_mod)" }, duration: { rounds: 10 }, target: "self" }] },
  // the owner is a member of their own ally zone
  "srd-2024_paladin_aura-of-protection": passive([{ kind: "modifyStat", stat: "savingThrow", flat: { formula: "max(1, cha_mod)" }, target: "nearbyAllies" }]),
  "srd-2024_paladin_radiant-strikes": { trigger: { event: "hit", role: "attacker", attackKind: "melee" }, effects: [{ kind: "dealDamage", amount: "1d8", damageType: "radiant", target: "eventTarget" }] },
  "srd-2024_rogue_slippery-mind": passive([{ kind: "flag", flag: "saveProficiency", abilities: ["wisdom", "charisma"] }]),
  "srd-2024_rogue_sneak-attack": { trigger: { event: "hit", role: "attacker" }, condition: SNEAK, limits: { perTurn: 1 }, effects: [{ kind: "dealDamage", amount: { scale: "sneak-attack" }, target: "eventTarget" }] },
  "srd-2024_rogue_uncanny-dodge": { trigger: { event: "hit", role: "target" }, limits: { perRound: 1 }, effects: [{ kind: "heal", amount: { percentOf: "eventDamage", value: 50 }, target: "self" }] },
  "srd-2024_rogue_evasion": passive([{ kind: "flag", flag: "evasion" }]),
  "srd-2024_monk_unarmored-defense": passive([{ kind: "modifyStat", stat: "armor", flat: { formula: "wis_mod" } }], UNARMORED_NO_SHIELD),
  "srd-2024_monk_unarmored-movement": passive([{ kind: "modifyStat", stat: "speed", flat: { scale: "unarmored-movement" } }], UNARMORED_NO_SHIELD),
  "srd-2024_monk_monks-focus": [
    {
      name: "Patient Defense",
      slug: "patient-defense",
      trigger: { event: "bonusAction" },
      limits: pool("focus-points"),
      effects: [
        { kind: "flag", flag: "disadvantageForAttackers", duration: { rounds: 1 } },
        { kind: "flag", flag: "saveAdvantage", abilities: ["dexterity"], duration: { rounds: 1 } },
      ],
    },
    { name: "Flurry of Blows", slug: "flurry-of-blows", trigger: { event: "bonusAction" }, limits: pool("focus-points"), effects: [note("Flurry of Blows")] },
    { name: "Step of the Wind", slug: "step-of-the-wind", trigger: { event: "bonusAction" }, limits: pool("focus-points"), effects: [note("Step of the Wind")] },
  ],
  "srd-2024_monk_superior-defense": { trigger: { event: "bonusAction" }, limits: pool("focus-points", 3), effects: NON_FORCE.map(resist) },
  "srd-2024_monk_deflect-attacks": {
    trigger: { event: "hit", role: "target" },
    limits: { perRound: 1 },
    effects: [
      { kind: "heal", amount: "1d10", target: "self" },
      { kind: "heal", amount: { formula: "dex_mod + class_level" }, target: "self" },
    ],
  },
  "srd-2024_monk_warrior-of-the-open-hand_wholeness-of-body": {
    trigger: { event: "bonusAction" },
    limits: { perRest: { rest: "long", uses: { formula: "max(1, wis_mod)" } } },
    effects: [
      { kind: "heal", amount: { scale: "martial-arts-dice" }, target: "self" },
      { kind: "heal", amount: { formula: "wis_mod" }, target: "self" },
    ],
  },
  "srd-2024_monk_uncanny-metabolism": {
    trigger: { event: "battleStart" },
    limits: { perRest: { rest: "long", uses: 1 } },
    effects: [
      { kind: "heal", amount: { scale: "martial-arts-dice" }, target: "self" },
      { kind: "heal", amount: { formula: "class_level" }, target: "self" },
    ],
  },
  "srd-2024_monk_evasion": passive([{ kind: "flag", flag: "evasion" }]),
  "srd-2024_monk_disciplined-survivor": passive([{ kind: "flag", flag: "saveProficiency", abilities: ["strength", "dexterity", "constitution", "intelligence", "wisdom", "charisma"] }]),
  "srd-2024_ranger_roving": passive([{ kind: "modifyStat", stat: "speed", flat: 10 }]),
  "srd-2024_paladin_aura-of-courage": passive([{ kind: "flag", flag: "conditionImmunity", conditions: ["frightened"], target: "nearbyAllies" }]),
  "srd-2024_paladin_oath-of-devotion_aura-of-devotion": passive([{ kind: "flag", flag: "conditionImmunity", conditions: ["charmed"], target: "nearbyAllies" }]),
  "srd-2024_druid_circle-of-the-land_natures-ward": passive([{ kind: "flag", flag: "conditionImmunity", conditions: ["poisoned"] }]),
  "srd-2024_druid_wild-shape": { trigger: { event: "bonusAction" }, limits: { perRest: { rest: "short", uses: { scale: "wild-shape-uses" } } }, effects: [note("Wild Shape")] },
  "srd-2024_sorcerer_font-of-magic": [{ name: "Create Spell Slot", slug: "create-slot", trigger: { event: "bonusAction" }, limits: pool("sorcery-points", 2), effects: [{ kind: "restoreSpellSlot", count: 1, target: "self" }] }],
  "srd-2024_sorcerer_innate-sorcery": { trigger: { event: "bonusAction" }, limits: { perRest: { rest: "long", uses: 2 } }, effects: [{ kind: "flag", flag: "advantage", attackKind: "all", duration: { rounds: 10 } }] },
  // HP must not depend on armor, so the AC part is a separate ability
  "srd-2024_sorcerer_draconic-sorcery_draconic-resilience": [
    { name: "Draconic Resilience", slug: "hp", ...passive([{ kind: "modifyStat", stat: "maxHp", flat: { formula: "class_level" } }]) },
    { name: "Draconic Resilience: AC", slug: "ac", ...passive([{ kind: "modifyStat", stat: "armor", flat: { formula: "cha_mod" } }], UNARMORED) },
  ],
  "srd-2024_wizard_evoker_empowered-evocation": passive([{ kind: "damageBonus", filter: { kind: "magic", school: "Evocation" }, flat: { formula: "int_mod" } }]),
};

// Open5e has no level rows for these
export const FEATURE_LEVELS: Record<string, number> = {
  "srd-2024_bard_bard-subclass": 3,
  "srd-2024_monk_deflect-attacks": 3,
  "srd-2024_sorcerer_metamagic-options": 2,
  "srd-2024_warlock_eldritch-invocation-options": 1,
};

// a class-table column without a feature_type
export const DROP_FEATURES: ReadonlySet<string> = new Set(["srd-2024_druid_wild-shape-uses"]);

// features whose level rows are a class-table column (besides CLASS_TABLE_DATA)
export const COLUMN_FEATURES: ReadonlySet<string> = new Set(["srd-2024_druid_wild-shape-uses", "srd-2024_monk_unarmored-movement"]);

// spell slots come from classSpellSlots
export const DROP_COLUMNS: ReadonlySet<string> = new Set(["srd-2024_warlock_slot-level", "srd-2024_warlock_spell-slots"]);

// Open5e names this column «Cantrips Known»
export const COLUMN_LABELS: Record<string, string> = { "srd-2024_druid_wild-shape-uses": "Wild Shape" };

export const POOL_COLUMNS: Record<string, { rest: "short" | "long" }> = {
  "srd-2024_monk_focus-points": { rest: "short" },
  "srd-2024_sorcerer_sorcery-points": { rest: "long" },
  "srd-2024_cleric_channel-divinity-uses": { rest: "short" },
  "srd-2024_paladin_channel-divinity-uses": { rest: "short" },
};

const levels = (f: (level: number) => string) => Array.from({ length: 20 }, (_, i) => f(i + 1));

// numbers from the SRD text that have no table column in Open5e
export const EXTRA_COLUMNS: Record<string, ClassColumn[]> = {
  "srd-2024_fighter": [{ key: "action-surge", label: "Action Surge", values: levels((l) => (l >= 17 ? "2" : l >= 2 ? "1" : "")) }],
  "srd-2024_cleric": [{ key: "divine-spark", label: "Divine Spark", values: levels((l) => (l >= 18 ? "4d8" : l >= 13 ? "3d8" : l >= 7 ? "2d8" : l >= 2 ? "1d8" : "")) }],
  "srd-2024_paladin": [{ key: "lay-on-hands", label: "Lay on Hands", values: levels((l) => String(5 * l)), pool: { rest: "long" } }],
};

// level rows now scale through a column: one ability at the first level
export const SINGLE_LEVEL_FEATURES: ReadonlySet<string> = new Set(["srd-2024_fighter_action-surge"]);

export const SPELLCASTING_ABILITY: Record<string, AbilityKey> = {
  "srd-2024_bard": "charisma",
  "srd-2024_cleric": "wisdom",
  "srd-2024_druid": "wisdom",
  "srd-2024_paladin": "charisma",
  "srd-2024_ranger": "wisdom",
  "srd-2024_sorcerer": "charisma",
  "srd-2024_warlock": "charisma",
  "srd-2024_wizard": "intelligence",
};

export const TYPO_FIXES: Record<string, string> = { "Studdied Attacks": "Studied Attacks", "Unarmoed Movement": "Unarmored Movement" };

// Open5e lists Dexterity for the Fighter; SRD 5.2 says Strength and Constitution
export const SAVING_THROW_FIXES: Record<string, AbilityKey[]> = { "srd-2024_fighter": ["strength", "constitution"] };
```

(Якщо `tsc` скаржиться на тип `pool(...)` у `limits`, оголосіть повертаний тип: `const pool = (key: string, cost = 1): NonNullable<AbilityCore["limits"]> => ({ pool: { key, cost } });`.)

- [ ] **Step 4: Converter** — `scripts/srd/lib/types.ts`: імпорт `import type { ClassColumn } from "@/types/classes";`, у `ClassRow` після `subclasses` — `columns: ClassColumn[];`. `scripts/srd/convert/classes.ts`:
  - імпорти з `../overrides/classes`: додати `COLUMN_FEATURES, COLUMN_LABELS, DROP_COLUMNS, EXTRA_COLUMNS, type FeatureOption, POOL_COLUMNS, SINGLE_LEVEL_FEATURES`; `import type { O5FeatureItem }` (до наявного імпорту з `../lib/open5e`); `import type { ClassColumn } from "@/types/classes";`; `import { MAX_CLASS_LEVEL } from "@/lib/constants/classes";`;
  - замінити `featureAbility` на:

```ts
function featureAbilities(f: Fixture<O5Feature>, level: number): Ability[] {
  const tail = slugTail(f.pk);

  const name = TYPO_FIXES[f.fields.name] ?? f.fields.name;

  const desc = f.fields.desc.trim();

  const core = CLASS_FEATURE_OVERRIDES[f.pk];

  if (!core) return [noteAbility(`${tail}-${level}`, name, desc)];

  if (Array.isArray(core)) return core.map(({ name: optionName, slug, ...rest }: FeatureOption) => coreAbility(`${tail}-${slug}-${level}`, optionName, desc, rest));

  return [coreAbility(`${tail}-${level}`, name, desc, core)];
}
```

  - у `featureGroups`: `if (levels.length > COLUMN_LIKE_ROWS || SINGLE_LEVEL_FEATURES.has(f.pk)) levels = [levels[0]];` і `byLevel.set(level, [...(byLevel.get(level) ?? []), ...featureAbilities(f, level)]);`;
  - додати:

```ts
const COLUMN_SUFFIX = /-column-data$/;

export const columnKey = (featurePk: string, classPk: string) => featurePk.slice(classPk.length + 1).replace(COLUMN_SUFFIX, "");

function columnsOf(data: Open5eData, classPk: string, itemsOf: Map<string, Fixture<O5FeatureItem>[]>): ClassColumn[] {
  const fromTable = data.features
    .filter((f) => f.fields.parent === classPk && (f.fields.feature_type === "CLASS_TABLE_DATA" || COLUMN_FEATURES.has(f.pk)) && !DROP_COLUMNS.has(f.pk))
    .map((f): ClassColumn => {
      const rows = itemsOf.get(f.pk) ?? [];

      return {
        key: columnKey(f.pk, classPk),
        label: COLUMN_LABELS[f.pk] ?? TYPO_FIXES[f.fields.name] ?? f.fields.name,
        values: Array.from({ length: MAX_CLASS_LEVEL }, (_, i) => rows.find((r) => r.fields.level === i + 1)?.fields.column_value?.trim() ?? ""),
        ...(POOL_COLUMNS[f.pk] && { pool: POOL_COLUMNS[f.pk] }),
      };
    });

  return [...fromTable, ...(EXTRA_COLUMNS[classPk] ?? [])].sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0));
}
```

  - у `convertClasses`: `const itemsOf = groupBy(data.featureItems, (i) => i.fields.parent);` (поруч із `levelsOf`, яке тоді будувати з `itemsOf`: `new Map([...itemsOf].map(([pk, rows]) => …))`), і в об'єкт рядка після `subclasses: …` — `columns: columnsOf(data, c.pk, itemsOf),`.

`scripts/srd/lib/build-data.ts`: імпорт нових констант; у `buildSrdData` замінити рядок `assertKnown("class feature overrides", …)` на

```ts
  assertKnown("class feature overrides", [...Object.keys(CLASS_FEATURE_OVERRIDES), ...Object.keys(FEATURE_LEVELS), ...DROP_FEATURES, ...COLUMN_FEATURES, ...DROP_COLUMNS, ...Object.keys(COLUMN_LABELS), ...Object.keys(POOL_COLUMNS), ...SINGLE_LEVEL_FEATURES], pks(data.features));
  assertKnown("extra class columns", Object.keys(EXTRA_COLUMNS), pks(data.classes));
```

- [ ] **Step 5: Allowed edit of the 4f-1 test** — `scripts/srd/__tests__/classes.test.ts` (спек свідомо змінює ці вихідні значення; інші твердження не чіпати):
  - назва `it("Extra Attack, Second Wind, Action Surge (2 and 17), no table columns", …)` → `it("Extra Attack, Second Wind, Action Surge (2 only, scaled by the table), no table columns", …)`;
  - у `toMatchObject` для Second Wind: `limits: { perRest: { rest: "long", uses: 2 } }` → `limits: { perRest: { rest: "long", uses: { scale: "second-wind-uses" } } }`, а `{ kind: "heal", amount: { formula: "hero_level" }, target: "self" }` → `{ kind: "heal", amount: { formula: "class_level" }, target: "self" }`;
  - рядок `expect(at("Fighter", 17).find((a) => a.id === "action-surge-17")).toMatchObject({ trigger: { event: "action" }, effects: [{ kind: "grantAction", extraActions: 2 }] });` → два рядки:

```ts
    expect(at("Fighter", 2).find((a) => a.id === "action-surge-2")).toMatchObject({ trigger: { event: "action" }, effects: [{ kind: "grantAction", extraActions: 2 }] });
    expect(at("Fighter", 17).some((a) => a.id === "action-surge-17")).toBe(false);
```

  - у тесті Monk рядок `expect(movement[0].a.effects).toEqual([{ kind: "modifyStat", stat: "speed", flat: 10 }]);` → `expect(movement[0].a.effects).toEqual([{ kind: "modifyStat", stat: "speed", flat: { scale: "unarmored-movement" } }]);`.

- [ ] **Step 6: Run tests to verify they pass**

Run: `pnpm test:run scripts/srd`
Expected: PASS, крім `data-integrity.test.ts` (дані ще 4f-1 — оновлюються в задачі 15; якщо він уже падає тут — це очікувано лише для лічильника артефактів, інші його тести мають проходити).

- [ ] **Step 7: Type check** — `pnpm exec tsc --noEmit -p tsconfig.json` → 0 errors.

- [ ] **Step 8: Commit**

```bash
git add scripts/srd/overrides/classes.ts scripts/srd/convert/classes.ts scripts/srd/lib/types.ts scripts/srd/lib/build-data.ts scripts/srd/__tests__/classes.test.ts scripts/srd/__tests__/classes-4f2.test.ts
git commit -m "feat(srd): 4f-2 class table columns, pools and 37 mechanized class abilities

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 15: Школи за назвою → id у завантажувачі, цілісність, регенерація даних і локального шаблону

**Files:**
- Modify: `scripts/srd/lib/load-template.ts`, `scripts/srd/load-template.ts`
- Modify (дозволена правка наявного тесту): `scripts/srd/__tests__/data-integrity.test.ts` — лише `EXPECTED.artifacts` 39 → 51
- Create: `scripts/srd/__tests__/data-integrity-4f2.test.ts`, `scripts/srd/__tests__/school-refs.test.ts`
- Regenerate: `data/templates/srd-5.2/*.json`

**Interfaces:**
- Consumes: усе попереднє.
- Produces: `resolveSchoolRefs<T>(value: T, idByName: ReadonlyMap<string, string>): T`; `importSrdData(data, run, prepare?: (kind: SrdKind, rows: Record<string, unknown>[]) => Promise<Record<string, unknown>[]>)`.

- [ ] **Step 1: Write the failing tests**

`scripts/srd/__tests__/school-refs.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { importSrdData, resolveSchoolRefs } from "../lib/load-template";
import type { SrdData } from "../lib/types";

describe("resolveSchoolRefs", () => {
  it("replaces school names with group ids anywhere in a row, leaves unknown names", () => {
    const rows = [{ name: "Wizard", subclasses: [{ features: [{ abilities: [{ effects: [{ kind: "damageBonus", filter: { kind: "magic", school: "Evocation" } }, { kind: "flag", flag: "spellAbsorb", school: "Necromancy", percent: 50 }] }] }] }] }];

    const out = resolveSchoolRefs(rows, new Map([["Evocation", "g-evo"]]));

    expect(JSON.stringify(out)).toContain('"school":"g-evo"');
    expect(JSON.stringify(out)).toContain('"school":"Necromancy"');
    expect(rows[0].subclasses[0].features[0].abilities[0].effects[0].filter.school).toBe("Evocation");
  });

  it("importSrdData passes rows through prepare in kind order", async () => {
    const data = { "spell-groups": [{ slug: "g", name: "G" }], spells: [], races: [], classes: [{ slug: "c", name: "C" }], units: [], artifacts: [] } as unknown as SrdData;

    const seen: string[] = [];

    await importSrdData(
      data,
      async (kind, rows) => {
        seen.push(`${kind}:${JSON.stringify(rows)}`);

        return { counts: { created: 0, updated: 0, skipped: 0, error: 0 }, results: [] } as never;
      },
      async (kind, rows) => (kind === "classes" ? rows.map((r) => ({ ...r, prepared: true })) : rows),
    );

    expect(seen.find((s) => s.startsWith("classes"))).toBe('classes:[{"name":"C","prepared":true}]');
    expect(seen.find((s) => s.startsWith("spell-groups"))).toBe('spell-groups:[{"name":"G"}]');
  });
});
```

`scripts/srd/__tests__/data-integrity-4f2.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { readSrdData, toImportRows } from "../lib/data-files";

import { createClassSchema } from "@/lib/schemas/classes";
import { applyClassScale, classPools, columnRefIssues } from "@/lib/utils/abilities/class-columns";
import { classColumnIssues } from "@/lib/utils/characters/classes/columns";
import type { GameClassData } from "@/types/classes";

const data = readSrdData();

const cls = (name: string) => data.classes.find((c) => c.name === name)!;

const featureLists = (c: (typeof data.classes)[number]) => [...c.features, ...c.subclasses.flatMap((s) => s.features)];

const find = (className: string, name: string) => featureLists(cls(className)).flatMap((f) => f.abilities).find((a) => a.name === name)!;

const ARMOR = {
  "Padded Armor": { category: "light", base: 11, stealthDisadvantage: true },
  "Leather Armor": { category: "light", base: 11 },
  "Studded Leather Armor": { category: "light", base: 12 },
  "Hide Armor": { category: "medium", base: 12 },
  "Chain Shirt": { category: "medium", base: 13 },
  "Scale Mail": { category: "medium", base: 14, stealthDisadvantage: true },
  Breastplate: { category: "medium", base: 14 },
  "Half Plate Armor": { category: "medium", base: 15, stealthDisadvantage: true },
  "Ring Mail": { category: "heavy", base: 14, stealthDisadvantage: true },
  "Chain Mail": { category: "heavy", base: 16, strength: 13, stealthDisadvantage: true },
  "Splint Armor": { category: "heavy", base: 17, strength: 15, stealthDisadvantage: true },
  "Plate Armor": { category: "heavy", base: 18, strength: 15, stealthDisadvantage: true },
};

describe("SRD 5.2 data: 4f-2", () => {
  it("12 armors match the SRD table", () => {
    expect(Object.fromEntries(data.artifacts.filter((a) => a.slot === "armor").map((a) => [a.name, a.armor]))).toEqual(ARMOR);
  });

  it("class tables: ≤ 12 columns, 20 cells, unique keys, numeric pools", () => {
    for (const c of data.classes) {
      expect(c.columns.length, c.name).toBeLessThanOrEqual(12);
      expect(c.columns.every((col) => col.values.length === 20), c.name).toBe(true);
      expect(classColumnIssues(c.columns), c.name).toEqual([]);
    }
  });

  it("every scale/pool ref resolves to the class table; rows pass the class schema", () => {
    for (const c of data.classes) {
      expect(featureLists(c).flatMap((f) => columnRefIssues(f.abilities, c.columns)), c.name).toEqual([]);
      expect(createClassSchema.safeParse(toImportRows([c])[0]).success, c.name).toBe(true);
    }
  });

  it("Rage 1/9/17, Sneak Attack 5, Monk Focus 5", () => {
    const barb = cls("Barbarian");

    expect([1, 9, 17].map((level) => applyClassScale([find("Barbarian", "Rage")], { classId: barb.slug, level, columns: barb.columns })[0].limits?.perRest?.uses)).toEqual([2, 4, 6]);

    const rogue = cls("Rogue");

    expect(applyClassScale([find("Rogue", "Sneak Attack")], { classId: rogue.slug, level: 5, columns: rogue.columns })[0].effects[0]).toMatchObject({ amount: "3d6" });

    const monk = { ...cls("Monk"), id: "monk" } as unknown as GameClassData;

    expect(classPools([{ classId: "monk", level: 5, class: monk, subclass: null }])["pool:monk:focus-points"]).toEqual({ label: "Focus Points", max: 5, rest: "short" });
  });

  it("Empowered Evocation points at an existing school name", () => {
    expect(JSON.stringify(find("Wizard", "Empowered Evocation"))).toContain('"school":"Evocation"');
    expect(data["spell-groups"].map((g) => g.name)).toContain("Evocation");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm test:run scripts/srd/__tests__/school-refs.test.ts scripts/srd/__tests__/data-integrity-4f2.test.ts`
Expected: FAIL — `resolveSchoolRefs` немає; у даних 4f-1 немає броні й колонок.

- [ ] **Step 3: Loader** — `scripts/srd/lib/load-template.ts`:

```ts
// the engine compares damageBonus/flag schools with spell group ids; data files keep portable names
export function resolveSchoolRefs<T>(value: T, idByName: ReadonlyMap<string, string>): T {
  if (Array.isArray(value)) return value.map((v) => resolveSchoolRefs(v, idByName)) as T;

  if (!value || typeof value !== "object") return value;

  return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, k === "school" && typeof v === "string" ? (idByName.get(v) ?? v) : resolveSchoolRefs(v, idByName)])) as T;
}

export type PrepareRows = (kind: SrdKind, rows: Record<string, unknown>[]) => Promise<Record<string, unknown>[]>;

export async function importSrdData(data: SrdData, run: RunImport, prepare?: PrepareRows): Promise<SrdImportResult[]> {
  const results: SrdImportResult[] = [];

  for (const kind of SRD_KINDS) {
    const rows = toImportRows(data[kind]);

    results.push({ kind, report: await run(kind, prepare ? await prepare(kind, rows) : rows) });
  }

  return results;
}
```

(замінює наявну `importSrdData`). `scripts/srd/load-template.ts`: імпорт `resolveSchoolRefs`; виклик:

```ts
  const schoolIds = async () => new Map((await prisma.spellGroup.findMany({ where: { campaignId: template.id }, select: { id: true, name: true } })).map((g) => [g.name, g.id]));

  const results = await importSrdData(
    data,
    (kind, rows) => importContent(actor, kind, { rows, mode: "update", dryRun: false }, OFFLINE_IMPORT_DEPS),
    async (kind, rows) => (kind === "spell-groups" ? rows : resolveSchoolRefs(rows, await schoolIds())),
  );
```

- [ ] **Step 4: Regenerate the data files**

Run: `pnpm srd:build --source /Users/silentfox/.claude/jobs/4ad97a0b/tmp/srd`
Expected: друк лічильників `spell-groups: 8, spells: 339, races: 9, classes: 12, units: 331, artifacts: 51`; рядок `class abilities with mechanics: N/M` — N зросло проти 4f-1 щонайменше на 31. `git diff --stat data/templates/srd-5.2` — змінено `artifacts.json`, `classes.json`, `manifest.json` (дата/лічильник); `spells.json`, `units.json`, `races.json`, `spell-groups.json` — без змін (інакше зупинитись і з'ясувати).

- [ ] **Step 5: Allowed edit of the 4f-1 integrity test** — `scripts/srd/__tests__/data-integrity.test.ts`: у `EXPECTED` `artifacts: 39` → `artifacts: 51` (38 видів зброї + щит + 12 обладунків). Більше нічого не змінювати.

- [ ] **Step 6: Run SRD tests**

Run: `pnpm test:run scripts/srd`
Expected: PASS (усі, зокрема `importContent` dryRun без помилок для класів з `columns` і артефактів з `armor`).

- [ ] **Step 7: Reload the local template**

Run: `pnpm constructor:srd-template`
Expected: `5e SRD 5.2: <id>`; `classes: created 0, updated 12, … error 0`; `artifacts: created 12, updated 39, … error 0`; exit 0. Повторний запуск — усі рядки `updated`, `created 0`, `error 0`.

Перевірка школи (очікується `f|t` — назви «Evocation» не лишилось, є id групи):

```bash
psql "postgresql://postgres:postgres@localhost:54322/constructor" -At -c "select c.subclasses::text like '%\"school\": \"Evocation\"%', c.subclasses::text ~ '\"school\": \"c[a-z0-9]{20,}\"' from classes c join campaigns k on k.id = c.\"campaignId\" where k.name = '5e SRD 5.2' and c.name = 'Wizard';"
```

- [ ] **Step 8: OpenAPI size** — `pnpm test:run lib/server/content/__tests__/openapi.test.ts lib/server/content/__tests__/openapi-4f2.test.ts lib/server/content/__tests__/tool-schemas.test.ts`. Якщо `openapi.test.ts` падає лише на `toBeLessThan(130_000)`: виміряти розмір, перевірити, що `Formula`/`Flat`/`Amount`/`ArmorStats`/`ClassColumn` є в `components.schemas` (а не вбудовані), і лише тоді змінити межу в `openapi.test.ts` і `openapi-4f2.test.ts` на `135_000`, вказавши виміряний розмір у повідомленні коміту.

- [ ] **Step 9: Commit**

```bash
git add scripts/srd/lib/load-template.ts scripts/srd/load-template.ts scripts/srd/__tests__/school-refs.test.ts scripts/srd/__tests__/data-integrity-4f2.test.ts scripts/srd/__tests__/data-integrity.test.ts data/templates/srd-5.2
git commit -m "feat(srd): 4f-2 school names to group ids on load, regenerated SRD data with armor and class tables

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 16: Регрес HOMM5 — тести рушія й battle-sweep

**Files:** без змін коду, якщо регресу немає (інакше — виправлення в файлах відповідної задачі з окремим комітом).

- [ ] **Step 1: Engine test folders**

Run: `pnpm test:run lib/utils/battle lib/utils/abilities "app/api/campaigns/[id]/battles" lib/utils/characters lib/utils/rules`
Expected: PASS (відомий нестабільний `lib/hooks/battle/__tests__/battle-fx.test.tsx` сюди не входить).

- [ ] **Step 2: Existing tests untouched**

Run: `git diff --name-status c62bccd8..HEAD -- '*.test.ts' '*.test.tsx' | grep -v '^A'`
Expected: лише `M	scripts/srd/__tests__/classes.test.ts`, `M	scripts/srd/__tests__/data-integrity.test.ts` і, якщо в задачі 15 піднімали межу, `M	lib/server/content/__tests__/openapi.test.ts`. Будь-який інший рядок — зупинитись, повернути наявний тест і виправити код.

- [ ] **Step 3: battle-sweep on HOMM5**

Run: `set -a; source .env.local; set +a; pnpm battle-sweep --campaign cmuylhk0c0001ia06lg5eommv`
Expected: exit 0, у звіті `<tmp>/battle-sweep/battle-sweep.md` 0 помилок (відомий нестабільний сценарій лабіринту «ворог у полі зору прокидається» — перезапустити один раз). Якщо є нові помилки — `git stash`-подібних операцій не робити; знайти коміт через `git bisect`-прогін sweep на попередніх комітах цього плану й виправити.

- [ ] **Step 4:** звіт контролеру: результати трьох кроків (кількість тестів, рядки diff, підсумок sweep).

---

### Task 17: Документи й повна перевірка

**Files:**
- Modify: `docs/architecture/battle.md`, `docs/architecture/abilities.md`, `docs/architecture/content-api.md`, `docs/STATUS.md`, `docs/superpowers/constructor-handoff.md`

- [ ] **Step 1: `battle.md`** — новий розділ перед «## Changing battle behavior»:

```markdown
## 5e: броня, числа класів, пули (етап 4f-2)

- **КЗ героя з класами** — `lib/utils/characters/classes/armor-class.ts`: після `bakePassives` `applyClassArmor` пише в `combatStats.armorClass` базу: вдягнений артефакт зі `armor` у клітинці «Броня» → `base + min(мод. Спр, межа)` (межа за категорією: легка — без межі, середня — 2, важка — 0; `dexCap` перекриває), інакше `10 + мод. Спр`. `Character.armorClass` у режимі класів не читається; HOMM-герой і герой без класів — без змін. Щит, Unarmored Defense, Shield, магічні +N — `modifyStat armor` через `collectModifiers`. Наслідки броні — синтетичне вміння `armor-penalties` з джерелом-артефактом: `checkDisadvantage stealth` і −10 швидкості при Силі нижче вимоги (швидкість змінюється одразу, бо запікання вже минуло). Лист показує розклад (`armorTotal` → `classArmorBase`), форма персонажа в режимі класів — КЗ лише для читання.
- **Статичні умови** — `armorWorn` (`isStaticCondition`): `bakePassives`/`bakedStatSources` і перевірка вміння дозволяють її на запечених статах (Unarmored Movement, Fast Movement).
- **Числа класу** розв'язуються при збиранні (`applyClassScale` у `classResolved`, `lib/utils/abilities/class-columns.ts`): `{ scale }` → значення колонки на рівні в цьому класі (у `Flat`/`perRest.uses` — число, у `Amount` — число або кубики), `class_level` у формулах → рівень класу, `limits.pool.key` → `pool:<classId>:<key>`. Формульні `perRest.uses` — після запікання (`resolveLimitFormulas`, мінімум 1). Рушій бачить звичайні числа; нерозв'язане — 0 / вміння недоступне.
- **Пули** — `battleData.pools: Record<key, { label, max, rest }>` (`classPools`), лічильник `abilityUsage[poolKey].battle`; `withinCountLimits`/`recordUse` враховують `limits.pool { key, cost }`; нестача — відмова `ABILITY_POOL_EMPTY`, вміння зникає з вибору; плитка й картка героя показують залишок. При `persistResources` пул переживає бій у `resources.charges[poolKey]` і скидається відпочинком за `rest` колонки.
- **Події атаки** `hit` і `attack` (after) несуть `rollMode` (лише перевага/недолік) — для умов `attackRollMode` і `allyAdjacent` (Sneak Attack). **`evasion`** — рятівний Спр з половиною: успіх 0, провал половина; не діє на недієздатного (`spell/cast/outcome.ts`, `maneuvers/fire-burst.ts`).
```

- [ ] **Step 2: `abilities.md`** — додати рядок у кінець:

```markdown
- Етап 4f-2 (5e): умови `armorWorn { categories: none|light|medium|heavy, shield?: with|without }` (статична — дозволена на запечених статах), `attackRollMode { mode }`, `allyAdjacent`; прапорець `evasion`; значення з таблиці класу `{ scale: "<ключ колонки>" }` у `Flat`, `Amount` і `perRest.uses` (також `{ formula }`) — лише у вміннях класу/підкласу, поза ними — проблема в редакторі (`validateAbilities(list, { classColumns })`, `columnRefIssues`) і 0 у рушії; `limits.pool { key, cost }` — спільний пул класу; змінні формул `str_mod`…`cha_mod`, `prof`, `class_level` (`FORMULA_VARIABLES`). Деталі — [battle.md](battle.md) «5e: броня, числа класів, пули».
```

- [ ] **Step 3: `content-api.md`** — у розділ «## Класи (етап 4c-1)» додати пункт про `columns` (`ClassColumn { key, label, values[20], pool? }`, міграція `20261101000000_class_columns`, Zod перевіряє посилання `scale`/`pool` вмінь на колонки, оновлення без `columns` перевіряється за збереженою таблицею — `CLASS_COLUMN_UNKNOWN`); у розділ «## Заклинання й зброя 5e (етап 4c-2)» — пункт про `armor` артефакта (`ArmorStats { category, base, dexCap?, strength?, stealthDisadvantage? }`, лише слот `armor` — `ARMOR_SLOT_ONLY`, зберігається записами в `modifiers` з типами `ArmorModifierType`, імпорт/експорт поля `armor`, OpenAPI `ArmorStats`); у розділ «## Шаблон SRD 5.2 (етап 4f-1)» — пункт «4f-2»: 12 обладунків, колонки таблиць класів з пулами (Focus, Sorcery Points, Channel Divinity, Lay on Hands) і додатковими колонками (Action Surge, Divine Spark), 37 механізованих умінь класів; завантажувач замінює назви шкіл у `school` на id груп кампанії (ручний імпорт `classes.json` через UI лишає назву — бонус школи не спрацює). У «## OpenAPI» — спільні схеми `Formula`, `Flat`, `Amount`, `ArmorStats`, `ClassColumn`.

- [ ] **Step 4: `STATUS.md`** — у рядку «Конструктор кампаній» після фрагмента про 4f-1 замінити «живий прогін 4f-1 пройдено; далі 4f-2 (броня й числа класів)» на «живий прогін 4f-1 пройдено; **4f-2 «броня 5e і числа класів» готовий** (модель броні артефакта в `modifiers`, КЗ 5e героя з класами, `classes.columns` з міграцією `20261101000000_class_columns`, `{ scale }`/`class_level`/змінні формул/пули, `armorWorn`/`attackRollMode`/`allyAdjacent`/`evasion`, конвертер: 12 обладунків і 37 умінь класів; спек — розділ 4f-2 того ж файлу, план `docs/superpowers/plans/2026-10-23-constructor-4f2-armor-class-numbers.md`; опис — `docs/architecture/battle.md` «5e: броня, числа класів, пули»); далі живий прогін 4f-2, потім 4f-3 (магічні предмети)». Дата «_Оновлено:_» — `2026-10-23`.

- [ ] **Step 5: `constructor-handoff.md`** — у «Стан» рядок про 4f-2 (той самий зміст одним реченням) і відкладене: AI-контекст `ai/tools/party.ts` і `DmCharacterCard` показують `Character.armorClass` (у режимі класів застаріле), майстерність у броні не перевіряється, перевірка формул з новими змінними на prod-даних — перед злиттям (після свіжого бекапу); «Наступний крок» — «живий прогін 4f-2 за §7 спеку (десктоп, локальна БД `constructor`, шаблон уже перезалито), потім спек і план 4f-3».

- [ ] **Step 6: Full verification**
  - `pnpm install --frozen-lockfile` — без змін lockfile.
  - `pnpm test:run` — усі зелені (відомий нестабільний `lib/hooks/battle/__tests__/battle-fx.test.tsx` — перезапустити окремо).
  - `pnpm lint` — 0 errors.
  - `pnpm build` — успішно.
  - `set -a; source .env.local; set +a; pnpm battle-sweep --campaign cmuylhk0c0001ia06lg5eommv` — без регресу HOMM.

- [ ] **Step 7: Commit**

```bash
git add docs/architecture/battle.md docs/architecture/abilities.md docs/architecture/content-api.md docs/STATUS.md docs/superpowers/constructor-handoff.md
git commit -m "docs(constructor): 4f-2 armor, class tables and pools — architecture, status, handoff

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

- [ ] **Step 8:** звіт контролеру: список комітів, відхилення від плану (і чому), розмір документа OpenAPI, лічильники `pnpm srd:build`, нестабільні тести.

(Фінальне рев'ю opus, `/simplify` і живий прогін за §7 спеку — Barbarian 5 без броні зі щитом, Fighter 5 у Chain Mail із Силою 12, Monk 5 з Patient Defense і відпочинком, Rogue 5 зі Sneak Attack, HOMM-кампанія без змін — окремий субагент після задачі 17.)
