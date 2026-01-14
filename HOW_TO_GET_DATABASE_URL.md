# 🔍 Де взяти DATABASE_URL з Supabase

## Швидкий спосіб:

1. **Відкрийте Supabase Dashboard:**
   - Перейдіть на [supabase.com/dashboard](https://supabase.com/dashboard)
   - Виберіть проект **supabase-indigo-window**

2. **Отримайте Connection String:**
   - Натисніть **Settings** (⚙️ в лівому меню)
   - Перейдіть в **Database**
   - Прокрутіть до секції **Connection string**
   - Оберіть вкладку **URI** (не Transaction mode)
   - Скопіюйте Connection String

3. **Формат буде такий:**
   ```
   postgresql://postgres.[PROJECT-REF]:[YOUR-PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres
   ```

4. **Додайте в .env файл:**
   ```env
   DATABASE_URL="postgresql://postgres.[PROJECT-REF]:[YOUR-PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres"
   ```

## Альтернативний спосіб (пряме підключення):

Якщо Connection Pooling не працює, використайте прямий URI:
```
postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
```

## ⚠️ Важливо:

- **Замініть** `[PROJECT-REF]` на ваш реальний PROJECT-REF (знаходиться в URL проекту)
- **Замініть** `[YOUR-PASSWORD]` на пароль який ви встановили при створенні проекту
- **Замініть** `[REGION]` на регіон вашого проекту (наприклад `us-east-1`)

## 📸 Візуальна інструкція:

```
Supabase Dashboard
  └─ Settings (⚙️)
      └─ Database
          └─ Connection string
              └─ URI (вкладка)
                  └─ [Копіювати] ← Тут!
```

## ✅ Перевірка:

Після додавання DATABASE_URL, перевірте підключення:

```bash
npx prisma db pull
```

Якщо все правильно - ви побачите список таблиць.
