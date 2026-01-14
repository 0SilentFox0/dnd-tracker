# 🚀 Швидкий старт - Supabase Auth

## Що вже зроблено:

✅ Встановлено Supabase Auth  
✅ Замінено Clerk на Supabase Auth  
✅ Створено helper функції для авторизації  
✅ Налаштовано middleware для захисту маршрутів  

## Що потрібно зробити:

### 1. Додати DATABASE_URL в .env

Відкрийте Supabase Dashboard → **Settings** → **Database** → **Connection string** → **URI**

Скопіюйте та додайте в `.env`:
```env
DATABASE_URL="postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres"
```

### 2. Перевірити чи є Supabase змінні

В `.env` має бути:
```env
NEXT_PUBLIC_SUPABASE_URL="https://[PROJECT-REF].supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

### 3. Налаштувати Google OAuth в Supabase

1. Supabase Dashboard → **Authentication** → **Providers** → **Google**
2. Увімкніть та додайте Client ID та Client Secret з Google Cloud Console
3. Додайте Redirect URL: `https://[PROJECT-REF].supabase.co/auth/v1/callback`

### 4. Застосувати міграції

```bash
npx prisma generate
npx prisma migrate deploy
```

### 5. Додати змінні на Vercel

Vercel Dashboard → **Settings** → **Environment Variables**:
- `DATABASE_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### 6. Передеплойте

Зробіть commit та push, або Redeploy на Vercel.

## 📚 Детальні інструкції

Дивіться `SUPABASE_AUTH_SETUP.md` для повної інструкції.
