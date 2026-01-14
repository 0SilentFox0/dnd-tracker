# Налаштування Supabase Auth та DATABASE_URL

## 📍 Де взяти DATABASE_URL з Supabase

### Крок 1: Відкрийте Supabase Dashboard

1. Перейдіть на [supabase.com/dashboard](https://supabase.com/dashboard)
2. Виберіть ваш проект **supabase-indigo-window**

### Крок 2: Отримайте Connection String

1. Перейдіть в **Settings** → **Database**
2. Прокрутіть до секції **Connection string**
3. Оберіть **URI** формат (не Transaction mode)
4. Скопіюйте Connection String

**Формат буде виглядати так:**
```
postgresql://postgres.[PROJECT-REF]:[YOUR-PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres
```

**Або для прямого підключення:**
```
postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
```

### Крок 3: Додайте в .env файл

```env
# Supabase Database
DATABASE_URL="postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres"

# Supabase Auth (вже є в .env)
NEXT_PUBLIC_SUPABASE_URL="https://[PROJECT-REF].supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

## 🔐 Налаштування Google OAuth в Supabase

### Крок 1: Налаштуйте Google OAuth

1. Перейдіть в [Google Cloud Console](https://console.cloud.google.com/)
2. Створіть новий проект або виберіть існуючий
3. Перейдіть в **APIs & Services** → **Credentials**
4. Натисніть **Create Credentials** → **OAuth client ID**
5. Оберіть **Web application**
6. Додайте **Authorized redirect URIs**:
   ```
   https://[PROJECT-REF].supabase.co/auth/v1/callback
   ```
7. Скопіюйте **Client ID** та **Client Secret**

### Крок 2: Додайте в Supabase

1. В Supabase Dashboard перейдіть в **Authentication** → **Providers**
2. Знайдіть **Google** та натисніть **Enable**
3. Вставте **Client ID** та **Client Secret**
4. Натисніть **Save**

### Крок 3: Додайте Redirect URL для вашого домену

1. В Supabase Dashboard → **Authentication** → **URL Configuration**
2. Додайте в **Redirect URLs**:
   - `http://localhost:3000/auth/callback` (для development)
   - `https://your-project.vercel.app/auth/callback` (для production)

## 📝 Повний .env файл

```env
# Supabase Database
DATABASE_URL="postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres"

# Supabase Auth
NEXT_PUBLIC_SUPABASE_URL="https://[PROJECT-REF].supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# Pusher (опціонально)
PUSHER_APP_ID=xxxxx
PUSHER_SECRET=xxxxx
NEXT_PUBLIC_PUSHER_KEY=xxxxx
NEXT_PUBLIC_PUSHER_CLUSTER=mt1
```

## 🚀 Налаштування на Vercel

### Автоматично через Vercel Dashboard:

1. Перейдіть в ваш проект на Vercel
2. **Settings** → **Environment Variables**
3. Додайте всі змінні з `.env` файлу:
   - `DATABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `PUSHER_*` (якщо використовуєте)

### Або через Vercel CLI:

```bash
# Встановіть Vercel CLI
npm i -g vercel

# Увійдіть
vercel login

# Підключіть проект
vercel link

# Додайте змінні
vercel env add DATABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
```

## ✅ Перевірка

Після налаштування:

1. **Локально:**
   ```bash
   npm run dev
   # Відкрийте http://localhost:3000
   # Спробуйте увійти через Google
   ```

2. **На Vercel:**
   - Передеплойте проект
   - Перевірте чи авторизація працює

## 🔍 Де знайти PROJECT-REF

PROJECT-REF - це унікальний ідентифікатор вашого проекту Supabase.

Його можна знайти:
- В URL: `https://supabase.com/dashboard/project/[PROJECT-REF]`
- В Settings → General → Reference ID
- В Connection String

## ⚠️ Важливо

1. **Ніколи не комітьте** `.env` файл в Git
2. Використовуйте **Connection Pooling** URI для production (порт 6543)
3. Переконайтеся що **Redirect URLs** правильно налаштовані в Supabase
4. Після зміни змінних на Vercel - **передеплойте** проект
