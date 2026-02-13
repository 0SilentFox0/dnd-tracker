# Гайд: безболісна міграція БД та авторизації на новий регіон

Міграція Supabase з us-east-1 на EU (Frankfurt) для зменшення затримки API.

---

## Що переносимо

| Компонент | Де зараз | Куди |
|-----------|----------|------|
| **PostgreSQL** | Supabase us-east-1 | Supabase EU |
| **Supabase Auth** | us-east-1 | EU (разом з БД) |
| **Storage** | us-east-1 | EU (окремий скрипт) |

---

## Перед початком

1. **Backup** — зроби повний експорт поточної БД, збережи `.env` окремо.
2. **Downtime** — міграція потребує зупинки на 30–60 хв.
3. **Supabase CLI** — встанови: `brew install supabase/tap/supabase`
4. **Docker** — потрібен для деяких операцій CLI (або використовуй pg_dump/psql напряму).

---

## Крок 1: Створити новий Supabase проект (EU)

1. Зайди на [supabase.com](https://supabase.com) → **New project**.
2. Обери регіон **Europe (Frankfurt)** або інший EU.
3. Заповни **Name**, **Database Password** (збережи).
4. Дождись створення (~2 хв).

---

## Крок 2: Зберегти JWT Secret (щоб не виходити з системи)

**Важливо:** Якщо зберегти той самий JWT Secret у новому проекті, існуючі сесії залишаться валідними.

1. Старий проект: **Settings** → **API** → **JWT Secret** → скопіюй.
2. Новий проект: **Settings** → **API** → **JWT Secret** → **Generate new secret** → встав старий секрет із кроку 1.

⚠️ Після зміни JWT Secret у новому проекті будуть згенеровані **нові** anon і service_role ключі — їх потрібно використати в `.env`.

---

## Крок 3: Експорт даних зі старого проекту

### 3.1. Connection string

1. Старий проект: **Project Settings** → **Database** → **Connection string**.
2. Обери **Session pooler** (URI).
3. Із **Database Settings** візьми/скинь пароль — встав його в URI замість `[YOUR-PASSWORD]`.

Формат:

```
postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-us-east-1.pooler.supabase.com:5432/postgres
```

Для експорту краще використовувати **Direct connection** (Session pooler теж підходить):

```
postgresql://postgres.[PROJECT-REF]:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
```

### 3.2. Backup через Supabase CLI

```bash
# Встанови змінну
export OLD_DB_URL="postgresql://postgres.[OLD_REF]:[PASSWORD]@db.[OLD_REF].supabase.co:5432/postgres"

# Роли
supabase db dump --db-url "$OLD_DB_URL" -f roles.sql --role-only

# Схема (включно з auth, public, extensions)
supabase db dump --db-url "$OLD_DB_URL" -f schema.sql

# Дані (включно з auth.users)
supabase db dump --db-url "$OLD_DB_URL" -f data.sql --use-copy --data-only
```

### 3.3. Альтернатива: pg_dump (якщо CLI не працює)

```bash
pg_dump "$OLD_DB_URL" --schema-only --no-owner -f schema.sql
pg_dump "$OLD_DB_URL" --data-only --no-owner -f data.sql
```

---

## Крок 4: Налаштування нового проекту

1. **Extensions** — увімкни ті самі extensions, що й у старому: **Database** → **Extensions**.
2. **Database Webhooks** — якщо використовувались, увімкни: **Database** → **Webhooks**.

---

## Крок 5: Імпорт у новий проект

### 5.1. Connection string нового проекту

```
postgresql://postgres.[NEW_REF]:[PASSWORD]@db.[NEW_REF].supabase.co:5432/postgres
```

### 5.2. Restore

```bash
export NEW_DB_URL="postgresql://postgres.[NEW_REF]:[PASSWORD]@db.[NEW_REF].supabase.co:5432/postgres"

psql "$NEW_DB_URL" \
  --single-transaction \
  --variable=ON_ERROR_STOP=1 \
  -f roles.sql \
  -f schema.sql \
  -c "SET session_replication_role = replica" \
  -f data.sql
```

`session_replication_role = replica` вимикає тригери під час імпорту (у тому числі для двічі зашифрованих колонок).

### 5.3. Якщо були помилки з supabase_admin

Якщо є `permission denied` для `supabase_admin` — відкрий `schema.sql`, закоментуй рядки з `ALTER ... OWNER TO "supabase_admin"`.

---

## Крок 6: Міграція Storage (якщо є файли)

У проекті є `remotePatterns` для Supabase Storage (аватари тощо). Якщо є бакети з об’єктами:

1. Створи бакети з тими самими іменами у новому проекті.
2. Використай [офіційний скрипт міграції Storage](https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore#migrate-storage-objects) або власний варіант на `@supabase/supabase-js` (download зі старого → upload у новий).

---

## Крок 7: Оновити змінні середовища

### .env.local / .env.development.local

```env
# Supabase (новий проект EU)
NEXT_PUBLIC_SUPABASE_URL="https://[NEW_PROJECT_REF].supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="[новий anon key]"
SUPABASE_SERVICE_ROLE_KEY="[новий service role key]"
SUPABASE_ANON_KEY="[новий anon key]"
SUPABASE_JWT_SECRET="[старий JWT secret — якщо зберігав]"

# Database (новий проект)
DATABASE_URL="postgresql://postgres.[NEW_REF]:[PASSWORD]@aws-0-eu-central-1.pooler.supabase.com:5432/postgres?sslmode=require"
# ... інші POSTGRES_*
```

### Vercel

**Settings** → **Environment Variables** — онови для production, preview, development.

---

## Крок 8: Якщо використовуєш Prisma migrations

1. Новий проект вже має схему після імпорту — не запускай `prisma migrate deploy` для початкової схеми.
2. Якщо потрібно зберегти історію міграцій:

```bash
supabase db dump --db-url "$OLD_DB_URL" -f history_schema.sql --schema supabase_migrations
supabase db dump --db-url "$OLD_DB_URL" -f history_data.sql --use-copy --data-only --schema supabase_migrations

psql "$NEW_DB_URL" -f history_schema.sql -f history_data.sql
```

---

## Крок 9: Перевірка

1. **Локально**
   ```bash
   pnpm run dev
   ```
   - Увійти в обліковий запис (має працювати без повторного логіну, якщо JWT Secret збережено).
   - Перевірити кампанії, бій, персонажів.

2. **Production**
   - Redeploy на Vercel.
   - Перевірити логін і основні сценарії.

---

## Чеклист

- [ ] Backup старої БД (`roles.sql`, `schema.sql`, `data.sql`)
- [ ] Backup `.env`
- [ ] Створено новий Supabase проект (EU)
- [ ] Скопійовано JWT Secret у новий проект
- [ ] Експортовано дані зі старого проекту
- [ ] Імпортовано у новий проект (roles → schema → data)
- [ ] Міграція Storage (якщо потрібно)
- [ ] Оновлено `.env` та Vercel env
- [ ] Перевірено локально
- [ ] Перевірено на production

---

## Корисні посилання

- [Migrating Auth Users Between Supabase Projects](https://supabase.com/docs/guides/troubleshooting/migrating-auth-users-between-projects)
- [Backup and Restore using the CLI](https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore)
- [Migrating within Supabase](https://supabase.com/docs/guides/platform/migrating-within-supabase)

---

## Можливі проблеми

| Проблема | Рішення |
|----------|---------|
| `permission denied` для `supabase_admin` | Закоментуй `ALTER ... OWNER TO "supabase_admin"` у `schema.sql` |
| Custom roles з `login` | Після restore вручну встанови паролі в новому проекті |
| Зміна auth schema (RLS, triggers) | Використай `supabase db diff --schema auth,storage` та допиши зміни |
| Користувачі мають вийти і увійти знову | Якщо не зберіг JWT Secret — очікувано |
| Redis cache | Дані не переносяться; після міграції кеш порожній |
