# Налаштування Supabase для D&D Combat Tracker

## Швидкий старт

### 1. Створення проекту Supabase

1. Перейдіть на [supabase.com](https://supabase.com)
2. Натисніть **New Project**
3. Заповніть форму:
   - **Name**: назва вашого проекту (наприклад "dnd-combat-tracker")
   - **Database Password**: створіть надійний пароль (збережіть його!)
   - **Region**: оберіть найближчий регіон
4. Натисніть **Create new project**
5. Зачекайте 1-2 хвилини поки проект створиться

### 2. Отримання Connection String

1. Після створення проекту перейдіть в **Settings** → **Database**
2. Знайдіть секцію **Connection string**
3. Оберіть **URI** формат (не Transaction mode)
4. Скопіюйте Connection String

**Формат Connection String:**
```
postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
```

**Або для Production (рекомендовано) - Connection Pooling:**
```
postgresql://postgres.[PROJECT-REF]:[YOUR-PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres
```

### 3. Налаштування для Vercel

#### Варіант A: Пряме підключення (для development)

```env
DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
```

#### Варіант B: Connection Pooling (рекомендовано для production)

```env
DATABASE_URL=postgresql://postgres.[PROJECT-REF]:[YOUR-PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres
```

**Переваги Connection Pooling:**
- Краща продуктивність
- Більше одночасних підключень
- Оптимізовано для serverless середовищ (Vercel)

### 4. Застосування міграцій Prisma

#### Локально:

```bash
# Встановіть DATABASE_URL в .env.local
export DATABASE_URL="your_supabase_connection_string"

# Генерує Prisma Client
npx prisma generate

# Застосовує міграції
npx prisma migrate deploy
```

#### На Vercel:

Міграції застосовуються автоматично під час `npm run build` завдяки скрипту:
```json
"build": "prisma generate && prisma migrate deploy && next build"
```

### 5. Перевірка підключення

1. Відкрийте **SQL Editor** в Supabase Dashboard
2. Виконайте простий запит:
```sql
SELECT version();
```

Якщо все працює, ви побачите версію PostgreSQL.

## Додаткові налаштування Supabase

### Row Level Security (RLS)

За замовчуванням Supabase має RLS увімкнений. Для нашого проекту це не потрібно, оскільки ми використовуємо Clerk для авторизації та Prisma для доступу до БД.

Якщо потрібно вимкнути RLS:
1. Перейдіть в **Authentication** → **Policies**
2. Або використайте SQL:
```sql
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
-- Повторіть для всіх таблиць
```

### Database Extensions

Prisma може потребувати деякі extensions. Перевірте чи вони встановлені:

```sql
-- Перевірка доступних extensions
SELECT * FROM pg_available_extensions;

-- Встановлення якщо потрібно
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
```

### Connection Limits

Supabase Free tier має обмеження:
- **Direct connections**: 60 одночасних підключень
- **Connection Pooling**: 200 одночасних підключень

Для production використовуйте Connection Pooling!

## Troubleshooting

### Помилка "too many connections"

**Рішення:** Використайте Connection Pooling URI замість прямого підключення.

### Помилка "password authentication failed"

**Рішення:** 
- Перевірте чи пароль правильний
- Перевірте чи використовуєте правильний формат Connection String
- Переконайтеся що замінили `[YOUR-PASSWORD]` та `[PROJECT-REF]` на реальні значення

### Помилка "relation does not exist"

**Рішення:**
- Перевірте чи міграції застосовані: `npx prisma migrate status`
- Застосуйте міграції: `npx prisma migrate deploy`

### Повільні запити

**Рішення:**
- Використайте Connection Pooling
- Перевірте індекси в базі даних
- Перевірте логи в Supabase Dashboard → **Logs** → **Postgres Logs**

## Безпека

### Рекомендації:

1. ✅ Ніколи не комітьте Connection String в Git
2. ✅ Використовуйте Connection Pooling для production
3. ✅ Регулярно оновлюйте пароль бази даних
4. ✅ Використовуйте різні паролі для development та production
5. ✅ Обмежте доступ до бази даних через Supabase Dashboard → **Settings** → **Database** → **Network Restrictions**

## Корисні посилання

- [Supabase Documentation](https://supabase.com/docs)
- [Supabase Connection Pooling](https://supabase.com/docs/guides/database/connecting-to-postgres#connection-pooler)
- [Prisma + Supabase Guide](https://supabase.com/docs/guides/integrations/prisma)
