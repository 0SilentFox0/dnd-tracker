# Деплой на Vercel

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

## Міграції БД

На Vercel міграції виконуються **під час збірки**: у `vercel.json` задано `prisma migrate deploy` перед `prisma generate` і `next build`. Потрібен коректний **`DATABASE_URL`** у змінних середовища для того оточення (Production / Preview), до якого застосовується деплой.

Локально або в CI без Vercel:

```bash
pnpm exec prisma migrate deploy
```

### Симптоми: дані «не збігаються» з локалхостом, 500 на сторінках

Часто це **не одна база**: перевір `DATABASE_URL` у Vercel (Production) і в `.env.local` — рядки мають збігатися, якщо очікуєш одні й ті самі дані.

Якщо база одна, але після деплою **500** на API або RSC (наприклад `/campaigns/.../info`), перевір логи збірки: чи пройшов крок `prisma migrate deploy`. Якщо збірка стара або Preview вказує на іншу БД без міграцій — накати вручну `migrate deploy` проти потрібної бази.

## Supabase: чому pooler egress ≫ розмір БД

**Egress** у дашборді — це обсяг даних, що **вийшов з Supabase** до твого застосунку (через pooler), а не розмір таблиць. Один і той самий рядок можна витягувати сотні разів (polling, HMR, кілька вкладок) — гігабайти накопичуються.

Що найчастіше роздуває трафік:

- Великі JSON у рядках (`battle_log`, `known_spells`, `skill_tree_progress`, інвентар).
- **Локальний dev** з `DATABASE_URL` на прод-БД + hot reload / часті перезавантаження.
- Polling без реалтайму (наприклад, якщо Pusher не налаштований — fallback оновлення бою).

У коді для списків де можливо не тягнемо `battleLog` і використовуємо `GET /characters?compact=1` там, де потрібні лише id/ім’я/тип. Переконайся, що в production задані змінні Pusher — тоді polling активного бою вимикається після підключення.
