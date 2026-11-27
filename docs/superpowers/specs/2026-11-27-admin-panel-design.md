# Адмін-панель власника — дизайн

> Статус: затверджено власником 2026-11-27 (усно, по секціях). Гілка `feat/admin-panel` від `main` (worktree `../dnd-tracker-admin`). План: пишеться наступним кроком.

## 1. Цілі й не-цілі

**Цілі**
1. Одна сторінка `/admin` для власника з вкладками **Огляд · Юзери · Безпека · Ops**; поточний `/ops` стає вкладкою.
2. Аналітика продукту: реєстрації, видалення, активні юзери, створення контенту, утримання.
3. Керування юзерами: таблиця, картка (кампанії, шаблони, персонажі, IP/пристрої, активність), дії — бан/розбан, вихід з усіх сесій, видалення акаунта.
4. Виявлення мультиакаунтів: спільні IP між акаунтами, повторні реєстрації після видалення.

**Не-цілі (v1)**
- Дохід/підписки: білінгу ще нема. Колонка «Підписка» = «—», плитка «Дохід» = «не підключено»; вкладка «Дохід» з'явиться з епіком білінгу.
- Вхід адміна у справжній UI кампанії (read-only bypass у `requireCampaignAccess`): замість нього — адмін-зведення кампанії. Окремий підпроєкт, якщо знадобиться.
- Автоматичні бани, денні снепшоти аналітики, polling.
- Миттєвий кік забаненого юзера (див. §6).

## 2. Що перевикористовуємо

| Що | Де | Як |
|---|---|---|
| Доступ власника | `lib/utils/api/ops-access.ts` (`isOpsAdmin`), `require-platform-admin.ts`, `lib/server/ops/page-guard.ts` | перейменувати в `isAdmin`/`assertAdmin`, старі імена — аліаси |
| Ops-дашборд | `app/ops/*`, `components/ops/*`, `lib/hooks/ops/`, `/api/ops/*` | переноситься лише сторінка в `/admin/ops`; компоненти/хуки/API без змін |
| Графіки | `UplotChart` (`next/dynamic`, `ssr: false`) | для графіків «Огляду» і міні-графіка активності |
| Видалення акаунта | `lib/server/account/delete-account.ts`, `template-guard.ts` | адмінське видалення = той самий `deleteAccount` з `by: 'admin'` |
| Supabase Admin | `lib/supabase/admin.ts` (`createAdminClient`) | бан, вихід із сесій |
| Prune | `rollupAndPrune` (`lib/server/ops/rollup.ts`) | чистить `user_access` > 180 д і `user_activity_days` > 400 д |
| Перша відповідь | `PrefetchedQuery` | як у `/ops` |
| UI-кіт | `components/ui/{tabs,confirm-dialog,badge,card,…}` | без нових примітивів |

Нове потрібне, бо зараз у БД нема ні історії входів/IP, ні слідів видалених юзерів (`users` має лише `createdAt`).

## 3. Маршрути й доступ

- Сторінки: `/admin` (Огляд), `/admin/users`, `/admin/users/[id]`, `/admin/campaigns/[id]`, `/admin/security`, `/admin/ops`. `app/admin/layout.tsx` — вкладки, `LocaleScope` (`common`, `admin`, `ops`), `noindex`.
- `/ops` → редирект 308 на `/admin/ops`. Посилання в профілі веде на `/admin`.
- Кожна сторінка і layout викликають `assertAdmin()` (layout і page рендеряться паралельно — правило з ops.md). Не-адмін → 404. `robots.ts`: disallow `/admin`.
- API `/api/admin/*`: `requirePlatformAdmin`, `privateJson`, `force-dynamic`, тонкий `route.ts` + хелпери в `lib/server/admin/`. Шар: `lib/api/admin.ts` → `lib/hooks/admin/` (`adminKeys`) → `components/admin/*`.

## 4. Дані

Міграція expand-only, усі таблиці з `ENABLE ROW LEVEL SECURITY`, без політик.

- **`user_access`** — PK (`userId`, `ip`); `country` (2 літери або null), `device` (короткий рядок «Chrome · macOS»), `firstSeen`, `lastSeen`, `days` (int). FK на `users` з `ON DELETE CASCADE`. Індекси: `ip`, `lastSeen`. Ретеншн 180 днів за `lastSeen`.
- **`user_activity_days`** — PK (`userId`, `day` date UTC). Cascade. Індекс `day`. Ретеншн 400 днів.
- **`account_deletions`** — `id`, `deletedAt`, `by` (`self` | `admin`), `accountAgeDays`, `campaigns` (int), `emailHash` (HMAC-SHA256 з `ADMIN_HASH_SECRET` від lower(email); null, якщо секрету нема). Без FK (юзера вже нема), без PII у відкритому вигляді. Пишеться всередині транзакції `deleteAccount`.
- **`admin_actions`** — `id`, `at`, `adminUserId`, `action` (`ban` | `unban` | `signout` | `delete`), `targetUserId` (без FK — ціль може бути видалена), `meta` jsonb (тривалість бану, email цілі на момент видалення — лише в цій таблиці, видимій власнику).

**Збір активності** (`proxy.ts`, лише навігації сторінок, не `/api`):
- Якщо після `updateSession` є юзер і cookie `cn_seen` ≠ `<userId>:<YYYY-MM-DD UTC>`: у фоні (`waitUntil` з `@vercel/functions`, поза Vercel — без очікування з `catch`) upsert `user_access` (`days` +1, якщо `lastSeen` < сьогодні) і insert-ignore `user_activity_days`; поставити cookie (httpOnly, до кінця доби UTC).
- IP: перший елемент `x-forwarded-for`, далі `x-real-ip`; країна: `x-vercel-ip-country`. Без IP — пишемо лише `user_activity_days`.
- Помилка запису логується (без IP у лозі) і не впливає на відповідь.
- Pure-частини в `lib/utils/admin/`: `parseClientIp(headers)`, `parseDevice(ua)`, `shouldTouch(cookie, userId, now)`.
- Історії до деплою нема; графіки показують «дані з <дата старту>».

## 5. Вкладка «Огляд»

`GET /api/admin/overview?range=7d|30d|90d` — агрегатні SQL (`count`, `date_trunc('day')`), без кешу в таблицях. Хук: один запит при відкритті + кнопка «Оновити», без polling.

- **Плитки** (з дельтою до попереднього періоду): юзерів усього, нових, видалених, чистий приріст; DAU/WAU/MAU і DAU/MAU; кампаній усього/нових, шаблонів; боїв за період; юзерів з AI-ключем; активованих (створив кампанію або вступив у неї ≤ 7 днів після реєстрації, %); «Дохід — не підключено».
- **Графіки:** реєстрації ↑ / видалення ↓ по днях + лінія total; DAU + ковзні WAU/MAU; контент по днях (кампанії, бої, персонажі).
- **Когорти:** тижні реєстрації × частка активних на тижнях 1/2/4 (з `user_activity_days`).
- **Розрізи:** юзери за `locale`, кампанії за системою правил, топ-країни за 30 днів.
- Pure-логіка: бінінг серій, ковзні вікна, когортна математика — `lib/utils/admin/`.

## 6. Вкладка «Юзери», картка, дії

**Таблиця** — `GET /api/admin/users?q=&sort=&filter=&cursor=` (Zod), по 50, курсор.
- Колонки: ім'я/аватар, email, реєстрація, остання активність, кампаній DM / шаблонів / участей, персонажів, остання країна, статус (активний/заблокований до…), підписка «—», прапорець «спільний IP» (IP юзера бачили в іншого акаунта за 30 днів).
- Пошук: ім'я, email, id. Сортування: реєстрація, активність, кампанії. Фільтри: заблоковані, спільний IP, неактивні 30+ днів, без кампаній, з AI-ключем.
- Бан і останній вхід — join з `auth.users` (`banned_until`, `last_sign_in_at`). Перевірити на проді read-only на етапі плану; якщо роль не читає `auth` — Admin API `listUsers` (пакетно по id сторінки). Якщо недоступно — «n/a», решта працює.

**Картка** `/admin/users/[id]` — `GET /api/admin/users/[id]`:
- Шапка: ім'я, email, id, мова, часовий пояс, реєстрація, останній вхід, остання активність, статус, підписка «—».
- Власні кампанії (назва, кампанія/шаблон, система, гравців, створена, змінена → зведення), кампанії-участі (з DM).
- Шаблони: версії, кількість клонів, чи блокують видалення (`findBlockingTemplates`).
- Активність: міні-графік днів за 90 днів.
- IP і пристрої з `user_access` + «ще N акаунтів на цьому IP» з посиланнями.
- Журнал `admin_actions` по цьому юзеру.

**Дії** — `POST /api/admin/users/[id]/{ban,unban,signout}`, `DELETE /api/admin/users/[id]`. Кожна через `ConfirmDialog`, кожна пише `admin_actions`; дія над собою → 400.
- Бан: `auth.admin.updateUserById(id, { ban_duration })`, варіанти 24h / 168h / `876000h` («назавжди»), одразу виконує вихід із сесій. Розбан: `ban_duration: 'none'`.
- Вихід із сесій: видалення сесій юзера через Admin API, фолбек `DELETE FROM auth.sessions WHERE user_id = $1`.
- Обмеження: JWT перевіряється локально (`getClaims`), тож виданий access token діє до свого закінчення (≤ 1 год за замовчуванням), refresh вже не пройде. UI підписує «набуде чинності протягом години». Миттєву перевірку в БД на кожен запит не робимо.
- Видалення: `deleteAccount(id, { by: 'admin' })`; підтвердження введенням email юзера; `AccountDeleteBlockedError` → список чужих кампаній-клонів, як у юзера.
- Supabase Admin недоступний (нема ключа / мережа) → 503, у журнал не пишемо.

**Зведення кампанії** `/admin/campaigns/[id]` — `GET /api/admin/campaigns/[id]`, лише читання: власник, тип, система, статус, дати, учасники (→ картки), лічильники (персонажі, бої, карти, сторінки сценарію, юніти, закляття), обсяг файлів у storage (перевикористати підрахунок з `storage-cleanup.ts`), для шаблону — клони й версії.

## 7. Вкладка «Безпека»

`GET /api/admin/security?days=7|30|90`, лише показ:
- Групи спільних IP: IP з 2+ акаунтами за період — акаунти, країна, пристрої, спільні дні; сортування за кількістю акаунтів. 5+ акаунтів → мітка «ймовірно NAT/VPN/публічна мережа».
- Повторні реєстрації: юзери, чий HMAC email збігається з `account_deletions.emailHash`.
- Стрічка останніх `admin_actions`.
- Pure-групування — `lib/utils/admin/shared-ip.ts`.

## 8. Помилки, i18n, приватність

- Помилки — `{ error, issues? }` з ключами в `lib/constants/api-errors.ts`; не-адмін — 404 на всьому `/api/admin/*`, окрім `GET /api/admin/me`: він завжди відповідає `200 { isAdmin }` і розкриває лише власний біт викликача (виняток за рішенням власника).
- i18n: namespace `admin` (uk/en), додати в core namespaces як `ops`; тексти ops лишаються в `ops`. Whats-new не потрібен (не для юзерів).
- Політика приватності (uk/en): рядок про зберігання IP, країни й типу пристрою 180 днів для безпеки акаунтів.
- IP ніколи не потрапляє в логи й відповіді не-адмінам.

## 9. Тести

- Pure (`lib/utils/admin/__tests__`): `parseClientIp`, `parseDevice`, `shouldTouch`, бінінг/ковзні вікна, когорти, групування спільних IP, HMAC email.
- Роути: 404 не-адміну на кожному `/api/admin/*`, Zod-валідація, заборона дій над собою, запис `admin_actions`, 503 без Admin-клієнта, `route-auth-ratchet` бачить нові роути.
- Інтеграційні (локальна БД): `account_deletions` пишеться при само- і адмін-видаленні; upsert `user_access` ідемпотентний у межах доби і рахує `days`; prune видаляє старі рядки.
- UI: guard-тест `/admin` (як `app/ops/__tests__/guard.test.tsx`), редирект `/ops`.
- Скрипт `scripts/admin/seed-fake-activity.ts` (лише локальна БД, відмовляє на інших хостах) для live-перевірки.

## 10. Розкатка й порядок

- Env: новий `ADMIN_HASH_SECRET` (опційний — без нього `emailHash` = null). Решта вже є (`SUPABASE_SERVICE_ROLE_KEY`, `OPS_ADMIN_EMAILS`/`PLATFORM_ADMIN_USER_IDS`).
- Міграція їде звичайним прод-деплоєм з `main`.
- Гілка від `main` (уже містить `feat/ops-vercel-pro`, 25d51ae58); переїзд `app/ops` переносить лише сторінку, `components/ops` не переписується.
- Частини плану:
  - **Ч1** — каркас `/admin` з вкладками, переїзд ops, доступ, міграція 4 таблиць, збір активності в `proxy.ts`, `account_deletions` у `deleteAccount`, prune. Деплоїти якомога раніше, щоб пішли дані.
  - **Ч2** — «Огляд».
  - **Ч3** — «Юзери», картка, дії, зведення кампанії.
  - **Ч4** — «Безпека».
- Перевірка: локально на prodcopy з сідингом, потім live на проді в браузері (вкладки, дії на тестовому акаунті).
