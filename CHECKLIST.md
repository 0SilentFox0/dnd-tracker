# Чеклист для запуску проекту

## ✅ Перевірка змінних середовища

Перевірте чи в `.env` файлі є всі необхідні змінні:

### Обов'язкові змінні:

```env
# 1. База даних Supabase
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.supabase-indigo-window.supabase.co:5432/postgres

# 2. Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xxxxx
CLERK_SECRET_KEY=sk_test_xxxxx
```

### Опціональні (для real-time):

```env
# 3. Pusher (якщо використовуєте real-time синхронізацію)
PUSHER_APP_ID=xxxxx
PUSHER_SECRET=xxxxx
NEXT_PUBLIC_PUSHER_KEY=xxxxx
NEXT_PUBLIC_PUSHER_CLUSTER=mt1
```

## ✅ Перевірка бази даних

### 1. Перевірте підключення до Supabase:

```bash
# Перевірте чи DATABASE_URL правильний
echo $DATABASE_URL

# Або якщо використовуєте .env.local
cat .env.local | grep DATABASE_URL
```

### 2. Застосуйте міграції:

```bash
# Генерує Prisma Client
npx prisma generate

# Застосовує міграції до бази даних
npx prisma migrate deploy

# Або якщо це перший раз
npx prisma migrate dev --name init
```

### 3. Перевірте чи таблиці створені:

```bash
# Перевірка статусу міграцій
npx prisma migrate status

# Або відкрийте Supabase Dashboard → SQL Editor та виконайте:
# SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';
```

## ✅ Перевірка Clerk

### 1. Перевірте чи ключі правильні:

- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` починається з `pk_`
- `CLERK_SECRET_KEY` починається з `sk_`

### 2. Налаштуйте Redirect URLs в Clerk Dashboard:

1. Перейдіть в [Clerk Dashboard](https://dashboard.clerk.com)
2. Виберіть ваш Application
3. Перейдіть в **Paths** → **Redirect URLs**
4. Додайте:
   - `http://localhost:3000` (для development)
   - `https://your-project.vercel.app` (для production)
   - `https://your-project.vercel.app/api/auth/callback`

## ✅ Локальний запуск

```bash
# 1. Встановіть залежності
npm install

# 2. Перевірте чи .env файл існує
ls -la .env.local

# 3. Запустіть проект
npm run dev
```

Відкрийте [http://localhost:3000](http://localhost:3000) - має відкритися сторінка авторизації.

## ✅ Деплой на Vercel

### 1. Додайте змінні середовища на Vercel:

1. Перейдіть в ваш проект на Vercel
2. **Settings** → **Environment Variables**
3. Додайте всі змінні з `.env` файлу
4. **Важливо:** Додайте для **Production**, **Preview** та **Development**

### 2. Передеплойте проект:

- Або зробіть новий commit
- Або **Deployments** → **Redeploy**

## ✅ Фінальна перевірка

Після деплою перевірте:

1. ✅ Сайт відкривається
2. ✅ Авторизація працює (кнопка Sign In)
3. ✅ Після логіну можна створити кампанію
4. ✅ База даних працює (створення кампанії зберігається)

## 🐛 Troubleshooting

### Помилка "Prisma Client not generated"
```bash
npx prisma generate
```

### Помилка "Database connection failed"
- Перевірте чи `DATABASE_URL` правильний
- Перевірте чи пароль правильний (без спецсимволів які потребують URL encoding)
- Перевірте чи проект Supabase активний

### Помилка "Migration failed"
```bash
# Перевірте статус
npx prisma migrate status

# Якщо потрібно, скиньте міграції
npx prisma migrate reset

# Або застосуйте вручну
npx prisma migrate deploy
```

### Помилка авторизації Clerk
- Перевірте чи redirect URLs правильно налаштовані
- Перевірте чи ключі правильні
- Перевірте логи в Vercel Dashboard
