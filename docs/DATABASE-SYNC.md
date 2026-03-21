# Синхронізація БД: локалка ↔ прод

Є два різні питання: **однакова схема** (таблиці, колонки) і **однакові дані** (рядки в таблицях).

## Варіант A — одна база для локалки і для Vercel (найпростіше)

Якщо **той самий** Supabase-проєкт:

1. У **Vercel** (Production) і в **`.env.local`** мають збігатися:
   - `DATABASE_URL` (той самий pooler / той самий `postgres.[ref]` у логіні)
   - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
2. Після зміни змінних на Vercel зроби **Redeploy**.

Тоді персонажі / кампанії, створені локально, одразу видно на проді і навпаки — бо це **одна Postgres**.

**Мінуси:** локальний `pnpm dev` навантажує ту саму БД; помилкові міграції або скрипти б’ють по прод-даних. Для команди часто окремо тримають dev-проєкт Supabase.

---

## Варіант B — дві бази (dev і prod)

### Схема (структура таблиць)

Потрібно накатити **ті самі зміни** на обидві БД:

- через **Supabase Dashboard → SQL** / **MCP `apply_migration`**, або
- `pnpm exec prisma migrate deploy` з відповідним `DATABASE_URL` (на prod у вас часто потрібен **baseline** або прямий SQL — див. `docs/VERCEL.md`).

`prisma generate` на Vercel **не** оновлює схему — лише генерує клієнт у репозиторії.

### Дані (копія таблиць)

**Прод → локалка** (підтягнути прод на машину):

1. У Supabase прод-проєкту візьми **Direct connection** (порт **5432**, `db.[ref].supabase.co`).
2. Бекап:
   ```bash
   # Опційно .env.backup з BACKUP_DATABASE_URL=postgresql://...@db....:5432/postgres
   ./scripts/backup-database.sh
   ```
3. У **локальному** `.env.local` вкажи URL **локальної** / **dev** Supabase (pooler 6543 для додатку).
4. Відновлення в ту БД, куди хочеш залити дані:
   ```bash
   ./scripts/restore-backup-to-supabase.sh .migration-backup/backup_YYYYMMDD_HHMMSS.sql
   ```
   За потреби спочатку порожні таблиці: `--clean` (див. коментарі в скрипті — **зітре дані** в цільовій БД).

**Локалка → прод** роби лише свідомо: це **перезаписує** дані на проді. Зазвичай роблять бекап проду **перед** відновленням.

Детальніший чеклист переносу між проєктами: `docs/SWITCH-SUPABASE-ACCOUNT.md`.

### Auth і Storage

- Таблиці **auth** можуть потрапляти в `pg_dump` залежно від скрипта; після відновлення перевір логіні на цільовому проєкті.
- **Storage** (іконки тощо) окремо від SQL-дампу — див. `SWITCH-SUPABASE-ACCOUNT.md`, розділ про бакети.

---

## Швидка перевірка «чи це одна база»

Порівняй у Vercel і в `.env.local` (без пароля): **ref** у `postgres.[ref]` або хост `db.[ref].supabase.co` / `pooler.supabase.com` — мають збігатися, якщо очікуєш одні й ті самі дані.
