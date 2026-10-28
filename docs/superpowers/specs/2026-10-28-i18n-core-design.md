# i18n: підпроєкт 1 — ядро і UI

Мови: `uk` (за замовчуванням) і `en`. Гілка `feat/i18n`.

## Межі

**Входить:** UI, `API_ERRORS`, Zod-повідомлення, onboarding/help/whats-new/hints/чек-листи, `useConfirm`/`useNotify`.

**Наступні етапи (поза цим spec):**
- Лог бою: `battle_events.resultText`, `world_travel_log`, рядки в `lib/server/battles/read-service.ts` лишаються українськими для всіх мов. Далі — структуровані події `{ key, params }` (колонки `resultKey`/`resultParams`, expand-only, fallback на `resultText`).
- Контент із БД (закляття, юніти, раси, сценарії): оверлеї перекладів разом із constructor.
- Адмінка/сервіс перекладів: `MessageSource` лишається придатним для заміни.

**Успіх:** пілот (`auth` + `landing` + перемикач мови) працює на `uk`/`en`; ESLint не пускає кирилицю в перенесені каталоги; решту доменів переносять окремими сесіями без змін в інфраструктурі.

## Reuse

| Існує | Використання |
|---|---|
| `lib/cache/reference-data.ts` (`unstable_cache` + теги) | зразок для майбутнього `remote-source.ts` (тег `i18n:<locale>:<ns>`) |
| `lib/utils/api/api-response.ts` `errorResponse`, `error-handler.ts` `handleApiError`, `ContentError` | межа перекладу помилок; сигнатури розширюються, виклики не змінюються |
| `lib/constants/api-errors.ts` | значення стають ключами `errors.*` |
| `lib/onboarding/{whats-new,hints,checklists,help}` | лишаються `id`/метадані, тексти йдуть у JSON |
| `lib/hooks/common` `useConfirm`/`useNotify` | тексти діалогів через `t()` |
| `vitest-setup.ts` | глобальний мок next-intl |
| `app/api/auth/callback`, sign-in | синхронізація cookie з `User.locale` |

Нове потрібне, бо немає аналога: шар локалі/перекладів, `translateIssue`, `renderWithIntl`, ESLint-храповик.

## Архітектура

### Файли
- `messages/{uk,en}/<namespace>.json`: `common`, `errors`, `validation`, `auth`, `landing`, `onboarding`, … Ключі англійські, dot-нотація, ICU-плюралі.
- `lib/i18n/config.ts`: `LOCALES`, `DEFAULT_LOCALE = "uk"`, `LOCALE_COOKIE = "NEXT_LOCALE"`.
- `lib/i18n/source.ts`: `interface MessageSource { load(locale, namespace) }`.
- `lib/i18n/local-source.ts`: динамічний `import()` JSON.
- `lib/i18n/request.ts`: `getRequestConfig`.
- `lib/i18n/translator.ts`: `getTranslator(locale, ns?)` для не-React коду.
- `lib/i18n/locale-scope.tsx`: `<LocaleScope namespaces>` (серверний, для динамічних сегментів); `client-locale-provider.tsx` (клієнтський, для root-chrome); `html-lang.tsx`.
- `lib/i18n/translate-issue.ts`: `translateIssue(t, issue)`.
- `lib/i18n/test/render-with-intl.tsx`.
- `i18n-migrated.json`: globs каталогів під храповиком.

Бібліотека: `next-intl`, без префікса в URL.

### Типізація і fallback
Ключі беруться з `uk`-JSON через `AppConfig.Messages` у `global.d.ts`; неіснуючий ключ ламає `tsc`. Fallback: locale → `uk` → ключ (`getMessageFallback`/`onError`).

### Клієнтський бандл
Root layout статичний: клієнтський `ClientLocaleProvider` (мова з cookie після монтування) обслуговує лише лінивий chrome (`Header`, діалоги, error/not-found) і містить `common`+`validation` обох мов. Динамічні сегменти (campaigns, settings, help, `(auth)`) обгортають свої namespace у `LocaleScope`. Серверний код бере все через `getTranslations`.

### Визначення мови
Порядок: cookie `NEXT_LOCALE` → `Accept-Language` → `uk`. `User.locale` на кожному запиті не читається (зайвий запит, egress). Профіль синхронізується з cookie: перемикач мови пише в обидва місця, а при вході cookie виставляється з `User.locale`. Міграція `users.locale String?` expand-only. Cookie `httpOnly: false` (її читає клієнтський провайдер). Перемикач — у шапці застосунку й на лендингу (там додатково перемикає `/` ↔ `/en`). Після міграції на prod нічого не запускається в межах цієї задачі.

### `<html lang>`, SEO, формати
- Root layout не читає cookies/headers, щоб лендинг лишився статичним (`landing-auth.md`). `<html lang="uk">` статичний, `HtmlLang` оновлює атрибут на клієнті.
- Лендинг на двох статичних URL: `/` (`uk`) і `/en` (`en`); `proxy.ts` робить rewrite `/` → `/en` за cookie або `Accept-Language`. Додаємо `canonical` і `hreflang`; `sitemap` містить `/en`. Для `/en` початковий HTML має `lang="uk"` — компроміс. Решта застосунку без префікса в URL.
- Дати й числа: `useFormatter`/`getFormatter`; наявні `toLocaleDateString("uk-UA")` замінюються в частині свого домену.

### API-межа
- `API_ERRORS.X` = ключ `errors.x`.
- `errorResponse(keyOrText, status, issues?, params?)` перекладає мовою cookie запиту через `getTranslator`; невідомий рядок віддається як є, тому міграція поступова. Тіло відповіді лишається `{ error: string, issues? }`.
- Параметризовані помилки (зараз вставляють `MAX_TRACK_MB` тощо) передають `params`.
- `ContentError` зберігає ключ і `params`; переклад відбувається в `handleApiError`.

### Zod
- Повідомлення в схемах є ключами (`message: "validation.passwordMismatch"`).
- Сервер: `errorResponse`/`handleApiError` перекладає `issues[].message`.
- Клієнт: форми з `zodResolver` показують `translateIssue(t, issue)`.
- `z.config({ customError })` мапить стандартні повідомлення Zod на `validation.*` для обох мов (перевірити в частині 0, чи вистачає вбудованих локалей Zod).
- ~30 кастомних `message:` у `lib/schemas` переносяться в частині свого домену.

### Не-React реєстри
`whats-new`, `hints`, чек-листи: у TS лишаються `id`, `date`, `audience`, `href`, `helpSlug`; тексти в `onboarding.json` за ключами `whatsNew.<id>.title|body`, `hints.<id>.title|body`. Тип `id` залежить від ключів JSON. Довгі статті help переносяться структурованими блоками в `help.json`; форма блоків фіксується в частині 2.

## Тести
- Глобальний мок `next-intl` і `lib/i18n/translator` у `vitest-setup.ts`: `t("a.b")` → `"a.b"`, з параметрами → `'a.b {"n":1}'`.
- Існуючі тести переписуються на ключі. Тести помилок API порівнюють із `API_ERRORS.X`.
- `renderWithIntl(ui, { locale })`: `vi.unmock` + справжній `NextIntlClientProvider` із реальними JSON; для кількох тестів i18n.
- Тест паритету: у кожному namespace `en` має всі ключі `uk` і ті самі ICU-плейсхолдери, зайвих ключів немає.
- Зміна `vitest-setup.ts` → повний `pnpm test:run` у частині 0.

## ESLint-храповик
- `no-restricted-syntax` із селекторами `Literal`, `JSXText`, `TemplateElement` за `[Ѐ-ӿ]`, без власного плагіна.
- Активний лише на globs з `i18n-migrated.json`, який імпортує `eslint.config.mjs`; кожна частина плану дописує свої каталоги.
- `__tests__` і коментарі не перевіряються.
- Виняток: `eslint-disable-next-line … -- <причина>` (наприклад, назви мов у перемикачі).

## Кодмод
`scripts/i18n/` витягає кириличні літерали з каталогу в чернетку JSON і підставляє `t()`. Результат доводиться руками (умови, шаблони в JSX); повної автоматизації не обіцяємо.

## Порядок частин плану
Одна частина = одна сесія Sonnet; на ~150–200k токенів стоп і оновлення handoff.

0. **Інфраструктура + пілот:** `lib/i18n/*`, `next-intl`, `User.locale`, мок у `vitest-setup.ts`, тест паритету, ESLint-правило. Пілот: `auth` + `landing` + перемикач мови, `<html lang>`.
1. **Помилки й діалоги:** `API_ERRORS`, `errorResponse`/`ContentError`, Zod `customError`, `useConfirm`/`useNotify`, `common`/`ui`/`layout`/`hud`.
2. **Onboarding:** whats-new, hints, чек-листи, help, `components/onboarding`.
3. **Малі CRUD-домени:** races, skills, main-skills, classes, feats, backgrounds, artifacts, artifact-sets, music, audio, choices.
4. **Середні:** campaigns, characters, character-profile, spells, abilities, units, rules, skill-tree.
5. **Великі:** scenario, show, ai, world, content-import.
6. **Battle UI** (~132 файли), можливо на 2 сесії.

Розмір (файли з кирилицею без тестів): `battle` 132, `character-profile` 45, `lib/constants` 37, `scenario` 25, `campaigns` 21, `spells` 20, `characters` 20.

## Ризики
- Заміна глобального моку тестів зачіпає ~1100 файлів; переписування йде по доменах, до цього тести доменів без `t()` не змінюються (мок повертає ключ лише для викликів `t`).
- Рушій бою збирає українські рядки на сервері; до наступного етапу UI бою англійською частково змішуватиметься з українським логом — прийнято.
- Невідомий ключ у `errorResponse` віддається як текст: опечатка в ключі не ламає тип. Страхує тест, що кожне значення `API_ERRORS` існує в `errors.json` обох мов.

## Документація в кінці
Новий `docs/architecture/i18n.md` + рядок у `docs/architecture/README.md`, оновлення `docs/STATUS.md`, правило про i18n у `CLAUDE.md` (не-React код віддає ключі; нові рядки в перенесених каталогах заборонені ESLint).
