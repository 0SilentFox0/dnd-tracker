# Захист БД: Row Level Security (RLS)

У Supabase без RLS таблиці позначені як **UNRESTRICTED** — їх може читати/писати будь-хто через Data API (anon key).

## Що зробити

1. **Увімкнути RLS на всіх таблицях**  
   Виконай SQL з файлу **`scripts/enable-rls.sql`** в Supabase:  
   **Dashboard → SQL Editor** → вставити вміст → **Run**.

2. **Результат**
   - Через **anon key** (публічний клієнт) без політик ніхто не отримає рядків.
   - **Service role** (серверні API, скрипти) і **Prisma** (DATABASE_URL) продовжують працювати як раніше.

3. **Якщо потрібен доступ по даних для авторизованих користувачів**  
   Додай політики (Policies) в **Dashboard → Authentication → Policies** або через SQL, наприклад:
   - дозволити `SELECT` по кампаніях, де користувач у `campaign_members` або `dmUserId`;
   - обмежити `INSERT/UPDATE/DELETE` тільки для DM або учасників кампанії.

Поки політик немає — доступ через anon key заборонений, додаток через Prisma та service role працює як раніше.
