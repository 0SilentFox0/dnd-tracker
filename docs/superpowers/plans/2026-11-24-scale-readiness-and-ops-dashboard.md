# План: ops-дашборд + готовність до навантажень

Спек (джерело істини для рішень, схем, метрик, порогів): `docs/superpowers/specs/2026-11-24-ops-dashboard-and-scale-readiness-design.md`. Цей файл — задачі для виконавця. Читати спек повністю перед стартом частини.

## Структура

| Частина | Зміст | Залежності | Модель |
|---|---|---|---|
| **P1** | Метрики, колектор, алерти, сповіщення, воркер-сторож | — | Sonnet |
| **P2** | API читання, сторінка `/ops`, решта адаптерів провайдерів, жива перевірка | P1 | Sonnet (браузер — субагент Sonnet) |
| **P3** | Підготовка до навантажень, що не залежить від вимірювань, + runbook | P1 (метрики) | Sonnet |
| **P4** | k6, аудит індексів, рішення за даними, калібрування порогів, бекап-вправа | P1–P3, **згода власника на запуск на prodcopy** | Sonnet + Opus-огляд |

Кожна частина — окрема свіжа сесія (CLAUDE.md глобальний: контекст ≤ ~150k, потім нотатки й нова сесія).

## Спільні правила для всіх частин

- **Гілка:** `feat/ops-<part>` від актуального `main` (P1: `feat/ops-p1`, …). Основна тека може бути перемкнена іншою сесією: перед роботою перевірити `git branch --show-current`; якщо зайнято, робити в окремому worktree (`../dnd-tracker-ops`). Злиття в `main` лише за явним «так» власника; push і деплой лише за окремим дозволом.
- **Reuse before writing** (перед кодом повторно пошукати в `lib/utils`, `lib/hooks`, `components/common`, `components/ui`, `components/hud`, `lib/utils/api`): `isPlatformAdmin`, `getSessionUserId`, `privateJson`, `errorResponse`, `handleApiError`, `bearerToken`, `safeEqual`, `logger`, `lib/redis.ts`, `PrefetchedQuery`, `LocaleScope`, зразок `app/api/cron/assistant-cleanup/route.ts`, зразок воркера `infra/media-worker`.
- **Шари:** route → `lib/api/<domain>.ts` → `lib/hooks/<domain>/` (з `keys.ts`, `index.ts`) → компоненти; компоненти й `app/**` не імпортують `@/lib/api/*`, не викликають `fetch`; `route.ts` тонкий (Zod/сесія/делегування). Чистої логіки в `lib/utils/ops/` (не імпортує `lib/server`), серверної в `lib/server/ops/`.
- **БД:** expand-only міграції, кожна `CREATE TABLE` разом з `ENABLE ROW LEVEL SECURITY`; імена міграцій після останньої наявної (`ls prisma/migrations | tail -1`); моделі в `prisma/schema/core.prisma` з `@@map`; `prisma` тільки з `@/lib/db`; рантайм-запити через `DATABASE_URL` (pooler), `DIRECT_URL` у рантаймі не використовувати.
- **Код:** TypeScript strict, `@/…` аліаси, жодної кирилиці в коді й коментарях; коментарі мінімальні (одна рядок і лише «чому»); тексти UI/помилок через `messages/{uk,en}/*.json` і `lib/constants/api-errors.ts`; сторінки й endpoint-и **не логують і не повертають секрети**.
- **Тести:** виконавці пишуть тести поруч у `__tests__/`, але **не запускають їх по ходу**; в кінці частини: `pnpm exec tsc --noEmit`, `pnpm exec eslint --fix <змінені файли>` (не repo-wide `pnpm lint`), `pnpm cycles`, `pnpm test:changed`, потім один повний `pnpm test:run`. Перед запуском важких команд `ps -Ao pid,pcpu,command -r | grep -E "eslint|vitest|next"`; процес > 5 хв = завис, перезапустити вужче.
- **Ratchets:** після змін запустити відповідні (`route-auth-ratchet`, `i18n-exempt`, `cyrillic-comments`, `ui-layers`); нічого не додавати до exempt-списків (вони лише скорочуються).
- **Верифікація перед «готово»:** динамічного стенду з бекендом може не бути. Якщо немає, прямо написати «не перевірено на стенді». Локально: `pnpm build && pnpm start` (не `next dev`), локальна БД з docker, субагент Sonnet у Chrome, зменшені скріншоти, перевірки через текст/JS замість скрінів. Тестову/сміттєву дані прибрати.
- **Документація:** в кінці частини оновити `docs/architecture/ops.md` (створюється в P1, рядок у `docs/architecture/README.md`) і `docs/STATUS.md`; для користувацьких фіч `whats-new` потрібен, **тут не потрібен** (функція лише для власника).
- **Комунікація:** з власником українською; після кожного блоку короткий звіт з переліком змін, що не перевірено, і відкритих питань; `/simplify` на diff гілки наприкінці (1–2 агенти), фінальний огляд — Opus. Завершених субагентів зупиняти через TaskStop.
- **Формат коміту:** `feat(ops): …` / `fix(ops): …`, з рядком співавтора, який задає середовище сесії.

---

## P1. Метрики, колектор, алерти, сторож

### T1.1 Міграція й моделі
- Файли: `prisma/schema/core.prisma` (4 моделі: `OpsMetricBucket`, `OpsMetricHourly`, `OpsAlertState`, `OpsAlertEvent`; `@@map("ops_metric_buckets")`, `ops_metric_hourly`, `ops_alert_state`, `ops_alert_events`), `prisma/migrations/<після останньої>_ops_metrics/migration.sql`.
- Схеми колонок і ключів — спек §4 і §8 (`ops_alert_events`: `id cuid`, `rule`, `from`, `to`, `value Float?`, `at DateTime @default(now())`, `notified Boolean`; індекс `(at)` і `(rule, at)`).
- RLS на всіх чотирьох. Складені PK `(bucket, metric, labels)`.
- Тест: `lib/__tests__/` ratchet на RLS уже ловить таблиці без RLS (запустити відповідний тест); `pnpm exec prisma validate`, `pnpm exec prisma generate`; локально `prisma migrate dev` на docker-БД.

### T1.2 Каталог метрик і буфер
- `lib/ops/metrics-catalog.ts`: `METRICS` (за таблицею спек §5), `type MetricKey`, `LATENCY_BOUNDS = [50,100,200,400,800,1600,3200]` (+`inf`), `canonicalLabels(labels): string` (відсортувати ключі, `k=v` через `,`, відкинути невідомі ключі/значення поза переліком), `isKnownMetric`.
- `lib/server/ops/metrics.ts`: `incr(key, by = 1, labels?)`, `gauge(key, value, labels?)`, `observe(key, ms, labels?)`, `flushMetrics(): Promise<void>`, `__resetForTests()`. Буфер `Map<bucketIso|metric|labels, {n,sum,max}>`; `bucket` = початок хвилини UTC на момент запису; авто-флаш, якщо з останнього пройшло ≥ 30 с: `try { after(flush) } catch { void flush() }`; флаш = один multi-row `INSERT … ON CONFLICT (bucket,metric,labels) DO UPDATE SET n = t.n + EXCLUDED.n, sum = t.sum + EXCLUDED.sum, max = GREATEST(t.max, EXCLUDED.max)` через `Prisma.sql`/`Prisma.join`; усі помилки ковтаються (`logger.warn`). Невідома метрика/мітка: тихо відкидається (у dev/test кидає).
- Чиста частина в `lib/utils/ops/`: `bucketStart(date)`, `latencyBucket(ms)`, `quantileFromBuckets(counts, q)` (інтерполяція всередині бакета).
- Тести: канонізація міток (порядок, невідомі), `latencyBucket` межі (50 → перший, 51 → другий, 5000 → inf), `quantileFromBuckets` (порожньо → null, один бакет, p95 на двох), буфер агрегує однакові ключі й скидається після флашу (мок `prisma.$executeRaw`), флаш не кидає при помилці БД, `after` поза scope → fallback.

### T1.3 Інструментація (точкові правки)
- `lib/server/battles/run-mutation.ts` / `pipeline-deps.ts`: таймінг `battle.mutation{op}` навколо виконання операції (значення `op` — ім'я операції з реєстру; обмежити переліком із реєстру `getBattleOperation`); `battle.conflict` у `battleErrorResponse` для `BattleConflictError`.
- `lib/utils/api/error-handler.ts` (`handleApiError`): для 5xx → `api.error5xx{kind}`; `PrismaClientKnownRequestError` `P2024` → `db.pool_timeout`; `P1001|P1002|P1017` → `db.unreachable`. Не змінювати форму відповіді.
- `lib/pusher/safe-trigger.ts`: `pusher.trigger{result=ok|fail}`.
- `lib/utils/api/rate-limit.ts`: відмови → `ratelimit.denied{scope}` (scope з переліку `BATTLE_RATE_LIMITS` або `other`), `degraded()` → `ratelimit.degraded{mode}`.
- Тести: існуючі тести цих файлів оновити, додати кейси: P2024 → лічильник, конфлікт → лічильник, збій trigger → `fail`, degraded open/closed. Мок модуля метрик.

### T1.4 Ліміти, правила, закінчення секретів, чистий оцінювач
- `lib/ops/limits.ts` (форма у спеку §6), `activeTier(provider, env = process.env)`; початкові значення з поточних тарифів (звірити, дата в однорядковому коментарі).
- `lib/ops/expiries.ts`: `SECRET_EXPIRIES: { id: 'cloudflare-token', at: '2026-11-26' }[]`.
- `lib/ops/alert-rules.ts`: `ALERT_RULES: AlertRule[]` за таблицею спек §7.
- `lib/utils/ops/alert-state.ts` (чиста): `nextAlertState(prev, value, rule, now): { state, transition: 'none'|'up'|'down'|'resolved'|'renotify', notify: boolean }` — реалізація стан-машини зі спеку §7 (`breachSince`, `forMinutes`, `cooldownMinutes`, `silencedUntil`).
- `lib/utils/ops/forecast.ts` (чиста): `forecastHoursToLimit(points: {t:number,v:number}[], limit: number): number | null` (лінійна регресія по останніх ≤ 60 точках; нахил ≤ 0 → `null`).
- Тести: стан-машина (ok→warn лише після `forMinutes`, warn→crit, повернення в ok дає `resolved`, `cooldown` для `crit`, `silencedUntil` придушує `notify`, невдала відправка не оновлює `lastNotifiedAt` — через те, що оновлення робить викликач, перевірити контракт `notify`), forecast (зростання, плато, спадання, <2 точок), `activeTier` з env, форма `PROVIDER_LIMITS` (кожен provider має `free` і `paid`), `ALERT_RULES` мають унікальні `id` і посилаються лише на відомі метрики.

### T1.5 Автентифікація власника + колектор
- `lib/utils/api/require-platform-admin.ts`: `requirePlatformAdmin(): Promise<{ userId: string } | NextResponse>` (немає сесії або не власник → 404 `privateJson`/`errorResponse`). Тест: власник проходить, інший 404, без сесії 404.
- `lib/server/ops/collect-db.ts`: `collectDbGauges()` — один-два запити через `prisma.$queryRaw` до `pg_stat_activity` (кількість за станами, `max_connections` з `SHOW`/`pg_settings`, найдовша транзакція секунд, кількість очікувань блокувань з `pg_locks`/`pg_stat_activity.wait_event_type='Lock'`), `pg_stat_database` (`xact_commit/rollback` не потрібні; `deadlocks`, `blks_hit/blks_read` → ratio), `pg_database_size(current_database())`; плюс `app.active_battles` (кількість боїв зі статусами з `POLLED_BATTLE_STATUSES`-аналога на сервері; знайти джерело правди статусів і не дублювати). Пише через `gauge`.
- `lib/server/ops/rollup.ts`: `rollupAndPrune(now)` — раз на годину (мінута 0, ідемпотентно через `INSERT … ON CONFLICT` по `ops_metric_hourly`) згортає завершені години з хвилинних бакетів, видаляє хвилинні > 48 год, погодинні > 90 днів, `ops_alert_events` > 90 днів. Також викликається з щоденного cron (`assistant-cleanup`) як страховка.
- `lib/server/ops/evaluate.ts`: `evaluateAlerts(now)` — читає значення метрик за вікном (з `ops_metric_buckets`), рахує derived (ratio, percent-of-limit через `limits.ts`/`activeTier`, `collector.silent`, `secrets.expiry`), викликає `nextAlertState`, пише `ops_alert_state` та `ops_alert_events`, збирає список повідомлень.
- `app/api/ops/collect/route.ts` (`POST`): `Bearer OPS_COLLECT_SECRET` через `bearerToken`+`safeEqual`; нема змінної → 503; `collectDbGauges` + адаптери (T1.7) через `Promise.allSettled` з таймаутом 8 с; `gauge('collector.heartbeat', Date.now()/1000)`; `flushMetrics()`; `rollupAndPrune` у початок години; `evaluateAlerts` → `notify` (T1.6); відповідь за спеком §8. `maxDuration = 60`, `dynamic = 'force-dynamic'`.
- Тести: collect → 503 без секрету, 401 з неправильним, 200 з правильним (моки колектора/оцінювача); `rollupAndPrune` (SQL-межі через мок або інтеграційний тест, якщо є локальна БД), `evaluateAlerts` на синтетичних рядках.

### T1.6 Нотифікатори та test-notify
- `lib/server/ops/notify.ts`: `sendAlert(msg: { title; body; severity }): Promise<{ telegram: 'ok'|'fail'|'off'; email: 'ok'|'fail'|'off' }>`. Telegram: `POST https://api.telegram.org/bot<OPS_TELEGRAM_BOT_TOKEN>/sendMessage` `{chat_id: OPS_TELEGRAM_CHAT_ID, text}` (текст лише латиницею, без секретів, таймаут 5 с); Resend: `POST https://api.resend.com/emails` з `RESEND_API_KEY`, `OPS_ALERT_EMAIL` (одержувач), `OPS_ALERT_FROM`. Канал без env = `off`. Помилки не кидають, токени не логуються.
- `buildAlertMessage(transition, rule, value, limit?)` — чиста, у `lib/utils/ops/`.
- `app/api/ops/test-notify/route.ts` (`POST`, `requirePlatformAdmin`): повертає результат по каналах.
- Тести: форматування повідомлень (up/down/resolved), `sendAlert` з моканим `fetch` (ok/fail/off), токен не потрапляє в `logger`-виклики (spy), `test-notify` 404 для не-власника.

### T1.7 Адаптери провайдерів v1
- `lib/server/ops/adapters/types.ts`: `ProviderAdapter = { name: string; collect(): Promise<ProviderReading[] | 'unavailable'> }`, `ProviderReading = { metric: string; value: number }` (метрика `provider.<name>.<metric>` пишеться в `gauge`).
- `cloudflare.ts` (GraphQL Analytics API, запити воркера за добу; env `OPS_CLOUDFLARE_API_TOKEN`, `OPS_CLOUDFLARE_ACCOUNT_ID`, `OPS_CLOUDFLARE_WORKER_NAME`) і `pusher.ts` (HTTP API: кількість зайнятих каналів через наявний `pusherServer.get`; **перевірити**, чи є кількість з'єднань; якщо ні, `unavailable` для з'єднань); обидва без env → `unavailable`.
- Перед реалізацією виконавець відкриває поточну документацію API й записує знайдене (або відсутність) у `docs/architecture/ops.md`.
- Тести: адаптер без env → `unavailable`; з моканим `fetch` → правильні `ProviderReading`; помилка мережі → не кидає (`'unavailable'`).

### T1.8 Воркер-сторож
- `infra/ops-watchdog/` (за зразком `infra/media-worker`: `wrangler.toml`, `src/index.ts`, `src/logic.ts`, `__tests__`, `README.md`). `[triggers] crons = ["* * * * *"]`, KV-binding `STATE`. Змінні/секрети (`wrangler secret put`): `APP_URL`, `OPS_COLLECT_SECRET`, `HEALTH_SECRET`, `OPS_TELEGRAM_BOT_TOKEN`, `OPS_TELEGRAM_CHAT_ID`.
- `scheduled()`: `POST ${APP_URL}/api/ops/collect` і `GET ${APP_URL}/api/health?deep=1` паралельно; до 3 спроб по 5 с; якщо обидві (або health) невдалі → Telegram «app down» з дедуплікацією (`STATE.put('down', ts, {expirationTtl: 1800})`, шлемо, лише коли ключа немає); успіх при наявному `down` → «recovered» і `delete`.
- Чиста логіка у `src/logic.ts`: `decide({ collectOk, healthOk, hasDownFlag }): 'down'|'recovered'|'none'`. Тести: усі комбінації, дедуплікація.
- Деплой воркера (`wrangler deploy`, секрети, KV) виконує власник за інструкцією в `README.md`; виконавець не деплоїть і не ставить секретів.

### T1.9 Документація й env
- `docs/architecture/ops.md` (метрики, таблиці, колектор, алерти, воркер, env, як додати метрику/правило/адаптер), рядок у `docs/architecture/README.md`; `.env.example` — нові змінні закоментовані з поясненнями; `docs/STATUS.md`.

**Критерії завершення P1:** міграція застосовується на чистій БД і ratchet RLS зелений; `POST /api/ops/collect` локально пише gauges, heartbeat і стан алертів; штучно викликана умова (скрипт-заглушка метрики) дає запис у `ops_alert_events`; `test-notify` повертає `off` без env і `ok` з реальними (власник перевіряє після налаштування); `pnpm test:run` повністю зелений; жоден секрет не з'являється в логах/відповідях.

---

## P2. API читання, сторінка `/ops`, адаптери, жива перевірка

### T2.1 API читання + хуки
- `app/api/ops/{summary,series,alerts,db-top}/route.ts`, `app/api/ops/alerts/[rule]/mute/route.ts`; Zod-схеми запитів у `lib/schemas/ops.ts` (`range ∈ 1h|6h|24h|7d`, `metrics` ≤ 12, `minutes ∈ {0,60,1440}`); усі з `requirePlatformAdmin`.
- `lib/server/ops/read-series.ts`: вибір хвилинних (≤ 24 год) або погодинних (7 д) бакетів, агрегація до ≤ 240 точок, похідні `:p50`/`:p95` (через `quantileFromBuckets`), `:rate` (сума/хв). `lib/server/ops/summary.ts`: провайдери з останніми значеннями, `limit` з `PROVIDER_LIMITS[provider][activeTier]`, `percent`, `status` (за правилами `ALERT_RULES`), `forecastHours` (з `forecastHoursToLimit` по 24 год).
- `lib/server/ops/db-top.ts`: `pg_stat_statements` top-10; відсутнє розширення → `{ available: false }`.
- `types/ops.ts`, `lib/api/ops.ts`, `lib/hooks/ops/{keys,useOpsSummary,useOpsSeries,useOpsAlerts,useMuteAlert,useTestNotify,index}.ts`; ключі через фабрику `opsKeys`; `refetchInterval: 15_000`, `refetchIntervalInBackground: false`.
- Тести: усі роути 404 для не-власника; схеми відхиляють поганий `range`; `read-series` агрегує й дає p95 (чиста частина); `summary` будує `percent`/`status`; mute пише `silencedUntil`; хуки не імпортуються з компонентів (ESLint-зона).

### T2.2 Сторінка й каркас
- `app/ops/layout.tsx` (`LocaleScope namespaces={['common','ops']}`, `notFound()` для не-власника через `getAuthUserOptional` + `isPlatformAdmin`, метадані `robots: noindex`), `app/ops/page.tsx` (серверний; `PrefetchedQuery` summary), `app/ops/ops-client.tsx`; `app/robots.ts`: `Disallow: /ops`; `lib/i18n/core-namespaces.ts` + `messages/{uk,en}/ops.json` (рецепт — `docs/architecture/i18n.md`, `Namespace`-тести ключів і scope-size мають пройти).
- Тести: layout `notFound` для не-власника (мок), `robots` містить `/ops`, ключі `ops.json` однакові в uk/en.

### T2.3 Компоненти
- `components/ops/`: `OpsStatusGrid` (світлофор провайдерів + вік heartbeat, попередження «collector silent»), `LimitGauge` (шкала, %, прогноз, «n/a»), `OpsRangeTabs`, `TimeSeriesChart` (uPlot, динамічний імпорт, світла/темна тема, підписи осей, підказка, стан не лише кольором), `AlertList` (активні/історія, mute-кнопки), `DbTopTable`, `TestNotifyButton`; групи графіків за спеком §9. Додати `uplot` у залежності з фіксованою версією (`pnpm add uplot@<версія старша за 2 тижні>`; `pnpm-lock.yaml` оновити, `--frozen-lockfile` має проходити).
- Правила: використовувати наявні `components/ui`/`components/hud` кнопки/картки (raw-controls ratchet), props-budget ratchet не порушувати; без `fetch`.
- Тести: `happy-dom` для `LimitGauge` (відсотки, `null`-ліміт → «n/a»), `AlertList` (порожній стан, активний, mute-клік викликає колбек), чиста функція підготовки даних `toUplotData(series)`.

### T2.4 Адаптери Supabase / Upstash / Vercel
- Для кожного: прочитати актуальну документацію (Management API/REST) і записати результат у `docs/architecture/ops.md`; реалізувати лише те, що доступне (storage, egress, MAU, compute; команди Redis; використання функцій/трафіку). Немає API → адаптер `unavailable` з поясненням у документації; дашборд показує «n/a» + посилання на панель провайдера. Env (опціональні): `OPS_SUPABASE_ACCESS_TOKEN`, `OPS_SUPABASE_PROJECT_REF`, `OPS_UPSTASH_EMAIL`/`OPS_UPSTASH_API_KEY`/`OPS_UPSTASH_DB_ID`, `OPS_VERCEL_TOKEN`/`OPS_VERCEL_PROJECT_ID`. Токени ніколи не повертаються клієнту й не логуються.
- Тести: як T1.7 (без env, з моканим fetch, помилка мережі).

### T2.5 Сидинг і жива перевірка
- `scripts/ops/seed-fake-metrics.ts` (`tsx`, лише локальна БД: відмовляється, якщо `DATABASE_URL` не локальна): генерує 48 год хвилинних даних усіх метрик, одну активну `crit`-подію й історію, виставляє `collector.heartbeat`. Прапорець `--clean` видаляє посіяне.
- Субагент (Sonnet) у Chrome за `claude-in-chrome`: `pnpm build && pnpm start`, увійти як власник (локальний `PLATFORM_ADMIN_USER_IDS`), перевірити десктоп і мобільну ширину, всі секції, перемикання діапазонів, mute, `test-notify` (`off`), не-власник → 404; зменшені скріншоти; текст/JS-перевірки замість скрінів; прибрати посіяні дані. Результати занести в `docs/STATUS.md` (що перевірено, що ні).

**Критерії P2:** сторінка рендерить усі секції на сидингу, 404 для не-власника, графіки оновлюються без ручного перезавантаження, вкладка у фоні не поллить, мобільна верстка без горизонтального скролу, `pnpm test:run` зелений, `uplot` лише в чанку `/ops`.

---

## P3. Підготовка до навантажень (без залежності від вимірювань)

### T3.1 Профіль потужності
- `lib/config/capacity.ts`: `CAPACITY_PROFILES.free|paid` + `capacity(): CapacityConfig` (`CAPACITY_PROFILE`, кожне поле перекривається `CAP_<NAME>` env). Поля за спеком §12. Прибрати `VERCEL_CONNECTION_LIMIT`/`DEV_CONNECTION_LIMIT` із `lib/db.ts` (зберегти `PRISMA_CONNECTION_LIMIT` як перекриття), `writeTx*` у `lib/server/content/write.ts`, `BATTLE_ACTIVE_REFETCH_INTERVAL_MS` у `useBattles.ts` (клієнтські значення — лише `NEXT_PUBLIC_*`-перекриття або константи профілю, експортовані без `server-only`).
- Тести: профіль `free` відтворює поточні значення (5/10, 10 с, 30 с/5 с, 30 000 мс), `paid` вищі, env перекриває, `withSafePoolLimits` не змінив поведінки (існуючі тести).

### T3.2 Pusher-сумісний сервер і адаптивний полінг
- `lib/pusher/config.ts`: `pusherServerOptions()` і `pusherClientOptions()` читають `PUSHER_HOST/PORT/USE_TLS` і `NEXT_PUBLIC_PUSHER_WS_HOST/WS_PORT/FORCE_TLS`; без них — поточна поведінка (cluster). `server.ts`/`client.ts` використовують їх (`host`, `port`, `useTLS` / `wsHost`, `wsPort`, `wssPort`, `forceTLS`, `enabledTransports`).
- Полінг боїв: знайти, де відомий стан з'єднання Pusher (`usePusherBattleSync` і суміжні), і вимикати `refetchInterval` у `useBattles`, поки канал `subscribed`; при відключенні — полінг з експоненціальним backoff + jitter до `pollBackoffMaxMs`, пауза у фоновій вкладці. Не змінювати семантику дельт і версій.
- Тести: опції сервера/клієнта з env і без; функція інтервалу полінгу (`nextPollDelay(attempt, profile, rand)`) чиста й покрита (backoff росте, обмежується, jitter у межах).

### T3.3 Кеші з версіями в ключах
- Знайти `unstable_cache`/`revalidateTag` у `lib/cache/*` і шарових читаннях; перевести ключі на `contentVersion`/`baseVersion`, прибравши залежність коректності від `revalidateTag` між інстансами; документувати в `docs/architecture/ops.md` місце підключення спільного cacheHandler за тригером.
- Тест: два послідовні читання з різними версіями не віддають старе; той самий запис версії дає хіт.

### T3.4 Аудит rate limit і добові ліміти
- Скласти таблицю всіх викликів `checkRateLimit` / `*_RATE_LIMITS` і `failClosed`; для дорогих scope (AI, імпорт, публікація шаблону, content-copy, генерація зображень, створення кампанії) увімкнути `failClosed: true` (у проді без Redis → 503 `RATE_LIMIT_UNAVAILABLE`), решта лишається fail-open. Додати добові ліміти на користувача (створення кампаній, імпорти, публікації) у спільному місці `lib/utils/api/rate-limit.ts` з іменованими константами.
- Тести: scope з `failClosed` повертає `unavailable` без Redis у `VERCEL_ENV=production`, інші — `allowed`; добовий ліміт спрацьовує на N+1.

### T3.5 Важкі операції
- Семафор важких задач на інстанс (`lib/server/ops/heavy-limiter.ts`, ліміт із профілю): `withHeavySlot(key, fn)`, при зайнятості відповідь 429/503 з `Retry-After`; застосувати до імпорту контенту, публікації шаблону, content-copy.
- `content-copy` з `targets.all`: обмежити кількістю цілей за запит (`copyTargetsBatch`) і повертати `next` для продовження; клієнт (`useContentCopy`) дозапитує.
- Відкласти класифікацію шарового sync після публікації шаблону до відкриття екрана sync/порціями: спершу знайти, де вона зараз виконується одразу, і задокументувати, що змінено.
- Тести: семафор (N+1 отримує відмову, звільнення знімає блок), пакетування цілей `content-copy`, продовження через `next`.

### T3.6 Runbook перемикання
- `docs/runbooks/scale-up.md`: таблиця «тригер на дашборді → дія → що змінити → як перевірити» за спеком (Supabase compute/`CAPACITY_PROFILE`/`PRISMA_CONNECTION_LIMIT`, Pusher/Soketi змінні, Cloudflare Workers, Upstash, Vercel Pro, egress/R2, cacheHandler при >1 інстансі), з точними командами й посиланнями на сторінки тарифів; секція «що робити, якщо БД недоступна»; рядок про `OPS_TIER_<PROVIDER>=paid` після апгрейду (щоб шкали дашборду й пороги змінилися).

**Критерії P3:** жодних числових лімітів потужності поза `lib/config/capacity.ts`; перемикання `CAPACITY_PROFILE=paid` змінює значення без правок коду (тест); Pusher працює без змін у поточній конфігурації; `pnpm test:run` зелений.

---

## P4. Дані й рішення (лише з явною згодою власника на запуск на prodcopy)

Перед стартом виконавець називає орієнтовну вартість за токенами й нагадує про `/usage`. Усе виконується проти `prodcopy_<suffix>` (guard battle-sweep приймає такий суфікс), не проти прод-БД; прод читається лише для read-only EXPLAIN-аналізу за окремим «так».

- **T4.1 k6:** `scripts/loadtest/*.js`; сценарії: (1) 1 бій × 6 гравців, (2) 20 паралельних боїв, (3) шторм відкриття кампаній, (4) масові імпорти/копіювання, (5) відключення Pusher; метрики пишуться у `/ops`; результат — `docs/product/capacity-baseline.md` (таблиця «навантаження → p95, % помилок, з'єднання, egress на годину», оцінка ємності free/paid).
- **T4.2 Аудит індексів:** EXPLAIN (ANALYZE) для read bundle, scene, `list-battles`, шарового читання; додати відсутні індекси expand-only міграцією.
- **T4.3 Рішення про 409:** за часткою `battle.conflict` у T4.1: якщо > 2 %, реалізувати advisory lock `pg_advisory_xact_lock(hash(battleId))` у `withWrite` бою та повторити вимір; інакше записати рішення «не потрібно».
- **T4.4 Egress:** одноразовий скрипт перестиснення наявних слайдів/зображень (dry-run, бекап, звіт «до/після»); egress на годину бою — в baseline.
- **T4.5 Калібрування:** пороги `ALERT_RULES` і `PROVIDER_LIMITS` за baseline, оновити спек §7 і runbook.
- **T4.6 Бекап-вправа:** свіжий бекап → відновлення в окремий проєкт → перевірка → запис у runbook.

---

## Промпти для виконавця

Кожен — у нову сесію Sonnet (`/model sonnet`). Спільна преамбула: *«Це проєкт dnd-tracker. Читай `CLAUDE.md`, потім спек `docs/superpowers/specs/2026-11-24-ops-dashboard-and-scale-readiness-design.md` і план `docs/superpowers/plans/2026-11-24-scale-readiness-and-ops-dashboard.md` (розділ «Спільні правила» обовʼязковий). Спілкуйся українською.»*

**P1:**
> Виконай частину P1 (задачі T1.1–T1.9) з плану. Працюй у гілці `feat/ops-p1` від актуального `main` (перевір, що основна тека не зайнята іншою гілкою, інакше worktree). Перед кожною задачею повторно перевір reuse. Тести пиши, але не запускай по ходу; наприкінці: tsc, eslint по змінених файлах, `pnpm cycles`, `pnpm test:changed`, один повний `pnpm test:run`. Не пуш, не деплой, не став секретів і не деплой воркер. Наприкінці: `/simplify` на diff, оновити `docs/architecture/ops.md` і `docs/STATUS.md`, дати короткий звіт (що зроблено, що не перевірено на стенді, що має зробити власник: env-змінні, Telegram-бот, `wrangler deploy`). Зупинись, коли контекст наблизиться до ~150k, і дай промпт для нової сесії.

**P2:**
> Виконай частину P2 (T2.1–T2.5) з плану; P1 уже змерджено в `main` (перевір `git log`, що `feat/ops-p1` в `main`). Гілка `feat/ops-p2`. Жива перевірка (T2.5) — через субагента Sonnet у Chrome на локальному `pnpm build && pnpm start` з посіяними даними; прибери посіяне; результат (що перевірено і що ні) запиши в `docs/STATUS.md`. Решта правил як у P1. Закінчи звітом і переліком кроків власника (env провайдерів для адаптерів, токени).

**P3:**
> Виконай частину P3 (T3.1–T3.6) з плану; P1 змерджено. Гілка `feat/ops-p3`. Поведінка за замовчуванням (`CAPACITY_PROFILE=free`, без Pusher-змінних) має лишитись такою, як зараз: підтверди існуючими тестами й коротким порівнянням значень. Перед змінами у battle/content-copy/шаровому sync прочитай `docs/architecture/battle.md` і `content-api.md`. Решта правил як у P1.

**P4 (тільки після окремого «так» власника на запуск k6 на prodcopy):**
> Виконай частину P4 (T4.1–T4.6) з плану; P1–P3 змерджено. Спершу назви орієнтовну вартість у токенах/часі та дочекайся «так». Працюй лише з `prodcopy_<suffix>` за правилами проєкту (guard sweep), прод-БД не чіпай без окремого «так». Дані з `/ops` і результати k6 збережи в `docs/product/capacity-baseline.md`. Фінальний огляд — Opus.

## Що потрібно від власника до/під час виконання
- До P1: створити Telegram-бота (BotFather) і дати chat id (або вказати, що достатньо email); вирішити, чи потрібен email-дубль (`OPS_ALERT_EMAIL`, `OPS_ALERT_FROM`, `RESEND_API_KEY`).
- Після P1: задати env у Vercel (`OPS_COLLECT_SECRET`, Telegram/Resend), задеплоїти `infra/ops-watchdog` (`wrangler deploy`, `wrangler secret put`, KV namespace). Перевипустити Cloudflare-токен до 2026-11-26.
- Для P2-адаптерів: токени Supabase/Vercel/Upstash/Cloudflare (необов'язково; без них — «n/a»).
- Для P4: «так» на запуск k6 на prodcopy.
