# i18n: частина 7 — закрити переклади повністю

Гілка `feat/i18n-part7` (worktree `../dnd-tracker-t7`) від `origin/main` `016374d98`. Базові правила — `docs/architecture/i18n.md`; попередні частини — `docs/archive/superpowers/{specs,plans}/*i18n-part{1..6}*`; ядро — `docs/superpowers/specs/2026-10-28-i18n-core-design.md` (переїжджає в архів разом із цією частиною).

## Мета і межі

**Мета:** після ч.7 платформа повністю перекладена (uk/en), без відкладених хвостів ч.0–6. Таблиця «Відкладено» в `i18n.md`/`STATUS.md` порожня, або кожен рядок має причину «контент/дані».

**Входить:**
1. Лог бою: fallback-текст у `resultText` для відкату деплою (рішення а).
2. Вимірювання розміру логу на prodcopy і, якщо потрібно, стискання (рішення б).
3. Кеш `info-reference` тримає структуру, а не uk-рядки (рішення в). Так само для інших скінченних uk-рядків, що пишуться в БД, знімки чи кеш.
4. `User.timeZone`: поле, API, вибір у налаштуваннях і порядок «профіль → cookie → UTC» (рішення г).
5. Решта хвостів ч.1–6, звірених із кодом (таблиця нижче).
6. `i18n-exempt.json` з обґрунтуваннями, статичні перевірки перекладів, браузерний прогін uk/en, фінальна верифікація.

**Не входить:**
- Імпортований контент компендіуму (5etools/homebrew: назви й описи). Він лишається мовою джерела (memory `feedback-imported-content-untranslated`).
- Вміст, який написав користувач: сценарій, показ, нотатки, назви сутностей, відповіді моделі.
- Старі рядки БД. Вони показуються як є, бекфілу немає.

**Успіх:**
- З `NEXT_LOCALE=en` у DOM жодного екрана з прогону немає кирилиці поза контентом; з `uk` немає англійських UI-літералів.
- Лог старих подій читається на старому коді після відкату.
- Розмір логу ≤ +30 % (метрика нижче).
- `i18n-exempt.json` має лише обґрунтовані записи.
- Повні `test:run`, `tsc` і `lint` зелені.

## Звірка відкладених хвостів із кодом (стан на `016374d98`)

| Хвіст | Стан | Дія в ч.7 |
|---|---|---|
| ч.1 safe-fetch status suffix | `lib/utils/api/safe-fetch.ts` кидає лише ключі `API_ERRORS.SAFE_FETCH_*`, суфікса статусу немає | закрито, лише перевірка тестом (є `safe-fetch.test.ts`) |
| ч.1 HtmlLang lock, useSetLocale PUT-fail, cookie `secure`, мова до входу, `auth` у root | зроблено:<br>• `html-lang.tsx` зі стеком і тестами;<br>• `.catch(writeLocaleCookie)` з тестом;<br>• `isSecureRequest`;<br>• `syncUserLocale` викликають `auth/callback` і GET `/api/locale`, а вхід email/паролем — через `useEmailAuth` → `localeApi.get()`;<br>• `auth` вантажать лише `(auth)` і `settings` | закрито; в `i18n.md` дописати шлях email-входу |
| ч.1 скрипти з сирими ключами | `battle-sweep`/`simulate-battle` друкують лог через `resultTextOf`, а тіла помилок сервер перекладає `uk` (скрипт без cookie). Сирих ключів не знайдено | закрито |
| ч.3–4 `DeleteAllButton noun`, `NameOnlyCreateDialog`, дублі `cancel/save` | зроблено:<br>• `noun` — перекладений рядок;<br>• `NameOnlyCreateDialog` у класах/рисах/передісторіях;<br>• справжні дублі `cancel/save` майже зникли: лишився 1 `show:conflict.cancel`, решта ≈180 листків `add/confirm/loading…` — контекстні підписи | закрито. `show:conflict.cancel` → `common.actions.cancel`, якщо значення однакове. `NewDeckDialog`/`AddBranchSheet` → `NameOnlyCreateDialog`, якщо вони справді лише з назвою (T9) |
| ч.5 коди воркера компендіуму | `INVALID_TEXT` у `COMPENDIUM_ERROR_KEYS`. Fallback воркера `INVALID_JSON_UTF8` (`file.worker.ts:9`) і `INVALID_JSON` з `onerror` у мапі відсутні → `errors.unknownCode` із сирим кодом | T9 |
| ч.6 slides deck-store params | `deck-store.ts:64` дає `{index, detail: <ключ>}`, `translateErrorBody` перекладає вкладений ключ (є тест) | закрито |
| ч.4 `common` 12,6 KB | `gameTerms` винесено в ч.5; зараз gzip `common` uk 2,6 / en 1,9 KB | закрито, бюджет root-чанка тестом (T9) |
| ч.5 коди воркера, en-регекси рас, мова REST-Bearer, `feature-resolution`/`subraces` | виправлено в `e098b35e4`: `names.ts` перевіряє uk- і en-регекси, `getRequestLocale` бере Bearer → профільну мову власника, `subraces`/`feature-resolution` — через `ctx.t` | лише документація (STATUS застарів) і перевірка в прогоні |
| ч.5 контент генератора героя | `*.uk.ts`/`*.en.ts` таблиці; кирилиця лише в `names.uk.ts`, `backstory.uk.ts` | звузити exempt до `lib/utils/characters/generate/*.uk.ts` |
| ч.6 `spell-patterns/*` пишуть uk-тексти в БД | `SpellPatternInput` без `t`, хоча `deriveSpell` має `derivedTranslator` | T5 |
| ч.6 запасні назви inline-тайла (`g.key`) і auto-reaction (`spellId`) | відкрито | T6 |
| ч.6 `logText` (`applied`/`grantAction`) — вбудований uk-фрагмент у лозі | відкрито | T6 |
| ч.2 `whatsNew` у статичному бандлі | gzip uk 5,8 / en 4,6 KB; більший за `common`, і росте з кожним записом (38 записів) | T9 (обрізання) |
| ч.6 `info-reference`, `User.timeZone`, відкат логу, розмір логу | відкрито | T1–T4 |
| Згадки `i18n-migrated.json` | у `i18n.md` лише як історія («замість …»). Ще трапляються в активних планах `docs/superpowers/plans/2026-10-28-{acquaintances-part-a,notifications-part-b}.md` і в спеку ядра | T11: спек ядра переїжджає в архів, в активних планах — примітка або архів (фічі змерджені) |

Звірку робили grep-ом. Виконавець кожної задачі спершу перевіряє «відкрито/закрито» у своєму скоупі і пише результат у звіт.

## Reuse

| Існує | Використання |
|---|---|
| `formatBattleLog(t, action)` (`lib/utils/battle/log/lines.ts`), `getTranslator(locale)` | рендер fallback-тексту з `details.log` |
| `scripts/sim/log-text.ts` (`resultTextOf`, uk-перекладач для скриптів) | вимірювання логу, uk-рендер для скриптів |
| `scripts/sim/battle-sweep.ts --keep-battles`, `scripts/db/prodcopy-db.sh` | джерело подій для вимірювання |
| `useSpellLabels` (`lib/hooks/spells/useSpellLabels.ts`: `targeting`/`resolution`/`cost` зі структури), `targetingLabel(): TextRef` | показ фасетів заклинань у довіднику замість uk-рядків з кешу |
| `derivedTranslator(locale)` (`lib/server/compendium-import/derived-text.ts`), `ctx.t` в адаптерах | тексти `spell-patterns` |
| `TextRef`/`textRef`/`useText`/`formatText`, `Segment`/`renderSegment` | ключі замість uk-рядків у знімках і лозі |
| `getRequestLocale`, `/api/locale` (GET/PUT), `localeApi`, `useSetLocale`, `syncUserLocale`, `isSecureRequest`, `setLocaleCookie` | ендпоінт і хук часового поясу, перенесення вибору в профіль |
| `isTimeZone`/`resolveTimeZone` (`lib/i18n/time-zone.ts`), `getRequestTimeZone`, `useSyncTimeZoneCookie`/`useBrowserTimeZone` | порядок «профіль → cookie → UTC», варіант «Автоматично» |
| `LocaleSwitcher`, `app/settings/layout.tsx` (`LocaleScope`), посилання з `Header` на `/settings/{password,ai}` | нова сторінка налаштувань «Мова і час» |
| `parity.test.ts`, `scope-size.test.ts`, `label-keys-*`, `eslint/__tests__/cyrillic-rule.test.ts`, `renderWithIntl`, `makeT` | статичні перевірки DoD (2) |
| `WHATS_NEW` + `messages/*/whatsNew.json`, `loadStaticMessages` | запис про часовий пояс, обрізання бандла |

**Нове** (обґрунтування):
- `renderLogFallback` у збереженні бою. Межі запису з доступом до мови ще немає.
- `scripts/sim/log-size.ts`. Метрики розміру логу ще немає.
- Сторінка `app/settings/preferences`. Мова зараз є лише в `Header`/`AuthCard`, сторінки налаштувань для неї немає.
- `lib/i18n/__tests__/untranslated.test.ts`. Перевірки «en-значення з кирилицею / uk-значення англійською» ще немає.

## Рішення

### 1. Fallback-текст логу для відкату (а)

- **Джерело правди не змінюється.** Події пишуть `details.log: LogLine[]`, а новий код читає лише його. `actionLines`, `formatBattleLog`, `logParts` і `getLogEntryDetailItems` уже беруть `log`, коли він є.
- **Де рендерити.** `logFields`/`withLines`/`withPrefix` і рушій працюють без мови, і так лишається. Мова потрібна лише на межі запису: `prepareSave` у `lib/utils/battle/store/save-battle.ts` (єдине місце `battleEvent.createMany`). Для рядка `StoredBattleEvent` з `details.log` вона пише `resultText = formatBattleLog(t, { log, resultText: "" })` (роздільник `" | "`), бо старий код розбирає рядок через `legacyLines` за `" | "`.
- **Мова.** Мова запиту, що мутує (ДМ або гравець):
  - `runBattleMutation`: `getRequestLocale()` на старті, ще в контексті запиту.
  - `executeBattleOperation`: `caller.locale` асистента.
  - Скрипти й тести: `DEFAULT_LOCALE`.
- **Передача.** Мова передається параметром до `deps.saveBattle`. Нічого не читається з контексту всередині пайплайна, бо асистент виконує операцію поза запитом.
  ```ts
  // lib/utils/battle/pipeline/run-battle-mutation.ts
  saveBattle(before: LoadedBattle, outcome: BattleMutationOutcome, write?: { logLocale: Locale }): Promise<BattleDelta>;
  runGuardedBattleOperationCore(userId, raw, expectedVersion, options, deps, write?: { logLocale: Locale })
  // lib/utils/battle/store/save-battle.ts
  prepareSave(before, outcome, logText?: (log: LogLine[]) => string): PreparedSave   // pure; saveBattle loads getTranslator(locale) once
  ```
  Без `write` (старі виклики, скрипти) діє `DEFAULT_LOCALE`. `getTranslator` вантажить JSON один раз на процес (кеш `localSource`). Рендер — синхронний `formatText` на подію.
- **Egress.** Клієнту fallback не потрібен. `eventToBattleAction` (одна точка для дельти, історії та `loadRecentEvents`) віддає `resultText: d.log ? "" : e.resultText`. Відповідь і Pusher не ростуть.
- **Витік даних гравцям.** `sanitizeLogEntry` прибирає `targetAC`/`damageBreakdown`/`damageRows` з `actionDetails`, а не з тексту. Fallback — це рендер тих самих `log`-рядків, які гравець уже отримує. Старий код до ч.6 показував гравцям той самий `resultText`. Нових даних гравець не бачить, бо поле на клієнт не йде (`eventToBattleAction`). Тест: дельта для гравця не містить `resultText` події з `log`.
- **Що буде після відкату.**
  - Код до ч.6 показує fallback, тобто текст мовою ДМ-автора. Uk-регекси старого розбору («Тригери …», `damageBreakdown`) на en-тексті не спрацюють, і рядок покажеться цілим заголовком. Це прийнятно.
  - Код ч.6 (з `log`) працює як зараз.
  - Події, записані між деплоєм ч.6 і ч.7 (з `resultText=""`), лишаються порожніми на старому коді. Бекфілу немає: це події кількох днів, і на новому коді вони показуються з `log`.
- **Тимчасовість.** Константа `BATTLE_LOG_TEXT_FALLBACK = true` (`lib/constants/battle.ts`) вмикає запис fallback. Пункт у STATUS: вимкнути, коли відкат за ч.7 уже неактуальний. Розмір рядка БД тоді повертається до `log`.

### 2. Розмір логу (б)

- **Метрика M1 (основна, гейт ≤ 1,30).** Σ байтів `JSON.stringify(details.log)` / Σ байтів uk-рендеру того ж `log` (= що записав би старий код у `resultText`), UTF-8, по всіх подіях з `log` прогону. M1 = те, що йде клієнту і в jsonb.
- **Метрика M2 (довідкова).** `(log + fallback) / fallback` — ріст рядка БД, поки ввімкнено `BATTLE_LOG_TEXT_FALLBACK`. Окремо — топ-10 ключів за внеском у байти і медіана/p95 за `type`.
- **Інструмент.** `scripts/sim/log-size.ts --battles <ids|--since ISO>` читає `battle_events` з prodcopy (бої `battle-sweep --keep-battles`), рендерить через `resultTextOf`, друкує M1/M2 і таблиці, потім видаляє бої з `--cleanup`.
- **Якщо M1 > 1,30**, скорочення по черзі з повторним виміром після кожного кроку:
  1. Прибрати порожні/дефолтні `params` і дублікати (`actorName`, що вже є в події).
  2. Числа як числа, без `String()`.
  3. Плоскі ключі для частих рядків замість вкладених `$join`/`$capitalize`.
  4. Кодек збереженого вигляду: `{m, p}` замість `{message, params}` і префікс-аліаси ns (`abilityText.log.` → `a:`) у `lib/utils/battle/log/codec.ts`. Кодується в `prepareSave`, декодується в `eventToBattleAction` і на клієнті перед `apply-delta`.

  Крок 4 робиться лише якщо 1–3 не вистачило. Він змінює формат даних, тому legacy-декодер приймає обидва вигляди.

### 3. Скінченні uk-рядки в БД, знімках і кеші (в)

**Правило.**
- Система генерує текст, який не належить користувачеві, і показує його щоразу: зберігати ключ або структуру, перекладати на показі.
- Текст стає контентом, який користувач редагує: писати мовою автора на момент створення (`getTranslator(locale)` у маршруті, `useTranslations` у формі), як назви за замовчуванням у ч.5.
- Дані для зіставлення імпорту: лишаються, з обґрунтуванням.

**Інвентар** (звірено grep-ом по 45 `eslint-disable no-restricted-syntax`):

| Місце | Рішення |
|---|---|
| `lib/cache/info-reference.ts` + `lib/utils/spells/model/labels.ts` (`targetingFacetLabel`/`resolutionLabel`/`costLabel`), `lib/constants/spells.ts:43` (`SPELL_COST_LABELS`…) | кеш тримає `targeting`/`resolution`/`cost` (структуру) + `facetKey` (стабільний id для фільтра); показ — `useSpellLabels`; ключ кешу `info-reference-v6`; рядкові `*Label` і uk-константи видалити, якщо інших споживачів нема |
| `SYSTEM_ACTOR.actorName` «Система» (`lib/constants/battle.ts:47`), `DM_ACTOR` | пишеться порожнім, `LogEntryCard` показує `t(actorId)` для `SYSTEM_ACTOR.actorId`/`DM_ACTOR.actorId`; старі рядки «Система»/«ДМ» — за `actorId` теж ключ |
| `DEFAULT_HAZARD_LABEL` (`battle.ts:124`), `DEFAULT_THREAD_TITLE` (`ai.ts:122`) | не писати дефолт: `label` порожній / `title: null`; показ уже має fallback `t(...)` (`MapLayers`), для тредів додати; порівняння автотитулу — за `null` або старим рядком |
| `critical-effects.ts`, `save-critical-effects.ts`, `conditions/registry.ts` (name/description копіюються в `activeEffects`) | UI читає ключі; перевірити, що жоден компонент не рендерить `activeEffects[].name/description` сиро (grep + тест); якщо рендерить — показ за `critId`/`conditionId`; копію лишити як дані для старого коду з обґрунтуванням |
| `characters/resources/battle.ts:35` (джерело «Виснаження»), `classes/armor-class.ts:56`, `choices/selections.ts:62,231`, `units/monster.ts:37,48`, `constants/monster.ts` (рантайм-похідні назви/описи здібностей) | `Segment`/`TextRef` замість рядка (рендер через `useAbilityText`/`useText`); для полів, що потрапляють у знімок учасника як `name: string` — `LogLine` або ключ + `params` |
| `rules/defaults.ts:9` (назви атак за замовчуванням), `battle/store/persist-xp.ts:14` (нотатка журналу), `participant/extract-attacks.ts:122` («Зброя»), `PerformSection.tsx` / `abilities/editor.ts` (нотатки), `hero-archetypes.ts` `className`, `skills/progression/types.ts:13` («Раса»), `constants/spells.ts:10` (назви груп кіл) | мовою автора при створенні; `spellLevelFromName` і `RACIAL_BRANCH_NAME`-порівняння розпізнають обидві мови (або порівнюються за id/рівнем, не назвою) |
| `rules/registry.ts:1` (назви для source-sync) | `syncResponse` отримує `locale` маршруту |
| `constants/skills.ts` `DND_SKILL_META.label` | аркуш показує через `gameTerms.dndSkills`; поле label видалити або лишити дані з обґрунтуванням |
| `constants/{abilities,artifacts,choices,classes,main-skills,ungrouped}.ts`, `units/unit-parsing.ts`, `types/import.ts`, `audio/playlist-groups.ts`, `compendium-import/.../spell-patterns/*` регекси, `LocaleSwitcher` | лишаються (дані зіставлення/контент/назва мови) з однорядковою причиною |

### 4. Часовий пояс користувача (г)

- **Схема.** `User.timeZone String?`, міграція `20261117000000_user_time_zone`: `ALTER TABLE "users" ADD COLUMN "time_zone" TEXT;`. Вона expand-only, нова таблиця не потрібна, тож RLS не стосується. `null` означає «Автоматично» (зона браузера).
- **Сервер.** `getRequestTimeZone()`: профільна зона (якщо валідна) → cookie `TZ` → `"UTC"`.
  - Профіль читається через `getSessionUserId()` і `prisma.user.findUnique({ select: { timeZone: true } })` у React `cache()`, тож це один PK-запит на запит. Його ділять `request.ts` і `LocaleScope`.
  - Гість — без запиту.
  - Root layout і далі не читає cookies/headers.
  - `APP_TIME_ZONE` (`Europe/Kyiv`) лишається лише там, де не йдеться про показ користувачеві, або видаляється (виконавець перевіряє споживачів).
- **API.** Розширити `/api/locale`. Окремий ендпоінт не потрібен, бо це ті самі «налаштування мови».
  - `GET` → `{ locale, timeZone }`.
  - `PUT` приймає `{ locale?: Locale; timeZone?: string | null }` (хоча б одне поле; `timeZone` — `isTimeZone` або `null`).
  - Для гостя `PUT` з `timeZone` лише відповідає 200, бо cookie `TZ` і так пише клієнт.
  - `localeSchema` у `lib/schemas/locale.ts`.
  - `localeApi.set` приймає частковий об'єкт.
  - Хук `useTimeZoneSetting()` у `lib/hooks/common`: `{ timeZone: string | null; browserZone: string; set(next) }`, після збереження `router.refresh()`.
- **UI.** `app/settings/preferences/{page,page-client}.tsx` — «Мова і час»:
  - мова: `LocaleSwitcher`/`useSetLocale`;
  - часовий пояс: select «Автоматично (<зона браузера>)» + `Intl.supportedValuesOf("timeZone")`, згруповано за регіоном, з пошуком;
  - посилання з меню `Header` поруч із «Пароль»/«AI»;
  - ns `auth.settings.preferences.*`, бо `settings` уже вантажить `auth`.
- **Клієнт.**
  - `useSyncTimeZoneCookie` не змінюється: cookie потрібна гостям і як fallback.
  - `ClientLocaleProvider` (root-chrome) і далі бере зону браузера. Профільну зону root-chrome не знає, але відносні дати («5 хв тому») від зони не залежать. Прийнятне обмеження, пишеться в `i18n.md`.
- **What's new.** Запис `2026-10-30-time-zone` (`audience: "all"`, `href: "/settings/preferences"`) + `whatsNew.<id>` в обох мовах.
- **Тести.**
  - `getRequestTimeZone`: профіль > cookie > UTC; невалідний профіль → cookie.
  - `/api/locale`: GET/PUT `timeZone`, 400 на невалідну зону, гість.
  - Формат дат у двох поясах: `renderWithIntl` з `timeZone: "Europe/Kyiv"` і `"America/New_York"` для одного компонента з `useFormatter` (напр. `TravelLog` або `CharacterLogTab`). Та сама мить дає різну годину/дату.

### 5. Решта рішень

- **`spell-patterns`.** `SpellPatternInput.t: Translator` передається з `spell-derive.ts`. Літерали переходять у `compendiumReport.derived.spell.*` (локаль імпортера). Регекси за англійським текстом джерела — дані.
- **`logText` (`applied`/`grantAction`).** Замість синхронного uk-рендеру сегментів у рядок лог отримує параметр-`TextRef`, тобто `$join` сегментів. `formatText` перекладає вкладені refs. Синхронний `logText` видаляється.
- **Inline-тайл / auto-reaction.** Зараз запасні назви такі:
  - `lib/utils/battle/flows/spell-grants.ts:162`: `g.label ?? host?.name ?? g.key`;
  - `lib/utils/battle/spell/auto-reaction.ts:50`: `grant.label ?? grant.spellId`.

  Нова запасна назва:
  - назва заклинання з книги учасника за `spellId`;
  - якщо її немає — `LogLine`-ключ `battleTerms.grant.unnamed` / `battleTerms.reaction.unnamed`.

  Тип поля `name` → `LogLine`, якщо споживач рендерить через `useText`.
- **Скрипти.** Повідомлення, які скрипти друкують з API-помилок, перекладаються `resultTextOf`/uk-`getTranslator`. Сирих `errors.*` у консолі бути не повинно.
- **`i18n-exempt.json`.**
  - Формат `{ "glob": string, "reason": string }[]`, бо JSON не має коментарів. `eslint.config.mjs` читає `glob`.
  - Записи: `scripts/**`, `tests/**`, `data/**`, `prisma/**`, `vitest-setup.ts`, `eslint/**`, `*.config.*`, `lib/utils/characters/generate/*.uk.ts`, `lib/constants/import-aliases.ts`, кожен з причиною.
  - Рядкові `eslint-disable` лишаються лише для пунктів «лишаються» з таблиці рішення 3.
- **Статичні перевірки** (`lib/i18n/__tests__/untranslated.test.ts`):
  - en-значення з кирилицею → fail;
  - uk-значення без кирилиці з ≥ 2 латинськими словами → fail, крім allowlist (абревіатури D&D, назви продуктів, `{placeholder}`-only);
  - однакові uk/en значення довжиною > 12 символів — звіт (warn-список у тесті з allowlist).
- **Дублі `common.actions`.** Окремого тесту не буде: ≈180 листків — контекстні підписи, тож він дав би лише шум. Виправляється одиничний справжній дубль.
- **`logText`.** Нижче наведено точні місця:
  - `describeEffectText` у `registry/effects/index.ts:185` — аргумент `describe` для `applyStatic`;
  - `effects/state.ts:156` — `grantAction`.

  `describe` повертає `LogLine` (`$join` сегментів як `TextRef`) замість `string`.
- **Бюджет root-чанка.** `scope-size` + кейс `root` (`common`+`validation`+`whatsNew` обох мов, бо `loadStaticMessages` вбудовує обидві) < 20 KB gzip.
  - `whatsNew` у статичному бандлі обрізається до записів, які показує `useWhatsNew`: `WHATS_NEW_BUNDLED = 15` останніх.
  - `loadStaticMessages` фільтрує ns `whatsNew` за id; старіші записи в JSON лишаються для історії.
- **REST-Bearer.** Уже `getRequestLocale` → профіль власника токена. Додати тест на REST-маршрут (не лише MCP) і прибрати пункт із «Відкладено».

## Ризики

- Fallback подвоює текстову частину нових рядків `battle_events`, поки ввімкнений прапорець (M2). Це прийнятно на час вікна відкату, бо egress не росте.
- Кодек логу (крок 4) змінює формат даних. Тому він лише за результатом виміру, а legacy-декодер приймає обидва вигляди.
- PK-запит профілю на кожен динамічний запит. Його ціна — затримка в мс (через pooler), egress мізерний. Альтернатива — дзеркало профільної зони в cookie, як `User.locale`. Вона відкинута, бо користувач просив «профіль → cookie».
- Fallback `UTC` замість `Europe/Kyiv`: перший SSR гостя без cookie покаже UTC до гідрації. Це рішення користувача.
- Зміна імені актора (`SYSTEM_ACTOR`/`DM_ACTOR` порожні) зачіпає всі поточні бої. Показ має fallback і за `actorId`, старі рядки показуються так само.
