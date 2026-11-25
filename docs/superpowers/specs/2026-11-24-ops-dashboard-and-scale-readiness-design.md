# Ops-дашборд і готовність до навантажень — дизайн

> Статус: затверджено до реалізації за замовчуванням (змінити можна до старту). План виконання: `docs/superpowers/plans/2026-11-24-scale-readiness-and-ops-dashboard.md`.

## 1. Цілі й не-цілі

**Цілі**
1. Сторінка `/ops` лише для власника платформи: графіки майже в реальному часі, ліміти провайдерів («використано / ліміт активного тарифу»), прогноз вичерпання, історія алертів.
2. Сповіщення на телефон при досягненні порогів і при падінні самого застосунку.
3. Перемикання free → paid без деплою коду: усі значення, залежні від потужності, живуть в одному місці й змінюються env-змінними; пороги дашборду підлаштовуються під активний тариф.
4. Підготовка коду до навантаження (пул, конкуренція, realtime, кеші, зловживання) за виміряними даними.

**Не-цілі (v1)**
- Загальні метрики кожного HTTP-запиту (p95 по маршрутах): це дає Vercel Observability. Рахуємо лише доменні метрики (бій, пул, Pusher, rate limit).
- Редагування порогів у UI (пороги в коді; в UI лише mute алерту).
- Мультикористувацький адмін-інтерфейс, ролі, аудит дій.
- Міграція з Vercel на VPS (окремий план `docs/product/infra-prod-plan-2026-10-28.md`).
- Метрики AI/MCP (backlog після v1).

## 2. Перевірені факти про поточний код (станом на 2026-11-24)

| Факт | Наслідок для дизайну |
|---|---|
| `lib/utils/api/platform-admin.ts` → `isPlatformAdmin(userId)` читає `PLATFORM_ADMIN_USER_IDS`; на проді змінну додано | Власник вже визначається; нового поняття не вводимо |
| `requirePlatformAdmin` є в `AUTH_CALLS` у `lib/__tests__/route-auth-ratchet.test.ts`, але функції немає | Створити з цією назвою: ratchet пропустить роути |
| `lib/db.ts`: `connection_limit=5` (Vercel) / 10 (dev), `pool_timeout` 10 с; `PRISMA_CONNECTION_LIMIT` — єдиний override | База для профілю потужності |
| `lib/server/content/write.ts`: транзакція `timeout 30_000`, `maxWait 5_000` | Параметри винести в профіль потужності |
| Помилки Prisma `P2024`/`P1001` ніде не рахуються й не розрізняються | Новий лічильник у `handleApiError` |
| `lib/pusher/config.ts` знає лише `cluster`; `server.ts`/`client.ts` без host/port | Для Soketi потрібен код (host/port/TLS через env) |
| `BATTLE_ACTIVE_REFETCH_INTERVAL_MS = 30_000` у `lib/hooks/battles/useBattles.ts`; є `options.pausePolling` | Полінг адаптувати до стану Pusher |
| `useBattleAction.ts`: один повтор після 409, лише для ідемпотентних дій | Аналізуємо частку 409 перед зміною |
| `checkRateLimit` має `failClosed`/`memoryFallback`, `RATE_LIMIT_ALLOW_MEMORY`, відповідь 503 `RATE_LIMIT_UNAVAILABLE` | Fail-closed уже є; лишається аудит, які scope його вмикають |
| Cron `app/api/cron/assistant-cleanup`: `CRON_SECRET` + `bearerToken` + `safeEqual` | Зразок автентифікації для `/api/ops/collect` |
| `app/api/health`: `?deep=1` + `HEALTH_SECRET` | Використовує зовнішній сторож |
| `vercel.json`: 1 cron на добу | Хвилинний збір неможливий на Hobby → зовнішній планувальник |
| `infra/media-worker` — Cloudflare Worker (`wrangler.toml`, тести в `__tests__`) | Окремий воркер `infra/ops-watchdog` за тим самим зразком |
| Пакетів `resend`, `uplot`, `recharts` немає; Resend використовується лише в Supabase SMTP | Email через REST `fetch`; uPlot додати залежністю |
| `proxy.ts` для `/api/*` робить лише CSRF-перевірку, сесію не оновлює | Авторизація в самих роутах; для сторінки `/ops` — у серверному layout |
| Нові namespace i18n: `lib/i18n/core-namespaces.ts` + `LocaleScope` у `layout.tsx` сегмента (рецепт — `docs/architecture/i18n.md`) | `app/ops/layout.tsx` з власним `LocaleScope` |
| Міграції: останні `20261224000000/1`; кожна `CREATE TABLE` + `ENABLE ROW LEVEL SECURITY`; моделі в `prisma/schema/core.prisma` з `@@map` | Нова міграція `20261225000000_ops_metrics` або пізніша |
| Таблиці `campaign_active_sessions` немає (є ендпоїнт `active-battles`) | «Активні користувачі» не метрика; беремо `app.active_battles` |

Невідомі зовнішні факти, **які виконавець перевіряє перед відповідною задачею** (позначено «перевірити»): конкретні ендпоїнти usage в Supabase Management API, Upstash Management API, Vercel REST API; чи віддає Pusher HTTP API кількість з'єднань; актуальні ліміти безкоштовних тарифів; чи доступний `pg_stat_statements` для ролі застосунку. Якщо API немає, адаптер повертає `unavailable`, дашборд показує «n/a» з посиланням на дашборд провайдера. Це не блокує решту.

## 3. Архітектура

```
Vercel instances ──(in-process buffer, flush ≤1/30 s via after())──► ops_metric_buckets
                                                                           ▲
Cloudflare Worker "ops-watchdog" (cron * * * * *)                          │
   ├─ POST /api/ops/collect  (Bearer OPS_COLLECT_SECRET) ─► collector:     │
   │      DB gauges (pg_stat_*) + provider adapters ───────────────────────┘
   │      → evaluate alert rules → ops_alert_state → notifiers (Telegram, Resend)
   ├─ GET  /api/health?deep=1 (HEALTH_SECRET)
   └─ app down / collect fails 3× → Telegram directly from the Worker (dedupe via KV)

Owner browser ─► /ops (server guard) ─► /api/ops/{summary,series,alerts,db-top} ─► hooks ─► uPlot
```

Принципи:
- **Сторож зовнішній.** Алерт «застосунок мовчить» не може залежати від самого застосунку.
- **Запис метрик ніколи не ламає запит.** Усі помилки флашу ковтаються й логуються.
- **Мінімум навантаження на БД.** ≤ 1 запис на інстанс за 30 с; колектор робить кілька легких запитів на хвилину.
- **Кардинальність обмежена.** Метрики й їхні мітки описані в каталозі; невідома метрика/мітка відкидається.

## 4. Модель даних (міграція expand-only, RLS на кожній таблиці)

Усі три таблиці: `ENABLE ROW LEVEL SECURITY` без політик (доступ лише через Prisma), без FK на користувачів (метрики не містять PII).

**`ops_metric_buckets`** (`@@map("ops_metric_buckets")`)
- `bucket DateTime` (початок хвилини, UTC), `metric String`, `labels String` (канонічно `k=v,k=v`, ключі відсортовані, порожній рядок = без міток), `n Int`, `sum Float`, `max Float`.
- `@@id([bucket, metric, labels])`, `@@index([metric, bucket])`.
- Семантика: лічильник `incr(by)` → `n+=1, sum+=by`; gauge `gauge(v)` → `n+=1, sum+=v, max=max(max,v)` (значення = `sum/n`); таймінг → набір лічильників (див. §5).

**`ops_metric_hourly`**: те саме, `bucket` = початок години. Ролап: `sum(n), sum(sum), max(max)`.

**`ops_alert_state`**: `rule String @id`, `status String` (`ok|warn|crit`), `since DateTime`, `breachSince DateTime?`, `lastValue Float?`, `lastNotifiedAt DateTime?`, `lastNotifiedStatus String?`, `silencedUntil DateTime?`, `updatedAt DateTime @updatedAt`.

**Ретеншн** (зменшує розмір: Supabase Free має 500 МБ): хвилинні бакети 48 год, погодинні 90 днів. Ролап і очищення виконує колектор раз на годину (мінута 0) і щоденний cron `assistant-cleanup` як страховка. Оцінка: ≈ 60 серій × 1 440 хв × 2 дні ≈ 170 тис. рядків (≈ 15–20 МБ), погодинні ≈ 130 тис. (≈ 10 МБ). Метрика `db.size_bytes` і алерт на розмір контролюють це.

## 5. Каталог метрик (`lib/ops/metrics-catalog.ts`)

Тип `MetricKey` — union ключів каталогу; `incr/gauge/observe` приймають лише їх. Для кожної: `kind` (`counter|gauge|timing`), дозволені `labels` зі значеннями-переліками.

Таймінг `observe(key, ms, labels)` пише лічильники `key:count`, `key:sum`, `key:le` з міткою `le` ∈ `50,100,200,400,800,1600,3200,inf` (некумулятивно, перший поріг ≥ ms). p50/p95/max читання обчислює з цих лічильників (інтерполяція всередині бакета).

| Ключ | Вид | Мітки | Де пишемо |
|---|---|---|---|
| `battle.mutation` | timing | `op` (з `operation` у `runBattleMutation`) | обгортка `withWrite` у `lib/server/battles/run-mutation.ts` / pipeline deps |
| `battle.conflict` | counter | — | `battleErrorResponse` для `BattleConflictError` |
| `db.pool_timeout` | counter | — | `handleApiError`: Prisma `P2024` |
| `db.unreachable` | counter | — | `handleApiError`: `P1001`, `P1002`, `P1017` |
| `api.error5xx` | counter | `kind` ∈ `prisma,other` | `handleApiError` |
| `pusher.trigger` | counter | `result` ∈ `ok,fail` | `lib/pusher/safe-trigger.ts` |
| `ratelimit.denied` | counter | `scope` (з переліку `BATTLE_RATE_LIMITS` + `other`) | `checkRateLimit` |
| `ratelimit.degraded` | counter | `mode` ∈ `open,closed` | `degraded()` у `rate-limit.ts` |
| `db.connections` | gauge | `state` ∈ `active,idle,idle_in_tx,total` | колектор (`pg_stat_activity`) |
| `db.max_connections` | gauge | — | колектор |
| `db.longest_tx_s` | gauge | — | колектор |
| `db.waiting_locks` | gauge | — | колектор |
| `db.size_bytes` | gauge | — | колектор |
| `db.cache_hit_ratio` | gauge | — | колектор |
| `db.deadlocks` | gauge (кумулятивний) | — | колектор (`pg_stat_database`) |
| `app.active_battles` | gauge | — | колектор (кількість боїв зі статусом, що полінгується) |
| `provider.<name>.<metric>` | gauge | — | адаптери (§6) |
| `collector.heartbeat` | gauge | — | колектор (кожен запуск) |

## 6. Ліміти й тарифи (`lib/ops/limits.ts`)

```ts
type Provider = 'supabase' | 'vercel' | 'pusher' | 'upstash' | 'cloudflare';
type Tier = 'free' | 'paid';
type LimitKey = string; // e.g. 'connections', 'messagesPerDay', 'dbBytes', 'egressBytesPerMonth', 'requestsPerDay', 'commandsPerMonth'
type Limit = { value: number | null; unit: 'count' | 'bytes'; period: 'now' | 'day' | 'month' };
PROVIDER_LIMITS: Record<Provider, Record<Tier, Record<LimitKey, Limit>>>
activeTier(provider): Tier   // env OPS_TIER_<PROVIDER>, default 'free'
```

Початкові значення беруться з поточних публічних тарифів провайдерів (виконавець звіряє зі сторінками тарифів і записує дату перевірки в коментарі-однорядку). `value: null` = «без жорсткого ліміту / невідомо»; шкала тоді не малюється. Тести перевіряють форму структури й що `activeTier` реагує на env, а не конкретні числа.

Для `paid` Supabase ємність пулу залежить від compute: `db.max_connections` береться з БД (gauge), а не з конфіга.

## 7. Алерти (`lib/ops/alert-rules.ts`)

```ts
type AlertRule = {
  id: string;
  metric: MetricKey | DerivedMetric;       // derived: ratio, percent-of-limit, forecast
  window: '1m' | '5m' | '15m' | '1h';
  agg: 'sum' | 'avg' | 'max' | 'p95' | 'ratio';
  warn?: number; crit?: number;            // abs value or fraction of limit
  forMinutes: number;                      // condition must hold this long
  cooldownMinutes: number;                 // re-notify while crit
  severityNote: string;                    // one line shown in messages
};
```

Правила за замовчуванням (пороги для «від ліміту» беруться з `limits.ts` активного тарифу):

| id | Умова | warn | crit | for |
|---|---|---|---|---|
| `db.connections` | `total / max_connections` | 0.7 | 0.9 | 2 хв |
| `db.pool_timeout` | `sum db.pool_timeout`, 5 хв | ≥1 | ≥10 | 0 |
| `db.unreachable` | `sum db.unreachable`, 5 хв | ≥1 | ≥3 | 0 |
| `db.longest_tx` | `max db.longest_tx_s` | 10 | 30 | 1 хв |
| `db.size` | `db.size_bytes / limit` | 0.7 | 0.9 | 0 |
| `battle.p95` | p95 `battle.mutation`, 5 хв | 750 мс | 2000 мс | 3 хв |
| `battle.conflict_rate` | `battle.conflict / battle.mutation:count`, 5 хв | 0.02 | 0.1 | 3 хв |
| `api.5xx` | `sum api.error5xx`, 5 хв | 10 | 50 | 0 |
| `pusher.messages_day` | оцінка (trigger × fan-out) / ліміт | 0.7 | 0.9 | 0 |
| `pusher.trigger_fail` | `sum pusher.trigger{result=fail}`, 5 хв | ≥5 | ≥30 | 0 |
| `ratelimit.degraded` | `sum ratelimit.degraded`, 5 хв | ≥1 | ≥20 | 0 |
| `provider.cloudflare.requests_day` | / ліміт | 0.7 | 0.9 | 0 |
| `provider.*` (кожен адаптерний із ліміту) | / ліміт | 0.7 | 0.9 | 0 |
| `collector.silent` | `now − collector.heartbeat` | 3 хв | 10 хв | 0 |
| `secrets.expiry` | дні до дати з `lib/ops/expiries.ts` | 14 | 3 | 0 |

Калібрування P4 (2026-11-25, [capacity-baseline](../../product/capacity-baseline.md)): `battle.p95` 1500/3000 → 750/2000 мс (локальний p95 33–49 мс у тиші (36–118 мс p95 окремих прогонів), 690 мс на перевантаженому хості, плюс запас на мережу до pooler); `battle.conflict_rate` 0.05/0.15 → 0.02/0.1 (виміряно 0 %, 2 % — поріг рішення про advisory lock). Решта порогів і `PROVIDER_LIMITS` лишаються: локальний стенд не вимірює з'єднання pooler, егрес провайдерів і тарифні ліміти; значення лімітів — публічні тарифи, власник має звірити.

Оцінка повідомлень Pusher: `triggers_за_добу × OPS_PUSHER_FANOUT` (env, за замовчуванням 6), на дашборді підписана «estimate».

**Стан-машина:** кожну хвилину значення порівнюється з порогами → цільовий статус. Перехід у `warn`/`crit` лише коли умова тримається `forMinutes` (через `breachSince`). Сповіщення: перехід вгору (ok→warn, warn→crit, ok→crit), перехід у `ok` («resolved»), повтор для `crit` не частіше `cooldownMinutes`. `silencedUntil > now` → стан оновлюється, сповіщення не шлеться. Якщо надсилання не вдалося, `lastNotifiedAt` не оновлюється, і наступний тік повторює спробу.

Зовнішній сторож (воркер): `health?deep=1` не 200 або `collect` не відповідає, 3 спроби по 5 с; якщо всі невдалі → повідомлення «app down», дедуплікація через KV (`down` ключ із TTL 30 хв); відновлення → одне повідомлення «recovered».

## 8. HTTP API (`app/api/ops/*`, усе `privateJson`/`force-dynamic`)

| Маршрут | Доступ | Призначення |
|---|---|---|
| `POST /api/ops/collect` | `Bearer OPS_COLLECT_SECRET` (`safeEqual`), без сесії | Збір + ролап + оцінка алертів. Відповідь `{ ok, adapters: Record<string,'ok'\|'unavailable'\|'error'>, evaluated, notified }`. Адаптери через `Promise.allSettled`, таймаут 8 с на адаптер |
| `GET /api/ops/summary` | `requirePlatformAdmin` | Провайдери: поточне значення, ліміт активного тарифу, `percent`, `status`, `forecastHours`, `unavailable`; останній heartbeat; активні алерти |
| `GET /api/ops/series?metrics=a,b&range=1h\|6h\|24h\|7d` | admin | Масиви `{ t, v }`; ≤ 240 точок (агрегація на сервері); `metric:p95`/`:p50`/`:rate` — похідні |
| `GET /api/ops/alerts?limit=` | admin | Стан правил + історія (останні N переходів із `ops_alert_events`, див. нижче) |
| `POST /api/ops/alerts/[rule]/mute` `{ minutes: 60\|1440\|0 }` | admin | `silencedUntil` |
| `POST /api/ops/test-notify` | admin | Надіслати тестове сповіщення в усі налаштовані канали, повернути результат по каналу |
| `GET /api/ops/db-top` | admin | Топ-10 `pg_stat_statements` (`total_exec_time`), текст запиту обрізано до 200 символів; без `pg_stat_statements` → `{ available:false }` |

Історія переходів: додаткова таблиця `ops_alert_events (id cuid, rule, from, to, value, at, notified Boolean)`, ретеншн 90 днів (RLS так само; додається в ту саму міграцію).

Автентифікація власника: `requirePlatformAdmin()` (`lib/utils/api/require-platform-admin.ts`) бере `getSessionUserId()`, перевіряє `isPlatformAdmin`, у разі невдачі повертає 404 (не 403). Помилки через `errorResponse` з текстами з `lib/constants/api-errors.ts`.

## 9. UI `/ops`

- Сервер: `app/ops/layout.tsx` (`LocaleScope namespaces=['common','ops']`, `notFound()` для не-власника), `page.tsx` (серверний, `PrefetchedQuery` для summary), `ops-client.tsx` (`"use client"`). `robots.ts` додає `Disallow: /ops`, сторінка має `robots: noindex`.
- Шари (CLAUDE.md): `app/api/ops/*` → `lib/api/ops.ts` → `lib/hooks/ops/` (`keys.ts`, `useOpsSummary`, `useOpsSeries`, `useOpsAlerts`, `useMuteAlert`, `useTestNotify`, `index.ts`) → `components/ops/*`; типи `types/ops.ts`. Компоненти не імпортують `@/lib/api/*` і не викликають `fetch`.
- Живе оновлення: TanStack Query `refetchInterval: 15_000`, `refetchIntervalInBackground: false` (вкладка прихована → зупинка). Pusher не використовується (D6).
- Секції: (1) «Стан зараз» (світлофор провайдерів, вік останнього збору, попередження, якщо heartbeat старший за 3 хв); (2) «Ліміти» (шкала, відсоток, прогноз, «n/a» із посиланням); (3) «Графіки» (діапазони 1 г / 6 г / 24 г / 7 д; групи: База даних, Бій, Realtime, Провайдери); (4) «Повільні запити та довгі транзакції»; (5) «Алерти» (активні, історія, mute 1 г/24 г); (6) кнопка «Тест сповіщення».
- Дизайн за skill `dataviz` (світла/темна тема, стан не лише кольором, підписи осей, підказки). Мобільна верстка обов'язкова: власник дивиться з телефона. Графіки: `uplot`, динамічний імпорт лише в `/ops`, не потрапляє в основний бандл.
- Тексти лише через `messages/{uk,en}/ops.json`; кирилиці в коді немає (ESLint); тест ключів.

## 10. Безпека й приватність

- У метриках немає PII (жодних email/ім'я/id користувача/id кампанії/тексту запитів з даними); `db-top` повертає лише нормалізований текст `pg_stat_statements`, обрізаний.
- Секрети (`OPS_COLLECT_SECRET`, `OPS_TELEGRAM_BOT_TOKEN`, `OPS_TELEGRAM_CHAT_ID`, `RESEND_API_KEY`, токени провайдерів) лише в env, ніколи в логах, помилках, відповідях і повідомленнях алертів. Ключ провайдера AI до цієї підсистеми не стосується.
- `/api/ops/collect` порівнює секрет через `safeEqual`; без налаштованого секрету → 503 (як `CRON_NOT_CONFIGURED`).
- Не-власник отримує 404 на сторінці й на всіх `/api/ops/*` (крім `collect`, де 401).
- Нові endpoints додаються в `lib/__tests__/route-auth-ratchet.test.ts` автоматично через `requirePlatformAdmin`/перевірку секрету (для `collect` — додати виняток за зразком cron-роуту, якщо ratchet цього потребує).

## 11. Обробка збоїв

| Збій | Поведінка |
|---|---|
| Flush метрик не вдався | `logger.warn`, буфер скидається, запит не страждає |
| `after()` поза request scope | fallback `void flush()` (як у `notifications.md`) |
| Адаптер провайдера впав/таймаут | `error`/`unavailable` у відповіді, решта працює, у дашборді «n/a» |
| БД недоступна під час збору | heartbeat не пишеться → сторож/правило `collector.silent` шле алерт |
| Telegram недоступний | спроба Resend; якщо обидва впали, `lastNotifiedAt` не оновлюється, повтор наступного тіку |
| Воркер не може достукатись до застосунку | Telegram напряму з воркера |
| Не налаштовано жодного каналу | `test-notify` повертає `not_configured`, алерти пишуться лише в `ops_alert_events` |

## 12. Готовність до навантажень (блок B) — рішення

Деталі й критерії — в плані. Рішення дизайну:
- **Профіль потужності** `lib/config/capacity.ts`: `CAPACITY_PROFILE=free|paid` (за замовчуванням `free`), кожне значення профілю перекривається окремою env. У профілі: `dbConnectionLimit`, `dbPoolTimeoutSec`, `writeTxTimeoutMs`, `writeTxMaxWaitMs`, `battlePollMs`, `pollBackoffMaxMs`, `maxHeavyJobsPerInstance`, `copyTargetsBatch`. Розсипані константи прибираються.
- **Pusher-сумісний сервер:** `PUSHER_HOST`, `PUSHER_PORT`, `PUSHER_USE_TLS` (сервер) і `NEXT_PUBLIC_PUSHER_WS_HOST`, `NEXT_PUBLIC_PUSHER_WS_PORT`, `NEXT_PUBLIC_PUSHER_FORCE_TLS` (клієнт); без них — поточна поведінка (cluster).
- **Полінг боїв:** вмикається лише коли канал Pusher не `connected` (або ключа немає); експоненціальний backoff із jitter, пауза у фоновій вкладці.
- **Кеші:** ключі контенту будуються з версії (`contentVersion`/`baseVersion`) замість `revalidateTag`; спільний cacheHandler на Redis — за тригером «>1 інстанс» (runbook), не зараз.
- **409 у бою:** рішення про advisory lock `pg_advisory_xact_lock(hash(battleId))` приймається лише за виміряною часткою 409 (критерій < 2 % при реалістичному навантаженні).
- **Зловживання:** аудит `failClosed` по scope (дорогі: AI, імпорт, публікація, content-copy, генерація зображень, створення кампаній); добові ліміти на користувача; семафор важких задач на інстанс; `content-copy {all:true}` — частинами.
- **Тривалі операції:** класифікація sync шарових кампаній після публікації шаблону — відкладено до відкриття екрана sync/порціями.

## 13. Тестування

- Чисті функції (канонізація міток, p95 з бакетів, агрегація серій, прогноз, стан-машина алертів, лімити/тарифи) — unit-тести в `__tests__/` поруч.
- Колектор і ендпоїнти: інтеграційні тести з локальною БД там, де вони вже є в проекті (за зразком `*.integration.test.ts`), решта — з мок-`prisma`.
- Роути: 404 для не-власника, 401 без секрету `collect`, форма відповіді.
- Воркер: чиста логіка (рішення «down/recovered», дедуплікація) тестується у `infra/ops-watchdog/__tests__`; сам cron перевіряється вручну через `wrangler dev --test-scheduled`.
- UI: тест із `happy-dom` на компоненти шкали ліміту й списку алертів; живу перевірку виконує субагент у браузері за даними зі скрипта сидингу (`scripts/ops/seed-fake-metrics.ts`), бо справжнього навантаження локально немає.
- Агенти-виконавці тести не запускають (правило проекту); один повний прогін наприкінці кожної частини.

## 14. Ризики

| Ризик | Пом'якшення |
|---|---|
| Метрики з'їдають БД (Free 500 МБ) | ретеншн 48 год/90 днів, каталог мітоК, `db.size_bytes` алерт |
| Колектор сам навантажує пул | запити легкі, один виклик/хв, `connection_limit` не збільшуємо |
| Токен Cloudflare закінчується 2026-11-26 | `expiries.ts` + алерт, перевипуск власником |
| API провайдерів змінюються/відсутні | адаптери ізольовані, `unavailable` не блокує |
| Telegram/Resend лежать | два канали + повтор |
| Алерт-шторм | `forMinutes`, `cooldownMinutes`, mute |
| Хибний фан-аут Pusher | позначено «estimate», `OPS_PUSHER_FANOUT` налаштовується |
