# Перехід на інший акаунт Supabase

Чеклист і кроки для перенесення проєкту на новий Supabase-акаунт (або новий проєкт).

## 1. Зроби бекап поточної бази

- У **Supabase Dashboard** поточного проєкту: **Project Settings → Database**.
- Скопіюй **Connection string → Direct connection** (порт **5432**). Пароль — той самий, що в `.env` для `DATABASE_URL`.
- (Опційно) Створи `.env.backup` в корені проєкту (файл в `.gitignore`):
  ```bash
  BACKUP_DATABASE_URL="postgresql://postgres.[REF]:[PASSWORD]@db.[REF].supabase.co:5432/postgres"
  ```
- Виконай бекап:
  ```bash
  chmod +x scripts/backup-database.sh
  ./scripts/backup-database.sh
  ```
- Файл з’явиться в `.migration-backup/backup_YYYYMMDD_HHMMSS.sql`. **Збережи його** (скопіюй у безпечне місце), якщо потрібно буде відновити дані в новому проєкті.

## 2. Запиши поточні змінні оточення

Перед переходом випиши з поточного проєкту (Dashboard або `.env`):

| Змінна | Де взяти |
|--------|----------|
| `DATABASE_URL` | Supabase → Project Settings → Database → **Transaction pooler** (порт 6543) |
| `NEXT_PUBLIC_SUPABASE_URL` | Project Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Project Settings → API → anon public |
| `SUPABASE_SERVICE_ROLE_KEY` | Project Settings → API → service_role |
| (опційно) `SUPABASE_JWT_SECRET` | Project Settings → API → JWT Secret (для однакової валідації сесій після переносу) |

Pusher (якщо використовується) залишається тим самим — прив’язка до акаунту Pusher, не до Supabase.

## 3. Новий акаунт / новий проєкт Supabase

- Зайди в [Supabase Dashboard](https://supabase.com/dashboard) під **новим** акаунтом.
- **New project**: вибери організацію, регіон, пароль для БД.
- Після створення відкрий **Project Settings → Database** і збери:
  - **Connection string → Transaction pooler** (для `DATABASE_URL` в додатку).
  - **Connection string → Direct connection** (для міграцій/бекапів, порт 5432).
- **Project Settings → API**: збери URL, anon key, service_role key.

## 4. Підключи проєкт до нової БД

- У корені проєкту онови `.env`:
  - `DATABASE_URL` — рядок підключення (див. шаблон нижче). Якщо в Dashboard є **Transaction pooler** (порт 6543) — краще використати його для додатку. Якщо є лише **Direct** (5432) — підстав його, для невеликих навантажень часто достатньо.
  - `NEXT_PUBLIC_SUPABASE_URL` — Project URL (наприклад `https://XXXX.supabase.co`).
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY` — **anon public** / Publish key з API.
  - `SUPABASE_SERVICE_ROLE_KEY` — **service_role** secret (один рядок, без пробілів/переносів).
- Застосуй схему БД (міграції):
  ```bash
  pnpm prisma generate
  pnpm prisma migrate deploy
  ```
  Якщо `migrate deploy` зависає на Supabase, виконай міграції вручну через **SQL Editor** в Dashboard (скопіюй вміст файлів з `prisma/migrations/.../migration.sql`).

## 5. Storage (бакети й файли)

**Міграція через pg_dump не переносить бакети й файли.** Бекап містить лише таблиці (public, auth). Файли в Storage (unit-icons, spell-icons, skill-icons) зберігаються окремо.

Що зробити в новому проєкті:

1. **Створи бакети вручну:** Dashboard → Storage → створи бакети `unit-icons`, `spell-icons`, `skill-icons` (public, як у старому проєкті).
2. **Перенести файли:** зі старого проєкту (якщо він ще доступний) через Dashboard — експорт/завантаження, або скриптом через Supabase Storage API (list objects у старому → download → upload у новому). Якщо є локальна папка **`assets/`** з підпапками `unit-icons`, `spell-icons`, `skill-icons`, можна створити бакети і завантажити її вміст однією командою: `pnpm run upload-assets-to-supabase`. Інакше — `pnpm run migrate-unit-icons-to-supabase`, `migrate-spell-icons-to-supabase`, `migrate-skill-icons-to-supabase` для нового проєкту (якщо в БД є зовнішні URL).

## 6. (Опційно) Відновити дані з бекапу

Якщо таблиці вже створені (міграції застосовані), але порожні, заповни їх з бекапу:

```bash
# Відновити з останнього бекапу (Session pooler, порт 5432)
./scripts/restore-backup-to-supabase.sh

# Або вказати файл і спочатку очистити таблиці
./scripts/restore-backup-to-supabase.sh --clean .migration-backup/backup_YYYYMMDD_HHMMSS.sql
```

- Скрипт бере `DATABASE_URL` з `.env.local` і будує URL для імпорту (Session pooler 5432). Якщо є **Direct** connection (порт 5432 на `db.*.supabase.co`), можна задати `RESTORE_DATABASE_URL` в `.env.local`.
- `--clean` спочатку робить TRUNCATE по public і auth (окрім schema_migrations), потім імпорт.
- Блок `COPY auth.schema_migrations` у бекапі пропускається (немає прав через pooler).

## 7. Auth (логін/реєстрація)

- У новому проєкті: **Authentication → Providers** — увімкни ті самі провайдери (Email, Google тощо).
- **Authentication → URL Configuration**: додай **Site URL** та **Redirect URLs** (localhost для розробки та production URL).
- Користувачі зі старого проєкту не переносяться автоматично. Якщо ти експортував схему `auth` у бекапі і відновив її в новому проєкті, перевір сумісність версій Supabase Auth. Інакше користувачам потрібно реєструватися знову.

## 8. Vercel / деплой

- У Vercel проєкті онови **Environment Variables**: підстав нові `DATABASE_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.
- Зроби **Redeploy** (або push у репозиторій, якщо деплой автоматичний).

## 9. Перевірка

- Локально: `pnpm dev` — вхід/вихід, основні сторінки, бій (якщо використовується).
- Production: перевір логін і критичні сценарії після деплою.

---

**Коротко:** зроби бекап через `scripts/backup-database.sh`, збережи файл з `.migration-backup/`, створи новий проєкт Supabase, онови `.env` і Vercel новими ключами, виконай `prisma migrate deploy`, за потреби віднови дані з бекапу, налаштуй Auth URLs і зроби redeploy.
