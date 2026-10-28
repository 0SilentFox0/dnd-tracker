# Етап 4f-3: магічні предмети — план реалізації

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** артефакт стає предметом 5e: властивість («Flame Tongue», «Weapon +1») видається разом із базою (складений ref `<baseId>+<propertyId>`), звичайне спорядження неунікальне, налаштування (≤ ліміту `rules.items.attunementLimit`), заряди — пул предмета з відновленням на відпочинку, витратні предмети з кількістю в бою; рушій отримує `damageBonus` зброї, умову `withThisItem`, прапорець `critImmunity`, `modifyStat … atLeast`; конвертер SRD 5.2 дає 32 властивості й 248 унікальних предметів; дані й локальний шаблон перезалито.

**Architecture:** модель предмета — один запис `{ type: "itemStats", value: JSON }` у наявній колонці `artifacts.modifiers` (без міграції `artifacts`); читач `itemStatsFromRow` без zod (ходить у клієнтські чанки). Значення в `equipped`/`stash`/`attuned` — ref; **єдиний вхід** для всіх читачів — `resolveItemRows` / `resolveItemRow` (`lib/utils/items/resolve.ts`): розбирає ref, складає синтетичний рядок (`composeItemRow`), відкидає невідоме, застосовує налаштування. Унікальність — `findHolder(…, isUnique)` лише для артефактів без `item.unique === false` і не-властивостей; HOMM-артефакти без поля лишаються унікальними. Заряди — механізм пулів 4f-2 (`battleData.pools`, `abilityUsage[poolKey]`, `resources.charges`) з ключами `pool:item:<ref>` і `pool:consumable:<itemId>`; `rest: null` — не відновлюються. Налаштування — нова колонка `character_inventories.attuned` (міграція лише розширює). Усі нові шляхи закриті `rules.items.enabled`, складеним ref або `item.unique === false`.

**Tech Stack:** TypeScript strict, Next.js 16, React 19, Prisma 6 (PostgreSQL), Zod 4, Vitest (+ happy-dom для компонентів), `tsx`-скрипти (`tsconfig.scripts.json`).

**Spec:** `docs/archive/superpowers/specs/2026-10-22-constructor-stage4-5e-design.md` — розділ «## 4f-3. Дизайн: магічні предмети» (§1–§11), «Загальні правила етапу 4», «Ризики» (останні чотири пункти — 4f-3). Рішення щодо відкритих питань спеку (користувач спав, прийнято рекомендоване): (1) окрема секція `rules.items`; при `enabled` предмети слотів `item`/`ring` зі сховища **носяться** (діють); (2) модель `item` — запис у `modifiers`; (3) ref `<baseId>+<propertyId>` без рядка примірника; (4) колонка `attuned`; (5) витратні — `SpecialItem.artifactId`; (6) магічні предмети SRD **неунікальні**, крім Dragon Orb (рідкість artifact); (7) заряди відновлюються **повністю на довгому відпочинку** (або короткому, якщо так у тексті); (8) однакові складені предмети в одного героя **ділять заряди**; (9) блок «Предмет» у формі артефакта — поля налаштування/зарядів/витратного лише при `items.enabled`.

## Global Constraints

- Worktree `/Users/silentfox/Work/dnd-tracker-constructor`, гілка `feat/constructor`; `/Users/silentfox/Work/dnd-tracker` не чіпати. БД лише `postgresql://postgres:postgres@localhost:54322/constructor`; prod і prodcopy не чіпати.
- **Нульова зміна HOMM5.** Кожен новий шлях закритий однією з умов: `rules.items.enabled` (носіння зі сховища, налаштування, витратні в бою, дії `attune`/`unattune`), складений ref (містить `+`), `item.unique === false` (дублікати, «вільний» для видачі, «спорядження» в довіднику), нове необов'язкове поле присутнє (`item`, `damageBonus`, `attuned`, `artifactId` у `SpecialItem`, `attackSourceId`), або новий ключ (`withThisItem`, `critImmunity`, `atLeast`), якого немає в HOMM-контенті. HOMM-артефакт без `item` — унікальний, передається, не носиться зі сховища, без пулів (у `battleData` немає ключа `pools`).
- **Наявні тести не редагувати** — лише нові `it(...)`/файли. Єдині дозволені правки наявних тестів (спек свідомо змінює вихід): `lib/utils/rules/__tests__/schema.test.ts` — рядок `items: { enabled: false, attunementLimit: 3 },` у повному очікуванні `parseRules({})` (задача 1, як 4e додав `encounters`); `scripts/srd/__tests__/preset.test.ts` — `toHaveLength(17)` → `toHaveLength(18)` (у `OPEN5E_FILES` додається `MagicItem`, задача 15); `scripts/srd/__tests__/data-integrity.test.ts` — `EXPECTED.artifacts` 51 → 331 (задача 17); `scripts/srd/__tests__/data-integrity-4f2.test.ts` — у твердженні про 12 обладунків фільтр `a.slot === "armor"` → `a.slot === "armor" && a.rarity === "common"` (властивості й унікальна броня теж у слоті armor; задача 17); і, лише якщо документ OpenAPI ≥ 135 000 символів, межа `135_000` → `140_000` в `lib/server/content/__tests__/openapi.test.ts` і `openapi-4f2.test.ts` (задача 2 або 17, виміряний розмір — у повідомленні коміту).
- Рушій читає бонуси лише через `collectModifiers`/`runAbilities`; колонку `abilities` — лише через `lib/utils/abilities/read.ts` (`artifactAbilities`). Нових записувачів `battle_participants.snapshot` немає (пули — частина `battleData`, яку пише наявний конвеєр разом із `snapshotHash`).
- **Чанки без zod** (`lib/__tests__/client-entry-imports.test.ts`: бій і профіль): `lib/utils/items/{ref,item-row,compose,resolve,pools,consumables,grant}.ts` не імпортують `zod` ні напряму, ні транзитивно (лише `import type`). Zod-схема — окремо в `lib/utils/items/item-stats.ts`. Барелю `lib/utils/items/index.ts` немає — імпорт за модулем.
- Нові поля спільних типів — **необов'язкові** (`StashState.attuned?`, `SpecialItem.artifactId?`, `StashView.attunement?`, `StashArtifact.{attunement,carried,charges,gear}?`, `FreeArtifact.{property,consumable,gear}?`, `SheetArtifact.{attunement,carried}?`, `CharacterSheet.items.attunement?`, `ExtractedAttack.damageBonus?`/`BattleAttack.damageBonus?`, `attackSourceId?` у подіях `attack`/`hit`, `ConditionContext.sourceId?`, `EquippedArtifactRow.carried?`, `RosterHero.equipped[slot].gear?`, `ArtifactForReference.gear?`, `ArtifactFormState.item?`, `ResourcesEditBody.charges?`), щоб наявні тести компілювались без змін. `AbilityPool.rest` і `CharacterResources.charges[*].rest` розширюються до `"short" | "long" | null`.
- Міграція одна: `prisma/migrations/20261102000000_inventory_attuned/migration.sql` = `ALTER TABLE "character_inventories" ADD COLUMN "attuned" JSONB NOT NULL DEFAULT '[]';` (лише розширення; таблиця вже з RLS). Застосування: `set -a; source .env.local; set +a; pnpm exec prisma migrate deploy && pnpm exec prisma generate` (**не** `migrate dev`).
- Ref: `ITEM_REF_RE = /^[^+\s]{1,64}(\+[^+\s]{1,64})?$/`; `itemRef(baseId, propertyId?)`; ключі пулів `pool:item:<ref>` і `pool:consumable:<itemId>`; ключ пулу вміння артефакта — `ITEM_CHARGES_KEY = "charges"`.
- Обмеження моделі: `charges.max` 1–50, `appliesTo.bases` ≤ 60 назв, `damageBonus` −20…20, кількість витратного при видачі 1–99 (запис `SpecialItem.quantity` ≤ 9999), `attunementLimit` 1–10, `atLeast` 1–30.
- OpenAPI (`lib/server/content/__tests__/openapi.test.ts`, межа `< 135_000`, зараз 130 801): `ItemStats` реєструється в `SHARED_SCHEMAS` (`$ref`); межу піднімати лише за умовою вище.
- Шари й стиль: компоненти не імпортують `@/lib/api/*`; UI українською, ідентифікатори англійською; мінімум коментарів (лише неочевидне «чому»). ESLint: порожні рядки навколо `const`/`let`/`if`/`return`/блоків, `simple-import-sort`, `import/no-cycle`, `no-console` (у `scripts/` дозволено `info/warn/error`). Імпорти всередині `scripts/srd` — відносні, з `lib/` — через `@/`. Компоненти, що читають правила з `useCampaignRules`, звертаються як `data?.items?.enabled` (наявні моки повертають лише `classes`).
- Тести: під час роботи `pnpm test:run <files>`; після змін типів — `pnpm exec tsc --noEmit -p tsconfig.json` (охоплює тести й `scripts/**`); повний `pnpm test:run`, `pnpm lint`, `pnpm build` — лише в задачі 18.
- Коміти з трейлером `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`; `.superpowers/` не комітити.

## Review Focus

1. **HOMM-кампанія без змін**: унікальний артефакт не видається другому герою (409 з ім'ям власника), той самий артефакт у двох клітинках — 409 `ARTIFACT_ALREADY_EQUIPPED`, артефакт слота `item`/`ring` у сховищі не діє, у `battleData` немає `pools`, сет рахується як раніше. Тести в задачах 4, 6, 7.
2. **Видалена база або властивість у ref** (синхронізація з джерела видаляє артефакти напряму): `resolveItemRows` тихо пропускає ref, сховище не показує його, бій не падає, ліміт налаштування не рахує застарілий ref. Тести в задачах 4 і 6.
3. **Два однакові неунікальні предмети в одного героя** (два SRD-кинджали в «Зброя» + «Щит»): дві атаки (друга — `:off`), уміння й пули не дублюються, заряди спільні; повторна видача того самого ref у сховище, де він уже є, — 409 `ITEM_ALREADY_IN_STASH` (а не мовчазна втрата через `normalizeStash`). Тести в задачах 4, 5, 7.
4. **Налаштування**: при `items.enabled` неналаштований складений предмет — лише статі бази (без `damageBonus`/райдерів), неналаштований унікальний — без `bonuses`/`abilities`/пулу, але лишається зброєю/бронею; при `items.enabled = false` налаштування ігнорується (усе діє, як HOMM). Тести в задачах 4 і 8.
5. **Витратні на межах**: усі використані → запис зникає; ДМ видалив запис під час бою → списання пропускає його без помилки; бій, видалений без завершення, — нічого не пише; витратний без `items.enabled` у бій не потрапляє. Тести в задачі 9.

## Рішення щодо неоднозначностей спеку

- **Запис моделі.** `ItemModifierType` має один тип `STATS = "itemStats"` — значення `JSON.stringify(ItemStats)`; `weaponStatsFromRow`/`armorStatsFromRow` його ігнорують (вони беруть лише свої типи). Порожня модель — запису немає.
- **Властивість і статі зброї.** Рядок-властивість може мати `weapon` лише з `attackBonus`/`damageBonus` («+N»); `armor` — ні (`ITEM_PROPERTY_STATS`). `composeItemRow` сумує `bonuses` (числові ключі) і `damageBonus`.
- **Регулярка ref** — `^[^+\s]{1,64}(\+[^+\s]{1,64})?$` замість `^[a-z0-9]+…` спеку: наявні тести й сиди використовують id з дефісами (`ring-a`, `sword-1`).
- **Шаблон назви.** `{base}` — повна назва бази, `{name}` — назва властивості; порожньо — `"{name} ({base})"`. SRD пише «Armor of Resistance (Padded)», а база називається «Padded Armor»; тому перевірка 513 назв варіантів порівнює назви після нормалізації (без слова «Armor», регістр і пробіли ігноруються) і виконується **в конвертері під час збирання** (сирий `MagicItem.json` є лише в каталозі джерела, не в репо) — `pnpm srd:build` падає з переліком розбіжностей і друкує `composed names verified: 513`.
- **Сховище лишається множиною** (`normalizeStash` без змін): однакові неунікальні предмети можна тримати вдягненими в різних клітинках, у сховищі — один примірник ref; видача або «зняти в підсумок» ref, який уже лежить у сховищі, — 409 `ITEM_ALREADY_IN_STASH`.
- **Налаштування знімається** при `stash` (зняти з клітинки), `revoke`, передачі — якщо герой більше не тримає цей ref (дублікат у другій клітинці зберігає налаштування). Повторне `attune` — 409 `ALREADY_ATTUNED`; `unattune` неналаштованого — 409 `ITEM_NOT_ATTUNED`. Ліміт рахує лише ref, які герой тримає й які розв'язуються.
- **Носіння** (`activeItemRefs`): вдягнені клітинки + при `items.enabled` ref зі сховища, база якого в слоті `item` або `ring` і який не вдягнено. Носимий рядок має `carried: true` і слот бази; на листі він не потрапляє в сітку, «Зняти в підсумок» для нього немає.
- **Видача.** `grant { artifactId, baseId?, quantity? }`: властивість без `baseId` — 422 `ITEM_PROPERTY_NEEDS_BASE`; `baseId` для не-властивості, база-властивість чи база, що не проходить `matchesAppliesTo`, — 422 `ITEM_BASE_MISMATCH`; витратний — у `items` (кількість додається до запису з тим самим `artifactId`, обрізається до 9999); інакше ref у сховище. Перевірка власника — `findHolder` з `isUnique` за рядками (самого героя теж, як зараз). Журнал пише `artifactName` у `delta` для складеного ref (наявний `read-log` бере його, коли id не розв'язався).
- **Пули предметів** — для кожного **активного** рядка з `charges` (дедуплікація за ref): `pool:item:<ref> = { label: назва, max, rest }`; неналаштований предмет пулу не має. Уміння артефакта з `limits.pool.key === "charges"` при збиранні отримує ключ пулу предмета; без `charges` у предмета ключ лишається `"charges"` → пулу немає → вміння недоступне. Редактор дозволяє ключ `charges` лише в артефакті з `charges` або `consumable` (`validateAbilities(list, { itemCharges })`), інакше — `CLASS_REF_OUTSIDE`.
- **Витратні в бою** (лише `items.enabled`): запис `items` з `artifactId` і `quantity > 0` → вміння артефакта з ключем `pool:consumable:<itemId>`, пул `{ label: назва, max: quantity, rest: null }`. Такі пули **не** пишуться в `resources.charges` і не показуються в «Зарядах» листа; при завершенні бою витрачене віднімається від кількості (`persistConsumables`, та сама транзакція `saveBattle`, незалежно від `persistResources`; журнал `item_use`, автор — `campaigns.dmUserId`, бо `inventory_log.actorUserId` NOT NULL). Плитка бою показує «Назва left/max» (плитка пулу 4f-2 без змін).
- **Довгий відпочинок** зберігає заряди з `rest: null`; короткий — як і раніше скидає лише `short`.
- **Правка зарядів ДМ** — `PATCH …/resources { charges: { "pool:item:<ref>": used } }`: ключ, якого немає серед пулів учасника, ігнорується; `used` обрізається до `max`; 0 — запис видаляється; `rest` береться з пулу.
- **Райдери** («extra NdM <Type> damage») механізуються лише для предметів зі статями зброї, без умов за типом істоти/зарядом/кидком/світанком; `dealDamage` без `damageType`, якщо тип не вказано (Vicious). `critImmunity` — після кидка (і після `autoCritAdjacent`): крит стає звичайним влучанням без критичного ефекту.
- **`atLeast`** — лише для характеристик (`strength`…`charisma`), без `flat`/`percent`; у `bakePassives` застосовується після всіх пласких бонусів: `max(власне, N)`.
- **Довідник, ростер, «вільні артефакти»** показують неунікальні предмети як «спорядження» (`gear: true`) і без власника; властивості завжди «вільні»; для властивості `FreeArtifact.property = { nameTemplate?, bases: id[] }` — id вільних баз, що проходять `matchesAppliesTo` (для кроку «База» без додаткового запиту).
- **`copy-test-heroes`** (`remapIds` по рядках) не переписує складені ref — скрипт ops, не читач застосунку; записано у хендоф.
- **Зілля лікування** — чотири рядки з таблиці `Item.json` (`srd-2024_potions-of-healing`): Potion of Healing (common, 2d4+2), Potion of Greater Healing (uncommon, 4d4+4), Potion of Superior Healing (rare, 8d4+8), Potion of Supreme Healing (epic, 10d4+20); бонусна дія `heal` собі, витратні.
- **Слоти унікальних**: `UNIQUE_BASES` (12 предметів) + бойові посохи (category staff і «Quarterstaff» в описі) → статі бази; назви зі «Shield» → shield; ring → ring; чудесні — регулярки спеку (+ Brooch/Talisman → amulet); решта (potion/wand/rod/staff і інші) → item; набої — витратні.

---

## Карта файлів

| Файл | Відповідальність |
|---|---|
| `lib/utils/rules/{schema,defaults,registry}.ts`, `components/rules/{RulesForm,sections/ItemsSection}.tsx`, `scripts/srd/lib/rules-preset.ts` | секція `rules.items` |
| `lib/constants/artifacts.ts` | `ItemModifierType`, `ITEM_LIMITS`, `ArtifactModifierType.DAMAGE_BONUS`, `CARRIED_SLOTS`, `PROPERTY_SLOTS` |
| `lib/constants/api-errors.ts`, `lib/constants/inventory.ts` | тексти відмов 4f-3, види журналу `artifact_attune`/`artifact_unattune` |
| `lib/utils/items/item-stats.ts` (zod) | `ItemStatsSchema`, `ItemStats`, `itemStatsColumns` |
| `lib/utils/items/item-row.ts` | `itemStatsFromRow`, `itemStatsRecords`, `isPropertyRow`, `isUniqueRow` |
| `lib/utils/items/ref.ts` | `ITEM_REF_RE`, `itemRef`, `parseItemRef`, `refArtifactIds`, `isComposedRef` |
| `lib/utils/items/compose.ts` | `ItemRowLike`, `itemKindOf`, `matchesAppliesTo`, `composedName`, `composeItemRow` |
| `lib/utils/items/resolve.ts` | `resolveItemRow(s)`, `equippedEntries`, `heldRefs`, `attunedRefs`, `activeItemRefs`, `inventoryArtifactIds`, `uniqueChecker`, `attunementRequired`, `itemChargesOf`, `pruneAttuned` |
| `lib/utils/items/pools.ts` | `ITEM_CHARGES_KEY`, `itemPoolKey`, `consumablePoolKey`, `isConsumablePool`, `withItemPool`, `itemPools` |
| `lib/utils/items/consumables.ts` | `consumableEntries`, `consumablePools`, `consumableSpend`, `spendConsumables`, `addConsumable` |
| `lib/utils/items/grant.ts` | `planGrant` |
| `lib/utils/artifacts/{weapon-stats,ownership,artifact-form}.ts` | `damageBonus`, ref-орієнтований `findHolder`, `uniqueConflict`, `item` у формі |
| `lib/schemas/artifacts.ts`, `lib/server/content/resources/artifacts.ts`, `lib/utils/content/import/fields/artifacts.ts`, `lib/server/content/import/export.ts`, `lib/server/content/json-schema.ts`, `lib/server/artifacts/read-artifacts-list.ts` | `item` через ресурс, імпорт/експорт, OpenAPI, значок бібліотеки |
| `prisma/schema.prisma`, `prisma/migrations/20261102000000_inventory_attuned/migration.sql` | колонка `attuned` |
| `types/{inventory,battle,characters,artifacts,info-reference}.ts`, `types/abilities.ts` | необов'язкові поля |
| `lib/utils/inventory/{items,stash-actions,permissions}.ts` | `artifactId`, `attune`/`unattune`, видача з планом |
| `app/api/campaigns/[id]/characters/[characterId]/stash/{apply-stash,read-stash,stash-schema}.ts`, `…/stash/free-artifacts/read-free-artifacts.ts`, `…/inventory/update-inventory.ts`, `…/artifacts/transfer/transfer-artifact.ts`, `…/characters/roster/read-roster.ts`, `lib/cache/artifact-reference.ts` | сервер сховища, видачі, передачі, довідника |
| `lib/utils/battle/participant/{extract-artifacts,extract-attacks,load-character-context,from-character}.ts`, `app/api/campaigns/[id]/battles/[battleId]/start/start-build-context.ts`, `lib/utils/battle/artifact-sets/apply-completed-sets.ts`, `app/api/campaigns/[id]/characters/[characterId]/sheet/sheet-handler.ts` | читачі бою й листа |
| `lib/__tests__/item-readers-guard.test.ts` | тест-сторож читачів `equipped`/`stash` |
| `lib/utils/abilities/build/{collect,bake}.ts`, `lib/utils/abilities/editor.ts`, `lib/utils/abilities/schema/{conditions,effects}.ts`, `lib/utils/abilities/registry/{conditions,effects/flags,effects/static}.ts`, `lib/utils/abilities/engine/core/run-abilities.ts` | пули предметів, `withThisItem`, `critImmunity`, `atLeast` |
| `lib/utils/battle/attack/{source,crit-immunity,bonus}.ts`, `lib/utils/battle/attack/process/{run,hit,miss,critical-fail,compute}.ts`, `lib/utils/battle/damage/weapon-flat.ts` | `attackSourceId`, скасування криту, `damageBonus` |
| `lib/utils/characters/resources/{schema,battle,rest,edit}.ts`, `lib/utils/characters/sheet/{rest-block,build-sheet}.ts`, `lib/schemas/out-of-combat.ts`, `app/api/campaigns/[id]/characters/[characterId]/resources/resources-handler.ts` | `rest: null`, витратні поза ресурсами, правка зарядів |
| `lib/utils/battle/store/{persist-consumables,save-battle}.ts` | списання витратних |
| `components/artifacts/{ArtifactItemFields,ArtifactWeaponFields,ArtifactForm,ArtifactCard,artifact-form-tabs}.tsx`, `lib/hooks/artifacts/useArtifactForm.ts`, `app/campaigns/[id]/dm/artifacts/[artifactId]/page.tsx` | блок «Предмет» |
| `components/character-profile/stash/{GrantArtifactDialog,StashArtifactsPanel,describe-log}.tsx`, `components/character-profile/{ItemsTab,ProfileEditor}.tsx`, `components/character-profile/rest/{ChargesList,ResourcesDialog}.tsx`, `components/characters/artifacts/CharacterArtifactsSection.tsx`, `components/campaigns/info/ArtifactReferenceCard.tsx`, `lib/hooks/characters/useStash.ts`, `lib/onboarding/whats-new.ts` | UI видачі, сховища, листа, сітки, довідника |
| `scripts/srd/lib/{source,open5e,types,build-data}.ts`, `scripts/srd/convert/{artifacts,magic-items}.ts`, `scripts/srd/overrides/magic-items.ts`, `scripts/srd/build.ts` | конвертер |
| `scripts/srd/__tests__/fixtures-4f3/{MagicItem,Item}.json`, `scripts/srd/__tests__/{magic-properties,magic-uniques,data-integrity-4f3}.test.ts` | фікстури й тести |
| `data/templates/srd-5.2/*.json` | перегенеровані дані |
| `docs/architecture/{battle,abilities,content-api}.md`, `docs/STATUS.md`, `docs/archive/superpowers/constructor-handoff.md` | документи |

---
### Task 1: Секція `rules.items` (схема, реєстр, вкладка, пресет SRD)

**Files:**
- Modify: `lib/utils/rules/schema.ts`, `lib/utils/rules/defaults.ts`, `lib/utils/rules/registry.ts`, `components/rules/RulesForm.tsx`, `scripts/srd/lib/rules-preset.ts`
- Create: `components/rules/sections/ItemsSection.tsx`
- Modify (дозволена правка наявного тесту): `lib/utils/rules/__tests__/schema.test.ts` — лише рядок `items` у повному очікуванні `parseRules({})`
- Test: `lib/utils/rules/__tests__/schema-4f3.test.ts`, `components/rules/__tests__/items-section.test.tsx`

**Interfaces:**
- Produces: `Ruleset["items"] = { enabled: boolean; attunementLimit: number }` (default `{ enabled: false, attunementLimit: 3 }`); `MECHANIC_REGISTRY.items.label === "Предмети"`; `SRD_RULES.items = { enabled: true, attunementLimit: 3 }`; `ItemsSection({ form }: { form: RulesFormState })`.

- [ ] **Step 1: Write the failing tests**

`lib/utils/rules/__tests__/schema-4f3.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { DEFAULT_RULES, MECHANIC_REGISTRY } from "@/lib/utils/rules";
import { mergeRules, parseRules, RulesetPatchSchema } from "@/lib/utils/rules/schema";
import { SRD_RULES } from "@/scripts/srd/lib/rules-preset";

const OFF = { enabled: false, attunementLimit: 3 };

describe("rules.items", () => {
  it("defaults to off with the 5e attunement limit", () => {
    expect(DEFAULT_RULES.items).toEqual(OFF);
    expect(parseRules({}).items).toEqual(OFF);
  });

  it("falls back to default on an invalid section", () => {
    expect(parseRules({ items: { attunementLimit: 0 } }).items).toEqual(OFF);
    expect(parseRules({ items: { attunementLimit: 11 } }).items).toEqual(OFF);
  });

  it("patches one field", () => {
    const merged = mergeRules(DEFAULT_RULES, RulesetPatchSchema.parse({ items: { enabled: true } }));

    expect(merged.ok && merged.rules.items).toEqual({ enabled: true, attunementLimit: 3 });
  });

  it("is a registered mechanic and the SRD preset turns it on", () => {
    expect(MECHANIC_REGISTRY.items.label).toBe("Предмети");
    expect(SRD_RULES.items).toEqual({ enabled: true, attunementLimit: 3 });
  });
});
```

Якщо alias `@/scripts/...` не резолвиться у vitest (перевірити `vitest.config.mts` → `@` = корінь репо), імпортувати відносно: `../../../../scripts/srd/lib/rules-preset`.

`components/rules/__tests__/items-section.test.tsx`:

```tsx
// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ItemsSection } from "../sections/ItemsSection";

import type { RulesFormState } from "@/lib/hooks/campaigns";
import { DEFAULT_RULES, type Ruleset } from "@/lib/utils/rules";

const formOf = (data: Ruleset) => ({ data, set: vi.fn() }) as unknown as RulesFormState & { set: ReturnType<typeof vi.fn> };

afterEach(cleanup);

describe("ItemsSection", () => {
  it("перемикач пише лише секцію items", () => {
    const form = formOf(DEFAULT_RULES);

    render(<ItemsSection form={form} />);

    fireEvent.click(screen.getByRole("switch", { name: "Предмети 5e: налаштування, носіння зі сховища, витратні в бою" }));

    expect(form.set).toHaveBeenCalledWith("items", { enabled: true, attunementLimit: 3 });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm test:run lib/utils/rules/__tests__/schema-4f3.test.ts components/rules/__tests__/items-section.test.tsx`
Expected: FAIL — `DEFAULT_RULES.items` undefined, модуля `ItemsSection` немає.

- [ ] **Step 3: Schema** — `lib/utils/rules/schema.ts`: у `sections` після `encounters`:

```ts
  items: z.strictObject({ enabled: z.boolean().default(false), attunementLimit: z.number().int().min(1).max(10).default(3) }),
```

у `RulesetSchema` після `encounters: sections.encounters.prefault({}),` — `items: sections.items.prefault({}),`; у `RulesetPatchSchema` після `encounters: patchSection("encounters").optional(),` — `items: patchSection("items").optional(),`.

`lib/utils/rules/defaults.ts` — після `encounters: …` рядок `items: { enabled: false, attunementLimit: 3 },`.

`lib/utils/rules/registry.ts` — після `encounters`:

```ts
  items: { label: "Предмети", description: "Магічні предмети 5e: налаштування (не більше N предметів), предмети слотів «Артефакт» і «Кільце» діють прямо зі сховища, витратні предмети (зілля, набої) використовуються в бою й списуються після нього. Властивості, неунікальне спорядження й заряди — властивості контенту, від цього перемикача не залежать." },
```

- [ ] **Step 4: Rules tab** — `components/rules/sections/ItemsSection.tsx`:

```tsx
import { NumberField } from "../NumberField";
import { RulesSection } from "../RulesSection";

import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import type { RulesFormState } from "@/lib/hooks/campaigns";

export function ItemsSection({ form }: { form: RulesFormState }) {
  const items = form.data.items;

  return (
    <RulesSection mechanic="items">
      <div className="flex items-center gap-3">
        <Switch id="rules-items-enabled" checked={items.enabled} onCheckedChange={(enabled) => form.set("items", { ...items, enabled })} />
        <Label htmlFor="rules-items-enabled">Предмети 5e: налаштування, носіння зі сховища, витратні в бою</Label>
      </div>
      <NumberField label="Ліміт налаштування" value={items.attunementLimit} range={[1, 10]} disabled={!items.enabled} onCommit={(attunementLimit) => form.set("items", { ...items, attunementLimit })} />
    </RulesSection>
  );
}
```

`components/rules/RulesForm.tsx`: імпорт `import { ItemsSection } from "./sections/ItemsSection";` (за абеткою після `InitiativeSection`), у `SECTIONS` після `encounters: EncountersSection,` — `items: ItemsSection,`.

- [ ] **Step 5: SRD preset** — `scripts/srd/lib/rules-preset.ts`: після рядка `encounters: …` додати `items: { enabled: true, attunementLimit: 3 },`.

- [ ] **Step 6: Allowed edit** — `lib/utils/rules/__tests__/schema.test.ts`: у повному очікуванні `parseRules({})` після рядка `encounters: { balance: "fair", edition: "2014", autoXp: false },` додати `items: { enabled: false, attunementLimit: 3 },`. Більше нічого не змінювати.

- [ ] **Step 7: Run tests to verify they pass**

Run: `pnpm test:run lib/utils/rules components/rules lib/server/templates/sync scripts/srd/__tests__/preset.test.ts`
Expected: PASS (хеш синхронізації бере ключі з `MECHANIC_REGISTRY` автоматично).

- [ ] **Step 8: Type check** — `pnpm exec tsc --noEmit -p tsconfig.json` → 0 errors.

- [ ] **Step 9: Commit**

```bash
git add lib/utils/rules components/rules scripts/srd/lib/rules-preset.ts
git commit -m "feat(constructor): 4f-3 rules.items section and rules tab

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Модель `item` і `damageBonus` (схема, `modifiers`, ресурс, імпорт/експорт, OpenAPI, тексти відмов)

**Files:**
- Modify: `lib/constants/artifacts.ts`, `lib/constants/api-errors.ts`, `lib/utils/artifacts/weapon-stats.ts`, `lib/schemas/artifacts.ts`, `lib/server/content/resources/artifacts.ts`, `lib/utils/content/import/fields/artifacts.ts`, `lib/server/content/import/export.ts`, `lib/server/content/json-schema.ts`
- Create: `lib/utils/items/item-stats.ts`, `lib/utils/items/item-row.ts`
- Test: `lib/utils/items/__tests__/item-stats.test.ts`, `lib/schemas/__tests__/artifacts-item.test.ts`, `lib/server/content/__tests__/artifact-item-resource.test.ts`, `lib/server/content/__tests__/openapi-4f3.test.ts`

**Interfaces:**
- Produces:
  - `enum ItemModifierType { STATS = "itemStats" }`; `ITEM_LIMITS = { charges: [1, 50], bases: 60, grantQuantity: [1, 99], quantity: 9999 } as const`; `ArtifactModifierType.DAMAGE_BONUS = "damageBonus"`; `CARRIED_SLOTS: ReadonlySet<string>` (`item`, `ring`); `PROPERTY_SLOTS: ReadonlySet<string>` (`weapon`, `range_weapon`, `armor`, `shield`).
  - `ITEM_KINDS = ["weapon", "armor", "shield"] as const`, `type ItemKind`; `ItemStatsSchema`; `type ItemStats = { unique?: boolean; property?: { appliesTo: { kinds: ItemKind[]; attackType?: "melee" | "ranged"; armorCategories?: ArmorCategory[]; bases?: string[] }; nameTemplate?: string; overrides?: { stealthDisadvantage?: false; strength?: null; damageType?: string; addTraits?: WeaponTrait[] } }; attunement?: boolean; charges?: { max: number; rest: "short" | "long" | null }; consumable?: boolean }`; `itemStatsColumns(stats: ItemStats): { modifiers: Array<{ type: string; value: string }> }`.
  - (без zod) `itemStatsFromRow(row: { modifiers?: unknown }): ItemStats | null`; `itemStatsRecords(stats: ItemStats): Array<{ type: string; value: string }>` (порожня модель → `[]`); `isPropertyRow(row): boolean`; `isUniqueRow(row): boolean` (= не властивість і `unique !== false`).
  - `WeaponStats.damageBonus?: number` (−20…20, запис `modifiers` типу `damageBonus`).
  - Поле `item: ItemStats | null` у `createArtifactSchema`/`patchArtifactSchema` (null прибирає модель у PATCH); `API_ERRORS.{ITEM_PROPERTY_SLOT, ITEM_PROPERTY_STATS, ITEM_CONSUMABLE_CONFLICT, ITEM_BASE_MISMATCH, ITEM_PROPERTY_NEEDS_BASE, ATTUNEMENT_LIMIT, ATTUNEMENT_NOT_REQUIRED, ALREADY_ATTUNED, ITEM_NOT_ATTUNED, ITEM_NOT_HELD, ITEM_ALREADY_IN_STASH, ITEMS_DISABLED}`; спільна схема OpenAPI `ItemStats`.

- [ ] **Step 1: Write the failing tests**

`lib/utils/items/__tests__/item-stats.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { weaponStatsColumns, weaponStatsFromRow } from "@/lib/utils/artifacts/weapon-stats";
import { itemStatsColumns, ItemStatsSchema } from "@/lib/utils/items/item-stats";
import { isPropertyRow, isUniqueRow, itemStatsFromRow, itemStatsRecords } from "@/lib/utils/items/item-row";

const FLAME_TONGUE = { unique: false, property: { appliesTo: { kinds: ["weapon" as const], bases: ["Longsword"] }, nameTemplate: "Flame Tongue {base}" }, attunement: true };

describe("item stats in modifiers", () => {
  it("round-trips a property and a charged wand", () => {
    expect(itemStatsFromRow(itemStatsColumns(FLAME_TONGUE))).toEqual(FLAME_TONGUE);

    const wand = { unique: false, attunement: false, charges: { max: 7, rest: "long" as const } };

    expect(itemStatsFromRow(itemStatsColumns(wand))).toEqual(wand);
    expect(itemStatsFromRow(itemStatsColumns({ charges: { max: 3, rest: null } }))).toEqual({ charges: { max: 3, rest: null } });
  });

  it("empty model writes nothing; broken JSON or invalid fields → null", () => {
    expect(itemStatsRecords({})).toEqual([]);
    expect(itemStatsColumns({}).modifiers).toEqual([]);
    expect(itemStatsFromRow({ modifiers: [] })).toBeNull();
    expect(itemStatsFromRow({ modifiers: [{ type: "itemStats", value: "{oops" }] })).toBeNull();
    expect(itemStatsFromRow({ modifiers: [{ type: "itemStats", value: JSON.stringify({ charges: { max: 0, rest: "long" } }) }] })).toBeNull();
    expect(itemStatsFromRow({ modifiers: [{ type: "itemStats", value: JSON.stringify({ property: { appliesTo: { kinds: [] } } }) }] })).toBeNull();
    expect(itemStatsFromRow({ modifiers: "x" })).toBeNull();
  });

  it("weapon reader ignores the item record; damageBonus round-trips", () => {
    const cols = weaponStatsColumns({ damageDice: "1d8", damageBonus: 2 });

    expect(cols.modifiers).toContainEqual({ type: "damageBonus", value: "2" });
    expect(weaponStatsFromRow({ modifiers: [...cols.modifiers, ...itemStatsColumns(FLAME_TONGUE).modifiers] })).toEqual({ damageDice: "1d8", damageBonus: 2 });
  });

  it("uniqueness: HOMM row (no item) is unique, gear and properties are not", () => {
    expect(isUniqueRow({ modifiers: [] })).toBe(true);
    expect(isUniqueRow(itemStatsColumns({ unique: false }))).toBe(false);
    expect(isUniqueRow(itemStatsColumns({ property: FLAME_TONGUE.property }))).toBe(false);
    expect(isPropertyRow(itemStatsColumns(FLAME_TONGUE))).toBe(true);
    expect(isPropertyRow({ modifiers: [] })).toBe(false);
  });

  it("schema: limits, template needs {base}, consumable conflicts", () => {
    expect(ItemStatsSchema.safeParse({ charges: { max: 51, rest: "long" } }).success).toBe(false);
    expect(ItemStatsSchema.safeParse({ property: { appliesTo: { kinds: ["weapon"] }, nameTemplate: "Flame Tongue" } }).success).toBe(false);
    expect(ItemStatsSchema.safeParse({ property: { appliesTo: { kinds: ["weapon"], bases: Array.from({ length: 61 }, (_, i) => `b${i}`) } } }).success).toBe(false);
    expect(ItemStatsSchema.safeParse({ consumable: true, charges: { max: 2, rest: "long" } }).success).toBe(false);
    expect(ItemStatsSchema.safeParse({ consumable: true, property: FLAME_TONGUE.property }).success).toBe(false);
    expect(ItemStatsSchema.safeParse({ consumable: true, charges: { max: 2, rest: null } }).success).toBe(true);
  });
});
```

`lib/schemas/__tests__/artifacts-item.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { createArtifactSchema, patchArtifactSchema } from "@/lib/schemas/artifacts";

const property = { property: { appliesTo: { kinds: ["weapon"] } } };

describe("artifact item field", () => {
  it("property only in weapon/armor/shield slots", () => {
    expect(createArtifactSchema.safeParse({ name: "Flame Tongue", slot: "weapon", item: property }).success).toBe(true);
    expect(createArtifactSchema.safeParse({ name: "Armor +1", slot: "armor", item: { property: { appliesTo: { kinds: ["armor", "shield"] } } } }).success).toBe(true);
    expect(createArtifactSchema.safeParse({ name: "X", slot: "ring", item: property }).success).toBe(false);
  });

  it("a property may carry only +N weapon bonuses and no armor", () => {
    expect(createArtifactSchema.safeParse({ name: "Weapon +1", slot: "weapon", item: property, weapon: { attackBonus: 1, damageBonus: 1 } }).success).toBe(true);
    expect(createArtifactSchema.safeParse({ name: "X", slot: "weapon", item: property, weapon: { damageDice: "1d8" } }).success).toBe(false);
    expect(createArtifactSchema.safeParse({ name: "X", slot: "armor", item: { property: { appliesTo: { kinds: ["armor"] } } }, armor: { category: "light", base: 11 } }).success).toBe(false);
  });

  it("PATCH: item null clears; property with weapon dice refused", () => {
    expect(patchArtifactSchema.safeParse({ item: null }).success).toBe(true);
    expect(patchArtifactSchema.safeParse({ item: property, weapon: { damageDice: "1d8" } }).success).toBe(false);
    expect(patchArtifactSchema.safeParse({ slot: "boots", item: property }).success).toBe(false);
  });

  it("damageBonus within −20…20", () => {
    expect(createArtifactSchema.safeParse({ name: "S", slot: "weapon", weapon: { damageBonus: 3 } }).success).toBe(true);
    expect(createArtifactSchema.safeParse({ name: "S", slot: "weapon", weapon: { damageBonus: 21 } }).success).toBe(false);
  });
});
```

`lib/server/content/__tests__/artifact-item-resource.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({
  artifact: { findFirst: vi.fn(), create: vi.fn(), update: vi.fn(), deleteMany: vi.fn() },
  artifactSet: { findFirst: vi.fn() },
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", () => ({ prisma: db }));

import { artifactsResource } from "@/lib/server/content/resources/artifacts";
import { createContent, updateContent } from "@/lib/server/content/service";
import type { Actor } from "@/lib/utils/api/actor";

const actor: Actor = { campaignId: "c1", userId: "u", isDM: true, via: "session", scopes: null };

const ITEM = { type: "itemStats", value: JSON.stringify({ unique: false }) };

describe("artifact item persistence", () => {
  beforeEach(() => vi.clearAllMocks());

  it("create writes weapon and item records together", async () => {
    db.artifact.create.mockResolvedValue({ id: "a1" });

    await createContent(artifactsResource, actor, { name: "Dagger", slot: "weapon", weapon: { damageDice: "1d4" }, item: { unique: false } });

    expect(db.artifact.create.mock.calls[0][0].data.modifiers).toEqual([{ type: "damageDice", value: "1d4" }, ITEM]);
  });

  const patch = async (existing: object, data: object) => {
    db.artifact.findFirst.mockResolvedValue({ id: "a1", campaignId: "c1", icon: null, slot: "weapon", ...existing });
    db.artifact.update.mockResolvedValue({ id: "a1" });
    await updateContent(artifactsResource, actor, "a1", data);

    return db.artifact.update.mock.calls[0][0].data;
  };

  it("PATCH weapon keeps the item record; PATCH item keeps weapon records", async () => {
    expect((await patch({ modifiers: [{ type: "damageDice", value: "1d4" }, ITEM] }, { weapon: { damageDice: "1d6" } })).modifiers).toEqual([{ type: "damageDice", value: "1d6" }, ITEM]);

    vi.clearAllMocks();

    expect((await patch({ modifiers: [{ type: "damageDice", value: "1d4" }, ITEM] }, { item: { unique: false, attunement: true } })).modifiers).toEqual([
      { type: "damageDice", value: "1d4" },
      { type: "itemStats", value: JSON.stringify({ unique: false, attunement: true }) },
    ]);
  });

  it("PATCH item null drops only the item record; untouched item keeps modifiers as is", async () => {
    expect((await patch({ modifiers: [{ type: "damageDice", value: "1d4" }, ITEM] }, { item: null })).modifiers).toEqual([{ type: "damageDice", value: "1d4" }]);

    vi.clearAllMocks();

    expect(await patch({ modifiers: [ITEM] }, { name: "X" })).not.toHaveProperty("modifiers");
  });
});
```

`lib/server/content/__tests__/openapi-4f3.test.ts`:

```ts
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/utils/api/actor", () => ({ resolveActor: vi.fn() }));

import { buildOpenApi } from "@/lib/server/content/openapi";

const doc = buildOpenApi();

describe("OpenAPI 4f-3", () => {
  it("ItemStats is a shared component referenced by artifacts", () => {
    expect(doc.components.schemas).toHaveProperty("ItemStats");
    expect(JSON.stringify(doc.components.schemas.ArtifactsCreate)).toContain("#/components/schemas/ItemStats");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm test:run lib/utils/items/__tests__/item-stats.test.ts lib/schemas/__tests__/artifacts-item.test.ts lib/server/content/__tests__/artifact-item-resource.test.ts lib/server/content/__tests__/openapi-4f3.test.ts`
Expected: FAIL — модулів `lib/utils/items/*` немає, поля `item` немає.

- [ ] **Step 3: Constants** — `lib/constants/artifacts.ts`: в `enum ArtifactModifierType` після `VERSATILE_DICE = "versatileDice",` — `DAMAGE_BONUS = "damageBonus",`. Після `ARMOR_LIMITS`:

```ts
// окремо: weaponStatsFromRow/armorStatsFromRow беруть лише свої типи
export enum ItemModifierType {
  STATS = "itemStats",
}

export const ITEM_LIMITS = { charges: [1, 50], bases: 60, grantQuantity: [1, 99], quantity: 9999 } as const;

export const CARRIED_SLOTS: ReadonlySet<string> = new Set([ArtifactSlot.ITEM, ArtifactSlot.RING]);

export const PROPERTY_SLOTS: ReadonlySet<string> = new Set([ArtifactSlot.WEAPON, ArtifactSlot.RANGE_WEAPON, ArtifactSlot.ARMOR, ArtifactSlot.SHIELD]);
```

`lib/constants/api-errors.ts` — після `ARTIFACT_HELD_BY_OTHER: …,`:

```ts
  ITEM_PROPERTY_SLOT: "Властивість — лише для слотів «Зброя», «Дальнобійна зброя», «Броня», «Щит»",
  ITEM_PROPERTY_STATS: "Властивість не має власних статів зброї чи броні — лише «+N до атаки й шкоди»",
  ITEM_CONSUMABLE_CONFLICT: "Витратний предмет не може бути властивістю і не відновлює заряди",
  ITEM_BASE_MISMATCH: "Ця база не підходить для властивості",
  ITEM_PROPERTY_NEEDS_BASE: "Властивість видається лише разом із базовим предметом",
  ATTUNEMENT_LIMIT: "Досягнуто ліміту налаштування",
  ATTUNEMENT_NOT_REQUIRED: "Цей предмет не потребує налаштування",
  ALREADY_ATTUNED: "Предмет уже налаштовано",
  ITEM_NOT_ATTUNED: "Предмет не налаштовано",
  ITEM_NOT_HELD: "Герой не тримає цей предмет",
  ITEM_ALREADY_IN_STASH: "Такий предмет уже лежить у підсумку",
  ITEMS_DISABLED: "Предмети 5e вимкнено в правилах кампанії",
```

- [ ] **Step 4: Weapon `damageBonus`** — `lib/utils/artifacts/weapon-stats.ts`: у `WeaponStatsSchema` після `attackBonus` — `damageBonus: z.number().int().min(-20).max(20).optional(),`; `const NUMBER_FIELDS = ["minTargets", "maxTargets", "damageBonus"] as const;`.

- [ ] **Step 5: Item model** — `lib/utils/items/item-row.ts` (без zod):

```ts
import { ITEM_LIMITS, ItemModifierType } from "@/lib/constants/artifacts";
import { WEAPON_TRAITS } from "@/lib/constants/weapon-traits";
import { isRecord } from "@/lib/utils/common/is-record";
import type { ItemStats } from "@/lib/utils/items/item-stats";

const KINDS = new Set(["weapon", "armor", "shield"]);

const CATEGORIES = new Set(["light", "medium", "heavy"]);

const TRAITS = new Set<string>(WEAPON_TRAITS);

const isInt = (n: unknown, min: number, max: number): n is number => typeof n === "number" && Number.isInteger(n) && n >= min && n <= max;

const strings = (v: unknown, allowed?: ReadonlySet<string>): string[] | null =>
  Array.isArray(v) && v.length > 0 && v.every((s) => typeof s === "string" && s.trim() !== "" && (!allowed || allowed.has(s))) ? (v as string[]) : null;

function readProperty(raw: unknown): ItemStats["property"] | null {
  if (!isRecord(raw) || !isRecord(raw.appliesTo)) return null;

  const a = raw.appliesTo;

  const kinds = strings(a.kinds, KINDS);

  if (!kinds) return null;

  const appliesTo: NonNullable<ItemStats["property"]>["appliesTo"] = { kinds: kinds as ("weapon" | "armor" | "shield")[] };

  if (a.attackType !== undefined) {
    if (a.attackType !== "melee" && a.attackType !== "ranged") return null;

    appliesTo.attackType = a.attackType;
  }

  if (a.armorCategories !== undefined) {
    const c = strings(a.armorCategories, CATEGORIES);

    if (!c) return null;

    appliesTo.armorCategories = c as ("light" | "medium" | "heavy")[];
  }

  if (a.bases !== undefined) {
    const b = strings(a.bases);

    if (!b || b.length > ITEM_LIMITS.bases) return null;

    appliesTo.bases = b;
  }

  const out: NonNullable<ItemStats["property"]> = { appliesTo };

  if (typeof raw.nameTemplate === "string" && raw.nameTemplate.includes("{base}")) out.nameTemplate = raw.nameTemplate;

  if (isRecord(raw.overrides)) {
    const o = raw.overrides;

    const overrides: NonNullable<NonNullable<ItemStats["property"]>["overrides"]> = {};

    if (o.stealthDisadvantage === false) overrides.stealthDisadvantage = false;

    if (o.strength === null) overrides.strength = null;

    if (typeof o.damageType === "string" && o.damageType.trim()) overrides.damageType = o.damageType;

    const traits = strings(o.addTraits, TRAITS);

    if (traits) overrides.addTraits = traits as NonNullable<typeof overrides.addTraits>;

    if (Object.keys(overrides).length > 0) out.overrides = overrides;
  }

  return out;
}

function readStats(raw: unknown): ItemStats | null {
  if (!isRecord(raw)) return null;

  const out: ItemStats = {};

  if (typeof raw.unique === "boolean") out.unique = raw.unique;

  if (raw.property !== undefined) {
    const p = readProperty(raw.property);

    if (!p) return null;

    out.property = p;
  }

  if (typeof raw.attunement === "boolean") out.attunement = raw.attunement;

  if (raw.charges !== undefined) {
    const c = raw.charges;

    if (!isRecord(c) || !isInt(c.max, ...ITEM_LIMITS.charges) || !(c.rest === "short" || c.rest === "long" || c.rest === null)) return null;

    out.charges = { max: c.max, rest: c.rest };
  }

  if (typeof raw.consumable === "boolean") out.consumable = raw.consumable;

  return out;
}

/** Без zod: ходить у entry-чанки бою й профілю (`lib/__tests__/client-entry-imports.test.ts`). */
export function itemStatsFromRow(row: { modifiers?: unknown }): ItemStats | null {
  const record = (Array.isArray(row.modifiers) ? row.modifiers : []).find((m) => isRecord(m) && m.type === ItemModifierType.STATS) as { value?: unknown } | undefined;

  if (!record || typeof record.value !== "string") return null;

  try {
    return readStats(JSON.parse(record.value));
  } catch {
    return null;
  }
}

export const itemStatsRecords = (stats: ItemStats): Array<{ type: string; value: string }> => (Object.keys(stats).length > 0 ? [{ type: ItemModifierType.STATS, value: JSON.stringify(stats) }] : []);

export const isPropertyRow = (row: { modifiers?: unknown }) => !!itemStatsFromRow(row)?.property;

export const isUniqueRow = (row: { modifiers?: unknown }) => {
  const stats = itemStatsFromRow(row);

  return !stats?.property && stats?.unique !== false;
};
```

`lib/utils/items/item-stats.ts`:

```ts
import { z } from "zod";

import { API_ERRORS } from "@/lib/constants/api-errors";
import { ITEM_LIMITS } from "@/lib/constants/artifacts";
import { WEAPON_TRAITS } from "@/lib/constants/weapon-traits";
import { ARMOR_CATEGORIES } from "@/lib/utils/artifacts/armor-stats";
import { itemStatsRecords } from "@/lib/utils/items/item-row";

export const ITEM_KINDS = ["weapon", "armor", "shield"] as const;

export type ItemKind = (typeof ITEM_KINDS)[number];

const PropertySchema = z.object({
  appliesTo: z.object({
    kinds: z.array(z.enum(ITEM_KINDS)).min(1),
    attackType: z.enum(["melee", "ranged"]).optional(),
    armorCategories: z.array(z.enum(ARMOR_CATEGORIES)).min(1).optional(),
    bases: z.array(z.string().trim().min(1).max(100)).min(1).max(ITEM_LIMITS.bases).optional(),
  }),
  nameTemplate: z.string().trim().max(100).refine((t) => t.includes("{base}"), "Шаблон має містити {base}").optional(),
  overrides: z
    .object({
      stealthDisadvantage: z.literal(false).optional(),
      strength: z.null().optional(),
      damageType: z.string().trim().min(1).max(30).optional(),
      addTraits: z.array(z.enum(WEAPON_TRAITS)).min(1).optional(),
    })
    .optional(),
});

export const ItemStatsSchema = z
  .object({
    unique: z.boolean().optional(),
    property: PropertySchema.optional(),
    attunement: z.boolean().optional(),
    charges: z.object({ max: z.number().int().min(ITEM_LIMITS.charges[0]).max(ITEM_LIMITS.charges[1]), rest: z.enum(["short", "long"]).nullable() }).optional(),
    consumable: z.boolean().optional(),
  })
  .refine((s) => !s.consumable || (!s.property && !s.charges?.rest), { message: API_ERRORS.ITEM_CONSUMABLE_CONFLICT, path: ["consumable"] })
  .describe("Предмет 5e: unique=false — звичайне спорядження; property — властивість, що видається разом із базою; attunement; charges (rest null — не відновлюються); consumable — видається кількістю");

export type ItemStats = z.infer<typeof ItemStatsSchema>;

export const itemStatsColumns = (stats: ItemStats): { modifiers: Array<{ type: string; value: string }> } => ({ modifiers: itemStatsRecords(stats) });

export { isPropertyRow, isUniqueRow, itemStatsFromRow } from "@/lib/utils/items/item-row";
```

- [ ] **Step 6: Artifact schemas** — `lib/schemas/artifacts.ts`: імпорти `PROPERTY_SLOTS` з `@/lib/constants/artifacts`, `ItemStatsSchema` з `@/lib/utils/items/item-stats`; поле в обох схемах після `armor`:

```ts
    item: ItemStatsSchema.nullable().describe("Предмет 5e; null прибирає модель").optional(),
```

refine-и (до наявного `armorSlotOnly`):

```ts
const BONUS_ONLY = new Set(["attackBonus", "damageBonus"]);

const propertyStatsOk = (d: { item?: { property?: unknown } | null; weapon?: object; armor?: unknown }) =>
  !d.item?.property || (d.armor == null && Object.keys(d.weapon ?? {}).every((k) => BONUS_ONLY.has(k)));

const propertySlot = { message: API_ERRORS.ITEM_PROPERTY_SLOT, path: ["item"] };

const propertyStats = { message: API_ERRORS.ITEM_PROPERTY_STATS, path: ["item"] };
```

`createArtifactSchema` — після наявного `.refine(…armorSlotOnly)`:

```ts
  .refine((d) => !d.item?.property || PROPERTY_SLOTS.has(d.slot), propertySlot)
  .refine(propertyStatsOk, propertyStats);
```

`patchArtifactSchema` — так само, але слот лише коли переданий: `.refine((d) => !d.item?.property || d.slot === undefined || PROPERTY_SLOTS.has(d.slot), propertySlot).refine(propertyStatsOk, propertyStats);`.

- [ ] **Step 7: Resource** — `lib/server/content/resources/artifacts.ts`: імпорти `ItemModifierType` (з `@/lib/constants/artifacts`) і `itemStatsColumns` (з `@/lib/utils/items/item-stats`). Над `export const artifactsResource` додати:

```ts
type ModifierRecord = { type?: string };

const isItemRecord = (m: unknown) => !!m && typeof m === "object" && (m as ModifierRecord).type === ItemModifierType.STATS;

const itemRecordsOf = (modifiers: unknown) => (Array.isArray(modifiers) ? modifiers : []).filter(isItemRecord);

// weapon/armor replace their own records as before; the item record survives unless `item` is sent
function nextModifiers(existing: unknown, data: { weapon?: WeaponStats; armor?: ArmorStats | null; item?: ItemStats | null }, dropArmor: boolean): unknown[] | undefined {
  if (!data.weapon && !data.armor && data.item === undefined && !dropArmor) return undefined;

  const base = data.armor
    ? armorStatsColumns(data.armor).modifiers
    : data.weapon
      ? weaponStatsColumns(data.weapon).modifiers
      : (dropArmor ? withoutArmorModifiers(existing) : Array.isArray(existing) ? existing : []).filter((m) => !isItemRecord(m));

  const item = data.item === undefined ? itemRecordsOf(existing) : data.item ? itemStatsColumns(data.item).modifiers : [];

  return [...base, ...item];
}
```

(типи: `import type { ArmorStats } from "@/lib/utils/artifacts/armor-stats"`, `import type { WeaponStats } from "@/lib/utils/artifacts/weapon-stats"`, `import type { ItemStats } from "@/lib/utils/items/item-stats"` — або змішаний імпорт із наявними `armorStatsColumns`/`weaponStatsColumns`).

`create` — замінити рядки `...(data.weapon && weaponStatsColumns(data.weapon)),` і `...(data.armor && armorStatsColumns(data.armor)),` на:

```ts
        ...(data.weapon && { bonuses: weaponStatsColumns(data.weapon).bonuses }),
        ...((data.weapon || data.armor || data.item) && { modifiers: nextModifiers([], data, false) as Prisma.InputJsonValue }),
```

(`import type { Prisma } from "@prisma/client"`). `update` — прибрати `const keptModifiers = …` і рядки `...keptModifiers,`, `...(data.weapon && weaponStatsColumns(data.weapon)),`, `...(data.armor && armorStatsColumns(data.armor)),`; замість них:

```ts
    const modifiers = nextModifiers(existing.modifiers, data, dropArmor);
```

і в `data` об'єкта `update`: `...(data.weapon && { bonuses: weaponStatsColumns(data.weapon).bonuses }), ...(modifiers && { modifiers: modifiers as Prisma.InputJsonValue }),`. Опис ресурсу: `"Артефакти: слот, рідкість, сет, зброя (damageBonus — +N до шкоди цією зброєю), броня 5e (armor — лише слот armor), предмет 5e (item: unique, property з appliesTo/nameTemplate, attunement, charges, consumable), бонуси (здібності)."`. Наявні тести `artifact-resources.test.ts` («armor null strips…», «changing the slot…», «untouched armor…») мають лишитись зеленими без змін.

- [ ] **Step 8: Import/export/OpenAPI** — `lib/utils/content/import/fields/artifacts.ts`: після `jsonField("armor", …)` — `jsonField("item", "Предмет 5e (JSON)", ["item"], ['{"unique":false}', '{"unique":false,"attunement":true,"charges":{"max":7,"rest":"long"}}']),`. `lib/server/content/import/export.ts`: імпорт `itemStatsFromRow` з `@/lib/utils/items/item-row`; у мапі артефактів додати `item: itemStatsFromRow(r) ?? undefined`. `lib/server/content/json-schema.ts`: імпорт `ItemStatsSchema` з `@/lib/utils/items/item-stats`; у `SHARED_SCHEMAS` після `[ArmorStatsSchema, "ArmorStats"],` — `[ItemStatsSchema, "ItemStats"],`.

- [ ] **Step 9: Run tests to verify they pass**

Run: `pnpm test:run lib/utils/items lib/schemas lib/utils/artifacts lib/server/content lib/utils/content`
Expected: PASS, зокрема `openapi.test.ts` (`< 135_000`) і `tool-schemas.test.ts`. Якщо `openapi.test.ts` падає лише на межі — виміряти (`JSON.stringify(buildOpenApi()).length`), переконатися, що `ItemStats` — `$ref` у `ArtifactsCreate`/`ArtifactsUpdate`, і лише тоді змінити межу на `140_000` в `openapi.test.ts` і `openapi-4f2.test.ts` (дозволена правка) з виміряним розміром у повідомленні коміту.

- [ ] **Step 10: Type check** — `pnpm exec tsc --noEmit -p tsconfig.json` → 0 errors.

- [ ] **Step 11: Commit**

```bash
git add lib/constants/artifacts.ts lib/constants/api-errors.ts lib/utils/artifacts/weapon-stats.ts lib/utils/items lib/schemas lib/server/content lib/utils/content/import/fields/artifacts.ts
git commit -m "feat(constructor): 4f-3 artifact item model and weapon damageBonus in modifiers

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---
### Task 3: Ref і складання предмета (`ref.ts`, `compose.ts`)

**Files:**
- Create: `lib/utils/items/ref.ts`, `lib/utils/items/compose.ts`
- Test: `lib/utils/items/__tests__/ref.test.ts`, `lib/utils/items/__tests__/compose.test.ts`

**Interfaces:**
- Consumes: `itemStatsFromRow`, `itemStatsRecords` (задача 2); `armorStatsFromRow` (`lib/utils/artifacts/armor-row.ts`); `parseWeaponTraits` (`lib/constants/weapon-traits.ts`).
- Produces:
  - `ITEM_REF_RE`; `itemRef(baseId: string, propertyId?: string | null): string`; `parseItemRef(ref: string): { baseId: string; propertyId: string | null } | null`; `refArtifactIds(ref: string): string[]`; `isComposedRef(ref: string): boolean`.
  - `interface ItemRowLike { id: string; name: string; slot: string; icon?: string | null; rarity?: string | null; description?: string | null; setId?: string | null; bonuses?: unknown; modifiers?: unknown; abilities?: unknown }`; `DEFAULT_NAME_TEMPLATE = "{name} ({base})"`; `PROPERTY_ABILITY_PREFIX = "p-"`; `itemKindOf(row: ItemRowLike): ItemKind | null`; `matchesAppliesTo(base: ItemRowLike, property: ItemRowLike): boolean`; `composedName(base: { name: string }, property: { name: string }, template?: string): string`; `composeItemRow<R extends ItemRowLike>(base: R, property: R): R`.

- [ ] **Step 1: Write the failing tests**

`lib/utils/items/__tests__/ref.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { isComposedRef, itemRef, parseItemRef, refArtifactIds } from "@/lib/utils/items/ref";

describe("item refs", () => {
  it("plain and composed refs", () => {
    expect(itemRef("cl1")).toBe("cl1");
    expect(itemRef("cl1", "cp2")).toBe("cl1+cp2");
    expect(parseItemRef("cl1+cp2")).toEqual({ baseId: "cl1", propertyId: "cp2" });
    expect(parseItemRef("ring-a")).toEqual({ baseId: "ring-a", propertyId: null });
    expect(refArtifactIds("cl1+cp2")).toEqual(["cl1", "cp2"]);
    expect(isComposedRef("cl1+cp2")).toBe(true);
    expect(isComposedRef("cl1")).toBe(false);
  });

  it("rejects malformed refs", () => {
    for (const bad of ["", "a+b+c", "+b", "a+", "a b", "x".repeat(65)]) {
      expect(parseItemRef(bad), bad).toBeNull();
      expect(refArtifactIds(bad), bad).toEqual([]);
    }
  });
});
```

`lib/utils/items/__tests__/compose.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { armorStatsColumns } from "@/lib/utils/artifacts/armor-stats";
import { weaponStatsColumns } from "@/lib/utils/artifacts/weapon-stats";
import { composedName, composeItemRow, itemKindOf, matchesAppliesTo } from "@/lib/utils/items/compose";
import { itemStatsFromRow } from "@/lib/utils/items/item-row";
import { itemStatsColumns, type ItemStats } from "@/lib/utils/items/item-stats";

const weapon = (id: string, name: string, stats: Parameters<typeof weaponStatsColumns>[0], slot = "weapon", item: ItemStats = { unique: false }) => {
  const cols = weaponStatsColumns(stats);

  return { id, name, slot, icon: `${id}.png`, rarity: "common", description: name, setId: null, bonuses: cols.bonuses, modifiers: [...cols.modifiers, ...itemStatsColumns(item).modifiers], abilities: [] as unknown[] };
};

const property = (id: string, name: string, item: ItemStats, extra: { bonuses?: object; modifiers?: unknown[]; abilities?: unknown[]; rarity?: string } = {}) => ({
  id,
  name,
  slot: "weapon",
  icon: null,
  rarity: extra.rarity ?? "rare",
  description: `${name} text`,
  setId: null,
  bonuses: extra.bonuses ?? {},
  modifiers: [...(extra.modifiers ?? []), ...itemStatsColumns(item).modifiers],
  abilities: extra.abilities ?? [],
});

const armorRow = (id: string, name: string, stats: Parameters<typeof armorStatsColumns>[0]) => ({ id, name, slot: "armor", icon: null, rarity: "common", description: name, setId: null, bonuses: {}, modifiers: [...armorStatsColumns(stats).modifiers, ...itemStatsColumns({ unique: false }).modifiers], abilities: [] });

const longsword = weapon("ls", "Longsword", { damageDice: "1d8", damageType: "slashing", attackType: "melee", traits: ["versatile"] });

const longbow = weapon("lb", "Longbow", { damageDice: "1d8", damageType: "piercing", attackType: "ranged" }, "range_weapon");

const shield = { id: "sh", name: "Shield", slot: "shield", icon: null, rarity: "common", description: "Shield", setId: null, bonuses: {}, modifiers: itemStatsColumns({ unique: false }).modifiers, abilities: [] };

const plate = armorRow("pl", "Plate Armor", { category: "heavy", base: 18, strength: 15, stealthDisadvantage: true });

const leather = armorRow("le", "Leather Armor", { category: "light", base: 11 });

const flameTongue = property(
  "ft",
  "Flame Tongue",
  { unique: false, attunement: true, property: { appliesTo: { kinds: ["weapon"], attackType: "melee" }, nameTemplate: "Flame Tongue {base}" } },
  { abilities: [{ id: "rider", name: "Flame", trigger: { event: "hit", role: "attacker" }, condition: { type: "withThisItem" }, effects: [{ kind: "dealDamage", amount: "2d6", damageType: "fire", target: "eventTarget" }] }] },
);

const plus2 = property("w2", "Weapon +2", { unique: false, property: { appliesTo: { kinds: ["weapon"] }, nameTemplate: "{base} (+2)" } }, { bonuses: { attackBonus: 2 }, modifiers: weaponStatsColumns({ damageBonus: 2 }).modifiers });

const mithral = property("mi", "Mithral Armor", { unique: false, property: { appliesTo: { kinds: ["armor"], armorCategories: ["medium", "heavy"] }, nameTemplate: "Mithral Armor ({base})", overrides: { stealthDisadvantage: false, strength: null } } });

const armorPlus1 = property("a1", "Armor +1", { unique: false, property: { appliesTo: { kinds: ["armor", "shield"] } } });

const luckBlade = property("lk", "Luck Blade", { unique: false, property: { appliesTo: { kinds: ["weapon"], bases: ["longsword", "Rapier"] } } });

describe("itemKindOf / matchesAppliesTo", () => {
  it("kinds by slot; armor needs an armor model; properties are not bases", () => {
    expect(itemKindOf(longsword)).toBe("weapon");
    expect(itemKindOf(longbow)).toBe("weapon");
    expect(itemKindOf(plate)).toBe("armor");
    expect(itemKindOf(shield)).toBe("shield");
    expect(itemKindOf({ ...plate, modifiers: [] })).toBeNull();
    expect(itemKindOf({ id: "r", name: "Ring", slot: "ring" })).toBeNull();
    expect(itemKindOf(flameTongue)).toBeNull();
  });

  it("attack type, armor categories, base names (case-insensitive), shield ≠ armor", () => {
    expect(matchesAppliesTo(longsword, flameTongue)).toBe(true);
    expect(matchesAppliesTo(longbow, flameTongue)).toBe(false);
    expect(matchesAppliesTo(plate, mithral)).toBe(true);
    expect(matchesAppliesTo(leather, mithral)).toBe(false);
    expect(matchesAppliesTo(shield, armorPlus1)).toBe(true);
    expect(matchesAppliesTo(shield, mithral)).toBe(false);
    expect(matchesAppliesTo(longsword, luckBlade)).toBe(true);
    expect(matchesAppliesTo(weapon("gs", "Greatsword", { damageDice: "2d6" }), luckBlade)).toBe(false);
    expect(matchesAppliesTo(flameTongue, plus2)).toBe(false);
    expect(matchesAppliesTo(longsword, longsword)).toBe(false);
  });
});

describe("composeItemRow", () => {
  it("name by template; default template", () => {
    expect(composedName(longsword, flameTongue, "Flame Tongue {base}")).toBe("Flame Tongue Longsword");
    expect(composedName(longsword, flameTongue)).toBe("Flame Tongue (Longsword)");
  });

  it("Flame Tongue Longsword: ref id, base stats and slot, property rarity, prefixed rider, attunement kept", () => {
    const row = composeItemRow(longsword, flameTongue);

    expect(row).toMatchObject({ id: "ls+ft", name: "Flame Tongue Longsword", slot: "weapon", icon: "ls.png", rarity: "rare", description: "Flame Tongue text", setId: null });
    expect(row.modifiers).toContainEqual({ type: "damageDice", value: "1d8" });
    expect(row.abilities).toEqual([expect.objectContaining({ id: "p-rider" })]);
    expect(itemStatsFromRow(row)).toEqual({ unique: false, attunement: true });
  });

  it("Longsword (+2): attack and damage bonuses summed", () => {
    const row = composeItemRow({ ...longsword, bonuses: { attackBonus: 1 } }, plus2);

    expect(row.bonuses).toEqual({ attackBonus: 3 });
    expect(row.modifiers).toContainEqual({ type: "damageBonus", value: "2" });
    expect(row.name).toBe("Longsword (+2)");
  });

  it("Mithral Plate drops strength and stealth; addTraits and damageType override weapon stats", () => {
    const row = composeItemRow(plate, mithral);

    expect((row.modifiers as Array<{ type: string }>).map((m) => m.type)).not.toContain("armorStrength");
    expect((row.modifiers as Array<{ type: string }>).map((m) => m.type)).not.toContain("armorStealth");

    const sun = property("sb", "Radiant", { property: { appliesTo: { kinds: ["weapon"] }, overrides: { damageType: "radiant", addTraits: ["finesse"] } } });

    const composed = composeItemRow(longsword, sun);

    expect(composed.modifiers).toContainEqual({ type: "damageType", value: "radiant" });
    expect(composed.modifiers).toContainEqual({ type: "traits", value: "versatile,finesse" });
  });

  it("a HOMM unique base stays unique in the composed row", () => {
    const homm = { ...longsword, id: "homm", modifiers: weaponStatsColumns({ damageDice: "1d8" }).modifiers };

    expect(itemStatsFromRow(composeItemRow(homm, plus2))).toBeNull();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm test:run lib/utils/items/__tests__/ref.test.ts lib/utils/items/__tests__/compose.test.ts`
Expected: FAIL — модулів немає.

- [ ] **Step 3: Ref** — `lib/utils/items/ref.ts`:

```ts
export const ITEM_REF_RE = /^[^+\s]{1,64}(\+[^+\s]{1,64})?$/;

export const itemRef = (baseId: string, propertyId?: string | null) => (propertyId ? `${baseId}+${propertyId}` : baseId);

export function parseItemRef(ref: string): { baseId: string; propertyId: string | null } | null {
  if (!ITEM_REF_RE.test(ref)) return null;

  const [baseId, propertyId] = ref.split("+");

  return { baseId, propertyId: propertyId ?? null };
}

export function refArtifactIds(ref: string): string[] {
  const parsed = parseItemRef(ref);

  if (!parsed) return [];

  return parsed.propertyId ? [parsed.baseId, parsed.propertyId] : [parsed.baseId];
}

export const isComposedRef = (ref: string) => parseItemRef(ref)?.propertyId != null;
```

- [ ] **Step 4: Compose** — `lib/utils/items/compose.ts`:

```ts
import { ArmorModifierType, ArtifactModifierType, ArtifactSlot, ItemModifierType } from "@/lib/constants/artifacts";
import { parseWeaponTraits } from "@/lib/constants/weapon-traits";
import { armorStatsFromRow } from "@/lib/utils/artifacts/armor-row";
import { isRecord } from "@/lib/utils/common/is-record";
import { itemStatsFromRow, itemStatsRecords } from "@/lib/utils/items/item-row";
import type { ItemKind, ItemStats } from "@/lib/utils/items/item-stats";
import { itemRef } from "@/lib/utils/items/ref";

export interface ItemRowLike {
  id: string;
  name: string;
  slot: string;
  icon?: string | null;
  rarity?: string | null;
  description?: string | null;
  setId?: string | null;
  bonuses?: unknown;
  modifiers?: unknown;
  abilities?: unknown;
}

type Mod = { type: string; value: string };

export const DEFAULT_NAME_TEMPLATE = "{name} ({base})";

export const PROPERTY_ABILITY_PREFIX = "p-";

const mods = (row: { modifiers?: unknown }): Mod[] => (Array.isArray(row.modifiers) ? row.modifiers : []).filter((m): m is Mod => isRecord(m) && typeof m.type === "string");

const modValue = (row: { modifiers?: unknown }, type: string) => mods(row).find((m) => m.type === type)?.value;

const list = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);

export function itemKindOf(row: ItemRowLike): ItemKind | null {
  if (itemStatsFromRow(row)?.property) return null;

  if (row.slot === ArtifactSlot.WEAPON || row.slot === ArtifactSlot.RANGE_WEAPON) return "weapon";

  if (row.slot === ArtifactSlot.ARMOR) return armorStatsFromRow(row) ? "armor" : null;

  return row.slot === ArtifactSlot.SHIELD ? "shield" : null;
}

const attackTypeOf = (row: ItemRowLike) => (row.slot === ArtifactSlot.RANGE_WEAPON || modValue(row, ArtifactModifierType.ATTACK_TYPE) === "ranged" ? "ranged" : "melee");

export function matchesAppliesTo(base: ItemRowLike, property: ItemRowLike): boolean {
  const applies = itemStatsFromRow(property)?.property?.appliesTo;

  const kind = itemKindOf(base);

  if (!applies || !kind || !applies.kinds.includes(kind)) return false;

  if (kind === "weapon" && applies.attackType && attackTypeOf(base) !== applies.attackType) return false;

  if (kind === "armor" && applies.armorCategories && !applies.armorCategories.includes(armorStatsFromRow(base)?.category ?? "light")) return false;

  const name = base.name.trim().toLowerCase();

  return !applies.bases || applies.bases.some((b) => b.trim().toLowerCase() === name);
}

export function composedName(base: { name: string }, property: { name: string }, template?: string): string {
  return (template?.trim() || DEFAULT_NAME_TEMPLATE).replaceAll("{base}", base.name).replaceAll("{name}", property.name);
}

function sumNumbers(a: unknown, b: unknown): Record<string, number> {
  const out: Record<string, number> = {};

  for (const src of [a, b]) {
    if (!isRecord(src)) continue;

    for (const [k, v] of Object.entries(src)) if (typeof v === "number") out[k] = (out[k] ?? 0) + v;
  }

  return out;
}

type Overrides = NonNullable<NonNullable<ItemStats["property"]>["overrides"]>;

function applyOverrides(base: Mod[], o: Overrides | undefined): Mod[] {
  if (!o) return base;

  let out = base;

  if (o.stealthDisadvantage === false) out = out.filter((m) => m.type !== ArmorModifierType.STEALTH);

  if (o.strength === null) out = out.filter((m) => m.type !== ArmorModifierType.STRENGTH);

  if (o.damageType) out = [...out.filter((m) => m.type !== ArtifactModifierType.DAMAGE_TYPE), { type: ArtifactModifierType.DAMAGE_TYPE, value: o.damageType }];

  if (o.addTraits?.length) {
    const traits = [...new Set([...parseWeaponTraits(out.find((m) => m.type === ArtifactModifierType.TRAITS)?.value), ...o.addTraits])];

    out = [...out.filter((m) => m.type !== ArtifactModifierType.TRAITS), { type: ArtifactModifierType.TRAITS, value: traits.join(",") }];
  }

  return out;
}

export function composeItemRow<R extends ItemRowLike>(base: R, property: R): R {
  const p = itemStatsFromRow(property);

  const b = itemStatsFromRow(base);

  const damage = Number(modValue(base, ArtifactModifierType.DAMAGE_BONUS) ?? 0) + Number(modValue(property, ArtifactModifierType.DAMAGE_BONUS) ?? 0);

  const baseMods = applyOverrides(
    mods(base).filter((m) => m.type !== ItemModifierType.STATS && m.type !== ArtifactModifierType.DAMAGE_BONUS),
    p?.property?.overrides,
  );

  const stats: ItemStats = { ...(b?.unique === false && { unique: false }), ...(p?.attunement && { attunement: true }), ...(p?.charges && { charges: p.charges }) };

  const prefixed = list(property.abilities).map((a) => (isRecord(a) && typeof a.id === "string" ? { ...a, id: `${PROPERTY_ABILITY_PREFIX}${a.id}` } : a));

  return {
    ...base,
    id: itemRef(base.id, property.id),
    name: composedName(base, property, p?.property?.nameTemplate),
    icon: property.icon ?? base.icon ?? null,
    rarity: property.rarity ?? base.rarity ?? null,
    description: property.description ?? base.description ?? null,
    setId: property.setId ?? null,
    bonuses: sumNumbers(base.bonuses, property.bonuses),
    modifiers: [...baseMods, ...(damage ? [{ type: ArtifactModifierType.DAMAGE_BONUS, value: String(damage) }] : []), ...itemStatsRecords(stats)],
    abilities: [...list(base.abilities), ...prefixed],
  };
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `pnpm test:run lib/utils/items`
Expected: PASS.

- [ ] **Step 6: Zod-free check** — `grep -n "zod\|item-stats\"" lib/utils/items/ref.ts lib/utils/items/compose.ts lib/utils/items/item-row.ts` — дозволено лише `import type … from "@/lib/utils/items/item-stats"`.

- [ ] **Step 7: Type check and commit**

`pnpm exec tsc --noEmit -p tsconfig.json` → 0 errors.

```bash
git add lib/utils/items/ref.ts lib/utils/items/compose.ts lib/utils/items/__tests__/ref.test.ts lib/utils/items/__tests__/compose.test.ts
git commit -m "feat(constructor): 4f-3 item refs and composed item rows

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: `resolveItemRows`, носіння й ref-орієнтована унікальність

**Files:**
- Create: `lib/utils/items/resolve.ts`
- Modify: `lib/utils/artifacts/ownership.ts`, `lib/utils/inventory/items.ts`, `types/inventory.ts`
- Test: `lib/utils/items/__tests__/resolve.test.ts`, `lib/utils/artifacts/__tests__/ownership-refs.test.ts`, `lib/utils/inventory/__tests__/items-artifact-id.test.ts`

**Interfaces:**
- Consumes: задачі 2–3.
- Produces:
  - `getRow<R>(rows: RowsById<R>, id: string): R | undefined`.
  - `types/inventory.ts`: `SpecialItem.artifactId?: string`; `StashState.attuned?: string[]`; `Inventory.attuned?: string[]`.
  - `normalizeItems` зберігає `artifactId` (рядок, непорожній).
  - `type RowsById<R> = ReadonlyMap<string, R> | Readonly<Record<string, R>>`; `interface InventoryLike { equipped?: unknown; stash?: unknown; attuned?: unknown; items?: unknown }`; `interface ItemResolveOptions { attuned?: readonly string[]; itemsEnabled?: boolean }`.
  - `resolveItemRow<R extends ItemRowLike>(ref: string, rowsById: RowsById<R>, opts?: ItemResolveOptions): R | null`; `resolveItemRows<R extends ItemRowLike>(refs: readonly string[], rowsById: RowsById<R>, opts?: ItemResolveOptions): R[]`.
  - `equippedEntries(inv: InventoryLike | null | undefined): [string, string][]`; `heldRefs(inv): string[]`; `attunedRefs(inv): string[]`; `interface ActiveItemRef { ref: string; slot: string; carried?: true }`; `activeItemRefs<R extends ItemRowLike>(inv, rowsById: RowsById<R>, itemsEnabled: boolean): ActiveItemRef[]`; `inventoryArtifactIds(inv, opts: { stash: boolean; consumables: boolean }): string[]`; `uniqueChecker<R extends ItemRowLike>(rowsById: RowsById<R>): (artifactId: string) => boolean`; `attunementRequired<R>(ref, rowsById): boolean`; `itemChargesOf<R>(ref, rowsById): ItemStats["charges"] | null`; `pruneAttuned(attuned: readonly string[], inv: InventoryLike): string[]`.
  - `ownership.ts`: `type IsUnique = (artifactId: string) => boolean`; `findHolder(inventories, ref, exceptCharacterId?, isUnique?: IsUnique): string | null`; `uniqueConflict(refs: readonly string[], isUnique?: IsUnique): boolean`.

- [ ] **Step 1: Write the failing tests**

`lib/utils/items/__tests__/resolve.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { weaponStatsColumns } from "@/lib/utils/artifacts/weapon-stats";
import { itemStatsColumns, type ItemStats } from "@/lib/utils/items/item-stats";
import { activeItemRefs, attunementRequired, heldRefs, inventoryArtifactIds, itemChargesOf, pruneAttuned, resolveItemRow, resolveItemRows, uniqueChecker } from "@/lib/utils/items/resolve";

const row = (id: string, slot: string, item?: ItemStats, extra: { bonuses?: object; abilities?: unknown[]; modifiers?: unknown[] } = {}) => ({
  id,
  name: id,
  slot,
  bonuses: extra.bonuses ?? {},
  modifiers: [...(extra.modifiers ?? []), ...(item ? itemStatsColumns(item).modifiers : [])],
  abilities: extra.abilities ?? [],
});

const RIDER = { id: "r", name: "R", trigger: { event: "hit", role: "attacker" }, effects: [{ kind: "note", text: "x" }] };

const rows = new Map(
  [
    row("sword", "weapon", { unique: false }, { modifiers: weaponStatsColumns({ damageDice: "1d8" }).modifiers }),
    row("ft", "weapon", { unique: false, attunement: true, property: { appliesTo: { kinds: ["weapon"] } } }, { abilities: [RIDER] }),
    row("sun", "weapon", { unique: false, attunement: true }, { bonuses: { attackBonus: 2 }, modifiers: weaponStatsColumns({ damageDice: "1d8", damageBonus: 2 }).modifiers, abilities: [RIDER] }),
    row("wand", "item", { unique: false, charges: { max: 7, rest: "long" } }),
    row("ring", "ring", { unique: false, attunement: true }),
    row("homm", "helmet"),
    row("cloak", "cloak", { unique: false }),
  ].map((r) => [r.id, r]),
);

describe("resolveItemRow(s)", () => {
  it("plain, composed, unknown and bare-property refs", () => {
    expect(resolveItemRow("sword", rows)?.id).toBe("sword");
    expect(resolveItemRow("sword+ft", rows)).toMatchObject({ id: "sword+ft", name: "ft (sword)" });
    expect(resolveItemRow("gone", rows)).toBeNull();
    expect(resolveItemRow("sword+gone", rows)).toBeNull();
    expect(resolveItemRow("gone+ft", rows)).toBeNull();
    expect(resolveItemRow("ft", rows)).toBeNull();
    expect(resolveItemRows(["sword", "gone", "sword+ft"], rows).map((r) => r.id)).toEqual(["sword", "sword+ft"]);
  });

  it("items disabled → attunement ignored (all active)", () => {
    expect(resolveItemRow("sword+ft", rows)?.abilities).toHaveLength(1);
    expect(resolveItemRow("sun", rows)?.bonuses).toEqual({ attackBonus: 2 });
  });

  it("items enabled, not attuned → base only / stripped unique; attuned → full", () => {
    const off = { itemsEnabled: true, attuned: [] };

    const composed = resolveItemRow("sword+ft", rows, off);

    expect(composed).toMatchObject({ id: "sword+ft", name: "ft (sword)", abilities: [] });

    const sun = resolveItemRow("sun", rows, off)!;

    expect(sun.bonuses).toEqual({});
    expect(sun.abilities).toEqual([]);
    expect((sun.modifiers as Array<{ type: string }>).map((m) => m.type)).toEqual(["damageDice"]);

    const on = { itemsEnabled: true, attuned: ["sword+ft", "sun"] };

    expect(resolveItemRow("sword+ft", rows, on)?.abilities).toHaveLength(1);
    expect(resolveItemRow("sun", rows, on)?.bonuses).toEqual({ attackBonus: 2 });
  });

  it("a pre-resolved composed row (balance/sim preload) is taken as is", () => {
    const pre = new Map([["sword+ft", { id: "sword+ft", name: "FT", slot: "weapon" }]]);

    expect(resolveItemRow("sword+ft", pre)?.name).toBe("FT");
  });
});

describe("inventory helpers", () => {
  const inv = { equipped: { weapon: "sword+ft", shield: "sword", helmet: "homm" }, stash: ["wand", "ring", "cloak", "sword"], attuned: ["sword+ft", "gone"], items: [{ id: "p1", name: "Potion", quantity: 2, consumable: true, artifactId: "potion" }] };

  it("held refs and stale attunement pruning", () => {
    expect(heldRefs(inv)).toEqual(["sword+ft", "sword", "homm", "wand", "ring", "cloak"]);
    expect(pruneAttuned(inv.attuned, inv)).toEqual(["sword+ft"]);
  });

  it("carried: item/ring from the stash only when items are enabled and not worn", () => {
    expect(activeItemRefs(inv, rows, false)).toEqual([
      { ref: "sword+ft", slot: "weapon" },
      { ref: "sword", slot: "shield" },
      { ref: "homm", slot: "helmet" },
    ]);
    expect(activeItemRefs(inv, rows, true).slice(3)).toEqual([
      { ref: "wand", slot: "item", carried: true },
      { ref: "ring", slot: "ring", carried: true },
    ]);
  });

  it("artifact ids to load", () => {
    expect(inventoryArtifactIds(inv, { stash: false, consumables: false })).toEqual(["sword", "ft", "homm"]);
    expect(inventoryArtifactIds(inv, { stash: true, consumables: true })).toEqual(["sword", "ft", "homm", "wand", "ring", "cloak", "potion"]);
    expect(inventoryArtifactIds(null, { stash: true, consumables: true })).toEqual([]);
  });

  it("uniqueness, attunement and charges lookups", () => {
    const unique = uniqueChecker(rows);

    expect(unique("homm")).toBe(true);
    expect(unique("sword")).toBe(false);
    expect(unique("ft")).toBe(false);
    expect(unique("unknown")).toBe(true);
    expect(attunementRequired("sword+ft", rows)).toBe(true);
    expect(attunementRequired("sword", rows)).toBe(false);
    expect(attunementRequired("ring", rows)).toBe(true);
    expect(itemChargesOf("wand", rows)).toEqual({ max: 7, rest: "long" });
    expect(itemChargesOf("sword", rows)).toBeNull();
  });
});
```

`lib/utils/artifacts/__tests__/ownership-refs.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { findHolder, uniqueConflict } from "@/lib/utils/artifacts/ownership";

const inv = (characterId: string, equipped: Record<string, string>, stash: string[] = []) => ({ characterId, equipped, stash });

const gear = new Set(["dagger", "ls", "ft"]);

const isUnique = (id: string) => !gear.has(id);

describe("findHolder with refs", () => {
  it("non-unique items are never held; properties are not unique", () => {
    expect(findHolder([inv("a", { weapon: "dagger" })], "dagger", undefined, isUnique)).toBeNull();
    expect(findHolder([inv("a", { weapon: "ls+ft" })], "ls+ft", undefined, isUnique)).toBeNull();
  });

  it("a unique HOMM base inside a composed ref stays one per campaign", () => {
    expect(findHolder([inv("a", { weapon: "homm+ft" })], "homm", undefined, isUnique)).toBe("a");
    expect(findHolder([inv("a", {}, ["homm"])], "homm+ft", undefined, isUnique)).toBe("a");
    expect(findHolder([inv("a", {}, ["homm"])], "homm+ft", "a", isUnique)).toBeNull();
  });

  it("default (no checker) = everything unique, as before", () => {
    expect(findHolder([inv("a", { weapon: "dagger" })], "dagger")).toBe("a");
  });
});

describe("uniqueConflict", () => {
  it("duplicates allowed only for non-unique refs", () => {
    expect(uniqueConflict(["dagger", "dagger"], isUnique)).toBe(false);
    expect(uniqueConflict(["homm", "homm"], isUnique)).toBe(true);
    expect(uniqueConflict(["homm+ft", "homm"], isUnique)).toBe(true);
    expect(uniqueConflict(["ls+ft", "ls+ft"], isUnique)).toBe(false);
    expect(uniqueConflict(["a", "a"])).toBe(true);
  });
});
```

`lib/utils/inventory/__tests__/items-artifact-id.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { normalizeItems } from "@/lib/utils/inventory/items";

describe("normalizeItems: artifactId", () => {
  it("keeps a string artifactId, drops junk", () => {
    expect(normalizeItems([{ id: "p", name: "Potion", quantity: 2, consumable: true, artifactId: "a1" }])).toEqual([{ id: "p", name: "Potion", quantity: 2, consumable: true, artifactId: "a1" }]);
    expect(normalizeItems([{ id: "p", name: "Potion", artifactId: 5 }])[0]).not.toHaveProperty("artifactId");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm test:run lib/utils/items/__tests__/resolve.test.ts lib/utils/artifacts/__tests__/ownership-refs.test.ts lib/utils/inventory/__tests__/items-artifact-id.test.ts`
Expected: FAIL.

- [ ] **Step 3: Types and normalizer** — `types/inventory.ts`: `SpecialItem` — `artifactId?: string;`; `StashState` — `attuned?: string[];`; `Inventory` — `attuned?: string[];`. `lib/utils/inventory/items.ts`, у `normalizeItems` після рядка `consumable: o.consumable === true,` — `...(typeof o.artifactId === "string" && o.artifactId ? { artifactId: o.artifactId } : {}),`.

- [ ] **Step 4: Resolve** — `lib/utils/items/resolve.ts`:

```ts
import { ArtifactModifierType, CARRIED_SLOTS, ItemModifierType } from "@/lib/constants/artifacts";
import { isRecord } from "@/lib/utils/common/is-record";
import { normalizeItems, normalizeStash } from "@/lib/utils/inventory/items";
import { composedName, composeItemRow, type ItemRowLike } from "@/lib/utils/items/compose";
import { itemStatsFromRow, isUniqueRow } from "@/lib/utils/items/item-row";
import type { ItemStats } from "@/lib/utils/items/item-stats";
import { isComposedRef, parseItemRef, refArtifactIds } from "@/lib/utils/items/ref";

export type RowsById<R> = ReadonlyMap<string, R> | Readonly<Record<string, R>>;

export interface InventoryLike {
  equipped?: unknown;
  stash?: unknown;
  attuned?: unknown;
  items?: unknown;
}

export interface ItemResolveOptions {
  attuned?: readonly string[];
  itemsEnabled?: boolean;
}

export interface ActiveItemRef {
  ref: string;
  slot: string;
  carried?: true;
}

export const getRow = <R>(rows: RowsById<R>, id: string): R | undefined => (rows instanceof Map ? rows.get(id) : (rows as Record<string, R>)[id]);

const needsAttunement = (row: ItemRowLike, ref: string, opts: ItemResolveOptions) =>
  !!opts.itemsEnabled && itemStatsFromRow(row)?.attunement === true && !(opts.attuned ?? []).includes(ref);

// an unattuned unique item stays a weapon/armor but grants nothing
const strip = <R extends ItemRowLike>(row: R): R => ({
  ...row,
  bonuses: {},
  abilities: [],
  modifiers: (Array.isArray(row.modifiers) ? row.modifiers : []).filter((m) => !(isRecord(m) && (m.type === ArtifactModifierType.DAMAGE_BONUS || m.type === ItemModifierType.STATS))),
});

/** Єдиний вхід для читачів `equipped`/`stash`/`attuned`: невідоме (видалене) — null. */
export function resolveItemRow<R extends ItemRowLike>(ref: string, rowsById: RowsById<R>, opts: ItemResolveOptions = {}): R | null {
  const direct = isComposedRef(ref) ? getRow(rowsById, ref) : undefined;

  if (direct) return direct;

  const parsed = parseItemRef(ref);

  const base = parsed && getRow(rowsById, parsed.baseId);

  if (!parsed || !base || itemStatsFromRow(base)?.property) return null;

  if (!parsed.propertyId) return needsAttunement(base, ref, opts) ? strip(base) : base;

  const property = getRow(rowsById, parsed.propertyId);

  const propertyStats = property && itemStatsFromRow(property);

  if (!property || !propertyStats?.property) return null;

  if (needsAttunement(property, ref, opts)) return { ...base, id: ref, name: composedName(base, property, propertyStats.property.nameTemplate) };

  return composeItemRow(base, property);
}

export const resolveItemRows = <R extends ItemRowLike>(refs: readonly string[], rowsById: RowsById<R>, opts: ItemResolveOptions = {}): R[] =>
  refs.flatMap((ref) => resolveItemRow(ref, rowsById, opts) ?? []);

export const equippedEntries = (inv: InventoryLike | null | undefined): [string, string][] =>
  Object.entries(isRecord(inv?.equipped) ? inv.equipped : {}).filter((e): e is [string, string] => typeof e[1] === "string" && e[1].length > 0);

export const heldRefs = (inv: InventoryLike | null | undefined): string[] => [...new Set([...equippedEntries(inv).map(([, r]) => r), ...normalizeStash(inv?.stash)])];

export const attunedRefs = (inv: InventoryLike | null | undefined): string[] => normalizeStash(inv?.attuned);

export function activeItemRefs<R extends ItemRowLike>(inv: InventoryLike | null | undefined, rowsById: RowsById<R>, itemsEnabled: boolean): ActiveItemRef[] {
  const worn = equippedEntries(inv).map(([slot, ref]) => ({ ref, slot }));

  if (!itemsEnabled) return worn;

  const wornRefs = new Set(worn.map((w) => w.ref));

  const carried = normalizeStash(inv?.stash).flatMap((ref): ActiveItemRef[] => {
    const slot = getRow(rowsById, parseItemRef(ref)?.baseId ?? "")?.slot;

    return !wornRefs.has(ref) && slot && CARRIED_SLOTS.has(slot) ? [{ ref, slot, carried: true }] : [];
  });

  return [...worn, ...carried];
}

export function inventoryArtifactIds(inv: InventoryLike | null | undefined, opts: { stash: boolean; consumables: boolean }): string[] {
  const refs = [...equippedEntries(inv).map(([, r]) => r), ...(opts.stash ? normalizeStash(inv?.stash) : [])];

  const consumables = opts.consumables ? normalizeItems(inv?.items).flatMap((i) => (i.artifactId ? [i.artifactId] : [])) : [];

  return [...new Set([...refs.flatMap(refArtifactIds), ...consumables])];
}

export const uniqueChecker =
  <R extends ItemRowLike>(rowsById: RowsById<R>) =>
  (artifactId: string): boolean => {
    const row = getRow(rowsById, artifactId);

    return !row || isUniqueRow(row);
  };

const statsOwner = <R extends ItemRowLike>(ref: string, rowsById: RowsById<R>): R | undefined => {
  const parsed = parseItemRef(ref);

  return parsed ? getRow(rowsById, parsed.propertyId ?? parsed.baseId) : undefined;
};

export const attunementRequired = <R extends ItemRowLike>(ref: string, rowsById: RowsById<R>): boolean => {
  const owner = statsOwner(ref, rowsById);

  return !!owner && itemStatsFromRow(owner)?.attunement === true;
};

export const itemChargesOf = <R extends ItemRowLike>(ref: string, rowsById: RowsById<R>): ItemStats["charges"] | null => {
  const owner = statsOwner(ref, rowsById);

  return (owner && itemStatsFromRow(owner)?.charges) ?? null;
};

export const pruneAttuned = (attuned: readonly string[], inv: InventoryLike): string[] => {
  const held = new Set(heldRefs(inv));

  return [...new Set(attuned)].filter((r) => held.has(r));
};
```

- [ ] **Step 5: Ownership** — `lib/utils/artifacts/ownership.ts`: імпорт `refArtifactIds` з `@/lib/utils/items/ref`; замінити `findHolder`:

```ts
export type IsUnique = (artifactId: string) => boolean;

const ALL_UNIQUE: IsUnique = () => true;

const heldIds = (inv: HeldInventory) => [...Object.values(inv.equipped), ...inv.stash].filter((v): v is string => !!v).flatMap(refArtifactIds);

/** Хто тримає хоч один унікальний артефакт із ref (база чи властивість складеного); неунікальні не перевіряються. */
export function findHolder(inventories: HeldInventory[], ref: string, exceptCharacterId?: string, isUnique: IsUnique = ALL_UNIQUE): string | null {
  const ids = refArtifactIds(ref).filter(isUnique);

  if (ids.length === 0) return null;

  return inventories.find((inv) => inv.characterId !== exceptCharacterId && heldIds(inv).some((id) => ids.includes(id)))?.characterId ?? null;
}

export function uniqueConflict(refs: readonly string[], isUnique: IsUnique = ALL_UNIQUE): boolean {
  const ids = refs.flatMap(refArtifactIds).filter(isUnique);

  return new Set(ids).size !== ids.length;
}
```

`planTransfer` не змінюється (переносить ref як непрозорий рядок).

- [ ] **Step 6: Run tests to verify they pass**

Run: `pnpm test:run lib/utils/items lib/utils/artifacts lib/utils/inventory`
Expected: PASS (наявні `ownership.test.ts`, `items.test.ts`, `stash-actions.test.ts` — без змін).

- [ ] **Step 7: Type check and commit**

`pnpm exec tsc --noEmit -p tsconfig.json` → 0 errors.

```bash
git add lib/utils/items/resolve.ts lib/utils/items/__tests__/resolve.test.ts lib/utils/artifacts/ownership.ts lib/utils/artifacts/__tests__/ownership-refs.test.ts lib/utils/inventory/items.ts lib/utils/inventory/__tests__/items-artifact-id.test.ts types/inventory.ts
git commit -m "feat(constructor): 4f-3 resolveItemRows, carried items and ref-aware uniqueness

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---
### Task 5: Міграція `attuned`, план видачі й чисті дії сховища (`attune`/`unattune`, видача з базою/кількістю)

**Files:**
- Modify: `prisma/schema.prisma` (модель `CharacterInventory`)
- Create: `prisma/migrations/20261102000000_inventory_attuned/migration.sql`, `lib/utils/items/grant.ts`
- Modify: `lib/utils/inventory/stash-actions.ts`, `lib/utils/inventory/permissions.ts`, `lib/constants/inventory.ts`, `components/character-profile/stash/describe-log.ts`, `app/api/campaigns/[id]/characters/[characterId]/stash/stash-schema.ts`
- Test: `lib/utils/items/__tests__/grant.test.ts`, `lib/utils/inventory/__tests__/stash-items-4f3.test.ts`, `app/api/campaigns/[id]/characters/[characterId]/stash/__tests__/stash-schema-4f3.test.ts`

**Interfaces:**
- Consumes: `getRow`, `heldRefs`, `pruneAttuned`, `RowsById` (задача 4); `matchesAppliesTo`, `composedName` (задача 3); `itemRef`, `isComposedRef`, `ITEM_REF_RE` (задача 3); `ITEM_LIMITS` (задача 2).
- Produces:
  - Prisma `CharacterInventory.attuned Json @default("[]")`.
  - `type GrantPlan = { kind: "stash"; ref: string; name: string } | { kind: "consumable"; artifactId: string; name: string; description?: string; quantity: number }`; `type GrantError = "ARTIFACT_NOT_FOUND" | "ITEM_PROPERTY_NEEDS_BASE" | "ITEM_BASE_MISMATCH"`; `planGrant<R extends ItemRowLike>(body: { artifactId: string; baseId?: string; quantity?: number }, rowsById: RowsById<R>): { ok: true; plan: GrantPlan } | { ok: false; error: GrantError }`.
  - `StashAction` += `{ action: "grant"; artifactId: string; baseId?: string; quantity?: number }` (розширення наявного), `{ action: "attune"; ref: string }`, `{ action: "unattune"; ref: string }`; `applyStashAction(s, a, ctx)` — `ctx` += `grant?: GrantPlan`, `items?: { enabled: boolean; limit: number; attunable: boolean }`, `name?: string`.
  - `StashError` += `ALREADY_IN_STASH`, `ITEMS_DISABLED`, `ITEM_NOT_HELD`, `ATTUNEMENT_NOT_REQUIRED`, `ALREADY_ATTUNED`, `ATTUNEMENT_LIMIT`, `ITEM_NOT_ATTUNED`.
  - `InventoryLogKind.ITEM_ATTUNE = "artifact_attune"`, `ITEM_UNATTUNE = "artifact_unattune"`.
  - `stashActionSchema`: `equip.artifactId`/`revoke.artifactId` — ref; `grant { artifactId, baseId?, quantity? (1–99) }`; `attune`/`unattune { ref }`.

- [ ] **Step 1: Migration** — `prisma/schema.prisma`, модель `CharacterInventory` після `stash       Json      @default("[]")`: `attuned     Json      @default("[]")`. `prisma/migrations/20261102000000_inventory_attuned/migration.sql`:

```sql
ALTER TABLE "character_inventories" ADD COLUMN "attuned" JSONB NOT NULL DEFAULT '[]';
```

Run: `set -a; source .env.local; set +a; pnpm exec prisma migrate deploy && pnpm exec prisma generate`
Expected: `Applying migration 20261102000000_inventory_attuned`, `Generated Prisma Client`. Перевірка: `psql "postgresql://postgres:postgres@localhost:54322/constructor" -At -c "select column_name, column_default from information_schema.columns where table_name = 'character_inventories' and column_name = 'attuned';"` → `attuned|'[]'::jsonb`.

- [ ] **Step 2: Write the failing tests**

`lib/utils/items/__tests__/grant.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { weaponStatsColumns } from "@/lib/utils/artifacts/weapon-stats";
import { planGrant } from "@/lib/utils/items/grant";
import { itemStatsColumns, type ItemStats } from "@/lib/utils/items/item-stats";

const row = (id: string, name: string, slot: string, item?: ItemStats, description?: string) => ({ id, name, slot, description: description ?? null, modifiers: [...(slot === "weapon" ? weaponStatsColumns({ damageDice: "1d8" }).modifiers : []), ...(item ? itemStatsColumns(item).modifiers : [])] });

const rows = new Map(
  [
    row("ls", "Longsword", "weapon", { unique: false }),
    row("ft", "Flame Tongue", "weapon", { unique: false, property: { appliesTo: { kinds: ["weapon"] }, nameTemplate: "Flame Tongue {base}" } }),
    row("ring", "Ring", "ring", { unique: false }),
    row("pot", "Potion of Healing", "item", { unique: false, consumable: true }, "Regain 2d4 + 2 HP."),
    row("homm", "Меч", "weapon"),
  ].map((r) => [r.id, r]),
);

describe("planGrant", () => {
  it("plain artifact → stash ref", () => {
    expect(planGrant({ artifactId: "homm" }, rows)).toEqual({ ok: true, plan: { kind: "stash", ref: "homm", name: "Меч" } });
  });

  it("property: needs a matching base", () => {
    expect(planGrant({ artifactId: "ft" }, rows)).toEqual({ ok: false, error: "ITEM_PROPERTY_NEEDS_BASE" });
    expect(planGrant({ artifactId: "ft", baseId: "ring" }, rows)).toEqual({ ok: false, error: "ITEM_BASE_MISMATCH" });
    expect(planGrant({ artifactId: "ft", baseId: "gone" }, rows)).toEqual({ ok: false, error: "ITEM_BASE_MISMATCH" });
    expect(planGrant({ artifactId: "ft", baseId: "ls" }, rows)).toEqual({ ok: true, plan: { kind: "stash", ref: "ls+ft", name: "Flame Tongue Longsword" } });
  });

  it("baseId for a non-property is a mismatch; unknown artifact → not found", () => {
    expect(planGrant({ artifactId: "homm", baseId: "ls" }, rows)).toEqual({ ok: false, error: "ITEM_BASE_MISMATCH" });
    expect(planGrant({ artifactId: "nope" }, rows)).toEqual({ ok: false, error: "ARTIFACT_NOT_FOUND" });
  });

  it("consumable → quantity (default 1, clamped 1–99)", () => {
    expect(planGrant({ artifactId: "pot", quantity: 2 }, rows)).toEqual({ ok: true, plan: { kind: "consumable", artifactId: "pot", name: "Potion of Healing", description: "Regain 2d4 + 2 HP.", quantity: 2 } });
    expect(planGrant({ artifactId: "pot" }, rows)).toMatchObject({ ok: true, plan: { quantity: 1 } });
    expect(planGrant({ artifactId: "pot", quantity: 500 }, rows)).toMatchObject({ ok: true, plan: { quantity: 99 } });
  });
});
```

`lib/utils/inventory/__tests__/stash-items-4f3.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { applyStashAction, StashError } from "@/lib/utils/inventory/stash-actions";
import type { StashState } from "@/types/inventory";

const base = (over: Partial<StashState> = {}): StashState => ({ equipped: { weapon: "ls+ft" }, stash: ["ring", "wand"], items: [], purse: { gp: 0, sp: 0, cp: 0 }, attuned: [], ...over });

const items = (over: Partial<{ enabled: boolean; limit: number; attunable: boolean }> = {}) => ({ enabled: true, limit: 3, attunable: true, ...over });

const ctx = { newItemId: "n1" };

describe("grant with a plan", () => {
  it("composed ref goes to the stash with the composed name in the log", () => {
    const r = applyStashAction(base(), { action: "grant", artifactId: "ft", baseId: "gs" }, { ...ctx, grant: { kind: "stash", ref: "gs+ft", name: "Flame Tongue Greatsword" } });

    expect(r.ok && r.state.stash).toEqual(["ring", "wand", "gs+ft"]);
    expect(r.ok && r.log.delta).toEqual({ artifactId: "gs+ft", artifactName: "Flame Tongue Greatsword" });
  });

  it("the same ref already in the stash → ALREADY_IN_STASH", () => {
    expect(applyStashAction(base(), { action: "grant", artifactId: "ring" }, { ...ctx, grant: { kind: "stash", ref: "ring", name: "Ring" } })).toEqual({ ok: false, error: StashError.ALREADY_IN_STASH });
  });

  it("consumable adds a SpecialItem or tops up the existing one", () => {
    const plan = { kind: "consumable" as const, artifactId: "pot", name: "Potion of Healing", quantity: 2 };

    const first = applyStashAction(base(), { action: "grant", artifactId: "pot", quantity: 2 }, { ...ctx, grant: plan });

    expect(first.ok && first.state.items).toEqual([{ id: "n1", name: "Potion of Healing", quantity: 2, consumable: true, artifactId: "pot" }]);
    expect(first.ok && first.log).toEqual({ kind: "item_add", delta: { item: "Potion of Healing", qty: 2, artifactId: "pot" }, note: null });

    const again = first.ok ? applyStashAction(first.state, { action: "grant", artifactId: "pot", quantity: 2 }, { ...ctx, newItemId: "n2", grant: plan }) : first;

    expect(again.ok && again.state.items).toEqual([{ id: "n1", name: "Potion of Healing", quantity: 4, consumable: true, artifactId: "pot" }]);
  });

  it("editItem keeps the artifact link", () => {
    const s = base({ items: [{ id: "p", name: "Potion", quantity: 2, consumable: true, artifactId: "pot" }] });

    const r = applyStashAction(s, { action: "editItem", itemId: "p", name: "Зілля", quantity: 3, consumable: true }, ctx);

    expect(r.ok && r.state.items[0]).toEqual({ id: "p", name: "Зілля", quantity: 3, consumable: true, artifactId: "pot" });
  });
});

describe("attunement", () => {
  it("attune: limit, not required, not held, disabled, already", () => {
    const ok = applyStashAction(base(), { action: "attune", ref: "ls+ft" }, { ...ctx, items: items(), name: "Flame Tongue Longsword" });

    expect(ok.ok && ok.state.attuned).toEqual(["ls+ft"]);
    expect(ok.ok && ok.log).toEqual({ kind: "artifact_attune", delta: { artifactId: "ls+ft", artifactName: "Flame Tongue Longsword" }, note: null });
    expect(applyStashAction(base({ attuned: ["a", "b", "c"] }), { action: "attune", ref: "ring" }, { ...ctx, items: items() })).toEqual({ ok: false, error: StashError.ATTUNEMENT_LIMIT });
    expect(applyStashAction(base(), { action: "attune", ref: "wand" }, { ...ctx, items: items({ attunable: false }) })).toEqual({ ok: false, error: StashError.ATTUNEMENT_NOT_REQUIRED });
    expect(applyStashAction(base(), { action: "attune", ref: "boots" }, { ...ctx, items: items() })).toEqual({ ok: false, error: StashError.ITEM_NOT_HELD });
    expect(applyStashAction(base(), { action: "attune", ref: "ring" }, { ...ctx, items: items({ enabled: false }) })).toEqual({ ok: false, error: StashError.ITEMS_DISABLED });
    expect(applyStashAction(base(), { action: "attune", ref: "ring" }, ctx)).toEqual({ ok: false, error: StashError.ITEMS_DISABLED });
    expect(applyStashAction(base({ attuned: ["ring"] }), { action: "attune", ref: "ring" }, { ...ctx, items: items() })).toEqual({ ok: false, error: StashError.ALREADY_ATTUNED });
  });

  it("unattune", () => {
    const r = applyStashAction(base({ attuned: ["ring"] }), { action: "unattune", ref: "ring" }, { ...ctx, items: items() });

    expect(r.ok && r.state.attuned).toEqual([]);
    expect(applyStashAction(base(), { action: "unattune", ref: "ring" }, { ...ctx, items: items() })).toEqual({ ok: false, error: StashError.ITEM_NOT_ATTUNED });
  });

  it("stash and revoke drop the attunement unless the same ref is still worn", () => {
    const stashed = applyStashAction(base({ attuned: ["ls+ft"] }), { action: "stash", slot: "weapon" }, ctx);

    expect(stashed.ok && stashed.state.attuned).toEqual([]);

    const twin = applyStashAction(base({ equipped: { weapon: "dg", shield: "dg" }, stash: [], attuned: ["dg"] }), { action: "stash", slot: "weapon" }, ctx);

    expect(twin.ok && twin.state.attuned).toEqual(["dg"]);

    const revoked = applyStashAction(base({ attuned: ["ring"] }), { action: "revoke", artifactId: "ring" }, ctx);

    expect(revoked.ok && revoked.state.attuned).toEqual([]);
  });

  it("stash of a duplicate already in the stash → ALREADY_IN_STASH; no attuned key when the state had none", () => {
    const s = { ...base({ equipped: { weapon: "dg", shield: "dg" }, stash: ["dg"] }) };

    expect(applyStashAction(s, { action: "stash", slot: "weapon" }, ctx)).toEqual({ ok: false, error: StashError.ALREADY_IN_STASH });

    const { attuned: _a, ...legacy } = base();

    const r = applyStashAction(legacy, { action: "stash", slot: "weapon" }, ctx);

    expect(r.ok && r.state).not.toHaveProperty("attuned");
  });
});
```

`app/api/campaigns/[id]/characters/[characterId]/stash/__tests__/stash-schema-4f3.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { stashActionSchema } from "../stash-schema";

describe("stash schema 4f-3", () => {
  it("accepts refs, grant with base/quantity, attune/unattune", () => {
    expect(stashActionSchema.safeParse({ action: "equip", artifactId: "cl1+cp2" }).success).toBe(true);
    expect(stashActionSchema.safeParse({ action: "revoke", artifactId: "cl1+cp2" }).success).toBe(true);
    expect(stashActionSchema.safeParse({ action: "grant", artifactId: "cp2", baseId: "cl1" }).success).toBe(true);
    expect(stashActionSchema.safeParse({ action: "grant", artifactId: "pot", quantity: 2 }).success).toBe(true);
    expect(stashActionSchema.safeParse({ action: "attune", ref: "cl1+cp2" }).success).toBe(true);
    expect(stashActionSchema.safeParse({ action: "unattune", ref: "ring-a" }).success).toBe(true);
  });

  it("rejects malformed refs and quantities", () => {
    expect(stashActionSchema.safeParse({ action: "equip", artifactId: "a+b+c" }).success).toBe(false);
    expect(stashActionSchema.safeParse({ action: "attune", ref: "a b" }).success).toBe(false);
    expect(stashActionSchema.safeParse({ action: "grant", artifactId: "pot", quantity: 0 }).success).toBe(false);
    expect(stashActionSchema.safeParse({ action: "grant", artifactId: "pot", quantity: 100 }).success).toBe(false);
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `pnpm test:run lib/utils/items/__tests__/grant.test.ts lib/utils/inventory/__tests__/stash-items-4f3.test.ts "app/api/campaigns/[id]/characters/[characterId]/stash/__tests__/stash-schema-4f3.test.ts"`
Expected: FAIL.

- [ ] **Step 4: Grant plan** — `lib/utils/items/grant.ts` (без zod):

```ts
import { ITEM_LIMITS } from "@/lib/constants/artifacts";
import { composedName, type ItemRowLike, matchesAppliesTo } from "@/lib/utils/items/compose";
import { itemStatsFromRow } from "@/lib/utils/items/item-row";
import { itemRef } from "@/lib/utils/items/ref";
import { getRow, type RowsById } from "@/lib/utils/items/resolve";

export type GrantPlan = { kind: "stash"; ref: string; name: string } | { kind: "consumable"; artifactId: string; name: string; description?: string; quantity: number };

export type GrantError = "ARTIFACT_NOT_FOUND" | "ITEM_PROPERTY_NEEDS_BASE" | "ITEM_BASE_MISMATCH";

const clamp = (n: number) => Math.min(ITEM_LIMITS.grantQuantity[1], Math.max(ITEM_LIMITS.grantQuantity[0], Math.trunc(n)));

export function planGrant<R extends ItemRowLike>(body: { artifactId: string; baseId?: string; quantity?: number }, rowsById: RowsById<R>): { ok: true; plan: GrantPlan } | { ok: false; error: GrantError } {
  const row = getRow(rowsById, body.artifactId);

  if (!row) return { ok: false, error: "ARTIFACT_NOT_FOUND" };

  const stats = itemStatsFromRow(row);

  if (stats?.property) {
    if (!body.baseId) return { ok: false, error: "ITEM_PROPERTY_NEEDS_BASE" };

    const base = getRow(rowsById, body.baseId);

    if (!base || !matchesAppliesTo(base, row)) return { ok: false, error: "ITEM_BASE_MISMATCH" };

    return { ok: true, plan: { kind: "stash", ref: itemRef(base.id, row.id), name: composedName(base, row, stats.property.nameTemplate) } };
  }

  if (body.baseId) return { ok: false, error: "ITEM_BASE_MISMATCH" };

  if (stats?.consumable) {
    const description = row.description?.trim().slice(0, 1000);

    return { ok: true, plan: { kind: "consumable", artifactId: row.id, name: row.name.slice(0, 100), ...(description && { description }), quantity: clamp(body.quantity ?? 1) } };
  }

  return { ok: true, plan: { kind: "stash", ref: row.id, name: row.name } };
}
```

- [ ] **Step 5: Stash actions** — `lib/utils/inventory/stash-actions.ts`:
  - імпорти `ITEM_LIMITS` (з `@/lib/constants/artifacts`), `type GrantPlan` (з `@/lib/utils/items/grant`), `isComposedRef` (з `@/lib/utils/items/ref`), `heldRefs` (з `@/lib/utils/items/resolve`).
  - у `StashAction`: рядок `| { action: "grant"; artifactId: string }` → `| { action: "grant"; artifactId: string; baseId?: string; quantity?: number }`; додати `| { action: "attune"; ref: string }` і `| { action: "unattune"; ref: string }`.
  - у `StashError` додати `ALREADY_IN_STASH: "ALREADY_IN_STASH", ITEMS_DISABLED: "ITEMS_DISABLED", ITEM_NOT_HELD: "ITEM_NOT_HELD", ATTUNEMENT_NOT_REQUIRED: "ATTUNEMENT_NOT_REQUIRED", ALREADY_ATTUNED: "ALREADY_ATTUNED", ATTUNEMENT_LIMIT: "ATTUNEMENT_LIMIT", ITEM_NOT_ATTUNED: "ITEM_NOT_ATTUNED",`.
  - сигнатура: `ctx: { newItemId: string; artifactSlotType?: string; artifact?: { slot: string; bonuses?: unknown; modifiers?: unknown }; classesEnabled?: boolean; grant?: GrantPlan; items?: { enabled: boolean; limit: number; attunable: boolean }; name?: string }`.
  - над функцією:

```ts
const named = (ref: string, name?: string) => (name && isComposedRef(ref) ? { artifactName: name } : {});

const keepAttuned = (s: StashState, next: StashState, keep: (ref: string) => boolean): StashState => (s.attuned ? { ...next, attuned: s.attuned.filter(keep) } : next);
```

  - `editItem`: `{ id: i.id, ...itemFields(a) }` → `{ id: i.id, ...itemFields(a), ...(i.artifactId && { artifactId: i.artifactId }) }`.
  - `stash`: після `if (!id) return fail(StashError.SLOT_EMPTY);` додати `if (s.stash.includes(id)) return fail(StashError.ALREADY_IN_STASH);`; стан — `keepAttuned(s, { ...s, equipped, stash: [...s.stash, id] }, (r) => r !== id || Object.values(equipped).includes(id))`, де `const equipped = buildEquipped(s.equipped, a.slot, null);`.
  - `grant` (заміна гілки):

```ts
    case "grant": {
      const plan = ctx.grant;

      if (plan?.kind === "consumable") {
        const existing = s.items.find((i) => i.artifactId === plan.artifactId);

        const items = existing
          ? s.items.map((i) => (i === existing ? { ...i, quantity: Math.min(ITEM_LIMITS.quantity, i.quantity + plan.quantity) } : i))
          : [...s.items, { id: ctx.newItemId, name: plan.name, ...(plan.description && { description: plan.description }), quantity: plan.quantity, consumable: true, artifactId: plan.artifactId }];

        return ok({ ...s, items }, InventoryLogKind.ITEM_ADD, { item: plan.name, qty: plan.quantity, artifactId: plan.artifactId });
      }

      const ref = plan?.ref ?? a.artifactId;

      if (plan && s.stash.includes(ref)) return fail(StashError.ALREADY_IN_STASH);

      return ok({ ...s, stash: [...s.stash, ref] }, InventoryLogKind.ARTIFACT_GRANT, { artifactId: ref, ...named(ref, plan?.name) });
    }
```

  - `revoke`: стан — `keepAttuned(s, next, (r) => heldRefs(next).includes(r))`, де `const next = { ...s, stash: s.stash.filter((id) => id !== a.artifactId) };`.
  - нові гілки:

```ts
    case "attune": {
      if (!ctx.items?.enabled) return fail(StashError.ITEMS_DISABLED);

      if (!heldRefs(s).includes(a.ref)) return fail(StashError.ITEM_NOT_HELD);

      if (!ctx.items.attunable) return fail(StashError.ATTUNEMENT_NOT_REQUIRED);

      const attuned = s.attuned ?? [];

      if (attuned.includes(a.ref)) return fail(StashError.ALREADY_ATTUNED);

      if (attuned.length >= ctx.items.limit) return fail(StashError.ATTUNEMENT_LIMIT);

      return ok({ ...s, attuned: [...attuned, a.ref] }, InventoryLogKind.ITEM_ATTUNE, { artifactId: a.ref, ...named(a.ref, ctx.name) });
    }
    case "unattune": {
      if (!ctx.items?.enabled) return fail(StashError.ITEMS_DISABLED);

      if (!(s.attuned ?? []).includes(a.ref)) return fail(StashError.ITEM_NOT_ATTUNED);

      return ok({ ...s, attuned: (s.attuned ?? []).filter((r) => r !== a.ref) }, InventoryLogKind.ITEM_UNATTUNE, { artifactId: a.ref, ...named(a.ref, ctx.name) });
    }
```

- [ ] **Step 6: Log kinds, permissions, describe-log, schema** — `lib/constants/inventory.ts`, в `InventoryLogKind` після `ARTIFACT_TRANSFER`: `ITEM_ATTUNE: "artifact_attune", ITEM_UNATTUNE: "artifact_unattune",`. `lib/utils/inventory/permissions.ts`: у `PLAYER_ACTIONS` додати `"attune", "unattune"`. `components/character-profile/stash/describe-log.ts`, в `ARTIFACT_VERB`: `artifact_attune: "налаштовано", artifact_unattune: "знято налаштування",`. `app/api/campaigns/[id]/characters/[characterId]/stash/stash-schema.ts`:

```ts
import { ITEM_REF_RE } from "@/lib/utils/items/ref";

const ref = z.string().min(1).max(129).regex(ITEM_REF_RE);
```

і рядки: `equip` — `artifactId: ref`; `grant` — `z.object({ action: z.literal("grant"), artifactId: id, baseId: id.optional(), quantity: z.number().int().min(1).max(99).optional() })`; `revoke` — `artifactId: ref`; додати `z.object({ action: z.literal("attune"), ref })` і `z.object({ action: z.literal("unattune"), ref })`.

- [ ] **Step 7: Run tests to verify they pass**

Run: `pnpm test:run lib/utils/items lib/utils/inventory "app/api/campaigns/[id]/characters/[characterId]/stash" components/character-profile/stash prisma`
Expected: PASS (наявні `stash-actions.test.ts`, `stash-off-hand.test.ts`, `describe-log.test.ts`, `migrations-rls.test.ts` — без змін).

- [ ] **Step 8: Type check and commit**

`pnpm exec tsc --noEmit -p tsconfig.json` → 0 errors (стан без `attuned` у наявних тестах компілюється, бо поле необов'язкове).

```bash
git add prisma/schema.prisma prisma/migrations/20261102000000_inventory_attuned lib/utils/items/grant.ts lib/utils/items/__tests__/grant.test.ts lib/utils/inventory lib/constants/inventory.ts components/character-profile/stash/describe-log.ts "app/api/campaigns/[id]/characters/[characterId]/stash"
git commit -m "feat(constructor): 4f-3 attuned column, grant plan and attune/unattune stash actions

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---
### Task 6: Сервер сховища, видачі, передачі, довідника й ростера

**Files:**
- Create: `lib/utils/items/pools.ts` (лише ключі; розширюється в задачі 8)
- Modify: `app/api/campaigns/[id]/characters/[characterId]/stash/apply-stash.ts`, `…/stash/read-stash.ts`, `…/stash/free-artifacts/read-free-artifacts.ts`, `app/api/campaigns/[id]/characters/[characterId]/inventory/update-inventory.ts`, `app/api/campaigns/[id]/characters/[characterId]/artifacts/transfer/transfer-artifact.ts`, `app/api/campaigns/[id]/characters/roster/read-roster.ts`, `lib/cache/artifact-reference.ts`, `types/inventory.ts`, `types/characters.ts` (`RosterHero`), `types/info-reference.ts` (`ArtifactForReference`), `lib/hooks/characters/useStash.ts`
- Test: `app/api/__tests__/stash-items-api.test.ts`, `lib/cache/__tests__/artifact-reference-gear.test.ts`

**Interfaces:**
- Consumes: задачі 2–5.
- Produces:
  - `lib/utils/items/pools.ts`: `ITEM_CHARGES_KEY = "charges"`; `ITEM_POOL_PREFIX = "pool:item:"`; `CONSUMABLE_POOL_PREFIX = "pool:consumable:"`; `itemPoolKey(ref: string): string`; `consumablePoolKey(itemId: string): string`; `isConsumablePool(key: string): boolean`.
  - `types/inventory.ts`: `StashArtifact` += `attunement?: "attuned" | "required"`, `carried?: true`, `charges?: { max: number; left: number; rest: "short" | "long" | null }`, `gear?: true`; `StashView.attunement?: { used: number; limit: number }`; `FreeArtifact = Omit<StashArtifact, "description" | "attunement" | "carried" | "charges"> & { property?: { nameTemplate?: string; bases: string[] }; consumable?: true }`.
  - `RosterHero.equipped: Record<string, { id: string; name: string; gear?: true }>`; `ArtifactForReference.gear?: true`.
  - `buildStashView(tx, campaignId, inventory, ctx: { rules: Ruleset; resources?: unknown }): Promise<StashView>`.
  - `useStashAction` інвалідовує лист/ростер/вільні також для `attune`/`unattune`.

- [ ] **Step 1: Write the failing tests**

`app/api/__tests__/stash-items-api.test.ts`:

```ts
import { NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { API_ERRORS } from "@/lib/constants/api-errors";
import { prisma } from "@/lib/db";
import { rejectIfInActiveBattle } from "@/lib/server/characters/battle-lock";
import * as apiAuth from "@/lib/utils/api/api-auth";
import { weaponStatsColumns } from "@/lib/utils/artifacts/weapon-stats";
import { itemStatsColumns, type ItemStats } from "@/lib/utils/items/item-stats";
import { parseRules } from "@/lib/utils/rules/schema";

vi.mock("@/lib/utils/api/api-auth", () => ({ requireCampaignAccess: vi.fn(), requireDM: vi.fn() }));
vi.mock("@/lib/server/characters/battle-lock", () => ({ rejectIfInActiveBattle: vi.fn(async () => null) }));

const tx = vi.hoisted(() => ({
  $executeRaw: vi.fn(),
  inventoryLog: { createMany: vi.fn() },
  characterInventory: { upsert: vi.fn(), update: vi.fn(), findMany: vi.fn(), findUnique: vi.fn() },
  artifact: { findFirst: vi.fn(), findMany: vi.fn() },
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    character: { findUnique: vi.fn() },
    characterInventory: { findMany: vi.fn() },
    artifact: { findMany: vi.fn() },
    $transaction: vi.fn((fn: (t: typeof tx) => unknown) => fn(tx)),
  },
}));

const row = (id: string, name: string, slot: string, item?: ItemStats) => ({ id, name, icon: null, rarity: "rare", slot, description: null, bonuses: {}, modifiers: [...(slot === "weapon" ? weaponStatsColumns({ damageDice: "1d8" }).modifiers : []), ...(item ? itemStatsColumns(item).modifiers : [])] });

const ROWS = [
  row("ls", "Longsword", "weapon", { unique: false }),
  row("ft", "Flame Tongue", "weapon", { unique: false, attunement: true, property: { appliesTo: { kinds: ["weapon"] }, nameTemplate: "Flame Tongue {base}" } }),
  row("ring", "Ring of Protection", "ring", { unique: false, attunement: true }),
  row("pot", "Potion of Healing", "item", { unique: false, consumable: true }),
];

const byId = (id: string) => ROWS.find((r) => r.id === id) ?? null;

const access = (rules = parseRules({ items: { enabled: true } })) => ({ userId: "dm", isDM: true, campaign: { id: "camp", members: [], rules } }) as never;

const params = { params: Promise.resolve({ id: "camp", characterId: "a" }) };

const post = async (body: unknown) => {
  const mod = await import("@/app/api/campaigns/[id]/characters/[characterId]/stash/route");

  return mod.POST(new Request("http://x", { method: "POST", body: JSON.stringify(body) }), params) as Promise<NextResponse>;
};

const inv = (over: Record<string, unknown> = {}) => ({ characterId: "a", equipped: {}, stash: [], attuned: [], items: [], gold: 0, silver: 0, copper: 0, ...over });

describe("stash API: magic items", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(apiAuth.requireCampaignAccess).mockResolvedValue(access());
    vi.mocked(apiAuth.requireDM).mockResolvedValue(access());
    vi.mocked(prisma.character.findUnique).mockResolvedValue({ id: "a", campaignId: "camp", controlledBy: "dm", status: "active", resources: {} } as never);
    tx.characterInventory.upsert.mockResolvedValue(inv());
    tx.characterInventory.update.mockImplementation(async ({ data }: { data: object }) => ({ ...inv(), ...data }));
    tx.characterInventory.findMany.mockResolvedValue([]);
    tx.artifact.findFirst.mockImplementation(async ({ where }: { where: { id: string } }) => byId(where.id));
    tx.artifact.findMany.mockImplementation(async ({ where }: { where: { id: { in: string[] } } }) => ROWS.filter((r) => where.id.in.includes(r.id)));
  });

  it("property without a base → 422; with a matching base → composed ref in the stash", async () => {
    const bare = await post({ action: "grant", artifactId: "ft" });

    expect(bare.status).toBe(422);
    expect((await bare.json()).error).toBe(API_ERRORS.ITEM_PROPERTY_NEEDS_BASE);

    expect((await post({ action: "grant", artifactId: "ft", baseId: "ring" })).status).toBe(422);

    const ok = await post({ action: "grant", artifactId: "ft", baseId: "ls" });

    expect(ok.status).toBe(200);
    expect(tx.characterInventory.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ stash: ["ls+ft"] }) }));
    expect(tx.inventoryLog.createMany).toHaveBeenCalledWith({ data: [expect.objectContaining({ kind: "artifact_grant", delta: { artifactId: "ls+ft", artifactName: "Flame Tongue Longsword" } })] });
  });

  it("non-unique gear is granted to a second hero", async () => {
    tx.characterInventory.findMany.mockResolvedValue([{ characterId: "b", equipped: { weapon: "ls" }, stash: [], character: { name: "Борис" } }]);

    expect((await post({ action: "grant", artifactId: "ls" })).status).toBe(200);
  });

  it("consumable goes to items with a quantity", async () => {
    expect((await post({ action: "grant", artifactId: "pot", quantity: 2 })).status).toBe(200);
    expect(tx.characterInventory.update.mock.calls[0][0].data.items).toEqual([expect.objectContaining({ name: "Potion of Healing", quantity: 2, consumable: true, artifactId: "pot" })]);
  });

  it("attune: limit 409, stale refs do not count, in battle 409, items off 409", async () => {
    tx.characterInventory.upsert.mockResolvedValue(inv({ stash: ["ring", "ls+ft"], attuned: ["ls+ft", "gone", "x+y"] }));

    const ok = await post({ action: "attune", ref: "ring" });

    expect(ok.status).toBe(200);
    expect(tx.characterInventory.update.mock.calls[0][0].data.attuned).toEqual(["ls+ft", "ring"]);

    vi.clearAllMocks();
    tx.characterInventory.upsert.mockResolvedValue(inv({ stash: ["ring"], equipped: { weapon: "ls+ft" }, attuned: ["ls+ft"] }));
    tx.characterInventory.update.mockImplementation(async ({ data }: { data: object }) => ({ ...inv(), ...data }));
    tx.artifact.findMany.mockImplementation(async ({ where }: { where: { id: { in: string[] } } }) => ROWS.filter((r) => where.id.in.includes(r.id)));
    vi.mocked(apiAuth.requireCampaignAccess).mockResolvedValue(access(parseRules({ items: { enabled: true, attunementLimit: 1 } })));

    const full = await post({ action: "attune", ref: "ring" });

    expect(full.status).toBe(409);
    expect((await full.json()).error).toBe(API_ERRORS.ATTUNEMENT_LIMIT);

    vi.mocked(rejectIfInActiveBattle).mockResolvedValueOnce(NextResponse.json({ error: API_ERRORS.CHARACTER_IN_BATTLE }, { status: 409 }));
    vi.mocked(apiAuth.requireCampaignAccess).mockResolvedValue(access());

    expect((await post({ action: "attune", ref: "ring" })).status).toBe(409);

    vi.mocked(apiAuth.requireCampaignAccess).mockResolvedValue(access(parseRules({})));

    const off = await post({ action: "attune", ref: "ring" });

    expect(off.status).toBe(409);
    expect((await off.json()).error).toBe(API_ERRORS.ITEMS_DISABLED);
  });

  it("free artifacts: gear and properties stay free, property lists matching free bases", async () => {
    vi.mocked(prisma.artifact.findMany).mockResolvedValue(ROWS.map(({ id, name, icon, rarity, slot, modifiers }) => ({ id, name, icon, rarity, slot, modifiers })) as never);
    vi.mocked(prisma.characterInventory.findMany).mockResolvedValue([{ characterId: "b", equipped: { weapon: "ls+ft" }, stash: ["ring"] }] as never);

    const mod = await import("@/app/api/campaigns/[id]/characters/[characterId]/stash/free-artifacts/route");

    const res = (await mod.GET(new Request("http://x"), params)) as NextResponse;

    const free = (await res.json()) as Array<{ id: string; gear?: true; property?: { bases: string[]; nameTemplate?: string }; consumable?: true }>;

    expect(free.map((a) => a.id).sort()).toEqual(["ft", "ls", "pot", "ring"]);
    expect(free.find((a) => a.id === "ls")?.gear).toBe(true);
    expect(free.find((a) => a.id === "ft")?.property).toEqual({ nameTemplate: "Flame Tongue {base}", bases: ["ls"] });
    expect(free.find((a) => a.id === "pot")?.consumable).toBe(true);
  });
});

describe("inventory PATCH and transfer: magic items", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(apiAuth.requireDM).mockResolvedValue(access());
    vi.mocked(apiAuth.requireCampaignAccess).mockResolvedValue(access());
    vi.mocked(prisma.character.findUnique).mockResolvedValue({ id: "a", campaignId: "camp", controlledBy: "dm", status: "active" } as never);
    tx.characterInventory.findUnique.mockResolvedValue({ characterId: "a", equipped: {}, stash: [] });
    tx.characterInventory.findMany.mockResolvedValue([]);
    tx.characterInventory.upsert.mockImplementation(async ({ update, where }: { update?: object; where: { characterId: string } }) => ({ characterId: where.characterId, equipped: {}, stash: [], ...update }));
    tx.characterInventory.update.mockImplementation(async ({ data }: { data: object }) => data);
    tx.artifact.findFirst.mockImplementation(async ({ where }: { where: { id: string } }) => byId(where.id));
    tx.artifact.findMany.mockImplementation(async ({ where }: { where: { id: { in: string[] } } }) => ROWS.filter((r) => where.id.in.includes(r.id)));
  });

  const patch = async (body: unknown) => {
    const mod = await import("@/app/api/campaigns/[id]/characters/[characterId]/inventory/route");

    return mod.PATCH(new Request("http://x", { method: "PATCH", body: JSON.stringify(body) }), params) as Promise<NextResponse>;
  };

  it("two identical non-unique weapons may be worn when items are enabled", async () => {
    expect((await patch({ equipped: { weapon: "ls", range_weapon: "ls" } })).status).toBe(200);
  });

  it("transfer into a stash that already holds the same ref → 409", async () => {
    tx.characterInventory.upsert.mockImplementation(async ({ where }: { where: { characterId: string } }) =>
      where.characterId === "a" ? { characterId: "a", equipped: {}, stash: ["ls"], attuned: [] } : { characterId: "b", equipped: {}, stash: ["ls"], attuned: [] },
    );
    vi.mocked(prisma.character.findUnique).mockImplementation((async ({ where }: { where: { id: string } }) => ({ id: where.id, campaignId: "camp", controlledBy: "dm", status: "active" })) as never);

    const mod = await import("@/app/api/campaigns/[id]/characters/[characterId]/artifacts/transfer/route");

    const res = (await mod.POST(new Request("http://x", { method: "POST", body: JSON.stringify({ artifactId: "ls", toCharacterId: "b" }) }), params)) as NextResponse;

    expect(res.status).toBe(409);
    expect((await res.json()).error).toBe(API_ERRORS.ITEM_ALREADY_IN_STASH);
  });
});
```

`lib/cache/__tests__/artifact-reference-gear.test.ts`:

```ts
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({
  prisma: {
    artifact: { findMany: vi.fn() },
    artifactSet: { findMany: vi.fn(async () => []) },
    characterInventory: { findMany: vi.fn() },
  },
}));

import { loadArtifactReference } from "@/lib/cache/artifact-reference";
import { prisma } from "@/lib/db";
import { itemStatsColumns } from "@/lib/utils/items/item-stats";

describe("довідник: спорядження й складені ref", () => {
  it("неунікальний — gear без власника; унікальна база в складеному ref має власника", async () => {
    vi.mocked(prisma.artifact.findMany).mockResolvedValue([
      { id: "ls", name: "Longsword", icon: null, rarity: "common", slot: "weapon", description: null, abilities: [], modifiers: itemStatsColumns({ unique: false }).modifiers, artifactSet: null },
      { id: "homm", name: "Меч", icon: null, rarity: "rare", slot: "weapon", description: null, abilities: [], modifiers: [], artifactSet: null },
    ] as never);
    vi.mocked(prisma.characterInventory.findMany).mockResolvedValue([{ equipped: { weapon: "homm+ft" }, stash: ["ls"], character: { name: "Боромир" } }] as never);

    const { artifacts } = await loadArtifactReference("c");

    expect(artifacts.find((a) => a.id === "ls")).toMatchObject({ holderName: null, gear: true });
    expect(artifacts.find((a) => a.id === "homm")).toMatchObject({ holderName: "Боромир" });
    expect(artifacts.find((a) => a.id === "homm")).not.toHaveProperty("gear");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm test:run app/api/__tests__/stash-items-api.test.ts lib/cache/__tests__/artifact-reference-gear.test.ts`
Expected: FAIL.

- [ ] **Step 3: Pool keys** — `lib/utils/items/pools.ts` (без zod):

```ts
export const ITEM_CHARGES_KEY = "charges";

export const ITEM_POOL_PREFIX = "pool:item:";

export const CONSUMABLE_POOL_PREFIX = "pool:consumable:";

export const itemPoolKey = (ref: string) => `${ITEM_POOL_PREFIX}${ref}`;

export const consumablePoolKey = (itemId: string) => `${CONSUMABLE_POOL_PREFIX}${itemId}`;

export const isConsumablePool = (key: string) => key.startsWith(CONSUMABLE_POOL_PREFIX);
```

- [ ] **Step 4: Types** — `types/inventory.ts`: `StashArtifact` після `light?: boolean;`:

```ts
  attunement?: "attuned" | "required";
  carried?: true;
  charges?: { max: number; left: number; rest: "short" | "long" | null };
  gear?: true;
```

`StashView` — `attunement?: { used: number; limit: number };`; `export type FreeArtifact = Omit<StashArtifact, "description" | "attunement" | "carried" | "charges"> & { property?: { nameTemplate?: string; bases: string[] }; consumable?: true };`. `types/characters.ts`: `RosterHero.equipped: Record<string, { id: string; name: string; gear?: true }>;`. `types/info-reference.ts`: `ArtifactForReference` — `gear?: true;`.

- [ ] **Step 5: Stash view** — `…/stash/read-stash.ts` (повна заміна `buildStashView`, `readStash` — лише виклик):

```ts
import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";

import { API_ERRORS } from "@/lib/constants/api-errors";
import { CARRIED_SLOTS } from "@/lib/constants/artifacts";
import { prisma } from "@/lib/db";
import { requireCampaignAccess } from "@/lib/utils/api/api-auth";
import { errorResponse } from "@/lib/utils/api/api-response";
import { loadOwned } from "@/lib/utils/api/load-owned";
import { canEquipOffHand } from "@/lib/utils/artifacts/off-hand";
import { readResources } from "@/lib/utils/characters/resources/schema";
import { normalizeItems, normalizeStash } from "@/lib/utils/inventory/items";
import { isUniqueRow } from "@/lib/utils/items/item-row";
import { itemPoolKey } from "@/lib/utils/items/pools";
import { refArtifactIds } from "@/lib/utils/items/ref";
import { attunedRefs, attunementRequired, itemChargesOf, pruneAttuned, resolveItemRow } from "@/lib/utils/items/resolve";
import { parseRules, type Ruleset } from "@/lib/utils/rules/schema";
import type { StashArtifact, StashView } from "@/types/inventory";

export const STASH_ROW_SELECT = { id: true, name: true, icon: true, rarity: true, slot: true, description: true, bonuses: true, modifiers: true } as const;

type InventoryRow = { equipped: unknown; stash: unknown; attuned?: unknown; items: unknown; gold: number; silver: number; copper: number };

export async function buildStashView(tx: Prisma.TransactionClient, campaignId: string, inventory: InventoryRow | null, ctx: { rules: Ruleset; resources?: unknown }): Promise<StashView> {
  const stash = normalizeStash(inventory?.stash);

  const ids = [...new Set(stash.flatMap(refArtifactIds))];

  const found = ids.length ? await tx.artifact.findMany({ where: { campaignId, id: { in: ids } }, select: STASH_ROW_SELECT }) : [];

  const byId = new Map(found.map((r) => [r.id, r]));

  const itemsOn = ctx.rules.items.enabled;

  const attuned = attunedRefs(inventory);

  const spent = ctx.rules.outOfCombat.persistResources ? (readResources(ctx.resources).charges ?? {}) : {};

  const artifacts = stash.flatMap((ref): StashArtifact[] => {
    const row = resolveItemRow(ref, byId);

    if (!row) return [];

    const charges = itemChargesOf(ref, byId);

    return [
      {
        id: ref,
        name: row.name,
        icon: row.icon,
        rarity: row.rarity,
        slot: row.slot,
        description: row.description,
        ...(canEquipOffHand(row, true) && { light: true }),
        ...(!isUniqueRow(row) && { gear: true as const }),
        ...(itemsOn && attunementRequired(ref, byId) && { attunement: attuned.includes(ref) ? ("attuned" as const) : ("required" as const) }),
        ...(itemsOn && CARRIED_SLOTS.has(row.slot) && { carried: true as const }),
        ...(charges && { charges: { max: charges.max, left: Math.max(0, charges.max - (spent[itemPoolKey(ref)]?.used ?? 0)), rest: charges.rest } }),
      },
    ];
  });

  return {
    purse: { gp: inventory?.gold ?? 0, sp: inventory?.silver ?? 0, cp: inventory?.copper ?? 0 },
    items: normalizeItems(inventory?.items),
    artifacts,
    ...(itemsOn && { attunement: { used: pruneAttuned(attuned, inventory ?? {}).length, limit: ctx.rules.items.attunementLimit } }),
  };
}
```

`readStash`: `select` персонажа += `resources: true`; виклик — `buildStashView(prisma, campaignId, inventory, { rules: parseRules(access.campaign?.rules), resources: character.resources })`.

- [ ] **Step 6: Apply stash** — `…/stash/apply-stash.ts`:
  - імпорти: `rejectIfInActiveBattle` (`@/lib/server/characters/battle-lock`), `uniqueChecker`, `attunedRefs`, `attunementRequired`, `pruneAttuned`, `resolveItemRow` (`@/lib/utils/items/resolve`), `planGrant`, `type GrantPlan`, `type GrantError` (`@/lib/utils/items/grant`), `parseItemRef`, `refArtifactIds` (`@/lib/utils/items/ref`), `STASH_ROW_SELECT` (`./read-stash`).
  - `STASH_ERROR_TEXT` доповнити: `[StashError.ALREADY_IN_STASH]: API_ERRORS.ITEM_ALREADY_IN_STASH, [StashError.ITEMS_DISABLED]: API_ERRORS.ITEMS_DISABLED, [StashError.ITEM_NOT_HELD]: API_ERRORS.ITEM_NOT_HELD, [StashError.ATTUNEMENT_NOT_REQUIRED]: API_ERRORS.ATTUNEMENT_NOT_REQUIRED, [StashError.ALREADY_ATTUNED]: API_ERRORS.ALREADY_ATTUNED, [StashError.ATTUNEMENT_LIMIT]: API_ERRORS.ATTUNEMENT_LIMIT, [StashError.ITEM_NOT_ATTUNED]: API_ERRORS.ITEM_NOT_ATTUNED,`; поруч:

```ts
const STASH_ERROR_STATUS: Partial<Record<StashErrorCode, number>> = {
  [StashError.ALREADY_IN_STASH]: 409,
  [StashError.ITEMS_DISABLED]: 409,
  [StashError.ALREADY_ATTUNED]: 409,
  [StashError.ATTUNEMENT_LIMIT]: 409,
  [StashError.ITEM_NOT_ATTUNED]: 409,
  [StashError.ITEM_NOT_HELD]: 422,
  [StashError.ATTUNEMENT_NOT_REQUIRED]: 422,
};

const GRANT_ERROR: Record<GrantError, { text: string; status: number }> = {
  ARTIFACT_NOT_FOUND: { text: API_ERRORS.ARTIFACT_NOT_FOUND, status: 404 },
  ITEM_PROPERTY_NEEDS_BASE: { text: API_ERRORS.ITEM_PROPERTY_NEEDS_BASE, status: 422 },
  ITEM_BASE_MISMATCH: { text: API_ERRORS.ITEM_BASE_MISMATCH, status: 422 },
};
```

  - `select` персонажа += `resources: true`; після перевірки `allowed`:

```ts
  const rules = parseRules(access.campaign?.rules);

  if (data.action === "attune" || data.action === "unattune") {
    if (!rules.items.enabled) return errorResponse(API_ERRORS.ITEMS_DISABLED, 409);

    const inBattle = await rejectIfInActiveBattle(campaignId, [characterId]);

    if (inBattle) return inBattle;
  }
```

  - у транзакції: `state` += `attuned: attunedRefs(inv)`; оголосити `let grant: GrantPlan | undefined; let items: { enabled: boolean; limit: number; attunable: boolean } | undefined; let name: string | undefined;`.
  - блок `equip`/`grant`: `findFirst` бере id бази для `equip` — `const lookupId = data.action === "equip" ? (parseItemRef(data.artifactId)?.baseId ?? data.artifactId) : data.artifactId;` і `select: STASH_ROW_SELECT`; `where: { id: lookupId, campaignId }` (наявний тест `stash-api.test.ts` перевіряє `where: { id: "foreign", campaignId: "camp" }`).
  - блок `grant` (заміна наявного, після знайденого `found`):

```ts
    if (data.action === "grant") {
      const base = data.baseId ? await tx.artifact.findFirst({ where: { id: data.baseId, campaignId }, select: STASH_ROW_SELECT }) : null;

      const rows = new Map([[data.artifactId, { ...found, id: data.artifactId }], ...(base ? [[base.id, base] as const] : [])]);

      const planned = planGrant(data, rows);

      if (!planned.ok) return errorResponse(GRANT_ERROR[planned.error].text, GRANT_ERROR[planned.error].status);

      grant = planned.plan;

      if (grant.kind === "stash") {
        const all = await tx.characterInventory.findMany({
          where: { character: { campaignId } },
          select: { characterId: true, equipped: true, stash: true, character: { select: { name: true } } },
        });

        const holder = findHolder(
          all.map((o) => ({ characterId: o.characterId, equipped: o.equipped as EquippedItems, stash: normalizeStash(o.stash) })),
          grant.ref,
          undefined,
          uniqueChecker(rows),
        );

        if (holder) return errorResponse(`${API_ERRORS.ARTIFACT_HELD_BY_OTHER}: ${all.find((o) => o.characterId === holder)?.character.name ?? ""}`, 409);
      }
    }
```

  (змінна `found` — з `findFirst` вище; винести її з блоку `if`, щоб вона була доступна.)
  - блок налаштування:

```ts
    if (data.action === "attune" || data.action === "unattune") {
      const refs = [...new Set([data.ref, ...(state.attuned ?? [])])];

      const found = await tx.artifact.findMany({ where: { id: { in: [...new Set(refs.flatMap(refArtifactIds))] }, campaignId }, select: STASH_ROW_SELECT });

      const byId = new Map(found.map((r) => [r.id, r]));

      state.attuned = pruneAttuned(state.attuned ?? [], state).filter((r) => resolveItemRow(r, byId) !== null);
      items = { enabled: true, limit: rules.items.attunementLimit, attunable: attunementRequired(data.ref, byId) };
      name = resolveItemRow(data.ref, byId)?.name;
    }
```

  - виклик: `applyStashAction(state, data, { newItemId: randomUUID(), artifactSlotType, artifact, classesEnabled, grant, items, name })`; відмова — `errorResponse(STASH_ERROR_TEXT[result.error], STASH_ERROR_STATUS[result.error] ?? 400)`; `update.data` += `attuned: result.state.attuned ?? []`; відповідь — `buildStashView(tx, campaignId, saved, { rules, resources: character.resources })`.

- [ ] **Step 7: Free artifacts** — `…/stash/free-artifacts/read-free-artifacts.ts` (тіло після `access`):

```ts
  const [all, inventories] = await Promise.all([
    prisma.artifact.findMany({ where: { campaignId }, select: { id: true, name: true, icon: true, rarity: true, slot: true, modifiers: true }, orderBy: { name: "asc" } }),
    prisma.characterInventory.findMany({ where: { character: { campaignId } }, select: { characterId: true, equipped: true, stash: true } }),
  ]);

  const isUnique = uniqueChecker(new Map(all.map((a) => [a.id, a])));

  const held = inventories.map((o) => ({ characterId: o.characterId, equipped: o.equipped as EquippedItems, stash: normalizeStash(o.stash) }));

  const freeRows = all.filter((a) => !findHolder(held, a.id, undefined, isUnique));

  const free: FreeArtifact[] = freeRows.map(({ modifiers, ...a }) => {
    const stats = itemStatsFromRow({ modifiers });

    const template = stats?.property?.nameTemplate;

    return {
      ...a,
      ...(stats?.property && { property: { ...(template && { nameTemplate: template }), bases: freeRows.filter((b) => matchesAppliesTo(b, { ...a, modifiers })).map((b) => b.id) } }),
      ...(stats?.consumable && { consumable: true as const }),
      ...(stats && !stats.property && stats.unique === false && { gear: true as const }),
    };
  });

  return NextResponse.json(free);
```

(імпорти `uniqueChecker` з `@/lib/utils/items/resolve`, `itemStatsFromRow` з `@/lib/utils/items/item-row`, `matchesAppliesTo` з `@/lib/utils/items/compose`.)

- [ ] **Step 8: Inventory PATCH** — `…/inventory/update-inventory.ts`:
  - перевірка щита: `tx.artifact.findFirst({ where: { id: parseItemRef(shieldId)?.baseId ?? shieldId, campaignId }, … })`.
  - замість `if (new Set(ids).size !== ids.length) …`:

```ts
      const rules = parseRules(accessResult.campaign?.rules);

      // the legacy grid editor knows non-unique gear only for 5e item campaigns or composed refs: HOMM keeps one query-free check
      const rows = (rules.items.enabled || ids.some(isComposedRef)) && ids.length > 0
        ? new Map((await tx.artifact.findMany({ where: { id: { in: [...new Set(ids.flatMap(refArtifactIds))] }, campaignId }, select: { id: true, name: true, slot: true, modifiers: true } })).map((r) => [r.id, r]))
        : null;

      const isUnique = rows ? uniqueChecker(rows) : undefined;

      if (uniqueConflict(ids, isUnique)) return errorResponse(API_ERRORS.ARTIFACT_ALREADY_EQUIPPED, 409);
```

  і `findHolder(held, artifactId, undefined, isUnique)` у циклі. Імпорти `uniqueConflict` (з `ownership`), `isComposedRef`, `parseItemRef`, `refArtifactIds` (з `ref`), `uniqueChecker` (з `resolve`).

- [ ] **Step 9: Transfer** — `…/artifacts/transfer/transfer-artifact.ts`: після `if (!plan.ok) …`:

```ts
    if (normalizeStash(toInv.stash).includes(plan.artifactId)) return errorResponse(API_ERRORS.ITEM_ALREADY_IN_STASH, 409);

    const attunedBefore = normalizeStash(fromInv.attuned);

    const attuned = pruneAttuned(attunedBefore, { equipped: plan.fromEquipped, stash: plan.fromStash });
```

`update` відправника: `data: { equipped: plan.fromEquipped, stash: plan.fromStash, ...(attuned.length !== attunedBefore.length && { attuned }) }` (наявний тест очікує точно `{ equipped: {}, stash: [] }`, коли налаштування не було). Імпорт `pruneAttuned`.

- [ ] **Step 10: Roster and reference** — `…/characters/roster/read-roster.ts`:

```ts
  const ids = [...new Set(heroes.flatMap((h) => slotsOf(h).flatMap(([, ref]) => refArtifactIds(ref))))];

  const artifacts = ids.length ? await prisma.artifact.findMany({ where: { id: { in: ids }, campaignId }, select: { id: true, name: true, slot: true, modifiers: true } }) : [];

  const byId = new Map(artifacts.map((a) => [a.id, a]));
```

і `equipped: Object.fromEntries(slotsOf(h).flatMap(([slot, ref]) => { const row = resolveItemRow(ref, byId); return row ? [[slot, { id: ref, name: row.name, ...(!isUniqueRow(row) && { gear: true as const }) }]] : []; }))` (прибрати `nameById`).

`lib/cache/artifact-reference.ts`: у `select` артефактів додати `modifiers: true`; цикл власників:

```ts
  for (const inv of inventories) {
    for (const ref of heldRefs(inv)) for (const id of refArtifactIds(ref)) holderById.set(id, inv.character.name);
  }
```

мапа: `const gear = !isUniqueRow(a);` → `holderName: gear ? null : (holderById.get(a.id) ?? null), ...(gear && { gear: true as const }),` (поле `modifiers` у відповідь не додавати).

- [ ] **Step 11: Hook** — `lib/hooks/characters/useStash.ts`: `ARTIFACT_ACTIONS` += `"attune", "unattune"`.

- [ ] **Step 12: Run tests to verify they pass**

Run: `pnpm test:run app/api/__tests__/stash-items-api.test.ts app/api/__tests__/stash-api.test.ts app/api/__tests__/artifact-transfer-api.test.ts app/api/__tests__/inventory-equip-swap-api.test.ts app/api/__tests__/inventory-shield-cell-api.test.ts app/api/__tests__/character-roster-api.test.ts lib/cache lib/hooks/characters`
Expected: PASS (наявні — без змін).

- [ ] **Step 13: Type check and commit**

`pnpm exec tsc --noEmit -p tsconfig.json` → 0 errors.

```bash
git add lib/utils/items/pools.ts "app/api/campaigns/[id]/characters" lib/cache/artifact-reference.ts lib/cache/__tests__/artifact-reference-gear.test.ts types/inventory.ts types/characters.ts types/info-reference.ts lib/hooks/characters/useStash.ts app/api/__tests__/stash-items-api.test.ts
git commit -m "feat(constructor): 4f-3 stash, grant, attunement, transfer and reference on item refs

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---
### Task 7: Читачі бою й листа на `resolveItemRows` + тест-сторож

**Files:**
- Modify: `lib/utils/battle/participant/extract-artifacts.ts`, `lib/utils/battle/participant/extract-attacks.ts`, `lib/utils/battle/participant/load-character-context.ts`, `lib/utils/battle/participant/from-character.ts`, `lib/utils/battle/types/participant.ts` (`ExtractedAttack`), `types/battle.ts` (`BattleAttack`), `app/api/campaigns/[id]/battles/[battleId]/start/start-build-context.ts`, `lib/utils/battle/artifact-sets/apply-completed-sets.ts`, `app/api/campaigns/[id]/characters/[characterId]/sheet/sheet-handler.ts`, `components/characters/artifacts/CharacterArtifactsSection.tsx`, `components/character-profile/ProfileEditor.tsx`
- Create: `lib/__tests__/item-readers-guard.test.ts`
- Test: `lib/utils/battle/participant/__tests__/from-character-items.test.ts`, `lib/utils/battle/participant/__tests__/extract-attacks-items.test.ts`, `lib/utils/battle/artifact-sets/__tests__/set-progress-refs.test.ts`

**Interfaces:**
- Consumes: `resolveItemRow`, `activeItemRefs`, `attunedRefs`, `inventoryArtifactIds`, `uniqueChecker` (задача 4); `refArtifactIds`, `parseItemRef` (задача 3); `composeItemRow` (задача 3); `isUniqueRow` (задача 2).
- Produces:
  - `EquippedArtifactRow = { row; slot: string; carried?: true }`; `loadEquippedArtifactRows(character, preloadedArtifactsById?, opts?: { rules?: Ruleset }): Promise<EquippedArtifactRow[]>` — вдягнені (дублікати — окремі рядки) + носимі при `rules.items.enabled`, розв'язані з налаштуванням.
  - `extractAttacksFromCharacter(character, preloaded?, names?, opts?: { fiveE?: boolean; items?: { enabled: boolean; attuned: readonly string[] } })`; атака з предмета: `id` = ref (`<ref>:off` для другої руки), `damageBonus?: number` із запису `damageBonus` розв'язаного рядка.
  - `ExtractedAttack.damageBonus?: number`, `BattleAttack.damageBonus?: number`.
  - `from-character`: уміння артефактів збираються з **унікальних за ref** активних рядків (дублікати не подвоюють уміння).
  - `findSetProgress`: членство сету рахує id бази й властивості складеного ref.
  - `lib/__tests__/item-readers-guard.test.ts`.

- [ ] **Step 1: Write the failing tests**

`lib/utils/battle/participant/__tests__/extract-attacks-items.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { extractAttacksFromCharacter } from "../extract-attacks";

import { weaponStatsColumns } from "@/lib/utils/artifacts/weapon-stats";
import { itemStatsColumns, type ItemStats } from "@/lib/utils/items/item-stats";

const row = (id: string, name: string, stats: Parameters<typeof weaponStatsColumns>[0], item?: ItemStats) => {
  const cols = weaponStatsColumns(stats);

  return { id, name, slot: "weapon", bonuses: cols.bonuses, modifiers: [...cols.modifiers, ...(item ? itemStatsColumns(item).modifiers : [])], abilities: [] };
};

const ROWS = Object.fromEntries(
  [
    row("ls", "Longsword", { damageDice: "1d8", attackType: "melee" }, { unique: false }),
    row("dg", "Dagger", { damageDice: "1d4", traits: ["light", "finesse"] }, { unique: false }),
    row("w2", "Weapon +2", { attackBonus: 2, damageBonus: 2 }, { unique: false, property: { appliesTo: { kinds: ["weapon"] }, nameTemplate: "{base} (+2)" } }),
    row("ft", "Flame Tongue", {}, { unique: false, attunement: true, property: { appliesTo: { kinds: ["weapon"] }, nameTemplate: "Flame Tongue {base}" } }),
  ].map((r) => [r.id, r]),
) as never;

const character = (equipped: Record<string, string>) => ({ id: "c", campaignId: "camp", inventory: { equipped } }) as never;

describe("extractAttacksFromCharacter: item refs", () => {
  it("Longsword (+2): composed attack with attack and damage bonuses", async () => {
    const attacks = await extractAttacksFromCharacter(character({ weapon: "ls+w2" }), ROWS, undefined, { fiveE: true });

    expect(attacks.find((a) => a.id === "ls+w2")).toMatchObject({ name: "Longsword (+2)", attackBonus: 2, damageBonus: 2, damageDice: "1d8" });
  });

  it("two identical daggers: main hand and off hand", async () => {
    const attacks = await extractAttacksFromCharacter(character({ weapon: "dg", shield: "dg" }), ROWS, undefined, { fiveE: true });

    expect(attacks.filter((a) => a.name === "Dagger").map((a) => a.id)).toEqual(["dg", "dg:off"]);
  });

  it("unknown ref is skipped; plain HOMM weapon has no damageBonus", async () => {
    const attacks = await extractAttacksFromCharacter(character({ weapon: "ls+gone" }), ROWS, undefined, { fiveE: true });

    expect(attacks.some((a) => a.id === "ls+gone")).toBe(false);
    expect((await extractAttacksFromCharacter(character({ weapon: "ls" }), ROWS)).find((a) => a.id === "ls")).not.toHaveProperty("damageBonus");
  });

  it("unattuned composed item with items enabled keeps base stats only", async () => {
    const off = await extractAttacksFromCharacter(character({ weapon: "ls+ft" }), ROWS, undefined, { fiveE: true, items: { enabled: true, attuned: [] } });

    expect(off.find((a) => a.id === "ls+ft")).toMatchObject({ name: "Flame Tongue Longsword", damageDice: "1d8" });
  });
});
```

`lib/utils/battle/participant/__tests__/from-character-items.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { ParticipantSide } from "@/lib/constants/battle";
import { weaponStatsColumns } from "@/lib/utils/artifacts/weapon-stats";
import { loadEquippedArtifactRows } from "@/lib/utils/battle/participant/extract-artifacts";
import { createBattleParticipantFromCharacter } from "@/lib/utils/battle/participant/from-character";
import { itemStatsColumns, type ItemStats } from "@/lib/utils/items/item-stats";
import { DEFAULT_RULES, type Ruleset } from "@/lib/utils/rules";
import { parseRules } from "@/lib/utils/rules/schema";
import type { GameClassData } from "@/types/classes";

const NOTE = (id: string) => ({ id, name: id, trigger: { event: "passive" }, effects: [{ kind: "note", text: id }] });

const art = (id: string, name: string, slot: string, item?: ItemStats, extra: { abilities?: unknown[]; weapon?: Parameters<typeof weaponStatsColumns>[0] } = {}) => {
  const cols = extra.weapon ? weaponStatsColumns(extra.weapon) : { bonuses: {}, modifiers: [] };

  return { id, campaignId: "c1", name, slot, setId: null, icon: null, rarity: "rare", description: null, bonuses: cols.bonuses, modifiers: [...cols.modifiers, ...(item ? itemStatsColumns(item).modifiers : [])], abilities: extra.abilities ?? [] };
};

const ROWS = {
  ls: art("ls", "Longsword", "weapon", { unique: false }, { weapon: { damageDice: "1d8" } }),
  ft: art("ft", "Flame Tongue", "weapon", { unique: false, attunement: true, property: { appliesTo: { kinds: ["weapon"] }, nameTemplate: "Flame Tongue {base}" } }, { abilities: [{ id: "rider", name: "Flame", trigger: { event: "hit", role: "attacker" }, effects: [{ kind: "note", text: "fire" }] }] }),
  dg: art("dg", "Dagger", "weapon", { unique: false }, { weapon: { damageDice: "1d4", traits: ["light"] }, abilities: [NOTE("dagger-note")] }),
  ring: art("ring", "Ring of Protection", "ring", { unique: false }, { abilities: [NOTE("ring-note")] }),
  homm: art("homm", "Шолом", "helmet", undefined, { abilities: [NOTE("homm-note")] }),
};

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

const build = (rules: Ruleset, inventory: object, character: object = {}) => {
  const context = {
    skillTreeByRace: {}, mainSkills: [], spells: [], allSkills: [],
    racesByName: { "Людина": null }, campaign: { maxLevel: 20 }, skillsById: {}, artifactsById: ROWS, artifactSetsById: {}, artifactSetMemberIds: {},
    rules, classesById: { fighter },
  } as never;

  return createBattleParticipantFromCharacter({ ...base, ...character, inventory } as never, "b1", ParticipantSide.ALLY, undefined, context);
};

const items = parseRules({ items: { enabled: true }, classes: { enabled: true } });

const keys = (p: Awaited<ReturnType<typeof build>>) => p.battleData.resolvedAbilities.map((a) => a.key);

describe("battle participant: item refs", () => {
  it("attuned Flame Tongue Longsword: composed attack and prefixed rider from the ref", async () => {
    const p = await build(items, { equipped: { weapon: "ls+ft" }, stash: [], attuned: ["ls+ft"], items: [] });

    expect(p.battleData.attacks.find((a) => a.id === "ls+ft")?.name).toBe("Flame Tongue Longsword");
    expect(keys(p)).toContain("artifact:ls+ft:p-rider");
    expect(p.battleData.equippedArtifacts.map((e) => e.artifactId)).toEqual(["ls+ft"]);
  });

  it("unattuned: no rider", async () => {
    const p = await build(items, { equipped: { weapon: "ls+ft" }, stash: [], attuned: [], items: [] });

    expect(keys(p)).not.toContain("artifact:ls+ft:p-rider");
  });

  it("two identical daggers do not double their abilities", async () => {
    const p = await build(items, { equipped: { weapon: "dg", shield: "dg" }, stash: [], attuned: [], items: [] }, { classes: [{ classId: "fighter", level: 5 }] });

    expect(keys(p).filter((k) => k === "artifact:dg:dagger-note")).toHaveLength(1);
    expect(p.battleData.attacks.filter((a) => a.name === "Dagger").map((a) => a.id)).toEqual(["dg", "dg:off"]);
  });

  it("ring in the stash is carried only with items enabled", async () => {
    const inventory = { equipped: {}, stash: ["ring"], attuned: [], items: [] };

    expect(keys(await build(items, inventory))).toContain("artifact:ring:ring-note");
    expect(keys(await build(DEFAULT_RULES, inventory))).not.toContain("artifact:ring:ring-note");
  });

  it("HOMM: unique artifact as before, no pools key", async () => {
    const p = await build(DEFAULT_RULES, { equipped: { helmet: "homm" }, stash: [] });

    expect(keys(p)).toContain("artifact:homm:homm-note");
    expect(p.battleData).not.toHaveProperty("pools");
  });

  it("loadEquippedArtifactRows marks carried rows", async () => {
    const rows = await loadEquippedArtifactRows({ campaignId: "c1", inventory: { equipped: { helmet: "homm" }, stash: ["ring"] } } as never, ROWS as never, { rules: items });

    expect(rows.map((r) => [r.row.id, r.slot, r.carried ?? false])).toEqual([
      ["homm", "helmet", false],
      ["ring", "ring", true],
    ]);
  });
});
```

`lib/utils/battle/artifact-sets/__tests__/set-progress-refs.test.ts`:

```ts
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({ prisma: {} }));

import { findSetProgress } from "@/lib/utils/battle/artifact-sets/apply-completed-sets";

describe("findSetProgress with composed refs", () => {
  it("a property inside a composed ref counts as a set member", () => {
    const maps = { artifactSetsById: { s1: { id: "s1", name: "Набір", icon: null, setBonus: { name: "x" }, abilities: [] } }, artifactSetMemberIds: { s1: ["ft", "helm"] } } as never;

    const progress = findSetProgress([{ artifactId: "ls+ft", setId: "s1" }, { artifactId: "helm", setId: "s1" }], maps);

    expect(progress[0]).toMatchObject({ have: 2, total: 2, complete: true });
  });
});
```

`lib/__tests__/item-readers-guard.test.ts`:

```ts
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = path.resolve(__dirname, "../..");

const READER_RE = /\.(equipped|stash)\b/;

// opaque ref movers and false positives — they never read an artifact behind a ref
const RAW_OK: Record<string, string> = {
  "lib/utils/artifacts/ownership.ts": "ref-aware primitives (refArtifactIds)",
  "lib/utils/inventory/stash-actions.ts": "moves refs between equipped/stash as opaque strings",
  "lib/hooks/characters/useStash.ts": "characterKeys.stash query key",
  "lib/hooks/characters/useCharacterEditor.ts": "seeds the DM editor state with raw refs",
  "components/character-profile/ProfileEditor.tsx": "roster equipped is already resolved by read-roster",
};

function sources(dir: string): string[] {
  return fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true }).flatMap((e) => {
    const rel = path.join(dir, e.name);

    if (e.isDirectory()) return e.name === "__tests__" || e.name === "node_modules" ? [] : sources(rel);

    return /\.tsx?$/.test(e.name) && !/\.test\.tsx?$/.test(e.name) ? [rel] : [];
  });
}

describe("тест-сторож: читачі equipped/stash", () => {
  it("кожен читач поза lib/utils/items іде через lib/utils/items (resolveItemRows/heldRefs/…)", () => {
    const files = ["app", "lib", "components"].flatMap(sources).filter((f) => !f.startsWith("lib/utils/items/"));

    const readers = files.filter((f) => READER_RE.test(fs.readFileSync(path.join(ROOT, f), "utf8")));

    const bypass = readers.filter((f) => !RAW_OK[f] && !fs.readFileSync(path.join(ROOT, f), "utf8").includes('from "@/lib/utils/items/'));

    expect(readers.length).toBeGreaterThan(10);
    expect(bypass).toEqual([]);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm test:run lib/utils/battle/participant/__tests__/extract-attacks-items.test.ts lib/utils/battle/participant/__tests__/from-character-items.test.ts lib/utils/battle/artifact-sets/__tests__/set-progress-refs.test.ts lib/__tests__/item-readers-guard.test.ts`
Expected: FAIL (сторож перелічує `extract-artifacts.ts`, `extract-attacks.ts`, `load-character-context.ts`, `start-build-context.ts`, `CharacterArtifactsSection.tsx`).

- [ ] **Step 3: Types** — `lib/utils/battle/types/participant.ts`, `ExtractedAttack` після `hand?: "off";` — `damageBonus?: number;`; `types/battle.ts`, `BattleAttack` після `hand?: "off";` — `/** +N до шкоди цією зброєю (магічний предмет) */ damageBonus?: number;`.

- [ ] **Step 4: Equipped rows** — `lib/utils/battle/participant/extract-artifacts.ts`:

```ts
import type { Prisma } from "@prisma/client";

import type { CharacterFromPrisma } from "../types/participant";

import { prisma } from "@/lib/db";
import { activeItemRefs, attunedRefs, inventoryArtifactIds, resolveItemRow } from "@/lib/utils/items/resolve";
import type { Ruleset } from "@/lib/utils/rules";
import type { EquippedArtifact } from "@/types/battle";

export type EquippedArtifactRow = { row: Prisma.ArtifactGetPayload<object>; slot: string; carried?: true };

export async function loadEquippedArtifactRows(
  character: CharacterFromPrisma,
  preloadedArtifactsById?: Record<string, Prisma.ArtifactGetPayload<object>>,
  opts: { rules?: Ruleset } = {},
): Promise<EquippedArtifactRow[]> {
  if (!character.inventory) return [];

  const itemsEnabled = !!opts.rules?.items.enabled;

  const ids = inventoryArtifactIds(character.inventory, { stash: itemsEnabled, consumables: false });

  if (ids.length === 0) return [];

  const rows = preloadedArtifactsById
    ? ids.map((id) => preloadedArtifactsById[id]).filter((a): a is NonNullable<typeof a> => a != null)
    : await prisma.artifact.findMany({ where: { id: { in: ids }, campaignId: character.campaignId } });

  const byId = new Map(rows.map((r) => [r.id, r]));

  const attuned = attunedRefs(character.inventory);

  return activeItemRefs(character.inventory, byId, itemsEnabled).flatMap(({ ref, slot, carried }) => {
    const row = resolveItemRow(ref, byId, { attuned, itemsEnabled });

    return row ? [{ row, slot, ...(carried && { carried }) }] : [];
  });
}
```

(`toEquippedArtifacts` — без змін.)

- [ ] **Step 5: Attacks** — `lib/utils/battle/participant/extract-attacks.ts`:
  - `extractAttacksFromCharacter(…, opts: { fiveE?: boolean; items?: { enabled: boolean; attuned: readonly string[] } } = {})` → `extractWeaponAttacks(character, preloadedArtifactsById, !!opts.fiveE, opts.items)`.
  - у `extractWeaponAttacks` (параметр `items?: { enabled: boolean; attuned: readonly string[] }`): замість `weaponIds` збирати `const entries: Array<{ ref: string; offHand: boolean }> = [];` — у циклі `slotKeys` гілка `typeof val === "string"` → `entries.push({ ref: val, offHand: false })`; щит: `const shieldRef = fiveE && typeof equipped.shield === "string" ? equipped.shield : null; if (shieldRef) entries.push({ ref: shieldRef, offHand: true });`; `if (entries.length === 0) return attacks;`.
  - завантаження й розв'язання:

```ts
  const ids = [...new Set(entries.flatMap((e) => refArtifactIds(e.ref)))];

  const rowsById = preloadedArtifactsById ?? Object.fromEntries((await prisma.artifact.findMany({ where: { id: { in: ids }, campaignId: character.campaignId } })).map((r) => [r.id, r]));

  const shieldCellEmpty = !equipped.shield;

  for (const { ref, offHand: isOffHand } of entries) {
    const weapon = resolveItemRow(ref, rowsById, { itemsEnabled: !!items?.enabled, attuned: items?.attuned ?? [] });

    if (!weapon) continue;
```

  (решта тіла циклу — як було, без рядка `const isOffHand = …`); перед `attacks.push` — `const damageBonus = Number(getOptionalModifierValue(modifiers, ArtifactModifierType.DAMAGE_BONUS) ?? 0) || 0;`; у `attacks.push`: `id: isOffHand ? \`${ref}:off\` : ref,` і `...(damageBonus !== 0 && { damageBonus }),`. Імпорти `refArtifactIds` (`@/lib/utils/items/ref`), `resolveItemRow` (`@/lib/utils/items/resolve`).

- [ ] **Step 6: Character context and start context** — `lib/utils/battle/participant/load-character-context.ts`: прибрати `equippedArtifactIds`; `const artifactIds = inventoryArtifactIds(character.inventory, { stash: rules.items.enabled, consumables: rules.items.enabled });` (імпорт з `@/lib/utils/items/resolve`).

`app/api/campaigns/[id]/battles/[battleId]/start/start-build-context.ts`:
  - прибрати цикл `allArtifactIds` на початку;
  - `const trees = …` замінити на:

```ts
  const [trees, campaign] = await Promise.all([
    characters.length > 0 && uniqueRaceNames.length > 0 ? prisma.skillTree.findMany({ where: treeWhere }) : [],
    prisma.campaign.findUnique({ where: { id: campaignId }, select: { maxLevel: true, rules: true } }),
  ]);

  const rules = parseRules(campaign?.rules ?? {});

  const itemsEnabled = rules.items.enabled;

  const allArtifactIds = [...new Set(characters.flatMap((c) => inventoryArtifactIds(c.inventory, { stash: itemsEnabled, consumables: itemsEnabled })))];
```

  - у `Promise.all` прибрати запит кампанії (`const [races, ...characterContext] = await Promise.all([raceFilters…, ...(characters.length > 0 ? [...] : [])])`); `allArtifactIds.size > 0` → `allArtifactIds.length > 0`, `Array.from(allArtifactIds)` → `allArtifactIds`;
  - у `campaignContext`: `rules,` замість `rules: parseRules(campaign?.rules ?? {}),`. Імпорт `inventoryArtifactIds`. Наявні тести `start-build-context.test.ts`, `start-build-order*.test.ts`, `start-maze-dormant.test.ts` мають лишитись зеленими.

- [ ] **Step 7: from-character** — `lib/utils/battle/participant/from-character.ts`:
  - `loadEquippedArtifactRows(character, context?.artifactsById, { rules })`;
  - `const attuned = attunedRefs(character.inventory);`; `extractAttacksFromCharacter(character, artifactsById, rules.defaultAttacks, { fiveE: !!resolvedClasses, items: { enabled: rules.items.enabled, attuned } })`;
  - у `collectCharacterAbilities` — `artifacts: uniqueById(artifactRows.map(({ row, slot }) => ({ ...row, slot }))),`, де над функцією модуля: `const uniqueById = <T extends { id: string }>(rows: T[]): T[] => [...new Map(rows.map((r) => [r.id, r])).values()];`. Імпорт `attunedRefs`.

- [ ] **Step 8: Sets** — `lib/utils/battle/artifact-sets/apply-completed-sets.ts`: у `findSetProgress` — `const equippedIds = new Set(equipped.flatMap((a) => refArtifactIds(a.artifactId)));` (імпорт `refArtifactIds`).

- [ ] **Step 9: Sheet** — `app/api/campaigns/[id]/characters/[characterId]/sheet/sheet-handler.ts`: `loadEquippedArtifactRows(character, context.artifactsById, { rules: campaign.rules })`.

- [ ] **Step 10: DM grid editor** — `components/characters/artifacts/CharacterArtifactsSection.tsx`: імпорти `composeItemRow` (`@/lib/utils/items/compose`), `isUniqueRow` (`@/lib/utils/items/item-row`), `parseItemRef` (`@/lib/utils/items/ref`); над компонентом:

```ts
function optionFor(ref: string, artifacts: ArtifactOption[]): ArtifactOption | undefined {
  const direct = artifacts.find((a) => a.id === ref);

  if (direct) return direct;

  const parsed = parseItemRef(ref);

  const base = parsed?.propertyId ? artifacts.find((a) => a.id === parsed.baseId) : undefined;

  const property = base && artifacts.find((a) => a.id === parsed?.propertyId);

  return base && property ? composeItemRow(base, property) : undefined;
}
```

`const current = equippedId ? optionFor(equippedId, artifacts) : undefined;`; `wornElsewhere` — лише для унікальних: `const wornElsewhere = isUniqueRow(a) && Object.entries(equipped).some(([key, id]) => id === a.id && key !== cell.key);`. `components/character-profile/ProfileEditor.tsx`: у `holders` — `for (const item of Object.values(hero.equipped)) if (!item.gear) map[item.id] = hero.name;`.

- [ ] **Step 11: Run tests to verify they pass**

Run: `pnpm test:run lib/utils/battle/participant lib/utils/battle/artifact-sets lib/__tests__ app/api/__tests__/battles "app/api/campaigns/[id]/characters" components/characters components/character-profile`
Expected: PASS (зокрема `client-entry-imports.test.ts` — профіль і бій без zod; наявні `extract-attacks*.test.ts`, `from-character-*.test.ts` — без змін).

- [ ] **Step 12: Type check and commit**

`pnpm exec tsc --noEmit -p tsconfig.json` → 0 errors.

```bash
git add lib/utils/battle lib/__tests__/item-readers-guard.test.ts types/battle.ts "app/api/campaigns/[id]/battles/[battleId]/start/start-build-context.ts" "app/api/campaigns/[id]/characters/[characterId]/sheet/sheet-handler.ts" components/characters/artifacts/CharacterArtifactsSection.tsx components/character-profile/ProfileEditor.tsx
git commit -m "feat(constructor): 4f-3 battle and sheet readers on resolveItemRows, reader guard test

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---
### Task 8: Пул предмета (`pool:item:<ref>`), `rest: null`, перевірка ключа `charges` у редакторі

**Files:**
- Modify: `lib/utils/items/pools.ts`, `lib/utils/abilities/build/collect.ts`, `lib/utils/battle/participant/from-character.ts`, `types/battle.ts` (`AbilityPool`), `types/characters.ts` (`CharacterResources.charges`, `SheetRest.charges`), `lib/utils/characters/resources/schema.ts`, `lib/utils/characters/resources/rest.ts`, `lib/utils/characters/resources/battle.ts`, `lib/utils/characters/sheet/rest-block.ts`, `lib/utils/abilities/editor.ts`, `components/character-profile/rest/ChargesList.tsx`
- Test: `lib/utils/items/__tests__/item-pools.test.ts`, `lib/utils/characters/resources/__tests__/item-charges.test.ts`, `lib/utils/abilities/__tests__/editor-item-charges.test.ts`

**Interfaces:**
- Consumes: `ITEM_CHARGES_KEY`, `itemPoolKey`, `isConsumablePool` (задача 6); `itemStatsFromRow` (задача 2); `poolLeft`, `poolAffordable` (`lib/utils/abilities/engine/core/usage.ts`, 4f-2).
- Produces:
  - `AbilityPool.rest: "short" | "long" | null`; `CharacterResources.charges[k].rest: RestKindValue | null`; `SheetRest.charges[i].rest: "short" | "long" | null`.
  - `withItemPool(abilities: Ability[], key: string): Ability[]`; `itemPools(rows: readonly ItemRowLike[]): Record<string, AbilityPool>`.
  - `ArtifactRowLike.modifiers?: unknown`; уміння артефакта з `limits.pool.key === "charges"` у предмета з `charges` отримують ключ `pool:item:<row.id>`.
  - `applyRest("long", …)` зберігає заряди з `rest: null`; `battleCharges`/`withCharges`/`buildRestBlock` пропускають `pool:consumable:*`.
  - `validateAbilities(list, opts: { classColumns?: readonly ClassColumn[]; itemCharges?: boolean })`.

- [ ] **Step 1: Write the failing tests**

`lib/utils/items/__tests__/item-pools.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { ParticipantSide } from "@/lib/constants/battle";
import { makeParticipant, resolved, seq } from "@/lib/utils/abilities/__tests__/fixtures";
import { runAbilities } from "@/lib/utils/abilities/engine/core/run-abilities";
import { poolAffordable, poolLeft } from "@/lib/utils/abilities/engine/core/usage";
import { createBattleParticipantFromCharacter } from "@/lib/utils/battle/participant/from-character";
import { itemStatsColumns, type ItemStats } from "@/lib/utils/items/item-stats";
import { itemPools, withItemPool } from "@/lib/utils/items/pools";
import { parseRules } from "@/lib/utils/rules/schema";

const EXPEND = { id: "charge", name: "Expend a charge", trigger: { event: "action" }, limits: { pool: { key: "charges", cost: 1 } }, effects: [{ kind: "note", text: "charge" }] };

const art = (id: string, name: string, slot: string, item: ItemStats, abilities: unknown[] = [EXPEND]) => ({ id, campaignId: "c1", name, slot, setId: null, icon: null, rarity: "uncommon", description: null, bonuses: {}, modifiers: itemStatsColumns(item).modifiers, abilities });

const ROWS = {
  wand: art("wand", "Wand of Magic Missiles", "item", { unique: false, charges: { max: 7, rest: "long" } }),
  dry: art("dry", "Dry Stone", "item", { unique: false }),
  ring: art("ring", "Ring of the Ram", "ring", { unique: false, attunement: true, charges: { max: 3, rest: null } }),
};

const base = {
  id: "ch1", campaignId: "c1", name: "Герой", race: "Людина", class: "Маг", level: 5,
  strength: 10, dexterity: 10, constitution: 10, intelligence: 16, wisdom: 10, charisma: 10,
  armorClass: 12, speed: 30, initiative: 0, morale: 0, controlledBy: "u1", immunities: [], knownSpells: [],
  equipment: {}, skillTreeProgress: {}, personalSkillId: null, archetype: "mage", classes: [],
};

const build = (inventory: object, rules = parseRules({ items: { enabled: true } })) =>
  createBattleParticipantFromCharacter({ ...base, inventory } as never, "b1", ParticipantSide.ALLY, undefined, {
    skillTreeByRace: {}, mainSkills: [], spells: [], allSkills: [], racesByName: { "Людина": null }, campaign: { maxLevel: 20 }, skillsById: {}, artifactsById: ROWS, artifactSetsById: {}, artifactSetMemberIds: {}, rules,
  } as never);

describe("item charges pool", () => {
  it("withItemPool rewrites only the charges key; itemPools reads charges", () => {
    const list = withItemPool([EXPEND as never, { ...EXPEND, id: "x", limits: { pool: { key: "rage", cost: 1 } } } as never], "pool:item:wand");

    expect(list.map((a) => a.limits?.pool?.key)).toEqual(["pool:item:wand", "rage"]);
    expect(itemPools([ROWS.wand, ROWS.dry])).toEqual({ "pool:item:wand": { label: "Wand of Magic Missiles", max: 7, rest: "long" } });
  });

  it("carried wand: pool on the participant, expend lowers it", async () => {
    const p = await build({ equipped: {}, stash: ["wand"], attuned: [], items: [] });

    expect(p.battleData.pools).toEqual({ "pool:item:wand": { label: "Wand of Magic Missiles", max: 7, rest: "long" } });

    const ability = p.battleData.resolvedAbilities.find((a) => a.key === "artifact:wand:charge")!;

    expect(ability.limits?.pool?.key).toBe("pool:item:wand");

    const after = runAbilities([p], { type: "action", actorId: p.basicInfo.id, abilityKey: ability.key, targetIds: [] }, { round: 1, rng: seq(0.5) }).participants[0];

    expect(poolLeft(after, "pool:item:wand")).toBe(6);
  });

  it("charges key on an item without charges stays unresolved → unavailable", async () => {
    const p = await build({ equipped: {}, stash: ["dry"], attuned: [], items: [] });

    const ability = p.battleData.resolvedAbilities.find((a) => a.key === "artifact:dry:charge")!;

    expect(ability.limits?.pool?.key).toBe("charges");
    expect(poolAffordable(p, ability)).toBe(false);
  });

  it("an unattuned item has no pool", async () => {
    const p = await build({ equipped: {}, stash: ["ring"], attuned: [], items: [] });

    expect(p.battleData.pools).toBeUndefined();
    expect((await build({ equipped: {}, stash: ["ring"], attuned: ["ring"], items: [] })).battleData.pools).toEqual({ "pool:item:ring": { label: "Ring of the Ram", max: 3, rest: null } });
  });

  it("the same pool fires for every ability of the item (fixtures sanity)", () => {
    const a = resolved({ id: "a", trigger: { event: "action" }, limits: { pool: { key: "pool:item:w", cost: 2 } }, effects: [{ kind: "note", text: "x" }] }, { type: "artifact", id: "w" });

    const p = { ...makeParticipant({ id: "h", abilities: [a] }), battleData: { ...makeParticipant({ id: "h" }).battleData, resolvedAbilities: [a], pools: { "pool:item:w": { label: "W", max: 1, rest: null } } } };

    expect(poolAffordable(p, a)).toBe(false);
  });
});
```

`lib/utils/characters/resources/__tests__/item-charges.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { makeParticipant } from "@/lib/utils/abilities/__tests__/fixtures";
import { applyBattleResult, applyCharacterResources } from "@/lib/utils/characters/resources/battle";
import { applyRest } from "@/lib/utils/characters/resources/rest";
import { readResources } from "@/lib/utils/characters/resources/schema";
import { buildRestBlock } from "@/lib/utils/characters/sheet/rest-block";
import { parseRules } from "@/lib/utils/rules/schema";
import type { BattleParticipant } from "@/types/battle";

const WAND = "pool:item:wand";

const RING = "pool:item:ring";

const POT = "pool:consumable:p1";

const rules = parseRules({ items: { enabled: true }, outOfCombat: { persistResources: true } });

function hero(usage: Record<string, number> = {}): BattleParticipant {
  const p = makeParticipant({ id: "h" });

  return {
    ...p,
    battleData: {
      ...p.battleData,
      pools: { [WAND]: { label: "Wand", max: 7, rest: "long" }, [RING]: { label: "Ring", max: 3, rest: null }, [POT]: { label: "Potion", max: 2, rest: null } },
      abilityUsage: Object.fromEntries(Object.entries(usage).map(([k, battle]) => [k, { battle, round: 0, turn: 0 }])),
    },
  };
}

describe("item charges between battles", () => {
  it("battle result stores item pools (rest null too), never consumable pools", () => {
    expect(applyBattleResult({}, hero({ [WAND]: 1, [RING]: 2, [POT]: 1 })).charges).toEqual({ [WAND]: { used: 1, rest: "long" }, [RING]: { used: 2, rest: null } });
  });

  it("battle start restores spent item pools, ignores consumable keys", () => {
    const p = applyCharacterResources(hero(), { resources: { charges: { [WAND]: { used: 2, rest: "long" }, [POT]: { used: 1, rest: null } } }, inspiration: null }, rules);

    expect(p.battleData.abilityUsage?.[WAND]).toEqual({ battle: 2, round: 0, turn: 0 });
    expect(p.battleData.abilityUsage?.[POT]).toBeUndefined();
  });

  it("long rest refills long and short charges, keeps rest null; schema accepts null", () => {
    const r = { charges: { [WAND]: { used: 1, rest: "long" as const }, [RING]: { used: 2, rest: null } } };

    expect(applyRest("long", r, { pool: [], longRestHitDice: "half" }).charges).toEqual({ [RING]: { used: 2, rest: null } });
    expect(applyRest("short", r, { pool: [], longRestHitDice: "half" }).charges).toEqual(r.charges);
    expect(readResources(r).charges).toEqual(r.charges);
  });

  it("sheet charges list item pools but not consumables", () => {
    const block = buildRestBlock({ participant: hero({ [WAND]: 1 }), character: { level: 5 }, rules, maxLevel: 20 });

    expect(block?.charges.map((c) => [c.key, c.uses, c.used, c.rest])).toEqual([
      [WAND, 7, 1, "long"],
      [RING, 3, 0, null],
    ]);
  });
});
```

`lib/utils/abilities/__tests__/editor-item-charges.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { CLASS_REF_OUTSIDE } from "@/lib/utils/abilities/class-columns";
import { validateAbilities } from "@/lib/utils/abilities/editor";

const EXPEND = { id: "charge", name: "Expend", trigger: { event: "action" }, limits: { pool: { key: "charges", cost: 1 } }, effects: [{ kind: "note", text: "x" }] };

describe("validateAbilities: item charges", () => {
  it("charges key is allowed only for an item with charges or a consumable", () => {
    expect(validateAbilities([EXPEND]).errorsByPath["0.limits.pool.key"]).toEqual([CLASS_REF_OUTSIDE]);
    expect(validateAbilities([EXPEND], { itemCharges: true }).ok).toBe(true);
    expect(validateAbilities([{ ...EXPEND, limits: { pool: { key: "rage", cost: 1 } } }], { itemCharges: true }).errorsByPath["0.limits.pool.key"]).toEqual([CLASS_REF_OUTSIDE]);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm test:run lib/utils/items/__tests__/item-pools.test.ts lib/utils/characters/resources/__tests__/item-charges.test.ts lib/utils/abilities/__tests__/editor-item-charges.test.ts`
Expected: FAIL.

- [ ] **Step 3: Pools** — `lib/utils/items/pools.ts` (додати):

```ts
import type { Ability } from "@/lib/utils/abilities/schema";
import type { ItemRowLike } from "@/lib/utils/items/compose";
import { itemStatsFromRow } from "@/lib/utils/items/item-row";
import type { AbilityPool } from "@/types/battle";

export function withItemPool(abilities: Ability[], key: string): Ability[] {
  return abilities.map((a) => (a.limits?.pool?.key === ITEM_CHARGES_KEY ? { ...a, limits: { ...a.limits, pool: { ...a.limits.pool, key } } } : a));
}

export function itemPools(rows: readonly ItemRowLike[]): Record<string, AbilityPool> {
  const out: Record<string, AbilityPool> = {};

  for (const row of rows) {
    const charges = itemStatsFromRow(row)?.charges;

    if (charges) out[itemPoolKey(row.id)] = { label: row.name, max: charges.max, rest: charges.rest };
  }

  return out;
}
```

(імпорти — на початок файлу, над наявними константами.)

- [ ] **Step 4: Types and resources** — `types/battle.ts`: `AbilityPool.rest: "short" | "long" | null;`. `types/characters.ts`: `charges?: Record<string, { used: number; rest: RestKindValue | null }>;` і в `SheetRest`: `charges: { key: string; name: string; uses: number; used: number; rest: "short" | "long" | null }[];`. `lib/utils/characters/resources/schema.ts`: `rest: z.enum(["short", "long"]).nullable()`. `lib/utils/characters/resources/rest.ts`, гілка довгого відпочинку:

```ts
  return compactResources({
    hitDiceSpent: restoreHitDice(r.hitDiceSpent, opts.pool, opts.longRestHitDice),
    exhaustion: Math.max(0, (r.exhaustion ?? 0) - 1),
    charges: withoutKey(r.charges, (_k, c) => c.rest !== null),
  });
```

`lib/utils/characters/resources/battle.ts`: імпорт `isConsumablePool` (з `@/lib/utils/items/pools`); у `withCharges` цикл пулів — `for (const key of Object.keys(p.battleData.pools ?? {}).filter((k) => !isConsumablePool(k))) {`; у `battleCharges` — `...Object.entries(p.battleData.pools ?? {}).filter(([key]) => !isConsumablePool(key)).map(([key, pool]) => ({ key, rest: pool.rest })),`. `lib/utils/characters/sheet/rest-block.ts`: так само `.filter(([key]) => !isConsumablePool(key))` перед `.map` пулів. `components/character-profile/rest/ChargesList.tsx` (тип `rest` тепер може бути `null`): `{REST_LABEL[c.rest]}` → `{c.rest ? REST_LABEL[c.rest] : "не відновлюються"}`.

- [ ] **Step 5: Collect and participant** — `lib/utils/abilities/build/collect.ts`: `ArtifactRowLike` += `modifiers?: unknown;`; імпорти `itemStatsFromRow` (`@/lib/utils/items/item-row`), `itemPoolKey`, `withItemPool` (`@/lib/utils/items/pools`); `fromArtifacts`:

```ts
  const fromArtifacts = input.artifacts.flatMap((a) => {
    const list = artifactAbilities(a);

    return resolveAbilities({ type: "artifact", id: a.id, name: a.name, icon: a.icon ?? null }, itemStatsFromRow(a)?.charges ? withItemPool(list, itemPoolKey(a.id)) : list);
  });
```

`lib/utils/battle/participant/from-character.ts`: імпорт `itemPools`; рядок `const pools = …` →

```ts
  const activeRows = uniqueById(artifactRows.map(({ row }) => row));

  const pools = { ...(resolvedClasses ? classPools(resolvedClasses) : {}), ...itemPools(activeRows) };
```

(і `artifacts: uniqueById(artifactRows.map(({ row, slot }) => ({ ...row, slot })))` — як у задачі 7.)

- [ ] **Step 6: Editor** — `lib/utils/abilities/editor.ts`: імпорт `ITEM_CHARGES_KEY` (`@/lib/utils/items/pools`); сигнатура `validateAbilities(list: unknown[], opts: { classColumns?: readonly ClassColumn[]; itemCharges?: boolean } = {})`; у циклі:

```ts
    const checked = opts.itemCharges && one.data.limits?.pool?.key === ITEM_CHARGES_KEY ? { ...one.data, limits: { ...one.data.limits, pool: undefined } } : one.data;

    for (const issue of columnRefIssues([checked], opts.classColumns ?? null)) push([i, ...issue.path.slice(1)], issue.message);
```

- [ ] **Step 7: Run tests to verify they pass**

Run: `pnpm test:run lib/utils/items lib/utils/characters lib/utils/abilities lib/utils/battle/participant lib/utils/battle/view`
Expected: PASS (наявні тести пулів 4f-2 `pools.test.ts`, `pools-resources.test.ts` — без змін).

- [ ] **Step 8: Type check and commit**

`pnpm exec tsc --noEmit -p tsconfig.json` → 0 errors.

```bash
git add lib/utils/items/pools.ts lib/utils/items/__tests__/item-pools.test.ts lib/utils/abilities lib/utils/battle/participant/from-character.ts types/battle.ts types/characters.ts lib/utils/characters components/character-profile/rest/ChargesList.tsx
git commit -m "feat(constructor): 4f-3 item charges as pools, rest null, editor charges key

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 9: Витратні предмети в бою й списання після бою

**Files:**
- Create: `lib/utils/items/consumables.ts`, `lib/utils/battle/store/persist-consumables.ts`
- Modify: `lib/utils/abilities/build/collect.ts`, `lib/utils/battle/participant/extract-artifacts.ts`, `lib/utils/battle/participant/from-character.ts`, `lib/utils/battle/store/save-battle.ts`
- Test: `lib/utils/items/__tests__/consumables.test.ts`, `lib/utils/battle/store/__tests__/save-battle-consumables.test.ts`, `lib/utils/battle/participant/__tests__/from-character-consumables.test.ts`

**Interfaces:**
- Consumes: `consumablePoolKey`, `CONSUMABLE_POOL_PREFIX`, `isConsumablePool`, `withItemPool` (задачі 6, 8); `getRow`, `RowsById` (задача 4); `normalizeItems` (задача 4); `persistedHeroes` (`lib/utils/battle/store/persist-resources.ts`).
- Produces:
  - `interface ConsumableEntry<R> { itemId: string; quantity: number; row: R }`; `consumableEntries<R extends ItemRowLike>(items: unknown, rowsById: RowsById<R>): ConsumableEntry<R>[]`; `consumablePools(entries: readonly ConsumableEntry<ItemRowLike>[]): Record<string, AbilityPool>`; `consumableSpend(p: BattleParticipant): Record<string, number>` (itemId → витрачено); `spendConsumables(items: SpecialItem[], spent: Record<string, number>): { items: SpecialItem[]; used: Array<{ item: string; qty: number }> }`.
  - `collectCharacterAbilities({ …, consumables?: Array<{ itemId: string; row: ArtifactRowLike }> })` — джерело `{ type: "artifact", id: "consumable:<itemId>", name }`, ключ пулу `pool:consumable:<itemId>`.
  - `loadConsumableEntries(character, preloaded?, rules?): Promise<ConsumableEntry<Prisma.ArtifactGetPayload<object>>[]>` (порожньо без `rules.items.enabled`).
  - `persistConsumables(tx: Pick<Prisma.TransactionClient, "characterInventory" | "inventoryLog" | "campaign">, battle: { campaignId: string }, participants: BattleParticipant[]): Promise<void>`.

- [ ] **Step 1: Write the failing tests**

`lib/utils/items/__tests__/consumables.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { makeParticipant } from "@/lib/utils/abilities/__tests__/fixtures";
import { consumableEntries, consumablePools, consumableSpend, spendConsumables } from "@/lib/utils/items/consumables";

const rows = new Map([["pot", { id: "pot", name: "Potion of Healing", slot: "item" }]]);

describe("consumables", () => {
  it("entries need an artifact link, a known row and a positive quantity", () => {
    const items = [
      { id: "p1", name: "Potion", quantity: 2, consumable: true, artifactId: "pot" },
      { id: "p2", name: "Free note", quantity: 1, consumable: true },
      { id: "p3", name: "Gone", quantity: 1, consumable: true, artifactId: "gone" },
    ];

    expect(consumableEntries(items, rows).map((e) => [e.itemId, e.quantity, e.row.id])).toEqual([["p1", 2, "pot"]]);
    expect(consumablePools(consumableEntries(items, rows))).toEqual({ "pool:consumable:p1": { label: "Potion of Healing", max: 2, rest: null } });
  });

  it("spend: decrement, remove at zero, skip missing items", () => {
    const items = [
      { id: "p1", name: "Potion", quantity: 2, consumable: true, artifactId: "pot" },
      { id: "p2", name: "Elixir", quantity: 1, consumable: true, artifactId: "el" },
    ];

    expect(spendConsumables(items, { p1: 1, p2: 1, gone: 3 })).toEqual({
      items: [{ id: "p1", name: "Potion", quantity: 1, consumable: true, artifactId: "pot" }],
      used: [
        { item: "Potion", qty: 1 },
        { item: "Elixir", qty: 1 },
      ],
    });
  });

  it("consumableSpend reads only consumable pools with usage", () => {
    const p = makeParticipant({ id: "h" });

    const hero = { ...p, battleData: { ...p.battleData, pools: { "pool:consumable:p1": { label: "P", max: 2, rest: null }, "pool:item:w": { label: "W", max: 7, rest: "long" as const } }, abilityUsage: { "pool:consumable:p1": { battle: 1, round: 1, turn: 1 }, "pool:item:w": { battle: 2, round: 0, turn: 0 } } } };

    expect(consumableSpend(hero)).toEqual({ p1: 1 });
  });
});
```

`lib/utils/battle/participant/__tests__/from-character-consumables.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { ParticipantSide } from "@/lib/constants/battle";
import { createBattleParticipantFromCharacter } from "@/lib/utils/battle/participant/from-character";
import { itemStatsColumns } from "@/lib/utils/items/item-stats";
import { DEFAULT_RULES } from "@/lib/utils/rules";
import { parseRules } from "@/lib/utils/rules/schema";

const DRINK = { id: "drink", name: "Drink", trigger: { event: "bonusAction" }, limits: { pool: { key: "charges", cost: 1 } }, effects: [{ kind: "heal", amount: "2d4+2", target: "self" }] };

const pot = { id: "pot", campaignId: "c1", name: "Potion of Healing", slot: "item", setId: null, icon: null, rarity: "common", description: null, bonuses: {}, modifiers: itemStatsColumns({ unique: false, consumable: true }).modifiers, abilities: [DRINK] };

const base = {
  id: "ch1", campaignId: "c1", name: "Герой", race: "Людина", class: "Воїн", level: 3,
  strength: 10, dexterity: 10, constitution: 10, intelligence: 10, wisdom: 10, charisma: 10,
  armorClass: 12, speed: 30, initiative: 0, morale: 0, controlledBy: "u1", immunities: [], knownSpells: [],
  equipment: {}, skillTreeProgress: {}, personalSkillId: null, archetype: "warrior", classes: [],
};

const inventory = { equipped: {}, stash: [], attuned: [], items: [{ id: "p1", name: "Potion of Healing", quantity: 2, consumable: true, artifactId: "pot" }] };

const build = (rules: ReturnType<typeof parseRules>) =>
  createBattleParticipantFromCharacter({ ...base, inventory } as never, "b1", ParticipantSide.ALLY, undefined, {
    skillTreeByRace: {}, mainSkills: [], spells: [], allSkills: [], racesByName: { "Людина": null }, campaign: { maxLevel: 20 }, skillsById: {}, artifactsById: { pot }, artifactSetsById: {}, artifactSetMemberIds: {}, rules,
  } as never);

describe("consumables in battle", () => {
  it("items enabled: the potion ability with a quantity pool", async () => {
    const p = await build(parseRules({ items: { enabled: true } }));

    expect(p.battleData.pools).toEqual({ "pool:consumable:p1": { label: "Potion of Healing", max: 2, rest: null } });
    expect(p.battleData.resolvedAbilities.find((a) => a.key === "artifact:consumable:p1:drink")?.limits?.pool?.key).toBe("pool:consumable:p1");
  });

  it("items disabled: nothing", async () => {
    const p = await build(DEFAULT_RULES);

    expect(p.battleData.pools).toBeUndefined();
    expect(p.battleData.resolvedAbilities.some((a) => a.key.includes("consumable"))).toBe(false);
  });
});
```

`lib/utils/battle/store/__tests__/save-battle-consumables.test.ts`:

```ts
import { describe, expect, it, vi } from "vitest";

import { BattleStatus } from "@/lib/constants/battle";
import { createMockParticipant } from "@/lib/utils/battle/__tests__/fixtures/mock-participant";
import type { BattleDb } from "@/lib/utils/battle/store/load-battle";
import { saveBattle } from "@/lib/utils/battle/store/save-battle";
import type { LoadedBattle } from "@/lib/utils/battle/store/types";
import { DEFAULT_RULES } from "@/lib/utils/rules";
import type { BattleParticipant } from "@/types/battle";

const KEY = "pool:consumable:p1";

const hero = (used: number): BattleParticipant => {
  const p = createMockParticipant();

  return {
    ...p,
    basicInfo: { ...p.basicInfo, id: "pa", sourceId: "ch-a", sourceType: "character" },
    battleData: { ...p.battleData, pools: { [KEY]: { label: "Potion", max: 2, rest: null } }, abilityUsage: used ? { [KEY]: { battle: used, round: 1, turn: 1 } } : {} },
  };
};

const loaded = (participants: BattleParticipant[]): LoadedBattle => ({
  scene: { id: "b1", campaignId: "c1", status: BattleStatus.ACTIVE, round: 3, turnIndex: 0, version: 1, eventSeq: 0, pendingMoraleCheck: null, startedAt: null, completedAt: null },
  meta: { name: "Бій", description: null, setup: [], friendlyFire: false, rules: DEFAULT_RULES, map: null, createdAt: new Date() },
  participants,
  pending: [],
  isDM: true,
});

function fakeDb(items: unknown[] | null) {
  const tx = {
    battleScene: { updateMany: vi.fn(async () => ({ count: 1 })) },
    battleParticipant: { createMany: vi.fn(), deleteMany: vi.fn() },
    battleEvent: { createMany: vi.fn(), updateMany: vi.fn(), deleteMany: vi.fn() },
    battleSnapshot: { createMany: vi.fn(), deleteMany: vi.fn() },
    character: { findMany: vi.fn(async () => []), update: vi.fn(), updateMany: vi.fn() },
    characterLog: { createMany: vi.fn() },
    campaign: { findUnique: vi.fn(async () => ({ dmUserId: "dm" })) },
    characterInventory: { findMany: vi.fn(async () => (items ? [{ characterId: "ch-a", items }] : [])), update: vi.fn() },
    inventoryLog: { createMany: vi.fn() },
    $executeRaw: vi.fn(),
  };

  const db = { $transaction: vi.fn(async (fn: (t: typeof tx) => Promise<void>) => fn(tx)) } as unknown as BattleDb;

  return { db, tx };
}

const COMPLETE = { status: BattleStatus.COMPLETED, completedAt: new Date() };

const POTION = { id: "p1", name: "Potion", quantity: 2, consumable: true, artifactId: "pot" };

describe("saveBattle: consumables write-back", () => {
  it("completing subtracts used quantity and logs item_use by the DM, regardless of persistResources", async () => {
    const { db, tx } = fakeDb([POTION]);

    await saveBattle(db, loaded([hero(1)]), { participants: [hero(1)], pending: [], events: [], scene: COMPLETE });

    expect(tx.characterInventory.update).toHaveBeenCalledWith({ where: { characterId: "ch-a" }, data: { items: [{ ...POTION, quantity: 1 }] } });
    expect(tx.inventoryLog.createMany).toHaveBeenCalledWith({ data: [{ campaignId: "c1", characterId: "ch-a", actorUserId: "dm", kind: "item_use", delta: { item: "Potion", qty: -1 }, note: null }] });
  });

  it("all used → entry removed", async () => {
    const { db, tx } = fakeDb([POTION]);

    await saveBattle(db, loaded([hero(2)]), { participants: [hero(2)], pending: [], events: [], scene: COMPLETE });

    expect(tx.characterInventory.update).toHaveBeenCalledWith({ where: { characterId: "ch-a" }, data: { items: [] } });
  });

  it("entry deleted mid-battle → no write; nothing used → no queries; not completing → untouched", async () => {
    const gone = fakeDb([]);

    await saveBattle(gone.db, loaded([hero(1)]), { participants: [hero(1)], pending: [], events: [], scene: COMPLETE });
    expect(gone.tx.characterInventory.update).not.toHaveBeenCalled();

    const idle = fakeDb([POTION]);

    await saveBattle(idle.db, loaded([hero(0)]), { participants: [hero(0)], pending: [], events: [], scene: COMPLETE });
    expect(idle.tx.characterInventory.findMany).not.toHaveBeenCalled();

    const running = fakeDb([POTION]);

    await saveBattle(running.db, loaded([hero(1)]), { participants: [hero(1)], pending: [], events: [] });
    expect(running.tx.characterInventory.findMany).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm test:run lib/utils/items/__tests__/consumables.test.ts lib/utils/battle/participant/__tests__/from-character-consumables.test.ts lib/utils/battle/store/__tests__/save-battle-consumables.test.ts`
Expected: FAIL.

- [ ] **Step 3: Consumables** — `lib/utils/items/consumables.ts` (без zod):

```ts
import { normalizeItems } from "@/lib/utils/inventory/items";
import type { ItemRowLike } from "@/lib/utils/items/compose";
import { CONSUMABLE_POOL_PREFIX, consumablePoolKey, isConsumablePool } from "@/lib/utils/items/pools";
import { getRow, type RowsById } from "@/lib/utils/items/resolve";
import type { AbilityPool, BattleParticipant } from "@/types/battle";
import type { SpecialItem } from "@/types/inventory";

export interface ConsumableEntry<R> {
  itemId: string;
  quantity: number;
  row: R;
}

export function consumableEntries<R extends ItemRowLike>(items: unknown, rowsById: RowsById<R>): ConsumableEntry<R>[] {
  return normalizeItems(items).flatMap((i) => {
    const row = i.artifactId ? getRow(rowsById, i.artifactId) : undefined;

    return row && i.quantity > 0 ? [{ itemId: i.id, quantity: i.quantity, row }] : [];
  });
}

export const consumablePools = (entries: readonly ConsumableEntry<ItemRowLike>[]): Record<string, AbilityPool> =>
  Object.fromEntries(entries.map((e) => [consumablePoolKey(e.itemId), { label: e.row.name, max: e.quantity, rest: null }]));

export function consumableSpend(p: BattleParticipant): Record<string, number> {
  return Object.fromEntries(
    Object.keys(p.battleData.pools ?? {})
      .filter(isConsumablePool)
      .flatMap((key) => {
        const used = p.battleData.abilityUsage?.[key]?.battle ?? 0;

        return used > 0 ? [[key.slice(CONSUMABLE_POOL_PREFIX.length), used] as const] : [];
      }),
  );
}

export function spendConsumables(items: SpecialItem[], spent: Record<string, number>): { items: SpecialItem[]; used: Array<{ item: string; qty: number }> } {
  const used: Array<{ item: string; qty: number }> = [];

  const next = items.flatMap((i) => {
    const n = Math.min(spent[i.id] ?? 0, i.quantity);

    if (n <= 0) return [i];

    used.push({ item: i.name, qty: n });

    return i.quantity - n > 0 ? [{ ...i, quantity: i.quantity - n }] : [];
  });

  return { items: next, used };
}
```

- [ ] **Step 4: Collect** — `lib/utils/abilities/build/collect.ts`: у вході `collectCharacterAbilities` — `consumables?: Array<{ itemId: string; row: ArtifactRowLike }>;`; імпорт `consumablePoolKey`; після `fromSets`:

```ts
  const fromConsumables = (input.consumables ?? []).flatMap(({ itemId, row }) =>
    resolveAbilities({ type: "artifact", id: `consumable:${itemId}`, name: row.name, icon: row.icon ?? null }, withItemPool(artifactAbilities(row), consumablePoolKey(itemId))),
  );
```

і в `return` — `..., ...fromSets, ...fromConsumables]`.

- [ ] **Step 5: Loading and participant** — `lib/utils/battle/participant/extract-artifacts.ts` (додати):

```ts
export async function loadConsumableEntries(
  character: CharacterFromPrisma,
  preloadedArtifactsById?: Record<string, Prisma.ArtifactGetPayload<object>>,
  rules?: Ruleset,
): Promise<ConsumableEntry<Prisma.ArtifactGetPayload<object>>[]> {
  if (!rules?.items.enabled || !character.inventory) return [];

  const ids = normalizeItems(character.inventory.items).flatMap((i) => (i.artifactId ? [i.artifactId] : []));

  if (ids.length === 0) return [];

  const rows = preloadedArtifactsById ?? Object.fromEntries((await prisma.artifact.findMany({ where: { id: { in: ids }, campaignId: character.campaignId } })).map((r) => [r.id, r]));

  return consumableEntries(character.inventory.items, rows);
}
```

(імпорти `normalizeItems`, `consumableEntries`, `type ConsumableEntry`). `lib/utils/battle/participant/from-character.ts`: після `const artifactsById = …` — `const consumables = await loadConsumableEntries(character, artifactsById, rules);`; у `collectCharacterAbilities` — `consumables: consumables.map(({ itemId, row }) => ({ itemId, row })),`; `pools` → `{ ...classPools…, ...itemPools(activeRows), ...consumablePools(consumables) }`.

- [ ] **Step 6: Persist** — `lib/utils/battle/store/persist-consumables.ts`:

```ts
import type { Prisma } from "@prisma/client";

import { persistedHeroes } from "./persist-resources";

import { InventoryLogKind } from "@/lib/constants/inventory";
import { normalizeItems } from "@/lib/utils/inventory/items";
import { consumableSpend, spendConsumables } from "@/lib/utils/items/consumables";
import type { BattleParticipant } from "@/types/battle";

export async function persistConsumables(
  tx: Pick<Prisma.TransactionClient, "characterInventory" | "inventoryLog" | "campaign">,
  battle: { campaignId: string },
  participants: BattleParticipant[],
): Promise<void> {
  const spent = persistedHeroes(participants).flatMap((h) => {
    const byItem = consumableSpend(h);

    return Object.keys(byItem).length > 0 ? [{ characterId: h.basicInfo.sourceId, byItem }] : [];
  });

  if (spent.length === 0) return;

  const [campaign, inventories] = await Promise.all([
    tx.campaign.findUnique({ where: { id: battle.campaignId }, select: { dmUserId: true } }),
    tx.characterInventory.findMany({ where: { characterId: { in: spent.map((s) => s.characterId) } }, select: { characterId: true, items: true } }),
  ]);

  const logs: Prisma.InventoryLogCreateManyInput[] = [];

  for (const { characterId, byItem } of spent) {
    const inv = inventories.find((i) => i.characterId === characterId);

    if (!inv) continue;

    const { items, used } = spendConsumables(normalizeItems(inv.items), byItem);

    if (used.length === 0) continue;

    await tx.characterInventory.update({ where: { characterId }, data: { items: items as unknown as Prisma.InputJsonValue } });

    if (campaign) logs.push(...used.map((u) => ({ campaignId: battle.campaignId, characterId, actorUserId: campaign.dmUserId, kind: InventoryLogKind.ITEM_USE, delta: { item: u.item, qty: -u.qty }, note: null })));
  }

  if (logs.length > 0) await tx.inventoryLog.createMany({ data: logs });
}
```

`lib/utils/battle/store/save-battle.ts`: імпорт `persistConsumables`; у гілці `completing` після `persistBattleXp(…)` — `await persistConsumables(tx, { campaignId: scene.campaignId }, outcome.participants);`.

- [ ] **Step 7: Run tests to verify they pass**

Run: `pnpm test:run lib/utils/items lib/utils/battle/store lib/utils/battle/participant lib/utils/abilities`
Expected: PASS (наявні `save-battle-resources.test.ts`, `save-battle-xp.test.ts` — без змін: без витрачених витратних `persistConsumables` не торкається `tx`).

- [ ] **Step 8: Type check and commit**

`pnpm exec tsc --noEmit -p tsconfig.json` → 0 errors.

```bash
git add lib/utils/items/consumables.ts lib/utils/items/__tests__/consumables.test.ts lib/utils/abilities/build/collect.ts lib/utils/battle/participant lib/utils/battle/store
git commit -m "feat(constructor): 4f-3 consumables in battle and quantity write-back on completion

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---
### Task 10: Рушій — `damageBonus`, `attackSourceId` + `withThisItem`, `critImmunity`, `atLeast`

**Files:**
- Create: `lib/utils/battle/attack/source.ts`, `lib/utils/battle/attack/crit-immunity.ts`
- Modify: `lib/utils/battle/damage/weapon-flat.ts`, `lib/utils/battle/attack/process/compute.ts`, `types/abilities.ts` (події), `lib/utils/battle/attack/process/{run,hit,miss,critical-fail}.ts`, `lib/utils/battle/attack/bonus.ts` (`previewBefore`), `lib/utils/abilities/schema/conditions.ts`, `lib/utils/abilities/registry/conditions.ts`, `lib/utils/abilities/engine/core/run-abilities.ts`, `components/abilities/ConditionEditor.tsx`, `lib/utils/abilities/schema/effects.ts`, `lib/utils/abilities/registry/effects/flags.ts`, `lib/utils/abilities/registry/effects/static.ts`, `lib/utils/abilities/build/bake.ts`
- Test: `lib/utils/battle/damage/__tests__/weapon-damage-bonus.test.ts`, `lib/utils/abilities/__tests__/with-this-item.test.ts`, `lib/utils/battle/attack/__tests__/crit-immunity.test.ts`, `lib/utils/abilities/build/__tests__/at-least.test.ts`

**Interfaces:**
- Consumes: `BattleAttack.damageBonus` (задача 7).
- Produces:
  - `weaponFlatOf(attack)` = «+N» формули + `attack.damageBonus ?? 0` (прев'ю `breakdown.ts` і сервер `compute.ts` — та сама функція); у гілці `max_damage` героя `weaponFlat` теж додає `damageBonus`.
  - `attackSourceOf(attack: { id?: string }): { attackSourceId?: string }` (id без `:off`); події `attack` і `hit` у `AbilityEvent` += `attackSourceId?: string`.
  - Умова `{ type: "withThisItem" }`; `ConditionContext.sourceId?: string` (`runAbilities` передає `ability.source.id`).
  - Прапорець `{ kind: "flag", flag: "critImmunity" }`; `cancelCritIfImmune<T extends { isCritical: boolean; criticalEffect?: unknown }>(roll: T, participants: BattleParticipant[], targetId: string, extra?: StaticEffect[]): { roll: T; cancelled: boolean }`.
  - `modifyStat.atLeast?: number` (1–30, лише характеристики, без `flat`/`percent`).

- [ ] **Step 1: Write the failing tests**

`lib/utils/battle/damage/__tests__/weapon-damage-bonus.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { AttackType } from "@/lib/constants/battle";
import { applyWeaponFlat, weaponFlatOf } from "@/lib/utils/battle/damage/weapon-flat";
import type { BattleAttack } from "@/types/battle";

const attack = (over: Partial<BattleAttack>): BattleAttack => ({ id: "ls+w2", name: "Longsword (+2)", type: AttackType.MELEE, attackBonus: 2, damageDice: "1d8", damageType: "slashing", ...over });

describe("weapon damageBonus", () => {
  it("adds to the weapon flat, alone and with a dice flat", () => {
    expect(weaponFlatOf(attack({ damageBonus: 2 }))).toBe(2);
    expect(weaponFlatOf(attack({ damageDice: "1d8+1", damageBonus: 2 }))).toBe(3);
    expect(weaponFlatOf(attack({}))).toBe(0);
    expect(applyWeaponFlat(10, attack({ damageBonus: 2 }))).toMatchObject({ damage: 12, step: { kind: "flat", value: 2, after: 12 } });
  });
});
```

`lib/utils/abilities/__tests__/with-this-item.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { ParticipantSide } from "@/lib/constants/battle";
import { makeParticipant, resolved, seq } from "@/lib/utils/abilities/__tests__/fixtures";
import { runAbilities } from "@/lib/utils/abilities/engine/core/run-abilities";
import { ConditionSchema } from "@/lib/utils/abilities/schema/conditions";
import { attackSourceOf } from "@/lib/utils/battle/attack/source";
import type { AbilityEvent } from "@/types/abilities";

const rider = resolved(
  { id: "p-rider", name: "Flame Tongue", trigger: { event: "hit", role: "attacker" }, condition: { type: "withThisItem" }, effects: [{ kind: "dealDamage", amount: 7, damageType: "fire", target: "eventTarget" }] },
  { type: "artifact", id: "ls+ft" },
);

const scene = () => [makeParticipant({ id: "f", abilities: [rider] }), makeParticipant({ id: "t", side: ParticipantSide.ENEMY, hp: 50, maxHp: 50 })];

const hit = (source?: string): AbilityEvent => ({ type: "hit", actorId: "f", targetId: "t", attackKind: "melee", damage: 5, ...(source && { attackSourceId: source }) });

const hpAfter = (event: AbilityEvent) => runAbilities(scene(), event, { round: 1, rng: seq(0.5) }).participants.find((p) => p.basicInfo.id === "t")?.combatStats.currentHp;

describe("withThisItem", () => {
  it("rider fires only for an attack made with its item", () => {
    expect(hpAfter(hit("ls+ft"))).toBe(43);
    expect(hpAfter(hit("dg"))).toBe(50);
    expect(hpAfter(hit())).toBe(50);
  });

  it("off-hand source strips :off; default attacks have no item", () => {
    expect(attackSourceOf({ id: "ls+ft:off" })).toEqual({ attackSourceId: "ls+ft" });
    expect(attackSourceOf({ id: "default-melee" })).toEqual({ attackSourceId: "default-melee" });
    expect(attackSourceOf({})).toEqual({});
  });

  it("schema accepts the condition", () => {
    expect(ConditionSchema.safeParse({ type: "withThisItem" }).success).toBe(true);
  });
});
```

`lib/utils/battle/attack/__tests__/crit-immunity.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { ParticipantSide } from "@/lib/constants/battle";
import { makeParticipant, resolved } from "@/lib/utils/abilities/__tests__/fixtures";
import { EffectSchema } from "@/lib/utils/abilities/schema";
import { cancelCritIfImmune } from "@/lib/utils/battle/attack/crit-immunity";

const adamantine = resolved({ id: "crit", name: "Adamantine", trigger: { event: "passive" }, effects: [{ kind: "flag", flag: "critImmunity" }] }, { type: "artifact", id: "pl+ad" });

const crit = { isCritical: true, criticalEffect: { id: "x" } };

describe("critImmunity", () => {
  it("a crit against the owner becomes a normal hit without a critical effect", () => {
    const ps = [makeParticipant({ id: "a" }), makeParticipant({ id: "t", side: ParticipantSide.ENEMY, abilities: [adamantine] })];

    expect(cancelCritIfImmune(crit, ps, "t")).toEqual({ roll: { isCritical: false, criticalEffect: undefined }, cancelled: true });
    expect(cancelCritIfImmune(crit, ps, "a")).toEqual({ roll: crit, cancelled: false });
    expect(cancelCritIfImmune({ isCritical: false }, ps, "t")).toEqual({ roll: { isCritical: false }, cancelled: false });
  });

  it("schema accepts the flag", () => {
    expect(EffectSchema.safeParse({ kind: "flag", flag: "critImmunity" }).success).toBe(true);
  });
});
```

`lib/utils/abilities/build/__tests__/at-least.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { makeParticipant, resolved } from "@/lib/utils/abilities/__tests__/fixtures";
import { bakePassives } from "@/lib/utils/abilities/build/bake";
import { EffectSchema } from "@/lib/utils/abilities/schema";

const passive = (id: string, effect: object) => resolved({ id, name: id, trigger: { event: "passive" }, effects: [effect as never] }, { type: "artifact", id });

const withStr = (strength: number, abilities: ReturnType<typeof passive>[]) => {
  const p = makeParticipant({ id: "h", abilities });

  return { ...p, abilities: { ...p.abilities, strength, modifiers: { ...p.abilities.modifiers, strength: Math.floor((strength - 10) / 2) } } };
};

const gauntlets = passive("g", { kind: "modifyStat", stat: "strength", atLeast: 19 });

describe("modifyStat atLeast", () => {
  it("raises a lower score, keeps a higher one, applies after flat bonuses", () => {
    expect(bakePassives(withStr(12, [gauntlets])).abilities).toMatchObject({ strength: 19, modifiers: { strength: 4 } });
    expect(bakePassives(withStr(20, [gauntlets])).abilities.strength).toBe(20);
    expect(bakePassives(withStr(18, [gauntlets, passive("b", { kind: "modifyStat", stat: "strength", flat: 2 })])).abilities.strength).toBe(20);
    expect(bakePassives(withStr(12, [gauntlets, passive("b", { kind: "modifyStat", stat: "strength", flat: 2 })])).abilities.strength).toBe(19);
  });

  it("only ability scores, never with flat/percent", () => {
    expect(EffectSchema.safeParse({ kind: "modifyStat", stat: "strength", atLeast: 19 }).success).toBe(true);
    expect(EffectSchema.safeParse({ kind: "modifyStat", stat: "armor", atLeast: 19 }).success).toBe(false);
    expect(EffectSchema.safeParse({ kind: "modifyStat", stat: "strength", atLeast: 19, flat: 1 }).success).toBe(false);
    expect(EffectSchema.safeParse({ kind: "modifyStat", stat: "strength", atLeast: 31 }).success).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm test:run lib/utils/battle/damage/__tests__/weapon-damage-bonus.test.ts lib/utils/abilities/__tests__/with-this-item.test.ts lib/utils/battle/attack/__tests__/crit-immunity.test.ts lib/utils/abilities/build/__tests__/at-least.test.ts`
Expected: FAIL.

- [ ] **Step 3: damageBonus** — `lib/utils/battle/damage/weapon-flat.ts`: `return (parseDice(attack.damageDice ?? "")?.flat ?? 0) + (attack.damageBonus ?? 0);` (коментар над функцією: `/** «+N» формули зброї й +N магічного предмета: кубики рівня героя їх не містять (\`mergeDiceFormulas\` відкидає flat). */`). `lib/utils/battle/attack/process/compute.ts`, гілка `max_damage`: `const weaponFlat = updatedAttacker.basicInfo.sourceType === ParticipantSourceType.CHARACTER ? (parseDice(weaponDice)?.flat ?? 0) + (attack.damageBonus ?? 0) : 0;`.

- [ ] **Step 4: Attack source in events** — `lib/utils/battle/attack/source.ts`:

```ts
/** Id атаки = ref предмета; друга рука — той самий предмет. */
export const attackSourceOf = (attack: { id?: string }): { attackSourceId?: string } => (attack.id ? { attackSourceId: attack.id.replace(/:off$/, "") } : {});
```

`types/abilities.ts`: у варіантах `attack` і `hit` додати `attackSourceId?: string`. Додати `...attackSourceOf(attack)` у: `run.ts` — обидві події `attack` (`before` на рядку з `fire(flow, { type: "attack", phase: "before", … })` і `after`); `hit.ts` — подія `hit`; `miss.ts` і `critical-fail.ts` — подія `attack` `after`; `bonus.ts` → `previewBefore` (`{ type: "attack", phase: "before", …, ...attackSourceOf(attack) }`). Імпорт `attackSourceOf` з `@/lib/utils/battle/attack/source`.

- [ ] **Step 5: withThisItem** — `lib/utils/abilities/schema/conditions.ts`: у `Condition` — `| { type: "withThisItem" }`; у `ConditionSchema` — `z.object({ type: z.literal("withThisItem") }),`. `lib/utils/abilities/registry/conditions.ts`: `ConditionContext` += `sourceId?: string;`; у `CONDITION_REGISTRY` після `allyAdjacent` — `withThisItem: { label: "Атака цим предметом", fields: [] },`; у `evaluateCondition`:

```ts
    case "withThisItem": {
      const e = ctx.event;

      return !!ctx.sourceId && !!e && (e.type === "attack" || e.type === "hit") && e.actorId === ctx.owner.basicInfo.id && e.attackSourceId === ctx.sourceId;
    }
```

`lib/utils/abilities/engine/core/run-abilities.ts:51`: `evaluateCondition(ability.condition, { owner, event, participants: ps, sourceId: ability.source.id })`. `components/abilities/ConditionEditor.tsx`, `defaultFor`: додати `case "withThisItem":` до групи `targetDead`/`actorIsEnemy`/`allyAdjacent`.

- [ ] **Step 6: critImmunity** — `lib/utils/abilities/schema/effects.ts`: у `FlagSchema` після `evasion` — `z.object({ ...flagBase, flag: z.literal("critImmunity") }),`. `lib/utils/abilities/registry/effects/flags.ts`: після `evasion` — `critImmunity: plain("Імунітет до критів", "критичне влучання по власнику стає звичайним"),`. `lib/utils/battle/attack/crit-immunity.ts`:

```ts
import { collectModifiers } from "@/lib/utils/abilities/engine/core/collect-modifiers";
import type { StaticEffect } from "@/lib/utils/abilities/schema";
import type { BattleParticipant } from "@/types/battle";

export function cancelCritIfImmune<T extends { isCritical: boolean; criticalEffect?: unknown }>(roll: T, participants: BattleParticipant[], targetId: string, extra?: StaticEffect[]): { roll: T; cancelled: boolean } {
  if (!roll.isCritical || collectModifiers(participants, targetId, { flag: "critImmunity" }, extra).entries.length === 0) return { roll, cancelled: false };

  return { roll: { ...roll, isCritical: false, criticalEffect: undefined }, cancelled: true };
}
```

`lib/utils/battle/attack/process/run.ts`: замінити

```ts
  const attackRoll = adjacentCrit ? { ...rolled, isCritical: true } : rolled;

  if (adjacentCrit) flow.messages.push("💥 влучання впритул — критичне");
```

на

```ts
  const critRoll = adjacentCrit ? { ...rolled, isCritical: true } : rolled;

  if (adjacentCrit) flow.messages.push("💥 влучання впритул — критичне");

  const immune = isHit ? cancelCritIfImmune(critRoll, flow.ps, targetId, actionModifiers[targetId]) : { roll: critRoll, cancelled: false };

  const attackRoll = immune.roll;

  if (immune.cancelled) flow.messages.push("🛡 крит скасовано — звичайне влучання");
```

(імпорт `cancelCritIfImmune`).

- [ ] **Step 7: atLeast** — `lib/utils/abilities/schema/effects.ts`, `ModifyStatSchema`: поле `atLeast: z.number().int().min(1).max(30).optional(),`; `.refine(hasValue, …)` → `.refine((e) => hasValue(e) || e.atLeast !== undefined, { message: "Потрібен flat, percent або atLeast" }).refine((e) => e.atLeast === undefined || ((ABILITY_KEYS as readonly string[]).includes(e.stat) && e.flat === undefined && e.percent === undefined), { message: "atLeast — лише для характеристик і без flat/percent", path: ["atLeast"] })`. `lib/utils/abilities/build/bake.ts`: у `bakeOne`, гілка `default` — `const score = e.atLeast !== undefined ? Math.max(p.abilities[stat], e.atLeast) : p.abilities[stat] + flat;`; `bakePassives`:

```ts
export function bakePassives(p: BattleParticipant): BattleParticipant {
  return bakedEffects(p)
    .filter((x) => x.target === "self")
    .sort((a, b) => Number(a.effect.atLeast !== undefined) - Number(b.effect.atLeast !== undefined))
    .reduce((acc, { effect }) => bakeOne(acc, effect, p), p);
}
```

`lib/utils/abilities/registry/effects/static.ts`: у `modifyStatFields` після `...VALUE_FIELDS,` — `{ name: "atLeast", label: "Не менше (значення характеристики)", input: "number", optional: true, visibleWhen: (e) => (ABILITY_KEYS as readonly string[]).includes(String(e.stat)) },` (імпорт `ABILITY_KEYS` з `@/lib/constants/abilities`); `describeModifyStat` — першим рядком `if (e.atLeast !== undefined) return \`${STAT_LABELS[e.stat]} не менше ${e.atLeast}\`;`.

- [ ] **Step 8: Run tests to verify they pass**

Run: `pnpm test:run lib/utils/battle lib/utils/abilities components/abilities`
Expected: PASS (наявні тести атаки, критів, запікання, реєстрів — без змін; знімки `__snapshots__` не змінюються, бо в HOMM-атаках `damageBonus` немає, а `attackSourceId` в повідомлення не потрапляє).

- [ ] **Step 9: Type check and commit**

`pnpm exec tsc --noEmit -p tsconfig.json` → 0 errors.

```bash
git add lib/utils/battle lib/utils/abilities components/abilities/ConditionEditor.tsx types/abilities.ts
git commit -m "feat(constructor): 4f-3 engine: weapon damageBonus, withThisItem, critImmunity, atLeast

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 11: Лист і ДМ-правка зарядів

**Files:**
- Modify: `types/characters.ts` (`SheetArtifact`, `CharacterSheet.items`, `ResourcesEditBody`), `lib/utils/characters/sheet/build-sheet.ts`, `app/api/campaigns/[id]/characters/[characterId]/sheet/sheet-handler.ts`, `lib/schemas/out-of-combat.ts`, `lib/utils/characters/resources/edit.ts`, `app/api/campaigns/[id]/characters/[characterId]/resources/resources-handler.ts`, `components/character-profile/rest/ResourcesDialog.tsx`
- Test: `lib/utils/characters/resources/__tests__/edit-charges.test.ts`, `app/api/campaigns/[id]/characters/[characterId]/resources/__tests__/resources-charges.test.ts`, `components/character-profile/rest/__tests__/charges-dialog.test.tsx`

**Interfaces:**
- Consumes: `attunedRefs`, `heldRefs`, `pruneAttuned`, `attunementRequired` (задача 4); `ITEM_POOL_PREFIX` (задача 6); `AbilityPool` (задача 8).
- Produces:
  - `SheetArtifact` += `attunement?: "attuned" | "required"`, `carried?: true`; `CharacterSheet.items.attunement?: { used: number; limit: number }`; `SheetInput.attunement?: { used: number; limit: number } | null`.
  - `ResourcesEditBody.charges?: Record<string, number>`; `resourcesEditSchema.charges`; `editResources(r, patch, maxHp?, pools?: Record<string, AbilityPool>)`.

- [ ] **Step 1: Write the failing tests**

`lib/utils/characters/resources/__tests__/edit-charges.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { editResources } from "@/lib/utils/characters/resources/edit";

const pools = { "pool:item:wand": { label: "Wand", max: 7, rest: "long" as const }, "pool:item:ring": { label: "Ring", max: 3, rest: null } };

describe("editResources: item charges", () => {
  it("sets used with the pool rest, clamps to max, 0 removes, unknown keys ignored", () => {
    expect(editResources({}, { charges: { "pool:item:wand": 2 } }, undefined, pools).charges).toEqual({ "pool:item:wand": { used: 2, rest: "long" } });
    expect(editResources({}, { charges: { "pool:item:ring": 9 } }, undefined, pools).charges).toEqual({ "pool:item:ring": { used: 3, rest: null } });
    expect(editResources({ charges: { "pool:item:wand": { used: 2, rest: "long" } } }, { charges: { "pool:item:wand": 0 } }, undefined, pools)).toEqual({});
    expect(editResources({}, { charges: { "pool:item:gone": 1 } }, undefined, pools)).toEqual({});
  });
});
```

`app/api/campaigns/[id]/characters/[characterId]/resources/__tests__/resources-charges.test.ts`:

```ts
import { NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import * as access from "@/lib/server/characters/access";
import * as participant from "@/lib/server/characters/participant";
import { DEFAULT_RULES } from "@/lib/utils/rules/defaults";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/server/characters/access", () => ({ requireCharacterAccess: vi.fn() }));
vi.mock("@/lib/server/characters/participant", () => ({
  buildCharacterParticipant: vi.fn(async () => ({ participant: { combatStats: { maxHp: 30 }, battleData: { pools: { "pool:item:wand": { label: "Wand", max: 7, rest: "long" } } } } })),
}));
vi.mock("@/lib/db", () => {
  const prisma = { character: { update: vi.fn() }, characterLog: { createMany: vi.fn() }, battleParticipant: { findFirst: vi.fn(async () => null) }, $queryRaw: vi.fn(async () => []), $transaction: vi.fn() };

  prisma.$transaction.mockImplementation(async (fn: (tx: unknown) => unknown) => fn(prisma));

  return { prisma };
});

const patch = async (body: object) => {
  const { PATCH } = await import("../route");

  return PATCH(new Request("http://x", { method: "PATCH", body: JSON.stringify(body) }), { params: Promise.resolve({ id: "camp", characterId: "ch" }) }) as Promise<NextResponse>;
};

describe("PATCH resources: item charges", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(access.requireCharacterAccess).mockResolvedValue({
      access: { userId: "dm", isDM: true, campaign: { id: "camp", maxLevel: 20, rules: { ...DEFAULT_RULES, outOfCombat: { ...DEFAULT_RULES.outOfCombat, persistResources: true } } } },
      character: { id: "ch", campaignId: "camp", resources: {} },
    } as never);
  });

  it("DM sets spent charges of a known item pool", async () => {
    const res = await patch({ charges: { "pool:item:wand": 1 } });

    expect(await res.json()).toEqual({ resources: { charges: { "pool:item:wand": { used: 1, rest: "long" } } } });
    expect(participant.buildCharacterParticipant).toHaveBeenCalledTimes(1);
  });
});
```

`components/character-profile/rest/__tests__/charges-dialog.test.tsx`:

```tsx
// @vitest-environment happy-dom
import { cleanup, fireEvent, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { sheetFixture } from "../../__tests__/sheet-fixture";
import { ProfileProvider } from "../../ProfileContext";
import { ResourcesDialog } from "../ResourcesDialog";

import { mockMatchMedia } from "@/components/ui/__tests__/match-media";
import { renderWithConfirm } from "@/components/ui/__tests__/render-with-confirm";
import type { SheetRest } from "@/types/characters";

const h = vi.hoisted(() => ({ edit: { mutateOk: vi.fn(async () => true), isPending: false } }));

vi.mock("@/lib/hooks/characters", async (orig) => ({ ...(await orig<object>()), useEditResources: () => h.edit }));

const rest: SheetRest = {
  persist: true,
  hp: { current: 10, max: 20, temp: 0 },
  dead: false,
  exhaustion: 0,
  shortRestOpen: false,
  hitDice: [],
  charges: [
    { key: "pool:item:wand", name: "Wand of Magic Missiles", uses: 7, used: 2, rest: "long" },
    { key: "artifact:x:rage", name: "Rage", uses: 3, used: 1, rest: "long" },
  ],
  inspiration: null,
  xp: null,
};

afterEach(cleanup);

describe("ResourcesDialog: item charges", () => {
  it("lists only item pools and sends changed spent charges", () => {
    mockMatchMedia(false);
    renderWithConfirm(
      <ProfileProvider campaignId="c" characterId="ch" sheet={{ ...sheetFixture, rest }} canEdit={false}>
        <ResourcesDialog rest={rest} open onOpenChange={vi.fn()} />
      </ProfileProvider>,
    );

    expect(screen.queryByLabelText("Rage: витрачено")).toBeNull();

    const input = screen.getByLabelText("Wand of Magic Missiles: витрачено");

    fireEvent.change(input, { target: { value: "0" } });
    fireEvent.submit(input.closest("form")!);

    expect(h.edit.mutateOk).toHaveBeenCalledWith({ hp: 10, tempHp: 0, exhaustion: 0, charges: { "pool:item:wand": 0 } });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm test:run lib/utils/characters/resources/__tests__/edit-charges.test.ts "app/api/campaigns/[id]/characters/[characterId]/resources/__tests__/resources-charges.test.ts" components/character-profile/rest/__tests__/charges-dialog.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Edit charges** — `types/characters.ts`: `export type ResourcesEditBody = { hp?: number; tempHp?: number; exhaustion?: number; dead?: boolean; reset?: true; charges?: Record<string, number> };`. `lib/schemas/out-of-combat.ts`, у `resourcesEditSchema` після `reset` — `charges: z.record(z.string().min(1).max(300), z.number().int().min(0).max(999)).optional(),`. `lib/utils/characters/resources/edit.ts`:

```ts
export function editResources(r: CharacterResources, patch: ResourcesEditBody, maxHp?: number, pools: Record<string, AbilityPool> = {}): CharacterResources {
```

перед `return compactResources(next);`:

```ts
  if (patch.charges) {
    const charges = { ...next.charges };

    for (const [key, used] of Object.entries(patch.charges)) {
      const pool = pools[key];

      if (!pool) continue;

      const n = Math.min(pool.max, Math.max(0, used));

      if (n === 0) delete charges[key];
      else charges[key] = { used: n, rest: pool.rest };
    }

    next = { ...next, charges };
  }
```

(`import type { AbilityPool } from "@/types/battle";`). `resources-handler.ts`:

```ts
  const built = body.hp !== undefined || body.charges !== undefined ? (await buildCharacterParticipant(character, { maxLevel, rules })).participant : null;

  const maxHp = body.hp === undefined ? undefined : built?.combatStats.maxHp;
```

і `editResources(before, body, maxHp, built?.battleData?.pools ?? {})`.

- [ ] **Step 4: Sheet data** — `types/characters.ts`: `SheetArtifact` += `attunement?: "attuned" | "required"; carried?: true;`; `CharacterSheet.items: { grid: …; artifacts: SheetArtifact[]; sets: SetProgress[]; attunement?: { used: number; limit: number } }`. `lib/utils/characters/sheet/build-sheet.ts`: `SheetInput` += `attunement?: { used: number; limit: number } | null;`; `items: { grid, artifacts: input.artifacts, sets: p.battleData.artifactSets ?? [], ...(input.attunement && { attunement: input.attunement }) }`. `sheet-handler.ts`:

```ts
  const itemsOn = campaign.rules.items.enabled;

  const attuned = attunedRefs(character.inventory);

  const raw = context.artifactsById ?? {};

  const artifacts: SheetArtifact[] = rows.map(({ row, slot, carried }) => ({
    id: row.id,
    name: row.name,
    icon: row.icon,
    slot,
    rarity: row.rarity,
    description: row.description,
    effects: abilitySummary("artifact", row),
    ...(itemsOn && attunementRequired(row.id, raw) && { attunement: attuned.includes(row.id) ? ("attuned" as const) : ("required" as const) }),
    ...(carried && { carried }),
  }));
```

і в `buildCharacterSheet({ … })` — `attunement: itemsOn ? { used: pruneAttuned(attuned, character.inventory ?? {}).length, limit: campaign.rules.items.attunementLimit } : null,`. Імпорти `attunedRefs`, `attunementRequired`, `pruneAttuned` (`@/lib/utils/items/resolve`).

- [ ] **Step 5: DM dialog** — (`ChargesList` уже показує «не відновлюються» — задача 8.) `components/character-profile/rest/ResourcesDialog.tsx`: імпорт `ITEM_POOL_PREFIX` з `@/lib/utils/items/pools`; стан

```tsx
  const itemCharges = rest.charges.filter((c) => c.key.startsWith(ITEM_POOL_PREFIX));

  const [spent, setSpent] = useState<Record<string, string>>(() => Object.fromEntries(itemCharges.map((c) => [c.key, String(c.used)])));

  const changedCharges = Object.fromEntries(itemCharges.flatMap((c) => (spent[c.key] !== undefined && spent[c.key].trim() !== "" && Number(spent[c.key]) !== c.used ? [[c.key, Number(spent[c.key])]] : [])));
```

`save` → `filled && send({ hp: Number(hp), tempHp: Number(temp), exhaustion: Number(exhaustion), ...(Object.keys(changedCharges).length > 0 && { charges: changedCharges }) })`; у формі після трьох полів:

```tsx
        {itemCharges.map((c) => (
          <div key={c.key} className="col-span-3 grid grid-cols-[1fr_6rem] items-center gap-2">
            <Label htmlFor={`res-charge-${c.key}`}>{c.name} (з {c.uses})</Label>
            <Input id={`res-charge-${c.key}`} aria-label={`${c.name}: витрачено`} type="number" min={0} max={c.uses} value={spent[c.key] ?? ""} onChange={(e) => setSpent((s) => ({ ...s, [c.key]: e.target.value }))} />
          </div>
        ))}
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `pnpm test:run lib/utils/characters "app/api/campaigns/[id]/characters" components/character-profile lib/__tests__/client-entry-imports.test.ts`
Expected: PASS (наявний `resources.test.ts` — «without hp the participant is not built» лишається зеленим).

- [ ] **Step 7: Type check and commit**

`pnpm exec tsc --noEmit -p tsconfig.json` → 0 errors.

```bash
git add types/characters.ts lib/utils/characters lib/schemas/out-of-combat.ts "app/api/campaigns/[id]/characters/[characterId]" components/character-profile/rest
git commit -m "feat(constructor): 4f-3 sheet attunement data and DM item charges edit

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---
### Task 12: UI — блок «Предмет» у формі артефакта, «+N до шкоди», заряди в редакторі вмінь, значки бібліотеки

**Files:**
- Create: `components/artifacts/ArtifactItemFields.tsx`
- Modify: `lib/utils/artifacts/artifact-form.ts`, `lib/hooks/artifacts/useArtifactForm.ts`, `components/artifacts/artifact-form-tabs.ts`, `components/artifacts/ArtifactForm.tsx`, `components/artifacts/ArtifactWeaponFields.tsx`, `components/artifacts/ArtifactEditForm.tsx`, `app/campaigns/[id]/dm/artifacts/[artifactId]/page.tsx`, `types/artifacts.ts` (`ArtifactData`, `ArtifactCardData`), `components/abilities/{AbilityListEditor,editor-context}.tsx`, `components/abilities/sections/LimitsSection.tsx`, `lib/server/artifacts/read-artifacts-list.ts`, `components/artifacts/ArtifactCard.tsx`
- Test: `lib/utils/artifacts/__tests__/artifact-form-item.test.ts`, `components/artifacts/__tests__/ArtifactItemFields.test.tsx`, `components/abilities/__tests__/item-charges-limits.test.tsx`

**Interfaces:**
- Consumes: `ItemStats`, `PROPERTY_SLOTS` (задача 2); `matchesAppliesTo`, `composedName` (задача 3); `itemStatsRecords`, `itemStatsFromRow` (задача 2); `ITEM_CHARGES_KEY` (задача 6); `validateAbilities(…, { itemCharges })` (задача 8).
- Produces:
  - `ArtifactFormState.item?: ItemStats | null` (undefined — не чіпали, null — прибрати в PATCH); `ArtifactFormSubmitPayload.item?: ItemStats | null`; `ArtifactFormInitial.item?: ItemStats | null`; `ArtifactData.item?: ItemStats | null`; `ArtifactCardData.itemKind?: "property" | "gear"`.
  - `ArtifactItemFields({ campaignId, name, slot, value, onChange, itemsEnabled })`; вкладка `ARTIFACT_FORM_TAB.item = "item"` («Предмет»).
  - `ArtifactWeaponFields({ value, onChange, bonusOnly? })` — поле «+N до шкоди» (`damageBonus`); `bonusOnly` показує лише «Бонус атаки» і «+N до шкоди» (для властивості).
  - `AbilityListEditor` prop `itemCharges?: boolean`; `AbilityEditorContextValue.itemCharges?: boolean`; у `LimitsSection` для кнопкових умінь — «Витрачає заряди предмета» (`limits.pool = { key: "charges", cost }`).

- [ ] **Step 1: Write the failing tests**

`lib/utils/artifacts/__tests__/artifact-form-item.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { buildArtifactPayload } from "@/lib/utils/artifacts/artifact-form";

const state = (over: object) => ({ name: "Flame Tongue", description: "", rarity: "rare", slot: "weapon", icon: "", setId: null, abilities: [], weapon: { damageDice: "1d8", attackBonus: 1, damageBonus: 1 }, ...over });

describe("buildArtifactPayload: item", () => {
  it("untouched item → no key; set → item; edit clear → null", () => {
    expect(buildArtifactPayload(state({}), "create")).not.toHaveProperty("item");
    expect(buildArtifactPayload(state({ item: { unique: false } }), "create").item).toEqual({ unique: false });
    expect(buildArtifactPayload(state({ item: null }), "edit").item).toBeNull();
    expect(buildArtifactPayload(state({ item: null }), "create")).not.toHaveProperty("item");
  });

  it("a property sends only +N weapon bonuses and drops the armor model", () => {
    const property = { property: { appliesTo: { kinds: ["weapon" as const] } } };

    expect(buildArtifactPayload(state({ item: property }), "create").weapon).toEqual({ attackBonus: 1, damageBonus: 1 });
    expect(buildArtifactPayload(state({ slot: "armor", armor: { category: "light", base: 11 }, item: { property: { appliesTo: { kinds: ["armor" as const] } } } }), "edit").armor).toBeNull();
  });
});
```

`components/artifacts/__tests__/ArtifactItemFields.test.tsx`:

```tsx
// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { weaponStatsColumns } from "@/lib/utils/artifacts/weapon-stats";
import { itemStatsColumns } from "@/lib/utils/items/item-stats";

const library = [
  { id: "ls", name: "Longsword", slot: "weapon", modifiers: [...weaponStatsColumns({ damageDice: "1d8" }).modifiers, ...itemStatsColumns({ unique: false }).modifiers] },
  { id: "gs", name: "Greatsword", slot: "weapon", modifiers: [...weaponStatsColumns({ damageDice: "2d6" }).modifiers, ...itemStatsColumns({ unique: false }).modifiers] },
  { id: "rg", name: "Ring", slot: "ring", modifiers: [] },
];

vi.mock("@/lib/hooks/artifacts", () => ({ useArtifactsList: () => ({ data: library }) }));

import { ArtifactItemFields } from "../ArtifactItemFields";

afterEach(cleanup);

describe("ArtifactItemFields", () => {
  it("gear and property toggles", () => {
    const onChange = vi.fn();

    render(<ArtifactItemFields campaignId="c" name="Flame Tongue" slot="weapon" value={undefined} onChange={onChange} itemsEnabled={false} />);

    fireEvent.click(screen.getByRole("switch", { name: "Звичайне спорядження (неунікальне)" }));
    expect(onChange).toHaveBeenLastCalledWith({ unique: false });

    fireEvent.click(screen.getByRole("switch", { name: "Властивість (видається разом із базою)" }));
    expect(onChange).toHaveBeenLastCalledWith({ property: { appliesTo: { kinds: ["weapon"] } } });

    expect(screen.queryByRole("switch", { name: "Потребує налаштування" })).toBeNull();
  });

  it("property: base chips from the library and the name preview on the first matching base", () => {
    const onChange = vi.fn();

    render(<ArtifactItemFields campaignId="c" name="Flame Tongue" slot="weapon" value={{ property: { appliesTo: { kinds: ["weapon"] }, nameTemplate: "Flame Tongue {base}" } }} onChange={onChange} itemsEnabled />);

    expect(screen.getByText("Прев'ю: Flame Tongue Longsword")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Ring" })).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Greatsword" }));
    expect(onChange).toHaveBeenLastCalledWith({ property: { appliesTo: { kinds: ["weapon"], bases: ["Greatsword"] }, nameTemplate: "Flame Tongue {base}" } });
  });

  it("items enabled: attunement, charges with rest, consumable", () => {
    const onChange = vi.fn();

    render(<ArtifactItemFields campaignId="c" name="Wand" slot="item" value={{ unique: false }} onChange={onChange} itemsEnabled />);

    fireEvent.click(screen.getByRole("switch", { name: "Потребує налаштування" }));
    expect(onChange).toHaveBeenLastCalledWith({ unique: false, attunement: true });

    fireEvent.change(screen.getByLabelText("Заряди"), { target: { value: "7" } });
    expect(onChange).toHaveBeenLastCalledWith({ unique: false, charges: { max: 7, rest: "long" } });

    expect(screen.queryByRole("switch", { name: "Властивість (видається разом із базою)" })).toBeNull();
  });
});
```

`components/abilities/__tests__/item-charges-limits.test.tsx`:

```tsx
// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AbilityEditorProvider } from "../editor-context";
import { LimitsSection } from "../sections/LimitsSection";

afterEach(cleanup);

const ability = { id: "a", name: "Expend", trigger: { event: "action" as const }, effects: [{ kind: "note" as const, text: "x" }] };

describe("LimitsSection: item charges", () => {
  it("an item with charges offers «spend item charges»", () => {
    const onChange = vi.fn();

    render(
      <AbilityEditorProvider value={{ campaignId: "c", errorsByPath: {}, itemCharges: true }}>
        <LimitsSection ability={ability} path="0" onChange={onChange} />
      </AbilityEditorProvider>,
    );

    fireEvent.click(screen.getByRole("checkbox", { name: "Витрачає заряди предмета" }));

    expect(onChange).toHaveBeenLastCalledWith({ ...ability, limits: { pool: { key: "charges", cost: 1 } } });
  });

  it("without item charges the control is absent", () => {
    render(
      <AbilityEditorProvider value={{ campaignId: "c", errorsByPath: {} }}>
        <LimitsSection ability={ability} path="0" onChange={vi.fn()} />
      </AbilityEditorProvider>,
    );

    expect(screen.queryByRole("checkbox", { name: "Витрачає заряди предмета" })).toBeNull();
  });
});
```

(якщо `AbilitySectionProps` вимагає інших полів — подивитися `components/abilities/AbilityPanel.tsx` і передати їх так само, як `components/abilities/__tests__/class-scale-fields.test.tsx`.)

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm test:run lib/utils/artifacts/__tests__/artifact-form-item.test.ts components/artifacts/__tests__/ArtifactItemFields.test.tsx components/abilities/__tests__/item-charges-limits.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Form state** — `lib/utils/artifacts/artifact-form.ts`: `import type { ItemStats } from "@/lib/utils/items/item-stats";`; `ArtifactFormState` і `ArtifactFormSubmitPayload` += `item?: ItemStats | null;`; у `buildArtifactPayload`:

```ts
  const property = !!s.item?.property;

  const bonusOnly = (w: WeaponStats): WeaponStats => ({ ...(w.attackBonus !== undefined && { attackBonus: w.attackBonus }), ...(w.damageBonus !== undefined && { damageBonus: w.damageBonus }) });

  return {
    …наявні поля…,
    ...(isWeaponSlot(s.slot) && { weapon: property ? bonusOnly(s.weapon) : s.weapon }),
    ...(s.slot === ArtifactSlot.ARMOR && (property ? mode === "edit" && { armor: null } : s.armor ? { armor: s.armor } : mode === "edit" && { armor: null })),
    ...(s.item ? { item: s.item } : s.item === null && mode === "edit" && { item: null }),
  };
```

`lib/hooks/artifacts/useArtifactForm.ts`: `initial` тип += `item?: ItemStats | null`; `useState<ArtifactFormState>({ ...initial, weapon: initial.weapon ?? {}, armor: initial.armor ?? null })` — `item` іде з `initial` як є. `types/artifacts.ts`: `ArtifactData.item?: ItemStats | null;` і `ArtifactCardData.itemKind?: "property" | "gear";`. `app/campaigns/[id]/dm/artifacts/[artifactId]/page.tsx`: імпорт `itemStatsFromRow` (`@/lib/utils/items/item-row`), у `artifact={{ … }}` — `item: itemStatsFromRow(artifact),`. `components/artifacts/ArtifactEditForm.tsx`: у `initial` — `item: artifact.item ?? undefined,`. `components/artifacts/ArtifactForm.tsx`: `ArtifactFormInitial` += `item?: ItemStats | null;`.

- [ ] **Step 4: Weapon fields** — `components/artifacts/ArtifactWeaponFields.tsx`: `type NumberKey = "attackBonus" | "damageBonus" | "minTargets" | "maxTargets";`; `NUMBER_RANGE.damageBonus = { min: -20, max: 20 }`; у `NUMBER_FIELDS` після «Бонус атаки» — `{ key: "damageBonus", label: "+N до шкоди" }`; сигнатура `({ value, onChange, bonusOnly = false }: { value: WeaponStats; onChange: (next: WeaponStats) => void; bonusOnly?: boolean })`; при `bonusOnly` рендерити лише сітку числових полів, відфільтровану до `attackBonus`/`damageBonus` (без текстових полів, типу атаки й властивостей), заголовок секції «Бонуси властивості».

- [ ] **Step 5: Item block** — `components/artifacts/ArtifactItemFields.tsx`:

```tsx
"use client";

import { HUD_SELECT_CLASS, HudSection } from "@/components/hud/form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ArtifactSlot, PROPERTY_SLOTS } from "@/lib/constants/artifacts";
import { useArtifactsList } from "@/lib/hooks/artifacts";
import { composedName, type ItemRowLike, matchesAppliesTo } from "@/lib/utils/items/compose";
import { itemStatsRecords } from "@/lib/utils/items/item-row";
import type { ItemKind, ItemStats } from "@/lib/utils/items/item-stats";

type Property = NonNullable<ItemStats["property"]>;

type AppliesTo = Property["appliesTo"];

const KINDS: Array<{ value: ItemKind; label: string }> = [
  { value: "weapon", label: "Зброя" },
  { value: "armor", label: "Броня" },
  { value: "shield", label: "Щит" },
];

const CATEGORIES = [
  { value: "light", label: "Легка" },
  { value: "medium", label: "Середня" },
  { value: "heavy", label: "Важка" },
] as const;

const REST_OPTIONS = [
  { value: "long", label: "Довгий відпочинок" },
  { value: "short", label: "Короткий відпочинок" },
  { value: "none", label: "Не відновлюються" },
];

const defaultKind = (slot: string): ItemKind => (slot === ArtifactSlot.ARMOR ? "armor" : slot === ArtifactSlot.SHIELD ? "shield" : "weapon");

const toggled = <T,>(list: readonly T[] | undefined, v: T): T[] => (list?.includes(v) ? list.filter((x) => x !== v) : [...(list ?? []), v]);

function SwitchRow({ id, label, checked, disabled, onChange }: { id: string; label: string; checked: boolean; disabled?: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center gap-3">
      <Switch id={id} checked={checked} disabled={disabled} onCheckedChange={onChange} />
      <Label htmlFor={id}>{label}</Label>
    </div>
  );
}

function PropertyFields({ campaignId, name, property, onChange }: { campaignId: string; name: string; property: Property; onChange: (next: Property) => void }) {
  const library = (useArtifactsList(campaignId).data ?? []) as ItemRowLike[];

  const applies = property.appliesTo;

  const probe = (appliesTo: AppliesTo): ItemRowLike => ({ id: "probe", name, slot: ArtifactSlot.WEAPON, modifiers: itemStatsRecords({ property: { ...property, appliesTo } }) });

  const { bases: _bases, ...withoutBases } = applies;

  const candidates = library.filter((a) => matchesAppliesTo(a, probe(withoutBases)));

  const first = library.find((a) => matchesAppliesTo(a, probe(applies)));

  const setApplies = (patch: Partial<AppliesTo>) => {
    const next = { ...applies, ...patch } as AppliesTo;

    for (const k of Object.keys(patch) as (keyof AppliesTo)[]) if (patch[k] === undefined || (Array.isArray(patch[k]) && (patch[k] as unknown[]).length === 0)) delete next[k];

    if (next.kinds.length === 0) next.kinds = applies.kinds;

    onChange({ ...property, appliesTo: next });
  };

  return (
    <div className="space-y-3 rounded-md border border-hud-line p-3">
      <div className="space-y-1">
        <span className="text-xs text-muted-foreground">Застосовується до</span>
        <div className="flex flex-wrap gap-1">
          {KINDS.map((k) => (
            <Button key={k.value} type="button" size="sm" variant={applies.kinds.includes(k.value) ? "default" : "outline"} aria-pressed={applies.kinds.includes(k.value)} onClick={() => setApplies({ kinds: toggled(applies.kinds, k.value) })}>
              {k.label}
            </Button>
          ))}
        </div>
      </div>
      {applies.kinds.includes("weapon") && (
        <div className="space-y-1">
          <Label htmlFor="item-attack-type" className="text-xs text-muted-foreground">Тип атаки</Label>
          <select id="item-attack-type" className={`${HUD_SELECT_CLASS} w-full`} value={applies.attackType ?? ""} onChange={(e) => setApplies({ attackType: (e.target.value || undefined) as AppliesTo["attackType"] })}>
            <option value="">будь-яка</option>
            <option value="melee">ближня</option>
            <option value="ranged">дальня</option>
          </select>
        </div>
      )}
      {applies.kinds.includes("armor") && (
        <div className="flex flex-wrap gap-1">
          {CATEGORIES.map((c) => (
            <Button key={c.value} type="button" size="sm" variant={applies.armorCategories?.includes(c.value) ? "default" : "outline"} aria-pressed={!!applies.armorCategories?.includes(c.value)} onClick={() => setApplies({ armorCategories: toggled(applies.armorCategories, c.value) })}>
              {c.label}
            </Button>
          ))}
        </div>
      )}
      <div className="space-y-1">
        <span className="text-xs text-muted-foreground">Лише бази (порожньо — усі підхожі)</span>
        <div className="flex flex-wrap gap-1">
          {candidates.map((a) => (
            <Button key={a.id} type="button" size="sm" variant={applies.bases?.includes(a.name) ? "default" : "outline"} aria-pressed={!!applies.bases?.includes(a.name)} onClick={() => setApplies({ bases: toggled(applies.bases, a.name) })}>
              {a.name}
            </Button>
          ))}
        </div>
      </div>
      <div className="space-y-1">
        <Label htmlFor="item-name-template" className="text-xs text-muted-foreground">Шаблон назви ({"{base}"} — назва бази)</Label>
        <Input id="item-name-template" maxLength={100} placeholder="{name} ({base})" value={property.nameTemplate ?? ""} onChange={(e) => onChange({ ...property, ...(e.target.value.trim() ? { nameTemplate: e.target.value } : { nameTemplate: undefined }) })} />
        {first && <p className="text-xs text-hud-muted">Прев&apos;ю: {composedName(first, { name }, property.nameTemplate)}</p>}
      </div>
    </div>
  );
}

export function ArtifactItemFields({ campaignId, name, slot, value, onChange, itemsEnabled }: { campaignId: string; name: string; slot: string; value: ItemStats | null | undefined; onChange: (next: ItemStats | null) => void; itemsEnabled: boolean }) {
  const stats: ItemStats = value ?? {};

  const set = (patch: Partial<ItemStats>) => {
    const next = { ...stats, ...patch } as ItemStats;

    for (const k of Object.keys(patch) as (keyof ItemStats)[]) if (patch[k] === undefined) delete next[k];

    onChange(Object.keys(next).length > 0 ? next : null);
  };

  const charges = stats.charges;

  return (
    <HudSection title="Предмет" className="space-y-3">
      <SwitchRow id="item-gear" label="Звичайне спорядження (неунікальне)" checked={stats.unique === false} onChange={(v) => set({ unique: v ? false : undefined })} />
      {PROPERTY_SLOTS.has(slot) && (
        <SwitchRow id="item-property" label="Властивість (видається разом із базою)" checked={!!stats.property} onChange={(v) => set({ property: v ? { appliesTo: { kinds: [defaultKind(slot)] } } : undefined, ...(v && { consumable: undefined }) })} />
      )}
      {stats.property && <PropertyFields campaignId={campaignId} name={name} property={stats.property} onChange={(property) => set({ property })} />}
      {itemsEnabled && (
        <>
          <SwitchRow id="item-attunement" label="Потребує налаштування" checked={!!stats.attunement} onChange={(v) => set({ attunement: v || undefined })} />
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="item-charges" className="text-xs text-muted-foreground">Заряди</Label>
              <Input id="item-charges" type="number" min={1} max={50} value={charges?.max ?? ""} onChange={(e) => {
                const n = e.target.value === "" ? undefined : Math.min(50, Math.max(1, Math.trunc(Number(e.target.value))));

                set({ charges: n ? { max: n, rest: charges ? charges.rest : stats.consumable ? null : "long" } : undefined });
              }} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="item-charges-rest" className="text-xs text-muted-foreground">Відновлення</Label>
              <select id="item-charges-rest" className={`${HUD_SELECT_CLASS} w-full`} disabled={!charges || !!stats.consumable} value={charges ? (charges.rest ?? "none") : "long"} onChange={(e) => charges && set({ charges: { max: charges.max, rest: e.target.value === "none" ? null : (e.target.value as "short" | "long") } })}>
                {REST_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
          </div>
          <SwitchRow id="item-consumable" label="Витратний (видається кількістю)" checked={!!stats.consumable} disabled={!!stats.property} onChange={(v) => set({ consumable: v || undefined, ...(v && charges && { charges: { max: charges.max, rest: null } }) })} />
        </>
      )}
    </HudSection>
  );
}
```

- [ ] **Step 6: Form wiring** — `components/artifacts/artifact-form-tabs.ts`: `{ basic: "basic", weapon: "weapon", armor: "armor", item: "item", abilities: "abilities" }`. `components/artifacts/ArtifactForm.tsx`: `const itemsEnabled = !!useCampaignRules(campaignId).data?.items?.enabled;` (той самий виклик хука, що й для класів — один `const rules = useCampaignRules(campaignId).data;`, далі `rules?.classes.enabled` і `rules?.items?.enabled`); `hasArmor = classesEnabled && data.slot === ArtifactSlot.ARMOR && !data.item?.property`; вкладка зброї: `content: <ArtifactWeaponFields value={data.weapon} onChange={(w) => set("weapon", w)} bonusOnly={!!data.item?.property} />`; після вкладки броні — `{ id: ARTIFACT_FORM_TAB.item, label: "Предмет", content: <ArtifactItemFields campaignId={campaignId} name={data.name} slot={data.slot} value={data.item} onChange={(item) => set("item", item)} itemsEnabled={itemsEnabled} /> }`; `AbilityListEditor` — `itemCharges={!!data.item?.charges || !!data.item?.consumable}`.

- [ ] **Step 7: Ability editor** — `components/abilities/editor-context.tsx`: `itemCharges?: boolean;` в `AbilityEditorContextValue`. `components/abilities/AbilityListEditor.tsx`: prop `itemCharges?: boolean`; `validateAbilities(value, { classColumns, itemCharges })` (і в `deps` `useMemo`); провайдер — `value={{ campaignId, errorsByPath: validation.errorsByPath, classColumns, itemCharges }}`. `components/abilities/sections/LimitsSection.tsx`: `const { classColumns: columns, itemCharges } = useAbilityEditor();` і після блоку пулу класу:

```tsx
        {itemCharges && !columns && isButton && (
          <div className="col-span-3 space-y-1">
            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              <input type="checkbox" aria-label="Витрачає заряди предмета" checked={ability.limits?.pool?.key === ITEM_CHARGES_KEY} onChange={(e) => set("pool", e.target.checked ? { key: ITEM_CHARGES_KEY, cost: ability.limits?.pool?.cost ?? 1 } : undefined)} />
              Витрачає заряди предмета
            </label>
            {ability.limits?.pool?.key === ITEM_CHARGES_KEY && (
              <input aria-label="Зарядів за раз" type="number" min={1} max={20} className="h-9 w-16 rounded-md border border-hud-line bg-hud-field px-2 text-sm" value={ability.limits.pool.cost} onChange={(e) => set("pool", { key: ITEM_CHARGES_KEY, cost: Math.max(1, Number(e.target.value) || 1) })} />
            )}
          </div>
        )}
```

(імпорт `ITEM_CHARGES_KEY` з `@/lib/utils/items/pools`).

- [ ] **Step 8: Library badges** — `lib/server/artifacts/read-artifacts-list.ts`: імпорт `itemStatsFromRow`; у мапі — `...(() => { const s = itemStatsFromRow(row); return s?.property ? { itemKind: "property" as const } : s?.unique === false ? { itemKind: "gear" as const } : {}; })(),` (або допоміжна функція `itemKindBadge(row)` над `readArtifactsList`). `components/artifacts/ArtifactCard.tsx`: поруч із бейджем рідкості — `{artifact.itemKind && <Badge variant="outline" className="text-xs">{artifact.itemKind === "property" ? "Властивість" : "Спорядження"}</Badge>}`.

- [ ] **Step 9: Run tests to verify they pass**

Run: `pnpm test:run lib/utils/artifacts components/artifacts components/abilities lib/server/artifacts lib/__tests__/client-entry-imports.test.ts`
Expected: PASS (наявні `ArtifactForm.test.tsx`, `ArtifactArmorFields.test.tsx`, `weapon-traits-fields.test.tsx`, `class-scale-fields.test.tsx` — без змін).

- [ ] **Step 10: Type check and commit**

`pnpm exec tsc --noEmit -p tsconfig.json` → 0 errors.

```bash
git add components/artifacts lib/utils/artifacts lib/hooks/artifacts "app/campaigns/[id]/dm/artifacts" types/artifacts.ts components/abilities lib/server/artifacts/read-artifacts-list.ts
git commit -m "feat(constructor): 4f-3 artifact form item block, damage bonus field, item charges in the ability editor

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 13: UI — видача з кроком «База» й кількістю витратного

**Files:**
- Modify: `components/character-profile/stash/GrantArtifactDialog.tsx`
- Test: `components/character-profile/stash/__tests__/grant-dialog-items.test.tsx`

**Interfaces:**
- Consumes: `FreeArtifact.{property,consumable,gear}` (задача 6); `composedName` (задача 3); дія `grant { artifactId, baseId?, quantity? }` (задача 5).
- Produces: діалог має три стани: список → для властивості крок «База» (пошук, прев'ю складеної назви й рідкості) → видача; для витратного — поле «Кількість» (1–99) і кнопка «Видати»; решта — видача одним кліком (як зараз).

- [ ] **Step 1: Write the failing test**

`components/character-profile/stash/__tests__/grant-dialog-items.test.tsx`:

```tsx
// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { mockMatchMedia } from "@/components/ui/__tests__/match-media";

const h = vi.hoisted(() => ({ mutateAsync: vi.fn(async () => ({})) }));

vi.mock("@/components/hud/fonts", () => ({ hudFontClassName: "" }));
vi.mock("../../ProfileContext", () => ({ useProfile: () => ({ campaignId: "c", characterId: "h" }) }));
vi.mock("@/lib/hooks/characters", () => ({
  useStashAction: () => ({ mutateAsync: h.mutateAsync, isPending: false }),
  useFreeArtifacts: () => ({
    isLoading: false,
    data: [
      { id: "ls", name: "Longsword", icon: null, rarity: "common", slot: "weapon", gear: true },
      { id: "gs", name: "Greatsword", icon: null, rarity: "common", slot: "weapon", gear: true },
      { id: "ft", name: "Flame Tongue", icon: null, rarity: "rare", slot: "weapon", property: { nameTemplate: "Flame Tongue {base}", bases: ["ls", "gs"] } },
      { id: "pot", name: "Potion of Healing", icon: null, rarity: "common", slot: "item", consumable: true },
    ],
  }),
}));
vi.mock("@/lib/hooks/common", () => ({ useNotify: () => vi.fn() }));

import { GrantArtifactDialog } from "../GrantArtifactDialog";

afterEach(() => {
  cleanup();
  h.mutateAsync.mockClear();
});

const open = () => {
  mockMatchMedia(false);
  render(<GrantArtifactDialog open onOpenChange={vi.fn()} />);
};

describe("GrantArtifactDialog: magic items", () => {
  it("a property asks for a base, previews the composed name and grants with baseId", async () => {
    open();

    fireEvent.click(screen.getByRole("button", { name: /Flame Tongue/ }));

    expect(screen.getByText("База для «Flame Tongue»")).toBeTruthy();

    fireEvent.change(screen.getByLabelText("Пошук бази"), { target: { value: "great" } });

    expect(screen.queryByRole("button", { name: /^Longsword/ })).toBeNull();
    expect(screen.getByText("Flame Tongue Greatsword · Рідкісний")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: /^Greatsword/ }));

    await vi.waitFor(() => expect(h.mutateAsync).toHaveBeenCalledWith({ action: "grant", artifactId: "ft", baseId: "gs" }));
  });

  it("a consumable asks for a quantity", async () => {
    open();

    fireEvent.click(screen.getByRole("button", { name: /Potion of Healing/ }));
    fireEvent.change(screen.getByLabelText("Кількість"), { target: { value: "3" } });
    fireEvent.click(screen.getByRole("button", { name: "Видати" }));

    await vi.waitFor(() => expect(h.mutateAsync).toHaveBeenCalledWith({ action: "grant", artifactId: "pot", quantity: 3 }));
  });

  it("plain gear is granted in one click", async () => {
    open();

    fireEvent.click(screen.getByRole("button", { name: /^Longsword/ }));

    await vi.waitFor(() => expect(h.mutateAsync).toHaveBeenCalledWith({ action: "grant", artifactId: "ls" }));
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test:run components/character-profile/stash/__tests__/grant-dialog-items.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Dialog** — `components/character-profile/stash/GrantArtifactDialog.tsx` (заміна тіла):

```tsx
"use client";

import { useState } from "react";

import { useProfile } from "../ProfileContext";

import { EntityIcon } from "@/components/common/EntityIcon";
import { EmptyState } from "@/components/common/states";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import { artifactRarityLabel, artifactSlotLabel } from "@/lib/constants/artifacts";
import { useFreeArtifacts, useStashAction } from "@/lib/hooks/characters";
import { useNotify } from "@/lib/hooks/common";
import { composedName } from "@/lib/utils/items/compose";
import type { FreeArtifact } from "@/types/inventory";

interface GrantArtifactDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ROW = "flex min-h-11 w-full items-center gap-3 border-b border-[#2a2218] py-2 text-left disabled:opacity-50";

function ArtifactRow({ a, subtitle, disabled, onClick }: { a: FreeArtifact; subtitle: string; disabled: boolean; onClick: () => void }) {
  return (
    <li>
      <button type="button" disabled={disabled} onClick={onClick} className={ROW}>
        <EntityIcon src={a.icon} name={a.name} size={36} className="hud-sc size-9 rounded-md border border-hud-line bg-transparent text-inherit" />
        <span className="min-w-0">
          <span className="block truncate text-sm text-hud-ink">{a.name}</span>
          <span className="block text-xs text-hud-muted">{subtitle}</span>
        </span>
      </button>
    </li>
  );
}

export function GrantArtifactDialog({ open, onOpenChange }: GrantArtifactDialogProps) {
  const { campaignId, characterId } = useProfile();

  const action = useStashAction(campaignId, characterId);

  const free = useFreeArtifacts(campaignId, characterId, open);

  const artifacts = free.data ?? [];

  const notify = useNotify();

  const [picked, setPicked] = useState<FreeArtifact | null>(null);

  const [query, setQuery] = useState("");

  const [quantity, setQuantity] = useState("1");

  const close = (o: boolean) => {
    if (!o) {
      setPicked(null);
      setQuery("");
      setQuantity("1");
    }

    onOpenChange(o);
  };

  const grant = (body: { artifactId: string; baseId?: string; quantity?: number }) =>
    action.mutateAsync({ action: "grant", ...body }).then(
      () => close(false),
      (e: Error) => notify(e.message || "Не вдалося видати артефакт"),
    );

  const pick = (a: FreeArtifact) => (a.property || a.consumable ? setPicked(a) : void grant({ artifactId: a.id }));

  const subtitle = (a: FreeArtifact) => [artifactSlotLabel(a.slot), a.property ? "властивість" : a.consumable ? "витратний" : a.gear ? "спорядження" : null].filter(Boolean).join(" · ");

  const bases = picked?.property ? artifacts.filter((b) => picked.property?.bases.includes(b.id) && b.name.toLowerCase().includes(query.trim().toLowerCase())) : [];

  const qty = Math.min(99, Math.max(1, Math.trunc(Number(quantity)) || 1));

  return (
    <ResponsiveDialog hud open={open} onOpenChange={close} title={picked?.property ? `База для «${picked.name}»` : "Видати артефакт"}>
      {free.isLoading ? (
        <p className="text-sm text-hud-muted">Завантаження…</p>
      ) : picked?.property ? (
        <div className="space-y-2">
          <Label htmlFor="grant-base-search" className="sr-only">Пошук бази</Label>
          <Input id="grant-base-search" aria-label="Пошук бази" placeholder="Пошук бази" value={query} onChange={(e) => setQuery(e.target.value)} />
          {bases.length === 0 ? (
            <EmptyState title="Немає підхожих вільних баз" />
          ) : (
            <ul>
              {bases.map((b) => (
                <ArtifactRow key={b.id} a={b} subtitle={`${composedName(b, picked, picked.property?.nameTemplate)} · ${artifactRarityLabel(picked.rarity ?? "")}`} disabled={action.isPending} onClick={() => void grant({ artifactId: picked.id, baseId: b.id })} />
              ))}
            </ul>
          )}
          <Button type="button" variant="ghost" size="sm" onClick={() => setPicked(null)}>Назад</Button>
        </div>
      ) : picked?.consumable ? (
        <div className="space-y-2">
          <p className="text-sm text-hud-ink">{picked.name}</p>
          <Label htmlFor="grant-quantity">Кількість</Label>
          <Input id="grant-quantity" type="number" min={1} max={99} value={quantity} onChange={(e) => setQuantity(e.target.value)} />
          <div className="flex gap-2">
            <Button type="button" disabled={action.isPending} onClick={() => void grant({ artifactId: picked.id, quantity: qty })}>Видати</Button>
            <Button type="button" variant="ghost" onClick={() => setPicked(null)}>Назад</Button>
          </div>
        </div>
      ) : artifacts.length === 0 ? (
        <EmptyState title="Немає вільних артефактів" />
      ) : (
        <ul>
          {artifacts.map((a) => (
            <ArtifactRow key={a.id} a={a} subtitle={subtitle(a)} disabled={action.isPending} onClick={() => pick(a)} />
          ))}
        </ul>
      )}
    </ResponsiveDialog>
  );
}
```

(прев'ю в рядку бази — `«Flame Tongue Greatsword · Рідкісний»`: `artifactRarityLabel("rare")` = «Рідкісний».)

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm test:run components/character-profile lib/__tests__/client-entry-imports.test.ts`
Expected: PASS (діалог лишається поза entry-чанком профілю або без zod — `compose.ts` zod-free).

- [ ] **Step 5: Type check and commit**

`pnpm exec tsc --noEmit -p tsconfig.json` → 0 errors.

```bash
git add components/character-profile/stash/GrantArtifactDialog.tsx components/character-profile/stash/__tests__/grant-dialog-items.test.tsx
git commit -m "feat(constructor): 4f-3 grant dialog with a base step and consumable quantity

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 14: UI — налаштування, носіння й заряди в сховищі й на листі; довідник; «Що нового»

**Files:**
- Modify: `components/character-profile/stash/StashArtifactsPanel.tsx`, `components/character-profile/ItemsTab.tsx`, `components/campaigns/info/ArtifactReferenceCard.tsx`, `lib/onboarding/whats-new.ts`
- Test: `components/character-profile/stash/__tests__/stash-attunement.test.tsx`, `components/character-profile/__tests__/items-tab-attunement.test.tsx`

**Interfaces:**
- Consumes: `StashView.attunement`, `StashArtifact.{attunement,carried,charges,gear}` (задача 6); `SheetArtifact.{attunement,carried}`, `CharacterSheet.items.attunement` (задача 11); дії `attune`/`unattune` (задача 5).
- Produces: кнопки «Налаштувати» / «Зняти налаштування», лічильник «Налаштування N/M», позначки «Налаштовано», «Не діє без налаштування», «Носиться», «Заряди left/max»; для носимого предмета на листі немає «Зняти в підсумок», передача — за ref; у довіднику неунікальний — «спорядження»; запис «Що нового» `2026-10-23-magic-items`.

- [ ] **Step 1: Write the failing tests**

`components/character-profile/stash/__tests__/stash-attunement.test.tsx`:

```tsx
// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/components/hud/fonts", () => ({ hudFontClassName: "" }));

const h = vi.hoisted(() => ({ mutateAsync: vi.fn(async () => ({})) }));

vi.mock("../../ProfileContext", () => ({ useProfile: () => ({ campaignId: "c", characterId: "h" }) }));
vi.mock("../../TransferArtifactDialog", () => ({ TransferArtifactDialog: () => null }));
vi.mock("../GrantArtifactDialog", () => ({ GrantArtifactDialog: () => null }));
vi.mock("@/lib/hooks/campaigns", () => ({ useCampaignRules: () => ({ data: { classes: { enabled: true } } }) }));
vi.mock("@/lib/hooks/characters", () => ({ useStashAction: () => ({ mutateAsync: h.mutateAsync, isPending: false }) }));
vi.mock("@/lib/hooks/common", () => ({ useConfirm: () => vi.fn(), useNotify: () => vi.fn() }));

import { StashArtifactsPanel } from "../StashArtifactsPanel";

import type { StashArtifact, StashView } from "@/types/inventory";

const art = (id: string, over: Partial<StashArtifact> = {}): StashArtifact => ({ id, name: id, icon: null, rarity: null, slot: "ring", description: null, ...over });

const view = (artifacts: StashArtifact[], attunement?: StashView["attunement"]): StashView => ({ purse: { gp: 0, sp: 0, cp: 0 }, items: [], artifacts, ...(attunement && { attunement }) });

afterEach(cleanup);

describe("StashArtifactsPanel: attunement and charges", () => {
  it("counter, badges and the attune action", async () => {
    render(<StashArtifactsPanel view={view([art("ring", { attunement: "required", carried: true, charges: { max: 3, left: 2, rest: null } }), art("ls+ft", { name: "Flame Tongue Longsword", slot: "weapon", attunement: "attuned" })], { used: 1, limit: 3 })} canAct isDM={false} />);

    expect(screen.getByText("Налаштування 1/3")).toBeTruthy();
    expect(screen.getByText("Носиться")).toBeTruthy();
    expect(screen.getByText("Не діє без налаштування")).toBeTruthy();
    expect(screen.getByText("Заряди 2/3")).toBeTruthy();
    expect(screen.getByText("Налаштовано")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Налаштувати" }));
    await vi.waitFor(() => expect(h.mutateAsync).toHaveBeenCalledWith({ action: "attune", ref: "ring" }));

    fireEvent.click(screen.getByRole("button", { name: "Зняти налаштування" }));
    await vi.waitFor(() => expect(h.mutateAsync).toHaveBeenCalledWith({ action: "unattune", ref: "ls+ft" }));
  });

  it("HOMM view without attunement data shows none of it", () => {
    render(<StashArtifactsPanel view={view([art("helm", { slot: "helmet" })])} canAct isDM={false} />);

    expect(screen.queryByText(/Налаштування/)).toBeNull();
    expect(screen.queryByRole("button", { name: "Налаштувати" })).toBeNull();
  });
});
```

`components/character-profile/__tests__/items-tab-attunement.test.tsx`:

```tsx
// @vitest-environment happy-dom
import { cleanup, fireEvent, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ItemsTab } from "../ItemsTab";
import { ProfileProvider } from "../ProfileContext";
import { sheetFixture } from "./sheet-fixture";

import { mockMatchMedia } from "@/components/ui/__tests__/match-media";
import { renderWithConfirm } from "@/components/ui/__tests__/render-with-confirm";
import type { CharacterSheet } from "@/types/characters";

const h = vi.hoisted(() => ({ mutateAsync: vi.fn(async () => ({})) }));

vi.mock("@/lib/hooks/characters", async (orig) => ({ ...(await orig<object>()), useStashAction: () => ({ mutateAsync: h.mutateAsync, isPending: false }) }));
vi.mock("../TransferArtifactDialog", () => ({ TransferArtifactDialog: () => null }));

const sheet: CharacterSheet = {
  ...sheetFixture,
  viewer: { isDM: false, isOwner: true },
  items: {
    grid: { weapon: { id: "ls+ft", name: "Flame Tongue Longsword", icon: null, slot: "weapon", rarity: "rare", description: null, effects: [], attunement: "required" } },
    artifacts: [
      { id: "ls+ft", name: "Flame Tongue Longsword", icon: null, slot: "weapon", rarity: "rare", description: null, effects: [], attunement: "required" },
      { id: "ring", name: "Ring of Protection", icon: null, slot: "ring", rarity: "rare", description: null, effects: [], attunement: "attuned", carried: true },
    ],
    sets: [],
    attunement: { used: 1, limit: 3 },
  },
};

afterEach(cleanup);

describe("ItemsTab: attunement", () => {
  it("counter, badges, attune from the dialog; carried items cannot be unequipped", async () => {
    mockMatchMedia(false);
    renderWithConfirm(
      <ProfileProvider campaignId="c" characterId="ch" sheet={sheet} canEdit={false}>
        <ItemsTab />
      </ProfileProvider>,
    );

    expect(screen.getByText("Налаштування 1/3")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Зброя: Flame Tongue Longsword" }));
    fireEvent.click(screen.getByRole("button", { name: "Налаштувати" }));
    await vi.waitFor(() => expect(h.mutateAsync).toHaveBeenCalledWith({ action: "attune", ref: "ls+ft" }));

    cleanup();
    renderWithConfirm(
      <ProfileProvider campaignId="c" characterId="ch" sheet={sheet} canEdit={false}>
        <ItemsTab />
      </ProfileProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: /Ring of Protection/ }));

    expect(screen.getAllByText("Носиться").length).toBeGreaterThan(0);
    expect(screen.queryByRole("button", { name: "Зняти в підсумок" })).toBeNull();
    expect(screen.getByRole("button", { name: "Зняти налаштування" })).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm test:run components/character-profile/stash/__tests__/stash-attunement.test.tsx components/character-profile/__tests__/items-tab-attunement.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Stash panel** — `components/character-profile/stash/StashArtifactsPanel.tsx`:
  - лічильник одним текстовим вузлом під заголовком секції (перед списком): `{view.attunement && <p className="mb-2 text-xs text-hud-muted">{`Налаштування ${view.attunement.used}/${view.attunement.limit}`}</p>}`.
  - під назвою предмета — позначки:

```tsx
                  {(a.carried || a.attunement || a.charges) && (
                    <span className="mt-0.5 flex flex-wrap gap-x-2 text-[11px] text-hud-muted">
                      {a.carried && <span>Носиться</span>}
                      {a.attunement === "attuned" && <span>Налаштовано</span>}
                      {a.attunement === "required" && <span>Не діє без налаштування</span>}
                      {a.charges && <span>{`Заряди ${a.charges.left}/${a.charges.max}`}</span>}
                    </span>
                  )}
```

  - кнопки (у блоці `canAct`, перед «Передати»):

```tsx
                  {a.attunement === "required" && <Button size="sm" variant="outline" disabled={action.isPending} onClick={() => void run({ action: "attune", ref: a.id })}>Налаштувати</Button>}
                  {a.attunement === "attuned" && <Button size="sm" variant="outline" disabled={action.isPending} onClick={() => void run({ action: "unattune", ref: a.id })}>Зняти налаштування</Button>}
```

- [ ] **Step 4: Items tab** — `components/character-profile/ItemsTab.tsx`:
  - над списком «ЩО ДАЮТЬ РЕЧІ»: `{sheet.items.attunement && <p className="text-xs text-hud-muted">{\`Налаштування ${sheet.items.attunement.used}/${sheet.items.attunement.limit}\`}</p>}`;
  - у рядку списку під ефектами — ті самі позначки (`carried` → «Носиться», `attunement` → «Налаштовано» / «Не діє без налаштування»);
  - у діалозі: під описом — позначки для `shown`; у `footer`:

```tsx
            {canAct && shown && !shown.carried && (
              <Button variant="outline" disabled={stash.isPending} onClick={() => void unequip(shown.slot)}>
                Зняти в підсумок
              </Button>
            )}
            {canAct && shown?.attunement && (
              <Button variant="outline" disabled={stash.isPending} onClick={() => void attune(shown)}>
                {shown.attunement === "attuned" ? "Зняти налаштування" : "Налаштувати"}
              </Button>
            )}
```

  де `const attune = (a: SheetArtifact) => stash.mutateAsync(a.attunement === "attuned" ? { action: "unattune", ref: a.id } : { action: "attune", ref: a.id }).then(() => setOpen(false), (e: Error) => notify(e.message || "Не вдалося змінити налаштування"));`;
  - передача: `source={shown?.carried ? { artifactId: shown.id } : { slot: shown?.slot ?? "" }}`.

- [ ] **Step 5: Reference card and «what's new»** — `components/campaigns/info/ArtifactReferenceCard.tsx`: `{artifact.gear ? "спорядження" : artifact.holderName ? \`у ${artifact.holderName}\` : "вільний"}`. `lib/onboarding/whats-new.ts` — першим елементом масиву:

```ts
  { id: "2026-10-23-magic-items", date: "2026-10-23", audience: "dm", title: "Магічні предмети 5e", body: "Властивості («Flame Tongue», «Weapon +1») видаються разом із базою, звичайне спорядження неунікальне, налаштування, заряди з відновленням на відпочинку й витратні зілля в бою. Шаблон SRD 5.2 — 32 властивості й 248 предметів." },
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `pnpm test:run components/character-profile components/campaigns lib/onboarding lib/__tests__/client-entry-imports.test.ts`
Expected: PASS (наявний `stash-off-hand.test.tsx` — без змін; профіль без zod).

- [ ] **Step 7: Type check and commit**

`pnpm exec tsc --noEmit -p tsconfig.json` → 0 errors.

```bash
git add components/character-profile components/campaigns/info/ArtifactReferenceCard.tsx lib/onboarding/whats-new.ts
git commit -m "feat(constructor): 4f-3 attunement, carried items and charges in the stash and sheet

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---
### Task 15: Конвертер — джерело `MagicItem`, звичайне спорядження неунікальне, 32 властивості

**Files:**
- Modify: `scripts/srd/lib/source.ts`, `scripts/srd/lib/open5e.ts`, `scripts/srd/lib/types.ts`, `scripts/srd/convert/artifacts.ts`, `scripts/srd/lib/build-data.ts`, `scripts/srd/build.ts`
- Create: `scripts/srd/convert/magic-items.ts`, `scripts/srd/overrides/magic-items.ts`, `scripts/srd/__tests__/fixtures-4f3/MagicItem.json`, `scripts/srd/__tests__/fixtures-4f3/Item.json`
- Modify (дозволена правка наявного тесту): `scripts/srd/__tests__/preset.test.ts` — лише `toHaveLength(17)` → `toHaveLength(18)`
- Test: `scripts/srd/__tests__/magic-properties.test.ts`

**Interfaces:**
- Consumes: `ItemStats` (задача 2); `matchesAppliesTo`, `composedName` (задача 3); `itemStatsColumns` (задача 2).
- Produces:
  - `OPEN5E_FILES.MagicItem = "bb43403c17dea6aebed685d3626fdf14"`; `O5MagicItem { name; desc; category; rarity; requires_attunement; weapon: string | null; armor: string | null }`; `Open5eData.magicItems: Fixture<O5MagicItem>[]` (відсутній файл у каталозі фікстур → `[]`); `FIXTURE_4F3_DIR`.
  - `ArtifactRow.rarity: "common" | "uncommon" | "rare" | "epic" | "legendary"`; `ArtifactRow.slot` += `"ring" | "amulet" | "boots" | "cloak" | "helmet" | "item"`; `ArtifactRow.item?: ItemStats`; `ArtifactRow.weapon` може містити `damageBonus`.
  - Звичайне спорядження (38 зброї, 12 обладунків, щит) — `item: { unique: false }`.
  - `scripts/srd/convert/magic-items.ts`: `RARITY`, `EXPEND_CHARGE: Ability`, `familyTemplate(variantName, baseName): string | null`, `normalizeItemName(s): string`, `chargesOf(desc): ItemStats["charges"] | null`, `mechanize(desc, ctx: { weapon: boolean }): { abilities: Ability[]; weapon?: { attackBonus: number; damageBonus: number } }`, `magicVariants(data, gear): MagicVariant[]`, `convertMagicProperties(data, gear): ArtifactRow[]` (кидає помилку з переліком, якщо назва варіанта не складається або сімейство невідоме).
  - `scripts/srd/overrides/magic-items.ts`: `FAMILY_NAMES: Record<string, string>` (31 ключ `<kind>:<template>`), `PROPERTY_OVERRIDES: Record<string, { abilities?: Ability[]; dropAbilities?: string[]; overrides?: NonNullable<ItemStats["property"]>["overrides"] }>` (Berserker, Mithral Armor, Defender), `DRAGON_SLAYER_PK = "srd-2024_dragon-slayer"`, `DROPPED_GENERIC = ["srd-2024_defender", "srd-2024_holy-avenger"]`.

- [ ] **Step 1: Source and fixtures** — `scripts/srd/lib/source.ts`: в `OPEN5E_FILES` після `Item` — `MagicItem: "bb43403c17dea6aebed685d3626fdf14",`. `scripts/srd/lib/open5e.ts`:

```ts
export interface O5MagicItem { name: string; desc: string; category: string; rarity: string; requires_attunement: boolean; weapon: string | null; armor: string | null }
```

`Open5eData` += `magicItems: Fixture<O5MagicItem>[];`; `OPEN5E_FILE_OF` += `magicItems: "MagicItem",`; `export const FIXTURE_4F3_DIR = path.join(process.cwd(), "scripts", "srd", "__tests__", "fixtures-4f3");`; `loadOpen5e`:

```ts
// MagicItem arrived in 4f-3: the 4f-1/4f-2 fixture dirs do not carry it
const OPTIONAL_FILES = new Set<Open5eFile>(["MagicItem"]);

export function loadOpen5e(dir: string): Open5eData {
  const read = (file: Open5eFile) => {
    const full = path.join(dir, `${file}.json`);

    return OPTIONAL_FILES.has(file) && !fs.existsSync(full) ? [] : (JSON.parse(fs.readFileSync(full, "utf8")) as unknown);
  };

  return Object.fromEntries(Object.entries(OPEN5E_FILE_OF).map(([key, file]) => [key, read(file)])) as unknown as Open5eData;
}
```

Фікстури (з каталогу джерела, md5 перевірено):

```bash
mkdir -p scripts/srd/__tests__/fixtures-4f3
python3 - <<'PY'
import json
SRC = "/Users/silentfox/.claude/jobs/4ad97a0b/tmp/srd"
PKS = ["srd-2024_longsword-plus-2", "srd-2024_greatsword-plus-2", "srd-2024_breastplate-plus-1", "srd-2024_shield-plus-1", "srd-2024_flame-tongue-longsword", "srd-2024_frost-brand-longsword", "srd-2024_longsword-of-wounding", "srd-2024_vicious-longsword", "srd-2024_berserker-greataxe", "srd-2024_mithral-armor-plate", "srd-2024_adamantine-armor-plate", "srd-2024_armor-of-resistance-padded", "srd-2024_dwarven-plate", "srd-2024_defender-longsword", "srd-2024_defender", "srd-2024_dragon-slayer", "srd-2024_sun-blade", "srd-2024_wand-of-magic-missiles", "srd-2024_ring-of-protection", "srd-2024_amulet-of-health", "srd-2024_belt-of-giant-strength-fire", "srd-2024_bracers-of-defense", "srd-2024_dragon-orb", "srd-2024_ammunition-plus-one", "srd-2024_potion-of-climbing", "srd-2024_staff-of-power", "srd-2024_boots-of-elvenkind", "srd-2024_cloak-of-protection"]
rows = [r for r in json.load(open(f"{SRC}/MagicItem.json")) if r["pk"] in PKS]
assert len(rows) == len(PKS), len(rows)
json.dump(rows, open("scripts/srd/__tests__/fixtures-4f3/MagicItem.json", "w"), indent=2, ensure_ascii=False)
items = [r for r in json.load(open(f"{SRC}/Item.json")) if r["pk"] == "srd-2024_potions-of-healing"]
assert len(items) == 1
json.dump(items, open("scripts/srd/__tests__/fixtures-4f3/Item.json", "w"), indent=2, ensure_ascii=False)
PY
```

(додати кінцевий перевід рядка в обидва файли, як у наявних фікстурах: `printf '\n' >> …`).

- [ ] **Step 2: Write the failing test** — `scripts/srd/__tests__/magic-properties.test.ts`:

```ts
import * as fs from "fs";
import * as path from "path";
import { describe, expect, it } from "vitest";

import { convertArtifacts } from "../convert/artifacts";
import { chargesOf, convertMagicProperties, familyTemplate, normalizeItemName } from "../convert/magic-items";
import { readSrdData } from "../lib/data-files";
import { FIXTURE_4F2_DIR, FIXTURE_4F3_DIR, loadOpen5e } from "../lib/open5e";

import { createArtifactSchema } from "@/lib/schemas/artifacts";
import { armorStatsColumns } from "@/lib/utils/artifacts/armor-stats";
import { weaponStatsColumns } from "@/lib/utils/artifacts/weapon-stats";
import { composeItemRow, matchesAppliesTo } from "@/lib/utils/items/compose";
import { itemStatsColumns } from "@/lib/utils/items/item-stats";
import type { ArtifactRow } from "../lib/types";

const fixture = (file: string) => JSON.parse(fs.readFileSync(path.join(FIXTURE_4F3_DIR, `${file}.json`), "utf8"));

const gear = readSrdData().artifacts.filter((a) => a.rarity === "common");

const data = { ...loadOpen5e(FIXTURE_4F2_DIR), magicItems: fixture("MagicItem"), items: fixture("Item") };

const props = convertMagicProperties(data, gear);

const prop = (name: string) => props.find((p) => p.name === name)!;

// the same shape the importer writes, so the shared compose/match code sees what the app will see
const asRow = (r: ArtifactRow) => ({ id: r.slug, name: r.name, slot: r.slot, bonuses: r.weapon?.attackBonus ? { attackBonus: r.weapon.attackBonus } : {}, modifiers: [...(r.weapon ? weaponStatsColumns(r.weapon).modifiers : []), ...(r.armor ? armorStatsColumns(r.armor).modifiers : []), ...(r.item ? itemStatsColumns(r.item).modifiers : [])], abilities: r.abilities ?? [] });

const base = (name: string) => asRow(gear.find((g) => g.name === name)!);

describe("magic item properties", () => {
  it("helpers: family templates, normalized names, charges", () => {
    expect(familyTemplate("Flame Tongue Longsword", "Longsword")).toBe("Flame Tongue {base}");
    expect(familyTemplate("Armor of Resistance (Padded)", "Padded Armor")).toBe("Armor of Resistance ({base})");
    expect(familyTemplate("Dwarven Plate", "Plate Armor")).toBe("Dwarven {base}");
    expect(familyTemplate("Wand of Web", "Longsword")).toBeNull();
    expect(normalizeItemName("Armor of Resistance (Padded Armor)")).toBe(normalizeItemName("Armor of Resistance (Padded)"));
    expect(chargesOf("This wand has 7 charges. … The wand regains 1d6 + 1 expended charges daily at dawn.")).toEqual({ max: 7, rest: "long" });
    expect(chargesOf("The weapon has 1d8 + 1 charges.")).toEqual({ max: 9, rest: null });
    expect(chargesOf("No charges here.")).toBeNull();
  });

  it("13 fixture families incl. Dragon Slayer; generic Defender row dropped; every row passes the schema", () => {
    expect(props.map((p) => p.name).sort()).toEqual(["Adamantine Armor", "Armor +1", "Armor of Resistance", "Berserker", "Defender", "Dragon Slayer", "Dwarven Plate", "Flame Tongue", "Frost Brand", "Mithral Armor", "Vicious", "Weapon +2", "Wounding"]);

    for (const row of props) {
      const { slug: _slug, ...body } = row;

      expect(createArtifactSchema.safeParse(body).success, row.name).toBe(true);
      expect(row.item?.unique, row.name).toBe(false);
    }
  });

  it("Flame Tongue Longsword: composes from Longsword with a 2d6 fire rider bound to the item", () => {
    const ft = prop("Flame Tongue");

    expect(ft).toMatchObject({ slot: "weapon", rarity: "rare", item: { attunement: true, property: { nameTemplate: "Flame Tongue {base}", appliesTo: { kinds: ["weapon"], bases: ["Longsword"] } } } });
    expect(matchesAppliesTo(base("Longsword"), asRow(ft))).toBe(true);

    const row = composeItemRow(base("Longsword"), asRow(ft));

    expect(row.name).toBe("Flame Tongue Longsword");
    expect(row.abilities).toContainEqual(expect.objectContaining({ id: "p-rider", trigger: { event: "hit", role: "attacker" }, condition: { type: "withThisItem" }, effects: [{ kind: "dealDamage", amount: "2d6", damageType: "fire", target: "eventTarget" }] }));
  });

  it("Longsword (+2): +2 attack and damage; Breastplate (+1): +1 AC on top; Shield (+1) too", () => {
    expect(prop("Weapon +2").weapon).toEqual({ attackBonus: 2, damageBonus: 2 });

    const longsword = composeItemRow(base("Longsword"), asRow(prop("Weapon +2")));

    expect(longsword).toMatchObject({ name: "Longsword (+2)", bonuses: { attackBonus: 2 } });
    expect(longsword.modifiers).toContainEqual({ type: "damageBonus", value: "2" });
    expect(prop("Armor +1").abilities).toEqual([expect.objectContaining({ trigger: { event: "passive" }, effects: [{ kind: "modifyStat", stat: "armor", flat: 1 }] })]);
    expect(prop("Armor +1").item?.property?.appliesTo.kinds.sort()).toEqual(["armor", "shield"]);
    expect(composeItemRow(base("Breastplate"), asRow(prop("Armor +1"))).name).toBe("Breastplate (+1)");
  });

  it("Mithral Plate drops strength and stealth; Adamantine grants crit immunity; Frost Brand resists fire; Berserker adds HP per level", () => {
    const mithral = composeItemRow(base("Plate Armor"), asRow(prop("Mithral Armor")));

    expect((mithral.modifiers as Array<{ type: string }>).map((m) => m.type)).not.toContain("armorStrength");
    expect((mithral.modifiers as Array<{ type: string }>).map((m) => m.type)).not.toContain("armorStealth");
    expect(prop("Adamantine Armor").abilities).toContainEqual(expect.objectContaining({ effects: [{ kind: "flag", flag: "critImmunity" }] }));
    expect(prop("Frost Brand").abilities).toContainEqual(expect.objectContaining({ effects: [{ kind: "flag", flag: "resistance", damageType: "fire", percent: 50 }] }));
    expect(prop("Berserker").abilities).toContainEqual(expect.objectContaining({ effects: [{ kind: "modifyStat", stat: "maxHp", flat: { formula: "hero_level" } }] }));
    expect(prop("Defender")).toMatchObject({ weapon: { attackBonus: 3, damageBonus: 3 } });
    expect((prop("Defender").abilities ?? []).some((a) => a.id === "ac")).toBe(false);
  });

  it("Vicious rider has no damage type; Dragon Slayer is a +1 any-weapon property without the dragon-only rider", () => {
    expect(prop("Vicious").abilities).toContainEqual(expect.objectContaining({ effects: [{ kind: "dealDamage", amount: "2d6", target: "eventTarget" }] }));
    expect(prop("Dragon Slayer")).toMatchObject({ weapon: { attackBonus: 1, damageBonus: 1 }, item: { property: { appliesTo: { kinds: ["weapon"] }, nameTemplate: "Dragon Slayer ({base})" } } });
    expect(prop("Dragon Slayer").abilities ?? []).toEqual([]);
  });

  it("common gear becomes non-unique; the 4f-2 armor rows keep their models", () => {
    const rows = convertArtifacts(loadOpen5e(FIXTURE_4F2_DIR));

    expect(rows.every((r) => r.item?.unique === false)).toBe(true);
    expect(rows.find((r) => r.name === "Chain Mail")?.armor).toEqual({ category: "heavy", base: 16, strength: 13, stealthDisadvantage: true });
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `pnpm test:run scripts/srd/__tests__/magic-properties.test.ts`
Expected: FAIL — модуля `magic-items.ts` немає.

- [ ] **Step 4: Types and gear** — `scripts/srd/lib/types.ts`: імпорт `import type { ItemStats } from "@/lib/utils/items/item-stats";`;

```ts
export interface ArtifactRow {
  slug: string;
  name: string;
  description: string;
  rarity: "common" | "uncommon" | "rare" | "epic" | "legendary";
  slot: "weapon" | "range_weapon" | "shield" | "armor" | "ring" | "amulet" | "boots" | "cloak" | "helmet" | "item";
  weapon?: WeaponStats;
  armor?: ArmorStats;
  item?: ItemStats;
  abilities?: Ability[];
}
```

`scripts/srd/convert/artifacts.ts`: у `convertWeapon` повернення += `item: { unique: false }`; у `convertArmor` об'єкт += `item: { unique: false }`; у `convertShield` += `item: { unique: false }`. (Тести 4f-1/4f-2 використовують `toMatchObject`/поля — лишаються зеленими.)

- [ ] **Step 5: Overrides** — `scripts/srd/overrides/magic-items.ts`:

```ts
import type { Ability } from "@/lib/utils/abilities/schema";
import type { ItemStats } from "@/lib/utils/items/item-stats";

type PropertyOverride = { abilities?: Ability[]; dropAbilities?: string[]; overrides?: NonNullable<ItemStats["property"]>["overrides"] };

// <kind>:<template> → property name; the +N families are split by kind because SRD names them alike
export const FAMILY_NAMES: Record<string, string> = {
  "weapon:{base} (+1)": "Weapon +1",
  "weapon:{base} (+2)": "Weapon +2",
  "weapon:{base} (+3)": "Weapon +3",
  "weapon:Weapon of Warning ({base})": "Weapon of Warning",
  "weapon:Defender ({base})": "Defender",
  "weapon:Giant Slayer ({base})": "Giant Slayer",
  "weapon:Holy Avenger ({base})": "Holy Avenger",
  "weapon:Nine Lives Stealer ({base})": "Nine Lives Stealer",
  "weapon:Vicious {base}": "Vicious",
  "weapon:Flame Tongue {base}": "Flame Tongue",
  "weapon:Luck Blade ({base})": "Luck Blade",
  "weapon:Frost Brand ({base})": "Frost Brand",
  "weapon:{base} of Life Stealing": "Life Stealing",
  "weapon:{base} of Wounding": "Wounding",
  "weapon:Dancing {base}": "Dancing",
  "weapon:{base} of Sharpness": "Sharpness",
  "weapon:Vorpal {base}": "Vorpal",
  "weapon:Berserker {base}": "Berserker",
  "weapon:Hammer of Thunderbolts ({base})": "Hammer of Thunderbolts",
  "weapon:Oathbow ({base})": "Oathbow",
  "armor:{base} (+1)": "Armor +1",
  "armor:{base} (+2)": "Armor +2",
  "armor:{base} (+3)": "Armor +3",
  "armor:Armor of Vulnerability ({base})": "Armor of Vulnerability",
  "armor:Demon {base}": "Demon Armor",
  "armor:Armor of Resistance ({base})": "Armor of Resistance",
  "armor:Adamantine Armor ({base})": "Adamantine Armor",
  "armor:Mithral Armor ({base})": "Mithral Armor",
  "armor:Elven {base}": "Elven Chain",
  "armor:Dwarven {base}": "Dwarven Plate",
  "armor:{base} of Etherealness": "Armor of Etherealness",
};

export const PROPERTY_OVERRIDES: Record<string, PropertyOverride> = {
  Berserker: { abilities: [{ id: "hp-level", name: "Berserker", description: "Your Hit Point maximum increases by 1 for each level you have attained.", trigger: { event: "passive" }, effects: [{ kind: "modifyStat", stat: "maxHp", flat: { formula: "hero_level" } }] }] },
  "Mithral Armor": { overrides: { stealthDisadvantage: false, strength: null } },
  // "gain a +2 bonus to Armor Class" is an example of moving the bonus, not a passive (spec: Defender keeps +3)
  Defender: { dropAbilities: ["ac"] },
};

export const DRAGON_SLAYER_PK = "srd-2024_dragon-slayer";

export const DROPPED_GENERIC = ["srd-2024_defender", "srd-2024_holy-avenger"];
```

- [ ] **Step 6: Converter (properties)** — `scripts/srd/convert/magic-items.ts`:

```ts
import { DRAGON_SLAYER_PK, FAMILY_NAMES, PROPERTY_OVERRIDES } from "../overrides/magic-items";
import type { Fixture, O5MagicItem, Open5eData } from "../lib/open5e";
import { bySlug } from "../lib/text";
import type { ArtifactRow } from "../lib/types";

import { DND_SKILLS, type DndSkill } from "@/lib/constants/skills";
import type { Ability, Effect } from "@/lib/utils/abilities/schema";
import type { ItemKind, ItemStats } from "@/lib/utils/items/item-stats";
import { composedName } from "@/lib/utils/items/compose";

export const RARITY: Record<string, ArtifactRow["rarity"]> = { common: "common", uncommon: "uncommon", rare: "rare", "very-rare": "epic", legendary: "legendary", artifact: "legendary" };

export const EXPEND_CHARGE: Ability = {
  id: "charge",
  name: "Expend a charge",
  description: "Spends one charge; what each effect costs is in the item description.",
  trigger: { event: "action" },
  limits: { pool: { key: "charges", cost: 1 } },
  effects: [{ kind: "note", text: "Expend a charge" }],
};

const DAMAGE_TYPES = "Acid|Bludgeoning|Cold|Fire|Force|Lightning|Necrotic|Piercing|Poison|Psychic|Radiant|Slashing|Thunder";

const ABILITY_NAMES = "Strength|Dexterity|Constitution|Intelligence|Wisdom|Charisma";

// a rider that depends on the creature type, a charge, a throw or a daily use stays text
const GATED = /\b(Aberrations?|Beasts?|Celestials?|Constructs?|Dragons?|Elementals?|Fey|Fiends?|Giants?|Humanoids?|Monstrosit(?:y|ies)|Oozes?|Plants?|Undead|sworn|charges?|throw|dawn)\b/i;

const SKILL_BY_NAME: Record<string, DndSkill> = Object.fromEntries(DND_SKILLS.map((k) => [k.replace(/([A-Z])/g, " $1").toLowerCase(), k]));

const passive = (id: string, name: string, effects: Effect[], condition?: Ability["condition"]): Ability => ({ id, name, trigger: { event: "passive" }, ...(condition && { condition }), effects });

const sentences = (desc: string) => desc.replace(/\*\*_?([^*_]+)_?\*\*/g, "$1").split(/(?<=[.!?])\s+/);

export function familyTemplate(variantName: string, baseName: string): string | null {
  if (variantName.includes(baseName)) return variantName.replace(baseName, "{base}");

  const short = baseName.replace(/ Armor$/, "");

  return short !== baseName && variantName.includes(short) ? variantName.replace(short, "{base}") : null;
}

export const normalizeItemName = (s: string) => s.toLowerCase().replace(/\barmor\b/g, "").replace(/\s+/g, " ").replace(/\(\s+/g, "(").replace(/\s+\)/g, ")").trim();

export function chargesOf(desc: string): ItemStats["charges"] | null {
  const m = /(?:has|starts with) (?:(\d+)d(\d+)(?: ?\+ ?(\d+))?|(\d+)) charges/i.exec(desc);

  if (!m) return null;

  const max = m[4] ? Number(m[4]) : Number(m[1]) * Number(m[2]) + Number(m[3] ?? 0);

  const regain = /regains? [^.]*?(dawn|long rest|short rest)/i.exec(desc)?.[1]?.toLowerCase();

  return { max: Math.min(50, Math.max(1, max)), rest: regain === "short rest" ? "short" : regain ? "long" : null };
}

export function mechanize(desc: string, ctx: { weapon: boolean }): { abilities: Ability[]; weapon?: { attackBonus: number; damageBonus: number } } {
  const abilities: Ability[] = [];

  const plus = ctx.weapon ? /\+(\d) bonus to attack (?:rolls )?and damage rolls/.exec(desc)?.[1] : undefined;

  const ac = /\+(\d) bonus to (?:your )?Armor Class(?! against)/.exec(desc)?.[1];

  if (ac) abilities.push(passive("ac", "Armor Class", [{ kind: "modifyStat", stat: "armor", flat: Number(ac) }], /no armor and (?:using )?no Shield/i.test(desc) ? { type: "armorWorn", categories: ["none"], shield: "without" } : undefined));

  const saves = /\+(\d) bonus to (?:your )?(?:Armor Class(?:,| and) )?saving throws/.exec(desc)?.[1];

  if (saves) abilities.push(passive("saves", "Saving Throws", [{ kind: "modifyStat", stat: "savingThrow", flat: Number(saves) }]));

  const resist = [...new Set([...desc.matchAll(new RegExp(`(?:you have|you gain|grants? you|gives? you) Resistance to (${DAMAGE_TYPES}) damage`, "gi"))].map((m) => m[1].toLowerCase()))];

  for (const type of resist) abilities.push(passive(`resist-${type}`, `Resistance: ${type}`, [{ kind: "flag", flag: "resistance", damageType: type, percent: 50 }]));

  const score = new RegExp(`your (${ABILITY_NAMES}) (?:score )?is (\\d+)`, "i").exec(desc);

  if (score) abilities.push(passive(`score-${score[1].toLowerCase()}`, score[1], [{ kind: "modifyStat", stat: score[1].toLowerCase() as "strength", atLeast: Number(score[2]) }]));

  const skills = [...new Set([...desc.matchAll(new RegExp(`Advantage on (?:${ABILITY_NAMES}) \\(([A-Za-z ]+)\\) checks`, "g"))].flatMap((m) => SKILL_BY_NAME[m[1].toLowerCase()] ?? []))];

  if (skills.length > 0) abilities.push(passive("checks", "Advantage on checks", [{ kind: "flag", flag: "checkAdvantage", skills }]));

  if (/Advantage on saving throws against spells/i.test(desc)) abilities.push(passive("save-spells", "Advantage vs spells", [{ kind: "flag", flag: "saveAdvantage", abilities: "all", vsSpells: true }]));

  if (/Critical Hit against you becomes a normal hit/i.test(desc)) abilities.push(passive("crit-immunity", "Critical Hit immunity", [{ kind: "flag", flag: "critImmunity" }]));

  if (ctx.weapon) {
    for (const s of sentences(desc)) {
      const m = new RegExp(`extra (\\d+d\\d+)(?: (${DAMAGE_TYPES}))? damage`).exec(s);

      if (!m || GATED.test(s)) continue;

      abilities.push({ id: "rider", name: "Extra damage", trigger: { event: "hit", role: "attacker" }, condition: { type: "withThisItem" }, effects: [{ kind: "dealDamage", amount: m[1], ...(m[2] && { damageType: m[2].toLowerCase() }), target: "eventTarget" }] });

      break;
    }
  }

  return { abilities, ...(plus && { weapon: { attackBonus: Number(plus), damageBonus: Number(plus) } }) };
}

export interface MagicVariant {
  pk: string;
  name: string;
  desc: string;
  rarity: string;
  attunement: boolean;
  base: ArtifactRow;
  kind: "weapon" | "armor";
}

export function magicVariants(data: Open5eData, gear: readonly ArtifactRow[]): MagicVariant[] {
  const bySlug = new Map(gear.map((g) => [g.slug, g]));

  return data.magicItems.flatMap(({ pk, fields: f }: Fixture<O5MagicItem>) => {
    const fk = f.weapon ?? f.armor;

    const base = fk ? bySlug.get(fk) : undefined;

    return base ? [{ pk, name: f.name, desc: f.desc, rarity: f.rarity, attunement: f.requires_attunement, base, kind: f.weapon ? ("weapon" as const) : ("armor" as const) }] : [];
  });
}

const kindOf = (row: ArtifactRow): ItemKind => (row.slot === "weapon" || row.slot === "range_weapon" ? "weapon" : row.slot === "shield" ? "shield" : "armor");

const slugOf = (name: string) => `srd-2024_${name.toLowerCase().replace(/\+/g, "plus-").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`;

function appliesTo(variants: readonly MagicVariant[], gear: readonly ArtifactRow[]): NonNullable<ItemStats["property"]>["appliesTo"] {
  const kinds = [...new Set(variants.map((v) => kindOf(v.base)))].sort();

  const names = [...new Set(variants.map((v) => v.base.name))].sort();

  const covered = kinds.every((k) => gear.filter((g) => kindOf(g) === k).every((g) => names.includes(g.name)));

  return covered ? { kinds } : { kinds, bases: names };
}

function propertyRow(name: string, template: string, variants: MagicVariant[], gear: readonly ArtifactRow[]): ArtifactRow {
  const first = [...variants].sort((a, b) => a.pk.localeCompare(b.pk))[0];

  const kind = first.kind;

  const nPlus = /\(\+(\d)\)/.exec(template)?.[1];

  const mech = nPlus
    ? { abilities: kind === "armor" ? [passive("ac", "Armor Class", [{ kind: "modifyStat", stat: "armor", flat: Number(nPlus) }])] : [], ...(kind === "weapon" && { weapon: { attackBonus: Number(nPlus), damageBonus: Number(nPlus) } }) }
    : mechanize(first.desc, { weapon: kind === "weapon" });

  const charges = chargesOf(first.desc);

  const override = PROPERTY_OVERRIDES[name] ?? {};

  const attunement = variants.filter((v) => v.attunement).length * 2 > variants.length;

  const abilities = [...mech.abilities.filter((a) => !override.dropAbilities?.includes(a.id)), ...(override.abilities ?? []), ...(charges ? [EXPEND_CHARGE] : [])];

  return {
    slug: slugOf(name),
    name,
    description: first.desc,
    rarity: RARITY[first.rarity],
    slot: kind === "weapon" ? "weapon" : "armor",
    ...("weapon" in mech && mech.weapon && { weapon: mech.weapon }),
    item: {
      unique: false,
      property: { appliesTo: appliesTo(variants, gear), nameTemplate: template, ...(override.overrides && { overrides: override.overrides }) },
      ...(attunement && { attunement: true }),
      ...(charges && { charges }),
    },
    ...(abilities.length > 0 && { abilities }),
  };
}

export function convertMagicProperties(data: Open5eData, gear: readonly ArtifactRow[]): ArtifactRow[] {
  const families = new Map<string, MagicVariant[]>();

  const problems: string[] = [];

  for (const v of magicVariants(data, gear)) {
    const template = familyTemplate(v.name, v.base.name);

    const key = template && `${v.kind}:${template}`;

    if (!key || !FAMILY_NAMES[key]) {
      problems.push(`${v.name}: no family (${key ?? "no template"})`);

      continue;
    }

    if (normalizeItemName(composedName(v.base, { name: FAMILY_NAMES[key] }, template ?? undefined)) !== normalizeItemName(v.name)) problems.push(`${v.name}: composed name mismatch`);

    families.set(key, [...(families.get(key) ?? []), v]);
  }

  if (problems.length > 0) throw new Error(`magic item families:\n${problems.join("\n")}`);

  const rows = [...families].map(([key, variants]) => propertyRow(FAMILY_NAMES[key], key.slice(key.indexOf(":") + 1), variants, gear));

  const slayer = data.magicItems.find((m) => m.pk === DRAGON_SLAYER_PK);

  if (slayer) {
    const mech = mechanize(slayer.fields.desc, { weapon: true });

    rows.push({
      slug: slayer.pk,
      name: slayer.fields.name,
      description: slayer.fields.desc,
      rarity: RARITY[slayer.fields.rarity],
      slot: "weapon",
      ...(mech.weapon && { weapon: mech.weapon }),
      item: { unique: false, property: { appliesTo: { kinds: ["weapon"] }, nameTemplate: "Dragon Slayer ({base})" }, ...(slayer.fields.requires_attunement && { attunement: true }) },
      ...(mech.abilities.length > 0 && { abilities: mech.abilities }),
    });
  }

  return rows.sort(bySlug);
}
```

(`propertyRow`: для «+N»-сімейств `mech` — об'єкт з `abilities` і опційним `weapon`; TypeScript може вимагати явний тип `const mech: { abilities: Ability[]; weapon?: { attackBonus: number; damageBonus: number } } = …` — оголосити так і прибрати перевірку `"weapon" in mech`.)

- [ ] **Step 7: Build wiring** — `scripts/srd/lib/build-data.ts`: імпорт `convertMagicProperties`; `artifacts: convertArtifacts(data)` →

```ts
    artifacts: (() => {
      const gear = convertArtifacts(data);

      return [...gear, ...convertMagicProperties(data, gear)].sort(bySlug);
    })(),
```

(імпорт `bySlug` з `./text`). `scripts/srd/build.ts`: `const open5e = loadOpen5e(source); const data = buildSrdData(open5e);` і після друку лічильників — `console.info(\`  composed names verified: ${magicVariants(open5e, data.artifacts.filter((a) => a.rarity === "common")).length}\`);` (імпорт `magicVariants` з `./convert/magic-items`).

- [ ] **Step 8: Allowed edit** — `scripts/srd/__tests__/preset.test.ts`: `expect(Object.keys(OPEN5E_FILES)).toHaveLength(17);` → `toHaveLength(18)`. Більше нічого.

- [ ] **Step 9: Run tests to verify they pass**

Run: `pnpm test:run scripts/srd`
Expected: PASS, крім `data-integrity*.test.ts`, якщо вони вже читають нові дані (дані ще не перегенеровано — вони мають лишатись зеленими, бо `data/templates` не змінювались).

- [ ] **Step 10: Type check and commit**

`pnpm exec tsc --noEmit -p tsconfig.json` → 0 errors.

```bash
git add scripts/srd
git commit -m "feat(srd): 4f-3 MagicItem source, non-unique gear and 32 item properties

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---
### Task 16: Конвертер — 248 унікальних предметів (слоти, бази, заряди, витратні, зілля лікування)

**Files:**
- Modify: `scripts/srd/convert/magic-items.ts`, `scripts/srd/overrides/magic-items.ts`, `scripts/srd/lib/build-data.ts`
- Test: `scripts/srd/__tests__/magic-uniques.test.ts`

**Interfaces:**
- Consumes: `mechanize`, `chargesOf`, `RARITY`, `EXPEND_CHARGE`, `DROPPED_GENERIC`, `DRAGON_SLAYER_PK` (задача 15).
- Produces:
  - `overrides/magic-items.ts`: `UNIQUE_BASES: Record<string, { base: string; overrides?: { damageType?: string; addTraits?: WeaponTrait[] } }>` (17 pk), `BELT_STRENGTH: Record<string, number>` (5 pk), `HEALING_POTIONS: Array<{ slug: string; name: string; rarity: ArtifactRow["rarity"]; heal: string }>` (4), `CONSUMABLE_NAME_RE`, `WONDROUS_SLOTS: Array<[RegExp, ArtifactRow["slot"]]>`.
  - `convert/magic-items.ts`: `convertMagicUniques(data, gear): ArtifactRow[]`; `convertMagicItems(data, gear): ArtifactRow[]` (= властивості + унікальні, за slug).

- [ ] **Step 1: Write the failing test** — `scripts/srd/__tests__/magic-uniques.test.ts`:

```ts
import * as fs from "fs";
import * as path from "path";
import { describe, expect, it } from "vitest";

import { convertMagicItems, convertMagicUniques } from "../convert/magic-items";
import { readSrdData } from "../lib/data-files";
import { FIXTURE_4F2_DIR, FIXTURE_4F3_DIR, loadOpen5e } from "../lib/open5e";

import { createArtifactSchema } from "@/lib/schemas/artifacts";

const fixture = (file: string) => JSON.parse(fs.readFileSync(path.join(FIXTURE_4F3_DIR, `${file}.json`), "utf8"));

const gear = readSrdData().artifacts.filter((a) => a.rarity === "common");

const data = { ...loadOpen5e(FIXTURE_4F2_DIR), magicItems: fixture("MagicItem"), items: fixture("Item") };

const uniques = convertMagicUniques(data, gear);

const item = (name: string) => uniques.find((u) => u.name === name)!;

describe("unique magic items", () => {
  it("12 fixture uniques + 4 healing potions; generic duplicates and Dragon Slayer are not uniques", () => {
    expect(uniques.map((u) => u.name).sort()).toEqual([
      "Ammunition (+1)",
      "Amulet of Health",
      "Belt of Giant Strength (Fire)",
      "Boots of Elvenkind",
      "Bracers of Defense",
      "Cloak of Protection",
      "Dragon Orb",
      "Potion of Climbing",
      "Potion of Greater Healing",
      "Potion of Healing",
      "Potion of Superior Healing",
      "Potion of Supreme Healing",
      "Ring of Protection",
      "Staff of Power",
      "Sun Blade",
      "Wand of Magic Missiles",
    ]);
    expect(convertMagicItems(data, gear)).toHaveLength(13 + 16);
  });

  it("every row passes the artifact schema; all but Dragon Orb are non-unique", () => {
    for (const row of uniques) {
      const { slug: _slug, ...body } = row;

      expect(createArtifactSchema.safeParse(body).success, row.name).toBe(true);
      expect(row.item?.unique, row.name).toBe(row.name === "Dragon Orb" ? undefined : false);
    }

    expect(item("Dragon Orb").rarity).toBe("legendary");
  });

  it("Wand of Magic Missiles: item slot, 7 charges on a long rest, expend ability", () => {
    expect(item("Wand of Magic Missiles")).toMatchObject({ slot: "item", rarity: "uncommon", item: { charges: { max: 7, rest: "long" } } });
    expect(item("Wand of Magic Missiles").abilities).toContainEqual(expect.objectContaining({ id: "charge", trigger: { event: "action" }, limits: { pool: { key: "charges", cost: 1 } } }));
  });

  it("Ring of Protection: ring, attunement, AC and saves +1; Cloak of Protection: cloak slot", () => {
    expect(item("Ring of Protection")).toMatchObject({ slot: "ring", item: { attunement: true } });
    expect(item("Ring of Protection").abilities).toEqual([
      expect.objectContaining({ id: "ac", effects: [{ kind: "modifyStat", stat: "armor", flat: 1 }] }),
      expect.objectContaining({ id: "saves", effects: [{ kind: "modifyStat", stat: "savingThrow", flat: 1 }] }),
    ]);
    expect(item("Cloak of Protection").slot).toBe("cloak");
    expect(item("Boots of Elvenkind").slot).toBe("boots");
    expect(item("Boots of Elvenkind").abilities).toContainEqual(expect.objectContaining({ effects: [{ kind: "flag", flag: "checkAdvantage", skills: ["stealth"] }] }));
  });

  it("Amulet of Health: Constitution at least 19; Belt of Giant Strength (Fire): Strength at least 25", () => {
    expect(item("Amulet of Health")).toMatchObject({ slot: "amulet" });
    expect(item("Amulet of Health").abilities).toContainEqual(expect.objectContaining({ effects: [{ kind: "modifyStat", stat: "constitution", atLeast: 19 }] }));
    expect(item("Belt of Giant Strength (Fire)").abilities).toContainEqual(expect.objectContaining({ effects: [{ kind: "modifyStat", stat: "strength", atLeast: 25 }] }));
  });

  it("Bracers of Defense: +2 AC only without armor and shield", () => {
    expect(item("Bracers of Defense").abilities).toContainEqual(expect.objectContaining({ condition: { type: "armorWorn", categories: ["none"], shield: "without" }, effects: [{ kind: "modifyStat", stat: "armor", flat: 2 }] }));
  });

  it("Sun Blade: Longsword stats as radiant finesse +2; Staff of Power: Quarterstaff +2 with 20 charges", () => {
    expect(item("Sun Blade")).toMatchObject({ slot: "weapon", weapon: { damageDice: "1d8", damageType: "radiant", attackBonus: 2, damageBonus: 2 } });
    expect(item("Sun Blade").weapon?.traits).toContain("finesse");
    expect(item("Staff of Power")).toMatchObject({ slot: "weapon", weapon: { attackBonus: 2, damageBonus: 2 }, item: { attunement: true, charges: { max: 20 } } });
  });

  it("consumables: Potion of Greater Healing heals 4d4+4 as a bonus action; ammunition and other potions are consumables", () => {
    expect(item("Potion of Greater Healing")).toMatchObject({ slot: "item", rarity: "uncommon", item: { unique: false, consumable: true } });
    expect(item("Potion of Greater Healing").abilities).toEqual([expect.objectContaining({ trigger: { event: "bonusAction" }, limits: { pool: { key: "charges", cost: 1 } }, effects: [{ kind: "heal", amount: "4d4+4", target: "self" }] })]);
    expect(item("Potion of Supreme Healing")).toMatchObject({ rarity: "epic" });
    expect(item("Ammunition (+1)").item).toEqual({ unique: false, consumable: true });
    expect(item("Potion of Climbing").item).toEqual({ unique: false, consumable: true });
    expect(item("Potion of Climbing").abilities?.some((a) => a.trigger.event === "passive")).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test:run scripts/srd/__tests__/magic-uniques.test.ts`
Expected: FAIL — `convertMagicUniques` немає.

- [ ] **Step 3: Overrides** — `scripts/srd/overrides/magic-items.ts` (додати; імпорти `WeaponTrait` з `@/lib/constants/weapon-traits`, `type ArtifactRow` з `../lib/types`):

```ts
// items whose SRD text fixes a base weapon/armor but carry no FK
export const UNIQUE_BASES: Record<string, { base: string; overrides?: { damageType?: string; addTraits?: WeaponTrait[] } }> = {
  "srd-2024_sun-blade": { base: "srd-2024_longsword", overrides: { damageType: "radiant", addTraits: ["finesse"] } },
  "srd-2024_dagger-of-venom": { base: "srd-2024_dagger" },
  "srd-2024_mace-of-smiting": { base: "srd-2024_mace" },
  "srd-2024_mace-of-disruption": { base: "srd-2024_mace" },
  "srd-2024_mace-of-terror": { base: "srd-2024_mace" },
  "srd-2024_rod-of-lordly-might": { base: "srd-2024_mace" },
  "srd-2024_javelin-of-lightning": { base: "srd-2024_javelin" },
  "srd-2024_trident-of-fish-command": { base: "srd-2024_trident" },
  "srd-2024_dwarven-thrower": { base: "srd-2024_warhammer" },
  "srd-2024_scimitar-of-speed": { base: "srd-2024_scimitar" },
  "srd-2024_glamoured-studded-leather": { base: "srd-2024_studded-leather-armor" },
  "srd-2024_dragon-scale-mail": { base: "srd-2024_scale-mail" },
  "srd-2024_armor-of-invulnerability": { base: "srd-2024_plate-armor" },
  "srd-2024_animated-shield": { base: "srd-2024_shield" },
  "srd-2024_arrow-catching-shield": { base: "srd-2024_shield" },
  "srd-2024_spellguard-shield": { base: "srd-2024_shield" },
  "srd-2024_shield-of-missile-attraction": { base: "srd-2024_shield" },
};

export const QUARTERSTAFF_PK = "srd-2024_quarterstaff";

// the belt row only says "see the table"
export const BELT_STRENGTH: Record<string, number> = {
  "srd-2024_belt-of-giant-strength-hill": 21,
  "srd-2024_belt-of-giant-strength-frost-or-stone": 23,
  "srd-2024_belt-of-giant-strength-fire": 25,
  "srd-2024_belt-of-giant-strength-cloud": 27,
  "srd-2024_belt-of-giant-strength-storm": 29,
};

export const POTIONS_OF_HEALING_PK = "srd-2024_potions-of-healing";

export const HEALING_POTIONS: Array<{ slug: string; name: string; rarity: ArtifactRow["rarity"]; heal: string }> = [
  { slug: "srd-2024_potion-of-healing", name: "Potion of Healing", rarity: "common", heal: "2d4+2" },
  { slug: "srd-2024_potion-of-greater-healing", name: "Potion of Greater Healing", rarity: "uncommon", heal: "4d4+4" },
  { slug: "srd-2024_potion-of-superior-healing", name: "Potion of Superior Healing", rarity: "rare", heal: "8d4+8" },
  { slug: "srd-2024_potion-of-supreme-healing", name: "Potion of Supreme Healing", rarity: "epic", heal: "10d4+20" },
];

export const CONSUMABLE_NAME_RE = /^(Ammunition\b|Dust of |Feather Token|Elemental Gem|Bead of Force|Universal Solvent|Sovereign Glue)/;

export const WONDROUS_SLOTS: Array<[RegExp, ArtifactRow["slot"]]> = [
  [/\b(Amulet|Periapt|Necklace|Medallion|Scarab|Brooch|Talisman)\b/, "amulet"],
  [/\b(Boots|Slippers)\b/, "boots"],
  [/\b(Cloak|Cape|Mantle|Robe)\b/, "cloak"],
  [/\b(Helm|Hat|Circlet|Headband)\b/, "helmet"],
];
```

- [ ] **Step 4: Converter (uniques)** — `scripts/srd/convert/magic-items.ts` (додати; імпорти нових оверрайдів):

```ts
const USE: Ability = { id: "use", name: "Use", description: "Uses one; the effect is in the item description.", trigger: { event: "action" }, limits: { pool: { key: "charges", cost: 1 } }, effects: [{ kind: "note", text: "Use the item" }] };

const DRINK: Ability = { ...USE, id: "drink", name: "Drink", trigger: { event: "bonusAction" }, effects: [{ kind: "note", text: "Drink the potion" }] };

function uniqueSlot(f: O5MagicItem): ArtifactRow["slot"] {
  if (f.category === "ring") return "ring";

  if (f.category === "wondrous-item") return WONDROUS_SLOTS.find(([re]) => re.test(f.name))?.[1] ?? "item";

  return "item";
}

function baseFor(pk: string, f: O5MagicItem, gearBySlug: ReadonlyMap<string, ArtifactRow>) {
  const fixed = UNIQUE_BASES[pk];

  if (fixed) return { base: gearBySlug.get(fixed.base), overrides: fixed.overrides };

  return f.category === "staff" && /Quarterstaff/.test(f.desc) ? { base: gearBySlug.get(QUARTERSTAFF_PK), overrides: undefined } : null;
}

function uniqueRow({ pk, fields: f }: Fixture<O5MagicItem>, gearBySlug: ReadonlyMap<string, ArtifactRow>): ArtifactRow {
  const consumable = f.category === "potion" || CONSUMABLE_NAME_RE.test(f.name);

  const fixed = consumable ? null : baseFor(pk, f, gearBySlug);

  const base = fixed?.base;

  const mech = consumable ? { abilities: [] } : mechanize(f.desc, { weapon: !!base?.weapon });

  const belt = BELT_STRENGTH[pk];

  const charges = consumable ? null : chargesOf(f.desc);

  const weapon = base?.weapon && {
    ...base.weapon,
    ...(fixed?.overrides?.damageType && { damageType: fixed.overrides.damageType }),
    ...(fixed?.overrides?.addTraits && { traits: [...new Set([...(base.weapon.traits ?? []), ...fixed.overrides.addTraits])] }),
    ...mech.weapon,
  };

  const abilities = [
    ...(base?.abilities ?? []),
    ...mech.abilities,
    ...(belt ? [passive("score-strength", "Strength", [{ kind: "modifyStat", stat: "strength", atLeast: belt }])] : []),
    ...(charges ? [EXPEND_CHARGE] : []),
    ...(consumable ? [f.category === "potion" ? DRINK : USE] : []),
  ];

  return {
    slug: pk,
    name: f.name,
    description: f.desc,
    rarity: RARITY[f.rarity],
    slot: base?.slot ?? uniqueSlot(f),
    ...(weapon && { weapon }),
    ...(base?.armor && { armor: base.armor }),
    item: {
      ...(f.rarity !== "artifact" && { unique: false }),
      ...(f.requires_attunement && !consumable && { attunement: true }),
      ...(charges && { charges }),
      ...(consumable && { consumable: true }),
    },
    ...(abilities.length > 0 && { abilities }),
  };
}

function healingPotions(data: Open5eData): ArtifactRow[] {
  const table = data.items.find((i) => i.pk === POTIONS_OF_HEALING_PK);

  if (!table) return [];

  return HEALING_POTIONS.map((p) => ({
    slug: p.slug,
    name: p.name,
    description: `${table.fields.desc.split("\n")[0]} ${p.name} regains ${p.heal.replace("+", " + ")} Hit Points. As a Bonus Action, you can drink it or administer it to another creature within 5 feet of yourself.`,
    rarity: p.rarity,
    slot: "item",
    item: { unique: false, consumable: true },
    abilities: [{ id: "drink", name: "Drink", trigger: { event: "bonusAction" }, limits: { pool: { key: "charges", cost: 1 } }, effects: [{ kind: "heal", amount: p.heal, target: "self" }] }],
  }));
}

export function convertMagicUniques(data: Open5eData, gear: readonly ArtifactRow[]): ArtifactRow[] {
  const gearBySlug = new Map(gear.map((g) => [g.slug, g]));

  const skip = new Set([...DROPPED_GENERIC, DRAGON_SLAYER_PK]);

  const rows = data.magicItems.filter((m) => !m.fields.weapon && !m.fields.armor && !skip.has(m.pk)).map((m) => uniqueRow(m, gearBySlug));

  return [...rows, ...healingPotions(data)].sort(bySlug);
}

export const convertMagicItems = (data: Open5eData, gear: readonly ArtifactRow[]): ArtifactRow[] => [...convertMagicProperties(data, gear), ...convertMagicUniques(data, gear)].sort(bySlug);
```

(тип `mech` — `{ abilities: Ability[]; weapon?: { attackBonus: number; damageBonus: number } }`, оголосити явно.)

- [ ] **Step 5: Build wiring** — `scripts/srd/lib/build-data.ts`: `convertMagicProperties(data, gear)` → `convertMagicItems(data, gear)`; перед `const out` — `assertKnown("magic item overrides", [...Object.keys(UNIQUE_BASES), ...Object.keys(BELT_STRENGTH), DRAGON_SLAYER_PK, ...DROPPED_GENERIC], pks(data.magicItems));` — **лише якщо** `data.magicItems.length > 0` (збирання з повного джерела завжди має файл).

- [ ] **Step 6: Run tests to verify they pass**

Run: `pnpm test:run scripts/srd`
Expected: PASS.

- [ ] **Step 7: Dry build against the real source (no write)** — перевірити лічильники до регенерації:

```bash
pnpm exec tsx --tsconfig tsconfig.scripts.json -e '
import { loadOpen5e } from "./scripts/srd/lib/open5e";
import { buildSrdData } from "./scripts/srd/lib/build-data";
import { magicVariants } from "./scripts/srd/convert/magic-items";
const o = loadOpen5e("/Users/silentfox/.claude/jobs/4ad97a0b/tmp/srd");
const d = buildSrdData(o);
const gear = d.artifacts.filter((a) => a.rarity === "common");
console.info(d.artifacts.length, d.artifacts.filter((a) => a.item?.property).length, d.artifacts.filter((a) => a.rarity !== "common" && !a.item?.property).length + d.artifacts.filter((a) => a.rarity === "common" && a.item?.consumable).length, magicVariants(o, gear).length);
'
```

Expected: `331 32 248 513` (51 спорядження + 32 властивості + 248 унікальних; Potion of Healing — common і витратний, тому рахується другим доданком; 513 варіантів перевірено без помилки). Якщо `buildSrdData` кидає «magic item families: …» — виправити `familyTemplate`/`FAMILY_NAMES` за переліком, не послаблюючи перевірку.

- [ ] **Step 8: Type check and commit**

`pnpm exec tsc --noEmit -p tsconfig.json` → 0 errors.

```bash
git add scripts/srd
git commit -m "feat(srd): 4f-3 unique magic items, charges, consumables and healing potions

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 17: Цілісність даних, регенерація, перезаливка локального шаблону, регрес HOMM5

**Files:**
- Create: `scripts/srd/__tests__/data-integrity-4f3.test.ts`
- Modify (дозволені правки наявних тестів): `scripts/srd/__tests__/data-integrity.test.ts` — лише `EXPECTED.artifacts` 51 → 331; `scripts/srd/__tests__/data-integrity-4f2.test.ts` — лише фільтр у тесті «12 armors match the SRD table»: `a.slot === "armor"` → `a.slot === "armor" && a.rarity === "common"`
- Regenerate: `data/templates/srd-5.2/*.json`

**Interfaces:**
- Consumes: усе попереднє.

- [ ] **Step 1: Write the failing test** — `scripts/srd/__tests__/data-integrity-4f3.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { readSrdData } from "../lib/data-files";
import type { ArtifactRow } from "../lib/types";

import { armorStatsColumns } from "@/lib/utils/artifacts/armor-stats";
import { weaponStatsColumns } from "@/lib/utils/artifacts/weapon-stats";
import { matchesAppliesTo } from "@/lib/utils/items/compose";
import { itemStatsColumns } from "@/lib/utils/items/item-stats";

const data = readSrdData();

const asRow = (r: ArtifactRow) => ({ id: r.slug, name: r.name, slot: r.slot, modifiers: [...(r.weapon ? weaponStatsColumns(r.weapon).modifiers : []), ...(r.armor ? armorStatsColumns(r.armor).modifiers : []), ...(r.item ? itemStatsColumns(r.item).modifiers : [])] });

const properties = data.artifacts.filter((a) => a.item?.property);

const rows = data.artifacts.map(asRow);

const usesCharges = (a: ArtifactRow) => (a.abilities ?? []).some((x) => x.limits?.pool?.key === "charges");

describe("SRD 5.2 data: 4f-3", () => {
  it("32 properties, 248 uniques, 51 non-unique gear", () => {
    expect(properties).toHaveLength(32);
    expect(data.artifacts.filter((a) => !a.item?.property && (a.rarity !== "common" || a.item?.consumable))).toHaveLength(248);
    expect(data.artifacts.filter((a) => a.rarity === "common" && !a.item?.consumable).every((a) => a.item?.unique === false)).toBe(true);
  });

  it("every property has at least one base in the template that passes matchesAppliesTo", () => {
    for (const p of properties) expect(rows.some((b) => matchesAppliesTo(b, asRow(p))), p.name).toBe(true);
  });

  it("the charges pool key only in items with charges or consumables", () => {
    for (const a of data.artifacts.filter(usesCharges)) expect(!!a.item?.charges || !!a.item?.consumable, a.name).toBe(true);
  });

  it("only Dragon Orb is unique among magic items", () => {
    expect(data.artifacts.filter((a) => a.rarity !== "common" && a.item?.unique !== false).map((a) => a.name)).toEqual(["Dragon Orb"]);
  });

  it("names are unique (import keys by name)", () => {
    const names = data.artifacts.map((a) => a.name);

    expect(new Set(names).size).toBe(names.length);
  });

  it("mechanized coverage reaches the spec ballpark", () => {
    const mechanized = data.artifacts.filter((a) => a.rarity !== "common" && ((a.abilities ?? []).some((x) => x.effects.some((e) => e.kind !== "note")) || a.weapon?.attackBonus));

    expect(mechanized.length).toBeGreaterThanOrEqual(60);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test:run scripts/srd/__tests__/data-integrity-4f3.test.ts`
Expected: FAIL — у даних 4f-2 немає магічних предметів.

- [ ] **Step 3: Regenerate the data files**

Run: `pnpm srd:build --source /Users/silentfox/.claude/jobs/4ad97a0b/tmp/srd`
Expected: друк `spell-groups: 8, spells: 339, races: 9, classes: 12, units: 331, artifacts: 331` і `composed names verified: 513`. `git diff --stat data/templates/srd-5.2` — змінено лише `artifacts.json` і `manifest.json`; інші файли без змін (інакше зупинитись і з'ясувати).

- [ ] **Step 4: Allowed edits of the earlier integrity tests** — `scripts/srd/__tests__/data-integrity.test.ts`: `artifacts: 51` → `artifacts: 331`. `scripts/srd/__tests__/data-integrity-4f2.test.ts`: у тесті «12 armors match the SRD table» — `data.artifacts.filter((a) => a.slot === "armor")` → `data.artifacts.filter((a) => a.slot === "armor" && a.rarity === "common")`. Більше нічого не змінювати.

- [ ] **Step 5: Run SRD tests**

Run: `pnpm test:run scripts/srd lib/server/content`
Expected: PASS (зокрема `importContent` dryRun без помилок для 331 артефакта з `item`; OpenAPI `< 135_000` — якщо ні, див. Global Constraints).

- [ ] **Step 6: Reload the local template**

Run: `pnpm constructor:srd-template`
Expected: `5e SRD 5.2: <id>`; `artifacts: created 280, updated 51, … error 0`; exit 0. Повторний запуск — `created 0`, `error 0`. Перевірка (очікується `32|1|248`):

```bash
psql "postgresql://postgres:postgres@localhost:54322/constructor" -At -c "select count(*) filter (where a.modifiers::text like '%property%'), count(*) filter (where a.name = 'Dragon Orb' and a.modifiers::text not like '%unique\\\\\":false%'), count(*) filter (where a.rarity <> 'common' and a.modifiers::text not like '%property%') + count(*) filter (where a.rarity = 'common' and a.modifiers::text like '%consumable%') from artifacts a join campaigns k on k.id = a.\"campaignId\" where k.name = '5e SRD 5.2';"
```

(якщо екранування в `like` для Dragon Orb незручне — перевірити окремо `select modifiers from artifacts … where name = 'Dragon Orb'` і переконатися, що в JSON немає `"unique":false`).

- [ ] **Step 7: HOMM regression — engine tests**

Run: `pnpm test:run lib/utils/battle lib/utils/abilities "app/api/campaigns/[id]/battles" app/api/__tests__ lib/utils/characters lib/utils/rules lib/utils/inventory lib/utils/artifacts`
Expected: PASS.

- [ ] **Step 8: Existing tests untouched**

Run: `git diff --name-status 1c5d5f91..HEAD -- '*.test.ts' '*.test.tsx' | grep -v '^A'`
Expected: лише `M	lib/utils/rules/__tests__/schema.test.ts`, `M	scripts/srd/__tests__/preset.test.ts`, `M	scripts/srd/__tests__/data-integrity.test.ts`, `M	scripts/srd/__tests__/data-integrity-4f2.test.ts` і, якщо піднімали межу, `M	lib/server/content/__tests__/openapi.test.ts` / `openapi-4f2.test.ts`. Будь-який інший рядок — повернути наявний тест і виправити код.

- [ ] **Step 9: battle-sweep on HOMM5**

Run: `set -a; source .env.local; set +a; pnpm battle-sweep --campaign cmuylhk0c0001ia06lg5eommv`
Expected: exit 0, у звіті `<tmp>/battle-sweep/battle-sweep.md` 0 помилок (відомий нестабільний сценарій лабіринту — перезапустити один раз). Нові помилки — знайти коміт прогоном sweep на попередніх комітах цього плану (без `git stash`) і виправити окремим комітом.

- [ ] **Step 10: Commit**

```bash
git add scripts/srd/__tests__/data-integrity-4f3.test.ts scripts/srd/__tests__/data-integrity.test.ts scripts/srd/__tests__/data-integrity-4f2.test.ts data/templates/srd-5.2
git commit -m "feat(srd): 4f-3 regenerated SRD data with 32 properties and 248 magic items

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 18: Документи й повна перевірка

**Files:**
- Modify: `docs/architecture/battle.md`, `docs/architecture/abilities.md`, `docs/architecture/content-api.md`, `docs/STATUS.md`, `docs/archive/superpowers/constructor-handoff.md`

- [ ] **Step 1: `battle.md`** — новий розділ перед «## Changing battle behavior» (після «## 5e: броня, числа класів, пули (етап 4f-2)»):

```markdown
## 5e: магічні предмети (етап 4f-3)

- **Ref предмета.** Значення `character_inventories.equipped`/`stash`/`attuned` — `"<artifactId>"` або складений `"<baseId>+<propertyId>"` (`lib/utils/items/ref.ts`). Єдиний вхід для читачів — `resolveItemRow(s)` (`lib/utils/items/resolve.ts`): розбирає ref, складає синтетичний рядок `composeItemRow` (id = ref, назва за шаблоном властивості, статі бази + `overrides`, `bonuses`/`damageBonus` — сума, уміння бази ++ уміння властивості з префіксом `p-`), тихо пропускає видалене. Тест-сторож `lib/__tests__/item-readers-guard.test.ts` не пускає нових читачів `.equipped`/`.stash` повз `lib/utils/items`.
- **`rules.items.enabled`**: предмети слотів `item`/`ring` зі сховища носяться (`activeItemRefs`, `carried`), налаштування (`attuned`, ліміт `attunementLimit`) — неналаштований предмет з `attunement` дає лише статі бази (складений) або нічого (унікальний), витратні з `artifactId` потрапляють у бій. Вимкнено — усе як HOMM (налаштування ігнорується).
- **Унікальність** — `findHolder(…, isUnique)`: перевіряються лише артефакти без `item.unique === false` і не-властивості; унікальна база в складеному ref — одна на кампанію. Дублікати в клітинках — лише неунікальні (`uniqueConflict`); сховище лишається множиною (`ITEM_ALREADY_IN_STASH`).
- **Атаки**: id атаки = ref (`:off` — друга рука), `BattleAttack.damageBonus` додається у `weaponFlatOf` (прев'ю й сервер); події `attack`/`hit` несуть `attackSourceId` (ref без `:off`) для умови `withThisItem`. `critImmunity` скасовує крит після кидка (`cancelCritIfImmune`).
- **Заряди** — пул `pool:item:<ref>` (`itemPools`, лише активні предмети з `charges`; однакові ref ділять пул); уміння з `limits.pool.key: "charges"` отримують цей ключ при збиранні. `rest: null` — не відновлюються (довгий відпочинок їх лишає). ДМ правит витрачене через `PATCH …/resources { charges }`.
- **Витратні** — `SpecialItem.artifactId`, пул `pool:consumable:<itemId>` (max = кількість, `rest: null`), у `resources.charges` не пишеться; `saveBattle` (гілка `completing`, та сама транзакція) віднімає витрачене (`persistConsumables`), запис на 0 видаляється, журнал `item_use` від `campaigns.dmUserId`.
```

- [ ] **Step 2: `abilities.md`** — рядок у кінець:

```markdown
- Етап 4f-3 (магічні предмети): умова `withThisItem` (атака події зроблена предметом-джерелом уміння; `ConditionContext.sourceId`), прапорець `critImmunity`, `modifyStat … atLeast: N` (лише характеристики, без `flat`/`percent`; у `bakePassives` після пласких бонусів — `max(власне, N)`), ключ пулу `charges` у вміннях артефакта з `charges`/`consumable` (`validateAbilities(list, { itemCharges })`; при збиранні → `pool:item:<ref>` або `pool:consumable:<itemId>`). Деталі — [battle.md](battle.md) «5e: магічні предмети».
```

- [ ] **Step 3: `content-api.md`** — у розділ про артефакти (поруч із `armor` 4f-2): поле `item` (`ItemStats { unique?, property?: { appliesTo: { kinds, attackType?, armorCategories?, bases? (≤ 60 назв) }, nameTemplate? ({base}, {name}), overrides? }, attunement?, charges?: { max 1–50, rest: short|long|null }, consumable? }`, запис `modifiers` типу `itemStats` (JSON), `null` у PATCH прибирає; відмови `ITEM_PROPERTY_SLOT`, `ITEM_PROPERTY_STATS`, `ITEM_CONSUMABLE_CONFLICT`), `weapon.damageBonus` (−20…20), імпорт/експорт поля `item`, OpenAPI `ItemStats`; дії сховища `grant { artifactId, baseId?, quantity? }` і `attune`/`unattune { ref }` (відмови `ITEM_PROPERTY_NEEDS_BASE`, `ITEM_BASE_MISMATCH`, `ATTUNEMENT_LIMIT`, `ATTUNEMENT_NOT_REQUIRED`, `ALREADY_ATTUNED`, `ITEM_NOT_ATTUNED`, `ITEM_NOT_HELD`, `ITEM_ALREADY_IN_STASH`, `ITEMS_DISABLED`); міграція `20261102000000_inventory_attuned`. У розділ «Шаблон SRD 5.2» — пункт «4f-3»: джерело `MagicItem.json` (md5 у `OPEN5E_FILES`), спорядження `unique: false`, 32 властивості (31 сімейство варіантів + Dragon Slayer; назви складаються з повної назви бази, перевірка 513 варіантів у `pnpm srd:build` нормалізує слово «Armor»), 248 унікальних (244 + 4 зілля лікування з `Item.json`), неунікальні всі, крім Dragon Orb; регулярки механізації — `scripts/srd/convert/magic-items.ts`.

- [ ] **Step 4: `STATUS.md`** — у рядку «Конструктор кампаній» після фрагмента про 4f-2 замінити «далі живий прогін 4f-2, потім 4f-3 (магічні предмети)» (або актуальний хвіст) на «**4f-3 «магічні предмети» готовий** (`rules.items`, модель `item` у `modifiers`, складені ref `<base>+<property>` через `resolveItemRows`, налаштування з міграцією `20261102000000_inventory_attuned`, заряди-пули й витратні в бою, `damageBonus`/`withThisItem`/`critImmunity`/`atLeast`, конвертер: 32 властивості й 248 предметів; спек — розділ 4f-3 того ж файлу, план `docs/archive/superpowers/plans/2026-10-23-constructor-4f3-magic-items.md`; опис — `docs/architecture/battle.md` «5e: магічні предмети»); далі живий прогін 4f-3, потім 4f-4». Дата «_Оновлено:_» — `2026-10-23`.

- [ ] **Step 5: `constructor-handoff.md`** — у «Стан» рядок про 4f-3 (той самий зміст одним реченням); відкладене: заклинання з предметів (4f-5), вибір типу опору/велетня/дракона при видачі (4f-4), кидок відновлення зарядів і знищення на останньому, умови за типом істоти, перемикачі бонусною дією, ціна/вага, прокляття, `character_items`, AI-контекст предметів (`ai/tools/party.ts`), `scripts/constructor/copy-test-heroes.ts` не переписує складені ref (`remapIds` по рядку), DM-редактор сітки (`PATCH inventory`) враховує неунікальність лише при `items.enabled` або складених ref; «Наступний крок» — «живий прогін 4f-3 за §10 спеку (десктоп, окремий субагент, локальна БД `constructor`, шаблон уже перезалито), потім спек і план 4f-4».

- [ ] **Step 6: Full verification**
  - `pnpm install --frozen-lockfile` — без змін lockfile.
  - `pnpm test:run` — усі зелені (відомий нестабільний `lib/hooks/battle/__tests__/battle-fx.test.tsx` — перезапустити окремо).
  - `pnpm lint` — 0 errors.
  - `pnpm build` — успішно.
  - `set -a; source .env.local; set +a; pnpm battle-sweep --campaign cmuylhk0c0001ia06lg5eommv` — без регресу HOMM.

- [ ] **Step 7: Commit**

```bash
git add docs/architecture/battle.md docs/architecture/abilities.md docs/architecture/content-api.md docs/STATUS.md docs/archive/superpowers/constructor-handoff.md
git commit -m "docs(constructor): 4f-3 magic items — architecture, status, handoff

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

- [ ] **Step 8:** звіт контролеру: список комітів, відхилення від плану (і чому), розмір документа OpenAPI, лічильники `pnpm srd:build` (артефакти, `composed names verified`), нестабільні тести.

(Фінальне рев'ю opus, `/simplify` і живий прогін за §10 спеку — два Fighter 5 з Longsword, Flame Tongue на Longsword з налаштуванням 3/3 і відмовою четвертого, Breastplate +1, Wand of Magic Missiles 7 → 6 → 7/7 після довгого відпочинку, 2 Potion of Healing → 1, неналаштований Ring of Protection, HOMM-кампанія без змін — окремий субагент після задачі 18.)
