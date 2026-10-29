# i18n: частина 4 — середні домени

Гілка `feat/i18n-part4` (worktree `../dnd-tracker-i18n4`) від main `0c4c11a7`. Базові правила — `docs/architecture/i18n.md`, порядок частин — `docs/superpowers/specs/2026-10-28-i18n-core-design.md`, зразок — `docs/archive/superpowers/specs/2026-10-28-i18n-part3-design.md` (рішення 1–9 частини 3 діють і тут).

## Мета і межі

**Входить:** campaigns, characters, character-profile, spells, abilities, units, rules, skill-tree.

- UI: `components/{campaigns,characters,character-profile,spells,units,abilities,rules,skill-tree}/**`; сторінки `app/campaigns/page.tsx`, `new/`, `[id]/page.tsx`, `[id]/info`, `[id]/character/**`, `[id]/dm/{characters,npc-heroes,spells,spell-groups,units,rules,skill-trees}/**`, `[id]/dm/print/spells`.
- Хуки: `lib/hooks/{abilities,campaigns,characters,spells,units}/**`, `lib/hooks/skills/**` (решта: `useSkillTreeEditor`, `useSkillTreeTransfer`, `useProgressionActions`, `useLevelUpCelebration`, `useCharacterProgression`).
- Логіка: `lib/utils/{campaigns,rules,skills,spells,units}/**`, `lib/utils/characters/{sheet,classes,choices,resources}/**` + `hero-hp.ts`, `lib/utils/abilities/{editor,class-columns}.ts` + `schema/**`, підписи реєстру `lib/utils/abilities/registry/**` (лише назви для редактора, див. рішення 5).
- Константи: `campaigns.ts` (`DM_SECTIONS`), `campaign-dashboard.ts`, `source-sync.ts` переписуються на ключі (у них лише UI-споживачі). Константи з підписами, які читають імпорт/бій/аркуш (`abilities`, `spells`, `skills`, `characters`, `experience`, `hero-archetypes`, `monster`, `damage`, `weapon-traits`, `ungrouped`, `inventory`, `classes`, `choices`, `main-skills`, `artifacts`), лишаються — UI скоупу рендерить ключі (рішення 3).
- Схеми: `lib/schemas/{spells,units,out-of-combat,list-spells-query}.ts`.
- Сервер: рядки відповідей у `lib/server/characters/operations/**` (`stash-update`, `tokens-create`, `goals`, `notes`, `create`).
- Дати — через `useFormatter` (4 місця: `TokenList`, `CharacterLogTab`, `InventoryLogPanel`, `SourceSyncDialog`).

**Успіх:** з `NEXT_LOCALE=en` список кампаній, дашборд, довідник, аркуш героя (усі вкладки, інвентар, відпочинок, журнал), редактори персонажа/юніта/заклинання/здібностей/правил/дерева і сторінки DM скоупу — англійською без сирих ключів; з `uk` — слово в слово як зараз; храповик тримає всі каталоги скоупу; хвости частини 3 закриті.

**Не входить:**
- `critical-effects.ts`, `save-critical-effects.ts` (назви/описи крит-ефектів пише рушій у лог бою; `CriticalsSection` перекладає лише свою обгортку) — частина 6.
- `describe`/`summary` реєстру здібностей (`registry/effects/**`, `conditions.ts`, `triggers.ts`, `labels.ts`: `limitsLabel`, `amountLabel`…; `lib/utils/abilities/summary.ts`) — їх читають рушій бою (лог), `lib/cache/*-reference.ts`, `sheet-handler`, AI. Частина 6 разом із моделлю тексту логу. Наслідок: зведення здібностей у довіднику/аркуші англійською лишаються українськими — прийнято.
- `battle*.ts`, `battle-weather.ts`, `lib/hooks/{battle,battles}`, `app/campaigns/[id]/dm/battles` (крім зміни пропа `DeleteAllButton`) — частина 6.
- `ai.ts`, `scenario.ts`, `world.ts`, `compendium-import.ts`, `lib/schemas/{ai,scenario,show,world,content-import,battles}.ts`, `actionResult("campaign", "Кампанія")` / `("characters", "Персонажі")` / `name: "Персонаж"` у `lib/server/{campaigns,characters}/*-service.ts` (підписи результатів асистента) — частина 5.
- Генератор героя `lib/utils/characters/generate/**` (імена, передісторії ~2,7 тис. символів) — генерує **контент**, що пишеться в БД; не перекладається (відкрите питання 2).
- `acquaintances` (сторінка, компоненти, хуки — ~400 символів, домен з'явився після spec ядра) — відкрите питання 1.
- Імпортований контент і дані з БД (назви груп заклинань «Перше коло», `label` у `character_log.data`) — як є.
- `localeCompare(…, "uk")` і `normalizeSearchText` — сортування/пошук контенту, не UI-текст.

## Namespace-и

13 нових (по одному файлу на доменну задачу — паралельні задачі не перетинаються):

| ns | Що | Задача |
|---|---|---|
| `campaigns` | список, створення, вступ, налаштування, учасники, шаблони, синхронізація джерела | 2 |
| `dashboard` | дашборд кампанії (`sections.*`, `groups.*`, `nextSteps.*`, картка героя), довідник `reference.*` (`[id]/info`) | 3 |
| `characters` | редактор DM, нові/чернетка гравця, рев'ю чернеток, список, `[id]/character/{new,edit,draft}` | 4 |
| `characterProfile` | аркуш героя: шапка, вкладки, біографія, цілі, нотатки, жетони, риси, навички, магія, бій, level-up, лінії аркуша | 5 |
| `inventory` | інвентар, сховок, гроші, видача/передача артефактів, лог інвентаря | 6 |
| `rest` | відпочинок, ресурси, кістки хітів, заряди, кидки з аркуша, журнал героя, досвід, групові дії | 7 |
| `spells` | список/книга/групи/друк заклинань, підписи переліків (час накладання, цілі, кола) | 8 |
| `spellEditor` | форма заклинання (`components/spells/form`, `lib/utils/spells/model`) | 9 |
| `units` | редактор/список юнітів, статблок-поля, атаки, валідація схеми | 10 |
| `abilities` | редактор здібностей (секції, поля, копіювання, шаблони-пікер), `ABILITY_*_ERRORS`, issue схеми | 11 |
| `abilityRegistry` | підписи реєстру за id: ефекти, прапорці, тригери, стани, поля, опції, шаблони | 12 |
| `rules` | правила кампанії (`MECHANIC_REGISTRY` за ключем, секції) | 13 |
| `skillTree` | редактор дерева, прогресія, причини блокування, перенесення дерева | 14 |

**Нове в `common`** (показується в ≥ 3 доменах або в root-chrome; додає лише задача 1):
- `common.abilities.<key>.{label,short}` (6 характеристик), `common.stats.<key>` (HP, AC, швидкість… з `ABILITY_SCORES`) — аркуш, юніти, чернетка, `AbilityScoresGrid`/`AbbreviationsInfoDialog`, згодом бій.
- `common.spellLevels.<0..9>` («Замовляння», «Перше коло»…) — spells, choices (`ChoicePicker`), аркуш, бій.
- `common.ungrouped.<key>` (`UNGROUPED_LABELS`), `common.damageTypes.<type>`, `common.monster.{senses,sizes}.<v>`, `common.weaponTraits.traits.<t>` — уже мігровані `components/common` (`MonsterStatblock`, `WeaponTraitsField`) досі читають українські константи.
- `common.dmSections.<path>` — підпис розділу DM: його показують `Header`/`Breadcrumbs` (root-chrome, де є лише `common`+`validation`). `title`/`subtitle`/`keywords` розділів — у `dashboard.sections.*`.
- `common.tabs.{basic,abilities,choices}` («Основне», «Вміння», «Вибори»).

**Reuse-аудит дублів (задача 1):**
- Вкладки `form.tabs.{basic,basics,abilities,choices}` у `races`/`feats`/`backgrounds`/`artifacts`/`skills`/`classes` → `common.tabs.*`; `races.form.tabs.choices` («Вибори й лінії») лишається доменним.
- `common.confirm.{cancel,delete}` дублює `common.actions.{cancel,delete}` → видалити з `confirm`, споживачі (`ConfirmProvider` тощо) — на `actions`.
- Перевикористовуються як є: `common.actions/form/confirm/search/states/deleteAll/dndSkills/creatureTypes/monster`, `classes.casters`, `feats.types`, `skills.mainSkills.roles`, `choices.*`, `artifacts.rarity/slots`.

## Завантаження namespace-ів

**Заміри** (`gzip -9`, повідомлення `app/campaigns/layout.tsx`: `common, validation, onboarding` + 8 ns частини 3):

| | uk raw | uk gzip | en raw | en gzip |
|---|---|---|---|---|
| Зараз | 60,8 KB | 15,5 KB | 43,0 KB | 12,5 KB |
| Частина 4 (оцінка) | ≈ 110 KB | ≈ 27 KB | ≈ 75 KB | ≈ 21 KB |
| Після ч.4 | ≈ 170 KB | ≈ 40–45 KB | ≈ 118 KB | ≈ 33 KB |
| Після ч.5–6 (прогноз) | ≈ 280 KB | ≈ 70–75 KB | — | ≈ 55 KB |

Оцінка — за співвідношенням частини 3: ≈ 12 тис. кириличних символів коду → 41 KB `uk`-JSON (≈ 3,4 B/символ), 10,1 KB gzip разом (≈ 0,85 B/символ). Скоуп ч.4 після вилучень ≈ 32 тис. символів (компоненти 17,2 тис., реєстри й константи ≈ 6 тис., сторінки/хуки/utils/схеми ≈ 9 тис.). Прогноз ч.5–6: UI ≈ 25 тис. + константи/описи реєстру ≈ 10 тис.

**Рішення: один layout.** Усі ns скоупу вантажить `app/campaigns/layout.tsx`; сегментних layout-ів не вводимо. Причини: (1) поріг 100 KB gzip не досягається навіть із прогнозом ч.6; (2) вкладений `NextIntlClientProvider` не зливає повідомлення з батьківським — DM-layout мусив би повторно передати всі спільні ns (дубль на DM-сторінках) або верхній layout звузився б до мінімуму з дублями в кожному сегменті; (3) компоненти спільні між сегментами (аркуш — у гравця й у `dm/characters/[id]`; дерево — в аркуші; книга заклинань — у бою; чипи здібностей — в аркуші й довіднику; юніти — у підготовці бою), тож розщеплення = ризик сирих ключів; (4) виграш для гравця — лише DM-only редактори (`rules`, `spellEditor`, `abilityRegistry`, частково `units`) ≈ 9–11 KB gzip. При soft-навігації layout не перерендерюється — повідомлення їдуть один раз на hard-load.

**Страховка:** список ns layout-у — константа `CAMPAIGN_NAMESPACES` (`lib/i18n/scopes.ts`), її читає і layout, і тест `lib/i18n/__tests__/scope-size.test.ts` (gzip `JSON.stringify(loadMessages(locale, CAMPAIGN_NAMESPACES))` < 100 KB для кожної мови). Якщо тест упаде (ч.5–6) — розщеплення: `app/campaigns/[id]/dm/layout.tsx` з повним набором, верхній без DM-only редакторів; ці ns тому й винесені окремо.

| Де | Namespace-и |
|---|---|
| root (`ClientLocaleProvider`, статичний чанк) | `common`, `validation`, `whatsNew` |
| `app/(auth)`, `app/settings` | як зараз |
| `app/help/layout.tsx` | як зараз (`help`, `onboarding`…) |
| `app/campaigns/layout.tsx` (`CAMPAIGN_NAMESPACES`) | `common`, `validation`, `onboarding`, ns ч.3 (`races`, `skills`, `classes`, `feats`, `backgrounds`, `artifacts`, `music`, `choices`) + 13 ns ч.4 |
| сервер (`getTranslator`) | будь-який; без ns — усі `NAMESPACES`; `errors` — лише тут |

## Рішення

1. **Ключі за id для реєстрів-підписів.** Константи, які читають імпорт CSV (`enumLabels`), рушій бою/лог, аркуш на сервері чи AI, не змінюються й не йдуть у храповик; компоненти скоупу рендерять ключ за id: `common.abilities.<k>.label`, `spells.castTimes.<v>`, `units.senses…`, `abilityRegistry.effects.<kind>.label`, `rules.mechanics.<key>.{label,description}`, `characterProfile.goals.<kind>`, `inventory.coins.<c>`, `dashboard.difficulty.<v>` тощо. Константа без жодного споживача після ч.4 (перевірити `rg`) — видаляється (задача 15). Кожен реєстр покривається тестом підписів (рішення 7).
2. **Константи лише з UI-споживачами → ключі в самих константах.** `DM_SECTIONS` (`label` → прибрати, `title`/`subtitle`/`keywords` → прибрати; компонент бере `common.dmSections.<path>` і `dashboard.sections.<path>.*`), `campaign-dashboard.ts`, `source-sync.ts` — переписати на id/ключі й додати в храповик. Ключові слова пошуку дашборду — один рядок через кому в ns (`dashboard.sections.<key>.keywords`), розбиває компонент.
3. **Хвости частини 3.**
   - `ABILITY_LABELS`/`ABILITY_*_ERRORS` (`components/abilities/save-label.ts`), `abilitySaveError` (`lib/hooks/abilities/ability-save-error.ts`), `withAbilityErrors`, `columnRefIssues` (`lib/utils/abilities/class-columns.ts`) → ключі `abilities.*`; `columnRefIssues` повертає `{ message: key, params }` (тип issue з ч.3 `{ path; message; params? }`); `abilitySaveError` приймає вже перекладений fallback (як `common.form.*`).
   - Споживачі `FEAT_TYPE_LABELS` (`FeatsBlock`), `DND_SKILL_META[].label` (`CharacterSkillsSection`, `CombatTab`), `MAIN_SKILL_ROLE_LABELS`, `CLASS_CASTER_LABELS` (`CharacterClassesField`), `spellLevelName` у `ChoicePicker` → ключі `feats.types`, `common.dndSkills`, `skills.mainSkills.roles`, `classes.casters`, `common.spellLevels`. Константи лишаються для імпорту/бою.
   - `spellLevelName`/`levelFromName` (`lib/constants/spells.ts`) — **конвенція назв груп у БД** («Перше коло» створюється й розбирається назад): значення лишаються з `// eslint-disable-next-line no-restricted-syntax -- spell-group name convention stored in DB`; показ рівня — `common.spellLevels.<n>`.
   - `makeT` (`lib/i18n/test/mock-t.ts`) отримує `rich` і `markup` (поведінка як у `t`). `DeleteAllButton`: `nouns: [s,s,s]` + `pluralUk(2, …)` → `noun: string` (готова форма множини від домену; `common.deleteAll.title` = «Видалити всі {noun}?»). Шість викликачів оновлює задача 1 (у `dm/battles` — літерал «битви», файл поза храповиком).
   - Спільний `NameOnlyCreateDialog` (`components/common`): `{ open, onOpenChange, texts: { title, description, name, namePlaceholder, submit }, formId, onSubmit(name) }`; на нього переходять `CreateFeatDialog`, `CreateBackgroundDialog` (ідентичні), `CreateClassDialog`, якщо вкладається без нових пропів; `CreateSpellGroupDialog` — у задачі 8, якщо має лише назву.
   - Split ns за сегментами — вирішено вище (ні, з тестом розміру).
4. **Серверні тексти у відповідях.**
   - Помилки → `API_ERRORS` (ns `errors`, переклад на межі `apiErrorJson`): `ITEM_PARAMETER_REQUIRED`, `ITEM_PARAMETER_INVALID`, `ITEM_SPELL_REQUIRED`, `ITEM_SPELL_INVALID` (зараз локальна мапа `stash-update.ts`), `CHARACTER_TOKEN_INVALID`, `CHARACTER_GOALS_INVALID`, `CHARACTER_NOTES_INVALID` (`parseMessage` операцій), `CHARACTER_CONTROLLER_INVALID` (`create.ts`). Тексти `uk` слово в слово.
   - **Не-помилкові тексти, які сервер рахує й кешує** (лінії аркуша `SheetLine.label` з `sheet/lines.ts`/`armor-class.ts`, `describeFeatPicks`, зведення довідника `info-reference.ts` у `lib/cache/info-reference.ts`, причини блокування прогресії `skills/progression/rules.ts`) → **ключ + параметри**, переклад на клієнті. Форма: поле `label`/`text` = ключ `<ns>.…`, поряд `params?`; показ — `translateIssue(t, { message, params })` (кореневий `t`): рядок поза каталогом (`t.has` = false — назви з БД, ще не мігровані описи реєстру) показується як є. Кеш лишається мовно-нейтральним. Нового хелпера не вводимо — `translateIssue` уже робить «ключ або як є».
   - Zod: кастомні повідомлення `units.ts`/`out-of-combat.ts` → `units.validation.*`/`rest.validation.*`; `.describe()` у `units.ts`, `spells.ts`, `list-spells-query.ts` → англійською (як ч.3, рішення 5).
5. **Реєстр здібностей — лише підписи редактора.** `label` ефектів/прапорців/тригерів/станів, `FieldMeta.label`, `options[].label`, `templates[].{label,hint}`, `STAT_LABELS`/`TARGET_LABELS`/`DAMAGE_FILTER_LABELS` лишаються в коді (їх читають `describe`, лог, AI), а редактор (`FieldRenderer`, `EffectCard`, секції, `AbilityTemplatePicker`) рендерить `abilityRegistry.<group>.<id>` за id. Поле адресується шляхом власника: `abilityRegistry.fields.<name>` за замовчуванням, `abilityRegistry.effects.<kind>.fields.<name>` — якщо в одного імені різні підписи (вирішує задача 12 за фактичними даними). Опції — `abilityRegistry.options.<group>.<value>`. Тест підписів обходить `EFFECT_REGISTRY`/`FLAG_REGISTRY`/`TRIGGER_REGISTRY`/`CONDITION_REGISTRY`/`ABILITY_TEMPLATES`. Назви за замовчуванням, що стають даними (`build()` шаблону: `name: "Бонус статів"`), беруться з `t()` у момент створення (ч.3, рішення 2). Issue-повідомлення `schema/ability.ts` (валідація збереження, бачить DM) → `abilities.validation.*` + `params`.
6. **Дати й числа.** `toLocaleDateString("uk-UA")`/`toLocaleString` → `useFormatter().dateTime(value, { dateStyle: "short" })` (журнал — `+ timeStyle: "short"`). `getRequestConfig` віддає `timeZone: "Europe/Kyiv"` (зараз SSR рендерить у часовій зоні сервера, а клієнт — у браузерній; одна зона прибирає розбіжність гідрації). Числа — без змін (роздільників тисяч у скоупі немає).
7. **Тест підписів без спільного файлу.** Задача 1 виносить логіку `label-keys.test.ts` у хелпер `expectLabelKeys(ns, prefix, values)` (`lib/i18n/test/label-keys.ts`); наявний тест лишається на ньому. Кожна доменна задача додає **свій** `lib/i18n/__tests__/label-keys-<ns>.test.ts`.
8. **Плюралі** (`pluralUk` у скоупі) → ICU (`uk` `one/few/many/other`, `en` `one/other`).
9. **Клієнтський Zod.** Після задач 9 і 11 редактори заклинань і здібностей показують issue через `translateIssue(useTranslator(), issue)`. Задача 15 перемикає `lib/zod/client-locale.ts` на ключовий `zodErrorMap`, лише якщо `rg` не знаходить інших клієнтських показів Zod-issue поза храповиком; інакше — лишити й записати в STATUS (до ч.6).
10. **Храповик.** Globs усього скоупу дописує задача 1 (`*` замість `[id]`); реєстрові файли `lib/utils/abilities/registry/**` і константи рішення 1 у храповик не йдуть. `lib/hooks/skills/*.ts` (поштучні рядки ч.3) замінюються на `lib/hooks/skills/**`.

## Тести

- Компонентні й хук-тести скоупу — на ключі мока; `pnpm test:related`.
- По одному `renderWithIntl({ locale: "en", namespaces })` на задачу.
- `label-keys-<ns>.test.ts` для кожного реєстру рішень 1–2, 5; `scope-size.test.ts`; `api-errors-coverage` для нових `API_ERRORS`; `parity` для всіх ns.
- Лінії аркуша/зведення довідника: сервер віддає ключ + `params`, `translateIssue` з реальним `uk`-JSON дає текст слово в слово (`vi.unmock` перекладача).

## Ризики

- **Сирий ключ** у компоненті скоупу, що рендериться поза `app/campaigns` (немає таких: перевірити `rg` у `app/` під час задачі 1) — страховка: усі ns в одному layout.
- **Змішана мова** до ч.6: описи здібностей, лог бою, крит-ефекти, підписи результатів асистента — прийнято.
- **Обсяг** (~32 тис. символів, 13 доменних задач) і якість `en` — лише рев'ю.
- **Паралельні задачі в одному worktree:** `tsc` фільтрується за своїми шляхами; повний — у кінці.

## Відкриті питання (користувач)

1. `acquaintances` (новий домен, ~400 символів) — додати в ч.4 (ns `acquaintances`, дрібна задача) чи в ч.5?
2. Генератор героя (`generate/{names,backstory}`) для `en`-гравця дає українські імена/передісторії: лишити (контент) чи окремий `en`-набір пізніше?
3. `timeZone: "Europe/Kyiv"` як єдина зона — достатньо, чи потрібна зона користувача (поле профілю) пізніше?
