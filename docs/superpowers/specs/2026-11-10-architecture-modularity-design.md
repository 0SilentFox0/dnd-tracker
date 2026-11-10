# Архітектурна модульність: ядро / система / пакет шаблону

Дата: 2026-11-10. Гілка `feat/wfrp` (не мерджити і не пушити: WFRP off main до кінця епіку). Це результат п.0 чекліста [STATUS](../../STATUS.md): оцінка + spec рефакторингу. Перенесення коду не починати до рішення користувача.
Вхід: п'ять розвідувальних звітів (протікання меж, БД, реєстри + експеримент «4-й шаблон», пакети й інструментарій, дайджест). Посилання `file:line` — на стан `feat/wfrp`, 10+ перевірено в коді.

## 1. Мета і критерії успіху

Є три шаблони (Heroes/HoMM, SRD 5e, Grim d100/WFRP). Ціль: дані й код перевикористовуються в чітких межах; новий шаблон збирається з наявного (або дописується модуль системи), не торкаючись core і чужих шаблонів. Робиться ДО заливки іконок і prod-контенту. Сила й гнучкість архітектури важливіші за швидкість merge (рішення користувача).

Вимірювані критерії (назви цілей з експерименту «4-й шаблон», розд. 6):

| Ціль | Зараз | Після |
|---|---|---|
| А: 4-й пакет на наявній системі | 9 кроків, 3 core-файли (`lib/constants/campaigns.ts:21`, `template-locales.ts:8`, `template-translations.ts:8`) + копія ~10 файлів `scripts/grim` | 0 файлів core: тека `data/templates/<key>/` + (опційно) build-адаптер у `scripts/templates/<key>/`; `template:validate <key>` зелений |
| Б: нова рульова система | ~19 пунктів, ~50 файлів, ~40 правок core | тека `systems/<id>/` + 2 рядки реєстрів (логіка, UI) + `data/templates/...`; 0 правок core-типів, ESLint-конфігу, i18n-scopes, тестів реєстру |
| Захист | deny-list за іменами | allow-list за теками + ratchet; новий пакет/система захищені автоматично |
| Перевірка | синтетичний 4-й пакет відсутній | fixture-тест: фіктивний пакет і фіктивна система проходять валідатор/реєстр без правок core |

## 2. Оцінка поточного стану

| Вісь | Оцінка | Обґрунтування |
|---|---|---|
| Новий пакет | 7/10 | Шаблон = рядок `campaigns` (`prisma/schema.prisma:51,57`), міграцій не треба; контент-пайплайн спільний (`importContent`, `publishTemplate`). Мінус: 3 ручні реєстри без exhaustiveness (`template-locales.ts:8`, `template-translations.ts:8`, `scripts/srd/i18n/templates.ts:14` з типом `"srd"\|"grim"`), `scripts/grim` не параметризований, валідатор пакета є лише в Grim, Heroes не пакет |
| Нова система | 3/10 | `RULE_SYSTEM_KEYS` закритий (`lib/constants/rules.ts:7`), `characteristics.kind: "d20"\|"wfrp"` (`systems/types.ts:287`), `combat.dice: 20\|100` (`:242`), ~45 гілок за системою у ~32 файлах, wfrp-поля в core-типах (`types/battle.ts:16,159,190`) |
| БД | 7/10 | Колонки системи чи шаблону на контентних таблицях немає (система в `rules.system.key` JSON), нейтральні JSON-слоти є (`characteristics`, `system_stats`, `races.profile`). Мінус: немає `slug` ніде в `schema.prisma`, `careers_base` вручну (`:789`), d20-колонки типізовані |
| Реєстри | 5/10 | `RULE_SYSTEM_REGISTRY`, `SYSTEM_UI`, `CONTENT_RESOURCES` exhaustive; шаблонні — `Record<string,…>`; новий вид контенту = ~14 точок, половина без перевірки типів |
| Захист меж | 4/10 | ESLint = deny-list за іменем (`eslint.config.mjs:50-62`: `wfrp*`, `d20*`, `maze*`); `types/` поза межею; ~190 нетестових файлів згадують `wfrp`; `lib/` імпортує зі `scripts/` (`lib/srd/i18n/catalog.ts:3`) |
| Документація | 4/10 | 11 розбіжностей doc ↔ код у `rule-systems.md` (розд. 7, E1.12) |

### Топ-10 протікань

| # | Протікання | Де | Ціна |
|---|---|---|---|
| 1 | Закритий union систем, `kind`, `dice` | `rules.ts:7`, `systems/registry.ts:9`, `types.ts:242,287`, `rules/schema.ts:82` | M |
| 2 | wfrp-поля в core-типах | `types/battle.ts:16,159,190`, `types/characters.ts:241`, `types/attack.ts` (`Percentile*`) | L |
| 3 | d20 = core, `systems/d20` порожній (~25 рядків) | 65 файлів `ABILITY_KEYS`, 45 `armorClass`, 48 `spellSlots` | L (E2) |
| 4 | Шаблони без реєстру, `SRD_TEMPLATE_NAME` у 9 core-файлах | `compendium-import/repository.ts:52`, `presentation.ts:38`, `useTemplates.ts:10` | M |
| 5 | wfrp-ефекти в спільній ability-схемі | `lib/utils/abilities/schema/{kinds,effects}.ts`, `registry/effects/index.ts` | M |
| 6 | AI-проєкції за `=== "wfrp"` | `read-service.ts:36`, `ai/tools/{party,reference}.ts`, `ai/context/prompt.ts:85` | M |
| 7 | wfrp-код усередині core battle | `attack/process/run.ts:83` (`judgeWfrp`), `turn/initiative.ts:49`, `attack.wfrp` у 9 файлах | M |
| 8 | wfrp UI поза `components/systems` | 10 компонентів `components/battle`, `d100`-прапор у `flows/attack-flow.ts` | M |
| 9 | `isWfrpCampaign` + `WFRP_*_EXTRA` | `lib/server/campaigns/system-key.ts:6`, `app/campaigns/[id]/layout.tsx`, `lib/i18n/scopes.ts:48-53` | M |
| 10 | Дубль прав: `WFRP_ONLY` проти `unusedMechanics` | `components/rules/RulesForm.tsx:33,71` | S |

### Три висновки

1. **Шаблони нерівноправні.** Heroes не пакет (немає в `data/templates/`, шаблон = експорт живої HOMM5-кампанії через `scripts/constructor/create-official-templates.ts`, `templateKey = null`); систем реалізовано дві (`d20/` обслуговує і `homm`, і `dnd5e`; `wfrp/`), а шаблонів три.
2. **Вісь пакетів майже готова:** для 4-го пакета на наявній системі бракує реєстру, slug, стабільних шляхів і спільного CLI, але не міграцій і не логіки.
3. **d20 де-факто є core:** хуки реєстру делегують у код, що гілкується за `damageModel`; wfrp — єдина «справжня» надбудова, а її інтерфейс сам протікає wfrp-типами.

## 2.1 Обсяг і не-цілі

У обсязі цього spec: E0 і E1 (до merge) та рамки E2/E3. Не в обсязі й не змінюється:

- жива кампанія HOMM5, d20-колонки Prisma, d20-логіка бою до E2;
- політика мови контенту: English = канон, `uk` = overlay без колонок перекладу в БД (змінюється лише ключ накладання);
- інваріанти CLAUDE.md: `runBattleMutation`, `snapshot` + `snapshotHash`, `advanceTurn`, `applyDamageConsequences`, `collectModifiers`/`runAbilities`, `computeFairScaling`, expand-only міграції з RLS, i18n без кирилиці в коді;
- map modes (maze) лишаються еталоном, але переводяться на allow-list окремим малим кроком після E1.11;
- Reuse-перелік — розд. 9; нових залежностей npm немає.

Порядок залежностей E0: E0.1 → E0.2 → (E0.3 ∥ E0.4) → E0.5 → (E0.6 ∥ E0.7 ∥ E0.8 ∥ E0.9) → E0.10 → E0.11 → E0.12; E1.1 може йти паралельно з E0 (інші файли), решта E1 — після E0.2.

## 3. Рішення

Рішення користувача:

| # | Рішення |
|---|---|
| U1 | Амбіція: повна симетрія систем (d20 теж модуль, не core), поетапно |
| U2 | Heroes переводиться в пакет `data/templates` ДО merge |
| U3 | Цей spec = перший етап епіку «Модулі»; доменні модулі — після merge |
| U4 | До merge робиться все по пакетах (не лише блокери заливки) |
| U5 | Дизайн за розділами схвалено |
| U6 | Ключі шаблонів: `srd-5.2` (з версією), `grim-d100`, `heroes-homm`; порожні оболонки — `srd-5.2-empty`, `grim-d100-empty` (ruling архітектора) |
| U7 | Heroes стає повноцінним перекладеним шаблоном: EN-база + uk-overlay робляться зараз, у E0, разом із переведенням у пакет |

Рішення архітектора:

| # | Рішення (стисло) |
|---|---|
| R1 | Три шари: core / `systems/<id>/` (одне `RuleSystemDefinition` назовні) / `data/templates/<key>/` (лише дані) |
| R2 | Залежності односторонні: пакет → система → core; система не імпортує систему; у пакеті немає коду |
| R3 | Маніфест: key, system, назви, locales, rules, іконки, `include` (збірка з частин пакетів тієї ж системи, provenance, без runtime-звʼязку) |
| R4 | Один `TEMPLATE_REGISTRY` з маніфестів замінює `*_TEMPLATE_NAME`, `TEMPLATE_LOCALIZATIONS`, `DICTIONARIES`, `I18N_TEMPLATES`; `lib/` не імпортує зі `scripts/` |
| R5 | Один CLI `template:<build\|validate\|import\|publish\|icons\|i18n> <key>`, спільний валідатор; source-специфічне — build-адаптер у `scripts/` |
| R6 | `slug` на контентних і `*_base` таблицях, унікальність (кампанія, вид), careers у генератор |
| R7 | Шлях іконки `templates/<templateKey>/<kind>/<slug>-<sha8>.webp` (hash вмісту зберігає immutable-кеш: заміна іконки = новий URL); `career-icons` у `ICON_BUCKETS`; `isSharedAssetUrl` знає префікс |
| R8 | Переклад за `(kind, slug, поле)`; хеш англійського тексту лише позначає застарілий |
| R9 | `templateKey` окремо від відображуваної назви; ключі = імена тек |
| R10 | Ключ системи — рядок, перевірений реєстром; закритих union у core немає; БД не змінюється |
| R11 | Core-типи: непрозорий слот `system: { key; data }` замість wfrp-полів |
| R12 | Диспетчери замість `=== "wfrp"`: схеми, резолвер атаки, ініціатива, `ai`, UI-слоти, i18n-простори, приховані механіки |
| R13 | ESLint allow-list за теками, ratchet «літерали поза теками», exhaustiveness реєстрів, generic-тест валідатора, тести системи в `systems/<id>/__tests__` |
| R14 | d20-колонки лишаються legacy; борги БД — окремі кроки E2 після деплою; нові міграції лише expand-only з RLS |
| R15 | Heroes: одноразовий експорт у пакет, id рядків зберігаються, репетиція на prodcopy, HOMM5 не змінюється |
| R16 | Етапи E0 (пакети), E1 (інтерфейс системи), після merge E2 (винесення d20) і E3 (домени) |
| R17 | `include` дозволений між пакетами одного модуля системи (не лише одного ключа): Heroes (`homm`) може брати частини SRD (`dnd5e`), бо обидва обслуговує d20-модуль; придатність рядка вирішує валідатор цільового пакета |
| R18 | Ще не задеплоєну wfrp-міграцію `battle_scenes.momentum` переписати до merge на нейтральну JSONB-колонку `system_state` (крок E1.2); `characteristics` уже нейтральна і лишається. Після merge такі правки можливі лише як expand-only |
| R19 | Slug Heroes — англійські, зафіксовані вручну в data-файлах (не транслітерація), щоб пережити майбутню EN-базу контенту |

## 4. Цільова архітектура

### 4.1 Шари і каталоги

```
types/, lib/, app/, components/, prisma/      core: платформа й рушій; не знає id систем і ключів шаблонів
  lib/utils/rules/systems/{types,registry}.ts     композиційний корінь логіки (єдине місце, що імпортує @/systems/*)
  components/systems/registry.ts                  композиційний корінь UI
  lib/utils/templates/{manifest,registry}.ts      TemplateManifest, TEMPLATE_REGISTRY (client-safe)
  lib/server/templates/dictionaries.ts            server-only завантаження словників
systems/<id>/                                  модуль системи (d20 і wfrp; E2 — d20)
  index.ts            RuleSystemDefinition, без zod
  rules/              чиста логіка (зараз lib/utils/rules/systems/<id>/**)
  server/             SystemSchemas (zod), хендлери career/advance/downtime, ai-проєкція
  ui/ hooks/          зараз components/systems/<id>, lib/hooks/systems/<id>
  __tests__/
data/templates/
  manifests.ts, dictionaries.server.ts            згенеровані (template:index), тест на свіжість
  <key>/{manifest.json, rules.json, <kind>.json…, icons.json, i18n/<locale>.json}
scripts/templates/{cli.ts, lib/**}               спільний CLI; <key>/build.ts — опційний адаптер джерела
```

Розташування `systems/` в корені (alias `@/systems/*`) — вибір цього spec: файли wfrp існують лише на цій гілці, тож їх перенесення не конфліктує з main; d20 переїздить у E2 після merge.

### 4.2 `TemplateManifest` (R3)

```ts
export interface TemplateManifest {
  key: string;                                   // = ім'я теки, ^[a-z0-9][a-z0-9.-]*$, незмінний після першого publish
  system: string;                                // ключ у RULE_SYSTEM_REGISTRY (перевіряє валідатор)
  names: Record<TemplateContentLocale, string>;  // відображувані; campaigns.name береться звідси лише при створенні
  locales: readonly TemplateContentLocale[];     // locales[0] = "en", канон
  rules: { file: "rules.json" };                 // повний Ruleset як дані (SRD_RULES і WFRP_RULES виходять з коду)
  kinds: readonly ContentKind[];                 // у порядку імпорту; порядок виводиться з залежностей, ручний — лише override
  icons: { bucketByKind?: Partial<Record<ContentKind, IconBucket>> };  // slug-ключі, шлях за R7
  compendium?: boolean;                          // пропонується як джерело compendium-import (зараз лише SRD)
  source?: { repo: string; path: string; sha: string; license: string };
  credits?: string;
  include?: readonly { from: string; kinds: Partial<Record<ContentKind, readonly string[] | "all">> }[];
  counts: Partial<Record<ContentKind, number>>;
}
```

`include` діє лише в `template:build`: бере рядки з `data/templates/<from>/` (той самий модуль системи, R17; інакше помилка валідатора), копіює у файли цього пакета з полем `origin: { template, slug }` (provenance) разом з готовим URL іконки. Опублікований шаблон самодостатній; runtime-посилань між пакетами немає. Конфлікт slug = помилка збірки.

```json
{ "key": "grim-seafarers", "system": "wfrp",
  "names": { "en": "Grim: Seafarers", "uk": "Grim: Мореплавці" }, "locales": ["en", "uk"],
  "rules": { "file": "rules.json" },
  "kinds": ["feats", "careers", "races", "spells", "units", "artifacts"],
  "include": [{ "from": "grim-d100", "kinds": { "feats": "all", "spells": ["fireball-of-ash"] } }],
  "counts": { "careers": 4, "units": 12 } }
```

### 4.3 `TEMPLATE_REGISTRY` (R4, R9)

```ts
export const TEMPLATE_REGISTRY: Readonly<Record<string, TemplateManifest>>;   // з data/templates/manifests.ts
export const templateOf = (key: string): TemplateManifest | undefined;
export const templatesOfSystem = (system: string): TemplateManifest[];
export function localizationOf(source: TemplateIdentity): TemplateLocalization | null;  // сигнатура збережена, читає реєстр
```

Генерований `manifests.ts` (JSON-імпорти) і `dictionaries.server.ts` (`() => import("./<key>/i18n/<locale>.json")`) — єдине місце, де «перелічені» пакети; це дані, не core: 4-й пакет = нова тека + `pnpm template:index`. Перехідний період: ключ шаблону = `campaigns.templateKey ?? LEGACY_KEY_BY_NAME[campaigns.name]` (мапа з 3 записів, знімається після backfill). `SRD_TEMPLATE_NAME` та ін. видаляються; compendium-import фільтрує за `templatesOfSystem(...).filter(m => m.compendium)`.

### 4.4 Слот `system` у core-типах (R11)

```ts
export interface SystemSlot { key: string; data: unknown }

export interface SlotCodec<T> {                    // чистий, без zod: parse передає система
  key: string;
  read(slot: SystemSlot | undefined): T | undefined;   // undefined, якщо key чужий
  write(data: T): SystemSlot;
}
export const defineSlot = <T>(key: string, parse: (raw: unknown) => T): SlotCodec<T> => …;
```

| Було | Стає |
|---|---|
| `BattleAttack.wfrp` (`types/battle.ts:159`) | `BattleAttack.system?: SystemSlot`; `ammo` (9 core-файлів: `ammo/*`, `attack-reach.ts`, `targets.ts`) виноситься в нейтральне `BattleAttack.ammo?: { capacity; reload }`, бо не wfrp-специфічне |
| `BattleParticipantAbilities.wfrp`, `.characteristics` (`:188-191`) | `abilities.system?: SystemSlot` |
| `sheet.wfrp` (`types/characters.ts:241`) | `sheet.system?: SystemSlot` |
| `PercentileAttackDetails/CastDetails` (`types/attack.ts`) | `ActionDetails.system?: SystemSlot` |
| `scene.momentum` | `scene.system?: SystemSlot`; колонка `battle_scenes.momentum` → `system_state` правкою незадеплоєної міграції (R18) |

Wfrp-бій і персонажі на prod відсутні (епік не в main), тож зворотна сумісність збережених JSON для wfrp не потрібна; локальні/prodcopy дані перегенеруються.

### 4.5 `RuleSystemDefinition`: зміни (R10, R12)

Принцип: жодний тип у `systems/types.ts` не імпортує `@/systems/*`; хуки приймають/повертають `SystemSlot` чи нейтральні типи, звуження робить модуль системи.

```ts
export type SystemKey = string;                         // RuleSystemKey і RULE_SYSTEM_KEYS виводяться з реєстру
export interface RuleSystemDefinition {
  key: SystemKey;
  characteristics: {                                    // kind видалено
    persisted: boolean;                                 // замість kind === "wfrp" у 8 місцях
    sheetBlock(input: SheetBlockInput): SystemSlot | undefined;
  };
  combat: { dice: number /* лише інформація: UI обирає пікер зі слотів, не dice === 100 */;
            initiative?: { tieBreak?(p: BattleParticipant): number } /* …решта хуків без wfrp-типів */ };
  ai?: { promptLine?: string;
         partyView?(m: PartyMemberFacts): unknown; participantView?(p: BattleParticipant): unknown; unitView?(u: UnitFacts): unknown };
  i18n: { namespaces: { campaign?: readonly string[]; member?: readonly string[]; dm?: readonly string[]; battle?: readonly string[] };
          budgetKb?: { member?: number; dm?: number } };
  dmSections?: readonly DmSectionKey[];                 // замість requiresSystem: "wfrp" (constants/campaigns.ts:56)
  unusedMechanics: readonly MechanicKey[];              // єдине джерело; WFRP_ONLY видалено
  abilityEffects?: readonly AbilityEffectRow[];         // wfrp* ефекти з реєстру ability
}
```

Серверні схеми (zod не потрапляє в клієнтський граф реєстру, `wfrp-import-cycle.test.ts`): `SYSTEM_SCHEMAS: Record<SystemKey, SystemSchemas>` у `lib/server/…/system-schemas.ts` узагальнює `SYSTEM_STATS_SCHEMAS` (`systems/schemas.ts:13`); `SystemSchemas = { characteristics?; unitCharacteristics?; systemStats?; raceProfile?; careerTiers?; validatePack?(data): Issue[] }`. Zod `system.key` у `rules/schema.ts:82` стає `z.string().refine(k => k in RULE_SYSTEM_REGISTRY)`. Namespaces: `NAMESPACES = [...CORE_NAMESPACES, ...systemNamespaces()]`; файли лишаються в `messages/<locale>/`; `isWfrpCampaign` → `systemKeyOfCampaign(id)` + `systemOf(key).i18n`; тест `scope-size` бере бюджети з `budgetKb`.

### 4.6 ESLint-зони і тести (R13)

- **Allow-list:** `no-restricted-imports` з групою `@/systems/*` для всього, крім двох композиційних коренів і `systems/**`; для кожної теки `systems/<id>/**` блок із забороною `@/systems/<інші>` — блоки генеруються в `eslint.config.mjs` циклом по `fs.readdirSync("systems")`, нова система конфіг не чіпає. `types/**` входить у зону (заборона `@/systems/*`). `@/data/templates/*` імпортують лише реєстр і словники; `data/templates/<key>/**` не містить `.ts` (тест).
- **Ratchet:** `lib/__tests__/system-literals.test.ts` сканує нетестовий код (`lib app components types scripts`) на літерали й ідентифікатори систем (`wfrp`, `dnd5e`, `homm`) та ключів шаблонів і заборонених констант; дозволено в `systems/<id>/`, `data/templates/<key>/`, `messages/`, тестах. Виняток — `system-literals-exempt.json` `{ path: maxCount }` за зразком `i18n-exempt.json`: тест падає, якщо лічильник файла більший (нове протікання) або менший (запис застарів, потрібно зменшити). Стартовий список — знімок стану після E1; E2 зводить `dnd5e`/`homm` до нуля.
- **Exhaustiveness:** реєстри логіки, UI, `SYSTEM_SCHEMAS`, теки `systems/*`, `gameTerms.ruleSystem.*` взаємно звірені; `TEMPLATE_REGISTRY` ↔ теки `data/templates/*` ↔ словники ↔ locales; `RULE_SYSTEM_KEYS` виводиться, не пишеться.
- **Generic-валідатор:** один тест проходить по всіх маніфестах реєстру й ганяє `template:validate` (схеми `CONTENT_RESOURCES[kind].schemas.create`, посилання за slug, іконки, переклади, `validatePack` системи); fixture-тест додає тимчасовий фіктивний пакет.
- Тести системи живуть у `systems/<id>/__tests__`; е2е пакетів — у `scripts/templates/__tests__`.

## 5. Модель БД

| Категорія | Що |
|---|---|
| Спільне для всіх | 14 контентних таблиць + `*_base`, `campaign_content_hides`, `campaigns.{templateKey,baseSourceId,baseVersion,contentVersion,locale}`, ігровий стан, сценарій, мапа, AI |
| За системою (JSON-слоти) | `characters/units.characteristics`, `artifacts.system_stats`, `races.profile`, `battle_scenes.momentum`, `battle_participants.snapshot/state`, `campaigns.rules.system.key`; `careers` — вид контенту wfrp |
| Legacy d20 (не чіпається, R14) | `Character.strength…charisma/armorClass/spellSlots`, `Unit.*`, `BattleParticipant.hasUsed*`, `morale`; нова система ігнорує їх, як wfrp |
| Борги (E2, після деплою, з перевіркою prod перед DROP) | `race_profiles` (`:682`, 0 читань), `status_effects` (`:603`), мертві `skills.spell*` і `spells.effectDetails`, 12 знятих FK |

Міграції E0 (усі expand-only; нових `CREATE TABLE` немає, тож RLS не потрібен):

1. `ADD COLUMN slug text` на 14 контентних таблицях і 14 `*_base` (nullable); часткові унікальні індекси `(campaignId, slug) WHERE slug IS NOT NULL` на контентних, індекс `(sourceCampaignId, slug)` на `*_base`. Унікальність «у межах (кампанія, вид)» = у межах таблиці.
2. `careers` додається в `CONTENT_MODELS` (`scripts/db/gen-base-models.ts:12`), ручний блок `CareerBase` (`schema.prisma:789`) видаляється; перевірка: згенерований SQL порожній (diff = 0).
3. Дані: backfill `campaigns.templateKey` для офіційних шаблонів (скрипт, не міграція).

`slug` не входить у `rowHash`/`sourceHash` (ідентичність, не вміст): інакше backfill змінить хеш кожного рядка, `publishTemplateVersion` підніме версію, а клони побачать зміну всього. Backfill slug у відкриті `*_base` рядки — `UPDATE` без нової версії.

**Вердикт для 4-го шаблону:** (а) на наявній системі — після E0 нуль міграцій і нуль core-файлів; (б) нова система без нового виду контенту — нуль DDL (JSON-слоти + `SYSTEM_SCHEMAS`); новий вид контенту — окрема міграція з RLS + генератор + `REFERRERS`/`BUNDLE_TABLES` (як було).

## 6. Експеримент «4-й шаблон»

| | Зараз | Після E0 | Після E1 | Після E2 |
|---|---|---|---|---|
| А: пакет на wfrp/d20 | 9 пунктів: 3 core-файли, 2 правки shared-скриптів (`package.json`, `scripts/srd/i18n/templates.ts:14,28`), копія `scripts/grim` (~10 файлів), гард `GRIM_TEMPLATE_NAME` в `scripts/assets/grim-icons/cli.ts:16,90` | тека пакета + `template:index`; 0 core | без змін | без змін |
| Б: нова система «d6pool» | ~19 пунктів / ~50 файлів / ~40 у core (Б1–Б19 звіту C) | пакет-частина (Б18) знімається; решта 17 пунктів лишається | `systems/d6pool/` + 2 рядки реєстрів + messages + пакет; Б1, Б5–Б9, Б11, Б13 і частково Б10, Б14 зникають; Б14 (результат атаки) лягає в слот `system` | d20-код не конкурує з новою системою за спільні константи |
| Упори, що лишаються | — | компілятор/ESLint ще не ведуть нову систему | d100/d20-форма клієнтських flow (`percentile?: boolean`, `flows/attack-flow.ts:54,70`) вимагає узагальнення `flow` під слот; нові види контенту (~14 точок) | `lib/constants` d20-файли (~25 файлів, ~450 імпортів) переїжджають |

## 7. План етапів

Розмір: S < 1 год, M кілька файлів, L зміна інтерфейсу чи даних. Кожен крок — окремий комміт, `pnpm test:related`/`eslint --fix <файли>` під час роботи, повний `test:run` і repo-wide lint один раз перед merge (правила CLAUDE.md).

### E0: пакети (до merge, перед іконками)

| Крок | Зміст | Розмір | Залежить |
|---|---|---|---|
| E0.1 | `TemplateManifest` (+ zod `lib/schemas/template-manifest.ts`), маніфести SRD і Grim приведені до формату; `template:index` генерує `manifests.ts` і `dictionaries.server.ts`; тест свіжості | S | — |
| E0.2 | `TEMPLATE_REGISTRY`; заміна `*_TEMPLATE_NAME`, `TEMPLATE_LOCALIZATIONS`, `DICTIONARIES` (9 core-файлів); `lib/srd/i18n/{catalog,overlay}` → `lib/utils/templates/i18n` (прибирає імпорт `scripts` з `lib/`, `catalog.ts:3`) | M | E0.1 |
| E0.3 | `templateKey` ≠ назва: `ensureTemplate` пише ключ; скрипт `template:backfill-keys` (SRD, Grim, Heroes, порожні оболонки); read-through через `LEGACY_KEY_BY_NAME` | M | E0.2 |
| E0.4 | Міграція slug + генератор + `careers` у `CONTENT_MODELS`; bundle/publish/sync переносять slug; slug поза хешами; `BUNDLE_FORMAT_VERSION` 1→2 з читанням обох | M-L | E0.2 |
| E0.5 | Slug у data-файлах: SRD (є, перестає стрипатись `scripts/srd/lib/data-files.ts:54`), Grim (slugify з англійської назви, зафіксований у файлах), скрипт backfill slug у БД шаблонів зіставленням за name | M | E0.4 |
| E0.6 | Шляхи сховища за R7: `ICON_BUCKETS` + `career-icons` (`storage.ts:6`), `isSharedAssetUrl` розпізнає `templates/` (і лишає `sets/`, `<templateId>/` для вже залитого), guard-тест `icon-buckets-immutable`, `next.config` remote patterns | S | E0.3 |
| E0.7 | `icons.json` за slug для всіх пакетів (Grim: name → slug), один модуль icons-file замість `icons-file.ts` + `grim/icons.ts` | S-M | E0.5 |
| E0.8 | Переклад за `(kind, slug, поле)`: формат `uk.json` v2 `{ "<kind>/<slug>/<fieldPath>": { text, en } }`; `localizeTemplateBundle` накладає за ключем; хеш `en` лише дає статус `stale` (накладається, але `template:i18n status` показує, `publish` вимагає 0 stale); конвертер зі старого hash-словника; вкладені елементи ключуються за `id`/`name`, інакше за індексом | L | E0.5 |
| E0.9 | Спільний CLI `scripts/templates/cli.ts` (`build/validate/import/publish/icons/i18n`) на базі `importContent`/`publishTemplate`/`makeTemplateStore`; валідатор з `scripts/grim/validate-data.ts` узагальнено, wfrp-специфіка → `SystemSchemas.validatePack`; адаптери `scripts/templates/srd-5.2/build.ts` (Open5e); `package.json`: `template:*`, старі `constructor:*-template` тонкі аліаси до кінця E0, потім видаляються | L | E0.1, E0.5 |
| E0.10 | Heroes як пакет `data/templates/heroes-homm/`: `template:export` одноразово читає офіційний шаблон «Heroes» (prodcopy), пише файли зі slug і `rules.json`; `template:import heroes-homm` зіставляє зі збереженням id (за backfilled slug); `data/library` і `seed-library` позначені застарілими для створення шаблону | L | E0.5, E0.9 |
| E0.10b | Heroes EN-база (U7): англійські name і тексти стають каноном у data-файлах пакета, наявні українські тексти переходять у `i18n/uk.json` за ключем `(kind, slug, поле)`; `locales: ["en","uk"]`; переклад на EN — Sonnet-пакетами за видами з вичиткою термінів HoMM; жива HOMM5 не змінюється | L | E0.8, E0.10 |
| E0.11 | Правила як дані: `SRD_RULES` (`scripts/srd/lib/rules-preset.ts`) і `WFRP_RULES` → `rules.json` пакета; порожні оболонки (`5e (empty)`, `Grim d100 (empty)`) стають мінімальними пакетами (лише `rules.json`) | M | E0.9 |
| E0.12 | Generic-тест валідатора + exhaustiveness реєстру + fixture-4-й-пакет | S | E0.9 |

Ризики для prod: на prod є офіційні шаблони SRD (і Heroes з `templateKey = null`), Grim і wfrp-міграції ще не задеплоєні. Backfill ключів і slug — лише UPDATE метаданих, вміст рядків не змінюється; перевірка: re-publish SRD на prodcopy дає `contentVersion` без змін і 0 «змінених» рядків у sync клонів. Id рядків шаблонів не змінюються (reseed за slug/name), клони не розриваються. HOMM5 і живі кампанії не чіпаються. Зворотна сумісність: `LEGACY_KEY_BY_NAME`, bundle v1 читається, старі URL іконок валідні (змінюється лише спосіб запису нових). Перевірка етапу: `template:validate` по всіх пакетах, `template:import --dry-run` на prodcopy (0 змін), clone → sync → uk-накладання для SRD і Grim, `migrations-rls`, `content-base-fk-drift`.

### E1: інтерфейс системи (до merge, після E0)

| Крок | Зміст | Розмір | Залежить |
|---|---|---|---|
| E1.1 | `git mv` wfrp у `systems/wfrp/{rules,server,ui,hooks}`, `lib/constants/wfrp-*.ts`, `participant/extract-wfrp-attacks.ts`; alias-імпорти оновлено; реєстри імпортують `@/systems/wfrp` | M (механічно) | — |
| E1.2 | `SystemSlot`/`defineSlot`; перенесення полів за таблицею 4.4: спершу `attack.wfrp` + `ammo`, потім `abilities.wfrp`, `sheet.wfrp`, `ActionDetails`, `scene.momentum` (по одному комміту) | L | E1.1 |
| E1.3 | Бій: `judgeWfrp`/`judgeServerWfrp` переїжджають у систему, core викликає лише `combat.resolveAttack`; `initiative.tieBreak`; прибрати `combat.dice === 20/100` як дискримінатор (`actions.ts:182`, `request.ts:97`, `berserk.ts:95`) | M | E1.2 |
| E1.4 | `characteristics.persisted` замість `kind === "wfrp"` (8 місць: `units.ts:28`, `system-fields.ts:22`, `resources-handler.ts:35`, `create.ts:136`, `import-units.ts:86`, `build-sheet.ts:127`, `useBattleRules.ts:28`, `DmCharacterCard.tsx:45`); `SYSTEM_SCHEMAS` | M | E1.1 |
| E1.5 | `ai` у definition; `party.ts`, `reference.ts`, `prompt.ts:85`, `read-service.ts:36` викликають хук | M | E1.1 |
| E1.6 | `i18n.namespaces`: `systemKeyOfCampaign`, `layout.tsx` та 7 сторінок, `lib/i18n/{scopes,config}.ts`, бюджети `scope-size` | M | E1.1 |
| E1.7 | `unusedMechanics` замість `WFRP_ONLY` (`RulesForm.tsx:33,71`); `dmSections` замість `requiresSystem: "wfrp"`; `careers/page.tsx` без `systemUiOf("wfrp")` | S | E1.1 |
| E1.8 | wfrp-ефекти ability (`wfrpArmour/Ward/Size/Psychology/Attack`) стають `abilityEffects` системи; реєстр ефектів і `TRAIT_EFFECT_KINDS` приймають рядки системи | M-L | E1.1 |
| E1.9 | Battle UI: 10 компонентів `components/battle` з `battleWfrp.*` і `d100`-прапори переходять на `SYSTEM_UI` слоти; клієнтські flow зберігають `percentile?: boolean` як нейтральний `flow.mode` (повне узагальнення — E2) | L | E1.2 |
| E1.10 | Відкритий ключ: `RULE_SYSTEM_KEYS` виводиться, `RuleSystemKey` → `string`, видалено `kind` і `dice: 20\|100`, `rules/schema.ts:82` перевіряє реєстром; мертві `balance:none`, `battle.supported:false` прибрано (`useBattleSetup.ts:39`, `start-mutation.ts:13`) | M | E1.2-E1.8 |
| E1.11 | ESLint-зони (allow-list), `types/` під межею, ratchet з початковим списком, exhaustiveness; `eslint-isolation.test.ts` переписано під генеровані блоки | M | E1.10 |
| E1.12 | Документація: `rule-systems.md`, `map-modes.md`, `content-api.md`, `CLAUDE.md` (layering для `systems/`), `docs/architecture/README.md`, `STATUS.md` | S | E1.11 |

Розбіжності doc ↔ код, які закриває E1.12 (звіт C, розд. 3):
1. `rule-systems.md:44` — `templateKey: grim-d100-empty`, у коді ключ = назва шаблону; два місця документа суперечать (`:364`).
2. `:220` (5e-2) «без шарів, `*Base`, sync» — код і розділ 5g-0 (`:372`) протилежні.
3. `:39` — ESLint заборонів `hooks/components d20*`, у `SYSTEM_IMPORT_PATTERN` (`eslint.config.mjs:56`) цього немає; `types/` не покрито.
4. `:5-35` — таблиця хуків «повна», але не містить `identity`, `lineage`, `attacks`, `inventory`, `currency`, `equipment`, `advancement`, `creation`, `attackTarget`, `conditions.*`.
5. `:11` — `distance` «лише декларація», тоді як `cellFeetOf` (`grid/cell-feet.ts`) його читає; `:30` це описує.
6. `:64-68` «Як додати систему» пропускає ESLint-патерн, `eslint-isolation.test.ts`, `registry.test.ts`, `SYSTEM_STATS_SCHEMAS`, `NAMESPACES`/`scopes.ts`, `isWfrpCampaign`, 8 перевірок `kind`, AI-проєкції; `map-modes.md` так само недоговорює про ESLint.
7. `:71` (5h-2) — приховані вкладки правил робить хардкод `WFRP_ONLY`, не `unusedMechanics`.
8. `:34` — `battle.supported` описано як перемикач; усі системи `true`, гілка недосяжна.
9. `:12` — `balance.kind: "none"` не використовує жодна система.
10. `:45` — «`SYSTEM_STATS` d20/homm відхиляють не-null» вірно, але реєстр `Partial`, без exhaustiveness.
11. `:7` — `SYSTEM_UI`/`useRuleSystem` збігається з кодом (підтвердження, не розбіжність); натомість у STATUS рядок чекліста «лишився 5g» застарів.

Ризики E1 для prod: wfrp не на prod, тож зміни форми wfrp-JSON безпечні; d20-шлях зачіпається лише через ідентичну за змістом заміну `kind`/`dice` і мовчазне `ammo` (d20 `ammo` вже живе в `battleData`). Гейти: `battle-sweep` homm/dnd5e на prodcopy після E1.2-E1.3 (повторити, останній був до 5e/5f), е2е wfrp/dnd5e, `wfrp-import-cycle.test.ts`, `scope-size`, OpenAPI бюджет.

### Після merge

**E2 (L, по підсистемах):** `systems/d20/` стає повним модулем з варіантами `homm`/`dnd5e` (`d20System(key)`): спершу `lib/constants` (~25 файлів: `abilities.ts` 107 імпортерів, `classes`, `skills`, `spells`, `damage`, `weapon-traits`, hero-файли), далі персонажі (`lib/utils/characters`, `lib/server/characters`), далі бій (`lib/utils/battle` d20-частини, `d20Roll`). Кожен під-крок зменшує ratchet-список; ціль нуль. Паралельно борги БД: DROP `race_profiles`, `status_effects`, мертвих колонок — після деплою й перевірки prod-рядків; нові міграції лише expand-only. Узагальнення клієнтських flow (`flow.mode`) і маршрутів системних дій (`/system/[action]` замість `channel`, `condition-test`, `corruption`, `downtime`) — теж тут: у E1 системні route-файли в `app/api` лишаються у ratchet-списку винятків (вибір spec).
**E3 (доменні модулі епіку «Модулі»):** `modules/<domain>/…`, ESLint boundaries, Vitest projects; потребує переписування layering в `CLAUDE.md`. Окремий spec після merge і E2.
E2 після merge, бо масове перенесення на гілці з ~1420 змінених файлів дає найважчі конфлікти.

## 8. Що блокує заливку іконок і prod-контенту

| Блокує (E0) | Чому |
|---|---|
| E0.3 `templateKey` | ключ на prod фіксується один раз; зараз = назва |
| E0.4-E0.5 slug | ключ іконок і перекладів; Grim ключується за `name`, перейменування після заливки губить іконку або дає осиротілий рядок |
| E0.6 шляхи й `career-icons` | бакет відсутній у `ICON_BUCKETS`, `isSharedAssetUrl` не знає шлях |
| E0.7 icons.json за slug | перезапис після заливки дорогий |
| E0.8 переклад за ключем | зараз правка англійського тексту (навіть пунктуації) губить переклад; тексти треба заморожувати |
| E0.9 CLI `icons` | один пайплайн замість `tokens-5e` і `grim-icons` |
| E0.10 Heroes-пакет | блокує лише Heroes-іконки, не SRD і Grim |

Не блокує: E1 (не торкається даних, шляхів і ключів), E2, E3, борги БД, хвости п.1–6 епіку, wfrp-типи. Після E0 Grim-контент можна розморозити: slug відв'язує іконки й переклади від назв.

## 9. Перевикористання

| Береться як є | Навіщо | Що нове і чому |
|---|---|---|
| `importContent` + `IMPORT_SPECS` + `CONTENT_RESOURCES` | запис контенту | `slug` у полях імпорту; порядок kinds виводиться з залежностей замість `GRIM_ROW_KINDS` |
| `publishTemplate`/`publishTemplateVersion`, `*_base`, `prepareCampaignSource`, `source-sync` | шари, версії, sync | лише slug у bundle/хешах |
| `makeTemplateStore`/`ensureSrdTemplate` (`scripts/srd/lib`) | створення шаблону | перейменовано в загальне, Grim більше не тягне з `srd/` |
| `localizeTemplateBundle`, hash-накладка (`lib/srd/i18n`) | переклад | ключ за slug, хеш як маркер застарілого |
| `toWebp`, `ensureBucket`, `compose.ts` | іконки | один `template:icons` замість двох циклів |
| `RuleSystemDefinition`, `SYSTEM_UI`, `SYSTEM_STATS_SCHEMAS` | система | нейтралізація інтерфейсу, `SYSTEM_SCHEMAS`, `ai`/`i18n`/`dmSections` |
| `scripts/grim/validate-data.ts`, `grimCoverage` | валідатор | узагальнено, wfrp-перевірки в `validatePack` |
| `i18n-exempt.json`, `eslint-isolation.test.ts`, `maze` registry (еталон) | ratchet і межі | allow-list і генерація замість deny-list; maze переводиться на ту ж схему після E1 (окремий крок) |

Нове, бо аналога немає: маніфест + `include`, генеровані індекси, `SystemSlot`, `systems/` як тека модуля, generic-валідатор, ratchet літералів.

## 10. Відкриті питання користувачу

1. ~~Остаточні `templateKey`~~ — вирішено, U6.
2. **Іконки одразу після E0 чи після E1?** Рекомендація spec: після E0 (E1 не торкається даних і шляхів), іконки Grim і SRD не чекають рефакторингу системи.
3. ~~Heroes: англійська база~~ — вирішено, U7 (крок E0.10b).
