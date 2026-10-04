# Захист БД: Row Level Security (RLS)

У Supabase без RLS таблиці позначені як **UNRESTRICTED** — їх може читати/писати будь-хто через Data API (anon key).

## Що зробити

1. **RLS на всіх таблицях вмикає міграція**  
   `prisma/migrations/20261005000000_init/migration.sql` закінчується блоком `ALTER TABLE … ENABLE ROW LEVEL SECURITY`.
   Кожна нова міграція з `CREATE TABLE` має містити такий самий `ALTER TABLE` — це перевіряє тест
   `prisma/__tests__/migrations-rls.test.ts`.

2. **Результат**
   - Через **anon key** (публічний клієнт) без політик ніхто не отримає рядків.
   - **Service role** (серверні API, скрипти) і **Prisma** (DATABASE_URL) продовжують працювати як раніше.

3. **Якщо потрібен доступ по даних для авторизованих користувачів**  
   Додай політики (Policies) в **Dashboard → Authentication → Policies** або через SQL, наприклад:
   - дозволити `SELECT` по кампаніях, де користувач у `campaign_members` або `dmUserId`;
   - обмежити `INSERT/UPDATE/DELETE` тільки для DM або учасників кампанії.

Поки політик немає — доступ через anon key заборонений, додаток через Prisma та service role працює як раніше.
