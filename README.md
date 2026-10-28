# D&D Combat Tracker

Веб-додаток для ведення кампаній і боїв у Dungeons & Dragons 5e: конструктор кампаній, бойова мапа з real-time синхронізацією, «Показ» для гравців, AI-асистент ДМ. Працює на телефоні й десктопі.

Документація: [ARCHITECTURE.md](ARCHITECTURE.md) (огляд папок), [docs/architecture/](docs/architecture/README.md) (по підсистемах), [docs/STATUS.md](docs/STATUS.md) (що зараз у роботі), [CLAUDE.md](CLAUDE.md) (правила й пастки для розробки).

## Можливості

### Для Dungeon Master

- **Конструктор кампаній**: шаблони (SRD 5.2, Heroes, «Без шаблону»), правила кампанії, класи, раси, риси, передісторії, дерева скілів, заклинання, артефакти й набори, юніти. Оновлення з джерела шаблону (source sync), імпорт/експорт CSV/TSV/JSON.
- **Відкрите API**: токени зі scopes, REST + публічний `/api/openapi.json`, MCP-сервер `/api/mcp`.
- **Бої**: ініціатива й черга ходів, атаки, заклинання, стани 5e, рятівні кидки, кидки смерті, концентрація, легендарні дії, мораль, резерв, баланс за `computeFairScaling`. Режими мапи (звичайна, лабіринт), погода, музика, 2D-ефекти й 3D-кубики.
- **Сценарій і «Показ»**: рукопис сценарію, слайди з музикою, синхронізований перегляд для гравців, пазл, карта світу з туманом і подорожами.
- **AI-асистент** (власні ключі Claude/OpenAI/Gemini): чат зі сценою, пропозиції правок сценарію, генерація зображень, постійні інструкції кампанії.
- **Кампанія**: інвайт-коди, дашборд «Що далі», онбординг-чеклісти, довідка `/help`.

### Для гравців

- Лист героя, інвентар («Підсумок», гаманець, слоти), рівні й вибори (риси, ASI), чернетки героя.
- Участь у боях у реальному часі, заклинання, відпочинки поза боєм.
- «Показ» і карта світу, що відкриває ДМ.

## Стек

- **Next.js 16** (App Router) + **React 19** + **TypeScript** (strict), Tailwind CSS 4, shadcn/ui + Radix, TanStack Query 5
- **Prisma 6** + **PostgreSQL** (Supabase), **Zod 4**
- **Supabase Auth** (Google OAuth + email/пароль, сесія перевіряється локально через `getClaims`)
- **Pusher** (real-time, кластер `eu`), опційно Upstash/Redis (rate limit, кеш)
- **Vitest** для тестів, **pnpm** як пакетний менеджер
- Хостинг: **Vercel** (функції `fra1`), шрифти self-hosted

## Швидкий старт

Потрібні: Node.js 20+ (рекомендовано 22+), **pnpm 9** (`corepack enable`), Docker (локальна БД), проєкт Supabase (Auth/Storage), опційно акаунт Pusher.

```bash
git clone <repository-url> && cd dnd-tracker
pnpm install
cp .env.example .env.local   # заповніть значення
pnpm db:local                # Docker Postgres на :54322 + міграції
pnpm dev                     # http://localhost:3000
```

Локальна БД — Docker (`postgres:17`, порт 54322), щоб `pnpm dev` не витрачав ліміт Supabase. Для неї в `.env.local`:
`DATABASE_URL=DIRECT_URL=postgresql://postgres:postgres@localhost:54322/postgres`. Supabase Auth/Storage і Pusher лишаються хмарними.

### Змінні середовища

Повний список із коментарями — у [`.env.example`](.env.example).

| Змінна | Призначення |
|---|---|
| `DATABASE_URL` | Додаток: Transaction pooler (порт 6543, `?pgbouncer=true&sslmode=require`) |
| `DIRECT_URL` | Міграції: Direct/Session (порт 5432). Обов'язкова в Vercel Production |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` | Supabase Auth і Storage |
| `PUSHER_APP_ID`, `PUSHER_SECRET`, `NEXT_PUBLIC_PUSHER_KEY`, `NEXT_PUBLIC_PUSHER_CLUSTER` | Real-time. Без них бій працює на поллінгу; у production `PUSHER_APP_ID`/`PUSHER_SECRET` обов'язкові |
| `AI_KEYS_SECRET` (`AI_KEYS_SECRET_PREV`) | Ключ шифрування провайдерних ключів AI (`openssl rand -base64 32`) |
| `COMPENDIUM_PREVIEW_SECRET` | Підпис попереднього перегляду JSON-імпорту (≥ 32 символи) |
| `CRON_SECRET` | Захист щоденного cron-роуту очищення даних асистента |
| `PLATFORM_ADMIN_USER_IDS` | Адміни платформи (керування офіційними шаблонами) |
| `UPSTASH_REDIS_REST_*`, `REDIS_URL` | Опційно: rate limit і кеш |
| `SITE_INDEXING=1` | Дозволити індексацію (лише після публічного запуску) |

## Команди

```bash
pnpm dev                 # next dev
pnpm build               # prisma generate && next build
pnpm lint                # eslint
pnpm knip                # невикористаний код і залежності

pnpm test:run            # vitest, один прогін (CI)
pnpm test:changed        # лише тести, зачеплені незакоміченими змінами
pnpm test:related a.ts   # лише тести, що імпортують файли
pnpm test:integration    # інтеграційні тести з реальною PostgreSQL

pnpm db:local            # Docker Postgres + міграції
pnpm exec prisma migrate dev --name X   # нова міграція (локально)
pnpm migrate:deploy      # застосувати міграції (DIRECT_URL з .env.local)
pnpm exec prisma studio
```

Одноразові операції лежать у `scripts/` і запускаються через `tsx` (імпорт юнітів і сценаріїв, сід бібліотеки, шаблон SRD, симуляції балансу, `battle-sweep` тощо) — повний перелік у `package.json`.

## Структура

```
app/                  # App Router: сторінки, API routes
  (auth)/             # sign-in, sign-up, forgot/reset-password
  api/                # campaigns/[id]/…, ai, mcp, templates, openapi.json, pusher, cron
  campaigns/[id]/     # сторінки кампанії: dm/…, battles, character, show, world, info
  help/  settings/  uk/   # довідка, налаштування, українська версія лендінгу
components/           # UI за доменами (battle, hud, show, world, ai, …) + ui/ (shadcn)
lib/
  api/                # клієнтські обгортки запитів
  hooks/<domain>/     # TanStack Query і форм-хуки
  server/             # серверна логіка (battles, content, templates, …)
  utils/<domain>/     # чиста доменна логіка (battle, abilities, spells, …)
  ai/  pusher/  supabase/  schemas/  constants/  onboarding/
types/                # типи за доменами
prisma/               # schema.prisma, міграції
scripts/              # CLI-скрипти (assets, constructor, db, import, seed, sim, srd)
data/                 # бібліотеки й шаблони (templates/srd-5.2)
docs/                 # architecture/, guides/, product/, superpowers/ (специфікації й плани)
```

Потік запиту: сторінка (server component) → `*-client.tsx` → хук `lib/hooks/<domain>` → `lib/api/<domain>` → route handler (Zod + сесія) → `lib/server/…` / `lib/utils/…` → Prisma. Компоненти не імпортують `@/lib/api/*` напряму (ESLint). Деталі шарів і правила — у [CLAUDE.md](CLAUDE.md).

## Деплой

Vercel запускає `node scripts/vercel-build.mjs`: `prisma generate` (з placeholder-URL) → `prisma migrate deploy` (лише production-збірка з `main`, через `DIRECT_URL`) → `next build`. Production-збірка з іншої гілки падає навмисно (override: `ALLOW_PROD_MIGRATE=1`). Міграції мають бути expand-only, кожна `CREATE TABLE` вмикає RLS.

Регіони не змінювати окремо: Supabase `eu-central-1`, Vercel `fra1`, Pusher `eu`. Деталі — [docs/VERCEL.md](docs/VERCEL.md).

У Supabase → Authentication → URL Configuration мають бути Redirect URLs і для `http://localhost:3000/auth/callback`, і для production-домену, інакше після OAuth буде редірект на localhost.

## Troubleshooting

- **Помилка підключення до БД** — `DATABASE_URL` має вказувати на Transaction pooler (6543, `pgbouncer=true`); спецсимволи в паролі — URL-encoded.
- **Різні дані локально й на проді** — перевірте, який `DATABASE_URL` активний ([docs/DATABASE-SYNC.md](docs/DATABASE-SYNC.md)).
- **Prisma** — `pnpm exec prisma generate`; `prisma migrate reset` видаляє всі дані.
- **Свіжа копія проду для перевірок** — `./scripts/db/prodcopy-db.sh`, потім `pnpm battle-sweep` проти БД `prodcopy`.

## Додаткова документація

- [docs/DATABASE-SYNC.md](docs/DATABASE-SYNC.md) — синхронізація локальної й прод-БД
- [docs/DB-SECURITY-RLS.md](docs/DB-SECURITY-RLS.md) — RLS у Supabase
- [docs/SWITCH-SUPABASE-ACCOUNT.md](docs/SWITCH-SUPABASE-ACCOUNT.md) — бекап і перехід на інший акаунт Supabase (`./scripts/db/backup-database.sh`)
- [docs/guides/](docs/guides) — AI-асистент кампанії, імпорт JSON-компендіуму
- [docs/product/](docs/product) — готовність до публічного продукту, план інфраструктури

## Ліцензія

Приватний проєкт. Функціонал активно розвивається.
