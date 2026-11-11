# E1: нейтральний інтерфейс рульової системи — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan part-by-part. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** core (`types/`, `lib/`, `app/`, `components/`) не знає wfrp: код системи живе в `systems/wfrp/`, core-типи несуть непрозорий слот `system`, гілки `=== "wfrp"` замінено хуками, межу тримають ESLint-зони (allow-list) і два ratchet-списки. Нова система = тека `systems/<id>/` + рядки композиційних коренів.

**Architecture:** `systems/<id>/` назовні віддає `meta` (дані), `RuleSystemDefinition` (логіка без zod), `SystemUi`, `SystemServer` (zod-схеми, AI-проєкція). Core імпортує `@/systems/*` лише в композиційних коренях (D38). Системні дані в core-типах — `SystemSlot { key; data }`, звужує кодек системи. Ratchet вмикається на початку епіку зі знімком і зменшується кожною задачею (D39).

**Tech Stack:** Next.js 16, TypeScript strict, zod, vitest, ESLint flat config, Prisma 6.

**Spec:** `docs/superpowers/specs/2026-11-10-architecture-modularity-design.md` (розд. 3 R10–R13, R18; 4.1, 4.4–4.6; 7 E1; 9). План E0: `docs/superpowers/plans/2026-11-11-e0-template-packs.md` (D1–D36). Виконавець читає план і ці розділи spec, плюс `docs/architecture/rule-systems.md`.

## Мета і межі

Входить (E1.1–E1.12 spec + борги E0): перенесення wfrp у `systems/wfrp/`; `SystemSlot` у core-типах; диспетчери бою, AI, i18n, механік, ability-ефектів, battle UI; відкритий ключ системи; ESLint-зони + ratchet + exhaustiveness + fixture-система; `PackHooks.prepareRows`, розрив `batches.ts` ↔ `scripts/srd/i18n`, `spellLists` у core-локалізаторі; документація.

НЕ входить:

| Що | Куди | Чому |
|---|---|---|
| Винесення d20 у `systems/d20`, `systems/homm` (U9); `lib/constants` d20-файли | E2 | після merge (spec розд. 7): на гілці з ~1420 файлами дає найважчі конфлікти |
| Маршрути `/system/[action]` замість `channel`, `condition-test`, `corruption`, `downtime`, `career`, `advance`, `draft` | E2 | вибір spec; у E1 route-файли — у `system-imports-exempt.json` |
| Реєстрація виду контенту (`careers`) із системи | E2 | spec розд. 6: «нові види контенту ~14 точок» лишаються упором; файли виду — у exempt (D41) |
| Форма `skillTrees` у core (D30) | E2 | HOMM-специфіка, а `systems/homm` зʼявляється лише в E2; до того HOMM = core (D53) |
| Лічильники `battleData.{fortune,channelledSl,sin,conditionTests,psychologyTested}` у слот | E2 | входять у `ParticipantState`-дельти; зміна формату дельти без виграшу для межі (D45) |
| Секції `rules.tables` / `rules.advancement` у слот правил системи | E2 | потребує `rules.system.data` і міграції збережених правил (D49) |
| Minor 13 (`contentVersion` за рядок) | окремо після E1 | модель даних sync, не інтерфейс системи; E1 не торкається даних (D54) |
| Доменні модулі, Vitest projects | E3 | окремий spec |
| Prod, іконки, backfill, merge/push | — | U8: іконки після E1; prod лише за окремим «так» |

## Свідомо відкладено в E2 (затверджено користувачем 2026-11-11)

Користувач підтвердив: п'ять пунктів нижче НЕ входять в E1 і не тягнуться в нього.

1. **Route-файли** `app/api/**` (`channel`, `condition-test`, `corruption`, `downtime`, `career`, `advance`, `draft`, `race-profiles`): у E1 лишаються в `system-imports-exempt.json` з `reason: "route"`; E2 замінює їх маршрутом `/system/[action]`.
2. **Вид контенту `careers`**: файли виду в exempt з `reason: "content-kind"`; реєстрація виду з системи — E2.
3. **`rules.tables` / `rules.advancement`** у core `Ruleset`: схеми в exempt з `reason: "ruleset-section"` (D49); слот правил системи (`rules.system.data`) + міграція збережених правил — E2.
4. **Лічильники `battleData.{fortune,channelledSl,sin,conditionTests,psychologyTested}`**: лишаються в core-типах і дельтах (D45).
5. **Форма `skillTrees`** (D53): до E2 HOMM = core.

**Критерій «0 правок core при додаванні системи» після E1 виконується лише для системи без власного виду контенту й без власних секцій правил** (нова система без `careers`-подібного виду, без `rules.tables`/`advancement`-подібних секцій, без `battleData`-лічильників, без route-файлів). Повний критерій — лише після E2. Перенесення `wfrp-*.test.ts` НЕ відкладається: задача 6.5.

## Global Constraints

- Worktree `/Users/silentfox/Work/dnd-tracker-wfrp`, гілка `feat/wfrp`. **Не мерджити, не пушити, нічого на prod.** Скрипти лише проти localhost (`assertSeedTarget`), без `--allow-remote`.
- Не заходити в `scripts/assets/grim-icons/*` і `docs/assets/icon-prompts/*` (чужа сесія); ratchet-скан їх не читає (D51).
- Поведінка d20 (homm, dnd5e) не змінюється: кожна заміна `kind`/`dice` тотожна за змістом. Wfrp-JSON (знімки бою, `actionDetails`, сцена) змінює форму без зворотної сумісності: на prod wfrp немає, локальні бої перестворюються.
- Інваріанти CLAUDE.md чинні: `runBattleMutation`, `snapshot` + `snapshotHash`, `advanceTurn`, `applyDamageConsequences`, `collectModifiers`/`runAbilities`, layering, `import/no-cycle`, i18n без кирилиці, мінімум коментарів.
- Reuse before writing: перед новим хелпером шукати в `lib/utils`, `lib/hooks`, `components/common`, `lib/utils/api`; у звіті задачі — що перевикористано.
- Перевірки під час роботи: `pnpm exec tsc --noEmit -p tsconfig.json` (рефакторинг типів: після кожної задачі), `pnpm test:related <змінені файли>` або `pnpm test:run <файл>`, `pnpm exec eslint --fix <змінені файли>`, для частини 6.2 `pnpm test:integration scripts/templates` (у `package.json` скрипт називається `test:integration`; `tt:integration` не існує). **Дозволено (затверджено 2026-11-11): `pnpm battle-sweep` проти локальної `prodcopy` після частини 3 і наприкінці E1 — лише localhost (порт 54322), перед запуском перевірити `DATABASE_URL`.** **Повний `pnpm test:run` і repo-wide `pnpm lint` не запускати** без окремого «так». Перед важким прогоном: `ps -Ao pid,pcpu,command -r | grep -E "eslint|vitest|next"`.
- Кожна задача = окремий комміт `refactor(systems): …` з `Co-Authored-By`. Після кожної задачі обидва ratchet-тести зелені, а числа в exempt-файлах лише зменшуються (виняток — `git mv` у 1.1 і створення знімка в 1.3).
- Ревʼю: одне проміжне (Opus) після частини 3, одне фінальне після частини 6. Після окремих задач ревʼю немає; концерни виконавець пише у звіт.
- Нових npm-залежностей немає.

## Рішення архітектора (D37+)

| # | Рішення | Чому |
|---|---|---|
| D37 | Тека системи: `systems/wfrp/{meta.ts, index.ts, rules/**, server/**, ui/**, hooks/**, api/**, constants/**}`; alias `@/systems/*` уже дає `@/*`. d20 лишається в `lib/utils/rules/systems/d20` і `components/systems/d20` до E2; зони генеруються з `fs.readdirSync("systems")` (зараз лише `wfrp`) | spec 4.1; d20 переїздить після merge |
| D38 | (затверджено 2026-11-11, разом із генерованим індексом, задача 1.4) Композиційних коренів пʼять, не два: `lib/utils/rules/systems/meta.ts` (лише `@/systems/*/meta`, дані), `lib/utils/rules/systems/registry.ts` (логіка), `components/systems/registry.ts` (UI), `lib/server/systems/registry.ts` (zod-схеми, AI), `lib/utils/abilities/schema/system-effects.ts` (zod-схеми ефектів); у скриптах — `scripts/templates/systems/index.ts`. Список — константа `SYSTEM_ROOTS` в `eslint.config.mjs`. Рядки систем у коренях між маркерами `// <systems:generated>` … `// </systems:generated>` генерує `scripts/shared/systems-index.ts` з `fs.readdirSync("systems")` (`--write` / `--check`); актуальність перевіряє `lib/__tests__/systems-index.test.ts` | zod не може потрапити в клієнтський граф реєстру (`wfrp-import-cycle`, `client-entry-imports`); `lib/i18n/config.ts` і `rules/schema.ts` не можуть тягнути реєстр логіки (цикл через `Ruleset`) |
| D39 | Ratchet спочатку: зони й обидва списки вмикаються в частині 1 зі знімком, далі кожна задача зменшує числа. Відхилення від порядку spec (E1.11 після E1.10) | виконавець бачить нове протікання одразу; прогрес E1 вимірюваний |
| D40 | Тести поза зоною й поза ratchet (як зараз); тести всередині перенесених тек їдуть із кодом; `wfrp-*.test.ts` із core-тек (≈21 файл) переїздять механічно в задачі 6.5 (затверджено 2026-11-11) | межу тримає нетестовий код; тести системи живуть із системою |
| D41 | Трійка для core-файла, що торкається wfrp: (а) файл цілком wfrp → `git mv` у `systems/wfrp/`; (б) змішаний → хук/слот; (в) route-файли `app/api`, файли виду `careers`, `rules/tables-schema.ts`, `rules/advancement.ts` → `system-imports-exempt.json` з `reason` (`route` \| `content-kind` \| `ruleset-section`). Інших причин у списку наприкінці E1 немає | spec розд. 7 (route-файли у ratchet), розд. 6 (упори) |
| D42 | Барель `lib/utils/rules/systems/index.ts` експортує лише реєстр і нейтральний контракт; ~50 wfrp-імен (`Characteristics`, `readCharacteristics`, `SpeciesProfile`, …; 45 core-файлів) зникають з нього. `types.ts` не містить `typeof <wfrp-функція>` | принцип spec 4.5 |
| D43 | `SystemMeta` — легкий опис системи (ключі, модуль, i18n, приховані механіки, DM-секції), окремо від `RuleSystemDefinition`. `RULE_SYSTEM_KEYS`, `isRuleSystemKey`, `systemNamespaces()`, `SYSTEM_MODULE` (скрипти) виводяться з нього | один факт в одному місці; `schema.ts` і `i18n/config.ts` імпортують лише дані |
| D44 | Слот учасника: `abilities.system = { key, data: { characteristics, stats } }` замість двох полів. Колонка `characteristics` у core-типах рядків (`Character`, `Unit`, `CharacterFormData`) — непрозорий `SystemData = Record<string, unknown>`; дефолт і «порожність» дає система (`characteristics.defaults()`, `isEmpty()`) | R11; `contentRowHash` має лишитися тим самим для наявних рядків |
| D45 | Нейтральні поля атаки, які читає core-сітка: `BattleAttack.ammo?: { capacity; reload? }`, `reachCells?`, `blastRadius?`, `noLevelDice?`; у слоті `attack.system` лишаються `qualities`, `flaws`, `noSb`, `magical`. Лічильники `battleData.*` не чіпаємо, лише прибираємо «WFRP» з коментарів | spec 4.4 (ammo) + ті самі підстави для геометрії; дельти не змінюються |
| D46 | Сцена: `scene.system?: SystemSlot`, core передає непрозорий `sceneState` у `combat.resolveAttack` і отримує наступний; `lib/utils/battle/momentum.ts` → `systems/wfrp/rules/combat/momentum.ts`; у core — `sceneStatePatch(before, after)` | R11; 39 core-файлів згадують momentum |
| D47 | R18: тека міграції перейменовується на `20261123000000_battle_scene_system_state`, SQL = `ADD COLUMN "system_state" JSONB`. Локальні БД (`wfrp`, `prodcopy`) лагодяться SQL-сніпетом: `RENAME COLUMN` + `UPDATE _prisma_migrations SET migration_name, checksum` (sha256 нового файла). Лише localhost | міграція не задеплоєна; без сніпета `migrate dev` вимагатиме reset |
| D48 | Деталі дії: `actionDetails.system?: SystemSlot` і `AttackRollResult.system?: SystemSlot` замість `percentile`/`percentileCast`; `Percentile*Details` → `systems/wfrp/rules/percentile/details.ts`. Приватність, FX кубиків і рядки результату — хук `combat.details`, слот `SystemUi.ActionResult` (уточнено D76, D77) | 29 core-файлів; редакція для гравців має лишитися серверною |
| D49 | Секції `rules.tables` і `rules.advancement` лишаються в core `Ruleset`; їх схеми (`tables-schema.ts`, `advancement.ts`) імпортують `@/systems/wfrp/constants/*` і стоять в exempt (`ruleset-section`). Редактори `TablesSection`, `AdvancementSection` переїздять у систему через `SystemUi.rulesSections` | слот правил системи = зміна збережених правил, E2 |
| D50 | `ai` живе в `SystemServer`, не в `RuleSystemDefinition`: `partyView` читає `careers` через prisma. `promptLine` там само | відхилення від spec 4.5; `lib/ai` і так server-only |
| D51 | Ratchet літералів: `lib/__tests__/system-literals.test.ts` + `system-literals-exempt.json` `{ "<path>": maxCount }`; токени — ключі й модулі з `SYSTEM_META` (підрядок без регістру для `wfrp`; для `dnd5e`/`homm` — рядковий літерал) і ключі `TEMPLATE_REGISTRY`; корені `lib app components types scripts`, без тестів, без `scripts/assets/grim-icons/**`; дозволено в `systems/<id>/**`, `scripts/templates/systems/<id>/**`, `scripts/templates/<key>/**`, d20-теках (до E2). Падає, коли лічильник більший або менший за записаний, і коли файл поза списком має > 0. grep ключів шаблонів із `fourth-pack.test.ts` переїздить сюди | spec 4.6; чужа сесія не має ламати тест |
| D52 | Ratchet імпортів: `system-imports-exempt.json` `[{ "file", "reason" }]`; `eslint.config.mjs` читає його як `ignores` зонного блоку (зразок `I18N_EXEMPT`); тест перевіряє, що кожен файл існує і досі імпортує `@/systems/` | allow-list без «вічних» винятків |
| D53 | `skillTrees` (D30) — борг E2, запис у STATUS; у E1 не змінюється | HOMM до E2 = core |
| D54 | Minor 13 поза E1 | див. «Межі» |
| D55 | `PackHooks.prepareRows?(kind, rows, ctx)` і `clearableColumns?` замінюють `import-prepare.ts`; d20-частини (`resolveSchoolRefs`, `withClassIcons`, `CLEARABLE_SPELL_COLUMNS`) → `scripts/templates/systems/d20/prepare.ts`, спільні для `homm` і `dnd5e`; `iconColumnOf` → `icons-file.ts` | нотатка E0 «Після E0»; `PACK_HOOKS.dnd5e` зараз `{}` |
| D56 | `creature-header`, `spell-header` (формат стат-блоку 5e) → `scripts/templates/systems/d20/i18n/`, виклик через `PackHooks.normalizeTranslation?`; `validate.ts` (`checkTranslation`, загальний) → `scripts/templates/lib/i18n-validate.ts`; `scripts/srd/i18n/cli.ts` і скрипт `srd:i18n` видаляються | `scripts/templates/lib` не імпортує зі `scripts/srd` |
| D57 | Псевдовид списків заклинань: `localizeTemplateBundle` бере ключ із `PACK_LIST_KIND = "lists"` (нейтральна константа в `lib/utils/templates/i18n/keys.ts`), wfrp-хук `i18nRows` пише той самий; ключі `uk.json` Grim `spellLists/<slug>/name` перейменовуються конвертом у `lists/<slug>/name` | D22: рядок `"spellLists"` у core — витік wfrp |
| D58 | Клієнтський flow: `percentile?: boolean` → `judge?: "server"` (відсутність = client; `AttackFlowState.mode` уже означає перевагу/недолік); дискримінатор у хуках і UI — `combat.judge === "server"`, а не `dice === 100`. `dice` лишається числом для розміру кубика | spec E1.9, E1.3 |
| D59 | Заміни `kind`: `characteristics.persisted` (запис/читання колонки), `progression.hpTerm: "hp" \| "wounds"` (підпис), `resources.limits?(row)` (стеля Fate в `resources-handler`), `resources.seed?(characteristics)` (Fortune при створенні) | 8 місць spec E1.4 роблять чотири різні речі |
| D60 | Шари всередині системи наслідують правила core: `rules/**` = `lib/utils` (без `@/lib/db`, `@/lib/server`; з `lib/utils/api` — лише `content-error`, D65), `ui/**` = `components` (без `@/lib/api`, `@/systems/*/api`), `hooks/**` = `lib/hooks`, `api/**` = `lib/api`, `server/**` — без обмежень шару; система не імпортує `@/systems/<інша>`, `@/app/*`, `@/scripts/*`; `meta.ts` — лише `import type` | layering CLAUDE.md не слабшає від переїзду |
| D61 | Deny-патерн `@/lib/utils/rules/systems/d20*`, `@/components/systems/d20*` лишається до E2; wfrp-імена з `SYSTEM_IMPORT_PATTERN` зникають | d20 ще не модуль |
| D62 | Fixture-система `d6pool` існує лише в тестах: `assertSystemContract(meta, definition, ui, server)` — та сама функція, що звіряє реальні системи | критерій spec «фіктивна система проходить без правок core» |
| D63 | (вимога користувача 2026-11-11) Battle-sweep per-template: `--template <srd-5.2\|heroes-homm\|grim-d100>`, без параметра — усі; для шаблону без героїв-кампанії sweep сидить тестових героїв/ворогів із контенту шаблону й чистить за собою | шаблон = пакет, який має самостійно підтверджувати працездатність; раніше sweep грав лише HOMM5, тож dnd5e і wfrp бою не мали наскрізної перевірки. Нова система/шаблон додається разом зі своїм sweep-профілем (без нього шаблон не вважається готовим), а гейти частини 3 і фіналу E1 вимагають прогону всіх трьох |

## Рішення архітектора D64+ (звірка частини 2, Opus)

Звірка відхилень із `.superpowers/sdd/e1-part1-report.md` (п.1–10) і `e1-part2-report.md` (2.1–2.3) на HEAD `cb8753b9c`. Частина 1 п.1, 2, 5, 10 прийнято без запису (п.5 закрито в 2.3).

| # | Рішення | Чому |
|---|---|---|
| D64 | (part1 п.4) Зона — окремий ключ правила `systems/zone` (builtin `no-restricted-imports` під іншим іменем), не merge у `restricted()`. Прийнято. `eslint-disable no-restricted-imports` зону не вимикає — так і має бути. Матриця Review Focus 5 перевіряє обидва ключі | flat-config не вміє «exempt-файл зберігає патерни інших блоків» без дублювання; два незалежні правила не перезаписують одне одного |
| D65 | (2.2, b) `ContentError` у `lib/utils/api/content-error.ts` прийнято. `rules/**` системи може імпортувати з `lib/utils/api` лише цей файл (бареля там немає; решта файлів тягнуть `next/server`) — дописати в D60 | клас без залежностей; 409/400 з чистої логіки — наявний патерн core |
| D66 | (2.2, c) `systemBaseline: z.unknown()` прийнято: напрям лише клієнт→сервер, не зберігається і не віддається; гравцю не протікає (гравець отримує вже `redact`-ене значення, а гілка `!isDM` baseline ігнорує); wfrp `reconcile` читає з нього лише `career`. Тест (F4): підроблений baseline з чужим `ledger`/`talents` не змінює результат `reconcile` | розмір обмежує наявний ліміт тіла запиту |
| D67 | (2.3, d) Нейтральна гілка `kind: "test"` в `lib/schemas/out-of-combat.ts` + `acceptsWfrpSheetTest` у системі прийнято для E1: wfrp-літералів і імпортів у core немає. У 3.2 гілка стає `{ kind: "test" }.passthrough()`, а zod полів тесту — `SystemServer.sheetTestSchema` | `.strict()` з переліком полів (`characteristic`/`skill`/`spec`) інакше вимагатиме правки core для нової системи |
| D68 | (2.2, e) d20-герої зберігають `{}` (дефолт колонки) замість wfrp-блоба — прийнято. `contentRowHash` рахується лише для `Unit` (Character у пакетах не хешується), хеш `Unit` закріплено константами для `undefined/null/{}/DEFAULT`; `isEmptySystemData` покриває обидва. Фікс (F3): wfrp `defaults()` повертає свіжу копію, а не спільний `DEFAULT_CHARACTERISTICS` | Review Focus 1 не порушено; спільний обʼєкт — ризик мутації |
| D69 | (part1 п.8, 2.3) Барель `lib/utils/rules/systems/index.ts` — дірка ratchet: споживачі wfrp-імен через барель не рахуються, а 2.3 додав туди `api/types` і `PARTICIPANT_SLOT`. `system-imports.test.ts` фіксує кількість рядків `from "@/systems/` у бареля (зараз 26) як максимум, що лише зменшується; 3.2 доводить до 0 | Review Focus 6: числа не мають рости в обхід списку |
| D70 | (part1 п.3) Пропуск `systems/` у `battle-scope-imports.test.ts` тимчасовий: 4.2 повертає обхід `systems/<id>/**` і звіряє ключі з `NAMESPACES` бою ∪ `meta.i18n.battle` | інакше i18n-ключі wfrp у бою не перевіряються |
| D71 | (2.3) Слот листа — `sheet.systemSlot` (бо `sheet.system` уже ключ), прийнято. Wire-типи — `systems/wfrp/api/types.ts`; у зоні `ui/**` патерн `@/systems/*/api` отримує `allowTypeImports: true` (D60 забороняє виклики api, не типи). Core-імпортери wire-типів (`lib/api/characters.ts`, `useAdvance`, `useCareerOps`, draft-сторінка) — через барель до 3.3/5.x (D69) | |
| D72 | (2.1) Нейтральне `BattleAttack.ignoresEngagement?` додається до переліку D45; суворий `ATTACK_SLOT.parse` (обидва списки) прийнято — wfrp-JSON без зворотної сумісності | `attack-reach` читав якість `pistol` |
| D73 | (2.2) Гейт `create-draft.ts` `!d20Stats` — проксі «це wfrp»; у 3.3 замінити на `!system.creation` | наявність хука, а не відсутність d20 |
| D74 | (part1 п.6, 7, 9) Дозволи ratchet літералів для `SYSTEM_ROOTS` і `lib/utils/templates/registry.ts` прийнято (список дозволених файлів фіксований у тесті); бюджети сторінок — 4.2. Ризик порядку маркерів генератора при двох системах — тест у 6.3 з fixture `d6pool` як другою системою | |
| D75 | `lib/utils/battle/flows/percentile-input.ts` лишається в core назавжди: це UI кидка d100 (`composePercentile`, `TENS_OPTIONS`) і нейтральний хук `attackTarget`; `percentileDice` у `fx/dice/from-action.ts` теж core. З 2.4 вони НЕ переїздять; `D100Input` вирішує 5.1 | «percentile» — тип кубика, не правило wfrp; ratchet рахує лише `wfrp` |
| D76 | Дизайн 2.4 (замінює блок Interfaces задачі 2.4): `combat.details` (`redact`, `actorSecret`, `redactLine`, `diceFx`, `failed`) + `SystemUi.ActionResult`; `combat.judge` — у 3.1 (D58), `resultSummary` не вводиться. Хелпери `ruleSystemByKey(key: string)` (registry.ts) і `systemUiByKey(key: string)` (components/systems/registry.ts): невідомий ключ → `undefined`; `initiative.tieBreak` переходить на `ruleSystemByKey` | слот несе ключ; клієнтські FX не мають `rules` |
| D77 | Приватність fail-closed: для не-DM слот деталей, чий `key` ≠ ключ системи кампанії або система без `combat.details`, видаляється повністю. `redact` повертає той самий обʼєкт (`===`), коли нічого не приховано — core визначає «змінено» за ідентичністю (зайва зміна = зайвий Pusher-payload, egress) | Review Focus 3: регресія = витік |
| D78 | 2.5: `ResolveAttackCtx.momentum` → `sceneState?: SystemSlot` (система сама визначає, чий Momentum, за `participants`); `ResolvedAttack.momentum` → `scene?: SystemSlot`; рядок `battleLog.percentile.momentum` пише система в `lines` (не core у `run.ts:234`, `server-attack.ts:68`); `sceneStatePatch` порівнює через `hashJson` з `lib/utils/battle/store/stable-json` (не `JSON.stringify` — порядок ключів); `rollback` відновлює слот цілком | core не знає `heldBy`/`settle`; reuse |
| D79 | D47 SQL — лише з передперевіркою, резервною копією і захищеним UPDATE (кроки — у задачі 2.5) | `_prisma_migrations` — єдине джерело стану міграцій локальної БД |

**Фікси перед/під час 2.4 (у 2.4a, окремим комітом `refactor(systems): part 2 reconciliation fixes`):** F1 — D69 (ліміт рядків бареля в `system-imports.test.ts`); F2 — таймаут 30 s для ESLint-кейсів `system-imports.test.ts` (флейк 5 s під навантаженням); F3 — `NewCharacterForm`: засів `characteristics.defaults()` перенести з `useEffect` у лінивий ініціалізатор стану форми в хуку (layering: логіка в хуках), wfrp `defaults()` → свіжа копія (D68); F4 — тест D66; F5 — `allowTypeImports` для `@/systems/*/api` у блоці `ui/**` + кейс у матриці (D71).

## Рішення D80+ (проміжне ревʼю частин 1–3, Opus)

Звіт: `.superpowers/sdd/e1-mid-review.md`. Фікси — одна хвиля Sonnet перед частиною 4.

| # | Рішення | Чому |
|---|---|---|
| D80 | Ріст ratchet імпортів 14→23 прийнято як облік (D69: барель ховав ~119 споживачів), але `reason: "route"` для `lib/server/characters/operations/{advance,advance-undo,career,corruption,corruption-undo,downtime,downtime-period,downtime-period-undo}.ts` і `progression-service.ts` відхилено: це D41а. Операції → `systems/wfrp/server/operations/`; `SystemServer.operations?: Record<string, { operation; input: ZodType }>` домерджується в `CHARACTER_OPERATIONS` і `PROGRESSION_INPUTS`; route-файли `app/api` реекспортують із системи (`route`). `characteristicsJson` → листовий файл (розриває цикл registry → handlers → `system-fields` → registry); `advance/careerSet/careerAdvance`-схеми з `lib/schemas/out-of-combat.ts` — у систему | D41 допускає лише три причини; core-шар операцій має бути нейтральним |
| D81 | `lib/server/races/race-profile.ts` (цілком wfrp) → `systems/wfrp/server/`; `profile-usage.ts`, `templates/sync/profile-refs.ts` лишаються `content-kind` до E2 (профіль виду = розширення виду `races` системою, реєструється разом із `careers`) | змішані файли цілісності посилань; хук без реєстру видів контенту — зайвий |
| D82 | Хук `characteristics.initial?(value): SystemData` замість деструктуризації `downtime`/`corruption` у `normalizeCharacterInput` | wfrp-поля в core, ratchet їх не бачить |
| D83 | `units.import` звужує `characteristics` через `parseSystemData(rules, …, "unitCharacteristics")` в `operation-service` (регресія 3.2). Дефолти в ресурсі прийнято; compendium-import пише через ресурс, preview (`nativeBody`) не звужує — прийнято | запис без валідації в JSON-колонку |
| D84 | `NewCharacterForm`: ключ системи приходить зі сторінки (server), `useRuleSystem({ key })`; без порожнього кадру | дані вже є на сервері |
| D85 | D73 закрито без змін: диспетчер — `system.creation`, `!d20Stats` охороняє d20-шлях. `SystemServer.draft` — 6.3/E2 | проксі «це wfrp» більше немає |
| D86 | D64 підтверджено. `SYSTEM_LAYERS`: `ui/**`, `hooks/**` забороняють `@/lib/server*`, `@/lib/db`, `@/systems/*/server*`; `rules/**` — `@/lib/utils/api/*` крім `content-error` (D65). Тест графа: `components/systems/registry.ts` без zod/server-only, `meta.ts` не досягає `registry.ts` | Review Focus 4 тримали лише тести |
| D87 | `scripts/sim/battle-sweep/profiles/**` — дозволене місце літералів (як `scripts/templates/<key>/**`); 3 записи з `system-literals-exempt.json` прибрати | профіль шаблону — частина пакета (D63), не витік |

## Файлова структура (цільова)

```
systems/wfrp/
  meta.ts                 WFRP_META: SystemMeta
  index.ts                WFRP_SYSTEM: RuleSystemDefinition (без zod)
  rules/**                з lib/utils/rules/systems/wfrp/** (+ slots.ts, combat/momentum.ts, percentile/details.ts, ability-effects.ts)
  constants/{characteristics,conditions,mutations}.ts   з lib/constants/wfrp-*.ts
  server/{index.ts,schemas.ts,ai.ts,advance-handler.ts,career-handler.ts,downtime-handler.ts,corruption-handler.ts,draft/**}
  api/**  hooks/**  ui/**   з lib/api (wfrp-функції), lib/hooks/systems/wfrp + useDowntime/useCorruption, components/systems/wfrp + battle D100/Cast/Channel
lib/utils/rules/systems/{meta.ts,registry.ts,types.ts,slot.ts,index.ts,d20/{index,meta}.ts}
lib/server/systems/registry.ts            SYSTEM_SERVER
lib/utils/abilities/schema/system-effects.ts
lib/server/campaigns/system-key.ts        systemKeyOfCampaign (замість isWfrpCampaign)
lib/i18n/system-scope.ts                  systemScope(key, slot)
lib/__tests__/{system-literals,system-imports,system-contract,systems-index}.test.ts
scripts/shared/systems-index.ts           генератор рядків систем у коренях (--write/--check)
system-literals-exempt.json, system-imports-exempt.json   (корінь репозиторію, поруч з i18n-exempt.json)
scripts/templates/systems/{index.ts,d20/{index,prepare}.ts,d20/i18n/**,homm/**,wfrp/**}
scripts/templates/lib/i18n-validate.ts
prisma/migrations/20261123000000_battle_scene_system_state/migration.sql
```

Видаляються: `lib/utils/rules/systems/{wfrp/**,schemas.ts,profile-refs.ts → systems/wfrp}`, `components/systems/wfrp/**`, `lib/hooks/systems/wfrp/**`, `lib/constants/wfrp-*.ts`, `lib/utils/battle/momentum.ts`, `lib/utils/battle/participant/extract-wfrp-attacks.ts`, `lib/ai/tools/wfrp-view.ts`, `scripts/templates/lib/import-prepare.ts`, `scripts/srd/i18n/**`, `RULE_SYSTEM_KEYS` у `lib/constants/rules.ts`, `isWfrpCampaign`, `WFRP_*_EXTRA`, `WFRP_BATTLE_NAMESPACES`, `WFRP_ONLY`, `requiresSystem`.

## Review Focus

1. **d20 без змін.** Знімок бою, `ClientBattleDelta`, `actionDetails` і `contentRowHash` для homm/dnd5e побайтно ті самі до й після (тести 2.2, 2.4, 2.5; `battle-sweep` після частини 3). `scene.system` і `attack.system` у d20 не зʼявляються ніколи.
2. **Жодного wfrp у типах core.** `types/**` і `lib/utils/rules/systems/types.ts` не мають імпортів `@/systems/*` і `typeof <функція системи>`; звуження слота відбувається лише в `systems/wfrp`. Чужий ключ слота → `read()` повертає `undefined`, не кидає.
3. **Приватність не послабшала.** Редакція miscast/захисника для гравців (`visibility.ts`, `redactDeltaForPlayers`, журнал) працює через `combat.redactAction`; dm-канал повний. Регресія тут = витік прихованих даних.
4. **Клієнтський граф.** `lib/utils/rules/systems/registry.ts` і `systems/wfrp/index.ts` не досягають zod; `meta.ts` не досягає логіки; `server-only` не потрапляє в `ui/**` (`wfrp-import-cycle`, `client-entry-imports`, `import/no-cycle`).
5. **Зони справді діють.** Flat-config перезаписує `no-restricted-imports` останнім блоком: для матриці файлів (`lib/utils/battle/x.ts`, `components/x.tsx`, `types/x.ts`, `app/api/x/route.ts`, `systems/wfrp/{rules,ui,hooks,server}/x.ts`, корені, exempt-файл) `calculateConfigForFile` дає очікуваний набір патернів разом із наявними (`MODE_IMPORT_PATTERN`, `API_IMPORT_PATTERN`, `DB_IMPORT_PATH`, діалоги).
6. **Ratchet чесний.** Exempt-списки наприкінці містять лише причини D41; лічильники не «підігнані» перейменуванням ідентифікаторів без винесення коду (наприклад `wfrp` → `grim` у core).

---

# Частина 1: каркас — meta, слот, перенесення, зони, індекс (E1.1 + ранній E1.11)

Один виконавець, чотири задачі послідовно. Поведінка не змінюється.

### Задача 1.1: `git mv` wfrp у `systems/wfrp/`

**Files:**
- Move: `lib/utils/rules/systems/wfrp/**` → `systems/wfrp/rules/**` (166 файлів, з `__tests__`); `index.ts` і `rules-preset.ts` → `systems/wfrp/{index.ts,rules/rules-preset.ts}`; `components/systems/wfrp/**` → `systems/wfrp/ui/**` (69); `lib/hooks/systems/wfrp/**` → `systems/wfrp/hooks/**` (7); `lib/constants/wfrp-{characteristics,conditions,mutations}.ts` → `systems/wfrp/constants/`; `lib/utils/rules/systems/{schemas.ts,profile-refs.ts}` → `systems/wfrp/server/{schemas.ts,profile-refs.ts}`
- Modify: усі імпортери (codemod за префіксом): `@/lib/utils/rules/systems/wfrp` → `@/systems/wfrp/rules`, `@/components/systems/wfrp` → `@/systems/wfrp/ui`, `@/lib/hooks/systems/wfrp` → `@/systems/wfrp/hooks`, `@/lib/constants/wfrp-<x>` → `@/systems/wfrp/constants/<x>`, `@/lib/utils/rules/systems/schemas` → `@/systems/wfrp/server/schemas`; відносні `../types`, `./wfrp/...` у `types.ts`, `index.ts`, `registry.ts`; `vitest.config.mts` (`coverage.include` + `systems/**/*.ts`); `lib/utils/rules/systems/__tests__/{wfrp-import-cycle,eslint-isolation}.test.ts` (шляхи; `WFRP_ENTRY = "systems/wfrp/index.ts"`); `eslint.config.mjs`: тимчасово `SYSTEM_IMPORT_PATTERN.group` = `["@/systems/wfrp/**", "@/lib/utils/rules/systems/d20*"]`, `SYSTEM_OWNED_FILES` + `systems/**`, блоки з `files: ["app/**","components/**","lib/**"]` + `systems/**`

Барель `lib/utils/rules/systems/index.ts` у цій задачі ще реекспортує wfrp-імена (з нових шляхів): 106 імпортерів не чіпаємо. Тести, що лежали в перенесених теках, їдуть разом; інші тести лише отримують нові шляхи імпорту.

**Тест-кейси:** `wfrp-import-cycle`, `client-entry-imports`, `registry.test.ts` (логіка й UI), `scope-size` зелені без правок очікувань; `rg "lib/utils/rules/systems/wfrp|components/systems/wfrp|lib/hooks/systems/wfrp|constants/wfrp-" --glob '!docs/**'` порожній.

- [ ] `git mv` → codemod → `pnpm exec tsc --noEmit -p tsconfig.json` → `pnpm test:run systems/wfrp lib/utils/rules/systems components/systems lib/hooks/systems` → `pnpm exec eslint` на `eslint.config.mjs`, обидва реєстри й 20 випадкових перенесених файлів → комміт (один, механічний).

### Задача 1.2: `SystemMeta`, `SystemSlot`, реєстр meta

**Files:**
- Create: `lib/utils/rules/systems/{slot.ts,meta.ts,d20/meta.ts}`, `systems/wfrp/meta.ts`
- Test: `lib/utils/rules/systems/__tests__/{slot,meta}.test.ts`

**Interfaces — Produces:**
```ts
// slot.ts (нуль імпортів)
export type SystemData = Record<string, unknown>;
export interface SystemSlot { key: string; data: unknown }
export interface SlotCodec<T> { key: string; read(slot: SystemSlot | undefined | null): T | undefined; write(data: T): SystemSlot }
export const defineSlot: <T>(key: string, parse: (raw: unknown) => T | undefined) => SlotCodec<T>;   // read: чужий key або parse → undefined

// meta.ts (композиційний корінь даних; імпортує лише ./d20/meta і @/systems/*/meta; рядки систем з 1.4 — генеровані)
export interface SystemI18n {
  battle?: readonly string[]; campaign?: readonly string[]; member?: readonly string[]; dm?: readonly string[];
  pages?: Partial<Record<SystemPageScope, readonly string[]>>;
  budgetKb?: { member?: number; dm?: number; pages?: Partial<Record<SystemPageScope, number>> };
}
export type SystemPageScope = "character" | "dmCharacters" | "dmCharacter" | "dmRules";
export interface SystemMeta {
  module: string;                          // "d20" | "wfrp": межа include пакетів (R17)
  keys: readonly string[];                 // d20: ["homm","dnd5e"]
  i18n: SystemI18n;
  unusedMechanics: readonly string[];      // MechanicKey; тип рядковий, щоб meta не імпортував реєстр механік
  dmSections?: readonly string[];          // шляхи DM_SECTIONS, що показуються лише цій системі
}
export const SYSTEM_META: readonly SystemMeta[];
export const RULE_SYSTEM_KEYS: readonly string[];
export const isRuleSystemKey: (k: unknown) => k is string;
export const metaOf: (key: string) => SystemMeta | undefined;
export const systemNamespaces: () => readonly string[];
```
`WFRP_META`: `module "wfrp"`, `keys ["wfrp"]`, i18n з чинних `WFRP_BATTLE_NAMESPACES` (лише `battleWfrp`), `WFRP_CAMPAIGN_EXTRA`, `WFRP_MEMBER_EXTRA`, `WFRP_DM_EXTRA`, сторінкових `wfrpDowntime`/`wfrpCorruption`/`battleWfrp` (4 сторінки, значення — з `app/campaigns/[id]/**/page.tsx`), бюджети 107/111/2/2 зі `scope-size.test.ts`; `unusedMechanics` — чинний список з `WFRP_SYSTEM`; `dmSections ["careers"]`. `D20_META`: `unusedMechanics ["advancement","tables"]` (зміст `WFRP_ONLY`), решта порожня. У цій задачі meta ще ніхто не споживає.

**Тест-кейси:** `defineSlot`: свій ключ → дані; чужий → `undefined`; `parse` повернув `undefined` → `undefined`; `write` → `{ key, data }`. `RULE_SYSTEM_KEYS` = `["homm","dnd5e","wfrp"]` (порядок: d20, далі теки `systems/*` за абеткою); `systemNamespaces()` ⊆ `NAMESPACES`; meta-файли не мають value-імпортів (regex по файлу).

- [ ] Тести → реалізація → `pnpm test:related` → комміт.

### Задача 1.3: ESLint-зони і два ratchet-знімки

**Files:**
- Modify: `eslint.config.mjs`, `lib/utils/rules/systems/__tests__/eslint-isolation.test.ts` (переписати під матрицю Review Focus 5), `scripts/templates/__tests__/fourth-pack.test.ts` (grep ключів шаблонів виноситься)
- Create: `system-imports-exempt.json`, `system-literals-exempt.json`, `lib/__tests__/{system-imports,system-literals}.test.ts`, `scripts/shared/system-ratchet.ts` (друкує/перезаписує знімок: `--write`)

**ESLint (D38, D52, D60, D61):**
```js
const SYSTEM_IDS = readdirSync(new URL("./systems", import.meta.url), { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name);
const SYSTEM_ROOTS = ["lib/utils/rules/systems/meta.ts", "lib/utils/rules/systems/registry.ts", "components/systems/registry.ts", "lib/server/systems/registry.ts", "lib/utils/abilities/schema/system-effects.ts", "scripts/templates/systems/index.ts"];
const SYSTEM_IMPORT_EXEMPT = JSON.parse(readFileSync(new URL("./system-imports-exempt.json", import.meta.url), "utf8")).map((e) => e.file);
const SYSTEM_ZONE_PATTERN = { group: ["@/systems/*", "@/systems/**"], message: "Система — лише через реєстри (D38)" };
```
- Заборонити `SYSTEM_ZONE_PATTERN`: `app/** components/** lib/** types/** scripts/**`, крім тестів, `SYSTEM_ROOTS`, `SYSTEM_IMPORT_EXEMPT`, `scripts/templates/systems/<module>/**` (скриптова частина системи), `scripts/assets/grim-icons/**`.
- Для кожного `id` із `SYSTEM_IDS`: `systems/<id>/**` забороняє `@/systems/<інший>/**`, `@/app/*`, `@/scripts/*`; під-блоки шарів за D60 (`rules`, `ui`, `hooks`, `api`).
- `types/**/*.ts` входить у зону; `SYSTEM_IMPORT_PATTERN` → лише d20 (D61).
- Наявні патерни не губляться: набір для файла = обʼєднання (хелпер `restricted({ paths, patterns })`, один на блок; жодного «голого» перезапису).

**Ratchet імпортів:** знімок = усі нетестові файли поза `systems/`, що імпортують `@/systems/` (барель `index.ts`, `types.ts`, ~45 core-файлів, route-файли, AI). `reason` на цьому кроці: `route`, `content-kind`, `ruleset-section` або `e1:<номер задачі, що його прибере>`.
**Ratchet літералів:** знімок генерує `scripts/shared/system-ratchet.ts --write` (орієнтир на HEAD 26978621f: ~91 файл / ~470 входжень `wfrp` у `lib app components types`, ~20 у `scripts`).

**Тест-кейси:** матриця Review Focus 5; `system-imports`: файл зі списку зник або перестав імпортувати `@/systems/` → падіння з назвою; новий імпортер поза списком ловить ESLint (перевірка через `ESLint.lintText` на рядку `import x from "@/systems/wfrp/rules"` для `lib/utils/battle/foo.ts`). `system-literals`: лічильник > max → «new leak», < max → «lower the entry», файл поза списком з входженнями → падіння; `systems/wfrp/**` і тести ігноруються; ключ шаблону `"srd-5.2"` поза `lib/utils/templates/registry.ts` → падіння (перенесений кейс).

- [ ] Тести → конфіг → знімки → `pnpm exec eslint` на матрицю файлів + усі файли exempt-списку (не repo-wide) → `pnpm test:run lib/__tests__ lib/utils/rules/systems/__tests__` → комміт.

### Задача 1.4: генерований індекс систем (D38)

**Files:** Create `scripts/shared/systems-index.ts`, `lib/__tests__/systems-index.test.ts`, `package.json` (скрипт `systems:index`: `tsx scripts/shared/systems-index.ts`, прапорці `--write` (за замовчуванням) і `--check`); Modify шість коренів із D38 (обгорнути рядки систем маркерами `// <systems:generated>` … `// </systems:generated>`).
Генератор читає `systems/*` і для кожного кореня емітить імпорти й записи реєстру лише для шарів, що існують у теці системи (`meta.ts`, `index.ts`, `ui/index.ts`, `server/index.ts`, `rules/ability-effects.ts`, `scripts/templates/systems/<module>/index.ts`); відсутній шар (ще не створений на цьому етапі) пропускається, а не помилка. Рядки d20 лишаються рукописними поза маркерами.
**Тест-кейси:** `--check` на чистому дереві → exit 0; змінений вручну генерований блок → exit 1 з назвою кореня; тека `systems/<id>` без `meta.ts` → помилка; у тесті `systems-index.test.ts` запуск `--check` як функції (без підпроцесу); порядок записів = абетка за `id` (детермінований вивід).
- [ ] Тест → генератор → `pnpm systems:index` → `pnpm test:run lib/__tests__/systems-index.test.ts` → `pnpm exec eslint --fix` на нових файлах і коренях → комміт.

---

# Частина 2: core-типи без wfrp (E1.2, частина E1.4)

Один виконавець, пʼять задач, кожна — окремий комміт у порядку нижче. Перед стартом прочитати `docs/architecture/battle.md` і `.claude/rules/db-deploy.md` (для 2.5). Кодеки — `systems/wfrp/rules/slots.ts`; `parse` — легкий структурний guard без zod.

```ts
// systems/wfrp/rules/slots.ts
export const ATTACK_SLOT: SlotCodec<{ qualities: QualityRef[]; flaws: QualityRef[]; noSb?: boolean; magical?: true }>;
export const PARTICIPANT_SLOT: SlotCodec<{ characteristics: Characteristics; stats: WfrpParticipantStats }>;
export const SHEET_SLOT: SlotCodec<SheetWfrpBlock>;
export const ACTION_SLOT: SlotCodec<{ attack?: PercentileAttackDetails; cast?: PercentileCastDetails }>;
export const SCENE_SLOT: SlotCodec<{ momentum: SceneMomentum }>;
```

### Задача 2.1: слот атаки, нейтральні `ammo`/`reachCells`/`blastRadius` (D45)

**Files:**
- Modify: `types/battle.ts:16,159` (`BattleAttack.wfrp` → `system?: SystemSlot` + `ammo?`, `reachCells?`, `blastRadius?`, `noLevelDice?`), `lib/utils/battle/ammo/{init,spend,reload}.ts`, `lib/utils/battle/grid/attack-reach.ts`, `lib/utils/battle/attack-phase/targets.ts`, `lib/utils/battle/attack/{max-targets,server-attack}.ts`, `lib/utils/battle/attack/process/compute.ts` (передає `attack` у `mitigateDamage`, не розкладає `attack.wfrp`), `lib/utils/battle/damage/hero-damage.ts` (`noLevelDice`), `lib/utils/battle/participant/{extract-attacks,from-unit,refresh-from-source}.ts`, `lib/hooks/battle/useAttackWizard.ts`, `lib/utils/rules/systems/types.ts` (`MitigateCtx`: `qualities/flaws/noSb` → `attack: BattleAttack`; `WeaponProfile` → у систему)
- Move: `lib/utils/battle/participant/extract-wfrp-attacks.ts` → `systems/wfrp/rules/combat/extract-attacks.ts`; core викликає новий хук `combat.attacksOf?(input): BattleAttack[] | undefined`
- Test: наявні `ammo/*`, `attack-reach`, `targets`, `extract-attacks`, `wfrp-battle-e2e`, `wfrp-traits-e2e`; новий `systems/wfrp/rules/__tests__/slots.test.ts`

**Тест-кейси:** wfrp-атака: `attack.system.key === "wfrp"`, боєзапас/перезарядка/досяжність/Blast поводяться як до задачі (чинні тести, оновлені фікстури); d20-атака: у JSON немає ключів `system`, `ammo`, `reachCells`, `blastRadius`, `noLevelDice` (snapshot `extract-attacks` для героя homm і dnd5e без змін); `ATTACK_SLOT.read` на d20-атаці → `undefined`.

### Задача 2.2: слот учасника і непрозора колонка `characteristics` (D44, D59)

**Files:**
- Modify: `types/battle.ts:15,189-190` (`abilities.system?: SystemSlot`), `types/{characters,units}.ts` (`characteristics?: SystemData`), `lib/utils/rules/systems/types.ts` (`characteristics: { persisted: boolean; defaults(): SystemData | undefined; isEmpty(v: unknown): boolean; sheetBlock(input): SystemSlot | undefined }`, `participantFields?(row, gear?): SystemSlot`, `initiative.tieBreak?(p): number`, `progression.maxHp(input: { character; characteristics: unknown; rules })`, `progression.hpTerm`, `resources: { limits?(row): { fateMax?: number }; seed?(characteristics: unknown): Partial<CharacterResources> }`, `rest.onSession?(resources, characteristics: unknown)`), `lib/utils/rules/systems/d20/index.ts`, `systems/wfrp/index.ts`
- Modify (8 місць `kind`): `lib/server/content/resources/units.ts:28`, `lib/server/characters/core/system-fields.ts:22`, `resources-handler.ts:35`, `lib/server/characters/operations/create.ts:136`, `lib/utils/units/import-units.ts:86`, `lib/utils/characters/sheet/build-sheet.ts:127`, `lib/hooks/battle/useBattleRules.ts:28`, `components/characters/list/DmCharacterCard.tsx:45`
- Modify (споживачі wfrp-імен з бареля): `lib/utils/characters/{hero-hp,character-form}.ts`, `lib/utils/characters/form/{bindings,defaults}.ts`, `lib/utils/units/to-unit.ts`, `lib/utils/content/row-hash.ts`, `lib/utils/battle/participant/from-character.ts`, `lib/utils/battle/turn/initiative.ts:49`, `lib/server/battles/participant/load-character-context.ts`, `lib/server/characters/{lock.ts,core/rest-handler.ts,operations/{list,patch}.ts}`
- Test: `lib/utils/content/__tests__/row-hash.test.ts`, `lib/utils/rules/systems/__tests__/registry.test.ts`, наявні тести змінених файлів

`row-hash.ts` не має контексту правил: `isEmptySystemData(v)` у `registry.ts` = `v == null || {} || будь-яка система каже isEmpty(v)`. `patch.ts`/`list.ts`: `preserveServerOwned`, `redactLedger`, `sameCareer` → хуки `characteristics.reconcile?(stored, incoming, ctx: { isDM; baseline? })` (кидає 409-код через наявний `ContentError`) і `characteristics.redact?(value, viewer)`; `careerBaseline` у `CharacterFormData` → `systemBaseline?: unknown`. `from-character.ts:163` і `load-character-context.ts:112` (таланти): `advancement?.talentsOf(row): Record<string, number>`.

**Тест-кейси:** `contentRowHash("Unit", row)` для `characteristics` ∈ {відсутнє, `null`, `{}`, дефолт wfrp, непорожнє} дає ті самі хеші, що на HEAD (значення зафіксувати константами перед правкою) — Review Focus 1; d20: PATCH із `characteristics` відкидається, wfrp: зберігається; гравець не підробляє `talents`/`ledger`/`career` (чинні тести `patch`, `wfrp-careers-e2e`); `list` чужому гравцю віддає порожній леджер; тай-брейк ініціативи wfrp за Ag; учасник d20 не має `abilities.system`.

### Задача 2.3: слот листа

**Files:** `types/characters.ts:15,241` (`sheet.system?: SystemSlot`; `SheetWfrpBlock` → `systems/wfrp/rules/characteristics/sheet-block.ts`; `DifficultyKey` → `string`; `WfrpDraft*Input`, `AdvanceBody`, `CareerResult`, `AdvanceResult` → `systems/wfrp/api/types.ts`), `lib/utils/characters/sheet/build-sheet.ts`, `components/character-profile/{ProfileHero.tsx,rest/{ResourcesDialog,RestBadges,SheetRollDialog}.tsx}`, `components/systems/types.ts` (`DifficultyKey` → `string`, `DraftFormProps.initialIdentity: unknown`), `lib/schemas/out-of-combat.ts` (гілка `kind: "test"`: `characteristic`/`skill`/`difficulty` — рядки з обмеженням довжини; звуження — `sheetTest.accepts(body)` системи, яка вже викликається в `roll-handler`), споживачі `sheet.wfrp` у `systems/wfrp/ui/**` (через `SHEET_SLOT.read`)

**Тест-кейси:** `build-sheet` для wfrp-героя: `sheet.system.key === "wfrp"`, `SHEET_SLOT.read` дає той самий блок, що раніше `sheet.wfrp`; для d20 `sheet.system` відсутній; тест із листа з невідомою характеристикою → 400 від системи (не від core-схеми), з невідомою складністю → 400; `profile-view.test.tsx` зелений.

### Задача 2.4: слот деталей дії (D48)

**Files:**
- Move (у 2.4c): `PercentileAttackDetails`, `PercentileCastDetails` з `lib/utils/battle/types/attack.ts` → `systems/wfrp/rules/percentile/details.ts`; `lib/utils/battle/attack/process/percentile-log.ts` → `systems/wfrp/rules/combat/log.ts`; `components/battle/overlays/{PercentileResultLines,CastResultLines}.tsx` → `systems/wfrp/ui/battle/`. `flows/percentile-input.ts` і `percentileDice` НЕ переїздять (D75)
- Create: `lib/utils/battle/fx/dice/types.ts` (`DieFx` — тип грані з `DiceThrowSpec`, без імпортів; щоб `types.ts` ↔ `from-action.ts` не дали цикл), `systems/wfrp/rules/combat/details.ts` (реалізація `combat.details`), `systems/wfrp/ui/battle/ActionResult.tsx`
- Modify: `types/battle.ts:14,744-745`, `types/battle-scene.ts`, `lib/utils/battle/types/{attack,attack-process,spell-process}.ts`, `lib/utils/battle/attack/process/{run,actions,compute,hit,miss,critical-fail}.ts`, `lib/utils/battle/attack/server-attack.ts`, `lib/utils/battle/spell/cast/{index,finish}.ts`, `lib/utils/battle/view/{visibility,attack-result-fx,spell-result,log-format}.ts`, `lib/utils/battle/fx/dice/from-action.ts`, `lib/utils/battle/damage/consequences.ts` і `common/action-flow.ts` (`location?: string`), `components/battle/overlays/ActionResultCard.tsx`, `lib/utils/rules/systems/{types,registry}.ts`, `components/systems/{types,registry}.ts`, `systems/wfrp/{index.ts,ui/index.ts,rules/slots.ts,rules/combat/resolve-attack.ts,rules/magic/**}`. `roll-handler.ts` не чіпаємо: `kind: "percentile"` позакомбатного кидка — тип кубика (D75)

**Interfaces — Produces (D76, D77; замінює попередній блок):**
```ts
// lib/utils/battle/types/attack.ts — d20 ці три поля не пише ніколи
interface AttackRollResult { /* …наявні поля… */ system?: SystemSlot; margin?: number; location?: string }   // було percentile?
// types/battle.ts
actionDetails: { /* … */ system?: SystemSlot }                       // було percentile? / percentileCast?
// types/battle-scene.ts (ResultFx)
| { kind: "hit" | "crit"; /* … */ system?: SystemSlot; exact?: true }    // було percentile?
| { kind: "miss"; /* … */ system?: SystemSlot; exact?: true }
| { kind: "spell"; /* … */ system?: SystemSlot }                       // було cast?

// lib/utils/rules/systems/types.ts
export interface ResolvedAttack {
  isHit: boolean;
  attackRoll: AttackRollResult;        // margin/location/system — тут; netSl і location з ResolvedAttack прибрано
  defenseValue?: number;               // core пише в actionDetails.targetAC (було percentile.defender.target)
  lines: LogLine[];                    // рядки тесту (колишній percentileLines) — пише система
  momentum: …; fortune?: …; fortuneLine?: LogLine;   // без змін до 2.5 (D78)
}
export interface CastTestResult { success: boolean; margin: number; overcastSteps: number; miscast: string | null; keepChannelled?: true; details: SystemSlot; lines: LogLine[]; fortune?: … }
// MitigateCtx: netSl → margin, location: string. FortuneKind лишається (лічильник fortune — core, D45); MiscastKind → string
export interface ActionDetailsView { hideNumbers: boolean; hideActor: boolean }
export interface RuleSystemActionDetails {
  /** Same reference when nothing is hidden; undefined drops the slot */
  redact(details: SystemSlot, view: ActionDetailsView): SystemSlot | undefined;
  /** Details reveal something only the actor's side may see (a miscast) */
  actorSecret(details: SystemSlot): boolean;
  /** Applied to every line a player receives; idempotent */
  redactLine(line: LogLine): LogLine;
  diceFx(details: SystemSlot): DieFx[];   // одна група одного кидка; [] — без кидка
  failed(details: SystemSlot): boolean;   // каст не подіяв (ActionResultCard не пише «застосовано»)
}
interface RuleSystemCombat { /* … */ details?: RuleSystemActionDetails }
// registry.ts / components/systems/registry.ts
export const ruleSystemByKey: (key: string) => RuleSystemDefinition | undefined;
export const systemUiByKey: (key: string) => SystemUi | undefined;
// components/systems/types.ts
SystemUi.ActionResult?: ComponentType<{ details: SystemSlot; hit: boolean; exact: boolean }>;
// systems/wfrp/rules/slots.ts
export const ACTION_SLOT: SlotCodec<{ attack?: PercentileAttackDetails; cast?: PercentileCastDetails }>;
```
**Core-алгоритм `sanitizeLogEntry` (не-DM):** `hook = ruleSystemOf(ctx.rules).combat.details`; `casterConditions = ((sys && hook?.actorSecret(sys)) || log.some(isMiscastLine)) && !actorExact`; `system = sys && hook && sys.key === systemKeyOf(ctx.rules) ? hook.redact(sys, { hideNumbers, hideActor: casterConditions }) : undefined` (D77 fail-closed); рядки: `conceal?(hook?.redactLine(l) ?? l)`; «змінено» = `stripsNumbers || system !== sys || linesChanged || casterConditions`. Wfrp `redact`: `hideNumbers` → без `attack` (каст лишається, як `rest` на HEAD); завжди без `attack.defender`; `hideActor` → `cast.miscast = null`; порожній слот → `undefined`. `log-format.ts`: `!d.percentile` → `!d.system`. `attack-result-fx.ts`: FX зберігає `system` + `exact`, підміну `sl = netSl` і приховування `defender` робить wfrp `ActionResult` за `exact` (дані гравця вже серверно редаговані). `spell-result.ts castDetailsOf` бере лише записи касту (`actionType` заклинання), бо слот тепер мають і атаки. `from-action.ts`: `ruleSystemByKey(sys.key)?.combat.details?.diceFx(sys)` з тим самим seed; wfrp повертає пару d10 лише для `attack` (каст без кидка, як на HEAD).

**Порядок (три коміти, кожен з чистим `tsc` і зеленими ratchet):**
- **2.4a — адитивно, core ще не споживає:** фікси F1–F5 (окремий комміт); потім: закріпити константами JSON `actionDetails` d20-атаки й касту і `diceThrowsOf` d20-дії на поточному HEAD; контракт (`RuleSystemActionDetails`, `ruleSystemByKey`, `systemUiByKey`, `ActionResult?`, `DieFx`); wfrp `ACTION_SLOT`, `combat.details`, `ActionResult` (рендерить наявні core-компоненти `PercentileResultLines`/`CastResultLines` — напрям система→core дозволений) з юніт-тестами на фікстурах слота.
- **2.4b — атомарне перемикання (приватність в одному коміті з формою даних):** типи `AttackRollResult`/`actionDetails`/`ResultFx`/`ResolvedAttack`/`CastTestResult`/`MitigateCtx`; рушій (`run`, `actions`, `compute`, `hit`, `server-attack`, `spell/cast/{index,finish}`, `consequences`, `action-flow`); wfrp `resolveAttack`/`castTest` пишуть слот і `lines`; `visibility`, `log-format`, FX, `ActionResultCard` через хуки; тести приватності переносяться в цьому ж коміті.
- **2.4c — механічні `git mv`** (типи деталей, `percentile-log`, два компоненти) у систему, оновлення імпортів, `system-ratchet --write` (числа лише зменшуються).

**Тест-кейси (обовʼязкові; P1–P7 — Review Focus 3, не видаляти й не послаблювати чинні асерти `visibility.test.ts`, `battle-response.test.ts`, `spell-result.test.ts`, `wfrp-magic-e2e`, `spell-mutation-wfrp`):** P1 гравець, протиставлена атака по видимій цілі: у слоті немає `defender`, `roll/target/sl/netSl` є; DM: запис `===` вхідному. P2 прихована ціль / без цілей: частини `attack` немає, `cast` лишається, `targetAC`/шкода прибрані. P3 ворожий кастер невидимий + miscast у деталях: `cast.miscast === null`, рядки miscast прибрані, `concealLine` застосовано; видимий кастер — без змін. P4 рядок `battleLog.percentile.opposed` → `opposedHidden` для кожного гравця; повторна редакція = одинарна. P5 слот з чужим ключем (`{ key: "zzz" }`) у wfrp- і d20-кампанії → для гравця видалено, DM бачить. P6 wfrp-запис без секретів → той самий обʼєкт (`changed: false`). P7 шлях `redactDeltaForPlayers`/`read-battle`/журнал: гравецький канал без `defender` і miscast, dm-канал повний. Далі: P8 d20 — закріплені в 2.4a константи `actionDetails` і `diceThrowsOf` незмінні (Review Focus 1). P9 FX: wfrp-атака → дві d10 з тим самим seed; лише каст → без d100-кидка; невідомий ключ → без кидка. P10 `castDetailsOf` не бере запис атаки того ж актора. P11 `ACTION_SLOT.read` на d20/чужому слоті → `undefined`; `ruleSystemByKey("zzz")` → `undefined`.

### Задача 2.5: слот сцени, міграція (D46, D47)

**Files:**
- Move: `lib/utils/battle/momentum.ts` → `systems/wfrp/rules/combat/momentum.ts`
- Create: `lib/utils/battle/scene-state.ts` (`sceneStatePatch(before, after): { system: SystemSlot | null } | {}` — порівняння `hashJson` зі `stable-json`, D78; d20: `(undefined, undefined)` → `{}`)
- Контракт (D78): `ResolveAttackCtx.momentum` → `sceneState?: SystemSlot`; `ResolvedAttack.momentum` → `scene?: SystemSlot`; рядок здобутого Momentum — у `ResolvedAttack.lines` (з `run.ts` і `server-attack.ts` прибрати `textRef("battleLog.percentile.momentum")`, `heldBy`, `settle`, `NO_MOMENTUM`)
- Rename: `prisma/migrations/20261123000000_battle_scene_momentum` → `…_battle_scene_system_state` (SQL: `ALTER TABLE "battle_scenes" ADD COLUMN "system_state" JSONB;`), `prisma/schema.prisma` (`systemState Json? @map("system_state")`)
- Modify (перейменування `momentum` → `sceneState`, тип `SystemSlot | undefined`): `types/{battle,api}.ts`, `lib/utils/battle/store/{types,snapshot-state,save-battle,load-battle}.ts`, `lib/utils/battle/pipeline/{client-delta,battle-response}.ts`, `lib/utils/battle/client/apply-delta.ts`, `lib/utils/battle/attack-phase/run-attack-phase.ts`, `lib/utils/battle/attack/{retaliation,server-attack}.ts`, `lib/utils/battle/attack/process/run.ts`, `lib/utils/battle/actions/{opportunity,run,movement,legendary}.ts`, `lib/utils/battle/spell/cast/index.ts`, `lib/utils/battle/types/attack-process.ts`, `lib/server/battles/mutations/{attack,core-action,move,start,rollback,reset,complete}/*`, `lib/hooks/battle/{useBattleRules,useAttackWizard}.ts`

**D47 (затверджено 2026-11-11), окремий крок:** перейменування теки й колонки `momentum` → `system_state` + виправлення локальних БД. Локальні БД (`wfrp`, `prodcopy`; лише localhost, порт 54322; перед запуском перевірити, що `DATABASE_URL` — localhost): `ALTER TABLE battle_scenes RENAME COLUMN momentum TO system_state;` + `UPDATE _prisma_migrations SET migration_name = '20261123000000_battle_scene_system_state', checksum = '<sha256 migration.sql>' WHERE migration_name = '20261123000000_battle_scene_momentum';` потім `pnpm exec prisma migrate status` → «up to date». Якщо БД відсутня або не localhost — зупинитись і повідомити. Оновити перелік міграцій у `docs/STATUS.md` (п.1 чекліста).
- [ ] **Крок D47 (явний, D79):** (0) **передперевірка й backup** для кожної БД: `SELECT current_database(), inet_server_addr(), inet_server_port();` (лише localhost:54322); `SELECT migration_name, checksum, finished_at, rolled_back_at FROM _prisma_migrations WHERE migration_name LIKE '%battle_scene%';` і `SELECT column_name FROM information_schema.columns WHERE table_name='battle_scenes' AND column_name IN ('momentum','system_state');` — у звіт. Очікувано: рядок `_momentum` з `finished_at` і колонка `momentum`. Якщо вже `system_state` і новий рядок — пропустити БД; якщо рядка `_momentum` немає і немає жодної з колонок — не правити, а `pnpm exec prisma migrate deploy` (лише localhost); будь-який інший стан — зупинитись і повідомити. Backup: `\copy (SELECT * FROM _prisma_migrations WHERE migration_name='20261123000000_battle_scene_momentum') TO '<scratchpad>/prisma_migrations_<db>.csv' CSV HEADER` (поза репозиторієм; шлях — у звіт). (1) `shasum -a 256 prisma/migrations/20261123000000_battle_scene_system_state/migration.sql`; (2) для кожної з БД `wfrp` і `prodcopy` (`psql -h localhost -p 54322`): `BEGIN; ALTER TABLE battle_scenes RENAME COLUMN momentum TO system_state; UPDATE _prisma_migrations SET migration_name='20261123000000_battle_scene_system_state', checksum='<sha256>' WHERE migration_name='20261123000000_battle_scene_momentum' AND checksum='<старий checksum з кроку 0>';` → якщо не `UPDATE 1`, то `ROLLBACK` і зупинитись, інакше `COMMIT;`; (3) **перевірка:** `pnpm exec prisma migrate status` для кожної БД → «Database schema is up to date», `\d battle_scenes` показує `system_state` і не показує `momentum`, `SELECT migration_name FROM _prisma_migrations WHERE migration_name LIKE '%battle_scene%'` — один рядок з новою назвою; (4) вивід перевірки — у звіт задачі.

**Тест-кейси:** d20-бій: у дельті, знімку й відповіді немає ключа `system` сцени (Review Focus 1); wfrp: Momentum здобувається, витрачається, переходить, відкочується `rollback` (чинні `wfrp-battle-e2e`, тести `momentum` переїздять у систему); `spell/cast` і `berserk` не змінюють стан сцени; `migrations-rls`, `content-base-fk-drift` зелені.

- [ ] Для кожної задачі 2.1–2.5: тести (failing) → реалізація → `tsc` → `pnpm test:related <змінені>` + e2e `wfrp-*-e2e` зачепленої області → оновити обидва exempt-файли (`pnpm exec tsx scripts/shared/system-ratchet.ts --write`, перевірити, що числа зменшились) → комміт.

---

# Частина 3: диспетчери бою і сервер системи (E1.3, решта E1.4)

Один виконавець, чотири задачі.

### Задача 3.1: суддя атаки, дискримінатор `dice`

**Files:** `lib/utils/battle/attack/process/run.ts:83` (`judgeWfrp` → у систему; core: `combat.resolveAttack ? resolveAttack(ctx) : judgeD20(...)`), `lib/utils/battle/attack/server-attack.ts` (`judgeServerWfrp` так само), `lib/utils/battle/attack/process/actions.ts:182`, `lib/utils/battle/attack-phase/run-attack-phase.ts:89`, `lib/utils/battle/turn/berserk.ts` (`dice === 20` → `judge === "client"`; розмір кубика й далі `combat.dice`), `lib/schemas/battles.ts` (верхня межа кидка з `combat.dice`, без змін змісту), `lib/utils/rules/systems/types.ts` (`dice: number`)

**Тест-кейси:** наявні тести `attack/process`, `attack-phase`, `berserk`, `wfrp-battle-e2e` зелені; у `lib/utils/battle/**` (нетестовий код) немає `judgeWfrp`, `dice === 20`, `dice === 100`, `.wfrp` (grep-кейс у `system-contract.test.ts`).

### Задача 3.2: `types.ts` без `typeof`, `SYSTEM_SERVER`

**Files:**
- Create: `lib/server/systems/registry.ts`, `systems/wfrp/server/index.ts`
- Modify: `lib/utils/rules/systems/{types.ts,index.ts}`, `lib/server/artifacts/system-stats.ts`, `lib/server/characters/core/{create-character-schema,update-character-schema}.ts`, `lib/schemas/units.ts`, `lib/server/content/traits-guard.ts`, `lib/utils/battle/participant/{from-character,from-unit}.ts`, `lib/utils/battle/turn/join-triggers.ts`, `components/abilities/RecipeGallery.tsx`, `lib/hooks/feats/useFeatForm.ts`, `components/characters/rest/PartyRestActions.tsx`

**Interfaces — Produces:**
```ts
// lib/server/systems/registry.ts  (import "server-only")
export interface SystemSchemas { characteristics?: ZodType; unitCharacteristics?: ZodType; systemStats?: ZodType; raceProfile?: ZodType; careerTiers?: ZodType }
export interface SystemAi { promptLine?: string; party?(campaignId: string, query: PartyQuery): Promise<unknown[]>; participantView?(p: BattleParticipant): unknown; unitView?(u: { characteristics?: unknown }): unknown }
export interface SystemServer { schemas: SystemSchemas; ai?: SystemAi }
export const SYSTEM_SERVER: Readonly<Record<string, SystemServer>>;      // homm, dnd5e: { schemas: {} }
export const systemServerOf: (rules: Pick<Ruleset, "system">) => SystemServer;
```
`RuleSystemDefinition` втрачає групи з `typeof`: `advancement`, `creation`, `downtime`, `corruption`, `equipment` стають вузькими контрактами лише з тим, що викликає core: `advancement?: { talentsOf(row): Record<string, number> }`, `equipment?: { armour(items, slot): SystemSlot | undefined; attacksOf(…) }`, `traits?: { recipes: readonly Recipe[]; unitBuild(row, abilities): UnitBuild; psychology?(…) }` (`UnitBuild` — нейтральний тип у `types.ts`), `downtime?: true`, `corruption?: true`, `creation?: true` (прапорці наявності для UI). Повні функції (`planPurchase`, `planPeriod`, `planGrant`, `planDraft`, …) імпортують напряму хендлери системи (3.3). Барель `index.ts` — лише реєстр і контракт (D42). `SYSTEM_STATS_SCHEMAS` видаляється (→ `systemServerOf(rules).schemas.systemStats`); `create/update-character-schema` і `lib/schemas/units.ts` беруть `characteristics`/`unitCharacteristics` із `SYSTEM_SERVER` (схема рядка в core: `z.record(z.string(), z.unknown())`, звуження на write-path за системою кампанії).

**Тест-кейси:** `registry.test.ts`: ключі `RULE_SYSTEM_REGISTRY` = `SYSTEM_UI` = `SYSTEM_SERVER` = `RULE_SYSTEM_KEYS`; `artifacts.systemStats` для d20 відхиляє не-null, для wfrp валідує (чинні тести); `rg "typeof (plan|roll|armour|encumbrance|wfrp)" lib/utils/rules/systems/types.ts` порожній; `types.ts` не має імпортів `@/systems/`; `wfrp-import-cycle` + перевірка «`registry.ts` не досягає `zod`» (додати ціль у тест).

### Задача 3.3: цілком wfrp-файли core → система (D41а)

**Files (Move):** `lib/server/characters/core/{advance,career,downtime,corruption}-handler.ts` → `systems/wfrp/server/`; `app/api/campaigns/[id]/characters/draft/{wfrp-draft-schema,create-wfrp-draft}.ts`, `…/[characterId]/draft/patch-wfrp-draft.ts` → `systems/wfrp/server/draft/`; `types/{corruption,downtime}.ts` → `systems/wfrp/rules/{corruption,downtime}/api-types.ts`; `lib/schemas/{corruption,downtime}.ts` → `systems/wfrp/server/`; `lib/hooks/characters/{useDowntime,useCorruption}.ts` та wfrp-функції `lib/api/{characters,races}.ts` → `systems/wfrp/{hooks,api}/`; `lib/hooks/races/useRaceProfiles.ts` → `systems/wfrp/hooks/`
**Files (Modify):** route-файли `advance`, `career`, `career/advance`, `corruption`, `corruption/undo`, `downtime` (×3), `draft` (×2), `races/[raceId]/profile`, `race-profiles` — імпортують хендлер із `@/systems/wfrp/server/*` і лишаються в exempt з `reason: "route"`; `lib/server/races/race-profile.ts`, `types/races.ts` (`profile: unknown`); `types/careers.ts`, `lib/schemas/careers.ts`, `lib/utils/content/import/fields/careers.ts`, `lib/server/content/resources/careers.ts` — у exempt з `reason: "content-kind"`; `lib/server/assistant/actions/character-coverage.ts` (лічильник літералів лишається)

**Тест-кейси:** e2e `wfrp-{careers,downtime,corruption,tables,traits,magic,battle}-e2e` і тести чернетки зелені лише зі зміною шляхів імпорту; `system-imports-exempt.json` містить лише причини `route`, `content-kind`, `ruleset-section` та записи `e1:4.x`/`e1:5.x` для наступних частин; OpenAPI-бюджет і `assistant` coverage-тест без змін чисел.

- [ ] 3.1 → 3.2 → 3.3, для кожної: тести → реалізація → `tsc` → `pnpm test:related` → ratchet `--write` → комміт.

### Задача 3.4: per-template battle-sweep (D63)

**Files (Modify):** `scripts/sim/battle-sweep.ts` (зараз жорстко шукає `{ name: "HOMM5", kind: "campaign" }`, рядок ≈371, і грає лише heroes-homm); `package.json` (скрипт `battle-sweep` без змін імені). **Files (Create):** `scripts/sim/battle-sweep/profiles/{srd-5.2,heroes-homm,grim-d100}.ts` (профіль шаблону: пошук кампанії за `templateKey`, набір перевірок, сидер тестових героїв/ворогів), за потреби спільний `scripts/sim/battle-sweep/seed-template-heroes.ts`; тест чистого розбору аргументів/вибору профілю в `scripts/sim/__tests__/`.

Узагальнити sweep на шаблони: параметр `--template <srd-5.2|heroes-homm|grim-d100>` (кампанія-шаблон із `prodcopy` за `templateKey`; без параметра — усі три по черзі). Для кожного шаблону ті самі перевірки й той самий звіт (`<out>/<template>/battle-sweep.md`, `data.json`, `log.txt`) і зведений рядок; код виходу 1, якщо помилка в будь-якому шаблоні. `--campaign <id>` лишається як перевизначення для одного шаблону. Лише локально: `DATABASE_URL` на `localhost:54322/prodcopy`, інакше sweep відмовляється стартувати. Профіль heroes-homm = чинна поведінка (HOMM5, ті самі режими `all|sweep|targeted|control|level5`). Для шаблону, де кампанії-героїв немає (srd-5.2, grim-d100), sweep створює тестових героїв і ворогів із контенту шаблону (раси/юніти/кар'єри/закляття з самого пакета, не вигадані) через справжні мутації API (`runBattleMutation`), прогоняє 5-раундові бої, цільові сценарії системи (для grim-d100: `judge === "server"`, d100-перевірки, боєзапас/перезарядка/Blast; для srd-5.2: d20-атака, закляття, концентрація) і по завершенні видаляє бої й усі тестові дані (`--keep-battles` лишає їх для налагодження).

**Тест-кейси:** розбір `--template` (невідомий шаблон → помилка з переліком; відсутність → усі три); профіль знаходить кампанію за `templateKey`; відсутня кампанія шаблону → сидер створює й cleanup видаляє (порожній diff рядків у таблицях після прогону); помилка в одному шаблоні дає exit 1, але решту шаблонів дограє; відмова на не-localhost `DATABASE_URL`. Живий прогін на `prodcopy` для трьох шаблонів — у гейті частини 3 (потрібен дозвіл користувача: лише localhost).

- [ ] 3.4: тест розбору → реалізація профілів → `tsc` → `pnpm exec eslint --fix <змінені>` → комміт `feat(sim): per-template battle-sweep`.

**Гейт після частини 3:** (1) проміжне Opus-ревʼю діапазону частин 1–3 за «Review Focus» 1–5 і D42–D48; одна хвиля виправлень (Sonnet). (2) `pnpm battle-sweep` для всіх трьох шаблонів (`--template srd-5.2`, `heroes-homm`, `grim-d100`, або без параметра) на локальній `prodcopy` (дозвіл користувача 2026-11-11, лише localhost; spec розд. 7; попередній прогін 2026-11-05) — exit 0 для кожного; звіт heroes-homm (HOMM5) порівняти зі звітом `.superpowers/sdd/2026-11-05-wfrp-5d/battle-sweep-report.md` (попередження не нові), тестові бої/дані після прогону видалені. Якщо `prodcopy` відсутня — зупинитись і спитати, не збирати самостійно.

---

# Частина 4: декларативні хуки (E1.5–E1.8)

Один виконавець, чотири незалежні задачі (порядок довільний).

### Задача 4.1: AI (E1.5, D50)

**Files:** Move `lib/ai/tools/wfrp-view.ts` → `systems/wfrp/server/ai.ts` (+ `loadCareers`, `WFRP_PARTY_SELECT` з `party.ts`); Modify `lib/ai/tools/{party,reference}.ts`, `lib/ai/context/prompt.ts:85`, `lib/server/battles/read-service.ts:36`.
Core: `const ai = systemServerOf(rules).ai` → `ai?.party ? ai.party(campaignId, query) : <d20-запит>`, `ai?.participantView?.(p) ?? <d20-вигляд>`, `ai?.unitView?.(u)`, `ai?.promptLine`.
**Тест-кейси:** чинні тести `lib/ai/tools/__tests__`, `lib/ai/context/__tests__` (wfrp-party: характеристики, Wounds, карʼєра; d20-party без змін; рядок системи в промпті лише для wfrp); у `lib/ai/**`, `lib/server/battles/read-service.ts` немає `wfrp`.

### Задача 4.2: i18n-простори (E1.6)

**Files:** `lib/server/campaigns/system-key.ts` (`systemKeyOfCampaign(id): Promise<string | null>`, той самий raw SQL, повертає ключ), Create `lib/i18n/system-scope.ts` (`systemScope(key: string | null, slot: "battle" | "campaign" | "member" | "dm" | SystemPageScope): readonly Namespace[]`), `lib/i18n/{scopes,config}.ts` (`NAMESPACES = [...CORE_NAMESPACES, ...systemNamespaces()]`; тип `Namespace` лишається літеральним union — meta-масиви `as const`), `app/campaigns/[id]/{layout.tsx,battles/layout.tsx,dm/battles/layout.tsx,character/page.tsx,dm/characters/page.tsx,dm/characters/[characterId]/page.tsx,dm/rules/page.tsx}`, `lib/i18n/__tests__/scope-size.test.ts` (рядки й бюджети генеруються з `SYSTEM_META[*].i18n`)
**Тест-кейси:** `scope-size`: ті самі пʼять wfrp-рядків з тими самими лімітами (107/111/2/2 + базовий 105), тепер із meta; d20-кампанія не отримує жодного системного namespace; `systemScope(null, …)` = `[]`; root layout не читає cookies/headers (чинний тест статичності лендінгу); `label-keys-rule-systems` зелений.

### Задача 4.3: механіки, DM-секції, редактори секцій правил (E1.7, D49)

**Files:** `components/rules/RulesForm.tsx:33,69-71` (`WFRP_ONLY` видалити; вкладки = `SECTIONS` + `systemUiOf(key).rulesSections`, приховані = `metaOf(key).unusedMechanics`), Move `components/rules/sections/{TablesSection,AdvancementSection}.tsx` → `systems/wfrp/ui/rules/`, `components/systems/types.ts` (`rulesSections?: Partial<Record<MechanicKey, ComponentType<RulesSectionProps>>>`), `lib/constants/campaigns.ts:28,48,66` (`requiresSystem` → `systemSection?: true`; `dmSectionsFor` показує її, коли `metaOf(systemKey)?.dmSections?.includes(path)`), `app/campaigns/[id]/dm/careers/{page.tsx,careers-client.tsx}` (`notFound()` за `dmSections`, форма — `systemUiOf(key).CareerForm`), `lib/utils/rules/systems/{types.ts,d20/index.ts}`, `systems/wfrp/index.ts` (`unusedMechanics` читається з meta — одне джерело)
**Тест-кейси:** `components/rules/__tests__`: wfrp бачить «Таблиці» й «Розвиток»; 12 d20-вкладок лишаються з приміткою «не використовується» (поведінка до E1, виконавець 4.3; не ховаються); homm/dnd5e — навпаки (той самий результат, що з `WFRP_ONLY`); плитка «Карʼєри» лише у wfrp; `/dm/careers` для d20 → 404.

### Задача 4.4: ability-ефекти системи (E1.8, D38)

**Files:** Create `systems/wfrp/rules/ability-effects.ts` (zod-схеми `wfrpArmour/Ward/Size/Psychology/Attack`, `TRAIT_SIZES`, `TRAIT_ATTACKS`, `PSYCHOLOGY_KINDS`, поля, `describe`, дефолти редактора; імпортує лише листя `abilities`: `fields`, `segments`, `registry/effects/types`), `lib/utils/abilities/schema/system-effects.ts` (корінь: `SYSTEM_EFFECT_SCHEMAS`, `SYSTEM_EFFECT_ROWS`, `SYSTEM_EFFECT_DEFAULTS`, `isSystemEffectKind`); Modify `lib/utils/abilities/schema/{effects,kinds}.ts`, `lib/utils/abilities/registry/effects/index.ts:157-161`, `lib/utils/abilities/editor.ts:50-54`; Delete `lib/utils/abilities/registry/effects/traits.ts`; `types/battle.ts` (`psychologyTested?: Partial<Record<string, number>>`)
`AbilityEffectRow = { kind: string; schema: ZodType; row: EffectRegistryRow; defaults: Record<string, unknown> }`. `TRAIT_EFFECT_KINDS`/`isTraitEffectKind` → `isSystemEffectKind`. Рядки `kind` у даних не змінюються (пакет `grim-d100` і локальні БД лишаються валідними).
**Тест-кейси:** `validateAbilities` приймає й відхиляє ті самі значення, що на HEAD (Ward 11 → помилка, Armour 0..N), JSON-schema/OpenAPI-бюджет без зміни байтів; guard `units`-ресурсу (ефекти Traits лише юнітам) зелений; `import/no-cycle` на `system-effects.ts`, `effects.ts`, `ability-effects.ts` чистий; `template validate grim-d100` без error.

- [ ] Для кожної 4.1–4.4: тести → реалізація → `tsc` → `pnpm test:related` → ratchet `--write` → комміт.

---

# Частина 5: battle UI (E1.9)

Один виконавець, дві задачі. Перед стартом прочитати `.claude/rules/components.md`.

### Задача 5.1: слоти `SYSTEM_UI` для бою

**Files (Move → `systems/wfrp/ui/battle/`):** `components/battle/hud/D100Input.tsx`, `components/battle/wizards/attack/{D100RollBody,D100RollPicker}.tsx`, `components/battle/overlays/{PercentileResultLines,CastResultLines}.tsx`, `components/battle/wizards/spellbook/CastTestBody.tsx`, `components/battle/wizards/ChannelDialog.tsx`, `components/battle/participants/ConditionTestPanel.tsx`
**Files (Modify):** `components/systems/types.ts` — слоти `battle?: { RollBody?; RollPicker?; ActionResult?; CastTest?; CastResult?; ChannelDialog?; ConditionTestPanel? }` (пропси — нейтральні: `SystemSlot`, `BattleParticipant`, колбеки); `components/battle/wizards/attack/{RollStep,WeaponStep}.tsx`, `components/battle/overlays/ActionResultCard.tsx`, `components/battle/wizards/spellbook/SpellCastDialog.tsx`, `components/battle/turn/{MyTurnControls,ActionGrid}.tsx`, `components/battle/participants/MyHeroPanel.tsx`, `components/spells/form/SpellMagicFields.tsx` (→ слот `SpellMagicFields?`), `components/battle/hud/index.ts`
**Тест-кейси:** `components/battle/__tests__` і `components/systems/__tests__/registry.test.tsx`: wfrp-візард показує d100-крок і результат із SL/локацією; d20-візард без змін (snapshot розмітки `RollStep` для dnd5e); у `components/battle/**` і `components/spells/**` (нетестові) немає `battleWfrp`, `D100`, `Percentile`, `dice === 100`.

### Задача 5.2: `flow.mode`, хуки бою (D58)

**Files:** `lib/utils/battle/flows/{attack-flow,index,spell-flow-types}.ts` (`percentile?: boolean` → `mode: "client" | "serverJudged"`), `lib/hooks/battle/{useAttackWizard,useBattleRules,useConditionTestPanel,useIngredientPlan}.ts` (`dice === 100` → `judge === "server"`; `percentileTargetOf` → `combat.attackTarget`; `woundsLabel` → `progression.hpTerm`; `momentum` у `useBattleRules` → `sceneState: SystemSlot | undefined`, читає системний UI)
**Тест-кейси:** `lib/utils/battle/flows/__tests__`: редьюсер у `serverJudged` веде `ROLL` → `submitting` без кроку шкоди, Fortune-перекид передає `fortuneRoll`; у `client` — як зараз (перевага/недолік, `secondRolls`); `lib/hooks/battle/__tests__` зелені.

- [ ] 5.1 → 5.2: тести → реалізація → `tsc` → `pnpm test:related` → ratchet `--write` → комміт. Live-run у браузері (wfrp-атака, каст, channelling, зняття стану; регрес dnd5e-атаки) — одним Sonnet-субагентом наприкінці частини, перевірки JS/текстом (feedback «browser context»).

---

# Частина 6: відкритий ключ, пакети, фінал зон, документація, тести (E1.10–E1.12, борги E0)

Один виконавець, пʼять задач.

### Задача 6.1: відкритий ключ, мертві прапорці (E1.10)

**Files:** `lib/constants/rules.ts` (видалити `RULE_SYSTEM_KEYS`, `RuleSystemKey`), `lib/utils/rules/schema.ts:5,82` (`key: z.string().refine(isRuleSystemKey)` з `meta.ts`), `lib/utils/rules/systems/{types,registry,index}.ts` (`key: string`; `Record<string, RuleSystemDefinition>`; `ruleSystemOf` для невідомого ключа кидає зрозумілу помилку), `components/systems/registry.ts`, `components/rules/sections/SystemSection.tsx`, `lib/utils/rules/systems/d20/index.ts` (`d20System(key: string)`); видалити `balance: { kind: "none" }` і `battle.supported` (`lib/hooks/battles/setup/useBattleSetup.ts:39,72`, `lib/server/battles/balance/balance-post.ts:64`, `lib/server/battles/mutations/start/{start-mutation.ts:13,start-battle-handler.ts:137}`, `API_ERRORS.SYSTEM_BATTLE_UNSUPPORTED` у `lib/constants/api-errors.ts` з його ключем повідомлення, тест `start-system-gate.test.ts`); `characteristics.kind` — остаточно видалити
**Тест-кейси:** `RulesetSchema`: `system.key: "wfrp"` ок, `"d6pool"` → помилка валідації з ключем `validation.*`; `parseRules` без секції `system` → `dnd5e`/`homm` (як зараз); `SYSTEM_LOCKED` (409) без змін; OpenAPI: `system.key` — рядок (оновити бюджет, якщо байти змінились, з числом у звіті); `gameTerms.ruleSystem.<key>` є для кожного ключа реєстру в обох локалях.

### Задача 6.2: пакети — `prepareRows`, `batches`, `SYSTEM_MODULE`, списки (D55–D57)

**Files:**
- Create: `scripts/templates/systems/d20/{index.ts,prepare.ts}`, `scripts/templates/lib/i18n-validate.ts`
- Move: `scripts/srd/i18n/{creature-header,spell-header}.ts` (+ тести) → `scripts/templates/systems/d20/i18n/`; `scripts/srd/i18n/validate.ts` (+ тест) → `scripts/templates/lib/i18n-validate.ts`
- Delete: `scripts/templates/lib/import-prepare.ts`, `scripts/srd/i18n/cli.ts`, скрипт `srd:i18n` у `package.json`
- Modify: `scripts/templates/systems/{types,index}.ts`, `scripts/templates/systems/{homm,wfrp}/index.ts`, `scripts/templates/lib/{import-pack.ts:9,146,222-226,export.ts:2,131,batches.ts:1-3,61-63,icons-file.ts,validate.ts:46}`, `scripts/templates/systems/wfrp/i18n.ts`, `lib/utils/templates/i18n/keys.ts`, `lib/server/templates/localize-template-bundle.ts:85`, `data/templates/grim-d100/i18n/uk.json` (ключі `spellLists/…` → `lists/…`), `docs/architecture/content-api.md`

**Interfaces — Produces:**
```ts
// scripts/templates/systems/types.ts
export interface PrepareCtx { pack: Pack; icons: IconsFile; idByName(kind: PackKind): Promise<ReadonlyMap<string, string>> }
export interface PackHooks { /* наявні */
  prepareRows?(kind: PackKind, rows: PackRow[], ctx: PrepareCtx): Promise<PackRow[]>;
  clearableColumns?: Partial<Record<PackKind, readonly string[]>>;
  normalizeTranslation?(entry: KeyedString, text: string, glossary: Glossary): string;
}
// scripts/templates/systems/index.ts
export const PACK_HOOKS = { homm: { ...D20_HOOKS, ...HOMM_HOOKS }, dnd5e: D20_HOOKS, wfrp: WFRP_HOOKS };   // композиція, без мутацій
export const SYSTEM_MODULE: Readonly<Record<string, string>>;   // з SYSTEM_META (keys → module), не літерал
// lib/utils/templates/i18n/keys.ts
export const PACK_LIST_KIND = "lists";
```
`importPack`: `withIcons` (загальне) → `hooks.prepareRows?.(kind, rows, ctx) ?? rows`; очищення застарілих колонок — з `hooks.clearableColumns?.[kind]`. Порядок усередині d20 `prepareRows` зберігає чинний: class-іконки → `resolveSchoolRefs` (лише коли пакет має `spell-groups`).

**Тест-кейси:** чинні `scripts/templates/__tests__/{import-pack,export,i18n-convert,all-packs,fourth-pack}.test.ts` зелені; новий `d20-prepare.test.ts` (перенесені кейси `import-prepare`); `rg "scripts/srd|\\.\\./srd" scripts/templates/lib` порожній; `SYSTEM_MODULE` = `{ homm: "d20", dnd5e: "d20", wfrp: "wfrp" }`; `statusOf` для `grim-d100` uk: 0 missing / 0 stale / 0 orphan після перейменування ключів; `localizeTemplateBundle` перекладає списки заклинань Grim (чинний кейс `localized-clone`); у `lib/**` немає рядка `spellLists`. Integration: `pnpm test:integration scripts/templates` (локальна БД): другий `import` для `srd-5.2`, `grim-d100`, `heroes-homm` → 0 created / 0 updated; `contentVersion` без змін.

### Задача 6.3: exhaustiveness, fixture-система, фінал ratchet (E1.11)

**Files:** Create `lib/__tests__/system-contract.test.ts`, `lib/__tests__/helpers/system-contract.ts` (`assertSystemContract`), `lib/__tests__/fixtures/d6pool/{meta,definition,ui,server}.ts`; Modify `eslint.config.mjs` (прибрати тимчасове з 1.1; exempt — лише фінальні причини), обидва exempt-файли, `lib/utils/rules/systems/__tests__/eslint-isolation.test.ts`
**Тест-кейси:**
- exhaustiveness: `RULE_SYSTEM_KEYS` = ключі логіки = UI = `SYSTEM_SERVER` = `PACK_HOOKS`; теки `systems/*` = модулі meta без `d20`; кожна тека має `meta.ts` та `index.ts`; `gameTerms.ruleSystem.*`; кожен namespace з meta має файл у `messages/{uk,en}/`.
- `assertSystemContract` для `d6pool`: фікстура компілюється, імпортуючи лише `@/lib/utils/rules/systems` (контракт) і core-типи; проходить ті самі перевірки, що реальні системи; `defineSlot("d6pool", …)` читає свій слот і не читає wfrp.
- фінал ratchet: `system-imports-exempt.json` — лише `route` / `content-kind` / `ruleset-section` (орієнтир ≤ 30 файлів); `system-literals-exempt.json` для `wfrp` — лише ті самі файли плюс `lib/onboarding/whats-new.ts`, `lib/constants/api-errors.ts`, `lib/server/assistant/actions/character-coverage.ts`; числа — у звіт і в `rule-systems.md`.
- grep-кейси: у `lib app components types` (нетестові, поза exempt) немає `=== "wfrp"`, `isWfrpCampaign`, `WFRP_`, `kind === "d20"`, `.wfrp`.

### Задача 6.4: документація (E1.12)

**Files:** `docs/architecture/rule-systems.md` (таблиця хуків за фактичним контрактом; «Як додати систему» = тека + рядки коренів + meta; 11 розбіжностей зі spec розд. 7; числа ratchet), `docs/architecture/{README,map-modes,content-api,i18n,abilities,battle,ai}.md` (шляхи `systems/wfrp`, слоти, `PackHooks`), `CLAUDE.md` (layering: `systems/<id>/`, корені, ratchet-файли; рядок про rule systems у «Subsystems»), `docs/STATUS.md` (п.0/п.7, борги E2: route `/system/[action]`, вид `careers`, `rules.tables`/`advancement`, `battleData`-лічильники, `skillTrees`, Minor 13; пишеться після 6.5), `.claude/rules/components.md` (якщо згадує `components/systems/wfrp`)

### Задача 6.5: перенесення `wfrp-*.test.ts` із core-тек (D40)

**Files:** механічний `git mv` усіх нетестових-за-призначенням `wfrp-*.test.ts(x)` з core-тек у `systems/wfrp/__tests__/<дзеркальний підшлях>/` (на HEAD ≈21 файл: `components/character-profile/rest`, `lib/ai/tools`, `lib/server/battles/__tests__/mutations` ×6, `lib/server/characters/__tests__` ×3, `lib/utils/battle/{__tests__ ×2,actions,attack-phase,attack ×2,spell/cast,turn}`, `lib/utils/rules/systems/__tests__`, `scripts/templates/__tests__`; список уточнити `find lib app components types scripts -name 'wfrp-*.test.*'`, без `scripts/assets/grim-icons/**`). Імпорти — лише оновлення шляхів (відносні `../` → `@/…`); тестові helper-и, спільні з d20-тестами, НЕ дублювати, а імпортувати зі старого місця.
**Тест-кейси:** `pnpm test:related <перенесені файли>` зелений; кількість тестів не змінилась (порівняти `pnpm test:run <файли>` до/після); `find lib app components types scripts -name 'wfrp-*.test.*'` порожній (крім `grim-icons`); `vitest.config.mts` включає `systems/**/__tests__`.
- [ ] `git mv` → оновити імпорти → `pnpm exec tsc --noEmit -p tsconfig.json` → `pnpm test:related` → `pnpm exec eslint --fix` на перенесених → комміт (один, механічний).

- [ ] 6.1 → 6.2 → 6.3 → 6.4 → 6.5: тести → реалізація → `tsc` → `pnpm test:related` → комміт кожної задачі.

---

## Порядок і залежності

```
1.1 → 1.2 → 1.3 → 1.4 → 2.1 → 2.2 → 2.3 → 2.4 → 2.5 → 3.1 → 3.2 → 3.3 → 3.4 → [гейт: Opus-ревʼю, battle-sweep ×3 шаблони]
     → (4.1 ∥ 4.2 ∥ 4.3 ∥ 4.4) → 5.1 → 5.2 → 6.1 → 6.2 → 6.3 → 6.5 → 6.4
```
6.2 залежить лише від 1.2 (meta) і може йти окремим виконавцем паралельно з частинами 4–5 (інші файли: `scripts/templates/**`, один рядок у `localize-template-bundle.ts`). Частини 2–3 строго послідовні: спільні файли `types/battle.ts`, `lib/utils/rules/systems/types.ts`, `attack/process/*`.

| Виконавець (Sonnet, свіжа сесія на частину) | Задачі | Розмір |
|---|---|---|
| A | 1.1–1.4 | M (механічно + конфіг + генератор) |
| B | 2.1–2.5 | L |
| C | 3.1–3.4 | L |
| D | 4.1–4.4 | M |
| E | 5.1–5.2 + live-run | L |
| F | 6.1–6.5 (6.2 можна віддати окремо раніше) | M |

Усього 24 задачі (4+5+4+4+2+5). Груба оцінка: 6 сесій виконавців, 1 хвиля виправлень після проміжного ревʼю, 2 Opus-ревʼю, 1 браузерний субагент; контролер — Sonnet (лише диспетчеризація). Перед запуском нагадати користувачу про `/usage`; між частинами — нова сесія (правило 150k).

## Після частини 6

1. Фінальне Opus-ревʼю діапазону E1 за «Review Focus» 1–6 і D37–D62; одна хвиля виправлень (Sonnet).
2. `/simplify` (1 агент) на diff E1.
3. Гейти spec: повторний `battle-sweep` для всіх трьох шаблонів (srd-5.2, heroes-homm, grim-d100) на `prodcopy` (дозвіл користувача 2026-11-11, лише localhost), порівняння heroes-homm зі звітом `.superpowers/sdd/2026-11-05-wfrp-5d/battle-sweep-report.md`; обовʼязково, а не лише за змін `lib/utils/battle/**` / `lib/server/battles/**`; e2e `wfrp-*-e2e`; `wfrp-import-cycle`, `scope-size`, OpenAPI-бюджет.
4. Повний `pnpm test:run` і repo-wide `pnpm lint` — лише за окремим «так» користувача (один раз, не паралельно з іншими worktree).
5. Оновити памʼять `project-architecture-modularity`. Далі за U8: заливка іконок, prod-кроки E0 — окремими «так».

## Ризики

| Ризик | Пом'якшення |
|---|---|
| Регресія d20 через зміну спільних шляхів бою (`attack/process`, `spell/cast`, знімок, дельта) | побайтні snapshot-тести d20 у 2.1, 2.4, 2.5; `battle-sweep` після частини 3 |
| Flat-config мовчки перезаписує `no-restricted-imports` (уже траплялось із `MODE_OWNED_FILES`) | хелпер `restricted()` + матриця `calculateConfigForFile` (1.3), Review Focus 5 |
| Цикли імпорту через нові корені (`system-effects`, `meta`) | meta без value-імпортів; `ability-effects.ts` імпортує лише листя; `import/no-cycle` на змінених файлах у кожній задачі |
| Редакція приватних даних через хук системи може пропустити поле | тести `visibility`/redact перенесені до зміни реалізації; ДМ/гравець/чужий гравець у 2.4 |
| Перейменована міграція ламає локальні БД | SQL-сніпет D47; перевірка `migrate status`; prod не зачіпається (міграція не задеплоєна) |
| Локальні wfrp-бої/знімки після 2.x нечитабельні | прийнято spec 4.4; перед live-run створити бій заново; `add-participant`/`refresh-sources` перечитують джерело |
| Паралельна сесія іконок комітить у той самий worktree | не чіпати її файли; скан ratchet їх не читає; перед кожною задачею `git status` і `git log -1` |
| `Namespace` перестає бути літеральним union і зникає перевірка ключів `t()` | meta-масиви `as const`, `tsc` у 4.2; якщо не вдається — `NAMESPACES` лишається літеральним списком у `config.ts`, а тест звіряє його з meta |
| Обсяг частини 2 (≈80 файлів) перевищить контекст одного виконавця | задачі самодостатні; дозволено розбити B на дві сесії (2.1–2.3, 2.4–2.5) |

## Рішення користувача (2026-11-11, усі затверджено)

1. D47: перейменувати міграцію й колонку на `system_state`, локальні БД `wfrp` і `prodcopy` лагодяться SQL-сніпетом (задача 2.5, явний крок).
2. D38: пʼять коренів + генерований індекс систем (задача 1.4).
3. Відкладене в E2 — див. розділ «Свідомо відкладено в E2».
4. `battle-sweep` на `prodcopy` після частини 3 і наприкінці E1 — дозволено (лише localhost).
5. D40: перенесення `wfrp-*.test.ts` — задача 6.5.
