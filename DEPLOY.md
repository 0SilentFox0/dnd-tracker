# Інструкція для деплою на Vercel

## Крок 1: Створення бази даних Supabase PostgreSQL

1. Перейдіть на [supabase.com](https://supabase.com) та зареєструйтеся/увійдіть
2. Створіть новий проект
3. Зачекайте поки проект створиться (зазвичай 1-2 хвилини)
4. Перейдіть в **Settings** → **Database**
5. Скопіюйте **Connection String** (URI) з секції "Connection string"
   - Оберіть **URI** формат (не Transaction mode)
   - Виглядає як `postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres`
   - Або використайте **Connection pooling** URI для кращої продуктивності
6. Збережіть його - він знадобиться для `DATABASE_URL`

## Крок 2: Налаштування Clerk (Авторизація)

1. Перейдіть на [clerk.com](https://clerk.com) та створіть акаунт
2. Створіть новий Application
3. Налаштуйте Google OAuth:
   - Перейдіть в **User & Authentication** → **Social Connections**
   - Увімкніть Google
   - Додайте ваш домен Vercel в **Allowed redirect URLs**
4. Скопіюйте:
   - **Publishable Key** (починається з `pk_`)
   - **Secret Key** (починається з `sk_`)

## Крок 3: Налаштування Pusher (Real-time синхронізація)

1. Перейдіть на [pusher.com](https://pusher.com) та зареєструйтеся
2. Створіть новий Channels app
3. Скопіюйте:
   - **App ID**
   - **Key** (починається з `xxxxx`)
   - **Secret** (починається з `xxxxx`)
   - **Cluster** (наприклад `mt1`, `eu`)

## Крок 4: Налаштування змінних середовища на Vercel

1. Перейдіть в ваш проект на Vercel
2. Відкрийте **Settings** → **Environment Variables**
3. Додайте наступні змінні:

### Обов'язкові змінні:

```env
# Database (Supabase PostgreSQL)
DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres

# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xxxxx
CLERK_SECRET_KEY=sk_test_xxxxx

# Pusher (опціонально, але рекомендовано для real-time)
PUSHER_APP_ID=xxxxx
PUSHER_SECRET=xxxxx
NEXT_PUBLIC_PUSHER_KEY=xxxxx
NEXT_PUBLIC_PUSHER_CLUSTER=mt1
```

### Важливо:
- Додайте змінні для **Production**, **Preview** та **Development** (якщо потрібно)
- `NEXT_PUBLIC_*` змінні доступні на клієнті
- Інші змінні доступні тільки на сервері

## Крок 5: Запуск міграцій бази даних

Після додавання `DATABASE_URL` на Vercel:

### Варіант 1: Через Vercel CLI (рекомендовано)

```bash
# Встановіть Vercel CLI якщо ще не встановлено
npm i -g vercel

# Увійдіть в Vercel
vercel login

# Підключіть проект
vercel link

# Запустіть міграції локально з production DATABASE_URL
# Спочатку скопіюйте DATABASE_URL з Vercel
export DATABASE_URL="your_production_database_url"
npx prisma migrate deploy
```

### Варіант 2: Через Supabase Dashboard

1. Перейдіть в ваш проект на Supabase
2. Відкрийте **SQL Editor**
3. Виконайте команди з міграцій вручну (не рекомендовано)
4. Або використайте **Database** → **Migrations** для застосування міграцій

### Варіант 3: Автоматично при деплої

Міграції будуть запускатися автоматично під час `npm run build` завдяки скрипту:
```json
"build": "prisma generate && prisma migrate deploy && next build"
```

## Крок 6: Налаштування Clerk Redirect URLs

1. Відкрийте ваш проект на Clerk Dashboard
2. Перейдіть в **Paths** → **Redirect URLs**
3. Додайте:
   - `https://your-project.vercel.app`
   - `https://your-project.vercel.app/api/auth/callback`
   - Для preview deployments: `https://*.vercel.app`

## Крок 7: Передеплой проекту

Після додавання всіх змінних середовища:

1. Перейдіть в **Deployments** на Vercel
2. Натисніть **Redeploy** на останньому деплої
3. Або зробіть новий commit і push - Vercel автоматично задеплоїть

## Крок 8: Перевірка

Після деплою перевірте:

1. ✅ Сайт відкривається: `https://your-project.vercel.app`
2. ✅ Авторизація працює (кнопка Sign In)
3. ✅ Після логіну можна створити кампанію
4. ✅ База даних працює (перевірте в Supabase Dashboard → SQL Editor)

## Troubleshooting

### Помилка "Prisma Client not generated"
- Перевірте чи додано `postinstall` скрипт в `package.json`
- Перевірте чи `DATABASE_URL` правильно налаштований

### Помилка "Database connection failed"
- Перевірте чи `DATABASE_URL` правильний
- Перевірте чи база даних активна на Supabase
- Перевірте чи міграції застосовані: `npx prisma migrate status`
- Для Supabase рекомендовано використовувати Connection Pooling URI для production

### Помилка авторизації Clerk
- Перевірте чи redirect URLs правильно налаштовані
- Перевірте чи ключі Clerk правильні

### Real-time не працює
- Перевірте чи Pusher змінні додані
- Перевірте чи канал правильно підключений в коді
- Перевірте логи Vercel для помилок Pusher

## Додаткові налаштування

### Налаштування домену (опціонально)

1. В Vercel: **Settings** → **Domains**
2. Додайте ваш домен
3. Додайте DNS записи як вказано
4. Оновіть Redirect URLs в Clerk

### Налаштування GitHub Actions (опціонально)

Якщо хочете автоматичні міграції при кожному деплої, створіть `.github/workflows/migrate.yml`:

```yaml
name: Database Migrations
on:
  push:
    branches: [main]

jobs:
  migrate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      - run: npm install
      - run: npx prisma migrate deploy
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
```

## Підтримка

Якщо виникли проблеми:
1. Перевірте логи в Vercel Dashboard → **Deployments** → **Functions**
2. Перевірте логи в Supabase Dashboard → **Logs** → **Postgres Logs**
3. Перевірте чи всі змінні середовища додані правильно
4. Перевірте чи використовуєте правильний Connection String (URI або Connection Pooling)
