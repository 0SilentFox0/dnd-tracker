# WFRP 5h-1 Unit Traits Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development. Виконавці = Sonnet, без рев'ю після кожної задачі, 5 диспетчів (D1 = T1+T2, D2 = T3, D3 = T4, D4 = T5, D5 = T6+T7), потім контролер T8: повний прогін тестів, `/simplify` (1 агент), docs, live-run окремим Sonnet-агентом, одне фінальне Opus-рев'ю діапазону `c9f713735^..HEAD` з виправленнями в одному диспетчі. Кроки — чекбокси; план дає сигнатури, кейси й рішення, а не повний код: читайте названих сусідів і тримайтеся їхнього стилю.

**Goal:** WFRP-юніт з Traits (Armour, Ward, Size, Fear/Terror, Regenerate, Bite/Claw/Breath/Weapon +X, Magical, наративні) коректно б'ється, а «fair»-баланс враховує його захист і шкоду.

**Architecture:** Traits = passive-записи `abilities` юніта з п'ятьма новими ефектами DSL (`wfrpArmour`, `wfrpWard`, `wfrpSize`, `wfrpPsychology`, `wfrpAttack`), які ядро лише валідує й описує. Читає їх новий хук `RuleSystemDefinition.traits` (wfrp): `unitBuild` (AP/Size/Ward у `abilities.wfrp`, профілі атак через спільний із 5f `wfrpAttackFromProfile`), `psychology` (тест Cool → стан `broken`) і `recipes` (картки в наявній `RecipeGallery`). d20/homm `traits` не мають, тож ефекти інертні, а сервер юнітів їх відхиляє.

**Tech Stack:** Next.js 16, React 19, Prisma 6/Postgres, Zod, next-intl, Vitest.

**Spec:** `docs/superpowers/specs/2026-11-07-wfrp-5h1-design.md`

## Факти з коду (перевірено перед плануванням)

- **`battleStart` у wfrp спрацьовує.** `runAbilities(…, { type: "battleStart" })` системно-нейтральний і викликається в трьох місцях: `lib/server/battles/mutations/start/start-battle-handler.ts:163` (`applyStartOfBattleAndSort`, перед `roundStart` та ініціативою), `lib/server/battles/mutations/reveal-participant/reveal-participant-mutation.ts:51` (резерв, `newcomerIds`) і `lib/utils/battle/turn/round-start.ts:56` (призвані, `newcomerIds`). Гейту на систему немає.
- **Кроку психології на старті в `RuleSystemDefinition` немає** (є лише `conditions.turnStart/skippedTurn`). Тому T5 додає `traits.psychology` і один спільний хелпер `runJoinTriggers`, яким замінюються всі три виклики (старт, резерв, призов) — Fear перевіряється й для тих, хто приєднується посеред бою.
- **Лог-приватність 5c-2:** `sanitizeLogEntry` (`lib/utils/battle/view/visibility.ts:52`) застосовує `concealLine` лише до записів, у `targets` яких є не-exact учасник. Стартовий запис тригерів має `targets: []`, тож рядки психології йдуть **окремим записом** з `targets` = ті, хто тестувався, і отримують `…Hidden`-варіанти в `concealWfrpLine`.
- **Стан бою:** нове поле `battleData` потрапляє в дельту лише через `ParticipantState` (`lib/utils/battle/store/types.ts:46`), `split-participant.ts` (3 місця) і білий список `participant-patch.ts:15` — як `ammo/reload` у 5f. Інакше воно ляже в знімок.
- **Regenerate:** `applyHeal` (`lib/utils/abilities/registry/effects/hp.ts:77`) пропускає ціль без `isActive`, якщо немає `revive` і вона не `isDying` (`isDying` вимагає `deathSaves`, яких у wfrp немає) — тож непритомний (UNCONSCIOUS, Wounds 0 або стан від ДМ) і мертвий не лікуються без нового коду; T4 це закріплює тестом.
- **Баг балансу (знайдено):** `builtUnitsById` у `lib/server/battles/balance/unit-library.ts:15` будує учасників без `rules` → `DEFAULT_RULES` → у wfrp-бібліотеці немає `characteristics`/`abilities.wfrp`, `hitModel` читає дефолти. T6 передає `rules`, коли є `hitModel`.
- **Імпорт юнітів** (`lib/utils/units/import-units.ts`) пише `abilities` лише з `specialAbilitiesToAbilities` (тільки `note`), тож wfrp-ефекти через імпорт потрапити не можуть: перевірка там — регресійний тест, а не новий код (відхилення від spec, див. нижче).
- **Міграція не потрібна:** ефекти — JSON `units.abilities`, нове поле стану — JSON `battle_participants.state`.

## Повторне використання (CLAUDE.md «Reuse before writing»)

| Що | Як використовуємо | Чому щось нове |
|---|---|---|
| `RecipeGallery` + `RecipeForm` + `useRecipeValues` (`components/abilities`, `lib/hooks/abilities`) | картки Traits = додаткові `Recipe` з `ruleSystemOf(rules).traits.recipes`, категорія `traits` | лише `Recipe.textKey` (тексти з `wfrpTraits`), бо `abilityRegistry` у бюджеті учасника; `useRecipeValues` лишається поза барелем |
| `extract-wfrp-attacks.ts` (5f) | виносимо `wfrpAttackFromProfile(id, name, profile)`; персонажі й юніти будують атаку однаково | — |
| `unitBattleAttacks` | 5e-атаки юніта лишаються, атаки-Traits **додаються** | — |
| `WeaponProfile` / `qualityEffects` / Blast (5f) | Breath = ranged-профіль з `blast` і `addSb: false` | — |
| `wfrpAbilitiesOf` / `WfrpParticipantStats` | AP Traits іде тим самим `gear.ap` | + `size?`, `ward?` |
| `applyWfrpCondition` + каталог (`broken`, endTest Cool) | наслідок Fear/Terror | — |
| `resolvePercentileTest`, `skillTarget`, `selfTestMod` | тест Cool | — |
| `findFlags(…, "conditionImmunity")` (`engine/core/collect-modifiers.ts:224`) | імунітет `fear`/`all` | — |
| `heal` + `turnStart` DSL | Regenerate без нового коду | — |
| `note` / `flag sense` | Night Vision, Undead, Hardy, Flier, Swarm | — |
| `combat.hitModel` + `hitModelHeroStats/UnitStats` | «fair» читає AP/Ward/Size | + `hitModel.durability?` |
| `refreshFromSource` | уже копіює `abilities.wfrp` → Size/Ward переживають «Оновити з джерела» | — |

## Global Constraints

- Worktree `/Users/silentfox/Work/dnd-tracker-wfrp`, гілка `feat/wfrp`. **Без merge/push у main.** Локальна БД: контейнер `dnd-tracker-wfrp-db-1` (порт 54322, db `wfrp`); `.env.local` дивиться в іншу БД — для dev-сервера `DATABASE_URL`/`DIRECT_URL` перевизначати інлайн на wfrp. Prod URL і `.env.production-db.local` не чіпати. Міграцій немає.
- Шари: компоненти/`app/**` не імпортують `@/lib/api/*` і не роблять `fetch`; логіка в хуках. ESLint `SYSTEM_IMPORT_PATTERN`: ядро не імпортує `@/lib/utils/rules/systems/wfrp*`, `@/components/systems/wfrp*`; доступ лише через `ruleSystemOf(rules).traits` / `useRuleSystem`. Ніяких `key === "wfrp"` — прапорець = наявність `traits`. Константи, спільні для схеми DSL і wfrp (розміри, види психології, атаки-Traits), живуть у ядрі `lib/utils/abilities/schema/kinds.ts`, wfrp імпортує їх звідти.
- Клієнтські бандли: модулі `wfrp/traits/*` — без zod і без runtime-імпорту `lib/utils/abilities/editor.ts`/`templates/catalog.ts` (рецепти будують ефекти літералами, типи — `import type`); гейт — `lib/__tests__/client-entry-imports.test.ts` і `lib/utils/battle/attack/__tests__/client-imports.test.ts`.
- Бій: учасник створюється наявними білдерами (знімок + `snapshotHash` пише store — не обходити); нове поле `battleData.psychologyTested` — у `ParticipantState`, дельти, не повна сцена; хід — лише через наявний `advanceTurn`-цикл.
- i18n: uk+en, кирилиця в коді заборонена. Тексти рецептів (label/hint/defaultName/params/options) — **новий namespace `wfrpTraits`** у `WFRP_DM_EXTRA` (+ `NAMESPACES` у `lib/i18n/config.ts`, `global.d.ts`, рядок scope у `app/campaigns/[id]/__tests__/layout.test.tsx`). У `abilityRegistry` (бюджет учасника) — лише мінімум для ядра: `effects.<kind>.label`, підписи полів/опцій, `summary.effects.<kind>`, `templates.categories.traits`. Рядки бою — `battleWfrp.log.psychology*`, `battleWfrp.damage.steps.{ward,size}`; у `battleLog.json` wfrp-ключів немає. Серверні помилки — `lib/constants/api-errors.ts` + `messages/{uk,en}/errors.json`. `scope-size`: учасник wfrp ліміт 106 KB (було 105.5), ДМ 109 KB; якщо учасник перевищує — підняти `WFRP_MEMBER_LIMIT_KB` до 107 з коментарем, зафіксувати в docs і окремо назвати у звіті.
- Числа правил — заглушки з `// verify against 5e book` у `wfrp/traits/constants.ts` (одне місце). Коментарі мінімальні.
- Компоненти ≤ 7 props, ключі запитів лише фабрики, `@/` alias, `import/no-cycle` чистий.
- Тести: `pnpm test:run <file>` / `pnpm test:related <files>`; `pnpm exec eslint --fix <touched files>`; повний `pnpm test:run` один раз у T8 після `ps -Ao pid,pcpu,command -r | grep -E "eslint|vitest|next"`. **Ніколи не запускати repo-wide `pnpm lint`.** DOM-тести починаються з `// @vitest-environment happy-dom`.
- Коміти закінчуються `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`.
- **Відхилення від spec (рішення плану):** (1) id `wfrp.trait.<key>` і `params` не використовуються — `AbilityListEditor` перегенеровує id (`withFreshIds`), а `AbilityParamsSchema` strict; X живе в полях ефекту (одне джерело правди). (2) Броня `wfrpArmour {head, body, arm, leg}` — ключі `HitLocation` 5f, не `arms/legs`. (3) П'ятий ефект `wfrpAttack` для Bite/Claw/Breath/Weapon (+ `magical`); власних якостей атака-Trait не має (фіксовані за видом). (4) Magical — перемикач у рецептах атак, не окремий рецепт; механіки немає (wfrp-опір = лише імунітет), лише `attack.wfrp.magical`. (5) Імпорт юнітів не несе `abilities` → лише регресійний тест. (6) Ефекти Traits з `condition` читачі ігнорують (беруться лише passive без умови). (7) Size/Ward/Armour/атаки діють на юнітів (включно з їхньою расою); на персонажів — лише психологія (носій або джерело Fear через расу).

## Review Focus

1. Кампанія dnd5e/homm зберігає (REST або MCP через `unitsResource`) юніт з `wfrpArmour`/`wfrpWard` → 400 `SYSTEM_TRAITS_UNSUPPORTED`, рядок не змінено; юніт без Traits зберігається як раніше (T2).
2. `wfrpWard.value` 0 / 11 / 2.5 / рядок → відхилено схемою (400 на сервері, помилка в редакторі); Ward 10 спрацьовує лише на d10 = 10, Ward 1 — завжди (T1, T4).
3. Два джерела Fear (Fear 2 і Terror 1) на ворожому боці, повторний старт приєднання (резерв/призов): кожен тестується один раз проти найсильнішого; новий сильніший новачок дає новий тест, слабший — ні; носій Trait і `conditionImmunity: ["fear"]`/`"all"` не тестуються; сплячі вороги лабіринту (dormant) не тестуються й не лякають (T5).
4. Regenerate на непритомному (Wounds 0 і стан Unconscious від ДМ з HP > 0) і мертвому → не лікує, рядка журналу немає; на живому з повним HP — нічого (T4).
5. Юніт без Traits у wfrp-бою дає учасника, ідентичного до 5h-1 (deep equal без `id`-часу); «Оновити з джерела» посеред бою зберігає Size/Ward/AP і атаки-Traits; dnd5e-бій з тим самим юнітом не бачить Traits (T4, T7).

---

### Task 1: ефекти DSL для Traits (ядро)

**Files:**
- Modify: `lib/utils/abilities/schema/kinds.ts`, `lib/utils/abilities/schema/effects.ts`, `lib/utils/abilities/schema/ability.ts` (`effectIssues`), `lib/utils/abilities/registry/effects/index.ts` (+ новий `registry/effects/traits.ts` для describe), `lib/utils/abilities/editor.ts` (`EFFECT_DEFAULTS`, `allowedEffectKinds`), `lib/utils/abilities/__tests__/describe-fixtures.ts` (+ оновити golden snapshot), `messages/{uk,en}/abilityRegistry.json`
- Test: `lib/utils/abilities/schema/__tests__/trait-effects.test.ts`, наявні `registry/__tests__/{registry,fields-contract}.test.ts`, `__tests__/editor.test.ts`, `lib/i18n/__tests__/label-keys-abilityRegistry.test.ts`, `lib/server/content/__tests__/openapi*.test.ts` (бюджет розміру)

**Interfaces — Produces:**

```ts
// kinds.ts
export const TRAIT_SIZES = ["tiny", "little", "small", "average", "large", "enormous", "monstrous"] as const; export type TraitSize;
export const PSYCHOLOGY_KINDS = ["fear", "terror"] as const; export type PsychologyKind;
export const TRAIT_ATTACKS = ["bite", "claw", "breath", "weapon"] as const; export type TraitAttack;
export const TRAIT_EFFECT_KINDS = ["wfrpArmour", "wfrpWard", "wfrpSize", "wfrpPsychology", "wfrpAttack"] as const;
export const isTraitEffectKind = (k: string): k is (typeof TRAIT_EFFECT_KINDS)[number];
// effects.ts — strictObject, без target/duration
wfrpArmour     { head, body, arm, leg: int 0..12 }          // AP_CAP 5f
wfrpWard       { value: int 1..10 }
wfrpSize       { size: TraitSize }
wfrpPsychology { psychology: PsychologyKind; value: int 1..10 }
wfrpAttack     { attack: TraitAttack; damage: int 0..30; rangeFt?: int 5..600 (лише breath); magical?: true }
export const TRAIT_EFFECTS = [...] as const;                 // НЕ в BASE_EFFECTS: randomOf, tool-schemas (AI) і NonRandomEffect їх не бачать
export const EffectSchema = z.discriminatedUnion("kind", [...BASE_EFFECTS, ...TRAIT_EFFECTS, RandomOfSchema]);
export type TraitEffect = Extract<Effect, { kind: (typeof TRAIT_EFFECT_KINDS)[number] }>;
// registry: EffectDefinition += pickable?: false
```

Рішення: усі п'ять — `static: true`, `pickable: false` (не пропонуються у випадному списку видів ефекту в жодній системі; наявний ефект редагується карткою з полями), `apply` — no-op `{ participants, messages: [] }`. `effectIssues`: Trait-ефект у не-passive тригері → наявне `abilities.validation.passiveEffectKinds`; у passive він дозволений (додати в перевірку поряд із `note`). `wfrpAttack.rangeFt` разом з `attack !== "breath"` → refine-помилка `abilities.validation.traitRangeBreathOnly` (новий ключ у тому ж файлі, де `passiveEffectKinds`). Поля реєстру: armour — 4 `number`; ward — `number`; size — `select` (`TRAIT_SIZES`); psychology — `select` + `number`; attack — `select`, `number`, `rangeFt` `number` optional `visibleWhen: attack === "breath"`, `magical` `toggle` optional. Describe (`summary.effects.*`): «Броня {head}/{arm}/{body}/{leg}», «Ward {value}+», «Розмір: {size}», «{psychology} {value}», «{attack} +{damage}» (+ «, магічна»).

- [ ] **Step 1:** failing tests у `trait-effects.test.ts`: кожен ефект парситься в passive-ability; `wfrpWard` 0/11/2.5/"3" відхилено; `wfrpArmour` 13 і −1 відхилено, зайвий ключ відхилено (strict); `wfrpSize` "huge" відхилено; `wfrpAttack` bite з `rangeFt` → issue, breath з `rangeFt` 30 ок; будь-який Trait-ефект у `turnStart`/`hit` ability → issue `passiveEffectKinds`; `randomOf` з Trait-опцією відхилено; `allowedEffectKinds({event:"passive"})` не містить Trait-видів; `describeEffect` для кожного дає не `summary.unknownEffect`.
- [ ] **Step 2:** `pnpm test:run lib/utils/abilities/schema/__tests__/trait-effects.test.ts` → FAIL.
- [ ] **Step 3:** реалізувати; додати фікстури в `describe-fixtures.ts` (мапа типізована по `EffectKind`) і оновити snapshot `describe-golden` (`-u` лише для цього файлу, перевірити diff — нові рядки, старі незмінні); ключі `abilityRegistry` uk/en.
- [ ] **Step 4:** `pnpm test:related lib/utils/abilities/schema/effects.ts lib/utils/abilities/schema/kinds.ts lib/utils/abilities/registry/effects/index.ts lib/utils/abilities/editor.ts` + `pnpm test:run lib/i18n/__tests__/label-keys-abilityRegistry.test.ts lib/server/content/__tests__/openapi.test.ts lib/server/content/__tests__/openapi-4f2.test.ts lib/i18n/__tests__/scope-size.test.ts` → PASS (якщо OpenAPI-бюджет перевищено — підняти з коментарем і назвати у звіті); eslint touched.
- [ ] **Step 5:** commit `feat(abilities): wfrp trait effect kinds (5h-1)`.

### Task 2: модуль Traits wfrp, хук `traits`, серверне відхилення

**Files:**
- Create: `lib/utils/rules/systems/wfrp/traits/{constants.ts,read.ts,unit-build.ts,recipes.ts,index.ts}`, тести `wfrp/traits/__tests__/{read,unit-build,recipes}.test.ts`
- Modify: `lib/utils/rules/systems/types.ts` (`RuleSystemTraits`, `traits?`), `wfrp/index.ts` (`traits: WFRP_TRAITS`), `wfrp/combat/participant.ts` (`WfrpParticipantStats` += `size?`, `ward?`), `lib/utils/abilities/templates/types.ts` (`RecipeCategory` += `"traits"`, `Recipe.textKey?: string`), `lib/server/content/resources/units.ts`, `lib/constants/api-errors.ts` + `messages/{uk,en}/errors.json` (`SYSTEM_TRAITS_UNSUPPORTED`), `lib/utils/rules/systems/__tests__/registry*.test.ts` (wfrp має `traits`, homm/dnd5e — ні)
- Test: `lib/server/content/__tests__/units-resource.test.ts`, `lib/utils/units/__tests__/import-units.test.ts`

**Interfaces — Produces:**

```ts
// constants.ts  (усе // verify against 5e book)
export const SIZE_HIT_PER_STEP = 10;            // атакувальник +10 за крок, коли ціль більша
export const SIZE_DAMAGE_PER_STEP = 1;          // множник (1 + крок) до weapon+SB+SL, коли атакувальник більший
export const AVERAGE_SIZE: TraitSize = "average";
export const BREATH_BLAST = 2; export const BREATH_DEFAULT_RANGE_FT = 36; export const TRAIT_MELEE_CELLS = 1;
export const REGENERATE_DICE = "1d10"; export const NIGHT_VISION_FT = 60;
export const PSYCHOLOGY_PASS_SL = (value: number) => value - 1;   // Fear/Terror X: успіх і SL ≥ X−1
// read.ts
export function traitEffects(abilities: readonly ResolvedAbility[]): TraitEffect[]; // passive && !condition
export function sizeStep(size: TraitSize | undefined): number;  // index у TRAIT_SIZES, undefined → average
// unit-build.ts
export interface UnitTraitAttack { id: string; name: string; profile: WeaponProfile; magical?: true }
export function wfrpUnitBuild(row: { id: string; characteristics?: unknown }, abilities: readonly ResolvedAbility[]): { fields: WfrpParticipantFields; attacks: UnitTraitAttack[] };
// types.ts
export interface RuleSystemTraits {
  recipes: readonly Recipe[];
  unitBuild: typeof wfrpUnitBuild;
  psychology?(ps: BattleParticipant[], ctx: { round: number; rng: Rng; newcomerIds?: readonly string[] }): SystemConditionResult & { testerIds: string[] }; // T5
}
```

Рішення `wfrpUnitBuild`: AP = максимум по локації серед `wfrpArmour`, кап `AP_CAP` (з `equipment/constants.ts`); Ward = найменший поріг; Size = найбільший; без Traits → рівно `wfrpParticipantFields(row)` (ні `size`, ні `ward` ключів). Атака з `wfrpAttack`: id `${row.id}-trait-${ability.key}-${i}` (`ResolvedAbility.key`, стабільний для `refresh` і лічильників), name = назва ability; профіль: bite/claw/weapon → `{ range: "melee", cells: TRAIT_MELEE_CELLS, damageFlat: damage, addSb: true, qualities: [], flaws: [], twoHanded: false }`; breath → `{ range: "ranged", rangeFt: rangeFt ?? BREATH_DEFAULT_RANGE_FT, damageFlat: damage, addSb: false, qualities: [{ key: "blast", value: BREATH_BLAST }], flaws: [], twoHanded: false }`.

Рецепти (14, `category: "traits"`, `scopes: ["ability"]`, `textKey: "wfrpTraits.recipes.<id>"`, ефекти літералами — без `newEffect`): `armour` (X 0..12 на всі 4 локації), `ward` (X 1..10, default 9), `size` (select), `fear` (select fear/terror + X 1..10), `regenerate` (`turnStart` + `heal REGENERATE_DICE`), `bite`/`claw`/`weapon` (X 0..30 + select magical no/yes), `breath` (X, rangeFt, magical), `nightVision` (`flag sense darkvision NIGHT_VISION_FT`), `undead`/`hardy`/`flier`/`swarm` (`note`, текст = `ctx.name`).

Сервер: у `unitsResource.create/update` перед записом — якщо `data.abilities` містить ефект з `isTraitEffectKind(kind)` і `!ruleSystemOf(rules).traits` → `throw new ContentError(API_ERRORS.SYSTEM_TRAITS_UNSUPPORTED, 400)`. Правила кампанії вже читає `keepsCharacteristics` — замінити його на один `loadCampaignSystem(campaignId)` (повертає `RuleSystemDefinition`), щоб не робити два запити; `parseAbilities`/`readAbilities` не чіпати.

- [ ] **Step 1:** failing tests. `read.test`: conditional/non-passive Trait ігнорується; `sizeStep` (undefined → 3, tiny → 0). `unit-build.test`: без Traits → deep equal `wfrpParticipantFields(row)`; Armour 2 + Armour {head 4} → head 4, решта 2; кап 12; Ward 8 і 6 → 6; Size large+small → large; Bite +3 → melee профіль `damageFlat 3`, `addSb`; Breath +5 без rangeFt → ranged 36 ft, blast 2, `addSb false`; magical → прапорець; два однакові Bite → різні id. `recipes.test`: кожен рецепт з дефолтами будує ability, що проходить `AbilitySchema` (імпорт схеми лише в тесті), `textKey` збігається з id; без runtime-імпорту `editor`/`catalog` (перевірити `import`-рядки модуля рядковим тестом або покластися на `client-entry-imports`). Resource-тест: dnd5e + `wfrpWard` → 400 `SYSTEM_TRAITS_UNSUPPORTED` і `prisma.unit.create/update` не викликано; dnd5e без Traits → 201; wfrp + Traits → 201 і збережено; MCP/REST — той самий шлях `defineResource`. `import-units.test`: CSV-рядок зі `specialAbilities` дає лише `note`-ефекти (регрес, wfrp і dnd5e).
- [ ] **Step 2:** run → FAIL. **Step 3:** implement. **Step 4:** `pnpm test:related lib/utils/rules/systems/types.ts lib/utils/rules/systems/wfrp/index.ts lib/server/content/resources/units.ts lib/utils/abilities/templates/types.ts` + `pnpm test:run lib/__tests__/client-entry-imports.test.ts` → PASS; eslint touched. **Step 5:** commit `feat(wfrp): trait registry, unit build and server guard (5h-1)`.

### Task 3: рецепти Traits у `RecipeGallery` (UI + i18n)

**Files:**
- Create: `messages/{uk,en}/wfrpTraits.json` (`recipes.<id>.{label,hint,defaultName,params.<key>,options.<key>.<value>}`), `lib/hooks/abilities/useRecipeText.ts` (поза барелем, як `useRecipeValues`), `lib/i18n/__tests__/label-keys-wfrpTraits.test.ts`
- Modify: `components/abilities/RecipeGallery.tsx`, `components/abilities/RecipeForm.tsx`, `lib/i18n/{config,scopes}.ts` (`wfrpTraits` у `NAMESPACES` і `WFRP_DM_EXTRA`), `global.d.ts`, `app/campaigns/[id]/__tests__/layout.test.tsx` (рядок `data-scope`), `messages/{uk,en}/abilityRegistry.json` (`templates.categories.traits`)
- Test: `components/abilities/__tests__/RecipeGallery.test.tsx`, `lib/hooks/abilities/__tests__/useRecipeText.test.ts`

**Interfaces:**
- Consumes: `useRuleSystem(campaignId)` (`ready`, `system.traits?.recipes`), `useAbilityEditor().campaignId`, `Recipe.textKey`.
- Produces: `useRecipeText(): (r: Recipe, suffix: string) => string` — `r.textKey ? root(\`${r.textKey}.${suffix}\`) : tr(\`templates.${r.id}.${suffix}\`)`, де `root = useTranslator()`, `tr = useTranslator("abilityRegistry")`; опції select-параметрів рецептів Traits — `${textKey}.options.${p.key}.${value}`. Gallery: `recipes = [...RECIPES, ...(ready ? system.traits?.recipes ?? [] : [])]`, категорія `traits` з'являється в `HudChipTabs` лише коли такі рецепти є; усі місця `tr(\`templates.${r.id}…\`)` у Gallery/Form → `text(r, …)`.

- [ ] **Step 1:** failing tests: DOM-тест Gallery з wfrp `useRuleSystem` (мок) → є вкладка «traits» і картка `ward`; вибір → форма з параметром X (default 9), «Створити» віддає `onPick` з ability `{ trigger: passive, effects: [{ kind: "wfrpWard", value: 9 }] }`; dnd5e-мок → вкладки й карток Traits немає, наявні рецепти рендеряться як раніше; поки `ready: false` — без Traits і без падіння. `useRecipeText`: textKey-рецепт → повний ключ, звичайний → `templates.<id>`. `label-keys-wfrpTraits`: кожен рецепт із `WFRP_TRAITS.recipes` має label/hint/defaultName/params/options у uk і en. Layout-тест: рядок scope ДМ містить `wfrpTraits`. `pnpm test:run lib/i18n` (паритет, scope-size).
- [ ] **Step 2:** run → FAIL. **Step 3:** implement (HUD-стиль з `.claude/rules/components.md`; 375 px — одна колонка). **Step 4:** `pnpm test:related components/abilities/RecipeGallery.tsx components/abilities/RecipeForm.tsx lib/i18n/scopes.ts` + `pnpm test:run lib/i18n lib/__tests__/client-entry-imports.test.ts` → PASS; eslint touched. **Step 5:** commit `feat(wfrp): trait recipes in the ability gallery (5h-1)`.

---

### Task 4: Traits у бою — учасник, атаки, Ward, Size, Regenerate

**Files:**
- Modify: `lib/utils/battle/participant/from-unit.ts`, `lib/utils/battle/participant/extract-wfrp-attacks.ts` (винести `wfrpAttackFromProfile`), `types/battle.ts` (`BattleAttack.wfrp` += `magical?: true`), `lib/utils/rules/systems/wfrp/traits/size.ts` (create), `wfrp/combat/mitigate.ts`, `wfrp/combat/resolve-attack.ts`, `messages/{uk,en}/battleWfrp.json` (`damage.steps.ward` з `{roll}`/`{ward}`, `damage.steps.size`), `lib/i18n/__tests__/label-keys-battleWfrp.test.ts` (якщо перелічує кроки)
- Test: `lib/utils/battle/participant/__tests__/from-unit-traits.test.ts`, `wfrp/traits/__tests__/size.test.ts`, `wfrp/combat/__tests__/mitigate-traits.test.ts`, `lib/utils/battle/participant/__tests__/refresh-from-source.test.ts` (доповнити), `lib/utils/abilities/registry/effects/__tests__/regenerate.test.ts`

**Interfaces:**
- Consumes: `ruleSystemOf(rules).traits?.unitBuild`, `UnitTraitAttack`, `WeaponProfile`, `sizeStep`, константи T2.
- Produces:

```ts
// extract-wfrp-attacks.ts — extractWfrpAttacks використовує його ж (поведінка 5f незмінна)
export function wfrpAttackFromProfile(id: string, name: string, profile: WeaponProfile, extra?: { magical?: true }): ExtractedAttack;
// size.ts
export function sizeHitMod(attacker: BattleParticipant, target: BattleParticipant): number;   // SIZE_HIT_PER_STEP × max(0, step(target) − step(attacker))
export function sizeDamageBonus(attacker: BattleParticipant, target: BattleParticipant, base: number): number; // SIZE_DAMAGE_PER_STEP × max(0, step(a) − step(t)) × max(0, base)
export function wardRoll(target: BattleParticipant, rng: Rng): { roll: number; saved: boolean } | null; // null без ward; rollDie(10) ≥ ward
```

`from-unit`: зібрати `resolvedAbilities` один раз (винести з `unitBattleData` у локальну змінну й передати в `unitAbilities`/`unitBattleData`); `const traits = ruleSystemOf(rules).traits?.unitBuild(unit, resolved)`; у `abilities` — `...(traits ? traits.fields : participantFields?.(unit))`; `attacks: [...unitBattleAttacks(unit), ...(traits?.attacks ?? []).map((a) => wfrpAttackFromProfile(a.id, a.name, a.profile, a.magical && { magical: true }))]`. `mitigateWfrpDamage`: після `amount <= 0` — `wardRoll`; `saved` → `{ amount: 0, steps: [{ key: "ward", value: 0, label: textRef("battleWfrp.damage.steps.ward", { roll, ward }), side: "target" }], totalLabel }` без крита й без `afterHit`; інакше `size`-крок через `extra` у `computeWfrpDamage` (`base` = weapon + SB (якщо не `noSb`) + netSl). `resolveWfrpAttack`: `+ sizeHitMod(attacker, target)` до цілі атакувальника в ranged і melee (поряд із `toHit`).

- [ ] **Step 1:** failing tests. `from-unit-traits`: wfrp-юніт з Armour 3 / Ward 7 / Size large / Bite +2 / Breath +4 → `abilities.wfrp.ap` усі 3, `ward 7`, `size "large"`; атаки = 5e-атаки юніта + 2 трейт-атаки (bite: MELEE, `damageBonus 2`, `damageDice ""`, `wfrp.reachCells 1`; breath: RANGED, `range "36 ft"`, `targetType "aoe"`, `wfrp.blastRadius 2`, `wfrp.noSb`); **без Traits** → учасник deep-equal до результату з `participantFields` (кейс Review Focus 5); dnd5e-правила з тими ж abilities → без `abilities.wfrp`, атаки лише 5e. `refresh-from-source`: свіжий учасник з `size`/`ward`/трейт-атаками заміняє живого, HP і ефекти живі (Review Focus 5). `size.test`: medium vs large → +10 атакувальнику, large vs medium → 0; бонус шкоди large→average при base 6 → 6, enormous→small → 18, base ≤ 0 → 0. `mitigate-traits`: Ward 7 з rng, що дає d10 = 7 → amount 0, один крок `ward`, крит не кидається навіть при `crit: true`; d10 = 6 → звичайна шкода; Ward 10 / d10 9 → не рятує, d10 10 → рятує; Ward 1 → завжди (Review Focus 2); без `ward` rng не споживається (послідовність наявних тестів незмінна); size-крок у порядку після `netSl` і перед `tb`. `resolve-attack`: середній проти великого — ціль +10 (ranged і melee). `regenerate.test` (через `runAbilities` з `{ type: "turnStart", actorId }` і ability з рецепта `regenerate`): поранений активний лікується (HP зростає ≤ max); UNCONSCIOUS з Wounds 0, UNCONSCIOUS з HP 5 (стан ДМ) і DEAD → HP незмінний і жодного рядка `abilityText.log.heal|revive` (Review Focus 4); повний HP → без рядка.
- [ ] **Step 2:** run → FAIL. **Step 3:** implement. **Step 4:** `pnpm test:related lib/utils/battle/participant/from-unit.ts lib/utils/battle/participant/extract-wfrp-attacks.ts lib/utils/rules/systems/wfrp/combat/mitigate.ts lib/utils/rules/systems/wfrp/combat/resolve-attack.ts` → PASS (зокрема 5f `extract-attacks-wfrp` і `lib/server/battles/__tests__/mutations/wfrp-battle-e2e.test.ts`); eslint touched; i18n паритет. **Step 5:** commit `feat(wfrp): unit traits in battle — armour, ward, size, attacks (5h-1)`.

### Task 5: психологія Fear/Terror на старті й при приєднанні

**Files:**
- Create: `lib/utils/rules/systems/wfrp/traits/psychology.ts` (+ `__tests__/psychology.test.ts`), `lib/utils/battle/turn/join-triggers.ts` (+ `__tests__/join-triggers.test.ts`)
- Modify: `wfrp/traits/index.ts` (`psychology`), `wfrp/conditions/conceal.ts` (`psychologyPass|Fail` → `…Hidden` без `target`), `types/battle.ts` (`battleData.psychologyTested?: Partial<Record<PsychologyKind, number>>`), `lib/utils/battle/store/{types.ts,split-participant.ts,participant-patch.ts}` (поле в `ParticipantState`, як `ammo`), `start-battle-handler.ts` (`applyStartOfBattleAndSort`), `reveal-participant-mutation.ts`, `lib/utils/battle/turn/round-start.ts` (+ `RoundStartResult.psychology`), `run-advance-turn-loop.ts` (`systemEntry` += необов'язкові `targets`), `messages/{uk,en}/battleWfrp.json` (`log.psychologyPass|psychologyFail|psychologyPassHidden|psychologyFailHidden`, `psychology.fear|terror`)
- Test: `lib/utils/battle/view/__tests__/visibility*.test.ts` (доповнити), `lib/utils/battle/store/__tests__/split-participant.test.ts` (доповнити), наявні тести старту/резерву/round-start

**Interfaces:**
- Consumes: `traitEffects`, `PSYCHOLOGY_PASS_SL`, `applyWfrpCondition`, `resolvePercentileTest`, `skillTarget`/`value`, `selfTestMod`, `findFlags`, `inPlay`, `runAbilities`.
- Produces:

```ts
// psychology.ts
export function wfrpPsychology(ps: BattleParticipant[], ctx: { round: number; rng: Rng; newcomerIds?: readonly string[] }): SystemConditionResult & { testerIds: string[] };
// join-triggers.ts (ядро; заміна трьох викликів battleStart)
export function runJoinTriggers(order: BattleParticipant[], ctx: { round: number; rng: Rng; map: BattleMapConfig | null; rules: Ruleset }, newcomerIds?: readonly string[]):
  { participants: BattleParticipant[]; messages: LogLine[]; psychology: { lines: LogLine[]; targets: BattleAction["targets"] } };
```

Правила (`// verify against 5e book` у константах): загроза джерела = Terror, якщо є, інакше Fear, значення = максимум серед його passive `wfrpPsychology`. Тестувальник — `inPlay`, без власного `wfrpPsychology`, без `conditionImmunity` `"all"`/`"fear"`; джерела — `inPlay` учасники протилежного боку із загрозою. З `newcomerIds`: тестуються лише пари, де тестувальник або джерело — новачок. Тест лише якщо найсильніша загроза вища за `psychologyTested[kind]` (запам'ятати після тесту незалежно від результату). Ціль = `skillTarget(c, "cool")?.target ?? value(c, "wp")` + `selfTestMod(p, "test")`; пройдено = success/critical і `sl ≥ PSYCHOLOGY_PASS_SL(value)`. Fear провал → `broken` 1 рівень; Terror: тест Terror (провал → `broken` `1 + max(0, −sl)`) і потім тест Fear того ж X (провал → ще +1). `sourceName` = ім'я джерела. Рядок: `battleWfrp.log.psychologyPass|Fail { name, source, kind: dynamicTextRef("battleWfrp.psychology.<kind>"), value, roll, target, sl }`. `runJoinTriggers` = `runAbilities(battleStart, newcomerIds)` → `ruleSystemOf(rules).traits?.psychology?.(…)`; `targets` = тестувальники `{ participantId, participantName }`. Записи: старт — окремий `BattleAction` у `triggerLogEntries` з цими `targets`; резерв — окремий `dmEvent(round, lines, targets)`; round-start — `systemEntry(…, targets)`. Сплячі вороги лабіринту (`modeEnter` → dormant) поза `inPlay`.

- [ ] **Step 1:** failing tests. `psychology.test`: Fear 1 vs герой Cool 40, preset 30 (SL +1) → пройшов, без `broken`, `psychologyTested.fear = 1`; preset 70 → `broken` 1 і рядок Fail; Fear 3 при SL +1 → провал (потрібно ≥ 2); Terror 2, провал SL −2 → `broken` 3 + тест Fear; два джерела (Fear 2, Fear 1) → один тест проти 2 (Review Focus 3); повторний виклик без новачків → нічого; новачок Fear 3 → новий тест, новачок Fear 1 → ні; новачок-тестувальник проти наявного джерела → тест лише для нього; союзник джерела не тестується; носій Trait на іншому боці не тестується; імунітет `["fear"]` і `"all"` → без тесту; dormant → ні джерело, ні тестувальник; d20-правила → `traits` немає, `runJoinTriggers` = лише `runAbilities` (результат ідентичний). `join-triggers.test`: повертає `psychology.targets` = тестувальники. Візуальна приватність: `sanitizeLogEntry` для не-ДМ над записом з ворожим тестувальником → рядок `psychologyFailHidden` без `target`; ДМ бачить повний. Store: `psychologyTested` іде в `state`, не в `snapshot`, і потрапляє в патч дельти. Старт-хендлер (мок як у наявних тестах `buildStartOrder`): wfrp-бій з Fear-юнітом → окремий запис журналу з `targets`; резерв і призов з Fear → тест для старих учасників.
- [ ] **Step 2:** run → FAIL. **Step 3:** implement. **Step 4:** `pnpm test:related lib/server/battles/mutations/start/start-battle-handler.ts lib/server/battles/mutations/reveal-participant/reveal-participant-mutation.ts lib/utils/battle/turn/round-start.ts lib/utils/battle/turn/run-advance-turn-loop.ts lib/utils/battle/store/split-participant.ts lib/utils/rules/systems/wfrp/conditions/conceal.ts` → PASS; eslint touched; i18n паритет. **Step 5:** commit `feat(wfrp): fear and terror tests on battle join (5h-1)`.

---

### Task 6: чесний баланс з AP, Ward і Size

**Files:**
- Modify: `lib/utils/rules/systems/types.ts` (`hitModel.durability?(p): number`), `wfrp/combat/hit-model.ts`, `wfrp/combat/location.ts` (експорт ваг локацій з `LOCATION_TABLE`), `wfrp/combat/constants.ts` (`BALANCE_REF_INCOMING`), `lib/utils/battle/balance/hit-model.ts`, `lib/server/battles/balance/unit-library.ts`
- Test: `wfrp/combat/__tests__/hit-model.test.ts`, `lib/utils/battle/balance/__tests__/hit-model.test.ts`, `lib/server/battles/balance/__tests__/unit-library*.test.ts`

**Interfaces — Produces:**

```ts
export const LOCATION_WEIGHTS: Record<HitLocation, number>; // з меж LOCATION_TABLE: head .09, arm .35, body .35, leg .21
export const BALANCE_REF_INCOMING = 8;                       // verify against 5e book
// wfrpHitModel
durability(p) = clamp(REF_IN / max(MIN_DAMAGE, REF_IN − (tb − BALANCE_REF_TB) − Σ w·ap) / (1 − min(0.9, wardChance)), 0.25, 10); wardChance = ward ? (11 − ward) / 10 : 0
defense(p)   −= SIZE_HIT_PER_STEP × max(0, sizeStep(p) − sizeStep(AVERAGE_SIZE))
damage(p)     — найкраща атака: weapon + (noSb ? 0 : SB), × (1 + SIZE_DAMAGE_PER_STEP × max(0, step − average)), − REF_TB − REF_AP, мін. MIN_DAMAGE
// hitModelHeroStats / hitModelUnitStats: hp = round(hp × (model.durability?.(p) ?? 1)), kpi = dpr / hp
```

Рішення: `builtUnitsById(units, races, rules?)` отримує `rules` лише коли `ruleSystemOf(rules).combat.hitModel` визначено (d20-бібліотека будується як раніше — DC/мораль не змінюються). Броня героїв з 5f відтепер теж підвищує їхній ефективний HP (бажано за spec «fair враховує бронь»).

- [ ] **Step 1:** failing tests: `durability` без AP/Ward/TB=REF → 1; AP 2 на всіх локаціях → 8/6 ≈ 1.33; Ward 9 → ×1/(1−0.2) = 1.25; Ward 1 → кап 0.9 → ×10 (clamp); великий TB → не нескінченність (мін. `MIN_DAMAGE`); `defense` large = базовий − 10; `damage` breath без SB; `hitModelUnitStats` множить hp і перераховує kpi; модель без `durability` → hp незмінний (d20 — шлях без моделі не змінено, наявні тести зелені); `loadUnitLibraryStats` для wfrp-кампанії: учасник побудований з `rules` (у мок-`createBattleParticipantFromUnit` прийшли wfrp-правила), для dnd5e — без.
- [ ] **Step 2:** run → FAIL. **Step 3:** implement. **Step 4:** `pnpm test:related lib/utils/battle/balance/hit-model.ts lib/utils/rules/systems/wfrp/combat/hit-model.ts lib/server/battles/balance/unit-library.ts` → PASS; eslint touched. **Step 5:** commit `feat(wfrp): fair balance reads armour, ward and size (5h-1)`.

### Task 7: e2e бою з Traits і регрес d20

**Files:**
- Create: `lib/server/battles/__tests__/mutations/wfrp-traits-e2e.test.ts` (мок-стиль `wfrp-battle-e2e.test.ts`)
- Test: той самий файл

- [ ] **Step 1:** тест: wfrp-кампанія, герой-гравець (WS 40, Cool 35) проти юніта «Troll» з abilities із рецептів `armour 2`, `ward 9`, `size large`, `fear 1`, `regenerate`, `bite 4`; старт → окремий запис психології, у героя на фіксованому rng провал → `broken`; атака героя: на d10 < 9 шкода зменшена на AP 2 і крок `ward` відсутній, на d10 ≥ 9 шкода 0 і крок `ward`; атака Troll'я bite → крок `size` (large vs average) і SB; хід Troll'я → Regenerate лікує; бій доводиться до кінця (Troll на 0 Wounds — Regenerate на непритомному більше не лікує), дельти не містять повної сцени, `psychologyTested` у стані. Регрес: dnd5e-кампанія з тим самим юнітом (abilities записані напряму в БД-мок) → старт без запису психології, учасник без `abilities.wfrp`, атаки лише 5e, шкода d20-конвеєром.
- [ ] **Step 2:** run → FAIL (до T4–T6 — або одразу PASS, якщо вони вже змерджені; тоді перевірити, що тест падає при вимкненні `traits.psychology`). **Step 3:** виправити знайдені дефекти в коді T4–T6 (не в тесті). **Step 4:** `pnpm test:run lib/server/battles/__tests__/mutations/wfrp-traits-e2e.test.ts lib/server/battles/__tests__/mutations/wfrp-battle-e2e.test.ts` → PASS; eslint touched. **Step 5:** commit `test(wfrp): unit traits battle e2e (5h-1)`.

---

### Task 8 (контролер, після D5): перевірка, cleanup, docs, live-run, рев'ю

- [ ] `ps -Ao pid,pcpu,command -r | grep -E "eslint|vitest|next"` → якщо чужий важкий прогін, чекати; потім один повний `pnpm test:run`; `pnpm exec tsc --noEmit`; eslint лише на `git diff --name-only c9f713735^..HEAD -- '*.ts' '*.tsx'`.
- [ ] `/simplify` на діапазоні `c9f713735^..HEAD` (1 агент, Sonnet): дублікати (`traitEffects` проти `bakedEffects`, три місця `runJoinTriggers`), зайві коментарі; тести після — `pnpm test:changed`.
- [ ] Docs (окремий коміт `docs(wfrp): 5h-1 limits and status`): `docs/architecture/rule-systems.md` — рядок `traits` у таблиці хуків (`recipes`/`unitBuild`/`psychology`, `hitModel.durability`), рядок `wfrp/traits/` у «Що де лежить», новий розділ **«Межі 5h-1»** (відхилення 1–7 з Global Constraints; Breath = Blast-коло, не конус; Flier/Swarm/Magical/Hardy без механіки; «бачить істоту» = будь-який `inPlay` ворог, без лінії зору; Traits персонажів — лише психологія; ефекти з `condition` ігноруються; rng Ward споживається лише з Ward; `builtUnitsById` тепер з `rules` для систем із `hitModel`; `scope-size` після 5h-1 з фактичними числами); у **єдиний список «Звірити з книгою»** — пункт «Traits: `wfrp/traits/constants.ts` (поріг Ward на d10, кроки й множники Size, критерій SL і рівні `broken` Fear/Terror, Breath: радіус/дальність/без SB, Regenerate 1d10, Night Vision 60 ft, перелік атак-Traits і `TRAIT_SIZES`), `BALANCE_REF_INCOMING`». `docs/architecture/battle.md` — `runJoinTriggers` і `battleData.psychologyTested` у стані; `docs/architecture/abilities.md` — Trait-ефекти (passive-only, `pickable: false`, поза `BASE_EFFECTS`); `docs/STATUS.md` — 5h-1 зроблено, далі 5h-2.
- [ ] Live-run окремим Sonnet-агентом на wfrp dev-сервері (інлайн-override БД), 375 px через iframe, JS/текст-перевірки, скріншоти scale 0.5: ДМ створює юніт «Troll» через галерею (вкладка Traits: Armour 2, Ward 9, Size large, Fear 1, Regenerate, Bite 4, Breath 3) → форма зберігається, опис ability читабельний uk/en; Ward 11 у картці → помилка валідації; бій герой проти Troll'я: запис психології, `broken` на герої, атаки з кроками AP/Ward/Size у журналі, Breath б'є колом, Regenerate на ході; регрес dnd5e-кампанії: у галереї немає Traits, бій без змін. Звіт PASS/FAIL; тестові дані видалити.
- [ ] Фінальне Opus-рев'ю `c9f713735^..HEAD` (фокус — Review Focus 1–5, приватність логу, дельти/стан, баланс d20 незмінний); виправлення одним диспетчем Sonnet; оновити memory `project-wfrp`. **Pre-deploy gate (battle-sweep homm/dnd5e) — не частина цього плану, лише наприкінці епіку.**

## Self-review (покриття spec)

Модель A (abilities, без міграцій) → T1, T2, «Факти з коду»; обсяг: Armour/Ward/Size/Fear/Terror → T1 (схема), T2 (збирання), T4 (бій), T5 (психологія); Weapon/Bite/Claw/Breath/Magical → T1, T2, T4; Regenerate → T2 (рецепт), T4 (тест непритомного/мертвого); Flier/Swarm/наративні → T2 (`note`/`sense`); `parseAbilities` нейтральний + відхилення не-wfrp → T2 (ресурс; імпорт — регрес-тест, відхилення 5); рецепти в `RecipeGallery` без окремого UI → T3; потік у бою (from-unit, resolveAttack/mitigate, battleStart, hitModel) → T4, T5, T6; приватність 5c-2 → T5; імунітет і носій → T5; e2e + регрес d20 → T7; docs, «Звірити з книгою», STATUS, live-run, Opus-рев'ю → T8. Імена між задачами звірено: `TRAIT_EFFECT_KINDS`/`isTraitEffectKind` (T1→T2), `RuleSystemTraits.unitBuild`/`UnitTraitAttack` (T2→T4), `psychology`/`runJoinTriggers` (T2 інтерфейс → T5), `sizeStep`/`AVERAGE_SIZE`/`SIZE_*` (T2→T4, T6), `wfrpAttackFromProfile` (T4), `psychologyTested` (T5→T7). Відхилення від spec — у Global Constraints.
