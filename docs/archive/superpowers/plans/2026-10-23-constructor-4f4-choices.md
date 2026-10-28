# Етап 4f-4: вибір при створенні й рівні — план реалізації

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** одна модель «вибір N з набору» (`Choice` / `Picks`) для рас, рівнів класу/підкласу й рис: лінії рас (24 опції SRD), тип контенту «Риси» (`feats`, 17 SRD), ~100 виборів класів (ASI/Epic Boon, стиль бою, метамагія, закляття, експертиза, бінарні опції), списки заклинань тегами (`Spell.lists`, `GameClass.spellList`) з фільтром у виборах `spell`; вибори зберігаються в персонажі (`raceChoices`, `feats`, `classes[].choices`), ASI пишеться в базові характеристики дельтою, рушій перетворює вибори на вміння (джерело `feat` для рис), `skillProficiency`/`skillExpertise` і додані заклинання; UI ДМ і гравця; конвертер SRD і перезалитий локальний шаблон.

**Architecture:** чисті функції без zod — `lib/utils/characters/choices/*` (читачі, кількість, `validatePicks`, дельта ASI, `planChoices`, `choiceSelections`, невибрані); Zod — окремо в `lib/schemas/choices.ts` і `lib/schemas/feats.ts`. Сервер — один вхід `resolveCharacterChoices` (`lib/server/characters/choices/`) для створення, чернетки, `PUT …/choices` і level-up; запис — у транзакції з `lockCharacters`, журнал `choices_edit`. Рушій: `choiceSelections` → `ChoiceGroup[]` → `collectCharacterAbilities({ choiceGroups })` (далі як зараз: `resolveAbilities`, `bakePassives`, snapshot з `snapshotHash` пише наявний конвеєр); у snapshot нічого нового. Усі нові шляхи закриті режимом класів (`classModeOf`) або присутністю `choices`/`raceChoices`/`feats`; HOMM-раси й HOMM-герої виборів не мають.

**Tech Stack:** TypeScript strict, Next.js 16, React 19, Prisma 6 (PostgreSQL), Zod 4, TanStack Query, Vitest (+ happy-dom для компонентів), `tsx`-скрипти (`tsconfig.scripts.json`).

**Spec:** `docs/archive/superpowers/specs/2026-10-22-constructor-stage4-5e-design.md` — розділ «## 4f-4. Дизайн: вибір при створенні й рівні» (§1–§11), «Загальні правила етапу 4», «Ризики» (останні п'ять пунктів — 4f-4). Рішення щодо відкритих питань спеку (користувач спав, прийнято рекомендоване): (1) без нової секції правил — риси й вибори класів лише в режимі класів, вибори рас — для будь-якого героя; (2) спільна модель `Choice`; (3) риси — тип контенту `feats`; (4) списки — теги на заклинанні; (5) вибори в `classes[i].choices`, `raceChoices`, `feats`; (6) ASI — дельтою в базові колонки; (7) **вибори при підвищенні рівня необов'язкові** (бейдж «Невибрані вибори: N» з кнопкою «Обрати»); (8) правка через `PUT …/choices` — ДМ або власник при `allowPlayerEdit`, `source: "dm"` — лише ДМ, **409 під час активного бою**; (9) `"slots"` = найвище коло слотів цього класу самого; (10) передісторії — поза обсягом (після 4f-5).

## Global Constraints

- Worktree `/Users/silentfox/Work/dnd-tracker-constructor`, гілка `feat/constructor`; `/Users/silentfox/Work/dnd-tracker` не чіпати. БД лише `postgresql://postgres:postgres@localhost:54322/constructor`; prod і prodcopy не чіпати.
- **Нульова зміна HOMM5.** Кожен новий шлях закритий однією з умов: режим класів (`classModeOf(rules.classes.enabled, classes.length)` / розв'язаний клас у бою) — для рис, виборів класу, `Character.feats`; непорожні `race.choices` / `raceChoices` — для виборів раси; нове необов'язкове поле присутнє (`choices` у фічі/записі класу, `spellList`, `lists`, `subrace` у `identity`, `choices` у листі, `expertise` у `SheetCheck`). HOMM-герой: жодного запиту рис (`loadFeatsById` не ходить у БД), учасник і лист байт-у-байт як раніше, level-up HOMM (`applyLevelGain`), `knownSpells`, раси без `choices`.
- **Наявні тести не редагувати** — лише нові `it(...)`/файли. Єдині дозволені правки наявних тестів (спек свідомо змінює вихід): `scripts/srd/__tests__/preset.test.ts` — `toHaveLength(18)` → `toHaveLength(20)` (у `OPEN5E_FILES` додаються `Feat`, `FeatBenefit`; задача 15); `scripts/srd/__tests__/build-data.test.ts` — у літерал `data: SrdData` додати `feats: []`, в очікування `manifest.counts` — `feats: 0` (у `SRD_KINDS` додається `feats`; задача 15); `scripts/srd/__tests__/data-integrity.test.ts` — у `SCHEMAS` рядок `feats: { create: createFeatSchema, update: updateFeatSchema },` (+ імпорт), в `EXPECTED` — `feats: 17` (задача 15); `lib/utils/content/import/__tests__/fields.test.ts` і `lib/server/content/__tests__/import-content.test.ts` — рядок `feats: createFeatSchema,` у `CREATE: Record<ImportKind, ZodType>` (+ імпорт; новий вид імпорту без нього не компілюється й падає в `it.each(IMPORT_KINDS)`; задача 4); `lib/server/content/__tests__/openapi.test.ts` і `lib/server/content/__tests__/openapi-4f2.test.ts` — межа `135_000` → `145_000` (документ уже 133 544 символи, новий ресурс `feats` з п'ятьма операціями + `Choice` додають ≈ 8 000; задача 4, виміряний розмір — у повідомленні коміту; якщо після задачі 5 документ ≥ 145 000 — зупинитись і стиснути описи, а не піднімати далі).
- Рушій читає бонуси лише через `collectModifiers`/`runAbilities`; колонку `abilities` — лише через `lib/utils/abilities/read.ts` (нові `featAbilities`, `readChoiceList`). Нових записувачів `battle_participants.snapshot` немає.
- **Чанки без zod** (`lib/__tests__/client-entry-imports.test.ts`: бій і профіль): `lib/utils/characters/choices/*.ts` не імпортують `zod` ні напряму, ні транзитивно (лише `import type`; `@/lib/constants/*`, `@/lib/utils/characters/classes/columns`, `@/lib/utils/spells/class-slots` — без zod). Компоненти профілю (`components/character-profile/*`) імпортують лише ці модулі; діалог «Обрати» (`ChoicesDialog`) вантажиться через `next/dynamic`. Барелю `lib/utils/characters/choices/index.ts` немає — імпорт за модулем.
- Тип вибору — `ChoicePick` (не `Pick`, щоб не затіняти вбудований `Pick<>` TypeScript); `Picks = Record<choiceId, ChoicePick[]>`.
- Нові поля спільних типів — **необов'язкові**: `CharacterClassEntry.choices?`, `ClassFeature.choices?`, `GameClassData.spellList?`, `Spell.lists?`, `SpellFormData.lists?`, `Race.choices?`, `RaceFormData.choices?`, `Character.raceChoices?`/`feats?`, `CharacterFormData.choices?`, `DraftInput.choices?`, `CharacterSheet.choices?`, `CharacterSheet.identity.subrace?`, `SheetCheck.expertise?`, `ClassLevelUpPick.choices?`, `CampaignSpellContext` без змін.
- Міграція одна: `prisma/migrations/20261103000000_choices_feats/migration.sql` (лише розширення; `CREATE TABLE "feats"` + `ALTER TABLE "feats" ENABLE ROW LEVEL SECURITY;` — `prisma/__tests__/migrations-rls.test.ts`). Назви колонок — camelCase, як уся схема (`"raceChoices"`, `"spellList"`), а не snake_case зі спеку. Застосування: `set -a; source .env.local; set +a; pnpm exec prisma migrate deploy && pnpm exec prisma generate` (**не** `migrate dev`).
- Обмеження моделі (`CHOICE_LIMITS`): виборів на власника ≤ 20, опцій ≤ 40, піків на вибір ≤ 30, `count` 1–30, `points` 1–4, `max` 1–30, `requires` ≤ 10, `option.spells` ≤ 10, описи ≤ 4000, `Spell.lists` ≤ 20 тегів по ≤ 40 символів, `spellList` ≤ 40, `Character.feats` ≤ 30; id вибору/опції — `CHOICE_ID_RE = /^[a-z0-9][a-z0-9-]{0,63}$/`.
- Нова сутність проходить увесь шлях 4c-1: `CONTENT_RESOURCES`/`ContentKind`, роути колекції (`collectionRoutes`/`itemRoutes`), `ReferenceKind.FEATS` + `getCachedFeats`, `IMPORT_KINDS`/`ImportKind`/`IMPORT_SPECS`/`LOADERS`/`EXPORT_LOADERS`/`INVALIDATE`, `BUNDLE_TABLES`/`SYNC_TABLE_SCOPES`/`SYNC_SCOPE_LABELS`, OpenAPI і MCP (`content_*` — автоматично з ресурсу).
- Шари й стиль: компоненти не імпортують `@/lib/api/*`; UI українською, ідентифікатори англійською; мінімум коментарів (лише неочевидне «чому»). ESLint: порожні рядки навколо `const`/`let`/`if`/`return`/блоків, `simple-import-sort`, `import/no-cycle`, `no-console` (у `scripts/` дозволено `info/warn/error`). Імпорти всередині `scripts/srd` — відносні, з `lib/` — через `@/`. Компоненти, що читають правила, звертаються `data?.classes.enabled` (наявні моки `useCampaignRules` повертають лише `classes`).
- Тести: під час роботи `pnpm test:run <files>`; після змін типів — `pnpm exec tsc --noEmit -p tsconfig.json` (охоплює тести й `scripts/**`); повний `pnpm test:run`, `pnpm lint`, `pnpm build` — лише в задачі 19.
- Коміти з трейлером `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`; `.superpowers/` не комітити.

## Review Focus

1. **HOMM-герой і HOMM-кампанія без змін**: учасник без класів і з расою без `choices` — `collectCharacterAbilities` викликається без `choiceGroups`, `prisma.feat` не чіпається, `knownSpells` ті самі, лист без `choices`/`identity.subrace`/`expertise`; level-up HOMM пише ті самі колонки. Тести в задачах 8 і 9 (окремий `it` «HOMM hero: no feat query, identical participant»).
2. **«Осиротілі» вибори** (синхронізація видалила рису / перейменувала id опції): рушій і лист тихо пропускають невідоме, лічильник невибраних рахує відкритий слот, форма показує «Вибір не знайдено — буде прибрано при збереженні» і не надсилає його; API з невідомим id — 422 `CHOICE_UNKNOWN`; видалення риси, яку тримає герой, — 409 `FEAT_IN_USE`. Тести в задачах 3, 4, 8, 12.
3. **ASI туди й назад**: заміна +2 STR на +2 DEX повертає STR і додає DEX; зняття вибору відкочує; 19 + 2 при межі 20 — 422 `ABILITY_SCORE_CAP`; герой, якого ДМ уже підняв вище межі руками, не блокується правкою інших виборів (межа перевіряється лише для характеристик із додатною дельтою). Тести в задачах 3 і 6.
4. **Рівень класу знижено нижче рівня вибору**: пік лишається в даних, не діє в рушії й не рахується невибраним; збереження інших виборів не блокується; зміна закритого піку — 422 `CHOICE_LOCKED`. Тести в задачах 3 і 8.
5. **Застарілий редактор ДМ**: `PATCH …/characters/[id]` з `classes`, що містять старі `choices`, зберігає вибори з БД (вибори змінюються лише через `PUT …/choices`, level-up і створення); після збереження панелі «Вибори» форма редактора підтягує нові характеристики (`mergeLevelUpIntoForm` через `onSaved={editor.dmActions.applyClassLevelUp}`), тож головне «Зберегти» не відкочує ASI. Тест — у задачі 7; підключення `onSaved` — у задачі 13.

## Рішення щодо неоднозначностей спеку

- **Alert** (`modifyStat initiative` з формулою `prof`) — механізується: `FlatSchema` приймає `{ formula }`, `bakePassives` для `initiative` бере `resolveFlat(e.flat, owner)` (`lib/utils/abilities/build/bake.ts:18,37`), а `prof` = `abilities.proficiencyBonus`, який `from-character.ts` виставляє до запікання. Вміння: `{ kind: "modifyStat", stat: "initiative", flat: { formula: "prof" } }`, `trigger: passive`.
- **Назви заклинань у виборах раси.** Імпортер розв'язує лише верхньорівневі `ref`/`refList` (`resolveRefs` у `lib/server/content/import/import-content.ts`), загального резолвера вкладених назв немає (є лише `resolveSchoolRefs` у скрипті SRD). Додаємо загальний механізм: `ImportField.nestedRef?: { kind: ImportKind; key: string }` для поля типу `json` — `resolveNestedRefs` глибоко обходить значення й замінює рядок у властивості `key` (тут `spellId`) на id за назвою або id (як `resolveRefs`); не знайдено — попередження «Вибори (JSON): не знайдено «X» (Заклинання)», значення лишається як є (рушій і лист пропускають невідомий id). `refKindsOf` додає `nestedRef.kind` до завантажуваних назв; експорт CSV (`formatFieldValue`) замінює id назад на назви. Поле `choices` раси має `nestedRef: { kind: "spells", key: "spellId" }`. Бандл/синхронізація ремаплять id самі (`remapIds`).
- **Опис вибору.** У моделі спеку немає поля для тексту трейту-«оболонки», який «переходить в опис вибору» — додаємо `Choice.description?: string` (≤ 4000).
- **Невибрані при level-up** дозволені; `PUT …/choices` — єдиний шлях правки після створення. Блокування в бою (`rejectIfInActiveBattle`) — у `PUT …/choices` завжди і в level-up **лише коли тіло має `choices`** (наявний level-up без виборів не змінюється).
- **Закриті вибори** (`choice.level` вищий за рівень власника): `validatePicks` їх пропускає; `planChoices` порівнює закриті піки до/після — будь-яка зміна → 422 `CHOICE_LOCKED`. Рушій, лист і лічильник невибраних їх ігнорують.
- **Дельта ASI** рахується за **всіма збереженими** піками `abilityScore` (відкритими й закритими) до/після за поточними визначеннями; межа — лише для характеристик із додатною дельтою: `final = stored + delta ≤ min(max)` піків цієї характеристики. Видалення риси (409) і синхронізація не відкочують характеристики (ризик спеку).
- **Класовий PATCH** (`patch-character.ts`): `choices` записів класу завжди беруться з БД за `classId` (`keepStoredPicks`), вхідні `choices` ігноруються — інакше застарілий редактор відкотив би вибори без дельти ASI. Видалення запису класу видаляє його вибори без відкату ASI (як зниження рівня).
- **`subrace`**: якщо раса має вибір з `lineage: true` — сервер пише назву обраної опції або `null`, якщо не обрано; раса без лінії — `subrace` не змінюється (ручний текст ДМ лишається).
- **Права**: `PUT …/choices` — `requireCharacterAccess` (ДМ або власник) + `!isDM && !campaign.allowPlayerEdit` → 403 `FORBIDDEN`; чернетку власник правит лише через `…/draft` (403 `DRAFT_EDIT_VIA_DRAFT`); зміна записів `feats` з `source: "dm"` не-ДМ → 403 `DM_FEAT_ONLY_DM`; `source: "origin"` ≤ 1 і лише тип `origin`.
- **Чернетка гравця** (режим класів): тіло отримує `choices?: { raceChoices?, feats? (лише origin), classChoices? }` — вибори 1-го рівня стартового класу; без режиму класів — лише `raceChoices`. Сервер — той самий `resolveCharacterChoices`; дельта ASI застосовується до вже перевірених `validateAbilityScores` значень.
- **Лічильник невибраних у списку персонажів ДМ** (спек: «бейдж на листі й у списку ДМ») — у 4f-4 лише на листі; список потребував би розрахунку виборів у `list-characters` для кожного героя (egress, окремий запит рис/класів) — у хендоф.
- **Підклас у виборах**: `classChoiceDefs(cls, subclass)` = вибори фіч класу + вибори фіч обраного підкласу (рівень — у класі); джерело вмінь опції — клас (`AbilitySource.type: "class"`, `id` класу), масштаб — `applyClassScale` класу.
- **Унікальні ключі вмінь з виборів**: id вміння опції → `<choiceId>.<optionId>.<abilityId>`; вміння риси → `<шлях піку>.<abilityId>` (повторювана риса двічі дає два різні ключі).
- **Дані SRD**: ASI 51 і Epic Boon 12 — вибори `feat` ([origin, general] / [origin, general, epicBoon]), Fighting Style 4 (+ вбудовані Blessed/Druidic Warrior), Expertise 7, навички 2, Metamagic 1 (синтетична колонка `metamagic`: 2 з рівня 2, 4 з 10, 6 з 17), Invocations 1 (28 опцій, колонка `eldritch-invocation-count`), бінарні 6, Elemental Affinity 1 (5 опцій), Fiendish Resilience 1 (12 типів шкоди без Force), Magical Discoveries 1, `spell` 14 (8 `prepared-spells` + 6 `cantrips`) — разом 101 вибір класів (67 `feat`, 7 `expertise`, 2 `skill`, 15 `spell`, 10 `option`; спек: «~100»). Ноти, замінені виборами, і псевдофічі `*-options` з даних зникають.

---

## Карта файлів

| Файл | Відповідальність |
|---|---|
| `prisma/schema.prisma`, `prisma/migrations/20261103000000_choices_feats/migration.sql` | таблиця `feats` (+RLS), `races.choices`, `spells.lists`, `classes.spellList`, `characters.feats`/`raceChoices` |
| `types/choices.ts`, `lib/constants/choices.ts` | `Choice`, `ChoiceOption`, `ChoicePick`, `Picks`, `CharacterFeat`, `FeatData`, `SpellRef`, `ChoicesState`, `ChoiceIssue`; `CHOICE_KINDS`, `FEAT_TYPES`, підписи, `CHOICE_ID_RE`, `CHOICE_LIMITS` |
| `types/{classes,races,spells,characters,abilities}.ts` | необов'язкові поля; `AbilitySource.type: "feat"`; `SheetChoices` |
| `lib/constants/{api-errors,character-log}.ts`, `lib/utils/characters/resources/describe-log.ts` | тексти відмов 4f-4, вид журналу `choices_edit` |
| `lib/schemas/choices.ts`, `lib/schemas/feats.ts`, `lib/schemas/{classes,races,spells,index}.ts` | Zod |
| `lib/utils/characters/choices/{read,count,class-choices,columns,validate,walk,ability,pending,picks,plan,selections,describe,slug,prune}.ts` | чисті функції без zod |
| `lib/utils/abilities/read.ts`, `lib/utils/feats/row.ts`, `lib/utils/spells/class-slots.ts` | `featAbilities`, `readChoiceList`, `toFeatData`, `maxSlotLevelFor` |
| `lib/cache/{tags,reference-data}.ts`, `lib/server/feats/{feat-name,feat-usage}.ts`, `lib/server/content/resources/{feats,index,races,classes,spells}.ts`, `lib/server/content/define-resource.ts`, `lib/server/content/json-schema.ts`, `app/api/campaigns/[id]/feats/**` | ресурс `feats`, `Choice` в OpenAPI |
| `types/content-import.ts`, `lib/utils/content/import/{kinds,values}.ts`, `lib/utils/content/import/fields/{feats,races,classes,spells,index}.ts`, `lib/server/content/import/{import-content,names,export}.ts`, `lib/hooks/content-import/keys.ts` | імпорт/експорт, `nestedRef` |
| `lib/constants/source-sync.ts`, `lib/server/templates/bundle.ts` | бандл і синхронізація |
| `lib/server/characters/choices/{load-refs,resolve-choices}.ts`, `app/api/campaigns/[id]/characters/[characterId]/choices/{route,choices-handler}.ts` | сервер виборів |
| `app/api/campaigns/[id]/characters/{create-character,create-character-schema}.ts`, `…/draft/{draft-schema,create-draft}.ts`, `…/[characterId]/draft/update-draft.ts`, `…/[characterId]/patch-character.ts`, `…/[characterId]/level-up/route.ts`, `lib/server/characters/class-level-up.ts` | створення, чернетка, PATCH, level-up |
| `lib/utils/abilities/build/collect.ts`, `lib/utils/abilities/schema/effects.ts`, `lib/utils/abilities/registry/effects/flags.ts`, `lib/utils/battle/checks/roll-check.ts`, `lib/utils/battle/damage/impl.ts`, `lib/utils/battle/participant/{from-character,load-feats}.ts` | рушій |
| `lib/utils/characters/sheet/build-sheet.ts`, `app/api/campaigns/[id]/characters/[characterId]/sheet/sheet-handler.ts` | лист |
| `lib/api/{feats,characters}.ts`, `lib/hooks/feats/*`, `lib/hooks/characters/{useCharacterChoices,useChoiceRefs,useClassLevelUp,usePlayerDraftForm}.ts`, `lib/hooks/spells/useSpellsList.ts` | клієнт |
| `components/feats/*`, `app/campaigns/[id]/dm/feats/**`, `app/campaigns/[id]/page.tsx`, `components/layout/{Breadcrumbs,screen-background}.tsx` | UI «Риси» |
| `components/choices/{ChoiceListEditor,ChoiceOptionsEditor,OptionSpellsEditor,ChoicePicker,ChoicesEditor,CharacterChoicesTab,CharacterChoicesPanel}.tsx`, `components/classes/SpellListHint.tsx`, `components/races/{race-form-tabs,RaceFormFields}.ts(x)`, `components/classes/{ClassFeaturesEditor,ClassBasicsTab}.tsx`, `components/spells/form/SpellFormPowerFields.tsx`, `app/campaigns/[id]/dm/spells/page-client.tsx` | редактори виборів і списків |
| `components/characters/{NewCharacterForm,character-form-tabs}.ts(x)`, `components/characters/player-draft/PlayerDraftForm.tsx`, `components/character-profile/{ProfileEditor,ProfileTabs,ClassLevelUpDialog,LevelUpAction,LevelUpChoicesStep,ProfileHero,CombatTab,MagicTab,SkillsTab,CharacterProfile,FeatsBlock,PendingChoicesBadge,ChoicesDialog}.tsx`, `lib/utils/characters/character-form.ts`, `lib/onboarding/whats-new.ts` | форма персонажа, крок рівня, лист |
| `scripts/srd/lib/{source,open5e,types,build-data}.ts`, `scripts/srd/convert/{feats,race-choices,class-choices,spells}.ts`, `scripts/srd/overrides/{feats,race-choices,class-choices,classes}.ts` | конвертер |
| `scripts/srd/__tests__/fixtures-4f4/*.json`, `scripts/srd/__tests__/{feats,race-choices,class-choices,data-integrity-4f4}.test.ts` | фікстури й тести |
| `data/templates/srd-5.2/*.json` | перегенеровані дані (+ `feats.json`) |
| `docs/architecture/{battle,abilities,content-api}.md`, `docs/STATUS.md`, `docs/archive/superpowers/constructor-handoff.md` | документи |

---
### Task 1: Міграція, Prisma, типи й константи виборів

**Files:**
- Create: `prisma/migrations/20261103000000_choices_feats/migration.sql`, `types/choices.ts`, `lib/constants/choices.ts`
- Modify: `prisma/schema.prisma`, `types/classes.ts`, `types/races.ts`, `types/spells.ts`, `types/characters.ts`, `types/abilities.ts`, `lib/utils/battle/damage/impl.ts`, `lib/constants/api-errors.ts`, `lib/constants/character-log.ts`, `lib/utils/characters/resources/describe-log.ts`
- Test: `prisma/__tests__/migration-choices-feats.test.ts`, `lib/constants/__tests__/choices.test.ts`

**Interfaces:**
- Produces:
  - Prisma: модель `Feat` (`prisma.feat`, таблиця `feats`), `Campaign.feats Feat[]`, `Race.choices Json`, `Spell.lists Json`, `GameClass.spellList String?`, `Character.feats Json`, `Character.raceChoices Json`.
  - `types/choices.ts`: `ChoiceKind`, `FeatType`, `ChoiceOwner = "race" | "class" | "feat"`, `ChoiceOption`, `Choice`, `ChoicePick`, `Picks`, `CharacterFeat`, `FeatPrerequisite`, `FeatData`, `FeatFormData`, `SpellRef`, `ChoiceRace`, `ChoicesState`, `ChoiceErrorCode`, `ChoiceIssue`, `ChoicesBody`, `SheetChoices` (точні визначення — крок 3).
  - `lib/constants/choices.ts`: `CHOICE_KINDS`, `FEAT_TYPES`, `FEAT_TYPE_LABELS`, `CHOICE_KIND_LABELS`, `CHOICE_ID_RE`, `CHOICE_LIMITS`.
  - `API_ERRORS.{FEAT_NOT_FOUND, FEAT_IN_USE, CHOICE_UNKNOWN, CHOICE_COUNT, CHOICE_DUPLICATE, CHOICE_LOCKED, CHOICE_MIN_LEVEL, CHOICE_REQUIRES, FEAT_TYPE, FEAT_PREREQUISITE, FEAT_NOT_REPEATABLE, SKILL_NOT_ALLOWED, EXPERTISE_NEEDS_PROFICIENCY, SPELL_NOT_IN_LIST, ABILITY_SCORE_CAP, CHOICES_NEED_CLASSES, ORIGIN_FEAT_ONLY_ONE, DM_FEAT_ONLY_DM}`, `featNameTakenMessage(name)`; `CharacterLogKind.CHOICES_EDIT = "choices_edit"`.
  - Необов'язкові поля: `CharacterClassEntry.choices?: Picks`, `ClassFeature.choices?: Choice[]`, `GameClassData.spellList?: string | null`, `ClassLevelUpPick.choices?: Picks`, `Race.choices?: Choice[]`, `RaceFormData.choices?: Choice[]`, `Spell.lists?: string[]`, `SpellFormData.lists?: string[]`, `Character.raceChoices?: Picks`, `Character.feats?: CharacterFeat[]`, `CharacterFormData.choices?: { raceChoices: Picks; feats: CharacterFeat[] }`, `DraftInput.choices?: { raceChoices?: Picks; feats?: CharacterFeat[]; classChoices?: Picks }`, `CharacterSheet.choices?: SheetChoices`, `CharacterSheet.identity.subrace?: string | null`, `SheetCheck.expertise?: true`; `AbilitySource.type` + `"feat"`.

- [ ] **Step 1: Write the failing tests**

`prisma/__tests__/migration-choices-feats.test.ts`:

```ts
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const sql = readFileSync(path.resolve(__dirname, "../migrations/20261103000000_choices_feats/migration.sql"), "utf8");

describe("migration 20261103000000_choices_feats", () => {
  it("expand-only: new columns with defaults, feats table with RLS", () => {
    expect(sql).toContain(`ALTER TABLE "races" ADD COLUMN "choices" JSONB NOT NULL DEFAULT '[]'`);
    expect(sql).toContain(`ALTER TABLE "spells" ADD COLUMN "lists" JSONB NOT NULL DEFAULT '[]'`);
    expect(sql).toContain(`ALTER TABLE "classes" ADD COLUMN "spellList" TEXT`);
    expect(sql).toContain(`ADD COLUMN "feats" JSONB NOT NULL DEFAULT '[]'`);
    expect(sql).toContain(`ADD COLUMN "raceChoices" JSONB NOT NULL DEFAULT '{}'`);
    expect(sql).toContain(`CREATE TABLE "feats"`);
    expect(sql).toContain(`ALTER TABLE "feats" ENABLE ROW LEVEL SECURITY`);
    expect(sql).not.toMatch(/DROP|RENAME|ALTER COLUMN/);
  });
});
```

`lib/constants/__tests__/choices.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { API_ERRORS, featNameTakenMessage } from "@/lib/constants/api-errors";
import { CharacterLogKind } from "@/lib/constants/character-log";
import { CHOICE_ID_RE, CHOICE_KIND_LABELS, CHOICE_KINDS, FEAT_TYPE_LABELS, FEAT_TYPES } from "@/lib/constants/choices";
import { describeCharacterLog } from "@/lib/utils/characters/resources/describe-log";

describe("choices constants", () => {
  it("kinds and feat types have labels", () => {
    expect([...CHOICE_KINDS]).toEqual(["option", "feat", "skill", "expertise", "abilityScore", "spell"]);
    expect([...FEAT_TYPES]).toEqual(["origin", "general", "fightingStyle", "epicBoon"]);
    expect(Object.keys(CHOICE_KIND_LABELS)).toEqual([...CHOICE_KINDS]);
    expect(Object.keys(FEAT_TYPE_LABELS)).toEqual([...FEAT_TYPES]);
  });

  it("choice ids are kebab-case slugs", () => {
    expect(CHOICE_ID_RE.test("elven-lineage")).toBe(true);
    expect(CHOICE_ID_RE.test("ability-score-improvement-4")).toBe(true);
    expect(CHOICE_ID_RE.test("Elven Lineage")).toBe(false);
    expect(CHOICE_ID_RE.test("-x")).toBe(false);
  });

  it("errors, name message and log line", () => {
    expect(API_ERRORS.FEAT_IN_USE).toMatch(/Рису/);
    expect(featNameTakenMessage("Alert")).toBe("Риса «Alert» уже є в кампанії");
    expect(CharacterLogKind.CHOICES_EDIT).toBe("choices_edit");
    expect(describeCharacterLog({ kind: "choices_edit", data: {} })).toBe("✎ Змінено вибори (раса, риси, опції класу)");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm test:run prisma/__tests__/migration-choices-feats.test.ts lib/constants/__tests__/choices.test.ts`
Expected: FAIL — файлу міграції й модуля `lib/constants/choices` немає.

- [ ] **Step 3: Types** — `types/choices.ts` (лише типи; `import type`):

```ts
import type { AbilityKey } from "@/lib/constants/abilities";
import type { CHOICE_KINDS, FEAT_TYPES } from "@/lib/constants/choices";
import type { DndSkill } from "@/lib/constants/skills";
import type { Ability } from "@/types/abilities";

export type ChoiceKind = (typeof CHOICE_KINDS)[number];

export type FeatType = (typeof FEAT_TYPES)[number];

export type ChoiceOwner = "race" | "class" | "feat";

export interface ChoiceOption {
  id: string;
  name: string;
  description?: string;
  /** рівень власника: у класі — рівень у класі, у расі — загальний */
  minLevel?: number;
  /** id інших опцій цього ж вибору */
  requires?: string[];
  abilities: Ability[];
  /** лише раса: відомі з загального рівня `level` */
  spells?: { level: number; spellId: string }[];
}

export interface Choice {
  id: string;
  label: string;
  description?: string;
  level: number;
  count: number | { scale: string };
  lineage?: true;
  kind: ChoiceKind;
  options?: ChoiceOption[];
  featTypes?: FeatType[];
  skills?: DndSkill[];
  abilities?: AbilityKey[];
  points?: number;
  max?: number;
  spells?: { lists: string[]; minLevel: number; maxLevel: number | "slots" };
}

export interface ChoicePick {
  id: string;
  /** лише пік риси: вкладені вибори цієї риси */
  picks?: Picks;
}

export type Picks = Record<string, ChoicePick[]>;

export interface CharacterFeat {
  id: string;
  picks?: Picks;
  source: "origin" | "dm";
}

export interface FeatPrerequisite {
  level?: number;
  /** «будь-яка з» характеристик не нижче `min` */
  scores?: { abilities: AbilityKey[]; min: number };
  text?: string;
}

export interface FeatData {
  id: string;
  name: string;
  icon: string | null;
  type: FeatType;
  prerequisite: FeatPrerequisite;
  repeatable: boolean;
  description: string | null;
  abilities: Ability[];
  choices: Choice[];
}

export type FeatFormData = Omit<FeatData, "id">;

export interface SpellRef {
  id: string;
  name: string;
  level: number;
  lists: string[];
}

export interface ChoiceRace {
  id: string;
  name: string;
  choices: Choice[];
}

export interface ChoicesState {
  raceChoices: Picks;
  feats: CharacterFeat[];
  classes: import("@/types/classes").CharacterClassEntry[];
}

export type ChoiceErrorCode =
  | "CHOICE_UNKNOWN"
  | "CHOICE_COUNT"
  | "CHOICE_DUPLICATE"
  | "CHOICE_LOCKED"
  | "CHOICE_MIN_LEVEL"
  | "CHOICE_REQUIRES"
  | "FEAT_TYPE"
  | "FEAT_PREREQUISITE"
  | "FEAT_NOT_REPEATABLE"
  | "SKILL_NOT_ALLOWED"
  | "EXPERTISE_NEEDS_PROFICIENCY"
  | "SPELL_NOT_IN_LIST"
  | "ABILITY_SCORE_CAP"
  | "CHOICES_NEED_CLASSES"
  | "ORIGIN_FEAT_ONLY_ONE"
  | "DM_FEAT_ONLY_DM";

export interface ChoiceIssue {
  /** "raceChoices.elven-lineage", "classes.<classId>.metamagic", "feats.0.<choiceId>" */
  path: string;
  code: ChoiceErrorCode;
  message: string;
}

export interface ChoicesBody {
  raceChoices?: Picks;
  feats?: CharacterFeat[];
  classChoices?: Record<string, Picks>;
}

export interface SheetChoices {
  pending: number;
  lineage: string | null;
  feats: Array<{ key: string; id: string; name: string; type: FeatType; from: string; picks: string[] }>;
  options: Array<{ owner: string; label: string; names: string[] }>;
  spellSources: Record<string, string>;
  expertise: DndSkill[];
}
```

Замість `import("@/types/classes")` у `ChoicesState` — звичайний `import type { CharacterClassEntry } from "@/types/classes";` угорі (цикл лише типовий; `import/no-cycle` не скаржиться на `import type`, якщо скаржиться — лишити інлайн `import("…")`).

- [ ] **Step 4: Constants** — `lib/constants/choices.ts`:

```ts
export const CHOICE_KINDS = ["option", "feat", "skill", "expertise", "abilityScore", "spell"] as const;

export const FEAT_TYPES = ["origin", "general", "fightingStyle", "epicBoon"] as const;

export const CHOICE_KIND_LABELS: Record<(typeof CHOICE_KINDS)[number], string> = {
  option: "Опції",
  feat: "Риса",
  skill: "Навички",
  expertise: "Експертиза",
  abilityScore: "Покращення характеристик",
  spell: "Заклинання",
};

export const FEAT_TYPE_LABELS: Record<(typeof FEAT_TYPES)[number], string> = {
  origin: "Походження",
  general: "Загальна",
  fightingStyle: "Стиль бою",
  epicBoon: "Епічний дар",
};

export const CHOICE_ID_RE = /^[a-z0-9][a-z0-9-]{0,63}$/;

export const CHOICE_LIMITS = {
  choices: 20,
  options: 40,
  picks: 30,
  count: 30,
  points: 4,
  max: 30,
  requires: 10,
  optionSpells: 10,
  description: 4000,
  lists: 20,
  listLength: 40,
  characterFeats: 30,
} as const;
```

`lib/constants/api-errors.ts` — після `CONVERT_TO_CLASSES_FIRST: …,`:

```ts
  FEAT_NOT_FOUND: "Рису не знайдено",
  FEAT_IN_USE: "Рису мають персонажі — спершу приберіть її з їхніх виборів",
  CHOICE_UNKNOWN: "Вибір не знайдено",
  CHOICE_COUNT: "Забагато виборів",
  CHOICE_DUPLICATE: "Вибір повторюється",
  CHOICE_LOCKED: "Цей вибір відкривається на вищому рівні — його не можна змінити",
  CHOICE_MIN_LEVEL: "Опція доступна з вищого рівня",
  CHOICE_REQUIRES: "Опція потребує іншої опції",
  FEAT_TYPE: "Риса цього типу тут недоступна",
  FEAT_PREREQUISITE: "Передумови риси не виконано",
  FEAT_NOT_REPEATABLE: "Цю рису не можна взяти двічі",
  SKILL_NOT_ALLOWED: "Навичка не входить у список вибору",
  EXPERTISE_NEEDS_PROFICIENCY: "Експертиза — лише в навичці з майстерністю",
  SPELL_NOT_IN_LIST: "Заклинання не входить у список або коло недоступне",
  ABILITY_SCORE_CAP: "Характеристика перевищить межу",
  CHOICES_NEED_CLASSES: "Риси й вибори класу — лише в режимі класів",
  ORIGIN_FEAT_ONLY_ONE: "Риса походження — лише одна",
  DM_FEAT_ONLY_DM: "Риси, видані ДМ, змінює лише ДМ",
```

і після `classNameTakenMessage`:

```ts
export const featNameTakenMessage = (name: string) => `Риса «${name}» уже є в кампанії`;
```

`lib/constants/character-log.ts` — у `CharacterLogKind` після `RESOURCES_EDIT: "resources_edit",` — `CHOICES_EDIT: "choices_edit",`. `lib/utils/characters/resources/describe-log.ts` — у `switch` після `case "resources_edit":` гілки:

```ts
    case "choices_edit":
      return "✎ Змінено вибори (раса, риси, опції класу)";
```

- [ ] **Step 5: Shared types** —
  - `types/classes.ts`: `import type { Choice, Picks } from "@/types/choices";`; `ClassFeature` + `choices?: Choice[];`; `GameClassData` + `spellList?: string | null;`; `CharacterClassEntry` + `choices?: Picks;`; `ClassLevelUpPick` + `choices?: Picks;`.
  - `types/races.ts`: `Race` + `choices?: Choice[];`, `RaceFormData` + `choices?: Choice[];`.
  - `types/spells.ts`: `Spell` + `lists?: string[];`, `SpellFormData` + `lists?: string[];`.
  - `types/characters.ts`: у `Character` (інтерфейс з `classes?: CharacterClassEntry[]` ~рядок 104) + `raceChoices?: Picks; feats?: CharacterFeat[];`; `CharacterFormData` + `choices?: { raceChoices: Picks; feats: CharacterFeat[] };`; `DraftInput` + `choices?: { raceChoices?: Picks; feats?: CharacterFeat[]; classChoices?: Picks };`; `CharacterSheet` + `choices?: SheetChoices;`, у `identity` після `race: string;` — `subrace?: string | null;`; `SheetCheck` + `expertise?: true;`.
  - `types/abilities.ts`: `AbilitySource.type` — додати `| "feat"`.
  - `lib/utils/battle/damage/impl.ts`: у `BONUS_PREFIX` після `class: "Бонус класу",` — `feat: "Бонус риси",`.
  - Run `pnpm exec tsc --noEmit -p tsconfig.json` — кожна інша помилка «Property 'feat' is missing in type Record<…sourceType…>» лікується рядком `feat: "Риса"` (підпис) у тому самому `Record`; інших змін типів не робити.

- [ ] **Step 6: Prisma** — `prisma/schema.prisma`:
  - у `model Campaign` поруч із `classes GameClass[]` — `feats Feat[]`;
  - у `model Race` після `abilities Json @default("[]")` — `choices Json @default("[]")`;
  - у `model Spell` після `addAbilityMod …` — `lists Json @default("[]")`;
  - у `model GameClass` після `columns Json @default("[]")` — `spellList String?`;
  - у `model Character` після `classes Json @default("[]")` — `feats Json @default("[]")` і `raceChoices Json @default("{}")`;
  - нова модель після `GameClass`:

```prisma
model Feat {
  id           String   @id @default(cuid())
  campaignId   String
  name         String
  icon         String?
  type         String   @default("general")
  prerequisite Json     @default("{}")
  repeatable   Boolean  @default(false)
  description  String?
  abilities    Json     @default("[]")
  choices      Json     @default("[]")
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
  sourceId     String?
  sourceHash   String?
  campaign     Campaign @relation(fields: [campaignId], references: [id], onDelete: Cascade)

  @@index([campaignId, name])
  @@map("feats")
}
```

`prisma/migrations/20261103000000_choices_feats/migration.sql`:

```sql
-- AlterTable
ALTER TABLE "races" ADD COLUMN "choices" JSONB NOT NULL DEFAULT '[]';

-- AlterTable
ALTER TABLE "spells" ADD COLUMN "lists" JSONB NOT NULL DEFAULT '[]';

-- AlterTable
ALTER TABLE "classes" ADD COLUMN "spellList" TEXT;

-- AlterTable
ALTER TABLE "characters" ADD COLUMN "feats" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN "raceChoices" JSONB NOT NULL DEFAULT '{}';

-- CreateTable
CREATE TABLE "feats" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "icon" TEXT,
    "type" TEXT NOT NULL DEFAULT 'general',
    "prerequisite" JSONB NOT NULL DEFAULT '{}',
    "repeatable" BOOLEAN NOT NULL DEFAULT false,
    "description" TEXT,
    "abilities" JSONB NOT NULL DEFAULT '[]',
    "choices" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "sourceId" TEXT,
    "sourceHash" TEXT,

    CONSTRAINT "feats_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "feats_campaignId_name_idx" ON "feats"("campaignId", "name");

-- AddForeignKey
ALTER TABLE "feats" ADD CONSTRAINT "feats_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "feats" ENABLE ROW LEVEL SECURITY;
```

Apply: `set -a; source .env.local; set +a; pnpm exec prisma migrate deploy && pnpm exec prisma generate`
Expected: `1 migration found … applied`; `Generated Prisma Client`. Потім `pnpm exec prisma migrate diff --from-schema-datasource prisma/schema.prisma --to-schema-datamodel prisma/schema.prisma --exit-code` (з тим самим `source .env.local`) — exit 0 (схема й БД збігаються; якщо команда недоступна у версії CLI — пропустити).

- [ ] **Step 7: Run tests**

Run: `pnpm test:run prisma/__tests__ lib/constants/__tests__/choices.test.ts lib/server/templates && pnpm exec tsc --noEmit -p tsconfig.json`
Expected: PASS; tsc без помилок. (`lib/server/templates` — бандл ще не знає `feats`, бо `BUNDLE_TABLES` перелічені вручну; таблиця з'явиться в задачі 4.)

- [ ] **Step 8: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/20261103000000_choices_feats prisma/__tests__/migration-choices-feats.test.ts types/choices.ts types/classes.ts types/races.ts types/spells.ts types/characters.ts types/abilities.ts lib/constants/choices.ts lib/constants/api-errors.ts lib/constants/character-log.ts lib/constants/__tests__/choices.test.ts lib/utils/characters/resources/describe-log.ts lib/utils/battle/damage/impl.ts
git commit -m "feat(constructor): 4f-4 feats table, choice columns and shared choice types

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

(Якщо tsc змусив додати `feat` у ще якісь `Record` — додати ці файли в той самий коміт.)

---
### Task 2: Zod-схеми виборів і рис, читачі без zod, `readChoiceList`, `maxSlotLevelFor`

**Files:**
- Create: `lib/schemas/choices.ts`, `lib/schemas/feats.ts`, `lib/utils/characters/choices/read.ts`
- Modify: `lib/schemas/index.ts`, `lib/utils/abilities/read.ts`, `lib/utils/spells/class-slots.ts`
- Test: `lib/schemas/__tests__/choices.test.ts`, `lib/utils/characters/choices/__tests__/read.test.ts`, `lib/utils/spells/__tests__/max-slot-level.test.ts`

**Interfaces:**
- Consumes: типи й константи задачі 1.
- Produces:
  - `lib/schemas/choices.ts`: `SpellListsSchema`, `ChoiceOptionSchema`, `ChoiceSchema`, `choicesSchemaFor(owner: ChoiceOwner)`, `RaceChoicesSchema`, `ClassChoicesSchema`, `FeatChoicesSchema`, `PicksSchema`, `CharacterFeatsSchema`, `ChoicesBodySchema`, `DraftChoicesSchema`, `FeatPrerequisiteSchema`.
  - `lib/schemas/feats.ts`: `createFeatSchema`, `updateFeatSchema`, `type CreateFeatInput`, `type UpdateFeatInput` (реекспорт з `lib/schemas/index.ts`).
  - `lib/utils/characters/choices/read.ts` (без zod): `readChoices(raw: unknown): Choice[]`, `readPicks(raw: unknown): Picks`, `readCharacterFeats(raw: unknown): CharacterFeat[]`, `readSpellLists(raw: unknown): string[]`, `hasPicks(picks: Picks | undefined): boolean`.
  - `lib/utils/abilities/read.ts`: `OwnerKind.FEAT = "feat"`, `featAbilities(row)`, `readChoiceList(raw: unknown): Choice[]` (як `readChoices`, але вміння опцій — через валідацію `read`); `classFeatureAbilities` тепер зберігає `choices` фічі (лише якщо непорожні).
  - `lib/utils/spells/class-slots.ts`: `maxSlotLevelFor(entry: ResolvedClassEntry): number`.

- [ ] **Step 1: Write the failing tests**

`lib/schemas/__tests__/choices.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { ChoicesBodySchema, ChoiceSchema, ClassChoicesSchema, FeatChoicesSchema, PicksSchema, RaceChoicesSchema } from "@/lib/schemas/choices";
import { createFeatSchema, updateFeatSchema } from "@/lib/schemas/feats";

const option = (id: string, extra: object = {}) => ({ id, name: id, abilities: [], ...extra });

const lineage = { id: "elven-lineage", label: "Elven Lineage", kind: "option", lineage: true, options: [option("drow"), option("wood-elf")] };

describe("ChoiceSchema", () => {
  it("defaults level 1 and count 1; kind fields are required", () => {
    expect(ChoiceSchema.parse({ id: "x", label: "X", kind: "skill" })).toMatchObject({ level: 1, count: 1 });
    expect(ChoiceSchema.safeParse({ id: "x", label: "X", kind: "option" }).success).toBe(false);
    expect(ChoiceSchema.safeParse({ id: "x", label: "X", kind: "feat" }).success).toBe(false);
    expect(ChoiceSchema.safeParse({ id: "x", label: "X", kind: "abilityScore" }).success).toBe(false);
    expect(ChoiceSchema.safeParse({ id: "x", label: "X", kind: "spell" }).success).toBe(false);
    expect(ChoiceSchema.safeParse({ id: "x", label: "X", kind: "spell", spells: { lists: ["Wizard"], minLevel: 1, maxLevel: "slots" } }).success).toBe(true);
  });

  it("option ids unique, requires point to known options", () => {
    expect(ChoiceSchema.safeParse({ id: "x", label: "X", kind: "option", options: [option("a"), option("a")] }).success).toBe(false);
    expect(ChoiceSchema.safeParse({ id: "x", label: "X", kind: "option", options: [option("a", { requires: ["b"] })] }).success).toBe(false);
    expect(ChoiceSchema.safeParse({ id: "x", label: "X", kind: "option", options: [option("b"), option("a", { requires: ["b"] })] }).success).toBe(true);
  });

  it("ids are kebab slugs", () => {
    expect(ChoiceSchema.safeParse({ id: "Elven Lineage", label: "X", kind: "skill" }).success).toBe(false);
  });
});

describe("owner rules", () => {
  it("race: count is a number, at most one lineage, unique ids", () => {
    expect(RaceChoicesSchema.safeParse([lineage]).success).toBe(true);
    expect(RaceChoicesSchema.safeParse([lineage, { ...lineage, id: "other" }]).success).toBe(false);
    expect(RaceChoicesSchema.safeParse([{ id: "k", label: "K", kind: "skill", count: { scale: "cantrips" } }]).success).toBe(false);
    expect(RaceChoicesSchema.safeParse([lineage, lineage]).success).toBe(false);
  });

  it("class: scale counts allowed, lineage not", () => {
    expect(ClassChoicesSchema.safeParse([{ id: "metamagic", label: "Metamagic", level: 2, kind: "option", count: { scale: "metamagic" }, options: [option("quickened")] }]).success).toBe(true);
    expect(ClassChoicesSchema.safeParse([lineage]).success).toBe(false);
  });

  it("feat: no nested feat choices, no scale, no lineage", () => {
    expect(FeatChoicesSchema.safeParse([{ id: "asi", label: "ASI", kind: "abilityScore", points: 2, max: 20 }]).success).toBe(true);
    expect(FeatChoicesSchema.safeParse([{ id: "f", label: "F", kind: "feat", featTypes: ["origin"] }]).success).toBe(false);
    expect(FeatChoicesSchema.safeParse([{ id: "s", label: "S", kind: "skill", count: { scale: "x" } }]).success).toBe(false);
  });
});

describe("picks and bodies", () => {
  it("picks: nested picks one level deep; body needs a field", () => {
    expect(PicksSchema.safeParse({ "ability-score-improvement-4": [{ id: "feat1", picks: { asi: [{ id: "strength" }, { id: "strength" }] } }] }).success).toBe(true);
    expect(PicksSchema.parse({ a: [{ id: "x", picks: { b: [{ id: "y", picks: { c: [] } }] } }] }).a[0].picks?.b[0]).toEqual({ id: "y" });
    expect(ChoicesBodySchema.safeParse({}).success).toBe(false);
    expect(ChoicesBodySchema.safeParse({ feats: [{ id: "f1", source: "origin" }] }).success).toBe(true);
    expect(ChoicesBodySchema.safeParse({ feats: [{ id: "f1", source: "class" }] }).success).toBe(false);
  });
});

describe("feat schemas", () => {
  it("create defaults; prerequisite shape; update is partial", () => {
    expect(createFeatSchema.parse({ name: "Alert" })).toMatchObject({ type: "general", repeatable: false, prerequisite: {}, abilities: [], choices: [] });
    expect(createFeatSchema.safeParse({ name: "G", prerequisite: { level: 4, scores: { abilities: ["strength", "dexterity"], min: 13 } } }).success).toBe(true);
    expect(createFeatSchema.safeParse({ name: "G", type: "boon" }).success).toBe(false);
    expect(updateFeatSchema.parse({ repeatable: true })).toEqual({ repeatable: true });
  });
});
```

`lib/utils/characters/choices/__tests__/read.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { classFeatureAbilities, readChoiceList } from "@/lib/utils/abilities/read";
import { hasPicks, readCharacterFeats, readChoices, readPicks, readSpellLists } from "@/lib/utils/characters/choices/read";

const note = { id: "n", name: "N", trigger: { event: "passive" }, effects: [{ kind: "note", text: "N" }] };

describe("tolerant readers", () => {
  it("readPicks keeps two levels, drops junk", () => {
    expect(readPicks({ a: [{ id: "x", picks: { b: [{ id: "y", picks: { c: [{ id: "z" }] } }, { nope: 1 }] } }, "bad"], c: "x" })).toEqual({ a: [{ id: "x", picks: { b: [{ id: "y" }] } }] });
    expect(readPicks(null)).toEqual({});
    expect(hasPicks({ a: [] })).toBe(false);
    expect(hasPicks({ a: [{ id: "x" }] })).toBe(true);
  });

  it("readCharacterFeats keeps origin/dm only", () => {
    expect(readCharacterFeats([{ id: "f", source: "origin" }, { id: "g", source: "class" }, { id: "", source: "dm" }, 3])).toEqual([{ id: "f", source: "origin" }]);
  });

  it("readChoices drops malformed choices and fills defaults", () => {
    expect(readChoices([{ id: "k", label: "K", kind: "skill" }, { id: "x", kind: "nope", label: "X" }, "z"])).toEqual([{ id: "k", label: "K", kind: "skill", level: 1, count: 1 }]);
    expect(readSpellLists(["Wizard", 3, " "])).toEqual(["Wizard"]);
  });

  it("readChoiceList validates option abilities; class features keep choices only when present", () => {
    const list = readChoiceList([{ id: "l", label: "L", kind: "option", options: [{ id: "a", name: "A", abilities: [note, { id: "bad" }] }] }]);

    expect(list[0].options?.[0].abilities).toEqual([expect.objectContaining({ id: "n" })]);
    expect(classFeatureAbilities([{ level: 2, abilities: [] }])).toEqual([{ level: 2, abilities: [] }]);
    expect(classFeatureAbilities([{ level: 2, abilities: [], choices: [{ id: "k", label: "K", kind: "skill" }] }])[0].choices).toHaveLength(1);
  });
});
```

`lib/utils/spells/__tests__/max-slot-level.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { maxSlotLevelFor } from "@/lib/utils/spells/class-slots";
import type { GameClassData, ResolvedClassEntry } from "@/types/classes";

const cls = (caster: GameClassData["caster"]): GameClassData => ({ id: caster, name: caster, icon: null, color: null, hitDie: 8, savingThrows: [], proficiencies: { armor: [], weapons: [], tools: [] }, skillChoices: { count: 0, from: [] }, caster, spellcastingAbility: "intelligence", features: [], subclassLevel: 3, subclasses: [] });

const entry = (caster: GameClassData["caster"], level: number): ResolvedClassEntry => ({ classId: caster, level, class: cls(caster), subclass: null });

describe("maxSlotLevelFor", () => {
  it("highest slot of this class alone; pact counts its slot level", () => {
    expect(maxSlotLevelFor(entry("full", 1))).toBe(1);
    expect(maxSlotLevelFor(entry("full", 5))).toBe(3);
    expect(maxSlotLevelFor(entry("half", 1))).toBe(0);
    expect(maxSlotLevelFor(entry("half", 5))).toBe(2);
    expect(maxSlotLevelFor(entry("pact", 5))).toBe(3);
    expect(maxSlotLevelFor(entry("none", 20))).toBe(0);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm test:run lib/schemas/__tests__/choices.test.ts lib/utils/characters/choices/__tests__/read.test.ts lib/utils/spells/__tests__/max-slot-level.test.ts`
Expected: FAIL — модулів немає.

- [ ] **Step 3: Zod** — `lib/schemas/choices.ts`:

```ts
import { z } from "zod";

import { ABILITY_KEYS } from "@/lib/constants/abilities";
import { CHOICE_ID_RE, CHOICE_KINDS, CHOICE_LIMITS, FEAT_TYPES } from "@/lib/constants/choices";
import { CLASS_COLUMN_KEY_RE } from "@/lib/constants/classes";
import { DND_SKILLS } from "@/lib/constants/skills";
import { AbilitiesSchema } from "@/lib/utils/abilities/schema";
import type { Choice, ChoiceOwner } from "@/types/choices";

const choiceId = z.string().regex(CHOICE_ID_RE, "Id — малі латинські літери, цифри й дефіс");

const description = z.string().max(CHOICE_LIMITS.description).optional();

export const SpellListsSchema = z.array(z.string().trim().min(1).max(CHOICE_LIMITS.listLength)).max(CHOICE_LIMITS.lists);

export const ChoiceOptionSchema = z.object({
  id: choiceId,
  name: z.string().trim().min(1).max(100),
  description,
  minLevel: z.number().int().min(1).max(20).optional(),
  requires: z.array(choiceId).max(CHOICE_LIMITS.requires).optional(),
  abilities: AbilitiesSchema.default([]),
  spells: z
    .array(z.object({ level: z.number().int().min(1).max(20), spellId: z.string().trim().min(1).max(100) }))
    .max(CHOICE_LIMITS.optionSpells)
    .optional(),
});

const countSchema = z.union([z.number().int().min(1).max(CHOICE_LIMITS.count), z.object({ scale: z.string().regex(CLASS_COLUMN_KEY_RE).max(40) })]);

function kindIssues(c: Choice, ctx: z.RefinementCtx) {
  const need = (ok: boolean, path: (string | number)[], message: string) => {
    if (!ok) ctx.addIssue({ code: "custom", path, message });
  };

  need(c.kind !== "option" || (c.options?.length ?? 0) > 0, ["options"], "Додайте хоча б одну опцію");
  need(c.kind !== "feat" || (c.featTypes?.length ?? 0) > 0, ["featTypes"], "Оберіть типи рис");
  need(c.kind !== "abilityScore" || !!c.points, ["points"], "Вкажіть, скільки разів +1");
  need(c.kind !== "spell" || !!c.spells, ["spells"], "Вкажіть списки й кола");
  need(!c.spells || c.spells.maxLevel === "slots" || c.spells.maxLevel >= c.spells.minLevel, ["spells", "maxLevel"], "Найвище коло менше за найнижче");

  const ids = (c.options ?? []).map((o) => o.id);

  need(new Set(ids).size === ids.length, ["options"], "Id опцій повторюються");

  (c.options ?? []).forEach((o, i) => need((o.requires ?? []).every((r) => r !== o.id && ids.includes(r)), ["options", i, "requires"], "Вимога посилається на невідому опцію"));
}

export const ChoiceSchema = z
  .object({
    id: choiceId,
    label: z.string().trim().min(1).max(100),
    description,
    level: z.number().int().min(1).max(20).default(1),
    count: countSchema.default(1),
    lineage: z.literal(true).optional(),
    kind: z.enum(CHOICE_KINDS),
    options: z.array(ChoiceOptionSchema).max(CHOICE_LIMITS.options).optional(),
    featTypes: z.array(z.enum(FEAT_TYPES)).min(1).max(FEAT_TYPES.length).optional(),
    skills: z.array(z.enum(DND_SKILLS)).max(DND_SKILLS.length).optional(),
    abilities: z.array(z.enum(ABILITY_KEYS)).min(1).max(ABILITY_KEYS.length).optional(),
    points: z.number().int().min(1).max(CHOICE_LIMITS.points).optional(),
    max: z.number().int().min(1).max(CHOICE_LIMITS.max).optional(),
    spells: z
      .object({ lists: SpellListsSchema, minLevel: z.number().int().min(0).max(9), maxLevel: z.union([z.number().int().min(0).max(9), z.literal("slots")]) })
      .optional(),
  })
  .superRefine((c, ctx) => kindIssues(c as Choice, ctx));

function ownerIssues(owner: ChoiceOwner) {
  return (list: Choice[], ctx: z.RefinementCtx) => {
    const ids = list.map((c) => c.id);

    if (new Set(ids).size !== ids.length) ctx.addIssue({ code: "custom", path: [], message: "Id виборів повторюються" });

    if (owner !== "race" && list.some((c) => c.lineage)) ctx.addIssue({ code: "custom", path: [], message: "Лінія — лише у вибору раси" });

    if (owner === "race" && list.filter((c) => c.lineage).length > 1) ctx.addIssue({ code: "custom", path: [], message: "Раса має не більше однієї лінії" });

    list.forEach((c, i) => {
      if (owner !== "class" && typeof c.count !== "number") ctx.addIssue({ code: "custom", path: [i, "count"], message: "Кількість «з таблиці класу» — лише у класі" });

      if (owner === "feat" && c.kind === "feat") ctx.addIssue({ code: "custom", path: [i, "kind"], message: "Риса не може містити вибір риси" });
    });
  };
}

export const choicesSchemaFor = (owner: ChoiceOwner) => z.array(ChoiceSchema).max(CHOICE_LIMITS.choices).superRefine(ownerIssues(owner));

export const RaceChoicesSchema = choicesSchemaFor("race");

export const ClassChoicesSchema = choicesSchemaFor("class");

export const FeatChoicesSchema = choicesSchemaFor("feat");

const pickId = z.string().trim().min(1).max(100);

const leafPicks = z.record(choiceId, z.array(z.object({ id: pickId })).max(CHOICE_LIMITS.picks));

export const PicksSchema = z.record(choiceId, z.array(z.object({ id: pickId, picks: leafPicks.optional() })).max(CHOICE_LIMITS.picks));

export const CharacterFeatsSchema = z
  .array(z.object({ id: pickId, picks: leafPicks.optional(), source: z.enum(["origin", "dm"]) }))
  .max(CHOICE_LIMITS.characterFeats);

export const ChoicesBodySchema = z
  .object({ raceChoices: PicksSchema.optional(), feats: CharacterFeatsSchema.optional(), classChoices: z.record(z.string().min(1).max(100), PicksSchema).optional() })
  .refine((b) => b.raceChoices !== undefined || b.feats !== undefined || b.classChoices !== undefined, { message: "Немає виборів для збереження" });

export const DraftChoicesSchema = z.object({ raceChoices: PicksSchema.optional(), feats: CharacterFeatsSchema.optional(), classChoices: PicksSchema.optional() });

export const FeatPrerequisiteSchema = z.object({
  level: z.number().int().min(1).max(20).optional(),
  scores: z.object({ abilities: z.array(z.enum(ABILITY_KEYS)).min(1).max(ABILITY_KEYS.length), min: z.number().int().min(1).max(30) }).optional(),
  text: z.string().trim().max(200).optional(),
});
```

`lib/schemas/feats.ts`:

```ts
import { z } from "zod";

import { FEAT_TYPES } from "@/lib/constants/choices";
import { FeatChoicesSchema, FeatPrerequisiteSchema } from "@/lib/schemas/choices";
import { AbilitiesSchema } from "@/lib/utils/abilities/schema";

const featIconSchema = z.preprocess(
  (v) => (v === "" ? null : v),
  z.string().max(2000).refine((v) => !v.startsWith("data:"), "Іконка риси — лише посилання на зображення").nullable().optional(),
);

const featFields = {
  name: z.string().trim().min(1).max(100),
  icon: featIconSchema,
  type: z.enum(FEAT_TYPES),
  prerequisite: FeatPrerequisiteSchema,
  repeatable: z.boolean(),
  description: z.string().max(8000).nullable(),
  abilities: AbilitiesSchema,
  choices: FeatChoicesSchema,
};

export const createFeatSchema = z.object({
  ...featFields,
  type: featFields.type.default("general"),
  prerequisite: featFields.prerequisite.prefault({}),
  repeatable: featFields.repeatable.default(false),
  description: featFields.description.optional(),
  abilities: featFields.abilities.describe("Вміння риси").default([]),
  choices: featFields.choices.describe("Вкладені вибори риси (без виду feat)").default([]),
});

export const updateFeatSchema = z.object(featFields).partial();

export type CreateFeatInput = z.infer<typeof createFeatSchema>;

export type UpdateFeatInput = z.infer<typeof updateFeatSchema>;
```

`lib/schemas/index.ts` — дописати `export * from "./choices";` і `export * from "./feats";` (за абеткою серед наявних рядків).

- [ ] **Step 4: Readers without zod** — `lib/utils/characters/choices/read.ts`:

```ts
import { CHOICE_KINDS } from "@/lib/constants/choices";
import { isRecord } from "@/lib/utils/common/is-record";
import type { Ability } from "@/types/abilities";
import type { CharacterFeat, Choice, ChoiceOption, Picks } from "@/types/choices";

const KINDS = new Set<string>(CHOICE_KINDS);

const isPick = (v: unknown): v is { id: string; picks?: unknown } => isRecord(v) && typeof v.id === "string" && v.id !== "";

function picksAt(raw: unknown, depth: number): Picks {
  if (!isRecord(raw)) return {};

  return Object.fromEntries(
    Object.entries(raw).flatMap(([key, list]) =>
      Array.isArray(list) ? [[key, list.filter(isPick).map((p) => (depth > 0 && isRecord(p.picks) ? { id: p.id, picks: picksAt(p.picks, depth - 1) } : { id: p.id }))]] : [],
    ),
  );
}

export const readPicks = (raw: unknown): Picks => picksAt(raw, 1);

export const hasPicks = (picks: Picks | undefined): boolean => !!picks && Object.values(picks).some((list) => list.length > 0);

export function readCharacterFeats(raw: unknown): CharacterFeat[] {
  if (!Array.isArray(raw)) return [];

  return raw.flatMap((f) => {
    if (!isPick(f) || !isRecord(f) || (f.source !== "origin" && f.source !== "dm")) return [];

    return [{ id: f.id, source: f.source, ...(isRecord(f.picks) && { picks: picksAt(f.picks, 0) }) }];
  });
}

function readOption(raw: unknown): ChoiceOption[] {
  if (!isRecord(raw) || typeof raw.id !== "string" || typeof raw.name !== "string") return [];

  return [{ ...(raw as unknown as ChoiceOption), abilities: Array.isArray(raw.abilities) ? (raw.abilities as Ability[]) : [] }];
}

export function readChoices(raw: unknown): Choice[] {
  if (!Array.isArray(raw)) return [];

  return raw.flatMap((c): Choice[] => {
    if (!isRecord(c) || typeof c.id !== "string" || typeof c.label !== "string" || typeof c.kind !== "string" || !KINDS.has(c.kind)) return [];

    const level = typeof c.level === "number" ? c.level : 1;

    const count = typeof c.count === "number" || (isRecord(c.count) && typeof c.count.scale === "string") ? c.count : 1;

    return [{ ...(c as unknown as Choice), level, count: count as Choice["count"], ...(Array.isArray(c.options) && { options: c.options.flatMap(readOption) }) }];
  });
}

export const readSpellLists = (raw: unknown): string[] => (Array.isArray(raw) ? raw.filter((s): s is string => typeof s === "string" && s.trim() !== "") : []);
```

- [ ] **Step 5: `read.ts`** — `lib/utils/abilities/read.ts`:
  - `OwnerKind` — додати `FEAT: "feat",`;
  - після `unitAbilities` — `export const featAbilities = (row: OwnerRow) => read(row);`;
  - імпорт `import { readChoices } from "@/lib/utils/characters/choices/read";` і `import type { Choice } from "@/types/choices";`;
  - нова функція:

```ts
export function readChoiceList(raw: unknown): Choice[] {
  return readChoices(raw).map((c) => (c.options ? { ...c, options: c.options.map((o) => ({ ...o, abilities: read({ id: `choice-option@${c.id}.${o.id}`, abilities: o.abilities }) })) } : c));
}
```

  - у `classFeatureAbilities` — `const { level, abilities, choices } = f as { level?: unknown; abilities?: unknown; choices?: unknown };`, після перевірки рівня:

```ts
    const list = readChoiceList(choices);

    return [{ level, abilities: read({ id: `class-feature@${level}`, abilities }), ...(list.length > 0 && { choices: list }) }];
```

- [ ] **Step 6: `maxSlotLevelFor`** — `lib/utils/spells/class-slots.ts`, після `classSpellSlots`:

```ts
export function maxSlotLevelFor(entry: ResolvedClassEntry): number {
  const slots = classSpellSlots([entry]);

  const regular = Object.keys(slots).filter((k) => k !== PACT_KEY).map(Number).filter(Number.isFinite);

  return Math.max(0, slots[PACT_KEY]?.level ?? 0, ...regular);
}
```

- [ ] **Step 7: Run tests**

Run: `pnpm test:run lib/schemas lib/utils/characters/choices lib/utils/spells lib/utils/abilities lib/__tests__/client-entry-imports.test.ts && pnpm exec tsc --noEmit -p tsconfig.json`
Expected: PASS (наявні тести `classFeatureAbilities` і `toGameClassData` не змінюються — `choices` з'являється лише за наявності).

- [ ] **Step 8: Commit**

```bash
git add lib/schemas/choices.ts lib/schemas/feats.ts lib/schemas/index.ts lib/schemas/__tests__/choices.test.ts lib/utils/characters/choices/read.ts lib/utils/characters/choices/__tests__/read.test.ts lib/utils/abilities/read.ts lib/utils/spells/class-slots.ts lib/utils/spells/__tests__/max-slot-level.test.ts
git commit -m "feat(constructor): 4f-4 choice and feat schemas, zod-free readers, max slot level

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---
### Task 3: Чисті функції виборів — кількість, перевірка, дельта ASI, невибрані, план збереження

**Files:**
- Create: `lib/utils/characters/choices/count.ts`, `lib/utils/characters/choices/class-choices.ts`, `lib/utils/characters/choices/validate.ts`, `lib/utils/characters/choices/walk.ts`, `lib/utils/characters/choices/ability.ts`, `lib/utils/characters/choices/pending.ts`, `lib/utils/characters/choices/picks.ts`, `lib/utils/characters/choices/plan.ts`
- Test: `lib/utils/characters/choices/__tests__/fixtures.ts`, `lib/utils/characters/choices/__tests__/validate.test.ts`, `lib/utils/characters/choices/__tests__/ability.test.ts`, `lib/utils/characters/choices/__tests__/pending.test.ts`, `lib/utils/characters/choices/__tests__/picks.test.ts`, `lib/utils/characters/choices/__tests__/plan.test.ts`

**Interfaces:**
- Consumes: типи задачі 1; `readPicks`, `readCharacterFeats`, `hasPicks` (задача 2); `maxSlotLevelFor` (задача 2); `columnValueAt` (`lib/utils/characters/classes/columns.ts`).
- Produces (усе без zod):
  - `count.ts`: `resolveChoiceCount(choice: Choice, level: number, columns?: readonly ClassColumn[]): number` (для `abilityScore` — `points`); `isChoiceOpen(choice: Choice, level: number, owner: ChoiceOwner): boolean`.
  - `class-choices.ts`: `classChoiceDefs(cls: GameClassData, subclass: Subclass | null): Choice[]`.
  - `validate.ts`: `interface PickContext { owner; level; totalLevel; columns?; maxSlotLevel?; featsById; spellsById; proficient: ReadonlySet<DndSkill>; scores: Readonly<Record<AbilityKey, number>>; featCounts: ReadonlyMap<string, number> }`, `choiceIssue(path, code, detail?)`, `featPrerequisiteMet(feat, ctx: { totalLevel; scores })`, `validatePicks(choices, picks, ctx, path): ChoiceIssue[]`.
  - `walk.ts`: `interface ChoiceRefs { race: ChoiceRace | null; classesById; featsById; spellsById }`, `interface PickVisit { choice; picks; open; target; path }`, `visitPicks(state, refs, opts: { level: number; classMode: boolean }): PickVisit[]`, `countFeats(visits, state, classMode): Map<string, number>`, `skillPicksOf(visits, kind: "skill" | "expertise"): DndSkill[]`, `skillFlags(raw: unknown): DndSkill[]`.
  - `ability.ts`: `interface AbilityPick { ability: AbilityKey; max: number }`, `abilityPicksOf(visits)`, `abilityScoreDelta(before, after): Partial<Record<AbilityKey, number>>`, `capIssues(scores, delta, after): ChoiceIssue[]`, `applyDelta(scores, delta): Partial<Record<AbilityKey, number>>`.
  - `pending.ts`: `pendingCount(visits: readonly PickVisit[], refs: Pick<ChoiceRefs, "featsById">): number`.
  - `picks.ts`: `choicesStateOf(row: { raceChoices?: unknown; feats?: unknown; classes?: unknown }): ChoicesState`, `keepStoredPicks(next: CharacterClassEntry[], stored: unknown): CharacterClassEntry[]`, `withClassPicks(entries, classChoices: Record<string, Picks>): CharacterClassEntry[]`, `lineageName(race: ChoiceRace | null, picks: Picks): string | null | undefined`.
  - `plan.ts`: `interface PlanInput { before; after; refs: ChoiceRefs; classMode; isDM; level; scores: Record<AbilityKey, number>; skills: unknown }`, `type PlanResult = { ok: true; state: ChoicesState; subrace: string | null | undefined; scores: Partial<Record<AbilityKey, number>> } | { ok: false; status: 403 | 422; code: ChoiceErrorCode; message: string; issues: ChoiceIssue[] }`, `planChoices(input: PlanInput): PlanResult`.

- [ ] **Step 1: Shared fixtures** — `lib/utils/characters/choices/__tests__/fixtures.ts`:

```ts
import type { AbilityKey } from "@/lib/constants/abilities";
import type { ChoiceRefs } from "@/lib/utils/characters/choices/walk";
import type { Ability } from "@/types/abilities";
import type { ChoiceRace, FeatData, SpellRef } from "@/types/choices";
import type { GameClassData } from "@/types/classes";

export const note = (id: string): Ability => ({ id, name: id, trigger: { event: "passive" }, effects: [{ kind: "note", text: id }] });

const column = (key: string, at: (level: number) => string) => ({ key, label: key, values: Array.from({ length: 20 }, (_, i) => at(i + 1)) });

export const elf: ChoiceRace = {
  id: "race-elf",
  name: "Elf",
  choices: [
    {
      id: "elven-lineage",
      label: "Elven Lineage",
      level: 1,
      count: 1,
      lineage: true,
      kind: "option",
      options: [
        { id: "drow", name: "Drow", abilities: [note("superior-darkvision")], spells: [{ level: 1, spellId: "sp-dancing" }, { level: 3, spellId: "sp-faerie" }] },
        { id: "wood-elf", name: "Wood Elf", abilities: [{ id: "speed", name: "Speed", trigger: { event: "passive" }, effects: [{ kind: "modifyStat", stat: "speed", flat: 5 }] }], spells: [{ level: 1, spellId: "sp-druidcraft" }, { level: 3, spellId: "sp-longstrider" }] },
      ],
    },
    { id: "keen-senses", label: "Keen Senses", level: 1, count: 1, kind: "skill", skills: ["insight", "perception", "survival"] },
  ],
};

const base = { icon: null, color: null, savingThrows: [], proficiencies: { armor: [], weapons: [], tools: [] }, skillChoices: { count: 0, from: [] }, subclassLevel: 3, subclasses: [] };

export const sorcerer: GameClassData = {
  ...base,
  id: "cls-sorc",
  name: "Sorcerer",
  hitDie: 6,
  caster: "full",
  spellcastingAbility: "charisma",
  spellList: "Sorcerer",
  columns: [column("cantrips", (l) => (l < 4 ? "4" : l < 10 ? "5" : "6")), column("metamagic", (l) => (l < 2 ? "" : l < 10 ? "2" : l < 17 ? "4" : "6"))],
  features: [
    {
      level: 1,
      abilities: [],
      choices: [
        { id: "cantrips", label: "Cantrips", level: 1, count: { scale: "cantrips" }, kind: "spell", spells: { lists: ["Sorcerer"], minLevel: 0, maxLevel: 0 } },
        { id: "prepared-spells", label: "Prepared Spells", level: 1, count: 2, kind: "spell", spells: { lists: ["Sorcerer"], minLevel: 1, maxLevel: "slots" } },
      ],
    },
    {
      level: 2,
      abilities: [],
      choices: [
        {
          id: "metamagic",
          label: "Metamagic",
          level: 2,
          count: { scale: "metamagic" },
          kind: "option",
          options: [
            { id: "quickened", name: "Quickened Spell", abilities: [note("quickened")] },
            { id: "twinned", name: "Twinned Spell", abilities: [] },
            { id: "careful", name: "Careful Spell", minLevel: 3, abilities: [] },
            { id: "empowered", name: "Empowered Spell", requires: ["careful"], abilities: [] },
          ],
        },
      ],
    },
    { level: 4, abilities: [], choices: [{ id: "ability-score-improvement-4", label: "Ability Score Improvement", level: 4, count: 1, kind: "feat", featTypes: ["origin", "general"] }] },
  ],
};

export const rogue: GameClassData = {
  ...base,
  id: "cls-rogue",
  name: "Rogue",
  hitDie: 8,
  caster: "none",
  spellcastingAbility: null,
  columns: [],
  features: [{ level: 1, abilities: [], choices: [{ id: "expertise-1", label: "Expertise", level: 1, count: 2, kind: "expertise" }] }],
};

export const asi: FeatData = { id: "f-asi", name: "Ability Score Improvement", icon: null, type: "general", prerequisite: { level: 4 }, repeatable: true, description: null, abilities: [], choices: [{ id: "asi", label: "Ability Score Increase", level: 1, count: 1, kind: "abilityScore", points: 2, max: 20 }] };

export const grappler: FeatData = {
  id: "f-grappler",
  name: "Grappler",
  icon: null,
  type: "general",
  prerequisite: { level: 4, scores: { abilities: ["strength", "dexterity"], min: 13 } },
  repeatable: false,
  description: null,
  abilities: [note("punch-and-grab")],
  choices: [{ id: "grappler-asi", label: "Ability Score Increase", level: 1, count: 1, kind: "abilityScore", abilities: ["strength", "dexterity"], points: 1, max: 20 }],
};

export const alert: FeatData = { id: "f-alert", name: "Alert", icon: null, type: "origin", prerequisite: {}, repeatable: false, description: null, abilities: [{ id: "alert", name: "Alert", trigger: { event: "passive" }, effects: [{ kind: "modifyStat", stat: "initiative", flat: { formula: "prof" } }] }], choices: [] };

export const magicInitiate: FeatData = {
  id: "f-mi",
  name: "Magic Initiate",
  icon: null,
  type: "origin",
  prerequisite: {},
  repeatable: true,
  description: null,
  abilities: [],
  choices: [{ id: "cantrips", label: "Cantrips", level: 1, count: 2, kind: "spell", spells: { lists: ["Cleric", "Druid", "Wizard"], minLevel: 0, maxLevel: 0 } }],
};

export const archery: FeatData = { id: "f-archery", name: "Archery", icon: null, type: "fightingStyle", prerequisite: {}, repeatable: false, description: null, abilities: [{ id: "archery", name: "Archery", trigger: { event: "passive" }, effects: [{ kind: "modifyStat", stat: "attackBonus", flat: 2, attackKind: "ranged" }] }], choices: [] };

export const featsById = Object.fromEntries([asi, grappler, alert, magicInitiate, archery].map((f) => [f.id, f]));

export const spells: SpellRef[] = [
  { id: "sp-firebolt", name: "Fire Bolt", level: 0, lists: ["Sorcerer", "Wizard"] },
  { id: "sp-guidance", name: "Guidance", level: 0, lists: ["Cleric", "Druid"] },
  { id: "sp-missile", name: "Magic Missile", level: 1, lists: ["Sorcerer", "Wizard"] },
  { id: "sp-cure", name: "Cure Wounds", level: 1, lists: ["Cleric", "Druid"] },
  { id: "sp-fireball", name: "Fireball", level: 3, lists: ["Sorcerer", "Wizard"] },
];

export const spellsById = Object.fromEntries(spells.map((s) => [s.id, s]));

export const refs: ChoiceRefs = { race: elf, classesById: { [sorcerer.id]: sorcerer, [rogue.id]: rogue }, featsById, spellsById };

export const scores: Record<AbilityKey, number> = { strength: 15, dexterity: 14, constitution: 13, intelligence: 10, wisdom: 12, charisma: 17 };

export const empty = { raceChoices: {}, feats: [], classes: [] };
```

- [ ] **Step 2: Write the failing tests**

`lib/utils/characters/choices/__tests__/validate.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { featsById, scores, sorcerer, spellsById } from "./fixtures";

import { classChoiceDefs } from "@/lib/utils/characters/choices/class-choices";
import { resolveChoiceCount } from "@/lib/utils/characters/choices/count";
import { type PickContext, validatePicks } from "@/lib/utils/characters/choices/validate";
import type { DndSkill } from "@/lib/constants/skills";
import type { Picks } from "@/types/choices";

const defs = classChoiceDefs(sorcerer, null);

const ctx = (level: number, extra: Partial<PickContext> = {}): PickContext => ({
  owner: "class",
  level,
  totalLevel: level,
  columns: sorcerer.columns,
  maxSlotLevel: level >= 5 ? 3 : 1,
  featsById,
  spellsById,
  proficient: new Set<DndSkill>(["stealth"]),
  scores,
  featCounts: new Map(),
  ...extra,
});

const codes = (picks: Picks, level: number, extra?: Partial<PickContext>) => validatePicks(defs, picks, ctx(level, extra), "classes.cls-sorc").map((i) => i.code);

describe("resolveChoiceCount", () => {
  it("number, class column at the class level, abilityScore → points", () => {
    const metamagic = defs.find((d) => d.id === "metamagic")!;

    expect(resolveChoiceCount(metamagic, 2, sorcerer.columns)).toBe(2);
    expect(resolveChoiceCount(metamagic, 10, sorcerer.columns)).toBe(4);
    expect(resolveChoiceCount(metamagic, 17, sorcerer.columns)).toBe(6);
    expect(resolveChoiceCount(metamagic, 2, [])).toBe(0);
    expect(resolveChoiceCount({ id: "a", label: "A", level: 1, count: 1, kind: "abilityScore", points: 2 }, 1)).toBe(2);
  });
});

describe("validatePicks", () => {
  it("options: unknown, minLevel, requires, duplicate, count", () => {
    expect(codes({ metamagic: [{ id: "nope" }] }, 2)).toEqual(["CHOICE_UNKNOWN"]);
    expect(codes({ metamagic: [{ id: "careful" }] }, 2)).toEqual(["CHOICE_MIN_LEVEL"]);
    expect(codes({ metamagic: [{ id: "empowered" }] }, 3)).toEqual(["CHOICE_REQUIRES"]);
    expect(codes({ metamagic: [{ id: "careful" }, { id: "empowered" }] }, 3)).toEqual([]);
    expect(codes({ metamagic: [{ id: "quickened" }, { id: "quickened" }] }, 2)).toEqual(["CHOICE_DUPLICATE"]);
    expect(codes({ metamagic: [{ id: "quickened" }, { id: "twinned" }, { id: "careful" }] }, 3)).toEqual(["CHOICE_COUNT"]);
    expect(codes({ metamagic: [{ id: "quickened" }, { id: "twinned" }, { id: "careful" }] }, 10)).toEqual([]);
  });

  it("unknown choice id is an error; a closed choice is skipped", () => {
    expect(codes({ ghost: [{ id: "x" }] }, 2)).toEqual(["CHOICE_UNKNOWN"]);
    expect(codes({ "ability-score-improvement-4": [{ id: "anything" }] }, 2)).toEqual([]);
  });

  it("spells: list tag and circle up to the class' highest slot", () => {
    expect(codes({ cantrips: [{ id: "sp-firebolt" }] }, 1)).toEqual([]);
    expect(codes({ cantrips: [{ id: "sp-guidance" }] }, 1)).toEqual(["SPELL_NOT_IN_LIST"]);
    expect(codes({ "prepared-spells": [{ id: "sp-missile" }] }, 1)).toEqual([]);
    expect(codes({ "prepared-spells": [{ id: "sp-cure" }] }, 1)).toEqual(["SPELL_NOT_IN_LIST"]);
    expect(codes({ "prepared-spells": [{ id: "sp-fireball" }] }, 1)).toEqual(["SPELL_NOT_IN_LIST"]);
    expect(codes({ "prepared-spells": [{ id: "sp-fireball" }] }, 5)).toEqual([]);
  });

  it("feats: type, prerequisite (level and any-of scores), not repeatable, nested picks", () => {
    expect(codes({ "ability-score-improvement-4": [{ id: "f-archery" }] }, 4)).toEqual(["FEAT_TYPE"]);
    expect(codes({ "ability-score-improvement-4": [{ id: "f-grappler" }] }, 4, { scores: { ...scores, strength: 12, dexterity: 12 } })).toEqual(["FEAT_PREREQUISITE"]);
    expect(codes({ "ability-score-improvement-4": [{ id: "f-grappler", picks: { "grappler-asi": [{ id: "dexterity" }] } }] }, 4)).toEqual([]);
    expect(codes({ "ability-score-improvement-4": [{ id: "f-grappler" }] }, 4, { featCounts: new Map([["f-grappler", 2]]) })).toEqual(["FEAT_NOT_REPEATABLE"]);
    expect(codes({ "ability-score-improvement-4": [{ id: "f-grappler", picks: { "grappler-asi": [{ id: "charisma" }] } }] }, 4)).toEqual(["CHOICE_UNKNOWN"]);
    expect(codes({ "ability-score-improvement-4": [{ id: "f-asi", picks: { asi: [{ id: "strength" }, { id: "strength" }, { id: "dexterity" }] } }] }, 4)).toEqual(["CHOICE_COUNT"]);
  });

  it("skills and expertise", () => {
    const skillDefs = [
      { id: "keen", label: "Keen", level: 1, count: 1, kind: "skill" as const, skills: ["insight" as const, "perception" as const] },
      { id: "exp", label: "Expertise", level: 1, count: 2, kind: "expertise" as const },
    ];

    const check = (picks: Picks) => validatePicks(skillDefs, picks, ctx(1, { owner: "race" }), "raceChoices").map((i) => i.code);

    expect(check({ keen: [{ id: "stealth" }] })).toEqual(["SKILL_NOT_ALLOWED"]);
    expect(check({ keen: [{ id: "insight" }] })).toEqual([]);
    expect(check({ exp: [{ id: "stealth" }] })).toEqual([]);
    expect(check({ exp: [{ id: "arcana" }] })).toEqual(["EXPERTISE_NEEDS_PROFICIENCY"]);
  });

  it("issue paths and Ukrainian messages", () => {
    const [issue] = validatePicks(defs, { metamagic: [{ id: "nope" }] }, ctx(2), "classes.cls-sorc");

    expect(issue).toMatchObject({ path: "classes.cls-sorc.metamagic", code: "CHOICE_UNKNOWN" });
    expect(issue.message).toContain("Вибір не знайдено");
  });
});
```

`lib/utils/characters/choices/__tests__/ability.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { scores } from "./fixtures";

import { abilityScoreDelta, applyDelta, capIssues } from "@/lib/utils/characters/choices/ability";

describe("ASI delta", () => {
  it("add, change, remove", () => {
    expect(abilityScoreDelta([], [{ ability: "strength", max: 20 }, { ability: "strength", max: 20 }])).toEqual({ strength: 2 });
    expect(abilityScoreDelta([{ ability: "strength", max: 20 }, { ability: "strength", max: 20 }], [{ ability: "dexterity", max: 20 }, { ability: "dexterity", max: 20 }])).toEqual({ strength: -2, dexterity: 2 });
    expect(abilityScoreDelta([{ ability: "charisma", max: 20 }], [])).toEqual({ charisma: -1 });
    expect(abilityScoreDelta([{ ability: "wisdom", max: 20 }], [{ ability: "wisdom", max: 20 }])).toEqual({});
  });

  it("applyDelta returns only changed scores; cap only for raised abilities", () => {
    expect(applyDelta(scores, { strength: 2, dexterity: -1 })).toEqual({ strength: 17, dexterity: 13 });
    expect(capIssues({ ...scores, charisma: 19 }, { charisma: 2 }, [{ ability: "charisma", max: 20 }, { ability: "charisma", max: 20 }]).map((i) => i.code)).toEqual(["ABILITY_SCORE_CAP"]);
    expect(capIssues({ ...scores, charisma: 19 }, { charisma: 2 }, [{ ability: "charisma", max: 30 }, { ability: "charisma", max: 30 }])).toEqual([]);
    expect(capIssues({ ...scores, strength: 22 }, { dexterity: 1 }, [{ ability: "strength", max: 20 }, { ability: "dexterity", max: 20 }])).toEqual([]);
  });
});
```

`lib/utils/characters/choices/__tests__/pending.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { empty, refs, sorcerer } from "./fixtures";

import { pendingCount } from "@/lib/utils/characters/choices/pending";
import { visitPicks } from "@/lib/utils/characters/choices/walk";
import type { ChoicesState } from "@/types/choices";

const pending = (state: Partial<ChoicesState>, level: number, classMode = true, race = refs.race) =>
  pendingCount(visitPicks({ ...empty, ...state }, { ...refs, race }, { level, classMode }), refs);

const sorc = (level: number, choices = {}) => ({ classes: [{ classId: sorcerer.id, level, choices }] });

describe("pendingCount", () => {
  it("race: lineage and Keen Senses; HOMM-like race without choices is 0", () => {
    expect(pending({}, 1, false)).toBe(2);
    expect(pending({ raceChoices: { "elven-lineage": [{ id: "drow" }] } }, 1, false)).toBe(1);
    expect(pending({}, 1, false, null)).toBe(0);
  });

  it("class: level 1 cantrips 4 + prepared 2; level 2 adds Metamagic 2; column growth reopens slots", () => {
    expect(pending(sorc(1), 1, true, null)).toBe(6);
    expect(pending(sorc(2), 2, true, null)).toBe(8);

    const picked = { metamagic: [{ id: "quickened" }, { id: "twinned" }] };

    expect(pending(sorc(9, picked), 9, true, null)).toBe(7);
    expect(pending(sorc(10, picked), 10, true, null)).toBe(10);
  });

  it("closed choices are ignored; orphaned picks leave the slot open; class mode off ignores classes", () => {
    expect(pending(sorc(1, { metamagic: [{ id: "quickened" }] }), 1, true, null)).toBe(6);
    expect(pending(sorc(2, { metamagic: [{ id: "quickened" }, { id: "ghost" }] }), 2, true, null)).toBe(7);
    expect(pending(sorc(2), 2, false, null)).toBe(0);
  });

  it("a picked feat adds its own unpicked nested choices", () => {
    expect(pending(sorc(4, { "ability-score-improvement-4": [{ id: "f-asi" }] }), 4, true, null)).toBe(11);
    expect(pending(sorc(4, { "ability-score-improvement-4": [{ id: "f-asi", picks: { asi: [{ id: "strength" }, { id: "strength" }] } }] }), 4, true, null)).toBe(9);
  });
});
```

(Рахунок: колонка `cantrips` фікстури — 4 на рівнях 1–3, 5 на 4–9, 6 з 10; `prepared-spells` — 2; `metamagic` — 2 з рівня 2, 4 з 10. Рівень 4 з обраною рисою ASI без піків: 5 + 2 + 2 (метамагія) + 2 (вкладені очки ASI) = 11.)

`lib/utils/characters/choices/__tests__/picks.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { elf } from "./fixtures";

import { choicesStateOf, keepStoredPicks, lineageName, withClassPicks } from "@/lib/utils/characters/choices/picks";

describe("picks helpers", () => {
  it("choicesStateOf reads all three columns tolerantly", () => {
    expect(choicesStateOf({ raceChoices: { a: [{ id: "x" }] }, feats: [{ id: "f", source: "dm" }], classes: [{ classId: "c", level: 2, choices: { m: [{ id: "q" }] } }, { bad: 1 }] })).toEqual({
      raceChoices: { a: [{ id: "x" }] },
      feats: [{ id: "f", source: "dm" }],
      classes: [{ classId: "c", level: 2, choices: { m: [{ id: "q" }] } }],
    });
    expect(choicesStateOf({})).toEqual({ raceChoices: {}, feats: [], classes: [] });
  });

  it("keepStoredPicks ignores incoming picks and keeps the stored ones by classId", () => {
    const stored = [{ classId: "c", level: 3, choices: { m: [{ id: "q" }] } }];

    expect(keepStoredPicks([{ classId: "c", level: 4, choices: { m: [{ id: "stale" }] } }, { classId: "d", level: 1, choices: { x: [{ id: "y" }] } }], stored)).toEqual([
      { classId: "c", level: 4, choices: { m: [{ id: "q" }] } },
      { classId: "d", level: 1 },
    ]);
  });

  it("withClassPicks replaces picks of the named classes only", () => {
    expect(withClassPicks([{ classId: "c", level: 1 }, { classId: "d", level: 1, choices: { a: [{ id: "b" }] } }], { c: { m: [{ id: "q" }] } })).toEqual([
      { classId: "c", level: 1, choices: { m: [{ id: "q" }] } },
      { classId: "d", level: 1, choices: { a: [{ id: "b" }] } },
    ]);
  });

  it("lineageName: option name, null when unpicked, undefined without a lineage", () => {
    expect(lineageName(elf, { "elven-lineage": [{ id: "wood-elf" }] })).toBe("Wood Elf");
    expect(lineageName(elf, {})).toBeNull();
    expect(lineageName({ ...elf, choices: elf.choices.filter((c) => !c.lineage) }, {})).toBeUndefined();
    expect(lineageName(null, {})).toBeUndefined();
  });
});
```

`lib/utils/characters/choices/__tests__/plan.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { empty, refs, rogue, scores, sorcerer } from "./fixtures";

import { type PlanInput, planChoices } from "@/lib/utils/characters/choices/plan";
import type { ChoicesState, Picks } from "@/types/choices";

const sorc = (level: number, choices?: Picks) => ({ classId: sorcerer.id, level, ...(choices && { choices }) });

const asiPick = (a: string, b: string): Picks => ({ "ability-score-improvement-4": [{ id: "f-asi", picks: { asi: [{ id: a }, { id: b }] } }] });

const input = (before: Partial<ChoicesState>, after: Partial<ChoicesState>, extra: Partial<PlanInput> = {}): PlanInput => ({
  before: { ...empty, ...before },
  after: { ...empty, ...after },
  refs,
  classMode: true,
  isDM: true,
  level: 4,
  scores,
  skills: { stealth: true },
  ...extra,
});

const fail = (r: ReturnType<typeof planChoices>) => (r.ok ? null : r.code);

describe("planChoices", () => {
  it("race lineage sets subrace; race picks work without class mode", () => {
    const r = planChoices(input({}, { raceChoices: { "elven-lineage": [{ id: "wood-elf" }], "keen-senses": [{ id: "perception" }] } }, { classMode: false, level: 1 }));

    expect(r).toMatchObject({ ok: true, subrace: "Wood Elf", scores: {} });
  });

  it("ASI: add writes the delta, swap moves it, removal reverts", () => {
    expect(planChoices(input({ classes: [sorc(4)] }, { classes: [sorc(4, asiPick("strength", "strength"))] }))).toMatchObject({ ok: true, scores: { strength: 17 } });
    expect(planChoices(input({ classes: [sorc(4, asiPick("strength", "strength"))] }, { classes: [sorc(4, asiPick("dexterity", "dexterity"))] }, { scores: { ...scores, strength: 17 } }))).toMatchObject({
      ok: true,
      scores: { strength: 15, dexterity: 16 },
    });
    expect(planChoices(input({ classes: [sorc(4, asiPick("strength", "strength"))] }, { classes: [sorc(4)] }, { scores: { ...scores, strength: 17 } }))).toMatchObject({ ok: true, scores: { strength: 15 } });
  });

  it("cap 20 on the result; a DM-raised score above the cap does not block other edits", () => {
    expect(fail(planChoices(input({ classes: [sorc(4)] }, { classes: [sorc(4, asiPick("charisma", "charisma"))] }, { scores: { ...scores, charisma: 19 } })))).toBe("ABILITY_SCORE_CAP");
    expect(planChoices(input({ classes: [sorc(4)] }, { classes: [sorc(4, { metamagic: [{ id: "quickened" }] })] }, { scores: { ...scores, strength: 22 } })).ok).toBe(true);
  });

  it("closed choice: stored picks may stay, changes are refused", () => {
    const stored = asiPick("strength", "strength");

    expect(planChoices(input({ classes: [sorc(3, stored)] }, { classes: [sorc(3, { ...stored, metamagic: [{ id: "quickened" }] })] }, { level: 3 })).ok).toBe(true);
    expect(fail(planChoices(input({ classes: [sorc(3, stored)] }, { classes: [sorc(3, asiPick("dexterity", "dexterity"))] }, { level: 3 })))).toBe("CHOICE_LOCKED");
  });

  it("class mode, DM feats, origin feats", () => {
    expect(fail(planChoices(input({}, { feats: [{ id: "f-alert", source: "origin" }] }, { classMode: false })))).toBe("CHOICES_NEED_CLASSES");
    expect(planChoices(input({}, { feats: [{ id: "f-archery", source: "dm" }] }, { isDM: false }))).toMatchObject({ ok: false, status: 403, code: "DM_FEAT_ONLY_DM" });
    expect(fail(planChoices(input({}, { feats: [{ id: "f-alert", source: "origin" }, { id: "f-mi", source: "origin" }] })))).toBe("ORIGIN_FEAT_ONLY_ONE");
    expect(fail(planChoices(input({}, { feats: [{ id: "f-asi", source: "origin" }] })))).toBe("FEAT_TYPE");
    expect(planChoices(input({}, { feats: [{ id: "f-alert", source: "origin" }] }, { isDM: false })).ok).toBe(true);
  });

  it("expertise sees proficiencies from Character.skills and from skill picks", () => {
    const rogueAt1 = (choices: Picks) => ({ classId: rogue.id, level: 1, choices });

    expect(planChoices(input({}, { classes: [rogueAt1({ "expertise-1": [{ id: "stealth" }] })] }, { level: 1 })).ok).toBe(true);
    expect(fail(planChoices(input({}, { classes: [rogueAt1({ "expertise-1": [{ id: "perception" }] })] }, { level: 1 })))).toBe("EXPERTISE_NEEDS_PROFICIENCY");
    expect(planChoices(input({}, { raceChoices: { "keen-senses": [{ id: "perception" }] }, classes: [rogueAt1({ "expertise-1": [{ id: "perception" }] })] }, { level: 1 })).ok).toBe(true);
  });

  it("a non-repeatable feat taken twice is refused; repeatable twice is fine", () => {
    const twice = (featId: string): Picks => ({ "ability-score-improvement-4": [{ id: featId }] });

    expect(fail(planChoices(input({}, { classes: [sorc(4, twice("f-grappler"))], feats: [{ id: "f-grappler", source: "dm" }] })))).toBe("FEAT_NOT_REPEATABLE");
    expect(planChoices(input({}, { classes: [sorc(4, twice("f-mi"))], feats: [{ id: "f-mi", source: "origin" }] })).ok).toBe(true);
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `pnpm test:run lib/utils/characters/choices`
Expected: FAIL — модулів `count/validate/walk/ability/pending/picks/plan` немає.

- [ ] **Step 4: `count.ts` і `class-choices.ts`**

```ts
// lib/utils/characters/choices/count.ts
import { columnValueAt } from "@/lib/utils/characters/classes/columns";
import type { Choice, ChoiceOwner } from "@/types/choices";
import type { ClassColumn } from "@/types/classes";

export function resolveChoiceCount(choice: Choice, level: number, columns: readonly ClassColumn[] = []): number {
  if (choice.kind === "abilityScore") return choice.points ?? 0;

  if (typeof choice.count === "number") return choice.count;

  const { scale } = choice.count;

  const column = columns.find((c) => c.key === scale);

  const value = column ? columnValueAt(column, level) : null;

  return typeof value === "number" && value > 0 ? value : 0;
}

export const isChoiceOpen = (choice: Choice, level: number, owner: ChoiceOwner): boolean => owner === "feat" || choice.level <= level;
```

```ts
// lib/utils/characters/choices/class-choices.ts
import type { Choice } from "@/types/choices";
import type { GameClassData, Subclass } from "@/types/classes";

export const classChoiceDefs = (cls: GameClassData, subclass: Subclass | null): Choice[] => [...cls.features, ...(subclass?.features ?? [])].flatMap((f) => f.choices ?? []);
```

- [ ] **Step 5: `validate.ts`**

```ts
import { ABILITY_KEYS, type AbilityKey } from "@/lib/constants/abilities";
import { API_ERRORS } from "@/lib/constants/api-errors";
import { DND_SKILLS, type DndSkill } from "@/lib/constants/skills";
import { isChoiceOpen, resolveChoiceCount } from "@/lib/utils/characters/choices/count";
import type { Choice, ChoiceErrorCode, ChoiceIssue, ChoiceOwner, ChoicePick, FeatData, Picks, SpellRef } from "@/types/choices";
import type { ClassColumn } from "@/types/classes";

export interface PickContext {
  owner: ChoiceOwner;
  level: number;
  totalLevel: number;
  columns?: readonly ClassColumn[];
  maxSlotLevel?: number;
  featsById: Readonly<Record<string, FeatData>>;
  spellsById: Readonly<Record<string, SpellRef>>;
  proficient: ReadonlySet<DndSkill>;
  scores: Readonly<Record<AbilityKey, number>>;
  featCounts: ReadonlyMap<string, number>;
}

export const choiceIssue = (path: string, code: ChoiceErrorCode, detail?: string): ChoiceIssue => ({ path, code, message: detail ? `${API_ERRORS[code]}: ${detail}` : API_ERRORS[code] });

export function featPrerequisiteMet(feat: FeatData, ctx: { totalLevel: number; scores: Readonly<Record<AbilityKey, number>> }): boolean {
  const { level, scores } = feat.prerequisite;

  return (!level || ctx.totalLevel >= level) && (!scores || scores.abilities.some((a) => ctx.scores[a] >= scores.min));
}

const duplicates = (picks: ChoicePick[]) => picks.length !== new Set(picks.map((p) => p.id)).size;

function optionIssues(choice: Choice, picks: ChoicePick[], ctx: PickContext, at: string): ChoiceIssue[] {
  const options = new Map((choice.options ?? []).map((o) => [o.id, o]));

  const picked = new Set(picks.map((p) => p.id));

  return picks.flatMap((p) => {
    const option = options.get(p.id);

    if (!option) return [choiceIssue(at, "CHOICE_UNKNOWN", p.id)];

    if (option.minLevel && option.minLevel > ctx.level) return [choiceIssue(at, "CHOICE_MIN_LEVEL", option.name)];

    return (option.requires ?? []).every((r) => picked.has(r)) ? [] : [choiceIssue(at, "CHOICE_REQUIRES", option.name)];
  });
}

function featIssues(choice: Choice, picks: ChoicePick[], ctx: PickContext, at: string): ChoiceIssue[] {
  const embedded = new Set((choice.options ?? []).map((o) => o.id));

  return picks.flatMap((p, i) => {
    if (embedded.has(p.id)) return [];

    const feat = ctx.featsById[p.id];

    if (!feat) return [choiceIssue(at, "CHOICE_UNKNOWN", p.id)];

    if (!(choice.featTypes ?? []).includes(feat.type)) return [choiceIssue(at, "FEAT_TYPE", feat.name)];

    if (!featPrerequisiteMet(feat, ctx)) return [choiceIssue(at, "FEAT_PREREQUISITE", feat.name)];

    if (!feat.repeatable && (ctx.featCounts.get(feat.id) ?? 0) > 1) return [choiceIssue(at, "FEAT_NOT_REPEATABLE", feat.name)];

    return validatePicks(feat.choices, p.picks ?? {}, { ...ctx, owner: "feat", level: ctx.totalLevel, columns: [] }, `${at}.${i}`);
  });
}

function skillIssues(choice: Choice, picks: ChoicePick[], ctx: PickContext, at: string): ChoiceIssue[] {
  const allowed = new Set<string>(choice.skills?.length ? choice.skills : DND_SKILLS);

  return picks.flatMap((p) => {
    if (!allowed.has(p.id)) return [choiceIssue(at, "SKILL_NOT_ALLOWED", p.id)];

    return choice.kind === "expertise" && !ctx.proficient.has(p.id as DndSkill) ? [choiceIssue(at, "EXPERTISE_NEEDS_PROFICIENCY", p.id)] : [];
  });
}

function spellIssues(choice: Choice, picks: ChoicePick[], ctx: PickContext, at: string): ChoiceIssue[] {
  const rule = choice.spells;

  if (!rule) return [];

  const max = rule.maxLevel === "slots" ? (ctx.maxSlotLevel ?? 0) : rule.maxLevel;

  return picks.flatMap((p) => {
    const spell = ctx.spellsById[p.id];

    if (!spell) return [choiceIssue(at, "CHOICE_UNKNOWN", p.id)];

    const listed = rule.lists.length === 0 || spell.lists.some((l) => rule.lists.includes(l));

    return listed && spell.level >= rule.minLevel && spell.level <= max ? [] : [choiceIssue(at, "SPELL_NOT_IN_LIST", spell.name)];
  });
}

function kindIssues(choice: Choice, picks: ChoicePick[], ctx: PickContext, at: string): ChoiceIssue[] {
  switch (choice.kind) {
    case "option":
      return optionIssues(choice, picks, ctx, at);
    case "feat":
      return featIssues(choice, picks, ctx, at);
    case "skill":
    case "expertise":
      return skillIssues(choice, picks, ctx, at);
    case "spell":
      return spellIssues(choice, picks, ctx, at);
    case "abilityScore": {
      const allowed = new Set<string>(choice.abilities ?? ABILITY_KEYS);

      return picks.flatMap((p) => (allowed.has(p.id) ? [] : [choiceIssue(at, "CHOICE_UNKNOWN", p.id)]));
    }
  }
}

export function validatePicks(choices: readonly Choice[], picks: Picks, ctx: PickContext, path: string): ChoiceIssue[] {
  const byId = new Map(choices.map((c) => [c.id, c]));

  return Object.entries(picks).flatMap(([choiceId, list]) => {
    const choice = byId.get(choiceId);

    const at = `${path}.${choiceId}`;

    if (!choice) return [choiceIssue(at, "CHOICE_UNKNOWN", choiceId)];

    if (!isChoiceOpen(choice, ctx.level, ctx.owner)) return [];

    const issues: ChoiceIssue[] = [];

    if (list.length > resolveChoiceCount(choice, ctx.level, ctx.columns)) issues.push(choiceIssue(at, "CHOICE_COUNT", choice.label));

    if (choice.kind !== "abilityScore" && duplicates(list)) issues.push(choiceIssue(at, "CHOICE_DUPLICATE", choice.label));

    return [...issues, ...kindIssues(choice, list, ctx, at)];
  });
}
```

- [ ] **Step 6: `walk.ts`, `ability.ts`, `pending.ts`, `picks.ts`**

```ts
// lib/utils/characters/choices/walk.ts
import { DND_SKILLS, type DndSkill } from "@/lib/constants/skills";
import { classChoiceDefs } from "@/lib/utils/characters/choices/class-choices";
import { resolveChoiceCount } from "@/lib/utils/characters/choices/count";
import { isRecord } from "@/lib/utils/common/is-record";
import type { Choice, ChoicePick, ChoiceRace, ChoicesState, FeatData, Picks, SpellRef } from "@/types/choices";
import type { ClassColumn, GameClassData } from "@/types/classes";

export interface ChoiceRefs {
  race: ChoiceRace | null;
  classesById: Readonly<Record<string, GameClassData>>;
  featsById: Readonly<Record<string, FeatData>>;
  spellsById: Readonly<Record<string, SpellRef>>;
}

export interface PickVisit {
  choice: Choice;
  picks: ChoicePick[];
  open: boolean;
  target: number;
  path: string;
}

type WalkRefs = Pick<ChoiceRefs, "race" | "classesById" | "featsById">;

export function visitPicks(state: ChoicesState, refs: WalkRefs, opts: { level: number; classMode: boolean }): PickVisit[] {
  const out: PickVisit[] = [];

  const visitFeat = (featId: string, picks: Picks | undefined, open: boolean, path: string) => {
    const feat = refs.featsById[featId];

    if (feat) visitList(feat.choices, picks ?? {}, { open, level: opts.level, columns: [], owner: "feat" }, path);
  };

  function visitList(defs: readonly Choice[], picks: Picks, at: { open: boolean; level: number; columns: readonly ClassColumn[]; owner: "race" | "class" | "feat" }, path: string) {
    for (const choice of defs) {
      const list = picks[choice.id] ?? [];

      const open = at.open && (at.owner === "feat" || choice.level <= at.level);

      const visitPath = `${path}.${choice.id}`;

      out.push({ choice, picks: list, open, target: resolveChoiceCount(choice, at.level, at.columns), path: visitPath });

      if (choice.kind === "feat") list.forEach((p, i) => visitFeat(p.id, p.picks, open, `${visitPath}.${i}`));
    }
  }

  visitList(refs.race?.choices ?? [], state.raceChoices, { open: true, level: opts.level, columns: [], owner: "race" }, "raceChoices");

  if (!opts.classMode) return out;

  for (const entry of state.classes) {
    const cls = refs.classesById[entry.classId];

    if (!cls) continue;

    const subclass = cls.subclasses.find((s) => s.id === entry.subclassId) ?? null;

    visitList(classChoiceDefs(cls, subclass), entry.choices ?? {}, { open: true, level: entry.level, columns: cls.columns ?? [], owner: "class" }, `classes.${entry.classId}`);
  }

  state.feats.forEach((f, i) => visitFeat(f.id, f.picks, true, `feats.${i}`));

  return out;
}

export function countFeats(visits: readonly PickVisit[], state: ChoicesState, classMode: boolean): Map<string, number> {
  const counts = new Map<string, number>();

  const add = (id: string) => counts.set(id, (counts.get(id) ?? 0) + 1);

  for (const v of visits) if (v.choice.kind === "feat") v.picks.forEach((p) => add(p.id));

  if (classMode) state.feats.forEach((f) => add(f.id));

  return counts;
}

const SKILLS = new Set<string>(DND_SKILLS);

export const skillPicksOf = (visits: readonly PickVisit[], kind: "skill" | "expertise"): DndSkill[] => [
  ...new Set(visits.filter((v) => v.open && v.choice.kind === kind).flatMap((v) => v.picks.map((p) => p.id).filter((id): id is DndSkill => SKILLS.has(id)))),
];

export const skillFlags = (raw: unknown): DndSkill[] => (isRecord(raw) ? DND_SKILLS.filter((k) => raw[k] === true) : []);
```

```ts
// lib/utils/characters/choices/ability.ts
import { type AbilityKey, isAbilityKey } from "@/lib/constants/abilities";
import { choiceIssue } from "@/lib/utils/characters/choices/validate";
import type { PickVisit } from "@/lib/utils/characters/choices/walk";
import type { ChoiceIssue } from "@/types/choices";

export interface AbilityPick {
  ability: AbilityKey;
  max: number;
}

export const abilityPicksOf = (visits: readonly PickVisit[]): AbilityPick[] =>
  visits.filter((v) => v.choice.kind === "abilityScore").flatMap((v) => v.picks.flatMap((p) => (isAbilityKey(p.id) ? [{ ability: p.id, max: v.choice.max ?? 20 }] : [])));

export function abilityScoreDelta(before: readonly AbilityPick[], after: readonly AbilityPick[]): Partial<Record<AbilityKey, number>> {
  const delta: Partial<Record<AbilityKey, number>> = {};

  for (const p of after) delta[p.ability] = (delta[p.ability] ?? 0) + 1;

  for (const p of before) delta[p.ability] = (delta[p.ability] ?? 0) - 1;

  return Object.fromEntries(Object.entries(delta).filter(([, v]) => v !== 0)) as Partial<Record<AbilityKey, number>>;
}

export function capIssues(scores: Readonly<Record<AbilityKey, number>>, delta: Partial<Record<AbilityKey, number>>, after: readonly AbilityPick[]): ChoiceIssue[] {
  return (Object.entries(delta) as Array<[AbilityKey, number]>).flatMap(([ability, change]) => {
    if (change <= 0) return [];

    const cap = Math.min(...after.filter((p) => p.ability === ability).map((p) => p.max));

    return scores[ability] + change > cap ? [choiceIssue(`scores.${ability}`, "ABILITY_SCORE_CAP", `${scores[ability] + change} > ${cap}`)] : [];
  });
}

export const applyDelta = (scores: Readonly<Record<AbilityKey, number>>, delta: Partial<Record<AbilityKey, number>>): Partial<Record<AbilityKey, number>> =>
  Object.fromEntries((Object.entries(delta) as Array<[AbilityKey, number]>).map(([k, v]) => [k, scores[k] + v]));
```

```ts
// lib/utils/characters/choices/pending.ts
import type { ChoiceRefs, PickVisit } from "@/lib/utils/characters/choices/walk";

function resolved(v: PickVisit, refs: Pick<ChoiceRefs, "featsById">): number {
  if (v.choice.kind === "option") return v.picks.filter((p) => v.choice.options?.some((o) => o.id === p.id)).length;

  if (v.choice.kind === "feat") return v.picks.filter((p) => refs.featsById[p.id] || v.choice.options?.some((o) => o.id === p.id)).length;

  return v.picks.length;
}

export const pendingCount = (visits: readonly PickVisit[], refs: Pick<ChoiceRefs, "featsById">): number =>
  visits.filter((v) => v.open).reduce((sum, v) => sum + Math.max(0, v.target - resolved(v, refs)), 0);
```

```ts
// lib/utils/characters/choices/picks.ts
import { hasPicks, readCharacterFeats, readPicks } from "@/lib/utils/characters/choices/read";
import { isRecord } from "@/lib/utils/common/is-record";
import type { ChoiceRace, ChoicesState, Picks } from "@/types/choices";
import type { CharacterClassEntry } from "@/types/classes";

function readEntries(raw: unknown): CharacterClassEntry[] {
  if (!Array.isArray(raw)) return [];

  return raw.flatMap((e): CharacterClassEntry[] => {
    if (!isRecord(e) || typeof e.classId !== "string" || typeof e.level !== "number") return [];

    const choices = readPicks(e.choices);

    return [{ classId: e.classId, level: e.level, ...(typeof e.subclassId === "string" && { subclassId: e.subclassId }), ...(hasPicks(choices) && { choices }) }];
  });
}

export const choicesStateOf = (row: { raceChoices?: unknown; feats?: unknown; classes?: unknown }): ChoicesState => ({
  raceChoices: readPicks(row.raceChoices),
  feats: readCharacterFeats(row.feats),
  classes: readEntries(row.classes),
});

export function keepStoredPicks(next: CharacterClassEntry[], stored: unknown): CharacterClassEntry[] {
  const byId = new Map(readEntries(stored).map((e) => [e.classId, e.choices]));

  return next.map(({ choices: _incoming, ...entry }) => {
    const kept = byId.get(entry.classId);

    return kept ? { ...entry, choices: kept } : entry;
  });
}

export const withClassPicks = (entries: CharacterClassEntry[], classChoices: Record<string, Picks>): CharacterClassEntry[] =>
  entries.map((e) => (classChoices[e.classId] ? { ...e, choices: classChoices[e.classId] } : e));

export function lineageName(race: ChoiceRace | null, picks: Picks): string | null | undefined {
  const lineage = race?.choices.find((c) => c.lineage);

  if (!lineage) return undefined;

  const id = picks[lineage.id]?.[0]?.id;

  return lineage.options?.find((o) => o.id === id)?.name ?? null;
}
```

(У `keepStoredPicks` `_incoming` — свідомо відкинуте поле; якщо ESLint `no-unused-vars` скаржиться на `_`-префікс — використати `const { choices, ...entry } = e; void choices;` не треба: у проєкті `argsIgnorePattern`/`varsIgnorePattern` `^_` — перевірити `eslint.config.mjs`, інакше переписати через `Object.fromEntries(Object.entries(e).filter(([k]) => k !== "choices"))`.)

- [ ] **Step 7: `plan.ts`**

```ts
import type { AbilityKey } from "@/lib/constants/abilities";
import { abilityPicksOf, abilityScoreDelta, applyDelta, capIssues } from "@/lib/utils/characters/choices/ability";
import { classChoiceDefs } from "@/lib/utils/characters/choices/class-choices";
import { lineageName } from "@/lib/utils/characters/choices/picks";
import { hasPicks } from "@/lib/utils/characters/choices/read";
import { choiceIssue, type PickContext, validatePicks } from "@/lib/utils/characters/choices/validate";
import { type ChoiceRefs, countFeats, skillFlags, skillPicksOf, visitPicks } from "@/lib/utils/characters/choices/walk";
import { maxSlotLevelFor } from "@/lib/utils/spells/class-slots";
import type { Choice, ChoiceErrorCode, ChoiceIssue, ChoicesState, Picks } from "@/types/choices";

export interface PlanInput {
  before: ChoicesState;
  after: ChoicesState;
  refs: ChoiceRefs;
  classMode: boolean;
  isDM: boolean;
  level: number;
  scores: Record<AbilityKey, number>;
  skills: unknown;
}

export type PlanResult =
  | { ok: true; state: ChoicesState; subrace: string | null | undefined; scores: Partial<Record<AbilityKey, number>> }
  | { ok: false; status: 403 | 422; code: ChoiceErrorCode; message: string; issues: ChoiceIssue[] };

const failWith = (status: 403 | 422, issues: ChoiceIssue[]): PlanResult => ({ ok: false, status, code: issues[0].code, message: issues[0].message, issues });

const same = (a: unknown, b: unknown) => JSON.stringify(a ?? []) === JSON.stringify(b ?? []);

function lockedIssues(defs: readonly Choice[], before: Picks, after: Picks, level: number, path: string): ChoiceIssue[] {
  return defs.filter((c) => c.level > level && !same(before[c.id], after[c.id])).map((c) => choiceIssue(`${path}.${c.id}`, "CHOICE_LOCKED", c.label));
}

export function planChoices(input: PlanInput): PlanResult {
  const { before, after, refs, classMode, level } = input;

  if (!classMode && (after.feats.length > 0 || after.classes.some((e) => hasPicks(e.choices)))) return failWith(422, [choiceIssue("feats", "CHOICES_NEED_CLASSES")]);

  const dmFeats = (s: ChoicesState) => s.feats.filter((f) => f.source === "dm");

  if (!input.isDM && !same(dmFeats(before), dmFeats(after))) return failWith(403, [choiceIssue("feats", "DM_FEAT_ONLY_DM")]);

  if (after.feats.filter((f) => f.source === "origin").length > 1) return failWith(422, [choiceIssue("feats", "ORIGIN_FEAT_ONLY_ONE")]);

  const opts = { level, classMode };

  const visits = visitPicks(after, refs, opts);

  const featCounts = countFeats(visits, after, classMode);

  const base: Omit<PickContext, "owner" | "level"> = {
    totalLevel: level,
    featsById: refs.featsById,
    spellsById: refs.spellsById,
    proficient: new Set([...skillFlags(input.skills), ...skillPicksOf(visits, "skill")]),
    scores: input.scores,
    featCounts,
  };

  const raceDefs = refs.race?.choices ?? [];

  const issues: ChoiceIssue[] = [
    ...lockedIssues(raceDefs, before.raceChoices, after.raceChoices, level, "raceChoices"),
    ...validatePicks(raceDefs, after.raceChoices, { ...base, owner: "race", level }, "raceChoices"),
  ];

  for (const entry of classMode ? after.classes : []) {
    const cls = refs.classesById[entry.classId];

    if (!cls) continue;

    const subclass = cls.subclasses.find((s) => s.id === entry.subclassId) ?? null;

    const defs = classChoiceDefs(cls, subclass);

    const path = `classes.${entry.classId}`;

    const stored = before.classes.find((e) => e.classId === entry.classId)?.choices ?? {};

    issues.push(
      ...lockedIssues(defs, stored, entry.choices ?? {}, entry.level, path),
      ...validatePicks(defs, entry.choices ?? {}, { ...base, owner: "class", level: entry.level, columns: cls.columns ?? [], maxSlotLevel: maxSlotLevelFor({ ...entry, class: cls, subclass }) }, path),
    );
  }

  after.feats.forEach((f, i) => {
    const feat = refs.featsById[f.id];

    const path = `feats.${i}`;

    if (!feat) return void issues.push(choiceIssue(path, "CHOICE_UNKNOWN", f.id));

    if (f.source === "origin" && feat.type !== "origin") issues.push(choiceIssue(path, "FEAT_TYPE", feat.name));

    if (!feat.repeatable && (featCounts.get(f.id) ?? 0) > 1) issues.push(choiceIssue(path, "FEAT_NOT_REPEATABLE", feat.name));

    issues.push(...validatePicks(feat.choices, f.picks ?? {}, { ...base, owner: "feat", level }, path));
  });

  const afterPicks = abilityPicksOf(visits);

  const delta = abilityScoreDelta(abilityPicksOf(visitPicks(before, refs, opts)), afterPicks);

  issues.push(...capIssues(input.scores, delta, afterPicks));

  if (issues.length > 0) return failWith(422, issues);

  return { ok: true, state: after, subrace: lineageName(refs.race, after.raceChoices), scores: applyDelta(input.scores, delta) };
}
```

(Повторювану рису в класі й у `Character.feats` `featIssues` перевіряє через `featCounts`, тому неповторювана в обох місцях дає дві відмови — і в класовому піку, і в `feats.i`; тест очікує лише код першої.)

- [ ] **Step 8: Run tests**

Run: `pnpm test:run lib/utils/characters/choices lib/__tests__/client-entry-imports.test.ts && pnpm exec tsc --noEmit -p tsconfig.json`
Expected: PASS. Додатково переконатися, що жоден модуль `lib/utils/characters/choices/*.ts` не імпортує `zod`: `grep -rn "from \"zod\"\|lib/schemas\|abilities/read\"" lib/utils/characters/choices --include='*.ts' | grep -v __tests__` — порожньо.

- [ ] **Step 9: Commit**

```bash
git add lib/utils/characters/choices
git commit -m "feat(constructor): 4f-4 pure choice engine — counts, validation, ASI delta, pending, save plan

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---
### Task 4: Тип контенту `feats` — ресурс, роути, кеш, імпорт/експорт, бандл, синхронізація, OpenAPI, клієнт

**Files:**
- Create: `lib/utils/feats/row.ts`, `lib/server/feats/feat-name.ts`, `lib/server/feats/feat-usage.ts`, `lib/server/content/resources/feats.ts`, `app/api/campaigns/[id]/feats/route.ts`, `app/api/campaigns/[id]/feats/[featId]/route.ts`, `lib/utils/content/import/fields/feats.ts`, `lib/api/feats.ts`, `lib/hooks/feats/keys.ts`, `lib/hooks/feats/useFeats.ts`, `lib/hooks/feats/index.ts`
- Modify: `lib/cache/tags.ts`, `lib/cache/reference-data.ts`, `lib/server/content/define-resource.ts`, `lib/server/content/resources/index.ts`, `lib/server/content/json-schema.ts`, `types/content-import.ts`, `lib/utils/content/import/kinds.ts`, `lib/utils/content/import/fields/index.ts`, `lib/server/content/import/names.ts`, `lib/server/content/import/export.ts`, `lib/hooks/content-import/keys.ts`, `lib/constants/source-sync.ts`, `lib/server/templates/bundle.ts`
- Modify (дозволені правки наявних тестів): `lib/server/content/__tests__/openapi.test.ts`, `lib/server/content/__tests__/openapi-4f2.test.ts` — лише `135_000` → `145_000`; `lib/utils/content/import/__tests__/fields.test.ts` і `lib/server/content/__tests__/import-content.test.ts` — лише рядок `feats: createFeatSchema,` у `CREATE` і `createFeatSchema` в імпорті з `@/lib/schemas` (обидва тести — `Record<ImportKind, ZodType>`, новий вид без рядка не компілюється й падає в `it.each(IMPORT_KINDS)`).
- Test: `lib/utils/feats/__tests__/row.test.ts`, `lib/server/content/__tests__/feats-resource.test.ts`, `lib/server/feats/__tests__/feat-usage.test.ts`, `lib/server/content/__tests__/openapi-4f4.test.ts`, `lib/server/templates/__tests__/bundle-feats.test.ts`

**Interfaces:**
- Consumes: `createFeatSchema`/`updateFeatSchema`, `ChoiceSchema`, `featAbilities`, `readChoiceList` (задача 2); `FeatData`, `FeatFormData` (задача 1).
- Produces:
  - `ReferenceKind.FEATS = "feats"`, `cacheTags.feats`, `getCachedFeats(campaignId): Promise<Feat[]>`.
  - `toFeatData(row: Feat): FeatData`; `featNameTaken(campaignId, name, exceptId?)`; `featInUse(campaignId, featId): Promise<boolean>`.
  - `featsResource` (`kind: "feats"`, `path: "/feats"`, `idParam: "featId"`), `ContentKind` + `"feats"`, рядок у `CONTENT_RESOURCES`; REST `GET/POST /api/campaigns/{id}/feats`, `GET/PATCH/DELETE /api/campaigns/{id}/feats/{featId}`.
  - `ImportKind` + `"feats"`, `IMPORT_KINDS` + `"feats"`, `FEATS_IMPORT`.
  - Бандл: таблиця `feats` (модель `Feat`, делегат `feat`) одразу після `classes`; `SYNC_TABLE_SCOPES`/`SYNC_SCOPE_LABELS.feats = "Риси"`.
  - OpenAPI: спільна схема `Choice` (`$ref`), операції `feats.*`.
  - Клієнт: `getFeats`, `getFeat`, `createFeat`, `updateFeat`, `deleteFeat` (`lib/api/feats.ts`); `featKeys.list(campaignId)`, `featKeys.detail(campaignId, featId)`; хуки `useFeats(campaignId, opts?)`, `useFeat`, `useCreateFeat`, `useUpdateFeat`, `useDeleteFeat` (`lib/hooks/feats`).

- [ ] **Step 1: Write the failing tests**

`lib/utils/feats/__tests__/row.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { toFeatData } from "@/lib/utils/feats/row";

const row = (extra: object = {}) =>
  ({ id: "f1", campaignId: "c1", name: "Grappler", icon: null, type: "general", prerequisite: { level: 4, scores: { abilities: ["strength", "nope"], min: 13 } }, repeatable: false, description: "x", abilities: [], choices: [], createdAt: new Date(), updatedAt: new Date(), sourceId: null, sourceHash: null, ...extra }) as never;

describe("toFeatData", () => {
  it("normalizes type, prerequisite and choices", () => {
    expect(toFeatData(row())).toEqual({ id: "f1", name: "Grappler", icon: null, type: "general", prerequisite: { level: 4, scores: { abilities: ["strength"], min: 13 } }, repeatable: false, description: "x", abilities: [], choices: [] });
    expect(toFeatData(row({ type: "weird", prerequisite: null, choices: [{ id: "a", label: "A", kind: "abilityScore", points: 2 }] }))).toMatchObject({ type: "general", prerequisite: {}, choices: [{ id: "a", level: 1, count: 1 }] });
  });
});
```

`lib/server/content/__tests__/feats-resource.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({ feat: { create: vi.fn(), update: vi.fn(), deleteMany: vi.fn() } }));

const nameTaken = vi.hoisted(() => vi.fn());

const inUse = vi.hoisted(() => vi.fn());

vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", () => ({ prisma: db }));
vi.mock("@/lib/cache/reference-data", () => ({ getCachedFeats: vi.fn(async () => []) }));
vi.mock("@/lib/server/feats/feat-name", () => ({ featNameTaken: nameTaken }));
vi.mock("@/lib/server/feats/feat-usage", () => ({ featInUse: inUse }));

import { API_ERRORS } from "@/lib/constants/api-errors";
import { createFeatSchema } from "@/lib/schemas";
import { featsResource } from "@/lib/server/content/resources/feats";
import type { Actor } from "@/lib/utils/api/actor";

const actor: Actor = { campaignId: "c1", userId: "u", isDM: true, via: "session", scopes: null };

const existing = { id: "f1", campaignId: "c1", name: "Alert" } as never;

describe("featsResource", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    nameTaken.mockResolvedValue(false);
    inUse.mockResolvedValue(false);
  });

  it("creates with schema defaults; a taken name is 409", async () => {
    await featsResource.create(actor, createFeatSchema.parse({ name: "Alert", type: "origin" }));

    expect(db.feat.create).toHaveBeenCalledWith({ data: expect.objectContaining({ campaignId: "c1", name: "Alert", type: "origin", repeatable: false, prerequisite: {}, abilities: [], choices: [] }) });

    nameTaken.mockResolvedValue(true);

    await expect(featsResource.create(actor, createFeatSchema.parse({ name: "Alert" }))).rejects.toMatchObject({ status: 409 });
  });

  it("PATCH writes only the given JSON fields", async () => {
    await featsResource.update(actor, existing, { repeatable: true });

    expect(db.feat.update).toHaveBeenCalledWith({ where: { id: "f1" }, data: { repeatable: true } });
  });

  it("delete: 409 FEAT_IN_USE while a hero holds it", async () => {
    inUse.mockResolvedValue(true);

    await expect(featsResource.remove(actor, existing)).rejects.toMatchObject({ status: 409, message: API_ERRORS.FEAT_IN_USE });
    expect(db.feat.deleteMany).not.toHaveBeenCalled();

    inUse.mockResolvedValue(false);
    await featsResource.remove(actor, existing);

    expect(db.feat.deleteMany).toHaveBeenCalledWith({ where: { id: "f1", campaignId: "c1" } });
  });
});
```

`lib/server/feats/__tests__/feat-usage.test.ts`:

```ts
import { describe, expect, it, vi } from "vitest";

const queryRaw = vi.hoisted(() => vi.fn());

vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", () => ({ prisma: { $queryRaw: queryRaw } }));

import { featInUse } from "@/lib/server/feats/feat-usage";

describe("featInUse", () => {
  it("searches the quoted id in feats, raceChoices and classes of the campaign", async () => {
    queryRaw.mockResolvedValueOnce([{ count: BigInt(2) }]);

    expect(await featInUse("c1", "f1")).toBe(true);

    const [strings, ...values] = queryRaw.mock.calls[0] as [TemplateStringsArray, ...unknown[]];

    expect(strings.join("?")).toContain(`"raceChoices"::text LIKE`);
    expect(values).toEqual(["c1", `%"f1"%`, `%"f1"%`, `%"f1"%`]);

    queryRaw.mockResolvedValueOnce([{ count: BigInt(0) }]);

    expect(await featInUse("c1", "f1")).toBe(false);
  });
});
```

`lib/server/content/__tests__/openapi-4f4.test.ts`:

```ts
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/utils/api/actor", () => ({ resolveActor: vi.fn() }));

import { buildOpenApi } from "@/lib/server/content/openapi";

const doc = buildOpenApi();

describe("OpenAPI 4f-4", () => {
  it("feats collection and item paths; Choice is a shared component", () => {
    expect(Object.keys(doc.paths)).toEqual(expect.arrayContaining(["/api/campaigns/{id}/feats", "/api/campaigns/{id}/feats/{featId}"]));
    expect(doc.components.schemas).toHaveProperty("Choice");
    expect(JSON.stringify(doc.components.schemas.FeatsCreate)).toContain("#/components/schemas/Choice");
  });

  it("stays under the size budget", () => {
    expect(JSON.stringify(doc).length).toBeLessThan(145_000);
  });
});
```

`lib/server/templates/__tests__/bundle-feats.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { type Bundle, BUNDLE_TABLES, BundleSchema, emptyBundle } from "../bundle";

import { SYNC_SCOPE_LABELS, SYNC_TABLE_SCOPES } from "@/lib/constants/source-sync";

describe("bundle: feats table", () => {
  it("feats right after classes, sync scope labelled", () => {
    const keys = BUNDLE_TABLES.map((t) => t.key);

    expect(keys.indexOf("feats")).toBe(keys.indexOf("classes") + 1);
    expect(BUNDLE_TABLES.find((t) => t.key === "feats")).toMatchObject({ model: "Feat", delegate: "feat" });
    expect(SYNC_TABLE_SCOPES).toContain("feats");
    expect(SYNC_SCOPE_LABELS.feats).toBe("Риси");
  });

  it("an older bundle without feats still parses", () => {
    const old: Record<string, unknown> = { ...emptyBundle() };

    delete old.feats;

    expect((BundleSchema.parse(old) as Bundle).feats).toEqual([]);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm test:run lib/utils/feats lib/server/content/__tests__/feats-resource.test.ts lib/server/feats lib/server/content/__tests__/openapi-4f4.test.ts lib/server/templates/__tests__/bundle-feats.test.ts`
Expected: FAIL — модулів немає.

- [ ] **Step 3: Cache** — `lib/cache/tags.ts`: у `ReferenceKind` — `FEATS: "feats",`; у `TAG_PREFIX` — `feats: "feats",`; у `cacheTags` — `feats: tagFor(ReferenceKind.FEATS),`. `lib/cache/reference-data.ts` після `getCachedClasses`:

```ts
export async function getCachedFeats(campaignId: string) {
  return unstable_cache(
    async () => prisma.feat.findMany({ where: { campaignId }, orderBy: [{ type: "asc" }, { name: "asc" }] }),
    [cacheTags.feats(campaignId)],
    {
      tags: [cacheTags.feats(campaignId)],
      revalidate: REFERENCE_REVALIDATE_SECONDS,
    },
  )();
}
```

- [ ] **Step 4: Row, name, usage** —

```ts
// lib/utils/feats/row.ts
import type { Feat } from "@prisma/client";

import { isAbilityKey } from "@/lib/constants/abilities";
import { FEAT_TYPES } from "@/lib/constants/choices";
import { featAbilities, readChoiceList } from "@/lib/utils/abilities/read";
import { isRecord } from "@/lib/utils/common/is-record";
import type { FeatData, FeatPrerequisite, FeatType } from "@/types/choices";

function prerequisiteOf(raw: unknown): FeatPrerequisite {
  if (!isRecord(raw)) return {};

  const out: FeatPrerequisite = {};

  if (typeof raw.level === "number") out.level = raw.level;

  if (isRecord(raw.scores) && Array.isArray(raw.scores.abilities) && typeof raw.scores.min === "number") {
    const abilities = raw.scores.abilities.filter(isAbilityKey);

    if (abilities.length > 0) out.scores = { abilities, min: raw.scores.min };
  }

  if (typeof raw.text === "string" && raw.text.trim()) out.text = raw.text;

  return out;
}

export function toFeatData(row: Feat): FeatData {
  return {
    id: row.id,
    name: row.name,
    icon: row.icon,
    type: (FEAT_TYPES as readonly string[]).includes(row.type) ? (row.type as FeatType) : "general",
    prerequisite: prerequisiteOf(row.prerequisite),
    repeatable: row.repeatable,
    description: row.description,
    abilities: featAbilities(row),
    choices: readChoiceList(row.choices),
  };
}
```

```ts
// lib/server/feats/feat-name.ts
import { prisma } from "@/lib/db";

export async function featNameTaken(campaignId: string, name: string, exceptId?: string): Promise<boolean> {
  const clash = await prisma.feat.findFirst({
    where: { campaignId, name: { equals: name, mode: "insensitive" }, ...(exceptId && { id: { not: exceptId } }) },
    select: { id: true },
  });

  return clash !== null;
}
```

```ts
// lib/server/feats/feat-usage.ts
import "server-only";
import { prisma } from "@/lib/db";

// feat ids sit inside three JSON columns; a quoted cuid substring is exact enough
export async function featInUse(campaignId: string, featId: string): Promise<boolean> {
  const pattern = `%"${featId}"%`;

  const rows = await prisma.$queryRaw<{ count: bigint }[]>`
    SELECT count(*)::bigint AS count FROM characters
    WHERE "campaignId" = ${campaignId} AND (feats::text LIKE ${pattern} OR "raceChoices"::text LIKE ${pattern} OR classes::text LIKE ${pattern})`;

  return Number(rows[0]?.count ?? 0) > 0;
}
```

- [ ] **Step 5: Resource and routes** — `lib/server/content/define-resource.ts`: у `ContentKind` додати `| "feats"`. `lib/server/content/resources/feats.ts`:

```ts
import type { Feat as FeatRow, Prisma } from "@prisma/client";
import type { z } from "zod";

import "server-only";
import { getCachedFeats } from "@/lib/cache/reference-data";
import { ReferenceKind } from "@/lib/cache/tags";
import { API_ERRORS, featNameTakenMessage } from "@/lib/constants/api-errors";
import { prisma } from "@/lib/db";
import { createFeatSchema, updateFeatSchema } from "@/lib/schemas";
import { defineResource } from "@/lib/server/content/define-resource";
import { ContentError } from "@/lib/server/content/errors";
import { featNameTaken } from "@/lib/server/feats/feat-name";
import { featInUse } from "@/lib/server/feats/feat-usage";
import { abilitiesJson } from "@/lib/utils/abilities/read";
import { toFeatData } from "@/lib/utils/feats/row";

type CreateInput = z.infer<typeof createFeatSchema>;

type UpdateInput = z.infer<typeof updateFeatSchema>;

const json = (v: unknown) => v as Prisma.InputJsonValue;

async function assertNameFree(campaignId: string, name: string, exceptId?: string) {
  if (await featNameTaken(campaignId, name, exceptId)) throw new ContentError(featNameTakenMessage(name), 409);
}

export const featsResource = defineResource<FeatRow, CreateInput, UpdateInput>({
  kind: "feats",
  listFields: ["type", "repeatable"],
  idParam: "featId",
  label: "Риси",
  description: "Риси 5e: тип (origin/general/fightingStyle/epicBoon), передумови, повторюваність, вміння й вкладені вибори.",
  path: "/feats",
  schemas: { create: createFeatSchema, update: updateFeatSchema },
  errors: [409],
  access: { list: "member", item: "dm" },
  invalidates: [ReferenceKind.FEATS],
  notFound: API_ERRORS.FEAT_NOT_FOUND,
  list: async (actor) => (await getCachedFeats(actor.campaignId)).map(toFeatData),
  toItem: toFeatData,
  find: (actor, id) => prisma.feat.findFirst({ where: { id, campaignId: actor.campaignId } }),
  async create(actor, data) {
    await assertNameFree(actor.campaignId, data.name);

    return prisma.feat.create({
      data: {
        campaignId: actor.campaignId,
        name: data.name,
        icon: data.icon ?? null,
        type: data.type,
        prerequisite: json(data.prerequisite),
        repeatable: data.repeatable,
        description: data.description ?? null,
        abilities: abilitiesJson(data.abilities),
        choices: json(data.choices),
      },
    });
  },
  async update(actor, existing, data) {
    if (data.name !== undefined) await assertNameFree(actor.campaignId, data.name, existing.id);

    const { prerequisite, abilities, choices, ...rest } = data;

    return prisma.feat.update({
      where: { id: existing.id },
      data: { ...rest, ...(prerequisite && { prerequisite: json(prerequisite) }), ...(abilities && { abilities: abilitiesJson(abilities) }), ...(choices && { choices: json(choices) }) },
    });
  },
  async remove(actor, existing) {
    if (await featInUse(actor.campaignId, existing.id)) throw new ContentError(API_ERRORS.FEAT_IN_USE, 409);

    await prisma.feat.deleteMany({ where: { id: existing.id, campaignId: actor.campaignId } });
  },
});
```

`lib/server/content/resources/index.ts` — імпорт і рядок `feats: featsResource,` після `classes: classesResource,`.

`app/api/campaigns/[id]/feats/route.ts`:

```ts
import { featsResource } from "@/lib/server/content/resources/feats";
import { collectionRoutes } from "@/lib/utils/api/content-routes";

export const { GET, POST } = collectionRoutes(featsResource);
```

`app/api/campaigns/[id]/feats/[featId]/route.ts`:

```ts
import { featsResource } from "@/lib/server/content/resources/feats";
import { itemRoutes } from "@/lib/utils/api/content-routes";

export const { GET, PATCH, DELETE } = itemRoutes(featsResource);
```

- [ ] **Step 6: OpenAPI shared `Choice`** — `lib/server/content/json-schema.ts`: `import { ChoiceSchema } from "@/lib/schemas/choices";` і в `SHARED_SCHEMAS` після `[ClassColumnSchema, "ClassColumn"],` — `[ChoiceSchema, "Choice"],`. Дозволена правка: `lib/server/content/__tests__/openapi.test.ts` (рядок 57) і `lib/server/content/__tests__/openapi-4f2.test.ts` (рядок 21) — `135_000` → `145_000`.

- [ ] **Step 7: Import/export** —
  - `types/content-import.ts`: `ImportKind` + `| "feats"`; в `ImportField` після `ref?: ImportKind;`:

```ts
  /** json: глибоко замінює назви на id у властивості `key` (напр. spellId у виборах раси) */
  nestedRef?: { kind: ImportKind; key: string };
```

  (сам резолвер — задача 5).
  - `lib/utils/content/import/kinds.ts`: `IMPORT_KINDS` — додати `"feats"` після `"classes"`.
  - `lib/utils/content/import/fields/feats.ts`:

```ts
import { abilitiesField, jsonField, nameField, recordLabels, textField } from "./common";

import { FEAT_TYPE_LABELS, FEAT_TYPES } from "@/lib/constants/choices";
import type { ImportSpec } from "@/types/content-import";

export const FEATS_IMPORT: ImportSpec = {
  kind: "feats",
  label: "Риси",
  fields: [
    nameField(["Пильний", "Влучний стрілець"]),
    textField("icon", "Іконка", ["icon"]),
    { key: "type", label: "Тип", aliases: ["type", "тип"], type: "enum", enumValues: FEAT_TYPES, enumLabels: recordLabels(FEAT_TYPE_LABELS), examples: ["Походження", "Стиль бою"] },
    jsonField("prerequisite", "Передумови (JSON)", ["prerequisite", "передумова", "передумови"], ["{}", '{"level":4}']),
    { key: "repeatable", label: "Повторювана", aliases: ["repeatable"], type: "bool", examples: ["ні", "ні"] },
    textField("description", "Опис", ["description", "опис"], ["Майстерність до ініціативи", "+2 до дальніх атак"]),
    abilitiesField(),
    jsonField("choices", "Вибори (JSON)", ["choices", "вибори"], ["[]", "[]"]),
  ],
};
```

  - `lib/utils/content/import/fields/index.ts`: імпорт і `feats: FEATS_IMPORT,` після `classes`.
  - `lib/server/content/import/names.ts`: `feats: (c) => prisma.feat.findMany(args(c)),`.
  - `lib/server/content/import/export.ts`: `import { featAbilities } from …/read` (поруч з іншими) і `feats: async (c) => asRecords((await prisma.feat.findMany(query(c))).map((r) => ({ ...r, abilities: featAbilities(r) }))),`.
  - `lib/hooks/content-import/keys.ts`: `import { featKeys } from "@/lib/hooks/feats/keys";` і `feats: (c) => [featKeys.list(c)],`.
  - Дозволена правка: `lib/utils/content/import/__tests__/fields.test.ts` і `lib/server/content/__tests__/import-content.test.ts` — у `CREATE` рядок `feats: createFeatSchema,` (+ `createFeatSchema` в імпорті з `@/lib/schemas`).

- [ ] **Step 8: Bundle and sync** — `lib/constants/source-sync.ts`: `SYNC_TABLE_SCOPES` — `"feats"` після `"classes"`; `SYNC_SCOPE_LABELS` — `feats: "Риси",` після `classes: "Класи",`. `lib/server/templates/bundle.ts`: `Delegate` + `| "feat"`; `SCALAR_ENUMS` — `Feat: Prisma.FeatScalarFieldEnum,` після `GameClass`; `MODEL_TO_KEY` — `Feat: "feats",`; `BUNDLE_TABLES` — `table("feats", "Feat", "feat"),` одразу після `table("classes", …)`; `BundleSchema` — після `classes: rowSchema.default([]),` рядок `feats: rowSchema.default([]),`; `TemplateDb` — додати `"feat"` у `Pick<…>`.

- [ ] **Step 9: Client** —

```ts
// lib/api/feats.ts
import { createCampaignCrudApi } from "@/lib/api/client";
import type { FeatData, FeatFormData } from "@/types/choices";

const featsApi = createCampaignCrudApi<FeatData, FeatFormData, Partial<FeatFormData>, { ok: true }>("/feats");

export const getFeats = featsApi.list;
export const getFeat = featsApi.get;
export const createFeat = featsApi.create;
export const updateFeat = featsApi.update;
export const deleteFeat = featsApi.remove;
```

```ts
// lib/hooks/feats/keys.ts
export const featKeys = {
  list: (campaignId: string) => ["feats", campaignId] as const,
  detail: (campaignId: string, featId: string) => ["feats", campaignId, featId] as const,
};
```

```ts
// lib/hooks/feats/useFeats.ts
import { useQuery } from "@tanstack/react-query";

import { featKeys } from "./keys";

import { createFeat, deleteFeat, getFeat, getFeats, updateFeat } from "@/lib/api/feats";
import { characterKeys } from "@/lib/hooks/characters/keys";
import { useCrudMutation } from "@/lib/hooks/common";
import { REFERENCE_STALE_MS } from "@/lib/providers/query-provider";
import type { FeatData, FeatFormData } from "@/types/choices";

const featDependentKeys = (campaignId: string) => [featKeys.list(campaignId), characterKeys.sheet(campaignId)];

export function useFeats(campaignId: string, opts?: { enabled?: boolean }) {
  return useQuery<FeatData[]>({ queryKey: featKeys.list(campaignId), staleTime: REFERENCE_STALE_MS, queryFn: () => getFeats(campaignId), enabled: opts?.enabled ?? true });
}

export function useFeat(campaignId: string, featId: string) {
  return useQuery<FeatData>({ queryKey: featKeys.detail(campaignId, featId), staleTime: REFERENCE_STALE_MS, queryFn: () => getFeat(campaignId, featId) });
}

export function useCreateFeat(campaignId: string) {
  return useCrudMutation({ mutationFn: (data: FeatFormData) => createFeat(campaignId, data), invalidateKeys: [featKeys.list(campaignId)] });
}

export function useUpdateFeat(campaignId: string) {
  return useCrudMutation({ mutationFn: ({ featId, data }: { featId: string; data: Partial<FeatFormData> }) => updateFeat(campaignId, featId, data), invalidateKeys: featDependentKeys(campaignId) });
}

export function useDeleteFeat(campaignId: string) {
  return useCrudMutation({ mutationFn: (featId: string) => deleteFeat(campaignId, featId), invalidateKeys: featDependentKeys(campaignId) });
}
```

```ts
// lib/hooks/feats/index.ts
export { useCreateFeat, useDeleteFeat, useFeat, useFeats, useUpdateFeat } from "./useFeats";
```

(Без `"use client"` у `keys.ts` — ключі можуть знадобитися серверу для `PrefetchedQuery`.)

- [ ] **Step 10: Run tests**

Run: `pnpm test:run lib/utils/feats lib/server/feats lib/server/content lib/server/templates lib/utils/content lib/cache app/api/__tests__/campaign-templates-api.test.ts app/api/__tests__/campaign-delete-api.test.ts && pnpm exec tsc --noEmit -p tsconfig.json`
Expected: PASS — зокрема `registry.test.ts` (роути `feats` з `collectionRoutes(`/`itemRoutes(`), `openapi.test.ts` (операції `feats.*`, шляхи існують, `< 145_000`), `tool-schemas.test.ts` (`FeatsCreate` ≤ 24 000), `fields.test.ts`/`import-content.test.ts` (приклади рис проходять схему), `apply.test.ts` (`SYNC_SCOPES` = таблиці бандла + rules/settings). Виміряти розмір: `pnpm test:run lib/server/content/__tests__/openapi-4f4.test.ts` і тимчасово `console.warn(JSON.stringify(doc).length)` у тесті (не комітити) — число записати в повідомлення коміту.

- [ ] **Step 11: Commit**

```bash
git add lib/cache lib/utils/feats lib/server/feats lib/server/content lib/server/templates/bundle.ts lib/server/templates/__tests__/bundle-feats.test.ts lib/constants/source-sync.ts app/api/campaigns/\[id\]/feats types/content-import.ts lib/utils/content/import lib/api/feats.ts lib/hooks/feats lib/hooks/content-import/keys.ts
git commit -m "feat(constructor): 4f-4 feats content kind — resource, routes, import/export, bundle, sync, OpenAPI

OpenAPI document: <виміряне число> chars (limit raised 135000 -> 145000).

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---
### Task 5: `choices` раси й фіч класу, `spellList`, `Spell.lists` — схеми, ресурси, рядки, імпорт (`nestedRef`), експорт, OpenAPI

**Files:**
- Create: `lib/utils/characters/choices/columns.ts`
- Modify: `lib/utils/characters/choices/read.ts`, `lib/schemas/races.ts`, `lib/schemas/classes.ts`, `lib/schemas/spells.ts`, `lib/server/content/resources/races.ts`, `lib/server/races/update-race.ts`, `lib/server/content/resources/classes.ts`, `lib/server/content/resources/spells.ts`, `lib/utils/characters/classes/row.ts`, `lib/utils/races/to-race.ts`, `lib/utils/content/import/kinds.ts`, `lib/utils/content/import/values.ts`, `lib/server/content/import/import-content.ts`, `lib/utils/content/import/fields/races.ts`, `lib/utils/content/import/fields/classes.ts`, `lib/utils/content/import/fields/spells.ts`, `lib/utils/spells/model/form.ts`
- Test: `lib/schemas/__tests__/choices-owners.test.ts`, `lib/server/content/__tests__/choices-resources.test.ts`, `lib/server/content/__tests__/import-nested-ref.test.ts`, `lib/server/content/__tests__/openapi-4f4.test.ts` (дописати `it`)

**Interfaces:**
- Consumes: `RaceChoicesSchema`, `ClassChoicesSchema`, `SpellListsSchema` (задача 2); `ImportField.nestedRef` (тип із задачі 4); `readChoices`, `readSpellLists` (задача 2).
- Produces:
  - `choiceSpellIds(choices: readonly Choice[] | undefined): string[] | undefined` (у `read.ts`, без zod).
  - `choiceColumnIssues(choices, columns: readonly ClassColumn[] | null)` і `classChoiceIdIssues(features, subclasses)` (`lib/utils/characters/choices/columns.ts`, без zod).
  - Схеми: `createRaceSchema`/`updateRaceSchema` + `choices?: Choice[]`; фіча класу + `choices?: Choice[]`, `createClassSchema`/`updateClassSchema` + `spellList?: string | null`; `createSpellSchema`/`updateSpellSchema` + `lists?: string[]`.
  - `toGameClassData` → `spellList` (лише непорожній); `toRace` → `choices` (лише непорожні); `spellToForm`/`formToPayload` → `lists` (лише якщо є).
  - Імпорт: `resolveNestedRefs` у `planRow`; `refKindsOf` враховує `nestedRef.kind`; `formatFieldValue` повертає назви для `nestedRef`; поле раси `choices` з `nestedRef: { kind: "spells", key: "spellId" }`, поле класу `spellList`, поле заклинання `lists`.

- [ ] **Step 1: Write the failing tests**

`lib/schemas/__tests__/choices-owners.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { createClassSchema, createRaceSchema, createSpellSchema, updateClassSchema, updateSpellSchema } from "@/lib/schemas";

const column = (key: string) => ({ key, label: key, values: Array.from({ length: 20 }, () => "2") });

const skill = (id: string, extra: object = {}) => ({ id, label: id, kind: "skill", ...extra });

describe("owners carry choices", () => {
  it("race: choices with lineage", () => {
    expect(createRaceSchema.parse({ name: "Elf", choices: [skill("keen-senses"), { id: "l", label: "L", kind: "option", lineage: true, options: [{ id: "a", name: "A", spells: [{ level: 1, spellId: "Druidcraft" }] }] }] }).choices).toHaveLength(2);
    expect(createRaceSchema.safeParse({ name: "Elf", choices: [skill("k", { count: { scale: "x" } })] }).success).toBe(false);
  });

  it("class: feature choices; scale must name a column; ids unique across features and the subclass", () => {
    const features = [{ level: 2, abilities: [], choices: [skill("metamagic", { count: { scale: "metamagic" } })] }];

    expect(createClassSchema.safeParse({ name: "S", columns: [column("metamagic")], features }).success).toBe(true);
    expect(createClassSchema.safeParse({ name: "S", columns: [], features }).success).toBe(false);
    expect(createClassSchema.safeParse({ name: "S", features: [{ level: 1, abilities: [], choices: [skill("a")] }, { level: 2, abilities: [], choices: [skill("a")] }] }).success).toBe(false);
    expect(
      createClassSchema.safeParse({ name: "S", features: [{ level: 1, abilities: [], choices: [skill("a")] }], subclasses: [{ id: "sub", name: "Sub", features: [{ level: 3, abilities: [], choices: [skill("a")] }] }], subclassLevel: 3 }).success,
    ).toBe(false);
    expect(createClassSchema.parse({ name: "S", spellList: "Wizard" }).spellList).toBe("Wizard");
    expect(updateClassSchema.safeParse({ spellList: null }).success).toBe(true);
  });

  it("spell lists: ≤ 20 tags of ≤ 40 chars", () => {
    expect(createSpellSchema.parse({ name: "Fire Bolt", lists: ["Wizard", "Sorcerer"] }).lists).toEqual(["Wizard", "Sorcerer"]);
    expect(createSpellSchema.parse({ name: "Fire Bolt" }).lists).toBeUndefined();
    expect(updateSpellSchema.safeParse({ lists: Array.from({ length: 21 }, (_, i) => `L${i}`) }).success).toBe(false);
    expect(updateSpellSchema.safeParse({ lists: ["x".repeat(41)] }).success).toBe(false);
  });
});
```

`lib/server/content/__tests__/choices-resources.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({ race: { count: vi.fn(), create: vi.fn() }, gameClass: { create: vi.fn() }, spell: { create: vi.fn() } }));

const refs = vi.hoisted(() => vi.fn());

vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", () => ({ prisma: db }));
vi.mock("@/lib/cache/reference-data", () => ({ getCachedRaces: vi.fn(async () => []), getCachedClasses: vi.fn(async () => []), getCachedSpells: vi.fn(async () => []) }));
vi.mock("@/lib/server/races/race-name", () => ({ raceNameTaken: vi.fn(async () => false) }));
vi.mock("@/lib/server/classes/class-name", () => ({ classNameTaken: vi.fn(async () => false) }));
vi.mock("@/lib/server/campaigns/campaign-refs", () => ({ assertCampaignRefs: refs, addedIds: (next: string[] | undefined, prev: unknown) => (next === undefined ? undefined : next.filter((id) => !(Array.isArray(prev) ? prev : []).includes(id))) }));

import { createClassSchema, createRaceSchema, createSpellSchema } from "@/lib/schemas";
import { classesResource } from "@/lib/server/content/resources/classes";
import { racesResource } from "@/lib/server/content/resources/races";
import { spellsResource } from "@/lib/server/content/resources/spells";
import type { Actor } from "@/lib/utils/api/actor";

const actor: Actor = { campaignId: "c1", userId: "u", isDM: true, via: "session", scopes: null };

describe("choices on owners", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    db.race.count.mockResolvedValue(0);
  });

  it("race create writes choices and checks the spell refs of its options", async () => {
    const choices = [{ id: "l", label: "L", kind: "option", lineage: true, options: [{ id: "a", name: "A", spells: [{ level: 1, spellId: "sp1" }, { level: 3, spellId: "sp2" }] }] }];

    await racesResource.create(actor, createRaceSchema.parse({ name: "Elf", choices }));

    expect(db.race.create.mock.calls[0][0].data.choices).toMatchObject(choices);
    expect(refs).toHaveBeenCalledWith("c1", expect.objectContaining({ spell: ["sp1", "sp2"] }));
  });

  it("race without choices writes no choices key", async () => {
    await racesResource.create(actor, createRaceSchema.parse({ name: "Human" }));

    expect(db.race.create.mock.calls[0][0].data).not.toHaveProperty("choices");
  });

  it("class create writes spellList and feature choices", async () => {
    await classesResource.create(actor, createClassSchema.parse({ name: "Wizard", spellList: "Wizard", features: [{ level: 1, abilities: [], choices: [{ id: "c", label: "C", kind: "skill" }] }] }));

    expect(db.gameClass.create.mock.calls[0][0].data).toMatchObject({ spellList: "Wizard", features: [{ level: 1, choices: [{ id: "c" }] }] });
  });

  it("spell create writes lists only when given", async () => {
    db.spell.create.mockResolvedValue({ id: "s1" });

    await spellsResource.create(actor, createSpellSchema.parse({ name: "Fire Bolt", lists: ["Wizard"] }));
    await spellsResource.create(actor, createSpellSchema.parse({ name: "Old" }));

    expect(db.spell.create.mock.calls[0][0].data.lists).toEqual(["Wizard"]);
    expect(db.spell.create.mock.calls[1][0].data).not.toHaveProperty("lists");
  });
});
```

`lib/server/content/__tests__/import-nested-ref.test.ts`:

```ts
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { createRaceSchema } from "@/lib/schemas";
import type { AnyContentResource } from "@/lib/server/content/define-resource";
import { importContent } from "@/lib/server/content/import/import-content";
import type { Actor } from "@/lib/utils/api/actor";
import { IMPORT_SPECS } from "@/lib/utils/content/import";
import { recordToCells } from "@/lib/utils/content/import/mapping";

const actor: Actor = { campaignId: "c1", userId: "u", isDM: true, via: "session", scopes: null };

const resource = { schemas: { create: createRaceSchema, update: createRaceSchema }, invalidates: [] } as unknown as AnyContentResource;

const spells = [{ id: "sp-druidcraft", name: "Druidcraft" }, { id: "sp-longstrider", name: "Longstrider" }];

const choices = [{ id: "l", label: "L", kind: "option", lineage: true, options: [{ id: "wood-elf", name: "Wood Elf", spells: [{ level: 1, spellId: "Druidcraft" }, { level: 3, spellId: "longstrider" }, { level: 5, spellId: "Nope" }] }] }];

describe("nested spell names in race choices", () => {
  it("resolves names (case-insensitive) and ids, warns on unknown", async () => {
    const report = await importContent(actor, "races", { rows: [{ name: "Elf", choices: JSON.stringify(choices) }], mode: "create", dryRun: true }, { resource: () => resource, loadNames: async (_c, k) => (k === "spells" ? spells : []) });

    expect(report.results[0].status).toBe("created");
    expect(report.results[0].issues).toEqual([{ field: "choices", level: "warning", message: "Вибори (JSON): не знайдено «Nope» (Заклинання)" }]);
  });

  it("export writes names back", () => {
    const record = { name: "Elf", choices: [{ ...choices[0], options: [{ ...choices[0].options[0], spells: [{ level: 1, spellId: "sp-druidcraft" }] }] }] };

    const cells = recordToCells(IMPORT_SPECS.races, record, (kind, id) => (kind === "spells" ? spells.find((s) => s.id === id)?.name : undefined));

    expect(cells.join("|")).toContain('"spellId":"Druidcraft"');
  });
});
```

(`recordToCells(spec, record, nameOf)` — наявна функція `lib/utils/content/import/mapping.ts`, яку викликає `exportCsv`; якщо її сигнатура інша — підлаштувати виклик у тесті під неї, не змінюючи функцію.)

У `lib/server/content/__tests__/openapi-4f4.test.ts` дописати:

```ts
  it("races and classes reference the shared Choice", () => {
    expect(JSON.stringify(doc.components.schemas.RacesCreate)).toContain("#/components/schemas/Choice");
    expect(JSON.stringify(doc.components.schemas.ClassesCreate)).toContain("#/components/schemas/Choice");
    expect(JSON.stringify(doc.components.schemas.SpellsCreate)).toContain("lists");
  });
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm test:run lib/schemas/__tests__/choices-owners.test.ts lib/server/content/__tests__/choices-resources.test.ts lib/server/content/__tests__/import-nested-ref.test.ts lib/server/content/__tests__/openapi-4f4.test.ts`
Expected: FAIL — полів `choices`/`spellList`/`lists` немає, `nestedRef` не обробляється.

- [ ] **Step 3: Pure helpers** — у `lib/utils/characters/choices/read.ts` дописати:

```ts
export function choiceSpellIds(choices: readonly Choice[] | undefined): string[] | undefined {
  if (!choices) return undefined;

  return [...new Set(choices.flatMap((c) => (c.options ?? []).flatMap((o) => (o.spells ?? []).map((s) => s.spellId))))];
}
```

`lib/utils/characters/choices/columns.ts`:

```ts
import { columnRefIssues } from "@/lib/utils/abilities/class-columns";
import type { Choice } from "@/types/choices";
import type { ClassColumn } from "@/types/classes";

type Issue = { path: (string | number)[]; message: string };

export function choiceColumnIssues(choices: readonly Choice[] | undefined, columns: readonly ClassColumn[] | null): Issue[] {
  return (choices ?? []).flatMap((c, i) => [
    ...(typeof c.count !== "number" && !(columns ?? []).some((col) => col.key === (c.count as { scale: string }).scale)
      ? [{ path: [i, "count"], message: `Немає колонки «${c.count.scale}» у таблиці класу` }]
      : []),
    ...(c.options ?? []).flatMap((o, k) => columnRefIssues(o.abilities, columns).map((issue) => ({ path: [i, "options", k, "abilities", ...issue.path], message: issue.message }))),
  ]);
}

type FeatureChoices = { choices?: readonly Choice[] };

export function classChoiceIdIssues(features: readonly FeatureChoices[] | undefined, subclasses: ReadonlyArray<{ features: readonly FeatureChoices[] }> | undefined): Issue[] {
  const ids = (list: readonly FeatureChoices[] | undefined) => (list ?? []).flatMap((f) => (f.choices ?? []).map((c) => c.id));

  const own = ids(features);

  const repeated = (list: string[]) => list.filter((id, i) => list.indexOf(id) !== i);

  return [
    ...repeated(own).map((id) => ({ path: ["features"], message: `Id вибору «${id}» повторюється` })),
    ...(subclasses ?? []).flatMap((s, k) => repeated([...own, ...ids(s.features)]).filter((id) => !repeated(own).includes(id)).map((id) => ({ path: ["subclasses", k, "features"], message: `Id вибору «${id}» повторюється` }))),
  ];
}
```

- [ ] **Step 4: Schemas** —
  - `lib/schemas/races.ts`: `import { RaceChoicesSchema } from "@/lib/schemas/choices";`; у `createRaceSchema` і `updateRaceSchema` після `abilities` — `choices: RaceChoicesSchema.describe("Вибори раси: лінія (lineage), навички, риси, опції; spellId опції — id заклинання").optional(),`.
  - `lib/schemas/classes.ts`: `import { ClassChoicesSchema } from "@/lib/schemas/choices";` і `import { choiceColumnIssues, classChoiceIdIssues } from "@/lib/utils/characters/choices/columns";`; `const featureSchema = z.object({ level: …, abilities: AbilitiesSchema, choices: ClassChoicesSchema.optional() });`; `type FeatureLike = { abilities: Parameters<typeof columnRefIssues>[0]; choices?: Parameters<typeof choiceColumnIssues>[0] };`; у `refsIssues` всередині `check` до наявних issues дописати `...choiceColumnIssues(f.choices, columns).map((issue) => ({ path: [...base, i, "choices", ...issue.path], message: issue.message }))` (тобто `check` повертає `flatMap((f, i) => [...abilityIssues, ...choiceIssues])`); `tableIssues` — `[...columnsIssues(c), ...refsIssues(c), ...classChoiceIdIssues(c.features, c.subclasses)]`; у `createClassSchema` після `columns: columnsSchema.default([]),` — `spellList: z.string().trim().min(1).max(40).nullable().optional(),`; у `updateClassSchema` — те саме поле.
  - `lib/schemas/spells.ts`: `import { SpellListsSchema } from "@/lib/schemas/choices";`; у `spellFields` після `fx` — `lists: SpellListsSchema.describe("Теги списків заклинань класів (Wizard, Cleric…)"),`; у `createSpellSchema` — `lists: spellFields.lists.optional(),`. (`updateSpellSchema = z.object(spellFields).partial()` отримує поле автоматично.)

- [ ] **Step 5: Resources and rows** —
  - `lib/server/content/resources/races.ts`: `import { choiceSpellIds, readChoices } from "@/lib/utils/characters/choices/read";`; у `create` виклик `assertCampaignRefs(actor.campaignId, { mainSkill: data.availableSkills, skill: data.disabledSkills, spell: choiceSpellIds(data.choices) });` і в `data` — `...(data.choices && { choices: data.choices as unknown as Prisma.InputJsonValue }),`; в `update` до об'єкта `assertCampaignRefs` — `spell: addedIds(choiceSpellIds(data.choices), choiceSpellIds(readChoices(existing.choices)) ?? []),`.
  - `lib/server/races/update-race.ts`: у `data` — `...(data.choices !== undefined && { choices: data.choices as unknown as Prisma.InputJsonValue }),`.
  - `lib/server/content/resources/classes.ts`: у `create` → `data` — `...(data.spellList !== undefined && { spellList: data.spellList }),`; в `update` до `issues` додати `...[...features, ...subclasses.flatMap((s) => s.features)].flatMap((f) => choiceColumnIssues(f.choices, columns))` (імпорт з `@/lib/utils/characters/choices/columns`). `updateData` пропускає `spellList` через `...rest` сам.
  - `lib/server/content/resources/spells.ts`: у `create` → `data` — `...(data.lists && { lists: data.lists }),`; в `update` → `data` — `lists: data.lists,`.
  - `lib/utils/characters/classes/row.ts` (`toGameClassData`): останнім полем — `...(row.spellList && { spellList: row.spellList }),`.
  - `lib/utils/races/to-race.ts`: `import { readChoices } from "@/lib/utils/characters/choices/read";` і перед `createdAt` — `...(Array.isArray(row.choices) && row.choices.length > 0 && { choices: readChoices(row.choices) }),` (тип параметра `Omit<RaceRow, "abilities">` уже містить `choices` після `prisma generate`).
  - `lib/utils/spells/model/form.ts`: у `spellToForm` — `...(row.lists?.length && { lists: row.lists }),`; у `formToPayload` (функція, що будує тіло з `SpellFormData`) — `...(form.lists && { lists: form.lists }),`.

- [ ] **Step 6: Import `nestedRef`** —
  - `lib/utils/content/import/kinds.ts`: `refKindsOf` — `spec.fields.flatMap((f) => { const kinds = [f.ref, f.nestedRef?.kind].filter((k): k is ImportKind => !!k); return !types || types.includes(f.type) ? kinds : []; })` у `new Set(...)` (імпортувати `ImportKind`).
  - `lib/server/content/import/import-content.ts` — після `resolveRefs`:

```ts
function resolveNestedRefs(record: ImportRecord, fields: readonly ImportField[], refs: Map<ImportKind, NameIndex>, issues: ImportIssue[]) {
  for (const field of fields) {
    const nested = field.nestedRef;

    const value = record[field.key];

    if (!nested || value === undefined) continue;

    const index = refs.get(nested.kind);

    const kindLabel = IMPORT_SPECS[nested.kind].label;

    const walk = (v: unknown): unknown => {
      if (Array.isArray(v)) return v.map(walk);

      if (!isRecord(v)) return v;

      return Object.fromEntries(
        Object.entries(v).map(([k, x]) => {
          if (k !== nested.key || typeof x !== "string") return [k, walk(x)];

          const id = index?.ids.has(x) ? x : index?.byName.get(nameKey(x))?.[0];

          if (!id) issues.push({ field: field.key, level: "warning", message: `${field.label}: не знайдено «${x}» (${kindLabel})` });

          return [k, id ?? x];
        }),
      );
    };

    record[field.key] = walk(value);
  }
}
```

  і в `planRow` одразу після `resolveRefs(record, ctx.spec.fields, ctx.refs, issues, op);` — `resolveNestedRefs(record, ctx.spec.fields, ctx.refs, issues);`.
  - `lib/utils/content/import/values.ts` — перед `formatFieldValue`:

```ts
function namesInside(value: unknown, nested: NonNullable<ImportField["nestedRef"]>, nameOf: (kind: ImportKind, id: string) => string | undefined): unknown {
  if (Array.isArray(value)) return value.map((v) => namesInside(v, nested, nameOf));

  if (!value || typeof value !== "object") return value;

  return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, k === nested.key && typeof v === "string" ? (nameOf(nested.kind, v) ?? v) : namesInside(v, nested, nameOf)]));
}
```

  у `formatFieldValue` виділити окремий `case "json":` перед `case "attacks": case "abilitiesText":`:

```ts
    case "json": {
      const mapped = field.nestedRef ? namesInside(value, field.nestedRef, nameOf) : value;

      return Array.isArray(mapped) && mapped.length === 0 ? "" : JSON.stringify(mapped);
    }
```

  - `lib/utils/content/import/fields/races.ts`: перед `abilitiesField()` — `{ ...jsonField("choices", "Вибори (JSON)", ["choices", "вибори", "лінії", "lineages"], ["[]", ""]), nestedRef: { kind: "spells", key: "spellId" } },`.
  - `lib/utils/content/import/fields/classes.ts`: після `columns` — `textField("spellList", "Список заклинань", ["spell list", "список заклинань"], ["", "Wizard"]),`.
  - `lib/utils/content/import/fields/spells.ts`: після `fx` — `{ key: "lists", label: "Списки", aliases: ["lists", "списки", "spell lists"], type: "list", examples: ["Wizard, Sorcerer", "Cleric"] },`.

- [ ] **Step 7: Run tests**

Run: `pnpm test:run lib/schemas lib/server/content lib/utils/content lib/utils/races lib/utils/characters lib/utils/spells app/api/__tests__/spells-api.test.ts app/api/__tests__/races-api.test.ts && pnpm exec tsc --noEmit -p tsconfig.json`
Expected: PASS (якщо `races-api.test.ts` не існує — прибрати з команди). OpenAPI `< 145_000` — інакше стиснути `describe` нових полів (не піднімати межу).

- [ ] **Step 8: Commit**

```bash
git add lib/utils/characters/choices/read.ts lib/utils/characters/choices/columns.ts lib/schemas lib/server/content lib/server/races/update-race.ts lib/utils/characters/classes/row.ts lib/utils/races/to-race.ts lib/utils/content/import lib/utils/spells/model/form.ts
git commit -m "feat(constructor): 4f-4 race and class choices, spell lists, nested spell names in import

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---
### Task 6: Сервер виборів — `resolveCharacterChoices`, `PUT …/choices`, журнал, клієнт і хук

**Files:**
- Create: `lib/server/characters/choices/load-refs.ts`, `lib/server/characters/choices/resolve-choices.ts`, `app/api/campaigns/[id]/characters/[characterId]/choices/route.ts`, `app/api/campaigns/[id]/characters/[characterId]/choices/choices-handler.ts`, `lib/hooks/characters/useCharacterChoices.ts`
- Modify: `lib/api/characters.ts`, `lib/hooks/characters/index.ts`
- Test: `app/api/campaigns/[id]/characters/[characterId]/choices/__tests__/choices.test.ts`, `lib/server/characters/choices/__tests__/resolve-choices.test.ts`

**Interfaces:**
- Consumes: `planChoices`, `choicesStateOf`, `withClassPicks` (задача 3); `readChoiceList`, `readSpellLists` (задача 2); `toFeatData`, `getCachedFeats` (задача 4); `ChoicesBodySchema` (задача 2); `rejectIfInActiveBattle`, `lockCharacters`, `writeCharacterLog`, `requireCharacterAccess` (наявні).
- Produces:
  - `loadChoiceRefs(campaignId: string, raceName: string, opts: { classMode: boolean }): Promise<ChoiceRefs>` (server-only).
  - `characterClassMode(rules: Ruleset, classes: readonly CharacterClassEntry[]): boolean` = `rules.classes.enabled && classes.length > 0`.
  - `resolveCharacterChoices(input: { campaignId: string; rules: Ruleset; isDM: boolean; character: { race: string; level: number; skills: unknown } & Record<AbilityKey, number>; before: ChoicesState; after: ChoicesState; refs?: ChoiceRefs }): Promise<{ ok: true; fields: ChoiceFields; state: ChoicesState } | { ok: false; response: NextResponse }>`, де `ChoiceFields = { raceChoices: Prisma.InputJsonValue; feats: Prisma.InputJsonValue; classes: Prisma.InputJsonValue; subrace?: string | null } & Partial<Record<AbilityKey, number>>`.
  - `PUT /api/campaigns/{id}/characters/{characterId}/choices` (тіло `ChoicesBody`) → оновлений `Character` (`include: { user, inventory }`, `omit: { notes }`), журнал `choices_edit` `{ before, after, scores }`.
  - Клієнт: `putCharacterChoices(campaignId, characterId, body: ChoicesBody): Promise<Character>`; `useCharacterChoices({ campaignId, characterId, onSaved? }) → { save(body): Promise<boolean>; isPending: boolean; error: string | null; issues: ChoiceIssue[]; clear(): void }`.

- [ ] **Step 1: Write the failing tests**

`lib/server/characters/choices/__tests__/resolve-choices.test.ts`:

```ts
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/server/characters/choices/load-refs", () => ({ loadChoiceRefs: vi.fn() }));

import { refs, scores, sorcerer } from "@/lib/utils/characters/choices/__tests__/fixtures";
import { characterClassMode, resolveCharacterChoices } from "@/lib/server/characters/choices/resolve-choices";
import { DEFAULT_RULES } from "@/lib/utils/rules/defaults";

const rules = { ...DEFAULT_RULES, classes: { enabled: true } };

const character = { race: "Elf", level: 4, skills: {}, ...scores };

describe("resolveCharacterChoices", () => {
  it("class mode needs rules and at least one class entry", () => {
    expect(characterClassMode(rules, [{ classId: "c", level: 1 }])).toBe(true);
    expect(characterClassMode(rules, [])).toBe(false);
    expect(characterClassMode(DEFAULT_RULES, [{ classId: "c", level: 1 }])).toBe(false);
  });

  it("returns prisma fields: JSON columns, subrace, changed scores", async () => {
    const before = { raceChoices: {}, feats: [], classes: [{ classId: sorcerer.id, level: 4 }] };

    const after = { ...before, raceChoices: { "elven-lineage": [{ id: "drow" }] }, classes: [{ classId: sorcerer.id, level: 4, choices: { "ability-score-improvement-4": [{ id: "f-asi", picks: { asi: [{ id: "strength" }, { id: "dexterity" }] } }] } }] };

    const result = await resolveCharacterChoices({ campaignId: "c1", rules, isDM: true, character, before, after, refs });

    expect(result).toMatchObject({ ok: true, fields: { raceChoices: after.raceChoices, subrace: "Drow", strength: 16, dexterity: 15, classes: after.classes, feats: [] } });
  });

  it("422 with issues on an invalid pick", async () => {
    const result = await resolveCharacterChoices({ campaignId: "c1", rules, isDM: true, character, before: { raceChoices: {}, feats: [], classes: [] }, after: { raceChoices: { "keen-senses": [{ id: "arcana" }] }, feats: [], classes: [] }, refs });

    expect(result.ok).toBe(false);

    if (result.ok) return;

    expect(result.response.status).toBe(422);
    expect(await result.response.json()).toMatchObject({ error: expect.stringContaining("Навичка"), issues: [{ code: "SKILL_NOT_ALLOWED", path: "raceChoices.keen-senses" }] });
  });
});
```

`app/api/campaigns/[id]/characters/[characterId]/choices/__tests__/choices.test.ts`:

```ts
import { NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { prisma } from "@/lib/db";
import * as access from "@/lib/server/characters/access";
import { refs, scores, sorcerer } from "@/lib/utils/characters/choices/__tests__/fixtures";
import { DEFAULT_RULES } from "@/lib/utils/rules/defaults";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/server/characters/access", () => ({ requireCharacterAccess: vi.fn() }));
vi.mock("@/lib/server/characters/choices/load-refs", () => ({ loadChoiceRefs: vi.fn(async () => refs) }));
vi.mock("@/lib/db", () => {
  const prisma = {
    character: { findUnique: vi.fn(), update: vi.fn(async ({ data }: { data: object }) => ({ id: "ch", ...data })) },
    characterLog: { createMany: vi.fn() },
    battleParticipant: { findFirst: vi.fn(async () => null) },
    $queryRaw: vi.fn(async () => []),
    $transaction: vi.fn(),
  };

  prisma.$transaction.mockImplementation(async (fn: (tx: unknown) => unknown) => fn(prisma));

  return { prisma };
});

const row = { id: "ch", campaignId: "camp", controlledBy: "player", status: "active", race: "Elf", level: 4, skills: {}, raceChoices: {}, feats: [], classes: [{ classId: sorcerer.id, level: 4 }], ...scores };

const gate = ({ isDM = true, allowPlayerEdit = true, character = row } = {}) => {
  vi.mocked(access.requireCharacterAccess).mockResolvedValue({
    access: { userId: isDM ? "dm" : "player", isDM, campaign: { id: "camp", maxLevel: 20, allowPlayerEdit, rules: { ...DEFAULT_RULES, classes: { enabled: true } } } },
    character,
  } as never);
  vi.mocked(prisma.character.findUnique).mockResolvedValue(character as never);
};

const put = async (body: object) => {
  const { PUT } = await import("../route");

  return PUT(new Request("http://x", { method: "PUT", body: JSON.stringify(body) }), { params: Promise.resolve({ id: "camp", characterId: "ch" }) }) as Promise<NextResponse>;
};

describe("PUT choices", () => {
  beforeEach(() => vi.clearAllMocks());

  it("DM saves the lineage: subrace, JSON columns and a choices_edit log entry", async () => {
    gate();

    const res = await put({ raceChoices: { "elven-lineage": [{ id: "wood-elf" }] } });

    expect(res.status).toBe(200);
    expect(vi.mocked(prisma.character.update).mock.calls[0][0].data).toMatchObject({ raceChoices: { "elven-lineage": [{ id: "wood-elf" }] }, subrace: "Wood Elf" });
    expect(vi.mocked(prisma.characterLog.createMany).mock.calls[0][0]).toMatchObject({ data: [{ kind: "choices_edit", actorUserId: "dm", characterId: "ch" }] });
  });

  it("owner needs allowPlayerEdit; a pending draft goes through the draft route", async () => {
    gate({ isDM: false, allowPlayerEdit: false });

    expect((await put({ raceChoices: {} })).status).toBe(403);

    gate({ isDM: false, character: { ...row, status: "pending" } });

    expect((await put({ raceChoices: {} })).status).toBe(403);

    gate({ isDM: false });

    expect((await put({ raceChoices: { "elven-lineage": [{ id: "drow" }] } })).status).toBe(200);
  });

  it("409 while the hero is in an active battle", async () => {
    gate();
    vi.mocked(prisma.battleParticipant.findFirst).mockResolvedValueOnce({ id: "p" } as never);

    expect((await put({ raceChoices: {} })).status).toBe(409);
    expect(prisma.character.update).not.toHaveBeenCalled();
  });

  it("class picks merge into the stored entries; ASI writes the score", async () => {
    gate();

    await put({ classChoices: { [sorcerer.id]: { "ability-score-improvement-4": [{ id: "f-asi", picks: { asi: [{ id: "charisma" }, { id: "wisdom" }] } }] } } });

    expect(vi.mocked(prisma.character.update).mock.calls[0][0].data).toMatchObject({ charisma: 18, wisdom: 13, classes: [{ classId: sorcerer.id, level: 4, choices: { "ability-score-improvement-4": [{ id: "f-asi" }] } }] });
  });

  it("422 with issues; non-DM cannot touch DM feats; empty body is 400", async () => {
    gate();

    const bad = await put({ classChoices: { [sorcerer.id]: { metamagic: [{ id: "ghost" }] } } });

    expect(bad.status).toBe(422);
    expect((await bad.json()).issues[0]).toMatchObject({ code: "CHOICE_UNKNOWN" });

    gate({ isDM: false });

    expect((await put({ feats: [{ id: "f-archery", source: "dm" }] })).status).toBe(403);
    expect((await put({})).status).toBe(400);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm test:run lib/server/characters/choices "app/api/campaigns/[id]/characters/[characterId]/choices"`
Expected: FAIL — модулів немає.

- [ ] **Step 3: Refs loader** — `lib/server/characters/choices/load-refs.ts`:

```ts
import "server-only";
import { getCachedClasses, getCachedFeats } from "@/lib/cache/reference-data";
import { prisma } from "@/lib/db";
import { readChoiceList } from "@/lib/utils/abilities/read";
import { readSpellLists } from "@/lib/utils/characters/choices/read";
import type { ChoiceRefs } from "@/lib/utils/characters/choices/walk";
import { classesById } from "@/lib/utils/characters/classes";
import { toGameClassData } from "@/lib/utils/characters/classes/row";
import { toFeatData } from "@/lib/utils/feats/row";

export async function loadChoiceRefs(campaignId: string, raceName: string, opts: { classMode: boolean }): Promise<ChoiceRefs> {
  const [race, classes, feats, spells] = await Promise.all([
    raceName ? prisma.race.findFirst({ where: { campaignId, name: raceName }, select: { id: true, name: true, choices: true } }) : null,
    opts.classMode ? getCachedClasses(campaignId) : [],
    opts.classMode ? getCachedFeats(campaignId) : [],
    prisma.spell.findMany({ where: { campaignId }, select: { id: true, name: true, level: true, lists: true } }),
  ]);

  return {
    race: race ? { id: race.id, name: race.name, choices: readChoiceList(race.choices) } : null,
    classesById: classesById(classes.map(toGameClassData)),
    featsById: Object.fromEntries(feats.map(toFeatData).map((f) => [f.id, f])),
    spellsById: Object.fromEntries(spells.map((s) => [s.id, { id: s.id, name: s.name, level: s.level, lists: readSpellLists(s.lists) }])),
  };
}
```

- [ ] **Step 4: Resolver** — `lib/server/characters/choices/resolve-choices.ts`:

```ts
import type { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";

import "server-only";
import { ABILITY_KEYS, type AbilityKey } from "@/lib/constants/abilities";
import { loadChoiceRefs } from "@/lib/server/characters/choices/load-refs";
import { errorResponse } from "@/lib/utils/api/api-response";
import { planChoices } from "@/lib/utils/characters/choices/plan";
import type { ChoiceRefs } from "@/lib/utils/characters/choices/walk";
import type { Ruleset } from "@/lib/utils/rules/schema";
import type { ChoicesState } from "@/types/choices";
import type { CharacterClassEntry } from "@/types/classes";

export type ChoiceFields = { raceChoices: Prisma.InputJsonValue; feats: Prisma.InputJsonValue; classes: Prisma.InputJsonValue; subrace?: string | null } & Partial<Record<AbilityKey, number>>;

export const characterClassMode = (rules: Ruleset, classes: readonly CharacterClassEntry[]): boolean => rules.classes.enabled && classes.length > 0;

const json = (v: unknown) => v as Prisma.InputJsonValue;

export async function resolveCharacterChoices(input: {
  campaignId: string;
  rules: Ruleset;
  isDM: boolean;
  character: { race: string; level: number; skills: unknown } & Record<AbilityKey, number>;
  before: ChoicesState;
  after: ChoicesState;
  refs?: ChoiceRefs;
}): Promise<{ ok: true; fields: ChoiceFields; state: ChoicesState } | { ok: false; response: NextResponse }> {
  const classMode = characterClassMode(input.rules, input.after.classes);

  const refs = input.refs ?? (await loadChoiceRefs(input.campaignId, input.character.race, { classMode }));

  const scores = Object.fromEntries(ABILITY_KEYS.map((k) => [k, input.character[k]])) as Record<AbilityKey, number>;

  const plan = planChoices({ before: input.before, after: input.after, refs, classMode, isDM: input.isDM, level: input.character.level, scores, skills: input.character.skills });

  if (!plan.ok) return { ok: false, response: errorResponse(plan.message, plan.status, plan.issues) };

  return {
    ok: true,
    state: plan.state,
    fields: {
      raceChoices: json(plan.state.raceChoices),
      feats: json(plan.state.feats),
      classes: json(plan.state.classes),
      ...(plan.subrace !== undefined && { subrace: plan.subrace }),
      ...plan.scores,
    },
  };
}
```

- [ ] **Step 5: Route and handler** — `app/api/campaigns/[id]/characters/[characterId]/choices/choices-handler.ts`:

```ts
import { NextResponse } from "next/server";

import { ABILITY_KEYS } from "@/lib/constants/abilities";
import { API_ERRORS } from "@/lib/constants/api-errors";
import { CharacterLogKind } from "@/lib/constants/character-log";
import { CharacterStatus } from "@/lib/constants/characters";
import { prisma } from "@/lib/db";
import type { CharacterWithInventory } from "@/lib/server/characters/access";
import { rejectIfInActiveBattle } from "@/lib/server/characters/battle-lock";
import { loadChoiceRefs } from "@/lib/server/characters/choices/load-refs";
import { characterClassMode, resolveCharacterChoices } from "@/lib/server/characters/choices/resolve-choices";
import { lockCharacters } from "@/lib/server/characters/lock";
import { writeCharacterLog } from "@/lib/server/characters/log";
import { PUBLIC_USER_SELECT } from "@/lib/server/users/db-user";
import type { CampaignAccessResult } from "@/lib/utils/api/api-auth";
import { errorResponse } from "@/lib/utils/api/api-response";
import { choicesStateOf, withClassPicks } from "@/lib/utils/characters/choices/picks";
import type { ChoicesBody } from "@/types/choices";

export async function saveCharacterChoices(access: CampaignAccessResult, character: CharacterWithInventory, body: ChoicesBody): Promise<NextResponse> {
  if (!access.isDM && !access.campaign.allowPlayerEdit) return errorResponse(API_ERRORS.FORBIDDEN, 403);

  if (!access.isDM && character.status === CharacterStatus.PENDING) return errorResponse(API_ERRORS.DRAFT_EDIT_VIA_DRAFT, 403);

  const inBattle = await rejectIfInActiveBattle(character.campaignId, [character.id]);

  if (inBattle) return inBattle;

  const { rules } = access.campaign;

  const refs = await loadChoiceRefs(character.campaignId, character.race, { classMode: characterClassMode(rules, choicesStateOf(character).classes) });

  return prisma.$transaction(async (tx) => {
    await lockCharacters(tx, [character.id]);

    const row = await tx.character.findUnique({ where: { id: character.id } });

    if (!row) return errorResponse(API_ERRORS.CHARACTER_NOT_FOUND, 404);

    const before = choicesStateOf(row);

    const after = {
      raceChoices: body.raceChoices ?? before.raceChoices,
      feats: body.feats ?? before.feats,
      classes: body.classChoices ? withClassPicks(before.classes, body.classChoices) : before.classes,
    };

    const resolved = await resolveCharacterChoices({ campaignId: row.campaignId, rules, isDM: access.isDM, character: row, before, after, refs });

    if (!resolved.ok) return resolved.response;

    const updated = await tx.character.update({ where: { id: row.id }, data: resolved.fields, include: { user: { select: PUBLIC_USER_SELECT }, inventory: true }, omit: { notes: true } });

    const scores = Object.fromEntries(ABILITY_KEYS.flatMap((k) => (typeof resolved.fields[k] === "number" ? [[k, resolved.fields[k]]] : [])));

    await writeCharacterLog(tx, [{ campaignId: row.campaignId, characterId: row.id, actorUserId: access.userId, kind: CharacterLogKind.CHOICES_EDIT, data: { before, after: resolved.state, scores } }]);

    return NextResponse.json(updated);
  });
}
```

`app/api/campaigns/[id]/characters/[characterId]/choices/route.ts`:

```ts
import { NextResponse } from "next/server";

import { saveCharacterChoices } from "./choices-handler";

import { ChoicesBodySchema } from "@/lib/schemas/choices";
import { requireCharacterAccess } from "@/lib/server/characters/access";
import { handleApiError } from "@/lib/utils/api/error-handler";
import { parseBody } from "@/lib/utils/api/parse-body";
import type { CharacterRouteContext } from "@/types/api";

export async function PUT(request: Request, { params }: CharacterRouteContext) {
  try {
    const { id, characterId } = await params;

    const gate = await requireCharacterAccess(id, characterId);

    if (gate instanceof NextResponse) return gate;

    const body = await parseBody(ChoicesBodySchema, request);

    if (body instanceof NextResponse) return body;

    return await saveCharacterChoices(gate.access, gate.character, body);
  } catch (error) {
    return handleApiError(error, { action: "save character choices" });
  }
}
```

(Роут `sessionOnly` за природою — до `CONTENT_OPERATIONS`/OpenAPI не додається, як і `…/resources`.)

- [ ] **Step 6: Client** — `lib/api/characters.ts` (імпорт `campaignPut` з `@/lib/api/client`, `ChoicesBody` з `@/types/choices`):

```ts
export const putCharacterChoices = (campaignId: string, characterId: string, body: ChoicesBody) => campaignPut<Character>(campaignId, `/characters/${characterId}/choices`, body);
```

`lib/hooks/characters/useCharacterChoices.ts`:

```ts
"use client";

import { useState } from "react";

import { levelUpInvalidateKeys } from "./useCharacters";

import { putCharacterChoices } from "@/lib/api/characters";
import { ApiError } from "@/lib/api/client";
import { useCrudMutation } from "@/lib/hooks/common";
import type { Character } from "@/types/characters";
import type { ChoiceIssue, ChoicesBody } from "@/types/choices";

const issuesOf = (e: unknown): ChoiceIssue[] => {
  const issues = e instanceof ApiError ? (e.body as { issues?: unknown } | undefined)?.issues : undefined;

  return Array.isArray(issues) ? (issues as ChoiceIssue[]) : [];
};

export function useCharacterChoices({ campaignId, characterId, onSaved }: { campaignId: string; characterId: string; onSaved?: (updated: Character) => void }) {
  const [error, setError] = useState<string | null>(null);

  const [issues, setIssues] = useState<ChoiceIssue[]>([]);

  const mutation = useCrudMutation({ mutationFn: (body: ChoicesBody) => putCharacterChoices(campaignId, characterId, body), invalidateKeys: levelUpInvalidateKeys(campaignId) });

  const clear = () => {
    setError(null);
    setIssues([]);
  };

  const save = async (body: ChoicesBody) => {
    clear();

    try {
      onSaved?.(await mutation.mutateAsync(body));

      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не вдалося зберегти вибори");
      setIssues(issuesOf(e));

      return false;
    }
  };

  return { save, isPending: mutation.isPending, error, issues, clear };
}
```

`lib/hooks/characters/index.ts` — `export { useCharacterChoices } from "./useCharacterChoices";`.

- [ ] **Step 7: Run tests**

Run: `pnpm test:run lib/server/characters "app/api/campaigns/[id]/characters" lib/hooks/characters && pnpm exec tsc --noEmit -p tsconfig.json`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add lib/server/characters/choices "app/api/campaigns/[id]/characters/[characterId]/choices" lib/api/characters.ts lib/hooks/characters/useCharacterChoices.ts lib/hooks/characters/index.ts
git commit -m "feat(constructor): 4f-4 character choices route with ASI delta, battle lock and log

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---
### Task 7: Створення, чернетка гравця, level-up з виборами; класовий PATCH зберігає вибори

**Files:**
- Create: `app/api/campaigns/[id]/characters/draft/draft-choices.ts`
- Modify: `lib/schemas/classes.ts` (`CharacterClassEntrySchema`), `app/api/campaigns/[id]/characters/create-character-schema.ts`, `app/api/campaigns/[id]/characters/create-character.ts`, `app/api/campaigns/[id]/characters/draft/draft-schema.ts`, `app/api/campaigns/[id]/characters/draft/create-draft.ts`, `app/api/campaigns/[id]/characters/[characterId]/draft/update-draft.ts`, `app/api/campaigns/[id]/characters/[characterId]/patch-character.ts`, `lib/server/characters/class-level-up.ts`, `app/api/campaigns/[id]/characters/[characterId]/level-up/route.ts`, `lib/utils/characters/character-form.ts`
- Test: `app/api/campaigns/[id]/characters/__tests__/create-choices.test.ts`, `app/api/campaigns/[id]/characters/draft/__tests__/draft-choices.test.ts`, `app/api/campaigns/[id]/characters/[characterId]/level-up/__tests__/level-up-choices.test.ts`, `app/api/__tests__/character-patch-choices.test.ts`, `lib/utils/characters/__tests__/character-form-choices.test.ts`

**Interfaces:**
- Consumes: `resolveCharacterChoices`, `characterClassMode` (задача 6); `choicesStateOf`, `keepStoredPicks`, `withClassPicks`, `hasPicks` (задачі 2–3); `PicksSchema`, `CharacterFeatsSchema`, `DraftChoicesSchema` (задача 2).
- Produces:
  - `CharacterClassEntrySchema` + `choices: PicksSchema.optional()` (тепер `CharacterClassesSchema.safeParse(character.classes)` у бою й листі зберігає `choices`).
  - `createCharacterSchema` + `raceChoices?: Picks`, `feats?: CharacterFeat[]`; draft-схеми + `choices?: { raceChoices?, feats?, classChoices? }`.
  - `draftChoiceFields(input: { campaignId: string; rules: Ruleset; data: DraftData; classes: CharacterClassEntry[] }): Promise<{ ok: true; fields: ChoiceFields } | { ok: false; response: NextResponse } | null>` (`null` — у тілі немає `choices`).
  - Level-up: тіло `{ classId?, subclassId?, choices?: Picks }`; з `choices` — блокування в бою, `resolveCharacterChoices`, журнал `choices_edit`; без — як раніше.
  - `characterToFormData` → `choices: { raceChoices, feats }` лише коли в персонажа є вибори; `formDataToCharacter` → `raceChoices`/`feats` лише з `formData.choices`.

- [ ] **Step 1: Write the failing tests**

`app/api/campaigns/[id]/characters/__tests__/create-choices.test.ts`:

```ts
import { NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { prisma } from "@/lib/db";
import { refs, sorcerer } from "@/lib/utils/characters/choices/__tests__/fixtures";
import { DEFAULT_RULES } from "@/lib/utils/rules/defaults";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/utils/api/api-auth", () => ({ requireDM: vi.fn(async () => ({ userId: "dm", isDM: true, campaign: { id: "camp", maxLevel: 20, rules: { ...DEFAULT_RULES, classes: { enabled: true } } } })) }));
vi.mock("@/lib/server/characters/choices/load-refs", () => ({ loadChoiceRefs: vi.fn(async () => refs) }));
vi.mock("@/lib/server/characters/apply-classes", () => ({
  applyClasses: vi.fn(async ({ entries }: { entries: unknown[] }) => ({ ok: true, data: entries.length ? { classes: entries, level: 1, class: "Sorcerer", subclass: null, spellSlots: {} } : null })),
}));
vi.mock("@/app/api/campaigns/[id]/characters/resolve-character-owner", () => ({ resolveCharacterOwner: vi.fn(async () => ({ controlledBy: "p1" })) }));
vi.mock("@/app/api/campaigns/[id]/characters/derive-character-defaults", () => ({ deriveCharacterDefaults: vi.fn(async () => ({ spellSlots: {} })) }));
vi.mock("@/lib/supabase/avatar-storage", () => ({ resolveAvatarForPersistence: vi.fn(async (a: string | undefined) => ({ ok: true, avatar: a })) }));
vi.mock("@/lib/db", () => ({ prisma: { character: { create: vi.fn(async ({ data }: { data: object }) => ({ id: "new", ...data })) }, characterInventory: { create: vi.fn() } } }));

const body = { name: "Lia", type: "player", controlledBy: "p1", race: "Elf", classes: [{ classId: sorcerer.id, level: 1 }] };

const post = async (extra: object) => {
  const { createCharacter } = await import("../create-character");

  return createCharacter(new Request("http://x", { method: "POST", body: JSON.stringify({ ...body, ...extra }) }), "camp") as Promise<NextResponse>;
};

describe("create character with choices", () => {
  beforeEach(() => vi.clearAllMocks());

  it("writes race picks, subrace, origin feat and class picks", async () => {
    const res = await post({ raceChoices: { "elven-lineage": [{ id: "wood-elf" }] }, feats: [{ id: "f-alert", source: "origin" }], classes: [{ classId: sorcerer.id, level: 1, choices: { cantrips: [{ id: "sp-firebolt" }] } }] });

    expect(res.status).toBe(200);
    expect(vi.mocked(prisma.character.create).mock.calls[0][0].data).toMatchObject({
      raceChoices: { "elven-lineage": [{ id: "wood-elf" }] },
      subrace: "Wood Elf",
      feats: [{ id: "f-alert", source: "origin" }],
      classes: [{ classId: sorcerer.id, level: 1, choices: { cantrips: [{ id: "sp-firebolt" }] } }],
    });
  });

  it("422 on an invalid pick; no choices → no new keys", async () => {
    expect((await post({ classes: [{ classId: sorcerer.id, level: 1, choices: { cantrips: [{ id: "sp-cure" }] } }] })).status).toBe(422);

    await post({});

    expect(vi.mocked(prisma.character.create).mock.calls.at(-1)?.[0].data).not.toHaveProperty("raceChoices");
  });
});
```

`app/api/campaigns/[id]/characters/draft/__tests__/draft-choices.test.ts`:

```ts
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { refs, sorcerer } from "@/lib/utils/characters/choices/__tests__/fixtures";

vi.mock("@/lib/server/characters/choices/load-refs", () => ({ loadChoiceRefs: vi.fn(async () => refs) }));

import { draftChoiceFields } from "../draft-choices";
import { DEFAULT_RULES } from "@/lib/utils/rules/defaults";

const data = { name: "Lia", race: "Elf", method: "standard", strength: 15, dexterity: 14, constitution: 13, intelligence: 12, wisdom: 10, charisma: 8 } as const;

const rules = { ...DEFAULT_RULES, classes: { enabled: true } };

describe("draftChoiceFields", () => {
  it("null without choices; class picks go to the starting class; dm feats are dropped", async () => {
    expect(await draftChoiceFields({ campaignId: "c1", rules, data, classes: [] })).toBeNull();

    const result = await draftChoiceFields({
      campaignId: "c1",
      rules,
      data: { ...data, choices: { raceChoices: { "elven-lineage": [{ id: "drow" }] }, feats: [{ id: "f-alert", source: "origin" }, { id: "f-archery", source: "dm" }], classChoices: { cantrips: [{ id: "sp-firebolt" }] } } },
      classes: [{ classId: sorcerer.id, level: 1 }],
    });

    expect(result).toMatchObject({ ok: true, fields: { subrace: "Drow", feats: [{ id: "f-alert", source: "origin" }], classes: [{ classId: sorcerer.id, level: 1, choices: { cantrips: [{ id: "sp-firebolt" }] } }] } });
  });

  it("422 response on a bad pick", async () => {
    const result = await draftChoiceFields({ campaignId: "c1", rules, data: { ...data, choices: { raceChoices: { "keen-senses": [{ id: "arcana" }] } } }, classes: [] });

    expect(result && !result.ok && result.response.status).toBe(422);
  });
});
```

`app/api/campaigns/[id]/characters/[characterId]/level-up/__tests__/level-up-choices.test.ts`:

```ts
import { NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { prisma } from "@/lib/db";
import { classLevelUp } from "@/lib/server/characters/class-level-up";
import { refs, scores, sorcerer } from "@/lib/utils/characters/choices/__tests__/fixtures";
import { DEFAULT_RULES } from "@/lib/utils/rules/defaults";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/utils/api/api-auth", () => ({ requireDM: vi.fn(async () => ({ userId: "dm", isDM: true, campaign: { id: "camp", maxLevel: 20, rules: { ...DEFAULT_RULES, classes: { enabled: true } } } })) }));
vi.mock("@/lib/server/characters/class-level-up", async (importOriginal) => ({ ...(await importOriginal<object>()), classLevelUp: vi.fn() }));
vi.mock("@/lib/server/characters/choices/load-refs", () => ({ loadChoiceRefs: vi.fn(async () => refs) }));
vi.mock("@/app/api/campaigns/[id]/characters/[characterId]/load-race-progression", () => ({ loadRaceProgression: vi.fn(async () => null) }));
vi.mock("@/lib/db", () => ({
  prisma: {
    character: { findUnique: vi.fn(), update: vi.fn(async ({ data }: { data: object }) => ({ id: "ch", ...data })) },
    characterLog: { createMany: vi.fn() },
    battleParticipant: { findFirst: vi.fn(async () => null) },
  },
}));

const stored = { id: "ch", campaignId: "camp", level: 3, seenLevel: 3, race: "Elf", skills: {}, spellSlots: {}, spellcastingAbility: null, raceChoices: {}, feats: [], classes: [{ classId: sorcerer.id, level: 3, choices: { metamagic: [{ id: "quickened" }] } }], ...scores };

const post = async (body: object) => {
  const { POST } = await import("../route");

  return POST(new Request("http://x", { method: "POST", body: JSON.stringify(body) }), { params: Promise.resolve({ id: "camp", characterId: "ch" }) }) as Promise<NextResponse>;
};

describe("level-up with choices", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.character.findUnique).mockResolvedValue(stored as never);
    vi.mocked(classLevelUp).mockResolvedValue({ classes: [{ classId: sorcerer.id, level: 4, choices: { metamagic: [{ id: "quickened" }] } }], level: 4, class: "Sorcerer", subclass: null, spellSlots: {} });
  });

  it("merges the new picks into the raised class, writes ASI and a log entry", async () => {
    const res = await post({ classId: sorcerer.id, choices: { "ability-score-improvement-4": [{ id: "f-asi", picks: { asi: [{ id: "charisma" }, { id: "charisma" }] } }] } });

    expect(res.status).toBe(200);
    expect(vi.mocked(prisma.character.update).mock.calls[0][0].data).toMatchObject({
      level: 4,
      charisma: 19,
      classes: [{ classId: sorcerer.id, level: 4, choices: { metamagic: [{ id: "quickened" }], "ability-score-improvement-4": [{ id: "f-asi" }] } }],
    });
    expect(prisma.characterLog.createMany).toHaveBeenCalled();
  });

  it("without choices nothing new happens; with choices the battle lock applies", async () => {
    await post({ classId: sorcerer.id });

    expect(vi.mocked(prisma.character.update).mock.calls[0][0].data).not.toHaveProperty("charisma");
    expect(prisma.characterLog.createMany).not.toHaveBeenCalled();
    expect(prisma.battleParticipant.findFirst).not.toHaveBeenCalled();

    vi.mocked(prisma.battleParticipant.findFirst).mockResolvedValueOnce({ id: "p" } as never);

    expect((await post({ classId: sorcerer.id, choices: { metamagic: [{ id: "quickened" }, { id: "twinned" }] } })).status).toBe(409);
  });

  it("422 when a pick is invalid", async () => {
    expect((await post({ classId: sorcerer.id, choices: { metamagic: [{ id: "ghost" }] } })).status).toBe(422);
  });
});
```

`app/api/__tests__/character-patch-choices.test.ts`:

```ts
import { NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { prisma } from "@/lib/db";
import * as apiAuth from "@/lib/utils/api/api-auth";
import { DEFAULT_RULES } from "@/lib/utils/rules/defaults";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/utils/api/api-auth", () => ({ requireCampaignAccess: vi.fn() }));
vi.mock("@/lib/server/characters/apply-classes", () => ({ applyClasses: vi.fn(async ({ entries }: { entries: unknown[] }) => ({ ok: true, data: { classes: entries, level: 4, class: "Sorcerer", subclass: null, spellSlots: {} } })) }));
vi.mock("@/lib/supabase/avatar-storage", () => ({ resolveAvatarForPersistence: vi.fn(async (a: string | undefined) => ({ ok: true, avatar: a })) }));
vi.mock("@/lib/db", () => ({ prisma: { character: { findUnique: vi.fn(), update: vi.fn(async ({ data }: { data: object }) => ({ id: "ch", ...data })) }, race: { findFirst: vi.fn(async () => null) } } }));

const stored = { id: "ch", campaignId: "camp", controlledBy: "p", status: "active", level: 4, seenLevel: 4, race: "Elf", avatar: null, spellcastingAbility: null, spellSlots: {}, immunities: [], classes: [{ classId: "s", level: 4, choices: { metamagic: [{ id: "quickened" }] } }] };

describe("PATCH character keeps stored class picks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(apiAuth.requireCampaignAccess).mockResolvedValue({ userId: "dm", isDM: true, campaign: { id: "camp", maxLevel: 20, allowPlayerEdit: true, rules: { ...DEFAULT_RULES, classes: { enabled: true } } } } as never);
    vi.mocked(prisma.character.findUnique).mockResolvedValue(stored as never);
  });

  it("stale incoming picks are ignored", async () => {
    const { patchCharacter } = await import("@/app/api/campaigns/[id]/characters/[characterId]/patch-character");

    const res = (await patchCharacter(new Request("http://x", { method: "PATCH", body: JSON.stringify({ classes: [{ classId: "s", level: 4, choices: { metamagic: [{ id: "twinned" }] } }] }) }), "camp", "ch")) as NextResponse;

    expect(res.status).toBe(200);
    expect(vi.mocked(prisma.character.update).mock.calls[0][0].data.classes).toEqual([{ classId: "s", level: 4, choices: { metamagic: [{ id: "quickened" }] } }]);
  });
});
```

`lib/utils/characters/__tests__/character-form-choices.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { characterToFormData, formDataToCharacter } from "@/lib/utils/characters/character-form";
import type { Character } from "@/types/characters";

const hero = { name: "Lia", type: "player", controlledBy: "p", level: 1, class: "", race: "Elf", strength: 10, dexterity: 10, constitution: 10, intelligence: 10, wisdom: 10, charisma: 10 } as unknown as Character;

describe("character form and choices", () => {
  it("choices appear only when the hero has any", () => {
    expect(characterToFormData(hero)).not.toHaveProperty("choices");

    const form = characterToFormData({ ...hero, raceChoices: { l: [{ id: "drow" }] }, feats: [] });

    expect(form.choices).toEqual({ raceChoices: { l: [{ id: "drow" }] }, feats: [] });
    expect(formDataToCharacter(form)).toMatchObject({ raceChoices: { l: [{ id: "drow" }] }, feats: [] });
    expect(formDataToCharacter(characterToFormData(hero))).not.toHaveProperty("raceChoices");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm test:run "app/api/campaigns/[id]/characters/__tests__/create-choices.test.ts" "app/api/campaigns/[id]/characters/draft/__tests__/draft-choices.test.ts" "app/api/campaigns/[id]/characters/[characterId]/level-up/__tests__/level-up-choices.test.ts" app/api/__tests__/character-patch-choices.test.ts lib/utils/characters/__tests__/character-form-choices.test.ts`
Expected: FAIL.

- [ ] **Step 3: Schemas** —
  - `lib/schemas/classes.ts`: `import { PicksSchema } from "@/lib/schemas/choices";` (вже імпортується `ClassChoicesSchema` — дописати в той самий рядок); `CharacterClassEntrySchema = z.object({ classId: …, subclassId: …, level: …, choices: PicksSchema.optional() })`.
  - `create-character-schema.ts`: `import { CharacterFeatsSchema, PicksSchema } from "@/lib/schemas/choices";` і після `classes` — `raceChoices: PicksSchema.optional(),` і `feats: CharacterFeatsSchema.optional(),`.
  - `draft/draft-schema.ts`: `import { DraftChoicesSchema } from "@/lib/schemas/choices";`; у `draftSchema` після `goals` — `choices: DraftChoicesSchema.optional(),` (`classDraftSchema` успадковує).

- [ ] **Step 4: Create** — `create-character.ts`: імпорти `resolveCharacterChoices` (`@/lib/server/characters/choices/resolve-choices`), `hasPicks` (`@/lib/utils/characters/choices/read`). Після перевірки `applied` і до `resolveCharacterOwner`:

```ts
  const entries = data.classes ?? [];

  const withChoices = hasPicks(data.raceChoices) || (data.feats?.length ?? 0) > 0 || entries.some((e) => hasPicks(e.choices));

  const choices = withChoices
    ? await resolveCharacterChoices({
        campaignId,
        rules: campaign.rules,
        isDM: true,
        character: { race: data.race, level: fromClasses?.level ?? data.level, skills: data.skills, strength: data.strength, dexterity: data.dexterity, constitution: data.constitution, intelligence: data.intelligence, wisdom: data.wisdom, charisma: data.charisma },
        before: { raceChoices: {}, feats: [], classes: [] },
        after: { raceChoices: data.raceChoices ?? {}, feats: data.feats ?? [], classes: entries },
      })
    : null;

  if (choices && !choices.ok) return choices.response;
```

  У `prisma.character.create({ data: { … } })` останнім рядком перед `skillTreeProgress: {}` — `...(choices?.ok && choices.fields),` (поля `classes`, `subrace` і характеристики з `fields` перекривають вищі значення, бо spread іде пізніше).

- [ ] **Step 5: Draft** — `app/api/campaigns/[id]/characters/draft/draft-choices.ts`:

```ts
import type { NextResponse } from "next/server";

import type { DraftData } from "./draft-schema";

import { type ChoiceFields, resolveCharacterChoices } from "@/lib/server/characters/choices/resolve-choices";
import type { Ruleset } from "@/lib/utils/rules/schema";
import type { CharacterClassEntry } from "@/types/classes";

export async function draftChoiceFields(input: { campaignId: string; rules: Ruleset; data: DraftData; classes: CharacterClassEntry[] }): Promise<{ ok: true; fields: ChoiceFields } | { ok: false; response: NextResponse } | null> {
  const { data } = input;

  if (!data.choices) return null;

  const classChoices = data.choices.classChoices;

  const classes = input.classes.map((e, i) => (i === 0 && classChoices ? { ...e, choices: classChoices } : e));

  // a draft's scores come fresh from point buy, so the delta is counted from an empty state
  return resolveCharacterChoices({
    campaignId: input.campaignId,
    rules: input.rules,
    isDM: false,
    character: { race: data.race, level: 1, skills: {}, strength: data.strength, dexterity: data.dexterity, constitution: data.constitution, intelligence: data.intelligence, wisdom: data.wisdom, charisma: data.charisma },
    before: { raceChoices: {}, feats: [], classes: [] },
    after: { raceChoices: data.choices.raceChoices ?? {}, feats: (data.choices.feats ?? []).filter((f) => f.source === "origin"), classes },
  });
}
```

  `create-draft.ts`: після перевірки `asClass` —

```ts
  const choices = await draftChoiceFields({ campaignId, rules: campaign.rules, data, classes: asClass?.ok ? (asClass.fields.classes as unknown as CharacterClassEntry[]) : [] });

  if (choices && !choices.ok) return choices.response;
```

  і в `tx.character.create({ data: { … } })` після `...asClass?.fields,` — `...(choices?.ok && choices.fields),`. `update-draft.ts` — те саме (після перевірки `asClass`) і в `data` після `...asClass?.fields,` — `...(choices?.ok && choices.fields),`. (`campaign` у `access` має `rules`; імпорт `CharacterClassEntry` з `@/types/classes`.)

- [ ] **Step 6: PATCH keeps picks** — `patch-character.ts`: `import { keepStoredPicks } from "@/lib/utils/characters/choices/picks";`; після визначення `data` — `const classesInput = data.classes ? keepStoredPicks(data.classes, character.classes) : undefined;`; у виклику `applyClasses` — `entries: classesInput ?? []` (умова виклику — `classesInput ?`), у `prisma.character.update` — `classes: classesInput as unknown as Prisma.InputJsonValue | undefined,` замість `data.classes`.

- [ ] **Step 7: Level-up** — `lib/server/characters/class-level-up.ts`: `import { PicksSchema } from "@/lib/schemas/choices";`; `LevelUpBodySchema = z.object({ classId: …, subclassId: …, choices: PicksSchema.optional() });`. `level-up/route.ts` — у гілці `if (classResult) { … }` перед `prisma.character.update`:

```ts
      const withChoices = hasPicks(pick.choices);

      if (withChoices) {
        const inBattle = await rejectIfInActiveBattle(id, [characterId]);

        if (inBattle) return inBattle;
      }

      const before = choicesStateOf(character);

      const raised = classResult.classes.find((e) => e.classId === pick.classId);

      const choices = withChoices
        ? await resolveCharacterChoices({
            campaignId: id,
            rules: campaign.rules,
            isDM: true,
            character: { ...character, level: classResult.level },
            before,
            after: { ...before, classes: withClassPicks(classResult.classes, { [pick.classId as string]: { ...(raised?.choices ?? {}), ...pick.choices } }) },
          })
        : null;

      if (choices && !choices.ok) return choices.response;
```

  у `data` оновлення після `...(seenLevel !== undefined && { seenLevel }),` — `...(choices?.ok && choices.fields),`; після `update` —

```ts
      if (choices?.ok) await writeCharacterLog(prisma, [{ campaignId: id, characterId, actorUserId: accessResult.userId, kind: CharacterLogKind.CHOICES_EDIT, data: { before, after: choices.state } }]);
```

  Імпорти: `rejectIfInActiveBattle`, `resolveCharacterChoices`, `writeCharacterLog`, `CharacterLogKind`, `choicesStateOf`, `withClassPicks`, `hasPicks`. HOMM-гілка (`classResult === null`) не змінюється.

- [ ] **Step 8: Form mapping** — `lib/utils/characters/character-form.ts`: у `characterToFormData` останнім полем повернення — `...((character.raceChoices && Object.keys(character.raceChoices).length > 0) || (character.feats?.length ?? 0) > 0 ? { choices: { raceChoices: character.raceChoices ?? {}, feats: character.feats ?? [] } } : {}),`; у `formDataToCharacter` — `...(formData.choices && { raceChoices: formData.choices.raceChoices, feats: formData.choices.feats }),`. (Модуль у чанках бою й профілю — лише `import type`.)

- [ ] **Step 9: Run tests**

Run: `pnpm test:run "app/api/campaigns/[id]/characters" app/api/__tests__ lib/utils/characters lib/server/characters && pnpm exec tsc --noEmit -p tsconfig.json`
Expected: PASS — наявні `class-level-up.test.ts`, `character-patch-*.test.ts`, `character-draft-api.test.ts`, `draft-class.test.ts` без змін.

- [ ] **Step 10: Commit**

```bash
git add lib/schemas/classes.ts "app/api/campaigns/[id]/characters" app/api/__tests__/character-patch-choices.test.ts lib/server/characters/class-level-up.ts lib/utils/characters/character-form.ts lib/utils/characters/__tests__/character-form-choices.test.ts
git commit -m "feat(constructor): 4f-4 choices on create, player draft and level-up; PATCH keeps stored picks

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---
### Task 8: Рушій — вміння з виборів (джерело `feat`), `skillProficiency`/`skillExpertise`, додані заклинання, завантаження рис

**Files:**
- Create: `lib/utils/characters/choices/selections.ts`, `lib/utils/battle/participant/load-feats.ts`
- Modify: `lib/utils/abilities/build/collect.ts`, `lib/utils/abilities/schema/effects.ts`, `lib/utils/abilities/registry/effects/flags.ts`, `lib/utils/battle/checks/roll-check.ts`, `lib/utils/battle/participant/from-character.ts`
- Test: `lib/utils/characters/choices/__tests__/selections.test.ts`, `lib/utils/abilities/build/__tests__/collect-choices.test.ts`, `lib/utils/battle/checks/__tests__/roll-check-expertise.test.ts`, `lib/utils/battle/participant/__tests__/from-character-choices.test.ts`

**Interfaces:**
- Consumes: `classChoiceDefs`, `isChoiceOpen`, `choicesStateOf`, `hasPicks` (задачі 2–3); `readChoiceList` (задача 2); `toFeatData`, `getCachedFeats` (задача 4); `AbilitySource.type: "feat"` (задача 1).
- Produces:
  - `selections.ts` (без zod): `interface ChoiceGroup { source: AbilitySource; abilities: Ability[]; scale?: ScaleContext }`, `interface ChoiceSelections { groups; skills: DndSkill[]; expertise: DndSkill[]; spells: Array<{ spellId: string; label: string }>; feats: Array<{ key: string; feat: FeatData; picks: Picks; from: string }>; options: Array<{ owner: string; label: string; names: string[] }>; lineage: string | null }`, `interface SelectionInput { race: ChoiceRace | null; raceChoices: Picks; classes: readonly ResolvedClassEntry[]; feats: readonly CharacterFeat[]; featsById: Readonly<Record<string, FeatData>>; level: number }`, `choiceSelections(input): ChoiceSelections`, `selectionNeedsFeats(state: ChoicesState, classMode: boolean): boolean`.
  - `collectCharacterAbilities({ …, choiceGroups?: readonly ChoiceGroup[] })` — вміння груп після класових (масштаб — `applyClassScale`, якщо `scale`).
  - Прапорець `skillExpertise { skills: DndSkill[] }` (схема + `FLAG_REGISTRY`); `checkBonus` подвоює майстерність навички з експертизою (лише коли майстерність є).
  - `loadFeatsById(campaignId: string, needed: boolean): Promise<Record<string, FeatData>>` (без запиту, коли `needed === false`).
  - `createBattleParticipantFromCharacter` додає групи виборів і заклинання виборів у `spellcasting.knownSpells`.

- [ ] **Step 1: Write the failing tests**

`lib/utils/characters/choices/__tests__/selections.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { elf, featsById, rogue, sorcerer } from "./fixtures";

import { choiceSelections, selectionNeedsFeats } from "@/lib/utils/characters/choices/selections";
import type { ResolvedClassEntry } from "@/types/classes";
import type { SelectionInput } from "@/lib/utils/characters/choices/selections";

const entry = (cls: typeof sorcerer, level: number, choices = {}): ResolvedClassEntry => ({ classId: cls.id, level, choices, class: cls, subclass: null });

const run = (over: Partial<SelectionInput>) => choiceSelections({ race: null, raceChoices: {}, classes: [], feats: [], featsById, level: 1, ...over });

describe("choiceSelections", () => {
  it("race lineage: option abilities under the race source, spells up to the total level, lineage name", () => {
    const s = run({ race: elf, raceChoices: { "elven-lineage": [{ id: "wood-elf" }], "keen-senses": [{ id: "perception" }] }, level: 3 });

    expect(s.lineage).toBe("Wood Elf");
    expect(s.groups[0]).toMatchObject({ source: { type: "race", id: "race-elf", name: "Elf: Wood Elf" }, abilities: [{ id: "race.elven-lineage.wood-elf.speed" }] });
    expect(s.spells).toEqual([{ spellId: "sp-druidcraft", label: "Лінія: Wood Elf" }, { spellId: "sp-longstrider", label: "Лінія: Wood Elf" }]);
    expect(s.skills).toEqual(["perception"]);
    expect(run({ race: elf, raceChoices: { "elven-lineage": [{ id: "wood-elf" }] }, level: 1 }).spells).toEqual([{ spellId: "sp-druidcraft", label: "Лінія: Wood Elf" }]);
  });

  it("class options carry the class scale; picks of closed choices do nothing", () => {
    const s = run({ classes: [entry(sorcerer, 2, { metamagic: [{ id: "quickened" }] })], level: 2 });

    expect(s.groups[0]).toMatchObject({ source: { type: "class", id: "cls-sorc", name: "Sorcerer: Metamagic — Quickened Spell" }, scale: { classId: "cls-sorc", level: 2 } });
    expect(s.options).toEqual([{ owner: "Sorcerer", label: "Metamagic", names: ["Quickened Spell"] }]);
    expect(run({ classes: [entry(sorcerer, 1, { metamagic: [{ id: "quickened" }] })] }).groups).toEqual([]);
  });

  it("feats: own abilities under the feat source, nested spell picks, origin and DM feats; unknown feats skipped", () => {
    const s = run({
      classes: [entry(sorcerer, 4, { "ability-score-improvement-4": [{ id: "f-grappler", picks: { "grappler-asi": [{ id: "strength" }] } }, { id: "f-ghost" }] })],
      feats: [{ id: "f-mi", source: "origin", picks: { cantrips: [{ id: "sp-guidance" }] } }, { id: "f-alert", source: "dm" }],
      level: 4,
    });

    expect(s.feats.map((f) => [f.feat.name, f.from])).toEqual([["Grappler", "Sorcerer 4"], ["Magic Initiate", "Походження"], ["Alert", "ДМ"]]);
    expect(s.groups.filter((g) => g.source.type === "feat").map((g) => g.source.name)).toEqual(["Grappler", "Alert"]);
    expect(s.spells).toEqual([{ spellId: "sp-guidance", label: "Риса: Magic Initiate" }]);
  });

  it("class spell picks and expertise become synthetic flags", () => {
    const s = run({ classes: [entry(sorcerer, 1, { cantrips: [{ id: "sp-firebolt" }] }), entry(rogue, 1, { "expertise-1": [{ id: "stealth" }] })] });

    expect(s.spells).toEqual([{ spellId: "sp-firebolt", label: "Клас: Sorcerer" }]);
    expect(s.expertise).toEqual(["stealth"]);
    expect(s.groups.at(-1)).toMatchObject({ source: { type: "character", id: "choices" }, abilities: [{ id: "choice-expertise", effects: [{ kind: "flag", flag: "skillExpertise", skills: ["stealth"] }] }] });
  });

  it("selectionNeedsFeats: only with picks or feats", () => {
    expect(selectionNeedsFeats({ raceChoices: {}, feats: [], classes: [{ classId: "c", level: 1 }] }, true)).toBe(false);
    expect(selectionNeedsFeats({ raceChoices: {}, feats: [{ id: "f", source: "dm" }], classes: [] }, true)).toBe(true);
    expect(selectionNeedsFeats({ raceChoices: {}, feats: [{ id: "f", source: "dm" }], classes: [] }, false)).toBe(false);
    expect(selectionNeedsFeats({ raceChoices: { v: [{ id: "f" }] }, feats: [], classes: [] }, false)).toBe(true);
  });
});
```

`lib/utils/abilities/build/__tests__/collect-choices.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { collectCharacterAbilities } from "@/lib/utils/abilities/build/collect";

const ability = { id: "rage-bonus", name: "Bonus", trigger: { event: "passive" as const }, effects: [{ kind: "modifyStat" as const, stat: "armor" as const, flat: { scale: "bonus" } }] };

describe("collectCharacterAbilities + choice groups", () => {
  it("resolves group abilities with their source and class scale; no groups → same as before", () => {
    const columns = [{ key: "bonus", label: "Bonus", values: Array.from({ length: 20 }, (_, i) => String(i < 4 ? 1 : 2)) }];

    const out = collectCharacterAbilities({ skills: [], race: null, artifacts: [], completedSets: [], choiceGroups: [{ source: { type: "feat", id: "f1", name: "Alert" }, abilities: [ability], scale: { classId: "c", level: 5, columns } }] });

    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({ source: { type: "feat", id: "f1" }, effects: [{ flat: 2 }] });
    expect(collectCharacterAbilities({ skills: [], race: null, artifacts: [], completedSets: [] })).toEqual([]);
  });
});
```

`lib/utils/battle/checks/__tests__/roll-check-expertise.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { checkBonus } from "@/lib/utils/battle/checks/roll-check";
import type { BattleParticipant } from "@/types/battle";

const actor = (flags: object[], skillProficiencies: string[] = []) =>
  ({
    basicInfo: { id: "a", side: "ally" },
    abilities: { proficiencyBonus: 3, modifiers: { strength: 0, dexterity: 2, constitution: 0, intelligence: 0, wisdom: 1, charisma: 0 }, skillProficiencies },
    combatStats: { status: "active", currentHp: 10, maxHp: 10 },
    battleData: { activeEffects: [], resolvedAbilities: flags.map((e, i) => ({ id: `x${i}`, key: `character:choices:x${i}`, name: "x", source: { type: "character", id: "choices", name: "Вибори" }, trigger: { event: "passive" }, effects: [e] })) },
  }) as unknown as BattleParticipant;

describe("checkBonus: expertise", () => {
  it("doubles proficiency only for a proficient skill", () => {
    const expert = { kind: "flag", flag: "skillExpertise", skills: ["stealth"] };

    expect(checkBonus(actor([expert], ["stealth"]), { skill: "stealth" }, []).bonus).toBe(6);
    expect(checkBonus(actor([], ["stealth"]), { skill: "stealth" }, []).bonus).toBe(3);
    expect(checkBonus(actor([expert]), { skill: "stealth" }, []).bonus).toBe(0);
    expect(checkBonus(actor([expert, { kind: "flag", flag: "skillProficiency", skills: ["stealth"] }]), { skill: "stealth" }, []).bonus).toBe(6);
  });
});
```

(Якщо `collectModifiers` вимагає інших полів учасника — доповнити фікстуру `actor` за зразком `lib/utils/battle/checks/__tests__/roll-check.test.ts`, не змінюючи сам тест-зразок.)

`lib/utils/battle/participant/__tests__/from-character-choices.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";

const getCachedFeats = vi.hoisted(() => vi.fn(async () => [] as unknown[]));

vi.mock("@/lib/cache/reference-data", async (importOriginal) => ({ ...(await importOriginal<object>()), getCachedFeats }));

import { ParticipantSide } from "@/lib/constants/battle";
import { createBattleParticipantFromCharacter } from "@/lib/utils/battle/participant/from-character";
import { elf, sorcerer } from "@/lib/utils/characters/choices/__tests__/fixtures";
import { DEFAULT_RULES } from "@/lib/utils/rules";
import { parseRules } from "@/lib/utils/rules/schema";

const base = {
  id: "ch1", campaignId: "c1", name: "Лія", race: "Elf", class: "", level: 4,
  strength: 10, dexterity: 14, constitution: 12, intelligence: 10, wisdom: 10, charisma: 16,
  armorClass: 12, speed: 30, initiative: 0, morale: 0, controlledBy: "u1", immunities: [], knownSpells: ["sp-known"],
  equipment: {}, skillTreeProgress: {}, personalSkillId: null, archetype: null, classes: [], raceChoices: {}, feats: [], skills: {},
};

const elfRow = { id: elf.id, campaignId: "c1", name: "Elf", icon: null, color: null, availableSkills: [], disabledSkills: [], spellSlotProgression: [], passiveAbility: null, abilities: [], choices: elf.choices };

const build = (character: object, rules = DEFAULT_RULES, race: object | null = elfRow) =>
  createBattleParticipantFromCharacter({ ...base, ...character } as never, "b1", ParticipantSide.ALLY, undefined, {
    skillTreeByRace: {}, mainSkills: [], spells: [], allSkills: [], racesByName: { Elf: race }, campaign: { maxLevel: 20 }, skillsById: {}, artifactsById: {}, artifactSetsById: {}, artifactSetMemberIds: {},
    rules, classesById: { [sorcerer.id]: sorcerer },
  } as never);

const featRow = { id: "f-alert", campaignId: "c1", name: "Alert", icon: null, type: "origin", prerequisite: {}, repeatable: false, description: null, abilities: [{ id: "alert", name: "Alert", trigger: { event: "passive" }, effects: [{ kind: "modifyStat", stat: "initiative", flat: { formula: "prof" } }] }], choices: [] };

describe("participant from choices", () => {
  beforeEach(() => getCachedFeats.mockClear());

  it("HOMM hero (race without choices, no classes): no feat query, nothing added", async () => {
    const p = await build({}, DEFAULT_RULES, { ...elfRow, choices: [] });

    expect(getCachedFeats).not.toHaveBeenCalled();
    expect(p.spellcasting.knownSpells).toEqual(["sp-known"]);
    expect(p.battleData.resolvedAbilities.some((a) => a.key.includes("choice"))).toBe(false);
  });

  it("Wood Elf lineage: +5 speed, Druidcraft + Longstrider known at level 4, no class mode needed", async () => {
    const p = await build({ raceChoices: { "elven-lineage": [{ id: "wood-elf" }] } });

    expect(p.combatStats.speed).toBe(35);
    expect(p.spellcasting.knownSpells).toEqual(["sp-known", "sp-druidcraft", "sp-longstrider"]);
  });

  it("class mode: origin feat Alert adds proficiency to initiative; feats load once", async () => {
    getCachedFeats.mockResolvedValueOnce([featRow]);

    const rules = parseRules({ classes: { enabled: true } });

    const p = await build({ classes: [{ classId: sorcerer.id, level: 4 }], feats: [{ id: "f-alert", source: "origin" }] }, rules);

    expect(getCachedFeats).toHaveBeenCalledTimes(1);
    expect(p.abilities.initiative).toBe(p.abilities.baseInitiative);
    expect(p.battleData.resolvedAbilities.find((a) => a.source.type === "feat")?.source.name).toBe("Alert");
    expect(p.abilities.initiative - base.initiative).toBe(p.abilities.proficiencyBonus);
  });

  it("feats are ignored outside class mode", async () => {
    const p = await build({ feats: [{ id: "f-alert", source: "origin" }] });

    expect(p.battleData.resolvedAbilities.some((a) => a.source.type === "feat")).toBe(false);
  });
});
```

(У третьому тесті перевірка `initiative === baseInitiative` — бо `bakePassives` додає бонус до обох; ключове твердження — останній рядок.)

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm test:run lib/utils/characters/choices/__tests__/selections.test.ts lib/utils/abilities/build/__tests__/collect-choices.test.ts lib/utils/battle/checks/__tests__/roll-check-expertise.test.ts lib/utils/battle/participant/__tests__/from-character-choices.test.ts`
Expected: FAIL.

- [ ] **Step 3: `selections.ts`**

```ts
import { DND_SKILLS, type DndSkill } from "@/lib/constants/skills";
import type { ScaleContext } from "@/lib/utils/abilities/class-columns";
import { classChoiceDefs } from "@/lib/utils/characters/choices/class-choices";
import { isChoiceOpen } from "@/lib/utils/characters/choices/count";
import { hasPicks } from "@/lib/utils/characters/choices/read";
import type { Ability, AbilitySource } from "@/types/abilities";
import type { CharacterFeat, Choice, ChoiceOption, ChoiceOwner, ChoicePick, ChoiceRace, ChoicesState, FeatData, Picks } from "@/types/choices";
import type { ResolvedClassEntry } from "@/types/classes";

export interface ChoiceGroup {
  source: AbilitySource;
  abilities: Ability[];
  scale?: ScaleContext;
}

export interface ChoiceSelections {
  groups: ChoiceGroup[];
  skills: DndSkill[];
  expertise: DndSkill[];
  spells: Array<{ spellId: string; label: string }>;
  feats: Array<{ key: string; feat: FeatData; picks: Picks; from: string }>;
  options: Array<{ owner: string; label: string; names: string[] }>;
  lineage: string | null;
}

export interface SelectionInput {
  race: ChoiceRace | null;
  raceChoices: Picks;
  classes: readonly ResolvedClassEntry[];
  feats: readonly CharacterFeat[];
  featsById: Readonly<Record<string, FeatData>>;
  level: number;
}

interface OwnerCtx {
  owner: ChoiceOwner;
  level: number;
  name: string;
  from: (choice: Choice) => string;
  sourceFor: (choice: Choice, option: ChoiceOption) => AbilitySource;
  spellLabel: string;
  scale?: ScaleContext;
  path: string;
}

const SKILLS = new Set<string>(DND_SKILLS);

const prefixed = (abilities: Ability[], prefix: string): Ability[] => abilities.map((a) => ({ ...a, id: `${prefix}.${a.id}` }));

export const selectionNeedsFeats = (state: ChoicesState, classMode: boolean): boolean =>
  hasPicks(state.raceChoices) || (classMode && (state.feats.length > 0 || state.classes.some((e) => hasPicks(e.choices))));

export function choiceSelections(input: SelectionInput): ChoiceSelections {
  const out: ChoiceSelections = { groups: [], skills: [], expertise: [], spells: [], feats: [], options: [], lineage: null };

  const addOptions = (choice: Choice, picks: ChoicePick[], ctx: OwnerCtx) => {
    const picked = picks.flatMap((p) => choice.options?.find((o) => o.id === p.id) ?? []);

    if (picked.length === 0) return;

    out.options.push({ owner: ctx.name, label: choice.label, names: picked.map((o) => o.name) });

    if (choice.lineage) out.lineage = picked[0].name;

    for (const o of picked) {
      if (o.abilities.length > 0) out.groups.push({ source: ctx.sourceFor(choice, o), abilities: prefixed(o.abilities, `${ctx.path}.${choice.id}.${o.id}`), ...(ctx.scale && { scale: ctx.scale }) });

      for (const s of o.spells ?? []) if (s.level <= input.level) out.spells.push({ spellId: s.spellId, label: choice.lineage ? `Лінія: ${o.name}` : `${ctx.name}: ${o.name}` });
    }
  };

  const addFeat = (feat: FeatData, picks: Picks, from: string, key: string) => {
    const source: AbilitySource = { type: "feat", id: feat.id, name: feat.name, icon: feat.icon };

    out.feats.push({ key, feat, picks, from });

    if (feat.abilities.length > 0) out.groups.push({ source, abilities: prefixed(feat.abilities, key) });

    take(feat.choices, picks, { owner: "feat", level: input.level, name: feat.name, from: () => feat.name, sourceFor: (_c, o) => ({ ...source, name: `${feat.name}: ${o.name}` }), spellLabel: `Риса: ${feat.name}`, path: key });
  };

  function take(defs: readonly Choice[], picks: Picks, ctx: OwnerCtx) {
    for (const choice of defs) {
      if (!isChoiceOpen(choice, ctx.level, ctx.owner)) continue;

      const list = picks[choice.id] ?? [];

      const at = `${ctx.path}.${choice.id}`;

      if (choice.kind === "option") addOptions(choice, list, ctx);

      if (choice.kind === "feat") {
        list.forEach((p, i) => {
          if (choice.options?.some((o) => o.id === p.id)) return addOptions(choice, [p], ctx);

          const feat = input.featsById[p.id];

          if (feat) addFeat(feat, p.picks ?? {}, ctx.from(choice), `${at}.${i}`);
        });
      }

      if (choice.kind === "skill") out.skills.push(...list.map((p) => p.id).filter((id): id is DndSkill => SKILLS.has(id)));

      if (choice.kind === "expertise") out.expertise.push(...list.map((p) => p.id).filter((id): id is DndSkill => SKILLS.has(id)));

      if (choice.kind === "spell") out.spells.push(...list.map((p) => ({ spellId: p.id, label: ctx.spellLabel })));
    }
  }

  const { race } = input;

  if (race) {
    take(race.choices, input.raceChoices, { owner: "race", level: input.level, name: race.name, from: () => race.name, sourceFor: (_c, o) => ({ type: "race", id: race.id, name: `${race.name}: ${o.name}` }), spellLabel: `Раса: ${race.name}`, path: "race" });
  }

  for (const entry of input.classes) {
    const cls = entry.class;

    if (!cls) continue;

    take(classChoiceDefs(cls, entry.subclass), entry.choices ?? {}, {
      owner: "class",
      level: entry.level,
      name: cls.name,
      from: (choice) => `${cls.name} ${choice.level}`,
      sourceFor: (choice, o) => ({ type: "class", id: cls.id, name: `${cls.name}: ${choice.label} — ${o.name}`, icon: cls.icon }),
      spellLabel: `Клас: ${cls.name}`,
      scale: { classId: cls.id, level: entry.level, columns: cls.columns ?? [] },
      path: `class:${cls.id}`,
    });
  }

  input.feats.forEach((f, i) => {
    const feat = input.featsById[f.id];

    if (feat) addFeat(feat, f.picks ?? {}, f.source === "origin" ? "Походження" : "ДМ", `feat:${i}`);
  });

  out.skills = [...new Set(out.skills)];

  out.expertise = [...new Set(out.expertise)];

  out.spells = out.spells.filter((s, i) => out.spells.findIndex((x) => x.spellId === s.spellId) === i);

  const synthetic: AbilitySource = { type: "character", id: "choices", name: "Вибори" };

  if (out.skills.length > 0) {
    out.groups.push({ source: synthetic, abilities: [{ id: "choice-skills", name: "Майстерність з виборів", trigger: { event: "passive" }, effects: [{ kind: "flag", flag: "skillProficiency", skills: out.skills }] }] });
  }

  if (out.expertise.length > 0) {
    out.groups.push({ source: synthetic, abilities: [{ id: "choice-expertise", name: "Експертиза з виборів", trigger: { event: "passive" }, effects: [{ kind: "flag", flag: "skillExpertise", skills: out.expertise }] }] });
  }

  return out;
}
```

(Порядок груп: раса → класи → риси `Character.feats` → синтетичні; тест на джерела рис очікує `["Grappler", "Alert"]`, бо Magic Initiate не має власних умінь.)

- [ ] **Step 4: `collect.ts`** — `lib/utils/abilities/build/collect.ts`: `import type { ChoiceGroup } from "@/lib/utils/characters/choices/selections";`; у тип параметра `collectCharacterAbilities` — `choiceGroups?: readonly ChoiceGroup[];`; у тілі перед `return`:

```ts
  const fromChoices = (input.choiceGroups ?? []).flatMap((g) => resolveAbilities(g.source, g.scale ? applyClassScale(g.abilities, g.scale) : g.abilities));
```

і в масиві повернення — `...classResolved(input.classes ?? []), ...fromChoices,` (решта порядку без змін).

- [ ] **Step 5: Flag `skillExpertise`** — `lib/utils/abilities/schema/effects.ts`: після рядка `skillProficiency` у `FlagSchema` — `z.object({ ...flagBase, flag: z.literal("skillExpertise"), skills: z.array(DndSkillSchema).min(1) }),`. `lib/utils/abilities/registry/effects/flags.ts`: після запису `skillProficiency`:

```ts
  skillExpertise: {
    label: "Експертиза в навичках",
    fields: [{ name: "skills", label: "Навички", input: "multiselect", options: SKILL_OPTIONS }],
    defaults: { skills: ["stealth"] },
    describe: (e) => `експертиза в навичках${skillsText(e.skills)} (подвійна майстерність)`,
  },
```

Run `pnpm exec tsc --noEmit -p tsconfig.json` — якщо інші `Record<FlagKey, …>` (наприклад, у `harmful-flags.ts` чи підписах) вимагають ключ — додати `skillExpertise` за зразком `skillProficiency` у тому ж файлі.

`lib/utils/battle/checks/roll-check.ts` — після `skillProficient`:

```ts
function skillExpert(actor: BattleParticipant, skill: DndSkill, participants: BattleParticipant[]): boolean {
  return collectModifiers(withSelf(participants, actor), actor.basicInfo.id, { flag: "skillExpertise" }).flags.some((f) => f.flag === "skillExpertise" && f.skills.includes(skill));
}
```

і в `checkBonus` замість рядка з `proficiency`:

```ts
  const proficient = !!skill && skillProficient(actor, skill, participants);

  const proficiency = proficient ? actor.abilities.proficiencyBonus * (skill && skillExpert(actor, skill, participants) ? 2 : 1) : 0;
```

- [ ] **Step 6: Feats loader and participant** — `lib/utils/battle/participant/load-feats.ts`:

```ts
import { getCachedFeats } from "@/lib/cache/reference-data";
import { toFeatData } from "@/lib/utils/feats/row";
import type { FeatData } from "@/types/choices";

export async function loadFeatsById(campaignId: string, needed: boolean): Promise<Record<string, FeatData>> {
  if (!needed) return {};

  return Object.fromEntries((await getCachedFeats(campaignId)).map(toFeatData).map((f) => [f.id, f]));
}
```

`lib/utils/battle/participant/from-character.ts`: імпорти `loadFeatsById` (`./load-feats`), `readChoiceList` (`@/lib/utils/abilities/read`), `choicesStateOf` (`@/lib/utils/characters/choices/picks`), `choiceSelections`, `selectionNeedsFeats` (`@/lib/utils/characters/choices/selections`). Одразу після рядка `const race = await loadRace(…);`:

```ts
  const choiceState = choicesStateOf(character);

  const raceChoiceDefs = race ? readChoiceList(race.choices) : [];

  const classMode = !!resolvedClasses;

  const selections =
    raceChoiceDefs.length > 0 || classMode
      ? choiceSelections({
          race: race && raceChoiceDefs.length > 0 ? { id: race.id, name: race.name, choices: raceChoiceDefs } : null,
          raceChoices: choiceState.raceChoices,
          classes: resolvedClasses ?? [],
          feats: classMode ? choiceState.feats : [],
          featsById: await loadFeatsById(character.campaignId, selectionNeedsFeats(choiceState, classMode)),
          level: character.level,
        })
      : null;

  const granted = selections?.spells.map((s) => s.spellId) ?? [];
```

У виклику `collectCharacterAbilities({ … })` останнім полем — `...(selections && selections.groups.length > 0 && { choiceGroups: selections.groups }),`; у `spellcasting` — `knownSpells: granted.length > 0 ? [...new Set([...knownSpells, ...granted])] : knownSpells,`. (Тип `RaceRow` після `prisma generate` має `choices`; якщо `race` типізовано вужче — `(race as { choices?: unknown }).choices`.)

- [ ] **Step 7: Run tests**

Run: `pnpm test:run lib/utils/characters/choices lib/utils/abilities lib/utils/battle/checks lib/utils/battle/participant lib/__tests__/client-entry-imports.test.ts && pnpm exec tsc --noEmit -p tsconfig.json`
Expected: PASS — наявні тести учасника (`from-character-*.test.ts`, `race-passives.test.ts`) і `roll-check.test.ts`, реєстру прапорців (`flags.test.ts`, `fields-contract.test.ts`) без змін.

- [ ] **Step 8: Commit**

```bash
git add lib/utils/characters/choices/selections.ts lib/utils/characters/choices/__tests__/selections.test.ts lib/utils/abilities lib/utils/battle/checks lib/utils/battle/participant
git commit -m "feat(constructor): 4f-4 engine — abilities from choices, feat source, skill expertise, granted spells

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---
### Task 9: Лист персонажа — лінія, риси, опції класів, експертиза «×2», джерела заклинань, невибрані

**Files:**
- Create: `lib/utils/characters/choices/describe.ts`
- Modify: `lib/utils/characters/sheet/build-sheet.ts`, `app/api/campaigns/[id]/characters/[characterId]/sheet/sheet-handler.ts`
- Test: `lib/utils/characters/choices/__tests__/describe.test.ts`, `lib/utils/characters/__tests__/build-sheet-choices.test.ts`, `app/api/__tests__/character-sheet-choices.test.ts`

**Interfaces:**
- Consumes: `choiceSelections`, `selectionNeedsFeats`, `ChoiceSelections` (задача 8); `pendingCount`, `visitPicks` (задача 3); `loadFeatsById` (задача 8); `SheetChoices`, `identity.subrace?`, `SheetCheck.expertise?` (задача 1).
- Produces:
  - `describeFeatPicks(feat: FeatData, picks: Picks): string[]` — «+2 СИЛ», «+1 СПР», назви опцій, назви навичок (заклинання — ні, вони в «Магії»).
  - `SheetInput.character.subrace?: string | null`, `SheetInput.choices?: { selections: ChoiceSelections; pending: number }`.
  - `buildCharacterSheet`: `identity.subrace` (лише якщо є), навички з виборів (`proficient`) і експертизою (`expertise: true`, бонус — подвійна майстерність), `choices: SheetChoices` (лише коли передано `input.choices`).
  - `buildSheetFor` рахує вибори для раси з `choices` або героя в режимі класів; HOMM-герой — без запиту рис і без `choices`.

- [ ] **Step 1: Write the failing tests**

`lib/utils/characters/choices/__tests__/describe.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { asi, grappler } from "./fixtures";

import { describeFeatPicks } from "@/lib/utils/characters/choices/describe";

describe("describeFeatPicks", () => {
  it("ability increases are grouped, other picks use names", () => {
    expect(describeFeatPicks(asi, { asi: [{ id: "strength" }, { id: "strength" }] })).toEqual(["+2 СИЛ"]);
    expect(describeFeatPicks(asi, { asi: [{ id: "strength" }, { id: "dexterity" }] })).toEqual(["+1 СИЛ", "+1 СПР"]);
    expect(describeFeatPicks(grappler, {})).toEqual([]);
    expect(describeFeatPicks({ ...asi, choices: [{ id: "s", label: "S", level: 1, count: 2, kind: "skill" }] }, { s: [{ id: "stealth" }, { id: "nope" }] })).toEqual(["Скритність"]);
  });
});
```

(Підпис навички — `DND_SKILL_META.stealth.label`; якщо в константах інший текст — очікування брати з `DND_SKILL_META`, а не жорстко.)

`lib/utils/characters/__tests__/build-sheet-choices.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { createMockParticipant } from "@/lib/utils/battle/__tests__/fixtures/mock-participant";
import { buildCharacterSheet, type SheetInput } from "@/lib/utils/characters/sheet";
import type { ChoiceSelections } from "@/lib/utils/characters/choices/selections";
import { asi } from "@/lib/utils/characters/choices/__tests__/fixtures";

function input(over: Partial<SheetInput> = {}, character: Partial<SheetInput["character"]> = {}): SheetInput {
  const p = createMockParticipant();

  p.abilities = { ...p.abilities, level: 4, dexterity: 14, modifiers: { ...p.abilities.modifiers, dexterity: 2 }, proficiencyBonus: 2 };

  return {
    participant: p,
    viewer: { isDM: true, isOwner: false },
    maxLevel: 20,
    character: {
      id: "h", name: "Лія", avatar: null, level: 4, class: "Rogue", subclass: null, race: "Elf", alignment: null,
      strength: 10, dexterity: 14, constitution: 10, intelligence: 10, wisdom: 10, charisma: 10,
      armorClass: 12, savingThrows: {}, skills: { stealth: true }, languages: [], proficiencies: {}, spellcastingAbility: null, archetype: null, primaryAbility: null, background: null, goals: [],
      ...character,
    },
    raceIcon: null,
    immunities: [],
    artifacts: [],
    spells: [],
    personalSkill: null,
    progression: { freePoints: 0, level: 4, seenLevel: null },
    ...over,
  };
}

const selections: ChoiceSelections = {
  groups: [],
  skills: ["perception"],
  expertise: ["stealth"],
  spells: [{ spellId: "sp1", label: "Лінія: Wood Elf" }],
  feats: [{ key: "class:r.asi.0", feat: asi, picks: { asi: [{ id: "dexterity" }, { id: "dexterity" }] }, from: "Rogue 4" }],
  options: [{ owner: "Rogue", label: "Expertise", names: ["Stealth"] }],
  lineage: "Wood Elf",
};

describe("sheet with choices", () => {
  it("without choices nothing new appears", () => {
    const s = buildCharacterSheet(input());

    expect(s).not.toHaveProperty("choices");
    expect(s.identity).not.toHaveProperty("subrace");
    expect(s.skills.find((k) => k.key === "stealth")).not.toHaveProperty("expertise");
  });

  it("subrace, skills from choices, expertise doubles proficiency, choices block", () => {
    const s = buildCharacterSheet(input({ choices: { selections, pending: 2 } }, { subrace: "Wood Elf" }));

    expect(s.identity.subrace).toBe("Wood Elf");
    expect(s.skills.find((k) => k.key === "perception")).toMatchObject({ proficient: true });
    expect(s.skills.find((k) => k.key === "stealth")).toMatchObject({ proficient: true, expertise: true, bonus: 2 + 4 });
    expect(s.choices).toEqual({
      pending: 2,
      lineage: "Wood Elf",
      feats: [{ key: "class:r.asi.0", id: "f-asi", name: "Ability Score Improvement", type: "general", from: "Rogue 4", picks: ["+2 СПР"] }],
      options: [{ owner: "Rogue", label: "Expertise", names: ["Stealth"] }],
      spellSources: { sp1: "Лінія: Wood Elf" },
      expertise: ["stealth"],
    });
  });
});
```

`app/api/__tests__/character-sheet-choices.test.ts` — перевірка `buildSheetFor` з моками (за зразком `app/api/__tests__/character-sheet-api.test.ts`):

```ts
import { describe, expect, it, vi } from "vitest";

const getCachedFeats = vi.hoisted(() => vi.fn(async () => []));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/cache/reference-data", async (importOriginal) => ({ ...(await importOriginal<object>()), getCachedFeats }));
vi.mock("@/lib/server/spells/book-spells-by-ids", () => ({ loadBookSpellsByIds: vi.fn(async () => []) }));
vi.mock("@/lib/server/scenario/player-story", () => ({ loadStoryChapters: vi.fn(async () => []) }));
vi.mock("@/lib/utils/battle/participant/extract-artifacts", async (importOriginal) => ({ ...(await importOriginal<object>()), loadEquippedArtifactRows: vi.fn(async () => []) }));
vi.mock("@/lib/server/characters/participant", () => ({ buildCharacterParticipant: vi.fn() }));

import { buildSheetFor } from "@/app/api/campaigns/[id]/characters/[characterId]/sheet/sheet-handler";
import { buildCharacterParticipant } from "@/lib/server/characters/participant";
import { createMockParticipant } from "@/lib/utils/battle/__tests__/fixtures/mock-participant";
import { elf } from "@/lib/utils/characters/choices/__tests__/fixtures";
import { DEFAULT_RULES } from "@/lib/utils/rules/defaults";

const character = { id: "h", campaignId: "c1", name: "Лія", avatar: null, level: 1, class: "", subclass: null, race: "Elf", subrace: null, alignment: null, strength: 10, dexterity: 10, constitution: 10, intelligence: 10, wisdom: 10, charisma: 10, armorClass: 10, savingThrows: {}, skills: {}, languages: [], proficiencies: {}, spellcastingAbility: null, archetype: null, primaryAbility: null, background: null, goals: [], classes: [], raceChoices: {}, feats: [], personalSkillId: null, inventory: null, tokens: [], resources: {}, skillTreeProgress: {} };

const raceRow = (choices: unknown) => ({ id: elf.id, name: "Elf", choices, icon: null, passiveAbility: null, abilities: [] });

describe("buildSheetFor + choices", () => {
  it("HOMM race (no choices): no feat query, no choices block", async () => {
    vi.mocked(buildCharacterParticipant).mockResolvedValue({ context: {}, race: raceRow([]), tree: null, participant: createMockParticipant() } as never);

    const sheet = await buildSheetFor(character as never, { isDM: true, isOwner: false }, { maxLevel: 20, rules: DEFAULT_RULES });

    expect(getCachedFeats).not.toHaveBeenCalled();
    expect(sheet).not.toHaveProperty("choices");
  });

  it("race with choices: pending lineage + Keen Senses", async () => {
    vi.mocked(buildCharacterParticipant).mockResolvedValue({ context: {}, race: raceRow(elf.choices), tree: null, participant: createMockParticipant() } as never);

    const sheet = await buildSheetFor(character as never, { isDM: true, isOwner: false }, { maxLevel: 20, rules: DEFAULT_RULES });

    expect(sheet.choices?.pending).toBe(2);
  });
});
```

(Якщо `buildSheetFor` читає ще якісь поля персонажа чи контексту — доповнити фікстуру цього нового тесту; наявні тести листа не змінювати.)

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm test:run lib/utils/characters/choices/__tests__/describe.test.ts lib/utils/characters/__tests__/build-sheet-choices.test.ts app/api/__tests__/character-sheet-choices.test.ts`
Expected: FAIL.

- [ ] **Step 3: `describe.ts`**

```ts
import { ABILITY_SHORT_LABELS, isAbilityKey } from "@/lib/constants/abilities";
import { DND_SKILL_META, type DndSkill } from "@/lib/constants/skills";
import type { FeatData, Picks } from "@/types/choices";

export function describeFeatPicks(feat: FeatData, picks: Picks): string[] {
  return feat.choices.flatMap((choice) => {
    const list = picks[choice.id] ?? [];

    if (choice.kind === "abilityScore") {
      const counts = new Map<string, number>();

      for (const p of list) if (isAbilityKey(p.id)) counts.set(p.id, (counts.get(p.id) ?? 0) + 1);

      return [...counts].map(([ability, n]) => `+${n} ${ABILITY_SHORT_LABELS[ability as keyof typeof ABILITY_SHORT_LABELS]}`);
    }

    if (choice.kind === "skill" || choice.kind === "expertise") return list.flatMap((p) => (p.id in DND_SKILL_META ? [DND_SKILL_META[p.id as DndSkill].label] : []));

    if (choice.kind === "option") return list.flatMap((p) => choice.options?.find((o) => o.id === p.id)?.name ?? []);

    return [];
  });
}
```

- [ ] **Step 4: `build-sheet.ts`** — імпорти `describeFeatPicks` (`@/lib/utils/characters/choices/describe`) і `type ChoiceSelections` (`@/lib/utils/characters/choices/selections`); у `SheetInput` — `choices?: { selections: ChoiceSelections; pending: number };`, у `character` — `subrace?: string | null;`. У тілі перед `const skills`:

```ts
  const fromChoices = new Set<string>(input.choices?.selections.skills ?? []);

  const expert = new Set<string>(input.choices?.selections.expertise ?? []);
```

`skills` — замінити тіло мапи:

```ts
  const skills = DND_SKILLS.map((key) => {
    const meta = DND_SKILL_META[key];

    const proficient = !!skillFlags[key] || fromChoices.has(key);

    const expertise = proficient && expert.has(key);

    return { key, label: meta.label, ability: meta.ability, proficient, bonus: checkBonus(scores[meta.ability], proficient, expertise ? prof * 2 : prof), ...(expertise && { expertise: true as const }) };
  });
```

`identity` — після `race: c.race,` — `...(c.subrace && { subrace: c.subrace }),`. Останнім полем повернення:

```ts
    ...(input.choices && {
      choices: {
        pending: input.choices.pending,
        lineage: input.choices.selections.lineage,
        feats: input.choices.selections.feats.map((f) => ({ key: f.key, id: f.feat.id, name: f.feat.name, type: f.feat.type, from: f.from, picks: describeFeatPicks(f.feat, f.picks) })),
        options: input.choices.selections.options,
        spellSources: Object.fromEntries(input.choices.selections.spells.map((s) => [s.spellId, s.label])),
        expertise: input.choices.selections.expertise,
      },
    }),
```

- [ ] **Step 5: `sheet-handler.ts`** — імпорти `readChoiceList`, `choicesStateOf`, `choiceSelections`, `selectionNeedsFeats`, `pendingCount`, `visitPicks`, `loadFeatsById`. Після обчислення `classes`:

```ts
  const state = choicesStateOf(character);

  const raceDefs = race ? readChoiceList(race.choices) : [];

  const classMode = !!classes?.some((e) => e.class);

  const choiceRace = race && raceDefs.length > 0 ? { id: race.id, name: race.name, choices: raceDefs } : null;

  const featsById = choiceRace || classMode ? await loadFeatsById(character.campaignId, selectionNeedsFeats(state, classMode)) : {};

  const choices =
    choiceRace || classMode
      ? {
          selections: choiceSelections({ race: choiceRace, raceChoices: state.raceChoices, classes: classMode ? (classes ?? []) : [], feats: classMode ? state.feats : [], featsById, level: character.level }),
          pending: pendingCount(visitPicks(state, { race: choiceRace, classesById: context.classesById ?? {}, featsById }, { level: character.level, classMode }), { featsById }),
        }
      : undefined;
```

і в `buildCharacterSheet({ … })` — `...(choices && { choices }),` та в `character` (якщо об'єкт персонажа передається повністю — `subrace` уже там; якщо полями — додати `subrace: character.subrace`).

- [ ] **Step 6: Run tests**

Run: `pnpm test:run lib/utils/characters app/api/__tests__ lib/__tests__/client-entry-imports.test.ts && pnpm exec tsc --noEmit -p tsconfig.json`
Expected: PASS — наявний `build-sheet.test.ts` і `character-sheet-api.test.ts` без змін.

- [ ] **Step 7: Commit**

```bash
git add lib/utils/characters/choices/describe.ts lib/utils/characters/choices/__tests__/describe.test.ts lib/utils/characters/sheet/build-sheet.ts lib/utils/characters/__tests__/build-sheet-choices.test.ts "app/api/campaigns/[id]/characters/[characterId]/sheet/sheet-handler.ts" app/api/__tests__/character-sheet-choices.test.ts
git commit -m "feat(constructor): 4f-4 sheet — lineage, feats, class options, expertise, spell sources, pending count

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---
### Task 10: UI — редактор виборів `ChoiceListEditor`; вибори раси й рівнів класу; «Список заклинань» класу; «Списки» заклинання й фільтр бібліотеки

**Files:**
- Create: `lib/utils/characters/choices/slug.ts`, `components/choices/ChoiceListEditor.tsx`, `components/choices/ChoiceOptionsEditor.tsx`, `components/choices/OptionSpellsEditor.tsx`, `components/classes/SpellListHint.tsx`
- Modify: `components/races/race-form-tabs.ts`, `components/races/RaceFormFields.tsx`, `lib/utils/races/race-form.ts`, `components/classes/ClassFeaturesEditor.tsx`, `components/classes/ClassBasicsTab.tsx`, `components/spells/form/SpellFormPowerFields.tsx`, `lib/hooks/spells/useSpellsList.ts`, `app/campaigns/[id]/dm/spells/page-client.tsx`
- Test: `lib/utils/characters/choices/__tests__/slug.test.ts`, `components/choices/__tests__/ChoiceListEditor.test.tsx`, `components/classes/__tests__/ClassFeaturesEditor-choices.test.tsx`, `lib/hooks/spells/__tests__/useSpellsList-lists.test.tsx`

**Interfaces:**
- Consumes: `Choice`, `ChoiceOption`, `ChoiceOwner`, константи (задача 1); `AbilityListEditor` (`@/components/abilities`), `useErrorTotals` (`components/classes/use-error-totals.ts`), `useSpells` (`@/lib/hooks/spells`).
- Produces:
  - `choiceSlug(text: string, taken?: readonly string[]): string` (без zod).
  - `ChoiceListEditor({ campaignId, owner, value, onChange, classColumns?, onValidityChange? })` — список виборів з полями виду; `ChoiceOptionsEditor`, `OptionSpellsEditor` (лише раса).
  - `RACE_FORM_TAB.choices = "choices"`; вкладка «Вибори й лінії» у формі раси (не в компактному діалозі); `getInitialRaceFormData` переносить `choices`.
  - Блок «Вибори» в секції кожного рівня класу/підкласу (`ClassFeaturesEditor`); поле «Список заклинань» на «Основне» класу для заклинача + підказка кількості (`SpellListHint`, 0 → попередження).
  - Поле «Списки» у секції «5e» форми заклинання; `useSpellsList` → `listFilter: { tags: string[]; value: string | null; set(tag: string | null): void }`, чип-фільтр на сторінці бібліотеки.

- [ ] **Step 1: Write the failing tests**

`lib/utils/characters/choices/__tests__/slug.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { choiceSlug } from "@/lib/utils/characters/choices/slug";

describe("choiceSlug", () => {
  it("kebab slug, unique among taken, fallback for non-latin text", () => {
    expect(choiceSlug("Elven Lineage")).toBe("elven-lineage");
    expect(choiceSlug("Elven Lineage", ["elven-lineage"])).toBe("elven-lineage-2");
    expect(choiceSlug("Лінія")).toBe("choice");
    expect(choiceSlug("Лінія", ["choice", "choice-2"])).toBe("choice-3");
  });
});
```

`components/choices/__tests__/ChoiceListEditor.test.tsx`:

```tsx
// @vitest-environment happy-dom
import { useState } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ChoiceListEditor } from "@/components/choices/ChoiceListEditor";
import type { Choice, ChoiceOwner } from "@/types/choices";

vi.mock("@/components/abilities", () => ({ AbilityListEditor: ({ value }: { value: unknown[] }) => <div data-testid="ability-editor">{value.length}</div> }));
vi.mock("@/lib/hooks/spells", () => ({ useSpells: () => ({ data: [{ id: "sp1", name: "Druidcraft", level: 0 }] }) }));

function Harness({ owner, initial = [] }: { owner: ChoiceOwner; initial?: Choice[] }) {
  const [value, setValue] = useState<Choice[]>(initial);

  return (
    <>
      <ChoiceListEditor campaignId="c1" owner={owner} value={value} onChange={setValue} classColumns={[{ key: "metamagic", label: "Metamagic", values: Array(20).fill("2") }]} />
      <output data-testid="json">{JSON.stringify(value)}</output>
    </>
  );
}

const json = () => JSON.parse(screen.getByTestId("json").textContent ?? "[]") as Choice[];

describe("ChoiceListEditor", () => {
  afterEach(cleanup);

  it("adds a choice and switches its kind", () => {
    render(<Harness owner="class" />);

    fireEvent.click(screen.getByRole("button", { name: "Додати вибір" }));
    fireEvent.change(screen.getByLabelText("Вид вибору"), { target: { value: "abilityScore" } });

    expect(json()[0]).toMatchObject({ kind: "abilityScore", points: 2, max: 20 });
  });

  it("class: count from a table column; race: lineage; feat: no nested feat kind", () => {
    render(<Harness owner="class" initial={[{ id: "m", label: "Metamagic", level: 2, count: 1, kind: "option", options: [] }]} />);

    fireEvent.change(screen.getByLabelText("Кількість з таблиці класу"), { target: { value: "metamagic" } });

    expect(json()[0].count).toEqual({ scale: "metamagic" });

    cleanup();
    render(<Harness owner="race" initial={[{ id: "l", label: "Lineage", level: 1, count: 1, kind: "option", options: [] }]} />);

    fireEvent.click(screen.getByLabelText("Лінія (назва опції → підраса)"));

    expect(json()[0].lineage).toBe(true);

    cleanup();
    render(<Harness owner="feat" initial={[{ id: "s", label: "S", level: 1, count: 1, kind: "skill" }]} />);

    expect(Array.from(screen.getByLabelText("Вид вибору").querySelectorAll("option")).map((o) => o.getAttribute("value"))).not.toContain("feat");
    expect(screen.queryByLabelText("Рівень вибору")).toBeNull();
  });

  it("options: add, name gives the id, race options take spells", () => {
    render(<Harness owner="race" initial={[{ id: "l", label: "Lineage", level: 1, count: 1, kind: "option", options: [] }]} />);

    fireEvent.click(screen.getByRole("button", { name: "Додати опцію" }));
    fireEvent.change(screen.getByLabelText("Назва опції"), { target: { value: "Wood Elf" } });
    fireEvent.click(screen.getByRole("button", { name: "Додати заклинання" }));

    expect(json()[0].options?.[0]).toMatchObject({ id: "wood-elf", name: "Wood Elf", spells: [{ level: 1, spellId: "sp1" }] });
    expect(screen.getAllByTestId("ability-editor")).toHaveLength(1);
  });

  it("removes a choice", () => {
    render(<Harness owner="class" initial={[{ id: "a", label: "A", level: 1, count: 1, kind: "skill" }]} />);

    fireEvent.click(screen.getByRole("button", { name: "Видалити вибір A" }));

    expect(json()).toEqual([]);
  });
});
```

`components/classes/__tests__/ClassFeaturesEditor-choices.test.tsx`:

```tsx
// @vitest-environment happy-dom
import { useState } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ClassFeaturesEditor } from "@/components/classes/ClassFeaturesEditor";
import type { ClassFeature } from "@/types/classes";

vi.mock("@/components/abilities", () => ({ AbilityListEditor: () => <div data-testid="ability-editor" /> }));

function Harness() {
  const [features, setFeatures] = useState<ClassFeature[]>([{ level: 4, abilities: [] }]);

  return (
    <>
      <ClassFeaturesEditor campaignId="c1" value={features} onChange={setFeatures} />
      <output data-testid="json">{JSON.stringify(features)}</output>
    </>
  );
}

describe("ClassFeaturesEditor: choices per level", () => {
  afterEach(cleanup);

  it("adds a choice to the level section; empty choices leave no key", () => {
    render(<Harness />);

    fireEvent.click(screen.getByRole("button", { name: "Додати вибір" }));

    expect(JSON.parse(screen.getByTestId("json").textContent ?? "[]")[0].choices).toHaveLength(1);

    fireEvent.click(screen.getByRole("button", { name: /^Видалити вибір/ }));

    expect(JSON.parse(screen.getByTestId("json").textContent ?? "[]")[0]).toEqual({ level: 4, abilities: [] });
  });
});
```

`lib/hooks/spells/__tests__/useSpellsList-lists.test.tsx`:

```tsx
// @vitest-environment happy-dom
import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/hooks/spells/useSpells", () => ({
  useSpells: () => ({ data: [{ id: "a", name: "Fire Bolt", level: 0, groupId: null, lists: ["Wizard", "Sorcerer"] }, { id: "b", name: "Cure Wounds", level: 1, groupId: null, lists: ["Cleric"] }, { id: "c", name: "Old", level: 1, groupId: null }], isLoading: false }),
  useSpellGroups: () => ({ data: [] }),
  useRemoveSpellFromGroup: () => ({ mutate: vi.fn() }),
  useMoveSpellToGroup: () => ({ mutate: vi.fn() }),
  useDeleteAllSpells: () => ({ mutateAsync: vi.fn() }),
}));

import { useSpellsList } from "@/lib/hooks/spells/useSpellsList";

describe("useSpellsList: list filter", () => {
  it("tags are sorted, filtering narrows the groups", () => {
    const { result } = renderHook(() => useSpellsList("c1"));

    expect(result.current.listFilter.tags).toEqual(["Cleric", "Sorcerer", "Wizard"]);

    const count = () => result.current.view.groups.flatMap(([, levels]) => Object.values(levels).flat()).length;

    expect(count()).toBe(3);

    act(() => result.current.listFilter.set("Cleric"));

    expect(count()).toBe(1);
  });
});
```

(Форма `view.groups` — результат `convertGroupedSpellsToArray(groupSpellsByGroupAndLevel(spells))`: `[groupName, Record<level, Spell[]>][]`; якщо форма інша — рахувати кількість через ту ж структуру, не змінюючи утиліти.)

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm test:run lib/utils/characters/choices/__tests__/slug.test.ts components/choices components/classes/__tests__/ClassFeaturesEditor-choices.test.tsx lib/hooks/spells/__tests__/useSpellsList-lists.test.tsx`
Expected: FAIL.

- [ ] **Step 3: `slug.ts`**

```ts
export function choiceSlug(text: string, taken: readonly string[] = []): string {
  const base =
    text
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48) || "choice";

  if (!taken.includes(base)) return base;

  let n = 2;

  while (taken.includes(`${base}-${n}`)) n += 1;

  return `${base}-${n}`;
}
```

- [ ] **Step 4: `OptionSpellsEditor.tsx`**

```tsx
"use client";

import { Plus, Trash2 } from "lucide-react";

import { HUD_SELECT_CLASS } from "@/components/hud/form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSpells } from "@/lib/hooks/spells";
import type { ChoiceOption } from "@/types/choices";

type Spells = NonNullable<ChoiceOption["spells"]>;

export function OptionSpellsEditor({ campaignId, value, onChange }: { campaignId: string; value: Spells; onChange: (next: Spells) => void }) {
  const { data: spells = [] } = useSpells(campaignId);

  const set = (i: number, patch: Partial<Spells[number]>) => onChange(value.map((s, k) => (k === i ? { ...s, ...patch } : s)));

  return (
    <div className="space-y-2">
      {value.map((row, i) => (
        <div key={i} className="flex items-center gap-2">
          <Input type="number" min={1} max={20} aria-label="Загальний рівень" className="w-20" value={row.level} onChange={(e) => set(i, { level: Number(e.target.value) || 1 })} />
          <select aria-label="Заклинання" className={HUD_SELECT_CLASS} value={row.spellId} onChange={(e) => set(i, { spellId: e.target.value })}>
            {spells.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.level})
              </option>
            ))}
            {!spells.some((s) => s.id === row.spellId) && <option value={row.spellId}>Заклинання не знайдено</option>}
          </select>
          <Button type="button" variant="ghost" size="sm" aria-label="Прибрати заклинання" onClick={() => onChange(value.filter((_, k) => k !== i))}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" disabled={spells.length === 0} onClick={() => onChange([...value, { level: 1, spellId: spells[0]?.id ?? "" }])}>
        <Plus className="h-4 w-4" />
        Додати заклинання
      </Button>
    </div>
  );
}
```

- [ ] **Step 5: `ChoiceOptionsEditor.tsx`**

```tsx
"use client";

import { Plus, Trash2 } from "lucide-react";

import { OptionSpellsEditor } from "./OptionSpellsEditor";

import { AbilityListEditor } from "@/components/abilities";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { choiceSlug } from "@/lib/utils/characters/choices/slug";
import type { ChoiceOption, ChoiceOwner } from "@/types/choices";
import type { ClassColumn } from "@/types/classes";

interface ChoiceOptionsEditorProps {
  campaignId: string;
  owner: ChoiceOwner;
  value: ChoiceOption[];
  onChange: (next: ChoiceOption[]) => void;
  classColumns?: readonly ClassColumn[];
  errors: { report: (key: string, count: number) => void; drop: (key: string) => void; prefix: string };
}

export function ChoiceOptionsEditor({ campaignId, owner, value, onChange, classColumns, errors }: ChoiceOptionsEditorProps) {
  const set = (i: number, patch: Partial<ChoiceOption>) => onChange(value.map((o, k) => (k === i ? { ...o, ...patch } : o)));

  const rename = (i: number, name: string) => {
    const others = value.filter((_, k) => k !== i).map((o) => o.id);

    const fresh = !value[i].name || value[i].id === choiceSlug(value[i].name, others);

    set(i, { name, ...(fresh && { id: choiceSlug(name, others) }) });
  };

  return (
    <div className="space-y-3">
      {value.map((option, i) => (
        <fieldset key={i} className="space-y-2 rounded-md border border-hud-line/40 p-3">
          <div className="flex items-end gap-2">
            <div className="flex-1 space-y-1">
              <Label htmlFor={`${errors.prefix}-o${i}-name`}>Назва опції</Label>
              <Input id={`${errors.prefix}-o${i}-name`} value={option.name} onChange={(e) => rename(i, e.target.value)} />
            </div>
            <div className="w-40 space-y-1">
              <Label htmlFor={`${errors.prefix}-o${i}-id`}>Id</Label>
              <Input id={`${errors.prefix}-o${i}-id`} value={option.id} onChange={(e) => set(i, { id: e.target.value })} />
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              aria-label={`Видалити опцію ${option.name}`}
              onClick={() => {
                errors.drop(`${errors.prefix}-o${i}`);
                onChange(value.filter((_, k) => k !== i));
              }}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
          <Textarea aria-label="Опис опції" rows={2} value={option.description ?? ""} onChange={(e) => set(i, { description: e.target.value || undefined })} />
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <label className="flex items-center gap-2">
              Мін. рівень
              <Input type="number" min={1} max={20} className="w-20" aria-label="Мінімальний рівень опції" value={option.minLevel ?? ""} onChange={(e) => set(i, { minLevel: e.target.value ? Number(e.target.value) : undefined })} />
            </label>
            {value
              .filter((o) => o.id !== option.id)
              .map((o) => (
                <label key={o.id} className="flex items-center gap-1">
                  <Checkbox
                    checked={option.requires?.includes(o.id) ?? false}
                    onCheckedChange={(on) => {
                      const next = on ? [...(option.requires ?? []), o.id] : (option.requires ?? []).filter((r) => r !== o.id);

                      set(i, { requires: next.length > 0 ? next : undefined });
                    }}
                  />
                  потребує «{o.name}»
                </label>
              ))}
          </div>
          <AbilityListEditor campaignId={campaignId} value={option.abilities} onChange={(abilities) => set(i, { abilities })} classColumns={owner === "class" ? classColumns : undefined} onValidityChange={(_, n) => errors.report(`${errors.prefix}-o${i}`, n)} />
          {owner === "race" && <OptionSpellsEditor campaignId={campaignId} value={option.spells ?? []} onChange={(spells) => set(i, { spells: spells.length > 0 ? spells : undefined })} />}
        </fieldset>
      ))}
      <Button type="button" variant="outline" size="sm" onClick={() => onChange([...value, { id: choiceSlug("option", value.map((o) => o.id)), name: "", abilities: [] }])}>
        <Plus className="h-4 w-4" />
        Додати опцію
      </Button>
    </div>
  );
}
```

(Нова опція отримує тимчасовий id `option`, а перше введення назви перезаписує його на slug назви — тест очікує `wood-elf`: умова `fresh` істинна, бо `name` порожнє.)

- [ ] **Step 6: `ChoiceListEditor.tsx`**

```tsx
"use client";

import { Plus, Trash2 } from "lucide-react";

import { ChoiceOptionsEditor } from "./ChoiceOptionsEditor";

import { useErrorTotals } from "@/components/classes/use-error-totals";
import { HUD_SELECT_CLASS } from "@/components/hud/form";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ABILITY_KEYS, ABILITY_LABELS, type AbilityKey } from "@/lib/constants/abilities";
import { CHOICE_KIND_LABELS, CHOICE_KINDS, FEAT_TYPE_LABELS, FEAT_TYPES } from "@/lib/constants/choices";
import { DND_SKILL_META, DND_SKILLS, type DndSkill } from "@/lib/constants/skills";
import { choiceSlug } from "@/lib/utils/characters/choices/slug";
import type { Choice, ChoiceKind, ChoiceOwner, FeatType } from "@/types/choices";
import type { ClassColumn } from "@/types/classes";

interface ChoiceListEditorProps {
  campaignId: string;
  owner: ChoiceOwner;
  value: Choice[];
  onChange: (next: Choice[]) => void;
  classColumns?: readonly ClassColumn[];
  onValidityChange?: (ok: boolean, errorCount: number) => void;
}

const KIND_DEFAULTS: Record<ChoiceKind, Partial<Choice>> = {
  option: { options: [] },
  feat: { featTypes: ["general"] },
  skill: {},
  expertise: {},
  abilityScore: { points: 2, max: 20 },
  spell: { spells: { lists: [], minLevel: 0, maxLevel: 0 } },
};

const toggle = <T extends string>(list: readonly T[] | undefined, item: T): T[] => ((list ?? []).includes(item) ? (list ?? []).filter((x) => x !== item) : [...(list ?? []), item]);

const CIRCLES = Array.from({ length: 10 }, (_, i) => i);

export function ChoiceListEditor({ campaignId, owner, value, onChange, classColumns = [], onValidityChange }: ChoiceListEditorProps) {
  const { report, drop } = useErrorTotals(onValidityChange);

  const kinds = CHOICE_KINDS.filter((k) => owner !== "feat" || k !== "feat");

  const update = (i: number, patch: Partial<Choice>) => onChange(value.map((c, k) => (k === i ? { ...c, ...patch } : c)));

  const switchKind = (i: number, kind: ChoiceKind) => {
    const { id, label, level, count, description, lineage } = value[i];

    onChange(value.map((c, k) => (k === i ? { id, label, level, count, ...(description && { description }), ...(lineage && { lineage }), kind, ...KIND_DEFAULTS[kind] } : c)));
  };

  const add = () => onChange([...value, { id: choiceSlug("choice", value.map((c) => c.id)), label: "Новий вибір", level: 1, count: 1, kind: "skill" }]);

  const remove = (i: number) => {
    drop(`c${i}`);
    onChange(value.filter((_, k) => k !== i));
  };

  return (
    <div className="space-y-3">
      {value.map((choice, i) => (
        <fieldset key={i} className="space-y-3 rounded-md border border-hud-line/60 p-3">
          <div className="flex flex-wrap items-end gap-2">
            <div className="min-w-40 flex-1 space-y-1">
              <Label htmlFor={`choice-${i}-label`}>Назва вибору</Label>
              <Input id={`choice-${i}-label`} value={choice.label} onChange={(e) => update(i, { label: e.target.value })} />
            </div>
            <div className="w-40 space-y-1">
              <Label htmlFor={`choice-${i}-id`}>Id вибору</Label>
              <Input id={`choice-${i}-id`} value={choice.id} onChange={(e) => update(i, { id: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label htmlFor={`choice-${i}-kind`}>Вид вибору</Label>
              <select id={`choice-${i}-kind`} className={HUD_SELECT_CLASS} value={choice.kind} onChange={(e) => switchKind(i, e.target.value as ChoiceKind)}>
                {kinds.map((k) => (
                  <option key={k} value={k}>
                    {CHOICE_KIND_LABELS[k]}
                  </option>
                ))}
              </select>
            </div>
            {owner !== "feat" && (
              <div className="w-24 space-y-1">
                <Label htmlFor={`choice-${i}-level`}>Рівень вибору</Label>
                <Input id={`choice-${i}-level`} type="number" min={1} max={20} value={choice.level} onChange={(e) => update(i, { level: Number(e.target.value) || 1 })} />
              </div>
            )}
            <Button type="button" variant="ghost" size="sm" aria-label={`Видалити вибір ${choice.label}`} onClick={() => remove(i)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex flex-wrap items-end gap-3">
            {choice.kind !== "abilityScore" && (
              <div className="w-24 space-y-1">
                <Label htmlFor={`choice-${i}-count`}>Кількість</Label>
                <Input id={`choice-${i}-count`} type="number" min={1} max={30} disabled={typeof choice.count !== "number"} value={typeof choice.count === "number" ? choice.count : ""} onChange={(e) => update(i, { count: Number(e.target.value) || 1 })} />
              </div>
            )}
            {owner === "class" && choice.kind !== "abilityScore" && (
              <div className="space-y-1">
                <Label htmlFor={`choice-${i}-scale`}>Кількість з таблиці класу</Label>
                <select id={`choice-${i}-scale`} className={HUD_SELECT_CLASS} value={typeof choice.count === "number" ? "" : choice.count.scale} onChange={(e) => update(i, { count: e.target.value ? { scale: e.target.value } : 1 })}>
                  <option value="">— число —</option>
                  {classColumns.map((c) => (
                    <option key={c.key} value={c.key}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>
            )}
            {owner === "race" && choice.kind === "option" && (
              <label className="flex items-center gap-2 text-sm">
                <Checkbox checked={!!choice.lineage} onCheckedChange={(on) => update(i, { lineage: on ? true : undefined })} />
                Лінія (назва опції → підраса)
              </label>
            )}
          </div>

          <Textarea aria-label="Опис вибору" rows={2} value={choice.description ?? ""} onChange={(e) => update(i, { description: e.target.value || undefined })} />

          {choice.kind === "feat" && (
            <div className="flex flex-wrap gap-3 text-sm">
              {FEAT_TYPES.map((t) => (
                <label key={t} className="flex items-center gap-1">
                  <Checkbox checked={choice.featTypes?.includes(t) ?? false} onCheckedChange={() => update(i, { featTypes: toggle<FeatType>(choice.featTypes, t) })} />
                  {FEAT_TYPE_LABELS[t]}
                </label>
              ))}
            </div>
          )}

          {(choice.kind === "skill" || choice.kind === "expertise") && (
            <div className="space-y-1">
              <p className="text-xs text-hud-muted">Порожньо — будь-яка навичка{choice.kind === "expertise" ? " з майстерністю" : ""}</p>
              <div className="flex flex-wrap gap-3 text-sm">
                {DND_SKILLS.map((s) => (
                  <label key={s} className="flex items-center gap-1">
                    <Checkbox checked={choice.skills?.includes(s) ?? false} onCheckedChange={() => update(i, { skills: toggle<DndSkill>(choice.skills, s) })} />
                    {DND_SKILL_META[s].label}
                  </label>
                ))}
              </div>
            </div>
          )}

          {choice.kind === "abilityScore" && (
            <div className="flex flex-wrap items-end gap-3 text-sm">
              {ABILITY_KEYS.map((a) => (
                <label key={a} className="flex items-center gap-1">
                  <Checkbox checked={choice.abilities?.includes(a) ?? false} onCheckedChange={() => update(i, { abilities: toggle<AbilityKey>(choice.abilities, a) })} />
                  {ABILITY_LABELS[a]}
                </label>
              ))}
              <label className="flex items-center gap-2">
                +1 разів
                <Input type="number" min={1} max={4} className="w-20" aria-label="Скільки разів +1" value={choice.points ?? 1} onChange={(e) => update(i, { points: Number(e.target.value) || 1 })} />
              </label>
              <label className="flex items-center gap-2">
                Межа
                <Input type="number" min={1} max={30} className="w-20" aria-label="Межа характеристики" value={choice.max ?? 20} onChange={(e) => update(i, { max: Number(e.target.value) || 20 })} />
              </label>
            </div>
          )}

          {choice.kind === "spell" && choice.spells && (
            <div className="flex flex-wrap items-end gap-3 text-sm">
              <label className="flex flex-1 items-center gap-2">
                Списки
                <Input aria-label="Списки заклинань" placeholder="Wizard, Cleric" value={choice.spells.lists.join(", ")} onChange={(e) => update(i, { spells: { ...choice.spells!, lists: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) } })} />
              </label>
              <label className="flex items-center gap-2">
                Від кола
                <select aria-label="Найнижче коло" className={HUD_SELECT_CLASS} value={choice.spells.minLevel} onChange={(e) => update(i, { spells: { ...choice.spells!, minLevel: Number(e.target.value) } })}>
                  {CIRCLES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex items-center gap-2">
                До кола
                <select aria-label="Найвище коло" className={HUD_SELECT_CLASS} value={String(choice.spells.maxLevel)} onChange={(e) => update(i, { spells: { ...choice.spells!, maxLevel: e.target.value === "slots" ? "slots" : Number(e.target.value) } })}>
                  {CIRCLES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                  {owner === "class" && <option value="slots">Найвище коло слотів класу</option>}
                </select>
              </label>
            </div>
          )}

          {(choice.kind === "option" || choice.kind === "feat") && (
            <div className="space-y-2">
              {choice.kind === "feat" && <p className="text-xs text-hud-muted">Вбудовані опції замість риси (напр. Blessed Warrior)</p>}
              <ChoiceOptionsEditor campaignId={campaignId} owner={owner} value={choice.options ?? []} onChange={(options) => update(i, { options })} classColumns={classColumns} errors={{ report, drop, prefix: `c${i}` }} />
            </div>
          )}
        </fieldset>
      ))}
      <Button type="button" variant="outline" size="sm" onClick={add}>
        <Plus className="h-4 w-4" />
        Додати вибір
      </Button>
    </div>
  );
}
```

(`!` після `choice.spells` — у гілці вже перевірено `choice.spells &&`; якщо ESLint забороняє non-null assertion — винести `const spells = choice.spells;` над JSX гілки.)

- [ ] **Step 7: Race tab** — `components/races/race-form-tabs.ts`: `RACE_FORM_TAB` — додати `choices: "choices"`. `components/races/RaceFormFields.tsx`: імпорт `ChoiceListEditor`; стан `const [choiceErrors, setChoiceErrors] = useState(0);`; до масиву `tabs` (після «Вміння») — `...(compact ? [] : [{ id: RACE_FORM_TAB.choices, label: "Вибори й лінії", invalid: choiceErrors > 0, content: <ChoiceListEditor campaignId={campaignId} owner="race" value={formData.choices ?? []} onChange={(choices) => setFormData((prev) => ({ ...prev, choices }))} onValidityChange={(ok, n) => { setChoiceErrors(n); onAbilitiesValidityChange?.(ok && abilityErrors === 0, abilityErrors + n); }} /> }]),` (тип масиву лишається `HudTab<RaceFormTabId>[]`). `lib/utils/races/race-form.ts`: у параметр — `choices?: Choice[];`, у повернення — `...(race.choices?.length && { choices: race.choices }),`.

- [ ] **Step 8: Class levels and spell list** — `components/classes/ClassFeaturesEditor.tsx`: імпорт `ChoiceListEditor`; функція

```tsx
  const setChoices = (level: number, choices: Choice[]) =>
    onChange(value.map((f) => (f.level !== level ? f : choices.length > 0 ? { ...f, choices } : { level: f.level, abilities: f.abilities })));
```

  у `HudSection` після `AbilityListEditor`:

```tsx
          <div className="mt-3 space-y-2">
            <p className="hud-sc text-xs text-hud-muted">Вибори</p>
            <ChoiceListEditor campaignId={campaignId} owner="class" value={feature.choices ?? []} onChange={(choices) => setChoices(feature.level, choices)} classColumns={classColumns} onValidityChange={(_, n) => report(`choices-${feature.level}`, n)} />
          </div>
```

  і в `remove` — `drop(\`choices-${level}\`);` поруч з наявним `drop`. `components/classes/SpellListHint.tsx`:

```tsx
"use client";

import { useSpells } from "@/lib/hooks/spells";

export function SpellListHint({ campaignId, tag }: { campaignId: string; tag: string }) {
  const { data: spells = [] } = useSpells(campaignId);

  const count = spells.filter((s) => s.lists?.includes(tag)).length;

  return <p className={count === 0 ? "text-xs text-hud-danger" : "text-xs text-hud-muted"}>{count === 0 ? `Жодне заклинання не має тегу «${tag}»` : `Заклинань у списку: ${count}`}</p>;
}
```

  `components/classes/ClassBasicsTab.tsx`: проп `campaignId?: string` (у `ClassForm` передати `campaignId`); під полем характеристики заклинань, коли `isCaster`:

```tsx
        <div className="space-y-2">
          <Label htmlFor="class-spell-list">Список заклинань</Label>
          <Input id="class-spell-list" value={data.spellList ?? ""} placeholder={data.name} onChange={(e) => patch({ spellList: e.target.value.trim() ? e.target.value : null })} />
          {campaignId && data.spellList && <SpellListHint campaignId={campaignId} tag={data.spellList} />}
        </div>
```

  `lib/hooks/classes/useClassForm.ts` (`buildClassBody`) — `spellList: data.caster === "none" ? null : data.spellList?.trim() || null,` лише якщо `data.spellList !== undefined` (інакше поле не додавати: `...(data.spellList !== undefined && { spellList: … })`).

- [ ] **Step 9: Spell lists** — `components/spells/form/SpellFormPowerFields.tsx`: у секції `HudSection title="5e"` (гілка `classesEnabled`) першим полем:

```tsx
              <div className="col-span-2">
                <Label htmlFor="spell-lists">Списки</Label>
                <Input id="spell-lists" placeholder="Wizard, Sorcerer" value={(formData.lists ?? []).join(", ")} onChange={(e) => setFormData({ ...formData, lists: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })} />
              </div>
```

  `lib/hooks/spells/useSpellsList.ts`:

```ts
  const [listTag, setListTag] = useState<string | null>(null);

  const tags = useMemo(() => [...new Set(spells.flatMap((s) => s.lists ?? []))].sort((a, b) => a.localeCompare(b)), [spells]);

  const shown = useMemo(() => (listTag ? spells.filter((s) => s.lists?.includes(listTag)) : spells), [spells, listTag]);

  const groups = useMemo(() => convertGroupedSpellsToArray(groupSpellsByGroupAndLevel(shown)), [shown]);
```

  (замінити наявний `groups`) і в поверненні — `listFilter: { tags, value: listTag, set: setListTag },`. `app/campaigns/[id]/dm/spells/page-client.tsx`: після `<OnboardingHint id="dm.spells" />`:

```tsx
      {list.listFilter.tags.length > 0 && (
        <HudChipTabs
          ariaLabel="Список заклинань"
          items={[{ key: "all", label: "Усі", active: list.listFilter.value === null, onSelect: () => list.listFilter.set(null) }, ...list.listFilter.tags.map((tag) => ({ key: tag, label: tag, active: list.listFilter.value === tag, onSelect: () => list.listFilter.set(tag) }))]}
        />
      )}
```

  (імпорт `HudChipTabs` з `@/components/hud/page`).

- [ ] **Step 10: Run tests**

Run: `pnpm test:run components/choices components/classes components/races components/spells lib/hooks/spells lib/utils/characters/choices lib/utils/races && pnpm exec tsc --noEmit -p tsconfig.json`
Expected: PASS — наявні `ClassFeaturesEditor.test.tsx`, `RaceFormFields.test.tsx`, `CreateRaceDialog.test.tsx`, `spell-form-power-fields.test.tsx` без змін.

- [ ] **Step 11: Commit**

```bash
git add lib/utils/characters/choices/slug.ts lib/utils/characters/choices/__tests__/slug.test.ts components/choices components/races lib/utils/races/race-form.ts components/classes lib/hooks/classes/useClassForm.ts components/spells/form/SpellFormPowerFields.tsx lib/hooks/spells "app/campaigns/[id]/dm/spells/page-client.tsx"
git commit -m "feat(constructor): 4f-4 choice editor for races, class levels and feats; spell lists and library filter

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---
### Task 11: UI ДМ «Риси» — сторінка, створення, форма, плитка й навігація

**Files:**
- Create: `lib/hooks/feats/useFeatsList.ts`, `lib/hooks/feats/useFeatForm.ts`, `components/feats/FeatCard.tsx`, `components/feats/CreateFeatDialog.tsx`, `components/feats/FeatBasicsTab.tsx`, `components/feats/FeatForm.tsx`, `app/campaigns/[id]/dm/feats/page.tsx`, `app/campaigns/[id]/dm/feats/page-client.tsx`, `app/campaigns/[id]/dm/feats/[featId]/page.tsx`
- Modify: `lib/hooks/feats/index.ts`, `app/campaigns/[id]/page.tsx`, `components/layout/Breadcrumbs.tsx`, `components/layout/screen-background.tsx`
- Test: `lib/hooks/feats/__tests__/useFeatsList.test.tsx`, `components/feats/__tests__/FeatForm.test.tsx`

**Interfaces:**
- Consumes: хуки `useFeats`, `useCreateFeat`, `useUpdateFeat`, `useDeleteFeat` (задача 4); `ChoiceListEditor` (задача 10); `AbilityListEditor`, `withAbilityErrors` (`@/components/abilities`); `useAbilityValidity` (`@/lib/hooks/abilities`); `toFeatData` (задача 4).
- Produces:
  - `useFeatsList(campaignId) → { feats: FeatData[] (відфільтровані); all: FeatData[]; isLoading; typeFilter: { value: FeatType | null; set(t: FeatType | null): void }; createDialog: { open; setOpen }; actions: { createFeat(data: FeatFormData): void; deleteFeat(featId: string): Promise<void> } }`.
  - `useFeatForm(campaignId, featId, initial: FeatFormData) → { form: { data; set }; abilities; status: { isSaving }; actions: { submit; cancel } }`.
  - Сторінка `/campaigns/[id]/dm/feats` (плитка «Риси» на сторінці кампанії, коли `classes.enabled`; у `LIBRARY_PATHS`), форма `/campaigns/[id]/dm/feats/[featId]` (вкладки «Основне», «Вміння», «Вибори»).

- [ ] **Step 1: Write the failing tests**

`lib/hooks/feats/__tests__/useFeatsList.test.tsx`:

```tsx
// @vitest-environment happy-dom
import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const feats = [
  { id: "a", name: "Alert", type: "origin" },
  { id: "b", name: "Archery", type: "fightingStyle" },
];

vi.mock("@/lib/hooks/feats/useFeats", () => ({
  useFeats: () => ({ data: feats, isLoading: false }),
  useCreateFeat: () => ({ mutate: vi.fn() }),
  useDeleteFeat: () => ({ mutate: vi.fn() }),
}));
vi.mock("@/lib/hooks/common", () => ({ useConfirm: () => vi.fn(async () => true), useNotify: () => vi.fn() }));

import { useFeatsList } from "@/lib/hooks/feats/useFeatsList";

describe("useFeatsList", () => {
  it("filters by feat type", () => {
    const { result } = renderHook(() => useFeatsList("c1"));

    expect(result.current.feats).toHaveLength(2);

    act(() => result.current.typeFilter.set("fightingStyle"));

    expect(result.current.feats.map((f) => f.name)).toEqual(["Archery"]);
    expect(result.current.all).toHaveLength(2);
  });
});
```

`components/feats/__tests__/FeatForm.test.tsx`:

```tsx
// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { FeatForm } from "@/components/feats/FeatForm";
import type { FeatData } from "@/types/choices";

const mutate = vi.fn();

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("@/lib/hooks/common", () => ({ useNavigateFresh: () => vi.fn() }));
vi.mock("@/lib/hooks/feats/useFeats", () => ({ useUpdateFeat: () => ({ mutate, isPending: false }) }));
vi.mock("@/lib/hooks/abilities", () => ({ useAbilityValidity: () => ({ valid: true, errors: 0, setErrors: vi.fn() }) }));
vi.mock("@/components/abilities", () => ({ AbilityListEditor: () => <div data-testid="ability-editor" />, withAbilityErrors: (label: string) => label }));
vi.mock("@/components/choices/ChoiceListEditor", () => ({ ChoiceListEditor: ({ owner }: { owner: string }) => <div data-testid="choice-editor">{owner}</div> }));

const feat: FeatData = { id: "f1", name: "Grappler", icon: null, type: "general", prerequisite: { level: 4 }, repeatable: false, description: null, abilities: [], choices: [] };

describe("FeatForm", () => {
  afterEach(() => {
    cleanup();
    mutate.mockClear();
  });

  it("edits type, prerequisites and repeatable, then submits", () => {
    render(<FeatForm campaignId="c1" feat={feat} />);

    fireEvent.change(screen.getByLabelText("Тип риси"), { target: { value: "origin" } });
    fireEvent.change(screen.getByLabelText("Мінімальний рівень"), { target: { value: "" } });
    fireEvent.click(screen.getByLabelText("Повторювана"));
    fireEvent.submit(document.getElementById("feat-form") as HTMLFormElement);

    expect(mutate.mock.calls[0][0]).toMatchObject({ featId: "f1", data: { type: "origin", prerequisite: {}, repeatable: true } });
  });

  it("choices tab uses the feat owner", () => {
    render(<FeatForm campaignId="c1" feat={feat} />);

    expect(screen.getByTestId("choice-editor").textContent).toBe("feat");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm test:run lib/hooks/feats components/feats`
Expected: FAIL.

- [ ] **Step 3: Hooks** — `lib/hooks/feats/useFeatsList.ts`:

```ts
"use client";

import { useMemo, useState } from "react";

import { useCreateFeat, useDeleteFeat, useFeats } from "./useFeats";

import { ApiError } from "@/lib/api/client";
import { useConfirm, useNotify } from "@/lib/hooks/common";
import type { FeatData, FeatFormData, FeatType } from "@/types/choices";

const NO_FEATS: FeatData[] = [];

export function useFeatsList(campaignId: string) {
  const confirm = useConfirm();

  const notify = useNotify();

  const { data: all = NO_FEATS, isLoading } = useFeats(campaignId);

  const create = useCreateFeat(campaignId);

  const remove = useDeleteFeat(campaignId);

  const [createOpen, setCreateOpen] = useState(false);

  const [type, setType] = useState<FeatType | null>(null);

  const feats = useMemo(() => (type ? all.filter((f) => f.type === type) : all), [all, type]);

  const deleteFeat = async (featId: string) => {
    if (!(await confirm({ title: "Видалити цю рису?", confirmLabel: "Видалити", destructive: true }))) return;

    remove.mutate(featId, { onError: (error) => void notify(error instanceof ApiError ? error.message : "Не вдалося видалити рису") });
  };

  const createFeat = (data: FeatFormData) =>
    create.mutate(data, { onSuccess: () => setCreateOpen(false), onError: (error) => void notify(error instanceof ApiError ? error.message : "Не вдалося створити рису") });

  return { feats, all, isLoading, typeFilter: { value: type, set: setType }, createDialog: { open: createOpen, setOpen: setCreateOpen }, actions: { createFeat, deleteFeat } };
}
```

`lib/hooks/feats/useFeatForm.ts`:

```ts
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { useUpdateFeat } from "./useFeats";

import { useAbilityValidity } from "@/lib/hooks/abilities";
import { useNavigateFresh } from "@/lib/hooks/common";
import type { FeatFormData } from "@/types/choices";

export function useFeatForm(campaignId: string, featId: string, initial: FeatFormData) {
  const router = useRouter();

  const navigateFresh = useNavigateFresh();

  const update = useUpdateFeat(campaignId);

  const [data, set] = useState<FeatFormData>(initial);

  const abilities = useAbilityValidity();

  const listHref = `/campaigns/${campaignId}/dm/feats`;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!abilities.valid) return;

    update.mutate({ featId, data: { ...data, name: data.name.trim(), icon: data.icon?.trim() || null, description: data.description?.trim() || null } }, { onSuccess: () => navigateFresh(listHref) });
  };

  return { form: { data, set }, abilities, status: { isSaving: update.isPending }, actions: { submit, cancel: () => router.push(listHref) } };
}
```

`lib/hooks/feats/index.ts` — дописати `export { useFeatForm } from "./useFeatForm";` і `export { useFeatsList } from "./useFeatsList";`.

- [ ] **Step 4: Components** — `components/feats/FeatBasicsTab.tsx`:

```tsx
"use client";

import { HUD_SELECT_CLASS } from "@/components/hud/form";
import { Checkbox } from "@/components/ui/checkbox";
import { ImageUpload } from "@/components/ui/image-upload";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ABILITY_KEYS, ABILITY_LABELS, type AbilityKey } from "@/lib/constants/abilities";
import { FEAT_TYPE_LABELS, FEAT_TYPES } from "@/lib/constants/choices";
import type { FeatFormData, FeatType } from "@/types/choices";

export function FeatBasicsTab({ form: { data, set } }: { form: { data: FeatFormData; set: React.Dispatch<React.SetStateAction<FeatFormData>> } }) {
  const patch = (next: Partial<FeatFormData>) => set((prev) => ({ ...prev, ...next }));

  const prereq = data.prerequisite;

  const setPrereq = (next: FeatFormData["prerequisite"]) => patch({ prerequisite: Object.fromEntries(Object.entries(next).filter(([, v]) => v !== undefined)) });

  const scoreAbilities = prereq.scores?.abilities ?? [];

  const toggleAbility = (a: AbilityKey) => {
    const abilities = scoreAbilities.includes(a) ? scoreAbilities.filter((x) => x !== a) : [...scoreAbilities, a];

    setPrereq({ ...prereq, scores: abilities.length > 0 ? { abilities, min: prereq.scores?.min ?? 13 } : undefined });
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="feat-name">Назва риси *</Label>
        <Input id="feat-name" value={data.name} required onChange={(e) => patch({ name: e.target.value })} />
      </div>
      <ImageUpload value={data.icon ?? ""} onChange={(icon) => patch({ icon })} label="Іконка риси" fallbackText={data.name} allowFile={false} />
      <div className="space-y-2">
        <Label htmlFor="feat-type">Тип риси</Label>
        <select id="feat-type" className={HUD_SELECT_CLASS} value={data.type} onChange={(e) => patch({ type: e.target.value as FeatType })}>
          {FEAT_TYPES.map((t) => (
            <option key={t} value={t}>
              {FEAT_TYPE_LABELS[t]}
            </option>
          ))}
        </select>
      </div>
      <fieldset className="space-y-2">
        <legend className="hud-sc text-sm">Передумови</legend>
        <label className="flex items-center gap-2 text-sm">
          Мінімальний рівень
          <Input type="number" min={1} max={20} className="w-20" value={prereq.level ?? ""} onChange={(e) => setPrereq({ ...prereq, level: e.target.value ? Number(e.target.value) : undefined })} />
        </label>
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <span>Будь-яка з характеристик не нижче</span>
          <Input type="number" min={1} max={30} className="w-20" aria-label="Мінімальне значення характеристики" disabled={scoreAbilities.length === 0} value={prereq.scores?.min ?? 13} onChange={(e) => prereq.scores && setPrereq({ ...prereq, scores: { ...prereq.scores, min: Number(e.target.value) || 13 } })} />
          {ABILITY_KEYS.map((a) => (
            <label key={a} className="flex items-center gap-1">
              <Checkbox checked={scoreAbilities.includes(a)} onCheckedChange={() => toggleAbility(a)} />
              {ABILITY_LABELS[a]}
            </label>
          ))}
        </div>
        <Input aria-label="Інші передумови (текст)" placeholder="Напр.: Spellcasting Feature" value={prereq.text ?? ""} onChange={(e) => setPrereq({ ...prereq, text: e.target.value || undefined })} />
      </fieldset>
      <label className="flex items-center gap-2 text-sm">
        <Checkbox checked={data.repeatable} onCheckedChange={(on) => patch({ repeatable: on === true })} />
        Повторювана
      </label>
      <div className="space-y-2">
        <Label htmlFor="feat-description">Опис</Label>
        <Textarea id="feat-description" rows={6} value={data.description ?? ""} onChange={(e) => patch({ description: e.target.value || null })} />
      </div>
    </div>
  );
}
```

`components/feats/FeatForm.tsx`:

```tsx
"use client";

import { useState } from "react";

import { FeatBasicsTab } from "./FeatBasicsTab";

import { AbilityListEditor, withAbilityErrors } from "@/components/abilities";
import { ChoiceListEditor } from "@/components/choices/ChoiceListEditor";
import { useErrorTotals } from "@/components/classes/use-error-totals";
import { HudForm, HudFormPage, type HudTab } from "@/components/hud/form";
import { Button } from "@/components/ui/button";
import { useFeatForm } from "@/lib/hooks/feats";
import type { FeatData } from "@/types/choices";

type FeatFormTabId = "basics" | "abilities" | "choices";

export function FeatForm({ campaignId, feat }: { campaignId: string; feat: FeatData }) {
  const { id, ...initial } = feat;

  const editor = useFeatForm(campaignId, id, initial);

  const { data, set } = editor.form;

  const [invalid, setInvalid] = useState({ abilities: false, choices: false });

  const { report } = useErrorTotals((_, total) => editor.abilities.setErrors(total));

  const track = (key: keyof typeof invalid) => (_: boolean, n: number) => {
    report(key, n);
    setInvalid((p) => (p[key] === n > 0 ? p : { ...p, [key]: n > 0 }));
  };

  const tabs: HudTab<FeatFormTabId>[] = [
    { id: "basics", label: "Основне", content: <FeatBasicsTab form={editor.form} /> },
    { id: "abilities", label: "Вміння", invalid: invalid.abilities, content: <AbilityListEditor campaignId={campaignId} value={data.abilities} onChange={(abilities) => set((p) => ({ ...p, abilities }))} onValidityChange={track("abilities")} /> },
    { id: "choices", label: "Вибори", invalid: invalid.choices, content: <ChoiceListEditor campaignId={campaignId} owner="feat" value={data.choices} onChange={(choices) => set((p) => ({ ...p, choices }))} onValidityChange={track("choices")} /> },
  ];

  return (
    <HudFormPage title="Редагувати рису" aside="Тип, передумови, вміння й вкладені вибори">
      <HudForm
        id="feat-form"
        onSubmit={editor.actions.submit}
        tabs={tabs}
        actions={
          <>
            <Button type="button" variant="outline" onClick={editor.actions.cancel}>
              Скасувати
            </Button>
            <Button type="submit" disabled={editor.status.isSaving || !editor.abilities.valid}>
              {editor.status.isSaving ? "Збереження..." : withAbilityErrors("Зберегти", editor.abilities.errors)}
            </Button>
          </>
        }
      />
    </HudFormPage>
  );
}
```

(`HudForm` з `tabs` за замовчуванням показує першу вкладку; вкладки з `keepMounted` — якщо `HudForm` не рендерить неактивні вкладки, тест «choices tab uses the feat owner» має спершу клікнути вкладку «Вибори» (`fireEvent.click(screen.getByRole("tab", { name: "Вибори" }))`) — додати цей рядок у тест, якщо `getByTestId` не знаходить редактор.)

`components/feats/FeatCard.tsx`:

```tsx
"use client";

import Link from "next/link";
import { Edit, Trash2 } from "lucide-react";

import { ActionsMenu } from "@/components/common/ActionsMenu";
import { HudCard } from "@/components/hud/page";
import { Badge } from "@/components/ui/badge";
import { FEAT_TYPE_LABELS } from "@/lib/constants/choices";
import { pluralUk } from "@/lib/utils/common/plural";
import type { FeatData } from "@/types/choices";

export function FeatCard({ feat, campaignId, onDelete }: { feat: FeatData; campaignId: string; onDelete: (featId: string) => void }) {
  const href = `/campaigns/${campaignId}/dm/feats/${feat.id}`;

  const choices = feat.choices.length;

  return (
    <HudCard className="flex h-full flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <Link href={href} className="min-w-0 flex-1">
          <h3 className="hud-sc truncate text-lg text-hud-ink">{feat.name}</h3>
        </Link>
        <ActionsMenu
          triggerSize="sm"
          triggerClassName="h-8 w-8 p-0"
          actions={[
            { label: "Редагувати", icon: Edit, href },
            { label: "Видалити", icon: Trash2, onSelect: () => onDelete(feat.id), destructive: true },
          ]}
        />
      </div>
      <Link href={href} className="flex flex-wrap gap-2">
        <Badge variant="outline">{FEAT_TYPE_LABELS[feat.type]}</Badge>
        {feat.prerequisite.level && <Badge variant="outline">{`Рівень ${feat.prerequisite.level}+`}</Badge>}
        {feat.repeatable && <Badge variant="outline">Повторювана</Badge>}
        {choices > 0 && <Badge variant="outline">{`${choices} ${pluralUk(choices, ["вибір", "вибори", "виборів"])}`}</Badge>}
      </Link>
    </HudCard>
  );
}
```

`components/feats/CreateFeatDialog.tsx`:

```tsx
"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import type { FeatFormData } from "@/types/choices";

const emptyFeat = (name: string): FeatFormData => ({ name, icon: null, type: "general", prerequisite: {}, repeatable: false, description: null, abilities: [], choices: [] });

export function CreateFeatDialog({ open, onOpenChange, onCreateFeat }: { open: boolean; onOpenChange: (open: boolean) => void; onCreateFeat: (data: FeatFormData) => void }) {
  const [name, setName] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    onCreateFeat(emptyFeat(name.trim()));
    setName("");
  };

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Нова риса"
      description="Тип, передумови, вміння й вибори — після створення"
      hud
      footer={
        <>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Скасувати
          </Button>
          <Button type="submit" form="create-feat-form" disabled={!name.trim()}>
            Створити рису
          </Button>
        </>
      }
    >
      <form id="create-feat-form" onSubmit={handleSubmit} className="space-y-2">
        <Label htmlFor="new-feat-name">Назва риси *</Label>
        <Input id="new-feat-name" value={name} onChange={(e) => setName(e.target.value)} required placeholder="Наприклад: Пильний" />
      </form>
    </ResponsiveDialog>
  );
}
```

- [ ] **Step 5: Pages and navigation** — `app/campaigns/[id]/dm/feats/page.tsx`:

```tsx
import { DMFeatsPageClient } from "./page-client";

import { requireCampaignDM } from "@/lib/server/campaigns/access";

export default async function DMFeatsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  await requireCampaignDM(id);

  return <DMFeatsPageClient campaignId={id} />;
}
```

`app/campaigns/[id]/dm/feats/page-client.tsx`:

```tsx
"use client";

import { Award, Plus } from "lucide-react";

import { EmptyState, LoadingState } from "@/components/common/states";
import { ContentTransferButtons } from "@/components/content-import/ContentTransferButtons";
import { CreateFeatDialog } from "@/components/feats/CreateFeatDialog";
import { FeatCard } from "@/components/feats/FeatCard";
import { HudChipTabs, HudPage, HudPageHeader } from "@/components/hud/page";
import { Button } from "@/components/ui/button";
import { FEAT_TYPE_LABELS, FEAT_TYPES } from "@/lib/constants/choices";
import { useFeatsList } from "@/lib/hooks/feats";
import { pluralUk } from "@/lib/utils/common/plural";

export function DMFeatsPageClient({ campaignId }: { campaignId: string }) {
  const list = useFeatsList(campaignId);

  const { feats, all, typeFilter } = list;

  return (
    <HudPage>
      <HudPageHeader
        title="Риси"
        subtitle={`${all.length} ${pluralUk(all.length, ["риса", "риси", "рис"])}`}
        actions={
          <>
            <ContentTransferButtons campaignId={campaignId} kind="feats" />
            <Button onClick={() => list.createDialog.setOpen(true)} className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Нова риса
            </Button>
          </>
        }
      />

      {all.length > 0 && (
        <HudChipTabs
          ariaLabel="Тип риси"
          items={[{ key: "all", label: "Усі", active: typeFilter.value === null, onSelect: () => typeFilter.set(null) }, ...FEAT_TYPES.map((t) => ({ key: t, label: FEAT_TYPE_LABELS[t], active: typeFilter.value === t, onSelect: () => typeFilter.set(t) }))]}
        />
      )}

      {list.isLoading && all.length === 0 ? (
        <LoadingState rows={6} label="Завантаження рис…" />
      ) : all.length === 0 ? (
        <EmptyState icon={Award} title="Ще немає рис" description="Створіть першу рису або імпортуйте їх з файлу." />
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {feats.map((feat) => (
            <FeatCard key={feat.id} feat={feat} campaignId={campaignId} onDelete={list.actions.deleteFeat} />
          ))}
        </div>
      )}

      <CreateFeatDialog open={list.createDialog.open} onOpenChange={list.createDialog.setOpen} onCreateFeat={list.actions.createFeat} />
    </HudPage>
  );
}
```

`app/campaigns/[id]/dm/feats/[featId]/page.tsx`:

```tsx
import { redirect } from "next/navigation";

import { FeatForm } from "@/components/feats/FeatForm";
import { prisma } from "@/lib/db";
import { requireCampaignDM } from "@/lib/server/campaigns/access";
import { toFeatData } from "@/lib/utils/feats/row";

export default async function EditFeatPage({ params }: { params: Promise<{ id: string; featId: string }> }) {
  const { id, featId } = await params;

  await requireCampaignDM(id);

  const row = await prisma.feat.findFirst({ where: { id: featId, campaignId: id } });

  if (!row) redirect(`/campaigns/${id}/dm/feats`);

  return <FeatForm campaignId={id} feat={toFeatData(row)} />;
}
```

`app/campaigns/[id]/page.tsx`: `LIBRARY_PATHS` — додати `"feats"`; в `allDmTiles` після плитки «Класи» — `...(classesEnabled ? [{ path: "feats", icon: Award, title: "Риси", subtitle: "Риси 5e: походження, загальні, стилі бою, епічні дари" }] : []),` (імпорт `Award` з `lucide-react`). `components/layout/Breadcrumbs.tsx` — `feats: "Риси",` після `classes`. `components/layout/screen-background.tsx` — `feats: SCREEN_BACKGROUND.races,` у `DM_SECTIONS`.

- [ ] **Step 6: Run tests**

Run: `pnpm test:run lib/hooks/feats components/feats components/layout && pnpm exec tsc --noEmit -p tsconfig.json`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add lib/hooks/feats components/feats "app/campaigns/[id]/dm/feats" "app/campaigns/[id]/page.tsx" components/layout/Breadcrumbs.tsx components/layout/screen-background.tsx
git commit -m "feat(constructor): 4f-4 DM feats page, feat form and campaign tile

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---
### Task 12: UI — пікер виборів (`ChoicePicker`, `ChoicesEditor`), довідники (`useChoiceRefs`), прибирання «осиротілих» піків

**Files:**
- Create: `lib/utils/characters/choices/prune.ts`, `lib/hooks/characters/useChoiceRefs.ts`, `components/choices/ChoicePicker.tsx`, `components/choices/ChoicesEditor.tsx`
- Modify: `lib/hooks/characters/index.ts`
- Test: `lib/utils/characters/choices/__tests__/prune.test.ts`, `components/choices/__tests__/ChoicePicker.test.tsx`, `components/choices/__tests__/ChoicesEditor.test.tsx`

**Interfaces:**
- Consumes: `resolveChoiceCount`, `isChoiceOpen`, `featPrerequisiteMet`, `classChoiceDefs`, `skillFlags`, `skillPicksOf`, `visitPicks`, `ChoiceRefs` (задача 3); `readChoices` (задача 2); `maxSlotLevelFor`, `resolveClassEntries` (`lib/utils/spells/class-slots.ts`); хуки `useRaces`, `useClasses`, `useFeats`, `useSpells`.
- Produces:
  - `prunePicks(state: ChoicesState, refs: ChoiceRefs): { state: ChoicesState; dropped: number }` (без zod) — прибирає піки невідомих виборів, опцій, рис і заклинань (на один рівень вкладеності).
  - `useChoiceRefs(campaignId, raceName, opts?: { enabled?: boolean }) → ChoiceRefs & { ready: boolean; feats: FeatData[]; spells: SpellRef[] }`.
  - `interface PickerContext { level; totalLevel; columns?; maxSlotLevel; feats: FeatData[]; featsById; spells: SpellRef[]; proficient: ReadonlySet<DndSkill>; scores: Record<AbilityKey, number> }`; `ChoicePicker({ choice, value, onChange, ctx, error? })`.
  - `ChoicesEditor({ state: { data: ChoicesState; set(next: ChoicesState): void }, refs, hero: { level; scores; skills: unknown; classMode: boolean }, issues?: ChoiceIssue[], only?: { classId: string; level: number } })` — секції «Раса», «Риса походження», класи; `only` — лише вибори цього класу на цьому рівні (крок level-up).

- [ ] **Step 1: Write the failing tests**

`lib/utils/characters/choices/__tests__/prune.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { empty, refs, sorcerer } from "./fixtures";

import { prunePicks } from "@/lib/utils/characters/choices/prune";

describe("prunePicks", () => {
  it("drops unknown choices, options, feats and spells; keeps valid picks", () => {
    const { state, dropped } = prunePicks(
      {
        ...empty,
        raceChoices: { "elven-lineage": [{ id: "ghost" }, { id: "drow" }], gone: [{ id: "x" }] },
        classes: [{ classId: sorcerer.id, level: 4, choices: { cantrips: [{ id: "sp-firebolt" }, { id: "sp-deleted" }], "ability-score-improvement-4": [{ id: "f-gone" }] } }],
        feats: [{ id: "f-gone", source: "dm" }, { id: "f-alert", source: "origin" }],
      },
      refs,
    );

    expect(state.raceChoices).toEqual({ "elven-lineage": [{ id: "drow" }] });
    expect(state.classes[0].choices).toEqual({ cantrips: [{ id: "sp-firebolt" }] });
    expect(state.feats).toEqual([{ id: "f-alert", source: "origin" }]);
    expect(dropped).toBe(5);
  });
});
```

`components/choices/__tests__/ChoicePicker.test.tsx`:

```tsx
// @vitest-environment happy-dom
import { useState } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { ChoicePicker, type PickerContext } from "@/components/choices/ChoicePicker";
import { asi, featsById, scores, sorcerer, spells } from "@/lib/utils/characters/choices/__tests__/fixtures";
import type { Choice, ChoicePick } from "@/types/choices";

const ctx = (level: number, extra: Partial<PickerContext> = {}): PickerContext => ({ level, totalLevel: level, columns: sorcerer.columns, maxSlotLevel: 1, feats: Object.values(featsById), featsById, spells, proficient: new Set(), scores, ...extra });

function Harness({ choice, context, initial = [] }: { choice: Choice; context: PickerContext; initial?: ChoicePick[] }) {
  const [value, setValue] = useState<ChoicePick[]>(initial);

  return (
    <>
      <ChoicePicker choice={choice} value={value} onChange={setValue} ctx={context} />
      <output data-testid="json">{JSON.stringify(value)}</output>
    </>
  );
}

const json = () => JSON.parse(screen.getByTestId("json").textContent ?? "[]") as ChoicePick[];

const choiceById = (id: string) => sorcerer.features.flatMap((f) => f.choices ?? []).find((c) => c.id === id)!;

describe("ChoicePicker", () => {
  afterEach(cleanup);

  it("options: counter, min level reason, requires reason", () => {
    render(<Harness choice={choiceById("metamagic")} context={ctx(2)} />);

    expect(screen.getByText("0 / 2")).toBeTruthy();
    expect(screen.getByText("З рівня 3")).toBeTruthy();
    fireEvent.click(screen.getByRole("checkbox", { name: /Quickened Spell/ }));

    expect(json()).toEqual([{ id: "quickened" }]);
    expect(screen.getByRole("checkbox", { name: /Empowered Spell/ }).hasAttribute("disabled")).toBe(true);
  });

  it("ability score: +1 buttons with preview and the cap", () => {
    const choice = asi.choices[0];

    render(<Harness choice={choice} context={ctx(4, { scores: { ...scores, charisma: 19 } })} />);

    fireEvent.click(screen.getByRole("button", { name: "+1 Сила" }));
    fireEvent.click(screen.getByRole("button", { name: "+1 Сила" }));

    expect(screen.getByText("15 → 17")).toBeTruthy();
    expect(json()).toEqual([{ id: "strength" }, { id: "strength" }]);

    fireEvent.click(screen.getByRole("button", { name: "−1 Сила" }));
    fireEvent.click(screen.getByRole("button", { name: "+1 Харизма" }));

    expect(screen.getByRole("button", { name: "+1 Харизма" }).hasAttribute("disabled")).toBe(true);
  });

  it("spells: only the list and circles in range, counter", () => {
    render(<Harness choice={choiceById("prepared-spells")} context={ctx(1)} />);

    expect(screen.queryByRole("checkbox", { name: /Cure Wounds/ })).toBeNull();
    expect(screen.queryByRole("checkbox", { name: /Fireball/ })).toBeNull();
    fireEvent.click(screen.getByRole("checkbox", { name: /Magic Missile/ }));

    expect(screen.getByText("1 / 2")).toBeTruthy();
  });

  it("feat: types filter, nested choices of the picked feat", () => {
    render(<Harness choice={choiceById("ability-score-improvement-4")} context={ctx(4)} />);

    expect(screen.queryByRole("radio", { name: /Archery/ })).toBeNull();
    fireEvent.click(screen.getByRole("radio", { name: /Ability Score Improvement/ }));
    fireEvent.click(screen.getByRole("button", { name: "+1 Спритність" }));

    expect(json()).toEqual([{ id: "f-asi", picks: { asi: [{ id: "dexterity" }] } }]);
  });
});
```

(Підписи характеристик у кнопках — `ABILITY_LABELS` з `@/lib/constants/abilities`; якщо там «Сила»/«Спритність»/«Харизма» інакше — брати значення з констант у самому тесті через `ABILITY_LABELS.strength` тощо.)

`components/choices/__tests__/ChoicesEditor.test.tsx`:

```tsx
// @vitest-environment happy-dom
import { useState } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { ChoicesEditor } from "@/components/choices/ChoicesEditor";
import { empty, featsById, refs, scores, sorcerer, spells } from "@/lib/utils/characters/choices/__tests__/fixtures";
import type { ChoicesState } from "@/types/choices";

const view = { ...refs, ready: true, feats: Object.values(featsById), spells };

function Harness({ initial, classMode, level = 1 }: { initial: ChoicesState; classMode: boolean; level?: number }) {
  const [data, set] = useState<ChoicesState>(initial);

  return (
    <>
      <ChoicesEditor state={{ data, set }} refs={view} hero={{ level, scores, skills: {}, classMode }} issues={[{ path: "raceChoices.keen-senses", code: "SKILL_NOT_ALLOWED", message: "Навичка не входить у список вибору" }]} />
      <output data-testid="json">{JSON.stringify(data)}</output>
    </>
  );
}

const json = () => JSON.parse(screen.getByTestId("json").textContent ?? "{}") as ChoicesState;

describe("ChoicesEditor", () => {
  afterEach(cleanup);

  it("race section without class mode; server issue under its choice", () => {
    render(<Harness initial={empty} classMode={false} />);

    expect(screen.getByRole("heading", { name: "Раса: Elf" })).toBeTruthy();
    expect(screen.queryByRole("heading", { name: "Риса походження" })).toBeNull();
    fireEvent.click(screen.getByRole("checkbox", { name: /Wood Elf/ }));

    expect(json().raceChoices).toEqual({ "elven-lineage": [{ id: "wood-elf" }] });
    expect(screen.getByText("Навичка не входить у список вибору")).toBeTruthy();
  });

  it("class mode: origin feat and class sections", () => {
    render(<Harness initial={{ ...empty, classes: [{ classId: sorcerer.id, level: 1 }] }} classMode />);

    fireEvent.click(screen.getByRole("radio", { name: /Alert/ }));

    expect(json().feats).toEqual([{ id: "f-alert", source: "origin" }]);
    expect(screen.getByRole("heading", { name: "Sorcerer 1" })).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm test:run lib/utils/characters/choices/__tests__/prune.test.ts components/choices`
Expected: FAIL (нові тести; тести задачі 10 у `components/choices` лишаються зеленими).

- [ ] **Step 3: `prune.ts`**

```ts
import { classChoiceDefs } from "@/lib/utils/characters/choices/class-choices";
import type { ChoiceRefs } from "@/lib/utils/characters/choices/walk";
import type { Choice, ChoicePick, ChoicesState, Picks } from "@/types/choices";

function known(choice: Choice, pick: ChoicePick, refs: ChoiceRefs): boolean {
  if (choice.kind === "option") return !!choice.options?.some((o) => o.id === pick.id);

  if (choice.kind === "feat") return !!refs.featsById[pick.id] || !!choice.options?.some((o) => o.id === pick.id);

  if (choice.kind === "spell") return !!refs.spellsById[pick.id];

  return true;
}

function prune(defs: readonly Choice[], picks: Picks, refs: ChoiceRefs, count: { n: number }, nested: boolean): Picks {
  const byId = new Map(defs.map((c) => [c.id, c]));

  return Object.fromEntries(
    Object.entries(picks).flatMap(([id, list]) => {
      const choice = byId.get(id);

      if (!choice) {
        count.n += list.length;

        return [];
      }

      const kept = list.flatMap((p) => {
        if (!known(choice, p, refs)) {
          count.n += 1;

          return [];
        }

        const feat = choice.kind === "feat" && nested ? refs.featsById[p.id] : undefined;

        return [feat && p.picks ? { ...p, picks: prune(feat.choices, p.picks, refs, count, false) } : p];
      });

      return kept.length > 0 ? [[id, kept]] : [];
    }),
  );
}

export function prunePicks(state: ChoicesState, refs: ChoiceRefs): { state: ChoicesState; dropped: number } {
  const count = { n: 0 };

  const raceChoices = prune(refs.race?.choices ?? [], state.raceChoices, refs, count, true);

  const classes = state.classes.map((e) => {
    const cls = refs.classesById[e.classId];

    if (!cls || !e.choices) return e;

    const picks = prune(classChoiceDefs(cls, cls.subclasses.find((s) => s.id === e.subclassId) ?? null), e.choices, refs, count, true);

    return Object.keys(picks).length > 0 ? { ...e, choices: picks } : { classId: e.classId, level: e.level, ...(e.subclassId && { subclassId: e.subclassId }) };
  });

  const feats = state.feats.flatMap((f) => {
    const feat = refs.featsById[f.id];

    if (!feat) {
      count.n += 1;

      return [];
    }

    return [f.picks ? { ...f, picks: prune(feat.choices, f.picks, refs, count, false) } : f];
  });

  return { state: { raceChoices, feats, classes }, dropped: count.n };
}
```

(Рахунок у тесті: `ghost`, `gone/x`, `sp-deleted`, `f-gone` у класі, `f-gone` у `feats` — 5.)

- [ ] **Step 4: `useChoiceRefs.ts`**

```ts
"use client";

import { useMemo } from "react";

import { useClasses } from "@/lib/hooks/classes";
import { useFeats } from "@/lib/hooks/feats";
import { useRaces } from "@/lib/hooks/races";
import { useSpells } from "@/lib/hooks/spells";
import { readChoices } from "@/lib/utils/characters/choices/read";
import type { ChoiceRefs } from "@/lib/utils/characters/choices/walk";
import { classesById } from "@/lib/utils/characters/classes";
import type { FeatData, SpellRef } from "@/types/choices";

export type ChoiceRefsView = ChoiceRefs & { ready: boolean; feats: FeatData[]; spells: SpellRef[] };

export function useChoiceRefs(campaignId: string, raceName: string, opts: { enabled?: boolean } = {}): ChoiceRefsView {
  const enabled = opts.enabled ?? true;

  const races = useRaces(campaignId, { enabled });

  const classes = useClasses(campaignId, { enabled });

  const feats = useFeats(campaignId, { enabled });

  const spells = useSpells(campaignId, { enabled });

  return useMemo(() => {
    const row = races.data?.find((r) => r.name === raceName);

    const choices = readChoices((row as { choices?: unknown } | undefined)?.choices);

    const spellRefs: SpellRef[] = (spells.data ?? []).map((s) => ({ id: s.id, name: s.name, level: s.level, lists: s.lists ?? [] }));

    return {
      ready: !!races.data && !!classes.data && !!feats.data && !!spells.data,
      race: row && choices.length > 0 ? { id: row.id, name: row.name, choices } : null,
      classesById: classesById(classes.data ?? []),
      featsById: Object.fromEntries((feats.data ?? []).map((f) => [f.id, f])),
      spellsById: Object.fromEntries(spellRefs.map((s) => [s.id, s])),
      feats: feats.data ?? [],
      spells: spellRefs,
    };
  }, [races.data, classes.data, feats.data, spells.data, raceName]);
}
```

`lib/hooks/characters/index.ts` — `export { type ChoiceRefsView, useChoiceRefs } from "./useChoiceRefs";`.

- [ ] **Step 5: `ChoicePicker.tsx`**

```tsx
"use client";

import { ABILITY_KEYS, ABILITY_LABELS, type AbilityKey } from "@/lib/constants/abilities";
import { FEAT_TYPE_LABELS } from "@/lib/constants/choices";
import { DND_SKILL_META, DND_SKILLS, type DndSkill } from "@/lib/constants/skills";
import { resolveChoiceCount } from "@/lib/utils/characters/choices/count";
import { featPrerequisiteMet } from "@/lib/utils/characters/choices/validate";
import type { Choice, ChoicePick, FeatData, Picks, SpellRef } from "@/types/choices";
import type { ClassColumn } from "@/types/classes";

export interface PickerContext {
  level: number;
  totalLevel: number;
  columns?: readonly ClassColumn[];
  maxSlotLevel: number;
  feats: FeatData[];
  featsById: Readonly<Record<string, FeatData>>;
  spells: SpellRef[];
  proficient: ReadonlySet<DndSkill>;
  scores: Record<AbilityKey, number>;
}

interface ChoicePickerProps {
  choice: Choice;
  value: ChoicePick[];
  onChange: (next: ChoicePick[]) => void;
  ctx: PickerContext;
  error?: string;
}

const CARD = "flex w-full items-start gap-2 rounded-md border border-hud-line/50 p-2 text-left text-sm aria-checked:border-hud-gold disabled:opacity-50";

function Card({ role, checked, disabled, onClick, title, note }: { role: "checkbox" | "radio"; checked: boolean; disabled?: boolean; onClick: () => void; title: string; note?: string }) {
  return (
    <button type="button" role={role} aria-checked={checked} disabled={disabled} onClick={onClick} className={CARD}>
      <span className="flex-1">
        <span className="block text-hud-ink">{title}</span>
        {note && <span className="block text-xs text-hud-muted">{note}</span>}
      </span>
    </button>
  );
}

export function ChoicePicker({ choice, value, onChange, ctx, error }: ChoicePickerProps) {
  const target = resolveChoiceCount(choice, ctx.level, ctx.columns);

  const ids = value.map((p) => p.id);

  const toggle = (id: string, extra?: Partial<ChoicePick>) => {
    if (ids.includes(id)) return onChange(value.filter((p) => p.id !== id));

    if (target === 1) return onChange([{ id, ...extra }]);

    if (value.length < target) onChange([...value, { id, ...extra }]);
  };

  const header = (
    <div className="flex items-baseline justify-between gap-2">
      <span className="hud-sc text-sm text-hud-ink">{choice.label}</span>
      <span className="text-xs text-hud-muted">{`${value.length} / ${target}`}</span>
    </div>
  );

  return (
    <div className="space-y-2">
      {header}
      {choice.description && <p className="whitespace-pre-line text-xs text-hud-muted">{choice.description}</p>}
      {choice.kind === "option" && <OptionCards choice={choice} ids={ids} level={ctx.level} onToggle={toggle} />}
      {choice.kind === "feat" && <FeatList choice={choice} value={value} onChange={onChange} ctx={ctx} />}
      {(choice.kind === "skill" || choice.kind === "expertise") && (
        <div className="flex flex-wrap gap-2">
          {(choice.skills?.length ? choice.skills : DND_SKILLS).map((s) => (
            <Card key={s} role="checkbox" checked={ids.includes(s)} disabled={choice.kind === "expertise" && !ctx.proficient.has(s)} onClick={() => toggle(s)} title={DND_SKILL_META[s].label} />
          ))}
        </div>
      )}
      {choice.kind === "abilityScore" && <AbilityPoints choice={choice} value={value} onChange={onChange} scores={ctx.scores} />}
      {choice.kind === "spell" && <SpellList choice={choice} ids={ids} ctx={ctx} onToggle={toggle} />}
      {value.some((p) => !isKnown(choice, p, ctx)) && <p className="text-xs text-hud-danger">Вибір не знайдено — буде прибрано при збереженні</p>}
      {error && (
        <p role="alert" className="text-xs text-hud-danger">
          {error}
        </p>
      )}
    </div>
  );
}

function isKnown(choice: Choice, p: ChoicePick, ctx: PickerContext) {
  if (choice.kind === "option") return !!choice.options?.some((o) => o.id === p.id);

  if (choice.kind === "feat") return !!ctx.featsById[p.id] || !!choice.options?.some((o) => o.id === p.id);

  if (choice.kind === "spell") return ctx.spells.some((s) => s.id === p.id);

  return true;
}

function OptionCards({ choice, ids, level, onToggle }: { choice: Choice; ids: string[]; level: number; onToggle: (id: string) => void }) {
  const names = new Map((choice.options ?? []).map((o) => [o.id, o.name]));

  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {(choice.options ?? []).map((o) => {
        const missing = (o.requires ?? []).filter((r) => !ids.includes(r));

        const reason = o.minLevel && o.minLevel > level ? `З рівня ${o.minLevel}` : missing.length > 0 ? `Потребує: ${missing.map((r) => names.get(r) ?? r).join(", ")}` : undefined;

        return <Card key={o.id} role="checkbox" checked={ids.includes(o.id)} disabled={!!reason && !ids.includes(o.id)} onClick={() => onToggle(o.id)} title={o.name} note={reason ?? o.description?.slice(0, 160)} />;
      })}
    </div>
  );
}

function FeatList({ choice, value, onChange, ctx }: { choice: Choice; value: ChoicePick[]; onChange: (next: ChoicePick[]) => void; ctx: PickerContext }) {
  const target = resolveChoiceCount(choice, ctx.level, ctx.columns);

  const feats = ctx.feats.filter((f) => (choice.featTypes ?? []).includes(f.type));

  const pick = (id: string) => onChange(value.some((p) => p.id === id) ? value.filter((p) => p.id !== id) : target === 1 ? [{ id }] : value.length < target ? [...value, { id }] : value);

  const setNested = (id: string, picks: Picks) => onChange(value.map((p) => (p.id === id ? { ...p, picks } : p)));

  return (
    <div className="space-y-2">
      {(choice.options ?? []).map((o) => (
        <Card key={o.id} role="radio" checked={value.some((p) => p.id === o.id)} onClick={() => pick(o.id)} title={o.name} note={o.description?.slice(0, 160)} />
      ))}
      {feats.map((f) => {
        const met = featPrerequisiteMet(f, ctx);

        const picked = value.find((p) => p.id === f.id);

        return (
          <div key={f.id} className="space-y-2">
            <Card role="radio" checked={!!picked} disabled={!met && !picked} onClick={() => pick(f.id)} title={f.name} note={`${FEAT_TYPE_LABELS[f.type]}${f.prerequisite.level ? ` · рівень ${f.prerequisite.level}+` : ""}${met ? "" : " · передумови не виконано"}`} />
            {picked && f.choices.length > 0 && (
              <div className="ml-4 space-y-3 border-l border-hud-line/40 pl-3">
                {f.choices.map((c) => (
                  <ChoicePicker key={c.id} choice={c} value={picked.picks?.[c.id] ?? []} onChange={(list) => setNested(f.id, { ...(picked.picks ?? {}), [c.id]: list })} ctx={{ ...ctx, level: ctx.totalLevel, columns: [] }} />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function AbilityPoints({ choice, value, onChange, scores }: { choice: Choice; value: ChoicePick[]; onChange: (next: ChoicePick[]) => void; scores: Record<AbilityKey, number> }) {
  const points = choice.points ?? 1;

  const max = choice.max ?? 20;

  const allowed = choice.abilities?.length ? choice.abilities : ABILITY_KEYS;

  return (
    <div className="space-y-1">
      {allowed.map((a) => {
        const added = value.filter((p) => p.id === a).length;

        const after = scores[a] + added;

        return (
          <div key={a} className="flex items-center gap-2 text-sm">
            <span className="w-28">{ABILITY_LABELS[a]}</span>
            <button type="button" aria-label={`−1 ${ABILITY_LABELS[a]}`} disabled={added === 0} onClick={() => onChange(value.filter((p, i) => !(p.id === a && i === value.map((x) => x.id).lastIndexOf(a))))} className="rounded border border-hud-line/50 px-2 disabled:opacity-40">
              −
            </button>
            <button type="button" aria-label={`+1 ${ABILITY_LABELS[a]}`} disabled={value.length >= points || after + 1 > max} onClick={() => onChange([...value, { id: a }])} className="rounded border border-hud-line/50 px-2 disabled:opacity-40">
              +
            </button>
            {added > 0 && <span className="text-xs text-hud-muted">{`${scores[a]} → ${after}`}</span>}
          </div>
        );
      })}
    </div>
  );
}

function SpellList({ choice, ids, ctx, onToggle }: { choice: Choice; ids: string[]; ctx: PickerContext; onToggle: (id: string) => void }) {
  const rule = choice.spells;

  if (!rule) return null;

  const max = rule.maxLevel === "slots" ? ctx.maxSlotLevel : rule.maxLevel;

  const shown = ctx.spells.filter((s) => s.level >= rule.minLevel && s.level <= max && (rule.lists.length === 0 || s.lists.some((l) => rule.lists.includes(l))));

  return (
    <div className="grid max-h-72 gap-1 overflow-y-auto sm:grid-cols-2">
      {shown.map((s) => (
        <Card key={s.id} role="checkbox" checked={ids.includes(s.id)} onClick={() => onToggle(s.id)} title={s.name} note={s.level === 0 ? "Замовляння" : `Коло ${s.level}`} />
      ))}
      {shown.length === 0 && <p className="text-xs text-hud-muted">У списках {rule.lists.join(", ") || "—"} немає заклинань потрібних кіл</p>}
    </div>
  );
}
```

(Кнопка `Card` має `role="checkbox"`/`"radio"` і доступне ім'я з тексту — тести шукають `getByRole("checkbox", { name: /Quickened Spell/ })`.)

- [ ] **Step 6: `ChoicesEditor.tsx`**

```tsx
"use client";

import { type PickerContext, ChoicePicker } from "./ChoicePicker";

import { HudSection } from "@/components/hud/form";
import type { AbilityKey } from "@/lib/constants/abilities";
import type { ChoiceRefsView } from "@/lib/hooks/characters";
import { classChoiceDefs } from "@/lib/utils/characters/choices/class-choices";
import { isChoiceOpen } from "@/lib/utils/characters/choices/count";
import { skillFlags, skillPicksOf, visitPicks } from "@/lib/utils/characters/choices/walk";
import { maxSlotLevelFor } from "@/lib/utils/spells/class-slots";
import type { Choice, ChoiceIssue, ChoicePick, ChoicesState, Picks } from "@/types/choices";

interface ChoicesEditorProps {
  state: { data: ChoicesState; set: (next: ChoicesState) => void };
  refs: ChoiceRefsView;
  hero: { level: number; scores: Record<AbilityKey, number>; skills: unknown; classMode: boolean };
  issues?: ChoiceIssue[];
  only?: { classId: string; level: number };
}

const issueFor = (issues: ChoiceIssue[] | undefined, path: string) => issues?.find((i) => i.path === path || i.path.startsWith(`${path}.`))?.message;

export function ChoicesEditor({ state: { data, set }, refs, hero, issues, only }: ChoicesEditorProps) {
  const visits = visitPicks(data, refs, { level: hero.level, classMode: hero.classMode });

  const base: Omit<PickerContext, "level" | "columns" | "maxSlotLevel"> = {
    totalLevel: hero.level,
    feats: refs.feats,
    featsById: refs.featsById,
    spells: refs.spells,
    proficient: new Set([...skillFlags(hero.skills), ...skillPicksOf(visits, "skill")]),
    scores: hero.scores,
  };

  const pickers = (defs: readonly Choice[], picks: Picks, ctx: PickerContext, path: string, onPicks: (next: Picks) => void, filter: (c: Choice) => boolean) =>
    defs.filter(filter).map((c) => (
      <ChoicePicker key={c.id} choice={c} value={picks[c.id] ?? []} onChange={(list: ChoicePick[]) => onPicks({ ...picks, [c.id]: list })} ctx={ctx} error={issueFor(issues, `${path}.${c.id}`)} />
    ));

  const raceDefs = refs.race?.choices ?? [];

  const originFeats = refs.feats.filter((f) => f.type === "origin");

  const origin = data.feats.find((f) => f.source === "origin");

  return (
    <div className="space-y-4">
      {!only && raceDefs.length > 0 && (
        <HudSection title={`Раса: ${refs.race?.name}`}>
          <div className="space-y-4">
            {pickers(raceDefs, data.raceChoices, { ...base, level: hero.level, maxSlotLevel: 0 }, "raceChoices", (raceChoices) => set({ ...data, raceChoices }), (c) => isChoiceOpen(c, hero.level, "race"))}
          </div>
        </HudSection>
      )}

      {!only && hero.classMode && originFeats.length > 0 && (
        <HudSection title="Риса походження">
          <ChoicePicker
            choice={{ id: "origin", label: "Риса походження", level: 1, count: 1, kind: "feat", featTypes: ["origin"] }}
            value={origin ? [{ id: origin.id, ...(origin.picks && { picks: origin.picks }) }] : []}
            onChange={(list) => set({ ...data, feats: [...data.feats.filter((f) => f.source !== "origin"), ...list.map((p) => ({ id: p.id, source: "origin" as const, ...(p.picks && { picks: p.picks }) }))] })}
            ctx={{ ...base, level: hero.level, maxSlotLevel: 0 }}
            error={issueFor(issues, "feats")}
          />
        </HudSection>
      )}

      {hero.classMode &&
        data.classes
          .filter((e) => !only || e.classId === only.classId)
          .map((entry) => {
            const cls = refs.classesById[entry.classId];

            if (!cls) return null;

            const subclass = cls.subclasses.find((s) => s.id === entry.subclassId) ?? null;

            const defs = classChoiceDefs(cls, subclass);

            const ctx: PickerContext = { ...base, level: entry.level, columns: cls.columns ?? [], maxSlotLevel: maxSlotLevelFor({ ...entry, class: cls, subclass }) };

            const setPicks = (choices: Picks) => set({ ...data, classes: data.classes.map((e) => (e.classId === entry.classId ? { ...e, choices } : e)) });

            const filter = only ? (c: Choice) => c.level <= only.level && (c.level === only.level || typeof c.count !== "number") : (c: Choice) => isChoiceOpen(c, entry.level, "class");

            const list = pickers(defs, entry.choices ?? {}, ctx, `classes.${entry.classId}`, setPicks, filter);

            return list.length > 0 ? (
              <HudSection key={entry.classId} title={`${cls.name} ${entry.level}`}>
                <div className="space-y-4">{list}</div>
              </HudSection>
            ) : null;
          })}
    </div>
  );
}
```

(`only` — для кроку level-up: вибори піднятого класу, що відкриваються на цьому рівні, і вибори з кількістю «з таблиці», що могли зрости.)

- [ ] **Step 7: Run tests**

Run: `pnpm test:run lib/utils/characters/choices components/choices lib/hooks/characters && pnpm exec tsc --noEmit -p tsconfig.json`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add lib/utils/characters/choices/prune.ts lib/utils/characters/choices/__tests__/prune.test.ts lib/hooks/characters/useChoiceRefs.ts lib/hooks/characters/index.ts components/choices/ChoicePicker.tsx components/choices/ChoicesEditor.tsx components/choices/__tests__/ChoicePicker.test.tsx components/choices/__tests__/ChoicesEditor.test.tsx
git commit -m "feat(constructor): 4f-4 choice picker, choices editor and orphan pruning

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---
### Task 13: UI — вкладка «Вибори» у формі персонажа (створення ДМ, редактор ДМ, чернетка гравця)

**Files:**
- Create: `components/choices/CharacterChoicesTab.tsx`, `components/choices/CharacterChoicesPanel.tsx`
- Modify: `lib/utils/characters/choices/picks.ts`, `components/characters/character-form-tabs.ts`, `components/characters/NewCharacterForm.tsx`, `components/character-profile/ProfileTabs.tsx`, `components/character-profile/ProfileEditor.tsx`, `lib/hooks/characters/usePlayerDraftForm.ts`, `components/characters/player-draft/PlayerDraftForm.tsx`
- Test: `lib/utils/characters/choices/__tests__/draft-picks.test.ts`, `components/choices/__tests__/CharacterChoicesPanel.test.tsx`, `components/choices/__tests__/CharacterChoicesTab.test.tsx`

**Interfaces:**
- Consumes: `ChoicesEditor`, `useChoiceRefs`, `prunePicks` (задача 12); `useCharacterChoices` (задача 6); `CharacterFormData.choices`, `DraftInput.choices` (задача 1); `mergeLevelUpIntoForm` через `editor.dmActions.applyClassLevelUp` (наявне).
- Produces:
  - `picks.ts`: `draftChoicesState(choices: DraftInput["choices"], classId: string | undefined): ChoicesState`, `stateDraftChoices(state: ChoicesState): NonNullable<DraftInput["choices"]>`, `choicesBodyOf(state: ChoicesState): ChoicesBody`.
  - `CHARACTER_FORM_TAB.choices = "choices"`; `ProfileTabId` + `"choices"`.
  - `CharacterChoicesTab({ campaignId, form: { data: CharacterFormData; set }, classesEnabled: boolean })` — керована вкладка створення (пише `formData.choices` і `basicInfo.classes[].choices`).
  - `CharacterChoicesPanel({ campaignId, characterId, initial: ChoicesState, hero: { race: string; level: number; scores; skills: unknown; classMode: boolean }, onSaved? })` — панель з власною кнопкою «Зберегти вибори» (`PUT …/choices`, прибирає «осиротілі» піки перед відправкою).
  - Чернетка гравця: `usePlayerDraftForm` → `choices: { data: ChoicesState; set(next: ChoicesState): void; enabled: boolean }`; секція «Вибори» у `PlayerDraftForm`.

- [ ] **Step 1: Write the failing tests**

`lib/utils/characters/choices/__tests__/draft-picks.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { choicesBodyOf, draftChoicesState, stateDraftChoices } from "@/lib/utils/characters/choices/picks";

describe("draft and body mapping", () => {
  it("draft choices ↔ state with the starting class at level 1", () => {
    const state = draftChoicesState({ raceChoices: { l: [{ id: "drow" }] }, classChoices: { cantrips: [{ id: "x" }] } }, "wiz");

    expect(state).toEqual({ raceChoices: { l: [{ id: "drow" }] }, feats: [], classes: [{ classId: "wiz", level: 1, choices: { cantrips: [{ id: "x" }] } }] });
    expect(stateDraftChoices(state)).toEqual({ raceChoices: { l: [{ id: "drow" }] }, feats: [], classChoices: { cantrips: [{ id: "x" }] } });
    expect(draftChoicesState(undefined, undefined)).toEqual({ raceChoices: {}, feats: [], classes: [] });
  });

  it("body carries every class' picks", () => {
    expect(choicesBodyOf({ raceChoices: {}, feats: [], classes: [{ classId: "a", level: 2, choices: { m: [{ id: "q" }] } }, { classId: "b", level: 1 }] })).toEqual({
      raceChoices: {},
      feats: [],
      classChoices: { a: { m: [{ id: "q" }] }, b: {} },
    });
  });
});
```

`components/choices/__tests__/CharacterChoicesPanel.test.tsx`:

```tsx
// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { CharacterChoicesPanel } from "@/components/choices/CharacterChoicesPanel";
import { featsById, refs, scores, spells } from "@/lib/utils/characters/choices/__tests__/fixtures";

const save = vi.fn().mockResolvedValue(true);

vi.mock("@/lib/hooks/characters", () => ({
  useChoiceRefs: () => ({ ...refs, ready: true, feats: Object.values(featsById), spells }),
  useCharacterChoices: () => ({ save, isPending: false, error: null, issues: [], clear: vi.fn() }),
}));

describe("CharacterChoicesPanel", () => {
  afterEach(() => {
    cleanup();
    save.mockClear();
  });

  it("saves the pruned picks through the choices route", async () => {
    render(<CharacterChoicesPanel campaignId="c1" characterId="h1" initial={{ raceChoices: { "elven-lineage": [{ id: "ghost" }] }, feats: [], classes: [] }} hero={{ race: "Elf", level: 1, scores, skills: {}, classMode: false }} />);

    expect(screen.getByText("Вибір не знайдено — буде прибрано при збереженні")).toBeTruthy();
    fireEvent.click(screen.getByRole("checkbox", { name: /Drow/ }));
    fireEvent.click(screen.getByRole("button", { name: "Зберегти вибори" }));

    await waitFor(() => expect(save).toHaveBeenCalledWith({ raceChoices: { "elven-lineage": [{ id: "drow" }] }, feats: [], classChoices: {} }));
  });
});
```

(Клік по «Drow» при `count: 1` замінює пік «ghost» на `drow` — `toggle` у `ChoicePicker` для `target === 1`; прибирання нічого не відкидає, але перевіряється, що `ghost` не потрапляє в тіло.)

`components/choices/__tests__/CharacterChoicesTab.test.tsx`:

```tsx
// @vitest-environment happy-dom
import { useState } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { CharacterChoicesTab } from "@/components/choices/CharacterChoicesTab";
import { featsById, refs, spells, sorcerer } from "@/lib/utils/characters/choices/__tests__/fixtures";
import { defaultCharacterFormData } from "@/lib/utils/characters/form/defaults";
import type { CharacterFormData } from "@/types/characters";

vi.mock("@/lib/hooks/characters", () => ({ useChoiceRefs: () => ({ ...refs, ready: true, feats: Object.values(featsById), spells }) }));

function Harness() {
  const [data, set] = useState<CharacterFormData>({ ...defaultCharacterFormData, basicInfo: { ...defaultCharacterFormData.basicInfo, race: "Elf", classes: [{ classId: sorcerer.id, level: 1 }] } });

  return (
    <>
      <CharacterChoicesTab campaignId="c1" form={{ data, set }} classesEnabled />
      <output data-testid="json">{JSON.stringify({ choices: data.choices, classes: data.basicInfo.classes })}</output>
    </>
  );
}

describe("CharacterChoicesTab", () => {
  afterEach(cleanup);

  it("writes race picks and the origin feat into formData.choices, class picks into basicInfo.classes", () => {
    render(<Harness />);

    fireEvent.click(screen.getByRole("checkbox", { name: /Wood Elf/ }));
    fireEvent.click(screen.getByRole("radio", { name: /Alert/ }));
    fireEvent.click(screen.getByRole("checkbox", { name: /Fire Bolt/ }));

    const out = JSON.parse(screen.getByTestId("json").textContent ?? "{}");

    expect(out.choices).toEqual({ raceChoices: { "elven-lineage": [{ id: "wood-elf" }] }, feats: [{ id: "f-alert", source: "origin" }] });
    expect(out.classes).toEqual([{ classId: sorcerer.id, level: 1, choices: { cantrips: [{ id: "sp-firebolt" }] } }]);
  });
});
```

(`defaultCharacterFormData` — наявний експорт `lib/utils/characters/form/defaults.ts`; якщо назва інша — взяти ту, яку імпортує `useCharacterForm`.)

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm test:run lib/utils/characters/choices/__tests__/draft-picks.test.ts components/choices/__tests__/CharacterChoicesPanel.test.tsx components/choices/__tests__/CharacterChoicesTab.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Mapping** — у `lib/utils/characters/choices/picks.ts` дописати (імпорти `ChoicesBody` з `@/types/choices`, `DraftInput` з `@/types/characters` — `import type`):

```ts
export const draftChoicesState = (choices: DraftInput["choices"], classId: string | undefined): ChoicesState => ({
  raceChoices: choices?.raceChoices ?? {},
  feats: choices?.feats ?? [],
  classes: classId ? [{ classId, level: 1, ...(choices?.classChoices && { choices: choices.classChoices }) }] : [],
});

export const stateDraftChoices = (state: ChoicesState): NonNullable<DraftInput["choices"]> => ({
  raceChoices: state.raceChoices,
  feats: state.feats,
  ...(state.classes[0]?.choices && { classChoices: state.classes[0].choices }),
});

export const choicesBodyOf = (state: ChoicesState): ChoicesBody => ({
  raceChoices: state.raceChoices,
  feats: state.feats,
  classChoices: Object.fromEntries(state.classes.map((e) => [e.classId, e.choices ?? {}])),
});
```

- [ ] **Step 4: `CharacterChoicesTab.tsx`**

```tsx
"use client";

import { ChoicesEditor } from "./ChoicesEditor";

import { LoadingState } from "@/components/common/states";
import { ABILITY_KEYS, type AbilityKey } from "@/lib/constants/abilities";
import { useChoiceRefs } from "@/lib/hooks/characters";
import type { CharacterFormData } from "@/types/characters";
import type { ChoicesState } from "@/types/choices";

interface CharacterChoicesTabProps {
  campaignId: string;
  form: { data: CharacterFormData; set: React.Dispatch<React.SetStateAction<CharacterFormData>> };
  classesEnabled: boolean;
}

export function CharacterChoicesTab({ campaignId, form: { data, set }, classesEnabled }: CharacterChoicesTabProps) {
  const refs = useChoiceRefs(campaignId, data.basicInfo.race);

  const classes = (data.basicInfo.classes ?? []).filter((e) => e.classId);

  const state: ChoicesState = { raceChoices: data.choices?.raceChoices ?? {}, feats: data.choices?.feats ?? [], classes };

  const scores = Object.fromEntries(ABILITY_KEYS.map((k) => [k, data.abilityScores[k]])) as Record<AbilityKey, number>;

  if (!refs.ready) return <LoadingState rows={3} label="Завантаження виборів…" />;

  return (
    <ChoicesEditor
      state={{ data: state, set: (next) => set((prev) => ({ ...prev, choices: { raceChoices: next.raceChoices, feats: next.feats }, basicInfo: { ...prev.basicInfo, classes: next.classes } })) }}
      refs={refs}
      hero={{ level: data.basicInfo.level, scores, skills: data.skills.skills, classMode: classesEnabled && classes.length > 0 }}
    />
  );
}
```

- [ ] **Step 5: `CharacterChoicesPanel.tsx`**

```tsx
"use client";

import { useState } from "react";

import { ChoicesEditor } from "./ChoicesEditor";

import { LoadingState } from "@/components/common/states";
import { Button } from "@/components/ui/button";
import type { AbilityKey } from "@/lib/constants/abilities";
import { useCharacterChoices, useChoiceRefs } from "@/lib/hooks/characters";
import { choicesBodyOf } from "@/lib/utils/characters/choices/picks";
import { prunePicks } from "@/lib/utils/characters/choices/prune";
import type { Character } from "@/types/characters";
import type { ChoicesState } from "@/types/choices";

interface CharacterChoicesPanelProps {
  campaignId: string;
  characterId: string;
  initial: ChoicesState;
  hero: { race: string; level: number; scores: Record<AbilityKey, number>; skills: unknown; classMode: boolean };
  onSaved?: (updated: Character) => void;
}

export function CharacterChoicesPanel({ campaignId, characterId, initial, hero, onSaved }: CharacterChoicesPanelProps) {
  const refs = useChoiceRefs(campaignId, hero.race);

  const [data, set] = useState<ChoicesState>(initial);

  const choices = useCharacterChoices({ campaignId, characterId, onSaved });

  if (!refs.ready) return <LoadingState rows={3} label="Завантаження виборів…" />;

  const submit = () => void choices.save(choicesBodyOf(prunePicks(data, refs).state));

  return (
    <div className="space-y-4">
      <ChoicesEditor state={{ data, set }} refs={refs} hero={hero} issues={choices.issues} />
      {choices.error && (
        <p role="alert" className="text-sm text-hud-danger">
          {choices.error}
        </p>
      )}
      <Button type="button" onClick={submit} disabled={choices.isPending}>
        {choices.isPending ? "Збереження..." : "Зберегти вибори"}
      </Button>
    </div>
  );
}
```

- [ ] **Step 6: DM create** — `components/characters/character-form-tabs.ts`: `CHARACTER_FORM_TAB` + `choices: "choices"`. `components/characters/NewCharacterForm.tsx`: з `useCharacterForm` дістати ще `formData` і `actions.setFormData` (`const { formData, actions: { handleSubmit, setFormData }, … } = useCharacterForm(…)`); умову показу брати з уже завантажених `races` (`useRaces`), окремий `useChoiceRefs` тут не потрібен (його викликає сама вкладка). До `tabs` після «Вміння»:

```tsx
    ...(raceHasChoices || heroClassMode
      ? [{ id: CHARACTER_FORM_TAB.choices, label: "Вибори", content: <CharacterChoicesTab campaignId={id} form={{ data: formData, set: setFormData }} classesEnabled={classMode.enabled} /> }]
      : []),
```

де `const raceHasChoices = (races.find((r) => r.name === basicInfo.data.race)?.choices?.length ?? 0) > 0;` і `const heroClassMode = classMode.enabled && (basicInfo.data.classes ?? []).some((e) => e.classId);`. Тіло створення не змінюється: `formDataToCharacter` уже переносить `formData.choices` (задача 7), а `classes[].choices` — у `basicInfo.classes`.

- [ ] **Step 7: DM editor** — `components/character-profile/ProfileTabs.tsx`: `ProfileTabId` + `| "choices"`. `components/character-profile/ProfileEditor.tsx`: імпорт `CharacterChoicesPanel`; після `const { formData, … } = form;`:

```tsx
  const heroClasses = (formData.basicInfo.classes ?? []).filter((e) => e.classId);

  const heroClassMode = classesEnabled && heroClasses.length > 0;

  const showChoices = heroClassMode || !!sheet.choices;
```

і до масиву вкладок після «Вміння»:

```tsx
          ...(showChoices
            ? [
                {
                  id: "choices" as const,
                  label: "Вибори",
                  content: (
                    <CharacterChoicesPanel
                      campaignId={campaignId}
                      characterId={characterId}
                      initial={{ raceChoices: formData.choices?.raceChoices ?? {}, feats: formData.choices?.feats ?? [], classes: heroClasses }}
                      hero={{ race: formData.basicInfo.race, level: formData.basicInfo.level, scores: { strength: abilityScores.data.strength, dexterity: abilityScores.data.dexterity, constitution: abilityScores.data.constitution, intelligence: abilityScores.data.intelligence, wisdom: abilityScores.data.wisdom, charisma: abilityScores.data.charisma }, skills: skills.data.skills, classMode: heroClassMode }}
                      onSaved={editor.dmActions.applyClassLevelUp}
                    />
                  ),
                },
              ]
            : []),
```

(`abilityScores.data`/`skills.data` — прив'язки `buildCharacterFormBindings`; якщо поля звуться інакше — брати з `formData.abilityScores` і `formData.skills.skills`. `onSaved` → `mergeLevelUpIntoForm` оновлює характеристики форми, тож наступне «Зберегти» профілю не відкотить ASI; `classes[].choices` форма теж отримує, але сервер їх у PATCH ігнорує — задача 7.)

- [ ] **Step 8: Player draft** — `lib/hooks/characters/usePlayerDraftForm.ts`: імпорт `draftChoicesState`, `stateDraftChoices`; у поверненні хука —

```ts
    choices: {
      data: draftChoicesState(values.choices, classBased ? values.classId : undefined),
      set: (next: ChoicesState) => setValues((prev) => ({ ...prev, choices: stateDraftChoices(next) })),
      enabled: classBased,
    },
```

(`values` — стан `DraftInput`, `classBased` — наявний прапорець режиму класів у хуку; при зміні класу `pickClass` додати `choices: prev.choices && { ...prev.choices, classChoices: undefined }`, щоб вибори старого класу не переїхали в новий.) `components/characters/player-draft/PlayerDraftForm.tsx`: `const refs = useChoiceRefs(campaignId, form.values.race);` (назва поля стану — як у хуку); перед кнопками збереження:

```tsx
      {(refs.race || form.choices.enabled) && refs.ready && (
        <HudSection title="Вибори">
          <ChoicesEditor state={form.choices} refs={refs} hero={{ level: 1, scores: { strength: form.values.strength, dexterity: form.values.dexterity, constitution: form.values.constitution, intelligence: form.values.intelligence, wisdom: form.values.wisdom, charisma: form.values.charisma }, skills: {}, classMode: form.choices.enabled && !!form.values.classId }} />
        </HudSection>
      )}
```

(Тіло чернетки `{ ...values }` уже несе `choices`.)

- [ ] **Step 9: Run tests**

Run: `pnpm test:run components/choices components/characters components/character-profile lib/hooks/characters lib/utils/characters lib/__tests__/client-entry-imports.test.ts && pnpm exec tsc --noEmit -p tsconfig.json`
Expected: PASS — `profile-view.test.tsx`, `profile-tabs.test.tsx`, `usePlayerDraftForm.test.ts` без змін; `ProfileEditor.tsx` лишається поза профільним чанком (тест «редактор профілю вантажиться окремо»).

- [ ] **Step 10: Commit**

```bash
git add lib/utils/characters/choices/picks.ts lib/utils/characters/choices/__tests__/draft-picks.test.ts components/choices components/characters/character-form-tabs.ts components/characters/NewCharacterForm.tsx components/character-profile/ProfileTabs.tsx components/character-profile/ProfileEditor.tsx lib/hooks/characters/usePlayerDraftForm.ts components/characters/player-draft/PlayerDraftForm.tsx
git commit -m "feat(constructor): 4f-4 choices tab in DM create, DM editor and player draft

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---
### Task 14: UI — крок «Вибори рівня», лист (лінія, риси, опції, «×2», джерела заклинань), бейдж невибраних, «Що нового»

**Files:**
- Create: `components/character-profile/LevelUpChoicesStep.tsx`, `components/character-profile/FeatsBlock.tsx`, `components/character-profile/PendingChoicesBadge.tsx`, `components/character-profile/ChoicesDialog.tsx`
- Modify: `lib/utils/characters/choices/class-choices.ts`, `components/character-profile/ClassLevelUpDialog.tsx`, `components/character-profile/LevelUpAction.tsx`, `components/character-profile/ProfileEditor.tsx`, `components/character-profile/ProfileHero.tsx`, `components/character-profile/CombatTab.tsx`, `components/character-profile/MagicTab.tsx`, `components/character-profile/SkillsTab.tsx`, `components/character-profile/CharacterProfile.tsx`, `lib/hooks/characters/index.ts`, `lib/onboarding/whats-new.ts`
- Test: `lib/utils/characters/choices/__tests__/level-up-defs.test.ts`, `components/character-profile/__tests__/class-level-up-choices.test.tsx`, `components/character-profile/__tests__/sheet-choices.test.tsx`

**Interfaces:**
- Consumes: `ChoicesEditor`, `useChoiceRefs` (задача 12); `CharacterChoicesPanel` (задача 13); `useClassLevelUp` (наявний; `ClassLevelUpPick.choices` — задача 1); `SheetChoices` (задачі 1, 9); `useCharacter` (наявний у `lib/hooks/characters/useCharacters.ts`).
- Produces:
  - `levelUpChoiceDefs(cls: GameClassData, subclass: Subclass | null, nextLevel: number): Choice[]` (без zod) — вибори, що відкриваються на `nextLevel`, і вибори з кількістю «з таблиці», відкриті раніше.
  - `ClassLevelUpDialog` — проп `character.hero?: { race: string; level: number; scores: Record<AbilityKey, number>; skills: unknown }`; крок «Вибори рівня» (лише коли `hero` є і `levelUpChoiceDefs` непорожній), кнопки «Підвищити» (з виборами) і «Обрати пізніше» (без).
  - Лист: «Elf (Wood Elf)» у `ProfileHero`, `FeatsBlock` у вкладці «Вміння» (риси з типом, джерелом і піками; опції класів), «×2» в навичках, секція «Заклинання з виборів» у «Магії», `PendingChoicesBadge` у шапці (діалог `ChoicesDialog` — через `next/dynamic`).
  - `lib/hooks/characters` експортує `useCharacter`.
  - Запис «Що нового» `2026-10-23-feats-choices`.

- [ ] **Step 1: Write the failing tests**

`lib/utils/characters/choices/__tests__/level-up-defs.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { sorcerer } from "./fixtures";

import { levelUpChoiceDefs } from "@/lib/utils/characters/choices/class-choices";

describe("levelUpChoiceDefs", () => {
  it("choices opening at the new level plus earlier table-scaled ones", () => {
    expect(levelUpChoiceDefs(sorcerer, null, 2).map((c) => c.id)).toEqual(["cantrips", "metamagic"]);
    expect(levelUpChoiceDefs(sorcerer, null, 4).map((c) => c.id)).toEqual(["cantrips", "metamagic", "ability-score-improvement-4"]);
    expect(levelUpChoiceDefs(sorcerer, null, 3).map((c) => c.id)).toEqual(["cantrips", "metamagic"]);
  });
});
```

`components/character-profile/__tests__/class-level-up-choices.test.tsx`:

```tsx
// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ClassLevelUpDialog } from "@/components/character-profile/ClassLevelUpDialog";
import { featsById, refs, scores, sorcerer, spells } from "@/lib/utils/characters/choices/__tests__/fixtures";

const submit = vi.fn().mockResolvedValue(true);

vi.mock("@/lib/hooks/classes", () => ({ useClasses: () => ({ data: [sorcerer] }) }));
vi.mock("@/lib/hooks/characters", () => ({
  useClassLevelUp: () => ({ submit, isPending: false, error: null, clearError: vi.fn() }),
  useChoiceRefs: () => ({ ...refs, ready: true, feats: Object.values(featsById), spells }),
}));

const open = (hero?: object) =>
  render(<ClassLevelUpDialog open onOpenChange={vi.fn()} character={{ campaignId: "c1", id: "h1", entries: [{ classId: sorcerer.id, level: 1 }], ...(hero && { hero }) }} />);

describe("ClassLevelUpDialog: level choices", () => {
  afterEach(() => {
    cleanup();
    submit.mockClear();
  });

  it("level 2 shows Metamagic; picks go with the level-up", async () => {
    open({ race: "Elf", level: 1, scores, skills: {} });

    fireEvent.click(screen.getByRole("checkbox", { name: /Quickened Spell/ }));
    fireEvent.click(screen.getByRole("button", { name: "Підвищити" }));

    await waitFor(() => expect(submit).toHaveBeenCalledWith({ classId: sorcerer.id, choices: { metamagic: [{ id: "quickened" }] } }));
  });

  it("«Обрати пізніше» levels up without choices; no hero → no step", async () => {
    open({ race: "Elf", level: 1, scores, skills: {} });

    fireEvent.click(screen.getByRole("button", { name: "Обрати пізніше" }));

    await waitFor(() => expect(submit).toHaveBeenCalledWith({ classId: sorcerer.id }));

    cleanup();
    open();

    expect(screen.queryByRole("button", { name: "Обрати пізніше" })).toBeNull();
  });
});
```

(Кнопка «Підвищити» — `type="submit" form="class-level-up-form"`; у happy-dom клік по submit-кнопці поза формою може не відправити форму — тоді в тесті замінити клік на `fireEvent.submit(document.getElementById("class-level-up-form") as HTMLFormElement)`, як у наявному `ClassLevelUpDialog.test.tsx`.)

`components/character-profile/__tests__/sheet-choices.test.tsx`:

```tsx
// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { sheetFixture } from "./sheet-fixture";

import { FeatsBlock } from "@/components/character-profile/FeatsBlock";
import { PendingChoicesBadge } from "@/components/character-profile/PendingChoicesBadge";
import type { CharacterSheet } from "@/types/characters";

const current = vi.hoisted(() => ({ sheet: null as unknown as CharacterSheet }));

vi.mock("@/components/character-profile/ProfileContext", () => ({ useProfile: () => ({ campaignId: "c1", characterId: "h1", sheet: current.sheet, canEdit: true }) }));
vi.mock("next/dynamic", () => ({ default: () => (props: { open: boolean }) => (props.open ? <div data-testid="choices-dialog" /> : null) }));

const choices: NonNullable<CharacterSheet["choices"]> = {
  pending: 2,
  lineage: "Wood Elf",
  feats: [{ key: "k", id: "f-asi", name: "Ability Score Improvement", type: "general", from: "Rogue 4", picks: ["+2 СПР"] }],
  options: [{ owner: "Sorcerer", label: "Metamagic", names: ["Quickened Spell", "Twinned Spell"] }],
  spellSources: {},
  expertise: ["stealth"],
};

describe("sheet choices UI", () => {
  afterEach(cleanup);

  it("no choices → nothing rendered", () => {
    current.sheet = sheetFixture;

    const { container } = render(
      <>
        <FeatsBlock />
        <PendingChoicesBadge />
      </>,
    );

    expect(container.textContent).toBe("");
  });

  it("feats with source and picks, class options, pending badge opens the dialog", () => {
    current.sheet = { ...sheetFixture, choices };

    render(
      <>
        <FeatsBlock />
        <PendingChoicesBadge />
      </>,
    );

    expect(screen.getByText("Ability Score Improvement")).toBeTruthy();
    expect(screen.getByText(/Rogue 4 · \+2 СПР/)).toBeTruthy();
    expect(screen.getByText("Metamagic: Quickened Spell, Twinned Spell")).toBeTruthy();
    expect(screen.getByText("Невибрані вибори: 2")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Обрати" }));

    expect(screen.getByTestId("choices-dialog")).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm test:run lib/utils/characters/choices/__tests__/level-up-defs.test.ts components/character-profile/__tests__/class-level-up-choices.test.tsx components/character-profile/__tests__/sheet-choices.test.tsx`
Expected: FAIL.

- [ ] **Step 3: `levelUpChoiceDefs`** — у `lib/utils/characters/choices/class-choices.ts`:

```ts
export const levelUpChoiceDefs = (cls: GameClassData, subclass: Subclass | null, nextLevel: number): Choice[] =>
  classChoiceDefs(cls, subclass).filter((c) => c.level === nextLevel || (c.level < nextLevel && typeof c.count !== "number"));
```

(Фільтр збігається з `only` у `ChoicesEditor`.)

- [ ] **Step 4: Level-up step** — `components/character-profile/LevelUpChoicesStep.tsx`:

```tsx
"use client";

import { ChoicesEditor } from "@/components/choices/ChoicesEditor";
import { LoadingState } from "@/components/common/states";
import type { AbilityKey } from "@/lib/constants/abilities";
import { useChoiceRefs } from "@/lib/hooks/characters";
import type { Picks } from "@/types/choices";
import type { CharacterClassEntry } from "@/types/classes";

interface LevelUpChoicesStepProps {
  campaignId: string;
  hero: { race: string; level: number; scores: Record<AbilityKey, number>; skills: unknown };
  entry: CharacterClassEntry;
  value: Picks;
  onChange: (next: Picks) => void;
}

export function LevelUpChoicesStep({ campaignId, hero, entry, value, onChange }: LevelUpChoicesStepProps) {
  const refs = useChoiceRefs(campaignId, hero.race);

  if (!refs.ready) return <LoadingState rows={2} label="Завантаження виборів…" />;

  const merged = { ...entry, choices: { ...(entry.choices ?? {}), ...value } };

  return (
    <div className="space-y-2">
      <p className="hud-sc text-sm text-hud-ink">Вибори рівня</p>
      <ChoicesEditor
        state={{
          data: { raceChoices: {}, feats: [], classes: [merged] },
          set: (next) => {
            const picks = next.classes[0]?.choices ?? {};

            onChange(Object.fromEntries(Object.entries(picks).filter(([id, list]) => JSON.stringify(list) !== JSON.stringify(entry.choices?.[id] ?? []))));
          },
        }}
        refs={refs}
        hero={{ ...hero, level: hero.level + 1, classMode: true }}
        only={{ classId: entry.classId, level: entry.level }}
      />
    </div>
  );
}
```

(`entry` тут — запис класу вже з новим рівнем і підкласом; `onChange` віддає лише змінені піки — сервер зливає їх зі збереженими.)

`components/character-profile/ClassLevelUpDialog.tsx`:
  - тип `character` — `{ campaignId: string; id: string; entries: CharacterClassEntry[]; hero?: { race: string; level: number; scores: Record<AbilityKey, number>; skills: unknown } }`;
  - стан `const [picks, setPicks] = useState<Picks>({});`, скидання в `pick` (`setPicks({})`) і при зміні нового класу/підкласу;
  - після `needsSubclass`:

```tsx
  const subclass = cls?.subclasses.find((s) => s.id === (current?.subclassId ?? subclassId)) ?? null;

  const stepDefs = cls && character.hero ? levelUpChoiceDefs(cls, subclass, nextLevel) : [];

  const raisedEntry = cls ? { classId, level: nextLevel, ...((current?.subclassId ?? subclassId) && { subclassId: current?.subclassId ?? subclassId }), ...(current?.choices && { choices: current.choices }) } : null;

  const send = async (withChoices: boolean) => {
    if (!canSubmit) return;

    const chosen = withChoices && Object.values(picks).some((l) => l.length > 0);

    if (await levelUp.submit({ classId, ...(needsSubclass && { subclassId }), ...(chosen && { choices: picks }) })) onOpenChange(false);
  };
```

  - `submit` форми викликає `void send(true)`; у `footer` перед «Підвищити», коли `stepDefs.length > 0`, — `<Button type="button" variant="outline" onClick={() => void send(false)}>Обрати пізніше</Button>`;
  - у формі перед блоком помилки — `{stepDefs.length > 0 && character.hero && raisedEntry && <LevelUpChoicesStep campaignId={character.campaignId} hero={character.hero} entry={raisedEntry} value={picks} onChange={setPicks} />}`.
  Наявний тест (`fighter` без виборів, без `hero`) не бачить кроку й кнопки; виклик `submit({ classId })` — без ключа `choices`.

`components/character-profile/LevelUpAction.tsx` — тип `classLevelUp.character` бере тип пропа діалогу (`ComponentProps<typeof ClassLevelUpDialog>["character"]`), тож `hero` передається наскрізь. `components/character-profile/ProfileEditor.tsx` — у `classLevelUp.character` додати `hero: { race: formData.basicInfo.race, level: formData.basicInfo.level, scores: <ті самі шість характеристик форми, що й у задачі 13>, skills: skills.data.skills }`.

- [ ] **Step 5: Sheet components** — `components/character-profile/FeatsBlock.tsx`:

```tsx
"use client";

import { useProfile } from "./ProfileContext";

import { HudSection } from "@/components/hud/form";
import { HudPill } from "@/components/hud/page";
import { FEAT_TYPE_LABELS } from "@/lib/constants/choices";

export function FeatsBlock() {
  const { sheet } = useProfile();

  const choices = sheet.choices;

  if (!choices || (choices.feats.length === 0 && choices.options.length === 0)) return null;

  return (
    <HudSection title="Риси й вибори">
      <ul className="space-y-2 text-sm">
        {choices.feats.map((f) => (
          <li key={f.key} className="flex flex-wrap items-baseline gap-2">
            <span className="text-hud-ink">{f.name}</span>
            <HudPill>{FEAT_TYPE_LABELS[f.type]}</HudPill>
            <span className="text-xs text-hud-muted">{[f.from, ...f.picks].join(" · ")}</span>
          </li>
        ))}
        {choices.options.map((o) => (
          <li key={`${o.owner}:${o.label}`} className="text-hud-muted">{`${o.label}: ${o.names.join(", ")}`}</li>
        ))}
      </ul>
    </HudSection>
  );
}
```

`components/character-profile/ChoicesDialog.tsx`:

```tsx
"use client";

import { CharacterChoicesPanel } from "@/components/choices/CharacterChoicesPanel";
import { LoadingState } from "@/components/common/states";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import { useCampaignRules } from "@/lib/hooks/campaigns";
import { useCharacter } from "@/lib/hooks/characters";
import { choicesStateOf } from "@/lib/utils/characters/choices/picks";

export default function ChoicesDialog({ open, onOpenChange, campaignId, characterId }: { open: boolean; onOpenChange: (open: boolean) => void; campaignId: string; characterId: string }) {
  const { data: character } = useCharacter(campaignId, characterId);

  const classesEnabled = !!useCampaignRules(campaignId).data?.classes.enabled;

  const state = character ? choicesStateOf(character) : null;

  return (
    <ResponsiveDialog hud open={open} onOpenChange={onOpenChange} title="Вибори героя" size="lg">
      {!character || !state ? (
        <LoadingState rows={3} label="Завантаження героя…" />
      ) : (
        <CharacterChoicesPanel
          campaignId={campaignId}
          characterId={characterId}
          initial={state}
          hero={{ race: character.race, level: character.level, scores: { strength: character.strength, dexterity: character.dexterity, constitution: character.constitution, intelligence: character.intelligence, wisdom: character.wisdom, charisma: character.charisma }, skills: character.skills, classMode: classesEnabled && state.classes.length > 0 }}
          onSaved={() => onOpenChange(false)}
        />
      )}
    </ResponsiveDialog>
  );
}
```

`components/character-profile/PendingChoicesBadge.tsx`:

```tsx
"use client";

import { useState } from "react";
import dynamic from "next/dynamic";

import { useProfile } from "./ProfileContext";

import { HudPill } from "@/components/hud/page";
import { Button } from "@/components/ui/button";

const ChoicesDialog = dynamic(() => import("./ChoicesDialog"), { ssr: false });

export function PendingChoicesBadge() {
  const { campaignId, characterId, sheet } = useProfile();

  const [open, setOpen] = useState(false);

  const pending = sheet.choices?.pending ?? 0;

  if (pending === 0) return null;

  return (
    <span className="inline-flex items-center gap-2">
      <HudPill tone="active">{`Невибрані вибори: ${pending}`}</HudPill>
      {(sheet.viewer.isDM || sheet.viewer.isOwner) && (
        <Button type="button" size="sm" variant="outline" onClick={() => setOpen(true)}>
          Обрати
        </Button>
      )}
      <ChoicesDialog open={open} onOpenChange={setOpen} campaignId={campaignId} characterId={characterId} />
    </span>
  );
}
```

(`HudPill` має `tone?`; якщо значення `"active"` немає — взяти наявний тон із `components/hud/page`. `useCharacter` — дописати в `lib/hooks/characters/index.ts`: `useCharacter` до рядка експорту з `./useCharacters`.)

- [ ] **Step 6: Sheet wiring** —
  - `ProfileHero.tsx`: замість `{id.race}` — `{id.race}{id.subrace ? ` (${id.subrace})` : ""}`.
  - `CombatTab.tsx` (секція «НАВИЧКИ»): `{s.proficient ? "● " : ""}` → `{s.proficient ? (s.expertise ? "●● " : "● ") : ""}`, а після `{s.label}` — `{s.expertise && <span className="ml-1 text-xs text-hud-muted">×2</span>}`.
  - `MagicTab.tsx`: після секції «СЛОТИ»:

```tsx
      {sheet.choices && sheet.spells.some((s) => sheet.choices?.spellSources[s.id]) && (
        <HudSection title="ЗАКЛИНАННЯ З ВИБОРІВ">
          <ul className="space-y-1 text-sm">
            {sheet.spells
              .filter((s) => sheet.choices?.spellSources[s.id])
              .map((s) => (
                <li key={s.id} className="flex justify-between gap-2">
                  <span>{s.name}</span>
                  <span className="text-xs text-hud-muted">{sheet.choices?.spellSources[s.id]}</span>
                </li>
              ))}
          </ul>
        </HudSection>
      )}
```

  - `SkillsTab.tsx`: `<FeatsBlock />` першим елементом (перед `RacePassive`).
  - `CharacterProfile.tsx`: `badge={<><LevelUpBadge … /><PendingChoicesBadge /></>}` (обидва в одному фрагменті; `LevelUpBadge` без змін).

- [ ] **Step 7: «Що нового»** — `lib/onboarding/whats-new.ts`, першим елементом масиву:

```ts
  { id: "2026-10-23-feats-choices", date: "2026-10-23", audience: "all", title: "Риси й вибори 5e", body: "Лінії рас (Ельф, Гном, Тифлінг, Драконороджений, Голіаф), риси (ASI з межею 20, стилі бою, епічні дари), метамагія, закляття, експертиза й заклинання за списками класу — у формі героя, при підвищенні рівня й на листі («Невибрані вибори»)." },
```

- [ ] **Step 8: Run tests**

Run: `pnpm test:run components/character-profile components/choices lib/utils/characters lib/onboarding lib/__tests__/client-entry-imports.test.ts && pnpm exec tsc --noEmit -p tsconfig.json`
Expected: PASS — наявні `ClassLevelUpDialog.test.tsx`, `profile-view.test.tsx`, `level-up-badge.test.tsx` без змін; профільний чанк без zod (діалог — `next/dynamic`, `FeatsBlock`/`PendingChoicesBadge` імпортують лише константи й контекст).

- [ ] **Step 9: Commit**

```bash
git add lib/utils/characters/choices/class-choices.ts lib/utils/characters/choices/__tests__/level-up-defs.test.ts components/character-profile lib/hooks/characters/index.ts lib/onboarding/whats-new.ts
git commit -m "feat(constructor): 4f-4 level-up choices step, sheet feats and options, pending badge, what's new

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---
### Task 15: Конвертер — риси SRD (`Feat`, `FeatBenefit`), вид `feats` у конвеєрі, фікстури 4f-4

**Files:**
- Create: `scripts/srd/convert/feats.ts`, `scripts/srd/overrides/feats.ts`, `scripts/srd/__tests__/fixtures-4f4/*.json` (згенеровані), `scripts/srd/__tests__/feats.test.ts`
- Modify: `scripts/srd/lib/source.ts`, `scripts/srd/lib/open5e.ts`, `scripts/srd/lib/types.ts`, `scripts/srd/lib/build-data.ts`
- Modify (дозволені правки наявних тестів): `scripts/srd/__tests__/preset.test.ts` — лише `toHaveLength(18)` → `toHaveLength(20)`; `scripts/srd/__tests__/build-data.test.ts` — лише `feats: []` у літералі `data` і `feats: 0` в очікуваних `manifest.counts`; `scripts/srd/__tests__/data-integrity.test.ts` — лише рядок `feats: { create: createFeatSchema, update: updateFeatSchema },` у `SCHEMAS` (+ імпорт з `@/lib/schemas`) і `feats: 17` в `EXPECTED`.
- Regenerate: `data/templates/srd-5.2/feats.json`, `data/templates/srd-5.2/manifest.json`

**Interfaces:**
- Consumes: `FeatType`, `FeatPrerequisite`, `Choice` (задача 1); `createFeatSchema` (задача 2); вид імпорту `feats` (задача 4).
- Produces:
  - `OPEN5E_FILES` + `Feat` (md5 `00522a4edd44236cc9dd6d95775d930b`), `FeatBenefit` (md5 `515b253cb2e00aba2c7886115cb043c7`); `O5Feat { name; desc; type; prerequisite }`, `O5FeatBenefit { name; desc; parent; type }`; `Open5eData.feats`, `Open5eData.featBenefits`; `FIXTURE_4F4_DIR`; `OPTIONAL_FILES` + `Feat`, `FeatBenefit`.
  - `SRD_KINDS = ["spell-groups", "spells", "races", "classes", "feats", "units", "artifacts"]`; `interface FeatRow { slug; name; type: FeatType; prerequisite: FeatPrerequisite; repeatable: boolean; description: string; abilities: Ability[]; choices: Choice[] }`; `SrdData.feats: FeatRow[]`.
  - `parsePrerequisite(text: string): FeatPrerequisite`, `convertFeats(data: Open5eData): FeatRow[]`; `FEAT_MECHANICS: Record<featPk, FeatMechanics>`.

- [ ] **Step 1: Source and types** —
  - `scripts/srd/lib/source.ts`: в `OPEN5E_FILES` після `MagicItem: "…",` — `Feat: "00522a4edd44236cc9dd6d95775d930b",` і `FeatBenefit: "515b253cb2e00aba2c7886115cb043c7",`.
  - `scripts/srd/lib/open5e.ts`:

```ts
export interface O5Feat { name: string; desc: string; type: string; prerequisite: string }

export interface O5FeatBenefit { name: string; desc: string; parent: string; type: string | null }
```

  в `Open5eData` — `feats: Fixture<O5Feat>[];` і `featBenefits: Fixture<O5FeatBenefit>[];`; в `OPEN5E_FILE_OF` — `feats: "Feat",` `featBenefits: "FeatBenefit",`; `export const FIXTURE_4F4_DIR = path.join(process.cwd(), "scripts", "srd", "__tests__", "fixtures-4f4");`; `OPTIONAL_FILES = new Set<Open5eFile>(["MagicItem", "Feat", "FeatBenefit"]);` (коментар над ним — «MagicItem arrived in 4f-3, feats in 4f-4: older fixture dirs do not carry them»).
  - `scripts/srd/lib/types.ts`: `import type { Choice, FeatPrerequisite, FeatType } from "@/types/choices";`; `SRD_KINDS = ["spell-groups", "spells", "races", "classes", "feats", "units", "artifacts"] as const;`; інтерфейс `FeatRow` (див. Interfaces); у `SrdData` після `classes` — `feats: FeatRow[];`.
  - Дозволені правки: `preset.test.ts` (18 → 20), `build-data.test.ts` (`feats: []` у `data`, `feats: 0` у `counts`).

- [ ] **Step 2: Fixtures** — згенерувати каталог фікстур 4f-4 (обидві задачі 16 і 17 використовують його ж):

```bash
pnpm exec tsx --tsconfig tsconfig.scripts.json scripts/srd/extract-fixture.ts --source /Users/silentfox/.claude/jobs/4ad97a0b/tmp/srd --out scripts/srd/__tests__/fixtures-4f4 \
  srd-2024_alert srd-2024_magic-initiate srd-2024_skilled srd-2024_ability-score-improvement srd-2024_grappler srd-2024_archery srd-2024_defense srd-2024_boon-of-fate srd-2024_savage-attacker \
  srd-2024_elf srd-2024_gnome srd-2024_tiefling srd-2024_dragonborn srd-2024_goliath srd-2024_human srd-2024_dwarf \
  srd-2024_bard srd-2024_cleric srd-2024_druid srd-2024_fighter srd-2024_paladin srd-2024_ranger srd-2024_rogue srd-2024_sorcerer srd-2024_warlock srd-2024_wizard srd-2024_barbarian \
  srd-2024_champion srd-2024_college-of-lore srd-2024_draconic-sorcery srd-2024_fiend-patron srd-2024_hunter srd-2024_life-domain \
  srd-2024_dancing-lights srd-2024_faerie-fire srd-2024_darkness srd-2024_prestidigitation srd-2024_detect-magic srd-2024_misty-step srd-2024_druidcraft srd-2024_longstrider srd-2024_pass-without-trace \
  srd-2024_minor-illusion srd-2024_speak-with-animals srd-2024_mending srd-2024_poison-spray srd-2024_ray-of-sickness srd-2024_hold-person srd-2024_chill-touch srd-2024_false-life srd-2024_ray-of-enfeeblement srd-2024_fire-bolt srd-2024_hellish-rebuke srd-2024_cure-wounds srd-2024_magic-missile
```

Expected: друк кількостей по файлах (`Feat: 9`, `FeatBenefit: 21+`, `Species: 7`, `CharacterClass: 17` (11 класів + 6 підкласів), `Spell: 24` тощо); у `fixtures-4f4/` 20 файлів. Розмір каталогу — до ~2 МБ (більшість — `ClassFeature.json`); якщо вийшло більше 3 МБ — прибрати зі списку `srd-2024_barbarian srd-2024_druid` і їхні тести в задачі 17 замінити на перевірку повних даних у задачі 18.

- [ ] **Step 3: Write the failing test** — `scripts/srd/__tests__/feats.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { convertFeats, parsePrerequisite } from "../convert/feats";
import { FIXTURE_4F4_DIR, loadOpen5e } from "../lib/open5e";

import { createFeatSchema } from "@/lib/schemas";

const feats = convertFeats(loadOpen5e(FIXTURE_4F4_DIR));

const feat = (name: string) => feats.find((f) => f.name === name)!;

describe("parsePrerequisite", () => {
  it("level, any-of scores, the rest as text", () => {
    expect(parsePrerequisite("")).toEqual({});
    expect(parsePrerequisite("Level 4+")).toEqual({ level: 4 });
    expect(parsePrerequisite("Level 4+, Strength or Dexterity 13+")).toEqual({ level: 4, scores: { abilities: ["strength", "dexterity"], min: 13 } });
    expect(parsePrerequisite("Fighting Style Feature")).toEqual({ text: "Fighting Style Feature" });
    expect(parsePrerequisite("Level 19+, Spellcasting Feature")).toEqual({ level: 19, text: "Spellcasting Feature" });
  });
});

describe("convertFeats", () => {
  it("types, repeatable from the «Repeatable» benefit, description without it", () => {
    expect(feat("Alert")).toMatchObject({ type: "origin", repeatable: false, prerequisite: {} });
    expect(feat("Ability Score Improvement")).toMatchObject({ type: "general", repeatable: true, prerequisite: { level: 4 }, abilities: [] });
    expect(feat("Magic Initiate").repeatable).toBe(true);
    expect(feat("Skilled").repeatable).toBe(true);
    expect(feat("Archery")).toMatchObject({ type: "fightingStyle", prerequisite: { text: "Fighting Style Feature" } });
    expect(feat("Boon of Fate")).toMatchObject({ type: "epicBoon", prerequisite: { level: 19 } });
    expect(feat("Alert").description).toContain("**Initiative Proficiency.**");
    expect(feat("Magic Initiate").description).not.toContain("Repeatable");
  });

  it("mechanics: Alert initiative = prof, Archery +2 ranged, Defense +1 AC in armor, notes elsewhere", () => {
    expect(feat("Alert").abilities[0]).toMatchObject({ id: "initiative-proficiency", trigger: { event: "passive" }, effects: [{ kind: "modifyStat", stat: "initiative", flat: { formula: "prof" } }] });
    expect(feat("Archery").abilities[0].effects).toEqual([{ kind: "modifyStat", stat: "attackBonus", flat: 2, attackKind: "ranged" }]);
    expect(feat("Defense").abilities[0]).toMatchObject({ condition: { type: "armorWorn", categories: ["light", "medium", "heavy"] }, effects: [{ kind: "modifyStat", stat: "armor", flat: 1 }] });
    expect(feat("Savage Attacker").abilities[0].effects).toEqual([{ kind: "note", text: "Savage Attacker" }]);
  });

  it("choices: ASI 2/20, Grappler STR|DEX 1/20, boons 1/30, Skilled 3 skills, Magic Initiate two spell picks", () => {
    expect(feat("Ability Score Improvement").choices).toEqual([expect.objectContaining({ kind: "abilityScore", points: 2, max: 20 })]);
    expect(feat("Grappler").choices).toEqual([expect.objectContaining({ kind: "abilityScore", abilities: ["strength", "dexterity"], points: 1, max: 20 })]);
    expect(feat("Boon of Fate").choices).toEqual([expect.objectContaining({ kind: "abilityScore", points: 1, max: 30 })]);
    expect(feat("Skilled").choices).toEqual([expect.objectContaining({ kind: "skill", count: 3 })]);
    expect(feat("Magic Initiate").choices.map((c) => [c.kind, c.count, c.spells?.minLevel, c.spells?.maxLevel])).toEqual([["spell", 2, 0, 0], ["spell", 1, 1, 1]]);
    expect(feat("Magic Initiate").choices[0].spells?.lists).toEqual(["Cleric", "Druid", "Wizard"]);
  });

  it("every row passes the feat schema", () => {
    for (const f of feats) {
      const { slug: _slug, ...row } = f;

      expect(createFeatSchema.safeParse(row).success, f.name).toBe(true);
    }
  });
});
```

- [ ] **Step 4: Run test to verify it fails**

Run: `pnpm test:run scripts/srd/__tests__/feats.test.ts`
Expected: FAIL — модуля `convert/feats` немає.

- [ ] **Step 5: Overrides** — `scripts/srd/overrides/feats.ts`:

```ts
import type { AbilityCore } from "../lib/abilities";

import type { Choice } from "@/types/choices";

export interface FeatMechanics {
  /** "note" — нотатка з повним текстом риси; без поля — лише нотатка */
  abilities?: Array<{ id: string; name: string; core: AbilityCore } | "note">;
  choices?: Choice[];
}

const asi = (points: number, max: number, abilities?: Choice["abilities"]): Choice => ({ id: "ability-score-increase", label: "Ability Score Increase", level: 1, count: 1, kind: "abilityScore", points, max, ...(abilities && { abilities }) });

const MI_LISTS = ["Cleric", "Druid", "Wizard"];

const boon: FeatMechanics = { abilities: ["note"], choices: [asi(1, 30)] };

export const FEAT_MECHANICS: Record<string, FeatMechanics> = {
  "srd-2024_alert": {
    abilities: [{ id: "initiative-proficiency", name: "Initiative Proficiency", core: { trigger: { event: "passive" }, effects: [{ kind: "modifyStat", stat: "initiative", flat: { formula: "prof" } }] } }, "note"],
  },
  "srd-2024_magic-initiate": {
    abilities: ["note"],
    choices: [
      { id: "cantrips", label: "Two Cantrips", level: 1, count: 2, kind: "spell", spells: { lists: MI_LISTS, minLevel: 0, maxLevel: 0 } },
      { id: "level-one-spell", label: "Level One Spell", level: 1, count: 1, kind: "spell", spells: { lists: MI_LISTS, minLevel: 1, maxLevel: 1 } },
    ],
  },
  "srd-2024_skilled": { abilities: [], choices: [{ id: "skills", label: "Skills", level: 1, count: 3, kind: "skill" }] },
  "srd-2024_ability-score-improvement": { abilities: [], choices: [asi(2, 20)] },
  "srd-2024_grappler": { abilities: ["note"], choices: [asi(1, 20, ["strength", "dexterity"])] },
  "srd-2024_archery": { abilities: [{ id: "archery", name: "Archery", core: { trigger: { event: "passive" }, effects: [{ kind: "modifyStat", stat: "attackBonus", flat: 2, attackKind: "ranged" }] } }] },
  "srd-2024_defense": {
    abilities: [{ id: "defense", name: "Defense", core: { trigger: { event: "passive" }, condition: { type: "armorWorn", categories: ["light", "medium", "heavy"] }, effects: [{ kind: "modifyStat", stat: "armor", flat: 1 }] } }],
  },
  "srd-2024_two-weapon-fighting": { abilities: [{ id: "two-weapon-fighting", name: "Two-Weapon Fighting", core: { trigger: { event: "passive" }, effects: [{ kind: "flag", flag: "twoWeaponFighting" }] } }] },
  "srd-2024_boon-of-combat-prowess": boon,
  "srd-2024_boon-of-dimensional-travel": boon,
  "srd-2024_boon-of-fate": boon,
  "srd-2024_boon-of-irresistible-offense": boon,
  "srd-2024_boon-of-spell-recall": boon,
  "srd-2024_boon-of-the-night-spirit": boon,
  "srd-2024_boon-of-truesight": boon,
};
```

- [ ] **Step 6: Converter** — `scripts/srd/convert/feats.ts`:

```ts
import { coreAbility, noteAbility } from "../lib/abilities";
import { type Fixture, type O5Feat, type O5FeatBenefit, type Open5eData, slugTail } from "../lib/open5e";
import { bySlug } from "../lib/text";
import type { FeatRow } from "../lib/types";
import { FEAT_MECHANICS } from "../overrides/feats";

import { type AbilityKey, isAbilityKey } from "@/lib/constants/abilities";
import { groupBy } from "@/lib/utils/common/collections";
import type { FeatPrerequisite, FeatType } from "@/types/choices";

const FEAT_TYPE: Record<string, FeatType> = { Origin: "origin", General: "general", "Fighting Style": "fightingStyle", "Epic Boon": "epicBoon" };

const LEVEL = /^Level (\d+)\+$/;

const SCORES = /^(\w+) or (\w+) (\d+)\+$/;

export function parsePrerequisite(text: string): FeatPrerequisite {
  const out: FeatPrerequisite = {};

  const rest: string[] = [];

  for (const part of text.split(",").map((s) => s.trim()).filter(Boolean)) {
    const level = LEVEL.exec(part);

    const scores = SCORES.exec(part);

    const abilities = scores ? [scores[1].toLowerCase(), scores[2].toLowerCase()].filter(isAbilityKey) : [];

    if (level) out.level = Number(level[1]);
    else if (scores && abilities.length === 2) out.scores = { abilities: abilities as AbilityKey[], min: Number(scores[3]) };
    else rest.push(part);
  }

  if (rest.length > 0) out.text = rest.join(", ");

  return out;
}

function featText(feat: Fixture<O5Feat>, benefits: Fixture<O5FeatBenefit>[]): string {
  const parts = benefits.filter((b) => b.fields.name !== "Repeatable").map((b) => (b.fields.name ? `**${b.fields.name}.** ${b.fields.desc.trim()}` : b.fields.desc.trim()));

  return [feat.fields.desc?.trim(), ...parts].filter(Boolean).join("\n\n");
}

export function convertFeats(data: Open5eData): FeatRow[] {
  const benefits = groupBy(data.featBenefits, (b) => b.fields.parent);

  return data.feats
    .map((f): FeatRow => {
      const type = FEAT_TYPE[f.fields.type];

      if (!type) throw new Error(`${f.pk}: unknown feat type «${f.fields.type}»`);

      const own = benefits.get(f.pk) ?? [];

      const description = featText(f, own);

      const mech = FEAT_MECHANICS[f.pk] ?? {};

      const abilities = (mech.abilities ?? ["note"]).map((a) => (a === "note" ? noteAbility(slugTail(f.pk), f.fields.name, description) : coreAbility(a.id, a.name, description, a.core)));

      return { slug: f.pk, name: f.fields.name, type, prerequisite: parsePrerequisite(f.fields.prerequisite ?? ""), repeatable: own.some((b) => b.fields.name === "Repeatable"), description, abilities, choices: mech.choices ?? [] };
    })
    .sort(bySlug);
}
```

- [ ] **Step 7: Build wiring** — `scripts/srd/lib/build-data.ts`: імпорти `convertFeats` і `FEAT_MECHANICS`; перед `const out` — `if (data.feats.length > 0) assertKnown("feat overrides", Object.keys(FEAT_MECHANICS), pks(data.feats));`; у `out` після `classes` — `feats: convertFeats(data),`. Дозволена правка `data-integrity.test.ts` (`SCHEMAS.feats`, `EXPECTED.feats: 17`).

- [ ] **Step 8: Regenerate and run tests**

Run: `pnpm srd:build --source /Users/silentfox/.claude/jobs/4ad97a0b/tmp/srd`
Expected: друк лічильників з рядком `feats: 17`, решта як раніше (`spell-groups: 8, spells: 339, races: 9, classes: 12, units: 331, artifacts: 331`), `composed names verified: 513`. `git status --short data/templates/srd-5.2` — нові/змінені лише `feats.json` і `manifest.json` (інакше зупинитись).

Run: `pnpm test:run scripts/srd lib/server/content && pnpm exec tsc --noEmit -p tsconfig.json`
Expected: PASS — `data-integrity.test.ts` (17 рис проходять `importContent` dryRun), `load-template.test.ts` (порядок `SRD_KINDS` з `feats` після `classes`), `open5e.test.ts`.

- [ ] **Step 9: Commit**

```bash
git add scripts/srd data/templates/srd-5.2/feats.json data/templates/srd-5.2/manifest.json
git commit -m "feat(srd): 4f-4 SRD feats converter, feats kind in the pipeline, 4f-4 fixtures

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---
### Task 16: Конвертер — лінії й вибори рас (24 опції, 22 заклинання)

**Files:**
- Create: `scripts/srd/convert/race-choices.ts`, `scripts/srd/overrides/race-choices.ts`, `scripts/srd/__tests__/race-choices.test.ts`
- Modify: `scripts/srd/lib/types.ts`, `scripts/srd/lib/build-data.ts`
- Regenerate: `data/templates/srd-5.2/races.json`, `data/templates/srd-5.2/manifest.json`

**Interfaces:**
- Consumes: `FIXTURE_4F4_DIR`, `convertRaces` (наявний), `choiceSlug` (задача 10), `coreAbility`/`noteAbility`/`AbilityCore` (`scripts/srd/lib/abilities.ts`).
- Produces:
  - `RaceRow.choices?: Choice[]` (spellId у файлі даних — **назва** заклинання; імпортер розв'язує через `nestedRef`).
  - `tableRows(desc: string): string[][]`, `applyRaceChoices(rows: RaceRow[], data: Open5eData): RaceRow[]`.
  - `RACE_CHOICE_TRAITS: Record<traitPk, RaceChoiceTrait>`, `DROP_RACE_TRAITS: ReadonlySet<string>`, `OPTION_ABILITIES: Record<"<race>:<optionId>", Array<{ id; name; core: AbilityCore }>>`.
  - `buildSrdData` перевіряє, що кожна назва заклинання в опціях рас є серед заклинань даних.

- [ ] **Step 1: Write the failing test** — `scripts/srd/__tests__/race-choices.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { convertRaces } from "../convert/races";
import { applyRaceChoices, tableRows } from "../convert/race-choices";
import { FIXTURE_4F4_DIR, loadOpen5e } from "../lib/open5e";

import { RaceChoicesSchema } from "@/lib/schemas/choices";

const data = loadOpen5e(FIXTURE_4F4_DIR);

const races = applyRaceChoices(convertRaces(data), data);

const race = (name: string) => races.find((r) => r.name === name)!;

const lineage = (name: string) => race(name).choices?.find((c) => c.lineage);

const option = (raceName: string, id: string) => lineage(raceName)?.options?.find((o) => o.id === id);

describe("tableRows", () => {
  it("skips the header and the separator, trims cells", () => {
    expect(tableRows("Table\n\n| Dragon | Damage Type |\n|---|---|\n| Black | Acid |\n|Gold|Fire|")).toEqual([["Black", "Acid"], ["Gold", "Fire"]]);
  });
});

describe("race choices", () => {
  it("Elf: three lineages; Wood Elf +5 speed and spells by level; shell traits removed; Keen Senses is a skill choice", () => {
    expect(lineage("Elf")?.options?.map((o) => o.name)).toEqual(["Drow", "High Elf", "Wood Elf"]);
    expect(option("Elf", "wood-elf")).toMatchObject({ spells: [{ level: 1, spellId: "Druidcraft" }, { level: 3, spellId: "Longstrider" }, { level: 5, spellId: "Pass without Trace" }] });
    expect(option("Elf", "wood-elf")?.abilities[0].effects).toEqual([{ kind: "modifyStat", stat: "speed", flat: 5 }]);
    expect(race("Elf").abilities.map((a) => a.id)).not.toContain("elven-lineage");
    expect(race("Elf").abilities.map((a) => a.id)).not.toContain("keen-senses");
    expect(race("Elf").choices?.find((c) => c.id === "keen-senses")).toMatchObject({ kind: "skill", count: 1, skills: ["insight", "perception", "survival"] });
  });

  it("Gnome: bold paragraphs, italic spells", () => {
    expect(option("Gnome", "rock-gnome")?.spells).toEqual([{ level: 1, spellId: "Mending" }, { level: 1, spellId: "Prestidigitation" }]);
    expect(option("Gnome", "forest-gnome")?.spells).toEqual([{ level: 1, spellId: "Minor Illusion" }, { level: 1, spellId: "Speak with Animals" }]);
  });

  it("Tiefling: legacy resistance and spells", () => {
    expect(option("Tiefling", "infernal")).toMatchObject({ spells: [{ level: 1, spellId: "Fire Bolt" }, { level: 3, spellId: "Hellish Rebuke" }, { level: 5, spellId: "Darkness" }] });
    expect(option("Tiefling", "infernal")?.abilities[0].effects).toEqual([{ kind: "flag", flag: "resistance", damageType: "fire", percent: 50 }]);
  });

  it("Dragonborn: ten ancestries with resistance and a breath note; Damage Resistance trait removed", () => {
    expect(lineage("Dragonborn")?.options).toHaveLength(10);
    expect(option("Dragonborn", "red")?.abilities.map((a) => a.effects[0])).toEqual([{ kind: "flag", flag: "resistance", damageType: "fire", percent: 50 }, { kind: "note", text: "Breath Weapon (Fire)" }]);
    expect(race("Dragonborn").abilities.map((a) => a.id)).not.toContain("damage-resistance");
  });

  it("Goliath: six giants; Fire's Burn hits for 1d10 fire, uses = proficiency per long rest", () => {
    expect(lineage("Goliath")?.options?.map((o) => o.id)).toEqual(["cloud-giant", "fire-giant", "frost-giant", "hill-giant", "stone-giant", "storm-giant"]);
    expect(option("Goliath", "fire-giant")?.abilities[0]).toMatchObject({ name: "Fire's Burn", trigger: { event: "hit", role: "attacker" }, limits: { perRest: { rest: "long", uses: { formula: "prof" } } }, effects: [{ kind: "dealDamage", amount: "1d10", damageType: "fire" }] });
    expect(option("Goliath", "cloud-giant")?.abilities[0].effects).toEqual([{ kind: "note", text: "Cloud's Jaunt" }]);
  });

  it("Human: Skillful and Versatile; Dwarf has no choices", () => {
    expect(race("Human").choices?.map((c) => [c.id, c.kind])).toEqual([["skillful", "skill"], ["versatile", "feat"]]);
    expect(race("Human").choices?.[1].featTypes).toEqual(["origin"]);
    expect(race("Dwarf").choices).toBeUndefined();
  });

  it("totals and schema", () => {
    const options = races.flatMap((r) => r.choices?.find((c) => c.lineage)?.options ?? []);

    expect(options).toHaveLength(24);
    expect(options.flatMap((o) => o.spells ?? [])).toHaveLength(22);

    for (const r of races) if (r.choices) expect(RaceChoicesSchema.safeParse(r.choices).success, r.name).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test:run scripts/srd/__tests__/race-choices.test.ts`
Expected: FAIL — модуля немає.

- [ ] **Step 3: Overrides** — `scripts/srd/overrides/race-choices.ts`:

```ts
import type { AbilityCore } from "../lib/abilities";

import type { DndSkill } from "@/lib/constants/skills";
import type { FeatType } from "@/types/choices";

export type RaceChoiceTrait =
  | { kind: "lineage"; parse: "levels" | "bold" | "damage" | "bullets"; breath?: true }
  | { kind: "skill"; skills?: DndSkill[] }
  | { kind: "feat"; featTypes: FeatType[] };

export const RACE_CHOICE_TRAITS: Record<string, RaceChoiceTrait> = {
  "srd-2024_elf_elven-lineage": { kind: "lineage", parse: "levels" },
  "srd-2024_elf_keen-senses": { kind: "skill", skills: ["insight", "perception", "survival"] },
  "srd-2024_gnome_gnomish-lineage": { kind: "lineage", parse: "bold" },
  "srd-2024_tiefling_fiendish-legacy": { kind: "lineage", parse: "levels" },
  "srd-2024_dragonborn_draconic-ancestry": { kind: "lineage", parse: "damage", breath: true },
  "srd-2024_goliath_giant-ancestry": { kind: "lineage", parse: "bullets" },
  "srd-2024_human_skillful": { kind: "skill" },
  "srd-2024_human_versatile": { kind: "feat", featTypes: ["origin"] },
};

// replaced by the resistance inside the chosen ancestry
export const DROP_RACE_TRAITS: ReadonlySet<string> = new Set(["srd-2024_dragonborn_damage-resistance"]);

const giantHit = (amount: string, damageType: string): AbilityCore => ({
  trigger: { event: "hit", role: "attacker" },
  limits: { perTurn: 1, perRest: { rest: "long", uses: { formula: "prof" } } },
  effects: [{ kind: "dealDamage", amount, damageType, target: "eventTarget" }],
});

export const OPTION_ABILITIES: Record<string, Array<{ id: string; name: string; core: AbilityCore }>> = {
  "elf:drow": [{ id: "superior-darkvision", name: "Superior Darkvision", core: { trigger: { event: "passive" }, effects: [{ kind: "note", text: "Darkvision 120 ft." }] } }],
  "elf:wood-elf": [{ id: "wood-elf-speed", name: "Wood Elf Speed", core: { trigger: { event: "passive" }, effects: [{ kind: "modifyStat", stat: "speed", flat: 5 }] } }],
  "goliath:fire-giant": [{ id: "fires-burn", name: "Fire's Burn", core: giantHit("1d10", "fire") }],
  "goliath:frost-giant": [{ id: "frosts-chill", name: "Frost's Chill", core: giantHit("1d6", "cold") }],
  "goliath:hill-giant": [
    {
      id: "hills-tumble",
      name: "Hill's Tumble",
      core: { trigger: { event: "hit", role: "attacker" }, limits: { perTurn: 1, perRest: { rest: "long", uses: { formula: "prof" } } }, effects: [{ kind: "applyCondition", condition: "prone", duration: { rounds: 1 }, target: "eventTarget" }] },
    },
  ],
  "goliath:stone-giant": [
    {
      id: "stones-endurance",
      name: "Stone's Endurance",
      core: { trigger: { event: "hit", role: "target" }, limits: { perRound: 1, perRest: { rest: "long", uses: { formula: "prof" } } }, effects: [{ kind: "heal", amount: "1d12", target: "self" }, { kind: "heal", amount: { formula: "con_mod" }, target: "self" }] },
    },
  ],
};
```

(Ключ стану «повалений» — перевірити, що `"prone"` є в `CONDITION_5E_KEYS`; інакше взяти точний ключ звідти.)

- [ ] **Step 4: Converter** — `scripts/srd/convert/race-choices.ts`:

```ts
import { coreAbility, noteAbility } from "../lib/abilities";
import { type Fixture, type O5SpeciesTrait, type Open5eData, slugTail } from "../lib/open5e";
import type { RaceRow } from "../lib/types";
import { DROP_RACE_TRAITS, OPTION_ABILITIES, RACE_CHOICE_TRAITS, type RaceChoiceTrait } from "../overrides/race-choices";

import type { Ability } from "@/lib/utils/abilities/schema";
import { choiceSlug } from "@/lib/utils/characters/choices/slug";
import type { Choice, ChoiceOption } from "@/types/choices";

interface Parsed {
  name: string;
  description: string;
  spells: Array<{ level: number; spellId: string }>;
  damage?: string;
  abilityName?: string;
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export function tableRows(desc: string): string[][] {
  return desc
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.startsWith("|") && !/^\|\s*-/.test(l))
    .slice(1)
    .map((l) => l.replace(/^\||\|$/g, "").split("|").map((c) => c.trim()));
}

const knownCantrip = (cell: string) => /know the (.+?) cantrip/i.exec(cell)?.[1];

const resistanceIn = (cell: string) => /Resistance to (\w+) damage/i.exec(cell)?.[1]?.toLowerCase();

const italics = (text: string) => [...new Set([...text.matchAll(/(?<!\*)\*([^*]+)\*(?!\*)/g)].map((m) => m[1].trim()))];

function parseLineage(desc: string, parse: Extract<RaceChoiceTrait, { kind: "lineage" }>["parse"]): Parsed[] {
  if (parse === "levels") {
    return tableRows(desc).map(([name, l1, l3, l5]) => {
      const cantrip = knownCantrip(l1);

      return { name, description: l1, spells: [...(cantrip ? [{ level: 1, spellId: cantrip }] : []), { level: 3, spellId: l3 }, { level: 5, spellId: l5 }], damage: resistanceIn(l1) };
    });
  }

  if (parse === "damage") return tableRows(desc).map(([name, type]) => ({ name, description: `Damage type: ${type}`, spells: [], damage: type.toLowerCase() }));

  if (parse === "bold") {
    return [...desc.matchAll(/\*\*(.+?)\.\*\*\s*([^\n]+)/g)].map(([, name, text]) => ({ name, description: text.trim(), spells: italics(text).map((spellId) => ({ level: 1, spellId })) }));
  }

  return [...desc.matchAll(/^- \*\*(.+?) \((.+?)\)\*\*\.\s*(.+)$/gm)].map(([, abilityName, name, text]) => ({ name, abilityName, description: text.trim(), spells: [] }));
}

function toOption(p: Parsed, raceTail: string, breath: boolean): ChoiceOption {
  const id = choiceSlug(p.name);

  const extra = OPTION_ABILITIES[`${raceTail}:${id}`];

  const abilities: Ability[] = [
    ...(p.damage ? [coreAbility("resistance", `Damage Resistance (${cap(p.damage)})`, p.description, { trigger: { event: "passive" }, effects: [{ kind: "flag", flag: "resistance", damageType: p.damage, percent: 50 }] })] : []),
    ...(breath && p.damage ? [noteAbility("breath-weapon", `Breath Weapon (${cap(p.damage)})`, `Your Breath Weapon deals ${cap(p.damage)} damage.`)] : []),
    ...(extra ?? []).map((a) => coreAbility(a.id, a.name, p.description, a.core)),
    ...(!extra && p.abilityName ? [noteAbility(choiceSlug(p.abilityName), p.abilityName, p.description)] : []),
  ];

  return { id, name: p.name, description: p.description, abilities, ...(p.spells.length > 0 && { spells: p.spells }) };
}

function traitChoice(t: Fixture<O5SpeciesTrait>, spec: RaceChoiceTrait, raceTail: string): Choice {
  const base = { id: slugTail(t.pk), label: t.fields.name, description: t.fields.desc.trim(), level: 1, count: 1 };

  if (spec.kind === "skill") return { ...base, kind: "skill", ...(spec.skills && { skills: spec.skills }) };

  if (spec.kind === "feat") return { ...base, kind: "feat", featTypes: spec.featTypes };

  const parsed = parseLineage(t.fields.desc, spec.parse);

  if (parsed.length === 0) throw new Error(`${t.pk}: no lineage options parsed`);

  return { ...base, kind: "option", lineage: true, options: parsed.map((p) => toOption(p, raceTail, !!spec.breath)) };
}

export function applyRaceChoices(rows: RaceRow[], data: Open5eData): RaceRow[] {
  const traits = data.speciesTraits.filter((t) => RACE_CHOICE_TRAITS[t.pk] || DROP_RACE_TRAITS.has(t.pk));

  return rows.map((race) => {
    const own = traits.filter((t) => t.fields.parent === race.slug).sort((a, b) => a.fields.order - b.fields.order);

    if (own.length === 0) return race;

    const drop = new Set(own.map((t) => slugTail(t.pk)));

    const choices = own.flatMap((t) => {
      const spec = RACE_CHOICE_TRAITS[t.pk];

      return spec ? [traitChoice(t, spec, slugTail(race.slug))] : [];
    });

    return { ...race, abilities: race.abilities.filter((a) => !drop.has(a.id)), choices };
  });
}
```

(У таблиці Tiefling заголовок «**Table: Fiendish Legacies**» — не рядок таблиці, `tableRows` бере лише рядки з `|`. Порядок опцій — як у тексті; тест Goliath очікує алфавітний порядок, бо так у списку SRD.)

- [ ] **Step 5: Types and build** — `scripts/srd/lib/types.ts`: `RaceRow` + `choices?: Choice[];`. `scripts/srd/lib/build-data.ts`: імпорти `applyRaceChoices`, `DROP_RACE_TRAITS`, `RACE_CHOICE_TRAITS`; поруч з іншими перевірками — `assertKnown("race choice traits", [...Object.keys(RACE_CHOICE_TRAITS), ...DROP_RACE_TRAITS], pks(data.speciesTraits));`; у `out` — `races: applyRaceChoices(convertRaces(data), data),`; після побудови `out`:

```ts
  const spellNames = new Set(out.spells.map((s) => s.name));

  assertKnown("race choice spells", out.races.flatMap((r) => (r.choices ?? []).flatMap((c) => (c.options ?? []).flatMap((o) => (o.spells ?? []).map((s) => s.spellId)))), spellNames);
```

- [ ] **Step 6: Regenerate and run tests**

Run: `pnpm srd:build --source /Users/silentfox/.claude/jobs/4ad97a0b/tmp/srd`
Expected: лічильники ті самі (`races: 9`); `git status --short data/templates/srd-5.2` — змінено лише `races.json` і `manifest.json` (дата).

Run: `pnpm test:run scripts/srd && pnpm exec tsc --noEmit -p tsconfig.json`
Expected: PASS — `races.test.ts` (наявний, на `convertRaces`) без змін; `data-integrity.test.ts`: раси з `choices` проходять `importContent` dryRun без попереджень (назви заклинань розв'язуються через `loadNames` тесту).

- [ ] **Step 7: Commit**

```bash
git add scripts/srd data/templates/srd-5.2/races.json data/templates/srd-5.2/manifest.json
git commit -m "feat(srd): 4f-4 race lineages and choices — 24 options, 22 spells

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---
### Task 17: Конвертер — вибори класів (ASI/Epic Boon/стилі бою/експертиза/навички/метамагія/закляття/бінарні/опори) і списки заклинань

**Files:**
- Create: `scripts/srd/convert/class-choices.ts`, `scripts/srd/overrides/class-choices.ts`, `scripts/srd/__tests__/class-choices.test.ts`
- Modify: `scripts/srd/lib/types.ts`, `scripts/srd/convert/spells.ts`, `scripts/srd/overrides/classes.ts` (`EXTRA_COLUMNS` — колонка `metamagic`), `scripts/srd/lib/build-data.ts`
- Regenerate: `data/templates/srd-5.2/classes.json`, `data/templates/srd-5.2/spells.json`, `data/templates/srd-5.2/manifest.json`

**Interfaces:**
- Consumes: `FIXTURE_4F4_DIR`, `convertClasses`, `convertSpell(s)` (наявні); `choiceSlug` (задача 10); `coreAbility`/`noteAbility`/`AbilityCore`; `SPELLCASTING_ABILITY` (`overrides/classes.ts`).
- Produces:
  - `ClassFeatureGroup.choices?: Choice[]`, `ClassRow.spellList?: string`, `SpellRow.lists: string[]`.
  - `headingSections(desc: string): Array<{ title: string; body: string }>`, `boldOptions(desc: string): Array<{ name: string; text: string }>`, `applyClassChoices(rows: ClassRow[]): ClassRow[]`.
  - `overrides/class-choices.ts`: `FEAT_FEATURES`, `EXPERTISE_FEATURES`, `SKILL_FEATURES`, `SPELL_FEATURES`, `BINARY_FEATURES`, `RESISTANCE_FEATURES`, `EXTRA_CHOICES`, `INVOCATION_MECHANICS`.
  - Колонка `metamagic` у Sorcerer (`""` на рівні 1, `2` з 2, `4` з 10, `6` з 17).

- [ ] **Step 1: Write the failing test** — `scripts/srd/__tests__/class-choices.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { applyClassChoices, boldOptions, headingSections } from "../convert/class-choices";
import { convertClasses } from "../convert/classes";
import { convertSpells } from "../convert/spells";
import { FIXTURE_4F4_DIR, loadOpen5e } from "../lib/open5e";

import { ClassChoicesSchema } from "@/lib/schemas/choices";

const data = loadOpen5e(FIXTURE_4F4_DIR);

const classes = applyClassChoices(convertClasses(data));

const cls = (name: string) => classes.find((c) => c.name === name)!;

const groups = (name: string) => [...cls(name).features, ...cls(name).subclasses.flatMap((s) => s.features)];

const choices = (name: string) => groups(name).flatMap((g) => g.choices ?? []);

const choice = (name: string, id: string) => choices(name).find((c) => c.id === id);

const abilityIds = (name: string) => groups(name).flatMap((g) => g.abilities.map((a) => a.id));

describe("parsers", () => {
  it("### sections and bold paragraphs", () => {
    expect(headingSections("Intro\n\n### Agonizing Blast\n\n*Prerequisite: Level 2+ Warlock*\n\nText.\n\n### **Lessons of the First Ones**\n\nMore.")).toEqual([
      { title: "Agonizing Blast", body: "*Prerequisite: Level 2+ Warlock*\n\nText." },
      { title: "Lessons of the First Ones", body: "More." },
    ]);
    expect(boldOptions("Pick one.\n\n**Protector.** Martial weapons.\n\n**Thaumaturge.** One cantrip.")).toEqual([{ name: "Protector", text: "Martial weapons." }, { name: "Thaumaturge", text: "One cantrip." }]);
  });
});

describe("class choices", () => {
  it("Fighter: ASI at 4/6/8/12/14/16 and Epic Boon as feat choices; Fighting Style; notes replaced", () => {
    expect(choices("Fighter").filter((c) => c.id.startsWith("ability-score-improvement")).map((c) => c.level)).toEqual([4, 6, 8, 12, 14, 16]);
    expect(choice("Fighter", "ability-score-improvement-4")).toMatchObject({ kind: "feat", count: 1, featTypes: ["origin", "general"] });
    expect(choice("Fighter", "epic-boon-19")?.featTypes).toEqual(["origin", "general", "epicBoon"]);
    expect(choice("Fighter", "fighting-style-1")).toMatchObject({ kind: "feat", featTypes: ["fightingStyle"] });
    expect(choice("Fighter", "additional-fighting-style-7")?.featTypes).toEqual(["fightingStyle"]);
    expect(abilityIds("Fighter").some((id) => id.startsWith("ability-score-improvement") || id.startsWith("fighting-style") || id.startsWith("epic-boon"))).toBe(false);
    expect(abilityIds("Fighter")).toContain("weapon-mastery-1");
  });

  it("Paladin and Ranger Fighting Style embed Blessed / Druidic Warrior", () => {
    expect(choice("Paladin", "fighting-style-2")?.options?.map((o) => o.id)).toEqual(["blessed-warrior"]);
    expect(choice("Ranger", "fighting-style-2")?.options?.map((o) => o.id)).toEqual(["druidic-warrior"]);
  });

  it("Sorcerer: Metamagic with 9 options and the metamagic column; spell list and spell choices", () => {
    expect(choice("Sorcerer", "metamagic")).toMatchObject({ level: 2, kind: "option", count: { scale: "metamagic" } });
    expect(choice("Sorcerer", "metamagic")?.options).toHaveLength(9);
    expect(cls("Sorcerer").columns.find((c) => c.key === "metamagic")?.values).toEqual(["", ...Array(8).fill("2"), ...Array(7).fill("4"), ...Array(4).fill("6")]);
    expect(abilityIds("Sorcerer").filter((id) => id.startsWith("metamagic"))).toEqual([]);
    expect(cls("Sorcerer").spellList).toBe("Sorcerer");
    expect(choice("Sorcerer", "cantrips")).toMatchObject({ level: 1, count: { scale: "cantrips" }, kind: "spell", spells: { lists: ["Sorcerer"], minLevel: 0, maxLevel: 0 } });
    expect(choice("Sorcerer", "prepared-spells")).toMatchObject({ count: { scale: "prepared-spells" }, spells: { minLevel: 1, maxLevel: "slots" } });
  });

  it("Warlock: 28 invocations with prerequisites; Eldritch Mind and Thirsting Blade mechanized", () => {
    const inv = choice("Warlock", "eldritch-invocations");

    expect(inv).toMatchObject({ level: 1, count: { scale: "eldritch-invocation-count" } });
    expect(inv?.options).toHaveLength(28);
    expect(inv?.options?.find((o) => o.id === "thirsting-blade")).toMatchObject({ minLevel: 5, requires: ["pact-of-the-blade"], abilities: [{ effects: [{ kind: "modifyStat", stat: "attacksPerAction", flat: 1 }] }] });
    expect(inv?.options?.find((o) => o.id === "devouring-blade")?.requires).toEqual(["thirsting-blade"]);
    expect(inv?.options?.find((o) => o.id === "eldritch-mind")?.abilities[0].effects).toEqual([{ kind: "flag", flag: "saveAdvantage", abilities: ["constitution"] }]);
    expect(inv?.options?.find((o) => o.id === "lessons-of-the-first-ones")).toBeDefined();
    expect(abilityIds("Warlock").filter((id) => id.startsWith("eldritch-invocation"))).toEqual([]);
  });

  it("expertise and skills", () => {
    expect(choice("Bard", "expertise-2")).toMatchObject({ kind: "expertise", count: 2, level: 2 });
    expect(choice("Bard", "expertise-9")).toMatchObject({ kind: "expertise", count: 2, level: 9 });
    expect(choice("Rogue", "expertise-6")?.count).toBe(2);
    expect(choice("Ranger", "deft-explorer-2")).toMatchObject({ kind: "expertise", count: 1 });
    expect(abilityIds("Ranger")).toContain("deft-explorer-2");
    expect(choice("Wizard", "scholar-2")?.skills).toEqual(["arcana", "history", "investigation", "medicine", "nature", "religion"]);
    expect(choice("Barbarian", "primal-knowledge-3")).toMatchObject({ kind: "skill", count: 1, skills: cls("Barbarian").skillChoices.from });
    expect(choice("Bard", "bonus-proficiencies-3")).toMatchObject({ kind: "skill", count: 3 });
    expect(choice("Bard", "magical-discoveries-6")).toMatchObject({ kind: "spell", count: 2, spells: { lists: ["Cleric", "Druid", "Wizard"], minLevel: 0, maxLevel: "slots" } });
  });

  it("binary options and resistances", () => {
    expect(choice("Cleric", "divine-order-1")?.options?.map((o) => o.id)).toEqual(["protector", "thaumaturge"]);
    expect(choice("Cleric", "blessed-strikes-7")?.options?.find((o) => o.id === "divine-strike")?.abilities[0]).toMatchObject({ trigger: { event: "hit", role: "attacker" }, limits: { perTurn: 1 }, effects: [{ kind: "dealDamage", amount: "1d8", damageType: "radiant" }] });
    expect(choice("Ranger", "hunters-prey-3")?.options?.find((o) => o.id === "colossus-slayer")?.abilities[0].condition).toEqual({ type: "hpBelow", who: "eventTarget", percent: 100 });
    expect(choice("Sorcerer", "elemental-affinity-6")?.options?.map((o) => o.id)).toEqual(["acid", "cold", "fire", "lightning", "poison"]);
    expect(choice("Warlock", "fiendish-resilience-10")?.options).toHaveLength(12);
    expect(choice("Warlock", "fiendish-resilience-10")?.options?.some((o) => o.id === "force")).toBe(false);
  });

  it("every class: choice ids unique with each subclass, scale columns exist, schema passes", () => {
    for (const c of classes) {
      const own = c.features.flatMap((g) => g.choices ?? []);

      for (const s of [null, ...c.subclasses]) {
        const all = [...own, ...(s?.features.flatMap((g) => g.choices ?? []) ?? [])];

        expect(new Set(all.map((x) => x.id)).size, `${c.name} ${s?.id ?? ""}`).toBe(all.length);
      }

      for (const ch of [...own, ...c.subclasses.flatMap((s) => s.features.flatMap((g) => g.choices ?? []))]) {
        if (typeof ch.count !== "number") expect(c.columns.some((col) => col.key === (ch.count as { scale: string }).scale), `${c.name}: ${ch.id}`).toBe(true);
      }

      for (const g of [...c.features, ...c.subclasses.flatMap((s) => s.features)]) if (g.choices) expect(ClassChoicesSchema.safeParse(g.choices).success, `${c.name} ${g.level}`).toBe(true);
    }
  });
});

describe("spell lists", () => {
  it("Spell.classes → lists by class name", () => {
    const spells = convertSpells(data);

    expect(spells.find((s) => s.name === "Fire Bolt")?.lists).toEqual(["Sorcerer", "Wizard"]);
    expect(spells.find((s) => s.name === "Cure Wounds")?.lists).toEqual(expect.arrayContaining(["Cleric", "Druid"]));
  });
});
```

(Якщо у фікстурі `Fire Bolt` має інший набір класів — очікування брати з поля `classes` сирого запису, а не підганяти конвертер.)

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test:run scripts/srd/__tests__/class-choices.test.ts`
Expected: FAIL.

- [ ] **Step 3: Types, spells, column** —
  - `scripts/srd/lib/types.ts`: `ClassFeatureGroup` + `choices?: Choice[];`; `ClassRow` + `spellList?: string;`; `SpellRow` + `lists: string[];`.
  - `scripts/srd/convert/spells.ts`: у `convertSpell` поле результату `lists: f.classes.map((c) => titleCase(c.replace(/^srd-2024_/, ""))),` (той самий вираз, що вже будує рядок «Classes: …» в описі).
  - `scripts/srd/overrides/classes.ts`: у `EXTRA_COLUMNS` — `"srd-2024_sorcerer": [{ key: "metamagic", label: "Metamagic", values: levels((l) => (l >= 17 ? "6" : l >= 10 ? "4" : l >= 2 ? "2" : "")) }],`.

- [ ] **Step 4: Overrides** — `scripts/srd/overrides/class-choices.ts`:

```ts
import type { AbilityCore } from "../lib/abilities";

import type { DndSkill } from "@/lib/constants/skills";
import type { Choice, FeatType } from "@/types/choices";

/** ключ — хвіст id вміння без «-<рівень>» */
export const FEAT_FEATURES: Record<string, { featTypes: FeatType[]; embedded?: true }> = {
  "ability-score-improvement": { featTypes: ["origin", "general"] },
  "epic-boon": { featTypes: ["origin", "general", "epicBoon"] },
  "fighting-style": { featTypes: ["fightingStyle"], embedded: true },
  "additional-fighting-style": { featTypes: ["fightingStyle"] },
};

/** ключ — "<клас>:<хвіст>" */
export const EXPERTISE_FEATURES: Record<string, { count: number; skills?: DndSkill[]; keepAbility?: true }> = {
  "bard:expertise": { count: 2 },
  "rogue:expertise": { count: 2 },
  "ranger:deft-explorer": { count: 1, keepAbility: true },
  "ranger:expertise": { count: 2 },
  "wizard:scholar": { count: 1, skills: ["arcana", "history", "investigation", "medicine", "nature", "religion"] },
};

export const SKILL_FEATURES: Record<string, { count: number; fromClass?: true; keepAbility?: true }> = {
  "barbarian:primal-knowledge": { count: 1, fromClass: true, keepAbility: true },
  "bard:bonus-proficiencies": { count: 3 },
};

export const SPELL_FEATURES: Record<string, NonNullable<Choice["spells"]> & { count: number }> = {
  "bard:magical-discoveries": { count: 2, lists: ["Cleric", "Druid", "Wizard"], minLevel: 0, maxLevel: "slots" },
};

const strike = (damageType: string): AbilityCore => ({ trigger: { event: "hit", role: "attacker" }, limits: { perTurn: 1 }, effects: [{ kind: "dealDamage", amount: "1d8", damageType, target: "eventTarget" }] });

/** бінарні вибори з жирних абзаців; механіка — за id опції */
export const BINARY_FEATURES: Record<string, Record<string, AbilityCore>> = {
  "divine-order": {},
  "primal-order": {},
  "blessed-strikes": { "divine-strike": strike("radiant") },
  "elemental-fury": { "primal-strike": strike("fire") },
  "hunters-prey": { "colossus-slayer": { trigger: { event: "hit", role: "attacker" }, condition: { type: "hpBelow", who: "eventTarget", percent: 100 }, limits: { perTurn: 1 }, effects: [{ kind: "dealDamage", amount: "1d8", target: "eventTarget" }] } },
  "defensive-tactics": {},
};

export const RESISTANCE_FEATURES: Record<string, string[]> = {
  "elemental-affinity": ["acid", "cold", "fire", "lightning", "poison"],
  "fiendish-resilience": ["acid", "bludgeoning", "cold", "fire", "lightning", "necrotic", "piercing", "poison", "psychic", "radiant", "slashing", "thunder"],
};

/** вибори без вміння-носія в даних (рівень повторення фічі) */
export const EXTRA_CHOICES: Record<string, Choice[]> = {
  "srd-2024_bard": [{ id: "expertise-9", label: "Expertise", level: 9, count: 2, kind: "expertise" }],
};

export const INVOCATION_MECHANICS: Record<string, AbilityCore> = {
  "eldritch-mind": { trigger: { event: "passive" }, effects: [{ kind: "flag", flag: "saveAdvantage", abilities: ["constitution"] }] },
  "thirsting-blade": { trigger: { event: "passive" }, effects: [{ kind: "modifyStat", stat: "attacksPerAction", flat: 1 }] },
};
```

- [ ] **Step 5: Converter** — `scripts/srd/convert/class-choices.ts`:

```ts
import { coreAbility, noteAbility } from "../lib/abilities";
import { slugTail } from "../lib/open5e";
import type { ClassFeatureGroup, ClassRow } from "../lib/types";
import { SPELLCASTING_ABILITY } from "../overrides/classes";
import { BINARY_FEATURES, EXPERTISE_FEATURES, EXTRA_CHOICES, FEAT_FEATURES, INVOCATION_MECHANICS, RESISTANCE_FEATURES, SKILL_FEATURES, SPELL_FEATURES } from "../overrides/class-choices";

import type { Ability } from "@/lib/utils/abilities/schema";
import { choiceSlug } from "@/lib/utils/characters/choices/slug";
import type { Choice, ChoiceOption } from "@/types/choices";

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

const tailOf = (abilityId: string) => abilityId.replace(/-\d+$/, "");

export function headingSections(desc: string): Array<{ title: string; body: string }> {
  return desc
    .split(/^### /m)
    .slice(1)
    .map((chunk) => {
      const [title, ...rest] = chunk.split("\n");

      return { title: title.replace(/\*/g, "").trim(), body: rest.join("\n").trim() };
    });
}

export const boldOptions = (desc: string): Array<{ name: string; text: string }> => [...desc.matchAll(/\*\*(.+?)\.\*\*\s*([^\n]+)/g)].map(([, name, text]) => ({ name: name.trim(), text: text.trim() }));

const resistance = (type: string, description: string): Ability => coreAbility("resistance", `Resistance (${cap(type)})`, description, { trigger: { event: "passive" }, effects: [{ kind: "flag", flag: "resistance", damageType: type, percent: 50 }] });

function invocationOptions(desc: string): ChoiceOption[] {
  const sections = headingSections(desc);

  const ids = new Set(sections.map((s) => choiceSlug(s.title)));

  return sections.map(({ title, body }) => {
    const id = choiceSlug(title);

    const prereq = /\*Prerequisite: ([^*]+)\*/.exec(body)?.[1]?.trim();

    const minLevel = prereq ? /Level (\d+)\+ Warlock/.exec(prereq)?.[1] : undefined;

    const requires = prereq ? [...prereq.matchAll(/([A-Z][\w' ]+?) Invocation/g)].map((m) => choiceSlug(m[1].trim())).filter((r) => ids.has(r) && r !== id) : [];

    const text = body.replace(/\*Prerequisite: [^*]+\*\s*/, "").trim();

    const description = prereq ? `Prerequisite: ${prereq}\n\n${text}` : text;

    const mech = INVOCATION_MECHANICS[id];

    return { id, name: title, description, ...(minLevel && { minLevel: Number(minLevel) }), ...(requires.length > 0 && { requires }), abilities: [mech ? coreAbility(id, title, text, mech) : noteAbility(id, title, text)] };
  });
}

interface Ctx {
  classTail: string;
  skillFrom: ClassRow["skillChoices"]["from"];
  find: (tail: string) => Ability | undefined;
}

/** перетворює вміння-нотатку на вибір; null — вміння лишається як є */
function abilityChoice(a: Ability, level: number, ctx: Ctx): { choice: Choice; keep: boolean } | null {
  const tail = tailOf(a.id);

  const base = { id: a.id, label: a.name, description: a.description ?? "", level, count: 1 as number | { scale: string } };

  const feat = FEAT_FEATURES[tail];

  if (feat) {
    const embedded = feat.embedded ? boldOptions(a.description ?? "").map((o) => ({ id: choiceSlug(o.name), name: o.name, description: o.text, abilities: [noteAbility(choiceSlug(o.name), o.name, o.text)] })) : [];

    return { choice: { ...base, kind: "feat", featTypes: feat.featTypes, ...(embedded.length > 0 && { options: embedded }) }, keep: false };
  }

  const key = `${ctx.classTail}:${tail}`;

  const expertise = EXPERTISE_FEATURES[key];

  if (expertise) return { choice: { ...base, kind: "expertise", count: expertise.count, ...(expertise.skills && { skills: expertise.skills }) }, keep: !!expertise.keepAbility };

  const skill = SKILL_FEATURES[key];

  if (skill) return { choice: { ...base, kind: "skill", count: skill.count, ...(skill.fromClass && { skills: ctx.skillFrom }) }, keep: !!skill.keepAbility };

  const spell = SPELL_FEATURES[key];

  if (spell) {
    const { count, ...spells } = spell;

    return { choice: { ...base, kind: "spell", count, spells }, keep: false };
  }

  const binary = BINARY_FEATURES[tail];

  if (binary) {
    const options = boldOptions(a.description ?? "").map((o) => {
      const id = choiceSlug(o.name);

      return { id, name: o.name, description: o.text, abilities: [binary[id] ? coreAbility(id, o.name, o.text, binary[id]) : noteAbility(id, o.name, o.text)] };
    });

    return { choice: { ...base, kind: "option", options }, keep: false };
  }

  const types = RESISTANCE_FEATURES[tail];

  if (types) return { choice: { ...base, kind: "option", options: types.map((t) => ({ id: t, name: cap(t), abilities: [resistance(t, a.description ?? "")] })) }, keep: false };

  if (tail === "metamagic" && level === 2) {
    const options = headingSections(ctx.find("metamagic-options")?.description ?? "").map(({ title, body }) => ({ id: choiceSlug(title), name: title, description: body, abilities: [noteAbility(choiceSlug(title), title, body)] }));

    return { choice: { ...base, id: "metamagic", count: { scale: "metamagic" }, kind: "option", options }, keep: false };
  }

  if (tail === "eldritch-invocations") return { choice: { ...base, id: "eldritch-invocations", count: { scale: "eldritch-invocation-count" }, kind: "option", options: invocationOptions(ctx.find("eldritch-invocation-options")?.description ?? "") }, keep: false };

  return null;
}

const DROPPED_TAILS = new Set(["metamagic", "metamagic-options", "eldritch-invocation-options"]);

function transform(groups: ClassFeatureGroup[], ctx: Ctx): ClassFeatureGroup[] {
  return groups.map((g) => {
    const choices: Choice[] = [...(g.choices ?? [])];

    const abilities = g.abilities.filter((a) => {
      const made = abilityChoice(a, g.level, ctx);

      if (made) choices.push(made.choice);

      return made ? made.keep : !DROPPED_TAILS.has(tailOf(a.id));
    });

    return { level: g.level, abilities, ...(choices.length > 0 && { choices }) };
  });
}

function spellChoices(c: ClassRow): Choice[] {
  const has = (key: string) => c.columns.some((col) => col.key === key);

  return [
    ...(has("cantrips") ? [{ id: "cantrips", label: "Cantrips", level: 1, count: { scale: "cantrips" }, kind: "spell" as const, spells: { lists: [c.name], minLevel: 0, maxLevel: 0 } }] : []),
    ...(has("prepared-spells") ? [{ id: "prepared-spells", label: "Prepared Spells", level: 1, count: { scale: "prepared-spells" }, kind: "spell" as const, spells: { lists: [c.name], minLevel: 1, maxLevel: "slots" as const } }] : []),
  ];
}

function addAt(groups: ClassFeatureGroup[], extra: Choice[]): ClassFeatureGroup[] {
  const out = groups.map((g) => ({ ...g }));

  for (const choice of extra) {
    const group = out.find((g) => g.level === choice.level);

    if (group) group.choices = [...(group.choices ?? []), choice];
    else out.push({ level: choice.level, abilities: [], choices: [choice] });
  }

  return out.sort((a, b) => a.level - b.level);
}

export function applyClassChoices(rows: ClassRow[]): ClassRow[] {
  return rows.map((c) => {
    const all = [...c.features, ...c.subclasses.flatMap((s) => s.features)].flatMap((g) => g.abilities);

    const ctx: Ctx = { classTail: slugTail(c.slug), skillFrom: c.skillChoices.from, find: (tail) => all.find((a) => tailOf(a.id) === tail) };

    const caster = !!SPELLCASTING_ABILITY[c.slug];

    const features = addAt(transform(c.features, ctx), [...(caster ? spellChoices(c) : []), ...(EXTRA_CHOICES[c.slug] ?? [])]);

    return { ...c, ...(caster && { spellList: c.name }), features, subclasses: c.subclasses.map((s) => ({ ...s, features: transform(s.features, ctx) })) };
  });
}
```

(`metamagic-10` має хвіст `metamagic` і рівень 10 → `abilityChoice` повертає `null`, `DROPPED_TAILS` прибирає вміння — кількість росте колонкою. Порядок виборів у групі рівня 1 заклинача: спершу вибори з вмінь, потім `cantrips`/`prepared-spells`.)

- [ ] **Step 6: Build wiring** — `scripts/srd/lib/build-data.ts`: імпорт `applyClassChoices`; `classes: applyClassChoices(convertClasses(data)),`; після `out` — `assertKnown("extra class choices", Object.keys(EXTRA_CHOICES), pks(data.classes));` (імпорт `EXTRA_CHOICES`).

- [ ] **Step 7: Regenerate and run tests**

Run: `pnpm srd:build --source /Users/silentfox/.claude/jobs/4ad97a0b/tmp/srd`
Expected: лічильники незмінні; змінено лише `classes.json`, `spells.json`, `manifest.json`.

Run: `pnpm test:run scripts/srd && pnpm exec tsc --noEmit -p tsconfig.json`
Expected: PASS — `classes.test.ts`/`classes-4f2.test.ts` (на `convertClasses`) без змін; `data-integrity-4f2.test.ts` (≤ 12 колонок у Sorcerer: стало 4); `data-integrity.test.ts` (класи з виборами й заклинання з `lists` проходять `importContent` dryRun).

- [ ] **Step 8: Commit**

```bash
git add scripts/srd data/templates/srd-5.2/classes.json data/templates/srd-5.2/spells.json data/templates/srd-5.2/manifest.json
git commit -m "feat(srd): 4f-4 class choices (ASI, epic boons, fighting styles, expertise, metamagic, invocations) and spell lists

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---
### Task 18: Цілісність даних 4f-4, остаточна регенерація, перезаливка локального шаблону, регрес HOMM5

**Files:**
- Create: `scripts/srd/__tests__/data-integrity-4f4.test.ts`
- Regenerate (за потреби): `data/templates/srd-5.2/*.json`

**Interfaces:**
- Consumes: усе попереднє.

- [ ] **Step 1: Write the failing test** — `scripts/srd/__tests__/data-integrity-4f4.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { readSrdData } from "../lib/data-files";
import type { ClassRow } from "../lib/types";

const data = readSrdData();

const groups = (c: ClassRow) => [...c.features, ...c.subclasses.flatMap((s) => s.features)];

const classChoices = data.classes.flatMap((c) => groups(c).flatMap((g) => g.choices ?? []));

const byKind = (kind: string) => classChoices.filter((c) => c.kind === kind);

const SPELL_LIST_COUNTS: Record<string, number> = { Wizard: 218, Sorcerer: 140, Bard: 130, Druid: 124, Cleric: 109, Warlock: 72, Ranger: 48, Paladin: 38 };

describe("SRD 5.2 data: 4f-4", () => {
  it("17 feats: 4 origin, 2 general, 4 fighting styles, 7 epic boons; ASI, Skilled, Magic Initiate repeatable", () => {
    const count = (type: string) => data.feats.filter((f) => f.type === type).length;

    expect([count("origin"), count("general"), count("fightingStyle"), count("epicBoon")]).toEqual([4, 2, 4, 7]);
    expect(data.feats.filter((f) => f.repeatable).map((f) => f.name).sort()).toEqual(["Ability Score Improvement", "Magic Initiate", "Skilled"]);
  });

  it("race choices: 24 lineage options, 22 spells, every spell name exists", () => {
    const options = data.races.flatMap((r) => r.choices?.find((c) => c.lineage)?.options ?? []);

    const names = new Set(data.spells.map((s) => s.name));

    const refs = options.flatMap((o) => o.spells ?? []);

    expect(options).toHaveLength(24);
    expect(refs).toHaveLength(22);
    expect(refs.filter((s) => !names.has(s.spellId))).toEqual([]);
    expect(data.races.filter((r) => r.choices?.length).map((r) => r.name).sort()).toEqual(["Dragonborn", "Elf", "Gnome", "Goliath", "Human", "Tiefling"]);
  });

  it("101 class choices: 67 feat, 7 expertise, 2 skill, 15 spell, 10 option", () => {
    expect(classChoices).toHaveLength(101);
    expect([byKind("feat").length, byKind("expertise").length, byKind("skill").length, byKind("spell").length, byKind("option").length]).toEqual([67, 7, 2, 15, 10]);
    expect(classChoices.filter((c) => c.id.startsWith("ability-score-improvement"))).toHaveLength(51);
    expect(classChoices.filter((c) => c.id === "epic-boon-19")).toHaveLength(12);
  });

  it("every feat type a choice offers has at least one feat", () => {
    const types = new Set(data.feats.map((f) => f.type));

    for (const c of [...classChoices, ...data.races.flatMap((r) => r.choices ?? [])].filter((x) => x.kind === "feat")) for (const t of c.featTypes ?? []) expect(types.has(t), `${c.id}: ${t}`).toBe(true);
  });

  it("8 spell lists, each matches Spell.classes counts", () => {
    const casters = data.classes.filter((c) => c.spellList);

    expect(casters.map((c) => c.name).sort()).toEqual(Object.keys(SPELL_LIST_COUNTS).sort());

    for (const c of casters) expect(data.spells.filter((s) => s.lists.includes(c.spellList as string)).length, c.name).toBe(SPELL_LIST_COUNTS[c.name]);
  });

  it("metamagic 9 options, invocations 28; scale columns exist", () => {
    expect(classChoices.find((c) => c.id === "metamagic")?.options).toHaveLength(9);
    expect(classChoices.find((c) => c.id === "eldritch-invocations")?.options).toHaveLength(28);

    for (const c of data.classes) for (const ch of groups(c).flatMap((g) => g.choices ?? [])) if (typeof ch.count !== "number") expect(c.columns.some((col) => col.key === (ch.count as { scale: string }).scale), `${c.name}: ${ch.id}`).toBe(true);
  });
});
```

- [ ] **Step 2: Run test**

Run: `pnpm test:run scripts/srd/__tests__/data-integrity-4f4.test.ts`
Expected: PASS (дані вже згенеровано в задачах 15–17). Якщо якийсь лічильник не збігається — з'ясувати причину в конвертері (не підганяти число), виправити, повторити `pnpm srd:build --source /Users/silentfox/.claude/jobs/4ad97a0b/tmp/srd`.

- [ ] **Step 3: Final regenerate**

Run: `pnpm srd:build --source /Users/silentfox/.claude/jobs/4ad97a0b/tmp/srd`
Expected: `spell-groups: 8, spells: 339, races: 9, classes: 12, feats: 17, units: 331, artifacts: 331`, `composed names verified: 513`; `git status --short data/templates/srd-5.2` — порожньо або лише `manifest.json` (дата).

- [ ] **Step 4: SRD and content tests**

Run: `pnpm test:run scripts/srd lib/server/content lib/utils/content`
Expected: PASS (зокрема `importContent` dryRun для 17 рис, 9 рас з виборами, 12 класів з виборами, 339 заклинань із `lists`; OpenAPI `< 145_000`).

- [ ] **Step 5: Reload the local template**

Run: `pnpm constructor:srd-template`
Expected: `5e SRD 5.2: <id>`; рядок `feats: created 17, updated 0, skipped 0, error 0`; `error 0` в усіх видах; exit 0. Повторний запуск — `feats: created 0, updated 17`, `error 0`. Перевірка (очікується `17|6|339|8|0`):

```bash
psql "postgresql://postgres:postgres@localhost:54322/constructor" -At -c "
with k as (select id from campaigns where name = '5e SRD 5.2')
select
  (select count(*) from feats where \"campaignId\" in (select id from k)),
  (select count(*) from races where \"campaignId\" in (select id from k) and jsonb_array_length(choices) > 0),
  (select count(*) from spells where \"campaignId\" in (select id from k) and jsonb_array_length(lists) > 0),
  (select count(*) from classes where \"campaignId\" in (select id from k) and \"spellList\" is not null),
  (select count(*) from races where \"campaignId\" in (select id from k) and choices::text like '%\"spellId\": \"Druidcraft\"%');"
```

(Останнє число 0 — назви заклинань у виборах рас розв'язано в id.)

- [ ] **Step 6: HOMM regression — engine and route tests**

Run: `pnpm test:run lib/utils/battle lib/utils/abilities "app/api/campaigns/[id]/battles" app/api/__tests__ lib/utils/characters lib/utils/rules lib/utils/inventory lib/server/characters "app/api/campaigns/[id]/characters"`
Expected: PASS.

- [ ] **Step 7: Existing tests untouched**

Run: `git diff --name-status $(git log --format=%H -1 -- docs/archive/superpowers/plans/2026-10-23-constructor-4f4-choices.md)..HEAD -- '*.test.ts' '*.test.tsx' | grep -v '^A'`
Expected: лише `M	scripts/srd/__tests__/preset.test.ts`, `M	scripts/srd/__tests__/build-data.test.ts`, `M	scripts/srd/__tests__/data-integrity.test.ts`, `M	lib/utils/content/import/__tests__/fields.test.ts`, `M	lib/server/content/__tests__/import-content.test.ts`, `M	lib/server/content/__tests__/openapi.test.ts`, `M	lib/server/content/__tests__/openapi-4f2.test.ts`. Будь-який інший рядок — повернути наявний тест (`git checkout <base> -- <file>`) і виправити код.

- [ ] **Step 8: Commit**

```bash
git add scripts/srd/__tests__/data-integrity-4f4.test.ts data/templates/srd-5.2
git commit -m "test(srd): 4f-4 data integrity — feats, lineages, class choices, spell lists

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 19: Документи й повна перевірка

**Files:**
- Modify: `docs/architecture/battle.md`, `docs/architecture/abilities.md`, `docs/architecture/content-api.md`, `docs/STATUS.md`, `docs/archive/superpowers/constructor-handoff.md`

- [ ] **Step 1: `battle.md`** — новий розділ перед «## Changing battle behavior» (після «## 5e: магічні предмети (етап 4f-3)»):

```markdown
## 5e: риси й вибори (етап 4f-4)

- **Модель** — `Choice` (`types/choices.ts`; Zod — `lib/schemas/choices.ts`): `kind` `option | feat | skill | expertise | abilityScore | spell`, `count` — число або колонка класу `{ scale }`, `level` (рівень у класі / загальний), `lineage` (лише раса, ≤ 1; назва опції → `Character.subrace`). Власники: `races.choices`, фічі класу/підкласу `{ level, abilities, choices }`, `feats.choices` (без виду `feat`). Піки — `Picks = Record<choiceId, ChoicePick[]>` у `Character.raceChoices`, `Character.classes[i].choices`, `Character.feats [{ id, picks?, source: origin | dm }]`.
- **Чисті функції без zod** — `lib/utils/characters/choices/`: `resolveChoiceCount`, `validatePicks`, `visitPicks`, `pendingCount`, `abilityScoreDelta`/`capIssues`, `planChoices` (закриті вибори — `CHOICE_LOCKED`, права на риси ДМ, походження ≤ 1, межа ASI лише для характеристик з додатною дельтою), `choiceSelections` (групи вмінь для рушія), `prunePicks`.
- **Збереження** — `resolveCharacterChoices` (`lib/server/characters/choices/`) для створення, чернетки, `PUT …/characters/[id]/choices` (ДМ або власник при `allowPlayerEdit`; 409 в активному бою; журнал `choices_edit`) і level-up з `choices` (без — як раніше). ASI пишеться в базові колонки дельтою в тій самій транзакції. Класовий PATCH ігнорує вхідні `classes[].choices` (`keepStoredPicks`).
- **Рушій** — `createBattleParticipantFromCharacter`: `choiceSelections` → `collectCharacterAbilities({ choiceGroups })`: опції раси — джерело `race`, опції класу — `class` з `applyClassScale`, риси — `feat`, навички й експертиза — синтетичні `flag skillProficiency`/`skillExpertise` (джерело `character:choices`); заклинання опцій раси (до загального рівня) і вибори `spell` зливаються з `knownSpells`. Риси вантажаться (`loadFeatsById`, кеш `getCachedFeats`) лише коли є піки чи `Character.feats` у режимі класів. Невідомі опції/риси/заклинання тихо пропускаються. У snapshot нічого нового.
- **`"slots"`** у виборі `spell` = найвище коло слотів цього класу самого (`maxSlotLevelFor`; пакт — коло пакту).
- **Лист** — `identity.subrace`, `choices: SheetChoices` (риси з піками, опції класів, джерела заклинань, `pending`), навички з експертизою (`expertise: true`, подвійна майстерність).
```

- [ ] **Step 2: `abilities.md`** — рядок у кінець:

```markdown
- Етап 4f-4 (риси й вибори): джерело `AbilitySource.type: "feat"` (`id` риси); вміння з виборів — `collectCharacterAbilities({ choiceGroups })` після класових (опції раси — `race`, опції класу — `class` з масштабом класу, синтетичні навички — `character:choices`); прапорець `skillExpertise { skills }` — `checkBonus` подвоює майстерність навички, лише якщо вона є; `read.ts` — `featAbilities`, `readChoiceList` (вміння опцій виборів). Деталі — [battle.md](battle.md) «5e: риси й вибори».
```

- [ ] **Step 3: `content-api.md`** — у вступі до переліку видів додати `риси (feats)`; новий розділ після «## Монстри 5e (етап 4e)»:

```markdown
## Риси й вибори (етап 4f-4)

- Вид `feats` (`/feats`, `featId`): `name`, `icon?`, `type` (`origin | general | fightingStyle | epicBoon`), `prerequisite { level?, scores?: { abilities, min }, text? }`, `repeatable`, `description?`, `abilities`, `choices` (без виду `feat`). Видалення риси, яку тримає герой (у `feats`, `raceChoices` чи `classes`), — 409 `FEAT_IN_USE`. Кеш — `ReferenceKind.FEATS`; бандл/синхронізація — таблиця `feats` після `classes`.
- `Choice` — спільна схема OpenAPI (`$ref`); поля `races.choices` (лише числова кількість, ≤ 1 `lineage`; `options[].spells[].spellId` — id заклинання), `features[].choices` класів і підкласів (кількість `{ scale }` — колонка таблиці класу; id виборів унікальні в межах класу й кожного підкласу), `classes.spellList` (тег списку), `spells.lists` (≤ 20 тегів).
- Імпорт: поле `ImportField.nestedRef { kind, key }` для JSON-колонок — `resolveNestedRefs` замінює назви на id у властивості `key` будь-якої глибини (раса: `{ kind: "spells", key: "spellId" }`), експорт CSV повертає назви. Порядок шаблону SRD: spell-groups → spells → races → classes → feats → units → artifacts.
- `PUT /api/campaigns/{id}/characters/{characterId}/choices` (сесія, поза OpenAPI): `{ raceChoices?, feats?, classChoices?: Record<classId, Picks> }` → персонаж; відмови `CHOICE_*`, `FEAT_*`, `SKILL_NOT_ALLOWED`, `EXPERTISE_NEEDS_PROFICIENCY`, `SPELL_NOT_IN_LIST`, `ABILITY_SCORE_CAP`, `CHOICES_NEED_CLASSES`, `ORIGIN_FEAT_ONLY_ONE`, `DM_FEAT_ONLY_DM` (422/403) з `issues [{ path, code, message }]`. Створення персонажа приймає `raceChoices`, `feats`, `classes[].choices`; level-up — `choices`; чернетка гравця — `choices { raceChoices?, feats?, classChoices? }`.
- Міграція `20261103000000_choices_feats`.
```

У розділ «Шаблон SRD 5.2» — пункт «4f-4»: джерела `Feat.json`/`FeatBenefit.json` (md5 у `OPEN5E_FILES`), 17 рис (`convert/feats.ts`, механіка — `overrides/feats.ts`), вибори рас (`convert/race-choices.ts`: таблиці, жирні абзаци, список; 24 опції, 22 заклинання назвами → `nestedRef`), 101 вибір класів (`convert/class-choices.ts`, `overrides/class-choices.ts`; синтетична колонка `metamagic`), `Spell.classes` → `lists`, `spellList` = назва класу для 8 заклиначів.

- [ ] **Step 4: `STATUS.md`** — у рядку «Конструктор кампаній» замінити хвіст про 4f-4 (наступний крок) на «**4f-4 «вибір при створенні й рівні» готовий** (модель `Choice`, тип контенту «Риси», вибори рас/класів/рис, ASI дельтою в характеристики, `PUT …/choices`, `skillExpertise`, списки заклинань тегами; конвертер: 17 рис, 24 опції ліній, 101 вибір класів; спек — розділ 4f-4, план `docs/archive/superpowers/plans/2026-10-23-constructor-4f4-choices.md`; опис — `docs/architecture/battle.md` «5e: риси й вибори»); далі живий прогін 4f-4, потім 4f-5». Дата «_Оновлено:_» — дата виконання.

- [ ] **Step 5: `constructor-handoff.md`** — у «Стан» рядок про 4f-4 (той самий зміст одним реченням); відкладене: передісторії (після 4f-5), вибір параметра предмета при видачі, безкоштовний каст «1 / довгий» (лінії, Magic Initiate), Breath Weapon драконороджених, Weapon Mastery, метамагія/закляття як активні ефекти, Great Weapon Fighting/Savage Attacker, вибір характеристики заклинань лінії/риси, `skillChoices` класу як вибір, інструменти й мови, AI-контекст рис (`ai/tools/party.ts`), бейдж невибраних у списку персонажів ДМ, Paladin/Ranger 1-го рівня без слотів (`casterLevel` половинного заклинача з 2-го рівня — підготовлені заклинання недоступні до 2-го), правка ASI вручну ДМ між виборами (відкат може вийти за межі); «Наступний крок» — «живий прогін 4f-4 за §10 спеку (десктоп + 500 px, окремий субагент, локальна БД `constructor`, шаблон уже перезалито), потім спек і план 4f-5».

- [ ] **Step 6: Full verification**
  - `pnpm install --frozen-lockfile` — без змін lockfile.
  - `pnpm test:run` — усі зелені (відомий нестабільний `lib/hooks/battle/__tests__/battle-fx.test.tsx` — перезапустити окремо).
  - `pnpm lint` — 0 errors (`pnpm lint --fix` для порядку імпортів і порожніх рядків; повторити).
  - `pnpm build` — успішно.
  - `set -a; source .env.local; set +a; pnpm battle-sweep --campaign cmuylhk0c0001ia06lg5eommv` — exit 0, без регресу HOMM (звіт `<tmp>/battle-sweep/battle-sweep.md`; відомий нестабільний сценарій лабіринту — перезапустити один раз). Нові помилки — знайти коміт прогоном sweep на попередніх комітах цього плану (без `git stash`) і виправити окремим комітом.

- [ ] **Step 7: Commit**

```bash
git add docs/architecture/battle.md docs/architecture/abilities.md docs/architecture/content-api.md docs/STATUS.md docs/archive/superpowers/constructor-handoff.md
git commit -m "docs(constructor): 4f-4 choices and feats — architecture, status, handoff

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

- [ ] **Step 8:** звіт контролеру: список комітів, відхилення від плану (і чому), розмір документа OpenAPI, лічильники `pnpm srd:build` і перезаливки шаблону, нестабільні тести.

(Фінальне рев'ю opus, `/simplify` і живий прогін за §10 спеку — Wood Elf Wizard 1 з Alert, 3 кантрипи й 4 підготовлені лише зі списку Wizard (Cure Wounds — відмова); Infernal Tiefling Fighter 1 з Archery → +2 до дальньої атаки, опір вогню, Fire Bolt у книзі; Rogue 1 з Expertise Stealth → кидок з листа з подвійною майстерністю; Fighter → рівень 4: крок «Вибори рівня», ASI +2 STR (17 → 19), відмова при 20; Warlock 5 — закляття з `minLevel`/`requires`; «Обрати пізніше» → бейдж на листі; HOMM-кампанія без змін — окремий субагент після задачі 19.)
