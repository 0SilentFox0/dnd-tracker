# i18n: частина 1 — помилки API, спільні тексти, хвости частини 0

Гілка `feat/i18n-part1` (worktree `../dnd-tracker-i18n1`) від main `ec4717e7`. Базові рішення — `docs/superpowers/specs/2026-10-28-i18n-core-design.md`, поточний стан — `docs/architecture/i18n.md`.

## Мета і межі

**Входить:**
- (а) Помилки API: `API_ERRORS` → ключі, переклад на сервері мовою запиту, параметри, `issues[]`, усі «стоки», що віддають помилки повз `errorResponse`.
- (б) Тексти спільного UI: `components/{common,ui,layout,hud}`, `lib/hooks/common` (`useConfirm`/`useNotify` тощо), `app/error.tsx`, `app/not-found.tsx`, `loading.tsx`, `settings/password`.
- (в) Серверна глобальна конфігурація Zod на ключі `validation.*`; розширення `i18n-migrated.json` і храповика.
- (г) Шість хвостів частини 0.

**Успіх:** з cookie `NEXT_LOCALE=en` будь-яка помилка з `API_ERRORS` приходить англійською (включно з `issues[].message`, підписами полів, параметрами); з `uk` — як зараз; невідомий текст віддається як є; спільні діалоги, шапка, хлібні крихти, error/not-found перекладені; храповик тримає нові каталоги.

## Обсяг (заміри на `ec4717e7`)

| Що | Скільки |
|---|---|
| `API_ERRORS` | ~370 констант + 15 функцій `*Message(…)` (17 викликів) + 5 шаблонних констант із числами (`TRACK_LIMIT`, `TRACK_FILE_INVALID`, `DECK_SLIDES_LIMIT`, `DECK_LIMIT`, `SLIDE_FILE_INVALID`) |
| Споживачі `API_ERRORS` | 195 файлів (більшість не змінюються — передають константу далі), 41 тестовий файл |
| `errorResponse` / `handleApiError` | 152 / 80 викликів — сигнатури не ламаються |
| Інлайн-помилки поза `API_ERRORS` | в `errorResponse`/`NextResponse.json` — 0; `ContentError("…")` — 10 (5 у `lib/ai/context/prompt.ts`, 1 `tool-schemas.ts`, 4 склейки `${API_ERRORS.X}: ${…}`); `parseBody(…, "Невалідний запит")` — 2 (`progression/{learn,unlearn}`); `choiceIssue` — склейка `${API_ERRORS[code]}: ${detail}`; бойові `Battle*Error`/`rejectAction` з літералом — 32 (частина 6) |
| Стоки повз `errorResponse` | `lib/server/battles/run-mutation.ts` (5), `lib/server/assistant/{http,context-http}.ts`, `lib/server/compendium-import/http.ts`, `progression-action-handler.ts` (2), `draft-class.ts` (2), `lib/ai/tools/define.ts` (результати інструментів для LLM/MCP), `lib/ai/chat/run-chat.ts` (`metadata.error` пишеться в БД) |
| Клієнтські споживачі значень `API_ERRORS` | `lib/utils/campaigns/join-error.ts` (порівнює текст), `lib/utils/audio/track-edit.ts` (`EditTrackDialog`), `lib/utils/items/item-stats.ts` (zod-схема форми артефакта) |
| Тести з літеральними укр. помилками | ~98 файлів-кандидатів (частина — лог бою, не помилки) |
| Спільний UI з кирилицею (без тестів і коментарів) | `components/common` 16 файлів / 48 рядків, `ui` 7/13, `layout` 3/32 (`Breadcrumbs` 21), `hud` 2/2, `lib/hooks/common` 5/11, `app/error.tsx`, `app/not-found.tsx`, 4 × `loading.tsx` у `app/campaigns`, `app/settings/password/page-client.tsx`, `lib/constants/field-labels.ts` (34 рядки) |
| `lib/schemas` з кирилицею | 20 файлів — **усі доменні**, спільних немає; переносяться в частинах своїх доменів |

## Reuse

| Існує | Використання |
|---|---|
| `lib/i18n/translator.ts` `getTranslator` | серверний переклад помилок; без змін |
| `lib/i18n/request-locale.ts` `getRequestLocale` | мова запиту (cookie → `Accept-Language` → `uk`) |
| `lib/i18n/translate-issue.ts` `translateIssue` | переклад `issues[]` на сервері й клієнтських повідомлень; розширюється `params` |
| `lib/i18n/zod-errors.ts` `zodErrorMap` | стає глобальним серверним `customError`, розширюється кодами |
| `lib/i18n/test/mock-t.ts` `makeT`, глобальний мок у `vitest-setup.ts` | тести бачать ключі; `errorResponse` у тестах повертає ключ = `API_ERRORS.X`, тому 41 тест на константи не змінюється |
| `lib/i18n/test/render-with-intl` | кілька тестів зі справжніми JSON |
| `scripts/i18n/extract-cyrillic.ts` | чернетки `common.json` для групи (б) |
| `lib/utils/api/{api-response,error-handler,parse-body,load-owned,api-auth}.ts`, `ContentError` | точки перекладу; виклики не переписуються |
| `lib/utils/common/error-message.ts` `errorMessage` | показ помилок у `confirm-dialog`, без змін |
| ESLint-храповик + `i18n-migrated.json` | дописуються globs |

**Нове, бо аналога немає:** `translateErrorBody` (чиста функція перекладу тіла помилки), `apiErrorJson` (відповідь із лінивим перекладом), реєстр `API_ERROR_PARAMS`, одноразовий кодмод `scripts/i18n/api-errors-to-keys.ts`, `syncUserLocale`, `isSecureRequest`.

## Рішення

### 1. Ключі `API_ERRORS`
- `API_ERRORS.X = "errors.<camelCase(X)>"` (`TRACK_LIMIT` → `"errors.trackLimit"`). Тексти — `messages/{uk,en}/errors.json`; `uk`-тексти генерує кодмод із поточних значень, `en` пише імплементер.
- **Namespace `errors` лише серверний** (не вантажиться в жоден провайдер — ~400 рядків не їдуть у клієнтський бандл). Ключі, які показує клієнт без сервера (`YOUTUBE_URL_INVALID`, `ITEM_CONSUMABLE_CONFLICT`, тексти `join-error`), живуть у `validation.*` / `common.*`; значення `API_ERRORS` може вказувати на будь-який namespace.
- Функції `*Message(name)` видаляються: замість них ключ + `params` у місці виклику (`errorResponse(API_ERRORS.CLASS_NAME_TAKEN, 409, undefined, { name })`), ICU в JSON (`"Клас «{name}» уже є в кампанії"`).
- Шаблонні константи з числами → ICU-плейсхолдери + `API_ERROR_PARAMS: Partial<Record<ApiErrorKey, Record<string, string | number>>>` у `api-errors.ts` (`{ max: MAX_TRACKS_PER_CAMPAIGN }`). Переклад зливає реєстр із явними `params` (явні важать більше) — викликам не треба повторювати ліміти.
- Склейки `${API_ERRORS.X}: ${detail}` (4 + `choiceIssue`) → ключ із `{detail}`/`{name}` і `params`; `ChoiceIssue` отримує поле `params?`.
- Відкинуто: лишити українські значення і перекладати зворотним пошуком текст → ключ. Безпечніше для незмігрованих стоків, але дублює тексти в TS і JSON і суперечить затвердженому ядру.

### 2. Переклад на межі відповіді
- `lib/utils/api/translate-error.ts`:
  - `translateErrorBody(t: Translator, body: { error: string; issues?: unknown; params?: Params }): ApiErrorBody` — чиста. `t.has(error)` → текст + `errorKey: error`; інакше `error` як є, без `errorKey`. `issues` (масив об'єктів з `message`) → `translateIssue(t, issue)` + `pathLabel` (рядок «Назва › #2» із `errors.fields.<key>`, невідомий сегмент — як є).
  - `apiErrorJson(body: { error: string; issues?: unknown; params?: Params } & Record<string, unknown>, init: ResponseInit): NextResponse` — решта полів (`code`, `version`) проходить без змін.
- `errorResponse(keyOrText, status, issues?, params?)` = `apiErrorJson(…)`; лишається **синхронним**.
- **Лінивий переклад:** `apiErrorJson` одразу повертає `NextResponse` зі статусом, `Content-Type: application/json` і заголовками з `init` (як зараз, без нових), а тіло — `ReadableStream`, чий `start` робить `getRequestLocale()` (помилка поза запитом — скрипти, sweep — → `DEFAULT_LOCALE`) → `getTranslator(locale)` → `translateErrorBody`. Причина: `cookies()` у Next 16 асинхронний, а async `errorResponse` змінив би тип у 152 викликах; у синхронних хелперах (`T | NextResponse`) `Promise` мовчки проходив би повз `instanceof NextResponse`.
  - **Spike першим кроком задачі 1:** `pnpm build && pnpm start`, запит із cookie `en` до роута, що віддає 401/404, — англійський текст. Якщо контекст запиту в `start` недоступний — fallback: `async errorResponse` + усі виклики через `tsc` (явні типи повернення хелперів), це рішення фіксується в плані.
- Тіло зворотно сумісне: `{ error: string, issues?, errorKey? }`; `issues[i]` отримує `pathLabel?`. Назва `errorKey`, бо `code` уже зайнятий бойовими відповідями (`"conflict"`, `BattleRuleCode`).
- `ContentError(message, status, issues?, params?)`; `handleApiError` передає `params`. `parseBody`/`parseInput`/`loadOwned`/`requireCampaignAccess`/`requireDM`/`actor.ts` не змінюються — їхні дефолти вже константи.
- Клієнт `lib/api/client.ts`: `bodyErrorMessage` бере `issue.pathLabel ?? path` (`FIELD_LABELS` переїжджає в `errors.fields.*`, файл `lib/constants/field-labels.ts` видаляється); `ApiError` отримує `errorKey?: string` з тіла; fallback `Помилка ${status}` → нейтральне `HTTP ${status}`.
- `operation-runner.ts`: пересилає `data.errorKey ?? data.error`, щоб внутрішній повтор не втратив ключ.

### 3. Стоки повз `errorResponse`
Кожен переводиться на `apiErrorJson`/`errorResponse` або на `translateErrorBody` з мовою запиту:
- `run-mutation.ts`, `assistant/{http,context-http}.ts`, `compendium-import/http.ts`, `progression-action-handler.ts`, `draft-class.ts` — `apiErrorJson` з тими ж додатковими полями.
- `lib/ai/tools/define.ts` — `message`/`issues` результату інструмента перекладаються мовою запиту (MCP/Bearer без cookie → `Accept-Language` → `en`).
- `run-chat.ts`: `metadata.error`, що пишеться в БД, перекладається **під час запису** мовою запиту (в БД не потрапляє ключ).
- Клієнт: `join-error.ts` порівнює `ApiError.errorKey` замість тексту, тексти — `common.joinErrors.*`; `EditTrackDialog` і форма артефакта показують `translateIssue(t, { message })`.
- `translateIssue` зливає `issue.params` і `API_ERROR_PARAMS[message]` у значення ICU.
- Аудит у задачі: `grep` значень `API_ERRORS` у записах до БД (`battle_events.resultText`, `world_travel_log`, assistant-повідомлення, `ai_proposals`), Pusher-подіях і SSE; знайдене — переклад при записі або ключ лишається в `throw`. Літеральні `ContentError("…")` у `prompt.ts` → наявні або нові константи; `"Невалідний запит"` → `API_ERRORS.INVALID_BODY`.

### 4. Zod на сервері
- `lib/zod/locale.ts` (імпортується лише з `instrumentation.ts`): замість українського `localeError` — `z.config({ customError: zodErrorMap })`.
- `zodErrorMap` доповнюється: числові `too_small`/`too_big` → `validation.min`/`validation.max` (`{minimum}`/`{maximum}`), `invalid_value` → `validation.invalid`, решта кодів → `validation.invalid` (не `undefined`, щоб `en` не отримав українського fallback). Явні `message` у схемах мають пріоритет над `customError` і не зачіпаються.
- `issues[].message`-ключі перекладає `translateErrorBody`. Клієнтська глобальна конфігурація Zod не вмикається (незмігровані форми показали б ключі) — поза скоупом.

### 5. Спільний UI
- Тексти в `common.json` під префіксами за компонентом (`common.confirm.*`, `common.notify.*`, `common.header.*`, `common.breadcrumbs.*`, `common.states.*`, `common.search.*`, `common.import.*`, …). `useConfirm`/`useNotify`/`useUnsavedChangesGuard`/`useLibraryList`/`useFileImport` беруть `useTranslations("common")`; помилки `useFileImport` — ключі, показ через `t`.
- Повідомлення розробника (`throw new Error("useConfirm потребує ConfirmProvider…")`) → англійською без перекладу.
- `MonsterStatblock`, `DiceRoller`, `AbbreviationsInfoDialog`, `WeaponTraitsField` лежать у `components/common`, тому входять сюди (лише літерали в самих компонентах); доменні константи з `lib/constants/*`, які вони показують, лишаються українськими до частини свого домену (вони поза храповиком).
- `app/layout.tsx` `metadata.description` переходить на англійську (root статичний, `/` і x-default — `en`); окремі сторінки з власними `metadata` не змінюються.
- Root (`ClientLocaleProvider`) вантажить обидві мови для `common` + `validation`; `common` росте (~150 рядків × 2 мови, ~10 KB) — прийнятно.

### 6. Хвости частини 0
1. **`settings/password`**: заголовки/підписи в `auth.settings.*`; `app/settings/password/**` — у храповик.
2. **`HtmlLang` lock**: модульне сховище в `html-lang.tsx` — стек lock-локалей + остання локаль root-провайдера; кожен mount/unmount/зміна викликає `applyLang()` (верхній lock, інакше root). Атрибут `data-lang-lock` зникає.
3. **`useSetLocale` без `hardNavigateTo`**: падіння PUT → `writeLocaleCookie(next)`, далі подія й `router.refresh()` як завжди (cookie — джерело правди для рендера, профіль синхронізується наступним разом).
4. **cookie `secure`**: `setLocaleCookie(res, locale, req)`; `secure = isSecureRequest(req)` — `x-forwarded-proto` або протокол `req.url` = `https`. `isSecureRequest(req: Request): boolean` — у `lib/utils/api/same-origin.ts`, поруч із наявною перевіркою origin. Виклики: `/api/locale` GET/PUT, `app/auth/callback`.
5. **Мова до входу → `User.locale`**: `syncUserLocale(userId, cookieLocale): Promise<Locale | null>` у `lib/server/users/locale.ts`. Профіль має мову → повертає її (cookie перезаписується, як зараз). Профіль `null` і в запиті є валідна cookie (явний вибір; `Accept-Language` не рахується) → `updateMany({ where: { id, locale: null } })` і `null`. Виклики: `GET /api/locale`, `app/auth/callback`.
6. **`auth` у root**: `loadStaticMessages(["common", "validation"])`; ключі, які root-chrome бере з `auth` (Header / `useSwitchGoogleAccount` тощо), переїжджають у `common.header.*`. `auth` лишається в `LocaleScope` сегментів `(auth)` і `settings`.

### 7. Храповик
Кожна задача дописує свої globs у `i18n-migrated.json`:
`lib/utils/api/**`, `lib/server/content/errors.ts`, `lib/api/client.ts`, `lib/constants/api-errors.ts`, `lib/zod/**`, `components/common/**`, `components/ui/**`, `components/layout/**`, `components/hud/**`, `lib/hooks/common/**`, `app/error.tsx`, `app/not-found.tsx`, `app/campaigns/**/loading.tsx`, `app/settings/password/**`.

## Задачі (для Sonnet-імплементерів)

| # | Задача | Залежить від |
|---|---|---|
| 1 | Ядро перекладу помилок | — |
| 2 | Стоки повз `errorResponse` + клієнтські споживачі | 1 |
| 3 | `API_ERRORS` → ключі (кодмод, `errors.json` uk/en, params) | 1, 2 |
| 4 | Серверний Zod на ключі | 1 |
| 5 | Спільний UI: `ui`, `hud`, `lib/hooks/common`, `error`/`not-found`, `loading` | — |
| 6 | Спільний UI: `common`, `layout`, `settings/password`, root без `auth` (хвости 1, 6) | 5 (той самий `common.json`) |
| 7 | Хвости 2–5 | — |

Задачі 1, 5, 7 паралельні; між 3 і 2 жорсткий порядок — до 2 перемикання на ключі показало б ключі в незмігрованих стоках. Наприкінці гілки: повний `pnpm test:run`, `pnpm lint`, `tsc`, `/simplify`, оновлення docs.

1. **Ядро.** Spike (розд. 2) → `translate-error.ts` (`translateErrorBody`, `apiErrorJson`), `errorResponse` з `params`, `ContentError.params`, `handleApiError`, `translateIssue` з `params`/реєстром, `errors.fields.*` з `FIELD_LABELS`, `lib/api/client.ts` (`pathLabel`, `errorKey`, `HTTP ${status}`), `operation-runner.ts`. Значення `API_ERRORS` ще українські → поведінка для `uk` не змінюється.
2. **Стоки.** Розд. 3 повністю, включно з аудитом записів у БД/Pusher/SSE і 10 інлайн-`ContentError`/2 `parseBody`.
3. **Ключі.** Кодмод `scripts/i18n/api-errors-to-keys.ts` (одноразовий, комітиться): генерує `messages/uk/errors.json`, переписує значення `api-errors.ts`, у тестах замінює літерали, що дорівнюють значенню `API_ERRORS`, на `API_ERRORS.X`. Далі руками: 15 функцій `*Message`, 5 шаблонних констант + `API_ERROR_PARAMS`, склейки, `validation.*`/`common.*` для клієнтських ключів, `en` для всіх ключів.
4. **Zod.** Розд. 4.
5–6. **Спільний UI.** Розд. 5; `pnpm i18n:extract` на каталог → `common.json` uk/en; тести компонентів — на ключі.
7. **Хвости 2–5.** Розд. 6.

## Тести (перевіряють ключі, не тексти)

- `translateErrorBody` (мок `t`): ключ → `errorKey` + перекладений `error`; невідомий текст → як є, без `errorKey`; явні `params` важать більше за `API_ERROR_PARAMS`; `issues[].message` перекладено, `minimum`/`params` дійшли до `t`; `pathLabel` для `["name"]`, `["items", 1]`, невідомого сегмента; не-масив `issues` проходить без змін.
- `apiErrorJson`/`errorResponse`: статус і заголовки; додаткові поля (`code`, `version`) збережено; `getRequestLocale` кидає → мова `uk`, тіло валідне.
- Один тест зі справжніми JSON (`vi.unmock` перекладача): `errors.trackLimit` → `en`-текст із підставленим лімітом; `uk` з ICU-плюраллю.
- **Покриття:** кожне значення `API_ERRORS` існує в `uk` і `en` (за своїм namespace); жодне значення не містить кирилиці; `API_ERROR_PARAMS` має ключі лише з `API_ERRORS`, і кожен ICU-плейсхолдер `uk`-тексту такого ключа є в реєстрі.
- Паритет `uk`/`en` (наявний тест) покриває нові `errors`, `common`, `validation`.
- Стоки: `run-mutation` віддає `errorKey` для `BattleRuleError` з константою і зберігає `code`; `define.ts` перекладає `message` результату; `join-error` розпізнає помилку за `errorKey`.
- `zodErrorMap`: числові min/max, `invalid_value`, невідомий код → `validation.invalid`.
- Хвости: `HtmlLang` — lock `en` поверх root `uk` → `en`; unmount → `uk`; root змінився під lock → після unmount нова мова. `useSetLocale` — PUT падає → cookie записано, подія, `refresh`. `setLocaleCookie` — `secure` для `https`/`x-forwarded-proto: https`, без нього для `http`. `syncUserLocale` — профіль `null` + cookie `en` → запис; профіль `uk` + cookie `en` → `uk`, без запису; без cookie → без запису.
- Під час роботи — `pnpm test:changed`/`test:related`; задача 3 зачіпає ~140 тестових файлів → повний `pnpm test:run` в кінці задачі 3 і гілки.

## Ризики

- **Незмігрований стік показує ключ.** Будь-яке місце, що віддає значення `API_ERRORS` повз переклад, після задачі 3 покаже `errors.x`. Страховка: задача 2 перед 3, аудит `grep` у задачі 2, `errorKey` у тілі видно в тестах стоків. Ключ у БД — найгірший випадок (лишається назавжди); аудит записів обов'язковий.
- **Лінивий стрім.** Якщо контекст запиту недоступний у `start` на Vercel, а локально працює — spike на `pnpm start` не зловить різницю; перевірка на preview-деплої перед злиттям (одна помилка з cookie `en`).
- **Опечатка ключа** в `errorResponse` віддається текстом і не ламає `tsc` — страхує тест покриття; нові ключі поза `API_ERRORS` не допускаються (рев'ю).
- **Якість `en`** ~400 рядків помилок пише модель; ICU-плейсхолдери ловить паритет, стиль — ні.
- **Змішана мова.** Бойові правила з літералами (32), доменні Zod-повідомлення (20 файлів), лог бою лишаються українськими до своїх частин — прийнято ядром.
- **MCP і Bearer-запити** без cookie й `Accept-Language` отримують `en` (рішення користувача); це окремий fallback для запитів без cookie-сесії, браузерний ланцюжок cookie → `Accept-Language` → `uk` не змінюється.

## Поза скоупом

Доменні `message:` у `lib/schemas` (20 файлів), інлайн-тексти бойових помилок і лог бою (частина 6), тексти інструментів AI (`"Некоректні параметри"` у `define.ts`, промпти — частина 5), доменні fallback-и `lib/api/{decks,tracks,world}.ts`, клієнтська глобальна конфігурація Zod, onboarding (частина 2), `toLocaleDateString`, переклад наявних рядків у БД.

## Документація в кінці

`docs/architecture/i18n.md` (межа API: `apiErrorJson`, `errorKey`, `pathLabel`, `API_ERROR_PARAMS`, серверний namespace `errors`, `customError`; `HtmlLang`-сховище; `syncUserLocale`), рядок «Мультимовність» у `docs/STATUS.md`.
