# i18n: частина 6 — бій і залишки (закриття епіку)

Гілка `feat/i18n-part6` (worktree `../dnd-tracker-t6`) від main `b675bc56`. Базові правила — `docs/architecture/i18n.md` («Межі коду», «Середні домени (частина 4)», «Великі домени (частина 5)»), порядок частин — `docs/superpowers/specs/2026-10-28-i18n-core-design.md`, зразок — `docs/archive/superpowers/specs/2026-10-29-i18n-part5-design.md` (рішення 1–15 ч.5 діють і тут). Рушій бою — `docs/architecture/{battle,abilities}.md`.

## Мета і межі

**Входить** (кирилиця в коді без коментарів і `__tests__`, символів; верхня оцінка):

| Блок | Каталоги | ≈ символів / файлів |
|---|---|---|
| Battle UI | `components/battle/**` (без `dev`), `lib/hooks/{battle,battles}/**`, `app/campaigns/[id]/{battles,dm/battles}/**`, `lib/utils/battle/{view,flows,balance,fx}/**` | 9,5 тис. / ≈ 110 |
| Лог і правила рушія | решта `lib/utils/battle/**`, `lib/server/battles/**` | 9,0 + 1,0 тис. / ≈ 110 |
| Здібності | `lib/utils/abilities/**` (`registry` describe/summary, повідомлення рушія, `read.ts`, `build/immunities.ts`) | 6,0 тис. / 17 |
| Крит-ефекти й константи-підписи | `lib/constants/{critical-effects,save-critical-effects,spells,abilities,skills,artifacts,damage,battle,battle-weather,experience,classes,main-skills,ungrouped,choices,hero-archetypes,monster}.ts` | 4,6 + 1,6 тис. / 16 |
| Асистент (бій) | `lib/server/assistant/actions/{battles,battle-actions,battle-coverage}.ts`, `lib/server/battles/{action,read,execute-battle-operation}*` (частина) | 0,6 тис. / 5 |
| Залишки ч.5 | `lib/server/compendium-import/{feature-resolution,adapt/subraces,adapters/*}.ts`, коди воркера компендіуму, `lib/supabase/*-storage.ts`, `lib/utils/common/image-resize.ts`, `lib/utils/items/item-stats.ts`, `lib/schemas/{battles,common}.ts`, `lib/redis.ts`, `lib/server/templates/**`, `lib/hooks/world`, `lib/utils/scenario`, `types/import.ts`, en-генератор імен, мова REST-Bearer | 1,6 тис. / ≈ 20 |
| Dev-інструменти | `components/battle/dev/**`, `app/dev/**`, `lib/hooks/battle/{mock-participants,useBattleMapPlayground}.ts` | 1,4 тис. / 12 |

Поза скоупом (контент/дані, поза храповиком): `scripts/**`, `tests/**`, `data/**`, `lib/utils/characters/generate/**`, `lib/constants/import-aliases.ts`.

**Успіх:** з `NEXT_LOCALE=en` бій повністю англійською (сцена, HUD, майстри, панель ДМ, налаштування бою, список, лог, крит-діалог, лабіринт) без сирих ключів; **лог кожен бачить своєю мовою** (той самий бій у двох вкладках uk/en); `uk` слово в слово як зараз; старі бої (лог і ефекти до деплою) показуються як є; `pnpm battle-sweep` зелений; храповик покриває весь код, крім задокументованого списку винятків; епік закрито (STATUS — що відкладено й чому).

## Reuse-аудит (те, що реально читає бій)

| Існує | Як використовується в ч.6 |
|---|---|
| `TextRef { message, params }` (`types/choices.ts`), `translateIssue`/`issueParams`, `useSheetLine` | основа моделі тексту рушія (рішення 1): розширюється вкладеними аргументами, а не замінюється |
| `getTranslator`, `useTranslator`, `getRequestLocale`, `useFormatter` | лог для моделі (`en`), скрипти (`uk`), клієнтський рендер повних ключів |
| `API_ERRORS` + `apiErrorJson`/`battleErrorResponse`, `BattleRuleError(code, message, params)` | серверні помилки маршрутів бою; рядок поза каталогом проходить як є. Причини, які рахує й клієнт (`availability`, `spell-targeting`), — ключі клієнтського бойового ns, сервер перекладає їх тим самим `apiErrorJson` (`getTranslator` вантажить усі ns) |
| `gameTerms.{abilities,stats,damageTypes,dndSkills,monster,spellLevels,abbreviations}` | характеристики, типи шкоди, чуття, кола — в описах здібностей, лозі, майстрах; не дублювати |
| `abilityRegistry.{effects,flags,triggers,conditionTypes,options,fields,targets}` | підписи редактора вмінь (ч.4); вкладені в описи `abilityText` за повним ключем (`abilityRegistry.options.condition.<k>`) |
| `spells.{costs,targeting,shapes,schools,fx}`, `units.*`, `characters.archetypes.*`, `rules.mechanics.*`/`rules.sections.criticals.*` | вартість дій, цілі, форми, FX-архетипи, архетипи героя, механіки — у майстрах заклинань і налаштуванні бою |
| `common.{actions,form,confirm,states,dice,tabs,deleteAll,search}` | кнопки «Назад/Скасувати/Застосувати», стани, кубики — не дублювати в бойових ns |
| `assistant.{results,summary,warnings,handoffs}` + `resultLabel(locale, …)` (ч.5) | бойові дії асистента — той самий шаблон |
| `COMPENDIUM_ERROR_KEYS` + `compendium.errors.*`, `compendiumReport` (серверний) | коди воркера компендіуму; похідні тексти імпорту |
| `expectLabelKeys`, `renderWithIntl`, `makeT`, `parity`, `api-errors-coverage`, `client-api-errors` (обхід графа імпортів), `server-namespaces`, `scope-size`, `lib/__tests__/client-entry-imports.test.ts` | тести реєстрів, en-рендер, паритет ICU, серверні ns, бандл без zod; обхід графа — основа нового тесту бойового скоупу |
| `useConfirm`/`useNotify`, `ResponsiveDialog`, `QueryState`/`EmptyState`, `DeleteAllButton noun` | приймають перекладені `texts` |

**Нове:** `TextArg`/`LogLine` + `formatText` (`lib/i18n/text-ref.ts`), `useText()`; `BattleAction.log`; `ExtendLocaleScope` (злиття повідомлень у вкладеному провайдері); `BATTLE_NAMESPACES`; тестові `textOf`/`logTextOf` (реальний каталог, синхронно).

## Namespace-и і завантаження

| ns | Що | Скоуп | Власник (задача) |
|---|---|---|---|
| `abilityText` | описи/зведення вмінь (`describe*`, `abilitySummary`), повідомлення ефектів рушія (`abilityText.log.*`) | campaign (`CAMPAIGN_NAMESPACES`): картки скілів/артефактів/юнітів, лист героя, довідник | 4 |
| `battleTerms` | крит-ефекти атаки й рятунку (назва/опис/флейвор), складність зустрічі, інші підписи бойових констант, які показують і поза боєм | campaign (сторінка `dm/rules`, лист) | 0 (тексти), 5 (перемикання) |
| `battleCommon` | спільні словники бою: стани 5e (`label`/`description`), базові дії, Підступний удар, види атак/дій, погода, актори «ДМ»/«Система» | battle | 0 |
| `battle` | сцена, HUD, хід, учасники, оверлеї, мапа, FX-шар, крит-діалог, UI логу | battle | 6 |
| `battleWizards` | майстри атаки й заклинань, бонусні дії, прицілювання, `flows` | battle | 7 |
| `battleDm` | панель ДМ, діалоги ДМ, UI лабіринту | battle | 8 |
| `battleSetup` | налаштування бою, баланс, список боїв, редактор мапи бою, `battleSetup.validation.*` | battle | 9 |
| `battleLog` | рядки логу (атака, шкода, хід, мораль, смерть, концентрація, рятунки, приклик, дії ДМ), підписи деталей і рядків шкоди, причини відмов цих каталогів | battle | 2 |
| `battleActions` | дії 5e (схоплення, легендарні, лігво, реакції), стани (накладання/зняття), заклинання (прицілювання, каст, довгий каст), рушій лабіринту | battle | 3 |
| `assistant`, `compendiumReport` (серверні, є) | `assistant.battles.*`; `compendiumReport.derived.*` | server | 10 |

`spells.fx.{badges,previewUnits}` (написи FX-анімацій і манекени прев'ю — показуються й на сторінці заклинань) і `validation.{hexColor,image.*}` додає задача 0.

**Скоуп бою.** Новий `BATTLE_NAMESPACES` у `lib/i18n/scopes.ts`; `app/campaigns/[id]/battles/layout.tsx` і `app/campaigns/[id]/dm/battles/layout.tsx` рендерять `<ExtendLocaleScope namespaces={BATTLE_NAMESPACES}>`. «Вкладений провайдер повідомлення не зливає» — це поведінка `NextIntlClientProvider` за замовчуванням, тому злиття явне: серверний `ExtendLocaleScope` вантажить лише бойові ns і передає їх клієнтському `ExtendMessages`, який бере `useMessages()`/`useLocale()`/`useTimeZone()` зовнішнього провайдера і рендерить `NextIntlClientProvider` з `{ ...outer, ...battle }` (`useMemo`). Технічно можливо: обидва провайдери клієнтські, `LocaleScope` не задає `formats`/`onError`, які довелося б копіювати. Серіалізується лише бойова частина, кампанійний скоуп не дублюється.

**Бюджет** (`scope-size`, gzip; зараз uk 60,9 / en 48,5 KB; ≈ 0,88 B/символ за ч.5): campaign += `abilityText` ≈ 5 тис. + `battleTerms` ≈ 5 тис. символів → **uk ≈ 69–70, en ≈ 55–56**; бойові ns ≈ 20 тис. → сторінка бою (campaign + battle) **uk ≈ 87–89, en ≈ 69–71**. Один скоуп дав би > 80 на кожній сторінці кампанії → за порогом ч.5 розщеплюємо: бойові ns вантажаться лише на сторінках бою, решта сторінок кампанії не росте на ≈ 18 KB. На першому завантаженні сторінки бою сумарно ≈ 88 KB — як і з одним скоупом; при переході всередині кампанії доїжджає лише бойова частина. `scope-size` перевіряє обидва скоупи (< 100).

**Межа скоупу.** Компоненти бою, які рендеряться поза бойовими сегментами (`components/battle/fx/{dice,runtime,preview}` у `SheetRollDialog`, `DiceRoller`, `SpellBattlePreviewPanel`; dev-сторінки), не читають бойових ns. Новий тест `battle-scope-imports` (обхід графа, як `client-api-errors`): файли, досяжні з `app/**` поза `app/campaigns/*/{battles,dm/battles}/**`, не містять ключів із префіксами `BATTLE_NAMESPACES`.

## Рішення

1. **Модель тексту для не-React коду бою.** `TextRef` розширюється вкладеними аргументами: `type TextArg = string | number | TextRef`, `params?: Record<string, TextArg>` (переїзд у `types/text.ts`, ре-експорт із `types/choices.ts`). `type LogLine = string | TextRef`: рядок — legacy-текст або контент, показується як є; `TextRef.message` — **повний** ключ (`"battleLog.attack.miss"`). `formatText(t, line)` (`lib/i18n/text-ref.ts`, без `"use client"`) спершу форматує вкладені `TextRef`, далі `translateIssue`; **рядкові параметри ніколи не перекладаються** (імена учасників, вмінь, зброї, заклинань — контент; без евристики `t.has` для імен, бо гравець може назватись «rest»). Клієнт — `useText()` поверх кореневого `useTranslator()`. Побудова — `textRef(key, params)` з типом ключа з `uk`-JSON (`global.d.ts`), тож статичні ключі ловить `tsc`; динамічні — `label-keys-<ns>`. Якщо тип усіх ключів гальмує `tsc` > +20 %, — тип ключів окремого ns.

2. **Лог бою.** Зараз: `battle_events.resultText String NOT NULL` — сегменти через `" | "` (перший — заголовок, регекс `^Тригери …:` групує тригери), `details Json { actorName, actorSide, actionDetails }`; в `actionDetails` — текстові `damageBreakdown` (клієнт розбирає регексами `view/damage-breakdown.ts`), `damageSteps[].label`, `criticalEffect.{name,description,flavor}`, `appliedEffects[].name`, `hazard.label`; актори «ДМ»/«Система» — рядком в `actorName`. Рядки складаються інтерполяцією в ≈ 100 місцях `lib/utils/battle/**`, `lib/utils/abilities/**`, `lib/server/battles/**`.
   - **Обрано:** `BattleAction.log?: LogLine[]` (ті самі сегменти, перший — заголовок) → `battle_events.details.log` (JSON, **без міграції**); для нових подій `resultText = ""`. Читачі беруть `actionLines(action) = action.log ?? legacyLines(action.resultText)`; розбір legacy (`" | "`, регекс «Тригери») — у `lib/utils/battle/log/legacy.ts` з `eslint-disable -- legacy log rows`. Тригери в новому лозі — структурно (ключ заголовка `battleLog.triggers.*`), без регексу.
   - Структуровані поля: `actionDetails.damageRows?: DamageRow[]` (`label: LogLine`, `value`, `tone`) замість `damageBreakdown` (legacy розбирається, як зараз); `DamageStep.label: LogLine`; `criticalEffect` нових подій — `{ id, type, source: "attack" | "save", flavorIndex? }` без тексту, текст — `battleTerms.crits.*` (старі записи з `name` — як є); `ActiveEffect.label?: LogLine` для ефектів, які створює рушій («Ухилення», «Концентрація: {spell}», стани) — показ `label ?? name`, `name` контентних ефектів не змінюється; `hazard.label: LogLine`; актор ДМ/Система — підпис за `actorId` (`battleCommon.actors.*`).
   - **Мова — глядача, не автора:** лог перекладається на клієнті; той самий бій бачать гравці з різними мовами. Сервер рендерить лише для моделі (`formatBattleLog(enT, action)` у `read-service` — англійською, рішення 1 ч.5) і для скриптів (`battle-sweep` — `uk`).
   - **Відкинуто:** (а) писати перекладений текст у мові автора дії — лог спільний для всіх учасників; (б) нова колонка `log Json` — `details` уже JSON, міграція не потрібна; (в) коди всередині `resultText` — крихкий розбір; (г) писати і `log`, і uk-`resultText` — подвоєння байтів (egress Supabase, поріг Pusher 9 500 B).
   - **Інваріанти:** `snapshotHash` пише `saveBattle` (нові `ActiveEffect.label` ідуть тим самим шляхом), логіка `runBattleMutation`/`advanceTurn`/`applyDamageConsequences`/`removeEffects` не змінюється — міняються лише типи повідомлень (`string[]` → `LogLine[]`); `ClientBattleDelta` несе ті самі `BattleAction` (нове поле всередині події). Rollback Vercel: старий код покаже порожні рядки для подій, створених новим кодом (дані цілі в `details.log`) — прийнято (відкрите питання 1).
   - **Egress:** рядок ключ+params довший за український текст (≈ ×1,5–2), але `resultText` зникає. Задача 11 міряє середній розмір `battle_events` на `battle-sweep` до/після; > +30 % — скорочені ключі.

3. **Що «доходить до користувача» в `lib/utils/battle`.** Перекладається: (а) рядки логу (`resultText`, `messages`, `flow.messages`, текстові поля `actionDetails`); (б) причини відмови (`rejectAction`, `BattleRuleError.message`, `fail()` у `spell-targeting`/`validation`, причини `availability`/`cunning-strike`/`legendary-options`) — `TextRef` з ключем клієнтського бойового ns: клієнт показує через `useText`, сервер — через `apiErrorJson` (ключ є в каталозі; `params` — лише рядки/числа; вкладене — окремим ключем); ключ, який уже є в `API_ERRORS`, лишається; (в) назви й описи ефектів рушія в snapshot (рішення 2); (г) підписи view-хелперів (стан здоров'я, черга, зведення, видимість). Не перекладається: коментарі; `throw new Error` інваріантів (→ англійською, це повідомлення розробника); дані-конвенції (legacy-розбір, регекси імпорту) — `eslint-disable-next-line no-restricted-syntax -- <причина>`. Імена, які рушій генерує й зберігає в учасниках (приклики, клони), — без слів (числові суфікси) або у звіт задачі.

4. **Описи здібностей.** `describe*`/`describeTrigger`/`describeAbility`/`abilitySummary` повертають `LogLine`/`LogLine[]` з ключами `abilityText.{effects,flags,triggers,conditions,limits}.*` + `params`; вкладені підписи — повним ключем ч.3–5 (`abilityRegistry.options.condition.<k>`, `gameTerms.damageTypes.<t>`, `gameTerms.monster.senses.<s>`). **Ключі ns, а не id+params без ns:** описи — шаблони зі змінними, id без каталогу не перекладається, механізм той самий, що лог. Рушій не залежить від описів: бонуси — лише `collectModifiers`/`runAbilities`, колонка `abilities` — лише `read.ts` (його `issues` → `abilities.read.*`). Повідомлення ефектів рушія (`EffectApplyResult.messages`, «не спрацювало (шанс N %)» у `run-abilities.ts`) → `abilityText.log.*`. Назви вмінь і `note.text` — контент; `build/immunities.ts`: регекси розбору — дані (`disable`), префікс «Імунітет: …» — ключ опису `note`. `lib/cache/info-reference.ts` кешує `TextRef` (кеш не залежить від мови, переклад — у споживача). uk-поля `label` у `registry/*` (UI читає `abilityRegistry.*` з ч.4): без людських споживачів — видалити; модельні — англійською.

5. **Крит-ефекти.** `CRITICAL_{SUCCESS,FAIL}_EFFECTS`, `SAVE_{SUCCESS,FAIL}_EFFECTS` лишають `id`, `type`, `effect`, `flavorCount`; тексти — `battleTerms.crits.{attack,save}.{success,fail}.<id>.{name,description,flavor.<n>}` (без масивів у JSON). Споживачі: рушій (лог — `criticalEffect` без тексту), `CritChoiceDialog`, `components/rules/sections/CriticalsSection.tsx` (`DOUBLE_DAMAGE_NAME` → ключ). Тексти в JSON заносить задача 0 (скрипт копіює uk слово в слово), перемикання — задача 5.

6. **Бойові константи-підписи.** Кожне uk-поле класифікується за споживачами (`rg`): UI → ключ (здебільшого вже є з ч.3–5); людський текст у не-React коді → `TextRef`; текст для моделі (`.describe()`, AI-тули) → англійською або id; розбір/зіставлення даних → `import-aliases.ts` або `disable -- data`; без споживачів → видалити. Відомо: `BATTLE_STATUS_LABEL` — без споживачів (видалити); `BATTLE_ACTION_LABELS`, `ATTACK_KIND_LABELS`, `CUNNING_STRIKE_LABELS`, погода, `CORE_ACTION_REGISTRY.label`, `CONDITION_5E_REGISTRY.{label,description}`, `SYSTEM_ACTOR`/`DM_ACTOR.actorName` → `battleCommon.*`; `SPELL_CIRCLE_ORDINALS`/`CANTRIP_NAME` — назви груп заклинань, що пишуться в БД і розпізнаються (`isCircleName`) → дані (`disable`), показ — `gameTerms.spellLevels`; `HERO_ARCHETYPES.{name,className}` — показ через `characters.archetypes.*`, `className`, якщо пишеться в `Character.class`, — контент у локалі автора; складність зустрічі (`experience.ts`) → `battleTerms.encounterDifficulty.*`. Тести `label-keys-{battleTerms,battleCommon}`.

7. **Асистент (бій).** `title`/`description` дій `battles.*` — англійською (текст для моделі, як `show.*` ч.5); `reason` handoff-ів, `actionResult("battles", …)`, `summary`/`warnings` (`action-service.ts`), `affected[].name` («Бій», «Новий бій») → `assistant.battles.*`/`assistant.results.battle` через `resultLabel(caller.locale, …)`/`getTranslator(caller.locale, "assistant")`; `loadDmBattle(…, "Доступ заборонено")` → наявний `API_ERRORS`; `lastEvents` у `read-service.ts` → `formatBattleLog` англійською; `RateLimit` «Забагато запитів» → `API_ERRORS.RATE_LIMITED` (або наявний аналог).

8. **Залишки ч.5.**
   - Похідні тексти імпорту компендіуму (`feature-resolution.ts`: «Особливості на вибір», «Вимоги (ДМ перевіряє вручну): …», назви характеристик; `adapt/subraces.ts`: «Походження»; `adapters/{character-traits,spell-derive,shared,item-effects,characters,content}.ts`) — **контент у локалі автора імпорту**: `AdapterContext.t` (серверний `compendiumReport`, піддерево `derived.*`), locale — `getRequestLocale()` один раз на старті запуску (`http.ts`); file-level `eslint-disable` прибирається; регекси розбору лишаються даними. Старі імпорти не перекладаються.
   - Коди воркера компендіуму: `COMPENDIUM_ERROR_KEYS` += усі коди `parse.ts`/`http.ts`/`file.worker.ts` (`INVALID_TEXT`, `STRING_SIZE`, `DEPTH`, `NODES`, `DUPLICATE_KEY`, `INVALID_JSON_UTF8`, …; `rg 'fail\("|CompendiumError\("'`), позиція `$@N` → параметр `{position}`; тест: кожен код має ключ в обох мовах.
   - `lib/supabase/{image-storage,image-bucket-storage}.ts` — серверні помилки → `API_ERRORS` (задача 0); `lib/utils/common/image-resize.ts` (клієнт) → `validation.image.*`; `lib/schemas/common.ts` → `validation.hexColor`; `lib/schemas/battles.ts` → `battleSetup.validation.*` з `translateIssue`; `item-stats.ts` `.describe()` → англійською; `lib/redis.ts` → англійський лог; `lib/server/templates/**` → `API_ERRORS` / ключі `campaigns.sync.*`; `types/import.ts` (назви колонок legacy-CSV) і hotkeys `useMapDrawing` (кирилична розкладка), `section-icon.ts` (регекс заголовків) — дані з `disable` (якщо ще без нього).
   - Dev-інструменти (`app/dev/**` — `notFound()` у production, `components/battle/dev/**`, моки) — **англійські літерали без ns**: це UI розробника; dev-сторінки під root-провайдером без кампанійних ns, ключі там дали б сирі рядки.
   - en-генератор імен: таблиці `names.{uk,en}.ts` отримують стабільний `id`; раса → `id` за збігом із regex **обох** мов, імена — з таблиці локалі автора (uk-кампанія з uk-назвами рас більше не дає en-ДМ generic-імен). Каталог лишається поза храповиком.
   - **Мова REST-Bearer:** `getRequestLocale()` для запиту з `Authorization: Bearer` без cookie/`Accept-Language` бере `users.locale` власника токена (один `select` за хешем токена, `cache()` у межах запиту) → далі `en`. Якщо це тягне prisma в граф `proxy.ts`/клієнта або ламає `request-locale` тести — відкласти з записом у STATUS (`Accept-Language` уже працює для зовнішніх клієнтів).
   - **`User.timeZone` — відкладено:** міграція + поле профілю + читання на кожному запиті заради того самого, що вже дає cookie `TZ`; серверних текстів із датами поза браузером (листи, пуші) немає. Запис у STATUS.

9. **Храповик і винятки.** Задача 0 одразу дописує globs усього скоупу ч.6 (як ч.4–5; один автор `i18n-migrated.json`); доменні задачі перевіряють `eslint <свої шляхи>`. Задача 11 перемикає храповик на весь код: `eslint.config.mjs` — блок правила з `files: ["**/*.{ts,tsx}"]` і `ignores` з нового `i18n-exempt.json`: `scripts/**`, `tests/**`, `data/**`, `prisma/**`, `**/__tests__/**`, `lib/utils/characters/generate/**`, `lib/constants/import-aliases.ts`, `vitest-setup.ts`, `eslint/**`. Решта кирилиці в нетестових `.ts/.tsx` — лише `eslint-disable-next-line no-restricted-syntax -- <причина>` (дані, legacy-розбір, назви мов) з переліком у `i18n.md`.

10. **Тексти для моделі vs для людини, мова** — як ч.5 (рішення 1–3): людині ключі, моделі англійською з `Reply in <мова>`; locale асистента — `caller.locale`, не `getRequestLocale` у діях.

## Уроки ч.4–5 (правила для виконавців)

- **Серверні ns не в клієнті:** `SERVER_NAMESPACES` клієнт не вантажить (тести `client-api-errors`, `server-namespaces`); причини, які рахує клієнт, — у клієнтських бойових ns, не в `errors.*`.
- **Без zod в entry-чанках:** новий хук із Zod-моделлю не експортується через barrel, який читають entry-чанки (`lib/__tests__/client-entry-imports.test.ts`; прецедент `useSpellMechanics`).
- **Динамічні ключі** `t(\`…${x}\`)` і `textRef(\`…${x}\`)` покриває `label-keys-<ns>` в обох мовах; статичні ловить `tsc`.
- **Клієнтські Zod-помилки** — `translateIssue(t, { message, params: issueParams(issue) })`; `parity`: ті самі ключі й ICU-плейсхолдери uk/en; `uk` — слово в слово з поточних рядків (без «покращень», плюралі не додаються, якщо їх не було); `en` — природний переклад.
- **Тести:** ≥ 1 компонентний тест на задачу з реальними JSON через `renderWithIntl` (`vi.unmock("next-intl")`, де треба) для `uk` і `en`; решта — на ключі (глобальний мок `t` → `"ns.key"`). Тести рушія порівнюють текст через `logTextOf(action)` (реальний `uk`-каталог) — це й перевірка «слово в слово».
- **Текст для моделі** — англійською в коді (з `Reply in <lang>`); для людини — ключі.
- **Worktree:** `git add` лише своїх шляхів, без `git stash`/`reset`/`checkout` чужих файлів, лише свої `messages/{uk,en}/<ns>.json`; під час роботи — `pnpm test:changed`/`pnpm test:related <files>`; повні `pnpm test:run` + `pnpm lint` + `pnpm exec tsc --noEmit` — один раз перед merge і після fix wave (tsc/lint > 10 хв — у фоні); перед merge — `git merge origin/main` у гілку.
- **Храповик:** globs у `i18n-migrated.json` пише лише задача 0/11; коментарі й `__tests__` не перевіряються.
- **Коміти виконавців** — трейлер `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`.
- **Процес:** SDD без рев'ю по задачах → одне Opus-рев'ю + fix wave → `/simplify` (1–2 агенти Sonnet на непересічних каталогах) → docs → merge (оркестратор, після «пушай» користувача).

## Тести

- Задача 0: `server-namespaces` (+ `BATTLE_NAMESPACES ∩ SERVER_NAMESPACES = ∅`, `∩ CAMPAIGN_NAMESPACES = ∅`), `scope-size` для campaign і campaign+battle, `battle-scope-imports`, `ExtendMessages` (компонент бачить ключі обох скоупів), `formatText` (вкладені ref, рядок як є, рядкові params не перекладаються), `label-keys-{battleCommon,battleTerms}`.
- Задача 1: legacy-подія рендериться як раніше (golden на `logEntryView` старого `resultText`); нова подія з `log` → `resultText = ""`, round-trip `details.log` через `event-mapping`, дельта містить `log`; `textOf`/`logTextOf` на реальному каталозі.
- Доменні: ключі мока + `logTextOf` у тестах рушія; `label-keys-<ns>`; ≥ 1 `renderWithIntl` `en`/`uk`; сервер — `assistant` у `en`/`uk` (`vi.unmock` перекладача).
- Фінал: повний прогін, `pnpm battle-sweep` на prod-копії (звіт `uk`), замір egress подій, `scope-size` з цифрами.

## Ризики

- **Обсяг тестів рушія:** ≈ 480 тестових файлів бою/здібностей мають кирилицю (≈ 5 тис. рядків), ≈ 90 читають `resultText`/`messages`. Пом'якшення — `logTextOf`/`textOf` (заміна `action.resultText` → `logTextOf(action)` без зміни очікуваних рядків).
- **Розширення типів (задача 1)** зачіпає багато споживачів одночасно — тому воно окремою послідовною задачею до паралельних хвиль; продюсери далі змінюються без зміни споживачів.
- **Змішана мова старих боїв** (лог, ефекти в snapshot до деплою) — прийнято; новий бій — повністю локалізований.
- **Rollback** після деплою — порожні рядки нових подій у старому коді (рішення 2).
- **Egress** логу — замір у задачі 11.
- **`tsc` на типі всіх ключів** (`textRef`) — fallback на тип ключів ns.
- **Паралельні задачі в одному worktree** бачать незавершені файли одна одної: перевірки фільтруються своїми шляхами; збій поза ними — у звіт, не «лагодити чуже».

## Відкриті питання (користувач; не блокують старт)

1. Нові події пишуть `resultText = ""` (лог лише структурований): rollback деплою покаже порожні рядки нових подій. Ок, чи писати ще й uk-текст як fallback ціною подвоєння байтів логу (egress)?
2. Мова REST-Bearer з профілю власника токена (рішення 8) — робити, чи закрити як «є `Accept-Language`»?
