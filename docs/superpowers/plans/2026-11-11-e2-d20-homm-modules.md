# E2: база `systems/d20` і модулі правил — план

Дата: 2026-11-11 (ред. 2: модель композиції «база + модулі», рішення власника). Spec: [2026-11-11-e2-d20-homm-modules-design.md](../specs/2026-11-11-e2-d20-homm-modules-design.md) (далі «spec»; ризики D1–D17 — spec розд. 8). Стартова точка: `main` після `9f3e3cdf1`.

Номери частин збережено з першої редакції; змінились зміст Ч1–Ч3, Ч8, Ч10, Ч13, порядок (Ч13 іде одразу після Ч2) і додано Ч16 (шов створення режиму); фінал тепер Ч17.

## Як працювати з планом

**Порядок і паралельність.**

```
Ч1 → Ч2 → Ч13 → Ч3 ─┬─ трек A (бій):       Ч4 → Ч5 → Ч6 → Ч7 → Ч8 ─┐
                    ├─ трек B (персонажі):  Ч9 → Ч10 ────────────────┼─ Ч12 → Ч16 → Ч15 → Ч17
                    ├─ трек C (маршрути):   Ч11 ─────────────────────┘
                    └─ дані:                Ч14 (після Ч5)
```

Ч13 стоїть перед Ч3, бо Ч3 робить механіки Heroes модулями: кампанії `dnd5e` з увімкненою мораллю чи відсіччю мають отримати явний `modules` до цього деплою (D2). Треки A, B, C ідуть паралельно в окремих worktree (`../dnd-tracker-e2-battle`, `-e2-chars`, `-e2-routes`). Розподіл спільних файлів: `lib/utils/battle/participant/**` і частина `combat/turn/magic/participant` у `systems/types.ts` — трек A; `stats/progression/sheet`, `lib/utils/characters/**`, `lib/server/characters/**` — трек B; `app/api/**`, `lib/constants/content-kinds.ts`, `lib/server/content/**` — трек C. Теки модулів діляться за шарами: `systems/<модуль>/rules/**` бою — трек A, `server|ui|hooks` персонажа — трек B. Кожна частина зливається в `main` окремо (тимчасовий worktree для merge); наступна стартує від свіжого `main`.

**Правила кожної частини.**

- Переїзд файла = `git mv` + правка імпортів без зміни поведінки в тому ж коміті. Зміна поведінки (хук замість гілки) — окремий коміт із тестом. Тести їдуть за кодом у `systems/<id>/__tests__/<дзеркальний шлях>`.
- Core-гілка «якщо хука немає — правило d20» видаляється в тій самій частині, де хук стає обов'язковим.
- Модуль імпортує інший модуль лише за `requires` у meta; взаємодія модулів — через ефекти, стати й змінні core.
- Після зміни шарів теки: `pnpm systems:index`. Після зменшення протікань: `pnpm exec tsx scripts/shared/system-ratchet.ts --write` (лічильники лише падають; ріст = зупинка й розбір).
- Під час роботи: `pnpm test:related <файли>`, `pnpm exec eslint --cache --fix <зачеплені файли>`. Repo-wide lint заборонений.
- Наприкінці частини (один раз): `pnpm exec tsc --noEmit`; `pnpm exec eslint --cache` по зачеплених теках окремими запусками; `pnpm test:run` (перед ним — `ps -Ao pid,pcpu,command -r | grep -E "eslint|vitest|next"`); `pnpm test:run lib/__tests__/system-contract.test.ts lib/__tests__/systems-index.test.ts lib/__tests__/system-literals.test.ts lib/__tests__/system-imports.test.ts`.
- **Гейт бою** («sweep»): `./scripts/db/prodcopy-db.sh`, далі `DATABASE_URL=postgresql://postgres:postgres@localhost:54322/prodcopy pnpm battle-sweep --out .superpowers/sdd/e2/<частина>` — усі профілі, exit 0, 0 помилок, попереджень не більше базових (базовий прогін — Ч1, задача 0). Після Ч8 до профілів додається `srd-5.2+morale`.
- Наприкінці частини: `/simplify` на diff (1 агент; для чистих переїздів пропустити), оновити `docs/architecture/rule-systems.md` і `docs/STATUS.md`.
- Виконавець — Sonnet (свіжа сесія на частину; при ~150k контексту — зупинка й handoff). Ревʼю — одне наприкінці частини (Opus, де вказано). Per-task ревʼю немає.
- Кожен запис у prod — окреме «так» власника, перед ним бекап і репетиція на prodcopy. Push і deploy — лише за «так».

**Бюджет (орієнтир).** 17 частин, ≈ 40–46 сесій Sonnet + 14 ревʼю Opus + 1 фінальне Fable. Перед стартом кожного треку нагадати про `/usage`; при 85 % тижневого ліміту — зупинка із записом стану в STATUS.

| Ч | Назва | Ризик | Файлів | Сесій | Ревʼю | Гейт |
|---|---|---|---|---|---|---|
| 1 | Каркас композиції (маніфест, `composeSystem`, генератор, ratchet, ESLint, толерантний `system.modules`) | середній | ~55 | 2–3 | Opus | контракт, матриця |
| 2 | Оболонки: база `d20`, пресет `homm`, шість порожніх модулів | низький | ~70 | 1–2 | — | контракт, sweep |
| 13 | Дані I: `system.key` і явні `modules` (бекфіл), прибрати здогадку | низький, запис у prod | ~20 | 1 | — | D1, D2, D3 |
| 3 | Секції правил: власники, шляхи, розбір по пунктах | середній | ~80 | 3 | Opus | D4, D5, D6 |
| 4 | Вміння: ефекти, змінні, джерела, стани — по модулях | середній | ~75 | 2 | Opus | sweep, D13 |
| 5 | Бій d20 I: атака, шкода, ініціатива | високий | ~90 | 3 | Opus | sweep, D11 |
| 6 | Бій d20 II: 0 HP, хід, дії, реакції | високий | ~110 | 3 | Opus | sweep |
| 7 | Магія d20 | високий | ~80 | 2–3 | Opus | sweep |
| 8 | Модулі Heroes у бою: `morale`, `retaliation`, `unitstacks`, бойові частини `heroscaling`, `artifactsets` | високий | ~85 | 3 | Opus | sweep + `srd-5.2+morale`, D9 |
| 9 | Персонажі d20 | середній | ~180 (переважно `git mv`) | 4 | Opus | D12 |
| 10 | Модулі Heroes у персонажах: `heroscaling`, `skilltrees`, `artifactsets` | середній | ~100 | 2–3 | Opus | D12, D16 |
| 11 | Види контенту й маршрути від модулів | середній | ~125 | 3 | Opus | D14, D15, D17 |
| 12 | UI бою і клієнтські flow | середній | ~110 | 3 | Opus + браузер | sweep, live-run |
| 14 | Дані II: лічильники wfrp у слот | середній, форма активних боїв | ~40 | 1–2 | Opus | sweep, D7 |
| 16 | Шов створення режиму: каталог, валідація, перемикачі модулів | середній | ~55 | 2 | Opus + браузер | D3, D16 |
| 15 | Дані III: стан d20 і модулів у слот учасника | високий, форма активних боїв | ~65 | 2 | Opus | sweep, D8 |
| 17 | Фінал: нулі ratchet, `d6pool-battle`, документи | низький | ~45 | 2 | Opus + Fable | усе |

---

## Ч1. Каркас композиції

**Мета.** Механізми spec розд. 4–5 існують і покриті тестами; поведінка продукту не міняється; нових тек у `systems/` ще немає. Після деплою цієї частини prod-код уміє прочитати `system.modules` (поріг відкату D3).

**Обсяг.** `lib/utils/rules/systems/{meta,slot,compose,catalog,neutral,registry}.ts`, `components/systems/{compose,registry}.ts`, `lib/server/systems/{compose,registry}.ts`, `lib/utils/rules/schema.ts` (лише секція `system`), `scripts/shared/{systems-index,system-ratchet}.ts`, `eslint.config.mjs`, `lib/__tests__/{system-contract,system-literals,systems-index}.test.ts`, `lib/__tests__/helpers/system-contract.ts`, `lib/__tests__/fixtures/{d6pool,d6pool-plus,d6pool-alt}/**`, `scripts/templates/systems/modules.ts`, `systems/wfrp/{meta,index}.ts` (поля маніфесту, ім'я експорту).

**Задачі.**

0. Базові артефакти: sweep на `main` → `.superpowers/sdd/e2/baseline/`; три журнали боїв (по одному на шаблон, `--keep-battles`) як golden для D11 у `lib/utils/battle/log/__tests__/fixtures/e2-golden/`.
1. `SystemMeta`: `kind`, `preset`, `requires`, `conflicts`, `claims`, `after`, `toggle`, `tokens`. `composition(system): { base, modules }` (пресет або явний список), `PRESETS`, `RULE_SYSTEM_KEYS` = ключі пресетів. Тести: `{key:"homm"}` → набір пресета; явний `modules` заміщує набір; невідомий id → issue.
2. `validateComposition(system): CompositionIssue[]`: `requires`, `conflicts`, подвійний `claims`, невідомі id, модуль не тієї бази. `compositionOrder(base, modules)`: топологічно за `requires` + `after`, рівні — за id. Тести: порядок не залежить від порядку у вхідному масиві; цикл → помилка; два claimant-и одного слота → issue.
3. `composeSystem(base, addons)` за таблицею spec 4.3 (+ `composeUi`, `composeServer`); вид поля виводиться з типу контракту (списки `readonly X[]`, словники, виключні), а не з рядкових шляхів; заміщення виключного слота без `claims` → помилка на старті. Кеш за `key + modules`. `extendSystem` = обгортка над `composeSystem`. Тести: списки база→модулі в порядку композиції; колізія словника → помилка; claimant отримує `prev`; `ruleSystemOf` для двох наборів не ділить кеш.
4. `SlotCodec.extend(module, parse)`: `data.ext[module]`; запис модуля не губить дані бази й інших модулів; дані вимкненого модуля зберігаються. Тести на всі чотири властивості.
5. Секція `system`: `z.object({ key, modules: z.array(z.string()).optional() })` із валідацією через `validateComposition`; `mergeRules` зберігає `modules`. Запис `modules` через API поки заборонений (патч відхиляє поле до Ч16). Тест: рядок із `modules` розбирається й переживає збереження правил.
6. Генератор: реєстри модулів за id (`MODULES`, `MODULE_UI`, `MODULE_SERVER`, `MODULE_HOOKS`), рядок на теку з відповідним шаром; `ruleSystemOf/systemUiOf/systemServerOf` повертають зібране. Ручні рядки d20 у реєстрах поки лишаються як тимчасова «база d20» (зникнуть у Ч2). `WFRP_SYSTEM` → `WFRP_MODULE`.
7. Ratchet: `substring` з `meta.tokens`; id модулів-доповнень не входять у літерали (spec 5.4). Перевірка: `--write` не збільшує жоден лічильник.
8. `system-literals.test`: таблиці «імена-протікання» і `rules-section-readers` (старт — фактичні числа; 83 файли сумарно) — падають і на ріст, і на застарілий максимум.
9. ESLint: `SYSTEM_SELF_PATTERNS(id)` дозволяє лише теки з `requires` (розбір `meta.ts` регулярним виразом); контрактний тест звіряє розбір із meta.
10. Контракт: граф залежностей, пари `claims` ⊂ `conflicts`, **матриця композицій** (spec 5.6) на фікстурах `d6pool` (база), `d6pool-plus` (модуль: секція-заготовка, `turn.onTurnStart`, дані в `ext`), `d6pool-alt` (той самий `claims` → відмова).
11. `include` між пакетами (R17): «однакова база» замість «однаковий модуль».

**Перевірка.** Кінцевий чекліст; `pnpm systems:index` дає порожній diff після другого запуску.

**Prod.** Звичайний деплой за «так» (потрібен перед Ч13). **Модель.** Sonnet. **Ревʼю.** Opus (типи `composeSystem`, порядок, `SlotCodec`).

## Ч2. Оболонки: база, пресет, модулі

**Мета.** Усі теки spec 5.1 існують; реєстри повністю згенеровані; пресет `homm` = `d20` + шість модулів без власної логіки. Поведінка та сама.

**Обсяг.** `lib/utils/rules/systems/d20/**` → `systems/d20/{meta.ts,index.ts}`; `components/systems/d20/**` → `systems/d20/ui/**`; `D20_SERVER` → `systems/d20/server/index.ts`; нові `systems/homm/{meta.ts,rules/rules-preset.ts}`, `systems/{morale,retaliation,heroscaling,skilltrees,artifactsets,unitstacks}/{meta.ts,index.ts}`; реєстри, `scripts/templates/systems/{index.ts,homm/index.ts}`, `eslint.config.mjs`, `system-ratchet.ts`, контрактні тести, `scripts/templates/__tests__/d20-prepare.test.ts`.

**Задачі.**

1. `git mv` оболонок d20; `D20_META = { module: "d20", kind: "base", keys: ["dnd5e"], tokens: ["dnd5e"], … }`, `D20_MODULE` (фабрика `d20System(key)` зникає; `key` результату ставить `composeSystem` із пресета).
2. Шість модулів: `meta.ts` (`kind: "addon"`, `requires: ["d20"]`, `claims` для `heroscaling` і `unitstacks`, `toggle: "setup"` для `heroscaling` і `skilltrees`) + `index.ts` з порожнім `defineAddon(() => ({}))`. `HOMM_META` (`kind: "preset"`, `preset: { base: "d20", modules: [усі шість] }`).
3. Хуки пакета: `PACK_HOOKS` для композиції = хуки бази + модулів; `scripts/templates/systems/homm` лишає власні хуки пакета Heroes; ручні рядки в корені зникають.
4. Видалити: ручні рядки `homm/dnd5e` у реєстрах, `SYSTEM_IMPORT_PATTERN`, виняток d20-тек у `isLiteralAllowed`, фільтр `!== "d20"` у контрактному тесті. `d20-prepare.test`: `include` Heroes ← SRD дозволений (однакова база).
5. Тексти: `gameTerms.module.<id>.{name,summary}` (uk/en) для шести модулів; тест контракту вимагає їх для кожного `addon`.
6. `client-entry-imports.test`, `scope-size` — нові теки не тягнуть зайвого в клієнтські входи.

**Перевірка.** Чекліст; матриця композицій на реальних модулях; sweep; `pnpm template validate` для всіх пакетів.

**Prod.** Немає. **Модель.** Sonnet. **Ревʼю.** не потрібне (переїзд).

## Ч13. Дані I: `system.key` і явні `modules` (D1, D2, D3)

**Мета.** Кожен рядок правил має `system.key`; кампанії `dnd5e` з увімкненими механіками Heroes мають явний `modules`; вгадування й типовий ключ видалено. Виконується після деплою Ч1 і до деплою Ч3.

**Обсяг.** `scripts/db/backfill-rule-system.ts`, `lib/utils/rules/{schema,defaults}.ts`, створення кампанії (`lib/server/campaigns/**`).

**Задачі.**

1. Скрипт (dry-run за замовчуванням, `--apply`, `--allow-remote`, `--revert`; одна транзакція): (а) рядкам без `system` дописує `key` за правилом старої здогадки (єдине місце з цими літералами — під `scripts/`); (б) кампаніям `dnd5e`, де `morale.enabled`, `actions.retaliation` або нетиповий `heroScaling`, дописує `modules` з відповідними id; (в) шаблони й клони — так само. Звіт: по кожному рядку — що було, що стане.
2. Репетиція на prodcopy: dry-run → apply → повторний dry-run = 0 змін; `--revert` повертає вихідний JSON побайтово.
3. Після підтвердженого prod-запуску — другий коміт: `parseRules` без `system` → помилка розбору (сторінка показує `rules.validation.unknownSystem`, не падає); `DEFAULT_RULES` без `system`; створення кампанії вимагає систему. Тести: правила без `system` → помилка; усі 5 `rules.json` мають ключ.

**Prod (кожен крок — окреме «так»).** Бекап → dry-run на prod → показати звіт власнику → `--apply` → перевірка `0 без system` → деплой коду без здогадки. Відкат: `--revert` + revert коду (не нижче Ч1).

**Модель.** Sonnet. **Ревʼю.** не потрібне; звіт перевіряє власник.

## Ч3. Секції правил: власники, шляхи, розбір по пунктах

**Мета.** `schema.ts` не перелічує секцій баз і модулів; налаштування адресуються шляхами `секція.пункт`; зберігання плоске й без змін (spec розд. 7).

**Обсяг.** `lib/utils/rules/{schema,defaults,registry,formulas,player-hidden,sections,legacy-sections,paths}.ts`, новий корінь `lib/utils/rules/systems/sections.ts`, `systems/{d20,wfrp,morale,retaliation,heroscaling}/rules/sections.ts`, `lib/utils/rules/{tables-schema,advancement-schema,advancement}.ts` → `systems/wfrp/rules/`, `components/rules/**`, `lib/server/templates/sync/hash.ts`, `lib/server/campaigns/*rules*`, генератор, meta (`unusedMechanics` видаляється).

**Задачі.**

1. `RulesItem`, `RulesSection`, `extendSection(section, items)`, `sectionsOf(composition)`; колізія шляху між модулями → помилка композиції. `rulePaths(composition): string[]`; `getRule(rules, path)`, `setRule(patch, path, value)`.
2. Розбір по пунктах: відсутній/невалідний пункт → `default` (через `upgrade`); зайві під-ключі не валять секцію. Тести: `morale: { enabled: true }` без `cap` → `cap` типовий, `enabled` збережено; пункт-скаляр із `upgrade` читає стару форму; legacy-ключ `retaliation` при вимкненому модулі не валить `actions`.
3. `mergeRules` пише поверх сирого JSON: секції й пункти неактивних модулів зберігаються (D4); патч зливається вглиб по пунктах. `RulesetPatchSchema`, `MECHANIC_REGISTRY` → функції від секцій композиції; `stripPlayerHiddenRules` — від `playerHidden`.
4. Розкласти 19 секцій за власниками (spec розд. 7). `formulas.ts`: `proficiencyForLevel` → d20; `heroDiceTable`, `heroHpFormula` → `heroscaling`; `moraleCapFromRules` → `morale`.
5. `legacy-sections.ts` (лише типи, тимчасово) + типізований доступ у власників (`d20Rules`, `moraleRules`, `wfrpRules`, …).
6. `RulesForm`: вкладки = секції композиції; редактор секції рендерить пункти за шляхами (вкладений пункт = вкладений блок); редактори `Morale` → `systems/morale/ui`, `HeroScaling` → `systems/heroscaling/ui`, перемикач відсічі → `systems/retaliation/ui` (пункт у секції `actions`), решта → `systems/d20/ui/rules`. `unusedMechanics` видалити всюди.
7. Sync: `classifyRules` і `rulesHashes` ігнорують ключі без секції в композиції (D6).
8. Скрипт `scripts/db/rules-parse-report.ts` (read-only): усі правила БД — «розбір до = після» (старий розбір вшито як еталон), розбіжності по шляхах (D5).
9. З огляду Ч1 (обов'язково): `mergeRules` при зміні `system.key` скидає `modules`; `parseRules` не стирає мовчки невалідні `modules` (зберігає сирими або логує); усі `slot.write` у `systems/wfrp/rules/**` передають `prev`; `duplicateClaim` ловить префікси (`magic` vs `magic.slots`); `FieldKinds` отримує словники нових секцій; перевірка в `system-contract`, що база має `tokens`.

**Тест-кейси (обов'язкові).** 5 × `data/templates/*/rules.json`: розбір до = після; кампанія `dnd5e` + `modules: ["morale"]` бачить секцію `morale`, без модуля — ні, а JSON після збереження містить її в обох випадках; `ruleset-section` зникає з `system-imports-exempt.json`.

**Перевірка.** Чекліст; `rules-parse-report` на prodcopy = 0 розбіжностей (або кожна пояснена); sync-diff клонів до = після; `pnpm test:related lib/utils/rules/schema.ts`.

**Prod.** `rules-parse-report` на prod (читання) — за «так», перед деплоєм. **Модель.** Sonnet. **Ревʼю.** Opus.

**Хвости Ч3 (виконати в наступних частинах; зафіксовано 2026-11-12).**
- **`DEFAULT_RULES.advancement` → секція wfrp (Ч4, перша задача).** `lib/utils/rules/defaults.ts` імпортує `DEFAULT_ADVANCEMENT_RULES` з `@/systems/wfrp/rules/advancement/rules`; це +1 запис у `system-imports-exempt.json` (ріст ratchet, прийнято тимчасово). Прибрати можна лише перенісши володіння `DEFAULT_RULES.advancement` у секцію wfrp (дефолт береться з `items[...].default` секції через реєстр, без прямого імпорту й без `zod` у клієнтському графі — тести `client-entry-imports`, `wfrp-import-cycle`). Після цього запис видалити й `--write`.
- **`formulas.ts` (Ч5/Ч8/Ч10, з переписом читачів).** `proficiencyForLevel` → d20, `heroDiceTable`/`heroHpFormula` → heroscaling, `moraleCapFromRules` → morale: ~10 читачів у core, перенос без нових exempt лише разом із їх переписом.
- **`ruleset-section` лишається в `system-imports-exempt.json`** (запис перейшов у `section-shapes.ts`) до моменту, коли `Ruleset` виводиться з композиції (не пізніше Ч17).
- **PATCH-валідація не обмежена композицією** (сервер приймає всі секції) — вмикається після Ч13 (D2 бекфіл `modules`).
- **`parseRules` повертає всі legacy-секції** (паритет, дефолтний `morale.enabled=true` не має протікати в dnd5e); типізований доступ `d20Rules/moraleRules/…` без викликачів, читачі переписуються в Ч5–Ч10.
- **`rules-parse-report` не запускався на БД** (порт 54322 зайнятий контейнером wfrp): запуск на prodcopy — за рішенням власника, перед деплоєм Ч3; prod — за «так».
- **Ревʼю Ч3 (Opus, 2026-11-12), для Ч13 і далі:** I1 — для `dnd5e` без `modules` UI не показує мораль/відсіч/масштабування, а рушій їх виконує (дефолти `morale.enabled`, `actions.retaliation` = `true`); бекфіл D2 (Ч13) мусить рахувати РОЗІБРАНІ значення з дефолтами, а не лише явно збережені. I3 — `lib/server/templates/sync/apply.ts` пише розібраний обʼєкт замість сирого JSON (стирає невалідні `system.modules`, невідомі ключі; зі звуженням `parseRules` зникнуть налаштування вимкнених модулів) — виправити (писати поверх сирого, як `mergeRules`) до першого звуження `parseRules`. Minor M1–M10 — у `.superpowers/sdd/2026-11-11-e2-d20-homm-modules/final-review.md` (зокрема: PATCH не приймає `system.modules`; немає матричного тесту колізій секцій; виняток `legacy-rules-parse` у ratchet/ESLint прибрати в Ч17).
- **Документи:** `docs/architecture/rule-systems.md` і `docs/STATUS.md` оновити в кінці Ч3 (секції за власниками, шляхи, без `unusedMechanics`).

## Ч4. Вміння: ефекти, змінні, джерела, стани

**Мета.** Реєстр умінь core не містить рядків баз і модулів; закрито борг `SystemEffectRow.system` + `traits-guard`.

**Обсяг.** `lib/utils/abilities/{registry/effects/{flags,state,system-row,system-rows},registry/{triggers,conditions},schema/{effects,triggers,kinds,system-effects},engine/core/flat,engine/effects/morale,build/{bake,collect},templates/**,class-columns,sheet-bonuses}.ts`, `lib/server/content/traits-guard.ts`, `systems/{d20,morale,retaliation,skilltrees,artifactsets}/rules/{ability-effects,ability-effect-rows}.ts`, `lib/utils/battle/conditions/**`.

**Задачі.**

1. `SystemEffectRow.system` (id модуля) заповнюється в корені; `effectKindsOf(composition)`. `traits-guard`: `kind` поза композицією кампанії → 422 для нових записів; наявні рядки читаються, рушій пропускає ефекти вимкнених модулів. Тести: wfrp-ефект у `dnd5e` → 422; прапорець моралі в `dnd5e + morale` → ок; у голому `dnd5e` → 422; наявний рядок із прапорцем моралі в голому `dnd5e` читається й нічого не робить.
2. `morale`: прапорці `moraleChance`, `noNegativeMorale`, `ignoreMorale`, `minMorale`, ефект `changeMorale`, тригер `moraleCheck`, `engine/effects/morale.ts`. `retaliation`: `noRetaliation`, `unlimitedRetaliation`, `extraRetaliations`. d20: концентрація, рятунки від смерті, майстерність. Рядки `kind` не міняються (D13).
3. `abilities.variables` (словник зі списку провайдерів): `str_mod…cha_mod`, `prof` (d20), `morale` (`morale`). `abilities.sources`: дерево навичок (`skilltrees`), набори (`artifactsets`). `abilities.recipes`: `templates/**` розкласти по власниках; `class-columns.ts` → d20.
4. `conditions` обов'язковий: `CONDITION_5E_REGISTRY` і застосування станів 5e → `systems/d20/rules/conditions`; гілка `undefined → 5e` видаляється.
5. Звіт `scripts/db/abilities-ownership-report.ts` (read-only): усі `abilities` JSON проходять схему композиції своєї кампанії.

**Перевірка.** Чекліст; sweep; звіт на prodcopy = 0 порушень.

**Prod.** Звіт на prod (читання) — за «так». **Модель.** Sonnet. **Ревʼю.** Opus.

## Ч5. Бій d20 I: атака, шкода, ініціатива

**Мета.** Core-конвеєр атаки не має гілки «хука нема»; d20-суд живе в `systems/d20/rules/attack`.

**Обсяг.** `lib/utils/battle/attack/{process/{run,compute},server-attack,ability}`, `attack-phase/{run-attack-phase,request}`, `damage/breakdown.ts`, `crit-choice/**`, `turn/{initiative,roll-initiative}`, `balance/hit-model.ts`, `flows/attack-flow.ts` (лише `fortune`), `lib/server/battles/mutations/{attack,crit-choice,initiative}`, `lib/constants/{critical-effects,save-critical-effects}.ts`, `systems/d20/rules/{attack,damage,initiative,balance}`, `systems/wfrp` (адаптація до `damage`, `input`).

**Задачі.**

1. `combat.resolveAttack` обов'язковий: `judgeD20`, `calculateAttackRoll`, перевага/перешкода, крит/провал, таблиці крит-ефектів, `critFlavor` → d20. `run.ts`: дія → тригер before → `resolveAttack` → miss/hit → consume. `abortedRoll` питає систему.
2. `combat.damage(ctx): DamageResult`: d20 — `critDoublesDice`, рядки розкладу; wfrp — наявний `mitigate`. Три core-місця `critDoublesDice(...) && !mitigateDamage` зникають.
3. `crit-choice`: каталог, gate, мутація → `D20_SERVER.battle["crit-choice"]` (стара реєстрація в `OPERATIONS` — до Ч11); `pendingCritChoice` у core — непрозоре `pending`.
4. `combat.initiative`, `tieBreak`, `hitModel` обов'язкові; фолбеки в `initiative.ts:30,52` і `hit-model.ts` видаляються.
5. `combat.input`: `request.fortune/fortuneRoll` → `request.system?: SystemSlot`, розбір — `SystemServer.schemas.attackInput`; `FortuneKind`, `combat.fortune` зникають із core-типів; стара форма запиту приймається один реліз (preprocess у схемі wfrp).
6. Тести атаки їдуть у `systems/d20/__tests__`; новий core-тест «конвеєр атаки з базою `d6pool`».

**Перевірка.** Чекліст; sweep; golden журнали (D11); `rules-section-readers.criticals` = 0 у core.

**Prod.** Немає. **Модель.** Sonnet. **Ревʼю.** Opus.

## Ч6. Бій d20 II: 0 HP, хід, дії, реакції

**Мета.** `consequences`, цикл ходу й каталог дій не знають рятунків від смерті, концентрації, дій 5e; шви `turn.*` і `afterAttack` готові для модулів.

**Обсяг.** `lib/utils/battle/{damage/consequences,common/action-flow,death-saves/**,concentration/**,saves/**,checks/**,proficiency/**,actions/**,turn/{advance-turn,run-advance-turn-loop,turn-start,turn-end,skipped-turn,join-triggers,berserk,round-start}}`, `lib/server/battles/mutations/{core-action,bonus-action,next-turn,conditions,system-condition,condition-test,add-participant}`, `systems/d20/rules/{death-saves,concentration,saves,actions,reactions,turn}`, `systems/wfrp` (хуки ходу).

**Задачі.**

1. `combat.onZeroHp` обов'язковий: `heroGoesDown`, `unitDiesAtZero`, `startDying`, `clearDeathSaves` → d20; `settleStatusChange` викликає лише хук. `combat.onDamaged` (список): `concentrationFallout` (d20), `loseChannelled` (wfrp).
2. `turn.*` — списки; core викликає `runTurnHooks(list, ctx)` (зупинка на `skipTurn`/`pending`). d20: кидок рятунку від смерті, тікери станів; wfrp: `conditions.turnStart` → `onTurnStart`, `skippedTurn` → `onSkippedTurn`, `traits.psychology` → `onJoin`. Виклик `applyPendingMoraleCheck` в `advance-turn` тимчасово стає першим елементом `beforeAdvance` у core-адаптері (до Ч8). Тести: порядок композиції; `skipTurn` обриває список; хук `d6pool-plus` виконується.
3. `combat.actions { catalog, available, run }`: `actions/{registry,availability,run,grapple,movement,legendary*,lair,effects}` → d20; wfrp — `noActions`.
4. `combat.reactions`: `actions/{opportunity,reaction}`, підготовлена атака → d20; `combat.afterAttack` заводиться з d20-хуком «спровокована нагода»; відсіч до Ч8 лишається core-викликом.
5. `saves/**`, `checks/**`, `proficiency/**` → `systems/d20/rules`; зони й ефекти core, що вимагають рятунку, звертаються через вузький інтерфейс `SaveRequest`, рішення приймає система.
6. Необов'язковий `rules?` у `roll-check`, `saves`, `conditions`, death saves зникає.

**Перевірка.** Чекліст; sweep (особливо `srd-5.2`); лічильники `deathSaves`, `concentration`, `conditions`, `saves`, `actions` (крім `actions.retaliation`) у core = 0.

**Prod.** Немає. **Модель.** Sonnet. **Ревʼю.** Opus.

## Ч7. Магія d20

**Мета.** Слоти, СК, апкаст, концентрація як прив'язка тривалості — у d20; `RuleSystemMagic` нейтральний.

**Обсяг.** `lib/utils/battle/spell/**`, `lib/server/battles/mutations/{spell,channel}/**`, `lib/utils/spells/{spell-slots,class-slots,slot-keys}.ts`, `lib/constants/spells.ts`, `systems/d20/rules/magic`, `systems/wfrp/rules/magic`.

**Задачі.**

1. `magic.resource { canCast, spend }`: d20 — слоти (включно з pact і грантами), wfrp — без ресурсу (`slots: false` зникає).
2. `magic.saveDc`, `magic.upcast` (d20); `outcome.ts`: спосіб розв'язання — дані заклинання, рятунок розв'язує система.
3. `magic.sustain { begin, drop }`: концентрація d20, прив'язка тривалості ефектів і предметів заклинання (форма `object.concentrationOf` не міняється).
4. `spell-slots.ts`, `class-slots.ts`, `slot-keys.ts`, бойова частина Arcane Recovery → d20. Модель заклинання лишається core.
5. Мутація `channel` → `WFRP_SERVER.battle.channel` (маршрут — Ч11).

**Перевірка.** Чекліст; sweep (режими `level5`, `system`); лічильник `concentration` = 0.

**Prod.** Немає. **Модель.** Sonnet. **Ревʼю.** Opus.

## Ч8. Модулі Heroes у бою

**Мета.** Мораль, відсіч, стеки й бойові частини масштабування героя та наборів — у власних модулях; кожен працює окремо: `dnd5e + morale` проходить sweep, пресет `homm` поводиться як до E2.

**Обсяг.** `lib/utils/battle/{morale/**,turn/{apply-pending-morale,pending-morale,advance-turn},attack/retaliation.ts,attack-phase/run-attack-phase.ts,participant/{from-character,from-unit,extract-*},artifact-sets/**,flows/turn-flow.ts}`, `lib/server/battles/mutations/{morale-check,scale-units,start}`, `lib/constants/{battle-units,battle-balance,dpr-by-main-skill}.ts`, `systems/{morale,retaliation,unitstacks,heroscaling,artifactsets}/{rules,server}`, `scripts/sim/battle-sweep/profiles`.

**Задачі (порядок: `morale` → `retaliation` → `unitstacks` → решта; кожен модуль — окремий коміт із тестом «модуль сам на базі d20»).**

0. Перед кодом (Opus, коротко): перевірити за кодом `morale/check.ts` і `constants/main-skills.ts`, що лідерство зводиться до ефекту/стата без імпорту `skilltrees` (spec 3.2); якщо ні — оформити як `requires` або винести в питання власнику.
1. `morale`: `turn.beforeAdvance += applyPendingMorale`, `turn.onTurnStart += moraleCheck`; `scene.pendingMoraleCheck` у core-типах → непрозоре `pending` (колонка та сама, D9); мутація → `MORALE_SERVER.battle["morale-check"]`; `participant.fromCharacter/fromUnit` читають колонку `morale`.
2. `retaliation`: `combat.afterAttack += retaliation` (`resolveRetaliation`, лічильники, прапорці з Ч4); `retaliate()` у `run-attack-phase` → загальний `runAfterAttack(hooks, ctx)`; пункт `actions.retaliation` читає лише модуль.
3. `unitstacks`: `participant.fromUnit` (кількість, `min/maxTargets`, `levelScaling`, СК за тіром), `combat.hitModel.damage` (claim), `scale-units` → `UNITSTACKS_SERVER.battle`. `battle-balance.ts`: параметри каркаса лишаються core, `HIT_RATE` стеків → модуль.
4. `heroscaling` (бойова частина): `participant.fromCharacter` — кубики героя за рівнем, множники; DPR за головною навичкою (`dpr-by-main-skill.ts`) — у `skilltrees`, якщо читає роль навички (уточнити за кодом).
5. `artifactsets`: `artifact-sets/**` бою → модуль (джерело вмінь уже з Ч4).
6. Core-будівники учасника лишають нейтральне (ідентичність, HP, атаки з рядків, ефекти, екіпірування); d20-частина (КБ, слоти, майстерність) → `D20.participant.*` у цій же частині.
7. `flows/turn-flow.ts`: `moraleOutcome` → `flow.system` (UI — Ч12).
8. Профіль sweep `srd-5.2+morale` (кампанія з `modules: ["morale"]`, цільовий сценарій перевірки моралі); тести матриці: кожен із п'яти модулів поодинці на d20 на рівні рушія (старт бою → хід → атака).

**Перевірка.** Чекліст; sweep усіх профілів; бій prodcopy з очікуваною перевіркою моралі (D9); лічильники `morale`, `heroScaling`, `actions` у core = 0.

**Prod.** Немає. **Модель.** Sonnet (задача 0 — Opus). **Ревʼю.** Opus.

## Ч9. Персонажі d20 (трек B)

**Мета.** Класи, рівні, HP, лист, форма, константи 5e — у `systems/d20`; прапорці `d20Stats` і `classes` видалено.

**Обсяг.** `lib/constants/{abilities,skills,classes,alignment,weapon-traits,monster,challenge,experience,rules,choices}.ts`, `types/{classes,backgrounds}.ts`, `lib/utils/characters/{classes/**,level-up,choices/{class-*,columns,wizard},resources/{hit-dice,arcane-recovery,battle,rest},form/**,generate/{abilities,archetype-class*},hero-hp,sheet/**,character-form}.ts`, `lib/server/characters/{class-level-up,apply-classes,core/{choices-handler,hit-die-handler,arcane-recovery-handler,load-race-progression,system-fields,create-character-schema,update-character-schema},operations/{level-up,hit-dice,arcane-recovery,choices,create,patch}}.ts`, `components/{characters/**,character-profile/**}` (d20-частини), `lib/hooks/characters/**`.

**Задачі (4 сесії: константи → сервер → лист/форма → UI).**

1. `lib/constants/stat-columns.ts` (core: імена шести колонок) + `systems/d20/constants/abilities.ts`. Core-імпортери `ABILITY_KEYS`, що лишились після переїзду (маппери сховища, імпорт), → `STAT_COLUMNS`.
2. `stats.columns` (список хуків): d20 — шість характеристик, КБ, швидкість, клас; wfrp — нейтральні значення. `FOREIGN_FIELDS`, `normalizeCharacterInput` зі `strength: 10 …` зникають. Тест D12: знімки аргументів Prisma `create/patch` до = після для `dnd5e`, `homm`, `wfrp`.
3. `progression.maxHp` без `null`: d20 — `classHp`; формула героя до Ч10 лишається приватним фолбеком у `systems/d20` (рядок у ratchet імен), `characterBaseHp` у core = виклик хука.
4. `sheet.blocks` (список): d20-блок (характеристики, майстерність, рятунки, навички, кубики хітів) → `systems/d20/rules/sheet`; `build-sheet.ts` збирає нейтральне + блоки композиції; `system?.key ?? "homm"` видаляється.
5. Операції `level-up`, `hit-dice`, `arcane-recovery`, `choices` → `D20_SERVER.operations`.
6. UI: `SystemUi.sheet.tabs`, `forms.{StatsFields, fields, DraftForm}`; 10 споживачів `d20Stats` і прапорця `classes` → слоти; прапорці видалити з типу й `FLAGS` контракту.
7. Види контенту `classes`, `backgrounds`: типи/схеми → d20; реєстрація виду — хвіст після Ч11.

**Перевірка.** Чекліст; `pnpm test:related` по `types/characters.ts` і `operations/{create,patch}.ts`; e2e персонажів; live-run листа й level-up (Sonnet-субагент, ДМ і гравець, 375 px).

**Prod.** Немає. **Модель.** Sonnet. **Ревʼю.** Opus.

## Ч10. Модулі Heroes у персонажах (трек B)

**Мета.** `heroscaling`, `skilltrees`, `artifactsets` мають повні шари персонажа; вимкнення й повторне вмикання модуля не губить дані (D16).

**Обсяг.** `lib/constants/{hero-scaling,hero-archetypes,main-skills,characters.ts (HERO_INITIATIVE)}`, `types/{main-skills,skill-tree,skills,artifact-sets}.ts`, `lib/schemas/{main-skills,skills,artifact-sets,prisma-json}.ts`, `lib/server/characters/core/{build-character-update-data,derive-character-defaults,get-progression-handler,load-progression-context,progression-action-handler}.ts`, `lib/utils/spells/spell-learning-*.ts`, `components/character-profile/{SkillsTab,SetList,…}`, `lib/hooks/{skills,main-skills,skill-trees}/**`, `systems/{heroscaling,skilltrees,artifactsets,homm}/**`.

**Задачі.**

1. `heroscaling`: claim `progression.maxHp` (є класи → `prev`, інакше формула героя); `stats.columns += archetype, множники`; архетипи, `hero-scaling.ts`; фолбек із Ч9 видаляється; `HERO_INITIATIVE` → типові значення пресета `homm` (`rules-preset.ts`).
2. `skilltrees`: прогресія дерева (`skillTreeProgress`, `tableSlots`, level-gain) → `SKILLTREES_SERVER.operations`; вивчення заклинань зі шкіл дерева; `stats.columns += personalSkillId`; форма `skillTrees` пакета → вид модуля.
3. `artifactsets`: список наборів на листі, схеми/типи.
4. UI: `sheet.tabs += дерево навичок`, `forms.fields += архетип`, `SetList` — у списки відповідних модулів.
5. Види контенту `main-skills`, `skills`, `skillTrees` (`skilltrees`), `artifact-sets` (`artifactsets`): схеми/типи → модулі; реєстрація — хвіст після Ч11.
6. Тести D16 для трьох модулів: вимкнув → рядки, колонки, секції на місці → увімкнув → лист той самий.

**Перевірка.** Чекліст; D12-тест для `homm`; `pnpm template import heroes-homm --dry-run` на prodcopy = 0/0/0; live-run листа героя HOMM5 на prodcopy.

**Prod.** Немає. **Модель.** Sonnet. **Ревʼю.** Opus.

## Ч11. Види контенту й маршрути від модулів (трек C)

**Мета.** `system-imports-exempt.json` порожній: системні дії йдуть через три загальні маршрути, види контенту реєструють бази й модулі.

**Обсяг.** `app/api/campaigns/[id]/{system/[action],characters/[characterId]/system/[action],battles/[battleId]/system/[action]}/route.ts`, видалення 12 route-файлів і боєвих `channel`, `condition-test`, `system-condition`, `morale-check`, `crit-choice`, `scale-units`, `bonus-action`, `core-action`, `lib/api/system.ts`, `lib/hooks/system/**`, `lib/server/systems/{types,registry,routes}.ts`, `lib/constants/content-kinds.ts`, `lib/server/content/**`, `lib/utils/content/import/fields/**`, `lib/schemas/careers.ts`, `types/careers.ts`, `lib/server/{races/profile-usage,templates/sync/profile-refs}.ts`, `app/campaigns/[id]/dm/**` → `dm/system/[section]`, `next.config`, OpenAPI, `lib/ai/tools`, `lib/server/assistant/actions/character-coverage.ts`.

**Задачі.**

1. `SystemRoute`, диспетчер `runSystemRoute(scope, action, req, params)`: сесія → правила → зібраний `systemServerOf` → `access` → `parseBody` → `handle`. Тести: невідома дія 404; дія вимкненого модуля 404; `access: "dm"` для гравця 403; колізія дій двох модулів — помилка композиції.
2. Боєвий маршрут: `SystemServer.battle[action]` → `runBattleMutation`.
3. Перенести обробники: wfrp (12 файлів + `channel`, `condition-test`, `system-condition`), d20 (`crit-choice`, `core-action`, `bonus-action`), `morale` (`morale-check`), `unitstacks` (`scale-units`). Обгортки `lib/api/*` → теки власників через `systemAction`.
4. `ContentKindDef { kind, table, schema, importFields, profile?, dmPage }`; core = `units, races, feats, spells, spell-groups, artifacts, tracks`; `contentKindsOf(composition)`; `careers` → wfrp; `classes`, `backgrounds` → d20; `main-skills`, `skills` → `skilltrees`; `artifact-sets` → `artifactsets`. `ContentKind` = `string` із перевіркою реєстром; `import-aliases.ts` → `importFields` виду.
5. Сторінки ДМ: `dm/system/[section]/page.tsx` рендерить `systemUiOf(rules).dmPages[section]`; меню — з `dmSections` активних модулів; старі шляхи — `redirects`.
6. Старі API-шляхи — `rewrites` на один реліз; OpenAPI з `SystemServer`; AI-інструменти й MCP; `character-coverage`.
7. `system-ratchet.ts --write` → `system-imports-exempt.json` = `[]`.

**Перевірка.** Чекліст; `pnpm template import <key> --dry-run` × 5 на prodcopy = 0/0/0 (D14); звіт «рядки видів поза композицією» (D15); e2e wfrp, `wfrp-import-cycle.test.ts`; live-run: кар'єра, порча, простій, чернетка wfrp, crit-choice, мораль; sweep (профілі — на нові URL).

**Prod.** Без запису. Після деплою перевірити rewrites зі старої вкладки. **Модель.** Sonnet. **Ревʼю.** Opus.

## Ч12. UI бою і клієнтські flow

**Мета.** `components/battle` і `lib/hooks/battle` показують КБ, слоти, концентрацію, рятунки від смерті, мораль лише через `SystemUi.battle`; flow нейтральні; закрито M4.

**Обсяг.** `components/battle/**` (MIXED/D20/HOMM за класифікацією), `lib/hooks/battle/**`, `lib/utils/battle/{flows/**,store/**,view/**,client/**,pipeline/client-delta.ts}`, `types/battle.ts` (типи view), `components/systems/types.ts`, `systems/*/ui/battle`.

**Задачі.**

1. `SystemUi.battle` обов'язковий: `HeroPanel`, `ParticipantStats` (база) + списки `panels`, `dialogs`, `badges`, `notices` (база й модулі). d20: КБ/слоти/концентрація/рятунки від смерті/легендарні дії/крит-вибір; `morale`: індикатор і діалог перевірки; `retaliation`: позначка відсічі; `unitstacks`: кількість у стеку, `scale-units`; wfrp: наявні слоти під нові імена.
2. Flow: `attack-flow` (`fortune` → `system?: SystemSlot`), `turn-flow` (`moraleOutcome` → `system`), `store/types.ts` без системних полів. Тести reducer-ів із фікстурним слотом.
3. `view/**`: d20-поля view формують внески UI.
4. M4: `client-delta.ts` шле `scene.system` лише при зміні, `null` = очищення; клієнт приймає обидві форми (D10).
5. i18n: боєві тексти модулів — через `meta.i18n.battle` з бюджетом у `scope-size`; тексти вимкненого модуля не вантажаться.

**Перевірка.** Чекліст; sweep; `scope-size`; live-run (Sonnet-субагент, JS/текстові перевірки): `srd-5.2`, `heroes-homm`, `grim-d100`, `srd-5.2+morale` × ДМ і гравець × desktop і 375 px; тестові бої видалити.

**Prod.** Немає. **Модель.** Sonnet. **Ревʼю.** Opus.

## Ч14. Дані II: лічильники wfrp у слот (D7)

**Мета.** `battleData.{fortune,channelledSl,sin,conditionTests,psychologyTested}` → `battleData.system` (слот `wfrp`).

**Обсяг.** `types/battle.ts` (~560–580), `lib/utils/battle/store/types.ts`, `systems/wfrp/rules/{slots.ts,combat,magic,conditions,traits}`, `lib/utils/battle/participant/**`, `scripts/db/{active-battles-report,battle-state-downgrade}.ts`.

**Задачі.**

1. `PARTICIPANT_STATE = defineSlot("wfrp", parse)`; `readState(p)`: слот, інакше старі поля; запис — лише слот; старі поля `@deprecated` до Ч17. Тести: старий знімок читається; після першої мутації знімок у новій формі, `snapshotHash` узгоджений; rollback бою зі старим знімком працює.
2. Редакція для гравців, AI-проєкції, профіль sweep Grim — на слот.
3. `active-battles-report` (read-only: активні бої за кампанією, системою й формою знімка); `battle-state-downgrade` (слот → старі поля для активних боїв; dry-run/apply).

**Перевірка.** Чекліст; sweep; репетиція відкату на prodcopy: бій у новій формі → downgrade → старий код читає.

**Prod.** Деплой **лише коли в єдиній активній кампанії немає активного бою** (`active-battles-report` на prod, читання — за «так»); сам деплой — окреме «так»; за потреби відкату — `battle-state-downgrade --apply` за ще одним «так». **Модель.** Sonnet. **Ревʼю.** Opus.

## Ч16. Шов створення режиму

**Мета.** Набір модулів можна змінити в кампанії й задати при створенні без шаблону; повний екран-майстер — поза E2.

**Обсяг.** `lib/utils/rules/systems/catalog.ts`, `lib/server/campaigns/**` (створення, патч правил), `lib/schemas/campaigns.ts`, `lib/api/campaigns.ts`, `lib/hooks/campaigns/**`, `components/rules/sections/SystemSection.tsx`, `lib/constants/api-errors.ts`, `messages/*/gameTerms.json`, `lib/onboarding/whats-new.ts`, `messages/*/whatsNew.json`, OpenAPI, AI-інструмент правил.

**Задачі.**

1. `moduleCatalog()` (клієнтобезпечний, з meta): бази, модулі, пресети, `requires`, `conflicts`, `toggle`, ключі текстів. Тест: каталог = теки `systems/*`.
2. Патч правил приймає `system.modules`: `validateComposition` → 422 з `issues` за шляхами; активний бій → 409 `SYSTEM_MODULES_IN_BATTLE`; модуль `toggle: "setup"` при наявних персонажах без `confirm: true` → 409 `SYSTEM_MODULE_CONFIRM`. Після зміни — інвалідація кешу композиції, `rules.get` повертає `modules` і каталог.
3. Створення кампанії без шаблону: `system: { key, modules? }` → правила = типові значення секцій композиції (+ `rules-preset` пресета).
4. UI: у секції «Система» — список модулів із перемикачами, залежності й конфлікти вимикають недоступні пункти, підтвердження для `setup`. Гравці списку не редагують.
5. Маніфест пакета: необов'язкове `modules`; `template validate` звіряє `kinds` із композицією.
6. Запис у `whats-new` + ключі в обох `messages/*/whatsNew.json`; розділ у help (`dm-rule-systems`).

**Тест-кейси.** `dnd5e` → увімкнути `morale` → секція й дії доступні → бій із перевіркою моралі → вимкнути поза боєм → секція зникла, JSON її зберіг (D16); спроба `unitstacks` + вигаданий конфліктний модуль фікстури → 422.

**Перевірка.** Чекліст; sweep `srd-5.2+morale`; live-run: створення кампанії з набором модулів через API-хук і перемикання в правилах (ДМ, desktop і 375 px).

**Prod.** Перший шлях запису `modules` користувачем: після деплою поріг відкату коду — Ч1 (D3). **Модель.** Sonnet. **Ревʼю.** Opus.

## Ч15. Дані III: стан d20 і модулів у слот учасника (D8)

**Мета.** `battleData.{deathSaves,inspiration,inspirationSpent,attackedWithLight}` → слот `d20`; лічильники відсічі й стан моралі — у `ext[module]`.

**Обсяг.** `types/battle.ts`, `systems/d20/rules/slots.ts`, `systems/{retaliation,morale}/rules/slots.ts`, читачі в `systems/**` (після Ч6/Ч8 усі читачі вже в модулях), `lib/server/battles/**` (повернення в лист → `participant.persist`), скрипти з Ч14.

**Задачі.**

1. `D20_STATE = defineSlot("d20", …)`; `RETALIATION_STATE = D20_STATE.extend("retaliation", …)`, так само `morale`; dual-read як у Ч14.
2. `participant.persist` (список): що з бою повертається в лист (натхнення, слоти) — замість прямих читань `battleData` у `complete`.
3. Тести: старий знімок HOMM5 (golden з prodcopy) → мутація → нова форма → результат бою той самий; дані `ext` вимкненого модуля зберігаються; `battle-state-downgrade` повертає стару форму.
4. Core-тип `BattleParticipantBattleData`: лише нейтральні поля + `system?: SystemSlot`; старі — `@deprecated` до Ч17.

**Перевірка.** Чекліст; sweep усіх профілів; репетиція відкату на prodcopy; гард spec 3.4.

**Prod.** Окремий деплой, **лише коли в єдиній активній кампанії немає активного бою** (звіт на prod — за «так»), деплой — окреме «так»; відкат — `battle-state-downgrade --apply` за окремим «так». Після деплою — тиждень спостереження до чистки в Ч17. **Модель.** Sonnet. **Ревʼю.** Opus.

## Ч17. Фінал

**Мета.** Критерії готовності spec розд. 1 виконано й закріплено тестами; документація відповідає коду.

**Задачі.**

1. Нулі (включно з хвостами Ч3: `ruleset-section` і записом `defaults.ts` у `system-imports-exempt.json`, `formulas.ts` розкладено за власниками): `rules-section-readers` = 0 → видалити `legacy-sections.ts`; «імена-протікання» = 0; пресет `homm` отримує `tokens: ["homm"]`; перегенерувати `system-literals-exempt.json` і звірити з критерієм 2.
2. Чистка dual-read (не раніше ніж через реліз після Ч14/Ч15 і при 0 знімків старої форми в `active-battles-report`): `@deprecated` поля, старий розбір `fortune`, `rewrites`/`redirects`, скрипт downgrade.
3. `lib/__tests__/d6pool-battle.test.ts`: база-фікстура проводить старт → атака → 0 HP → наступний хід; граф імпортів тесту без `systems/*`.
4. Гард spec 3.4: доступи core до колонок статблока у правилах = 0 поза будівниками й мапперами.
5. Документи: переписати `docs/architecture/rule-systems.md` (база/модуль/пресет, маніфест, порядок композиції, таблиця слотів, «Як додати модуль» і «Як додати базу»), оновити `battle.md`, `abilities.md`, `content-api.md`; `CLAUDE.md`: пункт 6 layering і правило Rule systems; `docs/STATUS.md`: закрити «Борги E2», лишити Minor 13, M5, борги БД.
6. `git mv` spec і плану в `docs/archive/superpowers/` у merge-коміті.
7. Повний прогін: `pnpm test:run`, repo-wide `pnpm lint` (один раз, без іншого важкого процесу), `pnpm build`, sweep усіх профілів.

**Prod.** Деплой за «так»; після нього — ручна перевірка активної кампанії (вхід, лист, відкриття бою). **Модель.** Sonnet. **Ревʼю.** Opus по diff + Fable — фінальне архітектурне ревʼю всього E2.

---

## Що свідомо не входить у план

Повний екран «зібрати режим», розбиття бази d20 на модулі, нейтральна база як продукт, модулі Heroes на базі wfrp, Minor 13, M5, DROP боргів БД, перенесення статблока з колонок, E3 (spec розд. 9). Якщо під час виконання знадобиться міграція Prisma — зупинка й окреме рішення власника (expand-only, RLS).
