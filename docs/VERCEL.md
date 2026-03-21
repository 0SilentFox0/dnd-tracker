# Деплой на Vercel

## Швидкий troubleshooting

### Персонажі / дані є локально, на проді немає

Див. також **`docs/DATABASE-SYNC.md`** (одна БД vs копіювання дампу).

Це майже завжди **різні бази**. Порівняй рядки підключення (без пароля):

- **Vercel** → Project → Settings → Environment Variables → **Production** → `DATABASE_URL`
- Локально: `.env.local` або `.env` → `DATABASE_URL`

Мають збігатися **хост** (напр. `aws-…pooler.supabase.com` або `db.xxx.supabase.co`), **ім’я БД**, **користувач / project ref**. Якщо локально інший Supabase-проєкт або branch — дані не з’являться на проді навіть після успішного деплою.

### Деплой падає з P3005 (`prisma migrate deploy`)

1. У репозиторії в `vercel.json` має бути **`prisma generate && next build`** без `migrate deploy`. Якщо так і є, але в логах збірки все одно `prisma migrate deploy` → у **Vercel → Settings → Build and Deployment → Build Command** знято галочку override або вистав та саму команду, що в `vercel.json` (інколи старий override лишається з попередніх експериментів).
2. База вже зі схемою з Supabase / без таблиці Prisma **`_prisma_migrations`** — `migrate deploy` на такій БД без **baseline** не запускай у build. Схему оновлюй окремо (Supabase Dashboard, MCP `apply_migration`, або один раз `migrate deploy` з прямого `DATABASE_URL` після baseline — див. нижче).

## Змінні середовища (Production / Preview)

Додай у **Project → Settings → Environment Variables** (або через CLI: `vercel env pull` / `vercel env add`).

### Обов’язкові

| Змінна | Оточення | Опис |
|--------|----------|------|
| `DATABASE_URL` | Production, Preview | PostgreSQL (для serverless краще **Supabase pooler**, порт **6543**, у рядку `?pgbouncer=true&sslmode=require`). Див. коментар у `lib/db.ts`. |
| `NEXT_PUBLIC_SUPABASE_URL` | Усі | URL проєкту Supabase. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Усі | Anon (public) key. |
| `SUPABASE_SERVICE_ROLE_KEY` | Production, Preview | Service role — лише на сервері, не в клієнтському бандлі. |

### Рекомендовані (реалтайм бої)

| Змінна | Оточення | Опис |
|--------|----------|------|
| `PUSHER_APP_ID` | Production, Preview | Якщо порожньо — події бою через Pusher не шлються. |
| `PUSHER_SECRET` | Production, Preview | Секрет сервера Pusher. |
| `NEXT_PUBLIC_PUSHER_KEY` | Усі | Публічний ключ (клієнт). |
| `NEXT_PUBLIC_PUSHER_CLUSTER` | Усі | Кластер, напр. `eu` або `mt1` (за замовчуванням у коді `mt1`). |

### Опційні

| Змінна | Опис |
|--------|------|
| `REDIS_URL` | Якщо підключено Upstash/Vercel KV — для `lib/cache/kv.ts`. |
| `BATTLE_TURN_TIMING` / `NEXT_PUBLIC_BATTLE_TURN_TIMING` | `1` — додаткові логи таймінгу ходів (зазвичай лише dev). |

### Автоматично на Vercel

- `VERCEL`, `VERCEL_URL` — для редіректів (напр. `app/auth/callback/route.ts`).
- Не дублюй їх уручну.

### Supabase Auth / редіректи

У **Supabase Dashboard → Authentication → URL configuration** додай production URL:

- **Site URL**: `https://<твій-домен>.vercel.app` (або кастомний домен).
- **Redirect URLs**: той самий базовий URL + шляхи callback, які використовує додаток.

## Команди

```bash
pnpm run deploy          # production (vercel --prod)
pnpm run deploy:preview  # preview-деплой
```

Переконайся, що залогінений: `vercel login`.

## Встановлення залежностей

У `vercel.json` задано `pnpm install --frozen-lockfile`, щоб збігатися з `pnpm-lock.yaml` і `packageManager` у `package.json`.

### Чому збірка «висить» на Prisma / pooler Supabase (6543)

`prisma generate` **не потребує** живої БД, але CLI може довго чекати TCP до `DATABASE_URL`. На етапі **install** і **generate** з реальним pooler (EU) з білд-машини Vercel (наприклад iad1) це іноді тягнеться хвилини.

У проєкті зроблено так:

- **`postinstall`** на Vercel пропускає `prisma generate` (`scripts/postinstall.mjs`, перевірка `VERCEL`).
- **`buildCommand`** запускає `prisma generate` з **placeholder** `DATABASE_URL` на `127.0.0.1` (з’єднання не в Supabase), далі `next build` уже використовує справжній `DATABASE_URL` з env проєкту для коду, що звертається до БД під час білду (якщо такі маршрути є).

## Міграції БД

За замовчуванням збірка на Vercel **не** викликає `prisma migrate deploy` (у `vercel.json` лише `prisma generate && next build`). Міграції потрібно накатувати **проти тієї ж БД**, що в `DATABASE_URL` у Vercel.

### Накатати міграції зараз (рекомендовано)

1. Скопіюй **Production** `DATABASE_URL` з Vercel → Settings → Environment Variables. Для DDL часто зручніший **прямий** Postgres Supabase (порт `5432`, не transaction pooler `6543`), якщо pooler обриває довгі міграції.
2. Локально один раз:

```bash
DATABASE_URL="postgresql://..." pnpm exec prisma migrate deploy
```

Перевір у Supabase → Table Editor, що з’явилися / оновилися таблиці та колонки.

### Чому не вмикати `migrate deploy` у Vercel build без підготовки

Якщо база вже існувала (створена вручну, через `db push` або старий процес), а таблиця `_prisma_migrations` порожня або не відповідає історії в `prisma/migrations`, `prisma migrate deploy` під час збірки впаде з **P3005** (*database schema is not empty*). Тоді потрібен **baseline** по [документації Prisma](https://www.prisma.io/docs/guides/migrate/production-troubleshooting#baseline-your-production-environment) (позначити вже застосовані міграції через `prisma migrate resolve --applied ...`). Після успішного baseline можна змінити `vercel.json`:

```json
"buildCommand": "prisma migrate deploy && prisma generate && next build"
```

### Симптоми: дані «не збігаються» з локалхостом, 500 на сторінках

Часто це **не одна база**: порівняй `DATABASE_URL` у Vercel і локально.

Якщо база одна, але **500** після деплою — часто **не накатані міграції** відносно коду Prisma. Виконай `migrate deploy` (див. вище).

## Supabase: чому pooler egress ≫ розмір БД

**Egress** у дашборді — це обсяг даних, що **вийшов з Supabase** до твого застосунку (через pooler), а не розмір таблиць. Один і той самий рядок можна витягувати сотні разів (polling, HMR, кілька вкладок) — гігабайти накопичуються.

Що найчастіше роздуває трафік:

- Великі JSON у рядках (`battle_log`, `known_spells`, `skill_tree_progress`, інвентар).
- **Локальний dev** з `DATABASE_URL` на прод-БД + hot reload / часті перезавантаження.
- Polling без реалтайму (наприклад, якщо Pusher не налаштований — fallback оновлення бою).

У коді для списків де можливо не тягнемо `battleLog` і використовуємо `GET /characters?compact=1` там, де потрібні лише id/ім’я/тип. Переконайся, що в production задані змінні Pusher — тоді polling активного бою вимикається після підключення.
